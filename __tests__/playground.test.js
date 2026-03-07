/**
 * @jest-environment jsdom
 */

'use strict';

const fs = require('fs');
const path = require('path');

const html = fs.readFileSync(path.resolve(__dirname, '../index.html'), 'utf8');
const appJs = fs.readFileSync(path.resolve(__dirname, '../app.js'), 'utf8');

function setup() {
  document.documentElement.innerHTML = html;
  delete global.Playground;
  delete global.prefersReducedMotion;
  global.prefersReducedMotion = false;

  global.IntersectionObserver = class {
    constructor(cb) { this._cb = cb; }
    observe() { this._cb([{ isIntersecting: true }]); }
    unobserve() {}
    disconnect() {}
  };

  eval(appJs);
  Playground.init();
}

beforeEach(() => {
  jest.useFakeTimers();
  setup();
});

afterEach(() => {
  jest.useRealTimers();
});

function getMessages() {
  return document.getElementById('playgroundMessages');
}

/** Get the last bot bubble (skipping the initial welcome message). */
function getLastBotBubble() {
  const bots = getMessages().querySelectorAll('.chat-bubble.bot');
  return bots.length > 0 ? bots[bots.length - 1] : null;
}

function submitMessage(text) {
  const input = document.getElementById('playgroundInput');
  const form = document.getElementById('playgroundForm');
  input.value = text;
  form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
}

