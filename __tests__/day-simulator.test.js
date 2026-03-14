/**
 * @jest-environment jsdom
 *
 * Tests for Agent Day Simulator module
 */

'use strict';

const fs = require('fs');
const path = require('path');

function loadModule() {
  // Polyfill scrollIntoView for jsdom
  window.HTMLElement.prototype.scrollIntoView = function() {};

  // Set up minimal DOM
  document.body.innerHTML = `
    <div id="dayTimeline"></div>
    <div id="dayDetail"><div class="day-sim-empty">Click an hour above</div></div>
    <button id="dayPlayBtn">▶ Play Day</button>
    <button id="dayResetBtn">↺ Reset</button>
    <div id="dayStats"></div>
  `;

  // Clear module cache
  const modPath = path.resolve(__dirname, '..', 'app.js');
  delete require.cache[modPath];

  // Provide globals the module expects
  global.prefersReducedMotion = true; // fast playback for tests

  const src = fs.readFileSync(modPath, 'utf-8');

  // Extract just the Day Simulator IIFE
  const startMarker = '// ── Agent Day Simulator';
  const startIdx = src.indexOf(startMarker);
  if (startIdx === -1) throw new Error('Day Simulator module not found in app.js');

  // Find the closing })(); for this IIFE
  const iifeStart = src.indexOf('(function() {', startIdx);
  let depth = 0;
  let endIdx = -1;
  for (let i = iifeStart; i < src.length; i++) {
    if (src[i] === '{') depth++;
    else if (src[i] === '}') {
      depth--;
      if (depth === 0) {
        // Find the closing })();
        endIdx = src.indexOf('();', i) + 3;
        break;
      }
    }
  }

  const iifeCode = src.substring(startIdx, endIdx);
  // Execute it
  eval(iifeCode);

  return module.exports;
}

let mod;

beforeAll(() => {
  mod = loadModule();
});

describe('DAY_EVENTS data', () => {
  test('has 8 events', () => {
    expect(mod.DAY_EVENTS).toHaveLength(8);
  });

  test('each event has required fields', () => {
    mod.DAY_EVENTS.forEach((evt) => {
      expect(evt).toHaveProperty('hour');
      expect(evt).toHaveProperty('icon');
      expect(evt).toHaveProperty('label');
      expect(evt).toHaveProperty('title');
      expect(evt).toHaveProperty('channel');
      expect(evt).toHaveProperty('messages');
      expect(evt.messages.length).toBeGreaterThan(0);
    });
  });

  test('events are in chronological order', () => {
    for (let i = 1; i < mod.DAY_EVENTS.length; i++) {
      expect(mod.DAY_EVENTS[i].hour).toBeGreaterThan(mod.DAY_EVENTS[i - 1].hour);
    }
  });

  test('messages have role and text', () => {
    mod.DAY_EVENTS.forEach((evt) => {
      evt.messages.forEach((msg) => {
        expect(['agent', 'user']).toContain(msg.role);
        expect(typeof msg.text).toBe('string');
        expect(msg.text.length).toBeGreaterThan(0);
      });
    });
  });

  test('each event starts with an agent message', () => {
    mod.DAY_EVENTS.forEach((evt) => {
      expect(evt.messages[0].role).toBe('agent');
    });
  });

  test('channels are recognized types', () => {
    const validChannels = ['Telegram', 'WhatsApp', 'Proactive', 'Discord', 'Signal'];
    mod.DAY_EVENTS.forEach((evt) => {
      expect(validChannels).toContain(evt.channel);
    });
  });
});

describe('renderTimeline()', () => {
  test('creates hour buttons in timeline', () => {
    mod.renderTimeline();
    const buttons = document.querySelectorAll('.day-sim-hour');
    expect(buttons.length).toBe(8);
  });

  test('buttons have correct aria attributes', () => {
    mod.renderTimeline();
    const buttons = document.querySelectorAll('.day-sim-hour');
    buttons.forEach((btn) => {
      expect(btn.getAttribute('role')).toBe('tab');
      expect(btn.getAttribute('aria-selected')).toBe('false');
      expect(btn.getAttribute('aria-label')).toBeTruthy();
    });
  });

  test('buttons display icon and time', () => {
    mod.renderTimeline();
    const first = document.querySelector('.day-sim-hour');
    expect(first.querySelector('.hour-icon').textContent).toBe('☀️');
    expect(first.querySelector('.hour-time').textContent).toBe('7 AM');
  });
});

