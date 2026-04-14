
// ──────────────────────────────────────────────────────────────
//  Community Showcase  (IIFE)
// ──────────────────────────────────────────────────────────────
var CommunityShowcase = (function () {
  "use strict";

  // Use shared StorageUtil when available, otherwise inline a minimal shim
  var _storage = (typeof StorageUtil !== 'undefined') ? StorageUtil : {
    getJSON: function (key, fallback) {
      try { var r = localStorage.getItem(key); return r ? JSON.parse(r) : fallback; } catch (e) { return fallback; }
    },
    setJSON: function (key, value) {
      try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* quota */ }
    }
  };

  var STORAGE_KEY = "agentbox_showcase_likes";

  var CATEGORIES = ["All", "Productivity", "Developer", "Creative", "Business", "Research"];

  var SHOWCASES = [
    {
      id: "sc-1", title: "Daily Standup Summarizer",
      author: "Maya K.", category: "Productivity",
      description: "Pulls Slack messages, JIRA updates, and GitHub commits from the last 24h and generates a concise standup summary for each team member. Runs every morning at 8:55 AM.",
      tags: ["Slack", "JIRA", "GitHub"], likes: 142, date: "2026-02-28",
      avatar: "MK"
    },
    {
      id: "sc-2", title: "PR Review Copilot",
      author: "Chen W.", category: "Developer",
      description: "Watches for new pull requests, analyzes the diff for security issues, performance regressions, and style violations, then posts a detailed review comment within 2 minutes.",
      tags: ["GitHub", "Code Review", "Security"], likes: 289, date: "2026-03-01",
      avatar: "CW"
    },
    {
      id: "sc-3", title: "Social Media Content Pipeline",
      author: "Jordan R.", category: "Creative",
      description: "Takes a blog post URL, generates 5 tweet variations, an Instagram caption, and a LinkedIn post. Stores drafts in Notion for review before publishing.",
      tags: ["Social Media", "Notion", "Content"], likes: 198, date: "2026-02-20",
      avatar: "JR"
    },
    {
      id: "sc-4", title: "Customer Churn Early Warning",
      author: "Priya S.", category: "Business",
      description: "Monitors usage patterns across the customer base, flags accounts showing disengagement signals, and auto-drafts personalized re-engagement emails for the CS team.",
      tags: ["Analytics", "Email", "CRM"], likes: 176, date: "2026-03-05",
      avatar: "PS"
    },
    {
      id: "sc-5", title: "Research Paper Digest",
      author: "Alex T.", category: "Research",
      description: "Scans arXiv daily for papers matching configured topics, generates 3-paragraph summaries with key findings, and compiles a weekly digest email with citation links.",
      tags: ["arXiv", "Email", "NLP"], likes: 231, date: "2026-02-15",
      avatar: "AT"
    },
    {
      id: "sc-6", title: "Invoice Processing Agent",
      author: "Sam D.", category: "Business",
      description: "Extracts line items from PDF invoices via email attachment, matches against PO records in the ERP, flags discrepancies, and routes for approval based on amount thresholds.",
      tags: ["Email", "PDF", "ERP"], likes: 164, date: "2026-03-03",
      avatar: "SD"
    },
    {
      id: "sc-7", title: "Codebase Documentation Bot",
      author: "Rina P.", category: "Developer",
      description: "Runs nightly over the repo, detects undocumented public functions, generates JSDoc/docstring stubs, and opens a single PR with all additions for review.",
      tags: ["GitHub", "Documentation", "CI/CD"], likes: 215, date: "2026-02-22",
      avatar: "RP"
    },
    {
      id: "sc-8", title: "Meeting Notes & Action Items",
      author: "Tom L.", category: "Productivity",
      description: "Joins Google Meet, transcribes the conversation in real-time, identifies action items with owners, and posts structured notes to the team's Notion workspace within 5 minutes.",
      tags: ["Google Meet", "Notion", "Transcription"], likes: 307, date: "2026-03-07",
      avatar: "TL"
    },
    {
      id: "sc-9", title: "Design Asset Organizer",
      author: "Lena M.", category: "Creative",
      description: "Watches a shared Figma project for new exports, auto-tags and categorizes assets by type and project, optimizes images, and syncs to the CDN with a generated manifest.",
      tags: ["Figma", "CDN", "Image Processing"], likes: 123, date: "2026-02-18",
      avatar: "LM"
    },
    {
      id: "sc-10", title: "Experiment Tracker",
      author: "David H.", category: "Research",
      description: "Logs ML experiment parameters and metrics from training runs, generates comparison tables, alerts on new best results, and maintains a Markdown leaderboard in the repo.",
      tags: ["ML", "GitHub", "Metrics"], likes: 187, date: "2026-03-02",
      avatar: "DH"
    }
  ];

  var _activeCategory = "All";
  var _sortBy = "popular"; // "popular" | "newest"
  var _likes = {};

  function _loadLikes() {
    var parsed = _storage.getJSON(STORAGE_KEY, null);
    _likes = Object.create(null);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      for (var k in parsed) {
        if (Object.prototype.hasOwnProperty.call(parsed, k)) _likes[k] = !!parsed[k];
      }
    }
  }

  function _saveLikes() {
    _storage.setJSON(STORAGE_KEY, _likes);
  }

  function _escapeHtml(str) {
    if (typeof str !== 'string') return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function _isLiked(id) {
    return !!_likes[id];
  }

  function _toggleLike(id) {
    if (_likes[id]) {
      delete _likes[id];
    } else {
      _likes[id] = true;
    }
    _saveLikes();
    _render();
  }

  function _getLikeCount(item) {
    var base = item.likes || 0;
    return _likes[item.id] ? base + 1 : base;
  }

  function _filtered() {
    var items = SHOWCASES.slice();
    if (_activeCategory !== "All") {
      items = items.filter(function (s) { return s.category === _activeCategory; });
    }
    if (_sortBy === "popular") {
      items.sort(function (a, b) { return _getLikeCount(b) - _getLikeCount(a); });
    } else {
      items.sort(function (a, b) { return b.date.localeCompare(a.date); });
    }
    return items;
  }

  function _renderCard(item) {
    var liked = _isLiked(item.id);
    var likeCount = _getLikeCount(item);
    var tagsHtml = item.tags.map(function (t) {
      return '<span class="showcase-tag">' + _escapeHtml(t) + '</span>';
    }).join("");

    return (
      '<article class="showcase-card" data-id="' + _escapeHtml(item.id) + '" data-category="' + _escapeHtml(item.category) + '">' +
        '<div class="showcase-card-header">' +
          '<div class="showcase-avatar" aria-hidden="true">' + _escapeHtml(item.avatar) + '</div>' +
          '<div class="showcase-meta">' +
            '<span class="showcase-author">' + _escapeHtml(item.author) + '</span>' +
            '<span class="showcase-date">' + _formatDate(item.date) + '</span>' +
          '</div>' +
          '<span class="showcase-category-badge showcase-cat-' + _escapeHtml(item.category.toLowerCase()) + '">' + _escapeHtml(item.category) + '</span>' +
        '</div>' +
        '<h3 class="showcase-title">' + _escapeHtml(item.title) + '</h3>' +
        '<p class="showcase-desc">' + _escapeHtml(item.description) + '</p>' +
        '<div class="showcase-tags">' + tagsHtml + '</div>' +
        '<div class="showcase-footer">' +
          '<button class="showcase-like-btn' + (liked ? ' liked' : '') + '" ' +
            'aria-label="' + (liked ? 'Unlike' : 'Like') + ' ' + _escapeHtml(item.title) + '" ' +
            'aria-pressed="' + liked + '" ' +
            'data-id="' + _escapeHtml(item.id) + '">' +
            '<span class="showcase-heart" aria-hidden="true">' + (liked ? '\u2764\uFE0F' : '\u2661') + '</span> ' +
            '<span class="showcase-like-count">' + likeCount + '</span>' +
          '</button>' +
        '</div>' +
      '</article>'
    );
  }

  function _formatDate(dateStr) {
    var parts = dateStr.split("-");
    var months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    return months[parseInt(parts[1], 10) - 1] + " " + parseInt(parts[2], 10) + ", " + parts[0];
  }

  function _render() {
    var grid = document.getElementById("showcaseGrid");
    if (!grid) return;
    var items = _filtered();
    if (items.length === 0) {
      grid.innerHTML = '<div class="showcase-empty">No projects in this category yet. Be the first to share!</div>';
    } else {
      grid.innerHTML = items.map(_renderCard).join("");
    }

    // Update like button listeners
    var btns = grid.querySelectorAll(".showcase-like-btn");
    for (var i = 0; i < btns.length; i++) {
      (function (btn) {
        btn.addEventListener("click", function () {
          _toggleLike(btn.getAttribute("data-id"));
        });
      })(btns[i]);
    }

    // Update filter active states
    var filters = document.querySelectorAll(".showcase-filter");
    for (var j = 0; j < filters.length; j++) {
      var f = filters[j];
      var isActive = f.getAttribute("data-category") === _activeCategory;
      if (isActive) {
        f.classList.add("active");
        f.setAttribute("aria-selected", "true");
      } else {
        f.classList.remove("active");
        f.setAttribute("aria-selected", "false");
      }
    }

    // Update sort button states
    var sortBtns = document.querySelectorAll(".showcase-sort-btn");
    for (var k = 0; k < sortBtns.length; k++) {
      var sb = sortBtns[k];
      var isSortActive = sb.getAttribute("data-sort") === _sortBy;
      if (isSortActive) {
        sb.classList.add("active");
        sb.setAttribute("aria-pressed", "true");
      } else {
        sb.classList.remove("active");
        sb.setAttribute("aria-pressed", "false");
      }
    }

    // Update count
    var countEl = document.getElementById("showcaseCount");
    if (countEl) {
      countEl.textContent = items.length + " project" + (items.length !== 1 ? "s" : "");
    }
  }

  function _showSubmitModal() {
    var existing = document.getElementById("showcaseModal");
    if (existing) { existing.remove(); }

    var overlay = document.createElement("div");
    overlay.className = "showcase-modal-overlay";
    overlay.id = "showcaseModal";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.setAttribute("aria-label", "Submit your project");

    overlay.innerHTML =
      '<div class="showcase-modal">' +
        '<button class="showcase-modal-close" aria-label="Close modal">&times;</button>' +
        '<h3 class="showcase-modal-title">Share Your Project</h3>' +
        '<p class="showcase-modal-subtitle">Show the community what you\'ve built with AgentBox</p>' +
        '<form class="showcase-form" id="showcaseForm">' +
          '<label class="showcase-label">Project Title *' +
            '<input class="showcase-input" type="text" id="scTitle" required maxlength="60" placeholder="e.g. Daily Report Generator">' +
          '</label>' +
          '<label class="showcase-label">Your Name *' +
            '<input class="showcase-input" type="text" id="scAuthor" required maxlength="30" placeholder="e.g. Jane D.">' +
          '</label>' +
          '<label class="showcase-label">Category *' +
            '<select class="showcase-select" id="scCategory" required>' +
              '<option value="">Select category...</option>' +
              '<option value="Productivity">Productivity</option>' +
              '<option value="Developer">Developer</option>' +
              '<option value="Creative">Creative</option>' +
              '<option value="Business">Business</option>' +
              '<option value="Research">Research</option>' +
            '</select>' +
          '</label>' +
          '<label class="showcase-label">Description *' +
            '<textarea class="showcase-textarea" id="scDesc" required maxlength="300" rows="3" placeholder="What does your agent do? How does it help?"></textarea>' +
          '</label>' +
          '<label class="showcase-label">Tags (comma-separated)' +
            '<input class="showcase-input" type="text" id="scTags" maxlength="100" placeholder="e.g. Slack, GitHub, Automation">' +
          '</label>' +
          '<button class="showcase-submit-btn" type="submit">Submit Project</button>' +
        '</form>' +
        '<div class="showcase-toast" id="showcaseToast" role="alert" aria-live="polite"></div>' +
      '</div>';

    document.body.appendChild(overlay);

    // Close handlers
    overlay.querySelector(".showcase-modal-close").addEventListener("click", _closeModal);
    overlay.addEventListener("click", function (e) {
      if (e.target === overlay) _closeModal();
    });

    // Submit handler
    document.getElementById("showcaseForm").addEventListener("submit", function (e) {
      e.preventDefault();
      _handleSubmit();
    });

    // Focus trap
    var firstInput = overlay.querySelector("input");
    if (firstInput) firstInput.focus();
  }

  function _closeModal() {
    var modal = document.getElementById("showcaseModal");
    if (modal) modal.remove();
  }

  // Cap user-submitted showcase items to prevent unbounded localStorage growth.
  var MAX_USER_SUBMISSIONS = 20;

  function _handleSubmit() {
    var title = document.getElementById("scTitle").value.trim();
    var author = document.getElementById("scAuthor").value.trim();
    var category = document.getElementById("scCategory").value;
    var desc = document.getElementById("scDesc").value.trim();
    var tagsRaw = document.getElementById("scTags").value.trim();

    if (!title || !author || !category || !desc) return;

    // Enforce length limits defensively (in case maxlength attrs are bypassed)
    if (title.length > 60) title = title.slice(0, 60);
    if (author.length > 30) author = author.slice(0, 30);
    if (desc.length > 300) desc = desc.slice(0, 300);

    // Prevent localStorage flooding via unlimited submissions
    var userCount = 0;
    for (var k = 0; k < SHOWCASES.length; k++) {
      if (SHOWCASES[k].id && SHOWCASES[k].id.indexOf('sc-user-') === 0) userCount++;
    }
    if (userCount >= MAX_USER_SUBMISSIONS) {
      var toast = document.getElementById("showcaseToast");
      if (toast) {
        toast.textContent = "Submission limit reached. Remove some projects first.";
        toast.classList.add("visible");
        setTimeout(function () { toast.classList.remove("visible"); }, 3000);
      }
      return;
    }

    var tags = tagsRaw ? tagsRaw.split(",").map(function (t) { return t.trim(); }).filter(Boolean).slice(0, 5) : [];
    var initials = author.split(" ").map(function (w) { return w[0] || ""; }).join("").toUpperCase().slice(0, 2);

    var newItem = {
      id: "sc-user-" + Date.now(),
      title: title,
      author: author,
      category: category,
      description: desc,
      tags: tags,
      likes: 0,
      date: new Date().toISOString().slice(0, 10),
      avatar: initials
    };

    SHOWCASES.unshift(newItem);

    var toast = document.getElementById("showcaseToast");
    if (toast) {
      toast.textContent = "Project submitted! Thanks for sharing.";
      toast.classList.add("visible");
      setTimeout(function () { toast.classList.remove("visible"); }, 3000);
    }

    setTimeout(function () {
      _closeModal();
      _activeCategory = "All";
      _sortBy = "newest";
      _render();
    }, 1500);
  }

  function init() {
    var section = document.getElementById("showcaseSection");
    if (!section) return;

    _loadLikes();

    // Bind category filters
    var filters = section.querySelectorAll(".showcase-filter");
    for (var i = 0; i < filters.length; i++) {
      (function (f) {
        f.addEventListener("click", function () {
          _activeCategory = f.getAttribute("data-category");
          _render();
        });
      })(filters[i]);
    }

    // Bind sort buttons
    var sortBtns = section.querySelectorAll(".showcase-sort-btn");
    for (var j = 0; j < sortBtns.length; j++) {
      (function (sb) {
        sb.addEventListener("click", function () {
          _sortBy = sb.getAttribute("data-sort");
          _render();
        });
      })(sortBtns[j]);
    }

    // Submit button
    var submitBtn = document.getElementById("showcaseSubmitBtn");
    if (submitBtn) {
      submitBtn.addEventListener("click", _showSubmitModal);
    }

    _render();
  }

  return {
    init: init,
    filter: function (cat) { _activeCategory = cat; _render(); },
    sort: function (by) { _sortBy = by; _render(); },
    toggleLike: _toggleLike,
    getShowcases: function () { return SHOWCASES.slice(); },
    getLikedIds: function () { return Object.keys(_likes); },
    showSubmitModal: _showSubmitModal,
    closeModal: _closeModal
  };
})();
