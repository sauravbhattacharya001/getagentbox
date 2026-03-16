
// ---------------------------------------------------------------------------
// Theme Toggle (Light/Dark Mode)
// ---------------------------------------------------------------------------
var ThemeToggle = (function () {
  const STORAGE_KEY = 'agentbox-theme';
  let btn, icon;

  function init() {
    btn = document.getElementById('themeToggle');
    icon = document.getElementById('themeIcon');
    if (!btn) return;

    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === 'light') {
        document.body.classList.add('light-mode');
        if (icon) icon.textContent = '🌙';
      }
    } catch (e) { /* localStorage unavailable (private browsing) */ }

    btn.addEventListener('click', toggle);
  }

  function toggle() {
    const isLight = document.body.classList.toggle('light-mode');
    if (icon) icon.textContent = isLight ? '🌙' : '☀️';
    try { localStorage.setItem(STORAGE_KEY, isLight ? 'light' : 'dark'); } catch (e) { /* private browsing */ }
  }

  return { init: init };
})();
