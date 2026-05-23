'use strict';

const { createAgentPostmortemAdvisor } = require('../src/agent-postmortem-advisor');

function fixedNow() { return () => new Date('2026-05-22T00:00:00Z'); }
function freshAdvisor() { return createAgentPostmortemAdvisor({ now: fixedNow() }); }

function incident(overrides) {
    return Object.assign({
        id: 'i1',
        agent_id: 'agent-x',
        timestamp: '2026-05-20T10:00:00Z',
        severity: 'medium',
        category: 'tool_error',
        resolution_minutes: 60,
        root_cause: 'transient network blip',
        action_items_taken: ['retry-with-backoff'],
        customer_impact: 'none',
        detection_source: 'auto_monitor'
    }, overrides || {});
}

describe('AgentPostmortemAdvisor', () => {
    test('factory exposes expected shape', () => {
        const a = freshAdvisor();
        expect(typeof a.analyze).toBe('function');
        expect(typeof a.simulate).toBe('function');
        expect(typeof a.formatText).toBe('function');
        expect(typeof a.formatMarkdown).toBe('function');
        expect(typeof a.formatJson).toBe('function');
        expect(typeof a.VERSION).toBe('string');
    });

    test('empty input -> grade A + EMPTY_FLEET insight', () => {
        const r = freshAdvisor().analyze({ incidents: [] });
        expect(r.summary.grade).toBe('A');
        expect(r.summary.incident_count).toBe(0);
        expect(r.insights).toContain('EMPTY_FLEET');
        expect(r.playbook.length).toBeGreaterThanOrEqual(1);
    });

    test('single MAJOR_INCIDENT produces P0 LAUNCH_RCA_REVIEW', () => {
        const r = freshAdvisor().analyze({
            incidents: [incident({
                id: 'big1', severity: 'critical',
                root_cause: '', action_items_taken: [], customer_impact: 'medium'
            })]
        });
        const labels = r.playbook.map(a => a.label);
        expect(r.incidents[0].verdict).toBe('MAJOR_INCIDENT');
        expect(r.incidents[0].priority).toBe('P0');
        expect(labels).toContain('LAUNCH_RCA_REVIEW');
    });

    test('3 critical incidents force grade F', () => {
        const incs = [];
        for (let i = 0; i < 3; i++) {
            incs.push(incident({
                id: 'crit-' + i, agent_id: 'a' + i,
                category: 'outage',
                severity: 'critical', root_cause: 'x', action_items_taken: ['y']
            }));
        }
        const r = freshAdvisor().analyze({ incidents: incs });
        expect(r.summary.critical_count).toBe(3);
        expect(r.summary.grade).toBe('F');
    });

    test('CHRONIC_PATTERN detected from recurrence_of', () => {
        const r = freshAdvisor().analyze({
            incidents: [incident({ id: 'chr1', recurrence_of: 'i0' })]
        });
        expect(r.incidents[0].verdict).toBe('CHRONIC_PATTERN');
        expect(r.incidents[0].recurrence_flag).toBe(true);
        expect(r.summary.grade).toBe('F');
    });

    test('RecurrenceCluster from 3 same-agent same-category incidents', () => {
        const incs = ['a', 'b', 'c'].map((s, i) => incident({
            id: 'x' + i, agent_id: 'agent-q', category: 'hallucination',
            timestamp: '2026-05-' + (15 + i) + 'T10:00:00Z'
        }));
        const r = freshAdvisor().analyze({ incidents: incs });
        expect(r.recurrence_clusters.length).toBe(1);
        expect(r.recurrence_clusters[0].agent_id).toBe('agent-q');
        expect(r.recurrence_clusters[0].count).toBe(3);
        const labels = r.playbook.map(a => a.label);
        expect(labels).toContain('BREAK_RECURRENCE_LOOP');
    });

    test('ACTION_INCOMPLETE detection', () => {
        const r = freshAdvisor().analyze({
            incidents: [
                incident({ id: 'a', severity: 'high', root_cause: 'cause', action_items_taken: [] }),
                incident({ id: 'b', severity: 'medium', root_cause: 'cause', action_items_taken: [] })
            ]
        });
        expect(r.incidents.filter(i => i.verdict === 'ACTION_INCOMPLETE').length).toBe(2);
        const labels = r.playbook.map(a => a.label);
        expect(labels).toContain('CLOSE_ACTION_ITEMS_BACKLOG');
    });

    test('UNDETECTED_BY_MONITORING flagged on user-reported high severity', () => {
        const r = freshAdvisor().analyze({
            incidents: [
                incident({ id: 'u1', severity: 'high', detection_source: 'user_report' }),
                incident({ id: 'u2', severity: 'critical', detection_source: 'user_report' })
            ]
        });
        const u = r.incidents.find(i => i.id === 'u1');
        expect(u.contributing_factors).toContain('UNDETECTED_BY_MONITORING');
        const labels = r.playbook.map(a => a.label);
        expect(labels).toContain('INSTRUMENT_MISSING_DETECTION');
    });

    test('customer_impact=high triggers NOTIFY_AFFECTED_CUSTOMERS', () => {
        const r = freshAdvisor().analyze({
            incidents: [incident({ customer_impact: 'high' })]
        });
        const labels = r.playbook.map(a => a.label);
        expect(labels).toContain('NOTIFY_AFFECTED_CUSTOMERS');
    });

    test('critical-tier agent with CHRONIC_PATTERN triggers QUARANTINE', () => {
        const incs = ['a', 'b', 'c'].map((s, i) => incident({
            id: 'q' + i, agent_id: 'crit-agent', category: 'policy_violation',
            timestamp: '2026-05-1' + i + 'T10:00:00Z'
        }));
        const r = freshAdvisor().analyze({
            incidents: incs,
            agents: { 'crit-agent': { tier: 'critical', team: 'core' } }
        });
        const labels = r.playbook.map(a => a.label);
        expect(labels).toContain('QUARANTINE_AGENT_PENDING_FIX');
    });

    test('cautious vs aggressive shifts posture_score', () => {
        const incs = [
            incident({ id: 'm1', severity: 'high', root_cause: '', action_items_taken: [] }),
            incident({ id: 'm2', severity: 'high', root_cause: '', action_items_taken: [] })
        ];
        const cautious = freshAdvisor().analyze({ incidents: incs, options: { risk_appetite: 'cautious' } });
        const balanced = freshAdvisor().analyze({ incidents: incs, options: { risk_appetite: 'balanced' } });
        const aggressive = freshAdvisor().analyze({ incidents: incs, options: { risk_appetite: 'aggressive' } });
        // cautious should produce a STRICTLY LOWER posture_score than aggressive
        // (per APPETITE_MULT 0.92/1.0/1.08 applied to the raw 100-penalty)
        expect(cautious.summary.posture_score).toBeLessThan(aggressive.summary.posture_score);
        expect(balanced.summary.risk_appetite).toBe('balanced');
    });

    test('simulate raises projected score and does not mutate input report', () => {
        const r = freshAdvisor().analyze({
            incidents: [
                incident({ id: 'b1', severity: 'high', root_cause: '', action_items_taken: [], customer_impact: 'high' })
            ]
        });
        const before = JSON.stringify(r);
        const sim = freshAdvisor().simulate({ applyTop: 5 }, r);
        const after = JSON.stringify(r);
        expect(before).toBe(after);
        expect(sim.projected_posture_score).toBeGreaterThanOrEqual(sim.baseline_posture_score);
        expect(sim.applied).toBeGreaterThan(0);
    });

    test('input immutability', () => {
        const incs = [incident({ id: 'imm', severity: 'high' })];
        const agents = { 'agent-x': { tier: 'standard' } };
        const before = JSON.stringify({ incs, agents });
        freshAdvisor().analyze({ incidents: incs, agents });
        const after = JSON.stringify({ incs, agents });
        expect(before).toBe(after);
    });

    test('formatJson is byte-stable', () => {
        const a = freshAdvisor();
        const r = a.analyze({
            incidents: [incident({ id: 'j1' }), incident({ id: 'j2', severity: 'high' })]
        });
        const x = a.formatJson(r);
        const y = a.formatJson(r);
        expect(x).toBe(y);
        // valid JSON
        expect(() => JSON.parse(x)).not.toThrow();
    });

    test('formatMarkdown contains all 5 required sections', () => {
        const r = freshAdvisor().analyze({
            incidents: [incident({ id: 'md1', severity: 'high' })]
        });
        const md = freshAdvisor().formatMarkdown(r);
        expect(md).toContain('## Summary');
        expect(md).toContain('## Incidents');
        expect(md).toContain('## Recurrence clusters');
        expect(md).toContain('## Playbook');
        expect(md).toContain('## Insights');
    });

    test('formatText contains headline', () => {
        const r = freshAdvisor().analyze({ incidents: [incident()] });
        const t = freshAdvisor().formatText(r);
        expect(t).toContain('VERDICT:');
    });

    test('INSUFFICIENT_DATA when severity or category missing', () => {
        const r = freshAdvisor().analyze({
            incidents: [{ id: 'ins', agent_id: 'a', timestamp: '2026-05-20T00:00:00Z' }]
        });
        expect(r.incidents[0].verdict).toBe('INSUFFICIENT_DATA');
    });

    test('aggressive trims P3 when P0/P1 present', () => {
        const incs = [incident({
            id: 'agg1', severity: 'critical', root_cause: '', action_items_taken: []
        })];
        const r = freshAdvisor().analyze({
            incidents: incs, options: { risk_appetite: 'aggressive' }
        });
        const labels = r.playbook.map(a => a.label);
        expect(labels).not.toContain('MAINTAIN_LEARNING_CADENCE');
    });
});
