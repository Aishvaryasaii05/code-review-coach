/**
 * advanced-features.js - Advanced AI-powered features
 */

/* ═══════════════════════════════════════════════════════════════════
   CODE COMPLEXITY ANALYZER
   ═══════════════════════════════════════════════════════════════════ */

class ComplexityAnalyzer {
  analyze(code) {
    const source = this.normalize(code);
    return {
      lines: code.split('\n').length,
      characters: code.length,
      functions: (code.match(/function\s+\w+|=>\s*{|\w+\s*\(/g) || []).length,
      complexity: this.calculateComplexity(source),
      timeComplexity: this.estimateTimeComplexity(source),
      spaceComplexity: this.estimateSpaceComplexity(source),
      performance: this.calculatePerformance(source),
      complexityNote: this.getComplexityNote(source),
      readability: this.calculateReadability(code),
      maintainability: this.calculateMaintainability(code)
    };
  }

  normalize(code) {
    return code
      .replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '')
      .replace(/(['"`])(?:\\.|(?!\1)[^\\])*\1/g, 'STRING');
  }

  calculateComplexity(code) {
    let score = 0;
    score += (code.match(/if|else|switch|case/g) || []).length * 2;
    score += (code.match(/for|while|do/g) || []).length * 3;
    score += (code.match(/try|catch/g) || []).length;
    return Math.min(100, score);
  }

  getLoopDepth(code) {
    let loopDepth = 0;
    let maxDepth = 0;
    const blockStack = [];
    let pendingLoop = false;
    for (let i = 0; i < code.length; i += 1) {
      if (/\b(for|while|do)\b/.test(code.slice(i, i + 8))) pendingLoop = true;
      if (code[i] === '{') {
        blockStack.push(pendingLoop);
        if (pendingLoop) {
          loopDepth += 1;
          maxDepth = Math.max(maxDepth, loopDepth);
        }
        pendingLoop = false;
      } else if (code[i] === '}') {
        if (blockStack.pop()) loopDepth = Math.max(0, loopDepth - 1);
      }
    }
    return maxDepth;
  }

  estimateTimeComplexity(code) {
    if (/\bfunction\s+(\w+)\s*\([^)]*\)[\s\S]*\b\1\s*\(/.test(code) || /\breturn\s+\w+\s*\([^)]*\)\s*\+/.test(code)) {
      return 'O(2^n)';
    }
    if (/\.sort\s*\(/.test(code)) return 'O(n log n)';
    if (/\b(binarySearch|binary_search)\b|\b(mid|middle)\b[\s=]/i.test(code) && /\b(left|low)\b[\s\S]*\b(right|high)\b/i.test(code)) {
      return 'O(log n)';
    }
    const loopDepth = this.getLoopDepth(code);
    if (loopDepth >= 3) return 'O(n^' + loopDepth + ')';
    if (loopDepth === 2) return 'O(n²)';
    if (loopDepth === 1 || /\.(map|filter|reduce|forEach|find|includes|indexOf)\s*\(/.test(code)) return 'O(n)';
    return 'O(1)';
  }

  estimateSpaceComplexity(code) {
    if (/\bnew\s+(Array|Map|Set)|\[\s*\]|\.push\s*\(|\.map\s*\(|\.filter\s*\(|\.reduce\s*\(/.test(code)) return 'O(n)';
    if (/\bfunction\s+(\w+)\s*\([^)]*\)[\s\S]*\b\1\s*\(/.test(code)) return 'O(n)';
    return 'O(1)';
  }

  calculatePerformance(code) {
    const time = this.estimateTimeComplexity(code);
    const penalties = { 'O(1)': 0, 'O(log n)': 8, 'O(n)': 18, 'O(n log n)': 28, 'O(n²)': 48, 'O(n^3)': 62, 'O(2^n)': 75 };
    const penalty = penalties[time] ?? 35;
    return Math.max(10, Math.min(100, 100 - penalty - Math.max(0, code.length - 5000) / 500));
  }

  getComplexityNote(code) {
    const time = this.estimateTimeComplexity(code);
    if (time === 'O(1)') return 'No repeated work was detected; runtime stays approximately constant.';
    if (time === 'O(log n)') return 'The code appears to reduce the search space each iteration, like binary search.';
    if (time === 'O(n²)' || time === 'O(n^3)') return 'Nested loops were detected. Runtime can grow quickly as input size increases.';
    if (time === 'O(2^n)') return 'Recursive repeated branching was detected. Consider memoization or an iterative approach.';
    return 'Estimate based on the main loop, collection operation, or sorting pattern found in the code.';
  }

  calculateReadability(code) {
    const avgLineLength = code.split('\n').reduce((sum, line) => sum + line.length, 0) / code.split('\n').length;
    const score = Math.max(0, 100 - avgLineLength);
    return Math.min(100, score);
  }

  calculateMaintainability(code) {
    const functions = (code.match(/function/g) || []).length;
    const comments = (code.match(/\/\/|\/\*|\*\//g) || []).length;
    const score = (comments / Math.max(1, functions)) * 50 + 50;
    return Math.min(100, score);
  }

  render(stats) {
    return `
      <div class="complexity-panel">
        <h3>📈 Code Analysis</h3>
        <div class="metrics-grid">
          <div class="metric"><span class="metric-label">Lines:</span><span class="metric-value">${stats.lines}</span></div>
          <div class="metric"><span class="metric-label">Functions:</span><span class="metric-value">${stats.functions}</span></div>
          <div class="metric"><span class="metric-label">Code score:</span><span class="metric-value">${stats.complexity}</span></div>
          <div class="metric metric-highlight"><span class="metric-label">Time:</span><span class="metric-value">${stats.timeComplexity}</span></div>
          <div class="metric metric-highlight"><span class="metric-label">Space:</span><span class="metric-value">${stats.spaceComplexity}</span></div>
        </div>
        <div class="analysis-note"><strong>Performance estimate:</strong> ${stats.complexityNote}</div>
        <div class="progress-bars">
          <div class="progress-item">
            <label>Readability</label>
            <div class="progress-bar"><div class="progress-fill" style="width: ${stats.readability}%; background: ${this.getColor(stats.readability)}"></div></div>
            <span>${Math.round(stats.readability)}%</span>
          </div>
          <div class="progress-item">
            <label>Speed estimate</label>
            <div class="progress-bar"><div class="progress-fill" style="width: ${stats.performance}%; background: ${this.getColor(stats.performance)}"></div></div>
            <span>${Math.round(stats.performance)}%</span>
          </div>
          <div class="progress-item">
            <label>Maintainability</label>
            <div class="progress-bar"><div class="progress-fill" style="width: ${stats.maintainability}%; background: ${this.getColor(stats.maintainability)}"></div></div>
            <span>${Math.round(stats.maintainability)}%</span>
          </div>
        </div>
      </div>
    `;
  }

  getColor(score) {
    if (score > 70) return '#3fb950';
    if (score > 40) return '#d29922';
    return '#f85149';
  }
}

/* ═══════════════════════════════════════════════════════════════════
   SMART SUGGESTIONS
   ═══════════════════════════════════════════════════════════════════ */

class SmartSuggestions {
  getSuggestions(code, language) {
    const suggestions = [];
    
    // Security patterns
    if (code.match(/eval\s*\(/)) {
      suggestions.push({ type: 'security', icon: '🔒', text: 'Avoid using eval() - it\'s a security risk', severity: 'high' });
    }
    if (code.match(/innerHTML\s*=/)) {
      suggestions.push({ type: 'security', icon: '🔒', text: 'Use textContent instead of innerHTML to prevent XSS', severity: 'medium' });
    }
    
    // Performance patterns
    if (code.match(/document\.querySelector.*for|while/)) {
      suggestions.push({ type: 'performance', icon: '⚡', text: 'Cache DOM queries outside loops', severity: 'medium' });
    }
    
    // Best practices
    if (code.match(/var\s+\w+/)) {
      suggestions.push({ type: 'modernize', icon: '✨', text: 'Use let or const instead of var', severity: 'low' });
    }
    if (!code.match(/['"]use strict['"]/)) {
      suggestions.push({ type: 'modernize', icon: '✨', text: 'Consider adding "use strict" mode', severity: 'low' });
    }
    
    // Code style
    if (code.match(/\t/)) {
      suggestions.push({ type: 'style', icon: '🎨', text: 'Use spaces instead of tabs for consistency', severity: 'low' });
    }
    
    return suggestions;
  }

  render(suggestions) {
    if (suggestions.length === 0) {
      return '<div class="no-suggestions">✓ No immediate suggestions - code looks good!</div>';
    }
    
    return `
      <div class="suggestions-panel">
        <h4>💡 Smart Suggestions (${suggestions.length})</h4>
        <div class="suggestions-list">
          ${suggestions.map(s => `
            <div class="suggestion-item severity-${s.severity}">
              <span class="suggestion-icon">${s.icon}</span>
              <span class="suggestion-text">${s.text}</span>
              <span class="suggestion-badge">${s.type}</span>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }
}

/* ═══════════════════════════════════════════════════════════════════
   AUTO-SAVE MANAGER
   ═══════════════════════════════════════════════════════════════════ */

class AutoSave {
  constructor() {
    this.enabled = localStorage.getItem('crc_autosave') !== 'false';
    this.interval = null;
  }

  start(inputId, storageKey) {
    if (!this.enabled) return;
    
    const input = document.getElementById(inputId);
    if (!input) return;

    // Load saved content
    const saved = localStorage.getItem(storageKey);
    if (saved && !input.value) {
      input.value = saved;
      showToast('Restored previous session');
    }

    // Auto-save every 3 seconds
    this.interval = setInterval(() => {
      const content = input.value;
      if (content) {
        localStorage.setItem(storageKey, content);
      }
    }, 3000);
  }

  stop() {
    if (this.interval) clearInterval(this.interval);
  }

  toggle() {
    this.enabled = !this.enabled;
    localStorage.setItem('crc_autosave', this.enabled);
    showToast(`Auto-save ${this.enabled ? 'enabled' : 'disabled'}`);
    if (this.enabled) {
      this.start('code-input', 'crc_autosave_code');
    } else {
      this.stop();
    }
  }
}

/* ═══════════════════════════════════════════════════════════════════
   CODE FORMATTER
   ═══════════════════════════════════════════════════════════════════ */

class CodeFormatter {
  format(code, language) {
    // Basic formatting
    let formatted = code;
    
    // Remove extra blank lines
    formatted = formatted.replace(/\n{3,}/g, '\n\n');
    
    // Trim trailing whitespace
    formatted = formatted.split('\n').map(line => line.trimEnd()).join('\n');
    
    // Basic indentation fix for JavaScript-like languages
    if (['JavaScript', 'TypeScript', 'Java'].includes(language)) {
      formatted = this.fixIndentation(formatted);
    }
    
    return formatted;
  }

  fixIndentation(code) {
    const lines = code.split('\n');
    let indent = 0;
    const indentSize = 2;
    
    return lines.map(line => {
      const trimmed = line.trim();
      if (!trimmed) return '';
      
      // Decrease indent for closing braces
      if (trimmed.startsWith('}') || trimmed.startsWith(']') || trimmed.startsWith(')')) {
        indent = Math.max(0, indent - 1);
      }
      
      const formatted = ' '.repeat(indent * indentSize) + trimmed;
      
      // Increase indent for opening braces
      if (trimmed.endsWith('{') || trimmed.endsWith('[') || trimmed.endsWith('(')) {
        indent++;
      }
      
      return formatted;
    }).join('\n');
  }
}

/* ═══════════════════════════════════════════════════════════════════
   QUICK ACTIONS
   ═══════════════════════════════════════════════════════════════════ */

class QuickActions {
  getActions() {
    return [
      { id: 'minify', icon: '📦', label: 'Minify Code', action: () => this.minifyCode() },
      { id: 'prettify', icon: '✨', label: 'Format Code', action: () => this.prettifyCode() },
      { id: 'analyze', icon: '📊', label: 'Analyze Complexity', action: () => this.analyzeCode() },
      { id: 'share', icon: '🔗', label: 'Share Code', action: () => this.shareCode() },
      { id: 'duplicate', icon: '📋', label: 'Duplicate Tab', action: () => this.duplicateCode() }
    ];
  }

  minifyCode() {
    const input = document.getElementById('code-input');
    if (!input) return;
    
    const minified = input.value
      .replace(/\/\*[\s\S]*?\*\/|\/\/.*/g, '') // Remove comments
      .replace(/\s+/g, ' ') // Collapse whitespace
      .trim();
    
    input.value = minified;
    showToast('Code minified');
  }

  prettifyCode() {
    const input = document.getElementById('code-input');
    const lang = document.getElementById('language-select')?.value || 'JavaScript';
    if (!input) return;
    
    const formatter = new CodeFormatter();
    input.value = formatter.format(input.value, lang);
    showToast('Code formatted');
  }

  analyzeCode() {
    const input = document.getElementById('code-input');
    if (!input || !input.value.trim()) {
      showToast('No code to analyze');
      return;
    }
    
    const analyzer = new ComplexityAnalyzer();
    const stats = analyzer.analyze(input.value);
    
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
      <div class="modal-content">
        <div class="modal-header">
          <h3>Code Analysis Results</h3>
          <button class="modal-close" onclick="this.closest('.modal').remove()">&times;</button>
        </div>
        ${analyzer.render(stats)}
      </div>
    `;
    document.body.appendChild(modal);
    setTimeout(() => modal.classList.add('show'), 10);
  }

  shareCode() {
    const input = document.getElementById('code-input');
    if (!input || !input.value.trim()) {
      showToast('No code to share');
      return;
    }
    
    // Create shareable link (base64 encoded)
    const encoded = btoa(encodeURIComponent(input.value));
    const url = `${window.location.origin}${window.location.pathname}?code=${encoded}`;
    
    navigator.clipboard.writeText(url).then(() => {
      showToast('Share link copied to clipboard!');
    });
  }

  duplicateCode() {
    const input = document.getElementById('code-input');
    if (!input) return;
    
    const snippet = window.snippetsLibrary?.save(
      `Copy ${new Date().toLocaleTimeString()}`,
      input.value,
      document.getElementById('language-select')?.value || 'JavaScript'
    );
  }

  render() {
    const actions = this.getActions();
    return `
      <div class="quick-actions-bar">
        ${actions.map(a => `
          <button class="quick-action-btn" onclick="quickActions.getActions().find(x=>x.id==='${a.id}').action()" title="${a.label}">
            <span class="action-icon">${a.icon}</span>
            <span class="action-label">${a.label}</span>
          </button>
        `).join('')}
      </div>
    `;
  }
}

/* ═══════════════════════════════════════════════════════════════════
   RECENT FILES
   ═══════════════════════════════════════════════════════════════════ */

class RecentFiles {
  constructor() {
    this.files = JSON.parse(localStorage.getItem('crc_recent_files') || '[]');
  }

  add(filename, code, language) {
    const file = {
      id: Date.now(),
      filename,
      code: code.slice(0, 500),
      language,
      timestamp: new Date().toISOString()
    };
    
    this.files = [file, ...this.files.filter(f => f.filename !== filename)].slice(0, 10);
    localStorage.setItem('crc_recent_files', JSON.stringify(this.files));
  }

  getAll() {
    return this.files;
  }

  load(id) {
    return this.files.find(f => f.id === id);
  }

  render() {
    if (this.files.length === 0) {
      return '<div class="empty-message">No recent files</div>';
    }
    
    return `
      <div class="recent-files-list">
        ${this.files.map(f => `
          <div class="recent-file-item" onclick="loadRecentFile(${f.id})">
            <div class="file-icon">📄</div>
            <div class="file-info">
              <div class="file-name">${escHtml(f.filename)}</div>
              <div class="file-meta">${f.language} • ${formatDate(f.timestamp)}</div>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }
}

/* ═══════════════════════════════════════════════════════════════════
   INITIALIZE
   ═══════════════════════════════════════════════════════════════════ */

window.complexityAnalyzer = new ComplexityAnalyzer();
window.smartSuggestions = new SmartSuggestions();
window.autoSave = new AutoSave();
window.codeFormatter = new CodeFormatter();
window.quickActions = new QuickActions();
window.recentFiles = new RecentFiles();

// Start auto-save for code input
window.autoSave.start('code-input', 'crc_autosave_code');
window.autoSave.start('diff-input', 'crc_autosave_diff');

// Global functions
window.loadRecentFile = function(id) {
  const file = window.recentFiles.load(id);
  if (!file) return;
  
  document.getElementById('code-input').value = file.code;
  document.getElementById('language-select').value = file.language;
  document.getElementById('recent-files-modal')?.classList.add('hidden');
  showToast(`Loaded: ${file.filename}`);
};

// Load shared code from URL
window.addEventListener('DOMContentLoaded', () => {
  const params = new URLSearchParams(window.location.search);
  const sharedCode = params.get('code');
  if (sharedCode) {
    try {
      const decoded = decodeURIComponent(atob(sharedCode));
      document.getElementById('code-input').value = decoded;
      showToast('Loaded shared code');
      // Clear URL
      window.history.replaceState({}, document.title, window.location.pathname);
    } catch (e) {
      console.error('Failed to load shared code:', e);
    }
  }
});

console.log('✨ Advanced features loaded!');
