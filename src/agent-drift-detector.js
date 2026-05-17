/**
 * AgentDriftDetector — agentic behavioral-drift monitor for AgentBox.
 *
 * Compares a baseline telemetry snapshot against a current snapshot and emits
 * a deterministic drift report: per-metric findings (severity + confidence),
 * an aggregate 0..100 driftScore + A-F grade + trajectory, autonomous
 * insights, an ordered P0/P1/P2 remediation playbook, and a simulate()
 * helper that projects driftScore reduction from applying top-N actions.
 *
 * Zero dependencies. Pure functions. Browser + Node compatible (UMD).
 *
 * Snapshot shape:
 *   {
 *     windowLabel:   'last_7d' | string,
 *     metrics: {
 *       taskSuccessRate:         0..1,   // higher better
 *       errorRate:               0..1,   // lower better
 *       latencyP95Ms:            number, // lower better
 *       hallucinationRate:       0..1,   // lower better
 *       escalationRate:          0..1,   // lower better
 *       userSatisfaction:        0..1,   // higher better
 *       avgCostPerTask:          number, // lower better
 *       toolInvocationDiversity: 0..1,   // higher better
 *       promptInjectionAttempts: number, // lower better (count)
 *       avgTokensPerTask:        number  // lower better
 *     },
 *     sampleSize?: number,
 *     topErrors?:  [{ fingerprint, count }],
 *     topTools?:   [{ name, share }]
 *   }
 *
 * agentProfile?: { name?, autonomyLevel?, riskAppetite?, domain? }
 * options?:      { thresholds?: { <metric>: { warn, critical, minPctChange } },
 *                  now? }
 */
