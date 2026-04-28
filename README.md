<div align="center">

# 🤖 AgentBox

**Your personal AI agent that lives in Telegram**

[![Try on Telegram](https://img.shields.io/badge/💬_Try_Now-Telegram-26A5E4?style=for-the-badge&logo=telegram&logoColor=white)](https://t.me/AgentBox11Bot)
[![Live Site](https://img.shields.io/badge/🌐_Visit-Landing_Page-00C853?style=for-the-badge)](https://sauravbhattacharya001.github.io/getagentbox/)

<br>

[![CI](https://github.com/sauravbhattacharya001/getagentbox/actions/workflows/ci.yml/badge.svg)](https://github.com/sauravbhattacharya001/getagentbox/actions/workflows/ci.yml)
[![codecov](https://codecov.io/gh/sauravbhattacharya001/getagentbox/branch/master/graph/badge.svg)](https://codecov.io/gh/sauravbhattacharya001/getagentbox)
[![Deploy](https://github.com/sauravbhattacharya001/getagentbox/actions/workflows/pages.yml/badge.svg)](https://github.com/sauravbhattacharya001/getagentbox/actions/workflows/pages.yml)
[![Docker](https://github.com/sauravbhattacharya001/getagentbox/actions/workflows/docker.yml/badge.svg)](https://github.com/sauravbhattacharya001/getagentbox/actions/workflows/docker.yml)
[![CodeQL](https://github.com/sauravbhattacharya001/getagentbox/actions/workflows/codeql.yml/badge.svg)](https://github.com/sauravbhattacharya001/getagentbox/actions/workflows/codeql.yml)
[![HTML5](https://img.shields.io/badge/HTML5-E34F26?logo=html5&logoColor=white)](#-tech-stack)
[![CSS3](https://img.shields.io/badge/CSS3-1572B6?logo=css3&logoColor=white)](#-tech-stack)
[![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?logo=javascript&logoColor=black)](#-tech-stack)
[![Docker](https://img.shields.io/badge/Docker-2496ED?logo=docker&logoColor=white)](#-docker)
[![License](https://img.shields.io/github/license/sauravbhattacharya001/getagentbox)](LICENSE)
[![npm](https://img.shields.io/npm/v/agentbox-landing?logo=npm&logoColor=white)](https://www.npmjs.com/package/agentbox-landing)
[![Docs](https://img.shields.io/badge/Docs-API_Reference-blue?logo=readthedocs&logoColor=white)](https://sauravbhattacharya001.github.io/getagentbox/docs/)
[![Last Commit](https://img.shields.io/github/last-commit/sauravbhattacharya001/getagentbox)](https://github.com/sauravbhattacharya001/getagentbox/commits/master)
[![Repo Size](https://img.shields.io/github/repo-size/sauravbhattacharya001/getagentbox)](https://github.com/sauravbhattacharya001/getagentbox)
[![Stars](https://img.shields.io/github/stars/sauravbhattacharya001/getagentbox?style=flat)](https://github.com/sauravbhattacharya001/getagentbox/stargazers)
[![Issues](https://img.shields.io/github/issues/sauravbhattacharya001/getagentbox)](https://github.com/sauravbhattacharya001/getagentbox/issues)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)
[![Maintenance](https://img.shields.io/maintenance/yes/2026)](https://github.com/sauravbhattacharya001/getagentbox/commits/master)

An AI assistant that remembers you, searches the web, sets reminders, understands images, and lives right in Telegram. No signup, no app to install — just open Telegram and start chatting.

</div>

---

## ⚡ Quick Start

```
1. Open Telegram
2. Search for @AgentBox11Bot
3. Tap "Start"
4. Chat — 20 free messages/day, no signup required
```

That's it. No accounts, no apps, no configuration.

---

## ✨ Features

| | Feature | Description |
|---|---|---|
| 🧠 | **Persistent Memory** | Learns your preferences, context, and history across conversations. Never repeat yourself. |
| 🔍 | **Web Search** | Ask about anything — get concise, grounded answers backed by live web data. |
| ⏰ | **Smart Reminders** | Natural language scheduling. "Remind me to call mom in 30 minutes" just works. |
| 📷 | **Vision** | Send photos, screenshots, documents, memes — it sees what you see and answers questions about them. |
| 🎤 | **Voice** | Send a voice note instead of typing. It transcribes and responds naturally. |
| 🔒 | **Private Workspace** | Each user gets an isolated agent. Your conversations and data stay yours. |

---

## 🆚 Comparison

| Feature | AgentBox | ChatGPT | Siri / Google |
|:---|:---:|:---:|:---:|
| Remembers your context | ✅ | ⚠️ | ❌ |
| Lives in Telegram | ✅ | ❌ | ❌ |
| Web search | ✅ | ✅ | ✅ |
| Image understanding | ✅ | ✅ | ⚠️ |
| Voice messages | ✅ | ✅ | ✅ |
| Set reminders | ✅ | ❌ | ✅ |
| No app to install | ✅ | ❌ | ⚠️ |
| Free tier | ✅ | ✅ | ✅ |
| Private workspace | ✅ | ⚠️ | ❌ |

---

## 💬 Interactive Demo

The [live landing page](https://sauravbhattacharya001.github.io/getagentbox/) includes animated Telegram-style chat demos across four scenarios:

- **🧠 Memory** — Recalls past conversations and uses them as context
- **🔍 Search** — Answers real-world questions with live web data
- **⏰ Reminder** — Natural language scheduling that just works
- **📷 Image** — Analyzes screenshots and images to solve problems

---

## 🏗️ Architecture

```
┌──────────────────────────────────────┐
│        Landing Page (this repo)      │
│                                      │
│  Multi-page static site with:        │
│  • 30+ pages (landing, docs, tools)  │
│  • 50+ modular JS components         │
│  • Comparison table                  │
│  • FAQ accordion                     │
│  • CTA → Telegram bot               │
│                                      │
│  Deployed via GitHub Pages           │
└───────────────┬──────────────────────┘
                │ Links to
                ▼
┌──────────────────────────────────────┐
│       Telegram Bot Backend           │
│                                      │
│  ┌──────────┐  ┌─────────────────┐   │
│  │ GPT-4o / │  │ Per-user memory │   │
│  │ Claude   │  │ & workspace    │   │
│  └──────────┘  └─────────────────┘   │
│  ┌──────────┐  ┌─────────────────┐   │
│  │ Web      │  │ Reminder       │   │
│  │ Search   │  │ Scheduler      │   │
│  └──────────┘  └─────────────────┘   │
└──────────────────────────────────────┘
```

> This repository contains the **landing site** — a multi-page static site with 30+ pages and 50+ interactive JS modules, deployed via GitHub Pages. The bot backend runs separately and communicates through the Telegram Bot API.

---

## 🛠️ Tech Stack

| Layer | Technology | Purpose |
|:---|:---|:---|
| **Frontend** | HTML5 + CSS3 + Vanilla JS | Zero-dependency, single-file landing page |
| **Hosting** | GitHub Pages | Free static hosting with automatic HTTPS |
| **Container** | Docker (nginx:alpine) | Production-ready containerized deployment |
| **Bot** | Telegram Bot API | Messaging platform integration |
| **AI** | GPT-4o, Claude | Language understanding + generation + vision |
| **Analytics** | GoatCounter | Privacy-friendly, cookie-free tracking |
| **CI** | GitHub Actions | HTML validation, link checks, accessibility audit |

---

## 📁 Project Structure

```
getagentbox/
├── index.html                              # Main landing page
├── styles.css                              # Global styling (dark theme, responsive)
├── app.js                                  # Interactive component orchestrator
├── cookie-consent.js                       # GDPR-compliant cookie consent
├── keyboard-shortcuts.js                   # Keyboard navigation support
├── build.js                                # Build script
│
├── # ─── Site Pages (30+) ───
├── compare.html                            # Feature comparison matrix
├── faq.html                                # FAQ page
├── api-docs.html                           # API documentation
├── tutorials.html                          # User tutorials
├── blog.html                               # Blog / updates
├── community.html                          # Community hub
├── integrations.html                       # Integration catalog
├── onboarding.html                         # Onboarding wizard
├── roi-calculator.html                     # ROI calculator tool
├── use-case-explorer.html                  # Interactive use case explorer
├── status-page.html                        # Service status dashboard
├── uptime-history.html                     # Historical uptime data
├── security-whitepaper.html                # Security documentation
├── accessibility.html                      # Accessibility statement
├── testimonials.html                       # User testimonials
├── privacy.html / terms.html / sla.html    # Legal pages
├── careers.html / partners.html            # Company pages
├── 404.html                                # Custom error page
├── ... (and more)
│
├── src/                                    # npm package source
│   ├── index.js                            # Package entry (FAQ, Pricing, Stats)
│   ├── roi-calculator.js                   # ROI calculator logic
│   ├── capability-radar.js                 # Capability radar chart
│   ├── workflow-builder.js                 # Visual workflow builder
│   ├── command-reference.js                # Command reference engine
│   └── modules/                            # 50+ modular UI components
│       ├── chat-demo.js                    # Animated chat simulation
│       ├── pricing.js                      # Pricing toggle & tiers
│       ├── faq.js                          # FAQ accordion
│       ├── stats.js                        # Animated statistics
│       ├── playground.js                   # Interactive playground
│       ├── api-explorer.js                 # API explorer widget
│       ├── command-palette.js              # Cmd+K command palette
│       ├── pipeline-builder.js             # Visual pipeline builder
│       ├── onboarding-quiz.js              # Onboarding questionnaire
│       ├── personality-configurator.js     # Agent personality config
│       ├── prompt-gallery.js               # Prompt template gallery
│       ├── theme-toggle.js                 # Light/dark theme toggle
│       ├── site-nav.js                     # Navigation system
│       └── ... (40+ more modules)
│
├── docs/                                   # Developer documentation
│   ├── index.html                          # API reference
│   ├── getting-started.html                # Setup guide
│   ├── architecture.html                   # Architecture overview
│   ├── changelog.html                      # Visual changelog
│   ├── customization.md                    # Customization guide
│   └── modules.md                          # Module documentation
│   └── TESTING.md                          # Testing guide & conventions
│
├── vendor/                                 # Vendored dependencies
├── __tests__/                              # Jest test suites
├── Dockerfile                              # Multi-stage nginx container
├── .dockerignore                           # Docker build exclusions
├── codecov.yml                             # Code coverage config
├── CONTRIBUTING.md                         # Contribution guidelines
├── CHANGELOG.md                            # Release changelog
├── LICENSE                                 # MIT License
│
└── .github/
    ├── copilot-setup-steps.yml             # GitHub Copilot coding agent config
    ├── copilot-instructions.md             # Repo context for AI agents
    ├── pull_request_template.md            # PR template
    ├── ISSUE_TEMPLATE/                     # Issue form templates
    └── workflows/
        ├── ci.yml                          # CI: validate, lint, a11y audit
        ├── pages.yml                       # Auto-deploy to GitHub Pages
        ├── publish.yml                     # npm publish on release
        └── docker.yml                      # Docker build/push
```

---

## 🧑‍💻 Development

### npm Package

The interactive components are also available as a reusable npm package:

```bash
npm install agentbox-landing
```

```js
const { FAQ, Pricing, Stats } = require('agentbox-landing');

// Initialize FAQ accordion
FAQ.init('.faq-section');

// Initialize pricing toggle
Pricing.init('.billing-toggle');

// Animate stats on scroll
Stats.init('.stats-section', { duration: 2000 });
```

See the [API docs](https://sauravbhattacharya001.github.io/getagentbox/docs/) for full reference.

### Local Preview

```bash
# Clone the repository
git clone https://github.com/sauravbhattacharya001/getagentbox.git
cd getagentbox

# Serve locally (pick one)
python -m http.server 8000
# or
npx serve .
# or
php -S localhost:8000

# Open http://localhost:8000
```

No build step required for page edits. Modify HTML/CSS/JS and refresh your browser.

### 🐳 Docker

```bash
# Build the container
docker build -t agentbox-landing .

# Run it
docker run -p 8080:8080 agentbox-landing

# Open http://localhost:8080
```

The Dockerfile uses a multi-stage build:
1. **Stage 1** — Validates HTML with `html-validate` (build fails if invalid)
2. **Stage 2** — Serves via `nginx:alpine` with security headers, gzip, and a `/healthz` endpoint

Runs as a non-root user for production security.

---

## 🧪 Testing

The project has a comprehensive test suite with 66 test files covering all interactive modules.

```bash
# Run all tests
npm test

# Run with coverage report
npm run test:coverage

# Run a specific test
npx jest __tests__/storage.test.js
```

Coverage thresholds (enforced in CI): 70% lines, 70% statements, 60% branches, 60% functions.

See the full [Testing Guide](docs/TESTING.md) for architecture details, conventions, and troubleshooting.

---

## 🔒 Security

The landing page includes several security measures:

- **Content Security Policy** — Restricts script/style/image sources
- **X-Content-Type-Options** — Prevents MIME-type sniffing
- **Referrer Policy** — Controls referrer information leakage
- **`rel="noopener noreferrer"`** — On all external links
- **Docker** — Non-root user, minimal Alpine image, security headers via nginx

---

## 🎨 Design Decisions

- **Minimal build** — Zero heavy toolchain, instant deploy, no bundler required
- **Dark theme** — Gradient accents matching the Telegram aesthetic
- **Responsive** — Works down to 320px width
- **No external deps** — Loads fast everywhere, no CDN dependency
- **Interactive demos** — Animated chat simulations to show real usage patterns
- **Privacy-first analytics** — GoatCounter (cookie-free, GDPR-compliant)

---

## CI Pipeline

The CI workflow runs on every push and PR:

| Job | What it checks |
|:---|:---|
| **HTML Validation** | Validates `index.html` against html-validate rules |
| **Structure Check** | DOCTYPE, lang, charset, viewport, title, meta description, OG tags |
| **Link Validation** | All external links in `index.html` and `README.md` (via lychee) |
| **Accessibility** | WCAG 2.0 AA audit via pa11y |

---

## 🤝 Contributing

Contributions are welcome! This is a simple static site, so getting started is straightforward:

1. **Fork** the repository
2. **Create** a feature branch: `git checkout -b feature/your-idea`
3. **Edit** `index.html` — that's the entire codebase
4. **Test** locally with any static file server
5. **Open** a Pull Request

### Ideas for contributions

- ♿ Accessibility improvements (ARIA labels, keyboard navigation, focus styles)
- 🌍 Internationalization / localization
- 🎭 Additional demo scenarios
- ⚡ Performance optimizations
- 🔍 SEO improvements (structured data, Twitter cards)
- 📱 PWA support (service worker, manifest)

---

## 📄 License

© [Saurav Bhattacharya](https://github.com/sauravbhattacharya001). All rights reserved.

---

<div align="center">

**[🌐 Live Site](https://sauravbhattacharya001.github.io/getagentbox/)** · **[💬 Try on Telegram](https://t.me/AgentBox11Bot)** · **[🐛 Report Bug](https://github.com/sauravbhattacharya001/getagentbox/issues/new?template=bug_report.yml)** · **[💡 Request Feature](https://github.com/sauravbhattacharya001/getagentbox/issues/new?template=feature_request.yml)**

Built by [Saurav Bhattacharya](https://github.com/sauravbhattacharya001)

</div>
