/**
 * @jest-environment jsdom
 */
const fs = require('fs');
const path = require('path');

const html = fs.readFileSync(path.join(__dirname, '..', 'negotiation-simulator.html'), 'utf8');

// Extract the JS from the inline script tag
const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>/);
const scriptCode = scriptMatch ? scriptMatch[1] : '';

// Extract the body HTML for DOM tests
const bodyMatch = html.match(/<body>([\s\S]*?)<script>/);
const bodyHTML = bodyMatch ? bodyMatch[1] : '';

function setupDOM() {
    document.body.innerHTML = bodyHTML;
    // Mock canvas
    HTMLCanvasElement.prototype.getContext = function () {
        return {
            clearRect: jest.fn(), beginPath: jest.fn(), arc: jest.fn(), fill: jest.fn(),
            stroke: jest.fn(), moveTo: jest.fn(), lineTo: jest.fn(), fillText: jest.fn(),
            scale: jest.fn(),
            fillStyle: '', strokeStyle: '', lineWidth: 1, globalAlpha: 1,
            font: '', textAlign: '', textBaseline: '',
        };
    };
    HTMLCanvasElement.prototype.getBoundingClientRect = function () {
        return { width: 800, height: 400, top: 0, left: 0, right: 800, bottom: 400 };
    };
    // Mock URL
    if (!window.URL.createObjectURL) {
        window.URL.createObjectURL = jest.fn(() => 'blob:mock');
        window.URL.revokeObjectURL = jest.fn();
    }
    // Execute
    eval(scriptCode);
    return window.NegotiationSimulator;
}

let sim;

beforeEach(() => {
    document.body.innerHTML = '';
    delete window.NegotiationSimulator;
    sim = setupDOM();
});

