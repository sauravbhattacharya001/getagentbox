/**
 * AgentSlaComplianceAdvisor — agentic per-agent SLA / response-time / quality
 * compliance triage.
 *
 * 12th sibling to AgentTriageAdvisor / AgentRolloutPlanner / AgentDriftDetector /
 * AgentToolPolicyAdvisor / AgentBudgetGuardianAdvisor / AgentAutonomyTuningAdvisor /
 * AgentMemoryHygieneAdvisor / AgentEscalationAdvisor / AgentTaskDependencyAdvisor /
 * AgentSecurityPostureAdvisor / AgentPostmortemAdvisor.
 *
 * Distinct focus: BEFORE/DURING a billing period, score each agent's compliance
 * against contractual SLAs (availability, response time, resolution time, quality
 * floor, escalation rate). Predict breach probability, recommend remediation,
 * and surface credit-exposure risk.
 *
 * Does NOT duplicate:
 *   - AgentEscalationAdvisor (per-incident handoff)
 *   - AgentPostmortemAdvisor (post-incident RCA narrative)
 *   - AgentBudgetGuardianAdvisor (cost spend)
 *   - AgentDriftDetector (statistical behavior drift)
 *
 * Verdicts (per agent):
 *   SLA_BREACH (P0) | AT_RISK_OF_BREACH (P0) | LAGGING (P1) |
 *   RECOVERY_NEEDED (P1) | ON_TRACK (P3) | OVER_PERFORMING (P3) |
 *   INSUFFICIENT_DATA (P2)
 *
 * Pure JS, zero deps, UMD wrapper, deterministic given injectable now().
 * Never mutates inputs.
 *
 * Public API:
 *   const advisor = createAgentSlaComplianceAdvisor({ now });
 *   const report  = advisor.analyze({ agents, options });
 *   const sim     = advisor.simulate({ applyTop: N }, report);
 *   advisor.formatText(report) / formatMarkdown(report) / formatJson(report);
 */
