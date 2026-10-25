/**
 * features.js - Enhanced features for Code Review Coach
 * 
 * New Features:
 * - Code Snippets Library
 * - Code Comparison Mode
 * - Theme Toggle (Dark/Light)
 * - Statistics Dashboard
 * - Keyboard Shortcuts
 * - Review Templates
 * - Export functionality
 */

/* ═══════════════════════════════════════════════════════════════════
   THEME TOGGLE
   ═══════════════════════════════════════════════════════════════════ */

class ThemeManager {
  constructor() {
    this.currentTheme = localStorage.getItem('crc_theme') || 'dark';
    this.init();
  }

  init() {
    document.documentElement.setAttribute('data-theme', this.currentTheme);
    this.updateToggleButton();
  }

  toggle() {
    this.currentTheme = this.currentTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', this.currentTheme);
    localStorage.setItem('crc_theme', this.currentTheme);
    this.updateToggleButton();
    showToast(`Switched to ${this.currentTheme} theme`);
  }

  updateToggleButton() {
    const btn = document.getElementById('theme-toggle');
    if (btn) {
      btn.innerHTML = this.currentTheme === 'dark' 
        ? '<svg viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="3" fill="currentColor"/><path d="M8 1v2M8 13v2M15 8h-2M3 8H1M12.5 3.5l-1.4 1.4M4.9 11.1l-1.4 1.4M12.5 12.5l-1.4-1.4M4.9 4.9L3.5 3.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg> Light'
        : '<svg viewBox="0 0 16 16" fill="none"><path d="M14 8.5c-.8 3.3-3.8 5.5-7.2 4.8A6 6 0 0 1 2.2 8.8C1.5 5.4 3.7 2.3 7 1.5c.5-.1.6.5.2.8C5.8 3.4 5.3 5.2 6 7c1 2.4 3.6 3.6 6.2 2.8.5-.2.9.3.8.7Z" fill="currentColor"/></svg> Dark';
    }
  }
}

/* ═══════════════════════════════════════════════════════════════════
   CODE SNIPPETS LIBRARY
   ═══════════════════════════════════════════════════════════════════ */

class SnippetsLibrary {
  constructor() {
    try {
      const stored = JSON.parse(localStorage.getItem('crc_snippets') || '[]');
      this.snippets = Array.isArray(stored) ? stored : [];
    } catch (_) {
      this.snippets = [];
      showToast('Saved snippets could not be read');
    }
  }

  save(name, code, language, tags = []) {
    const cleanName = String(name || '').trim();
    const cleanCode = String(code || '');
    if (!cleanName || !cleanCode.trim()) {
      showToast('A snippet name and code are required');
      return null;
    }
    const snippet = {
      id: Date.now(),
      name: cleanName,
      code: cleanCode,
      language,
      tags,
      createdAt: new Date().toISOString()
    };
    this.snippets.unshift(snippet);
    try {
      localStorage.setItem('crc_snippets', JSON.stringify(this.snippets));
      showToast(`Snippet "${cleanName}" saved`);
      return snippet;
    } catch (_) {
      this.snippets.shift();
      showToast('Could not save snippet in this browser');
      return null;
    }
  }

  load(id) {
    return this.snippets.find(s => s.id === id);
  }

  delete(id) {
    this.snippets = this.snippets.filter(s => s.id !== id);
    localStorage.setItem('crc_snippets', JSON.stringify(this.snippets));
    showToast('Snippet deleted');
  }

  getAll() {
    return this.snippets;
  }

  search(query) {
    const q = query.toLowerCase();
    return this.snippets.filter(s => 
      s.name.toLowerCase().includes(q) ||
      s.code.toLowerCase().includes(q) ||
      s.tags.some(t => t.toLowerCase().includes(q))
    );
  }
}

/* ═══════════════════════════════════════════════════════════════════
   CODE COMPARISON MODE
   ═══════════════════════════════════════════════════════════════════ */

class CodeComparison {
  constructor() {
    this.isActive = false;
  }

  activate() {
    this.isActive = true;
    const container = document.querySelector('.two-col');
    if (container) {
      container.classList.add('comparison-mode');
    }
    showToast('Comparison mode activated');
  }

  deactivate() {
    this.isActive = false;
    const container = document.querySelector('.two-col');
    if (container) {
      container.classList.remove('comparison-mode');
    }
  }

