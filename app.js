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
 *  - ApiExplorer:              interactive API endpoint browser with curl/response preview
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
  let el = document.createElement('div');
  el.className = 'typing-indicator';
  for (var i = 0; i < 3; i++) el.appendChild(document.createElement('span'));
  return el;
})();

// ---------------------------------------------------------------------------
// Chat Demo Module
// ---------------------------------------------------------------------------

var ChatDemo = (function () {
  let animationTimer = null;
  let animationGeneration = 0;
  let scrollRafId = 0;
  /** Cached scenario buttons — avoids querySelectorAll on every switch. */
  let _scenarioBtns = null;

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
    const bubble = document.createElement('div');
    bubble.className = 'chat-bubble ' + msg.role;

    const frag = document.createDocumentFragment();
    const lines = msg.text.split('\n');

    for (var i = 0; i < lines.length; i++) {
      if (i > 0) frag.appendChild(document.createElement('br'));
      // Split on backtick-delimited code spans (odd indices are code).
      const segments = lines[i].split(/`([^`]+)`/);
      for (var s = 0; s < segments.length; s++) {
        if (s % 2 === 1) {
          const code = document.createElement('code');
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
    const chatWindow = document.getElementById('chatWindow');
    if (!chatWindow) return;

    chatWindow.innerHTML = '';
    if (!Object.prototype.hasOwnProperty.call(SCENARIOS, name)) return;
    const messages = SCENARIOS[name];
    if (!messages) return;

    let idx = 0;
    const gen = animationGeneration;

    function isStale() {
      return gen !== animationGeneration;
    }

    function showNext() {
      if (idx >= messages.length || isStale()) return;
      const msg = messages[idx];

      if (msg.role === 'bot') {
        const typing = _typingIndicatorTemplate.cloneNode(true);
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
    // Remove any orphaned typing indicators left from the previous scenario.
    // When switchTo() fires mid-animation, a typing indicator may already be
    // in the DOM waiting for its setTimeout callback — which will now bail
    // via isStale(), leaving the indicator visible.  Clean them up here.
    var chatWindow = document.getElementById('chatWindow');
    if (chatWindow) {
      var orphans = chatWindow.querySelectorAll('.typing-indicator');
      for (var oi = 0; oi < orphans.length; oi++) {
        orphans[oi].parentNode.removeChild(orphans[oi]);
      }
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
  let currentIndex = 0;
  let totalSlides = 0;
  let autoPlayTimer = null;
  const AUTO_PLAY_INTERVAL = 5000;

  // Cached DOM references — avoid re-querying on every goTo() call.
  // goTo() runs every 5s via autoplay; caching eliminates ~12
  // getElementById + querySelectorAll calls per minute.
  let _track = null;
  let _dots = [];

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
    const section = document.getElementById('testimonialsSection');
    if (section) {
      section.addEventListener('mouseenter', stopAutoPlay);
      section.addEventListener('mouseleave', function () {
        if (!prefersReducedMotion) startAutoPlay();
      });

      // Keyboard navigation for the carousel.
      section.setAttribute('tabindex', '0');
      section.setAttribute('role', 'region');
      section.setAttribute('aria-roledescription', 'carousel');
      section.addEventListener('keydown', function (e) {
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
          e.preventDefault();
          goTo(currentIndex + 1);
          if (autoPlayTimer) startAutoPlay();
        } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
          e.preventDefault();
          goTo(currentIndex - 1);
          if (autoPlayTimer) startAutoPlay();
        }
      });
    }
  }

  /** Create navigation dots matching the number of slides. */
  function buildDots() {
    const dotsContainer = document.getElementById('testimonialsDots');
    if (!dotsContainer) return;

    dotsContainer.innerHTML = '';
    _dots = [];
    for (var i = 0; i < totalSlides; i++) {
      const dot = document.createElement('button');
      dot.className = 'testimonial-dot';
      dot.setAttribute('aria-label', 'Go to testimonial ' + (i + 1));
      dot.dataset.index = String(i);
      (function (idx) {
        dot.addEventListener('click', function () {
          goTo(idx);
          if (autoPlayTimer) startAutoPlay();
        });
      })(i);
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
  let isYearly = false;

  // Cached DOM references — resolved once, reused on each toggle.
  let _toggleEl = null;
  let _monthlyLabel = null;
  let _yearlyLabel = null;
  let _priceAmounts = null;
  let _pricePeriods = null;
  let _resolved = false;

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
      const priceEl = _priceAmounts[pi].parentElement;
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
    const item = questionEl.closest('.faq-item');
    if (!item) return;

    const wasOpen = item.classList.contains('open');

    // Close sibling items (accordion behaviour).
    // Scoped to parent container instead of full document scan.
    const siblings = item.parentElement ? item.parentElement.querySelectorAll('.faq-item.open') : [];
    for (var si = 0; si < siblings.length; si++) {
      siblings[si].classList.remove('open');
      const q = siblings[si].querySelector('.faq-question');
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
  let observed = false;

  /** Reveal step cards with staggered animation when section scrolls into view. */
  function init() {
    const section = document.getElementById('howItWorks');
    if (!section) return;

    const steps = section.querySelectorAll('.step');
    if (steps.length === 0) return;

    // Use IntersectionObserver if available, otherwise reveal immediately.
    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver(
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
    const section = document.getElementById('howItWorks');
    if (section) {
      const steps = section.querySelectorAll('.step');
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
  let animated = false;
  const DURATION = 2000; // animation duration in ms

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
    const numberEl = card.querySelector('.stat-number');
    if (!numberEl) return;

    let target = parseInt(card.dataset.target, 10);
    const suffix = card.dataset.suffix || '';
    const decimal = card.dataset.decimal || '';
    let prefix = '';

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

    let startTime = null;
    let prev = -1;

    function tick(timestamp) {
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;
      const progress = Math.min(elapsed / DURATION, 1);
      const easedProgress = easeOutCubic(progress);
      let current = Math.round(easedProgress * target);

      // Ensure monotonic progression - never go backwards
      if (current < prev) current = prev;
      prev = current;

      // Final frame
      if (current === target || progress >= 1) {
        card._statsRafId = null;

        let finalDisplay = prefix + formatNumber(target);
        if (decimal) {
          finalDisplay = prefix + formatNumber(target) + '.' + decimal;
        }
        finalDisplay += suffix;
        numberEl.textContent = finalDisplay;
        card.classList.add('animated');
        return;
      }

      let display = prefix + formatNumber(current);
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
    const numberEl = card.querySelector('.stat-number');
    if (!numberEl) return;

    let target = parseInt(card.dataset.target, 10);
    const suffix = card.dataset.suffix || '';
    const decimal = card.dataset.decimal || '';
    let prefix = '';

    if (numberEl.textContent.indexOf('<') === 0) {
      prefix = '<';
    }

    if (isNaN(target)) return;

    let display = prefix + formatNumber(target);
    if (decimal) display += '.' + decimal;
    display += suffix;
    numberEl.textContent = display;
    card.classList.add('animated');
  }

  /** Initialize - observe the stats section for scroll-triggered animation. */
  function init() {
    const section = document.getElementById('statsSection');
    if (!section) return;

    const cards = section.querySelectorAll('.stat-card');
    if (cards.length === 0) return;

    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver(
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
    const section = document.getElementById('statsSection');
    if (section) {
      const cards = section.querySelectorAll('.stat-card');
      for (var i = 0; i < cards.length; i++) {
        if (cards[i]._statsRafId) {
          cancelAnimationFrame(cards[i]._statsRafId);
          cards[i]._statsRafId = null;
        }
        cards[i].classList.remove('animated');
        const numEl = cards[i].querySelector('.stat-number');
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
  let currentTab = 'dev';
  let _section = null;

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
    const tabs = section().querySelectorAll('.usecase-tab');
    const panels = section().querySelectorAll('.usecase-panel');

    let found = false;
    for (var i = 0; i < tabs.length; i++) {
      if (tabs[i].dataset.usecase === tabId) {
        found = true;
        break;
      }
    }
    if (!found) return;

    for (var j = 0; j < tabs.length; j++) {
      const isTarget = tabs[j].dataset.usecase === tabId;
      tabs[j].classList.toggle('active', isTarget);
      tabs[j].setAttribute('aria-selected', isTarget ? 'true' : 'false');
      tabs[j].setAttribute('tabindex', isTarget ? '0' : '-1');
    }

    for (var k = 0; k < panels.length; k++) {
      const panelId = panels[k].id;
      let isActive = panelId === 'usecase-' + tabId;
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
    const tabs = section().querySelectorAll('.usecase-tab');
    const ids = [];
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

    const tablist = section().querySelector('[role="tablist"]');
    if (!tablist) return;

    // Set initial tabindex values.
    const tabs = tablist.querySelectorAll('.usecase-tab');
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
  let currentCategory = 'all';
  let _section = null;

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

    const cards = section().querySelectorAll('.integration-card');
    const buttons = section().querySelectorAll('.integration-filter-btn');

    // Update filter buttons
    for (var i = 0; i < buttons.length; i++) {
      let isActive = buttons[i].dataset.category === category;
      buttons[i].classList.toggle('active', isActive);
      buttons[i].setAttribute('aria-selected', isActive ? 'true' : 'false');
    }

    // Show/hide cards
    let visibleCount = 0;
    for (var j = 0; j < cards.length; j++) {
      const match = category === 'all' || cards[j].dataset.category === category;
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
    const buttons = section().querySelectorAll('.integration-filter-btn');
    const cats = [];
    for (var i = 0; i < buttons.length; i++) {
      if (buttons[i].dataset.category) cats.push(buttons[i].dataset.category);
    }
    return cats;
  }

  /** Get integration cards data. */
  function getIntegrations(category) {
    if (!section()) return [];
    const cards = section().querySelectorAll('.integration-card');
    let result = [];
    for (var i = 0; i < cards.length; i++) {
      const card = cards[i];
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
    const integrations = getIntegrations();
    const counts = { live: 0, coming: 0 };
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

    let filterContainer = section().querySelector('.integrations-filter');
    if (!filterContainer) return;

    filterContainer.addEventListener('click', function (e) {
      let btn = e.target.closest('.integration-filter-btn');
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
  let currentTag = 'all';
  let _section = null;

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
      let isActive = _filterBtns[i].dataset.tag === tag;
      _filterBtns[i].classList.toggle('active', isActive);
      _filterBtns[i].setAttribute('aria-selected', isActive ? 'true' : 'false');
    }

    let visibleCount = 0;
    for (var j = 0; j < _entries.length; j++) {
      const match = tag === 'all' || _entries[j].dataset.tag === tag;
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
    const buttons = section().querySelectorAll('.changelog-filter-btn');
    const tags = [];
    for (var i = 0; i < buttons.length; i++) {
      if (buttons[i].dataset.tag) tags.push(buttons[i].dataset.tag);
    }
    return tags;
  }

  /** Get changelog entries data, optionally filtered by tag. */
  function getEntries(tag) {
    if (!section()) return [];
    const entries = section().querySelectorAll('.changelog-entry');
    let result = [];
    for (var i = 0; i < entries.length; i++) {
      const entry = entries[i];
      if (tag && tag !== 'all' && entry.dataset.tag !== tag) continue;
      const content = entry.querySelector('.changelog-content');
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
    const entries = getEntries();
    const counts = { feature: 0, improvement: 0, fix: 0 };
    for (var i = 0; i < entries.length; i++) {
      if (counts[entries[i].tag] !== undefined) counts[entries[i].tag]++;
    }
    return counts;
  }

  /** Cached DOM collections — resolved once on init. */
  let _filterBtns = [];
  let _entries = [];

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

    let filterContainer = section().querySelector('.changelog-filter');
    if (!filterContainer) return;

    filterContainer.addEventListener('click', function (e) {
      let btn = e.target.closest('.changelog-filter-btn');
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
// Notification Preview - Phone Mockup with Scenario Cycling
// ---------------------------------------------------------------------------

var NotificationPreview = (function () {
  let SCENARIOS = [
    { title: 'Reminder', body: 'Your meeting with Sarah starts in 15 minutes', detail: 'Meeting: Q1 Planning Review\nLocation: Conference Room B\nAttendees: Sarah, Mike, Lisa', time: '2m ago' },
    { title: 'Search Result', body: 'Found 3 flights to Tokyo under $500', detail: 'Flight 1: ANA — $487 (direct, 11h 20m)\nFlight 2: JAL — $492 (direct, 11h 45m)\nFlight 3: United — $498 (1 stop, 14h 10m)', time: '5m ago' },
    { title: 'Daily Digest', body: 'Good morning! You have 4 tasks today...', detail: '1. Review PR #342\n2. Submit expense report\n3. Call dentist at 2pm\n4. Pick up groceries', time: '8:00 AM' },
    { title: 'Smart Alert', body: 'Your Amazon package is out for delivery', detail: 'Order: Wireless Earbuds (Pro)\nEstimated delivery: Today by 5pm\nCarrier: UPS — 8 stops away', time: '11m ago' },
    { title: 'Scheduled Message', body: 'Message sent to Mom: Happy Birthday!', detail: 'Scheduled at 7:00 AM\nDelivered via iMessage\nRead receipt: Seen at 7:03 AM', time: '7:00 AM' }
  ];

  let _currentIndex = 0;
  let _viewMode = 'compact'; // 'compact' or 'detailed'
  let _titleEl = null;
  let _bodyEl = null;
  let _detailEl = null;
  let _notifEl = null;

  function _cacheDOM() {
    const section = document.getElementById('notificationSection');
    if (!section) return false;
    _notifEl = section.querySelector('.phone-notification');
    _titleEl = section.querySelector('.phone-notif-title');
    _bodyEl = section.querySelector('.phone-notif-body');
    _detailEl = section.querySelector('.phone-notif-detail');
    return !!(_titleEl && _bodyEl && _detailEl && _notifEl);
  }

  function _render() {
    if (!_titleEl && !_cacheDOM()) return;
    let s = SCENARIOS[_currentIndex];
    _titleEl.textContent = s.title;
    _bodyEl.textContent = s.body;
    _detailEl.textContent = s.detail;
    _detailEl.hidden = _viewMode !== 'detailed';
  }

  function _animateIn() {
    if (!_notifEl) return;
    _notifEl.classList.remove('notif-slide-in');
    // Force reflow so re-adding the class triggers animation
    void _notifEl.offsetWidth;
    if (!prefersReducedMotion) {
      _notifEl.classList.add('notif-slide-in');
    }
  }

  function switchScenario(index) {
    if (index < 0 || index >= SCENARIOS.length) return;
    _currentIndex = index;
    _animateIn();
    _render();

    // Update active states on scenario buttons
    const section = document.getElementById('notificationSection');
    if (!section) return;
    const btns = section.querySelectorAll('.notif-scenario-btn');
    for (var i = 0; i < btns.length; i++) {
      let isActive = i === index;
      btns[i].classList.toggle('active', isActive);
      btns[i].setAttribute('aria-selected', String(isActive));
      btns[i].setAttribute('tabindex', isActive ? '0' : '-1');
    }
  }

  function setView(mode) {
    if (mode !== 'compact' && mode !== 'detailed') return;
    _viewMode = mode;
    _render();

    const section = document.getElementById('notificationSection');
    if (!section) return;
    const btns = section.querySelectorAll('.notif-view-btn');
    for (var i = 0; i < btns.length; i++) {
      let isActive = btns[i].dataset.view === mode;
      btns[i].classList.toggle('active', isActive);
      btns[i].setAttribute('aria-pressed', String(isActive));
    }
  }

  function init() {
    if (!_cacheDOM()) return;
    _render();

    // Bind event delegation (previously in the main DOMContentLoaded block)
    var section = document.getElementById('notificationSection');
    if (!section) return;
    var notifScenarios = section.querySelector('.notification-scenarios');
    if (notifScenarios) {
      notifScenarios.addEventListener('click', function (e) {
        var btn = e.target.closest('.notif-scenario-btn');
        if (btn && btn.dataset.scenario !== undefined) {
          switchScenario(parseInt(btn.dataset.scenario, 10));
        }
      });
      arrowKeyNav(notifScenarios, '.notif-scenario-btn', function (btn) {
        switchScenario(parseInt(btn.dataset.scenario, 10));
        btn.focus();
      });
    }
    var notifViewToggle = section.querySelector('.notification-view-toggle');
    if (notifViewToggle) {
      notifViewToggle.addEventListener('click', function (e) {
        var btn = e.target.closest('.notif-view-btn');
        if (btn && btn.dataset.view) {
          setView(btn.dataset.view);
        }
      });
    }
  }

  function getCurrent() { return _currentIndex; }
  function getView() { return _viewMode; }
  function getScenarios() { return SCENARIOS; }

  return {
    init: init,
    switchScenario: switchScenario,
    setView: setView,
    getCurrent: getCurrent,
    getView: getView,
    getScenarios: getScenarios
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

    const detail = card.querySelector('.trust-detail');
    if (!detail) return;

    const wasExpanded = card.classList.contains('expanded');

    // Collapse sibling cards (accordion).
    // Scoped to parent instead of full document scan.
    const parent = card.parentElement;
    if (parent) {
      const expanded = parent.querySelectorAll('.trust-card.expanded');
      for (var ei = 0; ei < expanded.length; ei++) {
        expanded[ei].classList.remove('expanded');
        const d = expanded[ei].querySelector('.trust-detail');
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
    const items = Array.prototype.slice.call(
      container.querySelectorAll(selector)
    );
    if (items.length === 0) return;

    let idx = items.indexOf(e.target);
    // Only handle events originating from one of the navigable items.
    if (idx === -1) return;

    let next = -1;
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
    let target = e.target.closest(selector);
    if (!target) return;
    e.preventDefault();
    onActivate(target);
  });
}

// ---------------------------------------------------------------------------
// Lazy Initialization — defer below-fold module setup via IntersectionObserver
// ---------------------------------------------------------------------------
//
// Modules whose sections start far below the viewport don't need to query the
// DOM, attach listeners, or run animations at page load.  `lazyInit` observes
// each section and runs its init callback only once the section is within
// `rootMargin` pixels of the viewport.  Modules that are essential for above-
// the-fold content (SiteNav, ChatDemo, ThemeToggle, ScrollProgress) are still
// initialized immediately.

var _lazyInitQueue = [];
var _lazyObserver = null;

/**
 * Register a module for deferred initialization.
 * @param {string}   sectionId  DOM id of the section container.
 * @param {Function} initFn     Callback invoked once when section is near viewport.
 */
function lazyInit(sectionId, initFn) {
  var el = document.getElementById(sectionId);
  if (!el) {
    // Section not in DOM — init immediately in case it was removed/renamed
    initFn();
    return;
  }
  _lazyInitQueue.push({ el: el, fn: initFn, done: false });
}

/**
 * Start observing all queued sections.  Called once after all lazyInit()
 * registrations are complete.
 */
function startLazyObserver() {
  if (!('IntersectionObserver' in window)) {
    // Fallback: init everything immediately on older browsers
    _lazyInitQueue.forEach(function (item) { if (!item.done) { item.done = true; item.fn(); } });
    _lazyInitQueue = [];
    return;
  }

  _lazyObserver = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (!entry.isIntersecting) return;
      for (var i = 0; i < _lazyInitQueue.length; i++) {
        var item = _lazyInitQueue[i];
        // Match by target, or if target is missing (mock observers) init all
        if (!item.done && (!entry.target || item.el === entry.target)) {
          item.done = true;
          item.fn();
          if (entry.target) _lazyObserver.unobserve(entry.target);
        }
      }
    });
  }, { rootMargin: '200px 0px' }); // init 200px before section scrolls into view

  _lazyInitQueue.forEach(function (item) {
    if (!item.done) _lazyObserver.observe(item.el);
  });
}

document.addEventListener('DOMContentLoaded', function () {

  // ═══════════════════════════════════════════════════════════════════════
  // IMMEDIATE — above-the-fold & globally essential modules
  // ═══════════════════════════════════════════════════════════════════════

  // Sticky navigation bar (always visible).
  SiteNav.init();

  // Theme + scroll progress (global chrome).
  ThemeToggle.init();
  ScrollProgress.init();

  // Command palette (Ctrl+K — must respond instantly).
  CommandPalette.init();

  // Keyboard shortcuts help (global).
  ShortcutsHelp.init();

  // Share FAB (floating, always visible).
  ShareFab.init();

  // Scenario buttons - event delegation on the container.
  const scenarioContainer = document.querySelector('.demo-scenarios');
  if (scenarioContainer) {
    scenarioContainer.addEventListener('click', function (e) {
      let btn = e.target.closest('.scenario-btn');
      if (!btn) return;
      const scenario = btn.dataset.scenario;
      if (scenario) ChatDemo.switchTo(scenario);
    });
  }

  // Auto-play the default scenario.
  ChatDemo.play('memory');

  // How It Works — near top of page.
  HowItWorks.init();

  // Billing toggle - click + keyboard.
  const billingToggle = document.getElementById('billingToggle');
  if (billingToggle) {
    billingToggle.addEventListener('click', Pricing.toggle);
    activateOnKeyboard(billingToggle.parentElement || billingToggle, '#billingToggle', function () {
      Pricing.toggle();
    });
  }

  // ═══════════════════════════════════════════════════════════════════════
  // DEFERRED — below-fold modules initialized when section nears viewport
  // ═══════════════════════════════════════════════════════════════════════

  lazyInit('testimonialsSection', function () {
    Testimonials.init();
    const testimonialsNav = document.querySelector('.testimonials-nav');
    if (testimonialsNav) {
      testimonialsNav.addEventListener('click', function (e) {
        const arrow = e.target.closest('.testimonial-arrow');
        if (arrow) {
          if (arrow.classList.contains('testimonial-prev')) {
            Testimonials.prev();
          } else if (arrow.classList.contains('testimonial-next')) {
            Testimonials.next();
          }
          return;
        }
        const dot = e.target.closest('.testimonial-dot');
        if (dot && dot.dataset.index !== undefined) {
          Testimonials.goTo(parseInt(dot.dataset.index, 10));
          Testimonials.stopAutoPlay();
          Testimonials.startAutoPlay();
        }
      });
    }
  });

  lazyInit('faqSection', function () {
    const faqSection = document.querySelector('.faq-section');
    if (faqSection) {
      faqSection.addEventListener('click', function (e) {
        const question = e.target.closest('.faq-question');
        if (question) FAQ.toggle(question);
      });
      activateOnKeyboard(faqSection, '.faq-question', function (question) {
        FAQ.toggle(question);
      });
    }
  });

  lazyInit('trustSection', function () {
    const trustSection = document.querySelector('.trust-section');
    if (trustSection) {
      trustSection.addEventListener('click', function (e) {
        const card = e.target.closest('.trust-card');
        if (card) Trust.toggle(card);
      });
      activateOnKeyboard(trustSection, '.trust-card', function (card) {
        Trust.toggle(card);
      });
    }
  });

  lazyInit('statusSection', function () {
    StatusDashboard.init();
  });

  lazyInit('commandsSection', function () {
    CommandsCheatSheet.init();
  });

  lazyInit('notificationSection', function () {
    NotificationPreview.init();
  });

  lazyInit('usecasesSection', function () {
    UseCases.init();
    const usecasesSection = document.getElementById('usecasesSection');
    if (usecasesSection) {
      const usecasesTablist = usecasesSection.querySelector('[role="tablist"]');
      if (usecasesTablist && !usecasesTablist.dataset.bound) {
        usecasesTablist.dataset.bound = '1';
        usecasesTablist.addEventListener('click', function (e) {
          const tab = e.target.closest('.usecase-tab');
          if (tab && tab.dataset.usecase) {
            window.UseCases.switchTo(tab.dataset.usecase);
          }
        });
        arrowKeyNav(usecasesTablist, '.usecase-tab', function (tab) {
          window.UseCases.switchTo(tab.dataset.usecase);
          tab.focus();
        });
      }
    }
  });

  lazyInit('statsSection', function () {
    Stats.init();
  });

  lazyInit('integrationsSection', function () {
    Integrations.init();
  });

  lazyInit('changelogSection', function () {
    Changelog.init();
  });

  lazyInit('roadmapSection', function () {
    Roadmap.init();
  });

  lazyInit('calculatorSection', function () {
    Calculator.init();
  });

  lazyInit('playgroundSection', function () {
    Playground.init();
  });

  lazyInit('activitySection', function () {
    ActivityFeed.init();
  });

  lazyInit('promptGallerySection', function () {
    PromptGallery.init();
  });

  lazyInit('personalitySection', function () {
    PersonalityConfigurator.init();
  });

  lazyInit('quizSection', function () {
    OnboardingQuiz.init();
  });

  lazyInit('apiExplorerSection', function () {
    ApiExplorer.init();
  });

  lazyInit('wizardSection', function () {
    // WorkflowTemplates + QuickStartWizard share this section area
    WorkflowTemplates.init();
  });

  // Newsletter is in the footer area.
  lazyInit('pricingSection', function () {
    Newsletter.init();
  });

  // Start the IntersectionObserver for all queued lazy modules.
  startLazyObserver();
});

// ---------------------------------------------------------------------------
// Sticky Navigation Bar
// ---------------------------------------------------------------------------

var SiteNav = (function () {
  let nav = null;
  const links = [];
  const sections = [];
  let toggle = null;
  let linksContainer = null;
  let activeLink = null;
  let _lastActiveIdx = -1;
  let ticking = false;

  /**
   * Cached section offsetTop values. Reading offsetTop on every scroll
   * event forces synchronous layout recalculation. Cache and recompute
   * only on resize when layout actually changes.
   */
  let sectionOffsets = [];
  let _resizeHandler = null;
  let _keydownHandler = null;
  let _resizeTimer = null;

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
    const anchors = linksContainer.querySelectorAll('a[href^="#"]');
    for (var i = 0; i < anchors.length; i++) {
      let href = anchors[i].getAttribute('href');
      let target = document.querySelector(href);
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
      const a = e.target.closest('a[href^="#"]');
      if (!a) return;
      e.preventDefault();
      let target = document.querySelector(a.getAttribute('href'));
      if (target) {
        target.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth', block: 'start' });
      }
      closeMenu();
    });

    // Logo scroll to top
    const logo = nav.querySelector('.nav-logo');
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
        const expanded = toggle.getAttribute('aria-expanded') === 'true';
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
    let scrollY = window.scrollY + 100; // offset for nav height + margin

    // Fast path: if scroll position is within the same section as last time,
    // skip the full scan.  This avoids redundant classList operations during
    // continuous scrolling within a long section.
    if (activeLink !== null && _lastActiveIdx >= 0 && _lastActiveIdx < sectionOffsets.length) {
      const lo = sectionOffsets[_lastActiveIdx];
      const hi = _lastActiveIdx + 1 < sectionOffsets.length ? sectionOffsets[_lastActiveIdx + 1] : Infinity;
      if (scrollY >= lo && scrollY < hi) return;
    }

    let current = null;
    let currentIdx = -1;

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
    const form = document.getElementById('newsletterForm');
    if (!form) return;

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      const emailInput = document.getElementById('newsletterEmail');
      let btn = document.getElementById('newsletterBtn');
      const status = document.getElementById('newsletterStatus');
      const email = emailInput.value.trim();

      if (!email || !isValidEmail(email)) {
        showStatus(status, 'Please enter a valid email address.', 'error');
        return;
      }

      // Check for duplicate
      const subs = getSubscribers();
      if (subs.indexOf(email) !== -1) {
        showStatus(status, 'You\'re already subscribed! 🎉', 'success');
        return;
      }

      // Prevent unbounded localStorage growth (demo — no real backend)
      if (subs.length >= 1000) {
        showStatus(status, 'Subscriber list is full.', 'error');
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
    // Length cap prevents localStorage pollution via oversized payloads.
    // RFC 5321 limits local-part to 64 chars, domain to 255 chars, total ≤ 320.
    if (email.length > 320) return false;
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  function showStatus(el, msg, type) {
    if (!el) return;
    el.textContent = msg;
    el.className = 'newsletter-status ' + type;
  }

  function getSubscribers() {
    try {
      const data = localStorage.getItem('agentbox_newsletter');
      if (!data) return [];
      const parsed = JSON.parse(data);
      // Validate: must be an array of strings (email addresses)
      if (!Array.isArray(parsed)) return [];
      const safe = [];
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
  const STORAGE_KEY = 'agentbox_roadmap_votes';
  let currentFilter = 'all';
  let _container = null;
  let _grid = null;

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
  let _filterBtns = [];
  let _cards = [];
  let _summaryItems = [];

  function init() {
    _container = document.getElementById('roadmapSection');
    if (!container()) return;

    restoreVotes();

    _filterBtns = Array.prototype.slice.call(
      container().querySelectorAll('.roadmap-filter-btn')
    );
    for (var i = 0; i < _filterBtns.length; i++) {
      _filterBtns[i].addEventListener('click', function (e) {
        const status = e.currentTarget.getAttribute('data-status');
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
        let btn = e.target.closest('.roadmap-vote-btn');
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
      let isActive =
        _filterBtns[i].getAttribute('data-status') === currentFilter;
      _filterBtns[i].classList.toggle('active', isActive);
      _filterBtns[i].setAttribute(
        'aria-selected',
        isActive ? 'true' : 'false'
      );
    }

    for (var j = 0; j < _cards.length; j++) {
      const cardStatus = _cards[j].getAttribute('data-status');
      let visible = currentFilter === 'all' || cardStatus === currentFilter;
      _cards[j].setAttribute('data-hidden', visible ? 'false' : 'true');
    }

    for (var k = 0; k < _summaryItems.length; k++) {
      const itemStatus = _summaryItems[k].getAttribute('data-status');
      const highlighted =
        currentFilter === 'all' || itemStatus === currentFilter;
      _summaryItems[k].style.opacity = highlighted ? '1' : '0.4';
    }
  }

  function toggleVote(btn) {
    const card = btn.closest('.roadmap-card');
    if (!card) return;

    const countEl = card.querySelector('.roadmap-vote-count');
    if (!countEl) return;

    let count = parseInt(countEl.textContent, 10) || 0;
    const wasVoted = btn.classList.contains('voted');

    // Cap at 999999 to match restoreVotes validation and prevent overflow
    const MAX_VOTES = 999999;

    if (wasVoted) {
      count = Math.max(0, count - 1);
      btn.classList.remove('voted');
      btn.setAttribute('aria-pressed', 'false');
    } else {
      if (count >= MAX_VOTES) return; // Prevent overflow
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
    const cards = getCards();
    const counts = { shipped: 0, progress: 0, planned: 0 };
    for (var i = 0; i < cards.length; i++) {
      let s = cards[i].getAttribute('data-status');
      if (counts.hasOwnProperty(s)) counts[s]++;
    }
    return counts;
  }

  function getVotes() {
    const cards = getCards();
    const votes = Object.create(null);
    for (var i = 0; i < cards.length; i++) {
      const h3 = cards[i].querySelector('h3');
      const countEl = cards[i].querySelector('.roadmap-vote-count');
      if (h3 && countEl) {
        votes[h3.textContent] = parseInt(countEl.textContent, 10) || 0;
      }
    }
    return votes;
  }

  function saveVotes() {
    try {
      const cards = getCards();
      const data = Object.create(null);
      for (var i = 0; i < cards.length; i++) {
        const h3 = cards[i].querySelector('h3');
        let btn = cards[i].querySelector('.roadmap-vote-btn');
        const countEl = cards[i].querySelector('.roadmap-vote-count');
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
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return;
      // Rebuild as prototype-safe map with validated entries
      const data = Object.create(null);
      for (var key in parsed) {
        if (!Object.prototype.hasOwnProperty.call(parsed, key)) continue;
        const entry = parsed[key];
        if (entry && typeof entry === 'object' && !Array.isArray(entry)) {
          data[key] = entry;
        }
      }
      const cards = getCards();
      for (var i = 0; i < cards.length; i++) {
        const h3 = cards[i].querySelector('h3');
        if (!h3 || !data[h3.textContent]) continue;
        const item = data[h3.textContent];
        const countEl = cards[i].querySelector('.roadmap-vote-count');
        let btn = cards[i].querySelector('.roadmap-vote-btn');
        // Validate count is a safe integer before rendering
        let count = parseInt(item.count, 10);
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
  const STATUS_LEVELS = ['operational', 'degraded', 'outage'];
  let _grid = null;
  let _incidents = null;
  let _overall = null;
  /** Cached service elements keyed by data-service name for O(1) lookup. */
  let _serviceCache = null;
  /** Cached service element array (avoids querySelectorAll on every call). */
  let _serviceList = null;

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
    const els = getGrid().querySelectorAll('.status-service');
    for (var i = 0; i < els.length; i++) {
      _serviceList.push(els[i]);
      const name = els[i].getAttribute('data-service');
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
    let el = _serviceCache[serviceName];
    return el ? el.getAttribute('data-status') : null;
  }

  function getServiceUptime(serviceName) {
    if (!_serviceCache) _buildServiceCache();
    let el = _serviceCache[serviceName];
    if (!el) return null;
    const uptimeEl = el.querySelector('.status-uptime');
    return uptimeEl ? parseFloat(uptimeEl.textContent) : null;
  }

  function setServiceStatus(serviceName, status) {
    if (!_serviceCache) _buildServiceCache();
    let el = _serviceCache[serviceName];
    if (el) {
      el.setAttribute('data-status', status);
      const dot = el.querySelector('.status-dot');
      if (dot) dot.className = 'status-dot ' + status;
    }
    updateOverall();
  }

  function setServiceUptime(serviceName, uptime) {
    if (!_serviceCache) _buildServiceCache();
    const svc = _serviceCache[serviceName];
    if (!svc) return;
    let el = svc.querySelector('.status-uptime');
    if (el) el.textContent = uptime.toFixed(2) + '%';
    let bar = svc.querySelector('.status-bar-fill');
    if (bar) bar.style.width = Math.min(100, Math.max(0, uptime)) + '%';
    const meter = svc.querySelector('.status-bar');
    if (meter) meter.setAttribute('aria-valuenow', String(uptime));
  }

  function updateOverall() {
    const services = getServices();
    let worst = 'operational';
    for (var i = 0; i < services.length; i++) {
      let s = services[i].getAttribute('data-status');
      if (STATUS_LEVELS.indexOf(s) > STATUS_LEVELS.indexOf(worst)) {
        worst = s;
      }
    }

    if (!getOverall()) return;

    const dot = getOverall().querySelector('.status-dot');
    let text = getOverall().querySelector('.status-overall-text');
    if (dot) dot.className = 'status-dot ' + worst;

    const messages = {
      operational: 'All systems operational',
      degraded: 'Some systems degraded',
      outage: 'System outage detected'
    };
    if (text) text.textContent = messages[worst] || worst;
  }

  function getOverallStatus() {
    if (!getOverall()) return null;
    const dot = getOverall().querySelector('.status-dot');
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
    const services = getServices();
    if (services.length === 0) return 0;
    let total = 0;
    for (var i = 0; i < services.length; i++) {
      let el = services[i].querySelector('.status-uptime');
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
  let _section = null;

  // Cached DOM references — resolved once in init(), reused on every
  // slider input event.  Eliminates 5 getElementById + 1 querySelectorAll
  // calls per update (~dozens per second while dragging a slider).
  let _weeklyEl = null;
  let _monthlyEl = null;
  let _yearlyEl = null;
  let _equivEl = null;
  let _groups = [];

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

    const sliders = section().querySelectorAll('.calc-range');
    for (var i = 0; i < sliders.length; i++) {
      sliders[i].addEventListener('input', update);
    }
    update();
  }

  function update() {
    if (!section()) return;

    let totalMinutes = 0;

    for (var i = 0; i < _groups.length; i++) {
      const slider = _groups[i].querySelector('.calc-range');
      const valueEl = _groups[i].querySelector('.calc-slider-value');
      const minutesPer = parseInt(_groups[i].dataset.minutes, 10) || 0;
      let count = parseInt(slider.value, 10) || 0;

      if (valueEl) valueEl.textContent = count + ' /week';
      totalMinutes += count * minutesPer;
    }

    if (_weeklyEl) _weeklyEl.textContent = totalMinutes;

    const monthlyHours = (totalMinutes * 4.33 / 60);
    if (_monthlyEl) _monthlyEl.textContent = monthlyHours < 10 ? monthlyHours.toFixed(1) : Math.round(monthlyHours);

    const yearlyHours = (totalMinutes * 52 / 60);
    if (_yearlyEl) _yearlyEl.textContent = Math.round(yearlyHours);

    if (_equivEl) {
      if (yearlyHours === 0) {
        _equivEl.textContent = 'Move the sliders to see your potential time savings \u261D\uFE0F';
      } else if (yearlyHours < 8) {
        _setEquivText(_equivEl, 'That\u2019s ', Math.round(yearlyHours) + ' hours',
          ' back every year \u2014 time for what matters \u2728');
      } else {
        const workdays = (yearlyHours / 8).toFixed(1);
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
    const strong = document.createElement('strong');
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
  const SECTIONS = [
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
    { id: 'quizSection', icon: '🎯', label: 'Plan Quiz', hint: 'Find your ideal plan' },
    { id: 'changelogSection', icon: '📋', label: 'Changelog', hint: 'What is new' },
    { id: 'roadmapSection', icon: '🗺️', label: 'Roadmap', hint: 'Coming soon' },
    { id: 'statusSection', icon: '🟢', label: 'System Status', hint: 'Service health' },
    { id: 'faqSection', icon: '❓', label: 'FAQ', hint: 'Common questions' },
    { id: 'commandsSection', icon: '📋', label: 'Commands', hint: 'Command cheat sheet' },
    { id: 'apiExplorerSection', icon: '🔌', label: 'API Explorer', hint: 'Browse API endpoints' },
    { id: 'newsletterSection', icon: '📬', label: 'Newsletter', hint: 'Stay in the loop' }
  ];

  let overlay, input, results;
  let selectedIndex = 0;
  let filtered = [];
  const pool = []; // Pre-created <li> elements, one per SECTIONS entry
  const poolIndex = Object.create(null); // section.id -> pool array index (O(1) lookup)
  let _globalKeyHandler = null;

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
    const query = q.toLowerCase().trim();
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
      const li = document.createElement('li');
      li.className = 'cmd-palette-item';
      li.setAttribute('role', 'option');
      li.dataset.sectionId = s.id;

      const iconSpan = document.createElement('span');
      iconSpan.className = 'cmd-palette-item-icon';
      iconSpan.textContent = s.icon;

      const labelSpan = document.createElement('span');
      labelSpan.className = 'cmd-palette-item-label';
      labelSpan.textContent = s.label;

      const hintSpan = document.createElement('span');
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
    const visibleIds = Object.create(null);
    for (var i = 0; i < filtered.length; i++) {
      visibleIds[filtered[i].id] = i;
    }

    // Show/hide pooled elements and reorder visible ones
    const fragment = document.createDocumentFragment();
    // First, append visible items in filtered order — O(n) via poolIndex
    for (var i = 0; i < filtered.length; i++) {
      let idx = poolIndex[filtered[i].id];
      if (idx !== undefined) {
        const li = pool[idx].el;
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
    const items = results.children;
    if (items[selectedIndex]) items[selectedIndex].removeAttribute('aria-selected');
    selectedIndex = (selectedIndex + dir + filtered.length) % filtered.length;
    if (items[selectedIndex]) {
      items[selectedIndex].setAttribute('aria-selected', 'true');
      items[selectedIndex].scrollIntoView({ block: 'nearest' });
    }
  }

  function go() {
    if (!filtered.length) return;
    const section = filtered[selectedIndex];
    let el = document.getElementById(section.id);
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
  let btn, menu, toast, toastTimer;
  const PAGE_URL = 'https://getagentbox.com';
  const PAGE_TITLE = 'AgentBox - Your Personal AI Agent on Telegram';
  const PAGE_DESC = 'Get your own AI assistant that lives in Telegram. It remembers you, searches the web, and helps you get things done.';

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

    const options = menu.querySelectorAll('.share-option');
    for (var i = 0; i < options.length; i++) {
      options[i].addEventListener('click', handleShare);
    }
  }

  function toggle() {
    const open = btn.getAttribute('aria-expanded') === 'true';
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
    const type = e.currentTarget.getAttribute('data-share');
    let url;
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
      const ta = document.createElement('textarea');
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
  const STORAGE_KEY = 'agentbox-theme';
  let btn, icon;

  function init() {
    btn = document.getElementById('themeToggle');
    icon = document.getElementById('themeIcon');
    if (!btn) return;

    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'light') {
      document.body.classList.add('light-mode');
      if (icon) icon.textContent = '🌙';
    }

    btn.addEventListener('click', toggle);
  }

  function toggle() {
    const isLight = document.body.classList.toggle('light-mode');
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

  let bar, btn, ticking;

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

    let scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const docHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
    const progress = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;

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
  let overlay, closeBtn;

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
        const themeBtn = document.getElementById('themeToggle');
        if (themeBtn) themeBtn.click();
      }
    });
  }

  return { init: init };
})();

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

// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Agent Activity Feed — Live-style simulated activity stream
// ---------------------------------------------------------------------------
var ActivityFeed = (function () {
  'use strict';

  let feedEl;
  let activeCountEl, todayCountEl;
  let cycleTimer = null;
  let counterTimer = null;

  /** Maximum visible items in the feed. */
  const MAX_VISIBLE = 5;

  /** Interval between new activity items (ms). */
  const CYCLE_INTERVAL = 4000;

  /** Pool of simulated agent activities. */
  const ACTIVITIES = [
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
  let shuffled = [];
  let shuffleIdx = 0;

  function shuffle() {
    shuffled = [];
    for (var i = 0; i < ACTIVITIES.length; i++) shuffled.push(i);
    for (var j = shuffled.length - 1; j > 0; j--) {
      let k = Math.floor(Math.random() * (j + 1));
      const tmp = shuffled[j];
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
    const item = document.createElement('div');
    item.className = 'activity-item entering';

    let icon = document.createElement('span');
    icon.className = 'activity-icon';
    icon.textContent = activity.icon;

    let text = document.createElement('span');
    text.className = 'activity-text';
    const strong = document.createElement('strong');
    strong.textContent = 'Agent';
    text.appendChild(strong);
    text.appendChild(document.createTextNode(' ' + activity.text));

    const time = document.createElement('span');
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

    const act = nextActivity();
    const newItem = createItem(act);

    // Age existing time labels
    const items = feedEl.querySelectorAll('.activity-item');
    for (var i = 0; i < items.length; i++) {
      const timeEl = items[i].querySelector('.activity-time');
      if (timeEl) {
        const age = (i + 1) * (CYCLE_INTERVAL / 1000);
        if (age < 60) {
          timeEl.textContent = Math.round(age) + 's ago';
        } else {
          timeEl.textContent = Math.round(age / 60) + 'm ago';
        }
      }
    }

    // Remove oldest if over limit
    if (items.length >= MAX_VISIBLE) {
      const last = items[items.length - 1];
      last.classList.add('exiting');

      // Guard: prevent double-removal if animationend races with fallback
      let removed = false;
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
    let active = parseInt(activeCountEl.textContent.replace(/,/g, ''), 10) || 1247;
    let today = parseInt(todayCountEl.textContent.replace(/,/g, ''), 10) || 18392;

    // Random small fluctuation
    active += Math.floor(Math.random() * 5) - 2;
    if (active < 1000) active = 1000;
    today += Math.floor(Math.random() * 3) + 1;
    if (today > 25000) today = 18000 + Math.floor(Math.random() * 2000);

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
      const observer = new IntersectionObserver(onVisible, { threshold: 0.2 });
      const section = document.getElementById('activitySection');
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

// ---------------------------------------------------------------------------
// Personality Configurator
// ---------------------------------------------------------------------------

/* exported PersonalityConfigurator */
var PersonalityConfigurator = (function () {
  'use strict';

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
    try {
      localStorage.setItem(STORAGE_KEY_PERSONALITY, JSON.stringify(values));
    } catch (e) {
      /* localStorage unavailable */
    }
  }

  function loadFromStorage() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_PERSONALITY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (typeof parsed.formality === 'number') { return parsed; }
      }
    } catch (e) {
      /* localStorage unavailable or corrupted */
    }
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

  const YES = '<span class="comp-yes" aria-label="Yes">✓</span>';
  const NO = '<span class="comp-no" aria-label="No">✗</span>';
  function PARTIAL(t) { return '<span class="comp-partial">' + t + '</span>'; }
  function TEXT(t) { return '<span class="comp-text">' + t + '</span>'; }

  const features = [
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
    const tbody = document.getElementById('comparisonBody');
    if (!tbody) return;

    let html = '';
    for (var i = 0; i < features.length; i++) {
      const f = features[i];
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
  const STORAGE_KEY = 'agentbox_onboarding_done';
  if (localStorage.getItem(STORAGE_KEY)) return;

  const widget = document.getElementById('onboardingWidget');
  const trigger = document.getElementById('onboardingTrigger');
  const panel = document.getElementById('onboardingPanel');
  let closeBtn = document.getElementById('onboardingClose');
  const backBtn = document.getElementById('onboardingBack');
  const nextBtn = document.getElementById('onboardingNext');
  let progressBar = document.getElementById('onboardingProgressBar');
  const titleEl = document.getElementById('onboardingTitle');
  const step1 = document.getElementById('onboardingStep1');
  const step2 = document.getElementById('onboardingStep2');
  const step3 = document.getElementById('onboardingStep3');
  let resultEl = document.getElementById('onboardingResult');

  if (!widget || !trigger || !panel) return;

  let currentStep = 1;
  let selectedRole = null;
  let selectedGoals = [];

  const GOAL_MAP = {
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

  const RECOMMENDATIONS = {
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

    const dots = widget.querySelectorAll('.onboarding-dot');
    dots.forEach(function(d) {
      d.classList.toggle('active', parseInt(d.getAttribute('data-dot')) === currentStep);
    });

    const titles = ['Let\'s find your fit', 'What are your goals?', 'Your personalized plan'];
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
    const goalsContainer = step2.querySelector('.onboarding-goals');
    goalsContainer.innerHTML = '';
    const goals = GOAL_MAP[selectedRole] || [];
    goals.forEach(function(g) {
      let btn = document.createElement('button');
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
    let idx = selectedGoals.indexOf(key);
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
    const rec = RECOMMENDATIONS[selectedRole] || RECOMMENDATIONS.casual;
    const tips = [];
    selectedGoals.forEach(function(g) {
      if (rec.goalTips[g]) tips.push(rec.goalTips[g]);
    });

    const featuresHTML = rec.features.map(function(f) {
      return '<li>' + f + '</li>';
    }).join('');

    const tipsHTML = tips.length > 0
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
    const isOpen = !panel.hidden;
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
  const STOPS = [
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

  const STORAGE_KEY = 'agentbox_tour_completed';

  // ── State ────────────────────────────────────────────────────────
  let currentStep = -1;
  let isActive = false;
  let overlay = null;
  let tooltip = null;
  let spotlight = null;

  // ── Helpers ──────────────────────────────────────────────────────

  /** Resolve the first matching element for a comma-separated selector. */
  function resolveTarget(selectorList) {
    const selectors = selectorList.split(',');
    for (var i = 0; i < selectors.length; i++) {
      let el = document.querySelector(selectors[i].trim());
      if (el) return el;
    }
    return null;
  }

  /** Smoothly scroll element into view, respecting reduced motion. */
  function scrollIntoView(el, cb) {
    const rect = el.getBoundingClientRect();
    const inView = rect.top >= 0 && rect.bottom <= window.innerHeight;
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
    const rect = el.getBoundingClientRect();
    const pad = 8;
    spotlight.style.top = (window.scrollY + rect.top - pad) + 'px';
    spotlight.style.left = (rect.left - pad) + 'px';
    spotlight.style.width = (rect.width + pad * 2) + 'px';
    spotlight.style.height = (rect.height + pad * 2) + 'px';
  }

  /** Position tooltip relative to spotlight. */
  function positionTooltip(el, position) {
    const rect = el.getBoundingClientRect();
    const tw = Math.min(340, window.innerWidth - 32);
    tooltip.style.width = tw + 'px';

    if (position === 'bottom') {
      tooltip.style.top = (window.scrollY + rect.bottom + 16) + 'px';
    } else {
      // above the element
      tooltip.style.top = (window.scrollY + rect.top - tooltip.offsetHeight - 16) + 'px';
    }

    // Horizontally center on target, clamp to viewport
    let left = rect.left + rect.width / 2 - tw / 2;
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
    const stepDef = STOPS[idx];
    let target = resolveTarget(stepDef.target);

    if (!target) {
      // Skip missing sections
      if (idx < STOPS.length - 1) { showStep(idx + 1); }
      else { stop(); }
      return;
    }

    scrollIntoView(target, function () {
      positionSpotlight(target);
      // Render content
      tooltip.querySelector('#tourTitle').textContent = stepDef.title;
      tooltip.querySelector('#tourBody').textContent = stepDef.body;

      // Progress dots
      let dotsHtml = '';
      for (var i = 0; i < STOPS.length; i++) {
        let active = i === idx;
        dotsHtml += '<span style="display:inline-block;width:8px;height:8px;'
          + 'border-radius:50%;margin:0 3px;background:'
          + (active ? '#6c5ce7' : '#ddd') + ';" aria-label="Step ' + (i + 1)
          + (active ? ' (current)' : '') + '"></span>';
      }
      tooltip.querySelector('#tourDots').innerHTML = dotsHtml;

      // Prev button visibility
      tooltip.querySelector('#tourPrev').style.display = idx === 0 ? 'none' : 'inline-block';

      // Last step: change Next to "Done"
      const nextBtn = tooltip.querySelector('#tourNext');
      if (idx === STOPS.length - 1) {
        nextBtn.textContent = 'Done ✓';
      } else {
        nextBtn.textContent = 'Next →';
      }

      // Step counter in title
      tooltip.querySelector('#tourTitle').textContent =
        '(' + (idx + 1) + '/' + STOPS.length + ') ' + stepDef.title;

      positionTooltip(target, stepDef.position);
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
    const trigger = document.getElementById('tourTrigger');
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

// ---------------------------------------------------------------------------
// Onboarding Quiz — "Which plan is right for you?"
// ---------------------------------------------------------------------------

var OnboardingQuiz = (function () {
  const QUESTIONS = [
    {
      id: 'usage',
      text: 'How often will you use AgentBox?',
      options: [
        { label: 'A few times a week', icon: '🌱', value: 'light' },
        { label: 'Every day', icon: '☀️', value: 'daily' },
        { label: 'All day, every day', icon: '🔥', value: 'heavy' }
      ]
    },
    {
      id: 'team',
      text: 'Will you use it solo or with a team?',
      options: [
        { label: 'Just me', icon: '🧑', value: 'solo' },
        { label: 'Me and a few others', icon: '👥', value: 'small_team' },
        { label: 'My whole team (5+)', icon: '🏢', value: 'large_team' }
      ]
    },
    {
      id: 'features',
      text: 'Which feature matters most?',
      options: [
        { label: 'Web search & answers', icon: '🔍', value: 'search' },
        { label: 'Memory & context', icon: '🧠', value: 'memory' },
        { label: 'Reminders & files', icon: '📂', value: 'productivity' }
      ]
    },
    {
      id: 'volume',
      text: 'How many messages do you expect per day?',
      options: [
        { label: 'Under 20', icon: '💬', value: 'low' },
        { label: '20–100', icon: '📨', value: 'medium' },
        { label: '100+', icon: '📬', value: 'high' }
      ]
    },
    {
      id: 'priority',
      text: 'What matters most to you?',
      options: [
        { label: 'It is free', icon: '🆓', value: 'cost' },
        { label: 'No limits on usage', icon: '♾️', value: 'unlimited' },
        { label: 'Team collaboration', icon: '🤝', value: 'collaboration' }
      ]
    }
  ];

  const PLANS = {
    free: {
      name: 'Free',
      icon: '🎉',
      desc: 'The Free plan is perfect for you — get started with 20 messages/day, web search, and image understanding at no cost.',
      cta: 'Get Started Free',
      cls: 'quiz-plan-free'
    },
    pro: {
      name: 'Pro',
      icon: '⚡',
      desc: 'The Pro plan gives you unlimited messages, advanced memory, reminders, and file analysis — everything a power user needs.',
      cta: 'Upgrade to Pro — $9/mo',
      cls: 'quiz-plan-pro'
    },
    team: {
      name: 'Team',
      icon: '🏢',
      desc: 'The Team plan is built for collaboration — shared knowledge base, admin dashboard, and up to 10 members.',
      cta: 'Get Team — $29/mo',
      cls: 'quiz-plan-team'
    }
  };

  let currentStep = -1;
  let answers = {};
  let questionArea, progressBar, progressText, resultEl;
  let startEl, startBtn, retakeBtn;

  function init() {
    questionArea = document.getElementById('quizQuestionArea');
    progressBar = document.getElementById('quizProgressBar');
    progressText = document.getElementById('quizProgressText');
    resultEl = document.getElementById('quizResult');
    startEl = document.getElementById('quizStart');
    startBtn = document.getElementById('quizStartBtn');
    retakeBtn = document.getElementById('quizRetakeBtn');

    if (!questionArea || !startBtn) return;

    startBtn.addEventListener('click', function () {
      currentStep = 0;
      answers = {};
      showQuestion(0);
    });

    if (retakeBtn) {
      retakeBtn.addEventListener('click', function () {
        reset();
      });
    }
  }

  function reset() {
    currentStep = -1;
    answers = {};
    if (resultEl) resultEl.hidden = true;
    if (startEl) startEl.style.display = '';
    updateProgress(0);
    const existing = questionArea.querySelector('.quiz-q');
    if (existing) existing.remove();
  }

  function updateProgress(step) {
    const pct = Math.round((step / QUESTIONS.length) * 100);
    if (progressBar) progressBar.style.width = pct + '%';
    if (progressText) progressText.textContent = step + ' / ' + QUESTIONS.length;
    const pb = progressBar && progressBar.parentElement;
    if (pb) {
      pb.setAttribute('aria-valuenow', String(step));
    }
  }

  function showQuestion(idx) {
    if (startEl) startEl.style.display = 'none';
    if (resultEl) resultEl.hidden = true;
    updateProgress(idx);

    const q = QUESTIONS[idx];
    let prev = questionArea.querySelector('.quiz-q');
    if (prev) prev.remove();

    const wrap = document.createElement('div');
    wrap.className = 'quiz-q';
    wrap.setAttribute('role', 'radiogroup');
    wrap.setAttribute('aria-label', q.text);

    const title = document.createElement('h3');
    title.className = 'quiz-q-title';
    title.textContent = q.text;
    wrap.appendChild(title);

    const stepLabel = document.createElement('span');
    stepLabel.className = 'quiz-step-label';
    stepLabel.textContent = 'Question ' + (idx + 1) + ' of ' + QUESTIONS.length;
    wrap.appendChild(stepLabel);

    const optionsWrap = document.createElement('div');
    optionsWrap.className = 'quiz-options';

    for (var i = 0; i < q.options.length; i++) {
      (function (opt, oi) {
        let btn = document.createElement('button');
        btn.className = 'quiz-option';
        btn.setAttribute('role', 'radio');
        btn.setAttribute('aria-checked', 'false');
        btn.setAttribute('tabindex', oi === 0 ? '0' : '-1');
        btn.innerHTML = '<span class="quiz-option-icon">' + opt.icon + '</span>' +
          '<span class="quiz-option-label">' + opt.label + '</span>';

        btn.addEventListener('click', function () {
          selectAnswer(q.id, opt.value, btn, idx);
        });

        btn.addEventListener('keydown', function (e) {
          const opts = Array.prototype.slice.call(optionsWrap.querySelectorAll('.quiz-option'));
          const ki = opts.indexOf(e.target);
          let next = -1;
          if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
            next = (ki + 1) % opts.length;
          } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
            next = (ki - 1 + opts.length) % opts.length;
          }
          if (next >= 0) {
            e.preventDefault();
            opts[next].focus();
            opts[next].setAttribute('tabindex', '0');
            e.target.setAttribute('tabindex', '-1');
          }
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            selectAnswer(q.id, opt.value, btn, idx);
          }
        });

        optionsWrap.appendChild(btn);
      })(q.options[i], i);
    }

    wrap.appendChild(optionsWrap);

    if (idx > 0) {
      const backBtn = document.createElement('button');
      backBtn.className = 'quiz-back-btn';
      backBtn.textContent = '\u2190 Back';
      backBtn.addEventListener('click', function () {
        currentStep = idx - 1;
        showQuestion(idx - 1);
      });
      wrap.appendChild(backBtn);
    }

    questionArea.appendChild(wrap);
  }

  function selectAnswer(questionId, value, btn, idx) {
    answers[questionId] = value;

    const siblings = btn.parentElement.querySelectorAll('.quiz-option');
    for (var i = 0; i < siblings.length; i++) {
      siblings[i].classList.remove('selected');
      siblings[i].setAttribute('aria-checked', 'false');
    }
    btn.classList.add('selected');
    btn.setAttribute('aria-checked', 'true');

    setTimeout(function () {
      if (idx < QUESTIONS.length - 1) {
        currentStep = idx + 1;
        showQuestion(idx + 1);
      } else {
        showResult();
      }
    }, 350);
  }

  function scorePlan() {
    const scores = { free: 0, pro: 0, team: 0 };
    const reasons = [];

    if (answers.usage === 'light') {
      scores.free += 3;
      reasons.push({ plan: 'free', text: 'You use it a few times a week \u2014 Free covers that' });
    } else if (answers.usage === 'daily') {
      scores.pro += 3;
      reasons.push({ plan: 'pro', text: 'Daily usage benefits from unlimited messages' });
    } else if (answers.usage === 'heavy') {
      scores.pro += 2;
      scores.team += 2;
      reasons.push({ plan: 'pro', text: 'Heavy usage needs no message limits' });
    }

    if (answers.team === 'solo') {
      scores.free += 1;
      scores.pro += 1;
    } else if (answers.team === 'small_team') {
      scores.team += 3;
      reasons.push({ plan: 'team', text: 'Your team can share a knowledge base' });
    } else if (answers.team === 'large_team') {
      scores.team += 5;
      reasons.push({ plan: 'team', text: 'Team plan supports up to 10 members with admin controls' });
    }

    if (answers.features === 'search') {
      scores.free += 2;
      reasons.push({ plan: 'free', text: 'Web search is included in every plan' });
    } else if (answers.features === 'memory') {
      scores.pro += 3;
      reasons.push({ plan: 'pro', text: 'Advanced memory keeps context across long conversations' });
    } else if (answers.features === 'productivity') {
      scores.pro += 3;
      reasons.push({ plan: 'pro', text: 'Reminders and file analysis are Pro features' });
    }

    if (answers.volume === 'low') {
      scores.free += 3;
      reasons.push({ plan: 'free', text: 'Under 20 messages/day fits the Free tier perfectly' });
    } else if (answers.volume === 'medium') {
      scores.pro += 3;
      reasons.push({ plan: 'pro', text: 'With 20\u2013100 daily messages, you need unlimited' });
    } else if (answers.volume === 'high') {
      scores.pro += 2;
      scores.team += 2;
      reasons.push({ plan: 'pro', text: '100+ messages/day requires an unlimited plan' });
    }

    if (answers.priority === 'cost') {
      scores.free += 4;
      reasons.push({ plan: 'free', text: 'Free plan \u2014 no credit card, no strings attached' });
    } else if (answers.priority === 'unlimited') {
      scores.pro += 4;
      reasons.push({ plan: 'pro', text: 'Pro removes all usage limits' });
    } else if (answers.priority === 'collaboration') {
      scores.team += 4;
      reasons.push({ plan: 'team', text: 'Team features are built for collaboration' });
    }

    let best = 'free';
    if (scores.pro > scores[best]) best = 'pro';
    if (scores.team > scores[best]) best = 'team';

    const planReasons = [];
    for (var i = 0; i < reasons.length; i++) {
      if (reasons[i].plan === best) planReasons.push(reasons[i].text);
    }
    if (planReasons.length === 0) {
      planReasons.push('This plan is the best fit based on your answers');
    }

    return { plan: best, scores: scores, reasons: planReasons };
  }

  function showResult() {
    updateProgress(QUESTIONS.length);
    let prev = questionArea.querySelector('.quiz-q');
    if (prev) prev.remove();
    if (startEl) startEl.style.display = 'none';

    let result = scorePlan();
    const plan = PLANS[result.plan];

    const iconEl = document.getElementById('quizResultIcon');
    const titleEl = document.getElementById('quizResultTitle');
    const descEl = document.getElementById('quizResultDesc');
    const reasonsEl = document.getElementById('quizResultReasons');
    const ctaEl = document.getElementById('quizResultCta');

    if (iconEl) iconEl.textContent = plan.icon;
    if (titleEl) titleEl.textContent = 'We recommend: ' + plan.name;
    if (descEl) descEl.textContent = plan.desc;
    if (ctaEl) {
      ctaEl.textContent = plan.cta;
      ctaEl.className = 'quiz-result-cta ' + plan.cls;
    }

    if (reasonsEl) {
      reasonsEl.innerHTML = '';
      for (var i = 0; i < result.reasons.length; i++) {
        const li = document.createElement('li');
        li.textContent = '\u2713 ' + result.reasons[i];
        reasonsEl.appendChild(li);
      }
    }

    if (resultEl) resultEl.hidden = false;
  }

  return {
    init: init,
    reset: reset,
    showQuestion: showQuestion,
    scorePlan: scorePlan,
    _getAnswers: function () { return answers; },
    _setAnswers: function (a) { answers = a; },
    QUESTIONS: QUESTIONS,
    PLANS: PLANS
  };
})();

// ── API Explorer ────────────────────────────────────────────────────────────
var ApiExplorer = (function () {
  'use strict';

  const ENDPOINTS = [
    {
      method: 'POST', path: '/v1/chat/completions', category: 'chat',
      desc: 'Send a message and get an AI response',
      auth: 'Bearer token', rateLimit: '60 req/min',
      reqBody: JSON.stringify({ model: 'agentbox-1', messages: [{ role: 'user', content: 'What is the weather in Seattle?' }], max_tokens: 256, temperature: 0.7 }, null, 2),
      respBody: JSON.stringify({ id: 'chatcmpl-abc123', object: 'chat.completion', created: 1709769600, model: 'agentbox-1', choices: [{ index: 0, message: { role: 'assistant', content: 'Currently in Seattle it is 48\u00b0F (9\u00b0C) with overcast skies and light rain.' }, finish_reason: 'stop' }], usage: { prompt_tokens: 14, completion_tokens: 22, total_tokens: 36 } }, null, 2)
    },
    {
      method: 'POST', path: '/v1/chat/completions', category: 'chat',
      desc: 'Stream a response in real time',
      auth: 'Bearer token', rateLimit: '60 req/min',
      suffix: ' (streaming)',
      reqBody: JSON.stringify({ model: 'agentbox-1', messages: [{ role: 'user', content: 'Explain quantum computing in one paragraph.' }], stream: true }, null, 2),
      respBody: 'data: {"id":"chatcmpl-xyz","object":"chat.completion.chunk","choices":[{"delta":{"content":"Quantum"},"index":0}]}\n\ndata: {"id":"chatcmpl-xyz","object":"chat.completion.chunk","choices":[{"delta":{"content":" computing"},"index":0}]}\n\ndata: [DONE]'
    },
    {
      method: 'GET', path: '/v1/memory', category: 'memory',
      desc: 'Retrieve stored memories',
      auth: 'Bearer token', rateLimit: '30 req/min',
      respBody: JSON.stringify({ memories: [{ id: 'mem_01', content: 'User prefers dark mode', created_at: '2026-02-15T10:30:00Z', category: 'preference' }, { id: 'mem_02', content: 'Working on a React project called Dashboard Pro', created_at: '2026-02-20T14:00:00Z', category: 'context' }], total: 2, has_more: false }, null, 2)
    },
    {
      method: 'POST', path: '/v1/memory', category: 'memory',
      desc: 'Store a new memory',
      auth: 'Bearer token', rateLimit: '30 req/min',
      reqBody: JSON.stringify({ content: 'My preferred programming language is Python', category: 'preference', ttl: null }, null, 2),
      respBody: JSON.stringify({ id: 'mem_03', content: 'My preferred programming language is Python', category: 'preference', created_at: '2026-03-06T12:00:00Z' }, null, 2)
    },
    {
      method: 'DELETE', path: '/v1/memory/{id}', category: 'memory',
      desc: 'Delete a specific memory',
      auth: 'Bearer token', rateLimit: '30 req/min',
      respBody: JSON.stringify({ deleted: true, id: 'mem_03' }, null, 2)
    },
    {
      method: 'POST', path: '/v1/tools/execute', category: 'tools',
      desc: 'Execute an agent tool (search, calculate, etc.)',
      auth: 'Bearer token', rateLimit: '20 req/min',
      reqBody: JSON.stringify({ tool: 'web_search', parameters: { query: 'latest AI news 2026', max_results: 5 } }, null, 2),
      respBody: JSON.stringify({ tool: 'web_search', status: 'success', result: { results: [{ title: 'OpenAI Announces GPT-5', url: 'https://example.com/gpt5', snippet: 'OpenAI has released GPT-5 with improved reasoning...' }, { title: 'AI Regulation Update', url: 'https://example.com/regulation', snippet: 'New EU AI Act provisions take effect...' }] }, execution_time_ms: 342 }, null, 2)
    },
    {
      method: 'GET', path: '/v1/tools', category: 'tools',
      desc: 'List available tools and their capabilities',
      auth: 'Bearer token', rateLimit: '30 req/min',
      respBody: JSON.stringify({ tools: [{ name: 'web_search', description: 'Search the web for information', parameters: { query: 'string', max_results: 'integer (1-10)' } }, { name: 'calculator', description: 'Evaluate mathematical expressions', parameters: { expression: 'string' } }, { name: 'image_generate', description: 'Generate images from text prompts', parameters: { prompt: 'string', size: '256|512|1024' } }] }, null, 2)
    },
    {
      method: 'GET', path: '/v1/sessions', category: 'sessions',
      desc: 'List conversation sessions',
      auth: 'Bearer token', rateLimit: '30 req/min',
      respBody: JSON.stringify({ sessions: [{ id: 'sess_abc', title: 'Project Planning', created_at: '2026-03-01T09:00:00Z', message_count: 42, last_active: '2026-03-06T15:30:00Z' }, { id: 'sess_def', title: 'Code Review Helper', created_at: '2026-03-04T11:00:00Z', message_count: 18, last_active: '2026-03-06T14:00:00Z' }], total: 2 }, null, 2)
    },
    {
      method: 'GET', path: '/v1/sessions/{id}/messages', category: 'sessions',
      desc: 'Get messages in a session',
      auth: 'Bearer token', rateLimit: '30 req/min',
      respBody: JSON.stringify({ messages: [{ id: 'msg_01', role: 'user', content: 'Help me plan a REST API', timestamp: '2026-03-01T09:00:00Z' }, { id: 'msg_02', role: 'assistant', content: 'I would suggest starting with your resource models...', timestamp: '2026-03-01T09:00:02Z' }], has_more: true, cursor: 'msg_02' }, null, 2)
    },
    {
      method: 'DELETE', path: '/v1/sessions/{id}', category: 'sessions',
      desc: 'Delete a session and its messages',
      auth: 'Bearer token', rateLimit: '10 req/min',
      respBody: JSON.stringify({ deleted: true, id: 'sess_abc', messages_removed: 42 }, null, 2)
    },
    {
      method: 'GET', path: '/v1/usage', category: 'account',
      desc: 'Get current usage and quota info',
      auth: 'Bearer token', rateLimit: '10 req/min',
      respBody: JSON.stringify({ plan: 'pro', period: { start: '2026-03-01', end: '2026-03-31' }, usage: { messages_sent: 847, messages_limit: null, tokens_used: 234500, tools_executed: 156 }, billing: { amount_due: 12.00, currency: 'USD', next_invoice: '2026-04-01' } }, null, 2)
    },
    {
      method: 'GET', path: '/v1/models', category: 'account',
      desc: 'List available models',
      auth: 'Bearer token', rateLimit: '10 req/min',
      respBody: JSON.stringify({ models: [{ id: 'agentbox-1', name: 'AgentBox Standard', max_tokens: 4096, supports_streaming: true }, { id: 'agentbox-1-turbo', name: 'AgentBox Turbo', max_tokens: 8192, supports_streaming: true }, { id: 'agentbox-vision', name: 'AgentBox Vision', max_tokens: 4096, supports_streaming: true, supports_images: true }] }, null, 2)
    }
  ];

  const CATEGORIES = [
    { key: 'chat', label: '\uD83D\uDCAC Chat', name: 'Chat' },
    { key: 'memory', label: '\uD83E\uDDE0 Memory', name: 'Memory' },
    { key: 'tools', label: '\uD83D\uDD27 Tools', name: 'Tools' },
    { key: 'sessions', label: '\uD83D\uDCC1 Sessions', name: 'Sessions' },
    { key: 'account', label: '\uD83D\uDC64 Account', name: 'Account' }
  ];

  let grid, detailPanel, filterContainer;
  let activeCard = null;
  let currentFilter = 'all';
  let cardPool = [];

  function init() {
    grid = document.getElementById('apiExplorerGrid');
    detailPanel = document.getElementById('apiDetailPanel');
    filterContainer = document.querySelector('.api-explorer-filter');
    if (!grid) return;

    // Build filter buttons
    CATEGORIES.forEach(function (cat) {
      let btn = document.createElement('button');
      btn.className = 'api-filter-btn';
      btn.setAttribute('role', 'tab');
      btn.setAttribute('aria-selected', 'false');
      btn.setAttribute('data-api-cat', cat.key);
      btn.textContent = cat.label;
      filterContainer.appendChild(btn);
    });

    // Wire filter clicks
    filterContainer.addEventListener('click', function (e) {
      let btn = e.target.closest('.api-filter-btn');
      if (!btn) return;
      let cat = btn.getAttribute('data-api-cat');
      currentFilter = cat;
      filterContainer.querySelectorAll('.api-filter-btn').forEach(function (b) {
        let isActive = b.getAttribute('data-api-cat') === cat;
        b.classList.toggle('active', isActive);
        b.setAttribute('aria-selected', isActive ? 'true' : 'false');
      });
      filterGrid();
      closeDetail();
    });

    // Close button
    let closeBtn = document.getElementById('apiDetailClose');
    if (closeBtn) closeBtn.addEventListener('click', closeDetail);

    // Copy buttons
    document.querySelectorAll('.api-copy-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        const targetId = btn.getAttribute('data-copy-target');
        let target = document.getElementById(targetId);
        if (!target) return;
        let text = target.textContent;
        if (navigator.clipboard) {
          navigator.clipboard.writeText(text).then(function () {
            btn.textContent = '\u2705 Copied!';
            btn.classList.add('copied');
            setTimeout(function () { btn.textContent = '\uD83D\uDCCB Copy'; btn.classList.remove('copied'); }, 1500);
          });
        }
      });
    });

    // Build card pool once — cards are shown/hidden on filter, not recreated
    cardPool = [];
    ENDPOINTS.forEach(function (ep) {
      const card = document.createElement('div');
      card.className = 'api-endpoint-card';
      card.setAttribute('role', 'listitem');
      card.setAttribute('tabindex', '0');
      card.setAttribute('data-category', ep.category);
      card.innerHTML =
        '<span class="api-method-badge ' + ep.method.toLowerCase() + '">' + ep.method + '</span>' +
        '<span class="api-endpoint-path">' + escapeHtml(ep.path) + (ep.suffix ? ' <small style="opacity:0.5">' + escapeHtml(ep.suffix) + '</small>' : '') + '</span>' +
        '<span class="api-endpoint-desc">' + escapeHtml(ep.desc) + '</span>';

      card.addEventListener('click', function () { showDetail(ep, card); });
      card.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); showDetail(ep, card); }
      });
      grid.appendChild(card);
      cardPool.push(card);
    });

    filterGrid();
  }

  function filterGrid() {
    for (var i = 0; i < cardPool.length; i++) {
      cardPool[i].hidden = (currentFilter !== 'all' && cardPool[i].getAttribute('data-category') !== currentFilter);
    }
  }

  function showDetail(ep, card) {
    if (activeCard) activeCard.classList.remove('active');
    activeCard = card;
    card.classList.add('active');

    document.getElementById('apiDetailTitle').innerHTML =
      '<span class="api-method-badge ' + ep.method.toLowerCase() + '">' + ep.method + '</span> ' +
      escapeHtml(ep.path) + (ep.suffix ? ' ' + escapeHtml(ep.suffix) : '');

    document.getElementById('apiDetailMeta').innerHTML =
      '<span>\uD83D\uDD12 ' + escapeHtml(ep.auth) + '</span>' +
      '<span>\u26A1 ' + escapeHtml(ep.rateLimit) + '</span>' +
      '<span>\uD83C\uDFF7\uFE0F ' + escapeHtml(getCategoryName(ep.category)) + '</span>';

    // Curl command
    let curl = 'curl';
    if (ep.method !== 'GET') curl += ' -X ' + ep.method;
    curl += " 'https://api.agentbox.ai" + ep.path + "'";
    curl += " \\\n  -H 'Authorization: Bearer YOUR_API_KEY'";
    curl += " \\\n  -H 'Content-Type: application/json'";
    if (ep.reqBody) curl += " \\\n  -d '" + ep.reqBody.replace(/'/g, "'\\''") + "'";
    document.getElementById('apiCurlCode').textContent = curl;

    // Request body
    const reqSection = document.getElementById('apiReqBodySection');
    if (ep.reqBody) {
      reqSection.hidden = false;
      document.getElementById('apiReqBody').textContent = ep.reqBody;
    } else {
      reqSection.hidden = true;
    }

    // Response
    document.getElementById('apiRespBody').textContent = ep.respBody;

    // Status badge
    const badge = document.getElementById('apiStatusBadge');
    if (ep.method === 'DELETE') { badge.textContent = '200 OK'; }
    else { badge.textContent = '200 OK'; }

    detailPanel.hidden = false;
    if (detailPanel.scrollIntoView) { detailPanel.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }
  }

  function closeDetail() {
    if (detailPanel) detailPanel.hidden = true;
    if (activeCard) { activeCard.classList.remove('active'); activeCard = null; }
  }

  function getCategoryName(key) {
    for (var i = 0; i < CATEGORIES.length; i++) {
      if (CATEGORIES[i].key === key) return CATEGORIES[i].name;
    }
    return key;
  }

  function escapeHtml(s) {
    const d = document.createElement('div');
    d.textContent = s;
    return d.innerHTML;
  }

  return { init: init };
})();

// ---------------------------------------------------------------------------
// Workflow Templates — Ready-to-use automation recipes
// ---------------------------------------------------------------------------
var WorkflowTemplates = (function () {
  'use strict';

  const TEMPLATES = [
    {
      id: 'daily-briefing',
      title: 'Daily Briefing',
      icon: '\u2615',
      category: 'productivity',
      description: 'Get a personalized morning briefing with weather, calendar events, and top news — delivered to Telegram every day.',
      steps: [
        'Agent checks your local weather forecast',
        'Pulls today\'s calendar events and reminders',
        'Summarizes top 3 news headlines for your interests',
        'Sends a single concise morning message'
      ],
      setup: '/remind every day at 8am: Give me a morning briefing with weather in Seattle, my calendar, and top tech news',
      tags: ['morning', 'weather', 'news', 'calendar'],
      difficulty: 'easy'
    },
    {
      id: 'expense-tracker',
      title: 'Expense Tracker',
      icon: '\uD83D\uDCB0',
      category: 'finance',
      description: 'Log expenses by text or photo. Get weekly summaries with category breakdowns and budget warnings.',
      steps: [
        'Send a message like "Coffee $4.50" or snap a receipt photo',
        'Agent categorizes and stores the expense',
        'Ask "How much did I spend this week?" anytime',
        'Get a weekly summary every Sunday with charts'
      ],
      setup: '/remind every Sunday at 8pm: Summarize my expenses this week by category and tell me if I\'m over budget',
      tags: ['money', 'budget', 'receipts', 'tracking'],
      difficulty: 'easy'
    },
    {
      id: 'research-assistant',
      title: 'Research Assistant',
      icon: '\uD83D\uDD0D',
      category: 'productivity',
      description: 'Delegate web research tasks. Agent searches, compiles findings, and saves structured notes you can reference later.',
      steps: [
        'Ask a research question or topic',
        'Agent searches multiple sources on the web',
        'Compiles key findings with source links',
        'Remembers the research for future conversations'
      ],
      setup: 'Research the best noise-cancelling headphones under $300. Compare at least 5 models on sound quality, ANC, battery, and comfort.',
      tags: ['search', 'analysis', 'comparison', 'notes'],
      difficulty: 'easy'
    },
    {
      id: 'code-reviewer',
      title: 'Code Review Bot',
      icon: '\uD83D\uDCBB',
      category: 'development',
      description: 'Send code snippets or screenshots for instant review. Catches bugs, suggests improvements, and explains concepts.',
      steps: [
        'Paste code or send a screenshot of your editor',
        'Agent analyzes for bugs, style, and performance',
        'Returns specific suggestions with explanations',
        'Remembers your tech stack for contextual advice'
      ],
      setup: 'Review this code for bugs, performance issues, and best practices:\n\n```python\ndef process(data):\n  results = []\n  for item in data:\n    if item not in results:\n      results.append(item)\n  return results\n```',
      tags: ['coding', 'debugging', 'review', 'python'],
      difficulty: 'medium'
    },
    {
      id: 'meeting-prep',
      title: 'Meeting Prep',
      icon: '\uD83D\uDCC5',
      category: 'productivity',
      description: 'Before any meeting, get a briefing with attendee context, agenda summary, and suggested talking points.',
      steps: [
        'Tell the agent about your upcoming meeting',
        'Agent recalls past context about attendees and topics',
        'Generates agenda summary and talking points',
        'Sends a prep brief 15 minutes before the meeting'
      ],
      setup: '/remind 15 min before my next meeting: Prepare a brief with talking points, open action items, and any context you remember about the attendees',
      tags: ['meetings', 'preparation', 'calendar', 'context'],
      difficulty: 'medium'
    },
    {
      id: 'habit-tracker',
      title: 'Habit Tracker',
      icon: '\u2705',
      category: 'health',
      description: 'Track daily habits with natural language. Get streak reports, gentle nudges, and weekly progress summaries.',
      steps: [
        'Tell the agent your habits: "I want to track meditation, exercise, and reading"',
        'Check in naturally: "Did 20 min meditation and a 5k run today"',
        'Agent tracks streaks and sends evening check-ins',
        'Weekly progress report with streak counts and trends'
      ],
      setup: '/remind every day at 9pm: Check in on my habits. Ask what I did today for meditation, exercise, and reading. Track my streaks.',
      tags: ['habits', 'streaks', 'health', 'accountability'],
      difficulty: 'easy'
    },
    {
      id: 'content-curator',
      title: 'Content Curator',
      icon: '\uD83D\uDCF0',
      category: 'productivity',
      description: 'Agent monitors topics you care about and sends curated digests with the most relevant articles and discussions.',
      steps: [
        'Define your interests: "AI safety, Rust programming, indie games"',
        'Agent searches for fresh content daily',
        'Filters out noise, keeps only high-quality pieces',
        'Sends a digest with summaries and links'
      ],
      setup: '/remind every day at 12pm: Find the 5 most interesting articles from today about AI safety and Rust programming. Include a 2-sentence summary for each.',
      tags: ['news', 'curation', 'digest', 'reading'],
      difficulty: 'easy'
    },
    {
      id: 'workout-planner',
      title: 'Workout Planner',
      icon: '\uD83C\uDFCB\uFE0F',
      category: 'health',
      description: 'Get personalized workout suggestions based on your equipment, fitness level, and schedule. Agent remembers your preferences.',
      steps: [
        'Tell the agent your fitness goals and available equipment',
        'Request a workout: "Give me a 30-min upper body routine"',
        'Agent creates a structured plan with sets and reps',
        'Remembers what you did last time to vary exercises'
      ],
      setup: 'I have dumbbells (5-40 lbs), a pull-up bar, and a yoga mat. I can work out 4 days a week for 30-45 minutes. Create a weekly plan for muscle building.',
      tags: ['fitness', 'exercise', 'planning', 'health'],
      difficulty: 'easy'
    },
    {
      id: 'price-watcher',
      title: 'Price Watcher',
      icon: '\uD83D\uDCCA',
      category: 'finance',
      description: 'Monitor product prices and get notified when they drop. Agent checks periodically and alerts you on deals.',
      steps: [
        'Share a product link or name with target price',
        'Agent checks the current price periodically',
        'Sends an alert when the price drops below your target',
        'Tracks price history so you can see trends'
      ],
      setup: '/remind every day at 10am: Check if the Sony WH-1000XM5 headphones are below $280 on Amazon. If yes, send me a price alert with the link.',
      tags: ['shopping', 'deals', 'monitoring', 'alerts'],
      difficulty: 'medium'
    },
    {
      id: 'language-tutor',
      title: 'Language Tutor',
      icon: '\uD83C\uDF0D',
      category: 'learning',
      description: 'Practice a new language with daily vocabulary, conversation drills, and grammar corrections in natural chat.',
      steps: [
        'Tell the agent which language and your level',
        'Get daily vocabulary words with example sentences',
        'Practice conversations — agent corrects your grammar',
        'Weekly quiz on words you\'ve learned'
      ],
      setup: '/remind every day at 7am: Teach me 5 new Spanish words with example sentences. Include pronunciation tips. Quiz me on yesterday\'s words first.',
      tags: ['languages', 'vocabulary', 'practice', 'education'],
      difficulty: 'easy'
    },
    {
      id: 'standup-bot',
      title: 'Standup Reporter',
      icon: '\uD83D\uDCE2',
      category: 'development',
      description: 'Agent asks for your daily standup updates, formats them, and keeps a searchable log you can reference in retros.',
      steps: [
        'Agent asks: "What did you do yesterday? What\'s the plan today? Any blockers?"',
        'You reply in natural language',
        'Agent formats it into a clean standup report',
        'Searchable history: "What was I working on last Tuesday?"'
      ],
      setup: '/remind every weekday at 9:30am: Ask me for my standup update. Format it as Yesterday/Today/Blockers. Save it so I can search later.',
      tags: ['standup', 'agile', 'team', 'reporting'],
      difficulty: 'easy'
    },
    {
      id: 'meal-planner',
      title: 'Meal Planner',
      icon: '\uD83C\uDF73',
      category: 'health',
      description: 'Get personalized meal suggestions based on dietary preferences, ingredients on hand, and nutritional goals.',
      steps: [
        'Set dietary preferences: "vegetarian, high protein, under 600 cal"',
        'Ask for meal ideas or send a photo of your fridge',
        'Agent suggests recipes with step-by-step instructions',
        'Generates a weekly grocery list on demand'
      ],
      setup: 'I\'m vegetarian and trying to eat 120g protein daily. Suggest 3 easy dinner recipes I can make in under 30 minutes with common ingredients.',
      tags: ['cooking', 'nutrition', 'recipes', 'diet'],
      difficulty: 'easy'
    }
  ];

  const CATEGORIES = [
    { id: 'all', label: 'All' },
    { id: 'productivity', label: '\uD83D\uDCBC Productivity' },
    { id: 'development', label: '\uD83D\uDCBB Development' },
    { id: 'finance', label: '\uD83D\uDCB0 Finance' },
    { id: 'health', label: '\uD83C\uDFCB\uFE0F Health' },
    { id: 'learning', label: '\uD83C\uDF0D Learning' }
  ];

  let _currentCategory = 'all';
  let _gridEl = null;
  let _detailEl = null;
  let _filterContainer = null;

  function init() {
    _gridEl = document.getElementById('workflowGrid');
    _detailEl = document.getElementById('workflowDetail');
    _filterContainer = document.querySelector('.workflow-filter');
    if (!_gridEl) return;

    _buildFilterButtons();
    _renderGrid();
    _bindDetailClose();
    _bindCopy();
  }

  function _buildFilterButtons() {
    if (!_filterContainer) return;
    // Clear existing buttons (the HTML has the "All" button as a placeholder)
    while (_filterContainer.firstChild) {
      _filterContainer.removeChild(_filterContainer.firstChild);
    }
    for (var i = 0; i < CATEGORIES.length; i++) {
      let cat = CATEGORIES[i];
      let btn = document.createElement('button');
      btn.className = 'workflow-filter-btn' + (cat.id === 'all' ? ' active' : '');
      btn.setAttribute('role', 'tab');
      btn.setAttribute('aria-selected', cat.id === 'all' ? 'true' : 'false');
      btn.dataset.wfCat = cat.id;
      btn.textContent = cat.label;
      btn.addEventListener('click', _onFilterClick);
      _filterContainer.appendChild(btn);
    }
  }

  function _onFilterClick(e) {
    let cat = e.target.dataset.wfCat;
    if (!cat || cat === _currentCategory) return;
    filterBy(cat);
  }

  function filterBy(category) {
    _currentCategory = category;
    // Update button states
    const btns = _filterContainer.querySelectorAll('.workflow-filter-btn');
    for (var i = 0; i < btns.length; i++) {
      let isActive = btns[i].dataset.wfCat === category;
      btns[i].classList.toggle('active', isActive);
      btns[i].setAttribute('aria-selected', isActive ? 'true' : 'false');
    }
    _renderGrid();
    // Hide detail panel when switching categories
    if (_detailEl) _detailEl.hidden = true;
  }

  function _renderGrid() {
    if (!_gridEl) return;
    while (_gridEl.firstChild) _gridEl.removeChild(_gridEl.firstChild);

    let filtered = _currentCategory === 'all'
      ? TEMPLATES
      : TEMPLATES.filter(function (t) { return t.category === _currentCategory; });

    for (var i = 0; i < filtered.length; i++) {
      _gridEl.appendChild(_createCard(filtered[i]));
    }
  }

  function _createCard(template) {
    const card = document.createElement('div');
    card.className = 'workflow-card';
    card.setAttribute('role', 'listitem');
    card.dataset.wfId = template.id;
    card.tabIndex = 0;

    let icon = document.createElement('div');
    icon.className = 'workflow-card-icon';
    icon.textContent = template.icon;
    card.appendChild(icon);

    const title = document.createElement('h4');
    title.className = 'workflow-card-title';
    title.textContent = template.title;
    card.appendChild(title);

    const desc = document.createElement('p');
    desc.className = 'workflow-card-desc';
    desc.textContent = template.description;
    card.appendChild(desc);

    const meta = document.createElement('div');
    meta.className = 'workflow-card-meta';

    const diffBadge = document.createElement('span');
    diffBadge.className = 'workflow-difficulty workflow-difficulty-' + template.difficulty;
    diffBadge.textContent = template.difficulty;
    meta.appendChild(diffBadge);

    const catBadge = document.createElement('span');
    catBadge.className = 'workflow-category-badge';
    catBadge.textContent = template.category;
    meta.appendChild(catBadge);

    card.appendChild(meta);

    card.addEventListener('click', function () {
      _showDetail(template);
    });
    card.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        _showDetail(template);
      }
    });

    return card;
  }

  function _showDetail(template) {
    if (!_detailEl) return;

    const titleEl = document.getElementById('workflowDetailTitle');
    const descEl = document.getElementById('workflowDetailDesc');
    const stepsEl = document.getElementById('workflowSteps');
    const codeEl = document.getElementById('workflowSetupCode');
    const tagsEl = document.getElementById('workflowTags');

    if (titleEl) titleEl.textContent = template.icon + ' ' + template.title;
    if (descEl) descEl.textContent = template.description;

    if (stepsEl) {
      while (stepsEl.firstChild) stepsEl.removeChild(stepsEl.firstChild);
      const ol = document.createElement('ol');
      ol.className = 'workflow-steps-list';
      for (var i = 0; i < template.steps.length; i++) {
        const li = document.createElement('li');
        li.textContent = template.steps[i];
        ol.appendChild(li);
      }
      stepsEl.appendChild(ol);
    }

    if (codeEl) codeEl.textContent = template.setup;

    if (tagsEl) {
      while (tagsEl.firstChild) tagsEl.removeChild(tagsEl.firstChild);
      for (var j = 0; j < template.tags.length; j++) {
        const tag = document.createElement('span');
        tag.className = 'workflow-tag';
        tag.textContent = '#' + template.tags[j];
        tagsEl.appendChild(tag);
      }
    }

    _detailEl.hidden = false;
    if (_detailEl.scrollIntoView) _detailEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function _bindDetailClose() {
    let closeBtn = document.getElementById('workflowDetailClose');
    if (closeBtn) {
      closeBtn.addEventListener('click', function () {
        if (_detailEl) _detailEl.hidden = true;
      });
    }
  }

  function _bindCopy() {
    const copyBtn = document.getElementById('workflowCopyBtn');
    if (copyBtn) {
      copyBtn.addEventListener('click', function () {
        const codeEl = document.getElementById('workflowSetupCode');
        if (!codeEl) return;
        let text = codeEl.textContent;
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(text);
        }
        copyBtn.textContent = '\u2705 Copied!';
        setTimeout(function () { copyBtn.textContent = '\uD83D\uDCCB Copy'; }, 2000);
      });
    }
  }

  function getTemplates() { return TEMPLATES.slice(); }
  function getCategories() { return CATEGORIES.slice(); }
  function getCurrent() { return _currentCategory; }

  function getByCategory(category) {
    if (category === 'all') return TEMPLATES.slice();
    return TEMPLATES.filter(function (t) { return t.category === category; });
  }

  function getById(id) {
    for (var i = 0; i < TEMPLATES.length; i++) {
      if (TEMPLATES[i].id === id) return TEMPLATES[i];
    }
    return null;
  }

  return {
    init: init,
    filterBy: filterBy,
    getTemplates: getTemplates,
    getCategories: getCategories,
    getCurrent: getCurrent,
    getByCategory: getByCategory,
    getById: getById,
    TEMPLATES: TEMPLATES,
    CATEGORIES: CATEGORIES
  };
})();

if (typeof window !== 'undefined') {
  window.ApiExplorer = ApiExplorer;
  window.OnboardingQuiz = OnboardingQuiz;
  window.WorkflowTemplates = WorkflowTemplates;
}

// ---------------------------------------------------------------------------
// Quick Start Wizard
// ---------------------------------------------------------------------------
var QuickStartWizard = (function () {
  'use strict';

  const state = { step: 1, useCase: null, frequency: null };

  const plans = {
    productivity: {
      steps: [
        { title: 'Open AgentBox in Telegram', desc: 'Tap the link and press Start' },
        { title: 'Set your timezone', desc: 'Say "My timezone is [your timezone]" so reminders work correctly' },
        { title: 'Try a reminder', desc: 'Type: "Remind me in 10 minutes to take a break"' },
        { title: 'Create a daily standup', desc: 'Ask: "Every morning at 9am, ask me what I plan to do today"' },
        { title: 'Send a task list', desc: 'Type your tasks and ask it to organize them by priority' }
      ],
      tip: 'Productivity users get the most value from reminders and daily check-ins. The free tier (20 msg/day) covers most daily planning needs.'
    },
    research: {
      steps: [
        { title: 'Open AgentBox in Telegram', desc: 'Tap the link and press Start' },
        { title: 'Ask a research question', desc: 'Try: "What are the latest developments in quantum computing?"' },
        { title: 'Send an article screenshot', desc: 'Screenshot a paper or article and ask for a summary' },
        { title: 'Compare sources', desc: 'Ask: "Compare what Reuters and AP say about [topic]"' },
        { title: 'Build a reading list', desc: 'Say: "Remember these articles for me" and send links over time' }
      ],
      tip: 'Research users love web search and image understanding. For heavy research days, the Pro plan gives you unlimited messages.'
    },
    creative: {
      steps: [
        { title: 'Open AgentBox in Telegram', desc: 'Tap the link and press Start' },
        { title: 'Start a brainstorm', desc: 'Try: "Give me 10 creative names for a coffee shop in Portland"' },
        { title: 'Send a mood board', desc: 'Send images and ask for style analysis or color palette extraction' },
        { title: 'Workshop your writing', desc: 'Paste a draft and ask: "Make this punchier but keep the tone"' },
        { title: 'Set a creative prompt', desc: 'Ask: "Every morning, send me a random writing prompt"' }
      ],
      tip: 'Creative users benefit from the agent\'s memory — it learns your style preferences over time. Try chatting for a week and notice the difference.'
    },
    coding: {
      steps: [
        { title: 'Open AgentBox in Telegram', desc: 'Tap the link and press Start' },
        { title: 'Ask a coding question', desc: 'Try: "Explain the difference between Promise.all and Promise.allSettled"' },
        { title: 'Send a screenshot', desc: 'Screenshot an error message and ask for help debugging' },
        { title: 'Code review on the go', desc: 'Paste a function and ask: "Any bugs or improvements here?"' },
        { title: 'Build a snippet library', desc: 'Send useful snippets and ask it to remember them for later' }
      ],
      tip: 'Coding on mobile is surprisingly useful for quick reviews, learning, and debugging. Your agent remembers your language preferences.'
    }
  };

  const freqRecs = {
    casual: { plan: 'Free', reason: '20 messages/day is plenty for occasional use.' },
    daily: { plan: 'Free or Pro', reason: 'Free works for light daily use. Upgrade to Pro if you hit the limit.' },
    power: { plan: 'Pro', reason: 'Unlimited messages for heavy daily usage. Totally worth it.' }
  };

  function init() {
    const container = document.getElementById('wizardContainer');
    if (!container) return;

    const nextBtn = document.getElementById('wizardNext');
    const backBtn = document.getElementById('wizardBack');

    container.addEventListener('click', function (e) {
      const opt = e.target.closest('.wizard-option');
      if (!opt) return;

      const group = opt.parentElement;
      group.querySelectorAll('.wizard-option').forEach(function (o) {
        o.classList.remove('selected');
        o.setAttribute('aria-checked', 'false');
      });
      opt.classList.add('selected');
      opt.setAttribute('aria-checked', 'true');

      if (state.step === 1) state.useCase = opt.getAttribute('data-value');
      if (state.step === 2) state.frequency = opt.getAttribute('data-value');

      nextBtn.disabled = false;
    });

    nextBtn.addEventListener('click', function () {
      if (state.step < 3) {
        state.step++;
        render();
      }
    });

    backBtn.addEventListener('click', function () {
      if (state.step > 1) {
        state.step--;
        render();
      }
    });
  }

  function render() {
    const steps = document.querySelectorAll('.wizard-step');
    steps.forEach(function (s) { s.classList.remove('active'); });
    let active = document.querySelector('[data-wizard-step="' + state.step + '"]');
    if (active) active.classList.add('active');

    let bar = document.getElementById('wizardProgressBar');
    if (bar) bar.style.width = (state.step / 3 * 100) + '%';

    const indicator = document.getElementById('wizardIndicator');
    if (indicator) indicator.textContent = 'Step ' + state.step + ' of 3';

    const backBtn = document.getElementById('wizardBack');
    const nextBtn = document.getElementById('wizardNext');
    backBtn.disabled = state.step === 1;

    if (state.step === 3) {
      nextBtn.style.display = 'none';
      renderResult();
    } else {
      nextBtn.style.display = '';
      // Check if current step has a selection
      let currentStep = document.querySelector('.wizard-step.active');
      const hasSelection = currentStep && currentStep.querySelector('.wizard-option.selected');
      nextBtn.disabled = !hasSelection;
    }
  }

  function renderResult() {
    let result = document.getElementById('wizardResult');
    if (!result || !state.useCase) return;

    const plan = plans[state.useCase];
    const freq = freqRecs[state.frequency] || freqRecs.casual;

    let html = '<ul class="wizard-result-plan">';
    plan.steps.forEach(function (s, i) {
      html += '<li><span class="plan-step-num">' + (i + 1) + '</span>';
      html += '<span class="plan-step-text"><strong>' + s.title + '</strong>';
      html += '<span>' + s.desc + '</span></span></li>';
    });
    html += '</ul>';

    html += '<div class="wizard-result-rec">';
    html += '<strong>💡 ' + plan.tip + '</strong>';
    html += '</div>';

    html += '<div class="wizard-result-rec">';
    html += '<strong>📊 Recommended plan: ' + freq.plan + '</strong>';
    html += '<span>' + freq.reason + '</span>';
    html += '</div>';

    html += '<div style="text-align:center">';
    html += '<a href="#pricingSection" class="wizard-result-cta">Get Started →</a>';
    html += '</div>';

    result.innerHTML = html;
  }

  return { init: init };
})();

if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', function () {
    QuickStartWizard.init();
  });
}

if (typeof window !== 'undefined') {
  window.QuickStartWizard = QuickStartWizard;
}

/* ──────────────────────────────────────────────
   Social Proof Notification Toasts
   Periodic toast popups showing simulated user
   activity to build trust and social proof.
   ────────────────────────────────────────────── */
var SocialProofToasts = (function () {
  'use strict';

  let _container = null;
  let _timer = null;
  let _dismissed = false;
  let _prefersReducedMotion = false;
  const _toastQueue = [];
  let _activeToast = null;

  const DISPLAY_MS = 5000;
  const INTERVAL_MS = 25000;
  const INITIAL_DELAY_MS = 12000;
  const MAX_TOASTS_PER_SESSION = 15;
  let _toastsShown = 0;

  const cities = [
    'Seattle', 'San Francisco', 'New York', 'London', 'Berlin',
    'Tokyo', 'Toronto', 'Sydney', 'Amsterdam', 'Singapore',
    'Austin', 'Portland', 'Denver', 'Chicago', 'Los Angeles',
    'Stockholm', 'Dublin', 'Bangalore', 'Seoul', 'Paris'
  ];

  const actions = [
    { icon: '🚀', text: 'just started using AgentBox' },
    { icon: '⭐', text: 'upgraded to Pro' },
    { icon: '🎉', text: 'sent their 100th message' },
    { icon: '🔔', text: 'set up their first reminder' },
    { icon: '🧠', text: 'enabled long-term memory' },
    { icon: '📷', text: 'analyzed their first image' },
    { icon: '🔍', text: 'ran their first web search' },
    { icon: '💬', text: 'created a custom persona' },
    { icon: '📊', text: 'connected a new integration' },
    { icon: '🎯', text: 'completed the onboarding quiz' }
  ];

  const timeLabels = [
    'just now', '2 minutes ago', '5 minutes ago',
    '8 minutes ago', '12 minutes ago'
  ];

  function pick(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  function generateToast() {
    const city = pick(cities);
    const action = pick(actions);
    const time = pick(timeLabels);
    return {
      icon: action.icon,
      city: city,
      text: action.text,
      time: time
    };
  }

  function createToastEl(data) {
    let toast = document.createElement('div');
    toast.className = 'sp-toast';
    toast.setAttribute('role', 'status');
    toast.setAttribute('aria-live', 'polite');

    let icon = document.createElement('span');
    icon.className = 'sp-toast-icon';
    icon.textContent = data.icon;

    const body = document.createElement('div');
    body.className = 'sp-toast-body';

    const msg = document.createElement('span');
    msg.className = 'sp-toast-msg';
    msg.textContent = 'Someone in ' + data.city + ' ' + data.text;

    const time = document.createElement('span');
    time.className = 'sp-toast-time';
    time.textContent = data.time;

    body.appendChild(msg);
    body.appendChild(time);

    const close = document.createElement('button');
    close.className = 'sp-toast-close';
    close.setAttribute('aria-label', 'Dismiss notification');
    close.textContent = '\u00D7';
    close.addEventListener('click', function (e) {
      e.stopPropagation();
      hideToast(toast);
    });

    toast.appendChild(icon);
    toast.appendChild(body);
    toast.appendChild(close);

    return toast;
  }

  function showToast() {
    if (_dismissed || _toastsShown >= MAX_TOASTS_PER_SESSION) {
      stop();
      return;
    }
    if (_activeToast) return;

    const data = generateToast();
    let el = createToastEl(data);
    _activeToast = el;
    _container.appendChild(el);
    _toastsShown++;

    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        el.classList.add('sp-toast-visible');
      });
    });

    setTimeout(function () {
      hideToast(el);
    }, DISPLAY_MS);
  }

  function hideToast(el) {
    if (!el || !el.parentNode) {
      _activeToast = null;
      return;
    }
    el.classList.remove('sp-toast-visible');
    el.classList.add('sp-toast-hiding');
    const onEnd = function () {
      el.removeEventListener('transitionend', onEnd);
      if (el.parentNode) el.parentNode.removeChild(el);
      if (_activeToast === el) _activeToast = null;
    };
    el.addEventListener('transitionend', onEnd);
    // Fallback in case transitionend doesn't fire
    setTimeout(onEnd, 500);
  }

  function start() {
    if (_prefersReducedMotion || _dismissed) return;
    _timer = setInterval(showToast, INTERVAL_MS);
  }

  function stop() {
    if (_timer) {
      clearInterval(_timer);
      _timer = null;
    }
  }

  function dismiss() {
    _dismissed = true;
    stop();
    if (_activeToast) hideToast(_activeToast);
    try {
      sessionStorage.setItem('sp-toasts-dismissed', '1');
    } catch (e) { /* noop */ }
  }

  function init() {
    if (typeof document === 'undefined') return;

    try {
      if (sessionStorage.getItem('sp-toasts-dismissed') === '1') {
        _dismissed = true;
        return;
      }
    } catch (e) { /* noop */ }

    const mq = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)');
    if (mq) {
      _prefersReducedMotion = mq.matches;
      mq.addEventListener('change', function (e) {
        _prefersReducedMotion = e.matches;
        if (_prefersReducedMotion) stop();
      });
    }
    if (_prefersReducedMotion) return;

    _container = document.createElement('div');
    _container.className = 'sp-toast-container';
    _container.setAttribute('aria-label', 'Activity notifications');
    document.body.appendChild(_container);

    setTimeout(function () {
      showToast();
      start();
    }, INITIAL_DELAY_MS);
  }

  function destroy() {
    stop();
    if (_activeToast) hideToast(_activeToast);
    if (_container && _container.parentNode) {
      _container.parentNode.removeChild(_container);
    }
    _container = null;
    _toastsShown = 0;
    _dismissed = false;
  }

  return {
    init: init,
    dismiss: dismiss,
    destroy: destroy,
    _showToast: showToast
  };
})();

if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', function () {
    SocialProofToasts.init();
  });
}

if (typeof window !== 'undefined') {
  window.SocialProofToasts = SocialProofToasts;
}

/* ──────────────────────────────────────────────
   Before/After Day Comparison Tabs
   ────────────────────────────────────────────── */
var BeforeAfter = (function () {
  'use strict';

  function init() {
    if (typeof document === 'undefined') return;
    const tabBefore = document.getElementById('baTabBefore');
    const tabAfter  = document.getElementById('baTabAfter');
    const panelBefore = document.getElementById('baPanelBefore');
    const panelAfter  = document.getElementById('baPanelAfter');
    if (!tabBefore || !tabAfter || !panelBefore || !panelAfter) return;

    function switchTo(which) {
      const isBefore = which === 'before';
      tabBefore.classList.toggle('active', isBefore);
      tabAfter.classList.toggle('active', !isBefore);
      tabBefore.setAttribute('aria-selected', isBefore ? 'true' : 'false');
      tabAfter.setAttribute('aria-selected', !isBefore ? 'true' : 'false');
      panelBefore.classList.toggle('active', isBefore);
      panelAfter.classList.toggle('active', !isBefore);
      panelBefore.hidden = !isBefore;
      panelAfter.hidden = isBefore;
    }

    tabBefore.addEventListener('click', function () { switchTo('before'); });
    tabAfter.addEventListener('click', function () { switchTo('after'); });

    tabBefore.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight') { tabAfter.focus(); switchTo('after'); }
    });
    tabAfter.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowLeft') { tabBefore.focus(); switchTo('before'); }
    });
  }

  return { init: init };
})();

if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', function () {
    BeforeAfter.init();
  });
}

if (typeof window !== 'undefined') {
  window.BeforeAfter = BeforeAfter;
}

/* ═══════════════════════════════════════════════════════════════
 *  Growth Timeline – interactive user journey milestone viewer
 * ═══════════════════════════════════════════════════════════════ */
var GrowthTimeline = (function () {
  'use strict';

  const MILESTONES = ['week1', 'month1', 'month3', 'month6'];
  const PROGRESS = { week1: 12.5, month1: 37.5, month3: 62.5, month6: 87.5 };
  const AUTO_INTERVAL = 4000;
  let _current = 0;
  let _timer = null;
  let _paused = false;

  function select(index) {
    if (index < 0 || index >= MILESTONES.length) return;
    _current = index;
    const milestone = MILESTONES[index];

    // Tabs
    const tabs = document.querySelectorAll('.growth-tab');
    tabs.forEach(function (t) {
      let active = t.getAttribute('data-milestone') === milestone;
      t.classList.toggle('active', active);
      t.setAttribute('aria-pressed', active ? 'true' : 'false');
    });

    // Cards
    document.querySelectorAll('.growth-card').forEach(function (c) {
      c.classList.toggle('visible', c.getAttribute('data-milestone') === milestone);
    });

    // Progress bar
    const fill = document.getElementById('growthProgressFill');
    if (fill) fill.style.width = PROGRESS[milestone] + '%';

    // Markers
    document.querySelectorAll('.growth-marker').forEach(function (m, i) {
      m.classList.toggle('active', i === index);
      m.classList.toggle('passed', i < index);
    });
  }

  function next() {
    select((_current + 1) % MILESTONES.length);
  }

  function startAutoPlay() {
    stopAutoPlay();
    _paused = false;
    _timer = setInterval(function () {
      if (!_paused) next();
    }, AUTO_INTERVAL);
  }

  function stopAutoPlay() {
    if (_timer) { clearInterval(_timer); _timer = null; }
  }

  function pauseAutoPlay() { _paused = true; }
  function resumeAutoPlay() { _paused = false; }

  function init() {
    const section = document.getElementById('growthTimelineSection');
    if (!section) return;

    // Tab click handlers
    section.querySelectorAll('.growth-tab').forEach(function (tab) {
      tab.addEventListener('click', function () {
        const ms = tab.getAttribute('data-milestone');
        let idx = MILESTONES.indexOf(ms);
        if (idx !== -1) {
          select(idx);
          // Reset autoplay timer on manual interaction
          startAutoPlay();
        }
      });
    });

    // Marker click handlers
    section.querySelectorAll('.growth-marker').forEach(function (marker) {
      marker.style.cursor = 'pointer';
      marker.addEventListener('click', function () {
        const ms = marker.getAttribute('data-milestone');
        let idx = MILESTONES.indexOf(ms);
        if (idx !== -1) {
          select(idx);
          startAutoPlay();
        }
      });
    });

    // Pause on hover
    section.addEventListener('mouseenter', pauseAutoPlay);
    section.addEventListener('mouseleave', resumeAutoPlay);

    // Keyboard navigation
    section.setAttribute('tabindex', '0');
    section.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault();
        select(Math.min(_current + 1, MILESTONES.length - 1));
        startAutoPlay();
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        select(Math.max(_current - 1, 0));
        startAutoPlay();
      }
    });

    select(0);
    startAutoPlay();
  }

  return {
    init: init,
    select: select,
    next: next,
    startAutoPlay: startAutoPlay,
    stopAutoPlay: stopAutoPlay,
    getCurrent: function () { return _current; },
    getMilestones: function () { return MILESTONES.slice(); },
    MILESTONES: MILESTONES,
    PROGRESS: PROGRESS
  };
})();

if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', function () {
    GrowthTimeline.init();
  });
}

if (typeof window !== 'undefined') {
  window.GrowthTimeline = GrowthTimeline;
}

// Competitive Comparison Table
// ---------------------------------------------------------------------------
// Interactive feature comparison matrix showing AgentBox vs alternatives.
// Users can filter by category, hover for details, and see at-a-glance
// where AgentBox wins.

var ComparisonTable = (function () {
  let _section = null;

  const COMPETITORS = [
    { id: 'agentbox', name: 'AgentBox', highlight: true },
    { id: 'chatgpt', name: 'ChatGPT' },
    { id: 'zapier', name: 'Zapier' },
    { id: 'custom', name: 'Custom Bot' },
    { id: 'manual', name: 'Manual' }
  ];

  const CATEGORIES = [
    { id: 'automation', label: 'Automation' },
    { id: 'integration', label: 'Integration' },
    { id: 'intelligence', label: 'Intelligence' },
    { id: 'ops', label: 'Operations' },
    { id: 'pricing', label: 'Pricing' }
  ];

  // Rating: 3 = full, 2 = partial, 1 = limited, 0 = none
  const FEATURES = [
    { name: 'Multi-step workflows',       cat: 'automation',   ratings: { agentbox: 3, chatgpt: 1, zapier: 3, custom: 2, manual: 0 } },
    { name: 'Natural language triggers',   cat: 'automation',   ratings: { agentbox: 3, chatgpt: 3, zapier: 1, custom: 1, manual: 0 } },
    { name: 'Scheduled tasks',             cat: 'automation',   ratings: { agentbox: 3, chatgpt: 0, zapier: 3, custom: 2, manual: 1 } },
    { name: 'Error recovery',              cat: 'automation',   ratings: { agentbox: 3, chatgpt: 0, zapier: 2, custom: 1, manual: 0 } },
    { name: 'API connections',             cat: 'integration',  ratings: { agentbox: 3, chatgpt: 2, zapier: 3, custom: 3, manual: 0 } },
    { name: 'Browser automation',          cat: 'integration',  ratings: { agentbox: 3, chatgpt: 0, zapier: 1, custom: 2, manual: 3 } },
    { name: 'Database access',             cat: 'integration',  ratings: { agentbox: 3, chatgpt: 0, zapier: 2, custom: 3, manual: 1 } },
    { name: 'File management',             cat: 'integration',  ratings: { agentbox: 3, chatgpt: 1, zapier: 2, custom: 2, manual: 3 } },
    { name: 'Context awareness',           cat: 'intelligence', ratings: { agentbox: 3, chatgpt: 2, zapier: 0, custom: 1, manual: 3 } },
    { name: 'Learning from feedback',      cat: 'intelligence', ratings: { agentbox: 3, chatgpt: 1, zapier: 0, custom: 1, manual: 2 } },
    { name: 'Decision reasoning',          cat: 'intelligence', ratings: { agentbox: 3, chatgpt: 2, zapier: 0, custom: 0, manual: 3 } },
    { name: 'Multi-model support',         cat: 'intelligence', ratings: { agentbox: 3, chatgpt: 0, zapier: 0, custom: 2, manual: 0 } },
    { name: 'Real-time monitoring',        cat: 'ops',          ratings: { agentbox: 3, chatgpt: 0, zapier: 2, custom: 1, manual: 0 } },
    { name: 'Audit logs',                  cat: 'ops',          ratings: { agentbox: 3, chatgpt: 1, zapier: 2, custom: 1, manual: 0 } },
    { name: 'Team collaboration',          cat: 'ops',          ratings: { agentbox: 3, chatgpt: 1, zapier: 3, custom: 1, manual: 2 } },
    { name: 'Usage analytics',             cat: 'ops',          ratings: { agentbox: 3, chatgpt: 1, zapier: 2, custom: 0, manual: 0 } },
    { name: 'Free tier available',         cat: 'pricing',      ratings: { agentbox: 3, chatgpt: 2, zapier: 2, custom: 0, manual: 3 } },
    { name: 'Pay-per-use pricing',         cat: 'pricing',      ratings: { agentbox: 3, chatgpt: 1, zapier: 1, custom: 0, manual: 0 } },
    { name: 'No per-seat fees',            cat: 'pricing',      ratings: { agentbox: 3, chatgpt: 0, zapier: 0, custom: 3, manual: 3 } },
    { name: 'Transparent cost tracking',   cat: 'pricing',      ratings: { agentbox: 3, chatgpt: 1, zapier: 2, custom: 1, manual: 0 } }
  ];

  const RATING_LABELS = ['None', 'Limited', 'Partial', 'Full'];
  const RATING_ICONS = ['\u2014', '\u25CB', '\u25D1', '\u25CF'];

  let _activeCategory = 'all';
  let _filterBtns = [];
  let _tbody = null;
  const _scoreEls = {};
  let _summaryEl = null;

  function section() {
    if (!_section) _section = document.getElementById('comparisonSection');
    return _section;
  }

  function init() {
    _section = document.getElementById('comparisonSection');
    if (!section()) return;

    _filterBtns = section().querySelectorAll('.cmp-filter-btn');
    _tbody = section().querySelector('.cmp-tbody');
    _summaryEl = section().querySelector('.cmp-summary');

    for (var i = 0; i < COMPETITORS.length; i++) {
      let el = document.getElementById('cmpScore_' + COMPETITORS[i].id);
      if (el) _scoreEls[COMPETITORS[i].id] = el;
    }

    for (var j = 0; j < _filterBtns.length; j++) {
      _filterBtns[j].addEventListener('click', _onFilterClick);
    }

    _render();
  }

  function _onFilterClick(e) {
    let btn = e.currentTarget;
    let cat = btn.getAttribute('data-category');
    if (!cat) return;
    _activeCategory = cat;

    for (var i = 0; i < _filterBtns.length; i++) {
      let active = _filterBtns[i].getAttribute('data-category') === cat;
      _filterBtns[i].classList.toggle('active', active);
      _filterBtns[i].setAttribute('aria-pressed', active ? 'true' : 'false');
    }

    _render();
  }

  function _render() {
    if (!_tbody) return;

    // Clear tbody
    while (_tbody.firstChild) _tbody.removeChild(_tbody.firstChild);

    let filtered = _activeCategory === 'all'
      ? FEATURES
      : FEATURES.filter(function (f) { return f.cat === _activeCategory; });

    // Scores accumulator
    const scores = {};
    for (var c = 0; c < COMPETITORS.length; c++) {
      scores[COMPETITORS[c].id] = 0;
    }

    for (var i = 0; i < filtered.length; i++) {
      const feature = filtered[i];
      const row = document.createElement('tr');
      row.className = 'cmp-row';

      // Feature name cell
      const nameCell = document.createElement('td');
      nameCell.className = 'cmp-feature-name';
      nameCell.textContent = feature.name;
      row.appendChild(nameCell);

      // Rating cells
      for (var j = 0; j < COMPETITORS.length; j++) {
        const comp = COMPETITORS[j];
        const rating = feature.ratings[comp.id] || 0;
        scores[comp.id] += rating;

        const cell = document.createElement('td');
        cell.className = 'cmp-rating cmp-rating-' + rating;
        if (comp.highlight) cell.classList.add('cmp-highlight');
        cell.setAttribute('title', comp.name + ': ' + RATING_LABELS[rating]);
        cell.setAttribute('aria-label', feature.name + ' - ' + comp.name + ': ' + RATING_LABELS[rating]);
        cell.textContent = RATING_ICONS[rating];
        row.appendChild(cell);
      }

      _tbody.appendChild(row);
    }

    // Update score displays
    const maxPossible = filtered.length * 3;
    for (var k = 0; k < COMPETITORS.length; k++) {
      let id = COMPETITORS[k].id;
      if (_scoreEls[id]) {
        const pct = maxPossible > 0 ? Math.round(scores[id] / maxPossible * 100) : 0;
        _scoreEls[id].textContent = pct + '%';
      }
    }

    // Update summary
    if (_summaryEl) {
      const agentboxScore = maxPossible > 0 ? Math.round(scores.agentbox / maxPossible * 100) : 0;
      let bestAlt = 0;
      let bestAltName = '';
      for (var m = 1; m < COMPETITORS.length; m++) {
        let s = maxPossible > 0 ? Math.round(scores[COMPETITORS[m].id] / maxPossible * 100) : 0;
        if (s > bestAlt) {
          bestAlt = s;
          bestAltName = COMPETITORS[m].name;
        }
      }
      const diff = agentboxScore - bestAlt;
      if (diff > 0) {
        _summaryEl.textContent = 'AgentBox scores ' + diff + '% higher than the nearest alternative (' + bestAltName + ')';
      } else {
        _summaryEl.textContent = 'See how AgentBox compares across ' + filtered.length + ' features';
      }
    }
  }

  function setFilter(category) {
    _activeCategory = category || 'all';
    for (var i = 0; i < _filterBtns.length; i++) {
      let active = _filterBtns[i].getAttribute('data-category') === _activeCategory;
      _filterBtns[i].classList.toggle('active', active);
      _filterBtns[i].setAttribute('aria-pressed', active ? 'true' : 'false');
    }
    _render();
  }

  function getScores() {
    let filtered = _activeCategory === 'all'
      ? FEATURES
      : FEATURES.filter(function (f) { return f.cat === _activeCategory; });

    const maxPossible = filtered.length * 3;
    let result = {};
    for (var i = 0; i < COMPETITORS.length; i++) {
      let id = COMPETITORS[i].id;
      let total = 0;
      for (var j = 0; j < filtered.length; j++) {
        total += filtered[j].ratings[id] || 0;
      }
      result[id] = maxPossible > 0 ? Math.round(total / maxPossible * 100) : 0;
    }
    return result;
  }

  function getActiveCategory() {
    return _activeCategory;
  }

  return {
    init: init,
    setFilter: setFilter,
    getScores: getScores,
    getActiveCategory: getActiveCategory,
    COMPETITORS: COMPETITORS,
    CATEGORIES: CATEGORIES,
    FEATURES: FEATURES,
    RATING_LABELS: RATING_LABELS,
    RATING_ICONS: RATING_ICONS
  };
})();

if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', function () {
    ComparisonTable.init();
  });
}

if (typeof window !== 'undefined') {
  window.ComparisonTable = ComparisonTable;
}


/* Accessibility Preferences Panel */
var AccessibilityPanel = (function () {
  'use strict';
  const STORAGE_KEY = 'agentbox-a11y-prefs';
  const DEFAULTS = { fontSize: 'medium', highContrast: false, reduceMotion: false, dyslexiaFont: false, focusIndicators: false, lineSpacing: 'normal' };
  let _prefs = {};
  let _panel = null;
  let _trigger = null;
  let _isOpen = false;

  function load() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        _prefs = {};
        for (var key in DEFAULTS) { if (DEFAULTS.hasOwnProperty(key)) { _prefs[key] = parsed.hasOwnProperty(key) ? parsed[key] : DEFAULTS[key]; } }
        return;
      }
    } catch (e) { /* noop */ }
    _prefs = {};
    for (var k in DEFAULTS) { if (DEFAULTS.hasOwnProperty(k)) _prefs[k] = DEFAULTS[k]; }
  }

  function save() { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(_prefs)); } catch (e) { /* noop */ } }

  function applyAll() {
    let html = document.documentElement;
    html.classList.remove('a11y-font-large', 'a11y-font-xlarge');
    if (_prefs.fontSize === 'large') html.classList.add('a11y-font-large');
    else if (_prefs.fontSize === 'xlarge') html.classList.add('a11y-font-xlarge');
    html.classList.toggle('a11y-high-contrast', !!_prefs.highContrast);
    html.classList.toggle('a11y-reduce-motion', !!_prefs.reduceMotion);
    html.classList.toggle('a11y-dyslexia-font', !!_prefs.dyslexiaFont);
    html.classList.toggle('a11y-focus-indicators', !!_prefs.focusIndicators);
    html.classList.remove('a11y-spacing-wide', 'a11y-spacing-extra');
    if (_prefs.lineSpacing === 'wide') html.classList.add('a11y-spacing-wide');
    else if (_prefs.lineSpacing === 'extra') html.classList.add('a11y-spacing-extra');
    if (_trigger) {
      let hasChanges = false;
      for (var key in DEFAULTS) { if (DEFAULTS.hasOwnProperty(key) && _prefs[key] !== DEFAULTS[key]) { hasChanges = true; break; } }
      _trigger.classList.toggle('a11y-active', hasChanges);
    }
    updatePanelUI();
  }

  function createPanel() {
    _panel = document.createElement('div');
    _panel.className = 'a11y-panel';
    _panel.id = 'a11yPanel';
    _panel.setAttribute('role', 'dialog');
    _panel.setAttribute('aria-label', 'Accessibility preferences');
    _panel.setAttribute('aria-modal', 'false');
    _panel.innerHTML =
      '<div class="a11y-panel-header"><span class="a11y-panel-title"><span aria-hidden="true">\u2699\uFE0F</span> Accessibility</span><button class="a11y-panel-close" id="a11yClose" aria-label="Close accessibility panel">&times;</button></div>' +
      '<div class="a11y-panel-body">' +
      '<div class="a11y-group"><span class="a11y-group-label">Text Size</span><div class="a11y-segmented" id="a11yFontSize" role="radiogroup" aria-label="Text size"><button class="a11y-seg-btn" data-value="small" role="radio" aria-checked="false">A<span style="font-size:0.7em">\u2212</span></button><button class="a11y-seg-btn" data-value="medium" role="radio" aria-checked="false">A</button><button class="a11y-seg-btn" data-value="large" role="radio" aria-checked="false">A<span style="font-size:1.1em">+</span></button><button class="a11y-seg-btn" data-value="xlarge" role="radio" aria-checked="false">A<span style="font-size:1.3em">++</span></button></div></div>' +
      '<div class="a11y-group"><span class="a11y-group-label">Display</span>' +
      '<button class="a11y-toggle" id="a11yContrast" role="switch" aria-checked="false" aria-label="High contrast"><span class="a11y-toggle-text"><span class="a11y-toggle-icon" aria-hidden="true">\uD83D\uDD32</span> High contrast</span><span class="a11y-switch"></span></button>' +
      '<button class="a11y-toggle" id="a11yMotion" role="switch" aria-checked="false" aria-label="Reduce motion"><span class="a11y-toggle-text"><span class="a11y-toggle-icon" aria-hidden="true">\u23F8\uFE0F</span> Reduce motion</span><span class="a11y-switch"></span></button>' +
      '<button class="a11y-toggle" id="a11yDyslexia" role="switch" aria-checked="false" aria-label="Dyslexia-friendly font"><span class="a11y-toggle-text"><span class="a11y-toggle-icon" aria-hidden="true">\uD83D\uDD24</span> Dyslexia font</span><span class="a11y-switch"></span></button>' +
      '<button class="a11y-toggle" id="a11yFocus" role="switch" aria-checked="false" aria-label="Enhanced focus indicators"><span class="a11y-toggle-text"><span class="a11y-toggle-icon" aria-hidden="true">\uD83C\uDFAF</span> Focus indicators</span><span class="a11y-switch"></span></button></div>' +
      '<div class="a11y-group"><span class="a11y-group-label">Line Spacing</span><div class="a11y-segmented" id="a11ySpacing" role="radiogroup" aria-label="Line spacing"><button class="a11y-seg-btn" data-value="normal" role="radio" aria-checked="false">Normal</button><button class="a11y-seg-btn" data-value="wide" role="radio" aria-checked="false">Wide</button><button class="a11y-seg-btn" data-value="extra" role="radio" aria-checked="false">Extra</button></div></div>' +
      '<button class="a11y-reset" id="a11yReset" aria-label="Reset all accessibility preferences">\u21A9 Reset to defaults</button></div>';
    document.body.appendChild(_panel);
    _panel.querySelector('#a11yClose').addEventListener('click', close);
    const fontBtns = _panel.querySelectorAll('#a11yFontSize .a11y-seg-btn');
    for (var i = 0; i < fontBtns.length; i++) { fontBtns[i].addEventListener('click', function (e) { _prefs.fontSize = e.currentTarget.getAttribute('data-value'); save(); applyAll(); }); }
    _panel.querySelector('#a11yContrast').addEventListener('click', function () { _prefs.highContrast = !_prefs.highContrast; save(); applyAll(); });
    _panel.querySelector('#a11yMotion').addEventListener('click', function () { _prefs.reduceMotion = !_prefs.reduceMotion; save(); applyAll(); });
    _panel.querySelector('#a11yDyslexia').addEventListener('click', function () { _prefs.dyslexiaFont = !_prefs.dyslexiaFont; save(); applyAll(); });
    _panel.querySelector('#a11yFocus').addEventListener('click', function () { _prefs.focusIndicators = !_prefs.focusIndicators; save(); applyAll(); });
    const spaceBtns = _panel.querySelectorAll('#a11ySpacing .a11y-seg-btn');
    for (var j = 0; j < spaceBtns.length; j++) { spaceBtns[j].addEventListener('click', function (e) { _prefs.lineSpacing = e.currentTarget.getAttribute('data-value'); save(); applyAll(); }); }
    _panel.querySelector('#a11yReset').addEventListener('click', function () { for (var key in DEFAULTS) { if (DEFAULTS.hasOwnProperty(key)) _prefs[key] = DEFAULTS[key]; } save(); applyAll(); });
    _panel.addEventListener('keydown', function (e) { if (e.key === 'Escape') { e.stopPropagation(); close(); _trigger.focus(); } });
  }

  function updatePanelUI() {
    if (!_panel) return;
    const fontBtns = _panel.querySelectorAll('#a11yFontSize .a11y-seg-btn');
    for (var i = 0; i < fontBtns.length; i++) { var active = fontBtns[i].getAttribute('data-value') === _prefs.fontSize; fontBtns[i].classList.toggle('a11y-seg-active', active); fontBtns[i].setAttribute('aria-checked', active ? 'true' : 'false'); }
    const toggles = [{ id: 'a11yContrast', key: 'highContrast' }, { id: 'a11yMotion', key: 'reduceMotion' }, { id: 'a11yDyslexia', key: 'dyslexiaFont' }, { id: 'a11yFocus', key: 'focusIndicators' }];
    for (var j = 0; j < toggles.length; j++) { var el = _panel.querySelector('#' + toggles[j].id); if (el) el.setAttribute('aria-checked', _prefs[toggles[j].key] ? 'true' : 'false'); }
    const spaceBtns = _panel.querySelectorAll('#a11ySpacing .a11y-seg-btn');
    for (var k = 0; k < spaceBtns.length; k++) { var spActive = spaceBtns[k].getAttribute('data-value') === _prefs.lineSpacing; spaceBtns[k].classList.toggle('a11y-seg-active', spActive); spaceBtns[k].setAttribute('aria-checked', spActive ? 'true' : 'false'); }
  }

  function open() { if (!_panel) createPanel(); _isOpen = true; _panel.classList.add('a11y-panel-open'); _trigger.setAttribute('aria-expanded', 'true'); updatePanelUI(); var firstBtn = _panel.querySelector('.a11y-seg-btn, .a11y-toggle'); if (firstBtn) firstBtn.focus(); }
  function close() { _isOpen = false; if (_panel) _panel.classList.remove('a11y-panel-open'); if (_trigger) _trigger.setAttribute('aria-expanded', 'false'); }
  function toggle() { if (_isOpen) close(); else open(); }

  function init() {
    if (typeof document === 'undefined') return;
    _trigger = document.getElementById('a11yTrigger');
    if (!_trigger) return;
    _trigger.setAttribute('aria-expanded', 'false');
    _trigger.setAttribute('aria-controls', 'a11yPanel');
    _trigger.addEventListener('click', toggle);
    document.addEventListener('click', function (e) { if (_isOpen && _panel && !_panel.contains(e.target) && e.target !== _trigger && !_trigger.contains(e.target)) { close(); } });
    load(); applyAll();
  }

  function destroy() { close(); if (_panel && _panel.parentNode) _panel.parentNode.removeChild(_panel); _panel = null; _isOpen = false; var html = document.documentElement; html.classList.remove('a11y-font-large', 'a11y-font-xlarge', 'a11y-high-contrast', 'a11y-reduce-motion', 'a11y-dyslexia-font', 'a11y-focus-indicators', 'a11y-spacing-wide', 'a11y-spacing-extra'); if (_trigger) _trigger.classList.remove('a11y-active'); }
  function getPrefs() { var copy = {}; for (var key in _prefs) { if (_prefs.hasOwnProperty(key)) copy[key] = _prefs[key]; } return copy; }
  function isOpen() { return _isOpen; }

  return { init: init, open: open, close: close, toggle: toggle, destroy: destroy, getPrefs: getPrefs, isOpen: isOpen, DEFAULTS: DEFAULTS, STORAGE_KEY: STORAGE_KEY };
})();

if (typeof document !== 'undefined') { document.addEventListener('DOMContentLoaded', function () { AccessibilityPanel.init(); }); }
if (typeof window !== 'undefined') { window.AccessibilityPanel = AccessibilityPanel; }

/* ================================================================
   SUCCESS STORIES — Interactive case study cards with expandable
   problem → action → result flow and outcome metrics
   ================================================================ */
var SuccessStories = (function () {
  'use strict';

  const STORIES = [
    {
      id: 'story-freelancer',
      category: 'productivity',
      title: 'From 3 hours to 20 minutes: daily admin automated',
      persona: { name: 'Sarah K.', role: 'Freelance Designer', emoji: '🎨' },
      problem: 'Spent 3 hours every morning sorting emails, scheduling meetings, and updating project trackers before actual design work could start.',
      flow: [
        { type: 'problem', text: 'Sarah opens her laptop at 9 AM. She has 47 emails, 3 calendar conflicts, and overdue invoices. Design work waits until noon.' },
        { type: 'action', text: 'She tells AgentBox: "Check my morning — any fires?" The agent summarizes emails by priority, flags the calendar conflict, and drafts a follow-up for the overdue invoice.' },
        { type: 'result', text: 'By 9:20 she is designing. The agent handles the invoice reminder and reschedules the conflict. Total admin time: 20 minutes.' }
      ],
      metrics: [
        { value: '85%', label: 'less admin time' },
        { value: '2.5h', label: 'saved daily' },
        { value: '12', label: 'tasks automated' }
      ],
      highlight: { value: '85%', label: 'time saved' }
    },
    {
      id: 'story-dev-debugging',
      category: 'developer',
      title: 'Screenshot debugging: paste error, get fix',
      persona: { name: 'Marcus T.', role: 'Full-Stack Developer', emoji: '👨‍💻' },
      problem: 'Constantly context-switching between code editor and Stack Overflow to debug errors, losing flow state each time.',
      flow: [
        { type: 'problem', text: 'Marcus hits a cryptic CORS error in his React app. He has tried 3 Stack Overflow answers but none match his exact setup.' },
        { type: 'action', text: 'He screenshots the error and sends it to AgentBox. The agent reads the error, identifies the missing headers, and provides the exact nginx config fix.' },
        { type: 'result', text: 'Fixed in 2 minutes without leaving his editor. The agent remembers his stack (React + nginx + Docker) from previous conversations.' }
      ],
      metrics: [
        { value: '2min', label: 'to fix' },
        { value: '0', label: 'tabs opened' },
        { value: '100%', label: 'context retained' }
      ],
      highlight: { value: '2min', label: 'avg fix time' }
    },
    {
      id: 'story-content-creator',
      category: 'creative',
      title: 'Content calendar on autopilot',
      persona: { name: 'Priya M.', role: 'Content Creator', emoji: '✍️' },
      problem: 'Managing content across 4 platforms with different formats, schedules, and audiences. Always missing posting windows.',
      flow: [
        { type: 'problem', text: 'Priya has a great video idea but needs to plan the YouTube description, Twitter thread, Instagram caption, and LinkedIn post — each with different tone and format.' },
        { type: 'action', text: 'She describes the video concept to AgentBox and asks for cross-platform content. The agent generates all 4 versions, tailored to each platform\'s style, with relevant hashtags.' },
        { type: 'result', text: 'All content ready in 5 minutes. She sets up reminders for each platform\'s optimal posting time. Engagement up 40% from consistent posting.' }
      ],
      metrics: [
        { value: '4x', label: 'platforms covered' },
        { value: '40%', label: 'more engagement' },
        { value: '5min', label: 'content ready' }
      ],
      highlight: { value: '40%', label: 'engagement boost' }
    },
    {
      id: 'story-startup',
      category: 'business',
      title: 'Solo founder runs ops through Telegram',
      persona: { name: 'James L.', role: 'Startup Founder', emoji: '🚀' },
      problem: 'Running a 1-person startup with customer support, sales follow-ups, and market research eating into product development time.',
      flow: [
        { type: 'problem', text: 'James has 15 unanswered customer emails, 3 sales leads going cold, and a competitor just launched a new feature. He has 8 hours of coding planned.' },
        { type: 'action', text: 'He asks AgentBox to draft customer replies, summarize the competitor launch, and research the sales leads\' companies. Everything happens over Telegram between coding sessions.' },
        { type: 'result', text: 'All customer emails answered by lunch. Competitor analysis ready for the team meeting. Sales leads get personalized follow-ups. James codes for 6 uninterrupted hours.' }
      ],
      metrics: [
        { value: '6h', label: 'deep work' },
        { value: '15', label: 'emails handled' },
        { value: '$0', label: 'extra tools' }
      ],
      highlight: { value: '6h', label: 'focus time' }
    },
    {
      id: 'story-researcher',
      category: 'productivity',
      title: 'Literature review in 1 day instead of 2 weeks',
      persona: { name: 'Dr. Anika R.', role: 'PhD Researcher', emoji: '🔬' },
      problem: 'Needed to review 50+ papers for a grant proposal with a tight deadline. Manual reading and note-taking would take 2 weeks.',
      flow: [
        { type: 'problem', text: 'Anika has 53 papers to review for her grant proposal. The deadline is in 5 days and she has not started the literature review section.' },
        { type: 'action', text: 'She shares paper abstracts and key sections with AgentBox, asking for summaries, methodology comparisons, and gap analysis. The agent maintains context across all 53 papers.' },
        { type: 'result', text: 'Complete literature review draft in 1 day. The agent identified 3 research gaps she had missed. Proposal submitted 2 days early.' }
      ],
      metrics: [
        { value: '53', label: 'papers reviewed' },
        { value: '1 day', label: 'vs 2 weeks' },
        { value: '3', label: 'gaps found' }
      ],
      highlight: { value: '93%', label: 'time saved' }
    },
    {
      id: 'story-devops',
      category: 'developer',
      title: 'Incident response at 3 AM — from bed',
      persona: { name: 'Chen W.', role: 'DevOps Engineer', emoji: '🛠️' },
      problem: 'On-call alerts at odd hours require opening laptops, VPNing in, and running diagnostic commands. Response time suffers.',
      flow: [
        { type: 'problem', text: 'Chen gets a PagerDuty alert at 3 AM: API latency spike. Normally he would need to open his laptop, connect to VPN, and SSH into the monitoring stack.' },
        { type: 'action', text: 'He messages AgentBox from bed: "API latency alert — what do the last 30 min of metrics look like?" The agent searches his runbook and provides diagnostic steps with pre-formatted commands.' },
        { type: 'result', text: 'Root cause identified (database connection pool exhaustion) and fix command ready — all from his phone. Total time: 8 minutes. Back to sleep by 3:10 AM.' }
      ],
      metrics: [
        { value: '8min', label: 'to resolve' },
        { value: '0', label: 'laptops opened' },
        { value: '3AM', label: 'handled from bed' }
      ],
      highlight: { value: '8min', label: 'resolution' }
    }
  ];

  let _activeFilter = 'all';

  function init() {
    let grid = document.getElementById('storiesGrid');
    if (!grid) return;

    renderCards(grid);
    bindFilters();
  }

  function renderCards(grid) {
    grid.innerHTML = '';
    STORIES.forEach(function (story) {
      const card = document.createElement('div');
      card.className = 'story-card';
      card.setAttribute('role', 'listitem');
      card.setAttribute('data-category', story.category);
      card.setAttribute('data-id', story.id);
      card.setAttribute('tabindex', '0');
      card.setAttribute('aria-expanded', 'false');

      card.innerHTML =
        '<div class="story-card-header">' +
          '<span class="story-category-badge" data-cat="' + story.category + '">' + story.category + '</span>' +
          '<div class="story-card-title">' + escapeHtml(story.title) + '</div>' +
          '<div class="story-card-persona">' +
            '<span class="story-persona-avatar">' + story.persona.emoji + '</span>' +
            '<span>' + escapeHtml(story.persona.name) + ' · ' + escapeHtml(story.persona.role) + '</span>' +
          '</div>' +
        '</div>' +
        '<p class="story-card-problem">' + escapeHtml(story.problem) + '</p>' +
        '<div class="story-card-footer">' +
          '<div class="story-metric">' +
            '<span class="story-metric-value">' + escapeHtml(story.highlight.value) + '</span> ' +
            '<span class="story-metric-label">' + escapeHtml(story.highlight.label) + '</span>' +
          '</div>' +
          '<span class="story-expand-icon" aria-hidden="true">▼</span>' +
        '</div>' +
        '<div class="story-detail">' +
          '<div class="story-detail-inner">' +
            renderFlow(story.flow) +
            renderOutcomeStats(story.metrics) +
          '</div>' +
        '</div>';

      card.addEventListener('click', function () { toggleCard(card); });
      card.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleCard(card); }
      });

      grid.appendChild(card);
    });
  }

  function renderFlow(steps) {
    let html = '<div class="story-flow">';
    const icons = { problem: '❌', action: '🤖', result: '✅' };
    const dotClass = { problem: 'step-problem', action: 'step-action', result: 'step-result' };
    const labelClass = { problem: 'label-problem', action: 'label-action', result: 'label-result' };
    const labels = { problem: 'The Problem', action: 'AgentBox Steps In', result: 'The Result' };

    steps.forEach(function (step) {
      html +=
        '<div class="story-flow-step">' +
          '<div class="story-flow-dot ' + dotClass[step.type] + '">' + icons[step.type] + '</div>' +
          '<div class="story-flow-line"></div>' +
          '<div class="story-flow-content">' +
            '<div class="story-flow-label ' + labelClass[step.type] + '">' + labels[step.type] + '</div>' +
            '<div class="story-flow-text">' + escapeHtml(step.text) + '</div>' +
          '</div>' +
        '</div>';
    });
    html += '</div>';
    return html;
  }

  function renderOutcomeStats(metrics) {
    let html = '<div class="story-outcome-stats">';
    metrics.forEach(function (m) {
      html +=
        '<div class="story-outcome-stat">' +
          '<div class="story-outcome-number">' + escapeHtml(m.value) + '</div>' +
          '<div class="story-outcome-desc">' + escapeHtml(m.label) + '</div>' +
        '</div>';
    });
    html += '</div>';
    return html;
  }

  function toggleCard(card) {
    const expanded = card.classList.contains('story-expanded');
    // Close all others
    const cards = document.querySelectorAll('.story-card.story-expanded');
    for (var i = 0; i < cards.length; i++) {
      cards[i].classList.remove('story-expanded');
      cards[i].setAttribute('aria-expanded', 'false');
    }
    if (!expanded) {
      card.classList.add('story-expanded');
      card.setAttribute('aria-expanded', 'true');
    }
  }

  function bindFilters() {
    const buttons = document.querySelectorAll('.stories-filter');
    for (var i = 0; i < buttons.length; i++) {
      buttons[i].addEventListener('click', function () {
        let cat = this.getAttribute('data-category');
        _activeFilter = cat;

        // Update active state
        const all = document.querySelectorAll('.stories-filter');
        for (var j = 0; j < all.length; j++) {
          all[j].classList.remove('active');
          all[j].setAttribute('aria-selected', 'false');
        }
        this.classList.add('active');
        this.setAttribute('aria-selected', 'true');

        filterCards(cat);
      });
    }
  }

  function filterCards(category) {
    const cards = document.querySelectorAll('.story-card');
    for (var i = 0; i < cards.length; i++) {
      const cardCat = cards[i].getAttribute('data-category');
      if (category === 'all' || cardCat === category) {
        cards[i].classList.remove('story-hidden');
      } else {
        cards[i].classList.add('story-hidden');
        cards[i].classList.remove('story-expanded');
        cards[i].setAttribute('aria-expanded', 'false');
      }
    }
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
  }

  function getStories() { return STORIES.slice(); }
  function getActiveFilter() { return _activeFilter; }

  return { init: init, getStories: getStories, getActiveFilter: getActiveFilter, STORIES: STORIES };
})();

if (typeof document !== 'undefined') { document.addEventListener('DOMContentLoaded', function () { SuccessStories.init(); }); }
if (typeof window !== 'undefined') { window.SuccessStories = SuccessStories; }

// ═══════════════════════════════════════════════════════════════════════
//  Feature Request Board – vote on features, suggest new ones
// ═══════════════════════════════════════════════════════════════════════

var FeatureBoard = (function () {
  "use strict";

  const STORAGE_KEY = "agentbox_feature_votes";
  const CUSTOM_KEY  = "agentbox_feature_custom";

  // ── Seed features ──────────────────────────────────────────────
  const SEED_FEATURES = [
    {
      id: "calendar-sync",
      title: "Google Calendar integration",
      description: "Automatically sync events and get proactive reminders before meetings.",
      category: "integration",
      status: "planned",
      votes: 127,
      createdAt: "2026-02-15"
    },
    {
      id: "voice-messages",
      title: "Voice message support",
      description: "Send and receive voice messages — AgentBox transcribes and responds.",
      category: "feature",
      status: "building",
      votes: 98,
      createdAt: "2026-02-20"
    },
    {
      id: "dark-mode",
      title: "Dark mode for web dashboard",
      description: "A proper dark theme for late-night productivity sessions.",
      category: "ux",
      status: "planned",
      votes: 86,
      createdAt: "2026-01-28"
    },
    {
      id: "whatsapp-support",
      title: "WhatsApp channel",
      description: "Use AgentBox directly in WhatsApp, not just Telegram.",
      category: "platform",
      status: "new",
      votes: 154,
      createdAt: "2026-03-01"
    },
    {
      id: "file-upload",
      title: "Upload & analyze documents",
      description: "Send PDFs, spreadsheets, or images for AgentBox to analyze and summarize.",
      category: "feature",
      status: "building",
      votes: 112,
      createdAt: "2026-02-10"
    },
    {
      id: "slack-integration",
      title: "Slack workspace integration",
      description: "Add AgentBox as a Slack bot for team-wide access.",
      category: "integration",
      status: "new",
      votes: 73,
      createdAt: "2026-03-05"
    },
    {
      id: "memory-export",
      title: "Export conversation history",
      description: "Download your full conversation history as JSON or PDF.",
      category: "feature",
      status: "shipped",
      votes: 64,
      createdAt: "2026-01-20"
    },
    {
      id: "widgets",
      title: "Home screen widgets",
      description: "Quick-access widgets for iOS and Android to send messages without opening Telegram.",
      category: "platform",
      status: "new",
      votes: 91,
      createdAt: "2026-03-03"
    },
    {
      id: "custom-personas",
      title: "Custom agent personas",
      description: "Create named personas with different tones and specializations.",
      category: "feature",
      status: "planned",
      votes: 79,
      createdAt: "2026-02-25"
    },
    {
      id: "task-automation",
      title: "Scheduled recurring tasks",
      description: "Set up daily/weekly automated tasks — reports, summaries, check-ins.",
      category: "feature",
      status: "shipped",
      votes: 143,
      createdAt: "2026-01-15"
    },
    {
      id: "multi-language",
      title: "Multi-language UI",
      description: "Support for Spanish, French, German, Japanese, and more.",
      category: "ux",
      status: "new",
      votes: 56,
      createdAt: "2026-03-06"
    },
    {
      id: "api-access",
      title: "Public REST API",
      description: "Programmatic access to AgentBox for developers building integrations.",
      category: "integration",
      status: "planned",
      votes: 68,
      createdAt: "2026-02-18"
    }
  ];

  let allFeatures = [];
  let userVotes = {};
  let activeFilter = "all";

  // ── Persistence ────────────────────────────────────────────────
  function loadVotes() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (e) { return {}; }
  }
  function saveVotes() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(userVotes)); } catch (e) { /* noop */ }
  }
  function loadCustom() {
    try {
      const raw = localStorage.getItem(CUSTOM_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) { return []; }
  }
  function saveCustom(customs) {
    try { localStorage.setItem(CUSTOM_KEY, JSON.stringify(customs)); } catch (e) { /* noop */ }
  }

  // ── Status helpers ─────────────────────────────────────────────
  const STATUS_BADGES = {
    planned:  { label: "Planned",  cls: "fb-badge-planned"  },
    building: { label: "Building", cls: "fb-badge-building" },
    shipped:  { label: "Shipped",  cls: "fb-badge-shipped"  },
    "new":    { label: "New",      cls: "fb-badge-new"      }
  };

  const CATEGORY_ICONS = {
    integration: "🔗",
    feature:     "⚡",
    ux:          "🎨",
    platform:    "📱"
  };

  // ── Rendering ──────────────────────────────────────────────────
  function buildCard(feat) {
    const card = document.createElement("div");
    card.className = "fb-card";
    card.setAttribute("role", "listitem");
    card.setAttribute("data-id", feat.id);

    const voteCount = feat.votes + (userVotes[feat.id] ? 1 : 0);
    const votedClass = userVotes[feat.id] ? " voted" : "";

    const badge = STATUS_BADGES[feat.status] || STATUS_BADGES["new"];
    const catIcon = CATEGORY_ICONS[feat.category] || "⚡";

    card.innerHTML =
      '<button class="fb-vote-btn' + votedClass + '" aria-label="Vote for ' + escapeHtml(feat.title) + '" data-id="' + feat.id + '">' +
        '<span class="fb-vote-arrow">▲</span>' +
        '<span class="fb-vote-count">' + voteCount + '</span>' +
      '</button>' +
      '<div class="fb-card-body">' +
        '<div class="fb-card-header">' +
          '<span class="fb-card-title">' + escapeHtml(feat.title) + '</span>' +
          '<span class="fb-card-badge ' + badge.cls + '">' + badge.label + '</span>' +
        '</div>' +
        (feat.description ? '<div class="fb-card-desc">' + escapeHtml(feat.description) + '</div>' : '') +
        '<div class="fb-card-meta">' +
          '<span class="fb-category-tag">' + catIcon + ' ' + escapeHtml(feat.category) + '</span>' +
          '<span>' + formatDate(feat.createdAt) + '</span>' +
        '</div>' +
      '</div>';

    const voteBtn = card.querySelector(".fb-vote-btn");
    voteBtn.addEventListener("click", function () { toggleVote(feat.id); });
    return card;
  }

  function render() {
    const list = document.getElementById("featureBoardList");
    if (!list) return;
    list.innerHTML = "";

    let filtered = getFiltered();
    // Sort: most votes first
    filtered.sort(function (a, b) {
      const va = a.votes + (userVotes[a.id] ? 1 : 0);
      const vb = b.votes + (userVotes[b.id] ? 1 : 0);
      return vb - va;
    });

    for (var i = 0; i < filtered.length; i++) {
      list.appendChild(buildCard(filtered[i]));
    }
  }

  function getFiltered() {
    if (activeFilter === "all") return allFeatures.slice();
    if (activeFilter === "popular") {
      return allFeatures.slice().sort(function (a, b) {
        var va = a.votes + (userVotes[a.id] ? 1 : 0);
        var vb = b.votes + (userVotes[b.id] ? 1 : 0);
        return vb - va;
      }).slice(0, 6);
    }
    if (activeFilter === "new") {
      return allFeatures.filter(function (f) { return f.status === "new"; });
    }
    if (activeFilter === "planned") {
      return allFeatures.filter(function (f) { return f.status === "planned" || f.status === "building"; });
    }
    return allFeatures.slice();
  }

  // ── Voting ─────────────────────────────────────────────────────
  function toggleVote(id) {
    if (userVotes[id]) {
      delete userVotes[id];
    } else {
      userVotes[id] = true;
    }
    saveVotes();
    render();
  }

  // ── Suggest form ───────────────────────────────────────────────
  function openSuggestForm() {
    const form = document.getElementById("fbSuggestForm");
    if (form) form.hidden = false;
  }
  function closeSuggestForm() {
    const form = document.getElementById("fbSuggestForm");
    if (form) form.hidden = true;
  }
  function submitSuggestion() {
    const titleEl = document.getElementById("fbFormTitle");
    const descEl  = document.getElementById("fbFormDesc");
    const catEl   = document.getElementById("fbFormCategory");
    if (!titleEl) return;

    const title = titleEl.value.trim();
    if (!title) {
      titleEl.focus();
      return;
    }

    const newFeat = {
      id: "custom-" + Date.now(),
      title: title,
      description: descEl ? descEl.value.trim() : "",
      category: catEl ? catEl.value : "feature",
      status: "new",
      votes: 1,
      createdAt: new Date().toISOString().slice(0, 10)
    };

    allFeatures.unshift(newFeat);
    userVotes[newFeat.id] = true;
    saveVotes();

    // Persist custom features
    const customs = loadCustom();
    customs.push(newFeat);
    saveCustom(customs);

    // Reset form
    titleEl.value = "";
    if (descEl) descEl.value = "";
    closeSuggestForm();
    activeFilter = "all";
    updateFilterButtons();
    render();
    showToast("Thanks! Your idea has been added 🎉");
  }

  // ── Filters ────────────────────────────────────────────────────
  function updateFilterButtons() {
    const buttons = document.querySelectorAll(".fb-filter");
    for (var i = 0; i < buttons.length; i++) {
      const b = buttons[i];
      let isActive = b.getAttribute("data-filter") === activeFilter;
      b.classList.toggle("active", isActive);
      b.setAttribute("aria-pressed", isActive ? "true" : "false");
    }
  }

  // ── Toast ──────────────────────────────────────────────────────
  function showToast(msg) {
    let toast = document.getElementById("fbToast");
    if (!toast) return;
    toast.textContent = msg;
    toast.hidden = false;
    clearTimeout(toast._timer);
    toast._timer = setTimeout(function () { toast.hidden = true; }, 3000);
  }

  // ── Helpers ────────────────────────────────────────────────────
  function escapeHtml(str) {
    const d = document.createElement("div");
    d.textContent = str;
    return d.innerHTML;
  }

  function formatDate(dateStr) {
    try {
      const d = new Date(dateStr + "T00:00:00");
      return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    } catch (e) { return dateStr; }
  }

  // ── Init ───────────────────────────────────────────────────────
  function init() {
    userVotes = loadVotes();

    // Merge seed + custom features
    allFeatures = SEED_FEATURES.slice();
    const customs = loadCustom();
    for (var i = 0; i < customs.length; i++) {
      // Avoid duplicates
      let exists = false;
      for (var j = 0; j < allFeatures.length; j++) {
        if (allFeatures[j].id === customs[i].id) { exists = true; break; }
      }
      if (!exists) allFeatures.push(customs[i]);
    }

    // Filter buttons
    let filterBtns = document.querySelectorAll(".fb-filter");
    for (var fi = 0; fi < filterBtns.length; fi++) {
      filterBtns[fi].addEventListener("click", function () {
        activeFilter = this.getAttribute("data-filter");
        updateFilterButtons();
        render();
      });
    }

    // Suggest button
    const suggestBtn = document.getElementById("fbSuggestBtn");
    if (suggestBtn) suggestBtn.addEventListener("click", openSuggestForm);

    // Form controls
    let closeBtn  = document.getElementById("fbFormClose");
    const backdrop  = document.getElementById("fbFormBackdrop");
    const submitBtn = document.getElementById("fbFormSubmit");
    if (closeBtn) closeBtn.addEventListener("click", closeSuggestForm);
    if (backdrop) backdrop.addEventListener("click", closeSuggestForm);
    if (submitBtn) submitBtn.addEventListener("click", submitSuggestion);

    // Enter key submits
    const titleInput = document.getElementById("fbFormTitle");
    if (titleInput) {
      titleInput.addEventListener("keydown", function (e) {
        if (e.key === "Enter") { e.preventDefault(); submitSuggestion(); }
      });
    }

    render();
  }

  // ── Public API ─────────────────────────────────────────────────
  return {
    init: init,
    getFeatures: function () { return allFeatures.slice(); },
    getVotes: function () { return Object.assign({}, userVotes); },
    getFilter: function () { return activeFilter; }
  };
})();

if (typeof document !== 'undefined') { document.addEventListener('DOMContentLoaded', function () { FeatureBoard.init(); }); }
if (typeof window !== 'undefined') { window.FeatureBoard = FeatureBoard; }

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

if (typeof document !== 'undefined') { document.addEventListener('DOMContentLoaded', function () { AIGlossary.init(); }); }
if (typeof window !== 'undefined') { window.AIGlossary = AIGlossary; }


/* ────────── Integration Pipeline Builder ────────── */
var PipelineBuilder = (function () {
  'use strict';

  var INTEGRATIONS = [
    { id: 'gmail',    name: 'Gmail',       icon: '📧', category: 'communication', desc: 'Read, draft, and send emails' },
    { id: 'slack',    name: 'Slack',       icon: '💬', category: 'communication', desc: 'Send messages and monitor channels' },
    { id: 'calendar', name: 'Calendar',    icon: '📅', category: 'productivity',  desc: 'Create events and check schedule' },
    { id: 'notion',   name: 'Notion',      icon: '📝', category: 'productivity',  desc: 'Update pages and databases' },
    { id: 'github',   name: 'GitHub',      icon: '🐙', category: 'developer',     desc: 'Manage issues, PRs, and repos' },
    { id: 'jira',     name: 'Jira',        icon: '🎫', category: 'developer',     desc: 'Track and update tickets' },
    { id: 'sheets',   name: 'Google Sheets',icon: '📊', category: 'data',         desc: 'Read and update spreadsheets' },
    { id: 'drive',    name: 'Google Drive', icon: '📁', category: 'data',         desc: 'Search and organize files' },
    { id: 'twitter',  name: 'Twitter/X',   icon: '🐦', category: 'social',       desc: 'Post tweets and monitor mentions' },
    { id: 'linear',   name: 'Linear',      icon: '🔷', category: 'developer',     desc: 'Create and track issues' },
    { id: 'discord',  name: 'Discord',     icon: '🎮', category: 'communication', desc: 'Send messages and manage servers' },
    { id: 'telegram', name: 'Telegram',    icon: '✈️', category: 'communication', desc: 'Chat and manage bot commands' }
  ];

  var PIPELINES = {
    'gmail+calendar':          { name: 'Email → Meeting', flow: 'AgentBox reads your emails, detects meeting requests, and creates calendar events automatically.' },
    'gmail+slack':             { name: 'Email → Notify', flow: 'AgentBox monitors your inbox and sends Slack alerts for important emails.' },
    'gmail+notion':            { name: 'Email → Notes', flow: 'AgentBox extracts action items from emails and creates Notion tasks.' },
    'github+slack':            { name: 'Code → Notify', flow: 'AgentBox watches your repos for new PRs and issues, then posts summaries to Slack.' },
    'github+jira':             { name: 'Code → Tickets', flow: 'AgentBox syncs GitHub issues with Jira tickets and updates statuses.' },
    'github+linear':           { name: 'Code → Track', flow: 'AgentBox creates Linear issues from GitHub activity and keeps them in sync.' },
    'calendar+slack':          { name: 'Schedule → Notify', flow: 'AgentBox sends Slack reminders before meetings and daily schedule summaries.' },
    'calendar+notion':         { name: 'Schedule → Plan', flow: 'AgentBox creates Notion daily pages with your calendar events and prep notes.' },
    'sheets+slack':            { name: 'Data → Alert', flow: 'AgentBox monitors spreadsheet changes and sends threshold alerts to Slack.' },
    'sheets+gmail':            { name: 'Data → Report', flow: 'AgentBox generates weekly email reports from your spreadsheet data.' },
    'drive+slack':             { name: 'Files → Share', flow: 'AgentBox watches Drive folders and notifies Slack when new files arrive.' },
    'twitter+slack':           { name: 'Social → Monitor', flow: 'AgentBox tracks mentions and keywords, sending real-time Slack digests.' },
    'twitter+notion':          { name: 'Social → Archive', flow: 'AgentBox archives important tweets and threads into your Notion database.' },
    'discord+github':          { name: 'Community → Code', flow: 'AgentBox creates GitHub issues from Discord bug reports and feature requests.' },
    'telegram+calendar':       { name: 'Chat → Schedule', flow: 'AgentBox lets you manage your calendar via natural language in Telegram.' },
    'jira+slack':              { name: 'Tickets → Updates', flow: 'AgentBox posts Jira status changes and sprint progress to Slack channels.' },
    'notion+slack':            { name: 'Docs → Sync', flow: 'AgentBox notifies your team on Slack when Notion docs are updated.' },
    'gmail+sheets':            { name: 'Email → Data', flow: 'AgentBox extracts data from incoming emails and logs it into spreadsheets.' }
  };

  var selected = [];
  var _section = null;

  function section() {
    if (!_section) _section = document.getElementById('pipelineSection');
    return _section;
  }

  function init() {
    if (!section()) return;
    renderToolGrid();
    updatePipeline();
  }

  function renderToolGrid() {
    var grid = section().querySelector('.pipeline-tool-grid');
    if (!grid) return;
    grid.innerHTML = '';
    INTEGRATIONS.forEach(function (tool) {
      var btn = document.createElement('button');
      btn.className = 'pipeline-tool-btn';
      btn.setAttribute('data-tool', tool.id);
      btn.setAttribute('aria-pressed', 'false');
      btn.setAttribute('role', 'switch');
      btn.setAttribute('aria-label', 'Add ' + tool.name + ' to pipeline');
      btn.setAttribute('title', tool.desc);
      btn.innerHTML = '<span class="pipeline-tool-icon">' + tool.icon +
        '</span><span class="pipeline-tool-name">' + tool.name + '</span>';
      btn.addEventListener('click', function () { toggleTool(tool.id); });
      grid.appendChild(btn);
    });
  }

  function toggleTool(id) {
    var idx = selected.indexOf(id);
    if (idx >= 0) {
      selected.splice(idx, 1);
    } else {
      if (selected.length >= 5) return; // max 5 tools
      selected.push(id);
    }
    updateToolStates();
    updatePipeline();
  }

  function updateToolStates() {
    if (!section()) return;
    var btns = section().querySelectorAll('.pipeline-tool-btn');
    for (var i = 0; i < btns.length; i++) {
      var toolId = btns[i].getAttribute('data-tool');
      var isSelected = selected.indexOf(toolId) >= 0;
      btns[i].classList.toggle('selected', isSelected);
      btns[i].setAttribute('aria-pressed', isSelected ? 'true' : 'false');
    }
  }

  function updatePipeline() {
    var viz = section().querySelector('.pipeline-visualization');
    var desc = section().querySelector('.pipeline-description');
    var counter = section().querySelector('.pipeline-counter');
    if (!viz || !desc) return;

    if (counter) counter.textContent = selected.length + ' / 5 tools selected';

    if (selected.length === 0) {
      viz.innerHTML = '<p class="pipeline-empty">Select tools above to build your agent pipeline</p>';
      desc.innerHTML = '';
      return;
    }

    // Build visual pipeline
    var html = '<div class="pipeline-flow">';
    for (var i = 0; i < selected.length; i++) {
      var tool = findTool(selected[i]);
      if (!tool) continue;
      html += '<div class="pipeline-node">';
      html += '<span class="pipeline-node-icon">' + tool.icon + '</span>';
      html += '<span class="pipeline-node-name">' + tool.name + '</span>';
      html += '</div>';
      if (i < selected.length - 1) {
        html += '<div class="pipeline-arrow" aria-hidden="true">→</div>';
      }
    }
    html += '</div>';

    // AgentBox hub in center
    html += '<div class="pipeline-hub">';
    html += '<span class="pipeline-hub-icon">🤖</span>';
    html += '<span class="pipeline-hub-label">AgentBox</span>';
    html += '<span class="pipeline-hub-sub">connects everything</span>';
    html += '</div>';

    viz.innerHTML = html;

    // Find matching pipelines
    var matches = findPipelines();
    if (matches.length === 0) {
      desc.innerHTML = '<div class="pipeline-result"><p class="pipeline-generic">AgentBox can connect these tools and automate workflows between them. Add more tools to see specific pipeline recipes!</p></div>';
    } else {
      var descHtml = '<div class="pipeline-results-list">';
      descHtml += '<h4 class="pipeline-results-title">🔗 ' + matches.length + ' automation' + (matches.length > 1 ? 's' : '') + ' available</h4>';
      for (var m = 0; m < matches.length; m++) {
        descHtml += '<div class="pipeline-result-card">';
        descHtml += '<strong class="pipeline-result-name">' + matches[m].name + '</strong>';
        descHtml += '<p class="pipeline-result-flow">' + matches[m].flow + '</p>';
        descHtml += '</div>';
      }
      descHtml += '</div>';
      desc.innerHTML = descHtml;
    }
  }

  function findTool(id) {
    for (var i = 0; i < INTEGRATIONS.length; i++) {
      if (INTEGRATIONS[i].id === id) return INTEGRATIONS[i];
    }
    return null;
  }

  function findPipelines() {
    var matches = [];
    var keys = Object.keys(PIPELINES);
    for (var k = 0; k < keys.length; k++) {
      var parts = keys[k].split('+');
      var allPresent = true;
      for (var p = 0; p < parts.length; p++) {
        if (selected.indexOf(parts[p]) < 0) { allPresent = false; break; }
      }
      if (allPresent) matches.push(PIPELINES[keys[k]]);
    }
    return matches;
  }

  function clearAll() {
    selected = [];
    updateToolStates();
    updatePipeline();
  }

  return {
    init: init,
    toggle: toggleTool,
    clear: clearAll,
    getSelected: function () { return selected.slice(); },
    getIntegrations: function () { return INTEGRATIONS.slice(); },
    getPipelines: function () { return Object.assign({}, PIPELINES); }
  };
})();

if (typeof document !== 'undefined') { document.addEventListener('DOMContentLoaded', function () { PipelineBuilder.init(); }); }
if (typeof window !== 'undefined') { window.PipelineBuilder = PipelineBuilder; }
