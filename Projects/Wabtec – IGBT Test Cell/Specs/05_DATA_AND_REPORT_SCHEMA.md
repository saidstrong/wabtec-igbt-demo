# 05 — Data and Report Schema

Version 0.3 · 17 Oct 2026 · Owner: Said · Implementer: Nurkhan
Supersedes v0.2. Companion files: `02_SYSTEM_DESIGN.md`, `03_TEST_AND_ACCEPTANCE.md`.
Field names are `snake_case`; units are in the field name or a `unit` field. All data ship inside `js/data.js` as `window.APP_DATA` (02 §3); the JSON shown here is the shape of that object. Nurkhan may add fields; renaming or removing listed fields needs agreement.

---

## 1. Provenance model (replaces the v0.2 `WS`/`DEMO`/`UNK` tags)

Every rule carries three separate things:

| Element | Field(s) | Meaning |
|---|---|---|
| **Case reference** | `reference_id` → entry in the case reference register (§1.1) | What the supplied case actually says, about which object. A reference is evidence of a statement, **not** of an acceptance criterion. |
| **Rule basis** | `rule_basis` | How *we* turned it into a comparison (enum below). |
| **Approval status** | `approval_status` | Always `NOT_APPROVED` in this build. `APPROVED` is reserved and must be rejected by validation. |

`rule_basis` values:

| Value | Meaning | Reference required? |
|---|---|---|
| `CASE_INFERRED` | The case value is used as the limit for the same object, but the case does not state it as an acceptance criterion or give the measurement condition. | yes |
| `CASE_TRANSFERRED` | A case value about a **different** object is applied to this one. | yes |
| `INVENTED_TOLERANCE` | The case gives a nominal value; the tolerance window is ours. | yes |
| `INVENTED` | No case basis; illustrative only. | no (`null`) |

**Every rule in this build is illustrative.** UI chips: `ILLUSTRATIVE · <basis>`, `NOT APPROVED`, and `Case ref REF-xx` when present.

### 1.1 Case reference register (`case_references`)

Kept separate from rules. Statements are short paraphrases of the slides; they are not verified against IM-LE-0008 or 84A215577 (not available).

| reference_id | Source | Statement (paraphrase) | Applies to (per case) | Used by |
|---|---|---|---|---|
| REF-01 | Slide 5 | Free-wheeling diode "0.2 V to 0.8 V", reverse direction "open" | Free-wheeling diode; method/current not stated | Q01, Q02 |
| REF-02 | Slide 5 | Driver power "up to 20 W" | Gate driver | Q03, Q04 |
| REF-03 | Slides 5, 8 | Gate drive +15 V on, −15 V off | Gate drive | Q06, Q07, Q18 |
| REF-04 | Slide 8 + notes | Fully on above roughly +4 to +7 V; "threshold about +4 to +7 V" | IGBT gate; test current not stated | Q10 |
| REF-05 | Slide 5 | Max di/dt "0–5000 A/µs" | IGBT; condition not stated | Q12 |
| REF-06 | Slides 5, 8 | Healthy switch turns off ~10 µs after a saturation fault | Protection function of the driver | Q14 |
| REF-07 | Slide 5 | "Busbar insulation: leakage current up to 2 mA" | **Laminated busbar** insulation; test voltage/time not stated | Q08 (transferred) |
| REF-08 | Slide 10 notes | ≈3.5 min per IGBT, PASS/NO PASS, IM-LE-0008 step 14 | Existing check; scope and location unknown | none (context only) |
| REF-09 | Slide 8 diagram | GDPC supplies the driver at 25 kHz, 100 Vrms | Driver power supply | bench condition text only |

## 2. Module parameters (`module_defaults`)

Fictional module. Not Wabtec ratings. Defaults produce a healthy run.

