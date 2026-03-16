
/* ═══════════════════════════════════════════════════════════════
 *  Growth Timeline – interactive user journey milestone viewer
 * ═══════════════════════════════════════════════════════════════ */
var GrowthTimeline = (function () {
  'use strict';

  const MILESTONES = ['week1', 'month1', 'month3', 'month6'];
  const PROGRESS = { week1: 12.5, month1: 37.5, month3: 62.5, month6: 87.5 };
  const AUTO_INTERVAL = 4000;
  let _current = 0;
  let _timer = null;
  let _paused = false;

  function select(index) {
    if (index < 0 || index >= MILESTONES.length) return;
    _current = index;
    const milestone = MILESTONES[index];

    // Tabs
    const tabs = document.querySelectorAll('.growth-tab');
    tabs.forEach(function (t) {
      let active = t.getAttribute('data-milestone') === milestone;
      t.classList.toggle('active', active);
      t.setAttribute('aria-pressed', active ? 'true' : 'false');
    });

    // Cards
    document.querySelectorAll('.growth-card').forEach(function (c) {
      c.classList.toggle('visible', c.getAttribute('data-milestone') === milestone);
    });

    // Progress bar
    const fill = document.getElementById('growthProgressFill');
    if (fill) fill.style.width = PROGRESS[milestone] + '%';

    // Markers
    document.querySelectorAll('.growth-marker').forEach(function (m, i) {
      m.classList.toggle('active', i === index);
      m.classList.toggle('passed', i < index);
    });
  }

  function next() {
    select((_current + 1) % MILESTONES.length);
  }

  function startAutoPlay() {
    stopAutoPlay();
    _paused = false;
    _timer = setInterval(function () {
      if (!_paused) next();
    }, AUTO_INTERVAL);
  }

  function stopAutoPlay() {
    if (_timer) { clearInterval(_timer); _timer = null; }
  }

  function pauseAutoPlay() { _paused = true; }
  function resumeAutoPlay() { _paused = false; }

  function init() {
    const section = document.getElementById('growthTimelineSection');
    if (!section) return;

    // Tab click handlers
    section.querySelectorAll('.growth-tab').forEach(function (tab) {
      tab.addEventListener('click', function () {
        const ms = tab.getAttribute('data-milestone');
        let idx = MILESTONES.indexOf(ms);
        if (idx !== -1) {
          select(idx);
          // Reset autoplay timer on manual interaction
          startAutoPlay();
        }
      });
    });

    // Marker click handlers
    section.querySelectorAll('.growth-marker').forEach(function (marker) {
      marker.style.cursor = 'pointer';
      marker.addEventListener('click', function () {
        const ms = marker.getAttribute('data-milestone');
        let idx = MILESTONES.indexOf(ms);
        if (idx !== -1) {
          select(idx);
          startAutoPlay();
        }
      });
    });

    // Pause on hover
    section.addEventListener('mouseenter', pauseAutoPlay);
    section.addEventListener('mouseleave', resumeAutoPlay);

    // Keyboard navigation
    section.setAttribute('tabindex', '0');
    section.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault();
        select(Math.min(_current + 1, MILESTONES.length - 1));
        startAutoPlay();
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        select(Math.max(_current - 1, 0));
        startAutoPlay();
      }
    });

    select(0);
    startAutoPlay();
  }

  return {
    init: init,
    select: select,
    next: next,
    startAutoPlay: startAutoPlay,
    stopAutoPlay: stopAutoPlay,
    getCurrent: function () { return _current; },
    getMilestones: function () { return MILESTONES.slice(); },
    MILESTONES: MILESTONES,
    PROGRESS: PROGRESS
  };
})();