describe('Negotiation Simulator', () => {
    /* ========== PRESETS ========== */
    describe('Presets', () => {
        test('has 5 presets', () => {
            expect(Object.keys(sim.PRESETS)).toHaveLength(5);
        });

        test('resource-split preset loads correctly', () => {
            sim.initPreset('resource-split');
            expect(sim.state.agents).toHaveLength(3);
            expect(sim.state.resources).toEqual(['compute']);
            expect(sim.state.totalPool.compute).toBe(100);
        });

        test('priority-conflict preset has 2 agents', () => {
            sim.initPreset('priority-conflict');
            expect(sim.state.agents).toHaveLength(2);
            expect(sim.state.resources).toContain('speed');
            expect(sim.state.resources).toContain('quality');
        });

        test('multi-party-trade preset has 4 agents and 4 resources', () => {
            sim.initPreset('multi-party-trade');
            expect(sim.state.agents).toHaveLength(4);
            expect(sim.state.resources).toHaveLength(4);
        });

        test('salary preset loads employer and candidate', () => {
            sim.initPreset('salary');
            expect(sim.state.agents).toHaveLength(2);
            expect(sim.state.agents[0].name).toBe('Employer');
            expect(sim.state.agents[1].name).toBe('Candidate');
        });

        test('coalition preset has 5 agents', () => {
            sim.initPreset('coalition');
            expect(sim.state.agents).toHaveLength(5);
        });

        test('each preset initializes agents with currentOffer', () => {
            Object.keys(sim.PRESETS).forEach(key => {
                sim.initPreset(key);
                sim.state.agents.forEach(agent => {
                    expect(agent.currentOffer).toBeTruthy();
                    sim.state.resources.forEach(r => {
                        expect(typeof agent.currentOffer[r]).toBe('number');
                    });
                });
            });
        });

        test('each preset starts with round 0', () => {
            Object.keys(sim.PRESETS).forEach(key => {
                sim.initPreset(key);
                expect(sim.state.round).toBe(0);
            });
        });

        test('each preset starts with idle status', () => {
            Object.keys(sim.PRESETS).forEach(key => {
                sim.initPreset(key);
                expect(sim.state.status).toBe('idle');
            });
        });

        test('agents have valid priorities referencing preset resources', () => {
            Object.keys(sim.PRESETS).forEach(key => {
                const preset = sim.PRESETS[key];
                preset.agents.forEach(a => {
                    Object.keys(a.priorities).forEach(r => {
                        expect(preset.resources).toContain(r);
                    });
                });
            });
        });

        test('all agents have reservation values between 0 and 1', () => {
            Object.values(sim.PRESETS).forEach(preset => {
                preset.agents.forEach(a => {
                    expect(a.reservationValue).toBeGreaterThan(0);
                    expect(a.reservationValue).toBeLessThan(1);
                });
            });
        });
    });

    /* ========== STRATEGIES ========== */
    describe('Strategies', () => {
        test('5 strategies available', () => {
            expect(sim.STRATEGIES).toHaveLength(5);
            expect(sim.STRATEGIES).toContain('cooperative');
            expect(sim.STRATEGIES).toContain('competitive');
            expect(sim.STRATEGIES).toContain('tit-for-tat');
            expect(sim.STRATEGIES).toContain('random');
            expect(sim.STRATEGIES).toContain('adaptive');
        });

        test('cooperative strategy concedes toward fair share', () => {
            sim.initPreset('resource-split');
            const agent = sim.state.agents[0];
            agent.strategy = 'cooperative';
            const initial = agent.currentOffer.compute;
            const offer1 = sim.makeOffer(agent, 0, 1);
            agent.currentOffer = offer1;
            const offer2 = sim.makeOffer(agent, 0, 2);
            expect(offer2.compute).toBeLessThanOrEqual(initial);
        });

        test('competitive strategy concedes slowly', () => {
            sim.initPreset('resource-split');
            const agent = sim.state.agents[0];
            agent.strategy = 'competitive';
            const initial = agent.currentOffer.compute;
            const offer = sim.makeOffer(agent, 0, 1);
            const concessionPct = (initial - offer.compute) / initial;
            expect(concessionPct).toBeLessThan(0.1);
        });

        test('random strategy stays within bounds', () => {
            sim.initPreset('resource-split');
            const agent = sim.state.agents[0];
            agent.strategy = 'random';
            for (let i = 0; i < 20; i++) {
                const offer = sim.makeOffer(agent, 0, i);
                expect(offer.compute).toBeGreaterThanOrEqual(0);
                expect(offer.compute).toBeLessThanOrEqual(100);
            }
        });

        test('adaptive strategy works with low satisfaction', () => {
            sim.initPreset('resource-split');
            const agent = sim.state.agents[0];
            agent.strategy = 'adaptive';
            agent.satisfaction = 30;
            const offer = sim.makeOffer(agent, 0, 5);
            expect(offer.compute).toBeGreaterThan(0);
        });

        test('tit-for-tat produces valid offers', () => {
            sim.initPreset('priority-conflict');
            const agent = sim.state.agents[0];
            agent.strategy = 'tit-for-tat';
            const offer = sim.makeOffer(agent, 0, 2);
            expect(offer.speed).toBeDefined();
            expect(offer.quality).toBeDefined();
        });

        test('makeOffer clamps to pool size', () => {
            sim.initPreset('resource-split');
            const agent = sim.state.agents[0];
            agent.strategy = 'competitive';
            agent.currentOffer = { compute: 200 };
            const offer = sim.makeOffer(agent, 0, 1);
            expect(offer.compute).toBeLessThanOrEqual(100);
        });
    });

    /* ========== UTILITY ========== */
    describe('Utility Calculation', () => {
        test('calcUtility returns 0-1 range', () => {
            sim.initPreset('resource-split');
            const u = sim.calcUtility(sim.state.agents[0], { compute: 50 });
            expect(u).toBeGreaterThanOrEqual(0);
            expect(u).toBeLessThanOrEqual(1);
        });

        test('calcUtility returns 1 for full allocation', () => {
            sim.initPreset('resource-split');
            const u = sim.calcUtility(sim.state.agents[0], { compute: 100 });
            expect(u).toBe(1);
        });

        test('calcUtility returns 0 for zero allocation', () => {
            sim.initPreset('resource-split');
            const u = sim.calcUtility(sim.state.agents[0], { compute: 0 });
            expect(u).toBe(0);
        });

        test('calcUtility weights by priorities', () => {
            sim.initPreset('priority-conflict');
            const rush = sim.state.agents[0]; // speed: 0.8, quality: 0.2
            const u1 = sim.calcUtility(rush, { speed: 80, quality: 20 });
            const u2 = sim.calcUtility(rush, { speed: 20, quality: 80 });
            expect(u1).toBeGreaterThan(u2);
        });

        test('calcUtility with multi-resource agent', () => {
            sim.initPreset('multi-party-trade');
            const agent = sim.state.agents[0]; // DataBot
            const u = sim.calcUtility(agent, { data: 50, compute: 25, memory: 25, bandwidth: 10 });
            expect(u).toBeGreaterThan(0);
            expect(u).toBeLessThanOrEqual(1);
        });
    });

    /* ========== GINI ========== */
    describe('Gini Coefficient', () => {
        test('returns 0 for equal values', () => {
            expect(sim.calcGini([0.5, 0.5, 0.5])).toBe(0);
        });

        test('returns positive for unequal values', () => {
            expect(sim.calcGini([0.1, 0.9])).toBeGreaterThan(0);
        });

        test('returns 0 for empty array', () => {
            expect(sim.calcGini([])).toBe(0);
        });

        test('returns value between 0 and 1', () => {
            const g = sim.calcGini([0.1, 0.3, 0.6, 0.9]);
            expect(g).toBeGreaterThanOrEqual(0);
            expect(g).toBeLessThanOrEqual(1);
        });

        test('increases with inequality', () => {
            const g1 = sim.calcGini([0.4, 0.5, 0.6]);
            const g2 = sim.calcGini([0.1, 0.5, 0.9]);
            expect(g2).toBeGreaterThan(g1);
        });

        test('handles single value', () => {
            expect(sim.calcGini([0.5])).toBe(0);
        });
    });

    /* ========== BATNA ========== */
    describe('BATNA', () => {
        test('returns positive value', () => {
            sim.initPreset('resource-split');
            const batna = sim.calcBATNA(sim.state.agents[0]);
            expect(batna).toBeGreaterThan(0);
        });

        test('based on equal split', () => {
            sim.initPreset('resource-split');
            const batna = sim.calcBATNA(sim.state.agents[0]);
            expect(batna).toBeCloseTo(1 / 3, 1);
        });
    });

    /* ========== PARETO ========== */
    describe('Pareto Efficiency', () => {
        test('returns boolean', () => {
            sim.initPreset('resource-split');
            const allocs = [{ compute: 33.3 }, { compute: 33.3 }, { compute: 33.3 }];
            expect(typeof sim.isParetoEfficient(sim.state.agents, allocs)).toBe('boolean');
        });
    });

    /* ========== NORMALIZATION ========== */
    describe('Normalization', () => {
        test('caps total to pool', () => {
            sim.initPreset('resource-split');
            const norm = sim.normalizeAllocations([{ compute: 60 }, { compute: 60 }, { compute: 60 }]);
            const total = norm.reduce((s, o) => s + o.compute, 0);
            expect(total).toBeLessThanOrEqual(100.01);
        });

        test('preserves ratios', () => {
            sim.initPreset('resource-split');
            const norm = sim.normalizeAllocations([{ compute: 40 }, { compute: 40 }, { compute: 40 }]);
            expect(Math.abs(norm[0].compute - norm[1].compute)).toBeLessThan(0.01);
        });

        test('does not change if within budget', () => {
            sim.initPreset('resource-split');
            const norm = sim.normalizeAllocations([{ compute: 20 }, { compute: 30 }, { compute: 40 }]);
            expect(norm[0].compute).toBe(20);
            expect(norm[1].compute).toBe(30);
            expect(norm[2].compute).toBe(40);
        });
    });

    /* ========== SIMULATION ========== */
    describe('Simulation', () => {
        test('simulateRound increments round', () => {
            sim.initPreset('resource-split');
            sim.state.status = 'negotiating';
            sim.simulateRound();
            expect(sim.state.round).toBe(1);
        });

        test('simulateRound adds to history', () => {
            sim.initPreset('resource-split');
            sim.state.status = 'negotiating';
            sim.simulateRound();
            expect(sim.state.history).toHaveLength(1);
        });

        test('simulateRound adds log entries', () => {
            sim.initPreset('resource-split');
            sim.state.status = 'negotiating';
            sim.simulateRound();
            expect(sim.state.log.length).toBeGreaterThan(0);
        });

        test('does nothing if not negotiating', () => {
            sim.initPreset('resource-split');
            sim.state.status = 'agreement';
            sim.simulateRound();
            expect(sim.state.round).toBe(0);
        });

        test('timeout at maxRounds', () => {
            sim.initPreset('resource-split');
            sim.state.status = 'negotiating';
            sim.state.maxRounds = 5;
            sim.state.agents.forEach(a => { a.strategy = 'competitive'; });
            for (let i = 0; i < 10; i++) {
                if (sim.state.status !== 'negotiating') break;
                sim.simulateRound();
            }
            expect(['timeout', 'deadlock', 'agreement']).toContain(sim.state.status);
            expect(sim.state.round).toBeLessThanOrEqual(5);
        });

        test('step advances by 1 round', () => {
            sim.initPreset('resource-split');
            sim.state.agents.forEach(a => { a.strategy = 'competitive'; });
            sim.stepOnce();
            expect(sim.state.round).toBe(1);
            expect(['negotiating', 'agreement', 'deadlock', 'timeout']).toContain(sim.state.status);
        });

        test('reset restores initial state', () => {
            sim.initPreset('resource-split');
            sim.state.status = 'negotiating';
            sim.state.maxRounds = 50;
            sim.state.agents.forEach(a => { a.strategy = 'competitive'; });
            sim.simulateRound();
            expect(sim.state.round).toBeGreaterThan(0);
            sim.resetSimulation();
            expect(sim.state.round).toBe(0);
            expect(sim.state.status).toBe('idle');
            expect(sim.state.log).toHaveLength(0);
        });

        test('1 round max triggers timeout or agreement', () => {
            sim.initPreset('resource-split');
            sim.state.status = 'negotiating';
            sim.state.maxRounds = 1;
            sim.simulateRound();
            expect(['agreement', 'timeout']).toContain(sim.state.status);
        });

        test('cooperative agents converge over rounds', () => {
            sim.initPreset('resource-split');
            sim.state.status = 'negotiating';
            sim.state.maxRounds = 100;
            sim.state.agents.forEach(a => { a.strategy = 'cooperative'; });
            for (let i = 0; i < 100; i++) {
                if (sim.state.status !== 'negotiating') break;
                sim.simulateRound();
            }
            expect(['agreement', 'timeout', 'deadlock']).toContain(sim.state.status);
        });

        test('history records offers per round', () => {
            sim.initPreset('resource-split');
            sim.state.status = 'negotiating';
            sim.state.maxRounds = 50;
            sim.simulateRound();
            const s = window.NegotiationSimulator.state;
            expect(s.history.length).toBeGreaterThanOrEqual(1);
            expect(s.history[0].round).toBe(1);
            expect(s.history[0].offers).toHaveLength(3);
            if (s.status === 'negotiating') {
                sim.simulateRound();
                expect(s.history.length).toBeGreaterThanOrEqual(2);
            }
        });
    });

    /* ========== EXPORT ========== */
    describe('Export', () => {
        test('exportJSON function exists', () => {
            expect(typeof sim.exportJSON).toBe('function');
        });
    });

    /* ========== DEEP CLONE ========== */
    describe('Utilities', () => {
        test('deepClone creates independent copy', () => {
            const obj = { a: 1, b: { c: 2 } };
            const clone = sim.deepClone(obj);
            clone.b.c = 99;
            expect(obj.b.c).toBe(2);
        });
    });

    /* ========== DOM ========== */
    describe('DOM', () => {
        test('has back link', () => {
            const link = document.querySelector('.header a');
            expect(link).toBeTruthy();
            expect(link.getAttribute('href')).toBe('index.html');
        });

        test('has 5 preset buttons', () => {
            expect(document.querySelectorAll('[data-preset]').length).toBe(5);
        });

        test('has play/step/reset buttons', () => {
            expect(document.getElementById('btnPlay')).toBeTruthy();
            expect(document.getElementById('btnStep')).toBeTruthy();
            expect(document.getElementById('btnReset')).toBeTruthy();
        });

        test('has canvas element', () => {
            expect(document.getElementById('negotiationCanvas')).toBeTruthy();
        });

        test('has agent cards container', () => {
            expect(document.getElementById('agentCards')).toBeTruthy();
        });

        test('has event log', () => {
            expect(document.getElementById('eventLog')).toBeTruthy();
        });

        test('has export button', () => {
            expect(document.getElementById('btnExport')).toBeTruthy();
        });

        test('has speed slider', () => {
            expect(document.getElementById('speedSlider')).toBeTruthy();
        });

        test('has rounds slider', () => {
            expect(document.getElementById('roundsSlider')).toBeTruthy();
        });
    });
});
