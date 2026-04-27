# Testing Guide

Comprehensive testing reference for the AgentBox landing page project.

---

## Quick Start

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run a specific test file
npx jest __tests__/storage.test.js

# Run tests matching a pattern
npx jest --testNamePattern="escapeHtml"

# Watch mode during development
npx jest --watch
```

## Stack

| Tool | Version | Purpose |
|------|---------|---------|
| [Jest](https://jestjs.io) | ^30.3.0 | Test runner + assertions |
| [jsdom](https://github.com/jsdom/jsdom) | ^30.3.0 (via jest-environment-jsdom) | Browser DOM simulation |

No additional test libraries. All mocking uses Jest built-ins (`jest.fn()`, `jest.spyOn()`).

## Test Architecture

### File Layout

```
__tests__/
├── dom-utils.test.js           # Shared DOM helpers
├── storage.test.js             # SafeStorage (localStorage wrapper)
├── stats.test.js               # Animated statistics
├── pricing-faq.test.js         # Pricing toggle + FAQ accordion
├── calculator-newsletter-palette.test.js  # Calculator, newsletter, palette
├── pipeline-builder.test.js    # Visual pipeline builder
├── keyboard-shortcuts.test.js  # Keyboard shortcut manager
├── ...                         # 66 test files total
```

### Module Loading Pattern

Since the source uses ES5 IIFEs (no ES modules), tests load source files via
`fs.readFileSync` + `eval`:

```javascript
function loadModule() {
  const code = fs.readFileSync(
    path.resolve(__dirname, '../src/modules/my-module.js'), 'utf8'
  );
  eval(code);
  return MyModule;  // The IIFE exports to window/global
}
```

Each `beforeEach` resets the DOM (`document.body.innerHTML = ''`) and reloads
the module to ensure test isolation.

### DOM Setup

Tests that need specific HTML structure create it in `beforeEach`:

```javascript
beforeEach(() => {
  document.body.innerHTML = `
    <div class="stats-grid">
      <div class="stat-card" data-target="1000" data-suffix="+">
        <span class="stat-number">0</span>
      </div>
    </div>
  `;
  Module = loadModule();
  Module.init();
});
```

### localStorage Mocking

Several modules use `SafeStorage` for persisted state. Tests mock
`localStorage` via:

```javascript
const mockStorage = {};
jest.spyOn(Storage.prototype, 'getItem').mockImplementation(k => mockStorage[k] || null);
jest.spyOn(Storage.prototype, 'setItem').mockImplementation((k, v) => { mockStorage[k] = v; });
jest.spyOn(Storage.prototype, 'removeItem').mockImplementation(k => { delete mockStorage[k]; });
```

Or by loading `SafeStorage` (from `src/modules/storage.js`) which sanitizes
keys and values before writing.

## Coverage

### Thresholds

Enforced globally in `jest.config.js`:

| Metric | Threshold |
|--------|-----------|
| Branches | 60% |
| Functions | 60% |
| Lines | 70% |
| Statements | 70% |

CI fails if any threshold is not met.

### Generating Reports

```bash
npm run test:coverage
```

Output goes to `coverage/`:
- `coverage/lcov-report/index.html` — interactive HTML report
- `coverage/lcov.info` — for Codecov/Coveralls upload
- `coverage/coverage-summary.json` — machine-readable summary

### Coverage Collection

Only source modules are instrumented:

```javascript
collectCoverageFrom: [
  'src/**/*.js',
  '!src/**/*.test.js',
  '!src/**/index.js',
]
```

## Writing Tests

### Conventions

1. **One test file per module** — `__tests__/<module-name>.test.js`
2. **Descriptive test names** — `it('returns empty array when no items match filter')`
3. **Arrange-Act-Assert** pattern within each test
4. **Reset DOM in `beforeEach`** — never depend on state from a previous test
5. **No network calls** — all data is mocked or statically defined

### Testing DOM Interactions

```javascript
test('clicking toggle switches theme', () => {
  const btn = document.querySelector('.theme-toggle');
  btn.click();
  expect(document.body.classList.contains('light-theme')).toBe(true);
});
```

### Testing Event Handlers

```javascript
test('keydown Escape closes modal', () => {
  Module.open();
  const event = new KeyboardEvent('keydown', { key: 'Escape' });
  document.dispatchEvent(event);
  expect(document.querySelector('.modal').style.display).toBe('none');
});
```

### Testing Timers

Use Jest fake timers for modules with `setTimeout`/`setInterval`:

```javascript
beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

test('carousel auto-advances after interval', () => {
  Module.init();
  jest.advanceTimersByTime(5000);
  expect(Module.currentIndex()).toBe(1);
});
```

### Snapshot Testing

Not used in this project. Prefer explicit assertions over snapshots for
DOM content since the markup changes frequently during feature development.

## Test Categories

| Category | Files | What They Test |
|----------|-------|----------------|
| **Core UI** | `pricing-faq`, `stats`, `testimonials`, `sitenav` | Main page sections |
| **Interactive Tools** | `calculator-*`, `playground`, `pipeline-builder`, `workflow-*` | Complex interactive components |
| **Security** | `storage`, `localstorage-security`, `refactor-security`, `docs-security` | XSS prevention, CSP, input sanitization |
| **Accessibility** | `accessibility`, `bugfix-aria-stats` | ARIA attributes, keyboard navigation |
| **Bug Regressions** | `bugfix-*`, `feedback-edge-cases` | Specific bug fix regressions |
| **Discovery** | `glossary`, `roadmap`, `changelog`, `integrations` | Content browsing features |
| **Utilities** | `dom-utils`, `scroll-*`, `keyboard-shortcuts` | Shared helpers |

## CI Integration

Tests run automatically on every push and pull request via
`.github/workflows/ci.yml`. The coverage report is uploaded to Codecov.

```yaml
# In CI:
npm ci
npm test -- --coverage
```

## Troubleshooting

### "ReferenceError: X is not defined"

The module's IIFE didn't export correctly. Check that the `eval()` in your
test matches the actual filename/path in `src/modules/`.

### "document.querySelector returned null"

Your `beforeEach` DOM setup is missing the elements the module expects.
Check the module's `init()` function for required selectors.

### Tests pass locally but fail in CI

- **Timer-dependent** — use `jest.useFakeTimers()` instead of real delays
- **Random order** — check for shared state between tests; ensure `beforeEach` resets everything
- **Node version** — CI uses Node 18+; check `engines` in `package.json`

### Slow tests

The test suite should complete in < 10 seconds. If a test is slow:
- Use `jest.useFakeTimers()` for animated/timed modules
- Avoid loading all source files when only one module is needed
- Check for unbounded loops in DOM setup
