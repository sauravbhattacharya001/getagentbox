/**
 * AgentBox Landing Page - Interactive Components
 *
 * Modules:
 *  - ChatDemo:       animated chat scenario player
 *  - Testimonials:   auto-rotating testimonials carousel
 *  - Pricing:        monthly/yearly billing toggle
 *  - FAQ:            accordion behaviour
 *  - Stats:          animated social proof counters
 *  - Trust:          expandable privacy detail cards
 */

/** Global reduced-motion check (WCAG 2.3.3 compliance). */
var prefersReducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// ---------------------------------------------------------------------------
// Chat Demo Scenarios
// ---------------------------------------------------------------------------

/* exported SCENARIOS, ChatDemo, Testimonials, Pricing, FAQ, Stats, Trust */
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
    { role: 'bot', text: 'Here are some rain-friendly options:\n\n🌲 Twin Falls (easy, 2.6 mi) - waterfall is amazing after rain\n🏔️ Rattlesnake Ledge (moderate, 4 mi) - canopy cover most of the way\n🌿 Discovery Park Loop (easy, 2.8 mi) - scenic + mostly sheltered\n\nI\'d go Twin Falls if you want the payoff. Want directions?' },
  ],
  reminder: [
    { role: 'user', text: 'Remind me to take my medicine in 30 minutes' },
    { role: 'bot', text: 'Got it! I\'ll ping you in 30 minutes to take your medicine 💊' },
    { role: 'user', text: 'Also remind me about the team standup at 9am tomorrow' },
    { role: 'bot', text: 'Done! Two reminders set:\n\n⏰ In 30 min - take medicine\n⏰ Tomorrow 9:00 AM - team standup\n\nI\'ll make sure you don\'t miss either one.' },
  ],
  image: [
    { role: 'user', text: '📷 [sends a photo of an error message on their screen]' },
    { role: 'bot', text: 'I can see the error - it\'s a CORS issue. Your frontend at localhost:3000 is trying to hit an API on a different port without the right headers.\n\nQuick fix: add this to your server:\n\n`Access-Control-Allow-Origin: *`\n\nOr if you\'re using Express:\n`app.use(cors())`\n\nWant me to walk through the full setup?' },
    { role: 'user', text: 'That fixed it, thanks!' },
    { role: 'bot', text: 'Nice! 🎉 Pro tip: in production, replace the wildcard `*` with your actual domain for security. Let me know if anything else comes up.' },
  ],
});

// ---------------------------------------------------------------------------
// Shared Utilities
// ---------------------------------------------------------------------------

/**
 * Reusable typing indicator template.
 * Shared between ChatDemo and Playground — clone with cloneNode(true).
 */
var _typingIndicatorTemplate = (function () {
  var el = document.createElement('div');
  el.className = 'typing-indicator';
  for (var i = 0; i < 3; i++) el.appendChild(document.createElement('span'));
  return el;
})();

// ---------------------------------------------------------------------------
// Chat Demo Module
// ---------------------------------------------------------------------------

