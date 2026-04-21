// ---------------------------------------------------------------------------
// Setup Checklist — Interactive onboarding progress tracker
// ---------------------------------------------------------------------------
var SetupChecklist = (function () {
  'use strict';

  // StorageUtil is always available — loaded first in build order (see build.js)
  var _storage = StorageUtil;

  var STORAGE_KEY = 'agentbox_setup_checklist';

  var STEPS = [
    {
      id: 'install_telegram',
      title: 'Install Telegram',
      icon: '📱',
      detail: 'Download Telegram from <a href="https://telegram.org/apps" target="_blank" rel="noopener">telegram.org/apps</a> on your phone, desktop, or use the web version.',
      tip: 'AgentBox works on all Telegram platforms — mobile, desktop, and web.'
    },
    {
      id: 'find_bot',
      title: 'Find @AgentBoxBot',
      icon: '🔍',
      detail: 'Open Telegram and search for <strong>@AgentBoxBot</strong> in the search bar, or <a href="https://t.me/AgentBoxBot" target="_blank" rel="noopener">click here</a> to open it directly.',
      tip: 'Look for the verified bot with the 🤖 icon.'
    },
    {
      id: 'send_start',
      title: 'Send /start',
      icon: '🚀',
      detail: 'Tap the <strong>Start</strong> button or type <code>/start</code> to activate your agent. It will greet you and set up your profile.',
      tip: 'Your agent begins learning about you from the first message!'
    },
    {
      id: 'set_name',
      title: 'Set your name',
      icon: '👤',
      detail: 'Tell your agent your name so it can address you personally. Just say something like <em>"My name is Alex"</em> or use <code>/setname Alex</code>.',
      tip: 'You can change this anytime — your agent adapts.'
    },
    {
      id: 'first_question',
      title: 'Ask your first question',
      icon: '💬',
      detail: 'Try asking anything — a factual question, help drafting a message, or a recommendation. For example: <em>"What\'s a good recipe for pasta?"</em>',
      tip: 'Your agent can search the web, do math, write code, and much more.'
    },
    {
      id: 'try_reminder',
      title: 'Set a reminder',
      icon: '⏰',
      detail: 'Test the reminder feature: <code>/remind 10m Check the oven</code> or just say <em>"Remind me in 30 minutes to call Mom"</em>.',
      tip: 'Natural language works too — no strict format needed.'
    },
    {
      id: 'explore_commands',
      title: 'Explore commands',
      icon: '📋',
      detail: 'Type <code>/help</code> to see all available commands, or check the <a href="#commandRefSection">Commands Reference</a> section on this page.',
      tip: 'Most things work with natural language — commands are just shortcuts.'
    },
    {
      id: 'share_friend',
      title: 'Share with a friend',
      icon: '🎉',
      detail: 'Love it? Share AgentBox with someone! Forward them the bot link: <strong>t.me/AgentBoxBot</strong>',
      tip: 'Each person gets their own private agent with separate memory.'
    }
  ];

  var root = null;
  var saved = {};

  function load() {
    return _storage.getJSON(STORAGE_KEY, {});
  }

  function save() {
    _storage.setJSON(STORAGE_KEY, saved);
  }

  function completedCount() {
    var n = 0;
    for (var i = 0; i < STEPS.length; i++) {
      if (saved[STEPS[i].id]) n++;
    }
    return n;
  }

  function renderProgress() {
    var bar = root.querySelector('.setup-progress-fill');
    var label = root.querySelector('.setup-progress-label');
    var done = completedCount();
    var pct = Math.round((done / STEPS.length) * 100);
    if (bar) bar.style.width = pct + '%';
    if (label) label.textContent = done + ' of ' + STEPS.length + ' complete';

    var congrats = root.querySelector('.setup-congrats');
    if (congrats) {
      congrats.hidden = done < STEPS.length;
    }
  }

  function toggleStep(stepId) {
    saved[stepId] = !saved[stepId];
    save();

    var item = root.querySelector('[data-step="' + stepId + '"]');
    if (item) {
      item.classList.toggle('completed', !!saved[stepId]);
      var cb = item.querySelector('.setup-checkbox');
      if (cb) {
        cb.setAttribute('aria-checked', String(!!saved[stepId]));
        cb.textContent = saved[stepId] ? '✅' : '⬜';
      }
    }
    renderProgress();
  }

  function toggleDetail(stepId) {
    var item = root.querySelector('[data-step="' + stepId + '"]');
    if (!item) return;
    var detail = item.querySelector('.setup-step-detail');
    var expanded = item.classList.toggle('expanded');
    if (detail) {
      detail.hidden = !expanded;
      detail.setAttribute('aria-hidden', String(!expanded));
    }
    var arrow = item.querySelector('.setup-expand-arrow');
    if (arrow) arrow.textContent = expanded ? '▾' : '▸';
  }

  function resetAll() {
    saved = {};
    save();
    var items = root.querySelectorAll('.setup-step-item');
    for (var i = 0; i < items.length; i++) {
      items[i].classList.remove('completed');
      var cb = items[i].querySelector('.setup-checkbox');
      if (cb) { cb.setAttribute('aria-checked', 'false'); cb.textContent = '⬜'; }
    }
    renderProgress();
  }

  function render() {
    var html = '';
    html += '<div class="setup-progress-bar"><div class="setup-progress-fill"></div></div>';
    html += '<p class="setup-progress-label"></p>';

    html += '<ol class="setup-steps-list">';
    for (var i = 0; i < STEPS.length; i++) {
      var s = STEPS[i];
      var done = !!saved[s.id];
      html += '<li class="setup-step-item' + (done ? ' completed' : '') + '" data-step="' + s.id + '">';
      html += '<div class="setup-step-header">';
      html += '<span class="setup-checkbox" role="checkbox" aria-checked="' + done + '" tabindex="0" aria-label="Mark ' + s.title + ' as complete">' + (done ? '✅' : '⬜') + '</span>';
      html += '<span class="setup-step-icon">' + s.icon + '</span>';
      html += '<span class="setup-step-title">' + s.title + '</span>';
      html += '<span class="setup-expand-arrow" aria-hidden="true">▸</span>';
      html += '</div>';
      html += '<div class="setup-step-detail" hidden aria-hidden="true">';
      html += '<p>' + s.detail + '</p>';
      html += '<p class="setup-step-tip">💡 <em>' + s.tip + '</em></p>';
      html += '</div>';
      html += '</li>';
    }
    html += '</ol>';

    html += '<div class="setup-congrats" hidden>🎊 <strong>You\'re all set!</strong> Your AgentBox agent is ready to go. Enjoy!</div>';
    html += '<button class="setup-reset-btn" aria-label="Reset checklist progress">Reset progress</button>';

    root.innerHTML = html;
    renderProgress();

    // Event delegation
    root.addEventListener('click', function (e) {
      var cb = e.target.closest('.setup-checkbox');
      if (cb) {
        var step = cb.closest('.setup-step-item');
        if (step) toggleStep(step.dataset.step);
        return;
      }
      var reset = e.target.closest('.setup-reset-btn');
      if (reset) { resetAll(); return; }
      var header = e.target.closest('.setup-step-header');
      if (header && !e.target.closest('.setup-checkbox')) {
        var item = header.closest('.setup-step-item');
        if (item) toggleDetail(item.dataset.step);
      }
    });

    root.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') {
        var cb = e.target.closest('.setup-checkbox');
        if (cb) {
          e.preventDefault();
          var step = cb.closest('.setup-step-item');
          if (step) toggleStep(step.dataset.step);
        }
      }
    });
  }

  function init(containerId) {
    root = typeof document !== 'undefined' ? document.getElementById(containerId || 'setupChecklistRoot') : null;
    if (!root) return;
    saved = load();
    render();
  }

  return { init: init, STEPS: STEPS };
})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = SetupChecklist;
}
