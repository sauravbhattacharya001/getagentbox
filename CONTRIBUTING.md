# Contributing to AgentBox Landing Page

Thanks for your interest in improving the AgentBox landing page! This guide will help you get started.

## Code of Conduct

Be respectful, constructive, and inclusive. We're building something cool together — treat fellow contributors the way you'd want to be treated. Harassment, trolling, or dismissive behavior won't be tolerated.

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
├── index.html              # Main landing page
├── styles.css              # All styles (responsive, dark theme, CSS vars)
├── app.js                  # 21 interactive modules (~2,300 lines)
├── src/
│   └── index.js            # npm package — reusable FAQ, Pricing, Stats (UMD)
├── vendor/
│   └── count.js            # Vendored GoatCounter analytics (DO NOT modify)
├── __tests__/              # 50+ Jest + jsdom test suites
│   ├── index.test.js       # Core app.js module tests
│   ├── lib.test.js         # npm package tests
│   └── *.test.js           # Per-feature tests (sitenav, status, trust, etc.)
├── docs/                   # Developer documentation site
├── Dockerfile              # Multi-stage nginx production container
├── SECURITY.md             # CSP policy, security headers, XSS prevention
├── CHANGELOG.md            # Release history
└── .github/
    ├── workflows/          # CI, Pages, Docker, CodeQL, npm publish, etc.
    ├── dependabot.yml
    ├── copilot-instructions.md   # AI agent coding context
    └── copilot-setup-steps.yml
```

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
- Modules are global IIFEs in `app.js`:
  ```javascript
  var MyModule = (function () {
      function init() { /* DOM setup */ }
      function reset() { /* cleanup for tests */ }
      return { init: init, reset: reset };
  })();
  ```
- Use `/* exported ... */` JSHint comments for global module declarations
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
```

**Test conventions:**
- Tests use jsdom environment (configured in `jest.config.js`)
- Each feature has its own test file in `__tests__/`
- DOM elements are set up in `beforeEach`
- Functions from `app.js` are re-evaluated in test scope (jsdom can't `require` browser globals)
- Test behavior, not implementation — meaningful assertions over brittle structural checks
- Note: Jest exit code may be 1 even when all tests pass (pre-existing config quirk)

### Adding a New Module

1. Add the HTML section in `index.html`
2. Add styles in `styles.css` (follow section-based organization, use CSS variables)
3. Create an IIFE module in `app.js`:
   ```javascript
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
4. Call `MyModule.init()` in the second `DOMContentLoaded` block (around line ~2292)
5. Add tests in `__tests__/my-module.test.js`
6. Update README if the section adds user-facing features

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

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](LICENSE).