var ChatDemo = (function () {
  var animationTimer = null;
  var animationGeneration = 0;
  var scrollRafId = 0;
  /** Cached scenario buttons — avoids querySelectorAll on every switch. */
  var _scenarioBtns = null;

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
        var typing = _typingIndicatorTemplate.cloneNode(true);
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
    if (!_scenarioBtns) {
      _scenarioBtns = document.querySelectorAll('.scenario-btn');
    }
    for (var i = 0; i < _scenarioBtns.length; i++) {
      _scenarioBtns[i].classList.toggle('active', _scenarioBtns[i].dataset.scenario === name);
    }
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

  // Cached DOM references — avoid re-querying on every goTo() call.
  // goTo() runs every 5s via autoplay; caching eliminates ~12
  // getElementById + querySelectorAll calls per minute.
  var _track = null;
  var _dots = [];

  /** Initialise the carousel: count slides, build dots, start auto-play. */
  function init() {
    _track = document.getElementById('testimonialsTrack');
    if (!_track) return;

    totalSlides = _track.querySelectorAll('.testimonial-card').length;
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
    _dots = [];
    for (var i = 0; i < totalSlides; i++) {
      var dot = document.createElement('button');
      dot.className = 'testimonial-dot';
      dot.setAttribute('aria-label', 'Go to testimonial ' + (i + 1));
      dot.dataset.index = String(i);
      dotsContainer.appendChild(dot);
      _dots.push(dot);
    }
  }

  /** Navigate to a specific slide index. */
  function goTo(index) {
    if (index < 0) index = totalSlides - 1;
    if (index >= totalSlides) index = 0;
    currentIndex = index;

    if (_track) {
      _track.style.transform = 'translateX(-' + (currentIndex * 100) + '%)';
    }

    for (var i = 0; i < _dots.length; i++) {
      _dots[i].classList.toggle('active', i === currentIndex);
    }
  }

  /** Go to the next slide. Restarts autoplay to avoid premature advances. */
  function next() {
    goTo(currentIndex + 1);
    if (autoPlayTimer) startAutoPlay();
  }

  /** Go to the previous slide. Restarts autoplay to avoid premature advances. */
  function prev() {
    goTo(currentIndex - 1);
    if (autoPlayTimer) startAutoPlay();
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

  // Cached DOM references — resolved once, reused on each toggle.
  var _toggleEl = null;
  var _monthlyLabel = null;
  var _yearlyLabel = null;
  var _priceAmounts = null;
  var _pricePeriods = null;
  var _resolved = false;

  function _resolve() {
    if (_resolved) return;
    _toggleEl = document.getElementById('billingToggle');
    _monthlyLabel = document.getElementById('monthlyLabel');
    _yearlyLabel = document.getElementById('yearlyLabel');
    _priceAmounts = document.querySelectorAll('.price-amount');
    _pricePeriods = document.querySelectorAll('.price-period-dynamic');
    _resolved = true;
  }

  function toggle() {
    isYearly = !isYearly;
    _resolve();

    if (_toggleEl) {
      _toggleEl.classList.toggle('yearly', isYearly);
      _toggleEl.setAttribute('aria-checked', String(isYearly));
    }
    if (_monthlyLabel) _monthlyLabel.classList.toggle('active-label', !isYearly);
    if (_yearlyLabel) _yearlyLabel.classList.toggle('active-label', isYearly);

    for (var pi = 0; pi < _priceAmounts.length; pi++) {
      var priceEl = _priceAmounts[pi].parentElement;
      _priceAmounts[pi].textContent = isYearly ? priceEl.dataset.yearly : priceEl.dataset.monthly;
    }
    for (var pj = 0; pj < _pricePeriods.length; pj++) {
      _pricePeriods[pj].textContent = isYearly ? 'per month, billed yearly' : 'per month';
    }
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

    // Close sibling items (accordion behaviour).
    // Scoped to parent container instead of full document scan.
    var siblings = item.parentElement ? item.parentElement.querySelectorAll('.faq-item.open') : [];
    for (var si = 0; si < siblings.length; si++) {
      siblings[si].classList.remove('open');
      var q = siblings[si].querySelector('.faq-question');
      if (q) q.setAttribute('aria-expanded', 'false');
    }

    // Re-open the clicked item if it wasn't already open.
    if (!wasOpen) {
      item.classList.add('open');
      questionEl.setAttribute('aria-expanded', 'true');
    }
  }

  return { toggle: toggle };
})();

// ---------------------------------------------------------------------------
// How It Works - Scroll-triggered Step Animation
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
// Social Proof Stats - Animated Counters
// ---------------------------------------------------------------------------

var Stats = (function () {
  var animated = false;
  var DURATION = 2000; // animation duration in ms

  /**
   * Easing function - ease-out cubic for a satisfying deceleration.
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
   * Uses requestAnimationFrame for smooth 60fps animation instead of
   * setInterval which can cause jank and layout thrashing.
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

    // Cancel any existing animation on this element to prevent stacking
    if (card._statsRafId) {
      cancelAnimationFrame(card._statsRafId);
      card._statsRafId = null;
    }

    var startTime = null;
    var prev = -1;

    function tick(timestamp) {
      if (!startTime) startTime = timestamp;
      var elapsed = timestamp - startTime;
      var progress = Math.min(elapsed / DURATION, 1);
      var easedProgress = easeOutCubic(progress);
      var current = Math.round(easedProgress * target);

      // Ensure monotonic progression - never go backwards
      if (current < prev) current = prev;
      prev = current;

      // Final frame
      if (current === target || progress >= 1) {
        card._statsRafId = null;

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
      if (decimal) display += '.' + decimal;
      display += suffix;
      numberEl.textContent = display;

      card._statsRafId = requestAnimationFrame(tick);
    }

    card._statsRafId = requestAnimationFrame(tick);
  }

  /**
   * Animate all stat cards in the section.
   * If prefers-reduced-motion is set, show final values immediately.
   * @param {NodeList|Array} cards - The .stat-card elements
   */
  function animateAll(cards) {
    if (prefersReducedMotion) {
      // Skip animation - show final values immediately
      for (var i = 0; i < cards.length; i++) {
        showFinalValue(cards[i]);
      }
    } else {
      for (var j = 0; j < cards.length; j++) {
        animateCard(cards[j]);
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

  /** Initialize - observe the stats section for scroll-triggered animation. */
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
        if (cards[i]._statsRafId) {
          cancelAnimationFrame(cards[i]._statsRafId);
          cards[i]._statsRafId = null;
        }
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
    DURATION: DURATION
  };
})();

// ---------------------------------------------------------------------------
// Use Cases Tabbed Section
// ---------------------------------------------------------------------------

var UseCases = (function () {
  var currentTab = 'dev';
  var _section = null;

  /** Lazily resolve the section element (cache on first use). */
  function section() {
    if (!_section) _section = document.getElementById('usecasesSection');
    return _section;
  }

  /**
   * Switch to a different use-case tab.
   * Updates ARIA attributes, active classes, and panel visibility.
   * @param {string} tabId  The data-usecase value to switch to.
   */
  function switchTo(tabId) {
    if (!tabId || tabId === currentTab) return;

    if (!section()) return;

    // Deactivate current tab button.
    var tabs = section().querySelectorAll('.usecase-tab');
    var panels = section().querySelectorAll('.usecase-panel');

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
    if (!section()) return [];
    var tabs = section().querySelectorAll('.usecase-tab');
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
    _section = document.getElementById('usecasesSection');
    if (!section()) return;

    var tablist = section().querySelector('[role="tablist"]');
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
// Integrations Module - category filtering for integrations grid
// ---------------------------------------------------------------------------

var Integrations = (function () {
  var currentCategory = 'all';
  var _section = null;

  /** Lazily resolve the section element (cache on first use). */
  function section() {
    if (!_section) _section = document.getElementById('integrationsSection');
    return _section;
  }

  /**
   * Filter integration cards by category.
   * @param {string} category  The data-category to show, or 'all'.
   */
  function filterBy(category) {
    if (!category) return;

    if (!section()) return;

    var cards = section().querySelectorAll('.integration-card');
    var buttons = section().querySelectorAll('.integration-filter-btn');

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
    if (!section()) return [];
    var buttons = section().querySelectorAll('.integration-filter-btn');
    var cats = [];
    for (var i = 0; i < buttons.length; i++) {
      if (buttons[i].dataset.category) cats.push(buttons[i].dataset.category);
    }
    return cats;
  }

  /** Get integration cards data. */
  function getIntegrations(category) {
    if (!section()) return [];
    var cards = section().querySelectorAll('.integration-card');
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
    _section = document.getElementById('integrationsSection');
    if (!section()) return;

    var filterContainer = section().querySelector('.integrations-filter');
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
  var _section = null;

  /** Lazily resolve the section element (cache on first use). */
  function section() {
    if (!_section) _section = document.getElementById('changelogSection');
    return _section;
  }

  /**
   * Filter changelog entries by tag.
   * @param {string} tag  The data-tag to show, or 'all'.
   * @returns {number} Number of visible entries.
   */
  function filterBy(tag) {
    if (!tag) return 0;

    if (!section()) return 0;

    // Lazy-init cached arrays (avoids DOM queries on repeat calls)
    if (_filterBtns.length === 0) {
      _filterBtns = Array.prototype.slice.call(
        section().querySelectorAll('.changelog-filter-btn')
      );
    }
    if (_entries.length === 0) {
      _entries = Array.prototype.slice.call(
        section().querySelectorAll('.changelog-entry')
      );
    }

    for (var i = 0; i < _filterBtns.length; i++) {
      var isActive = _filterBtns[i].dataset.tag === tag;
      _filterBtns[i].classList.toggle('active', isActive);
      _filterBtns[i].setAttribute('aria-selected', isActive ? 'true' : 'false');
    }

    var visibleCount = 0;
    for (var j = 0; j < _entries.length; j++) {
      var match = tag === 'all' || _entries[j].dataset.tag === tag;
      _entries[j].classList.toggle('hidden', !match);
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
    if (!section()) return [];
    var buttons = section().querySelectorAll('.changelog-filter-btn');
    var tags = [];
    for (var i = 0; i < buttons.length; i++) {
      if (buttons[i].dataset.tag) tags.push(buttons[i].dataset.tag);
    }
    return tags;
  }

  /** Get changelog entries data, optionally filtered by tag. */
  function getEntries(tag) {
    if (!section()) return [];
    var entries = section().querySelectorAll('.changelog-entry');
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

  /** Cached DOM collections — resolved once on init. */
  var _filterBtns = [];
  var _entries = [];

  /** Initialize click handlers on filter buttons. */
  function init() {
    _section = document.getElementById('changelogSection');
    if (!section()) return;

    _filterBtns = Array.prototype.slice.call(
      section().querySelectorAll('.changelog-filter-btn')
    );
    _entries = Array.prototype.slice.call(
      section().querySelectorAll('.changelog-entry')
    );

    var filterContainer = section().querySelector('.changelog-filter');
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
// Trust & Privacy - Expandable Detail Cards
// ---------------------------------------------------------------------------

var Trust = (function () {
  /**
   * Toggle the detail panel on a trust card.
   * Only one card can be expanded at a time (accordion).
   */
  function toggle(card) {
    if (!card || !card.classList.contains('trust-card')) return;

    var detail = card.querySelector('.trust-detail');
    if (!detail) return;

    var wasExpanded = card.classList.contains('expanded');

    // Collapse sibling cards (accordion).
    // Scoped to parent instead of full document scan.
    var parent = card.parentElement;
    if (parent) {
      var expanded = parent.querySelectorAll('.trust-card.expanded');
      for (var ei = 0; ei < expanded.length; ei++) {
        expanded[ei].classList.remove('expanded');
        var d = expanded[ei].querySelector('.trust-detail');
        if (d) d.hidden = true;
      }
    }

    // Toggle the clicked card.
    if (!wasExpanded) {
      card.classList.add('expanded');
      detail.hidden = false;
    }
  }

  return { toggle: toggle };
})();

// ---------------------------------------------------------------------------
// Event Binding (replaces inline onclick handlers)
// ---------------------------------------------------------------------------


// ── Shared Helpers ────────────────────────────────────────────────────

/**
 * Set up arrow-key (+ Home/End) keyboard navigation on a group of buttons.
 * Handles wrapping at both ends.  The caller-supplied callback receives
 * the newly-focused element so it can trigger module-specific actions
 * (e.g. tab switch, filter click).
 *
 * @param {Element}  container  The element to listen on (event delegation).
 * @param {string}   selector   CSS selector for the navigable children.
 * @param {function} onNavigate Called with (element, index) when focus moves.
 */
function arrowKeyNav(container, selector, onNavigate) {
  container.addEventListener('keydown', function (e) {
    var items = Array.prototype.slice.call(
      container.querySelectorAll(selector)
    );
    if (items.length === 0) return;

    var idx = items.indexOf(e.target);
    // Only handle events originating from one of the navigable items.
    if (idx === -1) return;

    var next = -1;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      next = (idx + 1) % items.length;
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      next = (idx - 1 + items.length) % items.length;
    } else if (e.key === 'Home') {
      next = 0;
    } else if (e.key === 'End') {
      next = items.length - 1;
    }

    if (next >= 0 && next !== idx) {
      e.preventDefault();
      onNavigate(items[next], next);
    }
  });
}

document.addEventListener('DOMContentLoaded', function () {
  // Scenario buttons - event delegation on the container.
  var scenarioContainer = document.querySelector('.demo-scenarios');
  if (scenarioContainer) {
    scenarioContainer.addEventListener('click', function (e) {
      var btn = e.target.closest('.scenario-btn');
      if (!btn) return;
      var scenario = btn.dataset.scenario;
      if (scenario) ChatDemo.switchTo(scenario);
    });
  }

  // Testimonials carousel - init and event delegation.
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
        // Reset autoplay timer so next auto-advance waits a full interval
        Testimonials.stopAutoPlay();
        Testimonials.startAutoPlay();
      }
    });
  }

  // Billing toggle - click + keyboard.
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

  // FAQ accordion - event delegation on the section (click + keyboard).
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

  // How It Works - scroll animation.
  HowItWorks.init();

  // Trust & Privacy - expandable cards (click + keyboard).
  var trustSection = document.querySelector('.trust-section');

  // System status dashboard.
  StatusDashboard.init();
  if (trustSection) {
    trustSection.addEventListener('click', function (e) {
      var card = e.target.closest('.trust-card');
      if (card) Trust.toggle(card);
    });
    trustSection.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') {
        var card = e.target.closest('.trust-card');
        if (card) {
          e.preventDefault();
          Trust.toggle(card);
        }
      }
    });
  }

  // Use Cases - tabbed section (init + delegation).
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
      arrowKeyNav(usecasesTablist, '.usecase-tab', function (tab) {
        window.UseCases.switchTo(tab.dataset.usecase);
        tab.focus();
      });
    }
  }

  // Stats - animated counters on scroll.
  Stats.init();

  // Integrations - category filter.
  Integrations.init();

  // Changelog - tag filter.
  Changelog.init();

  // Product roadmap with voting and filters.
  Roadmap.init();

  // Sticky navigation bar.
  SiteNav.init();

  // Newsletter signup form.
  Newsletter.init();

  // Auto-play the default scenario.
  ChatDemo.play('memory');

  // Additional component initialization
  ThemeToggle.init();
  ScrollProgress.init();
  ShortcutsHelp.init();
  Calculator.init();
  Playground.init();
  ActivityFeed.init();
  CommandPalette.init();
  ShareFab.init();
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

  /**
   * Cached section offsetTop values. Reading offsetTop on every scroll
   * event forces synchronous layout recalculation. Cache and recompute
   * only on resize when layout actually changes.
   */
  var sectionOffsets = [];
  var _resizeHandler = null;
  var _keydownHandler = null;
  var _resizeTimer = null;

  function cacheSectionOffsets() {
    sectionOffsets = [];
    for (var i = 0; i < sections.length; i++) {
      sectionOffsets.push(sections[i].offsetTop);
    }
  }

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

    // Cache section positions (recompute on resize, debounced)
    cacheSectionOffsets();
    _resizeHandler = function () {
      if (_resizeTimer) clearTimeout(_resizeTimer);
      _resizeTimer = setTimeout(cacheSectionOffsets, 200);
    };
    window.addEventListener('resize', _resizeHandler, { passive: true });

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
    _keydownHandler = function (e) {
      if (e.key === 'Escape') closeMenu();
    };
    document.addEventListener('keydown', _keydownHandler);

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

    // Use cached offsets instead of reading offsetTop (avoids forced layout)
    for (var i = sectionOffsets.length - 1; i >= 0; i--) {
      if (sectionOffsets[i] <= scrollY) {
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

  function destroy() {
    if (_resizeHandler) window.removeEventListener('resize', _resizeHandler);
    if (_keydownHandler) document.removeEventListener('keydown', _keydownHandler);
    window.removeEventListener('scroll', onScroll);
    if (_resizeTimer) clearTimeout(_resizeTimer);
    _resizeHandler = null;
    _keydownHandler = null;
    _resizeTimer = null;
    reset();
  }

  return {
    init: init,
    destroy: destroy,
    getActiveSection: getActiveSection,
    reset: reset,
    closeMenu: closeMenu,
    cacheSectionOffsets: cacheSectionOffsets
  };
})();

/* eslint-enable no-var */

/**
 * Newsletter - email signup form with client-side validation and feedback.
 * Stores subscriptions in localStorage (demo) since there's no backend.
 */
var Newsletter = (function () {
  'use strict';

  function init() {
    var form = document.getElementById('newsletterForm');
    if (!form) return;

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var emailInput = document.getElementById('newsletterEmail');
      var btn = document.getElementById('newsletterBtn');
      var status = document.getElementById('newsletterStatus');
      var email = emailInput.value.trim();

      if (!email || !isValidEmail(email)) {
        showStatus(status, 'Please enter a valid email address.', 'error');
        return;
      }

      // Check for duplicate
      var subs = getSubscribers();
      if (subs.indexOf(email) !== -1) {
        showStatus(status, 'You\'re already subscribed! 🎉', 'success');
        return;
      }

      // Simulate subscribe
      btn.disabled = true;
      btn.textContent = 'Subscribing…';

      setTimeout(function () {
        subs.push(email);
        try {
          localStorage.setItem('agentbox_newsletter', JSON.stringify(subs));
        } catch (_) { /* ignore */ }

        showStatus(status, 'You\'re in! Welcome aboard. 🚀', 'success');
        btn.textContent = 'Subscribed ✓';
        emailInput.value = '';

        setTimeout(function () {
          btn.disabled = false;
          btn.textContent = 'Subscribe';
        }, 3000);
      }, 800);
    });
  }

  function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  function showStatus(el, msg, type) {
    if (!el) return;
    el.textContent = msg;
    el.className = 'newsletter-status ' + type;
  }

  function getSubscribers() {
    try {
      var data = localStorage.getItem('agentbox_newsletter');
      if (!data) return [];
      var parsed = JSON.parse(data);
      // Validate: must be an array of strings (email addresses)
      if (!Array.isArray(parsed)) return [];
      var safe = [];
      for (var i = 0; i < parsed.length; i++) {
        if (typeof parsed[i] === 'string') safe.push(parsed[i]);
      }
      return safe;
    } catch (_) {
      return [];
    }
  }

  return { init: init, getSubscribers: getSubscribers };
})();

// ---------------------------------------------------------------------------
// Roadmap Module
// ---------------------------------------------------------------------------

var Roadmap = (function () {
  var STORAGE_KEY = 'agentbox_roadmap_votes';
  var currentFilter = 'all';
  var _container = null;
  var _grid = null;

  /** Lazily resolve the container element (cache on first use). */
  function container() {
    if (!_container) _container = document.getElementById('roadmapSection');
    return _container;
  }

  /** Lazily resolve the grid element (cache on first use). */
  function grid() {
    if (!_grid) _grid = document.getElementById('roadmapGrid');
    return _grid;
  }

  /** Cached DOM collections — resolved once on init, reused on every filter. */
  var _filterBtns = [];
  var _cards = [];
  var _summaryItems = [];

  function init() {
    _container = document.getElementById('roadmapSection');
    if (!container()) return;

    restoreVotes();

    _filterBtns = Array.prototype.slice.call(
      container().querySelectorAll('.roadmap-filter-btn')
    );
    for (var i = 0; i < _filterBtns.length; i++) {
      _filterBtns[i].addEventListener('click', function (e) {
        var status = e.currentTarget.getAttribute('data-status');
        filterBy(status);
      });
    }

    _grid = document.getElementById('roadmapGrid');

    _cards = Array.prototype.slice.call(
      container().querySelectorAll('.roadmap-card')
    );
    _summaryItems = Array.prototype.slice.call(
      container().querySelectorAll('.roadmap-summary-item')
    );

    if (grid()) {
      grid().addEventListener('click', function (e) {
        var btn = e.target.closest('.roadmap-vote-btn');
        if (!btn) return;
        toggleVote(btn);
      });
    }

    arrowKeyNav(container(), '.roadmap-filter-btn', function (btn) {
      btn.focus();
      btn.click();
    });
  }

  function filterBy(status) {
    currentFilter = status || 'all';
    if (!container()) return;

    // Lazy-init cached arrays (avoids DOM queries on repeat calls)
    if (_filterBtns.length === 0) {
      _filterBtns = Array.prototype.slice.call(
        container().querySelectorAll('.roadmap-filter-btn')
      );
    }
    if (_cards.length === 0) {
      _cards = Array.prototype.slice.call(
        container().querySelectorAll('.roadmap-card')
      );
    }
    if (_summaryItems.length === 0) {
      _summaryItems = Array.prototype.slice.call(
        container().querySelectorAll('.roadmap-summary-item')
      );
    }

    for (var i = 0; i < _filterBtns.length; i++) {
      var isActive =
        _filterBtns[i].getAttribute('data-status') === currentFilter;
      _filterBtns[i].classList.toggle('active', isActive);
      _filterBtns[i].setAttribute(
        'aria-selected',
        isActive ? 'true' : 'false'
      );
    }

    for (var j = 0; j < _cards.length; j++) {
      var cardStatus = _cards[j].getAttribute('data-status');
      var visible = currentFilter === 'all' || cardStatus === currentFilter;
      _cards[j].setAttribute('data-hidden', visible ? 'false' : 'true');
    }

    for (var k = 0; k < _summaryItems.length; k++) {
      var itemStatus = _summaryItems[k].getAttribute('data-status');
      var highlighted =
        currentFilter === 'all' || itemStatus === currentFilter;
      _summaryItems[k].style.opacity = highlighted ? '1' : '0.4';
    }
  }

  function toggleVote(btn) {
    var card = btn.closest('.roadmap-card');
    if (!card) return;

    var countEl = card.querySelector('.roadmap-vote-count');
    if (!countEl) return;

    var count = parseInt(countEl.textContent, 10) || 0;
    var wasVoted = btn.classList.contains('voted');

    if (wasVoted) {
      count = Math.max(0, count - 1);
      btn.classList.remove('voted');
      btn.setAttribute('aria-pressed', 'false');
    } else {
      count += 1;
      btn.classList.add('voted');
      btn.setAttribute('aria-pressed', 'true');
    }

    countEl.textContent = String(count);
    saveVotes();
  }

  function getCards() {
    if (!grid()) return [];
    return Array.prototype.slice.call(grid().querySelectorAll('.roadmap-card'));
  }

  function getVisibleCards() {
    return getCards().filter(function (c) {
      return c.getAttribute('data-hidden') !== 'true';
    });
  }

  function getCurrent() {
    return currentFilter;
  }

  function getStatuses() {
    return ['all', 'shipped', 'progress', 'planned'];
  }

  function getStatusCounts() {
    var cards = getCards();
    var counts = { shipped: 0, progress: 0, planned: 0 };
    for (var i = 0; i < cards.length; i++) {
      var s = cards[i].getAttribute('data-status');
      if (counts.hasOwnProperty(s)) counts[s]++;
    }
    return counts;
  }

  function getVotes() {
    var cards = getCards();
    var votes = Object.create(null);
    for (var i = 0; i < cards.length; i++) {
      var h3 = cards[i].querySelector('h3');
      var countEl = cards[i].querySelector('.roadmap-vote-count');
      if (h3 && countEl) {
        votes[h3.textContent] = parseInt(countEl.textContent, 10) || 0;
      }
    }
    return votes;
  }

  function saveVotes() {
    try {
      var cards = getCards();
      var data = Object.create(null);
      for (var i = 0; i < cards.length; i++) {
        var h3 = cards[i].querySelector('h3');
        var btn = cards[i].querySelector('.roadmap-vote-btn');
        var countEl = cards[i].querySelector('.roadmap-vote-count');
        if (h3 && btn && countEl) {
          data[h3.textContent] = {
            count: parseInt(countEl.textContent, 10) || 0,
            voted: btn.classList.contains('voted')
          };
        }
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (_) {
      /* localStorage unavailable */
    }
  }

  function restoreVotes() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      var parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return;
      // Rebuild as prototype-safe map with validated entries
      var data = Object.create(null);
      for (var key in parsed) {
        if (!Object.prototype.hasOwnProperty.call(parsed, key)) continue;
        var entry = parsed[key];
        if (entry && typeof entry === 'object' && !Array.isArray(entry)) {
          data[key] = entry;
        }
      }
      var cards = getCards();
      for (var i = 0; i < cards.length; i++) {
        var h3 = cards[i].querySelector('h3');
        if (!h3 || !data[h3.textContent]) continue;
        var item = data[h3.textContent];
        var countEl = cards[i].querySelector('.roadmap-vote-count');
        var btn = cards[i].querySelector('.roadmap-vote-btn');
        // Validate count is a safe integer before rendering
        var count = parseInt(item.count, 10);
        if (countEl && !isNaN(count) && count >= 0 && count <= 999999) {
          countEl.textContent = String(count);
        }
        if (btn && item.voted === true) {
          btn.classList.add('voted');
          btn.setAttribute('aria-pressed', 'true');
        }
      }
    } catch (_) {
      /* localStorage unavailable or corrupted */
    }
  }

  return {
    init: init,
    filterBy: filterBy,
    getCurrent: getCurrent,
    getStatuses: getStatuses,
    getStatusCounts: getStatusCounts,
    getCards: getCards,
    getVisibleCards: getVisibleCards,
    getVotes: getVotes
  };
})();

// ---------------------------------------------------------------------------
// System Status Dashboard Module
// ---------------------------------------------------------------------------

var StatusDashboard = (function () {
  var STATUS_LEVELS = ['operational', 'degraded', 'outage'];
  var _grid = null;
  var _incidents = null;
  var _overall = null;
  /** Cached service elements keyed by data-service name for O(1) lookup. */
  var _serviceCache = null;
  /** Cached service element array (avoids querySelectorAll on every call). */
  var _serviceList = null;

  /** Lazily resolve grid element. */
  function getGrid() {
    if (!_grid) _grid = document.getElementById('statusGrid');
    return _grid;
  }

  /** Lazily resolve incidents container. */
  function getIncidentsEl() {
    if (!_incidents) _incidents = document.getElementById('statusIncidents');
    return _incidents;
  }

  /** Lazily resolve overall status element. */
  function getOverall() {
    if (!_overall) _overall = document.getElementById('statusOverall');
    return _overall;
  }

  function init() {
    _grid = document.getElementById('statusGrid');
    _incidents = document.getElementById('statusIncidents');
    _overall = document.getElementById('statusOverall');
    _buildServiceCache();
    updateOverall();
  }

  /** Build O(1) service lookup from DOM. Called once on init. */
  function _buildServiceCache() {
    _serviceCache = Object.create(null);
    _serviceList = [];
    if (!getGrid()) return;
    var els = getGrid().querySelectorAll('.status-service');
    for (var i = 0; i < els.length; i++) {
      _serviceList.push(els[i]);
      var name = els[i].getAttribute('data-service');
      if (name) _serviceCache[name] = els[i];
    }
  }

  function getServices() {
    if (_serviceList) return _serviceList;
    if (!getGrid()) return [];
    _buildServiceCache();
    return _serviceList;
  }

  function getIncidents() {
    if (!getIncidentsEl()) return [];
    return Array.prototype.slice.call(
      getIncidentsEl().querySelectorAll('.status-incident')
    );
  }

  function getServiceStatus(serviceName) {
    if (!_serviceCache) _buildServiceCache();
    var el = _serviceCache[serviceName];
    return el ? el.getAttribute('data-status') : null;
  }

  function getServiceUptime(serviceName) {
    if (!_serviceCache) _buildServiceCache();
    var el = _serviceCache[serviceName];
    if (!el) return null;
    var uptimeEl = el.querySelector('.status-uptime');
    return uptimeEl ? parseFloat(uptimeEl.textContent) : null;
  }

  function setServiceStatus(serviceName, status) {
    if (!_serviceCache) _buildServiceCache();
    var el = _serviceCache[serviceName];
    if (el) {
      el.setAttribute('data-status', status);
      var dot = el.querySelector('.status-dot');
      if (dot) dot.className = 'status-dot ' + status;
    }
    updateOverall();
  }

  function setServiceUptime(serviceName, uptime) {
    if (!_serviceCache) _buildServiceCache();
    var svc = _serviceCache[serviceName];
    if (!svc) return;
    var el = svc.querySelector('.status-uptime');
    if (el) el.textContent = uptime.toFixed(2) + '%';
    var bar = svc.querySelector('.status-bar-fill');
    if (bar) bar.style.width = Math.min(100, Math.max(0, uptime)) + '%';
    var meter = svc.querySelector('.status-bar');
    if (meter) meter.setAttribute('aria-valuenow', String(uptime));
  }

  function updateOverall() {
    var services = getServices();
    var worst = 'operational';
    for (var i = 0; i < services.length; i++) {
      var s = services[i].getAttribute('data-status');
      if (STATUS_LEVELS.indexOf(s) > STATUS_LEVELS.indexOf(worst)) {
        worst = s;
      }
    }

    if (!getOverall()) return;

    var dot = getOverall().querySelector('.status-dot');
    var text = getOverall().querySelector('.status-overall-text');
    if (dot) dot.className = 'status-dot ' + worst;

    var messages = {
      operational: 'All systems operational',
      degraded: 'Some systems degraded',
      outage: 'System outage detected'
    };
    if (text) text.textContent = messages[worst] || worst;
  }

  function getOverallStatus() {
    if (!getOverall()) return null;
    var dot = getOverall().querySelector('.status-dot');
    if (!dot) return null;
    for (var i = STATUS_LEVELS.length - 1; i >= 0; i--) {
      if (dot.classList.contains(STATUS_LEVELS[i])) return STATUS_LEVELS[i];
    }
    return 'operational';
  }

  function getServiceNames() {
    return getServices().map(function (s) {
      return s.getAttribute('data-service');
    });
  }

  function getAverageUptime() {
    var services = getServices();
    if (services.length === 0) return 0;
    var total = 0;
    for (var i = 0; i < services.length; i++) {
      var el = services[i].querySelector('.status-uptime');
      total += el ? parseFloat(el.textContent) || 0 : 0;
    }
    return total / services.length;
  }

  function getIncidentCount() {
    return getIncidents().length;
  }

  return {
    init: init,
    getServices: getServices,
    getIncidents: getIncidents,
    getServiceStatus: getServiceStatus,
    getServiceUptime: getServiceUptime,
    setServiceStatus: setServiceStatus,
    setServiceUptime: setServiceUptime,
    updateOverall: updateOverall,
    getOverallStatus: getOverallStatus,
    getServiceNames: getServiceNames,
    getAverageUptime: getAverageUptime,
    getIncidentCount: getIncidentCount
  };
})();

// Module exposure moved to end of file (after all IIFEs) to ensure
// every module is defined before assignment. See #23.


// ---------------------------------------------------------------------------
// Time Saved Calculator Module
// ---------------------------------------------------------------------------

var Calculator = (function () {
  var _section = null;

  // Cached DOM references — resolved once in init(), reused on every
  // slider input event.  Eliminates 5 getElementById + 1 querySelectorAll
  // calls per update (~dozens per second while dragging a slider).
  var _weeklyEl = null;
  var _monthlyEl = null;
  var _yearlyEl = null;
  var _equivEl = null;
  var _groups = [];

  /** Lazily resolve the section element (cache on first use). */
  function section() {
    if (!_section) _section = document.getElementById('calculatorSection');
    return _section;
  }

  function init() {
    _section = document.getElementById('calculatorSection');
    if (!section()) return;

    // Cache all static elements once
    _weeklyEl = document.getElementById('calcWeekly');
    _monthlyEl = document.getElementById('calcMonthly');
    _yearlyEl = document.getElementById('calcYearly');
    _equivEl = document.getElementById('calcEquivalent');
    _groups = section().querySelectorAll('.calc-slider-group');

    var sliders = section().querySelectorAll('.calc-range');
    for (var i = 0; i < sliders.length; i++) {
      sliders[i].addEventListener('input', update);
    }
    update();
  }

  function update() {
    if (!section()) return;

    var totalMinutes = 0;

    for (var i = 0; i < _groups.length; i++) {
      var slider = _groups[i].querySelector('.calc-range');
      var valueEl = _groups[i].querySelector('.calc-slider-value');
      var minutesPer = parseInt(_groups[i].dataset.minutes, 10) || 0;
      var count = parseInt(slider.value, 10) || 0;

      if (valueEl) valueEl.textContent = count + ' /week';
      totalMinutes += count * minutesPer;
    }

    if (_weeklyEl) _weeklyEl.textContent = totalMinutes;

    var monthlyHours = (totalMinutes * 4.33 / 60);
    if (_monthlyEl) _monthlyEl.textContent = monthlyHours < 10 ? monthlyHours.toFixed(1) : Math.round(monthlyHours);

    var yearlyHours = (totalMinutes * 52 / 60);
    if (_yearlyEl) _yearlyEl.textContent = Math.round(yearlyHours);

    if (_equivEl) {
      if (yearlyHours === 0) {
        _equivEl.textContent = 'Move the sliders to see your potential time savings \u261D\uFE0F';
      } else if (yearlyHours < 8) {
        _equivEl.innerHTML = 'That\u2019s <strong>' +
          Math.round(yearlyHours) + ' hours</strong>' +
          ' back every year \u2014 time for what matters \u2728';
      } else {
        var workdays = (yearlyHours / 8).toFixed(1);
        _equivEl.innerHTML = 'That\u2019s like getting <strong>' +
          workdays + ' extra workdays</strong>' +
          ' back every year \u2728';
      }
    }
  }

  function getTotal() {
    if (!_weeklyEl || !_weeklyEl.isConnected) return 0;
    return parseInt(_weeklyEl.textContent, 10) || 0;
  }

  return { init: init, update: update, getTotal: getTotal };
})();

// ---------------------------------------------------------------------------
// Command Palette (Ctrl+K / Cmd+K)
// ---------------------------------------------------------------------------
var CommandPalette = (function () {
  var SECTIONS = [
    { id: 'featuresSection', icon: '✨', label: 'Features', hint: 'What AgentBox can do' },
    { id: 'howItWorks', icon: '🚀', label: 'How It Works', hint: 'Getting started' },
    { id: 'demoSection', icon: '💬', label: 'Demo', hint: 'See it in action' },
    { id: 'statsSection', icon: '📊', label: 'Stats', hint: 'Social proof' },
    { id: 'usecasesSection', icon: '👨‍💻', label: 'Use Cases', hint: 'Who it is for' },
    { id: 'integrationsSection', icon: '🔗', label: 'Integrations', hint: 'Connected tools' },
    { id: 'comparisonSection', icon: '⚖️', label: 'Compare', hint: 'vs ChatGPT, Siri' },
    { id: 'calculatorSection', icon: '⏱️', label: 'Time Calculator', hint: 'Estimate time saved' },
    { id: 'trustSection', icon: '🔒', label: 'Trust & Privacy', hint: 'Security details' },
    { id: 'testimonialsSection', icon: '💬', label: 'Testimonials', hint: 'What people say' },
    { id: 'pricingSection', icon: '💰', label: 'Pricing', hint: 'Plans & pricing' },
    { id: 'changelogSection', icon: '📋', label: 'Changelog', hint: 'What is new' },
    { id: 'roadmapSection', icon: '🗺️', label: 'Roadmap', hint: 'Coming soon' },
    { id: 'statusSection', icon: '🟢', label: 'System Status', hint: 'Service health' },
    { id: 'faqSection', icon: '❓', label: 'FAQ', hint: 'Common questions' },
    { id: 'newsletterSection', icon: '📬', label: 'Newsletter', hint: 'Stay in the loop' }
  ];

  var overlay, input, results;
  var selectedIndex = 0;
  var filtered = [];
  var pool = []; // Pre-created <li> elements, one per SECTIONS entry
  var poolIndex = Object.create(null); // section.id -> pool array index (O(1) lookup)
  var _globalKeyHandler = null;

  function init() {
    overlay = document.getElementById('cmdPaletteOverlay');
    input = document.getElementById('cmdPaletteInput');
    results = document.getElementById('cmdPaletteResults');
    if (!overlay || !input || !results) return;

    _globalKeyHandler = function (e) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        toggle();
      }
      if (e.key === 'Escape' && !overlay.hidden) {
        close();
      }
    };
    document.addEventListener('keydown', _globalKeyHandler);

    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) close();
    });

    input.addEventListener('input', function () {
      filter(input.value);
    });

    input.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowDown') { e.preventDefault(); move(1); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); move(-1); }
      else if (e.key === 'Enter') { e.preventDefault(); go(); }
    });

    buildPool();
    filter('');
  }

  function toggle() {
    if (overlay.hidden) open(); else close();
  }

  function open() {
    overlay.hidden = false;
    input.value = '';
    filter('');
    input.focus();
  }

  function close() {
    overlay.hidden = true;
  }

  function filter(q) {
    var query = q.toLowerCase().trim();
    filtered = query
      ? SECTIONS.filter(function (s) {
          return s.label.toLowerCase().indexOf(query) !== -1 ||
                 s.hint.toLowerCase().indexOf(query) !== -1;
        })
      : SECTIONS.slice();
    selectedIndex = 0;
    render();
  }

  function buildPool() {
    SECTIONS.forEach(function (s, idx) {
      var li = document.createElement('li');
      li.className = 'cmd-palette-item';
      li.setAttribute('role', 'option');
      li.dataset.sectionId = s.id;

      var iconSpan = document.createElement('span');
      iconSpan.className = 'cmd-palette-item-icon';
      iconSpan.textContent = s.icon;

      var labelSpan = document.createElement('span');
      labelSpan.className = 'cmd-palette-item-label';
      labelSpan.textContent = s.label;

      var hintSpan = document.createElement('span');
      hintSpan.className = 'cmd-palette-item-hint';
      hintSpan.textContent = s.hint;

      li.appendChild(iconSpan);
      li.appendChild(labelSpan);
      li.appendChild(hintSpan);

      li.addEventListener('click', function () {
        // Find this item's current index in filtered list
        for (var j = 0; j < filtered.length; j++) {
          if (filtered[j].id === s.id) {
            selectedIndex = j;
            go();
            break;
          }
        }
      });

      pool[idx] = { el: li, section: s };
      poolIndex[s.id] = idx;
      results.appendChild(li);
    });
  }

  function render() {
    // Build lookup of visible section ids
    var visibleIds = Object.create(null);
    for (var i = 0; i < filtered.length; i++) {
      visibleIds[filtered[i].id] = i;
    }

    // Show/hide pooled elements and reorder visible ones
    var fragment = document.createDocumentFragment();
    // First, append visible items in filtered order — O(n) via poolIndex
    for (var i = 0; i < filtered.length; i++) {
      var idx = poolIndex[filtered[i].id];
      if (idx !== undefined) {
        var li = pool[idx].el;
        li.hidden = false;
        if (i === selectedIndex) {
          li.setAttribute('aria-selected', 'true');
        } else {
          li.removeAttribute('aria-selected');
        }
        fragment.appendChild(li);
      }
    }
    // Then append hidden items (keeps them in DOM but invisible)
    for (var j = 0; j < pool.length; j++) {
      if (!(pool[j].section.id in visibleIds)) {
        pool[j].el.hidden = true;
        pool[j].el.removeAttribute('aria-selected');
        fragment.appendChild(pool[j].el);
      }
    }
    results.appendChild(fragment);
  }

  /**
   * Move selection up/down without rebuilding DOM.
   * Old code called render() on every arrow key, destroying and recreating
   * all list items to move a highlight. Now updates aria-selected in-place
   * — O(1) DOM writes instead of O(n).
   */
  function move(dir) {
    if (!filtered.length) return;
    var items = results.children;
    if (items[selectedIndex]) items[selectedIndex].removeAttribute('aria-selected');
    selectedIndex = (selectedIndex + dir + filtered.length) % filtered.length;
    if (items[selectedIndex]) {
      items[selectedIndex].setAttribute('aria-selected', 'true');
      items[selectedIndex].scrollIntoView({ block: 'nearest' });
    }
  }

  function go() {
    if (!filtered.length) return;
    var section = filtered[selectedIndex];
    var el = document.getElementById(section.id);
    if (el) {
      close();
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  function destroy() {
    if (_globalKeyHandler) document.removeEventListener('keydown', _globalKeyHandler);
    _globalKeyHandler = null;
    close();
  }

  return { init: init, destroy: destroy, open: open, close: close };
})();

