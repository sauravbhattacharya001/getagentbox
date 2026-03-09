# Customization Guide

How to customize the AgentBox landing page for your own product, brand, or SaaS.

The page is a single-file static site (`index.html` + `app.js` + `styles.css`) with
no build step. All customization is done by editing these three files directly.

---

## Table of Contents

- [Quick Brand Swap](#quick-brand-swap)
- [Colors & Theming](#colors--theming)
- [Typography](#typography)
- [Hero Section](#hero-section)
- [Features](#features)
- [Pricing](#pricing)
- [Testimonials](#testimonials)
- [Chat Demo](#chat-demo)
- [FAQ](#faq)
- [Footer & Links](#footer--links)
- [Interactive Modules](#interactive-modules)
- [Adding New Sections](#adding-new-sections)
- [Removing Sections](#removing-sections)
- [Analytics & Tracking](#analytics--tracking)

---

## Quick Brand Swap

For a minimal rebrand (< 5 minutes):

1. **Product name** — find-and-replace `AgentBox` in `index.html`
2. **Primary color** — change `--color-primary` in `styles.css` `:root`
3. **Hero tagline** — edit the `<h1>` and `<p>` in the hero `<section>`
4. **CTA link** — update the Telegram bot URL to your product URL
5. **Favicon** — replace `favicon.ico` or update the `<link rel="icon">` tag

## Colors & Theming

All colors are defined as CSS custom properties in `:root` at the top of `styles.css`:

```css
:root {
  /* Primary brand colors */
  --color-primary: #00d4ff;     /* Main CTA, links, highlights */
  --color-primary-alt: #646cff; /* Secondary accent (gradients) */
  --color-accent: #7b2cbf;      /* Tertiary accent */
  --color-success: #4ade80;      /* Positive states */
  --color-warning: #fbbf24;      /* Warning states */
  --color-danger: #ef4444;       /* Error/destructive states */

  /* Backgrounds (dark theme) */
  --color-bg-deep: #1a1a2e;     /* Deepest background */
  --color-bg-mid: #16213e;      /* Mid-layer background */
  --color-bg-far: #0f3460;      /* Far background, gradient endpoint */

  /* Text */
  --color-text: #fff;           /* Primary text */
  --color-text-muted: #a0a0a0;  /* Secondary text */
  --color-text-dim: #888;       /* Tertiary/disabled text */
}
```

### Switching to light theme

Swap the background and text values:

```css
:root {
  --color-bg-deep: #ffffff;
  --color-bg-mid: #f5f5f5;
  --color-bg-far: #e8e8e8;
  --color-text: #1a1a2e;
  --color-text-muted: #555;
  --color-text-dim: #888;
  --color-surface: rgba(0, 0, 0, 0.03);
  --color-surface-hover: rgba(0, 0, 0, 0.06);
  --border-subtle: rgba(0, 0, 0, 0.1);
  --border-medium: rgba(0, 0, 0, 0.15);
}
```

### Gradients

Several sections use gradients between `--color-primary` and `--color-primary-alt`.
Search `styles.css` for `linear-gradient` and update the stops to match your brand.

## Typography

The default font stack uses system fonts. To change:

```css
body {
  font-family: 'Your Font', -apple-system, BlinkMacSystemFont, sans-serif;
}
```

Add a Google Fonts `<link>` to `index.html` `<head>` if using web fonts.

Font sizes use `rem` units. The base size is set on `html` (default `16px`).

## Hero Section

The hero is the first visible section. In `index.html`, look for:

```html
<section class="hero">
  <h1>Your Product Name</h1>
  <p class="hero-subtitle">Your tagline goes here</p>
  <a href="..." class="cta-button">Get Started</a>
</section>
```

To customize:

| Element | What to change |
|---------|---------------|
| `<h1>` | Product name and headline |
| `.hero-subtitle` | Value proposition (1–2 sentences) |
| `.cta-button` | Button text and `href` link |
| Background | Edit `.hero` styles in `styles.css` |

## Features

Features are rendered as cards. In `index.html`, each feature is:

```html
<div class="feature-card">
  <div class="feature-icon">🔍</div>
  <h3>Feature Name</h3>
  <p>Feature description.</p>
</div>
```

To add/remove features, add/remove `<div class="feature-card">` blocks. The CSS
grid auto-adjusts columns based on viewport width.

## Pricing

The pricing section uses a toggle between monthly and annual billing, managed
by the `Pricing` module in `app.js`.

### Changing plans

Edit the pricing cards in `index.html`. Each plan has:

```html
<div class="pricing-card">
  <h3>Plan Name</h3>
  <div class="price" data-monthly="9" data-annual="90">$9/mo</div>
  <ul class="plan-features">
    <li>Feature 1</li>
    <li>Feature 2</li>
  </ul>
  <a href="..." class="plan-cta">Choose Plan</a>
</div>
```

The `Pricing` module reads `data-monthly` and `data-annual` attributes and swaps
the displayed price when the toggle is clicked.

### Removing pricing

Delete the pricing `<section>` from `index.html` and remove the `Pricing` IIFE
from `app.js`. No other modules depend on it.

## Testimonials

Testimonials auto-rotate in a carousel via the `Testimonials` module.

Each testimonial in `index.html`:

```html
<div class="testimonial">
  <p class="testimonial-text">"Quote text here."</p>
  <span class="testimonial-author">— Name, Title</span>
</div>
```

Add or remove `.testimonial` blocks. The carousel interval is set inside the
`Testimonials` module in `app.js` (look for the `setInterval` call).

## Chat Demo

The `ChatDemo` module renders an interactive Telegram-style chat simulation.

To change the demo conversation, find the `ChatDemo` IIFE in `app.js` and edit
the message array. Each message is an object:

```javascript
{ sender: 'user', text: 'Your question here' }
{ sender: 'bot', text: 'Bot response here', typing: 1500 }
```

`typing` is the simulated typing delay in milliseconds.

## FAQ

FAQ items use an accordion pattern via the `FAQ` module.

Each item in `index.html`:

```html
<div class="faq-item">
  <button class="faq-question">Question text?</button>
  <div class="faq-answer"><p>Answer text.</p></div>
</div>
```

Add or remove `.faq-item` blocks as needed.

## Footer & Links

The footer contains product links, social icons, and legal text. Edit directly
in `index.html`. Update:

- Social media URLs
- Legal/privacy links
- Copyright year and company name
- Contact email

## Interactive Modules

All interactive behavior lives in `app.js` as self-contained IIFE modules. Each
module attaches to specific CSS classes/IDs in `index.html`.

See [`docs/modules.md`](modules.md) for a complete reference of all 27+ modules.

### Module initialization

Modules are initialized in a single `DOMContentLoaded` event listener at the
bottom of `app.js`. To disable a module, remove or comment out its `.init()` call.

### Module dependencies

Most modules are independent. The exceptions:

- `SafeStorage` — used by several modules for localStorage access
- `AnalyticsTracker` — optional, used by modules that track events
- `ThemeManager` — controls dark/light theme toggles

## Adding New Sections

1. Add a `<section>` block in `index.html` at the desired position
2. Add styles in `styles.css` (follow the existing section pattern)
3. If interactive, add an IIFE module in `app.js`:

```javascript
var YourModule = (function () {
  'use strict';

  function init() {
    // Your initialization code
  }

  return { init: init };
})();
```

4. Call `YourModule.init()` inside the `DOMContentLoaded` handler

## Removing Sections

1. Delete the `<section>` from `index.html`
2. Remove corresponding styles from `styles.css` (search by section class)
3. Remove the IIFE module from `app.js`
4. Remove the `.init()` call from the `DOMContentLoaded` handler

No modules depend on the presence of specific HTML sections — missing DOM elements
are handled gracefully (modules check for element existence before attaching).

## Analytics & Tracking

The `AnalyticsTracker` module in `app.js` provides event tracking. By default it
logs to the console. To connect a real analytics provider:

1. Find the `AnalyticsTracker` IIFE in `app.js`
2. Replace the `_send()` function body with your provider's API call
3. Common integrations:

```javascript
// Google Analytics 4
function _send(event, data) {
  gtag('event', event, data);
}

// Plausible
function _send(event, data) {
  plausible(event, { props: data });
}

// PostHog
function _send(event, data) {
  posthog.capture(event, data);
}
```

---

## File Structure

```
getagentbox/
├── index.html      # All HTML markup (single page)
├── app.js          # All interactive modules (IIFE pattern)
├── styles.css      # All styles (CSS custom properties)
├── docs/
│   ├── modules.md  # Complete module API reference
│   └── customization.md  # This file
└── __tests__/      # Jest test suite
```

## Tips

- **No build step needed** — edit and refresh
- **All modules are optional** — remove any you don't need
- **CSS variables cascade** — change `:root` values to retheme everything at once
- **Mobile-first** — the layout is responsive out of the box
- **ES5 syntax** — compatible with all modern browsers (no transpilation needed)
