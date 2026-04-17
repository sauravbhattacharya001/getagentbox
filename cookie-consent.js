/* ── Cookie Consent Banner ──────────────────────────────────────── */
/* GDPR-style cookie consent with accept/reject + preferences.     */
/* Choice is stored via StorageUtil; banner won't reappear after.  */

(function () {
  'use strict';

  var STORAGE_KEY = 'agentbox_cookie_consent';

  function getConsent() {
    return StorageUtil.getJSON(STORAGE_KEY, null);
  }

  function setConsent(choice) {
    StorageUtil.setJSON(STORAGE_KEY, {
      choice: choice,         // 'all' | 'essential' | 'custom'
      timestamp: Date.now()
    });
  }

  // If already consented, don't show banner
  if (getConsent()) return;

  // ── Build DOM ──────────────────────────────────────────────────
  var banner = document.createElement('div');
  banner.id = 'cookieConsentBanner';
  banner.setAttribute('role', 'dialog');
  banner.setAttribute('aria-label', 'Cookie consent');
  banner.innerHTML = [
    '<div class="cc-inner">',
    '  <div class="cc-text">',
    '    <strong>🍪 We value your privacy</strong>',
    '    <p>We use cookies for analytics (GoatCounter) to understand how visitors use AgentBox. No personal data is sold or shared with third parties.</p>',
    '  </div>',
    '  <div class="cc-actions">',
    '    <button class="cc-btn cc-btn--accept" id="ccAcceptAll">Accept All</button>',
    '    <button class="cc-btn cc-btn--essential" id="ccEssentialOnly">Essential Only</button>',
    '    <button class="cc-btn cc-btn--manage" id="ccManage">Manage</button>',
    '  </div>',
    '  <div class="cc-details" id="ccDetails" hidden>',
    '    <label class="cc-toggle">',
    '      <input type="checkbox" checked disabled> <span>Essential</span>',
    '      <small>Required for basic site functionality.</small>',
    '    </label>',
    '    <label class="cc-toggle">',
    '      <input type="checkbox" id="ccAnalytics" checked> <span>Analytics</span>',
    '      <small>Helps us understand how visitors use the site (GoatCounter — privacy-first, no personal data).</small>',
    '    </label>',
    '    <button class="cc-btn cc-btn--accept" id="ccSavePrefs">Save Preferences</button>',
    '  </div>',
    '</div>'
  ].join('\n');

  // ── Inject styles ──────────────────────────────────────────────
  var style = document.createElement('style');
  style.textContent = [
    '#cookieConsentBanner {',
    '  position: fixed; bottom: 0; left: 0; right: 0; z-index: 99999;',
    '  background: #141414; border-top: 1px solid #2a2a2a;',
    '  padding: 1rem 1.5rem; font-family: system-ui, sans-serif;',
    '  color: #e8e8e8; animation: ccSlideUp .35s ease-out;',
    '}',
    '@keyframes ccSlideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }',
    '.cc-inner { max-width: 960px; margin: 0 auto; }',
    '.cc-text strong { font-size: 1rem; }',
    '.cc-text p { font-size: .85rem; color: #aaa; margin: .35rem 0 .75rem; line-height: 1.45; }',
    '.cc-actions { display: flex; gap: .5rem; flex-wrap: wrap; }',
    '.cc-btn { border: none; border-radius: 8px; padding: .55rem 1.1rem; font-size: .85rem; cursor: pointer; font-weight: 600; transition: opacity .15s; }',
    '.cc-btn:hover { opacity: .85; }',
    '.cc-btn--accept { background: #00d4ff; color: #000; }',
    '.cc-btn--essential { background: #252525; color: #e8e8e8; border: 1px solid #333; }',
    '.cc-btn--manage { background: transparent; color: #00d4ff; text-decoration: underline; border: none; }',
    '.cc-details { margin-top: 1rem; padding-top: .75rem; border-top: 1px solid #2a2a2a; }',
    '.cc-toggle { display: block; margin-bottom: .6rem; font-size: .85rem; cursor: pointer; }',
    '.cc-toggle input { margin-right: .4rem; accent-color: #00d4ff; }',
    '.cc-toggle span { font-weight: 600; }',
    '.cc-toggle small { display: block; margin-left: 1.4rem; color: #888; font-size: .75rem; }',
    /* Light mode support */
    '[data-theme="light"] #cookieConsentBanner { background: #fff; border-top-color: #ddd; color: #333; }',
    '[data-theme="light"] .cc-text p { color: #666; }',
    '[data-theme="light"] .cc-btn--essential { background: #f0f0f0; color: #333; border-color: #ccc; }',
    '[data-theme="light"] .cc-details { border-top-color: #ddd; }',
    '[data-theme="light"] .cc-toggle small { color: #888; }'
  ].join('\n');

  document.head.appendChild(style);
  document.body.appendChild(banner);

  // ── Event handlers ─────────────────────────────────────────────
  function dismiss() {
    banner.style.animation = 'ccSlideUp .25s ease-in reverse forwards';
    setTimeout(function () { banner.remove(); }, 260);
  }

  document.getElementById('ccAcceptAll').addEventListener('click', function () {
    setConsent('all');
    dismiss();
  });

  document.getElementById('ccEssentialOnly').addEventListener('click', function () {
    setConsent('essential');
    dismiss();
  });

  document.getElementById('ccManage').addEventListener('click', function () {
    var details = document.getElementById('ccDetails');
    details.hidden = !details.hidden;
  });

  document.getElementById('ccSavePrefs').addEventListener('click', function () {
    var analytics = document.getElementById('ccAnalytics').checked;
    setConsent(analytics ? 'all' : 'essential');
    dismiss();
  });
})();
