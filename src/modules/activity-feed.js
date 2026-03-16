
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Agent Activity Feed — Live-style simulated activity stream
// ---------------------------------------------------------------------------
var ActivityFeed = (function () {
  'use strict';

  let feedEl;
  let activeCountEl, todayCountEl;
  let cycleTimer = null;
  let counterTimer = null;

  /** Maximum visible items in the feed. */
  const MAX_VISIBLE = 5;

  /** Interval between new activity items (ms). */
  const CYCLE_INTERVAL = 4000;

  /** Pool of simulated agent activities. */
  const ACTIVITIES = [
    { icon: '\u{1F50D}', text: 'searched the web for "best budget laptops 2026"' },
    { icon: '\u23F0', text: 'set a reminder: "Call dentist at 3 PM"' },
    { icon: '\u{1F4E7}', text: 'summarized 5 unread emails into key action items' },
    { icon: '\u{1F373}', text: 'found a 20-minute chicken stir-fry recipe' },
    { icon: '\u{1F4BB}', text: 'debugged a React useEffect infinite loop' },
    { icon: '\u{1F30D}', text: 'translated a business email from Japanese to English' },
    { icon: '\u{1F4CA}', text: 'analyzed Q4 sales data and created a summary chart' },
    { icon: '\u{1F3B5}', text: 'created a focus playlist with lo-fi and ambient tracks' },
    { icon: '\u{1F4DD}', text: 'drafted meeting notes from a 45-minute standup' },
    { icon: '\u2708\uFE0F', text: 'found the cheapest flights to Tokyo for March' },
    { icon: '\u{1F4F7}', text: 'identified a plant from a photo: Monstera deliciosa' },
    { icon: '\u{1F4B0}', text: 'compared 3 savings accounts and recommended the best APY' },
    { icon: '\u{1F3CB}\uFE0F', text: 'generated a 4-week workout plan for muscle building' },
    { icon: '\u{1F4DA}', text: 'summarized a 300-page book into 10 key takeaways' },
    { icon: '\u{1F6D2}', text: 'built a grocery list from 5 saved recipes' },
    { icon: '\u2600\uFE0F', text: 'checked the weekend forecast: sunny, perfect for hiking' },
    { icon: '\u{1F3E0}', text: 'scheduled a smart home routine: lights off at 11 PM' },
    { icon: '\u{1F4AC}', text: 'drafted a polite follow-up email to a recruiter' },
    { icon: '\u{1F52C}', text: 'explained quantum entanglement in simple terms' },
    { icon: '\u{1F3AF}', text: 'broke down a project into 12 actionable tasks with deadlines' },
  ];

  /** Shuffled index to avoid repeats until pool exhausted. */
  let shuffled = [];
  let shuffleIdx = 0;

  function shuffle() {
    shuffled = [];
    for (var i = 0; i < ACTIVITIES.length; i++) shuffled.push(i);
    for (var j = shuffled.length - 1; j > 0; j--) {
      let k = Math.floor(Math.random() * (j + 1));
      const tmp = shuffled[j];
      shuffled[j] = shuffled[k];
      shuffled[k] = tmp;
    }
    shuffleIdx = 0;
  }

  function nextActivity() {
    if (shuffleIdx >= shuffled.length) shuffle();
    return ACTIVITIES[shuffled[shuffleIdx++]];
  }

  function timeLabel() {
    return 'just now';
  }

  /** Create an activity item DOM node. */
  function createItem(activity) {
    const item = document.createElement('div');
    item.className = 'activity-item entering';

    let icon = document.createElement('span');
    icon.className = 'activity-icon';
    icon.textContent = activity.icon;

    let text = document.createElement('span');
    text.className = 'activity-text';
    const strong = document.createElement('strong');
    strong.textContent = 'Agent';
    text.appendChild(strong);
    text.appendChild(document.createTextNode(' ' + activity.text));

    const time = document.createElement('span');
    time.className = 'activity-time';
    time.textContent = timeLabel();

    item.appendChild(icon);
    item.appendChild(text);
    item.appendChild(time);

    return item;
  }

  /** Cycle: add a new item at top, remove oldest if over limit. */
  function cycle() {
    if (!feedEl) return;

    const act = nextActivity();
    const newItem = createItem(act);

    // Age existing time labels
    const items = feedEl.querySelectorAll('.activity-item');
    for (var i = 0; i < items.length; i++) {
      const timeEl = items[i].querySelector('.activity-time');
      if (timeEl) {
        const age = (i + 1) * (CYCLE_INTERVAL / 1000);
        if (age < 60) {
          timeEl.textContent = Math.round(age) + 's ago';
        } else {
          timeEl.textContent = Math.round(age / 60) + 'm ago';
        }
      }
    }

    // Remove oldest if over limit
    if (items.length >= MAX_VISIBLE) {
      const last = items[items.length - 1];
      last.classList.add('exiting');

      // Guard: prevent double-removal if animationend races with fallback
      let removed = false;
      function removeOnce() {
        if (removed) return;
        removed = true;
        if (last.parentNode) last.parentNode.removeChild(last);
      }

      if (prefersReducedMotion) {
        // Immediate removal when animations are disabled
        removeOnce();
      } else {
        last.addEventListener('animationend', removeOnce);
        // Fallback: if animationend never fires (CSS animation missing,
        // browser throttled, or tab backgrounded), remove after 1s to
        // prevent unbounded DOM growth.
        setTimeout(removeOnce, 1000);
      }
    }

    // Insert new at top
    feedEl.insertBefore(newItem, feedEl.firstChild);

    // Remove entering class after animation
    setTimeout(function () {
      newItem.classList.remove('entering');
    }, 400);
  }

  /** Slowly increment the counters for visual effect. */
  function tickCounters() {
    if (!activeCountEl || !todayCountEl) return;
    let active = parseInt(activeCountEl.textContent.replace(/,/g, ''), 10) || 1247;
    let today = parseInt(todayCountEl.textContent.replace(/,/g, ''), 10) || 18392;

    // Active counter: biased-upward fluctuation (-1 to +2) so it
    // doesn't visibly drop frequently.  Floor at 1000.
    active += Math.floor(Math.random() * 4) - 1;
    if (active < 1000) active = 1000;

    // Today counter: diminishing increments near the cap so it never
    // visibly jumps backwards.  Slows to +0/+1 above 24,000 and
    // stalls at 25,000 until the next page load resets it.
    if (today < 22000) {
      today += Math.floor(Math.random() * 3) + 1;          // +1..+3
    } else if (today < 24000) {
      today += Math.floor(Math.random() * 2) + 1;          // +1..+2
    } else if (today < 25000) {
      today += Math.random() < 0.5 ? 1 : 0;                // +0..+1
    }
    // At or above 25,000: no further increment (stalls gracefully)

    activeCountEl.textContent = active.toLocaleString();
    todayCountEl.textContent = today.toLocaleString();
  }

  /** IntersectionObserver callback — only animate when visible. */
  function onVisible(entries) {
    for (var i = 0; i < entries.length; i++) {
      if (entries[i].isIntersecting) {
        startCycling();
      } else {
        stopCycling();
      }
    }
  }

  function startCycling() {
    if (cycleTimer) return;
    cycleTimer = setInterval(cycle, CYCLE_INTERVAL);
    counterTimer = setInterval(tickCounters, CYCLE_INTERVAL);
  }

  function stopCycling() {
    if (cycleTimer) { clearInterval(cycleTimer); cycleTimer = null; }
    if (counterTimer) { clearInterval(counterTimer); counterTimer = null; }
  }

  function init() {
    feedEl = document.getElementById('activityFeed');
    activeCountEl = document.getElementById('activityActiveCount');
    todayCountEl = document.getElementById('activityTodayCount');
    if (!feedEl) return;

    shuffle();

    // Use IntersectionObserver if available, otherwise just start
    if (typeof IntersectionObserver !== 'undefined') {
      const observer = new IntersectionObserver(onVisible, { threshold: 0.2 });
      const section = document.getElementById('activitySection');
      if (section) observer.observe(section);
    } else {
      startCycling();
    }
  }

  function destroy() {
    stopCycling();
  }

  return { init: init, destroy: destroy };
})();
