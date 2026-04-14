/**
 * Use Case Explorer — interactive scenario browser for AgentBox
 * Shows real-world use cases with step-by-step conversation examples
 */

const USE_CASES = [
  {
    id: 'daily-briefing',
    icon: '☀️',
    title: 'Morning Briefing',
    category: 'productivity',
    description: 'Get a personalized daily summary with weather, calendar, tasks, and news — all in one message.',
    difficulty: 1,
    scenario: '"I want to start every day with a quick overview of what\'s ahead."',
    steps: [
      { role: 'user', text: 'Good morning! What\'s my day look like?' },
      { role: 'agent', text: '☀️ Good morning! Here\'s your briefing:\n\n🌤️ Seattle — 54°F, partly cloudy\n📅 3 meetings today (first at 10am: Sprint Planning)\n✅ 5 tasks due today, 2 overdue\n📰 Top story: "AI agents reshape enterprise workflows"\n\nWant me to reschedule anything or prep notes for your 10am?' },
      { role: 'user', text: 'Prep bullet points for the sprint planning' },
      { role: 'agent', text: 'Here are talking points based on last week\'s standup notes:\n\n• Auth service migration — 80% complete, blocked on SSO provider\n• Mobile app crash rate dropped 40% after Friday\'s patch\n• New onboarding flow A/B test results ready for review\n• 3 PRs awaiting review (2 from backend team)\n\nI\'ll remind you 5 min before the meeting. 👍' }
    ],
    outcome: 'Save 15 minutes every morning — AgentBox remembers your routine and adapts over time.'
  },
  {
    id: 'research-deep-dive',
    icon: '🔬',
    title: 'Research Deep Dive',
    category: 'research',
    description: 'Research a topic in depth with web search, source tracking, and organized summaries.',
    difficulty: 2,
    scenario: '"I need to understand the current state of quantum error correction for a report."',
    steps: [
      { role: 'user', text: 'Research the latest advances in quantum error correction. Focus on 2025-2026 papers.' },
      { role: 'agent', text: '🔍 Searching... Found 12 relevant sources. Here\'s a structured summary:\n\n**Key Breakthroughs:**\n1. Google\'s Willow chip achieved below-threshold error correction (Dec 2025)\n2. IBM demonstrated real-time decoding at 1μs latency\n3. New "floquet codes" reduce qubit overhead by 60%\n\n**Open Challenges:**\n• Logical qubit counts still too low for practical algorithms\n• Decoder latency vs accuracy tradeoff\n• Cross-platform benchmarking standards needed\n\nShall I go deeper on any of these, or compile sources into a bibliography?' },
      { role: 'user', text: 'Give me a bibliography in APA format' },
      { role: 'agent', text: 'Here are the 5 most-cited sources:\n\n1. Acharya, R., et al. (2025). Quantum error correction below the surface code threshold. *Nature*, 634, 315-320.\n2. Kim, Y., et al. (2025). Real-time decoding for scalable fault-tolerant quantum computing. *Physical Review X*, 15(2).\n...\n\nWant me to save this to your research notes? I\'ll remember it for future sessions.' }
    ],
    outcome: 'Turn hours of research into minutes — with sources you can actually cite.'
  },
  {
    id: 'email-drafting',
    icon: '✉️',
    title: 'Email Drafting',
    category: 'business',
    description: 'Draft professional emails with the right tone, context, and follow-up tracking.',
    difficulty: 1,
    scenario: '"I need to send a polite but firm follow-up to a client who hasn\'t responded in 2 weeks."',
    steps: [
      { role: 'user', text: 'Draft a follow-up email to Sarah Chen at Acme Corp. We sent a proposal 2 weeks ago, no response. Keep it warm but clear we need an answer by Friday.' },
      { role: 'agent', text: 'Here\'s a draft:\n\n**Subject:** Following up — AgentBox proposal\n\nHi Sarah,\n\nHope you\'re doing well! I wanted to check in on the proposal we shared on March 2nd. I know things get busy, so no worries at all.\n\nWe\'d love to get your thoughts so we can reserve implementation capacity for your team. Could you let us know your decision by this Friday (March 21)?\n\nHappy to hop on a quick call if any questions came up.\n\nBest,\n[Your name]\n\nShall I adjust the tone or add anything?' },
      { role: 'user', text: 'Make it shorter and remind me to follow up if she doesn\'t respond' },
      { role: 'agent', text: 'Shortened version sent! ✅\n\n⏰ Reminder set: If no reply by Friday 5pm, I\'ll nudge you to send a final follow-up or suggest next steps.' }
    ],
    outcome: 'Professional emails in seconds — plus AgentBox tracks your follow-ups automatically.'
  },
  {
    id: 'creative-brainstorm',
    icon: '🎨',
    title: 'Creative Brainstorming',
    category: 'creative',
    description: 'Generate ideas for projects, content, names, or designs with iterative refinement.',
    difficulty: 1,
    scenario: '"I\'m launching a newsletter about AI tools and need a catchy name."',
    steps: [
      { role: 'user', text: 'I\'m starting a weekly newsletter about AI tools for non-technical people. Help me brainstorm names.' },
      { role: 'agent', text: 'Here are some directions:\n\n**Friendly & Approachable:**\n• The AI Shortcut\n• Bot-Friendly\n• AI Made Simple\n\n**Clever & Catchy:**\n• Ctrl+AI+Del (fresh start with AI)\n• The Prompt Sheet\n• One Click Smarter\n\n**Professional:**\n• AI Tools Weekly\n• The Augmented Worker\n• Practical Intelligence\n\nWhich direction resonates? I can riff on any of these.' },
      { role: 'user', text: 'Love "The Prompt Sheet" — give me 5 variations and a tagline for each' },
      { role: 'agent', text: '1. **The Prompt Sheet** — "Your weekly cheat code for AI"\n2. **Prompt Sheet Weekly** — "AI tools, no jargon"\n3. **The Sunday Prompt** — "Start your week AI-ready"\n4. **PromptSheet** — "Less confusion, more automation"\n5. **The Prompt Page** — "One page of AI that actually matters"\n\nWant me to check domain availability for any of these?' }
    ],
    outcome: 'Go from blank page to polished ideas in under 2 minutes.'
  },
  {
    id: 'travel-planning',
    icon: '✈️',
    title: 'Trip Planning',
    category: 'productivity',
    description: 'Plan trips with itineraries, budget tracking, and local recommendations.',
    difficulty: 2,
    scenario: '"Planning a 4-day trip to Tokyo and want a detailed day-by-day plan."',
    steps: [
      { role: 'user', text: 'Plan a 4-day Tokyo trip in April. I like food, temples, and quirky neighborhoods. Budget: $150/day excluding hotel.' },
      { role: 'agent', text: '🗾 Here\'s your Tokyo itinerary:\n\n**Day 1 — Asakusa & East Tokyo**\n• Senso-ji temple (free, morning for fewer crowds)\n• Nakamise shopping street\n• Lunch: Sometaro okonomiyaki (~$12)\n• Akihabara afternoon (arcades, electronics)\n• Dinner: Ramen at Fuunji, Shinjuku (~$10)\n📊 Est. spend: $85\n\n**Day 2 — Shibuya & Harajuku**\n• Meiji Shrine morning walk (free)\n• Takeshita Street for quirky shops\n• Lunch: Conveyor belt sushi (~$15)\n...\n\nWant the full 4-day plan, or adjust Day 1 first?' },
      { role: 'user', text: 'Full plan please, and add a cherry blossom spot each day' },
      { role: 'agent', text: 'Updated with cherry blossom viewing! 🌸\n\n• Day 1: Sumida Park (riverside under the blossoms)\n• Day 2: Yoyogi Park (picnic-friendly)\n• Day 3: Ueno Park (Tokyo\'s most famous hanami spot)\n• Day 4: Shinjuku Gyoen (garden entry ¥500)\n\nFull plan saved. I\'ll also remind you about cherry blossom forecasts closer to your trip. Want me to set a packing reminder too?' }
    ],
    outcome: 'A trip planned in 3 messages — with reminders and forecasts as the date approaches.'
  },
  {
    id: 'code-review',
    icon: '💻',
    title: 'Code Review Helper',
    category: 'research',
    description: 'Get code reviews, explanations, and refactoring suggestions from photos or pasted code.',
    difficulty: 2,
    scenario: '"I have a Python function that works but feels messy — help me clean it up."',
    steps: [
      { role: 'user', text: 'Review this function:\n\ndef process(data):\n  result = []\n  for item in data:\n    if item["status"] == "active" and item["score"] > 50:\n      result.append({"name": item["name"], "score": item["score"]})\n  result.sort(key=lambda x: x["score"], reverse=True)\n  return result[:10]' },
      { role: 'agent', text: '**Review:**\n✅ Logic is correct\n⚠️ Could be more Pythonic\n⚠️ No error handling for missing keys\n\n**Refactored:**\n```python\ndef get_top_active(data, min_score=50, limit=10):\n    \"\"\"Return top active items by score.\"\"\"\n    active = (\n        {\"name\": item[\"name\"], \"score\": item[\"score\"]}\n        for item in data\n        if item.get(\"status\") == \"active\"\n        and item.get(\"score\", 0) > min_score\n    )\n    return sorted(active, key=lambda x: x[\"score\"], reverse=True)[:limit]\n```\n\n**Changes:** configurable params, `.get()` for safety, generator expression, docstring.' },
      { role: 'user', text: 'Add type hints and a dataclass' },
      { role: 'agent', text: 'Done! Added `ActiveItem` dataclass with `name: str` and `score: int`, plus full type hints. Want me to generate tests for it too?' }
    ],
    outcome: 'Instant code reviews with context-aware suggestions — right from Telegram.'
  },
  {
    id: 'meeting-notes',
    icon: '📝',
    title: 'Meeting Notes',
    category: 'business',
    description: 'Turn messy meeting notes into structured action items and summaries.',
    difficulty: 1,
    scenario: '"I just finished a client call and jotted rough notes — make them useful."',
    steps: [
      { role: 'user', text: 'Meeting notes:\n- talked about Q2 launch timeline, they want may 15 not june\n- sarah worried about api rate limits\n- need to send revised sow by wednesday \n- budget approved for extra dev hire\n- follow up on security audit results' },
      { role: 'agent', text: '📋 **Client Meeting Summary — March 16, 2026**\n\n**Key Decisions:**\n• Q2 launch moved up to May 15 (from June)\n• Budget approved for additional developer hire\n\n**Action Items:**\n1. 📄 Send revised SOW → **by Wednesday, March 18**\n2. 🔒 Follow up on security audit results → **owner: TBD**\n3. ⚡ Address API rate limit concerns (Sarah\'s concern) → **research needed**\n4. 👤 Begin hiring process for extra dev → **start this week**\n\n**Risks:**\n• Accelerated timeline (6 weeks earlier) may strain QA\n\nShall I set reminders for the action items?' },
      { role: 'user', text: 'Yes, and remind me about the SOW tomorrow morning' },
      { role: 'agent', text: '✅ Reminders set:\n• Tomorrow 9am: Draft revised SOW\n• Wednesday 4pm: SOW deadline check\n• Friday: Follow up on security audit\n\nI\'ll also remember the May 15 deadline for future reference.' }
    ],
    outcome: 'Messy notes → structured action items in 10 seconds. Never lose a follow-up again.'
  },
  {
    id: 'content-repurposing',
    icon: '♻️',
    title: 'Content Repurposing',
    category: 'creative',
    description: 'Transform one piece of content into multiple formats — blog to tweets, video script to outline, etc.',
    difficulty: 2,
    scenario: '"I wrote a blog post and need to turn it into social media content."',
    steps: [
      { role: 'user', text: 'I have a 2000-word blog post about "Why AI agents will replace SaaS dashboards." Turn it into Twitter/X content.' },
      { role: 'agent', text: 'Here\'s a content pack from your post:\n\n**🧵 Thread (7 tweets):**\n1/ The SaaS dashboard is dying. Not because dashboards are bad — but because AI agents can do what dashboards do, without you having to look.\n\nHere\'s why 2026 is the tipping point 🧵\n\n2/ Dashboards answer questions you already know to ask. Agents surface insights you didn\'t know you needed.\n\nThat\'s the fundamental shift.\n\n3/ Example: A sales dashboard shows pipeline by stage...\n\n**📱 Standalone posts (3):**\n1. Hot take: The best dashboard is the one you never open.\n2. [Stat-driven] 67% of SaaS users check dashboards < once/week...\n3. [Question] What if your tools talked to YOU instead of waiting?\n\n**📋 LinkedIn version** also ready. Want it?' },
      { role: 'user', text: 'Yes, and schedule the thread for Tuesday 9am EST' },
      { role: 'agent', text: '📎 LinkedIn post drafted (shorter, more professional tone).\n\n⏰ Thread scheduled: Tuesday, March 18 at 9:00 AM EST.\n\nI\'ll remind you to engage with replies in the first hour — that\'s when the algorithm pays most attention.' }
    ],
    outcome: 'One blog post → a week of social content, all formatted and scheduled.'
  },
  {
    id: 'expense-tracking',
    icon: '💰',
    title: 'Expense Tracking',
    category: 'business',
    description: 'Track expenses on the go — just tell AgentBox what you spent and it categorizes everything.',
    difficulty: 1,
    scenario: '"I hate spreadsheets but need to track business expenses for tax time."',
    steps: [
      { role: 'user', text: 'Spent $42 on lunch with a client today' },
      { role: 'agent', text: '✅ Logged: $42.00 — Meals & Entertainment (client)\n📊 March total: $847 | Budget remaining: $653\n\nReceipt photo? Just send it and I\'ll extract the details.' },
      { role: 'user', text: 'Also $180 for the new keyboard and $15 uber to the office' },
      { role: 'agent', text: '✅ Logged:\n• $180.00 — Equipment (keyboard)\n• $15.00 — Transportation (Uber)\n\n📊 March total: $1,042 | Budget remaining: $458\n\nYou\'re 67% through your monthly budget with 48% of the month left. Want me to flag if you go over?' },
      { role: 'user', text: 'Show me this month by category' },
      { role: 'agent', text: '📊 **March 2026 Expenses:**\n\n• Software & Tools: $320 (31%)\n• Meals & Entertainment: $287 (28%)\n• Equipment: $235 (23%)\n• Transportation: $125 (12%)\n• Office Supplies: $75 (7%)\n\nTotal: $1,042 / $1,500 budget\n\nTop insight: Meals spending is 40% higher than last month. Shall I export this to CSV?' }
    ],
    outcome: 'Track expenses as naturally as texting a friend. No apps, no spreadsheets.'
  },
  {
    id: 'image-analysis',
    icon: '📸',
    title: 'Image Analysis',
    category: 'research',
    description: 'Send photos and get instant analysis — plants, food, documents, errors, products, and more.',
    difficulty: 1,
    scenario: '"I found a plant on a hike and want to know what it is."',
    steps: [
      { role: 'user', text: '[sends photo of a plant]' },
      { role: 'agent', text: '🌿 That\'s **Digitalis purpurea** (Common Foxglove)!\n\n• Family: Plantaginaceae\n• Native to Europe, naturalized in PNW\n• ⚠️ **Highly toxic** — all parts, especially leaves and seeds\n• Blooms June-September\n• Source of digitalis (heart medication)\n\nBeautiful but don\'t touch! Want to save this to your plant collection?' },
      { role: 'user', text: 'Yes, and what other toxic plants should I watch for on PNW hikes?' },
      { role: 'agent', text: 'Good question! Common toxic plants in the Pacific Northwest:\n\n🔴 **Dangerous:**\n• Water Hemlock — most toxic plant in N. America\n• Death Camas — looks like wild onion\n• Baneberry — tempting red/white berries\n\n🟡 **Irritating:**\n• Giant Hogweed — causes severe burns\n• Stinging Nettle — painful but not deadly\n\nI saved the Foxglove to your collection with location and date. 📍' }
    ],
    outcome: 'Instant identification from a photo — with safety warnings and context you need.'
  },
  {
    id: 'habit-tracking',
    icon: '🎯',
    title: 'Habit Tracker',
    category: 'productivity',
    description: 'Build and maintain habits with daily check-ins, streaks, and gentle accountability.',
    difficulty: 1,
    scenario: '"I want to build a meditation habit but keep forgetting."',
    steps: [
      { role: 'user', text: 'Help me build a meditation habit. I want to do 10 min every morning.' },
      { role: 'agent', text: '🧘 Habit set up: **10-min morning meditation**\n\n• Daily reminder at 7:30am\n• I\'ll ask how it went each day\n• Streak tracking starts today\n\nTip: Pair it with something you already do (after coffee? after brushing teeth?) — it sticks better.\n\nWhen should I send the reminder?' },
      { role: 'user', text: 'Right after my morning briefing works' },
      { role: 'agent', text: '✅ I\'ll add a meditation nudge right after your daily briefing.\n\nDay 1 starts tomorrow. After each session, just say "done" or "skipped" — I\'ll track the rest.\n\n🔥 Current streak: 0 days\n🎯 First milestone: 7-day streak\n\nYou got this! 💪' }
    ],
    outcome: 'A habit tracker that lives where you already are — no extra app to forget about.'
  },
  {
    id: 'competitor-analysis',
    icon: '🏆',
    title: 'Competitor Analysis',
    category: 'business',
    description: 'Quick competitive intelligence — features, pricing, positioning comparisons.',
    difficulty: 3,
    scenario: '"We\'re pitching against a competitor tomorrow and need a quick comparison."',
    steps: [
      { role: 'user', text: 'Compare our product (project management tool) against Monday.com. Focus on what we do better.' },
      { role: 'agent', text: '🔍 Here\'s a competitive brief:\n\n**Where you win vs Monday.com:**\n✅ Pricing — 40% cheaper at team tier\n✅ API — more flexible, GraphQL support\n✅ Onboarding — avg 2 days vs their 2 weeks\n✅ Integrations — native Git/CI/CD (they use Zapier)\n\n**Where they win (be ready for these):**\n⚠️ Brand recognition — enterprise trust factor\n⚠️ Dashboards — more visualization options\n⚠️ Automations — their recipe builder is polished\n\n**Suggested talking points:**\n1. Lead with time-to-value (2 days vs 2 weeks)\n2. Show the API flexibility demo\n3. Price comparison slide — use their public pricing\n\nWant me to draft objection responses?' },
      { role: 'user', text: 'Yes, top 3 objections they\'ll raise' },
      { role: 'agent', text: '**Likely objections & responses:**\n\n1. "We\'re already using Monday.com"\n→ "Totally understand. Our migration tool imports everything in 30 min — boards, timelines, automations. Zero downtime."\n\n2. "You\'re a smaller company"\n→ "That\'s our advantage — dedicated support, faster feature requests. Our median response time is 4 hours vs their 48."\n\n3. "Missing [specific feature]"\n→ "Good news — our API lets you build exactly what you need. Here\'s an example..." [show custom widget demo]\n\nGood luck tomorrow! 🍀' }
    ],
    outcome: 'Walk into any pitch fully prepared — competitive intelligence on demand.'
  },
  {
    id: 'writing-feedback',
    icon: '📖',
    title: 'Writing Coach',
    category: 'creative',
    description: 'Get detailed feedback on your writing — essays, stories, cover letters, or any text.',
    difficulty: 2,
    scenario: '"I\'m writing a short story and the ending feels off."',
    steps: [
      { role: 'user', text: 'Here\'s the last paragraph of my short story. The ending feels flat — help me fix it.\n\n"She closed the laptop and looked out the window. The rain had stopped. She felt different now, like something had changed. She picked up her keys and walked out the door."' },
      { role: 'agent', text: '**What\'s working:** The physical actions (closing laptop, picking up keys) ground the moment. Good instinct.\n\n**What\'s flat:** "She felt different now, like something had changed" — this *tells* instead of *showing*. And the ending feels like a pause, not a resolution.\n\n**Three options:**\n\n🔹 **Subtle:** "She closed the laptop. Outside, the rain had left everything sharper — edges of rooftops, cracks in the sidewalk, the rust on the mailbox she\'d never noticed. She picked up her keys."\n\n🔹 **Emotional:** "She closed the laptop and caught her reflection in the dark screen — same face, but the eyes were someone else\'s now. She picked up her keys before she could think about it too much."\n\n🔹 **Open-ended:** "She closed the laptop. The rain had stopped, and through the window she could see all the way to the mountains. She picked up her keys — not because she knew where she was going, but because staying felt impossible."\n\nWhich direction fits your story?' },
      { role: 'user', text: 'The open-ended one is perfect' },
      { role: 'agent', text: 'Great choice — it gives the reader space to project their own meaning. That "staying felt impossible" line does the emotional heavy lifting without over-explaining.\n\nWant me to review the full story for consistency? I can also check pacing and flag any other "tell don\'t show" moments. 📝' }
    ],
    outcome: 'A writing partner who gives specific, actionable feedback — not just "looks good!"'
  },
  {
    id: 'learning-plan',
    icon: '📚',
    title: 'Learning Plan Builder',
    category: 'research',
    description: 'Create structured learning plans for any skill, with resources, milestones, and progress tracking.',
    difficulty: 2,
    scenario: '"I want to learn Rust programming but don\'t know where to start."',
    steps: [
      { role: 'user', text: 'I want to learn Rust. I know Python well. Give me a 30-day plan.' },
      { role: 'agent', text: '🦀 **30-Day Rust Learning Plan**\n(Adjusted for Python background)\n\n**Week 1: Foundations (Ownership is key)**\n• Day 1-2: Install Rust, cargo basics, "Hello World"\n• Day 3-4: Variables, types, functions (note: no GC!)\n• Day 5-7: Ownership, borrowing, lifetimes ⚡\n  → This is THE concept. Spend extra time here.\n\n**Week 2: Building Blocks**\n• Day 8-9: Structs, enums, pattern matching\n• Day 10-11: Error handling (Result/Option)\n• Day 12-14: Mini-project: CLI todo app\n\n**Week 3: Going Deeper**\n• Day 15-17: Traits & generics\n• Day 18-19: Closures, iterators\n• Day 20-21: Mini-project: File parser\n\n**Week 4: Real-World Rust**\n• Day 22-24: Concurrency & async\n• Day 25-27: Web server with Actix/Axum\n• Day 28-30: Final project: REST API\n\n📖 Primary resource: "The Rust Book" (free)\n\nWant me to track your daily progress?' },
      { role: 'user', text: 'Yes! Remind me every evening to log what I learned' },
      { role: 'agent', text: '✅ Learning tracker activated!\n\n• Daily reminder at 8pm: "What did you learn in Rust today?"\n• I\'ll track your progress and adjust the plan if you fall behind\n• Weekly summary every Sunday\n\nDay 1 starts tomorrow. Install Rust tonight: `curl --proto \'=https\' --tlsv1.2 -sSf https://sh.rustup.rs | sh`\n\nLet\'s go! 🚀' }
    ],
    outcome: 'A personalized curriculum that adapts to your pace — with built-in accountability.'
  },
  {
    id: 'gift-ideas',
    icon: '🎁',
    title: 'Gift Finder',
    category: 'creative',
    description: 'Find the perfect gift based on the person\'s interests, your budget, and the occasion.',
    difficulty: 1,
    scenario: '"My partner\'s birthday is next week and I have no ideas."',
    steps: [
      { role: 'user', text: 'Need a gift for my partner. She loves cooking, pottery, and indie music. Budget: $50-100.' },
      { role: 'agent', text: '🎁 Gift ideas for a cooking + pottery + indie music lover:\n\n**Experiences ($50-100):**\n• 🏺 Pottery wheel class for two (~$70)\n• 🎵 Tickets to a local indie show + dinner\n\n**Physical gifts:**\n• 🍳 Handmade ceramic cookbook stand from Etsy ($45-80)\n• 📖 "Salt Fat Acid Heat" + artisan salt collection ($55)\n• 🎧 Vinyl subscription box — 1 month ($30-50)\n\n**Combo idea ($90):**\nHandmade ceramic mug from a local potter + fill it with her favorite tea + a handwritten note about a pottery class you booked for both of you.\n\nThe combo approach always hits hardest. Want me to find specific listings?' },
      { role: 'user', text: 'Love the combo idea! Find a potter near Seattle' },
      { role: 'agent', text: '🔍 Local Seattle potters with online shops:\n\n1. **Georgetown Pottery** — handmade mugs $35-50\n2. **Pottery Northwest** (they also offer classes!)\n3. **Choplet Studio** — unique glazes, ships fast\n\nI\'ll remember her birthday for next year too. Want a reminder a week before? 🎂' }
    ],
    outcome: 'Thoughtful, personalized gift ideas — not generic Amazon suggestions.'
  },
  {
    id: 'data-analysis',
    icon: '📊',
    title: 'Quick Data Analysis',
    category: 'business',
    description: 'Analyze data from screenshots, CSVs, or described datasets — get insights fast.',
    difficulty: 3,
    scenario: '"I have last quarter\'s sales data and need insights for the board meeting."',
    steps: [
      { role: 'user', text: 'Here are Q4 numbers by region:\nNorth: $2.1M (was $1.8M)\nSouth: $890K (was $950K)\nEast: $1.5M (was $1.4M)\nWest: $3.2M (was $2.9M)' },
      { role: 'agent', text: '📊 **Q4 Revenue Analysis:**\n\nTotal: $7.69M (+8.3% QoQ from $7.05M) ✅\n\n**By Region:**\n| Region | Q4 | QoQ Change |\n|--------|------|------------|\n| 🟢 West | $3.2M | +10.3% |\n| 🟢 North | $2.1M | +16.7% ⭐ |\n| 🟢 East | $1.5M | +7.1% |\n| 🔴 South | $890K | -6.3% ⚠️ |\n\n**Key insights:**\n1. North is your fastest-growing region (+16.7%)\n2. South declined — only region in the red\n3. West remains your revenue engine (42% of total)\n\n**Board talking point:** "Overall growth of 8.3% driven by North\'s breakout quarter. Investigating South\'s decline — recommend reallocating Q1 marketing budget."\n\nWant a deeper dive on the South decline?' }
    ],
    outcome: 'Board-ready insights from raw numbers — in one message.'
  }
];

