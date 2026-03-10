/**
 * @jest-environment jsdom
 */

/* global HelpChatWidget */

// Minimal DOM for HelpChatWidget
function setupDOM() {
  document.body.innerHTML = `
    <div class="help-chat-widget" id="helpChatWidget">
      <button class="help-chat-fab" id="helpChatFab" aria-expanded="false">
        <span class="help-chat-fab-icon" id="helpChatFabIcon">💬</span>
        <span class="help-chat-fab-badge" id="helpChatBadge">1</span>
      </button>
      <div class="help-chat-panel" id="helpChatPanel" hidden>
        <div class="help-chat-header">
          <span class="help-chat-header-title">🤖 AgentBox Help</span>
          <button class="help-chat-close" id="helpChatClose">&times;</button>
        </div>
        <div class="help-chat-messages" id="helpChatMessages"></div>
        <div class="help-chat-options" id="helpChatOptions"></div>
        <div class="help-chat-input-row" id="helpChatInputRow">
          <input type="text" class="help-chat-input" id="helpChatInput">
          <button class="help-chat-send" id="helpChatSend">➤</button>
        </div>
      </div>
    </div>
  `;
}

beforeEach(() => {
  jest.useFakeTimers();
  setupDOM();
  // Re-require to re-run init
  jest.resetModules();
  require('../app.js');
  // Manually fire DOMContentLoaded
  document.dispatchEvent(new Event('DOMContentLoaded'));
});

afterEach(() => {
  jest.useRealTimers();
});

