
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

if (typeof module !== 'undefined' && module.exports) {
  module.exports = FAQ;
}
