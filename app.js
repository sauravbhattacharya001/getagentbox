/**
 * AgentBox Landing Page - Interactive Components
 *
 * Architecture:
 *   Each module is a self-contained IIFE exposing a public API via
 *   return object.  All DOM wiring happens in the DOMContentLoaded
 *   block.  Shared utilities (arrowKeyNav, activateOnKeyboard,
 *   prefersReducedMotion) are defined at the top level.
 *
 * Modules:
 *  - ChatDemo:                 animated chat scenario player
 *  - Testimonials:             auto-rotating testimonials carousel
 *  - Pricing:                  monthly/yearly billing toggle
 *  - FAQ:                      accordion behaviour
 *  - HowItWorks:               scroll-triggered step animations
 *  - Stats:                    animated social proof counters
 *  - UseCases:                 tabbed section with keyboard nav
 *  - Integrations:             category-filtered integration grid
 *  - Changelog:                tag-filtered changelog entries
 *  - Trust:                    expandable privacy detail cards
 *  - SiteNav:                  sticky nav bar with scroll spy
 *  - Newsletter:               signup form with email validation
 *  - Roadmap:                  product roadmap with voting + filters
 *  - StatusDashboard:          service health monitoring panel
 *  - Calculator:               interactive time-saved calculator
 *  - CommandPalette:           Ctrl+K quick section navigation
 *  - ShareFab:                 floating share button with link copy
 *  - ThemeToggle:              dark/light theme switch
 *  - ScrollProgress:           scroll progress bar + back-to-top
 *  - ShortcutsHelp:            keyboard shortcuts help dialog
 *  - Playground:               interactive chat playground
 *  - ActivityFeed:             simulated real-time activity feed
 *  - PromptGallery:            interactive prompt template gallery
 *  - PersonalityConfigurator:  agent personality sliders + preview
 *  - FeatureTour:              guided walkthrough overlay with spotlight
 */

/** Global reduced-motion check (WCAG 2.3.3 compliance).
 *  Reactive: listens for OS preference changes at runtime so toggling
 *  "Reduce motion" in system settings takes effect immediately.
 */
var _prefersReducedMotionQuery = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)');
var prefersReducedMotion = _prefersReducedMotionQuery ? _prefersReducedMotionQuery.matches : false;

if (_prefersReducedMotionQuery && _prefersReducedMotionQuery.addEventListener) {
  _prefersReducedMotionQuery.addEventListener('change', function (e) {
    prefersReducedMotion = e.matches;

    // Stop or resume testimonial autoplay based on the new preference.
    if (typeof Testimonials !== 'undefined' && Testimonials._onMotionChange) {
      Testimonials._onMotionChange(e.matches);
    }
  });
}

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
    /** Called when the OS prefers-reduced-motion setting changes at runtime. */
    _onMotionChange: function (reducedMotion) {
      if (reducedMotion) {
        stopAutoPlay();
      } else {
        startAutoPlay();
      }
    },
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

/**
 * Attach Enter/Space keyboard activation to a container (event delegation).
 *
 * Replaces the repeated pattern of:
 *   container.addEventListener('keydown', function (e) {
 *     if (e.key === 'Enter' || e.key === ' ') { ... }
 *   });
 *
 * @param {Element}  container  The element to listen on.
 * @param {string}   selector   CSS selector for activatable children.
 * @param {function} onActivate Called with the matched element.
 */
