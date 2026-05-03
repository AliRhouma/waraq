(function () {
  /* Suppress the benign "Transition was skipped" unhandled rejection
     that the View Transitions API emits on rapid / back-to-back navigations */
  window.addEventListener('unhandledrejection', function (e) {
    if (e.reason && typeof e.reason.message === 'string' &&
        e.reason.message.toLowerCase().includes('transition')) {
      e.preventDefault();
    }
  });

  /* ── PAGE ENTER ── */
  /* The phone-frame fades in on every page load */
  var frame = document.querySelector('.phone-frame');
  if (frame) {
    frame.style.opacity = '0';
    frame.style.transform = 'translateY(8px)';
    frame.style.transition = 'opacity 0.22s cubic-bezier(0,0,0.2,1), transform 0.22s cubic-bezier(0,0,0.2,1)';
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        frame.style.opacity = '1';
        frame.style.transform = 'translateY(0)';
      });
    });
  }

  /* ── PAGE EXIT ── */
  /* Intercept internal link clicks — fade + slide out, then navigate */
  function isInternal(href) {
    if (!href) return false;
    if (href.startsWith('http') || href.startsWith('//')) return false;
    if (href.startsWith('#')) return false;
    if (href.startsWith('javascript')) return false;
    if (href === '') return false;
    return true;
  }

  var leaving = false;

  document.addEventListener('click', function (e) {
    /* walk up the DOM to find an <a> */
    var el = e.target;
    while (el && el.tagName !== 'A') el = el.parentElement;
    if (!el) return;

    var href = el.getAttribute('href');
    if (!isInternal(href)) return;
    if (leaving) return;

    /* if browser supports View Transitions natively, it handles the
       animation — we still let the click proceed naturally */
    if (document.startViewTransition) return;

    /* fallback: manual fade-out */
    e.preventDefault();
    leaving = true;

    var f = document.querySelector('.phone-frame');
    if (f) {
      f.style.transition = 'opacity 0.15s cubic-bezier(0.4,0,1,1), transform 0.15s cubic-bezier(0.4,0,1,1)';
      f.style.opacity = '0';
      f.style.transform = 'translateY(-6px)';
    }

    setTimeout(function () {
      window.location.href = href;
    }, 160);
  }, true);
})();