(function (root, factory) {
    'use strict';
    if (typeof module === 'object' && module.exports) {
        module.exports = factory();
    } else {
        root.AgentDriftDetector = factory();
    }
}(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    var EPS = 1e-9;

    // direction: -1 means "lower is better" (regression when delta > 0),
    //            +1 means "higher is better" (regression when delta < 0).
    var METRIC_SPECS = {
        taskSuccessRate:         { direction:  1, weight: 1.4, p0: false, label: 'Task success rate' },
        errorRate:               { direction: -1, weight: 1.6, p0: true,  label: 'Error rate' },
        latencyP95Ms:            { direction: -1, weight: 1.0, p0: false, label: 'Latency p95 (ms)' },
        hallucinationRate:       { direction: -1, weight: 1.8, p0: true,  label: 'Hallucination rate' },
        escalationRate:          { direction: -1, weight: 1.0, p0: false, label: 'Escalation rate' },
        userSatisfaction:        { direction:  1, weight: 1.2, p0: false, label: 'User satisfaction' },
        avgCostPerTask:          { direction: -1, weight: 0.6, p0: false, label: 'Avg cost / task' },
        toolInvocationDiversity: { direction:  1, weight: 0.6, p0: false, label: 'Tool diversity' },
        promptInjectionAttempts: { direction: -1, weight: 1.7, p0: true,  label: 'Prompt-injection attempts' },
        avgTokensPerTask:        { direction: -1, weight: 0.7, p0: false, label: 'Avg tokens / task' }
    };

    // Default per-metric thresholds. "warn" / "critical" interpreted on the
    // *regression* side of the change (signed by direction). minPctChange is
    // the absolute pctChange below which we treat as noise and emit 0
    // severity even if technically regressing.
    var DEFAULT_THRESHOLDS = {
        taskSuccessRate:         { warn: 0.03, critical: 0.10, minPctChange: 0.02 },
        errorRate:               { warn: 0.02, critical: 0.08, minPctChange: 0.05 },
        latencyP95Ms:            { warn: 150,  critical: 600,  minPctChange: 0.10 },
        hallucinationRate:       { warn: 0.02, critical: 0.06, minPctChange: 0.05 },
        escalationRate:          { warn: 0.03, critical: 0.10, minPctChange: 0.05 },
        userSatisfaction:        { warn: 0.05, critical: 0.15, minPctChange: 0.03 },
        avgCostPerTask:          { warn: 0.01, critical: 0.05, minPctChange: 0.10 },
        toolInvocationDiversity: { warn: 0.10, critical: 0.30, minPctChange: 0.05 },
        promptInjectionAttempts: { warn: 5,    critical: 25,   minPctChange: 0.10 },
        avgTokensPerTask:        { warn: 200,  critical: 800,  minPctChange: 0.10 }
    };

    // ── tiny utilities ─────────────────────────────────────────────────

    function isFiniteNumber(x) {
        return typeof x === 'number' && isFinite(x);
    }
    function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
    function round(v, n) {
        if (!isFiniteNumber(v)) return v;
        var p = Math.pow(10, n || 0);
        return Math.round(v * p) / p;
    }

    function isPlainObject(o) {
        return o !== null && typeof o === 'object' && !Array.isArray(o);
    }

    // ── core: per-metric severity ──────────────────────────────────────

    function scoreMetric(name, baselineValue, currentValue, thresholds) {
        var spec = METRIC_SPECS[name];
        if (!spec) return null;
        if (!isFiniteNumber(baselineValue) || !isFiniteNumber(currentValue)) return null;

        var delta = currentValue - baselineValue;
        var denom = Math.max(Math.abs(baselineValue), EPS);
        var pctChange = delta / denom;

        // signed "badness": positive => regressing
        var badness = -spec.direction * delta;
        var badnessPct = badness / denom;

        var th = (thresholds && thresholds[name]) || DEFAULT_THRESHOLDS[name];
        var regressing = badness > 0 && Math.abs(badnessPct) >= th.minPctChange;

        var severity = 0;
        if (regressing) {
            if (badness >= th.critical) {
                severity = 75 + clamp(((badness - th.critical) / (th.critical + EPS)) * 25, 0, 25);
            } else if (badness >= th.warn) {
                var span = Math.max(th.critical - th.warn, EPS);
                severity = 40 + ((badness - th.warn) / span) * 35;
            } else {
                severity = clamp((badness / Math.max(th.warn, EPS)) * 40, 0, 40);
            }
        }

        return {
            metric: name,
            label: spec.label,
            baseline: round(baselineValue, 6),
            current:  round(currentValue, 6),
            delta:    round(delta, 6),
            pctChange: round(pctChange, 4),
            regressing: regressing,
            severityRaw: round(severity, 2),
            weight: spec.weight,
            isP0: spec.p0,
            direction: spec.direction
        };
    }

    function confidenceFrom(baselineN, currentN) {
        var bN = isFiniteNumber(baselineN) && baselineN > 0 ? baselineN : 50;
        var cN = isFiniteNumber(currentN)  && currentN  > 0 ? currentN  : 50;
        var n = Math.min(bN, cN);
        // sqrt(min(n,200)/200), clamped 0..1. n=50 → ~0.5, n=200 → 1.0, n=10 → ~0.22
        return clamp(Math.sqrt(Math.min(n, 200) / 200), 0, 1);
    }

    function reasonFor(f) {
        if (!f.regressing) {
            return 'within tolerance (Δ ' + (f.delta >= 0 ? '+' : '') + f.delta + ')';
        }
        var pct = (f.pctChange * 100).toFixed(1) + '%';
        var dirWord = f.direction > 0 ? 'dropped' : 'rose';
        return f.label + ' ' + dirWord + ' ' + pct + ' (' + f.baseline + ' → ' + f.current + ')';
    }

    // ── playbook catalog ───────────────────────────────────────────────

    var ACTION_CATALOG = [
        { id: 'notify_oncall',
          title: 'Page on-call and snapshot agent state',
          owner: 'sre',          blastRadius: 1, reversibility: 'easy',
          estDriftDelta: -4 },
        { id: 'freeze_autonomy_one_notch',
          title: 'Drop autonomy one level (e.g. L3 → L2) until drift clears',
          owner: 'platform',     blastRadius: 3, reversibility: 'easy',
          estDriftDelta: -14 },
        { id: 'enable_human_review_for_high_risk_tasks',
          title: 'Force human-in-the-loop on high-risk task classes',
          owner: 'platform',     blastRadius: 2, reversibility: 'easy',
          estDriftDelta: -10 },
        { id: 'rotate_prompt_template_to_last_good',
          title: 'Roll back system prompt to last known-good revision',
          owner: 'agent-owner',  blastRadius: 2, reversibility: 'easy',
          estDriftDelta: -16 },
        { id: 'tighten_tool_policy',
          title: 'Tighten tool-use policy & require approval for sensitive tools',
          owner: 'security',     blastRadius: 2, reversibility: 'easy',
          estDriftDelta: -12 },
        { id: 'enable_response_validator',
          title: 'Turn on response validator / citation checker',
          owner: 'platform',     blastRadius: 1, reversibility: 'easy',
          estDriftDelta: -8 },
        { id: 'cap_max_tokens_per_task',
          title: 'Cap max tokens per task to control cost & runaway responses',
          owner: 'platform',     blastRadius: 1, reversibility: 'easy',
          estDriftDelta: -5 },
        { id: 'add_retry_with_backoff',
          title: 'Add retry with exponential backoff for upstream calls',
          owner: 'platform',     blastRadius: 1, reversibility: 'easy',
          estDriftDelta: -4 },
        { id: 'rebalance_tool_invocations',
          title: 'Rebalance tool invocation policy to restore diversity',
          owner: 'agent-owner',  blastRadius: 2, reversibility: 'medium',
          estDriftDelta: -4 },
        { id: 'solicit_user_feedback_inline',
          title: 'Solicit inline thumbs-up/down feedback to gather signal',
          owner: 'product',      blastRadius: 1, reversibility: 'easy',
          estDriftDelta: -3 },
        { id: 'schedule_calibration_run',
          title: 'Schedule a calibration / replay run against golden set',
          owner: 'agent-owner',  blastRadius: 1, reversibility: 'easy',
          estDriftDelta: -6 },
        { id: 'investigate_top_error_cluster',
          title: 'Investigate the top error fingerprint cluster',
          owner: 'agent-owner',  blastRadius: 1, reversibility: 'easy',
          estDriftDelta: -5 }
    ];

    function actionById(id) {
        for (var i = 0; i < ACTION_CATALOG.length; i++) {
            if (ACTION_CATALOG[i].id === id) return ACTION_CATALOG[i];
        }
        return null;
    }

    function buildPlaybook(findingsByMetric, driftScore, trajectory, riskAppetite) {
        var bag = [];
        function push(id, priority, why) {
            var base = actionById(id);
            if (!base) return;
            bag.push({
                id: base.id,
                priority: priority,
                title: base.title,
                why: why,
                owner: base.owner,
                blastRadius: base.blastRadius,
                reversibility: base.reversibility,
                estDriftDelta: base.estDriftDelta
            });
        }

        var hall = findingsByMetric.hallucinationRate;
        var err  = findingsByMetric.errorRate;
        var inj  = findingsByMetric.promptInjectionAttempts;
        var lat  = findingsByMetric.latencyP95Ms;
        var cost = findingsByMetric.avgCostPerTask;
        var tok  = findingsByMetric.avgTokensPerTask;
        var div  = findingsByMetric.toolInvocationDiversity;
        var csat = findingsByMetric.userSatisfaction;
        var esc  = findingsByMetric.escalationRate;
        var succ = findingsByMetric.taskSuccessRate;

        var reg = function (f) { return f && f.regressing; };

        // P0
        if (trajectory === 'critical') push('notify_oncall', 'P0', 'trajectory is critical');
        if ((reg(hall) && hall.severity >= 50) || (reg(err) && err.severity >= 50)) {
            push('freeze_autonomy_one_notch', 'P0',
                reg(hall) && reg(err)
                    ? 'hallucination + error rate co-regressing'
                    : reg(hall) ? 'hallucination rate spike' : 'error rate spike');
            push('enable_human_review_for_high_risk_tasks', 'P0',
                'protect high-risk task classes during drift');
        }
        if (reg(hall) && reg(err)) {
            push('rotate_prompt_template_to_last_good', 'P0',
                'co-regression of error+hallucination usually points at prompt drift');
        }
        if (reg(inj) && inj.severity >= 40) {
            push('tighten_tool_policy', 'P0', 'prompt-injection attempts spiked');
        }

        // P1
        if (reg(hall) && hall.severity < 50 && hall.severity >= 20) {
            push('enable_response_validator', 'P1', 'moderate hallucination regression');
        }
        if (reg(tok) && reg(cost)) {
            push('cap_max_tokens_per_task', 'P1', 'cost and token usage both up');
        } else if (reg(cost)) {
            push('cap_max_tokens_per_task', 'P1', 'cost regression');
        }
        if (reg(lat)) {
            push('add_retry_with_backoff', 'P1', 'p95 latency regressed');
        }
        if (reg(succ) && succ.severity >= 30) {
            push('schedule_calibration_run', 'P1', 'task success rate regressed');
        }
        if (reg(err) && err.severity < 50 && err.severity >= 20) {
            push('investigate_top_error_cluster', 'P1', 'moderate error-rate regression');
        }

        // P2
        if (reg(div)) push('rebalance_tool_invocations', 'P2', 'tool diversity dropped');
        if (reg(csat)) push('solicit_user_feedback_inline', 'P2', 'satisfaction slipped');
        if (reg(esc)) push('schedule_calibration_run', 'P2', 'escalation rate up');

        // De-dup by id, keep the highest-priority occurrence
        var prioRank = { P0: 0, P1: 1, P2: 2 };
        var byId = {};
        for (var i = 0; i < bag.length; i++) {
            var a = bag[i];
            var existing = byId[a.id];
            if (!existing || prioRank[a.priority] < prioRank[existing.priority]) {
                byId[a.id] = a;
            }
        }
        var actions = Object.keys(byId).map(function (k) { return byId[k]; });

        // Risk-appetite modulation
        if (riskAppetite === 'aggressive') {
            actions = actions.filter(function (a) { return a.priority !== 'P2'; });
        } else if (riskAppetite === 'cautious') {
            // ensure schedule_calibration_run + solicit_user_feedback_inline are included
            if (!actions.some(function (a) { return a.id === 'schedule_calibration_run'; })) {
                push('schedule_calibration_run', 'P1', 'cautious posture: always recalibrate on any drift');
                actions.push(bag[bag.length - 1]);
            }
            if (!actions.some(function (a) { return a.id === 'solicit_user_feedback_inline'; })) {
                actions.push({
                    id: 'solicit_user_feedback_inline', priority: 'P2',
                    title: actionById('solicit_user_feedback_inline').title,
                    why: 'cautious posture: gather more signal',
                    owner: 'product', blastRadius: 1, reversibility: 'easy',
                    estDriftDelta: -3
                });
            }
        }

        // Sort P0 first, then by estDriftDelta (more negative = bigger reducer)
        actions.sort(function (a, b) {
            if (prioRank[a.priority] !== prioRank[b.priority]) {
                return prioRank[a.priority] - prioRank[b.priority];
            }
            return a.estDriftDelta - b.estDriftDelta;
        });

        return actions;
    }

    // ── insights ───────────────────────────────────────────────────────

    function buildInsights(findingsByMetric, snapshots) {
        var out = [];
        var hall = findingsByMetric.hallucinationRate;
        var err  = findingsByMetric.errorRate;
        var inj  = findingsByMetric.promptInjectionAttempts;
        var cost = findingsByMetric.avgCostPerTask;
        var div  = findingsByMetric.toolInvocationDiversity;
        var lat  = findingsByMetric.latencyP95Ms;
        var csat = findingsByMetric.userSatisfaction;
        var succ = findingsByMetric.taskSuccessRate;

        if (hall && err && hall.regressing && err.regressing) {
            out.push('errorRate and hallucinationRate co-regressing — likely upstream model/prompt change');
        }
        if (div && div.regressing && cost && cost.regressing) {
            out.push('tool diversity dropped while cost rose — agent likely over-relying on one expensive tool');
        }
        if (inj && inj.regressing && inj.severity >= 40) {
            out.push('prompt-injection attempt count surged — assume hostile traffic and tighten guardrails');
        }
        if (lat && lat.regressing && succ && succ.regressing) {
            out.push('latency and success regressing together — suspect upstream timeout / partial failures');
        }
        if (csat && csat.regressing && (!hall || !hall.regressing) && (!err || !err.regressing)) {
            out.push('satisfaction slipped without measurable quality regression — UX or persona issue likely');
        }
        if (snapshots && snapshots.current && Array.isArray(snapshots.current.topErrors) && snapshots.current.topErrors.length) {
            var top = snapshots.current.topErrors[0];
            if (top && top.fingerprint) {
                out.push('top error cluster: "' + top.fingerprint + '"' +
                    (isFiniteNumber(top.count) ? ' (' + top.count + ' occurrences)' : ''));
            }
        }
        if (out.length === 0) {
            out.push('no cross-metric pattern detected — drift appears narrow / single-axis');
        }
        return out.slice(0, 5);
    }

    // ── grade + trajectory ─────────────────────────────────────────────

    function gradeFromScore(s) {
        if (s < 10) return 'A';
        if (s < 25) return 'B';
        if (s < 50) return 'C';
        if (s < 75) return 'D';
        return 'F';
    }

    function trajectoryFrom(driftScore, p0RegressingCount) {
        if (driftScore >= 75 || p0RegressingCount >= 2) return 'critical';
        if (driftScore >= 50 || p0RegressingCount >= 1) return 'degrading';
        if (driftScore >= 20) return 'drifting';
        return 'stable';
    }

    // ── main entry ─────────────────────────────────────────────────────

    function analyze(input) {
        if (!isPlainObject(input)) {
            throw new Error('AgentDriftDetector.analyze: input must be an object');
        }
        var baseline = input.baseline;
        var current  = input.current;
        if (!isPlainObject(baseline) || !isPlainObject(baseline.metrics)) {
            throw new Error('AgentDriftDetector.analyze: baseline snapshot must include a metrics object');
        }
        if (!isPlainObject(current) || !isPlainObject(current.metrics)) {
            throw new Error('AgentDriftDetector.analyze: current snapshot must include a metrics object');
        }

        var profile = isPlainObject(input.agentProfile) ? input.agentProfile : {};
        var options = isPlainObject(input.options) ? input.options : {};
        var thresholds = isPlainObject(options.thresholds) ? options.thresholds : null;

        var riskAppetite = profile.riskAppetite || 'balanced';

        var confidence = confidenceFrom(baseline.sampleSize, current.sampleSize);

        var presentMetrics = [];
        var missingMetrics = [];
        var findings = [];
        var findingsByMetric = {};

        Object.keys(METRIC_SPECS).forEach(function (m) {
            var b = baseline.metrics[m];
            var c = current.metrics[m];
            if (!isFiniteNumber(b) || !isFiniteNumber(c)) {
                missingMetrics.push(m);
                return;
            }
            presentMetrics.push(m);
            var f = scoreMetric(m, b, c, thresholds);
            if (!f) return;
            var severity = round(clamp(f.severityRaw * (0.4 + 0.6 * confidence), 0, 100), 2);
            var enriched = {
                metric: f.metric,
                label: f.label,
                baseline: f.baseline,
                current: f.current,
                delta: f.delta,
                pctChange: f.pctChange,
                regressing: f.regressing,
                severity: severity,
                confidence: round(confidence, 3),
                weight: f.weight,
                isP0: f.isP0,
                reason: ''
            };
            enriched.reason = reasonFor(enriched);
            findings.push(enriched);
            findingsByMetric[m] = enriched;
        });

        findings.sort(function (a, b) { return b.severity - a.severity; });

        // weighted aggregate
        var wSum = 0, sSum = 0;
        for (var i = 0; i < findings.length; i++) {
            wSum += findings[i].weight;
            sSum += findings[i].weight * findings[i].severity;
        }
        var driftScore = wSum > 0 ? round(clamp(sSum / wSum, 0, 100), 2) : 0;

        var p0RegressingCount = findings.filter(function (f) {
            return f.isP0 && f.regressing && f.severity >= 30;
        }).length;

        var trajectory = trajectoryFrom(driftScore, p0RegressingCount);
        var grade = gradeFromScore(driftScore);

        var playbook = buildPlaybook(findingsByMetric, driftScore, trajectory, riskAppetite);
        var insights = buildInsights(findingsByMetric, { baseline: baseline, current: current });

        return {
            agent: profile.name || null,
            window: {
                baseline: baseline.windowLabel || null,
                current:  current.windowLabel  || null
            },
            riskAppetite: riskAppetite,
            confidence: round(confidence, 3),
            driftScore: driftScore,
            grade: grade,
            trajectory: trajectory,
            findings: findings,
            playbook: playbook,
            insights: insights,
            coverage: {
                metricsPresent: presentMetrics.sort(),
                metricsMissing: missingMetrics.sort(),
                sampleSize: {
                    baseline: isFiniteNumber(baseline.sampleSize) ? baseline.sampleSize : null,
                    current:  isFiniteNumber(current.sampleSize)  ? current.sampleSize  : null
                }
            }
        };
    }

    // ── simulate ───────────────────────────────────────────────────────

    function simulate(report, opts) {
        if (!isPlainObject(report) || !Array.isArray(report.playbook)) {
            throw new Error('AgentDriftDetector.simulate: needs a report from analyze()');
        }
        opts = opts || {};
        var applyTop = isFiniteNumber(opts.applyTop) ? Math.max(0, Math.floor(opts.applyTop)) : 3;
        var applied = report.playbook.slice(0, applyTop);
        var deltaSum = 0;
        for (var i = 0; i < applied.length; i++) {
            // diminishing returns: each additional action contributes 0.85^i
            deltaSum += applied[i].estDriftDelta * Math.pow(0.85, i);
        }
        var projected = clamp(report.driftScore + deltaSum, 0, 100);
        var p0Reg = report.findings.filter(function (f) {
            return f.isP0 && f.regressing && f.severity >= 30;
        }).length;
        // applying P0 actions reduces effective p0 regressing count
        var p0Applied = applied.filter(function (a) { return a.priority === 'P0'; }).length;
        var effectiveP0 = Math.max(0, p0Reg - p0Applied);
        return {
            appliedActions: applied.map(function (a) {
                return { id: a.id, priority: a.priority, estDriftDelta: a.estDriftDelta };
            }),
            projectedDriftScore: round(projected, 2),
            projectedGrade: gradeFromScore(projected),
            projectedTrajectory: trajectoryFrom(projected, effectiveP0),
            deltaScore: round(projected - report.driftScore, 2)
        };
    }

    // ── formatters ─────────────────────────────────────────────────────

    function pad(s, n) {
        s = String(s);
        if (s.length >= n) return s;
        return s + new Array(n - s.length + 1).join(' ');
    }

    function formatText(report) {
        var lines = [];
        lines.push('AgentDriftDetector Report');
        lines.push('=========================');
        lines.push('Agent:        ' + (report.agent || '(unnamed)'));
        lines.push('Window:       ' + (report.window.baseline || '?') + ' → ' + (report.window.current || '?'));
        lines.push('Drift score:  ' + report.driftScore + '  (grade ' + report.grade + ', ' + report.trajectory + ')');
        lines.push('Confidence:   ' + report.confidence);
        lines.push('');
        lines.push('Top findings:');
        var top = report.findings.slice(0, 6);
        if (top.length === 0) {
            lines.push('  (no measurable findings)');
        } else {
            for (var i = 0; i < top.length; i++) {
                var f = top[i];
                lines.push('  - ' + pad(f.label + ':', 28) +
                    'sev ' + pad(f.severity, 6) +
                    (f.regressing ? '[REG] ' : '[ok]  ') + f.reason);
            }
        }
        lines.push('');
        var buckets = { P0: [], P1: [], P2: [] };
        for (var j = 0; j < report.playbook.length; j++) {
            var a = report.playbook[j];
            (buckets[a.priority] || (buckets[a.priority] = [])).push(a);
        }
        ['P0', 'P1', 'P2'].forEach(function (b) {
            if (!buckets[b].length) return;
            lines.push('Playbook ' + b + ':');
            buckets[b].forEach(function (a) {
                lines.push('  - [' + a.id + '] ' + a.title + ' — ' + a.why +
                    ' (owner: ' + a.owner + ', Δ ' + a.estDriftDelta + ')');
            });
            lines.push('');
        });
        lines.push('Insights:');
        report.insights.forEach(function (s) { lines.push('  • ' + s); });
        lines.push('');
        lines.push('Coverage: ' + report.coverage.metricsPresent.length + ' present, ' +
            report.coverage.metricsMissing.length + ' missing');
        if (report.coverage.metricsMissing.length) {
            lines.push('  missing: ' + report.coverage.metricsMissing.join(', '));
        }
        return lines.join('\n');
    }

    function formatMarkdown(report) {
        var lines = [];
        lines.push('# AgentDriftDetector — ' + (report.agent || '(unnamed agent)'));
        lines.push('');
        lines.push('- **Window:** `' + (report.window.baseline || '?') + '` → `' + (report.window.current || '?') + '`');
        lines.push('- **Drift score:** **' + report.driftScore + '** (grade **' + report.grade + '**, _' + report.trajectory + '_)');
        lines.push('- **Confidence:** ' + report.confidence + ' · **Risk appetite:** ' + report.riskAppetite);
        lines.push('');
        lines.push('## Top findings');
        lines.push('');
        lines.push('| Metric | Baseline | Current | Δ | Severity | Status |');
        lines.push('|---|---:|---:|---:|---:|---|');
        var top = report.findings.slice(0, 6);
        top.forEach(function (f) {
            lines.push('| ' + f.label + ' | ' + f.baseline + ' | ' + f.current +
                ' | ' + (f.delta >= 0 ? '+' : '') + f.delta +
                ' | ' + f.severity +
                ' | ' + (f.regressing ? '⚠ regressing' : 'ok') + ' |');
        });
        lines.push('');
        var buckets = { P0: [], P1: [], P2: [] };
        for (var j = 0; j < report.playbook.length; j++) {
            var a = report.playbook[j];
            (buckets[a.priority] || (buckets[a.priority] = [])).push(a);
        }
        ['P0', 'P1', 'P2'].forEach(function (b) {
            if (!buckets[b].length) return;
            lines.push('## Playbook ' + b);
            lines.push('');
            buckets[b].forEach(function (a) {
                lines.push('- **`' + a.id + '`** — ' + a.title);
                lines.push('  - _why:_ ' + a.why);
                lines.push('  - owner: `' + a.owner + '` · blast: ' + a.blastRadius +
                    ' · reversibility: ' + a.reversibility + ' · est Δ drift: ' + a.estDriftDelta);
            });
            lines.push('');
        });
        lines.push('## Insights');
        lines.push('');
        report.insights.forEach(function (s) { lines.push('- ' + s); });
        lines.push('');
        lines.push('## Coverage');
        lines.push('');
        lines.push('- present (' + report.coverage.metricsPresent.length + '): ' +
            (report.coverage.metricsPresent.join(', ') || '_none_'));
        if (report.coverage.metricsMissing.length) {
            lines.push('- missing: ' + report.coverage.metricsMissing.join(', '));
        }
        return lines.join('\n');
    }

    function formatJson(report) {
        // Re-emit with stable key order for determinism.
        var stable = {
            agent: report.agent,
            window: report.window,
            riskAppetite: report.riskAppetite,
            confidence: report.confidence,
            driftScore: report.driftScore,
            grade: report.grade,
            trajectory: report.trajectory,
            findings: report.findings.map(function (f) {
                return {
                    metric: f.metric,
                    label: f.label,
                    baseline: f.baseline,
                    current: f.current,
                    delta: f.delta,
                    pctChange: f.pctChange,
                    regressing: f.regressing,
                    severity: f.severity,
                    confidence: f.confidence,
                    weight: f.weight,
                    isP0: f.isP0,
                    reason: f.reason
                };
            }),
            playbook: report.playbook.map(function (a) {
                return {
                    id: a.id, priority: a.priority, title: a.title, why: a.why,
                    owner: a.owner, blastRadius: a.blastRadius,
                    reversibility: a.reversibility, estDriftDelta: a.estDriftDelta
                };
            }),
            insights: report.insights.slice(),
            coverage: {
                metricsPresent: report.coverage.metricsPresent.slice(),
                metricsMissing: report.coverage.metricsMissing.slice(),
                sampleSize: {
                    baseline: report.coverage.sampleSize.baseline,
                    current: report.coverage.sampleSize.current
                }
            }
        };
        return JSON.stringify(stable, null, 2);
    }

    return {
        analyze: analyze,
        simulate: simulate,
        formatText: formatText,
        formatMarkdown: formatMarkdown,
        formatJson: formatJson,
        _internal: {
            DEFAULT_THRESHOLDS: DEFAULT_THRESHOLDS,
            ACTION_CATALOG: ACTION_CATALOG
        }
    };
}));
