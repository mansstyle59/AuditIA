/* AuditIA — thème « lavande » : passe de cohérence des couleurs.
   L'application écrit beaucoup de couleurs en dur (fonds sombres, dégradés, textes clairs)
   dans son HTML. Ce script repère, dans l'espace de travail uniquement, les fonds très sombres
   (couleur unie ou dégradé) et les textes clairs, puis leur applique des classes du thème :
   fond clair et texte foncé. Un élément qui a lui-même un fond moyen ou saturé (bouton violet,
   bandeau) garde son texte clair. Aucune donnée n'est modifiée. */
(function () {
  if (window.__lavenderTheme) return;
  window.__lavenderTheme = true;

  var DARK_BG = 0.08;     // fond sombre à éclaircir
  var LIGHT_TXT = 0.2;    // texte assez clair pour être foncé sur fond clair
  var OWN_KEEP = 0.35;    // fond propre assez sombre/saturé : on garde le texte clair
  var SKIP = '.mobile-tabbar, .app-topbar, .sidebar-nav, .workspace-sidebar, .sidebar-backdrop, .lv-skip, .mq-top, .mq-menu, .mq-tabbar, .mq-banner, .mq-tiles, .ai-float-launcher, .ai-float-panel, .ai-float, .pg-cta, .app-btn.primary, .status-safe, .dk-top, .dk-hero, .dk-feats, .dk-band, .dk-chip, .dk-btn';

  function lumOf(r, g, b) {
    function f(v) { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
  }
  // Liste de couleurs rgb(a) trouvées dans une chaîne CSS (couleur ou dégradé)
  function colorsIn(str) {
    var out = [], re = /rgba?\(([^)]+)\)/g, m;
    while ((m = re.exec(str))) {
      var p = m[1].split(/[\s,\/]+/).filter(Boolean).map(Number);
      out.push({ r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 });
    }
    return out;
  }
  // Luminance propre d'un élément : fond uni ou moyenne d'un dégradé. null si transparent.
  function ownBg(el) {
    var cs = getComputedStyle(el);
    var img = cs.backgroundImage;
    if (img && img !== 'none' && /gradient/.test(img)) {
      var cols = colorsIn(img);
      if (cols.length) {
        var sum = 0, a = 0;
        cols.forEach(function (c) { sum += lumOf(c.r, c.g, c.b) * c.a; a += c.a; });
        return { L: sum / a, a: 1 };
      }
    }
    var c = colorsIn(cs.backgroundColor)[0];
    if (!c || c.a <= 0) return null;
    return { L: lumOf(c.r, c.g, c.b), a: c.a };
  }
  function textColor(el) {
    var c = colorsIn(getComputedStyle(el).color)[0];
    return c && c.a >= 0.5 ? c : null;
  }
  function active() {
    return document.body.classList.contains('lv-on') && !!document.querySelector('.workspace-app');
  }

  var done = new WeakSet();   // éléments déjà traités : on ne les relit pas
  var pending = new Set();    // racines ajoutées au DOM depuis le dernier passage

  function collect(root) {
    var list = [];
    if (root.nodeType === 1 && !done.has(root)) list.push(root);
    var sub = root.querySelectorAll ? root.querySelectorAll('*') : [];
    for (var k = 0; k < sub.length; k++) if (!done.has(sub[k])) list.push(sub[k]);
    return list;
  }

  function pass() {
    if (!active()) { pending.clear(); return; }
    var roots = Array.from(pending);
    pending.clear();
    if (!roots.length) return;
    var all = [];
    roots.forEach(function (r) { if (r.isConnected) all.push.apply(all, collect(r)); });
    if (!all.length) return;
    var i, el;
    // 1) Fonds très sombres -> fond clair
    for (i = 0; i < all.length; i++) {
      el = all[i];
      if (el.closest(SKIP)) continue;
      var b = ownBg(el);
      if (b && b.a > 0.3 && b.L < DARK_BG && !el.classList.contains('lv-light-bg')) {
        el.classList.add('lv-light-bg');
      }
    }
    // 2) Textes clairs : foncés seulement si le fond effectif est clair
    for (i = 0; i < all.length; i++) {
      el = all[i];
      if (el.closest(SKIP)) continue;
      var col = textColor(el);
      if (!col || lumOf(col.r, col.g, col.b) < LIGHT_TXT) continue;
      var own = ownBg(el), eff = own;
      var node = el;
      while (!eff && node.parentElement && node.parentElement !== document.body) {
        node = node.parentElement;
        eff = ownBg(node);
      }
      if (eff && eff.L < OWN_KEEP) continue; // bouton, bandeau ou fond sombre : texte clair voulu
      el.classList.add('lv-dark-text');
    }
    for (i = 0; i < all.length; i++) done.add(all[i]);
  }

  var queued = false;
  function schedule() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(function () { queued = false; pass(); });
  }
  function start() {
    document.body.classList.add('lv-on');
    new MutationObserver(function (records) {
      records.forEach(function (rec) {
        rec.addedNodes.forEach(function (n) { if (n.nodeType === 1) pending.add(n); });
      });
      if (pending.size) schedule();
    }).observe(document.body, { childList: true, subtree: true });
    pending.add(document.body);
    schedule();
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
