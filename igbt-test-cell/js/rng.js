/* rng.js: noise hook n(x, σ) (03 §6, 02 §10).
   σ = 0 (the default): n(x) = x and the PRNG is never consulted.
   σ > 0 (P1): multiplicative Gaussian x · (1 + σ·z), z truncated at ±3 (so ±3σ).
   Per-quantity sub-seed = FNV-1a 32-bit hash of "<seed>:<quantity_id>"; mulberry32 from that
   sub-seed; Box–Muller; redraw while |z| > 3. Every call starts a fresh generator from its
   sub-seed, so a value depends only on (x, σ, seed, quantity), never on call order. */
window.IGBT = window.IGBT || {};
window.IGBT.rng = (function () {
  var prngCalls = 0;   // stays 0 while σ = 0 (checked by selfcheck)

  // FNV-1a, 32-bit, over the UTF-16 code units of a string
  function fnv1a(str) {
    var h = 0x811c9dc5;
    for (var i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 0x01000193) >>> 0;
    }
    return h >>> 0;
  }
  // mulberry32: uniform in [0, 1)
  function mulberry32(a) {
    return function () {
      prngCalls++;
      a = (a + 0x6D2B79F5) >>> 0;
      var t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  // Standard Gaussian truncated at ±3 for (seed, quantity)
  function z(seed, quantityId) {
    var next = mulberry32(fnv1a(String(seed) + ":" + String(quantityId)));
    for (var i = 0; i < 1000; i++) {
      var u1 = 1 - next(), u2 = next();            // u1 in (0, 1]
      var g = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
      if (Math.abs(g) <= 3) return g;
    }
    return 0;   // not reached in practice (P(|z| > 3) ≈ 0.27 % per draw)
  }

  // factor(σ, seed, q) = 1 + σ·z; exactly 1 for σ = 0
  function factor(sigma, seed, quantityId) {
    if (!(sigma > 0)) return 1;
    return 1 + sigma * z(seed, quantityId);
  }
  // n(x, sigma, seed, quantityId): multiplicative noise; σ = 0 returns x unchanged
  function n(x, sigma, seed, quantityId) {
    if (!(sigma > 0)) return x;
    return x * factor(sigma, seed, quantityId);
  }

  return { n: n, factor: factor, fnv1a: fnv1a, prngCalls: function () { return prngCalls; } };
})();