// ---------------------------------------------------------------------------
// Floating Share Button
// ---------------------------------------------------------------------------
var ShareFab = (function () {
  var btn, menu, toast, toastTimer;
  var PAGE_URL = 'https://getagentbox.com';
  var PAGE_TITLE = 'AgentBox - Your Personal AI Agent on Telegram';
  var PAGE_DESC = 'Get your own AI assistant that lives in Telegram. It remembers you, searches the web, and helps you get things done.';

  function init() {
    btn = document.getElementById('shareFabBtn');
    menu = document.getElementById('shareFabMenu');
    toast = document.getElementById('shareToast');
    if (!btn || !menu) return;

    btn.addEventListener('click', toggle);
    document.addEventListener('click', function (e) {
      if (!e.target.closest('.share-fab')) close();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') close();
    });

    var options = menu.querySelectorAll('.share-option');
    for (var i = 0; i < options.length; i++) {
      options[i].addEventListener('click', handleShare);
    }
  }

  function toggle() {
    var open = btn.getAttribute('aria-expanded') === 'true';
    if (open) close(); else openMenu();
  }

  function openMenu() {
    menu.hidden = false;
    btn.setAttribute('aria-expanded', 'true');
    toast.hidden = true;
  }

  function close() {
    menu.hidden = true;
    btn.setAttribute('aria-expanded', 'false');
  }

  function handleShare(e) {
    var type = e.currentTarget.getAttribute('data-share');
    var url;
    if (type === 'twitter') {
      url = 'https://twitter.com/intent/tweet?text=' +
        encodeURIComponent(PAGE_TITLE + ' — ' + PAGE_DESC) +
        '&url=' + encodeURIComponent(PAGE_URL);
      window.open(url, '_blank', 'noopener,width=550,height=420');
    } else if (type === 'linkedin') {
      url = 'https://www.linkedin.com/sharing/share-offsite/?url=' +
        encodeURIComponent(PAGE_URL);
      window.open(url, '_blank', 'noopener,width=550,height=500');
    } else if (type === 'copy') {
      copyLink();
    }
    close();
  }

  function copyLink() {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(PAGE_URL).then(showToast);
    } else {
      var ta = document.createElement('textarea');
      ta.value = PAGE_URL;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      showToast();
    }
  }

  function showToast() {
    toast.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toast.hidden = true; }, 2000);
  }

  return { init: init };
})();

