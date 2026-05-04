
// ---------------------------------------------------------------------------
// Roadmap Module
// ---------------------------------------------------------------------------

var Roadmap = (function () {
  const STORAGE_KEY = 'agentbox_roadmap_votes';
  let currentFilter = 'all';
  let _container = null;
  let _grid = null;

  /** Lazily resolve the container element (cache on first use). */
  function container() {
    if (!_container) _container = document.getElementById('roadmapSection');
    return _container;
  }

  /** Lazily resolve the grid element (cache on first use). */
  function grid() {
    if (!_grid) _grid = document.getElementById('roadmapGrid');
    return _grid;
  }

  /** Cached DOM collections — resolved once on init, reused on every filter. */
  let _filterBtns = [];
  let _cards = [];
  let _summaryItems = [];

  function init() {
    _container = document.getElementById('roadmapSection');
    if (!container()) return;

    restoreVotes();

    _filterBtns = Array.prototype.slice.call(
      container().querySelectorAll('.roadmap-filter-btn')
    );
    for (var i = 0; i < _filterBtns.length; i++) {
      _filterBtns[i].addEventListener('click', function (e) {
        const status = e.currentTarget.getAttribute('data-status');
        filterBy(status);
      });
    }

    _grid = document.getElementById('roadmapGrid');

    _cards = Array.prototype.slice.call(
      container().querySelectorAll('.roadmap-card')
    );
    _summaryItems = Array.prototype.slice.call(
      container().querySelectorAll('.roadmap-summary-item')
    );

    if (grid()) {
      grid().addEventListener('click', function (e) {
        let btn = e.target.closest('.roadmap-vote-btn');
        if (!btn) return;
        toggleVote(btn);
      });
    }

    arrowKeyNav(container(), '.roadmap-filter-btn', function (btn) {
      btn.focus();
      btn.click();
    });
  }

  function filterBy(status) {
    currentFilter = status || 'all';
    if (!container()) return;

    // Lazy-init cached arrays (avoids DOM queries on repeat calls)
    if (_filterBtns.length === 0) {
      _filterBtns = Array.prototype.slice.call(
        container().querySelectorAll('.roadmap-filter-btn')
      );
    }
    if (_cards.length === 0) {
      _cards = Array.prototype.slice.call(
        container().querySelectorAll('.roadmap-card')
      );
    }
    if (_summaryItems.length === 0) {
      _summaryItems = Array.prototype.slice.call(
        container().querySelectorAll('.roadmap-summary-item')
      );
    }

    for (var i = 0; i < _filterBtns.length; i++) {
      let isActive =
        _filterBtns[i].getAttribute('data-status') === currentFilter;
      _filterBtns[i].classList.toggle('active', isActive);
      _filterBtns[i].setAttribute(
        'aria-selected',
        isActive ? 'true' : 'false'
      );
    }

    for (var j = 0; j < _cards.length; j++) {
      const cardStatus = _cards[j].getAttribute('data-status');
      let visible = currentFilter === 'all' || cardStatus === currentFilter;
      _cards[j].setAttribute('data-hidden', visible ? 'false' : 'true');
    }

    for (var k = 0; k < _summaryItems.length; k++) {
      const itemStatus = _summaryItems[k].getAttribute('data-status');
      const highlighted =
        currentFilter === 'all' || itemStatus === currentFilter;
      _summaryItems[k].style.opacity = highlighted ? '1' : '0.4';
    }
  }

  function toggleVote(btn) {
    const card = btn.closest('.roadmap-card');
    if (!card) return;

    const countEl = card.querySelector('.roadmap-vote-count');
    if (!countEl) return;

    let count = parseInt(countEl.textContent, 10) || 0;
    const wasVoted = btn.classList.contains('voted');

    // Cap at 999999 to match restoreVotes validation and prevent overflow
    const MAX_VOTES = 999999;

    if (wasVoted) {
      count = Math.max(0, count - 1);
      btn.classList.remove('voted');
      btn.setAttribute('aria-pressed', 'false');
    } else {
      if (count >= MAX_VOTES) return; // Prevent overflow
      count += 1;
      btn.classList.add('voted');
      btn.setAttribute('aria-pressed', 'true');
    }

    countEl.textContent = String(count);
    saveVotes();
  }

  function getCards() {
    if (!grid()) return [];
    return Array.prototype.slice.call(grid().querySelectorAll('.roadmap-card'));
  }

  function getVisibleCards() {
    return getCards().filter(function (c) {
      return c.getAttribute('data-hidden') !== 'true';
    });
  }

  function getCurrent() {
    return currentFilter;
  }

  function getStatuses() {
    return ['all', 'shipped', 'progress', 'planned'];
  }

  function getStatusCounts() {
    const cards = getCards();
    const counts = { shipped: 0, progress: 0, planned: 0 };
    for (var i = 0; i < cards.length; i++) {
      let s = cards[i].getAttribute('data-status');
      if (counts.hasOwnProperty(s)) counts[s]++;
    }
    return counts;
  }

  function getVotes() {
    const cards = getCards();
    const votes = Object.create(null);
    for (var i = 0; i < cards.length; i++) {
      const h3 = cards[i].querySelector('h3');
      const countEl = cards[i].querySelector('.roadmap-vote-count');
      if (h3 && countEl) {
        votes[h3.textContent] = parseInt(countEl.textContent, 10) || 0;
      }
    }
    return votes;
  }

  function saveVotes() {
    try {
      const cards = getCards();
      const data = Object.create(null);
      for (var i = 0; i < cards.length; i++) {
        const h3 = cards[i].querySelector('h3');
        let btn = cards[i].querySelector('.roadmap-vote-btn');
        const countEl = cards[i].querySelector('.roadmap-vote-count');
        if (h3 && btn && countEl) {
          data[h3.textContent] = {
            count: parseInt(countEl.textContent, 10) || 0,
            voted: btn.classList.contains('voted')
          };
        }
      }
      StorageUtil.setJSON(STORAGE_KEY, data);
    } catch (e) {
      // Silently ignore storage write failures (quota, privacy mode)
    }
  }

  function restoreVotes() {
      const parsed = StorageUtil.getJSON(STORAGE_KEY, null);
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return;
      // Rebuild as prototype-safe map with validated entries
      const data = Object.create(null);
      for (var key in parsed) {
        if (!Object.prototype.hasOwnProperty.call(parsed, key)) continue;
        const entry = parsed[key];
        if (entry && typeof entry === 'object' && !Array.isArray(entry)) {
          data[key] = entry;
        }
      }
      const cards = getCards();
      for (var i = 0; i < cards.length; i++) {
        const h3 = cards[i].querySelector('h3');
        if (!h3 || !data[h3.textContent]) continue;
        const item = data[h3.textContent];
        const countEl = cards[i].querySelector('.roadmap-vote-count');
        let btn = cards[i].querySelector('.roadmap-vote-btn');
        // Validate count is a safe integer before rendering
        let count = parseInt(item.count, 10);
        if (countEl && !isNaN(count) && count >= 0 && count <= 999999) {
          countEl.textContent = String(count);
        }
        if (btn && item.voted === true) {
          btn.classList.add('voted');
          btn.setAttribute('aria-pressed', 'true');
        }
      }
  }

  return {
    init: init,
    filterBy: filterBy,
    getCurrent: getCurrent,
    getStatuses: getStatuses,
    getStatusCounts: getStatusCounts,
    getCards: getCards,
    getVisibleCards: getVisibleCards,
    getVotes: getVotes
  };
})();