  compare(code1, code2) {
    // Simple line-by-line diff
    const lines1 = code1.split('\n');
    const lines2 = code2.split('\n');
    const maxLines = Math.max(lines1.length, lines2.length);
    
    const diff = [];
    for (let i = 0; i < maxLines; i++) {
      const line1 = lines1[i] || '';
      const line2 = lines2[i] || '';
      
      if (line1 === line2) {
        diff.push({ type: 'same', line: line1, num: i + 1 });
      } else if (!line1) {
        diff.push({ type: 'added', line: line2, num: i + 1 });
      } else if (!line2) {
        diff.push({ type: 'removed', line: line1, num: i + 1 });
      } else {
        diff.push({ type: 'changed', line1, line2, num: i + 1 });
      }
    }
    
    return diff;
  }

  renderDiff(diff) {
    let html = '<div class="diff-view">';
    diff.forEach(item => {
      if (item.type === 'same') {
        html += `<div class="diff-line diff-same"><span class="line-num">${item.num}</span>${escHtml(item.line)}</div>`;
      } else if (item.type === 'added') {
        html += `<div class="diff-line diff-added"><span class="line-num">${item.num}</span>+ ${escHtml(item.line)}</div>`;
      } else if (item.type === 'removed') {
        html += `<div class="diff-line diff-removed"><span class="line-num">${item.num}</span>- ${escHtml(item.line)}</div>`;
      } else if (item.type === 'changed') {
        html += `<div class="diff-line diff-removed"><span class="line-num">${item.num}</span>- ${escHtml(item.line1)}</div>`;
        html += `<div class="diff-line diff-added"><span class="line-num">${item.num}</span>+ ${escHtml(item.line2)}</div>`;
      }
    });
    html += '</div>';
    return html;
  }
}

/* ═══════════════════════════════════════════════════════════════════
   STATISTICS DASHBOARD
   ═══════════════════════════════════════════════════════════════════ */

class StatsDashboard {
  getStats() {
    const reviews = this.getFromHistory('review');
    const notes = this.getFromHistory('release-notes');
    
    return {
      totalReviews: reviews.length,
      totalNotes: notes.length,
      highRiskCount: reviews.filter(r => r.riskLevel === 'HIGH').length,
      mediumRiskCount: reviews.filter(r => r.riskLevel === 'MEDIUM').length,
      lowRiskCount: reviews.filter(r => r.riskLevel === 'LOW').length,
      avgIssuesPerReview: reviews.length > 0 
        ? (reviews.reduce((sum, r) => sum + (r.issues?.length || 0), 0) / reviews.length).toFixed(1)
        : 0,
      languageBreakdown: this.getLanguageBreakdown(reviews),
      recentActivity: this.getRecentActivity(reviews, notes)
    };
  }

  getFromHistory(type) {
    // This would ideally fetch from the API, but for now use localStorage cache
    const cached = localStorage.getItem(`crc_${type}_history`);
    return cached ? JSON.parse(cached) : [];
  }

  getLanguageBreakdown(reviews) {
    const breakdown = {};
    reviews.forEach(r => {
      const lang = r.language || 'Unknown';
      breakdown[lang] = (breakdown[lang] || 0) + 1;
    });
    return breakdown;
  }

  async refresh() {
    const apiBase = localStorage.getItem('crc_api_base') || window.location.origin;
    try {
      const response = await fetch(`${apiBase}/api/history`);
      if (!response.ok) throw new Error('Could not load dashboard history');
      const { history = [] } = await response.json();
      const reviews = history
        .filter(item => item.type === 'review')
        .map(item => ({
          id: item.id,
          language: item.language || 'Unknown',
          riskLevel: item.risk_level || 'LOW',
          issues: [],
          createdAt: item.created_at
        }));
      localStorage.setItem('crc_review_history', JSON.stringify(reviews));
      this.renderIntoDashboard();
    } catch (_) {
      // Keep the locally cached dashboard visible when the backend is offline.
    }
  }

  renderIntoDashboard() {
    const target = document.getElementById('dashboard-stats');
    if (target) target.innerHTML = this.render();
  }

