# 02 — System Design (virtual IGBT test cell)

Version 0.3 · 17 Oct 2026 · Owner: Said · Implementer: Nurkhan
Supersedes v0.2. Companion files: `03_TEST_AND_ACCEPTANCE.md` (test definitions, prerequisites, expected results), `05_DATA_AND_REPORT_SCHEMA.md` (data formats and validation), `04_BUILD_PLAN.md` (schedule). Background: `IGBT_Test_Cell_Analysis_Report.md` (read its correction note first).

**MUST** = requirement. **SUGGEST** = recommendation Nurkhan may override. Changes to coverage, safety claims, cost or performance claims, rules or verdict logic need Said's agreement.

---

## 1. What this software is

A **virtual prototype of the operator workflow, test sequencing, safety/abort behaviour, decision logic and reporting** of a proposed off-locomotive IGBT test cell. It runs on simulated data computed from an editable module parameter set and bench conditions.

It is **not** a validated digital twin, not a calibrated semiconductor model, and it never presents synthetic numbers as measurements. No rule in this build is manufacturer- or Wabtec-approved.

Unit under test (working assumption **[E]**): one switch-position phase module with its attached gate driver, one of the 36 per locomotive. The software models a fictional module, `DEMO-MODULE-01`.

## 2. Hard constraints

| ID | Constraint |
|---|---|
| C1 | Runs offline from the **packaged delivery method in §3**. No paid API, no network, no CDN, no `fetch()` of local files, no ES modules. |
| C2 | Readings are **computed** from module parameters, bench conditions and (optionally) seeded noise. No verdict is derived from the scenario name. |
| C3 | Identical inputs → identical **deterministic payload** (05 §6.2). Run ID, timestamps, operator and wall-clock timing are excluded from the comparison. |
| C4 | Persistent SIMULATION banner on every screen and every export. |
| C5 | Every judged reading shows unit, rule, rule basis, case reference (if any), approval status (`NOT APPROVED`) and reason. |
| C6 | Failed, blocked, aborted, fault-locked and configuration-blocked runs are reportable and exportable without changing status. |
| C7 | Animation time and estimated physical time are shown separately; `animation = physical / speed`. |
| C8 | Noise is optional. The **P0 build runs with noise σ = 0**; every P0 acceptance check assumes σ = 0. |

## 3. Delivery and launch (MUST pick one; default A)

### Method A — offline folder, classic scripts (default)

- `index.html` loads **classic** scripts with `<script src="...">` (no `type="module"`). Classic `src` scripts load from `file://`; `fetch()` and ES modules do not reliably, so neither is used.
- All data (module defaults, profiles, scenarios, case references) are JavaScript files that assign one global, e.g. `window.APP_DATA = {...}`. No JSON file is fetched at runtime.
- Exports use `Blob` + download link (JSON, HTML) and `window.print()` (PDF via the browser).
- No third-party libraries unless copied into the folder.
- Package: zip of the folder. Launch: unzip, double-click `index.html` (or drag into Chrome/Edge).

```
/igbt-test-cell
  index.html
  selfcheck.html          # runs engine checks (03 §13) in the browser, same scripts
  /js
    data.js               # window.APP_DATA (all data, 05)
    validate.js           # domain validation (05 §2.3, §3.4)
    rng.js                # seeded PRNG (used only if noise > 0)
    models.js             # micro-models (§8)
    engine.js             # readings, rule evaluation, roll-up; no DOM
    sequencer.js          # state machine, prerequisites, bus model, safe-state procedure
    report.js             # JSON + HTML report builders
    ui.js                 # rendering and controls
  README.txt              # one-paragraph launch instruction, tested browsers
```

Optional: inline everything into one `igbt-test-cell.html` for submission. Only do this if it is tested by the same AC-01 procedure.

### Method B — local app with launcher (only if Nurkhan prefers)

Allowed only with dependencies **already installed** on both the dev and presentation laptops, a one-line documented launcher (e.g. `start.bat`), and no install step at demo time. AC-01 then tests that launcher on the presentation laptop.

**Whichever method is chosen, AC-01 (03 §13) tests the actual packaged artefact on a second laptop with the network disabled.**

## 4. Run state machine

```
IDLE → SETUP → CONFIG_PREFLIGHT ─┬─(blocked)──► CONFIG_BLOCKED ──────────────► REPORT
                                 └─(ok)──► PRECHECK → RUNNING ─► SAFE_STATE_PROCEDURE ─┬─► SAFE ─────────► REPORT
                                                        │                ▲           └─► FAULT_LOCKED ─► REPORT
                                                        └─(abort)────────┘
```

