/**
 * @jest-environment jsdom
 */

/* global AgentBoxComponents */

beforeEach(function () {
    jest.useFakeTimers();
    jest.spyOn(global, 'setTimeout');
    jest.spyOn(global, 'clearTimeout');

    // Load the UMD module
    delete require.cache[require.resolve('../src/index.js')];
    require('../src/index.js');

    // Provide a container element
    document.body.innerHTML =
        '<div id="showcase">' +
            '<div class="command-prompt">' +
                '<span class="command-arrow">›</span> ' +
                '<span class="command-text"></span>' +
                '<span class="command-cursor">|</span>' +
            '</div>' +
            '<div class="command-category"></div>' +
        '</div>';
});

afterEach(function () {
    if (AgentBoxComponents && AgentBoxComponents.CommandShowcase) {
        AgentBoxComponents.CommandShowcase.stop();
        AgentBoxComponents.CommandShowcase.reset();
    }
    jest.useRealTimers();
    jest.restoreAllMocks();
});

describe('CommandShowcase', function () {
    var CS;

    beforeEach(function () {
        CS = AgentBoxComponents.CommandShowcase;
    });

    // ── Initialization ─────────────────────────────────────────

    test('is exported on AgentBoxComponents', function () {
        expect(CS).toBeDefined();
        expect(typeof CS.init).toBe('function');
    });

    test('init with selector finds container', function () {
        CS.init('#showcase');
        expect(CS.isAnimating()).toBe(true);
    });

    test('init with DOM element', function () {
        var el = document.getElementById('showcase');
        CS.init(el);
        expect(CS.isAnimating()).toBe(true);
    });

    test('init with invalid selector does not throw', function () {
        expect(function () {
            CS.init('#nonexistent');
        }).not.toThrow();
        expect(CS.isAnimating()).toBe(false);
    });

    test('init builds DOM when container is empty', function () {
        document.body.innerHTML = '<div id="empty"></div>';
        CS.init('#empty');
        var el = document.getElementById('empty');
        expect(el.querySelector('.command-text')).toBeTruthy();
        expect(el.querySelector('.command-category')).toBeTruthy();
        expect(el.querySelector('.command-arrow')).toBeTruthy();
    });

    // ── Default commands ───────────────────────────────────────

    test('has 8 default commands', function () {
        var cmds = CS.getCommands();
        expect(cmds.length).toBe(8);
    });

    test('default commands have text, icon, category', function () {
        var cmds = CS.getCommands();
        cmds.forEach(function (cmd) {
            expect(typeof cmd.text).toBe('string');
            expect(cmd.text.length).toBeGreaterThan(0);
            expect(typeof cmd.icon).toBe('string');
            expect(typeof cmd.category).toBe('string');
        });
    });

    test('getCommands returns a copy', function () {
        var cmds1 = CS.getCommands();
        var cmds2 = CS.getCommands();
        expect(cmds1).not.toBe(cmds2);
        expect(cmds1).toEqual(cmds2);
    });

    // ── Custom commands ────────────────────────────────────────

    test('setCommands replaces command list', function () {
        CS.setCommands([
            { text: 'Hello', icon: '👋', category: 'Greet' }
        ]);
        expect(CS.getCommands().length).toBe(1);
        expect(CS.getCommands()[0].text).toBe('Hello');
    });

    test('setCommands resets index', function () {
        CS.init('#showcase');
        jest.advanceTimersByTime(5000);
        CS.setCommands([
            { text: 'A', icon: '1', category: 'X' },
            { text: 'B', icon: '2', category: 'Y' }
        ]);
        expect(CS.getCurrentIndex()).toBe(0);
    });

    test('setCommands ignores empty array', function () {
        var before = CS.getCommands().length;
        CS.setCommands([]);
        expect(CS.getCommands().length).toBe(before);
    });

    test('setCommands ignores non-array', function () {
        var before = CS.getCommands().length;
        CS.setCommands('not an array');
        expect(CS.getCommands().length).toBe(before);
    });

    test('init with options.commands', function () {
        CS.init('#showcase', {
            commands: [{ text: 'Custom', icon: '🎯', category: 'Test' }]
        });
        expect(CS.getCommands().length).toBe(1);
    });

    // ── Typing animation ───────────────────────────────────────

    test('types first command character by character', function () {
        CS.setCommands([
            { text: 'Hi', icon: '👋', category: 'Greet' }
        ]);
        CS.init('#showcase');

        var textEl = document.querySelector('.command-text');
        expect(textEl.textContent).toBe('');  // before any timer fires

        jest.advanceTimersByTime(60);  // first char
        expect(textEl.textContent).toBe('H');

        jest.advanceTimersByTime(60);  // second char
        expect(textEl.textContent).toBe('Hi');
    });

    test('updates category during typing', function () {
        CS.setCommands([
            { text: 'Hi', icon: '👋', category: 'Greet' }
        ]);
        CS.init('#showcase');

        var catEl = document.querySelector('.command-category');
        expect(catEl.textContent).toContain('Greet');
    });

    test('erases text after pause', function () {
        CS.setCommands([
            { text: 'AB', icon: '1', category: 'X' },
            { text: 'CD', icon: '2', category: 'Y' }
        ]);
        CS.init('#showcase');

        var textEl = document.querySelector('.command-text');

        // Type "AB": 3 steps at 60ms each (empty, A, B, done)
        jest.advanceTimersByTime(60 * 3);
        expect(textEl.textContent).toBe('AB');

        // Wait for pause after type (2000ms)
        jest.advanceTimersByTime(2000);

        // Erase: 3 steps at 30ms each (AB, A, empty)
        jest.advanceTimersByTime(30 * 3);
        expect(textEl.textContent).toBe('');
    });

    // ── Cycling ────────────────────────────────────────────────

    test('advances to next command after full cycle', function () {
        CS.setCommands([
            { text: 'A', icon: '1', category: 'X' },
            { text: 'B', icon: '2', category: 'Y' }
        ]);
        CS.init('#showcase');

        // Type A: 2 steps * 60ms = 120ms
        // Pause: 2000ms
        // Erase A: 2 steps * 30ms = 60ms
        // Pause after erase: 500ms
        // Total: 120 + 2000 + 60 + 500 = 2680ms
        jest.advanceTimersByTime(2800);
        expect(CS.getCurrentIndex()).toBe(1);
    });

    test('wraps around to first command', function () {
        CS.setCommands([
            { text: 'X', icon: '1', category: 'A' },
            { text: 'Y', icon: '2', category: 'B' }
        ]);
        CS.init('#showcase');

        // Run through both commands
        jest.advanceTimersByTime(6000);  // enough for 2 full cycles
        // Should be back at index 0 or 1
        expect(CS.getCurrentIndex()).toBeGreaterThanOrEqual(0);
        expect(CS.getCurrentIndex()).toBeLessThan(2);
    });

    // ── Pause / Resume ─────────────────────────────────────────

    test('pause stops new cycles', function () {
        CS.init('#showcase');
        CS.pause();
        expect(CS.isPaused()).toBe(true);
    });

    test('resume after pause continues animation', function () {
        CS.init('#showcase');
        CS.pause();
        CS.resume();
        expect(CS.isPaused()).toBe(false);
        expect(CS.isAnimating()).toBe(true);
    });

    test('resume when not paused does nothing', function () {
        CS.init('#showcase');
        var index = CS.getCurrentIndex();
        CS.resume();  // should be no-op
        expect(CS.getCurrentIndex()).toBe(index);
    });

    // ── Stop / Reset ───────────────────────────────────────────

    test('stop clears timer', function () {
        CS.init('#showcase');
        expect(CS.isAnimating()).toBe(true);
        CS.stop();
        expect(CS.isAnimating()).toBe(false);
    });

    test('reset clears text and index', function () {
        CS.init('#showcase');
        jest.advanceTimersByTime(500);  // partial typing
        CS.reset();
        expect(CS.getCurrentIndex()).toBe(0);
        expect(document.querySelector('.command-text').textContent).toBe('');
        expect(CS.isAnimating()).toBe(false);
    });

    // ── skipTo ─────────────────────────────────────────────────

    test('skipTo jumps to specific command', function () {
        CS.init('#showcase');
        CS.skipTo(3);
        expect(CS.getCurrentIndex()).toBe(3);
        expect(CS.isAnimating()).toBe(true);
    });

    test('skipTo ignores negative index', function () {
        CS.init('#showcase');
        var before = CS.getCurrentIndex();
        CS.skipTo(-1);
        expect(CS.getCurrentIndex()).toBe(before);
    });

    test('skipTo ignores out of range index', function () {
        CS.init('#showcase');
        CS.skipTo(100);
        expect(CS.getCurrentIndex()).toBe(0);
    });

    // ── Custom options ─────────────────────────────────────────

    test('init accepts custom typeSpeed', function () {
        CS.setCommands([{ text: 'AB', icon: '1', category: 'X' }]);
        CS.init('#showcase', { typeSpeed: 100 });

        var textEl = document.querySelector('.command-text');
        jest.advanceTimersByTime(100);
        expect(textEl.textContent).toBe('A');
        jest.advanceTimersByTime(100);
        expect(textEl.textContent).toBe('AB');
    });

    test('init accepts custom eraseSpeed', function () {
        CS.setCommands([{ text: 'A', icon: '1', category: 'X' }]);
        CS.init('#showcase', { eraseSpeed: 10 });

        // Type + pause
        jest.advanceTimersByTime(60 * 2 + 2000);
        var textEl = document.querySelector('.command-text');
        // Erase at 10ms per step
        jest.advanceTimersByTime(10);
        expect(textEl.textContent).toBe('A');  // still erasing
        jest.advanceTimersByTime(10);
        expect(textEl.textContent).toBe('');
    });
});
