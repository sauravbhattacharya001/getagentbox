/**
 * AgentBox Landing Page — Interactive Components
 *
 * Modules:
 *  - ChatDemo:       animated chat scenario player
 *  - Testimonials:   auto-rotating testimonials carousel
 *  - Pricing:        monthly/yearly billing toggle
 *  - FAQ:            accordion behaviour
 */

// ---------------------------------------------------------------------------
// Chat Demo Scenarios
// ---------------------------------------------------------------------------

/* exported SCENARIOS, ChatDemo, Testimonials, Pricing, FAQ */
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
    startAutoPlay();

    // Pause auto-play on hover, resume on leave.
    var section = document.getElementById('testimonialsSection');
    if (section) {
      section.addEventListener('mouseenter', stopAutoPlay);
      section.addEventListener('mouseleave', startAutoPlay);
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
    });

    // Re-open the clicked item if it wasn't already open.
    if (!wasOpen) item.classList.add('open');
  }

  return { toggle: toggle };
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

  // FAQ accordion — event delegation on the section.
  var faqSection = document.querySelector('.faq-section');
  if (faqSection) {
    faqSection.addEventListener('click', function (e) {
      var question = e.target.closest('.faq-question');
      if (question) FAQ.toggle(question);
    });
  }

  // Auto-play the default scenario.
  ChatDemo.play('memory');
});
/* eslint-enable no-var */

// Expose modules globally for external access and testability.
if (typeof window !== 'undefined') {
  window.SCENARIOS = SCENARIOS;
  window.ChatDemo = ChatDemo;
  window.Testimonials = Testimonials;
  window.Pricing = Pricing;
  window.FAQ = FAQ;
}

