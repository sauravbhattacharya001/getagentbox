'use strict';

const ATPA = require('../src/agent-tool-policy-advisor.js');

function tool(name, overrides) {
    return Object.assign({
        name: name,
        category: 'data_read',
        sideEffects: 'none',
        blastRadius: 1
    }, overrides || {});
}

function telem(toolName, overrides) {
    return Object.assign({
        tool: toolName,
        invocations: 10,
        errors: 0,
        slowCalls: 0,
        injectionAttempts: 0
    }, overrides || {});
}

describe('AgentToolPolicyAdvisor — module surface', () => {
    test('exports advise/simulate/format*/VERSION', () => {
        expect(typeof ATPA.advise).toBe('function');
        expect(typeof ATPA.simulate).toBe('function');
        expect(typeof ATPA.formatText).toBe('function');
        expect(typeof ATPA.formatMarkdown).toBe('function');
        expect(typeof ATPA.formatJson).toBe('function');
        expect(typeof ATPA.VERSION).toBe('string');
        expect(ATPA.VERSION.length).toBeGreaterThan(0);
    });

    test('empty input → grade A, zero counts, zero risk', () => {
        const r = ATPA.advise({ tools: [], telemetry: [] });
        expect(r.tools).toEqual([]);
        expect(r.portfolio.portfolioRisk).toBe(0);
        expect(r.portfolio.overallGrade).toBe('A');
        expect(r.portfolio.counts).toEqual({
            ALLOW: 0, ALLOW_WITH_LOG: 0, CONFIRM: 0, DENY: 0, QUARANTINE: 0
        });
        expect(r.playbook).toEqual([]);
    });
});

describe('AgentToolPolicyAdvisor — single-tool classification', () => {
    test('safe read-only tool → ALLOW, P2, no guards', () => {
        const r = ATPA.advise({
            tools: [tool('search.docs', { category: 'data_read', sideEffects: 'none', blastRadius: 1 })],
            telemetry: [telem('search.docs', { invocations: 100 })]
        });
        const t = r.tools[0];
        expect(t.verdict).toBe('ALLOW');
        expect(t.priority).toBe('P2');
        expect(t.recommendedGuards).toEqual([]);
        expect(t.riskScore).toBeLessThan(35);
    });

    test('plain write tool → ALLOW_WITH_LOG with audit_log', () => {
        const r = ATPA.advise({
            tools: [tool('notes.write', { category: 'data_write', sideEffects: 'write', blastRadius: 2, requiresAuth: true })],
            telemetry: [telem('notes.write', { invocations: 80 })]
        });
        const t = r.tools[0];
        // category 18 + write 10 + blast 4 = 32 < 35 confirm → ALLOW_WITH_LOG
        expect(t.verdict).toBe('ALLOW_WITH_LOG');
        expect(t.recommendedGuards).toEqual(['audit_log']);
    });

    test('shell tool with 20% error rate triggers CONFIRM+HIGH_ERROR_RATE', () => {
        const r = ATPA.advise({
            tools: [tool('shell.exec', { category: 'shell', sideEffects: 'external', blastRadius: 4, requiresAuth: true })],
            telemetry: [telem('shell.exec', { invocations: 100, errors: 20 })]
        });
        const t = r.tools[0];
        expect(['CONFIRM', 'DENY', 'QUARANTINE']).toContain(t.verdict);
        const codes = t.reasons.map(r => r.code);
        expect(codes).toContain('HIGH_ERROR_RATE');
        expect(t.recommendedGuards).toContain('argument_validator');
    });

    test('payment tool high blast → DENY or QUARANTINE P0', () => {
        const r = ATPA.advise({
            tools: [tool('stripe.charge', {
                category: 'payment',
                sideEffects: 'irreversible',
                blastRadius: 5,
                requiresAuth: true
            })],
            telemetry: [telem('stripe.charge', { invocations: 60 })]
        });
        const t = r.tools[0];
        expect(['DENY', 'QUARANTINE']).toContain(t.verdict);
        expect(t.priority).toBe('P0');
        expect(t.recommendedGuards).toContain('audit_log');
    });

    test('sandboxed:true reduces riskScore vs unsandboxed', () => {
        const base = tool('code.run', { category: 'code_exec', sideEffects: 'external', blastRadius: 3, requiresAuth: true });
        const tele = [telem('code.run', { invocations: 50 })];
        const r1 = ATPA.advise({ tools: [Object.assign({}, base, { sandboxed: false })], telemetry: tele });
        const r2 = ATPA.advise({ tools: [Object.assign({}, base, { sandboxed: true })], telemetry: tele });
        expect(r2.tools[0].riskScore).toBeLessThan(r1.tools[0].riskScore);
    });

    test('INJECTION_SIGNAL upgrades safe tool to CONFIRM', () => {
        const r = ATPA.advise({
            tools: [tool('search.docs', { category: 'data_read', sideEffects: 'none', blastRadius: 1 })],
            telemetry: [telem('search.docs', { invocations: 30, injectionAttempts: 5 })]
        });
        const t = r.tools[0];
        expect(t.verdict).toBe('CONFIRM');
        expect(t.priority).toBe('P1');
        const codes = t.reasons.map(x => x.code);
        expect(codes).toContain('INJECTION_SIGNAL');
        expect(codes).toContain('INJECTION_UPGRADE');
    });
});

