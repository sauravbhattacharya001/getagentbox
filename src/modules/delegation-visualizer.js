// ── Agent Delegation Visualizer ──────────────────────────────────
var DelegationVisualizer = (function () {
  'use strict';

  /* ── Preset task trees ── */
  var TASKS = {
    "Research competitor landscape and write a strategy report": {
      agent: "Orchestrator", icon: "\u{1F9E0}",
      subtasks: [
        {
          agent: "Research Agent", icon: "\u{1F50D}", task: "Find top 5 competitors", duration: 1200,
          result: "Found: Acme AI, BotCorp, AgentHub, SmartBot, NexusAI",
          subtasks: [
            { agent: "Web Scraper", icon: "\u{1F577}\uFE0F", task: "Scrape competitor websites", duration: 800, result: "Extracted pricing, features, team size for all 5", subtasks: [] },
            { agent: "Social Analyst", icon: "\u{1F4CA}", task: "Analyze social media presence", duration: 600, result: "Engagement: avg 2.3K followers, 4.1% rate", subtasks: [] }
          ]
        },
        {
          agent: "Analysis Agent", icon: "\u{1F4C8}", task: "SWOT analysis", duration: 1000,
          result: "Strengths: pricing, UX. Weaknesses: limited integrations", subtasks: []
        },
        {
          agent: "Writer Agent", icon: "\u270D\uFE0F", task: "Draft strategy report", duration: 1500,
          result: "12-page report with executive summary and recommendations",
          subtasks: [
            { agent: "Chart Generator", icon: "\u{1F4CA}", task: "Create comparison charts", duration: 700, result: "4 charts: pricing, features, market share, growth", subtasks: [] }
          ]
        }
      ]
    },
    "Plan and launch a Product Hunt campaign": {
      agent: "Orchestrator", icon: "\u{1F9E0}",
      subtasks: [
        {
          agent: "Research Agent", icon: "\u{1F50D}", task: "Analyze top Product Hunt launches", duration: 1000,
          result: "Studied 20 top launches, identified 7 success patterns",
          subtasks: [
            { agent: "Data Miner", icon: "\u26CF\uFE0F", task: "Scrape launch metrics", duration: 600, result: "Avg 500 upvotes, best day: Tuesday, peak hour: 12:01 AM PT", subtasks: [] }
          ]
        },
        {
          agent: "Content Agent", icon: "\u{1F4DD}", task: "Create launch assets", duration: 1400,
          result: "Tagline, description, 5 screenshots, maker comment draft",
          subtasks: [
            { agent: "Copywriter", icon: "\u270F\uFE0F", task: "Write tagline and description", duration: 700, result: "Tagline: 'Your AI agent that actually remembers you'", subtasks: [] },
            { agent: "Designer", icon: "\u{1F3A8}", task: "Design thumbnail and gallery", duration: 900, result: "5 polished screenshots with annotations", subtasks: [] }
          ]
        },
        {
          agent: "Outreach Agent", icon: "\u{1F4E3}", task: "Build supporter list", duration: 800,
          result: "142 supporters notified, 38 confirmed day-one upvotes", subtasks: []
        },
        {
          agent: "Scheduler Agent", icon: "\u{1F4C5}", task: "Plan launch timeline", duration: 600,
          result: "T-7 to T+3 day schedule with hourly tasks on launch day", subtasks: []
        }
      ]
    },
    "Audit codebase security and fix critical vulnerabilities": {
      agent: "Orchestrator", icon: "\u{1F9E0}",
      subtasks: [
        {
          agent: "Scanner Agent", icon: "\u{1F6E1}\uFE0F", task: "Run dependency audit", duration: 900,
          result: "Found 12 vulnerabilities: 3 critical, 4 high, 5 medium",
          subtasks: [
            { agent: "CVE Checker", icon: "\u{1F50E}", task: "Cross-reference CVE database", duration: 500, result: "3 critical: CVE-2024-1234, CVE-2024-5678, CVE-2024-9012", subtasks: [] }
          ]
        },
        {
          agent: "Code Reviewer", icon: "\u{1F9D0}", task: "Static analysis scan", duration: 1100,
          result: "Found 8 SQL injection risks, 3 XSS vectors, 2 auth bypasses",
          subtasks: []
        },
        {
          agent: "Fix Agent", icon: "\u{1F527}", task: "Patch critical vulnerabilities", duration: 1600,
          result: "Patched all 3 critical CVEs, upgraded 4 dependencies",
          subtasks: [
            { agent: "Test Runner", icon: "\u{1F9EA}", task: "Verify fixes pass tests", duration: 800, result: "247/247 tests passing, no regressions", subtasks: [] },
            { agent: "PR Drafter", icon: "\u{1F4CB}", task: "Create fix pull request", duration: 400, result: "PR #142 ready with detailed changelog", subtasks: [] }
          ]
        }
      ]
    },
    "Organize a team offsite for 20 people": {
      agent: "Orchestrator", icon: "\u{1F9E0}",
      subtasks: [
        {
          agent: "Venue Scout", icon: "\u{1F3D5}\uFE0F", task: "Find and book venue", duration: 1300,
          result: "Booked Mountain Lodge, capacity 25, available Oct 15-17",
          subtasks: [
            { agent: "Budget Checker", icon: "\u{1F4B0}", task: "Compare venue costs", duration: 600, result: "3 options: $4K, $6.5K, $8K — recommended mid-tier", subtasks: [] }
          ]
        },
        {
          agent: "Logistics Agent", icon: "\u{1F69C}", task: "Arrange travel and lodging", duration: 1000,
          result: "20 flight bookings, 10 shared rooms, airport shuttle confirmed",
          subtasks: []
        },
        {
          agent: "Activity Planner", icon: "\u{1F3AF}", task: "Design team activities", duration: 900,
          result: "Day 1: icebreakers + hiking. Day 2: workshops. Day 3: retro",
          subtasks: [
            { agent: "Catering Agent", icon: "\u{1F37D}\uFE0F", task: "Plan meals for dietary needs", duration: 500, result: "3 days of meals, 4 dietary accommodations covered", subtasks: [] }
          ]
        },
        {
          agent: "Comms Agent", icon: "\u{1F4E8}", task: "Send invitations and info pack", duration: 600,
          result: "All 20 attendees confirmed, info packets sent with itinerary", subtasks: []
        }
      ]
    },
    "Build and deploy a landing page from a sketch": {
      agent: "Orchestrator", icon: "\u{1F9E0}",
      subtasks: [
        {
          agent: "Design Agent", icon: "\u{1F3A8}", task: "Convert sketch to design system", duration: 1100,
          result: "Color palette, typography, spacing tokens, component library",
          subtasks: [
            { agent: "Asset Generator", icon: "\u{1F5BC}\uFE0F", task: "Create icons and illustrations", duration: 700, result: "12 custom icons, 3 hero illustrations, favicon", subtasks: [] }
          ]
        },
        {
          agent: "Frontend Agent", icon: "\u{1F4BB}", task: "Code responsive HTML/CSS/JS", duration: 1500,
          result: "Semantic HTML, mobile-first CSS, smooth animations",
          subtasks: [
            { agent: "Accessibility Agent", icon: "\u267F", task: "WCAG 2.1 AA compliance check", duration: 500, result: "All checks pass: contrast, landmarks, ARIA labels", subtasks: [] }
          ]
        },
        {
          agent: "Copy Agent", icon: "\u{1F4DD}", task: "Write page copy and meta tags", duration: 800,
          result: "Hero headline, 3 feature sections, CTA, SEO meta tags", subtasks: []
        },
        {
          agent: "DevOps Agent", icon: "\u{1F680}", task: "Deploy to production", duration: 700,
          result: "Live at https://example.com — SSL, CDN, 98 Lighthouse score",
          subtasks: [
            { agent: "Monitor Agent", icon: "\u{1F4E1}", task: "Set up uptime monitoring", duration: 400, result: "Uptime checks every 60s, Slack alerts configured", subtasks: [] }
          ]
        }
      ]
    }
  };

  var PRESET_LABELS = {
    "Research competitor landscape and write a strategy report": "\u{1F50D} Competitor Research",
    "Plan and launch a Product Hunt campaign": "\u{1F680} Product Hunt Launch",
    "Audit codebase security and fix critical vulnerabilities": "\u{1F6E1}\uFE0F Security Audit",
    "Organize a team offsite for 20 people": "\u{1F3D5}\uFE0F Team Offsite",
    "Build and deploy a landing page from a sketch": "\u{1F3A8} Landing Page"
  };

  var timers = [];
  var running = false;
  var logEntries = [];
  var startTime = 0;
  var totalAgents = 0;
  var maxDepth = 0;

  function schedule(fn, ms) {
    timers.push(setTimeout(fn, ms));
  }

  function clearTimers() {
    for (var i = 0; i < timers.length; i++) clearTimeout(timers[i]);
    timers = [];
  }

  function escapeHtml(str) {
    // Prefer the shared DOMUtil helper (uses the browser's text-node
    // encoder, so it handles every entity correctly). Fall back to a
    // manual escape only when running outside the bundle (e.g. unit
    // tests that load this file in isolation).
    if (typeof DOMUtil !== 'undefined' && typeof DOMUtil.escapeHtml === 'function') {
      return DOMUtil.escapeHtml(str);
    }
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function _getEls() {
    return {
      tree: document.getElementById('delegationTreeRoot'),
      log: document.getElementById('delegationLog'),
      summary: document.getElementById('delegationSummary'),
      workspace: document.getElementById('delegationWorkspace'),
      status: document.getElementById('delegationStatus'),
      taskLabel: document.getElementById('delegationTaskLabel')
    };
  }

  function addLog(text) {
    var elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    logEntries.push({ time: elapsed, text: text });
    var logEl = _getEls().log;
    if (!logEl) return;
    var entry = document.createElement('div');
    entry.className = 'delegation-log-entry';
    entry.textContent = '[' + elapsed + 's] ' + text;
    logEl.appendChild(entry);
    logEl.scrollTop = logEl.scrollHeight;
  }

  function countAgents(node) {
    var count = 1;
    if (node.subtasks) {
      for (var i = 0; i < node.subtasks.length; i++) {
        count += countAgents(node.subtasks[i]);
      }
    }
    return count;
  }

  function getDepth(node) {
    if (!node.subtasks || node.subtasks.length === 0) return 1;
    var max = 0;
    for (var i = 0; i < node.subtasks.length; i++) {
      var d = getDepth(node.subtasks[i]);
      if (d > max) max = d;
    }
    return 1 + max;
  }

  function buildNodeEl(node, depth) {
    var el = document.createElement('div');
    el.className = 'delegation-node depth-' + depth;
    el.setAttribute('role', 'treeitem');
    el.setAttribute('aria-label', node.agent + ': ' + (node.task || 'orchestrating'));

    el.innerHTML =
      '<div class="delegation-node-card" data-state="pending">' +
        '<span class="delegation-node-icon">' + node.icon + '</span>' +
        '<div class="delegation-node-info">' +
          '<strong class="delegation-node-agent">' + escapeHtml(node.agent) + '</strong>' +
          '<span class="delegation-node-task">' + escapeHtml(node.task || 'Orchestrating subtasks...') + '</span>' +
          '<span class="delegation-node-result" hidden></span>' +
          '<span class="delegation-node-state">waiting</span>' +
        '</div>' +
      '</div>';

    if (node.subtasks && node.subtasks.length > 0) {
      var children = document.createElement('div');
      children.className = 'delegation-children';
      children.setAttribute('role', 'group');
      for (var i = 0; i < node.subtasks.length; i++) {
        children.appendChild(buildNodeEl(node.subtasks[i], depth + 1));
      }
      el.appendChild(children);
    }

    return el;
  }

  function animateNode(nodeEl, nodeData, depth, onDone) {
    // Use children traversal instead of :scope for jsdom compat
    var card = null;
    for (var ci = 0; ci < nodeEl.children.length; ci++) {
      if (nodeEl.children[ci].classList.contains('delegation-node-card')) {
        card = nodeEl.children[ci]; break;
      }
    }
    if (!card) { if (onDone) onDone(); return; }
    var stateEl = card.querySelector('.delegation-node-state');
    var resultEl = card.querySelector('.delegation-node-result');

    // Activate
    card.setAttribute('data-state', 'active');
    stateEl.textContent = 'delegating...';
    nodeEl.classList.add('visible');

    if (depth > maxDepth) maxDepth = depth;
    totalAgents++;

    addLog(nodeData.icon + ' ' + nodeData.agent + ' started: ' + (nodeData.task || 'orchestrating subtasks'));

    // Find direct child delegation-children container, then its child nodes
    var childContainer = null;
    for (var cci = 0; cci < nodeEl.children.length; cci++) {
      if (nodeEl.children[cci].classList.contains('delegation-children')) {
        childContainer = nodeEl.children[cci]; break;
      }
    }
    var childEls = [];
    if (childContainer) {
      for (var ti = 0; ti < childContainer.children.length; ti++) {
        if (childContainer.children[ti].classList.contains('delegation-node')) childEls.push(childContainer.children[ti]);
      }
    }
    var childData = nodeData.subtasks || [];

    if (childData.length > 0) {
      // Delegate to children (parallel)
      schedule(function () {
        stateEl.textContent = 'delegating...';
        var done = 0;

        for (var i = 0; i < childData.length; i++) {
          (function (idx) {
            schedule(function () {
              if (!childEls[idx]) { done++; if (done === childData.length) finishNode(card, stateEl, resultEl, nodeData, onDone); return; }
              addLog(nodeData.icon + ' ' + nodeData.agent + ' delegated \u2192 ' + childData[idx].icon + ' ' + childData[idx].agent);
              animateNode(childEls[idx], childData[idx], depth + 1, function () {
                done++;
                if (done === childData.length) {
                  // All children done, complete this node
                  finishNode(card, stateEl, resultEl, nodeData, onDone);
                }
              });
            }, idx * 300);
          })(i);
        }
      }, 400);
    } else {
      // Leaf node — just work
      stateEl.textContent = 'working...';
      schedule(function () {
        finishNode(card, stateEl, resultEl, nodeData, onDone);
      }, nodeData.duration || 800);
    }
  }

  function finishNode(card, stateEl, resultEl, nodeData, onDone) {
    card.setAttribute('data-state', 'done');
    stateEl.textContent = '\u2705 done';
    if (nodeData.result) {
      resultEl.textContent = nodeData.result;
      resultEl.hidden = false;
    }
    addLog(nodeData.icon + ' ' + nodeData.agent + ' completed' + (nodeData.result ? ': ' + nodeData.result : ''));
    if (onDone) onDone();
  }

  function runTask(taskKey) {
    if (running) return;
    running = true;
    logEntries = [];
    totalAgents = 0;
    maxDepth = 0;
    startTime = Date.now();

    var task = TASKS[taskKey];
    if (!task) return;

    var els = _getEls();
    if (els.workspace) els.workspace.hidden = false;
    if (els.taskLabel) els.taskLabel.textContent = taskKey;
    if (els.status) {
      els.status.textContent = '\u{1F916} AgentBox is orchestrating...';
      els.status.className = 'delegation-status';
    }
    if (els.tree) els.tree.innerHTML = '';
    if (els.log) els.log.innerHTML = '';
    if (els.summary) { els.summary.hidden = true; els.summary.innerHTML = ''; }

    // Build root task tree node
    var rootData = { agent: task.agent, icon: task.icon, task: taskKey, subtasks: task.subtasks, result: null };
    var rootEl = buildNodeEl(rootData, 0);
    if (els.tree) els.tree.appendChild(rootEl);

    addLog('\u{1F9E0} Orchestrator received task: ' + taskKey);

    schedule(function () {
      animateNode(rootEl, rootData, 0, function () {
        showSummary(taskKey, els);
      });
    }, 300);
  }

  function showSummary(taskKey, els) {
    var elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    var sequentialEstimate = (parseFloat(elapsed) * 2.5).toFixed(0);

    if (els.status) {
      els.status.textContent = '\u2705 All agents finished!';
      els.status.className = 'delegation-status done';
    }
    if (els.summary) {
      els.summary.innerHTML =
        '<div class="delegation-summary-stats">' +
          '<div class="delegation-summary-stat">' +
            '<div class="value">' + totalAgents + '</div>' +
            '<div class="label">Agents Used</div>' +
          '</div>' +
          '<div class="delegation-summary-stat">' +
            '<div class="value">' + maxDepth + '</div>' +
            '<div class="label">Delegation Depth</div>' +
          '</div>' +
          '<div class="delegation-summary-stat">' +
            '<div class="value">~' + sequentialEstimate + 's</div>' +
            '<div class="label">Time Saved vs Manual</div>' +
          '</div>' +
          '<div class="delegation-summary-stat">' +
            '<div class="value">' + logEntries.length + '</div>' +
            '<div class="label">Actions Logged</div>' +
          '</div>' +
        '</div>' +
        '<div class="delegation-summary-insight">AgentBox coordinated ' + totalAgents + ' specialized agents across ' + maxDepth + ' delegation levels to complete this task autonomously.</div>';
      els.summary.hidden = false;
    }
    running = false;
  }

  function reset() {
    clearTimers();
    running = false;
    logEntries = [];
    totalAgents = 0;
    maxDepth = 0;

    var els = _getEls();
    if (els.workspace) els.workspace.hidden = true;
    if (els.tree) els.tree.innerHTML = '';
    if (els.log) els.log.innerHTML = '';
    if (els.summary) { els.summary.hidden = true; els.summary.innerHTML = ''; }
    if (els.status) {
      els.status.textContent = '\u{1F916} AgentBox is orchestrating...';
      els.status.className = 'delegation-status';
    }
    if (els.taskLabel) els.taskLabel.textContent = '';

    var btns = document.querySelectorAll('.delegation-preset-btn');
    for (var i = 0; i < btns.length; i++) {
      btns[i].setAttribute('aria-pressed', 'false');
    }
  }

  function init() {
    var presetBtns = document.querySelectorAll('.delegation-preset-btn');
    for (var i = 0; i < presetBtns.length; i++) {
      presetBtns[i].addEventListener('click', function () {
        if (running) return;
        var taskKey = this.getAttribute('data-task');
        var clickedBtn = this;
        reset();
        // Set pressed state AFTER reset (which clears all)
        var allBtns = document.querySelectorAll('.delegation-preset-btn');
        for (var j = 0; j < allBtns.length; j++) allBtns[j].setAttribute('aria-pressed', 'false');
        clickedBtn.setAttribute('aria-pressed', 'true');
        running = false; // reset sets this, but we need to allow runTask
        schedule(function () { runTask(taskKey); }, 50);
      });
    }

    var resetBtn = document.getElementById('delegationResetBtn');
    if (resetBtn) resetBtn.addEventListener('click', reset);
  }

  if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', init);
  }

  // Expose internals for testing
  return { init: init, reset: reset, run: runTask, _TASKS: TASKS, _PRESET_LABELS: PRESET_LABELS };
})();
