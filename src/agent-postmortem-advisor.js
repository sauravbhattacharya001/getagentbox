/**
 * AgentPostmortemAdvisor — agentic blameless RCA / postmortem synthesizer.
 *
 * 11th sibling to AgentTriageAdvisor / AgentRolloutPlanner / AgentDriftDetector /
 * AgentToolPolicyAdvisor / AgentBudgetGuardianAdvisor / AgentAutonomyTuningAdvisor /
 * AgentMemoryHygieneAdvisor / AgentEscalationAdvisor / AgentTaskDependencyAdvisor /
 * AgentSecurityPostureAdvisor.
 *
 * Distinct focus: AFTER the dust settles, what is the structured RCA narrative
 * + corrective-action plan + recurrence-pattern detection for an incident batch?
 *
 * Does NOT duplicate:
 *   - AgentEscalationAdvisor (live in-flight handoffs)
 *   - AgentTriageAdvisor (inbox triage)
 *   - AgentDriftDetector (statistical drift)
 *   - AgentSecurityPostureAdvisor (deployment hardening)
 *
 * Verdicts (per incident):
 *   CHRONIC_PATTERN (P0) | MAJOR_INCIDENT (P0) | NEEDS_RCA (P1) |
 *   ACTION_INCOMPLETE (P1) | MINOR_NOTED (P2) | RESOLVED_CLEAN (P3) |
 *   INSUFFICIENT_DATA (P2)
 *
 * Pure JS, zero deps, UMD wrapper, deterministic given injectable now().
 * Never mutates inputs.
 *
 * Public API:
 *   const advisor = createAgentPostmortemAdvisor({ now });
 *   const report  = advisor.analyze({ incidents, agents, options });
 *   const sim     = advisor.simulate({ applyTop: N }, report);
 *   advisor.formatText(report) / formatMarkdown(report) / formatJson(report);
 */
