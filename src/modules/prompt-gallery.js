
// ---------------------------------------------------------------------------
// Prompt Gallery — searchable/filterable example prompts with response modal
// ---------------------------------------------------------------------------
var PromptGallery = (function () {
  const PROMPTS = [
    {
      category: "productivity",
      icon: "\u26a1",
      prompt: "Remind me to call the dentist tomorrow at 9am",
      response: "Done! I\u2019ll remind you tomorrow at 9:00 AM to call the dentist. \u23f0\n\nWant me to also draft a message you can send them, or look up their number?"
    },
    {
      category: "productivity",
      icon: "\u26a1",
      prompt: "Summarize my last 3 conversations with you",
      response: "Here\u2019s a quick recap:\n\n1. Yesterday \u2014 You asked about flight options to NYC for March. I found Delta and JetBlue options under $250.\n\n2. Monday \u2014 We worked through your grocery list and I suggested a meal plan for the week.\n\n3. Last Friday \u2014 You asked me to explain async/await in JavaScript. I gave you examples with fetch() and error handling.\n\nWant me to dig deeper into any of these?"
    },
    {
      category: "productivity",
      icon: "\u26a1",
      prompt: "What\u2019s on my plate this week?",
      response: "Based on what you\u2019ve told me:\n\n\ud83d\udcc5 Tuesday \u2014 Dentist appointment at 2pm\n\ud83d\udcc5 Wednesday \u2014 Team standup moved to 10am\n\ud83d\udcc5 Thursday \u2014 Gym (you said you wanted to go 3x this week)\n\ud83d\udcc5 Friday \u2014 Dinner with Sam at 7pm\n\nYou also mentioned wanting to finish that blog post. Want me to set a reminder for that?"
    },
    {
      category: "learning",
      icon: "\ud83d\udcda",
      prompt: "Explain quantum computing like I\u2019m 10",
      response: "Imagine you have a coin. A normal computer looks at it and says \"heads\" or \"tails\" \u2014 one or the other.\n\nA quantum computer can look at the coin while it\u2019s still spinning! It sees heads AND tails at the same time. \ud83e\udea9\n\nThis means it can try lots of answers at once instead of one at a time. That\u2019s why it can solve really hard puzzles way faster than a regular computer.\n\nWant me to go deeper, or is that the right level?"
    },
    {
      category: "learning",
      icon: "\ud83d\udcda",
      prompt: "What\u2019s the difference between TCP and UDP?",
      response: "Think of it like mail:\n\n\ud83d\udce6 TCP = Certified mail. You send it, the other side confirms they got it, and if anything\u2019s missing, it gets resent. Reliable but slower.\n\n\u2709\ufe0f UDP = Postcards. You toss them out fast with no confirmation. Some might get lost, but it\u2019s way quicker.\n\nUse TCP for: web pages, file downloads, email\nUse UDP for: video calls, gaming, live streaming\n\nThe trade-off is always reliability vs speed."
    },
    {
      category: "learning",
      icon: "\ud83d\udcda",
      prompt: "Recommend a book about behavioral economics",
      response: "Top pick: \"Thinking, Fast and Slow\" by Daniel Kahneman \ud83e\udde0\n\nIt covers how we make decisions using two systems \u2014 fast intuition vs. slow deliberation. Tons of real experiments and surprising findings about human bias.\n\nAlso great:\n\u2022 \"Nudge\" by Thaler & Sunstein \u2014 more practical/policy-focused\n\u2022 \"Predictably Irrational\" by Dan Ariely \u2014 shorter, more fun examples\n\nWant a summary of any of these, or should I find audiobook options?"
    },
    {
      category: "coding",
      icon: "\ud83d\udcbb",
      prompt: "Write a Python function to flatten nested lists",
      response: "Here you go:\n\ndef flatten(lst):\n    result = []\n    for item in lst:\n        if isinstance(item, list):\n            result.extend(flatten(item))\n        else:\n            result.append(item)\n    return result\n\n# Example:\nflatten([1, [2, [3, 4]], [5, 6]])\n# \u2192 [1, 2, 3, 4, 5, 6]\n\nThis handles any depth of nesting recursively. Want an iterative version, or should I add type hints?"
    },
    {
      category: "coding",
      icon: "\ud83d\udcbb",
      prompt: "Why is my API returning 403?",
      response: "A 403 means the server understood your request but refuses to authorize it. Common causes:\n\n1. \ud83d\udd11 Missing or expired API key/token\n2. \ud83d\udeab Wrong permissions \u2014 your token might not have the right scopes\n3. \ud83c\udf10 CORS issue \u2014 if calling from a browser, the server might block your origin\n4. \ud83d\udee1\ufe0f Rate limiting \u2014 some APIs return 403 instead of 429\n5. \ud83d\udc64 IP allowlist \u2014 your IP might not be whitelisted\n\nCan you share the endpoint and headers (redact secrets)? I can help narrow it down."
    },
    {
      category: "coding",
      icon: "\ud83d\udcbb",
      prompt: "What\u2019s the best way to handle errors in async JavaScript?",
      response: "Use try/catch with async/await \u2014 it\u2019s the cleanest pattern:\n\nasync function fetchUser(id) {\n  try {\n    const res = await fetch('/api/users/' + id);\n    if (!res.ok) throw new Error('HTTP ' + res.status);\n    return await res.json();\n  } catch (err) {\n    console.error('Failed to fetch user:', err.message);\n    return null;\n  }\n}\n\nPro tips:\n\u2022 Always check res.ok \u2014 fetch doesn\u2019t throw on 4xx/5xx\n\u2022 Use Error subclasses for different error types\n\u2022 Add a global unhandledrejection listener as a safety net"
    },
    {
      category: "creative",
      icon: "\ud83c\udfa8",
      prompt: "Write a haiku about debugging",
      response: "It works on my box\nProduction burns at midnight\nConsole dot log saves \ud83d\udd25\n\nWant another one? I can also do limericks, sonnets, or a dramatic monologue about a segfault."
    },
    {
      category: "creative",
      icon: "\ud83c\udfa8",
      prompt: "Give me a name for my startup that makes AI planners",
      response: "Here are some ideas:\n\n\ud83c\udfaf Clean & Modern:\n\u2022 Planwise \u2014 simple, says what it does\n\u2022 Driftless \u2014 suggests staying on track\n\u2022 Cadence AI \u2014 rhythm and structure\n\n\ud83d\ude80 Bold & Techy:\n\u2022 NeuralDay \u2014 AI + daily planning\n\u2022 Orchestr8 \u2014 playful, memorable\n\u2022 Autopilot \u2014 already well-known word, strong brand\n\n\ud83c\udf3f Calm & Approachable:\n\u2022 Clearpath \u2014 friendly, goal-oriented\n\u2022 Tempo \u2014 minimal, musical\n\u2022 Morningside AI \u2014 fresh start vibes\n\nWhich direction resonates? I can riff on any of these."
    },
    {
      category: "creative",
      icon: "\ud83c\udfa8",
      prompt: "Help me write a thank-you note to my mentor",
      response: "Here\u2019s a draft:\n\n\"Hi [Name],\n\nI wanted to take a moment to say thank you. Your guidance over the past [time] has genuinely shaped how I think about [topic/career]. The way you [specific thing they did] made a real difference.\n\nI don\u2019t take that for granted. Thank you for investing in me.\n\nWarmly,\n[Your name]\"\n\nWant me to adjust the tone (more formal/casual) or add specific details?"
    },
    {
      category: "daily",
      icon: "\u2600\ufe0f",
      prompt: "What\u2019s the weather like in Seattle today?",
      response: "\ud83c\udf27\ufe0f Seattle today:\n\n\u2022 Currently: 48\u00b0F (9\u00b0C), light rain\n\u2022 High: 52\u00b0F | Low: 41\u00b0F\n\u2022 Wind: 12 mph SW\n\u2022 Rain chance: 80% through afternoon, clearing by evening\n\nYou might want a jacket and umbrella if you\u2019re heading out before 5pm. Tomorrow looks drier \u2014 partly cloudy, high of 55\u00b0F.\n\nWant the full week forecast?"
    },
    {
      category: "daily",
      icon: "\u2600\ufe0f",
      prompt: "What\u2019s a quick healthy dinner I can make in 20 minutes?",
      response: "How about a Mediterranean chickpea bowl? \ud83e\udd66\n\n\ud83d\udc68\u200d\ud83c\udf73 Ingredients:\n\u2022 1 can chickpeas (drained)\n\u2022 Cherry tomatoes, cucumber, red onion\n\u2022 Feta cheese, olives\n\u2022 Olive oil + lemon juice + garlic\n\u2022 Serve over rice or greens\n\n\u23f1\ufe0f Steps (15 min):\n1. Warm chickpeas in a pan with olive oil, paprika, cumin\n2. Chop veggies while they cook\n3. Toss everything in a bowl, squeeze lemon, crumble feta\n\n~450 calories, high protein, zero stress. Want me to adjust for any dietary preferences?"
    },
    {
      category: "daily",
      icon: "\u2600\ufe0f",
      prompt: "Help me decide: should I take an Uber or the bus?",
      response: "Let\u2019s break it down:\n\n\ud83d\ude95 Uber:\n\u2022 ~$12\u201318 depending on surge\n\u2022 Door to door, ~15 min\n\u2022 Good if you\u2019re running late or carrying stuff\n\n\ud83d\ude8c Bus:\n\u2022 $2.75 flat\n\u2022 ~35 min including walking + wait\n\u2022 Good if you\u2019re not in a rush\n\n\ud83e\udd14 My take: If you\u2019re within 10 min of your departure, take the bus and save $15. If you\u2019re already running behind, Uber\u2019s worth it for the peace of mind.\n\nWhere are you headed? I can check real-time transit."
    }
  ];

  let grid = null;
  let searchInput = null;
  let emptyState = null;
  let modal = null;
  let modalBackdrop = null;
  let modalCloseBtn = null;
  let modalQuestion = null;
  let modalAnswer = null;
  let filterBtns = null;
  let activeCategory = 'all';

  /** Pre-created card elements — one per PROMPTS entry, created once in init. */
  let cardPool = [];
  /** Pre-lowercased search text for each prompt (prompt + response), avoids
   *  repeated toLowerCase() on every keystroke. */
  const searchIndex = [];

  function escapeHtml(str) {
    const d = document.createElement('div');
    d.textContent = str;
    return d.innerHTML;
  }

  /** Build the card pool once. Cards are shown/hidden instead of recreated. */
  function buildCardPool() {
    if (cardPool.length > 0) return; // already built
    for (var i = 0; i < PROMPTS.length; i++) {
      const p = PROMPTS[i];
      const card = document.createElement('div');
      card.className = 'prompt-card';
      card.setAttribute('role', 'listitem');
      card.setAttribute('tabindex', '0');
      card.dataset.category = p.category;
      card.dataset.index = i;
      card.innerHTML =
        '<div class="prompt-card-category">' + p.icon + ' ' + p.category + '</div>' +
        '<div class="prompt-card-text">\u201c' + escapeHtml(p.prompt) + '\u201d</div>' +
        '<div class="prompt-card-hint">Tap to see response \u2192</div>';
      (function (prompt) {
        card.addEventListener('click', function () { openModal(prompt); });
        card.addEventListener('keydown', function (e) {
          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openModal(prompt); }
        });
      })(p);
      cardPool.push(card);
      grid.appendChild(card);
      // Pre-lowercase for search — avoids repeated toLowerCase per keystroke
      searchIndex.push(p.prompt.toLowerCase() + ' ' + p.response.toLowerCase());
    }
  }

  /**
   * Show/hide pre-created cards based on active category and search query.
   * O(n) visibility toggles instead of O(n) DOM create+destroy per keystroke.
   */
  function renderCards() {
    const search = (searchInput.value || '').toLowerCase().trim();
    let count = 0;
    for (var i = 0; i < PROMPTS.length; i++) {
      const p = PROMPTS[i];
      let visible = true;
      if (activeCategory !== 'all' && p.category !== activeCategory) visible = false;
      if (visible && search && searchIndex[i].indexOf(search) === -1) visible = false;
      cardPool[i].hidden = !visible;
      if (visible) count++;
    }
    emptyState.hidden = count > 0;
  }

  function openModal(p) {
    modalQuestion.textContent = p.prompt;
    modalAnswer.textContent = p.response;
    modal.hidden = false;
    document.body.style.overflow = 'hidden';
    modalCloseBtn.focus();
  }

  function closeModal() {
    modal.hidden = true;
    document.body.style.overflow = '';
  }

  function init() {
    grid = document.getElementById('promptGalleryGrid');
    searchInput = document.getElementById('promptSearchInput');
    emptyState = document.getElementById('promptGalleryEmpty');
    modal = document.getElementById('promptResponseModal');
    modalBackdrop = document.getElementById('promptModalBackdrop');
    modalCloseBtn = document.getElementById('promptModalClose');
    modalQuestion = document.getElementById('promptModalQuestion');
    modalAnswer = document.getElementById('promptModalAnswer');
    filterBtns = document.querySelectorAll('.prompt-filter-btn');

    if (!grid) return;

    filterBtns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        filterBtns.forEach(function (b) {
          b.classList.remove('active');
          b.setAttribute('aria-selected', 'false');
        });
        btn.classList.add('active');
        btn.setAttribute('aria-selected', 'true');
        activeCategory = btn.dataset.promptCategory;
        renderCards();
      });
    });

    searchInput.addEventListener('input', renderCards);

    modalBackdrop.addEventListener('click', closeModal);
    modalCloseBtn.addEventListener('click', closeModal);
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !modal.hidden) closeModal();
    });

    buildCardPool();
    renderCards();
  }

  return { init: init };
})();
