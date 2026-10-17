/* data.js: all app data (05 v0.3). One global, window.APP_DATA. No fetch.
   Values and fixed texts are copied verbatim from 05_DATA_AND_REPORT_SCHEMA.md.
   Do not edit a value here to make a scenario pass (02 §10). */
window.APP_DATA = (function () {

  // 05 §1.1 case reference register
  var case_references = [
    { reference_id: "REF-01", source: "Slide 5", statement: "Free-wheeling diode \"0.2 V to 0.8 V\", reverse direction \"open\"", applies_to: "Free-wheeling diode; method/current not stated", used_by: ["Q01", "Q02"] },
    { reference_id: "REF-02", source: "Slide 5", statement: "Driver power \"up to 20 W\"", applies_to: "Gate driver", used_by: ["Q03", "Q04"] },
    { reference_id: "REF-03", source: "Slides 5, 8", statement: "Gate drive +15 V on, −15 V off", applies_to: "Gate drive", used_by: ["Q06", "Q07", "Q18"] },
    { reference_id: "REF-04", source: "Slide 8 + notes", statement: "Fully on above roughly +4 to +7 V; \"threshold about +4 to +7 V\"", applies_to: "IGBT gate; test current not stated", used_by: ["Q10"] },
    { reference_id: "REF-05", source: "Slide 5", statement: "Max di/dt \"0–5000 A/µs\"", applies_to: "IGBT; condition not stated", used_by: ["Q12"] },
    { reference_id: "REF-06", source: "Slides 5, 8", statement: "Healthy switch turns off ~10 µs after a saturation fault", applies_to: "Protection function of the driver", used_by: ["Q14"] },
    { reference_id: "REF-07", source: "Slide 5", statement: "\"Busbar insulation: leakage current up to 2 mA\"", applies_to: "Laminated busbar insulation; test voltage/time not stated", used_by: ["Q08 (transferred)"] },
    { reference_id: "REF-08", source: "Slide 10 notes", statement: "≈3.5 min per IGBT, PASS/NO PASS, IM-LE-0008 step 14", applies_to: "Existing check; scope and location unknown", used_by: [] },
    { reference_id: "REF-09", source: "Slide 8 diagram", statement: "GDPC supplies the driver at 25 kHz, 100 Vrms", applies_to: "Driver power supply", used_by: [] }
  ];

  // 05 §2 module parameters (fictional module, not Wabtec ratings)
  var module_defaults = {
    module_id: "DEMO-MODULE-01",
    module_note: "Fictional demo module; not a Wabtec rating",
    diode_fwd_v: 0.35,
    diode_reverse_open: true,
    gate_accessible: false,
    gate_on_v: 15.0,
    gate_off_v: -15.0,
    gate_turns_off_ok: true,
    driver_idle_w: 6.0,
    driver_switch_w: 11.0,
    fibre_status_ok: true,
    iso_leak_ma: 0.05,
    vce0_v: 1.0,
    r_ce_mohm: 7.0,
    ices_ma: 0.05,
    vge_th_v: 5.5,
    didt_a_per_us: 1800,
    desat_trip_us: 6.5
  };

  // Units for display (05 §2 and §2.1 unit columns)
  var module_parameter_units = {
    module_id: "–", module_note: "–", diode_fwd_v: "V", diode_reverse_open: "bool",
    gate_accessible: "bool", gate_on_v: "V", gate_off_v: "V", gate_turns_off_ok: "bool",
    driver_idle_w: "W", driver_switch_w: "W", fibre_status_ok: "bool", iso_leak_ma: "mA",
    vce0_v: "V", r_ce_mohm: "mΩ", ices_ma: "mA", vge_th_v: "V", didt_a_per_us: "A/µs",
    desat_trip_us: "µs"
  };
  var bench_parameter_units = {
    v_dc_test_v: "V", i_pulse_a: "A", l_load_uh: "µH", l_stray_nh: "nH", dclink_c_mf: "mF",
    bleeder_r_kohm: "kΩ", charge_current_a: "A", v_safe_v: "V", discharge_timeout_s: "s",
    verify_delay_s: "s", desat_window_us: "µs", gdpc_text: "–", bench_selfcheck_ok: "bool",
    reference_module_ok: "bool", discharge_path_ok: "bool", verify_meter_ok: "bool",
    speed_default: "–", noise_rel_sigma: "–"
  };

  // 05 §2.1 bench conditions (all illustrative)
  function benchConditions() {
    return {
      v_dc_test_v: 600,
      i_pulse_a: 200,
      l_load_uh: 300,
      l_stray_nh: 100,
      dclink_c_mf: 1.0,
      bleeder_r_kohm: 10,
      charge_current_a: 0.1,
      v_safe_v: 50,
      discharge_timeout_s: 120,
      verify_delay_s: 2,
      desat_window_us: 50,
      gdpc_text: "25 kHz, 100 Vrms (case REF-09)",
      bench_selfcheck_ok: true,
      reference_module_ok: true,
      discharge_path_ok: true,
      verify_meter_ok: true,
      speed_default: 8,
      noise_rel_sigma: 0
    };
  }

  // 05 §3.3 demo rules. `required`: 05 §3.3 has no column; true for every
  // non-info rule, false for Q16 (Pending Said, see NOTES-FOR-NURKHAN.md).
  function R(q, test, label, unit, type, min, max, expect, basis, ref, note) {
    return {
      quantity_id: q, test_id: test, label: label, unit: unit, rule_type: type,
      min: min, max: max, expect: expect,
      required: type !== "info",
      rule_basis: basis, reference_id: ref,
      approval_status: "NOT_APPROVED",
      applicability_note: note
    };
  }
  function demoRules() {
    return [
      R("Q01", "T01", "Diode forward drop (low-current check)", "V", "window", 0.2, 0.8, null, "CASE_INFERRED", "REF-01", "Measurement current and method not stated"),
      R("Q02", "T01", "Diode reverse direction reads open", "bool", "boolean", null, null, true, "CASE_INFERRED", "REF-01", "Low-voltage check; says nothing about blocking at rated voltage"),
      R("Q03", "T02", "Driver supply power, idle", "W", "max", null, 20, null, "CASE_INFERRED", "REF-02", "Case gives driver power, not an idle acceptance ceiling"),
      R("Q03b", "T02", "Driver idle power, plausible band", "W", "window", 2, 12, null, "INVENTED", null, "Illustrative"),
      R("Q04", "T02", "Driver supply power, switching", "W", "max", null, 20, null, "CASE_INFERRED", "REF-02", "Switching frequency/conditions not stated"),
      R("Q05", "T03", "Fibre status answers command", "bool", "boolean", null, null, true, "INVENTED", null, "Protocol unknown"),
      R("Q06", "T03", "Gate level, commanded ON", "V", "window", 14, 16, null, "INVENTED_TOLERANCE", "REF-03", "±1 V is ours"),
      R("Q07", "T03", "Gate level, commanded OFF", "V", "window", -16, -14, null, "INVENTED_TOLERANCE", "REF-03", "±1 V is ours"),
      R("Q10", "T06", "Gate threshold", "V", "window", 4.0, 7.0, null, "CASE_INFERRED", "REF-04", "Case phrase is approximate; test current unknown"),
      R("Q08", "T04", "Insulation leakage, module to baseplate", "mA", "max", null, 2.0, null, "CASE_TRANSFERRED", "REF-07", "Case value is for the busbar; test voltage/time unknown"),
      R("Q09", "T05", "V_CE(sat) at pulse current", "V", "max", null, 3.2, null, "INVENTED", null, "Fictional module"),
      R("Q11", "T07", "Blocking leakage at test voltage", "mA", "max", null, 1.0, null, "INVENTED", null, "Fictional module"),
      R("Q16", "T08a", "Pulse-1 width t1", "µs", "info", null, null, null, null, null, "Computed"),
      R("Q12", "T08a", "Switching di/dt", "A/µs", "max", null, 5000, null, "CASE_INFERRED", "REF-05", "Max-permitted interpretation unconfirmed"),
      R("Q13", "T08a", "V_CE peak at turn-off", "V", "max", null, 1000, null, "INVENTED", null, "Fictional module"),
      R("Q14", "T09", "Protection response time", "µs", "time_max", null, 10, null, "CASE_INFERRED", "REF-06", "Max vs nominal unconfirmed; start event undefined in case"),
      R("Q18", "T10", "Gate voltage after OFF command", "V", "max", null, -10, null, "INVENTED_TOLERANCE", "REF-03", "\"Reached OFF\" threshold is ours")
    ];
  }
  // The quantities the engine computes (03 §6), each with its stage, rule type and unit (05 §3.3)
  // and its `required` flag (true for every non-info rule, Pending Said). Every profile must
  // carry exactly one rule for each, and no other rules (validate.js).
  var modelled_quantities = [
    { quantity_id: "Q01", test_id: "T01", rule_type: "window", unit: "V", required: true },
    { quantity_id: "Q02", test_id: "T01", rule_type: "boolean", unit: "bool", required: true },
    { quantity_id: "Q03", test_id: "T02", rule_type: "max", unit: "W", required: true },
    { quantity_id: "Q03b", test_id: "T02", rule_type: "window", unit: "W", required: true },
    { quantity_id: "Q04", test_id: "T02", rule_type: "max", unit: "W", required: true },
    { quantity_id: "Q05", test_id: "T03", rule_type: "boolean", unit: "bool", required: true },
    { quantity_id: "Q06", test_id: "T03", rule_type: "window", unit: "V", required: true },
    { quantity_id: "Q07", test_id: "T03", rule_type: "window", unit: "V", required: true },
    { quantity_id: "Q10", test_id: "T06", rule_type: "window", unit: "V", required: true },
    { quantity_id: "Q08", test_id: "T04", rule_type: "max", unit: "mA", required: true },
    { quantity_id: "Q09", test_id: "T05", rule_type: "max", unit: "V", required: true },
    { quantity_id: "Q11", test_id: "T07", rule_type: "max", unit: "mA", required: true },
    { quantity_id: "Q16", test_id: "T08a", rule_type: "info", unit: "µs", required: false },
    { quantity_id: "Q12", test_id: "T08a", rule_type: "max", unit: "A/µs", required: true },
    { quantity_id: "Q13", test_id: "T08a", rule_type: "max", unit: "V", required: true },
    { quantity_id: "Q14", test_id: "T09", rule_type: "time_max", unit: "µs", required: true },
    { quantity_id: "Q18", test_id: "T10", rule_type: "max", unit: "V", required: true }
  ];

  // Same rules, every limit null (05 §3: listed with null limits for display)
  function unconfiguredRules() {
    return demoRules().map(function (r) {
      r.min = null; r.max = null; r.expect = null;
      return r;
    });
  }

  var profiles = [
    {
      profile_id: "demo",
      profile_version: "0.3",
      profile_status: "demo",
      profile_badge: "DEMO — ILLUSTRATIVE RULES, NOT APPROVED",
      bench_conditions: benchConditions(),
      rules: demoRules()
    },
    {
      profile_id: "production_unconfigured",
      profile_version: "0.3",
      profile_status: "production_unconfigured",
      profile_badge: "PRODUCTION — NO APPROVED LIMITS CONFIGURED",
      bench_conditions: benchConditions(),
      rules: unconfiguredRules()
    }
  ];

  // 05 §4 scenarios. No verdict fields.
  function S(id, priority, name, overrides, extra) {
    var s = { scenario_id: id, priority: priority, name: name,
              overrides: overrides || { module: {}, bench: {} },
              events: [], force_profile: null };
    if (extra) { for (var k in extra) { s[k] = extra[k]; } }
    return s;
  }
  var scenarios = [
    S("S0", "P0", "Healthy"),
    S("S1", "P0", "Shorted switch (C–E)", { module: { diode_fwd_v: 0.0, diode_reverse_open: false }, bench: {} }),
    S("S2", "P0", "Elevated conduction drop", { module: { r_ce_mohm: 12.0 }, bench: {} }),
    S("S3", "P0", "Slow protection response", { module: { desat_trip_us: 18.0 }, bench: {} }),
    S("S4", "P0", "Interlock opens during switching test", null, { events: [{ at_stage: "T08a", at_progress: 0.5, trigger: "IL1_OPEN" }] }),
    S("S5", "P0", "Production profile, no approved limits", null, { force_profile: "production_unconfigured" }),
    S("S8", "P0", "Discharge path failure", { module: {}, bench: { discharge_path_ok: false } }),
    S("S8b", "P1", "Verification meter unavailable", { module: {}, bench: { verify_meter_ok: false } }),
    S("S3b", "P2", "Protection never trips", { module: { desat_trip_us: null }, bench: {} }),
    S("S6", "P2", "Driver supply fault", { module: { driver_idle_w: 0.4, driver_switch_w: 0.5, fibre_status_ok: false }, bench: {} }),
    S("S7", "P2", "High blocking leakage", { module: { ices_ma: 3.5 }, bench: {} }),
    S("S9", "P2", "Gate does not turn off", { module: { gate_turns_off_ok: false }, bench: {} }),
    S("S10", "P2", "Bench self-check failure", { module: {}, bench: { bench_selfcheck_ok: false } }),
    S("CUSTOM", "P0", "Custom module parameters", null, { custom: true })
  ];

  // Scenarios with an engine in this build: P0 and P1 (S8b). P2 stays "not built yet".
  var built_priorities = ["P0", "P1"];

  // 02 §10 P1: σ used when Setup turns noise on (Q14 uses 2σ, engine.js). Default stays 0 (05 §2.1).
  var noise_on_sigma = 0.01;

  // 02 §6 stage order (MUST) and classes; names from the 03 §1 "Test" column,
  // excitation text from 02 §6.
  var stages = [
    { test_id: "T00", name: "Identification, visual, bench self-check", class: "NONE", excitation: "none (identification, self-check)" },
    { test_id: "T01", name: "Terminal integrity and freewheeling-diode check", class: "LV-EXCITATION", excitation: "low-current diode check" },
    { test_id: "T02", name: "Gate-driver supply behaviour", class: "LV-EXCITATION", excitation: "driver supply from GDPC emulator" },
    { test_id: "T03", name: "Fibre command/status loop and gate levels", class: "LV-EXCITATION", excitation: "driver supply + optical commands" },
    { test_id: "T06", name: "Gate threshold", class: "LV-EXCITATION", excitation: "low-current, low-voltage gate threshold (only if gate accessible)" },
    { test_id: "T04", name: "Insulation leakage to baseplate", class: "HV-INSULATION", excitation: "insulation tester; separate source; does not charge the bus" },
    { test_id: "T05", name: "Pulsed on-state voltage", class: "PULSED-CURRENT", excitation: "pulsed current source, low voltage; does not charge the bus" },
    { test_id: "T07", name: "Blocking leakage at test voltage", class: "DC-BUS", excitation: "charges the virtual bus to v_dc_test_v" },
    { test_id: "T08a", name: "Double pulse: DUT transistor switching", class: "DC-BUS", excitation: "double pulse, DUT transistor switching" },
    { test_id: "T08b", name: "Double pulse: DUT diode reverse recovery", class: "DC-BUS", excitation: "double pulse, DUT diode reverse recovery — NOT_MODELLED in this build" },
    { test_id: "T09", name: "Out-of-saturation protection response", class: "DC-BUS", excitation: "controlled protection-response check" },
    { test_id: "T10", name: "Safe state and discharge verification", class: "CLOSING", excitation: "the safe-state procedure (02 §7)" }
  ];

  // 03 §7 estimated physical duration per stage (first-order, not measured).
  // seconds: null = COMPUTED by the engine (T07 t_charge and its 30 s hold; T10 discharge).
  var physical_components = {
    T00: [{ basis: "HANDLING", seconds: 150, note: "mounting a ~25 kg part, connections, self-check" }],
    T01: [{ basis: "DWELL", seconds: 10, note: "" }],
    T02: [{ basis: "DWELL", seconds: 20, note: "" }],
    T03: [{ basis: "DWELL", seconds: 20, note: "" }],
    T06: [{ basis: "DWELL", seconds: 20, note: "only when applicable" }],
    T04: [{ basis: "PLACEHOLDER", seconds: 60, note: "insulation dwell unknown" }],
    T05: [{ basis: "DWELL", seconds: 30, note: "" }],
    T07: [
      { basis: "COMPUTED", seconds: null, compute: "t_charge", note: "t_charge" },
      { basis: "DWELL", seconds: null, compute: "hold_to_total", total_s: 30, note: "30 − t_charge; total held at 30 s for consistency; if t_charge > 30 the DWELL is 0 and the total is t_charge" }
    ],
    T08a: [{ basis: "DWELL", seconds: 90, note: "2–3 current points" }],
    T08b: [],   // NOT_MODELLED: 0 s in the simulation (proposal estimate PLACEHOLDER 30 s)
    T09: [{ basis: "DWELL", seconds: 45, note: "" }],
    T10: [
      { basis: "COMPUTED", seconds: null, compute: "discharge", note: "discharge time (or discharge_timeout_s on failure)" },
      { basis: "DWELL", seconds: 20, note: "verification, teardown, logging" }
    ]
  };

  // 03 §6 conditions templates, per quantity; {field} is filled from the profile values
  var conditions_templates = {
    Q01: "low-current diode check, forward",
    Q02: "low-current diode check, reverse",
    Q03: "GDPC emulator {gdpc_text}; not switching",
    Q03b: "GDPC emulator {gdpc_text}; not switching",
    Q04: "GDPC emulator {gdpc_text}; switching, no HV",
    Q05: "optical command → status",
    Q06: "commanded ON",
    Q07: "commanded OFF",
    Q10: "small I_C, V_CE = V_GE",
    Q08: "insulation test; test voltage and dwell unknown",
    Q09: "I = {i_pulse_a} A pulse, gate commanded ON, ambient, Kelvin sense",
    Q11: "V_CE = {v_dc_test_v} V, gate commanded OFF",
    Q16: "t1 = L·I/V",
    Q12: "V_bus = {v_dc_test_v} V, I = {i_pulse_a} A, L = {l_load_uh} µH",
    Q13: "V_peak = V_bus + L_σ·di/dt, L_σ = {l_stray_nh} nH",
    Q14: "current-limited fault emulation; window {desat_window_us} µs",
    Q18: "after OFF command (safe-state SS3)"
  };

  // 03 §10 explanatory text on FAIL ("Hypothesis:", never a diagnosis)
  var hypotheses = {
    T01: "consistent with a shorted or open switch or diode",
    T02: "consistent with a gate-driver supply or circuit fault",
    T03: "consistent with a fibre/status interface or driver output fault",
    T06: "consistent with gate-structure damage",
    T04: "consistent with insulation damage or contamination",
    T05: "consistent with increased conduction resistance (e.g. degraded internal connection)",
    T07: "consistent with degraded blocking or contamination",
    T08a: "consistent with abnormal switching or excess stray inductance",
    T09: "consistent with slow or defective desaturation detection",
    T10: "consistent with the driver or gate not turning off on command",
    SAFE_STATE_NOT_VERIFIED: "bench-side fault (discharge path or meter); module result withheld"
  };

  // 02 §5 interlocks and their demo control; `short` is the name used in event text
  var interlocks = [
    { id: "IL1", name: "Enclosure door closed", demo_control: "toggle", short: "enclosure door" },
    { id: "IL2", name: "E-stop healthy", demo_control: "button", short: "E-stop" },
    { id: "IL3", name: "Ground-bond check OK", demo_control: "set by T00 self-check", short: "ground-bond check" },
    { id: "IL4", name: "Fixture clamp engaged / DUT present", demo_control: "set in setup", short: "fixture clamp / DUT present" },
    { id: "IL5", name: "Fibre link seated", demo_control: "set in setup", short: "fibre link" },
    { id: "IL6", name: "Controller watchdog heartbeat", demo_control: "toggle (simulates laptop loss)", short: "controller watchdog heartbeat" },
    { id: "IL7", name: "Bench over-current OK", demo_control: "scenario hook (optional)", short: "bench over-current" }
  ];

  // Display precision per quantity (decimals), read off the 03 §12 "Key values" column.
  // Display only: stored values keep 4 dp.
  var display_decimals = {
    Q01: 2, Q03: 1, Q03b: 1, Q04: 1, Q06: 1, Q07: 1, Q10: 1, Q08: 2, Q09: 2,
    Q11: 2, Q16: 0, Q12: 0, Q13: 0, Q14: 1, Q18: 1
  };

  // 05 §8 verdict labels (exact text)
  var verdict_labels = {
    PASS: "PASS — DEMO PROFILE (illustrative, not-approved rules; not an acceptance decision)",
    FAIL: "FAIL — DEMO PROFILE (illustrative, not-approved rules)",
    ABORTED: "ABORTED — run interrupted; no acceptance conclusion",
    ABORTED_SAFE_STATE: "ABORTED — safe state not verified; enclosure kept locked; no acceptance conclusion",
    INCOMPLETE: "INCOMPLETE — run ended before required tests completed; no acceptance conclusion",
    NOT_EVALUATED: "NOT EVALUATED — configuration blocked: no approved production limits; bench not energised"
  };

  // 05 §9, 02 §7.2, 02 §9, 02 §11, 05 §6, 05 §10 fixed texts
  var fixed_texts = {
    banner: "SIMULATION — all readings are synthetic. No physical module was tested.",
    limitations: "This is a virtual prototype of the proposed test-cell workflow, sequencing, safety behaviour, decision logic and reporting. All readings are computed from illustrative parameters. No physical module, measurement chain or industrial safety system was built or validated. No rule is manufacturer- or Wabtec-approved. Where a rule cites a case reference, that reference records what the hackathon slides state; it does not establish that our comparison is an approved acceptance criterion, and some references concern a different component (for example, the busbar leakage statement). The simulation can only flag faults that were modelled; it provides no evidence of detection rate, downtime reduction or savings. Estimated physical durations are first-order engineering estimates, not measurements. This tool is not a digital twin and its results are not acceptance, certification or safety decisions.",
    chip_legend: [
      { chip: "ILLUSTRATIVE · CASE_INFERRED", meaning: "case value used by our inference" },
      { chip: "ILLUSTRATIVE · CASE_TRANSFERRED", meaning: "case value about a different component" },
      { chip: "ILLUSTRATIVE · INVENTED_TOLERANCE", meaning: "case nominal, our tolerance" },
      { chip: "ILLUSTRATIVE · INVENTED", meaning: "no case basis" },
      { chip: "NOT APPROVED", meaning: "no manufacturer/Wabtec approval" }
    ],
    config_blocked: "No approved production limits configured. The virtual bench was not energised. Overall: NOT EVALUATED.",
    config_blocked_stage_reason: "configuration preflight: no approved production limits",
    fault_locked_banner: "Safe state NOT verified — enclosure remains locked",
    clock_caption: "Animation is accelerated for demonstration. Estimated physical duration is a first-order engineering estimate, not a measurement.",
    report_footer: "Synthetic data. Not for acceptance, certification or safety use."
  };

  return {
    schema_version: "0.3",
    software_version: "0.5.0",
    case_references: case_references,
    module_defaults: module_defaults,
    module_parameter_units: module_parameter_units,
    bench_parameter_units: bench_parameter_units,
    modelled_quantities: modelled_quantities,
    profiles: profiles,
    scenarios: scenarios,
    built_priorities: built_priorities,
    noise_on_sigma: noise_on_sigma,
    stages: stages,
    physical_components: physical_components,
    conditions_templates: conditions_templates,
    hypotheses: hypotheses,
    interlocks: interlocks,
    display_decimals: display_decimals,
    speeds: [1, 4, 8, 16],
    seed_default: 20261018,
    verdict_labels: verdict_labels,
    fixed_texts: fixed_texts
  };
})();
