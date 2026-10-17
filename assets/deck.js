/* C++ Classroom — slide player.
   Slides: <section class="slide fast|slow" data-title="..">. "slow" slides reveal .step items one at a time. */
(function () {
  'use strict';
  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function esc(s) { return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function store(k, v) { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) { } return null; }
  var root = document.documentElement;
  function isMobile() { return window.innerWidth <= 760; }

  /* ---- theme / zoom / hue ---- */
  var th = store('cpp-theme');
  if (!th) { try { if (window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches) th = 'dark'; } catch (e) { } }
  if (th) root.setAttribute('data-theme', th);
  var zoom = parseFloat(store('cpp-zoom')) || 1; root.style.setProperty('--zoom', zoom);
  var hue = document.body.getAttribute('data-hue'); if (hue) root.style.setProperty('--hue', hue);
  function setZoom(z) { zoom = Math.max(0.7, Math.min(1.7, z)); root.style.setProperty('--zoom', zoom); store('cpp-zoom', zoom); if (window.DECK && DECK.fit) setTimeout(function () { DECK.fit(); }, 30); }
  function toggleTheme() { var d = root.getAttribute('data-theme') === 'dark'; var t = d ? 'light' : 'dark'; root.setAttribute('data-theme', t); store('cpp-theme', t); }
  window.CPP = { esc: esc, $: $, $$: $$ };
  if (document.body.classList.contains('home-page') || document.querySelector('[data-home]')) {
    document.addEventListener('DOMContentLoaded', function () {
      var b = $('#thm'); if (b) b.onclick = toggleTheme;
      var m = $('#zm'), p = $('#zp'); if (m) m.onclick = function () { setZoom(zoom - .1); }; if (p) p.onclick = function () { setZoom(zoom + .1); };
    });
    return;
  }

  /* ---- tiny C++ highlighter ---- */
  var KW = 'auto|break|case|catch|class|const|continue|default|delete|do|else|enum|explicit|extern|false|for|friend|goto|if|inline|namespace|new|operator|private|protected|public|register|return|sizeof|static|struct|switch|template|this|throw|true|try|typedef|using|virtual|while|nullptr|constexpr|static_cast|const_cast|reinterpret_cast|dynamic_cast';
  var TY = 'int|char|float|double|void|bool|long|short|signed|unsigned|wchar_t|string|size_t|bitset|cout|cin|cerr|endl|std|boolalpha|hex|oct|dec|setprecision';
  var RE = new RegExp(
    '(\\/\\/[^\\n]*|\\/\\*[\\s\\S]*?\\*\\/)' +
    '|((?:^|\\n)[ \\t]*#[^\\n]*)' +
    '|("(?:\\\\.|[^"\\\\\\n])*"|\'(?:\\\\.|[^\'\\\\\\n])+\')' +
    '|(\\b(?:0[xX][0-9a-fA-F]+|0[bB][01]+|\\d+\\.?\\d*(?:[eE][+-]?\\d+)?[fFlLuU]*)\\b|\\.\\d+[fFlL]?)' +
    '|(\\b(?:' + KW + ')\\b)' +
    '|(\\b(?:' + TY + ')\\b)' +
    '|(<<=|>>=|<<|>>|<=|>=|==|!=|&&|\\|\\||\\+\\+|--|::|->|[-+*\\/%=<>!&|^~?:]=?)', 'g');
  function hl(src) {
    return src.replace(RE, function (m, c, p, s, n, k, t, o) {
      if (c) return '<span class="c">' + esc(c) + '</span>';
      if (p) { var nl = p.charAt(0) === '\n' ? '\n' : ''; return nl + '<span class="p">' + esc(p.slice(nl.length)) + '</span>'; }
      if (s) return '<span class="s">' + esc(s) + '</span>';
      if (n) return '<span class="nu">' + esc(n) + '</span>';
      if (k) return '<span class="k">' + esc(k) + '</span>';
      if (t) return '<span class="t">' + esc(t) + '</span>';
      if (o) return '<span class="o">' + esc(o) + '</span>';
      return esc(m);
    });
  }
  function clean(s) { return s.replace(/^\n+/, '').replace(/\s+$/, ''); }
  function lines(src, mark, other) {
    var set = {}; if (other !== undefined) other.split('\n').forEach(function (l) { set[l.trim()] = 1; });
    return src.split('\n').map(function (l) {
      var cls = (mark && l.trim() && !set[l.trim()]) ? ' ' + mark : '';
      return '<span class="ln' + cls + '">' + (hl(l) || ' ') + '</span>';
    }).join('');
  }
  function parseRange(s) {
    var set = {}; (s || '').split(',').forEach(function (p) {
      var m = p.trim().split('-'); var a = parseInt(m[0], 10), b = m[1] ? parseInt(m[1], 10) : a;
      for (var i = a; i <= b; i++) set[i] = 1;
    }); return set;
  }

  /* ---- code blocks ---- */
  function buildCode(box) {
    var src = {};
    $$('script[data-v]', box).forEach(function (s) { src[s.getAttribute('data-v')] = clean(s.textContent); s.remove(); });
    var walk = $('.walk', box); if (walk) walk.remove();
    var title = box.getAttribute('data-title') || 'program.cpp';
    var both = src.modern !== undefined && src.turbo !== undefined;
    var mode = box.getAttribute('data-mode') || (both ? 'cmp' : 'modern');
    var hasOut = src.out !== undefined || src.outt !== undefined;
    var ran = box.hasAttribute('data-autorun');
    var hot = null;
    var bar = document.createElement('div'); bar.className = 'bar';
    bar.innerHTML = '<span class="dots3"><i></i><i></i><i></i></span><span class="ttl">' + esc(title) + '</span>';
    var body = document.createElement('div');

    function outHtml(txt) { return txt === undefined ? '' : '<div class="outwrap"' + (ran ? '' : ' hidden') + '><div class="out"><b>Output</b>' + esc(txt) + '</div></div>'; }
    function render() {
      var outM = src.out, outT = src.outt !== undefined ? src.outt : src.out, h;
      if (mode === 'cmp') {
        h = '<div class="cmp"><div><h5>Turbo C++ &middot; old school</h5><pre>' + lines(src.turbo, 'del', src.modern) + '</pre>' + outHtml(outT) +
          '</div><div><h5>Modern C++ &middot; paste this online</h5><pre>' + lines(src.modern, 'add', src.turbo) + '</pre>' + outHtml(outM) + '</div></div>';
      } else if (mode === 'turbo') {
        h = '<pre>' + lines(src.turbo) + '</pre>' + outHtml(outT);
      } else {
        h = '<pre>' + lines(src.modern !== undefined ? src.modern : src.turbo) + '</pre>' + outHtml(outM);
      }
      body.innerHTML = h;
      $$('button[data-m]', bar).forEach(function (b) { b.classList.toggle('on', b.getAttribute('data-m') === mode); });
      applyHot();
    }
    function applyHot() {
      var walking = !!(walk && hot && (mode === 'modern' || (!both && mode !== 'cmp')));
      box.classList.toggle('walking', walking);
      $$('pre .ln', body).forEach(function (l, i) { l.classList.toggle('hot', !!(walking && hot[i + 1])); });
    }
    box._setHot = function (spec) { hot = spec ? parseRange(spec) : null; if (walk && spec && both && mode !== 'modern') { mode = 'modern'; render(); } else applyHot(); };

    if (both) {
      [['cmp', 'Compare'], ['modern', 'Modern'], ['turbo', 'Turbo C++']].forEach(function (m) {
        var b = document.createElement('button'); b.textContent = m[1]; b.setAttribute('data-m', m[0]);
        b.onclick = function () { mode = m[0]; render(); }; bar.appendChild(b);
      });
    }
    if (hasOut) {
      var run = document.createElement('button'); run.className = 'run'; run.textContent = ran ? '▶ Hide output' : '▶ Run';
      run.onclick = function () { ran = !ran; run.textContent = ran ? '▶ Hide output' : '▶ Run'; $$('.outwrap', body).forEach(function (o) { o.hidden = !ran; }); };
      bar.appendChild(run);
    }
    var cp = document.createElement('button'); cp.textContent = 'Copy';
    cp.onclick = function () {
      var t = (mode === 'turbo') ? src.turbo : (src.modern !== undefined ? src.modern : src.turbo);
      var done = function () { cp.textContent = 'Copied ✓'; setTimeout(function () { cp.textContent = 'Copy'; }, 1400); };
      function fb() { var ta = document.createElement('textarea'); ta.value = t; document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); done(); } catch (e) { } ta.remove(); }
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(t).then(done, fb); else fb();
    };
    bar.appendChild(cp);
    box.appendChild(bar); box.appendChild(body);
    if (walk) box.appendChild(walk);
    render();
  }

  /* ---- MCQ ---- */
  var QZ = { correct: 0, answered: 0, wrong: [] };
  function buildMcq(el) {
    var ans = parseInt(el.getAttribute('data-a'), 10), ref = el.getAttribute('data-ref');
    var ul = $('ul', el), opts = $$('li', ul), wrap = document.createElement('div'); wrap.className = 'opts';
    var first = true;
    opts.forEach(function (li, i) {
      var b = document.createElement('button'); b.className = 'opt'; b.innerHTML = li.innerHTML;
      b.onclick = function () {
        if (el.classList.contains('done')) return;
        if (i === ans) { b.classList.add('ok'); el.classList.add('done'); QZ.answered++; if (first) QZ.correct++; }
        else {
          b.classList.add('bad'); first = false; el.classList.add('wrong');
          if (ref) {
            var ext = ref.indexOf('#') > 0, tgt0 = ext ? null : document.getElementById(ref);
            var nm = ext ? (el.getAttribute('data-reftitle') || 'the lesson') : (tgt0 ? tgt0.getAttribute('data-title') : ref);
            if (!QZ.wrong.some(function (w) { return w.id === ref; })) QZ.wrong.push({ id: ref, title: nm, ext: ext });
          }
          b.disabled = true;
        }
      };
      wrap.appendChild(b);
    });
    ul.replaceWith(wrap);
    if (ref) {
      var rv = document.createElement('div'); rv.className = 'rv';
      var ext2 = ref.indexOf('#') > 0, tg = ext2 ? null : document.getElementById(ref);
      var label = ext2 ? (el.getAttribute('data-reftitle') || 'the lesson') : (tg ? tg.getAttribute('data-title') : 'the idea');
      rv.innerHTML = '<button>↩ Not quite — revisit: ' + esc(label) + '</button>';
      rv.firstChild.onclick = function () { if (ext2) location.href = ref; else DECK.goId(ref); };
      el.appendChild(rv);
    }
  }
  function fillRevisit() {
    $$('.revisit').forEach(function (r) {
      if (!QZ.wrong.length) { r.innerHTML = QZ.answered ? '<p class="score">🎉 Nothing to revisit — every concept landed.</p>' : '<p class="mute">Answer the quiz questions and any weak spots will show up here.</p>'; return; }
      r.innerHTML = '<p><b>Let’s look again at:</b></p>' + QZ.wrong.map(function (w) { return '<span class="item" data-id="' + w.id + '" data-ext="' + (w.ext ? 1 : 0) + '">↩ ' + esc(w.title) + '</span>'; }).join('');
      $$('.item', r).forEach(function (i) { i.onclick = function () { var id = i.getAttribute('data-id'); if (i.getAttribute('data-ext') === '1') location.href = id; else DECK.goId(id); }; });
    });
    $$('.score').forEach(function (s) { if (QZ.answered) s.textContent = 'Quiz: ' + QZ.correct + ' of ' + QZ.answered + ' right on the first try'; });
  }

  /* ---- deck ---- */
  var DECK = window.DECK = { slides: [], i: 0 };
  var shell, prog, cnt, dots, chip, ovl;

  /* ---- auto-fit: shrink a slide's content so it never needs scrolling ---- */
  function fit(s) {
    s = s || DECK.slides[DECK.i]; if (!s) return;
    var inn = s.firstElementChild; if (!inn || !inn.classList.contains('in')) return;
    inn.style.zoom = 1;
    if (isMobile()) return;
    var cs = getComputedStyle(s), avail = s.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
    var z = 1;
    for (var k = 0; k < 5; k++) {
      var h = inn.getBoundingClientRect().height;
      if (h <= avail + 1) break;
      z = Math.max(0.5, z * (avail / h) * 0.985); inn.style.zoom = z;
    }
  }
  var fitT = null;
  function fitSoon() { clearTimeout(fitT); fitT = setTimeout(function () { fit(); }, 60); }
  DECK.fit = fit;

  function build() {
    var stage = $('.stage');
    var slides = $$('.slide', stage);
    $$('.code', stage).forEach(buildCode);
    $$('.mcq', stage).forEach(buildMcq);
    slides.forEach(function (s, idx) {
      s.classList.add(s.classList.contains('slow') ? 'slow' : 'fast');
      var inner = document.createElement('div'); inner.className = 'in';
      while (s.firstChild) inner.appendChild(s.firstChild);
      s.appendChild(inner);
      s._items = $$('.step, .walk li', s);
      s._n = 0;
      if (!s.getAttribute('data-title')) { var h = $('h2,h1', s); s.setAttribute('data-title', h ? h.textContent.trim() : 'Slide ' + (idx + 1)); }
    });
    DECK.slides = slides;

    shell = document.createElement('div'); shell.className = 'deck';
    var top = document.createElement('div'); top.className = 'dk-top';
    top.innerHTML = '<a class="logo" href="home.html">C++ <span>Classroom</span></a><span class="ttl">' + esc(document.body.getAttribute('data-lesson') || document.title) + '</span>' +
      '<button id="ov" title="All slides (O)">☰ Slides</button><button id="fa" title="Show every step at once (F)">⚡ Show all</button><button id="zm" title="Smaller">A−</button><button id="zp" title="Bigger">A+</button><button id="thm" title="Light/dark (T)">◑</button>';
    prog = document.createElement('div'); prog.className = 'dk-prog'; prog.innerHTML = '<i></i>';
    var bot = document.createElement('div'); bot.className = 'dk-bot';
    bot.innerHTML = '<button class="nav prev" id="pv" title="Back (←)">◀</button><span class="cnt"></span><span class="dots"></span><span class="hint">→ / Space = next &nbsp;·&nbsp; ← = back &nbsp;·&nbsp; O = overview &nbsp;·&nbsp; F = show all steps</span><span class="chip"></span><button class="nav" id="nx" title="Next (→)">▶</button>';
    stage.parentNode.insertBefore(shell, stage);
    shell.appendChild(top); shell.appendChild(prog); shell.appendChild(stage); shell.appendChild(bot);
    cnt = $('.cnt', bot); dots = $('.dots', bot); chip = $('.chip', bot);

    ovl = document.createElement('div'); ovl.className = 'overview';
    ovl.innerHTML = '<h3>All slides — click to jump</h3><div class="ov-grid">' + slides.map(function (s, k) {
      return '<div class="ov" data-k="' + k + '"><span class="n">' + (k + 1) + '</span>' + (s.classList.contains('slow') ? '🧠 ' : '⚡ ') + esc(s.getAttribute('data-title')) + '</div>';
    }).join('') + '</div>';
    document.body.appendChild(ovl);
    $$('.ov', ovl).forEach(function (o) { o.onclick = function () { toggleOv(false); go(parseInt(o.getAttribute('data-k'), 10), 1, true); }; });
    ovl.onclick = function (e) { if (e.target === ovl) toggleOv(false); };

    $('#ov').onclick = function () { toggleOv(); };
    $('#fa').onclick = toggleFast;
    $('#zm').onclick = function () { setZoom(zoom - .1); };
    $('#zp').onclick = function () { setZoom(zoom + .1); };
    $('#thm').onclick = toggleTheme;
    $('#pv').onclick = prev; $('#nx').onclick = next;

    stage.addEventListener('click', function (e) {
      if (e.target.closest('button,a,input,select,textarea,summary,details,.code,.mcq,.play,table,.overview')) return;
      if (isMobile()) return;
      var r = e.clientX / window.innerWidth; if (r < .18) prev(); else next();
    });
    var tx = null;
    var ty = null;
    stage.addEventListener('touchstart', function (e) { if (e.target.closest('.code pre, table, .play, input')) { tx = null; return; } tx = e.touches[0].clientX; ty = e.touches[0].clientY; }, { passive: true });
    stage.addEventListener('touchend', function (e) { if (tx === null) return; var d = e.changedTouches[0].clientX - tx, dy = e.changedTouches[0].clientY - ty; tx = null; if (Math.abs(d) > 70 && Math.abs(d) > Math.abs(dy) * 1.6) (d < 0 ? next : prev)(); });
    document.addEventListener('keydown', function (e) {
      if (/^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;
      var k = e.key;
      if (k === 'ArrowRight' || k === 'ArrowDown' || k === 'PageDown' || k === ' ' || k === 'Enter') { e.preventDefault(); next(); }
      else if (k === 'ArrowLeft' || k === 'ArrowUp' || k === 'PageUp' || k === 'Backspace') { e.preventDefault(); prev(); }
      else if (k === 'Home') go(0, 1, true); else if (k === 'End') go(slides.length - 1, 1, true);
      else if (k === 'o' || k === 'O' || k === 'Escape') toggleOv(k === 'Escape' ? false : undefined);
      else if (k === 'f' || k === 'F') toggleFast();
      else if (k === 't' || k === 'T') toggleTheme();
      else if (k === '+' || k === '=') setZoom(zoom + .1); else if (k === '-') setZoom(zoom - .1);
    });
    window.addEventListener('resize', fitSoon);
    stage.addEventListener('click', fitSoon);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitSoon);
    window.addEventListener('hashchange', function () { var h = location.hash.slice(1), n = parseInt(h, 10); if (isNaN(n)) { DECK.goId(h); return; } if (n && DECK.slides[n - 1] && n - 1 !== DECK.i) go(n - 1, 1, true); });

    var hh = location.hash.slice(1), start = parseInt(hh, 10), byId = hh && isNaN(start) ? slides.findIndex(function (x) { return x.id === hh; }) : -1;
    go(byId >= 0 ? byId : (start && slides[start - 1] ? start - 1 : 0), 1, true);
  }
  function toggleOv(on) { var s = on === undefined ? !ovl.classList.contains('on') : on; ovl.classList.toggle('on', s); $$('.ov', ovl).forEach(function (o) { o.classList.toggle('cur', parseInt(o.getAttribute('data-k'), 10) === DECK.i); }); }
  function toggleFast() {
    shell.classList.toggle('fastall'); var on = shell.classList.contains('fastall');
    $('#fa').textContent = on ? '🧠 Step by step' : '⚡ Show all';
    DECK.slides.forEach(function (s) { if (on) s._n = s._items.length; });
    applySteps(DECK.slides[DECK.i]);
  }
  function fastMode(s) { return shell.classList.contains('fastall') || s.classList.contains('fast'); }

  function applySteps(s) {
    var lastWalk = {};
    s._items.forEach(function (el, i) {
      var shown = i < s._n; el.classList.toggle('shown', shown);
      if (el.matches('.walk li')) { var w = el.parentNode; if (shown) lastWalk[0] = lastWalk[0] || []; }
    });
    $$('.walk', s).forEach(function (w) {
      var lis = $$('li', w), cur = null;
      lis.forEach(function (li) { li.classList.remove('cur'); if (li.classList.contains('shown')) cur = li; });
      if (cur) cur.classList.add('cur');
      var box = w.closest('.code'); if (box && box._setHot) box._setHot(cur ? cur.getAttribute('data-l') : null);
    });
    dots.innerHTML = '';
    if (!fastMode(s) && s._items.length) {
      for (var i = 0; i < s._items.length; i++) { var d = document.createElement('i'); if (i < s._n) d.className = 'on'; dots.appendChild(d); }
    }
  }
  function go(k, dir, jump) {
    k = Math.max(0, Math.min(DECK.slides.length - 1, k));
    var old = DECK.slides[DECK.i]; if (old) old.classList.remove('active', 'back');
    DECK.i = k; var s = DECK.slides[k];
    s.classList.add('active'); if (dir < 0) s.classList.add('back');
    s._n = (dir < 0 || fastMode(s)) ? s._items.length : 0;
    if (jump && !fastMode(s)) s._n = 0;
    s.scrollTop = 0;
    applySteps(s);
    cnt.textContent = (k + 1) + ' / ' + DECK.slides.length;
    prog.firstChild.style.width = ((k + 1) / DECK.slides.length * 100) + '%';
    var slow = s.classList.contains('slow');
    chip.className = 'chip ' + (slow ? 'slow' : 'fast');
    chip.textContent = slow ? '🧠 Take your time' : '⚡ Quick one';
    chip.style.visibility = s.classList.contains('cover') ? 'hidden' : 'visible';
    try { history.replaceState(null, '', '#' + (k + 1)); } catch (e) { }
    fillRevisit();
    fit(s); setTimeout(function () { fit(s); }, 120);
    if (s.classList.contains('cover') && !s.getAttribute('data-nocolor')) { /* cover uses gradient */ }
  }
  function revealIntoView(s) {
    if (!isMobile()) return;
    var el = s._items[s._n - 1]; if (!el) return;
    if (el.matches('.walk li')) el = el.closest('.code') || el;
    setTimeout(function () { try { el.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); } catch (e) { el.scrollIntoView(); } }, 60);
  }
  function next() {
    var s = DECK.slides[DECK.i];
    if (!fastMode(s) && s._n < s._items.length) { s._n++; applySteps(s); revealIntoView(s); return; }
    if (DECK.i < DECK.slides.length - 1) go(DECK.i + 1, 1);
  }
  function prev() {
    var s = DECK.slides[DECK.i];
    if (!fastMode(s) && s._n > 0) { s._n--; applySteps(s); return; }
    if (DECK.i > 0) go(DECK.i - 1, -1);
  }
  DECK.goId = function (id) { var k = DECK.slides.findIndex(function (s) { return s.id === id; }); if (k >= 0) go(k, 1, true); };

  document.addEventListener('DOMContentLoaded', build);
})();
