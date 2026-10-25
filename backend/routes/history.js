/**
 * routes/history.js
 *
 * GET /api/history
 *   Returns a combined, date-sorted list of past reviews and release notes.
 *   Each item includes: id, type ("review"|"release-notes"), created_at, preview.
 *
 * GET /api/history/:type/:id
 *   Returns the full stored record for type = "review" or "release-notes".
 */

const express = require('express');
const db      = require('../db');

const router = express.Router();

// ── GET /api/history ──────────────────────────────────────────────────────────

router.get('/', (req, res, next) => {
  try {
    // Pull lightweight preview data from both tables
    const reviews = db.prepare(`
      SELECT
        id,
        'review'          AS type,
        language,
        risk_level,
        SUBSTR(summary, 1, 120) AS preview,
        created_at
      FROM reviews
      ORDER BY created_at DESC
      LIMIT 100
    `).all();

    const notes = db.prepare(`
      SELECT
        id,
        'release-notes'   AS type,
        SUBSTR(notes_json, 1, 120) AS preview,
        created_at
      FROM release_notes
      ORDER BY created_at DESC
      LIMIT 100
    `).all();

    // Parse the preview for release_notes into a human-readable string
    const notesFormatted = notes.map(n => {
      let preview = n.preview;
      try {
        // notes_json starts with {"summary":"..."} — extract just the summary
        const obj = JSON.parse(n.preview + (n.preview.endsWith('}') ? '' : '..."}'));
        if (obj.summary) preview = obj.summary.substring(0, 120);
      } catch (_) { /* use raw substr */ }
      return { ...n, preview };
    });

    // Merge and sort newest-first
    const combined = [...reviews, ...notesFormatted].sort(
      (a, b) => new Date(b.created_at) - new Date(a.created_at)
    );

    res.json({ history: combined });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/history/:type/:id ────────────────────────────────────────────────

router.get('/:type/:id', (req, res, next) => {
  try {
    const { type, id } = req.params;
    const numId = parseInt(id, 10);

    if (isNaN(numId)) {
      return res.status(400).json({ error: 'id must be a number.' });
    }

    if (type === 'review') {
      const row = db.prepare('SELECT * FROM reviews WHERE id = ?').get(numId);
      if (!row) return res.status(404).json({ error: 'Review not found.' });

      res.json({
        id:          row.id,
        type:        'review',
        language:    row.language,
        riskLevel:   row.risk_level,
        summary:     row.summary,
        issues:      JSON.parse(row.issues_json || '[]'),
        codeSnippet: row.code_snippet,
        createdAt:   row.created_at,
      });

    } else if (type === 'release-notes') {
      const row = db.prepare('SELECT * FROM release_notes WHERE id = ?').get(numId);
      if (!row) return res.status(404).json({ error: 'Release notes not found.' });

      const notes = JSON.parse(row.notes_json || '{}');
      res.json({
        id:        row.id,
        type:      'release-notes',
        diffText:  row.diff_text,
        summary:   notes.summary  || '',
        added:     notes.added    || [],
        fixed:     notes.fixed    || [],
        changed:   notes.changed  || [],
        version:   notes.version  || '',
        audience:  notes.audience || '',
        createdAt: row.created_at,
      });

    } else {
      res.status(400).json({ error: 'type must be "review" or "release-notes".' });
    }
  } catch (err) {
    next(err);
  }
});

module.exports = router;
