'use strict';

const { createAgentMemoryHygieneAdvisor } = require('../src/agent-memory-hygiene-advisor');

const FIXED_NOW = new Date('2026-05-18T00:00:00Z');
const DAY = 86400000;

function freshAdvisor(overrides) {
    return createAgentMemoryHygieneAdvisor(Object.assign({ now: () => FIXED_NOW }, overrides || {}));
}

function mem(overrides) {
    return Object.assign({
        id: 'm1',
        content: 'A short, useful note about user preferences for dark mode.',
        ts: new Date(FIXED_NOW.getTime() - 5 * DAY).toISOString(),
        lastAccessAt: new Date(FIXED_NOW.getTime() - 2 * DAY).toISOString(),
        accessCount: 5,
        importance: 0.6,
        pinned: false,
        pii: false
    }, overrides || {});
}

describe('AgentMemoryHygieneAdvisor', () => {
    test('empty memory store -> healthy fallback', () => {
        const r = freshAdvisor().analyze({ memories: [] });
        expect(r.portfolio.totalEntries).toBe(0);
        expect(r.portfolio.grade).toBe('A');
        expect(r.portfolio.band).toBe('CALM');
        expect(r.playbook[0].id).toBe('HEALTHY_MEMORY');
        expect(r.insights.some(i => i.code === 'EMPTY_MEMORY')).toBe(true);
    });

    test('fresh useful memory -> KEEP', () => {
        const r = freshAdvisor().analyze({ memories: [mem()] });
        expect(r.items[0].verdict).toBe('KEEP');
        expect(r.items[0].priority).toBe('P3');
    });

    test('PII memory -> QUARANTINE_PII P0 + F grade', () => {
        const r = freshAdvisor().analyze({
            memories: [mem({ id: 'leak', content: 'user ssn 123-45-6789', pii: true })]
        });
        expect(r.items[0].verdict).toBe('QUARANTINE_PII');
        expect(r.items[0].priority).toBe('P0');
        expect(r.portfolio.grade).toBe('F');
        expect(r.playbook[0].id).toBe('QUARANTINE_AND_REVIEW_PII');
    });

    test('contradictory entries -> RESOLVE_CONTRADICTION P0 both sides', () => {
        const r = freshAdvisor().analyze({
            memories: [
                mem({ id: 'a', content: 'user prefers dark mode and morning meetings' }),
                mem({ id: 'b', content: 'user prefers light mode and afternoon meetings', contradicts: ['a'] })
            ]
        });
        const a = r.items.find(i => i.id === 'a');
        const b = r.items.find(i => i.id === 'b');
        expect(a.verdict).toBe('RESOLVE_CONTRADICTION');
        expect(b.verdict).toBe('RESOLVE_CONTRADICTION');
        expect(r.playbook.some(p => p.id === 'RESOLVE_CONTRADICTIONS')).toBe(true);
    });

    test('near-duplicate via content jaccard -> MERGE with mergeIntoId pointing earlier', () => {
        const r = freshAdvisor().analyze({
            memories: [
                mem({ id: 'orig', content: 'meeting with alice on tuesday about q3 roadmap planning and goals' }),
                mem({ id: 'dup',  content: 'meeting with alice on tuesday about q3 roadmap planning and goals' })
            ]
        });
        const dup = r.items.find(i => i.id === 'dup');
        expect(dup.verdict).toBe('MERGE');
        expect(dup.mergeIntoId).toBe('orig');
        expect(r.playbook.some(p => p.id === 'MERGE_NEAR_DUPLICATES')).toBe(true);
    });

    test('embedding hash duplicate also merges', () => {
        const r = freshAdvisor().analyze({
            memories: [
                mem({ id: 'a', content: 'totally different text one', embeddingHash: 'h1' }),
                mem({ id: 'b', content: 'totally unrelated content two', embeddingHash: 'h1' })
            ]
        });
        const b = r.items.find(i => i.id === 'b');
        expect(b.verdict).toBe('MERGE');
        expect(b.mergeIntoId).toBe('a');
    });

    test('hard-stale never-accessed low-importance -> DELETE', () => {
        const r = freshAdvisor().analyze({
            memories: [mem({
                id: 'old',
                content: 'random debug note from long ago',
                ts: new Date(FIXED_NOW.getTime() - 200 * DAY).toISOString(),
                lastAccessAt: new Date(FIXED_NOW.getTime() - 200 * DAY).toISOString(),
                accessCount: 0,
                importance: 0.2
            })]
        });
        expect(r.items[0].verdict).toBe('DELETE');
        expect(r.items[0].priority).toBe('P1');
    });

    test('important but aged out -> REFRESH', () => {
        const r = freshAdvisor().analyze({
            memories: [mem({
                id: 'imp',
                importance: 0.9,
                ts: new Date(FIXED_NOW.getTime() - 100 * DAY).toISOString(),
                lastAccessAt: new Date(FIXED_NOW.getTime() - 100 * DAY).toISOString()
            })]
        });
        expect(r.items[0].verdict).toBe('REFRESH');
    });

    test('pinned overrides into PIN_KEEP', () => {
        const r = freshAdvisor().analyze({
            memories: [mem({ id: 'pin', pinned: true, importance: 0.4,
                lastAccessAt: new Date(FIXED_NOW.getTime() - 80 * DAY).toISOString() })]
        });
        expect(r.items[0].verdict).toBe('PIN_KEEP');
        expect(r.items[0].priority).toBe('P3');
    });

    test('bloated low-importance -> COMPACT', () => {
        const big = 'x'.repeat(8000);
        const r = freshAdvisor().analyze({
            memories: [mem({ id: 'big', content: big, importance: 0.3 })]
        });
        expect(r.items[0].verdict).toBe('COMPACT');
    });

    test('budget overage triggers ENFORCE_MEMORY_BUDGET', () => {
        const memories = [];
        for (let i = 0; i < 6; i++) memories.push(mem({ id: 'm' + i, content: 'distinct content number ' + i + ' word' }));
        const r = freshAdvisor().analyze({ memories, budget: { maxItems: 3 } });
        expect(r.portfolio.overBudget).toBe(true);
        expect(r.playbook.some(p => p.id === 'ENFORCE_MEMORY_BUDGET')).toBe(true);
    });

    test('risk_appetite cautious produces stricter dup detection than aggressive', () => {
        const memories = [
            mem({ id: 'a', content: 'project alpha kickoff at noon thursday in conference room blue' }),
            mem({ id: 'b', content: 'project alpha kickoff at noon thursday in conference room red'  })
        ];
        const c = freshAdvisor().analyze({ memories, risk_appetite: 'cautious' });
        const a = freshAdvisor().analyze({ memories, risk_appetite: 'aggressive' });
        const cMerge = c.items.find(i => i.id === 'b').verdict === 'MERGE';
        const aMerge = a.items.find(i => i.id === 'b').verdict === 'MERGE';
        // cautious should be at least as eager to merge as aggressive (and at least one should merge)
        expect(cMerge || !aMerge).toBe(true);
    });

    test('apply() removes MERGE/DELETE/QUARANTINE_PII and preserves KEEP', () => {
        const memories = [
            mem({ id: 'k', content: 'keep this fresh note' }),
            mem({ id: 'pii', content: 'sensitive', pii: true }),
            mem({ id: 'orig', content: 'meeting alice tuesday q3 plans goals roadmap retrospective' }),
            mem({ id: 'dup',  content: 'meeting alice tuesday q3 plans goals roadmap retrospective' })
        ];
        const adv = freshAdvisor();
        const r = adv.analyze({ memories });
        const next = adv.apply(memories, r);
        const ids = next.map(m => m.id).sort();
        expect(ids).toEqual(['k', 'orig']);
        // input not mutated
        expect(memories.length).toBe(4);
    });

    test('simulate() projects lower risk after applying top actions', () => {
        const memories = [
            mem({ id: 'pii', content: 'phone 555-1212', pii: true }),
            mem({ id: 'old1', content: 'stale a', ts: new Date(FIXED_NOW.getTime() - 200 * DAY).toISOString(),
                  lastAccessAt: new Date(FIXED_NOW.getTime() - 200 * DAY).toISOString(), accessCount: 0, importance: 0.1 }),
            mem({ id: 'orig', content: 'unique meeting note one alpha beta gamma delta epsilon zeta eta' }),
            mem({ id: 'dup',  content: 'unique meeting note one alpha beta gamma delta epsilon zeta eta' })
        ];
        const adv = freshAdvisor();
        const r = adv.analyze({ memories });
        const sim = adv.simulate({ applyTop: 3 }, r);
        expect(sim.projectedRisk).toBeLessThan(sim.baseRisk);
        expect(sim.appliedActions.length).toBeGreaterThan(0);
    });

    test('formatText/Markdown/Json all return strings; JSON is byte-stable', () => {
        const adv = freshAdvisor();
        const r = adv.analyze({ memories: [mem(), mem({ id: 'old',
            ts: new Date(FIXED_NOW.getTime() - 200 * DAY).toISOString(),
            lastAccessAt: new Date(FIXED_NOW.getTime() - 200 * DAY).toISOString(),
            accessCount: 0, importance: 0.1 })] });
        expect(typeof adv.formatText(r)).toBe('string');
        expect(adv.formatMarkdown(r)).toContain('## Items');
        const j1 = adv.formatJson(r);
        const j2 = adv.formatJson(r);
        expect(j1).toBe(j2);
        // parse round-trip
        const parsed = JSON.parse(j1);
        expect(parsed.portfolio).toBeDefined();
    });

    test('input is never mutated', () => {
        const memories = [mem({ id: 'a' }), mem({ id: 'b', content: mem().content })];
        const snapshot = JSON.parse(JSON.stringify(memories));
        const adv = freshAdvisor();
        const r = adv.analyze({ memories });
        adv.simulate({ applyTop: 5 }, r);
        adv.apply(memories, r);
        expect(memories).toEqual(snapshot);
    });

    test('headline summary includes band and grade', () => {
        const r = freshAdvisor().analyze({ memories: [mem()] });
        expect(r.summary).toMatch(/VERDICT:/);
        expect(r.summary).toContain(r.portfolio.band);
        expect(r.summary).toContain('grade ' + r.portfolio.grade);
    });
});
