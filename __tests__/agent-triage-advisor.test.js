/**
 * Tests for AgentTriageAdvisor — agentic inbox triage.
 */
'use strict';

const Triage = require('../src/agent-triage-advisor.js');

const NOW = new Date('2026-05-16T19:00:00-07:00');

function hoursAgo(h) {
    return new Date(NOW.getTime() - h * 3_600_000);
}

describe('AgentTriageAdvisor.triage', () => {
    test('throws on non-array input', () => {
        expect(() => Triage.triage('nope')).toThrow(TypeError);
    });

    test('throws when an item is missing an id', () => {
        expect(() => Triage.triage([{ subject: 'x' }], { now: NOW })).toThrow(/id/);
    });

    test('classifies an outage email as Urgent', () => {
        const out = Triage.triage([{
            id: 1,
            subject: 'Production outage — service down',
            body: 'We are seeing P0 errors from the gateway.',
            sender: 'alerts@company.com',
            channel: 'email',
            receivedAt: hoursAgo(0.5)
        }], { now: NOW });
        expect(out[0].lane).toBe('Urgent');
        expect(out[0].respondWithinHours).toBe(1);
        expect(out[0].reasons.join(' ')).toMatch(/urgent keyword/);
    });

    test('classifies an invoice email as Important', () => {
        const out = Triage.triage([{
            id: 2,
            subject: 'Invoice #4421 ready for review',
            body: 'Please approve at your convenience.',
            sender: 'billing@vendor.com',
            channel: 'email',
            receivedAt: hoursAgo(2)
        }], { now: NOW });
        expect(out[0].lane).toBe('Important');
        expect(out[0].suggestedAction).toMatch(/focused/);
    });

    test('classifies an unsubscribe-flavoured email as Archive', () => {
        const out = Triage.triage([{
            id: 3,
            subject: 'Our weekly newsletter is here!',
            body: 'Unsubscribe at any time.',
            sender: 'newsletter@brand.com',
            channel: 'email',
            receivedAt: hoursAgo(3)
        }], { now: NOW });
        expect(out[0].lane).toBe('Archive');
        expect(out[0].respondWithinHours).toBeNull();
    });

    test('classifies fresh chat ping as Important', () => {
        const out = Triage.triage([{
            id: 4,
            subject: 'quick q',
            body: 'have a sec?',
            sender: 'teammate@company.com',
            channel: 'chat',
            receivedAt: hoursAgo(0.1)
        }], { now: NOW });
        expect(out[0].lane).toBe('Important');
    });

    test('snoozes very old generic items', () => {
        const out = Triage.triage([{
            id: 5,
            subject: 'random thought',
            body: 'just wanted to share',
            sender: 'friend@example.com',
            channel: 'email',
            receivedAt: hoursAgo(24 * 9) // 9 days
        }], { now: NOW });
        expect(out[0].lane).toBe('Snooze');
    });

    test('escalates aging important deadline items to Urgent', () => {
        const out = Triage.triage([{
            id: 6,
            subject: 'Friendly reminder: deadline tomorrow',
            body: 'Submission due soon.',
            sender: 'pm@company.com',
            channel: 'email',
            receivedAt: hoursAgo(30) // > 24h
        }], { now: NOW });
        expect(out[0].lane).toBe('Urgent');
        expect(out[0].reasons.some(r => /promoting/i.test(r))).toBe(true);
    });

    test('VIP override always wins', () => {
        const out = Triage.triage([{
            id: 7,
            subject: 'weekly newsletter',
            body: 'promo content',
            sender: 'ceo@company.com',
            channel: 'email',
            vip: true,
            receivedAt: hoursAgo(1)
        }], { now: NOW });
        expect(out[0].lane).toBe('Urgent');
    });

    test('muted senders go straight to Archive', () => {
        const out = Triage.triage([{
            id: 8,
            subject: 'Important update from Bob',
            body: 'Please review the deadline document.',
            sender: 'bob@spammy.io',
            channel: 'email',
            receivedAt: hoursAgo(1)
        }], { now: NOW, mutedSenders: ['spammy.io'] });
        expect(out[0].lane).toBe('Archive');
    });

    test('sorts queue by lane then by age within a lane', () => {
        const items = [
            { id: 'a', subject: 'newsletter', sender: 'newsletter@brand.com', receivedAt: hoursAgo(2) },
            { id: 'b', subject: 'invoice due tomorrow', body: 'deadline soon', receivedAt: hoursAgo(3) },
            { id: 'c', subject: 'outage in prod', body: 'critical incident', receivedAt: hoursAgo(1) },
            { id: 'd', subject: 'invoice payment confirm', receivedAt: hoursAgo(10) },
            { id: 'e', subject: 'random hello', receivedAt: hoursAgo(2) }
        ];
        const out = Triage.triage(items, { now: NOW });
        // First should be Urgent (c)
        expect(out[0].id).toBe('c');
        // Archive should be last
        expect(out[out.length - 1].id).toBe('a');
        // Among Important items, older first (d before b)
        const importantIds = out.filter(e => e.lane === 'Important').map(e => e.id);
        expect(importantIds.indexOf('d')).toBeLessThan(importantIds.indexOf('b'));
    });
});

