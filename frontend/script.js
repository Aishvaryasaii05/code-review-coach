/**
 * script.js — Code Review Coach frontend logic
 *
 * Covers:
 *  - Tab switching
 *  - Code Review tab: textarea, file drag-drop/upload, submit, render results
 *  - Release Notes tab: textarea, submit, render output, copy button
 *  - History tab: load list, expand full detail
 *  - Toast notifications
 *  - Loading / error / empty states
 */

/* ── Config ──────────────────────────────────────────────────────────────── */
// Point this at your running backend.  Override in production.
const API_BASE = (() => {
  const saved = localStorage.getItem('crc_api_base');
  if (saved) return saved;
  // Render serves the frontend and API from one origin. Keep the localhost
  // fallback for opening index.html directly during local development.
  return window.location.protocol === 'http:' || window.location.protocol === 'https:'
    ? window.location.origin
    : 'http://localhost:3001';
})();

/* ── Utility ─────────────────────────────────────────────────────────────── */

/** Show a brief toast message */
function showToast(msg, durationMs = 2400) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), durationMs);
}

/** Show/hide state panels within a container */
function setState(prefix, state) {
  // state: 'empty' | 'loading' | 'error' | 'results' | 'output' | 'list' | 'detail'
  const ids = {
    review:  ['review-empty', 'review-loading', 'review-error', 'review-results'],
    notes:   ['notes-empty',  'notes-loading',  'notes-error',  'notes-output'],
    history: ['history-empty','history-loading','history-error','history-list', 'history-detail'],
  };
  const map = {
    review:  { empty: 'review-empty', loading: 'review-loading', error: 'review-error', results: 'review-results' },
    notes:   { empty: 'notes-empty',  loading: 'notes-loading',  error: 'notes-error',  output:  'notes-output' },
    history: { empty: 'history-empty',loading: 'history-loading',error: 'history-error',list:    'history-list', detail: 'history-detail' },
  };
  const group = ids[prefix];
  const target = map[prefix][state];
  group.forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.toggle('hidden', id !== target);
  });
}

/** Format an ISO datetime string to a locale-friendly relative date */
function formatDate(isoStr) {
  const d = new Date(isoStr);
  if (isNaN(d)) return isoStr;
  const now  = Date.now();
  const diff = now - d.getTime();
  if (diff < 60_000)   return 'Just now';
  if (diff < 3_600_000) return `${Math.floor(diff/60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff/3_600_000)}h ago`;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

/* ── Tab switching ───────────────────────────────────────────────────────── */
let activeTab = 'home';
let previousTab = 'home';
const sectionBackButton = document.getElementById('section-back-button');

document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const tab = btn.dataset.tab;
    if (tab !== activeTab) previousTab = activeTab;
    activeTab = tab;
    if (sectionBackButton) sectionBackButton.classList.toggle('hidden', activeTab === 'home');

    // Update buttons
    document.querySelectorAll('.tab-btn').forEach(b => {
      b.classList.toggle('active', b === btn);
      b.setAttribute('aria-selected', b === btn ? 'true' : 'false');
    });

    // Update panels
    document.querySelectorAll('.tab-panel').forEach(panel => {
      panel.classList.toggle('hidden', panel.id !== `tab-${tab}`);
      panel.classList.toggle('active', panel.id === `tab-${tab}`);
    });

    // Auto-load history when switching to it
    if (tab === 'history') loadHistory();
    
    // Auto-load dashboard when switching to it
    if (tab === 'dashboard') {
      const dashboardStats = document.getElementById('dashboard-stats');
      if (dashboardStats && window.statsDashboard) {
        dashboardStats.innerHTML = window.statsDashboard.render();
        window.statsDashboard.refresh();
      }
    }
  });
});

sectionBackButton?.addEventListener('click', () => {
  document.querySelector(`[data-tab="${previousTab}"]`)?.click();
});

document.querySelectorAll('[data-flip-card]').forEach(button => {
  button.addEventListener('click', () => {
    const card = button.closest('.workflow-card');
    const flipped = card.classList.toggle('is-flipped');
    const front = card.querySelector('.workflow-front');
    const back = card.querySelector('.workflow-back');

    front.setAttribute('aria-hidden', String(flipped));
    back.setAttribute('aria-hidden', String(!flipped));
    front.inert = flipped;
    back.inert = !flipped;
    card.querySelectorAll('[data-flip-card]').forEach(control => {
      control.setAttribute('aria-expanded', String(flipped));
    });

    card.querySelector(flipped ? '.flip-back' : '.flip-control').focus();
  });
});