(function (root, factory) {
    'use strict';
    if (typeof module === 'object' && module.exports) {
        module.exports = factory();
    } else {
        root.AgentSlaComplianceAdvisor = factory();
        root.createAgentSlaComplianceAdvisor =
            root.AgentSlaComplianceAdvisor.createAgentSlaComplianceAdvisor;
    }
}(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    var VERSION = '1.0.0';

    var APPETITE_MULT = { cautious: 1.15, balanced: 1.0, aggressive: 0.85 };
    var PRIORITY_RANK = { P0: 0, P1: 1, P2: 2, P3: 3 };

    // ── defaults ─────────────────────────────────────────────────────

    var DEFAULT_SLA = {
        availability_pct: 99.5,           // min uptime %
        p95_response_seconds: 5,          // max p95 first response
        p95_resolution_minutes: 60,       // max p95 full resolution
        quality_floor: 0.85,              // min CSAT/quality fraction (0..1)
        max_escalation_rate: 0.10,        // max share of tickets escalated
        max_error_rate: 0.02              // max share of failed runs
    };

    var TIER_MULT = {
        // stricter tiers tolerate less; multiply gap → score
        platinum: 1.40,
        gold: 1.20,
        standard: 1.0,
        bronze: 0.85,
        trial: 0.70
    };

    // ── utils ────────────────────────────────────────────────────────

    function clamp(v, lo, hi) { return v < lo ? lo : (v > hi ? hi : v); }
    function isNum(v) { return typeof v === 'number' && isFinite(v); }
    function isStr(v) { return typeof v === 'string' && v.length > 0; }
    function nonBlank(v) { return isStr(v) && v.trim().length > 0; }
    function num(v, fallback) { return isNum(v) ? v : (fallback === undefined ? null : fallback); }

    function deepCopy(o) {
        if (o === null || typeof o !== 'object') return o;
        if (o instanceof Date) return new Date(o.getTime());
        if (Array.isArray(o)) return o.map(deepCopy);
        var out = {};
        for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) out[k] = deepCopy(o[k]);
        return out;
    }

    function stableStringify(value, indent) {
        var seen = new WeakSet();
        function sortKeys(v) {
            if (v instanceof Date) return v.toISOString();
            if (Array.isArray(v)) return v.map(sortKeys);
            if (v && typeof v === 'object') {
                if (seen.has(v)) return null;
                seen.add(v);
                var out = {};
                Object.keys(v).sort().forEach(function (k) { out[k] = sortKeys(v[k]); });
                return out;
            }
            return v;
        }
        return JSON.stringify(sortKeys(value), null, indent);
    }

    function pipeEscape(v) {
        if (v === null || v === undefined) return '';
        return String(v).replace(/\|/g, '\\|').replace(/\r?\n/g, ' ');
    }

    // ── per-agent classification ─────────────────────────────────────

    function classifyAgent(agent, ctx) {
        var id = isStr(agent.id) ? agent.id : ('agent-' + ctx._auto++);
        var name = isStr(agent.name) ? agent.name : id;
        var tier = isStr(agent.tier) ? agent.tier.toLowerCase() : 'standard';
        var team = isStr(agent.team) ? agent.team : null;
        var customer = isStr(agent.customer) ? agent.customer : null;

        var sla = Object.assign({}, ctx.defaultSla, agent.sla && typeof agent.sla === 'object' ? agent.sla : {});
        var metrics = agent.metrics && typeof agent.metrics === 'object' ? agent.metrics : {};

        // observed metrics (null = not reported)
        var availability = num(metrics.availability_pct, null);
        var p95Resp = num(metrics.p95_response_seconds, null);
        var p95Reso = num(metrics.p95_resolution_minutes, null);
        var quality = num(metrics.quality_score, null);  // 0..1
        var escalation = num(metrics.escalation_rate, null);
        var errorRate = num(metrics.error_rate, null);
        var sampleSize = num(metrics.sample_size, 0);
        var trendBreach = !!metrics.trend_breach;        // hint from caller

        // structured per-metric gap
        var gaps = [];
        function gap(kind, observed, threshold, direction, severityBase) {
            if (observed === null) return;
            var over;
            if (direction === 'min') {
                // higher is better; breach when observed < threshold
                over = (threshold - observed);
                if (over <= 0) return;
                // normalize: % below threshold for things expressed as percentages
                var pctRel = threshold > 0 ? over / threshold : 0;
                var sev = clamp(Math.round(severityBase * (1 + Math.min(2, pctRel * 4))), 0, 100);
                gaps.push({ metric: kind, observed: observed, threshold: threshold, gap: over, severity: sev });
            } else {
                // lower is better; breach when observed > threshold
                over = (observed - threshold);
                if (over <= 0) return;
                var rel = threshold > 0 ? over / threshold : over;
                var sev2 = clamp(Math.round(severityBase * (1 + Math.min(2, rel * 1.5))), 0, 100);
                gaps.push({ metric: kind, observed: observed, threshold: threshold, gap: over, severity: sev2 });
            }
        }

        gap('availability_pct', availability, sla.availability_pct, 'min', 55);
        gap('p95_response_seconds', p95Resp, sla.p95_response_seconds, 'max', 40);
        gap('p95_resolution_minutes', p95Reso, sla.p95_resolution_minutes, 'max', 45);
        gap('quality_score', quality, sla.quality_floor, 'min', 50);
        gap('escalation_rate', escalation, sla.max_escalation_rate, 'max', 35);
        gap('error_rate', errorRate, sla.max_error_rate, 'max', 45);

        // composite score 0-100 (higher = more risk)
        var top = 0, restSum = 0;
        gaps.forEach(function (g) {
            if (g.severity > top) { restSum += top; top = g.severity; }
            else { restSum += g.severity; }
        });
        var raw = top + 0.4 * Math.min(restSum, 60);
        var tierMult = TIER_MULT[tier] || 1.0;
        var appetiteMult = APPETITE_MULT[ctx.appetite];
        var risk = clamp(Math.round(raw * tierMult * appetiteMult), 0, 100);

        // verdict
        var insufficient =
            (sampleSize > 0 && sampleSize < 10) ||
            (availability === null && p95Resp === null && quality === null && errorRate === null);

        var verdict, priority;
        var breachCount = gaps.length;
        var hardBreach = gaps.some(function (g) { return g.severity >= 70; });
        var anyBreach = gaps.length > 0;

        if (insufficient) {
            verdict = 'INSUFFICIENT_DATA'; priority = 'P2';
        } else if (hardBreach || (breachCount >= 3)) {
            verdict = 'SLA_BREACH'; priority = 'P0';
        } else if (trendBreach && anyBreach) {
            verdict = 'AT_RISK_OF_BREACH'; priority = 'P0';
        } else if (breachCount === 2) {
            verdict = 'LAGGING'; priority = 'P1';
        } else if (breachCount === 1) {
            verdict = 'RECOVERY_NEEDED'; priority = 'P1';
        } else {
            // no breach
            // headroom check for OVER_PERFORMING
            var headroom = 0;
            if (availability !== null) headroom += (availability - sla.availability_pct);
            if (quality !== null) headroom += (quality - sla.quality_floor) * 100;
            if (p95Resp !== null && sla.p95_response_seconds > 0) {
                headroom += ((sla.p95_response_seconds - p95Resp) / sla.p95_response_seconds) * 30;
            }
            verdict = headroom >= 10 ? 'OVER_PERFORMING' : 'ON_TRACK';
            priority = 'P3';
        }

        // breach-probability heuristic over next billing window
        // base from risk score, bumped by trendBreach, dampened by OVER_PERFORMING
        var breachProb = clamp(risk / 100, 0, 1);
        if (trendBreach) breachProb = clamp(breachProb + 0.15, 0, 1);
        if (verdict === 'OVER_PERFORMING') breachProb = Math.max(0, breachProb - 0.10);
        if (verdict === 'SLA_BREACH') breachProb = Math.max(breachProb, 0.95);
        if (verdict === 'INSUFFICIENT_DATA') breachProb = null;

        // credit exposure (informational): if contract_value provided, breach probability * credit_pct (or 0.10 default)
        var contractValue = num(agent.contract_value, null);
        var creditPct = num(agent.credit_pct, 0.10);
        var creditExposure = null;
        if (contractValue !== null && breachProb !== null) {
            creditExposure = Math.round(contractValue * creditPct * breachProb);
        }

        // structured reasons
        var reasons = gaps.map(function (g) {
            return g.metric.toUpperCase() + '_BREACH';
        });
        if (trendBreach) reasons.push('NEGATIVE_TREND');
        if (sampleSize > 0 && sampleSize < 10) reasons.push('LOW_SAMPLE_SIZE');
        if (verdict === 'OVER_PERFORMING') reasons.push('STRONG_HEADROOM');
        if (verdict === 'ON_TRACK') reasons.push('WITHIN_SLA');
        if (tier === 'platinum' || tier === 'gold') reasons.push('PREMIUM_TIER');

        // recommended action (one-liner)
        var recommended = '(no action needed)';
        var topGap = gaps.slice().sort(function (a, b) { return b.severity - a.severity; })[0];
        if (verdict === 'SLA_BREACH' || verdict === 'AT_RISK_OF_BREACH') {
            recommended = topGap
                ? 'Page on-call; address ' + topGap.metric + ' breach (observed ' +
                    topGap.observed + ' vs ' + topGap.threshold + ')'
                : 'Page on-call; investigate SLA breach';
        } else if (verdict === 'LAGGING' || verdict === 'RECOVERY_NEEDED') {
            recommended = topGap
                ? 'Open improvement ticket for ' + topGap.metric + ' (observed ' +
                    topGap.observed + ' vs ' + topGap.threshold + ')'
                : 'Open improvement ticket';
        } else if (verdict === 'INSUFFICIENT_DATA') {
            recommended = 'Extend observation window or backfill telemetry';
        } else if (verdict === 'OVER_PERFORMING') {
            recommended = 'Consider promoting tier or relaxing over-provisioned headroom';
        }

        // blast radius proxy
        var blast = 2;
        if (tier === 'platinum') blast = 5;
        else if (tier === 'gold') blast = 4;
        else if (tier === 'standard') blast = 3;

        return {
            id: id,
            name: name,
            tier: tier,
            team: team,
            customer: customer,
            verdict: verdict,
            priority: priority,
            risk_score: risk,
            breach_probability: breachProb,
            credit_exposure: creditExposure,
            sla_thresholds: sla,
            metrics: {
                availability_pct: availability,
                p95_response_seconds: p95Resp,
                p95_resolution_minutes: p95Reso,
                quality_score: quality,
                escalation_rate: escalation,
                error_rate: errorRate,
                sample_size: sampleSize,
                trend_breach: trendBreach
            },
            breaches: gaps,
            reasons: reasons.sort(),
            recommended_action: recommended,
            blast_radius: blast
        };
    }

    // ── playbook ─────────────────────────────────────────────────────

    function buildPlaybook(perAgent, summary, options) {
        var appetite = options.risk_appetite;
        var grade = summary.grade;
        var actions = [];
        var idAuto = 1;
        function add(a) {
            a.id = 'sla-' + (idAuto++);
            a.priority = a.priority || 'P3';
            a.blast_radius = clamp(a.blast_radius || 1, 1, 5);
            a.reversibility = a.reversibility || 'high';
            a.related_agents = a.related_agents || [];
            actions.push(a);
        }

        var breached = perAgent.filter(function (a) { return a.verdict === 'SLA_BREACH'; });
        var atRisk = perAgent.filter(function (a) { return a.verdict === 'AT_RISK_OF_BREACH'; });
        var lagging = perAgent.filter(function (a) { return a.verdict === 'LAGGING'; });
        var recovery = perAgent.filter(function (a) { return a.verdict === 'RECOVERY_NEEDED'; });
        var insufficient = perAgent.filter(function (a) { return a.verdict === 'INSUFFICIENT_DATA'; });
        var overperf = perAgent.filter(function (a) { return a.verdict === 'OVER_PERFORMING'; });

        var premiumBreached = breached.concat(atRisk).filter(function (a) {
            return a.tier === 'platinum' || a.tier === 'gold';
        });

        // P0
        if (premiumBreached.length) {
            add({
                priority: 'P0',
                label: 'PROTECT_PREMIUM_CUSTOMERS',
                reason: 'Premium-tier agents in breach or at risk — credit exposure escalates fastest here',
                owner: 'customer_success',
                blast_radius: 5,
                reversibility: 'low',
                related_agents: premiumBreached.map(function (a) { return a.id; })
            });
        }
        if (breached.length) {
            add({
                priority: 'P0',
                label: 'PAGE_ONCALL_FOR_BREACH',
                reason: breached.length + ' agent(s) actively breaching SLA contracts',
                owner: 'on_call',
                blast_radius: 5,
                reversibility: 'medium',
                related_agents: breached.map(function (a) { return a.id; })
            });
        }
        if (atRisk.length) {
            add({
                priority: 'P0',
                label: 'INTERVENE_BEFORE_BREACH',
                reason: atRisk.length + ' agent(s) trending toward breach with active gaps',
                owner: 'platform',
                blast_radius: 4,
                reversibility: 'high',
                related_agents: atRisk.map(function (a) { return a.id; })
            });
        }

        // P1
        if (lagging.length) {
            add({
                priority: 'P1',
                label: 'IMPROVEMENT_PLAN_LAGGARDS',
                reason: lagging.length + ' agent(s) with 2+ SLA metrics outside target',
                owner: 'engineering_lead',
                blast_radius: 3,
                reversibility: 'high',
                related_agents: lagging.map(function (a) { return a.id; })
            });
        }
        if (recovery.length) {
            add({
                priority: 'P1',
                label: 'FOCUSED_REMEDIATION',
                reason: recovery.length + ' agent(s) with a single SLA metric outside target',
                owner: 'engineering_lead',
                blast_radius: 2,
                reversibility: 'high',
                related_agents: recovery.map(function (a) { return a.id; })
            });
        }
        // metric-cluster actions
        var respCluster = perAgent.filter(function (a) {
            return a.breaches.some(function (g) { return g.metric === 'p95_response_seconds'; });
        });
        if (respCluster.length >= 2) {
            add({
                priority: 'P1',
                label: 'SCALE_RESPONSE_CAPACITY',
                reason: respCluster.length + ' agents breaching p95 response — shared capacity bottleneck likely',
                owner: 'platform',
                blast_radius: 3,
                reversibility: 'high',
                related_agents: respCluster.map(function (a) { return a.id; })
            });
        }
        var qualityCluster = perAgent.filter(function (a) {
            return a.breaches.some(function (g) { return g.metric === 'quality_score'; });
        });
        if (qualityCluster.length >= 2) {
            add({
                priority: 'P1',
                label: 'QUALITY_REGRESSION_REVIEW',
                reason: qualityCluster.length + ' agents below quality floor — recent prompt/model regression?',
                owner: 'engineering_lead',
                blast_radius: 4,
                reversibility: 'high',
                related_agents: qualityCluster.map(function (a) { return a.id; })
            });
        }

        // credit exposure surface
        var creditAtRisk = perAgent.reduce(function (sum, a) {
            return sum + (a.credit_exposure || 0);
        }, 0);
        if (creditAtRisk >= 1000) {
            add({
                priority: 'P1',
                label: 'NOTIFY_FINANCE_OF_CREDIT_EXPOSURE',
                reason: 'Projected SLA credit exposure ≈ $' + creditAtRisk,
                owner: 'finance',
                blast_radius: 2,
                reversibility: 'high',
                related_agents: perAgent.filter(function (a) {
                    return (a.credit_exposure || 0) > 0;
                }).map(function (a) { return a.id; })
            });
        }

        // P2
        if (insufficient.length) {
            add({
                priority: 'P2',
                label: 'BACKFILL_TELEMETRY',
                reason: insufficient.length + ' agent(s) lack enough samples to evaluate SLA',
                owner: 'data',
                blast_radius: 2,
                reversibility: 'high',
                related_agents: insufficient.map(function (a) { return a.id; })
            });
        }
        if (overperf.length >= 2) {
            add({
                priority: 'P2',
                label: 'CONSIDER_TIER_REALIGNMENT',
                reason: overperf.length + ' agent(s) over-performing — opportunity to upsell tier or relax over-provisioning',
                owner: 'customer_success',
                blast_radius: 2,
                reversibility: 'high',
                related_agents: overperf.map(function (a) { return a.id; })
            });
        }
        if (appetite === 'cautious' && (grade === 'C' || grade === 'D' || grade === 'F')) {
            add({
                priority: 'P2',
                label: 'SCHEDULE_SLA_AUDIT',
                reason: 'Cautious appetite + portfolio grade ' + grade,
                owner: 'qa',
                blast_radius: 1,
                reversibility: 'high'
            });
        }

        // P3 fallback
        if (perAgent.length === 0) {
            add({
                priority: 'P3',
                label: 'EMPTY_PORTFOLIO',
                reason: 'No agents supplied — nothing to score',
                owner: 'data',
                blast_radius: 1
            });
        } else if (!breached.length && !atRisk.length && !lagging.length && !recovery.length) {
            add({
                priority: 'P3',
                label: 'PORTFOLIO_HEALTHY',
                reason: 'No SLA risks detected',
                owner: 'platform',
                blast_radius: 1
            });
        }

        // aggressive trims lone P3 when other actions exist
        if (appetite === 'aggressive' && actions.length > 1) {
            actions = actions.filter(function (a) { return a.priority !== 'P3'; });
        }

        // stable order: priority asc, id asc
        actions.sort(function (a, b) {
            var p = PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
            if (p !== 0) return p;
            return a.id < b.id ? -1 : (a.id > b.id ? 1 : 0);
        });

        return actions;
    }

    // ── insights ─────────────────────────────────────────────────────

    function buildInsights(perAgent, summary) {
        var out = [];
        if (perAgent.length === 0) { out.push('EMPTY_FLEET'); return out; }

        var breached = perAgent.filter(function (a) { return a.verdict === 'SLA_BREACH'; }).length;
        var atRisk = perAgent.filter(function (a) { return a.verdict === 'AT_RISK_OF_BREACH'; }).length;
        var insufficient = perAgent.filter(function (a) { return a.verdict === 'INSUFFICIENT_DATA'; }).length;
        var premium = perAgent.filter(function (a) { return a.tier === 'platinum' || a.tier === 'gold'; });
        var premiumBreach = premium.filter(function (a) {
            return a.verdict === 'SLA_BREACH' || a.verdict === 'AT_RISK_OF_BREACH';
        }).length;

        if (breached >= 1) out.push('ACTIVE_SLA_BREACHES:' + breached);
        if (atRisk >= 1) out.push('BREACH_RISK_PRESENT:' + atRisk);
        if (premiumBreach >= 1) out.push('PREMIUM_TIER_AT_RISK:' + premiumBreach);
        if (insufficient >= 2) out.push('TELEMETRY_GAP:' + insufficient);

        // metric cluster insights
        var metricCounts = {};
        perAgent.forEach(function (a) {
            a.breaches.forEach(function (g) {
                metricCounts[g.metric] = (metricCounts[g.metric] || 0) + 1;
            });
        });
        Object.keys(metricCounts).sort().forEach(function (k) {
            if (metricCounts[k] >= 2) out.push('METRIC_CLUSTER_' + k.toUpperCase() + ':' + metricCounts[k]);
        });

        if (summary.credit_exposure_total >= 1000) {
            out.push('CREDIT_EXPOSURE_ELEVATED:$' + summary.credit_exposure_total);
        }
        if (breached === 0 && atRisk === 0 && perAgent.length > 0) {
            out.push('PORTFOLIO_WITHIN_SLA');
        }

        if (out.length === 0) out.push('NO_NOTABLE_SIGNALS');
        return out;
    }

    // ── summary + grade ──────────────────────────────────────────────

    function buildSummary(perAgent) {
        if (perAgent.length === 0) {
            return {
                agent_count: 0,
                breach_count: 0,
                at_risk_count: 0,
                lagging_count: 0,
                recovery_count: 0,
                on_track_count: 0,
                over_performing_count: 0,
                insufficient_count: 0,
                mean_risk_score: 0,
                weighted_breach_probability: 0,
                credit_exposure_total: 0,
                grade: 'A',
                headline: 'NoAgents'
            };
        }
        var counts = {
            SLA_BREACH: 0, AT_RISK_OF_BREACH: 0, LAGGING: 0, RECOVERY_NEEDED: 0,
            ON_TRACK: 0, OVER_PERFORMING: 0, INSUFFICIENT_DATA: 0
        };
        var riskSum = 0;
        var probSum = 0, probCount = 0;
        var creditTotal = 0;
        perAgent.forEach(function (a) {
            counts[a.verdict] = (counts[a.verdict] || 0) + 1;
            riskSum += a.risk_score;
            if (a.breach_probability !== null) {
                probSum += a.breach_probability; probCount += 1;
            }
            creditTotal += (a.credit_exposure || 0);
        });
        var meanRisk = Math.round(riskSum / perAgent.length);
        var weightedProb = probCount > 0 ? Math.round((probSum / probCount) * 100) / 100 : 0;

        // grade
        var grade;
        var premiumBreach = perAgent.some(function (a) {
            return (a.tier === 'platinum' || a.tier === 'gold') &&
                   (a.verdict === 'SLA_BREACH' || a.verdict === 'AT_RISK_OF_BREACH');
        });
        if (premiumBreach || counts.SLA_BREACH >= 2 || meanRisk >= 70) grade = 'F';
        else if (counts.SLA_BREACH >= 1 || meanRisk >= 55) grade = 'D';
        else if (counts.AT_RISK_OF_BREACH >= 1 || counts.LAGGING >= 2 || meanRisk >= 35) grade = 'C';
        else if (counts.LAGGING >= 1 || counts.RECOVERY_NEEDED >= 1 || meanRisk >= 18) grade = 'B';
        else grade = 'A';

        var headline;
        if (counts.SLA_BREACH > 0) headline = 'BreachesActive';
        else if (counts.AT_RISK_OF_BREACH > 0) headline = 'BreachRiskElevated';
        else if (counts.LAGGING > 0) headline = 'PortfolioLagging';
        else if (counts.OVER_PERFORMING > 0 && counts.RECOVERY_NEEDED === 0) headline = 'PortfolioOverPerforming';
        else headline = 'PortfolioHealthy';

        return {
            agent_count: perAgent.length,
            breach_count: counts.SLA_BREACH,
            at_risk_count: counts.AT_RISK_OF_BREACH,
            lagging_count: counts.LAGGING,
            recovery_count: counts.RECOVERY_NEEDED,
            on_track_count: counts.ON_TRACK,
            over_performing_count: counts.OVER_PERFORMING,
            insufficient_count: counts.INSUFFICIENT_DATA,
            mean_risk_score: meanRisk,
            weighted_breach_probability: weightedProb,
            credit_exposure_total: creditTotal,
            grade: grade,
            headline: headline
        };
    }

    // ── analyze ──────────────────────────────────────────────────────

    function analyze(input, opts) {
        input = input || {};
        opts = opts || {};
        var rawAgents = Array.isArray(input.agents) ? input.agents : [];

        var options = input.options && typeof input.options === 'object' ? input.options : {};
        var appetite = options.risk_appetite;
        if (!APPETITE_MULT[appetite]) appetite = 'balanced';

        var defaultSla = Object.assign({}, DEFAULT_SLA,
            options.default_sla && typeof options.default_sla === 'object' ? options.default_sla : {});

        var nowFn = (typeof opts.now === 'function')
            ? opts.now
            : (typeof input.now === 'function' ? input.now : function () { return new Date(); });
        var nowMs = nowFn().getTime();
        if (!isFinite(nowMs)) throw new Error('AgentSlaComplianceAdvisor: invalid now()');

        var ctx = {
            nowMs: nowMs,
            appetite: appetite,
            defaultSla: defaultSla,
            _auto: 1
        };

        var perAgent = rawAgents.map(function (a) { return classifyAgent(deepCopy(a), ctx); });
        // sort: priority asc, risk desc, id asc
        perAgent.sort(function (a, b) {
            var p = PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
            if (p !== 0) return p;
            if (b.risk_score !== a.risk_score) return b.risk_score - a.risk_score;
            return a.id < b.id ? -1 : (a.id > b.id ? 1 : 0);
        });

        var summary = buildSummary(perAgent);
        var insights = buildInsights(perAgent, summary);
        var playbook = buildPlaybook(perAgent, summary, { risk_appetite: appetite });

        return {
            version: VERSION,
            generated_at: new Date(nowMs).toISOString(),
            risk_appetite: appetite,
            summary: summary,
            agents: perAgent,
            playbook: playbook,
            insights: insights
        };
    }

    // ── simulate ─────────────────────────────────────────────────────

    var ACTION_WEIGHT = {
        PAGE_ONCALL_FOR_BREACH: 20,
        PROTECT_PREMIUM_CUSTOMERS: 18,
        INTERVENE_BEFORE_BREACH: 15,
        IMPROVEMENT_PLAN_LAGGARDS: 10,
        FOCUSED_REMEDIATION: 8,
        SCALE_RESPONSE_CAPACITY: 12,
        QUALITY_REGRESSION_REVIEW: 12,
        NOTIFY_FINANCE_OF_CREDIT_EXPOSURE: 4,
        BACKFILL_TELEMETRY: 3,
        CONSIDER_TIER_REALIGNMENT: 2,
        SCHEDULE_SLA_AUDIT: 1,
        EMPTY_PORTFOLIO: 0,
        PORTFOLIO_HEALTHY: 0
    };

    function simulate(input, report) {
        if (!report) throw new Error('AgentSlaComplianceAdvisor: simulate(report) required');
        var copy = deepCopy(report);
        var applyTop = (input && isNum(input.applyTop)) ? input.applyTop : copy.playbook.length;
        var actions = copy.playbook.slice(0, Math.max(0, applyTop));
        var weight = 0;
        actions.forEach(function (a, i) {
            var w = ACTION_WEIGHT[a.label] || 0;
            weight += w * Math.pow(0.85, i);
        });
        var startRisk = copy.summary.mean_risk_score;
        var projected = Math.max(5, Math.round(startRisk - weight));
        var projectedProb = copy.summary.weighted_breach_probability * (projected / Math.max(1, startRisk));
        projectedProb = Math.round(clamp(projectedProb, 0, 1) * 100) / 100;
        return {
            applied: actions.length,
            start_mean_risk: startRisk,
            projected_mean_risk: projected,
            projected_breach_probability: projectedProb,
            note: 'Heuristic projection: per-action weight × 0.85^position decay; floors at 5.'
        };
    }

    // ── renderers ────────────────────────────────────────────────────

    function formatText(report) {
        if (!report) return '';
        var s = report.summary;
        var lines = [];
        lines.push('AgentSlaComplianceAdvisor v' + report.version + ' — ' + report.generated_at);
        lines.push('VERDICT: grade=' + s.grade +
            ' headline=' + s.headline +
            ' agents=' + s.agent_count +
            ' breach=' + s.breach_count +
            ' atRisk=' + s.at_risk_count +
            ' meanRisk=' + s.mean_risk_score +
            ' breachProb=' + s.weighted_breach_probability +
            ' creditExposure=$' + s.credit_exposure_total);
        lines.push('');
        lines.push('Agents:');
        report.agents.forEach(function (a) {
            lines.push('  [' + a.priority + '] ' + a.id +
                ' (' + a.tier + ') ' + a.verdict +
                ' risk=' + a.risk_score +
                (a.breach_probability !== null ? ' P(breach)=' + Math.round(a.breach_probability * 100) + '%' : '') +
                ' breaches=' + a.breaches.length);
            if (a.recommended_action) lines.push('    -> ' + a.recommended_action);
        });
        lines.push('');
        lines.push('Playbook:');
        report.playbook.forEach(function (act) {
            lines.push('  [' + act.priority + '] ' + act.label + ' (' + act.owner + ') — ' + act.reason);
        });
        lines.push('');
        lines.push('Insights: ' + report.insights.join(', '));
        return lines.join('\n');
    }

    function formatMarkdown(report) {
        if (!report) return '';
        var s = report.summary;
        var out = [];
        out.push('# AgentSlaComplianceAdvisor — ' + s.headline);
        out.push('');
        out.push('## Summary');
        out.push('');
        out.push('| metric | value |');
        out.push('| --- | --- |');
        out.push('| grade | ' + s.grade + ' |');
        out.push('| agents | ' + s.agent_count + ' |');
        out.push('| breach | ' + s.breach_count + ' |');
        out.push('| at_risk | ' + s.at_risk_count + ' |');
        out.push('| lagging | ' + s.lagging_count + ' |');
        out.push('| recovery | ' + s.recovery_count + ' |');
        out.push('| over_performing | ' + s.over_performing_count + ' |');
        out.push('| insufficient | ' + s.insufficient_count + ' |');
        out.push('| mean_risk | ' + s.mean_risk_score + ' |');
        out.push('| weighted_breach_prob | ' + s.weighted_breach_probability + ' |');
        out.push('| credit_exposure_total | $' + s.credit_exposure_total + ' |');
        out.push('| risk_appetite | ' + report.risk_appetite + ' |');
        out.push('');
        out.push('## Agents');
        out.push('');
        out.push('| priority | id | tier | verdict | risk | P(breach) | breaches | recommended |');
        out.push('| --- | --- | --- | --- | --- | --- | --- | --- |');
        report.agents.forEach(function (a) {
            out.push('| ' + a.priority +
                ' | ' + pipeEscape(a.id) +
                ' | ' + pipeEscape(a.tier) +
                ' | ' + a.verdict +
                ' | ' + a.risk_score +
                ' | ' + (a.breach_probability === null ? 'n/a' : Math.round(a.breach_probability * 100) + '%') +
                ' | ' + a.breaches.length +
                ' | ' + pipeEscape(a.recommended_action) +
                ' |');
        });
        out.push('');
        out.push('## Playbook');
        out.push('');
        out.push('| priority | label | owner | blast | reason |');
        out.push('| --- | --- | --- | --- | --- |');
        report.playbook.forEach(function (act) {
            out.push('| ' + act.priority +
                ' | ' + act.label +
                ' | ' + pipeEscape(act.owner) +
                ' | ' + act.blast_radius +
                ' | ' + pipeEscape(act.reason) + ' |');
        });
        out.push('');
        out.push('## Insights');
        out.push('');
        report.insights.forEach(function (i) { out.push('- ' + i); });
        return out.join('\n');
    }

    function formatJson(report) {
        return stableStringify(report, 2);
    }

    // ── factory + UMD bridge ─────────────────────────────────────────

    function createAgentSlaComplianceAdvisor(opts) {
        opts = opts || {};
        var nowFn = typeof opts.now === 'function' ? opts.now : function () { return new Date(); };
        var api = {
            VERSION: VERSION,
            analyze: function (input) { return analyze(input, { now: nowFn }); },
            simulate: function (sinput, report) { return simulate(sinput, report); },
            formatText: formatText,
            formatMarkdown: formatMarkdown,
            formatJson: formatJson
        };
        return api;
    }

    return {
        VERSION: VERSION,
        createAgentSlaComplianceAdvisor: createAgentSlaComplianceAdvisor,
        // also expose pure functions for ad-hoc use
        analyze: function (input, opts) { return analyze(input, opts || {}); },
        simulate: simulate,
        formatText: formatText,
        formatMarkdown: formatMarkdown,
        formatJson: formatJson
    };
}));
