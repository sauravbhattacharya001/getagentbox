# Contributing to AgentBox Landing Page

Thanks for your interest in improving the AgentBox landing page! This guide will help you get started.

## Code of Conduct

Be respectful, constructive, and inclusive. We're building something cool together — treat fellow contributors the way you'd want to be treated. Harassment, trolling, or dismissive behavior won't be tolerated.

## First-Time Contributors

New to this project? Here's how to find your first contribution:

1. **Browse [good first issues](https://github.com/sauravbhattacharya001/getagentbox/issues?q=is%3Aissue+is%3Aopen+label%3A%22good+first+issue%22)** — these are scoped, well-described tasks ideal for newcomers
2. **Pick a test file** — look at `__tests__/` for modules with low coverage and add missing test cases
3. **Fix an accessibility gap** — run a screen reader or keyboard-only navigation through the site and file issues or fixes for anything broken
4. **Improve documentation** — typos, unclear instructions, or missing examples in `docs/`

If you're unsure whether something is worth a PR, open an issue first to discuss.

## Quick Start

```bash
# Clone the repo
git clone https://github.com/sauravbhattacharya001/getagentbox.git
cd getagentbox

# Install test dependencies
npm install

# Open in browser (no build step needed)
open index.html
# or use a local server:
npx serve .
```

## Project Structure

```
getagentbox/
├── index.html                  # Main landing page
├── styles.css                  # All styles (responsive, dark theme, CSS vars)
├── build.js                    # Bundle build script (concatenates modules)
├── cookie-consent.js           # Cookie consent banner
├── src/
│   ├── index.js                # npm package — reusable FAQ, Pricing, Stats (UMD)
│   ├── roi-calculator.js       # ROI calculator (separate npm export)
│   ├── modules/                # 55+ interactive module IIFEs
│   │   ├── globals.js          # Shared constants and state
│   │   ├── dom-utils.js        # Safe DOM manipulation utilities
│   │   ├── storage.js          # localStorage abstraction layer
│   │   ├── init.js             # Module initialization orchestrator
│   │   ├── chat-demo.js        # Live chat simulation demo
│   │   ├── pricing.js          # Pricing toggle and comparison
│   │   ├── faq.js              # FAQ accordion
│   │   ├── stats.js            # Animated statistics counters
│   │   ├── pipeline-builder.js # Visual pipeline constructor
│   │   ├── playground.js       # Interactive API playground
│   │   └── ...                 # 45+ more modules (see build.js for full list)
│   ├── benchmarks.js           # Performance benchmark charts
│   ├── capability-radar.js     # Capability radar visualization
│   ├── command-reference.js    # CLI command reference
│   ├── migration-guide.js      # Migration wizard
│   ├── role-demo-picker.js     # Role-based demo selector
│   ├── setup-checklist.js      # Interactive setup checklist
│   └── workflow-builder.js     # Visual workflow builder
├── dist/
│   └── bundle.js               # Auto-generated bundle (DO NOT edit directly)
├── vendor/
│   └── count.js                # Vendored GoatCounter analytics (DO NOT modify)
├── __tests__/                  # 70+ Jest + jsdom test suites
│   ├── index.test.js           # Core module integration tests
│   ├── lib.test.js             # npm package tests
│   └── *.test.js               # Per-feature tests (one per module)
├── docs/                       # Developer documentation site
├── Dockerfile                  # Multi-stage nginx production container
├── SECURITY.md                 # CSP policy, security headers, XSS prevention
├── CHANGELOG.md                # Release history
└── .github/
    ├── workflows/              # CI, Pages, Docker, CodeQL, npm publish, etc.
    ├── dependabot.yml
    ├── copilot-instructions.md # AI agent coding context
    └── copilot-setup-steps.yml
```

### Module Architecture

The codebase uses a modular IIFE architecture in `src/modules/`. Each module is a self-contained file that exposes a global object with `init()` and `reset()` methods. The build script (`build.js`) concatenates them in dependency order into `dist/bundle.js`.

**Load order matters:** `storage.js` → `dom-utils.js` → `globals.js` → all feature modules → `init.js` (orchestrator). See `build.js` for the exact concatenation order.

**Top-level `src/` files** (outside `modules/`) are page-specific scripts loaded directly by individual HTML pages (e.g., `workflow-builder.js` is used by `workflow-builder.html`).

## Tech Stack

- **Pure HTML/CSS/JS** — no frameworks, no build step, no runtime dependencies
- **ES5 only** — no `let`/`const`, no arrow functions, no template literals
- **Jest + jsdom** for testing
- **GitHub Pages** for deployment
- **Docker + nginx** for containerized hosting
- **GoatCounter** for privacy-friendly analytics (vendored locally)

## Development Guidelines

### Code Style

- **ES5 JavaScript only** — no ES6+ syntax for broad browser compatibility
- Modules are individual files in `src/modules/`, each a global IIFE:
  ```javascript
  /* exported MyModule */
  var MyModule = (function () {
      function init() { /* DOM setup */ }
      function reset() { /* cleanup for tests */ }
      return { init: init, reset: reset };
  })();
  ```
- Use `/* exported ... */` JSHint comments for global module declarations
- Module initialization order is controlled by `build.js` — respect dependency chains
- `src/modules/dom-utils.js` provides safe DOM helpers — use them instead of raw `document.createElement`
- CSS uses a single `styles.css` with section-based organization and CSS custom properties
- Use semantic HTML with ARIA attributes for accessibility
- Check `prefersReducedMotion` before adding animations (WCAG 2.3.3)

### Content Security Policy

The site uses a strict CSP via `<meta>` tag in `index.html` **and** nginx headers in the Dockerfile. Both must stay in sync.

- `script-src 'self'` — no external scripts
- `style-src 'self'` — no external stylesheets
- `img-src 'self'` — no external images
- No `eval()`, `Function()`, or `document.write()`

If you need a new external resource, update CSP in **both** `index.html` and `Dockerfile`.

### DOM Safety

- **Never** use `innerHTML` with dynamic or user-influenced content
- Use `document.createElement()`, `createTextNode()`, and `DocumentFragment`
- `innerHTML` is acceptable only for static templates from trusted app data or clearing containers (`innerHTML = ''`)

### Testing

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run a specific test file
npx jest __tests__/feedback.test.js

# Build the bundle (after adding/modifying modules)
npm run build
```

**Test conventions:**
- Tests use jsdom environment (configured in `jest.config.js`)
- Each feature has its own test file in `__tests__/` (70+ test suites)
- DOM elements are set up in `beforeEach`
- Module globals from `src/modules/` are loaded via `eval(fs.readFileSync(...))` in test scope since jsdom can't `require` browser globals
- Test behavior, not implementation — meaningful assertions over brittle structural checks
- When testing a module, also load its dependencies (storage.js, dom-utils.js, globals.js)
- Note: Jest exit code may be 1 even when all tests pass (pre-existing config quirk)

### Adding a New Module

1. Add the HTML section in `index.html`
2. Add styles in `styles.css` (follow section-based organization, use CSS variables)
3. Create a new file `src/modules/my-module.js` with an IIFE:
   ```javascript
   /* exported MyModule */
   var MyModule = (function () {
       function init() {
           var container = document.getElementById('my-module');
           if (!container) return;
           // set up event listeners, build DOM
       }

       function reset() {
           // clean up for test isolation
       }

       return { init: init, reset: reset };
   })();
   ```
4. Register the module in `build.js` — add its path to the `files` array (before `init.js`)
5. Add `MyModule.init()` call in `src/modules/init.js`
6. Rebuild the bundle: `npm run build`
7. Add tests in `__tests__/my-module.test.js`
8. Update README if the section adds user-facing features

**Page-specific scripts** (not part of the main bundle): If your module is only used by a standalone HTML page, place it in `src/` (not `src/modules/`) and load it with a `<script>` tag in that page. Add it to `build.js` after the `init.js` entry if it should also be part of the bundle.

### Responsive Design

- Mobile-first approach
- Breakpoints: 768px (tablet), 480px (phone)
- Use `contain: content` on independent sections for layout isolation
- Use `will-change` on animated elements for GPU compositing
- Test on multiple viewport sizes before submitting

### Accessibility

- Use semantic elements (`<section>`, `<nav>`, `<button>`, `<article>`)
- Add `aria-label`, `aria-expanded`, `role` attributes to interactive elements
- Ensure keyboard navigation works (Tab, Enter, Escape, arrow keys)
- Maintain color contrast ratios for both dark and light themes
- Support `prefers-reduced-motion` — disable animations when set

## Local Development Workflow

### Running the Site Locally

The site has no build step for development — just serve the files:

```bash
# Option 1: npx serve (recommended)
npx serve . -l 3000
# Then open http://localhost:3000

# Option 2: Python
python3 -m http.server 3000

# Option 3: Build the minified bundle and serve
npm run build    # Concatenates src/modules/* → dist/bundle.js
npx serve . -l 3000
```

**Development vs Production:** During development, `index.html` loads individual module files from `src/modules/` via `<script>` tags (no bundle needed). In production, the bundled `dist/bundle.js` is used for performance. The build script preserves module load order from `build.js`.

### Docker Development

To test the production container locally:

```bash
docker build -t agentbox-landing .
docker run -p 8080:80 agentbox-landing
# Visit http://localhost:8080
```

The Dockerfile uses multi-stage builds: stage 1 runs `npm test`, stage 2 copies static assets into an nginx container with security headers. If tests fail, the image won't build — this is intentional.

### npm Package Development

The `src/index.js` and `src/roi-calculator.js` are the reusable npm package exports (FAQ accordion, pricing toggle, animated stats, ROI calculator). To test changes to the package:

```bash
# Run package-specific tests
npx jest __tests__/lib.test.js

# Test the UMD module locally
node -e "var m = require('./src/index.js'); console.log(Object.keys(m));"

# Test the ROI calculator export
node -e "var roi = require('./src/roi-calculator.js'); console.log(typeof roi);"

# Dry-run publish to check what gets included
npm pack --dry-run
```

The `"files"` field in `package.json` limits the published package to `src/` and `LICENSE` only — HTML pages, tests, and `dist/` are excluded. The package supports both CommonJS `require()` and the `"exports"` map for subpath imports.

## Release Process

Releases are tagged with semver and published to npm automatically via GitHub Actions:

1. Update `version` in `package.json`
2. Add an entry to `CHANGELOG.md` under the new version
3. Commit: `chore: bump version to x.y.z`
4. Create a GitHub Release with tag `vx.y.z` — the `npm-publish` workflow handles the rest

**When to bump which version:**
- **Patch** (x.y.Z): Bug fixes, accessibility improvements, test additions
- **Minor** (x.Y.0): New landing page sections, new npm-exported modules, new features
- **Major** (X.0.0): Breaking changes to the npm package API (rare)

## Pull Request Process

1. **Fork** the repo and create a feature branch
2. Make your changes with clear, descriptive commits
3. Run `npm test` and ensure all tests pass
4. Add tests for any new interactive functionality
5. Test in at least Chrome and Firefox
6. Submit a PR with:
   - What you changed and why
   - Screenshots for visual changes
   - Test results

### Commit Message Convention

Use clear, imperative-mood commit messages:

```
feat: add testimonial carousel autoplay
fix: correct FAQ accordion keyboard navigation
docs: update setup instructions for Windows
test: add coverage for Stats module edge cases
style: improve mobile nav breakpoint at 480px
refactor: extract CSP validation into utility
chore: update Jest to v30
```

Prefix with `feat:`, `fix:`, `docs:`, `test:`, `style:`, `refactor:`, or `chore:`. Keep the subject line under 72 characters. Add a blank line and body for complex changes.

### Review Checklist

Before requesting review, verify:

- [ ] `npm test` passes with no failures
- [ ] No console errors or warnings in the browser
- [ ] CSP meta tag and Dockerfile nginx CSP stay in sync
- [ ] Tested on mobile viewport (≤480px) and tablet (≤768px)
- [ ] Keyboard navigation works for any new interactive elements
- [ ] ARIA attributes added to new interactive components
- [ ] No hardcoded colors — use existing CSS custom properties
- [ ] ES5 only — no `let`, `const`, arrow functions, or template literals
- [ ] No `innerHTML` with dynamic content — use safe DOM APIs

## What We're Looking For

**Good contributions:**
- New landing page sections that showcase AgentBox features
- Accessibility improvements (keyboard nav, screen reader support)
- Performance optimizations (lazy loading, reduced paint, IntersectionObserver)
- Better mobile experience
- Animation polish (respecting `prefers-reduced-motion`)
- SEO improvements
- Test coverage for untested modules
- Documentation improvements

**Please avoid:**
- Adding build tools, transpilers, or frameworks (keep it vanilla)
- Using ES6+ syntax (project is ES5 for compatibility)
- Major redesigns without discussion
- Changes that break the CSP policy
- Modifying `vendor/count.js` (third-party GoatCounter)
- Removing existing functionality

## Reporting Issues

Use the [issue templates](https://github.com/sauravbhattacharya001/getagentbox/issues/new/choose) for:
- 🐛 **Bug reports** — include browser, OS, and steps to reproduce
- ✨ **Feature requests** — describe the section/interaction you'd like

## Troubleshooting

**Tests fail with `Cannot find module` errors:**
Delete `node_modules` and run `npm install` again. Make sure you're on Node.js ≥14.

**`npx serve .` shows a blank page:**
Check the browser console for CSP violations. If you added a new `<script>` or external resource, update the CSP meta tag in `index.html`.

**JSDOM tests can't access DOM elements:**
Ensure your `beforeEach` sets up `document.body.innerHTML` with the required elements before calling `init()`. JSDOM doesn't load external scripts via `file://` — inline them in the test setup.

**Docker build fails:**
Verify `Dockerfile` syntax and that you're running `docker build` from the repo root. The nginx config expects `index.html` at the container's web root.

## CI Pipeline

Every PR and push triggers the following checks (see `.github/workflows/`):

- **CI** — `npm test` on Node 18/20/22, lint checks
- **CodeQL** — security scanning for JavaScript vulnerabilities
- **Docker** — container builds successfully with passing tests
- **Pages** — deploys to GitHub Pages on merge to master

All checks must pass before merging. If CI fails on your PR, check the Actions tab for details — most failures are test regressions or CSP violations.

## Getting Help

Stuck on something? Here's where to ask:

- **[GitHub Discussions](https://github.com/sauravbhattacharya001/getagentbox/discussions)** — general questions, ideas, architecture discussions
- **[Issues](https://github.com/sauravbhattacharya001/getagentbox/issues)** — bug reports and feature requests
- Tag your issue with relevant labels (`bug`, `enhancement`, `accessibility`, `documentation`)

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](LICENSE).
