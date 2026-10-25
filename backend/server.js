/**
 * server.js — Express entry point for Code Review Coach backend.
 *
 * Registers:
 *   - CORS (configurable origins)
 *   - JSON body parser
 *   - In-memory rate limiter (10 req/min per IP)
 *   - API routes (/api/review, /api/release-notes, /api/history)
 *   - Global error handler returning consistent JSON shape
 */

const path = require('path');

// Always load the backend environment file relative to this file so the
// server works when started from either the project root or backend folder.
require('dotenv').config({ path: path.join(__dirname, '.env') });

const express    = require('express');
const cors       = require('cors');
const rateLimit  = require('express-rate-limit');

const reviewRouter       = require('./routes/review');
const releaseNotesRouter = require('./routes/release-notes');
const historyRouter      = require('./routes/history');

const app  = express();
const PORT = process.env.PORT || 3001;
// Hosted platforms route traffic to the container's network interface.
const HOST = process.env.HOST || '0.0.0.0';

// ── CORS ─────────────────────────────────────────────────────────────────────
const allowedOrigins = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map(o => o.trim())
  .filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (curl, Postman, same-origin)
    if (!origin || allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    callback(new Error(`CORS: origin ${origin} not allowed`));
  },
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// ── Body parser ───────────────────────────────────────────────────────────────
app.use(express.json({ limit: '200kb' }));

// ── Rate limiter — 10 requests per minute per IP ─────────────────────────────
const limiter = rateLimit({
  windowMs: 60 * 1000,   // 1 minute
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests — please wait a moment and try again.' },
});
app.use('/api/', limiter);

// ── Health check ──────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => res.json({ status: 'ok' }));

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/api/review',         reviewRouter);
app.use('/api/release-notes',  releaseNotesRouter);
app.use('/api/history',        historyRouter);

// Serve the frontend from the same service in production so the deployed
// browser app can call the API on its own origin.
const frontendDir = path.join(__dirname, '..', 'frontend');
app.use(express.static(frontendDir));
app.get('*', (_req, res) => res.sendFile(path.join(frontendDir, 'index.html')));

// ── 404 handler ───────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// ── Global error handler ─────────────────────────────────────────────────────
// Returns a consistent { error: string } shape for all unhandled errors.
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error('[error]', err.message || err);
  const status = err.status || err.statusCode || 500;
  res.status(status).json({ error: err.message || 'Internal server error' });
});

// ── Start ─────────────────────────────────────────────────────────────────────
app.listen(PORT, HOST, () => {
  console.log(`[server] Code Review Coach backend running on http://${HOST}:${PORT}`);
});
