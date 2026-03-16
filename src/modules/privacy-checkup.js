
// Privacy Checkup Module
// ---------------------------------------------------------------------------

var PrivacyCheckup = (function () {
  'use strict';

  var QUESTIONS = [
    {
      id: 'data_storage',
      text: 'Are you concerned about where your conversation data is stored?',
      options: ['Very concerned', 'Somewhat', 'Not really'],
      weights: [3, 2, 1],
      feature: {
        title: 'Your Data Stays Yours',
        desc: 'AgentBox processes conversations in real-time and stores memory only on your terms. You can view, edit, or delete your data anytime.',
        icon: '🗄️'
      }
    },
    {
      id: 'third_party',
      text: 'Do you worry about your data being shared with third parties?',
      options: ['Absolutely', 'A little', 'Not concerned'],
      weights: [3, 2, 1],
      feature: {
        title: 'Zero Third-Party Sharing',
        desc: 'We never sell, share, or use your data for advertising. Your conversations are between you and your agent — period.',
        icon: '🚫'
      }
    },
    {
      id: 'memory_control',
      text: 'Is it important to you to control what the AI remembers about you?',
      options: ['Critical', 'Nice to have', 'Don\'t mind'],
      weights: [3, 2, 1],
      feature: {
        title: 'Full Memory Control',
        desc: 'You decide what your agent remembers. Review stored memories, delete specific ones, or wipe everything with a single command.',
        icon: '🧠'
      }
    },
    {
      id: 'encryption',
      text: 'How important is end-to-end encryption for your messages?',
      options: ['Essential', 'Preferred', 'Not a priority'],
      weights: [3, 2, 1],
      feature: {
        title: 'Encrypted in Transit',
        desc: 'All communication between you and AgentBox is encrypted. Messages travel through Telegram\'s encrypted infrastructure.',
        icon: '🔐'
      }
    },
    {
      id: 'account_delete',
      text: 'Do you want the ability to completely delete your account and all data?',
      options: ['Must have', 'Would be nice', 'Not important'],
      weights: [3, 2, 1],
      feature: {
        title: 'Complete Data Deletion',
        desc: 'One command deletes everything — your account, memories, conversation history. No hidden backups, no retention tricks.',
        icon: '🗑️'
      }
    },
    {
      id: 'transparency',
      text: 'Do you value transparency about how AI models process your data?',
      options: ['Very much', 'Somewhat', 'Not really'],
      weights: [3, 2, 1],
      feature: {
        title: 'Open & Transparent',
        desc: 'We document exactly which AI models power AgentBox, how they process data, and what happens at each step. No black boxes.',
        icon: '👁️'
      }
    }
  ];

  var currentStep = 0;
  var answers = [];

  function init() {
    var section = document.getElementById('privacyCheckupSection');
    if (!section) return;
    currentStep = 0;
    answers = [];
    renderQuestion();
    var restartBtn = document.getElementById('privacyRestartBtn');
    if (restartBtn) {
      restartBtn.addEventListener('click', restart);
    }
  }

  function renderQuestion() {
    var q = QUESTIONS[currentStep];
    var textEl = document.getElementById('privacyQuestionText');
    var optionsEl = document.getElementById('privacyOptions');
    var stepCounter = document.getElementById('privacyStepCounter');
    var progressFill = document.getElementById('privacyProgressFill');
    var card = document.getElementById('privacyQuestionCard');
    var report = document.getElementById('privacyReport');

    if (!textEl || !optionsEl) return;

    if (card) card.hidden = false;
    if (report) report.hidden = true;

    textEl.textContent = q.text;
    stepCounter.textContent = 'Question ' + (currentStep + 1) + ' of ' + QUESTIONS.length;
    var pct = ((currentStep) / QUESTIONS.length) * 100;
    progressFill.style.width = pct + '%';
    var bar = progressFill.parentElement;
    if (bar) bar.setAttribute('aria-valuenow', Math.round(pct));

    optionsEl.innerHTML = '';
    for (var i = 0; i < q.options.length; i++) {
      var btn = document.createElement('button');
      btn.className = 'privacy-option-btn';
      btn.textContent = q.options[i];
      btn.setAttribute('data-index', i);
      btn.addEventListener('click', handleAnswer);
      optionsEl.appendChild(btn);
    }
  }

  function handleAnswer(e) {
    var idx = parseInt(e.currentTarget.getAttribute('data-index'), 10);
    answers.push({
      questionId: QUESTIONS[currentStep].id,
      optionIndex: idx,
      weight: QUESTIONS[currentStep].weights[idx]
    });

    currentStep++;
    if (currentStep < QUESTIONS.length) {
      renderQuestion();
    } else {
      showReport();
    }
  }

  function showReport() {
    var card = document.getElementById('privacyQuestionCard');
    var report = document.getElementById('privacyReport');
    var stepCounter = document.getElementById('privacyStepCounter');
    var progressFill = document.getElementById('privacyProgressFill');

    if (card) card.hidden = true;
    if (report) report.hidden = false;
    if (stepCounter) stepCounter.textContent = 'Checkup Complete';
    if (progressFill) {
      progressFill.style.width = '100%';
      var bar = progressFill.parentElement;
      if (bar) bar.setAttribute('aria-valuenow', 100);
    }

    // Calculate concern level: higher weight = more concerned
    var totalWeight = 0;
    var maxWeight = QUESTIONS.length * 3;
    for (var i = 0; i < answers.length; i++) {
      totalWeight += answers[i].weight;
    }

    // Score: how well AgentBox addresses concerns (higher concern = more relevant features)
    // Scale: 0-100 where 100 = "we address all your top concerns"
    var score = Math.round((totalWeight / maxWeight) * 100);

    var scoreEl = document.getElementById('privacyScoreValue');
    if (scoreEl) {
      animateScore(scoreEl, score);
    }

    var findingsEl = document.getElementById('privacyFindings');
    if (!findingsEl) return;
    findingsEl.innerHTML = '';

    // Show features most relevant to user's concerns (highest weight first)
    var sorted = answers.slice().sort(function (a, b) { return b.weight - a.weight; });

    for (var j = 0; j < sorted.length; j++) {
      var qIdx = -1;
      for (var k = 0; k < QUESTIONS.length; k++) {
        if (QUESTIONS[k].id === sorted[j].questionId) { qIdx = k; break; }
      }
      if (qIdx === -1) continue;
      var q = QUESTIONS[qIdx];
      var concern = sorted[j].weight;

      var item = document.createElement('div');
      item.className = 'privacy-finding-item';
      item.setAttribute('role', 'listitem');
      if (concern >= 3) {
        item.classList.add('privacy-finding-high');
      } else if (concern >= 2) {
        item.classList.add('privacy-finding-medium');
      } else {
        item.classList.add('privacy-finding-low');
      }

      var badge = concern >= 3 ? '⚠️ High Priority' : concern >= 2 ? '📋 Noted' : '✅ Low Concern';
      item.innerHTML =
        '<div class="privacy-finding-header">' +
          '<span class="privacy-finding-icon">' + q.feature.icon + '</span>' +
          '<span class="privacy-finding-title">' + q.feature.title + '</span>' +
          '<span class="privacy-finding-badge">' + badge + '</span>' +
        '</div>' +
        '<p class="privacy-finding-desc">' + q.feature.desc + '</p>';

      findingsEl.appendChild(item);
    }
  }

  function animateScore(el, target) {
    var current = 0;
    var step = Math.max(1, Math.floor(target / 30));
    var timer = setInterval(function () {
      current += step;
      if (current >= target) {
        current = target;
        clearInterval(timer);
      }
      el.textContent = current;
    }, 30);
  }

  function restart() {
    currentStep = 0;
    answers = [];
    renderQuestion();
  }

  if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', function () { init(); });
  }
  if (typeof window !== 'undefined') { window.PrivacyCheckup = PrivacyCheckup; }

  return {
    init: init,
    restart: restart,
    _QUESTIONS: QUESTIONS
  };
})();
