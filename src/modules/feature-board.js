
// ═══════════════════════════════════════════════════════════════════════
//  Feature Request Board – vote on features, suggest new ones
// ═══════════════════════════════════════════════════════════════════════

var FeatureBoard = (function () {
  "use strict";

  const STORAGE_KEY = "agentbox_feature_votes";
  const CUSTOM_KEY  = "agentbox_feature_custom";

  // ── Seed features ──────────────────────────────────────────────
  const SEED_FEATURES = [
    {
      id: "calendar-sync",
      title: "Google Calendar integration",
      description: "Automatically sync events and get proactive reminders before meetings.",
      category: "integration",
      status: "planned",
      votes: 127,
      createdAt: "2026-02-15"
    },
    {
      id: "voice-messages",
      title: "Voice message support",
      description: "Send and receive voice messages — AgentBox transcribes and responds.",
      category: "feature",
      status: "building",
      votes: 98,
      createdAt: "2026-02-20"
    },
    {
      id: "dark-mode",
      title: "Dark mode for web dashboard",
      description: "A proper dark theme for late-night productivity sessions.",
      category: "ux",
      status: "planned",
      votes: 86,
      createdAt: "2026-01-28"
    },
    {
      id: "whatsapp-support",
      title: "WhatsApp channel",
      description: "Use AgentBox directly in WhatsApp, not just Telegram.",
      category: "platform",
      status: "new",
      votes: 154,
      createdAt: "2026-03-01"
    },
    {
      id: "file-upload",
      title: "Upload & analyze documents",
      description: "Send PDFs, spreadsheets, or images for AgentBox to analyze and summarize.",
      category: "feature",
      status: "building",
      votes: 112,
      createdAt: "2026-02-10"
    },
    {
      id: "slack-integration",
      title: "Slack workspace integration",
      description: "Add AgentBox as a Slack bot for team-wide access.",
      category: "integration",
      status: "new",
      votes: 73,
      createdAt: "2026-03-05"
    },
    {
      id: "memory-export",
      title: "Export conversation history",
      description: "Download your full conversation history as JSON or PDF.",
      category: "feature",
      status: "shipped",
      votes: 64,
      createdAt: "2026-01-20"
    },
    {
      id: "widgets",
      title: "Home screen widgets",
      description: "Quick-access widgets for iOS and Android to send messages without opening Telegram.",
      category: "platform",
      status: "new",
      votes: 91,
      createdAt: "2026-03-03"
    },
    {
      id: "custom-personas",
      title: "Custom agent personas",
      description: "Create named personas with different tones and specializations.",
      category: "feature",
      status: "planned",
      votes: 79,
      createdAt: "2026-02-25"
    },
    {
      id: "task-automation",
      title: "Scheduled recurring tasks",
      description: "Set up daily/weekly automated tasks — reports, summaries, check-ins.",
      category: "feature",
      status: "shipped",
      votes: 143,
      createdAt: "2026-01-15"
    },
    {
      id: "multi-language",
      title: "Multi-language UI",
      description: "Support for Spanish, French, German, Japanese, and more.",
      category: "ux",
      status: "new",
      votes: 56,
      createdAt: "2026-03-06"
    },
    {
      id: "api-access",
      title: "Public REST API",
      description: "Programmatic access to AgentBox for developers building integrations.",
      category: "integration",
      status: "planned",
      votes: 68,
      createdAt: "2026-02-18"
    }
  ];

  let allFeatures = [];
  let userVotes = Object.create(null);
  let activeFilter = "all";

  // ── Persistence ────────────────────────────────────────────────
  function loadVotes() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return Object.create(null);
      const parsed = JSON.parse(raw);
      const safe = Object.create(null);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        for (var k in parsed) {
          if (Object.prototype.hasOwnProperty.call(parsed, k)) safe[k] = !!parsed[k];
        }
      }
      return safe;
    } catch (e) { return Object.create(null); }
  }
  function saveVotes() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(userVotes)); } catch (e) { /* noop */ }
  }
  function loadCustom() {
    try {
      const raw = localStorage.getItem(CUSTOM_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      var safe = [];
      for (var i = 0; i < parsed.length; i++) {
        var item = parsed[i];
        if (item && typeof item === 'object' && !Array.isArray(item) &&
            typeof item.id === 'string' && typeof item.title === 'string') {
          safe.push(item);
        }
      }
      return safe;
    } catch (e) { return []; }
  }
  function saveCustom(customs) {
    try { localStorage.setItem(CUSTOM_KEY, JSON.stringify(customs)); } catch (e) { /* noop */ }
  }

  // ── Status helpers ─────────────────────────────────────────────
  const STATUS_BADGES = {
    planned:  { label: "Planned",  cls: "fb-badge-planned"  },
    building: { label: "Building", cls: "fb-badge-building" },
    shipped:  { label: "Shipped",  cls: "fb-badge-shipped"  },
    "new":    { label: "New",      cls: "fb-badge-new"      }
  };

  const CATEGORY_ICONS = {
    integration: "🔗",
    feature:     "⚡",
    ux:          "🎨",
    platform:    "📱"
  };

  // ── Rendering ──────────────────────────────────────────────────
  function buildCard(feat) {
    const card = document.createElement("div");
    card.className = "fb-card";
    card.setAttribute("role", "listitem");
    card.setAttribute("data-id", feat.id);

    const voteCount = feat.votes + (userVotes[feat.id] ? 1 : 0);
    const votedClass = userVotes[feat.id] ? " voted" : "";

    const badge = STATUS_BADGES[feat.status] || STATUS_BADGES["new"];
    const catIcon = CATEGORY_ICONS[feat.category] || "⚡";

    card.innerHTML =
      '<button class="fb-vote-btn' + votedClass + '" aria-label="Vote for ' + escapeHtml(feat.title) + '" data-id="' + feat.id + '">' +
        '<span class="fb-vote-arrow">▲</span>' +
        '<span class="fb-vote-count">' + voteCount + '</span>' +
      '</button>' +
      '<div class="fb-card-body">' +
        '<div class="fb-card-header">' +
          '<span class="fb-card-title">' + escapeHtml(feat.title) + '</span>' +
          '<span class="fb-card-badge ' + badge.cls + '">' + badge.label + '</span>' +
        '</div>' +
        (feat.description ? '<div class="fb-card-desc">' + escapeHtml(feat.description) + '</div>' : '') +
        '<div class="fb-card-meta">' +
          '<span class="fb-category-tag">' + catIcon + ' ' + escapeHtml(feat.category) + '</span>' +
          '<span>' + formatDate(feat.createdAt) + '</span>' +
        '</div>' +
      '</div>';

    const voteBtn = card.querySelector(".fb-vote-btn");
    voteBtn.addEventListener("click", function () { toggleVote(feat.id); });
    return card;
  }

  function render() {
    const list = document.getElementById("featureBoardList");
    if (!list) return;
    list.innerHTML = "";

    let filtered = getFiltered();
    // Sort: most votes first
    filtered.sort(function (a, b) {
      const va = a.votes + (userVotes[a.id] ? 1 : 0);
      const vb = b.votes + (userVotes[b.id] ? 1 : 0);
      return vb - va;
    });

    for (var i = 0; i < filtered.length; i++) {
      list.appendChild(buildCard(filtered[i]));
    }
  }

  function getFiltered() {
    if (activeFilter === "all") return allFeatures.slice();
    if (activeFilter === "popular") {
      return allFeatures.slice().sort(function (a, b) {
        var va = a.votes + (userVotes[a.id] ? 1 : 0);
        var vb = b.votes + (userVotes[b.id] ? 1 : 0);
        return vb - va;
      }).slice(0, 6);
    }
    if (activeFilter === "new") {
      return allFeatures.filter(function (f) { return f.status === "new"; });
    }
    if (activeFilter === "planned") {
      return allFeatures.filter(function (f) { return f.status === "planned" || f.status === "building"; });
    }
    return allFeatures.slice();
  }

  // ── Voting ─────────────────────────────────────────────────────
  function toggleVote(id) {
    if (userVotes[id]) {
      delete userVotes[id];
    } else {
      userVotes[id] = true;
    }
    saveVotes();
    render();
  }

  // ── Suggest form ───────────────────────────────────────────────
  function openSuggestForm() {
    const form = document.getElementById("fbSuggestForm");
    if (form) form.hidden = false;
  }
  function closeSuggestForm() {
    const form = document.getElementById("fbSuggestForm");
    if (form) form.hidden = true;
  }
  function submitSuggestion() {
    const titleEl = document.getElementById("fbFormTitle");
    const descEl  = document.getElementById("fbFormDesc");
    const catEl   = document.getElementById("fbFormCategory");
    if (!titleEl) return;

    const title = titleEl.value.trim();
    if (!title) {
      titleEl.focus();
      return;
    }

    const newFeat = {
      id: "custom-" + Date.now(),
      title: title,
      description: descEl ? descEl.value.trim() : "",
      category: catEl ? catEl.value : "feature",
      status: "new",
      votes: 1,
      createdAt: new Date().toISOString().slice(0, 10)
    };

    allFeatures.unshift(newFeat);
    userVotes[newFeat.id] = true;
    saveVotes();

    // Persist custom features
    const customs = loadCustom();
    customs.push(newFeat);
    saveCustom(customs);

    // Reset form
    titleEl.value = "";
    if (descEl) descEl.value = "";
    closeSuggestForm();
    activeFilter = "all";
    updateFilterButtons();
    render();
    showToast("Thanks! Your idea has been added 🎉");
  }

  // ── Filters ────────────────────────────────────────────────────
  function updateFilterButtons() {
    const buttons = document.querySelectorAll(".fb-filter");
    for (var i = 0; i < buttons.length; i++) {
      const b = buttons[i];
      let isActive = b.getAttribute("data-filter") === activeFilter;
      b.classList.toggle("active", isActive);
      b.setAttribute("aria-pressed", isActive ? "true" : "false");
    }
  }

  // ── Toast ──────────────────────────────────────────────────────
  function showToast(msg) {
    let toast = document.getElementById("fbToast");
    if (!toast) return;
    toast.textContent = msg;
    toast.hidden = false;
    clearTimeout(toast._timer);
    toast._timer = setTimeout(function () { toast.hidden = true; }, 3000);
  }

  // ── Helpers ────────────────────────────────────────────────────
  // Use shared _escapeHtml from _shared-utils.js
  var escapeHtml = typeof _escapeHtml === 'function' ? _escapeHtml : function(str) {
    var d = document.createElement('div'); d.textContent = str; return d.innerHTML;
  };

  function formatDate(dateStr) {
    try {
      const d = new Date(dateStr + "T00:00:00");
      return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    } catch (e) { return dateStr; }
  }

  // ── Init ───────────────────────────────────────────────────────
  function init() {
    userVotes = loadVotes();

    // Merge seed + custom features
    allFeatures = SEED_FEATURES.slice();
    const customs = loadCustom();
    for (var i = 0; i < customs.length; i++) {
      // Avoid duplicates
      let exists = false;
      for (var j = 0; j < allFeatures.length; j++) {
        if (allFeatures[j].id === customs[i].id) { exists = true; break; }
      }
      if (!exists) allFeatures.push(customs[i]);
    }

    // Filter buttons
    let filterBtns = document.querySelectorAll(".fb-filter");
    for (var fi = 0; fi < filterBtns.length; fi++) {
      filterBtns[fi].addEventListener("click", function () {
        activeFilter = this.getAttribute("data-filter");
        updateFilterButtons();
        render();
      });
    }

    // Suggest button
    const suggestBtn = document.getElementById("fbSuggestBtn");
    if (suggestBtn) suggestBtn.addEventListener("click", openSuggestForm);

    // Form controls
    let closeBtn  = document.getElementById("fbFormClose");
    const backdrop  = document.getElementById("fbFormBackdrop");
    const submitBtn = document.getElementById("fbFormSubmit");
    if (closeBtn) closeBtn.addEventListener("click", closeSuggestForm);
    if (backdrop) backdrop.addEventListener("click", closeSuggestForm);
    if (submitBtn) submitBtn.addEventListener("click", submitSuggestion);

    // Enter key submits
    const titleInput = document.getElementById("fbFormTitle");
    if (titleInput) {
      titleInput.addEventListener("keydown", function (e) {
        if (e.key === "Enter") { e.preventDefault(); submitSuggestion(); }
      });
    }

    render();
  }

  // ── Public API ─────────────────────────────────────────────────
  return {
    init: init,
    getFeatures: function () { return allFeatures.slice(); },
    getVotes: function () { return Object.assign({}, userVotes); },
    getFilter: function () { return activeFilter; }
  };
})();
