/**
 * AgentBox Landing Page — Interactive Components
 *
 * Modules:
 *  - ChatDemo:       animated chat scenario player
 *  - Testimonials:   auto-rotating testimonials carousel
 *  - Pricing:        monthly/yearly billing toggle
 *  - FAQ:            accordion behaviour
 *  - Stats:          animated social proof counters
 */

/** Global reduced-motion check (WCAG 2.3.3 compliance). */
var prefersReducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// ---------------------------------------------------------------------------
// Chat Demo Scenarios
// ---------------------------------------------------------------------------

/* exported SCENARIOS, ChatDemo, Testimonials, Pricing, FAQ, Stats */
/* eslint-disable no-var */
var SCENARIOS = Object.freeze({
  memory: [
    { role: 'user', text: 'Hey, what was that pasta recipe I asked about last week?' },
    { role: 'bot', text: 'The one with sun-dried tomatoes and basil! You mentioned wanting to try it with penne instead of fusilli. Want me to pull up the full recipe?' },
    { role: 'user', text: 'Yes! And remind me to buy penne tonight' },
    { role: 'bot', text: 'Here\'s the recipe:\n\n🍝 Sun-dried tomato pasta\n• 400g penne\n• 100g sun-dried tomatoes\n• Fresh basil, garlic, olive oil\n• Parmesan to finish\n\nBoil pasta, sauté garlic + tomatoes 3 min, toss together, top with basil & parmesan.\n\nI\'ll remind you tonight at 7pm to grab penne! ✅' },
  ],
  search: [
    { role: 'user', text: 'What\'s the weather like in Seattle this weekend?' },
    { role: 'bot', text: '🌧️ Seattle this weekend:\n\nSaturday: 48°F, light rain in the morning, clearing by noon\nSunday: 52°F, partly cloudy\n\nNot bad for February! Might be worth getting out on Sunday.' },
    { role: 'user', text: 'Any good hikes near Seattle that work in light rain?' },
    { role: 'bot', text: 'Here are some rain-friendly options:\n\n🌲 Twin Falls (easy, 2.6 mi) — waterfall is amazing after rain\n🏔️ Rattlesnake Ledge (moderate, 4 mi) — canopy cover most of the way\n🌿 Discovery Park Loop (easy, 2.8 mi) — scenic + mostly sheltered\n\nI\'d go Twin Falls if you want the payoff. Want directions?' },
  ],
  reminder: [
    { role: 'user', text: 'Remind me to take my medicine in 30 minutes' },
    { role: 'bot', text: 'Got it! I\'ll ping you in 30 minutes to take your medicine 💊' },
    { role: 'user', text: 'Also remind me about the team standup at 9am tomorrow' },
    { role: 'bot', text: 'Done! Two reminders set:\n\n⏰ In 30 min — take medicine\n⏰ Tomorrow 9:00 AM — team standup\n\nI\'ll make sure you don\'t miss either one.' },
  ],
  image: [
    { role: 'user', text: '📷 [sends a photo of an error message on their screen]' },
    { role: 'bot', text: 'I can see the error — it\'s a CORS issue. Your frontend at localhost:3000 is trying to hit an API on a different port without the right headers.\n\nQuick fix: add this to your server:\n\n`Access-Control-Allow-Origin: *`\n\nOr if you\'re using Express:\n`app.use(cors())`\n\nWant me to walk through the full setup?' },
    { role: 'user', text: 'That fixed it, thanks!' },
    { role: 'bot', text: 'Nice! 🎉 Pro tip: in production, replace the wildcard `*` with your actual domain for security. Let me know if anything else comes up.' },
  ],
});

// ---------------------------------------------------------------------------
// Chat Demo Module
// ---------------------------------------------------------------------------

