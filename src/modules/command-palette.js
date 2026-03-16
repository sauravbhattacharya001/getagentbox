
// ---------------------------------------------------------------------------
// Command Palette (Ctrl+K / Cmd+K)
// ---------------------------------------------------------------------------
var CommandPalette = (function () {
  const SECTIONS = [
    { id: 'featuresSection', icon: '✨', label: 'Features', hint: 'What AgentBox can do' },
    { id: 'howItWorks', icon: '🚀', label: 'How It Works', hint: 'Getting started' },
    { id: 'demoSection', icon: '💬', label: 'Demo', hint: 'See it in action' },
    { id: 'statsSection', icon: '📊', label: 'Stats', hint: 'Social proof' },
    { id: 'usecasesSection', icon: '👨‍💻', label: 'Use Cases', hint: 'Who it is for' },
    { id: 'integrationsSection', icon: '🔗', label: 'Integrations', hint: 'Connected tools' },
    { id: 'comparisonSection', icon: '⚖️', label: 'Compare', hint: 'vs ChatGPT, Siri' },
    { id: 'calculatorSection', icon: '⏱️', label: 'Time Calculator', hint: 'Estimate time saved' },
    { id: 'trustSection', icon: '🔒', label: 'Trust & Privacy', hint: 'Security details' },
    { id: 'testimonialsSection', icon: '💬', label: 'Testimonials', hint: 'What people say' },
    { id: 'pricingSection', icon: '💰', label: 'Pricing', hint: 'Plans & pricing' },
    { id: 'quizSection', icon: '🎯', label: 'Plan Quiz', hint: 'Find your ideal plan' },
    { id: 'changelogSection', icon: '📋', label: 'Changelog', hint: 'What is new' },
    { id: 'roadmapSection', icon: '🗺️', label: 'Roadmap', hint: 'Coming soon' },
    { id: 'statusSection', icon: '🟢', label: 'System Status', hint: 'Service health' },
    { id: 'faqSection', icon: '❓', label: 'FAQ', hint: 'Common questions' },
    { id: 'commandsSection', icon: '📋', label: 'Commands', hint: 'Command cheat sheet' },
    { id: 'apiExplorerSection', icon: '🔌', label: 'API Explorer', hint: 'Browse API endpoints' },
    { id: 'newsletterSection', icon: '📬', label: 'Newsletter', hint: 'Stay in the loop' }
  ];

  let overlay, input, results;
  let selectedIndex = 0;
  let filtered = [];
  const pool = []; // Pre-created <li> elements, one per SECTIONS entry
  const poolIndex = Object.create(null); // section.id -> pool array index (O(1) lookup)
  let _globalKeyHandler = null;

  function init() {
    overlay = document.getElementById('cmdPaletteOverlay');
    input = document.getElementById('cmdPaletteInput');
    results = document.getElementById('cmdPaletteResults');
    if (!overlay || !input || !results) return;

    _globalKeyHandler = function (e) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        toggle();
      }
      if (e.key === 'Escape' && !overlay.hidden) {
        close();
      }
    };
    document.addEventListener('keydown', _globalKeyHandler);

    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) close();
    });

    input.addEventListener('input', function () {
      filter(input.value);
    });

    input.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowDown') { e.preventDefault(); move(1); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); move(-1); }
      else if (e.key === 'Enter') { e.preventDefault(); go(); }
    });

    buildPool();
    filter('');
  }

  function toggle() {
    if (overlay.hidden) open(); else close();
  }

  function open() {
    overlay.hidden = false;
    input.value = '';
    filter('');
    input.focus();
  }

  function close() {
    overlay.hidden = true;
  }

  function filter(q) {
    const query = q.toLowerCase().trim();
    filtered = query
      ? SECTIONS.filter(function (s) {
          return s.label.toLowerCase().indexOf(query) !== -1 ||
                 s.hint.toLowerCase().indexOf(query) !== -1;
        })
      : SECTIONS.slice();
    selectedIndex = 0;
    render();
  }

  function buildPool() {
    SECTIONS.forEach(function (s, idx) {
      const li = document.createElement('li');
      li.className = 'cmd-palette-item';
      li.setAttribute('role', 'option');
      li.dataset.sectionId = s.id;

      const iconSpan = document.createElement('span');
      iconSpan.className = 'cmd-palette-item-icon';
      iconSpan.textContent = s.icon;

      const labelSpan = document.createElement('span');
      labelSpan.className = 'cmd-palette-item-label';
      labelSpan.textContent = s.label;

      const hintSpan = document.createElement('span');
      hintSpan.className = 'cmd-palette-item-hint';
      hintSpan.textContent = s.hint;

      li.appendChild(iconSpan);
      li.appendChild(labelSpan);
      li.appendChild(hintSpan);

      li.addEventListener('click', function () {
        // Find this item's current index in filtered list
        for (var j = 0; j < filtered.length; j++) {
          if (filtered[j].id === s.id) {
            selectedIndex = j;
            go();
            break;
          }
        }
      });

      pool[idx] = { el: li, section: s };
      poolIndex[s.id] = idx;
      results.appendChild(li);
    });
  }

  function render() {
    // Build lookup of visible section ids
    const visibleIds = Object.create(null);
    for (var i = 0; i < filtered.length; i++) {
      visibleIds[filtered[i].id] = i;
    }

    // Show/hide pooled elements and reorder visible ones
    const fragment = document.createDocumentFragment();
    // First, append visible items in filtered order — O(n) via poolIndex
    for (var i = 0; i < filtered.length; i++) {
      let idx = poolIndex[filtered[i].id];
      if (idx !== undefined) {
        const li = pool[idx].el;
        li.hidden = false;
        if (i === selectedIndex) {
          li.setAttribute('aria-selected', 'true');
        } else {
          li.removeAttribute('aria-selected');
        }
        fragment.appendChild(li);
      }
    }
    // Then append hidden items (keeps them in DOM but invisible)
    for (var j = 0; j < pool.length; j++) {
      if (!(pool[j].section.id in visibleIds)) {
        pool[j].el.hidden = true;
        pool[j].el.removeAttribute('aria-selected');
        fragment.appendChild(pool[j].el);
      }
    }
    results.appendChild(fragment);
  }

  /**
   * Move selection up/down without rebuilding DOM.
   * Old code called render() on every arrow key, destroying and recreating
   * all list items to move a highlight. Now updates aria-selected in-place
   * — O(1) DOM writes instead of O(n).
   */
  function move(dir) {
    if (!filtered.length) return;
    const items = results.children;
    if (items[selectedIndex]) items[selectedIndex].removeAttribute('aria-selected');
    selectedIndex = (selectedIndex + dir + filtered.length) % filtered.length;
    if (items[selectedIndex]) {
      items[selectedIndex].setAttribute('aria-selected', 'true');
      items[selectedIndex].scrollIntoView({ block: 'nearest' });
    }
  }

  function go() {
    if (!filtered.length) return;
    const section = filtered[selectedIndex];
    let el = document.getElementById(section.id);
    if (el) {
      close();
      el.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth', block: 'start' });
    }
  }

  function destroy() {
    if (_globalKeyHandler) document.removeEventListener('keydown', _globalKeyHandler);
    _globalKeyHandler = null;
    close();
  }

  return { init: init, destroy: destroy, open: open, close: close };
})();
