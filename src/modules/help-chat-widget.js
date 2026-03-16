

// ── Help Chat Widget ──────────────────────────────────────────────
var HelpChatWidget = (function () {
  'use strict';

  var knowledgeBase = {
    greeting: {
      text: "Hi! 👋 I'm the AgentBox helper. What would you like to know?",
      options: [
        { label: "What is AgentBox?", key: "what" },
        { label: "How does it work?", key: "how" },
        { label: "What can it do?", key: "features" },
        { label: "Pricing", key: "pricing" },
        { label: "Privacy & Security", key: "privacy" },
        { label: "Get started", key: "start" }
      ]
    },
    what: {
      text: "AgentBox is your personal AI assistant that lives right in Telegram. It remembers your preferences, searches the web, sets reminders, understands images, and helps you get things done — all from a chat interface you already use.",
      options: [
        { label: "How is it different?", key: "different" },
        { label: "Who is it for?", key: "who" },
        { label: "← Back", key: "greeting" }
      ]
    },
    how: {
      text: "Just start a chat with AgentBox on Telegram. Send it a message — it responds instantly. Over time it learns your context: your name, preferences, timezone, and more. No app to install, no signup forms.",
      options: [
        { label: "What can it do?", key: "features" },
        { label: "Is it free?", key: "pricing" },
        { label: "← Back", key: "greeting" }
      ]
    },
    features: {
      text: "AgentBox can:\n🧠 Remember your context & preferences\n🔍 Search the web for real-time info\n⏰ Set reminders & alarms\n📷 Understand images you send\n📝 Help with writing & brainstorming\n🌐 Translate languages\n📊 Analyze data\n…and much more!",
      options: [
        { label: "Show me examples", key: "examples" },
        { label: "Pricing", key: "pricing" },
        { label: "← Back", key: "greeting" }
      ]
    },
    pricing: {
      text: "AgentBox has a free tier with 20 messages/day — enough to try it out. Premium plans remove limits and add features like priority responses, longer memory, and advanced tools. Check the pricing section above for details!",
      options: [
        { label: "Start for free", key: "start" },
        { label: "What's included free?", key: "free" },
        { label: "← Back", key: "greeting" }
      ]
    },
    privacy: {
      text: "Your privacy matters. AgentBox:\n🔒 Encrypts all conversations\n🚫 Never sells your data\n🗑️ Lets you delete your data anytime\n👤 Doesn't share info between users\n\nWe only store what's needed to remember your preferences.",
      options: [
        { label: "Where is data stored?", key: "data" },
        { label: "Can I delete everything?", key: "delete" },
        { label: "← Back", key: "greeting" }
      ]
    },
    start: {
      text: "Getting started is easy! Just open Telegram and search for AgentBox, or click the \"Start on Telegram\" button on this page. You'll be chatting with your AI agent in seconds. 🚀",
      options: [
        { label: "Is it really free?", key: "pricing" },
        { label: "What can it do?", key: "features" },
        { label: "← Back", key: "greeting" }
      ]
    },
    different: {
      text: "Unlike generic chatbots, AgentBox:\n• Lives where you already chat (Telegram)\n• Remembers YOU across sessions\n• Has real tools (web search, reminders, images)\n• Gets smarter over time with your context\n• No app to download or account to create",
      options: [
        { label: "How does it work?", key: "how" },
        { label: "← Back", key: "greeting" }
      ]
    },
    who: {
      text: "AgentBox is for anyone who wants an AI assistant without the friction:\n• Busy professionals who need quick answers\n• Students researching topics\n• Anyone who forgets reminders\n• People who want AI without learning new apps",
      options: [
        { label: "Get started", key: "start" },
        { label: "← Back", key: "greeting" }
      ]
    },
    examples: {
      text: "Try asking things like:\n💡 \"Remind me to call mom at 6pm\"\n💡 \"What's the weather in Tokyo?\"\n💡 \"Summarize this article\" (paste a URL)\n💡 \"Help me draft a polite email to my boss\"\n💡 Send a photo and ask \"What's in this image?\"",
      options: [
        { label: "Get started", key: "start" },
        { label: "← Back", key: "greeting" }
      ]
    },
    free: {
      text: "The free tier includes:\n✅ 20 messages per day\n✅ Web search\n✅ Reminders\n✅ Image understanding\n✅ Context memory (7 days)\n\nNo credit card required!",
      options: [
        { label: "Start for free", key: "start" },
        { label: "Premium features?", key: "pricing" },
        { label: "← Back", key: "greeting" }
      ]
    },
    data: {
      text: "Your data is stored on secure, encrypted servers. We use industry-standard encryption both in transit and at rest. Your conversations are isolated — no other user or staff member can access them without your explicit permission.",
      options: [
        { label: "Can I delete my data?", key: "delete" },
        { label: "← Back", key: "privacy" }
      ]
    },
    delete: {
      text: "Yes! You can delete all your data at any time by sending /deleteall to AgentBox. This permanently removes your conversation history, preferences, and all stored context. It's irreversible, so use it when you're sure.",
      options: [
        { label: "Privacy overview", key: "privacy" },
        { label: "← Back", key: "greeting" }
      ]
    },
    fallback: {
      text: "I'm not sure about that one! Here are some things I can help with:",
      options: [
        { label: "What is AgentBox?", key: "what" },
        { label: "Features", key: "features" },
        { label: "Pricing", key: "pricing" },
        { label: "Get started", key: "start" }
      ]
    }
  };

  // Simple keyword matching for free-text input
  var keywordMap = [
    { keywords: ["price", "pricing", "cost", "pay", "plan", "subscription", "free", "premium"], key: "pricing" },
    { keywords: ["feature", "can it", "what can", "capable", "ability", "do"], key: "features" },
    { keywords: ["privacy", "private", "secure", "security", "encrypt", "data", "gdpr"], key: "privacy" },
    { keywords: ["start", "begin", "signup", "sign up", "register", "try", "get started"], key: "start" },
    { keywords: ["what is", "about", "agentbox", "explain"], key: "what" },
    { keywords: ["how", "work", "setup", "install"], key: "how" },
    { keywords: ["example", "demo", "show", "sample", "try"], key: "examples" },
    { keywords: ["delete", "remove", "erase", "forget"], key: "delete" },
    { keywords: ["different", "compare", "vs", "versus", "better"], key: "different" },
    { keywords: ["who", "audience", "user"], key: "who" }
  ];

  function matchQuery(text) {
    var lower = text.toLowerCase().trim();
    for (var i = 0; i < keywordMap.length; i++) {
      var kw = keywordMap[i].keywords;
      for (var j = 0; j < kw.length; j++) {
        if (lower.indexOf(kw[j]) !== -1) return keywordMap[i].key;
      }
    }
    return "fallback";
  }

  function init() {
    var fab = document.getElementById('helpChatFab');
    var panel = document.getElementById('helpChatPanel');
    var close = document.getElementById('helpChatClose');
    var messages = document.getElementById('helpChatMessages');
    var optionsContainer = document.getElementById('helpChatOptions');
    var input = document.getElementById('helpChatInput');
    var sendBtn = document.getElementById('helpChatSend');
    var badge = document.getElementById('helpChatBadge');
    var fabIcon = document.getElementById('helpChatFabIcon');

    if (!fab || !panel) return;

    var isOpen = false;
    var hasOpened = false;

    function addBubble(text, sender) {
      var bubble = document.createElement('div');
      bubble.className = 'help-chat-bubble ' + sender;
      bubble.textContent = text;
      messages.appendChild(bubble);
      messages.scrollTop = messages.scrollHeight;
    }

    function showOptions(options) {
      optionsContainer.innerHTML = '';
      if (!options || !options.length) return;
      options.forEach(function (opt) {
        var btn = document.createElement('button');
        btn.className = 'help-chat-option-btn';
        btn.textContent = opt.label;
        btn.setAttribute('data-key', opt.key);
        btn.addEventListener('click', function () { handleOption(opt); });
        optionsContainer.appendChild(btn);
      });
    }

    function handleOption(opt) {
      addBubble(opt.label, 'user');
      respond(opt.key);
    }

    function respond(key) {
      var entry = knowledgeBase[key] || knowledgeBase.fallback;
      setTimeout(function () {
        addBubble(entry.text, 'bot');
        showOptions(entry.options);
      }, 300);
    }

    function handleUserInput() {
      var text = input.value.trim();
      if (!text) return;
      input.value = '';
      addBubble(text, 'user');
      var key = matchQuery(text);
      respond(key);
    }

    function toggle() {
      isOpen = !isOpen;
      panel.hidden = !isOpen;
      fab.setAttribute('aria-expanded', String(isOpen));
      fabIcon.textContent = isOpen ? '✕' : '💬';

      if (isOpen && !hasOpened) {
        hasOpened = true;
        badge.hidden = true;
        respond('greeting');
      }

      if (isOpen) {
        input.focus();
      }
    }

    fab.addEventListener('click', toggle);
    close.addEventListener('click', function () {
      if (isOpen) toggle();
    });

    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { e.preventDefault(); handleUserInput(); }
    });
    sendBtn.addEventListener('click', handleUserInput);

    // Close on Escape
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && isOpen) toggle();
    });
  }

  return { init: init, knowledgeBase: knowledgeBase, matchQuery: matchQuery };
})();
