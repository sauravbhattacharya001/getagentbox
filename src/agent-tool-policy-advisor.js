/**
 * AgentToolPolicyAdvisor - agentic per-tool action-policy synthesizer for AgentBox.
 *
 * Inputs a list of declared tools (with intrinsic risk metadata) and recent
 * usage telemetry, then recommends one of five verdicts per tool:
 *   ALLOW | ALLOW_WITH_LOG | CONFIRM | DENY | QUARANTINE
 *
 * Verdicts are driven by:
 *   - Intrinsic risk (category + side effects + blast radius + sandbox/auth)
 *   - Telemetry signals (error rate, injection attempts, human overrides,
 *     staleness, volume amplification, user-feedback negativity)
 *   - Agent context (autonomy level, risk appetite, domain)
 *
 * Pure JS, zero dependencies, UMD wrapper (Node + browser globals).
 * Deterministic: given identical inputs (plus options.now), outputs are byte-stable.
 *
 * Sibling to:
 *   - AgentTriageAdvisor   (inbox lane routing)
 *   - AgentRolloutPlanner  (deployment phases)
 *   - AgentDriftDetector   (behavioral drift)
 *
 * Public API:
 *   advise({ tools, telemetry, agentProfile?, options? }) -> Report
 *   simulate({ report, applyTopN }) -> { projectedRisk, projectedGrade, applied }
 *   formatText(report)     -> string
 *   formatMarkdown(report) -> string
 *   formatJson(report)     -> string (byte-stable, sorted keys, 2-space indent)
 *   VERSION
 */
