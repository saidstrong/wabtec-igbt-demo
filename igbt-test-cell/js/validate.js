/* validate.js: domain validation and configuration preflight (05 §2.3, §3.1–§3.2; 02 §4).
   Pure functions, no DOM. Every error is { field, value, rule } in plain words. */
window.IGBT = window.IGBT || {};
window.IGBT.validate = (function () {

  // ---- field specs (05 §2, §2.1) ----
  // kind: num | bool | str | fixed | speed
  // lo/hi: bounds; loOpen/hiOpen: strict (x > lo, x < hi); nullable: null allowed
  var MODULE_SPEC = {
    module_id:          { kind: "str" },
    module_note:        { kind: "fixed" },
    diode_fwd_v:        { kind: "num", lo: 0, hi: 5 },
    diode_reverse_open: { kind: "bool" },
    gate_accessible:    { kind: "bool" },
    gate_on_v:          { kind: "num", lo: -30, hi: 30 },
    gate_off_v:         { kind: "num", lo: -30, hi: 30 },
    gate_turns_off_ok:  { kind: "bool" },
    driver_idle_w:      { kind: "num", lo: 0 },
    driver_switch_w:    { kind: "num", lo: 0 },
    fibre_status_ok:    { kind: "bool" },
    iso_leak_ma:        { kind: "num", lo: 0 },
    vce0_v:             { kind: "num", lo: 0, hi: 10 },
    r_ce_mohm:          { kind: "num", lo: 0 },
    ices_ma:            { kind: "num", lo: 0 },
    vge_th_v:           { kind: "num", lo: 0, loOpen: true, hi: 20 },
    didt_a_per_us:      { kind: "num", lo: 0, loOpen: true },
    desat_trip_us:      { kind: "num", lo: 0, loOpen: true, nullable: true }
  };
  var BENCH_SPEC = {
    v_dc_test_v:         { kind: "num", lo: 0, loOpen: true },
    i_pulse_a:           { kind: "num", lo: 0, loOpen: true },
    l_load_uh:           { kind: "num", lo: 0, loOpen: true },
    l_stray_nh:          { kind: "num", lo: 0 },
    dclink_c_mf:         { kind: "num", lo: 0, loOpen: true },
    bleeder_r_kohm:      { kind: "num", lo: 0, loOpen: true },
    charge_current_a:    { kind: "num", lo: 0, loOpen: true },
    v_safe_v:            { kind: "num", lo: 0, loOpen: true },        // < v_dc_test_v: derived check
    discharge_timeout_s: { kind: "num", lo: 0, loOpen: true },        // > t_safe: derived check
    verify_delay_s:      { kind: "num", lo: 0 },
    desat_window_us:     { kind: "num", lo: 0, loOpen: true },
    gdpc_text:           { kind: "str", allowEmpty: true },
    bench_selfcheck_ok:  { kind: "bool" },
    reference_module_ok: { kind: "bool" },
    discharge_path_ok:   { kind: "bool" },
    verify_meter_ok:     { kind: "bool" },
    speed_default:       { kind: "speed" },
    noise_rel_sigma:     { kind: "num", lo: 0, hi: 0.05 }
  };
  var SPEEDS = [1, 4, 8, 16];
  var RULE_TYPES = ["window", "max", "min", "boolean", "time_max", "info"];
  var RULE_BASES = ["CASE_INFERRED", "CASE_TRANSFERRED", "INVENTED_TOLERANCE", "INVENTED"];
  var TEST_IDS = ["T00", "T01", "T02", "T03", "T04", "T05", "T06", "T07", "T08a", "T08b", "T09", "T10"];
  var RUNNABLE_STATUSES = ["demo", "production_unconfigured"];

  function err(field, value, rule) { return { field: field, value: value, rule: rule }; }
  function isNum(x) { return typeof x === "number" && isFinite(x); }
  function isBool(x) { return typeof x === "boolean"; }
  function isStr(x) { return typeof x === "string"; }
  function data() { return window.APP_DATA; }

  function rangeText(s) {
    var parts = [];
    if (s.lo !== undefined) parts.push((s.loOpen ? "greater than " : "at least ") + s.lo);
    if (s.hi !== undefined) parts.push((s.hiOpen ? "less than " : "at most ") + s.hi);
    return parts.join(" and ");
  }

  // Check one field against its spec. Returns an array of errors.
  function checkField(prefix, name, spec, value, unit) {
    var f = prefix + "." + name;
    var u = unit && unit !== "–" && unit !== "bool" ? " " + unit : "";
    if (value === null) {
      if (spec.nullable) return [];
      return [err(f, value, "must have a value; empty (null) is allowed only for desat_trip_us")];
    }
    if (value === undefined) return [err(f, value, "is missing")];
    switch (spec.kind) {
      case "num":
        if (!isNum(value)) return [err(f, value, "must be a number" + (rangeText(spec) ? " " + rangeText(spec) + u : ""))];
        if (spec.lo !== undefined && (spec.loOpen ? !(value > spec.lo) : !(value >= spec.lo)))
          return [err(f, value, "must be " + rangeText(spec) + u)];
        if (spec.hi !== undefined && (spec.hiOpen ? !(value < spec.hi) : !(value <= spec.hi)))
          return [err(f, value, "must be " + rangeText(spec) + u)];
        return [];
      case "bool":
        return isBool(value) ? [] : [err(f, value, "must be true or false")];
      case "str":
        if (!isStr(value)) return [err(f, value, "must be text")];
        if (!spec.allowEmpty && value.trim() === "") return [err(f, value, "must not be empty")];
        return [];
      case "fixed":
        var fixed = data().module_defaults[name];
        return value === fixed ? [] : [err(f, value, "is fixed text and must read \"" + fixed + "\"")];
      case "speed":
        return SPEEDS.indexOf(value) >= 0 ? [] : [err(f, value, "must be one of 1, 4, 8, 16")];
    }
    return [];
  }

  function checkObject(prefix, spec, obj, units) {
    var errors = [];
    if (!obj || typeof obj !== "object") return [err(prefix, obj, "must be a set of parameters")];
    Object.keys(spec).forEach(function (k) {
      errors = errors.concat(checkField(prefix, k, spec[k], obj[k], units[k]));
    });
    Object.keys(obj).forEach(function (k) {
      if (!spec.hasOwnProperty(k)) errors.push(err(prefix + "." + k, obj[k], "is not a known parameter"));
    });
    return errors;
  }

  function validateModule(m) {
    return checkObject("module", MODULE_SPEC, m, data().module_parameter_units);
  }

  // t_safe = R·C·ln(v0/v_safe) with R in Ω (from kΩ), C in F (from mF); 0 if ln argument ≤ 1
  function tSafe(b) {
    var ratio = b.v_dc_test_v / b.v_safe_v;
    if (!(ratio > 1)) return 0;
    return (b.bleeder_r_kohm * 1000) * (b.dclink_c_mf / 1000) * Math.log(ratio);
  }

  function validateBench(b) {
    var errors = checkObject("bench", BENCH_SPEC, b, data().bench_parameter_units);
    if (errors.length) return errors;   // derived checks need valid inputs (no division by zero)
    if (!(b.v_safe_v < b.v_dc_test_v))
      errors.push(err("bench.v_safe_v", b.v_safe_v, "must be less than v_dc_test_v (" + b.v_dc_test_v + " V)"));
    else {
      var t = tSafe(b);
      if (!(b.discharge_timeout_s > t))
        errors.push(err("bench.discharge_timeout_s", b.discharge_timeout_s,
          "must be greater than the computed discharge time R·C·ln(v_dc_test_v/v_safe_v) = " + t.toFixed(2) + " s"));
    }
    return errors;
  }

  // ---- rules and profiles (05 §3.1, §3.2) ----
  function validateRule(rule, profileStatus, prefix) {
    var e = [];
    var q = rule && isStr(rule.quantity_id) ? rule.quantity_id : "?";
    var p = (prefix || "rule") + "." + q;
    if (!rule || typeof rule !== "object") return [err(p, rule, "must be a rule object")];

    ["quantity_id", "test_id", "label", "unit"].forEach(function (k) {
      if (!isStr(rule[k]) || rule[k].trim() === "") e.push(err(p + "." + k, rule[k], "must be non-empty text"));
    });
    if (isStr(rule.test_id) && TEST_IDS.indexOf(rule.test_id) < 0)
      e.push(err(p + ".test_id", rule.test_id, "must be one of " + TEST_IDS.join(", ")));
    if (RULE_TYPES.indexOf(rule.rule_type) < 0) {
      e.push(err(p + ".rule_type", rule.rule_type, "must be one of " + RULE_TYPES.join(", ")));
      return e;
    }
    var info = rule.rule_type === "info";

    // types of min/max/expect
    ["min", "max"].forEach(function (k) {
      if (rule[k] !== null && !isNum(rule[k])) e.push(err(p + "." + k, rule[k], "must be a number or null"));
    });
    if (rule.expect !== null && !isBool(rule.expect)) e.push(err(p + ".expect", rule.expect, "must be true, false or null"));

    // required
    if (!isBool(rule.required)) e.push(err(p + ".required", rule.required, "must be true or false"));
    else if (info && rule.required) e.push(err(p + ".required", rule.required, "an info rule must not be required"));

    // approval status: only NOT_APPROVED in this build
    if (rule.approval_status === "APPROVED")
      e.push(err(p + ".approval_status", rule.approval_status, "APPROVED is reserved and not allowed in this build; must be NOT_APPROVED"));
    else if (rule.approval_status !== "NOT_APPROVED")
      e.push(err(p + ".approval_status", rule.approval_status, "must be NOT_APPROVED"));

    // basis and reference
    if (info) {
      if (rule.rule_basis !== null) e.push(err(p + ".rule_basis", rule.rule_basis, "must be null for an info rule"));
      if (rule.reference_id !== null) e.push(err(p + ".reference_id", rule.reference_id, "must be null for an info rule"));
    } else if (RULE_BASES.indexOf(rule.rule_basis) < 0) {
      e.push(err(p + ".rule_basis", rule.rule_basis, "must be one of " + RULE_BASES.join(", ")));
    } else if (rule.rule_basis === "INVENTED") {
      if (rule.reference_id !== null) e.push(err(p + ".reference_id", rule.reference_id, "must be null when the basis is INVENTED"));
    } else {
      var exists = data().case_references.some(function (r) { return r.reference_id === rule.reference_id; });
      if (!exists) e.push(err(p + ".reference_id", rule.reference_id,
        "must name an entry in the case reference register when the basis is " + rule.rule_basis));
    }

    if (!isStr(rule.applicability_note)) e.push(err(p + ".applicability_note", rule.applicability_note, "must be text"));
    else if (!info && rule.applicability_note.trim() === "")
      e.push(err(p + ".applicability_note", rule.applicability_note, "must explain why the comparison is illustrative"));

    // limit fields by rule type (05 §3.2)
    var need = {
      window:   { min: "num", max: "num", expect: null },
      max:      { min: null, max: "num", expect: null },
      time_max: { min: null, max: "num", expect: null },
      min:      { min: "num", max: null, expect: null },
      "boolean": { min: null, max: null, expect: "bool" },
      info:     { min: null, max: null, expect: null }
    }[rule.rule_type];
    var demo = profileStatus === "demo";
    ["min", "max", "expect"].forEach(function (k) {
      var v = rule[k];
      if (need[k] === null) {
        if (v !== null && v !== undefined)
          e.push(err(p + "." + k, v, info ? "an info rule must not have a limit" : "must be null for a " + rule.rule_type + " rule"));
      } else if (v === null || v === undefined) {
        if (demo) e.push(err(p + "." + k, v, "the demo profile needs this limit for a " + rule.rule_type + " rule"));
      }
    });
    if (rule.rule_type === "window" && isNum(rule.min) && isNum(rule.max) && !(rule.min < rule.max))
      e.push(err(p + ".min", rule.min, "window min must be less than max (" + rule.max + ")"));
    return e;
  }

  function validateProfile(profile) {
    var e = [];
    if (!profile || typeof profile !== "object") return [err("profile", profile, "must be a profile object")];
    var p = "profile." + (isStr(profile.profile_id) ? profile.profile_id : "?");
    ["profile_id", "profile_version", "profile_badge"].forEach(function (k) {
      if (!isStr(profile[k]) || profile[k].trim() === "") e.push(err(p + "." + k, profile[k], "must be non-empty text"));
    });
    if (profile.profile_status === "production_approved")
      e.push(err(p + ".profile_status", profile.profile_status, "production_approved is reserved and not allowed in this build"));
    else if (RUNNABLE_STATUSES.indexOf(profile.profile_status) < 0)
      e.push(err(p + ".profile_status", profile.profile_status, "must be demo or production_unconfigured"));
    e = e.concat(validateBench(profile.bench_conditions).map(function (x) {
      return err(p + "." + x.field.replace(/^bench/, "bench_conditions"), x.value, x.rule);
    }));
    if (!Array.isArray(profile.rules)) {
      e.push(err(p + ".rules", profile.rules, "must be a list of rules"));
      return e;
    }
    var seen = {};
    profile.rules.forEach(function (r) {
      e = e.concat(validateRule(r, profile.profile_status, p + ".rules"));
      if (r && isStr(r.quantity_id)) {
        if (seen[r.quantity_id]) e.push(err(p + ".rules." + r.quantity_id, r.quantity_id, "quantity_id must be unique"));
        seen[r.quantity_id] = r;
      }
    });
    return e.concat(validateRuleSet(seen, p + ".rules"));
  }

  // Complete rule set: exactly one rule for each modelled quantity (03 §6), on the stage that
  // computes it, with its rule type, unit and required flag (data.js modelled_quantities); no
  // rule for anything else. A missing rule would otherwise leave its stage with nothing to fail.
  function validateRuleSet(byQ, prefix) {
    var e = [], known = {};
    data().modelled_quantities.forEach(function (want) {
      var q = want.quantity_id, r = byQ[q], p = prefix + "." + q;
      known[q] = true;
      if (!r) {
        e.push(err(p, undefined, "missing: every modelled quantity needs exactly one rule (" + q + " is computed in " + want.test_id + ")"));
        return;
      }
      if (r.test_id !== want.test_id) e.push(err(p + ".test_id", r.test_id, "must be " + want.test_id + " (the stage that computes " + q + ")"));
      if (r.rule_type !== want.rule_type) e.push(err(p + ".rule_type", r.rule_type, "must be " + want.rule_type + " for " + q));
      if (r.unit !== want.unit) e.push(err(p + ".unit", r.unit, "must be " + want.unit + " for " + q));
      if (r.required !== want.required) e.push(err(p + ".required", r.required, "must be " + want.required + " for " + q));
    });
    Object.keys(byQ).forEach(function (q) {
      if (!known[q]) e.push(err(prefix + "." + q, q, "is not a modelled quantity (03 §6); the engine computes no reading for it"));
    });
    return e;
  }

  // ---- overrides (05 §2.2): { module: {...}, bench: {...} }, unknown keys rejected ----
  function validateOverrides(ov) {
    var e = [];
    if (ov === null || ov === undefined) return e;
    if (typeof ov !== "object") return [err("overrides", ov, "must be { module: {...}, bench: {...} }")];
    Object.keys(ov).forEach(function (k) {
      if (k !== "module" && k !== "bench") e.push(err("overrides." + k, ov[k], "is not a known override group (use module or bench)"));
    });
    [["module", MODULE_SPEC, data().module_parameter_units], ["bench", BENCH_SPEC, data().bench_parameter_units]].forEach(function (g) {
      var grp = ov[g[0]];
      if (grp === undefined) return;
      if (!grp || typeof grp !== "object") { e.push(err("overrides." + g[0], grp, "must be a set of parameters")); return; }
      Object.keys(grp).forEach(function (k) {
        if (!g[1].hasOwnProperty(k)) e.push(err(g[0] + "." + k, grp[k], "is not a known parameter"));
        else e = e.concat(checkField(g[0], k, g[1][k], grp[k], g[2][k]));
      });
    });
    return e;
  }

  // ---- setup (02 §11) ----
  function validateSetup(s) {
    var e = [];
    if (!s || typeof s !== "object") return [err("setup", s, "must be a setup object")];
    if (SPEEDS.indexOf(s.speed) < 0) e.push(err("setup.speed", s.speed, "must be one of 1, 4, 8, 16"));
    if (!isStr(s.operator) || s.operator.trim() === "") e.push(err("setup.operator", s.operator, "must not be empty"));
    if (!(typeof s.seed === "number" && Number.isInteger(s.seed))) e.push(err("setup.seed", s.seed, "must be a whole number"));
    if (!isStr(s.module_id) || s.module_id.trim() === "") e.push(err("setup.module_id", s.module_id, "must not be empty"));
    if (!findScenario(s.scenario_id)) e.push(err("setup.scenario_id", s.scenario_id, "is not a known scenario"));
    if (!findProfile(s.profile_id)) e.push(err("setup.profile_id", s.profile_id, "is not a known profile"));
    if (s.noise !== undefined && typeof s.noise !== "boolean") e.push(err("setup.noise", s.noise, "must be true (on) or false (off)"));
    return e;
  }

  function findScenario(id) { return data().scenarios.filter(function (x) { return x.scenario_id === id; })[0] || null; }
  function findProfile(id) { return data().profiles.filter(function (x) { return x.profile_id === id; })[0] || null; }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function merge(base, over) {
    var out = clone(base);
    if (over) Object.keys(over).forEach(function (k) { out[k] = over[k]; });
    return out;
  }
  function dedupe(errors) {
    var seen = {};
    return errors.filter(function (x) {
      var key = x.field + "|" + x.rule;
      if (seen[key]) return false;
      seen[key] = true;
      return true;
    });
  }

  // ---- configuration preflight (02 §4, 05 §2.3, §3) ----
  // setup: { module_id, profile_id, scenario_id, seed, speed, operator, noise?, custom_overrides? }
  // noise true → bench noise_rel_sigma = noise_on_sigma (02 §10 P1); false or absent → profile / override value
  function configPreflight(setup) {
    var errors = validateSetup(setup);
    var scenario = setup && findScenario(setup.scenario_id);
    var profileId = scenario && scenario.force_profile ? scenario.force_profile : setup && setup.profile_id;
    var profile = findProfile(profileId);
    if (!scenario || !profile) return { status: "INVALID", errors: errors };

    var overrides = scenario.custom ? (setup.custom_overrides || { module: {}, bench: {} }) : scenario.overrides;
    errors = errors.concat(validateProfile(profile));
    errors = errors.concat(validateOverrides(overrides));

    var moduleParams = merge(data().module_defaults, overrides && overrides.module);
    moduleParams.module_id = setup.module_id;
    var bench = merge(profile.bench_conditions, overrides && overrides.bench);
    if (setup.noise === true) bench.noise_rel_sigma = data().noise_on_sigma;
    errors = errors.concat(validateModule(moduleParams));
    errors = errors.concat(validateBench(bench));
    errors = dedupe(errors);
    if (errors.length) return { status: "INVALID", errors: errors };

    if (profile.profile_status === "production_unconfigured")
      return { status: "CONFIG_BLOCKED", block_reason: "CONFIGURATION_PREFLIGHT",
               inputs: resolvedInputs(scenario, profile, moduleParams, bench, setup) };

    return { status: "OK", inputs: resolvedInputs(scenario, profile, moduleParams, bench, setup),
             rules: clone(profile.rules), scenario_events: clone(scenario.events || []) };
  }

  // Shape of 05 §6 deterministic.inputs
  function resolvedInputs(scenario, profile, moduleParams, bench, setup) {
    return {
      scenario_id: scenario.scenario_id,
      scenario_name: scenario.name,
      module_parameters: moduleParams,
      profile_id: profile.profile_id,
      profile_version: profile.profile_version,
      profile_status: profile.profile_status,
      bench_conditions: bench,
      seed: setup.seed,
      noise_rel_sigma: bench.noise_rel_sigma,
      speed: setup.speed
    };
  }

  return {
    MODULE_SPEC: MODULE_SPEC, BENCH_SPEC: BENCH_SPEC,
    validateModule: validateModule, validateBench: validateBench,
    validateRule: validateRule, validateProfile: validateProfile,
    validateOverrides: validateOverrides, validateSetup: validateSetup,
    configPreflight: configPreflight, tSafe: tSafe,
    findScenario: findScenario, findProfile: findProfile
  };
})();
