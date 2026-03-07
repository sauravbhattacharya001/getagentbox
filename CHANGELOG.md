# Changelog

## [v2.0.0] — 2026-03-07

91 commits since v1.0.0 — a complete transformation from static landing page
to a fully interactive product site with 27+ interactive components.

### Features

- **Interactive API Explorer** — live endpoint browser with request/response demos
- **Quick Start Wizard** — guided onboarding flow for new users
- **Workflow Templates Gallery** — 12 automation recipe templates
- **Onboarding Quiz** — "Which plan is right for you?" interactive guide
- **Commands Cheat Sheet** — searchable command reference
- **Interactive Feature Tour** — guided walkthrough overlay
- **Prompt Gallery** — browsable prompt template collection
- **Agent Personality Configurator** — 15-question slider with persistence
- **Interactive Chat Playground** — live chat demo
- **Time Saved Calculator** — interactive ROI estimator
- **Command Palette** (Ctrl+K/Cmd+K) — quick section navigation
- **System Status Dashboard** — service health monitoring
- **Product Roadmap** — voting and status filters
- **Trust & Privacy Section** — expandable security cards
- **Newsletter Signup** — email subscription form
- **Integrations Showcase** — category-filtered integration browser
- **What's New Changelog** — tag-filtered changelog section
- **Social Proof Stats** — animated counters with scroll trigger
- **Use Cases Section** — tabbed persona showcase with keyboard nav
- **Comparison Table** — 5 competitors, 16 features
- **Live Agent Activity Feed** — simulated real-time actions
- **Sticky Navigation** with smooth scrolling
- **Scroll Progress Bar** + back-to-top button
- **Light/Dark Mode Toggle** in navigation
- **Floating Share Button** (Twitter/X, LinkedIn, copy link)
- **Keyboard Shortcuts Modal** (press ? to open)

### Security

- Hardened CSP (Content Security Policy) across nginx and HTML meta tags
- Vendored GoatCounter script, added Permissions-Policy header
- Hardened localStorage deserialization against tampering
- Fixed protocol-relative URL vulnerability, guarded prototype access
- SRI (Subresource Integrity) hashes for scripts
- Replaced innerHTML with safe DOM construction across multiple modules

### Performance

- DOM pooling in CommandPalette, PromptGallery, ApiExplorer
- requestAnimationFrame replaces setInterval for Stats counters
- Cached DOM references across 6+ modules to eliminate redundant queries
- Eliminated forced layout recalculations in scroll spy
- Debounced resize handler for section offset caching
- Skipped redundant nav scroll updates

### Bug Fixes

- Fixed animation stalls and stacked timers in counter animations
- Fixed listener leaks (ScrollProgress.destroy(), Testimonials autoplay)
- Fixed ThemeToggle null crash
- Fixed light-mode styles for comparison table
- Made prefersReducedMotion reactive to OS preference changes
- Fixed activity feed item accumulation from missed animationend events
- Fixed O(n*m) nested loop in CommandPalette with O(1) poolIndex map

### Documentation

- Module Reference for all 27 interactive components
- Updated copilot-instructions.md with architecture context
- Added CONTRIBUTING.md with development guide

### Tests

- 36 tests for Calculator, Newsletter, and CommandPalette modules

### CI/CD

- Bumped actions: checkout v4→v6, setup-node v4→v6, labeler v5→v6, stale v9→v10, codecov v4→v5, codeql v3→v4

## [v1.0.0] — 2026-02-20

Initial release — AgentBox landing/marketing site.
