'use strict';

var ROICalculator = require('../src/roi-calculator');

describe('ROICalculator', function () {
    describe('CATEGORIES', function () {
        test('has 6 task categories', function () {
            expect(ROICalculator.CATEGORIES).toHaveLength(6);
        });

        test('each category has required fields', function () {
            ROICalculator.CATEGORIES.forEach(function (cat) {
                expect(cat).toHaveProperty('id');
                expect(cat).toHaveProperty('label');
                expect(cat).toHaveProperty('icon');
                expect(typeof cat.defaultHours).toBe('number');
                expect(cat.automationRate).toBeGreaterThan(0);
                expect(cat.automationRate).toBeLessThanOrEqual(1);
            });
        });

        test('category ids are unique', function () {
            var ids = ROICalculator.CATEGORIES.map(function (c) { return c.id; });
            expect(new Set(ids).size).toBe(ids.length);
        });
    });

    describe('PLANS', function () {
        test('has 4 plans', function () {
            expect(ROICalculator.PLANS).toHaveLength(4);
        });

        test('each plan has monthly price per seat', function () {
            ROICalculator.PLANS.forEach(function (p) {
                expect(p.monthlyPerSeat).toBeGreaterThan(0);
            });
        });
    });

    describe('calculate()', function () {
        test('returns result with all expected fields', function () {
            var result = ROICalculator.calculate({ teamSize: 3, hourlyRate: 50 });
            expect(result).toHaveProperty('teamSize', 3);
            expect(result).toHaveProperty('hourlyRate', 50);
            expect(result).toHaveProperty('categories');
            expect(result).toHaveProperty('totalWeeklyHours');
            expect(result).toHaveProperty('totalSavedHours');
            expect(result).toHaveProperty('monthlySavings');
            expect(result).toHaveProperty('annualSavings');
            expect(result).toHaveProperty('netMonthlySavings');
            expect(result).toHaveProperty('netAnnualSavings');
            expect(result).toHaveProperty('roiPercent');
            expect(result).toHaveProperty('paybackDays');
            expect(result).toHaveProperty('plan');
        });

        test('teamSize defaults to 1 when missing', function () {
            var result = ROICalculator.calculate({ hourlyRate: 50 });
            expect(result.teamSize).toBe(1);
        });

        test('hourlyRate defaults to 50 when missing', function () {
            var result = ROICalculator.calculate({ teamSize: 2 });
            expect(result.hourlyRate).toBe(50);
        });

        test('teamSize floors to 1 for invalid input', function () {
            expect(ROICalculator.calculate({ teamSize: -5 }).teamSize).toBe(1);
            expect(ROICalculator.calculate({ teamSize: 0 }).teamSize).toBe(1);
        });

        test('saved hours scale with team size', function () {
            var r1 = ROICalculator.calculate({ teamSize: 1, hourlyRate: 50 });
            var r5 = ROICalculator.calculate({ teamSize: 5, hourlyRate: 50 });
            expect(r5.totalSavedHours).toBeGreaterThan(r1.totalSavedHours);
            expect(r5.totalSavedHours / r1.totalSavedHours).toBeCloseTo(5, 0);
        });

        test('savings scale with hourly rate', function () {
            var r50 = ROICalculator.calculate({ teamSize: 3, hourlyRate: 50 });
            var r100 = ROICalculator.calculate({ teamSize: 3, hourlyRate: 100 });
            expect(r100.weeklySavings).toBeCloseTo(r50.weeklySavings * 2, 0);
        });

        test('category hours overrides work', function () {
            var result = ROICalculator.calculate({
                teamSize: 1,
                hourlyRate: 50,
                hoursPerWeek: { email: 20, scheduling: 0 }
            });
            var emailCat = result.categories.find(function (c) { return c.id === 'email'; });
            var schedCat = result.categories.find(function (c) { return c.id === 'scheduling'; });
            expect(emailCat.weeklyHours).toBe(20);
            expect(schedCat.weeklyHours).toBe(0);
            expect(schedCat.savedHours).toBe(0);
        });

        test('annual billing reduces plan cost by 20%', function () {
            var monthly = ROICalculator.calculate({ teamSize: 5, hourlyRate: 50, annualBilling: false });
            var annual = ROICalculator.calculate({ teamSize: 5, hourlyRate: 50, annualBilling: true });
            expect(annual.monthlyPlanCost).toBeLessThan(monthly.monthlyPlanCost);
            expect(annual.monthlyPlanCost).toBeCloseTo(monthly.monthlyPlanCost * 0.8, 1);
        });

        test('ROI is positive for typical inputs', function () {
            var result = ROICalculator.calculate({ teamSize: 5, hourlyRate: 75 });
            expect(result.roiPercent).toBeGreaterThan(0);
            expect(result.netAnnualSavings).toBeGreaterThan(0);
        });

        test('payback period is reasonable', function () {
            var result = ROICalculator.calculate({ teamSize: 3, hourlyRate: 60 });
            expect(result.paybackDays).toBeGreaterThanOrEqual(0);
            expect(result.paybackDays).toBeLessThan(30);
        });

        test('zero hours across all categories yields zero savings', function () {
            var overrides = {};
            ROICalculator.CATEGORIES.forEach(function (c) { overrides[c.id] = 0; });
            var result = ROICalculator.calculate({ teamSize: 5, hourlyRate: 100, hoursPerWeek: overrides });
            expect(result.totalSavedHours).toBe(0);
            expect(result.weeklySavings).toBe(0);
        });

        test('all categories appear in results', function () {
            var result = ROICalculator.calculate({ teamSize: 1, hourlyRate: 50 });
            expect(result.categories).toHaveLength(6);
            var ids = result.categories.map(function (c) { return c.id; });
            expect(ids).toContain('email');
            expect(ids).toContain('coding');
        });

        test('category automation rates match source data', function () {
            var result = ROICalculator.calculate({ teamSize: 1, hourlyRate: 100 });
            result.categories.forEach(function (cr) {
                var src = ROICalculator.CATEGORIES.find(function (c) { return c.id === cr.id; });
                expect(cr.automationRate).toBe(src.automationRate);
            });
        });
    });

    describe('recommendPlan()', function () {
        test('returns Starter for 1 person', function () {
            expect(ROICalculator.recommendPlan(1).id).toBe('starter');
        });

        test('returns Pro for 2-10 people', function () {
            expect(ROICalculator.recommendPlan(5).id).toBe('pro');
            expect(ROICalculator.recommendPlan(10).id).toBe('pro');
        });

        test('returns Team for 11-50 people', function () {
            expect(ROICalculator.recommendPlan(25).id).toBe('team');
        });

        test('returns Enterprise for 51+', function () {
            expect(ROICalculator.recommendPlan(100).id).toBe('enterprise');
        });
    });

    describe('formatCurrency()', function () {
        test('formats small numbers with cents', function () {
            expect(ROICalculator.formatCurrency(42.5)).toBe('$42.50');
        });

        test('formats large numbers with commas', function () {
            var result = ROICalculator.formatCurrency(12500);
            expect(result).toContain('$');
            expect(result).toContain('12');
        });

        test('formats zero', function () {
            expect(ROICalculator.formatCurrency(0)).toBe('$0.00');
        });
    });

    describe('render()', function () {
        beforeEach(function () {
            document.body.innerHTML = '<div id="roi-root"></div>';
        });

        test('renders into container', function () {
            ROICalculator.render('#roi-root');
            var el = document.getElementById('roi-root');
            expect(el.querySelector('.roi-calc')).not.toBeNull();
        });

        test('renders title', function () {
            ROICalculator.render('#roi-root');
            expect(document.querySelector('.roi-title').textContent).toContain('ROI Calculator');
        });

        test('renders team size slider', function () {
            ROICalculator.render('#roi-root');
            var slider = document.getElementById('roi-team');
            expect(slider).not.toBeNull();
            expect(slider.type).toBe('range');
        });

        test('renders rate slider', function () {
            ROICalculator.render('#roi-root');
            var slider = document.getElementById('roi-rate');
            expect(slider).not.toBeNull();
        });

        test('renders annual billing toggle', function () {
            ROICalculator.render('#roi-root');
            var cb = document.getElementById('roi-annual');
            expect(cb).not.toBeNull();
            expect(cb.type).toBe('checkbox');
        });

        test('renders category sliders', function () {
            ROICalculator.render('#roi-root');
            var sliders = document.querySelectorAll('[data-cat-slider]');
            expect(sliders.length).toBe(6);
        });

        test('renders result cards', function () {
            ROICalculator.render('#roi-root');
            var cards = document.querySelectorAll('.roi-result-card');
            expect(cards.length).toBe(4);
        });

        test('renders breakdown bars', function () {
            ROICalculator.render('#roi-root');
            var bars = document.querySelectorAll('.roi-bar-row');
            expect(bars.length).toBe(6);
        });

        test('team slider updates results', function () {
            ROICalculator.render('#roi-root');
            var slider = document.getElementById('roi-team');
            slider.value = '10';
            slider.dispatchEvent(new Event('input'));
            var teamVal = document.querySelector('[data-field="team"]');
            expect(teamVal.textContent).toContain('10');
        });

        test('annual toggle updates plan cost', function () {
            ROICalculator.render('#roi-root');
            var planBefore = document.querySelector('.roi-plan').textContent;
            var cb = document.getElementById('roi-annual');
            cb.checked = true;
            cb.dispatchEvent(new Event('change'));
            var planAfter = document.querySelector('.roi-plan').textContent;
            expect(planAfter).toContain('annual');
        });

        test('category slider updates hours display', function () {
            ROICalculator.render('#roi-root');
            var slider = document.querySelector('[data-cat-slider="email"]');
            slider.value = '15';
            slider.dispatchEvent(new Event('input'));
            var hoursLabel = document.querySelector('[data-cat="email"] .roi-cat-hours');
            expect(hoursLabel.textContent).toContain('15');
        });

        test('handles missing container gracefully', function () {
            expect(function () { ROICalculator.render('#nonexistent'); }).not.toThrow();
        });

        test('renders recommended plan', function () {
            ROICalculator.render('#roi-root');
            expect(document.querySelector('.roi-plan').textContent).toContain('plan');
        });

        test('has accessible aria labels', function () {
            ROICalculator.render('#roi-root');
            var region = document.querySelector('[role="region"]');
            expect(region).not.toBeNull();
            expect(region.getAttribute('aria-label')).toContain('ROI');
        });
    });
});
