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
