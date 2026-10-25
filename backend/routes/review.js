/**
 * routes/review.js
 *
 * POST /api/review
 * ─────────────────
 * Accepts { code, language }, sends the code to IBM Bob Shell for analysis,
 * persists the structured result in SQLite, and returns it.
 *
 * Bob Shell is invoked through its documented non-interactive CLI workflow.
 */

const express = require('express');
const db = require('../db');
const runBob = require('../bob');

const router = express.Router();

/**
 * parseBobReviewResponse(raw)
 * Extracts the JSON block from Bob's text response.
 * Bob is instructed to wrap JSON in ```json ... ``` fences; we also try
 * parsing the whole response as JSON as a fallback.
 */
function parseBobReviewResponse(raw) {
  // Try fenced JSON block first
  const fenceMatch = raw.match(/```json\s*([\s\S]*?)```/i);
  if (fenceMatch) {
    try { return JSON.parse(fenceMatch[1].trim()); } catch (_) { /* fall through */ }
  }
  // Try bare JSON object
  const objMatch = raw.match(/(\{[\s\S]*\})/);
  if (objMatch) {
    try { return JSON.parse(objMatch[1].trim()); } catch (_) { /* fall through */ }
  }
  throw new Error('Bob agent response did not contain parseable JSON.');
}

// ── Prompt builder ────────────────────────────────────────────────────────────

function buildReviewPrompt(code, language) {
  return `You are a senior software engineer performing a thorough code review.

Analyze the following ${language} code snippet for:
- Bugs and logic errors
- Security vulnerabilities (injection, XSS, unsafe deserialization, hardcoded secrets, etc.)
- Bad practices and code smells
- Readability and maintainability issues
- Performance problems

Return ONLY a JSON object wrapped in a \`\`\`json code fence — no prose, no explanation outside the JSON.

The JSON must match this exact shape:
\`\`\`json
{
  "riskLevel": "LOW" | "MEDIUM" | "HIGH",
  "summary": "<plain-English summary of overall code quality, 2-3 sentences>",
  "issues": [
    {
      "title": "<short issue title>",
      "severity": "LOW" | "MEDIUM" | "HIGH" | "CRITICAL",
      "explanation": "<clear explanation of why this is a problem>",
      "suggestedFix": "<concrete code snippet or description of the fix>"
    }
  ]
}
\`\`\`

If the code has no significant issues, return an empty issues array and riskLevel "LOW".

Code to review (language: ${language}):
\`\`\`${language.toLowerCase()}
${code}
\`\`\``;
}

// ── Route handler ─────────────────────────────────────────────────────────────

router.post('/', async (req, res, next) => {
  try {
    const { code, language = 'JavaScript' } = req.body;

    // ── Input validation ────────────────────────────────────────────────────
    if (!code || typeof code !== 'string' || code.trim().length === 0) {
      return res.status(400).json({ error: 'code is required and must be a non-empty string.' });
    }
    if (code.length > 20_000) {
      return res.status(400).json({ error: 'code exceeds the 20,000 character limit.' });
    }
    const allowedLanguages = ['JavaScript', 'Python', 'TypeScript', 'Java', 'Other'];
    if (!allowedLanguages.includes(language)) {
      return res.status(400).json({ error: `language must be one of: ${allowedLanguages.join(', ')}` });
    }

    // ── Call Bob IDE agent ──────────────────────────────────────────────────
    const prompt  = buildReviewPrompt(code, language);
    let bobRaw;
    try {
      bobRaw = await runBob(prompt);
    } catch (agentErr) {
      console.error('[review] Bob agent error:', agentErr.message);
      return res.status(502).json({
        error: agentErr.message,
      });
    }

    // ── Parse Bob's response ────────────────────────────────────────────────
    let parsed;
    try {
      parsed = parseBobReviewResponse(bobRaw);
    } catch (parseErr) {
      console.error('[review] Parse error. Raw Bob response:\n', bobRaw);
      return res.status(502).json({
        error: 'Bob agent returned an unexpected format. Raw response logged on server.',
      });
    }

    const { riskLevel, summary, issues = [] } = parsed;

    // ── Validate Bob's output shape ─────────────────────────────────────────
    if (!riskLevel || !summary) {
      return res.status(502).json({ error: 'Bob agent response missing required fields (riskLevel, summary).' });
    }

    // ── Persist to SQLite ───────────────────────────────────────────────────
    const stmt = db.prepare(`
      INSERT INTO reviews (code_snippet, language, risk_level, summary, issues_json)
      VALUES (?, ?, ?, ?, ?)
    `);
    const info = stmt.run(code, language, riskLevel, summary, JSON.stringify(issues));

    // ── Respond ─────────────────────────────────────────────────────────────
    res.status(201).json({
      id:        info.lastInsertRowid,
      riskLevel,
      summary,
      issues,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
