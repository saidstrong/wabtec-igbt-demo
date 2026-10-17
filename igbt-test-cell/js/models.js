/* models.js: the 02 §8 micro-models. Pure functions on numbers, no DOM.
   Each returns { value, equation }; the equation text is built from the actual
   input values (never hard-coded). Units: as in the parameter names. */
window.IGBT = window.IGBT || {};
window.IGBT.models = (function () {

  function minus(s) { return s.charAt(0) === "-" ? "−" + s.slice(1) : s; }
  // Natural number text without float noise (2.4000000000000004 → "2.4")
  function num(x) { return minus(String(Number(Number(x).toPrecision(12)))); }
  function fixed(x, dp) { var p = Math.pow(10, dp); return minus((Math.round(x * p) / p).toFixed(dp)); }
  // At least 3 decimals for small resistances (0.007 Ω, 0.012 Ω), more only if needed (0.0075 Ω)
  function ohms(r) { return Math.abs(Number(r.toFixed(3)) - r) < 1e-12 ? fixed(r, 3) : num(r); }

  // Conduction drop (T05): V_CE(sat) = vce0_v + (r_ce_mohm/1000) · i_pulse_a
  function vceSat(vce0_v, r_ce_mohm, i_pulse_a) {
    var r = r_ce_mohm / 1000;
    var v = vce0_v + r * i_pulse_a;
    return { value: v, equation: "V_CE(sat) = " + fixed(vce0_v, 2) + " V + " + ohms(r) + " Ω × " + num(i_pulse_a) + " A = " + fixed(v, 2) + " V" };
  }

  // Load-inductor ramp (T08a): t1_us = l_load_uh · i_pulse_a / v_dc_test_v
  function t1(l_load_uh, i_pulse_a, v_dc_test_v) {
    var t = l_load_uh * i_pulse_a / v_dc_test_v;
    return { value: t, equation: "t1 = L·I/V = " + num(l_load_uh) + " µH × " + num(i_pulse_a) + " A / " + num(v_dc_test_v) + " V = " + num(Number(t.toFixed(4))) + " µs" };
  }

  // Overshoot (T08a): V_peak = v_dc_test_v + l_stray_nh·1e-9 · didt_a_per_us·1e6
  function vPeak(v_dc_test_v, l_stray_nh, didt_a_per_us) {
    var v = v_dc_test_v + l_stray_nh * 1e-9 * didt_a_per_us * 1e6;
    return { value: v, equation: "V_peak = " + num(v_dc_test_v) + " V + " + num(l_stray_nh) + " nH × " + num(Number(didt_a_per_us.toFixed(4))) + " A/µs = " + num(Number(v.toFixed(4))) + " V" };
  }

  // Bus charge (T07): t_charge = C · v_dc_test_v / charge_current_a (C in F from mF)
  function tCharge(dclink_c_mf, v_dc_test_v, charge_current_a) {
    var t = (dclink_c_mf / 1000) * v_dc_test_v / charge_current_a;
    return { value: t, equation: "t_charge = C·V/I = " + num(dclink_c_mf) + " mF × " + num(v_dc_test_v) + " V / " + num(charge_current_a) + " A = " + fixed(t, 2) + " s" };
  }
  // Bus ramp rate dv/dt = charge_current_a / C, in V/s
  function chargeRate(dclink_c_mf, charge_current_a) { return charge_current_a / (dclink_c_mf / 1000); }

  // Bus discharge (T10): t_safe = R·C·ln(v0 / v_safe_v) for v0 > v_safe_v, else 0 (R in Ω from kΩ)
  function tSafe(bleeder_r_kohm, dclink_c_mf, v0, v_safe_v) {
    var rc = timeConstant(bleeder_r_kohm, dclink_c_mf);
    if (!(v0 > v_safe_v)) {
      return { value: 0, equation: "t_safe = 0 s (v0 = " + fixed(v0, 1) + " V ≤ v_safe " + num(v_safe_v) + " V)" };
    }
    var t = rc * Math.log(v0 / v_safe_v);
    return { value: t, equation: "t_safe = R·C·ln(v0/v_safe) = " + num(bleeder_r_kohm) + " kΩ × " + num(dclink_c_mf) + " mF × ln(" + fixed(v0, 1) + " V / " + num(v_safe_v) + " V) = " + fixed(t, 2) + " s" };
  }
  function timeConstant(bleeder_r_kohm, dclink_c_mf) { return (bleeder_r_kohm * 1000) * (dclink_c_mf / 1000); }
  // v(t) = v0 · exp(−t / (R·C))
  function decay(v0, t, bleeder_r_kohm, dclink_c_mf) { return v0 * Math.exp(-t / timeConstant(bleeder_r_kohm, dclink_c_mf)); }

  // Stored energy: E = ½·C·v0²
  function energy(dclink_c_mf, v0) {
    var e = 0.5 * (dclink_c_mf / 1000) * v0 * v0;
    return { value: e, equation: "E = ½·C·v0² = ½ × " + num(dclink_c_mf) + " mF × (" + fixed(v0, 1) + " V)² = " + num(Number(e.toFixed(2))) + " J" };
  }

  return {
    vceSat: vceSat, t1: t1, vPeak: vPeak, tCharge: tCharge, chargeRate: chargeRate,
    tSafe: tSafe, timeConstant: timeConstant, decay: decay, energy: energy,
    fmt: { num: num, fixed: fixed, minus: minus }
  };
})();
