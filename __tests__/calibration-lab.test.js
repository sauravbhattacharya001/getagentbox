'use strict';

var _mod = require('../src/calibration-lab.js');
var createCalibrationEngine = _mod.createCalibrationEngine;
var PRESETS = _mod.PRESETS;
var TASK_TYPES = _mod.TASK_TYPES;

describe('Agent Calibration Lab', function() {

    describe('PRESETS', function() {
        test('has 5 presets with required fields', function() {
            var keys = Object.keys(PRESETS);
            expect(keys.length).toBe(5);
            keys.forEach(function(k) {
                expect(PRESETS[k]).toHaveProperty('name');
                expect(PRESETS[k]).toHaveProperty('confBias');
                expect(PRESETS[k]).toHaveProperty('baseAccuracy');
            });
        });

        test('adaptive preset has adaptRate', function() {
            expect(PRESETS.adaptive.adaptRate).toBeGreaterThan(0);
        });
    });

    describe('TASK_TYPES', function() {
        test('has at least 10 task types', function() {
            expect(TASK_TYPES.length).toBeGreaterThanOrEqual(10);
        });

        test('each task has icon, name, domain', function() {
            TASK_TYPES.forEach(function(t) {
                expect(t.icon).toBeTruthy();
                expect(t.name).toBeTruthy();
                expect(t.domain).toBeTruthy();
            });
        });
    });

    describe('createCalibrationEngine', function() {
        var engine;
        beforeEach(function() { engine = createCalibrationEngine(); });

        test('initial state is clean', function() {
            expect(engine.state.predictions).toEqual([]);
            expect(engine.state.tickCount).toBe(0);
            expect(engine.state.running).toBe(false);
        });

        test('generatePrediction returns valid prediction', function() {
            var pred = engine.generatePrediction();
            expect(pred.confidence).toBeGreaterThan(0);
            expect(pred.confidence).toBeLessThan(1);
            expect(typeof pred.outcome).toBe('boolean');
            expect(pred.task).toHaveProperty('name');
            expect(pred.id).toBe(0);
        });

        test('predictions accumulate', function() {
            engine.generatePrediction();
            engine.generatePrediction();
            engine.generatePrediction();
            expect(engine.state.predictions.length).toBe(3);
            expect(engine.state.tickCount).toBe(3);
        });

        test('bins are updated correctly', function() {
            for (var i = 0; i < 100; i++) engine.generatePrediction();
            var totalInBins = engine.state.bins.reduce(function(s, b) { return s + b.total; }, 0);
            expect(totalInBins).toBe(100);
        });

        test('brierHistory grows with predictions', function() {
            for (var i = 0; i < 20; i++) engine.generatePrediction();
            expect(engine.state.brierHistory.length).toBe(20);
        });
    });

    describe('computeMetrics', function() {
        var engine;
        beforeEach(function() { engine = createCalibrationEngine(); });

        test('returns zeros for empty predictions', function() {
            var m = engine.computeMetrics();
            expect(m.brier).toBe(0);
            expect(m.ece).toBe(0);
            expect(m.n).toBe(0);
        });

        test('brier score is between 0 and 1', function() {
            for (var i = 0; i < 100; i++) engine.generatePrediction();
            var m = engine.computeMetrics();
            expect(m.brier).toBeGreaterThanOrEqual(0);
            expect(m.brier).toBeLessThanOrEqual(1);
        });

        test('ECE is non-negative', function() {
            for (var i = 0; i < 100; i++) engine.generatePrediction();
            var m = engine.computeMetrics();
            expect(m.ece).toBeGreaterThanOrEqual(0);
        });

        test('accuracy is between 0 and 1', function() {
            for (var i = 0; i < 50; i++) engine.generatePrediction();
            var m = engine.computeMetrics();
            expect(m.accuracy).toBeGreaterThanOrEqual(0);
            expect(m.accuracy).toBeLessThanOrEqual(1);
        });

        test('overconfidence rate reflects miscalibration', function() {
            engine.state.preset = 'overconfident';
            for (var i = 0; i < 200; i++) engine.generatePrediction();
            var m = engine.computeMetrics();
            expect(m.overconfRate).toBeGreaterThan(0);
        });

        test('well-calibrated has lower ECE than overconfident', function() {
            var eng1 = createCalibrationEngine();
            eng1.state.preset = 'wellcalibrated';
            for (var i = 0; i < 500; i++) eng1.generatePrediction();
            var m1 = eng1.computeMetrics();

            var eng2 = createCalibrationEngine();
            eng2.state.preset = 'overconfident';
            for (var i = 0; i < 500; i++) eng2.generatePrediction();
            var m2 = eng2.computeMetrics();

            expect(m1.ece).toBeLessThan(m2.ece);
        });
    });

    describe('calibrationScore', function() {
        test('returns 0 for fewer than 5 predictions', function() {
            var engine = createCalibrationEngine();
            engine.generatePrediction();
            expect(engine.computeCalibrationScore(engine.computeMetrics())).toBe(0);
        });

        test('well-calibrated agent scores higher', function() {
            var eng1 = createCalibrationEngine();
            eng1.state.preset = 'wellcalibrated';
            for (var i = 0; i < 300; i++) eng1.generatePrediction();
            var s1 = eng1.computeCalibrationScore(eng1.computeMetrics());

            var eng2 = createCalibrationEngine();
            eng2.state.preset = 'random';
            for (var i = 0; i < 300; i++) eng2.generatePrediction();
            var s2 = eng2.computeCalibrationScore(eng2.computeMetrics());

            expect(s1).toBeGreaterThan(s2);
        });

        test('score is between 0 and 100', function() {
            var engine = createCalibrationEngine();
            for (var i = 0; i < 100; i++) engine.generatePrediction();
            var s = engine.computeCalibrationScore(engine.computeMetrics());
            expect(s).toBeGreaterThanOrEqual(0);
            expect(s).toBeLessThanOrEqual(100);
        });
    });

    describe('generateInsights', function() {
        test('returns collecting message for few predictions', function() {
            var engine = createCalibrationEngine();
            for (var i = 0; i < 5; i++) engine.generatePrediction();
            var insights = engine.generateInsights(engine.computeMetrics());
            expect(insights[0].text).toContain('Collecting');
        });

        test('detects overconfidence', function() {
            var engine = createCalibrationEngine();
            engine.state.preset = 'overconfident';
            for (var i = 0; i < 200; i++) engine.generatePrediction();
            var insights = engine.generateInsights(engine.computeMetrics());
            var hasOverconf = insights.some(function(ins) { return ins.text.toLowerCase().includes('overconfident'); });
            expect(hasOverconf).toBe(true);
        });

        test('returns array of objects with text and type', function() {
            var engine = createCalibrationEngine();
            for (var i = 0; i < 50; i++) engine.generatePrediction();
            var insights = engine.generateInsights(engine.computeMetrics());
            insights.forEach(function(ins) {
                expect(ins).toHaveProperty('text');
                expect(ins).toHaveProperty('type');
            });
        });
    });

    describe('autoCalibratePlatt', function() {
        test('returns a and b parameters', function() {
            var engine = createCalibrationEngine();
            for (var i = 0; i < 50; i++) engine.generatePrediction();
            var params = engine.autoCalibratePlatt();
            expect(typeof params.a).toBe('number');
            expect(typeof params.b).toBe('number');
            expect(isFinite(params.a)).toBe(true);
            expect(isFinite(params.b)).toBe(true);
        });

        test('returns defaults for few predictions', function() {
            var engine = createCalibrationEngine();
            var params = engine.autoCalibratePlatt();
            expect(params.a).toBe(1);
            expect(params.b).toBe(0);
        });
    });

    describe('optimizeTemperature', function() {
        test('returns positive temperature', function() {
            var engine = createCalibrationEngine();
            for (var i = 0; i < 100; i++) engine.generatePrediction();
            var t = engine.optimizeTemperature();
            expect(t).toBeGreaterThan(0);
            expect(t).toBeLessThanOrEqual(5);
        });

        test('overconfident agent gets T > 1', function() {
            var engine = createCalibrationEngine();
            engine.state.preset = 'overconfident';
            for (var i = 0; i < 200; i++) engine.generatePrediction();
            var t = engine.optimizeTemperature();
            expect(t).toBeGreaterThanOrEqual(1.0);
        });
    });

    describe('fitIsotonic', function() {
        test('returns array of 20 values', function() {
            var engine = createCalibrationEngine();
            for (var i = 0; i < 100; i++) engine.generatePrediction();
            var map = engine.fitIsotonic();
            expect(map.length).toBe(20);
        });

        test('values are between 0 and 1', function() {
            var engine = createCalibrationEngine();
            for (var i = 0; i < 200; i++) engine.generatePrediction();
            var map = engine.fitIsotonic();
            map.forEach(function(v) {
                expect(v).toBeGreaterThanOrEqual(0);
                expect(v).toBeLessThanOrEqual(1);
            });
        });
    });

    describe('reset', function() {
        test('clears all state', function() {
            var engine = createCalibrationEngine();
            for (var i = 0; i < 50; i++) engine.generatePrediction();
            engine.reset();
            expect(engine.state.predictions).toEqual([]);
            expect(engine.state.tickCount).toBe(0);
            expect(engine.state.brierHistory).toEqual([]);
            expect(engine.state.calibrationApplied).toBeNull();
        });
    });

    describe('calibration application', function() {
        test('platt calibration modifies confidence', function() {
            var engine = createCalibrationEngine();
            engine.state.calibrationApplied = { type: 'platt', a: 2.0, b: -0.5 };
            var pred = engine.generatePrediction();
            expect(pred.confidence).toBeGreaterThan(0);
            expect(pred.confidence).toBeLessThan(1);
        });

        test('temperature calibration modifies confidence', function() {
            var engine = createCalibrationEngine();
            engine.state.calibrationApplied = { type: 'temperature', t: 2.0 };
            var pred = engine.generatePrediction();
            expect(pred.confidence).toBeGreaterThan(0);
            expect(pred.confidence).toBeLessThan(1);
        });

        test('isotonic calibration modifies confidence', function() {
            var engine = createCalibrationEngine();
            var map = [];
            for (var i = 0; i < 20; i++) map.push(i / 20);
            engine.state.calibrationApplied = { type: 'isotonic', map: map };
            var pred = engine.generatePrediction();
            expect(pred.confidence).toBeGreaterThanOrEqual(0);
            expect(pred.confidence).toBeLessThan(1);
        });
    });
});
