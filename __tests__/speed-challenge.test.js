/**
 * @jest-environment jsdom
 */
'use strict';

const fs = require('fs');
const path = require('path');

function loadModule() {
  document.body.innerHTML = `
    <button class="speed-prompt-btn" data-prompt="What's the capital of Bhutan?" aria-pressed="false">Bhutan</button>
    <button class="speed-prompt-btn" data-prompt="Convert 72°F to Celsius" aria-pressed="false">Temp</button>
    <div id="speedArena" hidden>
      <div id="speedLaneTraditional">
        <div id="speedStepsTraditional" role="list"></div>
        <div id="speedTimerTraditional">0.0s</div>
        <div id="speedAnswerTraditional"></div>
      </div>
      <div id="speedLaneAgent">
        <div id="speedStepsAgent" role="list"></div>
        <div id="speedTimerAgent">0.0s</div>
        <div id="speedAnswerAgent"></div>
      </div>
    </div>
    <div id="speedResult" hidden></div>
    <button id="speedResetBtn" hidden></button>
  `;

  const modPath = path.resolve(__dirname, '..', 'app.js');
  const src = fs.readFileSync(modPath, 'utf-8');

  const startMarker = '// ── Speed Challenge';
  const startIdx = src.indexOf(startMarker);
  if (startIdx === -1) throw new Error('Speed Challenge module not found in app.js');

  const chunk = src.slice(startIdx);
  // eslint-disable-next-line no-eval
  const fn = new Function(chunk + '\nreturn SpeedChallenge;');
  return fn();
}

