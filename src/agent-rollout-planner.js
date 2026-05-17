/**
 * AgentRolloutPlanner — agentic phased deployment strategist for AgentBox.
 *
 * Given an agent profile and a rollout target, this module produces a
 * deterministic, phased deployment plan with go/no-go gates, per-phase
 * KPIs, automated rollback triggers, observability requirements, and an
 * approval matrix. Use simulate() to walk the plan through proposed
 * phase outcomes and get a recommended next action when something
 * breaks mid-rollout.
 *
 * Zero dependencies. Pure functions. Browser + Node compatible.
 *
 * agentProfile fields:
 *   { name?, trustScore (0..100, required),
 *     autonomyLevel? ('L0_observe'|'L1_suggest'|'L2_act_with_approval'|'L3_act'|'L4_autonomous'),
 *     riskAppetite? ('cautious'|'balanced'|'aggressive'),
 *     capabilityCount?, domain?, blastRadius? (1..5), priorIncidents? }
 *
 * target fields:
 *   { audience? ('internal'|'beta'|'public'), maxTrafficPercent? (1..100),
 *     environments? (string[]), regions? (string[]), timelineDays? }
 *
 * options fields:
 *   { phaseCount? (1..8), now? (epoch ms or ISO) }
 */
(function (root, factory) {
    'use strict';
    if (typeof module === 'object' && module.exports) {
        module.exports = factory();
    } else {
        root.AgentRolloutPlanner = factory();
    }
}(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    var AUTONOMY_WEIGHT = {
        L0_observe: 0,
        L1_suggest: 5,
        L2_act_with_approval: 10,
        L3_act: 20,
        L4_autonomous: 35
    };

    var RISK_APPETITE_ADJ = { cautious: 10, balanced: 0, aggressive: -10 };

    var DEFAULT_TRAFFIC_CURVE = [1, 5, 25, 50, 100];

    function clamp(n, lo, hi) {
        if (n < lo) { return lo; }
        if (n > hi) { return hi; }
        return n;
    }

    function isFiniteNum(n) {
        return typeof n === 'number' && isFinite(n);
    }

    function defaulted(v, def) {
        return (v === undefined || v === null) ? def : v;
    }

    function toIso(t) {
        if (t === undefined || t === null) { return null; }
        if (typeof t === 'string') {
            var d = new Date(t);
            if (isNaN(d.getTime())) { return null; }
            return d.toISOString();
        }
        if (typeof t === 'number' && isFinite(t)) {
            return new Date(t).toISOString();
        }
        return null;
    }

    function toEpoch(t) {
        if (t === undefined || t === null) { return 0; }
        if (typeof t === 'string') {
            var d = new Date(t);
            return isNaN(d.getTime()) ? 0 : d.getTime();
        }
        if (typeof t === 'number' && isFinite(t)) {
            return t;
        }
        return 0;
    }

    function normalizeProfile(profile) {
        var p = profile || {};
        var autonomy = p.autonomyLevel;
        if (!(autonomy in AUTONOMY_WEIGHT)) { autonomy = 'L2_act_with_approval'; }
        var appetite = p.riskAppetite;
        if (!(appetite in RISK_APPETITE_ADJ)) { appetite = 'balanced'; }
        return {
            name: typeof p.name === 'string' ? p.name : null,
            trustScore: clamp(isFiniteNum(p.trustScore) ? p.trustScore : 0, 0, 100),
            autonomyLevel: autonomy,
            riskAppetite: appetite,
            capabilityCount: isFiniteNum(p.capabilityCount) ? p.capabilityCount : 0,
            domain: typeof p.domain === 'string' ? p.domain.toLowerCase() : null,
            blastRadius: clamp(isFiniteNum(p.blastRadius) ? p.blastRadius : 3, 1, 5),
            priorIncidents: isFiniteNum(p.priorIncidents) ? Math.max(0, p.priorIncidents) : 0
        };
    }

    function normalizeTarget(target) {
        var t = target || {};
        var audience = t.audience;
        if (audience !== 'internal' && audience !== 'beta' && audience !== 'public') {
            audience = 'beta';
        }
        var envs = Array.isArray(t.environments) && t.environments.length
            ? t.environments.slice() : ['staging', 'prod'];
        var regions = Array.isArray(t.regions) ? t.regions.slice() : [];
        return {
            audience: audience,
            maxTrafficPercent: clamp(isFiniteNum(t.maxTrafficPercent) ? t.maxTrafficPercent : 100, 1, 100),
            environments: envs,
            regions: regions,
            timelineDays: Math.max(1, isFiniteNum(t.timelineDays) ? t.timelineDays : 14)
        };
    }

    function computeRiskScore(profile) {
        var raw =
            profile.blastRadius * 10 +
            profile.priorIncidents * 8 +
            (100 - profile.trustScore) * 0.4 +
            AUTONOMY_WEIGHT[profile.autonomyLevel] -
            RISK_APPETITE_ADJ[profile.riskAppetite];
        return Math.round(clamp(raw, 0, 100) * 100) / 100;
    }

    function recommendPhaseCount(riskScore, override) {
        if (isFiniteNum(override)) { return clamp(Math.round(override), 1, 8); }
        if (riskScore >= 70) { return 6; }
        if (riskScore >= 40) { return 5; }
        if (riskScore >= 20) { return 4; }
        return 3;
    }

    function buildPhaseShapes(phaseCount, maxTraffic, includeShadow) {
        // Result: array of { name, trafficPercent, includeShadow flag }
        var shapes = [];
        if (includeShadow) {
            shapes.push({ name: 'Shadow', trafficPercent: 0 });
        }
        var remaining = phaseCount - shapes.length;
        // pick last `remaining` values from DEFAULT_TRAFFIC_CURVE, but ensure final == maxTraffic
        var curve;
        if (remaining <= DEFAULT_TRAFFIC_CURVE.length) {
            curve = DEFAULT_TRAFFIC_CURVE.slice(DEFAULT_TRAFFIC_CURVE.length - remaining);
        } else {
            // Pad with extra intermediate steps if asked for too many phases
            curve = [];
            for (var i = 0; i < remaining - DEFAULT_TRAFFIC_CURVE.length; i++) {
                curve.push(1);
            }
            curve = curve.concat(DEFAULT_TRAFFIC_CURVE);
        }
        // Scale so last == maxTraffic
        var scale = maxTraffic / curve[curve.length - 1];
        for (var j = 0; j < curve.length; j++) {
            var t = j === curve.length - 1 ? maxTraffic : Math.max(1, Math.round(curve[j] * scale));
            var label;
            if (t >= 100) { label = 'Full Rollout'; }
            else if (t >= 50) { label = 'Ramp ' + t + '%'; }
            else { label = 'Canary ' + t + '%'; }
            shapes.push({ name: label, trafficPercent: t });
        }
        return shapes;
    }

    function distributeDurations(totalDays, phaseCount, shapes) {
        // Proportional to trafficPercent share; shadow phase = 1 day minimum; min 1 per phase; last absorbs slack.
        var weights = shapes.map(function (s) {
            return s.trafficPercent <= 0 ? 0.5 : Math.max(1, s.trafficPercent);
        });
        var weightSum = weights.reduce(function (a, b) { return a + b; }, 0);
        var durations = shapes.map(function () { return 1; });
        if (totalDays < phaseCount) {
            // Cannot give 1 day each — give whatever we can, last phase eats the rest.
            for (var k = 0; k < phaseCount; k++) { durations[k] = 1; }
            durations[phaseCount - 1] = Math.max(1, totalDays - (phaseCount - 1));
            return durations;
        }
        var remaining = totalDays - phaseCount;
        var allocated = 0;
        for (var i = 0; i < phaseCount - 1; i++) {
            var extra = Math.floor(remaining * (weights[i] / weightSum));
            durations[i] = 1 + extra;
            allocated += durations[i];
        }
        durations[phaseCount - 1] = Math.max(1, totalDays - allocated);
        return durations;
    }

    function blastRadiusForPhase(profileBlast, trafficPercent) {
        // Scaled by traffic; shadow=1 floor
        if (trafficPercent <= 0) { return 1; }
        var scaled = Math.ceil(profileBlast * (trafficPercent / 100));
        return clamp(scaled, 1, 5);
    }

    function adjustKpi(kpi, appetite) {
        var factor = appetite === 'cautious' ? 0.85
            : appetite === 'aggressive' ? 1.15 : 1.0;
        var t = kpi.target;
        var adjusted;
        if (kpi.comparator === '<=') {
            // tighten=smaller; cautious -> smaller; aggressive -> larger.
            adjusted = appetite === 'cautious' ? t * factor
                : appetite === 'aggressive' ? t * factor : t;
        } else if (kpi.comparator === '>=') {
            // tighten=larger; cautious -> larger; aggressive -> smaller.
            adjusted = appetite === 'cautious' ? t * (2 - factor)
                : appetite === 'aggressive' ? t * (2 - factor) : t;
        } else {
            adjusted = t;
        }
        // Round nicely
        if (Math.abs(adjusted) >= 1) {
            adjusted = Math.round(adjusted * 100) / 100;
        } else {
            adjusted = Math.round(adjusted * 10000) / 10000;
        }
        return { name: kpi.name, target: adjusted, comparator: kpi.comparator, unit: kpi.unit || null };
    }

    function buildKpis(profile) {
        var base = [
            { name: 'error_rate', target: 0.005, comparator: '<=', unit: 'ratio' },
            { name: 'latency_p95', target: 800, comparator: '<=', unit: 'ms' },
            { name: 'task_completion', target: 0.9, comparator: '>=', unit: 'ratio' },
            { name: 'cost_per_task', target: 0.05, comparator: '<=', unit: 'usd' }
        ];
        if (profile.autonomyLevel === 'L0_observe' ||
            profile.autonomyLevel === 'L1_suggest' ||
            profile.autonomyLevel === 'L2_act_with_approval') {
            base.push({ name: 'approval_rate', target: 0.7, comparator: '>=', unit: 'ratio' });
        }
        if (profile.domain === 'finance') {
            base.push({ name: 'false_positive_rate', target: 0.02, comparator: '<=', unit: 'ratio' });
        } else if (profile.domain === 'healthcare') {
            base.push({ name: 'hallucination_rate', target: 0.01, comparator: '<=', unit: 'ratio' });
        } else if (profile.domain === 'support') {
            base.push({ name: 'csat', target: 0.85, comparator: '>=', unit: 'ratio' });
        } else if (profile.domain === 'devops') {
            base.push({ name: 'mttr_minutes', target: 30, comparator: '<=', unit: 'minutes' });
        }
        return base.map(function (k) { return adjustKpi(k, profile.riskAppetite); });
    }

    function rollbackTriggersFor(kpis, profile) {
        var triggers = [];
        kpis.forEach(function (k) {
            if (k.name === 'error_rate') {
                triggers.push('error_rate > ' + (k.target * 2) + ' for 5m');
            } else if (k.name === 'latency_p95') {
                triggers.push('latency_p95 > ' + Math.round(k.target * 1.5) + 'ms for 5m');
            }
        });
        triggers.push('any P0 alert fires');
        triggers.push('manual stop invoked by approver');
        if (profile.domain === 'finance') {
            triggers.push('reconciliation mismatch count > 0');
        } else if (profile.domain === 'healthcare') {
            triggers.push('PHI leak signal detected');
        } else if (profile.domain === 'devops') {
            triggers.push('change-failure rate > 15%');
        }
        return triggers;
    }

    function monitorChecklist(phase, profile) {
        var list = [
            'confirm dashboards green at +15m, +1h, +' + Math.max(2, phase.durationDays * 4) + 'h',
            'compare KPIs against baseline cohort',
            'review error fingerprint clusters',
            'spot-check 10 sample interactions for quality regressions'
        ];
        if (profile.autonomyLevel === 'L3_act' || profile.autonomyLevel === 'L4_autonomous') {
            list.push('audit autonomous-action log for unintended scope');
        }
        return list;
    }

    function goNoGoMatrix(profile, riskScore) {
        var matrix = [
            { gate: 'shadow_traffic_clean', owner: 'sre', severity: 'P1' },
            { gate: 'canary_error_budget_intact', owner: 'sre', severity: 'P0' },
            { gate: 'kpi_baseline_recorded', owner: 'product', severity: 'P1' },
            { gate: 'rollback_drill_executed', owner: 'sre', severity: 'P2' }
        ];
        if (profile.autonomyLevel === 'L0_observe' ||
            profile.autonomyLevel === 'L1_suggest' ||
            profile.autonomyLevel === 'L2_act_with_approval') {
            matrix.push({ gate: 'human_in_loop_signoff', owner: 'product', severity: 'P0' });
        }
        if (profile.domain === 'finance' || profile.domain === 'healthcare' || riskScore >= 70) {
            matrix.push({ gate: 'security_review_complete', owner: 'security', severity: 'P0' });
        }
        if (profile.domain === 'healthcare') {
            matrix.push({ gate: 'compliance_signoff_hipaa', owner: 'compliance', severity: 'P0' });
        }
        if (profile.domain === 'finance') {
            matrix.push({ gate: 'compliance_signoff_finreg', owner: 'compliance', severity: 'P0' });
        }
        return matrix;
    }

    function approvalBlock(profile, riskScore) {
        var required = false;
        var approvers = [];
        var reasons = [];
        if (profile.autonomyLevel === 'L3_act' || profile.autonomyLevel === 'L4_autonomous') {
            required = true;
            reasons.push('autonomy_level=' + profile.autonomyLevel);
            approvers.push('security', 'sre', 'product');
        }
        if (profile.domain === 'finance') {
            required = true;
            reasons.push('regulated_domain=finance');
            approvers.push('security', 'compliance', 'legal');
        }
        if (profile.domain === 'healthcare') {
            required = true;
            reasons.push('regulated_domain=healthcare');
            approvers.push('security', 'compliance', 'legal');
        }
        if (profile.blastRadius >= 4) {
            required = true;
            reasons.push('blast_radius=' + profile.blastRadius);
            if (approvers.indexOf('sre') === -1) { approvers.push('sre'); }
        }
        if (riskScore >= 70) {
            required = true;
            reasons.push('risk_score=' + riskScore);
            if (approvers.indexOf('security') === -1) { approvers.push('security'); }
        }
        // Dedup while preserving order
        var seen = {};
        approvers = approvers.filter(function (a) {
            if (seen[a]) { return false; }
            seen[a] = true; return true;
        });
        return {
            required: required,
            approvers: required ? approvers : [],
            reason: required ? reasons.join(', ') : 'no_approval_required'
        };
    }

    function warningsFor(profile, riskScore, strategy, target) {
        var w = [];
        if (profile.trustScore < 60) {
            w.push('low_trust_score:' + profile.trustScore + ' — extend canary or strengthen gates');
        }
        if (profile.priorIncidents >= 3) {
            w.push('prior_incidents=' + profile.priorIncidents + ' in last 30d — require incident post-mortem signoff');
        }
        if (profile.autonomyLevel === 'L4_autonomous' && target.audience === 'public') {
            w.push('L4_autonomous on public audience — require human-in-loop fallback');
        }
        if (strategy === 'big_bang_blocked') {
            w.push('big_bang_blocked: high-risk autonomous agent cannot ship at 100% in one shot — staged plan substituted');
        }
        if (profile.blastRadius === 5) {
            w.push('blast_radius=5 — full org/customer impact possible; require disaster-recovery rehearsal');
        }
        return w;
    }

    function observabilityFor(profile, kpis) {
        var signals = kpis.map(function (k) { return k.name; });
        if (signals.indexOf('error_rate') === -1) { signals.push('error_rate'); }
        if (signals.indexOf('latency_p95') === -1) { signals.push('latency_p95'); }
        var dashboards = [
            'agentbox/rollout-overview',
            'agentbox/agent-' + (profile.name || 'unnamed').toLowerCase().replace(/[^a-z0-9]+/g, '-'),
            'agentbox/error-fingerprints'
        ];
        var alerts = kpis.map(function (k) {
            var threshold;
            if (k.comparator === '<=') { threshold = '> ' + (k.target * 1.5); }
            else if (k.comparator === '>=') { threshold = '< ' + (Math.round(k.target * 0.85 * 100) / 100); }
            else { threshold = '!= ' + k.target; }
            var sev = (k.name === 'error_rate' || k.name === 'hallucination_rate' || k.name === 'false_positive_rate')
                ? 'P0' : 'P1';
            return { signal: k.name, threshold: threshold, severity: sev };
        });
        return { requiredSignals: signals, dashboards: dashboards, alerts: alerts };
    }

    function entryGatesFor(index, phase) {
        var gates = [];
        if (index === 0) {
            gates.push('kpi_baseline_recorded');
            gates.push('rollback_drill_executed');
        } else {
            gates.push('previous_phase_exit_gates_passed');
        }
        if (phase.trafficPercent === 0) {
            gates.push('shadow_mirror_configured');
        } else {
            gates.push('feature_flag_set_to_' + phase.trafficPercent + 'pct');
        }
        return gates;
    }

    function exitGatesFor(index, totalPhases, phase) {
        var gates = ['all_kpis_within_target', 'no_open_P0_alerts'];
        if (phase.trafficPercent < 100 && index === totalPhases - 1) {
            gates.push('full_rollout_signoff');
        }
        if (phase.trafficPercent >= 50) {
            gates.push('cost_per_task_within_budget');
        }
        return gates;
    }

    function selectStrategy(profile, target, riskScore) {
        var envCount = target.environments.length;
        var regionCount = target.regions.length;
        var bigBang =
            riskScore >= 85 &&
            (profile.autonomyLevel === 'L3_act' || profile.autonomyLevel === 'L4_autonomous') &&
            target.maxTrafficPercent === 100;
        if (bigBang) {
            return { strategy: 'big_bang_blocked', rationale: 'High risk + high autonomy + 100% target traffic. Forcing a phased plan and surfacing a blocking warning.' };
        }
        if (target.audience === 'public' && envCount >= 2) {
            return { strategy: 'canary_then_progressive', rationale: 'Public audience with multiple environments — progressive canary in prod after staging soak.' };
        }
        if (envCount >= 3) {
            return { strategy: 'staged_environments', rationale: envCount + ' environments declared — promote through each gate by gate.' };
        }
        if (regionCount >= 2) {
            return { strategy: 'parallel_cohorts', rationale: regionCount + ' regions declared — phase cohorts across regions in parallel.' };
        }
        return { strategy: 'canary_then_progressive', rationale: 'Default progressive canary into single prod environment.' };
    }

    function buildPhases(profile, target, riskScore, phaseCount, strategy) {
        var includeShadow = (phaseCount >= 5) || strategy === 'big_bang_blocked';
        var shapes = buildPhaseShapes(phaseCount, target.maxTrafficPercent, includeShadow);
        // shapes.length should == phaseCount because phaseCount drives buildPhaseShapes(remaining = phaseCount - (shadow?1:0))
        // Edge: if includeShadow and phaseCount<2, drop shadow
        while (shapes.length > phaseCount) { shapes.shift(); }
        while (shapes.length < phaseCount) {
            shapes.push({ name: 'Full Rollout', trafficPercent: target.maxTrafficPercent });
        }
        // Ensure last phase hits exact maxTraffic
        shapes[shapes.length - 1].trafficPercent = target.maxTrafficPercent;
        if (shapes[shapes.length - 1].trafficPercent >= 100) {
            shapes[shapes.length - 1].name = 'Full Rollout';
        } else if (shapes[shapes.length - 1].trafficPercent >= 50) {
            shapes[shapes.length - 1].name = 'Ramp ' + shapes[shapes.length - 1].trafficPercent + '%';
        } else {
            shapes[shapes.length - 1].name = 'Canary ' + shapes[shapes.length - 1].trafficPercent + '%';
        }

        var durations = distributeDurations(target.timelineDays, phaseCount, shapes);
        var envs = target.environments;
        var kpis = buildKpis(profile);
        var rollbacks = rollbackTriggersFor(kpis, profile);

        var phases = shapes.map(function (s, idx) {
            var env = envs[Math.min(idx, envs.length - 1)];
            // For canary_then_progressive, push prod once trafficPercent > 0 and envs includes prod
            if (envs.length >= 2 && s.trafficPercent === 0) { env = envs[0]; }
            var phase = {
                index: idx,
                name: 'Phase ' + (idx + 1) + ' – ' + s.name,
                environment: env,
                trafficPercent: s.trafficPercent,
                durationDays: durations[idx],
                blastRadius: blastRadiusForPhase(profile.blastRadius, s.trafficPercent),
                entryGates: [],
                exitGates: [],
                kpis: kpis.map(function (k) { return { name: k.name, target: k.target, comparator: k.comparator, unit: k.unit }; }),
                rollbackTriggers: rollbacks.slice(),
                monitorChecklist: []
            };
            phase.entryGates = entryGatesFor(idx, phase);
            phase.exitGates = exitGatesFor(idx, phaseCount, phase);
            phase.monitorChecklist = monitorChecklist(phase, profile);
            return phase;
        });
        return phases;
    }

    function rollbackPlan(profile, riskScore) {
        var minutes = 5;
        if (profile.blastRadius >= 4) { minutes += 10; }
        if (riskScore >= 70) { minutes += 10; }
        if (profile.autonomyLevel === 'L3_act' || profile.autonomyLevel === 'L4_autonomous') { minutes += 5; }
        return {
            automated: [
                'flip feature flag to 0%',
                'drain in-flight tasks to fallback handler',
                'snapshot agent state + decision log for postmortem'
            ],
            manualEscalation: [
                'page on-call SRE',
                'notify approvers listed in approval.approvers',
                'open incident channel #rollout-' + (profile.name || 'agent').toLowerCase().replace(/[^a-z0-9]+/g, '-')
            ],
            estimatedTimeMinutes: minutes
        };
    }

    function plan(agentProfile, target, options) {
        var profile = normalizeProfile(agentProfile);
        var tgt = normalizeTarget(target);
        var opts = options || {};
        var riskScore = computeRiskScore(profile);
        var strat = selectStrategy(profile, tgt, riskScore);

        var phaseCount;
        if (strat.strategy === 'big_bang_blocked') {
            phaseCount = isFiniteNum(opts.phaseCount) ? clamp(Math.round(opts.phaseCount), 1, 8) : 6;
        } else {
            phaseCount = recommendPhaseCount(riskScore, opts.phaseCount);
        }

        var phases = buildPhases(profile, tgt, riskScore, phaseCount, strat.strategy);
        var perPhaseDays = phases.map(function (p) { return p.durationDays; });
        var totalDays = perPhaseDays.reduce(function (a, b) { return a + b; }, 0);

        var startMs = toEpoch(opts.now);
        var endMs = startMs + totalDays * 86400000;
        var timeline = {
            totalDays: totalDays,
            perPhaseDays: perPhaseDays,
            startsAt: toIso(startMs) || null,
            endsAt: toIso(endMs) || null
        };

        var kpis = phases[0] ? phases[0].kpis : buildKpis(profile);

        return {
            agent: {
                name: profile.name,
                trustScore: profile.trustScore,
                autonomyLevel: profile.autonomyLevel,
                riskAppetite: profile.riskAppetite,
                domain: profile.domain,
                blastRadius: profile.blastRadius,
                priorIncidents: profile.priorIncidents,
                capabilityCount: profile.capabilityCount
            },
            target: tgt,
            riskScore: riskScore,
            strategy: strat.strategy,
            rationale: strat.rationale,
            recommendedPhaseCount: phaseCount,
            phases: phases,
            goNoGoMatrix: goNoGoMatrix(profile, riskScore),
            rollbackPlan: rollbackPlan(profile, riskScore),
            observability: observabilityFor(profile, kpis),
            warnings: warningsFor(profile, riskScore, strat.strategy, tgt),
            approval: approvalBlock(profile, riskScore),
            timeline: timeline
        };
    }

    function simulate(planObj, phaseOutcomes) {
        var outcomes = Array.isArray(phaseOutcomes) ? phaseOutcomes : [];
        var phases = planObj && Array.isArray(planObj.phases) ? planObj.phases : [];
        var advanced = -1;
        for (var i = 0; i < Math.min(outcomes.length, phases.length); i++) {
            var o = outcomes[i] || {};
            if (o.pass === true) {
                advanced = i;
                continue;
            }
            var breach = o.breachedKpi || null;
            var reason = breach || o.note || 'manual_halt';
            var rec;
            if (i === 0) {
                rec = 'hard_stop';
            } else if (breach === 'error_rate' || breach === 'latency_p95') {
                rec = 'rollback_to_previous_phase';
            } else if (breach === 'approval_rate' || breach === 'task_completion') {
                rec = 'pause_and_investigate';
            } else {
                // unknown / other -> escalate to approvers
                rec = 'escalate_to_approvers';
            }
            return {
                advancedThrough: advanced,
                haltedAt: i,
                reason: reason,
                recommendation: rec
            };
        }
        return {
            advancedThrough: advanced,
            haltedAt: null,
            reason: advanced + 1 === phases.length ? 'all_phases_passed' : 'no_more_outcomes_supplied',
            recommendation: advanced + 1 === phases.length ? 'promote_to_steady_state' : 'continue'
        };
    }

    // ---------- formatters ----------

    function formatJson(planObj) {
        return JSON.stringify(planObj, null, 2);
    }

    function kpiLine(k) {
        return k.name + ' ' + k.comparator + ' ' + k.target + (k.unit ? ' ' + k.unit : '');
    }

    function formatMarkdown(planObj) {
        var p = planObj || {};
        var lines = [];
        var name = (p.agent && p.agent.name) || 'unnamed';
        lines.push('# Rollout Plan – ' + name);
        lines.push('');
        lines.push('**Strategy:** `' + p.strategy + '`  ');
        lines.push('**Risk score:** ' + p.riskScore + '/100  ');
        lines.push('**Recommended phases:** ' + p.recommendedPhaseCount + '  ');
        lines.push('**Timeline:** ' + (p.timeline ? p.timeline.totalDays : '?') + ' days  ');
        lines.push('');
        lines.push('> ' + (p.rationale || ''));
        lines.push('');
        lines.push('## Phases');
        lines.push('');
        lines.push('| # | Name | Env | Traffic | Days | Blast | KPIs |');
        lines.push('|---|------|-----|---------|------|-------|------|');
        (p.phases || []).forEach(function (ph) {
            lines.push('| ' + (ph.index + 1) +
                ' | ' + ph.name +
                ' | ' + ph.environment +
                ' | ' + ph.trafficPercent + '% ' +
                ' | ' + ph.durationDays +
                ' | ' + ph.blastRadius +
                ' | ' + ph.kpis.map(kpiLine).join('; ') + ' |');
        });
        lines.push('');
        lines.push('## Go / No-Go Gates');
        (p.goNoGoMatrix || []).forEach(function (g) {
            lines.push('- [' + g.severity + '] ' + g.gate + ' (owner: ' + g.owner + ')');
        });
        lines.push('');
        lines.push('## Rollback Plan');
        lines.push('Estimated rollback time: **' + (p.rollbackPlan ? p.rollbackPlan.estimatedTimeMinutes : '?') + ' min**');
        lines.push('');
        lines.push('**Automated:**');
        (p.rollbackPlan && p.rollbackPlan.automated || []).forEach(function (s) { lines.push('- ' + s); });
        lines.push('');
        lines.push('**Manual escalation:**');
        (p.rollbackPlan && p.rollbackPlan.manualEscalation || []).forEach(function (s) { lines.push('- ' + s); });
        lines.push('');
        lines.push('## Observability');
        lines.push('Signals: ' + (p.observability ? p.observability.requiredSignals.join(', ') : ''));
        lines.push('Dashboards: ' + (p.observability ? p.observability.dashboards.join(', ') : ''));
        (p.observability && p.observability.alerts || []).forEach(function (a) {
            lines.push('- alert [' + a.severity + '] ' + a.signal + ' ' + a.threshold);
        });
        lines.push('');
        lines.push('## Approval');
        if (p.approval && p.approval.required) {
            lines.push('**Required** — approvers: ' + p.approval.approvers.join(', '));
            lines.push('Reason: ' + p.approval.reason);
        } else {
            lines.push('Not required.');
        }
        if (p.warnings && p.warnings.length) {
            lines.push('');
            lines.push('## ⚠ Warnings');
            p.warnings.forEach(function (w) { lines.push('- ' + w); });
        }
        return lines.join('\n');
    }

    function formatText(planObj) {
        var p = planObj || {};
        var lines = [];
        var name = (p.agent && p.agent.name) || 'unnamed';
        lines.push('Rollout Plan – ' + name);
        lines.push('Strategy: ' + p.strategy);
        lines.push('Risk score: ' + p.riskScore + '/100');
        lines.push('Recommended phases: ' + p.recommendedPhaseCount);
        lines.push('Timeline: ' + (p.timeline ? p.timeline.totalDays : '?') + ' days');
        lines.push('Rationale: ' + (p.rationale || ''));
        lines.push('');
        lines.push('Phases:');
        (p.phases || []).forEach(function (ph) {
            lines.push('  ' + (ph.index + 1) + '. ' + ph.name +
                ' [' + ph.environment + ', ' + ph.trafficPercent + '%, ' +
                ph.durationDays + 'd, blast=' + ph.blastRadius + ']');
            lines.push('     entry: ' + ph.entryGates.join('; '));
            lines.push('     exit:  ' + ph.exitGates.join('; '));
            lines.push('     kpis:  ' + ph.kpis.map(kpiLine).join('; '));
            lines.push('     rollback: ' + ph.rollbackTriggers.join('; '));
        });
        lines.push('');
        lines.push('Go/No-Go gates:');
        (p.goNoGoMatrix || []).forEach(function (g) {
            lines.push('  [' + g.severity + '] ' + g.gate + ' (owner: ' + g.owner + ')');
        });
        lines.push('');
        lines.push('Rollback plan (~' + (p.rollbackPlan ? p.rollbackPlan.estimatedTimeMinutes : '?') + ' min):');
        (p.rollbackPlan && p.rollbackPlan.automated || []).forEach(function (s) { lines.push('  auto: ' + s); });
        (p.rollbackPlan && p.rollbackPlan.manualEscalation || []).forEach(function (s) { lines.push('  manual: ' + s); });
        lines.push('');
        lines.push('Observability:');
        lines.push('  signals: ' + (p.observability ? p.observability.requiredSignals.join(', ') : ''));
        lines.push('  dashboards: ' + (p.observability ? p.observability.dashboards.join(', ') : ''));
        (p.observability && p.observability.alerts || []).forEach(function (a) {
            lines.push('  alert [' + a.severity + '] ' + a.signal + ' ' + a.threshold);
        });
        lines.push('');
        if (p.approval && p.approval.required) {
            lines.push('Approval REQUIRED — approvers: ' + p.approval.approvers.join(', '));
            lines.push('  reason: ' + p.approval.reason);
        } else {
            lines.push('Approval not required.');
        }
        if (p.warnings && p.warnings.length) {
            lines.push('');
            lines.push('Warnings:');
            p.warnings.forEach(function (w) { lines.push('  ! ' + w); });
        }
        return lines.join('\n');
    }

    return {
        plan: plan,
        simulate: simulate,
        formatMarkdown: formatMarkdown,
        formatText: formatText,
        formatJson: formatJson,
        // exposed for testing
        _internal: {
            computeRiskScore: computeRiskScore,
            recommendPhaseCount: recommendPhaseCount,
            normalizeProfile: normalizeProfile,
            normalizeTarget: normalizeTarget
        }
    };
}));