describe('AgentToolPolicyAdvisor — context modifiers', () => {
    test('cautious vs aggressive risk appetite shifts verdict counts', () => {
        const tools = [
            tool('a', { category: 'data_write', sideEffects: 'write', blastRadius: 3, requiresAuth: true }),
            tool('b', { category: 'shell', sideEffects: 'external', blastRadius: 3, requiresAuth: true }),
            tool('c', { category: 'email', sideEffects: 'external', blastRadius: 2, requiresAuth: true })
        ];
        const telemetry = tools.map(t => telem(t.name, { invocations: 50 }));
        const cautious = ATPA.advise({ tools, telemetry, agentProfile: { riskAppetite: 'cautious' } });
        const aggressive = ATPA.advise({ tools, telemetry, agentProfile: { riskAppetite: 'aggressive' } });
        // cautious should be at least as strict overall
        const rank = { ALLOW: 0, ALLOW_WITH_LOG: 1, CONFIRM: 2, DENY: 3, QUARANTINE: 4 };
        const sumRank = (r) => r.tools.reduce((a, t) => a + rank[t.verdict], 0);
        expect(sumRank(cautious)).toBeGreaterThanOrEqual(sumRank(aggressive));
        // and the verdict mix is not identical
        expect(JSON.stringify(cautious.portfolio.counts)).not.toBe(JSON.stringify(aggressive.portfolio.counts));
    });

    test('autonomyLevel 5 + write side-effect → FULL_AUTO_HIGH_EFFECTS reason', () => {
        const r = ATPA.advise({
            tools: [tool('db.write', { category: 'data_write', sideEffects: 'write', blastRadius: 2, requiresAuth: true })],
            telemetry: [telem('db.write', { invocations: 20 })],
            agentProfile: { autonomyLevel: 5 }
        });
        const codes = r.tools[0].reasons.map(x => x.code);
        expect(codes).toContain('FULL_AUTO_HIGH_EFFECTS');
    });

    test('STALE_TOOL fires when lastUsedDaysAgo >= 30', () => {
        const r = ATPA.advise({
            tools: [tool('legacy.thing', { category: 'data_read', sideEffects: 'read', blastRadius: 1 })],
            telemetry: [telem('legacy.thing', { invocations: 5, lastUsedDaysAgo: 90 })]
        });
        const codes = r.tools[0].reasons.map(x => x.code);
        expect(codes).toContain('STALE_TOOL');
    });

    test('domain finance bumps payment risk above general domain', () => {
        const t = [tool('pay.charge', {
            category: 'payment', sideEffects: 'irreversible', blastRadius: 3, requiresAuth: true
        })];
        const tele = [telem('pay.charge', { invocations: 20 })];
        const gen = ATPA.advise({ tools: t, telemetry: tele, agentProfile: { domain: 'general' } });
        const fin = ATPA.advise({ tools: t, telemetry: tele, agentProfile: { domain: 'finance' } });
        expect(fin.tools[0].riskScore).toBeGreaterThan(gen.tools[0].riskScore);
    });

    test('unknown category surfaces high baseline', () => {
        const r = ATPA.advise({
            tools: [tool('mystery.tool', { category: 'unknown', sideEffects: 'write', blastRadius: 3 })],
            telemetry: [telem('mystery.tool', { invocations: 10 })]
        });
        const codes = r.tools[0].reasons.map(x => x.code);
        expect(codes).toContain('CATEGORY_BASELINE');
        expect(r.tools[0].riskScore).toBeGreaterThan(20);
    });
});

