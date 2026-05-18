/**
 * AgentMemoryHygieneAdvisor — agentic per-memory hygiene auditor for
 * an agent's long-term memory store.
 *
 * Walks a fleet of memory entries (RAG snippets, learned facts, journal
 * notes, etc.) and emits per-entry verdicts plus a portfolio playbook so
 * the agent's memory doesn't rot into stale, duplicated, contradictory,
 * or PII-leaking sludge.
 *
 * 7th sibling to:
 *   - AgentTriageAdvisor
 *   - AgentRolloutPlanner
 *   - AgentDriftDetector
 *   - AgentToolPolicyAdvisor
 *   - AgentBudgetGuardianAdvisor
 *   - AgentAutonomyTuningAdvisor
 *
 * Pure JS, zero deps, UMD wrapper, deterministic given injectable now().
 * Never mutates input.
 *
 * Public API (factory):
 *   const advisor = createAgentMemoryHygieneAdvisor({ now });
 *   const report  = advisor.analyze({ memories, budget, risk_appetite });
 *   const sim     = advisor.simulate({ applyTop: N }, report);
 *   const next    = advisor.apply(memories, report);
 *   advisor.formatText(report) / formatMarkdown(report) / formatJson(report);
 */
(function (root, factory) {
    'use strict';
    if (typeof module === 'object' && module.exports) {
        module.exports = factory();
    } else {
        root.AgentMemoryHygieneAdvisor = factory();
    }
}(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    var VERSION = '1.0.0';

    var APPETITE = {
        cautious:   { staleDays: 30, hardStaleDays: 90,  dupJaccard: 0.78, bloatChars: 3000, riskShift:  6, prune: 0.85 },
        balanced:   { staleDays: 45, hardStaleDays: 120, dupJaccard: 0.85, bloatChars: 4000, riskShift:  0, prune: 1.00 },
        aggressive: { staleDays: 70, hardStaleDays: 180, dupJaccard: 0.92, bloatChars: 6000, riskShift: -6, prune: 1.20 }
    };

    var PRIORITY_RANK = { P0: 0, P1: 1, P2: 2, P3: 3 };

    // ── utils ────────────────────────────────────────────────────────────

    function clamp(v, lo, hi) { return v < lo ? lo : (v > hi ? hi : v); }
    function isNum(v) { return typeof v === 'number' && isFinite(v); }
    function num(v, d) { return isNum(v) ? v : (d === undefined ? 0 : d); }
    function asArr(v) { return Array.isArray(v) ? v.slice() : []; }
    function deepCopy(o) {
        if (o === null || typeof o !== 'object') return o;
        if (o instanceof Date) return new Date(o.getTime());
        if (Array.isArray(o)) return o.map(deepCopy);
        var out = {}; for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) out[k] = deepCopy(o[k]); return out;
    }
    function tokenize(s) {
        if (!s) return [];
        var m = String(s).toLowerCase().match(/[a-z0-9]{2,}/g);
        return m || [];
    }
    function jaccard(aTokens, bTokens) {
        if (!aTokens.length && !bTokens.length) return 1;
        if (!aTokens.length || !bTokens.length) return 0;
        var A = new Set(aTokens), B = new Set(bTokens), inter = 0;
        A.forEach(function (t) { if (B.has(t)) inter++; });
        var uni = A.size + B.size - inter;
        return uni === 0 ? 0 : inter / uni;
    }
    function toTs(v) {
        if (v == null) return null;
        if (v instanceof Date) return v.getTime();
        var n = typeof v === 'number' ? v : Date.parse(v);
        return isFinite(n) ? n : null;
    }
    function daysBetween(later, earlier) {
        if (later == null || earlier == null) return null;
        return Math.max(0, (later - earlier) / 86400000);
    }
    function stableStringify(value, indent) {
        function sortKeys(v) {
            if (Array.isArray(v)) return v.map(sortKeys);
            if (v && typeof v === 'object') {
                var out = {};
                Object.keys(v).sort().forEach(function (k) { out[k] = sortKeys(v[k]); });
                return out;
            }
            return v;
        }
        return JSON.stringify(sortKeys(value), null, indent || 0);
    }

    // ── core analyze ──────────────────────────────────────────────────────

    function createAgentMemoryHygieneAdvisor(opts) {
        opts = opts || {};
        var nowFn = typeof opts.now === 'function' ? opts.now : function () { return new Date(); };

        function analyze(input) {
            input = input || {};
            var memories = asArr(input.memories).map(deepCopy);
            var budget = input.budget || {};
            var appetiteKey = APPETITE[input.risk_appetite] ? input.risk_appetite : 'balanced';
            var A = APPETITE[appetiteKey];
            var nowMs = nowFn().getTime();

            // pre-tokenize for dup detection
            var meta = memories.map(function (m, i) {
                var content = m.content == null ? '' : String(m.content);
                return {
                    idx: i,
                    id: m.id != null ? String(m.id) : ('m_' + i),
                    content: content,
                    tokens: tokenize(content),
                    createdMs: toTs(m.ts != null ? m.ts : m.createdAt),
                    accessedMs: toTs(m.lastAccessAt != null ? m.lastAccessAt : m.lastAccess),
                    accessCount: num(m.accessCount, 0),
                    importance: clamp(num(m.importance, 0.5), 0, 1),
                    pinned: !!m.pinned,
                    pii: !!m.pii,
                    contradicts: asArr(m.contradicts).map(String),
                    embeddingHash: m.embeddingHash != null ? String(m.embeddingHash) : null,
                    source: m.source != null ? String(m.source) : null,
                    tags: asArr(m.tags).map(String)
                };
            });

            // duplicate pairs: keep the earliest-indexed survivor
            var dupLinks = {}; // id -> { mergeIntoId, jaccard }
            var byHash = {};
            for (var i = 0; i < meta.length; i++) {
                var mi = meta[i];
                if (mi.embeddingHash) {
                    if (byHash[mi.embeddingHash] === undefined) byHash[mi.embeddingHash] = i;
                    else if (!dupLinks[mi.id]) dupLinks[mi.id] = { mergeIntoId: meta[byHash[mi.embeddingHash]].id, jaccard: 1.0, reason: 'EMBEDDING_HASH' };
                }
            }
            for (var x = 0; x < meta.length; x++) {
                if (dupLinks[meta[x].id]) continue;
                for (var y = 0; y < x; y++) {
                    if (dupLinks[meta[y].id]) continue;
                    if (meta[y].tokens.length < 3 || meta[x].tokens.length < 3) continue;
                    var jx = jaccard(meta[x].tokens, meta[y].tokens);
                    if (jx >= A.dupJaccard) {
                        dupLinks[meta[x].id] = { mergeIntoId: meta[y].id, jaccard: jx, reason: 'CONTENT_JACCARD' };
                        break;
                    }
                }
            }

            // contradiction set: edges from `contradicts` field
            var contraSet = {};
            meta.forEach(function (m) {
                m.contradicts.forEach(function (cid) {
                    contraSet[m.id] = contraSet[m.id] || [];
                    contraSet[m.id].push(cid);
                    contraSet[cid] = contraSet[cid] || [];
                    contraSet[cid].push(m.id);
                });
            });

            // per-item evaluation
            var items = meta.map(function (m) {
                var ref = m.accessedMs != null ? m.accessedMs : m.createdMs;
                var ageDays = ref != null ? daysBetween(nowMs, ref) : null;
                var createdAgeDays = m.createdMs != null ? daysBetween(nowMs, m.createdMs) : null;
                var reasons = [];
                var risk = 0;

                // staleness
                if (ageDays != null) {
                    if (ageDays >= A.hardStaleDays) { risk += 35; reasons.push({ code: 'HARD_STALE', detail: Math.round(ageDays) + 'd since last touch' }); }
                    else if (ageDays >= A.staleDays) { risk += 18; reasons.push({ code: 'STALE', detail: Math.round(ageDays) + 'd since last touch' }); }
                }
                // low utility
                if (m.accessCount === 0 && createdAgeDays != null && createdAgeDays >= 14) {
                    risk += 12; reasons.push({ code: 'NEVER_ACCESSED', detail: 'never accessed in ' + Math.round(createdAgeDays) + 'd' });
                }
                if (m.importance <= 0.2) { risk += 8; reasons.push({ code: 'LOW_IMPORTANCE', detail: 'importance ' + m.importance.toFixed(2) }); }
                // bloat
                if (m.content.length >= A.bloatChars) { risk += 14; reasons.push({ code: 'BLOATED', detail: m.content.length + ' chars' }); }
                // duplicate
                if (dupLinks[m.id]) { risk += 40; reasons.push({ code: dupLinks[m.id].reason, detail: 'jaccard=' + dupLinks[m.id].jaccard.toFixed(2) + ' with ' + dupLinks[m.id].mergeIntoId }); }
                // contradiction
                if (contraSet[m.id] && contraSet[m.id].length) { risk += 55; reasons.push({ code: 'CONTRADICTS', detail: 'conflicts with ' + contraSet[m.id].slice(0, 3).join(',') }); }
                // pii
                if (m.pii) { risk += 60; reasons.push({ code: 'PII_PRESENT', detail: 'flagged as PII' }); }
                // pinned/important counterweight
                if (m.pinned || m.importance >= 0.9) {
                    risk = Math.max(0, risk - 25);
                    reasons.push({ code: 'PINNED_OR_IMPORTANT', detail: m.pinned ? 'pinned' : 'importance ' + m.importance.toFixed(2) });
                }
                // appetite shift
                risk += A.riskShift;
                risk = clamp(Math.round(risk), 0, 100);

                // verdict ladder
                var verdict, priority;
                if (m.pii) { verdict = 'QUARANTINE_PII'; priority = 'P0'; }
                else if (contraSet[m.id] && contraSet[m.id].length) { verdict = 'RESOLVE_CONTRADICTION'; priority = 'P0'; }
                else if (dupLinks[m.id]) { verdict = 'MERGE'; priority = m.pinned ? 'P2' : 'P1'; }
                else if (m.pinned) { verdict = 'PIN_KEEP'; priority = 'P3'; }
                else if (ageDays != null && ageDays >= A.hardStaleDays && m.accessCount <= 1 && m.importance <= 0.4) {
                    verdict = 'DELETE'; priority = 'P1';
                } else if (m.importance >= 0.7 && ageDays != null && ageDays >= A.staleDays) {
                    verdict = 'REFRESH'; priority = 'P2';
                } else if (m.content.length >= A.bloatChars && m.importance < 0.7) {
                    verdict = 'COMPACT'; priority = 'P2';
                } else if (risk >= 60) {
                    verdict = 'DELETE'; priority = 'P1';
                } else if (risk >= 35) {
                    verdict = 'COMPACT'; priority = 'P2';
                } else {
                    verdict = 'KEEP'; priority = 'P3';
                }

                return {
                    id: m.id,
                    verdict: verdict,
                    priority: priority,
                    riskScore: risk,
                    ageDays: ageDays == null ? null : Math.round(ageDays * 10) / 10,
                    accessCount: m.accessCount,
                    importance: m.importance,
                    contentChars: m.content.length,
                    mergeIntoId: dupLinks[m.id] ? dupLinks[m.id].mergeIntoId : null,
                    reasons: reasons.sort(function (a, b) { return a.code < b.code ? -1 : a.code > b.code ? 1 : 0; })
                };
            });

            // portfolio aggregates
            var totals = items.length;
            var byVerdict = {};
            items.forEach(function (it) { byVerdict[it.verdict] = (byVerdict[it.verdict] || 0) + 1; });
            var p0 = items.filter(function (it) { return it.priority === 'P0'; }).length;
            var p1 = items.filter(function (it) { return it.priority === 'P1'; }).length;
            var portfolioRisk = totals === 0 ? 0 : Math.round(items.reduce(function (s, it) { return s + it.riskScore; }, 0) / totals);
            portfolioRisk = clamp(portfolioRisk + A.riskShift, 0, 100);

            // band
            var band;
            if (portfolioRisk >= 80 || p0 >= 3) band = 'CRITICAL';
            else if (portfolioRisk >= 60 || p0 >= 1) band = 'HIGH';
            else if (portfolioRisk >= 40) band = 'ELEVATED';
            else if (portfolioRisk >= 20) band = 'WATCH';
            else band = 'CALM';

            // grade
            var grade;
            if (p0 >= 1) grade = 'F';
            else if (portfolioRisk >= 60 || p1 >= Math.max(2, Math.ceil(totals * 0.30))) grade = 'D';
            else if (portfolioRisk >= 40) grade = 'C';
            else if (portfolioRisk >= 20) grade = 'B';
            else grade = 'A';

            // budget overage
            var overBudget = false, overBudgetBy = 0;
            if (isNum(budget.maxItems) && totals > budget.maxItems) {
                overBudget = true; overBudgetBy = totals - budget.maxItems;
            }
            if (isNum(budget.maxBytes)) {
                var bytes = items.reduce(function (s, it) { return s + it.contentChars; }, 0);
                if (bytes > budget.maxBytes) { overBudget = true; }
            }

            // playbook
            var playbook = [];
            var piiItems = items.filter(function (i) { return i.verdict === 'QUARANTINE_PII'; }).map(function (i) { return i.id; });
            var contraItems = items.filter(function (i) { return i.verdict === 'RESOLVE_CONTRADICTION'; }).map(function (i) { return i.id; });
            var mergeItems = items.filter(function (i) { return i.verdict === 'MERGE'; }).map(function (i) { return i.id; });
            var deleteItems = items.filter(function (i) { return i.verdict === 'DELETE'; }).map(function (i) { return i.id; });
            var compactItems = items.filter(function (i) { return i.verdict === 'COMPACT'; }).map(function (i) { return i.id; });
            var refreshItems = items.filter(function (i) { return i.verdict === 'REFRESH'; }).map(function (i) { return i.id; });

            if (piiItems.length) playbook.push({
                id: 'QUARANTINE_AND_REVIEW_PII', priority: 'P0', label: 'Quarantine PII memories pending review',
                reason: piiItems.length + ' memory entr' + (piiItems.length === 1 ? 'y' : 'ies') + ' contain unredacted PII',
                owner: 'safety', blastRadius: 4, reversibility: 'medium', memoryIds: piiItems
            });
            if (contraItems.length) playbook.push({
                id: 'RESOLVE_CONTRADICTIONS', priority: 'P0', label: 'Reconcile contradictory memories',
                reason: contraItems.length + ' contradictory entr' + (contraItems.length === 1 ? 'y' : 'ies') + ' detected',
                owner: 'agent_dev', blastRadius: 3, reversibility: 'high', memoryIds: contraItems
            });
            if (mergeItems.length >= 1) playbook.push({
                id: 'MERGE_NEAR_DUPLICATES', priority: 'P1', label: 'Merge near-duplicate memories into canonical entries',
                reason: mergeItems.length + ' near-duplicate entr' + (mergeItems.length === 1 ? 'y' : 'ies'),
                owner: 'platform', blastRadius: 2, reversibility: 'high', memoryIds: mergeItems
            });
            if (deleteItems.length >= 1) playbook.push({
                id: 'PRUNE_STALE_UNUSED', priority: 'P1', label: 'Prune stale or low-value memories',
                reason: deleteItems.length + ' stale low-value entr' + (deleteItems.length === 1 ? 'y' : 'ies'),
                owner: 'platform', blastRadius: 2, reversibility: 'medium', memoryIds: deleteItems
            });
            if (compactItems.length >= 1) playbook.push({
                id: 'COMPACT_LARGE_ENTRIES', priority: 'P2', label: 'Summarize bloated or noisy memories in place',
                reason: compactItems.length + ' entr' + (compactItems.length === 1 ? 'y' : 'ies') + ' over size or low value',
                owner: 'platform', blastRadius: 2, reversibility: 'medium', memoryIds: compactItems
            });
            if (refreshItems.length >= 1) playbook.push({
                id: 'REFRESH_IMPORTANT_STALE', priority: 'P2', label: 'Re-verify important memories that have gone stale',
                reason: refreshItems.length + ' important entr' + (refreshItems.length === 1 ? 'y' : 'ies') + ' aging past freshness window',
                owner: 'agent_dev', blastRadius: 1, reversibility: 'high', memoryIds: refreshItems
            });
            if (overBudget) playbook.push({
                id: 'ENFORCE_MEMORY_BUDGET', priority: 'P2', label: 'Trim memory store to configured budget',
                reason: 'memory store exceeds configured budget (items=' + totals + (isNum(budget.maxItems) ? '/' + budget.maxItems : '') + ')',
                owner: 'platform', blastRadius: 2, reversibility: 'medium', memoryIds: []
            });
            if (!playbook.length) playbook.push({
                id: 'HEALTHY_MEMORY', priority: 'P3', label: 'Memory store is healthy — keep monitoring',
                reason: 'no significant hygiene issues detected', owner: 'platform', blastRadius: 1, reversibility: 'high', memoryIds: []
            });

            // appetite trims/adds
            if (appetiteKey === 'aggressive') {
                playbook = playbook.filter(function (a, idx, arr) {
                    if (a.priority === 'P3' && arr.length > 1) return false;
                    if (a.priority === 'P2' && arr.some(function (x) { return x.priority === 'P0' || x.priority === 'P1'; })) {
                        var sameP2 = arr.filter(function (x) { return x.priority === 'P2'; });
                        if (sameP2.length === 1) return false;
                    }
                    return true;
                });
            } else if (appetiteKey === 'cautious' && (grade === 'C' || grade === 'D' || grade === 'F')) {
                playbook.push({
                    id: 'SCHEDULE_MEMORY_AUDIT', priority: 'P2', label: 'Schedule a second-pass memory audit',
                    reason: 'grade ' + grade + ' with cautious appetite — add a follow-up audit cycle',
                    owner: 'platform', blastRadius: 1, reversibility: 'high', memoryIds: []
                });
            }

            // sort playbook: priority asc, id asc
            playbook.sort(function (a, b) {
                if (PRIORITY_RANK[a.priority] !== PRIORITY_RANK[b.priority]) return PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
                return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
            });

            // insights
            var insights = [];
            if (piiItems.length) insights.push({ code: 'PII_PRESENT_IN_MEMORY', detail: piiItems.length + ' entries' });
            if (contraItems.length) insights.push({ code: 'KNOWLEDGE_CONFLICT', detail: contraItems.length + ' contradictory entries' });
            if (mergeItems.length >= Math.max(3, Math.ceil(totals * 0.20))) insights.push({ code: 'DUPLICATE_DOMINANT', detail: mergeItems.length + ' near-duplicates (' + Math.round(mergeItems.length / totals * 100) + '%)' });
            if (deleteItems.length >= Math.max(3, Math.ceil(totals * 0.30))) insights.push({ code: 'STALE_DOMINANT', detail: deleteItems.length + ' stale low-value entries' });
            if (overBudget) insights.push({ code: 'BUDGET_EXCEEDED', detail: 'over configured memory budget' });
            if (totals > 0 && byVerdict.KEEP && byVerdict.KEEP / totals >= 0.80) insights.push({ code: 'MOSTLY_HEALTHY', detail: Math.round(byVerdict.KEEP / totals * 100) + '% KEEP' });
            if (totals === 0) insights.push({ code: 'EMPTY_MEMORY', detail: 'no memory entries supplied' });

            var summary = 'VERDICT: ' + band + ' (grade ' + grade + ') — ' + totals + ' entries, ' + p0 + ' P0, ' + p1 + ' P1';

            return {
                version: VERSION,
                generatedAt: new Date(nowMs).toISOString(),
                risk_appetite: appetiteKey,
                summary: summary,
                portfolio: {
                    totalEntries: totals,
                    portfolioRisk: portfolioRisk,
                    band: band,
                    grade: grade,
                    p0Count: p0,
                    p1Count: p1,
                    byVerdict: byVerdict,
                    overBudget: overBudget,
                    overBudgetBy: overBudgetBy
                },
                items: items,
                playbook: playbook,
                insights: insights
            };
        }

        // simulate applying the top-N actions of the playbook with
        // diminishing returns (0.85^i) over per-action risk-delta weights.
        function simulate(opts2, report) {
            opts2 = opts2 || {}; if (!report) throw new Error('simulate requires a report');
            var applyTop = isNum(opts2.applyTop) ? opts2.applyTop : report.playbook.length;
            var WEIGHT = {
                QUARANTINE_AND_REVIEW_PII: 0.40,
                RESOLVE_CONTRADICTIONS:    0.30,
                MERGE_NEAR_DUPLICATES:     0.22,
                PRUNE_STALE_UNUSED:        0.20,
                COMPACT_LARGE_ENTRIES:     0.12,
                REFRESH_IMPORTANT_STALE:   0.08,
                ENFORCE_MEMORY_BUDGET:     0.10,
                SCHEDULE_MEMORY_AUDIT:     0.03,
                HEALTHY_MEMORY:            0.0
            };
            var base = report.portfolio.portfolioRisk;
            var applied = [];
            var remaining = base;
            var i;
            for (i = 0; i < Math.min(applyTop, report.playbook.length); i++) {
                var a = report.playbook[i];
                var w = WEIGHT[a.id] || 0.05;
                var delta = remaining * w * Math.pow(0.85, i);
                remaining = Math.max(0, remaining - delta);
                applied.push({ id: a.id, priority: a.priority, riskDelta: -Math.round(delta) });
            }
            var projected = clamp(Math.round(remaining), 0, 100);
            var projBand;
            if (projected >= 80) projBand = 'CRITICAL';
            else if (projected >= 60) projBand = 'HIGH';
            else if (projected >= 40) projBand = 'ELEVATED';
            else if (projected >= 20) projBand = 'WATCH';
            else projBand = 'CALM';
            return { baseRisk: base, projectedRisk: projected, projectedBand: projBand, appliedActions: applied };
        }

        // apply: returns a NEW memories array with MERGE & DELETE & QUARANTINE_PII handled.
        function apply(memories, report) {
            var input = asArr(memories).map(deepCopy);
            if (!report) return input;
            var byId = {};
            report.items.forEach(function (it) { byId[it.id] = it; });
            var out = [];
            input.forEach(function (m, i) {
                var id = m.id != null ? String(m.id) : ('m_' + i);
                var it = byId[id];
                if (!it) { out.push(m); return; }
                if (it.verdict === 'MERGE' || it.verdict === 'DELETE' || it.verdict === 'QUARANTINE_PII') return;
                out.push(m);
            });
            return out;
        }

        // ── renderers ──────────────────────────────────────────────────

        function formatText(report) {
            var lines = [];
            lines.push('AgentMemoryHygieneAdvisor v' + report.version);
            lines.push(report.summary);
            lines.push('Generated: ' + report.generatedAt + ' (appetite=' + report.risk_appetite + ')');
            lines.push('');
            lines.push('Portfolio:');
            lines.push('  entries=' + report.portfolio.totalEntries +
                ' risk=' + report.portfolio.portfolioRisk +
                ' band=' + report.portfolio.band +
                ' grade=' + report.portfolio.grade +
                ' overBudget=' + report.portfolio.overBudget);
            lines.push('  verdicts: ' + Object.keys(report.portfolio.byVerdict).sort().map(function (k) {
                return k + '=' + report.portfolio.byVerdict[k];
            }).join(', '));
            lines.push('');
            lines.push('Top items:');
            report.items.slice().sort(function (a, b) {
                if (PRIORITY_RANK[a.priority] !== PRIORITY_RANK[b.priority]) return PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
                return b.riskScore - a.riskScore;
            }).slice(0, 10).forEach(function (it) {
                lines.push('  [' + it.priority + '] ' + it.id + ' verdict=' + it.verdict + ' risk=' + it.riskScore +
                    (it.mergeIntoId ? ' merge_into=' + it.mergeIntoId : '') +
                    (it.ageDays != null ? ' ageDays=' + it.ageDays : ''));
            });
            lines.push('');
            lines.push('Playbook:');
            report.playbook.forEach(function (a) {
                lines.push('  [' + a.priority + '] ' + a.id + ' — ' + a.label + ' (owner=' + a.owner + ', blast=' + a.blastRadius + ')');
                lines.push('     ' + a.reason);
            });
            if (report.insights.length) {
                lines.push('');
                lines.push('Insights:');
                report.insights.forEach(function (ins) { lines.push('  - ' + ins.code + ': ' + ins.detail); });
            }
            return lines.join('\n');
        }

        function formatMarkdown(report) {
            var L = [];
            L.push('# Memory Hygiene Report');
            L.push('');
            L.push('**' + report.summary + '**');
            L.push('');
            L.push('- Generated: `' + report.generatedAt + '`');
            L.push('- Risk appetite: `' + report.risk_appetite + '`');
            L.push('- Portfolio risk: `' + report.portfolio.portfolioRisk + '` / band `' + report.portfolio.band + '` / grade `' + report.portfolio.grade + '`');
            L.push('- Over budget: `' + report.portfolio.overBudget + '`');
            L.push('');
            L.push('## Items');
            L.push('');
            L.push('| Priority | ID | Verdict | Risk | Age (d) | Access | Merge → | Reasons |');
            L.push('|---|---|---|---|---|---|---|---|');
            report.items.slice().sort(function (a, b) {
                if (PRIORITY_RANK[a.priority] !== PRIORITY_RANK[b.priority]) return PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
                return b.riskScore - a.riskScore;
            }).forEach(function (it) {
                L.push('| ' + it.priority + ' | `' + it.id + '` | ' + it.verdict + ' | ' + it.riskScore +
                    ' | ' + (it.ageDays == null ? '-' : it.ageDays) +
                    ' | ' + it.accessCount +
                    ' | ' + (it.mergeIntoId || '-') +
                    ' | ' + it.reasons.map(function (r) { return r.code; }).join(', ') + ' |');
            });
            L.push('');
            L.push('## Playbook');
            L.push('');
            L.push('| Priority | Action | Owner | Blast | Reason |');
            L.push('|---|---|---|---|---|');
            report.playbook.forEach(function (a) {
                L.push('| ' + a.priority + ' | ' + a.id + ' | ' + a.owner + ' | ' + a.blastRadius + ' | ' + a.reason + ' |');
            });
            if (report.insights.length) {
                L.push('');
                L.push('## Insights');
                L.push('');
                report.insights.forEach(function (ins) { L.push('- **' + ins.code + '** — ' + ins.detail); });
            }
            return L.join('\n');
        }

        function formatJson(report) {
            return stableStringify(report, 2);
        }

        return {
            version: VERSION,
            analyze: analyze,
            simulate: simulate,
            apply: apply,
            formatText: formatText,
            formatMarkdown: formatMarkdown,
            formatJson: formatJson
        };
    }

    return {
        version: VERSION,
        createAgentMemoryHygieneAdvisor: createAgentMemoryHygieneAdvisor
    };
}));