document.querySelectorAll('[data-open-tab]').forEach(button => {
  button.addEventListener('click', () => {
    document.querySelector(`[data-tab="${button.dataset.openTab}"]`).click();
  });
});

const tabOrder = ['home', 'review', 'release-notes', 'history', 'dashboard'];
function navigateSection(direction) {
  const index = tabOrder.indexOf(activeTab);
  const nextIndex = (index + direction + tabOrder.length) % tabOrder.length;
  document.querySelector(`[data-tab="${tabOrder[nextIndex]}"]`)?.click();
}

document.getElementById('footer-prev')?.addEventListener('click', () => navigateSection(-1));
document.getElementById('footer-next')?.addEventListener('click', () => navigateSection(1));
document.getElementById('top-prev')?.addEventListener('click', () => navigateSection(-1));
document.getElementById('top-next')?.addEventListener('click', () => navigateSection(1));

document.querySelectorAll('.faq-item').forEach(item => {
  item.querySelector('summary')?.addEventListener('click', () => {
    document.querySelectorAll('.faq-item[open]').forEach(openItem => {
      if (openItem !== item) openItem.removeAttribute('open');
    });
    item.classList.add('is-opening');
    window.setTimeout(() => item.classList.remove('is-opening'), 380);
  });
});

const mobileSectionsToggle = document.getElementById('mobile-sections-toggle');
const mobileSectionsMenu = document.getElementById('mobile-sections-menu');
const mobileSectionsWrap = document.querySelector('.mobile-sections-wrap');
if (mobileSectionsToggle && mobileSectionsMenu) {
  mobileSectionsToggle.addEventListener('click', () => {
    const open = !mobileSectionsMenu.classList.contains('hidden');
    mobileSectionsMenu.classList.toggle('hidden', open);
    mobileSectionsWrap?.classList.toggle('menu-open', !open);
    mobileSectionsToggle.setAttribute('aria-expanded', String(!open));
  });

  mobileSectionsMenu.querySelectorAll('[data-mobile-tab]').forEach(button => {
    button.addEventListener('click', () => {
      document.querySelector(`[data-tab="${button.dataset.mobileTab}"]`).click();
      mobileSectionsMenu.classList.add('hidden');
      mobileSectionsWrap?.classList.remove('menu-open');
      mobileSectionsToggle.setAttribute('aria-expanded', 'false');
    });
  });
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  CODE REVIEW TAB                                                            */
/* ═══════════════════════════════════════════════════════════════════════════ */

const codeInput     = document.getElementById('code-input');
const langSelect    = document.getElementById('language-select');
const reviewBtn     = document.getElementById('review-btn');
const reviewBtnText = document.getElementById('review-btn-text');
const clearReviewBtn= document.getElementById('clear-review-btn');
const dropZone      = document.getElementById('drop-zone');
const fileInput     = document.getElementById('file-input');
const filePickBtn   = document.getElementById('file-pick-btn');
const retryReviewBtn= document.getElementById('retry-review-btn');
const reviewFileName= document.getElementById('review-file-name');
const loadSampleBtn = document.getElementById('load-sample-btn');

const REVIEW_SAMPLE = `function calculateTotal(items) {
  return items.reduce((total, item) => total + item.price, 0);
}`;

// ── File upload / drag-drop ────────────────────────────────────────────────

const LANG_EXT_MAP = { js: 'JavaScript', ts: 'TypeScript', py: 'Python', java: 'Java' };

function loadFileIntoTextarea(file) {
  if (!file) return;
  const ext = file.name.split('.').pop().toLowerCase();
  const lang = LANG_EXT_MAP[ext];
  if (lang) langSelect.value = lang;
  reviewFileName.value = file.name;

  const reader = new FileReader();
  reader.onload = e => { codeInput.value = e.target.result; };
  reader.readAsText(file);
}

filePickBtn.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', () => loadFileIntoTextarea(fileInput.files[0]));

// Make the complete upload surface clickable, including the upload icon.
dropZone.addEventListener('click', event => {
  if (event.target.closest('button, input, a')) return;
  fileInput.click();
});
dropZone.addEventListener('keydown', event => {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    fileInput.click();
  }
});

