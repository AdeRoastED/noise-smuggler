/* Noise Smuggler - core engine (Adeba Studio). Works in browser and Node. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.NSCore = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // Directions: 0=Right 1=Down 2=Left 3=Up (y grows downward)
  var DIRS = [[1, 0], [0, 1], [-1, 0], [0, -1]];
  var SLASH = [3, 2, 1, 0];  // '/' : R->U, D->L, L->D, U->R
  var BSLASH = [1, 0, 3, 2]; // '\' : R->D, D->R, L->U, U->L
  var SRC = { '>': 0, 'v': 1, '<': 2, '^': 3 };

  /*
   Level grid characters:
   .  empty floor        #  solid wall (stops sound)
   >v<^  sound source emitting in that direction
   T  target (must hear)  Z  sleeper (must NOT hear)
   /  \  fixed mirrors
   m  rotatable mirror starting as /     n  rotatable mirror starting as \
   x  splitter: sound leaves on both sides (turns left and right)
   p  portal (exactly two per level): sound entering one leaves the other, still travelling the same way
   H  deep sleeper: only wakes if sound arrives within L.heavy steps (default 4); later (faint) sound passes straight through without waking it
  */
  function parse(level) {
    var rows = level.grid, H = rows.length, W = rows[0].length;
    var L = {
      W: W, H: H, range: level.range || 99, heavy: level.heavy || 4, grid: [],
      sources: [], targets: [], sleepers: [], deep: [], portals: [], mirrors: [], init: []
    };
    for (var y = 0; y < H; y++) {
      var row = [];
      for (var x = 0; x < W; x++) {
        var ch = rows[y].charAt(x) || '.';
        var c = { t: ch, x: x, y: y, mi: -1 };
        if (ch in SRC) { c.t = 'S'; c.d = SRC[ch]; L.sources.push({ x: x, y: y, d: c.d }); }
        else if (ch === 'T') L.targets.push({ x: x, y: y });
        else if (ch === 'Z') L.sleepers.push({ x: x, y: y });
        else if (ch === 'H') L.deep.push({ x: x, y: y });
        else if (ch === 'p') L.portals.push({ x: x, y: y });
        else if (ch === 'm' || ch === 'n') {
          c.mi = L.mirrors.length;
          L.mirrors.push({ x: x, y: y });
          L.init.push(ch === 'n' ? 1 : 0);
        }
        row.push(c);
      }
      L.grid.push(row);
    }
    if (L.portals.length !== 2) L.portals.forEach(function (q) { L.grid[q.y][q.x].t = '.'; }), L.portals = []; // portals only work as a pair
    return L;
  }

  /* Follow the sound. state[i] is 0 ('/') or 1 ('\') for rotatable mirror i. */
  function trace(L, state) {
    var W = L.W, H = L.H, seen = {}, cells = [], hits = [];
    var hitSet = {};
    var beams = L.sources.map(function (s) { return { x: s.x, y: s.y, d: s.d }; });
    var t = 0;
    while (beams.length && t < L.range) {
      var next = [];
      for (var i = 0; i < beams.length; i++) {
        var b = beams[i];
        var nx = b.x + DIRS[b.d][0], ny = b.y + DIRS[b.d][1];
        if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
        var key = (ny * W + nx) * 4 + b.d;
        if (seen[key]) continue;
        seen[key] = 1;
        var c = L.grid[ny][nx];
        cells.push({ px: b.x, py: b.y, x: nx, y: ny, d: b.d, t: t + 1, c: c.t });
        var ct = c.t;
        if (ct === '#' || ct === 'S') continue;
        if (ct === 'H') { // deep sleeper: loud (near) sound wakes it, faint (far) sound is muffled
          var dk = ny * W + nx;
          if (t + 1 <= L.heavy) { if (!hitSet[dk]) { hitSet[dk] = 1; hits.push({ x: nx, y: ny, t: t + 1, kind: 'H' }); } continue; }
          if (!hitSet[dk]) { hitSet[dk] = 1; hits.push({ x: nx, y: ny, t: t + 1, kind: 'M' }); }
          next.push({ x: nx, y: ny, d: b.d }); // faint sound keeps going
          continue;
        }
        if (ct === 'T' || ct === 'Z') {
          var hk = ny * W + nx;
          if (!hitSet[hk]) { hitSet[hk] = 1; hits.push({ x: nx, y: ny, t: t + 1, kind: ct }); }
          continue;
        }
        if (ct === 'p') { // portal: re-emerge from the partner portal, same direction
          var pr = L.portals[0].x === nx && L.portals[0].y === ny ? L.portals[1] : L.portals[0];
          next.push({ x: pr.x, y: pr.y, d: b.d });
        } else if (ct === '/') next.push({ x: nx, y: ny, d: SLASH[b.d] });
        else if (ct === '\\') next.push({ x: nx, y: ny, d: BSLASH[b.d] });
        else if (ct === 'm' || ct === 'n') {
          next.push({ x: nx, y: ny, d: (state[c.mi] ? BSLASH : SLASH)[b.d] });
        } else if (ct === 'x') {
          next.push({ x: nx, y: ny, d: (b.d + 1) % 4 });
          next.push({ x: nx, y: ny, d: (b.d + 3) % 4 });
        } else next.push({ x: nx, y: ny, d: b.d });
      }
      beams = next; t++;
    }
    return { cells: cells, hits: hits, maxT: cells.length ? cells[cells.length - 1].t : 0 };
  }

  function evaluate(L, state) {
    var tr = trace(L, state);
    var heard = {}, woke = [];
    tr.hits.forEach(function (h) {
      if (h.kind === 'T') heard[h.x + ',' + h.y] = 1; else if (h.kind !== 'M') woke.push(h);
    });
    var missed = L.targets.filter(function (q) { return !heard[q.x + ',' + q.y]; });
    return { trace: tr, missed: missed, woke: woke, success: missed.length === 0 && woke.length === 0 };
  }

  function stateFromBits(n, k) { var s = []; for (var i = 0; i < k; i++) s.push((n >> i) & 1); return s; }

  /* Brute-force all mirror states. Mirrors the sound never touches do not matter, so solutions are
     counted by the settings of the mirrors that ARE touched; untouched mirrors stay as they start. */
  function solve(L, from) {
    var k = L.mirrors.length, total = 1 << k, byKey = {}, decoys = 0;
    from = from || L.init;
    for (var n = 0; n < total; n++) {
      var st = stateFromBits(n, k), ev = evaluate(L, st);
      if (!ev.success) { if (ev.woke.length > 0) decoys++; continue; }
      var usedMap = {};
      ev.trace.cells.forEach(function (c) { if (c.c === 'm' || c.c === 'n') usedMap[L.grid[c.y][c.x].mi] = 1; });
      var used = Object.keys(usedMap).map(Number).sort(function (a, b) { return a - b; });
      var key = used.map(function (i) { return i + ':' + st[i]; }).join(',');
      if (byKey[key]) continue;
      var canon = from.slice(), flips = 0;
      used.forEach(function (i) { canon[i] = st[i]; if (st[i] !== from[i]) flips++; });
      byKey[key] = { state: canon, flips: flips, usedMirrors: used.length, turns: countTurns(ev.trace), portal: ev.trace.cells.some(function (c) { return c.c === 'p'; }), muffled: ev.trace.hits.some(function (h) { return h.kind === 'M'; }) };
    }
    var sols = Object.keys(byKey).map(function (k2) { return byKey[k2]; });
    sols.sort(function (a, b) { return a.flips - b.flips; });
    return { solutions: sols, decoys: decoys, best: sols[0] || null };
  }

  function countTurns(tr) {
    var turns = 0;
    tr.cells.forEach(function (c) { if (c.c === 'm' || c.c === 'n' || c.c === '/' || c.c === '\\' || c.c === 'x') turns++; });
    return turns;
  }

  function flipsBetween(a, b) { var f = 0; for (var i = 0; i < a.length; i++) if (a[i] !== b[i]) f++; return f; }

  return { DIRS: DIRS, parse: parse, trace: trace, evaluate: evaluate, solve: solve, flipsBetween: flipsBetween, stateFromBits: stateFromBits };
});
