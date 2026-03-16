
/* ================================================================
 * AIGlossary — Searchable AI/agent terminology reference
 * ================================================================ */
var AIGlossary = (function () {
  "use strict";

  var TERMS = [
    { term: "AI Agent", category: "Core", definition: "An autonomous software system that perceives its environment, makes decisions, and takes actions to achieve goals without continuous human guidance.", example: "AgentBox acts as your personal AI agent — it reads your messages, understands context, and takes action on your behalf.", related: ["Autonomy", "LLM", "Tool Use"] },
    { term: "LLM", category: "Core", definition: "Large Language Model — a neural network trained on vast text data that can understand and generate human language. The brain behind modern AI agents.", example: "GPT-4, Claude, and Gemini are LLMs that power AI agents like AgentBox.", related: ["AI Agent", "Token", "Prompt"] },
    { term: "Prompt", category: "Core", definition: "The text instruction or question you give to an AI system. Prompt quality directly affects output quality.", example: "\"Summarize my unread emails and flag anything urgent\" is a prompt you might send to AgentBox.", related: ["Prompt Engineering", "System Prompt", "LLM"] },
    { term: "Token", category: "Core", definition: "The basic unit of text that LLMs process. A token is roughly 3-4 characters or ¾ of a word. Models have token limits for input and output.", example: "The sentence \"Hello, how are you?\" is about 6 tokens. AgentBox manages token usage so you don't have to worry about limits.", related: ["LLM", "Context Window"] },
    { term: "Context Window", category: "Core", definition: "The maximum amount of text (measured in tokens) an LLM can process in a single interaction. Larger windows allow more conversation history and document analysis.", example: "With a 128K context window, AgentBox can analyze entire documents while keeping your full conversation history.", related: ["Token", "Memory", "LLM"] },
    { term: "Prompt Engineering", category: "Techniques", definition: "The practice of crafting effective prompts to get better results from AI systems. Involves structuring instructions, providing examples, and setting constraints.", example: "Instead of asking \"write an email,\" prompt engineering would say \"write a professional 3-paragraph email declining a meeting, tone: polite but firm.\"", related: ["Prompt", "Few-Shot Learning", "Chain of Thought"] },
    { term: "System Prompt", category: "Techniques", definition: "Hidden instructions that define an AI agent's personality, capabilities, and constraints. Users don't see these, but they shape every response.", example: "AgentBox's system prompt tells it to remember your preferences, be concise, and never share your data.", related: ["Prompt", "AI Agent", "Guardrails"] },
    { term: "Few-Shot Learning", category: "Techniques", definition: "Providing a few examples in your prompt so the AI understands the pattern you want. Works without retraining the model.", example: "\"Categorize emails: 'Meeting at 3pm' → Calendar, 'Invoice attached' → Finance. Now categorize: 'Quarterly report due'\"", related: ["Prompt Engineering", "Zero-Shot"] },
    { term: "Zero-Shot", category: "Techniques", definition: "Asking an AI to perform a task without any examples — relying entirely on its pre-trained knowledge.", example: "Asking AgentBox \"translate this to French\" without showing it any translation examples first.", related: ["Few-Shot Learning", "Prompt Engineering"] },
    { term: "Chain of Thought", category: "Techniques", definition: "A prompting technique where the AI is asked to reason step-by-step before giving a final answer, improving accuracy on complex problems.", example: "\"Think through this step by step: If I invest $1000 at 7% annual return, how much do I have after 5 years?\"", related: ["Prompt Engineering", "Reasoning"] },
    { term: "RAG", category: "Architecture", definition: "Retrieval-Augmented Generation — combining search/retrieval with AI generation. The AI first finds relevant documents, then uses them to create accurate, grounded responses.", example: "When you ask AgentBox about your schedule, it retrieves your calendar data first, then generates a natural language summary.", related: ["Grounding", "Hallucination", "Vector Database"] },
    { term: "Tool Use", category: "Architecture", definition: "An AI agent's ability to call external tools and APIs — browsing the web, sending emails, running code, querying databases.", example: "AgentBox uses tool use to check your calendar, search the web, send messages, and control smart home devices.", related: ["AI Agent", "Function Calling", "API"] },
    { term: "Function Calling", category: "Architecture", definition: "A structured way for LLMs to invoke specific functions with typed parameters. The model outputs a JSON function call instead of plain text.", example: "When you say \"set a reminder for 3pm,\" the LLM generates a structured call: {function: 'setReminder', time: '15:00'}.", related: ["Tool Use", "API", "AI Agent"] },
    { term: "Memory", category: "Architecture", definition: "An AI agent's ability to retain and recall information across conversations. Short-term memory covers the current chat; long-term memory persists across sessions.", example: "AgentBox remembers your name, preferences, and past conversations — so you never repeat yourself.", related: ["Context Window", "AI Agent", "Vector Database"] },
    { term: "Vector Database", category: "Architecture", definition: "A database that stores text as mathematical vectors (embeddings), enabling semantic similarity search. Powers memory and RAG systems.", example: "When AgentBox searches your notes, it uses vector similarity to find relevant content even if the exact words don't match.", related: ["RAG", "Embedding", "Memory"] },
    { term: "Embedding", category: "Architecture", definition: "A numerical representation of text in high-dimensional space, where similar meanings are close together. Used for search, clustering, and recommendations.", example: "The sentences \"I'm happy\" and \"I'm joyful\" would have very similar embeddings, even though the words differ.", related: ["Vector Database", "Semantic Search"] },
    { term: "Hallucination", category: "Safety", definition: "When an AI generates plausible-sounding but factually incorrect information. A key challenge in AI reliability.", example: "If asked about a fake company, an AI might confidently describe its \"history\" — that's hallucination. AgentBox mitigates this with grounding and source verification.", related: ["Grounding", "Guardrails", "RAG"] },
    { term: "Guardrails", category: "Safety", definition: "Safety constraints and filters that prevent AI agents from generating harmful, biased, or off-topic content.", example: "AgentBox's guardrails prevent it from sharing your personal data, generating harmful content, or taking unauthorized actions.", related: ["System Prompt", "Alignment", "Hallucination"] },
    { term: "Alignment", category: "Safety", definition: "The challenge of ensuring AI systems behave in ways that are helpful, harmless, and honest — matching human values and intentions.", example: "AgentBox is aligned to prioritize your privacy, give honest answers (including \"I don't know\"), and refuse harmful requests.", related: ["Guardrails", "RLHF"] },
    { term: "Grounding", category: "Safety", definition: "Connecting AI responses to real, verifiable data sources to reduce hallucination and improve accuracy.", example: "When AgentBox answers questions about your finances, it's grounded in your actual account data — not guessing.", related: ["RAG", "Hallucination", "Tool Use"] },
    { term: "RLHF", category: "Safety", definition: "Reinforcement Learning from Human Feedback — a training technique where humans rate AI outputs to teach the model which responses are better.", example: "RLHF is why modern AI assistants are helpful and polite — human trainers rewarded good behavior during training.", related: ["Alignment", "Fine-Tuning"] },
    { term: "Fine-Tuning", category: "Training", definition: "Customizing a pre-trained model on specific data to improve performance for particular tasks or domains.", example: "A customer service AI might be fine-tuned on support tickets to better handle product-specific questions.", related: ["LLM", "RLHF", "Transfer Learning"] },
    { term: "Transfer Learning", category: "Training", definition: "Using knowledge gained from one task to improve performance on a different but related task, without training from scratch.", example: "An LLM trained on general text can transfer that knowledge to understand medical literature without needing to retrain on all of medicine.", related: ["Fine-Tuning", "LLM"] },
    { term: "Inference", category: "Operations", definition: "The process of running a trained AI model to generate outputs. Every time you send a message to an AI, that's an inference call.", example: "Each message you send to AgentBox triggers an inference call to the underlying LLM, which generates the response.", related: ["Token", "Latency", "LLM"] },
    { term: "Latency", category: "Operations", definition: "The time delay between sending a request to an AI system and receiving the response. Lower latency means faster, more responsive interactions.", example: "AgentBox optimizes for low latency — most responses arrive in 1-3 seconds, even for complex queries.", related: ["Inference", "Streaming"] },
    { term: "Streaming", category: "Operations", definition: "Delivering AI responses word-by-word as they're generated, rather than waiting for the complete response. Creates a more interactive experience.", example: "When AgentBox types out its response gradually instead of showing everything at once — that's streaming.", related: ["Latency", "Inference"] },
    { term: "Autonomy", category: "Agents", definition: "The degree to which an AI agent can operate independently, making decisions and taking actions without human approval for each step.", example: "AgentBox can autonomously check your email, summarize key points, and draft replies — all without you asking for each step.", related: ["AI Agent", "Human-in-the-Loop"] },
    { term: "Human-in-the-Loop", category: "Agents", definition: "A design pattern where critical decisions require human approval before the AI proceeds. Balances automation with oversight.", example: "AgentBox might draft an email automatically but wait for your approval before sending — that's human-in-the-loop.", related: ["Autonomy", "Guardrails", "AI Agent"] },
    { term: "Multi-Agent", category: "Agents", definition: "A system where multiple specialized AI agents collaborate on complex tasks, each handling a different aspect of the work.", example: "A multi-agent setup might have one agent for research, another for writing, and a third for fact-checking — all coordinating together.", related: ["AI Agent", "Orchestration"] },
    { term: "Orchestration", category: "Agents", definition: "Coordinating multiple AI components, tools, or agents to work together on complex workflows. The conductor of the AI orchestra.", example: "When AgentBox checks your calendar, finds a conflict, reschedules a meeting, and notifies attendees — that's orchestration.", related: ["Multi-Agent", "Tool Use", "Workflow"] },
    { term: "Reasoning", category: "Agents", definition: "An AI's ability to logically analyze information, draw conclusions, and solve problems — going beyond simple pattern matching.", example: "When AgentBox notices you have back-to-back meetings with no lunch break and suggests rescheduling — that's reasoning.", related: ["Chain of Thought", "AI Agent"] },
    { term: "Semantic Search", category: "Architecture", definition: "Search that understands meaning rather than just matching keywords. Uses embeddings to find conceptually similar content.", example: "Searching for \"ways to stay healthy\" also finds articles about \"fitness tips\" and \"nutrition advice\" — that's semantic search.", related: ["Embedding", "Vector Database", "RAG"] },
    { term: "API", category: "Architecture", definition: "Application Programming Interface — a structured way for software systems to communicate. AI agents use APIs to connect to services like email, calendars, and databases.", example: "AgentBox connects to your tools through APIs — Gmail API for email, Google Calendar API for scheduling, etc.", related: ["Tool Use", "Function Calling", "Webhook"] },
    { term: "Webhook", category: "Architecture", definition: "An automated notification sent from one service to another when a specific event occurs. Enables real-time reactions to events.", example: "A webhook can notify AgentBox when you receive a new email, so it can process it immediately instead of checking periodically.", related: ["API", "Orchestration"] },
    { term: "Workflow", category: "Agents", definition: "A defined sequence of steps that an AI agent follows to accomplish a task. Can include branching logic, parallel execution, and error handling.", example: "A morning briefing workflow: check weather → scan emails → review calendar → summarize news → deliver report.", related: ["Orchestration", "Autonomy", "AI Agent"] }
  ];

  var activeCategory = "all";
  var searchQuery = "";

  function getCategories() {
    var cats = {};
    for (var i = 0; i < TERMS.length; i++) {
      cats[TERMS[i].category] = (cats[TERMS[i].category] || 0) + 1;
    }
    return cats;
  }

  function filteredTerms() {
    var q = searchQuery.toLowerCase();
    var results = [];
    for (var i = 0; i < TERMS.length; i++) {
      var t = TERMS[i];
      if (activeCategory !== "all" && t.category !== activeCategory) continue;
      if (q) {
        var hay = (t.term + " " + t.definition + " " + (t.related || []).join(" ")).toLowerCase();
        if (hay.indexOf(q) === -1) continue;
      }
      results.push(t);
    }
    results.sort(function (a, b) { return a.term.localeCompare(b.term); });
    return results;
  }

  function renderCategories() {
    var el = document.getElementById("glossaryCategories");
    if (!el) return;
    var cats = getCategories();
    var keys = Object.keys(cats).sort();
    var html = '<button class="glossary-cat-btn' + (activeCategory === "all" ? " active" : "") + '" data-cat="all" role="tab" aria-selected="' + (activeCategory === "all") + '">All (' + TERMS.length + ')</button>';
    for (var i = 0; i < keys.length; i++) {
      var k = keys[i];
      var active = activeCategory === k;
      html += '<button class="glossary-cat-btn' + (active ? " active" : "") + '" data-cat="' + k + '" role="tab" aria-selected="' + active + '">' + k + ' (' + cats[k] + ')</button>';
    }
    el.innerHTML = html;
  }

  function renderList() {
    var el = document.getElementById("glossaryList");
    var countEl = document.getElementById("glossaryCount");
    if (!el) return;
    var items = filteredTerms();
    if (countEl) {
      countEl.textContent = items.length + " term" + (items.length !== 1 ? "s" : "") + (activeCategory !== "all" ? " in " + activeCategory : "") + (searchQuery ? ' matching "' + searchQuery + '"' : "");
    }
    if (items.length === 0) {
      el.innerHTML = '<div class="glossary-empty">No terms found. Try a different search or category.</div>';
      return;
    }
    var html = "";
    for (var i = 0; i < items.length; i++) {
      var t = items[i];
      html += '<div class="glossary-card" role="listitem" data-term="' + t.term.replace(/"/g, '&quot;') + '">';
      html += '<div class="glossary-card-header" tabindex="0" aria-expanded="false" role="button">';
      html += '<span class="glossary-term">' + t.term + '</span>';
      html += '<span class="glossary-badge">' + t.category + '</span>';
      html += '<span class="glossary-toggle" aria-hidden="true">+</span>';
      html += '</div>';
      html += '<div class="glossary-card-body">';
      html += '<div class="glossary-definition">' + t.definition + '</div>';
      if (t.example) {
        html += '<div class="glossary-example">\ud83d\udca1 ' + t.example + '</div>';
      }
      if (t.related && t.related.length) {
        html += '<div class="glossary-related">Related: ';
        for (var j = 0; j < t.related.length; j++) {
          if (j > 0) html += ', ';
          html += '<span class="glossary-related-link" data-jump="' + t.related[j].replace(/"/g, '&quot;') + '">' + t.related[j] + '</span>';
        }
        html += '</div>';
      }
      html += '</div></div>';
    }
    el.innerHTML = html;
  }

  function toggleCard(header) {
    var card = header.parentElement;
    var wasOpen = card.classList.contains("open");
    card.classList.toggle("open");
    header.setAttribute("aria-expanded", !wasOpen);
  }

  function jumpToTerm(name) {
    searchQuery = "";
    activeCategory = "all";
    var searchInput = document.getElementById("glossarySearch");
    if (searchInput) searchInput.value = "";
    renderCategories();
    renderList();
    var cards = document.querySelectorAll(".glossary-card");
    for (var i = 0; i < cards.length; i++) {
      if (cards[i].getAttribute("data-term") === name) {
        cards[i].classList.add("open");
        var h = cards[i].querySelector(".glossary-card-header");
        if (h) h.setAttribute("aria-expanded", "true");
        if (typeof cards[i].scrollIntoView === "function") {
          cards[i].scrollIntoView({ behavior: "smooth", block: "center" });
        }
        return;
      }
    }
  }

  function init() {
    renderCategories();
    renderList();

    var searchInput = document.getElementById("glossarySearch");
    if (searchInput) {
      searchInput.addEventListener("input", function () {
        searchQuery = this.value.trim();
        renderList();
      });
    }

    var catContainer = document.getElementById("glossaryCategories");
    if (catContainer) {
      catContainer.addEventListener("click", function (e) {
        var btn = e.target.closest(".glossary-cat-btn");
        if (!btn) return;
        activeCategory = btn.getAttribute("data-cat");
        renderCategories();
        renderList();
      });
    }

    var listContainer = document.getElementById("glossaryList");
    if (listContainer) {
      listContainer.addEventListener("click", function (e) {
        var link = e.target.closest(".glossary-related-link");
        if (link) {
          jumpToTerm(link.getAttribute("data-jump"));
          return;
        }
        var header = e.target.closest(".glossary-card-header");
        if (header) toggleCard(header);
      });
      listContainer.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " ") {
          var header = e.target.closest(".glossary-card-header");
          if (header) { e.preventDefault(); toggleCard(header); }
        }
      });
    }
  }

  return {
    init: init,
    getTerms: function () { return TERMS.slice(); },
    getCategory: function () { return activeCategory; },
    getQuery: function () { return searchQuery; },
    jumpToTerm: jumpToTerm
  };
})();