loadSampleBtn.addEventListener('click', () => {
  codeInput.value = REVIEW_SAMPLE;
  reviewFileName.value = 'sample-review.js';
  langSelect.value = 'JavaScript';
  codeInput.focus();
  showToast('Sample code loaded. Ready to review.');
});

dropZone.addEventListener('dragover', e => {
  e.preventDefault();
  dropZone.classList.add('dragover');
});
dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
dropZone.addEventListener('drop', e => {
  e.preventDefault();
  dropZone.classList.remove('dragover');
  const file = e.dataTransfer.files[0];
  loadFileIntoTextarea(file);
});

clearReviewBtn.addEventListener('click', () => {
  codeInput.value = '';
  reviewFileName.value = '';
  setState('review', 'empty');
  fileInput.value = '';
});

// ── Submit review ──────────────────────────────────────────────────────────

async function submitReview() {
  const code     = codeInput.value.trim();
  const language = langSelect.value;

  if (!code) {
    showToast('Please paste some code first.');
    codeInput.focus();
    return;
  }

  setState('review', 'loading');
  reviewBtn.disabled = true;
  reviewBtnText.textContent = 'Analyzing your code…';

  try {
    const res = await fetch(`${API_BASE}/api/review`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ code, language }),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || `Server error (${res.status})`);
    }

    renderReviewResults(data);

  } catch (err) {
    document.getElementById('review-error-msg').textContent = err.message;
    setState('review', 'error');
  } finally {
    reviewBtn.disabled = false;
    reviewBtnText.textContent = 'Review Code';
  }
}

reviewBtn.addEventListener('click', submitReview);
retryReviewBtn.addEventListener('click', submitReview);

// Allow Ctrl+Enter to submit from the textarea
codeInput.addEventListener('keydown', e => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') submitReview();
});

// ── Render review results ──────────────────────────────────────────────────

function renderReviewResults({ riskLevel, summary, issues }) {
  // Risk badge
  const badge = document.getElementById('risk-badge');
  badge.textContent = riskLevel || 'UNKNOWN';
  badge.className   = `risk-badge ${(riskLevel || '').toUpperCase()}`;

  // Summary
  document.getElementById('review-summary').textContent = summary;

  // Issues
  const list = document.getElementById('issues-list');
  list.innerHTML = '';

  if (!issues || issues.length === 0) {
    list.innerHTML = `
      <div class="no-issues">
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.8"/>
          <path d="M9 12l2 2 4-4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        No issues found — this code looks good!
      </div>`;
  } else {
    issues.forEach((issue, idx) => {
      const sev  = (issue.severity || 'LOW').toUpperCase();
      const card = document.createElement('div');
      card.className = `issue-card severity-${sev}`;
      card.innerHTML = `
        <div class="issue-header" role="button" tabindex="0" aria-expanded="false"
             aria-controls="issue-body-${idx}">
          <span class="issue-severity-dot" aria-hidden="true"></span>
          <span class="issue-title">${escHtml(issue.title || 'Issue')}</span>
          <span class="issue-severity-label">${sev}</span>
          <svg class="issue-chevron" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M6 4l4 4-4 4" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </div>
        <div class="issue-body" id="issue-body-${idx}">
          <p class="issue-explanation">${escHtml(issue.explanation || '')}</p>
          ${issue.suggestedFix ? `
            <div class="issue-fix-label">Suggested fix</div>
            <pre class="issue-fix-code">${escHtml(issue.suggestedFix)}</pre>
          ` : ''}
        </div>`;

      // Toggle expand/collapse
      const header = card.querySelector('.issue-header');
      const toggle = () => {
        const open = card.classList.toggle('open');
        header.setAttribute('aria-expanded', String(open));
      };
      header.addEventListener('click', toggle);
      header.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); }
      });

      list.appendChild(card);
    });
  }

  setState('review', 'results');
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  RELEASE NOTES TAB                                                          */
/* ═══════════════════════════════════════════════════════════════════════════ */

const diffInput     = document.getElementById('diff-input');
const notesBtn      = document.getElementById('notes-btn');
const notesBtnText  = document.getElementById('notes-btn-text');
const clearNotesBtn = document.getElementById('clear-notes-btn');
const retryNotesBtn = document.getElementById('retry-notes-btn');
const copyNotesBtn  = document.getElementById('copy-notes-btn');
const downloadNotesBtn = document.getElementById('download-notes-btn');
const releaseVersionInput = document.getElementById('release-version');
const releaseAudienceSelect = document.getElementById('release-audience');
const notesFormatSelect = document.getElementById('notes-format');
const notesDropZone = document.getElementById('notes-drop-zone');
const notesFileInput = document.getElementById('notes-file-input');
const notesFilePickBtn = document.getElementById('notes-file-pick-btn');
const notesFileName = document.getElementById('notes-file-name');