describe('HelpChatWidget', () => {
  test('panel is hidden initially', () => {
    const panel = document.getElementById('helpChatPanel');
    expect(panel.hidden).toBe(true);
  });

  test('clicking fab opens panel', () => {
    const fab = document.getElementById('helpChatFab');
    const panel = document.getElementById('helpChatPanel');
    fab.click();
    jest.advanceTimersByTime(500);
    expect(panel.hidden).toBe(false);
    expect(fab.getAttribute('aria-expanded')).toBe('true');
  });

  test('greeting message appears on first open', () => {
    const fab = document.getElementById('helpChatFab');
    fab.click();
    jest.advanceTimersByTime(500);
    const messages = document.getElementById('helpChatMessages');
    expect(messages.children.length).toBeGreaterThan(0);
    expect(messages.textContent).toContain('AgentBox helper');
  });

  test('badge hides after first open', () => {
    const fab = document.getElementById('helpChatFab');
    const badge = document.getElementById('helpChatBadge');
    expect(badge.hidden).toBeFalsy();
    fab.click();
    jest.advanceTimersByTime(500);
    expect(badge.hidden).toBe(true);
  });

  test('fab icon changes when open/close', () => {
    const fab = document.getElementById('helpChatFab');
    const icon = document.getElementById('helpChatFabIcon');
    expect(icon.textContent).toBe('💬');
    fab.click();
    expect(icon.textContent).toBe('✕');
    fab.click();
    expect(icon.textContent).toBe('💬');
  });

  test('close button closes panel', () => {
    const fab = document.getElementById('helpChatFab');
    const close = document.getElementById('helpChatClose');
    const panel = document.getElementById('helpChatPanel');
    fab.click();
    expect(panel.hidden).toBe(false);
    close.click();
    expect(panel.hidden).toBe(true);
  });

  test('Escape key closes panel', () => {
    const fab = document.getElementById('helpChatFab');
    const panel = document.getElementById('helpChatPanel');
    fab.click();
    expect(panel.hidden).toBe(false);
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(panel.hidden).toBe(true);
  });

  test('clicking option sends user bubble and bot response', () => {
    const fab = document.getElementById('helpChatFab');
    fab.click();
    jest.advanceTimersByTime(500);
    const options = document.getElementById('helpChatOptions');
    const firstBtn = options.querySelector('.help-chat-option-btn');
    expect(firstBtn).not.toBeNull();
    firstBtn.click();
    jest.advanceTimersByTime(500);
    const msgs = document.getElementById('helpChatMessages');
    const bubbles = msgs.querySelectorAll('.help-chat-bubble');
    // greeting (bot) + user click + bot response = at least 3
    expect(bubbles.length).toBeGreaterThanOrEqual(3);
  });

  test('typing in input and pressing Enter sends message', () => {
    const fab = document.getElementById('helpChatFab');
    fab.click();
    jest.advanceTimersByTime(500);
    const input = document.getElementById('helpChatInput');
    input.value = 'how much does it cost?';
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    jest.advanceTimersByTime(500);
    const msgs = document.getElementById('helpChatMessages');
    const userBubbles = msgs.querySelectorAll('.help-chat-bubble.user');
    expect(userBubbles.length).toBeGreaterThanOrEqual(1);
    expect(userBubbles[0].textContent).toContain('how much does it cost');
    // Bot should respond about pricing
    const botBubbles = msgs.querySelectorAll('.help-chat-bubble.bot');
    const lastBot = botBubbles[botBubbles.length - 1];
    expect(lastBot.textContent.toLowerCase()).toMatch(/free|pric/);
  });

  test('send button works', () => {
    const fab = document.getElementById('helpChatFab');
    fab.click();
    jest.advanceTimersByTime(500);
    const input = document.getElementById('helpChatInput');
    const sendBtn = document.getElementById('helpChatSend');
    input.value = 'privacy';
    sendBtn.click();
    jest.advanceTimersByTime(500);
    const msgs = document.getElementById('helpChatMessages');
    const lastBot = msgs.querySelectorAll('.help-chat-bubble.bot');
    expect(lastBot[lastBot.length - 1].textContent.toLowerCase()).toMatch(/privacy|encrypt/);
  });

  test('empty input does nothing', () => {
    const fab = document.getElementById('helpChatFab');
    fab.click();
    jest.advanceTimersByTime(500);
    const msgs = document.getElementById('helpChatMessages');
    const count = msgs.children.length;
    const input = document.getElementById('helpChatInput');
    input.value = '';
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    jest.advanceTimersByTime(500);
    expect(msgs.children.length).toBe(count);
  });

  test('unknown query gets fallback response', () => {
    const fab = document.getElementById('helpChatFab');
    fab.click();
    jest.advanceTimersByTime(500);
    const input = document.getElementById('helpChatInput');
    input.value = 'xyzzy quantum banana';
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    jest.advanceTimersByTime(500);
    const msgs = document.getElementById('helpChatMessages');
    const lastBot = msgs.querySelectorAll('.help-chat-bubble.bot');
    expect(lastBot[lastBot.length - 1].textContent).toContain("not sure");
  });

  test('greeting options are rendered', () => {
    const fab = document.getElementById('helpChatFab');
    fab.click();
    jest.advanceTimersByTime(500);
    const options = document.getElementById('helpChatOptions');
    const btns = options.querySelectorAll('.help-chat-option-btn');
    expect(btns.length).toBe(6);
  });

  test('matchQuery returns correct keys', () => {
    expect(window.HelpChatWidget.matchQuery('how much does it cost')).toBe('pricing');
    expect(window.HelpChatWidget.matchQuery('what features do you have')).toBe('features');
    expect(window.HelpChatWidget.matchQuery('is my data secure')).toBe('privacy');
    expect(window.HelpChatWidget.matchQuery('get started')).toBe('start');
    expect(window.HelpChatWidget.matchQuery('what is agentbox')).toBe('what');
    expect(window.HelpChatWidget.matchQuery('banana')).toBe('fallback');
  });

  test('knowledgeBase has all referenced keys', () => {
    const kb = window.HelpChatWidget.knowledgeBase;
    const allKeys = new Set();
    Object.keys(kb).forEach(k => {
      if (kb[k].options) {
        kb[k].options.forEach(o => allKeys.add(o.key));
      }
    });
    allKeys.forEach(k => {
      expect(kb[k]).toBeDefined();
    });
  });

  test('multiple toggles work correctly', () => {
    const fab = document.getElementById('helpChatFab');
    const panel = document.getElementById('helpChatPanel');
    fab.click(); expect(panel.hidden).toBe(false);
    fab.click(); expect(panel.hidden).toBe(true);
    fab.click(); expect(panel.hidden).toBe(false);
    fab.click(); expect(panel.hidden).toBe(true);
  });

  test('navigation through multiple topics works', () => {
    const fab = document.getElementById('helpChatFab');
    fab.click();
    jest.advanceTimersByTime(500);
    // Click "What is AgentBox?"
    let btns = document.querySelectorAll('.help-chat-option-btn');
    btns[0].click();
    jest.advanceTimersByTime(500);
    // Click "← Back"
    btns = document.querySelectorAll('.help-chat-option-btn');
    const backBtn = Array.from(btns).find(b => b.textContent.includes('Back'));
    expect(backBtn).toBeDefined();
    backBtn.click();
    jest.advanceTimersByTime(500);
    // Should show greeting options again
    btns = document.querySelectorAll('.help-chat-option-btn');
    expect(btns.length).toBe(6);
  });
});
