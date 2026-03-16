var SuccessStories = (function () {
  'use strict';

  const STORIES = [
    {
      id: 'story-freelancer',
      category: 'productivity',
      title: 'From 3 hours to 20 minutes: daily admin automated',
      persona: { name: 'Sarah K.', role: 'Freelance Designer', emoji: '🎨' },
      problem: 'Spent 3 hours every morning sorting emails, scheduling meetings, and updating project trackers before actual design work could start.',
      flow: [
        { type: 'problem', text: 'Sarah opens her laptop at 9 AM. She has 47 emails, 3 calendar conflicts, and overdue invoices. Design work waits until noon.' },
        { type: 'action', text: 'She tells AgentBox: "Check my morning — any fires?" The agent summarizes emails by priority, flags the calendar conflict, and drafts a follow-up for the overdue invoice.' },
        { type: 'result', text: 'By 9:20 she is designing. The agent handles the invoice reminder and reschedules the conflict. Total admin time: 20 minutes.' }
      ],
      metrics: [
        { value: '85%', label: 'less admin time' },
        { value: '2.5h', label: 'saved daily' },
        { value: '12', label: 'tasks automated' }
      ],
      highlight: { value: '85%', label: 'time saved' }
    },
    {
      id: 'story-dev-debugging',
      category: 'developer',
      title: 'Screenshot debugging: paste error, get fix',
      persona: { name: 'Marcus T.', role: 'Full-Stack Developer', emoji: '👨‍💻' },
      problem: 'Constantly context-switching between code editor and Stack Overflow to debug errors, losing flow state each time.',
      flow: [
        { type: 'problem', text: 'Marcus hits a cryptic CORS error in his React app. He has tried 3 Stack Overflow answers but none match his exact setup.' },
        { type: 'action', text: 'He screenshots the error and sends it to AgentBox. The agent reads the error, identifies the missing headers, and provides the exact nginx config fix.' },
        { type: 'result', text: 'Fixed in 2 minutes without leaving his editor. The agent remembers his stack (React + nginx + Docker) from previous conversations.' }
      ],
      metrics: [
        { value: '2min', label: 'to fix' },
        { value: '0', label: 'tabs opened' },
        { value: '100%', label: 'context retained' }
      ],
      highlight: { value: '2min', label: 'avg fix time' }
    },
    {
      id: 'story-content-creator',
      category: 'creative',
      title: 'Content calendar on autopilot',
      persona: { name: 'Priya M.', role: 'Content Creator', emoji: '✍️' },
      problem: 'Managing content across 4 platforms with different formats, schedules, and audiences. Always missing posting windows.',
      flow: [
        { type: 'problem', text: 'Priya has a great video idea but needs to plan the YouTube description, Twitter thread, Instagram caption, and LinkedIn post — each with different tone and format.' },
        { type: 'action', text: 'She describes the video concept to AgentBox and asks for cross-platform content. The agent generates all 4 versions, tailored to each platform\'s style, with relevant hashtags.' },
        { type: 'result', text: 'All content ready in 5 minutes. She sets up reminders for each platform\'s optimal posting time. Engagement up 40% from consistent posting.' }
      ],
      metrics: [
        { value: '4x', label: 'platforms covered' },
        { value: '40%', label: 'more engagement' },
        { value: '5min', label: 'content ready' }
      ],
      highlight: { value: '40%', label: 'engagement boost' }
    },
    {
      id: 'story-startup',
      category: 'business',
      title: 'Solo founder runs ops through Telegram',
      persona: { name: 'James L.', role: 'Startup Founder', emoji: '🚀' },
      problem: 'Running a 1-person startup with customer support, sales follow-ups, and market research eating into product development time.',
      flow: [
        { type: 'problem', text: 'James has 15 unanswered customer emails, 3 sales leads going cold, and a competitor just launched a new feature. He has 8 hours of coding planned.' },
        { type: 'action', text: 'He asks AgentBox to draft customer replies, summarize the competitor launch, and research the sales leads\' companies. Everything happens over Telegram between coding sessions.' },
        { type: 'result', text: 'All customer emails answered by lunch. Competitor analysis ready for the team meeting. Sales leads get personalized follow-ups. James codes for 6 uninterrupted hours.' }
      ],
      metrics: [
        { value: '6h', label: 'deep work' },
        { value: '15', label: 'emails handled' },
        { value: '$0', label: 'extra tools' }
      ],
      highlight: { value: '6h', label: 'focus time' }
    },
    {
      id: 'story-researcher',
      category: 'productivity',
      title: 'Literature review in 1 day instead of 2 weeks',
      persona: { name: 'Dr. Anika R.', role: 'PhD Researcher', emoji: '🔬' },
      problem: 'Needed to review 50+ papers for a grant proposal with a tight deadline. Manual reading and note-taking would take 2 weeks.',
      flow: [
        { type: 'problem', text: 'Anika has 53 papers to review for her grant proposal. The deadline is in 5 days and she has not started the literature review section.' },
        { type: 'action', text: 'She shares paper abstracts and key sections with AgentBox, asking for summaries, methodology comparisons, and gap analysis. The agent maintains context across all 53 papers.' },
        { type: 'result', text: 'Complete literature review draft in 1 day. The agent identified 3 research gaps she had missed. Proposal submitted 2 days early.' }
      ],
      metrics: [
        { value: '53', label: 'papers reviewed' },
        { value: '1 day', label: 'vs 2 weeks' },
        { value: '3', label: 'gaps found' }
      ],
      highlight: { value: '93%', label: 'time saved' }
    },
    {
      id: 'story-devops',
      category: 'developer',
      title: 'Incident response at 3 AM — from bed',
      persona: { name: 'Chen W.', role: 'DevOps Engineer', emoji: '🛠️' },
      problem: 'On-call alerts at odd hours require opening laptops, VPNing in, and running diagnostic commands. Response time suffers.',
      flow: [
        { type: 'problem', text: 'Chen gets a PagerDuty alert at 3 AM: API latency spike. Normally he would need to open his laptop, connect to VPN, and SSH into the monitoring stack.' },
        { type: 'action', text: 'He messages AgentBox from bed: "API latency alert — what do the last 30 min of metrics look like?" The agent searches his runbook and provides diagnostic steps with pre-formatted commands.' },
        { type: 'result', text: 'Root cause identified (database connection pool exhaustion) and fix command ready — all from his phone. Total time: 8 minutes. Back to sleep by 3:10 AM.' }
      ],
      metrics: [
        { value: '8min', label: 'to resolve' },
        { value: '0', label: 'laptops opened' },
        { value: '3AM', label: 'handled from bed' }
      ],
      highlight: { value: '8min', label: 'resolution' }
    }
  ];

  let _activeFilter = 'all';

  function init() {
    let grid = document.getElementById('storiesGrid');
    if (!grid) return;

    renderCards(grid);
    bindFilters();
  }

  function renderCards(grid) {
    grid.innerHTML = '';
    STORIES.forEach(function (story) {
      const card = document.createElement('div');
      card.className = 'story-card';
      card.setAttribute('role', 'listitem');
      card.setAttribute('data-category', story.category);
      card.setAttribute('data-id', story.id);
      card.setAttribute('tabindex', '0');
      card.setAttribute('aria-expanded', 'false');

      card.innerHTML =
        '<div class="story-card-header">' +
          '<span class="story-category-badge" data-cat="' + story.category + '">' + story.category + '</span>' +
          '<div class="story-card-title">' + escapeHtml(story.title) + '</div>' +
          '<div class="story-card-persona">' +
            '<span class="story-persona-avatar">' + story.persona.emoji + '</span>' +
            '<span>' + escapeHtml(story.persona.name) + ' · ' + escapeHtml(story.persona.role) + '</span>' +
          '</div>' +
        '</div>' +
        '<p class="story-card-problem">' + escapeHtml(story.problem) + '</p>' +
        '<div class="story-card-footer">' +
          '<div class="story-metric">' +
            '<span class="story-metric-value">' + escapeHtml(story.highlight.value) + '</span> ' +
            '<span class="story-metric-label">' + escapeHtml(story.highlight.label) + '</span>' +
          '</div>' +
          '<span class="story-expand-icon" aria-hidden="true">▼</span>' +
        '</div>' +
        '<div class="story-detail">' +
          '<div class="story-detail-inner">' +
            renderFlow(story.flow) +
            renderOutcomeStats(story.metrics) +
          '</div>' +
        '</div>';

      card.addEventListener('click', function () { toggleCard(card); });
      card.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleCard(card); }
      });

      grid.appendChild(card);
    });
  }

  function renderFlow(steps) {
    let html = '<div class="story-flow">';
    const icons = { problem: '❌', action: '🤖', result: '✅' };
    const dotClass = { problem: 'step-problem', action: 'step-action', result: 'step-result' };
    const labelClass = { problem: 'label-problem', action: 'label-action', result: 'label-result' };
    const labels = { problem: 'The Problem', action: 'AgentBox Steps In', result: 'The Result' };

    steps.forEach(function (step) {
      html +=
        '<div class="story-flow-step">' +
          '<div class="story-flow-dot ' + dotClass[step.type] + '">' + icons[step.type] + '</div>' +
          '<div class="story-flow-line"></div>' +
          '<div class="story-flow-content">' +
            '<div class="story-flow-label ' + labelClass[step.type] + '">' + labels[step.type] + '</div>' +
            '<div class="story-flow-text">' + escapeHtml(step.text) + '</div>' +
          '</div>' +
        '</div>';
    });
    html += '</div>';
    return html;
  }

  function renderOutcomeStats(metrics) {
    let html = '<div class="story-outcome-stats">';
    metrics.forEach(function (m) {
      html +=
        '<div class="story-outcome-stat">' +
          '<div class="story-outcome-number">' + escapeHtml(m.value) + '</div>' +
          '<div class="story-outcome-desc">' + escapeHtml(m.label) + '</div>' +
        '</div>';
    });
    html += '</div>';
    return html;
  }

  function toggleCard(card) {
    const expanded = card.classList.contains('story-expanded');
    // Close all others
    const cards = document.querySelectorAll('.story-card.story-expanded');
    for (var i = 0; i < cards.length; i++) {
      cards[i].classList.remove('story-expanded');
      cards[i].setAttribute('aria-expanded', 'false');
    }
    if (!expanded) {
      card.classList.add('story-expanded');
      card.setAttribute('aria-expanded', 'true');
    }
  }

  function bindFilters() {
    const buttons = document.querySelectorAll('.stories-filter');
    for (var i = 0; i < buttons.length; i++) {
      buttons[i].addEventListener('click', function () {
        let cat = this.getAttribute('data-category');
        _activeFilter = cat;

        // Update active state
        const all = document.querySelectorAll('.stories-filter');
        for (var j = 0; j < all.length; j++) {
          all[j].classList.remove('active');
          all[j].setAttribute('aria-selected', 'false');
        }
        this.classList.add('active');
        this.setAttribute('aria-selected', 'true');

        filterCards(cat);
      });
    }
  }

  function filterCards(category) {
    const cards = document.querySelectorAll('.story-card');
    for (var i = 0; i < cards.length; i++) {
      const cardCat = cards[i].getAttribute('data-category');
      if (category === 'all' || cardCat === category) {
        cards[i].classList.remove('story-hidden');
      } else {
        cards[i].classList.add('story-hidden');
        cards[i].classList.remove('story-expanded');
        cards[i].setAttribute('aria-expanded', 'false');
      }
    }
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
  }

  function getStories() { return STORIES.slice(); }
  function getActiveFilter() { return _activeFilter; }

  return { init: init, getStories: getStories, getActiveFilter: getActiveFilter, STORIES: STORIES };
})();
