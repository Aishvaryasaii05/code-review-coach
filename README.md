# Code Review Coach

> AI-powered code review and release-notes generator.

---

## Overview

Code Review Coach is a full-stack developer tool that:

- **Reviews pasted code** for bugs, security issues, bad practices, and readability — using IBM Bob as the AI engine
- **Generates structured release notes** from a git diff or changelog — also via Bob
- **Stores every review and release note** in a local SQLite database
- **✨ NEW: Theme Toggle** - Switch between dark and light modes
- **✨ NEW: Snippets Library** - Save and reuse your code patterns
- **✨ NEW: Review Templates** - Focus on security, performance, accessibility, etc.
- **✨ NEW: Statistics Dashboard** - Track your review activity and insights
- **✨ NEW: Keyboard Shortcuts** - Work faster with powerful shortcuts (Ctrl+K, Ctrl+Enter, etc.)
- **✨ NEW: Code Formatter** - Auto-format and analyze code complexity
- **✨ NEW: Smart Suggestions** - Real-time code improvement hints
- **✨ NEW: Auto-Save** - Never lose your work
- **✨ NEW: Quick Actions** - Minify, prettify, share code instantly

The app is built with plain HTML/CSS/JS on the frontend, Node.js + Express on the backend, and `better-sqlite3` for persistence.

---

## Project Structure

```
code-review-coach/
├── .gitignore
├── LICENSE
├── README.md
├── frontend/
│   ├── index.html        # Single-page app shell (three tabs)
│   ├── style.css         # Dark VS Code-inspired theme
│   └── script.js         # All frontend logic (no framework)
├── backend/
│   ├── server.js         # Express entry point, CORS, rate limiter
│   ├── bob.js            # IBM Bob Shell integration
│   ├── db.js             # SQLite setup + auto schema creation
│   ├── routes/
│   │   ├── review.js         # POST /api/review
│   │   ├── release-notes.js  # POST /api/release-notes
│   │   └── history.js        # GET  /api/history, GET /api/history/:type/:id
│   ├── package.json      # Backend dependencies and run scripts
│   ├── package-lock.json # Reproducible dependency versions
│   ├── .env.example      # Safe environment template
│   └── data/             # Generated SQLite database; excluded from the ZIP
├── bob_sessions/         # Bob IDE task session screenshots (hackathon deliverable)
│   └── PLACEHOLDER.md
```

---

## Prerequisites

| Tool | Version |
|------|---------|
| Node.js | ≥ 24 (required by IBM Bob Shell 2.x) |
| npm | ≥ 9 |
| IBM Bob Shell | Version 2.x, installed and available as `bob` on PATH |

---

## Setup & Run

### 1. Install backend dependencies

```bash
cd code-review-coach/backend
npm ci
```

### 2. Configure environment

```bash
cp .env.example .env
```

Edit `.env`:

```env
PORT=3001

# Inference-scoped key from https://bob.ibm.com/admin/apikeys
BOB_API_KEY=your_inference_api_key_here

# Optional: required only for General-scoped keys
# BOB_TEAM_ID=your_team_id

# Allowed CORS origins (comma-separated)
ALLOWED_ORIGINS=http://localhost:5500,http://127.0.0.1:5500
```

### 3. Start the backend

```bash
cd code-review-coach/backend
npm start
# or for auto-reload during development:
npm run dev
```

The server starts on `http://localhost:3001`. The SQLite database file is created automatically at `backend/data/coach.db`. Review and release-note requests run `bob run` through Bob Shell, which reads `BOB_API_KEY` from the backend environment. Install Bob Shell and ensure `bob` is on `PATH` before using those features. The backend invokes Bob in Ask mode and expects its JSON output format.

### 4. Serve the frontend

Open `frontend/index.html` directly in a browser, **or** serve it with any static server:

```bash
# Using Node's built-in http server (Node 18+):
npx serve code-review-coach/frontend

# Or with VS Code Live Server extension — just open index.html
```

The frontend's `API_BASE` defaults to `http://localhost:3001`. To override it without editing source, set a value in `localStorage`:

```js
// Run in browser console to point at a deployed backend:
localStorage.setItem('crc_api_base', 'https://your-backend.onrender.com');
```

### Project ZIP

The distributable ZIP contains the application source, dependency lockfile, setup template, documentation, and license. It excludes `backend/.env`, installed `node_modules`, and generated SQLite files under `backend/data/`. After extracting it, follow the setup steps above to install dependencies and configure your own Bob API key.

---

## Usage

### Code Review tab

1. Paste code into the editor (or drag-and-drop a `.js`, `.py`, `.ts`, or `.java` file).
2. Select the language from the dropdown.
3. Click **Review Code** (or press `Ctrl+Enter`).
4. Bob analyzes the code and returns a risk level (LOW / MEDIUM / HIGH), a plain-English summary, and expandable issue cards with severity, explanation, and suggested fixes.