  getRecentActivity(reviews, notes) {
    const all = [
      ...reviews.map(r => ({ ...r, type: 'review', date: r.createdAt })),
      ...notes.map(n => ({ ...n, type: 'notes', date: n.createdAt }))
    ];
    return all.sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 10);
  }

  render() {
    const stats = this.getStats();
    return `
      <div class="stats-dashboard">
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-icon">01</div>
            <div class="stat-value">${stats.totalReviews}</div>
            <div class="stat-label">Total Reviews</div>
          </div>
          <div class="stat-card">
            <div class="stat-icon">02</div>
            <div class="stat-value">${stats.totalNotes}</div>
            <div class="stat-label">Release Notes</div>
          </div>
          <div class="stat-card">
            <div class="stat-icon">03</div>
            <div class="stat-value">${stats.highRiskCount}</div>
            <div class="stat-label">High Risk Issues</div>
          </div>
          <div class="stat-card">
            <div class="stat-icon">04</div>
            <div class="stat-value">${stats.avgIssuesPerReview}</div>
            <div class="stat-label">Avg Issues/Review</div>
          </div>
        </div>
        <div class="stats-charts">
          <div class="chart-card">
            <h3>Risk Distribution</h3>
            <div class="risk-bars">
              ${[
                ['high', 'High', stats.highRiskCount],
                ['medium', 'Medium', stats.mediumRiskCount],
                ['low', 'Low', stats.lowRiskCount]
              ].map(([level, label, count]) => `
                <div class="risk-row">
                  <div class="risk-row-label"><span>${label}</span><strong>${count}</strong></div>
                  <div class="risk-track"><div class="risk-bar ${level}" style="width: ${(count / stats.totalReviews * 100) || 0}%"></div></div>
                </div>
              `).join('')}
              ${stats.totalReviews === 0 ? '<p class="chart-empty">No review data yet.</p>' : ''}
            </div>
          </div>
          <div class="chart-card">
            <h3>Languages <span class="chart-subtitle">most used</span></h3>
            <div class="language-list">
              ${Object.entries(stats.languageBreakdown)
                .sort(([, a], [, b]) => b - a)
                .map(([lang, count], index, entries) => 
                `<div class="lang-item ${index === 0 ? 'most-used' : ''}">
                  <div class="lang-heading"><span class="lang-name">${lang}</span><span class="lang-count">${count} review${count === 1 ? '' : 's'}</span></div>
                  <div class="lang-track"><div class="lang-fill" style="width: ${(count / (entries[0]?.[1] || 1)) * 100}%"></div></div>
                </div>`
              ).join('')}
              ${Object.keys(stats.languageBreakdown).length === 0 ? '<p class="chart-empty">No language data yet.</p>' : ''}
            </div>
          </div>
        </div>
      </div>
    `;
  }
}

/* ═══════════════════════════════════════════════════════════════════
   KEYBOARD SHORTCUTS
   ═══════════════════════════════════════════════════════════════════ */

class KeyboardShortcuts {
  constructor() {
    this.shortcuts = {
      'ctrl+enter': 'Submit current form',
      'ctrl+k': 'Open snippets library',
      'ctrl+/': 'Toggle shortcuts help',
      'ctrl+shift+t': 'Toggle theme',
      'ctrl+shift+s': 'Save current code as snippet',
      'ctrl+shift+c': 'Toggle comparison mode',
      'ctrl+1': 'Go to Home tab',
      'ctrl+2': 'Go to Code Review tab',
      'ctrl+3': 'Go to Release Notes tab',
      'ctrl+4': 'Go to History tab',
      'esc': 'Close modals/panels'
    };
    this.init();
  }

  init() {
    document.addEventListener('keydown', (e) => {
      const ctrl = e.ctrlKey || e.metaKey;
      
      // Ctrl+Enter - Submit
      if (ctrl && e.key === 'Enter') {
        e.preventDefault();
        this.handleSubmit();
      }
      
      // Ctrl+K - Snippets
      if (ctrl && e.key === 'k') {
        e.preventDefault();
        this.openSnippets();
      }
      
      // Ctrl+/ - Help
      if (ctrl && e.key === '/') {
        e.preventDefault();
        this.toggleHelp();
      }
      
      // Ctrl+Shift+T - Theme
      if (ctrl && e.shiftKey && e.key === 'T') {
        e.preventDefault();
        window.themeManager?.toggle();
      }
      
      // Ctrl+Shift+S - Save snippet
      if (ctrl && e.shiftKey && e.key === 'S') {
        e.preventDefault();
        this.saveSnippet();
      }
      
      // Ctrl+1-4 - Tab navigation
      if (ctrl && e.key >= '1' && e.key <= '4') {
        e.preventDefault();
        this.navigateToTab(parseInt(e.key) - 1);
      }
      
      // Esc - Close modals
      if (e.key === 'Escape') {
        this.closeModals();
      }
    });
  }

