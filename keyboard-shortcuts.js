// ── Keyboard Shortcuts Reference Panel ────────────────────────────
// Shows all keyboard shortcuts across interactive modules in a
// searchable, categorized overlay. Triggered by pressing '?' or
// clicking the keyboard icon button.
// ------------------------------------------------------------------

var KeyboardShortcuts = (function () {
  'use strict';

  var SHORTCUT_GROUPS = [
    {
      module: 'General',
      icon: '⌨️',
      shortcuts: [
        { keys: ['?'], desc: 'Open this keyboard shortcuts panel' },
        { keys: ['Escape'], desc: 'Close any open overlay or panel' },
        { keys: ['Tab'], desc: 'Move focus to next interactive element' },
        { keys: ['Shift', 'Tab'], desc: 'Move focus to previous element' }
      ]
    },
    {
      module: 'Feature Tour',
      icon: '🎯',
      shortcuts: [
        { keys: ['→'], desc: 'Next tour step' },
        { keys: ['←'], desc: 'Previous tour step' },
        { keys: ['Escape'], desc: 'End tour' }
      ]
    },
    {
      module: 'Skill Tree',
      icon: '🌳',
      shortcuts: [
        { keys: ['→'], desc: 'Next skill in branch' },
        { keys: ['←'], desc: 'Previous skill in branch' },
        { keys: ['↑'], desc: 'Move to branch above' },
        { keys: ['↓'], desc: 'Move to branch below' },
        { keys: ['Enter'], desc: 'View skill details' },
        { keys: ['Escape'], desc: 'Close skill detail panel' }
      ]
    },
    {
      module: 'Day Simulator',
      icon: '📅',
      shortcuts: [
        { keys: ['→'], desc: 'Next time slot' },
        { keys: ['←'], desc: 'Previous time slot' },
        { keys: ['Space'], desc: 'Play/pause auto-advance' },
        { keys: ['R'], desc: 'Reset simulation' }
      ]
    },
    {
      module: 'Prompt Gallery',
      icon: '✨',
      shortcuts: [
        { keys: ['Enter'], desc: 'Expand selected prompt' },
        { keys: ['Escape'], desc: 'Collapse expanded prompt' }
      ]
    },
    {
      module: 'FAQ',
      icon: '❓',
      shortcuts: [
        { keys: ['Enter'], desc: 'Toggle FAQ item' },
        { keys: ['Space'], desc: 'Toggle FAQ item' }
      ]
    },
    {
      module: 'Glossary',
      icon: '📖',
      shortcuts: [
        { keys: ['Enter'], desc: 'Expand/collapse term' },
        { keys: ['Space'], desc: 'Expand/collapse term' }
      ]
    },
    {
      module: 'NPS Feedback',
      icon: '⭐',
      shortcuts: [
        { keys: ['←'], desc: 'Previous score button' },
        { keys: ['→'], desc: 'Next score button' },
        { keys: ['↑'], desc: 'Previous score button' },
        { keys: ['↓'], desc: 'Next score button' },
        { keys: ['Enter'], desc: 'Select score' },
        { keys: ['Space'], desc: 'Select score' }
      ]
    },
    {
      module: 'Growth Timeline',
      icon: '📈',
      shortcuts: [
        { keys: ['→'], desc: 'Next milestone' },
        { keys: ['←'], desc: 'Previous milestone' },
        { keys: ['Space'], desc: 'Play/pause auto-advance' }
      ]
    },
    {
      module: 'Section Minimap',
      icon: '🗺️',
      shortcuts: [
        { keys: ['Enter'], desc: 'Jump to section' }
      ]
    },
    {
      module: 'Scroll',
      icon: '⬆️',
      shortcuts: [
        { keys: ['Home'], desc: 'Scroll to top of page' }
      ]
    }
  ];

  var _panel = null;
  var _isOpen = false;
  var _searchQuery = '';
  var _previousFocus = null;

  function _escapeHtml(str) {
    if (typeof str !== 'string') return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
              .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function _matchesSearch(group) {
    if (!_searchQuery) return true;
    var q = _searchQuery.toLowerCase();
    if (group.module.toLowerCase().indexOf(q) >= 0) return true;
    for (var i = 0; i < group.shortcuts.length; i++) {
      var s = group.shortcuts[i];
      if (s.desc.toLowerCase().indexOf(q) >= 0) return true;
      for (var k = 0; k < s.keys.length; k++) {
        if (s.keys[k].toLowerCase().indexOf(q) >= 0) return true;
      }
    }
    return false;
  }

  function _filteredGroups() {
    if (!_searchQuery) return SHORTCUT_GROUPS;
    var results = [];
    for (var i = 0; i < SHORTCUT_GROUPS.length; i++) {
      if (_matchesSearch(SHORTCUT_GROUPS[i])) {
        // Also filter individual shortcuts within matching groups
        var group = SHORTCUT_GROUPS[i];
        var q = _searchQuery.toLowerCase();
        var filtered = [];
        for (var j = 0; j < group.shortcuts.length; j++) {
          var s = group.shortcuts[j];
          var matchDesc = s.desc.toLowerCase().indexOf(q) >= 0;
          var matchKey = false;
          for (var k = 0; k < s.keys.length; k++) {
            if (s.keys[k].toLowerCase().indexOf(q) >= 0) matchKey = true;
          }
          var matchModule = group.module.toLowerCase().indexOf(q) >= 0;
          if (matchDesc || matchKey || matchModule) {
            filtered.push(s);
          }
        }
        if (filtered.length > 0) {
          results.push({ module: group.module, icon: group.icon, shortcuts: filtered });
        }
      }
    }
    return results;
  }

  function _renderKey(key) {
    return '<kbd class="shortcut-key">' + _escapeHtml(key) + '</kbd>';
  }

  function _renderShortcut(shortcut) {
    var keysHtml = '';
    for (var i = 0; i < shortcut.keys.length; i++) {
      if (i > 0) keysHtml += '<span class="shortcut-plus">+</span>';
      keysHtml += _renderKey(shortcut.keys[i]);
    }
    return '<div class="shortcut-row" role="listitem">' +
      '<span class="shortcut-keys">' + keysHtml + '</span>' +
      '<span class="shortcut-desc">' + _escapeHtml(shortcut.desc) + '</span>' +
    '</div>';
  }

  function _renderGroup(group) {
    var html = '<div class="shortcut-group">';
    html += '<h3 class="shortcut-group-title">';
    html += '<span class="shortcut-group-icon" aria-hidden="true">' + group.icon + '</span> ';
    html += _escapeHtml(group.module);
    html += '</h3>';
    html += '<div class="shortcut-list" role="list">';
    for (var i = 0; i < group.shortcuts.length; i++) {
      html += _renderShortcut(group.shortcuts[i]);
    }
    html += '</div></div>';
    return html;
  }

  function _renderContent() {
    var groups = _filteredGroups();
    if (groups.length === 0) {
      return '<div class="shortcut-empty">No shortcuts match your search.</div>';
    }
    var total = 0;
    for (var g = 0; g < groups.length; g++) {
      total += groups[g].shortcuts.length;
    }
    var html = '<div class="shortcut-count">' + total + ' shortcut' + (total !== 1 ? 's' : '');
    if (_searchQuery) {
      html += ' matching "' + _escapeHtml(_searchQuery) + '"';
    }
    html += ' across ' + groups.length + ' module' + (groups.length !== 1 ? 's' : '') + '</div>';
    html += '<div class="shortcut-groups">';
    for (var i = 0; i < groups.length; i++) {
      html += _renderGroup(groups[i]);
    }
    html += '</div>';
    return html;
  }

  function _createPanel() {
    if (_panel) return;

    // Backdrop
    _panel = document.createElement('div');
    _panel.id = 'keyboardShortcutsPanel';
    _panel.className = 'shortcuts-overlay';
    _panel.setAttribute('role', 'dialog');
    _panel.setAttribute('aria-label', 'Keyboard Shortcuts');
    _panel.setAttribute('aria-modal', 'true');

    // Panel content
    var container = document.createElement('div');
    container.className = 'shortcuts-container';

    // Header
    var header = document.createElement('div');
    header.className = 'shortcuts-header';
    header.innerHTML =
      '<h2 class="shortcuts-title">⌨️ Keyboard Shortcuts</h2>' +
      '<button class="shortcuts-close" aria-label="Close keyboard shortcuts">&times;</button>';
    container.appendChild(header);

    // Search
    var searchBox = document.createElement('div');
    searchBox.className = 'shortcuts-search';
    searchBox.innerHTML =
      '<input type="search" class="shortcuts-search-input" ' +
      'placeholder="Search shortcuts..." ' +
      'aria-label="Search keyboard shortcuts">';
    container.appendChild(searchBox);

    // Body
    var body = document.createElement('div');
    body.id = 'shortcutsBody';
    body.className = 'shortcuts-body';
    container.appendChild(body);

    // Footer
    var footer = document.createElement('div');
    footer.className = 'shortcuts-footer';
    footer.innerHTML = '<span class="shortcuts-hint">Press <kbd>?</kbd> anytime to toggle this panel</span>';
    container.appendChild(footer);

    _panel.appendChild(container);
    document.body.appendChild(_panel);

    // Event listeners
    header.querySelector('.shortcuts-close').addEventListener('click', close);
    _panel.addEventListener('click', function (e) {
      if (e.target === _panel) close();
    });

    var searchInput = searchBox.querySelector('.shortcuts-search-input');
    searchInput.addEventListener('input', function () {
      _searchQuery = this.value.trim();
      _updateBody();
    });

    // Trap focus inside the dialog
    _panel.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        e.preventDefault();
        close();
        return;
      }
      if (e.key === 'Tab') {
        _trapFocus(e);
      }
    });
  }

  function _updateBody() {
    var body = document.getElementById('shortcutsBody');
    if (body) body.innerHTML = _renderContent();
  }

  function _trapFocus(e) {
    var focusable = _panel.querySelectorAll(
      'button, input, [tabindex]:not([tabindex="-1"])'
    );
    if (focusable.length === 0) return;

    var first = focusable[0];
    var last = focusable[focusable.length - 1];

    if (e.shiftKey) {
      if (document.activeElement === first) {
        e.preventDefault();
        last.focus();
      }
    } else {
      if (document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  }

  function open() {
    _createPanel();
    _previousFocus = document.activeElement;
    _searchQuery = '';
    var searchInput = _panel.querySelector('.shortcuts-search-input');
    if (searchInput) searchInput.value = '';
    _updateBody();
    _panel.classList.add('open');
    _isOpen = true;
    document.body.style.overflow = 'hidden';

    // Focus search input
    setTimeout(function () {
      if (searchInput) searchInput.focus();
    }, 50);
  }

  function close() {
    if (!_panel) return;
    _panel.classList.remove('open');
    _isOpen = false;
    document.body.style.overflow = '';

    if (_previousFocus && typeof _previousFocus.focus === 'function') {
      _previousFocus.focus();
    }
    _previousFocus = null;
  }

  function toggle() {
    if (_isOpen) {
      close();
    } else {
      open();
    }
  }

  function isOpen() {
    return _isOpen;
  }

  function init() {
    // Global keyboard listener for '?'
    document.addEventListener('keydown', function (e) {
      // Don't trigger when typing in inputs/textareas
      var tag = (e.target.tagName || '').toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select') return;
      if (e.target.isContentEditable) return;

      if (e.key === '?' || (e.shiftKey && e.key === '/')) {
        e.preventDefault();
        toggle();
      }
    });

    // Add floating trigger button
    var btn = document.createElement('button');
    btn.id = 'shortcutsTrigger';
    btn.className = 'shortcuts-trigger-btn';
    btn.setAttribute('aria-label', 'Keyboard shortcuts (press ? to toggle)');
    btn.setAttribute('title', 'Keyboard shortcuts (?)');
    btn.innerHTML = '⌨️';
    btn.addEventListener('click', toggle);
    document.body.appendChild(btn);
  }

  if (typeof document !== 'undefined' && document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { init(); });
  }

  return {
    init: init,
    open: open,
    close: close,
    toggle: toggle,
    isOpen: isOpen,
    getGroups: function () { return SHORTCUT_GROUPS.slice(); }
  };
})();

if (typeof window !== 'undefined') { window.KeyboardShortcuts = KeyboardShortcuts; }
