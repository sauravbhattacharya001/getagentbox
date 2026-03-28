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
        var abs = Math.abs(n);
        var prefix = n < 0 ? '-$' : '$';
        if (abs >= 1000) return prefix + abs.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
        return prefix + abs.toFixed(2);
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

        /**
         * Build the initial DOM once, then use updateResults() for fast
         * incremental updates.  The previous implementation called
         * el.innerHTML on every slider input event, which destroyed and
         * recreated the entire DOM tree (including all event listeners)
         * ~60 times per second while a user drags a slider.
         */
        function buildInitialDOM() {
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
                html += '<span class="roi-cat-hours" data-cat-display="' + cat.id + '">' + hrs + 'h/wk</span>';
                html += '</div>';
            }
            html += '</div>';

            // Results summary (use data attributes for targeted updates)
            html += '<div class="roi-results">';
            html += '<div class="roi-result-card roi-highlight">';
            html += '<div class="roi-result-number" data-result="netAnnualSavings"></div>';
            html += '<div class="roi-result-label">Net Annual Savings</div>';
            html += '</div>';
            html += '<div class="roi-result-card">';
            html += '<div class="roi-result-number" data-result="savedHours"></div>';
            html += '<div class="roi-result-label">Hours Saved / Week</div>';
            html += '</div>';
            html += '<div class="roi-result-card">';
            html += '<div class="roi-result-number" data-result="roi"></div>';
            html += '<div class="roi-result-label">ROI</div>';
            html += '</div>';
            html += '<div class="roi-result-card">';
            html += '<div class="roi-result-number" data-result="payback"></div>';
            html += '<div class="roi-result-label">Payback Period</div>';
            html += '</div>';
            html += '</div>';

            // Category breakdown bars
            html += '<div class="roi-breakdown">';
            html += '<h3>Savings Breakdown</h3>';
            for (var k = 0; k < CATEGORIES.length; k++) {
                var c = CATEGORIES[k];
                html += '<div class="roi-bar-row">';
                html += '<span class="roi-bar-label">' + c.icon + ' ' + c.label + '</span>';
                html += '<div class="roi-bar-track"><div class="roi-bar-fill" data-bar="' + c.id + '" style="width:0%"></div></div>';
                html += '<span class="roi-bar-value" data-bar-value="' + c.id + '"></span>';
                html += '</div>';
            }
            html += '</div>';

            // Plan recommendation
            html += '<div class="roi-plan" data-result="plan"></div>';

            html += '</div>';
            el.innerHTML = html;

            // Bind events once (not on every update)
            var teamSlider = el.querySelector('#roi-team');
            var rateSlider = el.querySelector('#roi-rate');
            var annualCheck = el.querySelector('#roi-annual');

            if (teamSlider) teamSlider.addEventListener('input', function () {
                state.teamSize = parseInt(this.value, 10);
                el.querySelector('[data-field="team"]').textContent = state.teamSize + ' people';
                updateResults();
            });
            if (rateSlider) rateSlider.addEventListener('input', function () {
                state.hourlyRate = parseInt(this.value, 10);
                el.querySelector('[data-field="rate"]').textContent = formatCurrency(state.hourlyRate) + '/hr';
                updateResults();
            });
            if (annualCheck) annualCheck.addEventListener('change', function () {
                state.annualBilling = this.checked;
                updateResults();
            });

            var catSliders = el.querySelectorAll('[data-cat-slider]');
            for (var s = 0; s < catSliders.length; s++) {
                (function (slider) {
                    slider.addEventListener('input', function () {
                        var catId = slider.getAttribute('data-cat-slider');
                        var val = parseInt(slider.value, 10);
                        state.hoursPerWeek[catId] = val;
                        var display = el.querySelector('[data-cat-display="' + catId + '"]');
                        if (display) display.textContent = val + 'h/wk';
                        updateResults();
                    });
                })(catSliders[s]);
            }
        }

        /**
         * Fast incremental update — only touches the result text nodes and
         * bar widths.  No DOM destruction, no innerHTML, no re-binding.
         */
        function updateResults() {
            var result = calculate({
                teamSize: state.teamSize,
                hourlyRate: state.hourlyRate,
                hoursPerWeek: state.hoursPerWeek,
                annualBilling: state.annualBilling
            });

            // Update result cards
            var n;
            n = el.querySelector('[data-result="netAnnualSavings"]');
            if (n) n.textContent = formatCurrency(result.netAnnualSavings);
            n = el.querySelector('[data-result="savedHours"]');
            if (n) n.textContent = result.totalSavedHours + 'h';
            n = el.querySelector('[data-result="roi"]');
            if (n) n.textContent = result.roiPercent + '%';
            n = el.querySelector('[data-result="payback"]');
            if (n) n.textContent = result.paybackDays === Infinity ? '—' : result.paybackDays + ' days';

            // Update breakdown bars
            var maxSaving = 1;
            for (var j = 0; j < result.categories.length; j++) {
                if (result.categories[j].weeklySavings > maxSaving) maxSaving = result.categories[j].weeklySavings;
            }
            for (var k = 0; k < result.categories.length; k++) {
                var cr = result.categories[k];
                var pct = Math.round((cr.weeklySavings / maxSaving) * 100);
                var bar = el.querySelector('[data-bar="' + cr.id + '"]');
                if (bar) bar.style.width = pct + '%';
                var val = el.querySelector('[data-bar-value="' + cr.id + '"]');
                if (val) val.textContent = formatCurrency(cr.weeklySavings) + '/wk';
            }

            // Update plan recommendation
            var planEl = el.querySelector('[data-result="plan"]');
            if (planEl) {
                var planText = 'Recommended: <strong>' + result.plan.label + '</strong> plan at ' + formatCurrency(result.monthlyPlanCost) + '/mo';
                if (result.annualBilling) planText += ' (annual)';
                planEl.innerHTML = '<p>' + planText + '</p>';
            }
        }

        buildInitialDOM();
        updateResults();
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
