'use strict';

/* ── Task definitions ── */
var TASK_POOL = [
    { icon: '📧', name: 'Reply to customer email', risk: 'low', category: 'support' },
    { icon: '📊', name: 'Generate weekly report', risk: 'low', category: 'finance' },
    { icon: '📝', name: 'Update documentation', risk: 'low', category: 'devops' },
    { icon: '🔔', name: 'Send status notification', risk: 'low', category: 'support' },
    { icon: '🔄', name: 'Restart failing service', risk: 'medium', category: 'devops' },
    { icon: '💰', name: 'Process refund $47.50', risk: 'medium', category: 'finance' },
    { icon: '📦', name: 'Scale up worker pods', risk: 'medium', category: 'devops' },
    { icon: '👤', name: 'Escalate support ticket', risk: 'medium', category: 'support' },
    { icon: '🗑️', name: 'Delete inactive accounts', risk: 'high', category: 'finance' },
    { icon: '🚀', name: 'Deploy to production', risk: 'high', category: 'devops' },
    { icon: '🔧', name: 'Modify database schema', risk: 'high', category: 'devops' },
    { icon: '📋', name: 'Bulk close stale tickets', risk: 'high', category: 'support' },
    { icon: '🔐', name: 'Modify access permissions', risk: 'critical', category: 'devops' },
    { icon: '💳', name: 'Process payment $2,500', risk: 'critical', category: 'finance' },
    { icon: '🧹', name: 'Purge customer data (GDPR)', risk: 'critical', category: 'support' },
    { icon: '🏗️', name: 'Tear down staging env', risk: 'critical', category: 'devops' }
];

var RISK_ORDER = { low: 0, medium: 1, high: 2, critical: 3 };

var LEVEL_NAMES = ['', 'Manual', 'Suggest', 'Auto-Low', 'Auto-High', 'Autonomous'];

var SPEED_MAP = { slow: 3000, normal: 1800, fast: 900 };

// ---------------------------------------------------------------------------
// Tuning tables (kept here so behavior is data-driven, not buried in if-chains)
// ---------------------------------------------------------------------------

// Index = autonomy level (1-5). Value = max RISK_ORDER auto-handled at that
// level; -1 means "nothing auto-handled". Index 0 is unused (levels start at 1).
var AUTO_THRESHOLDS = [-1, -1, -1, 0, 2, 3];

// Per-level mistake probability for low-risk vs. high-risk task buckets.
// `highRisk` applies when RISK_ORDER[risk] >= 2 (i.e. high/critical).
var MISTAKE_CHANCE = {
    3: { lowRisk: 0,    mediumOnly: 0.05, highRisk: 0    },
    4: { lowRisk: 0.02,                   highRisk: 0.08 },
    5: { lowRisk: 0.04,                   highRisk: 0.12 }
};

// Base response-time seconds per risk class before level multiplier.
var RESPONSE_TIME_BASE = { low: 1.2, medium: 2.5, high: 4.0, critical: 6.0 };
// Index = autonomy level (1-5). Index 0 unused.
var RESPONSE_TIME_LEVEL_MULT = [0, 5.0, 3.0, 1.5, 0.8, 0.4];

function createState() {
    return {
        level: 1,
        running: false,
        paused: false,
        trustScore: 0,
        tasksCompleted: 0,
        totalResponseTime: 0,
        interventions: 0,
        errorsCaught: 0,
        taskQueue: [],
        history: [],
        currentPreset: null,
        timerId: null,
        taskCount: 0,
        maxTasks: 15,
        pendingApproval: null
    };
}

/**
 * Maximum task risk (as RISK_ORDER value) the agent will handle without
 * approval at the given autonomy level. Returns -1 when nothing is auto-handled.
 * @param {number} level Autonomy level 1-5.
 * @returns {number} Threshold in RISK_ORDER space, or -1.
 */
function getAutoThreshold(level) {
    if (typeof level !== 'number' || level < 1 || level >= AUTO_THRESHOLDS.length) {
        return -1;
    }
    return AUTO_THRESHOLDS[level];
}

function shouldAutoHandle(level, riskStr) {
    return RISK_ORDER[riskStr] <= getAutoThreshold(level);
}

function generateTask(state, preset) {
    var pool = TASK_POOL;
    if (preset) {
        var filtered = TASK_POOL.filter(function(t) { return t.category === preset; });
        if (filtered.length > 0) pool = filtered;
    }
    var tmpl = pool[Math.floor(Math.random() * pool.length)];
    return {
        id: ++state.taskCount,
        icon: tmpl.icon,
        name: tmpl.name,
        risk: tmpl.risk,
        category: tmpl.category,
        status: 'pending',
        action: null,
        responseTime: 0,
        confidence: Math.floor(70 + Math.random() * 28)
    };
}

function getResponseTime(level, risk) {
    var base = RESPONSE_TIME_BASE[risk] || 0;
    var mult = RESPONSE_TIME_LEVEL_MULT[level] || 0;
    return parseFloat((base * mult * (0.8 + Math.random() * 0.4)).toFixed(1));
}

/**
 * Probability that an auto-handled task at the given level/risk will produce
 * an error. Pure helper so tests can assert mistake rates without invoking RNG.
 * @param {number} level Autonomy level 1-5.
 * @param {string} risk One of 'low' | 'medium' | 'high' | 'critical'.
 * @returns {number} Probability in [0, 1].
 */