describe('AgentToolPolicyAdvisor — playbook + portfolio', () => {
    test('playbook is P0-first and has no duplicate ids', () => {
        const tools = [
            tool('shell.x', { category: 'shell', sideEffects: 'external', blastRadius: 5, requiresAuth: true }),
            tool('pay.x', { category: 'payment', sideEffects: 'irreversible', blastRadius: 5, requiresAuth: true }),
            tool('mail.x', { category: 'email', sideEffects: 'external', blastRadius: 2, requiresAuth: true })
        ];
        const telemetry = [
            telem('shell.x', { invocations: 100, errors: 30, injectionAttempts: 3 }),
            telem('pay.x', { invocations: 60 }),
            telem('mail.x', { invocations: 20 })
        ];
        const r = ATPA.advise({ tools, telemetry, agentProfile: { riskAppetite: 'cautious' } });
        const ids = r.playbook.map(it => it.id);
        expect(new Set(ids).size).toBe(ids.length);
        // First items should be P0
        const rank = { P0: 0, P1: 1, P2: 2 };
        for (let i = 1; i < r.playbook.length; i++) {
            expect(rank[r.playbook[i].priority]).toBeGreaterThanOrEqual(rank[r.playbook[i - 1].priority]);
        }
    });

    test('quarantine forces overallGrade F', () => {
        const r = ATPA.advise({
            tools: [
                tool('mega.bad', {
                    category: 'irreversible', sideEffects: 'irreversible', blastRadius: 5, requiresAuth: false
                }),
                tool('safe.read', { category: 'data_read', sideEffects: 'none', blastRadius: 1 })
            ],
            telemetry: [
                telem('mega.bad', { invocations: 200, errors: 80, injectionAttempts: 8 }),
                telem('safe.read', { invocations: 100 })
            ],
            agentProfile: { riskAppetite: 'cautious' }
        });
        const verdicts = r.tools.map(t => t.verdict);
        expect(verdicts).toContain('QUARANTINE');
        expect(r.portfolio.overallGrade).toBe('F');
    });
});

describe('AgentToolPolicyAdvisor — simulate', () => {
    test('simulate reduces portfolioRisk; never mutates input', () => {
        const tools = [
            tool('shell.exec', { category: 'shell', sideEffects: 'external', blastRadius: 4, requiresAuth: true }),
            tool('db.write', { category: 'data_write', sideEffects: 'write', blastRadius: 3, requiresAuth: true }),
            tool('mail.send', { category: 'email', sideEffects: 'external', blastRadius: 2, requiresAuth: true })
        ];
        const telemetry = [
            telem('shell.exec', { invocations: 80, errors: 18 }),
            telem('db.write', { invocations: 60, errors: 5 }),
            telem('mail.send', { invocations: 30 })
        ];
        const report = ATPA.advise({ tools, telemetry });
        const before = JSON.parse(JSON.stringify(report));
        const sim = ATPA.simulate({ report, applyTopN: 3 });
        expect(sim.applied.length).toBeGreaterThan(0);
        expect(sim.projectedRisk).toBeLessThanOrEqual(report.portfolio.portfolioRisk);
        // no mutation
        expect(report).toEqual(before);
    });
});

describe('AgentToolPolicyAdvisor — confidence', () => {
    test('no telemetry record → confidence <= 50', () => {
        const r = ATPA.advise({
            tools: [tool('orphan', { category: 'data_read', sideEffects: 'none', blastRadius: 1 })],
            telemetry: []
        });
        expect(r.tools[0].confidence).toBeLessThanOrEqual(50);
    });

    test('huge invocations clamped to 100', () => {
        const r = ATPA.advise({
            tools: [tool('busy.tool', { category: 'data_read', sideEffects: 'none', blastRadius: 1 })],
            telemetry: [telem('busy.tool', { invocations: 100000 })]
        });
        expect(r.tools[0].confidence).toBeLessThanOrEqual(100);
        expect(r.tools[0].confidence).toBeGreaterThanOrEqual(5);
    });
});

describe('AgentToolPolicyAdvisor — formatters', () => {
    function sampleReport() {
        return ATPA.advise({
            tools: [
                tool('shell.exec', { category: 'shell', sideEffects: 'external', blastRadius: 4, requiresAuth: true }),
                tool('search.docs', { category: 'data_read', sideEffects: 'none', blastRadius: 1 })
            ],
            telemetry: [
                telem('shell.exec', { invocations: 80, errors: 20 }),
                telem('search.docs', { invocations: 200 })
            ],
            options: { now: 1700000000000 }
        });
    }

    test('formatMarkdown contains table header and Playbook section', () => {
        const md = ATPA.formatMarkdown(sampleReport());
        expect(md).toMatch(/\| Tool \| Verdict \| Score \|/);
        expect(md).toMatch(/## Playbook/);
        expect(md).toMatch(/## Insights/);
    });

    test('formatText contains TOOL header row and Playbook block', () => {
        const txt = ATPA.formatText(sampleReport());
        expect(txt).toMatch(/AgentToolPolicyAdvisor/);
        expect(txt).toMatch(/TOOL/);
        expect(txt).toMatch(/Playbook:/);
    });

    test('formatJson is deterministic (byte-stable across calls)', () => {
        const r1 = sampleReport();
        const r2 = sampleReport();
        expect(ATPA.formatJson(r1)).toBe(ATPA.formatJson(r2));
        // and top-level keys are sorted alphabetically
        const parsed = JSON.parse(ATPA.formatJson(r1));
        const topKeys = Object.keys(parsed);
        const sortedTopKeys = topKeys.slice().sort();
        expect(topKeys).toEqual(sortedTopKeys);
    });
});
