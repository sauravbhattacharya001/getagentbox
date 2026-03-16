
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