| Field | Unit | Default | Domain (validation) |
|---|---|---|---|
| `module_id` | – | `DEMO-MODULE-01` | non-empty string |
| `module_note` | – | `Fictional demo module; not a Wabtec rating` | fixed text |
| `diode_fwd_v` | V | 0.35 | 0 ≤ x ≤ 5 |
| `diode_reverse_open` | bool | true | boolean |
| `gate_accessible` | bool | false | boolean |
| `gate_on_v` | V | 15.0 | −30 ≤ x ≤ 30 |
| `gate_off_v` | V | −15.0 | −30 ≤ x ≤ 30 |
| `gate_turns_off_ok` | bool | true | boolean; if false, measured gate stays at `gate_on_v` after an OFF command |
| `driver_idle_w` | W | 6.0 | x ≥ 0 |
| `driver_switch_w` | W | 11.0 | x ≥ 0 |
| `fibre_status_ok` | bool | true | boolean |
| `iso_leak_ma` | mA | 0.05 | x ≥ 0 |
| `vce0_v` | V | 1.0 | 0 ≤ x ≤ 10 |
| `r_ce_mohm` | mΩ | 7.0 | x ≥ 0 |
| `ices_ma` | mA | 0.05 | x ≥ 0 |
| `vge_th_v` | V | 5.5 | 0 < x ≤ 20 |
| `didt_a_per_us` | A/µs | 1800 | x > 0 |
| `desat_trip_us` | µs | 6.5 | x > 0, or `null` = never trips |

## 2.1 Bench conditions (inside each profile, `bench_conditions`)

All **[I]**.

| Field | Unit | Default | Domain |
|---|---|---|---|
| `v_dc_test_v` | V | 600 | x > 0 |
| `i_pulse_a` | A | 200 | x > 0 |
| `l_load_uh` | µH | 300 | x > 0 |
| `l_stray_nh` | nH | 100 | x ≥ 0 |
| `dclink_c_mf` | mF | 1.0 | x > 0 |
| `bleeder_r_kohm` | kΩ | 10 | x > 0 |
| `charge_current_a` | A | 0.1 | x > 0 |
| `v_safe_v` | V | 50 | 0 < x < `v_dc_test_v` |
| `discharge_timeout_s` | s | 120 | x > `t_safe` computed from `v_dc_test_v` (else validation error) |
| `verify_delay_s` | s | 2 | x ≥ 0 |
| `desat_window_us` | µs | 50 | x > 0 |
| `gdpc_text` | – | `25 kHz, 100 Vrms (case REF-09)` | string, display only |
| `bench_selfcheck_ok` | bool | true | boolean |
| `reference_module_ok` | bool | true | boolean (T08a needs a known-good reference module) |
| `discharge_path_ok` | bool | true | boolean |
| `verify_meter_ok` | bool | true | boolean |
| `speed_default` | – | 8 | one of 1, 4, 8, 16 |
| `noise_rel_sigma` | – | 0 | 0 ≤ x ≤ 0.05 (P0 uses 0) |

### 2.2 Overrides

Scenarios and Custom mode override with `{ "module": {...}, "bench": {...} }`. Overrides pass the same validation. Unknown keys are rejected.

### 2.3 Validation (CONFIG_PREFLIGHT, MUST)

- Type and domain checks in §2 and §2.1, including `null` only where listed.
- Derived checks: `v_safe_v < v_dc_test_v`; `discharge_timeout_s > R·C·ln(v_dc_test_v / v_safe_v)`; no division by zero (all divisors are validated > 0); `ln` only of arguments > 1 (else `t_safe = 0`).
- Invalid input → validation error screen listing field, value and rule; **no run and no verdict**.

## 3. Profiles (`profiles`)

```json
{
  "profile_id": "demo",
  "profile_version": "0.3",
  "profile_status": "demo",
  "profile_badge": "DEMO — ILLUSTRATIVE RULES, NOT APPROVED",
  "bench_conditions": { "...": "§2.1" },
  "rules": [ ]
}
```

`profile_status`:

| Value | Behaviour |
|---|---|
| `demo` | Runnable. Every required rule must have its limit (validation). Verdicts are demo verdicts, never acceptance decisions. |
| `production_unconfigured` | **Not runnable.** CONFIG_PREFLIGHT → CONFIG_BLOCKED; overall `NOT EVALUATED`, `block_reason: CONFIGURATION_PREFLIGHT`; nothing energised. Rules may be listed with `null` limits for display. |
| `production_approved` | Reserved. Validation rejects it in this build. |

### 3.1 Rule object

