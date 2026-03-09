/**
 * @jest-environment jsdom
 */
'use strict';

const { Feedback } = require('../src/index');

describe('Feedback.compute – invalid score filtering', () => {
    test('ignores NaN scores', () => {
        const entries = [{ score: NaN }, { score: 10 }, { score: NaN }];
        const result = Feedback.compute(entries);
        expect(result.count).toBe(1);
        expect(result.avg).toBe(10);
        expect(result.promoters).toBe(1);
    });

    test('ignores Infinity scores', () => {
        const entries = [{ score: Infinity }, { score: -Infinity }, { score: 8 }];
        const result = Feedback.compute(entries);
        expect(result.count).toBe(1);
        expect(result.avg).toBe(8);
        expect(result.passives).toBe(1);
    });

    test('ignores scores outside 0-10 range', () => {
        const entries = [{ score: -1 }, { score: 11 }, { score: 5 }, { score: 100 }];
        const result = Feedback.compute(entries);
        expect(result.count).toBe(1);
        expect(result.avg).toBe(5);
        expect(result.detractors).toBe(1);
    });

    test('ignores non-number score types', () => {
        const entries = [
            { score: '10' },
            { score: null },
            { score: undefined },
            { score: true },
            { score: 7 }
        ];
        const result = Feedback.compute(entries);
        expect(result.count).toBe(1);
        expect(result.avg).toBe(7);
    });

    test('returns nulls when all entries are invalid', () => {
        const entries = [{ score: NaN }, { score: -5 }, { score: 'bad' }];
        const result = Feedback.compute(entries);
        expect(result).toEqual({
            count: 0, avg: null, nps: null,
            promoters: 0, passives: 0, detractors: 0
        });
    });

    test('mixed valid and invalid computes correctly', () => {
        // Valid: 10 (promoter), 5 (detractor) → NPS = (1-1)/2 * 100 = 0
        const entries = [
            { score: 10 },
            { score: NaN },
            { score: 5 },
            { score: -1 },
            { score: 15 }
        ];
        const result = Feedback.compute(entries);
        expect(result.count).toBe(2);
        expect(result.nps).toBe(0);
        expect(result.avg).toBe(7.5);
        expect(result.promoters).toBe(1);
        expect(result.detractors).toBe(1);
    });
});

describe('Feedback.compute – boundary scores', () => {
    test('score 0 is valid detractor', () => {
        const result = Feedback.compute([{ score: 0 }]);
        expect(result.count).toBe(1);
        expect(result.detractors).toBe(1);
        expect(result.avg).toBe(0);
    });

    test('score 6 is detractor, 7 is passive', () => {
        const result = Feedback.compute([{ score: 6 }, { score: 7 }]);
        expect(result.detractors).toBe(1);
        expect(result.passives).toBe(1);
    });

    test('score 8 is passive, 9 is promoter', () => {
        const result = Feedback.compute([{ score: 8 }, { score: 9 }]);
        expect(result.passives).toBe(1);
        expect(result.promoters).toBe(1);
    });
});

describe('Feedback.init – keyboard accessibility', () => {
    beforeEach(() => {
        document.body.innerHTML = `
            <div id="fw">
                <div class="nps-scale" id="npsScale">
                    ${Array.from({ length: 11 }, (_, i) =>
                        `<button class="nps-btn" data-score="${i}" tabindex="0">${i}</button>`
                    ).join('')}
                </div>
                <div class="feedback-comment-area" id="feedbackCommentArea" hidden>
                    <textarea id="feedbackComment"></textarea>
                    <button id="feedbackSubmit">Submit</button>
                </div>
                <div class="feedback-thanks" id="feedbackThanks" hidden>
                    <p id="feedbackThanksDetail"></p>
                    <button id="feedbackReset">Reset</button>
                </div>
                <div><span id="feedbackCount">0</span><span id="feedbackAvg">—</span><span id="feedbackNps">—</span></div>
            </div>
        `;
        Feedback.init('#fw');
    });

    test('Enter key selects NPS button', () => {
        const btn = document.querySelector('[data-score="7"]');
        btn.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
        expect(btn.classList.contains('selected')).toBe(true);
        expect(document.getElementById('feedbackCommentArea').hidden).toBe(false);
    });

    test('Space key selects NPS button', () => {
        const btn = document.querySelector('[data-score="3"]');
        btn.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }));
        expect(btn.classList.contains('selected')).toBe(true);
    });

    test('ArrowRight moves focus to next button', () => {
        const btn5 = document.querySelector('[data-score="5"]');
        const btn6 = document.querySelector('[data-score="6"]');
        btn5.focus();
        btn5.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
        expect(document.activeElement).toBe(btn6);
    });

    test('ArrowLeft moves focus to previous button', () => {
        const btn5 = document.querySelector('[data-score="5"]');
        const btn4 = document.querySelector('[data-score="4"]');
        btn5.focus();
        btn5.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }));
        expect(document.activeElement).toBe(btn4);
    });

    test('invalid data-score is ignored', () => {
        const btn = document.querySelector('[data-score="5"]');
        btn.setAttribute('data-score', 'abc');
        btn.click();
        // _selectedScore should remain null (init sets it to null)
        // submitting should do nothing
        document.getElementById('feedbackSubmit').click();
        expect(Feedback.export()).toHaveLength(0);
    });
});
