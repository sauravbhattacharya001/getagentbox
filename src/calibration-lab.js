'use strict';

/* ── Agent Calibration Lab ──
   Interactive demo: confidence calibration visualization with
   reliability diagrams, Brier scores, ECE, and calibration adjustment.
   Tests: 32
*/

// ═══════════════════════════════════════════════════════════════
// DATA & PRESETS
// ═══════════════════════════════════════════════════════════════

var TASK_TYPES = [
    { icon: '📧', name: 'Classify email intent', domain: 'NLP' },
    { icon: '🖼️', name: 'Identify object in image', domain: 'Vision' },
    { icon: '💬', name: 'Detect sentiment', domain: 'NLP' },
    { icon: '🔍', name: 'Retrieve relevant document', domain: 'Search' },
    { icon: '🧮', name: 'Solve math problem', domain: 'Reasoning' },
    { icon: '📝', name: 'Summarize article', domain: 'NLP' },
    { icon: '🗂️', name: 'Categorize support ticket', domain: 'Classification' },
    { icon: '🔗', name: 'Extract entities', domain: 'NLP' },
    { icon: '📊', name: 'Predict next value', domain: 'Forecasting' },
    { icon: '🎯', name: 'Match user query to FAQ', domain: 'Search' },
    { icon: '🚨', name: 'Detect anomaly', domain: 'Monitoring' },
    { icon: '🤖', name: 'Generate code snippet', domain: 'Coding' },
    { icon: '🌐', name: 'Translate phrase', domain: 'NLP' },
    { icon: '📈', name: 'Forecast demand', domain: 'Forecasting' },
    { icon: '🧬', name: 'Classify protein sequence', domain: 'Science' },
    { icon: '🗣️', name: 'Transcribe audio segment', domain: 'Speech' }
];

var PRESETS = {
    overconfident: {
        name: 'Overconfident Agent',
        description: 'Consistently reports higher confidence than warranted by accuracy',
        confBias: 0.2,
        confNoise: 0.1,
        baseAccuracy: 0.65
    },
    underconfident: {
        name: 'Underconfident Agent',
        description: 'Conservative confidence - accuracy often exceeds stated confidence',
        confBias: -0.2,
        confNoise: 0.1,
        baseAccuracy: 0.8
    },
    wellcalibrated: {
        name: 'Well-Calibrated Agent',
        description: 'Confidence closely matches observed accuracy across all bins',
        confBias: 0.0,
        confNoise: 0.05,
        baseAccuracy: 0.75
    },
    random: {
        name: 'Random Agent',
        description: 'No meaningful calibration - confidence bears little relation to accuracy',
        confBias: 0.0,
        confNoise: 0.4,
        baseAccuracy: 0.5
    },
    adaptive: {
        name: 'Self-Correcting Agent',
        description: 'Starts overconfident but learns to calibrate over time',
        confBias: 0.25,
        confNoise: 0.1,
        baseAccuracy: 0.7,
        adaptRate: 0.005
    }
};

// ═══════════════════════════════════════════════════════════════
// CORE ENGINE
// ═══════════════════════════════════════════════════════════════

