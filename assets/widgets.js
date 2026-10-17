/* C++ Classroom — interactive widgets: token splitter, bit lab, expression evaluator */
(function () {
  'use strict';
  var esc = function (s) { return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); };
  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }

  /* ================= token splitter ================= */
  var KEYWORDS = /^(auto|break|case|catch|class|const|continue|default|delete|do|else|enum|extern|for|friend|goto|if|inline|namespace|new|operator|private|protected|public|register|return|sizeof|static|struct|switch|template|this|throw|try|typedef|using|virtual|while|int|char|float|double|void|bool|long|short|signed|unsigned)$/;
  function tokenize(s) {
    var re = /\s*("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])+'|[A-Za-z_]\w*|\d+\.\d*(?:[eE][+-]?\d+)?[fFlL]?|\d*\.\d+[fFlL]?|0[xX][0-9a-fA-F]+|\d+[uUlL]*|<<=|>>=|<<|>>|<=|>=|==|!=|&&|\|\||\+\+|--|::|\+=|-=|\*=|\/=|%=|&=|\|=|\^=|->|[-+*\/%=<>!&|^~?:.]|[;,(){}\[\]#])/g;
    var out = [], m; while ((m = re.exec(s))) out.push(m[1]); return out;
  }
  function classify(t) {
    if (/^["']/.test(t) || /^[\d.]/.test(t) || /^(true|false)$/.test(t)) return ['tk-lit', 'literal'];
    if (KEYWORDS.test(t)) return ['tk-kw', 'keyword'];
    if (/^[A-Za-z_]/.test(t)) return ['tk-id', 'identifier'];
    if (/^[;,(){}\[\]#]$/.test(t)) return ['tk-pu', 'punctuator'];
    return ['tk-op', 'operator'];
  }
  function tokDemo(el) {
    el.innerHTML = '<p><b>\uD83D\uDD2C Token splitter</b> &mdash; type any C++ line and watch the compiler cut it up.</p><input type="text" value="int total = marks + 5;" spellcheck="false"><div class="res" style="margin-top:.6rem;height:5.5rem"></div><p class="cnt" style="font-weight:800;font-size:1.05rem;margin:.2rem 0"></p>' +
      '<div><span class="tok tk-kw">keyword</span><span class="tok tk-id">identifier</span><span class="tok tk-lit">literal</span><span class="tok tk-op">operator</span><span class="tok tk-pu">punctuator</span></div>';
    var inp = $('input', el), res = $('.res', el), cnt = $('.cnt', el);
    function go() {
      var t = tokenize(inp.value);
      res.innerHTML = t.map(function (x) { var c = classify(x); return '<span class="tok ' + c[0] + '">' + esc(x) + '<small>' + c[1] + '</small></span>'; }).join('');
      cnt.textContent = 'Total tokens: ' + t.length;
    }
    inp.oninput = go; go();
  }

  /* ================= bit lab ================= */
  function bin(n, w) { var s = ''; for (var i = w - 1; i >= 0; i--) { var b = (n >> i) & 1; s += '<span class="' + (b ? 'on' : 'off') + '">' + b + '</span>'; } return s; }
  function bitPlay(el) {
    el.innerHTML = '<p><b>\uD83E\uDDEA Bit lab</b> &mdash; change the numbers (0&ndash;255) and watch every bitwise operator work.</p>' +
      '<p>a = <input type="number" class="a" min="0" max="255" value="12"> &nbsp; b = <input type="number" class="b" min="0" max="255" value="10"> &nbsp; shift by <input type="number" class="k" min="0" max="7" value="2"></p><div class="res bits"></div>';
    var A = $('.a', el), B = $('.b', el), K = $('.k', el), R = $('.res', el);
    function v(i, mx) { var x = parseInt(i.value, 10); if (isNaN(x)) x = 0; return Math.max(0, Math.min(mx, x)); }
    function go() {
      var a = v(A, 255), b = v(B, 255), k = v(K, 7);
      var rows = [
        ['a', bin(a, 8), a], ['b', bin(b, 8), b],
        ['a &amp; b', bin(a & b, 8), a & b], ['a | b', bin(a | b, 8), a | b], ['a ^ b', bin(a ^ b, 8), a ^ b],
        ['~a <small>(low 8 bits)</small>', bin(~a & 255, 8), (~a) + ' &nbsp;= &minus;(a+1)'],
        ['a &lt;&lt; k', bin(a << k, 16), a << k], ['a &gt;&gt; k', bin(a >> k, 16), a >> k]
      ];
      R.innerHTML = '<table><tr><th>Expression</th><th>Binary</th><th>Decimal</th></tr>' + rows.map(function (r) { return '<tr><td>' + r[0] + '</td><td>' + r[1] + '</td><td>' + r[2] + '</td></tr>'; }).join('') + '</table>';
    }
    [A, B, K].forEach(function (i) { i.oninput = go; }); go();
  }

  /* ================= expression evaluator ================= */
  var LEVEL = { '!': 2, '~': 2, 'u+': 2, 'u-': 2, '*': 3, '/': 3, '%': 3, '+': 4, '-': 4, '<<': 5, '>>': 5, '<': 6, '<=': 6, '>': 6, '>=': 6, '==': 7, '!=': 7, '&': 8, '^': 9, '|': 10, '&&': 11, '||': 12, '?:': 13 };
  var BIN_PREC = { '*': 13, '/': 13, '%': 13, '+': 12, '-': 12, '<<': 11, '>>': 11, '<': 10, '<=': 10, '>': 10, '>=': 10, '==': 9, '!=': 9, '&': 8, '^': 7, '|': 6, '&&': 5, '||': 4 };

  function lex(s) {
    var re = /\s*(0[xX][0-9a-fA-F]+|\d+|[A-Za-z_]\w*|<<|>>|<=|>=|==|!=|&&|\|\||[-+*\/%<>&^|!~?:()])/y, out = [], pos = 0, m;
    s = s.trim();
    if (/\+\+|--/.test(s)) throw new Error('++ and -- change variables, so the solver does not handle them. Trace them by hand (Lesson 5): pre = change then use, post = use then change.');
    if (/(^|[^=!<>])=($|[^=])/.test(s)) throw new Error('Assignment (=) is not supported here. Use == to compare, or type just the calculation.');
    while (pos < s.length) { re.lastIndex = pos; m = re.exec(s); if (!m) throw new Error('Unexpected character "' + s.charAt(pos) + '"'); out.push(m[1]); pos = re.lastIndex; while (/\s/.test(s.charAt(pos))) pos++; }
    return out;
  }
  function parse(tokens) {
    var p = 0;
    function peek() { return tokens[p]; }
    function eat(t) { if (tokens[p] !== t) throw new Error('Expected "' + t + '"'); p++; }
    function primary() {
      var t = tokens[p];
      if (t === undefined) throw new Error('Expression ended too early');
      if (t === '(') { p++; var e = ternary(); eat(')'); return { t: 'par', a: e }; }
      if (/^(0[xX][0-9a-fA-F]+|\d+)$/.test(t)) { p++; return { t: 'num', v: parseInt(t, /^0[xX]/.test(t) ? 16 : 10) | 0 }; }
      if (/^[A-Za-z_]/.test(t)) { p++; return { t: 'var', n: t }; }
      throw new Error('Unexpected "' + t + '"');
    }
    function unary() {
      var t = tokens[p];
      if (t === '!' || t === '~' || t === '-' || t === '+') { p++; return { t: 'un', op: (t === '-' || t === '+') ? 'u' + t : t, a: unary() }; }
      return primary();
    }
    function bin(min) {
      var left = unary();
      for (;;) {
        var op = tokens[p], pr = BIN_PREC[op];
        if (pr === undefined || pr < min) break;
        p++; var right = bin(pr + 1);
        left = { t: 'bin', op: op, a: left, b: right };
      }
      return left;
    }
    function ternary() {
      var c = bin(4);
      if (peek() === '?') { p++; var a = ternary(); eat(':'); var b = ternary(); return { t: 'tern', c: c, a: a, b: b }; }
      return c;
    }
    var e = ternary(); if (p < tokens.length) throw new Error('Unexpected "' + tokens[p] + '"'); return e;
  }
  function strip(n) { if (n.t === 'par') return strip(n.a); if (n.t === 'un') return { t: 'un', op: n.op, a: strip(n.a) }; if (n.t === 'bin') return { t: 'bin', op: n.op, a: strip(n.a), b: strip(n.b) }; if (n.t === 'tern') return { t: 'tern', c: strip(n.c), a: strip(n.a), b: strip(n.b) }; return n; }
  function num(v, hot) { return { t: 'num', v: v | 0, hot: !!hot }; }
  function cool(n) { // remove hot flags
    if (n.t === 'num') return num(n.v, false);
    if (n.t === 'var') return n;
    if (n.t === 'un') return { t: 'un', op: n.op, a: cool(n.a) };
    if (n.t === 'bin') return { t: 'bin', op: n.op, a: cool(n.a), b: cool(n.b) };
    return { t: 'tern', c: cool(n.c), a: cool(n.a), b: cool(n.b) };
  }
  function opName(op) { return op === 'u-' ? '\u2212' : op === 'u+' ? '+' : op; }
  function show(n, top) {
    if (n.t === 'num') { var s = String(n.v); return n.hot ? '<mark>' + s + '</mark>' : s; }
    if (n.t === 'var') return n.n;
    if (n.t === 'un') { var inner = show(n.a, false); return esc(opName(n.op)) + inner; }
    if (n.t === 'bin') { var s2 = show(n.a, false) + ' ' + esc(n.op) + ' ' + show(n.b, false); return top ? s2 : '(' + s2 + ')'; }
    var s3 = show(n.c, false) + ' ? ' + show(n.a, false) + ' : ' + show(n.b, false); return top ? s3 : '(' + s3 + ')';
  }
  function hasVar(n) { return n.t === 'var' || (n.t === 'un' && hasVar(n.a)) || (n.t === 'bin' && (hasVar(n.a) || hasVar(n.b))) || (n.t === 'tern' && (hasVar(n.c) || hasVar(n.a) || hasVar(n.b))); }
  function subst(n, vars) {
    if (n.t === 'var') { if (!(n.n in vars)) throw new Error('Variable "' + n.n + '" has no value \u2014 add it above, e.g. ' + n.n + '=5'); return num(vars[n.n], true); }
    if (n.t === 'un') return { t: 'un', op: n.op, a: subst(n.a, vars) };
    if (n.t === 'bin') return { t: 'bin', op: n.op, a: subst(n.a, vars), b: subst(n.b, vars) };
    if (n.t === 'tern') return { t: 'tern', c: subst(n.c, vars), a: subst(n.a, vars), b: subst(n.b, vars) };
    return n;
  }
  function apply(op, a, b) {
    switch (op) {
      case '*': return Math.imul(a, b);
      case '/': if (b === 0) throw new Error('Division by zero! (a real program would crash)'); return Math.trunc(a / b) | 0;
      case '%': if (b === 0) throw new Error('Modulus by zero! (a real program would crash)'); return (a % b) | 0;
      case '+': return (a + b) | 0; case '-': return (a - b) | 0;
      case '<<': return a << b; case '>>': return a >> b;
      case '<': return +(a < b); case '<=': return +(a <= b); case '>': return +(a > b); case '>=': return +(a >= b);
      case '==': return +(a === b); case '!=': return +(a !== b);
      case '&': return a & b; case '^': return a ^ b; case '|': return a | b;
    }
  }
  var note = '';
  // returns a new tree with exactly one reduction done, or null if already a number
  function step(n) {
    if (n.t === 'num') return null;
    if (n.t === 'un') {
      if (n.a.t !== 'num') { return { t: 'un', op: n.op, a: step(n.a) }; }
      var v = n.a.v, r = n.op === '!' ? +(v === 0) : n.op === '~' ? ~v : n.op === 'u-' ? -v : v;
      note = 'unary ' + opName(n.op) + ' (level 2) \u2192 ' + opName(n.op) + v + ' = ' + r;
      return num(r, true);
    }
    if (n.t === 'bin') {
      if (n.op === '&&' || n.op === '||') {
        if (n.a.t !== 'num') return { t: 'bin', op: n.op, a: step(n.a), b: n.b };
        var and = n.op === '&&';
        if (and ? n.a.v === 0 : n.a.v !== 0) { note = n.op + ' short-circuit: left side is ' + (and ? 'false' : 'true') + ', so the right side is NEVER evaluated'; return num(and ? 0 : 1, true); }
        if (n.b.t !== 'num') return { t: 'bin', op: n.op, a: n.a, b: step(n.b) };
        note = n.op + ' (level ' + LEVEL[n.op] + ') \u2192 ' + n.a.v + ' ' + n.op + ' ' + n.b.v + ' = ' + (n.b.v !== 0 ? 1 : 0);
        return num(n.b.v !== 0 ? 1 : 0, true);
      }
      if (n.a.t !== 'num') return { t: 'bin', op: n.op, a: step(n.a), b: n.b };
      if (n.b.t !== 'num') return { t: 'bin', op: n.op, a: n.a, b: step(n.b) };
      var res = apply(n.op, n.a.v, n.b.v);
      note = n.op + ' (level ' + LEVEL[n.op] + ') \u2192 ' + n.a.v + ' ' + n.op + ' ' + n.b.v + ' = ' + res;
      return num(res, true);
    }
    if (n.c.t !== 'num') return { t: 'tern', c: step(n.c), a: n.a, b: n.b };
    note = '?: (level 13): condition is ' + (n.c.v ? 'true \u2192 take the first value' : 'false \u2192 take the second value') + '; the other side is never evaluated';
    return cool(n.c.v ? n.a : n.b);
  }
  function parseVars(s) {
    var vars = {}, re = /([A-Za-z_]\w*)\s*=\s*(-?\d+)/g, m; while ((m = re.exec(s))) vars[m[1]] = parseInt(m[2], 10) | 0; return vars;
  }
  function exprEval(el) {
    var presets = ['2 + 3 * 4', '10 - 4 - 3', '8 / 2 * 3', 'a + b * c > 10 && !0', '1 << 2 + 1', 'a > b ? a : b', '5 & 3 | 4 ^ 1', '!a || b && c', '7 > 3 > 1', '-a * -b'];
    el.innerHTML = '<p><b>\uD83E\uDDEE Expression solver</b> &mdash; type an expression; it solves it <u>one operator at a time</u>, in the exact order C++ does.</p>' +
      '<input type="text" class="ex" value="a + b * c > 10 &amp;&amp; !0" spellcheck="false">' +
      '<p style="margin:.4rem 0">Values: <input type="text" class="vars" value="a=5, b=3, c=2" spellcheck="false" style="width:14rem"> &nbsp;<span class="mute" style="font-size:.75rem">(supports + - * / % &lt;&lt; &gt;&gt; &lt; &gt; &lt;= &gt;= == != &amp; ^ | &amp;&amp; || ! ~ ?: and brackets)</span></p>' +
      '<div class="pre" style="margin-bottom:.4rem"></div><div class="evs"></div>';
    var ex = $('.ex', el), vs = $('.vars', el), out = $('.evs', el), pre = $('.pre', el);
    pre.innerHTML = presets.map(function (p, i) { return '<span class="item tok tk-id" style="cursor:pointer" data-i="' + i + '">' + esc(p) + '</span>'; }).join('');
    $$('.item', pre).forEach(function (b) { b.onclick = function () { ex.value = presets[parseInt(b.getAttribute('data-i'), 10)]; go(); }; });
    function go() {
      var h = '';
      try {
        var tree = strip(parse(lex(ex.value))), vars = parseVars(vs.value);
        h += '<div class="row">Expression: <b>' + esc(ex.value.trim()) + '</b></div>';
        h += '<div class="row">\uD83D\uDCE6 Brackets added by precedence &amp; associativity: <b>' + show(tree, true) + '</b></div>';
        var cur = tree, k = 1, guard = 0;
        if (hasVar(cur)) { cur = subst(cur, vars); h += '<div class="row">Step ' + (k++) + ': ' + show(cur, true) + '<small>replace the variables by their values</small></div>'; }
        while (cur.t !== 'num' && guard++ < 60) {
          cur = cool(cur); var nxt = step(cur); cur = nxt;
          h += '<div class="row">Step ' + (k++) + ': ' + show(cur, true) + '<small>' + esc(note) + '</small></div>';
        }
        h += '<div class="row" style="background:var(--ok-bg)">\u2705 Answer: <b>' + cur.v + '</b>' + (cur.v === 0 ? ' <small>(false)</small>' : '') + '</div>';
      } catch (err) { h = '<div class="row err">\u26A0 ' + esc(err.message) + '</div>'; }
      out.innerHTML = h;
    }
    ex.oninput = go; vs.oninput = go; go();
  }

  window.__cppSolve = function (e, v) { var t = strip(parse(lex(e))), vars = parseVars(v || ''), cur = t, k = 0, o = [show(t, true)]; if (hasVar(cur)) { cur = subst(cur, vars); o.push(show(cur, true)); } while (cur.t !== 'num' && k++ < 60) { cur = step(cool(cur)); o.push(show(cur, true).replace(/<\/?mark>/g, '') + '   [' + note + ']'); } return o; };

  function init() {
    $$('.tokdemo').forEach(tokDemo);
    $$('.bitplay').forEach(bitPlay);
    $$('.expreval').forEach(exprEval);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
