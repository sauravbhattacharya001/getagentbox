
// ---------------------------------------------------------------------------
// Changelog Module
// ---------------------------------------------------------------------------

var Changelog = (function () {
  let currentTag = 'all';
  let _section = null;

  /** Lazily resolve the section element (cache on first use). */
  function section() {
    if (!_section) _section = document.getElementById('changelogSection');
    return _section;
  }

  /**
   * Filter changelog entries by tag.
   * @param {string} tag  The data-tag to show, or 'all'.
   * @returns {number} Number of visible entries.
   */
  function filterBy(tag) {
    if (!tag) return 0;

    if (!section()) return 0;

    // Lazy-init cached arrays (avoids DOM queries on repeat calls)
    if (_filterBtns.length === 0) {
      _filterBtns = Array.prototype.slice.call(
        section().querySelectorAll('.changelog-filter-btn')
      );
    }
    if (_entries.length === 0) {
      _entries = Array.prototype.slice.call(
        section().querySelectorAll('.changelog-entry')
      );
    }

    for (var i = 0; i < _filterBtns.length; i++) {
      let isActive = _filterBtns[i].dataset.tag === tag;
      _filterBtns[i].classList.toggle('active', isActive);
      _filterBtns[i].setAttribute('aria-selected', isActive ? 'true' : 'false');
    }

    let visibleCount = 0;
    for (var j = 0; j < _entries.length; j++) {
      const match = tag === 'all' || _entries[j].dataset.tag === tag;
      _entries[j].classList.toggle('hidden', !match);
      if (match) visibleCount++;
    }

    currentTag = tag;
    return visibleCount;
  }

  /** Get the current active tag filter. */
  function getCurrent() {
    return currentTag;
  }

  /** Get all available filter tags. */
  function getTags() {
    if (!section()) return [];
    const buttons = section().querySelectorAll('.changelog-filter-btn');
    const tags = [];
    for (var i = 0; i < buttons.length; i++) {
      if (buttons[i].dataset.tag) tags.push(buttons[i].dataset.tag);
    }
    return tags;
  }

  /** Get changelog entries data, optionally filtered by tag. */
  function getEntries(tag) {
    if (!section()) return [];
    const entries = section().querySelectorAll('.changelog-entry');
    let result = [];
    for (var i = 0; i < entries.length; i++) {
      const entry = entries[i];
      if (tag && tag !== 'all' && entry.dataset.tag !== tag) continue;
      const content = entry.querySelector('.changelog-content');
      result.push({
        tag: entry.dataset.tag || '',
        date: entry.querySelector('.changelog-date') ? entry.querySelector('.changelog-date').textContent : '',
        title: content && content.querySelector('h3') ? content.querySelector('h3').textContent : '',
        description: content && content.querySelector('p') ? content.querySelector('p').textContent : ''
      });
    }
    return result;
  }

  /** Get count of entries by tag. */
  function getTagCounts() {
    const entries = getEntries();
    const counts = { feature: 0, improvement: 0, fix: 0 };
    for (var i = 0; i < entries.length; i++) {
      if (counts[entries[i].tag] !== undefined) counts[entries[i].tag]++;
    }
    return counts;
  }

  /** Cached DOM collections — resolved once on init. */
  let _filterBtns = [];
  let _entries = [];

  /** Initialize click handlers on filter buttons. */
  function init() {
    _section = document.getElementById('changelogSection');
    if (!section()) return;

    _filterBtns = Array.prototype.slice.call(
      section().querySelectorAll('.changelog-filter-btn')
    );
    _entries = Array.prototype.slice.call(
      section().querySelectorAll('.changelog-entry')
    );

    let filterContainer = section().querySelector('.changelog-filter');
    if (!filterContainer) return;

    filterContainer.addEventListener('click', function (e) {
      let btn = e.target.closest('.changelog-filter-btn');
      if (!btn || !btn.dataset.tag) return;
      filterBy(btn.dataset.tag);
    });
  }

  return {
    filterBy: filterBy,
    getCurrent: getCurrent,
    getTags: getTags,
    getEntries: getEntries,
    getTagCounts: getTagCounts,
    init: init
  };
})();