// ---------------------------------------------------------------------------
// Theme Toggle (Light/Dark Mode)
// ---------------------------------------------------------------------------
var ThemeToggle = (function () {
  var STORAGE_KEY = 'agentbox-theme';
  var btn, icon;

  function init() {
    btn = document.getElementById('themeToggle');
    icon = document.getElementById('themeIcon');
    if (!btn) return;

    var saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'light') {
      document.body.classList.add('light-mode');
      if (icon) icon.textContent = '🌙';
    }

    btn.addEventListener('click', toggle);
  }

  function toggle() {
    var isLight = document.body.classList.toggle('light-mode');
    if (icon) icon.textContent = isLight ? '🌙' : '☀️';
    localStorage.setItem(STORAGE_KEY, isLight ? 'light' : 'dark');
  }

  return { init: init };
})();

// ---------------------------------------------------------------------------
// Scroll Progress + Back-to-Top Module
// ---------------------------------------------------------------------------

var ScrollProgress = (function () {
  'use strict';

  var bar, btn, ticking;

  function init() {
    bar = document.getElementById('scrollProgressBar');
    btn = document.getElementById('backToTop');
    if (!bar || !btn) return;

    ticking = false;
    window.addEventListener('scroll', onScroll, { passive: true });
    btn.addEventListener('click', scrollToTop);
    update(); // initial state
  }

  function onScroll() {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(function () {
        update();
        ticking = false;
      });
    }
  }

  function update() {
    var scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    var docHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
    var progress = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;

    bar.style.width = progress + '%';

    if (scrollTop > 400) {
      btn.classList.add('visible');
    } else {
      btn.classList.remove('visible');
    }
  }

  function scrollToTop() {
    if (prefersReducedMotion) {
      window.scrollTo(0, 0);
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  return { init: init };
})();

/* ── Keyboard Shortcuts Help (?) ── */
var ShortcutsHelp = (function () {
  var overlay, closeBtn;

  function open() {
    overlay.hidden = false;
    closeBtn.focus();
  }

  function close() {
    overlay.hidden = true;
  }

  function init() {
    overlay = document.getElementById('shortcutsOverlay');
    closeBtn = document.getElementById('shortcutsClose');
    if (!overlay || !closeBtn) return;

    closeBtn.addEventListener('click', close);
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) close();
    });

    document.addEventListener('keydown', function (e) {
      // Don't trigger when typing in inputs
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) return;

      if (e.key === '?' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        if (overlay.hidden) { open(); } else { close(); }
      }

      if (e.key === 'Escape' && !overlay.hidden) {
        close();
      }

      // T for theme toggle
      if (e.key === 't' && !e.ctrlKey && !e.metaKey && !e.altKey && overlay.hidden) {
        var themeBtn = document.getElementById('themeToggle');
        if (themeBtn) themeBtn.click();
      }
    });
  }

  return { init: init };
})();