const notesFileExtensions = new Set([
  'diff', 'patch', 'txt', 'md', 'markdown', 'log', 'js', 'jsx', 'ts', 'tsx',
  'py', 'java', 'html', 'css', 'json', 'sql', 'sh', 'yaml', 'yml', 'xml',
]);

async function loadNotesFile(file) {
  if (!file) return;
  const extension = file.name.split('.').pop().toLowerCase();
  if (!notesFileExtensions.has(extension)) {
    showToast('Choose a text-based diff, changelog, or source code file.');
    notesFileInput.value = '';
    return;
  }

  try {
    const text = await file.text();
    if (text.length > 20_000) {
      showToast('The selected file exceeds the 20,000 character limit.');
      notesFileInput.value = '';
      return;
    }
    diffInput.value = text;
    notesFileName.textContent = file.name;
    notesFileName.classList.remove('hidden');
    diffInput.focus();
  } catch (_) {
    showToast('Could not read that file. Try pasting its text instead.');
  }
}

notesFilePickBtn.addEventListener('click', () => notesFileInput.click());
notesFileInput.addEventListener('change', () => loadNotesFile(notesFileInput.files[0]));
notesDropZone.addEventListener('dragover', event => {
  event.preventDefault();
  notesDropZone.classList.add('dragover');
});
notesDropZone.addEventListener('dragleave', () => notesDropZone.classList.remove('dragover'));
notesDropZone.addEventListener('drop', event => {
  event.preventDefault();
  notesDropZone.classList.remove('dragover');
  loadNotesFile(event.dataTransfer.files[0]);
});

clearNotesBtn.addEventListener('click', () => {
  diffInput.value = '';
  notesFileInput.value = '';
  notesFileName.textContent = '';
  notesFileName.classList.add('hidden');
  releaseVersionInput.value = '';
  releaseAudienceSelect.value = 'developers';
  setState('notes', 'empty');
});

async function submitReleaseNotes() {
  const diffText = diffInput.value.trim();
  const version = releaseVersionInput.value.trim();
  const audience = releaseAudienceSelect.value;

  if (!diffText) {
    showToast('Please paste a diff or changelog first.');
    diffInput.focus();
    return;
  }

  setState('notes', 'loading');
  notesBtn.disabled   = true;
  notesBtnText.textContent = 'Generating…';

  try {
    const res  = await fetch(`${API_BASE}/api/release-notes`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ diffText, version, audience }),
    });
    const data = await res.json();

    if (!res.ok) throw new Error(data.error || `Server error (${res.status})`);

    renderReleaseNotes(data);

  } catch (err) {
    document.getElementById('notes-error-msg').textContent = err.message;
    setState('notes', 'error');
  } finally {
    notesBtn.disabled   = false;
    notesBtnText.textContent = 'Generate Release Notes';
  }
}

notesBtn.addEventListener('click', submitReleaseNotes);
retryNotesBtn.addEventListener('click', submitReleaseNotes);
diffInput.addEventListener('keydown', e => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') submitReleaseNotes();
});

// ── Render release notes ───────────────────────────────────────────────────

function renderReleaseNotes({ summary, added = [], fixed = [], changed = [], version = '', audience = 'developers' }) {
  document.getElementById('notes-summary').textContent = summary;
  const meta = document.getElementById('notes-meta');
  const audienceLabel = audience === 'customers' ? 'Customer-facing' : 'For developers';
  const metaParts = [version && `Version ${version}`, audienceLabel].filter(Boolean);
  meta.textContent = metaParts.join(' · ');
  meta.classList.toggle('hidden', metaParts.length === 0);

  const sections = document.getElementById('notes-sections');
  sections.innerHTML = '';

  const defs = [
    { key: 'added',   label: 'Added',   cls: 'added',   items: added   },
    { key: 'fixed',   label: 'Fixed',   cls: 'fixed',   items: fixed   },
    { key: 'changed', label: 'Changed', cls: 'changed', items: changed },
  ];

  defs.forEach(({ label, cls, items }) => {
    if (!items || items.length === 0) return;
    const sec = document.createElement('div');
    sec.className = 'notes-section';
    sec.innerHTML = `
      <div class="notes-section-title ${cls}">
        <svg viewBox="0 0 12 12" fill="currentColor" aria-hidden="true">
          <circle cx="6" cy="6" r="4"/>
        </svg>
        ${label}
      </div>
      <ul class="notes-list">
        ${items.map(item => `<li>${escHtml(item)}</li>`).join('')}
      </ul>`;
    sections.appendChild(sec);
  });

  setState('notes', 'output');
}

