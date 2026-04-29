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

function getAutoThreshold(level) {
    if (level <= 1) return -1;
    if (level === 2) return -1;
    if (level === 3) return 0;
    if (level === 4) return 2;
    return 3;
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
    var base = { low: 1.2, medium: 2.5, high: 4.0, critical: 6.0 };
    var mult = [0, 5.0, 3.0, 1.5, 0.8, 0.4];
    return parseFloat((base[risk] * mult[level] * (0.8 + Math.random() * 0.4)).toFixed(1));
}

function rollMistake(level, risk) {
    if (level < 3) return false;
    var chance = 0;
    if (level === 3) chance = risk === 'medium' ? 0.05 : 0;
    else if (level === 4) chance = RISK_ORDER[risk] >= 2 ? 0.08 : 0.02;
    else chance = RISK_ORDER[risk] >= 2 ? 0.12 : 0.04;
    return Math.random() < chance;
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
    createState: createState,
    getAutoThreshold: getAutoThreshold,
    shouldAutoHandle: shouldAutoHandle,
    generateTask: generateTask,
    getResponseTime: getResponseTime,
    rollMistake: rollMistake,
    processTask: processTask,
    approveTask: approveTask,
    rejectTask: rejectTask,
    computeGrade: computeGrade,
    buildFindings: buildFindings,
    buildExportData: buildExportData
};
