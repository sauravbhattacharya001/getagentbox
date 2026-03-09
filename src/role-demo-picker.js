// ---------------------------------------------------------------------------
// Role Demo Picker - Personalized role-based AgentBox demo conversations
// ---------------------------------------------------------------------------
// Users select their job role and see a simulated chat conversation showing
// how AgentBox helps in that specific role. Each role has 3 example exchanges.

var RoleDemoPicker = (function () {
  'use strict';

  var ROLES = [
    {
      id: 'marketing',
      label: 'Marketing',
      icon: '📣',
      description: 'Campaign automation, content scheduling, analytics summaries',
      conversation: [
        { role: 'user', text: 'Draft 3 social media posts for our product launch next Tuesday' },
        { role: 'agent', text: 'Here are 3 posts tailored for LinkedIn, Twitter, and Instagram — each with platform-specific formatting, hashtags, and a CTA. Want me to schedule them?' },
        { role: 'user', text: 'Yes, schedule LinkedIn for 9am, Twitter for noon, Instagram for 5pm' },
        { role: 'agent', text: 'Done! All 3 are scheduled. I\'ve also set up a reminder to check engagement metrics 24 hours after each post goes live. 📊' }
      ]
    },
    {
      id: 'engineering',
      label: 'Engineering',
      icon: '⚙️',
      description: 'Code reviews, deployment checks, incident triage',
      conversation: [
        { role: 'user', text: 'Summarize the 12 PRs opened this week and flag any with failing CI' },
        { role: 'agent', text: '3 PRs have failing CI: #247 (lint errors), #251 (test timeout), #253 (type mismatch). The other 9 are green. Want a detailed breakdown?' },
        { role: 'user', text: 'Auto-assign reviewers based on code ownership for the green ones' },
        { role: 'agent', text: 'Assigned! 6 PRs got primary reviewers from CODEOWNERS, 3 needed fallback assignment based on recent commit history. All reviewers notified via Slack.' }
      ]
    },
    {
      id: 'sales',
      label: 'Sales',
      icon: '💼',
      description: 'Lead research, meeting prep, follow-up drafts',
      conversation: [
        { role: 'user', text: 'I have a call with Acme Corp in 30 minutes. Prep me.' },
        { role: 'agent', text: 'Acme Corp: Series B ($42M), 200 employees, using Salesforce + HubSpot. Your last touchpoint was a demo 3 weeks ago. Key decision-maker: VP of Ops. They mentioned integration concerns.' },
        { role: 'user', text: 'Draft a follow-up email addressing their integration concerns' },
        { role: 'agent', text: 'Done — the email highlights our native Salesforce connector, includes a case study from a similar company, and proposes a technical deep-dive call. Ready to review before sending.' }
      ]
    },
    {
      id: 'support',
      label: 'Support',
      icon: '🎧',
      description: 'Ticket triage, knowledge base, customer context',
      conversation: [
        { role: 'user', text: 'Show me high-priority tickets from the last 4 hours' },
        { role: 'agent', text: '5 high-priority tickets: 2 are billing issues (similar root cause), 2 are API timeouts (likely related to the deploy at 2pm), 1 is an access request. Want me to group-respond to the billing ones?' },
        { role: 'user', text: 'Yes, and escalate the API timeout tickets to engineering' },
        { role: 'agent', text: 'Billing tickets responded with the known-issue template + ETA. API tickets escalated to #eng-oncall with timeline context and affected customer details attached.' }
      ]
    },
    {
      id: 'executive',
      label: 'Executive',
      icon: '📈',
      description: 'Briefings, report generation, meeting summaries',
      conversation: [
        { role: 'user', text: 'Give me a 60-second briefing for the board meeting at 2pm' },
        { role: 'agent', text: 'Revenue up 18% QoQ. Churn dropped to 3.2%. Product launched 2 major features. Engineering hired 4, 2 offers pending. One risk flag: enterprise deal with DataFlow Inc. stalled — legal reviewing contract terms.' },
        { role: 'user', text: 'Summarize yesterday\'s all-hands meeting — I had to leave early' },
        { role: 'agent', text: 'Key items: Q2 OKRs finalized (you\'re listed as sponsor for the enterprise expansion goal), new PTO policy starts March 1, and the design team demoed the dashboard redesign — positive reception, shipping in 3 weeks.' }
      ]
    },
    {
      id: 'hr',
      label: 'HR & People',
      icon: '👥',
      description: 'Onboarding, scheduling, policy lookups',
      conversation: [
        { role: 'user', text: 'We have 3 new hires starting Monday. Is their onboarding ready?' },
        { role: 'agent', text: 'Checked all 3: laptops provisioned ✓, accounts created ✓, buddy assigned ✓. One gap: Jamie Chen\'s background check is still pending — I\'ve flagged it to the vendor for expedite.' },
        { role: 'user', text: 'Schedule their welcome meetings with their managers' },
        { role: 'agent', text: 'All 3 welcome meetings booked for Monday 10am with respective managers. Calendar invites sent with onboarding doc links and first-week agenda attached.' }
      ]
    }
  ];

  var _container = null;
  var _activeRole = null;
  var _chatArea = null;

  function escapeHtml(str) {
    var div = document.createElement('div');
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
  }

  function init() {
    _container = document.getElementById('rolePickerSection');
    if (!_container) return;

    var roleGrid = _container.querySelector('.role-picker-grid');
    var chatWrap = _container.querySelector('.role-picker-chat');
    _chatArea = chatWrap ? chatWrap.querySelector('.role-chat-messages') : null;

    if (!roleGrid) return;

    var buttons = roleGrid.querySelectorAll('.role-picker-btn');
    for (var i = 0; i < buttons.length; i++) {
      buttons[i].addEventListener('click', function () {
        selectRole(this.getAttribute('data-role'));
      });
    }

    // Select first role by default
    selectRole(ROLES[0].id);
  }

  function selectRole(roleId) {
    var role = null;
    for (var i = 0; i < ROLES.length; i++) {
      if (ROLES[i].id === roleId) { role = ROLES[i]; break; }
    }
    if (!role) return;
    _activeRole = roleId;

    // Update button states
    if (_container) {
      var buttons = _container.querySelectorAll('.role-picker-btn');
      for (var i = 0; i < buttons.length; i++) {
        var btn = buttons[i];
        if (btn.getAttribute('data-role') === roleId) {
          btn.classList.add('active');
          btn.setAttribute('aria-pressed', 'true');
        } else {
          btn.classList.remove('active');
          btn.setAttribute('aria-pressed', 'false');
        }
      }
    }

    // Render conversation
    renderChat(role);
  }

  function renderChat(role) {
    if (!_chatArea) return;

    // Clear existing
    while (_chatArea.firstChild) _chatArea.removeChild(_chatArea.firstChild);

    // Role header
    var header = document.createElement('div');
    header.className = 'role-chat-header';
    header.textContent = role.icon + ' ' + role.label + ' — ' + role.description;
    _chatArea.appendChild(header);

    // Messages
    for (var i = 0; i < role.conversation.length; i++) {
      var msg = role.conversation[i];
      var bubble = document.createElement('div');
      bubble.className = 'role-chat-bubble role-chat-' + msg.role;
      bubble.setAttribute('role', 'listitem');

      var label = document.createElement('span');
      label.className = 'role-chat-label';
      label.textContent = msg.role === 'user' ? 'You' : 'AgentBox';

      var text = document.createElement('span');
      text.className = 'role-chat-text';
      text.textContent = msg.text;

      bubble.appendChild(label);
      bubble.appendChild(text);
      _chatArea.appendChild(bubble);
    }
  }

  function getActiveRole() {
    return _activeRole;
  }

  function getRoles() {
    return ROLES.slice();
  }

  return {
    init: init,
    selectRole: selectRole,
    getActiveRole: getActiveRole,
    getRoles: getRoles,
    _ROLES: ROLES
  };
})();

if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', function () { RoleDemoPicker.init(); });
}
if (typeof window !== 'undefined') { window.RoleDemoPicker = RoleDemoPicker; }
