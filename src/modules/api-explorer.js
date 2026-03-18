
// ── API Explorer ────────────────────────────────────────────────────────────
var ApiExplorer = (function () {
  'use strict';

  const ENDPOINTS = [
    {
      method: 'POST', path: '/v1/chat/completions', category: 'chat',
      desc: 'Send a message and get an AI response',
      auth: 'Bearer token', rateLimit: '60 req/min',
      reqBody: JSON.stringify({ model: 'agentbox-1', messages: [{ role: 'user', content: 'What is the weather in Seattle?' }], max_tokens: 256, temperature: 0.7 }, null, 2),
      respBody: JSON.stringify({ id: 'chatcmpl-abc123', object: 'chat.completion', created: 1709769600, model: 'agentbox-1', choices: [{ index: 0, message: { role: 'assistant', content: 'Currently in Seattle it is 48\u00b0F (9\u00b0C) with overcast skies and light rain.' }, finish_reason: 'stop' }], usage: { prompt_tokens: 14, completion_tokens: 22, total_tokens: 36 } }, null, 2)
    },
    {
      method: 'POST', path: '/v1/chat/completions', category: 'chat',
      desc: 'Stream a response in real time',
      auth: 'Bearer token', rateLimit: '60 req/min',
      suffix: ' (streaming)',
      reqBody: JSON.stringify({ model: 'agentbox-1', messages: [{ role: 'user', content: 'Explain quantum computing in one paragraph.' }], stream: true }, null, 2),
      respBody: 'data: {"id":"chatcmpl-xyz","object":"chat.completion.chunk","choices":[{"delta":{"content":"Quantum"},"index":0}]}\n\ndata: {"id":"chatcmpl-xyz","object":"chat.completion.chunk","choices":[{"delta":{"content":" computing"},"index":0}]}\n\ndata: [DONE]'
    },
    {
      method: 'GET', path: '/v1/memory', category: 'memory',
      desc: 'Retrieve stored memories',
      auth: 'Bearer token', rateLimit: '30 req/min',
      respBody: JSON.stringify({ memories: [{ id: 'mem_01', content: 'User prefers dark mode', created_at: '2026-02-15T10:30:00Z', category: 'preference' }, { id: 'mem_02', content: 'Working on a React project called Dashboard Pro', created_at: '2026-02-20T14:00:00Z', category: 'context' }], total: 2, has_more: false }, null, 2)
    },
    {
      method: 'POST', path: '/v1/memory', category: 'memory',
      desc: 'Store a new memory',
      auth: 'Bearer token', rateLimit: '30 req/min',
      reqBody: JSON.stringify({ content: 'My preferred programming language is Python', category: 'preference', ttl: null }, null, 2),
      respBody: JSON.stringify({ id: 'mem_03', content: 'My preferred programming language is Python', category: 'preference', created_at: '2026-03-06T12:00:00Z' }, null, 2)
    },
    {
      method: 'DELETE', path: '/v1/memory/{id}', category: 'memory',
      desc: 'Delete a specific memory',
      auth: 'Bearer token', rateLimit: '30 req/min',
      respBody: JSON.stringify({ deleted: true, id: 'mem_03' }, null, 2)
    },
    {
      method: 'POST', path: '/v1/tools/execute', category: 'tools',
      desc: 'Execute an agent tool (search, calculate, etc.)',
      auth: 'Bearer token', rateLimit: '20 req/min',
      reqBody: JSON.stringify({ tool: 'web_search', parameters: { query: 'latest AI news 2026', max_results: 5 } }, null, 2),
      respBody: JSON.stringify({ tool: 'web_search', status: 'success', result: { results: [{ title: 'OpenAI Announces GPT-5', url: 'https://example.com/gpt5', snippet: 'OpenAI has released GPT-5 with improved reasoning...' }, { title: 'AI Regulation Update', url: 'https://example.com/regulation', snippet: 'New EU AI Act provisions take effect...' }] }, execution_time_ms: 342 }, null, 2)
    },
    {
      method: 'GET', path: '/v1/tools', category: 'tools',
      desc: 'List available tools and their capabilities',
      auth: 'Bearer token', rateLimit: '30 req/min',
      respBody: JSON.stringify({ tools: [{ name: 'web_search', description: 'Search the web for information', parameters: { query: 'string', max_results: 'integer (1-10)' } }, { name: 'calculator', description: 'Evaluate mathematical expressions', parameters: { expression: 'string' } }, { name: 'image_generate', description: 'Generate images from text prompts', parameters: { prompt: 'string', size: '256|512|1024' } }] }, null, 2)
    },
    {
      method: 'GET', path: '/v1/sessions', category: 'sessions',
      desc: 'List conversation sessions',
      auth: 'Bearer token', rateLimit: '30 req/min',
      respBody: JSON.stringify({ sessions: [{ id: 'sess_abc', title: 'Project Planning', created_at: '2026-03-01T09:00:00Z', message_count: 42, last_active: '2026-03-06T15:30:00Z' }, { id: 'sess_def', title: 'Code Review Helper', created_at: '2026-03-04T11:00:00Z', message_count: 18, last_active: '2026-03-06T14:00:00Z' }], total: 2 }, null, 2)
    },
    {
      method: 'GET', path: '/v1/sessions/{id}/messages', category: 'sessions',
      desc: 'Get messages in a session',
      auth: 'Bearer token', rateLimit: '30 req/min',
      respBody: JSON.stringify({ messages: [{ id: 'msg_01', role: 'user', content: 'Help me plan a REST API', timestamp: '2026-03-01T09:00:00Z' }, { id: 'msg_02', role: 'assistant', content: 'I would suggest starting with your resource models...', timestamp: '2026-03-01T09:00:02Z' }], has_more: true, cursor: 'msg_02' }, null, 2)
    },
    {
      method: 'DELETE', path: '/v1/sessions/{id}', category: 'sessions',
      desc: 'Delete a session and its messages',
      auth: 'Bearer token', rateLimit: '10 req/min',
      respBody: JSON.stringify({ deleted: true, id: 'sess_abc', messages_removed: 42 }, null, 2)
    },
    {
      method: 'GET', path: '/v1/usage', category: 'account',
      desc: 'Get current usage and quota info',
      auth: 'Bearer token', rateLimit: '10 req/min',
      respBody: JSON.stringify({ plan: 'pro', period: { start: '2026-03-01', end: '2026-03-31' }, usage: { messages_sent: 847, messages_limit: null, tokens_used: 234500, tools_executed: 156 }, billing: { amount_due: 12.00, currency: 'USD', next_invoice: '2026-04-01' } }, null, 2)
    },
    {
      method: 'GET', path: '/v1/models', category: 'account',
      desc: 'List available models',
      auth: 'Bearer token', rateLimit: '10 req/min',
      respBody: JSON.stringify({ models: [{ id: 'agentbox-1', name: 'AgentBox Standard', max_tokens: 4096, supports_streaming: true }, { id: 'agentbox-1-turbo', name: 'AgentBox Turbo', max_tokens: 8192, supports_streaming: true }, { id: 'agentbox-vision', name: 'AgentBox Vision', max_tokens: 4096, supports_streaming: true, supports_images: true }] }, null, 2)
    }
  ];

  const CATEGORIES = [
    { key: 'chat', label: '\uD83D\uDCAC Chat', name: 'Chat' },
    { key: 'memory', label: '\uD83E\uDDE0 Memory', name: 'Memory' },
    { key: 'tools', label: '\uD83D\uDD27 Tools', name: 'Tools' },
    { key: 'sessions', label: '\uD83D\uDCC1 Sessions', name: 'Sessions' },
    { key: 'account', label: '\uD83D\uDC64 Account', name: 'Account' }
  ];

  let grid, detailPanel, filterContainer;
  let activeCard = null;
  let currentFilter = 'all';
  let cardPool = [];

  function init() {
    grid = document.getElementById('apiExplorerGrid');
    detailPanel = document.getElementById('apiDetailPanel');
    filterContainer = document.querySelector('.api-explorer-filter');
    if (!grid) return;

    // Build filter buttons
    CATEGORIES.forEach(function (cat) {
      let btn = document.createElement('button');
      btn.className = 'api-filter-btn';
      btn.setAttribute('role', 'tab');
      btn.setAttribute('aria-selected', 'false');
      btn.setAttribute('data-api-cat', cat.key);
      btn.textContent = cat.label;
      filterContainer.appendChild(btn);
    });

    // Wire filter clicks
    filterContainer.addEventListener('click', function (e) {
      let btn = e.target.closest('.api-filter-btn');
      if (!btn) return;
      let cat = btn.getAttribute('data-api-cat');
      currentFilter = cat;
      filterContainer.querySelectorAll('.api-filter-btn').forEach(function (b) {
        let isActive = b.getAttribute('data-api-cat') === cat;
        b.classList.toggle('active', isActive);
        b.setAttribute('aria-selected', isActive ? 'true' : 'false');
      });
      filterGrid();
      closeDetail();
    });

    // Close button
    let closeBtn = document.getElementById('apiDetailClose');
    if (closeBtn) closeBtn.addEventListener('click', closeDetail);

    // Copy buttons
    document.querySelectorAll('.api-copy-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        const targetId = btn.getAttribute('data-copy-target');
        let target = document.getElementById(targetId);
        if (!target) return;
        let text = target.textContent;
        if (navigator.clipboard) {
          navigator.clipboard.writeText(text).then(function () {
            btn.textContent = '\u2705 Copied!';
            btn.classList.add('copied');
            setTimeout(function () { btn.textContent = '\uD83D\uDCCB Copy'; btn.classList.remove('copied'); }, 1500);
          });
        }
      });
    });

    // Build card pool once — cards are shown/hidden on filter, not recreated
    cardPool = [];
    ENDPOINTS.forEach(function (ep) {
      const card = document.createElement('div');
      card.className = 'api-endpoint-card';
      card.setAttribute('role', 'listitem');
      card.setAttribute('tabindex', '0');
      card.setAttribute('data-category', ep.category);
      card.innerHTML =
        '<span class="api-method-badge ' + ep.method.toLowerCase() + '">' + ep.method + '</span>' +
        '<span class="api-endpoint-path">' + escapeHtml(ep.path) + (ep.suffix ? ' <small style="opacity:0.5">' + escapeHtml(ep.suffix) + '</small>' : '') + '</span>' +
        '<span class="api-endpoint-desc">' + escapeHtml(ep.desc) + '</span>';

      card.addEventListener('click', function () { showDetail(ep, card); });
      card.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); showDetail(ep, card); }
      });
      grid.appendChild(card);
      cardPool.push(card);
    });

    filterGrid();
  }

  function filterGrid() {
    for (var i = 0; i < cardPool.length; i++) {
      cardPool[i].hidden = (currentFilter !== 'all' && cardPool[i].getAttribute('data-category') !== currentFilter);
    }
  }

  function showDetail(ep, card) {
    if (activeCard) activeCard.classList.remove('active');
    activeCard = card;
    card.classList.add('active');

    document.getElementById('apiDetailTitle').innerHTML =
      '<span class="api-method-badge ' + ep.method.toLowerCase() + '">' + ep.method + '</span> ' +
      escapeHtml(ep.path) + (ep.suffix ? ' ' + escapeHtml(ep.suffix) : '');

    document.getElementById('apiDetailMeta').innerHTML =
      '<span>\uD83D\uDD12 ' + escapeHtml(ep.auth) + '</span>' +
      '<span>\u26A1 ' + escapeHtml(ep.rateLimit) + '</span>' +
      '<span>\uD83C\uDFF7\uFE0F ' + escapeHtml(getCategoryName(ep.category)) + '</span>';

    // Curl command
    let curl = 'curl';
    if (ep.method !== 'GET') curl += ' -X ' + ep.method;
    curl += " 'https://api.agentbox.ai" + ep.path + "'";
    curl += " \\\n  -H 'Authorization: Bearer YOUR_API_KEY'";
    curl += " \\\n  -H 'Content-Type: application/json'";
    if (ep.reqBody) curl += " \\\n  -d '" + ep.reqBody.replace(/'/g, "'\\''") + "'";
    document.getElementById('apiCurlCode').textContent = curl;

    // Request body
    const reqSection = document.getElementById('apiReqBodySection');
    if (ep.reqBody) {
      reqSection.hidden = false;
      document.getElementById('apiReqBody').textContent = ep.reqBody;
    } else {
      reqSection.hidden = true;
    }

    // Response
    document.getElementById('apiRespBody').textContent = ep.respBody;

    // Status badge
    const badge = document.getElementById('apiStatusBadge');
    if (ep.method === 'DELETE') { badge.textContent = '200 OK'; }
    else { badge.textContent = '200 OK'; }

    detailPanel.hidden = false;
    if (detailPanel.scrollIntoView) { detailPanel.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth', block: 'nearest' }); }
  }

  function closeDetail() {
    if (detailPanel) detailPanel.hidden = true;
    if (activeCard) { activeCard.classList.remove('active'); activeCard = null; }
  }

  function getCategoryName(key) {
    for (var i = 0; i < CATEGORIES.length; i++) {
      if (CATEGORIES[i].key === key) return CATEGORIES[i].name;
    }
    return key;
  }

  // Use shared _escapeHtml from _shared-utils.js
  var escapeHtml = typeof _escapeHtml === 'function' ? _escapeHtml : function(s) {
    var d = document.createElement('div'); d.textContent = s; return d.innerHTML;
  };

  return { init: init };
})();