function createCalibrationEngine() {
    var state = {
        predictions: [],
        bins: new Array(10).fill(null).map(function() { return { total: 0, correct: 0, confSum: 0 }; }),
        running: false,
        paused: false,
        preset: 'overconfident',
        timerId: null,
        tickCount: 0,
        brierHistory: [],
        calibrationApplied: null
    };

    function getPreset() { return PRESETS[state.preset]; }

    function generatePrediction() {
        var preset = getPreset();
        var task = TASK_TYPES[Math.floor(Math.random() * TASK_TYPES.length)];
        var trueProb = preset.baseAccuracy + (Math.random() - 0.5) * 0.3;
        trueProb = Math.max(0.1, Math.min(0.95, trueProb));

        var adaptAdjust = 0;
        if (preset.adaptRate && state.tickCount > 0) {
            adaptAdjust = -preset.confBias * (1 - Math.exp(-preset.adaptRate * state.tickCount));
        }

        var confidence = trueProb + preset.confBias + adaptAdjust + (Math.random() - 0.5) * preset.confNoise * 2;
        confidence = Math.max(0.05, Math.min(0.99, confidence));

        var outcome = Math.random() < trueProb;

        if (state.calibrationApplied) {
            confidence = applyCalibration(confidence, state.calibrationApplied);
        }

        var prediction = {
            id: state.tickCount,
            task: task,
            confidence: confidence,
            outcome: outcome,
            timestamp: Date.now()
        };

        state.predictions.push(prediction);
        state.tickCount++;

        var binIdx = Math.min(9, Math.floor(confidence * 10));
        state.bins[binIdx].total++;
        state.bins[binIdx].confSum += confidence;
        if (outcome) state.bins[binIdx].correct++;

        var brier = Math.pow(confidence - (outcome ? 1 : 0), 2);
        state.brierHistory.push(brier);

        return prediction;
    }

    function applyCalibration(conf, cal) {
        if (cal.type === 'platt') {
            var logit = Math.log(conf / (1 - conf));
            var scaled = 1 / (1 + Math.exp(-(cal.a * logit + cal.b)));
            return Math.max(0.01, Math.min(0.99, scaled));
        }
        if (cal.type === 'temperature') {
            var logit2 = Math.log(conf / (1 - conf));
            var scaled2 = 1 / (1 + Math.exp(-logit2 / cal.t));
            return Math.max(0.01, Math.min(0.99, scaled2));
        }
        if (cal.type === 'isotonic' && cal.map) {
            var idx = Math.min(cal.map.length - 1, Math.floor(conf * cal.map.length));
            return cal.map[idx];
        }
        return conf;
    }

    function computeMetrics() {
        var n = state.predictions.length;
        if (n === 0) return { brier: 0, ece: 0, accuracy: 0, avgConf: 0, overconfRate: 0, n: 0 };

        var brierSum = 0;
        var correctCount = 0;
        var confSum = 0;
        var overconfCount = 0;

        for (var i = 0; i < n; i++) {
            var p = state.predictions[i];
            brierSum += Math.pow(p.confidence - (p.outcome ? 1 : 0), 2);
            if (p.outcome) correctCount++;
            confSum += p.confidence;
            if (p.confidence > 0.5 && !p.outcome) overconfCount++;
            if (p.confidence <= 0.5 && p.outcome) overconfCount++;
        }

        var ece = 0;
        for (var b = 0; b < 10; b++) {
            var bin = state.bins[b];
            if (bin.total === 0) continue;
            var binAcc = bin.correct / bin.total;
            var binConf = bin.confSum / bin.total;
            ece += (bin.total / n) * Math.abs(binAcc - binConf);
        }

        return {
            brier: brierSum / n,
            ece: ece,
            accuracy: correctCount / n,
            avgConf: confSum / n,
            overconfRate: overconfCount / n,
            n: n
        };
    }

    function generateInsights(metrics) {
        var insights = [];
        if (metrics.n < 10) return [{ text: 'Collecting predictions...', type: 'info' }];

        var calibrationGap = metrics.avgConf - metrics.accuracy;

        if (calibrationGap > 0.1) {
            insights.push({ text: 'Agent is overconfident by ' + (calibrationGap * 100).toFixed(1) + '%. Consider temperature scaling (T > 1.0) to soften probabilities.', type: 'danger' });
        } else if (calibrationGap < -0.1) {
            insights.push({ text: 'Agent is underconfident by ' + (Math.abs(calibrationGap) * 100).toFixed(1) + '%. Accuracy exceeds stated confidence.', type: 'warn' });
        } else {
            insights.push({ text: 'Confidence-accuracy gap is small (' + (Math.abs(calibrationGap) * 100).toFixed(1) + '%). Reasonably well-calibrated.', type: 'good' });
        }

        if (metrics.brier < 0.15) {
            insights.push({ text: 'Excellent Brier score (' + metrics.brier.toFixed(3) + '). Strong probabilistic accuracy.', type: 'good' });
        } else if (metrics.brier > 0.3) {
            insights.push({ text: 'High Brier score (' + metrics.brier.toFixed(3) + '). Predictions are poorly calibrated.', type: 'danger' });
        }

        if (metrics.ece > 0.15) {
            insights.push({ text: 'ECE of ' + (metrics.ece * 100).toFixed(1) + '% indicates systematic miscalibration across bins.', type: 'warn' });
        }

        // Find worst bin
        var worstGap = 0;
        var worstBin = -1;
        for (var b = 0; b < 10; b++) {
            var bin = state.bins[b];
            if (bin.total < 3) continue;
            var gap = Math.abs((bin.correct / bin.total) - (bin.confSum / bin.total));
            if (gap > worstGap) { worstGap = gap; worstBin = b; }
        }
        if (worstBin >= 0 && worstGap > 0.15) {
            var lo = (worstBin * 10);
            var hi = lo + 10;
            insights.push({ text: 'Worst calibration in ' + lo + '-' + hi + '% confidence range (gap: ' + (worstGap * 100).toFixed(1) + '%).', type: 'warn' });
        }

        if (state.preset === 'adaptive' && state.tickCount > 50) {
            var recentBrier = state.brierHistory.slice(-20).reduce(function(a, b) { return a + b; }, 0) / 20;
            var earlyBrier = state.brierHistory.slice(0, 20).reduce(function(a, b) { return a + b; }, 0) / 20;
            if (recentBrier < earlyBrier * 0.8) {
                insights.push({ text: 'Self-correction working! Brier improved ' + ((1 - recentBrier / earlyBrier) * 100).toFixed(0) + '% since start.', type: 'good' });
            }
        }

        return insights;
    }

    function computeCalibrationScore(metrics) {
        if (metrics.n < 5) return 0;
        var eceScore = Math.max(0, 1 - metrics.ece * 5);
        var brierScore = Math.max(0, 1 - metrics.brier * 3);
        var gapScore = Math.max(0, 1 - Math.abs(metrics.avgConf - metrics.accuracy) * 5);
        return Math.round(((eceScore + brierScore + gapScore) / 3) * 100);
    }

    function autoCalibratePlatt() {
        if (state.predictions.length < 20) return { a: 1, b: 0 };
        // Simple gradient descent on log-loss
        var a = 1.0, b = 0.0;
        var lr = 0.01;
        for (var iter = 0; iter < 200; iter++) {
            var gradA = 0, gradB = 0;
            for (var i = 0; i < state.predictions.length; i++) {
                var p = state.predictions[i];
                var logit = Math.log(p.confidence / (1 - p.confidence));
                var cal = 1 / (1 + Math.exp(-(a * logit + b)));
                var err = cal - (p.outcome ? 1 : 0);
                gradA += err * logit;
                gradB += err;
            }
            a -= lr * gradA / state.predictions.length;
            b -= lr * gradB / state.predictions.length;
        }
        return { a: a, b: b };
    }

    function optimizeTemperature() {
        if (state.predictions.length < 20) return 1.0;
        var bestT = 1.0, bestLoss = Infinity;
        for (var t = 0.1; t <= 5.0; t += 0.1) {
            var loss = 0;
            for (var i = 0; i < state.predictions.length; i++) {
                var p = state.predictions[i];
                var logit = Math.log(p.confidence / (1 - p.confidence));
                var cal = 1 / (1 + Math.exp(-logit / t));
                var target = p.outcome ? 1 : 0;
                loss += -(target * Math.log(cal + 1e-10) + (1 - target) * Math.log(1 - cal + 1e-10));
            }
            if (loss < bestLoss) { bestLoss = loss; bestT = t; }
        }
        return Math.round(bestT * 10) / 10;
    }

    function fitIsotonic() {
        var buckets = new Array(20).fill(null).map(function() { return { sum: 0, n: 0 }; });
        for (var i = 0; i < state.predictions.length; i++) {
            var p = state.predictions[i];
            var idx = Math.min(19, Math.floor(p.confidence * 20));
            buckets[idx].sum += p.outcome ? 1 : 0;
            buckets[idx].n++;
        }
        // Pool Adjacent Violators
        var map = buckets.map(function(b) { return b.n > 0 ? b.sum / b.n : null; });
        // Fill nulls with linear interp
        for (var i = 0; i < map.length; i++) {
            if (map[i] === null) map[i] = i / 20;
        }
        // PAV monotone increasing
        for (var i = 1; i < map.length; i++) {
            if (map[i] < map[i - 1]) {
                var avg = (map[i] + map[i - 1]) / 2;
                map[i] = avg;
                map[i - 1] = avg;
            }
        }
        return map;
    }

    function reset() {
        state.predictions = [];
        state.bins = new Array(10).fill(null).map(function() { return { total: 0, correct: 0, confSum: 0 }; });
        state.tickCount = 0;
        state.brierHistory = [];
        state.calibrationApplied = null;
        if (state.timerId) { clearInterval(state.timerId); state.timerId = null; }
        state.running = false;
        state.paused = false;
    }

    return {
        state: state,
        generatePrediction: generatePrediction,
        computeMetrics: computeMetrics,
        generateInsights: generateInsights,
        computeCalibrationScore: computeCalibrationScore,
        autoCalibratePlatt: autoCalibratePlatt,
        optimizeTemperature: optimizeTemperature,
        fitIsotonic: fitIsotonic,
        reset: reset
    };
}

