/**
 * AgentSecurityPostureAdvisor — agentic per-agent security posture scorer.
 *
 * 10th sibling to AgentTriageAdvisor / AgentRolloutPlanner / AgentDriftDetector /
 * AgentToolPolicyAdvisor / AgentBudgetGuardianAdvisor / AgentAutonomyTuningAdvisor /
 * AgentMemoryHygieneAdvisor / AgentEscalationAdvisor / AgentTaskDependencyAdvisor.
 *
 * Distinct focus: deployment-time hardening posture for the agent itself
 * (credential hygiene, sandbox, network egress, dependency vulns, IAM scope,
 * encryption, TLS, security-audit recency, anomalous logins, exposed endpoints).
 * Per-tool action policy is owned by AgentToolPolicyAdvisor; this one looks
 * at the *agent's* baseline security configuration & supply chain.
 *
 * Verdicts (per agent):
 *   HARDENED | OK | MONITOR | TIGHTEN_CONFIG | QUARANTINE |
 *   EMERGENCY_ISOLATE | INSUFFICIENT_DATA
 *
 * Pure JS, zero deps, UMD wrapper, deterministic given injectable now().
 * Never mutates inputs.
 *
 * Public API:
 *   const advisor = createAgentSecurityPostureAdvisor({ now });
 *   const report  = advisor.analyze({ agents, options });
 *   const sim     = advisor.simulate({ applyTop: N }, report);
 *   advisor.formatText(report) / formatMarkdown(report) / formatJson(report);
 */
