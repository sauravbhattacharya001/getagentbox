// ── Scenario Planner ─────────────────────────────────────────────
var ScenarioPlanner = (function () {
  'use strict';

  var SCENARIOS = {
    "Plan a surprise birthday dinner for 8 people this Saturday": {
      phases: [
        {
          icon: '\u{1F50D}', name: 'Understand',
          status: 'Analyzing your situation...',
          steps: [
            { text: 'Key constraints: Saturday evening, 8 guests, surprise element', delay: 800 },
            { text: 'Checking stored dietary preferences for known contacts', delay: 600 },
            { text: 'Reviewing calendar for scheduling conflicts', delay: 500 },
            { text: 'Budget estimate based on past dining patterns', delay: 500 }
          ]
        },
        {
          icon: '\u{1F4CB}', name: 'Plan',
          status: 'Building action plan...',
          steps: [
            { text: 'Research restaurants with private dining for 8+', delay: 700 },
            { text: 'Draft guest list and invitation message', delay: 500 },
            { text: 'Plan cover story for the surprise', delay: 400 },
            { text: 'Create decoration & cake checklist', delay: 400 },
            { text: 'Build timeline: bookings \u2192 invites \u2192 prep \u2192 day-of', delay: 500 }
          ]
        },
        {
          icon: '\u26A1', name: 'Execute',
          status: 'Taking action...',
          steps: [
            { text: 'Searching top-rated restaurants with Saturday availability', delay: 900 },
            { text: 'Setting RSVP tracking reminders for each guest', delay: 600 },
            { text: 'Drafting personalized invitation messages', delay: 700 },
            { text: 'Creating shopping list: candles, banner, cake order', delay: 500 },
            { text: 'Scheduling reminder: confirm reservation Thursday', delay: 400 }
          ]
        },
        {
          icon: '\u{1F4CA}', name: 'Monitor',
          status: 'Watching for updates...',
          steps: [
            { text: 'Tracking RSVPs: 0/7 confirmed (auto-nudge in 48h)', delay: 600 },
            { text: 'Weather alert set for Saturday evening', delay: 400 },
            { text: 'Day-before reminder: pick up cake, confirm headcount', delay: 500 },
            { text: 'Day-of checklist: arrive early, set up, coordinate arrivals', delay: 500 }
          ]
        }
      ],
      summary: { actions: 14, timeSaved: '~3 hours', insight: 'AgentBox handled research, coordination, and reminders \u2014 you just approved the plan and showed up.' }
    },

    "I'm moving to a new city next month and need to set everything up": {
      phases: [
        {
          icon: '\u{1F50D}', name: 'Understand',
          status: 'Analyzing your situation...',
          steps: [
            { text: 'Timeline: ~30 days, need housing + utilities + logistics', delay: 800 },
            { text: 'Checking priorities: commute, budget, neighborhood vibe', delay: 600 },
            { text: 'Identifying services to transfer vs. cancel vs. set up new', delay: 600 }
          ]
        },
        {
          icon: '\u{1F4CB}', name: 'Plan',
          status: 'Building action plan...',
          steps: [
            { text: 'Housing: search strategy, application docs, viewing schedule', delay: 700 },
            { text: 'Utilities: internet, electric, water, gas \u2014 transfer timeline', delay: 500 },
            { text: 'Address changes: bank, subscriptions, DMV, mail forwarding', delay: 600 },
            { text: 'Local setup: doctors, groceries, transit routes, gym', delay: 500 }
          ]
        },
        {
          icon: '\u26A1', name: 'Execute',
          status: 'Taking action...',
          steps: [
            { text: 'Setting up housing alerts matching your criteria', delay: 800 },
            { text: 'Creating master moving checklist with weekly milestones', delay: 600 },
            { text: 'Researching neighborhoods: safety, transit, walkability scores', delay: 700 },
            { text: 'Scheduling utility activation dates for move-in day', delay: 500 },
            { text: 'Compiling address change list with direct update links', delay: 500 }
          ]
        },
        {
          icon: '\u{1F4CA}', name: 'Monitor',
          status: 'Watching for updates...',
          steps: [
            { text: 'New listing alerts: 3 matches found, 1 price drop flagged', delay: 700 },
            { text: 'Weekly milestone reminders: packing, donations, cancellations', delay: 500 },
            { text: 'Address change progress: 4/12 updated, 8 remaining', delay: 500 },
            { text: 'Move-day countdown: supplies checklist, logistics confirmed', delay: 500 }
          ]
        }
      ],
      summary: { actions: 16, timeSaved: '~5 hours', insight: 'AgentBox tracked 12 address changes, monitored housing listings, and kept your move on schedule.' }
    },

    "Prepare for a job interview at a tech company next week": {
      phases: [
        {
          icon: '\u{1F50D}', name: 'Understand',
          status: 'Analyzing your situation...',
          steps: [
            { text: 'Interview type: tech company, ~7 days to prepare', delay: 700 },
            { text: 'Assessing prep areas: technical, behavioral, company research', delay: 600 },
            { text: 'Reviewing your background for key talking points', delay: 500 }
          ]
        },
        {
          icon: '\u{1F4CB}', name: 'Plan',
          status: 'Building action plan...',
          steps: [
            { text: 'Day 1\u20132: Company deep-dive and role analysis', delay: 500 },
            { text: 'Day 3\u20134: Technical prep \u2014 coding patterns, system design', delay: 600 },
            { text: 'Day 5\u20136: Behavioral questions + mock practice', delay: 500 },
            { text: 'Day 7: Review, logistics, confidence boost', delay: 400 }
          ]
        },
        {
          icon: '\u26A1', name: 'Execute',
          status: 'Taking action...',
          steps: [
            { text: 'Searching recent company news, blog posts, and culture', delay: 800 },
            { text: 'Compiling top 15 interview questions for this role type', delay: 600 },
            { text: 'Setting daily practice reminders: morning + evening sessions', delay: 500 },
            { text: 'Planning interview day: route, outfit, documents checklist', delay: 500 },
            { text: 'Creating STAR-format answer templates for your experience', delay: 600 }
          ]
        },
        {
          icon: '\u{1F4CA}', name: 'Monitor',
          status: 'Watching for updates...',
          steps: [
            { text: 'Daily prep tracker: 2/7 days complete, on schedule', delay: 500 },
            { text: 'Practice session reminders with topic rotation', delay: 400 },
            { text: 'Day-before alert: review notes, early bedtime reminder', delay: 500 },
            { text: 'Post-interview: thank-you email reminder (send within 24h)', delay: 500 }
          ]
        }
      ],
      summary: { actions: 13, timeSaved: '~4 hours', insight: 'AgentBox structured your prep into a 7-day plan with daily reminders and research summaries.' }
    },

    "Organize a weekend camping trip for a group of friends": {
      phases: [
        {
          icon: '\u{1F50D}', name: 'Understand',
          status: 'Analyzing your situation...',
          steps: [
            { text: 'Group trip: weekend dates, multiple people, outdoor activity', delay: 700 },
            { text: 'Checking group size and experience levels from past context', delay: 600 },
            { text: 'Identifying gear needs: who has what, what to rent/buy', delay: 600 }
          ]
        },
        {
          icon: '\u{1F4CB}', name: 'Plan',
          status: 'Building action plan...',
          steps: [
            { text: 'Campsite selection: distance, amenities, availability', delay: 600 },
            { text: 'Gear inventory and shared packing list', delay: 500 },
            { text: 'Meal planning: breakfast, lunch, dinner + snacks for group', delay: 500 },
            { text: 'Activity schedule: hikes, swimming, campfire, stargazing', delay: 500 }
          ]
        },
        {
          icon: '\u26A1', name: 'Execute',
          status: 'Taking action...',
          steps: [
            { text: 'Searching campsite availability for target weekend', delay: 800 },
            { text: 'Creating shared packing checklist (assigned per person)', delay: 600 },
            { text: 'Planning meals with grocery list and cost split', delay: 600 },
            { text: 'Setting weather alerts for the camping location', delay: 400 },
            { text: 'Scheduling reminder cascade: 1 week, 3 days, day before', delay: 500 }
          ]
        },
        {
          icon: '\u{1F4CA}', name: 'Monitor',
          status: 'Watching for updates...',
          steps: [
            { text: 'Weather forecast updates: clear skies, 65\u00B0F \u2014 perfect', delay: 600 },
            { text: 'Gear checklist: 8/12 items confirmed, 4 need follow-up', delay: 500 },
            { text: 'Carpool coordination: 2 cars confirmed, routes mapped', delay: 500 },
            { text: 'Day-of: departure reminder, campsite check-in info sent', delay: 500 }
          ]
        }
      ],
      summary: { actions: 15, timeSaved: '~3.5 hours', insight: 'AgentBox coordinated gear, food, weather, and logistics so everyone just showed up ready.' }
    },

    "Launch a side project and get first 100 users": {
      phases: [
        {
          icon: '\u{1F50D}', name: 'Understand',
          status: 'Analyzing your situation...',
          steps: [
            { text: 'Goal: ship MVP and acquire first 100 users', delay: 700 },
            { text: 'Assessing scope: skills available, time budget, target audience', delay: 600 },
            { text: 'Competitive landscape: who else solves this problem?', delay: 600 }
          ]
        },
        {
          icon: '\u{1F4CB}', name: 'Plan',
          status: 'Building action plan...',
          steps: [
            { text: 'MVP feature list: core value prop only, cut everything else', delay: 600 },
            { text: 'Launch channels: ProductHunt, Reddit, Twitter, HackerNews', delay: 500 },
            { text: 'Landing page plan: hook, demo, CTA, social proof', delay: 500 },
            { text: 'Feedback loop: where to collect, how to prioritize', delay: 500 }
          ]
        },
        {
          icon: '\u26A1', name: 'Execute',
          status: 'Taking action...',
          steps: [
            { text: 'Setting up project milestones with deadlines', delay: 700 },
            { text: 'Researching competitors: features, pricing, gaps', delay: 700 },
            { text: 'Drafting launch announcement for 3 channels', delay: 600 },
            { text: 'Creating feedback form and early-access signup page', delay: 500 },
            { text: 'Scheduling launch day: posts, emails, community shares', delay: 600 }
          ]
        },
        {
          icon: '\u{1F4CA}', name: 'Monitor',
          status: 'Watching for updates...',
          steps: [
            { text: 'Milestone tracker: MVP 60% complete, on pace for launch', delay: 600 },
            { text: 'Early signup alerts: 23 emails collected pre-launch', delay: 500 },
            { text: 'Post-launch: tracking signups, feedback themes, drop-off points', delay: 600 },
            { text: 'Weekly progress review: user count, engagement, next priorities', delay: 500 }
          ]
        }
      ],
      summary: { actions: 16, timeSaved: '~6 hours', insight: 'AgentBox structured your launch into milestones, tracked signups, and kept momentum with weekly reviews.' }
    }
  };

  var GENERIC_TEMPLATES = [
    {
      phases: [
        {
          icon: '\u{1F50D}', name: 'Understand',
          status: 'Analyzing your situation...',
          steps: [
            { text: 'Breaking down your goal into key components', delay: 700 },
            { text: 'Identifying constraints: time, resources, dependencies', delay: 600 },
            { text: 'Checking stored preferences and past context', delay: 500 }
          ]
        },
        {
          icon: '\u{1F4CB}', name: 'Plan',
          status: 'Building action plan...',
          steps: [
            { text: 'Prioritizing tasks by impact and urgency', delay: 600 },
            { text: 'Creating step-by-step execution sequence', delay: 500 },
            { text: 'Setting up checkpoints and fallback options', delay: 500 },
            { text: 'Estimating time for each phase', delay: 400 }
          ]
        },
        {
          icon: '\u26A1', name: 'Execute',
          status: 'Taking action...',
          steps: [
            { text: 'Researching best approaches for your specific situation', delay: 800 },
            { text: 'Setting up reminders for each milestone', delay: 500 },
            { text: 'Creating checklists and tracking documents', delay: 600 },
            { text: 'Scheduling follow-up actions automatically', delay: 500 }
          ]
        },
        {
          icon: '\u{1F4CA}', name: 'Monitor',
          status: 'Watching for updates...',
          steps: [
            { text: 'Progress tracking: tasks completed vs. remaining', delay: 600 },
            { text: 'Proactive alerts for upcoming deadlines', delay: 500 },
            { text: 'Adjusting plan based on new information', delay: 500 },
            { text: 'Summary report when everything is done', delay: 400 }
          ]
        }
      ],
      summary: { actions: 11, timeSaved: '~2 hours', insight: 'AgentBox decomposed your goal, tracked progress, and kept everything on schedule automatically.' }
    }
  ];

  // DOMUtil.escapeHtml is provided by dom-utils.js (loaded before this module in build order)
  var escapeHtml = DOMUtil.escapeHtml;

  var running = false;
  var timers = [];

  // Cached DOM references — resolved once in init(), avoids
  // repeated getElementById calls in startPlanning/resetPlanner.
  var _els = null;

  function _getEls() {
    if (!_els) {
      _els = {
        workspace:   document.getElementById('scenarioWorkspace'),
        goal:        document.getElementById('scenarioGoal'),
        status:      document.getElementById('scenarioAgentStatus'),
        phases:      document.getElementById('scenarioPhases'),
        summary:     document.getElementById('scenarioSummary'),
        customInput: document.getElementById('scenarioCustomInput'),
        customBtn:   document.getElementById('scenarioCustomBtn'),
        resetBtn:    document.getElementById('scenarioResetBtn')
      };
    }
    return _els;
  }

  /** Schedule a timeout and register it for cleanup on reset. */
  function schedule(fn, ms) {
    var id = setTimeout(fn, ms);
    timers.push(id);
    return id;
  }

  function init() {
    var presetBtns = document.querySelectorAll('.scenario-preset-btn');
    // Eagerly resolve and cache DOM refs
    var els = _getEls();

    if (!presetBtns.length) return;

    presetBtns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        if (running) return;
        presetBtns.forEach(function (b) { b.setAttribute('aria-pressed', 'false'); });
        btn.setAttribute('aria-pressed', 'true');
        startPlanning(btn.getAttribute('data-scenario'));
      });
    });

    if (els.customBtn && els.customInput) {
      els.customBtn.addEventListener('click', function () {
        var val = els.customInput.value.trim();
        if (!val || running) return;
        presetBtns.forEach(function (b) { b.setAttribute('aria-pressed', 'false'); });
        startPlanning(val);
      });
      els.customInput.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') {
          els.customBtn.click();
        }
      });
    }

    if (els.resetBtn) {
      els.resetBtn.addEventListener('click', function () { resetPlanner(); });
    }
  }

  function getPlan(scenario) {
    if (SCENARIOS[scenario]) return SCENARIOS[scenario];
    // Return a generic template
    var tpl = GENERIC_TEMPLATES[0];
    // Personalize the understand phase first step
    var customPlan = JSON.parse(JSON.stringify(tpl));
    var shortGoal = scenario.length > 60 ? scenario.substring(0, 57) + '...' : scenario;
    customPlan.phases[0].steps[0] = { text: 'Parsing goal: "' + escapeHtml(shortGoal) + '"', delay: 800 };
    return customPlan;
  }

  function startPlanning(scenario) {
    running = true;
    clearTimers();

    var els = _getEls();

    // Reset
    els.phases.innerHTML = '';
    els.summary.hidden = true;
    els.summary.innerHTML = '';
    els.status.className = 'scenario-agent-status';
    els.workspace.hidden = false;

    var safeScenario = escapeHtml(scenario.length > 100 ? scenario.substring(0, 97) + '...' : scenario);
    els.goal.innerHTML = '\u{1F3AF} <strong>Goal:</strong> ' + safeScenario;

    var plan = getPlan(scenario);
    animatePhases(plan, els.phases, els.status, els.summary);
  }

  function animatePhases(plan, phasesEl, statusEl, summaryEl) {
    var phaseIndex = 0;

    function nextPhase() {
      if (phaseIndex >= plan.phases.length) {
        showSummary(plan.summary, statusEl, summaryEl);
        return;
      }

      var phase = plan.phases[phaseIndex];
      statusEl.textContent = '\u{1F916} ' + phase.status;

      var phaseEl = document.createElement('div');
      phaseEl.className = 'scenario-phase';
      phaseEl.innerHTML =
        '<div class="scenario-phase-header">' +
          '<span>' + phase.icon + ' ' + escapeHtml(phase.name) + '</span>' +
          '<span class="scenario-phase-status" id="phaseStatus' + phaseIndex + '">processing...</span>' +
        '</div>' +
        '<div class="scenario-phase-steps" id="phaseSteps' + phaseIndex + '"></div>';
      phasesEl.appendChild(phaseEl);

      // Trigger visibility transition
      schedule(function () { phaseEl.classList.add('visible'); }, 50);

      var stepsContainer = phaseEl.querySelector('.scenario-phase-steps');
      animateSteps(phase.steps, stepsContainer, phaseIndex, function () {
        var phaseStatusEl = document.getElementById('phaseStatus' + phaseIndex);
        if (phaseStatusEl) phaseStatusEl.textContent = '\u2705 complete';
        phaseIndex++;
        schedule(nextPhase, 500);
      });
    }

    schedule(nextPhase, 400);
  }

  function animateSteps(steps, container, phaseIdx, onDone) {
    var stepIndex = 0;

    function nextStep() {
      if (stepIndex >= steps.length) {
        if (onDone) onDone();
        return;
      }

      var step = steps[stepIndex];
      var stepEl = document.createElement('div');
      stepEl.className = 'scenario-step';
      stepEl.innerHTML =
        '<span class="scenario-step-icon pending">\u25CB</span>' +
        '<span>' + escapeHtml(step.text) + '</span>';
      container.appendChild(stepEl);

      schedule(function () { stepEl.classList.add('visible'); }, 50);

      schedule(function () {
        var icon = stepEl.querySelector('.scenario-step-icon');
        if (icon) {
          icon.textContent = '\u2713';
          icon.className = 'scenario-step-icon done';
        }
        stepIndex++;
        nextStep();
      }, step.delay);
    }

    nextStep();
  }

  function showSummary(summary, statusEl, summaryEl) {
    statusEl.textContent = '\u2705 Plan complete!';
    statusEl.className = 'scenario-agent-status done';

    summaryEl.innerHTML =
      '<div class="scenario-summary-stats">' +
        '<div class="scenario-summary-stat">' +
          '<div class="value">' + summary.actions + '</div>' +
          '<div class="label">Actions Planned</div>' +
        '</div>' +
        '<div class="scenario-summary-stat">' +
          '<div class="value">' + escapeHtml(summary.timeSaved) + '</div>' +
          '<div class="label">Time Saved</div>' +
        '</div>' +
      '</div>' +
      '<div class="scenario-summary-insight">' + escapeHtml(summary.insight) + '</div>';
    summaryEl.hidden = false;

    running = false;
  }

  function resetPlanner() {
    clearTimers();
    running = false;

    var els = _getEls();
    var presetBtns = document.querySelectorAll('.scenario-preset-btn');

    if (els.workspace) els.workspace.hidden = true;
    if (els.phases) els.phases.innerHTML = '';
    if (els.summary) { els.summary.hidden = true; els.summary.innerHTML = ''; }
    if (els.status) {
      els.status.textContent = '\u{1F916} AgentBox is thinking...';
      els.status.className = 'scenario-agent-status';
    }
    if (els.customInput) els.customInput.value = '';
    presetBtns.forEach(function (b) { b.setAttribute('aria-pressed', 'false'); });
  }

  function clearTimers() {
    timers.forEach(function (t) { clearTimeout(t); });
    timers = [];
  }

  if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', init);
  }

  return { init: init, reset: resetPlanner };
})();
