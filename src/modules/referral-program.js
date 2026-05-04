
// ── Referral Program ─────────────────────────────────────────────
var ReferralProgram = (function () {
  'use strict';

  var TIERS = [
    { min: 0,  label: 'Starter',    icon: '🌱', color: '#6b7280', perk: 'Share your link to start earning' },
    { min: 3,  label: 'Connector',  icon: '🔗', color: '#3b82f6', perk: '+10 bonus messages/day' },
    { min: 10, label: 'Advocate',   icon: '⭐', color: '#8b5cf6', perk: '+25 messages/day + priority support' },
    { min: 25, label: 'Champion',   icon: '🏆', color: '#f59e0b', perk: 'Unlimited messages for 1 month' },
    { min: 50, label: 'Legend',     icon: '👑', color: '#ef4444', perk: 'Lifetime Pro + custom personality' }
  ];

  var state = {
    handle: '',
    referrals: 0,
    link: '',
    history: []
  };

  function init() {
    var root = document.getElementById('referralProgramRoot');
    if (!root) return;
    render(root);
  }

  function getCurrentTier() {
    var tier = TIERS[0];
    for (var i = TIERS.length - 1; i >= 0; i--) {
      if (state.referrals >= TIERS[i].min) {
        tier = TIERS[i];
        break;
      }
    }
    return tier;
  }

  function getNextTier() {
    for (var i = 0; i < TIERS.length; i++) {
      if (state.referrals < TIERS[i].min) return TIERS[i];
    }
    return null;
  }

  function generateLink(handle) {
    return 'https://t.me/AgentBoxBot?start=ref_' + handle.replace(/[^a-zA-Z0-9_]/g, '');
  }

  function simulateReferrals() {
    var names = ['Alex', 'Jordan', 'Sam', 'Casey', 'Morgan', 'Riley', 'Taylor', 'Quinn', 'Avery', 'Drew',
                 'Jamie', 'Skyler', 'Reese', 'Dakota', 'Sage', 'Finley', 'Rowan', 'Emery', 'Kai', 'Nico'];
    var actions = ['signed up', 'started chatting', 'sent first message', 'joined via your link', 'activated their bot'];
    var times = ['just now', '2 min ago', '15 min ago', '1 hour ago', '3 hours ago', 'yesterday', '2 days ago'];

    var count = 3 + Math.floor(Math.random() * 8);
    state.referrals = count;
    state.history = [];

    for (var i = 0; i < count; i++) {
      state.history.push({
        name: names[Math.floor(Math.random() * names.length)],
        action: actions[Math.floor(Math.random() * actions.length)],
        time: times[Math.min(i, times.length - 1)]
      });
    }
  }

  function render(root) {
    root.innerHTML = buildHTML();
    bindEvents(root);
  }

  function buildHTML() {
    return '<div class="referral-container">' +
      '<div class="referral-generate" id="referralGenerate">' +
        '<p class="referral-intro">Invite friends to AgentBox and unlock rewards as they join. ' +
        'Enter your Telegram handle to get your unique referral link.</p>' +
        '<div class="referral-input-row">' +
          '<span class="referral-at">@</span>' +
          '<input type="text" class="referral-handle-input" id="referralHandleInput" ' +
            'placeholder="your_telegram_handle" maxlength="32" ' +
            'aria-label="Telegram handle" autocomplete="off">' +
          '<button class="referral-gen-btn" id="referralGenBtn">Generate Link</button>' +
        '</div>' +
        '<p class="referral-handle-hint" id="referralHandleHint" aria-live="polite"></p>' +
      '</div>' +

      '<div class="referral-dashboard" id="referralDashboard" hidden>' +
        '<div class="referral-link-card" id="referralLinkCard">' +
          '<label class="referral-link-label">Your Referral Link</label>' +
          '<div class="referral-link-row">' +
            '<input type="text" class="referral-link-input" id="referralLinkInput" readonly aria-label="Referral link">' +
            '<button class="referral-copy-btn" id="referralCopyBtn" aria-label="Copy link">📋 Copy</button>' +
          '</div>' +
          '<p class="referral-copy-status" id="referralCopyStatus" aria-live="polite"></p>' +
        '</div>' +

        '<div class="referral-stats-row">' +
          '<div class="referral-stat-card">' +
            '<span class="referral-stat-number" id="referralCount">0</span>' +
            '<span class="referral-stat-label">Referrals</span>' +
          '</div>' +
          '<div class="referral-stat-card">' +
            '<span class="referral-stat-number" id="referralTierIcon">🌱</span>' +
            '<span class="referral-stat-label" id="referralTierLabel">Starter</span>' +
          '</div>' +
          '<div class="referral-stat-card">' +
            '<span class="referral-stat-number" id="referralNextGoal">3</span>' +
            '<span class="referral-stat-label">Next Milestone</span>' +
          '</div>' +
        '</div>' +

        '<div class="referral-progress-section">' +
          '<div class="referral-progress-bar" role="progressbar" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100" id="referralProgressBar">' +
            '<div class="referral-progress-fill" id="referralProgressFill"></div>' +
          '</div>' +
          '<p class="referral-progress-text" id="referralProgressText"></p>' +
        '</div>' +

        buildTiersHTML() +

        '<div class="referral-activity">' +
          '<h3 class="referral-activity-title">📬 Recent Activity</h3>' +
          '<div class="referral-activity-list" id="referralActivityList" role="list" aria-label="Referral activity"></div>' +
        '</div>' +

        '<button class="referral-simulate-btn" id="referralSimBtn">🎲 Simulate Referrals (Demo)</button>' +
        '<button class="referral-reset-btn" id="referralResetBtn">↩️ Start Over</button>' +
      '</div>' +
    '</div>';
  }

  function buildTiersHTML() {
    var html = '<div class="referral-tiers"><h3 class="referral-tiers-title">🎁 Reward Tiers</h3><div class="referral-tiers-grid">';
    for (var i = 0; i < TIERS.length; i++) {
      var t = TIERS[i];
      html += '<div class="referral-tier-card" data-tier="' + i + '">' +
        '<span class="referral-tier-icon">' + t.icon + '</span>' +
        '<span class="referral-tier-name">' + t.label + '</span>' +
        '<span class="referral-tier-req">' + (t.min === 0 ? 'Start' : t.min + '+ referrals') + '</span>' +
        '<span class="referral-tier-perk">' + t.perk + '</span>' +
      '</div>';
    }
    html += '</div></div>';
    return html;
  }

  function bindEvents(root) {
    var genBtn = root.querySelector('#referralGenBtn');
    var input = root.querySelector('#referralHandleInput');
    var copyBtn = root.querySelector('#referralCopyBtn');
    var simBtn = root.querySelector('#referralSimBtn');
    var resetBtn = root.querySelector('#referralResetBtn');

    genBtn.addEventListener('click', function () { onGenerate(root); });
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') onGenerate(root);
    });
    copyBtn.addEventListener('click', function () { onCopy(root); });
    simBtn.addEventListener('click', function () { onSimulate(root); });
    resetBtn.addEventListener('click', function () { onReset(root); });
  }

  function onGenerate(root) {
    var input = root.querySelector('#referralHandleInput');
    var hint = root.querySelector('#referralHandleHint');
    var handle = (input.value || '').trim().replace(/^@/, '');

    if (!handle || handle.length < 3) {
      hint.textContent = 'Please enter a valid Telegram handle (at least 3 characters)';
      hint.className = 'referral-handle-hint referral-hint-error';
      return;
    }

    if (!/^[a-zA-Z0-9_]+$/.test(handle)) {
      hint.textContent = 'Handle can only contain letters, numbers, and underscores';
      hint.className = 'referral-handle-hint referral-hint-error';
      return;
    }

    state.handle = handle;
    state.link = generateLink(handle);
    state.referrals = 0;
    state.history = [];

    root.querySelector('#referralGenerate').hidden = true;
    root.querySelector('#referralDashboard').hidden = false;
    root.querySelector('#referralLinkInput').value = state.link;

    updateDashboard(root);
  }

  function onCopy(root) {
    var linkInput = root.querySelector('#referralLinkInput');
    var status = root.querySelector('#referralCopyStatus');

    if (navigator.clipboard) {
      navigator.clipboard.writeText(linkInput.value).then(function () {
        status.textContent = '✅ Copied to clipboard!';
        setTimeout(function () { status.textContent = ''; }, 2000);
      });
    } else {
      linkInput.select();
      document.execCommand('copy');
      status.textContent = '✅ Copied!';
      setTimeout(function () { status.textContent = ''; }, 2000);
    }
  }

  function onSimulate(root) {
    simulateReferrals();
    updateDashboard(root);
    animateReferralCount(root);
  }

  function onReset(root) {
    state = { handle: '', referrals: 0, link: '', history: [] };
    root.querySelector('#referralGenerate').hidden = false;
    root.querySelector('#referralDashboard').hidden = true;
    root.querySelector('#referralHandleInput').value = '';
    root.querySelector('#referralHandleHint').textContent = '';
  }

  function updateDashboard(root) {
    var tier = getCurrentTier();
    var next = getNextTier();

    root.querySelector('#referralCount').textContent = state.referrals;
    root.querySelector('#referralTierIcon').textContent = tier.icon;
    root.querySelector('#referralTierLabel').textContent = tier.label;

    if (next) {
      root.querySelector('#referralNextGoal').textContent = next.min;
      var progress = Math.min(100, Math.round((state.referrals / next.min) * 100));
      root.querySelector('#referralProgressFill').style.width = progress + '%';
      root.querySelector('#referralProgressBar').setAttribute('aria-valuenow', progress);
      root.querySelector('#referralProgressText').textContent =
        state.referrals + ' / ' + next.min + ' referrals to ' + next.label + ' ' + next.icon;
    } else {
      root.querySelector('#referralNextGoal').textContent = '🎉';
      root.querySelector('#referralProgressFill').style.width = '100%';
      root.querySelector('#referralProgressBar').setAttribute('aria-valuenow', 100);
      root.querySelector('#referralProgressText').textContent = 'You\'ve reached the highest tier! 👑';
    }

    // Highlight current tier
    var tierCards = root.querySelectorAll('.referral-tier-card');
    tierCards.forEach(function (card) {
      var idx = parseInt(card.getAttribute('data-tier'), 10);
      card.classList.toggle('referral-tier-active', state.referrals >= TIERS[idx].min);
      card.classList.toggle('referral-tier-current', TIERS[idx] === tier);
    });

    // Activity list
    var list = root.querySelector('#referralActivityList');
    if (state.history.length === 0) {
      list.innerHTML = '<div class="referral-activity-empty">No referrals yet — share your link to get started!</div>';
    } else {
      var html = '';
      for (var i = 0; i < state.history.length; i++) {
        var h = state.history[i];
        html += '<div class="referral-activity-item" role="listitem">' +
          '<span class="referral-activity-avatar">👤</span>' +
          '<span class="referral-activity-text"><strong>' + h.name + '</strong> ' + h.action + '</span>' +
          '<span class="referral-activity-time">' + h.time + '</span>' +
        '</div>';
      }
      list.innerHTML = html;
    }
  }

  function animateReferralCount(root) {
    var el = root.querySelector('#referralCount');
    var target = state.referrals;
    var current = 0;
    var step = Math.max(1, Math.floor(target / 20));
    var interval = setInterval(function () {
      current = Math.min(current + step, target);
      el.textContent = current;
      if (current >= target) clearInterval(interval);
    }, 50);
  }

  return { init: init };
})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = ReferralProgram;
}
