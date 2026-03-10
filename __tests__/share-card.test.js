/**
 * @jest-environment jsdom
 */

'use strict';

// Minimal canvas stub
function createCanvasStub() {
  var ops = [];
  return {
    width: 600,
    height: 340,
    getContext: function () {
      return {
        fillStyle: '',
        font: '',
        textAlign: 'left',
        textBaseline: 'top',
        globalAlpha: 1,
        fillText: function (t, x, y) { ops.push({ op: 'fillText', t: t, x: x, y: y }); },
        fillRect: function () {},
        fill: function () {},
        beginPath: function () {},
        closePath: function () {},
        arc: function () {},
        moveTo: function () {},
        lineTo: function () {},
        quadraticCurveTo: function () {},
        measureText: function (s) { return { width: s.length * 7 }; },
        createLinearGradient: function () {
          return { addColorStop: function () {} };
        }
      };
    },
    toDataURL: function () { return 'data:image/png;base64,stub'; },
    toBlob: function (cb) { cb(new Blob(['x'], { type: 'image/png' })); },
    parentElement: { querySelector: function () { return null; } }
  };
}

function buildDOM() {
  document.body.innerHTML = [
    '<div id="shareCardSection">',
    '  <input id="shareCardName" value="Test User">',
    '  <input id="shareCardRole" value="Engineer">',
    '  <select id="shareCardFeature"><option value="memory">Memory</option></select>',
    '  <input id="shareCardQuote" value="Love it!">',
    '  <div id="shareCardThemes">',
    '    <button class="share-card-theme active" data-theme="gradient"></button>',
    '    <button class="share-card-theme" data-theme="ocean"></button>',
    '    <button class="share-card-theme" data-theme="dark"></button>',
    '  </div>',
    '  <button id="shareCardGenerate"></button>',
    '  <canvas id="shareCardCanvas" width="600" height="340"></canvas>',
    '  <div id="shareCardActions" hidden>',
    '    <button id="shareCardDownload"></button>',
    '    <button id="shareCardCopy"></button>',
    '  </div>',
    '  <p class="share-card-hint">hint</p>',
    '</div>'
  ].join('\n');

  // Replace canvas with stub
  var real = document.getElementById('shareCardCanvas');
  var stub = createCanvasStub();
  stub.id = 'shareCardCanvas';
  Object.defineProperty(stub, 'parentElement', {
    get: function () { return real.parentElement; }
  });
  // Patch getElementById for canvas
  var origGet = document.getElementById.bind(document);
  document.getElementById = function (id) {
    if (id === 'shareCardCanvas') return stub;
    return origGet(id);
  };
  return stub;
}

// Load module
require('../app.js');

describe('ShareCardGenerator', function () {
  var SCG;

  beforeEach(function () {
    SCG = window.ShareCardGenerator;
  });

  test('module exists and exports init', function () {
    expect(SCG).toBeDefined();
    expect(typeof SCG.init).toBe('function');
  });

  test('THEMES has all 5 themes', function () {
    expect(Object.keys(SCG.THEMES)).toEqual(
      expect.arrayContaining(['gradient', 'ocean', 'sunset', 'forest', 'dark'])
    );
  });

  test('each theme has bg, text, sub', function () {
    Object.keys(SCG.THEMES).forEach(function (k) {
      var t = SCG.THEMES[k];
      expect(t.bg).toHaveLength(2);
      expect(t.text).toBeTruthy();
      expect(t.sub).toBeTruthy();
    });
  });

  test('FEATURES has 6 features', function () {
    expect(Object.keys(SCG.FEATURES)).toHaveLength(6);
  });

  test('each feature has icon and label', function () {
    Object.keys(SCG.FEATURES).forEach(function (k) {
      expect(SCG.FEATURES[k].icon).toBeTruthy();
      expect(SCG.FEATURES[k].label).toBeTruthy();
    });
  });

  test('drawCard does not throw with valid canvas', function () {
    var stub = createCanvasStub();
    expect(function () {
      SCG.drawCard(stub, { name: 'Test', role: 'Dev', feature: 'memory', quote: 'Great!' });
    }).not.toThrow();
  });

  test('drawCard handles empty data', function () {
    var stub = createCanvasStub();
    expect(function () {
      SCG.drawCard(stub, {});
    }).not.toThrow();
  });

  test('drawCard handles unknown feature gracefully', function () {
    var stub = createCanvasStub();
    expect(function () {
      SCG.drawCard(stub, { feature: 'nonexistent' });
    }).not.toThrow();
  });

  test('drawCard handles long quote wrapping', function () {
    var stub = createCanvasStub();
    var longQuote = 'This is a very long quote that should wrap onto multiple lines when rendered on the canvas element';
    expect(function () {
      SCG.drawCard(stub, { quote: longQuote });
    }).not.toThrow();
  });

  test('init runs without error when DOM present', function () {
    buildDOM();
    expect(function () { SCG.init(); }).not.toThrow();
  });

  test('init does nothing when canvas missing', function () {
    document.body.innerHTML = '';
    // restore getElementById
    var origGet = document.getElementById.bind(document);
    document.getElementById = origGet;
    expect(function () { SCG.init(); }).not.toThrow();
  });

  test('generate button triggers card render', function () {
    var stub = buildDOM();
    SCG.init();
    var btn = document.getElementById('shareCardGenerate');
    btn.click();
    var actions = document.getElementById('shareCardActions');
    expect(actions.hidden).toBe(false);
  });

  test('theme switching updates active class', function () {
    buildDOM();
    SCG.init();
    var oceanBtn = document.querySelector('[data-theme="ocean"]');
    oceanBtn.click();
    expect(oceanBtn.classList.contains('active')).toBe(true);
    var gradBtn = document.querySelector('[data-theme="gradient"]');
    expect(gradBtn.classList.contains('active')).toBe(false);
  });

  test('download button creates link', function () {
    var stub = buildDOM();
    SCG.init();
    document.getElementById('shareCardGenerate').click();
    // Just verify no error on click
    var dlBtn = document.getElementById('shareCardDownload');
    var clicked = false;
    var origCreate = document.createElement.bind(document);
    document.createElement = function (tag) {
      var el = origCreate(tag);
      if (tag === 'a') {
        el.click = function () { clicked = true; };
      }
      return el;
    };
    dlBtn.click();
    expect(clicked).toBe(true);
    document.createElement = origCreate;
  });
});
