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

            // Cancel any existing timer to prevent stacking
            if (el._statsTimer) {
                clearInterval(el._statsTimer);
                el._statsTimer = null;
            }

            var frames = Math.ceil(duration / (1000 / fps));
            var current = 0;
            var step = target / frames;
            var frame = 0;
            var prev = -1;

            var timer = setInterval(function () {
                frame++;
                current = Math.min(Math.ceil(step * frame), target);

                // Ensure monotonic progression
                if (current < prev) current = prev;
                prev = current;

                numberEl.textContent = current.toLocaleString() + suffix;

                // Early exit when target reached
                if (current === target || frame >= frames) {
                    clearInterval(timer);
                    el._statsTimer = null;
                    numberEl.textContent = target.toLocaleString() + suffix;
                }
            }, 1000 / fps);

            el._statsTimer = timer;
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

    // 🎯 CommandShowcase Component ─────────────────────────────────────
    /**
     * Animated command showcase with typewriter effect.
     *
     * Cycles through example commands/prompts a user can give to AgentBox,
     * typing each one character-by-character, pausing, then erasing and
     * moving to the next. Configurable speed, pause duration, and commands.
     *
     * Usage:
     *   AgentBoxComponents.CommandShowcase.init('#commandTerminal .terminal-body');
     */
    var CommandShowcase = {
        _commands: [
            { text: 'Remind me to call mom at 5pm', icon: '\u23F0', category: 'Reminders' },
            { text: "What's on my calendar tomorrow?", icon: '\uD83D\uDCC5', category: 'Calendar' },
            { text: 'Summarize this article for me', icon: '\uD83D\uDCDD', category: 'Productivity' },
            { text: 'Find the best pizza place nearby', icon: '\uD83C\uDF55', category: 'Search' },
            { text: 'Draft a reply to that email', icon: '\u2709\uFE0F', category: 'Email' },
            { text: 'How much did I spend last week?', icon: '\uD83D\uDCB0', category: 'Memory' },
            { text: 'Set a timer for 25 minutes', icon: '\u23F1\uFE0F', category: 'Utilities' },
            { text: 'Translate this to Spanish', icon: '\uD83C\uDF0D', category: 'Language' }
        ],
        _currentIndex: 0,
        _timer: null,
        _isTyping: false,
        _isPaused: false,
        _el: null,
        _textEl: null,
        _categoryEl: null,
        _options: {
            typeSpeed: 60,
            eraseSpeed: 30,
            pauseAfterType: 2000,
            pauseAfterErase: 500
        },

        getCommands: function () {
            return CommandShowcase._commands.slice();
        },

        setCommands: function (cmds) {
            if (!Array.isArray(cmds) || cmds.length === 0) return;
            CommandShowcase._commands = cmds;
            CommandShowcase._currentIndex = 0;
        },

        getCurrentIndex: function () {
            return CommandShowcase._currentIndex;
        },

        isAnimating: function () {
            return CommandShowcase._timer !== null;
        },

        isPaused: function () {
            return CommandShowcase._isPaused;
        },

        pause: function () {
            CommandShowcase._isPaused = true;
        },

        resume: function () {
            if (!CommandShowcase._isPaused) return;
            CommandShowcase._isPaused = false;
            if (!CommandShowcase._timer) {
                CommandShowcase._cycle();
            }
        },

        skipTo: function (index) {
            if (index < 0 || index >= CommandShowcase._commands.length) return;
            if (CommandShowcase._timer) {
                clearTimeout(CommandShowcase._timer);
                CommandShowcase._timer = null;
            }
            CommandShowcase._currentIndex = index;
            CommandShowcase._isTyping = false;
            CommandShowcase._cycle();
        },

        _typeText: function (text, onDone) {
            var i = 0;
            CommandShowcase._isTyping = true;
            var step = function () {
                if (i <= text.length) {
                    if (CommandShowcase._textEl) {
                        CommandShowcase._textEl.textContent = text.substring(0, i);
                    }
                    i++;
                    CommandShowcase._timer = setTimeout(step, CommandShowcase._options.typeSpeed);
                } else {
                    CommandShowcase._isTyping = false;
                    CommandShowcase._timer = null;
                    if (onDone) onDone();
                }
            };
            step();
        },

        _eraseText: function (onDone) {
            var text = CommandShowcase._textEl ? CommandShowcase._textEl.textContent : '';
            var i = text.length;
            var step = function () {
                if (i >= 0) {
                    if (CommandShowcase._textEl) {
                        CommandShowcase._textEl.textContent = text.substring(0, i);
                    }
                    i--;
                    CommandShowcase._timer = setTimeout(step, CommandShowcase._options.eraseSpeed);
                } else {
                    CommandShowcase._timer = null;
                    if (onDone) onDone();
                }
            };
            step();
        },

        _cycle: function () {
            if (CommandShowcase._isPaused) return;
            var cmd = CommandShowcase._commands[CommandShowcase._currentIndex];
            if (!cmd) return;

            if (CommandShowcase._categoryEl) {
                CommandShowcase._categoryEl.textContent = cmd.icon + ' ' + cmd.category;
            }

            CommandShowcase._typeText(cmd.text, function () {
                if (CommandShowcase._isPaused) return;
                CommandShowcase._timer = setTimeout(function () {
                    CommandShowcase._eraseText(function () {
                        if (CommandShowcase._isPaused) return;
                        CommandShowcase._currentIndex =
                            (CommandShowcase._currentIndex + 1) % CommandShowcase._commands.length;
                        CommandShowcase._timer = setTimeout(function () {
                            CommandShowcase._cycle();
                        }, CommandShowcase._options.pauseAfterErase);
                    });
                }, CommandShowcase._options.pauseAfterType);
            });
        },

        stop: function () {
            if (CommandShowcase._timer) {
                clearTimeout(CommandShowcase._timer);
                CommandShowcase._timer = null;
            }
            CommandShowcase._isTyping = false;
            CommandShowcase._isPaused = false;
        },

        reset: function () {
            CommandShowcase.stop();
            CommandShowcase._currentIndex = 0;
            if (CommandShowcase._textEl) {
                CommandShowcase._textEl.textContent = '';
            }
            if (CommandShowcase._categoryEl) {
                CommandShowcase._categoryEl.textContent = '';
            }
        },

        init: function (container, options) {
            var el = typeof container === 'string' ? qs(container) : container;
            if (!el) return;

            CommandShowcase._el = el;

            if (options) {
                if (options.typeSpeed) CommandShowcase._options.typeSpeed = options.typeSpeed;
                if (options.eraseSpeed) CommandShowcase._options.eraseSpeed = options.eraseSpeed;
                if (options.pauseAfterType) CommandShowcase._options.pauseAfterType = options.pauseAfterType;
                if (options.pauseAfterErase) CommandShowcase._options.pauseAfterErase = options.pauseAfterErase;
                if (options.commands) CommandShowcase.setCommands(options.commands);
            }

            if (!el.querySelector('.command-text')) {
                el.innerHTML =
                    '<div class="command-prompt">' +
                        '<span class="command-arrow">\u203A</span> ' +
                        '<span class="command-text"></span>' +
                        '<span class="command-cursor" aria-hidden="true">|</span>' +
                    '</div>' +
                    '<div class="command-category" aria-live="polite"></div>';
            }

            CommandShowcase._textEl = el.querySelector('.command-text');
            CommandShowcase._categoryEl = el.querySelector('.command-category');
            CommandShowcase._currentIndex = 0;

            CommandShowcase._cycle();
        }
    };

    // ── Public API ────────────────────────────────────────────────────

    return {
        CommandShowcase: CommandShowcase,
        FAQ: FAQ,
        Pricing: Pricing,
        Stats: Stats,
        VERSION: '1.0.0'
    };
}));
