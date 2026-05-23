# Changelog

## [v2.11.0] — 2026-05-23

2 commits since v2.10.0. Focused test-coverage release for previously
untested UI modules.

### 🧪 New Test Coverage

Three UI modules that previously had zero direct unit coverage now ship
with CommonJS-importable Jest suites:

- **ThemeToggle** (`src/modules/theme-toggle.js`) — 8 tests covering the
  light/dark toggle, localStorage round-trip, missing-button no-op, icon
  update, and persistence across re-init.
- **FAQ** (`src/modules/faq.js`) — 6 tests covering accordion open/close,
  sibling-collapse scoping, cross-container isolation, and the no-op
  branch when called with a stray element.
- **ShortcutsHelp** (`src/modules/shortcuts-help.js`) — 12 tests covering
  the `?` toggle, Escape and backdrop close, input/textarea suppression,
  modifier-key suppression, and the `t` → `#themeToggle` forwarding
  (gated by overlay visibility).

**Net effect:** +26 passing tests, +3 modules with direct coverage.

### 🛠 Internal

The three source modules gained a CommonJS export tail behind the usual
`typeof module` guard so they can be `require()`-d directly in Jest
without going through the bundle. Browser/bundle behaviour is unchanged:
the IIFE still assigns the global `var`, and `build.js` still produces a
clean `dist/bundle.js` + `app.js`.

Pre-existing failing suites tracked by issue #111 (the `eval(appJs)`
pattern and canvas-mock drift) are unrelated and unchanged by this
release.

---

## [v2.10.0] — 2026-05-21

25 commits since v2.9.0 — a new agentic-advisor family, hardened security
posture across all 85 HTML pages, Docker image refresh, and a fresh
behavioural test suite for the share FAB.

### ✨ New Agentic Advisors
A full family of nine sibling advisors landed during this cycle, each
shipped with its own jsdom test suite:

- **AgentTriageAdvisor** — inbox triage with lanes, stressors, batch planning
- **AgentRolloutPlanner** — phased deployment strategy with risk bands
- **AgentDriftDetector** — behavioural-drift monitor with baseline diffing
- **AgentToolPolicyAdvisor** — per-tool ALLOW / CONFIRM / DENY / QUARANTINE policy synthesizer
- **AgentBudgetGuardianAdvisor** — per-agent budget & spend guardian
- **AgentAutonomyTuningAdvisor** — per-agent autonomy-level tuner
- **AgentMemoryHygieneAdvisor** — per-memory hygiene audit with simulate / apply playbook
- **AgentEscalationAdvisor** — fleet handoff triage
- **AgentTaskDependencyAdvisor** — cross-task dependency / blocker triage

### 🎬 New Interactive Demo
- **Agent Delegation Visualizer** — interactive multi-agent task delegation demo
  with task-flow animation and per-agent capability tagging.

### 🔐 Security Hardening
- Enforced a single canonical CSP + security-header block across all 85 HTML
  pages, with a CI drift check (`scripts/apply-security-headers.js`).
- Hardened user-controlled selectors and added a defensive `escapeHtml`
  fallback for legacy code paths.
- Documented the canonical CSP policy in `SECURITY.md`.

### 🐛 Bug Fixes
- **ShareFab** — null-guard the optional `#shareToast` element so pages that
  opt out of the copy-confirmation UI no longer throw when the FAB is opened
  or the copy button is clicked.
- **Roadmap** — added the missing `catch` block to the `saveVotes` try /
  catch (the module would crash on quota errors).
- **arrowKeyNav** — added the missing keyboard-navigation utility that was
  already referenced by the roadmap and notification-preview modules.
- **Docker** — build `app.js` inside the image and pin `html-validate@9` so
  builds are reproducible on clean runners.
- **delegation-visualizer** — fix `DOMUtil.escapeHTML` typo that broke text
  rendering on agent nodes.

### ⚡ Refactors
- **api-explorer** — extract `buildCurl`, switch category lookup to an O(1)
  map, drop a dead branch.

### 🧪 Tests
- New `__tests__/share-fab.test.js` — 11 deterministic behavioural tests
  covering menu toggle, click-outside / Escape dismissal, twitter / linkedin
  popup composition, `navigator.clipboard` + `execCommand` copy paths, and
  the toast auto-hide timer.

### 📦 Dependencies & CI
- Bump nginx base image from `1.29-alpine` to `1.31-alpine`.
- Bump `actions/github-script` from v7 to v9.
- Dependabot dev-dependency group bumps.

### 📖 Documentation
- New **Interactive Features Reference** — 13-module deep-dive doc.
- Clarified module families and per-advisor wiring in `docs/modules.md`.


## [v2.1.0] — 2026-03-14

38 PRs merged since v2.0.0 — major new interactive components, performance
improvements, security hardening, and comprehensive documentation.

### Features

- **Agent Day Simulator** (#68) — interactive hour-by-hour timeline showing a full day with an AI agent, with conversation previews across Telegram/WhatsApp/proactive channels
- **Agent Skill Tree** (#67) — interactive capability explorer with 5 branches (communication, research, automation, creative, memory), 20 skills, canvas-drawn connections, and click-to-explore detail panel
- **Memory Timeline** (#62) — visual timeline of agent memory evolution
- **Community Showcase Wall** (#56) — user-submitted use case gallery with voting
- **Integration Pipeline Builder** (#53) — visual workflow configurator for chaining agent actions
- **AI Glossary** (#41) — searchable terminology reference with 35 AI/agent terms
- **Speed Challenge** (#60) — side-by-side race comparing agent vs traditional workflows
- **Privacy Checkup** (#63) — interactive privacy concern assessment with personalized findings

### Bug Fixes

- **ActivityFeed counter cap** (#37, #59) — prevent visible counter drops and unbounded growth in the live activity feed
- **FeatureBoard ranking** (#44) — popular filter was ignoring user votes
- **Feedback NaN propagation** (#32) — validate scores before aggregation
- **Calculator innerHTML XSS** (#29) — replace innerHTML with safe DOM construction
- **Resize debounce** (#22) — debounce `cacheSectionOffsets` on window resize
- **XSS in CommunityShowcase** (#57) — sanitize user-submitted content, fix prototype pollution

### Performance

- **Deferred module initialization** (#35) — use IntersectionObserver and `content-visibility` to defer below-fold module init, reducing initial JS execution time

### Code Quality

- **var → const/let** (#33) — converted 751 `var` declarations to `const`/`let` across the entire codebase

### Documentation

- **Architecture guide** (#58) — comprehensive 42-module reference with patterns, conventions, and code structure
- **Changelog HTML page** (#52) — browsable changelog + CODEOWNERS file
- **Module reference update** (#51) — added 11 missing modules (27→38 documented)
- **Customization guide** (#34) — landing page theming and customization documentation

### CI/CD

- Bump actions/checkout v4→v6, actions/setup-node v4→v6, actions/labeler v5→v6, actions/stale v9→v10
- Bump docker/login-action v3→v4, docker/setup-buildx-action v3→v4, docker/build-push-action v6→v7, docker/metadata-action v5→v6
- Bump codecov/codecov-action v4→v5


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
