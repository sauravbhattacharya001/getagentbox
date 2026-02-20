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
[![HTML5](https://img.shields.io/badge/HTML5-E34F26?logo=html5&logoColor=white)](#-tech-stack)
[![CSS3](https://img.shields.io/badge/CSS3-1572B6?logo=css3&logoColor=white)](#-tech-stack)
[![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?logo=javascript&logoColor=black)](#-tech-stack)
[![Docker](https://img.shields.io/badge/Docker-2496ED?logo=docker&logoColor=white)](#-docker)
[![License](https://img.shields.io/github/license/sauravbhattacharya001/getagentbox)](LICENSE)
[![Last Commit](https://img.shields.io/github/last-commit/sauravbhattacharya001/getagentbox)](https://github.com/sauravbhattacharya001/getagentbox/commits/master)
[![Repo Size](https://img.shields.io/github/repo-size/sauravbhattacharya001/getagentbox)](https://github.com/sauravbhattacharya001/getagentbox)
[![Stars](https://img.shields.io/github/stars/sauravbhattacharya001/getagentbox?style=flat)](https://github.com/sauravbhattacharya001/getagentbox/stargazers)

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
│  Single-file static site with:       │
│  • Feature showcase                  │
│  • Interactive chat demos (4 modes)  │
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

> This repository contains the **landing page** only — a single-file static site deployed via GitHub Pages. The bot backend runs separately and communicates through the Telegram Bot API.

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
├── index.html                              # Entire landing page (HTML + CSS + JS inline)
├── Dockerfile                              # Multi-stage nginx container
├── .dockerignore                           # Docker build exclusions
├── README.md
├── .github/
│   ├── copilot-setup-steps.yml             # GitHub Copilot coding agent config
│   ├── copilot-instructions.md             # Repo context for AI agents
│   ├── pull_request_template.md            # PR template
│   ├── ISSUE_TEMPLATE/
│   │   ├── bug_report.yml                  # Bug report form
│   │   ├── feature_request.yml             # Feature request form
│   │   └── config.yml                      # Issue template config
│   └── workflows/
│       ├── ci.yml                          # CI: HTML validate, structure, links, a11y
│       └── pages.yml                       # Auto-deploy to GitHub Pages
```

---

## 🧑‍💻 Development

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

No build step. No `npm install`. Edit `index.html` and refresh your browser.

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

## 🔒 Security

The landing page includes several security measures:

- **Content Security Policy** — Restricts script/style/image sources
- **X-Content-Type-Options** — Prevents MIME-type sniffing
- **Referrer Policy** — Controls referrer information leakage
- **`rel="noopener noreferrer"`** — On all external links
- **Docker** — Non-root user, minimal Alpine image, security headers via nginx

---

## 🎨 Design Decisions

- **Single file** — Zero build complexity, instant deploy, no dependency management
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
