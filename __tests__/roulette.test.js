/**
 * @jest-environment jsdom
 */
'use strict';

const fs = require('fs');
const path = require('path');

const appJs = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');

function setupDOM() {
  document.body.innerHTML = `
    <canvas id="rouletteCanvas" width="340" height="340"></canvas>
    <p id="rouletteResultTitle"></p>
    <p id="rouletteResultDesc"></p>
    <p id="rouletteResultExample"></p>
    <button id="rouletteSpinBtn">Spin!</button>
    <p id="rouletteHistoryLabel" hidden>
      <span id="rouletteHistoryCount">0</span> / <span id="rouletteHistoryTotal">0</span>
    </p>
  `;
}

function mockCanvas() {
  HTMLCanvasElement.prototype.getContext = jest.fn(() => ({
    clearRect: jest.fn(), save: jest.fn(), restore: jest.fn(),
    translate: jest.fn(), rotate: jest.fn(), beginPath: jest.fn(),
    moveTo: jest.fn(), arc: jest.fn(), closePath: jest.fn(),
    fill: jest.fn(), stroke: jest.fn(), fillText: jest.fn(),
    roundRect: jest.fn(), setLineDash: jest.fn(),
    measureText: jest.fn(() => ({ width: 50 })),
    createLinearGradient: jest.fn(() => ({ addColorStop: jest.fn() })),
    createRadialGradient: jest.fn(() => ({ addColorStop: jest.fn() })),
    lineTo: jest.fn(), quadraticCurveTo: jest.fn(), rect: jest.fn(),
    clip: jest.fn(), drawImage: jest.fn(),
    fillStyle: '', strokeStyle: '', lineWidth: 1,
    font: '', textAlign: '', textBaseline: '',
    globalAlpha: 1, shadowColor: '', shadowBlur: 0,
  }));
}

let CR;

beforeAll(() => {
  jest.useFakeTimers();
  setupDOM();
  mockCanvas();
  // Force reduced motion so spins are instant in tests
  window.matchMedia = jest.fn().mockReturnValue({
    matches: true,
    addEventListener: jest.fn(),
  });
  const fn = new Function(appJs);
  fn.call(window);
  document.dispatchEvent(new Event('DOMContentLoaded'));
  jest.advanceTimersByTime(500);
  jest.useRealTimers();
  CR = window.CapabilityRoulette;
});

afterAll(() => {
  try { if (window.Testimonials) window.Testimonials.stopAutoPlay(); } catch (_) {}
  try { if (window.SiteNav) window.SiteNav.destroy(); } catch (_) {}
  try { if (window.CommandPalette) window.CommandPalette.destroy(); } catch (_) {}
});

describe('CapabilityRoulette', () => {
  test('module is defined', () => {
    expect(CR).toBeDefined();
  });

  test('CAPABILITIES has 12 entries', () => {
    expect(CR.CAPABILITIES).toHaveLength(12);
  });

  test('each capability has icon, title, desc, example', () => {
    CR.CAPABILITIES.forEach((cap) => {
      expect(cap.icon.length).toBeGreaterThan(0);
      expect(cap.title.length).toBeGreaterThan(0);
      expect(cap.desc.length).toBeGreaterThan(0);
      expect(cap.example.length).toBeGreaterThan(0);
    });
  });

  test('history total is set to 12', () => {
    expect(document.getElementById('rouletteHistoryTotal').textContent).toBe('12');
  });

  test('spin button is not disabled initially', () => {
    expect(document.getElementById('rouletteSpinBtn').disabled).toBe(false);
  });

  test('spin populates result (reduced motion)', () => {
    document.getElementById('rouletteSpinBtn').click();
    expect(document.getElementById('rouletteResultTitle').textContent.length).toBeGreaterThan(0);
    expect(document.getElementById('rouletteResultDesc').textContent.length).toBeGreaterThan(0);
    expect(document.getElementById('rouletteResultExample').textContent.length).toBeGreaterThan(0);
  });

  test('history label visible and count >= 1 after spin', () => {
    expect(document.getElementById('rouletteHistoryLabel').hidden).toBe(false);
    expect(parseInt(document.getElementById('rouletteHistoryCount').textContent)).toBeGreaterThanOrEqual(1);
  });
});