function getMistakeChance(level, risk) {
    var table = MISTAKE_CHANCE[level];
    if (!table) return 0;
    if (level === 3) return risk === 'medium' ? table.mediumOnly : 0;
    return RISK_ORDER[risk] >= 2 ? table.highRisk : table.lowRisk;
}

function rollMistake(level, risk) {
    var chance = getMistakeChance(level, risk);
    return chance > 0 && Math.random() < chance;
}

function processTask(state, task) {
    var level = state.level;
    var auto = shouldAutoHandle(level, task.risk);
    task.responseTime = getResponseTime(level, task.risk);

    if (auto) {
        if (rollMistake(level, task.risk)) {
            task.status = 'error';
            task.action = 'auto-error';
            state.errorsCaught++;
            var penalty = RISK_ORDER[task.risk] >= 2 ? 8 : 3;
            state.trustScore = Math.max(0, state.trustScore - penalty);
            state.totalResponseTime += task.responseTime;
            state.tasksCompleted++;
            return { type: 'error', msg: 'Error on "' + task.name + '" — agent caught & self-corrected (trust -' + penalty + ')' };
        } else {
            task.status = 'completed';
            task.action = 'auto';
            var gain = Math.max(1, 5 - RISK_ORDER[task.risk]);
            state.trustScore = Math.min(100, state.trustScore + gain);
            state.totalResponseTime += task.responseTime;
            state.tasksCompleted++;
            return { type: 'auto', msg: 'Auto-completed "' + task.name + '" in ' + task.responseTime + 's (trust +' + gain + ')' };
        }
    } else {
        state.pendingApproval = task;
        state.interventions++;
        if (level === 2) {
            return { type: 'suggest', msg: 'Suggesting action for "' + task.name + '" (' + task.confidence + '% confidence)' };
        }
        return { type: 'waiting', msg: 'Awaiting approval for "' + task.name + '" (' + task.risk + ' risk)' };
    }
}

function approveTask(state, taskId) {
    var task = state.taskQueue.find(function(t) { return t.id === taskId; });
    if (!task || task.status !== 'pending') return null;
    task.status = 'completed';
    task.action = 'manual';
    var gain = Math.max(1, 4 - RISK_ORDER[task.risk]);
    state.trustScore = Math.min(100, state.trustScore + gain);
    state.totalResponseTime += task.responseTime;
    state.tasksCompleted++;
    state.pendingApproval = null;
    return { gain: gain, msg: 'Approved "' + task.name + '" (trust +' + gain + ')' };
}

function rejectTask(state, taskId) {
    var task = state.taskQueue.find(function(t) { return t.id === taskId; });
    if (!task || task.status !== 'pending') return null;
    task.status = 'rejected';
    task.action = 'rejected';
    state.pendingApproval = null;
    return { msg: 'Rejected "' + task.name + '"' };
}

function computeGrade(trustScore) {
    if (trustScore >= 90) return 'S';
    if (trustScore >= 75) return 'A';
    if (trustScore >= 60) return 'B';
    if (trustScore >= 40) return 'C';
    return 'D';
}

function buildFindings(state) {
    var findings = [];
    if (state.level >= 4 && state.errorsCaught === 0) findings.push('Perfect autonomous run — zero errors');
    if (state.level === 1) findings.push('Full manual control — maximum safety, minimum speed');
    if (state.interventions > state.tasksCompleted * 0.5) findings.push('High intervention rate — consider raising autonomy');
    if (state.errorsCaught > 2) findings.push('Multiple errors detected — consider lowering autonomy for high-risk tasks');
    if (state.trustScore >= 80) findings.push('Strong trust established — agent is reliable at this level');
    if (findings.length === 0) findings.push('Balanced run — good trust trajectory');
    return findings;
}

function buildExportData(state) {
    return {
        autonomyLevel: state.level,
        levelName: LEVEL_NAMES[state.level],
        trustScore: state.trustScore,
        tasksCompleted: state.tasksCompleted,
        avgResponseTime: state.tasksCompleted > 0 ? parseFloat((state.totalResponseTime / state.tasksCompleted).toFixed(1)) : 0,
        interventions: state.interventions,
        errorsCaught: state.errorsCaught,
        preset: state.currentPreset,
        tasks: state.taskQueue.map(function(t) {
            return { name: t.name, risk: t.risk, status: t.status, action: t.action, responseTime: t.responseTime };
        }),
        history: state.history
    };
}

module.exports = {
    TASK_POOL: TASK_POOL,
    RISK_ORDER: RISK_ORDER,
    LEVEL_NAMES: LEVEL_NAMES,
    SPEED_MAP: SPEED_MAP,
    AUTO_THRESHOLDS: AUTO_THRESHOLDS,
    MISTAKE_CHANCE: MISTAKE_CHANCE,
    RESPONSE_TIME_BASE: RESPONSE_TIME_BASE,
    RESPONSE_TIME_LEVEL_MULT: RESPONSE_TIME_LEVEL_MULT,
    createState: createState,
    getAutoThreshold: getAutoThreshold,
    shouldAutoHandle: shouldAutoHandle,
    generateTask: generateTask,
    getResponseTime: getResponseTime,
    getMistakeChance: getMistakeChance,
    rollMistake: rollMistake,
    processTask: processTask,
    approveTask: approveTask,
    rejectTask: rejectTask,
    computeGrade: computeGrade,
    buildFindings: buildFindings,
    buildExportData: buildExportData
};
