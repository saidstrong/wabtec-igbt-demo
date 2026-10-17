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
  function downloadHtml(report) { return saveBlob(buildHtml(report), "text/html", fileName(report, "html")); }

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

  var CSS = [
    "*{box-sizing:border-box}",
    "html{-webkit-print-color-adjust:exact;print-color-adjust:exact}",
    "body{margin:0;font:400 13px/1.45 Arial,sans-serif;color:#1a1a1a;background:#fff}",
    "h1,h2,h3{color:#000;font-weight:700;line-height:1.25;margin:0}",
    "h1{font-size:22px;letter-spacing:.01em}h2{font-size:12px;text-transform:uppercase;letter-spacing:.07em;margin:0 0 10px;padding-top:8px;border-top:2px solid #000}",
    ".pbanner{position:sticky;top:0;z-index:2;display:flex;align-items:center;justify-content:center;gap:10px;background:#feeeb2;color:#000;font-weight:700;font-size:13px;text-align:center;padding:7px 12px;border-bottom:1px solid #000}",
    ".pbanner:before{content:\"\";flex:none;width:10px;height:10px;background:#000}",
    ".pfooter{display:flex;flex-wrap:wrap;justify-content:space-between;gap:4px 16px;background:#000;color:#fff;font-size:11px;padding:7px 12px}",
    ".page{width:100%;border-collapse:collapse}.page>thead>tr>td,.page>tfoot>tr>td,.page>tbody>tr>td{padding:0;border:none}",
    ".hspace,.fspace{display:none}",
    ".wrap{max-width:1180px;margin:0 auto;padding:18px 20px 28px}",
    ".title{display:flex;align-items:flex-start;gap:12px;padding-bottom:10px}.mark{flex:none;width:14px;height:14px;margin-top:5px;background:#76b900}",
    ".meta{margin:4px 0 0;color:#5e5e5e;font-size:12px}.meta b{color:#000}",
    ".sec{margin-top:22px;break-inside:auto}",
    ".wrap>section.sec:first-of-type{margin-top:12px;padding:12px 16px 14px;border:2px solid #000;break-inside:avoid}",
    ".wrap>section.sec:first-of-type h2{border-top:none;padding-top:0}",
    ".wrap>section.sec:first-of-type p{margin:0 0 4px}",
    ".sstate{font-weight:700;color:#000}",
    ".verdict{display:inline-block;margin-left:6px;font:700 22px/1.15 ui-monospace,Consolas,Menlo,monospace;letter-spacing:.02em;padding:5px 14px;border:3px solid #5e5e5e;background:#f7f7f7;color:#000}",
    ".v-pass{border-color:#3f8500;color:#3f8500;background:#fff}.v-fail{border-color:#e52020;color:#650b0b;background:#fff}",
    ".v-abort{border-color:#df6500;background:#fff}.v-ne{border-color:#5e5e5e}",
    ".label{font-weight:700;color:#000;margin:6px 0 2px}.muted{color:#5e5e5e}",
    ".lock{margin:8px 0 0;padding:7px 12px;background:#e52020;color:#fff;font-weight:700}",
    "table{border-collapse:collapse;width:100%}",
    "th,td{text-align:left;vertical-align:top;padding:5px 7px;border-bottom:1px solid #ccc}",
    "thead th{font-size:10px;text-transform:uppercase;letter-spacing:.02em;color:#5e5e5e;background:#f7f7f7;white-space:nowrap}",
    "thead{display:table-header-group}tr{break-inside:avoid}",
    "td{font-variant-numeric:tabular-nums}.nw{white-space:nowrap}td.v,td.num{font-family:ui-monospace,Consolas,Menlo,monospace;font-size:12px}",
    ".kv th{width:190px;font-weight:400;color:#5e5e5e;white-space:nowrap}.kv td{font-weight:700;color:#000}",
    ".kv td.plain{font-weight:400;color:#1a1a1a}",
    ".kv td.red{color:#fff;background:#e52020}",
    "code{font:700 12px/1.4 Arial,sans-serif;color:#000}.sep{color:#a7a7a7}",
    ".stage td{background:#f7f7f7;border-top:2px solid #000;font-weight:700;color:#000}",
    ".stage .sn{font-weight:400;color:#1a1a1a}",
    ".rd td{border-bottom:none;padding-bottom:2px}.rs td{padding-top:0;font-size:11.5px;color:#5e5e5e}.rs b{color:#1a1a1a}",
    ".nr td{color:#757575}",
    ".chip{display:inline-block;margin:0 3px 3px 0;font-size:10px;font-weight:700;letter-spacing:.02em;padding:2px 6px;border:1px solid #5e5e5e;background:#f7f7f7;color:#000;white-space:nowrap}",
    ".chip-na{border-color:#650b0b;color:#650b0b;background:#fff}",
    ".st{display:inline-block;font-size:10px;font-weight:700;letter-spacing:.02em;text-transform:uppercase;padding:2px 6px;border:1px solid #5e5e5e;background:#f7f7f7;color:#000;white-space:nowrap}",
    ".st-pass{border-color:#3f8500;color:#3f8500;background:#fff}.st-fail{border-color:#e52020;color:#650b0b;background:#fff}",
    ".box{border:1px solid #ccc;border-left:4px solid #000;padding:8px 12px;background:#f7f7f7}.box ul{margin:0;padding-left:18px}",
    ".log td{font-size:11.5px}.num{text-align:right;white-space:nowrap}.ty{font-weight:700;color:#000;white-space:nowrap}",
    ".ev-warn td.ty{box-shadow:inset 3px 0 0 #df6500}.ev-red td.ty{box-shadow:inset 3px 0 0 #e52020;color:#650b0b}",
    ".clocks{display:flex;flex-wrap:wrap;gap:8px 32px;margin:0 0 6px}.clocks b{display:block;font:700 18px/1.3 ui-monospace,Consolas,Menlo,monospace;color:#000}",
    ".caption{font-size:11.5px;color:#5e5e5e;margin:0 0 8px}",
    ".legend{margin:0 0 10px;padding:0;list-style:none}.legend li{margin:0 0 3px}",
    ".limits{max-width:none}",
    "@page{size:A4 landscape;margin:9mm 10mm}",
    "@media print{",
    "  .pbanner{position:fixed;top:0;left:0;right:0}.pfooter{position:fixed;bottom:0;left:0;right:0}",
    "  .hspace{display:block;height:36px}.fspace{display:block;height:34px}",
    "  .wrap{max-width:none;padding:6px 0 0}.sec{margin-top:14px}h2{break-after:avoid}.title{break-after:avoid}",
    "}"
  ].join("\n");

  function buildHtml(report) {
    var det = report.deterministic, inp = det.inputs, o = det.overall, md = report.metadata, ss = det.safe_state;
    var prof = D().profiles.filter(function (p) { return p.profile_id === inp.profile_id; })[0];
    var out = [];

    // 1. Banner (repeated on every printed page) and title block
    out.push(tag("div", { "class": "title" }, tag("span", { "class": "mark" }) + tag("div", null,
      tag("h1", null, "Virtual IGBT test cell — run report") +
      tag("p", { "class": "meta" }, "Run ID " + tag("b", null, esc(md.run_id)) + " · date " + tag("b", null, esc(md.created_local)) +
        " · operator " + tag("b", null, esc(md.operator === null || md.operator === "" ? "—" : md.operator)) +
        " · software " + tag("b", null, "v" + esc(md.software_version)) + " · schema " + esc(report.schema_version)))));

    // 2. Overall verdict, label, precedence reason, block / abort reason
    var reasons = [];
    if (o.block_reason) reasons.push("block_reason: " + o.block_reason);
    if (o.abort_reason) reasons.push("abort_reason: " + o.abort_reason);
    reasons.push("is_acceptance_decision: " + o.is_acceptance_decision);
    out.push(section(2, "Overall",
      tag("p", null, "Overall " + tag("span", { "class": "verdict " + (VERDICT_CLASS[o.verdict] || "v-ne"), "data-verdict": o.verdict }, esc(o.verdict))) +
      tag("p", { "class": "label" }, esc(o.verdict_label)) +
      tag("p", { "class": "muted" }, "Precedence: " + esc(o.precedence_reason)) +
      tag("p", { "class": "muted" }, esc(reasons.join(" · "))) +
      tag("p", { "class": "sstate" }, esc(ss ? "Safe state: " + ss.verification + " · door " + ss.door + " · final state " + ss.final_state : "Safe state: procedure not run")) +
      (ss && ss.final_state === "FAULT_LOCKED" ? tag("p", { "class": "lock" }, esc(D().fixed_texts.fault_locked_banner)) : "")));

    // 3. Inputs
    out.push(section(3, "Inputs", kvTable([
      ["Module ID", inp.module_parameters.module_id],
      ["Scenario", inp.scenario_id + " · " + inp.scenario_name],
      ["Overrides", overridesText(inp)],
      ["Profile", inp.profile_id + " · version " + inp.profile_version + " · status " + inp.profile_status],
      ["Profile badge", prof ? prof.profile_badge : "—"],
      ["Module parameters", paramList(inp.module_parameters, D().module_parameter_units), true, "plain"],
      ["Bench conditions", paramList(inp.bench_conditions, D().bench_parameter_units), true, "plain"],
      ["Seed", String(inp.seed)],
      ["Noise σ (noise_rel_sigma)", String(inp.noise_rel_sigma) + (inp.noise_rel_sigma > 0 ? " — seeded noise " + noiseText(inp) : "")],
      ["Speed", inp.speed + "×"]
    ])));

    // 4. Results table: one stage row, then per reading a main row and a conditions / reason row
    var rows = [];
    det.stages.forEach(function (st) {
      var note = st.blocked_reason ? " — " + st.blocked_reason : st.status_note ? " — " + st.status_note : "";
      rows.push(row([td(esc(st.test_id) + " " + tag("span", { "class": "sn" }, esc(st.name + " · " + st["class"])) + " · " +
        tag("span", { "class": "st" }, esc(statusText(st.status))) + tag("span", { "class": "sn" }, esc(note)), { colspan: "9" })],
        { "class": "stage", "data-stage": st.test_id, "data-status": st.status }));
      if (!st.readings.length) rows.push(row([td(tag("span", { "class": "muted" }, "No module readings in this stage."), { colspan: "9" })], { "class": "rs" }));
      st.readings.forEach(function (r) {
        var nr = r.verdict === "NOT RUN" ? " nr" : "";
        rows.push(row([
          td(esc(st.test_id)),
          td(tag("b", null, esc(r.quantity_id)) + " " + esc(r.label)),
          td(esc(valueText(r)), { "class": "v num" }),
          td(esc(unitOf(r) || "—"), { "class": "nw" }),
          td(esc(r.observation)),
          td(esc(ruleText(r))),
          td(chipTexts(r).map(chipHtml).join(""), { "class": "chips" }),
          td(esc(marginText(r)), { "class": "num" }),
          td(verdictHtml(r.verdict))
        ], { "class": "rd" + nr, "data-q": r.quantity_id, "data-verdict": r.verdict }));
        rows.push(row([td(tag("b", null, "Conditions: ") + esc(r.conditions || "—") + " · " + tag("b", null, "Reason: ") + esc(r.reason) +
          (r.model_equation ? " · " + tag("b", null, "Model: ") + esc(r.model_equation) : ""), { colspan: "9" })], { "class": "rs" + nr }));
      });
    });
    out.push(section(4, "Results", tag("table", { "class": "results" },
      tag("thead", null, row(["Test", "Quantity", "Value", "Unit", "Observation", "Rule", "Basis · reference · approval", "Margin", "Verdict"].map(function (h) { return th(h, { scope: "col" }); }))) +
      tag("tbody", null, rows.join("")))));

    // 5. Hypotheses, kept apart from verdicts
    var hyp = det.hypotheses.length ? det.hypotheses.map(function (h) {
      return tag("li", null, esc((h.source === "SAFE_STATE" ? "Safe state" : h.source + " (" + h.quantity_ids.join(", ") + ")") + ": " + h.text));
    }).join("") : tag("li", { "class": "muted" }, "No FAIL recorded; no hypothesis.");
    out.push(section(5, "Hypotheses (not diagnoses)", tag("div", { "class": "box" }, tag("ul", null, hyp))));

    // 6. Safe-state block; FAULT_LOCKED in red
    var safe;
    if (!ss) safe = tag("p", { "class": "muted" }, "Safe-state procedure not run" + (o.block_reason ? " (configuration blocked: nothing was energised)." : "."));
    else {
      var locked = ss.final_state === "FAULT_LOCKED";
      safe = kvTable([
        ["Trigger", ss.trigger + (o.abort_reason && ss.trigger === "ABORT" ? " (" + o.abort_reason + ")" : "")],
        ["Gate", "commanded " + (ss.gate_off_commanded ? "OFF" : "—") + " · measured " + F().fixed(ss.gate_measured_v, 1) + " V · " + (ss.gate_off_confirmed ? "OFF confirmed" : "OFF NOT confirmed")],
        ["HV source", ss.hv_source_disabled ? "disabled" : "enabled"],
        ["Contactor", ss.contactor_open ? "open" : "closed"],
        ["v_bus at start", F().fixed(ss.v_bus_at_start_v, 1) + " V"],
        ["Discharge", ss.discharge_required ? (ss.discharge_time_s === null ? "required; did not reach v_safe" : "required; " + secText(ss.discharge_time_s)) : "not required (DISCHARGE_NOT_REQUIRED)"],
        ["v_bus at verification", F().fixed(ss.v_bus_at_verification_v, 2) + " V"],
        ["Verification", ss.verification, false, locked ? "red" : null],
        ["Door", ss.door, false, locked ? "red" : null],
        ["Final state", ss.final_state, false, locked ? "red" : null]
      ]);
    }
    out.push(section(6, "Safe state", safe));

    // 7. Event log with both clocks (animation = physical / speed)
    var ev = det.events.map(function (e) {
      var cls = e.type === "WARNING" ? "ev-warn" : (e.type === "ABORT_TRIGGER" || e.type === "FAULT_LOCKED" || e.type === "DISCHARGE_FAILED" || e.type === "VERIFICATION_UNAVAILABLE") ? "ev-red" : null;
      return row([td(String(e.seq), { "class": "num" }), td(F().fixed(e.physical_time_s, 2), { "class": "num" }),
        td(F().fixed(animationOf(e.physical_time_s, inp.speed), 2), { "class": "num" }), td(esc(e.stage || "—")),
        td(esc(e.type), { "class": "ty" }), td(esc(e.detail))], { "class": cls, "data-seq": e.seq });
    }).join("");
    out.push(section(7, "Event log", tag("table", { "class": "log" },
      tag("thead", null, row(["#", "Physical s", "Animation s", "Stage", "Event", "Detail"].map(function (h) { return th(h, { scope: "col" }); }))) +
      tag("tbody", null, ev))));

    // 8. Clocks summary with caption and per-stage physical components
    var comps = det.stages.map(function (st) {
      var c = st.physical_components.map(function (x) { return x.basis + " " + F().num(x.seconds) + " s" + (x.note ? " (" + x.note + ")" : ""); }).join(" + ");
      return row([td(esc(st.test_id + " · " + st.name)), td(esc(statusText(st.status))), td(esc(c || "—")), td(F().fixed(st.physical_estimate_s, 2), { "class": "num" })]);
    }).join("");
    out.push(section(8, "Clocks",
      tag("div", { "class": "clocks" }, tag("span", null, "Estimated physical total" + tag("b", null, secText(det.physical_total_s))) +
        tag("span", null, "Animation total" + tag("b", null, secText(report.presentation.animation_total_s) + " at " + inp.speed + "×"))) +
      tag("p", { "class": "caption" }, esc(report.presentation.clock_caption)) +
      tag("table", null, tag("thead", null, row(["Stage", "Status", "Physical components", "Estimate s"].map(function (h) { return th(h, { scope: "col" }); }))) +
        tag("tbody", null, comps))));

    // 9. Case reference register entries used in this run
    var refs = report.case_references.length ? tag("table", null,
      tag("thead", null, row(["Reference", "Source", "Statement (paraphrase)", "Applies to (per case)"].map(function (h) { return th(h, { scope: "col" }); }))) +
      tag("tbody", null, report.case_references.map(function (r) {
        return row([td(tag("b", null, esc(r.reference_id))), td(esc(r.source)), td(esc(r.statement)), td(esc(r.applies_to))]);
      }).join(""))) : tag("p", { "class": "muted" }, "No case reference cited in this run.");
    out.push(section(9, "Case references used in this run", tag("p", { "class": "caption" },
      "A case reference records what the hackathon slides state; it is not an acceptance criterion.") + refs));

    // 10. Chip legend and limitations statement
    out.push(section(10, "Chip legend and limitations",
      tag("ul", { "class": "legend" }, D().fixed_texts.chip_legend.map(function (c) { return tag("li", null, chipHtml(c.chip) + " = " + esc(c.meaning)); }).join("")) +
      tag("p", { "class": "limits" }, esc(report.limitations))));

    // 11. Footer on every printed page; banner on every printed page
    var banner = tag("div", { "class": "pbanner", role: "note" }, esc(report.simulation_banner));
    var footer = tag("div", { "class": "pfooter" }, tag("span", null, esc(D().fixed_texts.report_footer)) +
      tag("span", null, esc(report.simulation_banner)) + tag("span", null, esc(md.run_id + " · v" + md.software_version)));
    var page = tag("table", { "class": "page", role: "presentation" },
      tag("thead", null, row([td(tag("div", { "class": "hspace" }))])) +
      tag("tbody", null, row([td(tag("div", { "class": "wrap" }, out.join("\n")))])) +
      tag("tfoot", null, row([td(tag("div", { "class": "fspace" }))])));

    return "<!DOCTYPE html>\n<html lang=\"en\">\n<head>\n<meta charset=\"utf-8\">\n" +
      "<meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">\n" +
      "<title>" + esc("Report " + md.run_id + " — SIMULATION") + "</title>\n<style>\n" + CSS + "\n</style>\n</head>\n<body>\n" +
      banner + "\n" + page + "\n" + footer + "\n</body>\n</html>\n";
  }

  return { buildJson: buildJson, buildConfigBlockedJson: buildConfigBlockedJson, serialise: serialise,
           fileName: fileName, download: download, downloadHtml: downloadHtml, buildHtml: buildHtml,
           text: text, localIso: localIso };
})();
