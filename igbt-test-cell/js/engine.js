/* engine.js: computed readings (03 §6), rule evaluation (03 §8), prerequisites (03 §5),
   overall roll-up (03 §9) and hypotheses (03 §10). Pure functions, no DOM.
   Readings come only from module parameters and bench conditions; nothing here
   knows which scenario produced them. */
window.IGBT = window.IGBT || {};
window.IGBT.engine = (function () {
  var M = window.IGBT.models, RNG = window.IGBT.rng;
  function D() { return window.APP_DATA; }
  var fmt = M.fmt;

  // ---- number hygiene ----
  // Readings and voltages are judged and stored at full precision; only binary floating-point
  // noise is removed (12 significant digits: 2.4000000000000004 → 2.4, while 3.20004 stays
  // 3.20004). Display rounds. Times run on a 10 ms clock (2 dp).
  function clean(x) {
    if (typeof x !== "number" || !isFinite(x)) return x;
    var c = Number(x.toPrecision(12));
    return c === 0 ? 0 : c;   // no −0
  }
  // a − b without cancellation noise: 12 significant digits relative to the operands
  // (3.2 − 3.20004 = −0.00004, not −0.0000399999999998)
  function diff(a, b) {
    var mag = Math.max(Math.abs(a), Math.abs(b));
    var dp = mag > 0 ? Math.min(20, Math.max(0, 11 - Math.floor(Math.log10(mag)))) : 0;
    return clean(Number((a - b).toFixed(dp)));
  }
  function round(x, dp) {
    if (typeof x !== "number" || !isFinite(x)) return x;
    var p = Math.pow(10, dp);
    var r = Math.round(x * p) / p;
    return r === 0 ? 0 : r;   // no −0
  }
  function r2(x) { return round(x, 2); }
  // Seconds as text: one decimal when that is exact (365.0 s), otherwise two (499.85 s)
  function secText(x) { return round(x, 1) === round(x, 2) ? fmt.fixed(x, 1) : fmt.fixed(x, 2); }

  function stageDef(testId) { return D().stages.filter(function (s) { return s.test_id === testId; })[0]; }
  function rulesFor(testId, rules) { return rules.filter(function (r) { return r.test_id === testId; }); }
  function refEntry(id) { return D().case_references.filter(function (r) { return r.reference_id === id; })[0] || null; }

  // ---- conditions text from the 03 §6 templates and the actual profile values ----
  function conditionsFor(quantityId, m, b) {
    var tpl = D().conditions_templates[quantityId] || "";
    return tpl.replace(/\{([a-z_0-9]+)\}/g, function (all, key) {
      var v = b.hasOwnProperty(key) ? b[key] : m[key];
      return typeof v === "number" ? fmt.num(v) : String(v);
    });
  }
  function stageConditions(testId, rules, m, b) {
    var seen = [];
    rulesFor(testId, rules).forEach(function (r) {
      var c = conditionsFor(r.quantity_id, m, b);
      if (c && seen.indexOf(c) < 0) seen.push(c);
    });
    return seen.length ? seen.join("; ") : null;
  }

  // ---- gate model with the 03 §6 dependency rule ----
  function driverPowered(m) { return !(m.driver_idle_w < 1.0); }
  // Modelled gate–emitter voltage for a command; 0 V when the driver is unpowered;
  // stays at gate_on_v after an OFF command when gate_turns_off_ok = false
  function gateMeasured(m, cmd, sigma, seed, quantityId) {
    if (!driverPowered(m)) return 0;
    if (cmd === "ON" || !m.gate_turns_off_ok) return RNG.n(m.gate_on_v, sigma, seed, quantityId);
    return RNG.n(m.gate_off_v, sigma, seed, quantityId);
  }

  // ---- 03 §6 readings for one stage: { quantity_id: { value, observation, model_equation } } ----
  function measure(testId, inputs) {
    var m = inputs.module_parameters, b = inputs.bench_conditions;
    var s = inputs.noise_rel_sigma, seed = inputs.seed, out = {};
    function n(x, q, sigma) { return RNG.n(x, sigma === undefined ? s : sigma, seed, q); }
    // Model equation plus the seeded-noise step when noise moved the value (σ = 0: unchanged)
    function withNoise(eq, model, noisy, q, unit) {
      if (!(s > 0) || clean(noisy) === clean(model)) return eq;
      return eq + "; with seeded noise × " + RNG.factor(s, seed, q).toFixed(4) + " ≈ " + fmt.num(Number(noisy.toFixed(4))) + " " + unit;
    }
    function put(q, v, obs, eq) {
      out[q] = { value: clean(v), observation: obs || "OBSERVED", model_equation: eq || null };
    }
    switch (testId) {
      case "T01":
        put("Q01", n(m.diode_fwd_v, "Q01"));
        put("Q02", m.diode_reverse_open);
        break;
      case "T02":
        var idle = n(m.driver_idle_w, "Q03");            // one value, two rules
        put("Q03", idle); put("Q03b", idle);
        put("Q04", n(m.driver_switch_w, "Q04"));
        break;
      case "T03":
        put("Q05", m.fibre_status_ok);
        put("Q06", gateMeasured(m, "ON", s, seed, "Q06"));
        put("Q07", gateMeasured(m, "OFF", s, seed, "Q07"));
        break;
      case "T06":
        put("Q10", n(m.vge_th_v, "Q10"));
        break;
      case "T04":
        put("Q08", n(m.iso_leak_ma, "Q08"));
        break;
      case "T05":
        var vce = M.vceSat(m.vce0_v, m.r_ce_mohm, b.i_pulse_a);
        var q09 = n(vce.value, "Q09");
        put("Q09", q09, null, withNoise(vce.equation, vce.value, q09, "Q09", "V"));
        break;
      case "T07":
        put("Q11", n(m.ices_ma, "Q11"));
        break;
      case "T08a":
        var t1 = M.t1(b.l_load_uh, b.i_pulse_a, b.v_dc_test_v);
        put("Q16", t1.value, null, t1.equation);
        var didt = clean(n(m.didt_a_per_us, "Q12"));
        put("Q12", didt);
        var vp = M.vPeak(b.v_dc_test_v, b.l_stray_nh, didt);
        put("Q13", vp.value, null, vp.equation);
        break;
      case "T09":
        var trip = m.desat_trip_us === null ? null : clean(n(m.desat_trip_us, "Q14", 2 * s));
        if (trip === null || trip > b.desat_window_us) put("Q14", null, "NOT_OBSERVED_IN_WINDOW");
        else put("Q14", trip);
        break;
      case "T10":
        put("Q18", gateMeasured(m, "OFF", s, seed, "Q18"));
        break;
    }
    return out;
  }

  // ---- 03 §8 rule evaluation ----
  function dp(rule) { var d = D().display_decimals[rule.quantity_id]; return d === undefined ? 2 : d; }
  function valText(rule, x) { return typeof x === "number" ? fmt.fixed(x, dp(rule)) : String(x); }
  // A judged value at display precision, or at full precision when rounding would make it read
  // the same as a limit it differs from (3.20004 V > max 3.20 V, not 3.20 V > max 3.20 V)
  function xText(rule, x) {
    if (typeof x !== "number") return String(x);
    var t = valText(rule, x);
    var hidden = [rule.min, rule.max].some(function (l) { return typeof l === "number" && l !== x && valText(rule, l) === t; });
    return hidden ? fmt.num(x) : t;
  }
  function unitText(rule) { return rule.unit === "bool" ? "" : " " + rule.unit; }
  function chips(rule) {
    if (rule.rule_type === "info") return "";
    var c = "ILLUSTRATIVE · " + rule.rule_basis + ", NOT APPROVED";
    if (rule.reference_id) c += ", Case ref " + rule.reference_id;
    return c;
  }
  // margin: signed distance to the nearest numeric limit, positive inside; null without value or limit
  function margin(rule, x) {
    if (typeof x !== "number") return null;
    switch (rule.rule_type) {
      case "window": return (typeof rule.min === "number" && typeof rule.max === "number") ? Math.min(diff(x, rule.min), diff(rule.max, x)) : null;
      case "max": case "time_max": return typeof rule.max === "number" ? diff(rule.max, x) : null;
      case "min": return typeof rule.min === "number" ? diff(x, rule.min) : null;
    }
    return null;
  }

  // evaluateRule(rule, value, observation, opts) → { verdict, margin, reason }
  // opts: { conditions, window_us, not_run_status }
  function evaluateRule(rule, x, observation, opts) {
    opts = opts || {};
    var label = rule.label, u = unitText(rule), ch = " [" + chips(rule) + "]";
    if (observation === "NOT_MEASURED") {
      return { verdict: "NOT RUN", margin: null, reason: label + ": not measured (stage " + (opts.not_run_status || "not executed") + ")" };
    }
    var xs = xText(rule, x), pass, reason;
    switch (rule.rule_type) {
      case "info":
        return { verdict: "INFO", margin: null, reason: label + " " + xs + u + " (info; not judged)" };
      case "window":
        pass = x >= rule.min && x <= rule.max;
        reason = label + " " + xs + u + (pass ? " within [" : " outside [") + valText(rule, rule.min) + ", " + valText(rule, rule.max) + "]" + ch +
          (opts.conditions ? " " + opts.conditions : "");
        break;
      case "max":
        pass = x <= rule.max;
        reason = label + " " + xs + u + (pass ? " ≤ max " : " > max ") + valText(rule, rule.max) + u + ch;
        break;
      case "min":
        pass = x >= rule.min;
        reason = label + " " + xs + u + (pass ? " ≥ min " : " < min ") + valText(rule, rule.min) + u + ch;
        break;
      case "boolean":
        pass = x === rule.expect;
        reason = label + " observed " + String(x) + ", expected " + String(rule.expect) + ch;
        break;
      case "time_max":
        if (observation !== "OBSERVED" || typeof x !== "number") {
          pass = false;
          reason = label + ": no event within " + fmt.num(opts.window_us) + " µs window" + ch;
        } else {
          pass = x <= rule.max;
          reason = label + " " + xs + u + (pass ? " ≤ max " : " > max ") + valText(rule, rule.max) + u + ch;
        }
        break;
      default:
        return { verdict: "NOT RUN", margin: null, reason: label + ": unknown rule type" };
    }
    return { verdict: pass ? "PASS" : "FAIL", margin: margin(rule, x), reason: reason };
  }

  function hypothesisText(key) { var h = D().hypotheses[key]; return h ? "Hypothesis: " + h + "; not a diagnosis." : null; }

  // One reading in the 05 §6 shape (plus `conditions`)
  function buildReading(rule, raw, inputs, notRunStatus) {
    var m = inputs.module_parameters, b = inputs.bench_conditions;
    var measured = !!raw;
    var value = measured ? raw.value : null;
    var observation = measured ? raw.observation : "NOT_MEASURED";
    var conditions = conditionsFor(rule.quantity_id, m, b);
    var ev = evaluateRule(rule, value, observation, { conditions: conditions, window_us: b.desat_window_us, not_run_status: notRunStatus });
    var ref = rule.reference_id ? refEntry(rule.reference_id) : null;
    return {
      quantity_id: rule.quantity_id, label: rule.label, unit: rule.unit,
      value: value, observation: observation, conditions: conditions,
      rule: { type: rule.rule_type, min: rule.min, max: rule.max, expect: rule.expect },
      required: rule.required,
      rule_basis: rule.rule_basis, reference_id: rule.reference_id, reference_text: ref ? ref.statement : null,
      approval_status: rule.approval_status,
      verdict: ev.verdict, margin: ev.margin, reason: ev.reason,
      hypothesis: ev.verdict === "FAIL" ? hypothesisText(rule.test_id) : null,
      model_equation: measured ? raw.model_equation : null
    };
  }

  // Judged readings of an executed stage, in rule order
  function measureStage(testId, inputs, rules) {
    var raw = measure(testId, inputs);
    return rulesFor(testId, rules).map(function (r) { return buildReading(r, raw[r.quantity_id] || null, inputs); });
  }
  // Readings of a stage that was not executed (BLOCKED, NOT_RUN, INTERRUPTED, NOT_APPLICABLE, NOT_MODELLED)
  function notMeasuredReadings(testId, inputs, rules, status) {
    return rulesFor(testId, rules).map(function (r) { return buildReading(r, null, inputs, status); });
  }

  // ---- stages ----
  // Stage PASS = DONE and every required reading PASS
  function stagePass(stage) {
    return stage.status === "DONE" && stage.readings.every(function (r) { return !r.required || r.verdict === "PASS"; });
  }

  // Planned physical components (03 §7) for an executed stage. T10 is set by the safe-state procedure.
  function plannedComponents(testId, inputs) {
    var b = inputs.bench_conditions;
    var tCharge = r2(M.tCharge(b.dclink_c_mf, b.v_dc_test_v, b.charge_current_a).value);
    return (D().physical_components[testId] || []).map(function (c) {
      var s = c.seconds;
      if (c.compute === "t_charge") s = tCharge;
      else if (c.compute === "hold_to_total") s = r2(Math.max(0, c.total_s - tCharge));
      return { basis: c.basis, seconds: s, note: c.note };
    });
  }
  function sumSeconds(comps) { return r2(comps.reduce(function (a, c) { return a + (c.seconds || 0); }, 0)); }

  // Stage-level equation (bus charge for T07); T10's comes from the safe-state procedure
  function stageEquation(testId, inputs) {
    var b = inputs.bench_conditions;
    if (testId === "T07") return M.tCharge(b.dclink_c_mf, b.v_dc_test_v, b.charge_current_a).equation;
    return null;
  }

  // Initial stage records in the 02 §6 order. Static statuses: T08b NOT_MODELLED,
  // T06 NOT_APPLICABLE when the gate is not accessible. Everything else PENDING.
  function initialStages(inputs, rules) {
    var m = inputs.module_parameters;
    return D().stages.map(function (s) {
      var status = "PENDING", note = null;
      if (s.test_id === "T08b") { status = "NOT_MODELLED"; note = "not modelled in this build; excluded from the roll-up"; }
      else if (s.test_id === "T06" && !m.gate_accessible) { status = "NOT_APPLICABLE"; note = "gate not accessible without disassembly (gate_accessible = false)"; }
      return {
        test_id: s.test_id, name: s.name, "class": s["class"],
        status: status, blocked_reason: null, status_note: note,
        conditions: stageConditions(s.test_id, rules, m, inputs.bench_conditions),
        readings: notMeasuredReadings(s.test_id, inputs, rules, status),
        physical_components: [], physical_estimate_s: 0, model_equation: null
      };
    });
  }
  // Refresh the reason text of not-measured readings once the final status is known
  function refreshNotMeasured(stage, inputs, rules) {
    if (stage.status === "DONE" || stage.status === "RUNNING") return;
    stage.readings = notMeasuredReadings(stage.test_id, inputs, rules, stage.status);
  }

  // ---- 03 §5 prerequisites ----
  // done: stages that must be DONE; pass: stages that must PASS; selfcheck: needs bench_selfcheck_ok
  var PREREQ = {
    T00: {},
    T01: { done: ["T00"], selfcheck: true },
    T02: { done: ["T00"], selfcheck: true },
    T03: { pass: ["T02"] },
    T06: { gate: true, pass: ["T01"] },
    T04: { done: ["T00"], selfcheck: true },
    T05: { pass: ["T01", "T02", "T03"] },
    T07: { pass: ["T01", "T02", "T03", "T04"] },
    T08a: { pass: ["T07"], reference: true },
    T08b: { notModelled: true },
    T09: { pass: ["T07"] },
    T10: { done: ["T00"], selfcheck: true }
  };
  // → { status: "RUN" | "BLOCKED" | "NOT_APPLICABLE" | "NOT_MODELLED" | "END_INCOMPLETE", reason }
  function prerequisite(testId, stages, inputs) {
    var p = PREREQ[testId] || {}, m = inputs.module_parameters, b = inputs.bench_conditions;
    var byId = {};
    stages.forEach(function (s) { byId[s.test_id] = s; });
    if (p.notModelled) return { status: "NOT_MODELLED", reason: "not modelled in this build" };
    var notDone = (p.done || []).filter(function (id) { return !byId[id] || byId[id].status !== "DONE"; });
    if (notDone.length) return { status: "END_INCOMPLETE", reason: notDone.join(", ") + " not DONE" };
    if (p.selfcheck && !b.bench_selfcheck_ok) return { status: "END_INCOMPLETE", reason: "bench self-check failed at T00 (bench_selfcheck_ok = false)" };
    if (p.gate && !m.gate_accessible) return { status: "NOT_APPLICABLE", reason: "gate not accessible without disassembly (gate_accessible = false)" };
    var reasons = [];
    var notPass = (p.pass || []).filter(function (id) { return !byId[id] || !stagePass(byId[id]); });
    if (notPass.length) reasons.push(notPass.join(", ") + " not PASS");
    if (p.reference && !b.reference_module_ok) reasons.push("known-good reference module not available (reference_module_ok = false)");
    if (reasons.length) return { status: "BLOCKED", reason: reasons.join("; ") };
    return { status: "RUN", reason: null };
  }

  // ---- 03 §9 roll-up, in order ----
  // ctx: { profile_status, stages, abort: {cause, stage, time} | null, safe_state: {...} | null }
  function rollUp(ctx) {
    var L = D().verdict_labels;
    function o(verdict, label, block, abortR, why) {
      return { verdict: verdict, verdict_label: label, block_reason: block, abort_reason: abortR, precedence_reason: why, is_acceptance_decision: false };
    }
    if (ctx.profile_status === "production_unconfigured") {
      return o("NOT EVALUATED", L.NOT_EVALUATED, "CONFIGURATION_PREFLIGHT", null,
        "Configuration preflight: profile has no approved production limits; no stage executed; bench not energised");
    }
    var fails = [];
    ctx.stages.forEach(function (s) {
      s.readings.forEach(function (r) { if (r.required && r.verdict === "FAIL") fails.push(r.quantity_id); });
    });
    function failText(prefix) {
      return fails.length ? (prefix + "required reading" + (fails.length > 1 ? "s " : " ") + fails.join(", ") + " FAIL") : "no required reading FAIL";
    }
    var ss = ctx.safe_state;
    var notVerified = !!ss && ss.verification !== "VERIFIED";
    var ssText = !ss ? "safe-state procedure not run (nothing was excited)"
      : notVerified ? "safe state not verified (" + ss.verification + "); enclosure kept locked" : "safe state verified";

    if (ctx.abort || notVerified) {
      var parts = [];
      if (ctx.abort) parts.push("Abort trigger " + ctx.abort.cause + " during " + ctx.abort.stage + " at " + secText(ctx.abort.time) + " s");
      else parts.push("Safe state not verified (" + ss.verification + ")");
      parts.push(fails.length ? failText("") + (ctx.abort ? " recorded before the abort" : " recorded") : "no required reading FAIL recorded");
      parts.push(ctx.abort ? ssText : "enclosure kept locked");
      return o("ABORTED", notVerified ? L.ABORTED_SAFE_STATE : L.ABORTED, null,
        ctx.abort ? ctx.abort.cause : "SAFE_STATE_NOT_VERIFIED", cap(parts.join("; ")));
    }
    if (fails.length) return o("FAIL", L.FAIL, null, null, cap(failText("") + "; no abort; " + ssText));

    var incomplete = ctx.stages.filter(function (s) {
      return s.status !== "DONE" && s.status !== "NOT_APPLICABLE" && s.status !== "NOT_MODELLED";
    }).map(function (s) { return s.test_id; });
    if (incomplete.length) {
      return o("INCOMPLETE", L.INCOMPLETE, null, null,
        "Required stage" + (incomplete.length > 1 ? "s " : " ") + incomplete.join(", ") + " not DONE with no FAIL to explain " +
        (incomplete.length > 1 ? "them" : "it") + "; no abort; " + ssText);
    }
    return o("PASS", L.PASS, null, null, "All required readings PASS; no abort; " + ssText);
  }
  function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

  // ---- 03 §10 hypotheses, kept separate from verdicts ----
  function hypotheses(stages, safeState) {
    var out = [];
    stages.forEach(function (s) {
      var q = s.readings.filter(function (r) { return r.verdict === "FAIL"; }).map(function (r) { return r.quantity_id; });
      if (q.length) out.push({ source: s.test_id, quantity_ids: q, text: hypothesisText(s.test_id) });
    });
    if (safeState && safeState.verification !== "VERIFIED") {
      out.push({ source: "SAFE_STATE", quantity_ids: [], text: hypothesisText("SAFE_STATE_NOT_VERIFIED") });
    }
    return out;
  }

  // ---- CONFIG_BLOCKED result (05 §6 notes): every stage NOT_RUN, no events but the block ----
  function configBlockedResult(inputs) {
    var profile = D().profiles.filter(function (p) { return p.profile_id === inputs.profile_id; })[0];
    var rules = profile ? profile.rules : [];
    var reason = D().fixed_texts.config_blocked_stage_reason;
    var stages = D().stages.map(function (s) {
      return {
        test_id: s.test_id, name: s.name, "class": s["class"],
        status: "NOT_RUN", blocked_reason: reason, status_note: null,
        conditions: stageConditions(s.test_id, rules, inputs.module_parameters, inputs.bench_conditions),
        readings: notMeasuredReadings(s.test_id, inputs, rules, "NOT_RUN"),
        physical_components: [], physical_estimate_s: 0, model_equation: null
      };
    });
    return {
      stages: stages,
      overall: rollUp({ profile_status: inputs.profile_status, stages: stages, abort: null, safe_state: null }),
      safe_state: null,
      hypotheses: [],
      events: [{ seq: 1, stage: null, type: "CONFIG_BLOCKED", physical_time_s: 0,
                 detail: "Configuration preflight: profile " + inputs.profile_id + " has no approved production limits; bench not energised; no stage executed" }],
      physical_total_s: 0
    };
  }

  return {
    clean: clean, round: round, r2: r2, secText: secText,
    stageDef: stageDef, rulesFor: rulesFor, refEntry: refEntry, chips: chips, valText: valText,
    conditionsFor: conditionsFor, driverPowered: driverPowered, gateMeasured: gateMeasured,
    measure: measure, evaluateRule: evaluateRule, buildReading: buildReading,
    measureStage: measureStage, notMeasuredReadings: notMeasuredReadings, refreshNotMeasured: refreshNotMeasured,
    stagePass: stagePass, plannedComponents: plannedComponents, sumSeconds: sumSeconds, stageEquation: stageEquation,
    initialStages: initialStages, prerequisite: prerequisite,
    rollUp: rollUp, hypotheses: hypotheses, hypothesisText: hypothesisText,
    configBlockedResult: configBlockedResult
  };
})();
