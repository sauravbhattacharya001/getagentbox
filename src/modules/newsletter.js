
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
