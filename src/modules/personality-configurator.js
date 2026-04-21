
// ---------------------------------------------------------------------------
// Personality Configurator
// ---------------------------------------------------------------------------

/* exported PersonalityConfigurator */
var PersonalityConfigurator = (function () {
  'use strict';

  // StorageUtil is always available — loaded first in build order (see build.js)
  var _storage = StorageUtil;

  const STORAGE_KEY_PERSONALITY = 'agentbox_personality';

  const QUESTIONS = [
    { q: 'What\'s a good recipe for dinner tonight?', key: 'recipe' },
    { q: 'Explain how DNS works.', key: 'dns' },
    { q: 'What should I do this weekend?', key: 'weekend' },
    { q: 'Remind me about my meeting at 3pm.', key: 'reminder' },
    { q: 'Help me write a thank-you email.', key: 'email' },
    { q: 'How do I stay focused while working from home?', key: 'focus' },
    { q: 'Summarize the latest tech news.', key: 'technews' },
    { q: 'What\'s the difference between a latte and a cappuccino?', key: 'coffee' },
    { q: 'Help me plan a road trip.', key: 'roadtrip' },
    { q: 'How do I start learning Python?', key: 'learnpython' },
    { q: 'What should I name my new cat?', key: 'catname' },
    { q: 'Help me debug this error message.', key: 'debug' },
    { q: 'What\'s a good book to read this month?', key: 'book' },
    { q: 'Create a workout plan for beginners.', key: 'workout' },
    { q: 'How do I negotiate a raise?', key: 'negotiate' }
  ];

  const RESPONSES = {
    recipe: {
      casualBrief: 'Garlic butter shrimp pasta. 20 min, one pan. Can\'t go wrong.',
      casualDetailed: 'Garlic butter shrimp pasta is my go-to.\n\nHere\'s the play:\n1. Cook pasta (linguine works great)\n2. Saute garlic in butter until fragrant\n3. Toss in shrimp, cook 2-3 min per side\n4. Add pasta, splash of pasta water, lemon juice\n5. Fresh parsley on top\n\nTotal time: 20 min. Leftovers reheat well too.',
      formalBrief: 'I\'d recommend garlic butter shrimp pasta. It takes approximately 20 minutes and requires minimal cleanup.',
      formalDetailed: 'I would recommend garlic butter shrimp pasta. It\'s an efficient yet impressive dish.\n\nIngredients:\n- 400g linguine\n- 450g large shrimp, peeled\n- 4 cloves garlic, minced\n- 3 tbsp butter\n- Lemon juice, fresh parsley\n\nPreparation:\n1. Cook pasta to al dente, reserve 1 cup pasta water\n2. Saute garlic in butter over medium heat (60 seconds)\n3. Add shrimp, cook 2-3 minutes per side until pink\n4. Toss in pasta with a splash of reserved water\n5. Finish with lemon juice and parsley\n\nTotal preparation time: approximately 20 minutes.'
    },
    dns: {
      casualBrief: 'DNS is basically the internet\'s phone book. You type a domain, it finds the IP address.',
      casualDetailed: 'DNS is the internet\'s phone book.\n\nWhen you type "google.com":\n1. Your browser asks a DNS resolver (usually your ISP\'s)\n2. The resolver checks its cache first\n3. If not cached, it asks root servers -> TLD servers -> authoritative servers\n4. Gets back an IP like 142.250.80.46\n5. Your browser connects to that IP\n\nThe whole thing takes milliseconds. It\'s cached at multiple levels so repeat lookups are instant.',
      formalBrief: 'DNS (Domain Name System) translates human-readable domain names into IP addresses that computers use to identify each other on the network.',
      formalDetailed: 'The Domain Name System (DNS) is a hierarchical, distributed naming system that translates domain names into IP addresses.\n\nResolution process:\n1. Client sends query to configured recursive resolver\n2. Resolver checks local cache for existing records\n3. If uncached, resolver queries root nameservers for TLD delegation\n4. TLD nameserver provides authoritative nameserver reference\n5. Authoritative server returns the definitive A/AAAA record\n6. Resolver caches the result per the TTL value and returns it to the client\n\nThis process typically completes in under 100ms, with caching at each layer significantly reducing latency for subsequent queries.'
    },
    weekend: {
      casualBrief: 'If the weather\'s nice, hit a trail or check out a farmer\'s market. Rainy? Movie marathon.',
      casualDetailed: 'Here are some ideas depending on your vibe:\n\nOutdoor:\n- Hit a local trail or park\n- Check out a farmer\'s market\n- Bike ride or picnic\n\nChill:\n- Movie marathon (got any genres in mind?)\n- Try a new coffee shop\n- Cook something ambitious you\'ve been putting off\n\nSocial:\n- Board game night with friends\n- Check for local events or live music\n\nWant me to look up what\'s happening near you this weekend?',
      formalBrief: 'I\'d suggest considering outdoor activities if weather permits, or exploring local cultural events. Shall I look up options in your area?',
      formalDetailed: 'Here are some well-rounded weekend suggestions:\n\nOutdoor Activities:\n- Nature hikes at local trails\n- Farmer\'s market visits\n- Cycling or outdoor dining\n\nCultural & Social:\n- Local museum exhibitions\n- Live music or community events\n- Restaurant exploration\n\nRelaxation:\n- Cooking a new recipe\n- Reading or creative projects\n- Wellness activities (yoga, spa)\n\nI can look up specific events and weather conditions for your area to help narrow down the options. Would that be helpful?'
    },
    reminder: {
      casualBrief: 'Done! I\'ll ping you at 3pm about your meeting.',
      casualDetailed: 'You got it! Reminder set.\n\nI\'ll message you at 3:00 PM about your meeting. If you want, I can also remind you 15 min before so you have time to prep. Just say the word.',
      formalBrief: 'Reminder set. You will receive a notification at 3:00 PM regarding your meeting.',
      formalDetailed: 'Your reminder has been configured with the following details:\n\nEvent: Meeting\nReminder time: 3:00 PM today\nNotification: Push message via Telegram\n\nWould you like me to add a 15-minute advance warning as well? I can also include any preparation notes or agenda items you\'d like to review beforehand.'
    },
    email: {
      casualBrief: 'Sure! Who\'s it for and what are you thanking them for? I\'ll draft something quick.',
      casualDetailed: 'Happy to help! Just need a couple things:\n\n1. Who\'s it to? (boss, friend, client?)\n2. What are you thanking them for?\n3. How formal should it be?\n\nI\'ll write a draft you can tweak. Usually a good thank-you email is 3-4 sentences max \u2014 specific about what you\'re grateful for, and genuine.',
      formalBrief: 'I\'d be glad to assist. Could you share the recipient and the context for the thank-you? I\'ll prepare an appropriate draft.',
      formalDetailed: 'I would be happy to help you compose a thank-you email. To craft the most appropriate message, I\'ll need a few details:\n\n1. Recipient: Who is the email addressed to?\n2. Context: What specific action or gesture are you expressing gratitude for?\n3. Relationship: Professional colleague, supervisor, client, or personal contact?\n4. Tone preference: Warm and personal, or strictly professional?\n\nOnce I have this information, I\'ll draft a polished message that you can review and adjust before sending.'
    },
    focus: {
      casualBrief: 'Block distractions, time-box your work in 25-min chunks, and take real breaks.',
      casualDetailed: 'Here\'s what actually works:\n\n1. Time-box with Pomodoro: 25 min work, 5 min break\n2. Put your phone in another room (seriously)\n3. Use website blockers for social media during work hours\n4. Have a dedicated workspace — even a corner counts\n5. Start with your hardest task while your energy is fresh\n6. Background music without lyrics helps some people\n\nThe key is consistency. Your brain learns "this space = work mode" over time.',
      formalBrief: 'I recommend time-blocking techniques, minimizing digital distractions, and maintaining a dedicated workspace.',
      formalDetailed: 'Maintaining focus while working from home requires structured strategies:\n\nEnvironment:\n- Designate a specific workspace separate from leisure areas\n- Ensure proper lighting and ergonomic setup\n\nTime Management:\n- Apply the Pomodoro Technique (25-minute focused intervals)\n- Schedule your most demanding tasks during peak energy hours\n- Block calendar time for deep work\n\nDistraction Control:\n- Use application blockers during focus periods\n- Set device notifications to "Do Not Disturb"\n- Communicate availability boundaries with household members\n\nConsistency is essential — these habits compound over time.'
    },
    technews: {
      casualBrief: 'AI models keep getting better, open-source is thriving, and everyone\'s building agents.',
      casualDetailed: 'Here\'s the quick rundown:\n\n- AI: New models dropping almost weekly. Agents are the hot topic — everyone wants AI that can actually do things, not just chat.\n- Open source: Massive momentum. Local models are surprisingly good now.\n- Hardware: Apple and Nvidia in a quiet arms race for ML chips.\n- Security: Ransomware still a nightmare. Patch your stuff.\n\nWant me to dig into any of these?',
      formalBrief: 'Key trends include rapid AI model advancement, growing open-source adoption, and increased focus on autonomous AI agents.',
      formalDetailed: 'Here is a summary of current technology trends:\n\nArtificial Intelligence:\n- Foundation models continue rapid capability improvements\n- Agent-based architectures gaining significant traction\n- Open-source models narrowing the gap with proprietary offerings\n\nInfrastructure:\n- Accelerated hardware competition between major chipmakers\n- Edge computing and on-device AI becoming more viable\n\nSecurity:\n- Ransomware and supply-chain attacks remain prevalent\n- AI-assisted security tooling showing promise\n\nWould you like a deeper analysis of any particular area?'
    },
    coffee: {
      casualBrief: 'Latte = more milk, smooth. Cappuccino = more foam, stronger espresso taste.',
      casualDetailed: 'Both start with espresso, but:\n\nLatte:\n- 1/3 espresso, 2/3 steamed milk, thin layer of foam\n- Smooth, milky, great canvas for flavors\n- Bigger drink usually\n\nCappuccino:\n- Equal parts espresso, steamed milk, foam\n- Stronger coffee taste, lighter feel\n- That thick foam layer is the signature\n\nTL;DR: Want coffee-flavored milk? Latte. Want to actually taste the espresso? Cappuccino.',
      formalBrief: 'A latte contains more steamed milk with a thin foam layer, while a cappuccino has equal parts espresso, steamed milk, and foam.',
      formalDetailed: 'The distinction between these espresso-based beverages lies in their milk-to-espresso ratios:\n\nCaffè Latte:\n- Composition: 1/3 espresso, 2/3 steamed milk, thin foam layer (~1cm)\n- Character: Smooth, mild coffee flavor, creamy texture\n- Typical volume: 350-450ml\n\nCappuccino:\n- Composition: Equal thirds of espresso, steamed milk, and frothed milk foam\n- Character: Stronger espresso presence, lighter mouthfeel\n- Typical volume: 150-180ml\n\nBoth use the same espresso base; the preparation technique and proportions create distinctly different drinking experiences.'
    },
    roadtrip: {
      casualBrief: 'Pick a direction, map out stops every 2-3 hours, and don\'t over-plan. The detours are the best part.',
      casualDetailed: 'Here\'s how to plan a solid road trip:\n\n1. Pick your destination (or just a direction — no judgment)\n2. Map stops every 2-3 hours — scenic overlooks, weird roadside attractions, good food spots\n3. Book the first night, wing the rest\n4. Pack snacks, a great playlist, and a car charger\n5. Download offline maps in case cell service dies\n6. Budget 20% more than you think you\'ll need\n\nHonestly, the best road trip moments are the unplanned ones. Leave room for spontaneity.',
      formalBrief: 'I\'d recommend defining your route, scheduling rest stops every 2-3 hours, and preparing accommodations in advance.',
      formalDetailed: 'A well-planned road trip involves several key considerations:\n\nRoute Planning:\n- Define primary destination and identify scenic alternatives\n- Schedule rest stops every 2-3 hours for safety\n- Research fuel station availability on rural routes\n\nAccommodations:\n- Book lodging in advance for peak travel periods\n- Consider a mix of hotels and unique stays (cabins, B&Bs)\n\nPreparation:\n- Vehicle inspection: tires, oil, brakes, spare tire\n- Emergency kit: first aid, jumper cables, flashlight\n- Download offline maps for areas with limited connectivity\n\nBudget:\n- Allocate funds for fuel, lodging, meals, and activities\n- Include a 20% contingency buffer\n\nShall I help plan a specific route?'
    },
    learnpython: {
      casualBrief: 'Start with Python.org\'s tutorial, then build small projects. Best way to learn is by doing.',
      casualDetailed: 'Here\'s a no-BS path to learning Python:\n\n1. Start here: python.org tutorial or Automate the Boring Stuff (free online)\n2. Set up VS Code with the Python extension\n3. Learn the basics: variables, loops, functions, lists, dicts\n4. Build something small ASAP — a calculator, a to-do app, a web scraper\n5. When you get stuck, read the error message (seriously, Python errors are pretty clear)\n6. Then level up: classes, file I/O, APIs, pip packages\n\nDon\'t try to learn everything first. Build → get stuck → learn → repeat.',
      formalBrief: 'I recommend starting with the official Python tutorial, then progressing to practical projects to reinforce concepts.',
      formalDetailed: 'Here is a structured approach to learning Python:\n\nFoundation (Weeks 1-2):\n- Complete the official Python tutorial at python.org\n- Set up a development environment (VS Code + Python extension)\n- Master core concepts: variables, data types, control flow, functions\n\nIntermediate (Weeks 3-4):\n- Data structures: lists, dictionaries, sets, tuples\n- File I/O and error handling\n- Object-oriented programming basics\n- Package management with pip\n\nPractical Application (Weeks 5+):\n- Build small projects: CLI tools, web scrapers, data analysis scripts\n- Explore popular libraries: requests, pandas, Flask\n- Contribute to open-source projects for real-world experience\n\nRecommended resources:\n- "Automate the Boring Stuff with Python" (free online)\n- Python documentation (docs.python.org)\n- LeetCode for algorithmic practice'
    },
    catname: {
      casualBrief: 'Mochi, Pixel, or Chairman Meow. Depends on the cat\'s vibe.',
      casualDetailed: 'Depends on the cat\'s personality! Some ideas:\n\nClassic: Luna, Milo, Oliver, Cleo\nFoodie: Mochi, Biscuit, Waffles, Pesto\nNerdy: Pixel, Byte, Schrödinger, Ada\nDignified: Professor Whiskers, Chairman Meow, Sir Fluffington\nChaotic: Gremlin, Chaos, Bandit\n\nHonest advice: wait a day or two. Their personality will name them. You\'ll know.',
      formalBrief: 'Popular options include Luna, Milo, and Oliver. I\'d suggest observing your cat\'s temperament first.',
      formalDetailed: 'Selecting a name for your new cat is a meaningful decision. Here are categorized suggestions:\n\nPopular & Timeless: Luna, Milo, Oliver, Cleo, Leo\nFood-Inspired: Mochi, Biscuit, Ginger, Sage\nLiterary: Gatsby, Austen, Poe, Hemingway\nScience & Tech: Pixel, Ada, Tesla, Qubit\nDistinguished: Winston, Duchess, Reginald\n\nRecommendation: Spend 1-2 days observing your cat\'s personality traits and habits. Cats often "earn" their names through distinctive behaviors. A reserved cat might suit "Sage," while an energetic one might be a natural "Bandit."'
    },
    debug: {
      casualBrief: 'Paste the error — I\'ll tell you what\'s wrong and how to fix it.',
      casualDetailed: 'Let\'s squash that bug! Here\'s what helps:\n\n1. Paste the full error message and stack trace\n2. What language/framework?\n3. What were you trying to do when it broke?\n4. Did it work before? What changed?\n\nQuick self-check before we dive in:\n- Did you save the file? (We\'ve all been there)\n- Is the right environment/version active?\n- Google the exact error message in quotes — Stack Overflow is your friend\n\nPaste it and let\'s figure it out.',
      formalBrief: 'Please share the full error message and stack trace. I\'ll analyze it and provide a solution.',
      formalDetailed: 'I\'d be happy to help you resolve that error. To provide an accurate diagnosis, please share:\n\n1. The complete error message and stack trace\n2. The programming language and framework version\n3. The relevant code section (if not sensitive)\n4. Steps to reproduce the issue\n5. Any recent changes to the codebase\n\nIn the meantime, here are immediate troubleshooting steps:\n- Verify the error message for line numbers and file references\n- Check for recent dependency updates that may have introduced breaking changes\n- Review version compatibility between your tools and libraries\n- Search the exact error string in the project\'s issue tracker\n\nI\'ll provide a targeted solution once I can review the details.'
    },
    book: {
      casualBrief: 'What are you in the mood for? I\'ve got picks for fiction, non-fiction, or "blow my mind."',
      casualDetailed: 'Here are some solid picks across genres:\n\nFiction:\n- "Project Hail Mary" by Andy Weir — sci-fi, unputdownable\n- "Klara and the Sun" by Kazuo Ishiguro — quiet, beautiful AI story\n\nNon-Fiction:\n- "Thinking, Fast and Slow" by Daniel Kahneman — how your brain tricks you\n- "The Code Breaker" by Walter Isaacson — CRISPR and the future of genetics\n\nQuick reads:\n- "The Midnight Library" by Matt Haig — what if you could try different lives?\n- "Atomic Habits" by James Clear — small changes, big results\n\nWhat genre are you leaning toward?',
      formalBrief: 'I\'d recommend "Project Hail Mary" for fiction or "Thinking, Fast and Slow" for non-fiction. What genre interests you?',
      formalDetailed: 'Here are curated recommendations across categories:\n\nFiction:\n- "Project Hail Mary" by Andy Weir — compelling science fiction with rigorous scientific detail\n- "Klara and the Sun" by Kazuo Ishiguro — a thoughtful exploration of artificial intelligence and human connection\n- "The Midnight Library" by Matt Haig — philosophical fiction examining life choices\n\nNon-Fiction:\n- "Thinking, Fast and Slow" by Daniel Kahneman — foundational work on cognitive biases and decision-making\n- "The Code Breaker" by Walter Isaacson — the story of CRISPR and gene editing\n- "Atomic Habits" by James Clear — evidence-based framework for behavior change\n\nTechnical:\n- "Designing Data-Intensive Applications" by Martin Kleppmann\n- "The Pragmatic Programmer" by Hunt and Thomas\n\nWould you like recommendations tailored to a specific interest area?'
    },
    workout: {
      casualBrief: 'Start with 3 days a week: bodyweight stuff like squats, push-ups, and walks. Keep it simple.',
      casualDetailed: 'Here\'s a beginner plan that won\'t destroy you:\n\n3 days/week (e.g., Mon/Wed/Fri):\n- 10 squats\n- 5-10 push-ups (knees are fine!)\n- 30-second plank\n- 10 lunges each leg\n- 15 min walk or light jog\n\nWeek 2+: bump reps by 2-3 each week\n\nRules:\n- Rest days matter. Don\'t skip them.\n- Form > speed. Always.\n- Sore is normal. Sharp pain isn\'t — stop.\n- Consistency beats intensity every time\n\nYou don\'t need a gym or equipment to start. Just start.',
      formalBrief: 'I recommend beginning with 3 sessions per week focusing on bodyweight exercises: squats, push-ups, planks, and walking.',
      formalDetailed: 'Here is a structured beginner workout plan:\n\nSchedule: 3 sessions per week with rest days between\n\nWorkout Structure (30-40 minutes):\nWarm-up (5 minutes):\n- Light walking or marching in place\n- Arm circles and leg swings\n\nStrength Circuit (20 minutes, 2-3 rounds):\n- Bodyweight squats: 10-12 repetitions\n- Push-ups (modified if needed): 5-10 repetitions\n- Plank hold: 20-30 seconds\n- Lunges: 8-10 per leg\n- Glute bridges: 10-12 repetitions\n\nCardio (10 minutes):\n- Brisk walking or light jogging\n\nProgression:\n- Increase repetitions by 2-3 each week\n- Add exercises or rounds as fitness improves\n- Prioritize proper form over volume\n\nImportant: Allow 48 hours between sessions for recovery. Consult a physician before beginning any new exercise program.'
    },
    negotiate: {
      casualBrief: 'Know your market value, bring receipts of your wins, and practice saying the number out loud.',
      casualDetailed: 'Here\'s the playbook:\n\n1. Research: Know your market rate (Glassdoor, Levels.fyi, talking to peers)\n2. Document your wins: revenue generated, problems solved, projects shipped\n3. Pick the right time: after a big win, during reviews, or after getting a competing offer\n4. Lead with value, not need: "Here\'s what I\'ve delivered" > "I need more money"\n5. Give a range, anchor high: if you want $120k, say "$120-135k"\n6. Practice saying the number out loud until it feels normal\n7. Be ready for "not right now" — ask what milestones would get you there\n\nThe worst they can say is no. And even then, you\'ve planted the seed.',
      formalBrief: 'Prepare by researching market rates, documenting your contributions, and presenting a data-driven case.',
      formalDetailed: 'Negotiating a salary increase requires thorough preparation:\n\nResearch Phase:\n- Benchmark your role against market data (Glassdoor, LinkedIn Salary, industry surveys)\n- Document quantifiable achievements: revenue impact, cost savings, project outcomes\n- Identify your unique value proposition within the organization\n\nTiming:\n- Align with performance review cycles when possible\n- Following successful project completions strengthens your position\n- Avoid periods of organizational stress or budget constraints\n\nPresentation:\n- Frame the conversation around value delivered, not personal financial needs\n- Present specific metrics and achievements\n- Propose a salary range anchored at the higher end of market rates\n- Be prepared to discuss non-monetary compensation (equity, flexibility, development)\n\nFollow-up:\n- If declined, request specific milestones for future consideration\n- Get any commitments in writing\n- Maintain professionalism regardless of outcome'
    }
  };

  const HUMOR_ADDITIONS = {
    recipe: { low: '', mid: ' Trust me on this one.', high: ' Chef\'s kiss, honestly. Gordon Ramsay would nod approvingly. Probably.' },
    dns: { low: '', mid: ' Pretty clever system, honestly.', high: ' It\'s like asking 10 people for directions and somehow getting there in 50ms. The internet is wild.' },
    weekend: { low: '', mid: ' Life\'s short, pick the fun one.', high: ' Plot twist: do ALL of them. Sleep is overrated anyway.' },
    reminder: { low: '', mid: ' I never forget.', high: ' I\'m basically your brain\'s backup server now. You\'re welcome.' },
    email: { low: '', mid: ' A good thank-you goes a long way.', high: ' Pro tip: don\'t start with "Per my last email" \u2014 save that energy for passive-aggressive Mondays.' },
    focus: { low: '', mid: ' You got this.', high: ' Your couch is the enemy. Treat it accordingly.' },
    technews: { low: '', mid: ' Exciting times.', high: ' The future is here, it\'s just unevenly distributed and mostly running on GPUs.' },
    coffee: { low: '', mid: ' Both are great choices.', high: ' Baristas love when you know the difference. Instant cred. Literally.' },
    roadtrip: { low: '', mid: ' The journey is the destination.', high: ' If you don\'t stop at least one sketchy roadside attraction, did you even road trip?' },
    learnpython: { low: '', mid: ' Python\'s a great choice.', high: ' Fair warning: once you learn Python, every other language feels like doing taxes.' },
    catname: { low: '', mid: ' Cats are the best.', high: ' Honestly, the cat will ignore whatever name you pick. But that\'s part of the charm.' },
    debug: { low: '', mid: ' We\'ll figure it out.', high: ' The bug is scared. It can sense us coming.' },
    book: { low: '', mid: ' Happy reading!', high: ' Warning: "just one more chapter" is a lie your brain tells you at 2am.' },
    workout: { low: '', mid: ' Consistency is key.', high: ' Day 1 of becoming someone who says "I actually love mornings now." Scary.' },
    negotiate: { low: '', mid: ' You deserve fair compensation.', high: ' Channel your inner "I know what I bring to this table and I also brought dessert."' }
  };

  const EMOJI_SETS = {
    recipe: { none: '', some: ' \uD83C\uDF5D', lots: ' \uD83C\uDF5D\uD83E\uDD29\uD83D\uDE0B' },
    dns: { none: '', some: ' \uD83C\uDF10', lots: ' \uD83C\uDF10\uD83D\uDD0D\u26A1' },
    weekend: { none: '', some: ' \u2600\uFE0F', lots: ' \u2600\uFE0F\uD83C\uDF89\uD83C\uDF1F' },
    reminder: { none: '', some: ' \u23F0', lots: ' \u23F0\u2705\uD83D\uDCAA' },
    email: { none: '', some: ' \u2709\uFE0F', lots: ' \u2709\uFE0F\u270D\uFE0F\uD83D\uDE4F' },
    focus: { none: '', some: ' \uD83C\uDFAF', lots: ' \uD83C\uDFAF\uD83D\uDCAA\uD83D\uDD25' },
    technews: { none: '', some: ' \uD83D\uDCF0', lots: ' \uD83D\uDCF0\uD83E\uDD16\uD83D\uDE80' },
    coffee: { none: '', some: ' \u2615', lots: ' \u2615\uD83E\uDD24\u2728' },
    roadtrip: { none: '', some: ' \uD83D\uDE97', lots: ' \uD83D\uDE97\uD83D\uDDFA\uFE0F\uD83C\uDF05' },
    learnpython: { none: '', some: ' \uD83D\uDC0D', lots: ' \uD83D\uDC0D\uD83D\uDCBB\uD83D\uDE80' },
    catname: { none: '', some: ' \uD83D\uDC31', lots: ' \uD83D\uDC31\uD83D\uDE3B\u2728' },
    debug: { none: '', some: ' \uD83D\uDD0D', lots: ' \uD83D\uDD0D\uD83D\uDC1B\uD83D\uDCA5' },
    book: { none: '', some: ' \uD83D\uDCDA', lots: ' \uD83D\uDCDA\uD83E\uDD13\u2728' },
    workout: { none: '', some: ' \uD83C\uDFCB\uFE0F', lots: ' \uD83C\uDFCB\uFE0F\uD83D\uDCAA\uD83D\uDD25' },
    negotiate: { none: '', some: ' \uD83D\uDCBC', lots: ' \uD83D\uDCBC\uD83D\uDCB0\uD83D\uDE0E' }
  };

  const PRESETS = {
    professional: { formality: 85, humor: 10, detail: 70, emoji: 5 },
    friendly: { formality: 25, humor: 60, detail: 50, emoji: 55 },
    minimal: { formality: 40, humor: 15, detail: 10, emoji: 0 },
    enthusiastic: { formality: 15, humor: 80, detail: 65, emoji: 90 }
  };

  let currentQuestionIndex = 0;
  let _debounceTimer = null;

  // Cached slider DOM references — resolved once in init(), avoids
  // repeated getElementById calls in getSliderValues/applyPreset.
  let _sliders = null;

  /** Resolve & cache the four personality slider elements. */
  function _getSliders() {
    if (!_sliders) {
      _sliders = {
        formality: document.getElementById('sliderFormality'),
        humor:     document.getElementById('sliderHumor'),
        detail:    document.getElementById('sliderDetail'),
        emoji:     document.getElementById('sliderEmoji')
      };
    }
    return _sliders;
  }

  function saveToStorage(values) {
    _storage.setJSON(STORAGE_KEY_PERSONALITY, values);
  }

  function loadFromStorage() {
    const parsed = _storage.getJSON(STORAGE_KEY_PERSONALITY, null);
    if (parsed && typeof parsed.formality === 'number') { return parsed; }
    return null;
  }

  function getSliderValues() {
    let s = _getSliders();
    return {
      formality: s.formality ? parseInt(s.formality.value, 10) : 50,
      humor:     s.humor     ? parseInt(s.humor.value, 10)     : 50,
      detail:    s.detail    ? parseInt(s.detail.value, 10)    : 50,
      emoji:     s.emoji     ? parseInt(s.emoji.value, 10)     : 50
    };
  }

  function generateResponse(questionKey, values) {
    const responses = RESPONSES[questionKey];
    if (!responses) { return ''; }

    const formalKey = values.formality >= 50 ? 'formal' : 'casual';
    const detailKey = values.detail >= 50 ? 'Detailed' : 'Brief';
    let base = responses[formalKey + detailKey];

    const humorData = HUMOR_ADDITIONS[questionKey];
    if (humorData) {
      const humorLevel = values.humor < 30 ? 'low' : (values.humor < 70 ? 'mid' : 'high');
      base += humorData[humorLevel];
    }

    const emojiData = EMOJI_SETS[questionKey];
    if (emojiData) {
      const emojiLevel = values.emoji < 20 ? 'none' : (values.emoji < 65 ? 'some' : 'lots');
      base += emojiData[emojiLevel];
    }

    return base;
  }

  function updatePreview() {
    const bubble = document.getElementById('personalityResponse');
    if (!bubble) { return; }

    const values = getSliderValues();
    saveToStorage(values);
    const question = QUESTIONS[currentQuestionIndex];
    const response = generateResponse(question.key, values);

    bubble.classList.add('updating');
    setTimeout(function () {
      bubble.textContent = response;
      bubble.classList.remove('updating');
    }, 150);

    const presetBtns = document.querySelectorAll('.preset-btn');
    for (var i = 0; i < presetBtns.length; i++) {
      const presetName = presetBtns[i].getAttribute('data-preset');
      const preset = PRESETS[presetName];
      if (!preset) { continue; }
      const isMatch = Math.abs(preset.formality - values.formality) <= 5 &&
                    Math.abs(preset.humor - values.humor) <= 5 &&
                    Math.abs(preset.detail - values.detail) <= 5 &&
                    Math.abs(preset.emoji - values.emoji) <= 5;
      if (isMatch) {
        presetBtns[i].classList.add('active');
      } else {
        presetBtns[i].classList.remove('active');
      }
    }
  }

  function debouncedUpdate() {
    if (_debounceTimer) { clearTimeout(_debounceTimer); }
    _debounceTimer = setTimeout(updatePreview, 80);
  }

  function cycleQuestion() {
    currentQuestionIndex = (currentQuestionIndex + 1) % QUESTIONS.length;
    const questionEl = document.getElementById('personalityQuestion');
    if (questionEl) {
      questionEl.textContent = '"' + QUESTIONS[currentQuestionIndex].q + '"';
    }
    updatePreview();
  }

  function applyPreset(presetName) {
    const preset = PRESETS[presetName];
    if (!preset) { return; }

    let s = _getSliders();
    if (s.formality) { s.formality.value = preset.formality; }
    if (s.humor)     { s.humor.value     = preset.humor; }
    if (s.detail)    { s.detail.value    = preset.detail; }
    if (s.emoji)     { s.emoji.value     = preset.emoji; }
    saveToStorage(preset);
    updatePreview();
  }

  function init() {
    // Eagerly resolve and cache slider references
    let s = _getSliders();

    // Restore saved slider values from localStorage
    const saved = loadFromStorage();
    if (saved) {
      if (s.formality) { s.formality.value = saved.formality; }
      if (s.humor)     { s.humor.value     = saved.humor; }
      if (s.detail)    { s.detail.value    = saved.detail; }
      if (s.emoji)     { s.emoji.value     = saved.emoji; }
    }

    const sliders = document.querySelectorAll('.personality-range');
    for (var i = 0; i < sliders.length; i++) {
      sliders[i].addEventListener('input', debouncedUpdate);
    }

    const presetBtns = document.querySelectorAll('.preset-btn');
    for (var j = 0; j < presetBtns.length; j++) {
      presetBtns[j].addEventListener('click', function () {
        const preset = this.getAttribute('data-preset');
        applyPreset(preset);
      });
    }

    const cycleBtn = document.getElementById('personalityCycleBtn');
    if (cycleBtn) {
      cycleBtn.addEventListener('click', cycleQuestion);
    }

    updatePreview();
  }

  return {
    init: init,
    applyPreset: applyPreset,
    cycleQuestion: cycleQuestion,
    getSliderValues: getSliderValues,
    _QUESTIONS: QUESTIONS,
    _PRESETS: PRESETS,
    _RESPONSES: RESPONSES,
    _generateResponse: generateResponse
  };
})();