| State | Meaning |
|---|---|
| SETUP | Module ID, profile, scenario (or Custom), seed, speed, operator; generates `run_id`. |
| CONFIG_PREFLIGHT | Validates all inputs (05 §2.3, §3.4) and the profile status. Invalid data → validation error screen, **no run, no verdict**. `profile_status = production_unconfigured` → **CONFIG_BLOCKED**. |
| CONFIG_BLOCKED | Deliberate block: no approved production limits. Nothing is energised, no stage executes, overall `NOT EVALUATED` with `block_reason = CONFIGURATION_PREFLIGHT`. Distinct from `INCOMPLETE`. |
| PRECHECK | All interlocks must be OK to enable START. |
| RUNNING | Stages in the order of §6, each gated by its prerequisites (03 §5). |
| SAFE_STATE_PROCEDURE | The single safe-state routine (§7), entered on normal completion or abort. Runs **once per run**. |
| SAFE | Discharge verified, door unlocked. |
| FAULT_LOCKED | Discharge failed or verification unavailable. Door stays locked. Report export allowed. Only exit: explicit, logged "Reset simulation" (a real bench would need qualified intervention). |

Stage statuses: `PENDING`, `RUNNING`, `DONE`, `BLOCKED` (prerequisite failed), `NOT_APPLICABLE`, `NOT_MODELLED`, `NOT_RUN` (run ended or was blocked before it started), `INTERRUPTED` (running when aborted).

## 5. Interlocks and abort triggers

| ID | Interlock | Demo control |
|---|---|---|
| IL1 | Enclosure door closed | toggle |
| IL2 | E-stop healthy | button |
| IL3 | Ground-bond check OK | set by T00 self-check |
| IL4 | Fixture clamp engaged / DUT present | set in setup |
| IL5 | Fibre link seated | set in setup |
| IL6 | Controller watchdog heartbeat | toggle (simulates laptop loss) |
| IL7 | Bench over-current OK | scenario hook (optional) |

All must be OK to start. Any interlock opening while RUNNING, or the operator pressing Abort, is an **abort trigger**: the running stage becomes `INTERRUPTED`, all later stages `NOT_RUN` (except `NOT_APPLICABLE`/`NOT_MODELLED`, which keep their status), and the sequencer enters SAFE_STATE_PROCEDURE with `trigger = ABORT`. Triggers during the procedure are logged and ignored; the procedure cannot be skipped.

Scenario S4 opens IL1 at 50% of T08a.

## 6. Stage order and classes

Order (MUST): **T00, T01, T02, T03, T06, T04, T05, T07, T08a, T08b, T09, T10.**

| Stage | Class | Excitation |
|---|---|---|
| T00 | NONE | none (identification, self-check) |
| T01 | LV-EXCITATION | low-current diode check |
| T02 | LV-EXCITATION | driver supply from GDPC emulator |
| T03 | LV-EXCITATION | driver supply + optical commands |
| T06 | LV-EXCITATION | low-current, low-voltage gate threshold (only if gate accessible) |
| T04 | HV-INSULATION | insulation tester; separate source; does not charge the bus |
| T05 | PULSED-CURRENT | pulsed current source, low voltage; does not charge the bus |
| T07 | DC-BUS | charges the virtual bus to `v_dc_test_v` |
| T08a | DC-BUS | double pulse, DUT transistor switching |
| T08b | DC-BUS | double pulse, DUT diode reverse recovery — **`NOT_MODELLED` in this build** |
| T09 | DC-BUS | controlled protection-response check |
| T10 | CLOSING | the safe-state procedure (§7) |

Prerequisites, connection configurations and what each stage cannot establish: **03 §3 and §5** (single source of truth).

## 7. Virtual bench state and the safe-state procedure

### 7.1 Bench state (MUST be modelled explicitly, not inferred)

| Variable | Meaning |
|---|---|
| `v_bus_v` | Present DC-bus voltage |
| `source_enabled` | HV source output on/off |
| `contactor_closed` | Bus connected to the DUT circuit |
| `door_locked` | Enclosure lock |
| `gate_cmd` | `ON`/`OFF` command sent over fibre |
| `gate_meas_v` | Modelled gate–emitter voltage (from module parameters, 03 §6) |

Bus behaviour (illustrative **[I]**):

- **Charge** (T07 start): linear ramp, `dv/dt = charge_current_a / C`, up to `v_dc_test_v`. Default 0.1 A / 1 mF → 100 V/s → 6 s.
- **Hold**: constant while `source_enabled` (T07–T09). Pulse energy drawn by T08a is neglected.
- **Discharge** (safe-state procedure): `v(t) = v0 · exp(−t / (R·C))` if `discharge_path_ok`; otherwise `v` stays constant (no modelled decay).
- Stages before T07 never change `v_bus_v` (it stays 0 V). Abort during the T07 ramp uses the ramp value at that instant.

### 7.2 Safe-state procedure (single implementation, MUST)

| Step | Action | Event(s) |
|---|---|---|
| SS1 | Record trigger: `NORMAL_COMPLETION` or `ABORT` (with cause) | `SAFE_STATE_START` |
| SS2 | Command gate OFF | `GATE_OFF_COMMANDED` |
| SS3 | Read modelled gate voltage; evaluate Q18 (gate reached OFF) | `GATE_OFF_CONFIRMED` or `GATE_OFF_NOT_CONFIRMED` (continue either way) |
| SS4 | Disable HV source | `HV_SOURCE_DISABLED` |
| SS5 | Open contactor | `CONTACTOR_OPEN` |
| SS6 | If `v_bus_v > v_safe_v`: start discharge from the **actual** `v_bus_v` | `DISCHARGE_START` (or `DISCHARGE_NOT_REQUIRED`) |
| SS7 | Wait until `v_bus_v ≤ v_safe_v` or `discharge_timeout_s` elapses | — |
| SS8 | Verify with the independent meter, 2 s after reaching `v_safe_v` (or at timeout) | `DISCHARGE_VERIFIED`, `DISCHARGE_FAILED` or `VERIFICATION_UNAVAILABLE` |
| SS9 | Verified → unlock door → SAFE. Otherwise keep door locked → FAULT_LOCKED | `DOOR_UNLOCKED` or `FAULT_LOCKED` |

