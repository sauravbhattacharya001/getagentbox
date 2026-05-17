/**
 * AgentTriageAdvisor — agentic inbox triage for AgentBox.
 *
 * Given a list of incoming items (emails, notifications, chat pings),
 * classifies each into a priority lane with reasoning, suggests an
 * action and a response window, then assembles a prioritized triage
 * queue and a batch-execution plan.
 *
 * Zero dependencies. Pure functions. Browser + Node compatible.
 *
 * Item shape (all fields optional except `id`):
 *   {
 *     id:       string|number,
 *     subject:  string,
 *     body:     string,
 *     sender:   string,        // e-mail or display name
 *     channel:  string,        // 'email' | 'chat' | 'notification' | ...
 *     receivedAt: Date|string|number,
 *     vip:      boolean,       // hard override → Urgent lane
 *     mutedSenders?: string[]  // (passed via options)
 *   }
 */
(function (root, factory) {
    'use strict';
    if (typeof module === 'object' && module.exports) {
        module.exports = factory();
    } else {
        root.AgentTriageAdvisor = factory();
    }
}(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    var LANES = ['Urgent', 'Important', 'Routine', 'Snooze', 'Archive'];

    var URGENT_KEYWORDS = [
        'urgent', 'asap', 'immediately', 'critical', 'outage', 'down',
        'security', 'breach', 'incident', 'p0', 'sev1', 'sev-1'
    ];
    var IMPORTANT_KEYWORDS = [
        'deadline', 'due', 'reminder', 'invoice', 'payment',
        'contract', 'signature', 'review', 'approval', 'blocker'
    ];
    var NOISE_KEYWORDS = [
        'newsletter', 'unsubscribe', 'promo', 'sale', 'digest',
        'weekly summary', 'monthly summary', 'no-reply', 'noreply',
        'marketing'
    ];

    // ─── time helpers ────────────────────────────────────────────────

    function toDate(value) {
        if (value == null) return null;
        if (value instanceof Date) return isNaN(value.getTime()) ? null : value;
        var d = new Date(value);
        return isNaN(d.getTime()) ? null : d;
    }

    function ageHours(item, now) {
        var received = toDate(item.receivedAt);
        if (!received) return 0;
        return Math.max(0, (now.getTime() - received.getTime()) / 3_600_000);
    }

    // ─── scoring ─────────────────────────────────────────────────────

    function containsAny(haystack, needles) {
        if (!haystack) return false;
        var h = String(haystack).toLowerCase();
        for (var i = 0; i < needles.length; i++) {
            if (h.indexOf(needles[i]) !== -1) return true;
        }
        return false;
    }

    function isNoise(item) {
        if (containsAny(item.subject, NOISE_KEYWORDS)) return true;
        if (containsAny(item.body, NOISE_KEYWORDS)) return true;
        if (item.sender && /no-?reply|newsletter|marketing/i.test(item.sender)) return true;
        return false;
    }

    function isMuted(item, mutedSenders) {
        if (!mutedSenders || mutedSenders.length === 0) return false;
        if (!item.sender) return false;
        var s = String(item.sender).toLowerCase();
        for (var i = 0; i < mutedSenders.length; i++) {
            if (s.indexOf(String(mutedSenders[i]).toLowerCase()) !== -1) return true;
        }
        return false;
    }

    function classify(item, now, mutedSenders) {
        var reasons = [];
        var lane;

        if (isMuted(item, mutedSenders)) {
            lane = 'Archive';
            reasons.push('Sender is on the muted list.');
            return { lane: lane, reasons: reasons };
        }

        if (item.vip) {
            reasons.push('VIP sender — always urgent.');
            lane = 'Urgent';
            return { lane: lane, reasons: reasons };
        }

        if (isNoise(item)) {
            reasons.push('Looks like newsletter/marketing/noreply traffic.');
            lane = 'Archive';
            return { lane: lane, reasons: reasons };
        }

        var hay = (item.subject || '') + ' ' + (item.body || '');
        var ageH = ageHours(item, now);

        if (containsAny(hay, URGENT_KEYWORDS)) {
            reasons.push('Contains urgent keyword (e.g. outage / critical / asap).');
            lane = 'Urgent';
        } else if (containsAny(hay, IMPORTANT_KEYWORDS)) {
            reasons.push('Contains an importance keyword (deadline / approval / invoice).');
            lane = 'Important';
        } else if (item.channel === 'chat' && ageH < 1) {
            reasons.push('Fresh chat ping (<1h old) — handle while context is hot.');
            lane = 'Important';
        } else if (ageH > 168) {
            reasons.push('Older than 7 days with no urgent signals — likely safe to snooze.');
            lane = 'Snooze';
        } else {
            reasons.push('No urgency or importance signals detected.');
            lane = 'Routine';
        }

        // Age escalation: very old "Important" with deadline keywords → Urgent.
        if (lane === 'Important' && ageH > 24 && containsAny(hay, ['deadline', 'due'])) {
            reasons.push('Deadline item aging past 24h — promoting to Urgent.');
            lane = 'Urgent';
        }

        return { lane: lane, reasons: reasons };
    }

    // ─── actions / windows ───────────────────────────────────────────

    function suggestAction(item, lane) {
        switch (lane) {
            case 'Urgent':
                return 'Respond now or escalate to on-call.';
            case 'Important':
                return 'Schedule a focused 10-minute reply slot today.';
            case 'Routine':
                return 'Batch with other routine items in the next sweep.';
            case 'Snooze':
                return 'Snooze 3 days; revisit if still relevant.';
            case 'Archive':
                return 'Archive — no response needed.';
            default:
                return 'Review.';
        }
    }

    function suggestWindowHours(lane) {
        switch (lane) {
            case 'Urgent':    return 1;
            case 'Important': return 8;
            case 'Routine':   return 48;
            case 'Snooze':    return 72;
            case 'Archive':   return null;
            default:          return 24;
        }
    }

    // ─── public API ──────────────────────────────────────────────────

    function triage(items, options) {
        options = options || {};
        if (!Array.isArray(items)) {
            throw new TypeError('triage(items): items must be an array.');
        }
        var now = toDate(options.now) || new Date();
        var mutedSenders = Array.isArray(options.mutedSenders) ? options.mutedSenders : [];

        var entries = [];
        for (var i = 0; i < items.length; i++) {
            var item = items[i] || {};
            if (item.id == null) {
                throw new Error('triage(items): every item needs an id (index ' + i + ').');
            }
            var c = classify(item, now, mutedSenders);
            entries.push({
                id: item.id,
                subject: item.subject || '(no subject)',
                sender: item.sender || '(unknown)',
                channel: item.channel || 'email',
                ageHours: Math.round(ageHours(item, now) * 10) / 10,
                lane: c.lane,
                rank: LANES.indexOf(c.lane),
                reasons: c.reasons,
                suggestedAction: suggestAction(item, c.lane),
                respondWithinHours: suggestWindowHours(c.lane)
            });
        }

        // Sort: lane rank ascending, then older items first within a lane.
        entries.sort(function (a, b) {
            if (a.rank !== b.rank) return a.rank - b.rank;
            return b.ageHours - a.ageHours;
        });

        return entries;
    }

    function summarize(entries) {
        if (!Array.isArray(entries)) {
            throw new TypeError('summarize(entries): entries must be an array.');
        }
        var counts = { Urgent: 0, Important: 0, Routine: 0, Snooze: 0, Archive: 0 };
        var oldestUrgent = null;
        var stressors = [];
        for (var i = 0; i < entries.length; i++) {
            var e = entries[i];
            if (counts[e.lane] != null) counts[e.lane]++;
            if (e.lane === 'Urgent') {
                if (oldestUrgent == null || e.ageHours > oldestUrgent.ageHours) {
                    oldestUrgent = e;
                }
            }
        }
        if (counts.Urgent >= 3) {
            stressors.push(counts.Urgent + ' urgent items competing for attention — pick one and finish it.');
        }
        if (counts.Important >= 5) {
            stressors.push(counts.Important + ' important items queued — consider a 30-minute focus block.');
        }
        if (counts.Archive >= 10) {
            stressors.push(counts.Archive + ' archivable items — bulk-archive to clear visual noise.');
        }
        if (oldestUrgent && oldestUrgent.ageHours > 4) {
            stressors.push('Oldest urgent item ("' + oldestUrgent.subject + '") is ' +
                oldestUrgent.ageHours + 'h old — response window already missed.');
        }
        if (stressors.length === 0 && entries.length > 0) {
            stressors.push('Inbox is under control.');
        }

        var responseOrder = entries
            .filter(function (e) { return e.lane !== 'Archive'; })
            .slice(0, 10)
            .map(function (e) { return e.id; });

        return {
            total: entries.length,
            counts: counts,
            oldestUrgentId: oldestUrgent ? oldestUrgent.id : null,
            stressors: stressors,
            responseOrder: responseOrder
        };
    }

    function planBatches(entries, options) {
        options = options || {};
        var batchSize = options.batchSize > 0 ? Math.floor(options.batchSize) : 5;
        if (!Array.isArray(entries)) {
            throw new TypeError('planBatches(entries): entries must be an array.');
        }
        var batches = [];
        // Group consecutive non-Archive entries from the sorted triage list.
        var current = null;
        for (var i = 0; i < entries.length; i++) {
            var e = entries[i];
            if (e.lane === 'Archive') continue;
            if (!current || current.lane !== e.lane || current.items.length >= batchSize) {
                current = {
                    lane: e.lane,
                    items: [],
                    suggestedSlotMinutes: e.lane === 'Urgent' ? 5 : e.lane === 'Important' ? 10 : 15
                };
                batches.push(current);
            }
            current.items.push(e.id);
        }
        return batches;
    }

    function formatMarkdown(entries, summary) {
        if (!Array.isArray(entries)) {
            throw new TypeError('formatMarkdown(entries, summary): entries must be an array.');
        }
        summary = summary || summarize(entries);
        var out = [];
        out.push('# Inbox Triage');
        out.push('');
        out.push('**Total:** ' + summary.total +
            ' · Urgent ' + summary.counts.Urgent +
            ' · Important ' + summary.counts.Important +
            ' · Routine ' + summary.counts.Routine +
            ' · Snooze ' + summary.counts.Snooze +
            ' · Archive ' + summary.counts.Archive);
        out.push('');
        if (summary.stressors && summary.stressors.length) {
            out.push('## Stressors');
            for (var i = 0; i < summary.stressors.length; i++) {
                out.push('- ' + summary.stressors[i]);
            }
            out.push('');
        }
        out.push('## Queue');
        for (var j = 0; j < entries.length; j++) {
            var e = entries[j];
            out.push('- **[' + e.lane + ']** ' + e.subject +
                ' — _' + e.sender + '_ (' + e.ageHours + 'h old)');
            out.push('  - Why: ' + e.reasons.join(' '));
            out.push('  - Action: ' + e.suggestedAction +
                (e.respondWithinHours != null ? ' (within ' + e.respondWithinHours + 'h)' : ''));
        }
        return out.join('\n');
    }

    return {
        LANES: LANES.slice(),
        triage: triage,
        summarize: summarize,
        planBatches: planBatches,
        formatMarkdown: formatMarkdown,
        // exported for tests:
        _classify: classify,
        _isNoise: isNoise
    };
}));