  handleSubmit() {
    const activeTab = document.querySelector('.tab-panel.active');
    if (activeTab?.id === 'tab-review') {
      document.getElementById('review-btn')?.click();
    } else if (activeTab?.id === 'tab-release-notes') {
      document.getElementById('notes-btn')?.click();
    }
  }

  openSnippets() {
    const modal = document.getElementById('snippets-modal');
    if (modal) {
      modal.classList.remove('hidden');
      this.renderSnippetsList();
    }
  }

  toggleHelp() {
    const modal = document.getElementById('shortcuts-modal');
    if (modal) {
      modal.classList.toggle('hidden');
    }
  }

  saveSnippet() {
    const activeTab = document.querySelector('.tab-panel:not(.hidden)');
    const reviewCode = document.getElementById('code-input')?.value || '';
    const releaseText = document.getElementById('diff-input')?.value || '';
    const isReleaseNotes = activeTab?.id === 'tab-release-notes';
    const code = isReleaseNotes ? releaseText : reviewCode;
    const language = isReleaseNotes
      ? 'Diff'
      : document.getElementById('language-select')?.value || 'JavaScript';
    
    if (!code.trim()) {
      showToast('No code to save');
      return;
    }
    
    const suggestedName = isReleaseNotes ? 'release-notes-changes' : (document.getElementById('review-file-name')?.value || 'code-review-snippet');
    const modal = document.getElementById('save-snippet-modal');
    const input = document.getElementById('snippet-name-input');
    const confirm = document.getElementById('confirm-save-snippet');
    if (!modal || !input || !confirm) return;

    input.value = suggestedName.replace(/\.[a-z0-9]+$/i, '');
    modal.classList.remove('hidden');
    window.setTimeout(() => { input.focus(); input.select(); }, 0);

    const close = () => {
      modal.classList.add('hidden');
      confirm.onclick = null;
      input.onkeydown = null;
    };
    const save = () => {
      const saved = window.snippetsLibrary?.save(input.value, code, language);
      if (saved) {
        this.renderSnippetsList();
        close();
      }
    };
    confirm.onclick = save;
    input.onkeydown = event => {
      if (event.key === 'Enter') { event.preventDefault(); save(); }
      if (event.key === 'Escape') close();
    };
  }

  navigateToTab(index) {
    const tabs = document.querySelectorAll('.tab-btn');
    tabs[index]?.click();
  }

  closeModals() {
    document.querySelectorAll('.modal:not(.hidden)').forEach(modal => {
      modal.classList.add('hidden');
    });
  }

  renderHelp() {
    return `
      <div class="shortcuts-help">
        <h3>Keyboard Shortcuts</h3>
        <div class="shortcuts-list">
          ${Object.entries(this.shortcuts).map(([key, desc]) => `
            <div class="shortcut-item">
              <kbd>${key}</kbd>
              <span>${desc}</span>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  renderSnippetsList() {
    const snippets = window.snippetsLibrary?.getAll() || [];
    const container = document.getElementById('snippets-list');
    if (!container) return;
    
    if (snippets.length === 0) {
      container.innerHTML = '<p class="empty-message">No snippets saved yet. Press Ctrl+Shift+S to save one!</p>';
      return;
    }
    
    container.innerHTML = snippets.map(s => `
      <div class="snippet-item" data-id="${s.id}">
        <div class="snippet-header">
          <span class="snippet-name">${escHtml(s.name)}</span>
          <span class="snippet-lang">${s.language}</span>
        </div>
        <div class="snippet-preview">${escHtml(s.code.slice(0, 100))}${s.code.length > 100 ? '...' : ''}</div>
        <div class="snippet-actions">
          <button class="btn btn-sm" onclick="loadSnippet(${s.id})">Load</button>
          <button class="btn btn-sm btn-ghost" onclick="deleteSnippet(${s.id})">Delete</button>
        </div>
      </div>
    `).join('');
  }
}

/* ═══════════════════════════════════════════════════════════════════
   REVIEW TEMPLATES
   ═══════════════════════════════════════════════════════════════════ */

class ReviewTemplates {
  constructor() {
    this.templates = {
      security: {
        name: 'Security Audit',
        focus: 'security vulnerabilities, authentication, authorization, data validation',
        icon: '♢'
      },
      performance: {
        name: 'Performance Review',
        focus: 'performance bottlenecks, memory leaks, optimization opportunities',
        icon: '↗'
      },
      accessibility: {
        name: 'Accessibility Check',
        focus: 'WCAG compliance, screen reader support, keyboard navigation',
        icon: '♿︎'
      },
      bestPractices: {
        name: 'Best Practices',
        focus: 'coding standards, design patterns, maintainability',
        icon: '✓'
      },
      bugHunt: {
        name: 'Bug Detection',
        focus: 'logic errors, edge cases, null pointer exceptions, type errors',
        icon: '◉'
      }
    };
  }

