
// ---------------------------------------------------------------------------
// Shared Utilities
// ---------------------------------------------------------------------------

/**
 * Reusable typing indicator template.
 * Shared between ChatDemo and Playground — clone with cloneNode(true).
 */
var _typingIndicatorTemplate = (function () {
  let el = document.createElement('div');
  el.className = 'typing-indicator';
  for (var i = 0; i < 3; i++) el.appendChild(document.createElement('span'));
  return el;
})();
