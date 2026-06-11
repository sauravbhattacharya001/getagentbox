/**
 * @jest-environment jsdom
 */

describe('CapabilityRadar', () => {
  let CapabilityRadar;

  beforeEach(() => {
    document.body.innerHTML = '<div id="radarRoot"></div>';
    // Stub canvas
    HTMLCanvasElement.prototype.getContext = function () {
      return {
        clearRect: jest.fn(),
        beginPath: jest.fn(),
        moveTo: jest.fn(),
        lineTo: jest.fn(),
        closePath: jest.fn(),
        stroke: jest.fn(),
        fill: jest.fn(),
        arc: jest.fn(),
        fillText: jest.fn(),
        setTransform: jest.fn(),
        strokeStyle: '',
        fillStyle: '',
        lineWidth: 1,
        font: '',
        textAlign: '',
        textBaseline: ''
      };
    };
    jest.resetModules();
    CapabilityRadar = require('../src/capability-radar.js');
  });

  test('exports init, DIMENSIONS, AGENTS', () => {
    expect(typeof CapabilityRadar.init).toBe('function');
    expect(Array.isArray(CapabilityRadar.DIMENSIONS)).toBe(true);
    expect(Array.isArray(CapabilityRadar.AGENTS)).toBe(true);
  });

  test('DIMENSIONS has 8 entries', () => {
    expect(CapabilityRadar.DIMENSIONS).toHaveLength(8);
  });

  test('each dimension has key, label, icon', () => {
    CapabilityRadar.DIMENSIONS.forEach(d => {
      expect(d.key).toBeTruthy();
      expect(d.label).toBeTruthy();
      expect(d.icon).toBeTruthy();
    });
  });

  test('AGENTS includes AgentBox', () => {
    expect(CapabilityRadar.AGENTS.some(a => a.name === 'AgentBox')).toBe(true);
  });

  test('all agents have scores for all dimensions', () => {
    const keys = CapabilityRadar.DIMENSIONS.map(d => d.key);
    CapabilityRadar.AGENTS.forEach(agent => {
      keys.forEach(k => {
        expect(typeof agent.scores[k]).toBe('number');
        expect(agent.scores[k]).toBeGreaterThanOrEqual(0);
        expect(agent.scores[k]).toBeLessThanOrEqual(100);
      });
    });
  });

  test('AgentBox leads in memory dimension', () => {
    const ab = CapabilityRadar.AGENTS.find(a => a.name === 'AgentBox');
    const others = CapabilityRadar.AGENTS.filter(a => a.name !== 'AgentBox');
    others.forEach(a => {
      expect(ab.scores.memory).toBeGreaterThan(a.scores.memory);
    });
  });

  test('init creates canvas element', () => {
    CapabilityRadar.init('radarRoot');
    expect(document.querySelector('#radarRoot canvas')).toBeTruthy();
  });

  test('init creates legend buttons', () => {
    CapabilityRadar.init('radarRoot');
    const btns = document.querySelectorAll('.radar-legend-btn');
    expect(btns.length).toBe(CapabilityRadar.AGENTS.length);
  });

  test('legend buttons are initially active', () => {
    CapabilityRadar.init('radarRoot');
    document.querySelectorAll('.radar-legend-btn').forEach(btn => {
      expect(btn.classList.contains('active')).toBe(true);
      expect(btn.getAttribute('aria-pressed')).toBe('true');
    });
  });

  test('clicking legend button toggles active state', () => {
    CapabilityRadar.init('radarRoot');
    const btn = document.querySelector('.radar-legend-btn');
    btn.click();
    expect(btn.classList.contains('active')).toBe(false);
    expect(btn.getAttribute('aria-pressed')).toBe('false');
    btn.click();
    expect(btn.classList.contains('active')).toBe(true);
  });

  test('canvas has aria role img', () => {
    CapabilityRadar.init('radarRoot');
    const c = document.querySelector('canvas');
    expect(c.getAttribute('role')).toBe('img');
    expect(c.getAttribute('aria-label')).toContain('radar');
  });

  test('tooltip element exists and is hidden initially', () => {
    CapabilityRadar.init('radarRoot');
    const tt = document.querySelector('.radar-tooltip');
    expect(tt).toBeTruthy();
    expect(tt.hidden).toBe(true);
  });

  test('detail area exists', () => {
    CapabilityRadar.init('radarRoot');
    expect(document.getElementById('radarDetail')).toBeTruthy();
  });

  test('init with invalid id does not throw', () => {
    expect(() => CapabilityRadar.init('nonexistent')).not.toThrow();
  });

  test('init with element reference works', () => {
    const el = document.getElementById('radarRoot');
    CapabilityRadar.init(el);
    expect(el.querySelector('canvas')).toBeTruthy();
  });

  test('agents have color and fill properties', () => {
    CapabilityRadar.AGENTS.forEach(a => {
      expect(a.color).toMatch(/^rgba/);
      expect(a.fill).toMatch(/^rgba/);
    });
  });

  test('4 agents are defined', () => {
    expect(CapabilityRadar.AGENTS).toHaveLength(4);
  });

  // ── Performance: avoid full canvas re-render on every mousemove ──────────
  // Regression for the hover handler that called draw() (clearRect + redraw of
  // grid, axes, labels and every data polygon) on EVERY mousemove, including
  // the large empty region of the chart where nothing changed. After the fix,
  // moving across empty area redraws at most once (the transition back to
  // "no dimension hovered"); subsequent moves over empty area must not redraw.
  describe('mousemove redraw performance', () => {
    let ctxStub;

    beforeEach(() => {
      // Stable context object so the test can observe the real draw calls.
      ctxStub = {
        clearRect: jest.fn(), beginPath: jest.fn(), moveTo: jest.fn(),
        lineTo: jest.fn(), closePath: jest.fn(), stroke: jest.fn(),
        fill: jest.fn(), arc: jest.fn(), fillText: jest.fn(),
        setTransform: jest.fn(), strokeStyle: '', fillStyle: '',
        lineWidth: 1, font: '', textAlign: '', textBaseline: ''
      };
      HTMLCanvasElement.prototype.getContext = function () { return ctxStub; };
      // Deterministic geometry + a rAF stub that advances time so the entry
      // animation completes immediately (one frame past its 800ms duration)
      // instead of recursing forever on a fixed timestamp.
      HTMLCanvasElement.prototype.getBoundingClientRect = function () {
        return { left: 0, top: 0, width: 500, height: 500, right: 500, bottom: 500 };
      };
      Object.defineProperty(HTMLElement.prototype, 'clientWidth',
        { configurable: true, get: function () { return 500; } });
      let rafClock = 1000;
      window.requestAnimationFrame = function (cb) { rafClock += 1000; cb(rafClock); return 1; };
      window.cancelAnimationFrame = function () {};
      jest.resetModules();
      CapabilityRadar = require('../src/capability-radar.js');
    });

    function dispatchMove(canvas, x, y) {
      const evt = new window.MouseEvent('mousemove', { clientX: x, clientY: y, bubbles: true });
      canvas.dispatchEvent(evt);
    }

    test('repeated mousemoves over empty area do not trigger extra redraws', () => {
      CapabilityRadar.init('radarRoot');
      const canvas = document.querySelector('#radarRoot canvas');

      // Center of a 500x500 canvas is far from every axis label (labels sit
      // near radius R+22), so getDimAt() returns null for all of these.
      ctxStub.clearRect.mockClear();
      for (let i = 0; i < 25; i++) {
        dispatchMove(canvas, 250 + (i % 3), 250 + (i % 2));
      }

      // First move may redraw once (clearing a prior hover state); after that,
      // moving over empty area must not redraw again. Pre-fix this was 25.
      expect(ctxStub.clearRect.mock.calls.length).toBeLessThanOrEqual(1);
    });

    test('moving onto a dimension label redraws exactly once and shows tooltip', () => {
      CapabilityRadar.init('radarRoot');
      const canvas = document.querySelector('#radarRoot canvas');
      const tooltip = document.querySelector('.radar-tooltip');

      // Dimension 0 sits straight up from center: angle = -PI/2, so its label is
      // at (cx, cy - (R+22)). With size=500, cx=cy=250, R=250*0.75=187.5 ->
      // label center ~ (250, 40.5).
      ctxStub.clearRect.mockClear();
      dispatchMove(canvas, 250, 41);
      expect(ctxStub.clearRect.mock.calls.length).toBe(1);
      expect(tooltip.hidden).toBe(false);

      // Staying on the same dimension should NOT redraw again...
      ctxStub.clearRect.mockClear();
      dispatchMove(canvas, 251, 41);
      dispatchMove(canvas, 250, 42);
      expect(ctxStub.clearRect.mock.calls.length).toBe(0);
      // ...but the tooltip should follow the cursor.
      expect(tooltip.style.left).toBe('250px');

      // Moving back to empty area redraws once and hides the tooltip.
      ctxStub.clearRect.mockClear();
      dispatchMove(canvas, 250, 250);
      expect(ctxStub.clearRect.mock.calls.length).toBe(1);
      expect(tooltip.hidden).toBe(true);
    });

    test('getComputedStyle is resolved once per draw, not per axis label', () => {
      const gcsSpy = jest.spyOn(window, 'getComputedStyle');
      CapabilityRadar.init('radarRoot');
      const canvas = document.querySelector('#radarRoot canvas');

      // Trigger a single redraw by hovering a label.
      gcsSpy.mockClear();
      dispatchMove(canvas, 250, 41);

      // 8 dimensions => pre-fix this was >= 8 calls in one draw; now it is 1.
      const canvasCalls = gcsSpy.mock.calls.filter(c => c[0] === canvas);
      expect(canvasCalls.length).toBeLessThanOrEqual(1);
      gcsSpy.mockRestore();
    });
  });
});
