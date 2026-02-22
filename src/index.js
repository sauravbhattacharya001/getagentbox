/**
 * AgentBox Landing Page Components
 *
 * Reusable interactive components from the AgentBox landing page.
 * Works as both a Node.js/CommonJS module and a browser global.
 *
 * Components:
 *   - ChatDemo:     Animated chat conversation player
 *   - Testimonials: Auto-rotating testimonial carousel
 *   - Pricing:      Monthly/yearly billing toggle
 *   - FAQ:          Accessible accordion
 *   - HowItWorks:   Scroll-triggered step animations
 *   - Stats:        Animated counter display
 */

(function (root, factory) {
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = factory();
    } else if (typeof define === 'function' && define.amd) {
        define(factory);
    } else {
        var lib = factory();
        root.AgentBoxComponents = lib;
    }
}(typeof globalThis !== 'undefined' ? globalThis : typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    /**
     * Safely query the DOM. Returns null in non-browser environments.
     * @param {string} selector CSS selector
     * @returns {Element|null}
     */
    function qs(selector) {
        return typeof document !== 'undefined' ? document.querySelector(selector) : null;
    }

    /**
     * Safely query all matching DOM elements.
     * @param {string} selector CSS selector
     * @returns {NodeList|Array}
     */
    function qsa(selector) {
        return typeof document !== 'undefined' ? document.querySelectorAll(selector) : [];
    }

    // ── FAQ Component ─────────────────────────────────────────────────

    /**
     * Accessible accordion FAQ component.
     * Expects `.faq-item` containers with `.faq-question` (has role="button",
     * tabindex="0", aria-expanded) and `.faq-answer` children.
     *
     * @example
     * AgentBoxComponents.FAQ.init('.faq-section');
     */
    var FAQ = {
        /**
         * Initialize FAQ accordion on a container.
         * @param {string|Element} container - CSS selector or DOM element
         */
        init: function (container) {
            var el = typeof container === 'string' ? qs(container) : container;
            if (!el) return;

            el.addEventListener('click', function (e) {
                var question = e.target.closest('.faq-question');
                if (question) FAQ.toggle(question);
            });
            el.addEventListener('keydown', function (e) {
                if (e.key === 'Enter' || e.key === ' ') {
                    var question = e.target.closest('.faq-question');
                    if (question) {
                        e.preventDefault();
                        FAQ.toggle(question);
                    }
                }
            });
        },

        /**
         * Toggle a FAQ item open/closed.
         * @param {Element} questionEl - The .faq-question element
         */
        toggle: function (questionEl) {
            var item = questionEl.closest('.faq-item');
            if (!item) return;

            var wasOpen = item.classList.contains('open');

            // Close all siblings
            var siblings = item.parentElement ? item.parentElement.querySelectorAll('.faq-item') : [];
            for (var i = 0; i < siblings.length; i++) {
                siblings[i].classList.remove('open');
                var q = siblings[i].querySelector('.faq-question');
                if (q) q.setAttribute('aria-expanded', 'false');
            }

            // Toggle current
            if (!wasOpen) {
                item.classList.add('open');
                questionEl.setAttribute('aria-expanded', 'true');
            }
        }
    };

    // ── Pricing Component ─────────────────────────────────────────────

    /**
     * Monthly/yearly billing toggle for pricing cards.
     * Cards must have `data-monthly` and `data-yearly` attributes.
     *
     * @example
     * AgentBoxComponents.Pricing.init('.billing-toggle');
     */
    var Pricing = {
        _isYearly: false,

        /**
         * Initialize pricing toggle.
         * @param {string|Element} toggleBtn - CSS selector or DOM element for the toggle
         */
        init: function (toggleBtn) {
            var btn = typeof toggleBtn === 'string' ? qs(toggleBtn) : toggleBtn;
            if (!btn) return;

            btn.addEventListener('click', Pricing.toggle);
            btn.addEventListener('keydown', function (e) {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    Pricing.toggle();
                }
            });
        },

        /**
         * Toggle between monthly and yearly pricing.
         */
        toggle: function () {
            Pricing._isYearly = !Pricing._isYearly;
            var cards = qsa('.pricing-card');
            var attr = Pricing._isYearly ? 'data-yearly' : 'data-monthly';
            var period = Pricing._isYearly ? '/month (billed yearly)' : '/month';

            for (var i = 0; i < cards.length; i++) {
                var price = cards[i].getAttribute(attr);
                var priceEl = cards[i].querySelector('.price-value');
                var periodEl = cards[i].querySelector('.price-period');
                if (priceEl && price) priceEl.textContent = '$' + price;
                if (periodEl) periodEl.textContent = period;
            }

            var toggle = qs('.billing-toggle');
            if (toggle) {
                toggle.classList.toggle('yearly', Pricing._isYearly);
            }
        },

        /**
         * Check if yearly billing is active.
         * @returns {boolean}
         */
        isYearly: function () {
            return Pricing._isYearly;
        }
    };

    // ── Stats Component ───────────────────────────────────────────────

    /**
     * Animated counter display for social proof stats.
     * Elements must have `data-count` attribute with the target number.
     *
     * @example
     * AgentBoxComponents.Stats.animate('.stat');
     */
    var Stats = {
        /**
         * Animate all stat counters within a container.
         * @param {string|Element} container - CSS selector or DOM element
         * @param {Object} [options] - Animation options
         * @param {number} [options.duration=2000] - Animation duration in ms
         * @param {number} [options.fps=60] - Frames per second
         */
        animate: function (container, options) {
            var el = typeof container === 'string' ? qs(container) : container;
            if (!el) return;

            var opts = options || {};
            var duration = opts.duration || 2000;
            var fps = opts.fps || 60;

            var stats = el.querySelectorAll('[data-count]');
            for (var i = 0; i < stats.length; i++) {
                Stats._animateSingle(stats[i], duration, fps);
            }
        },

        _animateSingle: function (el, duration, fps) {
            var target = parseInt(el.getAttribute('data-count'), 10);
            var suffix = el.getAttribute('data-suffix') || '';
            var numberEl = el.querySelector('.stat-number') || el;
            if (isNaN(target)) return;

            var frames = Math.ceil(duration / (1000 / fps));
            var current = 0;
            var step = target / frames;
            var frame = 0;

            var timer = setInterval(function () {
                frame++;
                current = Math.min(Math.round(step * frame), target);
                numberEl.textContent = current.toLocaleString() + suffix;
                if (frame >= frames) {
                    clearInterval(timer);
                    numberEl.textContent = target.toLocaleString() + suffix;
                }
            }, 1000 / fps);
        },

        /**
         * Initialize stats with IntersectionObserver (animate on scroll into view).
         * @param {string|Element} container - CSS selector or DOM element
         * @param {Object} [options] - Animation options
         */
        init: function (container, options) {
            var el = typeof container === 'string' ? qs(container) : container;
            if (!el) return;

            if (typeof IntersectionObserver === 'undefined') {
                Stats.animate(container, options);
                return;
            }

            var observer = new IntersectionObserver(function (entries) {
                entries.forEach(function (entry) {
                    if (entry.isIntersecting) {
                        Stats.animate(entry.target, options);
                        observer.unobserve(entry.target);
                    }
                });
            }, { threshold: 0.3 });

            observer.observe(el);
        }
    };

    // ── Public API ────────────────────────────────────────────────────

    return {
        FAQ: FAQ,
        Pricing: Pricing,
        Stats: Stats,
        VERSION: '1.0.0'
    };
}));
