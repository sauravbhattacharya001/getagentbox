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
});
