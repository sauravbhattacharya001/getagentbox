// ---------------------------------------------------------------------------
// Shared DOM Utilities
// ---------------------------------------------------------------------------
/**
 * Commonly needed DOM helpers used across multiple modules.
 * Eliminates duplication of escapeHtml and similar functions.
 *
 * @example
 *   var safe = DOMUtil.escapeHtml(userInput);
 *   el.innerHTML = '<span>' + safe + '</span>';
 */
/* exported DOMUtil */
var DOMUtil = (function () {
  'use strict';

  /**
   * Escape a string for safe insertion into HTML.
   * Uses the browser's own text-node encoding to guarantee correctness.
   *
   * @param {string} str - Raw string to escape.
   * @returns {string} HTML-safe string.
   */
  /** Reusable element for escapeHtml — avoids creating a new DOM node per call. */
  var _escapeEl = null;

  function escapeHtml(str) {
    if (!_escapeEl) _escapeEl = document.createElement('div');
    _escapeEl.textContent = str;
    return _escapeEl.innerHTML;
  }

  return {
    escapeHtml: escapeHtml
  };
})();
