/**
 * AgentEscalationAdvisor - agentic per-incident escalation/handoff advisor
 * for a fleet of in-flight agent tasks.
 *
 * Given a snapshot of running agent incidents (in_progress / stuck / failed /
 * escalated) plus on-call capacity, classifies each one into a handoff
 * verdict (page humans now / queue for async review / autonomous retry /
 * abort+refund / hold for capacity / continue) and emits a portfolio
 * playbook so operators can decide where to spend human attention.
 *
 * 8th sibling to:
 *   AgentTriageAdvisor, AgentRolloutPlanner, AgentDriftDetector,
 *   AgentToolPolicyAdvisor, AgentBudgetGuardianAdvisor,
 *   AgentAutonomyTuningAdvisor, AgentMemoryHygieneAdvisor.
 *
 * Pure JS, zero deps, UMD wrapper, deterministic given injectable now().
 * Never mutates input.
 */
(function (root, factory) {
    'use strict';
    if (typeof module === 'object' && module.exports) {
        module.exports = factory();
    } else {
        root.AgentEscalationAdvisor = factory();
    }
}(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    var VERSION = '1.0.0';

    var APPETITE = {
        cautious:   { riskShift:  6, riskMult: 1.15, bandShift: -5, slaPressureRatio: 0.7 },
        balanced:   { riskShift:  0, riskMult: 1.00, bandShift:  0, slaPressureRatio: 0.8 },
        aggressive: { riskShift: -6, riskMult: 0.85, bandShift:  5, slaPressureRatio: 0.9 }
    };

    var PRIORITY_RANK = { P0: 0, P1: 1, P2: 2, P3: 3 };
    var REGULATED_DOMAINS = { finance: true, healthcare: true };

    // -------- utils ------------------------------------------------------
    function clamp(v, lo, hi) { return v < lo ? lo : (v > hi ? hi : v); }
    function isNum(v) { return typeof v === 'number' && isFinite(v); }
    function num(v, d) { return isNum(v) ? v : (d === undefined ? 0 : d); }
    function asArr(v) { return Array.isArray(v) ? v.slice() : []; }
    function deepCopy(o) {
        if (o === null || typeof o !== 'object') return o;
        if (o instanceof Date) return new Date(o.getTime());
        if (Array.isArray(o)) return o.map(deepCopy);
        var out = {}; for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) out[k] = deepCopy(o[k]);
        return out;
    }
    function toTs(v) {
        if (v == null) return null;
        if (v instanceof Date) return v.getTime();
        var n = typeof v === 'number' ? v : Date.parse(v);
        return isFinite(n) ? n : null;
    }
    function minutesBetween(later, earlier) {
        if (later == null || earlier == null) return null;
        return (later - earlier) / 60000;
    }
    function uniq(arr) {
        var seen = {}, out = [];
        for (var i = 0; i < arr.length; i++) if (!seen[arr[i]]) { seen[arr[i]] = 1; out.push(arr[i]); }
        return out;
    }
    function stableStringify(obj, indent) {
        function sort(v) {
            if (v === null || typeof v !== 'object') return v;
            if (v instanceof Date) return v.toISOString();
            if (Array.isArray(v)) return v.map(sort);
            var keys = Object.keys(v).sort(), o = {};
            keys.forEach(function (k) { o[k] = sort(v[k]); });
            return o;
        }
        return JSON.stringify(sort(obj), null, indent || 0);
    }

    function createAgentEscalationAdvisor(opts) {
        opts = opts || {};
        var nowFn = typeof opts.now === 'function' ? opts.now : function () { return new Date(); };

        function analyze(input, options) {
            input = input || {};
            options = options || {};
            var nowMs = (nowFn() instanceof Date ? nowFn() : new Date(nowFn())).getTime();

            var incidents = asArr(input.incidents).map(deepCopy);
            var oncall = deepCopy(input.oncall || { available: true, queueDepth: 0, capacityPerHour: 10 });
            var appetiteKey = (input.risk_appetite || options.risk_appetite || 'balanced');
            if (!APPETITE[appetiteKey]) appetiteKey = 'balanced';
            var knob = APPETITE[appetiteKey];

            var oncallAvailable = oncall.available !== false;
            var queueDepth = num(oncall.queueDepth, 0);
            var capacityPerHour = num(oncall.capacityPerHour, 10);
            // simple capacity model: room left = capacityPerHour - queueDepth
            var capacityRemaining = capacityPerHour - queueDepth;
            var capacityExhaustedDuringNeed = false;

            // first pass: score + verdict per incident
            var items = incidents.map(function (inc) {
                return scoreOne(inc, nowMs, knob);
            });

            // second pass: if HANDOFF_NOW/ABORT but oncall unavailable or capacity 0 -> HOLD_FOR_CAPACITY
            items.forEach(function (it) {
                if ((it.verdict === 'HANDOFF_NOW' || it.verdict === 'ASSIST_HUMAN_REVIEW') &&
                    (!oncallAvailable || capacityRemaining <= 0)) {
                    it.priorVerdict = it.verdict;
                    it.verdict = 'HOLD_FOR_CAPACITY';
                    it.priority = 'P2';
                    it.reasons.push({ code: 'NO_HUMAN_CAPACITY', label: 'on-call unavailable or queue at cap', weight: 50 });
                    it.recommendedAction = 'fall back to safe partial response while waiting for human capacity';
                    it.estRiskDelta = -8; // partial mitigation only
                    capacityExhaustedDuringNeed = true;
                } else if (it.verdict === 'HANDOFF_NOW' || it.verdict === 'ASSIST_HUMAN_REVIEW') {
                    capacityRemaining -= 1; // consume slot
                }
            });

            // sort reasons per item (weight desc, code asc) + dedupe
            items.forEach(function (it) {
                var seen = {};
                it.reasons = it.reasons.filter(function (r) {
                    if (seen[r.code]) return false; seen[r.code] = 1; return true;
                }).sort(function (a, b) {
                    if (b.weight !== a.weight) return b.weight - a.weight;
                    return a.code < b.code ? -1 : a.code > b.code ? 1 : 0;
                });
            });

            // portfolio rollup
            var totals = items.length;
            var byVerdict = {};
            items.forEach(function (it) { byVerdict[it.verdict] = (byVerdict[it.verdict] || 0) + 1; });
            var p0 = items.filter(function (it) { return it.priority === 'P0'; }).length;
            var p1 = items.filter(function (it) { return it.priority === 'P1'; }).length;
            var p2 = items.filter(function (it) { return it.priority === 'P2'; }).length;

            var avgRisk = totals ? items.reduce(function (s, it) { return s + it.riskScore; }, 0) / totals : 0;
            var escalationRisk = clamp(Math.round(avgRisk + knob.riskShift), 0, 100);

            // band
            var bandThresh = [20, 40, 60, 80].map(function (t) { return t + knob.bandShift; });
            var band;
            if (escalationRisk < bandThresh[0]) band = 'CALM';
            else if (escalationRisk < bandThresh[1]) band = 'WATCH';
            else if (escalationRisk < bandThresh[2]) band = 'ELEVATED';
            else if (escalationRisk < bandThresh[3]) band = 'HIGH';
            else band = 'CRITICAL';

            // grade
            var handoffCount = (byVerdict.HANDOFF_NOW || 0);
            var holdCount = (byVerdict.HOLD_FOR_CAPACITY || 0);
            var capacityCollapse = capacityExhaustedDuringNeed && holdCount > 0;
            var oncallMissingButNeeded = !oncallAvailable && (handoffCount > 0 || holdCount > 0);
            var grade;
            if (p0 >= 3 || oncallMissingButNeeded || capacityCollapse) grade = 'F';
            else if (escalationRisk >= 70 || p0 >= 1) grade = 'D';
            else if (escalationRisk >= 50 || p1 >= 2) grade = 'C';
            else if (escalationRisk >= 25 || p1 >= 1) grade = 'B';
            else grade = 'A';

            // playbook
            var playbook = buildPlaybook(items, oncall, appetiteKey, grade, escalationRisk);

            // insights
            var insights = buildInsights(items, oncall, capacityCollapse);

            var summary = 'VERDICT: ' + band + ' (grade ' + grade + ') - ' + totals + ' incidents, ' +
                p0 + ' P0, ' + p1 + ' P1, escalationRisk=' + escalationRisk;

            return {
                schemaVersion: 1,
                version: VERSION,
                generatedAt: new Date(nowMs).toISOString(),
                risk_appetite: appetiteKey,
                summary: summary,
                portfolio: {
                    totalIncidents: totals,
                    escalationRisk: escalationRisk,
                    band: band,
                    grade: grade,
                    p0Count: p0,
                    p1Count: p1,
                    p2Count: p2,
                    byVerdict: byVerdict,
                    oncallAvailable: oncallAvailable,
                    capacityRemaining: Math.max(0, capacityRemaining)
                },
                items: items,
                playbook: playbook,
                insights: insights,
                simulation: null
            };
        }

        // -------- scoring -------------------------------------------------
        function scoreOne(inc, nowMs, knob) {
            var id = inc.id || ('inc_' + Math.random().toString(36).slice(2, 8));
            var reasons = [];
            var hasCore = inc.status && (isNum(inc.confidence) || inc.errorClass) && (inc.startedAt || inc.lastUpdateAt);
            var missingFields = [];
            if (!inc.status) missingFields.push('status');
            if (!isNum(inc.confidence)) missingFields.push('confidence');
            if (!inc.startedAt && !inc.lastUpdateAt) missingFields.push('timestamp');

            if (missingFields.length >= 2) {
                return {
                    id: id, agentId: inc.agentId || null, taskId: inc.taskId || null,
                    verdict: 'INSUFFICIENT_DATA', priority: 'P3', riskScore: 0,
                    confidence: 30, reasons: [{ code: 'INSUFFICIENT_DATA', label: 'missing: ' + missingFields.join(','), weight: 100 }],
                    estRiskDelta: 0, recommendedAction: 'instrument missing telemetry before deciding',
                    suggestedValue: null
                };
            }

            var confidence = clamp(num(inc.confidence, 0.5), 0, 1);
            var blastRadius = clamp(num(inc.blastRadius, 1), 1, 5);
            var retries = num(inc.retries, 0);
            var maxRetries = Math.max(1, num(inc.maxRetries, 3));
            var autonomyLevel = clamp(num(inc.autonomyLevel, 3), 1, 5);
            var domain = inc.domain || 'general';
            var userWaiting = !!inc.userWaiting;
            var errorClass = inc.errorClass || null;
            var status = inc.status;

            var startedAtTs = toTs(inc.startedAt) || toTs(inc.lastUpdateAt);
            var lastUpdateTs = toTs(inc.lastUpdateAt) || startedAtTs;
            var ageMin = minutesBetween(nowMs, startedAtTs);
            var staleMin = minutesBetween(nowMs, lastUpdateTs);
            if (ageMin == null) ageMin = 0;
            if (staleMin == null) staleMin = 0;
            var slaMinutes = isNum(inc.slaMinutes) ? inc.slaMinutes : null;

            // ---- scoring components
            var risk = 0;

            var confGap = (1 - confidence) * 30;
            if (confGap > 1) { reasons.push({ code: 'LOW_CONFIDENCE', label: 'confidence ' + confidence.toFixed(2), weight: Math.round(confGap) }); risk += confGap; }

            var blastWeight = blastRadius * 5;
            if (blastRadius >= 3) { reasons.push({ code: 'HIGH_BLAST_RADIUS', label: 'blastRadius=' + blastRadius, weight: blastWeight }); risk += blastWeight; }

            if (slaMinutes != null) {
                if (ageMin >= slaMinutes) { reasons.push({ code: 'SLA_BREACH', label: 'age ' + Math.round(ageMin) + 'm >= SLA ' + slaMinutes + 'm', weight: 80 }); risk += 25; }
                else if (ageMin >= knob.slaPressureRatio * slaMinutes) { reasons.push({ code: 'SLA_PRESSURE', label: 'age ' + Math.round(ageMin) + 'm approaching SLA', weight: 55 }); risk += 15; }
            }

            if (userWaiting) { reasons.push({ code: 'USER_WAITING', label: 'user is actively waiting', weight: 40 }); risk += 10; }

            var retryRatio = retries / maxRetries;
            if (retryRatio > 0) {
                var retryW = retryRatio * 15;
                reasons.push({ code: 'RETRY_PRESSURE', label: retries + '/' + maxRetries + ' retries used', weight: Math.round(retryW + 20) });
                risk += retryW;
            }

            var forceHandoff = false, forceAbort = false;
            if (errorClass === 'safety' || errorClass === 'compliance') {
                reasons.push({ code: 'SAFETY_COMPLIANCE_ERROR', label: 'errorClass=' + errorClass, weight: 95 });
                risk += 35; forceHandoff = true;
            } else if (errorClass === 'permanent') {
                reasons.push({ code: 'PERMANENT_ERROR', label: 'errorClass=permanent', weight: 70 });
                risk += 20;
                if (userWaiting) forceAbort = true;
            } else if (errorClass === 'ambiguous') {
                reasons.push({ code: 'AMBIGUOUS_ERROR', label: 'errorClass=ambiguous', weight: 35 });
                risk += 10;
            } else if (errorClass === 'transient') {
                reasons.push({ code: 'TRANSIENT_ERROR', label: 'errorClass=transient', weight: 8 });
                risk += 2;
            }

            if (autonomyLevel <= 2 && blastRadius >= 3) {
                reasons.push({ code: 'LOW_AUTONOMY_HIGH_BLAST', label: 'autonomyLevel=' + autonomyLevel + ' blast=' + blastRadius, weight: 30 });
                risk += 8;
            }

            if (REGULATED_DOMAINS[domain]) {
                reasons.push({ code: 'REGULATED_DOMAIN', label: 'domain=' + domain, weight: 25 });
                risk += 5;
            }

            // stale: if no update in 2x SLA -> escalate
            if (slaMinutes != null && staleMin >= 2 * slaMinutes) {
                reasons.push({ code: 'STALE_UPDATE', label: Math.round(staleMin) + 'm since last update', weight: 50 });
                risk += 10;
            }

            risk = clamp(Math.round(risk * knob.riskMult), 0, 100);

            // ---- verdict ladder
            var verdict, priority, recAction, suggestedValue = null, estRiskDelta = -20;
            var slaBreached = reasons.some(function (r) { return r.code === 'SLA_BREACH'; });

            if (forceAbort) {
                verdict = 'ABORT_AND_REFUND'; priority = 'P0';
                recAction = 'abort task, trigger refund/rollback workflow, notify user';
                estRiskDelta = -45;
            } else if (forceHandoff) {
                verdict = 'HANDOFF_NOW'; priority = 'P0';
                recAction = 'page on-call - safety/compliance error requires human review';
                estRiskDelta = -40;
            } else if (slaBreached && (userWaiting || blastRadius >= 3)) {
                verdict = 'HANDOFF_NOW'; priority = 'P0';
                recAction = 'page on-call - SLA breached with user waiting';
                estRiskDelta = -35;
            } else if (blastRadius >= 4 && confidence < 0.5) {
                verdict = 'HANDOFF_NOW'; priority = 'P0';
                recAction = 'page on-call - high blast radius with low confidence';
                estRiskDelta = -35;
            } else if (userWaiting && retries >= maxRetries) {
                verdict = 'HANDOFF_NOW'; priority = 'P0';
                recAction = 'page on-call - user waiting, retries exhausted';
                estRiskDelta = -30;
            } else if (errorClass === 'ambiguous' || (confidence >= 0.4 && confidence < 0.7 && status !== 'completed')) {
                verdict = 'ASSIST_HUMAN_REVIEW'; priority = 'P1';
                recAction = 'queue for async human review (no immediate page)';
                estRiskDelta = -20;
            } else if (errorClass === 'transient' && retries < maxRetries && confidence >= 0.5) {
                verdict = 'AUTO_RETRY_WITH_BACKOFF'; priority = 'P2';
                recAction = 'retry with exponential backoff (attempt ' + (retries + 1) + '/' + maxRetries + ')';
                suggestedValue = Math.min(60, Math.pow(2, retries + 1));
                estRiskDelta = -10;
            } else if (status === 'failed' || status === 'escalated') {
                verdict = 'ASSIST_HUMAN_REVIEW'; priority = 'P1';
                recAction = 'queue for human review - status=' + status;
                estRiskDelta = -18;
            } else {
                verdict = 'CONTINUE_AUTONOMOUSLY'; priority = 'P3';
                recAction = 'continue without intervention';
                estRiskDelta = -2;
            }

            // confidence in decision
            var dconf = 60;
            if (status === 'failed' || status === 'escalated') dconf += 20;
            if (errorClass) dconf += 10;
            if (slaMinutes == null) dconf -= 15;
            dconf = clamp(dconf, 5, 100);

            return {
                id: id,
                agentId: inc.agentId || null,
                taskId: inc.taskId || null,
                verdict: verdict,
                priority: priority,
                riskScore: risk,
                confidence: dconf,
                reasons: reasons,
                estRiskDelta: estRiskDelta,
                recommendedAction: recAction,
                suggestedValue: suggestedValue,
                domain: domain,
                ageMinutes: Math.round(ageMin),
                staleMinutes: Math.round(staleMin),
                blastRadius: blastRadius,
                autonomyLevel: autonomyLevel
            };
        }

        // -------- playbook ------------------------------------------------
        function buildPlaybook(items, oncall, appetiteKey, grade, escalationRisk) {
            var pb = [];
            function ids(filter) { return items.filter(filter).map(function (it) { return it.id; }); }

            var handoffIds = ids(function (it) { return it.verdict === 'HANDOFF_NOW'; });
            var abortIds = ids(function (it) { return it.verdict === 'ABORT_AND_REFUND'; });
            var holdIds = ids(function (it) { return it.verdict === 'HOLD_FOR_CAPACITY'; });
            var reviewIds = ids(function (it) { return it.verdict === 'ASSIST_HUMAN_REVIEW'; });
            var retryIds = ids(function (it) { return it.verdict === 'AUTO_RETRY_WITH_BACKOFF'; });
            var insufficientIds = ids(function (it) { return it.verdict === 'INSUFFICIENT_DATA'; });
            var safetyIds = ids(function (it) {
                return it.reasons.some(function (r) { return r.code === 'SAFETY_COMPLIANCE_ERROR'; });
            });

            if (handoffIds.length) {
                pb.push({
                    id: 'PAGE_ONCALL_NOW', priority: 'P0', label: 'Page on-call now for ' + handoffIds.length + ' incident(s)',
                    reason: 'incidents flagged HANDOFF_NOW require immediate human attention',
                    owner: 'oncall', blastRadius: 4, reversibility: 'low',
                    incidentIds: handoffIds, estRiskDelta: -35, suggestedValue: null
                });
            }
            if (abortIds.length) {
                pb.push({
                    id: 'TRIGGER_ABORT_REFUND_WORKFLOW', priority: 'P0', label: 'Trigger abort+refund workflow',
                    reason: 'permanent error with user waiting - cut losses + refund',
                    owner: 'product', blastRadius: 5, reversibility: 'low',
                    incidentIds: abortIds, estRiskDelta: -40, suggestedValue: null
                });
            }
            if (handoffIds.length + abortIds.length >= 3 || safetyIds.length >= 2) {
                pb.push({
                    id: 'OPEN_INCIDENT_ROOM', priority: 'P0', label: 'Open incident room / war room',
                    reason: 'multi-incident escalation or safety/compliance cluster',
                    owner: 'incident_commander', blastRadius: 5, reversibility: 'medium',
                    incidentIds: handoffIds.concat(abortIds).concat(safetyIds), estRiskDelta: -25, suggestedValue: null
                });
            }
            if (holdIds.length) {
                pb.push({
                    id: 'EXPAND_ONCALL_CAPACITY', priority: 'P1', label: 'Expand on-call capacity / wake secondaries',
                    reason: holdIds.length + ' incident(s) parked because human capacity exhausted',
                    owner: 'ops', blastRadius: 3, reversibility: 'high',
                    incidentIds: holdIds, estRiskDelta: -20,
                    suggestedValue: Math.max(1, holdIds.length)
                });
            }
            if (reviewIds.length >= 2) {
                pb.push({
                    id: 'ROUTE_TO_REVIEW_QUEUE', priority: 'P1', label: 'Batch ' + reviewIds.length + ' incidents into async review queue',
                    reason: 'multiple ambiguous incidents - batch for async human triage',
                    owner: 'ops', blastRadius: 2, reversibility: 'high',
                    incidentIds: reviewIds, estRiskDelta: -15, suggestedValue: null
                });
            }

            // domain concentration in HANDOFF_NOW -> tighten autonomy
            var domainCount = {};
            items.forEach(function (it) {
                if (it.verdict !== 'HANDOFF_NOW') return;
                domainCount[it.domain] = (domainCount[it.domain] || []);
                domainCount[it.domain].push(it);
            });
            Object.keys(domainCount).forEach(function (d) {
                var rows = domainCount[d];
                if (rows.length >= 2) {
                    var avgAuto = Math.round(rows.reduce(function (s, r) { return s + r.autonomyLevel; }, 0) / rows.length);
                    pb.push({
                        id: 'TIGHTEN_AUTONOMY_FOR_DOMAIN', priority: 'P1',
                        label: 'Demote autonomy for domain=' + d,
                        reason: rows.length + ' HANDOFF_NOW incidents share domain=' + d,
                        owner: 'platform', blastRadius: 3, reversibility: 'high',
                        incidentIds: rows.map(function (r) { return r.id; }),
                        estRiskDelta: -18, suggestedValue: Math.max(1, avgAuto - 1)
                    });
                }
            });

            if (retryIds.length >= 3) {
                pb.push({
                    id: 'ENABLE_PROGRESSIVE_BACKOFF', priority: 'P2', label: 'Enable progressive backoff across retry queue',
                    reason: retryIds.length + ' transient retries in flight - protect downstreams',
                    owner: 'platform', blastRadius: 2, reversibility: 'high',
                    incidentIds: retryIds, estRiskDelta: -8, suggestedValue: null
                });
            }
            if (insufficientIds.length) {
                pb.push({
                    id: 'INSTRUMENT_MISSING_TELEMETRY', priority: 'P2', label: 'Instrument missing telemetry',
                    reason: insufficientIds.length + ' incident(s) lack core fields - cannot decide',
                    owner: 'platform', blastRadius: 1, reversibility: 'high',
                    incidentIds: insufficientIds, estRiskDelta: -5, suggestedValue: null
                });
            }

            // appetite trims/additions
            var hasHigher = pb.some(function (a) { return a.priority === 'P0' || a.priority === 'P1'; });
            if (appetiteKey === 'aggressive') {
                pb = pb.filter(function (a) {
                    if (a.priority === 'P3') return false;
                    if (a.priority === 'P2' && hasHigher) {
                        var p2Count = pb.filter(function (b) { return b.priority === 'P2'; }).length;
                        if (p2Count === 1) return false;
                    }
                    return true;
                });
            } else if (appetiteKey === 'cautious' && (grade === 'C' || grade === 'D' || grade === 'F')) {
                pb.push({
                    id: 'SCHEDULE_ESCALATION_REVIEW', priority: 'P2',
                    label: 'Schedule follow-up escalation review',
                    reason: 'grade ' + grade + ' with cautious appetite - add review cycle',
                    owner: 'ops', blastRadius: 1, reversibility: 'high',
                    incidentIds: [], estRiskDelta: -3, suggestedValue: null
                });
            }

            if (!pb.length) {
                pb.push({
                    id: 'MAINTAIN_OBSERVABILITY', priority: 'P3', label: 'Maintain observability - no action needed',
                    reason: 'no incidents require human escalation',
                    owner: 'platform', blastRadius: 1, reversibility: 'high',
                    incidentIds: [], estRiskDelta: 0, suggestedValue: null
                });
            }

            pb.sort(function (a, b) {
                if (PRIORITY_RANK[a.priority] !== PRIORITY_RANK[b.priority]) return PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
                return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
            });
            return pb;
        }

        function buildInsights(items, oncall, capacityCollapse) {
            var ins = [];
            var total = items.length;
            var nonP3 = items.filter(function (it) { return it.priority !== 'P3'; });
            var safety = items.filter(function (it) {
                return it.reasons.some(function (r) { return r.code === 'SAFETY_COMPLIANCE_ERROR'; });
            });
            if (safety.length >= 2) ins.push({ code: 'SAFETY_COMPLIANCE_CLUSTER', detail: safety.length + ' safety/compliance incidents' });

            var slaBreaches = items.filter(function (it) {
                return it.reasons.some(function (r) { return r.code === 'SLA_BREACH'; });
            });
            if (slaBreaches.length >= 2) ins.push({ code: 'SLA_BREACH_WAVE', detail: slaBreaches.length + ' SLA breaches in this window' });

            if (capacityCollapse) ins.push({ code: 'CAPACITY_COLLAPSE', detail: 'incidents need humans but on-call capacity is exhausted' });
            // recompute hold-with-handoff peer indicator for the original spec
            var hasHold = items.some(function (it) { return it.verdict === 'HOLD_FOR_CAPACITY'; });
            var hasHandoff = items.some(function (it) { return it.verdict === 'HANDOFF_NOW'; });
            if (hasHold && hasHandoff && !capacityCollapse) ins.push({ code: 'CAPACITY_COLLAPSE', detail: 'hold + handoff peers detected' });

            // domain concentration
            if (nonP3.length >= 2) {
                var dom = {};
                nonP3.forEach(function (it) { dom[it.domain] = (dom[it.domain] || 0) + 1; });
                var topD = null, topC = 0;
                Object.keys(dom).forEach(function (d) { if (dom[d] > topC) { topC = dom[d]; topD = d; } });
                if (topC / nonP3.length >= 0.5 && topC >= 2) {
                    ins.push({ code: 'DOMAIN_CONCENTRATION', detail: topC + '/' + nonP3.length + ' non-routine incidents in domain=' + topD });
                }
            }

            var handoffs = items.filter(function (it) { return it.verdict === 'HANDOFF_NOW'; });
            if (handoffs.length) {
                var avgAuto = handoffs.reduce(function (s, h) { return s + h.autonomyLevel; }, 0) / handoffs.length;
                if (avgAuto >= 4) ins.push({ code: 'AUTONOMY_TOO_HIGH', detail: 'HANDOFF_NOW incidents averaging autonomy=' + avgAuto.toFixed(1) });
            }

            var hasP0orP1 = items.some(function (it) { return it.priority === 'P0' || it.priority === 'P1'; });
            if (total > 0 && !hasP0orP1) ins.push({ code: 'HEALTHY_FLEET', detail: 'no incidents require human escalation' });
            if (total === 0) ins.push({ code: 'EMPTY_FLEET', detail: 'no incidents supplied' });

            return ins;
        }

        // -------- simulate ------------------------------------------------
        function simulate(opts2, report) {
            opts2 = opts2 || {}; if (!report) throw new Error('simulate requires a report');
            var applyTop = isNum(opts2.applyTop) ? opts2.applyTop : report.playbook.length;
            applyTop = Math.min(applyTop, report.playbook.length);

            var base = report.portfolio.escalationRisk;
            var totalDelta = 0;
            var applied = [];
            for (var i = 0; i < applyTop; i++) {
                var a = report.playbook[i];
                var w = Math.pow(0.85, i);
                var delta = num(a.estRiskDelta, 0) * w;
                totalDelta += delta;
                applied.push({ id: a.id, priority: a.priority, appliedDelta: Math.round(delta * 10) / 10 });
            }
            var projectedRisk = clamp(Math.round(base + totalDelta), 0, 100);
            var knob = APPETITE[report.risk_appetite] || APPETITE.balanced;
            var bandThresh = [20, 40, 60, 80].map(function (t) { return t + knob.bandShift; });
            var projBand;
            if (projectedRisk < bandThresh[0]) projBand = 'CALM';
            else if (projectedRisk < bandThresh[1]) projBand = 'WATCH';
            else if (projectedRisk < bandThresh[2]) projBand = 'ELEVATED';
            else if (projectedRisk < bandThresh[3]) projBand = 'HIGH';
            else projBand = 'CRITICAL';

            var projGrade;
            if (projectedRisk >= 80) projGrade = 'F';
            else if (projectedRisk >= 60) projGrade = 'D';
            else if (projectedRisk >= 40) projGrade = 'C';
            else if (projectedRisk >= 20) projGrade = 'B';
            else projGrade = 'A';

            return {
                baselineRisk: base,
                projectedRisk: projectedRisk,
                projectedBand: projBand,
                projectedGrade: projGrade,
                appliedActions: applied
            };
        }

        // -------- renderers -----------------------------------------------
        function formatText(report) {
            var L = [];
            L.push('AgentEscalationAdvisor v' + VERSION);
            L.push('Generated: ' + report.generatedAt + ' (appetite=' + report.risk_appetite + ')');
            L.push(report.summary);
            L.push('Portfolio:');
            L.push('  total=' + report.portfolio.totalIncidents +
                '  risk=' + report.portfolio.escalationRisk +
                '  band=' + report.portfolio.band +
                '  grade=' + report.portfolio.grade);
            L.push('  P0=' + report.portfolio.p0Count + '  P1=' + report.portfolio.p1Count + '  P2=' + report.portfolio.p2Count);
            L.push('  oncallAvailable=' + report.portfolio.oncallAvailable + '  capacityRemaining=' + report.portfolio.capacityRemaining);
            L.push('Top incidents:');
            report.items.slice(0, 10).forEach(function (it) {
                L.push('  [' + it.priority + '] ' + it.id + ' verdict=' + it.verdict + ' risk=' + it.riskScore + ' -> ' + it.recommendedAction);
            });
            L.push('Playbook:');
            report.playbook.forEach(function (a) {
                L.push('  ' + a.priority + ' ' + a.id + ' (' + a.owner + ') - ' + a.label);
            });
            if (report.insights.length) {
                L.push('Insights:');
                report.insights.forEach(function (i) { L.push('  - ' + i.code + ': ' + i.detail); });
            }
            return L.join('\n');
        }

        function formatMarkdown(report) {
            var L = [];
            L.push('# Agent Escalation Advisor Report');
            L.push('');
            L.push('- Generated: `' + report.generatedAt + '`');
            L.push('- Risk appetite: **' + report.risk_appetite + '**');
            L.push('');
            L.push('## Summary');
            L.push('');
            L.push(report.summary);
            L.push('');
            L.push('| Metric | Value |');
            L.push('|---|---|');
            L.push('| Total incidents | ' + report.portfolio.totalIncidents + ' |');
            L.push('| Escalation risk | ' + report.portfolio.escalationRisk + ' |');
            L.push('| Band | ' + report.portfolio.band + ' |');
            L.push('| Grade | **' + report.portfolio.grade + '** |');
            L.push('| P0 / P1 / P2 | ' + report.portfolio.p0Count + ' / ' + report.portfolio.p1Count + ' / ' + report.portfolio.p2Count + ' |');
            L.push('| On-call available | ' + report.portfolio.oncallAvailable + ' |');
            L.push('| Capacity remaining | ' + report.portfolio.capacityRemaining + ' |');
            L.push('');
            L.push('## Incidents');
            L.push('');
            L.push('| ID | Verdict | Priority | Risk | Recommended Action |');
            L.push('|---|---|---|---|---|');
            report.items.forEach(function (it) {
                L.push('| ' + it.id + ' | ' + it.verdict + ' | ' + it.priority + ' | ' + it.riskScore + ' | ' + it.recommendedAction + ' |');
            });
            L.push('');
            L.push('## Playbook');
            L.push('');
            L.push('| Priority | ID | Owner | Label | Blast |');
            L.push('|---|---|---|---|---|');
            report.playbook.forEach(function (a) {
                L.push('| ' + a.priority + ' | ' + a.id + ' | ' + a.owner + ' | ' + a.label + ' | ' + a.blastRadius + ' |');
            });
            L.push('');
            L.push('## Insights');
            L.push('');
            if (report.insights.length) {
                report.insights.forEach(function (i) { L.push('- **' + i.code + '** - ' + i.detail); });
            } else {
                L.push('_no portfolio-level insights this cycle_');
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
            formatText: formatText,
            formatMarkdown: formatMarkdown,
            formatJson: formatJson
        };
    }

    return {
        version: VERSION,
        createAgentEscalationAdvisor: createAgentEscalationAdvisor
    };
}));
