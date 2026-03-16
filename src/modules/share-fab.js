
// ---------------------------------------------------------------------------
// Floating Share Button
// ---------------------------------------------------------------------------
var ShareFab = (function () {
  let btn, menu, toast, toastTimer;
  const PAGE_URL = 'https://getagentbox.com';
  const PAGE_TITLE = 'AgentBox - Your Personal AI Agent on Telegram';
  const PAGE_DESC = 'Get your own AI assistant that lives in Telegram. It remembers you, searches the web, and helps you get things done.';

  function init() {
    btn = document.getElementById('shareFabBtn');
    menu = document.getElementById('shareFabMenu');
    toast = document.getElementById('shareToast');
    if (!btn || !menu) return;

    btn.addEventListener('click', toggle);
    document.addEventListener('click', function (e) {
      if (!e.target.closest('.share-fab')) close();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') close();
    });

    const options = menu.querySelectorAll('.share-option');
    for (var i = 0; i < options.length; i++) {
      options[i].addEventListener('click', handleShare);
    }
  }

  function toggle() {
    const open = btn.getAttribute('aria-expanded') === 'true';
    if (open) close(); else openMenu();
  }

  function openMenu() {
    menu.hidden = false;
    btn.setAttribute('aria-expanded', 'true');
    toast.hidden = true;
  }

  function close() {
    menu.hidden = true;
    btn.setAttribute('aria-expanded', 'false');
  }

  function handleShare(e) {
    const type = e.currentTarget.getAttribute('data-share');
    let url;
    if (type === 'twitter') {
      url = 'https://twitter.com/intent/tweet?text=' +
        encodeURIComponent(PAGE_TITLE + ' — ' + PAGE_DESC) +
        '&url=' + encodeURIComponent(PAGE_URL);
      window.open(url, '_blank', 'noopener,width=550,height=420');
    } else if (type === 'linkedin') {
      url = 'https://www.linkedin.com/sharing/share-offsite/?url=' +
        encodeURIComponent(PAGE_URL);
      window.open(url, '_blank', 'noopener,width=550,height=500');
    } else if (type === 'copy') {
      copyLink();
    }
    close();
  }

  function copyLink() {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(PAGE_URL).then(showToast);
    } else {
      const ta = document.createElement('textarea');
      ta.value = PAGE_URL;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      showToast();
    }
  }

  function showToast() {
    toast.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toast.hidden = true; }, 2000);
  }

  return { init: init };
})();
