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
  function escapeHtml(str) {
    var d = document.createElement('div');
    d.textContent = str;
    return d.innerHTML;
  }

  return {
    escapeHtml: escapeHtml
  };
})();
