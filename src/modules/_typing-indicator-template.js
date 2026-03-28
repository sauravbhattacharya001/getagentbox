
// ---------------------------------------------------------------------------
// Shared Utilities
// ---------------------------------------------------------------------------

/**
 * Reusable typing indicator template.
 * Shared between ChatDemo and Playground — clone with cloneNode(true).
 * Guarded against non-browser (SSR/Node) environments where `document`
 * is undefined — the old IIFE would crash at bundle load time.
 */
var _typingIndicatorTemplate = (typeof document !== 'undefined') ? (function () {
  var el = document.createElement('div');
  el.className = 'typing-indicator';
  for (var i = 0; i < 3; i++) el.appendChild(document.createElement('span'));
  return el;
})() : null;
