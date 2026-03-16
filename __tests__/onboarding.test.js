/**
 * @jest-environment jsdom
 */

const fs = require('fs');
const path = require('path');

const html = fs.readFileSync(path.resolve(__dirname, '..', 'onboarding.html'), 'utf8');

function loadModule() {
    document.documentElement.removeAttribute('data-theme');

    const store = {};
    const mockStorage = {
        getItem: jest.fn(k => store[k] ?? null),
        setItem: jest.fn((k, v) => { store[k] = v; }),
        removeItem: jest.fn(k => { delete store[k]; }),
        clear: jest.fn()
    };
    Object.defineProperty(window, 'localStorage', { value: mockStorage, writable: true });

    const bodyMatch = html.match(/<body>([\s\S]*?)<script>/);
    if (bodyMatch) document.body.innerHTML = bodyMatch[1];

    const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>/);
    const mod = { exports: {} };
    const fn = new Function('module', 'document', 'window', 'localStorage', 'confirm', scriptMatch[1]);
    fn(mod, document, window, mockStorage, () => true);

    return { exp: mod.exports, store, mockStorage };
}

describe('Onboarding Checklist', () => {
    let exp, store, mockStorage;

    beforeEach(() => {
        ({ exp, store, mockStorage } = loadModule());
    });

    test('has 5 categories', () => {
        expect(exp.CHECKLIST_DATA).toHaveLength(5);
    });

    test('every category has id, icon, title, and steps', () => {
        exp.CHECKLIST_DATA.forEach(cat => {
            expect(cat.id).toBeTruthy();
            expect(cat.icon).toBeTruthy();
            expect(cat.title).toBeTruthy();
            expect(cat.steps.length).toBeGreaterThan(0);
        });
    });

    test('every step has id, title, desc, and time', () => {
        exp.CHECKLIST_DATA.forEach(cat => {
            cat.steps.forEach(step => {
                expect(step.id).toBeTruthy();
                expect(step.title).toBeTruthy();
                expect(step.desc).toBeTruthy();
                expect(step.time).toBeTruthy();
            });
        });
    });

    test('all step ids are unique', () => {
        const ids = exp.getAllStepIds();
        expect(new Set(ids).size).toBe(ids.length);
    });

    test('total steps count is 17', () => {
        expect(exp.getAllStepIds()).toHaveLength(17);
    });

    test('has 6 badges', () => {
        expect(exp.BADGES).toHaveLength(6);
    });

    test('each badge has required fields', () => {
        exp.BADGES.forEach(b => {
            expect(b.id).toBeTruthy();
            expect(b.icon).toBeTruthy();
            expect(b.label).toBeTruthy();
            expect(b.category).toBeTruthy();
        });
    });

    test('completionist badge targets __all__', () => {
        const comp = exp.BADGES.find(b => b.id === 'completionist');
        expect(comp.category).toBe('__all__');
    });

    test('getAllStepIds returns flat array', () => {
        const ids = exp.getAllStepIds();
        expect(Array.isArray(ids)).toBe(true);
        expect(ids).toContain('open-telegram');
        expect(ids).toContain('invite-friend');
    });

    test('getTimeMinutes parses minutes', () => {
        expect(exp.getTimeMinutes('2 min')).toBe(2);
    });

    test('getTimeMinutes parses seconds', () => {
        expect(exp.getTimeMinutes('30 sec')).toBeCloseTo(0.5);
    });

    test('getTimeMinutes parses 1 min', () => {
        expect(exp.getTimeMinutes('1 min')).toBe(1);
    });

    test('getTimeMinutes defaults to 1 for unknown', () => {
        expect(exp.getTimeMinutes('unknown')).toBe(1);
    });

    test('loadState returns default when empty', () => {
        const s = exp.loadState();
        expect(s.completed).toEqual([]);
        expect(s.streak).toBe(0);
    });

    test('saveState persists to localStorage', () => {
        const s = { completed: ['open-telegram'], streak: 1, lastCompleted: 123 };
        exp.saveState(s);
        expect(mockStorage.setItem).toHaveBeenCalledWith(exp.STORAGE_KEY, JSON.stringify(s));
    });

    test('loadState reads saved data', () => {
        store[exp.STORAGE_KEY] = JSON.stringify({ completed: ['find-bot'], streak: 2, lastCompleted: 456 });
        const loaded = exp.loadState();
        expect(loaded.completed).toEqual(['find-bot']);
        expect(loaded.streak).toBe(2);
    });

    test('getCategoryCompleted returns 0 when empty', () => {
        exp.state = { completed: [], streak: 0, lastCompleted: null };
        expect(exp.getCategoryCompleted('getting-started')).toBe(0);
    });

    test('getCategoryCompleted counts steps', () => {
        exp.state = { completed: ['open-telegram', 'find-bot'], streak: 2, lastCompleted: null };
        expect(exp.getCategoryCompleted('getting-started')).toBe(2);
    });

    test('getCategoryCompleted returns 0 for unknown', () => {
        expect(exp.getCategoryCompleted('nonexistent')).toBe(0);
    });

    test('getRemainingTime full when nothing done', () => {
        exp.state = { completed: [], streak: 0, lastCompleted: null };
        expect(exp.getRemainingTime()).toMatch(/~\d+ min left/);
    });

    test('getRemainingTime less when all done', () => {
        exp.state = { completed: exp.getAllStepIds(), streak: 17, lastCompleted: null };
        expect(exp.getRemainingTime()).toBe('Less than 1 min left');
    });

    test('toggleStep completes a step', () => {
        exp.state = { completed: [], streak: 0, lastCompleted: null };
        exp.toggleStep('open-telegram');
        expect(exp.state.completed).toContain('open-telegram');
        expect(exp.state.streak).toBe(1);
    });

    test('toggleStep uncompletes a step', () => {
        exp.state = { completed: ['open-telegram'], streak: 1, lastCompleted: null };
        exp.toggleStep('open-telegram');
        expect(exp.state.completed).not.toContain('open-telegram');
    });

    test('toggleStep increments streak', () => {
        exp.state = { completed: [], streak: 0, lastCompleted: null };
        exp.toggleStep('open-telegram');
        exp.toggleStep('find-bot');
        expect(exp.state.streak).toBe(2);
    });

    test('toggleStep sets lastCompleted', () => {
        exp.state = { completed: [], streak: 0, lastCompleted: null };
        const before = Date.now();
        exp.toggleStep('open-telegram');
        expect(exp.state.lastCompleted).toBeGreaterThanOrEqual(before);
    });

    test('toggleStep saves state', () => {
        exp.state = { completed: [], streak: 0, lastCompleted: null };
        mockStorage.setItem.mockClear();
        exp.toggleStep('open-telegram');
        expect(mockStorage.setItem).toHaveBeenCalled();
    });

    test('DOM renders progress counts', () => {
        document.dispatchEvent(new Event('DOMContentLoaded'));
        expect(document.getElementById('doneCount').textContent).toBe('0');
        expect(document.getElementById('totalCount').textContent).toBe('17');
    });

    test('DOM renders categories', () => {
        document.dispatchEvent(new Event('DOMContentLoaded'));
        expect(document.querySelectorAll('.category').length).toBe(5);
    });

    test('DOM renders steps', () => {
        document.dispatchEvent(new Event('DOMContentLoaded'));
        expect(document.querySelectorAll('.step').length).toBe(17);
    });

    test('DOM renders badges', () => {
        document.dispatchEvent(new Event('DOMContentLoaded'));
        expect(document.querySelectorAll('.badge').length).toBe(6);
    });

    test('celebration hidden initially', () => {
        document.dispatchEvent(new Event('DOMContentLoaded'));
        expect(document.getElementById('celebration').classList.contains('visible')).toBe(false);
    });

    test('STORAGE_KEY is defined', () => {
        expect(exp.STORAGE_KEY).toBe('agentbox_onboarding');
    });
});
