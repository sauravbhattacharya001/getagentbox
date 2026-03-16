
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

    const detail = card.querySelector('.trust-detail');
    if (!detail) return;

    const wasExpanded = card.classList.contains('expanded');

    // Collapse sibling cards (accordion).
    // Scoped to parent instead of full document scan.
    const parent = card.parentElement;
    if (parent) {
      const expanded = parent.querySelectorAll('.trust-card.expanded');
      for (var ei = 0; ei < expanded.length; ei++) {
        expanded[ei].classList.remove('expanded');
        const d = expanded[ei].querySelector('.trust-detail');
        if (d) d.hidden = true;
      }
    }

    // Toggle the clicked card.
    if (!wasExpanded) {
      card.classList.add('expanded');
      detail.hidden = false;
    }
  }

  return { toggle: toggle };
})();
