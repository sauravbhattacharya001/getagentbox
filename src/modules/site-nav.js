
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