// ═══════════════════════════════════════════════════════════════
// RENDERING
// ═══════════════════════════════════════════════════════════════

function drawReliabilityDiagram(canvas, bins) {
    var ctx = canvas.getContext('2d');
    var w = canvas.width;
    var h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    var pad = 40;
    var pw = w - pad * 2;
    var ph = h - pad * 2;

    // Grid
    ctx.strokeStyle = '#2a2a2a';
    ctx.lineWidth = 1;
    for (var i = 0; i <= 10; i++) {
        var x = pad + (i / 10) * pw;
        var y = pad + ph - (i / 10) * ph;
        ctx.beginPath(); ctx.moveTo(x, pad); ctx.lineTo(x, pad + ph); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(pad, y); ctx.lineTo(pad + pw, y); ctx.stroke();
    }

    // Diagonal (perfect calibration)
    ctx.strokeStyle = '#00d4ff44';
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 4]);
    ctx.beginPath();
    ctx.moveTo(pad, pad + ph);
    ctx.lineTo(pad + pw, pad);
    ctx.stroke();
    ctx.setLineDash([]);

    // Bars
    var barW = pw / 10 - 4;
    for (var b = 0; b < 10; b++) {
        var bin = bins[b];
        if (bin.total === 0) continue;
        var accuracy = bin.correct / bin.total;
        var midConf = bin.confSum / bin.total;
        var x = pad + (b / 10) * pw + 2;
        var barH = accuracy * ph;
        var y = pad + ph - barH;

        var isOver = midConf > accuracy;
        ctx.fillStyle = isOver ? '#e1705588' : '#00b89488';
        ctx.fillRect(x, y, barW, barH);
        ctx.strokeStyle = isOver ? '#e17055' : '#00b894';
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y, barW, barH);

        // Confidence marker
        var confY = pad + ph - midConf * ph;
        ctx.fillStyle = '#00d4ff';
        ctx.beginPath();
        ctx.arc(x + barW / 2, confY, 4, 0, Math.PI * 2);
        ctx.fill();
    }

    // Axis labels
    ctx.fillStyle = '#888';
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Mean Predicted Confidence', pad + pw / 2, h - 5);
    ctx.save();
    ctx.translate(12, pad + ph / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('Observed Accuracy', 0, 0);
    ctx.restore();
}

