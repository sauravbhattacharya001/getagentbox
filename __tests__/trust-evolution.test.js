/**
 * @jest-environment jsdom
 */
const fs = require('fs');
const path = require('path');

const html = fs.readFileSync(path.resolve(__dirname, '..', 'trust-evolution.html'), 'utf8');
const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>/);
const scriptContent = scriptMatch[1];

// Extract just the class definition
const classMatch = scriptContent.match(/(class TrustEvolutionSimulator \{[\s\S]*?\n    \})\s*\n/);
const classCode = classMatch[1];

// Evaluate the class in isolation
const TrustEvolutionSimulator = eval(`(function(){ ${classCode}; return TrustEvolutionSimulator; })()`);

describe('TrustEvolutionSimulator', () => {
    let sim;

    beforeEach(() => {
        sim = new TrustEvolutionSimulator();
    });

    describe('Initialization', () => {
        test('initializes with 6 dimensions at 50', () => {
            const state = sim.getState();
            expect(Object.keys(state.dimensions)).toHaveLength(6);
            expect(state.dimensions.competence).toBe(50);
            expect(state.dimensions.reliability).toBe(50);
            expect(state.dimensions.transparency).toBe(50);
            expect(state.dimensions.safety).toBe(50);
            expect(state.dimensions.alignment).toBe(50);
            expect(state.dimensions.benevolence).toBe(50);
        });

        test('starts at tick 0', () => {
            expect(sim.getState().tick).toBe(0);
        });

        test('starts in skepticism phase', () => {
            expect(sim.getState().phase).toBe('skepticism');
        });

        test('starts with empty events', () => {
            expect(sim.getState().events).toHaveLength(0);
        });

        test('history has one initial entry', () => {
            expect(sim.getState().history).toHaveLength(1);
        });

        test('composite score starts at 50', () => {
            expect(sim.getCompositeScore()).toBe(50);
        });
    });

    describe('Composite Score Calculation', () => {
        test('weighted average of dimensions', () => {
            sim.dimensions = { competence: 100, reliability: 100, transparency: 100, safety: 100, alignment: 100, benevolence: 100 };
            expect(sim.getCompositeScore()).toBe(100);
        });

        test('all zeros gives 0', () => {
            sim.dimensions = { competence: 0, reliability: 0, transparency: 0, safety: 0, alignment: 0, benevolence: 0 };
            expect(sim.getCompositeScore()).toBe(0);
        });

        test('clamped to 0-100', () => {
            sim.dimensions = { competence: 150, reliability: 150, transparency: 150, safety: 150, alignment: 150, benevolence: 150 };
            expect(sim.getCompositeScore()).toBe(100);
        });

        test('partial values give weighted result', () => {
            sim.dimensions = { competence: 80, reliability: 60, transparency: 40, safety: 70, alignment: 50, benevolence: 30 };
            const score = sim.getCompositeScore();
            expect(score).toBeGreaterThan(40);
            expect(score).toBeLessThan(80);
        });
    });

    describe('Phase Detection', () => {
        test('low score returns trust_rupture', () => {
            sim.dimensions = { competence: 10, reliability: 10, transparency: 10, safety: 10, alignment: 10, benevolence: 10 };
            expect(sim.detectPhase()).toBe('trust_rupture');
        });

        test('mid-low score returns skepticism', () => {
            sim.dimensions = { competence: 42, reliability: 42, transparency: 42, safety: 42, alignment: 42, benevolence: 42 };
            expect(sim.detectPhase()).toBe('skepticism');
        });

        test('middle score returns calibration', () => {
            sim.dimensions = { competence: 52, reliability: 52, transparency: 52, safety: 52, alignment: 52, benevolence: 52 };
            expect(sim.detectPhase()).toBe('calibration');
        });

        test('moderate high returns trust_building', () => {
            sim.dimensions = { competence: 65, reliability: 65, transparency: 65, safety: 65, alignment: 65, benevolence: 65 };
            expect(sim.detectPhase()).toBe('trust_building');
        });

        test('high score returns established_trust', () => {
            sim.dimensions = { competence: 80, reliability: 80, transparency: 80, safety: 80, alignment: 80, benevolence: 80 };
            expect(sim.detectPhase()).toBe('established_trust');
        });

        test('very high score returns over_reliance', () => {
            sim.dimensions = { competence: 90, reliability: 90, transparency: 90, safety: 90, alignment: 90, benevolence: 90 };
            expect(sim.detectPhase()).toBe('over_reliance');
        });

        test('recovery detected with positive velocity from low score', () => {
            sim.dimensions = { competence: 38, reliability: 38, transparency: 38, safety: 38, alignment: 38, benevolence: 38 };
            sim.velocity = 1.0;
            expect(sim.detectPhase()).toBe('recovery');
        });
    });

    describe('Event Application', () => {
        test('positive event increases dimensions', () => {
            const event = { type: 'positive', impacts: { competence: 5, reliability: 3 } };
            const before = sim.dimensions.competence;
            sim.applyEvent(event);
            expect(sim.dimensions.competence).toBeGreaterThan(before);
        });

        test('negative event decreases dimensions with 3x multiplier', () => {
            const event = { type: 'negative', impacts: { competence: -5 }, severity: 0.5 };
            sim.dimensions.competence = 80;
            sim.applyEvent(event);
            // -5 * (1 + 0.5) * 3 = -22.5
            expect(sim.dimensions.competence).toBeLessThan(58);
        });

        test('dimensions clamped to 0', () => {
            sim.dimensions.competence = 5;
            sim.applyEvent({ type: 'negative', impacts: { competence: -20 }, severity: 0.5 });
            expect(sim.dimensions.competence).toBe(0);
        });

        test('dimensions clamped to 100', () => {
            sim.dimensions.competence = 98;
            sim.applyEvent({ type: 'positive', impacts: { competence: 10 } });
            expect(sim.dimensions.competence).toBe(100);
        });

        test('null event does nothing', () => {
            const before = { ...sim.dimensions };
            sim.applyEvent(null);
            expect(sim.dimensions).toEqual(before);
        });

        test('event without impacts does nothing', () => {
            const before = { ...sim.dimensions };
            sim.applyEvent({ type: 'neutral', impacts: {} });
            expect(sim.dimensions).toEqual(before);
        });
    });

    describe('Asymmetric Dynamics', () => {
        test('loss is significantly larger than equivalent gain', () => {
            const sim1 = new TrustEvolutionSimulator();
            const sim2 = new TrustEvolutionSimulator();
            sim1.dimensions.competence = 50;
            sim2.dimensions.competence = 50;

            sim1.applyEvent({ type: 'positive', impacts: { competence: 5 } });
            sim2.applyEvent({ type: 'negative', impacts: { competence: -5 }, severity: 0.5 });

            const gain = sim1.dimensions.competence - 50;
            const loss = 50 - sim2.dimensions.competence;
            expect(loss).toBeGreaterThan(gain * 2);
        });

        test('over-reliance amplifies losses', () => {
            const sim1 = new TrustEvolutionSimulator();
            const sim2 = new TrustEvolutionSimulator();
            sim1.phase = 'established_trust';
            sim2.phase = 'over_reliance';
            sim1.dimensions.competence = 80;
            sim2.dimensions.competence = 80;

            const event = { type: 'negative', impacts: { competence: -5 }, severity: 0.5 };
            sim1.applyEvent(event);
            sim2.applyEvent(event);

            expect(sim2.dimensions.competence).toBeLessThan(sim1.dimensions.competence);
        });
    });

    describe('Step Execution', () => {
        test('increments tick', () => {
            sim.step();
            expect(sim.getState().tick).toBe(1);
        });

        test('adds to history', () => {
            sim.step();
            expect(sim.getState().history).toHaveLength(2);
        });

        test('updates phase', () => {
            sim.dimensions = { competence: 90, reliability: 90, transparency: 90, safety: 90, alignment: 90, benevolence: 90 };
            sim.step();
            expect(['over_reliance', 'established_trust']).toContain(sim.getState().phase);
        });

        test('decrements intervention cooldown', () => {
            sim.interventionCooldown = 3;
            sim.step();
            expect(sim.interventionCooldown).toBe(2);
        });
    });

    describe('Interventions', () => {
        test('explain intervention boosts transparency', () => {
            const before = sim.dimensions.transparency;
            sim.applyIntervention('explain');
            expect(sim.dimensions.transparency).toBeGreaterThan(before);
        });

        test('intervention sets cooldown', () => {
            sim.applyIntervention('admit');
            expect(sim.interventionCooldown).toBe(3);
        });

        test('intervention during cooldown fails', () => {
            sim.applyIntervention('explain');
            const result = sim.applyIntervention('admit');
            expect(result.success).toBe(false);
            expect(result.reason).toBe('cooldown');
        });

        test('unknown intervention fails', () => {
            const result = sim.applyIntervention('nonexistent');
            expect(result.success).toBe(false);
        });

        test('intervention adds to event log', () => {
            sim.applyIntervention('demonstrate');
            expect(sim.events).toHaveLength(1);
            expect(sim.events[0].type).toBe('intervention');
        });

        test('all 6 intervention types work', () => {
            const types = ['explain', 'admit', 'boundary', 'demonstrate', 'empathize', 'transparency'];
            for (const type of types) {
                const s = new TrustEvolutionSimulator();
                const result = s.applyIntervention(type);
                expect(result.success).toBe(true);
            }
        });
    });

    describe('Presets', () => {
        test('smooth preset loads', () => {
            expect(sim.loadPreset('smooth')).toBe(true);
            expect(sim.dimensions.competence).toBe(45);
        });

        test('catastrophic preset loads', () => {
            expect(sim.loadPreset('catastrophic')).toBe(true);
            expect(sim.dimensions.competence).toBe(60);
        });

        test('erosion preset loads', () => {
            expect(sim.loadPreset('erosion')).toBe(true);
            expect(sim.dimensions.competence).toBe(65);
        });

        test('recovery preset loads with low initial values', () => {
            expect(sim.loadPreset('recovery')).toBe(true);
            expect(sim.getCompositeScore()).toBeLessThan(40);
        });

        test('overreliance preset loads with high values', () => {
            expect(sim.loadPreset('overreliance')).toBe(true);
            expect(sim.getCompositeScore()).toBeGreaterThan(65);
        });

        test('unknown preset returns false', () => {
            expect(sim.loadPreset('nonexistent')).toBe(false);
        });

        test('preset resets tick and events', () => {
            sim.step(); sim.step();
            sim.loadPreset('smooth');
            expect(sim.tick).toBe(0);
            expect(sim.events).toHaveLength(0);
        });

        test('getPresets returns all 5 presets', () => {
            const presets = TrustEvolutionSimulator.getPresets();
            expect(Object.keys(presets)).toHaveLength(5);
        });
    });

    describe('Recovery Mechanics', () => {
        test('trust can recover from low values', () => {
            sim.dimensions = { competence: 20, reliability: 20, transparency: 20, safety: 20, alignment: 20, benevolence: 20 };
            sim.applyIntervention('transparency');
            expect(sim.dimensions.transparency).toBeGreaterThan(20);
        });

        test('multiple interventions over time rebuild trust', () => {
            sim.dimensions = { competence: 20, reliability: 20, transparency: 20, safety: 20, alignment: 20, benevolence: 20 };
            sim.applyIntervention('demonstrate');
            sim.interventionCooldown = 0;
            sim.applyIntervention('explain');
            sim.interventionCooldown = 0;
            sim.applyIntervention('empathize');
            expect(sim.getCompositeScore()).toBeGreaterThanOrEqual(25);
        });
    });

    describe('Phase Info', () => {
        test('returns label and colors for each phase', () => {
            const phases = ['skepticism', 'calibration', 'trust_building', 'established_trust', 'over_reliance', 'trust_rupture', 'recovery'];
            for (const p of phases) {
                const info = sim.getPhaseInfo(p);
                expect(info.label).toBeTruthy();
                expect(info.color).toBeTruthy();
                expect(info.bg).toBeTruthy();
            }
        });
    });

    describe('Event Generation', () => {
        test('getEventPool returns array', () => {
            const pool = sim.getEventPool('skepticism');
            expect(Array.isArray(pool)).toBe(true);
            expect(pool.length).toBeGreaterThan(0);
        });

        test('all phases have event pools', () => {
            const phases = ['skepticism', 'calibration', 'trust_building', 'established_trust', 'over_reliance', 'trust_rupture', 'recovery'];
            for (const p of phases) {
                expect(sim.getEventPool(p).length).toBeGreaterThan(0);
            }
        });

        test('event probability varies by phase', () => {
            expect(sim.getEventProbability('trust_rupture')).toBeGreaterThan(sim.getEventProbability('established_trust'));
        });
    });
});
