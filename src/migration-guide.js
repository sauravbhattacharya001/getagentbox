'use strict';

/**
 * Migration Guide — Interactive platform comparison & migration helper.
 *
 * Shows concept mappings between popular AI agent frameworks and AgentBox,
 * with code translation examples, migration checklists, and effort
 * estimation. Helps users coming from LangChain, AutoGPT, CrewAI, or
 * custom solutions understand how their existing patterns map to AgentBox.
 *
 * DOM target: #migration-guide
 */
(function initMigrationGuide() {
    // ── Platform data ───────────────────────────────────────────

    var PLATFORMS = [
        {
            id: 'langchain',
            name: 'LangChain',
            icon: '\u{1F9E9}',
            color: '#2D9CDB',
            tagline: 'Popular Python/JS framework for LLM chains',
            concepts: [
                { theirs: 'Chain', ours: 'Task Pipeline', note: 'AgentBox pipelines are declarative and auto-retry on failure' },
                { theirs: 'Agent', ours: 'Agent', note: 'Both use tool-calling agents; AgentBox adds persistent memory' },
                { theirs: 'Tool', ours: 'Skill', note: 'AgentBox skills are hot-reloadable and sandboxed' },
                { theirs: 'Memory (BufferMemory)', ours: 'Session Memory', note: 'AgentBox memory persists across restarts — no manual wiring' },
                { theirs: 'VectorStore', ours: 'Knowledge Base', note: 'Built-in, no Pinecone/Weaviate setup required' },
                { theirs: 'OutputParser', ours: 'Response Schema', note: 'Declarative JSON schemas with auto-validation' },
                { theirs: 'Callback', ours: 'Webhook / Event', note: 'Native webhook support with retry and dead-letter queues' },
                { theirs: 'Hub Prompt', ours: 'Prompt Library', note: 'Version-controlled prompts with A/B testing built in' },
            ],
            migration: [
                { step: 'Export your chain definitions to JSON', effort: 'low' },
                { step: 'Map Tools to AgentBox Skills (most are built-in)', effort: 'low' },
                { step: 'Move prompts to the Prompt Library', effort: 'low' },
                { step: 'Replace BufferMemory with native session memory (automatic)', effort: 'none' },
                { step: 'Set up vector store migration if using RAG', effort: 'medium' },
                { step: 'Update API calls to use AgentBox REST endpoints', effort: 'medium' },
                { step: 'Configure webhooks to replace LangChain callbacks', effort: 'low' },
                { step: 'Run parallel testing with both systems', effort: 'medium' },
            ],
            beforeCode: '# LangChain\nfrom langchain.chains import LLMChain\nfrom langchain.memory import ConversationBufferMemory\n\nmemory = ConversationBufferMemory()\nchain = LLMChain(\n    llm=ChatOpenAI(),\n    prompt=prompt_template,\n    memory=memory\n)\nresult = chain.run("Plan my week")',
            afterCode: '# AgentBox\n# Memory is automatic — no setup needed\nresult = agent.run("Plan my week")\n# Session history, tool calls, and context\n# are all persisted automatically',
        },
        {
            id: 'autogpt',
            name: 'AutoGPT',
            icon: '\u{1F916}',
            color: '#7B61FF',
            tagline: 'Autonomous AI agent with self-prompting',
            concepts: [
                { theirs: 'Workspace', ours: 'Workspace', note: 'Both use persistent file workspaces; AgentBox adds git integration' },
                { theirs: 'Plugin', ours: 'Skill', note: 'AgentBox skills are curated and security-reviewed' },
                { theirs: 'AI Config', ours: 'Agent Config (YAML)', note: 'Simpler config with hot-reload' },
                { theirs: 'Continuous Mode', ours: 'Autonomous Mode', note: 'AgentBox adds budget limits and safety guardrails' },
                { theirs: 'Memory (Pinecone)', ours: 'Built-in Memory', note: 'No external vector DB needed' },
                { theirs: 'Command', ours: 'Tool / Skill', note: 'Same concept, better sandboxing' },
            ],
            migration: [
                { step: 'Export your AI config settings', effort: 'low' },
                { step: 'Map plugins to AgentBox skills', effort: 'medium' },
                { step: 'Migrate workspace files (direct copy)', effort: 'low' },
                { step: 'Configure safety limits (token budget, action allowlist)', effort: 'low' },
                { step: 'Set up persistent memory (automatic in AgentBox)', effort: 'none' },
                { step: 'Test autonomous task execution with guardrails', effort: 'medium' },
            ],
            beforeCode: '# AutoGPT ai_settings.yaml\nai_name: MyAgent\nai_role: Research Assistant\nai_goals:\n  - Search the web for information\n  - Summarize findings\n  - Save results to files\nplugins:\n  - AutoGPTWebSearch\n  - AutoGPTFileOps',
            afterCode: '# AgentBox config.yaml\nname: MyAgent\nmodel: gpt-4\nskills:\n  - web-search  # built-in\n  - file-ops    # built-in\nsafety:\n  max_tokens_per_turn: 4000\n  require_approval: destructive',
        },
        {
            id: 'crewai',
            name: 'CrewAI',
            icon: '\u{1F465}',
            color: '#FF6B6B',
            tagline: 'Multi-agent orchestration framework',
            concepts: [
                { theirs: 'Crew', ours: 'Agent Team', note: 'AgentBox teams auto-coordinate via shared context' },
                { theirs: 'Agent (role)', ours: 'Agent Profile', note: 'Define personality, skills, and constraints per agent' },
                { theirs: 'Task', ours: 'Task', note: 'Direct equivalent with added dependency tracking' },
                { theirs: 'Process (sequential/hierarchical)', ours: 'Orchestration Mode', note: 'AgentBox adds parallel and consensus modes' },
                { theirs: 'Delegation', ours: 'Sub-agent Spawn', note: 'Dynamic spawning with resource limits' },
                { theirs: 'Tool', ours: 'Skill', note: 'Same concept; AgentBox skills are shareable across agents' },
            ],
            migration: [
                { step: 'Map your Crew roles to Agent Profiles', effort: 'low' },
                { step: 'Convert Task definitions to AgentBox task format', effort: 'low' },
                { step: 'Choose orchestration mode (sequential, parallel, hierarchical)', effort: 'low' },
                { step: 'Map tools to built-in skills', effort: 'medium' },
                { step: 'Configure inter-agent communication channels', effort: 'medium' },
                { step: 'Set up shared knowledge base for team context', effort: 'medium' },
                { step: 'Test multi-agent workflows end-to-end', effort: 'medium' },
            ],
            beforeCode: '# CrewAI\nfrom crewai import Agent, Task, Crew\n\nresearcher = Agent(\n    role="Researcher",\n    goal="Find accurate info",\n    tools=[search_tool]\n)\nwriter = Agent(\n    role="Writer",\n    goal="Write clear summaries"\n)\ncrew = Crew(\n    agents=[researcher, writer],\n    tasks=[research_task, write_task],\n    process=Process.sequential\n)\nresult = crew.kickoff()',
            afterCode: '# AgentBox\n# Agents auto-coordinate via shared context\nagent.team([\n    {"role": "researcher", "skills": ["web-search"]},\n    {"role": "writer"}\n])\nresult = agent.run(\n    "Research and write a summary",\n    mode="sequential"\n)',
        },
        {
            id: 'custom',
            name: 'Custom / DIY',
            icon: '\u{1F527}',
            color: '#F2994A',
            tagline: 'Hand-rolled LLM integration with API calls',
            concepts: [
                { theirs: 'API wrapper', ours: 'Built-in provider', note: 'AgentBox handles API keys, retry, fallback automatically' },
                { theirs: 'Prompt template strings', ours: 'Prompt Library', note: 'Version-controlled with variables and testing' },
                { theirs: 'JSON.parse() on output', ours: 'Response Schema', note: 'Guaranteed structured output with validation' },
                { theirs: 'Chat history array', ours: 'Session Memory', note: 'Persistent, searchable, with automatic summarization' },
                { theirs: 'Cron job / webhook', ours: 'Scheduled Tasks', note: 'Built-in scheduler with retry and monitoring' },
                { theirs: 'console.log debugging', ours: 'Observability Dashboard', note: 'Full tracing, cost tracking, and replay' },
            ],
            migration: [
                { step: 'Identify which LLM providers you use', effort: 'low' },
                { step: 'Move prompt templates to Prompt Library', effort: 'low' },
                { step: 'Replace API wrappers with AgentBox provider config', effort: 'medium' },
                { step: 'Migrate conversation history to session format', effort: 'medium' },
                { step: 'Convert cron jobs to AgentBox scheduled tasks', effort: 'low' },
                { step: 'Set up observability (automatic with AgentBox)', effort: 'none' },
                { step: 'Remove custom retry/error handling code', effort: 'low' },
            ],
            beforeCode: '// Custom integration\nconst response = await fetch(\n  "https://api.openai.com/v1/chat/completions",\n  {\n    method: "POST",\n    headers: {\n      "Authorization": `Bearer ${API_KEY}`,\n      "Content-Type": "application/json"\n    },\n    body: JSON.stringify({\n      model: "gpt-4",\n      messages: chatHistory,\n      temperature: 0.7\n    })\n  }\n);\nconst data = await response.json();\n// Hope it\'s valid JSON...\nconst result = JSON.parse(\n  data.choices[0].message.content\n);',
            afterCode: '// AgentBox\nconst result = await agent.run(\n  "Analyze this data",\n  {\n    schema: { summary: "string", score: "number" },\n    // Structured output guaranteed\n    // Retry, fallback, caching built-in\n    // Full observability automatic\n  }\n);',
        },
    ];

    var EFFORT_META = {
        none: { label: 'Automatic', color: '#27AE60', icon: '\u2705' },
        low: { label: 'Easy', color: '#2D9CDB', icon: '\u{1F7E2}' },
        medium: { label: 'Moderate', color: '#F2994A', icon: '\u{1F7E1}' },
        high: { label: 'Complex', color: '#EB5757', icon: '\u{1F534}' },
    };

    // ── State ────────────────────────────────────────────────────

    var selectedPlatform = null;
    var checkedSteps = {};

    // ── Render ───────────────────────────────────────────────────

    function render() {
        var el = document.getElementById('migration-guide');
        if (!el) return;

        var html = '<div class="mg-container">';
        html += '<h2 class="mg-title">Migration Guide</h2>';
        html += '<p class="mg-subtitle">Coming from another platform? See how your existing patterns map to AgentBox.</p>';

        // Platform selector cards
        html += '<div class="mg-platforms">';
        PLATFORMS.forEach(function (p) {
            var active = selectedPlatform === p.id ? ' mg-platform-active' : '';
            html += '<button class="mg-platform-card' + active + '" data-platform="' + p.id + '" style="--platform-color: ' + p.color + '">';
            html += '<span class="mg-platform-icon">' + p.icon + '</span>';
            html += '<span class="mg-platform-name">' + p.name + '</span>';
            html += '<span class="mg-platform-tag">' + p.tagline + '</span>';
            html += '</button>';
        });
        html += '</div>';

        // Detail view
        if (selectedPlatform) {
            var platform = PLATFORMS.find(function (p) { return p.id === selectedPlatform; });
            if (platform) {
                html += renderPlatformDetail(platform);
            }
        }

        html += '</div>';
        el.innerHTML = html;
        bindEvents(el);
    }

    function renderPlatformDetail(platform) {
        var html = '<div class="mg-detail" style="--platform-color: ' + platform.color + '">';

        // Concept mapping table
        html += '<div class="mg-section">';
        html += '<h3 class="mg-section-title">' + platform.icon + ' ' + platform.name + ' \u2192 AgentBox Concept Map</h3>';
        html += '<div class="mg-concept-grid">';
        html += '<div class="mg-concept-header"><span>Their Concept</span><span></span><span>AgentBox Equivalent</span></div>';
        platform.concepts.forEach(function (c) {
            html += '<div class="mg-concept-row">';
            html += '<div class="mg-concept-theirs">' + escapeHtml(c.theirs) + '</div>';
            html += '<div class="mg-concept-arrow">\u2192</div>';
            html += '<div class="mg-concept-ours">' + escapeHtml(c.ours) + '</div>';
            html += '<div class="mg-concept-note">' + escapeHtml(c.note) + '</div>';
            html += '</div>';
        });
        html += '</div></div>';

        // Code comparison
        html += '<div class="mg-section">';
        html += '<h3 class="mg-section-title">Code Comparison</h3>';
        html += '<div class="mg-code-compare">';
        html += '<div class="mg-code-panel mg-code-before">';
        html += '<div class="mg-code-label" style="background: ' + platform.color + '">' + platform.name + '</div>';
        html += '<pre class="mg-code">' + escapeHtml(platform.beforeCode) + '</pre>';
        html += '</div>';
        html += '<div class="mg-code-panel mg-code-after">';
        html += '<div class="mg-code-label" style="background: #27AE60">AgentBox</div>';
        html += '<pre class="mg-code">' + escapeHtml(platform.afterCode) + '</pre>';
        html += '</div>';
        html += '</div></div>';

        // Migration checklist
        var stepKey = platform.id;
        if (!checkedSteps[stepKey]) checkedSteps[stepKey] = {};

        var completed = 0;
        platform.migration.forEach(function (s, i) {
            if (checkedSteps[stepKey][i]) completed++;
        });
        var totalSteps = platform.migration.length;
        var pct = totalSteps > 0 ? Math.round((completed / totalSteps) * 100) : 0;

        html += '<div class="mg-section">';
        html += '<h3 class="mg-section-title">Migration Checklist</h3>';
        html += '<div class="mg-progress-bar"><div class="mg-progress-fill" style="width: ' + pct + '%; background: ' + platform.color + '"></div></div>';
        html += '<div class="mg-progress-label">' + completed + '/' + totalSteps + ' steps complete (' + pct + '%)</div>';
        html += '<div class="mg-checklist">';
        platform.migration.forEach(function (s, i) {
            var checked = checkedSteps[stepKey] && checkedSteps[stepKey][i];
            var effortMeta = EFFORT_META[s.effort] || EFFORT_META.medium;
            html += '<label class="mg-check-item' + (checked ? ' mg-checked' : '') + '">';
            html += '<input type="checkbox" data-platform="' + platform.id + '" data-step="' + i + '"' + (checked ? ' checked' : '') + '>';
            html += '<span class="mg-check-text">' + escapeHtml(s.step) + '</span>';
            html += '<span class="mg-effort-badge" style="background: ' + effortMeta.color + '22; color: ' + effortMeta.color + '; border: 1px solid ' + effortMeta.color + '44">' + effortMeta.icon + ' ' + effortMeta.label + '</span>';
            html += '</label>';
        });
        html += '</div></div>';

        // Effort summary
        var effortCounts = { none: 0, low: 0, medium: 0, high: 0 };
        platform.migration.forEach(function (s) { effortCounts[s.effort]++; });
        var totalEffort = effortCounts.none * 0 + effortCounts.low * 1 + effortCounts.medium * 3 + effortCounts.high * 5;
        var effortLabel = totalEffort <= 5 ? 'Straightforward' : totalEffort <= 12 ? 'Moderate' : 'Complex';

        html += '<div class="mg-section mg-effort-summary">';
        html += '<h3 class="mg-section-title">Effort Estimate</h3>';
        html += '<div class="mg-effort-grid">';
        Object.keys(EFFORT_META).forEach(function (key) {
            if (effortCounts[key] > 0) {
                var m = EFFORT_META[key];
                html += '<div class="mg-effort-card" style="border-color: ' + m.color + '">';
                html += '<div class="mg-effort-count">' + effortCounts[key] + '</div>';
                html += '<div class="mg-effort-type">' + m.icon + ' ' + m.label + '</div>';
                html += '</div>';
            }
        });
        html += '</div>';
        html += '<div class="mg-effort-verdict">Overall migration complexity: <strong>' + effortLabel + '</strong></div>';
        html += '</div>';

        html += '</div>';
        return html;
    }

    // ── Events ──────────────────────────────────────────────────

    function bindEvents(container) {
        var cards = container.querySelectorAll('.mg-platform-card');
        cards.forEach(function (card) {
            card.addEventListener('click', function () {
                var pid = this.getAttribute('data-platform');
                selectedPlatform = selectedPlatform === pid ? null : pid;
                render();
            });
        });

        var checks = container.querySelectorAll('.mg-checklist input[type="checkbox"]');
        checks.forEach(function (cb) {
            cb.addEventListener('change', function () {
                var pid = this.getAttribute('data-platform');
                var step = parseInt(this.getAttribute('data-step'), 10);
                if (!checkedSteps[pid]) checkedSteps[pid] = {};
                checkedSteps[pid][step] = this.checked;
                render();
            });
        });
    }

    // ── Helpers ──────────────────────────────────────────────────

    function escapeHtml(str) {
        var div = document.createElement('div');
        div.appendChild(document.createTextNode(str));
        return div.innerHTML;
    }

    // ── Styles ──────────────────────────────────────────────────

    function injectStyles() {
        if (document.getElementById('mg-styles')) return;
        var style = document.createElement('style');
        style.id = 'mg-styles';
        style.textContent = [
            '.mg-container { max-width: 960px; margin: 0 auto; padding: 2rem 1rem; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }',
            '.mg-title { font-size: 2rem; font-weight: 800; text-align: center; margin-bottom: 0.5rem; }',
            '.mg-subtitle { text-align: center; color: #888; margin-bottom: 2rem; font-size: 1.1rem; }',
            '.mg-platforms { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin-bottom: 2rem; }',
            '.mg-platform-card { display: flex; flex-direction: column; align-items: center; gap: 0.4rem; padding: 1.2rem 1rem; border: 2px solid #333; border-radius: 12px; background: #1a1a2e; cursor: pointer; transition: all 0.2s; text-align: center; }',
            '.mg-platform-card:hover { border-color: var(--platform-color); transform: translateY(-2px); box-shadow: 0 4px 20px rgba(0,0,0,0.3); }',
            '.mg-platform-active { border-color: var(--platform-color) !important; background: #1a1a2e; box-shadow: 0 0 20px color-mix(in srgb, var(--platform-color) 30%, transparent); }',
            '.mg-platform-icon { font-size: 2rem; }',
            '.mg-platform-name { font-weight: 700; font-size: 1.1rem; color: #eee; }',
            '.mg-platform-tag { font-size: 0.75rem; color: #999; line-height: 1.3; }',
            '.mg-detail { margin-top: 1.5rem; }',
            '.mg-section { background: #16213e; border-radius: 12px; padding: 1.5rem; margin-bottom: 1.5rem; border: 1px solid #333; }',
            '.mg-section-title { font-size: 1.2rem; font-weight: 700; margin-bottom: 1rem; color: #eee; }',
            '.mg-concept-grid { display: flex; flex-direction: column; gap: 0.5rem; }',
            '.mg-concept-header { display: grid; grid-template-columns: 1fr 30px 1fr; font-size: 0.8rem; color: #888; font-weight: 600; text-transform: uppercase; padding: 0 0.5rem 0.5rem; border-bottom: 1px solid #333; }',
            '.mg-concept-row { display: grid; grid-template-columns: 1fr 30px 1fr; align-items: center; padding: 0.6rem 0.5rem; border-radius: 8px; position: relative; }',
            '.mg-concept-row:hover { background: #1a1a3e; }',
            '.mg-concept-theirs { color: #ccc; font-weight: 500; }',
            '.mg-concept-arrow { text-align: center; color: var(--platform-color); font-weight: 700; }',
            '.mg-concept-ours { color: #27AE60; font-weight: 600; }',
            '.mg-concept-note { grid-column: 1 / -1; font-size: 0.8rem; color: #888; padding-left: 0.5rem; margin-top: 0.2rem; }',
            '.mg-code-compare { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }',
            '@media (max-width: 700px) { .mg-code-compare { grid-template-columns: 1fr; } }',
            '.mg-code-panel { border-radius: 8px; overflow: hidden; border: 1px solid #333; }',
            '.mg-code-label { padding: 0.4rem 0.8rem; font-size: 0.8rem; font-weight: 600; color: #fff; text-align: center; }',
            '.mg-code { margin: 0; padding: 1rem; background: #0d1117; color: #c9d1d9; font-size: 0.82rem; line-height: 1.5; overflow-x: auto; white-space: pre; font-family: "Fira Code", "Consolas", monospace; }',
            '.mg-progress-bar { height: 8px; background: #333; border-radius: 4px; overflow: hidden; margin-bottom: 0.5rem; }',
            '.mg-progress-fill { height: 100%; border-radius: 4px; transition: width 0.4s ease; }',
            '.mg-progress-label { font-size: 0.85rem; color: #aaa; margin-bottom: 1rem; }',
            '.mg-checklist { display: flex; flex-direction: column; gap: 0.5rem; }',
            '.mg-check-item { display: flex; align-items: center; gap: 0.75rem; padding: 0.6rem 0.8rem; border-radius: 8px; cursor: pointer; transition: background 0.2s; }',
            '.mg-check-item:hover { background: #1a1a3e; }',
            '.mg-checked { opacity: 0.6; }',
            '.mg-checked .mg-check-text { text-decoration: line-through; }',
            '.mg-check-item input[type="checkbox"] { width: 18px; height: 18px; accent-color: var(--platform-color); cursor: pointer; flex-shrink: 0; }',
            '.mg-check-text { flex: 1; color: #ddd; font-size: 0.95rem; }',
            '.mg-effort-badge { font-size: 0.7rem; padding: 0.2rem 0.5rem; border-radius: 20px; font-weight: 600; white-space: nowrap; }',
            '.mg-effort-grid { display: flex; gap: 1rem; justify-content: center; margin-bottom: 1rem; flex-wrap: wrap; }',
            '.mg-effort-card { text-align: center; padding: 0.8rem 1.5rem; border-radius: 10px; border: 2px solid; background: #1a1a2e; }',
            '.mg-effort-count { font-size: 1.8rem; font-weight: 800; color: #eee; }',
            '.mg-effort-type { font-size: 0.85rem; color: #aaa; }',
            '.mg-effort-verdict { text-align: center; color: #ccc; font-size: 1rem; }',
        ].join('\n');
        document.head.appendChild(style);
    }

    // ── Init ────────────────────────────────────────────────────

    if (typeof document !== 'undefined') {
        injectStyles();
        render();
    }

    // ── Exports for testing ─────────────────────────────────────

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = {
            PLATFORMS: PLATFORMS,
            EFFORT_META: EFFORT_META,
            _test: {
                getSelectedPlatform: function () { return selectedPlatform; },
                setSelectedPlatform: function (id) { selectedPlatform = id; },
                getCheckedSteps: function () { return checkedSteps; },
                setCheckedSteps: function (s) { checkedSteps = s; },
                render: render,
                renderPlatformDetail: renderPlatformDetail,
                escapeHtml: escapeHtml,
            },
        };
    }
})();
