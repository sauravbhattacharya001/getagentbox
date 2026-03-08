/**
 * @jest-environment jsdom
 */
'use strict';

const { Feedback } = require('../src/index');

// Mock localStorage
const localStorageMock = (() => {
    let store = {};
    return {
        getItem: jest.fn(k => store[k] || null),
        setItem: jest.fn((k, v) => { store[k] = String(v); }),
        removeItem: jest.fn(k => { delete store[k]; }),
        clear: jest.fn(() => { store = {}; }),
        _store: () => store,
        _reset: () => { store = {}; }
    };
})();
Object.defineProperty(global, 'localStorage', { value: localStorageMock, writable: true });

beforeEach(() => {
    localStorageMock._reset();
    localStorageMock.getItem.mockClear();
    localStorageMock.setItem.mockClear();
    Feedback.clear();
});

describe('Feedback.classify', () => {
    test('scores 0-6 are detractors', () => {
        for (let i = 0; i <= 6; i++) {
            expect(Feedback.classify(i)).toBe('detractor');
        }
    });

    test('scores 7-8 are passives', () => {
        expect(Feedback.classify(7)).toBe('passive');
        expect(Feedback.classify(8)).toBe('passive');
    });

    test('scores 9-10 are promoters', () => {
        expect(Feedback.classify(9)).toBe('promoter');
        expect(Feedback.classify(10)).toBe('promoter');
    });
});

describe('Feedback.compute', () => {
    test('empty entries returns nulls', () => {
        const result = Feedback.compute([]);
        expect(result).toEqual({ count: 0, avg: null, nps: null, promoters: 0, passives: 0, detractors: 0 });
    });

    test('all promoters gives NPS 100', () => {
        const entries = [{ score: 10 }, { score: 9 }, { score: 10 }];
        const result = Feedback.compute(entries);
        expect(result.nps).toBe(100);
        expect(result.promoters).toBe(3);
        expect(result.detractors).toBe(0);
        expect(result.passives).toBe(0);
        expect(result.count).toBe(3);
    });

    test('all detractors gives NPS -100', () => {
        const entries = [{ score: 0 }, { score: 3 }, { score: 6 }];
        const result = Feedback.compute(entries);
        expect(result.nps).toBe(-100);
        expect(result.detractors).toBe(3);
    });

    test('mixed scores compute correctly', () => {
        // 2 promoters, 1 passive, 2 detractors = (2-2)/5 * 100 = 0
        const entries = [{ score: 10 }, { score: 9 }, { score: 7 }, { score: 3 }, { score: 5 }];
        const result = Feedback.compute(entries);
        expect(result.count).toBe(5);
        expect(result.nps).toBe(0);
        expect(result.promoters).toBe(2);
        expect(result.passives).toBe(1);
        expect(result.detractors).toBe(2);
        expect(result.avg).toBe(6.8);
    });

    test('avg rounds to 1 decimal', () => {
        const entries = [{ score: 7 }, { score: 8 }, { score: 9 }];
        const result = Feedback.compute(entries);
        expect(result.avg).toBe(8);
    });
});

describe('Feedback storage', () => {
    test('export returns empty array initially', () => {
        expect(Feedback.export()).toEqual([]);
    });

    test('clear empties storage', () => {
        localStorageMock.setItem('agentbox_nps_feedback', JSON.stringify([{ score: 5 }]));
        Feedback.clear();
        expect(Feedback.export()).toEqual([]);
    });
});

describe('Feedback.init (DOM)', () => {
    beforeEach(() => {
        document.body.innerHTML = `
            <div id="feedbackWidget">
                <div class="nps-scale" id="npsScale">
                    ${Array.from({ length: 11 }, (_, i) => `<button class="nps-btn" data-score="${i}">${i}</button>`).join('')}
                </div>
                <div class="nps-labels"><span>Low</span><span>High</span></div>
                <div class="feedback-comment-area" id="feedbackCommentArea" hidden>
                    <textarea id="feedbackComment"></textarea>
                    <button id="feedbackSubmit">Submit</button>
                </div>
                <div class="feedback-thanks" id="feedbackThanks" hidden>
                    <p id="feedbackThanksDetail"></p>
                    <button id="feedbackReset">Reset</button>
                </div>
                <div class="feedback-summary">
                    <span id="feedbackCount">0</span>
                    <span id="feedbackAvg">—</span>
                    <span id="feedbackNps">—</span>
                </div>
            </div>
        `;
        Feedback.init('#feedbackWidget');
    });

    test('clicking a score selects it and shows comment area', () => {
        const btn5 = document.querySelector('[data-score="5"]');
        btn5.click();
        expect(btn5.classList.contains('selected')).toBe(true);
        expect(document.getElementById('feedbackCommentArea').hidden).toBe(false);
    });

    test('clicking different score updates selection', () => {
        document.querySelector('[data-score="3"]').click();
        document.querySelector('[data-score="8"]').click();
        expect(document.querySelector('[data-score="3"]').classList.contains('selected')).toBe(false);
        expect(document.querySelector('[data-score="8"]').classList.contains('selected')).toBe(true);
    });

    test('in-range class highlights scores up to selected', () => {
        document.querySelector('[data-score="5"]').click();
        for (let i = 0; i <= 5; i++) {
            expect(document.querySelector(`[data-score="${i}"]`).classList.contains('in-range')).toBe(true);
        }
        for (let i = 6; i <= 10; i++) {
            expect(document.querySelector(`[data-score="${i}"]`).classList.contains('in-range')).toBe(false);
        }
    });

    test('submit saves entry and shows thanks', () => {
        document.querySelector('[data-score="9"]').click();
        document.getElementById('feedbackComment').value = 'Love it!';
        document.getElementById('feedbackSubmit').click();

        expect(document.getElementById('feedbackThanks').hidden).toBe(false);
        expect(document.getElementById('npsScale').hidden).toBe(true);

        const entries = Feedback.export();
        expect(entries).toHaveLength(1);
        expect(entries[0].score).toBe(9);
        expect(entries[0].comment).toBe('Love it!');
        expect(entries[0].timestamp).toBeGreaterThan(0);
    });

    test('thanks message varies by category', () => {
        document.querySelector('[data-score="10"]').click();
        document.getElementById('feedbackSubmit').click();
        expect(document.getElementById('feedbackThanksDetail').textContent).toContain('thrilled');

        // Reset and try detractor
        document.getElementById('feedbackReset').click();
        document.querySelector('[data-score="2"]').click();
        document.getElementById('feedbackSubmit').click();
        expect(document.getElementById('feedbackThanksDetail').textContent).toContain('honesty');
    });

    test('reset restores the scale', () => {
        document.querySelector('[data-score="7"]').click();
        document.getElementById('feedbackSubmit').click();
        document.getElementById('feedbackReset').click();

        expect(document.getElementById('npsScale').hidden).toBe(false);
        expect(document.getElementById('feedbackThanks').hidden).toBe(true);
        expect(document.getElementById('feedbackCommentArea').hidden).toBe(true);
    });

    test('summary updates after submit', () => {
        document.querySelector('[data-score="10"]').click();
        document.getElementById('feedbackSubmit').click();

        expect(document.getElementById('feedbackCount').textContent).toBe('1');
        expect(document.getElementById('feedbackAvg').textContent).toBe('10.0');
        expect(document.getElementById('feedbackNps').textContent).toBe('+100');
    });

    test('submit without selecting score does nothing', () => {
        document.getElementById('feedbackSubmit').click();
        expect(Feedback.export()).toHaveLength(0);
        expect(document.getElementById('feedbackThanks').hidden).toBe(true);
    });
});
