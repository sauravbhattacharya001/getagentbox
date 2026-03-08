/**
 * AgentBox Landing Page Components
 *
 * Reusable interactive components from the AgentBox landing page.
 * Works as both a Node.js/CommonJS module and a browser global.
 *
 * Components:
 *   - FAQ:      Accessible accordion
 *   - Pricing:  Monthly/yearly billing toggle
 *   - Stats:    Animated counter display
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
         * Uses requestAnimationFrame with ease-out cubic for smooth 60fps.
         * @param {string|Element} container - CSS selector or DOM element
         * @param {Object} [options] - Animation options
         * @param {number} [options.duration=2000] - Animation duration in ms
         */
        animate: function (container, options) {
            var el = typeof container === 'string' ? qs(container) : container;
            if (!el) return;

            var opts = options || {};
            var duration = opts.duration || 2000;

            var stats = el.querySelectorAll('[data-count]');
            for (var i = 0; i < stats.length; i++) {
                Stats._animateSingle(stats[i], duration);
            }
        },

        /**
         * Ease-out cubic curve for natural deceleration.
         * @param {number} t - Progress from 0 to 1
         * @returns {number} Eased value from 0 to 1
         */
        _ease: function (t) {
            return 1 - Math.pow(1 - t, 3);
        },

        _animateSingle: function (el, duration) {
            var target = parseInt(el.getAttribute('data-count'), 10);
            var suffix = el.getAttribute('data-suffix') || '';
            var numberEl = el.querySelector('.stat-number') || el;
            if (isNaN(target)) return;

            // Cancel any existing animation to prevent stacking
            if (el._statsRafId) {
                cancelAnimationFrame(el._statsRafId);
                el._statsRafId = null;
            }

            // Skip animation in non-browser environments
            if (typeof requestAnimationFrame === 'undefined') {
                numberEl.textContent = target.toLocaleString() + suffix;
                return;
            }

            var startTime = null;
            var prev = -1;

            function tick(timestamp) {
                if (!startTime) startTime = timestamp;
                var elapsed = timestamp - startTime;
                var progress = Math.min(elapsed / duration, 1);
                var current = Math.round(Stats._ease(progress) * target);

                // Ensure monotonic progression
                if (current < prev) current = prev;
                prev = current;

                if (current === target || progress >= 1) {
                    el._statsRafId = null;
                    numberEl.textContent = target.toLocaleString() + suffix;
                    return;
                }

                numberEl.textContent = current.toLocaleString() + suffix;
                el._statsRafId = requestAnimationFrame(tick);
            }

            el._statsRafId = requestAnimationFrame(tick);
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

    // ── Feedback (NPS) Component ────────────────────────────────────

    /**
     * Net Promoter Score feedback widget.
     * Persists responses in localStorage. Shows score distribution summary.
     *
     * @example
     * AgentBoxComponents.Feedback.init('#feedbackWidget');
     */
    var Feedback = {
        _STORAGE_KEY: 'agentbox_nps_feedback',
        _selectedScore: null,

        /**
         * Load all feedback entries from localStorage.
         * @returns {Array<{score: number, comment: string, timestamp: number}>}
         */
        _load: function () {
            if (typeof localStorage === 'undefined') return [];
            try {
                var raw = localStorage.getItem(Feedback._STORAGE_KEY);
                return raw ? JSON.parse(raw) : [];
            } catch (e) { return []; }
        },

        /**
         * Save feedback entries to localStorage.
         * @param {Array} entries
         */
        _save: function (entries) {
            if (typeof localStorage === 'undefined') return;
            try { localStorage.setItem(Feedback._STORAGE_KEY, JSON.stringify(entries)); } catch (e) { /* quota */ }
        },

        /**
         * Compute NPS from entries: % promoters (9-10) minus % detractors (0-6).
         * @param {Array<{score: number}>} entries
         * @returns {{count: number, avg: number|null, nps: number|null, promoters: number, passives: number, detractors: number}}
         */
        compute: function (entries) {
            // Filter out entries with invalid scores (NaN, non-finite, out of 0-10 range)
            // to prevent corrupted localStorage data from poisoning calculations.
            var valid = [];
            for (var i = 0; i < entries.length; i++) {
                var score = entries[i].score;
                if (typeof score === 'number' && isFinite(score) && score >= 0 && score <= 10) {
                    valid.push(entries[i]);
                }
            }
            var count = valid.length;
            if (count === 0) return { count: 0, avg: null, nps: null, promoters: 0, passives: 0, detractors: 0 };

            var sum = 0, promoters = 0, passives = 0, detractors = 0;
            for (var i = 0; i < count; i++) {
                var s = valid[i].score;
                sum += s;
                if (s >= 9) promoters++;
                else if (s >= 7) passives++;
                else detractors++;
            }

            var avg = Math.round((sum / count) * 10) / 10;
            var nps = Math.round(((promoters - detractors) / count) * 100);
            return { count: count, avg: avg, nps: nps, promoters: promoters, passives: passives, detractors: detractors };
        },

        /**
         * Get the category label for a score.
         * @param {number} score
         * @returns {string} 'detractor' | 'passive' | 'promoter'
         */
        classify: function (score) {
            if (score >= 9) return 'promoter';
            if (score >= 7) return 'passive';
            return 'detractor';
        },

        /**
         * Initialize the feedback widget.
         * @param {string|Element} container - CSS selector or DOM element
         */
        init: function (container) {
            var el = typeof container === 'string' ? qs(container) : container;
            if (!el) return;

            var scale = el.querySelector('#npsScale') || el.querySelector('.nps-scale');
            var commentArea = el.querySelector('#feedbackCommentArea') || el.querySelector('.feedback-comment-area');
            var submitBtn = el.querySelector('#feedbackSubmit') || el.querySelector('.feedback-submit-btn');
            var thanksEl = el.querySelector('#feedbackThanks') || el.querySelector('.feedback-thanks');
            var resetBtn = el.querySelector('#feedbackReset') || el.querySelector('.feedback-reset-btn');
            var detailEl = el.querySelector('#feedbackThanksDetail') || el.querySelector('.feedback-thanks-detail');

            Feedback._selectedScore = null;
            Feedback._updateSummary(el);

            if (scale) {
                scale.addEventListener('click', function (e) {
                    var btn = e.target.closest('.nps-btn');
                    if (!btn) return;

                    var score = parseInt(btn.getAttribute('data-score'), 10);
                    if (isNaN(score) || score < 0 || score > 10) return;

                    Feedback._selectedScore = score;

                    // Highlight selected
                    var btns = scale.querySelectorAll('.nps-btn');
                    for (var i = 0; i < btns.length; i++) {
                        btns[i].classList.remove('selected');
                        var s = parseInt(btns[i].getAttribute('data-score'), 10);
                        btns[i].classList.toggle('in-range', s <= score);
                    }
                    btn.classList.add('selected');

                    // Show comment area
                    if (commentArea) commentArea.hidden = false;
                });
            }

            if (submitBtn) {
                submitBtn.addEventListener('click', function () {
                    if (Feedback._selectedScore === null) return;

                    var commentEl = el.querySelector('#feedbackComment') || el.querySelector('.feedback-textarea');
                    var comment = commentEl ? commentEl.value.trim() : '';

                    var entry = { score: Feedback._selectedScore, comment: comment, timestamp: Date.now() };
                    var entries = Feedback._load();
                    entries.push(entry);
                    Feedback._save(entries);

                    // Show thanks
                    if (scale) scale.hidden = true;
                    var labelsEl = el.querySelector('.nps-labels');
                    if (labelsEl) labelsEl.hidden = true;
                    if (commentArea) commentArea.hidden = true;
                    if (thanksEl) thanksEl.hidden = false;

                    var cat = Feedback.classify(entry.score);
                    var messages = {
                        promoter: "We're thrilled you love AgentBox! 🚀",
                        passive: "Thanks! We'll keep improving to earn that 9 or 10.",
                        detractor: "We appreciate your honesty. We'll work to do better."
                    };
                    if (detailEl) detailEl.textContent = messages[cat] || '';

                    Feedback._updateSummary(el);
                });
            }

            if (resetBtn) {
                resetBtn.addEventListener('click', function () {
                    Feedback._selectedScore = null;

                    if (scale) {
                        scale.hidden = false;
                        var btns = scale.querySelectorAll('.nps-btn');
                        for (var i = 0; i < btns.length; i++) {
                            btns[i].classList.remove('selected', 'in-range');
                        }
                    }
                    var labelsEl = el.querySelector('.nps-labels');
                    if (labelsEl) labelsEl.hidden = false;
                    if (commentArea) {
                        commentArea.hidden = true;
                        var commentEl = el.querySelector('#feedbackComment') || el.querySelector('.feedback-textarea');
                        if (commentEl) commentEl.value = '';
                    }
                    if (thanksEl) thanksEl.hidden = true;
                });
            }
        },

        /**
         * Update the summary stats display.
         * @param {Element} container
         */
        _updateSummary: function (container) {
            var entries = Feedback._load();
            var stats = Feedback.compute(entries);

            var countEl = container.querySelector('#feedbackCount') || container.querySelector('.feedback-stat-number');
            var avgEl = container.querySelector('#feedbackAvg');
            var npsEl = container.querySelector('#feedbackNps');

            if (countEl) countEl.textContent = stats.count;
            if (avgEl) avgEl.textContent = stats.avg !== null ? stats.avg.toFixed(1) : '—';
            if (npsEl) npsEl.textContent = stats.nps !== null ? (stats.nps > 0 ? '+' : '') + stats.nps : '—';
        },

        /**
         * Export all feedback entries.
         * @returns {Array<{score: number, comment: string, timestamp: number}>}
         */
        export: function () {
            return Feedback._load();
        },

        /**
         * Clear all feedback data.
         */
        clear: function () {
            Feedback._save([]);
        }
    };

    // ── Public API ────────────────────────────────────────────────────

    return {
        FAQ: FAQ,
        Pricing: Pricing,
        Stats: Stats,
        Feedback: Feedback,
        VERSION: '1.0.0'
    };
}));
