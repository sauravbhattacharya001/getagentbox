'use strict';

/**
 * ROI Calculator — Interactive return-on-investment estimator.
 *
 * Users input their current workflow metrics (hours on tasks, hourly rate,
 * team size) and see projected time savings, cost savings, and payback
 * period with AgentBox. Includes category breakdowns and a visual summary.
 *
 * Usage (browser):
 *   <div id="roi-calculator"></div>
 *   <script src="src/roi-calculator.js"></script>
 *
 * Usage (Node/test):
 *   var ROICalculator = require('./src/roi-calculator');
 *   var result = ROICalculator.calculate({ teamSize: 5, hourlyRate: 75, ... });
 */
(function (root, factory) {
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = factory();
    } else {
        root.ROICalculator = factory();
    }
}(typeof globalThis !== 'undefined' ? globalThis : typeof self !== 'undefined' ? self : this, function () {

    // ── Task categories with default hours/week and automation rates ──
    var CATEGORIES = [
        { id: 'email',      label: 'Email & Communication', icon: '📧', defaultHours: 8,  automationRate: 0.65, description: 'Reading, drafting, sorting, follow-ups' },
        { id: 'scheduling', label: 'Scheduling & Calendar',  icon: '📅', defaultHours: 3,  automationRate: 0.80, description: 'Booking meetings, resolving conflicts, reminders' },
        { id: 'research',   label: 'Research & Analysis',    icon: '🔍', defaultHours: 6,  automationRate: 0.50, description: 'Market research, competitor analysis, data gathering' },
        { id: 'data',       label: 'Data Entry & Reports',   icon: '📊', defaultHours: 5,  automationRate: 0.75, description: 'Spreadsheets, dashboards, status reports' },
        { id: 'admin',      label: 'Admin & File Mgmt',      icon: '📁', defaultHours: 4,  automationRate: 0.70, description: 'Filing, organizing, document management' },
        { id: 'coding',     label: 'Dev & Code Tasks',       icon: '💻', defaultHours: 0,  automationRate: 0.40, description: 'Boilerplate, debugging, code review assistance' }
    ];

    var PLANS = [
        { id: 'starter',    label: 'Starter',    monthlyPerSeat: 29,  maxSeats: 1  },
        { id: 'pro',        label: 'Pro',         monthlyPerSeat: 49,  maxSeats: 10 },
        { id: 'team',       label: 'Team',        monthlyPerSeat: 39,  maxSeats: 50 },
        { id: 'enterprise', label: 'Enterprise',  monthlyPerSeat: 29,  maxSeats: Infinity }
    ];

    var ANNUAL_DISCOUNT = 0.20; // 20% off for annual billing

    /**
     * Find the best-fit plan for a given team size.
     */
    function recommendPlan(teamSize) {
        if (teamSize <= 1) return PLANS[0];
        if (teamSize <= 10) return PLANS[1];
        if (teamSize <= 50) return PLANS[2];
        return PLANS[3];
    }

    /**
     * Core calculation engine.
     * @param {Object} inputs
     * @param {number} inputs.teamSize - Number of team members (1+)
     * @param {number} inputs.hourlyRate - Average hourly cost per person ($)
     * @param {Object} [inputs.hoursPerWeek] - Per-category hours/week overrides { email: 8, ... }
     * @param {boolean} [inputs.annualBilling] - Use annual billing discount
     * @returns {Object} ROI analysis results
     */
    function calculate(inputs) {
        var teamSize = Math.max(1, Math.floor(inputs.teamSize || 1));
        var hourlyRate = Math.max(0, inputs.hourlyRate || 50);
        var hoursOverrides = inputs.hoursPerWeek || {};
        var annual = !!inputs.annualBilling;

        var categoryResults = [];
        var totalWeeklyHours = 0;
        var totalSavedHours = 0;

        for (var i = 0; i < CATEGORIES.length; i++) {
            var cat = CATEGORIES[i];
            var hours = typeof hoursOverrides[cat.id] === 'number' ? Math.max(0, hoursOverrides[cat.id]) : cat.defaultHours;
            var teamHours = hours * teamSize;
            var saved = teamHours * cat.automationRate;
            totalWeeklyHours += teamHours;
            totalSavedHours += saved;
            categoryResults.push({
                id: cat.id,
                label: cat.label,
                icon: cat.icon,
                weeklyHours: teamHours,
                savedHours: Math.round(saved * 10) / 10,
                automationRate: cat.automationRate,
                weeklySavings: Math.round(saved * hourlyRate * 100) / 100
            });
        }

        var weeklySavings = Math.round(totalSavedHours * hourlyRate * 100) / 100;
        var monthlySavings = Math.round(weeklySavings * 4.33 * 100) / 100;
        var annualSavings = Math.round(weeklySavings * 52 * 100) / 100;

        var plan = recommendPlan(teamSize);
        var monthlyPlanCost = plan.monthlyPerSeat * teamSize;
        if (annual) {
            monthlyPlanCost = Math.round(monthlyPlanCost * (1 - ANNUAL_DISCOUNT) * 100) / 100;
        }
        var annualPlanCost = Math.round(monthlyPlanCost * 12 * 100) / 100;

        var netMonthlySavings = Math.round((monthlySavings - monthlyPlanCost) * 100) / 100;
        var netAnnualSavings = Math.round((annualSavings - annualPlanCost) * 100) / 100;
        var roi = annualPlanCost > 0 ? Math.round((netAnnualSavings / annualPlanCost) * 100) : 0;
        var paybackDays = monthlySavings > 0 ? Math.round((monthlyPlanCost / monthlySavings) * 30) : Infinity;

        return {
            teamSize: teamSize,
            hourlyRate: hourlyRate,
            annualBilling: annual,
            categories: categoryResults,
            totalWeeklyHours: totalWeeklyHours,
            totalSavedHours: Math.round(totalSavedHours * 10) / 10,
            weeklySavings: weeklySavings,
            monthlySavings: monthlySavings,
            annualSavings: annualSavings,
            plan: { id: plan.id, label: plan.label, monthlyPerSeat: plan.monthlyPerSeat },
            monthlyPlanCost: monthlyPlanCost,
            annualPlanCost: annualPlanCost,
            netMonthlySavings: netMonthlySavings,
            netAnnualSavings: netAnnualSavings,
            roiPercent: roi,
            paybackDays: paybackDays
        };
    }

    /**
     * Format a number as currency.
     */
    function formatCurrency(n) {
        if (n >= 1000) return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
        return '$' + n.toFixed(2);
    }

    /**
     * Render the ROI calculator into a container element.
     * @param {string|Element} container - CSS selector or element
     */
    function render(container) {
        var el = typeof container === 'string'
            ? (typeof document !== 'undefined' ? document.querySelector(container) : null)
            : container;
        if (!el) return;

        // State
        var state = {
            teamSize: 5,
            hourlyRate: 75,
            hoursPerWeek: {},
            annualBilling: false
        };

        function rebuild() {
            var result = calculate({
                teamSize: state.teamSize,
                hourlyRate: state.hourlyRate,
                hoursPerWeek: state.hoursPerWeek,
                annualBilling: state.annualBilling
            });

            var html = '<div class="roi-calc" role="region" aria-label="ROI Calculator">';

            // Header
            html += '<h2 class="roi-title">💰 ROI Calculator</h2>';
            html += '<p class="roi-subtitle">See how much time and money AgentBox saves your team</p>';

            // Input controls
            html += '<div class="roi-inputs">';
            html += '<div class="roi-input-group">';
            html += '<label for="roi-team">Team Size</label>';
            html += '<input type="range" id="roi-team" min="1" max="100" value="' + state.teamSize + '" aria-label="Team size">';
            html += '<span class="roi-value" data-field="team">' + state.teamSize + ' people</span>';
            html += '</div>';
            html += '<div class="roi-input-group">';
            html += '<label for="roi-rate">Avg Hourly Rate</label>';
            html += '<input type="range" id="roi-rate" min="15" max="300" step="5" value="' + state.hourlyRate + '" aria-label="Hourly rate">';
            html += '<span class="roi-value" data-field="rate">' + formatCurrency(state.hourlyRate) + '/hr</span>';
            html += '</div>';
            html += '<div class="roi-input-group roi-toggle-group">';
            html += '<label class="roi-billing-label">';
            html += '<input type="checkbox" id="roi-annual" ' + (state.annualBilling ? 'checked' : '') + '>';
            html += ' Annual billing <span class="roi-discount-badge">Save 20%</span>';
            html += '</label>';
            html += '</div>';
            html += '</div>';

            // Category sliders
            html += '<div class="roi-categories">';
            html += '<h3>Weekly Hours by Category</h3>';
            for (var i = 0; i < CATEGORIES.length; i++) {
                var cat = CATEGORIES[i];
                var hrs = typeof state.hoursPerWeek[cat.id] === 'number' ? state.hoursPerWeek[cat.id] : cat.defaultHours;
                html += '<div class="roi-cat-row" data-cat="' + cat.id + '">';
                html += '<span class="roi-cat-icon">' + cat.icon + '</span>';
                html += '<span class="roi-cat-label">' + cat.label + '</span>';
                html += '<input type="range" min="0" max="40" value="' + hrs + '" data-cat-slider="' + cat.id + '" aria-label="' + cat.label + ' hours per week">';
                html += '<span class="roi-cat-hours">' + hrs + 'h/wk</span>';
                html += '</div>';
            }
            html += '</div>';

            // Results summary
            html += '<div class="roi-results">';
            html += '<div class="roi-result-card roi-highlight">';
            html += '<div class="roi-result-number">' + formatCurrency(result.netAnnualSavings) + '</div>';
            html += '<div class="roi-result-label">Net Annual Savings</div>';
            html += '</div>';
            html += '<div class="roi-result-card">';
            html += '<div class="roi-result-number">' + result.totalSavedHours + 'h</div>';
            html += '<div class="roi-result-label">Hours Saved / Week</div>';
            html += '</div>';
            html += '<div class="roi-result-card">';
            html += '<div class="roi-result-number">' + result.roiPercent + '%</div>';
            html += '<div class="roi-result-label">ROI</div>';
            html += '</div>';
            html += '<div class="roi-result-card">';
            html += '<div class="roi-result-number">' + (result.paybackDays === Infinity ? '—' : result.paybackDays + ' days') + '</div>';
            html += '<div class="roi-result-label">Payback Period</div>';
            html += '</div>';
            html += '</div>';

            // Category breakdown bars
            html += '<div class="roi-breakdown">';
            html += '<h3>Savings Breakdown</h3>';
            var maxSaving = 1;
            for (var j = 0; j < result.categories.length; j++) {
                if (result.categories[j].weeklySavings > maxSaving) maxSaving = result.categories[j].weeklySavings;
            }
            for (var k = 0; k < result.categories.length; k++) {
                var cr = result.categories[k];
                var pct = Math.round((cr.weeklySavings / maxSaving) * 100);
                html += '<div class="roi-bar-row">';
                html += '<span class="roi-bar-label">' + cr.icon + ' ' + cr.label + '</span>';
                html += '<div class="roi-bar-track"><div class="roi-bar-fill" style="width:' + pct + '%"></div></div>';
                html += '<span class="roi-bar-value">' + formatCurrency(cr.weeklySavings) + '/wk</span>';
                html += '</div>';
            }
            html += '</div>';

            // Plan recommendation
            html += '<div class="roi-plan">';
            html += '<p>Recommended: <strong>' + result.plan.label + '</strong> plan at ' + formatCurrency(result.monthlyPlanCost) + '/mo';
            if (result.annualBilling) html += ' (annual)';
            html += '</p>';
            html += '</div>';

            html += '</div>';
            el.innerHTML = html;

            // Bind events
            var teamSlider = el.querySelector('#roi-team');
            var rateSlider = el.querySelector('#roi-rate');
            var annualCheck = el.querySelector('#roi-annual');

            if (teamSlider) teamSlider.addEventListener('input', function () {
                state.teamSize = parseInt(this.value, 10);
                rebuild();
            });
            if (rateSlider) rateSlider.addEventListener('input', function () {
                state.hourlyRate = parseInt(this.value, 10);
                rebuild();
            });
            if (annualCheck) annualCheck.addEventListener('change', function () {
                state.annualBilling = this.checked;
                rebuild();
            });

            var catSliders = el.querySelectorAll('[data-cat-slider]');
            for (var s = 0; s < catSliders.length; s++) {
                (function (slider) {
                    slider.addEventListener('input', function () {
                        state.hoursPerWeek[slider.getAttribute('data-cat-slider')] = parseInt(slider.value, 10);
                        rebuild();
                    });
                })(catSliders[s]);
            }
        }

        rebuild();
    }

    return {
        CATEGORIES: CATEGORIES,
        PLANS: PLANS,
        ANNUAL_DISCOUNT: ANNUAL_DISCOUNT,
        calculate: calculate,
        recommendPlan: recommendPlan,
        render: render,
        formatCurrency: formatCurrency
    };
}));