### Release Notes tab

1. Paste a git diff, commit list, changelog, or source code, or upload a text-based diff, changelog, or code file. A diff or changelog gives the clearest summary of what changed.
2. Optionally enter a version and choose Developers or Customers as the audience.
3. Click **Generate Release Notes** (or press `Ctrl+Enter`).
4. Bob categorizes changes into **Added**, **Fixed**, and **Changed** sections with a summary.
5. Choose Markdown or plain text, then copy the notes or download them as a file.

### History tab

- Automatically loads all past reviews and release notes from the database.
- Click any item to see the full stored result.
- Click **← Back to list** to return to the list.
- Click **Refresh** to reload after new entries are added.

---

## API Reference

### `POST /api/review`

**Body:** `{ "code": "...", "language": "JavaScript" }`

**Response:**
```json
{
  "id": 1,
  "riskLevel": "HIGH",
  "summary": "This function has several security vulnerabilities...",
  "issues": [
    {
      "title": "SQL Injection risk",
      "severity": "CRITICAL",
      "explanation": "User input is concatenated directly into a SQL query...",
      "suggestedFix": "Use parameterized queries: db.query('SELECT * FROM users WHERE id = ?', [id])"
    }
  ]
}
```

---

### `POST /api/release-notes`

**Body:** `{ "diffText": "..." }`

**Response:**
```json
{
  "id": 1,
  "summary": "This release adds JWT auth, fixes a login bug...",
  "added":   ["Add JWT refresh token support"],
  "fixed":   ["Fix null pointer exception in login handler"],
  "changed": ["Update express from 4.17 to 4.18"]
}
```

---

### `GET /api/history`

Returns a combined list of reviews and release notes, sorted newest-first.

### `GET /api/history/:type/:id`

Returns the full stored record. `type` is `review` or `release-notes`.

---

## How IBM Bob IDE Was Used

This project was built in discrete Bob IDE agent-mode tasks, each scoped to a specific part of the system:

| Task | Bob Session | Description |
|------|-------------|-------------|
| `task01` | `bob_sessions/task01_frontend_scaffold_summary.png` | Scaffold HTML/CSS/JS structure, tab layout, dark theme |
| `task02` | `bob_sessions/task02_review_endpoint_summary.png` | Build `POST /api/review` with Bob agent prompt engineering |
| `task03` | `bob_sessions/task03_release_notes_endpoint_summary.png` | Build `POST /api/release-notes` with Bob agent integration |
| `task04` | `bob_sessions/task04_sqlite_history_summary.png` | SQLite schema, `db.js`, and history endpoints |
| `task05` | `bob_sessions/task05_styling_pass_summary.png` | Final styling, responsive layout, UX polish |

**Bob is the actual AI engine** — not a mock or placeholder. Every call to `/api/review` and `/api/release-notes` invokes Bob Shell's non-interactive `bob run` command and parses its JSON response. The prompt engineering is in `routes/review.js` (`buildReviewPrompt`) and `routes/release-notes.js` (`buildReleaseNotesPrompt`).

---

## Deployment

### Backend → Render (with Persistent Disk)

1. Push the `backend/` folder to a GitHub repo.
2. Create a new **Web Service** on [Render](https://render.com).
3. Set **Build Command:** `npm install`
4. Set **Start Command:** `node server.js`
5. Add a **Persistent Disk** mounted at `/opt/render/project/src/data` so the SQLite file survives deploys.
6. Add environment variables: `PORT`, `BOB_API_KEY`, `ALLOWED_ORIGINS` (and `BOB_TEAM_ID` if using a General key).

### Frontend → Netlify

1. Drag-and-drop the `frontend/` folder into the [Netlify](https://netlify.com) dashboard, **or** connect the repo and set the publish directory to `frontend/`.
2. Point the frontend API base at your Render backend URL using `localStorage.setItem('crc_api_base', 'https://your-backend.onrender.com')` in the browser console.

---

## External Data Sources

No client data, company-confidential data, personal data, or scraped social-media data is used in this project.

Sample code snippets used during development and testing come from:

| Source | License | Use |
|--------|---------|-----|
| [MDN Web Docs JavaScript examples](https://developer.mozilla.org/en-US/docs/Web/JavaScript) | CC BY-SA 2.5 | Testing review endpoint with known-good JS |
| [The Python Tutorial (docs.python.org)](https://docs.python.org/3/tutorial/) | PSF License (permissive) | Testing review endpoint with Python snippets |
| Public git diff output generated locally from this project's own commits | N/A (own work) | Testing release-notes endpoint |

---

## Rate Limiting

The backend enforces **10 requests per minute per IP** across all `/api/` routes using `express-rate-limit`. Exceeding the limit returns:

```json
{ "error": "Too many requests — please wait a moment and try again." }
```

---

## License

MIT. See [LICENSE](LICENSE).
