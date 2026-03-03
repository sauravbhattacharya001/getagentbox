# Copilot Instructions — getagentbox

## Project Overview

**getagentbox** is the landing page and npm package for [AgentBox](https://t.me/AgentBox11Bot), a personal AI agent that lives in Telegram. The site is a vanilla HTML/CSS/JS project — no build step, no framework, no runtime dependencies.

**Live site:** https://sauravbhattacharya001.github.io/getagentbox/
**npm package:** `agentbox-landing` (reusable FAQ, Pricing, Stats components)

## Architecture

```
getagentbox/
├── index.html              # Main landing page (HTML structure)
├── styles.css              # All styles (67KB — responsive, dark theme, CSS vars)
├── app.js                  # 21 interactive modules (~2,300 lines)
├── src/
│   └── index.js            # npm package — UMD reusable components (FAQ, Pricing, Stats)
├── docs/
│   ├── index.html          # Developer documentation site
│   └── getting-started.html
├── vendor/
│   └── count.js            # Vendored GoatCounter analytics (do NOT modify)
├── __tests__/              # Jest + jsdom test suites
│   ├── index.test.js       # Main app.js module tests (~58KB)
│   ├── lib.test.js         # npm package (src/index.js) tests
│   ├── sitenav.test.js     # SiteNav module tests
│   ├── integrations.test.js
│   ├── changelog.test.js
│   ├── roadmap.test.js
│   ├── status.test.js      # StatusDashboard tests
│   ├── trust.test.js       # Trust module tests
│   └── docs-security.test.js
├── Dockerfile              # Multi-stage nginx production container
├── SECURITY.md             # CSP policy, XSS prevention, security headers
├── CONTRIBUTING.md         # Development guide, conventions, PR process
└── .github/
    ├── workflows/
    │   ├── ci.yml           # Build + test + lint
    │   ├── pages.yml        # GitHub Pages deployment
    │   ├── docker.yml       # Docker build/push
    │   ├── publish.yml      # npm publish
    │   ├── codeql.yml       # Security scanning
    │   ├── labeler.yml      # Auto-label PRs
    │   └── stale.yml        # Stale issue management
    ├── dependabot.yml
    ├── copilot-setup-steps.yml
    └── copilot-instructions.md  # ← this file
```

## app.js Modules (21 total)

Each module follows the IIFE pattern and exposes an object with `init()` plus module-specific methods. Most also have `reset()` for test cleanup.

| Module | Purpose |
|--------|---------|
| `ChatDemo` | Animated chat scenario player (4 scenarios) |
| `Testimonials` | Auto-rotating testimonials carousel with dots |
| `Pricing` | Monthly/yearly billing toggle |
| `FAQ` | Accessible accordion (aria-expanded, keyboard nav) |
| `HowItWorks` | Step-by-step reveal animation |
| `Stats` | Animated social proof counters with easing |
| `UseCases` | Tabbed use case browser |
| `Integrations` | Filterable integration cards by category |
| `Changelog` | Filterable changelog entries by tag |
| `Trust` | Expandable privacy detail cards |
| `SiteNav` | Sticky nav with scroll tracking + mobile menu |
| `Newsletter` | Email subscription form with validation |
| `Roadmap` | Status-filterable roadmap cards with voting |
| `StatusDashboard` | Service status grid with uptime bars + incidents |
| `Calculator` | Interactive time-savings calculator with sliders |
| `CommandPalette` | Keyboard-triggered section search (Ctrl+K) |
| `ShareFab` | Floating share button (Twitter, LinkedIn, copy link) |
| `ThemeToggle` | Light/dark mode with localStorage persistence |
| `ScrollProgress` | Progress bar + back-to-top button |
| `ShortcutsHelp` | Keyboard shortcuts overlay (?) |
| `Playground` | Interactive chat demo with pattern-matched responses |

**Two DOMContentLoaded blocks:** Modules are initialized in two separate `DOMContentLoaded` listeners (lines ~979 and ~2292). The first handles the core set; the second handles later additions.

## src/index.js (npm Package)

UMD module exporting `AgentBoxComponents` with three reusable components:
- **FAQ** — Accessible accordion
- **Pricing** — Billing toggle
- **Stats** — Animated counters

Tests in `__tests__/lib.test.js`. Methods can be called without `init()` for backward compatibility.

## Conventions

### JavaScript
- **ES5 only** — no `let`/`const`, no arrow functions, no template literals
- Modules are global IIFEs (e.g., `var ChatDemo = (function () { ... })();`)
- `/* exported ... */` comments for linter hints
- All DOM content creation uses `document.createElement()` / `createTextNode()` — avoid `innerHTML` with dynamic content (see Security)
- `prefersReducedMotion` global for WCAG 2.3.3 compliance

### CSS
- CSS custom properties (variables) in `:root` for theming
- Dark theme default, light mode via `.light-mode` body class
- Breakpoints: 768px (tablet), 480px (phone)
- `contain: content` on independent sections for layout isolation
- `will-change` on animated elements for GPU compositing

### Testing
- **Jest + jsdom** — configured in `jest.config.js`
- `npm test` runs all suites; `npm run test:coverage` for coverage
- Test files use `@jest-environment jsdom` pragma when needed
- Functions are copied/re-evaluated in test files (jsdom can't `require` browser globals)
- **Jest exit code is consistently 1 even when all tests pass** (pre-existing config issue)

### Security
- Strict CSP via `<meta>` tag — `script-src 'self'`, `style-src 'self'`
- No `innerHTML` for user-facing content — use safe DOM APIs
- `vendor/count.js` is vendored GoatCounter — **do not modify**
- XSS prevention: `createElement` + `createTextNode` for dynamic content
- See `SECURITY.md` for full policy

## How to Work on This

```bash
# Install test dependencies
npm install

# Run tests
npm test

# Serve locally
npx serve .
# Then open http://localhost:3000
```

### Adding a New Module to app.js

1. Create an IIFE following the existing pattern:
   ```javascript
   var MyModule = (function () {
       function init() { /* DOM setup */ }
       function reset() { /* cleanup for tests */ }
       return { init: init, reset: reset };
   })();
   ```
2. Call `MyModule.init()` in the DOMContentLoaded block (line ~2292)
3. Add corresponding HTML in `index.html`
4. Add styles in `styles.css` (section-based organization)
5. Add tests in `__tests__/`

### What NOT to Do

- Do not add build tools, transpilers, or frameworks (keep vanilla)
- Do not modify `vendor/count.js` (third-party GoatCounter)
- Do not use `innerHTML` with any dynamic or user-influenced content
- Do not break the CSP policy (no inline scripts/styles, no external CDNs)
- Do not remove existing functionality without discussion
- Do not use ES6+ syntax (the codebase is ES5 for broad compatibility)
