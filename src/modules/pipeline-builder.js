

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

  function renderToolGrid() {
    var grid = section().querySelector('.pipeline-tool-grid');
    if (!grid) return;
    grid.innerHTML = '';
    INTEGRATIONS.forEach(function (tool) {
      var btn = document.createElement('button');
      btn.className = 'pipeline-tool-btn';
      btn.setAttribute('data-tool', tool.id);
      btn.setAttribute('aria-pressed', 'false');
      btn.setAttribute('role', 'switch');
      btn.setAttribute('aria-label', 'Add ' + tool.name + ' to pipeline');
      btn.setAttribute('title', tool.desc);
      btn.innerHTML = '<span class="pipeline-tool-icon">' + tool.icon +
        '</span><span class="pipeline-tool-name">' + tool.name + '</span>';
      btn.addEventListener('click', function () { toggleTool(tool.id); });
      grid.appendChild(btn);
    });
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

  function updatePipeline() {
    var viz = section().querySelector('.pipeline-visualization');
    var desc = section().querySelector('.pipeline-description');
    var counter = section().querySelector('.pipeline-counter');
    if (!viz || !desc) return;

    if (counter) counter.textContent = selected.length + ' / 5 tools selected';

    if (selected.length === 0) {
      viz.innerHTML = '<p class="pipeline-empty">Select tools above to build your agent pipeline</p>';
      desc.innerHTML = '';
      return;
    }

    // Build visual pipeline
    var html = '<div class="pipeline-flow">';
    for (var i = 0; i < selected.length; i++) {
      var tool = findTool(selected[i]);
      if (!tool) continue;
      html += '<div class="pipeline-node">';
      html += '<span class="pipeline-node-icon">' + tool.icon + '</span>';
      html += '<span class="pipeline-node-name">' + tool.name + '</span>';
      html += '</div>';
      if (i < selected.length - 1) {
        html += '<div class="pipeline-arrow" aria-hidden="true">→</div>';
      }
    }
    html += '</div>';

    // AgentBox hub in center
    html += '<div class="pipeline-hub">';
    html += '<span class="pipeline-hub-icon">🤖</span>';
    html += '<span class="pipeline-hub-label">AgentBox</span>';
    html += '<span class="pipeline-hub-sub">connects everything</span>';
    html += '</div>';

    viz.innerHTML = html;

    // Find matching pipelines
    var matches = findPipelines();
    if (matches.length === 0) {
      desc.innerHTML = '<div class="pipeline-result"><p class="pipeline-generic">AgentBox can connect these tools and automate workflows between them. Add more tools to see specific pipeline recipes!</p></div>';
    } else {
      var descHtml = '<div class="pipeline-results-list">';
      descHtml += '<h4 class="pipeline-results-title">🔗 ' + matches.length + ' automation' + (matches.length > 1 ? 's' : '') + ' available</h4>';
      for (var m = 0; m < matches.length; m++) {
        descHtml += '<div class="pipeline-result-card">';
        descHtml += '<strong class="pipeline-result-name">' + matches[m].name + '</strong>';
        descHtml += '<p class="pipeline-result-flow">' + matches[m].flow + '</p>';
        descHtml += '</div>';
      }
      descHtml += '</div>';
      desc.innerHTML = descHtml;
    }
  }

  function findTool(id) {
    for (var i = 0; i < INTEGRATIONS.length; i++) {
      if (INTEGRATIONS[i].id === id) return INTEGRATIONS[i];
    }
    return null;
  }

  function findPipelines() {
    var matches = [];
    var keys = Object.keys(PIPELINES);
    for (var k = 0; k < keys.length; k++) {
      var parts = keys[k].split('+');
      var allPresent = true;
      for (var p = 0; p < parts.length; p++) {
        if (selected.indexOf(parts[p]) < 0) { allPresent = false; break; }
      }
      if (allPresent) matches.push(PIPELINES[keys[k]]);
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
