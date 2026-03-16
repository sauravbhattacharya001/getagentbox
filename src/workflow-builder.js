// ---------------------------------------------------------------------------
// Workflow Builder - Visual workflow composer for AgentBox automations
// ---------------------------------------------------------------------------
// Users create multi-step workflows by adding action nodes (remind, search,
// summarize, schedule, analyze, etc.), connecting them in sequence, and
// exporting the result as AgentBox commands or a shareable JSON config.

var WorkflowBuilder = (function () {
  'use strict';

  // Available action types with metadata
  var ACTION_TYPES = [
    { id: 'trigger', label: 'Trigger', icon: '⚡', color: '#fbbf24', description: 'Start the workflow (time, keyword, or event)', fields: [
      { name: 'type', label: 'Trigger Type', type: 'select', options: ['Schedule (cron)', 'Keyword match', 'New email', 'Calendar event', 'Manual'] },
      { name: 'value', label: 'Value', type: 'text', placeholder: 'e.g. every Monday 9am' }
    ]},
    { id: 'search', label: 'Web Search', icon: '🔍', color: '#00d4ff', description: 'Search the web for information', fields: [
      { name: 'query', label: 'Search Query', type: 'text', placeholder: 'e.g. latest AI news' },
      { name: 'count', label: 'Results', type: 'select', options: ['3', '5', '10'] }
    ]},
    { id: 'summarize', label: 'Summarize', icon: '📝', color: '#7b2cbf', description: 'Summarize text or search results', fields: [
      { name: 'style', label: 'Style', type: 'select', options: ['Brief (1-2 lines)', 'Detailed', 'Bullet points', 'Executive summary'] },
      { name: 'maxLength', label: 'Max Length', type: 'select', options: ['50 words', '100 words', '200 words'] }
    ]},
    { id: 'remind', label: 'Reminder', icon: '🔔', color: '#4ade80', description: 'Set a reminder or notification', fields: [
      { name: 'message', label: 'Message', type: 'text', placeholder: 'What to remind about' },
      { name: 'when', label: 'When', type: 'text', placeholder: 'e.g. in 30 minutes, tomorrow 9am' }
    ]},
    { id: 'analyze', label: 'Analyze', icon: '📊', color: '#ef4444', description: 'Analyze data or content', fields: [
      { name: 'type', label: 'Analysis Type', type: 'select', options: ['Sentiment', 'Key themes', 'Comparison', 'Trend detection'] },
      { name: 'input', label: 'Input Source', type: 'select', options: ['Previous step output', 'Paste text', 'URL'] }
    ]},
    { id: 'compose', label: 'Compose', icon: '✍️', color: '#a78bfa', description: 'Draft a message, email, or post', fields: [
      { name: 'format', label: 'Format', type: 'select', options: ['Email', 'Social post', 'Slack message', 'Report'] },
      { name: 'tone', label: 'Tone', type: 'select', options: ['Professional', 'Casual', 'Formal', 'Friendly'] }
    ]},
    { id: 'condition', label: 'Condition', icon: '🔀', color: '#f472b6', description: 'Branch based on a condition', fields: [
      { name: 'check', label: 'If', type: 'text', placeholder: 'e.g. results contain "urgent"' },
      { name: 'otherwise', label: 'Otherwise', type: 'select', options: ['Skip next step', 'Stop workflow', 'Go to step...'] }
    ]},
    { id: 'save', label: 'Save/Export', icon: '💾', color: '#22d3ee', description: 'Save output to notes or export', fields: [
      { name: 'destination', label: 'Save To', type: 'select', options: ['Notes', 'File', 'Clipboard', 'Send to chat'] },
      { name: 'format', label: 'Format', type: 'select', options: ['Plain text', 'Markdown', 'JSON', 'CSV'] }
    ]}
  ];

  // Preset workflow templates
  var PRESETS = [
    {
      name: 'Morning Briefing',
      icon: '☀️',
      description: 'Daily news summary + calendar + weather',
      steps: [
        { actionId: 'trigger', config: { type: 'Schedule (cron)', value: 'every day 8am' } },
        { actionId: 'search', config: { query: 'top news today', count: '5' } },
        { actionId: 'summarize', config: { style: 'Bullet points', maxLength: '200 words' } },
        { actionId: 'compose', config: { format: 'Slack message', tone: 'Casual' } },
        { actionId: 'save', config: { destination: 'Send to chat', format: 'Markdown' } }
      ]
    },
    {
      name: 'Research Pipeline',
      icon: '🔬',
      description: 'Search → analyze → summarize → save',
      steps: [
        { actionId: 'trigger', config: { type: 'Manual', value: '' } },
        { actionId: 'search', config: { query: '', count: '10' } },
        { actionId: 'analyze', config: { type: 'Key themes', input: 'Previous step output' } },
        { actionId: 'summarize', config: { style: 'Executive summary', maxLength: '200 words' } },
        { actionId: 'save', config: { destination: 'Notes', format: 'Markdown' } }
      ]
    },
    {
      name: 'Content Monitor',
      icon: '👁️',
      description: 'Watch for topics and alert when found',
      steps: [
        { actionId: 'trigger', config: { type: 'Schedule (cron)', value: 'every 2 hours' } },
        { actionId: 'search', config: { query: '', count: '5' } },
        { actionId: 'condition', config: { check: 'new results found', otherwise: 'Stop workflow' } },
        { actionId: 'summarize', config: { style: 'Brief (1-2 lines)', maxLength: '50 words' } },
        { actionId: 'remind', config: { message: 'New content detected!', when: 'now' } }
      ]
    },
    {
      name: 'Weekly Report',
      icon: '📋',
      description: 'Compile and format weekly metrics',
      steps: [
        { actionId: 'trigger', config: { type: 'Schedule (cron)', value: 'every Friday 5pm' } },
        { actionId: 'analyze', config: { type: 'Trend detection', input: 'Previous step output' } },
        { actionId: 'summarize', config: { style: 'Executive summary', maxLength: '200 words' } },
        { actionId: 'compose', config: { format: 'Email', tone: 'Professional' } },
        { actionId: 'save', config: { destination: 'Send to chat', format: 'Markdown' } }
      ]
    }
  ];

  // ── State ──
  var steps = [];
  var selectedStep = -1;
  var dragIndex = -1;

  // ── Helpers ──
  function getActionType(id) {
    for (var i = 0; i < ACTION_TYPES.length; i++) {
      if (ACTION_TYPES[i].id === id) return ACTION_TYPES[i];
    }
    return null;
  }

  function generateId() {
    return 'step_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
  }

  // ── Core Logic ──
  function addStep(actionId, config) {
    var action = getActionType(actionId);
    if (!action) return null;
    var step = {
      id: generateId(),
      actionId: actionId,
      config: config || {}
    };
    steps.push(step);
    selectedStep = steps.length - 1;
    render();
    return step;
  }

  function removeStep(index) {
    if (index < 0 || index >= steps.length) return;
    steps.splice(index, 1);
    if (selectedStep >= steps.length) selectedStep = steps.length - 1;
    render();
  }

  function moveStep(fromIndex, toIndex) {
    if (fromIndex < 0 || fromIndex >= steps.length) return;
    if (toIndex < 0 || toIndex >= steps.length) return;
    var item = steps.splice(fromIndex, 1)[0];
    steps.splice(toIndex, 0, item);
    selectedStep = toIndex;
    render();
  }

  function updateStepConfig(index, field, value) {
    if (index < 0 || index >= steps.length) return;
    steps[index].config[field] = value;
  }

  function loadPreset(presetIndex) {
    var preset = PRESETS[presetIndex];
    if (!preset) return;
    steps = [];
    for (var i = 0; i < preset.steps.length; i++) {
      var s = preset.steps[i];
      steps.push({
        id: generateId(),
        actionId: s.actionId,
        config: Object.assign({}, s.config)
      });
    }
    selectedStep = 0;
    render();
  }

  function clearWorkflow() {
    steps = [];
    selectedStep = -1;
    render();
  }

  // ── Export ──
  function exportAsCommands() {
    if (steps.length === 0) return '# No steps in workflow';
    var lines = ['# AgentBox Workflow', '# Generated by Workflow Builder', ''];
    for (var i = 0; i < steps.length; i++) {
      var s = steps[i];
      var action = getActionType(s.actionId);
      lines.push('## Step ' + (i + 1) + ': ' + action.label);
      var keys = Object.keys(s.config);
      for (var k = 0; k < keys.length; k++) {
        if (s.config[keys[k]]) {
          lines.push('  ' + keys[k] + ': ' + s.config[keys[k]]);
        }
      }
      lines.push('');
    }
    // Produce a Telegram-style command string
    lines.push('---');
    lines.push('# Quick command (paste to AgentBox):');
    var cmd = steps.map(function (s) {
      var a = getActionType(s.actionId);
      var parts = [a.label.toLowerCase()];
      var keys = Object.keys(s.config);
      for (var k = 0; k < keys.length; k++) {
        if (s.config[keys[k]]) parts.push(s.config[keys[k]]);
      }
      return parts.join(' ');
    }).join(' → ');
    lines.push(cmd);
    return lines.join('\n');
  }

  function exportAsJSON() {
    return JSON.stringify({
      name: 'My Workflow',
      created: new Date().toISOString(),
      steps: steps.map(function (s) {
        return { action: s.actionId, config: s.config };
      })
    }, null, 2);
  }

  function importFromJSON(jsonStr) {
    try {
      var data = JSON.parse(jsonStr);
      if (!data.steps || !Array.isArray(data.steps)) return false;
      steps = [];
      for (var i = 0; i < data.steps.length; i++) {
        var s = data.steps[i];
        if (getActionType(s.action)) {
          steps.push({ id: generateId(), actionId: s.action, config: s.config || {} });
        }
      }
      selectedStep = steps.length > 0 ? 0 : -1;
      render();
      return true;
    } catch (e) {
      return false;
    }
  }

  // ── Render ──
  function render() {
    var container = document.getElementById('workflowBuilderRoot');
    if (!container) return;

    var html = '';

    // Presets bar
    html += '<div class="wb-presets">';
    html += '<span class="wb-presets-label">Templates:</span>';
    for (var p = 0; p < PRESETS.length; p++) {
      html += '<button class="wb-preset-btn" data-preset="' + p + '" title="' + PRESETS[p].description + '">' + PRESETS[p].icon + ' ' + PRESETS[p].name + '</button>';
    }
    html += '</div>';

    // Main layout: palette + canvas + config
    html += '<div class="wb-layout">';

    // Action palette
    html += '<div class="wb-palette">';
    html += '<h4 class="wb-palette-title">Actions</h4>';
    for (var a = 0; a < ACTION_TYPES.length; a++) {
      var at = ACTION_TYPES[a];
      html += '<button class="wb-action-btn" data-action="' + at.id + '" style="--action-color:' + at.color + '" title="' + at.description + '">';
      html += '<span class="wb-action-icon">' + at.icon + '</span>';
      html += '<span class="wb-action-label">' + at.label + '</span>';
      html += '</button>';
    }
    html += '</div>';

    // Canvas (flow diagram)
    html += '<div class="wb-canvas">';
    if (steps.length === 0) {
      html += '<div class="wb-empty">';
      html += '<div class="wb-empty-icon">🔧</div>';
      html += '<div class="wb-empty-text">Click an action or pick a template to start building</div>';
      html += '</div>';
    } else {
      html += '<div class="wb-flow">';
      for (var i = 0; i < steps.length; i++) {
        var step = steps[i];
        var action = getActionType(step.actionId);
        var isSelected = i === selectedStep;
        html += '<div class="wb-node' + (isSelected ? ' wb-node-selected' : '') + '" data-index="' + i + '" draggable="true" style="--node-color:' + action.color + '">';
        html += '<div class="wb-node-header">';
        html += '<span class="wb-node-num">' + (i + 1) + '</span>';
        html += '<span class="wb-node-icon">' + action.icon + '</span>';
        html += '<span class="wb-node-label">' + action.label + '</span>';
        html += '<button class="wb-node-remove" data-remove="' + i + '" title="Remove step">✕</button>';
        html += '</div>';
        // Show config summary
        var configSummary = [];
        var keys = Object.keys(step.config);
        for (var k = 0; k < keys.length; k++) {
          if (step.config[keys[k]]) {
            var val = step.config[keys[k]];
            if (val.length > 30) val = val.substring(0, 27) + '...';
            configSummary.push(val);
          }
        }
        if (configSummary.length > 0) {
          html += '<div class="wb-node-summary">' + configSummary.join(' · ') + '</div>';
        }
        html += '</div>';
        if (i < steps.length - 1) {
          html += '<div class="wb-connector"><svg width="24" height="32" viewBox="0 0 24 32"><path d="M12 0 L12 24 L6 18 M12 24 L18 18" stroke="var(--color-text-muted)" stroke-width="2" fill="none"/></svg></div>';
        }
      }
      html += '</div>';
    }
    html += '</div>';

    // Config panel
    html += '<div class="wb-config">';
    if (selectedStep >= 0 && selectedStep < steps.length) {
      var selStep = steps[selectedStep];
      var selAction = getActionType(selStep.actionId);
      html += '<h4 class="wb-config-title">' + selAction.icon + ' ' + selAction.label + ' — Step ' + (selectedStep + 1) + '</h4>';
      html += '<p class="wb-config-desc">' + selAction.description + '</p>';
      for (var f = 0; f < selAction.fields.length; f++) {
        var field = selAction.fields[f];
        var val = selStep.config[field.name] || '';
        html += '<label class="wb-field-label">' + field.label + '</label>';
        if (field.type === 'select') {
          html += '<select class="wb-field-input" data-field="' + field.name + '">';
          for (var o = 0; o < field.options.length; o++) {
            html += '<option' + (val === field.options[o] ? ' selected' : '') + '>' + field.options[o] + '</option>';
          }
          html += '</select>';
        } else {
          html += '<input type="text" class="wb-field-input" data-field="' + field.name + '" value="' + val.replace(/"/g, '&quot;') + '" placeholder="' + (field.placeholder || '') + '">';
        }
      }
      // Move buttons
      html += '<div class="wb-move-btns">';
      html += '<button class="wb-move-btn" data-move="up"' + (selectedStep === 0 ? ' disabled' : '') + '>↑ Move Up</button>';
      html += '<button class="wb-move-btn" data-move="down"' + (selectedStep === steps.length - 1 ? ' disabled' : '') + '>↓ Move Down</button>';
      html += '</div>';
    } else {
      html += '<div class="wb-config-empty">Select a step to configure</div>';
    }
    html += '</div>';

    html += '</div>'; // end wb-layout

    // Toolbar
    html += '<div class="wb-toolbar">';
    html += '<span class="wb-step-count">' + steps.length + ' step' + (steps.length !== 1 ? 's' : '') + '</span>';
    html += '<button class="wb-toolbar-btn wb-export-cmd" ' + (steps.length === 0 ? 'disabled' : '') + '>📋 Export Commands</button>';
    html += '<button class="wb-toolbar-btn wb-export-json" ' + (steps.length === 0 ? 'disabled' : '') + '>💾 Export JSON</button>';
    html += '<button class="wb-toolbar-btn wb-import-json">📂 Import JSON</button>';
    html += '<button class="wb-toolbar-btn wb-clear" ' + (steps.length === 0 ? 'disabled' : '') + '>🗑️ Clear</button>';
    html += '</div>';

    // Hidden import area
    html += '<textarea class="wb-import-area" id="wbImportArea" style="display:none" placeholder="Paste workflow JSON here..."></textarea>';

    container.innerHTML = html;
    bindEvents(container);
  }

  function bindEvents(container) {
    // Preset buttons
    var presetBtns = container.querySelectorAll('.wb-preset-btn');
    for (var i = 0; i < presetBtns.length; i++) {
      presetBtns[i].addEventListener('click', function () {
        loadPreset(parseInt(this.getAttribute('data-preset'), 10));
      });
    }

    // Action buttons
    var actionBtns = container.querySelectorAll('.wb-action-btn');
    for (var i = 0; i < actionBtns.length; i++) {
      actionBtns[i].addEventListener('click', function () {
        addStep(this.getAttribute('data-action'));
      });
    }

    // Node selection
    var nodes = container.querySelectorAll('.wb-node');
    for (var i = 0; i < nodes.length; i++) {
      (function (node) {
        node.addEventListener('click', function (e) {
          if (e.target.classList.contains('wb-node-remove')) return;
          selectedStep = parseInt(node.getAttribute('data-index'), 10);
          render();
        });
        // Drag and drop
        node.addEventListener('dragstart', function (e) {
          dragIndex = parseInt(node.getAttribute('data-index'), 10);
          e.dataTransfer.effectAllowed = 'move';
          node.classList.add('wb-dragging');
        });
        node.addEventListener('dragend', function () {
          dragIndex = -1;
          node.classList.remove('wb-dragging');
        });
        node.addEventListener('dragover', function (e) {
          e.preventDefault();
          e.dataTransfer.dropEffect = 'move';
        });
        node.addEventListener('drop', function (e) {
          e.preventDefault();
          var toIndex = parseInt(node.getAttribute('data-index'), 10);
          if (dragIndex >= 0 && dragIndex !== toIndex) {
            moveStep(dragIndex, toIndex);
          }
        });
      })(nodes[i]);
    }

    // Remove buttons
    var removeBtns = container.querySelectorAll('.wb-node-remove');
    for (var i = 0; i < removeBtns.length; i++) {
      removeBtns[i].addEventListener('click', function (e) {
        e.stopPropagation();
        removeStep(parseInt(this.getAttribute('data-remove'), 10));
      });
    }

    // Config fields
    var fields = container.querySelectorAll('.wb-field-input');
    for (var i = 0; i < fields.length; i++) {
      (function (field) {
        var eventType = field.tagName === 'SELECT' ? 'change' : 'input';
        field.addEventListener(eventType, function () {
          updateStepConfig(selectedStep, field.getAttribute('data-field'), field.value);
          // Update summary without full re-render
          var node = container.querySelector('.wb-node[data-index="' + selectedStep + '"]');
          if (node) {
            var summaryEl = node.querySelector('.wb-node-summary');
            var s = steps[selectedStep];
            var parts = [];
            var keys = Object.keys(s.config);
            for (var k = 0; k < keys.length; k++) {
              if (s.config[keys[k]]) {
                var v = s.config[keys[k]];
                if (v.length > 30) v = v.substring(0, 27) + '...';
                parts.push(v);
              }
            }
            if (summaryEl) {
              summaryEl.textContent = parts.join(' · ');
            } else if (parts.length > 0) {
              render(); // Need full re-render to add summary div
            }
          }
        });
      })(fields[i]);
    }

    // Move buttons
    var moveBtns = container.querySelectorAll('.wb-move-btn');
    for (var i = 0; i < moveBtns.length; i++) {
      moveBtns[i].addEventListener('click', function () {
        var dir = this.getAttribute('data-move');
        if (dir === 'up') moveStep(selectedStep, selectedStep - 1);
        else moveStep(selectedStep, selectedStep + 1);
      });
    }

    // Export commands
    var exportCmd = container.querySelector('.wb-export-cmd');
    if (exportCmd) exportCmd.addEventListener('click', function () {
      var text = exportAsCommands();
      copyToClipboard(text);
      this.textContent = '✅ Copied!';
      var btn = this;
      setTimeout(function () { btn.textContent = '📋 Export Commands'; }, 2000);
    });

    // Export JSON
    var exportJson = container.querySelector('.wb-export-json');
    if (exportJson) exportJson.addEventListener('click', function () {
      var text = exportAsJSON();
      copyToClipboard(text);
      this.textContent = '✅ Copied!';
      var btn = this;
      setTimeout(function () { btn.textContent = '💾 Export JSON'; }, 2000);
    });

    // Import JSON
    var importBtn = container.querySelector('.wb-import-json');
    var importArea = container.querySelector('#wbImportArea');
    if (importBtn && importArea) {
      importBtn.addEventListener('click', function () {
        if (importArea.style.display === 'none') {
          importArea.style.display = 'block';
          importArea.focus();
        } else {
          var ok = importFromJSON(importArea.value);
          if (!ok) {
            importArea.style.borderColor = 'var(--color-danger)';
            setTimeout(function () { importArea.style.borderColor = ''; }, 1500);
          }
          importArea.style.display = 'none';
          importArea.value = '';
        }
      });
    }

    // Clear
    var clearBtn = container.querySelector('.wb-clear');
    if (clearBtn) clearBtn.addEventListener('click', clearWorkflow);
  }

  function copyToClipboard(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text);
    } else {
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
  }

  // ── Init ──
  function init(rootId) {
    var root = document.getElementById(rootId || 'workflowBuilderRoot');
    if (!root) return;
    render();
  }

  // ── Public API ──
  return {
    init: init,
    addStep: addStep,
    removeStep: removeStep,
    moveStep: moveStep,
    clearWorkflow: clearWorkflow,
    loadPreset: loadPreset,
    exportAsCommands: exportAsCommands,
    exportAsJSON: exportAsJSON,
    importFromJSON: importFromJSON,
    getSteps: function () { return steps.slice(); },
    ACTION_TYPES: ACTION_TYPES,
    PRESETS: PRESETS
  };
})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = WorkflowBuilder;
}