describe('selectHour()', () => {
  beforeEach(() => {
    mod.renderTimeline();
    mod.resetDay();
  });

  test('activates the selected hour', () => {
    mod.selectHour(0);
    const buttons = document.querySelectorAll('.day-sim-hour');
    expect(buttons[0].classList.contains('active')).toBe(true);
    expect(buttons[0].getAttribute('aria-selected')).toBe('true');
  });

  test('deactivates other hours', () => {
    mod.selectHour(0);
    mod.selectHour(1);
    const buttons = document.querySelectorAll('.day-sim-hour');
    expect(buttons[0].classList.contains('active')).toBe(false);
    expect(buttons[1].classList.contains('active')).toBe(true);
  });

  test('marks previously visited hours', () => {
    mod.selectHour(0);
    mod.selectHour(1);
    const buttons = document.querySelectorAll('.day-sim-hour');
    expect(buttons[0].classList.contains('visited')).toBe(true);
  });

  test('renders event detail', () => {
    mod.selectHour(0);
    const detail = document.getElementById('dayDetail');
    expect(detail.innerHTML).toContain('Morning Briefing');
    expect(detail.innerHTML).toContain('Telegram');
    expect(detail.innerHTML).toContain('AgentBox');
  });

  test('out-of-range index is ignored', () => {
    mod.selectHour(-1);
    const state = mod._getState();
    expect(state.activeHour).toBe(-1);

    mod.selectHour(100);
    expect(mod._getState().activeHour).toBe(-1);
  });

  test('updates stats display', () => {
    mod.selectHour(0);
    const stats = document.getElementById('dayStats');
    expect(stats.textContent).toContain('1/8');
    expect(stats.textContent).toContain('agent actions');
  });
});

describe('renderDetail()', () => {
  test('displays agent messages with agent label', () => {
    mod.renderTimeline();
    mod.selectHour(0);
    const msgs = document.querySelectorAll('.day-sim-msg.agent');
    expect(msgs.length).toBeGreaterThan(0);
    expect(msgs[0].querySelector('.msg-label').textContent).toContain('AgentBox');
  });

  test('displays user messages with user label', () => {
    mod.renderTimeline();
    mod.selectHour(0); // Morning briefing has user messages
    const msgs = document.querySelectorAll('.day-sim-msg.user');
    expect(msgs.length).toBeGreaterThan(0);
    expect(msgs[0].querySelector('.msg-label').textContent).toContain('You');
  });

  test('escapes HTML in messages', () => {
    mod.renderTimeline();
    mod.selectHour(0);
    const detail = document.getElementById('dayDetail');
    // No raw < or > from event content
    const chatHtml = detail.innerHTML;
    expect(chatHtml).not.toContain('<script>');
  });
});

describe('resetDay()', () => {
  test('clears all state', () => {
    mod.renderTimeline();
    mod.selectHour(0);
    mod.selectHour(1);
    mod.resetDay();

    const state = mod._getState();
    expect(state.activeHour).toBe(-1);
    expect(Object.keys(state.visitedHours)).toHaveLength(0);
    expect(state.totalActions).toBe(0);
  });

  test('restores empty detail message', () => {
    mod.renderTimeline();
    mod.selectHour(0);
    mod.resetDay();
    const detail = document.getElementById('dayDetail');
    expect(detail.textContent).toContain('Click an hour above');
  });

  test('removes active/visited classes', () => {
    mod.renderTimeline();
    mod.selectHour(0);
    mod.selectHour(1);
    mod.resetDay();
    const buttons = document.querySelectorAll('.day-sim-hour');
    buttons.forEach((btn) => {
      expect(btn.classList.contains('active')).toBe(false);
      expect(btn.classList.contains('visited')).toBe(false);
    });
  });

  test('clears stats', () => {
    mod.renderTimeline();
    mod.selectHour(0);
    mod.resetDay();
    expect(document.getElementById('dayStats').textContent).toBe('');
  });
});

describe('playDay()', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mod.renderTimeline();
    mod.resetDay();
  });

  afterEach(() => {
    mod.stopPlay();
    jest.useRealTimers();
  });

  test('starts playback and selects first hour', () => {
    mod.playDay();
    expect(mod._getState().activeHour).toBe(0);
  });

  test('advances through hours on timer', () => {
    mod.playDay();
    // prefersReducedMotion = true, so delay = 500ms
    jest.advanceTimersByTime(500);
    expect(mod._getState().activeHour).toBe(1);

    jest.advanceTimersByTime(500);
    expect(mod._getState().activeHour).toBe(2);
  });

  test('disables play button during playback', () => {
    mod.playDay();
    const btn = document.getElementById('dayPlayBtn');
    expect(btn.disabled).toBe(true);
    expect(btn.textContent).toContain('Playing');
  });

  test('re-enables play button after completion', () => {
    mod.playDay();
    // Advance through all 8 events
    for (let i = 0; i < 8; i++) {
      jest.advanceTimersByTime(500);
    }
    const btn = document.getElementById('dayPlayBtn');
    expect(btn.disabled).toBe(false);
  });
});

describe('stopPlay()', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mod.renderTimeline();
    mod.resetDay();
  });

  afterEach(() => {
    mod.stopPlay();
    jest.useRealTimers();
  });

  test('stops advancing', () => {
    mod.playDay();
    jest.advanceTimersByTime(500); // hour 1
    mod.stopPlay();
    jest.advanceTimersByTime(2000);
    // Should still be at hour 1
    expect(mod._getState().activeHour).toBe(1);
  });

  test('re-enables play button', () => {
    mod.playDay();
    mod.stopPlay();
    const btn = document.getElementById('dayPlayBtn');
    expect(btn.disabled).toBe(false);
    expect(btn.textContent).toContain('Play');
  });
});

describe('updateStats()', () => {
  test('shows visited count and actions', () => {
    mod.renderTimeline();
    mod.resetDay();
    mod.selectHour(0);
    mod.selectHour(3);
    const stats = document.getElementById('dayStats').textContent;
    expect(stats).toContain('2/8');
  });
});
