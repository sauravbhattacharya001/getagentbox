# Copilot Instructions — getagentbox

## Project Overview

**getagentbox** is the landing page and npm package for [AgentBox](https://t.me/AgentBox11Bot), a personal AI agent that lives in Telegram. The site is a vanilla HTML/CSS/JS project — no framework, no transpiler, no runtime dependencies. A simple `build.js` concatenates modules into `dist/bundle.js`.

**Live site:** https://sauravbhattacharya001.github.io/getagentbox/
**npm package:** `agentbox-landing` (reusable FAQ, Pricing, Stats components)

## Architecture

```
getagentbox/
├── index.html              # Main landing page
├── styles.css              # All styles (responsive, dark theme, CSS vars)
├── build.js                # Concatenation bundler → dist/bundle.js
├── src/
│   ├── index.js            # npm package — UMD reusable components
│   ├── roi-calculator.js   # ROI calculator page script
│   ├── benchmarks.js       # Benchmarks page script
│   ├── capability-radar.js # Capability radar visualization
│   ├── command-reference.js# Command reference page
│   ├── events-page.js      # Events page
│   ├── migration-guide.js  # Migration guide page
│   ├── role-demo-picker.js # Role demo picker page
│   ├── use-case-explorer.js# Use case explorer page
│   ├── workflow-builder.js # Workflow builder page
│   ├── autonomy-ladder.js  # Autonomy ladder page
│   ├── calibration-lab.js  # Calibration lab page
│   └── modules/            # 55 modular IIFE components (see below)
├── dist/
│   └── bundle.js           # Auto-generated (do NOT edit)
├── docs/                   # Developer documentation site
├── vendor/
│   └── count.js            # Vendored GoatCounter analytics (do NOT modify)
├── __tests__/              # 70 Jest + jsdom test suites
├── Dockerfile              # Multi-stage nginx production container
├── SECURITY.md             # CSP policy, XSS prevention
├── CONTRIBUTING.md         # Development guide
└── .github/
    ├── workflows/          # CI, Pages, Docker, npm publish, CodeQL, labeler, stale
    ├── dependabot.yml
    └── copilot-setup-steps.yml
```

## Module System

All interactive components live in `src/modules/` as individual ES5 IIFE files. The build script (`build.js`) concatenates them in dependency order into `dist/bundle.js`.

### Core Infrastructure (load first)
| Module | Purpose |
|--------|---------|
| `storage.js` | Safe localStorage wrapper |
| `dom-utils.js` | Shared DOM helper functions |
| `globals.js` | Global state and `prefersReducedMotion` flag |
| `_typing-indicator-template.js` | Shared typing indicator markup |
| `init.js` | DOMContentLoaded initializer for modules that don't self-init |

### Interactive Components (55 modules)
Major modules include: `chat-demo`, `testimonials`, `pricing`, `faq`, `how-it-works`, `stats`, `use-cases`, `integrations`, `changelog`, `trust`, `site-nav`, `newsletter`, `roadmap`, `status-dashboard`, `calculator`, `command-palette`, `share-fab`, `theme-toggle`, `scroll-progress`, `shortcuts-help`, `playground`, `activity-feed`, `prompt-gallery`, `personality-configurator`, `feature-tour`, `api-explorer`, `pipeline-builder`, `community-showcase`, `section-minimap`, `help-chat-widget`, `scenario-planner`, `privacy-checkup`, `referral-program`, `setup-checklist`, `speed-challenge`, and more.

Each module follows the same pattern:
```javascript
/* exported ModuleName */
var ModuleName = (function () {
    function init() { /* DOM setup */ }
    function reset() { /* cleanup for tests */ }
    return { init: init, reset: reset /* + module-specific methods */ };
})();
```

### Top-level Page Scripts (src/*.js)
Individual page scripts (e.g., `roi-calculator.js`, `benchmarks.js`, `workflow-builder.js`) power standalone HTML pages. They are also included in the bundle build.

## src/index.js (npm Package)

UMD module exporting `AgentBoxComponents` with three reusable components:
- **FAQ** — Accessible accordion
- **Pricing** — Billing toggle
- **Stats** — Animated counters

Tests in `__tests__/lib.test.js`.

## Conventions

### JavaScript
- **ES5 only** — no `let`/`const`, no arrow functions, no template literals
- Modules are global IIFEs with `/* exported ... */` JSDoc comments
- All DOM content creation uses `document.createElement()` / `createTextNode()` — never `innerHTML` with dynamic content
- `prefersReducedMotion` global (from `globals.js`) for WCAG 2.3.3 compliance

### CSS
- CSS custom properties in `:root` for theming
- Dark theme default, light mode via `.light-mode` body class
- Breakpoints: 768px (tablet), 480px (phone)
- `contain: content` on independent sections for layout isolation

### Testing
- **Jest + jsdom** — 70 test files in `__tests__/`
- `npm test` runs all suites; `npm run test:coverage` for coverage
- Test files use `@jest-environment jsdom` pragma when needed
- Functions are re-evaluated in test files (jsdom can't `require` browser globals)
- **Known:** Jest exit code is 1 even when all tests pass (pre-existing config issue)

### Security
- Strict CSP via `<meta>` tag — `script-src 'self'`, `style-src 'self'`
- No `innerHTML` for user-facing content — use safe DOM APIs
- `vendor/count.js` is vendored GoatCounter — **do not modify**
- See `SECURITY.md` for full policy

## How to Work on This

```bash
# Install test dependencies
npm install

# Run tests
npm test

# Build the bundle
npm run build

# Serve locally
npx serve .
# Then open http://localhost:3000
```

### Adding a New Module

1. Create `src/modules/my-module.js` following the IIFE pattern above
2. Add it to the file list in `build.js` (order matters — after dependencies)
3. If it needs explicit init, add it to `src/modules/init.js`
4. Add corresponding HTML section in `index.html` (or a new page)
5. Add styles in `styles.css`
6. Add tests in `__tests__/my-module.test.js`
7. Run `npm run build` and `npm test` to verify

### What NOT to Do

- Do not add build tools, transpilers, or frameworks (keep vanilla)
- Do not modify `vendor/count.js` (third-party GoatCounter)
- Do not use `innerHTML` with any dynamic or user-influenced content
- Do not break the CSP policy (no inline scripts/styles, no external CDNs)
- Do not edit `dist/bundle.js` directly (it's auto-generated by `build.js`)
- Do not use ES6+ syntax (the codebase is ES5 for broad compatibility)
