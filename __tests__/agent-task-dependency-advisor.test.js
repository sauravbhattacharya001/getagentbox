'use strict';

const { createAgentTaskDependencyAdvisor } = require('../src/agent-task-dependency-advisor');

const FIXED_NOW = new Date('2026-05-18T12:00:00Z');
const DAY = 24 * 60 * 60 * 1000;

function freshAdvisor() {
    return createAgentTaskDependencyAdvisor({ now: () => FIXED_NOW });
}

function daysAgo(d) {
    return new Date(FIXED_NOW.getTime() - d * DAY).toISOString();
}
function daysAhead(d) {
    return new Date(FIXED_NOW.getTime() + d * DAY).toISOString();
}
function hoursAhead(h) {
    return new Date(FIXED_NOW.getTime() + h * 60 * 60 * 1000).toISOString();
}

describe('AgentTaskDependencyAdvisor', () => {
    test('empty pipeline -> EMPTY_PIPELINE insight, grade A', () => {
        const r = freshAdvisor().analyze([]);
        expect(r.portfolio.totalTasks).toBe(0);
        expect(r.portfolio.grade).toBe('A');
        expect(r.insights.some(i => i.code === 'EMPTY_PIPELINE')).toBe(true);
        expect(r.playbook[0].id).toBe('PIPELINE_HEALTHY');
    });

    test('linear chain A<-B<-C: A READY, others waiting', () => {
        const tasks = [
            { id: 'A', dependsOn: [], status: 'pending', estimatedDuration: 4 },
            { id: 'B', dependsOn: ['A'], status: 'pending', estimatedDuration: 4 },
            { id: 'C', dependsOn: ['B'], status: 'pending', estimatedDuration: 4 }
        ];
        const r = freshAdvisor().analyze(tasks);
        const a = r.items.find(i => i.id === 'A');
        const b = r.items.find(i => i.id === 'B');
        expect(a.verdict).toBe('READY_TO_START');
        expect(b.verdict).toBe('WAIT_ON_BLOCKER');
        expect(b.reasons.some(r => r.code === 'WAITING_ON_A')).toBe(true);
    });

    test('cycle A<->B -> BREAK_CYCLE P0, grade F, DEADLOCK_RISK', () => {
        const tasks = [
            { id: 'A', dependsOn: ['B'], status: 'pending' },
            { id: 'B', dependsOn: ['A'], status: 'pending' }
        ];
        const r = freshAdvisor().analyze(tasks);
        expect(r.items.every(i => i.verdict === 'BREAK_CYCLE')).toBe(true);
        expect(r.items.every(i => i.priority === 'P0')).toBe(true);
        expect(r.portfolio.grade).toBe('F');
        expect(r.playbook.some(a => a.id === 'BREAK_DEPENDENCY_CYCLE')).toBe(true);
        expect(r.insights.some(i => i.code === 'DEADLOCK_RISK')).toBe(true);
    });

    test('missing dependency -> MISSING_DEPENDENCY + REPAIR_MISSING_DEPS', () => {
        const r = freshAdvisor().analyze([
            { id: 'X', dependsOn: ['ghost'], status: 'pending' }
        ]);
        const x = r.items.find(i => i.id === 'X');
        expect(x.reasons.some(r => r.code === 'MISSING_DEPENDENCY')).toBe(true);
        expect(x.verdict).toBe('UNBLOCK_NOW');
        expect(r.playbook.some(a => a.id === 'REPAIR_MISSING_DEPS')).toBe(true);
    });

    test('deadline conflict -> DEADLINE_CONFLICT + RESCHEDULE', () => {
        const r = freshAdvisor().analyze([
            { id: 'A', dependsOn: [], status: 'pending', dueDate: daysAhead(7) },
            { id: 'B', dependsOn: ['A'], status: 'pending', dueDate: daysAhead(1) }
        ]);
        const b = r.items.find(i => i.id === 'B');
        expect(b.reasons.some(r => r.code === 'DEADLINE_CONFLICT')).toBe(true);
        expect(b.verdict).toBe('RESCHEDULE');
        expect(r.playbook.some(a => a.id === 'RESCHEDULE_DEADLINE_CONFLICTS')).toBe(true);
    });

    test('stale blockers -> REASSIGN_STALE_BLOCKERS when >=2', () => {
        const r = freshAdvisor().analyze([
            { id: 'A', dependsOn: [], status: 'in_progress', blockedSince: daysAgo(30) },
            { id: 'B', dependsOn: [], status: 'in_progress', blockedSince: daysAgo(20) }
        ]);
        expect(r.items.filter(i => i.reasons.some(r => r.code === 'STALE_BLOCKER')).length).toBeGreaterThanOrEqual(2);
        expect(r.playbook.some(a => a.id === 'REASSIGN_STALE_BLOCKERS')).toBe(true);
    });

    test('3+ ready tasks -> PARALLEL_KICKOFF_READY P0', () => {
        const tasks = [
            { id: 'A', dependsOn: [] },
            { id: 'B', dependsOn: [] },
            { id: 'C', dependsOn: [] }
        ];
        const r = freshAdvisor().analyze(tasks);
        const action = r.playbook.find(a => a.id === 'PARALLEL_KICKOFF_READY');
        expect(action).toBeDefined();
        expect(action.priority).toBe('P0');
    });

    test('high fan-out (>=5) -> FAN_OUT_BOTTLENECK insight + HIGH_FAN_OUT reason', () => {
        const tasks = [{ id: 'root', dependsOn: [] }];
        for (let i = 0; i < 6; i++) tasks.push({ id: 'c' + i, dependsOn: ['root'] });
        const r = freshAdvisor().analyze(tasks);
        expect(r.insights.some(i => i.code === 'FAN_OUT_BOTTLENECK')).toBe(true);
        const root = r.items.find(i => i.id === 'root');
        expect(root.reasons.some(r => r.code === 'HIGH_FAN_OUT')).toBe(true);
    });

    test('deep chain length 8 -> SPLIT_DEEP_CHAIN P1 + DEEP_CRITICAL_PATH insight', () => {
        const tasks = [];
        for (let i = 0; i < 8; i++) {
            tasks.push({ id: 't' + i, dependsOn: i === 0 ? [] : ['t' + (i - 1)] });
        }
        const r = freshAdvisor().analyze(tasks);
        expect(r.portfolio.criticalPathLength).toBe(8);
        expect(r.playbook.some(a => a.id === 'SPLIT_DEEP_CHAIN')).toBe(true);
        expect(r.insights.some(i => i.code === 'DEEP_CRITICAL_PATH')).toBe(true);
    });

    test('owner unavailable >=2 -> REVIEW_OWNERSHIP_GAPS', () => {
        const r = freshAdvisor().analyze(
            [
                { id: 'A', dependsOn: [], owner: 'alice' },
                { id: 'B', dependsOn: [], owner: 'alice' }
            ],
            { ownerAvailability: { alice: false } }
        );
        expect(r.items.every(i => i.reasons.some(r => r.code === 'OWNED_BY_UNAVAILABLE'))).toBe(true);
        expect(r.playbook.some(a => a.id === 'REVIEW_OWNERSHIP_GAPS')).toBe(true);
        expect(r.insights.some(i => i.code === 'STARVED_OWNERS')).toBe(true);
    });

    test('risk_appetite monotonicity: cautious >= balanced >= aggressive', () => {
        const tasks = [
            { id: 'A', dependsOn: [], status: 'in_progress', blockedSince: daysAgo(20), priority: 4 },
            { id: 'B', dependsOn: ['A'], status: 'pending', priority: 4 }
        ];
        const a = freshAdvisor();
        const cautious = a.analyze(tasks, { risk_appetite: 'cautious' }).portfolio.avgBlockerRiskScore;
        const balanced = a.analyze(tasks, { risk_appetite: 'balanced' }).portfolio.avgBlockerRiskScore;
        const aggressive = a.analyze(tasks, { risk_appetite: 'aggressive' }).portfolio.avgBlockerRiskScore;
        expect(cautious).toBeGreaterThanOrEqual(balanced);
        expect(balanced).toBeGreaterThanOrEqual(aggressive);
    });

    test('formatMarkdown contains required headers', () => {
        const adv = freshAdvisor();
        const r = adv.analyze([{ id: 'A', dependsOn: [] }]);
        const md = adv.formatMarkdown(r);
        expect(md).toMatch(/## Summary/);
        expect(md).toMatch(/## Tasks/);
        expect(md).toMatch(/## Playbook/);
        expect(md).toMatch(/## Insights/);
    });

    test('formatText has VERDICT headline', () => {
        const adv = freshAdvisor();
        const r = adv.analyze([{ id: 'A', dependsOn: [] }]);
        const txt = adv.formatText(r);
        expect(txt).toMatch(/VERDICT:/);
    });

    test('formatJson is byte-stable', () => {
        const adv = freshAdvisor();
        const r = adv.analyze([{ id: 'A', dependsOn: [] }, { id: 'B', dependsOn: ['A'] }]);
        const j1 = adv.formatJson(r);
        const j2 = adv.formatJson(r);
        expect(j1).toBe(j2);
    });

    test('simulate reduces avg risk and never mutates input report', () => {
        const adv = freshAdvisor();
        const tasks = [
            { id: 'A', dependsOn: ['B'], status: 'pending' },
            { id: 'B', dependsOn: ['A'], status: 'pending' }
        ];
        const r = adv.analyze(tasks);
        const before = JSON.stringify(r);
        const sim = adv.simulate({ applyTop: 3 }, r);
        expect(sim.projectedAvgRisk).toBeLessThanOrEqual(sim.baselineAvgRisk);
        expect(JSON.stringify(r)).toBe(before);
    });

    test('does not mutate input tasks array', () => {
        const tasks = [{ id: 'A', dependsOn: [], status: 'pending' }];
        const snapshot = JSON.stringify(tasks);
        freshAdvisor().analyze(tasks);
        expect(JSON.stringify(tasks)).toBe(snapshot);
    });

    test('ARCHIVE_STALE: >60d blocked + low priority -> ARCHIVE_STALE_TASKS when >=3', () => {
        const r = freshAdvisor().analyze([
            { id: 'A', dependsOn: [], priority: 1, blockedSince: daysAgo(90) },
            { id: 'B', dependsOn: [], priority: 2, blockedSince: daysAgo(80) },
            { id: 'C', dependsOn: [], priority: 1, blockedSince: daysAgo(70) }
        ]);
        expect(r.items.every(i => i.verdict === 'ARCHIVE_STALE')).toBe(true);
        expect(r.playbook.some(a => a.id === 'ARCHIVE_STALE_TASKS')).toBe(true);
    });

    test('deadline pressure (<24h with open blockers) forces P0', () => {
        const r = freshAdvisor().analyze([
            { id: 'A', dependsOn: [], status: 'pending' },
            { id: 'B', dependsOn: ['A'], status: 'pending', dueDate: hoursAhead(12) }
        ]);
        const b = r.items.find(i => i.id === 'B');
        expect(b.priority).toBe('P0');
        expect(b.reasons.some(r => r.code === 'DEADLINE_PRESSURE')).toBe(true);
    });

    test('factory exposes expected API surface', () => {
        const adv = createAgentTaskDependencyAdvisor();
        expect(typeof adv.analyze).toBe('function');
        expect(typeof adv.simulate).toBe('function');
        expect(typeof adv.formatText).toBe('function');
        expect(typeof adv.formatMarkdown).toBe('function');
        expect(typeof adv.formatJson).toBe('function');
        expect(typeof adv.version).toBe('string');
    });
});
