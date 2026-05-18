'use strict';

const { createAgentEscalationAdvisor } = require('../src/agent-escalation-advisor');

const FIXED_NOW = new Date('2026-05-18T12:00:00Z');
const MIN = 60 * 1000;

function freshAdvisor() {
    return createAgentEscalationAdvisor({ now: () => FIXED_NOW });
}

function inc(overrides) {
    return Object.assign({
        id: 'i1',
        agentId: 'agent-1',
        taskId: 'task-1',
        status: 'in_progress',
        startedAt: new Date(FIXED_NOW.getTime() - 10 * MIN).toISOString(),
        lastUpdateAt: new Date(FIXED_NOW.getTime() - 1 * MIN).toISOString(),
        retries: 0,
        maxRetries: 3,
        confidence: 0.85,
        autonomyLevel: 3,
        blastRadius: 2,
        domain: 'general',
        userWaiting: false,
        slaMinutes: 60,
        errorClass: null
    }, overrides || {});
}

describe('AgentEscalationAdvisor', () => {
    test('empty fleet -> CALM grade A with HEALTHY/EMPTY insight', () => {
        const r = freshAdvisor().analyze({ incidents: [] });
        expect(r.portfolio.totalIncidents).toBe(0);
        expect(r.portfolio.band).toBe('CALM');
        expect(r.portfolio.grade).toBe('A');
        expect(r.playbook[0].id).toBe('MAINTAIN_OBSERVABILITY');
        expect(r.insights.some(i => i.code === 'EMPTY_FLEET')).toBe(true);
    });

    test('healthy incident -> CONTINUE_AUTONOMOUSLY P3', () => {
        const r = freshAdvisor().analyze({ incidents: [inc()] });
        expect(r.items[0].verdict).toBe('CONTINUE_AUTONOMOUSLY');
        expect(r.items[0].priority).toBe('P3');
    });

    test('safety errorClass forces HANDOFF_NOW P0', () => {
        const r = freshAdvisor().analyze({
            incidents: [inc({ errorClass: 'safety', status: 'stuck' })]
        });
        expect(r.items[0].verdict).toBe('HANDOFF_NOW');
        expect(r.items[0].priority).toBe('P0');
        expect(r.playbook.some(a => a.id === 'PAGE_ONCALL_NOW')).toBe(true);
    });

    test('compliance errorClass also forces HANDOFF_NOW', () => {
        const r = freshAdvisor().analyze({
            incidents: [inc({ errorClass: 'compliance' })]
        });
        expect(r.items[0].verdict).toBe('HANDOFF_NOW');
    });

    test('permanent error + userWaiting -> ABORT_AND_REFUND', () => {
        const r = freshAdvisor().analyze({
            incidents: [inc({ errorClass: 'permanent', userWaiting: true, status: 'failed' })]
        });
        expect(r.items[0].verdict).toBe('ABORT_AND_REFUND');
        expect(r.items[0].priority).toBe('P0');
        expect(r.playbook.some(a => a.id === 'TRIGGER_ABORT_REFUND_WORKFLOW')).toBe(true);
    });

    test('SLA breach with user waiting -> HANDOFF_NOW P0', () => {
        const r = freshAdvisor().analyze({
            incidents: [inc({
                startedAt: new Date(FIXED_NOW.getTime() - 90 * MIN).toISOString(),
                slaMinutes: 60,
                userWaiting: true
            })]
        });
        expect(r.items[0].verdict).toBe('HANDOFF_NOW');
        expect(r.items[0].reasons.some(rs => rs.code === 'SLA_BREACH')).toBe(true);
    });

    test('transient + retries available -> AUTO_RETRY_WITH_BACKOFF P2', () => {
        const r = freshAdvisor().analyze({
            incidents: [inc({ errorClass: 'transient', retries: 1, maxRetries: 3, confidence: 0.7 })]
        });
        expect(r.items[0].verdict).toBe('AUTO_RETRY_WITH_BACKOFF');
        expect(r.items[0].priority).toBe('P2');
        expect(r.items[0].suggestedValue).toBeGreaterThan(0);
    });

    test('ambiguous error -> ASSIST_HUMAN_REVIEW P1', () => {
        const r = freshAdvisor().analyze({
            incidents: [inc({ errorClass: 'ambiguous', confidence: 0.5 })]
        });
        expect(r.items[0].verdict).toBe('ASSIST_HUMAN_REVIEW');
        expect(r.items[0].priority).toBe('P1');
    });

    test('oncall unavailable + HANDOFF_NOW degrades to HOLD_FOR_CAPACITY', () => {
        const r = freshAdvisor().analyze({
            incidents: [inc({ errorClass: 'safety' })],
            oncall: { available: false, queueDepth: 0, capacityPerHour: 5 }
        });
        expect(r.items[0].verdict).toBe('HOLD_FOR_CAPACITY');
        expect(r.portfolio.grade).toBe('F');
        expect(r.playbook.some(a => a.id === 'EXPAND_ONCALL_CAPACITY')).toBe(true);
    });

    test('capacity collapse (HOLD + HANDOFF coexist) forces F grade', () => {
        // 2 safety incidents but only capacity for 0 (queue full)
        const r = freshAdvisor().analyze({
            incidents: [
                inc({ id: 'a', errorClass: 'safety' }),
                inc({ id: 'b', errorClass: 'safety' })
            ],
            oncall: { available: true, queueDepth: 10, capacityPerHour: 5 }
        });
        // both should hit HOLD because capacityRemaining starts -5
        const verdicts = r.items.map(it => it.verdict);
        expect(verdicts).toContain('HOLD_FOR_CAPACITY');
        expect(r.portfolio.grade).toBe('F');
    });

    test('3+ P0 forces F grade', () => {
        const incs = [
            inc({ id: 'a', errorClass: 'safety' }),
            inc({ id: 'b', errorClass: 'safety' }),
            inc({ id: 'c', errorClass: 'safety' })
        ];
        const r = freshAdvisor().analyze({ incidents: incs });
        expect(r.portfolio.p0Count).toBeGreaterThanOrEqual(3);
        expect(r.portfolio.grade).toBe('F');
        expect(r.playbook.some(a => a.id === 'OPEN_INCIDENT_ROOM')).toBe(true);
    });

    test('missing core fields -> INSUFFICIENT_DATA', () => {
        const r = freshAdvisor().analyze({
            incidents: [{ id: 'x' }]
        });
        expect(r.items[0].verdict).toBe('INSUFFICIENT_DATA');
        expect(r.playbook.some(a => a.id === 'INSTRUMENT_MISSING_TELEMETRY')).toBe(true);
    });

    test('risk monotonicity: cautious >= balanced >= aggressive', () => {
        const incs = [inc({ confidence: 0.4, blastRadius: 4, userWaiting: true })];
        const a = freshAdvisor();
        const rC = a.analyze({ incidents: incs, risk_appetite: 'cautious' });
        const rB = a.analyze({ incidents: incs, risk_appetite: 'balanced' });
        const rA = a.analyze({ incidents: incs, risk_appetite: 'aggressive' });
        expect(rC.portfolio.escalationRisk).toBeGreaterThanOrEqual(rB.portfolio.escalationRisk);
        expect(rB.portfolio.escalationRisk).toBeGreaterThanOrEqual(rA.portfolio.escalationRisk);
    });

    test('simulate reduces risk with diminishing returns', () => {
        const r = freshAdvisor().analyze({
            incidents: [
                inc({ id: 'a', errorClass: 'safety' }),
                inc({ id: 'b', errorClass: 'permanent', userWaiting: true })
            ]
        });
        const sim = freshAdvisor().simulate({ applyTop: 5 }, r);
        expect(sim.projectedRisk).toBeLessThanOrEqual(r.portfolio.escalationRisk);
        expect(sim.appliedActions.length).toBeGreaterThan(0);
        // diminishing: first delta abs >= second delta abs
        if (sim.appliedActions.length >= 2) {
            expect(Math.abs(sim.appliedActions[0].appliedDelta))
                .toBeGreaterThanOrEqual(Math.abs(sim.appliedActions[1].appliedDelta));
        }
    });

    test('analyze never mutates input incidents', () => {
        const original = [inc({ errorClass: 'safety', retries: 1 })];
        const snapshot = JSON.parse(JSON.stringify(original));
        freshAdvisor().analyze({ incidents: original });
        expect(original).toEqual(snapshot);
    });

    test('markdown renderer has all required sections', () => {
        const r = freshAdvisor().analyze({
            incidents: [inc({ errorClass: 'safety' })]
        });
        const md = freshAdvisor().formatMarkdown(r);
        expect(md).toContain('## Summary');
        expect(md).toContain('## Incidents');
        expect(md).toContain('## Playbook');
        expect(md).toContain('## Insights');
    });

    test('formatJson byte-stable across runs with fixed now', () => {
        const incs = [
            inc({ id: 'a', errorClass: 'transient', retries: 1 }),
            inc({ id: 'b', errorClass: 'ambiguous' })
        ];
        const j1 = freshAdvisor().formatJson(freshAdvisor().analyze({ incidents: incs }));
        const j2 = freshAdvisor().formatJson(freshAdvisor().analyze({ incidents: incs }));
        expect(j1).toBe(j2);
        // sorted keys: 'generatedAt' should come before 'items' alphabetically
        expect(j1.indexOf('"generatedAt"')).toBeLessThan(j1.indexOf('"items"'));
    });

    test('domain concentration triggers TIGHTEN_AUTONOMY_FOR_DOMAIN', () => {
        const r = freshAdvisor().analyze({
            incidents: [
                inc({ id: 'a', errorClass: 'safety', domain: 'finance' }),
                inc({ id: 'b', errorClass: 'safety', domain: 'finance' })
            ]
        });
        expect(r.playbook.some(a => a.id === 'TIGHTEN_AUTONOMY_FOR_DOMAIN')).toBe(true);
        expect(r.insights.some(i => i.code === 'DOMAIN_CONCENTRATION')).toBe(true);
    });

    test('aggressive trims P3 fallback when P0 present; cautious adds review when grade <= C', () => {
        const incs = [inc({ errorClass: 'safety' })];
        const rAgg = freshAdvisor().analyze({ incidents: incs, risk_appetite: 'aggressive' });
        // Should not contain MAINTAIN_OBSERVABILITY (P3) since P0 present
        expect(rAgg.playbook.some(a => a.id === 'MAINTAIN_OBSERVABILITY')).toBe(false);

        // cautious + grade D/F -> adds SCHEDULE_ESCALATION_REVIEW
        const rCau = freshAdvisor().analyze({ incidents: incs, risk_appetite: 'cautious' });
        expect(['C', 'D', 'F']).toContain(rCau.portfolio.grade);
        expect(rCau.playbook.some(a => a.id === 'SCHEDULE_ESCALATION_REVIEW')).toBe(true);
    });

    test('multiple ASSIST_HUMAN_REVIEW -> ROUTE_TO_REVIEW_QUEUE P1', () => {
        const r = freshAdvisor().analyze({
            incidents: [
                inc({ id: 'a', errorClass: 'ambiguous' }),
                inc({ id: 'b', errorClass: 'ambiguous' })
            ]
        });
        expect(r.playbook.some(a => a.id === 'ROUTE_TO_REVIEW_QUEUE')).toBe(true);
    });

    test('schemaVersion is 1 and items expose required fields', () => {
        const r = freshAdvisor().analyze({ incidents: [inc()] });
        expect(r.schemaVersion).toBe(1);
        const it = r.items[0];
        ['id', 'verdict', 'priority', 'riskScore', 'reasons', 'estRiskDelta', 'recommendedAction'].forEach(k => {
            expect(it).toHaveProperty(k);
        });
    });
});
