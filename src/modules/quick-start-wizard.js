
// ---------------------------------------------------------------------------
// Quick Start Wizard
// ---------------------------------------------------------------------------
var QuickStartWizard = (function () {
  'use strict';

  const state = { step: 1, useCase: null, frequency: null };

  const plans = {
    productivity: {
      steps: [
        { title: 'Open AgentBox in Telegram', desc: 'Tap the link and press Start' },
        { title: 'Set your timezone', desc: 'Say "My timezone is [your timezone]" so reminders work correctly' },
        { title: 'Try a reminder', desc: 'Type: "Remind me in 10 minutes to take a break"' },
        { title: 'Create a daily standup', desc: 'Ask: "Every morning at 9am, ask me what I plan to do today"' },
        { title: 'Send a task list', desc: 'Type your tasks and ask it to organize them by priority' }
      ],
      tip: 'Productivity users get the most value from reminders and daily check-ins. The free tier (20 msg/day) covers most daily planning needs.'
    },
    research: {
      steps: [
        { title: 'Open AgentBox in Telegram', desc: 'Tap the link and press Start' },
        { title: 'Ask a research question', desc: 'Try: "What are the latest developments in quantum computing?"' },
        { title: 'Send an article screenshot', desc: 'Screenshot a paper or article and ask for a summary' },
        { title: 'Compare sources', desc: 'Ask: "Compare what Reuters and AP say about [topic]"' },
        { title: 'Build a reading list', desc: 'Say: "Remember these articles for me" and send links over time' }
      ],
      tip: 'Research users love web search and image understanding. For heavy research days, the Pro plan gives you unlimited messages.'
    },
    creative: {
      steps: [
        { title: 'Open AgentBox in Telegram', desc: 'Tap the link and press Start' },
        { title: 'Start a brainstorm', desc: 'Try: "Give me 10 creative names for a coffee shop in Portland"' },
        { title: 'Send a mood board', desc: 'Send images and ask for style analysis or color palette extraction' },
        { title: 'Workshop your writing', desc: 'Paste a draft and ask: "Make this punchier but keep the tone"' },
        { title: 'Set a creative prompt', desc: 'Ask: "Every morning, send me a random writing prompt"' }
      ],
      tip: 'Creative users benefit from the agent\'s memory — it learns your style preferences over time. Try chatting for a week and notice the difference.'
    },
    coding: {
      steps: [
        { title: 'Open AgentBox in Telegram', desc: 'Tap the link and press Start' },
        { title: 'Ask a coding question', desc: 'Try: "Explain the difference between Promise.all and Promise.allSettled"' },
        { title: 'Send a screenshot', desc: 'Screenshot an error message and ask for help debugging' },
        { title: 'Code review on the go', desc: 'Paste a function and ask: "Any bugs or improvements here?"' },
        { title: 'Build a snippet library', desc: 'Send useful snippets and ask it to remember them for later' }
      ],
      tip: 'Coding on mobile is surprisingly useful for quick reviews, learning, and debugging. Your agent remembers your language preferences.'
    }
  };

  const freqRecs = {
    casual: { plan: 'Free', reason: '20 messages/day is plenty for occasional use.' },
    daily: { plan: 'Free or Pro', reason: 'Free works for light daily use. Upgrade to Pro if you hit the limit.' },
    power: { plan: 'Pro', reason: 'Unlimited messages for heavy daily usage. Totally worth it.' }
  };

  function init() {
    const container = document.getElementById('wizardContainer');
    if (!container) return;

    const nextBtn = document.getElementById('wizardNext');
    const backBtn = document.getElementById('wizardBack');

    container.addEventListener('click', function (e) {
      const opt = e.target.closest('.wizard-option');
      if (!opt) return;

      const group = opt.parentElement;
      group.querySelectorAll('.wizard-option').forEach(function (o) {
        o.classList.remove('selected');
        o.setAttribute('aria-checked', 'false');
      });
      opt.classList.add('selected');
      opt.setAttribute('aria-checked', 'true');

      if (state.step === 1) state.useCase = opt.getAttribute('data-value');
      if (state.step === 2) state.frequency = opt.getAttribute('data-value');

      nextBtn.disabled = false;
    });

    nextBtn.addEventListener('click', function () {
      if (state.step < 3) {
        state.step++;
        render();
      }
    });

    backBtn.addEventListener('click', function () {
      if (state.step > 1) {
        state.step--;
        render();
      }
    });
  }

  function render() {
    const steps = document.querySelectorAll('.wizard-step');
    steps.forEach(function (s) { s.classList.remove('active'); });
    let active = document.querySelector('[data-wizard-step="' + state.step + '"]');
    if (active) active.classList.add('active');

    let bar = document.getElementById('wizardProgressBar');
    if (bar) bar.style.width = (state.step / 3 * 100) + '%';

    const indicator = document.getElementById('wizardIndicator');
    if (indicator) indicator.textContent = 'Step ' + state.step + ' of 3';

    const backBtn = document.getElementById('wizardBack');
    const nextBtn = document.getElementById('wizardNext');
    backBtn.disabled = state.step === 1;

    if (state.step === 3) {
      nextBtn.style.display = 'none';
      renderResult();
    } else {
      nextBtn.style.display = '';
      // Check if current step has a selection
      let currentStep = document.querySelector('.wizard-step.active');
      const hasSelection = currentStep && currentStep.querySelector('.wizard-option.selected');
      nextBtn.disabled = !hasSelection;
    }
  }

  function renderResult() {
    let result = document.getElementById('wizardResult');
    if (!result || !state.useCase) return;

    const plan = plans[state.useCase];
    const freq = freqRecs[state.frequency] || freqRecs.casual;

    let html = '<ul class="wizard-result-plan">';
    plan.steps.forEach(function (s, i) {
      html += '<li><span class="plan-step-num">' + (i + 1) + '</span>';
      html += '<span class="plan-step-text"><strong>' + s.title + '</strong>';
      html += '<span>' + s.desc + '</span></span></li>';
    });
    html += '</ul>';

    html += '<div class="wizard-result-rec">';
    html += '<strong>💡 ' + plan.tip + '</strong>';
    html += '</div>';

    html += '<div class="wizard-result-rec">';
    html += '<strong>📊 Recommended plan: ' + freq.plan + '</strong>';
    html += '<span>' + freq.reason + '</span>';
    html += '</div>';

    html += '<div style="text-align:center">';
    html += '<a href="#pricingSection" class="wizard-result-cta">Get Started →</a>';
    html += '</div>';

    result.innerHTML = html;
  }

  return { init: init };
})();
