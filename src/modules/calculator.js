
// Module exposure moved to end of file (after all IIFEs) to ensure
// every module is defined before assignment. See #23.


// ---------------------------------------------------------------------------
// Time Saved Calculator Module
// ---------------------------------------------------------------------------

var Calculator = (function () {
  let _section = null;

  // Cached DOM references — resolved once in init(), reused on every
  // slider input event.  Eliminates 5 getElementById + 1 querySelectorAll
  // calls per update (~dozens per second while dragging a slider).
  let _weeklyEl = null;
  let _monthlyEl = null;
  let _yearlyEl = null;
  let _equivEl = null;
  let _groups = [];

  /** Lazily resolve the section element (cache on first use). */
  function section() {
    if (!_section) _section = document.getElementById('calculatorSection');
    return _section;
  }

  function init() {
    _section = document.getElementById('calculatorSection');
    if (!section()) return;

    // Cache all static elements once
    _weeklyEl = document.getElementById('calcWeekly');
    _monthlyEl = document.getElementById('calcMonthly');
    _yearlyEl = document.getElementById('calcYearly');
    _equivEl = document.getElementById('calcEquivalent');
    _groups = section().querySelectorAll('.calc-slider-group');

    const sliders = section().querySelectorAll('.calc-range');
    for (var i = 0; i < sliders.length; i++) {
      sliders[i].addEventListener('input', update);
    }
    update();
  }

  function update() {
    if (!section()) return;

    let totalMinutes = 0;

    for (var i = 0; i < _groups.length; i++) {
      const slider = _groups[i].querySelector('.calc-range');
      const valueEl = _groups[i].querySelector('.calc-slider-value');
      const minutesPer = parseInt(_groups[i].dataset.minutes, 10) || 0;
      let count = parseInt(slider.value, 10) || 0;

      if (valueEl) valueEl.textContent = count + ' /week';
      totalMinutes += count * minutesPer;
    }

    if (_weeklyEl) _weeklyEl.textContent = totalMinutes;

    const monthlyHours = (totalMinutes * 4.33 / 60);
    if (_monthlyEl) _monthlyEl.textContent = monthlyHours < 10 ? monthlyHours.toFixed(1) : Math.round(monthlyHours);

    const yearlyHours = (totalMinutes * 52 / 60);
    if (_yearlyEl) _yearlyEl.textContent = Math.round(yearlyHours);

    if (_equivEl) {
      if (yearlyHours === 0) {
        _equivEl.textContent = 'Move the sliders to see your potential time savings \u261D\uFE0F';
      } else if (yearlyHours < 8) {
        _setEquivText(_equivEl, 'That\u2019s ', Math.round(yearlyHours) + ' hours',
          ' back every year \u2014 time for what matters \u2728');
      } else {
        const workdays = (yearlyHours / 8).toFixed(1);
        _setEquivText(_equivEl, 'That\u2019s like getting ', workdays + ' extra workdays',
          ' back every year \u2728');
      }
    }
  }

  /**
   * Safely set equivalent text with a bold middle portion (no innerHTML).
   * @param {Element} el - target element
   * @param {string} prefix - text before bold
   * @param {string} boldText - text to make bold
   * @param {string} suffix - text after bold
   */
  function _setEquivText(el, prefix, boldText, suffix) {
    while (el.firstChild) el.removeChild(el.firstChild);
    el.appendChild(document.createTextNode(prefix));
    const strong = document.createElement('strong');
    strong.textContent = boldText;
    el.appendChild(strong);
    el.appendChild(document.createTextNode(suffix));
  }

  function getTotal() {
    if (!_weeklyEl || !_weeklyEl.isConnected) return 0;
    return parseInt(_weeklyEl.textContent, 10) || 0;
  }

  return { init: init, update: update, getTotal: getTotal };
})();
