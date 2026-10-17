/* report.js: report JSON builder in the 05 §6 shape, with a fixed key order, and the
   CONFIG_BLOCKED variant (05 §6 notes); the HTML report in the 05 §10 layout, built from the
   same report object; shared display text used by the UI and the HTML report (AC-06).
   Downloads via Blob (02 §3). */
window.IGBT = window.IGBT || {};
window.IGBT.report = (function () {
  var E = window.IGBT.engine;
  function D() { return window.APP_DATA; }
  function F() { return window.IGBT.models.fmt; }

  // Copy obj with keys in the given order; any extra keys follow in their own order
  function ordered(obj, keys) {
    if (!obj) return obj;
    var o = {};
    keys.forEach(function (k) { if (obj.hasOwnProperty(k)) o[k] = obj[k]; });
    Object.keys(obj).forEach(function (k) { if (!o.hasOwnProperty(k)) o[k] = obj[k]; });
    return o;
  }
  function benchKeys() { return Object.keys(D().profiles[0].bench_conditions); }

  function inputsOut(inp) {
    return {
      scenario_id: inp.scenario_id, scenario_name: inp.scenario_name,
      module_parameters: ordered(inp.module_parameters, Object.keys(D().module_defaults)),
      profile_id: inp.profile_id, profile_version: inp.profile_version, profile_status: inp.profile_status,
      bench_conditions: ordered(inp.bench_conditions, benchKeys()),
      seed: inp.seed, noise_rel_sigma: inp.noise_rel_sigma, speed: inp.speed
    };
  }
  function overallOut(o) {
    return { verdict: o.verdict, verdict_label: o.verdict_label, block_reason: o.block_reason, abort_reason: o.abort_reason,
             precedence_reason: o.precedence_reason, is_acceptance_decision: false };
  }
  function readingOut(r) {
    return {
      quantity_id: r.quantity_id, label: r.label, unit: r.unit, value: r.value, observation: r.observation, conditions: r.conditions,
      rule: { type: r.rule.type, min: r.rule.min, max: r.rule.max, expect: r.rule.expect },
      required: r.required, rule_basis: r.rule_basis, reference_id: r.reference_id, reference_text: r.reference_text,
      approval_status: r.approval_status, verdict: r.verdict, margin: r.margin, reason: r.reason,
      hypothesis: r.hypothesis, model_equation: r.model_equation
    };
  }
  function stageOut(s) {
    return {
      test_id: s.test_id, name: s.name, "class": s["class"], status: s.status, blocked_reason: s.blocked_reason,
      status_note: s.status_note, conditions: s.conditions,
      readings: s.readings.map(readingOut),
      physical_components: s.physical_components.map(function (c) { return { basis: c.basis, seconds: c.seconds, note: c.note }; }),
      physical_estimate_s: s.physical_estimate_s, model_equation: s.model_equation
    };
  }
  function safeOut(ss) {
    if (!ss) return null;
    return {
      trigger: ss.trigger, gate_off_commanded: ss.gate_off_commanded, gate_measured_v: ss.gate_measured_v,
      gate_off_confirmed: ss.gate_off_confirmed, hv_source_disabled: ss.hv_source_disabled, contactor_open: ss.contactor_open,
      v_bus_at_start_v: ss.v_bus_at_start_v, discharge_required: ss.discharge_required, discharge_time_s: ss.discharge_time_s,
      v_bus_at_verification_v: ss.v_bus_at_verification_v, verification: ss.verification, door: ss.door, final_state: ss.final_state
    };
  }
  function hypOut(h) { return { source: h.source, quantity_ids: h.quantity_ids.slice(), text: h.text }; }
  // Deterministic events omit animation_time_s (05 §6)
  function eventOut(e) { return { seq: e.seq, stage: e.stage, type: e.type, physical_time_s: e.physical_time_s, detail: e.detail }; }

  function deterministicOut(inputs, res) {
    return {
      inputs: inputsOut(inputs),
      overall: overallOut(res.overall),
      stages: res.stages.map(stageOut),
      safe_state: safeOut(res.safe_state),
      hypotheses: (res.hypotheses || []).map(hypOut),
      events: res.events.map(eventOut),
      physical_total_s: res.physical_total_s
    };
  }

  // Case references cited by this run's readings or conditions, in register order
  function usedReferences(det) {
    var ids = {};
    det.stages.forEach(function (s) {
      s.readings.forEach(function (r) { if (r.reference_id) ids[r.reference_id] = true; });
      var m = s.conditions && s.conditions.match(/REF-[0-9]+/g);
      (m || []).forEach(function (id) { ids[id] = true; });
    });
    return D().case_references.filter(function (r) { return ids[r.reference_id]; }).map(function (r) {
      return { reference_id: r.reference_id, source: r.source, statement: r.statement, applies_to: r.applies_to };
    });
  }

  function pad(n) { return (n < 10 ? "0" : "") + n; }
  // Local time with offset, e.g. 2026-10-17T19:05:00+05:00
  function localIso(d) {
    var off = -d.getTimezoneOffset(), sign = off >= 0 ? "+" : "-";
    off = Math.abs(off);
    return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()) + "T" + pad(d.getHours()) + ":" + pad(d.getMinutes()) + ":" +
      pad(d.getSeconds()) + sign + pad(Math.floor(off / 60)) + ":" + pad(off % 60);
  }

  function wrap(det, meta) {
    meta = meta || {};
    return {
      schema_version: D().schema_version,
      simulation: true,
      simulation_banner: D().fixed_texts.banner,
      metadata: {
        run_id: meta.run_id || null,
        created_local: meta.created_local || localIso(new Date()),
        software_version: D().software_version,
        operator: meta.operator === undefined ? null : meta.operator
      },
      deterministic: det,
      presentation: {
        animation_total_s: E.r2(det.physical_total_s / det.inputs.speed),
        clock_caption: D().fixed_texts.clock_caption
      },
      case_references: usedReferences(det),
      limitations: D().fixed_texts.limitations
    };
  }

  // buildJson(run, meta): a finished sequencer run → report object (05 §6)
  function buildJson(run, meta) {
    var res = {
      overall: run.overall, stages: run.stages, safe_state: run.safe_state, hypotheses: run.hypotheses,
      events: run.events, physical_total_s: window.IGBT.sequencer.physicalTotal(run)
    };
    return wrap(deterministicOut(run.inputs, res), meta);
  }
  // buildConfigBlockedJson(pre, meta): configPreflight CONFIG_BLOCKED result → report object
  function buildConfigBlockedJson(pre, meta) {
    return wrap(deterministicOut(pre.inputs, E.configBlockedResult(pre.inputs)), meta);
  }

  function serialise(obj) { return JSON.stringify(obj, null, 2); }
  function fileName(report, ext) { return "report_" + (report.metadata.run_id || "run") + "." + (ext || "json"); }
  // Browser download via Blob + link (works from file://)
  function saveBlob(text, type, name) {
    if (typeof document === "undefined") return false;
    var blob = new Blob([text], { type: type });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url; a.download = name;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
    return true;
  }
  function download(report) { return saveBlob(serialise(report) + "\n", "application/json", fileName(report, "json")); }
  function downloadHtml(report, opts) { return saveBlob(buildHtml(report, opts), "text/html", fileName(report, "html")); }

  // ---- Shared display text: the Result screen and the HTML report use these, so they agree ----
  function dpOf(q) { var d = D().display_decimals[q]; return d === undefined ? 2 : d; }
  function numText(q, x) { return F().fixed(x, dpOf(q)); }
  function unitOf(r) { return r.unit === "bool" ? "" : r.unit; }
  // Display precision, or full precision when rounding would make the value read the same as a
  // limit it differs from (3.20004 V against max 3.20 V)
  function valueText(r) {
    if (r.value === null || r.value === undefined) return "—";
    if (typeof r.value !== "number") return String(r.value);
    var t = numText(r.quantity_id, r.value), x = r.rule;
    var hidden = [x.min, x.max].some(function (l) { return typeof l === "number" && l !== r.value && numText(r.quantity_id, l) === t; });
    return hidden ? F().num(r.value) : t;
  }
  function ruleText(r) {
    var u = unitOf(r) ? " " + unitOf(r) : "", q = r.quantity_id, x = r.rule;
    switch (x.type) {
      case "window": return "window " + (x.min === null ? "?" : numText(q, x.min)) + " to " + (x.max === null ? "?" : numText(q, x.max)) + u;
      case "max": return "max " + (x.max === null ? "not configured" : numText(q, x.max) + u);
      case "min": return "min " + (x.min === null ? "not configured" : numText(q, x.min) + u);
      case "time_max": return "max " + (x.max === null ? "not configured" : numText(q, x.max) + u) + " (event within window)";
      case "boolean": return "expect " + (x.expect === null ? "not configured" : String(x.expect));
      case "info": return "info (not judged)";
    }
    return x.type;
  }
  // Signed margin; a non-zero margin that rounds to zero is shown at full precision (−0.00004 V)
  function marginText(r) {
    if (r.margin === null || r.margin === undefined) return "—";
    var t = numText(r.quantity_id, Math.abs(r.margin));
    if (r.margin !== 0 && Number(t) === 0) t = F().num(Math.abs(r.margin));
    return (r.margin > 0 ? "+" : r.margin < 0 ? "−" : "") + t + (unitOf(r) ? " " + unitOf(r) : "");
  }
  // Provenance chips (05 §1): basis, case reference, NOT APPROVED; info rules say so
  function chipTexts(r) {
    if (r.rule.type === "info") return ["INFO · not judged"];
    var c = ["ILLUSTRATIVE · " + r.rule_basis];
    if (r.reference_id) c.push("Case ref " + r.reference_id);
    c.push("NOT APPROVED");
    return c;
  }
  function secText(x) { return F().fixed(x, 2) + " s"; }
  // Noise state of a run (02 §10). σ = 0: off. σ > 0: seeded noise, with a note that 03 §12 assumes σ = 0.
  function noiseText(inp) {
    var s = inp.noise_rel_sigma;
    if (!(s > 0)) return "off (σ = 0)";
    return "on: σ = " + F().num(s) + " multiplicative Gaussian (Q14 σ = " + F().num(2 * s) + "), truncated at ±3σ, seed " + inp.seed +
      ". Readings differ from the 03 §12 values, which assume σ = 0.";
  }
  function statusText(s) { return String(s).replace(/_/g, " "); }
  function animationOf(physical, speed) { return E.r2(physical / speed); }
  var text = { numText: numText, unitOf: unitOf, valueText: valueText, ruleText: ruleText, marginText: marginText,
               chipTexts: chipTexts, secText: secText, statusText: statusText, animationOf: animationOf,
               overridesText: overridesText, noiseText: noiseText };

  // ---- HTML report (05 §10): one self-contained page; inline CSS, no script, no external URL ----
  function esc(s) {
    return String(s === null || s === undefined ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
  function showVal(v) { return v === null ? "null" : typeof v === "string" ? "\"" + v + "\"" : String(v); }
  function tag(name, attrs, inner) {
    var a = "";
    Object.keys(attrs || {}).forEach(function (k) { if (attrs[k] !== null && attrs[k] !== undefined) a += " " + k + "=\"" + esc(attrs[k]) + "\""; });
    return "<" + name + a + ">" + (inner === undefined ? "" : inner) + "</" + name + ">";
  }
  function row(cells, attrs) { return tag("tr", attrs, cells.join("")); }
  function td(inner, attrs) { return tag("td", attrs, inner); }
  function th(inner, attrs) { return tag("th", attrs, inner); }
  function kvTable(pairs, cls) {
    return tag("table", { "class": "kv" + (cls ? " " + cls : "") }, tag("tbody", null, pairs.map(function (p) {
      return row([th(esc(p[0]), { scope: "row" }), td(p[2] ? p[1] : esc(p[1]), p[3] ? { "class": p[3] } : null)]);
    }).join("")));
  }
  function chipHtml(t) { return tag("span", { "class": "chip" + (t === "NOT APPROVED" ? " chip-na" : "") }, esc(t)); }
  var VERDICT_CLASS = { PASS: "v-pass", FAIL: "v-fail", ABORTED: "v-abort", INCOMPLETE: "v-abort", "NOT EVALUATED": "v-ne" };
  function verdictHtml(v) { return tag("span", { "class": "st " + (v === "PASS" ? "st-pass" : v === "FAIL" ? "st-fail" : "") }, esc(v)); }
  function section(n, title, inner) { return tag("section", { "class": "sec" }, tag("h2", null, n + ". " + esc(title)) + inner); }

  // Inputs that differ from the data-file defaults (module defaults, the profile's bench conditions),
  // plus scenario events and a forced profile. Display only.
  function overridesText(inp) {
    var parts = [], prof = D().profiles.filter(function (p) { return p.profile_id === inp.profile_id; })[0];
    Object.keys(inp.module_parameters).forEach(function (k) {
      if (inp.module_parameters[k] !== D().module_defaults[k]) parts.push("module." + k + " = " + showVal(inp.module_parameters[k]));
    });
    if (prof) Object.keys(inp.bench_conditions).forEach(function (k) {
      if (inp.bench_conditions[k] !== prof.bench_conditions[k]) parts.push("bench." + k + " = " + showVal(inp.bench_conditions[k]));
    });
    var sc = D().scenarios.filter(function (s) { return s.scenario_id === inp.scenario_id; })[0];
    if (sc) {
      (sc.events || []).forEach(function (e) { parts.push("event: " + e.trigger + " at " + Math.round(e.at_progress * 100) + "% of " + e.at_stage); });
      if (sc.force_profile) parts.push("force_profile = " + sc.force_profile);
    }
    return parts.length ? parts.join("; ") : "none (defaults)";
  }
  function paramList(obj, units) {
    return Object.keys(obj).map(function (k) {
      var u = units && units[k] && units[k] !== "–" && units[k] !== "bool" ? " " + units[k] : "";
      return tag("code", null, esc(k)) + " = " + esc(showVal(obj[k]) + u);
    }).join(tag("span", { "class": "sep" }, " · "));
  }

  // ---- Outcome helpers shared by the Result screen and the HTML report (display only; never change a verdict) ----
  // Counts: readings by verdict, stages by status. "Evaluated" readings are those judged PASS or FAIL.
  function countsOf(det) {
    var r = { PASS: 0, FAIL: 0, "NOT RUN": 0, INFO: 0, total: 0 }, s = { total: 0 };
    det.stages.forEach(function (st) {
      s.total++; s[st.status] = (s[st.status] || 0) + 1;
      st.readings.forEach(function (x) { r.total++; r[x.verdict] = (r[x.verdict] || 0) + 1; });
    });
    r.evaluated = r.PASS + r.FAIL;
    return { readings: r, stages: s };
  }
  function countsText(det) {
    var c = countsOf(det), r = c.readings, s = c.stages, rp = [], sp = [];
    rp.push(r.evaluated + " evaluated (" + r.PASS + " passed, " + r.FAIL + " failed)");
    if (r["NOT RUN"]) rp.push(r["NOT RUN"] + " not run");
    if (r.INFO) rp.push(r.INFO + " info only");
    sp.push((s.DONE || 0) + " of " + s.total + " done");
    ["BLOCKED", "INTERRUPTED", "NOT_RUN", "NOT_APPLICABLE", "NOT_MODELLED"].forEach(function (k) {
      if (s[k]) sp.push(s[k] + " " + statusText(k).toLowerCase());
    });
    return { readings: "Readings: " + rp.join(" · "), stages: "Stages: " + sp.join(" · ") };
  }
  // Why a run stopped, in plain words (from the overall abort reason and the ABORT_TRIGGER event)
  function abortText(det) {
    var reason = det.overall.abort_reason;
    if (!reason || reason === "SAFE_STATE_NOT_VERIFIED") return "";
    var trig = det.events.filter(function (e) { return e.type === "ABORT_TRIGGER"; })[0];
    var where = trig ? " during " + (trig.stage || "the run") + " at " + secText(trig.physical_time_s) : "";
    if (reason === "OPERATOR") return "Stopped by the operator" + where + ".";
    if (reason === "WATCHDOG") return "Controller heartbeat lost" + where + "; the bench stopped the run.";
    var il = D().interlocks.filter(function (x) { return x.id + "_OPEN" === reason; })[0];
    if (il) return "Interlock " + il.id + " opened (" + il.short + ")" + where + "; the bench stopped the run.";
    return "Stopped: " + reason + where + ".";
  }
  // Safe-state verification in words. With the meter unavailable, the retained voltage is a model estimate.
  function verificationText(ss) {
    if (!ss) return "not run";
    if (ss.verification === "VERIFIED") return "discharge verified · bus " + F().fixed(ss.v_bus_at_verification_v, 2) + " V at verification";
    if (ss.verification === "DISCHARGE_FAILED") return "discharge not verified · bus " + F().fixed(ss.v_bus_at_verification_v, 2) + " V at verification (did not reach the safe level)";
    if (ss.verification === "VERIFICATION_UNAVAILABLE") return "discharge not verified · verification meter unavailable; not measured";
    return ss.verification;
  }
  function vBusVerifyText(ss) {
    if (ss.verification === "VERIFICATION_UNAVAILABLE")
      return "not measured (verification unavailable) · model estimate " + F().fixed(ss.v_bus_at_verification_v, 2) + " V";
    return F().fixed(ss.v_bus_at_verification_v, 2) + " V";
  }
  // Key findings, most urgent first: unresolved safe state, failed checks, interruption, configuration block,
  // checks that did not run. Each has a kind (safety, fail, stop, block, note) and plain text.
  function keyFindings(det) {
    var f = [], o = det.overall, ss = det.safe_state;
    if (ss && ss.final_state === "FAULT_LOCKED") f.push({ kind: "safety", text: "Safe state not verified: " +
      (ss.verification === "VERIFICATION_UNAVAILABLE" ? "the verification meter was unavailable, so the discharge could not be confirmed"
        : "the bus did not discharge to the safe level within the timeout") + ". Enclosure kept locked; access locked out." });
    det.stages.forEach(function (st) {
      st.readings.forEach(function (r) {
        if (r.verdict !== "FAIL") return;
        var u = unitOf(r) && r.value !== null ? " " + unitOf(r) : "";
        f.push({ kind: "fail", text: st.test_id + " · " + r.label + ": " + valueText(r) + u + " against " + ruleText(r) + " (margin " + marginText(r) + ")." });
      });
    });
    var stop = abortText(det);
    if (stop) f.push({ kind: "stop", text: "Run interrupted. " + stop + " No module verdict." });
    if (o.block_reason) f.push({ kind: "block", text: D().fixed_texts.config_blocked });
    var blocked = det.stages.filter(function (st) { return st.status === "BLOCKED"; });
    if (blocked.length) f.push({ kind: "note", text: "Not run because a prerequisite did not pass: " +
      blocked.map(function (st) { return st.test_id + (st.blocked_reason ? " (" + st.blocked_reason + ")" : ""); }).join(", ") + "." });
    return f;
  }
  text.countsOf = countsOf; text.countsText = countsText; text.abortText = abortText;
  text.verificationText = verificationText; text.vBusVerifyText = vBusVerifyText; text.keyFindings = keyFindings;

  // Outcome kind shared by the Result screen and the report (display only; from the overall verdict, abort
  // reason and final state, never from the scenario)
  function outcomeKind(det) {
    var o = det.overall, ss = det.safe_state, nFail = countsOf(det).readings.FAIL;
    if (ss && ss.final_state === "FAULT_LOCKED") return { kind: "benchfault", title: "Bench fault · safe state not verified" };
    if (o.verdict === "FAIL") return { kind: "fail", title: "Module failed · " + nFail + (nFail === 1 ? " check" : " checks") };
    if (o.verdict === "ABORTED") return { kind: "interrupted", title: "Test interrupted" };
    if (o.verdict === "PASS") return { kind: "pass", title: "All evaluated checks passed" };
    if (o.verdict === "NOT EVALUATED") return { kind: "blocked", title: "Not evaluated · configuration blocked" };
    return { kind: "incomplete", title: o.verdict === "INCOMPLETE" ? "Test incomplete" : o.verdict };
  }
  text.outcomeKind = outcomeKind;

  // Report styling: light, print-first, two sections (A. Test results, B. AI analysis), compact header.
  var CSS = [
    "*{box-sizing:border-box}",
    "html{-webkit-print-color-adjust:exact;print-color-adjust:exact}",
    "body{margin:0;font:400 12.5px/1.5 -apple-system,\"Segoe UI\",Roboto,\"Helvetica Neue\",Arial,sans-serif;color:#1d1d1f;background:#fff}",
    "h1,h2,h3{color:#1d1d1f;font-weight:600;line-height:1.25;margin:0}",
    "h1{font-size:20px;letter-spacing:-.01em}",
    "h2{font-size:15px;margin:0 0 10px;padding-bottom:6px;border-bottom:1px solid #1d1d1f}",
    "h3{font-size:13px;margin:16px 0 6px;color:#3a3a3c}",
    ".wrap{max-width:900px;margin:0 auto;padding:22px 24px 32px}",
    ".rhead{display:flex;flex-wrap:wrap;justify-content:space-between;gap:10px 28px;padding-bottom:12px;margin-bottom:6px;border-bottom:1px solid #d2d2d7}",
    ".ident{display:grid;grid-template-columns:auto auto;gap:1px 12px;margin:0;font-size:11.5px}.ident dt{color:#6e6e73}.ident dd{margin:0;font-weight:600}",
    ".sub{margin:4px 0 0;font-size:11.5px;color:#6e6e73}",
    ".sec{margin-top:22px}",
    ".muted{color:#6e6e73}.small{font-size:11.5px}",
    ".outcome{margin-right:2px;display:grid;grid-template-columns:minmax(0,3fr) minmax(0,2fr);gap:10px 24px;padding:12px 14px;border:1px solid #d2d2d7;border-left:4px solid #8e8e93;border-radius:6px;break-inside:avoid}",
    ".outcome.k-pass{border-left-color:#3f8500}.outcome.k-fail,.outcome.k-benchfault{border-left-color:#d91c1c}.outcome.k-interrupted,.outcome.k-blocked,.outcome.k-incomplete{border-left-color:#df6500}",
    ".outcome p{margin:0}.kind{font-size:17px;font-weight:600}.k-pass .kind{color:#2f6a00}.k-fail .kind,.k-benchfault .kind{color:#8a0f0f}",
    ".enc{border-left:1px solid #e5e5e7;padding-left:14px}.enc .door{font-size:14px;font-weight:600}.enc .door.locked{color:#8a0f0f}.enc .door.safe{color:#2f6a00}",
    ".findings{margin:0;padding-left:18px}.findings li{margin:0 0 4px}",
    "table{border-collapse:collapse;width:100%}",
    "th,td{text-align:left;vertical-align:top;padding:5px 7px;border-bottom:1px solid #e5e5e7}",
    "thead th{font-size:10.5px;font-weight:600;color:#6e6e73;border-bottom:1px solid #8e8e93}",
    "thead{display:table-header-group}tr{break-inside:avoid}",
    "td{font-variant-numeric:tabular-nums}.num{text-align:right;white-space:nowrap}.u{white-space:nowrap;color:#6e6e73;padding-left:0}",
    ".stage td{padding-top:12px;border-bottom:1px solid #c7c7cc;font-weight:600}.stage .sn{font-weight:400;color:#6e6e73}",
    ".q{color:#6e6e73;font-size:11px;margin-right:4px}",
    ".nr td{color:#8e8e93}",
    ".st{display:inline-block;font-size:10px;font-weight:700;letter-spacing:.02em;text-transform:uppercase;padding:1px 6px;border:1px solid #c7c7cc;border-radius:3px;color:#3a3a3c;white-space:nowrap}",
    ".st-pass{border-color:#3f8500;color:#2f6a00}.st-fail{border-color:#d91c1c;color:#8a0f0f}",
    ".ai{margin-right:2px;padding:12px 14px;border:1px solid #c9d3e6;border-radius:6px;background:#f6f8fc}",
    ".ai .gen{margin:0 0 8px;font-size:11px;color:#4a5568}.ai .sum{margin:0 0 8px;font-size:13px}",
    ".ai ul{margin:0;padding-left:18px}.ai li{margin:0 0 4px}.ai .cite{color:#4a5568;font-size:11px}",
    ".ai .bench{margin:8px 0 0;padding-top:6px;border-top:1px solid #dde3ee;font-size:11.5px;color:#3a3a3c}",
    "@page{size:A4 portrait;margin:12mm}",
    "@media print{.wrap{max-width:none;padding:0}.sec{margin-top:16px}h2{break-after:avoid}.ai{break-inside:avoid}}"
  ].join("\n");

  // opts.ai (optional): { model, generated_local, summary, items: [{ ref, value, explanation }] } — text returned by the
  // AI service for this report. Rendered only in section B; every string is escaped.
  function buildHtml(report, opts) {
    var det = report.deterministic, inp = det.inputs, o = det.overall, md = report.metadata, ss = det.safe_state;
    var ai = opts && opts.ai ? opts.ai : null;
    var ok = outcomeKind(det), findings = keyFindings(det), counts = countsText(det);
    var out = [];

    // Compact header: identification, date, version
    var changed = overridesText(inp);
    out.push(tag("header", { "class": "rhead" },
      tag("div", null, tag("h1", null, "IGBT Test Cell — test report")) +
      tag("dl", { "class": "ident" },
        tag("dt", null, "Report") + tag("dd", null, esc(md.run_id)) +
        tag("dt", null, "Module") + tag("dd", null, esc(inp.module_parameters.module_id)) +
        tag("dt", null, "Operator") + tag("dd", null, esc(md.operator === null || md.operator === "" ? "—" : md.operator)) +
        tag("dt", null, "Date") + tag("dd", null, esc(md.created_local)) +
        tag("dt", null, "Version") + tag("dd", null, "v" + esc(md.software_version) + " · schema " + esc(report.schema_version)))));

    // A. Test results: outcome with reason and enclosure status, key findings, readings by stage
    var enc = !ss ? tag("p", { "class": "door" }, "Not energised") + tag("p", { "class": "small muted" }, "Safe-state procedure not run.")
      : tag("p", { "class": "door " + (ss.door === "LOCKED" ? "locked" : ss.final_state === "SAFE" ? "safe" : "") }, "Door " + esc(ss.door)) +
        tag("p", { "class": "small muted" }, "Final state " + esc(statusText(ss.final_state)) + " · " + esc(verificationText(ss))) +
        (ss.final_state === "FAULT_LOCKED" ? tag("p", { "class": "small" }, "Access locked out until the bench is reset.") : "");
    var outcome = tag("div", { "class": "outcome k-" + ok.kind, "data-verdict": o.verdict },
      tag("div", null, tag("p", { "class": "kind" }, esc(ok.title)) + tag("p", null, esc(o.precedence_reason) + ".")) +
      tag("div", { "class": "enc", "data-door": ss ? ss.door : "NONE", "data-final-state": ss ? ss.final_state : "NONE",
        "data-verification": ss ? ss.verification : "NONE" }, tag("p", { "class": "small muted" }, "Enclosure") + enc));
    var fl = findings.length ? tag("ul", { "class": "findings" }, findings.map(function (x) {
      return tag("li", { "class": "f-" + x.kind }, esc(x.text));
    }).join("")) : tag("p", null, ss && ss.verification === "VERIFIED" ? "None. Every evaluated reading is within its reference range and the safe state was verified." : "None.");

    var rows = [];
    det.stages.forEach(function (st) {
      var note = st.blocked_reason ? " — " + st.blocked_reason : "";
      rows.push(row([td(esc(st.test_id) + " " + tag("span", { "class": "sn" }, esc(st.name)) + " · " +
        tag("span", { "class": "st" }, esc(statusText(st.status))) + tag("span", { "class": "sn" }, esc(note)), { colspan: "5" })],
        { "class": "stage", "data-stage": st.test_id, "data-status": st.status }));
      st.readings.forEach(function (r) {
        rows.push(row([
          td(tag("span", { "class": "q" }, esc(r.quantity_id)) + esc(r.label)),
          td(esc(valueText(r)), { "class": "v num" }),
          td(esc(unitOf(r)), { "class": "u" }),
          td(esc(ruleText(r))),
          td(verdictHtml(r.verdict))
        ], { "class": "rd" + (r.verdict === "NOT RUN" ? " nr" : ""), "data-q": r.quantity_id, "data-verdict": r.verdict }));
      });
    });
    var table = tag("table", { "class": "results" },
      tag("thead", null, row([th("Test", { scope: "col" }), th("Reading", { scope: "col", colspan: "2" }), th("Reference range", { scope: "col" }), th("Result", { scope: "col" })])) +
      tag("tbody", null, rows.join("")));
    out.push(tag("section", { "class": "sec" }, tag("h2", null, "A. Test results") + outcome +
      tag("h3", null, "Key findings") + fl +
      tag("h3", null, "Readings") + table + tag("p", { "class": "small muted" }, esc(counts.readings) + " · " + esc(counts.stages)) +
      // Run configuration as a footnote (reproducibility), not in the header
      tag("p", { "class": "small muted cfg" }, "Run configuration: preset " + esc(inp.scenario_id) + " · seed " + esc(String(inp.seed)) +
        (changed !== "none (defaults)" ? " · changed inputs: " + esc(changed) : "") +
        (inp.noise_rel_sigma > 0 ? " · noise σ " + esc(String(inp.noise_rel_sigma) + " — seeded noise " + noiseText(inp)) : ""))));

    // B. AI analysis: generated text for this run, kept apart from the recorded results. The bench-status line is
    // rendered here from the recorded safe-state fields, never from generated text.
    var bBody;
    if (ai) {
      var bench = !ss ? "safe-state procedure not run" : ["final state " + statusText(ss.final_state), verificationText(ss)]
        .concat(ss.verification === "VERIFICATION_UNAVAILABLE" ? ["bus " + vBusVerifyText(ss)] : [])
        .concat(["enclosure door " + ss.door]).join(" · ");
      bBody = tag("div", { "class": "ai", "data-ai": "generated" },
        tag("p", { "class": "gen" }, "Generated by " + esc(ai.model) + " · " + esc(ai.generated_local) + " · based on section A; recorded results unchanged.") +
        tag("p", { "class": "sum" }, esc(ai.summary)) +
        tag("ul", null, (ai.items || []).map(function (it) {
          // Readable label and recorded value; the validated JSON pointer stays internal
          var v = typeof it.value === "string" ? it.value : JSON.stringify(it.value);
          return tag("li", null, esc(it.explanation) + " " + tag("span", { "class": "cite" }, "(" + esc((it.label || "recorded value") + ": " + v + (it.unit ? " " + it.unit : "")) + ")"));
        }).join("")) +
        tag("p", { "class": "bench", "data-bench": "recorded" }, "Bench status (recorded, not generated): " + esc(bench) + "."));
    } else {
      bBody = tag("p", { "class": "muted", "data-ai": "none" }, "No AI analysis was generated for this run.");
    }
    out.push(tag("section", { "class": "sec" }, tag("h2", null, "B. AI analysis") + bBody));

    return "<!DOCTYPE html>\n<html lang=\"en\">\n<head>\n<meta charset=\"utf-8\">\n" +
      "<meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">\n" +
      "<title>" + esc("IGBT Test Cell report " + md.run_id) + "</title>\n<style>\n" + CSS + "\n</style>\n</head>\n<body>\n" +
      tag("div", { "class": "wrap" }, out.join("\n")) + "\n</body>\n</html>\n";
  }

  return { buildJson: buildJson, buildConfigBlockedJson: buildConfigBlockedJson, serialise: serialise,
           fileName: fileName, download: download, downloadHtml: downloadHtml, buildHtml: buildHtml,
           text: text, localIso: localIso };
})();