function activateOnKeyboard(container, selector, onActivate) {
  container.addEventListener('keydown', function (e) {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    var target = e.target.closest(selector);
    if (!target) return;
    e.preventDefault();
    onActivate(target);
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
    activateOnKeyboard(billingToggle.parentElement || billingToggle, '#billingToggle', function () {
      Pricing.toggle();
    });
  }

  // FAQ accordion - event delegation on the section (click + keyboard).
  var faqSection = document.querySelector('.faq-section');
  if (faqSection) {
    faqSection.addEventListener('click', function (e) {
      var question = e.target.closest('.faq-question');
      if (question) FAQ.toggle(question);
    });
    activateOnKeyboard(faqSection, '.faq-question', function (question) {
      FAQ.toggle(question);
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
    activateOnKeyboard(trustSection, '.trust-card', function (card) {
      Trust.toggle(card);
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
  PromptGallery.init();
  PersonalityConfigurator.init();
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
  var _lastActiveIdx = -1;
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

    // Fast path: if scroll position is within the same section as last time,
    // skip the full scan.  This avoids redundant classList operations during
    // continuous scrolling within a long section.
    if (activeLink !== null && _lastActiveIdx >= 0 && _lastActiveIdx < sectionOffsets.length) {
      var lo = sectionOffsets[_lastActiveIdx];
      var hi = _lastActiveIdx + 1 < sectionOffsets.length ? sectionOffsets[_lastActiveIdx + 1] : Infinity;
      if (scrollY >= lo && scrollY < hi) return;
    }

    var current = null;
    var currentIdx = -1;

    // Use cached offsets instead of reading offsetTop (avoids forced layout)
    for (var i = sectionOffsets.length - 1; i >= 0; i--) {
      if (sectionOffsets[i] <= scrollY) {
        current = links[i];
        currentIdx = i;
        break;
      }
    }

    if (current !== activeLink) {
      if (activeLink) activeLink.classList.remove('active');
      if (current) current.classList.add('active');
      activeLink = current;
      _lastActiveIdx = currentIdx;
    }
  }

  function getActiveSection() {
    return activeLink ? activeLink.getAttribute('href').slice(1) : null;
  }

  function reset() {
    if (activeLink) activeLink.classList.remove('active');
    activeLink = null;
    _lastActiveIdx = -1;
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
        _setEquivText(_equivEl, 'That\u2019s ', Math.round(yearlyHours) + ' hours',
          ' back every year \u2014 time for what matters \u2728');
      } else {
        var workdays = (yearlyHours / 8).toFixed(1);
        _setEquivText(_equivEl, 'That\u2019s like getting ', workdays + ' extra workdays',
          ' back every year \u2728');
      }
    }
  }

  /**
   * Safely set equivalent text with a bold middle portion (no innerHTML).
   * @param {Element} el - target element
   * @param {string} prefix - text before bold
   * @param {string} boldText - text to make bold
   * @param {string} suffix - text after bold
   */
  function _setEquivText(el, prefix, boldText, suffix) {
    while (el.firstChild) el.removeChild(el.firstChild);
    el.appendChild(document.createTextNode(prefix));
    var strong = document.createElement('strong');
    strong.textContent = boldText;
    el.appendChild(strong);
    el.appendChild(document.createTextNode(suffix));
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
    // Guard against double-init: destroy previous listeners first
    destroy();

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
    // Guard against stale DOM references (element removed or hidden)
    if (!bar || bar.offsetParent === null) return;

    var scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    var docHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
    var progress = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;

    bar.style.width = progress + '%';

    if (btn) {
      if (scrollTop > 400) {
        btn.classList.add('visible');
      } else {
        btn.classList.remove('visible');
      }
    }
  }

  function scrollToTop() {
    if (prefersReducedMotion) {
      window.scrollTo(0, 0);
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  /**
   * Remove scroll listener and release DOM references.
   * Safe to call multiple times or before init().
   */
  function destroy() {
    window.removeEventListener('scroll', onScroll);
    if (btn) {
      btn.removeEventListener('click', scrollToTop);
    }
    bar = null;
    btn = null;
    ticking = false;
  }

  return { init: init, destroy: destroy };
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

      // Guard: prevent double-removal if animationend races with fallback
      var removed = false;
      function removeOnce() {
        if (removed) return;
        removed = true;
        if (last.parentNode) last.parentNode.removeChild(last);
      }

      if (prefersReducedMotion) {
        // Immediate removal when animations are disabled
        removeOnce();
      } else {
        last.addEventListener('animationend', removeOnce);
        // Fallback: if animationend never fires (CSS animation missing,
        // browser throttled, or tab backgrounded), remove after 1s to
        // prevent unbounded DOM growth.
        setTimeout(removeOnce, 1000);
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

// ---------------------------------------------------------------------------
// Prompt Gallery — searchable/filterable example prompts with response modal
// ---------------------------------------------------------------------------
var PromptGallery = (function () {
  var PROMPTS = [
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

  var grid = null;
  var searchInput = null;
  var emptyState = null;
  var modal = null;
  var modalBackdrop = null;
  var modalCloseBtn = null;
  var modalQuestion = null;
  var modalAnswer = null;
  var filterBtns = null;
  var activeCategory = 'all';

  /** Pre-created card elements — one per PROMPTS entry, created once in init. */
  var cardPool = [];
  /** Pre-lowercased search text for each prompt (prompt + response), avoids
   *  repeated toLowerCase() on every keystroke. */
  var searchIndex = [];

  function escapeHtml(str) {
    var d = document.createElement('div');
    d.textContent = str;
    return d.innerHTML;
  }

  /** Build the card pool once. Cards are shown/hidden instead of recreated. */
  function buildCardPool() {
    if (cardPool.length > 0) return; // already built
    for (var i = 0; i < PROMPTS.length; i++) {
      var p = PROMPTS[i];
      var card = document.createElement('div');
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
    var search = (searchInput.value || '').toLowerCase().trim();
    var count = 0;
    for (var i = 0; i < PROMPTS.length; i++) {
      var p = PROMPTS[i];
      var visible = true;
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

// ---------------------------------------------------------------------------
// Personality Configurator
// ---------------------------------------------------------------------------

/* exported PersonalityConfigurator */
var PersonalityConfigurator = (function () {
  'use strict';

  var STORAGE_KEY_PERSONALITY = 'agentbox_personality';

  var QUESTIONS = [
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

  var RESPONSES = {
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

  var HUMOR_ADDITIONS = {
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

  var EMOJI_SETS = {
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

  var PRESETS = {
    professional: { formality: 85, humor: 10, detail: 70, emoji: 5 },
    friendly: { formality: 25, humor: 60, detail: 50, emoji: 55 },
    minimal: { formality: 40, humor: 15, detail: 10, emoji: 0 },
    enthusiastic: { formality: 15, humor: 80, detail: 65, emoji: 90 }
  };

  var currentQuestionIndex = 0;
  var _debounceTimer = null;

  // Cached slider DOM references — resolved once in init(), avoids
  // repeated getElementById calls in getSliderValues/applyPreset.
  var _sliders = null;

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
    try {
      localStorage.setItem(STORAGE_KEY_PERSONALITY, JSON.stringify(values));
    } catch (e) {
      /* localStorage unavailable */
    }
  }

  function loadFromStorage() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY_PERSONALITY);
      if (raw) {
        var parsed = JSON.parse(raw);
        if (typeof parsed.formality === 'number') { return parsed; }
      }
    } catch (e) {
      /* localStorage unavailable or corrupted */
    }
    return null;
  }

  function getSliderValues() {
    var s = _getSliders();
    return {
      formality: s.formality ? parseInt(s.formality.value, 10) : 50,
      humor:     s.humor     ? parseInt(s.humor.value, 10)     : 50,
      detail:    s.detail    ? parseInt(s.detail.value, 10)    : 50,
      emoji:     s.emoji     ? parseInt(s.emoji.value, 10)     : 50
    };
  }

  function generateResponse(questionKey, values) {
    var responses = RESPONSES[questionKey];
    if (!responses) { return ''; }

    var formalKey = values.formality >= 50 ? 'formal' : 'casual';
    var detailKey = values.detail >= 50 ? 'Detailed' : 'Brief';
    var base = responses[formalKey + detailKey];

    var humorData = HUMOR_ADDITIONS[questionKey];
    if (humorData) {
      var humorLevel = values.humor < 30 ? 'low' : (values.humor < 70 ? 'mid' : 'high');
      base += humorData[humorLevel];
    }

    var emojiData = EMOJI_SETS[questionKey];
    if (emojiData) {
      var emojiLevel = values.emoji < 20 ? 'none' : (values.emoji < 65 ? 'some' : 'lots');
      base += emojiData[emojiLevel];
    }

    return base;
  }

  function updatePreview() {
    var bubble = document.getElementById('personalityResponse');
    if (!bubble) { return; }

    var values = getSliderValues();
    saveToStorage(values);
    var question = QUESTIONS[currentQuestionIndex];
    var response = generateResponse(question.key, values);

    bubble.classList.add('updating');
    setTimeout(function () {
      bubble.textContent = response;
      bubble.classList.remove('updating');
    }, 150);

    var presetBtns = document.querySelectorAll('.preset-btn');
    for (var i = 0; i < presetBtns.length; i++) {
      var presetName = presetBtns[i].getAttribute('data-preset');
      var preset = PRESETS[presetName];
      if (!preset) { continue; }
      var isMatch = Math.abs(preset.formality - values.formality) <= 5 &&
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
    var questionEl = document.getElementById('personalityQuestion');
    if (questionEl) {
      questionEl.textContent = '"' + QUESTIONS[currentQuestionIndex].q + '"';
    }
    updatePreview();
  }

  function applyPreset(presetName) {
    var preset = PRESETS[presetName];
    if (!preset) { return; }

    var s = _getSliders();
    if (s.formality) { s.formality.value = preset.formality; }
    if (s.humor)     { s.humor.value     = preset.humor; }
    if (s.detail)    { s.detail.value    = preset.detail; }
    if (s.emoji)     { s.emoji.value     = preset.emoji; }
    saveToStorage(preset);
    updatePreview();
  }

  function init() {
    // Eagerly resolve and cache slider references
    var s = _getSliders();

    // Restore saved slider values from localStorage
    var saved = loadFromStorage();
    if (saved) {
      if (s.formality) { s.formality.value = saved.formality; }
      if (s.humor)     { s.humor.value     = saved.humor; }
      if (s.detail)    { s.detail.value    = saved.detail; }
      if (s.emoji)     { s.emoji.value     = saved.emoji; }
    }

    var sliders = document.querySelectorAll('.personality-range');
    for (var i = 0; i < sliders.length; i++) {
      sliders[i].addEventListener('input', debouncedUpdate);
    }

    var presetBtns = document.querySelectorAll('.preset-btn');
    for (var j = 0; j < presetBtns.length; j++) {
      presetBtns[j].addEventListener('click', function () {
        var preset = this.getAttribute('data-preset');
        applyPreset(preset);
      });
    }

    var cycleBtn = document.getElementById('personalityCycleBtn');
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
  window.PromptGallery = PromptGallery;
  window.PersonalityConfigurator = PersonalityConfigurator;
}

// ── Feature Comparison Table ──────────────────────────────────────
(function() {
  'use strict';

  var YES = '<span class="comp-yes" aria-label="Yes">✓</span>';
  var NO = '<span class="comp-no" aria-label="No">✗</span>';
  function PARTIAL(t) { return '<span class="comp-partial">' + t + '</span>'; }
  function TEXT(t) { return '<span class="comp-text">' + t + '</span>'; }

  var features = [
    {
      name: 'Personal AI assistant',
      agentbox: YES, chatgpt: YES, google: YES, alexa: YES, siri: YES
    },
    {
      name: 'Runs on your own device',
      agentbox: YES, chatgpt: NO, google: NO, alexa: NO, siri: PARTIAL('iCloud')
    },
    {
      name: 'Privacy-first (local data)',
      agentbox: YES, chatgpt: NO, google: NO, alexa: NO, siri: PARTIAL('Partial')
    },
    {
      name: 'Multi-platform messaging',
      agentbox: TEXT('Telegram, WhatsApp, Discord, Signal, iMessage'),
      chatgpt: NO, google: TEXT('Google Home'), alexa: TEXT('Echo only'), siri: TEXT('iMessage')
    },
    {
      name: 'Custom personality',
      agentbox: YES, chatgpt: PARTIAL('GPTs'), google: NO, alexa: PARTIAL('Skills'), siri: NO
    },
    {
      name: 'Browser automation',
      agentbox: YES, chatgpt: NO, google: NO, alexa: NO, siri: NO
    },
    {
      name: 'File system access',
      agentbox: YES, chatgpt: PARTIAL('Uploads'), google: NO, alexa: NO, siri: PARTIAL('Shortcuts')
    },
    {
      name: 'Proactive check-ins',
      agentbox: YES, chatgpt: NO, google: PARTIAL('Routines'), alexa: PARTIAL('Hunches'), siri: NO
    },
    {
      name: 'Cron jobs & scheduling',
      agentbox: YES, chatgpt: NO, google: PARTIAL('Routines'), alexa: PARTIAL('Routines'), siri: PARTIAL('Shortcuts')
    },
    {
      name: 'Extensible skills/plugins',
      agentbox: YES, chatgpt: PARTIAL('GPTs'), google: PARTIAL('Actions'), alexa: TEXT('Skills'), siri: PARTIAL('Shortcuts')
    },
    {
      name: 'Code execution',
      agentbox: YES, chatgpt: YES, google: NO, alexa: NO, siri: NO
    },
    {
      name: 'Long-term memory',
      agentbox: YES, chatgpt: PARTIAL('Limited'), google: NO, alexa: NO, siri: NO
    },
    {
      name: 'Self-hosted / open source',
      agentbox: YES, chatgpt: NO, google: NO, alexa: NO, siri: NO
    },
    {
      name: 'Smart home control',
      agentbox: PARTIAL('Via nodes'), chatgpt: NO, google: YES, alexa: YES, siri: YES
    },
    {
      name: 'Sub-agent delegation',
      agentbox: YES, chatgpt: NO, google: NO, alexa: NO, siri: NO
    },
    {
      name: 'Free tier',
      agentbox: TEXT('20 msg/day'), chatgpt: TEXT('Limited'), google: YES, alexa: YES, siri: YES
    }
  ];

  function render() {
    var tbody = document.getElementById('comparisonBody');
    if (!tbody) return;

    var html = '';
    for (var i = 0; i < features.length; i++) {
      var f = features[i];
      html += '<tr>' +
        '<td>' + f.name + '</td>' +
        '<td class="highlight-cell">' + f.agentbox + '</td>' +
        '<td>' + f.chatgpt + '</td>' +
        '<td>' + f.google + '</td>' +
        '<td>' + f.alexa + '</td>' +
        '<td>' + f.siri + '</td>' +
        '</tr>';
    }
    tbody.innerHTML = html;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', render);
  } else {
    render();
  }
})();

// ── Onboarding Wizard ──────────────────────────────────────
(function initOnboardingWizard() {
  var STORAGE_KEY = 'agentbox_onboarding_done';
  if (localStorage.getItem(STORAGE_KEY)) return;

  var widget = document.getElementById('onboardingWidget');
  var trigger = document.getElementById('onboardingTrigger');
  var panel = document.getElementById('onboardingPanel');
  var closeBtn = document.getElementById('onboardingClose');
  var backBtn = document.getElementById('onboardingBack');
  var nextBtn = document.getElementById('onboardingNext');
  var progressBar = document.getElementById('onboardingProgressBar');
  var titleEl = document.getElementById('onboardingTitle');
  var step1 = document.getElementById('onboardingStep1');
  var step2 = document.getElementById('onboardingStep2');
  var step3 = document.getElementById('onboardingStep3');
  var resultEl = document.getElementById('onboardingResult');

  if (!widget || !trigger || !panel) return;

  var currentStep = 1;
  var selectedRole = null;
  var selectedGoals = [];

  var GOAL_MAP = {
    developer: [
      { key: 'code', icon: '🛠', label: 'Code generation & debugging' },
      { key: 'automate', icon: '⚡', label: 'Task automation' },
      { key: 'learn_tech', icon: '📚', label: 'Learning new tech' },
      { key: 'review', icon: '🔍', label: 'Code review & docs' }
    ],
    student: [
      { key: 'homework', icon: '📝', label: 'Homework & assignments' },
      { key: 'research', icon: '🔬', label: 'Research assistance' },
      { key: 'writing', icon: '✍️', label: 'Essay & paper writing' },
      { key: 'study', icon: '🧠', label: 'Study & memorization' }
    ],
    professional: [
      { key: 'email', icon: '📧', label: 'Email drafting & replies' },
      { key: 'planning', icon: '📋', label: 'Project planning' },
      { key: 'analysis', icon: '📊', label: 'Data analysis & reports' },
      { key: 'meetings', icon: '🗓', label: 'Meeting prep & notes' }
    ],
    casual: [
      { key: 'creative', icon: '🎨', label: 'Creative writing & art' },
      { key: 'travel', icon: '✈️', label: 'Travel planning' },
      { key: 'cooking', icon: '🍳', label: 'Recipes & meal planning' },
      { key: 'trivia', icon: '🧩', label: 'Trivia & general knowledge' }
    ]
  };

  var RECOMMENDATIONS = {
    developer: {
      badge: '💻',
      title: 'The Developer\'s Sidekick',
      desc: 'AgentBox is perfect for devs — it remembers your stack, debugs with you, and codes alongside you in Telegram.',
      features: [
        '✅ Code generation in 50+ languages',
        '✅ Paste errors → get fixes instantly',
        '✅ Search docs and Stack Overflow inline',
        '✅ Set reminders for deployments & standups'
      ],
      plan: 'Recommended: Pro plan (unlimited messages)',
      goalTips: {
        code: 'Pro tip: Paste code directly — AgentBox formats and debugs it.',
        automate: 'Pro tip: Set recurring reminders for CI/CD checks.',
        learn_tech: 'Pro tip: Ask "explain X like I\'m 5" for quick concept breakdowns.',
        review: 'Pro tip: Paste PRs for instant review feedback.'
      }
    },
    student: {
      badge: '🎓',
      title: 'The Study Companion',
      desc: 'Like having a tutor in your pocket. AgentBox breaks down complex topics and helps you write better.',
      features: [
        '✅ Explain any concept step by step',
        '✅ Help structure essays & papers',
        '✅ Quiz you on study material',
        '✅ Search academic sources inline'
      ],
      plan: 'Recommended: Free plan (20 msgs/day is plenty for study sessions)',
      goalTips: {
        homework: 'Pro tip: Describe the problem in your own words first for better help.',
        research: 'Pro tip: Ask for sources and AgentBox will search the web.',
        writing: 'Pro tip: Share your outline first, then ask for paragraph-by-paragraph help.',
        study: 'Pro tip: Ask AgentBox to quiz you on any topic.'
      }
    },
    professional: {
      badge: '💼',
      title: 'The Productivity Multiplier',
      desc: 'AgentBox handles the busywork so you can focus on high-impact tasks. It remembers your preferences and context.',
      features: [
        '✅ Draft emails in your tone and style',
        '✅ Summarize long documents & threads',
        '✅ Set smart reminders that stick',
        '✅ Analyze data and generate reports'
      ],
      plan: 'Recommended: Pro plan (unlimited = no friction in your flow)',
      goalTips: {
        email: 'Pro tip: Tell AgentBox your writing style once — it remembers.',
        planning: 'Pro tip: Brain-dump tasks and ask for a structured plan.',
        analysis: 'Pro tip: Paste CSV data directly for quick insights.',
        meetings: 'Pro tip: Send agenda before meetings, get prep notes back.'
      }
    },
    casual: {
      badge: '🌟',
      title: 'The Creative Companion',
      desc: 'AgentBox is fun to talk to — creative, knowledgeable, and always up for a good conversation.',
      features: [
        '✅ Write stories, poems, and jokes',
        '✅ Plan trips with detailed itineraries',
        '✅ Get recipes based on what you have',
        '✅ Settle debates with sourced facts'
      ],
      plan: 'Recommended: Free plan (20 msgs/day for casual fun)',
      goalTips: {
        creative: 'Pro tip: Give AgentBox a character or style to write in.',
        travel: 'Pro tip: Share dates + budget for personalized itineraries.',
        cooking: 'Pro tip: List ingredients you have and get instant recipes.',
        trivia: 'Pro tip: Challenge AgentBox to trivia — it keeps score!'
      }
    }
  };

  // Show widget after 5 seconds
  setTimeout(function() {
    widget.removeAttribute('hidden');
  }, 5000);

  function updateStepUI() {
    step1.hidden = currentStep !== 1;
    step2.hidden = currentStep !== 2;
    step3.hidden = currentStep !== 3;
    progressBar.style.width = (currentStep * 33.33) + '%';
    backBtn.hidden = currentStep === 1;

    var dots = widget.querySelectorAll('.onboarding-dot');
    dots.forEach(function(d) {
      d.classList.toggle('active', parseInt(d.getAttribute('data-dot')) === currentStep);
    });

    var titles = ['Let\'s find your fit', 'What are your goals?', 'Your personalized plan'];
    titleEl.textContent = titles[currentStep - 1];

    if (currentStep === 1) {
      nextBtn.disabled = !selectedRole;
      nextBtn.textContent = 'Next →';
    } else if (currentStep === 2) {
      nextBtn.disabled = selectedGoals.length === 0;
      nextBtn.textContent = 'See my plan →';
    } else {
      nextBtn.textContent = 'Done ✓';
      nextBtn.disabled = false;
    }
  }

  function populateGoals() {
    var goalsContainer = step2.querySelector('.onboarding-goals');
    goalsContainer.innerHTML = '';
    var goals = GOAL_MAP[selectedRole] || [];
    goals.forEach(function(g) {
      var btn = document.createElement('button');
      btn.className = 'onboarding-option';
      btn.setAttribute('data-goal', g.key);
      btn.setAttribute('aria-pressed', 'false');
      btn.innerHTML = '<span class="onboarding-option-icon">' + g.icon + '</span>' +
        '<span class="onboarding-option-label">' + g.label + '</span>';
      btn.addEventListener('click', function() {
        toggleGoal(g.key, btn);
      });
      goalsContainer.appendChild(btn);
    });
  }

  function toggleGoal(key, btn) {
    var idx = selectedGoals.indexOf(key);
    if (idx > -1) {
      selectedGoals.splice(idx, 1);
      btn.setAttribute('aria-pressed', 'false');
      btn.classList.remove('selected');
    } else if (selectedGoals.length < 2) {
      selectedGoals.push(key);
      btn.setAttribute('aria-pressed', 'true');
      btn.classList.add('selected');
    }
    nextBtn.disabled = selectedGoals.length === 0;
  }

  function buildResult() {
    var rec = RECOMMENDATIONS[selectedRole] || RECOMMENDATIONS.casual;
    var tips = [];
    selectedGoals.forEach(function(g) {
      if (rec.goalTips[g]) tips.push(rec.goalTips[g]);
    });

    var featuresHTML = rec.features.map(function(f) {
      return '<li>' + f + '</li>';
    }).join('');

    var tipsHTML = tips.length > 0
      ? tips.map(function(t) { return '<li>💡 ' + t + '</li>'; }).join('')
      : '';

    resultEl.innerHTML =
      '<div class="onboarding-result-badge">' + rec.badge + '</div>' +
      '<h4 class="onboarding-result-title">' + rec.title + '</h4>' +
      '<p class="onboarding-result-desc">' + rec.desc + '</p>' +
      '<ul class="onboarding-result-features">' + featuresHTML + tipsHTML + '</ul>' +
      '<p class="onboarding-result-plan">' + rec.plan + '</p>' +
      '<a href="https://t.me/AgentBox11Bot" target="_blank" rel="noopener noreferrer" class="onboarding-result-cta">Start Chatting →</a>';
  }

  // Event: trigger button
  trigger.addEventListener('click', function() {
    var isOpen = !panel.hidden;
    panel.hidden = isOpen;
    if (!isOpen) trigger.querySelector('.onboarding-trigger-pulse').style.display = 'none';
  });

  // Event: close
  closeBtn.addEventListener('click', function() {
    panel.hidden = true;
    localStorage.setItem(STORAGE_KEY, '1');
    widget.hidden = true;
  });

  // Event: next
  nextBtn.addEventListener('click', function() {
    if (currentStep === 1 && selectedRole) {
      currentStep = 2;
      selectedGoals = [];
      populateGoals();
    } else if (currentStep === 2 && selectedGoals.length > 0) {
      currentStep = 3;
      buildResult();
    } else if (currentStep === 3) {
      localStorage.setItem(STORAGE_KEY, '1');
      widget.hidden = true;
      return;
    }
    updateStepUI();
  });

  // Event: back
  backBtn.addEventListener('click', function() {
    if (currentStep > 1) {
      currentStep--;
      updateStepUI();
    }
  });

  // Event: role selection (step 1)
  step1.querySelectorAll('.onboarding-option').forEach(function(btn) {
    btn.addEventListener('click', function() {
      selectedRole = btn.getAttribute('data-role');
      step1.querySelectorAll('.onboarding-option').forEach(function(b) {
        b.setAttribute('aria-pressed', 'false');
        b.classList.remove('selected');
      });
      btn.setAttribute('aria-pressed', 'true');
      btn.classList.add('selected');
      nextBtn.disabled = false;
    });
  });

  // Keyboard: Escape to close
  panel.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
      panel.hidden = true;
    }
  });
})();

// ---------------------------------------------------------------------------
// Feature Tour — Guided Walkthrough Overlay
// ---------------------------------------------------------------------------
/**
 * Interactive step-by-step product tour that highlights key sections
 * of the landing page.  Shows a spotlight overlay with a tooltip,
 * progress dots, and prev/next/skip controls.
 *
 * Tour can be launched via:
 *   - The "Take a Tour" button (#tourTrigger) if present in the HTML
 *   - Keyboard shortcut: Shift+/ (?) — same as help, tour shown on
 *     second press if help is already open
 *   - Programmatically: FeatureTour.start()
 *
 * Accessibility: focus trap inside tooltip, arrow-key navigation,
 * Escape to exit, reduced-motion support.
 *
 * Persistence: remembers whether the user has completed the tour
 * in localStorage so it doesn't re-prompt.
 */
var FeatureTour = (function () {
  'use strict';

  // ── Tour stop definitions ────────────────────────────────────────
  var STOPS = [
    {
      target: '#chatWindow',
      title: 'Interactive Chat Demo',
      body: 'Try a live conversation! Switch between scenarios to see how AgentBox handles memory, search, reminders, and image generation.',
      position: 'bottom'
    },
    {
      target: '#testimonialsSection',
      title: 'What People Say',
      body: 'Read real testimonials from developers, students, and professionals who use AgentBox every day.',
      position: 'top'
    },
    {
      target: '.pricing-section, #billingToggle',
      title: 'Simple Pricing',
      body: 'Toggle between monthly and yearly billing. The free tier gives you 20 messages a day — enough to get started.',
      position: 'top'
    },
    {
      target: '#usecasesSection',
      title: 'Use Cases',
      body: 'See tailored examples for developers, students, and professionals. Click the tabs to explore each.',
      position: 'top'
    },
    {
      target: '#integrationsSection',
      title: 'Integrations',
      body: 'AgentBox connects to messaging apps, productivity tools, and developer platforms you already use.',
      position: 'top'
    },
    {
      target: '.playground-section, #playgroundInput',
      title: 'Try the Playground',
      body: 'Type a message and see how AgentBox responds. It\'s pattern-matched for this demo — the real thing is even smarter.',
      position: 'top'
    },
    {
      target: '#promptGalleryGrid',
      title: 'Prompt Gallery',
      body: 'Browse ready-made prompts by category. Click any card to see the AI response. Great for getting started quickly.',
      position: 'top'
    },
    {
      target: '.trust-section',
      title: 'Privacy & Trust',
      body: 'Your data stays on your device. Click any card to learn more about our privacy-first architecture.',
      position: 'top'
    }
  ];

  var STORAGE_KEY = 'agentbox_tour_completed';

  // ── State ────────────────────────────────────────────────────────
  var currentStep = -1;
  var isActive = false;
  var overlay = null;
  var tooltip = null;
  var spotlight = null;

  // ── Helpers ──────────────────────────────────────────────────────

  /** Resolve the first matching element for a comma-separated selector. */
  function resolveTarget(selectorList) {
    var selectors = selectorList.split(',');
    for (var i = 0; i < selectors.length; i++) {
      var el = document.querySelector(selectors[i].trim());
      if (el) return el;
    }
    return null;
  }

  /** Smoothly scroll element into view, respecting reduced motion. */
  function scrollIntoView(el, cb) {
    var rect = el.getBoundingClientRect();
    var inView = rect.top >= 0 && rect.bottom <= window.innerHeight;
    if (inView) {
      if (cb) cb();
      return;
    }
    if (typeof prefersReducedMotion !== 'undefined' && prefersReducedMotion) {
      el.scrollIntoView({ block: 'center' });
      if (cb) cb();
    } else {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      // Wait for scroll to settle
      setTimeout(function () { if (cb) cb(); }, 400);
    }
  }

  /** Position the spotlight overlay to frame the target element. */
  function positionSpotlight(el) {
    var rect = el.getBoundingClientRect();
    var pad = 8;
    spotlight.style.top = (window.scrollY + rect.top - pad) + 'px';
    spotlight.style.left = (rect.left - pad) + 'px';
    spotlight.style.width = (rect.width + pad * 2) + 'px';
    spotlight.style.height = (rect.height + pad * 2) + 'px';
  }

  /** Position tooltip relative to spotlight. */
  function positionTooltip(el, position) {
    var rect = el.getBoundingClientRect();
    var tw = Math.min(340, window.innerWidth - 32);
    tooltip.style.width = tw + 'px';

    if (position === 'bottom') {
      tooltip.style.top = (window.scrollY + rect.bottom + 16) + 'px';
    } else {
      // above the element
      tooltip.style.top = (window.scrollY + rect.top - tooltip.offsetHeight - 16) + 'px';
    }

    // Horizontally center on target, clamp to viewport
    var left = rect.left + rect.width / 2 - tw / 2;
    left = Math.max(16, Math.min(left, window.innerWidth - tw - 16));
    tooltip.style.left = left + 'px';
  }

  // ── DOM creation ─────────────────────────────────────────────────

  function createOverlay() {
    if (overlay) return;

    // Semi-transparent backdrop
    overlay = document.createElement('div');
    overlay.id = 'tourOverlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-label', 'Feature Tour');
    overlay.setAttribute('aria-modal', 'true');
    overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;'
      + 'background:rgba(0,0,0,0.55);z-index:10000;transition:opacity 0.25s;';

    // Spotlight cutout (positioned absolutely over the page)
    spotlight = document.createElement('div');
    spotlight.id = 'tourSpotlight';
    spotlight.style.cssText = 'position:absolute;border-radius:8px;'
      + 'box-shadow:0 0 0 9999px rgba(0,0,0,0.55);z-index:10001;'
      + 'pointer-events:none;transition:top 0.3s,left 0.3s,width 0.3s,height 0.3s;';
    document.body.appendChild(spotlight);

    // Tooltip
    tooltip = document.createElement('div');
    tooltip.id = 'tourTooltip';
    tooltip.setAttribute('role', 'status');
    tooltip.setAttribute('aria-live', 'polite');
    tooltip.style.cssText = 'position:absolute;z-index:10002;background:#fff;color:#1a1a2e;'
      + 'border-radius:12px;padding:20px;box-shadow:0 8px 32px rgba(0,0,0,0.25);'
      + 'font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;'
      + 'max-width:340px;transition:top 0.3s,left 0.3s;';

    tooltip.innerHTML = '<div id="tourTitle" style="font-size:16px;font-weight:700;margin-bottom:8px;"></div>'
      + '<div id="tourBody" style="font-size:14px;line-height:1.5;color:#444;margin-bottom:16px;"></div>'
      + '<div id="tourDots" style="text-align:center;margin-bottom:12px;"></div>'
      + '<div style="display:flex;justify-content:space-between;align-items:center;">'
      + '  <button id="tourSkip" style="background:none;border:none;color:#888;cursor:pointer;'
      + '    font-size:13px;padding:4px 8px;" aria-label="Skip tour">Skip</button>'
      + '  <div>'
      + '    <button id="tourPrev" style="background:none;border:1px solid #ddd;border-radius:6px;'
      + '      padding:6px 14px;cursor:pointer;margin-right:8px;font-size:13px;" aria-label="Previous step">← Prev</button>'
      + '    <button id="tourNext" style="background:#6c5ce7;color:#fff;border:none;border-radius:6px;'
      + '      padding:6px 14px;cursor:pointer;font-size:13px;font-weight:600;" aria-label="Next step">Next →</button>'
      + '  </div>'
      + '</div>';

    document.body.appendChild(tooltip);

    // Events
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) stop();
    });

    tooltip.querySelector('#tourSkip').addEventListener('click', stop);
    tooltip.querySelector('#tourPrev').addEventListener('click', prev);
    tooltip.querySelector('#tourNext').addEventListener('click', function () {
      if (currentStep >= STOPS.length - 1) {
        stop();
      } else {
        next();
      }
    });

    document.body.appendChild(overlay);
  }

  function destroyOverlay() {
    if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay);
    if (spotlight && spotlight.parentNode) spotlight.parentNode.removeChild(spotlight);
    if (tooltip && tooltip.parentNode) tooltip.parentNode.removeChild(tooltip);
    overlay = null;
    spotlight = null;
    tooltip = null;
  }

  // ── Navigation ───────────────────────────────────────────────────

  function showStep(idx) {
    if (idx < 0 || idx >= STOPS.length) return;
    currentStep = idx;
    var stop = STOPS[idx];
    var target = resolveTarget(stop.target);

    if (!target) {
      // Skip missing sections
      if (idx < STOPS.length - 1) { showStep(idx + 1); }
      else { stop(); }
      return;
    }

    scrollIntoView(target, function () {
      positionSpotlight(target);
      // Render content
      tooltip.querySelector('#tourTitle').textContent = stop.title;
      tooltip.querySelector('#tourBody').textContent = stop.body;

      // Progress dots
      var dotsHtml = '';
      for (var i = 0; i < STOPS.length; i++) {
        var active = i === idx;
        dotsHtml += '<span style="display:inline-block;width:8px;height:8px;'
          + 'border-radius:50%;margin:0 3px;background:'
          + (active ? '#6c5ce7' : '#ddd') + ';" aria-label="Step ' + (i + 1)
          + (active ? ' (current)' : '') + '"></span>';
      }
      tooltip.querySelector('#tourDots').innerHTML = dotsHtml;

      // Prev button visibility
      tooltip.querySelector('#tourPrev').style.display = idx === 0 ? 'none' : 'inline-block';

      // Last step: change Next to "Done"
      var nextBtn = tooltip.querySelector('#tourNext');
      if (idx === STOPS.length - 1) {
        nextBtn.textContent = 'Done ✓';
      } else {
        nextBtn.textContent = 'Next →';
      }

      // Step counter in title
      tooltip.querySelector('#tourTitle').textContent =
        '(' + (idx + 1) + '/' + STOPS.length + ') ' + stop.title;

      positionTooltip(target, stop.position);
      nextBtn.focus();
    });
  }

  function next() {
    if (currentStep < STOPS.length - 1) showStep(currentStep + 1);
  }

  function prev() {
    if (currentStep > 0) showStep(currentStep - 1);
  }

  // ── Public API ───────────────────────────────────────────────────

  function start() {
    if (isActive) return;
    isActive = true;
    currentStep = -1;
    createOverlay();
    overlay.style.opacity = '1';
    showStep(0);

    // Keyboard handler
    document.addEventListener('keydown', onKeyDown);
  }

  function stop() {
    if (!isActive) return;
    isActive = false;
    currentStep = -1;
    document.removeEventListener('keydown', onKeyDown);
    destroyOverlay();

    // Mark as completed
    try { localStorage.setItem(STORAGE_KEY, 'true'); } catch (e) { /* private browsing */ }
  }

  function onKeyDown(e) {
    if (!isActive) return;
    if (e.key === 'Escape') {
      e.preventDefault();
      stop();
    } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      if (currentStep >= STOPS.length - 1) stop();
      else next();
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      prev();
    }
  }

  /** Whether the user has completed the tour before. */
  function hasCompleted() {
    try { return localStorage.getItem(STORAGE_KEY) === 'true'; } catch (e) { return false; }
  }

  /** Reset the completed flag (for testing or re-prompting). */
  function reset() {
    try { localStorage.removeItem(STORAGE_KEY); } catch (e) { /* noop */ }
  }

  // ── Init: bind trigger button ────────────────────────────────────
  document.addEventListener('DOMContentLoaded', function () {
    var trigger = document.getElementById('tourTrigger');
    if (trigger) {
      trigger.addEventListener('click', function () { start(); });
    }
  });

  return {
    start: start,
    stop: stop,
    next: next,
    prev: prev,
    currentStep: function () { return currentStep; },
    isActive: function () { return isActive; },
    hasCompleted: hasCompleted,
    reset: reset,
    _STOPS: STOPS
  };
})();
