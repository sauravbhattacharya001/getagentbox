# AgentBox Landing Page — Module Reference

Complete reference for all 27 interactive modules in `app.js`.

Each module is an ES5 IIFE (Immediately Invoked Function Expression) exported
to `window`. They are initialized via `DOMContentLoaded` and use no external
dependencies beyond the DOM.

> **Important:** All modules use ES5 syntax (`var`, `function`, no arrow
> functions) for maximum browser compatibility.

---

## Contents

### Core Experience
- [ChatDemo](#chatdemo) — Interactive Telegram-style chat simulations
- [Testimonials](#testimonials) — Auto-rotating testimonial carousel
- [Pricing](#pricing) — Billing toggle (monthly/annual)
- [FAQ](#faq) — Accordion-style frequently asked questions
- [HowItWorks](#howitworks) — Step-by-step reveal animation
- [Stats](#stats) — Animated statistics counter cards

### Discovery
- [UseCases](#usecases) — Tabbed use-case showcase
- [Integrations](#integrations) — Filterable integrations grid
- [Changelog](#changelog) — Version history with tag filtering
- [Roadmap](#roadmap) — Feature roadmap with status filtering and voting
- [Trust](#trust) — Security & trust badges toggle
- [PromptGallery](#promptgallery) — Example prompt cards with copy-to-clipboard
- [ActivityFeed](#activityfeed) — Simulated real-time activity stream

### Interactive Tools
- [Calculator](#calculator) — Pricing calculator
- [CommandPalette](#commandpalette) — Keyboard-driven command palette (Ctrl+K)
- [Playground](#playground) — Live API playground
- [ApiExplorer](#apiexplorer) — Searchable API endpoint explorer
- [OnboardingQuiz](#onboardingquiz) — Plan recommendation quiz
- [PersonalityConfigurator](#personalityconfigurator) — AI personality slider configurator
- [FeatureTour](#featuretour) — Guided product tour overlay
- [CommandsCheatSheet](#commandscheatsheet) — Bot commands reference grid

### Chrome
- [SiteNav](#sitenav) — Responsive navigation with scroll tracking
- [Newsletter](#newsletter) — Email subscription widget
- [StatusDashboard](#statusdashboard) — Service health monitor
- [ShareFab](#sharefab) — Floating action button for social sharing
- [ThemeToggle](#themetoggle) — Dark/light theme switcher
- [ScrollProgress](#scrollprogress) — Reading progress indicator bar
- [ShortcutsHelp](#shortcutshelp) — Keyboard shortcuts overlay

---

## Core Experience

### ChatDemo

Interactive Telegram-style chat simulations demonstrating four core
features: Memory, Search, Reminder, and Image understanding.

**Source:** L108–L222 (115 lines)

| Method | Description |
|--------|-------------|
| `switchTo(scenario)` | Switch to a named scenario (`"memory"`, `"search"`, `"reminder"`, `"image"`) |
| `play()` | Start or restart the current scenario animation |

**Dependencies:** `SCENARIOS` (chat script data), `_typingIndicatorTemplate`

---

### Testimonials

Auto-rotating testimonial carousel with swipe support and dot
navigation. Supports reduced-motion preferences.

**Source:** L227–L352 (126 lines)

| Method | Description |
|--------|-------------|
| `init()` | Initialize carousel, bind swipe/keyboard events |
| `goTo(index)` | Navigate to a specific testimonial |
| `next()` / `prev()` | Navigate forward/backward |
| `startAutoPlay()` / `stopAutoPlay()` | Control 5-second auto-rotation |
| `getCurrent()` | Returns current slide index |
| `getTotal()` | Returns total number of slides |

---

### Pricing

Monthly/annual billing toggle with savings calculation display.

**Source:** L357–L400 (44 lines)

| Method | Description |
|--------|-------------|
| `toggle()` | Switch between monthly and annual billing display |

---

### FAQ

Accordion-style FAQ section. Only one answer is open at a time.

**Source:** L405–L430 (26 lines)

| Method | Description |
|--------|-------------|
| `toggle(item)` | Expand/collapse a FAQ item |

---

### HowItWorks

Scroll-triggered step-by-step reveal animation using IntersectionObserver.

**Source:** L435–L493 (59 lines)

| Method | Description |
|--------|-------------|
| `init()` | Set up IntersectionObserver for step cards |
| `isRevealed()` | Whether all steps have been revealed |
| `reset()` | Reset to hidden state |
| `revealSteps()` | Programmatically reveal all steps |

---

### Stats

Animated counter cards that count up to target values on scroll.
Configurable duration and easing (cubic ease-out).

**Source:** L498–L693 (196 lines)

| Method | Description |
|--------|-------------|
| `init(selector, options)` | Initialize with container selector and optional `{ duration }` |
| `animateAll()` | Trigger all card animations |
| `animateCard(card)` | Animate a single card element |
| `formatNumber(n)` | Format number with locale separators |
| `isAnimated()` | Whether animation has completed |
| `reset()` | Reset counters to zero |
| `DURATION` | Default animation duration (ms) |

---

## Discovery

### UseCases

Tabbed showcase of different use-case categories with card-flip
animations.

**Source:** L698–L794 (97 lines)

| Method | Description |
|--------|-------------|
| `init()` | Initialize tab click handlers |
| `switchTo(tab)` | Switch to a named use-case tab |
| `getCurrent()` | Returns the currently active tab name |
| `getTabs()` | Returns array of available tab names |

---

### Integrations

Filterable grid of third-party integrations with category buttons
and status indicators.

**Source:** L799–L909 (111 lines)

| Method | Description |
|--------|-------------|
| `init()` | Initialize filter buttons and grid |
| `filterBy(category)` | Filter integrations by category (`"all"`, `"productivity"`, etc.) |
| `getCurrent()` | Returns current filter category |
| `getCategories()` | Returns available categories |
| `getIntegrations()` | Returns all integration data |
| `getStatusCounts()` | Returns count by status (active/coming soon) |

---

### Changelog

Version history display with tag-based filtering (feature, fix,
improvement, etc.).

**Source:** L914–L1043 (130 lines)

| Method | Description |
|--------|-------------|
| `init()` | Initialize changelog UI and filter handlers |
| `filterBy(tag)` | Filter entries by tag |
| `getCurrent()` | Returns current filter tag |
| `getTags()` | Returns available tags |
| `getEntries()` | Returns all changelog entries |
| `getTagCounts()` | Returns entry count per tag |

---

### Roadmap

Feature roadmap with status filtering, vote buttons, and progress
indicators.

**Source:** L1571–L1817 (247 lines)

| Method | Description |
|--------|-------------|
| `init()` | Initialize roadmap UI |
| `filterBy(status)` | Filter by status (`"all"`, `"planned"`, `"in-progress"`, `"shipped"`) |
| `getCurrent()` | Returns current filter |
| `getStatuses()` | Returns available statuses |
| `getStatusCounts()` | Returns count per status |
| `getCards()` | Returns all roadmap cards |
| `getVisibleCards()` | Returns currently visible cards |
| `getVotes(cardId)` | Returns vote count for a card |

---

### Trust

Toggle for security and trust badges/certifications section.

**Source:** L1048–L1082 (35 lines)

| Method | Description |
|--------|-------------|
| `toggle()` | Show/hide trust details |

---

### PromptGallery

Gallery of example prompts organized by category with copy-to-clipboard.

**Source:** L2909–L3125 (217 lines)

| Method | Description |
|--------|-------------|
| `init()` | Initialize gallery with category tabs and copy handlers |

---

### ActivityFeed

Simulated real-time activity stream showing recent user actions
(new users, messages sent, reminders set, etc.).

**Source:** L2699–L2905 (207 lines)

| Method | Description |
|--------|-------------|
| `init()` | Start the activity feed simulation |
| `destroy()` | Stop the simulation and clean up intervals |

---

## Interactive Tools

### Calculator

Pricing calculator that estimates monthly cost based on selected
services and usage volume.

**Source:** L2001–L2097 (97 lines)

| Method | Description |
|--------|-------------|
| `init()` | Initialize calculator inputs and event handlers |
| `update()` | Recalculate total based on current inputs |
| `getTotal()` | Returns the calculated monthly total |

---

### CommandPalette

Keyboard-driven command palette (Ctrl+K / Cmd+K) with fuzzy search
across all page sections, features, and actions.

**Source:** L2101–L2302 (202 lines)

| Method | Description |
|--------|-------------|
| `init()` | Initialize palette, register keyboard shortcut |
| `destroy()` | Remove event listeners and clean up |
| `open()` | Open the command palette modal |
| `close()` | Close the command palette modal |

**Keyboard:** `Ctrl+K` to open, `Escape` to close, `↑↓` to navigate, `Enter` to select.

---

### Playground

Live API playground where users can try example API calls and see
formatted responses.

**Source:** L2546–L2693 (148 lines)

| Method | Description |
|--------|-------------|
| `init()` | Initialize playground with example endpoints |

---

### ApiExplorer

Searchable, filterable API endpoint explorer with method badges,
request/response examples, and endpoint detail views.

**Source:** L4705–L4948 (244 lines)

| Method | Description |
|--------|-------------|
| `init()` | Initialize explorer grid and search handlers |

---

### OnboardingQuiz

Multi-step quiz that recommends the best plan based on user
answers. Tracks answers across questions and computes weighted
scores for each plan.

**Source:** L4356–L4703 (348 lines)

| Method | Description |
|--------|-------------|
| `init()` | Initialize quiz UI and start at question 1 |
| `reset()` | Reset all answers and return to question 1 |
| `showQuestion(n)` | Display question number `n` |
| `scorePlan()` | Calculate and display recommended plan |
| `QUESTIONS` | Array of quiz question definitions |
| `PLANS` | Array of plan definitions with scoring weights |

---

### PersonalityConfigurator

Slider-based AI personality configurator with presets and live
response preview. Users adjust formality, humor, verbosity,
emoji usage, and technical depth.

**Source:** L3131–L3468 (338 lines)

| Method | Description |
|--------|-------------|
| `init()` | Initialize sliders, presets, and preview |
| `applyPreset(name)` | Apply a named preset (`"professional"`, `"casual"`, `"technical"`, `"friendly"`) |
| `cycleQuestion()` | Cycle to the next example question for preview |
| `getSliderValues()` | Returns current slider positions as an object |

---

### FeatureTour

Guided product tour overlay that highlights page sections with
tooltips, progress tracking, and navigation arrows.

**Source:** L3899–L4227 (329 lines)

| Method | Description |
|--------|-------------|
| `start()` | Begin the tour at the first stop |
| `stop()` | End the tour and remove overlay |
| `next()` / `prev()` | Navigate between tour stops |
| `currentStep()` | Returns the current step index |
| `isActive()` | Whether the tour is currently running |
| `hasCompleted()` | Whether the user has finished the tour |
| `reset()` | Clear completion state |

---

### CommandsCheatSheet

Grid of bot commands with descriptions and copy-to-clipboard.

**Source:** L4229–L4351 (123 lines)

| Method | Description |
|--------|-------------|
| `init()` | Initialize cheat sheet grid |
| `render()` | Re-render the commands grid |

---

## Chrome

### SiteNav

Responsive navigation bar with smooth-scroll links, mobile
hamburger menu, and scroll-position-based active section
highlighting.

**Source:** L1292–L1473 (182 lines)

| Method | Description |
|--------|-------------|
| `init()` | Initialize nav links, scroll listeners, mobile menu |
| `destroy()` | Remove all event listeners |
| `getActiveSection()` | Returns the ID of the currently visible section |
| `closeMenu()` | Close the mobile menu |
| `cacheSectionOffsets()` | Recalculate section positions (call after layout changes) |
| `reset()` | Reset active state |

---

### Newsletter

Email subscription widget with basic validation and subscriber
count display.

**Source:** L1480–L1566 (87 lines)

| Method | Description |
|--------|-------------|
| `init()` | Initialize form handler and validation |
| `getSubscribers()` | Returns current subscriber count |

---

### StatusDashboard

Service health monitor showing uptime percentages, status
indicators, and recent incidents for each service.

**Source:** L1822–L1992 (171 lines)

| Method | Description |
|--------|-------------|
| `init()` | Initialize dashboard with service cards |
| `getServices()` | Returns all service entries |
| `getIncidents()` | Returns recent incidents |
| `getServiceStatus(name)` | Returns status for a specific service |
| `getServiceUptime(name)` | Returns uptime percentage for a service |
| `setServiceStatus(name, status)` | Update a service's status |
| `setServiceUptime(name, pct)` | Update a service's uptime |
| `updateOverall()` | Recalculate overall platform status |
| `getOverallStatus()` | Returns aggregate status |
| `getServiceNames()` | Returns array of service names |
| `getAverageUptime()` | Returns mean uptime across services |
| `getIncidentCount()` | Returns total incident count |

---

### ShareFab

Floating action button with social sharing options (Twitter,
LinkedIn, email, clipboard).

**Source:** L2306–L2390 (85 lines)

| Method | Description |
|--------|-------------|
| `init()` | Initialize FAB and share button handlers |

---

### ThemeToggle

Dark/light theme switcher that persists preference to localStorage
and respects system `prefers-color-scheme`.

**Source:** L2394–L2420 (27 lines)

| Method | Description |
|--------|-------------|
| `init()` | Initialize toggle button and load saved preference |

---

### ScrollProgress

Reading progress indicator bar at the top of the page. Shows
percentage of page scrolled.

**Source:** L2425–L2497 (73 lines)

| Method | Description |
|--------|-------------|
| `init()` | Create progress bar element and bind scroll listener |
| `destroy()` | Remove progress bar and unbind listener |

---

### ShortcutsHelp

Keyboard shortcuts overlay modal listing all available keyboard
shortcuts across modules.

**Source:** L2499–L2544 (46 lines)

| Method | Description |
|--------|-------------|
| `init()` | Initialize shortcut (`?`) key listener and modal |

**Keyboard:** `?` to open, `Escape` to close.

---

## Data Module

### SCENARIOS

Chat script data for the four ChatDemo scenarios. Not a module
with methods — it's a data constant containing message sequences,
typing delays, and response content.

**Source:** L1–L96

---

*27 modules, ~4,950 lines of vanilla JavaScript. Zero external dependencies.*

*Auto-generated from source. Last updated: 2026-03-06.*
