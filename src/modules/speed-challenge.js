

// ── Speed Challenge ──────────────────────────────────────────────
var SpeedChallenge = (function () {
  'use strict';

  var ANSWERS = {
    "What's the capital of Bhutan?": "Thimphu is the capital of Bhutan.",
    "Convert 72°F to Celsius": "72°F = 22.2°C",
    "Who painted the Mona Lisa?": "Leonardo da Vinci painted the Mona Lisa (c. 1503–1519).",
    "How many ounces in a gallon?": "There are 128 fluid ounces in a US gallon.",
    "What year did the Berlin Wall fall?": "The Berlin Wall fell on November 9, 1989."
  };

  var TRADITIONAL_STEPS = [
    { text: "Open browser", duration: 800 },
    { text: "Navigate to search engine", duration: 1200 },
    { text: "Type query", duration: 1500 },
    { text: "Scan results", duration: 2000 },
    { text: "Click a result", duration: 1000 },
    { text: "Read the page", duration: 2500 },
    { text: "Find the answer", duration: 1500 }
  ];

  var AGENT_STEPS = [
    { text: "Send message", duration: 400 },
    { text: "Processing...", duration: 800 },
    { text: "Answer ready!", duration: 300 }
  ];

  var running = false;
  var timers = [];

  function init() {
    var btns = document.querySelectorAll('.speed-prompt-btn');
    var resetBtn = document.getElementById('speedResetBtn');
    if (!btns.length) return;

    btns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        if (running) return;
        btns.forEach(function (b) { b.setAttribute('aria-pressed', 'false'); });
        btn.setAttribute('aria-pressed', 'true');
        startRace(btn.getAttribute('data-prompt'));
      });
    });

    if (resetBtn) {
      resetBtn.addEventListener('click', function () { resetRace(); });
    }
  }

  function startRace(prompt) {
    running = true;
    var arena = document.getElementById('speedArena');
    var result = document.getElementById('speedResult');
    var resetBtn = document.getElementById('speedResetBtn');
    var stepsT = document.getElementById('speedStepsTraditional');
    var stepsA = document.getElementById('speedStepsAgent');
    var timerT = document.getElementById('speedTimerTraditional');
    var timerA = document.getElementById('speedTimerAgent');
    var answerT = document.getElementById('speedAnswerTraditional');
    var answerA = document.getElementById('speedAnswerAgent');

    if (!arena) return;
    arena.hidden = false;
    if (result) { result.hidden = true; result.textContent = ''; }
    if (resetBtn) resetBtn.hidden = true;
    stepsT.innerHTML = '';
    stepsA.innerHTML = '';
    timerT.textContent = '0.0s';
    timerA.textContent = '0.0s';
    answerT.textContent = '';
    answerA.textContent = '';

    var answer = ANSWERS[prompt] || 'Answer found!';

    // Build step elements
    TRADITIONAL_STEPS.forEach(function (s) {
      var el = document.createElement('div');
      el.className = 'speed-step';
      el.setAttribute('role', 'listitem');
      el.textContent = s.text;
      stepsT.appendChild(el);
    });

    AGENT_STEPS.forEach(function (s) {
      var el = document.createElement('div');
      el.className = 'speed-step';
      el.setAttribute('role', 'listitem');
      el.textContent = s.text;
      stepsA.appendChild(el);
    });

    // Animate traditional lane
    var tSteps = stepsT.querySelectorAll('.speed-step');
    var aSteps = stepsA.querySelectorAll('.speed-step');
    var tDelay = 0;
    var tTotal = 0;
    TRADITIONAL_STEPS.forEach(function (s) { tTotal += s.duration; });
    var aTotal = 0;
    AGENT_STEPS.forEach(function (s) { aTotal += s.duration; });

    // Start timer animations
    var tStart = Date.now();
    var tTimerInterval = setInterval(function () {
      var elapsed = (Date.now() - tStart) / 1000;
      timerT.textContent = elapsed.toFixed(1) + 's';
    }, 100);
    timers.push(tTimerInterval);

    var aTimerInterval = setInterval(function () {
      var elapsed = (Date.now() - tStart) / 1000;
      timerA.textContent = elapsed.toFixed(1) + 's';
    }, 100);
    timers.push(aTimerInterval);

    // Animate traditional steps
    TRADITIONAL_STEPS.forEach(function (step, i) {
      // Add 'active' at the START of this step's duration
      var tStart = setTimeout(function () {
        tSteps[i].classList.add('active');
        if (i > 0) {
          tSteps[i - 1].classList.remove('active');
          tSteps[i - 1].classList.add('done');
        }
      }, tDelay);
      timers.push(tStart);
      // Add 'done' at the END of this step's duration
      var tEnd = setTimeout(function () {
        tSteps[i].classList.remove('active');
        tSteps[i].classList.add('done');
      }, tDelay + step.duration);
      timers.push(tEnd);
      tDelay += step.duration;
    });

    // Traditional finish
    var tFinish = setTimeout(function () {
      clearInterval(tTimerInterval);
      timerT.textContent = (tTotal / 1000).toFixed(1) + 's';
      answerT.textContent = answer;
      answerT.classList.add('visible');
      checkDone();
    }, tTotal);
    timers.push(tFinish);

    // Animate agent steps
    var aDelay = 0;
    AGENT_STEPS.forEach(function (step, i) {
      // Add 'active' at the START of this step's duration
      var aStart = setTimeout(function () {
        aSteps[i].classList.add('active');
        if (i > 0) {
          aSteps[i - 1].classList.remove('active');
          aSteps[i - 1].classList.add('done');
        }
      }, aDelay);
      timers.push(aStart);
      // Add 'done' at the END of this step's duration
      var aEnd = setTimeout(function () {
        aSteps[i].classList.remove('active');
        aSteps[i].classList.add('done');
      }, aDelay + step.duration);
      timers.push(aEnd);
      aDelay += step.duration;
    });

    // Agent finish
    var aFinish = setTimeout(function () {
      clearInterval(aTimerInterval);
      timerA.textContent = (aTotal / 1000).toFixed(1) + 's';
      answerA.textContent = answer;
      answerA.classList.add('visible');
      document.getElementById('speedLaneAgent').classList.add('winner');
      checkDone();
    }, aTotal);
    timers.push(aFinish);

    var checked = 0;
    function checkDone() {
      checked++;
      if (checked < 2) return;
      var speedup = (tTotal / aTotal).toFixed(1);
      if (result) {
        result.textContent = '🏆 AgentBox answered ' + speedup + 'x faster!';
        result.hidden = false;
      }
      if (resetBtn) resetBtn.hidden = false;
      running = false;
    }
  }

  function resetRace() {
    timers.forEach(function (t) { clearTimeout(t); clearInterval(t); });
    timers = [];
    running = false;

    var arena = document.getElementById('speedArena');
    var result = document.getElementById('speedResult');
    var resetBtn = document.getElementById('speedResetBtn');
    if (arena) arena.hidden = true;
    if (result) result.hidden = true;
    if (resetBtn) resetBtn.hidden = true;

    var lane = document.getElementById('speedLaneAgent');
    if (lane) lane.classList.remove('winner');

    document.querySelectorAll('.speed-prompt-btn').forEach(function (b) {
      b.setAttribute('aria-pressed', 'false');
    });
  }

  if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', function () { init(); });
  }
  if (typeof window !== 'undefined') { window.SpeedChallenge = SpeedChallenge; }

  return {
    init: init,
    startRace: startRace,
    resetRace: resetRace,
    _ANSWERS: ANSWERS,
    _TRADITIONAL_STEPS: TRADITIONAL_STEPS,
    _AGENT_STEPS: AGENT_STEPS
  };
})();
