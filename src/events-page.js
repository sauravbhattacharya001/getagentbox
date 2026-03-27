/* Events & Webinars Page – src/events-page.js */
(function () {
  'use strict';

  var EVENTS = [
    {
      id: 'evt-001',
      title: 'Getting Started with AgentBox',
      type: 'webinar',
      date: '2026-04-10',
      time: '11:00 AM PT',
      duration: '45 min',
      speaker: 'AgentBox Team',
      description: 'A beginner-friendly walkthrough of setting up your AI agent on Telegram. Learn the basics of memory, commands, and personalization.',
      tags: ['beginner', 'tutorial'],
      status: 'upcoming',
      link: '#'
    },
    {
      id: 'evt-002',
      title: 'Advanced Memory & Context Workshop',
      type: 'workshop',
      date: '2026-04-17',
      time: '1:00 PM PT',
      duration: '90 min',
      speaker: 'AgentBox Team',
      description: 'Deep-dive into how AgentBox memory works. Build persistent workflows, manage context windows, and create agents that truly remember.',
      tags: ['advanced', 'memory', 'hands-on'],
      status: 'upcoming',
      link: '#'
    },
    {
      id: 'evt-003',
      title: 'Community Show & Tell #1',
      type: 'meetup',
      date: '2026-04-24',
      time: '5:00 PM PT',
      duration: '60 min',
      speaker: 'Community',
      description: 'Users share creative agent setups, automation workflows, and tips. Bring your best AgentBox hacks!',
      tags: ['community', 'showcase'],
      status: 'upcoming',
      link: '#'
    },
    {
      id: 'evt-004',
      title: 'AI Agents at AI Summit 2026',
      type: 'conference',
      date: '2026-05-08',
      time: '10:00 AM PT',
      duration: '30 min talk',
      speaker: 'AgentBox Team',
      description: 'AgentBox presents at AI Summit 2026 on personal AI agents and the future of conversational computing.',
      tags: ['conference', 'talk'],
      status: 'upcoming',
      link: '#'
    },
    {
      id: 'evt-005',
      title: 'Building Integrations with AgentBox',
      type: 'webinar',
      date: '2026-03-18',
      time: '11:00 AM PT',
      duration: '45 min',
      speaker: 'AgentBox Team',
      description: 'Learn how to connect AgentBox with your favorite tools — calendars, task managers, and APIs.',
      tags: ['integrations', 'intermediate'],
      status: 'past',
      recordingLink: '#'
    },
    {
      id: 'evt-006',
      title: 'Prompt Engineering for AI Agents',
      type: 'workshop',
      date: '2026-03-06',
      time: '1:00 PM PT',
      duration: '90 min',
      speaker: 'AgentBox Team',
      description: 'Hands-on workshop covering prompt templates, system instructions, and personality tuning for your agent.',
      tags: ['prompts', 'hands-on'],
      status: 'past',
      recordingLink: '#'
    },
    {
      id: 'evt-007',
      title: 'AgentBox Launch Party Meetup',
      type: 'meetup',
      date: '2026-02-14',
      time: '6:00 PM PT',
      duration: '2 hours',
      speaker: 'Community',
      description: 'Our inaugural community meetup celebrating the AgentBox launch. Demos, Q&A, and good vibes.',
      tags: ['community', 'launch'],
      status: 'past',
      recordingLink: '#'
    }
  ];

  var MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  function parseDate(dateStr) {
    var parts = dateStr.split('-');
    return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
  }

  /**
   * Helper: create a DOM element with optional class, text, and children.
   * Avoids innerHTML/string concatenation to prevent XSS.
   */
  function el(tag, attrs, children) {
    var node = document.createElement(tag);
    if (attrs) {
      if (attrs.className) node.className = attrs.className;
      if (attrs.text) node.textContent = attrs.text;
      if (attrs.href) node.setAttribute('href', attrs.href);
      if (attrs.data) {
        for (var k in attrs.data) {
          if (Object.prototype.hasOwnProperty.call(attrs.data, k)) {
            node.setAttribute('data-' + k, attrs.data[k]);
          }
        }
      }
    }
    if (children) {
      for (var i = 0; i < children.length; i++) {
        node.appendChild(children[i]);
      }
    }
    return node;
  }

  function renderCard(evt) {
    var d = parseDate(evt.date);
    var month = MONTHS[d.getMonth()];
    var day = d.getDate();
    var isPast = evt.status === 'past';
    var statusLabel = evt.status === 'live' ? '\uD83D\uDD34 Live Now' : evt.status === 'upcoming' ? 'Upcoming' : 'Past';
    var ctaText = isPast ? '\u25B6 Watch Recording' : 'Register';
    var ctaClass = isPast ? 'event-cta past-cta' : 'event-cta';
    var ctaHref = isPast ? (evt.recordingLink || '#') : (evt.link || '#');

    var tagEls = evt.tags.map(function(t) {
      return el('span', { className: 'event-tag', text: t });
    });

    return el('article', { className: 'event-card', data: { type: evt.type, status: evt.status } }, [
      el('div', { className: 'event-card-header' }, [
        el('div', { className: 'event-date-badge' }, [
          el('div', { className: 'month', text: month }),
          el('div', { className: 'day', text: String(day) })
        ]),
        el('div', { className: 'event-info' }, [
          el('h3', { text: evt.title }),
          el('div', { className: 'event-meta' }, [
            el('span', { text: '\uD83D\uDD50 ' + evt.time + ' \u00B7 ' + evt.duration }),
            el('span', { text: '\uD83C\uDFA4 ' + evt.speaker })
          ])
        ])
      ]),
      el('div', { className: 'event-card-body' }, [
        el('p', { text: evt.description }),
        el('div', { className: 'event-tags' }, tagEls)
      ]),
      el('div', { className: 'event-card-footer' }, [
        el('span', { className: 'event-status ' + evt.status, text: statusLabel }),
        el('a', { className: ctaClass, href: ctaHref, text: ctaText })
      ])
    ]);
  }

  function render(filter) {
    var grid = document.getElementById('eventsGrid');
    if (!grid) return;
    var filtered = filter === 'all' ? EVENTS : EVENTS.filter(function(e) { return e.type === filter; });
    // Sort: upcoming first (by date asc), then past (by date desc)
    var upcoming = filtered.filter(function(e) { return e.status !== 'past'; }).sort(function(a,b) { return parseDate(a.date) - parseDate(b.date); });
    var past = filtered.filter(function(e) { return e.status === 'past'; }).sort(function(a,b) { return parseDate(b.date) - parseDate(a.date); });
    var sorted = upcoming.concat(past);

    // Clear grid safely
    while (grid.firstChild) grid.removeChild(grid.firstChild);

    if (sorted.length === 0) {
      var empty = el('div', { className: 'events-empty' }, [
        el('p', { text: 'No events found for this category. Check back soon!' })
      ]);
      grid.appendChild(empty);
      return;
    }
    var frag = document.createDocumentFragment();
    for (var i = 0; i < sorted.length; i++) {
      frag.appendChild(renderCard(sorted[i]));
    }
    grid.appendChild(frag);
  }

  // Filters
  var filtersEl = document.getElementById('eventsFilters');
  if (filtersEl) {
    filtersEl.addEventListener('click', function(e) {
      var btn = e.target.closest('.events-filter-btn');
      if (!btn) return;
      filtersEl.querySelectorAll('.events-filter-btn').forEach(function(b) { b.classList.remove('active'); });
      btn.classList.add('active');
      render(btn.getAttribute('data-filter'));
    });
  }

  // Subscribe
  var subBtn = document.getElementById('eventSubscribeBtn');
  if (subBtn) {
    subBtn.addEventListener('click', function() {
      var email = document.getElementById('eventEmail');
      var msg = document.getElementById('subscribeMsg');
      if (!email || !msg) return;
      var val = email.value.trim();
      if (!val || val.indexOf('@') < 1) {
        msg.textContent = 'Please enter a valid email address.';
        msg.style.color = '#e74c3c';
        msg.style.display = 'block';
        return;
      }
      // Store locally (demo — in production this would hit an API)
      try {
        var subs = JSON.parse(localStorage.getItem('agentbox_event_subs') || '[]');
        if (subs.indexOf(val) === -1) subs.push(val);
        localStorage.setItem('agentbox_event_subs', JSON.stringify(subs));
      } catch(e) { /* ignore */ }
      msg.textContent = '✅ You\'re subscribed! We\'ll notify you about upcoming events.';
      msg.style.color = '#2ecc71';
      msg.style.display = 'block';
      email.value = '';
    });
  }

  // iCal stub
  var icalLink = document.getElementById('icalLink');
  if (icalLink) {
    icalLink.addEventListener('click', function(e) {
      e.preventDefault();
      var lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//AgentBox//Events//EN'];
      EVENTS.filter(function(ev) { return ev.status !== 'past'; }).forEach(function(ev) {
        var d = parseDate(ev.date);
        var dateStr = d.getFullYear() +
          ('0' + (d.getMonth()+1)).slice(-2) +
          ('0' + d.getDate()).slice(-2);
        lines.push('BEGIN:VEVENT');
        lines.push('DTSTART;VALUE=DATE:' + dateStr);
        lines.push('SUMMARY:' + ev.title);
        lines.push('DESCRIPTION:' + ev.description.substring(0, 200));
        lines.push('END:VEVENT');
      });
      lines.push('END:VCALENDAR');
      var blob = new Blob([lines.join('\r\n')], { type: 'text/calendar' });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = 'agentbox-events.ics';
      a.click();
      URL.revokeObjectURL(url);
    });
  }

  // Initial render
  render('all');
})();
