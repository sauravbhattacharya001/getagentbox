
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

    const saved = StorageUtil.get(STORAGE_KEY, null);
    if (saved === 'light') {
      document.body.classList.add('light-mode');
      if (icon) icon.textContent = '🌙';
    }

    btn.addEventListener('click', toggle);
  }

  function toggle() {
    const isLight = document.body.classList.toggle('light-mode');
    if (icon) icon.textContent = isLight ? '🌙' : '☀️';
    StorageUtil.set(STORAGE_KEY, isLight ? 'light' : 'dark');
  }

  return { init: init };
})();
