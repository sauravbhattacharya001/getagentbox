/**
 * @jest-environment jsdom
 */

/* global describe, test, expect, beforeEach */

const fs = require('fs');
const path = require('path');

const html = fs.readFileSync(path.resolve(__dirname, '..', 'uptime-history.html'), 'utf8');

function setup() {
  document.documentElement.innerHTML = '';
  document.write(html);
  document.close();
  // Trigger DOMContentLoaded won't re-fire in jsdom, so the IIFE runs inline
}

describe('Uptime History page', () => {
  beforeEach(() => {
    setup();
  });

  test('renders page title', () => {
    expect(document.title).toBe('AgentBox - Uptime History');
  });

  test('renders overall banner', () => {
    const banner = document.getElementById('overallBanner');
    expect(banner).not.toBeNull();
    expect(banner.textContent.length).toBeGreaterThan(0);
  });

  test('renders summary cards', () => {
    const grid = document.getElementById('summaryGrid');
    const cards = grid.querySelectorAll('.summary-card');
    expect(cards.length).toBe(4);
  });

  test('summary cards contain expected labels', () => {
    const grid = document.getElementById('summaryGrid');
    const labels = Array.from(grid.querySelectorAll('.label')).map(el => el.textContent);
    expect(labels).toContain('Overall Uptime (90d)');
    expect(labels).toContain('Total Incidents');
    expect(labels).toContain('Total Downtime');
    expect(labels).toContain('Services Monitored');
  });

  test('renders filter bar with All Services + 8 service buttons', () => {
    const bar = document.getElementById('filterBar');
    const btns = bar.querySelectorAll('.filter-btn');
    expect(btns.length).toBe(9); // All + 8 services
    expect(btns[0].textContent).toBe('All Services');
    expect(btns[0].classList.contains('active')).toBe(true);
  });

  test('renders 8 service sections', () => {
    const sections = document.querySelectorAll('.service-section');
    expect(sections.length).toBe(8);
  });

  test('each service section has 90 day bars', () => {
    const sections = document.querySelectorAll('.service-section');
    sections.forEach(section => {
      const bars = section.querySelectorAll('.day-bar');
      expect(bars.length).toBe(90);
    });
  });

  test('day bars have valid status classes', () => {
    const validStatuses = ['operational', 'degraded', 'partial', 'outage', 'no-data'];
    const bars = document.querySelectorAll('.day-bar');
    bars.forEach(bar => {
      const hasValid = validStatuses.some(s => bar.classList.contains(s));
      expect(hasValid).toBe(true);
    });
  });

  test('service headers show uptime percentage', () => {
    const pcts = document.querySelectorAll('.uptime-pct');
    expect(pcts.length).toBe(8);
    pcts.forEach(pct => {
      expect(pct.textContent).toMatch(/\d+\.\d+% uptime/);
    });
  });

  test('renders incident cards', () => {
    const cards = document.querySelectorAll('.incident-card');
    expect(cards.length).toBeGreaterThan(0);
  });

  test('incident cards have severity badges', () => {
    const badges = document.querySelectorAll('.severity-badge');
    badges.forEach(badge => {
      const validSeverities = ['minor', 'major', 'critical'];
      const hasSeverity = validSeverities.some(s => badge.classList.contains(s));
      expect(hasSeverity).toBe(true);
    });
  });

  test('incidents are sorted most recent first', () => {
    const dates = Array.from(document.querySelectorAll('.incident-date')).map(el => el.textContent.split(' · ')[0]);
    expect(dates.length).toBeGreaterThan(1);
    // First date should be more recent (date parsing check)
    for (let i = 1; i < dates.length; i++) {
      expect(new Date(dates[i - 1]).getTime()).toBeGreaterThanOrEqual(new Date(dates[i]).getTime());
    }
  });

  test('filter button click filters to single service', () => {
    const btns = document.querySelectorAll('.filter-btn');
    // Click the second button (first specific service)
    btns[1].click();
    const sections = document.querySelectorAll('.service-section');
    expect(sections.length).toBe(1);
  });

  test('clicking All Services shows all 8 services', () => {
    const btns = document.querySelectorAll('.filter-btn');
    btns[1].click(); // filter to one
    // Re-query after render
    const allBtn = document.querySelectorAll('.filter-btn')[0];
    allBtn.click();
    const sections = document.querySelectorAll('.service-section');
    expect(sections.length).toBe(8);
  });

  test('theme toggle switches to light mode', () => {
    const btn = document.getElementById('themeBtn');
    btn.click();
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
    expect(btn.textContent).toContain('Dark');
  });

  test('theme toggle back to dark mode', () => {
    const btn = document.getElementById('themeBtn');
    btn.click(); // light
    btn.click(); // dark
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    expect(btn.textContent).toContain('Light');
  });

  test('tooltip exists and is hidden initially', () => {
    const tt = document.getElementById('tooltip');
    expect(tt).not.toBeNull();
    // Initial display is 'none' set via CSS; jsdom may not compute it
    // Check that tooltip has no visible content initially
    expect(tt.innerHTML).toBe('');
  });

  test('day labels show date range', () => {
    const labels = document.querySelectorAll('.day-labels');
    expect(labels.length).toBeGreaterThan(0);
    const firstLabel = labels[0];
    expect(firstLabel.textContent).toContain('Today');
  });

  test('legend has 5 items', () => {
    const items = document.querySelectorAll('.legend-item');
    expect(items.length).toBe(5);
  });

  test('back link points to index.html', () => {
    const link = document.querySelector('.back-link');
    expect(link.getAttribute('href')).toBe('index.html');
  });
});
