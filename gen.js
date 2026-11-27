/* Noise Smuggler - seeded puzzle generator (Adeba Studio). Browser + Node.
   Deterministic: same (difficulty, seed) always gives the same puzzle on every device,
   because it only uses attempt counts (never time) and a seeded PRNG. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./core.js'));
  else root.NSGen = factory(root.NSCore);
})(typeof self !== 'undefined' ? self : this, function (Core) {
  'use strict';
  var WORLD_IDS = ['hotel', 'palace', 'mansion', 'space', 'museum', 'camp', 'cinema', 'farm', 'park', 'tower'];
  var TITLES = {
    hotel: ['Late Checkout', 'Room Service', 'Wake-up Call', 'Lobby Echo'],
    palace: ['Royal Wake-up', 'Courtly Manners', 'Throne Room', 'Banquet Crasher'],
    mansion: ['Spooky Shortcut', 'Creaky Hallway', 'Seance Interrupted', 'Midnight Snore'],
    space: ['Quack Contact', 'Airlock Acoustics', 'Cargo Bay Nap', 'Zero-G Snooze'],
    museum: ['Exhibit Hush', 'Gallery Gossip', 'Priceless Snooze', 'After Hours'],
    camp: ['Campfire Quiet', 'Tent Row', 'Lake Echo', 'Sunrise Patrol'],
    cinema: ['Late Screening', 'Row Seven', 'Intermission', 'Final Reel'],
    farm: ['Barn Hush', 'Haystack Snooze', 'Early Bird', 'Milking Time'],
    park: ['Funhouse Floor', 'Midway Hush', 'Carousel Quiet', 'Big Top Snooze'],
    tower: ['Gear Room', 'Belfry Hush', 'Pendulum Pass', 'Twelve Strikes']
  };

  function rng(seed) { // mulberry32
    var a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function specFor(diff, r) {
    var pick = function (a, b) { return r() < 0.5 ? a : b; };
    switch (diff) {
      case 'easy': return { w: pick(5, 6), h: 6, k: pick(2, 3), walls: 2, z: pick(1, 2), minFlips: 2, maxSol: 2 };
      case 'medium': return { w: 6, h: 7, k: pick(3, 4), walls: 3, z: 2, extra: pick(0, 1), minFlips: 2, maxSol: 1 };
      case 'hard': { var x = r() < 0.5; return { w: 7, h: pick(7, 8), k: pick(4, 5), walls: 4, z: 3, x: x ? 1 : 0, t: x ? 2 : 1, extra: pick(1, 2), deep: pick(0, 1), minFlips: 2, maxSol: 1 }; }
      default: return { w: 7, h: 8, k: 5, walls: 4, z: 3, x: 1, t: 2, extra: 2, deep: pick(0, 1), portal: pick(0, 1), minFlips: 3, maxSol: 1 };
    }
  }

  function build(spec, r) {
    var w = spec.w, h = spec.h, DIRS = Core.DIRS, SL = [3, 2, 1, 0];
    for (var tries = 0; tries < 200; tries++) {
      var g = []; for (var yy = 0; yy < h; yy++) { var row = []; for (var xx = 0; xx < w; xx++) row.push('.'); g.push(row); }
      var inb = function (x, y) { return x >= 0 && y >= 0 && x < w && y < h; };
      var side = Math.floor(r() * 4), x, y, d, ch;
      if (side === 0) { x = 0; y = 1 + Math.floor(r() * (h - 2)); d = 0; ch = '>'; }
      else if (side === 1) { x = w - 1; y = 1 + Math.floor(r() * (h - 2)); d = 2; ch = '<'; }
      else if (side === 2) { x = 1 + Math.floor(r() * (w - 2)); y = 0; d = 1; ch = 'v'; }
      else { x = 1 + Math.floor(r() * (w - 2)); y = h - 1; d = 3; ch = '^'; }
      g[y][x] = ch;
      var path = {}, pdir = {}; path[x + ',' + y] = 1;
      var ok = true, placed = 0, portalDone = false;
      var walk = function (maxLen) {
        var n = 1 + Math.floor(r() * maxLen), moved = 0;
        for (var i = 0; i < n; i++) {
          var nx = x + DIRS[d][0], ny = y + DIRS[d][1];
          if (!inb(nx, ny) || path[nx + ',' + ny]) break;
          x = nx; y = ny; path[x + ',' + y] = 1; pdir[x + ',' + y] = d; moved++;
        }
        return moved;
      };
      while (placed < spec.k && ok) {
        if (walk(3) === 0) { ok = false; break; }
        var turns = r() < 0.5 ? [1, 3] : [3, 1], done = false;
        for (var ti = 0; ti < 2; ti++) {
          var nd = (d + turns[ti]) % 4, nx2 = x + DIRS[nd][0], ny2 = y + DIRS[nd][1];
          if (inb(nx2, ny2) && !path[nx2 + ',' + ny2]) { g[y][x] = (SL[d] === nd) ? 'm' : 'n'; d = nd; done = true; break; }
        }
        if (!done) { ok = false; break; }
        placed++;
        if (spec.portal && !portalDone && placed >= 1 && placed < spec.k) { // sound vanishes into one portal and re-emerges at the other, same direction
          if (walk(2) === 0) { ok = false; break; }
          var qs = [];
          for (var qy = 0; qy < h; qy++) for (var qx = 0; qx < w; qx++) {
            if (g[qy][qx] !== '.' || path[qx + ',' + qy]) continue;
            var fx = qx + DIRS[d][0], fy = qy + DIRS[d][1];
            if (inb(fx, fy) && !path[fx + ',' + fy] && g[fy][fx] === '.' && Math.abs(qx - x) + Math.abs(qy - y) >= 3) qs.push([qx, qy]);
          }
          if (!qs.length) { ok = false; break; }
          var qq = qs[Math.floor(r() * qs.length)];
          g[y][x] = 'p'; g[qq[1]][qq[0]] = 'p'; path[qq[0] + ',' + qq[1]] = 1; x = qq[0]; y = qq[1]; portalDone = true;
        }
      }
      if (!ok) continue;
      if (spec.portal && !portalDone) continue;
      if (spec.x) {
        if (walk(2) === 0) continue;
        g[y][x] = 'x';
        var okT = 0;
        for (var si = 0; si < 2; si++) {
          var sd = (d + (si ? 3 : 1)) % 4, cx = x, cy = y, len = 0, want = 1 + Math.floor(r() * 3);
          while (len < want) {
            var qx = cx + DIRS[sd][0], qy = cy + DIRS[sd][1];
            if (!inb(qx, qy) || path[qx + ',' + qy]) break;
            cx = qx; cy = qy; len++; pdir[cx + ',' + cy] = sd;
          }
          if (len > 0) { g[cy][cx] = 'T'; path[cx + ',' + cy] = 1; okT++; }
        }
        if (okT < 2) continue;
      } else {
        if (walk(3) === 0) continue;
        g[y][x] = 'T';
      }
      var free = [], near = [];
      for (var py = 0; py < h; py++) for (var px = 0; px < w; px++) {
        if (g[py][px] !== '.') continue;
        free.push([px, py]);
        var adj = false;
        for (var di = 0; di < 4; di++) if (path[(px + DIRS[di][0]) + ',' + (py + DIRS[di][1])]) adj = true;
        if (adj) near.push([px, py]);
      }
      var take = function (list) {
        while (list.length) {
          var i = Math.floor(r() * list.length), p = list.splice(i, 1)[0];
          if (g[p[1]][p[0]] === '.') return p;
        }
        return null;
      };
      for (var zi = 0; zi < (spec.z || 0); zi++) { var zp = take(r() < 0.65 ? near : free) || take(free); if (zp) g[zp[1]][zp[0]] = 'Z'; }
      for (var hi = 0; hi < (spec.deep || 0); hi++) { var hp = take(r() < 0.7 ? near : free) || take(free); if (hp) g[hp[1]][hp[0]] = 'H'; }
      if (spec.gates) { // one-way gates: half sit on the winning route (open in its direction), half are random blockers
        var onp = []; Object.keys(pdir).forEach(function (k2) { var q2 = k2.split(','); if (g[+q2[1]][+q2[0]] === '.') onp.push([+q2[0], +q2[1], pdir[k2]]); });
        var nOn = Math.ceil(spec.gates / 2);
        for (var gi = 0; gi < nOn && onp.length; gi++) { var gp = onp.splice(Math.floor(r() * onp.length), 1)[0]; g[gp[1]][gp[0]] = 'RDLU'.charAt(gp[2]); path[gp[0] + ',' + gp[1]] = 1; }
        for (gi = nOn; gi < spec.gates; gi++) { var rp = take(near.length && r() < 0.6 ? near : free) || take(free); if (rp) g[rp[1]][rp[0]] = 'RDLU'.charAt(Math.floor(r() * 4)); }
      }
      for (var wi = 0; wi < (spec.walls || 0); wi++) { var wp = take(free); if (wp) g[wp[1]][wp[0]] = '#'; }
      for (var ei = 0; ei < (spec.extra || 0); ei++) { var ep = take(r() < 0.7 ? near : free) || take(free); if (ep) g[ep[1]][ep[0]] = 'm'; }
      return g.map(function (rw) { return rw.map(function (c) { return (c === 'm' || c === 'n') ? (r() < 0.5 ? 'm' : 'n') : c; }).join(''); });
    }
    return null;
  }

  function accept(res, spec) {
    if (!res.best) return false;
    if (res.solutions.length > spec.maxSol) return false;
    var f = res.best.flips;
    if (f < spec.minFlips) return false;
    if (spec.k >= 3 && f > spec.k - 1) return false; // at least one mirror already correct
    if (res.best.usedMirrors < spec.k - (spec.k > 3 ? 1 : 0)) return false;
    if (res.best.turns < Math.min(spec.k, 3)) return false;
    if (spec.z > 0 && spec.k >= 3 && res.decoys < 1) return false;
    if (spec.portal && !res.best.portal) return false; // the winning sound must really use the portals
    if (spec.deep && !res.best.muffled) return false; // a deep sleeper must genuinely matter: the winning sound passes through it while still faint
    return true;
  }
  function score(res, r) { return res.best.turns * 1.5 - res.solutions.length * 4 + Math.min(res.decoys, 6) * 1.2 + r() * 4; }

  function hitTime(L, state) {
    var ev = Core.evaluate(L, state), t = 0;
    ev.trace.hits.forEach(function (h) { if (h.kind === 'T' && h.t > t) t = h.t; });
    return t;
  }

  /* Build one validated level from a spec. If spec.range is true, the sound range is chosen so that a
     longer "scenic" solution exists without the limit but only the short one survives with it. */
  function fromSpec(spec, seed) {
    var r = rng(seed), best = null, bestScore = -1e9, useRange = !!spec.range;
    var loose = {}; for (var k in spec) loose[k] = spec[k];
    if (useRange) { loose.maxSol = 4; loose.minFlips = 1; }
    for (var a = 0; a < (useRange ? 300000 : 40000); a++) {
      var grid = build(spec, r);
      if (!grid) continue;
      var L = Core.parse({ grid: grid }), res = Core.solve(L), cand = null;
      if (!useRange) {
        if (!accept(res, spec)) continue;
        if (spec.gates) { // gates must genuinely matter: without them the puzzle has more (or shorter) answers
          var plain = Core.solve(Core.parse({ grid: grid.map(function (rw) { return rw.replace(/[RDLU]/g, '.'); }) }));
          if (!(plain.solutions.length > res.solutions.length || (plain.best && plain.best.flips < res.best.flips))) continue;
        }
        cand = { grid: grid, range: 0, res: res };
      } else {
        if (res.solutions.length < 2) continue;
        var times = res.solutions.map(function (so) { return hitTime(L, so.state); }).sort(function (x, y) { return x - y; });
        if (times[1] === times[0]) continue;
        var range = times[0];
        var L2 = Core.parse({ grid: grid, range: range }), res2 = Core.solve(L2);
        if (!accept(res2, spec)) continue;
        cand = { grid: grid, range: range, res: res2 };
      }
      var sc = score(cand.res, r);
      if (sc > bestScore) { bestScore = sc; best = cand; }
      if (a > (useRange ? 20000 : 1500) && best) break;
    }
    if (!best) return null;
    return { grid: best.grid, range: best.range, par: best.res.best.flips, solution: best.res.best.state, solutions: best.res.solutions.length };
  }

  function attempt(diff, seed) {
    var r = rng(seed), spec = specFor(diff, r);
    return fromSpec(spec, (seed ^ 0x5bd1e995) >>> 0);
  }

  function generate(diff, seed) {
    for (var i = 0; i < 12; i++) {
      var s = (seed + i * 7919) >>> 0, lv = attempt(diff, s);
      if (lv) {
        var wr = rng(s ^ 0x9e3779b9), world = WORLD_IDS[Math.floor(wr() * WORLD_IDS.length)], titles = TITLES[world];
        lv.world = world; lv.title = titles[Math.floor(wr() * titles.length)]; lv.blurb = ''; lv.seed = s; lv.diff = diff;
        return lv;
      }
    }
    return null;
  }

  /* Daily puzzle: same date -> same puzzle everywhere. Difficulty follows the weekday. */
  var WEEK = ['hard', 'easy', 'easy', 'medium', 'medium', 'hard', 'hard']; // Sun..Sat
  function dailyKey(d) { d = d || new Date(); return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
  function dailyFor(key) {
    var parts = key.split('-').map(Number), dt = new Date(parts[0], parts[1] - 1, parts[2]);
    var seed = parts[0] * 10000 + parts[1] * 100 + parts[2];
    var lv = generate(WEEK[dt.getDay()], seed * 2654435761 >>> 0);
    if (lv) { lv.title = 'Daily ' + key; lv.daily = key; }
    return lv;
  }

  return { fromSpec: fromSpec, specFor: specFor, generate: generate, dailyFor: dailyFor, dailyKey: dailyKey, rng: rng };
});