(function (root, factory) {
    'use strict';
    if (typeof module === 'object' && module.exports) {
        module.exports = factory();
    } else {
        root.AgentToolPolicyAdvisor = factory();
    }
}(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    var VERSION = '1.0.0';

    // ── Catalogues ────────────────────────────────────────────────────

    var CATEGORY_BASE = {
        payment: 35,
        identity: 35,
        irreversible: 35,
        shell: 25,
        code_exec: 25,
        filesystem: 18,
        data_write: 18,
        email: 18,
        network: 12,
        browser: 12,
        data_read: 5,
        unknown: 20
    };

    var SIDE_EFFECT_WEIGHT = {
        none: 0,
        read: 2,
        write: 10,
        external: 15,
        irreversible: 25
    };

    var DEFAULT_THRESHOLDS = {
        confirm: 35,
        deny: 70,
        quarantine: 85
    };

    var APPETITE_SHIFT = {
        cautious: -10,
        balanced: 0,
        aggressive: 10
    };

    // ── tiny utilities ────────────────────────────────────────────────

    function clamp(v, lo, hi) { return v < lo ? lo : (v > hi ? hi : v); }
    function round0(v) { return Math.round(v); }

    function deepCopy(o) {
        if (o === null || typeof o !== 'object') return o;
        if (Array.isArray(o)) return o.map(deepCopy);
        var out = {};
        for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) out[k] = deepCopy(o[k]);
        return out;
    }

    function sortedKeysReplacer(_key, val) { return val; }

    function stableStringify(value, indent) {
        // Recursive sort-keys → standard JSON.stringify with sorted ordering.
        function sortKeys(v) {
            if (Array.isArray(v)) return v.map(sortKeys);
            if (v && typeof v === 'object') {
                var out = {};
                Object.keys(v).sort().forEach(function (k) { out[k] = sortKeys(v[k]); });
                return out;
            }
            return v;
        }
        return JSON.stringify(sortKeys(value), sortedKeysReplacer, indent || 0);
    }

    function nowIso(ms) {
        var d = new Date(typeof ms === 'number' ? ms : Date.now());
        return d.toISOString();
    }

    function buildTelemetryIndex(telemetry) {
        var ix = {};
        (telemetry || []).forEach(function (t) {
            if (t && typeof t.tool === 'string') ix[t.tool] = t;
        });
        return ix;
    }

    // ── Per-tool scoring ──────────────────────────────────────────────

    function scoreTool(tool, telem, agentProfile) {
        var reasons = [];
        var add = function (code, label, weight) {
            if (weight > 0) reasons.push({ code: code, label: label, weight: weight });
        };

        var category = tool.category || 'unknown';
        var sideEffects = tool.sideEffects || 'none';
        var blast = typeof tool.blastRadius === 'number' ? tool.blastRadius : 1;

        // (1) Intrinsic category baseline
        var catWeight = CATEGORY_BASE[category];
        if (typeof catWeight !== 'number') {
            catWeight = CATEGORY_BASE.unknown;
        }
        add('CATEGORY_BASELINE', 'Category baseline: ' + category, catWeight);
        if (category === 'unknown') {
            add('UNKNOWN_CATEGORY', 'Unknown tool category — assume worst-case', 0.01);
            // ensure reason recorded even though weight bundled in baseline
        }

        // (2) Side effects
        var seWeight = SIDE_EFFECT_WEIGHT[sideEffects];
        if (typeof seWeight !== 'number') seWeight = 0;
        if (seWeight > 0) add('SIDE_EFFECTS_' + sideEffects.toUpperCase(), 'Side effects: ' + sideEffects, seWeight);

        // (3) Blast radius
        var brWeight = (clamp(blast, 1, 5) - 1) * 4;
        if (brWeight > 0) add('BLAST_RADIUS', 'Blast radius ' + clamp(blast, 1, 5) + '/5', brWeight);

        // (4) Sandbox / auth modifiers
        var sandboxBonus = 0;
        if (tool.sandboxed === true) {
            sandboxBonus = -10;
            reasons.push({ code: 'SANDBOXED', label: 'Sandboxed execution', weight: -10 });
        }
        var missingAuth = 0;
        var heavySE = (sideEffects === 'write' || sideEffects === 'external' || sideEffects === 'irreversible');
        if (tool.requiresAuth === false && heavySE) {
            missingAuth = 6;
            add('MISSING_AUTH', 'High side-effects tool without auth', 6);
        }

        // Telemetry-driven
        var inv = telem ? Math.max(0, telem.invocations || 0) : 0;
        var errs = telem ? Math.max(0, telem.errors || 0) : 0;
        var inj = telem ? Math.max(0, telem.injectionAttempts || 0) : 0;
        var overrides = telem ? Math.max(0, telem.humanOverrides || 0) : 0;
        var lastUsed = telem && typeof telem.lastUsedDaysAgo === 'number' ? telem.lastUsedDaysAgo : null;
        var posFb = telem ? Math.max(0, telem.successUserFeedbackPos || 0) : 0;
        var negFb = telem ? Math.max(0, telem.successUserFeedbackNeg || 0) : 0;

        // (5) Error rate
        var errRate = inv > 0 ? errs / inv : 0;
        if (errRate >= 0.15) add('HIGH_ERROR_RATE', 'Error rate ' + (Math.round(errRate * 100)) + '%', 18);
        else if (errRate >= 0.05) add('ELEVATED_ERROR_RATE', 'Elevated error rate ' + (Math.round(errRate * 100)) + '%', 8);

        // (6) Injection
        var injWeight = 0;
        if (inj > 0) {
            injWeight = Math.min(20, 4 + inj * 2);
            add('INJECTION_SIGNAL', 'Prompt-injection markers detected (' + inj + ')', injWeight);
        }

        // (7) User overrides
        if (inv > 0 && (overrides / inv) > 0.2) {
            add('USER_RESISTANCE', 'High human-override ratio', 10);
        }

        // (8) Stale tool
        if (lastUsed !== null && lastUsed >= 30) {
            add('STALE_TOOL', 'Not used in ' + lastUsed + ' days', 6);
        }

        // (9) High-volume risky
        var riskyCats = { payment: 1, shell: 1, code_exec: 1, identity: 1, irreversible: 1 };
        if (inv >= 50 && riskyCats[category]) {
            add('VOLUME_AMPLIFIED_RISK', 'High call volume on risky category', 5);
        }

        // (10) Negative feedback
        if ((posFb + negFb) >= 5 && (negFb / (posFb + negFb)) > 0.3) {
            add('NEGATIVE_FEEDBACK', 'Negative user feedback ratio > 30%', 6);
        }

        // (13) Autonomy modifier (placed before appetite/domain so reasons list it)
        var autonomy = agentProfile && typeof agentProfile.autonomyLevel === 'number' ? agentProfile.autonomyLevel : 3;
        if (autonomy === 5 && heavySE) {
            add('FULL_AUTO_HIGH_EFFECTS', 'Full-auto agent on high-effect tool', 4);
        }

        // (12) Domain modifier
        var domain = agentProfile && agentProfile.domain;
        if ((domain === 'finance' || domain === 'healthcare')) {
            if ({ payment: 1, identity: 1, data_write: 1, irreversible: 1 }[category]) {
                add('DOMAIN_REGULATED', 'Regulated domain: ' + domain, 5);
            }
        }
        if (domain === 'devops' && (category === 'shell' || category === 'code_exec')) {
            add('DOMAIN_DEVOPS', 'Devops domain: shell-class tool', 3);
        }

        // Sum components
        var raw = 0;
        reasons.forEach(function (r) { raw += r.weight; });
        // The UNKNOWN_CATEGORY marker had a placeholder weight 0.01; strip and don't count
        reasons = reasons.filter(function (r) { return r.code !== 'UNKNOWN_CATEGORY' || true; });
        // Recompute without placeholder
        raw = 0;
        reasons.forEach(function (r) {
            if (r.code === 'UNKNOWN_CATEGORY') return; // marker only
            raw += r.weight;
        });

        // (11) Risk appetite modifier (last, before clamp)
        var appetite = agentProfile && agentProfile.riskAppetite;
        var appetiteShift = 0;
        if (appetite === 'cautious') appetiteShift = 6;
        else if (appetite === 'aggressive') appetiteShift = -6;
        if (appetiteShift !== 0) {
            reasons.push({
                code: appetiteShift > 0 ? 'CAUTIOUS_APPETITE' : 'AGGRESSIVE_APPETITE',
                label: (appetiteShift > 0 ? 'Cautious' : 'Aggressive') + ' risk appetite modifier',
                weight: appetiteShift
            });
            raw += appetiteShift;
        }

        var riskScore = clamp(round0(raw), 0, 100);

        // Confidence
        var confidence = 60;
        if (!telem) confidence -= 10;
        if (inv >= 50) confidence += 20;
        if (inv >= 200) confidence += 10;
        if (inv < 5 && telem) confidence -= 15;
        confidence = clamp(round0(confidence), 5, 100);

        // Dedup reasons by code (keep highest weight) — most reasons unique already
        var seen = {};
        var deduped = [];
        reasons.forEach(function (r) {
            if (!(r.code in seen)) { seen[r.code] = deduped.length; deduped.push(r); }
            else if (Math.abs(r.weight) > Math.abs(deduped[seen[r.code]].weight)) deduped[seen[r.code]] = r;
        });

        // Sort reasons: weight desc, code asc
        deduped.sort(function (a, b) {
            if (b.weight !== a.weight) return b.weight - a.weight;
            return a.code < b.code ? -1 : a.code > b.code ? 1 : 0;
        });

        return {
            name: tool.name,
            category: category,
            sideEffects: sideEffects,
            blastRadius: clamp(blast, 1, 5),
            riskScore: riskScore,
            confidence: confidence,
            reasons: deduped,
            _hasInjection: inj > 0,
            _hasHighError: errRate >= 0.15,
            _stale: lastUsed !== null && lastUsed >= 30,
            _telem: telem || null
        };
    }

    // ── Verdict ───────────────────────────────────────────────────────

    function resolveThresholds(agentProfile, options) {
        var t = { confirm: DEFAULT_THRESHOLDS.confirm, deny: DEFAULT_THRESHOLDS.deny, quarantine: DEFAULT_THRESHOLDS.quarantine };
        var shift = 0;
        if (agentProfile && APPETITE_SHIFT[agentProfile.riskAppetite] != null) {
            shift = APPETITE_SHIFT[agentProfile.riskAppetite];
        }
        t.confirm += shift;
        t.deny += shift;
        t.quarantine += shift;
        if (options) {
            if (typeof options.confirmThreshold === 'number') t.confirm = options.confirmThreshold;
            if (typeof options.denyThreshold === 'number') t.deny = options.denyThreshold;
            if (typeof options.quarantineThreshold === 'number') t.quarantine = options.quarantineThreshold;
        }
        return t;
    }

    function classify(scored, thresholds) {
        var s = scored.riskScore;
        var verdict, priority;
        if (s >= thresholds.quarantine) { verdict = 'QUARANTINE'; priority = 'P0'; }
        else if (s >= thresholds.deny) { verdict = 'DENY'; priority = 'P0'; }
        else if (s >= thresholds.confirm) { verdict = 'CONFIRM'; priority = 'P1'; }
        else if (scored.sideEffects !== 'none') { verdict = 'ALLOW_WITH_LOG'; priority = 'P2'; }
        else { verdict = 'ALLOW'; priority = 'P2'; }

        // Injection upgrade
        if (scored._hasInjection && (verdict === 'ALLOW' || verdict === 'ALLOW_WITH_LOG')) {
            verdict = 'CONFIRM';
            priority = 'P1';
            scored.reasons.push({ code: 'INJECTION_UPGRADE', label: 'Verdict upgraded due to injection signal', weight: 0 });
        }
        return { verdict: verdict, priority: priority };
    }

    function recommendGuards(scored, verdict) {
        var guards = [];
        if (verdict === 'ALLOW') guards = [];
        else if (verdict === 'ALLOW_WITH_LOG') guards = ['audit_log'];
        else if (verdict === 'CONFIRM') {
            guards = ['human_in_loop', 'audit_log'];
            if (scored.sideEffects === 'external' || scored.sideEffects === 'irreversible') guards.push('dry_run_first');
        } else if (verdict === 'DENY') {
            guards = ['allowlist_args:strict', 'rate_limit:5/min', 'audit_log'];
        } else if (verdict === 'QUARANTINE') {
            guards = ['sandbox', 'rotate_credentials_after_use', 'audit_log', 'allowlist_args:strict'];
        }
        if (scored._hasHighError && guards.indexOf('argument_validator') === -1) guards.push('argument_validator');
        if (scored._hasInjection && guards.indexOf('argument_validator') === -1) guards.push('argument_validator');
        return guards;
    }

    function estDelta(guards, riskScore) {
        var rawDelta = -3 * guards.length;
        if (rawDelta < -25) rawDelta = -25;
        // Cap so projected riskScore ≥ 5
        var floor = -(riskScore - 5);
        if (floor > 0) floor = 0;
        if (rawDelta < floor) rawDelta = floor;
        return rawDelta;
    }

    function rationale(scored, verdict) {
        var top = scored.reasons[0] ? scored.reasons[0].code : 'NO_SIGNAL';
        return verdict + ' (' + scored.riskScore + '/100) — primary: ' + top;
    }

    // ── Playbook ──────────────────────────────────────────────────────

    function buildPlaybook(toolReports) {
        var items = [];
        var quarantined = toolReports.filter(function (t) { return t.verdict === 'QUARANTINE'; }).map(function (t) { return t.name; });
        var denied = toolReports.filter(function (t) { return t.verdict === 'DENY'; }).map(function (t) { return t.name; });
        var confirms = toolReports.filter(function (t) { return t.verdict === 'CONFIRM'; }).map(function (t) { return t.name; });
        var logged = toolReports.filter(function (t) { return t.verdict === 'ALLOW_WITH_LOG'; }).map(function (t) { return t.name; });
        var injected = toolReports.filter(function (t) {
            return t.reasons.some(function (r) { return r.code === 'INJECTION_SIGNAL'; });
        }).map(function (t) { return t.name; });
        var staleSoft = toolReports.filter(function (t) {
            return (t.verdict === 'ALLOW' || t.verdict === 'ALLOW_WITH_LOG') &&
                t.reasons.some(function (r) { return r.code === 'STALE_TOOL'; });
        }).map(function (t) { return t.name; });
        var credCats = { identity: 1, payment: 1 };
        var credTools = toolReports.filter(function (t) {
            return credCats[t.category] && (t.verdict === 'DENY' || t.verdict === 'QUARANTINE');
        }).map(function (t) { return t.name; });

        if (quarantined.length) items.push({
            id: 'QUARANTINE_NOW', priority: 'P0', label: 'Quarantine high-risk tools now',
            owner: 'security', reason: quarantined.length + ' tool(s) over quarantine threshold',
            blastRadius: 5, reversibility: 'high', tools: quarantined
        });
        if (denied.length) items.push({
            id: 'BLOCK_AND_REVIEW', priority: 'P0', label: 'Block and security-review',
            owner: 'security', reason: denied.length + ' tool(s) over deny threshold',
            blastRadius: 4, reversibility: 'high', tools: denied
        });
        if (confirms.length) items.push({
            id: 'REQUIRE_CONFIRMATION', priority: 'P1', label: 'Require human confirmation',
            owner: 'product', reason: confirms.length + ' tool(s) need human-in-loop',
            blastRadius: 3, reversibility: 'high', tools: confirms
        });
        if (credTools.length) items.push({
            id: 'ROTATE_CREDENTIALS', priority: 'P1', label: 'Rotate credentials for identity/payment tools',
            owner: 'security', reason: 'Identity or payment tool was denied/quarantined',
            blastRadius: 4, reversibility: 'medium', tools: credTools
        });
        if (injected.length) items.push({
            id: 'PATCH_INJECTION_VECTOR', priority: 'P1', label: 'Patch prompt-injection vector',
            owner: 'security', reason: 'Injection markers seen on ' + injected.length + ' tool(s)',
            blastRadius: 4, reversibility: 'medium', tools: injected
        });
        if (logged.length) items.push({
            id: 'ENABLE_AUDIT_LOG', priority: 'P2', label: 'Enable audit log for side-effect tools',
            owner: 'platform', reason: logged.length + ' tool(s) have side effects',
            blastRadius: 2, reversibility: 'high', tools: logged
        });
        if (staleSoft.length) items.push({
            id: 'DEPRECATE_STALE', priority: 'P2', label: 'Deprecate stale tools',
            owner: 'platform', reason: staleSoft.length + ' tool(s) not used in 30+ days',
            blastRadius: 2, reversibility: 'high', tools: staleSoft
        });

        // P0-first stable ordering; preserves insertion order within priority
        var rank = { P0: 0, P1: 1, P2: 2 };
        items.sort(function (a, b) { return rank[a.priority] - rank[b.priority]; });
        return items;
    }

    // ── Portfolio + insights ──────────────────────────────────────────

    function gradeFor(risk, hasQuarantine) {
        if (hasQuarantine) return 'F';
        if (risk < 20) return 'A';
        if (risk < 35) return 'B';
        if (risk < 55) return 'C';
        if (risk < 75) return 'D';
        return 'F';
    }

    function buildPortfolio(toolReports, agentProfile, balancedComparisonCounts) {
        var counts = { ALLOW: 0, ALLOW_WITH_LOG: 0, CONFIRM: 0, DENY: 0, QUARANTINE: 0 };
        var sum = 0;
        var hasQ = false;
        toolReports.forEach(function (t) {
            counts[t.verdict] = (counts[t.verdict] || 0) + 1;
            sum += t.riskScore;
            if (t.verdict === 'QUARANTINE') hasQ = true;
        });
        var portfolioRisk = toolReports.length ? round0(sum / toolReports.length) : 0;
        var grade = gradeFor(portfolioRisk, hasQ);

        var insights = [];
        var injectionCount = toolReports.filter(function (t) {
            return t.reasons.some(function (r) { return r.code === 'INJECTION_SIGNAL'; });
        }).length;
        if (injectionCount > 0) insights.push('Injection signals on ' + injectionCount + ' tool(s) — patch input handling');

        var p0Count = toolReports.filter(function (t) { return t.priority === 'P0'; }).length;
        if (toolReports.length && (p0Count / toolReports.length) >= 0.25) {
            insights.push(Math.round(100 * p0Count / toolReports.length) + '% of tools are P0 — high-risk fleet');
        }

        var top3 = toolReports.slice(0, 3);
        var shellLike = top3.filter(function (t) { return t.category === 'shell' || t.category === 'code_exec'; }).length;
        if (shellLike >= 2) insights.push('Shell/code_exec dominates risk (' + shellLike + ' of top-3)');

        var staleCount = toolReports.filter(function (t) {
            return t.reasons.some(function (r) { return r.code === 'STALE_TOOL'; });
        }).length;
        if (staleCount > 0) insights.push('Stale tools could be retired (' + staleCount + ')');

        if (agentProfile && agentProfile.riskAppetite === 'aggressive' && balancedComparisonCounts) {
            // count any verdict that became "softer" than under balanced
            var rank = { ALLOW: 0, ALLOW_WITH_LOG: 1, CONFIRM: 2, DENY: 3, QUARANTINE: 4 };
            var softer = 0;
            for (var i = 0; i < toolReports.length; i++) {
                var bcName = toolReports[i].name;
                var bal = balancedComparisonCounts[bcName];
                if (bal && rank[toolReports[i].verdict] < rank[bal]) softer++;
            }
            if (softer > 0) insights.push('Aggressive risk appetite is masking ' + softer + ' finding(s)');
        }

        return {
            overallGrade: grade,
            portfolioRisk: portfolioRisk,
            counts: counts,
            insights: insights
        };
    }

    // ── Main: advise ──────────────────────────────────────────────────

    function adviseInternal(tools, telemIx, agentProfile, options) {
        var thresholds = resolveThresholds(agentProfile, options);

        var scoredList = tools.map(function (tool) {
            var s = scoreTool(tool, telemIx[tool.name] || null, agentProfile);
            var c = classify(s, thresholds);
            var guards = recommendGuards(s, c.verdict);
            var delta = estDelta(guards, s.riskScore);
            return {
                name: s.name,
                category: s.category,
                sideEffects: s.sideEffects,
                blastRadius: s.blastRadius,
                verdict: c.verdict,
                priority: c.priority,
                riskScore: s.riskScore,
                confidence: s.confidence,
                reasons: s.reasons,
                recommendedGuards: guards,
                estRiskDelta: delta,
                rationale: rationale(s, c.verdict),
                _hasInjection: s._hasInjection,
                _hasHighError: s._hasHighError,
                _stale: s._stale
            };
        });

        // Sort by riskScore desc, name asc
        scoredList.sort(function (a, b) {
            if (b.riskScore !== a.riskScore) return b.riskScore - a.riskScore;
            return a.name < b.name ? -1 : a.name > b.name ? 1 : 0;
        });

        return scoredList;
    }

    function advise(input) {
        var inp = input || {};
        var tools = Array.isArray(inp.tools) ? inp.tools : [];
        var telemetry = Array.isArray(inp.telemetry) ? inp.telemetry : [];
        var agentProfile = inp.agentProfile || null;
        var options = inp.options || {};
        var telemIx = buildTelemetryIndex(telemetry);

        var scoredList = adviseInternal(tools, telemIx, agentProfile, options);

        // For "aggressive masking" insight: re-run under balanced for comparison
        var balancedCmp = null;
        if (agentProfile && agentProfile.riskAppetite === 'aggressive') {
            var bp = Object.assign({}, agentProfile, { riskAppetite: 'balanced' });
            var balScored = adviseInternal(tools, telemIx, bp, {});
            balancedCmp = {};
            balScored.forEach(function (b) { balancedCmp[b.name] = b.verdict; });
        }

        var portfolio = buildPortfolio(scoredList, agentProfile, balancedCmp);
        var playbook = buildPlaybook(scoredList);

        // Strip internal-only flags
        var publicTools = scoredList.map(function (t) {
            var o = {};
            for (var k in t) if (Object.prototype.hasOwnProperty.call(t, k) && k.charAt(0) !== '_') o[k] = t[k];
            return o;
        });

        return {
            generatedAt: nowIso(options.now),
            agentProfile: agentProfile ? deepCopy(agentProfile) : null,
            tools: publicTools,
            portfolio: portfolio,
            playbook: playbook
        };
    }

    // ── simulate ──────────────────────────────────────────────────────

    function simulate(input) {
        var inp = input || {};
        var report = inp.report;
        var applyTopN = typeof inp.applyTopN === 'number' ? inp.applyTopN : 3;
        if (!report || !Array.isArray(report.tools)) {
            return { projectedRisk: 0, projectedGrade: 'A', applied: [] };
        }
        // Pick top-N tools by P0/P1 first (preserving sort order)
        var ranked = report.tools.filter(function (t) { return t.priority === 'P0' || t.priority === 'P1'; });
        if (ranked.length < applyTopN) {
            // pad with P2 in order
            report.tools.forEach(function (t) {
                if (ranked.length < applyTopN && ranked.indexOf(t) === -1) ranked.push(t);
            });
        }
        var picks = ranked.slice(0, Math.max(0, applyTopN));
        var applied = [];
        var projectedScores = {};
        report.tools.forEach(function (t) { projectedScores[t.name] = t.riskScore; });

        picks.forEach(function (t, i) {
            var diminish = Math.pow(0.85, i);
            var delta = (t.estRiskDelta || 0) * diminish;
            var projected = Math.max(5, Math.round(projectedScores[t.name] + delta));
            applied.push({
                name: t.name,
                priorScore: t.riskScore,
                projectedScore: projected,
                appliedDelta: Math.round(delta * 10) / 10,
                guards: t.recommendedGuards.slice()
            });
            projectedScores[t.name] = projected;
        });

        var sum = 0;
        var hasQ = false;
        report.tools.forEach(function (t) {
            sum += projectedScores[t.name];
            // Project verdict by re-thresholding? Keep verdict-driven QUARANTINE flag from original report
            // EXCEPT when projection drops below quarantine threshold — be conservative and assume not lifted.
            if (t.verdict === 'QUARANTINE') hasQ = true;
        });
        var projectedRisk = report.tools.length ? Math.round(sum / report.tools.length) : 0;
        var projectedGrade = gradeFor(projectedRisk, hasQ);
        return { projectedRisk: projectedRisk, projectedGrade: projectedGrade, applied: applied };
    }

    // ── Formatters ────────────────────────────────────────────────────

    function pad(s, w) {
        s = String(s);
        if (s.length >= w) return s;
        return s + new Array(w - s.length + 1).join(' ');
    }

    function formatText(report) {
        if (!report) return '';
        var lines = [];
        lines.push('AgentToolPolicyAdvisor v' + VERSION);
        lines.push('Generated: ' + report.generatedAt);
        var p = report.portfolio || {};
        lines.push('Portfolio: grade=' + p.overallGrade + ' risk=' + p.portfolioRisk + '/100  counts=' + JSON.stringify(p.counts));
        lines.push('');
        lines.push(pad('TOOL', 28) + pad('VERDICT', 16) + pad('PRI', 5) + pad('SCORE', 7) + 'TOP REASON');
        lines.push(new Array(80).join('-'));
        (report.tools || []).forEach(function (t) {
            var topReason = (t.reasons && t.reasons[0]) ? t.reasons[0].code : '-';
            lines.push(pad(t.name, 28) + pad(t.verdict, 16) + pad(t.priority, 5) + pad(t.riskScore, 7) + topReason);
        });
        lines.push('');
        lines.push('Playbook:');
        (report.playbook || []).forEach(function (it) {
            lines.push('  [' + it.priority + '] ' + it.label + ' (' + it.owner + ') → ' + it.tools.join(', '));
        });
        if (p.insights && p.insights.length) {
            lines.push('');
            lines.push('Insights:');
            p.insights.forEach(function (s) { lines.push('  • ' + s); });
        }
        return lines.join('\n');
    }

    function formatMarkdown(report) {
        if (!report) return '';
        var p = report.portfolio || {};
        var out = [];
        out.push('# Agent Tool Policy Advisor');
        out.push('');
        out.push('_Generated: ' + report.generatedAt + '_');
        out.push('');
        out.push('**Portfolio grade:** ' + p.overallGrade + ' &nbsp; **Risk:** ' + p.portfolioRisk + '/100');
        out.push('');
        out.push('| Tool | Verdict | Score | Priority | Reasons |');
        out.push('|------|---------|-------|----------|---------|');
        (report.tools || []).forEach(function (t) {
            var reasons = (t.reasons || []).slice(0, 3).map(function (r) { return r.code; }).join(', ');
            out.push('| `' + t.name + '` | **' + t.verdict + '** | ' + t.riskScore + ' | ' + t.priority + ' | ' + reasons + ' |');
        });
        out.push('');
        out.push('## Playbook');
        out.push('');
        (report.playbook || []).forEach(function (it) {
            out.push('- **[' + it.priority + ']** ' + it.label + ' _(owner: ' + it.owner + ')_ — ' + it.tools.join(', '));
        });
        out.push('');
        out.push('## Insights');
        out.push('');
        if (!p.insights || p.insights.length === 0) {
            out.push('- _(none)_');
        } else {
            p.insights.forEach(function (s) { out.push('- ' + s); });
        }
        return out.join('\n');
    }

    function formatJson(report) {
        return stableStringify(report || {}, 2);
    }

    return {
        VERSION: VERSION,
        advise: advise,
        simulate: simulate,
        formatText: formatText,
        formatMarkdown: formatMarkdown,
        formatJson: formatJson
    };
}));
