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

/**
 * Arrow-key navigation for groups of sibling buttons/tabs.
 *
 * Listens for ArrowLeft / ArrowRight / ArrowUp / ArrowDown on
 * `container`, finds the currently focused child matching `selector`,
 * moves focus to the previous/next sibling, and invokes `onActivate`.
 *
 * @param {Element} container  - Parent element to attach the keydown listener.
 * @param {string}  selector   - CSS selector for navigable children.
 * @param {function} onActivate - Callback receiving the newly focused element.
 */
function arrowKeyNav(container, selector, onActivate) {
  if (!container) return;
  container.addEventListener('keydown', function (e) {
    var isNext = e.key === 'ArrowRight' || e.key === 'ArrowDown';
    var isPrev = e.key === 'ArrowLeft'  || e.key === 'ArrowUp';
    if (!isNext && !isPrev) return;

    var items = Array.prototype.slice.call(container.querySelectorAll(selector));
    if (items.length === 0) return;

    var idx = items.indexOf(document.activeElement);
    if (idx === -1) return;

    e.preventDefault();
    var next = isNext
      ? (idx + 1) % items.length
      : (idx - 1 + items.length) % items.length;

    items[next].focus();
    if (onActivate) onActivate(items[next]);
  });
}
