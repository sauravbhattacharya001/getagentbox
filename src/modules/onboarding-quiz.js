
// ---------------------------------------------------------------------------
// Onboarding Quiz — "Which plan is right for you?"
// ---------------------------------------------------------------------------

var OnboardingQuiz = (function () {
  const QUESTIONS = [
    {
      id: 'usage',
      text: 'How often will you use AgentBox?',
      options: [
        { label: 'A few times a week', icon: '🌱', value: 'light' },
        { label: 'Every day', icon: '☀️', value: 'daily' },
        { label: 'All day, every day', icon: '🔥', value: 'heavy' }
      ]
    },
    {
      id: 'team',
      text: 'Will you use it solo or with a team?',
      options: [
        { label: 'Just me', icon: '🧑', value: 'solo' },
        { label: 'Me and a few others', icon: '👥', value: 'small_team' },
        { label: 'My whole team (5+)', icon: '🏢', value: 'large_team' }
      ]
    },
    {
      id: 'features',
      text: 'Which feature matters most?',
      options: [
        { label: 'Web search & answers', icon: '🔍', value: 'search' },
        { label: 'Memory & context', icon: '🧠', value: 'memory' },
        { label: 'Reminders & files', icon: '📂', value: 'productivity' }
      ]
    },
    {
      id: 'volume',
      text: 'How many messages do you expect per day?',
      options: [
        { label: 'Under 20', icon: '💬', value: 'low' },
        { label: '20–100', icon: '📨', value: 'medium' },
        { label: '100+', icon: '📬', value: 'high' }
      ]
    },
    {
      id: 'priority',
      text: 'What matters most to you?',
      options: [
        { label: 'It is free', icon: '🆓', value: 'cost' },
        { label: 'No limits on usage', icon: '♾️', value: 'unlimited' },
        { label: 'Team collaboration', icon: '🤝', value: 'collaboration' }
      ]
    }
  ];

  const PLANS = {
    free: {
      name: 'Free',
      icon: '🎉',
      desc: 'The Free plan is perfect for you — get started with 20 messages/day, web search, and image understanding at no cost.',
      cta: 'Get Started Free',
      cls: 'quiz-plan-free'
    },
    pro: {
      name: 'Pro',
      icon: '⚡',
      desc: 'The Pro plan gives you unlimited messages, advanced memory, reminders, and file analysis — everything a power user needs.',
      cta: 'Upgrade to Pro — $9/mo',
      cls: 'quiz-plan-pro'
    },
    team: {
      name: 'Team',
      icon: '🏢',
      desc: 'The Team plan is built for collaboration — shared knowledge base, admin dashboard, and up to 10 members.',
      cta: 'Get Team — $29/mo',
      cls: 'quiz-plan-team'
    }
  };

  let currentStep = -1;
  let answers = {};
  let questionArea, progressBar, progressText, resultEl;
  let startEl, startBtn, retakeBtn;

  function init() {
    questionArea = document.getElementById('quizQuestionArea');
    progressBar = document.getElementById('quizProgressBar');
    progressText = document.getElementById('quizProgressText');
    resultEl = document.getElementById('quizResult');
    startEl = document.getElementById('quizStart');
    startBtn = document.getElementById('quizStartBtn');
    retakeBtn = document.getElementById('quizRetakeBtn');

    if (!questionArea || !startBtn) return;

    startBtn.addEventListener('click', function () {
      currentStep = 0;
      answers = {};
      showQuestion(0);
    });

    if (retakeBtn) {
      retakeBtn.addEventListener('click', function () {
        reset();
      });
    }
  }

  function reset() {
    currentStep = -1;
    answers = {};
    if (resultEl) resultEl.hidden = true;
    if (startEl) startEl.style.display = '';
    updateProgress(0);
    const existing = questionArea.querySelector('.quiz-q');
    if (existing) existing.remove();
  }

  function updateProgress(step) {
    const pct = Math.round((step / QUESTIONS.length) * 100);
    if (progressBar) progressBar.style.width = pct + '%';
    if (progressText) progressText.textContent = step + ' / ' + QUESTIONS.length;
    const pb = progressBar && progressBar.parentElement;
    if (pb) {
      pb.setAttribute('aria-valuenow', String(step));
    }
  }

  function showQuestion(idx) {
    if (startEl) startEl.style.display = 'none';
    if (resultEl) resultEl.hidden = true;
    updateProgress(idx);

    const q = QUESTIONS[idx];
    let prev = questionArea.querySelector('.quiz-q');
    if (prev) prev.remove();

    const wrap = document.createElement('div');
    wrap.className = 'quiz-q';
    wrap.setAttribute('role', 'radiogroup');
    wrap.setAttribute('aria-label', q.text);

    const title = document.createElement('h3');
    title.className = 'quiz-q-title';
    title.textContent = q.text;
    wrap.appendChild(title);

    const stepLabel = document.createElement('span');
    stepLabel.className = 'quiz-step-label';
    stepLabel.textContent = 'Question ' + (idx + 1) + ' of ' + QUESTIONS.length;
    wrap.appendChild(stepLabel);

    const optionsWrap = document.createElement('div');
    optionsWrap.className = 'quiz-options';

    for (var i = 0; i < q.options.length; i++) {
      (function (opt, oi) {
        let btn = document.createElement('button');
        btn.className = 'quiz-option';
        btn.setAttribute('role', 'radio');
        btn.setAttribute('aria-checked', 'false');
        btn.setAttribute('tabindex', oi === 0 ? '0' : '-1');
        btn.innerHTML = '<span class="quiz-option-icon">' + opt.icon + '</span>' +
          '<span class="quiz-option-label">' + opt.label + '</span>';

        btn.addEventListener('click', function () {
          selectAnswer(q.id, opt.value, btn, idx);
        });

        btn.addEventListener('keydown', function (e) {
          const opts = Array.prototype.slice.call(optionsWrap.querySelectorAll('.quiz-option'));
          const ki = opts.indexOf(e.target);
          let next = -1;
          if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
            next = (ki + 1) % opts.length;
          } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
            next = (ki - 1 + opts.length) % opts.length;
          }
          if (next >= 0) {
            e.preventDefault();
            opts[next].focus();
            opts[next].setAttribute('tabindex', '0');
            e.target.setAttribute('tabindex', '-1');
          }
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            selectAnswer(q.id, opt.value, btn, idx);
          }
        });

        optionsWrap.appendChild(btn);
      })(q.options[i], i);
    }

    wrap.appendChild(optionsWrap);

    if (idx > 0) {
      const backBtn = document.createElement('button');
      backBtn.className = 'quiz-back-btn';
      backBtn.textContent = '\u2190 Back';
      backBtn.addEventListener('click', function () {
        currentStep = idx - 1;
        showQuestion(idx - 1);
      });
      wrap.appendChild(backBtn);
    }

    questionArea.appendChild(wrap);
  }

  function selectAnswer(questionId, value, btn, idx) {
    answers[questionId] = value;

    const siblings = btn.parentElement.querySelectorAll('.quiz-option');
    for (var i = 0; i < siblings.length; i++) {
      siblings[i].classList.remove('selected');
      siblings[i].setAttribute('aria-checked', 'false');
    }
    btn.classList.add('selected');
    btn.setAttribute('aria-checked', 'true');

    setTimeout(function () {
      if (idx < QUESTIONS.length - 1) {
        currentStep = idx + 1;
        showQuestion(idx + 1);
      } else {
        showResult();
      }
    }, 350);
  }

  function scorePlan() {
    const scores = { free: 0, pro: 0, team: 0 };
    const reasons = [];

    if (answers.usage === 'light') {
      scores.free += 3;
      reasons.push({ plan: 'free', text: 'You use it a few times a week \u2014 Free covers that' });
    } else if (answers.usage === 'daily') {
      scores.pro += 3;
      reasons.push({ plan: 'pro', text: 'Daily usage benefits from unlimited messages' });
    } else if (answers.usage === 'heavy') {
      scores.pro += 2;
      scores.team += 2;
      reasons.push({ plan: 'pro', text: 'Heavy usage needs no message limits' });
    }

    if (answers.team === 'solo') {
      scores.free += 1;
      scores.pro += 1;
    } else if (answers.team === 'small_team') {
      scores.team += 3;
      reasons.push({ plan: 'team', text: 'Your team can share a knowledge base' });
    } else if (answers.team === 'large_team') {
      scores.team += 5;
      reasons.push({ plan: 'team', text: 'Team plan supports up to 10 members with admin controls' });
    }

    if (answers.features === 'search') {
      scores.free += 2;
      reasons.push({ plan: 'free', text: 'Web search is included in every plan' });
    } else if (answers.features === 'memory') {
      scores.pro += 3;
      reasons.push({ plan: 'pro', text: 'Advanced memory keeps context across long conversations' });
    } else if (answers.features === 'productivity') {
      scores.pro += 3;
      reasons.push({ plan: 'pro', text: 'Reminders and file analysis are Pro features' });
    }

    if (answers.volume === 'low') {
      scores.free += 3;
      reasons.push({ plan: 'free', text: 'Under 20 messages/day fits the Free tier perfectly' });
    } else if (answers.volume === 'medium') {
      scores.pro += 3;
      reasons.push({ plan: 'pro', text: 'With 20\u2013100 daily messages, you need unlimited' });
    } else if (answers.volume === 'high') {
      scores.pro += 2;
      scores.team += 2;
      reasons.push({ plan: 'pro', text: '100+ messages/day requires an unlimited plan' });
    }

    if (answers.priority === 'cost') {
      scores.free += 4;
      reasons.push({ plan: 'free', text: 'Free plan \u2014 no credit card, no strings attached' });
    } else if (answers.priority === 'unlimited') {
      scores.pro += 4;
      reasons.push({ plan: 'pro', text: 'Pro removes all usage limits' });
    } else if (answers.priority === 'collaboration') {
      scores.team += 4;
      reasons.push({ plan: 'team', text: 'Team features are built for collaboration' });
    }

    let best = 'free';
    if (scores.pro > scores[best]) best = 'pro';
    if (scores.team > scores[best]) best = 'team';

    const planReasons = [];
    for (var i = 0; i < reasons.length; i++) {
      if (reasons[i].plan === best) planReasons.push(reasons[i].text);
    }
    if (planReasons.length === 0) {
      planReasons.push('This plan is the best fit based on your answers');
    }

    return { plan: best, scores: scores, reasons: planReasons };
  }

  function showResult() {
    updateProgress(QUESTIONS.length);
    let prev = questionArea.querySelector('.quiz-q');
    if (prev) prev.remove();
    if (startEl) startEl.style.display = 'none';

    let result = scorePlan();
    const plan = PLANS[result.plan];

    const iconEl = document.getElementById('quizResultIcon');
    const titleEl = document.getElementById('quizResultTitle');
    const descEl = document.getElementById('quizResultDesc');
    const reasonsEl = document.getElementById('quizResultReasons');
    const ctaEl = document.getElementById('quizResultCta');

    if (iconEl) iconEl.textContent = plan.icon;
    if (titleEl) titleEl.textContent = 'We recommend: ' + plan.name;
    if (descEl) descEl.textContent = plan.desc;
    if (ctaEl) {
      ctaEl.textContent = plan.cta;
      ctaEl.className = 'quiz-result-cta ' + plan.cls;
    }

    if (reasonsEl) {
      reasonsEl.innerHTML = '';
      for (var i = 0; i < result.reasons.length; i++) {
        const li = document.createElement('li');
        li.textContent = '\u2713 ' + result.reasons[i];
        reasonsEl.appendChild(li);
      }
    }

    if (resultEl) resultEl.hidden = false;
  }

  return {
    init: init,
    reset: reset,
    showQuestion: showQuestion,
    scorePlan: scorePlan,
    _getAnswers: function () { return answers; },
    _setAnswers: function (a) { answers = a; },
    QUESTIONS: QUESTIONS,
    PLANS: PLANS
  };
})();