| Field | Type | Required | Notes |
|---|---|---|---|
| `quantity_id` | string | yes | unique, e.g. `Q09` |
| `test_id` | string | yes | `T00`…`T10`, `T08a`, `T08b` |
| `label` | string | yes | |
| `unit` | string | yes | `"bool"` for booleans |
| `rule_type` | enum | yes | `window`, `max`, `min`, `boolean`, `time_max`, `info` |
| `min` | number \| null | yes | |
| `max` | number \| null | yes | |
| `expect` | bool \| null | yes | |
| `required` | bool | yes | `info` rules must be `false` |
| `rule_basis` | enum | yes, except `info` (`null`) | §1 |
| `reference_id` | string \| null | yes | must exist in register when basis is `CASE_*` or `INVENTED_TOLERANCE`; `null` for `INVENTED` |
| `approval_status` | enum | yes | must be `NOT_APPROVED` |
| `applicability_note` | string | yes (may be empty for `info`) | why the comparison is illustrative |

### 3.2 Limit fields by rule type (validation, `demo` profile)

| rule_type | `min` | `max` | `expect` |
|---|---|---|---|
| `window` | number | number, `min < max` | null |
| `max`, `time_max` | null | number | null |
| `min` | number | null | null |
| `boolean` | null | null | bool |
| `info` | null | null | null |

A `demo` rule with a missing required limit is a **validation error**, not a NOT EVALUATED verdict.

### 3.3 Demo rules (`profile_demo`)

| Q | Test | Label | Unit | Type | Limit | Basis | Ref | Applicability note |
|---|---|---|---|---|---|---|---|---|
| Q01 | T01 | Diode forward drop (low-current check) | V | window | 0.2–0.8 | CASE_INFERRED | REF-01 | Measurement current and method not stated |
| Q02 | T01 | Diode reverse direction reads open | bool | boolean | true | CASE_INFERRED | REF-01 | Low-voltage check; says nothing about blocking at rated voltage |
| Q03 | T02 | Driver supply power, idle | W | max | 20 | CASE_INFERRED | REF-02 | Case gives driver power, not an idle acceptance ceiling |
| Q03b | T02 | Driver idle power, plausible band | W | window | 2–12 | INVENTED | – | Illustrative |
| Q04 | T02 | Driver supply power, switching | W | max | 20 | CASE_INFERRED | REF-02 | Switching frequency/conditions not stated |
| Q05 | T03 | Fibre status answers command | bool | boolean | true | INVENTED | – | Protocol unknown |
| Q06 | T03 | Gate level, commanded ON | V | window | 14–16 | INVENTED_TOLERANCE | REF-03 | ±1 V is ours |
| Q07 | T03 | Gate level, commanded OFF | V | window | −16 to −14 | INVENTED_TOLERANCE | REF-03 | ±1 V is ours |
| Q10 | T06 | Gate threshold | V | window | 4.0–7.0 | CASE_INFERRED | REF-04 | Case phrase is approximate; test current unknown |
| Q08 | T04 | Insulation leakage, module to baseplate | mA | max | 2.0 | **CASE_TRANSFERRED** | REF-07 | Case value is for the busbar; test voltage/time unknown |
| Q09 | T05 | V_CE(sat) at pulse current | V | max | 3.2 | INVENTED | – | Fictional module |
| Q11 | T07 | Blocking leakage at test voltage | mA | max | 1.0 | INVENTED | – | Fictional module |
| Q16 | T08a | Pulse-1 width t1 | µs | info | – | – | – | Computed |
| Q12 | T08a | Switching di/dt | A/µs | max | 5000 | CASE_INFERRED | REF-05 | Max-permitted interpretation unconfirmed |
| Q13 | T08a | V_CE peak at turn-off | V | max | 1000 | INVENTED | – | Fictional module |
| Q14 | T09 | Protection response time | µs | time_max | 10 | CASE_INFERRED | REF-06 | Max vs nominal unconfirmed; start event undefined in case |
| Q18 | T10 | Gate voltage after OFF command | V | max | −10 | INVENTED_TOLERANCE | REF-03 | "Reached OFF" threshold is ours |

The safe-state verification (bus ≤ `v_safe_v`) is a **bench** check recorded in the `safe_state` block (§6), not a module rule.

## 4. Scenarios (`scenarios`)

No verdict fields. `priority` tells Nurkhan what P0 needs.

