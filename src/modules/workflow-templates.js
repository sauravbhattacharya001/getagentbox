
// ---------------------------------------------------------------------------
// Workflow Templates — Ready-to-use automation recipes
// ---------------------------------------------------------------------------
var WorkflowTemplates = (function () {
  'use strict';

  const TEMPLATES = [
    {
      id: 'daily-briefing',
      title: 'Daily Briefing',
      icon: '\u2615',
      category: 'productivity',
      description: 'Get a personalized morning briefing with weather, calendar events, and top news — delivered to Telegram every day.',
      steps: [
        'Agent checks your local weather forecast',
        'Pulls today\'s calendar events and reminders',
        'Summarizes top 3 news headlines for your interests',
        'Sends a single concise morning message'
      ],
      setup: '/remind every day at 8am: Give me a morning briefing with weather in Seattle, my calendar, and top tech news',
      tags: ['morning', 'weather', 'news', 'calendar'],
      difficulty: 'easy'
    },
    {
      id: 'expense-tracker',
      title: 'Expense Tracker',
      icon: '\uD83D\uDCB0',
      category: 'finance',
      description: 'Log expenses by text or photo. Get weekly summaries with category breakdowns and budget warnings.',
      steps: [
        'Send a message like "Coffee $4.50" or snap a receipt photo',
        'Agent categorizes and stores the expense',
        'Ask "How much did I spend this week?" anytime',
        'Get a weekly summary every Sunday with charts'
      ],
      setup: '/remind every Sunday at 8pm: Summarize my expenses this week by category and tell me if I\'m over budget',
      tags: ['money', 'budget', 'receipts', 'tracking'],
      difficulty: 'easy'
    },
    {
      id: 'research-assistant',
      title: 'Research Assistant',
      icon: '\uD83D\uDD0D',
      category: 'productivity',
      description: 'Delegate web research tasks. Agent searches, compiles findings, and saves structured notes you can reference later.',
      steps: [
        'Ask a research question or topic',
        'Agent searches multiple sources on the web',
        'Compiles key findings with source links',
        'Remembers the research for future conversations'
      ],
      setup: 'Research the best noise-cancelling headphones under $300. Compare at least 5 models on sound quality, ANC, battery, and comfort.',
      tags: ['search', 'analysis', 'comparison', 'notes'],
      difficulty: 'easy'
    },
    {
      id: 'code-reviewer',
      title: 'Code Review Bot',
      icon: '\uD83D\uDCBB',
      category: 'development',
      description: 'Send code snippets or screenshots for instant review. Catches bugs, suggests improvements, and explains concepts.',
      steps: [
        'Paste code or send a screenshot of your editor',
        'Agent analyzes for bugs, style, and performance',
        'Returns specific suggestions with explanations',
        'Remembers your tech stack for contextual advice'
      ],
      setup: 'Review this code for bugs, performance issues, and best practices:\n\n```python\ndef process(data):\n  results = []\n  for item in data:\n    if item not in results:\n      results.append(item)\n  return results\n```',
      tags: ['coding', 'debugging', 'review', 'python'],
      difficulty: 'medium'
    },
    {
      id: 'meeting-prep',
      title: 'Meeting Prep',
      icon: '\uD83D\uDCC5',
      category: 'productivity',
      description: 'Before any meeting, get a briefing with attendee context, agenda summary, and suggested talking points.',
      steps: [
        'Tell the agent about your upcoming meeting',
        'Agent recalls past context about attendees and topics',
        'Generates agenda summary and talking points',
        'Sends a prep brief 15 minutes before the meeting'
      ],
      setup: '/remind 15 min before my next meeting: Prepare a brief with talking points, open action items, and any context you remember about the attendees',
      tags: ['meetings', 'preparation', 'calendar', 'context'],
      difficulty: 'medium'
    },
    {
      id: 'habit-tracker',
      title: 'Habit Tracker',
      icon: '\u2705',
      category: 'health',
      description: 'Track daily habits with natural language. Get streak reports, gentle nudges, and weekly progress summaries.',
      steps: [
        'Tell the agent your habits: "I want to track meditation, exercise, and reading"',
        'Check in naturally: "Did 20 min meditation and a 5k run today"',
        'Agent tracks streaks and sends evening check-ins',
        'Weekly progress report with streak counts and trends'
      ],
      setup: '/remind every day at 9pm: Check in on my habits. Ask what I did today for meditation, exercise, and reading. Track my streaks.',
      tags: ['habits', 'streaks', 'health', 'accountability'],
      difficulty: 'easy'
    },
    {
      id: 'content-curator',
      title: 'Content Curator',
      icon: '\uD83D\uDCF0',
      category: 'productivity',
      description: 'Agent monitors topics you care about and sends curated digests with the most relevant articles and discussions.',
      steps: [
        'Define your interests: "AI safety, Rust programming, indie games"',
        'Agent searches for fresh content daily',
        'Filters out noise, keeps only high-quality pieces',
        'Sends a digest with summaries and links'
      ],
      setup: '/remind every day at 12pm: Find the 5 most interesting articles from today about AI safety and Rust programming. Include a 2-sentence summary for each.',
      tags: ['news', 'curation', 'digest', 'reading'],
      difficulty: 'easy'
    },
    {
      id: 'workout-planner',
      title: 'Workout Planner',
      icon: '\uD83C\uDFCB\uFE0F',
      category: 'health',
      description: 'Get personalized workout suggestions based on your equipment, fitness level, and schedule. Agent remembers your preferences.',
      steps: [
        'Tell the agent your fitness goals and available equipment',
        'Request a workout: "Give me a 30-min upper body routine"',
        'Agent creates a structured plan with sets and reps',
        'Remembers what you did last time to vary exercises'
      ],
      setup: 'I have dumbbells (5-40 lbs), a pull-up bar, and a yoga mat. I can work out 4 days a week for 30-45 minutes. Create a weekly plan for muscle building.',
      tags: ['fitness', 'exercise', 'planning', 'health'],
      difficulty: 'easy'
    },
    {
      id: 'price-watcher',
      title: 'Price Watcher',
      icon: '\uD83D\uDCCA',
      category: 'finance',
      description: 'Monitor product prices and get notified when they drop. Agent checks periodically and alerts you on deals.',
      steps: [
        'Share a product link or name with target price',
        'Agent checks the current price periodically',
        'Sends an alert when the price drops below your target',
        'Tracks price history so you can see trends'
      ],
      setup: '/remind every day at 10am: Check if the Sony WH-1000XM5 headphones are below $280 on Amazon. If yes, send me a price alert with the link.',
      tags: ['shopping', 'deals', 'monitoring', 'alerts'],
      difficulty: 'medium'
    },
    {
      id: 'language-tutor',
      title: 'Language Tutor',
      icon: '\uD83C\uDF0D',
      category: 'learning',
      description: 'Practice a new language with daily vocabulary, conversation drills, and grammar corrections in natural chat.',
      steps: [
        'Tell the agent which language and your level',
        'Get daily vocabulary words with example sentences',
        'Practice conversations — agent corrects your grammar',
        'Weekly quiz on words you\'ve learned'
      ],
      setup: '/remind every day at 7am: Teach me 5 new Spanish words with example sentences. Include pronunciation tips. Quiz me on yesterday\'s words first.',
      tags: ['languages', 'vocabulary', 'practice', 'education'],
      difficulty: 'easy'
    },
    {
      id: 'standup-bot',
      title: 'Standup Reporter',
      icon: '\uD83D\uDCE2',
      category: 'development',
      description: 'Agent asks for your daily standup updates, formats them, and keeps a searchable log you can reference in retros.',
      steps: [
        'Agent asks: "What did you do yesterday? What\'s the plan today? Any blockers?"',
        'You reply in natural language',
        'Agent formats it into a clean standup report',
        'Searchable history: "What was I working on last Tuesday?"'
      ],
      setup: '/remind every weekday at 9:30am: Ask me for my standup update. Format it as Yesterday/Today/Blockers. Save it so I can search later.',
      tags: ['standup', 'agile', 'team', 'reporting'],
      difficulty: 'easy'
    },
    {
      id: 'meal-planner',
      title: 'Meal Planner',
      icon: '\uD83C\uDF73',
      category: 'health',
      description: 'Get personalized meal suggestions based on dietary preferences, ingredients on hand, and nutritional goals.',
      steps: [
        'Set dietary preferences: "vegetarian, high protein, under 600 cal"',
        'Ask for meal ideas or send a photo of your fridge',
        'Agent suggests recipes with step-by-step instructions',
        'Generates a weekly grocery list on demand'
      ],
      setup: 'I\'m vegetarian and trying to eat 120g protein daily. Suggest 3 easy dinner recipes I can make in under 30 minutes with common ingredients.',
      tags: ['cooking', 'nutrition', 'recipes', 'diet'],
      difficulty: 'easy'
    }
  ];

  const CATEGORIES = [
    { id: 'all', label: 'All' },
    { id: 'productivity', label: '\uD83D\uDCBC Productivity' },
    { id: 'development', label: '\uD83D\uDCBB Development' },
    { id: 'finance', label: '\uD83D\uDCB0 Finance' },
    { id: 'health', label: '\uD83C\uDFCB\uFE0F Health' },
    { id: 'learning', label: '\uD83C\uDF0D Learning' }
  ];

  let _currentCategory = 'all';
  let _gridEl = null;
  let _detailEl = null;
  let _filterContainer = null;

  /**
   * Pre-bucketed view of TEMPLATES, keyed by category id.
   * Built once in init() so _renderGrid()/getByCategory() avoid an O(n)
   * .filter() walk on every category click (the previous implementation
   * scanned every template on every filter change). Each bucket stores a
   * frozen reference into TEMPLATES; callers that mutate the result
   * (getByCategory) get a .slice() copy.
   */
  let _byCategory = null;

  function _buildCategoryIndex() {
    if (_byCategory) return;
    _byCategory = Object.create(null);
    // Seed every declared category (incl. ones with zero templates) so
    // getByCategory('health') etc. is a single lookup, never a .filter().
    for (var c = 0; c < CATEGORIES.length; c++) {
      if (CATEGORIES[c].id === 'all') continue;
      _byCategory[CATEGORIES[c].id] = [];
    }
    for (var i = 0; i < TEMPLATES.length; i++) {
      var cat = TEMPLATES[i].category;
      if (!_byCategory[cat]) _byCategory[cat] = [];
      _byCategory[cat].push(TEMPLATES[i]);
    }
  }

  function init() {
    _gridEl = document.getElementById('workflowGrid');
    _detailEl = document.getElementById('workflowDetail');
    _filterContainer = document.querySelector('.workflow-filter');
    if (!_gridEl) return;

    _buildCategoryIndex();
    _buildFilterButtons();
    _renderGrid();
    _bindDetailClose();
    _bindCopy();
  }

  function _buildFilterButtons() {
    if (!_filterContainer) return;
    // Clear existing buttons (the HTML has the "All" button as a placeholder)
    while (_filterContainer.firstChild) {
      _filterContainer.removeChild(_filterContainer.firstChild);
    }
    for (var i = 0; i < CATEGORIES.length; i++) {
      let cat = CATEGORIES[i];
      let btn = document.createElement('button');
      btn.className = 'workflow-filter-btn' + (cat.id === 'all' ? ' active' : '');
      btn.setAttribute('role', 'tab');
      btn.setAttribute('aria-selected', cat.id === 'all' ? 'true' : 'false');
      btn.dataset.wfCat = cat.id;
      btn.textContent = cat.label;
      btn.addEventListener('click', _onFilterClick);
      _filterContainer.appendChild(btn);
    }
  }

  function _onFilterClick(e) {
    let cat = e.target.dataset.wfCat;
    if (!cat || cat === _currentCategory) return;
    filterBy(cat);
  }

  function filterBy(category) {
    _currentCategory = category;
    // Update button states
    const btns = _filterContainer.querySelectorAll('.workflow-filter-btn');
    for (var i = 0; i < btns.length; i++) {
      let isActive = btns[i].dataset.wfCat === category;
      btns[i].classList.toggle('active', isActive);
      btns[i].setAttribute('aria-selected', isActive ? 'true' : 'false');
    }
    _renderGrid();
    // Hide detail panel when switching categories
    if (_detailEl) _detailEl.hidden = true;
  }

  function _renderGrid() {
    if (!_gridEl) return;
    while (_gridEl.firstChild) _gridEl.removeChild(_gridEl.firstChild);

    // O(1) lookup via the pre-built category index instead of an O(n)
    // .filter() on every filter-button click.
    let filtered;
    if (_currentCategory === 'all') {
      filtered = TEMPLATES;
    } else {
      _buildCategoryIndex();
      filtered = _byCategory[_currentCategory] || [];
    }

    // Batch DOM writes through a DocumentFragment so the grid sees a single
    // reflow at the end instead of one per card. Falls back to direct
    // appendChild if DocumentFragment is somehow unavailable (very old
    // jsdom test envs).
    if (typeof document.createDocumentFragment === 'function') {
      var frag = document.createDocumentFragment();
      for (var i = 0; i < filtered.length; i++) {
        frag.appendChild(_createCard(filtered[i]));
      }
      _gridEl.appendChild(frag);
    } else {
      for (var j = 0; j < filtered.length; j++) {
        _gridEl.appendChild(_createCard(filtered[j]));
      }
    }
  }

  function _createCard(template) {
    const card = document.createElement('div');
    card.className = 'workflow-card';
    card.setAttribute('role', 'listitem');
    card.dataset.wfId = template.id;
    card.tabIndex = 0;

    let icon = document.createElement('div');
    icon.className = 'workflow-card-icon';
    icon.textContent = template.icon;
    card.appendChild(icon);

    const title = document.createElement('h4');
    title.className = 'workflow-card-title';
    title.textContent = template.title;
    card.appendChild(title);

    const desc = document.createElement('p');
    desc.className = 'workflow-card-desc';
    desc.textContent = template.description;
    card.appendChild(desc);

    const meta = document.createElement('div');
    meta.className = 'workflow-card-meta';

    const diffBadge = document.createElement('span');
    diffBadge.className = 'workflow-difficulty workflow-difficulty-' + template.difficulty;
    diffBadge.textContent = template.difficulty;
    meta.appendChild(diffBadge);

    const catBadge = document.createElement('span');
    catBadge.className = 'workflow-category-badge';
    catBadge.textContent = template.category;
    meta.appendChild(catBadge);

    card.appendChild(meta);

    card.addEventListener('click', function () {
      _showDetail(template);
    });
    card.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        _showDetail(template);
      }
    });

    return card;
  }

  function _showDetail(template) {
    if (!_detailEl) return;

    const titleEl = document.getElementById('workflowDetailTitle');
    const descEl = document.getElementById('workflowDetailDesc');
    const stepsEl = document.getElementById('workflowSteps');
    const codeEl = document.getElementById('workflowSetupCode');
    const tagsEl = document.getElementById('workflowTags');

    if (titleEl) titleEl.textContent = template.icon + ' ' + template.title;
    if (descEl) descEl.textContent = template.description;

    if (stepsEl) {
      while (stepsEl.firstChild) stepsEl.removeChild(stepsEl.firstChild);
      const ol = document.createElement('ol');
      ol.className = 'workflow-steps-list';
      for (var i = 0; i < template.steps.length; i++) {
        const li = document.createElement('li');
        li.textContent = template.steps[i];
        ol.appendChild(li);
      }
      stepsEl.appendChild(ol);
    }

    if (codeEl) codeEl.textContent = template.setup;

    if (tagsEl) {
      while (tagsEl.firstChild) tagsEl.removeChild(tagsEl.firstChild);
      for (var j = 0; j < template.tags.length; j++) {
        const tag = document.createElement('span');
        tag.className = 'workflow-tag';
        tag.textContent = '#' + template.tags[j];
        tagsEl.appendChild(tag);
      }
    }

    _detailEl.hidden = false;
    if (_detailEl.scrollIntoView) _detailEl.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth', block: 'nearest' });
  }

  function _bindDetailClose() {
    let closeBtn = document.getElementById('workflowDetailClose');
    if (closeBtn) {
      closeBtn.addEventListener('click', function () {
        if (_detailEl) _detailEl.hidden = true;
      });
    }
  }

  function _bindCopy() {
    const copyBtn = document.getElementById('workflowCopyBtn');
    if (copyBtn) {
      copyBtn.addEventListener('click', function () {
        const codeEl = document.getElementById('workflowSetupCode');
        if (!codeEl) return;
        let text = codeEl.textContent;
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(text);
        }
        copyBtn.textContent = '\u2705 Copied!';
        setTimeout(function () { copyBtn.textContent = '\uD83D\uDCCB Copy'; }, 2000);
      });
    }
  }

  function getTemplates() { return TEMPLATES.slice(); }
  function getCategories() { return CATEGORIES.slice(); }
  function getCurrent() { return _currentCategory; }

  function getByCategory(category) {
    if (category === 'all') return TEMPLATES.slice();
    _buildCategoryIndex();
    var bucket = _byCategory[category];
    return bucket ? bucket.slice() : [];
  }

  function getById(id) {
    for (var i = 0; i < TEMPLATES.length; i++) {
      if (TEMPLATES[i].id === id) return TEMPLATES[i];
    }
    return null;
  }

  return {
    init: init,
    filterBy: filterBy,
    getTemplates: getTemplates,
    getCategories: getCategories,
    getCurrent: getCurrent,
    getByCategory: getByCategory,
    getById: getById,
    TEMPLATES: TEMPLATES,
    CATEGORIES: CATEGORIES
  };
})();
