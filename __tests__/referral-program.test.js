/**
 * @jest-environment jsdom
 */
'use strict';

const fs = require('fs');
const path = require('path');

const rpSrc = fs.readFileSync(
  path.resolve(__dirname, '..', 'src', 'modules', 'referral-program.js'),
  'utf8'
);

function loadModule() {
  const fn = new Function(rpSrc + '\nreturn ReferralProgram;');
  return fn();
}

function buildDOM() {
  document.body.innerHTML = '<div id="referralProgramRoot"></div>';
}

describe('ReferralProgram', () => {
  let RP;

  beforeEach(() => {
    buildDOM();
    RP = loadModule();
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  test('init renders the referral container', () => {
    RP.init();
    expect(document.querySelector('.referral-container')).not.toBeNull();
  });

  test('init does nothing when root element is missing', () => {
    document.body.innerHTML = '';
    RP.init();
    expect(document.querySelector('.referral-container')).toBeNull();
  });

  test('generate section visible initially, dashboard hidden', () => {
    RP.init();
    expect(document.getElementById('referralGenerate').hidden).toBe(false);
    expect(document.getElementById('referralDashboard').hidden).toBe(true);
  });

  test('valid handle generates link and shows dashboard', () => {
    RP.init();
    document.getElementById('referralHandleInput').value = 'testuser';
    document.getElementById('referralGenBtn').click();
    expect(document.getElementById('referralGenerate').hidden).toBe(true);
    expect(document.getElementById('referralDashboard').hidden).toBe(false);
    expect(document.getElementById('referralLinkInput').value).toBe('https://t.me/AgentBoxBot?start=ref_testuser');
  });

  test('handle with @ prefix is stripped', () => {
    RP.init();
    document.getElementById('referralHandleInput').value = '@myhandle';
    document.getElementById('referralGenBtn').click();
    expect(document.getElementById('referralLinkInput').value).toBe('https://t.me/AgentBoxBot?start=ref_myhandle');
  });

  test('link contains only safe characters', () => {
    RP.init();
    document.getElementById('referralHandleInput').value = 'abc';
    document.getElementById('referralGenBtn').click();
    expect(document.getElementById('referralLinkInput').value).toMatch(/^https:\/\/t\.me\/AgentBoxBot\?start=ref_[a-zA-Z0-9_]+$/);
  });

  test('rejects handle shorter than 3 characters', () => {
    RP.init();
    document.getElementById('referralHandleInput').value = 'ab';
    document.getElementById('referralGenBtn').click();
    expect(document.getElementById('referralHandleHint').textContent).toContain('at least 3 characters');
    expect(document.getElementById('referralDashboard').hidden).toBe(true);
  });

  test('rejects empty handle', () => {
    RP.init();
    document.getElementById('referralGenBtn').click();
    expect(document.getElementById('referralHandleHint').textContent).toContain('at least 3 characters');
  });

  test('rejects handle with invalid characters', () => {
    RP.init();
    document.getElementById('referralHandleInput').value = 'user!name';
    document.getElementById('referralGenBtn').click();
    expect(document.getElementById('referralHandleHint').textContent).toContain('letters, numbers, and underscores');
  });

  test('Enter key triggers generate', () => {
    RP.init();
    const input = document.getElementById('referralHandleInput');
    input.value = 'enteruser';
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    expect(document.getElementById('referralDashboard').hidden).toBe(false);
    expect(document.getElementById('referralLinkInput').value).toContain('ref_enteruser');
  });

  test('simulate populates referrals and activity', () => {
    RP.init();
    document.getElementById('referralHandleInput').value = 'simuser';
    document.getElementById('referralGenBtn').click();
    document.getElementById('referralSimBtn').click();
    const count = parseInt(document.getElementById('referralCount').textContent, 10);
    expect(count).toBeGreaterThanOrEqual(3);
    expect(count).toBeLessThanOrEqual(10);
    expect(document.querySelectorAll('.referral-activity-item').length).toBe(count);
  });

  test('initial tier is Starter at 0 referrals', () => {
    RP.init();
    document.getElementById('referralHandleInput').value = 'tieruser';
    document.getElementById('referralGenBtn').click();
    expect(document.getElementById('referralTierLabel').textContent).toBe('Starter');
    expect(document.getElementById('referralTierIcon').textContent).toBe('🌱');
  });

  test('progress bar starts at 0%', () => {
    RP.init();
    document.getElementById('referralHandleInput').value = 'proguser';
    document.getElementById('referralGenBtn').click();
    expect(document.getElementById('referralProgressFill').style.width).toBe('0%');
    expect(document.getElementById('referralProgressText').textContent).toContain('0 / 3');
  });

  test('renders all 5 tiers with correct labels', () => {
    RP.init();
    expect(document.querySelectorAll('.referral-tier-card').length).toBe(5);
    const names = Array.from(document.querySelectorAll('.referral-tier-name')).map(el => el.textContent);
    expect(names).toEqual(['Starter', 'Connector', 'Advocate', 'Champion', 'Legend']);
  });

  test('reset returns to generate view', () => {
    RP.init();
    document.getElementById('referralHandleInput').value = 'resetuser';
    document.getElementById('referralGenBtn').click();
    document.getElementById('referralResetBtn').click();
    expect(document.getElementById('referralGenerate').hidden).toBe(false);
    expect(document.getElementById('referralDashboard').hidden).toBe(true);
    expect(document.getElementById('referralHandleInput').value).toBe('');
  });

  test('copy button calls clipboard API', () => {
    RP.init();
    document.getElementById('referralHandleInput').value = 'copyuser';
    document.getElementById('referralGenBtn').click();
    Object.assign(navigator, { clipboard: { writeText: jest.fn().mockResolvedValue(undefined) } });
    document.getElementById('referralCopyBtn').click();
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('https://t.me/AgentBoxBot?start=ref_copyuser');
  });

  test('empty activity shows placeholder', () => {
    RP.init();
    document.getElementById('referralHandleInput').value = 'emptyuser';
    document.getElementById('referralGenBtn').click();
    expect(document.querySelector('.referral-activity-empty').textContent).toContain('No referrals yet');
  });

  test('next milestone shows 3 for starter', () => {
    RP.init();
    document.getElementById('referralHandleInput').value = 'mileuser';
    document.getElementById('referralGenBtn').click();
    expect(document.getElementById('referralNextGoal').textContent).toBe('3');
  });

  test('multiple simulations update correctly', () => {
    RP.init();
    document.getElementById('referralHandleInput').value = 'multiuser';
    document.getElementById('referralGenBtn').click();
    document.getElementById('referralSimBtn').click();
    document.getElementById('referralSimBtn').click();
    const count = parseInt(document.getElementById('referralCount').textContent, 10);
    expect(count).toBeGreaterThanOrEqual(3);
    expect(count).toBeLessThanOrEqual(10);
  });

  test('only Starter tier active at 0 referrals', () => {
    RP.init();
    document.getElementById('referralHandleInput').value = 'activeuser';
    document.getElementById('referralGenBtn').click();
    expect(document.querySelectorAll('.referral-tier-active').length).toBe(1);
    expect(document.querySelectorAll('.referral-tier-current').length).toBe(1);
  });

  test('handle input accessibility attributes', () => {
    RP.init();
    const input = document.getElementById('referralHandleInput');
    expect(input.getAttribute('aria-label')).toBe('Telegram handle');
    expect(input.getAttribute('maxlength')).toBe('32');
    expect(input.getAttribute('autocomplete')).toBe('off');
  });

  test('progress bar ARIA attributes', () => {
    RP.init();
    const bar = document.getElementById('referralProgressBar');
    expect(bar.getAttribute('role')).toBe('progressbar');
    expect(bar.getAttribute('aria-valuemin')).toBe('0');
    expect(bar.getAttribute('aria-valuemax')).toBe('100');
  });

  test('activity list ARIA attributes', () => {
    RP.init();
    const list = document.getElementById('referralActivityList');
    expect(list.getAttribute('role')).toBe('list');
    expect(list.getAttribute('aria-label')).toBe('Referral activity');
  });

  test('simulated items have listitem role', () => {
    RP.init();
    document.getElementById('referralHandleInput').value = 'ariauser';
    document.getElementById('referralGenBtn').click();
    document.getElementById('referralSimBtn').click();
    document.querySelectorAll('.referral-activity-item').forEach(item => {
      expect(item.getAttribute('role')).toBe('listitem');
    });
  });
});