- The procedure runs **exactly once** per run. T10's stage record *is* this procedure's record (`trigger` field tells normal vs abort). No other code path discharges the bus.
- Verification is required even at 0 V. If the meter is unavailable, the result is `VERIFICATION_UNAVAILABLE` → FAULT_LOCKED (conservative).
- Gate-OFF command (SS2) and gate-OFF evidence (SS3) are separate. A failed confirmation is recorded as a FAIL of Q18 and does not stop SS4–SS9.
- In FAULT_LOCKED the UI shows a red banner: "Safe state NOT verified — enclosure remains locked". Export is allowed.

## 8. Micro-models (equations shown in the UI with substituted values)

All parameters are **[I]**, read from data files; the text is generated from the actual values (never hard-coded "600 V" or "200 A").

| Model | Equation | Stage |
|---|---|---|
| Conduction drop | `V_CE(sat) = vce0_v + (r_ce_mohm/1000) · i_pulse_a` | T05 |
| Load-inductor ramp | `t1_us = l_load_uh · i_pulse_a / v_dc_test_v` | T08a |
| Overshoot | `V_peak = v_dc_test_v + l_stray_nh·1e-9 · didt_a_per_us·1e6` | T08a |
| Bus charge | `t_charge = C · v_dc_test_v / charge_current_a` | T07 |
| Bus discharge | `t_safe = R·C · ln(v0 / v_safe_v)` for `v0 > v_safe_v`, else 0; `E = ½·C·v0²` | T10 |

Defaults: `t1 = 100 µs`, `V_peak = 780 V`, `t_charge = 6 s`, `t_safe = 24.85 s` from 600 V, `E = 180 J`.

## 9. Clocks

- **Estimated physical time**: per-stage components with a basis each (`HANDLING`, `DWELL`, `COMPUTED`, `PLACEHOLDER`), defined in 03 §7. First-order engineering estimate, not a measurement.
- **Animation time** = physical / `speed` (`speed` ∈ {1, 4, 8, 16}, default 8). Every event carries both times.
- Caption (UI and report): "Animation is accelerated for demonstration. Estimated physical duration is a first-order engineering estimate, not a measurement."

## 10. Noise and determinism

- `noise_rel_sigma` default **0** (P0). With σ = 0 the PRNG is not consulted.
- P1 (optional): σ = 0.01 multiplicative Gaussian, truncated at ±3σ (Q14 uses σ = 0.02); per-quantity sub-seed = hash(seed, quantity_id). **SUGGEST** `mulberry32` + FNV-1a.
- Deterministic payload and comparison rule: 05 §6.2.
- If a scenario does not produce its expected result, **report the discrepancy to Said**. Do not widen thresholds, change σ or edit expected values to make it pass. Approved changes are recorded in the change log of `03`.

## 11. UI screens

All screens: SIMULATION banner; profile badge; (when applicable) FAULT_LOCKED banner.

| Screen | Content |
|---|---|
| 1 Setup | Module ID, profile, scenario (S0–S9, Custom), seed, noise on/off (P1), speed, operator. Custom: editable module-parameter table with units and validation messages. |
| 1a Validation error | Lists each invalid field and rule; START disabled. |
| 1b Configuration blocked | "No approved production limits configured. The virtual bench was not energised. Overall: NOT EVALUATED." Export available. |
| 2 Pre-check | Interlock lamps IL1–IL7; bench diagram; START enabled only when all OK. |
| 3 Run | Stage list (status + class); active reading card (value, unit, rule, basis chip, reference chip, `NOT APPROVED` chip, margin); equation with values; bench state panel (`v_bus_v`, source, contactor, door, gate cmd vs measured); event log; two clocks; demo controls (Abort, Open door, Heartbeat loss). |
| 4 Result | Overall verdict + precedence reason; per-reading table; hypotheses (separate, "not diagnoses"); safe-state summary; clocks. |
| 5 Report | Preview; Print/Save PDF; Download JSON; Download HTML. |
| Limitations | Always reachable; text in 05 §9. |

## 12. Out of scope

Hardware or serial I/O, SPICE or calibrated semiconductor/thermal models, T08b waveforms, accounts, databases, cloud, live AI, ML, batch/fleet integration, 3D physics, anything implying measurement.

## 13. Reporting back to Said

Return: chosen delivery method and launch line; AC results from 03 §13 with evidence; discrepancies against 03 §12 (do not "fix" by changing expectations); known defects; deviations; scope questions.