/* ── Chat Playground ── */
var Playground = (function () {
  var messagesEl, inputEl, formEl;

  /** Pending reply timer — cleared on new submit to prevent stacking. */
  var pendingTimer = null;
  /** Typing indicator currently in the DOM. */
  var currentTyping = null;

  /**
   * Security limits to prevent resource exhaustion.
   * MAX_INPUT_LENGTH: caps the text processed by findResponse() to avoid
   *   unbounded regex/split operations on multi-MB pastes.
   * MAX_MESSAGES: caps DOM children in the messages container to prevent
   *   memory exhaustion from automated or rapid submissions.
   */
  var MAX_INPUT_LENGTH = 500;
  var MAX_MESSAGES = 50;

  var responses = [
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
  var fallbacks = [
    'Interesting question! In the full version on Telegram, I\'d search the web and give you a detailed answer. Try me there! \u{1F680}',
    'I\'d love to help with that! This demo is limited, but the real agent on Telegram has full web search, memory, and image understanding. Give it a spin! \u2728',
    'Good one! The real AgentBox would handle this with a web search and your personal context. Head to Telegram to try the full experience \u{1F4AC}',
  ];
  var fallbackIdx = 0;

  /**
   * Pre-built keyword → reply index for O(1) lookup instead of
   * nested linear scan on every message.
   */
  var patternMap = null;

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
    var lower = text.toLowerCase().replace(/[^\w\s]/g, '');
    var words = lower.split(/\s+/);

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

    var fb = fallbacks[fallbackIdx % fallbacks.length];
    fallbackIdx++;
    return fb;
  }

  function addBubble(role, text) {
    // Evict oldest messages when DOM children exceed safety limit.
    while (messagesEl.children.length >= MAX_MESSAGES) {
      messagesEl.removeChild(messagesEl.firstChild);
    }
    var bubble = document.createElement('div');
    bubble.className = 'chat-bubble ' + role;
    bubble.textContent = text;
    messagesEl.appendChild(bubble);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function addTyping() {
    var el = _typingIndicatorTemplate.cloneNode(true);
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
    var text = inputEl.value.trim();
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

    var reply = findResponse(text);
    currentTyping = addTyping();
    var delay = prefersReducedMotion ? 200 : 800 + Math.min(reply.length * 5, 1200);

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

// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Agent Activity Feed — Live-style simulated activity stream
// ---------------------------------------------------------------------------
var ActivityFeed = (function () {
  'use strict';

  var feedEl;
  var activeCountEl, todayCountEl;
  var cycleTimer = null;
  var counterTimer = null;

  /** Maximum visible items in the feed. */
  var MAX_VISIBLE = 5;

  /** Interval between new activity items (ms). */
  var CYCLE_INTERVAL = 4000;

  /** Pool of simulated agent activities. */
  var ACTIVITIES = [
    { icon: '\u{1F50D}', text: 'searched the web for "best budget laptops 2026"' },
    { icon: '\u23F0', text: 'set a reminder: "Call dentist at 3 PM"' },
    { icon: '\u{1F4E7}', text: 'summarized 5 unread emails into key action items' },
    { icon: '\u{1F373}', text: 'found a 20-minute chicken stir-fry recipe' },
    { icon: '\u{1F4BB}', text: 'debugged a React useEffect infinite loop' },
    { icon: '\u{1F30D}', text: 'translated a business email from Japanese to English' },
    { icon: '\u{1F4CA}', text: 'analyzed Q4 sales data and created a summary chart' },
    { icon: '\u{1F3B5}', text: 'created a focus playlist with lo-fi and ambient tracks' },
    { icon: '\u{1F4DD}', text: 'drafted meeting notes from a 45-minute standup' },
    { icon: '\u2708\uFE0F', text: 'found the cheapest flights to Tokyo for March' },
    { icon: '\u{1F4F7}', text: 'identified a plant from a photo: Monstera deliciosa' },
    { icon: '\u{1F4B0}', text: 'compared 3 savings accounts and recommended the best APY' },
    { icon: '\u{1F3CB}\uFE0F', text: 'generated a 4-week workout plan for muscle building' },
    { icon: '\u{1F4DA}', text: 'summarized a 300-page book into 10 key takeaways' },
    { icon: '\u{1F6D2}', text: 'built a grocery list from 5 saved recipes' },
    { icon: '\u2600\uFE0F', text: 'checked the weekend forecast: sunny, perfect for hiking' },
    { icon: '\u{1F3E0}', text: 'scheduled a smart home routine: lights off at 11 PM' },
    { icon: '\u{1F4AC}', text: 'drafted a polite follow-up email to a recruiter' },
    { icon: '\u{1F52C}', text: 'explained quantum entanglement in simple terms' },
    { icon: '\u{1F3AF}', text: 'broke down a project into 12 actionable tasks with deadlines' },
  ];

  /** Shuffled index to avoid repeats until pool exhausted. */
  var shuffled = [];
  var shuffleIdx = 0;

  function shuffle() {
    shuffled = [];
    for (var i = 0; i < ACTIVITIES.length; i++) shuffled.push(i);
    for (var j = shuffled.length - 1; j > 0; j--) {
      var k = Math.floor(Math.random() * (j + 1));
      var tmp = shuffled[j];
      shuffled[j] = shuffled[k];
      shuffled[k] = tmp;
    }
    shuffleIdx = 0;
  }

  function nextActivity() {
    if (shuffleIdx >= shuffled.length) shuffle();
    return ACTIVITIES[shuffled[shuffleIdx++]];
  }

  function timeLabel() {
    return 'just now';
  }

  /** Create an activity item DOM node. */
  function createItem(activity) {
    var item = document.createElement('div');
    item.className = 'activity-item entering';

    var icon = document.createElement('span');
    icon.className = 'activity-icon';
    icon.textContent = activity.icon;

    var text = document.createElement('span');
    text.className = 'activity-text';
    var strong = document.createElement('strong');
    strong.textContent = 'Agent';
    text.appendChild(strong);
    text.appendChild(document.createTextNode(' ' + activity.text));

    var time = document.createElement('span');
    time.className = 'activity-time';
    time.textContent = timeLabel();

    item.appendChild(icon);
    item.appendChild(text);
    item.appendChild(time);

    return item;
  }

  /** Cycle: add a new item at top, remove oldest if over limit. */
  function cycle() {
    if (!feedEl) return;

    var act = nextActivity();
    var newItem = createItem(act);

    // Age existing time labels
    var items = feedEl.querySelectorAll('.activity-item');
    for (var i = 0; i < items.length; i++) {
      var timeEl = items[i].querySelector('.activity-time');
      if (timeEl) {
        var age = (i + 1) * (CYCLE_INTERVAL / 1000);
        if (age < 60) {
          timeEl.textContent = Math.round(age) + 's ago';
        } else {
          timeEl.textContent = Math.round(age / 60) + 'm ago';
        }
      }
    }

    // Remove oldest if over limit
    if (items.length >= MAX_VISIBLE) {
      var last = items[items.length - 1];
      last.classList.add('exiting');
      last.addEventListener('animationend', function () {
        if (last.parentNode) last.parentNode.removeChild(last);
      });
      // Fallback removal for reduced-motion
      if (prefersReducedMotion) {
        if (last.parentNode) last.parentNode.removeChild(last);
      }
    }

    // Insert new at top
    feedEl.insertBefore(newItem, feedEl.firstChild);

    // Remove entering class after animation
    setTimeout(function () {
      newItem.classList.remove('entering');
    }, 400);
  }

  /** Slowly increment the counters for visual effect. */
  function tickCounters() {
    if (!activeCountEl || !todayCountEl) return;
    var active = parseInt(activeCountEl.textContent.replace(/,/g, ''), 10) || 1247;
    var today = parseInt(todayCountEl.textContent.replace(/,/g, ''), 10) || 18392;

    // Random small fluctuation
    active += Math.floor(Math.random() * 5) - 2;
    if (active < 1000) active = 1000;
    today += Math.floor(Math.random() * 3) + 1;

    activeCountEl.textContent = active.toLocaleString();
    todayCountEl.textContent = today.toLocaleString();
  }

  /** IntersectionObserver callback — only animate when visible. */
  function onVisible(entries) {
    for (var i = 0; i < entries.length; i++) {
      if (entries[i].isIntersecting) {
        startCycling();
      } else {
        stopCycling();
      }
    }
  }

  function startCycling() {
    if (cycleTimer) return;
    cycleTimer = setInterval(cycle, CYCLE_INTERVAL);
    counterTimer = setInterval(tickCounters, CYCLE_INTERVAL);
  }

  function stopCycling() {
    if (cycleTimer) { clearInterval(cycleTimer); cycleTimer = null; }
    if (counterTimer) { clearInterval(counterTimer); counterTimer = null; }
  }

  function init() {
    feedEl = document.getElementById('activityFeed');
    activeCountEl = document.getElementById('activityActiveCount');
    todayCountEl = document.getElementById('activityTodayCount');
    if (!feedEl) return;

    shuffle();

    // Use IntersectionObserver if available, otherwise just start
    if (typeof IntersectionObserver !== 'undefined') {
      var observer = new IntersectionObserver(onVisible, { threshold: 0.2 });
      var section = document.getElementById('activitySection');
      if (section) observer.observe(section);
    } else {
      startCycling();
    }
  }

  function destroy() {
    stopCycling();
  }

  return { init: init, destroy: destroy };
})();

// Expose modules globally for external access and testability.
// This block MUST remain after all module IIFEs to avoid hoisting bugs
// where window.X is set to undefined. See issue #23.
// ---------------------------------------------------------------------------
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
  window.Roadmap = Roadmap;
  window.StatusDashboard = StatusDashboard;
  window.SiteNav = SiteNav;
  window.Newsletter = Newsletter;
  window.Calculator = Calculator;
  window.CommandPalette = CommandPalette;
  window.ShareFab = ShareFab;
  window.ThemeToggle = ThemeToggle;
  window.ScrollProgress = ScrollProgress;
  window.ShortcutsHelp = ShortcutsHelp;
  window.Playground = Playground;
  window.ActivityFeed = ActivityFeed;
  window.Trust = Trust;
}
