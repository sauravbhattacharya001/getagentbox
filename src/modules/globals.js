/**
 * AgentBox Landing Page - Interactive Components
 *
 * Architecture:
 *   Each module is a self-contained IIFE exposing a public API via
 *   return object.  All DOM wiring happens in the DOMContentLoaded
 *   block.  Shared utilities (arrowKeyNav, activateOnKeyboard,
 *   prefersReducedMotion) are defined at the top level.
 *
 * Modules:
 *  - ChatDemo:                 animated chat scenario player
 *  - Testimonials:             auto-rotating testimonials carousel
 *  - Pricing:                  monthly/yearly billing toggle
 *  - FAQ:                      accordion behaviour
 *  - HowItWorks:               scroll-triggered step animations
 *  - Stats:                    animated social proof counters
 *  - UseCases:                 tabbed section with keyboard nav
 *  - Integrations:             category-filtered integration grid
 *  - Changelog:                tag-filtered changelog entries
 *  - Trust:                    expandable privacy detail cards
 *  - SiteNav:                  sticky nav bar with scroll spy
 *  - Newsletter:               signup form with email validation
 *  - Roadmap:                  product roadmap with voting + filters
 *  - StatusDashboard:          service health monitoring panel
 *  - Calculator:               interactive time-saved calculator
 *  - CommandPalette:           Ctrl+K quick section navigation
 *  - ShareFab:                 floating share button with link copy
 *  - ThemeToggle:              dark/light theme switch
 *  - ScrollProgress:           scroll progress bar + back-to-top
 *  - ShortcutsHelp:            keyboard shortcuts help dialog
 *  - Playground:               interactive chat playground
 *  - ActivityFeed:             simulated real-time activity feed
 *  - PromptGallery:            interactive prompt template gallery
 *  - PersonalityConfigurator:  agent personality sliders + preview
 *  - FeatureTour:              guided walkthrough overlay with spotlight
 *  - ApiExplorer:              interactive API endpoint browser with curl/response preview
 */

/** Global reduced-motion check (WCAG 2.3.3 compliance).
 *  Reactive: listens for OS preference changes at runtime so toggling
 *  "Reduce motion" in system settings takes effect immediately.
 */
var _prefersReducedMotionQuery = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)');
var prefersReducedMotion = _prefersReducedMotionQuery ? _prefersReducedMotionQuery.matches : false;

if (_prefersReducedMotionQuery && _prefersReducedMotionQuery.addEventListener) {
  _prefersReducedMotionQuery.addEventListener('change', function (e) {
    prefersReducedMotion = e.matches;

    // Stop or resume testimonial autoplay based on the new preference.
    if (typeof Testimonials !== 'undefined' && Testimonials._onMotionChange) {
      Testimonials._onMotionChange(e.matches);
    }
  });
}

// ---------------------------------------------------------------------------
// Chat Demo Scenarios
// ---------------------------------------------------------------------------

/* exported SCENARIOS, ChatDemo, Testimonials, Pricing, FAQ, Stats, Trust */
/* eslint-disable no-var */
var SCENARIOS = Object.freeze({
  memory: [
    { role: 'user', text: 'Hey, what was that pasta recipe I asked about last week?' },
    { role: 'bot', text: 'The one with sun-dried tomatoes and basil! You mentioned wanting to try it with penne instead of fusilli. Want me to pull up the full recipe?' },
    { role: 'user', text: 'Yes! And remind me to buy penne tonight' },
    { role: 'bot', text: 'Here\'s the recipe:\n\n🍝 Sun-dried tomato pasta\n• 400g penne\n• 100g sun-dried tomatoes\n• Fresh basil, garlic, olive oil\n• Parmesan to finish\n\nBoil pasta, sauté garlic + tomatoes 3 min, toss together, top with basil & parmesan.\n\nI\'ll remind you tonight at 7pm to grab penne! ✅' },
  ],
  search: [
    { role: 'user', text: 'What\'s the weather like in Seattle this weekend?' },
    { role: 'bot', text: '🌧️ Seattle this weekend:\n\nSaturday: 48°F, light rain in the morning, clearing by noon\nSunday: 52°F, partly cloudy\n\nNot bad for February! Might be worth getting out on Sunday.' },
    { role: 'user', text: 'Any good hikes near Seattle that work in light rain?' },
    { role: 'bot', text: 'Here are some rain-friendly options:\n\n🌲 Twin Falls (easy, 2.6 mi) - waterfall is amazing after rain\n🏔️ Rattlesnake Ledge (moderate, 4 mi) - canopy cover most of the way\n🌿 Discovery Park Loop (easy, 2.8 mi) - scenic + mostly sheltered\n\nI\'d go Twin Falls if you want the payoff. Want directions?' },
  ],
  reminder: [
    { role: 'user', text: 'Remind me to take my medicine in 30 minutes' },
    { role: 'bot', text: 'Got it! I\'ll ping you in 30 minutes to take your medicine 💊' },
    { role: 'user', text: 'Also remind me about the team standup at 9am tomorrow' },
    { role: 'bot', text: 'Done! Two reminders set:\n\n⏰ In 30 min - take medicine\n⏰ Tomorrow 9:00 AM - team standup\n\nI\'ll make sure you don\'t miss either one.' },
  ],
  image: [
    { role: 'user', text: '📷 [sends a photo of an error message on their screen]' },
    { role: 'bot', text: 'I can see the error - it\'s a CORS issue. Your frontend at localhost:3000 is trying to hit an API on a different port without the right headers.\n\nQuick fix: add this to your server:\n\n`Access-Control-Allow-Origin: *`\n\nOr if you\'re using Express:\n`app.use(cors())`\n\nWant me to walk through the full setup?' },
    { role: 'user', text: 'That fixed it, thanks!' },
    { role: 'bot', text: 'Nice! 🎉 Pro tip: in production, replace the wildcard `*` with your actual domain for security. Let me know if anything else comes up.' },
  ],
});
