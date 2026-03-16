var SocialProofToasts = (function () {
  'use strict';

  let _container = null;
  let _timer = null;
  let _dismissed = false;
  let _prefersReducedMotion = false;
  const _toastQueue = [];
  let _activeToast = null;

  const DISPLAY_MS = 5000;
  const INTERVAL_MS = 25000;
  const INITIAL_DELAY_MS = 12000;
  const MAX_TOASTS_PER_SESSION = 15;
  let _toastsShown = 0;

  const cities = [
    'Seattle', 'San Francisco', 'New York', 'London', 'Berlin',
    'Tokyo', 'Toronto', 'Sydney', 'Amsterdam', 'Singapore',
    'Austin', 'Portland', 'Denver', 'Chicago', 'Los Angeles',
    'Stockholm', 'Dublin', 'Bangalore', 'Seoul', 'Paris'
  ];

  const actions = [
    { icon: '🚀', text: 'just started using AgentBox' },
    { icon: '⭐', text: 'upgraded to Pro' },
    { icon: '🎉', text: 'sent their 100th message' },
    { icon: '🔔', text: 'set up their first reminder' },
    { icon: '🧠', text: 'enabled long-term memory' },
    { icon: '📷', text: 'analyzed their first image' },
    { icon: '🔍', text: 'ran their first web search' },
    { icon: '💬', text: 'created a custom persona' },
    { icon: '📊', text: 'connected a new integration' },
    { icon: '🎯', text: 'completed the onboarding quiz' }
  ];

  const timeLabels = [
    'just now', '2 minutes ago', '5 minutes ago',
    '8 minutes ago', '12 minutes ago'
  ];

  function pick(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  function generateToast() {
    const city = pick(cities);
    const action = pick(actions);
    const time = pick(timeLabels);
    return {
      icon: action.icon,
      city: city,
      text: action.text,
      time: time
    };
  }

  function createToastEl(data) {
    let toast = document.createElement('div');
    toast.className = 'sp-toast';
    toast.setAttribute('role', 'status');
    toast.setAttribute('aria-live', 'polite');

    let icon = document.createElement('span');
    icon.className = 'sp-toast-icon';
    icon.textContent = data.icon;

    const body = document.createElement('div');
    body.className = 'sp-toast-body';

    const msg = document.createElement('span');
    msg.className = 'sp-toast-msg';
    msg.textContent = 'Someone in ' + data.city + ' ' + data.text;

    const time = document.createElement('span');
    time.className = 'sp-toast-time';
    time.textContent = data.time;

    body.appendChild(msg);
    body.appendChild(time);

    const close = document.createElement('button');
    close.className = 'sp-toast-close';
    close.setAttribute('aria-label', 'Dismiss notification');
    close.textContent = '\u00D7';
    close.addEventListener('click', function (e) {
      e.stopPropagation();
      hideToast(toast);
    });

    toast.appendChild(icon);
    toast.appendChild(body);
    toast.appendChild(close);

    return toast;
  }

  function showToast() {
    if (_dismissed || _toastsShown >= MAX_TOASTS_PER_SESSION) {
      stop();
      return;
    }
    if (_activeToast) return;

    const data = generateToast();
    let el = createToastEl(data);
    _activeToast = el;
    _container.appendChild(el);
    _toastsShown++;

    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        el.classList.add('sp-toast-visible');
      });
    });

    setTimeout(function () {
      hideToast(el);
    }, DISPLAY_MS);
  }

  function hideToast(el) {
    if (!el || !el.parentNode) {
      _activeToast = null;
      return;
    }
    el.classList.remove('sp-toast-visible');
    el.classList.add('sp-toast-hiding');
    const onEnd = function () {
      el.removeEventListener('transitionend', onEnd);
      if (el.parentNode) el.parentNode.removeChild(el);
      if (_activeToast === el) _activeToast = null;
    };
    el.addEventListener('transitionend', onEnd);
    // Fallback in case transitionend doesn't fire
    setTimeout(onEnd, 500);
  }

  function start() {
    if (_prefersReducedMotion || _dismissed) return;
    _timer = setInterval(showToast, INTERVAL_MS);
  }

  function stop() {
    if (_timer) {
      clearInterval(_timer);
      _timer = null;
    }
  }

  function dismiss() {
    _dismissed = true;
    stop();
    if (_activeToast) hideToast(_activeToast);
    try {
      sessionStorage.setItem('sp-toasts-dismissed', '1');
    } catch (e) { /* noop */ }
  }

  function init() {
    if (typeof document === 'undefined') return;

    try {
      if (sessionStorage.getItem('sp-toasts-dismissed') === '1') {
        _dismissed = true;
        return;
      }
    } catch (e) { /* noop */ }

    const mq = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)');
    if (mq) {
      _prefersReducedMotion = mq.matches;
      mq.addEventListener('change', function (e) {
        _prefersReducedMotion = e.matches;
        if (_prefersReducedMotion) stop();
      });
    }
    if (_prefersReducedMotion) return;

    _container = document.createElement('div');
    _container.className = 'sp-toast-container';
    _container.setAttribute('aria-label', 'Activity notifications');
    document.body.appendChild(_container);

    setTimeout(function () {
      showToast();
      start();
    }, INITIAL_DELAY_MS);
  }

  function destroy() {
    stop();
    if (_activeToast) hideToast(_activeToast);
    if (_container && _container.parentNode) {
      _container.parentNode.removeChild(_container);
    }
    _container = null;
    _toastsShown = 0;
    _dismissed = false;
  }

  return {
    init: init,
    dismiss: dismiss,
    destroy: destroy,
    _showToast: showToast
  };
})();
