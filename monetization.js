/* Noise Smuggler - platform-independent monetization adapter (Adeba Studio).
   By default NO provider is registered: the game shows no ads, offers no purchase and stays fully playable.
   A platform build (CrazyGames, Google Play, itch.io, a web ad network...) registers one provider:

     NSMonetization.registerProvider({
       name: 'example',
       showInterstitial: function () { return Promise.resolve(true); },   // optional; resolves when the break is over
       showRewarded:     function () { return Promise.resolve(true); },   // optional; resolves true only if the reward was earned
       purchaseRemoveAds:function () { return Promise.resolve(true); },   // optional; resolves true on a completed purchase
       restorePurchases: function () { return Promise.resolve(false); },  // optional
       priceLabel:       '2.99 EUR'                                       // optional text from the store; provisional price
     });

   Rules enforced here, so a provider cannot break them:
   - never during an active puzzle (callers only use atBreak() on the result screen)
   - never when the player owns "remove ads"
   - at most one break ad per BREAK_EVERY completed puzzles, never within MIN_GAP_MS of the previous one
   - any provider error or timeout is swallowed: the game continues as if nothing happened
*/
(function () {
  'use strict';
  var BREAK_EVERY = 3, MIN_GAP_MS = 90000, TIMEOUT_MS = 8000;
  var KEY = 'adeba.noisesmuggler.iap.v1';
  var provider = null, completed = 0, lastAd = 0, premium = false;
  try { premium = localStorage.getItem(KEY) === 'premium'; } catch (e) {}

  function withTimeout(p) {
    return new Promise(function (resolve) {
      var done = false, t = setTimeout(function () { if (!done) { done = true; resolve(false); } }, TIMEOUT_MS);
      Promise.resolve(p).then(function (v) { if (!done) { done = true; clearTimeout(t); resolve(!!v); } },
        function () { if (!done) { done = true; clearTimeout(t); resolve(false); } });
    });
  }
  function emit(name) { try { window.dispatchEvent(new CustomEvent(name)); } catch (e) {} }
  function safe(fn) { // game audio is paused while any ad runs (listeners live in game.js)
    emit('ns:adstart');
    var p; try { p = withTimeout(fn()); } catch (e) { p = Promise.resolve(false); }
    return p.then(function (v) { emit('ns:adend'); return v; });
  }

  window.NSMonetization = {
    registerProvider: function (p) { provider = p || null; },
    providerName: function () { return provider ? provider.name || 'custom' : 'none'; },
    isPremium: function () { return premium; },
    /* Called on the result screen after a win, before moving on. Resolves when it is safe to continue. */
    atBreak: function () {
      completed++;
      if (premium || !provider || !provider.showInterstitial) return Promise.resolve(false);
      var now = Date.now();
      if (completed % BREAK_EVERY !== 0 || now - lastAd < MIN_GAP_MS) return Promise.resolve(false);
      lastAd = now;
      return safe(function () { return provider.showInterstitial(); });
    },
    canRewardHint: function () { return !premium && !!provider && !!provider.showRewarded; },
    rewardHint: function () { return this.canRewardHint() ? safe(function () { return provider.showRewarded(); }) : Promise.resolve(false); },
    canPurchase: function () { return !premium && !!provider && !!provider.purchaseRemoveAds; },
    priceLabel: function () { return provider && provider.priceLabel ? provider.priceLabel : ''; },
    purchaseRemoveAds: function () {
      if (!this.canPurchase()) return Promise.resolve(false);
      return safe(function () { return provider.purchaseRemoveAds(); }).then(function (ok) {
        if (ok) { premium = true; try { localStorage.setItem(KEY, 'premium'); } catch (e) {} }
        return ok;
      });
    },
    restore: function () {
      if (!provider || !provider.restorePurchases) return Promise.resolve(false);
      return safe(function () { return provider.restorePurchases(); }).then(function (ok) {
        if (ok) { premium = true; try { localStorage.setItem(KEY, 'premium'); } catch (e) {} }
        return ok;
      });
    }
  };
})();
