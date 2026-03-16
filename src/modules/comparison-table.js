
// Competitive Comparison Table
// ---------------------------------------------------------------------------
// Interactive feature comparison matrix showing AgentBox vs alternatives.
// Users can filter by category, hover for details, and see at-a-glance
// where AgentBox wins.

var ComparisonTable = (function () {
  let _section = null;

  const COMPETITORS = [
    { id: 'agentbox', name: 'AgentBox', highlight: true },
    { id: 'chatgpt', name: 'ChatGPT' },
    { id: 'zapier', name: 'Zapier' },
    { id: 'custom', name: 'Custom Bot' },
    { id: 'manual', name: 'Manual' }
  ];

  const CATEGORIES = [
    { id: 'automation', label: 'Automation' },
    { id: 'integration', label: 'Integration' },
    { id: 'intelligence', label: 'Intelligence' },
    { id: 'ops', label: 'Operations' },
    { id: 'pricing', label: 'Pricing' }
  ];

  // Rating: 3 = full, 2 = partial, 1 = limited, 0 = none
  const FEATURES = [
    { name: 'Multi-step workflows',       cat: 'automation',   ratings: { agentbox: 3, chatgpt: 1, zapier: 3, custom: 2, manual: 0 } },
    { name: 'Natural language triggers',   cat: 'automation',   ratings: { agentbox: 3, chatgpt: 3, zapier: 1, custom: 1, manual: 0 } },
    { name: 'Scheduled tasks',             cat: 'automation',   ratings: { agentbox: 3, chatgpt: 0, zapier: 3, custom: 2, manual: 1 } },
    { name: 'Error recovery',              cat: 'automation',   ratings: { agentbox: 3, chatgpt: 0, zapier: 2, custom: 1, manual: 0 } },
    { name: 'API connections',             cat: 'integration',  ratings: { agentbox: 3, chatgpt: 2, zapier: 3, custom: 3, manual: 0 } },
    { name: 'Browser automation',          cat: 'integration',  ratings: { agentbox: 3, chatgpt: 0, zapier: 1, custom: 2, manual: 3 } },
    { name: 'Database access',             cat: 'integration',  ratings: { agentbox: 3, chatgpt: 0, zapier: 2, custom: 3, manual: 1 } },
    { name: 'File management',             cat: 'integration',  ratings: { agentbox: 3, chatgpt: 1, zapier: 2, custom: 2, manual: 3 } },
    { name: 'Context awareness',           cat: 'intelligence', ratings: { agentbox: 3, chatgpt: 2, zapier: 0, custom: 1, manual: 3 } },
    { name: 'Learning from feedback',      cat: 'intelligence', ratings: { agentbox: 3, chatgpt: 1, zapier: 0, custom: 1, manual: 2 } },
    { name: 'Decision reasoning',          cat: 'intelligence', ratings: { agentbox: 3, chatgpt: 2, zapier: 0, custom: 0, manual: 3 } },
    { name: 'Multi-model support',         cat: 'intelligence', ratings: { agentbox: 3, chatgpt: 0, zapier: 0, custom: 2, manual: 0 } },
    { name: 'Real-time monitoring',        cat: 'ops',          ratings: { agentbox: 3, chatgpt: 0, zapier: 2, custom: 1, manual: 0 } },
    { name: 'Audit logs',                  cat: 'ops',          ratings: { agentbox: 3, chatgpt: 1, zapier: 2, custom: 1, manual: 0 } },
    { name: 'Team collaboration',          cat: 'ops',          ratings: { agentbox: 3, chatgpt: 1, zapier: 3, custom: 1, manual: 2 } },
    { name: 'Usage analytics',             cat: 'ops',          ratings: { agentbox: 3, chatgpt: 1, zapier: 2, custom: 0, manual: 0 } },
    { name: 'Free tier available',         cat: 'pricing',      ratings: { agentbox: 3, chatgpt: 2, zapier: 2, custom: 0, manual: 3 } },
    { name: 'Pay-per-use pricing',         cat: 'pricing',      ratings: { agentbox: 3, chatgpt: 1, zapier: 1, custom: 0, manual: 0 } },
    { name: 'No per-seat fees',            cat: 'pricing',      ratings: { agentbox: 3, chatgpt: 0, zapier: 0, custom: 3, manual: 3 } },
    { name: 'Transparent cost tracking',   cat: 'pricing',      ratings: { agentbox: 3, chatgpt: 1, zapier: 2, custom: 1, manual: 0 } }
  ];

  const RATING_LABELS = ['None', 'Limited', 'Partial', 'Full'];
  const RATING_ICONS = ['\u2014', '\u25CB', '\u25D1', '\u25CF'];

  let _activeCategory = 'all';
  let _filterBtns = [];
  let _tbody = null;
  const _scoreEls = {};
  let _summaryEl = null;

  function section() {
    if (!_section) _section = document.getElementById('comparisonSection');
    return _section;
  }

  function init() {
    _section = document.getElementById('comparisonSection');
    if (!section()) return;

    _filterBtns = section().querySelectorAll('.cmp-filter-btn');
    _tbody = section().querySelector('.cmp-tbody');
    _summaryEl = section().querySelector('.cmp-summary');

    for (var i = 0; i < COMPETITORS.length; i++) {
      let el = document.getElementById('cmpScore_' + COMPETITORS[i].id);
      if (el) _scoreEls[COMPETITORS[i].id] = el;
    }

    for (var j = 0; j < _filterBtns.length; j++) {
      _filterBtns[j].addEventListener('click', _onFilterClick);
    }

    _render();
  }

  function _onFilterClick(e) {
    let btn = e.currentTarget;
    let cat = btn.getAttribute('data-category');
    if (!cat) return;
    _activeCategory = cat;

    for (var i = 0; i < _filterBtns.length; i++) {
      let active = _filterBtns[i].getAttribute('data-category') === cat;
      _filterBtns[i].classList.toggle('active', active);
      _filterBtns[i].setAttribute('aria-pressed', active ? 'true' : 'false');
    }

    _render();
  }

  function _render() {
    if (!_tbody) return;

    // Clear tbody
    while (_tbody.firstChild) _tbody.removeChild(_tbody.firstChild);

    let filtered = _activeCategory === 'all'
      ? FEATURES
      : FEATURES.filter(function (f) { return f.cat === _activeCategory; });

    // Scores accumulator
    const scores = {};
    for (var c = 0; c < COMPETITORS.length; c++) {
      scores[COMPETITORS[c].id] = 0;
    }

    for (var i = 0; i < filtered.length; i++) {
      const feature = filtered[i];
      const row = document.createElement('tr');
      row.className = 'cmp-row';

      // Feature name cell
      const nameCell = document.createElement('td');
      nameCell.className = 'cmp-feature-name';
      nameCell.textContent = feature.name;
      row.appendChild(nameCell);

      // Rating cells
      for (var j = 0; j < COMPETITORS.length; j++) {
        const comp = COMPETITORS[j];
        const rating = feature.ratings[comp.id] || 0;
        scores[comp.id] += rating;

        const cell = document.createElement('td');
        cell.className = 'cmp-rating cmp-rating-' + rating;
        if (comp.highlight) cell.classList.add('cmp-highlight');
        cell.setAttribute('title', comp.name + ': ' + RATING_LABELS[rating]);
        cell.setAttribute('aria-label', feature.name + ' - ' + comp.name + ': ' + RATING_LABELS[rating]);
        cell.textContent = RATING_ICONS[rating];
        row.appendChild(cell);
      }

      _tbody.appendChild(row);
    }

    // Update score displays
    const maxPossible = filtered.length * 3;
    for (var k = 0; k < COMPETITORS.length; k++) {
      let id = COMPETITORS[k].id;
      if (_scoreEls[id]) {
        const pct = maxPossible > 0 ? Math.round(scores[id] / maxPossible * 100) : 0;
        _scoreEls[id].textContent = pct + '%';
      }
    }

    // Update summary
    if (_summaryEl) {
      const agentboxScore = maxPossible > 0 ? Math.round(scores.agentbox / maxPossible * 100) : 0;
      let bestAlt = 0;
      let bestAltName = '';
      for (var m = 1; m < COMPETITORS.length; m++) {
        let s = maxPossible > 0 ? Math.round(scores[COMPETITORS[m].id] / maxPossible * 100) : 0;
        if (s > bestAlt) {
          bestAlt = s;
          bestAltName = COMPETITORS[m].name;
        }
      }
      const diff = agentboxScore - bestAlt;
      if (diff > 0) {
        _summaryEl.textContent = 'AgentBox scores ' + diff + '% higher than the nearest alternative (' + bestAltName + ')';
      } else {
        _summaryEl.textContent = 'See how AgentBox compares across ' + filtered.length + ' features';
      }
    }
  }

  function setFilter(category) {
    _activeCategory = category || 'all';
    for (var i = 0; i < _filterBtns.length; i++) {
      let active = _filterBtns[i].getAttribute('data-category') === _activeCategory;
      _filterBtns[i].classList.toggle('active', active);
      _filterBtns[i].setAttribute('aria-pressed', active ? 'true' : 'false');
    }
    _render();
  }

  function getScores() {
    let filtered = _activeCategory === 'all'
      ? FEATURES
      : FEATURES.filter(function (f) { return f.cat === _activeCategory; });

    const maxPossible = filtered.length * 3;
    let result = {};
    for (var i = 0; i < COMPETITORS.length; i++) {
      let id = COMPETITORS[i].id;
      let total = 0;
      for (var j = 0; j < filtered.length; j++) {
        total += filtered[j].ratings[id] || 0;
      }
      result[id] = maxPossible > 0 ? Math.round(total / maxPossible * 100) : 0;
    }
    return result;
  }

  function getActiveCategory() {
    return _activeCategory;
  }

  return {
    init: init,
    setFilter: setFilter,
    getScores: getScores,
    getActiveCategory: getActiveCategory,
    COMPETITORS: COMPETITORS,
    CATEGORIES: CATEGORIES,
    FEATURES: FEATURES,
    RATING_LABELS: RATING_LABELS,
    RATING_ICONS: RATING_ICONS
  };
})();
