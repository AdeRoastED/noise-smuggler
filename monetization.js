/* Noise Smuggler - platform-independent monetization adapter (Adeba Studio).
   By default NO provider is registered: the game shows no ads, offers no purchase and stays fully playable.
   A platform build (CrazyGames, Google Play/AdMob wrapper, itch.io, a web ad network...) registers one provider:

     NSMonetization.registerProvider({
       name: 'example',
       reportsShown: true,   // optional. true = the provider calls h.shown() the moment the ad is really on screen (recommended for native SDKs)
       showInterstitial: function (h) { return Promise.resolve(true); },   // resolves when the ad is dismissed; false if it never showed
       showRewarded:     function (h) { return Promise.resolve(true); },   // resolves true only if the reward was earned
       purchaseRemoveAds:function ()  { return Promise.resolve(true); },   // optional; resolves true on a completed purchase
       restorePurchases: function ()  { return Promise.resolve(false); },  // optional
       priceLabel:       '2.99 EUR'                                        // optional text from the store; provisional price
     });

   Rules enforced here, so a provider cannot break them:
   - never during an active puzzle, and never after a retry or a failed attempt (only atBreak() on a win, from the Next button)
   - the first FREE_MISSIONS campaign missions are completely ad-free
   - never when the player owns "remove ads"; never in the puzzle creator or on shared custom puzzles
   - at most one break ad per BREAK_EVERY first-time completed puzzles (campaign, daily, weekly, endless and Master all count,
     each distinct puzzle once), never within MIN_GAP_MS of the previous one
   - a puzzle solved again (replay) does not count; this history is kept in localStorage so it survives restarts
   - only one ad at a time. Timing: a provider that reports shown() gets LOAD_TIMEOUT_MS to start the ad (otherwise it is treated as
     failed), after which a real video may play for up to MAX_AD_MS. A provider that does not report shown() gets UNKNOWN_TIMEOUT_MS overall.
     Late callbacks from an abandoned ad are ignored. If the app comes back to the foreground and the ad never called back, it is
     released after RESUME_GRACE_MS. Any provider error is swallowed: the game continues as if nothing happened.
*/
(function () {
  'use strict';
  var BREAK_EVERY = 3, MIN_GAP_MS = 90000, FREE_MISSIONS = 5, REWARD_GAP_MS = 20000;
  var LOAD_TIMEOUT_MS = 10000, MAX_AD_MS = 180000, UNKNOWN_TIMEOUT_MS = 60000, RESUME_GRACE_MS = 4000, MAX_SEEN = 600;
  var KEY = 'adeba.noisesmuggler.iap.v1', HKEY = 'adeba.noisesmuggler.ads.v1';
  var provider = null, premium = false, busy = false, cur = null;
  var H = { wins: 0, lastAd: 0, lastReward: 0, due: false, seen: [] };   // persisted ad history
  try { premium = localStorage.getItem(KEY) === 'premium'; } catch (e) {}
  function load() {
    try {
      var p = JSON.parse(localStorage.getItem(HKEY) || 'null'); if (!p || typeof p !== 'object') return;
      var n = function (v) { return typeof v === 'number' && v >= 0 && v < 4e12 ? v : 0; };
      H.wins = n(p.wins) % 1000000; H.lastAd = n(p.lastAd); H.lastReward = n(p.lastReward); H.due = p.due === true;
      H.seen = Array.isArray(p.seen) ? p.seen.filter(function (k) { return typeof k === 'string' && k.length < 60; }).slice(-MAX_SEEN) : [];
    } catch (e) {}
  }
  function store() { try { localStorage.setItem(HKEY, JSON.stringify(H)); } catch (e) {} }
  load();

  function emit(name) { try { window.dispatchEvent(new CustomEvent(name)); } catch (e) {} }
  function eligible(ctx) { // may this puzzle take part in the ad schedule at all?
    ctx = ctx || {};
    if (ctx.mode === 'custom') return false;
    if (ctx.mode === 'campaign' && ctx.id <= FREE_MISSIONS) return false;
    return true;
  }

  /* Runs one ad. Resolves exactly once, always, with true/false. Never rejects. */
  function safe(fn, reportsShown) {
    if (busy) return Promise.resolve(false);
    busy = true; emit('ns:adstart');
    return new Promise(function (resolve) {
      var run = { done: false, shown: false, timer: 0, grace: 0 };
      cur = run;
      function finish(v) {
        if (run.done) return; run.done = true; clearTimeout(run.timer); clearTimeout(run.grace);
        if (cur === run) cur = null;
        busy = false; emit('ns:adend'); resolve(!!v);
      }
      run.finish = finish;
      run.arm = function (ms) { clearTimeout(run.timer); run.timer = setTimeout(function () { finish(false); }, ms); };
      run.arm(reportsShown ? LOAD_TIMEOUT_MS : UNKNOWN_TIMEOUT_MS);
      var h = { shown: function () { if (run.done || run.shown) return; run.shown = true; run.arm(MAX_AD_MS); } };
      var p; try { p = fn(h); } catch (e) { finish(false); return; }
      Promise.resolve(p).then(function (v) { finish(v); }, function () { finish(false); });
    });
  }
  if (typeof document !== 'undefined') document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'visible' && cur && cur.shown && !cur.done) { // back from a native ad whose callback never arrived
      clearTimeout(cur.grace); var run = cur; run.grace = setTimeout(function () { run.finish(false); }, RESUME_GRACE_MS);
    }
  });

  window.NSMonetization = {
    registerProvider: function (p) { provider = p || null; },
    providerName: function () { return provider ? provider.name || 'custom' : 'none'; },
    isPremium: function () { return premium; },
    /* Called once when a puzzle is solved. ctx = {mode, id, key}. key identifies the exact puzzle; a puzzle counts only once, ever. */
    noteWin: function (ctx) {
      if (!eligible(ctx)) return;
      var k = ctx.key || ((ctx.mode || '') + ':' + (ctx.id || ''));
      if (H.seen.indexOf(k) >= 0) return;
      H.seen.push(k); if (H.seen.length > MAX_SEEN) H.seen.shift();
      H.wins++; if (H.wins % BREAK_EVERY === 0) H.due = true;
      store();
    },
    /* Called when the player presses Next after a win. Resolves when it is safe to continue. Never shows more than one ad. */
    atBreak: function (ctx) {
      if (premium || !provider || !provider.showInterstitial || !eligible(ctx) || !H.due || busy) return Promise.resolve(false);
      var now = Date.now(); if (H.lastAd > now) H.lastAd = now;   // the clock was set back: never block forever
      if (now - H.lastAd < MIN_GAP_MS) return Promise.resolve(false);
      H.due = false; H.lastAd = now; store();                     // recorded BEFORE showing, so a crash or restart cannot repeat it
      var pr = provider;
      return safe(function (h) { return pr.showInterstitial(h); }, !!pr.reportsShown);
    },
    canRewardHint: function () { return !premium && !!provider && !!provider.showRewarded; },
    rewardHint: function () {
      var now = Date.now(); if (H.lastReward > now) H.lastReward = now;
      if (!this.canRewardHint() || busy || now - H.lastReward < REWARD_GAP_MS) return Promise.resolve(false);
      H.lastReward = now; store();
      var pr = provider;
      return safe(function (h) { return pr.showRewarded(h); }, !!pr.reportsShown);
    },
    canPurchase: function () { return !premium && !!provider && !!provider.purchaseRemoveAds; },
    priceLabel: function () { return provider && provider.priceLabel ? provider.priceLabel : ''; },
    purchaseRemoveAds: function () {
      if (!this.canPurchase()) return Promise.resolve(false);
      var pr = provider;
      return safe(function () { return pr.purchaseRemoveAds(); }, false).then(function (ok) {
        if (ok) { premium = true; try { localStorage.setItem(KEY, 'premium'); } catch (e) {} }
        return ok;
      });
    },
    restore: function () {
      if (!provider || !provider.restorePurchases) return Promise.resolve(false);
      var pr = provider;
      return safe(function () { return pr.restorePurchases(); }, false).then(function (ok) {
        if (ok) { premium = true; try { localStorage.setItem(KEY, 'premium'); } catch (e) {} }
        return ok;
      });
    },
    /* "Erase my progress": forget which puzzles were counted, but keep the time of the last ad so erasing cannot be used to dodge the gap. */
    resetHistory: function () { H.wins = 0; H.due = false; H.seen = []; store(); },
    isBusy: function () { return busy; },
    _test: { reset: function () { H = { wins: 0, lastAd: 0, lastReward: 0, due: false, seen: [] }; store(); busy = false; cur = null; },
             reload: function () { H = { wins: 0, lastAd: 0, lastReward: 0, due: false, seen: [] }; load(); },
             state: function () { return JSON.parse(JSON.stringify(H)); },
             timing: function (o) { if (o.load) LOAD_TIMEOUT_MS = o.load; if (o.max) MAX_AD_MS = o.max; if (o.unk) UNKNOWN_TIMEOUT_MS = o.unk; if (o.grace) RESUME_GRACE_MS = o.grace; } }
  };
})();
