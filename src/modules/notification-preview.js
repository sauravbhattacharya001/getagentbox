
// ---------------------------------------------------------------------------
// Notification Preview - Phone Mockup with Scenario Cycling
// ---------------------------------------------------------------------------

var NotificationPreview = (function () {
  let SCENARIOS = [
    { title: 'Reminder', body: 'Your meeting with Sarah starts in 15 minutes', detail: 'Meeting: Q1 Planning Review\nLocation: Conference Room B\nAttendees: Sarah, Mike, Lisa', time: '2m ago' },
    { title: 'Search Result', body: 'Found 3 flights to Tokyo under $500', detail: 'Flight 1: ANA — $487 (direct, 11h 20m)\nFlight 2: JAL — $492 (direct, 11h 45m)\nFlight 3: United — $498 (1 stop, 14h 10m)', time: '5m ago' },
    { title: 'Daily Digest', body: 'Good morning! You have 4 tasks today...', detail: '1. Review PR #342\n2. Submit expense report\n3. Call dentist at 2pm\n4. Pick up groceries', time: '8:00 AM' },
    { title: 'Smart Alert', body: 'Your Amazon package is out for delivery', detail: 'Order: Wireless Earbuds (Pro)\nEstimated delivery: Today by 5pm\nCarrier: UPS — 8 stops away', time: '11m ago' },
    { title: 'Scheduled Message', body: 'Message sent to Mom: Happy Birthday!', detail: 'Scheduled at 7:00 AM\nDelivered via iMessage\nRead receipt: Seen at 7:03 AM', time: '7:00 AM' }
  ];

  let _currentIndex = 0;
  let _viewMode = 'compact'; // 'compact' or 'detailed'
  let _titleEl = null;
  let _bodyEl = null;
  let _detailEl = null;
  let _notifEl = null;

  function _cacheDOM() {
    const section = document.getElementById('notificationSection');
    if (!section) return false;
    _notifEl = section.querySelector('.phone-notification');
    _titleEl = section.querySelector('.phone-notif-title');
    _bodyEl = section.querySelector('.phone-notif-body');
    _detailEl = section.querySelector('.phone-notif-detail');
    return !!(_titleEl && _bodyEl && _detailEl && _notifEl);
  }

  function _render() {
    if (!_titleEl && !_cacheDOM()) return;
    let s = SCENARIOS[_currentIndex];
    _titleEl.textContent = s.title;
    _bodyEl.textContent = s.body;
    _detailEl.textContent = s.detail;
    _detailEl.hidden = _viewMode !== 'detailed';
  }

  function _animateIn() {
    if (!_notifEl) return;
    _notifEl.classList.remove('notif-slide-in');
    // Force reflow so re-adding the class triggers animation
    void _notifEl.offsetWidth;
    if (!prefersReducedMotion) {
      _notifEl.classList.add('notif-slide-in');
    }
  }

  function switchScenario(index) {
    if (index < 0 || index >= SCENARIOS.length) return;
    _currentIndex = index;
    _animateIn();
    _render();

    // Update active states on scenario buttons
    const section = document.getElementById('notificationSection');
    if (!section) return;
    const btns = section.querySelectorAll('.notif-scenario-btn');
    for (var i = 0; i < btns.length; i++) {
      let isActive = i === index;
      btns[i].classList.toggle('active', isActive);
      btns[i].setAttribute('aria-selected', String(isActive));
      btns[i].setAttribute('tabindex', isActive ? '0' : '-1');
    }
  }

  function setView(mode) {
    if (mode !== 'compact' && mode !== 'detailed') return;
    _viewMode = mode;
    _render();

    const section = document.getElementById('notificationSection');
    if (!section) return;
    const btns = section.querySelectorAll('.notif-view-btn');
    for (var i = 0; i < btns.length; i++) {
      let isActive = btns[i].dataset.view === mode;
      btns[i].classList.toggle('active', isActive);
      btns[i].setAttribute('aria-pressed', String(isActive));
    }
  }

  function init() {
    if (!_cacheDOM()) return;
    _render();

    // Bind event delegation (previously in the main DOMContentLoaded block)
    var section = document.getElementById('notificationSection');
    if (!section) return;
    var notifScenarios = section.querySelector('.notification-scenarios');
    if (notifScenarios) {
      notifScenarios.addEventListener('click', function (e) {
        var btn = e.target.closest('.notif-scenario-btn');
        if (btn && btn.dataset.scenario !== undefined) {
          switchScenario(parseInt(btn.dataset.scenario, 10));
        }
      });
      arrowKeyNav(notifScenarios, '.notif-scenario-btn', function (btn) {
        switchScenario(parseInt(btn.dataset.scenario, 10));
        btn.focus();
      });
    }
    var notifViewToggle = section.querySelector('.notification-view-toggle');
    if (notifViewToggle) {
      notifViewToggle.addEventListener('click', function (e) {
        var btn = e.target.closest('.notif-view-btn');
        if (btn && btn.dataset.view) {
          setView(btn.dataset.view);
        }
      });
    }
  }

  function getCurrent() { return _currentIndex; }
  function getView() { return _viewMode; }
  function getScenarios() { return SCENARIOS; }

  return {
    init: init,
    switchScenario: switchScenario,
    setView: setView,
    getCurrent: getCurrent,
    getView: getView,
    getScenarios: getScenarios
  };
})();
