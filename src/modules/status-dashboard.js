
// ---------------------------------------------------------------------------
// System Status Dashboard Module
// ---------------------------------------------------------------------------

var StatusDashboard = (function () {
  const STATUS_LEVELS = ['operational', 'degraded', 'outage'];
  let _grid = null;
  let _incidents = null;
  let _overall = null;
  /** Cached service elements keyed by data-service name for O(1) lookup. */
  let _serviceCache = null;
  /** Cached service element array (avoids querySelectorAll on every call). */
  let _serviceList = null;

  /** Lazily resolve grid element. */
  function getGrid() {
    if (!_grid) _grid = document.getElementById('statusGrid');
    return _grid;
  }

  /** Lazily resolve incidents container. */
  function getIncidentsEl() {
    if (!_incidents) _incidents = document.getElementById('statusIncidents');
    return _incidents;
  }

  /** Lazily resolve overall status element. */
  function getOverall() {
    if (!_overall) _overall = document.getElementById('statusOverall');
    return _overall;
  }

  function init() {
    _grid = document.getElementById('statusGrid');
    _incidents = document.getElementById('statusIncidents');
    _overall = document.getElementById('statusOverall');
    _buildServiceCache();
    updateOverall();
  }

  /** Build O(1) service lookup from DOM. Called once on init. */
  function _buildServiceCache() {
    _serviceCache = Object.create(null);
    _serviceList = [];
    if (!getGrid()) return;
    const els = getGrid().querySelectorAll('.status-service');
    for (var i = 0; i < els.length; i++) {
      _serviceList.push(els[i]);
      const name = els[i].getAttribute('data-service');
      if (name) _serviceCache[name] = els[i];
    }
  }

  function getServices() {
    if (_serviceList) return _serviceList;
    if (!getGrid()) return [];
    _buildServiceCache();
    return _serviceList;
  }

  function getIncidents() {
    if (!getIncidentsEl()) return [];
    return Array.prototype.slice.call(
      getIncidentsEl().querySelectorAll('.status-incident')
    );
  }

  function getServiceStatus(serviceName) {
    if (!_serviceCache) _buildServiceCache();
    let el = _serviceCache[serviceName];
    return el ? el.getAttribute('data-status') : null;
  }

  function getServiceUptime(serviceName) {
    if (!_serviceCache) _buildServiceCache();
    let el = _serviceCache[serviceName];
    if (!el) return null;
    const uptimeEl = el.querySelector('.status-uptime');
    return uptimeEl ? parseFloat(uptimeEl.textContent) : null;
  }

  function setServiceStatus(serviceName, status) {
    if (!_serviceCache) _buildServiceCache();
    let el = _serviceCache[serviceName];
    if (el) {
      el.setAttribute('data-status', status);
      const dot = el.querySelector('.status-dot');
      if (dot) dot.className = 'status-dot ' + status;
    }
    updateOverall();
  }

  function setServiceUptime(serviceName, uptime) {
    if (!_serviceCache) _buildServiceCache();
    const svc = _serviceCache[serviceName];
    if (!svc) return;
    let el = svc.querySelector('.status-uptime');
    if (el) el.textContent = uptime.toFixed(2) + '%';
    let bar = svc.querySelector('.status-bar-fill');
    if (bar) bar.style.width = Math.min(100, Math.max(0, uptime)) + '%';
    const meter = svc.querySelector('.status-bar');
    if (meter) meter.setAttribute('aria-valuenow', String(uptime));
  }

  function updateOverall() {
    const services = getServices();
    let worst = 'operational';
    for (var i = 0; i < services.length; i++) {
      let s = services[i].getAttribute('data-status');
      if (STATUS_LEVELS.indexOf(s) > STATUS_LEVELS.indexOf(worst)) {
        worst = s;
      }
    }

    if (!getOverall()) return;

    const dot = getOverall().querySelector('.status-dot');
    let text = getOverall().querySelector('.status-overall-text');
    if (dot) dot.className = 'status-dot ' + worst;

    const messages = {
      operational: 'All systems operational',
      degraded: 'Some systems degraded',
      outage: 'System outage detected'
    };
    if (text) text.textContent = messages[worst] || worst;
  }

  function getOverallStatus() {
    if (!getOverall()) return null;
    const dot = getOverall().querySelector('.status-dot');
    if (!dot) return null;
    for (var i = STATUS_LEVELS.length - 1; i >= 0; i--) {
      if (dot.classList.contains(STATUS_LEVELS[i])) return STATUS_LEVELS[i];
    }
    return 'operational';
  }

  function getServiceNames() {
    return getServices().map(function (s) {
      return s.getAttribute('data-service');
    });
  }

  function getAverageUptime() {
    const services = getServices();
    if (services.length === 0) return 0;
    let total = 0;
    for (var i = 0; i < services.length; i++) {
      let el = services[i].querySelector('.status-uptime');
      total += el ? parseFloat(el.textContent) || 0 : 0;
    }
    return total / services.length;
  }

  function getIncidentCount() {
    return getIncidents().length;
  }

  return {
    init: init,
    getServices: getServices,
    getIncidents: getIncidents,
    getServiceStatus: getServiceStatus,
    getServiceUptime: getServiceUptime,
    setServiceStatus: setServiceStatus,
    setServiceUptime: setServiceUptime,
    updateOverall: updateOverall,
    getOverallStatus: getOverallStatus,
    getServiceNames: getServiceNames,
    getAverageUptime: getAverageUptime,
    getIncidentCount: getIncidentCount
  };
})();