| scenario_id | priority | Name | Overrides / events |
|---|---|---|---|
| S0 | P0 | Healthy | none |
| S1 | P0 | Shorted switch (C–E) | module: `diode_fwd_v: 0.0`, `diode_reverse_open: false` |
| S2 | P0 | Elevated conduction drop | module: `r_ce_mohm: 12.0` |
| S3 | P0 | Slow protection response | module: `desat_trip_us: 18.0` |
| S4 | P0 | Interlock opens during switching test | event: `{ at_stage: "T08a", at_progress: 0.5, trigger: "IL1_OPEN" }` |
| S5 | P0 | Production profile, no approved limits | `force_profile: "production_unconfigured"` |
| S8 | P0 | Discharge path failure | bench: `discharge_path_ok: false` |
| S8b | P1 | Verification meter unavailable | bench: `verify_meter_ok: false` |
| S3b | P2 | Protection never trips | module: `desat_trip_us: null` |
| S6 | P2 | Driver supply fault | module: `driver_idle_w: 0.4`, `driver_switch_w: 0.5`, `fibre_status_ok: false` |
| S7 | P2 | High blocking leakage | module: `ices_ma: 3.5` |
| S9 | P2 | Gate does not turn off | module: `gate_turns_off_ok: false` |
| S10 | P2 | Bench self-check failure | bench: `bench_selfcheck_ok: false` |
| CUSTOM | P0 | Custom module parameters | user-edited module overrides |

Expected outcomes: `03` §12.

## 5. Event object

```json
{ "seq": 41, "stage": "T08a", "type": "ABORT_TRIGGER",
  "physical_time_s": 365.0, "animation_time_s": 45.63,
  "detail": "IL1 (enclosure door) opened at 50% of T08a; v_bus = 600.0 V" }
```

`animation_time_s = physical_time_s / speed` (here speed 8). Both are cumulative from RUN_START. This is the event as shown in the UI and HTML report; the JSON `deterministic.events` copy omits `animation_time_s` (§6).

Event types: `RUN_START`, `CONFIG_BLOCKED`, `VALIDATION_ERROR`, `INTERLOCK_CHECK`, `STAGE_START`, `STAGE_END`, `PREREQUISITE_BLOCK`, `BUS_CHARGE_START`, `BUS_AT_SETPOINT`, `ABORT_TRIGGER`, `SAFE_STATE_START`, `GATE_OFF_COMMANDED`, `GATE_OFF_CONFIRMED`, `GATE_OFF_NOT_CONFIRMED`, `HV_SOURCE_DISABLED`, `CONTACTOR_OPEN`, `DISCHARGE_START`, `DISCHARGE_NOT_REQUIRED`, `DISCHARGE_VERIFIED`, `DISCHARGE_FAILED`, `VERIFICATION_UNAVAILABLE`, `DOOR_UNLOCKED`, `FAULT_LOCKED`, `RUN_END`, `WARNING`.

## 6. Report JSON (`report_<run_id>.json`)

