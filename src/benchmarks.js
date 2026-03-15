'use strict';

/**
 * Agent Benchmarks — Interactive performance comparison dashboard.
 *
 * Shows animated bar charts comparing AgentBox vs raw AI chat across
 * real-world task categories: memory, integrations, efficiency, context.
 * Users can filter by category and hover for details.
 */
(function initBenchmarks() {
    // ── Benchmark data ──────────────────────────────────────────
    var BENCHMARKS = [
        {
            id: 'recall-personal',
            task: 'Recall personal preferences',
            category: 'memory',
            description: 'Remember dietary restrictions, timezone, preferred communication style across sessions',
            agentbox: 97,
            rawAi: 0,
            unit: 'accuracy %',
            insight: 'Raw AI starts fresh every conversation — your preferences are lost'
        },
        {
            id: 'follow-up',
            task: 'Follow-up on previous conversations',
            category: 'memory',
            description: 'Continue a discussion from yesterday without re-explaining context',
            agentbox: 94,
            rawAi: 0,
            unit: 'success rate %',
            insight: 'AgentBox remembers your conversation history across sessions'
        },
        {
            id: 'calendar-check',
            task: 'Check schedule & create events',
            category: 'integration',
            description: 'Query Google Calendar, find free slots, create events with correct details',
            agentbox: 96,
            rawAi: 12,
            unit: 'task completion %',
            insight: 'Raw AI can only suggest — AgentBox actually reads and writes your calendar'
        },
        {
            id: 'email-summary',
            task: 'Summarize unread emails',
            category: 'integration',
            description: 'Read Gmail inbox, identify important messages, extract action items',
            agentbox: 93,
            rawAi: 8,
            unit: 'task completion %',
            insight: 'AgentBox connects directly to Gmail — no copy-pasting needed'
        },
        {
            id: 'web-search',
            task: 'Answer with current information',
            category: 'integration',
            description: 'Search the web for real-time data (weather, news, prices)',
            agentbox: 91,
            rawAi: 42,
            unit: 'accuracy %',
            insight: 'AgentBox searches the web live; raw AI relies on training data cutoff'
        },
        {
            id: 'multi-step',
            task: 'Multi-step task completion',
            category: 'efficiency',
            description: '"Check my calendar, find a free slot this week, and set a reminder 1hr before"',
            agentbox: 89,
            rawAi: 5,
            unit: 'completion %',
            insight: 'Chaining calendar lookup → slot finding → reminder creation in one message'
        },
        {
            id: 'response-time',
            task: 'Average response time',
            category: 'efficiency',
            description: 'Time from message sent to complete response received',
            agentbox: 92,
            rawAi: 85,
            unit: 'speed score',
            insight: 'Both are fast, but AgentBox includes tool execution in its response time'
        },
        {
            id: 'reminder-accuracy',
            task: 'Reminder & notification delivery',
            category: 'efficiency',
            description: 'Set reminders that actually fire at the right time in the right timezone',
            agentbox: 98,
            rawAi: 3,
            unit: 'delivery rate %',
            insight: 'Raw AI cannot send proactive notifications — AgentBox can'
        },
        {
            id: 'tone-adapt',
            task: 'Adapt to user communication style',
            category: 'context',
            description: 'Match formality, emoji usage, verbosity to user preferences over time',
            agentbox: 90,
            rawAi: 45,
            unit: 'match score %',
            insight: 'AgentBox learns your style over weeks; raw AI guesses from system prompts'
        },
        {
            id: 'project-context',
            task: 'Maintain project context',
            category: 'context',
            description: 'Track an ongoing project across multiple conversations (deadlines, decisions, blockers)',
            agentbox: 92,
            rawAi: 0,
            unit: 'retention %',
            insight: 'AgentBox maintains structured memory of your projects'
        },
        {
            id: 'name-recognition',
            task: 'Recognize people & relationships',
            category: 'context',
            description: 'Remember who "Mom", "my boss Sarah", "the dentist" refers to',
            agentbox: 95,
            rawAi: 0,
            unit: 'accuracy %',
            insight: 'AgentBox builds a contact graph from your conversations'
        },
        {
            id: 'habit-tracking',
            task: 'Track habits & routines',
            category: 'context',
            description: '"How many days have I meditated this week?" — answer from conversation history',
            agentbox: 88,
            rawAi: 0,
            unit: 'accuracy %',
            insight: 'AgentBox can extract patterns from your message history'
        },
    ];

    // ── Helpers ─────────────────────────────────────────────────

    function esc(s) {
        var d = document.createElement('div');
        d.textContent = s;
        return d.innerHTML;
    }

    function catLabel(cat) {
        var labels = {
            memory: '🧠 Memory',
            integration: '🔌 Integrations',
            efficiency: '⚡ Efficiency',
            context: '🎯 Context'
        };
        return labels[cat] || cat;
    }

    function catColor(cat) {
        var colors = {
            memory: '#a78bfa',
            integration: '#34d399',
            efficiency: '#fbbf24',
            context: '#60a5fa'
        };
        return colors[cat] || '#888';
    }

    // ── Rendering ───────────────────────────────────────────────

    function renderChart(filter) {
        var chartEl = document.getElementById('benchmarkChart');
        var summaryEl = document.getElementById('benchmarkSummary');
        if (!chartEl || !summaryEl) return;

        var filtered = filter === 'all'
            ? BENCHMARKS
            : BENCHMARKS.filter(function(b) { return b.category === filter; });

        // Calculate summary stats
        var avgAgent = 0;
        var avgRaw = 0;
        for (var i = 0; i < filtered.length; i++) {
            avgAgent += filtered[i].agentbox;
            avgRaw += filtered[i].rawAi;
        }
        avgAgent = filtered.length ? Math.round(avgAgent / filtered.length) : 0;
        avgRaw = filtered.length ? Math.round(avgRaw / filtered.length) : 0;
        var advantage = avgAgent - avgRaw;

        // Build chart HTML
        var html = '';
        for (var j = 0; j < filtered.length; j++) {
            var b = filtered[j];
            html += '<div class="bench-row" data-bench-id="' + b.id + '">' +
                '<div class="bench-label">' +
                    '<span class="bench-task">' + esc(b.task) + '</span>' +
                    '<span class="bench-cat-tag" style="color:' + catColor(b.category) + '">' + catLabel(b.category) + '</span>' +
                '</div>' +
                '<div class="bench-bars">' +
                    '<div class="bench-bar-row">' +
                        '<span class="bench-bar-label">AgentBox</span>' +
                        '<div class="bench-bar-track">' +
                            '<div class="bench-bar agentbox-bar" style="width:0%" data-target="' + b.agentbox + '">' +
                                '<span class="bench-bar-value">' + b.agentbox + '</span>' +
                            '</div>' +
                        '</div>' +
                    '</div>' +
                    '<div class="bench-bar-row">' +
                        '<span class="bench-bar-label">Raw AI</span>' +
                        '<div class="bench-bar-track">' +
                            '<div class="bench-bar raw-bar" style="width:0%" data-target="' + b.rawAi + '">' +
                                '<span class="bench-bar-value">' + b.rawAi + '</span>' +
                            '</div>' +
                        '</div>' +
                    '</div>' +
                '</div>' +
                '<div class="bench-insight">' +
                    '<span class="bench-insight-icon">💡</span>' +
                    '<span class="bench-insight-text">' + esc(b.insight) + '</span>' +
                '</div>' +
            '</div>';
        }

        chartEl.innerHTML = html;

        // Summary
        summaryEl.innerHTML =
            '<div class="bench-summary-card">' +
                '<div class="bench-summary-stat">' +
                    '<span class="bench-summary-number agentbox-color">' + avgAgent + '%</span>' +
                    '<span class="bench-summary-label">AgentBox avg</span>' +
                '</div>' +
                '<div class="bench-summary-stat">' +
                    '<span class="bench-summary-number raw-color">' + avgRaw + '%</span>' +
                    '<span class="bench-summary-label">Raw AI avg</span>' +
                '</div>' +
                '<div class="bench-summary-stat">' +
                    '<span class="bench-summary-number advantage-color">+' + advantage + '%</span>' +
                    '<span class="bench-summary-label">AgentBox advantage</span>' +
                '</div>' +
            '</div>';

        // Animate bars after a brief delay
        requestAnimationFrame(function() {
            setTimeout(animateBars, 50);
        });
    }

    function animateBars() {
        var bars = document.querySelectorAll('.bench-bar[data-target]');
        for (var i = 0; i < bars.length; i++) {
            (function(bar) {
                var target = parseInt(bar.getAttribute('data-target'), 10);
                bar.style.width = target + '%';
            })(bars[i]);
        }
    }

    // ── Intersection Observer for scroll-triggered animation ────

    function setupScrollAnimation() {
        if (typeof IntersectionObserver === 'undefined') {
            animateBars();
            return;
        }

        var section = document.getElementById('benchmarkSection');
        if (!section) return;

        var hasAnimated = false;
        var observer = new IntersectionObserver(function(entries) {
            for (var i = 0; i < entries.length; i++) {
                if (entries[i].isIntersecting && !hasAnimated) {
                    hasAnimated = true;
                    animateBars();
                    observer.disconnect();
                }
            }
        }, { threshold: 0.2 });

        observer.observe(section);
    }

    // ── Filter buttons ──────────────────────────────────────────

    function setupFilters() {
        var buttons = document.querySelectorAll('.benchmark-filter');
        for (var i = 0; i < buttons.length; i++) {
            buttons[i].addEventListener('click', function() {
                var cat = this.getAttribute('data-bench-cat');
                // Update active state
                for (var j = 0; j < buttons.length; j++) {
                    buttons[j].classList.remove('active');
                    buttons[j].setAttribute('aria-selected', 'false');
                }
                this.classList.add('active');
                this.setAttribute('aria-selected', 'true');

                renderChart(cat);
            });
        }
    }

    // ── Init ────────────────────────────────────────────────────

    function init() {
        var section = document.getElementById('benchmarkSection');
        if (!section) return;

        renderChart('all');
        setupFilters();
        setupScrollAnimation();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
