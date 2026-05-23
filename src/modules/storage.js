// ---------------------------------------------------------------------------
// Shared localStorage Utility
// ---------------------------------------------------------------------------
/**
 * Safe localStorage wrapper that handles private browsing, quota errors,
 * and SSR/non-browser environments. All modules should use this instead
 * of raw localStorage access to avoid duplicated try/catch blocks.
 *
 * @example
 *   var prefs = StorageUtil.getJSON('agentbox_prefs', {});
 *   prefs.theme = 'dark';
 *   StorageUtil.setJSON('agentbox_prefs', prefs);
 */
/* exported StorageUtil */
var StorageUtil = (function () {
  'use strict';

  /**
   * Check if localStorage is available and functional.
   * Caches the result after the first probe.
   * @returns {boolean}
   */
  var _available = null;
  function isAvailable() {
    if (_available !== null) return _available;
    try {
      var key = '__agentbox_storage_probe__';
      localStorage.setItem(key, '1');
      localStorage.removeItem(key);
      _available = true;
    } catch (e) {
      _available = false;
    }
    return _available;
  }

  /**
   * Get a raw string value from localStorage.
   * @param {string} key
   * @param {string} [fallback='']
   * @returns {string}
   */
  function get(key, fallback) {
    if (!isAvailable()) return arguments.length > 1 ? fallback : '';
    try {
      var val = localStorage.getItem(key);
      return val !== null ? val : (arguments.length > 1 ? fallback : '');
    } catch (e) {
      return arguments.length > 1 ? fallback : '';
    }
  }

  /**
   * Set a raw string value in localStorage.
   * @param {string} key
   * @param {string} value
   * @returns {boolean} true if successful
   */
  function set(key, value) {
    if (!isAvailable()) return false;
    try {
      localStorage.setItem(key, value);
      return true;
    } catch (e) {
      return false;
    }
  }

  /**
   * Get and parse a JSON value from localStorage.
   * @param {string} key
   * @param {*} fallback - Returned on missing key or parse error
   * @returns {*}
   */
  function getJSON(key, fallback) {
    var raw = get(key, null);
    if (raw === null) return fallback;
    try {
      return JSON.parse(raw);
    } catch (e) {
      return fallback;
    }
  }

  /**
   * Serialize and store a JSON value in localStorage.
   * @param {string} key
   * @param {*} value
   * @returns {boolean} true if successful
   */
  function setJSON(key, value) {
    try {
      return set(key, JSON.stringify(value));
    } catch (e) {
      return false;
    }
  }

  /**
   * Remove a key from localStorage.
   * @param {string} key
   */
  function remove(key) {
    if (!isAvailable()) return;
    try { localStorage.removeItem(key); } catch (e) { /* noop */ }
  }

  return {
    isAvailable: isAvailable,
    get: get,
    set: set,
    getJSON: getJSON,
    setJSON: setJSON,
    remove: remove
  };
})();

// Make StorageUtil available as a global in CommonJS/Node environments
// (e.g., Jest). At runtime in the browser the IIFE `var StorageUtil` already
// lives on the window object via the concatenated bundle (see build.js); this
// shim ensures consumer modules that reference the bare `StorageUtil`
// identifier also resolve it when each module is loaded individually under
// `require()`. Without this, every consumer (~10 modules) throws
// `ReferenceError: StorageUtil is not defined` at require-time, cascading
// into ~500 unrelated test failures in jsdom test suites.
if (typeof globalThis !== 'undefined' && typeof globalThis.StorageUtil === 'undefined') {
  globalThis.StorageUtil = StorageUtil;
}
