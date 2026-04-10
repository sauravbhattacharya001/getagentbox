<div align="center">

# 🤖 AgentBox

**Interactive landing page components for AI-powered products — zero dependencies, fully accessible.**

[![CI](https://github.com/sauravbhattacharya001/getagentbox/actions/workflows/ci.yml/badge.svg)](https://github.com/sauravbhattacharya001/getagentbox/actions/workflows/ci.yml)
[![codecov](https://codecov.io/gh/sauravbhattacharya001/getagentbox/branch/master/graph/badge.svg)](https://codecov.io/gh/sauravbhattacharya001/getagentbox)
[![npm](https://img.shields.io/npm/v/agentbox-landing?logo=npm&logoColor=white)](https://www.npmjs.com/package/agentbox-landing)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?logo=javascript&logoColor=black)](#tech-stack)
[![Docker](https://img.shields.io/badge/Docker-2496ED?logo=docker&logoColor=white)](#docker)

[Live Demo](https://sauravbhattacharya001.github.io/getagentbox/) · [API Docs](https://sauravbhattacharya001.github.io/getagentbox/docs/) · [Try the Bot](https://t.me/AgentBox11Bot)

</div>

---

## Overview

AgentBox Landing is a collection of plug-and-play UI components designed for AI product landing pages. Built with vanilla JavaScript — no frameworks, no dependencies — it delivers FAQ accordions, pricing toggles, animated stats, chat demos, testimonial carousels, and dozens more interactive modules out of the box.

It powers the landing page for **AgentBox**, a Telegram AI assistant that remembers you, searches the web, sets reminders, and understands images.

---

## ✨ Features

- **FAQ Accordion** — Accessible, animated expand/collapse sections
- **Pricing Toggle** — Monthly/yearly billing switcher with smooth transitions
- **Animated Stats** — Counter animations triggered on scroll
- **Chat Demo** — Live chat widget simulation for product demos
- **Testimonials** — Auto-rotating social proof carousel
- **ROI Calculator** — Interactive return-on-investment estimator
- **Command Palette** — Keyboard-driven navigation (⌘K / Ctrl+K)
- **Workflow Builder** — Visual drag-and-drop pipeline creator
- **Playground** — In-browser AI prompt playground
- **Dark/Light Theme** — System-aware theme toggle with persistence
- **WCAG Accessible** — Full keyboard navigation and screen reader support
- **Zero Dependencies** — No React, no Vue, no jQuery — just vanilla JS

---

## 📦 Installation

### npm

```bash
npm install agentbox-landing
```

### CDN

```html
<script src="https://unpkg.com/agentbox-landing@latest/dist/agentbox-landing.min.js"></script>
```

### Clone & Build

```bash
git clone https://github.com/sauravbhattacharya001/getagentbox.git
cd getagentbox
npm install
npm run build
```

---

## 🚀 Usage

### Node.js / CommonJS

```javascript
const { FAQ, Pricing, Stats } = require('agentbox-landing');

// Initialize FAQ accordion
FAQ.init('#faq-container');

// Initialize pricing toggle
Pricing.init('#pricing-section');

// Animate stats on scroll
Stats.init('.stats-counter');
```

### Browser (UMD)

```html
<script src="dist/agentbox-landing.min.js"></script>
<script>
  AgentBoxComponents.FAQ.init('#faq-container');
  AgentBoxComponents.Pricing.init('#pricing-section');
  AgentBoxComponents.Stats.init('.stats-counter');
</script>
```

### ROI Calculator (standalone)

```javascript
const ROI = require('agentbox-landing/roi-calculator');
ROI.init('#roi-widget');
```

---

## 🧪 Testing

```bash
npm test                # Run all tests
npm run test:coverage   # Run with coverage report
```

---

## 🐳 Docker

```bash
docker build -t agentbox-landing .
docker run -p 3000:3000 agentbox-landing
```

---

## 🏗️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Language | Vanilla JavaScript (ES5+ compatible) |
| Styling | CSS3 with custom properties |
| Testing | Jest + jsdom |
| Build | Custom Node.js bundler |
| CI/CD | GitHub Actions |
| Hosting | GitHub Pages |
| Container | Docker |

---

## 📁 Project Structure

```
getagentbox/
├── src/
│   ├── index.js              # Main entry point (FAQ, Pricing, Stats)
│   ├── roi-calculator.js     # Standalone ROI calculator
│   ├── workflow-builder.js   # Visual workflow builder
│   └── modules/              # 40+ feature modules
│       ├── chat-demo.js
│       ├── command-palette.js
│       ├── testimonials.js
│       ├── theme-toggle.js
│       └── ...
├── __tests__/                # Jest test suites
├── dist/                     # Built output
├── docs/                     # API documentation
└── build.js                  # Build script
```

---

## 🤝 Contributing

Contributions are welcome! Here's how to get started:

1. **Fork** the repository
2. **Create** a feature branch: `git checkout -b feature/my-feature`
3. **Commit** your changes: `git commit -m "Add my feature"`
4. **Push** to the branch: `git push origin feature/my-feature`
5. **Open** a Pull Request

Please read [CONTRIBUTING.md](CONTRIBUTING.md) for detailed guidelines.

### Development Setup

```bash
git clone https://github.com/sauravbhattacharya001/getagentbox.git
cd getagentbox
npm install
npm test          # Verify everything works
npm run build     # Build the dist bundle
npm start         # Build and serve locally
```

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).

---

<div align="center">

**Built by [Saurav Bhattacharya](https://github.com/sauravbhattacharya001)**

[⬆ Back to Top](#-agentbox)

</div>
