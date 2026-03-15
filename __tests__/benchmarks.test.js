/**
 * @jest-environment jsdom
 */
'use strict';

const fs = require('fs');
const path = require('path');

const benchmarkSrc = fs.readFileSync(
    path.resolve(__dirname, '..', 'src', 'benchmarks.js'),
    'utf8'
);

function setupDOM() {
    document.body.innerHTML = `
        <section id="benchmarkSection">
            <div class="benchmark-filters">
                <button class="benchmark-filter active" data-bench-cat="all" aria-selected="true">All Tasks</button>
                <button class="benchmark-filter" data-bench-cat="memory" aria-selected="false">Memory</button>
                <button class="benchmark-filter" data-bench-cat="integration" aria-selected="false">Integrations</button>
                <button class="benchmark-filter" data-bench-cat="efficiency" aria-selected="false">Efficiency</button>
                <button class="benchmark-filter" data-bench-cat="context" aria-selected="false">Context</button>
            </div>
            <div id="benchmarkChart"></div>
            <div id="benchmarkSummary"></div>
        </section>
    `;
}

function runBenchmarks() {
    // eval the IIFE in the jsdom window context where `document` is available
    const fn = new Function(benchmarkSrc);
    fn();
}

describe('Benchmarks module', () => {
    beforeEach(() => {
        setupDOM();
        // Stub IntersectionObserver (not available in jsdom)
        window.IntersectionObserver = undefined;
        runBenchmarks();
    });

    afterEach(() => {
        document.body.innerHTML = '';
    });

    test('renders all 12 benchmark rows on init', () => {
        const rows = document.querySelectorAll('.bench-row');
        expect(rows.length).toBe(12);
    });

    test('each row has agentbox and raw bars', () => {
        const rows = document.querySelectorAll('.bench-row');
        expect(rows.length).toBeGreaterThan(0);
        rows.forEach(row => {
            expect(row.querySelector('.agentbox-bar')).not.toBeNull();
            expect(row.querySelector('.raw-bar')).not.toBeNull();
        });
    });

    test('renders summary card with three stats', () => {
        const stats = document.querySelectorAll('.bench-summary-stat');
        expect(stats.length).toBe(3);
    });

    test('summary shows AgentBox avg, Raw AI avg, and advantage', () => {
        const labels = document.querySelectorAll('.bench-summary-label');
        const texts = Array.from(labels).map(el => el.textContent);
        expect(texts).toContain('AgentBox avg');
        expect(texts).toContain('Raw AI avg');
        expect(texts).toContain('AgentBox advantage');
    });

    test('summary advantage is a positive number', () => {
        const advantage = document.querySelector('.advantage-color');
        expect(advantage).not.toBeNull();
        expect(advantage.textContent).toMatch(/^\+\d+%$/);
    });

    test('filter by memory shows only memory tasks', () => {
        const memoryBtn = document.querySelector('[data-bench-cat="memory"]');
        memoryBtn.click();

        const rows = document.querySelectorAll('.bench-row');
        expect(rows.length).toBe(2);
        expect(memoryBtn.classList.contains('active')).toBe(true);
        expect(memoryBtn.getAttribute('aria-selected')).toBe('true');
    });

    test('filter by integration shows only integration tasks', () => {
        document.querySelector('[data-bench-cat="integration"]').click();
        const rows = document.querySelectorAll('.bench-row');
        expect(rows.length).toBe(3);
    });

    test('filter by efficiency shows only efficiency tasks', () => {
        document.querySelector('[data-bench-cat="efficiency"]').click();
        const rows = document.querySelectorAll('.bench-row');
        expect(rows.length).toBe(3);
    });

    test('filter by context shows only context tasks', () => {
        document.querySelector('[data-bench-cat="context"]').click();
        const rows = document.querySelectorAll('.bench-row');
        expect(rows.length).toBe(4);
    });

    test('clicking All after filter shows all benchmarks', () => {
        document.querySelector('[data-bench-cat="memory"]').click();
        expect(document.querySelectorAll('.bench-row').length).toBe(2);

        document.querySelector('[data-bench-cat="all"]').click();
        expect(document.querySelectorAll('.bench-row').length).toBe(12);
    });

    test('only one filter button is active at a time', () => {
        document.querySelector('[data-bench-cat="efficiency"]').click();
        const buttons = document.querySelectorAll('.benchmark-filter');
        const activeCount = Array.from(buttons).filter(b => b.classList.contains('active')).length;
        expect(activeCount).toBe(1);
    });

    test('bar data-target values are valid percentages', () => {
        const bars = document.querySelectorAll('.bench-bar[data-target]');
        expect(bars.length).toBeGreaterThan(0);
        bars.forEach(bar => {
            const target = parseInt(bar.getAttribute('data-target'), 10);
            expect(target).toBeGreaterThanOrEqual(0);
            expect(target).toBeLessThanOrEqual(100);
        });
    });

    test('each row has an insight', () => {
        const insights = document.querySelectorAll('.bench-insight-text');
        expect(insights.length).toBe(12);
        insights.forEach(el => {
            expect(el.textContent.length).toBeGreaterThan(10);
        });
    });

    test('no rendering if benchmarkSection is missing', () => {
        document.body.innerHTML = '';
        runBenchmarks();
        expect(document.querySelectorAll('.bench-row').length).toBe(0);
    });
});