(function (root, factory) {
    'use strict';
    if (typeof module === 'object' && module.exports) {
        module.exports = factory();
    } else {
        root.AgentSecurityPostureAdvisor = factory();
    }
}(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    var VERSION = '1.0.0';

    var APPETITE_MULT = { cautious: 1.15, balanced: 1.0, aggressive: 0.85 };
    var APPETITE_SHIFT = { cautious: 5, balanced: 0, aggressive: -5 };
    var PRIORITY_RANK = { P0: 0, P1: 1, P2: 2, P3: 3 };

    var DAY_MS = 86400000;

    // ── utils ────────────────────────────────────────────────────────

    function clamp(v, lo, hi) { return v < lo ? lo : (v > hi ? hi : v); }
    function isNum(v) { return typeof v === 'number' && isFinite(v); }
    function isStr(v) { return typeof v === 'string' && v.length > 0; }

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

    function daysSince(dateLike, nowMs) {
        if (!dateLike) return null;
        var t = (dateLike instanceof Date) ? dateLike.getTime() : Date.parse(dateLike);
        if (!isFinite(t)) return null;
        return Math.max(0, (nowMs - t) / DAY_MS);
    }

    // ── per-agent computation ────────────────────────────────────────

    function computeAgent(agent, appetite, nowMs) {
        var mult = APPETITE_MULT[appetite] || 1.0;
        var name = agent.name || agent.id;

        // Pull fields with safe defaults
        var sandboxed = agent.sandboxed === true;
        var encryptionAtRest = agent.encryptionAtRest === true;
        var tlsEnforced = agent.tlsEnforced === true;
        var mTLS = agent.mTLS === true;
        var networkEgress = isStr(agent.networkEgress) ? agent.networkEgress : 'unknown'; // 'allowlist'|'open'|'denied'|'unknown'
        var iamScope = isStr(agent.iamScope) ? agent.iamScope : 'unknown'; // 'read'|'write'|'admin'|'unknown'
        var credentialsStored = isNum(agent.credentialsStored) ? agent.credentialsStored : 0;
        var credentialRotationAgeDays = isNum(agent.credentialRotationAgeDays) ? agent.credentialRotationAgeDays : null;
        var secretLeaksLast30d = isNum(agent.secretLeaksLast30d) ? agent.secretLeaksLast30d : 0;
        var vulns = agent.dependencyVulns || {};
        var critVulns = isNum(vulns.critical) ? vulns.critical : 0;
        var highVulns = isNum(vulns.high) ? vulns.high : 0;
        var medVulns = isNum(vulns.medium) ? vulns.medium : 0;
        var exposedEndpoints = isNum(agent.exposedEndpoints) ? agent.exposedEndpoints : 0;
        var publicExposure = agent.publicExposure === true || (exposedEndpoints > 0 && agent.publicExposure !== false);
        var lastSecurityAudit = agent.lastSecurityAuditDate || null;
        var auditAgeDays = daysSince(lastSecurityAudit, nowMs);
        var anomalousLogins = isNum(agent.anomalousLoginCountLast7d) ? agent.anomalousLoginCountLast7d : 0;
        var dataClassification = isStr(agent.dataClassification) ? agent.dataClassification : 'internal'; // public|internal|sensitive|regulated
        var autonomy = isNum(agent.autonomyLevel) ? agent.autonomyLevel : 1;

        // Insufficient data
        var providedFields = 0;
        if (typeof agent.sandboxed === 'boolean') providedFields++;
        if (typeof agent.encryptionAtRest === 'boolean') providedFields++;
        if (typeof agent.tlsEnforced === 'boolean') providedFields++;
        if (isStr(agent.networkEgress)) providedFields++;
        if (isStr(agent.iamScope)) providedFields++;
        if (agent.dependencyVulns) providedFields++;
        if (agent.lastSecurityAuditDate) providedFields++;
        if (providedFields < 2) {
            return {
                id: agent.id,
                name: name,
                verdict: 'INSUFFICIENT_DATA',
                priority: 'P3',
                riskScore: 0,
                reasons: [{ code: 'NO_TELEMETRY', label: 'Too few security signals provided', weight: 40 }],
                recommendedAction: { kind: 'collect_security_telemetry', reason: 'Need sandbox/iam/vulns/audit baseline' },
                signals: { sandboxed: sandboxed, encryptionAtRest: encryptionAtRest, tlsEnforced: tlsEnforced }
            };
        }

        var reasons = [];
        var rawScore = 0;

        // P0-class signals
        if (critVulns >= 1) {
            rawScore += 35 + Math.min(25, critVulns * 8);
            reasons.push({ code: 'CRITICAL_DEPENDENCY_VULN', label: critVulns + ' critical CVE(s) in dependencies', weight: 60 });
        }
        if (secretLeaksLast30d >= 1) {
            rawScore += 30 + Math.min(30, secretLeaksLast30d * 10);
            reasons.push({ code: 'RECENT_SECRET_LEAK', label: secretLeaksLast30d + ' secret leak(s) in last 30d', weight: 70 });
        }
        if (anomalousLogins >= 3) {
            rawScore += 25;
            reasons.push({ code: 'ANOMALOUS_LOGIN_BURST', label: anomalousLogins + ' anomalous logins (7d)', weight: 50 });
        } else if (anomalousLogins >= 1) {
            rawScore += 8;
            reasons.push({ code: 'ANOMALOUS_LOGIN_SIGNAL', label: anomalousLogins + ' anomalous login(s) (7d)', weight: 25 });
        }

        // High-severity config issues
        if (!sandboxed) {
            rawScore += 18;
            reasons.push({ code: 'NOT_SANDBOXED', label: 'Agent not running in sandbox', weight: 35 });
        }
        if (networkEgress === 'open') {
            rawScore += 18;
            reasons.push({ code: 'OPEN_NETWORK_EGRESS', label: 'No egress allowlist (unrestricted outbound)', weight: 40 });
        } else if (networkEgress === 'unknown') {
            rawScore += 8;
            reasons.push({ code: 'EGRESS_POLICY_UNKNOWN', label: 'Egress policy not declared', weight: 18 });
        }
        if (iamScope === 'admin') {
            rawScore += 22;
            reasons.push({ code: 'IAM_ADMIN_SCOPE', label: 'Agent holds admin IAM scope', weight: 45 });
        } else if (iamScope === 'write' && autonomy >= 4) {
            rawScore += 8;
            reasons.push({ code: 'WRITE_SCOPE_HIGH_AUTONOMY', label: 'Write IAM + autonomy ' + autonomy, weight: 22 });
        }
        if (publicExposure && !mTLS) {
            rawScore += 15;
            reasons.push({ code: 'PUBLIC_EXPOSURE_NO_MTLS', label: exposedEndpoints + ' public endpoint(s), no mTLS', weight: 30 });
        }
        if (!tlsEnforced) {
            rawScore += 15;
            reasons.push({ code: 'TLS_NOT_ENFORCED', label: 'TLS not enforced for agent traffic', weight: 35 });
        }
        if (!encryptionAtRest && (dataClassification === 'sensitive' || dataClassification === 'regulated')) {
            rawScore += 18;
            reasons.push({ code: 'NO_ENCRYPTION_AT_REST', label: 'Sensitive/regulated data without encryption at rest', weight: 45 });
        } else if (!encryptionAtRest) {
            rawScore += 6;
            reasons.push({ code: 'NO_ENCRYPTION_AT_REST_INTERNAL', label: 'No encryption at rest', weight: 15 });
        }

        // Medium signals
        if (highVulns >= 1) {
            rawScore += Math.min(20, 5 + highVulns * 4);
            reasons.push({ code: 'HIGH_DEPENDENCY_VULN', label: highVulns + ' high-severity CVE(s)', weight: 28 });
        }
        if (medVulns >= 5) {
            rawScore += 6;
            reasons.push({ code: 'MEDIUM_VULN_BACKLOG', label: medVulns + ' medium-severity CVE(s)', weight: 12 });
        }

        // Credential hygiene
        if (credentialsStored > 0 && credentialRotationAgeDays !== null) {
            if (credentialRotationAgeDays >= 180) {
                rawScore += 14;
                reasons.push({ code: 'CREDENTIAL_ROTATION_OVERDUE', label: 'Credentials ' + Math.round(credentialRotationAgeDays) + 'd since rotation', weight: 30 });
            } else if (credentialRotationAgeDays >= 90) {
                rawScore += 6;
                reasons.push({ code: 'CREDENTIAL_ROTATION_DUE', label: 'Credentials ' + Math.round(credentialRotationAgeDays) + 'd since rotation', weight: 15 });
            }
        } else if (credentialsStored > 0 && credentialRotationAgeDays === null) {
            rawScore += 4;
            reasons.push({ code: 'CREDENTIAL_ROTATION_UNKNOWN', label: 'Rotation age unknown for ' + credentialsStored + ' credential(s)', weight: 10 });
        }

        // Audit recency
        if (auditAgeDays !== null) {
            if (auditAgeDays >= 365) {
                rawScore += 12;
                reasons.push({ code: 'SECURITY_AUDIT_STALE', label: 'Last audit ' + Math.round(auditAgeDays) + 'd ago', weight: 22 });
            } else if (auditAgeDays >= 180) {
                rawScore += 5;
                reasons.push({ code: 'SECURITY_AUDIT_DUE', label: 'Last audit ' + Math.round(auditAgeDays) + 'd ago', weight: 12 });
            }
        } else {
            rawScore += 6;
            reasons.push({ code: 'NO_AUDIT_HISTORY', label: 'No security audit on record', weight: 14 });
        }

        // Data classification amplifier
        if (dataClassification === 'regulated') rawScore *= 1.10;
        else if (dataClassification === 'sensitive') rawScore *= 1.05;

        // Apply risk appetite
        var riskScore = clamp(Math.round(rawScore * mult), 0, 100);

        // Verdict ladder
        var verdict, priority, recommendedAction;
        var hasP0Signal = (critVulns >= 1) || (secretLeaksLast30d >= 1) || (anomalousLogins >= 3);

        if (hasP0Signal && (secretLeaksLast30d >= 1 || (critVulns >= 1 && publicExposure))) {
            verdict = 'EMERGENCY_ISOLATE';
            priority = 'P0';
            recommendedAction = {
                kind: 'isolate_and_rotate',
                reason: secretLeaksLast30d >= 1 ? 'Active secret leak in last 30d' : 'Critical CVE on public surface',
                suggestedValue: 'cut-network-egress'
            };
        } else if (hasP0Signal || riskScore >= 75) {
            verdict = 'QUARANTINE';
            priority = 'P0';
            recommendedAction = {
                kind: 'quarantine_agent',
                reason: 'Composite security risk score ' + riskScore + ' or P0 signal present'
            };
        } else if (riskScore >= 50) {
            verdict = 'TIGHTEN_CONFIG';
            priority = 'P1';
            recommendedAction = {
                kind: 'apply_hardening_baseline',
                reason: 'Risk score ' + riskScore + ' in tighten band'
            };
        } else if (riskScore >= 30) {
            verdict = 'MONITOR';
            priority = 'P2';
            recommendedAction = { kind: 'increase_security_monitoring', reason: 'Elevated but bounded risk' };
        } else if (riskScore >= 15) {
            verdict = 'OK';
            priority = 'P3';
            recommendedAction = { kind: 'maintain_observability', reason: 'Baseline posture acceptable' };
        } else {
            verdict = 'HARDENED';
            priority = 'P3';
            recommendedAction = { kind: 'none', reason: 'Strong posture; no action needed' };
        }

        // Sort reasons stable
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
            reasons: reasons,
            recommendedAction: recommendedAction,
            signals: {
                sandboxed: sandboxed,
                encryptionAtRest: encryptionAtRest,
                tlsEnforced: tlsEnforced,
                mTLS: mTLS,
                networkEgress: networkEgress,
                iamScope: iamScope,
                publicExposure: publicExposure,
                criticalVulns: critVulns,
                highVulns: highVulns,
                mediumVulns: medVulns,
                secretLeaksLast30d: secretLeaksLast30d,
                anomalousLoginCountLast7d: anomalousLogins,
                credentialRotationAgeDays: credentialRotationAgeDays,
                auditAgeDays: auditAgeDays === null ? null : Math.round(auditAgeDays),
                dataClassification: dataClassification,
                autonomyLevel: autonomy
            }
        };
    }

    // ── portfolio synthesis ──────────────────────────────────────────

    function bandFromRisk(meanRisk) {
        if (meanRisk >= 80) return 'CRITICAL';
        if (meanRisk >= 60) return 'HIGH';
        if (meanRisk >= 40) return 'ELEVATED';
        if (meanRisk >= 20) return 'WATCH';
        return 'CALM';
    }

    function gradeFromState(anyP0, p1Count, meanRisk, anyEmergency) {
        if (anyEmergency) return 'F';
        if (anyP0 && meanRisk >= 50) return 'F';
        if (anyP0) return 'D';
        if (p1Count >= 2 || meanRisk >= 55) return 'D';
        if (p1Count >= 1 || meanRisk >= 35) return 'C';
        if (meanRisk >= 18) return 'B';
        return 'A';
    }

    function buildPlaybook(perAgent, appetite, grade) {
        var actions = [];
        var byVerdict = {};
        perAgent.forEach(function (a) {
            (byVerdict[a.verdict] = byVerdict[a.verdict] || []).push(a);
        });

        var emergencies = byVerdict.EMERGENCY_ISOLATE || [];
        var quarantines = byVerdict.QUARANTINE || [];
        var tightens = byVerdict.TIGHTEN_CONFIG || [];

        var leaks = perAgent.filter(function (a) {
            return a.reasons.some(function (r) { return r.code === 'RECENT_SECRET_LEAK'; });
        });
        var critVuln = perAgent.filter(function (a) {
            return a.reasons.some(function (r) { return r.code === 'CRITICAL_DEPENDENCY_VULN'; });
        });
        var adminScope = perAgent.filter(function (a) { return a.signals && a.signals.iamScope === 'admin'; });
        var openEgress = perAgent.filter(function (a) { return a.signals && a.signals.networkEgress === 'open'; });
        var notSandboxed = perAgent.filter(function (a) { return a.signals && a.signals.sandboxed === false && a.verdict !== 'INSUFFICIENT_DATA'; });
        var rotationOverdue = perAgent.filter(function (a) {
            return a.reasons.some(function (r) { return r.code === 'CREDENTIAL_ROTATION_OVERDUE'; });
        });
        var auditStale = perAgent.filter(function (a) {
            return a.reasons.some(function (r) { return r.code === 'SECURITY_AUDIT_STALE' || r.code === 'NO_AUDIT_HISTORY'; });
        });
        var anomalousLogin = perAgent.filter(function (a) {
            return a.reasons.some(function (r) { return r.code === 'ANOMALOUS_LOGIN_BURST'; });
        });
        var publicNoMtls = perAgent.filter(function (a) {
            return a.reasons.some(function (r) { return r.code === 'PUBLIC_EXPOSURE_NO_MTLS'; });
        });
        var noEnc = perAgent.filter(function (a) {
            return a.reasons.some(function (r) { return r.code === 'NO_ENCRYPTION_AT_REST'; });
        });
        var insufficient = perAgent.filter(function (a) { return a.verdict === 'INSUFFICIENT_DATA'; });

        if (emergencies.length >= 1) {
            actions.push({
                id: 'ISOLATE_COMPROMISED_AGENTS',
                priority: 'P0',
                label: 'Isolate ' + emergencies.length + ' agent(s) with active compromise indicators',
                reason: 'Recent secret leak or critical CVE on public surface',
                owner: 'security',
                blastRadius: 5,
                reversibility: 'medium',
                agentIds: emergencies.map(function (a) { return a.id; }).sort()
            });
        }
        if (leaks.length >= 1) {
            actions.push({
                id: 'ROTATE_LEAKED_CREDENTIALS',
                priority: 'P0',
                label: 'Rotate credentials for ' + leaks.length + ' agent(s) with recent leaks',
                reason: 'Secret material exposed in last 30d',
                owner: 'security',
                blastRadius: 4,
                reversibility: 'high',
                agentIds: leaks.map(function (a) { return a.id; }).sort()
            });
        }
        if (critVuln.length >= 1) {
            actions.push({
                id: 'PATCH_CRITICAL_DEPENDENCY_CVES',
                priority: 'P0',
                label: 'Patch critical CVEs across ' + critVuln.length + ' agent(s)',
                reason: 'Critical-severity vulnerabilities in dependencies',
                owner: 'platform',
                blastRadius: 3,
                reversibility: 'high',
                agentIds: critVuln.map(function (a) { return a.id; }).sort()
            });
        }
        if (quarantines.length >= 1) {
            actions.push({
                id: 'QUARANTINE_HIGH_RISK_AGENTS',
                priority: 'P0',
                label: 'Quarantine ' + quarantines.length + ' high-risk agent(s)',
                reason: 'Composite security risk in quarantine band',
                owner: 'security',
                blastRadius: 4,
                reversibility: 'high',
                agentIds: quarantines.map(function (a) { return a.id; }).sort()
            });
        }
        if (adminScope.length >= 1) {
            actions.push({
                id: 'REDUCE_ADMIN_IAM_SCOPE',
                priority: 'P1',
                label: 'Downscope admin IAM on ' + adminScope.length + ' agent(s)',
                reason: 'Admin scope violates least-privilege baseline',
                owner: 'security',
                blastRadius: 3,
                reversibility: 'high',
                agentIds: adminScope.map(function (a) { return a.id; }).sort()
            });
        }
        if (openEgress.length >= 1) {
            actions.push({
                id: 'ENFORCE_EGRESS_ALLOWLIST',
                priority: 'P1',
                label: 'Enforce egress allowlist on ' + openEgress.length + ' agent(s)',
                reason: 'Unrestricted outbound network access',
                owner: 'platform',
                blastRadius: 3,
                reversibility: 'high',
                agentIds: openEgress.map(function (a) { return a.id; }).sort()
            });
        }
        if (notSandboxed.length >= 2) {
            actions.push({
                id: 'SANDBOX_AGENT_RUNTIMES',
                priority: 'P1',
                label: 'Sandbox ' + notSandboxed.length + ' agent runtimes',
                reason: 'Agents running outside isolation boundary',
                owner: 'platform',
                blastRadius: 3,
                reversibility: 'high',
                agentIds: notSandboxed.map(function (a) { return a.id; }).sort()
            });
        }
        if (anomalousLogin.length >= 1) {
            actions.push({
                id: 'INVESTIGATE_ANOMALOUS_LOGINS',
                priority: 'P1',
                label: 'Investigate anomalous login bursts on ' + anomalousLogin.length + ' agent(s)',
                reason: 'Possible credential theft or session hijack',
                owner: 'security',
                blastRadius: 2,
                reversibility: 'high',
                agentIds: anomalousLogin.map(function (a) { return a.id; }).sort()
            });
        }
        if (publicNoMtls.length >= 1) {
            actions.push({
                id: 'ENFORCE_MTLS_ON_PUBLIC_ENDPOINTS',
                priority: 'P1',
                label: 'Require mTLS on ' + publicNoMtls.length + ' public-exposed agent(s)',
                reason: 'Public endpoints without mutual TLS',
                owner: 'platform',
                blastRadius: 3,
                reversibility: 'high',
                agentIds: publicNoMtls.map(function (a) { return a.id; }).sort()
            });
        }
        if (rotationOverdue.length >= 1) {
            actions.push({
                id: 'ROTATE_OVERDUE_CREDENTIALS',
                priority: 'P1',
                label: 'Rotate credentials on ' + rotationOverdue.length + ' agent(s) past 180d',
                reason: 'Long-lived credentials past rotation policy',
                owner: 'security',
                blastRadius: 2,
                reversibility: 'high',
                agentIds: rotationOverdue.map(function (a) { return a.id; }).sort()
            });
        }
        if (noEnc.length >= 1) {
            actions.push({
                id: 'ENABLE_ENCRYPTION_AT_REST',
                priority: 'P2',
                label: 'Enable encryption-at-rest on ' + noEnc.length + ' sensitive-data agent(s)',
                reason: 'Sensitive/regulated data without storage encryption',
                owner: 'platform',
                blastRadius: 2,
                reversibility: 'high',
                agentIds: noEnc.map(function (a) { return a.id; }).sort()
            });
        }
        if (tightens.length >= 2) {
            actions.push({
                id: 'APPLY_HARDENING_BASELINE_FLEET',
                priority: 'P2',
                label: 'Apply hardening baseline across ' + tightens.length + ' agent(s)',
                reason: 'Multiple agents in TIGHTEN_CONFIG band',
                owner: 'platform',
                blastRadius: 2,
                reversibility: 'high',
                agentIds: tightens.map(function (a) { return a.id; }).sort()
            });
        }
        if (auditStale.length >= 2) {
            actions.push({
                id: 'SCHEDULE_SECURITY_AUDIT_SWEEP',
                priority: 'P2',
                label: 'Schedule audit sweep across ' + auditStale.length + ' agent(s)',
                reason: 'No recent or no recorded security audit',
                owner: 'security',
                blastRadius: 1,
                reversibility: 'high',
                agentIds: auditStale.map(function (a) { return a.id; }).sort()
            });
        }
        if (insufficient.length >= 1) {
            actions.push({
                id: 'INSTRUMENT_SECURITY_TELEMETRY',
                priority: 'P2',
                label: 'Instrument security telemetry on ' + insufficient.length + ' agent(s)',
                reason: 'Insufficient signals for posture scoring',
                owner: 'platform',
                blastRadius: 1,
                reversibility: 'high',
                agentIds: insufficient.map(function (a) { return a.id; }).sort()
            });
        }

        if (appetite === 'cautious' && (grade === 'C' || grade === 'D' || grade === 'F')) {
            actions.push({
                id: 'SCHEDULE_QUARTERLY_SECURITY_REVIEW',
                priority: 'P2',
                label: 'Schedule quarterly security review',
                reason: 'Cautious appetite + grade ' + grade,
                owner: 'security',
                blastRadius: 1,
                reversibility: 'high',
                agentIds: []
            });
        }

        if (actions.length === 0) {
            actions.push({
                id: 'MAINTAIN_SECURITY_OBSERVABILITY',
                priority: 'P3',
                label: 'Maintain security observability cadence',
                reason: 'No active hardening actions required',
                owner: 'security',
                blastRadius: 1,
                reversibility: 'high',
                agentIds: []
            });
        }

        // Dedup by id (keep first)
        var seen = {}, deduped = [];
        actions.forEach(function (a) { if (!seen[a.id]) { seen[a.id] = true; deduped.push(a); } });

        // Aggressive trims P3 fallback + lone P2 when P0/P1 present
        if (appetite === 'aggressive') {
            var hasHi = deduped.some(function (a) { return a.priority === 'P0' || a.priority === 'P1'; });
            if (hasHi) {
                deduped = deduped.filter(function (a) { return a.priority !== 'P3'; });
                var p2s = deduped.filter(function (a) { return a.priority === 'P2'; });
                if (p2s.length === 1) {
                    deduped = deduped.filter(function (a) { return a.priority !== 'P2'; });
                }
            }
        }

        deduped.sort(function (a, b) {
            if (PRIORITY_RANK[a.priority] !== PRIORITY_RANK[b.priority]) {
                return PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
            }
            return a.id < b.id ? -1 : (a.id > b.id ? 1 : 0);
        });

        return deduped;
    }

    function buildInsights(perAgent) {
        var insights = [];
        var n = perAgent.length;
        if (n === 0) { insights.push({ code: 'EMPTY_FLEET', label: 'No agents provided' }); return insights; }

        var leakCount = perAgent.filter(function (a) { return a.reasons.some(function (r) { return r.code === 'RECENT_SECRET_LEAK'; }); }).length;
        var critCount = perAgent.filter(function (a) { return a.reasons.some(function (r) { return r.code === 'CRITICAL_DEPENDENCY_VULN'; }); }).length;
        var openEgressCount = perAgent.filter(function (a) { return a.signals && a.signals.networkEgress === 'open'; }).length;
        var adminCount = perAgent.filter(function (a) { return a.signals && a.signals.iamScope === 'admin'; }).length;
        var anomalousCount = perAgent.filter(function (a) { return a.reasons.some(function (r) { return r.code === 'ANOMALOUS_LOGIN_BURST'; }); }).length;
        var publicNoMtlsCount = perAgent.filter(function (a) { return a.reasons.some(function (r) { return r.code === 'PUBLIC_EXPOSURE_NO_MTLS'; }); }).length;
        var auditCount = perAgent.filter(function (a) { return a.reasons.some(function (r) { return r.code === 'SECURITY_AUDIT_STALE' || r.code === 'NO_AUDIT_HISTORY'; }); }).length;
        var hardenedCount = perAgent.filter(function (a) { return a.verdict === 'HARDENED'; }).length;

        if (leakCount >= 1) insights.push({ code: 'ACTIVE_SECRET_LEAK', label: leakCount + ' agent(s) with recent secret leak' });
        if (critCount >= 2) insights.push({ code: 'CRITICAL_VULN_CLUSTER', label: critCount + ' agents share critical CVE exposure' });
        if (publicNoMtlsCount >= 2) insights.push({ code: 'PUBLIC_SURFACE_UNDERHARDENED', label: publicNoMtlsCount + ' public-exposed agents lack mTLS' });
        if (openEgressCount >= Math.ceil(n / 2)) insights.push({ code: 'EGRESS_POLICY_GAP', label: openEgressCount + '/' + n + ' agents have open egress' });
        if (adminCount >= 2) insights.push({ code: 'LEAST_PRIVILEGE_VIOLATIONS', label: adminCount + ' agents hold admin IAM scope' });
        if (anomalousCount >= 1) insights.push({ code: 'POTENTIAL_INTRUSION_SIGNAL', label: anomalousCount + ' agent(s) showing anomalous logins' });
        if (auditCount >= Math.ceil(n / 2)) insights.push({ code: 'AUDIT_DEBT_FLEETWIDE', label: auditCount + '/' + n + ' agents have stale or missing audits' });
        if (hardenedCount === n && n > 0) insights.push({ code: 'FLEET_HARDENED', label: 'All ' + n + ' agents in HARDENED posture' });
        if (insights.length === 0) insights.push({ code: 'NO_NOTABLE_SIGNALS', label: 'Mixed posture, no concentrated risk' });
        return insights;
    }

    // ── public factory ───────────────────────────────────────────────

    function createAgentSecurityPostureAdvisor(factoryOpts) {
        factoryOpts = factoryOpts || {};
        var defaultNow = factoryOpts.now || function () { return new Date(); };

        function analyze(input) {
            input = input || {};
            var agentsIn = Array.isArray(input.agents) ? input.agents.map(deepCopy) : [];
            var opts = deepCopy(input.options || {});
            var appetite = opts.risk_appetite || 'balanced';
            if (!APPETITE_MULT[appetite]) appetite = 'balanced';
            var nowFn = opts.nowFn || defaultNow;
            var nowDate = (typeof nowFn === 'function') ? nowFn() : new Date();
            var nowMs = nowDate.getTime();
            if (!isFinite(nowMs)) throw new Error('AgentSecurityPostureAdvisor: invalid clock from nowFn');
            var generatedAt = nowDate.toISOString();

            var perAgent = agentsIn.map(function (a) { return computeAgent(a, appetite, nowMs); });

            // Stable sort: riskScore desc, then id asc
            perAgent.sort(function (a, b) {
                if (b.riskScore !== a.riskScore) return b.riskScore - a.riskScore;
                return a.id < b.id ? -1 : (a.id > b.id ? 1 : 0);
            });

            var meanRisk = perAgent.length === 0 ? 0
                : perAgent.reduce(function (s, a) { return s + a.riskScore; }, 0) / perAgent.length;
            var shiftedRisk = clamp(meanRisk + (APPETITE_SHIFT[appetite] || 0), 0, 100);
            var band = bandFromRisk(shiftedRisk);

            var anyP0 = perAgent.some(function (a) { return a.priority === 'P0'; });
            var p1Count = perAgent.filter(function (a) { return a.priority === 'P1'; }).length;
            var anyEmergency = perAgent.some(function (a) { return a.verdict === 'EMERGENCY_ISOLATE'; });
            var grade = gradeFromState(anyP0, p1Count, shiftedRisk, anyEmergency);

            var playbook = buildPlaybook(perAgent, appetite, grade);
            var insights = buildInsights(perAgent);

            return {
                version: VERSION,
                generatedAt: generatedAt,
                riskAppetite: appetite,
                agents: perAgent,
                portfolio: {
                    agentCount: perAgent.length,
                    meanRiskScore: Math.round(shiftedRisk * 10) / 10,
                    band: band,
                    grade: grade
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

            var weights = {
                ISOLATE_COMPROMISED_AGENTS: 0.35,
                ROTATE_LEAKED_CREDENTIALS: 0.30,
                PATCH_CRITICAL_DEPENDENCY_CVES: 0.28,
                QUARANTINE_HIGH_RISK_AGENTS: 0.25,
                REDUCE_ADMIN_IAM_SCOPE: 0.18,
                ENFORCE_EGRESS_ALLOWLIST: 0.18,
                SANDBOX_AGENT_RUNTIMES: 0.16,
                ENFORCE_MTLS_ON_PUBLIC_ENDPOINTS: 0.14,
                INVESTIGATE_ANOMALOUS_LOGINS: 0.12,
                ROTATE_OVERDUE_CREDENTIALS: 0.12,
                ENABLE_ENCRYPTION_AT_REST: 0.10,
                APPLY_HARDENING_BASELINE_FLEET: 0.10,
                SCHEDULE_SECURITY_AUDIT_SWEEP: 0.05,
                INSTRUMENT_SECURITY_TELEMETRY: 0.04,
                SCHEDULE_QUARTERLY_SECURITY_REVIEW: 0.03,
                MAINTAIN_SECURITY_OBSERVABILITY: 0.0
            };
            var meanRisk = (report.portfolio && report.portfolio.meanRiskScore) || 0;
            var projectedRisk = meanRisk;
            playbook.forEach(function (a, i) {
                var w = (a && a.id && weights[a.id] !== undefined) ? weights[a.id] : 0.05;
                projectedRisk = Math.max(5, projectedRisk - projectedRisk * w * Math.pow(0.85, i));
            });
            projectedRisk = Math.round(projectedRisk * 10) / 10;
            var projectedBand = bandFromRisk(projectedRisk);
            var projectedGrade;
            if (projectedRisk >= 70) projectedGrade = 'F';
            else if (projectedRisk >= 55) projectedGrade = 'D';
            else if (projectedRisk >= 35) projectedGrade = 'C';
            else if (projectedRisk >= 18) projectedGrade = 'B';
            else projectedGrade = 'A';

            return {
                projectedRiskScore: projectedRisk,
                projectedBand: projectedBand,
                projectedGrade: projectedGrade,
                appliedActions: playbook.map(function (a) { return { id: a.id, priority: a.priority }; })
            };
        }

        function formatText(report) {
            var lines = [];
            var p = report.portfolio || {};
            lines.push('AgentSecurityPostureAdvisor — ' + (report.riskAppetite || 'balanced'));
            lines.push('Portfolio: ' + (p.agentCount || 0) + ' agents · grade ' + p.grade + ' · band ' + p.band + ' · mean risk ' + p.meanRiskScore);
            lines.push('');
            lines.push('Agents:');
            (report.agents || []).forEach(function (a, i) {
                lines.push('  ' + (i + 1) + '. [' + a.priority + '] ' + a.name + ' — ' + a.verdict + ' (risk ' + a.riskScore + ')');
            });
            lines.push('');
            lines.push('Playbook:');
            (report.playbook || []).forEach(function (act) {
                lines.push('  • [' + act.priority + '] ' + act.label + ' (' + act.owner + ')');
            });
            lines.push('');
            lines.push('Insights:');
            (report.insights || []).forEach(function (i) { lines.push('  • ' + i.code + ': ' + i.label); });
            return lines.join('\n');
        }

        function formatMarkdown(report) {
            var p = report.portfolio || {};
            var out = [];
            out.push('# AgentSecurityPostureAdvisor');
            out.push('');
            out.push('## Summary');
            out.push('');
            out.push('| Metric | Value |');
            out.push('|--------|-------|');
            out.push('| Risk appetite | ' + (report.riskAppetite || 'balanced') + ' |');
            out.push('| Agents | ' + (p.agentCount || 0) + ' |');
            out.push('| Grade | ' + p.grade + ' |');
            out.push('| Band | ' + p.band + ' |');
            out.push('| Mean risk | ' + p.meanRiskScore + ' |');
            out.push('');
            out.push('## Agents');
            out.push('');
            out.push('| Agent | Verdict | Score | Priority | Top reason |');
            out.push('|-------|---------|-------|----------|------------|');
            (report.agents || []).forEach(function (a) {
                var top = (a.reasons && a.reasons[0]) ? a.reasons[0].code : '';
                out.push('| ' + a.name + ' | ' + a.verdict + ' | ' + a.riskScore + ' | ' + a.priority + ' | ' + top + ' |');
            });
            out.push('');
            out.push('## Playbook');
            out.push('');
            out.push('| Priority | Action | Owner | Blast | Reason |');
            out.push('|----------|--------|-------|-------|--------|');
            (report.playbook || []).forEach(function (act) {
                out.push('| ' + act.priority + ' | ' + act.label + ' | ' + act.owner + ' | ' + act.blastRadius + ' | ' + act.reason + ' |');
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

    return {
        createAgentSecurityPostureAdvisor: createAgentSecurityPostureAdvisor,
        VERSION: VERSION
    };
}));