  getAll() {
    return this.templates;
  }

  apply(templateKey) {
    const template = this.templates[templateKey];
    if (!template) return;
    
    // This would modify the review prompt to focus on specific areas
    showToast(`Applied template: ${template.name}`);
    return template;
  }

  render() {
    return `
      <div class="templates-grid">
        ${Object.entries(this.templates).map(([key, template]) => `
          <button class="template-card" onclick="applyTemplate('${key}')">
            <div class="template-icon">${template.icon}</div>
            <div class="template-name">${template.name}</div>
            <div class="template-desc">${template.focus}</div>
          </button>
        `).join('')}
      </div>
    `;
  }
}

/* ═══════════════════════════════════════════════════════════════════
   EXPORT FUNCTIONALITY
   ═══════════════════════════════════════════════════════════════════ */

class ExportManager {
  exportToPDF(content, filename) {
    // For now, create a print-friendly version
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>${filename}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 40px; }
          h1 { color: #333; }
          .issue { margin: 20px 0; padding: 15px; border-left: 4px solid #58a6ff; }
          .severity { font-weight: bold; color: #f85149; }
        </style>
      </head>
      <body>
        ${content}
        <script>window.print();</script>
      </body>
      </html>
    `);
    printWindow.document.close();
  }

  exportToJSON(data, filename) {
    const json = JSON.stringify(data, null, 2);
    this.downloadFile(json, filename, 'application/json');
  }

  exportToCSV(data, filename) {
    // Convert data to CSV format
    const headers = Object.keys(data[0] || {});
    const csv = [
      headers.join(','),
      ...data.map(row => headers.map(h => `"${row[h]}"`).join(','))
    ].join('\n');
    this.downloadFile(csv, filename, 'text/csv');
  }

  downloadFile(content, filename, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    showToast(`Exported ${filename}`);
  }
}

/* ═══════════════════════════════════════════════════════════════════
   INITIALIZE
   ═══════════════════════════════════════════════════════════════════ */

// Global instances
window.themeManager = new ThemeManager();
window.snippetsLibrary = new SnippetsLibrary();
window.codeComparison = new CodeComparison();
window.statsDashboard = new StatsDashboard();
window.keyboardShortcuts = new KeyboardShortcuts();
window.reviewTemplates = new ReviewTemplates();
window.exportManager = new ExportManager();

// Global functions for inline handlers
window.loadSnippet = function(id) {
  const snippet = window.snippetsLibrary.load(id);
  if (!snippet) return;
  
  document.getElementById('code-input').value = snippet.code;
  document.getElementById('language-select').value = snippet.language;
  document.getElementById('snippets-modal')?.classList.add('hidden');
  showToast(`Loaded snippet: ${snippet.name}`);
};

window.deleteSnippet = function(id) {
  if (confirm('Delete this snippet?')) {
    window.snippetsLibrary.delete(id);
    window.keyboardShortcuts.renderSnippetsList();
  }
};

document.querySelectorAll('[data-close-save-snippet]').forEach(button => {
  button.addEventListener('click', () => {
    document.getElementById('save-snippet-modal')?.classList.add('hidden');
  });
});

window.applyTemplate = function(key) {
  window.reviewTemplates.apply(key);
  document.getElementById('templates-modal')?.classList.add('hidden');
};

console.log('✨ Enhanced features loaded!');
