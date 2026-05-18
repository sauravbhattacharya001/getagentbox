/**
 * AgentTaskDependencyAdvisor - 9th agentic-advisor sibling.
 *
 * Cross-task dependency / blocker triage for an agent-managed task graph.
 * Detects cycles, deep critical paths, stale-blocker chains, orphan
 * dependencies, deadline conflicts and high fan-out bottlenecks; emits
 * per-task verdicts + a portfolio playbook so operators (or a planning
 * agent) can decide what to unblock first.
 *
 * Sibling to:
 *   AgentTriageAdvisor, AgentRolloutPlanner, AgentDriftDetector,
 *   AgentToolPolicyAdvisor, AgentBudgetGuardianAdvisor,
 *   AgentAutonomyTuningAdvisor, AgentMemoryHygieneAdvisor,
 *   AgentEscalationAdvisor.
 *
 * Pure JS, zero deps, UMD wrapper, deterministic given injectable now().
 * Never mutates input.
 */
(function (root, factory) {
    'use strict';
    if (typeof module === 'object' && module.exports) {
        module.exports = factory();
    } else {
        root.AgentTaskDependencyAdvisor = factory();
    }
}(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    var VERSION = '1.0.0';

    var APPETITE = {
        cautious:   { riskMult: 1.15, bandShift: -5 },
        balanced:   { riskMult: 1.00, bandShift:  0 },
        aggressive: { riskMult: 0.85, bandShift:  5 }
    };

    var DAY = 24 * 60 * 60 * 1000;

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

    function createAgentTaskDependencyAdvisor(opts) {
        opts = opts || {};
        var nowFn = typeof opts.now === 'function' ? opts.now : function () { return new Date(); };

        function analyze(tasksIn, options) {
            options = options || {};
            var nowMs = (nowFn() instanceof Date ? nowFn() : new Date(nowFn())).getTime();

            var tasks = asArr(tasksIn).map(deepCopy);
            var appetiteKey = options.risk_appetite || 'balanced';
            if (!APPETITE[appetiteKey]) appetiteKey = 'balanced';
            var knob = APPETITE[appetiteKey];
            var ownerAvail = options.ownerAvailability || {};

            // Normalize tasks
            tasks.forEach(function (t) {
                if (!t.id) t.id = 'task_' + Math.random().toString(36).slice(2, 8);
                t.dependsOn = asArr(t.dependsOn);
                t.priority = clamp(num(t.priority, 3), 1, 5);
                t.status = t.status || 'pending';
            });

            var byId = {};
            tasks.forEach(function (t) { byId[t.id] = t; });

            // -- fan-out and missing deps
            var fanOut = {};
            var missingDeps = {};
            tasks.forEach(function (t) {
                t.dependsOn.forEach(function (depId) {
                    if (!byId[depId]) {
                        missingDeps[t.id] = missingDeps[t.id] || [];
                        missingDeps[t.id].push(depId);
                    } else {
                        fanOut[depId] = (fanOut[depId] || 0) + 1;
                    }
                });
            });

            // -- cycle detection (DFS, only over real deps)
            var color = {};
            var cycles = [];
            var cycleMembers = {};
            function dfs(id, stack) {
                if (color[id] === 'gray') {
                    var idx = stack.indexOf(id);
                    if (idx >= 0) {
                        var cyc = stack.slice(idx).concat(id);
                        cycles.push(cyc);
                        cyc.forEach(function (n) { cycleMembers[n] = 1; });
                    }
                    return;
                }
                if (color[id] === 'black') return;
                color[id] = 'gray';
                stack.push(id);
                var t = byId[id];
                if (t) t.dependsOn.forEach(function (d) { if (byId[d]) dfs(d, stack); });
                stack.pop();
                color[id] = 'black';
            }
            tasks.forEach(function (t) { if (!color[t.id]) dfs(t.id, []); });

            // -- depth & critical path length (longest dep chain) via memoized DFS,
            //    skipping cycle members to avoid infinite recursion
            var depthMemo = {};
            function depth(id, seen) {
                if (cycleMembers[id]) return 0;
                if (depthMemo[id] != null) return depthMemo[id];
                seen = seen || {};
                if (seen[id]) return 0;
                seen[id] = 1;
                var t = byId[id];
                if (!t || t.dependsOn.length === 0) { depthMemo[id] = 1; return 1; }
                var best = 0;
                t.dependsOn.forEach(function (d) {
                    if (!byId[d]) return;
                    var dd = depth(d, seen);
                    if (dd > best) best = dd;
                });
                seen[id] = 0;
                depthMemo[id] = best + 1;
                return depthMemo[id];
            }
            tasks.forEach(function (t) { depth(t.id); });
            var criticalPathLength = 0;
            tasks.forEach(function (t) {
                var d = depthMemo[t.id] || 0;
                if (d > criticalPathLength) criticalPathLength = d;
            });

            // -- find a representative critical-path member list (one path of max depth)
            var criticalPathIds = [];
            (function () {
                if (criticalPathLength === 0) return;
                var startId = null;
                tasks.forEach(function (t) {
                    if (depthMemo[t.id] === criticalPathLength) { if (startId == null || t.id < startId) startId = t.id; }
                });
                var cur = startId;
                while (cur) {
                    criticalPathIds.push(cur);
                    var t = byId[cur];
                    if (!t || !t.dependsOn.length) break;
                    var next = null, nextDepth = -1;
                    t.dependsOn.forEach(function (d) {
                        if (!byId[d] || cycleMembers[d]) return;
                        var dd = depthMemo[d] || 0;
                        if (dd > nextDepth) { nextDepth = dd; next = d; }
                    });
                    if (!next || criticalPathIds.indexOf(next) >= 0) break;
                    cur = next;
                }
            })();
            var criticalPathSet = {};
            criticalPathIds.forEach(function (id) { criticalPathSet[id] = 1; });

            // -- parallelizable siblings: tasks with identical sorted dep-set
            var sigGroups = {};
            tasks.forEach(function (t) {
                if (t.status === 'done') return;
                if (t.dependsOn.length === 0) return;
                var sig = t.dependsOn.slice().sort().join('|');
                sigGroups[sig] = sigGroups[sig] || [];
                sigGroups[sig].push(t.id);
            });

            // -- score & verdict per task
            var items = tasks.map(function (t) {
                return scoreOne(t, byId, nowMs, knob, {
                    fanOut: fanOut, missingDeps: missingDeps, cycleMembers: cycleMembers,
                    depthMemo: depthMemo, criticalPathSet: criticalPathSet, sigGroups: sigGroups,
                    ownerAvail: ownerAvail
                });
            });

            // dedupe + sort reasons (weight desc, code asc)
            items.forEach(function (it) {
                var seen = {};
                it.reasons = it.reasons.filter(function (r) {
                    if (seen[r.code]) return false; seen[r.code] = 1; return true;
                }).sort(function (a, b) {
                    if (b.weight !== a.weight) return b.weight - a.weight;
                    return a.code < b.code ? -1 : a.code > b.code ? 1 : 0;
                });
            });

            // sort items by priority asc then risk desc then id asc
            items.sort(function (a, b) {
                var pa = prio(a.priority), pb = prio(b.priority);
                if (pa !== pb) return pa - pb;
                if (b.blockerRiskScore !== a.blockerRiskScore) return b.blockerRiskScore - a.blockerRiskScore;
                return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
            });

            // portfolio
            var totals = items.length;
            var byVerdict = {};
            items.forEach(function (it) { byVerdict[it.verdict] = (byVerdict[it.verdict] || 0) + 1; });
            var p0 = items.filter(function (it) { return it.priority === 'P0'; }).length;
            var p1 = items.filter(function (it) { return it.priority === 'P1'; }).length;
            var p2 = items.filter(function (it) { return it.priority === 'P2'; }).length;

            var readyCount = items.filter(function (it) { return it.verdict === 'READY_TO_START' || it.verdict === 'PARALLELIZE'; }).length;
            var blockedCount = items.filter(function (it) { return it.verdict === 'WAIT_ON_BLOCKER' || it.verdict === 'UNBLOCK_NOW' || it.verdict === 'BREAK_CYCLE'; }).length;

            var sumRisk = items.reduce(function (s, it) { return s + it.blockerRiskScore; }, 0);
            var avgBlockerRiskScore = totals ? Math.round(sumRisk / totals) : 0;

            // projected completion days = sum of estimatedDuration (hours) along critical path / 8
            var projectedHours = 0;
            criticalPathIds.forEach(function (id) {
                var t = byId[id];
                projectedHours += num(t && t.estimatedDuration, 4);
            });
            var projectedCompletionDays = Math.round((projectedHours / 8) * 10) / 10;

            // band
            var bandThresh = [20, 40, 60, 80].map(function (t) { return t + knob.bandShift; });
            var band;
            var r = avgBlockerRiskScore;
            if (r < bandThresh[0]) band = 'CALM';
            else if (r < bandThresh[1]) band = 'WATCH';
            else if (r < bandThresh[2]) band = 'ELEVATED';
            else if (r < bandThresh[3]) band = 'HIGH';
            else band = 'CRITICAL';

            // grade
            var grade;
            if (cycles.length > 0 || criticalPathLength >= 10 || avgBlockerRiskScore >= 70) grade = 'F';
            else if (avgBlockerRiskScore >= 55) grade = 'D';
            else if (avgBlockerRiskScore >= 35) grade = 'C';
            else if (avgBlockerRiskScore >= 18) grade = 'B';
            else grade = 'A';

            // playbook + insights
            var playbook = buildPlaybook(items, {
                cycles: cycles, criticalPathLength: criticalPathLength, criticalPathIds: criticalPathIds,
                readyCount: readyCount, appetiteKey: appetiteKey, grade: grade
            });
            var insights = buildInsights(items, {
                cycles: cycles, criticalPathLength: criticalPathLength, fanOut: fanOut,
                tasks: tasks, readyCount: readyCount, ownerAvail: ownerAvail
            });

            var summary = 'VERDICT: ' + band + ' (grade ' + grade + ') - ' + totals + ' tasks, ' +
                p0 + ' P0, ' + p1 + ' P1, criticalPath=' + criticalPathLength + ', readyCount=' + readyCount +
                ', avgRisk=' + avgBlockerRiskScore;

            return {
                schemaVersion: 1,
                version: VERSION,
                generatedAt: new Date(nowMs).toISOString(),
                risk_appetite: appetiteKey,
                summary: summary,
                portfolio: {
                    totalTasks: totals,
                    readyCount: readyCount,
                    blockedCount: blockedCount,
                    cycleCount: cycles.length,
                    criticalPathLength: criticalPathLength,
                    criticalPathIds: criticalPathIds,
                    projectedCompletionDays: projectedCompletionDays,
                    avgBlockerRiskScore: avgBlockerRiskScore,
                    band: band,
                    grade: grade,
                    p0Count: p0,
                    p1Count: p1,
                    p2Count: p2,
                    byVerdict: byVerdict
                },
                items: items,
                playbook: playbook,
                insights: insights,
                simulation: null
            };
        }

        function prio(p) { return p === 'P0' ? 0 : p === 'P1' ? 1 : p === 'P2' ? 2 : 3; }

        // -------- scoring -------------------------------------------------
        function scoreOne(t, byId, nowMs, knob, ctx) {
            var reasons = [];
            var risk = 0;
            var verdict, priority, recommendedAction;

            var depthVal = ctx.depthMemo[t.id] || 1;
            var fan = ctx.fanOut[t.id] || 0;
            var blockedSinceTs = toTs(t.blockedSince);
            var dueTs = toTs(t.dueDate);
            var daysBlocked = blockedSinceTs ? Math.max(0, (nowMs - blockedSinceTs) / DAY) : 0;
            var hoursToDue = dueTs ? (dueTs - nowMs) / (60 * 60 * 1000) : null;

            // unresolved deps
            var unmetDeps = t.dependsOn.filter(function (d) {
                return byId[d] && byId[d].status !== 'done';
            });
            var missing = (ctx.missingDeps[t.id] || []);

            // CYCLE membership
            if (ctx.cycleMembers[t.id]) {
                reasons.push({ code: 'CYCLE_MEMBER', label: 'part of a dependency cycle', weight: 100 });
                risk += 70;
                verdict = 'BREAK_CYCLE';
                priority = 'P0';
                recommendedAction = 'remove or invert one edge to break the cycle';
            }

            // MISSING_DEPENDENCY
            if (missing.length > 0) {
                reasons.push({
                    code: 'MISSING_DEPENDENCY',
                    label: 'depends on unknown task(s): ' + missing.join(','),
                    weight: 85
                });
                risk += 40;
            }

            // DEADLINE_CONFLICT: this task's dueDate is before any blocker's dueDate
            var hasDeadlineConflict = false;
            if (dueTs) {
                t.dependsOn.forEach(function (d) {
                    var dep = byId[d];
                    if (!dep) return;
                    var depDue = toTs(dep.dueDate);
                    if (depDue && depDue > dueTs) hasDeadlineConflict = true;
                });
            }
            if (hasDeadlineConflict) {
                reasons.push({ code: 'DEADLINE_CONFLICT', label: 'due before blocker due date', weight: 75 });
                risk += 25;
            }

            // STALE_BLOCKER
            if (daysBlocked >= 14) {
                reasons.push({
                    code: 'STALE_BLOCKER',
                    label: 'blocked for ' + Math.round(daysBlocked) + ' days',
                    weight: 60 + Math.min(20, Math.round(daysBlocked / 4))
                });
                risk += 20;
            }

            // ARCHIVE_STALE check (>60d AND priority<=2)
            var canArchive = (daysBlocked >= 60 && t.priority <= 2);

            // HIGH_FAN_OUT
            if (fan >= 5) {
                reasons.push({ code: 'HIGH_FAN_OUT', label: 'blocks ' + fan + ' downstream tasks', weight: 70 });
                risk += 20;
            } else if (fan >= 3) {
                reasons.push({ code: 'HIGH_FAN_OUT', label: 'blocks ' + fan + ' downstream tasks', weight: 45 });
                risk += 10;
            }

            // DEEP_CRITICAL_PATH
            if (ctx.criticalPathSet[t.id] && depthVal >= 5) {
                reasons.push({ code: 'DEEP_CRITICAL_PATH', label: 'depth ' + depthVal + ' on critical path', weight: 55 });
                risk += 15;
            }

            // deadline-pressure
            if (hoursToDue != null) {
                if (hoursToDue <= 24 && hoursToDue >= 0 && unmetDeps.length > 0) {
                    reasons.push({ code: 'DEADLINE_PRESSURE', label: 'due in <=24h with open blockers', weight: 80 });
                    risk += 25;
                } else if (hoursToDue < 0) {
                    reasons.push({ code: 'OVERDUE', label: 'past due date', weight: 65 });
                    risk += 15;
                }
            }

            // OWNED_BY_UNAVAILABLE
            if (t.owner && ctx.ownerAvail[t.owner] === false) {
                reasons.push({ code: 'OWNED_BY_UNAVAILABLE', label: 'owner ' + t.owner + ' is unavailable', weight: 55 });
                risk += 10;
            }

            // PRIORITY weight
            if (t.priority >= 4) {
                reasons.push({ code: 'HIGH_PRIORITY', label: 'priority=' + t.priority, weight: 30 });
                risk += 5;
            }

            // priority modulation
            var priorityFactor = 0.8 + (t.priority - 3) * 0.05;
            risk = risk * priorityFactor;

            // verdict ladder (cycle already set verdict above)
            if (!verdict) {
                if (canArchive) {
                    verdict = 'ARCHIVE_STALE';
                    priority = 'P2';
                    recommendedAction = 'archive: low-priority and stale ' + Math.round(daysBlocked) + 'd';
                    risk = Math.max(risk, 35);
                } else if (t.status === 'done') {
                    verdict = 'CONTINUE';
                    priority = 'P3';
                    recommendedAction = 'completed; no action';
                } else if (missing.length > 0) {
                    verdict = 'UNBLOCK_NOW';
                    priority = 'P1';
                    recommendedAction = 'repair missing dependency reference(s)';
                } else if (hasDeadlineConflict) {
                    verdict = 'RESCHEDULE';
                    priority = 'P1';
                    recommendedAction = 'push due date past blocker due date';
                } else if (unmetDeps.length === 0 && t.dependsOn.length === 0) {
                    verdict = 'READY_TO_START';
                    priority = 'P2';
                    recommendedAction = 'kick off: no blockers';
                } else if (unmetDeps.length === 0) {
                    // all real deps satisfied
                    verdict = 'READY_TO_START';
                    priority = 'P2';
                    recommendedAction = 'kick off: all dependencies satisfied';
                    reasons.push({ code: 'READY_NO_BLOCKERS', label: 'all dependencies satisfied', weight: 20 });
                } else {
                    // waiting on blockers
                    // Check if parallelizable
                    var sig = t.dependsOn.slice().sort().join('|');
                    var siblings = ctx.sigGroups[sig] || [];
                    if (siblings.length >= 2) {
                        var others = siblings.filter(function (id) { return id !== t.id; });
                        verdict = 'PARALLELIZE';
                        priority = 'P2';
                        recommendedAction = 'run in parallel with ' + others.join(',');
                        reasons.push({
                            code: 'PARALLELIZABLE_WITH_' + others[0],
                            label: 'shares dep-set with ' + others.join(','),
                            weight: 25
                        });
                    } else {
                        verdict = 'WAIT_ON_BLOCKER';
                        priority = 'P3';
                        recommendedAction = 'wait on: ' + unmetDeps.join(',');
                        unmetDeps.forEach(function (d) {
                            reasons.push({
                                code: 'WAITING_ON_' + d,
                                label: 'waiting on ' + d,
                                weight: 25
                            });
                        });
                    }
                }
            }

            // final priority bump based on score
            risk = clamp(Math.round(risk * knob.riskMult), 0, 100);
            if (verdict !== 'BREAK_CYCLE') {
                if (risk >= 75 || (hoursToDue != null && hoursToDue <= 24 && hoursToDue >= 0 && unmetDeps.length > 0)) priority = 'P0';
                else if (risk >= 55) priority = (prio(priority) > 1 ? 'P1' : priority);
                else if (risk >= 30) priority = (prio(priority) > 2 ? 'P2' : priority);
            }

            return {
                id: t.id,
                status: t.status,
                owner: t.owner || null,
                verdict: verdict,
                priority: priority,
                blockerRiskScore: risk,
                depth: depthVal,
                fanOut: fan,
                recommendedAction: recommendedAction,
                reasons: reasons,
                estRiskDelta: 0
            };
        }

        // -------- playbook ------------------------------------------------
        function buildPlaybook(items, ctx) {
            var actions = [];
            var byVerdict = {};
            items.forEach(function (it) {
                byVerdict[it.verdict] = byVerdict[it.verdict] || [];
                byVerdict[it.verdict].push(it.id);
            });
            function has(v, n) { return (byVerdict[v] || []).length >= (n || 1); }
            function ids(v) { return (byVerdict[v] || []).slice(0, 5); }

            if (ctx.cycles.length > 0) {
                var cycleIds = [];
                ctx.cycles.forEach(function (c) { c.forEach(function (id) { if (cycleIds.indexOf(id) < 0) cycleIds.push(id); }); });
                actions.push({
                    id: 'BREAK_DEPENDENCY_CYCLE', priority: 'P0', owner: 'architecture',
                    label: 'Break dependency cycle(s): ' + cycleIds.join(','),
                    reason: 'cycle prevents any task from progressing',
                    blastRadius: 5, reversibility: 'medium',
                    relatedTaskIds: cycleIds, estRiskDelta: 0.40
                });
            }
            if (ctx.readyCount >= 3) {
                var readyIds = (byVerdict.READY_TO_START || []).concat(byVerdict.PARALLELIZE || []).slice(0, 5);
                actions.push({
                    id: 'PARALLEL_KICKOFF_READY', priority: 'P0', owner: 'ops',
                    label: 'Kick off ' + ctx.readyCount + ' ready tasks in parallel',
                    reason: 'tasks have no remaining blockers',
                    blastRadius: 3, reversibility: 'high',
                    relatedTaskIds: readyIds, estRiskDelta: 0.20
                });
            }
            if (ctx.criticalPathIds.length >= 3) {
                actions.push({
                    id: 'UNBLOCK_CRITICAL_PATH', priority: 'P0', owner: 'product',
                    label: 'Unblock top-3 critical-path tasks',
                    reason: 'critical path length=' + ctx.criticalPathLength,
                    blastRadius: 4, reversibility: 'medium',
                    relatedTaskIds: ctx.criticalPathIds.slice(0, 3), estRiskDelta: 0.30
                });
            }
            if (has('UNBLOCK_NOW')) {
                actions.push({
                    id: 'REPAIR_MISSING_DEPS', priority: 'P1', owner: 'engineering',
                    label: 'Repair missing dependency references',
                    reason: 'tasks reference unknown ids',
                    blastRadius: 2, reversibility: 'high',
                    relatedTaskIds: ids('UNBLOCK_NOW'), estRiskDelta: 0.15
                });
            }
            // STALE_BLOCKER reason scan (across items, not verdict)
            var staleIds = items.filter(function (it) {
                return it.reasons.some(function (r) { return r.code === 'STALE_BLOCKER'; });
            }).map(function (it) { return it.id; });
            if (staleIds.length >= 2) {
                actions.push({
                    id: 'REASSIGN_STALE_BLOCKERS', priority: 'P1', owner: 'ops',
                    label: 'Reassign ' + staleIds.length + ' stale-blocker tasks',
                    reason: 'tasks blocked >=14 days',
                    blastRadius: 3, reversibility: 'high',
                    relatedTaskIds: staleIds.slice(0, 5), estRiskDelta: 0.18
                });
            }
            if (has('RESCHEDULE')) {
                actions.push({
                    id: 'RESCHEDULE_DEADLINE_CONFLICTS', priority: 'P1', owner: 'product',
                    label: 'Reschedule tasks with deadline conflicts',
                    reason: 'task due before its blocker(s)',
                    blastRadius: 3, reversibility: 'high',
                    relatedTaskIds: ids('RESCHEDULE'), estRiskDelta: 0.12
                });
            }
            if (ctx.criticalPathLength >= 8) {
                actions.push({
                    id: 'SPLIT_DEEP_CHAIN', priority: 'P1', owner: 'architecture',
                    label: 'Split deep dependency chain (length ' + ctx.criticalPathLength + ')',
                    reason: 'long serial chain blocks throughput',
                    blastRadius: 3, reversibility: 'medium',
                    relatedTaskIds: ctx.criticalPathIds.slice(0, 5), estRiskDelta: 0.10
                });
            }
            if (has('ARCHIVE_STALE', 3)) {
                actions.push({
                    id: 'ARCHIVE_STALE_TASKS', priority: 'P2', owner: 'ops',
                    label: 'Archive ' + (byVerdict.ARCHIVE_STALE || []).length + ' stale low-priority tasks',
                    reason: 'blocked >=60d and priority<=2',
                    blastRadius: 2, reversibility: 'high',
                    relatedTaskIds: ids('ARCHIVE_STALE'), estRiskDelta: 0.08
                });
            }
            var ownerGapIds = items.filter(function (it) {
                return it.reasons.some(function (r) { return r.code === 'OWNED_BY_UNAVAILABLE'; });
            }).map(function (it) { return it.id; });
            if (ownerGapIds.length >= 2) {
                actions.push({
                    id: 'REVIEW_OWNERSHIP_GAPS', priority: 'P2', owner: 'ops',
                    label: 'Review ' + ownerGapIds.length + ' tasks with unavailable owners',
                    reason: 'owner availability gap',
                    blastRadius: 2, reversibility: 'high',
                    relatedTaskIds: ownerGapIds.slice(0, 5), estRiskDelta: 0.06
                });
            }
            if (actions.length === 0) {
                actions.push({
                    id: 'PIPELINE_HEALTHY', priority: 'P3', owner: 'ops',
                    label: 'Pipeline is healthy; maintain observation',
                    reason: 'no P0/P1/P2 dependency signals',
                    blastRadius: 1, reversibility: 'high',
                    relatedTaskIds: [], estRiskDelta: 0
                });
            }

            // appetite
            if (ctx.appetiteKey === 'cautious' && (ctx.grade === 'C' || ctx.grade === 'D' || ctx.grade === 'F')) {
                actions.push({
                    id: 'SCHEDULE_DEPENDENCY_AUDIT', priority: 'P2', owner: 'ops',
                    label: 'Schedule a full dependency-graph audit',
                    reason: 'cautious appetite + grade ' + ctx.grade,
                    blastRadius: 1, reversibility: 'high',
                    relatedTaskIds: [], estRiskDelta: 0.03
                });
            }
            if (ctx.appetiteKey === 'aggressive') {
                var hasP0P1 = actions.some(function (a) { return a.priority === 'P0' || a.priority === 'P1'; });
                actions = actions.filter(function (a) {
                    if (a.priority === 'P3' && hasP0P1) return false;
                    if (a.priority === 'P2' && hasP0P1) {
                        var p2count = actions.filter(function (x) { return x.priority === 'P2'; }).length;
                        if (p2count <= 1) return false;
                    }
                    return true;
                });
            }

            // dedupe + sort
            var seen = {};
            actions = actions.filter(function (a) {
                if (seen[a.id]) return false; seen[a.id] = 1; return true;
            }).sort(function (a, b) {
                var pa = prio(a.priority), pb = prio(b.priority);
                if (pa !== pb) return pa - pb;
                return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
            });

            return actions;
        }

        // -------- insights ------------------------------------------------
        function buildInsights(items, ctx) {
            var out = [];
            if (ctx.tasks.length === 0) {
                out.push({ code: 'EMPTY_PIPELINE', detail: 'no tasks in pipeline' });
                return out;
            }
            if (ctx.cycles.length > 0) {
                out.push({ code: 'DEADLOCK_RISK', detail: ctx.cycles.length + ' dependency cycle(s) detected' });
            }
            if (ctx.criticalPathLength >= 8) {
                out.push({ code: 'DEEP_CRITICAL_PATH', detail: 'critical path length ' + ctx.criticalPathLength });
            }
            var bottleneck = Object.keys(ctx.fanOut).filter(function (id) { return ctx.fanOut[id] >= 5; });
            if (bottleneck.length) {
                out.push({ code: 'FAN_OUT_BOTTLENECK', detail: 'bottleneck task(s): ' + bottleneck.join(',') });
            }
            var deadlineConflictCount = items.filter(function (it) {
                return it.reasons.some(function (r) { return r.code === 'DEADLINE_CONFLICT' || r.code === 'DEADLINE_PRESSURE'; });
            }).length;
            if (deadlineConflictCount >= 2) {
                out.push({ code: 'DEADLINE_CASCADE_RISK', detail: deadlineConflictCount + ' deadline conflicts/pressure' });
            }
            var ownerStarvedCount = items.filter(function (it) {
                return it.reasons.some(function (r) { return r.code === 'OWNED_BY_UNAVAILABLE'; });
            }).length;
            if (ownerStarvedCount >= 1) {
                out.push({ code: 'STARVED_OWNERS', detail: ownerStarvedCount + ' tasks owned by unavailable people' });
            }
            if (ctx.readyCount >= 3) {
                out.push({ code: 'READY_BACKLOG', detail: ctx.readyCount + ' tasks ready to start' });
            }
            if (out.length === 0) {
                out.push({ code: 'HEALTHY_PIPELINE', detail: 'no portfolio-level dependency signals' });
            }
            return out;
        }

        // -------- simulate ------------------------------------------------
        function simulate(opts2, report) {
            opts2 = opts2 || {};
            report = report || {};
            var top = Math.max(1, num(opts2.applyTop, 3));
            var base = num(report.portfolio && report.portfolio.avgBlockerRiskScore, 0);
            var actions = (report.playbook || []).slice(0, top);
            var projected = base;
            var applied = [];
            actions.forEach(function (a, i) {
                var w = num(a.estRiskDelta, 0);
                var delta = w * Math.pow(0.85, i) * 100;
                projected = Math.max(5, projected - delta);
                applied.push({ id: a.id, projectedDelta: -Math.round(delta * 10) / 10 });
            });
            projected = Math.round(projected);
            var knob = APPETITE[report.risk_appetite] || APPETITE.balanced;
            var thr = [20, 40, 60, 80].map(function (t) { return t + knob.bandShift; });
            var projBand;
            if (projected < thr[0]) projBand = 'CALM';
            else if (projected < thr[1]) projBand = 'WATCH';
            else if (projected < thr[2]) projBand = 'ELEVATED';
            else if (projected < thr[3]) projBand = 'HIGH';
            else projBand = 'CRITICAL';
            var projGrade;
            if (projected >= 70) projGrade = 'F';
            else if (projected >= 55) projGrade = 'D';
            else if (projected >= 35) projGrade = 'C';
            else if (projected >= 18) projGrade = 'B';
            else projGrade = 'A';
            return {
                baselineAvgRisk: base,
                projectedAvgRisk: projected,
                projectedBand: projBand,
                projectedGrade: projGrade,
                appliedActions: applied
            };
        }

        // -------- renderers -----------------------------------------------
        function formatText(report) {
            var L = [];
            L.push('AgentTaskDependencyAdvisor v' + VERSION);
            L.push('Generated: ' + report.generatedAt + ' (appetite=' + report.risk_appetite + ')');
            L.push(report.summary);
            L.push('Portfolio:');
            L.push('  totalTasks=' + report.portfolio.totalTasks +
                '  ready=' + report.portfolio.readyCount +
                '  blocked=' + report.portfolio.blockedCount +
                '  cycles=' + report.portfolio.cycleCount);
            L.push('  criticalPathLength=' + report.portfolio.criticalPathLength +
                '  projectedCompletionDays=' + report.portfolio.projectedCompletionDays);
            L.push('  avgRisk=' + report.portfolio.avgBlockerRiskScore +
                '  band=' + report.portfolio.band +
                '  grade=' + report.portfolio.grade);
            L.push('  P0=' + report.portfolio.p0Count + '  P1=' + report.portfolio.p1Count + '  P2=' + report.portfolio.p2Count);
            L.push('Top tasks:');
            report.items.slice(0, 10).forEach(function (it) {
                L.push('  [' + it.priority + '] ' + it.id + ' verdict=' + it.verdict + ' risk=' + it.blockerRiskScore + ' -> ' + it.recommendedAction);
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
            L.push('# Agent Task Dependency Advisor Report');
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
            L.push('| Total tasks | ' + report.portfolio.totalTasks + ' |');
            L.push('| Ready | ' + report.portfolio.readyCount + ' |');
            L.push('| Blocked | ' + report.portfolio.blockedCount + ' |');
            L.push('| Cycles | ' + report.portfolio.cycleCount + ' |');
            L.push('| Critical path length | ' + report.portfolio.criticalPathLength + ' |');
            L.push('| Projected completion (days) | ' + report.portfolio.projectedCompletionDays + ' |');
            L.push('| Avg blocker risk | ' + report.portfolio.avgBlockerRiskScore + ' |');
            L.push('| Band | ' + report.portfolio.band + ' |');
            L.push('| Grade | **' + report.portfolio.grade + '** |');
            L.push('| P0 / P1 / P2 | ' + report.portfolio.p0Count + ' / ' + report.portfolio.p1Count + ' / ' + report.portfolio.p2Count + ' |');
            L.push('');
            L.push('## Tasks');
            L.push('');
            L.push('| ID | Verdict | Priority | Risk | Depth | FanOut | Action |');
            L.push('|---|---|---|---|---|---|---|');
            report.items.forEach(function (it) {
                L.push('| ' + it.id + ' | ' + it.verdict + ' | ' + it.priority + ' | ' + it.blockerRiskScore +
                    ' | ' + it.depth + ' | ' + it.fanOut + ' | ' + it.recommendedAction + ' |');
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
        createAgentTaskDependencyAdvisor: createAgentTaskDependencyAdvisor
    };
}));
