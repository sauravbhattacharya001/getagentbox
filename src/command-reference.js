// ---------------------------------------------------------------------------
// Command Reference - Interactive searchable command cheat sheet
// ---------------------------------------------------------------------------
// Categorized commands with examples, descriptions, and copy-to-clipboard.
// Users can search, filter by category, and expand for usage examples.

var CommandReference = (function () {
  'use strict';

  var CATEGORIES = [
    { id: 'memory', label: 'Memory', icon: '🧠', color: '#9b59b6' },
    { id: 'search', label: 'Search & Web', icon: '🔍', color: '#3498db' },
    { id: 'productivity', label: 'Productivity', icon: '⚡', color: '#f39c12' },
    { id: 'media', label: 'Images & Media', icon: '📸', color: '#e74c3c' },
    { id: 'settings', label: 'Settings', icon: '⚙️', color: '#2ecc71' },
    { id: 'advanced', label: 'Advanced', icon: '🔧', color: '#1abc9c' }
  ];

  var COMMANDS = [
    {
      command: 'remember',
      syntax: 'Remember that [fact]',
      category: 'memory',
      description: 'Store a fact, preference, or piece of context for future conversations.',
      examples: [
        'Remember that I prefer dark roast coffee',
        'Remember my meeting is every Tuesday at 3pm',
        'Remember that my dog\'s name is Max'
      ],
      tips: 'Your agent keeps these permanently. Use "What do you remember about me?" to review.'
    },
    {
      command: 'forget',
      syntax: 'Forget [fact]',
      category: 'memory',
      description: 'Remove a previously stored memory or preference.',
      examples: [
        'Forget my old address',
        'Forget that I like tea — I switched to coffee'
      ],
      tips: 'Specific requests work better than vague ones.'
    },
    {
      command: 'recall',
      syntax: 'What do you remember / know about [topic]?',
      category: 'memory',
      description: 'Ask your agent to recall stored context about a topic.',
      examples: [
        'What do you remember about my work projects?',
        'What do you know about my preferences?'
      ],
      tips: 'Great for checking what context your agent has before a conversation.'
    },
    {
      command: 'search',
      syntax: 'Search for [query]',
      category: 'search',
      description: 'Search the web and get a summarized answer with sources.',
      examples: [
        'Search for the latest SpaceX launch',
        'What\'s the weather in Tokyo right now?',
        'Find the best restaurants near Pike Place Market'
      ],
      tips: 'You don\'t need to say "search" — just ask naturally and it\'ll search when needed.'
    },
    {
      command: 'summarize-url',
      syntax: 'Summarize [URL]',
      category: 'search',
      description: 'Fetch a webpage and provide a concise summary.',
      examples: [
        'Summarize https://example.com/article',
        'TL;DR this link: https://blog.example.com/post'
      ],
      tips: 'Works with articles, blog posts, documentation pages, and more.'
    },
    {
      command: 'remind',
      syntax: 'Remind me [when] to [task]',
      category: 'productivity',
      description: 'Set a reminder that will ping you at the specified time.',
      examples: [
        'Remind me in 30 minutes to check the oven',
        'Remind me tomorrow at 9am to call the dentist',
        'Remind me every Monday to submit the report'
      ],
      tips: 'Supports relative times, specific dates, and recurring schedules.'
    },
    {
      command: 'draft',
      syntax: 'Draft [type] about [topic]',
      category: 'productivity',
      description: 'Generate a draft email, message, post, or document.',
      examples: [
        'Draft an email to my boss about taking Friday off',
        'Draft a LinkedIn post about our product launch',
        'Draft a thank-you message for the interview'
      ],
      tips: 'Specify tone (formal, casual, friendly) for better results.'
    },
    {
      command: 'list',
      syntax: 'Add [item] to my [list name]',
      category: 'productivity',
      description: 'Manage lists — grocery, todo, reading, or any custom list.',
      examples: [
        'Add milk and eggs to my grocery list',
        'Show my todo list',
        'Remove "buy flowers" from my shopping list'
      ],
      tips: 'Create any named list. Say "show my lists" to see all of them.'
    },
    {
      command: 'analyze-image',
      syntax: '[Send an image] What is this?',
      category: 'media',
      description: 'Send a photo and ask questions about it — identify objects, read text, describe scenes.',
      examples: [
        'What plant is this? [+ photo]',
        'Read the text in this screenshot [+ photo]',
        'How many calories in this meal? [+ photo]'
      ],
      tips: 'Just send the photo with your question in the same message or the next one.'
    },
    {
      command: 'generate-image',
      syntax: 'Generate an image of [description]',
      category: 'media',
      description: 'Create AI-generated images from text descriptions.',
      examples: [
        'Generate an image of a sunset over mountains',
        'Create a logo for a coffee shop called "Bean There"',
        'Draw a cartoon cat wearing a top hat'
      ],
      tips: 'Be specific with style, colors, and composition for better results.'
    },
    {
      command: 'translate',
      syntax: 'Translate [text] to [language]',
      category: 'advanced',
      description: 'Translate text between languages with context awareness.',
      examples: [
        'Translate "Where is the train station?" to Japanese',
        'How do you say "thank you" in Korean?',
        'Translate this menu [+ photo] to English'
      ],
      tips: 'Combines with image analysis — send a photo of foreign text to translate it.'
    },
    {
      command: 'code',
      syntax: 'Write code to [task] / Explain this code',
      category: 'advanced',
      description: 'Generate, explain, debug, or review code in any language.',
      examples: [
        'Write a Python script to rename files in a folder',
        'Explain this SQL query',
        'Find the bug in this function'
      ],
      tips: 'Specify the programming language for more accurate results.'
    },
    {
      command: 'persona',
      syntax: 'Set your personality to [style]',
      category: 'settings',
      description: 'Adjust how your agent communicates — formal, casual, concise, verbose, etc.',
      examples: [
        'Be more concise in your replies',
        'Use a professional tone',
        'Talk to me like a friend'
      ],
      tips: 'Your agent remembers personality preferences across sessions.'
    },
    {
      command: 'reset',
      syntax: 'Reset / Start fresh',
      category: 'settings',
      description: 'Clear conversation context and start a new session.',
      examples: [
        'Start fresh',
        'New conversation',
        'Clear context'
      ],
      tips: 'This clears the current conversation but keeps your stored memories.'
    },
    {
      command: 'export',
      syntax: 'Export my [data]',
      category: 'settings',
      description: 'Export your conversation history, memories, or lists.',
      examples: [
        'Export our conversation',
        'Export my memories',
        'Download my todo list'
      ],
      tips: 'Data is yours — export anytime.'
    }
  ];

  // ---- State ----
  var state = {
    searchQuery: '',
    activeCategory: 'all',
    expandedCommand: null
  };

  // ---- Helpers ----

  // Use shared DOMUtil.escapeHtml when available (bundle), inline fallback for standalone/test
  var escapeHTML = (typeof DOMUtil !== 'undefined' && DOMUtil.escapeHtml) ? DOMUtil.escapeHtml : function (str) {
    var div = document.createElement('div');
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
  };

  function getCategoryById(id) {
    for (var i = 0; i < CATEGORIES.length; i++) {
      if (CATEGORIES[i].id === id) return CATEGORIES[i];
    }
    return null;
  }

  function filterCommands() {
    var q = state.searchQuery.toLowerCase();
    return COMMANDS.filter(function (cmd) {
      var matchesCategory = state.activeCategory === 'all' || cmd.category === state.activeCategory;
      if (!matchesCategory) return false;
      if (!q) return true;
      return (
        cmd.command.toLowerCase().indexOf(q) !== -1 ||
        cmd.syntax.toLowerCase().indexOf(q) !== -1 ||
        cmd.description.toLowerCase().indexOf(q) !== -1 ||
        cmd.examples.some(function (ex) { return ex.toLowerCase().indexOf(q) !== -1; })
      );
    });
  }

  // ---- Rendering ----

  function renderCategoryFilters() {
    var html = '<button class="cmdref-cat-btn cmdref-cat-active" data-cat="all">All</button>';
    CATEGORIES.forEach(function (cat) {
      html += '<button class="cmdref-cat-btn" data-cat="' + cat.id + '">' +
        cat.icon + ' ' + escapeHTML(cat.label) + '</button>';
    });
    return html;
  }

  function renderCommandCard(cmd, isExpanded) {
    var cat = getCategoryById(cmd.category);
    var expandedClass = isExpanded ? ' cmdref-card-expanded' : '';
    var html = '<div class="cmdref-card' + expandedClass + '" data-cmd="' + cmd.command + '">';
    html += '<div class="cmdref-card-header">';
    html += '<div class="cmdref-card-left">';
    html += '<span class="cmdref-cat-badge" style="background:' + cat.color + '">' + cat.icon + '</span>';
    html += '<div class="cmdref-card-title">';
    html += '<code class="cmdref-syntax">' + escapeHTML(cmd.syntax) + '</code>';
    html += '<p class="cmdref-desc">' + escapeHTML(cmd.description) + '</p>';
    html += '</div></div>';
    html += '<button class="cmdref-expand-btn" aria-label="' + (isExpanded ? 'Collapse' : 'Expand') + '">' +
      (isExpanded ? '▲' : '▼') + '</button>';
    html += '</div>';

    if (isExpanded) {
      html += '<div class="cmdref-card-body">';
      html += '<div class="cmdref-examples">';
      html += '<h4>Examples</h4>';
      cmd.examples.forEach(function (ex) {
        html += '<div class="cmdref-example">';
        html += '<code>' + escapeHTML(ex) + '</code>';
        html += '<button class="cmdref-copy-btn" data-copy="' + escapeHTML(ex) + '" title="Copy to clipboard">📋</button>';
        html += '</div>';
      });
      html += '</div>';
      if (cmd.tips) {
        html += '<div class="cmdref-tips"><strong>💡 Tip:</strong> ' + escapeHTML(cmd.tips) + '</div>';
      }
      html += '</div>';
    }
    html += '</div>';
    return html;
  }

  function render(container) {
    var filtered = filterCommands();
    var html = '<div class="cmdref-search-row">';
    html += '<input type="text" class="cmdref-search" placeholder="Search commands..." value="' +
      escapeHTML(state.searchQuery) + '" aria-label="Search commands">';
    html += '<span class="cmdref-count">' + filtered.length + ' command' + (filtered.length !== 1 ? 's' : '') + '</span>';
    html += '</div>';
    html += '<div class="cmdref-categories">' + renderCategoryFilters() + '</div>';
    html += '<div class="cmdref-list">';
    if (filtered.length === 0) {
      html += '<div class="cmdref-empty">No commands match your search. Try a different term.</div>';
    } else {
      filtered.forEach(function (cmd) {
        html += renderCommandCard(cmd, state.expandedCommand === cmd.command);
      });
    }
    html += '</div>';
    container.innerHTML = html;
    bindEvents(container);
  }

  // ---- Events ----

  function bindEvents(container) {
    var searchInput = container.querySelector('.cmdref-search');
    if (searchInput) {
      searchInput.addEventListener('input', function (e) {
        state.searchQuery = e.target.value;
        render(container);
        // Re-focus and restore cursor
        var newInput = container.querySelector('.cmdref-search');
        if (newInput) {
          newInput.focus();
          newInput.setSelectionRange(state.searchQuery.length, state.searchQuery.length);
        }
      });
    }

    var catBtns = container.querySelectorAll('.cmdref-cat-btn');
    catBtns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        state.activeCategory = btn.getAttribute('data-cat');
        state.expandedCommand = null;
        render(container);
      });
    });

    var cards = container.querySelectorAll('.cmdref-card');
    cards.forEach(function (card) {
      var header = card.querySelector('.cmdref-card-header');
      if (header) {
        header.addEventListener('click', function (e) {
          if (e.target.classList.contains('cmdref-copy-btn')) return;
          var cmd = card.getAttribute('data-cmd');
          state.expandedCommand = state.expandedCommand === cmd ? null : cmd;
          render(container);
        });
      }
    });

    var copyBtns = container.querySelectorAll('.cmdref-copy-btn');
    copyBtns.forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        var text = btn.getAttribute('data-copy');
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(text).then(function () {
            btn.textContent = '✅';
            setTimeout(function () { btn.textContent = '📋'; }, 1500);
          });
        } else {
          // Fallback
          var ta = document.createElement('textarea');
          ta.value = text;
          ta.style.position = 'fixed';
          ta.style.opacity = '0';
          document.body.appendChild(ta);
          ta.select();
          document.execCommand('copy');
          document.body.removeChild(ta);
          btn.textContent = '✅';
          setTimeout(function () { btn.textContent = '📋'; }, 1500);
        }
      });
    });
  }

  // ---- Init ----

  function init() {
    var container = document.getElementById('commandRefContent');
    if (!container) return;
    render(container);
  }

  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', init);
    } else {
      init();
    }
  }

  return {
    init: init,
    COMMANDS: COMMANDS,
    CATEGORIES: CATEGORIES,
    filterCommands: filterCommands,
    _state: state
  };
})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = CommandReference;
}
