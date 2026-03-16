
/* ── Chat Playground ── */
var Playground = (function () {
  let messagesEl, inputEl, formEl;

  /** Pending reply timer — cleared on new submit to prevent stacking. */
  let pendingTimer = null;
  /** Typing indicator currently in the DOM. */
  let currentTyping = null;

  /**
   * Security limits to prevent resource exhaustion.
   * MAX_INPUT_LENGTH: caps the text processed by findResponse() to avoid
   *   unbounded regex/split operations on multi-MB pastes.
   * MAX_MESSAGES: caps DOM children in the messages container to prevent
   *   memory exhaustion from automated or rapid submissions.
   */
  const MAX_INPUT_LENGTH = 500;
  const MAX_MESSAGES = 50;

  const responses = [
    { patterns: ['hi', 'hello', 'hey', 'sup', 'yo'], reply: 'Hey there! \u{1F44B} I\'m your AgentBox agent. Ask me anything \u2014 weather, recipes, coding help, reminders, or whatever\'s on your mind.' },
    { patterns: ['weather', 'temperature', 'rain', 'sunny', 'forecast'], reply: '\u{1F324}\uFE0F I can check real-time weather for any city! In the full version, I search the web and give you current conditions + forecasts. Try me on Telegram to get live data!' },
    { patterns: ['recipe', 'cook', 'food', 'dinner', 'lunch', 'pasta', 'chicken'], reply: '\u{1F373} I love helping with recipes! Tell me what ingredients you have and I\'ll suggest something. I also remember your dietary preferences across conversations \u2014 no repeating yourself.' },
    { patterns: ['remind', 'reminder', 'alarm', 'schedule', 'todo'], reply: '\u23F0 Reminders are one of my favorite features! Just say "remind me to X in 30 minutes" and I\'ll ping you. I handle recurring reminders too. Try it on Telegram for the real thing!' },
    { patterns: ['code', 'error', 'bug', 'debug', 'programming', 'javascript', 'python'], reply: '\u{1F4BB} Send me error messages, code snippets, or screenshots \u2014 I\'ll help you debug. I remember your tech stack across conversations so my answers stay relevant.' },
    { patterns: ['image', 'photo', 'picture', 'screenshot', 'see'], reply: '\u{1F4F7} In the full version, you can send me photos and I\'ll analyze them! Screenshots of errors, documents, memes, food \u2014 I see what you see and answer questions about it.' },
    { patterns: ['voice', 'audio', 'speak', 'talk'], reply: '\u{1F3A4} Too lazy to type? Send a voice message on Telegram and I\'ll understand it. I transcribe and respond naturally \u2014 it\'s like texting, but hands-free.' },
    { patterns: ['price', 'cost', 'plan', 'free', 'premium', 'pro'], reply: '\u{1F4B0} I\'m free to try \u2014 20 messages/day, no signup. Pro is $9/mo for unlimited messages, advanced memory, and priority responses. Scroll down to see all plans!' },
    { patterns: ['memory', 'remember', 'forget', 'context'], reply: '\u{1F9E0} That\'s my superpower! I remember your preferences, past conversations, and context. Tell me something once and I\'ll know it forever \u2014 unless you ask me to forget.' },
    { patterns: ['privacy', 'data', 'secure', 'safe', 'private'], reply: '\u{1F512} Your data is yours. Each user gets an isolated workspace \u2014 no shared context, no training on your data, no third-party sharing. You can wipe my memory anytime.' },
    { patterns: ['thank', 'thanks', 'awesome', 'great', 'cool', 'nice'], reply: 'You\'re welcome! \u{1F60A} This is just a demo \u2014 the real agent on Telegram is way more capable. Give it a try!' },
    { patterns: ['who', 'what are you', 'about'], reply: 'I\'m AgentBox \u2014 your personal AI agent that lives in Telegram. I can search the web, set reminders, understand images, and most importantly: I remember you across conversations. \u{1F916}' },
    { patterns: ['help', 'can you', 'what can'], reply: 'I can help with:\n\u{1F50D} Web search & research\n\u23F0 Reminders & scheduling\n\u{1F4F7} Image analysis\n\u{1F9E0} Remembering your preferences\n\u{1F4BB} Coding help\n\u{1F373} Recipes & recommendations\n\nAnd much more on Telegram!' },
  ];
  const fallbacks = [
    'Interesting question! In the full version on Telegram, I\'d search the web and give you a detailed answer. Try me there! \u{1F680}',
    'I\'d love to help with that! This demo is limited, but the real agent on Telegram has full web search, memory, and image understanding. Give it a spin! \u2728',
    'Good one! The real AgentBox would handle this with a web search and your personal context. Head to Telegram to try the full experience \u{1F4AC}',
  ];
  let fallbackIdx = 0;

  /**
   * Pre-built keyword → reply index for O(1) lookup instead of
   * nested linear scan on every message.
   */
  let patternMap = null;

  function buildPatternMap() {
    patternMap = Object.create(null);
    for (var i = 0; i < responses.length; i++) {
      for (var j = 0; j < responses[i].patterns.length; j++) {
        patternMap[responses[i].patterns[j]] = responses[i].reply;
      }
    }
  }

  function findResponse(text) {
    if (!patternMap) buildPatternMap();
    const lower = text.toLowerCase().replace(/[^\w\s]/g, '');
    const words = lower.split(/\s+/);

    // Check single words first (most patterns are single keywords)
    for (var i = 0; i < words.length; i++) {
      if (patternMap[words[i]]) return patternMap[words[i]];
    }

    // Fall back to substring match for multi-word patterns
    for (var key in patternMap) {
      if (key.indexOf(' ') !== -1 && lower.indexOf(key) !== -1) {
        return patternMap[key];
      }
    }

    const fb = fallbacks[fallbackIdx % fallbacks.length];
    fallbackIdx++;
    return fb;
  }

  function addBubble(role, text) {
    // Evict oldest messages when DOM children exceed safety limit.
    while (messagesEl.children.length >= MAX_MESSAGES) {
      messagesEl.removeChild(messagesEl.firstChild);
    }
    const bubble = document.createElement('div');
    bubble.className = 'chat-bubble ' + role;
    bubble.textContent = text;
    messagesEl.appendChild(bubble);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function addTyping() {
    let el = _typingIndicatorTemplate.cloneNode(true);
    el.id = 'playgroundTyping';
    messagesEl.appendChild(el);
    messagesEl.scrollTop = messagesEl.scrollHeight;
    return el;
  }

  /** Remove current typing indicator if present. */
  function clearTyping() {
    if (currentTyping && currentTyping.parentNode) {
      currentTyping.parentNode.removeChild(currentTyping);
    }
    currentTyping = null;
  }

  function handleSubmit(e) {
    e.preventDefault();
    let text = inputEl.value.trim();
    if (!text) return;

    // Truncate to prevent unbounded regex/split in findResponse().
    if (text.length > MAX_INPUT_LENGTH) {
      text = text.slice(0, MAX_INPUT_LENGTH);
    }

    // Cancel any pending reply to prevent stacking
    if (pendingTimer) {
      clearTimeout(pendingTimer);
      pendingTimer = null;
      clearTyping();
    }

    addBubble('user', text);
    inputEl.value = '';

    const reply = findResponse(text);
    currentTyping = addTyping();
    const delay = prefersReducedMotion ? 200 : 800 + Math.min(reply.length * 5, 1200);

    pendingTimer = setTimeout(function () {
      pendingTimer = null;
      clearTyping();
      addBubble('bot', reply);
    }, delay);
  }

  function init() {
    formEl = document.getElementById('playgroundForm');
    inputEl = document.getElementById('playgroundInput');
    messagesEl = document.getElementById('playgroundMessages');
    if (!formEl || !inputEl || !messagesEl) return;
    inputEl.setAttribute('maxlength', String(MAX_INPUT_LENGTH));
    formEl.addEventListener('submit', handleSubmit);
  }

  return { init: init };
})();
