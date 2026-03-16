
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