```json
{
  "schema_version": "0.3",
  "simulation": true,
  "simulation_banner": "SIMULATION — all readings are synthetic. No physical module was tested.",
  "metadata": {
    "run_id": "RUN-20261017-0003",
    "created_local": "2026-10-17T19:05:00+05:00",
    "software_version": "0.3.0",
    "operator": "string"
  },
  "deterministic": {
    "inputs": {
      "scenario_id": "S2", "scenario_name": "Elevated conduction drop",
      "module_parameters": { "...": "after overrides" },
      "profile_id": "demo", "profile_version": "0.3", "profile_status": "demo",
      "bench_conditions": { "...": "after overrides" },
      "seed": 20261018, "noise_rel_sigma": 0, "speed": 8
    },
    "overall": {
      "verdict": "FAIL",
      "verdict_label": "FAIL — DEMO PROFILE (illustrative, not-approved rules)",
      "block_reason": null,
      "abort_reason": null,
      "precedence_reason": "Required reading Q09 FAIL; no abort; safe state verified",
      "is_acceptance_decision": false
    },
    "stages": [
      {
        "test_id": "T05", "name": "Pulsed on-state voltage", "class": "PULSED-CURRENT",
        "status": "DONE", "blocked_reason": null,
        "conditions": "I = 200 A pulse, gate commanded ON, ambient, Kelvin sense",
        "readings": [
          {
            "quantity_id": "Q09", "label": "V_CE(sat) at pulse current", "unit": "V",
            "value": 3.4, "observation": "OBSERVED",
            "rule": { "type": "max", "min": null, "max": 3.2, "expect": null },
            "required": true,
            "rule_basis": "INVENTED", "reference_id": null, "reference_text": null,
            "approval_status": "NOT_APPROVED",
            "verdict": "FAIL", "margin": -0.2,
            "reason": "V_CE(sat) 3.40 V > max 3.20 V [ILLUSTRATIVE · INVENTED, NOT APPROVED] at I = 200 A pulse",
            "hypothesis": "Hypothesis: consistent with increased conduction resistance (e.g. degraded internal connection); not a diagnosis.",
            "model_equation": "V_CE(sat) = 1.00 V + 0.012 Ω × 200 A = 3.40 V"
          }
        ],
        "physical_components": [ { "basis": "DWELL", "seconds": 30, "note": "setup, a few points, settling" } ],
        "physical_estimate_s": 30
      }
    ],
    "safe_state": {
      "trigger": "NORMAL_COMPLETION",
      "gate_off_commanded": true, "gate_measured_v": -15.0, "gate_off_confirmed": true,
      "hv_source_disabled": true, "contactor_open": true,
      "v_bus_at_start_v": 600.0, "discharge_required": true,
      "discharge_time_s": 24.85, "v_bus_at_verification_v": 40.94,
      "verification": "VERIFIED", "door": "UNLOCKED", "final_state": "SAFE"
    },
    "events": [ { "seq": 1, "stage": null, "type": "RUN_START", "physical_time_s": 0, "detail": "..." } ],
    "physical_total_s": 499.85
  },
  "presentation": {
    "animation_total_s": 62.48,
    "clock_caption": "Animation is accelerated for demonstration. Estimated physical duration is a first-order engineering estimate, not a measurement."
  },
  "case_references": [ { "reference_id": "REF-03", "source": "Slides 5, 8", "statement": "...", "applies_to": "..." } ],
  "limitations": "see §9"
}
```

Notes:

- `value` is number, boolean or `null`. `observation` is `OBSERVED`, `NOT_OBSERVED_IN_WINDOW` (e.g. Q14 no trip within `desat_window_us`) or `NOT_MEASURED` (stage blocked/interrupted/not applicable). `margin` is `null` unless both value and a numeric limit exist.
- Readings of `BLOCKED`, `NOT_RUN`, `INTERRUPTED`, `NOT_APPLICABLE`, `NOT_MODELLED` stages are present with `value: null`, `observation: "NOT_MEASURED"`, `verdict: "NOT RUN"`.
- In CONFIG_BLOCKED reports: every stage `NOT_RUN`, `blocked_reason: "configuration preflight: no approved production limits"`, `safe_state: null`, `physical_total_s: 0`.
- Events in the `deterministic` section omit `animation_time_s` (it depends on `speed`, kept in inputs, and is recomputed for display). The exported event list in the HTML report shows both clocks.

### 6.1 Physical components

Each stage has `physical_components: [{basis, seconds, note}]` with `basis` ∈ `HANDLING`, `DWELL`, `COMPUTED`, `PLACEHOLDER`, and `physical_estimate_s` = sum. Stages not executed contribute 0. Values: 03 §7.

### 6.2 Determinism rule (AC-02)

Two runs with the same `deterministic.inputs` must produce byte-identical `deterministic` sections after JSON serialisation with stable key order. `metadata` and `presentation` are excluded from the comparison. **SUGGEST:** show an FNV-1a hash of the serialised `deterministic` section in the report footer for quick comparison.

## 7. Enumerations

