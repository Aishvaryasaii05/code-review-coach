/**
 * routes/release-notes.js
 *
 * POST /api/release-notes
 * ────────────────────────
 * Accepts { diffText }, sends it to the IBM Bob IDE agent, which summarizes
 * the diff into structured release notes (Added / Fixed / Changed + summary).
 * Result is persisted in SQLite and returned.
 */

const express = require('express');
const db = require('../db');
const runBob = require('../bob');

const router = express.Router();

function parseBobJsonResponse(raw) {
  const fenceMatch = raw.match(/```json\s*([\s\S]*?)```/i);
  if (fenceMatch) {
    try { return JSON.parse(fenceMatch[1].trim()); } catch (_) { /* fall through */ }
  }
  const objMatch = raw.match(/(\{[\s\S]*\})/);
  if (objMatch) {
    try { return JSON.parse(objMatch[1].trim()); } catch (_) { /* fall through */ }
  }
  throw new Error('No parseable JSON in Bob response.');
}

// ── Prompt builder ────────────────────────────────────────────────────────────

function buildReleaseNotesPrompt(diffText, audience) {
  const audienceGuidanceMap = {
    'developers': 'Write for software developers: preserve useful technical details and use concise, familiar engineering terminology.',
    'customers': 'Write for product customers: use clear, non-technical language, focus on user-visible benefits, and omit internal implementation details.',
    'stakeholders': 'Write for business stakeholders: focus on business impact, feature value, and strategic outcomes. Avoid deep technical jargon but include enough detail to understand scope.',
    'product-managers': 'Write for product managers: focus on feature capabilities, user experience impact, and alignment with product goals. Include technical context relevant to product decisions.',
    'qa-testing': 'Write for QA/testing teams: focus on test coverage implications, behavior changes, and areas requiring verification. Include technical details relevant to test planning.',
    'support-team': 'Write for customer support teams: focus on user-facing changes, potential issues customers might encounter, and troubleshooting-relevant details.',
    'marketing': 'Write for marketing teams: focus on feature highlights, customer benefits, and key selling points. Use engaging language suitable for external communication.',
    'executives': 'Write for executives: focus on high-level business impact, strategic value, and outcomes. Keep it concise and avoid implementation details.'
  };

  const audienceGuidance = audienceGuidanceMap[audience] || audienceGuidanceMap['developers'];

  return `You are a technical writer generating structured release notes from a code diff, changelog, commit list, or source code file.

Audience guidance: ${audienceGuidance}

The input may be a change summary or a complete source file. If it is source code rather than a diff, describe only features and behavior clearly supported by the code. Do not claim something was added, fixed, or changed unless the input provides evidence of that change. If the input is ambiguous, keep the notes cautious and factual.

Analyze the following diff/changelog and categorize all changes into:
- **Added**: new features, new endpoints, new files
- **Fixed**: bug fixes, security patches, error handling improvements  
- **Changed**: refactors, dependency updates, behavior changes, performance improvements

Return ONLY a JSON object in a \`\`\`json code fence — no prose outside it.

Required shape:
\`\`\`json
{
  "summary": "<2-3 sentence plain-English overview of this release>",
  "added":   ["<bullet point>", ...],
  "fixed":   ["<bullet point>", ...],
  "changed": ["<bullet point>", ...]
}
\`\`\`

Rules:
- Each bullet should be concise (one line) and start with a verb (e.g. "Add user authentication endpoint")
- If a category has no items, return an empty array for it
- Do not include meta-commentary — only the JSON object

Diff / Changelog to summarize:
---
${diffText}
---`;
}

// ── Route handler ─────────────────────────────────────────────────────────────

router.post('/', async (req, res, next) => {
  try {
    const { diffText, version = '', audience = 'developers' } = req.body;

    // ── Validation ──────────────────────────────────────────────────────────
    if (!diffText || typeof diffText !== 'string' || diffText.trim().length === 0) {
      return res.status(400).json({ error: 'diffText is required and must be a non-empty string.' });
    }
    if (diffText.length > 20_000) {
      return res.status(400).json({ error: 'diffText exceeds the 20,000 character limit.' });
    }
    if (typeof version !== 'string' || version.length > 40) {
      return res.status(400).json({ error: 'version must be a string of at most 40 characters.' });
    }
    const validAudiences = ['developers', 'customers', 'stakeholders', 'product-managers', 'qa-testing', 'support-team', 'marketing', 'executives'];
    if (!validAudiences.includes(audience)) {
      return res.status(400).json({ error: `audience must be one of: ${validAudiences.join(', ')}.` });
    }

    // ── Call Bob IDE agent ──────────────────────────────────────────────────
    const prompt = buildReleaseNotesPrompt(diffText, audience);
    let bobRaw;
    try {
      bobRaw = await runBob(prompt);
    } catch (agentErr) {
      console.error('[release-notes] Bob agent error:', agentErr.message);
      return res.status(502).json({
        error: agentErr.message,
      });
    }

    // ── Parse ───────────────────────────────────────────────────────────────
    let parsed;
    try {
      parsed = parseBobJsonResponse(bobRaw);
    } catch (parseErr) {
      console.error('[release-notes] Parse error. Raw:\n', bobRaw);
      return res.status(502).json({
        error: 'Bob agent returned an unexpected format.',
      });
    }

    const { summary = '', added = [], fixed = [], changed = [] } = parsed;

    // ── Persist ─────────────────────────────────────────────────────────────
    const notesJson = JSON.stringify({ summary, added, fixed, changed, version: version.trim(), audience });
    const stmt = db.prepare(`
      INSERT INTO release_notes (diff_text, notes_json)
      VALUES (?, ?)
    `);
    const info = stmt.run(diffText, notesJson);

    // ── Respond ─────────────────────────────────────────────────────────────
    res.status(201).json({
      id: info.lastInsertRowid,
      summary,
      added,
      fixed,
      changed,
      version: version.trim(),
      audience,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