describe('AgentTriageAdvisor.summarize', () => {
    test('aggregates counts and surfaces stressors when urgent items pile up', () => {
        const items = [
            { id: 1, subject: 'outage', body: 'critical', receivedAt: hoursAgo(6) },
            { id: 2, subject: 'p0 incident', body: 'down', receivedAt: hoursAgo(2) },
            { id: 3, subject: 'security breach', body: 'sev1', receivedAt: hoursAgo(1) },
            { id: 4, subject: 'invoice', receivedAt: hoursAgo(2) },
            { id: 5, subject: 'newsletter', sender: 'noreply@x.com', receivedAt: hoursAgo(2) }
        ];
        const entries = Triage.triage(items, { now: NOW });
        const sum = Triage.summarize(entries);

        expect(sum.total).toBe(5);
        expect(sum.counts.Urgent).toBe(3);
        expect(sum.counts.Archive).toBe(1);
        expect(sum.oldestUrgentId).toBe(1);
        // Two stressors: 3 urgent items + oldest urgent > 4h old
        expect(sum.stressors.length).toBeGreaterThanOrEqual(2);
        expect(sum.responseOrder).not.toContain(5); // archive excluded
        // First in response order should be the Urgent lane leader
        expect(sum.responseOrder[0]).toBe(1);
    });

    test('reports "inbox under control" when nothing is stressful', () => {
        const entries = Triage.triage([
            { id: 1, subject: 'hello', receivedAt: hoursAgo(2) }
        ], { now: NOW });
        const sum = Triage.summarize(entries);
        expect(sum.stressors).toEqual(['Inbox is under control.']);
    });
});

describe('AgentTriageAdvisor.planBatches', () => {
    test('groups by lane respecting batch size and skips Archive', () => {
        const items = [];
        for (let i = 0; i < 7; i++) {
            items.push({ id: 'imp-' + i, subject: 'invoice ' + i, receivedAt: hoursAgo(2) });
        }
        items.push({ id: 'arch', subject: 'newsletter', sender: 'noreply@x.com', receivedAt: hoursAgo(2) });
        const entries = Triage.triage(items, { now: NOW });
        const batches = Triage.planBatches(entries, { batchSize: 3 });

        expect(batches.every(b => b.lane !== 'Archive')).toBe(true);
        // 7 Important items split into batches of 3 → 3+3+1
        const importantBatches = batches.filter(b => b.lane === 'Important');
        expect(importantBatches.map(b => b.items.length)).toEqual([3, 3, 1]);
        expect(importantBatches[0].suggestedSlotMinutes).toBe(10);
    });
});

describe('AgentTriageAdvisor.formatMarkdown', () => {
    test('renders a queue with stressors and per-item reasoning', () => {
        const items = [
            { id: 1, subject: 'outage', body: 'critical', receivedAt: hoursAgo(0.5) },
            { id: 2, subject: 'hello', receivedAt: hoursAgo(2) }
        ];
        const entries = Triage.triage(items, { now: NOW });
        const md = Triage.formatMarkdown(entries);
        expect(md).toMatch(/^# Inbox Triage/);
        expect(md).toMatch(/\[Urgent\]/);
        expect(md).toMatch(/\[Routine\]/);
        expect(md).toMatch(/Why:/);
        expect(md).toMatch(/Action:/);
    });
});
