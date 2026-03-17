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
├── index.html          # Main landing page (all sections)
├── styles.css          # All styles (responsive, dark theme)
├── app.js              # Interactive components (chat demo, carousel, etc.)
├── __tests__/
│   └── index.test.js   # Jest + jsdom tests for all modules
├── package.json        # Test dependencies only
├── Dockerfile          # Production container (nginx)
└── .github/            # CI, CodeQL, Pages deploy, Dependabot
```

## Tech Stack

- **Pure HTML/CSS/JS** — no frameworks, no build step
- **Jest + jsdom** for testing
- **GitHub Pages** for deployment
- **Docker + nginx** for containerized hosting

## Development Guidelines

### Code Style

- Vanilla JavaScript — no frameworks or transpilers
- Modules are defined as global objects in `app.js` (e.g., `ChatDemo`, `FAQ`, `Pricing`, `Testimonials`, `HowItWorks`, `Stats`)
- Each module follows the pattern: `init()`, `reset()`, plus module-specific methods
- CSS uses a single `styles.css` file with section-based organization
- Use semantic HTML with ARIA attributes for accessibility

### Content Security Policy

The site uses a strict CSP header in `index.html`. If you add new external resources:
- Update the CSP meta tag to allow the new origin
- Only `https:` sources are permitted for images
- Scripts must be from `'self'` or explicitly allowed domains

### Testing

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run a specific test file
npx jest __tests__/index.test.js
```

**Test conventions:**
- Tests use jsdom environment (configured in `jest.config.js`)
- Each module has a `describe` block in `index.test.js`
- DOM elements are set up in `beforeEach` using `document.body.innerHTML`
- `app.js` is loaded inline in tests (jsdom can't fetch external scripts from `file://`)
- Aim for meaningful assertions — test behavior, not implementation details

### Adding a New Section

1. Add the HTML in `index.html` within the `.container` div
2. Add styles in `styles.css` (follow existing section patterns)
3. If interactive, add a module in `app.js`:
   ```javascript
   const MySection = {
       init() { /* set up event listeners */ },
       reset() { /* clean up for testing */ },
       // ... module methods
   };
   ```
4. Call `MySection.init()` in the `DOMContentLoaded` listener
5. Add tests in `__tests__/index.test.js`
6. Update README if the section adds user-facing features

### Responsive Design

- Mobile-first approach
- Breakpoints: 768px (tablet), 480px (phone)
- Test on multiple viewport sizes before submitting

### Accessibility

- Use semantic elements (`<section>`, `<nav>`, `<button>`)
- Add `aria-label` to interactive elements
- Ensure keyboard navigation works (Tab, Enter, Escape)
- Maintain color contrast ratios (dark theme)

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
- [ ] CSP meta tag updated if new external resources added
- [ ] Tested on mobile viewport (≤480px) and tablet (≤768px)
- [ ] Keyboard navigation works for any new interactive elements
- [ ] ARIA attributes added to new interactive components
- [ ] No hardcoded colors — use existing CSS custom properties

## What We're Looking For

**Good contributions:**
- New landing page sections that showcase AgentBox features
- Accessibility improvements
- Performance optimizations (lazy loading, reduced paint)
- Better mobile experience
- Animation polish
- SEO improvements
- Test coverage for untested modules

**Please avoid:**
- Adding build tools or frameworks (keep it vanilla)
- Major redesigns without discussion
- Changes that break the CSP policy
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