function initExplorer() {
  const categories = [...new Set(USE_CASES.map(u => u.category))];
  const controlsEl = document.getElementById('controls');
  const gridEl = document.getElementById('grid');
  const statsEl = document.getElementById('statsBar');
  const searchInput = document.getElementById('searchInput');
  const modalOverlay = document.getElementById('modalOverlay');
  const modalEl = document.getElementById('modal');

  let activeCategory = 'all';

  // Build filter buttons
  const allBtn = document.createElement('button');
  allBtn.className = 'filter-btn active';
  allBtn.dataset.cat = 'all';
  allBtn.textContent = `All (${USE_CASES.length})`;
  controlsEl.appendChild(allBtn);

  categories.forEach(cat => {
    const count = USE_CASES.filter(u => u.category === cat).length;
    const btn = document.createElement('button');
    btn.className = 'filter-btn';
    btn.dataset.cat = cat;
    btn.textContent = `${cat.charAt(0).toUpperCase() + cat.slice(1)} (${count})`;
    controlsEl.appendChild(btn);
  });

  function renderCards() {
    const query = searchInput.value.toLowerCase().trim();
    const filtered = USE_CASES.filter(u => {
      const catMatch = activeCategory === 'all' || u.category === activeCategory;
      const searchMatch = !query ||
        u.title.toLowerCase().includes(query) ||
        u.description.toLowerCase().includes(query) ||
        u.category.toLowerCase().includes(query);
      return catMatch && searchMatch;
    });

    statsEl.textContent = `Showing ${filtered.length} of ${USE_CASES.length} use cases`;
    gridEl.innerHTML = '';

    if (filtered.length === 0) {
      gridEl.innerHTML = '<div class="empty-state">No use cases match your search. Try a different term.</div>';
      return;
    }

    filtered.forEach(uc => {
      const card = document.createElement('div');
      card.className = 'card';
      card.setAttribute('role', 'button');
      card.setAttribute('tabindex', '0');
      card.setAttribute('aria-label', `View ${uc.title} use case`);

      const diffDots = Array.from({ length: 3 }, (_, i) =>
        `<span class="${i < uc.difficulty ? 'filled' : ''}"></span>`
      ).join('');

      card.innerHTML = `
        <div class="card-header">
          <div class="card-icon">${uc.icon}</div>
          <div>
            <h3>${uc.title}</h3>
            <span class="cat-tag ${uc.category}">${uc.category}</span>
          </div>
        </div>
        <div class="card-body">${uc.description}</div>
        <div class="card-footer">
          <span>${uc.steps.length} steps</span>
          <div class="difficulty" title="Complexity: ${uc.difficulty}/3">${diffDots}</div>
        </div>
      `;

      const openModal = () => showModal(uc);
      card.addEventListener('click', openModal);
      card.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openModal(); } });
      gridEl.appendChild(card);
    });
  }

  function showModal(uc) {
    const stepsHtml = uc.steps.map((s, i) => `
      <div class="step" data-step="${i + 1}">
        <div class="step-content">
          <div class="step-label">${s.role === 'user' ? '👤 You' : '🤖 AgentBox'}</div>
          <div class="chat-bubble ${s.role === 'user' ? 'bubble-user' : 'bubble-agent'}">${escapeHtml(s.text)}</div>
        </div>
      </div>
    `).join('');

    modalEl.innerHTML = `
      <button class="modal-close" aria-label="Close">&times;</button>
      <div class="modal-head">
        <h2>${escapeHtml(uc.icon)} ${escapeHtml(uc.title)}</h2>
        <span class="cat-tag ${escapeHtml(uc.category)}">${escapeHtml(uc.category)}</span>
        <p class="scenario">${escapeHtml(uc.scenario)}</p>
      </div>
      <div class="modal-steps">${stepsHtml}</div>
      <div class="modal-outcome"><strong>Result:</strong> ${escapeHtml(uc.outcome)}</div>
      <a href="https://t.me/AgentBox11Bot" class="modal-cta" target="_blank" rel="noopener">Try This on AgentBox →</a>
    `;

    modalOverlay.classList.add('open');
    document.body.style.overflow = 'hidden';
    modalEl.querySelector('.modal-close').focus();
  }

  function closeModal() {
    modalOverlay.classList.remove('open');
    document.body.style.overflow = '';
  }

  // Use shared DOMUtil.escapeHtml when available (bundle), inline fallback for standalone/test
  var _escape = (typeof DOMUtil !== 'undefined' && DOMUtil.escapeHtml) ? DOMUtil.escapeHtml : function (str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  };
  function escapeHtml(text) {
    return _escape(text).replace(/\n/g, '<br>');
  }

  // Event listeners
  controlsEl.addEventListener('click', e => {
    if (!e.target.classList.contains('filter-btn')) return;
    activeCategory = e.target.dataset.cat;
    controlsEl.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    e.target.classList.add('active');
    renderCards();
  });

  searchInput.addEventListener('input', renderCards);

  modalOverlay.addEventListener('click', e => {
    if (e.target === modalOverlay) closeModal();
  });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeModal();
  });

  renderCards();
}

if (typeof document !== 'undefined' && typeof module === 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initExplorer);
  } else {
    initExplorer();
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { USE_CASES, initExplorer };
}
