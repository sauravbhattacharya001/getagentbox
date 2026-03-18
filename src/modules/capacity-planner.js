// ---------------------------------------------------------------------------
// Capacity Planner Module
// ---------------------------------------------------------------------------
// Interactive tool that helps teams estimate their AgentBox usage,
// recommended plan, and monthly cost based on team size, message volume,
// and feature usage.

var CapacityPlanner = (function () {
  'use strict';

  var _section = null;
  var _teamSlider = null;
  var _msgSlider = null;
  var _teamVal = null;
  var _msgVal = null;
  var _featureChecks = [];
  var _resultPlan = null;
  var _resultCost = null;
  var _resultMessages = null;
  var _resultBar = null;
  var _resultBarLabel = null;
  var _resultTip = null;

  // Plan definitions
  var PLANS = [
    { name: 'Free',       msgLimit: 20,   price: 0,    color: '#6c757d' },
    { name: 'Starter',    msgLimit: 200,  price: 9,    color: '#0d6efd' },
    { name: 'Pro',        msgLimit: 1000, price: 29,   color: '#6f42c1' },
    { name: 'Team',       msgLimit: 5000, price: 79,   color: '#198754' },
    { name: 'Enterprise', msgLimit: 99999, price: 199, color: '#dc3545' }
  ];

  // Feature multipliers (how much they increase message consumption)
  var FEATURE_MULT = {
    'web-search':  1.3,
    'reminders':   1.1,
    'image':       1.5,
    'email':       1.2,
    'code':        1.4,
    'memory':      1.15
  };

  function section() {
    if (!_section) _section = document.getElementById('capacityPlannerSection');
    return _section;
  }

  function init() {
    _section = document.getElementById('capacityPlannerSection');
    if (!section()) return;

    _teamSlider = section().querySelector('[data-cp-slider="team"]');
    _msgSlider = section().querySelector('[data-cp-slider="messages"]');
    _teamVal = section().querySelector('[data-cp-val="team"]');
    _msgVal = section().querySelector('[data-cp-val="messages"]');
    _featureChecks = section().querySelectorAll('.cp-feature-check');
    _resultPlan = section().querySelector('.cp-result-plan');
    _resultCost = section().querySelector('.cp-result-cost');
    _resultMessages = section().querySelector('.cp-result-messages');
    _resultBar = section().querySelector('.cp-utilization-fill');
    _resultBarLabel = section().querySelector('.cp-utilization-label');
    _resultTip = section().querySelector('.cp-result-tip');

    if (_teamSlider) _teamSlider.addEventListener('input', update);
    if (_msgSlider) _msgSlider.addEventListener('input', update);

    for (var i = 0; i < _featureChecks.length; i++) {
      _featureChecks[i].addEventListener('change', update);
    }

    update();
  }

  function update() {
    if (!section()) return;

    var teamSize = parseInt(_teamSlider.value, 10) || 1;
    var msgsPerUser = parseInt(_msgSlider.value, 10) || 10;

    if (_teamVal) _teamVal.textContent = teamSize + (teamSize === 1 ? ' user' : ' users');
    if (_msgVal) _msgVal.textContent = msgsPerUser + ' msg/day';

    // Calculate feature multiplier
    var multiplier = 1.0;
    for (var i = 0; i < _featureChecks.length; i++) {
      if (_featureChecks[i].checked) {
        var feat = _featureChecks[i].dataset.feature;
        if (FEATURE_MULT[feat]) {
          multiplier *= FEATURE_MULT[feat];
        }
      }
    }

    // Effective daily messages per user (features increase effective usage)
    var effectiveDaily = Math.ceil(msgsPerUser * multiplier);
    var totalDaily = effectiveDaily * teamSize;
    var totalMonthly = totalDaily * 30;

    if (_resultMessages) {
      _resultMessages.textContent = totalMonthly.toLocaleString() + ' msgs/month';
    }

    // Find the best plan
    var bestPlan = PLANS[PLANS.length - 1];
    for (var j = 0; j < PLANS.length; j++) {
      if (PLANS[j].msgLimit >= totalDaily) {
        bestPlan = PLANS[j];
        break;
      }
    }

    // Cost for team = plan price * number of users (except Free)
    var totalCost = bestPlan.price === 0 ? 0 : bestPlan.price * teamSize;

    if (_resultPlan) {
      _resultPlan.textContent = bestPlan.name + ' Plan';
      _resultPlan.style.color = bestPlan.color;
    }
    if (_resultCost) {
      _resultCost.textContent = totalCost === 0 ? 'Free!' : '$' + totalCost + '/mo';
    }

    // Utilization bar
    var utilization = Math.min(100, Math.round((totalDaily / bestPlan.msgLimit) * 100));
    if (_resultBar) {
      _resultBar.style.width = utilization + '%';
      _resultBar.style.backgroundColor = utilization > 85 ? '#dc3545' : utilization > 60 ? '#ffc107' : '#198754';
    }
    if (_resultBarLabel) {
      _resultBarLabel.textContent = utilization + '% capacity used';
    }

    // Tip
    if (_resultTip) {
      if (utilization > 85) {
        _resultTip.textContent = '\u26A0\uFE0F You\'re near the limit \u2014 consider the next plan up for headroom.';
      } else if (utilization < 30 && bestPlan.price > 0) {
        _resultTip.textContent = '\uD83D\uDCA1 You have plenty of room \u2014 great for growth without plan changes.';
      } else if (totalCost === 0) {
        _resultTip.textContent = '\u2728 The free tier covers your current usage perfectly!';
      } else {
        _resultTip.textContent = '\u2705 Good fit! You\'re using your plan efficiently.';
      }
    }
  }

  return { init: init, update: update };
})();
