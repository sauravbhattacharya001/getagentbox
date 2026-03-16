
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
    window.scrollTo({ top: 0, behavior: prefersReducedMotion ? 'auto' : 'smooth' });
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