(function (root, factory) {
    'use strict';
    if (typeof module === 'object' && module.exports) {
        module.exports = factory();
    } else {
        root.AgentPostmortemAdvisor = factory();
    }
}(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    var VERSION = '1.0.0';

    var APPETITE_MULT = { cautious: 0.92, balanced: 1.0, aggressive: 1.08 };
    var PRIORITY_RANK = { P0: 0, P1: 1, P2: 2, P3: 3 };

    var DAY_MS = 86400000;

    var SEVERITY_RANK = { low: 1, medium: 2, high: 3, critical: 4 };
    var SEVERITY_WEIGHT = { low: 5, medium: 15, high: 35, critical: 60 };
    var IMPACT_RANK = { none: 0, low: 1, medium: 2, high: 3 };

    // ── utils ────────────────────────────────────────────────────────

    function clamp(v, lo, hi) { return v < lo ? lo : (v > hi ? hi : v); }
    function isNum(v) { return typeof v === 'number' && isFinite(v); }
    function isStr(v) { return typeof v === 'string' && v.length > 0; }
    function nonBlank(v) { return isStr(v) && v.trim().length > 0; }

    function deepCopy(o) {
        if (o === null || typeof o !== 'object') return o;
        if (o instanceof Date) return new Date(o.getTime());
        if (Array.isArray(o)) return o.map(deepCopy);
        var out = {};
        for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) out[k] = deepCopy(o[k]);
        return out;
    }

    function stableStringify(value, indent) {
        function sortKeys(v) {
            if (v instanceof Date) return v.toISOString();
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

    function tsMs(dateLike) {
        if (!dateLike) return null;
        var t = (dateLike instanceof Date) ? dateLike.getTime() : Date.parse(dateLike);
        return isFinite(t) ? t : null;
    }

    function daysSince(dateLike, nowMs) {
        var t = tsMs(dateLike);
        if (t === null) return null;
        return Math.max(0, (nowMs - t) / DAY_MS);
    }

    // ── per-incident classification ──────────────────────────────────

    function classifyIncident(inc, ctx) {
        var nowMs = ctx.nowMs;
        var agents = ctx.agents;
        var agentBuckets = ctx.agentBuckets; // agent_id|category -> [incident ids in window]
        var agentTotals = ctx.agentTotals;   // agent_id -> total count

        var id = isStr(inc.id) ? inc.id : ('inc-' + ctx._auto++);
        var agent_id = isStr(inc.agent_id) ? inc.agent_id : null;
        var severity = isStr(inc.severity) ? inc.severity.toLowerCase() : null;
        var category = isStr(inc.category) ? inc.category : null;
        var resolution_minutes = isNum(inc.resolution_minutes) ? inc.resolution_minutes : null;
        var customer_impact = isStr(inc.customer_impact) ? inc.customer_impact.toLowerCase() : 'none';
        var detection_source = isStr(inc.detection_source) ? inc.detection_source : null;
        var root_cause = inc.root_cause;
        var action_items = Array.isArray(inc.action_items_taken) ? inc.action_items_taken : [];
        var recurrence_of = isStr(inc.recurrence_of) ? inc.recurrence_of : null;

        var days_since = daysSince(inc.timestamp, nowMs);

        var agentRec = agent_id && agents[agent_id] ? agents[agent_id] : {};
        var tier = isStr(agentRec.tier) ? agentRec.tier : 'standard';
        var team = isStr(agentRec.team) ? agentRec.team : null;

        // contributing factors
        var factors = [];
        if (!nonBlank(root_cause)) factors.push('MISSING_ROOT_CAUSE');
        if (!action_items.length) factors.push('NO_ACTION_ITEMS');
        if (isNum(resolution_minutes) && resolution_minutes > 240) factors.push('SLOW_RESOLUTION');
        if ((severity === 'high' || severity === 'critical') && detection_source === 'user_report') {
            factors.push('UNDETECTED_BY_MONITORING');
        }
        if (detection_source === 'self_report' && !action_items.length) {
            factors.push('SELF_REPORTED_NO_FOLLOWUP');
        }
        if (tier === 'critical') factors.push('CRITICAL_TIER_AGENT_AFFECTED');

        var clusterKey = agent_id && category ? (agent_id + '|' + category) : null;
        var clusterCount = clusterKey && agentBuckets[clusterKey] ? agentBuckets[clusterKey].length : 0;
        if (clusterCount >= 2) factors.push('REPEAT_CATEGORY_FOR_AGENT');
        if (agent_id && agentTotals[agent_id] >= 3 && team) factors.push('CROSS_TEAM_BLAST');

        // verdict
        var verdict;
        var insufficient = !severity || !category;
        if (insufficient) {
            verdict = 'INSUFFICIENT_DATA';
        } else if (recurrence_of || clusterCount >= 3) {
            verdict = 'CHRONIC_PATTERN';
        } else if (severity === 'critical' || customer_impact === 'high') {
            verdict = 'MAJOR_INCIDENT';
        } else if (severity === 'high' && !nonBlank(root_cause)) {
            verdict = 'NEEDS_RCA';
        } else if (nonBlank(root_cause) && !action_items.length && (severity === 'high' || severity === 'medium')) {
            verdict = 'ACTION_INCOMPLETE';
        } else if (
            nonBlank(root_cause) && action_items.length > 0 &&
            (!isNum(resolution_minutes) || resolution_minutes <= 120) &&
            (severity === 'low' || severity === 'medium' || severity === 'high')
        ) {
            verdict = 'RESOLVED_CLEAN';
        } else if (severity === 'low') {
            verdict = 'RESOLVED_CLEAN';
        } else {
            verdict = 'MINOR_NOTED';
        }

        var priority;
        switch (verdict) {
            case 'CHRONIC_PATTERN':
            case 'MAJOR_INCIDENT': priority = 'P0'; break;
            case 'NEEDS_RCA':
            case 'ACTION_INCOMPLETE': priority = 'P1'; break;
            case 'INSUFFICIENT_DATA':
            case 'MINOR_NOTED': priority = 'P2'; break;
            default: priority = 'P3';
        }

        // severity_score 0-100
        var base = severity ? SEVERITY_WEIGHT[severity] || 0 : 10;
        var impactBonus = (IMPACT_RANK[customer_impact] || 0) * 8;
        var factorBonus = Math.min(30, factors.length * 5);
        var recurrenceBonus = (verdict === 'CHRONIC_PATTERN') ? 20 : 0;
        var severity_score = clamp(Math.round(base + impactBonus + factorBonus + recurrenceBonus), 0, 100);

        // blast_radius 1-5
        var blast = 1;
        if (severity === 'medium') blast = 2;
        else if (severity === 'high') blast = 3;
        else if (severity === 'critical') blast = 4;
        if (customer_impact === 'high') blast = Math.max(blast, 4);
        if (tier === 'critical') blast = Math.min(5, blast + 1);
        blast = clamp(blast, 1, 5);

        var structured_root_cause = nonBlank(root_cause)
            ? root_cause.trim()
            : '(no root cause recorded — RCA pending)';

        return {
            id: id,
            agent_id: agent_id,
            agent_team: team,
            agent_tier: tier,
            category: category,
            severity: severity,
            customer_impact: customer_impact,
            detection_source: detection_source,
            resolution_minutes: resolution_minutes,
            recurrence_of: recurrence_of,
            verdict: verdict,
            priority: priority,
            severity_score: severity_score,
            blast_radius: blast,
            contributing_factors: factors,
            structured_root_cause: structured_root_cause,
            recurrence_flag: !!(recurrence_of || clusterCount >= 3),
            days_since: days_since === null ? null : Math.round(days_since * 10) / 10,
            action_items_count: action_items.length
        };
    }

    // ── playbook builder ─────────────────────────────────────────────

    function buildPlaybook(perIncident, clusters, summary, options) {
        var appetite = options.risk_appetite;
        var grade = summary.grade;
        var actions = [];
        var idAuto = 1;
        function add(a) {
            a.id = 'pm-' + (idAuto++);
            a.priority = a.priority || 'P3';
            a.blast_radius = clamp(a.blast_radius || 1, 1, 5);
            a.reversibility = a.reversibility || 'high';
            a.related_incidents = a.related_incidents || [];
            a.related_agents = a.related_agents || [];
            actions.push(a);
        }

        var p0Incidents = perIncident.filter(function (i) { return i.priority === 'P0'; });
        var chronic = perIncident.filter(function (i) { return i.verdict === 'CHRONIC_PATTERN'; });
        var major = perIncident.filter(function (i) { return i.verdict === 'MAJOR_INCIDENT'; });
        var needsRca = perIncident.filter(function (i) { return i.verdict === 'NEEDS_RCA'; });
        var actionIncomplete = perIncident.filter(function (i) { return i.verdict === 'ACTION_INCOMPLETE'; });
        var undetected = perIncident.filter(function (i) {
            return i.contributing_factors.indexOf('UNDETECTED_BY_MONITORING') !== -1;
        });
        var customerHigh = perIncident.filter(function (i) { return i.customer_impact === 'high'; });

        // P0 LAUNCH_RCA_REVIEW
        var p0NoRoot = p0Incidents.filter(function (i) {
            return i.contributing_factors.indexOf('MISSING_ROOT_CAUSE') !== -1;
        });
        if (p0NoRoot.length > 0) {
            add({
                priority: 'P0',
                label: 'LAUNCH_RCA_REVIEW',
                reason: 'P0 incident(s) lack a structured root cause — schedule a formal RCA within 48h.',
                owner: 'incident_lead',
                blast_radius: 4,
                reversibility: 'high',
                related_incidents: p0NoRoot.map(function (i) { return i.id; })
            });
        }

        // P0 BREAK_RECURRENCE_LOOP per cluster
        clusters.forEach(function (c) {
            add({
                priority: 'P0',
                label: 'BREAK_RECURRENCE_LOOP',
                reason: 'Agent ' + c.agent_id + ' has hit category=' + c.category + ' ' + c.count + ' times — root out the upstream cause.',
                owner: 'reliability_lead',
                blast_radius: 4,
                reversibility: 'medium',
                related_incidents: c.incident_ids.slice(),
                related_agents: [c.agent_id]
            });
        });

        // P0 QUARANTINE_AGENT_PENDING_FIX
        var quarantineAgents = {};
        perIncident.forEach(function (i) {
            if (i.agent_tier === 'critical' &&
                (i.verdict === 'CHRONIC_PATTERN' || (i.verdict === 'MAJOR_INCIDENT' && i.recurrence_flag))) {
                quarantineAgents[i.agent_id] = quarantineAgents[i.agent_id] || [];
                quarantineAgents[i.agent_id].push(i.id);
            }
        });
        Object.keys(quarantineAgents).sort().forEach(function (aid) {
            add({
                priority: 'P0',
                label: 'QUARANTINE_AGENT_PENDING_FIX',
                reason: 'Critical-tier agent ' + aid + ' has a chronic or recurring major incident — quarantine until fix lands.',
                owner: 'ops',
                blast_radius: 3,
                reversibility: 'medium',
                related_incidents: quarantineAgents[aid],
                related_agents: [aid]
            });
        });

        // P0 NOTIFY_AFFECTED_CUSTOMERS
        if (customerHigh.length > 0) {
            add({
                priority: 'P0',
                label: 'NOTIFY_AFFECTED_CUSTOMERS',
                reason: 'High customer impact recorded — coordinate proactive customer notification.',
                owner: 'customer_success',
                blast_radius: 5,
                reversibility: 'low',
                related_incidents: customerHigh.map(function (i) { return i.id; })
            });
        }

        // P1 CLOSE_ACTION_ITEMS_BACKLOG
        if (actionIncomplete.length >= 2) {
            add({
                priority: 'P1',
                label: 'CLOSE_ACTION_ITEMS_BACKLOG',
                reason: actionIncomplete.length + ' incidents have a recorded root cause but zero action items — close the loop.',
                owner: 'incident_lead',
                blast_radius: 2,
                reversibility: 'high',
                related_incidents: actionIncomplete.map(function (i) { return i.id; })
            });
        }

        // P1 INSTRUMENT_MISSING_DETECTION
        if (undetected.length >= 2) {
            add({
                priority: 'P1',
                label: 'INSTRUMENT_MISSING_DETECTION',
                reason: undetected.length + ' high+ incidents were caught by users, not monitoring — add detection.',
                owner: 'observability',
                blast_radius: 3,
                reversibility: 'high',
                related_incidents: undetected.map(function (i) { return i.id; })
            });
        }

        // P1 BLAMELESS_POSTMORTEM_TEMPLATE
        if (needsRca.length >= 3) {
            add({
                priority: 'P1',
                label: 'BLAMELESS_POSTMORTEM_TEMPLATE',
                reason: needsRca.length + ' high-severity incidents lack RCA — standardize a blameless template.',
                owner: 'incident_lead',
                blast_radius: 2,
                reversibility: 'high',
                related_incidents: needsRca.map(function (i) { return i.id; })
            });
        }

        // P2 ROOT_CAUSE_TAXONOMY_AUDIT
        var distinctCats = Object.keys(summary._categoryCounts || {});
        var dominance = summary.top_category && summary.incident_count > 0
            ? (summary._categoryCounts[summary.top_category] / summary.incident_count)
            : 0;
        if (distinctCats.length >= 3 || dominance >= 0.5) {
            add({
                priority: 'P2',
                label: 'ROOT_CAUSE_TAXONOMY_AUDIT',
                reason: 'Category distribution suggests the taxonomy needs review (' +
                    distinctCats.length + ' categories, top=' +
                    (summary.top_category || 'n/a') + ' @ ' + Math.round(dominance * 100) + '%).',
                owner: 'reliability_lead',
                blast_radius: 2,
                reversibility: 'high'
            });
        }

        // P2 SCHEDULE_POSTMORTEM_AUDIT
        if (appetite === 'cautious' && (grade === 'C' || grade === 'D' || grade === 'F')) {
            add({
                priority: 'P2',
                label: 'SCHEDULE_POSTMORTEM_AUDIT',
                reason: 'Grade ' + grade + ' under cautious appetite — schedule a deeper audit.',
                owner: 'incident_lead',
                blast_radius: 1,
                reversibility: 'high'
            });
        }

        // P3 MAINTAIN_LEARNING_CADENCE
        add({
            priority: 'P3',
            label: 'MAINTAIN_LEARNING_CADENCE',
            reason: 'Keep the postmortem cadence; revisit weekly.',
            owner: 'incident_lead',
            blast_radius: 1,
            reversibility: 'high'
        });

        // sort priority asc then id asc
        actions.sort(function (a, b) {
            var pa = PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
            if (pa !== 0) return pa;
            return a.id < b.id ? -1 : (a.id > b.id ? 1 : 0);
        });

        // dedupe by label (first wins)
        var seen = {};
        var deduped = [];
        actions.forEach(function (a) {
            if (seen[a.label]) return;
            seen[a.label] = true;
            deduped.push(a);
        });

        // aggressive trim P3 + lone P2 when P0/P1 present
        if (appetite === 'aggressive') {
            var hasP0orP1 = deduped.some(function (a) { return a.priority === 'P0' || a.priority === 'P1'; });
            if (hasP0orP1) {
                deduped = deduped.filter(function (a) { return a.priority !== 'P3'; });
                var p2Count = deduped.filter(function (a) { return a.priority === 'P2'; }).length;
                if (p2Count === 1) {
                    deduped = deduped.filter(function (a) { return a.priority !== 'P2'; });
                }
            }
        }

        return deduped;
    }

    // ── insights ─────────────────────────────────────────────────────

    function buildInsights(perIncident, clusters, summary) {
        var insights = [];
        if (summary.incident_count === 0) {
            insights.push('EMPTY_FLEET');
            return insights;
        }
        if (clusters.length > 0) insights.push('SYSTEMIC_RECURRENCE');
        if (summary.customer_impacting_count > 0) insights.push('CUSTOMER_TRUST_AT_RISK');
        var undetected = perIncident.filter(function (i) {
            return i.contributing_factors.indexOf('UNDETECTED_BY_MONITORING') !== -1;
        });
        if (undetected.length >= 2) insights.push('DETECTION_GAP');

        var highPlus = perIncident.filter(function (i) {
            return i.severity === 'high' || i.severity === 'critical';
        });
        var withRoot = highPlus.filter(function (i) {
            return i.contributing_factors.indexOf('MISSING_ROOT_CAUSE') === -1;
        });
        if (highPlus.length > 0 && (withRoot.length / highPlus.length) <= 0.5) {
            insights.push('RCA_COMPLIANCE_LOW');
        }

        var clean = perIncident.filter(function (i) { return i.verdict === 'RESOLVED_CLEAN'; });
        if (clean.length / perIncident.length >= 0.8) insights.push('FAST_LEARNING_ORG');

        if (summary.top_affected_agent && summary._agentCounts[summary.top_affected_agent] >= 3 &&
            (summary._agentCounts[summary.top_affected_agent] / summary.incident_count) >= 0.5) {
            insights.push('SINGLE_AGENT_HOTSPOT');
        }

        var dominance = summary.top_category && summary.incident_count > 0
            ? (summary._categoryCounts[summary.top_category] / summary.incident_count)
            : 0;
        if (dominance >= 0.5 && summary.top_category) {
            insights.push('CATEGORY_DOMINANCE:' + summary.top_category);
        }

        if (insights.length === 0) insights.push('HEALTHY_INCIDENT_RESPONSE');
        return insights;
    }

    // ── core analyze ─────────────────────────────────────────────────

    function analyzeImpl(input, instance) {
        var nowMs = instance._now().getTime();
        input = input || {};
        var rawIncidents = Array.isArray(input.incidents) ? input.incidents : [];
        var rawAgents = input.agents && typeof input.agents === 'object' ? input.agents : {};
        var options = input.options && typeof input.options === 'object' ? input.options : {};
        var appetite = isStr(options.risk_appetite) && APPETITE_MULT[options.risk_appetite]
            ? options.risk_appetite : 'balanced';
        options = { risk_appetite: appetite };

        // deep copy inputs (never mutate)
        var incidents = rawIncidents.map(deepCopy);
        var agents = {};
        Object.keys(rawAgents).forEach(function (k) { agents[k] = deepCopy(rawAgents[k]); });

        // pre-aggregate
        var agentBuckets = {}; // agent|category -> [id]
        var agentTotals = {};
        var categoryCounts = {};
        incidents.forEach(function (inc, idx) {
            var id = isStr(inc.id) ? inc.id : ('inc-' + (idx + 1));
            inc._fallbackId = id;
            if (inc.agent_id && inc.category) {
                var k = inc.agent_id + '|' + inc.category;
                (agentBuckets[k] = agentBuckets[k] || []).push(id);
            }
            if (inc.agent_id) agentTotals[inc.agent_id] = (agentTotals[inc.agent_id] || 0) + 1;
            if (inc.category) categoryCounts[inc.category] = (categoryCounts[inc.category] || 0) + 1;
        });

        var ctx = {
            nowMs: nowMs, agents: agents,
            agentBuckets: agentBuckets, agentTotals: agentTotals, _auto: 1
        };
        var perIncident = incidents.map(function (inc) { return classifyIncident(inc, ctx); });

        // clusters
        var clusters = [];
        Object.keys(agentBuckets).sort().forEach(function (key) {
            var ids = agentBuckets[key];
            if (ids.length >= 3) {
                var parts = key.split('|');
                var latest = 0;
                incidents.forEach(function (inc) {
                    var id = isStr(inc.id) ? inc.id : inc._fallbackId;
                    if (ids.indexOf(id) !== -1) {
                        var t = tsMs(inc.timestamp);
                        if (t !== null && t > latest) latest = t;
                    }
                });
                clusters.push({
                    key: key,
                    agent_id: parts[0],
                    category: parts[1],
                    count: ids.length,
                    incident_ids: ids.slice(),
                    latest_ts: latest ? new Date(latest).toISOString() : null
                });
            }
        });

        // summary
        var critical_count = perIncident.filter(function (i) { return i.severity === 'critical'; }).length;
        var recurrence_count = perIncident.filter(function (i) { return i.recurrence_flag; }).length;
        var customer_impacting_count = perIncident.filter(function (i) { return i.customer_impact === 'high' || i.customer_impact === 'medium'; }).length;
        var uniqueAgents = {};
        perIncident.forEach(function (i) { if (i.agent_id) uniqueAgents[i.agent_id] = true; });
        var resolutionVals = perIncident.map(function (i) { return i.resolution_minutes; }).filter(isNum);
        var mean_resolution_minutes = resolutionVals.length
            ? Math.round((resolutionVals.reduce(function (s, v) { return s + v; }, 0) / resolutionVals.length) * 10) / 10
            : null;

        var topCat = null, topCatN = 0;
        Object.keys(categoryCounts).sort().forEach(function (c) {
            if (categoryCounts[c] > topCatN) { topCatN = categoryCounts[c]; topCat = c; }
        });
        var topAgent = null, topAgentN = 0;
        Object.keys(agentTotals).sort().forEach(function (a) {
            if (agentTotals[a] > topAgentN) { topAgentN = agentTotals[a]; topAgent = a; }
        });

        // posture_score: 100 - weighted severity penalty
        var penalty = 0;
        perIncident.forEach(function (i) {
            penalty += (i.severity_score / 100) * (i.priority === 'P0' ? 18 : i.priority === 'P1' ? 9 : i.priority === 'P2' ? 3 : 1);
        });
        penalty = penalty * APPETITE_MULT[appetite];
        // cautious *0.92 / balanced *1.0 / aggressive *1.08 applied to FINAL posture_score per spec
        // We instead apply inversely: lower posture for cautious. Spec says:
        // "modulated by risk_appetite cautious *0.92 / balanced *1.0 / aggressive *1.08"
        var raw = 100 - penalty;
        var posture_score = clamp(Math.round(raw * APPETITE_MULT[appetite]), 0, 100);

        var grade;
        if (posture_score >= 85) grade = 'A';
        else if (posture_score >= 70) grade = 'B';
        else if (posture_score >= 55) grade = 'C';
        else if (posture_score >= 40) grade = 'D';
        else grade = 'F';
        if (clusters.length > 0 || perIncident.some(function (i) { return i.verdict === 'CHRONIC_PATTERN'; }) || critical_count >= 3) {
            grade = 'F';
        }

        var summary = {
            incident_count: perIncident.length,
            unique_agents_affected: Object.keys(uniqueAgents).length,
            critical_count: critical_count,
            recurrence_count: recurrence_count,
            customer_impacting_count: customer_impacting_count,
            mean_resolution_minutes: mean_resolution_minutes,
            top_category: topCat,
            top_affected_agent: topAgent,
            posture_score: posture_score,
            grade: grade,
            risk_appetite: appetite,
            // internal aggregates exposed for downstream use
            _categoryCounts: categoryCounts,
            _agentCounts: agentTotals
        };

        var playbook = buildPlaybook(perIncident, clusters, summary, options);
        var insights = buildInsights(perIncident, clusters, summary);

        // strip internal underscored keys from the final summary copy
        var publicSummary = {};
        Object.keys(summary).forEach(function (k) {
            if (k.charAt(0) !== '_') publicSummary[k] = summary[k];
        });

        var p0Count = playbook.filter(function (a) { return a.priority === 'P0'; }).length;
        var p1Count = playbook.filter(function (a) { return a.priority === 'P1'; }).length;
        var headline = 'VERDICT: grade=' + grade + ' incidents=' + perIncident.length +
            ' P0=' + p0Count + ' P1=' + p1Count + ' posture_score=' + posture_score;

        return {
            version: VERSION,
            generated_at: new Date(nowMs).toISOString(),
            headline: headline,
            summary: publicSummary,
            incidents: perIncident,
            recurrence_clusters: clusters,
            playbook: playbook,
            insights: insights
        };
    }

    // ── simulate ─────────────────────────────────────────────────────

    var ACTION_WEIGHTS = {
        LAUNCH_RCA_REVIEW: 12,
        BREAK_RECURRENCE_LOOP: 15,
        QUARANTINE_AGENT_PENDING_FIX: 10,
        NOTIFY_AFFECTED_CUSTOMERS: 5,
        CLOSE_ACTION_ITEMS_BACKLOG: 8,
        INSTRUMENT_MISSING_DETECTION: 7,
        BLAMELESS_POSTMORTEM_TEMPLATE: 5,
        ROOT_CAUSE_TAXONOMY_AUDIT: 4,
        SCHEDULE_POSTMORTEM_AUDIT: 2,
        MAINTAIN_LEARNING_CADENCE: 0
    };

    function simulateImpl(opts, report) {
        opts = opts || {};
        var applyTop = isNum(opts.applyTop) ? Math.max(0, Math.floor(opts.applyTop)) : 0;
        var copy = deepCopy(report);
        var baseline = copy.summary && isNum(copy.summary.posture_score) ? copy.summary.posture_score : 0;
        var actions = (copy.playbook || []).slice(0, applyTop);
        var lift = 0;
        actions.forEach(function (a, i) {
            var w = ACTION_WEIGHTS[a.label] || 0;
            lift += w * Math.pow(0.85, i);
        });
        lift = Math.max(5, Math.round(lift));
        var projected = clamp(baseline + lift, 0, 100);
        var projectedGrade;
        if (projected >= 85) projectedGrade = 'A';
        else if (projected >= 70) projectedGrade = 'B';
        else if (projected >= 55) projectedGrade = 'C';
        else if (projected >= 40) projectedGrade = 'D';
        else projectedGrade = 'F';
        return {
            applied: actions.length,
            baseline_posture_score: baseline,
            projected_posture_score: projected,
            projected_grade: projectedGrade,
            applied_actions: actions.map(function (a) {
                return { id: a.id, label: a.label, priority: a.priority };
            })
        };
    }

    // ── formatters ───────────────────────────────────────────────────

    function tableRow(cols) { return '| ' + cols.join(' | ') + ' |'; }
    function tableSep(n) { return '|' + new Array(n + 1).join(' --- |'); }
    function escMd(s) { return String(s == null ? '' : s).replace(/\|/g, '\\|'); }

    function formatTextImpl(report) {
        if (!report) return '';
        var lines = [];
        lines.push(report.headline);
        lines.push('');
        lines.push('Summary:');
        var s = report.summary;
        Object.keys(s).sort().forEach(function (k) {
            lines.push('  ' + k + ': ' + s[k]);
        });
        lines.push('');
        lines.push('Incidents (' + report.incidents.length + '):');
        report.incidents.forEach(function (i) {
            lines.push('  - [' + i.priority + '] ' + i.id + ' agent=' + (i.agent_id || '?') +
                ' severity=' + (i.severity || '?') + ' verdict=' + i.verdict +
                ' score=' + i.severity_score + ' factors=' + (i.contributing_factors.join(',') || 'none'));
        });
        lines.push('');
        lines.push('Recurrence clusters (' + report.recurrence_clusters.length + '):');
        if (!report.recurrence_clusters.length) lines.push('  (none)');
        report.recurrence_clusters.forEach(function (c) {
            lines.push('  - ' + c.key + ' count=' + c.count + ' latest=' + (c.latest_ts || 'n/a'));
        });
        lines.push('');
        lines.push('Playbook (' + report.playbook.length + '):');
        report.playbook.forEach(function (a) {
            lines.push('  [' + a.priority + '] ' + a.label + ' (owner=' + a.owner + ', blast=' + a.blast_radius + ')');
            lines.push('    ' + a.reason);
        });
        lines.push('');
        lines.push('Insights:');
        report.insights.forEach(function (i) { lines.push('  - ' + i); });
        return lines.join('\n');
    }

    function formatMarkdownImpl(report) {
        if (!report) return '';
        var lines = [];
        lines.push('# AgentPostmortemAdvisor Report');
        lines.push('');
        lines.push('**' + escMd(report.headline) + '**');
        lines.push('');
        lines.push('## Summary');
        lines.push('');
        lines.push(tableRow(['metric', 'value']));
        lines.push(tableSep(2));
        Object.keys(report.summary).sort().forEach(function (k) {
            lines.push(tableRow([escMd(k), escMd(report.summary[k])]));
        });
        lines.push('');
        lines.push('## Incidents');
        lines.push('');
        if (report.incidents.length === 0) {
            lines.push('_No incidents in window._');
        } else {
            lines.push(tableRow(['id', 'agent', 'severity', 'verdict', 'priority', 'score', 'factors']));
            lines.push(tableSep(7));
            report.incidents.forEach(function (i) {
                lines.push(tableRow([
                    escMd(i.id), escMd(i.agent_id || ''), escMd(i.severity || ''),
                    escMd(i.verdict), escMd(i.priority), escMd(i.severity_score),
                    escMd(i.contributing_factors.join(',') || '—')
                ]));
            });
        }
        lines.push('');
        lines.push('## Recurrence clusters');
        lines.push('');
        if (report.recurrence_clusters.length === 0) {
            lines.push('_No recurrence clusters detected._');
        } else {
            lines.push(tableRow(['key', 'agent', 'category', 'count', 'latest_ts']));
            lines.push(tableSep(5));
            report.recurrence_clusters.forEach(function (c) {
                lines.push(tableRow([escMd(c.key), escMd(c.agent_id), escMd(c.category),
                escMd(c.count), escMd(c.latest_ts || 'n/a')]));
            });
        }
        lines.push('');
        lines.push('## Playbook');
        lines.push('');
        if (report.playbook.length === 0) {
            lines.push('_No actions._');
        } else {
            lines.push(tableRow(['priority', 'label', 'owner', 'blast', 'reason']));
            lines.push(tableSep(5));
            report.playbook.forEach(function (a) {
                lines.push(tableRow([escMd(a.priority), escMd(a.label), escMd(a.owner),
                escMd(a.blast_radius), escMd(a.reason)]));
            });
        }
        lines.push('');
        lines.push('## Insights');
        lines.push('');
        report.insights.forEach(function (i) { lines.push('- ' + escMd(i)); });
        return lines.join('\n');
    }

    function formatJsonImpl(report) {
        return stableStringify(report, 2);
    }

    // ── factory ──────────────────────────────────────────────────────

    function createAgentPostmortemAdvisor(opts) {
        opts = opts || {};
        var nowFn = typeof opts.now === 'function' ? opts.now : function () { return new Date(); };
        var instance = { _now: nowFn };

        return {
            VERSION: VERSION,
            analyze: function (input) { return analyzeImpl(input || {}, instance); },
            simulate: function (simOpts, report) { return simulateImpl(simOpts, report); },
            formatText: formatTextImpl,
            formatMarkdown: formatMarkdownImpl,
            formatJson: formatJsonImpl
        };
    }

    return {
        VERSION: VERSION,
        createAgentPostmortemAdvisor: createAgentPostmortemAdvisor
    };
}));
