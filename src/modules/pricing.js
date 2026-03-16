
// ---------------------------------------------------------------------------
// Pricing Module
// ---------------------------------------------------------------------------

var Pricing = (function () {
  let isYearly = false;

  // Cached DOM references — resolved once, reused on each toggle.
  let _toggleEl = null;
  let _monthlyLabel = null;
  let _yearlyLabel = null;
  let _priceAmounts = null;
  let _pricePeriods = null;
  let _resolved = false;

  function _resolve() {
    if (_resolved) return;
    _toggleEl = document.getElementById('billingToggle');
    _monthlyLabel = document.getElementById('monthlyLabel');
    _yearlyLabel = document.getElementById('yearlyLabel');
    _priceAmounts = document.querySelectorAll('.price-amount');
    _pricePeriods = document.querySelectorAll('.price-period-dynamic');
    _resolved = true;
  }

  function toggle() {
    isYearly = !isYearly;
    _resolve();

    if (_toggleEl) {
      _toggleEl.classList.toggle('yearly', isYearly);
      _toggleEl.setAttribute('aria-checked', String(isYearly));
    }
    if (_monthlyLabel) _monthlyLabel.classList.toggle('active-label', !isYearly);
    if (_yearlyLabel) _yearlyLabel.classList.toggle('active-label', isYearly);

    for (var pi = 0; pi < _priceAmounts.length; pi++) {
      const priceEl = _priceAmounts[pi].parentElement;
      _priceAmounts[pi].textContent = isYearly ? priceEl.dataset.yearly : priceEl.dataset.monthly;
    }
    for (var pj = 0; pj < _pricePeriods.length; pj++) {
      _pricePeriods[pj].textContent = isYearly ? 'per month, billed yearly' : 'per month';
    }
  }

  return { toggle: toggle };
})();
