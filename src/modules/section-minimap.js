
/* ── Section Mini-Map ── */
var SectionMinimap = (function () {
  var nav, track, tooltip;
  var sections = [];
  var dots = [];
  var activeIdx = -1;
  var scrollTicking = false;
  var sectionOffsets = [];

  /** Cache section offsets to avoid forced reflow on every scroll frame. */
  function cacheOffsets() {
    sectionOffsets = [];
    for (var i = 0; i < sections.length; i++) {
      sectionOffsets[i] = sections[i].el.offsetTop;
    }
  }

  /** Section definitions — id to label mapping for the minimap dots. */
  var SECTION_DEFS = [
    { id: 'featuresSection', label: 'Features' },
    { id: 'howItWorks', label: 'How It Works' },
    { id: 'wizardSection', label: 'Wizard' },
    { id: 'demoSection', label: 'Demo' },
    { id: 'playgroundSection', label: 'Playground' },
    { id: 'personalitySection', label: 'Personality' },
    { id: 'promptGallerySection', label: 'Prompts' },
    { id: 'beforeAfterSection', label: 'Before/After' },
    { id: 'usecasesSection', label: 'Use Cases' },
    { id: 'integrationsSection', label: 'Integrations' },
    { id: 'comparisonSection', label: 'Compare' },
    { id: 'calculatorSection', label: 'Calculator' },
    { id: 'notificationSection', label: 'Preview' },
    { id: 'trustSection', label: 'Trust' },
    { id: 'storiesSection', label: 'Stories' },
    { id: 'pricingSection', label: 'Pricing' },
    { id: 'quizSection', label: 'Quiz' },
    { id: 'roadmapSection', label: 'Roadmap' },
    { id: 'statusSection', label: 'Status' },
    { id: 'faqSection', label: 'FAQ' },
    { id: 'glossarySection', label: 'Glossary' },
    { id: 'growthTimelineSection', label: 'Journey' },
    { id: 'feedbackSection', label: 'Feedback' },
    { id: 'newsletterSection', label: 'Newsletter' }
  ];

  function init() {
    nav = document.getElementById('sectionMinimap');
    track = document.getElementById('minimapTrack');
    tooltip = document.getElementById('minimapTooltip');
    if (!nav || !track) return;

    // Build dots only for sections that exist in the DOM
    for (var i = 0; i < SECTION_DEFS.length; i++) {
      var el = document.getElementById(SECTION_DEFS[i].id);
      if (!el) continue;
      sections.push({ el: el, label: SECTION_DEFS[i].label });
      var dot = document.createElement('button');
      dot.className = 'minimap-dot';
      dot.setAttribute('aria-label', 'Go to ' + SECTION_DEFS[i].label);
      dot.setAttribute('data-idx', dots.length);
      dot.tabIndex = -1;
      track.appendChild(dot);
      dots.push(dot);
    }

    if (dots.length === 0) return;

    // Click handler (delegated)
    track.addEventListener('click', function (e) {
      var btn = e.target.closest('.minimap-dot');
      if (!btn) return;
      var idx = parseInt(btn.getAttribute('data-idx'), 10);
      if (idx >= 0 && idx < sections.length) {
        sections[idx].el.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth', block: 'start' });
      }
    });

    // Tooltip on hover
    track.addEventListener('mouseover', function (e) {
      var btn = e.target.closest('.minimap-dot');
      if (!btn || !tooltip) return;
      var idx = parseInt(btn.getAttribute('data-idx'), 10);
      if (idx >= 0 && idx < sections.length) {
        tooltip.textContent = sections[idx].label;
        var rect = btn.getBoundingClientRect();
        tooltip.style.top = (rect.top + rect.height / 2 - 10) + 'px';
        tooltip.classList.add('show');
      }
    });
    track.addEventListener('mouseout', function (e) {
      if (e.target.closest('.minimap-dot') && tooltip) {
        tooltip.classList.remove('show');
      }
    });

    // Cache offsets and listen for changes
    cacheOffsets();
    window.addEventListener('resize', cacheOffsets);

    // Scroll listener
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  function onScroll() {
    if (scrollTicking) return;
    scrollTicking = true;
    requestAnimationFrame(function () {
      scrollTicking = false;
      update();
    });
  }

  function update() {
    // Show minimap only after scrolling past the hero
    var scrollY = window.pageYOffset || document.documentElement.scrollTop;
    if (scrollY > 300) {
      nav.classList.add('visible');
    } else {
      nav.classList.remove('visible');
      return;
    }

    // Find active section — the one whose top is closest to viewport top
    // Uses cached offsetTop values to avoid forced reflow per frame
    var viewMid = scrollY + window.innerHeight * 0.35;
    var bestIdx = 0;
    var bestDist = Infinity;
    for (var i = 0; i < sections.length; i++) {
      var dist = Math.abs(sectionOffsets[i] - viewMid);
      if (dist < bestDist) {
        bestDist = dist;
        bestIdx = i;
      }
    }

    if (bestIdx !== activeIdx) {
      if (activeIdx >= 0 && activeIdx < dots.length) {
        dots[activeIdx].classList.remove('active');
      }
      dots[bestIdx].classList.add('active');
      activeIdx = bestIdx;
    }
  }

  return { init: init };
})();