var ChatDemo = (function () {
  var animationTimer = null;
  var animationGeneration = 0;
  var scrollRafId = 0;

  // Reusable typing indicator template (cloned for each use).
  var typingTemplate = (function () {
    var el = document.createElement('div');
    el.className = 'typing-indicator';
    for (var i = 0; i < 3; i++) el.appendChild(document.createElement('span'));
    return el;
  })();

  /**
   * Batched scroll-to-bottom via requestAnimationFrame to avoid forced
   * synchronous layout. Defers the read+write to the browser's next
   * paint frame where layout is already computed.
   */
  function scheduleScroll(el) {
    if (scrollRafId) return;
    scrollRafId = requestAnimationFrame(function () {
      scrollRafId = 0;
      el.scrollTop = el.scrollHeight;
    });
  }

  /** Build a chat bubble DOM node from a message object. */
  function createBubble(msg) {
    var bubble = document.createElement('div');
    bubble.className = 'chat-bubble ' + msg.role;

    var frag = document.createDocumentFragment();
    var lines = msg.text.split('\n');

    for (var i = 0; i < lines.length; i++) {
      if (i > 0) frag.appendChild(document.createElement('br'));
      // Split on backtick-delimited code spans (odd indices are code).
      var segments = lines[i].split(/`([^`]+)`/);
      for (var s = 0; s < segments.length; s++) {
        if (s % 2 === 1) {
          var code = document.createElement('code');
          code.textContent = segments[s];
          frag.appendChild(code);
        } else if (segments[s]) {
          frag.appendChild(document.createTextNode(segments[s]));
        }
      }
    }

    bubble.appendChild(frag);
    return bubble;
  }

  /** Play a named scenario in the chat window. */
  function play(name) {
    var chatWindow = document.getElementById('chatWindow');
    if (!chatWindow) return;

    chatWindow.innerHTML = '';
    if (!Object.prototype.hasOwnProperty.call(SCENARIOS, name)) return;
    var messages = SCENARIOS[name];
    if (!messages) return;

    var idx = 0;
    var gen = animationGeneration;

    function isStale() {
      return gen !== animationGeneration;
    }

    function showNext() {
      if (idx >= messages.length || isStale()) return;
      var msg = messages[idx];

      if (msg.role === 'bot') {
        var typing = typingTemplate.cloneNode(true);
        chatWindow.appendChild(typing);
        scheduleScroll(chatWindow);

        animationTimer = setTimeout(function () {
          if (isStale()) return;
          if (typing.parentNode) typing.parentNode.removeChild(typing);
          chatWindow.appendChild(createBubble(msg));
          scheduleScroll(chatWindow);
          idx++;
          animationTimer = setTimeout(showNext, 1200);
        }, 800 + Math.random() * 600);
      } else {
        chatWindow.appendChild(createBubble(msg));
        scheduleScroll(chatWindow);
        idx++;
        animationTimer = setTimeout(showNext, 900);
      }
    }

    animationTimer = setTimeout(showNext, 500);
  }

  /** Switch to a new scenario, cancelling any in-flight animation. */
  function switchTo(name) {
    animationGeneration++;
    if (animationTimer) {
      clearTimeout(animationTimer);
      animationTimer = null;
    }
    if (scrollRafId) {
      cancelAnimationFrame(scrollRafId);
      scrollRafId = 0;
    }
    document.querySelectorAll('.scenario-btn').forEach(function (btn) {
      btn.classList.toggle('active', btn.dataset.scenario === name);
    });
    play(name);
  }

  return { switchTo: switchTo, play: play };
})();

// ---------------------------------------------------------------------------
// Testimonials Carousel Module
// ---------------------------------------------------------------------------

var Testimonials = (function () {
  var currentIndex = 0;
  var totalSlides = 0;
  var autoPlayTimer = null;
  var AUTO_PLAY_INTERVAL = 5000;

  /** Initialise the carousel: count slides, build dots, start auto-play. */
  function init() {
    var track = document.getElementById('testimonialsTrack');
    if (!track) return;

    totalSlides = track.querySelectorAll('.testimonial-card').length;
    if (totalSlides === 0) return;

    buildDots();
    goTo(0);

    // Only auto-play if user hasn't requested reduced motion.
    if (!prefersReducedMotion) {
      startAutoPlay();
    }

    // Pause auto-play on hover, resume on leave.
    var section = document.getElementById('testimonialsSection');
    if (section) {
      section.addEventListener('mouseenter', stopAutoPlay);
      section.addEventListener('mouseleave', function () {
        if (!prefersReducedMotion) startAutoPlay();
      });
    }
  }

  /** Create navigation dots matching the number of slides. */
  function buildDots() {
    var dotsContainer = document.getElementById('testimonialsDots');
    if (!dotsContainer) return;

    dotsContainer.innerHTML = '';
    for (var i = 0; i < totalSlides; i++) {
      var dot = document.createElement('button');
      dot.className = 'testimonial-dot';
      dot.setAttribute('aria-label', 'Go to testimonial ' + (i + 1));
      dot.dataset.index = String(i);
      dotsContainer.appendChild(dot);
    }
  }

  /** Navigate to a specific slide index. */
  function goTo(index) {
    if (index < 0) index = totalSlides - 1;
    if (index >= totalSlides) index = 0;
    currentIndex = index;

    var track = document.getElementById('testimonialsTrack');
    if (track) {
      track.style.transform = 'translateX(-' + (currentIndex * 100) + '%)';
    }

    var dots = document.querySelectorAll('.testimonial-dot');
    dots.forEach(function (dot, i) {
      dot.classList.toggle('active', i === currentIndex);
    });
  }

  /** Go to the next slide. */
  function next() {
    goTo(currentIndex + 1);
  }

  /** Go to the previous slide. */
  function prev() {
    goTo(currentIndex - 1);
  }

  /** Start the auto-play timer. */
  function startAutoPlay() {
    stopAutoPlay();
    autoPlayTimer = setInterval(next, AUTO_PLAY_INTERVAL);
  }

  /** Stop the auto-play timer. */
  function stopAutoPlay() {
    if (autoPlayTimer) {
      clearInterval(autoPlayTimer);
      autoPlayTimer = null;
    }
  }

  /** Get the current slide index. */
  function getCurrent() {
    return currentIndex;
  }

  /** Get the total number of slides. */
  function getTotal() {
    return totalSlides;
  }

  return {
    init: init,
    goTo: goTo,
    next: next,
    prev: prev,
    startAutoPlay: startAutoPlay,
    stopAutoPlay: stopAutoPlay,
    getCurrent: getCurrent,
    getTotal: getTotal,
  };
})();

// ---------------------------------------------------------------------------
// Pricing Module
// ---------------------------------------------------------------------------

var Pricing = (function () {
  var isYearly = false;

  function toggle() {
    isYearly = !isYearly;

    var toggleEl = document.getElementById('billingToggle');
    var monthlyLabel = document.getElementById('monthlyLabel');
    var yearlyLabel = document.getElementById('yearlyLabel');

    if (toggleEl) {
      toggleEl.classList.toggle('yearly', isYearly);
      toggleEl.setAttribute('aria-checked', String(isYearly));
    }
    if (monthlyLabel) monthlyLabel.classList.toggle('active-label', !isYearly);
    if (yearlyLabel) yearlyLabel.classList.toggle('active-label', isYearly);

    document.querySelectorAll('.price-amount').forEach(function (el) {
      var priceEl = el.parentElement;
      el.textContent = isYearly ? priceEl.dataset.yearly : priceEl.dataset.monthly;
    });

    document.querySelectorAll('.price-period-dynamic').forEach(function (el) {
      el.textContent = isYearly ? 'per month, billed yearly' : 'per month';
    });
  }

  return { toggle: toggle };
})();

// ---------------------------------------------------------------------------
// FAQ Module
// ---------------------------------------------------------------------------

var FAQ = (function () {
  function toggle(questionEl) {
    var item = questionEl.closest('.faq-item');
    if (!item) return;

    var wasOpen = item.classList.contains('open');

    // Close all items first (accordion behaviour).
    document.querySelectorAll('.faq-item.open').forEach(function (faq) {
      faq.classList.remove('open');
      var q = faq.querySelector('.faq-question');
      if (q) q.setAttribute('aria-expanded', 'false');
    });

    // Re-open the clicked item if it wasn't already open.
    if (!wasOpen) {
      item.classList.add('open');
      questionEl.setAttribute('aria-expanded', 'true');
    }
  }

  return { toggle: toggle };
})();

// ---------------------------------------------------------------------------
// How It Works — Scroll-triggered Step Animation
// ---------------------------------------------------------------------------

var HowItWorks = (function () {
  var observed = false;

  /** Reveal step cards with staggered animation when section scrolls into view. */
  function init() {
    var section = document.getElementById('howItWorks');
    if (!section) return;

    var steps = section.querySelectorAll('.step');
    if (steps.length === 0) return;

    // Use IntersectionObserver if available, otherwise reveal immediately.
    if ('IntersectionObserver' in window) {
      var observer = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (entry) {
            if (entry.isIntersecting && !observed) {
              observed = true;
              revealSteps(steps);
              observer.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.2 }
      );
      observer.observe(section);
    } else {
      // Fallback: reveal immediately for older browsers.
      revealSteps(steps);
    }
  }

  /** Add the visible class to each step (CSS handles staggered transition-delay). */
  function revealSteps(steps) {
    for (var i = 0; i < steps.length; i++) {
      steps[i].classList.add('visible');
    }
  }

  /** Check if steps have been revealed (useful for testing). */
  function isRevealed() {
    return observed;
  }

  /** Reset state (useful for testing). */
  function reset() {
    observed = false;
    var section = document.getElementById('howItWorks');
    if (section) {
      var steps = section.querySelectorAll('.step');
      for (var i = 0; i < steps.length; i++) {
        steps[i].classList.remove('visible');
      }
    }
  }

  return { init: init, isRevealed: isRevealed, reset: reset, revealSteps: revealSteps };
})();

// ---------------------------------------------------------------------------
// Social Proof Stats — Animated Counters
// ---------------------------------------------------------------------------

var Stats = (function () {
  var animated = false;
  var DURATION = 2000; // animation duration in ms
  var FRAME_INTERVAL = 30; // ms between updates (~33fps)

  /**
   * Easing function — ease-out cubic for a satisfying deceleration.
   * @param {number} t - Progress from 0 to 1
   * @returns {number} Eased value from 0 to 1
   */
  function easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
  }

  /**
   * Format a number with commas as thousand separators.
   * @param {number} n
   * @returns {string}
   */
  function formatNumber(n) {
    return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }

  /**
   * Animate a single stat card's number from 0 to its target value.
   * @param {Element} card - The .stat-card element
   */
  function animateCard(card) {
    var numberEl = card.querySelector('.stat-number');
    if (!numberEl) return;

    var target = parseInt(card.dataset.target, 10);
    var suffix = card.dataset.suffix || '';
    var decimal = card.dataset.decimal || '';
    var prefix = '';

    // Check if the display starts with < (e.g., "<2s")
    if (numberEl.textContent.indexOf('<') === 0) {
      prefix = '<';
    }

    if (isNaN(target)) return;

    // Cancel any existing timer on this element to prevent stacking
    if (card._statsTimer) {
      clearInterval(card._statsTimer);
      card._statsTimer = null;
    }

    var frames = Math.ceil(DURATION / FRAME_INTERVAL);
    var frame = 0;
    var prev = -1;

    var timer = setInterval(function () {
      frame++;
      var progress = Math.min(frame / frames, 1);
      var easedProgress = easeOutCubic(progress);
      var current = Math.round(easedProgress * target);

      // Ensure monotonic progression — never go backwards
      if (current < prev) current = prev;
      prev = current;

      // Early exit if we've reached the target
      if (current === target || progress >= 1) {
        clearInterval(timer);
        card._statsTimer = null;

        var finalDisplay = prefix + formatNumber(target);
        if (decimal) {
          finalDisplay = prefix + formatNumber(target) + '.' + decimal;
        }
        finalDisplay += suffix;
        numberEl.textContent = finalDisplay;
        card.classList.add('animated');
        return;
      }

      var display = prefix + formatNumber(current);
      display += suffix;

      numberEl.textContent = display;
    }, FRAME_INTERVAL);

    card._statsTimer = timer;
  }

  /**
   * Animate all stat cards in the section.
   * If prefers-reduced-motion is set, show final values immediately.
   * @param {NodeList|Array} cards - The .stat-card elements
   */
  function animateAll(cards) {
    if (prefersReducedMotion) {
      // Skip animation — show final values immediately
      for (var i = 0; i < cards.length; i++) {
        showFinalValue(cards[i]);
      }
    } else {
      for (var i = 0; i < cards.length; i++) {
        animateCard(cards[i]);
      }
    }
    animated = true;
  }

  /**
   * Show the final stat value without animation.
   * @param {Element} card - A .stat-card element
   */
  function showFinalValue(card) {
    var numberEl = card.querySelector('.stat-number');
    if (!numberEl) return;

    var target = parseInt(card.dataset.target, 10);
    var suffix = card.dataset.suffix || '';
    var decimal = card.dataset.decimal || '';
    var prefix = '';

    if (numberEl.textContent.indexOf('<') === 0) {
      prefix = '<';
    }

    if (isNaN(target)) return;

    var display = prefix + formatNumber(target);
    if (decimal) display += '.' + decimal;
    display += suffix;
    numberEl.textContent = display;
    card.classList.add('animated');
  }

  /** Initialize — observe the stats section for scroll-triggered animation. */
  function init() {
    var section = document.getElementById('statsSection');
    if (!section) return;

    var cards = section.querySelectorAll('.stat-card');
    if (cards.length === 0) return;

    if ('IntersectionObserver' in window) {
      var observer = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (entry) {
            if (entry.isIntersecting && !animated) {
              animateAll(cards);
              observer.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.3 }
      );
      observer.observe(section);
    } else {
      // Fallback: animate immediately.
      animateAll(cards);
    }
  }

  /** Check whether the animation has already played. */
  function isAnimated() {
    return animated;
  }

  /** Reset state for testing. */
  function reset() {
    animated = false;
    var section = document.getElementById('statsSection');
    if (section) {
      var cards = section.querySelectorAll('.stat-card');
      for (var i = 0; i < cards.length; i++) {
        cards[i].classList.remove('animated');
        var numEl = cards[i].querySelector('.stat-number');
        if (numEl) numEl.textContent = '0';
      }
    }
  }

  return {
    init: init,
    isAnimated: isAnimated,
    reset: reset,
    animateAll: animateAll,
    animateCard: animateCard,
    formatNumber: formatNumber,
    easeOutCubic: easeOutCubic,
    DURATION: DURATION,
    FRAME_INTERVAL: FRAME_INTERVAL
  };
})();

// ---------------------------------------------------------------------------
// Use Cases Tabbed Section
// ---------------------------------------------------------------------------

var UseCases = (function () {
  var currentTab = 'dev';
  var initialized = false;

  /**
   * Switch to a different use-case tab.
   * Updates ARIA attributes, active classes, and panel visibility.
   * @param {string} tabId  The data-usecase value to switch to.
   */
  function switchTo(tabId) {
    if (!tabId || tabId === currentTab) return;

    var section = document.getElementById('usecasesSection');
    if (!section) return;

    // Deactivate current tab button.
    var tabs = section.querySelectorAll('.usecase-tab');
    var panels = section.querySelectorAll('.usecase-panel');

    var found = false;
    for (var i = 0; i < tabs.length; i++) {
      if (tabs[i].dataset.usecase === tabId) {
        found = true;
        break;
      }
    }
    if (!found) return;

    for (var j = 0; j < tabs.length; j++) {
      var isTarget = tabs[j].dataset.usecase === tabId;
      tabs[j].classList.toggle('active', isTarget);
      tabs[j].setAttribute('aria-selected', isTarget ? 'true' : 'false');
      tabs[j].setAttribute('tabindex', isTarget ? '0' : '-1');
    }

    for (var k = 0; k < panels.length; k++) {
      var panelId = panels[k].id;
      var isActive = panelId === 'usecase-' + tabId;
      panels[k].classList.toggle('active', isActive);
      if (isActive) {
        panels[k].removeAttribute('hidden');
      } else {
        panels[k].setAttribute('hidden', '');
      }
    }

    currentTab = tabId;
  }

  /** Return the current active tab id. */
  function getCurrent() {
    return currentTab;
  }

  /** Get list of all available tab ids. */
  function getTabs() {
    var section = document.getElementById('usecasesSection');
    if (!section) return [];
    var tabs = section.querySelectorAll('.usecase-tab');
    var ids = [];
    for (var i = 0; i < tabs.length; i++) {
      if (tabs[i].dataset.usecase) ids.push(tabs[i].dataset.usecase);
    }
    return ids;
  }

  /**
   * Initialise tabindex values for tabs (keyboard support).
   * Click and keyboard event delegation is handled in the
   * DOMContentLoaded block to avoid stale closure issues.
   */
  function init() {
    var section = document.getElementById('usecasesSection');
    if (!section) return;

    var tablist = section.querySelector('[role="tablist"]');
    if (!tablist) return;

    // Set initial tabindex values.
    var tabs = tablist.querySelectorAll('.usecase-tab');
    for (var i = 0; i < tabs.length; i++) {
      tabs[i].setAttribute('tabindex', tabs[i].classList.contains('active') ? '0' : '-1');
    }
  }

  return {
    switchTo: switchTo,
    getCurrent: getCurrent,
    getTabs: getTabs,
    init: init
  };
})();

// ---------------------------------------------------------------------------
// Integrations Module — category filtering for integrations grid
// ---------------------------------------------------------------------------

var Integrations = (function () {
  var currentCategory = 'all';

  /**
   * Filter integration cards by category.
   * @param {string} category  The data-category to show, or 'all'.
   */
  function filterBy(category) {
    if (!category) return;

    var section = document.getElementById('integrationsSection');
    if (!section) return;

    var cards = section.querySelectorAll('.integration-card');
    var buttons = section.querySelectorAll('.integration-filter-btn');

    // Update filter buttons
    for (var i = 0; i < buttons.length; i++) {
      var isActive = buttons[i].dataset.category === category;
      buttons[i].classList.toggle('active', isActive);
      buttons[i].setAttribute('aria-selected', isActive ? 'true' : 'false');
    }

    // Show/hide cards
    var visibleCount = 0;
    for (var j = 0; j < cards.length; j++) {
      var match = category === 'all' || cards[j].dataset.category === category;
      cards[j].classList.toggle('hidden', !match);
      if (match) visibleCount++;
    }

    currentCategory = category;
    return visibleCount;
  }

  /** Get the current active category. */
  function getCurrent() {
    return currentCategory;
  }

  /** Get all available categories. */
  function getCategories() {
    var section = document.getElementById('integrationsSection');
    if (!section) return [];
    var buttons = section.querySelectorAll('.integration-filter-btn');
    var cats = [];
    for (var i = 0; i < buttons.length; i++) {
      if (buttons[i].dataset.category) cats.push(buttons[i].dataset.category);
    }
    return cats;
  }

  /** Get integration cards data. */
  function getIntegrations(category) {
    var section = document.getElementById('integrationsSection');
    if (!section) return [];
    var cards = section.querySelectorAll('.integration-card');
    var result = [];
    for (var i = 0; i < cards.length; i++) {
      var card = cards[i];
      if (category && category !== 'all' && card.dataset.category !== category) continue;
      result.push({
        name: card.querySelector('h3') ? card.querySelector('h3').textContent : '',
        category: card.dataset.category || '',
        status: card.dataset.status || '',
        description: card.querySelector('p') ? card.querySelector('p').textContent : ''
      });
    }
    return result;
  }

  /** Get count by status (live/coming). */
  function getStatusCounts() {
    var integrations = getIntegrations();
    var counts = { live: 0, coming: 0 };
    for (var i = 0; i < integrations.length; i++) {
      if (integrations[i].status === 'live') counts.live++;
      else if (integrations[i].status === 'coming') counts.coming++;
    }
    return counts;
  }

  /** Initialize click handlers on filter buttons. */
  function init() {
    var section = document.getElementById('integrationsSection');
    if (!section) return;

    var filterContainer = section.querySelector('.integrations-filter');
    if (!filterContainer) return;

    filterContainer.addEventListener('click', function (e) {
      var btn = e.target.closest('.integration-filter-btn');
      if (!btn || !btn.dataset.category) return;
      filterBy(btn.dataset.category);
    });
  }

  return {
    filterBy: filterBy,
    getCurrent: getCurrent,
    getCategories: getCategories,
    getIntegrations: getIntegrations,
    getStatusCounts: getStatusCounts,
    init: init
  };
})();

// ---------------------------------------------------------------------------
// Changelog Module
// ---------------------------------------------------------------------------

var Changelog = (function () {
  var currentTag = 'all';

  /**
   * Filter changelog entries by tag.
   * @param {string} tag  The data-tag to show, or 'all'.
   * @returns {number} Number of visible entries.
   */
  function filterBy(tag) {
    if (!tag) return 0;

    var section = document.getElementById('changelogSection');
    if (!section) return 0;

    var entries = section.querySelectorAll('.changelog-entry');
    var buttons = section.querySelectorAll('.changelog-filter-btn');

    // Update filter buttons
    for (var i = 0; i < buttons.length; i++) {
      var isActive = buttons[i].dataset.tag === tag;
      buttons[i].classList.toggle('active', isActive);
      buttons[i].setAttribute('aria-selected', isActive ? 'true' : 'false');
    }

    // Show/hide entries
    var visibleCount = 0;
    for (var j = 0; j < entries.length; j++) {
      var match = tag === 'all' || entries[j].dataset.tag === tag;
      entries[j].classList.toggle('hidden', !match);
      if (match) visibleCount++;
    }

    currentTag = tag;
    return visibleCount;
  }

  /** Get the current active tag filter. */
  function getCurrent() {
    return currentTag;
  }

  /** Get all available filter tags. */
  function getTags() {
    var section = document.getElementById('changelogSection');
    if (!section) return [];
    var buttons = section.querySelectorAll('.changelog-filter-btn');
    var tags = [];
    for (var i = 0; i < buttons.length; i++) {
      if (buttons[i].dataset.tag) tags.push(buttons[i].dataset.tag);
    }
    return tags;
  }

  /** Get changelog entries data, optionally filtered by tag. */
  function getEntries(tag) {
    var section = document.getElementById('changelogSection');
    if (!section) return [];
    var entries = section.querySelectorAll('.changelog-entry');
    var result = [];
    for (var i = 0; i < entries.length; i++) {
      var entry = entries[i];
      if (tag && tag !== 'all' && entry.dataset.tag !== tag) continue;
      var content = entry.querySelector('.changelog-content');
      result.push({
        tag: entry.dataset.tag || '',
        date: entry.querySelector('.changelog-date') ? entry.querySelector('.changelog-date').textContent : '',
        title: content && content.querySelector('h3') ? content.querySelector('h3').textContent : '',
        description: content && content.querySelector('p') ? content.querySelector('p').textContent : ''
      });
    }
    return result;
  }

  /** Get count of entries by tag. */
  function getTagCounts() {
    var entries = getEntries();
    var counts = { feature: 0, improvement: 0, fix: 0 };
    for (var i = 0; i < entries.length; i++) {
      if (counts[entries[i].tag] !== undefined) counts[entries[i].tag]++;
    }
    return counts;
  }

  /** Initialize click handlers on filter buttons. */
  function init() {
    var section = document.getElementById('changelogSection');
    if (!section) return;

    var filterContainer = section.querySelector('.changelog-filter');
    if (!filterContainer) return;

    filterContainer.addEventListener('click', function (e) {
      var btn = e.target.closest('.changelog-filter-btn');
      if (!btn || !btn.dataset.tag) return;
      filterBy(btn.dataset.tag);
    });
  }

  return {
    filterBy: filterBy,
    getCurrent: getCurrent,
    getTags: getTags,
    getEntries: getEntries,
    getTagCounts: getTagCounts,
    init: init
  };
})();

// ---------------------------------------------------------------------------
// Event Binding (replaces inline onclick handlers)
// ---------------------------------------------------------------------------

document.addEventListener('DOMContentLoaded', function () {
  // Scenario buttons — event delegation on the container.
  var scenarioContainer = document.querySelector('.demo-scenarios');
  if (scenarioContainer) {
    scenarioContainer.addEventListener('click', function (e) {
      var btn = e.target.closest('.scenario-btn');
      if (!btn) return;
      var scenario = btn.dataset.scenario;
      if (scenario) ChatDemo.switchTo(scenario);
    });
  }

  // Testimonials carousel — init and event delegation.
  Testimonials.init();

  var testimonialsNav = document.querySelector('.testimonials-nav');
  if (testimonialsNav) {
    testimonialsNav.addEventListener('click', function (e) {
      var arrow = e.target.closest('.testimonial-arrow');
      if (arrow) {
        if (arrow.classList.contains('testimonial-prev')) {
          Testimonials.prev();
        } else if (arrow.classList.contains('testimonial-next')) {
          Testimonials.next();
        }
        return;
      }
      var dot = e.target.closest('.testimonial-dot');
      if (dot && dot.dataset.index !== undefined) {
        Testimonials.goTo(parseInt(dot.dataset.index, 10));
      }
    });
  }

  // Billing toggle — click + keyboard.
  var billingToggle = document.getElementById('billingToggle');
  if (billingToggle) {
    billingToggle.addEventListener('click', Pricing.toggle);
    billingToggle.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        Pricing.toggle();
      }
    });
  }

  // FAQ accordion — event delegation on the section (click + keyboard).
  var faqSection = document.querySelector('.faq-section');
  if (faqSection) {
    faqSection.addEventListener('click', function (e) {
      var question = e.target.closest('.faq-question');
      if (question) FAQ.toggle(question);
    });
    faqSection.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') {
        var question = e.target.closest('.faq-question');
        if (question) {
          e.preventDefault();
          FAQ.toggle(question);
        }
      }
    });
  }

  // How It Works — scroll animation.
  HowItWorks.init();

  // Use Cases — tabbed section (init + delegation).
  UseCases.init();

  var usecasesSection = document.getElementById('usecasesSection');
  if (usecasesSection) {
    var usecasesTablist = usecasesSection.querySelector('[role="tablist"]');
    if (usecasesTablist && !usecasesTablist.dataset.bound) {
      usecasesTablist.dataset.bound = '1';
      // Click delegation.
      usecasesTablist.addEventListener('click', function (e) {
        var tab = e.target.closest('.usecase-tab');
        if (tab && tab.dataset.usecase) {
          window.UseCases.switchTo(tab.dataset.usecase);
        }
      });

      // Keyboard navigation (arrow keys, Home, End).
      usecasesTablist.addEventListener('keydown', function (e) {
        var tabs = usecasesTablist.querySelectorAll('.usecase-tab');
        if (tabs.length === 0) return;

        var currentIndex = -1;
        for (var ci = 0; ci < tabs.length; ci++) {
          if (tabs[ci].classList.contains('active')) {
            currentIndex = ci;
            break;
          }
        }

        var newIndex = currentIndex;

        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
          e.preventDefault();
          newIndex = (currentIndex + 1) % tabs.length;
        } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
          e.preventDefault();
          newIndex = (currentIndex - 1 + tabs.length) % tabs.length;
        } else if (e.key === 'Home') {
          e.preventDefault();
          newIndex = 0;
        } else if (e.key === 'End') {
          e.preventDefault();
          newIndex = tabs.length - 1;
        }

        if (newIndex !== currentIndex && newIndex >= 0) {
          window.UseCases.switchTo(tabs[newIndex].dataset.usecase);
          tabs[newIndex].focus();
        }
      });
    }
  }

  // Stats — animated counters on scroll.
  Stats.init();

  // Integrations — category filter.
  Integrations.init();

  // Changelog — tag filter.
  Changelog.init();

  // Sticky navigation bar.
  SiteNav.init();

  // Auto-play the default scenario.
  ChatDemo.play('memory');
});

// ---------------------------------------------------------------------------
// Sticky Navigation Bar
// ---------------------------------------------------------------------------

var SiteNav = (function () {
  var nav = null;
  var links = [];
  var sections = [];
  var toggle = null;
  var linksContainer = null;
  var activeLink = null;
  var ticking = false;

  function init() {
    nav = document.getElementById('siteNav');
    toggle = document.getElementById('navToggle');
    linksContainer = document.getElementById('navLinks');
    if (!nav || !linksContainer) return;

    // Collect nav links and their target sections
    var anchors = linksContainer.querySelectorAll('a[href^="#"]');
    for (var i = 0; i < anchors.length; i++) {
      var href = anchors[i].getAttribute('href');
      var target = document.querySelector(href);
      if (target) {
        links.push(anchors[i]);
        sections.push(target);
      }
    }

    // Smooth scroll + close mobile menu on click
    linksContainer.addEventListener('click', function (e) {
      var a = e.target.closest('a[href^="#"]');
      if (!a) return;
      e.preventDefault();
      var target = document.querySelector(a.getAttribute('href'));
      if (target) {
        target.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth', block: 'start' });
      }
      closeMenu();
    });

    // Logo scroll to top
    var logo = nav.querySelector('.nav-logo');
    if (logo) {
      logo.addEventListener('click', function (e) {
        e.preventDefault();
        window.scrollTo({ top: 0, behavior: prefersReducedMotion ? 'auto' : 'smooth' });
        closeMenu();
      });
    }

    // Mobile hamburger toggle
    if (toggle) {
      toggle.addEventListener('click', function () {
        var expanded = toggle.getAttribute('aria-expanded') === 'true';
        toggle.setAttribute('aria-expanded', String(!expanded));
        linksContainer.classList.toggle('open');
      });
    }

    // Close menu on Escape
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeMenu();
    });

    // Scroll listener for active link + scrolled class
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  function closeMenu() {
    if (toggle) toggle.setAttribute('aria-expanded', 'false');
    if (linksContainer) linksContainer.classList.remove('open');
  }

  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () {
      ticking = false;
      updateScrolledClass();
      updateActiveLink();
    });
  }

  function updateScrolledClass() {
    if (!nav) return;
    if (window.scrollY > 40) {
      nav.classList.add('scrolled');
    } else {
      nav.classList.remove('scrolled');
    }
  }

  function updateActiveLink() {
    var scrollY = window.scrollY + 100; // offset for nav height + margin
    var current = null;

    for (var i = sections.length - 1; i >= 0; i--) {
      if (sections[i].offsetTop <= scrollY) {
        current = links[i];
        break;
      }
    }

    if (current !== activeLink) {
      if (activeLink) activeLink.classList.remove('active');
      if (current) current.classList.add('active');
      activeLink = current;
    }
  }

  function getActiveSection() {
    return activeLink ? activeLink.getAttribute('href').slice(1) : null;
  }

  function reset() {
    if (activeLink) activeLink.classList.remove('active');
    activeLink = null;
    closeMenu();
  }

  return {
    init: init,
    getActiveSection: getActiveSection,
    reset: reset,
    closeMenu: closeMenu
  };
})();

/* eslint-enable no-var */

// Expose modules globally for external access and testability.
if (typeof window !== 'undefined') {
  window.SCENARIOS = SCENARIOS;
  window.ChatDemo = ChatDemo;
  window.Testimonials = Testimonials;
  window.Pricing = Pricing;
  window.FAQ = FAQ;
  window.HowItWorks = HowItWorks;
  window.Stats = Stats;
  window.UseCases = UseCases;
  window.Integrations = Integrations;
  window.Changelog = Changelog;
  window.SiteNav = SiteNav;
}

