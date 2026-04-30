/**
 * @jest-environment jsdom
 */

const fs = require('fs');
const path = require('path');

describe('Cost Optimizer Page', () => {
    let html;

    beforeAll(() => {
        html = fs.readFileSync(path.join(__dirname, '..', 'cost-optimizer.html'), 'utf8');
    });

    beforeEach(() => {
        document.documentElement.innerHTML = html;
        // Execute inline scripts
        const scripts = document.querySelectorAll('script');
        scripts.forEach(script => {
            if (script.textContent) {
                eval(script.textContent);
            }
        });
    });

    describe('Structure', () => {
        test('has correct page title', () => {
            expect(document.title).toBe('AgentBox — Cost Optimizer');
        });

        test('has back link to index', () => {
            const link = document.querySelector('.back-link');
            expect(link).not.toBeNull();
            expect(link.getAttribute('href')).toBe('index.html');
        });

        test('has 4 tabs', () => {
            const tabs = document.querySelectorAll('.tab');
            expect(tabs.length).toBe(4);
        });

        test('first tab is active by default', () => {
            const firstTab = document.querySelector('.tab');
            expect(firstTab.classList.contains('active')).toBe(true);
            expect(firstTab.dataset.tab).toBe('analyzer');
        });

        test('has all tab content sections', () => {
            expect(document.getElementById('tab-analyzer')).not.toBeNull();
            expect(document.getElementById('tab-simulator')).not.toBeNull();
            expect(document.getElementById('tab-optimizer')).not.toBeNull();
            expect(document.getElementById('tab-forecaster')).not.toBeNull();
        });
    });

    describe('Usage Analyzer', () => {
        test('displays metrics summary cards', () => {
            expect(document.getElementById('total-spend').textContent).toBe('$847');
            expect(document.getElementById('cost-per-task').textContent).toBe('$0.34');
            expect(document.getElementById('efficiency-score').textContent).toBe('72%');
        });

        test('renders usage chart bars', () => {
            const bars = document.querySelectorAll('#usage-chart .chart-bar');
            expect(bars.length).toBe(6);
        });

        test('renders daily chart bars', () => {
            const bars = document.querySelectorAll('#daily-chart .chart-bar');
            expect(bars.length).toBe(14);
        });

        test('shows waste detection items', () => {
            const items = document.querySelectorAll('#waste-items .recommendation');
            expect(items.length).toBe(4);
        });

        test('waste items have savings info', () => {
            const savings = document.querySelectorAll('#waste-items .savings');
            expect(savings.length).toBe(4);
            expect(savings[0].textContent).toContain('$89/mo');
        });
    });

    describe('Model Simulator', () => {
        test('has primary model selector', () => {
            const select = document.getElementById('primary-model');
            expect(select).not.toBeNull();
            expect(select.options.length).toBeGreaterThan(3);
        });

        test('has fallback model selector', () => {
            const select = document.getElementById('fallback-model');
            expect(select).not.toBeNull();
            expect(select.options.length).toBeGreaterThan(2);
        });

        test('has routing strategy selector', () => {
            const select = document.getElementById('routing-strategy');
            expect(select).not.toBeNull();
            expect(select.options.length).toBe(5);
        });

        test('renders model comparison matrix', () => {
            const rows = document.querySelectorAll('#model-matrix .model-row');
            expect(rows.length).toBe(7);
        });

        test('simulation button exists and results placeholders are present', () => {
            const btn = document.querySelector('#tab-simulator .btn-primary');
            expect(btn).not.toBeNull();
            expect(btn.getAttribute('onclick')).toBe('runSimulation()');
            const cost = document.getElementById('sim-cost');
            expect(cost).not.toBeNull();
        });
    });

    describe('Auto-Optimizer', () => {
        test('shows optimization score', () => {
            const score = document.getElementById('opt-score');
            expect(score.textContent).toBe('68');
        });

        test('renders recommendations', () => {
            const recs = document.querySelectorAll('#recommendations .recommendation');
            expect(recs.length).toBe(5);
        });

        test('recommendations have savings data', () => {
            const savings = document.querySelectorAll('#recommendations .savings');
            expect(savings.length).toBe(5);
        });

        test('renders savings waterfall', () => {
            const rows = document.querySelectorAll('#savings-waterfall .waterfall-row');
            expect(rows.length).toBeGreaterThan(4);
        });

        test('renders timeline', () => {
            const items = document.querySelectorAll('#timeline .timeline-item');
            expect(items.length).toBe(6);
        });
    });

    describe('Cost Forecaster', () => {
        test('has growth rate selector', () => {
            expect(document.getElementById('growth-rate')).not.toBeNull();
        });

        test('has optimization toggle', () => {
            expect(document.getElementById('apply-opts')).not.toBeNull();
        });

        test('has budget alert cards', () => {
            const cards = document.querySelectorAll('#budget-alerts .metric-card');
            expect(cards.length).toBe(3);
        });

        test('forecast button exists and chart container is present', () => {
            const btn = document.querySelector('#tab-forecaster .btn-primary');
            expect(btn).not.toBeNull();
            expect(btn.getAttribute('onclick')).toBe('runForecast()');
            const chart = document.getElementById('forecast-chart');
            expect(chart).not.toBeNull();
        });

        test('forecast summary container is present', () => {
            const summary = document.getElementById('forecast-summary');
            expect(summary).not.toBeNull();
        });
    });

    describe('Tab Navigation', () => {
        test('clicking tab switches content', () => {
            const tabs = document.querySelectorAll('.tab');
            tabs[1].click();
            expect(tabs[1].classList.contains('active')).toBe(true);
            expect(tabs[0].classList.contains('active')).toBe(false);
            expect(document.getElementById('tab-simulator').classList.contains('active')).toBe(true);
            expect(document.getElementById('tab-analyzer').classList.contains('active')).toBe(false);
        });
    });

    describe('Responsive Design', () => {
        test('has viewport meta tag', () => {
            const meta = document.querySelector('meta[name="viewport"]');
            expect(meta).not.toBeNull();
            expect(meta.getAttribute('content')).toContain('width=device-width');
        });
    });
});