// ── Copy release notes ─────────────────────────────────────────────────────

function buildReleaseNotesText(format = notesFormatSelect.value) {
  const version = releaseVersionInput.value.trim();
  const audienceLabel = releaseAudienceSelect.value === 'customers' ? 'Audience: Customers' : 'Audience: Developers';
  const summary = document.getElementById('notes-summary').textContent;
  const listEls = document.querySelectorAll('.notes-section');
  const markdown = format === 'markdown';
  const title = `Release Notes${version ? ` ${version}` : ''}`;
  const lines = [markdown ? `# ${title}` : title];
  lines.push('', audienceLabel);
  lines.push('', summary);

  listEls.forEach(sec => {
    const title = sec.querySelector('.notes-section-title')?.textContent.trim();
    const items = [...sec.querySelectorAll('.notes-list li')].map(li => `- ${li.textContent.trim()}`);
    if (items.length) lines.push('', markdown ? `## ${title}` : title.toUpperCase(), ...items);
  });

  return lines.join('\n').trim();
}

copyNotesBtn.addEventListener('click', () => {
  navigator.clipboard.writeText(buildReleaseNotesText()).then(() => {
    showToast('Release notes copied to clipboard.');
  }).catch(() => {
    showToast('Could not copy — try selecting the text manually.');
  });
});

downloadNotesBtn.addEventListener('click', () => {
  const format = notesFormatSelect.value;
  const extension = format === 'markdown' ? 'md' : 'txt';
  const safeVersion = releaseVersionInput.value.trim().replace(/[^a-zA-Z0-9._-]+/g, '-');
  const filename = `release-notes${safeVersion ? `-${safeVersion}` : ''}.${extension}`;
  const blob = new Blob([buildReleaseNotesText(format)], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.hidden = true;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
});

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  HISTORY TAB                                                                */
/* ═══════════════════════════════════════════════════════════════════════════ */

document.getElementById('refresh-history-btn').addEventListener('click', loadHistory);
document.getElementById('history-back-btn').addEventListener('click', () => {
  setState('history', 'list');
});

async function loadHistory() {
  setState('history', 'loading');

  try {
    const res  = await fetch(`${API_BASE}/api/history`);
    const data = await res.json();

    if (!res.ok) throw new Error(data.error || `Server error (${res.status})`);

    const { history } = data;
    if (!history || history.length === 0) {
      setState('history', 'empty');
      return;
    }

    renderHistoryList(history);
    setState('history', 'list');

  } catch (err) {
    document.getElementById('history-error-msg').textContent = err.message;
    setState('history', 'error');
  }
}

function renderHistoryList(items) {
  const list = document.getElementById('history-list');
  list.innerHTML = '';

  items.forEach(item => {
    const li = document.createElement('li');
    li.innerHTML = `
      <div class="history-item" role="button" tabindex="0"
           data-type="${escAttr(item.type)}" data-id="${escAttr(String(item.id))}">
        <span class="history-type-badge ${item.type}">${item.type === 'review' ? 'Review' : 'Release Notes'}</span>
        ${item.risk_level
          ? `<span class="risk-badge ${(item.risk_level || '').toUpperCase()}" style="font-size:.65rem">${item.risk_level}</span>`
          : ''}
        <span class="history-preview">${escHtml(item.preview || '—')}</span>
        <div class="history-meta">
          <span class="history-date">${formatDate(item.created_at)}</span>
          <svg class="history-chevron" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M6 4l4 4-4 4" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </div>
      </div>`;

    const itemEl = li.querySelector('.history-item');
    const open   = () => loadHistoryDetail(item.type, item.id);
    itemEl.addEventListener('click', open);
    itemEl.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); }
    });

    list.appendChild(li);
  });
}

