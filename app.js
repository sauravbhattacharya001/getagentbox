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
// Integrations Module - category filtering for integrations grid
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

    // Collapse all cards first.
    document.querySelectorAll('.trust-card.expanded').forEach(function (c) {
      c.classList.remove('expanded');
      var d = c.querySelector('.trust-detail');
      if (d) d.hidden = true;
    });

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
      return data ? JSON.parse(data) : [];
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

  function init() {
    var container = document.getElementById('roadmapSection');
    if (!container) return;

    restoreVotes();

    var filterBtns = container.querySelectorAll('.roadmap-filter-btn');
    for (var i = 0; i < filterBtns.length; i++) {
      filterBtns[i].addEventListener('click', function (e) {
        var status = e.currentTarget.getAttribute('data-status');
        filterBy(status);
      });
    }

    var grid = document.getElementById('roadmapGrid');
    if (grid) {
      grid.addEventListener('click', function (e) {
        var btn = e.target.closest('.roadmap-vote-btn');
        if (!btn) return;
        toggleVote(btn);
      });
    }

    container.addEventListener('keydown', function (e) {
      if (e.target.className.indexOf('roadmap-filter-btn') === -1) return;
      var btns = Array.prototype.slice.call(
        container.querySelectorAll('.roadmap-filter-btn')
      );
      var idx = btns.indexOf(e.target);
      if (idx === -1) return;

      var next = -1;
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        next = (idx + 1) % btns.length;
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        next = (idx - 1 + btns.length) % btns.length;
      } else if (e.key === 'Home') {
        next = 0;
      } else if (e.key === 'End') {
        next = btns.length - 1;
      }

      if (next >= 0) {
        e.preventDefault();
        btns[next].focus();
        btns[next].click();
      }
    });
  }

  function filterBy(status) {
    currentFilter = status || 'all';
    var container = document.getElementById('roadmapSection');
    if (!container) return;

    var filterBtns = container.querySelectorAll('.roadmap-filter-btn');
    for (var i = 0; i < filterBtns.length; i++) {
      var isActive =
        filterBtns[i].getAttribute('data-status') === currentFilter;
      filterBtns[i].classList.toggle('active', isActive);
      filterBtns[i].setAttribute(
        'aria-selected',
        isActive ? 'true' : 'false'
      );
    }

    var cards = container.querySelectorAll('.roadmap-card');
    for (var j = 0; j < cards.length; j++) {
      var cardStatus = cards[j].getAttribute('data-status');
      var visible = currentFilter === 'all' || cardStatus === currentFilter;
      cards[j].setAttribute('data-hidden', visible ? 'false' : 'true');
    }

    var summaryItems = container.querySelectorAll('.roadmap-summary-item');
    for (var k = 0; k < summaryItems.length; k++) {
      var itemStatus = summaryItems[k].getAttribute('data-status');
      var highlighted =
        currentFilter === 'all' || itemStatus === currentFilter;
      summaryItems[k].style.opacity = highlighted ? '1' : '0.4';
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
    var grid = document.getElementById('roadmapGrid');
    if (!grid) return [];
    return Array.prototype.slice.call(grid.querySelectorAll('.roadmap-card'));
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
    var votes = {};
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
      var data = {};
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
      var data = JSON.parse(raw);
      var cards = getCards();
      for (var i = 0; i < cards.length; i++) {
        var h3 = cards[i].querySelector('h3');
        if (!h3 || !data[h3.textContent]) continue;
        var entry = data[h3.textContent];
        var countEl = cards[i].querySelector('.roadmap-vote-count');
        var btn = cards[i].querySelector('.roadmap-vote-btn');
        if (countEl) countEl.textContent = String(entry.count);
        if (btn && entry.voted) {
          btn.classList.add('voted');
          btn.setAttribute('aria-pressed', 'true');
        }
      }
    } catch (_) {
      /* localStorage unavailable */
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

  function init() {
    updateOverall();
  }

  function getServices() {
    var grid = document.getElementById('statusGrid');
    if (!grid) return [];
    return Array.prototype.slice.call(
      grid.querySelectorAll('.status-service')
    );
  }

  function getIncidents() {
    var container = document.getElementById('statusIncidents');
    if (!container) return [];
    return Array.prototype.slice.call(
      container.querySelectorAll('.status-incident')
    );
  }

  function getServiceStatus(serviceName) {
    var services = getServices();
    for (var i = 0; i < services.length; i++) {
      if (services[i].getAttribute('data-service') === serviceName) {
        return services[i].getAttribute('data-status');
      }
    }
    return null;
  }

  function getServiceUptime(serviceName) {
    var services = getServices();
    for (var i = 0; i < services.length; i++) {
      if (services[i].getAttribute('data-service') === serviceName) {
        var el = services[i].querySelector('.status-uptime');
        if (!el) return null;
        return parseFloat(el.textContent);
      }
    }
    return null;
  }

  function setServiceStatus(serviceName, status) {
    var services = getServices();
    for (var i = 0; i < services.length; i++) {
      if (services[i].getAttribute('data-service') === serviceName) {
        services[i].setAttribute('data-status', status);
        var dot = services[i].querySelector('.status-dot');
        if (dot) {
          dot.className = 'status-dot ' + status;
        }
        break;
      }
    }
    updateOverall();
  }

  function setServiceUptime(serviceName, uptime) {
    var services = getServices();
    for (var i = 0; i < services.length; i++) {
      if (services[i].getAttribute('data-service') === serviceName) {
        var el = services[i].querySelector('.status-uptime');
        if (el) el.textContent = uptime.toFixed(2) + '%';
        var bar = services[i].querySelector('.status-bar-fill');
        if (bar) bar.style.width = Math.min(100, Math.max(0, uptime)) + '%';
        var meter = services[i].querySelector('.status-bar');
        if (meter) meter.setAttribute('aria-valuenow', String(uptime));
        break;
      }
    }
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

    var overall = document.getElementById('statusOverall');
    if (!overall) return;

    var dot = overall.querySelector('.status-dot');
    var text = overall.querySelector('.status-overall-text');
    if (dot) dot.className = 'status-dot ' + worst;

    var messages = {
      operational: 'All systems operational',
      degraded: 'Some systems degraded',
      outage: 'System outage detected'
    };
    if (text) text.textContent = messages[worst] || worst;
  }

  function getOverallStatus() {
    var overall = document.getElementById('statusOverall');
    if (!overall) return null;
    var dot = overall.querySelector('.status-dot');
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
  window.Roadmap = Roadmap;
  window.StatusDashboard = StatusDashboard;
  window.SiteNav = SiteNav;
  window.Newsletter = Newsletter;
  window.Calculator = Calculator;
}


// ---------------------------------------------------------------------------
// Time Saved Calculator Module
// ---------------------------------------------------------------------------

var Calculator = (function () {
  function init() {
    var section = document.getElementById('calculatorSection');
    if (!section) return;

    var sliders = section.querySelectorAll('.calc-range');
    for (var i = 0; i < sliders.length; i++) {
      sliders[i].addEventListener('input', update);
    }
    update();
  }

  function update() {
    var section = document.getElementById('calculatorSection');
    if (!section) return;

    var groups = section.querySelectorAll('.calc-slider-group');
    var totalMinutes = 0;

    for (var i = 0; i < groups.length; i++) {
      var slider = groups[i].querySelector('.calc-range');
      var valueEl = groups[i].querySelector('.calc-slider-value');
      var minutesPer = parseInt(groups[i].dataset.minutes, 10) || 0;
      var count = parseInt(slider.value, 10) || 0;

      if (valueEl) valueEl.textContent = count + ' /week';
      totalMinutes += count * minutesPer;
    }

    var weeklyEl = document.getElementById('calcWeekly');
    var monthlyEl = document.getElementById('calcMonthly');
    var yearlyEl = document.getElementById('calcYearly');
    var equivEl = document.getElementById('calcEquivalent');

    if (weeklyEl) weeklyEl.textContent = totalMinutes;

    var monthlyHours = (totalMinutes * 4.33 / 60);
    if (monthlyEl) monthlyEl.textContent = monthlyHours < 10 ? monthlyHours.toFixed(1) : Math.round(monthlyHours);

    var yearlyHours = (totalMinutes * 52 / 60);
    if (yearlyEl) yearlyEl.textContent = Math.round(yearlyHours);

    if (equivEl) {
      var workdays = (yearlyHours / 8).toFixed(1);
      if (yearlyHours === 0) {
        equivEl.innerHTML = 'Move the sliders to see your potential time savings ☝️';
      } else if (yearlyHours < 8) {
        equivEl.innerHTML = 'That\'s <strong>' + Math.round(yearlyHours) + ' hours</strong> back every year — time for what matters ✨';
      } else {
        equivEl.innerHTML = 'That\'s like getting <strong>' + workdays + ' extra workdays</strong> back every year ✨';
      }
    }
  }

  function getTotal() {
    var section = document.getElementById('calculatorSection');
    if (!section) return 0;
    var weeklyEl = document.getElementById('calcWeekly');
    return weeklyEl ? parseInt(weeklyEl.textContent, 10) || 0 : 0;
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

  function init() {
    overlay = document.getElementById('cmdPaletteOverlay');
    input = document.getElementById('cmdPaletteInput');
    results = document.getElementById('cmdPaletteResults');
    if (!overlay || !input || !results) return;

    document.addEventListener('keydown', function (e) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        toggle();
      }
      if (e.key === 'Escape' && !overlay.hidden) {
        close();
      }
    });

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

  function render() {
    results.innerHTML = '';
    filtered.forEach(function (s, i) {
      var li = document.createElement('li');
      li.className = 'cmd-palette-item';
      li.setAttribute('role', 'option');
      if (i === selectedIndex) li.setAttribute('aria-selected', 'true');

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
        selectedIndex = i;
        go();
      });
      results.appendChild(li);
    });
  }

  function move(dir) {
    if (!filtered.length) return;
    selectedIndex = (selectedIndex + dir + filtered.length) % filtered.length;
    render();
    var sel = results.querySelector('[aria-selected="true"]');
    if (sel) sel.scrollIntoView({ block: 'nearest' });
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

  return { init: init, open: open, close: close };
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
      icon.textContent = '🌙';
    }

    btn.addEventListener('click', toggle);
  }

  function toggle() {
    var isLight = document.body.classList.toggle('light-mode');
    icon.textContent = isLight ? '🌙' : '☀️';
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

  function findResponse(text) {
    var lower = text.toLowerCase().replace(/[^\w\s]/g, '');
    for (var i = 0; i < responses.length; i++) {
      for (var j = 0; j < responses[i].patterns.length; j++) {
        if (lower.indexOf(responses[i].patterns[j]) !== -1) {
          return responses[i].reply;
        }
      }
    }
    var fb = fallbacks[fallbackIdx % fallbacks.length];
    fallbackIdx++;
    return fb;
  }

  function addBubble(role, text) {
    var bubble = document.createElement('div');
    bubble.className = 'chat-bubble ' + role;
    bubble.textContent = text;
    messagesEl.appendChild(bubble);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function addTyping() {
    var el = document.createElement('div');
    el.className = 'typing-indicator';
    el.innerHTML = '<span></span><span></span><span></span>';
    el.id = 'playgroundTyping';
    messagesEl.appendChild(el);
    messagesEl.scrollTop = messagesEl.scrollHeight;
    return el;
  }

  function handleSubmit(e) {
    e.preventDefault();
    var text = inputEl.value.trim();
    if (!text) return;

    addBubble('user', text);
    inputEl.value = '';

    var reply = findResponse(text);
    var typing = addTyping();
    var delay = prefersReducedMotion ? 200 : 800 + Math.min(reply.length * 5, 1200);

    setTimeout(function () {
      if (typing.parentNode) typing.parentNode.removeChild(typing);
      addBubble('bot', reply);
    }, delay);
  }

  function init() {
    formEl = document.getElementById('playgroundForm');
    inputEl = document.getElementById('playgroundInput');
    messagesEl = document.getElementById('playgroundMessages');
    if (!formEl || !inputEl || !messagesEl) return;
    formEl.addEventListener('submit', handleSubmit);
  }

  return { init: init };
})();

document.addEventListener('DOMContentLoaded', function () {
  ThemeToggle.init();
  ScrollProgress.init();
  ShortcutsHelp.init();
  Calculator.init();
  Playground.init();
});
