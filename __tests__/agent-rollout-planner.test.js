/**
 * Tests for AgentRolloutPlanner.
 */
'use strict';

const AgentRolloutPlanner = require('../src/agent-rollout-planner.js');

describe('AgentRolloutPlanner.plan()', () => {
    test('high-risk healthcare agent forces multi-phase plan with approval required', () => {
        const p = AgentRolloutPlanner.plan(
            { name: 'MedBot', trustScore: 55, autonomyLevel: 'L3_act',
              riskAppetite: 'cautious', domain: 'healthcare', blastRadius: 4,
              priorIncidents: 1 },
            { audience: 'public', maxTrafficPercent: 100,
              environments: ['staging', 'prod'], timelineDays: 21 }
        );
        expect(p.riskScore).toBeGreaterThanOrEqual(40);
        expect(p.recommendedPhaseCount).toBeGreaterThanOrEqual(5);
        expect(p.approval.required).toBe(true);
        expect(p.approval.approvers).toEqual(expect.arrayContaining(['security']));
        expect(p.approval.approvers).toEqual(expect.arrayContaining(['compliance']));
        // healthcare-specific gate
        expect(p.goNoGoMatrix.map(g => g.gate)).toEqual(
            expect.arrayContaining(['compliance_signoff_hipaa'])
        );
    });

    test('low-risk cautious internal yields short plan and no approval', () => {
        const p = AgentRolloutPlanner.plan(
            { name: 'NoteTaker', trustScore: 92, autonomyLevel: 'L1_suggest',
              riskAppetite: 'balanced', domain: 'support', blastRadius: 1,
              priorIncidents: 0 },
            { audience: 'internal', maxTrafficPercent: 100,
              environments: ['staging', 'prod'], timelineDays: 7 }
        );
        expect(p.riskScore).toBeLessThan(40);
        expect(p.recommendedPhaseCount).toBeLessThanOrEqual(4);
        expect(p.approval.required).toBe(false);
        expect(p.approval.approvers).toEqual([]);
    });

    test('L4 autonomous + 100% public triggers big_bang_blocked warning', () => {
        const p = AgentRolloutPlanner.plan(
            { name: 'Hydra', trustScore: 40, autonomyLevel: 'L4_autonomous',
              riskAppetite: 'aggressive', domain: 'devops', blastRadius: 5,
              priorIncidents: 4 },
            { audience: 'public', maxTrafficPercent: 100,
              environments: ['staging', 'prod'], timelineDays: 30 }
        );
        expect(p.strategy).toBe('big_bang_blocked');
        expect(p.warnings.join(' ')).toMatch(/big_bang_blocked/);
        expect(p.recommendedPhaseCount).toBeGreaterThanOrEqual(6);
    });

    test('last phase trafficPercent equals maxTrafficPercent', () => {
        const p = AgentRolloutPlanner.plan(
            { trustScore: 70, autonomyLevel: 'L2_act_with_approval' },
            { audience: 'beta', maxTrafficPercent: 50, environments: ['prod'], timelineDays: 10 }
        );
        const last = p.phases[p.phases.length - 1];
        expect(last.trafficPercent).toBe(50);
    });

    test('per-phase durations sum to timelineDays', () => {
        const p = AgentRolloutPlanner.plan(
            { trustScore: 75 },
            { audience: 'beta', timelineDays: 14 }
        );
        const sum = p.phases.reduce((a, ph) => a + ph.durationDays, 0);
        expect(sum).toBe(14);
        expect(p.timeline.totalDays).toBe(14);
    });

    test('cautious appetite tightens kpi targets vs aggressive', () => {
        const cautious = AgentRolloutPlanner.plan(
            { trustScore: 80, riskAppetite: 'cautious' },
            { audience: 'beta', timelineDays: 10 }
        );
        const aggressive = AgentRolloutPlanner.plan(
            { trustScore: 80, riskAppetite: 'aggressive' },
            { audience: 'beta', timelineDays: 10 }
        );
        const cErr = cautious.phases[0].kpis.find(k => k.name === 'error_rate');
        const aErr = aggressive.phases[0].kpis.find(k => k.name === 'error_rate');
        expect(cErr.target).toBeLessThan(aErr.target);
        const cTask = cautious.phases[0].kpis.find(k => k.name === 'task_completion');
        const aTask = aggressive.phases[0].kpis.find(k => k.name === 'task_completion');
        expect(cTask.target).toBeGreaterThan(aTask.target);
    });

    test('warning emitted when trustScore is low', () => {
        const p = AgentRolloutPlanner.plan(
            { trustScore: 30 },
            { audience: 'beta', timelineDays: 14 }
        );
        expect(p.warnings.some(w => w.includes('low_trust_score'))).toBe(true);
    });

    test('options.phaseCount override respected', () => {
        const p = AgentRolloutPlanner.plan(
            { trustScore: 90 },
            { audience: 'beta', timelineDays: 14 },
            { phaseCount: 5 }
        );
        expect(p.recommendedPhaseCount).toBe(5);
        expect(p.phases).toHaveLength(5);
    });

    test('deterministic across two calls with same inputs', () => {
        const a = AgentRolloutPlanner.plan(
            { name: 'X', trustScore: 70, domain: 'finance' },
            { audience: 'public', timelineDays: 14 },
            { now: 1700000000000 }
        );
        const b = AgentRolloutPlanner.plan(
            { name: 'X', trustScore: 70, domain: 'finance' },
            { audience: 'public', timelineDays: 14 },
            { now: 1700000000000 }
        );
        expect(JSON.stringify(a)).toBe(JSON.stringify(b));
    });

    test('observability includes rollback alerts and dashboards', () => {
        const p = AgentRolloutPlanner.plan(
            { name: 'Atlas', trustScore: 70, domain: 'support' },
            { audience: 'beta', timelineDays: 14 }
        );
        expect(p.observability.requiredSignals).toEqual(
            expect.arrayContaining(['error_rate', 'latency_p95'])
        );
        expect(p.observability.dashboards.some(d => d.includes('atlas'))).toBe(true);
        expect(p.observability.alerts.length).toBeGreaterThan(0);
    });
});

