<div align="center">

# 🤖 AgentBox

**Your personal AI agent that lives in Telegram**

[![Live Site](https://img.shields.io/badge/🌐_Live_Site-Visit-00C853?style=for-the-badge)](https://sauravbhattacharya001.github.io/getagentbox/)
[![Try on Telegram](https://img.shields.io/badge/💬_Telegram-Try_Now-26A5E4?style=for-the-badge&logo=telegram&logoColor=white)](https://t.me/AgentBox11Bot)

<br>

[![HTML5](https://img.shields.io/badge/HTML5-E34F26?logo=html5&logoColor=white)](https://developer.mozilla.org/en-US/docs/Web/HTML)
[![CSS3](https://img.shields.io/badge/CSS3-1572B6?logo=css3&logoColor=white)](https://developer.mozilla.org/en-US/docs/Web/CSS)
[![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?logo=javascript&logoColor=black)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![GitHub Pages](https://img.shields.io/badge/Deployed-GitHub_Pages-222?logo=github&logoColor=white)](https://sauravbhattacharya001.github.io/getagentbox/)
[![License](https://img.shields.io/github/license/sauravbhattacharya001/getagentbox)](LICENSE)
[![GitHub last commit](https://img.shields.io/github/last-commit/sauravbhattacharya001/getagentbox)](https://github.com/sauravbhattacharya001/getagentbox/commits/main)
[![GitHub repo size](https://img.shields.io/github/repo-size/sauravbhattacharya001/getagentbox)](https://github.com/sauravbhattacharya001/getagentbox)

An AI assistant that remembers you, searches the web, sets reminders, understands images, and lives right in Telegram. No signup, no app to install — just open Telegram and start chatting.

</div>

---

## 🚀 Quick Start

```
1. Open Telegram
2. Search for @AgentBox11Bot
3. Tap Start
4. Start chatting — 20 free messages/day, no signup
```

That's it. No accounts, no apps, no setup.

---

## ✨ What It Can Do

| Capability | Description |
|---|---|
| 🧠 **Persistent Memory** | Learns your preferences, context, and history across conversations. No more repeating yourself. |
| 🔍 **Web Search** | Ask about anything in the real world — get concise, grounded answers with live data. |
| ⏰ **Reminders** | "Remind me in 30 minutes to call mom." It just works. Natural language scheduling. |
| 📷 **Image Understanding** | Send photos, screenshots, documents, memes — it sees what you see and can answer questions about them. |
| 🎤 **Voice Messages** | Send a voice note instead of typing. It transcribes and responds. |
| 🔒 **Private Workspace** | Each user gets an isolated agent. Your conversations and data stay yours. |

---

## 🆚 How It Compares

| Feature | AgentBox | ChatGPT | Siri / Google |
|---|:---:|:---:|:---:|
| Remembers your context | ✅ | ⚠️ Limited | ❌ |
| Lives in Telegram | ✅ | ❌ | ❌ |
| Web search | ✅ | ✅ | ✅ |
| Image understanding | ✅ | ✅ | ⚠️ Limited |
| Voice messages | ✅ | ✅ | ✅ |
| Set reminders | ✅ | ❌ | ✅ |
| No app to install | ✅ | ❌ | ⚠️ Built-in only |
| Free tier | ✅ | ✅ | ✅ |
| Private workspace | ✅ | ⚠️ Limited | ❌ |

---

## 💬 Demo Conversations

The [live landing page](https://sauravbhattacharya001.github.io/getagentbox/) includes interactive chat demos showing AgentBox in action across four scenarios:

- **🧠 Memory** — Recalls past conversations and sets reminders from context
- **🔍 Search** — Answers real-world questions with live web data
- **⏰ Reminder** — Natural language scheduling that just works
- **📷 Image** — Analyzes screenshots and images to solve problems

---

## 🏗️ Architecture

```
┌──────────────────────────────────────┐
│        Landing Page (this repo)      │
│  ┌───────────┐  ┌────────────────┐   │
│  │ index.html│  │ Interactive    │   │
│  │ Features  │  │ Chat Demo     │   │
│  │ FAQ       │  │ Comparison    │   │
│  └───────────┘  └────────────────┘   │
│         Hosted on GitHub Pages       │
└──────────────────────────────────────┘
                  │
                  ▼
┌──────────────────────────────────────┐
│         Telegram Bot Backend         │
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

This repository contains the **landing page** — a single-file static site deployed via GitHub Pages. The bot backend runs separately and communicates through the Telegram Bot API.

---

## 🛠️ Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| **Frontend** | HTML5 + CSS3 + Vanilla JS | Zero-dependency landing page |
| **Hosting** | GitHub Pages | Free static hosting with HTTPS |
| **Bot** | Telegram Bot API | Messaging platform |
| **AI** | GPT-4o, Claude | Language understanding + generation |
| **Analytics** | GoatCounter | Privacy-friendly, no-cookie tracking |

---

## 📁 Project Structure

```
getagentbox/
├── index.html                          # Landing page (features, demo, FAQ, CTA)
├── README.md                           # You are here
├── .github/
│   ├── copilot-setup-steps.yml         # Copilot coding agent setup
│   └── copilot-instructions.md         # Repo context for AI agents
└── (single-file — intentionally minimal)
```

---

## 🧑‍💻 Development

```bash
# Clone
git clone https://github.com/sauravbhattacharya001/getagentbox.git
cd getagentbox

# Preview locally (any static file server works)
python -m http.server 8000
# or
npx serve .

# Open http://localhost:8000
```

No build step. No dependencies. Edit `index.html` and refresh.

---

## 🎨 Landing Page Features

The landing page is a single HTML file with everything inline (CSS + JS). Sections include:

- **Hero** — Gradient header with CTA buttons
- **Feature cards** — Six capability highlights with icons
- **Interactive chat demo** — Animated Telegram-style chat showing 4 scenarios
- **Comparison table** — Side-by-side vs ChatGPT and Siri/Google
- **FAQ accordion** — 7 common questions with smooth expand/collapse
- **CTA** — Direct link to the Telegram bot with free tier badge

**Design decisions:**
- Single file for zero build complexity and instant deploy
- Dark theme with gradient accents matching the Telegram aesthetic
- Responsive down to 320px width
- No external dependencies — loads fast everywhere

---

## 🤝 Contributing

Contributions welcome! This is a simple static site, so getting started is easy:

1. **Fork** the repository
2. **Create** a feature branch: `git checkout -b feature/your-idea`
3. **Edit** `index.html` (that's the whole codebase)
4. **Test** locally with any static server
5. **Open** a Pull Request

### Ideas for contributions

- Accessibility improvements (ARIA labels, keyboard navigation)
- Additional demo scenarios
- Performance optimizations
- i18n / localization
- SEO improvements

---

## 📄 License

© [Saurav Bhattacharya](https://github.com/sauravbhattacharya001). All rights reserved.

---

<div align="center">

**[🌐 Live Site](https://sauravbhattacharya001.github.io/getagentbox/)** · **[💬 Try on Telegram](https://t.me/AgentBox11Bot)** · **[🐛 Report Bug](https://github.com/sauravbhattacharya001/getagentbox/issues)**

Built by [Saurav Bhattacharya](https://github.com/sauravbhattacharya001)

</div>
