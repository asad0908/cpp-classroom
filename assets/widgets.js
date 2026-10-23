/* C++ Classroom — interactive widgets: token splitter, bit lab, expression evaluator, control-flow labs (ladder, loop tracer, switch, matrix) */
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

  /* ================= control-flow labs (lessons 10-15) ================= */
  function toInt(el, lo, hi, dflt) {
    var x = parseInt(el.value, 10);
    if (isNaN(x)) x = dflt;
    return Math.max(lo, Math.min(hi, x));
  }

  /* else-if ladder: which test wins for these marks? */
  var LADDER = [['marks >= 90', 90, 'A'], ['marks >= 75', 75, 'B'], ['marks >= 60', 60, 'C'], ['marks >= 35', 35, 'D']];
  function ladderRun(marks) {
    var rows = [], won = false, tests = 0;
    LADDER.forEach(function (r, i) {
      var label = (i ? 'else ' : '') + 'if (' + r[0] + ')  &rarr; Grade ' + r[2];
      if (won) { rows.push({ cls: 'd', label: label, st: 'never tested' }); return; }
      tests++;
      if (marks >= r[1]) { won = true; rows.push({ cls: 't', label: label, st: 'TRUE &mdash; run this, skip the rest' }); }
      else rows.push({ cls: 'f', label: label, st: 'false &mdash; go down a step' });
    });
    var elseLabel = 'else  &rarr; Grade F';
    if (won) rows.push({ cls: 'd', label: elseLabel, st: 'never reached' });
    else rows.push({ cls: 't', label: elseLabel, st: 'nothing above was true' });
    return { rows: rows, tests: tests, grade: won ? LADDER.filter(function (r) { return marks >= r[1]; })[0][2] : 'F' };
  }
  function ladderLab(el) {
    el.innerHTML = '<p><b>🪜 Ladder lab</b> &mdash; type marks (0&ndash;100). The tests run from the <u>top</u>; the <b>first true</b> one wins and the rest are never checked.</p>' +
      '<p>marks = <input type="number" class="m" min="0" max="100" value="82"></p><div class="rows"></div><p class="lab-note"></p>';
    var inp = $('.m', el), rows = $('.rows', el), note = $('.lab-note', el);
    function go() {
      var m = toInt(inp, 0, 100, 0), r = ladderRun(m);
      rows.innerHTML = r.rows.map(function (x) { return '<div class="lab-row ' + x.cls + '"><span class="lb">' + x.label + '</span><span class="st">' + x.st + '</span></div>'; }).join('');
      note.innerHTML = 'Grade = <b>' + r.grade + '</b> &nbsp;&middot;&nbsp; conditions tested: <b>' + r.tests + '</b>';
    }
    inp.oninput = go; go();
  }

  /* for-loop tracer */
  var CMP = { '<': function (a, b) { return a < b; }, '<=': function (a, b) { return a <= b; }, '>': function (a, b) { return a > b; }, '>=': function (a, b) { return a >= b; }, '!=': function (a, b) { return a !== b; } };
  var LOOP_CAP = 1000;
  function loopRun(start, op, limit, step) {
    var i = start, sum = 0, rows = [], n = 0;
    while (CMP[op](i, limit) && n < LOOP_CAP) {
      n++; sum += i;
      rows.push({ n: n, i: i, sum: sum });
      i += step;
    }
    return { rows: rows, rounds: n, sum: sum, last: i, infinite: n >= LOOP_CAP && CMP[op](i, limit) };
  }
  function loopLab(el) {
    var d = el.dataset || {};
    var a = d.a || 1, op = d.op || '<=', b = d.b || 10, s = d.s || 1;
    var opts = ['<', '<=', '>', '>=', '!='].map(function (o) { return '<option' + (o === op ? ' selected' : '') + '>' + esc(o) + '</option>'; }).join('');
    el.innerHTML = '<p><b>🔁 Loop lab</b> &mdash; change the three parts of the <code>for</code> header, then read the trace.</p>' +
      '<div class="lab-ctl">int sum = 0; &nbsp; for ( i = <input type="number" class="a" value="' + a + '"> ; i <select class="op">' + opts + '</select> <input type="number" class="b" value="' + b + '"> ; i += <input type="number" class="s" value="' + s + '"> ) &nbsp; sum = sum + i;</div>' +
      '<div class="tr-wrap"><table><tr><th class="c">Round</th><th class="c">i (at the test)</th><th class="c">Test is true?</th><th class="c">sum after the body</th></tr><tbody class="tb"></tbody></table></div><p class="lab-note"></p>';
    var A = $('.a', el), OP = $('.op', el), B = $('.b', el), S = $('.s', el), tb = $('.tb', el), note = $('.lab-note', el);
    function go() {
      var av = toInt(A, -999, 999, 0), bv = toInt(B, -999, 999, 0), sv = toInt(S, -99, 99, 0), o = OP.value;
      var r = loopRun(av, o, bv, sv), SHOW = 30, h = '';
      r.rows.slice(0, SHOW).forEach(function (x) { h += '<tr><td class="c">' + x.n + '</td><td class="c">' + x.i + ' ' + esc(o) + ' ' + bv + '</td><td class="c">true</td><td class="c">' + x.sum + '</td></tr>'; });
      if (r.rows.length > SHOW) h += '<tr><td class="c" colspan="4">&hellip; ' + (r.rows.length - SHOW) + ' more rounds &hellip;</td></tr>';
      if (r.infinite) h += '<tr><td class="c" colspan="4"><b class="lab-warn">still true &hellip; and it never becomes false</b></td></tr>';
      else h += '<tr><td class="c">&mdash;</td><td class="c">' + r.last + ' ' + esc(o) + ' ' + bv + '</td><td class="c"><b>false</b></td><td class="c">loop ends</td></tr>';
      tb.innerHTML = h;
      note.innerHTML = r.infinite
        ? '<span class="lab-warn">⚠ INFINITE LOOP: the condition was still true after ' + LOOP_CAP + ' rounds. i never reaches a value that makes it false.</span>'
        : 'The body ran <b>' + r.rounds + '</b> time' + (r.rounds === 1 ? '' : 's') + (r.rounds === 0 ? ' (the condition was false at the very first test)' : '') + ' &nbsp;&middot;&nbsp; final sum = <b>' + r.sum + '</b>';
    }
    [A, B, S].forEach(function (i) { i.oninput = go; }); OP.onchange = go; go();
  }

  /* switch: where does execution start, and where does it stop? */
  var SW_CASES = [[1, 'One'], [2, 'Two'], [3, 'Three']];
  function switchRun(n, withBreak) {
    var start = SW_CASES.length, k;
    for (k = 0; k < SW_CASES.length; k++) if (SW_CASES[k][0] === n) { start = k; break; }
    var ran = [], out = [];
    for (k = start; k <= SW_CASES.length; k++) {
      ran.push(k);
      out.push(k < SW_CASES.length ? SW_CASES[k][1] : 'Other');
      if (withBreak && k < SW_CASES.length) break;
    }
    return { ran: ran, out: out };
  }
  function switchLab(el) {
    el.innerHTML = '<p><b>🎛️ Switch lab</b> &mdash; pick a value for <code>n</code> and decide whether each case ends with <code>break</code>. The green lines are the ones that run.</p>' +
      '<div class="lab-ctl">n = <select class="n"><option>1</option><option>2</option><option>3</option><option value="4">4 (no matching case)</option></select> &nbsp; <label><input type="checkbox" class="brk" checked> write <code>break;</code> after each case</label></div>' +
      '<div class="rows"></div><p class="lab-note">Output:</p><div class="con"></div>';
    var N = $('.n', el), BR = $('.brk', el), rows = $('.rows', el), con = $('.con', el);
    function go() {
      var n = parseInt(N.value, 10), wb = BR.checked, r = switchRun(n, wb), h = '';
      h += '<div class="lab-row"><span class="lb">switch (n)  {</span></div>';
      SW_CASES.forEach(function (c, k) {
        h += '<div class="lab-row' + (r.ran.indexOf(k) >= 0 ? ' run' : '') + '"><span class="lb">case ' + c[0] + ': cout &lt;&lt; "' + c[1] + '\\n";' + (wb ? ' break;' : '') + '</span><span class="st">' + (r.ran.indexOf(k) >= 0 ? 'runs' : '') + '</span></div>';
      });
      h += '<div class="lab-row' + (r.ran.indexOf(3) >= 0 ? ' run' : '') + '"><span class="lb">default: cout &lt;&lt; "Other\\n";</span><span class="st">' + (r.ran.indexOf(3) >= 0 ? 'runs' : '') + '</span></div>';
      h += '<div class="lab-row"><span class="lb">}</span></div>';
      rows.innerHTML = h;
      con.textContent = r.out.join('\n');
    }
    N.onchange = go; BR.onchange = go; go();
  }

  /* nested loops: print a grid */
  function matrixRun(rows, cols, mode) {
    var lines = [], count = 0, total = 0, i, j, w;
    var maxv = mode === 'mul' ? rows * cols : mode === 'count' ? rows * cols : cols;
    w = String(maxv).length + 1;
    function pad(x) { var s = String(x); while (s.length < w) s = ' ' + s; return s; }
    for (i = 1; i <= rows; i++) {
      var line = '';
      for (j = 1; j <= cols; j++) {
        if (mode === 'tri' && j > i) break;
        count++; total++;
        line += pad(mode === 'j' || mode === 'tri' ? j : mode === 'count' ? count : i * j);
      }
      lines.push(line);
    }
    return { text: lines.join('\n'), inner: total };
  }
  function matrixLab(el) {
    el.innerHTML = '<p><b>🧮 Matrix lab</b> &mdash; the <u>outer</u> loop makes the rows, the <u>inner</u> loop makes the columns. Change the size and the pattern.</p>' +
      '<div class="lab-ctl">rows = <input type="number" class="r" min="1" max="9" value="3"> &nbsp; columns = <input type="number" class="c" min="1" max="9" value="4"> &nbsp; print <select class="p"><option value="j">j (the inner counter)</option><option value="count">a running count 1, 2, 3 &hellip;</option><option value="mul">i &times; j (multiplication table)</option><option value="tri">j, but only while j &le; i (triangle)</option></select></div>' +
      '<div class="con"></div><p class="lab-note"></p>';
    var R = $('.r', el), C = $('.c', el), P = $('.p', el), con = $('.con', el), note = $('.lab-note', el);
    function go() {
      var r = toInt(R, 1, 9, 1), c = toInt(C, 1, 9, 1), m = matrixRun(r, c, P.value);
      con.textContent = m.text;
      note.innerHTML = 'Outer loop: <b>' + r + '</b> rounds &nbsp;&middot;&nbsp; inner loop body ran <b>' + m.inner + '</b> times in total' + (P.value === 'tri' ? '' : ' (' + r + ' &times; ' + c + ')');
    }
    [R, C].forEach(function (i) { i.oninput = go; }); P.onchange = go; go();
  }

  window.__cppLabs = { ladderRun: ladderRun, loopRun: loopRun, switchRun: switchRun, matrixRun: matrixRun };

  function init() {
    $$('.tokdemo').forEach(tokDemo);
    $$('.bitplay').forEach(bitPlay);
    $$('.expreval').forEach(exprEval);
    $$('.ladderlab').forEach(ladderLab);
    $$('.looplab').forEach(loopLab);
    $$('.switchlab').forEach(switchLab);
    $$('.matrixlab').forEach(matrixLab);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
