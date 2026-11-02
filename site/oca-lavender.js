/* AuditIA — thème « lavande » : passe de cohérence des couleurs.
   L'application écrit beaucoup de couleurs en dur (fonds sombres, textes clairs) dans son HTML.
   Ce script repère, dans l'espace de travail uniquement, les fonds très sombres et les textes
   clairs, puis leur applique des classes du thème (fond clair, texte foncé). Les boutons et
   pastilles saturés gardent leur texte blanc. Aucune donnée n'est modifiée. */
(function () {
  if (window.__lavenderTheme) return;
  window.__lavenderTheme = true;

  function parse(c) {
    var m = c && c.match(/rgba?\(([^)]+)\)/);
    if (!m) return null;
    var p = m[1].split(/[\s,\/]+/).filter(Boolean).map(Number);
    return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 };
  }
  function lum(c) {
    function f(v) { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }
    return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b);
  }
  function active() {
    return !!document.querySelector('.workspace-app') && document.body.classList.contains('lv-on');
  }
  function bgOf(el) { return parse(getComputedStyle(el).backgroundColor); }

  var DARK_BG = 0.08;   // fond sombre à éclaircir
  var LIGHT_TXT = 0.2;  // texte assez clair pour être foncé sur fond clair
  var KEEP_TXT_ON = 0.3; // fond assez sombre : on garde le texte clair

  function pass() {
    if (!active()) return;
    var root = document.querySelector('.workspace-app');
    var all = root.querySelectorAll('*');
    for (var i = 0; i < all.length; i++) {
      var el = all[i];
      if (el.closest('.mobile-tabbar, .app-topbar, .sidebar-nav, .workspace-sidebar, .sidebar-backdrop')) continue;
      var bg = bgOf(el);
      if (bg && bg.a > 0.3 && lum(bg) < DARK_BG && !el.classList.contains('lv-light-bg')) {
        el.classList.add('lv-light-bg');
      }
    }
    for (var j = 0; j < all.length; j++) {
      var t = all[j];
      if (t.closest('.mobile-tabbar, .app-topbar, .sidebar-nav, .workspace-sidebar')) continue;
      var col = parse(getComputedStyle(t).color);
      if (!col || col.a < 0.5 || lum(col) < LIGHT_TXT) continue;
      // Fond effectif : premier ancêtre (ou l'élément) avec un fond opaque
      var node = t, eff = null;
      while (node && node !== document.body) {
        var b = bgOf(node);
        if (b && b.a > 0.5) { eff = b; break; }
        node = node.parentElement;
      }
      if (eff && lum(eff) < KEEP_TXT_ON) continue; // bouton ou bandeau sombre : texte clair voulu
      t.classList.add('lv-dark-text');
    }
  }

  var queued = false;
  function schedule() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(function () { queued = false; pass(); });
  }

  function start() {
    document.body.classList.add('lv-on');
    new MutationObserver(function () { schedule(); })
      .observe(document.body, { childList: true, subtree: true });
    schedule();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
