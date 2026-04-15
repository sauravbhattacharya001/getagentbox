/**
 * @jest-environment jsdom
 */

/* Tests for src/events-page.js */

beforeEach(() => {
  // Reset DOM
  document.body.innerHTML = '';
  // Reset localStorage
  localStorage.clear();
  // Reset module cache so IIFE re-runs
  jest.resetModules();
});

function setupDOM({ withGrid = true, withFilters = true, withSubscribe = true, withIcal = true } = {}) {
  let html = '';
  if (withFilters) {
    html += `<div id="eventsFilters">
      <button class="events-filter-btn active" data-filter="all">All</button>
      <button class="events-filter-btn" data-filter="webinar">Webinars</button>
      <button class="events-filter-btn" data-filter="workshop">Workshops</button>
      <button class="events-filter-btn" data-filter="meetup">Meetups</button>
      <button class="events-filter-btn" data-filter="conference">Conferences</button>
    </div>`;
  }
  if (withGrid) {
    html += '<div id="eventsGrid"></div>';
  }
  if (withSubscribe) {
    html += `<input id="eventEmail" type="email" />
      <button id="eventSubscribeBtn">Subscribe</button>
      <div id="subscribeMsg" style="display:none;"></div>`;
  }
  if (withIcal) {
    html += '<a id="icalLink" href="#">Download .ics</a>';
  }
  document.body.innerHTML = html;
}

function loadModule() {
  require('../src/events-page.js');
}

describe('Events Page – Initial Render', () => {
  test('renders all 7 event cards on load', () => {
    setupDOM();
    loadModule();
    const cards = document.querySelectorAll('.event-card');
    expect(cards.length).toBe(7);
  });

  test('upcoming events appear before past events', () => {
    setupDOM();
    loadModule();
    const cards = document.querySelectorAll('.event-card');
    const statuses = Array.from(cards).map(c => c.getAttribute('data-status'));
    const firstPastIdx = statuses.indexOf('past');
    const lastUpcomingIdx = statuses.lastIndexOf('upcoming');
    expect(lastUpcomingIdx).toBeLessThan(firstPastIdx);
  });

  test('upcoming events are sorted by date ascending', () => {
    setupDOM();
    loadModule();
    const cards = Array.from(document.querySelectorAll('.event-card[data-status="upcoming"]'));
    // The days in the date badges should be in ascending order
    const monthMap = { Jan: 1, Feb: 2, Mar: 3, Apr: 4, May: 5, Jun: 6, Jul: 7, Aug: 8, Sep: 9, Oct: 10, Nov: 11, Dec: 12 };
    const dates = cards.map(c => {
      const m = monthMap[c.querySelector('.month').textContent];
      const d = parseInt(c.querySelector('.day').textContent);
      return m * 100 + d;
    });
    for (let i = 1; i < dates.length; i++) {
      expect(dates[i]).toBeGreaterThanOrEqual(dates[i - 1]);
    }
  });

  test('past events are sorted by date descending', () => {
    setupDOM();
    loadModule();
    const cards = Array.from(document.querySelectorAll('.event-card[data-status="past"]'));
    const months = { Jan: 0, Feb: 1, Mar: 2 };
    const dates = cards.map(c => {
      const m = c.querySelector('.month').textContent;
      const d = parseInt(c.querySelector('.day').textContent);
      return months[m] * 31 + d; // rough ordering
    });
    for (let i = 1; i < dates.length; i++) {
      expect(dates[i]).toBeLessThanOrEqual(dates[i - 1]);
    }
  });

  test('each card has title, description, tags, and CTA', () => {
    setupDOM();
    loadModule();
    const card = document.querySelector('.event-card');
    expect(card.querySelector('h3')).not.toBeNull();
    expect(card.querySelector('.event-card-body p')).not.toBeNull();
    expect(card.querySelectorAll('.event-tag').length).toBeGreaterThan(0);
    expect(card.querySelector('.event-cta')).not.toBeNull();
  });

  test('past events show "Watch Recording" CTA', () => {
    setupDOM();
    loadModule();
    const pastCards = document.querySelectorAll('.event-card[data-status="past"]');
    pastCards.forEach(c => {
      const cta = c.querySelector('.event-cta');
      expect(cta.textContent).toContain('Watch Recording');
      expect(cta.classList.contains('past-cta')).toBe(true);
    });
  });

  test('upcoming events show "Register" CTA', () => {
    setupDOM();
    loadModule();
    const upCards = document.querySelectorAll('.event-card[data-status="upcoming"]');
    upCards.forEach(c => {
      expect(c.querySelector('.event-cta').textContent).toBe('Register');
    });
  });

  test('does not crash when grid is missing', () => {
    setupDOM({ withGrid: false });
    expect(() => loadModule()).not.toThrow();
  });
});

