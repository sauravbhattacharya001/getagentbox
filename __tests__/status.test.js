/**
 * @jest-environment jsdom
 */

/* global StatusDashboard */

const fs = require('fs');
const path = require('path');

beforeEach(() => {
  const html = fs.readFileSync(path.resolve(__dirname, '../index.html'), 'utf8');
  document.documentElement.innerHTML = html;

  const script = fs.readFileSync(path.resolve(__dirname, '../app.js'), 'utf8');
  eval(script);

  StatusDashboard.init();
});

describe('StatusDashboard', () => {
  test('module exists with expected API', () => {
    expect(StatusDashboard).toBeDefined();
    expect(typeof StatusDashboard.init).toBe('function');
    expect(typeof StatusDashboard.getServices).toBe('function');
    expect(typeof StatusDashboard.getIncidents).toBe('function');
    expect(typeof StatusDashboard.getServiceStatus).toBe('function');
    expect(typeof StatusDashboard.getServiceUptime).toBe('function');
    expect(typeof StatusDashboard.setServiceStatus).toBe('function');
    expect(typeof StatusDashboard.setServiceUptime).toBe('function');
    expect(typeof StatusDashboard.updateOverall).toBe('function');
    expect(typeof StatusDashboard.getOverallStatus).toBe('function');
    expect(typeof StatusDashboard.getServiceNames).toBe('function');
    expect(typeof StatusDashboard.getAverageUptime).toBe('function');
    expect(typeof StatusDashboard.getIncidentCount).toBe('function');
  });

  test('init does not throw', () => {
    expect(() => StatusDashboard.init()).not.toThrow();
  });

  test('section exists in DOM', () => {
    expect(document.getElementById('statusSection')).not.toBeNull();
    expect(document.getElementById('statusGrid')).not.toBeNull();
    expect(document.getElementById('statusOverall')).not.toBeNull();
    expect(document.getElementById('statusIncidents')).not.toBeNull();
  });

  test('section has title and subtitle', () => {
    var section = document.getElementById('statusSection');
    expect(section.querySelector('h2').textContent).toContain('status');
    expect(section.querySelector('.status-subtitle')).not.toBeNull();
  });

  test('has 5 services', () => {
    expect(StatusDashboard.getServices().length).toBe(5);
  });

  test('getServiceNames returns all service names', () => {
    var names = StatusDashboard.getServiceNames();
    expect(names).toContain('api');
    expect(names).toContain('chat');
    expect(names).toContain('memory');
    expect(names).toContain('integrations');
    expect(names).toContain('webhooks');
    expect(names.length).toBe(5);
  });

  test('each service has required elements', () => {
    StatusDashboard.getServices().forEach(function (svc) {
      expect(svc.getAttribute('data-service')).toBeTruthy();
      expect(svc.getAttribute('data-status')).toBeTruthy();
      expect(svc.querySelector('.status-dot')).not.toBeNull();
      expect(svc.querySelector('.status-service-name')).not.toBeNull();
      expect(svc.querySelector('.status-uptime')).not.toBeNull();
      expect(svc.querySelector('.status-bar')).not.toBeNull();
      expect(svc.querySelector('.status-bar-fill')).not.toBeNull();
    });
  });

  test('all services operational by default', () => {
    StatusDashboard.getServices().forEach(function (svc) {
      expect(svc.getAttribute('data-status')).toBe('operational');
    });
  });

  test('overall status is operational by default', () => {
    expect(StatusDashboard.getOverallStatus()).toBe('operational');
  });

  test('overall text says all systems operational', () => {
    var text = document.querySelector('.status-overall-text');
    expect(text.textContent).toBe('All systems operational');
  });

  test('getServiceStatus returns correct status', () => {
    expect(StatusDashboard.getServiceStatus('api')).toBe('operational');
    expect(StatusDashboard.getServiceStatus('nonexistent')).toBeNull();
  });

  test('getServiceUptime returns correct uptime', () => {
    var uptime = StatusDashboard.getServiceUptime('api');
    expect(uptime).toBe(99.98);
  });

  test('getServiceUptime returns null for unknown service', () => {
    expect(StatusDashboard.getServiceUptime('unknown')).toBeNull();
  });

  test('setServiceStatus updates status and dot', () => {
    StatusDashboard.setServiceStatus('api', 'degraded');
    expect(StatusDashboard.getServiceStatus('api')).toBe('degraded');
    var svc = StatusDashboard.getServices()[0];
    var dot = svc.querySelector('.status-dot');
    expect(dot.classList.contains('degraded')).toBe(true);
    expect(dot.classList.contains('operational')).toBe(false);
  });

  test('setServiceStatus updates overall status', () => {
    StatusDashboard.setServiceStatus('chat', 'outage');
    expect(StatusDashboard.getOverallStatus()).toBe('outage');
    var text = document.querySelector('.status-overall-text');
    expect(text.textContent).toBe('System outage detected');
  });

  test('degraded service makes overall degraded', () => {
    StatusDashboard.setServiceStatus('memory', 'degraded');
    expect(StatusDashboard.getOverallStatus()).toBe('degraded');
    var text = document.querySelector('.status-overall-text');
    expect(text.textContent).toBe('Some systems degraded');
  });

  test('outage takes priority over degraded', () => {
    StatusDashboard.setServiceStatus('api', 'degraded');
    StatusDashboard.setServiceStatus('chat', 'outage');
    expect(StatusDashboard.getOverallStatus()).toBe('outage');
  });

  test('restoring all to operational updates overall', () => {
    StatusDashboard.setServiceStatus('api', 'outage');
    StatusDashboard.setServiceStatus('api', 'operational');
    expect(StatusDashboard.getOverallStatus()).toBe('operational');
  });

  test('setServiceUptime updates text and bar', () => {
    StatusDashboard.setServiceUptime('api', 95.5);
    var svc = StatusDashboard.getServices()[0];
    expect(svc.querySelector('.status-uptime').textContent).toBe('95.50%');
    expect(svc.querySelector('.status-bar-fill').style.width).toBe('95.5%');
  });

  test('setServiceUptime clamps to 0-100', () => {
    StatusDashboard.setServiceUptime('api', 150);
    var svc = StatusDashboard.getServices()[0];
    expect(svc.querySelector('.status-bar-fill').style.width).toBe('100%');

    StatusDashboard.setServiceUptime('api', -10);
    expect(svc.querySelector('.status-bar-fill').style.width).toBe('0%');
  });

  test('setServiceUptime updates aria-valuenow', () => {
    StatusDashboard.setServiceUptime('chat', 97.5);
    var svc = StatusDashboard.getServices()[1];
    var meter = svc.querySelector('.status-bar');
    expect(meter.getAttribute('aria-valuenow')).toBe('97.5');
  });

  test('uptime bars have meter role with aria attributes', () => {
    StatusDashboard.getServices().forEach(function (svc) {
      var bar = svc.querySelector('.status-bar');
      expect(bar.getAttribute('role')).toBe('meter');
      expect(bar.getAttribute('aria-label')).toBeTruthy();
      expect(bar.getAttribute('aria-valuenow')).toBeTruthy();
      expect(bar.getAttribute('aria-valuemin')).toBe('0');
      expect(bar.getAttribute('aria-valuemax')).toBe('100');
    });
  });

  test('getAverageUptime computes correctly', () => {
    var avg = StatusDashboard.getAverageUptime();
    expect(avg).toBeGreaterThan(99);
    expect(avg).toBeLessThanOrEqual(100);
  });

  test('has 3 incidents', () => {
    expect(StatusDashboard.getIncidentCount()).toBe(3);
  });

  test('incidents have required elements', () => {
    StatusDashboard.getIncidents().forEach(function (inc) {
      expect(inc.getAttribute('data-severity')).toBeTruthy();
      expect(inc.querySelector('.status-incident-date')).not.toBeNull();
      expect(inc.querySelector('.status-incident-badge')).not.toBeNull();
      expect(inc.querySelector('.status-incident-text')).not.toBeNull();
    });
  });

  test('all incidents are resolved', () => {
    StatusDashboard.getIncidents().forEach(function (inc) {
      expect(inc.getAttribute('data-severity')).toBe('resolved');
    });
  });

  test('nav has Status link', () => {
    var nav = document.querySelector('.nav-links');
    var links = Array.prototype.slice.call(nav.querySelectorAll('a'));
    var statusLink = links.find(function (a) {
      return a.getAttribute('href') === '#statusSection';
    });
    expect(statusLink).toBeDefined();
    expect(statusLink.textContent).toBe('Status');
  });

  test('status dots have aria-hidden', () => {
    var dots = document.querySelectorAll('#statusGrid .status-dot');
    dots.forEach(function (dot) {
      expect(dot.getAttribute('aria-hidden')).toBe('true');
    });
  });

  test('overall dot has aria-hidden', () => {
    var dot = document.querySelector('#statusOverall .status-dot');
    expect(dot.getAttribute('aria-hidden')).toBe('true');
  });

  test('multiple status changes work correctly', () => {
    StatusDashboard.setServiceStatus('api', 'outage');
    StatusDashboard.setServiceStatus('chat', 'degraded');
    StatusDashboard.setServiceStatus('api', 'operational');
    expect(StatusDashboard.getServiceStatus('api')).toBe('operational');
    expect(StatusDashboard.getServiceStatus('chat')).toBe('degraded');
    expect(StatusDashboard.getOverallStatus()).toBe('degraded');
  });
});
