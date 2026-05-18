'use strict';

const { createAgentAutonomyTuningAdvisor } = require('../src/agent-autonomy-tuning-advisor');

const FIXED_NOW = new Date('2026-05-18T00:00:00Z');

function freshAdvisor() {
    return createAgentAutonomyTuningAdvisor({ now: () => FIXED_NOW });
}

function makeAgent(overrides) {
    return Object.assign({
        id: 'a1',
        name: 'Agent 1',
        currentLevel: 3,
        daysAtCurrentLevel: 20,
        taskCount: 200,
        successRate: 0.90,
        interventionRate: 0.10,
        criticalErrorCount: 0,
        rollbackCount: 0,
        avgResponseTimeMs: 800,
        category: 'support',
        riskMix: { low: 50, medium: 30, high: 15, critical: 5 },
        recentIncidents: [],
        approvalLatencyMins: 10
    }, overrides || {});
}

describe('AgentAutonomyTuningAdvisor', () => {
    test('empty fleet yields stable grade with MAINTAIN_OBSERVABILITY playbook', () => {
        const advisor = freshAdvisor();
        const r = advisor.analyze({ agents: [] });
        expect(r.portfolio.totalAgents).toBe(0);
        expect(r.portfolio.band).toBe('STABLE');
        expect(['A', 'B']).toContain(r.portfolio.grade);
        expect(r.playbook[0].id).toBe('MAINTAIN_OBSERVABILITY');
    });

    test('INSUFFICIENT_DATA when taskCount<10', () => {
        const advisor = freshAdvisor();
        const r = advisor.analyze({ agents: [makeAgent({ taskCount: 5 })] });
        expect(r.agents[0].verdict).toBe('INSUFFICIENT_DATA');
        expect(r.agents[0].priority).toBe('P3');
        expect(r.agents[0].confidence).toBeLessThanOrEqual(40);
    });

    test('PROMOTE_LEVEL at level 2 with strong record', () => {
        const advisor = freshAdvisor();
        const r = advisor.analyze({
            agents: [makeAgent({
                currentLevel: 2, successRate: 0.97, interventionRate: 0.03,
                daysAtCurrentLevel: 30, criticalErrorCount: 0, rollbackCount: 0,
                recentIncidents: []
            })]
        });
        expect(r.agents[0].verdict).toBe('PROMOTE_LEVEL');
        expect(r.agents[0].recommendedLevel).toBe(3);
        expect(r.agents[0].priority).toBe('P2');
    });

    test('PILOT_PROMOTION at level 4 with strong record', () => {
        const advisor = freshAdvisor();
        const r = advisor.analyze({
            agents: [makeAgent({
                currentLevel: 4, successRate: 0.94, interventionRate: 0.08,
                daysAtCurrentLevel: 30, recentIncidents: []
            })]
        });
        expect(r.agents[0].verdict).toBe('PILOT_PROMOTION');
        expect(r.agents[0].recommendedLevel).toBe(5);
    });

    test('MAINTAIN_LEVEL on solid but not promotion-ready agent', () => {
        const advisor = freshAdvisor();
        const r = advisor.analyze({
            agents: [makeAgent({ successRate: 0.88, interventionRate: 0.12, daysAtCurrentLevel: 10 })]
        });
        expect(r.agents[0].verdict).toBe('MAINTAIN_LEVEL');
        expect(r.agents[0].recommendedLevel).toBe(r.agents[0].currentLevel);
    });

    test('DEMOTE_ONE_NOTCH on successRate 0.70 at level 4', () => {
        const advisor = freshAdvisor();
        const r = advisor.analyze({
            agents: [makeAgent({ currentLevel: 4, successRate: 0.70, interventionRate: 0.15 })]
        });
        expect(r.agents[0].verdict).toBe('DEMOTE_ONE_NOTCH');
        expect(r.agents[0].recommendedLevel).toBe(3);
        expect(r.agents[0].priority).toBe('P1');
    });

    test('FREEZE_TO_MANUAL when critical incident 3 days ago at level 4', () => {
        const advisor = freshAdvisor();
        const r = advisor.analyze({
            agents: [makeAgent({
                currentLevel: 4,
                recentIncidents: [{ severity: 'critical', daysAgo: 3 }]
            })]
        });
        expect(r.agents[0].verdict).toBe('FREEZE_TO_MANUAL');
        expect(r.agents[0].recommendedLevel).toBe(1);
        expect(r.agents[0].priority).toBe('P0');
    });

    test('FREEZE_TO_MANUAL on criticalErrorCount=3', () => {
        const advisor = freshAdvisor();
        const r = advisor.analyze({ agents: [makeAgent({ criticalErrorCount: 3 })] });
        expect(r.agents[0].verdict).toBe('FREEZE_TO_MANUAL');
        expect(r.agents[0].recommendedLevel).toBe(1);
    });

    test('recommendedLevel clamps to [1,5]', () => {
        const advisor = freshAdvisor();
        const r = advisor.analyze({
            agents: [
                makeAgent({ id: 'low', currentLevel: 1, criticalErrorCount: 3 }),
                makeAgent({ id: 'high', currentLevel: 5, successRate: 0.98, interventionRate: 0.02, daysAtCurrentLevel: 30 })
            ]
        });
        r.agents.forEach(a => {
            expect(a.recommendedLevel).toBeGreaterThanOrEqual(1);
            expect(a.recommendedLevel).toBeLessThanOrEqual(5);
        });
    });

    test('grade F when any FREEZE present', () => {
        const advisor = freshAdvisor();
        const r = advisor.analyze({
            agents: [makeAgent(), makeAgent({ id: 'b', criticalErrorCount: 3 })]
        });
        expect(r.portfolio.grade).toBe('F');
    });

    test('CRISIS band when freeze present', () => {
        const advisor = freshAdvisor();
        const r = advisor.analyze({ agents: [makeAgent({ criticalErrorCount: 3 })] });
        expect(r.portfolio.band).toBe('CRISIS');
    });

    test('risk appetite monotonic: cautious <= balanced <= aggressive', () => {
        const advisor = freshAdvisor();
        const agents = [
            makeAgent({ id: 'x', successRate: 0.85, interventionRate: 0.12 }),
            makeAgent({ id: 'y', currentLevel: 4, successRate: 0.83, interventionRate: 0.15 })
        ];
        const c = advisor.analyze({ agents, risk_appetite: 'cautious' });
        const b = advisor.analyze({ agents, risk_appetite: 'balanced' });
        const a = advisor.analyze({ agents, risk_appetite: 'aggressive' });
        expect(c.portfolio.fleetAutonomyScore).toBeLessThanOrEqual(b.portfolio.fleetAutonomyScore + 0.001);
        expect(b.portfolio.fleetAutonomyScore).toBeLessThanOrEqual(a.portfolio.fleetAutonomyScore + 0.001);
    });

    test('playbook P0-first ordering', () => {
        const advisor = freshAdvisor();
        const r = advisor.analyze({
            agents: [
                makeAgent({ id: 'freezy', criticalErrorCount: 3 }),
                makeAgent({ id: 'promo', currentLevel: 2, successRate: 0.97, interventionRate: 0.03, daysAtCurrentLevel: 30 })
            ]
        });
        const ranks = { P0: 0, P1: 1, P2: 2, P3: 3 };
        for (let i = 1; i < r.playbook.length; i++) {
            expect(ranks[r.playbook[i].priority]).toBeGreaterThanOrEqual(ranks[r.playbook[i - 1].priority]);
        }
        expect(r.playbook[0].priority).toBe('P0');
    });

    test('CRITICAL_INCIDENT_CLUSTER insight when >=2 agents with recent critical incident', () => {
        const advisor = freshAdvisor();
        const r = advisor.analyze({
            agents: [
                makeAgent({ id: 'a', recentIncidents: [{ severity: 'critical', daysAgo: 5 }] }),
                makeAgent({ id: 'b', recentIncidents: [{ severity: 'critical', daysAgo: 10 }] })
            ]
        });
        expect(r.insights.some(i => i.code === 'CRITICAL_INCIDENT_CLUSTER')).toBe(true);
    });

    test('HUMAN_BOTTLENECK_PATTERN insight when >=2 agents have slow approvals at low level', () => {
        const advisor = freshAdvisor();
        const r = advisor.analyze({
            agents: [
                makeAgent({ id: 'a', currentLevel: 2, successRate: 0.96, interventionRate: 0.04, daysAtCurrentLevel: 30, approvalLatencyMins: 90 }),
                makeAgent({ id: 'b', currentLevel: 2, successRate: 0.96, interventionRate: 0.04, daysAtCurrentLevel: 30, approvalLatencyMins: 120 })
            ]
        });
        expect(r.insights.some(i => i.code === 'HUMAN_BOTTLENECK_PATTERN')).toBe(true);
    });

    test('simulate projected score >= original when applying top actions', () => {
        const advisor = freshAdvisor();
        const r = advisor.analyze({
            agents: [makeAgent({ currentLevel: 4, successRate: 0.72, interventionRate: 0.20 })]
        });
        const sim = advisor.simulate({ applyTop: r.playbook.length }, r);
        expect(sim.projectedFleetAutonomyScore).toBeGreaterThanOrEqual(r.portfolio.fleetAutonomyScore - 0.001);
        expect(Array.isArray(sim.appliedActions)).toBe(true);
    });

    test('formatJson is byte-stable and reproducible', () => {
        const advisor = freshAdvisor();
        const r = advisor.analyze({ agents: [makeAgent(), makeAgent({ id: 'b' })] });
        const j1 = advisor.formatJson(r);
        const j2 = advisor.formatJson(r);
        expect(j1).toBe(j2);
        expect(() => JSON.parse(j1)).not.toThrow();
    });

    test('markdown renderer contains required sections', () => {
        const advisor = freshAdvisor();
        const r = advisor.analyze({ agents: [makeAgent()] });
        const md = advisor.formatMarkdown(r);
        expect(md).toContain('## Summary');
        expect(md).toContain('## Agents');
        expect(md).toContain('## Playbook');
        expect(md).toContain('## Insights');
    });

    test('does not mutate input agents array', () => {
        const advisor = freshAdvisor();
        const agents = [makeAgent({ id: 'a' }), makeAgent({ id: 'b', criticalErrorCount: 3 })];
        const snapshot = JSON.stringify(agents);
        advisor.analyze({ agents });
        expect(JSON.stringify(agents)).toBe(snapshot);
    });

    test('aggressive appetite trims P3 fallback when other actions present', () => {
        const advisor = freshAdvisor();
        const r = advisor.analyze({
            agents: [
                makeAgent({ id: 'freeze', criticalErrorCount: 3 })
            ],
            risk_appetite: 'aggressive'
        });
        const ids = r.playbook.map(p => p.id);
        expect(ids).not.toContain('MAINTAIN_OBSERVABILITY');
        expect(ids).toContain('FREEZE_FLEET_HOT_AGENTS');
    });

    test('cautious adds SCHEDULE_QUARTERLY_AUTONOMY_REVIEW when grade is C/D/F', () => {
        const advisor = freshAdvisor();
        const r = advisor.analyze({
            agents: [makeAgent({ criticalErrorCount: 3 })],
            risk_appetite: 'cautious'
        });
        expect(r.playbook.some(p => p.id === 'SCHEDULE_QUARTERLY_AUTONOMY_REVIEW')).toBe(true);
    });
});
