/**
 * db.js — SQLite database setup using better-sqlite3.
 * Auto-creates tables on first run; returns the db instance for use in routes.
 */

const Database = require('better-sqlite3');
const path = require('path');

// Store the SQLite file in the backend directory (persistent disk on Render)
const DB_PATH = path.join(__dirname, 'data', 'coach.db');

// Ensure the data directory exists
const fs = require('fs');
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new Database(DB_PATH);

// Enable WAL mode for better concurrent read performance
db.pragma('journal_mode = WAL');

// ── Schema ──────────────────────────────────────────────────────────────────

db.exec(`
  CREATE TABLE IF NOT EXISTS reviews (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    code_snippet   TEXT    NOT NULL,
    language       TEXT    NOT NULL,
    risk_level     TEXT    NOT NULL,
    summary        TEXT    NOT NULL,
    issues_json    TEXT    NOT NULL,
    created_at     DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS release_notes (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    diff_text   TEXT NOT NULL,
    notes_json  TEXT NOT NULL,
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

console.log(`[db] SQLite ready at ${DB_PATH}`);

module.exports = db;
