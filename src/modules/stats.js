
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
