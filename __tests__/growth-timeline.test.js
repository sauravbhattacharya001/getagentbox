/**
 * @jest-environment jsdom
 */
'use strict';

describe('GrowthTimeline', function () {
  var GrowthTimeline;

  function buildDOM() {
    document.body.innerHTML = `
      <div class="growth-timeline-section" id="growthTimelineSection">
        <div class="growth-timeline-controls">
          <button class="growth-tab active" data-milestone="week1" aria-pressed="true">Week 1</button>
          <button class="growth-tab" data-milestone="month1" aria-pressed="false">Month 1</button>
          <button class="growth-tab" data-milestone="month3" aria-pressed="false">Month 3</button>
          <button class="growth-tab" data-milestone="month6" aria-pressed="false">Month 6</button>
        </div>
        <div class="growth-progress-bar">
          <div class="growth-progress-fill" id="growthProgressFill"></div>
          <div class="growth-progress-markers">
            <div class="growth-marker active" data-milestone="week1"></div>
            <div class="growth-marker" data-milestone="month1"></div>
            <div class="growth-marker" data-milestone="month3"></div>
            <div class="growth-marker" data-milestone="month6"></div>
          </div>
        </div>
        <div class="growth-content" id="growthContent">
          <div class="growth-card visible" data-milestone="week1"><h3>Getting Started</h3></div>
          <div class="growth-card" data-milestone="month1"><h3>Building Momentum</h3></div>
          <div class="growth-card" data-milestone="month3"><h3>Power User</h3></div>
          <div class="growth-card" data-milestone="month6"><h3>Indispensable</h3></div>
        </div>
      </div>
    `;
  }

  beforeEach(function () {
    jest.useFakeTimers();
    buildDOM();
    jest.resetModules();
    require('../app.js');
    GrowthTimeline = window.GrowthTimeline;
    GrowthTimeline.init();
  });

  afterEach(function () {
    GrowthTimeline.stopAutoPlay();
    jest.useRealTimers();
    document.body.innerHTML = '';
    delete window.GrowthTimeline;
  });

  test('initializes at week1', function () {
    expect(GrowthTimeline.getCurrent()).toBe(0);
    var tab = document.querySelector('.growth-tab[data-milestone="week1"]');
    expect(tab.classList.contains('active')).toBe(true);
    expect(tab.getAttribute('aria-pressed')).toBe('true');
  });

  test('shows correct card for current milestone', function () {
    var card = document.querySelector('.growth-card[data-milestone="week1"]');
    expect(card.classList.contains('visible')).toBe(true);
    var hidden = document.querySelector('.growth-card[data-milestone="month1"]');
    expect(hidden.classList.contains('visible')).toBe(false);
  });

  test('select changes active tab', function () {
    GrowthTimeline.select(2);
    expect(GrowthTimeline.getCurrent()).toBe(2);
    var tab = document.querySelector('.growth-tab[data-milestone="month3"]');
    expect(tab.classList.contains('active')).toBe(true);
    expect(tab.getAttribute('aria-pressed')).toBe('true');
    var old = document.querySelector('.growth-tab[data-milestone="week1"]');
    expect(old.classList.contains('active')).toBe(false);
  });

  test('select shows matching card and hides others', function () {
    GrowthTimeline.select(1);
    var visible = document.querySelector('.growth-card[data-milestone="month1"]');
    expect(visible.classList.contains('visible')).toBe(true);
    document.querySelectorAll('.growth-card:not([data-milestone="month1"])').forEach(function (c) {
      expect(c.classList.contains('visible')).toBe(false);
    });
  });

  test('select updates progress bar width', function () {
    GrowthTimeline.select(1);
    var fill = document.getElementById('growthProgressFill');
    expect(fill.style.width).toBe('37.5%');
    GrowthTimeline.select(3);
    expect(fill.style.width).toBe('87.5%');
  });

  test('select updates marker classes', function () {
    GrowthTimeline.select(2);
    var markers = document.querySelectorAll('.growth-marker');
    expect(markers[0].classList.contains('passed')).toBe(true);
    expect(markers[1].classList.contains('passed')).toBe(true);
    expect(markers[2].classList.contains('active')).toBe(true);
    expect(markers[3].classList.contains('active')).toBe(false);
    expect(markers[3].classList.contains('passed')).toBe(false);
  });

  test('select ignores out-of-range index', function () {
    GrowthTimeline.select(0);
    GrowthTimeline.select(-1);
    expect(GrowthTimeline.getCurrent()).toBe(0);
    GrowthTimeline.select(99);
    expect(GrowthTimeline.getCurrent()).toBe(0);
  });

  test('next cycles through milestones', function () {
    GrowthTimeline.next();
    expect(GrowthTimeline.getCurrent()).toBe(1);
    GrowthTimeline.next();
    expect(GrowthTimeline.getCurrent()).toBe(2);
    GrowthTimeline.next();
    expect(GrowthTimeline.getCurrent()).toBe(3);
    GrowthTimeline.next();
    expect(GrowthTimeline.getCurrent()).toBe(0); // wraps
  });

  test('tab click changes milestone', function () {
    var tab = document.querySelector('.growth-tab[data-milestone="month3"]');
    tab.click();
    expect(GrowthTimeline.getCurrent()).toBe(2);
  });

  test('marker click changes milestone', function () {
    var marker = document.querySelectorAll('.growth-marker')[3];
    marker.click();
    expect(GrowthTimeline.getCurrent()).toBe(3);
  });

  test('auto-advances after interval', function () {
    expect(GrowthTimeline.getCurrent()).toBe(0);
    jest.advanceTimersByTime(4000);
    expect(GrowthTimeline.getCurrent()).toBe(1);
    jest.advanceTimersByTime(4000);
    expect(GrowthTimeline.getCurrent()).toBe(2);
  });

  test('pauses on mouseenter, resumes on mouseleave', function () {
    var section = document.getElementById('growthTimelineSection');
    section.dispatchEvent(new Event('mouseenter'));
    jest.advanceTimersByTime(8000);
    expect(GrowthTimeline.getCurrent()).toBe(0); // paused
    section.dispatchEvent(new Event('mouseleave'));
    jest.advanceTimersByTime(4000);
    expect(GrowthTimeline.getCurrent()).toBe(1); // resumed
  });

  test('keyboard ArrowRight advances', function () {
    var section = document.getElementById('growthTimelineSection');
    section.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }));
    expect(GrowthTimeline.getCurrent()).toBe(1);
  });

  test('keyboard ArrowLeft goes back', function () {
    GrowthTimeline.select(2);
    var section = document.getElementById('growthTimelineSection');
    section.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft' }));
    expect(GrowthTimeline.getCurrent()).toBe(1);
  });

  test('ArrowLeft does not go below 0', function () {
    GrowthTimeline.select(0);
    var section = document.getElementById('growthTimelineSection');
    section.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft' }));
    expect(GrowthTimeline.getCurrent()).toBe(0);
  });

  test('ArrowRight does not go above max', function () {
    GrowthTimeline.select(3);
    var section = document.getElementById('growthTimelineSection');
    section.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }));
    expect(GrowthTimeline.getCurrent()).toBe(3);
  });

  test('getMilestones returns copy of milestones', function () {
    var ms = GrowthTimeline.getMilestones();
    expect(ms).toEqual(['week1', 'month1', 'month3', 'month6']);
    ms.push('year1');
    expect(GrowthTimeline.getMilestones().length).toBe(4);
  });

  test('PROGRESS values are correct', function () {
    expect(GrowthTimeline.PROGRESS).toEqual({
      week1: 12.5, month1: 37.5, month3: 62.5, month6: 87.5
    });
  });

  test('all four cards exist in DOM', function () {
    var cards = document.querySelectorAll('.growth-card');
    expect(cards.length).toBe(4);
  });

  test('only one card visible at a time', function () {
    for (var i = 0; i < 4; i++) {
      GrowthTimeline.select(i);
      var visible = document.querySelectorAll('.growth-card.visible');
      expect(visible.length).toBe(1);
    }
  });

  test('stopAutoPlay prevents auto-advance', function () {
    GrowthTimeline.stopAutoPlay();
    jest.advanceTimersByTime(20000);
    expect(GrowthTimeline.getCurrent()).toBe(0);
  });

  test('startAutoPlay after stop resumes cycling', function () {
    GrowthTimeline.stopAutoPlay();
    jest.advanceTimersByTime(8000);
    expect(GrowthTimeline.getCurrent()).toBe(0);
    GrowthTimeline.startAutoPlay();
    jest.advanceTimersByTime(4000);
    expect(GrowthTimeline.getCurrent()).toBe(1);
  });
});