function drawDistribution(canvas, predictions, brierHistory) {
    var ctx = canvas.getContext('2d');
    var w = canvas.width;
    var h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    if (predictions.length < 2) return;

    var pad = 30;
    var pw = w - pad * 2;
    var ph = h - pad * 2;

    // Draw Brier score over time (line)
    var windowSize = 20;
    var smoothed = [];
    for (var i = windowSize; i < brierHistory.length; i++) {
        var sum = 0;
        for (var j = i - windowSize; j < i; j++) sum += brierHistory[j];
        smoothed.push(sum / windowSize);
    }

    if (smoothed.length > 1) {
        var maxB = Math.max.apply(null, smoothed);
        ctx.strokeStyle = '#00d4ff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (var i = 0; i < smoothed.length; i++) {
            var x = pad + (i / (smoothed.length - 1)) * pw;
            var y = pad + ph - (smoothed[i] / (maxB + 0.05)) * ph;
            if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.stroke();

        ctx.fillStyle = '#888';
        ctx.font = '10px sans-serif';
        ctx.fillText('Brier (rolling ' + windowSize + ')', pad + 4, pad - 5);
        ctx.fillText('0', pad - 15, pad + ph);
        ctx.fillText((maxB + 0.05).toFixed(2), pad - 25, pad + 5);
    }

    // Confidence histogram on right side
    var histW = 100;
    var histX = w - histW - 10;
    var buckets = new Array(10).fill(0);
    for (var i = 0; i < predictions.length; i++) {
        var idx = Math.min(9, Math.floor(predictions[i].confidence * 10));
        buckets[idx]++;
    }
    var maxCount = Math.max.apply(null, buckets);
    if (maxCount > 0) {
        var barH = (h - 20) / 10;
        for (var b = 0; b < 10; b++) {
            var bw = (buckets[b] / maxCount) * (histW - 10);
            var by = 10 + b * barH;
            ctx.fillStyle = '#6c5ce744';
            ctx.fillRect(histX, by, bw, barH - 2);
            ctx.fillStyle = '#888';
            ctx.font = '9px sans-serif';
            ctx.fillText((b * 10) + '-' + ((b + 1) * 10) + '%', histX - 30, by + barH / 2 + 3);
        }
    }
}

