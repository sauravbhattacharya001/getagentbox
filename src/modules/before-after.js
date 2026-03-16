var BeforeAfter = (function () {
  'use strict';

  function init() {
    if (typeof document === 'undefined') return;
    const tabBefore = document.getElementById('baTabBefore');
    const tabAfter  = document.getElementById('baTabAfter');
    const panelBefore = document.getElementById('baPanelBefore');
    const panelAfter  = document.getElementById('baPanelAfter');
    if (!tabBefore || !tabAfter || !panelBefore || !panelAfter) return;

    function switchTo(which) {
      const isBefore = which === 'before';
      tabBefore.classList.toggle('active', isBefore);
      tabAfter.classList.toggle('active', !isBefore);
      tabBefore.setAttribute('aria-selected', isBefore ? 'true' : 'false');
      tabAfter.setAttribute('aria-selected', !isBefore ? 'true' : 'false');
      panelBefore.classList.toggle('active', isBefore);
      panelAfter.classList.toggle('active', !isBefore);
      panelBefore.hidden = !isBefore;
      panelAfter.hidden = isBefore;
    }

    tabBefore.addEventListener('click', function () { switchTo('before'); });
    tabAfter.addEventListener('click', function () { switchTo('after'); });

    tabBefore.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight') { tabAfter.focus(); switchTo('after'); }
    });
    tabAfter.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowLeft') { tabBefore.focus(); switchTo('before'); }
    });
  }

  return { init: init };
})();
