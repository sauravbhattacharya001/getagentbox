/**
 * AgentBudgetGuardianAdvisor - agentic per-agent budget/spend guardian.
 *
 * Inputs a fleet of agents with budget + spend telemetry, emits per-agent
 * verdicts and a portfolio-level P0-first deduped playbook for cost-control
 * actions BEFORE the budget blows up.
 *
 * Verdicts:
 *   WITHIN_BUDGET | MONITOR | THROTTLE_RATE | FREEZE_NON_CRITICAL |
 *   ESCALATE_BUDGET_REVIEW | INEFFICIENT_SPEND | INSUFFICIENT_DATA
 *
 * 5th sibling to:
 *   - AgentTriageAdvisor
 *   - AgentRolloutPlanner
 *   - AgentDriftDetector
 *   - AgentToolPolicyAdvisor
 *
 * Pure JS, zero deps, UMD wrapper, deterministic given injectable now().
 *
 * Public API (factory):
 *   const advisor = createAgentBudgetGuardianAdvisor({ now });
 *   const report  = advisor.analyze({ agents, options });
 *   const sim     = advisor.simulate({ applyTop: N }, report);
 *   advisor.formatText(report) / formatMarkdown(report) / formatJson(report);
 */
(function (root, factory) {
    'use strict';
    if (typeof module === 'object' && module.exports) {
        module.exports = factory();
    } else {
        root.AgentBudgetGuardianAdvisor = factory();
    }
}(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    var VERSION = '1.0.0';

    var APPETITE_MULT = { cautious: 1.10, balanced: 1.0, aggressive: 0.90 };
    var APPETITE_SHIFT = { cautious: 5, balanced: 0, aggressive: -5 };

    var PRIORITY_RANK = { P0: 0, P1: 1, P2: 2, P3: 3 };

    // ── utils ────────────────────────────────────────────────────────

    function clamp(v, lo, hi) { return v < lo ? lo : (v > hi ? hi : v); }
    function isNum(v) { return typeof v === 'number' && isFinite(v); }

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

    // ── core per-agent computation ───────────────────────────────────

    function trendSlope(arr) {
        if (!arr || arr.length < 2) return 0;
        var first = arr[0], last = arr[arr.length - 1];
        return (last - first) / Math.max(1, arr.length - 1);
    }

    function computeAgent(agent, appetite) {
        var mult = APPETITE_MULT[appetite] || 1.0;
        var name = agent.name || agent.id;
        var tier = agent.tier || 'production';
        var autonomy = isNum(agent.autonomyLevel) ? agent.autonomyLevel : 1;
        var budget = isNum(agent.monthlyBudgetUsd) ? agent.monthlyBudgetUsd : 0;
        var spent  = isNum(agent.spentSoFarUsd) ? agent.spentSoFarUsd : 0;
        var elapsed = isNum(agent.periodDaysElapsed) ? agent.periodDaysElapsed : 0;
        var total = isNum(agent.periodDaysTotal) && agent.periodDaysTotal > 0 ? agent.periodDaysTotal : 30;
        var callsLast24h = isNum(agent.callsLast24h) ? agent.callsLast24h : 0;
        var avgCost = isNum(agent.avgCostPerCall) ? agent.avgCostPerCall : 0;
        var trend = Array.isArray(agent.costTrend) ? agent.costTrend.slice() : [];
        var success = isNum(agent.taskSuccessRate) ? agent.taskSuccessRate : null;
        var value = isNum(agent.valueDeliveredUsd) ? agent.valueDeliveredUsd : null;

        // Insufficient data branch
        if (elapsed < 1 || budget <= 0) {
            return {
                id: agent.id,
                name: name,
                verdict: 'INSUFFICIENT_DATA',
                priority: 'P3',
                riskScore: 0,
                projectedSpendUsd: 0,
                projectedOverrunPct: 0,
                burnRate: 0,
                roiRatio: null,
                reasons: [{ code: 'NO_TELEMETRY', label: 'periodDaysElapsed < 1 or budget <= 0', weight: 50 }],
                recommendedAction: { kind: 'instrument_cost_telemetry', reason: 'cannot project without baseline' }
            };
        }

        var projectedSpend;
        if (elapsed > 0) {
            projectedSpend = spent / elapsed * total;
        } else {
            projectedSpend = avgCost * callsLast24h * total;
        }
        var projectedOverrunPct = (projectedSpend - budget) / budget * 100;
        var burnRate = spent / elapsed;
        var roiRatio = (value !== null && spent > 0) ? value / spent : null;
        var slope = trendSlope(trend);
        var risingTrend = trend.length >= 2 && trend[0] > 0 && slope > 0.10 * trend[0];

        // riskScore components (raw 0-100)
        var overrunComp = clamp(projectedOverrunPct, 0, 100) * 0.40 * 2.5; // up to 100
        // We want overrun 0->0, 40->40, 100->100 contribution; cap component at 40
        overrunComp = clamp(projectedOverrunPct, 0, 100) * 0.40;
        var trendComp = risingTrend ? 20 : (slope > 0 ? 10 : 0);
        var successComp = (success !== null && success < 0.7) ? (0.7 - success) * 15 / 0.7 + 5 : 0;
        var roiComp = (roiRatio !== null && roiRatio < 1.0) ? (1.0 - Math.max(0, roiRatio)) * 15 : 0;
        var autonomyTierMult = autonomy * (tier === 'production' ? 1.0 : (tier === 'experimental' ? 0.6 : 0.8));
        var autonomyComp = clamp(autonomyTierMult, 0, 10);

        var raw = overrunComp + trendComp + successComp + roiComp + autonomyComp;
        var riskScore = clamp(Math.round(raw * mult), 0, 100);

        // Reasons (sorted weight desc, code asc)
        var reasons = [];
        if (projectedOverrunPct > 0) {
            reasons.push({ code: 'PROJECTED_OVERRUN', label: 'Projected overrun ' + Math.round(projectedOverrunPct) + '%', weight: Math.round(clamp(projectedOverrunPct, 0, 100)) });
        }
        if (risingTrend) {
            reasons.push({ code: 'RISING_UNIT_COST', label: 'Unit cost trending up across recent window', weight: 25 });
        }
        if (success !== null && success < 0.7) {
            reasons.push({ code: 'LOW_TASK_SUCCESS', label: 'Task success ' + Math.round(success * 100) + '% < 70%', weight: 18 });
        }
        if (roiRatio !== null && roiRatio < 1.0) {
            reasons.push({ code: 'LOW_ROI', label: 'ROI ratio ' + roiRatio.toFixed(2) + ' < 1.0', weight: 22 });
        }
        if (autonomy >= 4 && tier === 'production') {
            reasons.push({ code: 'HIGH_AUTONOMY_PROD', label: 'Autonomy ' + autonomy + ' in production', weight: 10 });
        }
        if (reasons.length === 0) {
            reasons.push({ code: 'NOMINAL', label: 'No active cost signals', weight: 1 });
        }

        // Verdict
        var verdict, priority, recommendedAction;
        var inefficient = roiRatio !== null && roiRatio < 1.0 && spent >= 0.25 * budget;

        if (projectedOverrunPct > 40) {
            if (tier === 'production') {
                verdict = 'ESCALATE_BUDGET_REVIEW';
                priority = 'P0';
                recommendedAction = {
                    kind: 'request_budget_increase',
                    suggestedValue: Math.ceil(projectedSpend * 1.1),
                    reason: 'production-tier overrun > 40%'
                };
            } else {
                verdict = 'FREEZE_NON_CRITICAL';
                priority = 'P0';
                recommendedAction = { kind: 'pause_agent', reason: 'non-production overrun > 40%' };
            }
        } else if (projectedOverrunPct > 15) {
            verdict = 'THROTTLE_RATE';
            priority = 'P1';
            var targetReductionPct = clamp(projectedOverrunPct, 15, 40);
            recommendedAction = {
                kind: 'reduce_calls_per_day',
                suggestedValue: Math.ceil(callsLast24h * (1 - targetReductionPct / 100)),
                reason: 'overrun ' + Math.round(projectedOverrunPct) + '% within throttleable band'
            };
        } else if (projectedOverrunPct > 0 || risingTrend) {
            verdict = 'MONITOR';
            priority = 'P2';
            recommendedAction = { kind: 'alert_owner_on_overrun', reason: 'mild pressure, watch trend' };
        } else {
            verdict = 'WITHIN_BUDGET';
            priority = 'P3';
            recommendedAction = { kind: 'none', reason: 'pacing on track' };
        }

        // INEFFICIENT_SPEND only "upgrades" verdict if current verdict is at
        // P2/P3 (lower priority). Otherwise it sets a co-flag in reasons only.
        if (inefficient) {
            if (PRIORITY_RANK[priority] > PRIORITY_RANK.P1) {
                verdict = 'INEFFICIENT_SPEND';
                priority = 'P1';
                recommendedAction = {
                    kind: 'review_prompt_or_model',
                    reason: 'roiRatio ' + roiRatio.toFixed(2) + ' below 1.0 after >=25% budget spend'
                };
            }
        }

        // Sort reasons
        reasons.sort(function (a, b) {
            if (b.weight !== a.weight) return b.weight - a.weight;
            return a.code < b.code ? -1 : (a.code > b.code ? 1 : 0);
        });

        return {
            id: agent.id,
            name: name,
            verdict: verdict,
            priority: priority,
            riskScore: riskScore,
            projectedSpendUsd: Math.round(projectedSpend * 100) / 100,
            projectedOverrunPct: Math.round(projectedOverrunPct * 10) / 10,
            burnRate: Math.round(burnRate * 100) / 100,
            roiRatio: roiRatio !== null ? Math.round(roiRatio * 100) / 100 : null,
            reasons: reasons,
            recommendedAction: recommendedAction,
            tier: tier,
            inefficient: inefficient,
            risingTrend: risingTrend
        };
    }

    // ── portfolio synthesis ──────────────────────────────────────────

    function gradeFromState(anyP0, p1Count, p2Count, portfolioOverrunPct) {
        if (anyP0 || (isFinite(portfolioOverrunPct) && portfolioOverrunPct > 25)) return 'F';
        if (p1Count >= 2) return 'D';
        if (p1Count >= 1) return 'C';
        if (p2Count >= 1) return 'B';
        return 'A';
    }

    function bandFromRisk(meanRisk) {
        if (meanRisk >= 80) return 'CRITICAL';
        if (meanRisk >= 60) return 'HIGH';
        if (meanRisk >= 40) return 'ELEVATED';
        if (meanRisk >= 20) return 'WATCH';
        return 'CALM';
    }

    function buildPlaybook(perAgent, totalProjectedSpend, portfolioCapUsd, portfolioOverrunPct, anyInsufficient) {
        var actions = [];
        var byVerdict = {};
        perAgent.forEach(function (a) {
            (byVerdict[a.verdict] = byVerdict[a.verdict] || []).push(a);
        });

        var freezes = byVerdict.FREEZE_NON_CRITICAL || [];
        var throttles = byVerdict.THROTTLE_RATE || [];
        var escalates = byVerdict.ESCALATE_BUDGET_REVIEW || [];
        var inefficient = byVerdict.INEFFICIENT_SPEND || [];

        if (freezes.length >= 2) {
            actions.push({
                id: 'FREEZE_FLEET_NON_CRITICAL',
                priority: 'P0',
                label: 'Freeze ' + freezes.length + ' non-critical agents',
                reason: 'Multiple experimental/internal agents projected > 40% over budget',
                owner: 'platform',
                blastRadius: 4,
                reversibility: 'high',
                agentIds: freezes.map(function (a) { return a.id; }).sort()
            });
        }

        if (escalates.length >= 1 || (isFinite(portfolioOverrunPct) && portfolioOverrunPct > 25)) {
            actions.push({
                id: 'EMERGENCY_BUDGET_REVIEW',
                priority: 'P0',
                label: 'Open emergency budget review',
                reason: escalates.length >= 1
                    ? 'Production-tier agent(s) projected > 40% over budget'
                    : 'Fleet overrun > 25% vs portfolio cap',
                owner: 'finance',
                blastRadius: 5,
                reversibility: 'medium',
                agentIds: escalates.map(function (a) { return a.id; }).sort()
            });
        }

        if (throttles.length >= 2) {
            actions.push({
                id: 'INTRODUCE_RATE_LIMITS',
                priority: 'P1',
                label: 'Introduce per-agent rate limits',
                reason: throttles.length + ' agents in throttleable overrun band',
                owner: 'platform',
                blastRadius: 3,
                reversibility: 'high',
                agentIds: throttles.map(function (a) { return a.id; }).sort()
            });
        }

        if (inefficient.length >= 2) {
            actions.push({
                id: 'RIGHTSIZE_MODEL_TIER',
                priority: 'P1',
                label: 'Rightsize model tier across low-ROI agents',
                reason: inefficient.length + ' agents below 1.0 ROI after meaningful spend',
                owner: 'product',
                blastRadius: 3,
                reversibility: 'medium',
                agentIds: inefficient.map(function (a) { return a.id; }).sort()
            });
        }

        if (isFinite(portfolioCapUsd) && portfolioCapUsd > 0 && totalProjectedSpend >= 0.8 * portfolioCapUsd) {
            actions.push({
                id: 'NEGOTIATE_VOLUME_DISCOUNT',
                priority: 'P2',
                label: 'Negotiate volume discount with model provider',
                reason: 'Projected spend >= 80% of portfolio cap',
                owner: 'finance',
                blastRadius: 2,
                reversibility: 'high',
                agentIds: []
            });
        }

        if (anyInsufficient) {
            actions.push({
                id: 'INSTRUMENT_COST_TELEMETRY',
                priority: 'P2',
                label: 'Instrument cost telemetry on dark agents',
                reason: 'One or more agents missing spend telemetry',
                owner: 'platform',
                blastRadius: 1,
                reversibility: 'high',
                agentIds: perAgent.filter(function (a) { return a.verdict === 'INSUFFICIENT_DATA'; })
                                  .map(function (a) { return a.id; }).sort()
            });
        }

        if (actions.length === 0) {
            actions.push({
                id: 'MAINTAIN_OBSERVABILITY',
                priority: 'P3',
                label: 'Maintain observability cadence',
                reason: 'No active cost-control actions required',
                owner: 'platform',
                blastRadius: 1,
                reversibility: 'high',
                agentIds: []
            });
        }

        // Dedup by id (keep first)
        var seen = {}, deduped = [];
        actions.forEach(function (a) { if (!seen[a.id]) { seen[a.id] = true; deduped.push(a); } });

        deduped.sort(function (a, b) {
            if (PRIORITY_RANK[a.priority] !== PRIORITY_RANK[b.priority]) {
                return PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
            }
            return a.id < b.id ? -1 : (a.id > b.id ? 1 : 0);
        });

        return deduped;
    }

    function buildInsights(perAgent, totalProjectedSpend, portfolioOverrunPct) {
        var insights = [];
        var n = perAgent.length;
        if (n === 0) return insights;

        var risingCount = perAgent.filter(function (a) { return a.risingTrend; }).length;
        var lowRoi = perAgent.filter(function (a) { return a.roiRatio !== null && a.roiRatio < 1.0; }).length;
        var experimentalHot = perAgent.filter(function (a) {
            return a.tier !== 'production' && a.projectedOverrunPct > 25;
        }).length;
        var overrunImminent = perAgent.filter(function (a) { return a.projectedOverrunPct > 15; }).length;

        if (overrunImminent >= 1 || (isFinite(portfolioOverrunPct) && portfolioOverrunPct > 0)) {
            insights.push({ code: 'BUDGET_OVERRUN_IMMINENT', label: overrunImminent + ' agent(s) projected over budget' });
        }
        if (risingCount >= Math.ceil(n / 2)) {
            insights.push({ code: 'RISING_UNIT_COST_FLEETWIDE', label: risingCount + '/' + n + ' agents show rising unit cost' });
        }
        if (lowRoi >= 2) {
            insights.push({ code: 'ROI_BELOW_BREAKEVEN_CLUSTER', label: lowRoi + ' agents below 1.0 ROI' });
        }
        if (experimentalHot >= 1) {
            insights.push({ code: 'EXPERIMENTAL_TIER_BURNING_HOT', label: experimentalHot + ' experimental/internal agents > 25% over budget' });
        }
        if (insights.length === 0) {
            insights.push({ code: 'HEALTHY_PORTFOLIO', label: 'No active cost pressure' });
        }
        return insights;
    }

    // ── public factory ───────────────────────────────────────────────

    function createAgentBudgetGuardianAdvisor(factoryOpts) {
        factoryOpts = factoryOpts || {};
        var defaultNow = factoryOpts.now || function () { return new Date(); };

        function analyze(input) {
            input = input || {};
            // Deep-copy inputs so we never mutate caller data
            var agentsIn = Array.isArray(input.agents) ? input.agents.map(deepCopy) : [];
            var opts = deepCopy(input.options || {});
            var appetite = opts.risk_appetite || 'balanced';
            if (!APPETITE_MULT[appetite]) appetite = 'balanced';
            var portfolioCapUsd = isNum(opts.portfolioCapUsd) ? opts.portfolioCapUsd : null;
            var nowFn = opts.nowFn || defaultNow;
            var generatedAt = (typeof nowFn === 'function' ? nowFn() : new Date()).toISOString();

            var perAgent = agentsIn.map(function (a) { return computeAgent(a, appetite); });

            // Stable sort: riskScore desc, then id asc
            perAgent.sort(function (a, b) {
                if (b.riskScore !== a.riskScore) return b.riskScore - a.riskScore;
                return a.id < b.id ? -1 : (a.id > b.id ? 1 : 0);
            });

            var totalProjectedSpend = perAgent.reduce(function (s, a) { return s + a.projectedSpendUsd; }, 0);
            totalProjectedSpend = Math.round(totalProjectedSpend * 100) / 100;
            var portfolioOverrunPct = null;
            if (isNum(portfolioCapUsd) && portfolioCapUsd > 0) {
                portfolioOverrunPct = Math.round(((totalProjectedSpend - portfolioCapUsd) / portfolioCapUsd * 1000)) / 10;
            }

            var anyP0 = perAgent.some(function (a) { return a.priority === 'P0'; });
            var p1Count = perAgent.filter(function (a) { return a.priority === 'P1'; }).length;
            var p2Count = perAgent.filter(function (a) { return a.priority === 'P2'; }).length;
            var anyInsufficient = perAgent.some(function (a) { return a.verdict === 'INSUFFICIENT_DATA'; });

            var portfolioGrade = gradeFromState(anyP0, p1Count, p2Count, portfolioOverrunPct === null ? -Infinity : portfolioOverrunPct);

            var meanRisk = perAgent.length === 0 ? 0
                : perAgent.reduce(function (s, a) { return s + a.riskScore; }, 0) / perAgent.length;
            var shiftedRisk = clamp(meanRisk + (APPETITE_SHIFT[appetite] || 0), 0, 100);
            var band = bandFromRisk(shiftedRisk);

            var playbook = buildPlaybook(perAgent, totalProjectedSpend, portfolioCapUsd, portfolioOverrunPct, anyInsufficient);
            var insights = buildInsights(perAgent, totalProjectedSpend, portfolioOverrunPct);

            return {
                version: VERSION,
                generatedAt: generatedAt,
                riskAppetite: appetite,
                agents: perAgent,
                portfolio: {
                    totalProjectedSpendUsd: totalProjectedSpend,
                    portfolioCapUsd: portfolioCapUsd,
                    portfolioOverrunPct: portfolioOverrunPct,
                    grade: portfolioGrade,
                    band: band,
                    meanRiskScore: Math.round(shiftedRisk * 10) / 10
                },
                playbook: playbook,
                insights: insights
            };
        }

        function simulate(opts, report) {
            opts = opts || {};
            report = report || {};
            var applyTop = isNum(opts.applyTop) ? opts.applyTop : 1;
            var playbook = Array.isArray(report.playbook) ? report.playbook.slice(0, applyTop) : [];

            // Diminishing returns: each applied action shaves a share of overrun.
            var totalSpend = (report.portfolio && report.portfolio.totalProjectedSpendUsd) || 0;
            var cap = (report.portfolio && report.portfolio.portfolioCapUsd) || totalSpend;
            var savings = 0;
            var actionWeight = {
                FREEZE_FLEET_NON_CRITICAL: 0.35,
                EMERGENCY_BUDGET_REVIEW: 0.10,
                INTRODUCE_RATE_LIMITS: 0.20,
                RIGHTSIZE_MODEL_TIER: 0.15,
                NEGOTIATE_VOLUME_DISCOUNT: 0.08,
                INSTRUMENT_COST_TELEMETRY: 0.02,
                MAINTAIN_OBSERVABILITY: 0.0
            };
            playbook.forEach(function (a, i) {
                var w = actionWeight[a.id] || 0.05;
                var dampened = w * Math.pow(0.85, i);
                savings += totalSpend * dampened;
            });
            var projectedSpend = Math.max(0, totalSpend - savings);
            var projectedSpendRounded = Math.round(projectedSpend * 100) / 100;

            // Approximate projected band/grade by scaling meanRisk down proportionally.
            var meanRisk = (report.portfolio && report.portfolio.meanRiskScore) || 0;
            var ratio = totalSpend > 0 ? projectedSpend / totalSpend : 1;
            var projectedRisk = clamp(meanRisk * ratio, 0, 100);
            var projectedBand = bandFromRisk(projectedRisk);

            var projectedOverrunPct = (cap > 0) ? (projectedSpend - cap) / cap * 100 : 0;
            var projectedGrade;
            if (projectedOverrunPct > 25) projectedGrade = 'F';
            else if (projectedOverrunPct > 10) projectedGrade = 'D';
            else if (projectedOverrunPct > 0) projectedGrade = 'C';
            else if (projectedOverrunPct > -10) projectedGrade = 'B';
            else projectedGrade = 'A';

            return {
                projectedTotalSpendUsd: projectedSpendRounded,
                projectedRiskScore: Math.round(projectedRisk * 10) / 10,
                projectedBand: projectedBand,
                projectedGrade: projectedGrade,
                appliedActions: playbook.map(function (a) { return { id: a.id, priority: a.priority }; })
            };
        }

        function formatText(report) {
            var lines = [];
            var p = report.portfolio || {};
            lines.push('AgentBudgetGuardianAdvisor — ' + (report.riskAppetite || 'balanced'));
            lines.push('Portfolio: $' + p.totalProjectedSpendUsd + ' projected · grade ' + p.grade + ' · band ' + p.band +
                (p.portfolioCapUsd ? ' · cap $' + p.portfolioCapUsd + ' (' + p.portfolioOverrunPct + '%)' : ''));
            lines.push('');
            lines.push('Agents:');
            (report.agents || []).forEach(function (a, i) {
                lines.push('  ' + (i + 1) + '. [' + a.priority + '] ' + a.name + ' — ' + a.verdict +
                    ' (risk ' + a.riskScore + ', overrun ' + a.projectedOverrunPct + '%)');
            });
            lines.push('');
            lines.push('Playbook:');
            (report.playbook || []).forEach(function (act) {
                lines.push('  • [' + act.priority + '] ' + act.label + ' (' + act.owner + ')');
            });
            if (report.insights && report.insights.length) {
                lines.push('');
                lines.push('Insights:');
                report.insights.forEach(function (i) { lines.push('  • ' + i.code + ': ' + i.label); });
            }
            return lines.join('\n');
        }

        function formatMarkdown(report) {
            var p = report.portfolio || {};
            var out = [];
            out.push('# AgentBudgetGuardianAdvisor');
            out.push('');
            out.push('## Summary');
            out.push('');
            out.push('- Risk appetite: **' + (report.riskAppetite || 'balanced') + '**');
            out.push('- Projected spend: **$' + p.totalProjectedSpendUsd + '**');
            if (p.portfolioCapUsd) {
                out.push('- Portfolio cap: $' + p.portfolioCapUsd + ' (overrun **' + p.portfolioOverrunPct + '%**)');
            }
            out.push('- Grade: **' + p.grade + '** · Band: **' + p.band + '** · Mean risk: ' + p.meanRiskScore);
            out.push('');
            out.push('## Agents');
            out.push('');
            out.push('| Agent | Verdict | Score | Priority | Reasons |');
            out.push('|-------|---------|-------|----------|---------|');
            (report.agents || []).forEach(function (a) {
                var reasons = (a.reasons || []).map(function (r) { return r.code; }).join(', ');
                out.push('| ' + a.name + ' | ' + a.verdict + ' | ' + a.riskScore + ' | ' + a.priority + ' | ' + reasons + ' |');
            });
            out.push('');
            out.push('## Playbook');
            out.push('');
            (report.playbook || []).forEach(function (act) {
                out.push('- **[' + act.priority + '] ' + act.label + '** — ' + act.reason + ' _(owner: ' + act.owner +
                    ', blastRadius: ' + act.blastRadius + ', reversibility: ' + act.reversibility + ')_');
            });
            out.push('');
            out.push('## Insights');
            out.push('');
            (report.insights || []).forEach(function (i) {
                out.push('- **' + i.code + '** — ' + i.label);
            });
            return out.join('\n');
        }

        function formatJson(report) {
            return stableStringify(report, 2);
        }

        return {
            VERSION: VERSION,
            analyze: analyze,
            simulate: simulate,
            formatText: formatText,
            formatMarkdown: formatMarkdown,
            formatJson: formatJson
        };
    }

    return { createAgentBudgetGuardianAdvisor: createAgentBudgetGuardianAdvisor, VERSION: VERSION };
}));
