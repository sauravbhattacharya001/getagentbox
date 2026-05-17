'use strict';

const AgentDriftDetector = require('../src/agent-drift-detector.js');

function makeBaseline(overrides) {
    return Object.assign({
        windowLabel: 'last_7d',
        sampleSize: 500,
        metrics: {
            taskSuccessRate: 0.92,
            errorRate: 0.03,
            latencyP95Ms: 800,
            hallucinationRate: 0.02,
            escalationRate: 0.05,
            userSatisfaction: 0.85,
            avgCostPerTask: 0.04,
            toolInvocationDiversity: 0.7,
            promptInjectionAttempts: 4,
            avgTokensPerTask: 1200
        }
    }, overrides || {});
}

function makeRegressedCurrent(overrides) {
    return Object.assign({
        windowLabel: 'last_1d',
        sampleSize: 500,
        metrics: {
            taskSuccessRate: 0.75,
            errorRate: 0.18,
            latencyP95Ms: 1900,
            hallucinationRate: 0.12,
            escalationRate: 0.18,
            userSatisfaction: 0.6,
            avgCostPerTask: 0.11,
            toolInvocationDiversity: 0.3,
            promptInjectionAttempts: 70,
            avgTokensPerTask: 2600
        }
    }, overrides || {});
}

function makeImprovedCurrent() {
    return {
        windowLabel: 'last_1d',
        sampleSize: 500,
        metrics: {
            taskSuccessRate: 0.97,
            errorRate: 0.01,
            latencyP95Ms: 500,
            hallucinationRate: 0.005,
            escalationRate: 0.02,
            userSatisfaction: 0.95,
            avgCostPerTask: 0.02,
            toolInvocationDiversity: 0.85,
            promptInjectionAttempts: 1,
            avgTokensPerTask: 900
        }
    };
}

describe('AgentDriftDetector.analyze()', () => {
    test('pure regression yields F grade, critical trajectory, high driftScore', () => {
        const r = AgentDriftDetector.analyze({
            baseline: makeBaseline(),
            current: makeRegressedCurrent()
        });
        expect(r.driftScore).toBeGreaterThanOrEqual(60);
        expect(['F', 'D']).toContain(r.grade); // very likely F, allow D as safety
        expect(['critical', 'degrading']).toContain(r.trajectory);
        // All ten metrics should appear in findings, all regressing
        expect(r.findings.length).toBe(10);
        const allRegressing = r.findings.every((f) => f.regressing);
        expect(allRegressing).toBe(true);
        // Findings sorted by severity desc
        for (let i = 1; i < r.findings.length; i++) {
            expect(r.findings[i - 1].severity).toBeGreaterThanOrEqual(r.findings[i].severity);
        }
    });

    test('pure improvement: no regressions, low driftScore, A grade', () => {
        const r = AgentDriftDetector.analyze({
            baseline: makeBaseline(),
            current: makeImprovedCurrent()
        });
        expect(r.driftScore).toBeLessThan(10);
        expect(r.grade).toBe('A');
        expect(r.trajectory).toBe('stable');
        expect(r.findings.every((f) => !f.regressing)).toBe(true);
    });

    test('mixed: some regress, some improve — partial grade and correct sort', () => {
        const current = makeBaseline().metrics;
        // regress only hallucination and error rate, keep the rest
        const r = AgentDriftDetector.analyze({
            baseline: makeBaseline(),
            current: {
                windowLabel: 'last_1d',
                sampleSize: 500,
                metrics: Object.assign({}, current, {
                    hallucinationRate: 0.10,
                    errorRate: 0.12
                })
            }
        });
        expect(r.findings[0].regressing).toBe(true);
        const regCount = r.findings.filter((f) => f.regressing).length;
        expect(regCount).toBeGreaterThanOrEqual(2);
        expect(regCount).toBeLessThan(10);
        expect(['B', 'C', 'D', 'F']).toContain(r.grade);
    });

    test('missing metrics show up in coverage and do not crash', () => {
        const r = AgentDriftDetector.analyze({
            baseline: {
                windowLabel: 'b',
                sampleSize: 100,
                metrics: { errorRate: 0.02, hallucinationRate: 0.01 }
            },
            current: {
                windowLabel: 'c',
                sampleSize: 100,
                metrics: { errorRate: 0.10, hallucinationRate: 0.05 }
            }
        });
        expect(r.coverage.metricsPresent).toEqual(['errorRate', 'hallucinationRate']);
        expect(r.coverage.metricsMissing.length).toBe(8);
        expect(r.findings.length).toBe(2);
    });

    test('small sampleSize lowers confidence and damps severity', () => {
        const big = AgentDriftDetector.analyze({
            baseline: makeBaseline({ sampleSize: 500 }),
            current: makeRegressedCurrent({ sampleSize: 500 })
        });
        const small = AgentDriftDetector.analyze({
            baseline: makeBaseline({ sampleSize: 8 }),
            current: makeRegressedCurrent({ sampleSize: 8 })
        });
        expect(small.confidence).toBeLessThan(big.confidence);
        expect(small.driftScore).toBeLessThan(big.driftScore);
    });

    test('options.thresholds override is respected', () => {
        const lax = AgentDriftDetector.analyze({
            baseline: makeBaseline(),
            current: makeRegressedCurrent(),
            options: {
                thresholds: {
                    errorRate: { warn: 10.0, critical: 20.0, minPctChange: 50.0 }
                }
            }
        });
        const errFinding = lax.findings.find((f) => f.metric === 'errorRate');
        expect(errFinding.regressing).toBe(false);
    });

    test('cautious risk appetite includes more P1/P2 than aggressive', () => {
        const cautious = AgentDriftDetector.analyze({
            baseline: makeBaseline(),
            current: makeRegressedCurrent(),
            agentProfile: { riskAppetite: 'cautious' }
        });
        const aggressive = AgentDriftDetector.analyze({
            baseline: makeBaseline(),
            current: makeRegressedCurrent(),
            agentProfile: { riskAppetite: 'aggressive' }
        });
        const cautP2 = cautious.playbook.filter((a) => a.priority === 'P2').length;
        const aggP2 = aggressive.playbook.filter((a) => a.priority === 'P2').length;
        expect(aggP2).toBe(0);
        expect(cautP2).toBeGreaterThan(aggP2);
        // aggressive still keeps all P0 actions
        const cautP0 = cautious.playbook.filter((a) => a.priority === 'P0').length;
        const aggP0 = aggressive.playbook.filter((a) => a.priority === 'P0').length;
        expect(aggP0).toBe(cautP0);
    });

    test('prompt-injection spike adds tighten_tool_policy as P0', () => {
        const r = AgentDriftDetector.analyze({
            baseline: makeBaseline({ metrics: Object.assign({}, makeBaseline().metrics, { promptInjectionAttempts: 2 }) }),
            current: makeBaseline({ windowLabel: 'last_1d', metrics: Object.assign({}, makeBaseline().metrics, { promptInjectionAttempts: 80 }) })
        });
        const a = r.playbook.find((x) => x.id === 'tighten_tool_policy');
        expect(a).toBeDefined();
        expect(a.priority).toBe('P0');
    });

    test('co-regression of error+hallucination triggers rotate_prompt_template_to_last_good', () => {
        const r = AgentDriftDetector.analyze({
            baseline: makeBaseline(),
            current: makeRegressedCurrent()
        });
        expect(r.playbook.some((a) => a.id === 'rotate_prompt_template_to_last_good')).toBe(true);
        // freeze + human-review should also be P0
        expect(r.playbook.some((a) => a.id === 'freeze_autonomy_one_notch' && a.priority === 'P0')).toBe(true);
        expect(r.playbook.some((a) => a.id === 'enable_human_review_for_high_risk_tasks' && a.priority === 'P0')).toBe(true);
    });

    test('invalid input throws', () => {
        expect(() => AgentDriftDetector.analyze(null)).toThrow(/object/);
        expect(() => AgentDriftDetector.analyze({})).toThrow(/baseline/);
        expect(() => AgentDriftDetector.analyze({ baseline: {}, current: {} })).toThrow(/metrics/);
    });
});

