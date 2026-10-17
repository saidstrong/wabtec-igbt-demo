/* ui.js: rendering and controls. Banner, profile badge, Limitations, Setup (Screen 1),
   Validation error (1a), Configuration blocked (1b), Pre-check (2), Run (3), Result (4),
   Report (5), FAULT_LOCKED banner. The run itself lives in sequencer.js; this file only drives its
   clock (advance(speed × real dt)) and renders it. */
window.IGBT = window.IGBT || {};
window.IGBT.ui = (function () {
  var D, V, E, SEQ, REP, F;
  var runCounter = 0;
  var state = { runId: null, lastResult: null, userProfile: "demo", run: null, setup: null, report: null, blocked: null, view: null,
                timer: null, lastTick: 0, logCount: 0, focusKey: null };

  function el(tag, attrs, children) {
    var n = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      if (k === "text") n.textContent = attrs[k];
      else if (k === "class") n.className = attrs[k];
      else if (k.indexOf("on") === 0) n.addEventListener(k.slice(2), attrs[k]);
      else n.setAttribute(k, attrs[k]);
    });
    (children || []).forEach(function (c) { if (c) n.appendChild(typeof c === "string" ? document.createTextNode(c) : c); });
    return n;
  }
  function $(id) { return document.getElementById(id); }
  function clear(n) { while (n.firstChild) n.removeChild(n.firstChild); return n; }
  function pad(n, w) { n = String(n); while (n.length < w) n = "0" + n; return n; }
  function show(v) { return v === null ? "null" : v === undefined ? "(missing)" : typeof v === "string" ? "\"" + v + "\"" : String(v); }

  // RUN-YYYYMMDD-NNNN, unique within the browser session (05 §11)
  function nextRunId() {
    try {
      var stored = parseInt(window.sessionStorage.getItem("igbt_run_counter") || "0", 10);
      if (stored > runCounter) runCounter = stored;
    } catch (e) { /* storage unavailable: in-memory counter only */ }
    runCounter += 1;
    try { window.sessionStorage.setItem("igbt_run_counter", String(runCounter)); } catch (e) { }
    var d = new Date();
    return "RUN-" + d.getFullYear() + pad(d.getMonth() + 1, 2) + pad(d.getDate(), 2) + "-" + pad(runCounter, 4);
  }

  // ---- shared chrome: footer version. Simulation/limitation texts stay in the JSON report (simulation_banner,
  // limitations); the operator screens no longer show a banner, a Limitations dialog or a global fault banner. ----
  function renderChrome() {
    if ($("footer-version")) $("footer-version").textContent = "v" + D.software_version;
  }
  // Operator labels for profile IDs (display only; the profile_id in setup and JSON is unchanged)
  var PROFILE_LABEL = { demo: "Standard", production_unconfigured: "Production (no limits configured)" };
  function profileLabel(id) { return PROFILE_LABEL[id] || id; }
  function setBadge(profileId) {
    var p = V.findProfile(profileId);
    var b = $("profile-badge");
    b.textContent = p ? p.profile_badge : "";
    b.className = "badge " + (p && p.profile_status === "demo" ? "badge-demo" : "badge-prod");
    if ($("limitations-profile")) $("limitations-profile").textContent = p ? "Profile: " + p.profile_badge : "";
  }
  // Workflow strip: which of the five steps (02 §11) a screen belongs to
  var screenShownOnce = false;
  var SCREENS = ["screen-setup", "screen-invalid", "screen-blocked", "screen-precheck", "screen-run", "screen-result", "screen-report"];
  var SCREEN_STEP = { "screen-setup": 1, "screen-invalid": 1, "screen-blocked": 1, "screen-precheck": 2, "screen-run": 3, "screen-result": 4, "screen-report": 5 };
  function setStep(n) {
    Array.prototype.forEach.call(document.querySelectorAll("#workflow-steps li"), function (li) {
      var s = parseInt(li.getAttribute("data-step"), 10);
      li.className = s < n ? "done" : "";
      if (s === n) li.setAttribute("aria-current", "step"); else li.removeAttribute("aria-current");
    });
  }
  function showScreen(id) {
    SCREENS.forEach(function (s) { $(s).hidden = s !== id; });
    if ($("workflow-steps")) setStep(SCREEN_STEP[id] || 1);
    window.scrollTo(0, 0);
    // Move keyboard / screen-reader focus to the new screen's heading
    var h = $(id).querySelector("h2[tabindex]");
    if (h && screenShownOnce) h.focus({ preventScroll: true });
    screenShownOnce = true;
  }

  // ---- shared formatting: the same text helpers as the HTML report (report.js), so they agree ----
  function unitOf(r) { return REP.text.unitOf(r); }
  function valueText(r) { return REP.text.valueText(r); }
  function ruleText(r) { return REP.text.ruleText(r); }
  function marginText(r) { return REP.text.marginText(r); }
  // Provenance chips (05 §1): basis, case reference, NOT APPROVED; info rules say so
  function chipsFor(r) {
    var box = el("div", { class: "chips" });
    REP.text.chipTexts(r).forEach(function (t) {
      var attrs = { class: "chip" + (t === "NOT APPROVED" ? " chip-na" : ""), text: t };
      if (t.indexOf("Case ref ") === 0) attrs.title = r.reference_text || "";
      box.appendChild(el("span", attrs));
    });
    return box;
  }
  function verdictChip(v) {
    var cls = v === "PASS" ? "st st-pass" : v === "FAIL" ? "st st-fail" : "st";
    return el("span", { class: cls, text: v });
  }
  function statusClass(s) {
    return s === "RUNNING" ? "st st-run" : (s === "BLOCKED" || s === "INTERRUPTED") ? "st st-warn" : "st";
  }
  // Aggregate PASS/FAIL chip for the stage list. Not for the CLOSING stage (T10): its DONE means the safe-state
  // procedure ran, and its outcome is the safe-state record (verification, door, final state), not its readings.
  // Each reading keeps its own verdict; engine verdicts are unchanged.
  function stageVerdict(st) {
    if (st.status !== "DONE" || st["class"] === "CLOSING") return null;
    if (!st.readings.some(function (r) { return r.required; })) return null;
    return E.stagePass(st) ? "PASS" : "FAIL";
  }
  function sec(x) { return F.fixed(x, 2) + " s"; }
  function runMeta(setup, inputs) {
    return setup.run_id + " · scenario " + inputs.scenario_id + " (" + inputs.scenario_name + ") · profile " + profileLabel(inputs.profile_id) +
      " · seed " + inputs.seed + " · noise " + (inputs.noise_rel_sigma > 0 ? "σ " + inputs.noise_rel_sigma : "off") +
      " · speed " + inputs.speed + "× · operator " + setup.operator;
  }

  // ---- Screen 1: Setup ----
  function effectiveProfileId() {
    var sc = V.findScenario($("in-scenario").value);
    return sc && sc.force_profile ? sc.force_profile : $("in-profile").value;
  }
  function refreshSetup() {
    var sc = V.findScenario($("in-scenario").value);
    var forced = sc && sc.force_profile;
    // A forcing scenario (S5) sets the profile; leaving it restores the user's own choice
    $("in-profile").value = forced || state.userProfile;
    $("in-profile").disabled = !!forced;
    $("profile-forced").hidden = !forced;
    setBadge(effectiveProfileId());
    $("custom-panel").hidden = !(sc && sc.custom);
    $("noise-note").textContent = $("in-noise").value === "on"
      ? "Seeded noise per reading (truncated at ±3σ; same seed, same readings). The 03 §12 values assume σ = 0."
      : "";
    var ov = $("scenario-overrides");
    ov.textContent = "";
    if (sc && !sc.custom) {
      var parts = [];
      ["module", "bench"].forEach(function (g) {
        Object.keys(sc.overrides[g] || {}).forEach(function (k) { parts.push(g + "." + k + " = " + show(sc.overrides[g][k])); });
      });
      (sc.events || []).forEach(function (e) { parts.push("event: " + e.trigger + " at " + Math.round(e.at_progress * 100) + "% of " + e.at_stage); });
      if (sc.force_profile) parts.push("force_profile = " + sc.force_profile);
      ov.textContent = parts.length ? "Scenario inputs: " + parts.join("; ") : "Scenario inputs: defaults (no overrides)";
    }
    syncSetupSummary();
  }
  // Display only: the scenario shortcuts mirror the full selector; the Advanced summary shows its current values
  function syncSetupSummary() {
    var id = $("in-scenario").value;
    Array.prototype.forEach.call(document.querySelectorAll("#quick-scenarios [data-scenario]"), function (b) {
      b.setAttribute("aria-pressed", String(b.getAttribute("data-scenario") === id));
    });
    if ($("advanced-summary")) $("advanced-summary").textContent = "profile " + profileLabel(effectiveProfileId()) + " · noise " + $("in-noise").value +
      " · seed " + $("in-seed").value + " · " + $("in-speed").value + "×";
  }
  // Each shortcut sets the full selector and fires its change handler (refreshSetup), the same path as picking it there
  function buildQuickScenarios() {
    var scSel = $("in-scenario");
    Array.prototype.forEach.call(document.querySelectorAll("#quick-scenarios [data-scenario]"), function (b) {
      var sc = V.findScenario(b.getAttribute("data-scenario"));
      var opt = sc && Array.prototype.filter.call(scSel.options, function (o) { return o.value === sc.scenario_id && !o.disabled; })[0];
      if (!opt) { b.hidden = true; return; }
      b.querySelector(".choice-s").textContent = sc.scenario_id + " · " + sc.name;
      b.addEventListener("click", function () {
        scSel.value = sc.scenario_id;
        scSel.dispatchEvent(new Event("change"));
      });
    });
  }

  // ---- Run configuration for the operator flow (no scenario controls on screen) ----
  // Playback defaults to 16×. A supported preset is drawn at random once per new test and held for the run:
  // built presets only (P0/P1), never Custom and never a preset that forces the configuration-blocked profile.
  // Only the starting conditions (the preset) are random; the engine, rules and verdicts are untouched, and the
  // JSON records scenario_id and seed so the run can be reproduced (node dev/run-node.js <scenario_id>).
  var DEFAULT_SPEED = 16;
  function presetPool(data) {
    return data.scenarios.filter(function (s) {
      return data.built_priorities.indexOf(s.priority) >= 0 && !s.custom && !s.force_profile;
    }).map(function (s) { return s.scenario_id; });
  }
  function pickPreset(data, rand) {
    var pool = presetPool(data), r = typeof rand === "function" ? rand() : Math.random();
    return pool[Math.min(pool.length - 1, Math.floor(r * pool.length))];
  }
  function choosePreset() {
    var sel = $("in-scenario");
    sel.value = pickPreset(D);
    state.preset = sel.value;
  }

  function buildSetup() {
    var scSel = $("in-scenario");
    D.scenarios.forEach(function (s) {
      var built = D.built_priorities.indexOf(s.priority) >= 0;
      var o = el("option", { value: s.scenario_id, text: s.scenario_id + " · " + s.name + (built ? "" : " — not built yet") });
      if (!built) o.disabled = true;
      scSel.appendChild(o);
    });
    var pSel = $("in-profile");
    D.profiles.forEach(function (p) { pSel.appendChild(el("option", { value: p.profile_id, text: profileLabel(p.profile_id) })); });
    var nSel = $("in-noise");
    nSel.appendChild(el("option", { value: "off", text: "Off (σ = 0, default)" }));
    nSel.appendChild(el("option", { value: "on", text: "On (σ = " + D.noise_on_sigma + "; Q14 σ = " + 2 * D.noise_on_sigma + ") · P1" }));
    var spSel = $("in-speed");
    D.speeds.forEach(function (s) { spSel.appendChild(el("option", { value: String(s), text: s + "×" })); });

    $("in-module-id").value = D.module_defaults.module_id;
    pSel.value = state.userProfile;
    scSel.value = "S0";
    $("in-seed").value = String(D.seed_default);
    spSel.value = String(DEFAULT_SPEED);

    buildCustomTable();
    buildQuickScenarios();
    nSel.value = "off";
    $("in-seed").addEventListener("input", syncSetupSummary);
    spSel.addEventListener("change", syncSetupSummary);
    scSel.addEventListener("change", refreshSetup);
    nSel.addEventListener("change", refreshSetup);
    pSel.addEventListener("change", function () { state.userProfile = pSel.value; refreshSetup(); });
    $("btn-continue").addEventListener("click", onContinue);
    $("btn-reset-custom").addEventListener("click", function () { buildCustomTable(); });
    Array.prototype.forEach.call(document.querySelectorAll(".btn-back"), function (b) { b.addEventListener("click", backToSetup); });
    newRunId();
    choosePreset();
    refreshSetup();
  }
  function newRunId() { state.runId = nextRunId(); $("run-id").textContent = state.runId; }
  function backToSetup() {
    stopTimer();
    state.run = null; state.report = null; state.blocked = null; state.view = null;
    newRunId(); choosePreset(); refreshSetup(); showScreen("screen-setup");
  }

  // Custom: editable module-parameter table with units (module_id is set above, module_note is fixed)
  function buildCustomTable() {
    var body = clear($("custom-body"));
    var defs = D.module_defaults, units = D.module_parameter_units;
    Object.keys(defs).forEach(function (k) {
      if (k === "module_id" || k === "module_note") return;
      var input;
      if (k === "module_note") {
        input = el("span", { class: "fixed", text: defs[k] });
      } else if (typeof defs[k] === "boolean") {
        input = el("select", { "data-param": k, "data-kind": "bool", "aria-label": k }, [el("option", { value: "true", text: "true" }), el("option", { value: "false", text: "false" })]);
        input.value = String(defs[k]);
      } else {
        input = el("input", { type: "text", "data-param": k, "data-kind": "num", "aria-label": k + " (" + units[k] + ")", value: String(defs[k]), inputmode: "decimal", size: "10", autocomplete: "off", spellcheck: "false" });
      }
      var hint = k === "desat_trip_us" ? "leave empty = never trips (null)" : "";
      body.appendChild(el("tr", null, [
        el("td", null, [el("code", { text: k, translate: "no" })]),
        el("td", null, [input]),
        el("td", { text: units[k] }),
        el("td", { class: "muted", text: "default " + show(defs[k]) + (hint ? "; " + hint : "") })
      ]));
    });
  }
  // Read the table; return only parameters that differ from the defaults.
  // Unparseable text is passed through as text so validation reports it.
  function readCustomOverrides() {
    var mod = {};
    Array.prototype.forEach.call(document.querySelectorAll("#custom-body [data-param]"), function (inp) {
      var k = inp.getAttribute("data-param"), raw = inp.value, v;
      if (inp.getAttribute("data-kind") === "bool") v = raw === "true";
      else {
        var t = raw.trim().replace("−", "-");
        if (t === "") v = null;
        else if (/^[-+]?(\d+\.?\d*|\.\d+)([eE][-+]?\d+)?$/.test(t)) v = parseFloat(t);
        else v = raw;
      }
      if (v !== D.module_defaults[k]) mod[k] = v;
    });
    return { module: mod, bench: {} };
  }

  function readSetup() {
    var seedTxt = $("in-seed").value.trim();
    var seed = /^[-+]?\d+$/.test(seedTxt) ? parseInt(seedTxt, 10) : (seedTxt === "" ? null : Number(seedTxt));
    var sc = V.findScenario($("in-scenario").value);
    var setup = {
      run_id: state.runId,
      module_id: $("in-module-id").value,
      profile_id: $("in-profile").value,
      scenario_id: $("in-scenario").value,
      seed: (typeof seed === "number" && isNaN(seed)) ? seedTxt : seed,
      speed: parseInt($("in-speed").value, 10),
      operator: $("in-operator").value,
      noise: $("in-noise").value === "on"
    };
    if (sc && sc.custom) setup.custom_overrides = readCustomOverrides();
    return setup;
  }

  function onContinue() {
    var setup = readSetup();
    var res = V.configPreflight(setup);
    state.lastResult = { setup: setup, result: res };
    if (res.status === "INVALID") renderInvalid(setup, res.errors);
    else if (res.status === "CONFIG_BLOCKED") renderBlocked(setup, res);
    else renderPrecheck(setup, res);
  }

  // ---- Screen 1a: validation error ----
  function renderInvalid(setup, errors) {
    $("invalid-run").textContent = setup.run_id + " · scenario " + setup.scenario_id;
    var body = clear($("invalid-body"));
    errors.forEach(function (e) {
      body.appendChild(el("tr", null, [el("td", null, [el("code", { text: e.field, translate: "no" })]), el("td", null, [el("code", { text: show(e.value), translate: "no" })]), el("td", { text: e.rule })]));
    });
    $("invalid-count").textContent = errors.length + (errors.length === 1 ? " invalid input" : " invalid inputs") + ". No run and no verdict. Go back to setup, fix the values listed below, then press Check readiness again.";
    showScreen("screen-invalid");
  }

  // ---- Screen 1b: configuration blocked; Download JSON exports the CONFIG_BLOCKED report ----
  function renderBlocked(setup, res) {
    setBadge(res.inputs.profile_id);
    $("blocked-run").textContent = setup.run_id + " · scenario " + setup.scenario_id + " · profile " + res.inputs.profile_id;
    $("blocked-text").textContent = "No production limits are configured, so the bench was not energised. Not evaluated.";
    $("blocked-label").textContent = D.verdict_labels.NOT_EVALUATED;
    $("blocked-reason").textContent = "block_reason: " + res.block_reason;
    // One report object per blocked run, so the JSON and HTML exports carry the same metadata
    state.blocked = { setup: setup, res: res, report: REP.buildConfigBlockedJson(res, { run_id: setup.run_id, operator: setup.operator }) };
    showScreen("screen-blocked");
  }
  function exportBlocked() { if (state.blocked) REP.download(state.blocked.report); }

  // ---- Screen 2: Pre-check (IL1–IL7 lamps; START only when all OK) ----
  var IL_TOGGLES = {
    IL1: ["Open door", "Close door"],
    IL2: ["Press E-stop", "Release E-stop"],
    IL6: ["Lose heartbeat", "Restore heartbeat"]
  };
  function renderPrecheck(setup, res) {
    stopTimer();
    state.setup = setup; state.report = null;
    state.run = SEQ.create(res);
    $("precheck-run").textContent = runMeta(setup, res.inputs);
    renderLamps();
    showScreen("screen-precheck");
  }
  function renderLamps() {
    var run = state.run, list = clear($("lamps"));
    D.interlocks.forEach(function (il) {
      var ok = run.interlocks[il.id];
      var li = el("li", { class: "lamp " + (ok ? "ok" : "open") }, [
        el("span", { class: "lamp-dot", "aria-hidden": "true" }),
        el("span", { class: "lamp-name", text: il.id + " · " + il.name }),
        el("span", { class: "lamp-state", text: ok ? "OK" : "OPEN" }),
        el("span", { class: "lamp-src", text: "Control: " + il.demo_control })
      ]);
      if (IL_TOGGLES[il.id]) {
        var label = IL_TOGGLES[il.id][ok ? 0 : 1];
        li.appendChild(el("button", { type: "button", text: label, "aria-label": label + " (" + il.id + ")",
          onclick: function () { SEQ.setInterlock(run, il.id, !run.interlocks[il.id]); renderLamps(); } }));
      }
      list.appendChild(li);
    });
    var allOk = SEQ.allInterlocksOk(run);
    $("btn-start").disabled = !allOk;
    var open = D.interlocks.filter(function (il) { return !run.interlocks[il.id]; }).map(function (il) { return il.id; });
    $("precheck-status").hidden = allOk;
    $("precheck-status").textContent = allOk ? "" : "Start test unavailable: " + open.map(function (id) {
      return id + " (" + D.interlocks.filter(function (il) { return il.id === id; })[0].short + ")";
    }).join(", ") + " not OK.";
    if ($("precheck-ready")) {
      $("precheck-ready").hidden = !allOk;
      $("precheck-ready").textContent = allOk ? "Ready to start" : "";
    }
    // Readiness summary (display only; follows the interlock states). Module connected = fixture/DUT (IL4) and
    // fibre link (IL5); bench ready = every other interlock.
    var MODULE_IL = ["IL4", "IL5"];
    function summary(rowId, ids, okText, noText) {
      var row = $(rowId);
      if (!row) return;
      var bad = ids.filter(function (id) { return !run.interlocks[id]; });
      row.className = "rd " + (bad.length ? "no" : "ok");
      row.querySelector(".rd-state").textContent = bad.length ? noText : okText;
      row.querySelector(".rd-src").textContent = bad.length ? bad.join(", ") + " open" : ids.join(", ") + " OK";
    }
    summary("ready-module", MODULE_IL, "Connected", "Not connected");
    summary("ready-bench", D.interlocks.map(function (il) { return il.id; }).filter(function (id) { return MODULE_IL.indexOf(id) < 0; }), "Ready", "Not ready");
    if ($("interlock-sum")) $("interlock-sum").textContent = open.length ? open.length + " open" : "all " + D.interlocks.length + " OK";
    if ($("precheck-interlocks") && open.length) $("precheck-interlocks").open = true;
  }
  function onStart() {
    var res = SEQ.start(state.run);
    if (!res.ok) { $("precheck-status").hidden = false; $("precheck-status").textContent = "Start refused: " + res.reason + "."; return; }
    showRun();
  }

  // ---- Screen 3: Run ----
  function now() { return window.performance && window.performance.now ? window.performance.now() : Date.now(); }
  function startTimer() {
    stopTimer();
    state.lastTick = now();
    state.timer = setInterval(tick, 100);
  }
  function stopTimer() { if (state.timer) { clearInterval(state.timer); state.timer = null; } }
  // Timer: advance(speed × real dt). A long gap (hidden tab) is capped at 0.5 s real time.
  function tick() {
    var t = now(), dt = Math.min(0.5, Math.max(0, (t - state.lastTick) / 1000));
    state.lastTick = t;
    SEQ.advance(state.run, state.run.inputs.speed * dt);
    renderRun();
    if (SEQ.isTerminal(state.run)) { stopTimer(); onRunFinished(); }
  }
  function showRun() {
    var run = state.run;
    $("run-meta").textContent = runMeta(state.setup, run.inputs);
    $("clock-speed").textContent = run.inputs.speed + "×";
    clear($("log-body")); state.logCount = 0; state.focusKey = null;
    $("btn-view-result").disabled = true;
    $("btn-run-new").hidden = true;
    renderRun();
    showScreen("screen-run");
    startTimer();
  }
  function onRunFinished() {
    var run = state.run;
    state.report = REP.buildJson(run, { run_id: state.setup.run_id, operator: state.setup.operator });
    $("btn-view-result").disabled = false;
    $("btn-run-new").hidden = run.state === "FAULT_LOCKED";
    renderRun();
  }

  var STATE_CLASS = { RUNNING: "st st-run", SAFE_STATE_PROCEDURE: "st st-warn", SAFE: "st st-pass", FAULT_LOCKED: "st st-lock", ENDED: "st", RESET: "st" };
  // Operator wording for the run state (display only; the JSON keeps the state names)
  var STATE_TEXT = { RUNNING: "Testing", SAFE_STATE_PROCEDURE: "Making safe", SAFE: "Safe", FAULT_LOCKED: "Fault · locked", ENDED: "Ended", RESET: "Reset" };
  function renderRun() {
    var run = state.run;
    if (!run) return;
    var rs = $("run-state");
    rs.textContent = STATE_TEXT[run.state] || run.state.replace(/_/g, " ");
    rs.className = STATE_CLASS[run.state] || "st";
    // Enclosure and access state, always visible during the run (display only, from the bench state)
    var enc = $("run-enclosure"), bb = SEQ.bench(run);
    if (enc) {
      var lockout = run.state === "FAULT_LOCKED";
      enc.className = "enc-pill " + (lockout ? "lockout" : bb.door_locked ? "locked" : "unlocked");
      enc.textContent = lockout ? "Enclosure locked · access locked out" :
        bb.door_locked ? "Enclosure locked · bus " + F.fixed(bb.v_bus_v, 0) + " V" : "Enclosure unlocked";
    }
    $("clock-phys").textContent = sec(run.t);
    $("clock-anim").textContent = sec(run.t / run.inputs.speed);
    renderStageList(run);
    renderActive(run);
    renderReadings(run);
    renderBench(run);
    renderLog(run);
    var live = run.state === "RUNNING" || run.state === "SAFE_STATE_PROCEDURE";
    ["btn-abort", "btn-door", "btn-heartbeat"].forEach(function (id) { $(id).disabled = !live; });
    $("btn-abort").hidden = SEQ.isTerminal(run);
  }

  function renderStageList(run) {
    var list = clear($("stage-list")), active = SEQ.activeStage(run), prog = SEQ.stageProgress(run);
    run.stages.forEach(function (st) {
      var isActive = !!active && active.test_id === st.test_id;
      var stat = el("span", { class: "stat" }, [el("span", { class: statusClass(st.status), text: st.status.replace(/_/g, " ") })]);
      var v = stageVerdict(st);
      if (v) stat.appendChild(verdictChip(v));
      var li = el("li", { class: (isActive ? "active" : "") + (st.status === "NOT_APPLICABLE" || st.status === "NOT_MODELLED" ? " skipped" : "") }, [
        el("span", { class: "id", text: st.test_id }),
        el("span", { class: "nm", text: st.name }),
        stat,
        el("span", { class: "cls", text: st["class"] })
      ]);
      if (isActive) li.setAttribute("aria-current", "step");
      if (isActive && prog !== null) {
        var pc = Math.round(prog * 100);
        var bar = el("div", { class: "progress", role: "progressbar", "aria-valuemin": "0", "aria-valuemax": "100", "aria-valuenow": String(pc), "aria-label": st.test_id + " progress" }, [el("span")]);
        bar.firstChild.style.width = pc + "%";
        bar.style.gridColumn = "1 / -1";
        li.appendChild(bar);
      }
      list.appendChild(li);
    });
  }

  function renderActive(run) {
    var box = clear($("active-stage")), st = SEQ.activeStage(run), prog = SEQ.stageProgress(run);
    if (!st) {
      var o = run.overall;
      box.appendChild(el("p", { class: "active-name", text: run.state === "PRECHECK" ? "Not started" : "Test finished · " + (STATE_TEXT[run.state] || run.state) }));
      if (o) box.appendChild(el("p", { class: "active-meta", text: "Review the outcome for the result." }));
      return;
    }
    // Stage class and excitation stay in the stage list and report; here only the check and its note
    box.appendChild(el("p", { class: "active-name", text: st.test_id + " · " + st.name }));
    if (st.status_note) box.appendChild(el("p", { class: "active-meta", text: st.status_note }));
    // Display only: where this test sits in the sequence, with the stage's own progress
    var idx = run.stages.indexOf(st) + 1;
    var pc = prog === null ? 0 : Math.round(prog * 100);
    var bar = el("div", { class: "progress", role: "progressbar", "aria-valuemin": "0", "aria-valuemax": "100", "aria-valuenow": String(pc),
      "aria-label": st.test_id + " progress" }, [el("span")]);
    bar.firstChild.style.width = pc + "%";
    box.appendChild(el("div", { class: "active-progress" }, [el("span", { class: "k", text: "Check " + idx + " of " + run.stages.length + " · " + pc + "%" }), bar]));
  }

  // Readings card: the active stage once it has readings (T10 after SS3), else the last DONE stage with readings
  function focusStage(run) {
    var a = SEQ.activeStage(run);
    if (a && a.readings.some(function (r) { return r.observation !== "NOT_MEASURED"; })) return a;
    var last = null;
    run.stages.forEach(function (s) { if (s.status === "DONE" && s.readings.length) last = s; });
    return last;
  }
  function renderReadings(run) {
    var st = focusStage(run), active = SEQ.activeStage(run);
    var fromActive = !!st && !!active && active.test_id === st.test_id;
    var key = st ? st.test_id + "|" + st.status + "|" + fromActive + "|" + st.readings.map(function (r) { return r.verdict; }).join(",") : "none";
    if (key === state.focusKey) return;
    state.focusKey = key;
    var box = clear($("reading-cards")), eq = $("equation");
    // Say whose readings these are: the running test's own, or the last completed test's
    if ($("readings-kind")) $("readings-kind").textContent = fromActive ? "Readings from this check" : "Last completed check";
    $("readings-of").textContent = st ? "· " + st.test_id + " " + st.name : "";
    if (!st) { box.appendChild(el("p", { class: "empty", text: "No readings yet. Readings appear when a stage with module readings completes." })); eq.hidden = true; return; }
    st.readings.forEach(function (r) {
      var u = unitOf(r);
      box.appendChild(el("div", { class: "rcard" }, [
        el("div", { class: "rcard-top" }, [el("span", { class: "rcard-label", text: r.quantity_id + " · " + r.label }), verdictChip(r.verdict)]),
        el("p", { class: "rcard-value" }, [valueText(r), u ? el("span", { class: "u", text: u }) : null]),
        el("p", { class: "rcard-rule", text: "Rule: " + ruleText(r) + " · margin " + marginText(r) + (r.observation !== "OBSERVED" ? " · " + r.observation : "") })
      ]));
    });
    var eqs = st.readings.filter(function (r) { return r.model_equation; }).map(function (r) { return r.model_equation; });
    if (st.model_equation) eqs.push(st.model_equation);
    clear(eq);
    eq.hidden = !eqs.length;
    if (eqs.length) {
      eq.appendChild(el("span", { class: "k", text: "Model equation (02 §8, values substituted)" }));
      eqs.forEach(function (t, i) { if (i) eq.appendChild(el("br")); eq.appendChild(document.createTextNode(t)); });
    }
  }

  function renderBench(run) {
    var b = SEQ.bench(run), bc = run.inputs.bench_conditions;
    var dl = clear($("bench"));
    var open = D.interlocks.filter(function (il) { return !run.interlocks[il.id]; }).map(function (il) { return il.id; });
    [["Enclosure door", b.door_locked ? "LOCKED" : "UNLOCKED"],
     ["Bus voltage", F.fixed(b.v_bus_v, 1) + " V"],
     ["HV source", b.source_enabled ? "ENABLED" : "DISABLED"],
     ["Contactor", b.contactor_closed ? "CLOSED" : "OPEN"],
     ["Gate command", b.gate_cmd],
     ["Gate measured", F.fixed(b.gate_meas_v, 1) + " V"],
     ["Interlocks", open.length ? open.join(", ") + " OPEN" : "IL1–IL7 OK"]
    ].forEach(function (p) { dl.appendChild(el("dt", { text: p[0] })); dl.appendChild(el("dd", { text: p[1] })); });
    var bar = $("bus-bar");
    bar.style.width = Math.max(0, Math.min(100, 100 * b.v_bus_v / bc.v_dc_test_v)) + "%";
    bar.className = b.v_bus_v <= bc.v_safe_v ? "low" : "";
    $("bus-scale").textContent = "Bus voltage on a 0–" + F.num(bc.v_dc_test_v) + " V scale · safe below " + F.num(bc.v_safe_v) + " V";
  }

  function renderLog(run) {
    var body = $("log-body"), wrap = $("log-wrap");
    if (state.logCount === run.events.length) return;
    var nearBottom = wrap.scrollHeight - wrap.scrollTop - wrap.clientHeight < 40;
    for (var i = state.logCount; i < run.events.length; i++) {
      var e = run.events[i];
      var cls = e.type === "WARNING" ? "ev-warn" : e.type === "ABORT_TRIGGER" ? "ev-abort" :
        (e.type === "FAULT_LOCKED" || e.type === "DISCHARGE_FAILED" || e.type === "VERIFICATION_UNAVAILABLE") ? "ev-lock" : "";
      body.appendChild(el("tr", { class: cls }, [
        el("td", { class: "num", text: String(e.seq) }),
        el("td", { class: "num", text: F.fixed(e.physical_time_s, 2) }),
        el("td", { class: "num", text: F.fixed(e.animation_time_s, 2) }),
        el("td", { text: e.stage || "—" }),
        el("td", { class: "type", text: e.type }),
        el("td", { text: e.detail })
      ]));
    }
    state.logCount = run.events.length;
    if (nearBottom) wrap.scrollTop = wrap.scrollHeight;
    var lastEv = run.events[run.events.length - 1];
    if ($("log-count")) $("log-count").textContent = run.events.length + (run.events.length === 1 ? " event" : " events") +
      (lastEv ? " · latest " + lastEv.type + " at " + F.fixed(lastEv.physical_time_s, 2) + " s" : "");
  }

  // Demo controls: abort triggers while RUNNING; logged and ignored during the safe-state procedure
  function demoAbort() { SEQ.abort(state.run, "OPERATOR"); renderRun(); }
  function demoInterlock(id, cause) {
    var run = state.run;
    if (run.interlocks[id]) SEQ.setInterlock(run, id, false);
    else SEQ.abort(run, cause);
    renderRun();
  }

  // ---- Screen 4: Result ----
  // Outcome kind for the operator (display only; derived from the engine's overall verdict, abort reason and
  // safe-state record, never from the scenario): passed, module failed, interrupted, bench fault, incomplete.
  // Findings and counts come from the same helpers as the HTML report (report.js), so the two agree.
  var FINDING_TAG = { safety: "Safe state", fail: "Failed", stop: "Stopped", block: "Blocked", note: "Not run" };
  function renderOutcomeKind(det) {
    var o = det.overall, ss = det.safe_state, box = $("result-outcome");
    if (!box) return;
    var locked = !!ss && ss.final_state === "FAULT_LOCKED";
    var k = REP.text.outcomeKind(det);   // same headline as report section A
    box.className = "outcome oc-" + k.kind;
    if ($("btn-reset-sim")) $("btn-reset-sim").hidden = !locked;
    $("result-kind").textContent = k.title;
    // Concise reason: the findings (unresolved safe state, failed checks, stop reason, not-run stages), else the engine's reason
    var d = clear($("result-kind-detail")), f = REP.text.keyFindings(det);
    if (f.length) d.appendChild(el("ul", { "class": "findings" }, f.map(function (x) {
      return el("li", { "class": "f-" + x.kind }, [el("span", { "class": "f-tag", text: FINDING_TAG[x.kind] }), x.text]);
    })));
    if (!f.length) d.appendChild(el("p", { "class": "outcome-reason", text: o.precedence_reason + "." }));
    d.hidden = false;
  }

  var VERDICT_CLASS = { PASS: "verdict verdict-pass", FAIL: "verdict verdict-fail", ABORTED: "verdict verdict-abort", INCOMPLETE: "verdict verdict-abort", "NOT EVALUATED": "verdict verdict-ne" };
  function showResult() {
    var rep = state.report, det = rep.deterministic, o = det.overall;
    $("result-meta").textContent = runMeta(state.setup, det.inputs);
    $("result-inputs").textContent = "Overrides: " + REP.text.overridesText(det.inputs);
    $("result-noise").hidden = !(det.inputs.noise_rel_sigma > 0);
    $("result-noise").textContent = "Noise: " + REP.text.noiseText(det.inputs);
    var v = $("result-verdict");
    v.textContent = o.verdict; v.className = VERDICT_CLASS[o.verdict] || "verdict verdict-ne";
    $("result-label").textContent = o.verdict_label;
    $("result-precedence").textContent = "Why: " + o.precedence_reason;
    renderOutcomeKind(det);
    var reasons = [];
    if (o.block_reason) reasons.push("block_reason: " + o.block_reason);
    if (o.abort_reason) reasons.push("abort_reason: " + o.abort_reason);
    reasons.push("is_acceptance_decision: false");
    $("result-reasons").textContent = reasons.join(" · ");

    var body = clear($("result-body"));
    det.stages.forEach(function (st) {
      st.readings.forEach(function (r) {
        var u = unitOf(r), dim = r.verdict === "NOT RUN" ? " notrun" : "";
        body.appendChild(el("tr", { class: "r-main" + dim }, [
          el("td", null, [el("strong", { text: st.test_id }), el("span", { class: "obs", text: st.status.replace(/_/g, " ") })]),
          el("td", { class: "q" }, [el("strong", { text: r.quantity_id }), el("span", { class: "obs", text: r.label })]),
          el("td", null, [valueText(r) + (u && r.value !== null ? " " + u : ""), r.observation !== "OBSERVED" ? el("span", { class: "obs", text: r.observation }) : null]),
          el("td", { text: ruleText(r) }),
          el("td", { text: marginText(r) }),
          el("td", null, [verdictChip(r.verdict)])
        ]));
        body.appendChild(el("tr", { class: "r-reason" + dim }, [
          el("td", { colspan: "7" }, [el("strong", { text: "Reason: " }), r.reason, r.hypothesis ? " · " + r.hypothesis : null])
        ]));
      });
    });

    var hyp = clear($("result-hyp"));
    if (!det.hypotheses.length) hyp.appendChild(el("li", { class: "muted", text: "No FAIL recorded; no hypothesis." }));
    det.hypotheses.forEach(function (h) {
      hyp.appendChild(el("li", { text: (h.source === "SAFE_STATE" ? "Safe state" : h.source + " (" + h.quantity_ids.join(", ") + ")") + ": " + h.text }));
    });
    // Evidence summary lines (display only). Hypotheses open by themselves when there are any.
    var counts = {};
    det.stages.forEach(function (st) { st.readings.forEach(function (r) { counts[r.verdict] = (counts[r.verdict] || 0) + 1; }); });
    if ($("result-readings-count")) $("result-readings-count").textContent = Object.keys(counts).map(function (v) { return counts[v] + " " + v; }).join(" · ");
    if ($("result-hyp-count")) $("result-hyp-count").textContent = det.hypotheses.length ? String(det.hypotheses.length) : "none";
    if ($("ev-hyp")) $("ev-hyp").open = det.hypotheses.length > 0;
    if ($("result-timing-sum")) $("result-timing-sum").textContent = sec(det.physical_total_s) + " estimated";

    var ss = det.safe_state, enc = $("result-enclosure");
    // Enclosure summary (display only): the door and final state from the safe-state record; details stay in the Safe state block
    if (enc) {
      clear(enc);
      if (!ss) enc.appendChild(el("p", { class: "enc-state", text: "Safe-state procedure not run" }));
      else {
        enc.appendChild(el("p", { class: "enc-state" + (ss.door === "LOCKED" ? " enc-locked" : ss.final_state === "SAFE" ? " enc-safe" : ""),
          text: "Door " + ss.door }));
        // Shared wording with the report; with the meter unavailable no verification voltage is claimed
        enc.appendChild(el("p", { class: "enc-detail", text: "Final state " + String(ss.final_state).replace(/_/g, " ") +
          " · " + REP.text.verificationText(ss) }));
        if (ss.final_state === "FAULT_LOCKED") enc.appendChild(el("p", { class: "lockout-note",
          text: "Access locked out until the bench is reset." }));
      }
    }
    var dl = clear($("result-safe"));
    if (!ss) dl.appendChild(el("dd", { class: "muted", text: "Safe-state procedure not run." }));
    else [["Trigger", ss.trigger + (o.abort_reason && ss.trigger === "ABORT" ? " (" + o.abort_reason + ")" : "")],
          ["Gate", "commanded OFF · measured " + F.fixed(ss.gate_measured_v, 1) + " V · " + (ss.gate_off_confirmed ? "confirmed" : "NOT confirmed")],
          ["HV source", ss.hv_source_disabled ? "disabled" : "enabled"],
          ["Contactor", ss.contactor_open ? "open" : "closed"],
          ["v_bus at start", F.fixed(ss.v_bus_at_start_v, 1) + " V"],
          ["Discharge", ss.discharge_required ? (ss.discharge_time_s === null ? "required; did not reach v_safe" : "required; " + sec(ss.discharge_time_s)) : "not required"],
          ["v_bus at verification", REP.text.vBusVerifyText(ss)],
          ["Verification", ss.verification],
          ["Door", ss.door],
          ["Final state", ss.final_state]
    ].forEach(function (p) { dl.appendChild(el("dt", { text: p[0] })); dl.appendChild(el("dd", { text: p[1] })); });

    $("result-phys").textContent = sec(det.physical_total_s);
    $("result-anim").textContent = sec(rep.presentation.animation_total_s) + " at " + det.inputs.speed + "×";
    var cb = clear($("result-clock-body"));
    det.stages.forEach(function (st) {
      var comps = st.physical_components.map(function (c) { return c.basis + " " + F.num(c.seconds) + " s" + (c.note ? " (" + c.note + ")" : ""); }).join(" + ");
      cb.appendChild(el("tr", null, [el("td", { text: st.test_id + " · " + st.name }), el("td", { text: st.status.replace(/_/g, " ") }), el("td", { text: comps || "—" }), el("td", { text: F.fixed(st.physical_estimate_s, 2) })]));
    });
    lockNewRun($("btn-result-new"));
    showScreen("screen-result");
  }
  // In FAULT_LOCKED, New run is disabled; the red banner's Reset simulation is the only exit
  function lockNewRun(btn) {
    var locked = !!state.run && state.run.state === "FAULT_LOCKED";
    btn.disabled = locked;
    btn.hidden = locked;   // not offered while access is locked out; Reset bench (outcome card) is the only exit
    btn.title = locked ? "Access locked out: use Reset bench on the outcome" : "";
  }

  // ---- Screen 5: Report (02 §11): preview, Print / Save PDF, Download JSON, Download HTML ----
  // from = "result" (a finished run) or "blocked" (the CONFIG_BLOCKED report from Screen 1b)
  function showReport(from) {
    var rep = from === "blocked" ? (state.blocked && state.blocked.report) : state.report;
    if (!rep) return;
    state.view = { from: from, report: rep };
    var o = rep.deterministic.overall, inp = rep.deterministic.inputs;
    $("report-meta").textContent = rep.metadata.run_id + " · module " + inp.module_parameters.module_id + " · " + REP.text.outcomeKind(rep.deterministic).title;
    $("report-files").textContent = "Files: " + REP.fileName(rep, "html") + " · " + REP.fileName(rep, "json");
    renderAiBar();
    $("btn-report-back").textContent = from === "blocked" ? "Back" : "Back to outcome";
    $("report-print-note").hidden = true;
    lockNewRun($("btn-report-new"));
    showScreen("screen-report");
  }
  function reportBack() {
    if (state.view && state.view.from === "blocked") showScreen("screen-blocked");
    else showScreen("screen-result");
  }
  // Print the preview frame only (the report, not the app). If the frame cannot be reached,
  // open the report on its own in a new tab, where the browser's Print works.
  function printReport() {
    var frame = $("report-preview");
    try {
      frame.contentWindow.focus();
      frame.contentWindow.print();
    } catch (e) {
      var url = URL.createObjectURL(new Blob([REP.buildHtml(state.view.report, { ai: aiFor(state.view.report) })], { type: "text/html" }));
      window.open(url, "_blank");
      $("report-print-note").hidden = false;
      $("report-print-note").textContent = "The report opened in a new tab. Use the browser's Print there and choose Save as PDF.";
    }
  }

  // ---- AI analysis (optional; online only) ----
  // The offline app has no network code. When it is served by the local AI service (ai-explainer/server.mjs),
  // that service adds a companion script which registers window.IGBT_AI. Generation runs only on an explicit
  // click; the result is shown and exported in report section B, never mixed into the recorded results, and never
  // replaced by placeholder text. Errors are shown as errors.
  function aiFor(rep) { return state.ai && state.ai.report === rep ? state.ai : null; }
  function aiAvailable() { return !!(window.IGBT_AI && typeof window.IGBT_AI.explain === "function"); }
  function renderAiBar() {
    var rep = state.view && state.view.report, bar = $("ai-bar");
    $("report-preview").srcdoc = REP.buildHtml(rep, { ai: aiFor(rep) });
    if (!bar) return;
    var usable = aiAvailable() && state.view.from !== "blocked";
    bar.hidden = !usable;
    if (!usable) return;
    var a = aiFor(rep), busy = !!state.aiBusy;
    $("btn-ai-generate").disabled = busy;
    $("btn-ai-generate").textContent = a ? "Regenerate AI analysis" : "Generate AI analysis";
    var st = $("ai-status");
    st.className = "muted small" + (state.aiError ? " err" : "");
    st.textContent = busy ? "Requesting one AI analysis from the local service…" :
      state.aiError ? state.aiError :
      a ? "AI analysis added to section B (" + a.model + "). It is included in Save PDF and Download HTML." :
      "Sends this run’s results to the AI service once. Recorded results are not changed.";
  }
  function generateAi() {
    var rep = state.view && state.view.report;
    if (!rep || state.aiBusy || !aiAvailable()) return;
    state.aiBusy = true; state.aiError = null; renderAiBar();
    window.IGBT_AI.explain(rep).then(function (res) {
      state.ai = { report: rep, model: res.model, generated_local: REP.localIso(new Date()), summary: res.summary, items: res.items };
    }, function (err) {
      state.aiError = "AI analysis failed: " + ((err && err.message) || "no response") + " Nothing was added to the report.";
    }).then(function () {
      state.aiBusy = false;
      if (state.view && state.view.report === rep) renderAiBar();
    });
  }

  function resetSimulation() {
    if (state.run && SEQ.reset(state.run)) backToSetup();
  }

  function init() {
    D = window.APP_DATA; V = window.IGBT.validate; E = window.IGBT.engine; SEQ = window.IGBT.sequencer; REP = window.IGBT.report;
    F = window.IGBT.models.fmt;
    renderChrome();
    if ($("screen-setup")) {
      buildSetup();
      $("btn-export-blocked").addEventListener("click", exportBlocked);
      $("btn-start").addEventListener("click", onStart);
      $("btn-abort").addEventListener("click", demoAbort);
      $("btn-door").addEventListener("click", function () { demoInterlock("IL1", "IL1_OPEN"); });
      $("btn-heartbeat").addEventListener("click", function () { demoInterlock("IL6", "WATCHDOG"); });
      $("btn-view-result").addEventListener("click", showResult);
      $("btn-run-new").addEventListener("click", backToSetup);
      $("btn-result-new").addEventListener("click", backToSetup);
      $("btn-download-json").addEventListener("click", function () { if (state.report) REP.download(state.report); });
      $("btn-view-report").addEventListener("click", function () { showReport("result"); });
      $("btn-blocked-report").addEventListener("click", function () { showReport("blocked"); });
      $("btn-report-back").addEventListener("click", reportBack);
      $("btn-report-new").addEventListener("click", backToSetup);
      $("btn-report-print").addEventListener("click", printReport);
      // The report preview grows with its content, so the page scrolls once (no nested scroll area)
      $("report-preview").addEventListener("load", function () {
        try { var d = this.contentDocument; this.style.height = Math.max(400, d.documentElement.scrollHeight + 4) + "px"; } catch (e) { /* keep CSS height */ }
      });
      $("btn-report-html").addEventListener("click", function () { if (state.view) REP.downloadHtml(state.view.report, { ai: aiFor(state.view.report) }); });
      if ($("btn-ai-generate")) $("btn-ai-generate").addEventListener("click", generateAi);
      $("btn-report-json").addEventListener("click", function () { if (state.view) REP.download(state.view.report); });
      $("btn-reset-sim").addEventListener("click", resetSimulation);
      showScreen("screen-setup");
    }
  }

  if (typeof document !== "undefined") {
    document.addEventListener("DOMContentLoaded", function () { if ($("app")) init(); });
  }
  return { init: init, readCustomOverrides: readCustomOverrides, state: state,
           presetPool: presetPool, pickPreset: pickPreset, DEFAULT_SPEED: DEFAULT_SPEED };
})();