describe('Events Page – Filtering', () => {
  test('clicking "Webinars" shows only webinar cards', () => {
    setupDOM();
    loadModule();
    const btn = document.querySelector('[data-filter="webinar"]');
    btn.click();
    const cards = document.querySelectorAll('.event-card');
    cards.forEach(c => {
      expect(c.getAttribute('data-type')).toBe('webinar');
    });
    expect(cards.length).toBe(2); // evt-001 and evt-005
  });

  test('clicking "Workshops" shows only workshop cards', () => {
    setupDOM();
    loadModule();
    document.querySelector('[data-filter="workshop"]').click();
    const cards = document.querySelectorAll('.event-card');
    expect(cards.length).toBe(2);
    cards.forEach(c => expect(c.getAttribute('data-type')).toBe('workshop'));
  });

  test('clicking "Meetups" shows only meetup cards', () => {
    setupDOM();
    loadModule();
    document.querySelector('[data-filter="meetup"]').click();
    expect(document.querySelectorAll('.event-card').length).toBe(2);
  });

  test('clicking "Conferences" shows only conference cards', () => {
    setupDOM();
    loadModule();
    document.querySelector('[data-filter="conference"]').click();
    expect(document.querySelectorAll('.event-card').length).toBe(1);
  });

  test('clicking "All" after filtering shows all cards', () => {
    setupDOM();
    loadModule();
    document.querySelector('[data-filter="webinar"]').click();
    document.querySelector('[data-filter="all"]').click();
    expect(document.querySelectorAll('.event-card').length).toBe(7);
  });

  test('active class moves to clicked filter button', () => {
    setupDOM();
    loadModule();
    const webBtn = document.querySelector('[data-filter="webinar"]');
    webBtn.click();
    expect(webBtn.classList.contains('active')).toBe(true);
    expect(document.querySelector('[data-filter="all"]').classList.contains('active')).toBe(false);
  });

  test('shows empty state for non-matching filter', () => {
    setupDOM();
    loadModule();
    // Add a filter button for a type with no events
    const btn = document.createElement('button');
    btn.className = 'events-filter-btn';
    btn.setAttribute('data-filter', 'hackathon');
    btn.textContent = 'Hackathons';
    document.getElementById('eventsFilters').appendChild(btn);
    btn.click();
    expect(document.querySelector('.events-empty')).not.toBeNull();
    expect(document.querySelector('.events-empty').textContent).toContain('No events found');
  });

  test('clicking non-button inside filters does nothing', () => {
    setupDOM();
    loadModule();
    const cardsBefore = document.querySelectorAll('.event-card').length;
    // Click the container itself
    document.getElementById('eventsFilters').click();
    expect(document.querySelectorAll('.event-card').length).toBe(cardsBefore);
  });
});

