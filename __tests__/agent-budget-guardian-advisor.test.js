'use strict';

const { createAgentBudgetGuardianAdvisor } = require('../src/agent-budget-guardian-advisor');

function makeAgent(overrides) {
    return Object.assign({
        id: 'a1',
        name: 'Agent 1',
        monthlyBudgetUsd: 500,
        spentSoFarUsd: 100,
        periodDaysElapsed: 10,
        periodDaysTotal: 30,
        callsLast24h: 100,
        avgCostPerCall: 0.10,
        costTrend: [0.10, 0.10, 0.10],
        taskSuccessRate: 0.9,
        valueDeliveredUsd: 300,
        autonomyLevel: 2,
        tier: 'production'
    }, overrides || {});
}

function freshAdvisor() {
    return createAgentBudgetGuardianAdvisor({
        now: () => new Date('2026-05-18T00:00:00Z')
    });
}

describe('AgentBudgetGuardianAdvisor', () => {
    test('WITHIN_BUDGET when spend pacing fine', () => {
        const advisor = freshAdvisor();
        const r = advisor.analyze({ agents: [makeAgent()] });
        expect(r.agents[0].verdict).toBe('WITHIN_BUDGET');
        expect(r.agents[0].priority).toBe('P3');
        expect(r.portfolio.grade).toBe('A');
    });

    test('MONITOR when projected overrun ~10%', () => {
        // spent 200 over 10d → projected 600 vs budget 550 = ~9% overrun
        const advisor = freshAdvisor();
        const r = advisor.analyze({
            agents: [makeAgent({ spentSoFarUsd: 200, monthlyBudgetUsd: 550 })]
        });
        expect(r.agents[0].verdict).toBe('MONITOR');
        expect(r.agents[0].priority).toBe('P2');
    });

    test('THROTTLE_RATE in 15-40% overrun band with reduce_calls_per_day suggestion', () => {
        // spent 250 over 10d → projected 750 vs budget 600 = +25%
        const advisor = freshAdvisor();
        const r = advisor.analyze({
            agents: [makeAgent({ spentSoFarUsd: 250, monthlyBudgetUsd: 600, callsLast24h: 1000 })]
        });
        expect(r.agents[0].verdict).toBe('THROTTLE_RATE');
        expect(r.agents[0].priority).toBe('P1');
        expect(r.agents[0].recommendedAction.kind).toBe('reduce_calls_per_day');
        expect(r.agents[0].recommendedAction.suggestedValue).toBeLessThan(1000);
    });

    test('FREEZE_NON_CRITICAL when >40% overrun on experimental tier', () => {
        // spent 400 over 10d → projected 1200 vs budget 500 = +140%
        const advisor = freshAdvisor();
        const r = advisor.analyze({
            agents: [makeAgent({ spentSoFarUsd: 400, monthlyBudgetUsd: 500, tier: 'experimental' })]
        });
        expect(r.agents[0].verdict).toBe('FREEZE_NON_CRITICAL');
        expect(r.agents[0].priority).toBe('P0');
        expect(r.agents[0].recommendedAction.kind).toBe('pause_agent');
        expect(r.portfolio.grade).toBe('F');
    });

    test('ESCALATE_BUDGET_REVIEW when >40% overrun on production tier', () => {
        const advisor = freshAdvisor();
        const r = advisor.analyze({
            agents: [makeAgent({ spentSoFarUsd: 400, monthlyBudgetUsd: 500, tier: 'production' })]
        });
        expect(r.agents[0].verdict).toBe('ESCALATE_BUDGET_REVIEW');
        expect(r.agents[0].priority).toBe('P0');
        expect(r.agents[0].recommendedAction.kind).toBe('request_budget_increase');
        expect(r.agents[0].recommendedAction.suggestedValue).toBeGreaterThan(500);
    });

    test('INEFFICIENT_SPEND upgrades a P3 verdict when ROI < 1.0 and spend >= 25% of budget', () => {
        // Within-budget agent with low ROI and significant spend
        const advisor = freshAdvisor();
        const r = advisor.analyze({
            agents: [makeAgent({
                spentSoFarUsd: 150, // 30% of 500 budget
                monthlyBudgetUsd: 500,
                valueDeliveredUsd: 80 // roi ~0.53
            })]
        });
        expect(r.agents[0].verdict).toBe('INEFFICIENT_SPEND');
        expect(r.agents[0].priority).toBe('P1');
        expect(r.agents[0].recommendedAction.kind).toBe('review_prompt_or_model');
    });

    test('INSUFFICIENT_DATA when periodDaysElapsed < 1', () => {
        const advisor = freshAdvisor();
        const r = advisor.analyze({
            agents: [makeAgent({ periodDaysElapsed: 0 })]
        });
        expect(r.agents[0].verdict).toBe('INSUFFICIENT_DATA');
    });

    test('Rising cost trend adds RISING_UNIT_COST reason and bumps risk', () => {
        const advisor = freshAdvisor();
        const flat = advisor.analyze({
            agents: [makeAgent({ costTrend: [0.10, 0.10, 0.10] })]
        });
        const rising = advisor.analyze({
            agents: [makeAgent({ costTrend: [0.10, 0.15, 0.22] })]
        });
        expect(rising.agents[0].riskScore).toBeGreaterThan(flat.agents[0].riskScore);
        const codes = rising.agents[0].reasons.map(r => r.code);
        expect(codes).toContain('RISING_UNIT_COST');
    });

    test('risk_appetite monotonicity: cautious >= balanced >= aggressive', () => {
        const advisor = freshAdvisor();
        const agent = makeAgent({ spentSoFarUsd: 250, monthlyBudgetUsd: 600 });
        const cautious = advisor.analyze({ agents: [agent], options: { risk_appetite: 'cautious' } });
        const balanced = advisor.analyze({ agents: [agent], options: { risk_appetite: 'balanced' } });
        const aggressive = advisor.analyze({ agents: [agent], options: { risk_appetite: 'aggressive' } });
        expect(cautious.agents[0].riskScore).toBeGreaterThanOrEqual(balanced.agents[0].riskScore);
        expect(balanced.agents[0].riskScore).toBeGreaterThanOrEqual(aggressive.agents[0].riskScore);
    });

    test('Portfolio grade is F when any P0 agent present', () => {
        const advisor = freshAdvisor();
        const r = advisor.analyze({
            agents: [
                makeAgent({ id: 'a', spentSoFarUsd: 400, monthlyBudgetUsd: 500, tier: 'production' }),
                makeAgent({ id: 'b' })
            ]
        });
        expect(r.portfolio.grade).toBe('F');
    });

    test('Playbook contains EMERGENCY_BUDGET_REVIEW when portfolio overrun > 25%', () => {
        const advisor = freshAdvisor();
        const r = advisor.analyze({
            agents: [
                makeAgent({ id: 'a', spentSoFarUsd: 500, monthlyBudgetUsd: 500, tier: 'production' })
            ],
            options: { portfolioCapUsd: 800 } // projected 1500 vs cap 800 → +87%
        });
        const ids = r.playbook.map(a => a.id);
        expect(ids).toContain('EMERGENCY_BUDGET_REVIEW');
    });

    test('INTRODUCE_RATE_LIMITS is deduplicated to a single action even with many throttle agents', () => {
        const advisor = freshAdvisor();
        const agents = [];
        for (let i = 0; i < 5; i++) {
            agents.push(makeAgent({ id: 'a' + i, spentSoFarUsd: 250, monthlyBudgetUsd: 600 }));
        }
        const r = advisor.analyze({ agents });
        const rate = r.playbook.filter(a => a.id === 'INTRODUCE_RATE_LIMITS');
        expect(rate.length).toBe(1);
        expect(rate[0].agentIds.length).toBe(5);
    });

    test('simulate({applyTop:2}) reduces projectedTotalSpendUsd', () => {
        const advisor = freshAdvisor();
        const r = advisor.analyze({
            agents: [
                makeAgent({ id: 'a', spentSoFarUsd: 400, monthlyBudgetUsd: 500, tier: 'experimental' }),
                makeAgent({ id: 'b', spentSoFarUsd: 400, monthlyBudgetUsd: 500, tier: 'experimental' }),
                makeAgent({ id: 'c', spentSoFarUsd: 250, monthlyBudgetUsd: 600 })
            ],
            options: { portfolioCapUsd: 2000 }
        });
        const sim = advisor.simulate({ applyTop: 2 }, r);
        expect(sim.projectedTotalSpendUsd).toBeLessThan(r.portfolio.totalProjectedSpendUsd);
        expect(sim.appliedActions.length).toBe(2);
    });

    test('formatJson is byte-stable across two calls', () => {
        const advisor = freshAdvisor();
        const r1 = advisor.analyze({ agents: [makeAgent()] });
        const r2 = advisor.analyze({ agents: [makeAgent()] });
        expect(advisor.formatJson(r1)).toBe(advisor.formatJson(r2));
    });

    test('formatMarkdown includes table, ## Playbook, and ## Insights sections', () => {
        const advisor = freshAdvisor();
        const r = advisor.analyze({
            agents: [makeAgent({ spentSoFarUsd: 250, monthlyBudgetUsd: 600 })]
        });
        const md = advisor.formatMarkdown(r);
        expect(md).toMatch(/\| Agent \| Verdict \|/);
        expect(md).toMatch(/## Playbook/);
        expect(md).toMatch(/## Insights/);
    });

    test('analyze() never mutates input', () => {
        const advisor = freshAdvisor();
        const agents = [makeAgent({ costTrend: [0.10, 0.20, 0.30] })];
        const snapshot = JSON.stringify(agents);
        advisor.analyze({ agents });
        expect(JSON.stringify(agents)).toBe(snapshot);
    });

    test('FREEZE_FLEET_NON_CRITICAL appears when >=2 experimental agents in P0 freeze', () => {
        const advisor = freshAdvisor();
        const r = advisor.analyze({
            agents: [
                makeAgent({ id: 'a', spentSoFarUsd: 400, monthlyBudgetUsd: 500, tier: 'experimental' }),
                makeAgent({ id: 'b', spentSoFarUsd: 400, monthlyBudgetUsd: 500, tier: 'internal' })
            ]
        });
        const ids = r.playbook.map(a => a.id);
        expect(ids).toContain('FREEZE_FLEET_NON_CRITICAL');
    });
});
