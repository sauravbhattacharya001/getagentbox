
/* ── Commands Cheat Sheet ── */
var CommandsCheatSheet = (function () {
  const COMMANDS = [
    { category: "memory", icon: "\uD83E\uDDE0", name: "Remember this", command: "Remember that I prefer dark roast coffee", desc: "Tell your agent something to remember for future conversations.", example: "Remember my anniversary is March 15" },
    { category: "memory", icon: "\uD83E\uDDE0", name: "What do you know?", command: "What do you remember about me?", desc: "See everything your agent has stored about your preferences and context.", example: "What do you know about my work?" },
    { category: "memory", icon: "\uD83E\uDDE0", name: "Forget something", command: "Forget my dietary preferences", desc: "Ask your agent to clear specific memories.", example: "Forget what I told you about my schedule" },
    { category: "productivity", icon: "\u26A1", name: "Set a reminder", command: "Remind me in 30 minutes to check the oven", desc: "Set one-time or recurring reminders delivered right in Telegram.", example: "Remind me every Monday at 9am to submit reports" },
    { category: "productivity", icon: "\u26A1", name: "Summarize text", command: "Summarize this article: [paste URL or text]", desc: "Get a concise summary of articles, documents, or long messages.", example: "Summarize the key points from this email" },
    { category: "productivity", icon: "\u26A1", name: "Draft an email", command: "Draft a professional email declining a meeting invitation", desc: "Generate polished emails in your preferred tone and style.", example: "Write a follow-up email to the client about the proposal" },
    { category: "productivity", icon: "\u26A1", name: "Make a list", command: "Create a packing list for a 5-day beach trip", desc: "Generate organized lists for any purpose \u2014 shopping, tasks, ideas.", example: "List the pros and cons of remote work" },
    { category: "productivity", icon: "\u26A1", name: "Translate", command: "Translate 'Where is the nearest pharmacy?' to Japanese", desc: "Translate text between any languages with natural phrasing.", example: "How do you say 'thank you for your help' in French?" },
    { category: "search", icon: "\uD83D\uDD0D", name: "Web search", command: "Search for the best noise-canceling headphones in 2026", desc: "Real-time web search for current information, reviews, and news.", example: "What are the latest iPhone rumors?" },
    { category: "search", icon: "\uD83D\uDD0D", name: "Quick answer", command: "What's the capital of New Zealand?", desc: "Get instant answers to factual questions without searching yourself.", example: "How many calories in an avocado?" },
    { category: "search", icon: "\uD83D\uDD0D", name: "Compare things", command: "Compare React vs Vue for a new project", desc: "Get balanced comparisons with pros, cons, and recommendations.", example: "iPhone 16 vs Samsung Galaxy S26 \u2014 which is better for photos?" },
    { category: "search", icon: "\uD83D\uDD0D", name: "Explain a topic", command: "Explain blockchain like I'm 12", desc: "Complex topics broken down to your level of understanding.", example: "What is quantum computing and why does it matter?" },
    { category: "media", icon: "\uD83D\uDCF7", name: "Analyze an image", command: "[Send a photo] What's in this image?", desc: "Send screenshots, documents, or photos and ask questions about them.", example: "[Send error screenshot] How do I fix this?" },
    { category: "media", icon: "\uD83D\uDCF7", name: "Read a document", command: "[Send a PDF] Summarize the key findings", desc: "Upload documents and get summaries, answers, or extracted data.", example: "[Send receipt photo] What was the total?" },
    { category: "media", icon: "\uD83D\uDCF7", name: "Voice message", command: "[Send a voice note]", desc: "Send voice messages instead of typing \u2014 your agent understands speech.", example: "Just hold the mic button and talk naturally" },
    { category: "settings", icon: "\u2699\uFE0F", name: "Change personality", command: "Be more casual and use more emojis", desc: "Adjust how your agent communicates \u2014 formal, playful, brief, detailed.", example: "Be more concise in your responses" },
    { category: "settings", icon: "\u2699\uFE0F", name: "Set preferences", command: "I prefer metric units and Celsius", desc: "Configure default preferences so answers are always tailored to you.", example: "Always give me prices in EUR" },
    { category: "settings", icon: "\u2699\uFE0F", name: "Clear history", command: "Clear your memory and start fresh", desc: "Wipe your agent's memory completely for a fresh start.", example: "Reset everything you know about me" }
  ];

  let currentCategory = 'all';
  let currentSearch = '';
  let toastTimer = null;

  function getFiltered() {
    return COMMANDS.filter(function (cmd) {
      const matchCat = currentCategory === 'all' || cmd.category === currentCategory;
      if (!matchCat) return false;
      if (!currentSearch) return true;
      const q = currentSearch.toLowerCase();
      return cmd.name.toLowerCase().indexOf(q) !== -1 ||
             cmd.desc.toLowerCase().indexOf(q) !== -1 ||
             cmd.command.toLowerCase().indexOf(q) !== -1;
    });
  }

  function render() {
    let grid = document.getElementById('commandsGrid');
    const empty = document.getElementById('commandsEmpty');
    if (!grid) return;
    let filtered = getFiltered();
    if (filtered.length === 0) {
      grid.innerHTML = '';
      if (empty) empty.hidden = false;
      return;
    }
    if (empty) empty.hidden = true;
    grid.innerHTML = filtered.map(function (cmd) {
      return '<div class="command-card" role="listitem" data-command="' + cmd.command.replace(/"/g, '&quot;') + '" tabindex="0">' +
        '<span class="command-card-copy-hint">click to copy</span>' +
        '<div class="command-card-header">' +
          '<span class="command-card-icon">' + cmd.icon + '</span>' +
          '<span class="command-card-name">' + cmd.name + '</span>' +
        '</div>' +
        '<div class="command-card-desc">' + cmd.desc + '</div>' +
        '<div class="command-card-example">' + cmd.example + '</div>' +
      '</div>';
    }).join('');
  }

  function copyCommand(card) {
    let text = card.getAttribute('data-command');
    if (!text) return;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text);
    }
    card.classList.add('copied');
    setTimeout(function () { card.classList.remove('copied'); }, 1200);
    let toast = document.getElementById('commandsCopiedToast');
    if (toast) {
      toast.hidden = false;
      clearTimeout(toastTimer);
      toastTimer = setTimeout(function () { toast.hidden = true; }, 2000);
    }
  }

  function init() {
    render();

    let filterContainer = document.querySelector('.commands-filter');
    if (filterContainer) {
      filterContainer.addEventListener('click', function (e) {
        let btn = e.target.closest('.commands-filter-btn');
        if (!btn) return;
        currentCategory = btn.getAttribute('data-cmd-category') || 'all';
        filterContainer.querySelectorAll('.commands-filter-btn').forEach(function (b) {
          b.classList.remove('active');
          b.setAttribute('aria-selected', 'false');
        });
        btn.classList.add('active');
        btn.setAttribute('aria-selected', 'true');
        render();
      });
    }

    let searchInput = document.getElementById('commandsSearchInput');
    if (searchInput) {
      searchInput.addEventListener('input', function () {
        currentSearch = searchInput.value.trim();
        render();
      });
    }

    let grid = document.getElementById('commandsGrid');
    if (grid) {
      grid.addEventListener('click', function (e) {
        const card = e.target.closest('.command-card');
        if (card) copyCommand(card);
      });
      grid.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') {
          const card = e.target.closest('.command-card');
          if (card) { e.preventDefault(); copyCommand(card); }
        }
      });
    }
  }

  return { init: init, render: render };
})();