| Field | Values |
|---|---|
| `overall.verdict` | `PASS`, `FAIL`, `ABORTED`, `INCOMPLETE`, `NOT EVALUATED` |
| `overall.block_reason` | `CONFIGURATION_PREFLIGHT`, `null` |
| `overall.abort_reason` | `OPERATOR`, `IL1_OPEN`…`IL7_OPEN`, `WATCHDOG`, `SAFE_STATE_NOT_VERIFIED`, `null` |
| `stages[].status` | `DONE`, `BLOCKED`, `NOT_APPLICABLE`, `NOT_MODELLED`, `NOT_RUN`, `INTERRUPTED` |
| `stages[].class` | `NONE`, `LV-EXCITATION`, `HV-INSULATION`, `PULSED-CURRENT`, `DC-BUS`, `CLOSING` |
| `readings[].verdict` | `PASS`, `FAIL`, `INFO`, `NOT RUN` |
| `readings[].observation` | `OBSERVED`, `NOT_OBSERVED_IN_WINDOW`, `NOT_MEASURED` |
| `rule_basis` | `CASE_INFERRED`, `CASE_TRANSFERRED`, `INVENTED_TOLERANCE`, `INVENTED` |
| `approval_status` | `NOT_APPROVED` (only allowed value) |
| `safe_state.trigger` | `NORMAL_COMPLETION`, `ABORT` |
| `safe_state.verification` | `VERIFIED`, `DISCHARGE_FAILED`, `VERIFICATION_UNAVAILABLE` |
| `safe_state.final_state` | `SAFE`, `FAULT_LOCKED` |
| `physical_components[].basis` | `HANDLING`, `DWELL`, `COMPUTED`, `PLACEHOLDER` |

(`NOT EVALUATED` is no longer a reading verdict: the only path to missing limits is the configuration block.)

## 8. Verdict labels (exact text)

| Case | `verdict_label` |
|---|---|
| PASS | `PASS — DEMO PROFILE (illustrative, not-approved rules; not an acceptance decision)` |
| FAIL | `FAIL — DEMO PROFILE (illustrative, not-approved rules)` |
| ABORTED, interlock/operator/watchdog | `ABORTED — run interrupted; no acceptance conclusion` |
| ABORTED, safe state not verified | `ABORTED — safe state not verified; enclosure kept locked; no acceptance conclusion` |
| INCOMPLETE | `INCOMPLETE — run ended before required tests completed; no acceptance conclusion` |
| NOT EVALUATED (configuration block) | `NOT EVALUATED — configuration blocked: no approved production limits; bench not energised` |

`is_acceptance_decision` is always `false`.

## 9. Fixed texts

**Banner:** `SIMULATION — all readings are synthetic. No physical module was tested.`

**Limitations statement:**
> This is a virtual prototype of the proposed test-cell workflow, sequencing, safety behaviour, decision logic and reporting. All readings are computed from illustrative parameters. No physical module, measurement chain or industrial safety system was built or validated. No rule is manufacturer- or Wabtec-approved. Where a rule cites a case reference, that reference records what the hackathon slides state; it does not establish that our comparison is an approved acceptance criterion, and some references concern a different component (for example, the busbar leakage statement). The simulation can only flag faults that were modelled; it provides no evidence of detection rate, downtime reduction or savings. Estimated physical durations are first-order engineering estimates, not measurements. This tool is not a digital twin and its results are not acceptance, certification or safety decisions.

**Chip legend:** `ILLUSTRATIVE · CASE_INFERRED` = case value used by our inference · `ILLUSTRATIVE · CASE_TRANSFERRED` = case value about a different component · `ILLUSTRATIVE · INVENTED_TOLERANCE` = case nominal, our tolerance · `ILLUSTRATIVE · INVENTED` = no case basis · `NOT APPROVED` = no manufacturer/Wabtec approval.

## 10. HTML report layout (print-to-PDF)

1. SIMULATION banner (repeated on every printed page) and title, run ID, date, operator, software version.
2. Overall verdict, label, precedence reason; block or abort reason when present.
3. Inputs: module ID, scenario, overrides, profile badge, bench conditions, seed, noise σ.
4. Results table: test, quantity, value, unit, observation, conditions, rule, basis chip, reference chip, `NOT APPROVED`, margin, verdict, reason.
5. Hypotheses (separate box, "not diagnoses").
6. Safe-state block (trigger, gate command vs measured, bus voltages, discharge, verification, door, final state). FAULT_LOCKED shown in red.
7. Event log with both clocks.
8. Clocks summary with caption and per-stage physical components.
9. Case reference register entries used in this run.
10. Chip legend and limitations statement.
11. Footer on every page: "Synthetic data. Not for acceptance, certification or safety use." plus the deterministic hash (if implemented).

Do not rely on colour alone; every chip carries text.

## 11. Naming

`run_id`: `RUN-YYYYMMDD-NNNN` (unique within a session). Files: `report_<run_id>.json`, `report_<run_id>.html`.
