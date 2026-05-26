'use strict';

const { createAgentSlaComplianceAdvisor, analyze, formatJson } =
    require('../src/agent-sla-compliance-advisor');

function fixedNow() { return () => new Date('2026-05-26T17:00:00Z'); }
function freshAdvisor() { return createAgentSlaComplianceAdvisor({ now: fixedNow() }); }

function baseAgent(overrides) {
    return Object.assign({
        id: 'agent-1',
        name: 'Support Bot',
        tier: 'standard',
        team: 'platform',
        contract_value: 10000,
        metrics: {
            availability_pct: 99.9,
            p95_response_seconds: 3,
            p95_resolution_minutes: 30,
            quality_score: 0.92,
            escalation_rate: 0.04,
            error_rate: 0.005,
            sample_size: 500
        }
    }, overrides || {});
}

describe('AgentSlaComplianceAdvisor', () => {
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
        const r = freshAdvisor().analyze({ agents: [] });
        expect(r.summary.grade).toBe('A');
        expect(r.summary.agent_count).toBe(0);
        expect(r.insights).toContain('EMPTY_FLEET');
        expect(r.playbook.length).toBeGreaterThanOrEqual(1);
        expect(r.playbook[0].label).toBe('EMPTY_PORTFOLIO');
    });

    test('all healthy agents -> ON_TRACK / OVER_PERFORMING', () => {
        const r = freshAdvisor().analyze({
            agents: [baseAgent(), baseAgent({ id: 'a2' })]
        });
        expect(r.summary.breach_count).toBe(0);
        expect(r.summary.at_risk_count).toBe(0);
        expect(['A', 'B']).toContain(r.summary.grade);
        const labels = r.playbook.map(a => a.label);
        // either OVER_PERFORMING or HEALTHY fallback
        expect(
            labels.includes('PORTFOLIO_HEALTHY') ||
            labels.includes('CONSIDER_TIER_REALIGNMENT')
        ).toBe(true);
    });

    test('hard breach (quality far below) -> SLA_BREACH P0 + PAGE_ONCALL', () => {
        const r = freshAdvisor().analyze({
            agents: [baseAgent({
                metrics: Object.assign({}, baseAgent().metrics, {
                    quality_score: 0.40,
                    availability_pct: 90.0,
                    error_rate: 0.30
                })
            })]
        });
        expect(r.agents[0].verdict).toBe('SLA_BREACH');
        expect(r.agents[0].priority).toBe('P0');
        const labels = r.playbook.map(a => a.label);
        expect(labels).toContain('PAGE_ONCALL_FOR_BREACH');
    });

    test('platinum tier breach forces grade F and PROTECT_PREMIUM action', () => {
        const r = freshAdvisor().analyze({
            agents: [baseAgent({
                tier: 'platinum',
                metrics: Object.assign({}, baseAgent().metrics, {
                    p95_response_seconds: 30,
                    quality_score: 0.50,
                    error_rate: 0.20
                })
            })]
        });
        expect(r.summary.grade).toBe('F');
        const labels = r.playbook.map(a => a.label);
        expect(labels).toContain('PROTECT_PREMIUM_CUSTOMERS');
    });

    test('single metric breach -> RECOVERY_NEEDED P1', () => {
        const r = freshAdvisor().analyze({
            agents: [baseAgent({
                metrics: Object.assign({}, baseAgent().metrics, {
                    p95_response_seconds: 7  // slightly above 5s threshold
                })
            })]
        });
        expect(r.agents[0].verdict).toBe('RECOVERY_NEEDED');
        expect(r.agents[0].priority).toBe('P1');
    });

    test('two metric breaches -> LAGGING P1', () => {
        const r = freshAdvisor().analyze({
            agents: [baseAgent({
                metrics: Object.assign({}, baseAgent().metrics, {
                    p95_response_seconds: 7,
                    quality_score: 0.80
                })
            })]
        });
        expect(r.agents[0].verdict).toBe('LAGGING');
        expect(r.agents[0].priority).toBe('P1');
    });

    test('trend_breach + any gap -> AT_RISK_OF_BREACH P0', () => {
        const r = freshAdvisor().analyze({
            agents: [baseAgent({
                metrics: Object.assign({}, baseAgent().metrics, {
                    p95_response_seconds: 7,
                    trend_breach: true
                })
            })]
        });
        expect(r.agents[0].verdict).toBe('AT_RISK_OF_BREACH');
        expect(r.agents[0].priority).toBe('P0');
        const labels = r.playbook.map(a => a.label);
        expect(labels).toContain('INTERVENE_BEFORE_BREACH');
    });

    test('low sample_size -> INSUFFICIENT_DATA + BACKFILL_TELEMETRY', () => {
        const r = freshAdvisor().analyze({
            agents: [
                baseAgent({ id: 'low1', metrics: Object.assign({}, baseAgent().metrics, { sample_size: 5 }) }),
                baseAgent({ id: 'low2', metrics: Object.assign({}, baseAgent().metrics, { sample_size: 3 }) })
            ]
        });
        expect(r.agents[0].verdict).toBe('INSUFFICIENT_DATA');
        expect(r.summary.insufficient_count).toBe(2);
        const labels = r.playbook.map(a => a.label);
        expect(labels).toContain('BACKFILL_TELEMETRY');
    });

    test('metric cluster (>=2 agents with p95 response breach) emits SCALE action', () => {
        const r = freshAdvisor().analyze({
            agents: [
                baseAgent({ id: 'a1', metrics: Object.assign({}, baseAgent().metrics, { p95_response_seconds: 9 }) }),
                baseAgent({ id: 'a2', metrics: Object.assign({}, baseAgent().metrics, { p95_response_seconds: 8 }) })
            ]
        });
        const labels = r.playbook.map(a => a.label);
        expect(labels).toContain('SCALE_RESPONSE_CAPACITY');
    });

    test('quality cluster (>=2 agents below quality floor) emits QUALITY action', () => {
        const r = freshAdvisor().analyze({
            agents: [
                baseAgent({ id: 'a1', metrics: Object.assign({}, baseAgent().metrics, { quality_score: 0.70 }) }),
                baseAgent({ id: 'a2', metrics: Object.assign({}, baseAgent().metrics, { quality_score: 0.75 }) })
            ]
        });
        const labels = r.playbook.map(a => a.label);
        expect(labels).toContain('QUALITY_REGRESSION_REVIEW');
    });

    test('credit exposure computed from breach probability and contract value', () => {
        const r = freshAdvisor().analyze({
            agents: [baseAgent({
                contract_value: 50000,
                credit_pct: 0.20,
                metrics: Object.assign({}, baseAgent().metrics, {
                    quality_score: 0.40,
                    availability_pct: 88,
                    error_rate: 0.30
                })
            })]
        });
        expect(r.agents[0].credit_exposure).toBeGreaterThan(0);
        expect(r.summary.credit_exposure_total).toBe(r.agents[0].credit_exposure);
        const labels = r.playbook.map(a => a.label);
        expect(labels).toContain('NOTIFY_FINANCE_OF_CREDIT_EXPOSURE');
    });

    test('cautious appetite raises risk score vs balanced', () => {
        const a = freshAdvisor().analyze({
            agents: [baseAgent({ metrics: Object.assign({}, baseAgent().metrics, { p95_response_seconds: 8 }) })],
            options: { risk_appetite: 'cautious' }
        });
        const b = freshAdvisor().analyze({
            agents: [baseAgent({ metrics: Object.assign({}, baseAgent().metrics, { p95_response_seconds: 8 }) })],
            options: { risk_appetite: 'balanced' }
        });
        expect(a.agents[0].risk_score).toBeGreaterThanOrEqual(b.agents[0].risk_score);
    });

    test('aggressive trims P3 when other actions present', () => {
        const r = freshAdvisor().analyze({
            agents: [baseAgent({
                metrics: Object.assign({}, baseAgent().metrics, { p95_response_seconds: 7 })
            })],
            options: { risk_appetite: 'aggressive' }
        });
        const priorities = r.playbook.map(a => a.priority);
        expect(priorities.indexOf('P3')).toBe(-1);
    });

    test('cautious appetite + lower grade appends SCHEDULE_SLA_AUDIT', () => {
        const r = freshAdvisor().analyze({
            agents: [baseAgent({
                metrics: Object.assign({}, baseAgent().metrics, {
                    p95_response_seconds: 7,
                    quality_score: 0.80,
                    availability_pct: 98
                })
            })],
            options: { risk_appetite: 'cautious' }
        });
        const labels = r.playbook.map(a => a.label);
        expect(labels).toContain('SCHEDULE_SLA_AUDIT');
    });

    test('simulate reduces projected risk and never mutates report', () => {
        const r = freshAdvisor().analyze({
            agents: [baseAgent({
                metrics: Object.assign({}, baseAgent().metrics, {
                    quality_score: 0.50,
                    availability_pct: 90,
                    error_rate: 0.30
                })
            })]
        });
        const before = JSON.stringify(r);
        const sim = freshAdvisor().simulate({ applyTop: 5 }, r);
        expect(sim.projected_mean_risk).toBeLessThan(sim.start_mean_risk);
        expect(JSON.stringify(r)).toBe(before);
    });

    test('input agents are not mutated', () => {
        const ag = baseAgent();
        const before = JSON.stringify(ag);
        freshAdvisor().analyze({ agents: [ag] });
        expect(JSON.stringify(ag)).toBe(before);
    });

    test('formatJson is byte-stable across runs', () => {
        const r1 = freshAdvisor().analyze({ agents: [baseAgent(), baseAgent({ id: 'z' })] });
        const r2 = freshAdvisor().analyze({ agents: [baseAgent({ id: 'z' }), baseAgent()] });
        // same logical input -> same canonical JSON regardless of order
        expect(formatJson(r1)).toBe(formatJson(r2));
    });

    test('formatMarkdown emits all four sections', () => {
        const r = freshAdvisor().analyze({ agents: [baseAgent()] });
        const md = freshAdvisor().formatMarkdown(r);
        expect(md).toMatch(/## Summary/);
        expect(md).toMatch(/## Agents/);
        expect(md).toMatch(/## Playbook/);
        expect(md).toMatch(/## Insights/);
    });

    test('formatText headline contains VERDICT line', () => {
        const r = freshAdvisor().analyze({ agents: [baseAgent()] });
        const txt = freshAdvisor().formatText(r);
        expect(txt).toMatch(/VERDICT: grade=/);
    });

    test('three SLA breaches -> grade F', () => {
        const incs = [];
        for (let i = 0; i < 3; i++) {
            incs.push(baseAgent({
                id: 'br-' + i,
                metrics: Object.assign({}, baseAgent().metrics, {
                    quality_score: 0.30,
                    availability_pct: 80,
                    error_rate: 0.40
                })
            }));
        }
        const r = freshAdvisor().analyze({ agents: incs });
        expect(r.summary.breach_count).toBe(3);
        expect(r.summary.grade).toBe('F');
    });

    test('invalid risk_appetite falls back to balanced', () => {
        const r = freshAdvisor().analyze({
            agents: [baseAgent()],
            options: { risk_appetite: 'nope' }
        });
        expect(r.risk_appetite).toBe('balanced');
    });

    test('agents sorted: priority asc then risk desc then id asc', () => {
        const r = freshAdvisor().analyze({
            agents: [
                baseAgent({ id: 'zz' }),
                baseAgent({
                    id: 'breach',
                    metrics: Object.assign({}, baseAgent().metrics, {
                        quality_score: 0.30, availability_pct: 80, error_rate: 0.40
                    })
                }),
                baseAgent({ id: 'aa' })
            ]
        });
        // breach comes first
        expect(r.agents[0].id).toBe('breach');
        // then aa before zz (both P3 or both P3-ish)
        const tail = r.agents.slice(1).map(a => a.id);
        expect(tail).toEqual(['aa', 'zz']);
    });

    test('custom default_sla via options overrides built-in thresholds', () => {
        const r = freshAdvisor().analyze({
            agents: [baseAgent({
                metrics: Object.assign({}, baseAgent().metrics, { p95_response_seconds: 3 })
            })],
            options: { default_sla: { p95_response_seconds: 1 } }
        });
        // now 3s violates the tightened 1s threshold
        expect(r.agents[0].breaches.some(b => b.metric === 'p95_response_seconds')).toBe(true);
    });
});
