/* sequencer.js: run state machine on a physical clock (02 §4–§7). Pure: no DOM, no timers.
   advance(run, dt) moves the run by dt physical seconds. The UI timer, selfcheck and
   node all drive the same code path; every scheduled moment (stage ends, bus at
   setpoint, scenario events, safe-state steps) is processed at its exact planned time,
   so the result does not depend on the step size. */
window.IGBT = window.IGBT || {};
window.IGBT.sequencer = (function () {
  var E = window.IGBT.engine, M = window.IGBT.models;
  function D() { return window.APP_DATA; }
  var r2 = E.r2, secText = E.secText, fixed = M.fmt.fixed, num = M.fmt.num;

  var BUS_STAGE = "T07";        // 02 §7.1: bus ramps from T07 start
  var CLOSING_STAGE = "T10";    // 02 §7.2: T10's record is the safe-state procedure
  var TERMINAL = { SAFE: true, FAULT_LOCKED: true, ENDED: true, RESET: true };
  // Display-only gate command per stage (02 §7.1 gate_cmd / gate_meas_v); null = driver unpowered
  var GATE_CMD = { T00: null, T01: null, T02: "OFF", T03: "ON", T06: null, T04: null, T05: "ON", T07: "OFF", T08a: "OFF", T09: "ON" };

  function ilDef(id) { return D().interlocks.filter(function (x) { return x.id === id; })[0]; }
  function pct(f) { return Math.round(f * 100) + "%"; }
  function volts(v) { return fixed(v, 1) + " V"; }

  // ---- create a run from a configPreflight OK result; state PRECHECK ----
  function create(pre) {
    var inputs = pre.inputs, b = inputs.bench_conditions;
    var il = {};
    D().interlocks.forEach(function (x) { il[x.id] = true; });   // IL3 shows OK at Pre-check (not tied to bench_selfcheck_ok)
    return {
      inputs: inputs, rules: pre.rules,
      scenario_events: (pre.scenario_events || []).map(function (e) {
        return { at_stage: e.at_stage, at_progress: e.at_progress, trigger: e.trigger, fired: false };
      }),
      state: "PRECHECK", t: 0,
      interlocks: il,
      stages: E.initialStages(inputs, pre.rules),
      cur: null,
      bus: { charge_start: null, rate: M.chargeRate(b.dclink_c_mf, b.charge_current_a), setpoint: b.v_dc_test_v, at_setpoint: false },
      source_enabled: false, contactor_closed: false, door_locked: false,
      gate_cmd: "OFF", gate_meas_v: 0,
      events: [], abort: null, safe: null, overall: null, hypotheses: null
    };
  }

  function stageIndex(run, id) { for (var i = 0; i < run.stages.length; i++) if (run.stages[i].test_id === id) return i; return -1; }
  function emit(run, stage, type, detail) {
    var t = r2(run.t);
    run.events.push({ seq: run.events.length + 1, stage: stage, type: type, physical_time_s: t,
                      animation_time_s: r2(t / run.inputs.speed), detail: detail });
  }
  function allInterlocksOk(run) { return Object.keys(run.interlocks).every(function (k) { return run.interlocks[k]; }); }
  function isTerminal(run) { return !!TERMINAL[run.state]; }

  // ---- bus voltage (02 §7.1): 0 V before T07; linear ramp; hold; decay only inside the safe-state procedure ----
  function busVoltage(run, t) {
    var b = run.inputs.bench_conditions;
    if (run.safe) {
      var dt = Math.max(0, t - run.safe.t0);
      return run.safe.path_ok ? M.decay(run.safe.v0, dt, b.bleeder_r_kohm, b.dclink_c_mf) : run.safe.v0;
    }
    if (run.bus.charge_start !== null) return Math.min(run.bus.setpoint, run.bus.rate * Math.max(0, t - run.bus.charge_start));
    return 0;
  }
  function bench(run) {
    return {
      v_bus_v: r2(busVoltage(run, run.t)), source_enabled: run.source_enabled, contactor_closed: run.contactor_closed,
      door_locked: run.door_locked, gate_cmd: run.gate_cmd, gate_meas_v: r2(run.gate_meas_v)
    };
  }
  function setGate(run, cmd, powered) {
    var m = run.inputs.module_parameters;
    run.gate_cmd = cmd || "OFF";
    run.gate_meas_v = powered ? E.gateMeasured(m, run.gate_cmd, run.inputs.noise_rel_sigma, run.inputs.seed, run.gate_cmd === "ON" ? "Q06" : "Q07") : 0;
  }

  // ---- START (02 §4 PRECHECK → RUNNING): all interlocks must be OK ----
  function start(run) {
    if (run.state !== "PRECHECK") return { ok: false, reason: "run is not at Pre-check" };
    if (!allInterlocksOk(run)) {
      var open = Object.keys(run.interlocks).filter(function (k) { return !run.interlocks[k]; });
      return { ok: false, reason: "interlock" + (open.length > 1 ? "s " : " ") + open.join(", ") + " not OK" };
    }
    var inp = run.inputs;
    run.state = "RUNNING";
    run.door_locked = true;
    emit(run, null, "RUN_START", "Run started; module " + inp.module_parameters.module_id + "; profile " + inp.profile_id + " " + inp.profile_version +
      " (" + inp.profile_status + "); seed " + inp.seed + "; noise σ " + num(inp.noise_rel_sigma) + "; enclosure door locked");
    emit(run, null, "INTERLOCK_CHECK", "IL1–IL7 all OK at START");
    nextStage(run, 0);
    return { ok: true };
  }

  // Walk the 02 §6 order from index i: skip static statuses, apply prerequisites, begin the next stage
  function nextStage(run, i) {
    for (; i < run.stages.length; i++) {
      var st = run.stages[i];
      if (st.test_id === CLOSING_STAGE) { enterSafeState(run, "NORMAL_COMPLETION"); return; }
      if (st.status === "NOT_APPLICABLE" || st.status === "NOT_MODELLED") {
        emit(run, st.test_id, "STAGE_END", st.test_id + " " + st.status + ": " + st.status_note + "; 0 s");
        continue;
      }
      var p = E.prerequisite(st.test_id, run.stages, run.inputs);
      if (p.status === "END_INCOMPLETE") { endIncomplete(run, i, p.reason); return; }
      if (p.status === "NOT_APPLICABLE" || p.status === "NOT_MODELLED") {
        st.status = p.status; st.status_note = p.reason;
        E.refreshNotMeasured(st, run.inputs, run.rules);
        emit(run, st.test_id, "STAGE_END", st.test_id + " " + st.status + ": " + p.reason + "; 0 s");
        continue;
      }
      if (p.status === "BLOCKED") {
        st.status = "BLOCKED"; st.blocked_reason = p.reason;
        E.refreshNotMeasured(st, run.inputs, run.rules);
        emit(run, st.test_id, "PREREQUISITE_BLOCK", st.test_id + " BLOCKED: " + p.reason + "; 0 s");
        continue;
      }
      beginStage(run, i);
      return;
    }
  }

  function beginStage(run, i) {
    var st = run.stages[i], b = run.inputs.bench_conditions;
    var comps = E.plannedComponents(st.test_id, run.inputs);
    run.cur = { i: i, start: r2(run.t), duration: E.sumSeconds(comps), comps: comps };
    st.status = "RUNNING";
    var cmd = GATE_CMD[st.test_id];
    setGate(run, cmd, cmd !== null && cmd !== undefined);
    emit(run, st.test_id, "STAGE_START", st.test_id + " " + st.name + " (" + st["class"] + "); planned " + secText(run.cur.duration) + " s");
    if (st.test_id === BUS_STAGE) {
      run.source_enabled = true;
      run.contactor_closed = true;
      run.bus.charge_start = run.cur.start;
      var tc = M.tCharge(b.dclink_c_mf, b.v_dc_test_v, b.charge_current_a);
      emit(run, st.test_id, "BUS_CHARGE_START", "HV source enabled, contactor closed; charging to " + volts(b.v_dc_test_v) + " at " +
        num(r2(run.bus.rate)) + " V/s (t_charge = " + fixed(tc.value, 2) + " s)");
    }
  }

  function endStage(run) {
    var cur = run.cur, st = run.stages[cur.i], inp = run.inputs;
    st.status = "DONE";
    st.physical_components = cur.comps;
    st.physical_estimate_s = cur.duration;
    st.readings = E.measureStage(st.test_id, inp, run.rules);
    st.model_equation = E.stageEquation(st.test_id, inp);
    var fails = st.readings.filter(function (r) { return r.verdict === "FAIL"; }).map(function (r) { return r.quantity_id; });
    var judged = st.readings.filter(function (r) { return r.required; }).length;
    var summary = !st.readings.length ? "no module readings" : judged === 0 ? "info only" : fails.length ? "FAIL (" + fails.join(", ") + ")" : "PASS";
    emit(run, st.test_id, "STAGE_END", st.test_id + " DONE · " + summary + "; " + secText(cur.duration) + " s");
    if (st.test_id === "T00" && !inp.bench_conditions.bench_selfcheck_ok) {
      emit(run, st.test_id, "WARNING", "Bench self-check reported a fault (bench_selfcheck_ok = false); later stages will not run");
    }
    run.cur = null;
    nextStage(run, cur.i + 1);
  }

  // 03 §5: after a T00 self-check failure the run ends INCOMPLETE; nothing was excited, T10 not run
  function endIncomplete(run, i, reason) {
    for (var k = i; k < run.stages.length; k++) {
      var st = run.stages[k];
      if (st.status === "PENDING") {
        st.status = "NOT_RUN";
        if (st.test_id === CLOSING_STAGE) st.status_note = "not run after a T00 self-check failure (nothing was excited)";
        E.refreshNotMeasured(st, run.inputs, run.rules);
      }
    }
    run.door_locked = false;
    finishRun(run, "ENDED", "Run ended after T00: " + reason + "; nothing was excited");
  }

  // ---- abort (02 §5): OPERATOR, IL1_OPEN…IL7_OPEN or WATCHDOG ----
  function abort(run, cause, detail) {
    if (run.state === "SAFE_STATE_PROCEDURE") {
      emit(run, CLOSING_STAGE, "WARNING", "Abort trigger " + cause + " during the safe-state procedure: logged and ignored; the procedure continues");
      return false;
    }
    if (run.state !== "RUNNING" || !run.cur) return false;
    var cur = run.cur, st = run.stages[cur.i];
    var elapsed = r2(Math.min(cur.duration, Math.max(0, run.t - cur.start)));
    var frac = cur.duration > 0 ? elapsed / cur.duration : 0;
    run.abort = { cause: cause, stage: st.test_id, time: r2(run.t), progress: frac };
    emit(run, st.test_id, "ABORT_TRIGGER", (detail || causeText(cause)) + " at " + pct(frac) + " of " + st.test_id + "; v_bus = " + volts(busVoltage(run, run.t)));
    // Running stage → INTERRUPTED; its elapsed fraction counts, spent in component order
    st.status = "INTERRUPTED";
    var left = elapsed;
    st.physical_components = cur.comps.map(function (c) {
      var s = r2(Math.min(c.seconds, left)); left = r2(left - s);
      return { basis: c.basis, seconds: s, note: c.note };
    });
    st.physical_estimate_s = elapsed;
    E.refreshNotMeasured(st, run.inputs, run.rules);
    emit(run, st.test_id, "STAGE_END", st.test_id + " INTERRUPTED at " + pct(frac) + " (" + secText(elapsed) + " s of " + secText(cur.duration) + " s)");
    // Later stages NOT_RUN; NOT_APPLICABLE / NOT_MODELLED keep their status; T10 runs as the procedure
    run.stages.forEach(function (s) {
      if (s.status === "PENDING" && s.test_id !== CLOSING_STAGE) { s.status = "NOT_RUN"; E.refreshNotMeasured(s, run.inputs, run.rules); }
    });
    run.cur = null;
    enterSafeState(run, "ABORT");
    return true;
  }
  function causeText(cause) {
    if (cause === "OPERATOR") return "Operator abort";
    if (cause === "WATCHDOG") return "Controller watchdog heartbeat lost (IL6)";
    var m = /^(IL[0-9])_OPEN$/.exec(cause);
    if (m) { var d = ilDef(m[1]); return m[1] + " (" + (d ? d.short : "interlock") + ") opened"; }
    return "Abort trigger " + cause;
  }

  // Interlock change from a demo control. Opening one while RUNNING is an abort trigger.
  function setInterlock(run, id, ok) {
    var was = run.interlocks[id];
    run.interlocks[id] = !!ok;
    if (ok || !was) return;
    var cause = id === "IL6" ? "WATCHDOG" : id + "_OPEN";
    if (run.state === "RUNNING") abort(run, cause);
    else if (run.state === "SAFE_STATE_PROCEDURE") {
      var d = ilDef(id);
      emit(run, CLOSING_STAGE, "WARNING", id + " (" + (d ? d.short : "interlock") + ") opened during the safe-state procedure (" + cause + "): logged and ignored");
    }
  }

  // ---- the single safe-state procedure SS1–SS9 (02 §7.2), entered exactly once per run ----
  function enterSafeState(run, trigger) {
    if (run.safe) return;   // exactly once
    var inp = run.inputs, b = inp.bench_conditions, m = inp.module_parameters;
    var i = stageIndex(run, CLOSING_STAGE), st = run.stages[i];
    var t0 = r2(run.t);
    var v0 = E.clean(busVoltage(run, t0));   // judged at full precision (discharge required?)
    run.state = "SAFE_STATE_PROCEDURE";
    st.status = "RUNNING";
    st.status_note = "safe-state procedure; trigger " + trigger;
    emit(run, CLOSING_STAGE, "STAGE_START", CLOSING_STAGE + " " + st.name + " (" + st["class"] + "); safe-state procedure");
    // SS1
    emit(run, CLOSING_STAGE, "SAFE_STATE_START", "SS1 trigger " + trigger + (run.abort ? " (" + run.abort.cause + ")" : ""));
    // SS2: command gate OFF
    run.gate_cmd = "OFF";
    emit(run, CLOSING_STAGE, "GATE_OFF_COMMANDED", "SS2 gate OFF commanded over fibre");
    // SS3: read modelled gate voltage, evaluate Q18; continue either way
    st.readings = E.measureStage(CLOSING_STAGE, inp, run.rules);
    var q18 = st.readings[0];
    var gateV = q18 ? q18.value : E.gateMeasured(m, "OFF", inp.noise_rel_sigma, inp.seed, "Q18");
    run.gate_meas_v = gateV;
    var confirmed = !!q18 && q18.verdict === "PASS";
    emit(run, CLOSING_STAGE, confirmed ? "GATE_OFF_CONFIRMED" : "GATE_OFF_NOT_CONFIRMED",
      "SS3 gate measured " + volts(gateV) + (q18 ? " (" + q18.quantity_id + " " + q18.verdict + ")" : "") + (confirmed ? "" : "; continuing SS4–SS9"));
    // SS4, SS5
    run.source_enabled = false;
    emit(run, CLOSING_STAGE, "HV_SOURCE_DISABLED", "SS4 HV source output disabled");
    run.contactor_closed = false;
    emit(run, CLOSING_STAGE, "CONTACTOR_OPEN", "SS5 contactor open; bus isolated from the DUT circuit");
    // SS6: discharge from the actual v_bus
    var required = v0 > b.v_safe_v;
    var ts = M.tSafe(b.bleeder_r_kohm, b.dclink_c_mf, v0, b.v_safe_v);
    var en = M.energy(b.dclink_c_mf, v0);
    if (required) emit(run, CLOSING_STAGE, "DISCHARGE_START", "SS6 discharge from v0 = " + volts(v0) + " through " + num(b.bleeder_r_kohm) + " kΩ; t_safe = " + fixed(ts.value, 2) + " s; E = " + num(r2(en.value)) + " J");
    else emit(run, CLOSING_STAGE, "DISCHARGE_NOT_REQUIRED", "SS6 v_bus = " + volts(v0) + " ≤ v_safe " + num(b.v_safe_v) + " V; verification still required");
    // SS7/SS8 plan: verify verify_delay_s after reaching v_safe, or at discharge_timeout_s on failure
    var pathOk = !!b.discharge_path_ok, comps = [], dischargeS, verifyOffset, vVerify, dischargeTime;
    if (required && !pathOk) {
      dischargeS = b.discharge_timeout_s; verifyOffset = b.discharge_timeout_s; vVerify = v0; dischargeTime = null;
    } else {
      dischargeS = r2(ts.value); verifyOffset = r2(dischargeS + b.verify_delay_s); dischargeTime = dischargeS;
      vVerify = pathOk ? M.decay(v0, ts.value + b.verify_delay_s, b.bleeder_r_kohm, b.dclink_c_mf) : v0;
    }
    vVerify = E.clean(vVerify);              // judged at full precision against v_safe_v
    var verification = !b.verify_meter_ok ? "VERIFICATION_UNAVAILABLE" : (vVerify <= b.v_safe_v ? "VERIFIED" : "DISCHARGE_FAILED");
    D().physical_components[CLOSING_STAGE].forEach(function (c) {
      var s = c.compute === "discharge" ? dischargeS : c.seconds;
      var note = c.compute === "discharge"
        ? (required && !pathOk ? "discharge_timeout_s (discharge failed)" : required ? "discharge time t_safe" : "no discharge required (v0 ≤ v_safe)")
        : c.note;
      comps.push({ basis: c.basis, seconds: s, note: note });
    });
    // Verification normally falls inside the closing DWELL. If verify_delay_s pushes it past the
    // planned end, the extra wait is its own COMPUTED component, so T10's components, the final
    // event time and physical_total_s stay equal.
    var planned = E.sumSeconds(comps);
    if (verifyOffset > planned) {
      comps.push({ basis: "COMPUTED", seconds: r2(verifyOffset - planned),
                   note: "verification wait beyond the closing DWELL (verify_delay_s = " + num(b.verify_delay_s) + " s)" });
    }
    var endOffset = E.sumSeconds(comps);
    st.model_equation = ts.equation + "; " + en.equation;
    run.safe = {
      trigger: trigger, t0: t0, v0: v0, required: required, path_ok: pathOk,
      gate_measured_v: gateV, gate_off_confirmed: confirmed,
      discharge_time_s: dischargeTime, v_verify: vVerify, verification: verification,
      verify_at: r2(t0 + verifyOffset), end_at: r2(t0 + endOffset), comps: comps,
      verified_done: false, locked: false, door: "LOCKED", final_state: null, k: 0
    };
    run.safe.steps = [
      { time: run.safe.verify_at, fn: function () { verifyStep(run); } },
      { time: run.safe.end_at, fn: function () { closeStep(run); } }
    ];
  }

  // SS8 + SS9
  function verifyStep(run) {
    var s = run.safe, b = run.inputs.bench_conditions;
    s.verified_done = true;
    if (s.verification === "VERIFIED") {
      emit(run, CLOSING_STAGE, "DISCHARGE_VERIFIED", "SS8 independent meter: v_bus = " + fixed(s.v_verify, 2) + " V ≤ v_safe " + num(b.v_safe_v) + " V");
      run.door_locked = false; s.door = "UNLOCKED";
      emit(run, CLOSING_STAGE, "DOOR_UNLOCKED", "SS9 enclosure door unlocked after DISCHARGE_VERIFIED");
    } else {
      if (s.verification === "DISCHARGE_FAILED") {
        emit(run, CLOSING_STAGE, "DISCHARGE_FAILED", "SS8 independent meter: v_bus = " + fixed(s.v_verify, 2) + " V > v_safe " + num(b.v_safe_v) + " V at discharge_timeout_s " + num(b.discharge_timeout_s) + " s; no modelled decay");
      } else {
        emit(run, CLOSING_STAGE, "VERIFICATION_UNAVAILABLE", "SS8 independent meter unavailable (verify_meter_ok = false); discharge cannot be verified");
      }
      s.locked = true;
      emit(run, CLOSING_STAGE, "FAULT_LOCKED", "SS9 " + D().fixed_texts.fault_locked_banner);
    }
  }
  function closeStep(run) {
    var s = run.safe, st = run.stages[stageIndex(run, CLOSING_STAGE)];
    st.status = "DONE";
    st.physical_components = s.comps;
    st.physical_estimate_s = E.sumSeconds(s.comps);
    s.final_state = s.verification === "VERIFIED" ? "SAFE" : "FAULT_LOCKED";
    emit(run, CLOSING_STAGE, "STAGE_END", CLOSING_STAGE + " DONE · " + s.verification + "; final state " + s.final_state + "; " + secText(st.physical_estimate_s) + " s");
    finishRun(run, s.final_state, "Run ended; final state " + s.final_state);
  }

  function finishRun(run, state, detail) {
    run.safe_state = safeStateBlock(run);
    run.overall = E.rollUp({ profile_status: run.inputs.profile_status, stages: run.stages, abort: run.abort, safe_state: run.safe_state });
    run.hypotheses = E.hypotheses(run.stages, run.safe_state);
    run.state = state;
    emit(run, null, "RUN_END", detail + "; overall " + run.overall.verdict + "; physical total " + secText(physicalTotal(run)) + " s");
  }

  // 05 §6 safe_state block (null when the procedure never ran)
  function safeStateBlock(run) {
    var s = run.safe;
    if (!s) return null;
    return {
      trigger: s.trigger,
      gate_off_commanded: true, gate_measured_v: s.gate_measured_v, gate_off_confirmed: s.gate_off_confirmed,
      hv_source_disabled: true, contactor_open: true,
      v_bus_at_start_v: s.v0, discharge_required: s.required,
      discharge_time_s: s.discharge_time_s, v_bus_at_verification_v: s.v_verify,
      verification: s.verification, door: s.door, final_state: s.final_state
    };
  }
  function physicalTotal(run) { return r2(run.stages.reduce(function (a, s) { return a + (s.physical_estimate_s || 0); }, 0)); }

  // "Reset simulation": the only exit from FAULT_LOCKED (02 §4); logged
  function reset(run) {
    if (run.state !== "FAULT_LOCKED") return false;
    emit(run, null, "WARNING", "Reset simulation by the operator (exit from FAULT_LOCKED; a real bench would need qualified intervention)");
    run.state = "RESET";
    return true;
  }

  // ---- clock ----
  function nextBoundary(run) {
    var best = null;
    function consider(time, prio, fn) {
      if (!best || time < best.time || (time === best.time && prio < best.prio)) best = { time: time, prio: prio, fn: fn };
    }
    if (run.state === "RUNNING" && run.cur) {
      var cur = run.cur, id = run.stages[cur.i].test_id;
      if (run.bus.charge_start !== null && !run.bus.at_setpoint) {
        var b = run.inputs.bench_conditions;
        var tAt = r2(run.bus.charge_start + r2(M.tCharge(b.dclink_c_mf, b.v_dc_test_v, b.charge_current_a).value));
        consider(tAt, 0, function () {
          run.bus.at_setpoint = true;
          emit(run, BUS_STAGE, "BUS_AT_SETPOINT", "v_bus = " + volts(run.bus.setpoint) + " (setpoint); holding while the source is enabled");
        });
      }
      run.scenario_events.forEach(function (ev) {
        if (ev.fired || ev.at_stage !== id) return;
        consider(r2(cur.start + ev.at_progress * cur.duration), 1, function () { fireScenarioEvent(run, ev); });
      });
      consider(r2(cur.start + cur.duration), 2, function () { endStage(run); });
    } else if (run.state === "SAFE_STATE_PROCEDURE" && run.safe && run.safe.k < run.safe.steps.length) {
      var step = run.safe.steps[run.safe.k];
      consider(step.time, 0, function () { run.safe.k += 1; step.fn(); });
    }
    return best;
  }
  function fireScenarioEvent(run, ev) {
    ev.fired = true;
    var m = /^(IL[0-9])_OPEN$/.exec(ev.trigger);
    if (m) { run.interlocks[m[1]] = false; abort(run, ev.trigger); }
    else if (ev.trigger === "WATCHDOG") { run.interlocks.IL6 = false; abort(run, "WATCHDOG"); }
    else abort(run, ev.trigger);
  }

  // advance(run, dt): move the physical clock by dt seconds, processing every boundary on the way
  function advance(run, dt) {
    if (!(dt > 0)) return run;
    var target = run.t + dt;
    for (var guard = 0; guard < 100000; guard++) {
      if (isTerminal(run) || run.state === "PRECHECK") break;
      var nb = nextBoundary(run);
      if (!nb || nb.time > target) { if (isFinite(target)) run.t = target; break; }
      run.t = nb.time;
      nb.fn();
    }
    return run;
  }
  // runToEnd(run): START (if still at Pre-check) and advance until the run ends; same path as the UI
  function runToEnd(run) {
    if (run.state === "PRECHECK") start(run);
    advance(run, Infinity);
    return run;
  }

  // Currently running stage record (or null)
  function activeStage(run) {
    if (run.state === "RUNNING" && run.cur) return run.stages[run.cur.i];
    if (run.state === "SAFE_STATE_PROCEDURE") return run.stages[stageIndex(run, CLOSING_STAGE)];
    return null;
  }
  function stageProgress(run) {
    if (run.state === "RUNNING" && run.cur) return run.cur.duration > 0 ? Math.min(1, (run.t - run.cur.start) / run.cur.duration) : 1;
    if (run.state === "SAFE_STATE_PROCEDURE" && run.safe) {
      var d = run.safe.end_at - run.safe.t0;
      return d > 0 ? Math.min(1, (run.t - run.safe.t0) / d) : 1;
    }
    return null;
  }

  return {
    create: create, start: start, advance: advance, runToEnd: runToEnd,
    abort: abort, setInterlock: setInterlock, reset: reset,
    bench: bench, busVoltage: busVoltage, isTerminal: isTerminal, allInterlocksOk: allInterlocksOk,
    activeStage: activeStage, stageProgress: stageProgress, physicalTotal: physicalTotal
  };
})();
