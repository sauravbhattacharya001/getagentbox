/**
 * AgentAutonomyTuningAdvisor - agentic per-agent autonomy-level tuner.
 *
 * Looks at a fleet of agents each running at autonomy level 1..5 (matching
 * src/autonomy-ladder.js: Manual / Suggest / Auto-Low / Auto-High / Autonomous)
 * plus outcome telemetry, and decides whether each agent should be promoted,
 * piloted, maintained, demoted, or frozen to manual. Emits a portfolio
 * playbook so the fleet can be re-calibrated without overshooting trust.
 *
 * 6th sibling to:
 *   - AgentTriageAdvisor
 *   - AgentRolloutPlanner
 *   - AgentDriftDetector
 *   - AgentToolPolicyAdvisor
 *   - AgentBudgetGuardianAdvisor
 *
 * Pure JS, zero deps, UMD wrapper, deterministic given injectable now().
 *
 * Public API (factory):
 *   const advisor = createAgentAutonomyTuningAdvisor({ now });
 *   const report  = advisor.analyze({ agents, risk_appetite });
 *   const sim     = advisor.simulate({ applyTop: N }, report);
 *   advisor.formatText(report) / formatMarkdown(report) / formatJson(report);
 */
(function (root, factory) {
    'use strict';
    if (typeof module === 'object' && module.exports) {
        module.exports = factory();
    } else {
        root.AgentAutonomyTuningAdvisor = factory();
    }
}(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    var VERSION = '1.0.0';

    var APPETITE_MULT = { cautious: 0.92, balanced: 1.0, aggressive: 1.08 };
    var APPETITE_BAND_SHIFT = { cautious: -0.05, balanced: 0, aggressive: 0.05 };
    var PRIORITY_RANK = { P0: 0, P1: 1, P2: 2, P3: 3 };
    var LEVEL_NAMES = ['', 'Manual', 'Suggest', 'Auto-Low', 'Auto-High', 'Autonomous'];

    // ── utils ───────────────────────────────────────────────────────────

    function clamp(v, lo, hi) { return v < lo ? lo : (v > hi ? hi : v); }
    function isNum(v) { return typeof v === 'number' && isFinite(v); }
    function num(v, dflt) { return isNum(v) ? v : (dflt === undefined ? 0 : dflt); }

    function deepCopy(o) {
        if (o === null || typeof o !== 'object') return o;
        if (Array.isArray(o)) return o.map(deepCopy);
        var out = {};
        for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) out[k] = deepCopy(o[k]);
        return out;
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
        return JSON.stringify(sortKeys(value), null, indent);
    }

    // ── core per-agent computation ─────────────────────────────────────

    function recentIncidentPenalty(incidents) {
        if (!incidents || !incidents.length) return 0;
        var pen = 0;
        incidents.forEach(function (inc) {
            var days = num(inc && inc.daysAgo, 999);
            var sev = (inc && inc.severity) || 'low';
            var base = 0;
            if (sev === 'critical') base = 15;
            else if (sev === 'high') base = 8;
            else if (sev === 'medium') base = 3;
            else base = 1;
            if (days <= 14) pen += base;
            else if (days <= 30) pen += base / 2;
        });
        return clamp(pen, 0, 40);
    }

    function hasRecentCriticalIncident(agent, withinDays) {
        var incidents = agent.recentIncidents || [];
        for (var i = 0; i < incidents.length; i++) {
            var inc = incidents[i];
            if (inc && inc.severity === 'critical' && num(inc.daysAgo, 9999) <= withinDays) return true;
        }
        return false;
    }

    function hasRecentHighIncident(agent, withinDays) {
        var incidents = agent.recentIncidents || [];
        for (var i = 0; i < incidents.length; i++) {
            var inc = incidents[i];
            if (inc && (inc.severity === 'high' || inc.severity === 'critical') && num(inc.daysAgo, 9999) <= withinDays) return true;
        }
        return false;
    }

    function totalRisk(mix) {
        if (!mix) return 0;
        return num(mix.low) + num(mix.medium) + num(mix.high) + num(mix.critical);
    }

    function criticalShare(mix) {
        var tot = totalRisk(mix);
        if (tot <= 0) return 0;
        return num(mix && mix.critical) / tot;
    }

    function computeAgent(agent, appetite) {
        var mult = APPETITE_MULT[appetite] || 1.0;
        var id = agent.id;
        var name = agent.name || agent.id;
        var currentLevel = clamp(num(agent.currentLevel, 1), 1, 5);
        var daysAt = num(agent.daysAtCurrentLevel, 0);
        var taskCount = num(agent.taskCount, 0);
        var success = clamp(num(agent.successRate, 0), 0, 1);
        var intervention = clamp(num(agent.interventionRate, 0), 0, 1);
        var critErrs = num(agent.criticalErrorCount, 0);
        var rollbacks = num(agent.rollbackCount, 0);
        var trust = isNum(agent.trustScore) ? clamp(agent.trustScore, 0, 100) : null;
        var approvalLatency = isNum(agent.approvalLatencyMins) ? agent.approvalLatencyMins : null;
        var critShare = criticalShare(agent.riskMix);

        var reasons = [];

        // ── verdict determination ─────────────────────────────────────
        var verdict = 'MAINTAIN_LEVEL';
        var priority = 'P3';

        if (taskCount < 10) {
            reasons.push({ code: 'INSUFFICIENT_TELEMETRY', label: 'Only ' + taskCount + ' tasks observed', severity: 30 });
            verdict = 'INSUFFICIENT_DATA';
            priority = 'P3';
        } else {
            var freeze = false, demote = false, pilot = false, promote = false;

            // Freeze gates
            if (hasRecentCriticalIncident(agent, 7)) {
                freeze = true;
                reasons.push({ code: 'CRITICAL_INCIDENT_RECENT', label: 'Critical incident in last 7d', severity: 95 });
            }
            if (critErrs >= 2) {
                freeze = true;
                reasons.push({ code: 'CRITICAL_INCIDENT_RECENT', label: critErrs + ' critical errors in window', severity: 85 });
            }
            if (currentLevel >= 3 && success < 0.50) {
                freeze = true;
                reasons.push({ code: 'LOW_SUCCESS_RATE', label: 'Success ' + (success * 100).toFixed(0) + '% at level ' + currentLevel, severity: 90 });
            }

            // Demote gates
            if (!freeze) {
                if (currentLevel >= 3 && success < 0.80) {
                    demote = true;
                    reasons.push({ code: 'LOW_SUCCESS_RATE', label: 'Success ' + (success * 100).toFixed(0) + '%', severity: 65 });
                }
                if (currentLevel >= 3 && intervention > 0.30) {
                    demote = true;
                    reasons.push({ code: 'HIGH_INTERVENTION', label: 'Humans intervening on ' + (intervention * 100).toFixed(0) + '% of tasks', severity: 60 });
                }
                if (rollbacks >= 3) {
                    demote = true;
                    reasons.push({ code: 'ROLLBACK_PATTERN', label: rollbacks + ' rollbacks in window', severity: 55 });
                }
                if (hasRecentHighIncident(agent, 14) && !hasRecentCriticalIncident(agent, 14)) {
                    demote = true;
                    reasons.push({ code: 'HIGH_SEVERITY_INCIDENT_RECENT', label: 'High-severity incident in last 14d', severity: 50 });
                }
            }

            // Promote / Pilot gates (only if not demoting/freezing)
            if (!freeze && !demote) {
                var tenureOk = daysAt >= 14;
                var cleanSlate = !hasRecentHighIncident(agent, 30) && critErrs === 0 && rollbacks <= 1;
                var trackRecord = success >= 0.95 && intervention <= 0.05;
                var pilotTrack = success >= 0.92 && intervention <= 0.10;
                var bottleneck = approvalLatency !== null && approvalLatency >= 30;

                if (!tenureOk) {
                    if (daysAt > 0) reasons.push({ code: 'TENURE_TOO_SHORT', label: 'Only ' + daysAt + ' days at level ' + currentLevel, severity: 25 });
                }

                // Pilot first: jumping to fully autonomous (5) always needs pilot
                if (currentLevel === 4 && tenureOk && pilotTrack && cleanSlate) {
                    pilot = true;
                    reasons.push({ code: 'STRONG_TRACK_RECORD', label: 'Pilot-ready: ' + (success * 100).toFixed(0) + '% success, ' + (intervention * 100).toFixed(0) + '% intervention', severity: 30 });
                    reasons.push({ code: 'TENURE_AT_LEVEL_SUFFICIENT', label: daysAt + ' days at level ' + currentLevel, severity: 20 });
                } else if (currentLevel <= 3 && tenureOk && pilotTrack && !trackRecord && cleanSlate && critShare >= 0.20) {
                    pilot = true;
                    reasons.push({ code: 'RISK_MIX_TOO_AGGRESSIVE', label: 'Critical-task share ' + (critShare * 100).toFixed(0) + '% — pilot before promote', severity: 35 });
                    reasons.push({ code: 'STRONG_TRACK_RECORD', label: 'Pilot-ready record', severity: 25 });
                } else if (currentLevel <= 3 && tenureOk && trackRecord && cleanSlate) {
                    promote = true;
                    reasons.push({ code: 'STRONG_TRACK_RECORD', label: 'Promotion-ready: ' + (success * 100).toFixed(0) + '% success, ' + (intervention * 100).toFixed(0) + '% intervention', severity: 30 });
                    reasons.push({ code: 'TENURE_AT_LEVEL_SUFFICIENT', label: daysAt + ' days at level ' + currentLevel, severity: 20 });
                    if (bottleneck) reasons.push({ code: 'HUMAN_BOTTLENECK', label: 'Approval latency ' + approvalLatency + 'min — humans are the bottleneck', severity: 25 });
                } else if (currentLevel <= 3 && bottleneck && tenureOk && pilotTrack && cleanSlate) {
                    // bottleneck alone can justify a pilot promotion if track is good enough
                    pilot = true;
                    reasons.push({ code: 'HUMAN_BOTTLENECK', label: 'Approval latency ' + approvalLatency + 'min — humans are the bottleneck', severity: 30 });
                }
            }

            // Resolution: FREEZE > DEMOTE > MAINTAIN > PILOT > PROMOTE (restrictive wins)
            if (freeze) { verdict = 'FREEZE_TO_MANUAL'; priority = 'P0'; }
            else if (demote) { verdict = 'DEMOTE_ONE_NOTCH'; priority = 'P1'; }
            else if (pilot) { verdict = 'PILOT_PROMOTION'; priority = 'P2'; }
            else if (promote) { verdict = 'PROMOTE_LEVEL'; priority = 'P2'; }
            else { verdict = 'MAINTAIN_LEVEL'; priority = 'P3'; }
        }

        // ── fit score ──────────────────────────────────────────────────
        var computed;
        if (verdict === 'INSUFFICIENT_DATA') {
            computed = 50;
        } else {
            var s = success * 40;
            s += (1 - intervention) * 25;
            s -= recentIncidentPenalty(agent.recentIncidents);
            s += clamp(daysAt / 30, 0, 1) * 10;
            if (currentLevel <= 3 && approvalLatency !== null) {
                s += Math.min(10, approvalLatency / 12);
            }
            if (critErrs > 0) s -= 5 * critErrs;
            if (rollbacks > 0) s -= 2 * rollbacks;
            computed = clamp(s, 0, 100);
        }
        var blended = (trust !== null && verdict !== 'INSUFFICIENT_DATA')
            ? (computed * 0.85 + trust * 0.15)
            : computed;
        var autonomyFitScore = clamp(blended * mult, 0, 100);

        // ── recommended level ──────────────────────────────────────────
        var delta = 0;
        if (verdict === 'PROMOTE_LEVEL' || verdict === 'PILOT_PROMOTION') delta = 1;
        else if (verdict === 'DEMOTE_ONE_NOTCH') delta = -1;
        else if (verdict === 'FREEZE_TO_MANUAL') delta = -(currentLevel - 1);
        var recommendedLevel = clamp(currentLevel + delta, 1, 5);

        // ── suggested action text ──────────────────────────────────────
        var suggestedAction;
        switch (verdict) {
            case 'FREEZE_TO_MANUAL':
                suggestedAction = 'Drop to Manual (Level 1) immediately and investigate before re-enabling automation.';
                break;
            case 'DEMOTE_ONE_NOTCH':
                suggestedAction = 'Demote to Level ' + recommendedLevel + ' (' + LEVEL_NAMES[recommendedLevel] + ') and require human approval for medium+ risk tasks.';
                break;
            case 'PILOT_PROMOTION':
                suggestedAction = 'Run a time-boxed pilot at Level ' + recommendedLevel + ' (' + LEVEL_NAMES[recommendedLevel] + ') on a 10–20% slice of tasks before full cutover.';
                break;
            case 'PROMOTE_LEVEL':
                suggestedAction = 'Promote to Level ' + recommendedLevel + ' (' + LEVEL_NAMES[recommendedLevel] + ').';
                break;
            case 'INSUFFICIENT_DATA':
                suggestedAction = 'Hold current level until at least 10 tasks of telemetry are collected.';
                break;
            default:
                suggestedAction = 'Keep at Level ' + currentLevel + ' (' + LEVEL_NAMES[currentLevel] + ').';
        }

        // ── confidence ─────────────────────────────────────────────────
        var conf = 55;
        if (taskCount >= 100) conf += 25;
        else if (taskCount >= 30) conf += 15;
        else if (taskCount < 10) conf -= 25;
        if (daysAt >= 30) conf += 10;
        else if (daysAt < 7) conf -= 5;
        if (trust !== null) conf += 5;
        if (verdict === 'INSUFFICIENT_DATA') conf = clamp(conf, 5, 40);
        conf = clamp(conf, 5, 100);

        return {
            id: id,
            name: name,
            currentLevel: currentLevel,
            currentLevelLabel: LEVEL_NAMES[currentLevel],
            recommendedLevel: recommendedLevel,
            recommendedLevelLabel: LEVEL_NAMES[recommendedLevel],
            autonomyFitScore: Math.round(autonomyFitScore * 10) / 10,
            verdict: verdict,
            priority: priority,
            reasons: reasons,
            suggestedAction: suggestedAction,
            confidence: Math.round(conf)
        };
    }

    // ── portfolio playbook ─────────────────────────────────────────────

    function buildPlaybook(agentResults, agents, appetite, grade) {
        var counts = { FREEZE_TO_MANUAL: 0, DEMOTE_ONE_NOTCH: 0, PROMOTE_LEVEL: 0, PILOT_PROMOTION: 0, MAINTAIN_LEVEL: 0, INSUFFICIENT_DATA: 0 };
        var byVerdict = {};
        agentResults.forEach(function (r) {
            counts[r.verdict] = (counts[r.verdict] || 0) + 1;
            (byVerdict[r.verdict] = byVerdict[r.verdict] || []).push(r.id);
        });

        var hiIntervention = agents.filter(function (a) { return num(a.interventionRate, 0) > 0.30; });
        var slowApprovals = agents.filter(function (a) {
            return isNum(a.approvalLatencyMins) && a.approvalLatencyMins >= 60 && num(a.currentLevel, 1) <= 3;
        });
        var critIncidentCluster = agents.filter(function (a) { return hasRecentCriticalIncident(a, 14); });

        var actions = [];

        if (counts.FREEZE_TO_MANUAL >= 1) {
            actions.push({
                id: 'FREEZE_FLEET_HOT_AGENTS',
                priority: 'P0',
                label: 'Freeze ' + counts.FREEZE_TO_MANUAL + ' hot agent(s) to Manual',
                reason: 'Agents with critical incidents or sub-50% success at high autonomy must drop to Level 1 until root-caused.',
                owner: 'safety',
                blastRadius: 5,
                reversibility: 'high',
                agentIds: (byVerdict.FREEZE_TO_MANUAL || []).slice()
            });
        }
        if (counts.FREEZE_TO_MANUAL >= 2 || critIncidentCluster.length >= 3) {
            actions.push({
                id: 'EMERGENCY_AUTONOMY_REVIEW',
                priority: 'P0',
                label: 'Convene emergency autonomy review',
                reason: 'Multiple agents are unsafe to run autonomously; leadership must decide global posture before resuming.',
                owner: 'leadership',
                blastRadius: 5,
                reversibility: 'high',
                agentIds: critIncidentCluster.map(function (a) { return a.id; })
            });
        }
        if (counts.DEMOTE_ONE_NOTCH >= 2) {
            actions.push({
                id: 'DEMOTE_UNDERPERFORMERS',
                priority: 'P1',
                label: 'Demote ' + counts.DEMOTE_ONE_NOTCH + ' agents one notch',
                reason: 'Sub-target success/intervention rates indicate the current autonomy level is over-extended.',
                owner: 'platform',
                blastRadius: 3,
                reversibility: 'high',
                agentIds: (byVerdict.DEMOTE_ONE_NOTCH || []).slice()
            });
        }
        if (hiIntervention.length >= 2) {
            actions.push({
                id: 'ROOT_CAUSE_INTERVENTION_SPIKES',
                priority: 'P1',
                label: 'Root-cause intervention spikes on ' + hiIntervention.length + ' agents',
                reason: 'Humans are interrupting >30% of tasks; either the agents are mis-calibrated or the policy is too tight.',
                owner: 'product',
                blastRadius: 2,
                reversibility: 'high',
                agentIds: hiIntervention.map(function (a) { return a.id; })
            });
        }
        if (counts.PILOT_PROMOTION >= 1) {
            actions.push({
                id: 'START_AUTONOMY_PILOTS',
                priority: 'P2',
                label: 'Start ' + counts.PILOT_PROMOTION + ' autonomy pilot(s)',
                reason: 'Promising agents should run a partial-traffic pilot before full promotion.',
                owner: 'product',
                blastRadius: 2,
                reversibility: 'high',
                agentIds: (byVerdict.PILOT_PROMOTION || []).slice()
            });
        }
        if (counts.PROMOTE_LEVEL >= 1) {
            actions.push({
                id: 'PROMOTE_TOP_PERFORMERS',
                priority: 'P2',
                label: 'Promote ' + counts.PROMOTE_LEVEL + ' top performer(s)',
                reason: 'Strong track record, sufficient tenure, and no recent incidents — safe to advance one notch.',
                owner: 'product',
                blastRadius: 2,
                reversibility: 'high',
                agentIds: (byVerdict.PROMOTE_LEVEL || []).slice()
            });
        }
        if (counts.INSUFFICIENT_DATA >= 3) {
            actions.push({
                id: 'INVEST_IN_TRAINING_DATA',
                priority: 'P2',
                label: 'Drive more traffic to ' + counts.INSUFFICIENT_DATA + ' under-observed agents',
                reason: 'Too few tasks to make a confident autonomy decision; expand evaluation traffic.',
                owner: 'platform',
                blastRadius: 1,
                reversibility: 'high',
                agentIds: (byVerdict.INSUFFICIENT_DATA || []).slice()
            });
        }
        if (slowApprovals.length >= 2) {
            actions.push({
                id: 'REDUCE_HUMAN_BOTTLENECK',
                priority: 'P2',
                label: 'Reduce human-approval latency on ' + slowApprovals.length + ' agents',
                reason: '60+ min approval latency at Level <=3 is throttling throughput; route to a smaller, faster approver pool.',
                owner: 'ops',
                blastRadius: 2,
                reversibility: 'high',
                agentIds: slowApprovals.map(function (a) { return a.id; })
            });
        }

        if (!actions.length) {
            actions.push({
                id: 'MAINTAIN_OBSERVABILITY',
                priority: 'P3',
                label: 'Maintain observability — fleet is stable',
                reason: 'No autonomy changes warranted; keep telemetry flowing.',
                owner: 'platform',
                blastRadius: 1,
                reversibility: 'high',
                agentIds: []
            });
        }

        // Appetite trimming
        if (appetite === 'aggressive' && actions.length > 1) {
            var hasP0 = actions.some(function (a) { return a.priority === 'P0'; });
            var hasP1 = actions.some(function (a) { return a.priority === 'P1'; });
            actions = actions.filter(function (a) {
                if (a.priority === 'P3') return false;
                if (a.priority === 'P2' && (hasP0 || hasP1)) {
                    // count P2s: trim if a lone P2 alongside P0/P1
                    var p2s = actions.filter(function (x) { return x.priority === 'P2'; });
                    if (p2s.length === 1) return false;
                }
                return true;
            });
            if (!actions.length) {
                actions.push({
                    id: 'MAINTAIN_OBSERVABILITY',
                    priority: 'P3',
                    label: 'Maintain observability — fleet is stable',
                    reason: 'No autonomy changes warranted; keep telemetry flowing.',
                    owner: 'platform',
                    blastRadius: 1,
                    reversibility: 'high',
                    agentIds: []
                });
            }
        }
        if (appetite === 'cautious' && (grade === 'C' || grade === 'D' || grade === 'F')) {
            actions.push({
                id: 'SCHEDULE_QUARTERLY_AUTONOMY_REVIEW',
                priority: 'P2',
                label: 'Schedule quarterly autonomy review',
                reason: 'Grade ' + grade + ' fleet — cautious mode recommends a recurring deep-dive review.',
                owner: 'leadership',
                blastRadius: 1,
                reversibility: 'high',
                agentIds: []
            });
        }

        // Deduplicate by id (last wins, then sort)
        var seen = {};
        actions = actions.filter(function (a) {
            if (seen[a.id]) return false;
            seen[a.id] = true;
            return true;
        });
        actions.sort(function (a, b) {
            return PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
        });
        return actions;
    }

    // ── insights ───────────────────────────────────────────────────────

    function buildInsights(agentResults, agents) {
        var insights = [];
        var n = agentResults.length || 1;
        var counts = { FREEZE: 0, DEMOTE: 0, PROMOTE: 0, PILOT: 0, MAINTAIN: 0, INSUFFICIENT: 0 };
        var sumCurrentLevel = 0, sumLevelDeltaAbs = 0;
        agentResults.forEach(function (r) {
            if (r.verdict === 'FREEZE_TO_MANUAL') counts.FREEZE++;
            else if (r.verdict === 'DEMOTE_ONE_NOTCH') counts.DEMOTE++;
            else if (r.verdict === 'PROMOTE_LEVEL') counts.PROMOTE++;
            else if (r.verdict === 'PILOT_PROMOTION') counts.PILOT++;
            else if (r.verdict === 'MAINTAIN_LEVEL') counts.MAINTAIN++;
            else counts.INSUFFICIENT++;
            sumCurrentLevel += r.currentLevel;
            sumLevelDeltaAbs += Math.abs(r.recommendedLevel - r.currentLevel);
        });
        var avgLevel = sumCurrentLevel / n;
        var demoteFreezeShare = (counts.DEMOTE + counts.FREEZE) / n;
        var promotePilotShare = (counts.PROMOTE + counts.PILOT) / n;

        if (avgLevel >= 4 && demoteFreezeShare >= 0.30) {
            insights.push({ code: 'FLEET_OVER_AUTONOMOUS', label: 'Fleet is running too autonomously — ' + Math.round(demoteFreezeShare * 100) + '% need to step down.' });
        }
        if (avgLevel <= 2 && promotePilotShare >= 0.40 && counts.FREEZE === 0) {
            insights.push({ code: 'FLEET_UNDER_AUTONOMOUS', label: 'Fleet is over-supervised — ' + Math.round(promotePilotShare * 100) + '% can safely take on more autonomy.' });
        }
        var critCluster = agents.filter(function (a) { return hasRecentCriticalIncident(a, 14); });
        if (critCluster.length >= 2) {
            insights.push({ code: 'CRITICAL_INCIDENT_CLUSTER', label: critCluster.length + ' agents had a critical incident in the last 14 days.' });
        }
        var bottleneck = agentResults.filter(function (r) {
            return r.reasons.some(function (x) { return x.code === 'HUMAN_BOTTLENECK'; });
        });
        if (bottleneck.length >= 2) {
            insights.push({ code: 'HUMAN_BOTTLENECK_PATTERN', label: bottleneck.length + ' agents are throttled by slow human approvals.' });
        }
        if (counts.MAINTAIN / n >= 0.75 && counts.FREEZE === 0 && counts.DEMOTE === 0) {
            insights.push({ code: 'STABLE_PORTFOLIO', label: Math.round(counts.MAINTAIN / n * 100) + '% of the fleet is at its right level.' });
        }
        if (sumLevelDeltaAbs / n >= 0.5) {
            insights.push({ code: 'RAPID_CHURN_RISK', label: 'Recommended level changes touch ~' + Math.round(sumLevelDeltaAbs / n * 100) / 100 + ' levels/agent on average — risk of policy churn.' });
        }
        return insights;
    }

    // ── grade / band ───────────────────────────────────────────────────

    function gradeFleet(fleetScore, anyFreeze) {
        if (anyFreeze) return 'F';
        if (fleetScore < 40) return 'F';
        if (fleetScore < 55) return 'D';
        if (fleetScore < 70) return 'C';
        if (fleetScore < 85) return 'B';
        return 'A';
    }

    function bandFleet(anyFreeze, shift, appetite) {
        if (anyFreeze) return 'CRISIS';
        var s = APPETITE_BAND_SHIFT[appetite] || 0;
        // shift > 0 means promoting net; < 0 means demoting net.
        if (shift > 0.30 + s) return 'UNDER_AUTONOMOUS';
        if (shift < -0.30 - s) return 'OVER_AUTONOMOUS';
        if (Math.abs(shift) > 0.10) return 'CALIBRATING';
        return 'STABLE';
    }

    // ── analyze ────────────────────────────────────────────────────────

    function analyze(input, ctx) {
        input = input || {};
        var appetite = input.risk_appetite || 'balanced';
        if (!APPETITE_MULT[appetite]) appetite = 'balanced';
        var agents = deepCopy(input.agents || []);
        var nowFn = (ctx && ctx.now) || function () { return new Date(); };
        var generatedAt = nowFn().toISOString();

        var results = agents.map(function (a) { return computeAgent(a, appetite); });

        var totalAgents = results.length;
        var freezeCount = 0, demoteCount = 0, promoteCount = 0, pilotCount = 0, maintainCount = 0, insufficientCount = 0;
        var sumFit = 0, sumDelta = 0;
        results.forEach(function (r) {
            switch (r.verdict) {
                case 'FREEZE_TO_MANUAL': freezeCount++; break;
                case 'DEMOTE_ONE_NOTCH': demoteCount++; break;
                case 'PROMOTE_LEVEL': promoteCount++; break;
                case 'PILOT_PROMOTION': pilotCount++; break;
                case 'MAINTAIN_LEVEL': maintainCount++; break;
                default: insufficientCount++;
            }
            sumFit += r.autonomyFitScore;
            sumDelta += (r.recommendedLevel - r.currentLevel);
        });

        var fleetScore = totalAgents ? sumFit / totalAgents : 100;
        var fleetShift = totalAgents ? sumDelta / totalAgents : 0;
        var anyFreeze = freezeCount > 0;
        var grade = gradeFleet(fleetScore, anyFreeze);
        var band = bandFleet(anyFreeze, fleetShift, appetite);

        var playbook = buildPlaybook(results, agents, appetite, grade);
        var insights = buildInsights(results, agents);

        var headline;
        if (!totalAgents) {
            headline = 'Empty fleet — nothing to tune.';
        } else if (anyFreeze) {
            headline = '⚠ ' + freezeCount + ' agent(s) must drop to Manual immediately (grade ' + grade + ').';
        } else if (demoteCount > 0) {
            headline = 'Calibrating fleet: ' + demoteCount + ' demote, ' + promoteCount + ' promote, ' + pilotCount + ' pilot (grade ' + grade + ').';
        } else if (promoteCount + pilotCount > 0) {
            headline = 'Fleet is healthy: ' + promoteCount + ' ready to promote, ' + pilotCount + ' ready to pilot (grade ' + grade + ').';
        } else {
            headline = 'Fleet stable at current autonomy levels (grade ' + grade + ').';
        }

        return {
            version: VERSION,
            generatedAt: generatedAt,
            riskAppetite: appetite,
            agents: results,
            portfolio: {
                totalAgents: totalAgents,
                freezeCount: freezeCount,
                demoteCount: demoteCount,
                promoteCount: promoteCount,
                pilotCount: pilotCount,
                maintainCount: maintainCount,
                insufficientCount: insufficientCount,
                fleetAutonomyScore: Math.round(fleetScore * 10) / 10,
                recommendedFleetAutonomyShift: Math.round(fleetShift * 100) / 100,
                band: band,
                grade: grade,
                headline: headline
            },
            playbook: playbook,
            insights: insights
        };
    }

    // ── simulate ───────────────────────────────────────────────────────

    var ACTION_SCORE_DELTA = {
        FREEZE_FLEET_HOT_AGENTS: 18,
        EMERGENCY_AUTONOMY_REVIEW: 8,
        DEMOTE_UNDERPERFORMERS: 14,
        ROOT_CAUSE_INTERVENTION_SPIKES: 10,
        START_AUTONOMY_PILOTS: 6,
        PROMOTE_TOP_PERFORMERS: 5,
        INVEST_IN_TRAINING_DATA: 4,
        REDUCE_HUMAN_BOTTLENECK: 5,
        SCHEDULE_QUARTERLY_AUTONOMY_REVIEW: 2,
        MAINTAIN_OBSERVABILITY: 1
    };

    function simulate(opts, report) {
        opts = opts || {};
        var applyTop = isNum(opts.applyTop) ? opts.applyTop : (report && report.playbook ? report.playbook.length : 0);
        if (!report || !report.playbook || !report.portfolio) {
            return { projectedFleetAutonomyScore: 0, projectedBand: 'STABLE', projectedGrade: 'A', appliedActions: [] };
        }
        var base = report.portfolio.fleetAutonomyScore || 0;
        var anyFreezeBefore = report.portfolio.freezeCount > 0;
        var applied = [];
        var lift = 0;
        var slice = report.playbook.slice(0, Math.max(0, applyTop));
        slice.forEach(function (a, i) {
            var d = ACTION_SCORE_DELTA[a.id] || 2;
            lift += d * Math.pow(0.85, i);
            applied.push({ id: a.id, priority: a.priority, projectedScoreDelta: Math.round(d * Math.pow(0.85, i) * 10) / 10 });
        });
        var projScore = clamp(base + lift, 0, 100);
        // Applying FREEZE actions implicitly clears the freeze state for projection purposes.
        var stillFreeze = anyFreezeBefore && !slice.some(function (a) { return a.id === 'FREEZE_FLEET_HOT_AGENTS' || a.id === 'EMERGENCY_AUTONOMY_REVIEW'; });
        var projGrade = gradeFleet(projScore, stillFreeze);
        var projBand = bandFleet(stillFreeze, report.portfolio.recommendedFleetAutonomyShift || 0, report.riskAppetite || 'balanced');
        return {
            projectedFleetAutonomyScore: Math.round(projScore * 10) / 10,
            projectedBand: projBand,
            projectedGrade: projGrade,
            appliedActions: applied
        };
    }

    // ── renderers ──────────────────────────────────────────────────────

    function formatText(report) {
        if (!report) return '';
        var out = [];
        out.push('AgentAutonomyTuningAdvisor v' + report.version + ' — ' + report.generatedAt);
        out.push(report.portfolio.headline);
        out.push('Risk appetite: ' + report.riskAppetite + ' | Band: ' + report.portfolio.band + ' | Grade: ' + report.portfolio.grade);
        out.push('Fleet score: ' + report.portfolio.fleetAutonomyScore + '/100  Shift: ' + report.portfolio.recommendedFleetAutonomyShift);
        out.push('Agents: ' + report.portfolio.totalAgents +
            ' (freeze ' + report.portfolio.freezeCount +
            ', demote ' + report.portfolio.demoteCount +
            ', promote ' + report.portfolio.promoteCount +
            ', pilot ' + report.portfolio.pilotCount +
            ', maintain ' + report.portfolio.maintainCount +
            ', insufficient ' + report.portfolio.insufficientCount + ')');
        out.push('');
        out.push('Per-agent:');
        report.agents.forEach(function (a) {
            out.push('  [' + a.priority + '] ' + a.name + ' L' + a.currentLevel + '→L' + a.recommendedLevel +
                ' ' + a.verdict + ' (fit ' + a.autonomyFitScore + ', conf ' + a.confidence + '%) — ' + a.suggestedAction);
        });
        out.push('');
        out.push('Playbook:');
        report.playbook.forEach(function (p) {
            out.push('  [' + p.priority + '] ' + p.label + ' (owner=' + p.owner + ', blast=' + p.blastRadius + ')');
        });
        if (report.insights && report.insights.length) {
            out.push('');
            out.push('Insights:');
            report.insights.forEach(function (i) { out.push('  - ' + i.label); });
        }
        return out.join('\n');
    }

    function formatMarkdown(report) {
        if (!report) return '';
        var out = [];
        out.push('# AgentAutonomyTuningAdvisor');
        out.push('');
        out.push('_Generated: ' + report.generatedAt + '_');
        out.push('');
        out.push('## Summary');
        out.push('');
        out.push('- **Headline:** ' + report.portfolio.headline);
        out.push('- **Risk appetite:** ' + report.riskAppetite);
        out.push('- **Band:** ' + report.portfolio.band);
        out.push('- **Grade:** ' + report.portfolio.grade);
        out.push('- **Fleet autonomy score:** ' + report.portfolio.fleetAutonomyScore + '/100');
        out.push('- **Recommended fleet autonomy shift:** ' + report.portfolio.recommendedFleetAutonomyShift);
        out.push('- **Verdicts:** freeze=' + report.portfolio.freezeCount +
            ', demote=' + report.portfolio.demoteCount +
            ', promote=' + report.portfolio.promoteCount +
            ', pilot=' + report.portfolio.pilotCount +
            ', maintain=' + report.portfolio.maintainCount +
            ', insufficient=' + report.portfolio.insufficientCount);
        out.push('');
        out.push('## Agents');
        out.push('');
        out.push('| Agent | Current | Recommended | Verdict | Priority | Fit | Confidence | Action |');
        out.push('| --- | --- | --- | --- | --- | --- | --- | --- |');
        report.agents.forEach(function (a) {
            out.push('| ' + a.name + ' | L' + a.currentLevel + ' ' + a.currentLevelLabel +
                ' | L' + a.recommendedLevel + ' ' + a.recommendedLevelLabel +
                ' | ' + a.verdict + ' | ' + a.priority + ' | ' + a.autonomyFitScore +
                ' | ' + a.confidence + '% | ' + a.suggestedAction + ' |');
        });
        out.push('');
        out.push('## Playbook');
        out.push('');
        out.push('| Priority | Action | Owner | Blast | Reversibility | Reason |');
        out.push('| --- | --- | --- | --- | --- | --- |');
        report.playbook.forEach(function (p) {
            out.push('| ' + p.priority + ' | ' + p.label + ' | ' + p.owner + ' | ' + p.blastRadius + ' | ' + p.reversibility + ' | ' + p.reason + ' |');
        });
        out.push('');
        out.push('## Insights');
        out.push('');
        if (report.insights && report.insights.length) {
            report.insights.forEach(function (i) { out.push('- **' + i.code + ':** ' + i.label); });
        } else {
            out.push('_No cross-fleet insights this run._');
        }
        return out.join('\n');
    }

    function formatJson(report) {
        return stableStringify(report, 2);
    }

    // ── factory ────────────────────────────────────────────────────────

    function createAgentAutonomyTuningAdvisor(ctx) {
        ctx = ctx || {};
        var nowFn = ctx.now || function () { return new Date(); };
        var bound = { now: nowFn };
        return {
            version: VERSION,
            analyze: function (input) { return analyze(input, bound); },
            simulate: function (opts, report) { return simulate(opts, report); },
            formatText: formatText,
            formatMarkdown: formatMarkdown,
            formatJson: formatJson
        };
    }

    return {
        createAgentAutonomyTuningAdvisor: createAgentAutonomyTuningAdvisor,
        VERSION: VERSION
    };
}));
