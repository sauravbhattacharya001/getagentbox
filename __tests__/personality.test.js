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

  // Let debounced updates fire
  jest.advanceTimersByTime(300);

  if (!callerOwnsFakeTimers) jest.useRealTimers();
}

afterAll(() => {
  try { if (window.Testimonials) window.Testimonials.stopAutoPlay(); } catch (_) {}
  try { if (window.SiteNav) window.SiteNav.destroy(); } catch (_) {}
  try { if (window.CommandPalette) window.CommandPalette.destroy(); } catch (_) {}
});

describe('PersonalityConfigurator', () => {

  beforeAll(() => loadPage());

  describe('init', () => {
    test('renders initial response in preview bubble', () => {
      const bubble = document.getElementById('personalityResponse');
      expect(bubble).not.toBeNull();
      expect(bubble.textContent.length).toBeGreaterThan(0);
    });

    test('section exists in DOM', () => {
      expect(document.getElementById('personalitySection')).not.toBeNull();
    });

    test('all four sliders present', () => {
      expect(document.getElementById('sliderFormality')).not.toBeNull();
      expect(document.getElementById('sliderHumor')).not.toBeNull();
      expect(document.getElementById('sliderDetail')).not.toBeNull();
      expect(document.getElementById('sliderEmoji')).not.toBeNull();
    });

    test('four preset buttons present', () => {
      const btns = document.querySelectorAll('.preset-btn');
      expect(btns.length).toBe(4);
    });

    test('cycle button present', () => {
      expect(document.getElementById('personalityCycleBtn')).not.toBeNull();
    });

    test('nav link exists', () => {
      const link = document.querySelector('a[href="#personalitySection"]');
      expect(link).not.toBeNull();
      expect(link.textContent).toBe('Personality');
    });
  });

  describe('getSliderValues', () => {
    test('returns default values', () => {
      const values = window.PersonalityConfigurator.getSliderValues();
      expect(values.formality).toBe(25);
      expect(values.humor).toBe(60);
      expect(values.detail).toBe(50);
      expect(values.emoji).toBe(40);
    });

    test('reflects slider changes', () => {
      document.getElementById('sliderFormality').value = '90';
      document.getElementById('sliderHumor').value = '10';
      const values = window.PersonalityConfigurator.getSliderValues();
      expect(values.formality).toBe(90);
      expect(values.humor).toBe(10);
      // Reset
      document.getElementById('sliderFormality').value = '25';
      document.getElementById('sliderHumor').value = '60';
    });
  });

  describe('_generateResponse', () => {
    const gen = (key, vals) => window.PersonalityConfigurator._generateResponse(key, vals);

    test('casual brief response for recipe', () => {
      const resp = gen('recipe', { formality: 20, humor: 10, detail: 20, emoji: 0 });
      expect(resp).toContain('Garlic butter shrimp pasta');
      expect(resp).not.toContain('Ingredients:');
    });

    test('formal detailed response for recipe', () => {
      const resp = gen('recipe', { formality: 80, humor: 10, detail: 80, emoji: 0 });
      expect(resp).toContain('Ingredients:');
      expect(resp).toContain('Preparation:');
    });

    test('humor mid adds flavor text', () => {
      const resp = gen('recipe', { formality: 20, humor: 50, detail: 20, emoji: 0 });
      expect(resp).toContain('Trust me');
    });

    test('humor high adds strong flavor text', () => {
      const resp = gen('recipe', { formality: 20, humor: 90, detail: 20, emoji: 0 });
      expect(resp).toContain('Gordon Ramsay');
    });

    test('emoji some adds one emoji', () => {
      const resp = gen('reminder', { formality: 20, humor: 10, detail: 20, emoji: 40 });
      expect(resp).toContain('\u23F0');
    });

    test('emoji lots adds multiple', () => {
      const resp = gen('reminder', { formality: 20, humor: 10, detail: 20, emoji: 80 });
      expect(resp).toContain('\u2705');
    });

    test('no emoji when level is 0', () => {
      const resp = gen('reminder', { formality: 20, humor: 10, detail: 20, emoji: 0 });
      expect(resp).not.toContain('\u23F0');
      expect(resp).not.toContain('\u2705');
    });

    test('all 5 question keys produce output', () => {
      const keys = ['recipe', 'dns', 'weekend', 'reminder', 'email'];
      const vals = { formality: 50, humor: 50, detail: 50, emoji: 50 };
      keys.forEach(key => {
        expect(gen(key, vals).length).toBeGreaterThan(0);
      });
    });

    test('unknown key returns empty string', () => {
      expect(gen('nonexistent', { formality: 50, humor: 50, detail: 50, emoji: 50 })).toBe('');
    });

    test('dns casual brief is concise', () => {
      const resp = gen('dns', { formality: 20, humor: 10, detail: 20, emoji: 0 });
      expect(resp.length).toBeLessThan(120);
    });

    test('dns formal detailed is comprehensive', () => {
      const resp = gen('dns', { formality: 80, humor: 10, detail: 80, emoji: 0 });
      expect(resp.length).toBeGreaterThan(300);
    });
  });

  describe('presets', () => {
    test('professional preset sets high formality', () => {
      window.PersonalityConfigurator.applyPreset('professional');
      const vals = window.PersonalityConfigurator.getSliderValues();
      expect(vals.formality).toBe(85);
      expect(vals.humor).toBe(10);
      expect(vals.emoji).toBe(5);
    });

    test('friendly preset sets moderate values', () => {
      window.PersonalityConfigurator.applyPreset('friendly');
      const vals = window.PersonalityConfigurator.getSliderValues();
      expect(vals.formality).toBe(25);
      expect(vals.humor).toBe(60);
    });

    test('minimal preset sets low detail', () => {
      window.PersonalityConfigurator.applyPreset('minimal');
      const vals = window.PersonalityConfigurator.getSliderValues();
      expect(vals.detail).toBe(10);
      expect(vals.emoji).toBe(0);
    });

    test('enthusiastic preset sets high humor and emoji', () => {
      window.PersonalityConfigurator.applyPreset('enthusiastic');
      const vals = window.PersonalityConfigurator.getSliderValues();
      expect(vals.humor).toBe(80);
      expect(vals.emoji).toBe(90);
    });

    test('unknown preset does nothing', () => {
      window.PersonalityConfigurator.applyPreset('friendly'); // known state
      const before = window.PersonalityConfigurator.getSliderValues();
      window.PersonalityConfigurator.applyPreset('nonexistent');
      const after = window.PersonalityConfigurator.getSliderValues();
      expect(after).toEqual(before);
    });
  });

  describe('cycleQuestion', () => {
    test('changes displayed question', () => {
      const qEl = document.getElementById('personalityQuestion');
      const first = qEl.textContent;
      window.PersonalityConfigurator.cycleQuestion();
      expect(qEl.textContent).not.toBe(first);
    });

    test('cycles through all 5 questions', () => {
      const qEl = document.getElementById('personalityQuestion');
      const seen = new Set();
      for (let i = 0; i < 5; i++) {
        seen.add(qEl.textContent);
        window.PersonalityConfigurator.cycleQuestion();
      }
      expect(seen.size).toBe(5);
    });

    test('wraps around to first question', () => {
      // Reset to known position by cycling 5 more times (full wrap)
      for (let i = 0; i < 5; i++) {
        window.PersonalityConfigurator.cycleQuestion();
      }
      const qEl = document.getElementById('personalityQuestion');
      const current = qEl.textContent;
      for (let i = 0; i < 5; i++) {
        window.PersonalityConfigurator.cycleQuestion();
      }
      expect(qEl.textContent).toBe(current);
    });
  });

  describe('data integrity', () => {
    test('QUESTIONS has 5 entries', () => {
      expect(window.PersonalityConfigurator._QUESTIONS.length).toBe(5);
    });

    test('all PRESETS have required properties', () => {
      const presets = window.PersonalityConfigurator._PRESETS;
      Object.keys(presets).forEach(key => {
        expect(presets[key]).toHaveProperty('formality');
        expect(presets[key]).toHaveProperty('humor');
        expect(presets[key]).toHaveProperty('detail');
        expect(presets[key]).toHaveProperty('emoji');
      });
    });

    test('RESPONSES covers all question keys with 4 variants', () => {
      const responses = window.PersonalityConfigurator._RESPONSES;
      const questions = window.PersonalityConfigurator._QUESTIONS;
      questions.forEach(q => {
        expect(responses).toHaveProperty(q.key);
        expect(responses[q.key]).toHaveProperty('casualBrief');
        expect(responses[q.key]).toHaveProperty('casualDetailed');
        expect(responses[q.key]).toHaveProperty('formalBrief');
        expect(responses[q.key]).toHaveProperty('formalDetailed');
      });
    });

    test('all preset values within 0-100', () => {
      const presets = window.PersonalityConfigurator._PRESETS;
      Object.keys(presets).forEach(key => {
        ['formality', 'humor', 'detail', 'emoji'].forEach(prop => {
          expect(presets[key][prop]).toBeGreaterThanOrEqual(0);
          expect(presets[key][prop]).toBeLessThanOrEqual(100);
        });
      });
    });
  });

  describe('slider interaction', () => {
    test('moving formality slider changes response tone', () => {
      jest.useFakeTimers();

      // Set to casual
      window.PersonalityConfigurator.applyPreset('friendly');
      jest.advanceTimersByTime(300);
      const bubble = document.getElementById('personalityResponse');
      const casualResp = bubble.textContent;

      // Switch to formal
      window.PersonalityConfigurator.applyPreset('professional');
      jest.advanceTimersByTime(300);
      const formalResp = bubble.textContent;

      expect(casualResp).not.toBe(formalResp);

      jest.useRealTimers();
    });
  });
});
