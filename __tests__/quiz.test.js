/**
 * @jest-environment jsdom
 */
'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'styles.css'), 'utf8');
const appJs = fs.readFileSync(path.join(root, 'app.js'), 'utf8');

function loadPage() {
  const callerOwnsFakeTimers = typeof setTimeout.clock !== 'undefined';
  if (!callerOwnsFakeTimers) jest.useFakeTimers();

  document.documentElement.innerHTML = '';
  document.write(html);
  document.close();

  const styleEl = document.createElement('style');
  styleEl.textContent = css;
  document.head.appendChild(styleEl);

  const scriptFn = new Function(appJs);
  scriptFn.call(window);

  document.dispatchEvent(new Event('DOMContentLoaded'));
  jest.advanceTimersByTime(300);

  if (!callerOwnsFakeTimers) jest.useRealTimers();
}

afterAll(() => {
  try { if (window.Testimonials) window.Testimonials.stopAutoPlay(); } catch (_) {}
  try { if (window.SiteNav) window.SiteNav.destroy(); } catch (_) {}
  try { if (window.CommandPalette) window.CommandPalette.destroy(); } catch (_) {}
});

describe('OnboardingQuiz', () => {

  beforeAll(() => loadPage());

  describe('init and DOM', () => {
    test('quiz section exists in DOM', () => {
      expect(document.getElementById('quizSection')).not.toBeNull();
    });

    test('start button is visible', () => {
      const btn = document.getElementById('quizStartBtn');
      expect(btn).not.toBeNull();
      expect(btn.textContent).toBe('Take the Quiz');
    });

    test('progress bar starts at 0', () => {
      const bar = document.getElementById('quizProgressBar');
      expect(bar.style.width).toBe('0%');
    });

    test('result area is initially hidden', () => {
      const result = document.getElementById('quizResult');
      expect(result.hidden).toBe(true);
    });

    test('quiz link in navigation', () => {
      const navLink = document.querySelector('a[href="#quizSection"]');
      expect(navLink).not.toBeNull();
    });
  });

  describe('QUESTIONS data', () => {
    test('has 5 questions', () => {
      expect(window.OnboardingQuiz.QUESTIONS.length).toBe(5);
    });

    test('each question has id, text, and 3 options', () => {
      window.OnboardingQuiz.QUESTIONS.forEach(function (q) {
        expect(q.id).toBeDefined();
        expect(q.text.length).toBeGreaterThan(0);
        expect(q.options.length).toBe(3);
        q.options.forEach(function (opt) {
          expect(opt.label).toBeDefined();
          expect(opt.icon).toBeDefined();
          expect(opt.value).toBeDefined();
        });
      });
    });

    test('question ids are unique', () => {
      const ids = window.OnboardingQuiz.QUESTIONS.map(function (q) { return q.id; });
      expect(new Set(ids).size).toBe(ids.length);
    });
  });

  describe('PLANS data', () => {
    test('has free, pro, and team plans', () => {
      expect(window.OnboardingQuiz.PLANS.free).toBeDefined();
      expect(window.OnboardingQuiz.PLANS.pro).toBeDefined();
      expect(window.OnboardingQuiz.PLANS.team).toBeDefined();
    });

    test('each plan has name, icon, desc, cta, cls', () => {
      Object.keys(window.OnboardingQuiz.PLANS).forEach(function (key) {
        var plan = window.OnboardingQuiz.PLANS[key];
        expect(plan.name).toBeDefined();
        expect(plan.icon).toBeDefined();
        expect(plan.desc.length).toBeGreaterThan(0);
        expect(plan.cta.length).toBeGreaterThan(0);
        expect(plan.cls).toMatch(/^quiz-plan-/);
      });
    });
  });

  describe('question flow', () => {
    beforeEach(() => {
      window.OnboardingQuiz.reset();
    });

    test('clicking start shows first question', () => {
      const startBtn = document.getElementById('quizStartBtn');
      startBtn.click();
      const qTitle = document.querySelector('.quiz-q-title');
      expect(qTitle).not.toBeNull();
      expect(qTitle.textContent).toBe(window.OnboardingQuiz.QUESTIONS[0].text);
    });

    test('start screen is hidden after clicking start', () => {
      const startEl = document.getElementById('quizStart');
      const startBtn = document.getElementById('quizStartBtn');
      startBtn.click();
      expect(startEl.style.display).toBe('none');
    });

    test('question renders 3 option buttons', () => {
      document.getElementById('quizStartBtn').click();
      const options = document.querySelectorAll('.quiz-option');
      expect(options.length).toBe(3);
    });

    test('options have role=radio and aria-checked', () => {
      document.getElementById('quizStartBtn').click();
      const options = document.querySelectorAll('.quiz-option');
      options.forEach(function (opt) {
        expect(opt.getAttribute('role')).toBe('radio');
        expect(opt.getAttribute('aria-checked')).toBe('false');
      });
    });

    test('first question has no back button', () => {
      document.getElementById('quizStartBtn').click();
      expect(document.querySelector('.quiz-back-btn')).toBeNull();
    });

    test('second question has back button', () => {
      jest.useFakeTimers();
      document.getElementById('quizStartBtn').click();
      document.querySelectorAll('.quiz-option')[0].click();
      jest.advanceTimersByTime(400);
      expect(document.querySelector('.quiz-back-btn')).not.toBeNull();
      jest.useRealTimers();
    });

    test('back button goes to previous question', () => {
      jest.useFakeTimers();
      document.getElementById('quizStartBtn').click();
      document.querySelectorAll('.quiz-option')[0].click();
      jest.advanceTimersByTime(400);
      var backBtn = document.querySelector('.quiz-back-btn');
      backBtn.click();
      var qTitle = document.querySelector('.quiz-q-title');
      expect(qTitle.textContent).toBe(window.OnboardingQuiz.QUESTIONS[0].text);
      jest.useRealTimers();
    });

    test('selecting an option adds selected class', () => {
      document.getElementById('quizStartBtn').click();
      var opt = document.querySelectorAll('.quiz-option')[1];
      opt.click();
      expect(opt.classList.contains('selected')).toBe(true);
      expect(opt.getAttribute('aria-checked')).toBe('true');
    });

    test('progress bar updates as questions advance', () => {
      jest.useFakeTimers();
      document.getElementById('quizStartBtn').click();
      document.querySelectorAll('.quiz-option')[0].click();
      jest.advanceTimersByTime(400);
      var bar = document.getElementById('quizProgressBar');
      expect(bar.style.width).toBe('20%');
      jest.useRealTimers();
    });
  });

  describe('scorePlan logic', () => {
    test('light+solo+search+low+cost -> free', () => {
      window.OnboardingQuiz._setAnswers({
        usage: 'light', team: 'solo', features: 'search',
        volume: 'low', priority: 'cost'
      });
      var result = window.OnboardingQuiz.scorePlan();
      expect(result.plan).toBe('free');
      expect(result.reasons.length).toBeGreaterThan(0);
    });

    test('daily+solo+memory+medium+unlimited -> pro', () => {
      window.OnboardingQuiz._setAnswers({
        usage: 'daily', team: 'solo', features: 'memory',
        volume: 'medium', priority: 'unlimited'
      });
      var result = window.OnboardingQuiz.scorePlan();
      expect(result.plan).toBe('pro');
    });

    test('heavy+large_team+productivity+high+collaboration -> team', () => {
      window.OnboardingQuiz._setAnswers({
        usage: 'heavy', team: 'large_team', features: 'productivity',
        volume: 'high', priority: 'collaboration'
      });
      var result = window.OnboardingQuiz.scorePlan();
      expect(result.plan).toBe('team');
    });

    test('heavy+small_team+search+high+collaboration -> team', () => {
      window.OnboardingQuiz._setAnswers({
        usage: 'heavy', team: 'small_team', features: 'search',
        volume: 'high', priority: 'collaboration'
      });
      var result = window.OnboardingQuiz.scorePlan();
      expect(result.plan).toBe('team');
    });

    test('daily+solo+productivity+medium+unlimited -> pro', () => {
      window.OnboardingQuiz._setAnswers({
        usage: 'daily', team: 'solo', features: 'productivity',
        volume: 'medium', priority: 'unlimited'
      });
      var result = window.OnboardingQuiz.scorePlan();
      expect(result.plan).toBe('pro');
    });

    test('result always has reasons array', () => {
      window.OnboardingQuiz._setAnswers({
        usage: 'light', team: 'solo', features: 'search',
        volume: 'low', priority: 'cost'
      });
      var result = window.OnboardingQuiz.scorePlan();
      expect(Array.isArray(result.reasons)).toBe(true);
      expect(result.reasons.length).toBeGreaterThan(0);
    });

    test('result has scores object with all plans', () => {
      window.OnboardingQuiz._setAnswers({
        usage: 'daily', team: 'solo', features: 'memory',
        volume: 'medium', priority: 'unlimited'
      });
      var result = window.OnboardingQuiz.scorePlan();
      expect(result.scores.free).toBeDefined();
      expect(result.scores.pro).toBeDefined();
      expect(result.scores.team).toBeDefined();
    });
  });

  describe('full flow to result', () => {
    test('completing all 5 questions shows result', () => {
      jest.useFakeTimers();
      window.OnboardingQuiz.reset();
      document.getElementById('quizStartBtn').click();

      for (var i = 0; i < 5; i++) {
        document.querySelectorAll('.quiz-option')[0].click();
        jest.advanceTimersByTime(400);
      }

      var result = document.getElementById('quizResult');
      expect(result.hidden).toBe(false);

      var title = document.getElementById('quizResultTitle');
      expect(title.textContent).toMatch(/We recommend:/);

      var cta = document.getElementById('quizResultCta');
      expect(cta.textContent.length).toBeGreaterThan(0);
      expect(cta.href).toContain('t.me');

      jest.useRealTimers();
    });

    test('result reasons list is populated', () => {
      jest.useFakeTimers();
      window.OnboardingQuiz.reset();
      document.getElementById('quizStartBtn').click();
      for (var i = 0; i < 5; i++) {
        document.querySelectorAll('.quiz-option')[0].click();
        jest.advanceTimersByTime(400);
      }
      var reasons = document.querySelectorAll('#quizResultReasons li');
      expect(reasons.length).toBeGreaterThan(0);
      jest.useRealTimers();
    });

    test('progress bar shows 100% at result', () => {
      jest.useFakeTimers();
      window.OnboardingQuiz.reset();
      document.getElementById('quizStartBtn').click();
      for (var i = 0; i < 5; i++) {
        document.querySelectorAll('.quiz-option')[0].click();
        jest.advanceTimersByTime(400);
      }
      var bar = document.getElementById('quizProgressBar');
      expect(bar.style.width).toBe('100%');
      jest.useRealTimers();
    });

    test('retake button resets quiz', () => {
      jest.useFakeTimers();
      window.OnboardingQuiz.reset();
      document.getElementById('quizStartBtn').click();
      for (var i = 0; i < 5; i++) {
        document.querySelectorAll('.quiz-option')[0].click();
        jest.advanceTimersByTime(400);
      }
      document.getElementById('quizRetakeBtn').click();
      var result = document.getElementById('quizResult');
      expect(result.hidden).toBe(true);
      var startEl = document.getElementById('quizStart');
      expect(startEl.style.display).not.toBe('none');
      jest.useRealTimers();
    });
  });

  describe('accessibility', () => {
    test('question area has radiogroup role', () => {
      window.OnboardingQuiz.reset();
      document.getElementById('quizStartBtn').click();
      var group = document.querySelector('.quiz-q');
      expect(group.getAttribute('role')).toBe('radiogroup');
    });

    test('progress bar has proper ARIA attributes', () => {
      var pb = document.querySelector('.quiz-progress');
      expect(pb.getAttribute('role')).toBe('progressbar');
      expect(pb.getAttribute('aria-valuemin')).toBe('0');
      expect(pb.getAttribute('aria-valuemax')).toBe('5');
    });

    test('step label shows question number', () => {
      window.OnboardingQuiz.reset();
      document.getElementById('quizStartBtn').click();
      var label = document.querySelector('.quiz-step-label');
      expect(label.textContent).toBe('Question 1 of 5');
    });
  });
});
