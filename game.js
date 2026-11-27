/* Noise Smuggler - game (Adeba Studio). All art is drawn in code; all sound is synthesised. */
(function () {
  'use strict';
  var Core = window.NSCore, LEVELS = window.NS_LEVELS, WORLDS = window.NS_WORLDS;
  var TAU = Math.PI * 2;

  /* ---------- save ---------- */
  var KEY = 'adeba.noisesmuggler.v1';
  var save = { stars: {}, muted: false, vol: 0.8, vib: true, music: true, skin: 'default', daily: {}, stats: { endless: 0 } };
  function applySave(p) { // validate everything: a corrupted, hand-edited or imported save must never break the game
      if (p && typeof p === 'object') {
        if (p.stars && typeof p.stars === 'object') Object.keys(p.stars).forEach(function (k) { var v = p.stars[k]; if (/^\d+$/.test(k) && v >= 1 && v <= 3) save.stars[k] = v | 0; });
        if (typeof p.muted === 'boolean') save.muted = p.muted;
        if (typeof p.vol === 'number' && p.vol >= 0 && p.vol <= 1) save.vol = p.vol;
        if (typeof p.reduce === 'boolean') save.reduce = p.reduce;
        if (typeof p.vib === 'boolean') save.vib = p.vib;
        if (typeof p.music === 'boolean') save.music = p.music;
        if (typeof p.skin === 'string' && /^[a-z]{2,12}$/.test(p.skin)) save.skin = p.skin;
        if (p.daily && typeof p.daily === 'object') Object.keys(p.daily).forEach(function (k) { var v = p.daily[k]; if (/^\d{4}-\d{2}-\d{2}$/.test(k) && v && v.stars >= 1 && v.stars <= 3 && v.taps > 0) save.daily[k] = { stars: v.stars | 0, taps: v.taps | 0 }; });
        if (typeof p.draft === 'string' && /^7\.[a-m]{56}$/.test(p.draft)) save.draft = p.draft;
        if (p.stats && p.stats.endless > 0) save.stats.endless = p.stats.endless | 0;
      }
  }
  try { var raw = localStorage.getItem(KEY); if (raw) applySave(JSON.parse(raw)); } catch (e) {}
  function totalStars() { var n = 0; Object.keys(save.stars).forEach(function (k) { n += save.stars[k]; }); return n; }
  function activeWave() {
    var w = WAVES.filter(function (x) { return x.id === save.skin; })[0] || WAVES[0];
    return totalStars() >= w.need ? w : WAVES[0];
  }
  function buzz(p) { if (save.vib !== false && !reduced() && navigator.vibrate) { try { navigator.vibrate(p); } catch (e) {} } }
  function persist() { try { localStorage.setItem(KEY, JSON.stringify(save)); } catch (e) {} }
  var mql = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
  function reduced() { return save.reduce !== undefined ? save.reduce : !!(mql && mql.matches); }
  var TESTING = /[?&]test=1/.test(location.search);
  var UNLOCK_ALL = /[?&]unlock=1/.test(location.search);

  /* ---------- themes ---------- */
  var THEME = {
    hotel:   { a: '#3b3057', b: '#43365f', wall: '#16111f', wallHi: '#2c2340', wave: '#7ff3e0', hat: '#c0392b', suit: '#274b8a', name: 'manager' },
    palace:  { a: '#4a2b3d', b: '#53314a', wall: '#1d1018', wallHi: '#3a2030', wave: '#ffd45e', hat: '#ffcf5a', suit: '#7a1f3d', name: 'king' },
    mansion: { a: '#2a3a3f', b: '#304249', wall: '#0f1719', wallHi: '#22333a', wave: '#a6ff8a', hat: '#44546a', suit: '#5a6b7c', name: 'guard' },
    space:   { a: '#2b2f5a', b: '#323768', wall: '#12142b', wallHi: '#262b57', wave: '#ff9de6', hat: '#cfe9ff', suit: '#e9edf7', name: 'captain' },
    museum:  { a: '#3d3a4f', b: '#454259', wall: '#17151f', wallHi: '#2e2b40', wave: '#ffb86b', hat: '#8a5a2b', suit: '#6b4a8a', name: 'curator' },
    camp:    { a: '#25402f', b: '#2b4a37', wall: '#0e1a13', wallHi: '#1f3a2a', wave: '#ffe08a', hat: '#2f6b3a', suit: '#3f7a4a', name: 'ranger' },
    cinema:  { a: '#4a2330', b: '#552938', wall: '#1a0d12', wallHi: '#37171f', wave: '#ff7a7a', hat: '#e0b040', suit: '#8a1f2f', name: 'projectionist' },
    farm:    { a: '#4a3f26', b: '#52472c', wall: '#1b160b', wallHi: '#3a3119', wave: '#fff3a0', hat: '#d9b24c', suit: '#a8442f', name: 'farmer' },
    tower:   { a: '#2b2a3a', b: '#33324a', wall: '#100f1a', wallHi: '#26253a', wave: '#ffe08a', hat: '#b08a3a', suit: '#4a4a66', name: 'clockmaster' },
    park:    { a: '#40224a', b: '#4a2a55', wall: '#180d1d', wallHi: '#33193f', wave: '#7ff3e0', hat: '#e0407a', suit: '#2a8a5f', name: 'ringmaster' }
  };
  THEME.hotel.bg = '#1d1733'; THEME.palace.bg = '#25141f'; THEME.mansion.bg = '#101b1f'; THEME.space.bg = '#12142b'; THEME.museum.bg = '#1a1824'; THEME.camp.bg = '#0f1d15'; THEME.cinema.bg = '#1d0e14'; THEME.farm.bg = '#1c1a0e'; THEME.park.bg = '#1d0f22'; THEME.tower.bg = '#13121d';
  var BASE_BG = '#1c1630';
  var WAVES = [
    { id: 'default', name: 'Classic', need: 0 },
    { id: 'neon', name: 'Neon pink', need: 6, col: '#ff4fd8' },
    { id: 'gold', name: 'Golden', need: 15, col: '#ffd23f' },
    { id: 'ice', name: 'Ice', need: 30, col: '#aee9ff' },
    { id: 'rainbow', name: 'Rainbow', need: 45 }
  ];
  var SLEEPER_SUITS = ['#e0836b', '#6bb0e0', '#9be06b', '#d98be0', '#e0c46b'];
  var SKINS = ['#f3cba8', '#d9a17b', '#a8714c', '#f7dcc6', '#7d4e33'];
  var NAMES = ['Gary', 'Brenda', 'Mo', 'Priya', 'Sven', 'Dolores', 'Kai', 'Nana'];

  /* ---------- audio ---------- */
  var AC = null, master = null, noiseBuf = null;
  function ac() {
    if (!AC) {
      try {
        AC = new (window.AudioContext || window.webkitAudioContext)();
        master = AC.createGain(); master.gain.value = 0.7 * save.vol; master.connect(AC.destination);
        noiseBuf = AC.createBuffer(1, AC.sampleRate, AC.sampleRate);
        var d = noiseBuf.getChannelData(0); for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      } catch (e) { AC = null; }
    }
    if (AC && !mus.timer) mus.timer = setInterval(musicTick, 200);
    if (AC && AC.state === 'suspended') AC.resume();
    return AC;
  }
  function setVolume() { if (master) master.gain.value = 0.7 * save.vol; }
  function tone(f, d, type, vol, slide, delay) {
    if (save.muted) return; var a = ac(); if (!a) return;
    var t = a.currentTime + (delay || 0), o = a.createOscillator(), g = a.createGain();
    o.type = type || 'sine'; o.frequency.setValueAtTime(f, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, slide), t + d);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol || 0.15, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    o.connect(g); g.connect(master); o.start(t); o.stop(t + d + 0.03);
  }
  function noise(d, vol, freq, delay) {
    if (save.muted) return; var a = ac(); if (!a || !noiseBuf) return;
    var t = a.currentTime + (delay || 0), s = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain();
    s.buffer = noiseBuf; f.type = 'bandpass'; f.frequency.value = freq || 400; f.Q.value = 1.2;
    g.gain.setValueAtTime(vol || 0.1, t); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    s.connect(f); f.connect(g); g.connect(master); s.start(t); s.stop(t + d + 0.03);
  }
  var SFX = {
    flip: function () { tone(280, 0.09, 'triangle', 0.2, 720); },
    alarm: function () { for (var i = 0; i < 5; i++) tone(1180, 0.07, 'square', 0.07, null, i * 0.12); },
    fart: function () { for (var i = 0; i < 7; i++) tone(135 - i * 9, 0.075, 'sawtooth', 0.14, null, i * 0.065); noise(0.5, 0.07, 260); },
    scream: function () { tone(520, 0.75, 'sawtooth', 0.1, 1500); tone(790, 0.75, 'sine', 0.09, 2100, 0.03); },
    sneeze: function () { noise(0.12, 0.05, 1800); tone(900, 0.28, 'sawtooth', 0.1, 260, 0.12); noise(0.3, 0.08, 900); },
    bark: function () { tone(330, 0.1, 'sawtooth', 0.14, 180); tone(300, 0.12, 'sawtooth', 0.14, 160, 0.18); },
    rooster: function () { tone(520, 0.12, 'sawtooth', 0.12, 760); tone(780, 0.14, 'sawtooth', 0.12, 1050, 0.13); tone(700, 0.5, 'sawtooth', 0.11, 420, 0.3); },
    horn: function () { tone(320, 0.16, 'square', 0.1, 300); tone(260, 0.24, 'square', 0.1, 230, 0.18); },
    portal: function () { tone(500, 0.18, 'sine', 0.09, 1100); },
    muffle: function () { tone(240, 0.14, 'sine', 0.06, 150); },
    doorbell: function () { tone(880, 0.35, 'sine', 0.14); tone(660, 0.5, 'sine', 0.14, null, 0.3); },
    duck: function () { tone(430, 0.13, 'sawtooth', 0.12, 300); tone(410, 0.14, 'sawtooth', 0.12, 280, 0.19); },
    wake: function () { tone(700, 0.08, 'square', 0.1); tone(930, 0.1, 'square', 0.1, null, 0.08); },
    oops: function () { tone(420, 0.55, 'sawtooth', 0.12, 90); },
    yay: function () { tone(660, 0.1, 'triangle', 0.16); tone(880, 0.16, 'triangle', 0.16, null, 0.09); },
    win: function () { [523, 659, 784, 1047].forEach(function (f, i) { tone(f, 0.22, 'triangle', 0.16, null, i * 0.11); }); },
    bump: function () { tone(110, 0.08, 'sine', 0.2, 60); }
  };
  function sfx(n) { if (!save.muted && SFX[n]) SFX[n](); }

  /* ---------- generative music: soft pentatonic pad + random-walk melody, a different tune every time ---------- */
  var MUSIC = {
    menu: { root: 261.63, sc: [0, 2, 4, 7, 9], bpm: 72 }, hotel: { root: 261.63, sc: [0, 2, 4, 7, 9], bpm: 76 },
    palace: { root: 293.66, sc: [0, 2, 4, 7, 9], bpm: 88 }, mansion: { root: 220, sc: [0, 3, 5, 7, 10], bpm: 62 },
    space: { root: 164.81, sc: [0, 3, 5, 7, 10], bpm: 58 }, museum: { root: 174.61, sc: [0, 2, 4, 7, 9], bpm: 66 },
    camp: { root: 196, sc: [0, 2, 4, 7, 9], bpm: 70 }, cinema: { root: 233.08, sc: [0, 3, 5, 7, 10], bpm: 68 },
    farm: { root: 293.66, sc: [0, 2, 4, 7, 9], bpm: 84 }, park: { root: 277.18, sc: [0, 2, 4, 7, 9], bpm: 92 }, tower: { root: 207.65, sc: [0, 3, 5, 7, 10], bpm: 72 }
  };
  var mus = { world: 'menu', next: 0, step: 0, timer: null, pos: 4, bus: null };
  function musicOn() { return save.music !== false && !save.muted; }
  function musicBus() {
    if (mus.bus || !AC) return mus.bus;
    var g = AC.createGain(); g.gain.value = 1.0;
    var d = AC.createDelay(1); d.delayTime.value = 0.34; var fb = AC.createGain(); fb.gain.value = 0.3; var lp = AC.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1800;
    g.connect(master); g.connect(d); d.connect(lp); lp.connect(fb); fb.connect(d); lp.connect(master);
    mus.bus = g; return g;
  }
  function mnote(f, t, dur, vol, type) {
    var o = AC.createOscillator(), g = AC.createGain(); o.type = type || 'triangle'; o.frequency.value = f;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.03); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(mus.bus); o.start(t); o.stop(t + dur + 0.05);
  }
  function musicTick() {
    if (!AC || AC.state !== 'running' || !musicOn() || !musicBus()) return;
    var cfg = MUSIC[mus.world] || MUSIC.menu, beat = 60 / cfg.bpm, now = AC.currentTime;
    var deg = function (n) { return cfg.root * Math.pow(2, (cfg.sc[((n % 5) + 5) % 5] + 12 * Math.floor(n / 5)) / 12); };
    if (mus.next < now) mus.next = now + 0.1;
    while (mus.next < now + 0.6) {
      var t = mus.next;
      if (mus.step % 8 === 0) { var c = Math.floor(Math.random() * 5) - 5; [0, 2, 4].forEach(function (k) { mnote(deg(c + k), t, beat * 7.6, 0.05, 'sine'); }); }
      if (Math.random() > 0.35) {
        mus.pos = Math.max(0, Math.min(9, mus.pos + [-2, -1, -1, 1, 1, 2][Math.floor(Math.random() * 6)]));
        mnote(deg(mus.pos), t, beat * (Math.random() < 0.3 ? 2.4 : 1.3), 0.075);
      }
      mus.next += beat; mus.step++;
    }
  }

  /* ---------- state ---------- */
  var $ = function (id) { return document.getElementById(id); };
  var canvas = $('board'), ctx = canvas.getContext('2d');
  var S = null; // current puzzle
  var cs = 60, dpr = 1, timeNow = 0, lastTs = 0;
  var SPEED = 8; // cells per second
  var particles = [];
  var shakeT = 0;
  var hintsCache = {}; // hints used per puzzle this session (Restart must not refill them)
  var SCREENS = ['menu', 'diff', 'levels', 'settings', 'game', 'privacy', 'howto', 'editor'];
  var current = 'menu';
  var Gen = window.NSGen, Mon = window.NSMonetization;

  function setBg(c) {
    document.body.style.background = c;
    var m = document.querySelector('meta[name=theme-color]'); if (m) m.setAttribute('content', c);
  }
  function show(id) {
    try { window.dispatchEvent(new CustomEvent('ns:screen', { detail: { id: id } })); } catch (e) {}
    mus.world = (id === 'game' && S && S.lv) ? S.lv.world : 'menu';
    if (id !== 'game') setBg(BASE_BG);
    SCREENS.forEach(function (n) { $(n).classList.toggle('hidden', n !== id); });
    current = id;
    if (id === 'game') resize();
    if (id === 'menu') refreshMenu();
    if (id === 'diff') $('statsLine').textContent = save.stats.endless ? 'Endless puzzles solved: ' + save.stats.endless : '';
  }
  function leaveGame(to) { hideWorldDone(); if (S && S.phase === 'playing') finish(true); if (S && S.mode === 'custom' && S.from === 'editor' && (!to || to === 'menu')) to = 'editor'; show(to || 'menu'); }

  function worldOf(lv) { return WORLDS.filter(function (w) { return w.id === lv.world; })[0] || WORLDS[0]; }
  function isUnlocked(i) { return UNLOCK_ALL || i === 0 || (save.stars[LEVELS[i - 1].id] || 0) > 0; }
  function cap1(t) { return t.charAt(0).toUpperCase() + t.slice(1); }
  function levelKey(lv, mode) { return mode === 'custom' ? 'p' + lv.code : mode === 'daily' ? 'd' + lv.daily : mode === 'endless' ? 'e' + lv.diff + lv.seed : 'c' + lv.id; }

  function captionFor(lv, mode) {
    if (mode === 'campaign') {
      if (lv.id === 1) return 'Tap the round mirrors to turn them, then press Release. Wake the star target, not the sleepers.';
      if (lv.id === 2) return lv.blurb + ' Stuck? Try Hint.';
      if (lv.id === 5) return lv.blurb + ' Some mirrors are decoys: leave them alone.';
      if (lv.id === 11) return 'New: the X splitter sends sound to both sides. ' + lv.blurb;
      if (lv.id === 71) return 'Final world: every rule at once. ' + lv.blurb;
      if (lv.id === 61) return 'New: portals. Sound that enters one comes out of the other, still going the same way.';
      if (lv.id === 51) return 'New: deep sleepers (blue badge) only wake if sound reaches them within ' + 4 + ' tiles. Fainter sound slips right past.';
      if (lv.id === 16) return 'New: sound fades after ' + lv.range + ' tiles here. ' + lv.blurb;
      if (lv.range) return 'Sound fades after ' + lv.range + ' tiles. ' + lv.blurb;
      return lv.blurb;
    }
    if (mode === 'custom') return lv.blurb;
    var bits = [];
    if (lv.range) bits.push('Sound fades after ' + lv.range + ' tiles.');
    if (lv.grid.join('').indexOf('x') >= 0) bits.push('X splits sound to both sides.');
    bits.push('Mirrors you never need are decoys.');
    return bits.join(' ');
  }

  function startLevel(lv, o) {
    hideWorldDone();
    var L = Core.parse(lv), key = levelKey(lv, o.mode);
    S = {
      mode: o.mode, from: o.from, i: o.i || 0, lv: lv, L: L, theme: THEME[lv.world], world: worldOf(lv), key: key,
      state: L.init.slice(), moves: 0, phase: 'setup', ev: null, T: 0,
      hints: hintsCache[key] !== undefined ? hintsCache[key] : 3, hintMi: -1, kfocus: -1,
      tutorial: o.mode === 'campaign' && lv.id === 1 && !save.stars[1],
      flip: {}, woken: {}, played: {}, result: null
    };
    S.mirrorAng = L.init.map(function (v) { return v ? Math.PI / 4 : -Math.PI / 4; });
    particles = [];
    $('lvlTitle').textContent = o.mode === 'campaign' ? lv.id + '. ' + lv.title : (o.mode === 'daily' ? 'Daily ' + lv.daily : (o.mode === 'custom' ? 'Custom puzzle' : 'Endless ' + cap1(lv.diff)));
    $('lvlWorld').textContent = o.mode === 'custom' ? (o.from === 'editor' ? 'Your creation' : 'Made by a player') : S.world.name + (o.mode === 'campaign' ? '' : ' · ' + lv.title);
    $('caption').textContent = captionFor(lv, o.mode);
    $('stRange').textContent = lv.range ? 'Range ' + lv.range : '';
    $('sheet').classList.add('hidden');
    updateHud();
    show('game');
    setBg(S.theme.bg);
    canvas.style.boxShadow = '0 0 0 3px ' + S.theme.wave + '66, 0 8px 30px rgba(0,0,0,.45), 0 0 26px ' + S.theme.wave + '33';
    canvas.style.outlineColor = S.theme.wave;
    canvas.setAttribute('aria-label', 'Puzzle board, ' + L.W + ' by ' + L.H + '. ' + L.mirrors.length + ' turnable mirrors, ' + L.targets.length + ' target' + (L.targets.length > 1 ? 's' : '') + ', ' + (L.sleepers.length + L.deep.length) + ((L.sleepers.length + L.deep.length) === 1 ? ' sleeper' : ' sleepers') + (L.deep.length ? ' (' + L.deep.length + ' deep)' : '') + (lv.range ? ', sound range ' + lv.range : '') + '. Arrow keys choose a mirror, Space turns it, Enter releases the sound.');
    try { canvas.focus({ preventScroll: true }); } catch (e) {}
  }
  function loadLevel(i) { startLevel(LEVELS[i], { mode: 'campaign', i: i }); }

  function tutorialTarget() {
    if (!S || !S.tutorial) return -1;
    for (var i = 0; i < S.lv.solution.length; i++) if (S.lv.solution[i] !== S.state[i]) return i;
    return -1;
  }
  function updateHud() {
    var reward = !!(Mon && Mon.canRewardHint());
    $('stTaps').textContent = 'Taps ' + S.moves;
    $('stPar').textContent = 'Par ' + S.lv.par;
    $('btnHint').textContent = S.hints > 0 ? 'Hint ' + S.hints : (reward ? 'Hint (ad)' : 'No hints');
    $('btnHint').disabled = S.phase !== 'setup' || (S.hints <= 0 && !reward);
    $('btnRelease').disabled = S.phase !== 'setup';
    $('btnRelease').classList.toggle('pulse', !!S.tutorial && S.phase === 'setup' && tutorialTarget() === -1);
    $('btnRestart').disabled = S.phase === 'playing';
    $('btnUndo').disabled = S.phase !== 'setup' || !(S.hist && S.hist.length);
  }

  function toast(msg) {
    var t = $('toast'); t.textContent = msg; t.classList.remove('hidden');
    clearTimeout(toast.h); toast.h = setTimeout(function () { t.classList.add('hidden'); }, 2200);
  }

  /* ---------- actions ---------- */
  function flipMirror(mi, undoing) {
    if (!S || S.phase !== 'setup') return;
    S.state[mi] = S.state[mi] ? 0 : 1;
    if (undoing) S.moves = Math.max(0, S.moves - 1); else { S.moves++; (S.hist = S.hist || []).push(mi); }
    var to = S.state[mi] ? Math.PI / 4 : -Math.PI / 4;
    if (reduced()) S.mirrorAng[mi] = to; else S.flip[mi] = { t0: timeNow, from: S.mirrorAng[mi], to: to };
    if (S.hintMi === mi) S.hintMi = -1;
    sfx('flip'); buzz(8); updateHud();
  }

  function undo() { if (!S || S.phase !== 'setup' || !S.hist || !S.hist.length) return; flipMirror(S.hist.pop(), true); }

  function release() {
    if (!S || S.phase !== 'setup') return;
    S.hintMi = -1;
    S.ev = Core.evaluate(S.L, S.state);
    S.phase = 'playing'; S.T = 0; S.woken = {}; S.played = {}; S.shot = timeNow;
    sfx(S.world.sound);
    updateHud();
  }

  function retry() {
    if (!S) return;
    S.phase = 'setup'; S.ev = null; S.T = 0; S.woken = {}; S.played = {}; S.result = null;
    $('sheet').classList.add('hidden'); updateHud();
  }

  function restart() { if (S && S.phase !== 'playing') startLevel(S.lv, { mode: S.mode, i: S.i }); }

  function hint() {
    if (!S || S.phase !== 'setup') return;
    if (S.hints <= 0) {
      if (Mon && Mon.canRewardHint()) {
        Mon.rewardHint().then(function (ok) { if (ok && S) { S.hints = 1; updateHud(); hint(); } else toast('No hint this time.'); });
      } else toast('No hints left on this puzzle.');
      return;
    }
    var sol = S.lv.solution, diff = [];
    for (var i = 0; i < sol.length; i++) if (sol[i] !== S.state[i]) diff.push(i);
    if (!diff.length) { toast('Looks right already. Release it!'); return; }
    S.hints--; hintsCache[S.key] = S.hints; S.hintMi = diff[0];
    toast('Try turning the glowing mirror.'); updateHud();
  }

  function streak() {
    var d = new Date(), n = 0;
    if (!save.daily[Gen.dailyKey(d)]) d.setDate(d.getDate() - 1);
    while (save.daily[Gen.dailyKey(d)]) { n++; d.setDate(d.getDate() - 1); }
    return n;
  }
  function recordWin(stars) {
    var lv = S.lv;
    if (S.mode === 'campaign') { if ((save.stars[lv.id] || 0) < stars) save.stars[lv.id] = stars; }
    else if (S.mode === 'daily') {
      var old = save.daily[lv.daily];
      if (!old || stars > old.stars || (stars === old.stars && S.moves < old.taps)) save.daily[lv.daily] = { stars: stars, taps: Math.max(1, S.moves) };
    } else if (S.mode === 'endless') save.stats.endless++;
    persist();
  }

  function starReveal(n, silent) {
    var box = $('sheetStars'); box.textContent = '';
    for (var i = 0; i < 3; i++) {
      var sp = document.createElement('span'); sp.textContent = i < n ? '\u2605' : '\u2606'; sp.className = 'st' + (i < n ? ' on' : ' off');
      if (!reduced() && !silent) { sp.style.animationDelay = (0.25 + i * 0.28) + 's'; sp.classList.add('pop'); if (i < n) setTimeout(function (k) { return function () { if (S && S.result && S.result.win) { tone(523 * Math.pow(1.26, k), .18, 'triangle', .14); } }; }(i), (250 + i * 280)); }
      box.appendChild(sp);
    }
  }
  function finish(silent) {
    try { window.dispatchEvent(new CustomEvent('ns:result')); } catch (e) {}
    var ev = S.ev, lv = S.lv;
    S.phase = 'result';
    var sheet = $('sheet');
    sheet.classList.remove('hidden', 'win', 'fail');
    setTimeout(function () { try { if (!S || !S.result) return; ($('sheetNext').classList.contains('hidden') || !S.result.win ? $('sheetAgain') : $('sheetNext')).focus({ preventScroll: true }); } catch (e) {} }, 60); // keyboard users land on the main button
    var reward = !!(Mon && Mon.canRewardHint());
    if (ev.success) {
      var stars = S.moves <= lv.par ? 3 : (S.moves <= lv.par + 2 ? 2 : 1);
      S.result = { win: true, stars: stars };
      delete hintsCache[S.key];
      var starsBefore = totalStars();
      recordWin(stars);
      var newWave = WAVES.filter(function (w) { return w.need > starsBefore && w.need <= totalStars(); })[0];
      sheet.classList.add('win');
      $('sheetTitle').textContent = 'Mission complete!';
      starReveal(stars, silent);
      $('sheetText').textContent = S.moves + ' taps (par ' + lv.par + '). ' + (stars === 3 ? 'Smooth smuggling.' : 'Try for par to get all three stars.') + (newWave ? ' New wave style unlocked: ' + newWave.name + '!' : '') + (S.mode === 'campaign' && LEVELS[S.i + 1] && LEVELS[S.i + 1].world !== lv.world ? ' World complete! Next: ' + worldOf(LEVELS[S.i + 1]).name + '.' : '') + (S.mode === 'daily' ? ' Come back tomorrow for a new one.' : '');
      $('sheetNext').classList.remove('hidden');
      $('sheetNext').textContent = S.mode === 'custom' ? (S.from === 'editor' ? 'Share link' : 'Menu') : S.mode === 'endless' ? 'Next' : (S.mode === 'daily' || S.i >= LEVELS.length - 1 ? 'Menu' : 'Next');
      $('sheetAgain').textContent = 'Replay';
      $('sheetShare').classList.remove('hidden');
      if (!silent) { sfx('win'); confetti(); buzz([20, 40, 20]); }
      if (!silent && S.mode === 'campaign' && (!LEVELS[S.i + 1] || LEVELS[S.i + 1].world !== lv.world)) { var wdI = S.i; setTimeout(function () { if (S && S.mode === 'campaign' && S.i === wdI && S.phase === 'result') showWorldDone(lv.world); }, 900); }
    } else {
      S.result = { win: false };
      sheet.classList.add('fail');
      $('sheetStars').textContent = '';
      $('sheetShare').classList.add('hidden');
      $('sheetAgain').textContent = 'Try again';
      $('sheetNext').textContent = 'Hint';
      $('sheetNext').classList.toggle('hidden', !(S.hints > 0 || reward));
      var msg;
      if (ev.woke.length) {
        var h = ev.woke[0];
        msg = 'You woke up ' + NAMES[(h.x + h.y * 3) % NAMES.length] + '!' + (h.kind === 'H' ? ' Deep sleepers hear sound that arrives within ' + S.L.heavy + ' tiles.' : '') + (ev.woke.length > 1 ? ' (and ' + (ev.woke.length - 1) + ' more)' : '');
        $('sheetTitle').textContent = 'Shhh! Too loud.';
      } else {
        var fizzled = false;
        if (S.L.range < 99) {
          var free = Core.evaluate(Core.parse({ grid: lv.grid, range: 0 }), S.state);
          fizzled = free.missed.length < ev.missed.length;
        }
        if (fizzled) msg = 'The sound ran out of breath before it got there. Find a shorter route.';
        else if (S.L.targets.length > 1 && ev.missed.length < S.L.targets.length) msg = 'One target heard it. The other is still snoozing.';
        else msg = 'The sound never reached the target.';
        $('sheetTitle').textContent = 'Nobody heard a thing.';
      }
      $('sheetText').textContent = msg;
      if (!silent) { sfx('oops'); buzz(70); if (!reduced()) shakeT = timeNow; }
    }
    updateHud();
  }

  function textShare(text) {
    if (navigator.share) navigator.share({ text: text }).catch(function () {});
    else if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(function () { toast('Result copied'); }, function () { toast(text); });
    else toast(text);
  }
  function shareResult() {
    if (!S || !S.result || !S.result.win) return;
    var lv = S.lv, st = S.result.stars;
    var label = S.mode === 'custom' ? 'Custom puzzle' : S.mode === 'daily' ? 'Daily ' + lv.daily : (S.mode === 'endless' ? 'Endless ' + cap1(lv.diff) : 'Level ' + lv.id);
    var link = S.mode === 'endless' ? challengeLink(lv) : (S.mode === 'custom' ? customLink(lv.code) : '');
    var text = 'Noise Smuggler · ' + label + ' · ' + '★'.repeat(st) + '☆'.repeat(3 - st) + ' · ' + S.moves + ' taps (par ' + lv.par + ')' + (link ? '\nCan you beat it? ' + link : '');
    var W = 1080, H = 1350, c = document.createElement('canvas'); c.width = W; c.height = H;
    var g = c.getContext('2d');
    g.fillStyle = '#1c1630'; g.fillRect(0, 0, W, H); g.textAlign = 'center';
    g.fillStyle = '#ffcf5a'; g.font = '900 84px system-ui,sans-serif'; g.fillText('Noise Smuggler', W / 2, 120);
    g.fillStyle = '#7ff3e0'; g.font = '700 40px system-ui,sans-serif'; g.fillText(label, W / 2, 185);
    var bw = Math.min(960, W - 120), bh = bw * canvas.height / canvas.width;
    if (bh > 800) { bh = 800; bw = bh * canvas.width / canvas.height; }
    g.drawImage(canvas, (W - bw) / 2, 230, bw, bh);
    g.fillStyle = '#ffcf5a'; g.font = '900 110px system-ui,sans-serif'; g.fillText('★'.repeat(st) + '☆'.repeat(3 - st), W / 2, 230 + bh + 135);
    g.fillStyle = '#f4efff'; g.font = '700 44px system-ui,sans-serif'; g.fillText(S.moves + ' taps (par ' + lv.par + ')', W / 2, 230 + bh + 210);
    g.fillStyle = '#a99fc9'; g.font = '600 32px system-ui,sans-serif'; g.fillText('Adeba Studio', W / 2, H - 50);
    c.toBlob(function (blob) {
      try {
        if (blob && window.File && navigator.canShare) {
          var f = new File([blob], 'noise-smuggler.png', { type: 'image/png' });
          if (navigator.canShare({ files: [f] })) { navigator.share({ files: [f], text: text }).catch(function () {}); return; }
        }
      } catch (e) {}
      textShare(text);
    }, 'image/png');
  }

  function confetti() {
    if (reduced()) return;
    var cols = ['#ffcf5a', '#7ff3e0', '#ff7eb6', '#a6ff8a', '#ffffff'];
    S.L.targets.forEach(function (t) {
      for (var i = 0; i < 36; i++) {
        var a = Math.random() * TAU, v = 2 + Math.random() * 5;
        particles.push({ x: (t.x + .5), y: (t.y + .5), vx: Math.cos(a) * v, vy: Math.sin(a) * v - 3, c: cols[i % cols.length], life: 1.4 + Math.random() * .6, age: 0, w: .08 + Math.random() * .08 });
      }
    });
  }
  function sparks(x, y, color) {
    if (reduced()) return;
    for (var i = 0; i < 8; i++) {
      var a = Math.random() * TAU, v = 1 + Math.random() * 2.5;
      particles.push({ x: x + .5, y: y + .5, vx: Math.cos(a) * v, vy: Math.sin(a) * v, c: color, life: .5, age: 0, w: .06 });
    }
  }

  /* ---------- modes ---------- */
  function challengeLink(lv) {
    if (!/^https?:$/.test(location.protocol) || !lv || !lv.seed) return '';
    return location.origin + location.pathname + '?c=' + lv.diff + '.' + lv.seed;
  }
  /* ---------- puzzle creator: encode, validate (the solver must find a real solution), link ---------- */
  var CODE_CH = '.#>v<^TZHmnxp';
  function codeOf(rows) { var o = ''; rows.join('').split('').forEach(function (c) { o += String.fromCharCode(97 + CODE_CH.indexOf(c)); }); return rows[0].length + '.' + o; }
  function rowsOf(code) {
    var m = /^(\d{1,2})\.([a-m]{20,120})$/.exec(code || ''); if (!m) return null;
    var W = +m[1], t = m[2], rows = [];
    if (W < 5 || W > 9 || t.length % W) return null;
    var H = t.length / W; if (H < 5 || H > 10) return null;
    for (var y = 0; y < H; y++) { var r = ''; for (var x = 0; x < W; x++) r += CODE_CH.charAt(t.charCodeAt(y * W + x) - 97); rows.push(r); }
    return rows;
  }
  function checkPuzzle(rows) {
    var n = {}; rows.join('').split('').forEach(function (c) { n[c] = (n[c] || 0) + 1; });
    var src = (n['>'] || 0) + (n['v'] || 0) + (n['<'] || 0) + (n['^'] || 0), mir = (n.m || 0) + (n.n || 0);
    if (src < 1) return { ok: false, msg: 'Add a sound source (an arrow).' };
    if (src > 2) return { ok: false, msg: 'Use at most 2 sound sources.' };
    if (!n.T) return { ok: false, msg: 'Add at least one star to wake.' };
    if (n.T > 3) return { ok: false, msg: 'Use at most 3 stars.' };
    if (mir < 1) return { ok: false, msg: 'Add at least one turnable mirror.' };
    if (mir > 8) return { ok: false, msg: 'Use at most 8 turnable mirrors.' };
    if ((n.x || 0) > 2) return { ok: false, msg: 'Use at most 2 splitters.' };
    if (n.p && n.p !== 2) return { ok: false, msg: 'Portals come in pairs: place exactly two.' };
    if ((n.Z || 0) + (n.H || 0) > 6) return { ok: false, msg: 'Use at most 6 sleepers.' };
    var L, res;
    try { L = Core.parse({ grid: rows, range: 0 }); res = Core.solve(L); } catch (e) { return { ok: false, msg: 'That layout could not be checked.' }; }
    if (!res.best) return { ok: false, msg: 'No solution yet: every star must be reachable without waking a sleeper.' };
    if (res.best.flips === 0) return { ok: false, msg: 'It is already solved without a tap. Make the player turn at least one mirror.' };
    var code = codeOf(rows);
    return { ok: true, par: res.best.flips, lv: { id: 0, world: 'hotel', n: 0, title: 'Custom puzzle', blurb: 'A puzzle made by a player. Wake the star, not the sleepers.', grid: rows, range: 0, par: res.best.flips, solution: res.best.state, solutions: res.solutions.length, code: code } };
  }
  function customLink(code) { return /^https?:$/.test(location.protocol) ? location.origin + location.pathname + '?p=' + code : '?p=' + code; }
  function shareCustom(code) { textShare('I made a Noise Smuggler puzzle. Can you solve it?\n' + customLink(code)); }
  function parsePuzzleParam() { var m = /[?&]p=([0-9.a-m]+)(?:&|$)/.exec(location.search); return m ? m[1] : null; }
  function parseChallenge() {
    var m = /[?&]c=(easy|medium|hard|expert)\.(\d{1,10})(?:&|$)/.exec(location.search);
    if (!m || +m[2] > 4294967295) return null;
    return { diff: m[1], seed: +m[2] };
  }
  function startDaily() {
    var lv = Gen.dailyFor(Gen.dailyKey());
    if (lv) startLevel(lv, { mode: 'daily' }); else loadLevel(0);
  }
  function newEndless(diff) {
    setTimeout(function () {
      var lv = Gen.generate(diff, (Math.random() * 4294967296) >>> 0);
      if (lv) startLevel(lv, { mode: 'endless' }); else toast('Could not mix a puzzle. Try again.');
    }, 30);
  }

  /* ---------- layout ---------- */
  function resize() {
    if (!S || $('game').classList.contains('hidden')) return;
    var wrap = $('boardWrap'), aw = wrap.clientWidth - 4, ah = wrap.clientHeight - 4;
    cs = Math.max(20, Math.floor(Math.min(aw / S.L.W, ah / S.L.H)));
    dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    var w = cs * S.L.W, h = cs * S.L.H;
    canvas.style.width = w + 'px'; canvas.style.height = h + 'px';
    canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
  }

  /* ---------- drawing ---------- */
  function rr(x, y, w, h, r) {
    ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }
  function ease(t) { t = Math.max(0, Math.min(1, t)); return 1 - Math.pow(1 - t, 3); }

  function drawWall(x, y) {
    var th = S.theme, px = x * cs, py = y * cs, m = cs * 0.04;
    ctx.fillStyle = th.wall; rr(px + m, py + m, cs - 2 * m, cs - 2 * m, cs * .14); ctx.fill();
    ctx.strokeStyle = th.wallHi; ctx.lineWidth = Math.max(1, cs * .035);
    ctx.beginPath();
    ctx.moveTo(px + cs * .12, py + cs * .5); ctx.lineTo(px + cs * .88, py + cs * .5);
    ctx.moveTo(px + cs * .5, py + cs * .12); ctx.lineTo(px + cs * .5, py + cs * .5);
    ctx.moveTo(px + cs * .3, py + cs * .5); ctx.lineTo(px + cs * .3, py + cs * .88);
    ctx.moveTo(px + cs * .7, py + cs * .5); ctx.lineTo(px + cs * .7, py + cs * .88);
    ctx.stroke();
  }

  function drawSource(c) {
    var cx = (c.x + .5) * cs, cy = (c.y + .5) * cs, d = c.d;
    var kick = (S.phase === 'playing' && !reduced()) ? Math.max(0, 1 - (timeNow - S.shot) * 4) : 0;
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(d * Math.PI / 2);
    var sh = kick * cs * .05 * Math.sin(timeNow * 80); ctx.translate(sh, 0);
    ctx.fillStyle = '#e8e4f7'; rr(-cs * .3, -cs * .3, cs * .38, cs * .6, cs * .08); ctx.fill();
    ctx.fillStyle = '#8c84b4'; ctx.beginPath(); ctx.moveTo(cs * .06, -cs * .14); ctx.lineTo(cs * .36, -cs * .34); ctx.lineTo(cs * .36, cs * .34); ctx.lineTo(cs * .06, cs * .14); ctx.closePath(); ctx.fill();
    ctx.fillStyle = S.theme.wave; ctx.beginPath(); ctx.arc(-cs * .12, 0, cs * .07, 0, TAU); ctx.fill();
    ctx.restore();
  }

  function drawMirror(c) {
    var mi = c.mi, rot = mi >= 0, cx = (c.x + .5) * cs, cy = (c.y + .5) * cs;
    var ang;
    if (rot) {
      var f = S.flip[mi];
      if (f) { var k = reduced() ? 1 : ease((timeNow - f.t0) / 0.16); S.mirrorAng[mi] = f.from + (f.to - f.from) * k; if (k >= 1) delete S.flip[mi]; }
      ang = S.mirrorAng[mi];
    } else ang = c.t === '/' ? -Math.PI / 4 : Math.PI / 4;
    ctx.save(); ctx.translate(cx, cy);
    ctx.fillStyle = rot ? '#1f5c58' : '#2e3350'; ctx.beginPath(); ctx.arc(0, 0, cs * .4, 0, TAU); ctx.fill();
    ctx.lineWidth = Math.max(2, cs * .05); ctx.strokeStyle = rot ? '#7ff3e0' : '#5a628c'; ctx.stroke();
    if (S.hintMi === mi && rot) {
      var pulse = reduced() ? 1 : 0.5 + 0.5 * Math.sin(timeNow * 7);
      ctx.strokeStyle = 'rgba(255,207,90,' + (0.5 + 0.5 * pulse) + ')'; ctx.lineWidth = cs * .09;
      ctx.beginPath(); ctx.arc(0, 0, cs * (.46 + .05 * pulse), 0, TAU); ctx.stroke();
    }
    if (rot && S.tutorial && S.phase === 'setup' && tutorialTarget() === mi) { // first-run tap guide
      var ph = reduced() ? 0 : (timeNow % 1.3) / 1.3;
      ctx.strokeStyle = 'rgba(255,207,90,' + (1 - ph) + ')'; ctx.lineWidth = cs * .07; ctx.beginPath(); ctx.arc(0, 0, cs * (.4 + .3 * ph), 0, TAU); ctx.stroke();
      ctx.strokeStyle = '#ffcf5a'; ctx.lineWidth = cs * .06; ctx.beginPath(); ctx.arc(0, 0, cs * .47, 0, TAU); ctx.stroke();
      // pointing hand that taps down on the mirror
      var tap = reduced() ? 0 : Math.max(0, Math.sin(timeNow * 4.8)) * cs * .1;
      ctx.save(); ctx.translate(cs * .16, cs * .34 + tap); ctx.rotate(-.35);
      ctx.fillStyle = '#ffe3c0'; ctx.strokeStyle = 'rgba(40,20,10,.55)'; ctx.lineWidth = Math.max(1.5, cs * .03);
      rr(-cs * .07, -cs * .02, cs * .14, cs * .3, cs * .06); ctx.fill(); ctx.stroke();
      rr(-cs * .06, -cs * .17, cs * .12, cs * .22, cs * .06); ctx.fill(); ctx.stroke();
      ctx.restore();
    }
    if (rot && S.kfocus === mi) { ctx.strokeStyle = '#fff'; ctx.lineWidth = Math.max(2, cs * .05); ctx.setLineDash([cs * .1, cs * .08]); ctx.beginPath(); ctx.arc(0, 0, cs * .47, 0, TAU); ctx.stroke(); ctx.setLineDash([]); }
    ctx.rotate(ang);
    ctx.lineCap = 'round'; ctx.lineWidth = cs * .12; ctx.strokeStyle = rot ? '#e9fffb' : '#aeb6dc';
    ctx.beginPath(); ctx.moveTo(-cs * .3, 0); ctx.lineTo(cs * .3, 0); ctx.stroke();
    ctx.lineWidth = cs * .04; ctx.strokeStyle = 'rgba(255,255,255,.7)';
    ctx.beginPath(); ctx.moveTo(-cs * .24, -cs * .03); ctx.lineTo(cs * .2, -cs * .03); ctx.stroke();
    ctx.restore();
    if (rot) { // two little turn arrows so it reads as tappable
      ctx.save(); ctx.translate(cx, cy); ctx.strokeStyle = 'rgba(127,243,224,.8)'; ctx.lineWidth = Math.max(1.5, cs * .03);
      ctx.beginPath(); ctx.arc(0, 0, cs * .31, Math.PI * .08, Math.PI * .32); ctx.stroke();
      ctx.beginPath(); ctx.arc(0, 0, cs * .31, Math.PI * 1.08, Math.PI * 1.32); ctx.stroke(); ctx.restore();
    }
  }

  function drawSplitter(c) {
    var cx = (c.x + .5) * cs, cy = (c.y + .5) * cs, r = cs * .36;
    ctx.save(); ctx.translate(cx, cy);
    ctx.fillStyle = '#7a2d6e'; ctx.beginPath(); ctx.moveTo(0, -r); ctx.lineTo(r, 0); ctx.lineTo(0, r); ctx.lineTo(-r, 0); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#ff9de6'; ctx.lineWidth = Math.max(2, cs * .05); ctx.stroke();
    ctx.lineCap = 'round'; ctx.lineWidth = cs * .07; ctx.strokeStyle = '#ffe3f6';
    ctx.beginPath(); ctx.moveTo(-r * .45, -r * .45); ctx.lineTo(r * .45, r * .45); ctx.moveTo(r * .45, -r * .45); ctx.lineTo(-r * .45, r * .45); ctx.stroke();
    ctx.restore();
  }

  function drawPortal(c) {
    var cx = (c.x + .5) * cs, cy = (c.y + .5) * cs, rm = reduced(), idx = S.L.portals[0].x === c.x && S.L.portals[0].y === c.y ? 0 : 1;
    var hue = idx ? '#ff9de6' : '#7fd8ff', spin = rm ? 0 : timeNow * (idx ? -1.6 : 1.6);
    ctx.save(); ctx.translate(cx, cy);
    var gr = ctx.createRadialGradient(0, 0, cs * .05, 0, 0, cs * .42); gr.addColorStop(0, 'rgba(10,6,24,.95)'); gr.addColorStop(1, 'rgba(10,6,24,0)');
    ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(0, 0, cs * .42, 0, TAU); ctx.fill();
    ctx.strokeStyle = hue; ctx.lineWidth = cs * .06; ctx.lineCap = 'round';
    for (var a = 0; a < 3; a++) { ctx.beginPath(); ctx.arc(0, 0, cs * (.16 + a * .09), spin + a * 2.1, spin + a * 2.1 + 3.2); ctx.stroke(); }
    ctx.restore();
  }
  function drawChar(c, kind) {
    var th = S.theme, key = c.x + ',' + c.y, wokenAt = S.woken[key];
    var awake = wokenAt !== undefined, age = awake ? Math.max(0, timeNow - wokenAt) : 0;
    var idx = (c.x * 7 + c.y * 3) | 0, skin = SKINS[idx % SKINS.length];
    var cx = (c.x + .5) * cs, cy = (c.y + .5) * cs + cs * .06;
    var rm = reduced();
    var bob = rm ? 0 : (awake ? (kind === 'T' ? -Math.abs(Math.sin(age * 9)) * cs * .08 * Math.max(0, 1 - age / 1.2) : 0) : Math.sin(timeNow * 2 + idx) * cs * .012);
    var shk = (!rm && awake && (kind === 'Z' || kind === 'H')) ? Math.sin(age * 70) * cs * .035 * Math.max(0, 1 - age / 0.9) : 0;
    ctx.save(); ctx.translate(cx + shk, cy + bob);
    // marker ring
    if (kind === 'T') {
      ctx.lineWidth = Math.max(2, cs * .05); ctx.strokeStyle = awake ? '#8dff9c' : '#ffcf5a';
      if (!awake) { ctx.setLineDash([cs * .1, cs * .08]); ctx.lineDashOffset = rm ? 0 : -timeNow * cs * .25; }
      ctx.beginPath(); ctx.arc(0, -cs * .02, cs * .43, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
    }
    // body
    ctx.fillStyle = kind === 'T' ? th.suit : SLEEPER_SUITS[idx % SLEEPER_SUITS.length];
    rr(-cs * .22, cs * .0, cs * .44, cs * .3, cs * .1); ctx.fill();
    // head
    ctx.fillStyle = skin; ctx.beginPath(); ctx.arc(0, -cs * .1, cs * .19, 0, TAU); ctx.fill();
    // headgear
    if (kind === 'T') {
      if (S.lv.world === 'hotel') { ctx.fillStyle = th.hat; rr(-cs * .2, -cs * .33, cs * .4, cs * .14, cs * .05); ctx.fill(); ctx.fillStyle = '#ffcf5a'; ctx.fillRect(-cs * .2, -cs * .22, cs * .4, cs * .035); }
      else if (S.lv.world === 'palace') { ctx.fillStyle = th.hat; ctx.beginPath(); ctx.moveTo(-cs * .17, -cs * .24); ctx.lineTo(-cs * .17, -cs * .4); ctx.lineTo(-cs * .08, -cs * .31); ctx.lineTo(0, -cs * .42); ctx.lineTo(cs * .08, -cs * .31); ctx.lineTo(cs * .17, -cs * .4); ctx.lineTo(cs * .17, -cs * .24); ctx.closePath(); ctx.fill(); }
      else if (S.lv.world === 'mansion') { ctx.fillStyle = th.hat; ctx.beginPath(); ctx.arc(0, -cs * .2, cs * .2, Math.PI, 0); ctx.fill(); ctx.fillRect(-cs * .23, -cs * .21, cs * .46, cs * .04); }
      else if (S.lv.world === 'museum') { ctx.fillStyle = th.hat; ctx.fillRect(-cs * .2, -cs * .26, cs * .4, cs * .05); ctx.fillStyle = '#e8e2cf'; ctx.beginPath(); ctx.arc(0, -cs * .26, cs * .15, Math.PI, 0); ctx.fill(); }
      else if (S.lv.world === 'camp') { ctx.fillStyle = th.hat; ctx.beginPath(); ctx.moveTo(-cs * .27, -cs * .2); ctx.lineTo(-cs * .15, -cs * .38); ctx.lineTo(cs * .15, -cs * .38); ctx.lineTo(cs * .27, -cs * .2); ctx.closePath(); ctx.fill(); ctx.fillStyle = '#d9b24c'; ctx.fillRect(-cs * .15, -cs * .26, cs * .3, cs * .03); }
      else if (S.lv.world === 'park') { ctx.fillStyle = '#1a1a1a'; ctx.fillRect(-cs * .14, -cs * .46, cs * .28, cs * .24); ctx.fillRect(-cs * .22, -cs * .24, cs * .44, cs * .04); ctx.fillStyle = th.hat; ctx.fillRect(-cs * .14, -cs * .27, cs * .28, cs * .045); }
      else if (S.lv.world === 'tower') { ctx.fillStyle = th.hat; ctx.beginPath(); ctx.moveTo(-cs * .2, -cs * .22); ctx.lineTo(0, -cs * .46); ctx.lineTo(cs * .2, -cs * .22); ctx.closePath(); ctx.fill(); ctx.fillStyle = '#ffe08a'; ctx.beginPath(); ctx.arc(0, -cs * .3, cs * .045, 0, TAU); ctx.fill(); }
      else if (S.lv.world === 'farm') { ctx.fillStyle = th.hat; ctx.beginPath(); ctx.ellipse(0, -cs * .22, cs * .3, cs * .07, 0, 0, TAU); ctx.fill(); ctx.beginPath(); ctx.arc(0, -cs * .24, cs * .15, Math.PI, 0); ctx.fill(); }
      else if (S.lv.world === 'cinema') { ctx.fillStyle = th.hat; ctx.beginPath(); ctx.arc(0, -cs * .21, cs * .19, Math.PI, 0); ctx.fill(); ctx.fillStyle = '#222'; ctx.fillRect(-cs * .08, -cs * .38, cs * .16, cs * .1); }
      else { ctx.strokeStyle = 'rgba(207,233,255,.9)'; ctx.fillStyle = 'rgba(160,210,255,.25)'; ctx.lineWidth = Math.max(1.5, cs * .04); ctx.beginPath(); ctx.arc(0, -cs * .1, cs * .25, 0, TAU); ctx.fill(); ctx.stroke(); }
    } else { // nightcap
      ctx.fillStyle = kind === 'H' ? '#8ab4ff' : '#f7f3ff'; ctx.beginPath(); ctx.moveTo(-cs * .19, -cs * .2); ctx.quadraticCurveTo(0, -cs * .5, cs * .26, -cs * .16); ctx.lineTo(cs * .19, -cs * .22); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.arc(cs * .26, -cs * .15, cs * .05, 0, TAU); ctx.fill();
    }
    // face
    ctx.strokeStyle = '#2b1a14'; ctx.fillStyle = '#2b1a14'; ctx.lineWidth = Math.max(1.5, cs * .03); ctx.lineCap = 'round';
    var ey = -cs * .11, ex = cs * .075;
    if (!awake) {
      ctx.beginPath(); ctx.arc(-ex, ey, cs * .035, 0.1 * Math.PI, 0.9 * Math.PI); ctx.stroke();
      ctx.beginPath(); ctx.arc(ex, ey, cs * .035, 0.1 * Math.PI, 0.9 * Math.PI); ctx.stroke();
      ctx.beginPath(); ctx.arc(0, -cs * .03, cs * .018, 0, TAU); ctx.fill();
    } else {
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(-ex, ey, cs * .045, 0, TAU); ctx.arc(ex, ey, cs * .045, 0, TAU); ctx.fill();
      ctx.fillStyle = '#2b1a14'; ctx.beginPath(); ctx.arc(-ex, ey, cs * .02, 0, TAU); ctx.arc(ex, ey, cs * .02, 0, TAU); ctx.fill();
      if (kind === 'T') { ctx.beginPath(); ctx.arc(0, -cs * .045, cs * .06, 0.1 * Math.PI, 0.9 * Math.PI); ctx.stroke(); }
      else {
        ctx.beginPath(); ctx.moveTo(-ex - cs * .04, ey - cs * .07); ctx.lineTo(-ex + cs * .03, ey - cs * .04); ctx.moveTo(ex + cs * .04, ey - cs * .07); ctx.lineTo(ex - cs * .03, ey - cs * .04); ctx.stroke();
        ctx.beginPath(); ctx.ellipse(0, -cs * .02, cs * .03, cs * .045, 0, 0, TAU); ctx.fill();
      }
    }
    ctx.restore();
    if (kind === 'H') { // deep-sleeper badge: shows how close the sound must be
      ctx.save(); ctx.fillStyle = 'rgba(138,180,255,.95)'; rr(cx - cs * .25, cy + cs * .25, cs * .5, cs * .22, cs * .1); ctx.fill();
      ctx.fillStyle = '#10173a'; ctx.font = '900 ' + Math.round(cs * .17) + 'px system-ui,sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('\u2264' + S.L.heavy, cx, cy + cs * .36); ctx.restore();
    }
    // floating marks
    ctx.save(); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    if (!awake) {
      var zt = rm ? 0.3 : (timeNow * 0.8 + idx * .37) % 1;
      ctx.fillStyle = 'rgba(255,255,255,' + (1 - zt) * .9 + ')'; ctx.font = 'bold ' + Math.round(cs * .2) + 'px system-ui,sans-serif';
      ctx.fillText('z', cx + cs * .22 + zt * cs * .08, cy - cs * .3 - zt * cs * .25);
      ctx.font = 'bold ' + Math.round(cs * .15) + 'px system-ui,sans-serif';
      ctx.fillText('z', cx + cs * .3 + zt * cs * .05, cy - cs * .2 - zt * cs * .18);
    } else if (kind === 'Z' || kind === 'H') {
      var a = Math.min(1, age * 6); ctx.globalAlpha = a;
      ctx.fillStyle = '#ff5c6c'; ctx.beginPath(); ctx.arc(cx + cs * .27, cy - cs * .36, cs * .13, 0, TAU); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.font = '900 ' + Math.round(cs * .2) + 'px system-ui,sans-serif'; ctx.fillText('!', cx + cs * .27, cy - cs * .355);
      if (S.result && !S.result.win) { ctx.globalAlpha = 1; ctx.strokeStyle = '#ff5c6c'; ctx.lineWidth = Math.max(2, cs * .06); ctx.beginPath(); ctx.arc(cx, cy - cs * .03, cs * .46, 0, TAU); ctx.stroke(); }
    } else {
      ctx.fillStyle = '#ffcf5a'; ctx.font = '900 ' + Math.round(cs * .22) + 'px system-ui,sans-serif';
      for (var s = 0; s < 3; s++) { var sa = (rm ? 0.2 : age) * 3 + s * 2.1, rr0 = cs * (.3 + .06 * s); ctx.globalAlpha = Math.max(0, 1 - age / 1.6); ctx.fillText('★', cx + Math.cos(sa) * rr0, cy - cs * .1 + Math.sin(sa) * rr0 * .8); }
    }
    ctx.restore();
  }

  function waveCol(i) {
    var w = activeWave();
    if (w.id === 'default') return S.theme.wave;
    if (w.id === 'rainbow') return 'hsl(' + (((i * 22 + timeNow * 90) % 360) | 0) + ',90%,65%)';
    return w.col;
  }
  /* ambient life: slow drifting motes (dust, fireflies, stars...) so every world feels alive */
  var AMB = { hotel: ['#ffffff', 0.35], palace: ['#ffd45e', 0.5], mansion: ['#a6ff8a', 0.5], space: ['#cfe9ff', 0.7], museum: ['#ffe3b0', 0.35], camp: ['#ffe08a', 0.6], cinema: ['#ff9a9a', 0.35], farm: ['#fff3a0', 0.5], park: ['#ff9de6', 0.5], tower: ['#ffe08a', 0.4] };
  function drawAmbient() {
    var L = S.L, a = AMB[S.lv.world] || AMB.hotel, n = reduced() ? 8 : 18, seed = (L.W * 31 + L.H * 17 + (S.lv.id || 1) * 13) >>> 0;
    ctx.save();
    for (var i = 0; i < n; i++) {
      var h1 = ((seed + i * 2654435761) >>> 0) / 4294967296, h2 = ((seed * 7 + i * 40503 + 977) >>> 0) / 4294967296, h3 = ((seed + i * 97) % 1000) / 1000;
      var t = reduced() ? 0 : timeNow;
      var px = ((h1 + Math.sin(t * (.05 + h3 * .1) + i) * .04 + t * .004 * (i % 2 ? 1 : -1)) % 1 + 1) % 1, py = ((h2 + Math.cos(t * (.06 + h3 * .08) + i * 2) * .05) % 1 + 1) % 1;
      ctx.globalAlpha = a[1] * (.35 + .65 * Math.abs(Math.sin(t * (.6 + h3) + i))) * .6;
      ctx.fillStyle = a[0]; ctx.beginPath(); ctx.arc(px * L.W * cs, py * L.H * cs, cs * (.025 + h3 * .03), 0, TAU); ctx.fill();
    }
    ctx.restore();
  }
  function drawSourcePulse() {
    if (reduced() || S.phase !== 'setup') return;
    var ph = (timeNow % 1.6) / 1.6;
    S.L.sources.forEach(function (sr) {
      ctx.save(); ctx.globalAlpha = (1 - ph) * .5; ctx.strokeStyle = S.theme.wave; ctx.lineWidth = cs * .05;
      ctx.beginPath(); ctx.arc((sr.x + .5) * cs, (sr.y + .5) * cs, cs * (.3 + .35 * ph), 0, TAU); ctx.stroke(); ctx.restore();
    });
  }
  var vigCache = { key: '', cv: null };
  function drawVignette() { // rendered once per board size, then just copied
    var L = S.L, w = Math.round(L.W * cs * dpr), h = Math.round(L.H * cs * dpr), key = w + 'x' + h;
    if (vigCache.key !== key) {
      var cv = document.createElement('canvas'); cv.width = w; cv.height = h; var g2 = cv.getContext('2d');
      var g = g2.createRadialGradient(w / 2, h / 2, Math.min(w, h) * .35, w / 2, h / 2, Math.max(w, h) * .75);
      g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,.28)'); g2.fillStyle = g; g2.fillRect(0, 0, w, h);
      vigCache = { key: key, cv: cv };
    }
    ctx.drawImage(vigCache.cv, 0, 0, L.W * cs, L.H * cs);
  }
  /* lighting: a soft pool of the world's colour around the sound source plus contact shadows,
     rendered once per level/size into one layer and copied (cheap on ordinary Android phones) */
  var lightCache = { key: '', cv: null };
  function drawLit(L, th) {
    var key = th.wave + '|' + L.grid.map(function (r) { return r.map(function (c) { return c.t; }).join(''); }).join('/') + '|' + cs + '|' + dpr;
    if (lightCache.key !== key) {
      var w = Math.round(L.W * cs * dpr), h = Math.round(L.H * cs * dpr), cv = document.createElement('canvas'); cv.width = w; cv.height = h;
      var g = cv.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0);
      var src = null, x, y;
      for (y = 0; y < L.H && !src; y++) for (x = 0; x < L.W; x++) if (L.grid[y][x].t === 'S') { src = { x: x, y: y }; break; }
      if (src) {
        var cx = (src.x + .5) * cs, cy = (src.y + .5) * cs, R = Math.max(L.W, L.H) * cs * .62, gr = g.createRadialGradient(cx, cy, 0, cx, cy, R);
        gr.addColorStop(0, th.wave + '40'); gr.addColorStop(.5, th.wave + '12'); gr.addColorStop(1, th.wave + '00'); g.fillStyle = gr; g.fillRect(0, 0, L.W * cs, L.H * cs);
      }
      g.fillStyle = 'rgba(0,0,0,.22)';
      for (y = 0; y < L.H; y++) for (x = 0; x < L.W; x++) {
        var t = L.grid[y][x].t;
        if (t === 'T' || t === 'Z' || t === 'H' || t === 'm' || t === 'n' || t === '/' || t === '\\' || t === 'S' || t === 'x') { g.beginPath(); g.ellipse((x + .5) * cs, (y + .86) * cs, cs * .3, cs * .08, 0, 0, TAU); g.fill(); }
      }
      lightCache = { key: key, cv: cv };
    }
    ctx.drawImage(lightCache.cv, 0, 0, L.W * cs, L.H * cs);
  }
  function drawWave() {
    if (!S.ev) return;
    var tr = S.ev.trace, col = S.theme.wave, T = S.T, done = S.phase === 'result';
    ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    for (var i = 0; i < tr.cells.length; i++) {
      var c = tr.cells[i];
      if (T < c.t - 1) continue;
      col = (hero && S === hero) ? S.theme.wave : waveCol(i);
      var prog = Math.max(0, Math.min(1, T - (c.t - 1)));
      var x0 = (c.px + .5) * cs, y0 = (c.py + .5) * cs, x1 = (c.x + .5) * cs, y1 = (c.y + .5) * cs;
      var ex = x0 + (x1 - x0) * prog, ey = y0 + (y1 - y0) * prog;
      var age = T - c.t, alpha = done ? .3 : (age < 1.2 ? 1 : Math.max(.3, 1.2 - (age - 1.2) * .4));
      ctx.globalAlpha = alpha * .3; ctx.strokeStyle = col; ctx.lineWidth = cs * .34;
      ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(ex, ey); ctx.stroke();
      ctx.globalAlpha = alpha; ctx.lineWidth = cs * .1; ctx.strokeStyle = '#fff';
      ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(ex, ey); ctx.stroke();
      ctx.lineWidth = cs * .05; ctx.strokeStyle = col; ctx.stroke();
      if (!done && !reduced() && prog < 1 && prog > 0) { // wavefront ripples
        for (var r = 0; r < 3; r++) {
          ctx.globalAlpha = (1 - r / 3) * .8; ctx.strokeStyle = col; ctx.lineWidth = cs * .04;
          var ang = Math.atan2(y1 - y0, x1 - x0);
          ctx.beginPath(); ctx.arc(ex - Math.cos(ang) * r * cs * .09, ey - Math.sin(ang) * r * cs * .09, cs * (.14 + .05 * r), ang - 1.1, ang + 1.1); ctx.stroke();
        }
      }
    }
    ctx.restore();
  }

  /* ---------- themed floors: each world gets its own pattern, drawn once and cached ---------- */
  var floorCache = { key: '', cv: null };
  function drawFloor(wid, L) {
    var key = wid + '|' + cs + '|' + dpr + '|' + L.W + 'x' + L.H;
    if (floorCache.key !== key) {
      var cv = document.createElement('canvas'); cv.width = Math.max(1, Math.round(L.W * cs * dpr)); cv.height = Math.max(1, Math.round(L.H * cs * dpr));
      var g = cv.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0);
      var seed = 7 + wid.length * 131; function rnd() { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; }
      for (var y = 0; y < L.H; y++) for (var x = 0; x < L.W; x++) {
        var X = x * cs, Y = y * cs, light = (x + y) & 1;
        g.save(); g.beginPath(); g.rect(X, Y, cs, cs); g.clip();
        if (wid === 'hotel') { g.fillStyle = 'rgba(255,255,255,.05)'; for (var i = 0; i < 4; i++) g.fillRect(X + cs * (i * .25 + .05), Y, cs * .08, cs); g.fillStyle = 'rgba(255,214,120,.18)'; g.beginPath(); g.arc(X + cs / 2, Y + cs / 2, cs * .05, 0, 6.3); g.fill(); }
        else if (wid === 'palace') { g.strokeStyle = 'rgba(255,214,120,' + (light ? .22 : .12) + ')'; g.lineWidth = Math.max(1, cs * .03); g.beginPath(); g.moveTo(X + cs / 2, Y + cs * .12); g.lineTo(X + cs * .88, Y + cs / 2); g.lineTo(X + cs / 2, Y + cs * .88); g.lineTo(X + cs * .12, Y + cs / 2); g.closePath(); g.stroke(); }
        else if (wid === 'mansion') { g.strokeStyle = 'rgba(0,0,0,.22)'; g.lineWidth = Math.max(1, cs * .025); for (i = 1; i < 4; i++) { g.beginPath(); g.moveTo(X, Y + cs * i / 4); g.lineTo(X + cs, Y + cs * i / 4); g.stroke(); } g.beginPath(); var jx = X + cs * (.2 + .6 * rnd()); g.moveTo(jx, Y + cs * .25); g.lineTo(jx, Y + cs * .5); g.stroke(); }
        else if (wid === 'space') { g.strokeStyle = 'rgba(160,190,255,.14)'; g.lineWidth = 1; g.strokeRect(X + .5, Y + .5, cs - 1, cs - 1); if (rnd() < .5) { g.fillStyle = 'rgba(255,255,255,.55)'; g.fillRect(X + cs * rnd(), Y + cs * rnd(), 2, 2); } }
        else if (wid === 'museum') { g.strokeStyle = 'rgba(255,255,255,' + (.07 + rnd() * .06) + ')'; g.lineWidth = Math.max(1, cs * .02); g.beginPath(); g.moveTo(X + cs * rnd(), Y); g.bezierCurveTo(X + cs * rnd(), Y + cs * .3, X + cs * rnd(), Y + cs * .6, X + cs * rnd(), Y + cs); g.stroke(); }
        else if (wid === 'camp') { g.strokeStyle = 'rgba(150,230,120,.25)'; g.lineWidth = Math.max(1, cs * .03); for (i = 0; i < 3; i++) { var gx = X + cs * (.15 + .7 * rnd()), gy = Y + cs * (.45 + .45 * rnd()); g.beginPath(); g.moveTo(gx - cs * .05, gy); g.lineTo(gx, gy - cs * .13); g.lineTo(gx + cs * .05, gy); g.stroke(); } }
        else if (wid === 'cinema') { g.fillStyle = 'rgba(255,200,90,.16)'; var cx = X + cs / 2, cy = Y + cs / 2; g.beginPath(); for (i = 0; i < 10; i++) { var r = i % 2 ? cs * .05 : cs * .12, a = i * Math.PI / 5 - Math.PI / 2; g.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r); } g.closePath(); g.fill(); }
        else if (wid === 'farm') { g.strokeStyle = 'rgba(255,225,130,.22)'; g.lineWidth = Math.max(1, cs * .03); for (i = 0; i < 4; i++) { var hx = X + cs * rnd(), hy = Y + cs * rnd(); g.beginPath(); g.moveTo(hx, hy); g.lineTo(hx + cs * .14, hy - cs * .05); g.stroke(); } }
        else if (wid === 'tower') { g.strokeStyle = 'rgba(255,224,138,.16)'; g.lineWidth = Math.max(1, cs * .03); g.beginPath(); g.arc(X + cs / 2, Y + cs / 2, cs * .3, 0, 6.3); g.stroke(); for (i = 0; i < 8; i++) { var an = i * Math.PI / 4; g.beginPath(); g.moveTo(X + cs / 2 + Math.cos(an) * cs * .3, Y + cs / 2 + Math.sin(an) * cs * .3); g.lineTo(X + cs / 2 + Math.cos(an) * cs * .4, Y + cs / 2 + Math.sin(an) * cs * .4); g.stroke(); } }
        else if (wid === 'park') { var cols = ['#ff7ab6', '#7fd8ff', '#ffe08a', '#a6ff8a']; for (i = 0; i < 3; i++) { g.fillStyle = cols[(rnd() * 4) | 0]; g.globalAlpha = .35; g.fillRect(X + cs * rnd(), Y + cs * rnd(), cs * .06, cs * .06); } g.globalAlpha = 1; }
        g.restore();
      }
      floorCache.key = key; floorCache.cv = cv;
    }
    ctx.drawImage(floorCache.cv, 0, 0, L.W * cs, L.H * cs);
  }

  /* ---------- world complete celebration (drawn in code) ---------- */
  var wd = { raf: 0, world: null };
  function showWorldDone(wid) {
    var w = WORLDS.filter(function (x) { return x.id === wid; })[0]; if (!w) return;
    var th = THEME[wid], mine = LEVELS.filter(function (l) { return l.world === wid; });
    var got = 0; mine.forEach(function (l) { got += save.stars[l.id] || 0; });
    $('wdTitle').textContent = w.name + ' complete!';
    $('wdText').textContent = got + ' of ' + mine.length * 3 + ' stars in this world.' + (got === mine.length * 3 ? ' Perfect smuggling!' : ' Replay levels to collect the rest.');
    var nxt = LEVELS[S.i + 1], nw = nxt ? WORLDS.filter(function (x) { return x.id === nxt.world; })[0] : null;
    $('wdNext').textContent = nw ? 'On to ' + nw.name : 'Keep going'; wd.next = nw ? S.i + 1 : -1;
    $('worldDone').classList.remove('hidden'); wd.world = wid;
    try { $('wdNext').focus({ preventScroll: true }); } catch (e) {}
    var cv = $('wdCv'), g = cv.getContext('2d'), W = 300, H = 120, d = Math.min(window.devicePixelRatio || 1, 2);
    cv.width = W * d; cv.height = H * d; cv.style.width = W + 'px'; cv.style.height = H + 'px';
    var bits = []; for (var i = 0; i < 26; i++) bits.push({ x: (i * 37 % W), v: 18 + (i * 13 % 30), p: i * 1.7, c: ['#ffcf5a', '#ff7eb6', th.wave, '#ffffff'][i % 4] });
    cancelAnimationFrame(wd.raf);
    (function frame() {
      if ($('worldDone').classList.contains('hidden')) return;
      var t = performance.now() / 1000, still = reduced();
      g.setTransform(d, 0, 0, d, 0, 0);
      for (var yy = 0; yy < 3; yy++) for (var xx = 0; xx < 8; xx++) { g.fillStyle = (xx + yy) & 1 ? th.b : th.a; g.fillRect(xx * 40, yy * 40, 40, 40); }
      for (var k = 0; k < 5; k++) {
        var cx = 30 + k * 60, bob = still ? 0 : Math.abs(Math.sin(t * 4 + k * .8)) * 12, base = 92 - bob;
        g.fillStyle = k % 2 ? th.suit : th.hat; g.beginPath(); g.ellipse(cx, base + 6, 17, 20, 0, 0, 6.3); g.fill();
        g.fillStyle = ['#f1c9a5', '#c68863', '#8d5a3b', '#f7d9bd', '#a8714a'][k]; g.beginPath(); g.arc(cx, base - 16, 14, 0, 6.3); g.fill();
        g.fillStyle = th.hat; g.fillRect(cx - 15, base - 31, 30, 8);
        g.fillStyle = '#1b1530'; g.beginPath(); g.arc(cx - 5, base - 16, 2, 0, 6.3); g.arc(cx + 5, base - 16, 2, 0, 6.3); g.fill();
        g.strokeStyle = '#1b1530'; g.lineWidth = 2; g.beginPath(); g.arc(cx, base - 11, 6, .15 * Math.PI, .85 * Math.PI); g.stroke();
      }
      bits.forEach(function (b) { var y = still ? (b.p * 7) % H : ((t * b.v + b.p * 20) % (H + 10)) - 5; g.globalAlpha = .9; g.fillStyle = b.c; g.fillRect(b.x, y, 5, 5); });
      g.globalAlpha = 1;
      wd.raf = requestAnimationFrame(frame);
    })();
  }
  function hideWorldDone() { $('worldDone').classList.add('hidden'); cancelAnimationFrame(wd.raf); }

  function drawBoard() {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    var L = S.L, th = S.theme;
    var sx = 0, sy = 0;
    if (!reduced() && shakeT && timeNow - shakeT < 0.35) { var k = 1 - (timeNow - shakeT) / 0.35; sx = Math.sin(timeNow * 90) * cs * .05 * k; sy = Math.cos(timeNow * 70) * cs * .03 * k; }
    ctx.save(); ctx.translate(sx, sy);
    ctx.fillStyle = th.a; ctx.fillRect(0, 0, L.W * cs, L.H * cs);
    for (var y = 0; y < L.H; y++) for (var x = 0; x < L.W; x++) { if ((x + y) & 1) { ctx.fillStyle = th.b; ctx.fillRect(x * cs, y * cs, cs, cs); } }
    drawFloor((S.lv && S.lv.world) || 'hotel', L);
    for (y = 0; y < L.H; y++) for (x = 0; x < L.W; x++) {
      var c = L.grid[y][x];
      if (c.t === '#') drawWall(x, y);
    }
    drawLit(L, th);
    drawAmbient();
    drawSourcePulse();
    drawWave();
    for (y = 0; y < L.H; y++) for (x = 0; x < L.W; x++) {
      c = L.grid[y][x];
      if (c.t === 'S') drawSource(c);
      else if (c.t === 'x') drawSplitter(c);
      else if (c.t === 'p') drawPortal(c);
      else if (c.t === '/' || c.t === '\\' || c.t === 'm' || c.t === 'n') drawMirror(c);
      else if (c.t === 'T') drawChar(c, 'T');
      else if (c.t === 'Z') drawChar(c, 'Z');
      else if (c.t === 'H') drawChar(c, 'H');
    }
    drawVignette();
    // particles
    for (var i = particles.length - 1; i >= 0; i--) {
      var p = particles[i];
      ctx.globalAlpha = Math.max(0, 1 - p.age / p.life); ctx.fillStyle = p.c;
      ctx.fillRect((p.x - p.w / 2) * cs, (p.y - p.w / 2) * cs, p.w * cs, p.w * cs);
    }
    ctx.globalAlpha = 1; ctx.restore();
  }

  /* ---------- loop ---------- */
  function update(dt) {
    if (!S) return;
    for (var i = particles.length - 1; i >= 0; i--) {
      var p = particles[i]; p.age += dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 9 * dt;
      if (p.age >= p.life) particles.splice(i, 1);
    }
    if (S.phase !== 'playing') return;
    S.T += dt * SPEED;
    var tr = S.ev.trace;
    tr.hits.forEach(function (h) {
      var key = h.x + ',' + h.y;
      if (h.kind === 'M') { if (S.T >= h.t && !S.played['m' + key]) { S.played['m' + key] = 1; sfx('muffle'); sparks(h.x, h.y, '#8ab4ff'); } return; }
      if (S.T >= h.t && S.woken[key] === undefined) {
        S.woken[key] = timeNow;
        if (h.kind === 'T') { sfx('yay'); sparks(h.x, h.y, '#ffcf5a'); } else { sfx('wake'); buzz(25); sparks(h.x, h.y, '#ff5c6c'); }
      }
    });
    tr.cells.forEach(function (c, idx) {
      if (c.c === '#' && S.T >= c.t && !S.played['w' + idx]) { S.played['w' + idx] = 1; sparks(c.x, c.y, '#ffffff'); }
      if (c.c === 'p' && S.T >= c.t && !S.played['p' + idx]) { S.played['p' + idx] = 1; sfx('portal'); sparks(c.x, c.y, '#7fd8ff'); }
    });
    if (S.T >= tr.maxT + 1.1) finish();
  }

  /* animated title-screen scene: reuses the real board renderer on a tiny 4x2 puzzle */
  var hero = null;
  function drawHero() {
    var hc = $('hero'); if (!hc) return;
    var box = hc.parentNode.getBoundingClientRect();
    var w = Math.min(340, box.width * 0.86), h = Math.min(170, window.innerHeight * 0.22);
    var hcs = Math.floor(Math.min(w / 4, h / 2)); if (hcs < 20) return;
    var d = Math.min(window.devicePixelRatio || 1, 2);
    if (!hero) {
      var L = Core.parse({ grid: ['.T..', '>/.Z'] });
      hero = { L: L, theme: THEME.hotel, lv: { world: 'hotel' }, ev: Core.evaluate(L, []), phase: 'playing', flip: {}, mirrorAng: [], woken: {}, hintMi: -1, kfocus: -1, result: null, played: {}, T: 0, shot: -100, cs: 0 };
    }
    if (hero.cs !== hcs) { hero.cs = hcs; hc.style.width = hcs * 4 + 'px'; hc.style.height = hcs * 2 + 'px'; hc.width = Math.round(hcs * 4 * d); hc.height = Math.round(hcs * 2 * d); }
    var t = reduced() ? 2.2 : (timeNow % 5.5);
    if (t < 0.05) hero.woken = {};
    hero.T = t * 3.4;
    hero.ev.trace.hits.forEach(function (hit) { var k = hit.x + ',' + hit.y; if (hero.T >= hit.t && hero.woken[k] === undefined) hero.woken[k] = timeNow - (reduced() ? 0.5 : 0); });
    var sS = S, sctx = ctx, scs = cs, sdpr = dpr, sShake = shakeT;
    S = hero; ctx = hc.getContext('2d'); dpr = d; cs = hcs; shakeT = 0;
    drawBoard();
    S = sS; ctx = sctx; cs = scs; dpr = sdpr; shakeT = sShake;
  }

  function frame(ts) {
    var dt = Math.min(0.05, (ts - lastTs) / 1000 || 0); lastTs = ts; timeNow = ts / 1000;
    if (document.hidden) { requestAnimationFrame(frame); return; } // no drawing or simulation while the app is in the background
    if (current === 'game' && S) { update(dt); drawBoard(); }
    else if (current === 'menu') drawHero();
    requestAnimationFrame(frame);
  }

  /* ---------- UI wiring ---------- */
  function buildLevelList() {
    var host = $('levelList'); host.innerHTML = '';
    WORLDS.forEach(function (w) {
      var box = document.createElement('div'); box.className = 'world';
      box.innerHTML = '<h3></h3><p></p><div class="lvls"></div>';
      box.querySelector('h3').textContent = w.name;
      var wl = LEVELS.filter(function (l) { return l.world === w.id; }), got = 0;
      wl.forEach(function (l) { got += save.stars[l.id] || 0; });
      box.querySelector('p').textContent = w.goal + ' with: ' + w.soundName + ' \u00b7 \u2605 ' + got + '/' + wl.length * 3;
      var grid = box.querySelector('.lvls');
      LEVELS.forEach(function (l, i) {
        if (l.world !== w.id) return;
        var open = isUnlocked(i), b = document.createElement('button');
        b.className = 'lv' + (open ? '' : ' locked'); b.disabled = !open;
        var st = save.stars[l.id] || 0;
        b.innerHTML = '<span>' + l.id + '</span><small>' + (st ? '★'.repeat(st) : '&nbsp;') + '</small>';
        b.setAttribute('aria-label', 'Level ' + l.id + ', ' + l.title + (open ? '' : ', locked') + (st ? ', ' + st + ' stars' : ''));
        b.addEventListener('click', function () { if (isUnlocked(i)) { ac(); loadLevel(i); } });
        grid.appendChild(b);
      });
      host.appendChild(box);
    });
  }
  function firstOpen() {
    for (var i = 0; i < LEVELS.length; i++) if (!(save.stars[LEVELS[i].id] > 0)) return i;
    return LEVELS.length - 1;
  }
  function refreshMenu() {
    var k = Gen.dailyKey(), d = save.daily[k], n = streak();
    $('dailyBadge').textContent = d ? '★'.repeat(d.stars) + (n > 1 ? ' · ' + n + ' days' : ' done') : 'New today';
  }
  function syncSettings() {
    $('btnMuteG').textContent = save.muted ? 'Sound off' : 'Sound on';
    $('setMute').textContent = save.muted ? 'Muted' : 'Sound on';
    $('setReduce').textContent = reduced() ? 'On' : 'Off';
    $('setVib').textContent = save.vib !== false ? 'On' : 'Off';
    $('setMusic').textContent = save.music !== false ? 'On' : 'Off';
    var aw = activeWave(), nx = WAVES.filter(function (x) { return x.need > totalStars(); })[0];
    $('setSkin').textContent = aw.name;
    $('skinHint').textContent = nx ? 'Next wave style at ' + nx.need + ' stars (you have ' + totalStars() + ')' : 'All wave styles unlocked';
    $('volume').value = Math.round(save.vol * 100);
    document.body.classList.toggle('reduce', reduced());
    var buy = !!(Mon && Mon.canPurchase());
    $('rowRemoveAds').hidden = !buy;
    if (buy) $('setRemoveAds').textContent = Mon.priceLabel() || 'Buy';
  }
  function toggleMute() { save.muted = !save.muted; persist(); syncSettings(); if (!save.muted) { ac(); sfx('flip'); } }

  $('btnPlay').addEventListener('click', function () { ac(); loadLevel(firstOpen()); });
  $('btnDaily').addEventListener('click', function () { ac(); startDaily(); });
  $('btnEndless').addEventListener('click', function () { ac(); show('diff'); });
  $('btnLevels').addEventListener('click', function () { ac(); buildLevelList(); show('levels'); });
  $('btnSettings').addEventListener('click', function () { syncSettings(); show('settings'); });
  $('diffBack').addEventListener('click', function () { show('menu'); });
  $('levelsBack').addEventListener('click', function () { show('menu'); });
  $('settingsBack').addEventListener('click', function () { show('menu'); });
  Array.prototype.forEach.call(document.querySelectorAll('[data-diff]'), function (b) {
    b.addEventListener('click', function () { ac(); newEndless(b.getAttribute('data-diff')); });
  });
  $('btnMenu').addEventListener('click', function () { leaveGame('menu'); });
  $('btnMuteG').addEventListener('click', toggleMute);
  $('setMute').addEventListener('click', toggleMute);
  $('setReduce').addEventListener('click', function () { save.reduce = !reduced(); persist(); syncSettings(); });
  $('setMusic').addEventListener('click', function () { save.music = save.music === false; persist(); syncSettings(); if (save.music) ac(); });
  $('setVib').addEventListener('click', function () { save.vib = save.vib === false; persist(); syncSettings(); buzz(30); });
  $('setSkin').addEventListener('click', function () {
    var cur = activeWave(), idx = WAVES.indexOf(cur), n = WAVES.length;
    for (var k = 1; k <= n; k++) { var cand = WAVES[(idx + k) % n]; if (totalStars() >= cand.need) { save.skin = cand.id; break; } }
    persist(); syncSettings(); sfx('flip');
  });
  $('volume').addEventListener('input', function () { save.vol = Math.max(0, Math.min(1, (+this.value || 0) / 100)); setVolume(); persist(); });
  $('volume').addEventListener('change', function () { ac(); sfx('flip'); });
  $('setRemoveAds').addEventListener('click', function () { Mon.purchaseRemoveAds().then(function () { syncSettings(); }); });
  $('setExport').addEventListener('click', function () {
    try {
      var blob = new Blob([JSON.stringify({ app: 'noise-smuggler', v: 1, exported: new Date().toISOString().slice(0, 10), data: save }, null, 1)], { type: 'application/json' });
      var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'noise-smuggler-progress.json';
      document.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000); toast('Backup saved');
    } catch (e) { toast('Could not create the backup'); }
  });
  $('setImport').addEventListener('click', function () { $('impFile').click(); });
  $('impFile').addEventListener('change', function () {
    var f = this.files && this.files[0]; this.value = '';
    if (!f) return;
    if (f.size > 200000) { toast('That file is too big to be a backup'); return; }
    var rd = new FileReader();
    rd.onload = function () {
      try {
        var o = JSON.parse(String(rd.result)); if (!o || o.app !== 'noise-smuggler' || !o.data) throw 0;
        var before = JSON.parse(JSON.stringify(save)); applySave(o.data);
        Object.keys(before.stars).forEach(function (k) { if (!(save.stars[k] >= before.stars[k])) save.stars[k] = before.stars[k]; }); // never lose stars: keep the best of both
        Object.keys(before.daily).forEach(function (k) { if (!save.daily[k]) save.daily[k] = before.daily[k]; });
        save.stats.endless = Math.max(save.stats.endless, before.stats.endless);
        persist(); syncSettings(); refreshMenu(); toast('Progress restored: ' + totalStars() + ' stars');
      } catch (e) { toast('That is not a Noise Smuggler backup'); }
    };
    rd.onerror = function () { toast('Could not read that file'); };
    rd.readAsText(f);
  });
  $('setReset').addEventListener('click', function () {
    var b = this;
    if (!b.dataset.armed) { b.dataset.armed = '1'; b.textContent = 'Tap to confirm'; setTimeout(function () { delete b.dataset.armed; b.textContent = 'Erase'; }, 4000); return; }
    delete b.dataset.armed; save.stars = {}; save.daily = {}; save.stats = { endless: 0 }; hintsCache = {}; persist(); b.textContent = 'Erased';
    setTimeout(function () { b.textContent = 'Erase'; }, 1500);
  });
  $('btnRelease').addEventListener('click', function () { ac(); release(); });
  $('btnRestart').addEventListener('click', restart);
  $('btnHint').addEventListener('click', hint);
  $('btnUndo').addEventListener('click', undo);
  $('wdNext').addEventListener('click', function () { var n = wd.next; hideWorldDone(); if (n >= 0 && S && S.mode === 'campaign') loadLevel(n); });
  $('linkPrivacy').addEventListener('click', function (e) { e.preventDefault(); show('privacy'); });
  var ED = { W: 7, H: 8, g: [], tool: '#', built: false };
  var ED_TOOLS = [['.', '\u2715', 'Erase'], ['#', '\u2593', 'Wall'], ['>', '\u25b6', 'Sound right'], ['v', '\u25bc', 'Sound down'], ['<', '\u25c0', 'Sound left'], ['^', '\u25b2', 'Sound up'], ['T', '\u2605', 'Star'], ['Z', '\ud83d\ude34', 'Sleeper'], ['H', '\ud83d\udca4', 'Deep sleeper'], ['m', '\u2571', 'Mirror /'], ['n', '\u2572', 'Mirror \\'], ['x', '\u271a', 'Splitter'], ['p', '\u25ce', 'Portal']];
  function edGlyph(c) { for (var i = 0; i < ED_TOOLS.length; i++) if (ED_TOOLS[i][0] === c) return c === '.' ? '' : ED_TOOLS[i][1]; return ''; }
  function edReset() { ED.g = []; for (var y = 0; y < ED.H; y++) { var r = []; for (var x = 0; x < ED.W; x++) r.push('.'); ED.g.push(r); } }
  function edRows() { return ED.g.map(function (r) { return r.join(''); }); }
  function edRender() {
    var grid = $('edGrid');
    if (!ED.built) {
      ED.built = true; edReset(); grid.style.gridTemplateColumns = 'repeat(' + ED.W + ',1fr)';
      for (var i = 0; i < ED.W * ED.H; i++) { var b = document.createElement('button'); b.className = 'edcell'; b.setAttribute('data-i', i); b.setAttribute('aria-label', 'Square ' + (i % ED.W + 1) + ',' + (Math.floor(i / ED.W) + 1)); grid.appendChild(b); }
      var tools = $('edTools');
      ED_TOOLS.forEach(function (t) { var b = document.createElement('button'); b.className = 'edtool'; b.setAttribute('data-tool', t[0]); b.setAttribute('title', t[2]); b.setAttribute('aria-label', t[2]); b.textContent = t[1]; tools.appendChild(b); });
      grid.addEventListener('click', function (e) {
        var b = e.target.closest ? e.target.closest('.edcell') : null; if (!b) return;
        var i = +b.getAttribute('data-i'), x = i % ED.W, y = Math.floor(i / ED.W);
        ED.g[y][x] = (ED.tool !== '.' && ED.g[y][x] === ED.tool) ? '.' : ED.tool; edRender(); sfx('flip'); save.draft = codeOf(edRows()); persist();
      });
      tools.addEventListener('click', function (e) { var b = e.target.closest ? e.target.closest('.edtool') : null; if (!b) return; ED.tool = b.getAttribute('data-tool'); edRender(); });
    }
    var cells = grid.children;
    for (var k = 0; k < cells.length; k++) { var ch = ED.g[Math.floor(k / ED.W)][k % ED.W]; cells[k].textContent = edGlyph(ch); cells[k].setAttribute('data-c', ch); }
    var tb = $('edTools').children; for (var j = 0; j < tb.length; j++) tb[j].classList.toggle('on', tb[j].getAttribute('data-tool') === ED.tool);
  }
  function edMsg(t, good) { var m = $('edMsg'); m.textContent = t; m.classList.toggle('good', !!good); }
  $('btnCreate').addEventListener('click', function () {
    ac(); show('editor'); edRender();
    var d = save.draft ? rowsOf(save.draft) : null;
    if (d && d.length === ED.H && d[0].length === ED.W) { ED.g = d.map(function (r) { return r.split(''); }); edRender(); edMsg('Your last draft is back. Keep building, or Clear to start over.'); }
    else edMsg('Pick a tool, then tap squares. Sound arrows make the noise, stars must wake, sleepers must stay asleep.');
  });
  $('edBack').addEventListener('click', function () { show('menu'); });
  $('edClear').addEventListener('click', function () { edReset(); edRender(); delete save.draft; persist(); edMsg('Cleared. Build something sneaky.'); });
  $('edPlay').addEventListener('click', function () {
    var r = checkPuzzle(edRows());
    if (!r.ok) { edMsg(r.msg); sfx('oops'); buzz(40); return; }
    edMsg('Solvable in ' + r.par + ' tap' + (r.par > 1 ? 's' : '') + (r.lv.solutions === 1 ? ' with exactly one solution: a proper puzzle.' : ' (' + r.lv.solutions + ' ways, so it is forgiving).') + ' Now solve it yourself, then share the link.', true);
    startLevel(r.lv, { mode: 'custom', from: 'editor' });
  });
  $('btnHow').addEventListener('click', function () { ac(); show('howto'); });
  $('howBack').addEventListener('click', function () { show('menu'); });
  var installEv = null;
  window.addEventListener('beforeinstallprompt', function (e) { e.preventDefault(); installEv = e; var r = $('installRow'); if (r) r.hidden = false; });
  window.addEventListener('appinstalled', function () { installEv = null; var r = $('installRow'); if (r) r.hidden = true; });
  $('btnInstall').addEventListener('click', function () { if (installEv) { installEv.prompt(); installEv = null; $('installRow').hidden = true; } });
  $('privacyBack').addEventListener('click', function () { syncSettings(); show('settings'); });
  window.addEventListener('error', function () { try { toast('Something went wrong. Your progress is safe.'); } catch (e) {} });
  window.addEventListener('ns:adstart', function () { try { if (AC && AC.suspend) AC.suspend(); } catch (e) {} });
  window.addEventListener('ns:adend', function () { try { if (AC && AC.resume && !save.muted && !document.hidden) AC.resume(); } catch (e) {} });
  $('sheetShare').addEventListener('click', shareResult);
  $('sheetAgain').addEventListener('click', function () { if (S.result && S.result.win) restart(); else retry(); });
  $('sheetNext').addEventListener('click', function () {
    if (S.result && S.result.win) {
      var go = function () {
        if (S.mode === 'campaign') { if (S.i >= LEVELS.length - 1) show('menu'); else loadLevel(S.i + 1); }
        else if (S.mode === 'daily') show('menu');
        else if (S.mode === 'custom') { if (S.from === 'editor') shareCustom(S.lv.code); else show('menu'); }
        else newEndless(S.lv.diff);
      };
      if (Mon && Mon.atBreak) Mon.atBreak().then(go, go); else go();
    } else { retry(); hint(); }
  });

  canvas.addEventListener('pointerdown', function (e) {
    if (!S) return; ac();
    var r = canvas.getBoundingClientRect(), x = Math.floor((e.clientX - r.left) / r.width * S.L.W), y = Math.floor((e.clientY - r.top) / r.height * S.L.H);
    if (x < 0 || y < 0 || x >= S.L.W || y >= S.L.H) return;
    var c = S.L.grid[y][x];
    if (c.mi >= 0) { S.kfocus = -1; flipMirror(c.mi); }
  });
  window.addEventListener('keydown', function (e) {
    if (current !== 'game' || !S) return;
    var tag = e.target && e.target.tagName, k = e.key;
    if (tag === 'INPUT' || tag === 'TEXTAREA') return;
    if (k === 'Escape') { leaveGame('menu'); return; }
    if (S.phase !== 'setup') return;
    if (tag === 'BUTTON' && (k === ' ' || k === 'Enter')) return; // let focused buttons behave normally
    var n = S.L.mirrors.length;
    if (k === 'ArrowRight' || k === 'ArrowDown') { S.kfocus = (S.kfocus + 1) % n; e.preventDefault(); }
    else if (k === 'ArrowLeft' || k === 'ArrowUp') { S.kfocus = (S.kfocus <= 0 ? n : S.kfocus) - 1; e.preventDefault(); }
    else if (k === ' ') { e.preventDefault(); if (S.kfocus < 0) S.kfocus = 0; else flipMirror(S.kfocus); }
    else if (k === 'Enter') { e.preventDefault(); release(); }
    else if (k === 'r' || k === 'R') restart();
    else if (k === 'h' || k === 'H') hint();
  });
  window.addEventListener('resize', resize);
  window.addEventListener('orientationchange', function () { setTimeout(resize, 120); });
  if (window.ResizeObserver) new ResizeObserver(resize).observe($('boardWrap'));
  document.addEventListener('visibilitychange', function () { // pause/resume: stop audio in the background
    if (!AC) return;
    try { if (document.hidden) AC.suspend(); else if (!save.muted) AC.resume(); } catch (e) {}
  });
  window.addEventListener('pagehide', persist);
  if (mql && mql.addEventListener) mql.addEventListener('change', syncSettings);

  if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
    window.addEventListener('load', function () { navigator.serviceWorker.register('sw.js').catch(function () {}); });
  }

  syncSettings(); refreshMenu();
  requestAnimationFrame(frame);
  var pz = parsePuzzleParam();
  if (pz) {
    var prow = rowsOf(pz), pr = prow ? checkPuzzle(prow) : null;
    if (pr && pr.ok) startLevel(pr.lv, { mode: 'custom', from: 'link' }); else toast('That puzzle link is not valid.');
  }
  var ch = pz ? null : parseChallenge();
  if (ch) { var clv = Gen.generate(ch.diff, ch.seed); if (clv) startLevel(clv, { mode: 'endless' }); }

  if (TESTING) { // hooks for the automated tests only
    window.NSGame = {
      load: loadLevel, flip: flipMirror, release: release, get: function () { return S; }, save: function () { return save; },
      daily: startDaily, endless: function (d) { var lv = Gen.generate(d, 12345); startLevel(lv, { mode: 'endless' }); },
      save: function () { return JSON.parse(JSON.stringify(save)); },
      rec: { // audio capture for promo clips (tests only)
        start: function () { ac(); var d = AC.createMediaStreamDestination(); master.connect(d); var ch = []; var r = new MediaRecorder(d.stream, { mimeType: 'audio/webm' }); r.ondataavailable = function (e) { ch.push(e.data); }; window.__rec = { r: r, ch: ch }; r.start(); return performance.now(); },
        stop: function () { return new Promise(function (res) { var R = window.__rec; R.r.onstop = function () { var fr = new FileReader(); fr.onload = function () { res(fr.result.split(',')[1]); }; fr.readAsDataURL(new Blob(R.ch, { type: 'audio/webm' })); }; R.r.stop(); }); }
      },
      cell: function (x, y) { var r = canvas.getBoundingClientRect(); return { x: r.left + (x + .5) * r.width / S.L.W, y: r.top + (y + .5) * r.height / S.L.H }; }
    };
  }
})();
