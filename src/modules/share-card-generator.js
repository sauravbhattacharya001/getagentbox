
/* ── Share Card Generator ── */
var ShareCardGenerator = (function () {
  'use strict';

  var THEMES = {
    gradient: { bg: ['#667eea', '#764ba2'], text: '#fff', sub: 'rgba(255,255,255,0.85)' },
    ocean:    { bg: ['#2193b0', '#6dd5ed'], text: '#fff', sub: 'rgba(255,255,255,0.85)' },
    sunset:   { bg: ['#f093fb', '#f5576c'], text: '#fff', sub: 'rgba(255,255,255,0.9)' },
    forest:   { bg: ['#11998e', '#38ef7d'], text: '#fff', sub: 'rgba(255,255,255,0.85)' },
    dark:     { bg: ['#1a1a2e', '#16213e'], text: '#eee', sub: 'rgba(200,200,220,0.8)' }
  };

  var FEATURES = {
    memory:    { icon: '\uD83E\uDDE0', label: 'Memory' },
    search:    { icon: '\uD83D\uDD0D', label: 'Web Search' },
    reminders: { icon: '\u23F0',       label: 'Reminders' },
    vision:    { icon: '\uD83D\uDCF8', label: 'Image Analysis' },
    voice:     { icon: '\uD83C\uDFA4', label: 'Voice Messages' },
    code:      { icon: '\uD83D\uDCBB', label: 'Code Help' }
  };

  var currentTheme = 'gradient';

  function drawCard(canvas, data) {
    var ctx = canvas.getContext('2d');
    if (!ctx) return;
    var w = canvas.width, h = canvas.height;
    var theme = THEMES[currentTheme] || THEMES.gradient;

    // Background gradient
    var grad = ctx.createLinearGradient(0, 0, w, h);
    grad.addColorStop(0, theme.bg[0]);
    grad.addColorStop(1, theme.bg[1]);
    ctx.fillStyle = grad;
    roundRect(ctx, 0, 0, w, h, 20);
    ctx.fill();

    // Decorative circles
    ctx.globalAlpha = 0.08;
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(w - 60, 60, 100, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(80, h - 40, 70, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;

    // Logo + title
    ctx.fillStyle = theme.text;
    ctx.font = 'bold 22px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    ctx.textBaseline = 'top';
    ctx.fillText('\uD83E\uDD16 AgentBox', 32, 28);

    // User quote
    var quote = data.quote || 'My AI assistant in Telegram!';
    ctx.font = 'italic 18px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    ctx.fillStyle = theme.sub;
    wrapText(ctx, '\u201C' + quote + '\u201D', 32, 80, w - 64, 24);

    // Feature badge
    var feat = FEATURES[data.feature] || FEATURES.memory;
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    roundRect(ctx, 32, 190, 180, 36, 18);
    ctx.fill();
    ctx.fillStyle = theme.text;
    ctx.font = '15px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    ctx.fillText(feat.icon + '  Favorite: ' + feat.label, 46, 198);

    // User info
    ctx.fillStyle = theme.text;
    ctx.font = 'bold 17px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    ctx.fillText(data.name || 'AgentBox User', 32, 260);
    if (data.role) {
      ctx.fillStyle = theme.sub;
      ctx.font = '14px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
      ctx.fillText(data.role, 32, 284);
    }

    // Footer
    ctx.fillStyle = theme.sub;
    ctx.font = '12px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText('t.me/AgentBox11Bot', w - 32, h - 24);
    ctx.textAlign = 'left';
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  function wrapText(ctx, text, x, y, maxW, lineH) {
    var words = text.split(' ');
    var line = '';
    for (var i = 0; i < words.length; i++) {
      var test = line + words[i] + ' ';
      if (ctx.measureText(test).width > maxW && i > 0) {
        ctx.fillText(line.trim(), x, y);
        line = words[i] + ' ';
        y += lineH;
      } else {
        line = test;
      }
    }
    ctx.fillText(line.trim(), x, y);
  }

  function init() {
    var canvas = document.getElementById('shareCardCanvas');
    var genBtn = document.getElementById('shareCardGenerate');
    var dlBtn = document.getElementById('shareCardDownload');
    var copyBtn = document.getElementById('shareCardCopy');
    var actions = document.getElementById('shareCardActions');
    var hint = canvas && canvas.parentElement.querySelector('.share-card-hint');
    var themeBtns = document.getElementById('shareCardThemes');

    if (!canvas || !genBtn) return;

    // Draw placeholder
    var ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#f0f0f0';
    roundRect(ctx, 0, 0, canvas.width, canvas.height, 20);
    ctx.fill();
    ctx.fillStyle = '#bbb';
    ctx.font = '16px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Your card will appear here', canvas.width / 2, canvas.height / 2);
    ctx.textAlign = 'left';

    // Theme switcher
    if (themeBtns) {
      themeBtns.addEventListener('click', function (e) {
        var btn = e.target.closest('.share-card-theme');
        if (!btn) return;
        var prev = themeBtns.querySelector('.active');
        if (prev) prev.classList.remove('active');
        btn.classList.add('active');
        currentTheme = btn.getAttribute('data-theme');
      });
    }

    genBtn.addEventListener('click', function () {
      var data = {
        name: document.getElementById('shareCardName').value.trim(),
        role: document.getElementById('shareCardRole').value.trim(),
        feature: document.getElementById('shareCardFeature').value,
        quote: document.getElementById('shareCardQuote').value.trim()
      };
      drawCard(canvas, data);
      if (actions) actions.hidden = false;
      if (hint) hint.hidden = true;
    });

    if (dlBtn) {
      dlBtn.addEventListener('click', function () {
        var link = document.createElement('a');
        link.download = 'agentbox-card.png';
        link.href = canvas.toDataURL('image/png');
        link.click();
      });
    }

    if (copyBtn) {
      copyBtn.addEventListener('click', function () {
        canvas.toBlob(function (blob) {
          if (!blob) return;
          try {
            navigator.clipboard.write([
              new ClipboardItem({ 'image/png': blob })
            ]).then(function () {
              copyBtn.textContent = '\u2705 Copied!';
              setTimeout(function () { copyBtn.textContent = '\uD83D\uDCCB Copy to Clipboard'; }, 2000);
            });
          } catch (_e) {
            copyBtn.textContent = 'Use Download instead';
            setTimeout(function () { copyBtn.textContent = '\uD83D\uDCCB Copy to Clipboard'; }, 2000);
          }
        }, 'image/png');
      });
    }
  }

  return { init: init, drawCard: drawCard, THEMES: THEMES, FEATURES: FEATURES };
})();
