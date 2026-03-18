// ---------------------------------------------------------------------------
// Shared Utilities — used across multiple modules
// ---------------------------------------------------------------------------

/**
 * Escape HTML special characters to prevent XSS when inserting user content.
 * Uses the browser's own text node escaping for correctness.
 *
 * @param {string} str - Raw string to escape
 * @returns {string} HTML-safe string
 */
function _escapeHtml(str) {
  var d = document.createElement('div');
  d.textContent = str;
  return d.innerHTML;
}

/**
 * Format an ISO date string (YYYY-MM-DD) into a locale-friendly display string.
 *
 * @param {string} dateStr - Date in YYYY-MM-DD format
 * @returns {string} Formatted date or the original string on failure
 */
function _formatDate(dateStr) {
  try {
    var d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  } catch (_) {
    return dateStr;
  }
}
