(function () {
  'use strict';

  /* ─── Suppress benign "Transition was skipped" rejections ─────── */
  window.addEventListener('unhandledrejection', function (e) {
    if (e.reason && typeof e.reason.message === 'string' &&
        e.reason.message.toLowerCase().includes('transition')) {
      e.preventDefault();
    }
  });

  /* ─── Helpers ──────────────────────────────────────────────────── */

  function isInternal(href) {
    if (!href || href === '' || href === '#') return false;
    if (href.startsWith('http') || href.startsWith('//')) return false;
    if (href.startsWith('javascript')) return false;
    return true;
  }

  function toPath(href) {
    try { return new URL(href, window.location.href).pathname; }
    catch (_) { return href; }
  }

  function extractStyles(doc) {
    return Array.from(doc.querySelectorAll('style'))
      .map(function (s) { return s.textContent; }).join('\n');
  }

  function applyStyles(css) {
    var el = document.getElementById('__waraq_page_style__');
    if (!el) {
      el = document.createElement('style');
      el.id = '__waraq_page_style__';
      document.head.appendChild(el);
    }
    el.textContent = css;
  }

  /*
   * Run all inline <script> blocks from docBody.
   * Scripts live as siblings of .phone-frame in <body>, not inside it.
   * const/let → var avoids "already declared" on return visits.
   */
  function runScripts(docBody) {
    docBody.querySelectorAll('script').forEach(function (old) {
      if (old.src) return;
      var code = old.textContent
        .replace(/\bconst\s+/g, 'var ')
        .replace(/\blet\s+/g, 'var ');
      var s = document.createElement('script');
      s.textContent = code;
      document.body.appendChild(s);
      document.body.removeChild(s);
    });
  }

  /* ─── Transition helpers — target .screen only ─────────────────── */
  /*
   * The .phone-frame (bezel / border) NEVER moves.
   * Only the .screen content fades + slides within the frame.
   */

  function animateOut(screen) {
    return new Promise(function (resolve) {
      screen.style.transition =
        'opacity 0.14s cubic-bezier(0.4,0,1,1), transform 0.14s cubic-bezier(0.4,0,1,1)';
      screen.style.opacity   = '0';
      screen.style.transform = 'translateY(-6px)';
      setTimeout(resolve, 150);
    });
  }

  function animateIn(screen) {
    screen.style.opacity   = '0';
    screen.style.transform = 'translateY(6px)';
    screen.style.transition = 'none';
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        screen.style.transition =
          'opacity 0.22s cubic-bezier(0,0,0.2,1), transform 0.22s cubic-bezier(0,0,0.2,1)';
        screen.style.opacity   = '1';
        screen.style.transform = 'translateY(0)';
      });
    });
  }

  /* ─── Core navigate ────────────────────────────────────────────── */

  var busy = false;

  function navigate(href) {
    if (busy) return;
    busy = true;

    var frame         = document.querySelector('.phone-frame');
    var currentScreen = frame && frame.querySelector('.screen');

    Promise.all([
      currentScreen ? animateOut(currentScreen) : Promise.resolve(),
      fetch(href).then(function (r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.text();
      })
    ]).then(function (results) {
      var html   = results[1];
      var parser = new DOMParser();
      var doc    = parser.parseFromString(html, 'text/html');

      /* We only need the new .screen, not the entire frame */
      var newScreen = doc.querySelector('.phone-frame .screen');
      if (!newScreen) {
        /* Fallback if page structure is unexpected */
        window.location.href = href;
        busy = false;
        return;
      }

      if (doc.title) document.title = doc.title;
      applyStyles(extractStyles(doc));

      /* Swap only the .screen — phone-frame bezel stays in the DOM */
      if (frame) {
        if (currentScreen) frame.removeChild(currentScreen);
        frame.appendChild(newScreen);
      } else {
        /* No frame yet (e.g. navigator index.html) — fall back to full swap */
        var body = document.body;
        var oldFrame = body.querySelector('.phone-frame');
        var newFrame = doc.querySelector('.phone-frame');
        if (oldFrame) body.removeChild(oldFrame);
        if (newFrame) body.appendChild(newFrame);
      }

      history.pushState({ path: toPath(href) }, doc.title || '', toPath(href));

      /* Run page scripts (searched on doc.body, siblings of .phone-frame) */
      runScripts(doc.body);

      animateIn(newScreen);
      busy = false;
    }).catch(function () {
      window.location.href = href;
      busy = false;
    });
  }

  /* Public API for onclick / programmatic navigation */
  window.waraqGo = navigate;

  /* ─── Intercept <a> clicks ─────────────────────────────────────── */
  document.addEventListener('click', function (e) {
    var el = e.target;
    while (el && el.tagName !== 'A') el = el.parentElement;
    if (!el) return;
    var href = el.getAttribute('href');
    if (!isInternal(href)) return;
    e.preventDefault();
    navigate(href);
  }, true);

  /* ─── Browser back / forward ───────────────────────────────────── */
  window.addEventListener('popstate', function (e) {
    var path = (e.state && e.state.path) || window.location.pathname;
    navigate(path);
  });

  /* ─── First-load: gentle fade-in of .screen only ──────────────── */
  (function firstLoad() {
    var screen = document.querySelector('.phone-frame .screen');
    if (!screen) return;
    screen.style.opacity    = '0';
    screen.style.transform  = 'translateY(6px)';
    screen.style.transition = 'none';
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        screen.style.transition =
          'opacity 0.28s cubic-bezier(0,0,0.2,1), transform 0.28s cubic-bezier(0,0,0.2,1)';
        screen.style.opacity   = '1';
        screen.style.transform = 'translateY(0)';
      });
    });
  }());

}());