describe('SpeedChallenge', () => {
  let SC;

  beforeEach(() => {
    jest.useFakeTimers();
    SC = loadModule();
    SC.init();
  });

  afterEach(() => {
    if (SC) SC.resetRace();
    jest.useRealTimers();
    document.body.innerHTML = '';
  });

  test('has answer data for all 5 prompts', () => {
    expect(Object.keys(SC._ANSWERS)).toHaveLength(5);
  });

  test('traditional steps > agent steps', () => {
    expect(SC._TRADITIONAL_STEPS.length).toBeGreaterThan(SC._AGENT_STEPS.length);
  });

  test('traditional total time > agent total time', () => {
    const tTotal = SC._TRADITIONAL_STEPS.reduce((s, x) => s + x.duration, 0);
    const aTotal = SC._AGENT_STEPS.reduce((s, x) => s + x.duration, 0);
    expect(tTotal).toBeGreaterThan(aTotal);
  });

  test('clicking prompt shows arena', () => {
    const btn = document.querySelector('.speed-prompt-btn');
    btn.click();
    expect(document.getElementById('speedArena').hidden).toBe(false);
  });

  test('clicking prompt sets aria-pressed', () => {
    const btns = document.querySelectorAll('.speed-prompt-btn');
    btns[0].click();
    expect(btns[0].getAttribute('aria-pressed')).toBe('true');
    expect(btns[1].getAttribute('aria-pressed')).toBe('false');
  });

  test('creates step elements for both lanes', () => {
    document.querySelector('.speed-prompt-btn').click();
    const tSteps = document.querySelectorAll('#speedStepsTraditional .speed-step');
    const aSteps = document.querySelectorAll('#speedStepsAgent .speed-step');
    expect(tSteps.length).toBe(SC._TRADITIONAL_STEPS.length);
    expect(aSteps.length).toBe(SC._AGENT_STEPS.length);
  });

  test('agent finishes before traditional', () => {
    document.querySelector('.speed-prompt-btn').click();
    const aTotal = SC._AGENT_STEPS.reduce((s, x) => s + x.duration, 0);
    jest.advanceTimersByTime(aTotal + 50);
    const answerA = document.getElementById('speedAnswerAgent');
    expect(answerA.textContent).not.toBe('');
    expect(answerA.classList.contains('visible')).toBe(true);
    const answerT = document.getElementById('speedAnswerTraditional');
    expect(answerT.textContent).toBe('');
  });

  test('agent lane gets winner class', () => {
    document.querySelector('.speed-prompt-btn').click();
    const aTotal = SC._AGENT_STEPS.reduce((s, x) => s + x.duration, 0);
    jest.advanceTimersByTime(aTotal + 50);
    expect(document.getElementById('speedLaneAgent').classList.contains('winner')).toBe(true);
  });

  test('both finish shows result', () => {
    document.querySelector('.speed-prompt-btn').click();
    const tTotal = SC._TRADITIONAL_STEPS.reduce((s, x) => s + x.duration, 0);
    jest.advanceTimersByTime(tTotal + 200);
    const result = document.getElementById('speedResult');
    expect(result.hidden).toBe(false);
    expect(result.textContent).toContain('faster');
  });

  test('reset button appears after race', () => {
    document.querySelector('.speed-prompt-btn').click();
    const tTotal = SC._TRADITIONAL_STEPS.reduce((s, x) => s + x.duration, 0);
    jest.advanceTimersByTime(tTotal + 200);
    expect(document.getElementById('speedResetBtn').hidden).toBe(false);
  });

  test('reset hides arena and result', () => {
    document.querySelector('.speed-prompt-btn').click();
    const tTotal = SC._TRADITIONAL_STEPS.reduce((s, x) => s + x.duration, 0);
    jest.advanceTimersByTime(tTotal + 200);
    SC.resetRace();
    expect(document.getElementById('speedArena').hidden).toBe(true);
    expect(document.getElementById('speedResult').hidden).toBe(true);
    expect(document.getElementById('speedResetBtn').hidden).toBe(true);
  });

  test('reset clears aria-pressed on buttons', () => {
    document.querySelector('.speed-prompt-btn').click();
    SC.resetRace();
    document.querySelectorAll('.speed-prompt-btn').forEach(btn => {
      expect(btn.getAttribute('aria-pressed')).toBe('false');
    });
  });

  test('reset removes winner class', () => {
    document.querySelector('.speed-prompt-btn').click();
    const aTotal = SC._AGENT_STEPS.reduce((s, x) => s + x.duration, 0);
    jest.advanceTimersByTime(aTotal + 50);
    SC.resetRace();
    expect(document.getElementById('speedLaneAgent').classList.contains('winner')).toBe(false);
  });

  test('cannot start second race while running', () => {
    const btns = document.querySelectorAll('.speed-prompt-btn');
    btns[0].click();
    btns[1].click();
    // First button should still be pressed since second click was ignored
    expect(btns[0].getAttribute('aria-pressed')).toBe('true');
  });

  test('reset button click calls resetRace', () => {
    document.querySelector('.speed-prompt-btn').click();
    const tTotal = SC._TRADITIONAL_STEPS.reduce((s, x) => s + x.duration, 0);
    jest.advanceTimersByTime(tTotal + 200);
    document.getElementById('speedResetBtn').click();
    expect(document.getElementById('speedArena').hidden).toBe(true);
  });

  test('steps have role listitem', () => {
    document.querySelector('.speed-prompt-btn').click();
    const steps = document.querySelectorAll('.speed-step');
    steps.forEach(s => {
      expect(s.getAttribute('role')).toBe('listitem');
    });
  });

  test('speedup factor is correct', () => {
    document.querySelector('.speed-prompt-btn').click();
    const tTotal = SC._TRADITIONAL_STEPS.reduce((s, x) => s + x.duration, 0);
    const aTotal = SC._AGENT_STEPS.reduce((s, x) => s + x.duration, 0);
    jest.advanceTimersByTime(tTotal + 200);
    const expected = (tTotal / aTotal).toFixed(1);
    expect(document.getElementById('speedResult').textContent).toContain(expected + 'x');
  });

  test('each answer maps to correct prompt', () => {
    const answers = SC._ANSWERS;
    expect(answers["What's the capital of Bhutan?"]).toContain('Thimphu');
    expect(answers["Convert 72°F to Celsius"]).toContain('22.2');
    expect(answers["Who painted the Mona Lisa?"]).toContain('Leonardo');
    expect(answers["How many ounces in a gallon?"]).toContain('128');
    expect(answers["What year did the Berlin Wall fall?"]).toContain('1989');
  });

  test('timer shows correct final time for agent', () => {
    document.querySelector('.speed-prompt-btn').click();
    const aTotal = SC._AGENT_STEPS.reduce((s, x) => s + x.duration, 0);
    jest.advanceTimersByTime(aTotal + 50);
    expect(document.getElementById('speedTimerAgent').textContent).toBe((aTotal / 1000).toFixed(1) + 's');
  });

  test('startRace with unknown prompt uses fallback answer', () => {
    SC.startRace('Unknown question?');
    const aTotal = SC._AGENT_STEPS.reduce((s, x) => s + x.duration, 0);
    jest.advanceTimersByTime(aTotal + 50);
    expect(document.getElementById('speedAnswerAgent').textContent).toBe('Answer found!');
  });

  test('init is idempotent with no elements', () => {
    document.body.innerHTML = '';
    expect(() => SC.init()).not.toThrow();
  });

  test('agent steps have expected text', () => {
    expect(SC._AGENT_STEPS[0].text).toBe('Send message');
    expect(SC._AGENT_STEPS[2].text).toBe('Answer ready!');
  });

  test('traditional steps include scan and click', () => {
    const texts = SC._TRADITIONAL_STEPS.map(s => s.text);
    expect(texts).toContain('Scan results');
    expect(texts).toContain('Click a result');
  });

  test('can run multiple races after reset', () => {
    const btns = document.querySelectorAll('.speed-prompt-btn');
    btns[0].click();
    const tTotal = SC._TRADITIONAL_STEPS.reduce((s, x) => s + x.duration, 0);
    jest.advanceTimersByTime(tTotal + 200);
    SC.resetRace();

    btns[1].click();
    expect(document.getElementById('speedArena').hidden).toBe(false);
    jest.advanceTimersByTime(tTotal + 200);
    expect(document.getElementById('speedResult').textContent).toContain('faster');
  });
});