function drawIsotonic(canvas, map) {
    if (!map) return;
    var ctx = canvas.getContext('2d');
    var w = canvas.width;
    var h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    var pad = 30;
    var pw = w - pad * 2;
    var ph = h - pad * 2;

    // Diagonal
    ctx.strokeStyle = '#ffffff22';
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(pad, pad + ph);
    ctx.lineTo(pad + pw, pad);
    ctx.stroke();
    ctx.setLineDash([]);

    // Isotonic curve
    ctx.strokeStyle = '#00d4ff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (var i = 0; i < map.length; i++) {
        var x = pad + (i / (map.length - 1)) * pw;
        var y = pad + ph - map[i] * ph;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();

    ctx.fillStyle = '#888';
    ctx.font = '10px sans-serif';
    ctx.fillText('Raw confidence →', pad + pw / 2 - 30, h - 5);
}

// ═══════════════════════════════════════════════════════════════
// UI BINDING
// ═══════════════════════════════════════════════════════════════

(function initUI() {
    if (typeof document === 'undefined') return;
    if (!document.getElementById('reliability-canvas')) return;

    var engine = createCalibrationEngine();
    var reliabilityCanvas = document.getElementById('reliability-canvas');
    var distributionCanvas = document.getElementById('distribution-canvas');
    var isotonicCanvas = document.getElementById('isotonic-canvas');
    var feed = document.getElementById('feed');

    function resizeCanvas(c) {
        c.width = c.offsetWidth * (window.devicePixelRatio || 1);
        c.height = c.offsetHeight * (window.devicePixelRatio || 1);
    }
    [reliabilityCanvas, distributionCanvas, isotonicCanvas].forEach(resizeCanvas);
    window.addEventListener('resize', function() {
        [reliabilityCanvas, distributionCanvas, isotonicCanvas].forEach(resizeCanvas);
        render();
    });

    function render() {
        var metrics = engine.computeMetrics();
        document.getElementById('m-brier').textContent = metrics.n > 0 ? metrics.brier.toFixed(3) : '—';
        document.getElementById('m-ece').textContent = metrics.n > 0 ? (metrics.ece * 100).toFixed(1) + '%' : '—';
        document.getElementById('m-accuracy').textContent = metrics.n > 0 ? (metrics.accuracy * 100).toFixed(1) + '%' : '—';
        document.getElementById('m-confidence').textContent = metrics.n > 0 ? (metrics.avgConf * 100).toFixed(1) + '%' : '—';
        document.getElementById('m-overconf').textContent = metrics.n > 0 ? (metrics.overconfRate * 100).toFixed(1) + '%' : '—';
        document.getElementById('m-predictions').textContent = metrics.n;

        var score = engine.computeCalibrationScore(metrics);
        var gaugeScore = document.getElementById('gauge-score');
        gaugeScore.textContent = metrics.n >= 5 ? score : '—';
        var gauge = document.getElementById('gauge');
        var color = score >= 70 ? '#00b894' : score >= 40 ? '#fdcb6e' : '#d63031';
        gauge.style.borderColor = color + '44';
        gaugeScore.style.color = color;

        var insights = engine.generateInsights(metrics);
        var insightsList = document.getElementById('insights');
        insightsList.innerHTML = insights.map(function(ins) {
            var cls = ins.type === 'danger' ? 'danger' : ins.type === 'warn' ? 'warn' : ins.type === 'good' ? 'good' : '';
            return '<li class="' + cls + '">' + escapeHtml(ins.text) + '</li>';
        }).join('');

        drawReliabilityDiagram(reliabilityCanvas, engine.state.bins);
        drawDistribution(distributionCanvas, engine.state.predictions, engine.state.brierHistory);
    }

    function addPredictionToFeed(pred) {
        var item = document.createElement('div');
        item.className = 'prediction-item';
        var confPct = (pred.confidence * 100).toFixed(0);
        var barColor = pred.confidence > 0.7 ? '#00b894' : pred.confidence > 0.4 ? '#fdcb6e' : '#e17055';
        item.innerHTML =
            '<span class="outcome ' + (pred.outcome ? 'outcome-correct' : 'outcome-wrong') + '">' +
            (pred.outcome ? '✓' : '✗') + '</span>' +
            '<span style="flex:1">' + escapeHtml(pred.task.icon + ' ' + pred.task.name) + '</span>' +
            '<span style="font-size:12px;color:var(--text-muted)">' + pred.task.domain + '</span>' +
            '<div class="conf-bar"><div class="fill" style="width:' + confPct + '%;background:' + barColor + '"></div></div>' +
            '<span style="min-width:35px;text-align:right;font-weight:600;font-size:12px">' + confPct + '%</span>';
        feed.insertBefore(item, feed.firstChild);
        if (feed.children.length > 50) feed.removeChild(feed.lastChild);
    }

    function tick() {
        if (engine.state.paused) return;
        var pred = engine.generatePrediction();
        addPredictionToFeed(pred);
        render();
    }

    // Controls
    document.getElementById('btn-run').addEventListener('click', function() {
        if (engine.state.running) return;
        engine.state.running = true;
        engine.state.paused = false;
        engine.state.timerId = setInterval(tick, 400);
    });

    document.getElementById('btn-pause').addEventListener('click', function() {
        engine.state.paused = !engine.state.paused;
        document.getElementById('btn-pause').textContent = engine.state.paused ? '▶ Resume' : '⏸ Pause';
    });

    document.getElementById('btn-reset').addEventListener('click', function() {
        engine.reset();
        feed.innerHTML = '';
        render();
        document.getElementById('btn-pause').textContent = '⏸ Pause';
    });

    // Preset buttons
    document.querySelectorAll('[data-preset]').forEach(function(btn) {
        btn.addEventListener('click', function() {
            document.querySelectorAll('[data-preset]').forEach(function(b) { b.classList.remove('active'); });
            btn.classList.add('active');
            engine.reset();
            engine.state.preset = btn.dataset.preset;
            feed.innerHTML = '';
            render();
            document.getElementById('btn-pause').textContent = '⏸ Pause';
        });
    });

    // Tabs
    document.querySelectorAll('.tab').forEach(function(tab) {
        tab.addEventListener('click', function() {
            document.querySelectorAll('.tab').forEach(function(t) { t.classList.remove('active'); });
            tab.classList.add('active');
            document.getElementById('tab-platt').classList.toggle('hidden', tab.dataset.tab !== 'platt');
            document.getElementById('tab-isotonic').classList.toggle('hidden', tab.dataset.tab !== 'isotonic');
            document.getElementById('tab-temperature').classList.toggle('hidden', tab.dataset.tab !== 'temperature');
        });
    });

    // Platt sliders
    document.getElementById('platt-a').addEventListener('input', function() {
        document.getElementById('platt-a-val').textContent = this.value;
    });
    document.getElementById('platt-b').addEventListener('input', function() {
        document.getElementById('platt-b-val').textContent = this.value;
    });
    document.getElementById('btn-apply-cal').addEventListener('click', function() {
        engine.state.calibrationApplied = {
            type: 'platt',
            a: parseFloat(document.getElementById('platt-a').value),
            b: parseFloat(document.getElementById('platt-b').value)
        };
    });
    document.getElementById('btn-auto-cal').addEventListener('click', function() {
        var params = engine.autoCalibratePlatt();
        document.getElementById('platt-a').value = params.a.toFixed(1);
        document.getElementById('platt-a-val').textContent = params.a.toFixed(1);
        document.getElementById('platt-b').value = params.b.toFixed(1);
        document.getElementById('platt-b-val').textContent = params.b.toFixed(1);
        engine.state.calibrationApplied = { type: 'platt', a: params.a, b: params.b };
    });

    // Temperature
    document.getElementById('temp-slider').addEventListener('input', function() {
        document.getElementById('temp-val').textContent = this.value;
    });
    document.getElementById('btn-apply-temp').addEventListener('click', function() {
        engine.state.calibrationApplied = {
            type: 'temperature',
            t: parseFloat(document.getElementById('temp-slider').value)
        };
    });
    document.getElementById('btn-optimize-temp').addEventListener('click', function() {
        var t = engine.optimizeTemperature();
        document.getElementById('temp-slider').value = t;
        document.getElementById('temp-val').textContent = t.toFixed(1);
        engine.state.calibrationApplied = { type: 'temperature', t: t };
    });

    // Isotonic
    document.getElementById('btn-fit-isotonic').addEventListener('click', function() {
        var map = engine.fitIsotonic();
        engine.state.calibrationApplied = { type: 'isotonic', map: map };
        resizeCanvas(isotonicCanvas);
        drawIsotonic(isotonicCanvas, map);
    });

    render();
})();

function escapeHtml(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ═══════════════════════════════════════════════════════════════
// EXPORTS (for testing)
// ═══════════════════════════════════════════════════════════════

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        createCalibrationEngine: createCalibrationEngine,
        PRESETS: PRESETS,
        TASK_TYPES: TASK_TYPES
    };
}
