
/* ────────── Integration Pipeline Builder ────────── */
var PipelineBuilder = (function () {
  'use strict';

  var INTEGRATIONS = [
    { id: 'gmail',    name: 'Gmail',       icon: '📧', category: 'communication', desc: 'Read, draft, and send emails' },
    { id: 'slack',    name: 'Slack',       icon: '💬', category: 'communication', desc: 'Send messages and monitor channels' },
    { id: 'calendar', name: 'Calendar',    icon: '📅', category: 'productivity',  desc: 'Create events and check schedule' },
    { id: 'notion',   name: 'Notion',      icon: '📝', category: 'productivity',  desc: 'Update pages and databases' },
    { id: 'github',   name: 'GitHub',      icon: '🐙', category: 'developer',     desc: 'Manage issues, PRs, and repos' },
    { id: 'jira',     name: 'Jira',        icon: '🎫', category: 'developer',     desc: 'Track and update tickets' },
    { id: 'sheets',   name: 'Google Sheets',icon: '📊', category: 'data',         desc: 'Read and update spreadsheets' },
    { id: 'drive',    name: 'Google Drive', icon: '📁', category: 'data',         desc: 'Search and organize files' },
    { id: 'twitter',  name: 'Twitter/X',   icon: '🐦', category: 'social',       desc: 'Post tweets and monitor mentions' },
    { id: 'linear',   name: 'Linear',      icon: '🔷', category: 'developer',     desc: 'Create and track issues' },
    { id: 'discord',  name: 'Discord',     icon: '🎮', category: 'communication', desc: 'Send messages and manage servers' },
    { id: 'telegram', name: 'Telegram',    icon: '✈️', category: 'communication', desc: 'Chat and manage bot commands' }
  ];

  var PIPELINES = {
    'gmail+calendar':          { name: 'Email → Meeting', flow: 'AgentBox reads your emails, detects meeting requests, and creates calendar events automatically.' },
    'gmail+slack':             { name: 'Email → Notify', flow: 'AgentBox monitors your inbox and sends Slack alerts for important emails.' },
    'gmail+notion':            { name: 'Email → Notes', flow: 'AgentBox extracts action items from emails and creates Notion tasks.' },
    'github+slack':            { name: 'Code → Notify', flow: 'AgentBox watches your repos for new PRs and issues, then posts summaries to Slack.' },
    'github+jira':             { name: 'Code → Tickets', flow: 'AgentBox syncs GitHub issues with Jira tickets and updates statuses.' },
    'github+linear':           { name: 'Code → Track', flow: 'AgentBox creates Linear issues from GitHub activity and keeps them in sync.' },
    'calendar+slack':          { name: 'Schedule → Notify', flow: 'AgentBox sends Slack reminders before meetings and daily schedule summaries.' },
    'calendar+notion':         { name: 'Schedule → Plan', flow: 'AgentBox creates Notion daily pages with your calendar events and prep notes.' },
    'sheets+slack':            { name: 'Data → Alert', flow: 'AgentBox monitors spreadsheet changes and sends threshold alerts to Slack.' },
    'sheets+gmail':            { name: 'Data → Report', flow: 'AgentBox generates weekly email reports from your spreadsheet data.' },
    'drive+slack':             { name: 'Files → Share', flow: 'AgentBox watches Drive folders and notifies Slack when new files arrive.' },
    'twitter+slack':           { name: 'Social → Monitor', flow: 'AgentBox tracks mentions and keywords, sending real-time Slack digests.' },
    'twitter+notion':          { name: 'Social → Archive', flow: 'AgentBox archives important tweets and threads into your Notion database.' },
    'discord+github':          { name: 'Community → Code', flow: 'AgentBox creates GitHub issues from Discord bug reports and feature requests.' },
    'telegram+calendar':       { name: 'Chat → Schedule', flow: 'AgentBox lets you manage your calendar via natural language in Telegram.' },
    'jira+slack':              { name: 'Tickets → Updates', flow: 'AgentBox posts Jira status changes and sprint progress to Slack channels.' },
    'notion+slack':            { name: 'Docs → Sync', flow: 'AgentBox notifies your team on Slack when Notion docs are updated.' },
    'gmail+sheets':            { name: 'Email → Data', flow: 'AgentBox extracts data from incoming emails and logs it into spreadsheets.' }
  };

  // Pre-built O(1) tool lookup by id — avoids linear scan in findTool()
  var _toolById = {};
  for (var _i = 0; _i < INTEGRATIONS.length; _i++) {
    _toolById[INTEGRATIONS[_i].id] = INTEGRATIONS[_i];
  }

  // Pre-parsed pipeline entries with split keys — avoids re-splitting on
  // every updatePipeline() call and enables fast Set-based membership checks
  var _pipelineEntries = [];
  (function () {
    var keys = Object.keys(PIPELINES);
    for (var i = 0; i < keys.length; i++) {
      _pipelineEntries.push({
        parts: keys[i].split('+'),
        pipeline: PIPELINES[keys[i]]
      });
    }
  })();

  var selected = [];
  var _section = null;

  function section() {
    if (!_section) _section = document.getElementById('pipelineSection');
    return _section;
  }

  function init() {
    if (!section()) return;
    renderToolGrid();
    updatePipeline();
  }

  /** Create a tool button element for the grid. */
  function _createToolButton(tool) {
    var btn = document.createElement('button');
    btn.className = 'pipeline-tool-btn';
    btn.setAttribute('data-tool', tool.id);
    btn.setAttribute('aria-pressed', 'false');
    btn.setAttribute('role', 'switch');
    btn.setAttribute('aria-label', 'Add ' + tool.name + ' to pipeline');
    btn.setAttribute('title', tool.desc);

    var iconSpan = document.createElement('span');
    iconSpan.className = 'pipeline-tool-icon';
    iconSpan.textContent = tool.icon;

    var nameSpan = document.createElement('span');
    nameSpan.className = 'pipeline-tool-name';
    nameSpan.textContent = tool.name;

    btn.appendChild(iconSpan);
    btn.appendChild(nameSpan);
    btn.addEventListener('click', function () { toggleTool(tool.id); });
    return btn;
  }

  function renderToolGrid() {
    var grid = section().querySelector('.pipeline-tool-grid');
    if (!grid) return;
    while (grid.firstChild) grid.removeChild(grid.firstChild);
    for (var i = 0; i < INTEGRATIONS.length; i++) {
      grid.appendChild(_createToolButton(INTEGRATIONS[i]));
    }
  }

  function toggleTool(id) {
    var idx = selected.indexOf(id);
    if (idx >= 0) {
      selected.splice(idx, 1);
    } else {
      if (selected.length >= 5) return; // max 5 tools
      selected.push(id);
    }
    updateToolStates();
    updatePipeline();
  }

  function updateToolStates() {
    if (!section()) return;
    var btns = section().querySelectorAll('.pipeline-tool-btn');
    for (var i = 0; i < btns.length; i++) {
      var toolId = btns[i].getAttribute('data-tool');
      var isSelected = selected.indexOf(toolId) >= 0;
      btns[i].classList.toggle('selected', isSelected);
      btns[i].setAttribute('aria-pressed', isSelected ? 'true' : 'false');
    }
  }

  // ── DOM builders for pipeline visualization ──────────────────────

  /** Create a single pipeline node (icon + name). */
  function _createPipelineNode(tool) {
    var node = document.createElement('div');
    node.className = 'pipeline-node';

    var icon = document.createElement('span');
    icon.className = 'pipeline-node-icon';
    icon.textContent = tool.icon;

    var name = document.createElement('span');
    name.className = 'pipeline-node-name';
    name.textContent = tool.name;

    node.appendChild(icon);
    node.appendChild(name);
    return node;
  }

  /** Create an arrow separator between pipeline nodes. */
  function _createArrow() {
    var arrow = document.createElement('div');
    arrow.className = 'pipeline-arrow';
    arrow.setAttribute('aria-hidden', 'true');
    arrow.textContent = '→';
    return arrow;
  }

  /** Create the central AgentBox hub element. */
  function _createHub() {
    var hub = document.createElement('div');
    hub.className = 'pipeline-hub';

    var icon = document.createElement('span');
    icon.className = 'pipeline-hub-icon';
    icon.textContent = '🤖';

    var label = document.createElement('span');
    label.className = 'pipeline-hub-label';
    label.textContent = 'AgentBox';

    var sub = document.createElement('span');
    sub.className = 'pipeline-hub-sub';
    sub.textContent = 'connects everything';

    hub.appendChild(icon);
    hub.appendChild(label);
    hub.appendChild(sub);
    return hub;
  }

  /** Build the flow visualization (nodes + arrows + hub) for the current selection. */
  function _buildVisualization() {
    var frag = document.createDocumentFragment();
    var flow = document.createElement('div');
    flow.className = 'pipeline-flow';

    for (var i = 0; i < selected.length; i++) {
      var tool = _toolById[selected[i]];
      if (!tool) continue;
      flow.appendChild(_createPipelineNode(tool));
      if (i < selected.length - 1) {
        flow.appendChild(_createArrow());
      }
    }

    frag.appendChild(flow);
    frag.appendChild(_createHub());
    return frag;
  }

  /** Create a single pipeline result card (name + description). */
  function _createResultCard(pipeline) {
    var card = document.createElement('div');
    card.className = 'pipeline-result-card';

    var name = document.createElement('strong');
    name.className = 'pipeline-result-name';
    name.textContent = pipeline.name;

    var flowP = document.createElement('p');
    flowP.className = 'pipeline-result-flow';
    flowP.textContent = pipeline.flow;

    card.appendChild(name);
    card.appendChild(flowP);
    return card;
  }

  /** Build the description section showing matched pipelines or a generic message. */
  function _buildDescription(matches) {
    var wrapper = document.createElement('div');

    if (matches.length === 0) {
      wrapper.className = 'pipeline-result';
      var p = document.createElement('p');
      p.className = 'pipeline-generic';
      p.textContent = 'AgentBox can connect these tools and automate workflows between them. Add more tools to see specific pipeline recipes!';
      wrapper.appendChild(p);
    } else {
      wrapper.className = 'pipeline-results-list';

      var title = document.createElement('h4');
      title.className = 'pipeline-results-title';
      title.textContent = '🔗 ' + matches.length + ' automation' + (matches.length > 1 ? 's' : '') + ' available';
      wrapper.appendChild(title);

      for (var i = 0; i < matches.length; i++) {
        wrapper.appendChild(_createResultCard(matches[i]));
      }
    }

    return wrapper;
  }

  // ── Core update logic ────────────────────────────────────────────

  function updatePipeline() {
    var viz = section().querySelector('.pipeline-visualization');
    var desc = section().querySelector('.pipeline-description');
    var counter = section().querySelector('.pipeline-counter');
    if (!viz || !desc) return;

    if (counter) counter.textContent = selected.length + ' / 5 tools selected';

    // Clear previous content
    while (viz.firstChild) viz.removeChild(viz.firstChild);
    while (desc.firstChild) desc.removeChild(desc.firstChild);

    if (selected.length === 0) {
      var empty = document.createElement('p');
      empty.className = 'pipeline-empty';
      empty.textContent = 'Select tools above to build your agent pipeline';
      viz.appendChild(empty);
      return;
    }

    viz.appendChild(_buildVisualization());

    var matches = findPipelines();
    desc.appendChild(_buildDescription(matches));
  }

  function findTool(id) {
    return _toolById[id] || null;
  }

  function findPipelines() {
    // Build a Set of selected ids for O(1) membership checks
    var selectedSet = {};
    for (var s = 0; s < selected.length; s++) {
      selectedSet[selected[s]] = true;
    }

    var matches = [];
    for (var k = 0; k < _pipelineEntries.length; k++) {
      var parts = _pipelineEntries[k].parts;
      var allPresent = true;
      for (var p = 0; p < parts.length; p++) {
        if (!selectedSet[parts[p]]) { allPresent = false; break; }
      }
      if (allPresent) matches.push(_pipelineEntries[k].pipeline);
    }
    return matches;
  }

  function clearAll() {
    selected = [];
    updateToolStates();
    updatePipeline();
  }

  return {
    init: init,
    toggle: toggleTool,
    clear: clearAll,
    getSelected: function () { return selected.slice(); },
    getIntegrations: function () { return INTEGRATIONS.slice(); },
    getPipelines: function () { return Object.assign({}, PIPELINES); }
  };
})();
