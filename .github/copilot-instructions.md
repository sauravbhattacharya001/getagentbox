# Copilot Instructions — getagentbox

## Project Overview

**getagentbox** is the landing page for [AgentBox](https://t.me/AgentBox11Bot), a personal AI agent that lives in Telegram. The entire site is a single `index.html` file — no build step, no framework, no dependencies.

**Live site:** https://sauravbhattacharya001.github.io/getagentbox/

## Architecture

```
getagentbox/
├── index.html          # The entire landing page (HTML + CSS + JS)
├── README.md           # Project documentation
└── .github/
    ├── copilot-setup-steps.yml
    └── copilot-instructions.md
```

### index.html Structure

The file is a self-contained single-page app with three embedded sections:

1. **`<style>`** — All CSS (responsive, dark theme, gradient backgrounds, animations)
2. **`<body>`** — Semantic HTML with these sections:
   - Hero (logo + title + tagline)
   - Features grid (6 feature cards with icons)
   - Interactive chat demo (animated conversation bubbles)
   - CTA section (Telegram link + free tier badge)
   - Footer
3. **`<script>`** — Interactive chat demo logic:
   - 4 conversation scenarios (memory, search, reminder, image)
   - Typing indicator animation
   - Bubble-by-bubble playback with timing
   - Scenario switching via tab buttons

### Key Design Decisions

- **No framework** — Vanilla HTML/CSS/JS for maximum simplicity and zero build overhead
- **Single file** — Everything in `index.html` for easy deployment via GitHub Pages
- **Dark theme** — Gradient background (#1a1a2e → #16213e → #0f3460), light text
- **Telegram-style chat** — Demo uses realistic chat bubble styling matching Telegram's dark mode
- **GoatCounter analytics** — Privacy-friendly, lightweight analytics at the bottom of the page

## Conventions

- **Colors:** Primary gradient `#00d4ff` → `#7b2cbf`, text white, muted text `#888` / `#a0a0a0`
- **Border radius:** 16px for cards/sections, 12px for chat bubbles, 8px for buttons, 20px for badges
- **Font stack:** System fonts (`-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, ...`)
- **Responsive:** Single breakpoint at 480px for mobile
- **Animations:** `bubbleIn` (chat messages), `typingBounce` (typing dots)

## How to Test

Since there's no build step:

1. Open `index.html` in a browser to verify visual appearance
2. Check all 4 chat demo scenarios cycle correctly
3. Verify responsive layout at mobile widths (< 480px)
4. Confirm the Telegram CTA link goes to `https://t.me/AgentBox11Bot`
5. Run `htmlhint index.html` to catch HTML issues

## Guidelines for Changes

- Keep everything in `index.html` — do not extract CSS/JS into separate files
- Maintain the dark theme aesthetic — avoid light backgrounds or clashing colors
- Test mobile responsiveness for any layout changes
- The chat demo is the key interactive element — preserve its timing and animations
- GoatCounter script at the bottom should not be removed or modified
- Keep the page lightweight (no heavy images, no CDN dependencies, no frameworks)
- All external links should use `target="_blank"` with proper `rel` attributes

## Performance Architecture

The site uses several performance patterns — preserve them when making changes:

### CSS Containment
Independent page sections (`.features`, `.demo-section`, `.comparison-section`, `.faq-section`, `.cta-section`, `.chat-window`) use `contain: content` or `contain: layout style` to isolate their layout/paint from each other. This tells the browser that changes inside one section can't affect layout outside it, eliminating unnecessary recalculations.

### GPU-Composited Animations
- `.chat-bubble` uses `will-change: transform, opacity` for its `bubbleIn` animation
- `.typing-indicator span` uses `will-change: transform` for the bounce animation
- `.chat-window` uses `will-change: scroll-position` for smooth scrolling
- These promote elements to their own compositor layers, avoiding main-thread paint work

### Batched Scrolling
Chat demo scrolling uses `requestAnimationFrame` via `scheduleScroll()` instead of direct `scrollTop` writes. This avoids forced synchronous layout — reading `scrollHeight` after a DOM write forces the browser to compute layout immediately. The rAF defers the read+write to the browser's next paint frame.

### DOM Optimization
- `addBubble()` builds content in a `DocumentFragment` before appending to the DOM (one reflow instead of N)
- Typing indicator uses `cloneNode(true)` from a pre-built template instead of creating 4 new nodes each time

### Resource Hints
- `<link rel="preconnect">` and `<link rel="dns-prefetch">` for `gc.zgo.at` (GoatCounter CDN) — eliminates DNS + TCP + TLS overhead on first analytics request

## Security

See `SECURITY.md` in the repo root for the full security policy. Key points:
- Strict CSP blocks all unexpected resource loading
- No `innerHTML` for dynamic content — only safe DOM APIs
- External scripts require `crossorigin` attribute
- Clickjacking prevented via `frame-ancestors 'none'`
