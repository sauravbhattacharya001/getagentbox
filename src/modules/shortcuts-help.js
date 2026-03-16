
/* ── Keyboard Shortcuts Help (?) ── */
var ShortcutsHelp = (function () {
  let overlay, closeBtn;

  function open() {
    overlay.hidden = false;
    closeBtn.focus();
  }

  function close() {
    overlay.hidden = true;
  }

  function init() {
    overlay = document.getElementById('shortcutsOverlay');
    closeBtn = document.getElementById('shortcutsClose');
    if (!overlay || !closeBtn) return;

    closeBtn.addEventListener('click', close);
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) close();
    });

    document.addEventListener('keydown', function (e) {
      // Don't trigger when typing in inputs
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) return;

      if (e.key === '?' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        if (overlay.hidden) { open(); } else { close(); }
      }

      if (e.key === 'Escape' && !overlay.hidden) {
        close();
      }

      // T for theme toggle
      if (e.key === 't' && !e.ctrlKey && !e.metaKey && !e.altKey && overlay.hidden) {
        const themeBtn = document.getElementById('themeToggle');
        if (themeBtn) themeBtn.click();
      }
    });
  }

  return { init: init };
})();
