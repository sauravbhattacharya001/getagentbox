/**
 * Capability Radar Chart — interactive radar/spider chart comparing
 * AgentBox capabilities across dimensions vs competitors.
 * Renders on a <canvas> with hover tooltips and animated drawing.
 */
var CapabilityRadar = (function () {
  'use strict';

  var DIMENSIONS = [
    { key: 'memory',       label: 'Memory',        icon: '🧠' },
    { key: 'search',       label: 'Web Search',     icon: '🔍' },
    { key: 'scheduling',   label: 'Scheduling',     icon: '⏰' },
    { key: 'vision',       label: 'Vision',         icon: '📷' },
    { key: 'voice',        label: 'Voice',          icon: '🎤' },
    { key: 'integrations', label: 'Integrations',   icon: '🔗' },
    { key: 'privacy',      label: 'Privacy',        icon: '🔒' },
    { key: 'personality',  label: 'Personality',    icon: '🎭' }
  ];

  var AGENTS = [
    {
      name: 'AgentBox',
      color: 'rgba(99, 102, 241, 1)',
      fill:  'rgba(99, 102, 241, 0.25)',
      scores: { memory: 95, search: 90, scheduling: 92, vision: 88, voice: 85, integrations: 80, privacy: 95, personality: 90 }
    },
    {
      name: 'ChatGPT',
      color: 'rgba(16, 163, 127, 1)',
      fill:  'rgba(16, 163, 127, 0.15)',
      scores: { memory: 40, search: 75, scheduling: 20, vision: 85, voice: 70, integrations: 50, privacy: 55, personality: 45 }
    },
    {
      name: 'Google Gemini',
      color: 'rgba(234, 67, 53, 1)',
      fill:  'rgba(234, 67, 53, 0.15)',
      scores: { memory: 30, search: 85, scheduling: 35, vision: 80, voice: 60, integrations: 60, privacy: 50, personality: 30 }
    },
    {
      name: 'Claude',
      color: 'rgba(204, 133, 63, 1)',
      fill:  'rgba(204, 133, 63, 0.15)',
      scores: { memory: 35, search: 30, scheduling: 10, vision: 75, voice: 20, integrations: 30, privacy: 70, personality: 60 }
    }
  ];

  var canvas, ctx, container, tooltip, legend, animProgress, animFrame;
  var activeAgents, hoveredDim;

  function init(rootId) {
    var root = typeof rootId === 'string' ? document.getElementById(rootId) : rootId;
    if (!root) return;

    root.innerHTML = '';

    // Legend with toggles
    legend = document.createElement('div');
    legend.className = 'radar-legend';
    legend.setAttribute('role', 'group');
    legend.setAttribute('aria-label', 'Toggle agents');

    activeAgents = {};
    AGENTS.forEach(function (agent) {
      activeAgents[agent.name] = true;
      var btn = document.createElement('button');
      btn.className = 'radar-legend-btn active';
      btn.setAttribute('aria-pressed', 'true');
      btn.style.borderColor = agent.color;
      btn.innerHTML = '<span class="radar-legend-dot" style="background:' + agent.color + '"></span>' + agent.name;
      btn.addEventListener('click', function () {
        activeAgents[agent.name] = !activeAgents[agent.name];
        btn.classList.toggle('active', activeAgents[agent.name]);
        btn.setAttribute('aria-pressed', String(activeAgents[agent.name]));
        draw(1);
      });
      legend.appendChild(btn);
    });
    root.appendChild(legend);

    // Canvas container
    container = document.createElement('div');
    container.className = 'radar-canvas-wrap';
    root.appendChild(container);

    canvas = document.createElement('canvas');
    canvas.setAttribute('role', 'img');
    canvas.setAttribute('aria-label', 'Capability radar chart comparing AgentBox with competitors');
    container.appendChild(canvas);

    // Tooltip
    tooltip = document.createElement('div');
    tooltip.className = 'radar-tooltip';
    tooltip.hidden = true;
    container.appendChild(tooltip);

    // Dimension detail
    var detail = document.createElement('div');
    detail.className = 'radar-detail';
    detail.id = 'radarDetail';
    detail.setAttribute('aria-live', 'polite');
    root.appendChild(detail);

    resize();
    animate();

    canvas.addEventListener('mousemove', onMouse);
    canvas.addEventListener('mouseleave', function () {
      hoveredDim = null;
      tooltip.hidden = true;
      draw(1);
    });
    canvas.addEventListener('click', onClick);
    window.addEventListener('resize', function () { resize(); draw(1); });
  }

  function resize() {
    var w = container.clientWidth;
    var size = Math.min(w, 500);
    var dpr = window.devicePixelRatio || 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    canvas.style.width = size + 'px';
    canvas.style.height = size + 'px';
    ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function animate() {
    animProgress = 0;
    var start = null;
    var duration = typeof prefersReducedMotion !== 'undefined' && prefersReducedMotion ? 0 : 800;

    function step(ts) {
      if (!start) start = ts;
      var elapsed = ts - start;
      animProgress = duration === 0 ? 1 : Math.min(elapsed / duration, 1);
      draw(animProgress);
      if (animProgress < 1) {
        animFrame = requestAnimationFrame(step);
      }
    }
    if (animFrame) cancelAnimationFrame(animFrame);
    animFrame = requestAnimationFrame(step);
  }

  function draw(progress) {
    var w = parseFloat(canvas.style.width);
    var h = parseFloat(canvas.style.height);
    var cx = w / 2;
    var cy = h / 2;
    var R = Math.min(cx, cy) * 0.75;
    var n = DIMENSIONS.length;

    ctx.clearRect(0, 0, w, h);

    // Grid rings
    var rings = [0.2, 0.4, 0.6, 0.8, 1.0];
    rings.forEach(function (r) {
      ctx.beginPath();
      for (var i = 0; i <= n; i++) {
        var angle = (Math.PI * 2 / n) * i - Math.PI / 2;
        var x = cx + Math.cos(angle) * R * r;
        var y = cy + Math.sin(angle) * R * r;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.strokeStyle = 'rgba(150,150,150,0.2)';
      ctx.lineWidth = 1;
      ctx.stroke();
    });

    // Axis lines + labels
    for (var i = 0; i < n; i++) {
      var angle = (Math.PI * 2 / n) * i - Math.PI / 2;
      var x = cx + Math.cos(angle) * R;
      var y = cy + Math.sin(angle) * R;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(x, y);
      ctx.strokeStyle = 'rgba(150,150,150,0.15)';
      ctx.stroke();

      // Label
      var lx = cx + Math.cos(angle) * (R + 22);
      var ly = cy + Math.sin(angle) * (R + 22);
      ctx.fillStyle = hoveredDim === i ? 'rgba(99,102,241,1)' : getComputedStyle(canvas).color || '#666';
      ctx.font = (hoveredDim === i ? 'bold ' : '') + '11px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(DIMENSIONS[i].icon + ' ' + DIMENSIONS[i].label, lx, ly);
    }

    // Data polygons
    AGENTS.forEach(function (agent) {
      if (!activeAgents[agent.name]) return;
      ctx.beginPath();
      for (var i = 0; i <= n; i++) {
        var idx = i % n;
        var angle = (Math.PI * 2 / n) * idx - Math.PI / 2;
        var val = (agent.scores[DIMENSIONS[idx].key] / 100) * progress;
        var x = cx + Math.cos(angle) * R * val;
        var y = cy + Math.sin(angle) * R * val;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.fillStyle = agent.fill;
      ctx.fill();
      ctx.strokeStyle = agent.color;
      ctx.lineWidth = 2;
      ctx.stroke();

      // Dots
      for (var i = 0; i < n; i++) {
        var angle = (Math.PI * 2 / n) * i - Math.PI / 2;
        var val = (agent.scores[DIMENSIONS[i].key] / 100) * progress;
        var x = cx + Math.cos(angle) * R * val;
        var y = cy + Math.sin(angle) * R * val;
        ctx.beginPath();
        ctx.arc(x, y, 3, 0, Math.PI * 2);
        ctx.fillStyle = agent.color;
        ctx.fill();
      }
    });
  }

  function getDimAt(mx, my) {
    var w = parseFloat(canvas.style.width);
    var h = parseFloat(canvas.style.height);
    var cx = w / 2;
    var cy = h / 2;
    var R = Math.min(cx, cy) * 0.75;
    var n = DIMENSIONS.length;

    for (var i = 0; i < n; i++) {
      var angle = (Math.PI * 2 / n) * i - Math.PI / 2;
      var lx = cx + Math.cos(angle) * (R + 22);
      var ly = cy + Math.sin(angle) * (R + 22);
      var dx = mx - lx;
      var dy = my - ly;
      if (Math.sqrt(dx * dx + dy * dy) < 30) return i;
    }
    return null;
  }

  function onMouse(e) {
    var rect = canvas.getBoundingClientRect();
    var mx = e.clientX - rect.left;
    var my = e.clientY - rect.top;
    var dim = getDimAt(mx, my);

    if (dim !== null && dim !== hoveredDim) {
      hoveredDim = dim;
      var d = DIMENSIONS[dim];
      var lines = ['<strong>' + d.icon + ' ' + d.label + '</strong>'];
      AGENTS.forEach(function (a) {
        if (activeAgents[a.name]) {
          lines.push('<span style="color:' + a.color + '">' + a.name + ': ' + a.scores[d.key] + '/100</span>');
        }
      });
      tooltip.innerHTML = lines.join('<br>');
      tooltip.hidden = false;
      tooltip.style.left = mx + 'px';
      tooltip.style.top = (my - 10) + 'px';
      draw(1);
    } else if (dim === null) {
      hoveredDim = null;
      tooltip.hidden = true;
      draw(1);
    }
  }

  function onClick(e) {
    var rect = canvas.getBoundingClientRect();
    var mx = e.clientX - rect.left;
    var my = e.clientY - rect.top;
    var dim = getDimAt(mx, my);
    var detail = document.getElementById('radarDetail');
    if (!detail) return;

    if (dim === null) { detail.innerHTML = ''; return; }

    var d = DIMENSIONS[dim];
    var html = '<h4>' + d.icon + ' ' + d.label + ' — Detailed Comparison</h4><div class="radar-bars">';
    AGENTS.slice().sort(function (a, b) { return b.scores[d.key] - a.scores[d.key]; }).forEach(function (a) {
      var score = a.scores[d.key];
      html += '<div class="radar-bar-row">' +
        '<span class="radar-bar-name" style="color:' + a.color + '">' + a.name + '</span>' +
        '<div class="radar-bar-track"><div class="radar-bar-fill" style="width:' + score + '%;background:' + a.color + '"></div></div>' +
        '<span class="radar-bar-val">' + score + '</span></div>';
    });
    html += '</div>';
    detail.innerHTML = html;
  }

  // Test helper
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { init: init, DIMENSIONS: DIMENSIONS, AGENTS: AGENTS };
  }
  if (typeof window !== 'undefined') { window.CapabilityRadar = { init: init, DIMENSIONS: DIMENSIONS, AGENTS: AGENTS }; }

  return { init: init, DIMENSIONS: DIMENSIONS, AGENTS: AGENTS };
})();
