'use strict';

const { createAgentSecurityPostureAdvisor } = require('../src/agent-security-posture-advisor');

function fixedNow() { return () => new Date('2026-05-22T00:00:00Z'); }

function freshAdvisor() {
    return createAgentSecurityPostureAdvisor({ now: fixedNow() });
}

function hardenedAgent(overrides) {
    return Object.assign({
        id: 'a1', name: 'Hardened',
        sandboxed: true, encryptionAtRest: true, tlsEnforced: true, mTLS: true,
        networkEgress: 'allowlist', iamScope: 'read',
        credentialsStored: 2, credentialRotationAgeDays: 20,
        dependencyVulns: { critical: 0, high: 0, medium: 0 },
        lastSecurityAuditDate: '2026-04-01T00:00:00Z',
        anomalousLoginCountLast7d: 0,
        secretLeaksLast30d: 0,
        exposedEndpoints: 0,
        dataClassification: 'internal',
        autonomyLevel: 1
    }, overrides || {});
}

describe('AgentSecurityPostureAdvisor', () => {
    test('factory exposes expected shape', () => {
        const a = freshAdvisor();
        expect(typeof a.analyze).toBe('function');
        expect(typeof a.simulate).toBe('function');
        expect(typeof a.formatText).toBe('function');
        expect(typeof a.formatMarkdown).toBe('function');
        expect(typeof a.formatJson).toBe('function');
        expect(typeof a.VERSION).toBe('string');
    });

    test('empty input returns empty fleet, calm band, grade A, EMPTY_FLEET insight', () => {
        const r = freshAdvisor().analyze({});
        expect(r.agents).toEqual([]);
        expect(r.portfolio.agentCount).toBe(0);
        expect(r.portfolio.band).toBe('CALM');
        expect(r.portfolio.grade).toBe('A');
        expect(r.insights.some(i => i.code === 'EMPTY_FLEET')).toBe(true);
    });

    test('HARDENED agent yields A grade and FLEET_HARDENED insight', () => {
        const r = freshAdvisor().analyze({ agents: [hardenedAgent()] });
        expect(r.agents[0].verdict).toBe('HARDENED');
        expect(r.agents[0].priority).toBe('P3');
        expect(r.agents[0].riskScore).toBeLessThan(15);
        expect(r.portfolio.grade).toBe('A');
        expect(r.insights.some(i => i.code === 'FLEET_HARDENED')).toBe(true);
    });

    test('INSUFFICIENT_DATA when too few signals provided', () => {
        const r = freshAdvisor().analyze({
            agents: [{ id: 'x', name: 'Unknown' }]
        });
        expect(r.agents[0].verdict).toBe('INSUFFICIENT_DATA');
        expect(r.playbook.some(a => a.id === 'INSTRUMENT_SECURITY_TELEMETRY')).toBe(true);
    });

    test('EMERGENCY_ISOLATE on recent secret leak + P0 playbook', () => {
        const r = freshAdvisor().analyze({
            agents: [hardenedAgent({ id: 'leaky', secretLeaksLast30d: 2 })]
        });
        expect(r.agents[0].verdict).toBe('EMERGENCY_ISOLATE');
        expect(r.agents[0].priority).toBe('P0');
        expect(r.portfolio.grade).toBe('F');
        expect(r.playbook[0].id).toBe('ISOLATE_COMPROMISED_AGENTS');
        expect(r.playbook.some(a => a.id === 'ROTATE_LEAKED_CREDENTIALS')).toBe(true);
        expect(r.insights.some(i => i.code === 'ACTIVE_SECRET_LEAK')).toBe(true);
    });

    test('EMERGENCY_ISOLATE on critical CVE + public exposure', () => {
        const r = freshAdvisor().analyze({
            agents: [hardenedAgent({
                id: 'web1',
                dependencyVulns: { critical: 1 },
                publicExposure: true,
                exposedEndpoints: 2,
                mTLS: false
            })]
        });
        expect(r.agents[0].verdict).toBe('EMERGENCY_ISOLATE');
        expect(r.playbook.some(a => a.id === 'PATCH_CRITICAL_DEPENDENCY_CVES')).toBe(true);
    });

    test('QUARANTINE on critical CVE without public exposure', () => {
        const r = freshAdvisor().analyze({
            agents: [hardenedAgent({
                id: 'svc1',
                dependencyVulns: { critical: 1 },
                publicExposure: false,
                exposedEndpoints: 0
            })]
        });
        expect(r.agents[0].verdict).toBe('QUARANTINE');
        expect(r.agents[0].priority).toBe('P0');
    });

    test('TIGHTEN_CONFIG band for cluster of medium issues', () => {
        const r = freshAdvisor().analyze({
            agents: [hardenedAgent({
                id: 't1',
                sandboxed: false,
                networkEgress: 'open',
                iamScope: 'write',
                autonomyLevel: 4,
                tlsEnforced: false,
                credentialRotationAgeDays: 200
            })]
        });
        expect(['TIGHTEN_CONFIG', 'QUARANTINE']).toContain(r.agents[0].verdict);
        expect(['P0', 'P1']).toContain(r.agents[0].priority);
    });

    test('admin IAM scope triggers REDUCE_ADMIN_IAM_SCOPE', () => {
        const r = freshAdvisor().analyze({
            agents: [hardenedAgent({ id: 'adm', iamScope: 'admin' })]
        });
        expect(r.playbook.some(a => a.id === 'REDUCE_ADMIN_IAM_SCOPE')).toBe(true);
    });

    test('open egress triggers ENFORCE_EGRESS_ALLOWLIST', () => {
        const r = freshAdvisor().analyze({
            agents: [hardenedAgent({ id: 'e1', networkEgress: 'open' })]
        });
        expect(r.playbook.some(a => a.id === 'ENFORCE_EGRESS_ALLOWLIST')).toBe(true);
    });

    test('anomalous login burst triggers INVESTIGATE_ANOMALOUS_LOGINS and ACTIVE intrusion insight', () => {
        const r = freshAdvisor().analyze({
            agents: [hardenedAgent({ id: 'al', anomalousLoginCountLast7d: 5 })]
        });
        expect(r.agents[0].verdict).toBe('QUARANTINE');
        expect(r.playbook.some(a => a.id === 'INVESTIGATE_ANOMALOUS_LOGINS')).toBe(true);
        expect(r.insights.some(i => i.code === 'POTENTIAL_INTRUSION_SIGNAL')).toBe(true);
    });

    test('credential rotation overdue triggers ROTATE_OVERDUE_CREDENTIALS', () => {
        const r = freshAdvisor().analyze({
            agents: [hardenedAgent({ id: 'rot', credentialsStored: 3, credentialRotationAgeDays: 250 })]
        });
        expect(r.agents[0].reasons.some(r => r.code === 'CREDENTIAL_ROTATION_OVERDUE')).toBe(true);
        expect(r.playbook.some(a => a.id === 'ROTATE_OVERDUE_CREDENTIALS')).toBe(true);
    });

    test('no encryption on sensitive data triggers ENABLE_ENCRYPTION_AT_REST', () => {
        const r = freshAdvisor().analyze({
            agents: [hardenedAgent({ id: 'enc', encryptionAtRest: false, dataClassification: 'sensitive' })]
        });
        expect(r.agents[0].reasons.some(r => r.code === 'NO_ENCRYPTION_AT_REST')).toBe(true);
        expect(r.playbook.some(a => a.id === 'ENABLE_ENCRYPTION_AT_REST')).toBe(true);
    });

    test('public exposure without mTLS triggers ENFORCE_MTLS_ON_PUBLIC_ENDPOINTS', () => {
        const r = freshAdvisor().analyze({
            agents: [hardenedAgent({ id: 'pub', publicExposure: true, exposedEndpoints: 3, mTLS: false })]
        });
        expect(r.playbook.some(a => a.id === 'ENFORCE_MTLS_ON_PUBLIC_ENDPOINTS')).toBe(true);
    });

    test('stale audit triggers audit sweep when >=2 agents affected', () => {
        const r = freshAdvisor().analyze({
            agents: [
                hardenedAgent({ id: 's1', lastSecurityAuditDate: '2024-01-01T00:00:00Z' }),
                hardenedAgent({ id: 's2', lastSecurityAuditDate: '2024-02-01T00:00:00Z' })
            ]
        });
        expect(r.playbook.some(a => a.id === 'SCHEDULE_SECURITY_AUDIT_SWEEP')).toBe(true);
    });

    test('two non-sandboxed agents triggers SANDBOX_AGENT_RUNTIMES', () => {
        const r = freshAdvisor().analyze({
            agents: [
                hardenedAgent({ id: 'n1', sandboxed: false }),
                hardenedAgent({ id: 'n2', sandboxed: false })
            ]
        });
        expect(r.playbook.some(a => a.id === 'SANDBOX_AGENT_RUNTIMES')).toBe(true);
    });

    test('cautious appetite raises scores and may add SCHEDULE_QUARTERLY_SECURITY_REVIEW', () => {
        const base = hardenedAgent({
            id: 'c1', sandboxed: false, networkEgress: 'open',
            dependencyVulns: { high: 2 }
        });
        const cautious = freshAdvisor().analyze({ agents: [base], options: { risk_appetite: 'cautious' } });
        const balanced = freshAdvisor().analyze({ agents: [base], options: { risk_appetite: 'balanced' } });
        expect(cautious.agents[0].riskScore).toBeGreaterThanOrEqual(balanced.agents[0].riskScore);
    });

    test('aggressive appetite trims P3 fallback when higher-priority actions exist', () => {
        const r = freshAdvisor().analyze({
            agents: [hardenedAgent({ id: 'ag1', secretLeaksLast30d: 1 })],
            options: { risk_appetite: 'aggressive' }
        });
        expect(r.playbook.some(a => a.priority === 'P3')).toBe(false);
        expect(r.playbook.some(a => a.priority === 'P0')).toBe(true);
    });

    test('simulate applyTop reduces projected risk', () => {
        const advisor = freshAdvisor();
        const r = advisor.analyze({
            agents: [hardenedAgent({ id: 'q', secretLeaksLast30d: 1 })]
        });
        const sim = advisor.simulate({ applyTop: 3 }, r);
        expect(sim.projectedRiskScore).toBeLessThanOrEqual(r.portfolio.meanRiskScore);
        expect(sim.appliedActions.length).toBeGreaterThan(0);
        expect(['CALM', 'WATCH', 'ELEVATED', 'HIGH', 'CRITICAL']).toContain(sim.projectedBand);
        expect(['A', 'B', 'C', 'D', 'F']).toContain(sim.projectedGrade);
    });

    test('input immutability — analyze never mutates caller data', () => {
        const advisor = freshAdvisor();
        const input = {
            agents: [hardenedAgent({ id: 'imm', dependencyVulns: { critical: 1 } })],
            options: { risk_appetite: 'cautious' }
        };
        const snap = JSON.stringify(input);
        advisor.analyze(input);
        expect(JSON.stringify(input)).toBe(snap);
    });

    test('formatJson is byte-stable across runs', () => {
        const a1 = freshAdvisor();
        const a2 = freshAdvisor();
        const input = {
            agents: [
                hardenedAgent({ id: 'b', anomalousLoginCountLast7d: 4 }),
                hardenedAgent({ id: 'a', secretLeaksLast30d: 1 })
            ]
        };
        const j1 = a1.formatJson(a1.analyze(input));
        const j2 = a2.formatJson(a2.analyze(input));
        expect(j1).toBe(j2);
    });

    test('formatMarkdown contains all four sections', () => {
        const advisor = freshAdvisor();
        const r = advisor.analyze({ agents: [hardenedAgent({ id: 'm' })] });
        const md = advisor.formatMarkdown(r);
        expect(md).toContain('## Summary');
        expect(md).toContain('## Agents');
        expect(md).toContain('## Playbook');
        expect(md).toContain('## Insights');
    });

    test('formatText headline and sections present', () => {
        const advisor = freshAdvisor();
        const r = advisor.analyze({ agents: [hardenedAgent({ id: 't' })] });
        const txt = advisor.formatText(r);
        expect(txt).toMatch(/AgentSecurityPostureAdvisor/);
        expect(txt).toMatch(/Agents:/);
        expect(txt).toMatch(/Playbook:/);
        expect(txt).toMatch(/Insights:/);
    });

    test('invalid clock from nowFn throws', () => {
        const advisor = createAgentSecurityPostureAdvisor({ now: () => new Date('not-a-date') });
        expect(() => advisor.analyze({ agents: [hardenedAgent()] })).toThrow();
    });

    test('agents sorted by riskScore desc then id asc', () => {
        const r = freshAdvisor().analyze({
            agents: [
                hardenedAgent({ id: 'low' }),
                hardenedAgent({ id: 'crit', secretLeaksLast30d: 2 }),
                hardenedAgent({ id: 'mid', sandboxed: false, networkEgress: 'open' })
            ]
        });
        expect(r.agents[0].id).toBe('crit');
    });

    test('VERSION is exposed and stable', () => {
        const advisor = freshAdvisor();
        expect(advisor.VERSION).toBe('1.0.0');
    });
});