describe('AgentRolloutPlanner.simulate()', () => {
    test('all-pass outcomes promote to steady state', () => {
        const p = AgentRolloutPlanner.plan(
            { trustScore: 80 },
            { audience: 'beta', timelineDays: 14 }
        );
        const outcomes = p.phases.map(() => ({ pass: true }));
        const s = AgentRolloutPlanner.simulate(p, outcomes);
        expect(s.haltedAt).toBeNull();
        expect(s.advancedThrough).toBe(p.phases.length - 1);
        expect(s.recommendation).toBe('promote_to_steady_state');
    });

    test('error_rate breach mid-flight recommends rollback', () => {
        const p = AgentRolloutPlanner.plan(
            { trustScore: 75 },
            { audience: 'beta', timelineDays: 14 }
        );
        const outcomes = [
            { pass: true },
            { pass: false, breachedKpi: 'error_rate' }
        ];
        const s = AgentRolloutPlanner.simulate(p, outcomes);
        expect(s.haltedAt).toBe(1);
        expect(s.advancedThrough).toBe(0);
        expect(s.recommendation).toBe('rollback_to_previous_phase');
        expect(s.reason).toBe('error_rate');
    });

    test('first phase failure recommends hard_stop', () => {
        const p = AgentRolloutPlanner.plan(
            { trustScore: 75 },
            { audience: 'beta', timelineDays: 14 }
        );
        const outcomes = [{ pass: false, breachedKpi: 'latency_p95' }];
        const s = AgentRolloutPlanner.simulate(p, outcomes);
        expect(s.haltedAt).toBe(0);
        expect(s.advancedThrough).toBe(-1);
        expect(s.recommendation).toBe('hard_stop');
    });

    test('approval_rate breach pauses and investigates', () => {
        const p = AgentRolloutPlanner.plan(
            { trustScore: 75, autonomyLevel: 'L2_act_with_approval' },
            { audience: 'beta', timelineDays: 14 }
        );
        const outcomes = [
            { pass: true },
            { pass: true },
            { pass: false, breachedKpi: 'approval_rate' }
        ];
        const s = AgentRolloutPlanner.simulate(p, outcomes);
        expect(s.haltedAt).toBe(2);
        expect(s.recommendation).toBe('pause_and_investigate');
    });
});

describe('AgentRolloutPlanner formatters', () => {
    const p = AgentRolloutPlanner.plan(
        { name: 'Orion', trustScore: 65, domain: 'finance', autonomyLevel: 'L3_act' },
        { audience: 'public', timelineDays: 14 }
    );

    test('formatMarkdown contains heading and phase table header', () => {
        const md = AgentRolloutPlanner.formatMarkdown(p);
        expect(md).toMatch(/^# Rollout Plan – Orion/);
        expect(md).toMatch(/\| # \| Name \| Env \| Traffic \| Days \| Blast \| KPIs \|/);
    });

    test('formatText is plain (no markdown table pipes for the header)', () => {
        const txt = AgentRolloutPlanner.formatText(p);
        expect(txt).toMatch(/Rollout Plan – Orion/);
        expect(txt).not.toMatch(/^\| # \|/m);
    });

    test('formatJson returns valid JSON containing strategy and phases', () => {
        const j = AgentRolloutPlanner.formatJson(p);
        const parsed = JSON.parse(j);
        expect(parsed.strategy).toBe(p.strategy);
        expect(Array.isArray(parsed.phases)).toBe(true);
    });
});
