# AgentBox Landing Page — Module Reference

Complete reference for all 38 interactive modules in `app.js`.

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

### Engagement & Social Proof
- [SuccessStories](#successstories) — Interactive case study cards with problem→action→result flow
- [SocialProofToasts](#socialprooftoasts) — Periodic user activity toast notifications
- [GrowthTimeline](#growthtimeline) — Interactive user journey milestone viewer
- [ComparisonTable](#comparisontable) — Feature comparison matrix vs alternatives
- [BeforeAfter](#beforeafter) — Before/after day comparison tabs
- [FeatureBoard](#featureboard) — Feature request board with voting
- [AIGlossary](#aiglossary) — Searchable AI/agent terminology reference (35 terms)

### Onboarding & Conversion
- [CapacityPlanner](#capacityplanner) — Team size / message volume plan estimator
- [QuickStartWizard](#quickstartwizard) — Guided use-case setup wizard
- [SetupChecklist](#setupchecklist) — Interactive onboarding progress tracker
- [PrivacyCheckup](#privacycheckup) — Privacy concern quiz with personalized reassurance
- [SpeedChallenge](#speedchallenge) — AgentBox-vs-traditional speed comparison demo
- [ReferralProgram](#referralprogram) — Tiered referral link system with progress tracker

### Visualization & Sharing
- [NotificationPreview](#notificationpreview) — Phone mockup with cycling notification scenarios
- [ShareCardGenerator](#sharecardgenerator) — Canvas-based social share image builder
- [SectionMinimap](#sectionminimap) — Floating page minimap for quick section navigation

### Integration & Automation
- [PipelineBuilder](#pipelinebuilder) — Drag-and-drop integration pipeline creator
- [WorkflowTemplates](#workflowtemplates) — Ready-to-use automation recipe gallery
- [CommunityShowcase](#communityshowcase) — User-submitted agent showcase with likes and filtering

### Support & Utility
- [HelpChatWidget](#helpchatwidget) — In-page FAQ chat bot with branching conversations
- [StorageUtil](#storageutil) — Safe localStorage wrapper used by all stateful modules

### Onboarding
- [QuickStartWizard](#quickstartwizard) — Step-by-step setup wizard per use-case
- [WorkflowTemplates](#workflowtemplates) — Pre-built workflow template browser
- [RoleDemoPicker](#roledemopicker) — Personalized role-based demo conversations

### Accessibility
- [AccessibilityPanel](#accessibilitypanel) — Floating preferences panel (font, contrast, motion)

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


---

## Engagement & Social Proof

### SuccessStories

Interactive case study cards showcasing real-world AgentBox success stories.

**What it does:** Displays expandable story cards with a problem → action → result
flow. Each story includes a persona, quantified outcome metrics, and category filter.
Stories auto-cycle with manual override.

**Public API:**
- `SuccessStories.init()` — Renders stories into `#success-stories` section
- `SuccessStories.getStories()` — Returns the full story dataset
- `SuccessStories.getActiveFilter()` — Returns the currently active category filter

**DOM target:** `#success-stories`

**Data:** 4 story categories (productivity, research, business, communication), each
with persona info, 3-step flow, and 3 outcome metrics.

---

### SocialProofToasts

Periodic toast notifications showing simulated user activity to build trust.

**What it does:** Displays timed popup toasts at the bottom of the page showing
messages like "Sarah from London just automated her email workflow." Respects
`prefers-reduced-motion`, caps at 15 toasts per session, and includes dismiss controls.

**Public API:**
- `SocialProofToasts.init()` — Starts the toast cycle after a 12-second initial delay

**Behavior:**
- Toast display: 5 seconds
- Interval between toasts: 25 seconds
- Session cap: 15 toasts maximum
- Randomized city names and action messages

---

### GrowthTimeline

Interactive milestone viewer showing a user's journey over time.

**What it does:** Displays a horizontal timeline with 4 milestones (Week 1, Month 1,
Month 3, Month 6). Each milestone reveals features unlocked at that stage with a
progress bar. Auto-advances every 4 seconds with pause-on-hover.

**Public API:**
- `GrowthTimeline.init()` — Renders timeline into `#growth-timeline` section
- `GrowthTimeline.getCurrent()` — Returns the current milestone index (0-3)
- `GrowthTimeline.getMilestones()` — Returns milestone IDs array

**DOM target:** `#growth-timeline`

---

### ComparisonTable

Feature comparison matrix showing AgentBox vs. alternatives.

**What it does:** Renders an interactive table comparing AgentBox against ChatGPT,
Zapier, Custom Bot, and Manual approaches across 4 categories (Automation,
Integration, Intelligence, Operations). Users can filter by category and hover for
feature details. AgentBox column is visually highlighted.

**Public API:**
- `ComparisonTable.init()` — Renders table into `#comparison-table` section
- `ComparisonTable.setFilter(category)` — Filter features by category ID
- `ComparisonTable.getScores()` — Returns aggregate scores per competitor
- `ComparisonTable.getActiveCategory()` — Returns the currently active filter

**DOM target:** `#comparison-table`

---

### BeforeAfter

Before/after daily workflow comparison with tabbed switching.

**What it does:** Two-panel tabbed view showing a user's day "Without AgentBox" vs.
"With AgentBox." Includes ARIA tab semantics (`aria-selected`, `role="tabpanel"`).
Keyboard-accessible via Enter and Space keys.

**Public API:**
- `BeforeAfter.init()` — Binds tab switching to `#baTabBefore` / `#baTabAfter`

**DOM targets:** `#baTabBefore`, `#baTabAfter`, `#baPanelBefore`, `#baPanelAfter`

---

### FeatureBoard

Feature request board with user voting and custom feature submission.

**What it does:** Displays a board of planned/in-progress/released features that
users can vote on. Supports custom feature submission, category filtering
(all/integration/intelligence/automation/ux), sorting (popular/newest/trending),
and persistent vote/submission storage via `localStorage`.

**Public API:**
- `FeatureBoard.init()` — Renders the board into `#feature-board` section
- `FeatureBoard.getFeatures()` — Returns all features (seed + custom)
- `FeatureBoard.getVotes()` — Returns the current vote counts
- `FeatureBoard.getFilter()` — Returns the active filter/sort state

**DOM target:** `#feature-board`

**Storage keys:** `agentbox_feature_votes`, `agentbox_feature_custom`

---

### AIGlossary

Searchable AI and agent terminology reference.

**What it does:** Displays a glossary of 35 AI/agent terms organized by category
(Core, Techniques, Architecture, Safety, Operations). Features live search,
category chip filters, expandable definitions with examples and related terms,
and a "word of the day" highlight.

**Public API:**
- `AIGlossary.init()` — Renders glossary into `#ai-glossary` section
- `AIGlossary.getTerms()` — Returns the full terms dataset (35 entries)
- `AIGlossary.getCategory()` — Returns the currently active category filter
- `AIGlossary.getQuery()` — Returns the current search query string

**DOM target:** `#ai-glossary`

---

## Onboarding

### QuickStartWizard

Multi-step setup wizard tailored to the user's use-case.

**What it does:** A 3-step wizard: (1) choose your use-case (productivity, research,
creative, business), (2) choose frequency (daily/weekly/occasional), (3) get
personalized step-by-step setup instructions. Each use-case has 5 setup steps and
a pro tip. Includes back/next navigation and progress dots.

**Public API:**
- `QuickStartWizard.init()` — Renders wizard into `#quick-start-wizard` section

**DOM target:** `#quick-start-wizard`

---

### WorkflowTemplates

Pre-built workflow template browser organized by category.

**What it does:** A filterable gallery of workflow templates (e.g., "Morning Briefing",
"Meeting Prep", "Weekly Report"). Users browse by category, preview step-by-step
workflows, and copy the trigger command. Each template shows estimated time saved
and complexity level.

**Public API:**
- `WorkflowTemplates.init()` — Renders template browser
- `WorkflowTemplates.filterBy(category)` — Filter templates by category
- `WorkflowTemplates.getTemplates()` — Returns all templates
- `WorkflowTemplates.getCategories()` — Returns available categories
- `WorkflowTemplates.getCurrent()` — Returns the currently selected template
- `WorkflowTemplates.getByCategory(cat)` — Returns templates in a category
- `WorkflowTemplates.getById(id)` — Returns a specific template by ID

**DOM target:** `#workflow-templates`

---

### RoleDemoPicker

Personalized role-based demo conversations.

**What it does:** Users select their job role (Marketing, Engineering, Executive,
Support, Sales, Freelancer) and see a simulated Telegram-style chat conversation
showing how AgentBox helps in that specific role. Each role has 3 example
user↔agent exchanges with role-specific scenarios.

**Location:** `src/role-demo-picker.js` (separate file, not in app.js IIFE)

**Public API:**
- `RoleDemoPicker.init()` — Renders role picker into `#role-demo` section

**DOM target:** `#role-demo`

---

## Accessibility

### AccessibilityPanel

Floating accessibility preferences panel.

**What it does:** A slide-out panel (triggered by a floating ♿ button) that lets users
customize their browsing experience. Settings persist in `localStorage` and apply
immediately via CSS classes on `<body>`.

**Settings:**
- **Font Size:** Small / Medium / Large / Extra Large
- **High Contrast:** Enhanced color contrast mode
- **Reduce Motion:** Disables animations and transitions
- **Dyslexia Font:** Switches to OpenDyslexic typeface
- **Focus Indicators:** Enhanced keyboard focus outlines
- **Line Spacing:** Normal / Relaxed / Loose

**Public API:**
- `AccessibilityPanel.init()` — Creates and injects the panel + trigger button
- `AccessibilityPanel.open()` — Opens the preferences panel
- `AccessibilityPanel.close()` — Closes the panel
- `AccessibilityPanel.toggle()` — Toggles panel visibility
- `AccessibilityPanel.destroy()` — Removes panel from DOM
- `AccessibilityPanel.getPrefs()` — Returns current preferences object

**Storage key:** `agentbox-a11y-prefs`

---

## Onboarding & Conversion

### CapacityPlanner

Interactive usage estimator and plan recommender.

**What it does:** Users adjust sliders for team size and daily message volume,
then check feature boxes (web search, image understanding, reminders, etc.).
The module calculates a recommended plan tier and estimated monthly cost in
real time.

**Location:** `src/modules/capacity-planner.js`

**Plans:** Free (≤20 msgs, $0) → Starter (≤200, $9) → Pro (≤1 000, $29) →
Team (≤5 000, $79) → Enterprise (unlimited, $199).

**Public API:**
- `CapacityPlanner.init()` — Builds the UI inside `#capacityPlannerSection`
- `CapacityPlanner.destroy()` — Removes event listeners

**DOM target:** `#capacityPlannerSection`

---

### QuickStartWizard

Guided 3-step wizard that tailors the onboarding flow to a user's chosen use case.

**What it does:** Asks users their primary use case (productivity, developer, or
creative), frequency preference, then shows a customized quick-start guide with
copy-able commands and a Telegram deep link.

**Location:** `src/modules/quick-start-wizard.js`

**Public API:**
- `QuickStartWizard.init()` — Renders the wizard into `#quickStartWizard`

**DOM target:** `#quickStartWizard`

---

### SetupChecklist

Persistent onboarding progress tracker with 6 setup steps.

**What it does:** Renders a checklist (Install Telegram → Start AgentBox →
Set Timezone → First Search → Create Reminder → Explore Features). Checked
steps persist in localStorage so returning visitors see their progress.

**Location:** `src/modules/setup-checklist.js`

**Public API:**
- `SetupChecklist.init()` — Renders checklist into `#setupChecklist`
- `SetupChecklist.destroy()` — Tears down the component
- `SetupChecklist.getProgress()` — Returns `{ completed, total, percent }`

**Storage key:** `agentbox_setup_checklist`

---

### PrivacyCheckup

Multi-step privacy quiz with a personalized privacy score.

**What it does:** Walks users through 6 questions about their data concerns
(storage, third-party sharing, AI training, encryption, data portability,
retention). Each answer reveals a relevant AgentBox privacy feature.
At the end, a score and tailored recommendations are displayed.

**Location:** `src/modules/privacy-checkup.js`

**Public API:**
- `PrivacyCheckup.init()` — Builds the quiz into `#privacyCheckup`
- `PrivacyCheckup.destroy()` — Removes event listeners

**DOM target:** `#privacyCheckup`

---

### SpeedChallenge

Side-by-side speed comparison: AgentBox vs. the traditional way.

**What it does:** Presents a question (e.g., "What's the capital of Bhutan?") and
races an animated AgentBox response against the multi-step traditional approach
(open browser → type query → scan results → read article). Displays elapsed
times to highlight the speed advantage.

**Location:** `src/modules/speed-challenge.js`

**Public API:**
- `SpeedChallenge.init()` — Renders into `#speedChallenge`
- `SpeedChallenge.destroy()` — Cleans up timers and listeners

**DOM target:** `#speedChallenge`

---

### ReferralProgram

Tiered referral system with progress tracker and social sharing.

**What it does:** Generates a fake referral code/link, tracks simulated referral
count, and shows progress through 5 tiers (Starter → Connector → Advocate →
Champion → Legend) with escalating perks. Includes milestone celebrations and
copy-to-clipboard sharing.

**Tiers:**
| Referrals | Tier | Perk |
|-----------|------|------|
| 0 | 🌱 Starter | Share your link to start earning |
| 3 | 🔗 Connector | +10 bonus messages/day |
| 10 | ⭐ Advocate | +25 messages/day + priority support |
| 25 | 🏆 Champion | Unlimited messages for 1 month |
| 50 | 👑 Legend | Lifetime Pro + custom personality |

**Location:** `src/modules/referral-program.js`

**Public API:**
- `ReferralProgram.init()` — Renders into `#referralProgram`
- `ReferralProgram.destroy()` — Cleans up

**Storage key:** `agentbox_referrals`

---

## Visualization & Sharing

### NotificationPreview

Phone mockup with cycling notification scenarios.

**What it does:** Renders a simulated phone screen that cycles through five
notification scenarios (Reminder, Search Result, Daily Digest, Smart Alert,
Scheduled Message). Users can toggle between compact and detailed views.

**Location:** `src/modules/notification-preview.js`

**Public API:**
- `NotificationPreview.init()` — Starts the cycling preview
- `NotificationPreview.destroy()` — Stops cycling

**DOM target:** `#notificationSection`

---

### ShareCardGenerator

Canvas-based social share image builder.

**What it does:** Lets users create a branded AgentBox share card by choosing a
color theme (gradient, ocean, sunset, forest, dark), toggling feature badges,
and entering a custom tagline. Renders to a `<canvas>` element and provides
a download button.

**Location:** `src/modules/share-card-generator.js`

**Public API:**
- `ShareCardGenerator.init()` — Builds the editor into `#shareCardGenerator`
- `ShareCardGenerator.destroy()` — Cleans up

**DOM target:** `#shareCardGenerator`

---

### SectionMinimap

Floating page minimap for quick section navigation.

**What it does:** Adds a vertical dot-nav on the right edge of the viewport.
Each dot corresponds to a page section. As the user scrolls, the active dot
updates and a tooltip shows the section label. Clicking a dot smooth-scrolls
to that section. Appears only when the page has >3 sections.

**Location:** `src/modules/section-minimap.js`

**Public API:**
- `SectionMinimap.init()` — Creates the minimap
- `SectionMinimap.destroy()` — Removes the minimap from the DOM

---

## Integration & Automation

### PipelineBuilder

Drag-and-connect integration pipeline creator.

**What it does:** Displays a grid of 12 integration cards (Gmail, Slack,
Calendar, Notion, GitHub, Jira, Sheets, Drive, Twitter/X, Linear, Discord,
Telegram). Users select 2–4 integrations and the module shows a pre-built
automation pipeline describing how AgentBox chains them together. 30+
pipeline combinations are defined.

**Location:** `src/modules/pipeline-builder.js`

**Public API:**
- `PipelineBuilder.init()` — Renders into `#pipelineBuilder`
- `PipelineBuilder.destroy()` — Cleans up

**DOM target:** `#pipelineBuilder`

---

### WorkflowTemplates

Ready-to-use automation recipe gallery.

**What it does:** Showcases pre-built workflow templates organized by category
(productivity, developer, creative, business, research). Each template lists
steps, required integrations, and a one-click "Use This Workflow" action.
Includes category filtering and a search bar.

**Location:** `src/modules/workflow-templates.js`

**Public API:**
- `WorkflowTemplates.init()` — Renders into `#workflowTemplates`
- `WorkflowTemplates.destroy()` — Cleans up

**DOM target:** `#workflowTemplates`

---

### CommunityShowcase

User-submitted agent showcase with likes and category filtering.

**What it does:** Displays community-submitted AgentBox use cases. Users can
filter by category (Productivity, Developer, Creative, Business, Research),
like entries (persisted to localStorage), and submit their own showcases.
Entries show author, date, tags, and like count.

**Location:** `src/modules/community-showcase.js`

**Public API:**
- `CommunityShowcase.init()` — Renders into `#communityShowcase`
- `CommunityShowcase.destroy()` — Cleans up

**Storage key:** `agentbox_showcase_likes`

---

## Support & Utility

### HelpChatWidget

In-page FAQ chat bot with branching conversations.

**What it does:** A floating chat widget (💬 button) that provides a tree-based
Q&A experience. Users click through options (What is AgentBox? → How does it
work? → Pricing → Privacy → Get Started) and receive contextual answers with
further navigation options. Mimics a live-chat support feel without any backend.

**Location:** `src/modules/help-chat-widget.js`

**Public API:**
- `HelpChatWidget.init()` — Creates the floating widget
- `HelpChatWidget.destroy()` — Removes the widget

---

### StorageUtil

Safe `localStorage` wrapper for all stateful modules.

**What it does:** Provides `get`, `set`, `getJSON`, `setJSON`, `remove`, and
`clear` methods that handle private-browsing mode, quota errors, and
non-browser environments gracefully. Every module that persists state
(AccessibilityPanel, CommunityShowcase, SetupChecklist, ReferralProgram, etc.)
uses StorageUtil instead of raw `localStorage`.

**Location:** `src/modules/storage.js`

**Public API:**
- `StorageUtil.get(key, fallback)` — Read a string
- `StorageUtil.set(key, value)` — Write a string
- `StorageUtil.getJSON(key, fallback)` — Read & parse JSON
- `StorageUtil.setJSON(key, value)` — Stringify & write JSON
- `StorageUtil.remove(key)` — Delete a key
- `StorageUtil.clear()` — Wipe all keys
