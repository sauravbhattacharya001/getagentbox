/**
 * @jest-environment jsdom
 */

const lib = require('../src/index');

describe('AgentBoxComponents library', () => {
    describe('module exports', () => {
        test('exports FAQ, Pricing, Stats, VERSION', () => {
            expect(lib.FAQ).toBeDefined();
            expect(lib.Pricing).toBeDefined();
            expect(lib.Stats).toBeDefined();
            expect(lib.VERSION).toBe('1.0.0');
        });

        test('FAQ has init and toggle methods', () => {
            expect(typeof lib.FAQ.init).toBe('function');
            expect(typeof lib.FAQ.toggle).toBe('function');
        });

        test('Pricing has init, toggle, isYearly methods', () => {
            expect(typeof lib.Pricing.init).toBe('function');
            expect(typeof lib.Pricing.toggle).toBe('function');
            expect(typeof lib.Pricing.isYearly).toBe('function');
        });

        test('Stats has init and animate methods', () => {
            expect(typeof lib.Stats.init).toBe('function');
            expect(typeof lib.Stats.animate).toBe('function');
        });
    });

    describe('FAQ', () => {
        beforeEach(() => {
            document.body.innerHTML = `
                <div class="faq-section">
                    <div class="faq-item">
                        <div class="faq-question" role="button" tabindex="0" aria-expanded="false">
                            <span>Question 1</span>
                            <span class="faq-toggle" aria-hidden="true">+</span>
                        </div>
                        <div class="faq-answer"><p>Answer 1</p></div>
                    </div>
                    <div class="faq-item">
                        <div class="faq-question" role="button" tabindex="0" aria-expanded="false">
                            <span>Question 2</span>
                            <span class="faq-toggle" aria-hidden="true">+</span>
                        </div>
                        <div class="faq-answer"><p>Answer 2</p></div>
                    </div>
                    <div class="faq-item">
                        <div class="faq-question" role="button" tabindex="0" aria-expanded="false">
                            <span>Question 3</span>
                            <span class="faq-toggle" aria-hidden="true">+</span>
                        </div>
                        <div class="faq-answer"><p>Answer 3</p></div>
                    </div>
                </div>
            `;
        });

        test('toggle opens a FAQ item', () => {
            const question = document.querySelector('.faq-question');
            lib.FAQ.toggle(question);

            const item = question.closest('.faq-item');
            expect(item.classList.contains('open')).toBe(true);
            expect(question.getAttribute('aria-expanded')).toBe('true');
        });

        test('toggle closes an open item', () => {
            const question = document.querySelector('.faq-question');

            // Open
            lib.FAQ.toggle(question);
            expect(question.closest('.faq-item').classList.contains('open')).toBe(true);

            // Close
            lib.FAQ.toggle(question);
            expect(question.closest('.faq-item').classList.contains('open')).toBe(false);
            expect(question.getAttribute('aria-expanded')).toBe('false');
        });

        test('opening one item closes others', () => {
            const questions = document.querySelectorAll('.faq-question');

            lib.FAQ.toggle(questions[0]);
            expect(questions[0].closest('.faq-item').classList.contains('open')).toBe(true);

            lib.FAQ.toggle(questions[1]);
            expect(questions[0].closest('.faq-item').classList.contains('open')).toBe(false);
            expect(questions[1].closest('.faq-item').classList.contains('open')).toBe(true);
        });

        test('init sets up click handler', () => {
            lib.FAQ.init('.faq-section');

            const question = document.querySelector('.faq-question');
            question.click();

            expect(question.closest('.faq-item').classList.contains('open')).toBe(true);
        });

        test('init sets up keyboard handler', () => {
            lib.FAQ.init('.faq-section');

            const question = document.querySelector('.faq-question');
            const event = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true });
            question.dispatchEvent(event);

            expect(question.closest('.faq-item').classList.contains('open')).toBe(true);
        });

        test('init with Space key works', () => {
            lib.FAQ.init('.faq-section');

            const question = document.querySelectorAll('.faq-question')[1];
            const event = new KeyboardEvent('keydown', { key: ' ', bubbles: true });
            question.dispatchEvent(event);

            expect(question.closest('.faq-item').classList.contains('open')).toBe(true);
        });

        test('init with non-matching selector does not throw', () => {
            expect(() => lib.FAQ.init('.nonexistent')).not.toThrow();
        });

        test('init accepts DOM element directly', () => {
            const el = document.querySelector('.faq-section');
            lib.FAQ.init(el);

            const question = document.querySelector('.faq-question');
            question.click();
            expect(question.closest('.faq-item').classList.contains('open')).toBe(true);
        });

        test('toggle with element outside faq-item does nothing', () => {
            const div = document.createElement('div');
            document.body.appendChild(div);
            expect(() => lib.FAQ.toggle(div)).not.toThrow();
        });
    });

    describe('Pricing', () => {
        beforeEach(() => {
            lib.Pricing._isYearly = false;
            document.body.innerHTML = `
                <button class="billing-toggle">Toggle</button>
                <div class="pricing-card" data-monthly="9.99" data-yearly="7.99">
                    <span class="price-value">$9.99</span>
                    <span class="price-period">/month</span>
                </div>
                <div class="pricing-card" data-monthly="19.99" data-yearly="15.99">
                    <span class="price-value">$19.99</span>
                    <span class="price-period">/month</span>
                </div>
            `;
        });

        test('toggle switches to yearly pricing', () => {
            lib.Pricing.toggle();

            const values = document.querySelectorAll('.price-value');
            expect(values[0].textContent).toBe('$7.99');
            expect(values[1].textContent).toBe('$15.99');
            expect(lib.Pricing.isYearly()).toBe(true);
        });

        test('toggle switches back to monthly', () => {
            lib.Pricing.toggle(); // to yearly
            lib.Pricing.toggle(); // back to monthly

            const values = document.querySelectorAll('.price-value');
            expect(values[0].textContent).toBe('$9.99');
            expect(values[1].textContent).toBe('$19.99');
            expect(lib.Pricing.isYearly()).toBe(false);
        });

        test('toggle updates period text', () => {
            lib.Pricing.toggle();

            const periods = document.querySelectorAll('.price-period');
            expect(periods[0].textContent).toContain('billed yearly');
        });

        test('toggle adds yearly class to toggle button', () => {
            lib.Pricing.toggle();

            const btn = document.querySelector('.billing-toggle');
            expect(btn.classList.contains('yearly')).toBe(true);
        });

        test('init sets up click handler', () => {
            lib.Pricing.init('.billing-toggle');

            document.querySelector('.billing-toggle').click();
            expect(lib.Pricing.isYearly()).toBe(true);
        });

        test('init sets up keyboard handler', () => {
            lib.Pricing.init('.billing-toggle');

            const btn = document.querySelector('.billing-toggle');
            const event = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true });
            btn.dispatchEvent(event);

            expect(lib.Pricing.isYearly()).toBe(true);
        });

        test('init with non-matching selector does not throw', () => {
            expect(() => lib.Pricing.init('.nonexistent')).not.toThrow();
        });

        test('isYearly returns current state', () => {
            expect(lib.Pricing.isYearly()).toBe(false);
            lib.Pricing.toggle();
            expect(lib.Pricing.isYearly()).toBe(true);
        });
    });

    describe('Stats', () => {
        beforeEach(() => {
            jest.useFakeTimers();
            document.body.innerHTML = `
                <div class="stats-section">
                    <div class="stat" data-count="100">
                        <div class="stat-number">0</div>
                        <div class="stat-label">Users</div>
                    </div>
                    <div class="stat" data-count="500" data-suffix="+">
                        <div class="stat-number">0</div>
                        <div class="stat-label">Downloads</div>
                    </div>
                    <div class="stat" data-count="99" data-suffix="%">
                        <div class="stat-number">0</div>
                        <div class="stat-label">Uptime</div>
                    </div>
                </div>
            `;
        });

        afterEach(() => {
            jest.useRealTimers();
        });

        test('animate counts up to target', () => {
            lib.Stats.animate('.stats-section', { duration: 100, fps: 10 });

            // Fast-forward all timers
            jest.advanceTimersByTime(200);

            const numbers = document.querySelectorAll('.stat-number');
            expect(numbers[0].textContent).toBe('100');
            expect(numbers[1].textContent).toBe('500+');
            expect(numbers[2].textContent).toBe('99%');
        });

        test('animate with non-matching selector does not throw', () => {
            expect(() => lib.Stats.animate('.nonexistent')).not.toThrow();
        });

        test('animate accepts DOM element', () => {
            const el = document.querySelector('.stats-section');
            lib.Stats.animate(el, { duration: 100, fps: 10 });
            jest.advanceTimersByTime(200);

            const number = document.querySelector('.stat-number');
            expect(number.textContent).toBe('100');
        });

        test('animate handles invalid data-count gracefully', () => {
            document.body.innerHTML = `
                <div class="container">
                    <div class="stat" data-count="abc">
                        <div class="stat-number">0</div>
                    </div>
                </div>
            `;
            expect(() => {
                lib.Stats.animate('.container', { duration: 50 });
                jest.advanceTimersByTime(100);
            }).not.toThrow();
        });

        test('numbers increase over time', () => {
            lib.Stats.animate('.stats-section', { duration: 1000, fps: 10 });

            // After 50% of duration
            jest.advanceTimersByTime(500);
            const midValue = parseInt(document.querySelector('.stat-number').textContent.replace(/,/g, ''), 10);
            expect(midValue).toBeGreaterThan(0);
            expect(midValue).toBeLessThanOrEqual(100);

            // After full duration
            jest.advanceTimersByTime(600);
            expect(document.querySelector('.stat-number').textContent).toBe('100');
        });

        test('init without IntersectionObserver falls back to animate', () => {
            const origIO = global.IntersectionObserver;
            delete global.IntersectionObserver;

            lib.Stats.init('.stats-section', { duration: 100, fps: 10 });
            jest.advanceTimersByTime(200);

            expect(document.querySelector('.stat-number').textContent).toBe('100');

            global.IntersectionObserver = origIO;
        });
    });
});