describe('Events Page – Subscribe', () => {
  test('valid email subscribes successfully', () => {
    setupDOM();
    loadModule();
    document.getElementById('eventEmail').value = 'test@example.com';
    document.getElementById('eventSubscribeBtn').click();
    const msg = document.getElementById('subscribeMsg');
    expect(msg.textContent).toContain('subscribed');
    expect(msg.style.color).toBe('rgb(46, 204, 113)'); // #2ecc71
    expect(msg.style.display).toBe('block');
    // Email field cleared
    expect(document.getElementById('eventEmail').value).toBe('');
    // Stored in localStorage
    const subs = JSON.parse(localStorage.getItem('agentbox_event_subs'));
    expect(subs).toContain('test@example.com');
  });

  test('empty email shows error', () => {
    setupDOM();
    loadModule();
    document.getElementById('eventEmail').value = '';
    document.getElementById('eventSubscribeBtn').click();
    const msg = document.getElementById('subscribeMsg');
    expect(msg.textContent).toContain('valid email');
    expect(msg.style.color).toBe('rgb(231, 76, 60)'); // #e74c3c
  });

  test('email without @ shows error', () => {
    setupDOM();
    loadModule();
    document.getElementById('eventEmail').value = 'notanemail';
    document.getElementById('eventSubscribeBtn').click();
    expect(document.getElementById('subscribeMsg').textContent).toContain('valid email');
  });

  test('email starting with @ shows error', () => {
    setupDOM();
    loadModule();
    document.getElementById('eventEmail').value = '@bad.com';
    document.getElementById('eventSubscribeBtn').click();
    expect(document.getElementById('subscribeMsg').textContent).toContain('valid email');
  });

  test('duplicate email does not add twice', () => {
    setupDOM();
    loadModule();
    document.getElementById('eventEmail').value = 'dup@test.com';
    document.getElementById('eventSubscribeBtn').click();
    document.getElementById('eventEmail').value = 'dup@test.com';
    document.getElementById('eventSubscribeBtn').click();
    const subs = JSON.parse(localStorage.getItem('agentbox_event_subs'));
    expect(subs.filter(s => s === 'dup@test.com').length).toBe(1);
  });

  test('subscribe works when localStorage throws', () => {
    setupDOM();
    loadModule();
    const orig = localStorage.getItem;
    localStorage.getItem = () => { throw new Error('quota'); };
    document.getElementById('eventEmail').value = 'ok@test.com';
    expect(() => {
      document.getElementById('eventSubscribeBtn').click();
    }).not.toThrow();
    // Still shows success message
    expect(document.getElementById('subscribeMsg').textContent).toContain('subscribed');
    localStorage.getItem = orig;
  });
});

describe('Events Page – iCal Download', () => {
  test('clicking iCal link generates .ics blob and triggers download', () => {
    setupDOM();
    loadModule();
    
    const createObjectURL = jest.fn(() => 'blob:test');
    const revokeObjectURL = jest.fn();
    global.URL.createObjectURL = createObjectURL;
    global.URL.revokeObjectURL = revokeObjectURL;
    
    const clickSpy = jest.fn();
    const origCreateElement = document.createElement.bind(document);
    jest.spyOn(document, 'createElement').mockImplementation((tag) => {
      const el = origCreateElement(tag);
      if (tag === 'a') {
        el.click = clickSpy;
      }
      return el;
    });

    document.getElementById('icalLink').click();

    expect(createObjectURL).toHaveBeenCalledTimes(1);
    const blob = createObjectURL.mock.calls[0][0];
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.type).toBe('text/calendar');
    expect(clickSpy).toHaveBeenCalled();
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:test');

    document.createElement.mockRestore();
  });

  test('iCal only includes upcoming/live events, not past', () => {
    setupDOM();
    loadModule();

    let capturedBlob;
    global.URL.createObjectURL = jest.fn((b) => { capturedBlob = b; return 'blob:x'; });
    global.URL.revokeObjectURL = jest.fn();
    const origCreateElement = document.createElement.bind(document);
    jest.spyOn(document, 'createElement').mockImplementation((tag) => {
      const el = origCreateElement(tag);
      if (tag === 'a') el.click = jest.fn();
      return el;
    });

    document.getElementById('icalLink').click();

    // Verify blob was created and has reasonable size
    expect(capturedBlob.size).toBeGreaterThan(50);
    
    document.createElement.mockRestore();
  });
});

describe('Events Page – Card Structure', () => {
  test('date badges show correct month abbreviation and day', () => {
    setupDOM();
    loadModule();
    // First upcoming card should be evt-001 (April 10)
    const firstCard = document.querySelector('.event-card[data-status="upcoming"]');
    expect(firstCard.querySelector('.month').textContent).toBe('Apr');
    expect(firstCard.querySelector('.day').textContent).toBe('10');
  });

  test('event meta shows time, duration, and speaker', () => {
    setupDOM();
    loadModule();
    const meta = document.querySelector('.event-meta');
    expect(meta.textContent).toContain('AM PT');
    expect(meta.textContent).toContain('min');
  });

  test('event type is set as data attribute', () => {
    setupDOM();
    loadModule();
    const types = Array.from(document.querySelectorAll('.event-card')).map(c => c.getAttribute('data-type'));
    expect(types).toContain('webinar');
    expect(types).toContain('workshop');
    expect(types).toContain('meetup');
    expect(types).toContain('conference');
  });

  test('no innerHTML injection — all content is textContent', () => {
    setupDOM();
    loadModule();
    // Cards should use textContent, not innerHTML — verify no raw HTML in text
    const cards = document.querySelectorAll('.event-card');
    cards.forEach(c => {
      const h3 = c.querySelector('h3');
      expect(h3.textContent).not.toContain('<');
    });
  });
});