describe('Playground', () => {
  test('init binds form and input', () => {
    const form = document.getElementById('playgroundForm');
    const input = document.getElementById('playgroundInput');
    expect(form).not.toBeNull();
    expect(input).not.toBeNull();
    expect(input.getAttribute('maxlength')).toBe('500');
  });

  test('has an initial welcome message', () => {
    const bots = getMessages().querySelectorAll('.chat-bubble.bot');
    expect(bots.length).toBe(1);
    expect(bots[0].textContent).toContain('AgentBox demo');
  });

  test('submitting message adds user bubble', () => {
    submitMessage('hello');
    const bubbles = getMessages().querySelectorAll('.chat-bubble.user');
    expect(bubbles.length).toBe(1);
    expect(bubbles[0].textContent).toBe('hello');
  });

  test('submitting empty message does nothing', () => {
    const countBefore = getMessages().children.length;
    submitMessage('');
    expect(getMessages().children.length).toBe(countBefore);
  });

  test('submitting whitespace-only message does nothing', () => {
    const countBefore = getMessages().children.length;
    submitMessage('   ');
    expect(getMessages().children.length).toBe(countBefore);
  });

  test('bot replies after delay', () => {
    submitMessage('hello');
    // Typing indicator should appear
    const typing = document.getElementById('playgroundTyping');
    expect(typing).not.toBeNull();

    // After delay, bot bubble appears
    jest.advanceTimersByTime(3000);
    const botBubbles = getMessages().querySelectorAll('.chat-bubble.bot');
    // Welcome + response = 2
    expect(botBubbles.length).toBe(2);
    expect(document.getElementById('playgroundTyping')).toBeNull();
  });

  test('finds response for weather keyword', () => {
    submitMessage('what is the weather today?');
    jest.advanceTimersByTime(3000);
    expect(getLastBotBubble().textContent).toContain('weather');
  });

  test('finds response for recipe keyword', () => {
    submitMessage('can you suggest a recipe?');
    jest.advanceTimersByTime(3000);
    expect(getLastBotBubble().textContent.toLowerCase()).toContain('recipe');
  });

  test('finds response for code keyword', () => {
    submitMessage('help me debug this code');
    jest.advanceTimersByTime(3000);
    expect(getLastBotBubble().textContent).toBeTruthy();
  });

  test('finds response for price keyword', () => {
    submitMessage('what is the price?');
    jest.advanceTimersByTime(3000);
    expect(getLastBotBubble().textContent).toContain('free');
  });

  test('finds response for privacy keyword', () => {
    submitMessage('is my data private?');
    jest.advanceTimersByTime(3000);
    expect(getLastBotBubble().textContent).toContain('data');
  });

  test('finds response for memory keyword', () => {
    submitMessage('do you have memory?');
    jest.advanceTimersByTime(3000);
    expect(getLastBotBubble().textContent).toContain('remember');
  });

  test('returns fallback for unknown input', () => {
    submitMessage('xyzzy123 plugh');
    jest.advanceTimersByTime(3000);
    expect(getLastBotBubble().textContent).toMatch(/Telegram|full version|real/i);
  });

  test('fallback cycles through different messages', () => {
    const replies = [];
    for (let i = 0; i < 4; i++) {
      submitMessage('xyzzy' + i + ' unique' + i);
      jest.advanceTimersByTime(3000);
    }
    const bots = getMessages().querySelectorAll('.chat-bubble.bot');
    // Skip first bot (welcome), collect responses
    for (let i = 1; i < bots.length; i++) {
      replies.push(bots[i].textContent);
    }
    const unique = new Set(replies);
    expect(unique.size).toBeGreaterThanOrEqual(2);
  });

  test('input is cleared after submit', () => {
    const input = document.getElementById('playgroundInput');
    input.value = 'test message';
    submitMessage('test message');
    expect(input.value).toBe('');
  });

  test('truncates very long input', () => {
    const longText = 'a'.repeat(600);
    submitMessage(longText);
    const userBubble = getMessages().querySelector('.chat-bubble.user');
    expect(userBubble.textContent.length).toBeLessThanOrEqual(500);
  });

  test('rapid submissions cancel pending replies', () => {
    submitMessage('hello');
    submitMessage('weather');
    jest.advanceTimersByTime(3000);

    const botBubbles = getMessages().querySelectorAll('.chat-bubble.bot');
    // Welcome + 1 response (second cancels first) = 2
    expect(botBubbles.length).toBe(2);
    expect(getLastBotBubble().textContent).toContain('weather');
  });

  test('evicts old messages when MAX_MESSAGES exceeded', () => {
    for (let i = 0; i < 30; i++) {
      submitMessage('msg ' + i);
      jest.advanceTimersByTime(3000);
    }
    const container = getMessages();
    expect(container.children.length).toBeLessThanOrEqual(50);
  });

  test('responds to hi pattern', () => {
    submitMessage('hi');
    jest.advanceTimersByTime(3000);
    expect(getLastBotBubble().textContent).toContain('AgentBox');
  });

  test('responds to hey pattern', () => {
    submitMessage('hey');
    jest.advanceTimersByTime(3000);
    expect(getLastBotBubble().textContent).toContain('AgentBox');
  });

  test('responds to help keyword', () => {
    submitMessage('what can you do?');
    jest.advanceTimersByTime(3000);
    expect(getLastBotBubble().textContent).toContain('help');
  });

  test('responds to thanks keyword', () => {
    submitMessage('thanks!');
    jest.advanceTimersByTime(3000);
    expect(getLastBotBubble().textContent).toContain('welcome');
  });

  test('responds to image keyword', () => {
    submitMessage('send me a photo');
    jest.advanceTimersByTime(3000);
    expect(getLastBotBubble().textContent).toContain('photo');
  });

  test('responds to voice keyword', () => {
    submitMessage('voice');
    jest.advanceTimersByTime(3000);
    expect(getLastBotBubble().textContent).toContain('voice');
  });

  test('responds to reminder keyword', () => {
    submitMessage('remind me');
    jest.advanceTimersByTime(3000);
    expect(getLastBotBubble().textContent).toContain('Reminder');
  });

  test('handles multi-word pattern "what are you"', () => {
    submitMessage('what are you exactly?');
    jest.advanceTimersByTime(3000);
    expect(getLastBotBubble().textContent).toContain('AgentBox');
  });

  test('reduced motion shortens reply delay', () => {
    // Reset and re-setup with reduced motion enabled via matchMedia mock
    document.documentElement.innerHTML = html;
    delete global.Playground;
    delete global.prefersReducedMotion;

    const origMatchMedia = window.matchMedia;
    window.matchMedia = function(q) {
      if (q === '(prefers-reduced-motion: reduce)') {
        return { matches: true, addEventListener: function() {} };
      }
      return origMatchMedia ? origMatchMedia(q) : { matches: false, addEventListener: function() {} };
    };

    global.IntersectionObserver = class {
      constructor(cb) { this._cb = cb; }
      observe() { this._cb([{ isIntersecting: true }]); }
      unobserve() {}
      disconnect() {}
    };

    eval(appJs);
    Playground.init();

    submitMessage('hello');
    // With reduced motion delay is 200ms
    jest.advanceTimersByTime(250);
    const bots = getMessages().querySelectorAll('.chat-bubble.bot');
    expect(bots.length).toBe(2); // welcome + reply

    window.matchMedia = origMatchMedia;
  });
});