async function loadHistoryDetail(type, id) {
  const detailContent = document.getElementById('history-detail-content');
  detailContent.innerHTML = '<div class="loading-state" style="min-height:180px"><div class="spinner"></div><p>Loading…</p></div>';
  setState('history', 'detail');

  try {
    const res  = await fetch(`${API_BASE}/api/history/${type}/${id}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Not found');

    if (type === 'review') {
      renderHistoryReviewDetail(data, detailContent);
    } else {
      renderHistoryNotesDetail(data, detailContent);
    }
  } catch (err) {
    detailContent.innerHTML = `<div class="error-state" style="min-height:120px">
      <p style="color:var(--risk-high)">${escHtml(err.message)}</p>
    </div>`;
  }
}

function renderHistoryReviewDetail(data, container) {
  const issues = data.issues || [];
  container.innerHTML = `
    <div class="results-header" style="border-bottom:1px solid var(--border-subtle);margin-bottom:.75rem">
      <span class="risk-badge ${(data.riskLevel||'').toUpperCase()}">${data.riskLevel || '?'}</span>
      <span class="results-title">${escHtml(data.language)} Review — ${formatDate(data.createdAt)}</span>
    </div>
    <p class="review-summary" style="padding:0 0 .75rem;border-bottom:1px solid var(--border-subtle)">${escHtml(data.summary)}</p>
    <div class="issues-list" id="history-issues-list">
      ${issues.length === 0
        ? `<div class="no-issues">
             <svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.8"/>
             <path d="M9 12l2 2 4-4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
             No issues found.
           </div>`
        : issues.map((issue, i) => {
            const sev = (issue.severity || 'LOW').toUpperCase();
            return `<div class="issue-card severity-${sev}">
              <div class="issue-header" role="button" tabindex="0" aria-expanded="false">
                <span class="issue-severity-dot"></span>
                <span class="issue-title">${escHtml(issue.title || 'Issue')}</span>
                <span class="issue-severity-label">${sev}</span>
                <svg class="issue-chevron" viewBox="0 0 16 16" fill="none">
                  <path d="M6 4l4 4-4 4" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              </div>
              <div class="issue-body">
                <p class="issue-explanation">${escHtml(issue.explanation || '')}</p>
                ${issue.suggestedFix
                  ? `<div class="issue-fix-label">Suggested fix</div>
                     <pre class="issue-fix-code">${escHtml(issue.suggestedFix)}</pre>`
                  : ''}
              </div>
            </div>`;
          }).join('')
      }
    </div>`;

  // Wire up toggles
  container.querySelectorAll('.issue-header').forEach(header => {
    const card   = header.closest('.issue-card');
    const toggle = () => {
      const open = card.classList.toggle('open');
      header.setAttribute('aria-expanded', String(open));
    };
    header.addEventListener('click', toggle);
    header.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); }
    });
  });
}

function renderHistoryNotesDetail(data, container) {
  const audienceLabel = data.audience === 'customers' ? 'Customer-facing' : data.audience === 'developers' ? 'For developers' : '';
  const metaParts = [data.version && `Version ${data.version}`, audienceLabel].filter(Boolean);
  const defs = [
    { label: 'Added',   cls: 'added',   items: data.added   || [] },
    { label: 'Fixed',   cls: 'fixed',   items: data.fixed   || [] },
    { label: 'Changed', cls: 'changed', items: data.changed || [] },
  ];

  container.innerHTML = `
    <div class="notes-header" style="border-bottom:1px solid var(--border-subtle);margin-bottom:.75rem">
      <div>
        <span class="notes-title">Release Notes — ${formatDate(data.createdAt)}</span>
        ${metaParts.length ? `<p class="notes-meta">${escHtml(metaParts.join(' · '))}</p>` : ''}
      </div>
    </div>
    <p class="notes-summary" style="padding:0 0 .75rem">${escHtml(data.summary || '')}</p>
    <div class="notes-sections">
      ${defs.filter(d => d.items.length > 0).map(({ label, cls, items }) => `
        <div class="notes-section">
          <div class="notes-section-title ${cls}">
            <svg viewBox="0 0 12 12" fill="currentColor"><circle cx="6" cy="6" r="4"/></svg>
            ${label}
          </div>
          <ul class="notes-list">
            ${items.map(i => `<li>${escHtml(i)}</li>`).join('')}
          </ul>
        </div>`).join('')}
    </div>`;
}

/* ── Security: HTML escaping helpers ─────────────────────────────────────── */

function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escAttr(str) {
  return String(str).replace(/"/g, '&quot;');
}