describe('AgentDriftDetector.simulate()', () => {
    test('applying top-N actions reduces projected driftScore monotonically', () => {
        const r = AgentDriftDetector.analyze({
            baseline: makeBaseline(),
            current: makeRegressedCurrent()
        });
        const s1 = AgentDriftDetector.simulate(r, { applyTop: 1 });
        const s3 = AgentDriftDetector.simulate(r, { applyTop: 3 });
        const s8 = AgentDriftDetector.simulate(r, { applyTop: 8 });
        expect(s1.projectedDriftScore).toBeLessThanOrEqual(r.driftScore);
        expect(s3.projectedDriftScore).toBeLessThanOrEqual(s1.projectedDriftScore);
        expect(s8.projectedDriftScore).toBeLessThanOrEqual(s3.projectedDriftScore);
        expect(s3.deltaScore).toBeLessThanOrEqual(0);
        expect(s3.appliedActions.length).toBeLessThanOrEqual(3);
        expect(s8.projectedGrade).toBeDefined();
    });

    test('simulate throws on bad input', () => {
        expect(() => AgentDriftDetector.simulate(null)).toThrow();
        expect(() => AgentDriftDetector.simulate({})).toThrow();
    });
});

describe('AgentDriftDetector formatters & determinism', () => {
    const r = AgentDriftDetector.analyze({
        baseline: makeBaseline(),
        current: makeRegressedCurrent(),
        agentProfile: { name: 'GuideBot', riskAppetite: 'balanced' }
    });

    test('formatText returns non-empty string with header', () => {
        const s = AgentDriftDetector.formatText(r);
        expect(typeof s).toBe('string');
        expect(s.length).toBeGreaterThan(50);
        expect(s).toMatch(/AgentDriftDetector Report/);
    });

    test('formatMarkdown returns markdown with table header', () => {
        const s = AgentDriftDetector.formatMarkdown(r);
        expect(s).toMatch(/^# AgentDriftDetector/);
        expect(s).toMatch(/\| Metric \|/);
        expect(s).toMatch(/Playbook P0/);
    });

    test('formatJson parses to identical-shape object and is deterministic', () => {
        const j1 = AgentDriftDetector.formatJson(r);
        const r2 = AgentDriftDetector.analyze({
            baseline: makeBaseline(),
            current: makeRegressedCurrent(),
            agentProfile: { name: 'GuideBot', riskAppetite: 'balanced' }
        });
        const j2 = AgentDriftDetector.formatJson(r2);
        expect(j1).toBe(j2);
        const parsed = JSON.parse(j1);
        expect(parsed.driftScore).toBe(r.driftScore);
        expect(parsed.grade).toBe(r.grade);
        expect(Array.isArray(parsed.findings)).toBe(true);
    });
});
