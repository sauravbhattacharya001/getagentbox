'use strict';

var AL = require('../src/autonomy-ladder');

describe('AutonomyLadder', function () {

    /* ── Constants ── */
    describe('TASK_POOL', function () {
        test('has 16 tasks', function () {
            expect(AL.TASK_POOL).toHaveLength(16);
        });
        test('covers all risk levels', function () {
            var risks = new Set(AL.TASK_POOL.map(function (t) { return t.risk; }));
            expect(risks).toEqual(new Set(['low', 'medium', 'high', 'critical']));
        });
        test('covers all categories', function () {
            var cats = new Set(AL.TASK_POOL.map(function (t) { return t.category; }));
            expect(cats).toEqual(new Set(['support', 'devops', 'finance']));
        });
        test('each task has required fields', function () {
            AL.TASK_POOL.forEach(function (t) {
                expect(t).toHaveProperty('icon');
                expect(t).toHaveProperty('name');
                expect(t).toHaveProperty('risk');
                expect(t).toHaveProperty('category');
            });
        });
    });

    describe('RISK_ORDER', function () {
        test('is ordered low < medium < high < critical', function () {
            expect(AL.RISK_ORDER.low).toBeLessThan(AL.RISK_ORDER.medium);
            expect(AL.RISK_ORDER.medium).toBeLessThan(AL.RISK_ORDER.high);
            expect(AL.RISK_ORDER.high).toBeLessThan(AL.RISK_ORDER.critical);
        });
    });

    describe('LEVEL_NAMES', function () {
        test('has 6 entries (index 0 empty)', function () {
            expect(AL.LEVEL_NAMES).toHaveLength(6);
            expect(AL.LEVEL_NAMES[0]).toBe('');
        });
        test('level 5 is Autonomous', function () {
            expect(AL.LEVEL_NAMES[5]).toBe('Autonomous');
        });
    });

    describe('SPEED_MAP', function () {
        test('slow > normal > fast', function () {
            expect(AL.SPEED_MAP.slow).toBeGreaterThan(AL.SPEED_MAP.normal);
            expect(AL.SPEED_MAP.normal).toBeGreaterThan(AL.SPEED_MAP.fast);
        });
    });

    /* ── createState ── */
    describe('createState', function () {
        test('returns fresh state with defaults', function () {
            var s = AL.createState();
            expect(s.level).toBe(1);
            expect(s.running).toBe(false);
            expect(s.trustScore).toBe(0);
            expect(s.taskQueue).toEqual([]);
        });
    });

    /* ── getAutoThreshold ── */
    describe('getAutoThreshold', function () {
        test('level 1 returns -1', function () { expect(AL.getAutoThreshold(1)).toBe(-1); });
        test('level 2 returns -1', function () { expect(AL.getAutoThreshold(2)).toBe(-1); });
        test('level 3 returns 0', function () { expect(AL.getAutoThreshold(3)).toBe(0); });
        test('level 4 returns 2', function () { expect(AL.getAutoThreshold(4)).toBe(2); });
        test('level 5 returns 3', function () { expect(AL.getAutoThreshold(5)).toBe(3); });
    });

    /* ── shouldAutoHandle ── */
    describe('shouldAutoHandle', function () {
        test('level 1 never auto-handles', function () {
            expect(AL.shouldAutoHandle(1, 'low')).toBe(false);
            expect(AL.shouldAutoHandle(1, 'critical')).toBe(false);
        });
        test('level 3 auto-handles low only', function () {
            expect(AL.shouldAutoHandle(3, 'low')).toBe(true);
            expect(AL.shouldAutoHandle(3, 'medium')).toBe(false);
        });
        test('level 4 auto-handles up to high', function () {
            expect(AL.shouldAutoHandle(4, 'low')).toBe(true);
            expect(AL.shouldAutoHandle(4, 'medium')).toBe(true);
            expect(AL.shouldAutoHandle(4, 'high')).toBe(true);
            expect(AL.shouldAutoHandle(4, 'critical')).toBe(false);
        });
        test('level 5 auto-handles everything', function () {
            expect(AL.shouldAutoHandle(5, 'low')).toBe(true);
            expect(AL.shouldAutoHandle(5, 'critical')).toBe(true);
        });
    });

    /* ── generateTask ── */
    describe('generateTask', function () {
        test('returns valid task object', function () {
            var s = AL.createState();
            var t = AL.generateTask(s, null);
            expect(t).toHaveProperty('id');
            expect(t).toHaveProperty('icon');
            expect(t).toHaveProperty('name');
            expect(t).toHaveProperty('risk');
            expect(t.status).toBe('pending');
            expect(t.confidence).toBeGreaterThanOrEqual(70);
            expect(t.confidence).toBeLessThan(100);
        });
        test('increments task count', function () {
            var s = AL.createState();
            var t1 = AL.generateTask(s, null);
            var t2 = AL.generateTask(s, null);
            expect(t2.id).toBe(t1.id + 1);
        });
        test('filters by preset', function () {
            var s = AL.createState();
            for (var i = 0; i < 30; i++) {
                var t = AL.generateTask(s, 'devops');
                expect(t.category).toBe('devops');
            }
        });
        test('falls back to full pool for unknown preset', function () {
            var s = AL.createState();
            var t = AL.generateTask(s, 'nonexistent');
            expect(t).toHaveProperty('name');
        });
    });

    /* ── getResponseTime ── */
    describe('getResponseTime', function () {
        test('returns positive number', function () {
            expect(AL.getResponseTime(3, 'medium')).toBeGreaterThan(0);
        });
        test('higher level is faster on average', function () {
            var sum1 = 0, sum5 = 0;
            for (var i = 0; i < 200; i++) {
                sum1 += AL.getResponseTime(1, 'medium');
                sum5 += AL.getResponseTime(5, 'medium');
            }
            expect(sum5 / 200).toBeLessThan(sum1 / 200);
        });
        test('higher risk takes longer', function () {
            var sumLow = 0, sumCrit = 0;
            for (var i = 0; i < 200; i++) {
                sumLow += AL.getResponseTime(3, 'low');
                sumCrit += AL.getResponseTime(3, 'critical');
            }
            expect(sumCrit / 200).toBeGreaterThan(sumLow / 200);
        });
    });

    /* ── rollMistake ── */
    describe('rollMistake', function () {
        test('never mistakes at level 1 or 2', function () {
            for (var i = 0; i < 100; i++) {
                expect(AL.rollMistake(1, 'critical')).toBe(false);
                expect(AL.rollMistake(2, 'high')).toBe(false);
            }
        });
        test('level 3 never mistakes on low risk', function () {
            for (var i = 0; i < 100; i++) {
                expect(AL.rollMistake(3, 'low')).toBe(false);
            }
        });
    });

    /* ── processTask ── */
    describe('processTask', function () {
        test('auto-completes low-risk at level 5', function () {
            var s = AL.createState();
            s.level = 5;
            var t = AL.generateTask(s, null);
            t.risk = 'low';
            var result = AL.processTask(s, t);
            expect(['auto', 'error']).toContain(result.type);
            expect(s.tasksCompleted).toBe(1);
        });
        test('waits for approval at level 1', function () {
            var s = AL.createState();
            s.level = 1;
            var t = AL.generateTask(s, null);
            var result = AL.processTask(s, t);
            expect(result.type).toBe('waiting');
            expect(s.interventions).toBe(1);
        });
        test('suggests at level 2', function () {
            var s = AL.createState();
            s.level = 2;
            var t = AL.generateTask(s, null);
            var result = AL.processTask(s, t);
            expect(result.type).toBe('suggest');
        });
        test('level 3 auto-handles low, escalates medium', function () {
            var s = AL.createState();
            s.level = 3;
            var low = AL.generateTask(s, null);
            low.risk = 'low';
            var resLow = AL.processTask(s, low);
            expect(['auto', 'error']).toContain(resLow.type);

            var med = AL.generateTask(s, null);
            med.risk = 'medium';
            var resMed = AL.processTask(s, med);
            expect(['waiting', 'suggest']).toContain(resMed.type);
        });
        test('trust increases on successful auto-complete', function () {
            var s = AL.createState();
            s.level = 5;
            s.trustScore = 10;
            var t = AL.generateTask(s, null);
            t.risk = 'low';
            // Run many times to statistically ensure at least one success
            var found = false;
            for (var i = 0; i < 50; i++) {
                var st = AL.createState();
                st.level = 5;
                st.trustScore = 10;
                var task = AL.generateTask(st, null);
                task.risk = 'low';
                AL.processTask(st, task);
                if (st.trustScore > 10) { found = true; break; }
            }
            expect(found).toBe(true);
        });
        test('trust capped at 100', function () {
            var s = AL.createState();
            s.level = 5;
            s.trustScore = 99;
            var t = AL.generateTask(s, null);
            t.risk = 'low';
            AL.processTask(s, t);
            expect(s.trustScore).toBeLessThanOrEqual(100);
        });
    });

    /* ── approveTask ── */
    describe('approveTask', function () {
        test('completes a pending task', function () {
            var s = AL.createState();
            var t = AL.generateTask(s, null);
            t.status = 'pending';
            t.responseTime = 2.0;
            s.taskQueue.push(t);
            var result = AL.approveTask(s, t.id);
            expect(result).not.toBeNull();
            expect(t.status).toBe('completed');
            expect(t.action).toBe('manual');
        });
        test('increments tasksCompleted', function () {
            var s = AL.createState();
            var t = AL.generateTask(s, null);
            t.status = 'pending';
            t.responseTime = 1.0;
            s.taskQueue.push(t);
            AL.approveTask(s, t.id);
            expect(s.tasksCompleted).toBe(1);
        });
        test('returns null for non-existent task', function () {
            var s = AL.createState();
            expect(AL.approveTask(s, 99999)).toBeNull();
        });
        test('returns null for already completed task', function () {
            var s = AL.createState();
            var t = AL.generateTask(s, null);
            t.status = 'completed';
            s.taskQueue.push(t);
            expect(AL.approveTask(s, t.id)).toBeNull();
        });
        test('clears pendingApproval', function () {
            var s = AL.createState();
            var t = AL.generateTask(s, null);
            t.status = 'pending';
            t.responseTime = 1.0;
            s.taskQueue.push(t);
            s.pendingApproval = t;
            AL.approveTask(s, t.id);
            expect(s.pendingApproval).toBeNull();
        });
        test('increases trust score', function () {
            var s = AL.createState();
            var t = AL.generateTask(s, null);
            t.status = 'pending';
            t.risk = 'low';
            t.responseTime = 1.0;
            s.taskQueue.push(t);
            AL.approveTask(s, t.id);
            expect(s.trustScore).toBeGreaterThan(0);
        });
    });

    /* ── rejectTask ── */
    describe('rejectTask', function () {
        test('marks task as rejected', function () {
            var s = AL.createState();
            var t = AL.generateTask(s, null);
            t.status = 'pending';
            s.taskQueue.push(t);
            var result = AL.rejectTask(s, t.id);
            expect(result).not.toBeNull();
            expect(t.status).toBe('rejected');
        });
        test('returns null for non-existent task', function () {
            var s = AL.createState();
            expect(AL.rejectTask(s, 99999)).toBeNull();
        });
        test('clears pendingApproval', function () {
            var s = AL.createState();
            var t = AL.generateTask(s, null);
            t.status = 'pending';
            s.taskQueue.push(t);
            s.pendingApproval = t;
            AL.rejectTask(s, t.id);
            expect(s.pendingApproval).toBeNull();
        });
    });

    /* ── computeGrade ── */
    describe('computeGrade', function () {
        test('90+ is S', function () { expect(AL.computeGrade(90)).toBe('S'); });
        test('75 is A', function () { expect(AL.computeGrade(75)).toBe('A'); });
        test('60 is B', function () { expect(AL.computeGrade(60)).toBe('B'); });
        test('40 is C', function () { expect(AL.computeGrade(40)).toBe('C'); });
        test('39 is D', function () { expect(AL.computeGrade(39)).toBe('D'); });
        test('100 is S', function () { expect(AL.computeGrade(100)).toBe('S'); });
        test('0 is D', function () { expect(AL.computeGrade(0)).toBe('D'); });
    });

    /* ── buildFindings ── */
    describe('buildFindings', function () {
        test('returns array of strings', function () {
            var s = AL.createState();
            var f = AL.buildFindings(s);
            expect(Array.isArray(f)).toBe(true);
            f.forEach(function (item) { expect(typeof item).toBe('string'); });
        });
        test('autonomous zero-error finding', function () {
            var s = AL.createState();
            s.level = 4;
            s.errorsCaught = 0;
            var f = AL.buildFindings(s);
            expect(f.some(function (x) { return x.includes('zero errors'); })).toBe(true);
        });
        test('manual control finding for level 1', function () {
            var s = AL.createState();
            s.level = 1;
            var f = AL.buildFindings(s);
            expect(f.some(function (x) { return x.includes('manual control'); })).toBe(true);
        });
        test('high intervention finding', function () {
            var s = AL.createState();
            s.interventions = 10;
            s.tasksCompleted = 5;
            var f = AL.buildFindings(s);
            expect(f.some(function (x) { return x.includes('intervention rate'); })).toBe(true);
        });
        test('error warning finding', function () {
            var s = AL.createState();
            s.errorsCaught = 3;
            var f = AL.buildFindings(s);
            expect(f.some(function (x) { return x.includes('Multiple errors'); })).toBe(true);
        });
        test('trust finding for high score', function () {
            var s = AL.createState();
            s.trustScore = 85;
            var f = AL.buildFindings(s);
            expect(f.some(function (x) { return x.includes('trust established'); })).toBe(true);
        });
    });

    /* ── buildExportData ── */
    describe('buildExportData', function () {
        test('returns object with all fields', function () {
            var s = AL.createState();
            s.level = 3;
            s.trustScore = 50;
            s.tasksCompleted = 5;
            s.totalResponseTime = 10;
            var data = AL.buildExportData(s);
            expect(data.autonomyLevel).toBe(3);
            expect(data.levelName).toBe('Auto-Low');
            expect(data.trustScore).toBe(50);
            expect(data.avgResponseTime).toBe(2.0);
            expect(data.tasks).toEqual([]);
        });
        test('avgResponseTime is 0 when no tasks', function () {
            var s = AL.createState();
            var data = AL.buildExportData(s);
            expect(data.avgResponseTime).toBe(0);
        });
        test('includes task details in export', function () {
            var s = AL.createState();
            var t = AL.generateTask(s, null);
            t.status = 'completed';
            t.action = 'auto';
            t.responseTime = 1.5;
            s.taskQueue.push(t);
            var data = AL.buildExportData(s);
            expect(data.tasks).toHaveLength(1);
            expect(data.tasks[0].status).toBe('completed');
        });
    });
});
