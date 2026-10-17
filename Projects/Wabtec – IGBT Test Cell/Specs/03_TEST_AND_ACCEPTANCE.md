# 03 — Test Definitions, Prerequisites, Decision Logic and Acceptance

Version 0.3 · 17 Oct 2026 · Owner: Said · Implementer: Nurkhan
Supersedes v0.2. Companion files: `02_SYSTEM_DESIGN.md` (state machine, bus model, safe-state procedure), `05_DATA_AND_REPORT_SCHEMA.md` (parameters, rules, provenance, report).
Evidence tags: **[F]** case fact · **[E]** engineering proposal · **[I]** illustrative · **[U]** unknown.

Nothing here is a Wabtec specification. No rule is approved. Case references (05 §1.1) record what the slides say; they do not make our comparisons acceptance criteria.

---

## 1. Purpose of each test and what it does not establish

| ID | Test | Class | Establishes (on the proposed bench) | Does **not** establish |
|---|---|---|---|---|
| T00 | Identification, visual, bench self-check | NONE | Correct part, no visible damage, bench reference and interlock loop OK | Anything electrical about the DUT |
| T01 | Terminal integrity and freewheeling-diode check | LV-EXCITATION | No gross C–E short; antiparallel diode conducts forward and reads open in reverse at low current | **That the transistor conducts when commanded ON** (T05 covers that); blocking at voltage; reverse recovery |
| T02 | Gate-driver supply behaviour | LV-EXCITATION | Driver draws plausible supply power idle and while switching | Driver internals or timing |
| T03 | Fibre command/status loop and gate levels | LV-EXCITATION | Driver answers optical commands; gate reaches ON/OFF levels | Behaviour with the real controller (protocol **[U]**) |
| T06 | Gate threshold | LV-EXCITATION | Gate threshold in an expected range | Anything, if the gate is not accessible without disassembly **[U]** |
| T04 | Insulation leakage to baseplate | HV-INSULATION | Insulation leakage below an illustrative limit at a test voltage **[U]** | Partial discharge; that the busbar figure applies to the module |
| T05 | Pulsed on-state voltage | PULSED-CURRENT | Transistor conducts when commanded ON, with a plausible drop at the test current | Hot behaviour; current sharing between paralleled dies |
| T07 | Blocking leakage at test voltage | DC-BUS | Blocks at the chosen (possibly derated) test voltage with gate OFF | Blocking at rated voltage if derated |
| T08a | Double pulse: DUT transistor switching | DC-BUS | DUT switches on command with plausible di/dt and overshoot, relative to a reference | Datasheet energies unless conditions match; hot switching; DUT diode recovery |
| T08b | Double pulse: DUT diode reverse recovery | DC-BUS | DUT diode recovery behaviour (Irr, Qrr, Err) | **Not modelled in this build** (`NOT_MODELLED`) |
| T09 | Out-of-saturation protection response | DC-BUS | Driver detects an emulated desaturation and turns the DUT off within an illustrative time | Short-circuit withstand capability |
| T10 | Safe state and discharge verification | CLOSING | Gate OFF confirmed; bus discharged and verified; door unlocked only then | – |

## 2. Stage order

**T00, T01, T02, T03, T06, T04, T05, T07, T08a, T08b, T09, T10** (02 §6). Low energy first; bus charged only from T07.

## 3. Proposed physical connection configurations (**[E]**, for the written proposal)

The module is believed to carry its own driver (report §2.2). An attached driver can interfere with some measurements; those cases are marked **[U]** and need Wabtec's procedure.

| Stage | Proposed configuration | Unknown / interference |
|---|---|---|
| T01 | Driver unpowered, fibre disconnected; meter on main C and E terminals, both polarities | The driver's desaturation-sense network may be connected to the collector and load the reading **[U]** |
| T02 | GDPC emulator on the driver supply input; main terminals not energised; complementary/ON–OFF commands at a fixed rate | With no collector current, the driver may report a desat fault when commanded ON; whether a C–E bias or a defeat link is needed **[U]** |
| T03 | As T02 plus optical TX/RX; isolated probe on gate–auxiliary emitter if accessible | Gate test point availability **[U]** |
| T06 | Driver disconnected or gate test point accessible; gate tied to collector; small current source C–E | Whether possible without disassembly **[U]**; default `NOT_APPLICABLE` |
| T04 | All main terminals shorted together; gate/auxiliary pins and driver connector shorted to emitter, or driver removed; tester between that node and baseplate/heatsink | Whether the driver is inside the insulation boundary, at what voltage and dwell **[U]** |
| T05 | Driver powered and commanded ON over fibre; pulsed current source on main terminals; separate Kelvin sense leads | Test current and pulse length **[U]** |
| T07 | Current-limited HV source charges the bus; DUT C–E across the bus through a leakage meter; driver powered and commanded OFF | Test voltage (derated or rated) **[U]** |
| T08a/b | Commutation circuit in §4 | Ratings of every component **[U]** |
| T09 | Driver powered; DUT commanded ON while a current-limited path holds V_CE above the driver's desat threshold; not a hard short | Method must be confirmed against driver documentation **[U]** |
| T10 | Active discharge and bleeder across the bus; independent meter on the bus; door lock interlocked to meter | Safe threshold from the bench risk assessment **[U]** |

## 4. Double-pulse commutation circuit (conceptual, T08a and T08b)

Because each module is a single switch position, the bench needs a **reference module**: a known-good module of the same type, with its own driver, forming a half-bridge with the DUT. Its ratings and service life are **[U]**; it is a wear item and a cost line.

```
  DC+ ──────┬───────────────────────────────┐
            │                               │
         [C_bus]  bus monitor V_bus      ┌──┴──┐
         bleeder,                        │UPPER│──┐
         active discharge                │ pos.│  │ L_load (across the
            │                            └──┬──┘  │ upper position)
            │                    mid-point  ├─────┘
            │                               │   ◄── (1) V_CE probe, Kelvin C–E of LOWER
            │                            ┌──┴──┐
            │                            │LOWER│◄── (2) V_GE isolated probe, gate–aux emitter
            │                            │ pos.│
            │                            └──┬──┘
            │                               │   ◄── (3) current sensor (low-inductance shunt
            │                               │        or Rogowski) in the LOWER emitter leg
  DC− ──────┴───────────────────────────────┘
```

| Configuration | LOWER position | UPPER position | Freewheeling path | What is measured |
|---|---|---|---|---|
| **T08a** transistor switching | **DUT**, switched by its own driver via the optical emulator | Reference module held OFF (−15 V) | Reference module's antiparallel diode | DUT turn-off at the end of pulse 1, turn-on at pulse 2: delays, di/dt, V_CE overshoot, switching energies (relative to a reference/golden result) |
| **T08b** DUT diode reverse recovery | Reference module, switched | **DUT** held OFF (−15 V); inductor across DUT | **DUT's** antiparallel diode | DUT diode recovery when the reference turns on at pulse 2: Irr, trr, Qrr, Err; current sensor moved to the DUT leg |

- Pulse 1 width: `t1 = L·I/V` (02 §8). Pulse-to-pulse gap short enough that the inductor current stays near target.
- Parameter definitions (thresholds for delays and energy integration windows) follow IEC 60747-9-style definitions; one example is the Keysight PD1500A help page cited in the report. Exact conditions **[U]**.
- Where the DUT sits (lower or upper) depends on its terminal arrangement and fixture **[U]**; the configurations swap roles as shown.
- The simulation models **T08a only**, with three readings (Q16, Q12, Q13). T08b is listed with status `NOT_MODELLED` and excluded from the roll-up.

## 5. Prerequisites (simulation, MUST)

All interlocks IL1–IL7 must be OK at START; any interlock opening during the run is an abort (02 §5). Beyond that:

| Stage | Prerequisites | If not met |
|---|---|---|
| T00 | Configuration preflight passed | – (preflight failure never reaches T00) |
| T01 | T00 `DONE` and `bench_selfcheck_ok` | Run ends `INCOMPLETE` after T00 (S10) |
| T02 | T00 `DONE` | as T01 |
| T03 | **T02 PASS** | `BLOCKED` ("T02 not PASS") |
| T06 | `gate_accessible = true` and **T01 PASS** | `NOT_APPLICABLE` (no access) or `BLOCKED` ("T01 not PASS") |
| T04 | T00 `DONE` | as T01 |
| T05 | **T01, T02, T03 PASS** | `BLOCKED` with the failed list |
| T07 | **T01, T02, T03, T04 PASS** | `BLOCKED`; bus never charged |
| T08a | **T07 PASS** and `reference_module_ok` (implies T01–T04 PASS) | `BLOCKED` |
| T08b | – | always `NOT_MODELLED` |
| T09 | **T07 PASS** | `BLOCKED` |
| T10 | T00 `DONE` | not run after a T00 self-check failure (nothing was excited) |

"PASS" means every required reading of that stage is PASS. `NOT EVALUATED` never authorises a stage; with the configuration block it cannot occur during a run.

## 6. Computation of simulated readings

`n(x, σ)` = `x · (1 + g)`, `g` Gaussian, truncated ±3σ, per-quantity sub-seed. **P0: σ = 0, so `n(x) = x`.** Conditions text is generated from the actual profile values.

**Dependency rule:** if `driver_idle_w < 1.0` the driver is treated as unpowered and gate readings are 0 V. If `gate_turns_off_ok = false`, the gate stays at `gate_on_v` after an OFF command.

| Stage | Quantity | Computation | Conditions template |
|---|---|---|---|
| T01 | Q01 | `n(diode_fwd_v)` | "low-current diode check, forward" |
| T01 | Q02 | `diode_reverse_open` | "low-current diode check, reverse" |
| T02 | Q03, Q03b | `n(driver_idle_w)` (one value, two rules) | "GDPC emulator {gdpc_text}; not switching" |
| T02 | Q04 | `n(driver_switch_w)` | "GDPC emulator {gdpc_text}; switching, no HV" |
| T03 | Q05 | `fibre_status_ok` | "optical command → status" |
| T03 | Q06 | `n(gate_on_v)` (0 if unpowered) | "commanded ON" |
| T03 | Q07 | `n(gate_off_v)` (0 if unpowered; `gate_on_v` if `gate_turns_off_ok` false) | "commanded OFF" |
| T06 | Q10 | `n(vge_th_v)` | "small I_C, V_CE = V_GE" |
| T04 | Q08 | `n(iso_leak_ma)` | "insulation test; test voltage and dwell unknown" |
| T05 | Q09 | `n(vce0_v + r_ce_mohm/1000 · i_pulse_a)` | "I = {i_pulse_a} A pulse, gate commanded ON, ambient, Kelvin sense" |
| T07 | Q11 | `n(ices_ma)`; bus ramps to `v_dc_test_v` | "V_CE = {v_dc_test_v} V, gate commanded OFF" |
| T08a | Q16 | `l_load_uh · i_pulse_a / v_dc_test_v` (info) | "t1 = L·I/V" |
| T08a | Q12 | `n(didt_a_per_us)` | "V_bus = {v_dc_test_v} V, I = {i_pulse_a} A, L = {l_load_uh} µH" |
| T08a | Q13 | `v_dc_test_v + l_stray_nh·1e-9 · Q12·1e6` | "V_peak = V_bus + L_σ·di/dt, L_σ = {l_stray_nh} nH" |
| T09 | Q14 | `n(desat_trip_us, 2σ)` if not `null` and ≤ `desat_window_us`; otherwise `value: null`, `observation: NOT_OBSERVED_IN_WINDOW` | "current-limited fault emulation; window {desat_window_us} µs" |
| T10 | Q18 | modelled gate voltage after OFF command (−15 V healthy; 0 V if unpowered; `gate_on_v` if `gate_turns_off_ok` false) | "after OFF command (safe-state SS3)" |

Bus and discharge values (safe-state block, not module rules): `v_bus_at_start_v` = actual bus voltage when the procedure starts; `discharge_time_s = R·C·ln(v0/v_safe_v)` if `v0 > v_safe_v` and the discharge path is OK; `v_bus_at_verification_v = v0·exp(−(t_safe + verify_delay_s)/(R·C))`; with `discharge_path_ok = false`, the bus stays at `v0` until `discharge_timeout_s`, then `DISCHARGE_FAILED`.

## 7. Estimated physical duration (**[E]**, first-order, not measured)

| Stage | Components (basis: seconds) | Note |
|---|---|---|
| T00 | HANDLING: 150 | mounting a ~25 kg part, connections, self-check |
| T01 | DWELL: 10 | |
| T02 | DWELL: 20 | |
| T03 | DWELL: 20 | |
| T06 | DWELL: 20 | only when applicable |
| T04 | PLACEHOLDER: 60 | insulation dwell unknown |
| T05 | DWELL: 30 | |
| T07 | COMPUTED: `t_charge` (6) + DWELL: 30 − `t_charge` (24) | total held at 30 s for consistency; if `t_charge` > 30 the DWELL is 0 and the total is `t_charge` |
| T08a | DWELL: 90 | 2–3 current points |
| T08b | – | `NOT_MODELLED`, 0 s in the simulation; proposal estimate PLACEHOLDER 30 s |
| T09 | DWELL: 45 | |
| T10 | COMPUTED: discharge time (or `discharge_timeout_s` on failure) + DWELL: 20 | verification, teardown, logging |

Interrupted stages contribute their elapsed fraction; blocked/not-run stages 0.

**Selected figures (all from the components above):**

| Case | Physical estimate | Basis |
|---|---|---|
| Healthy simulated run (S0; T06 n/a; T08b not modelled) | **499.85 s ≈ 8.3 min** | 150+10+20+20+60+30+30+90+45+(24.85+20) |
| Tier-1-only (T00–T04 + T10, bus never charged) | **280 s ≈ 4.7 min** | 150+10+20+20+60+(0+20); same as S1 |
| Proposed full bench cycle incl. T08b placeholder | ≈ 529.85 s ≈ 8.8 min | healthy + 30 s |
| …with T06 applicable | ≈ 549.85 s ≈ 9.2 min | + 20 s |

Animation total = physical / speed (S0 at speed 8: 62.48 s). The 3.5-minute case benchmark (REF-08) is not comparable: its scope is unknown.

## 8. Rule evaluation

| Rule type | PASS when | FAIL reason template |
|---|---|---|
| `window` | `min ≤ x ≤ max` | `{label} {x} {unit} outside [{min}, {max}] [{chips}] {conditions}` |
| `max` | `x ≤ max` | `{label} {x} {unit} > max {max} [{chips}]` |
| `min` | `x ≥ min` | `{label} {x} {unit} < min {min} [{chips}]` |
| `boolean` | `x == expect` | `{label} observed {x}, expected {expect} [{chips}]` |
| `time_max` | `observation = OBSERVED` and `x ≤ max` | `{label} {x} µs > max {max} µs` or `no event within {window} µs window` |
| `info` | never judged; verdict `INFO` | – |

`{chips}` = `ILLUSTRATIVE · <basis>, NOT APPROVED` (+ `Case ref REF-xx`). `margin` = signed distance to the nearest numeric limit (positive inside), `null` when value or numeric limit is absent. Readings of stages not executed: `verdict: NOT RUN`, `observation: NOT_MEASURED`.

## 9. Overall roll-up (MUST, in this order)

1. **NOT EVALUATED** with `block_reason = CONFIGURATION_PREFLIGHT` if the profile is `production_unconfigured`. No stage executed; nothing energised. (Invalid data never produce a verdict; they produce a validation error.)
2. **ABORTED** if an abort trigger occurred (`abort_reason` = cause) **or** the safe state was not verified (`abort_reason = SAFE_STATE_NOT_VERIFIED`). `precedence_reason` also lists any FAIL already recorded.
3. **FAIL** if any required reading is FAIL.
4. **INCOMPLETE** if any required stage is not `DONE` without a FAIL explaining it (e.g. T00 self-check failure). `NOT_APPLICABLE` and `NOT_MODELLED` stages and `info` readings are not required.
5. **PASS** (demo label) otherwise. `is_acceptance_decision` is always false.

`INCOMPLETE` = unexpected stop. `NOT EVALUATED` = deliberate configuration block. They must never be conflated.

## 10. Explanatory text on FAIL ("Hypothesis:", never a diagnosis)

| Stage | Hypothesis |
|---|---|
| T01 | consistent with a shorted or open switch or diode |
| T02 | consistent with a gate-driver supply or circuit fault |
| T03 | consistent with a fibre/status interface or driver output fault |
| T06 | consistent with gate-structure damage |
| T04 | consistent with insulation damage or contamination |
| T05 | consistent with increased conduction resistance (e.g. degraded internal connection) |
| T07 | consistent with degraded blocking or contamination |
| T08a | consistent with abnormal switching or excess stray inductance |
| T09 | consistent with slow or defective desaturation detection |
| T10 (Q18) | consistent with the driver or gate not turning off on command |
| Safe state not verified | bench-side fault (discharge path or meter); module result withheld |

## 11. Noise checks (P1 only; skip when σ = 0)

| ID | Check |
|---|---|
| N1 | With σ = 0.01, S0 is PASS for every seed 1…1000. |
| N2 | With σ = 0.01, S2 fails Q09 for every seed 1…1000 (nominal 3.40 V; lowest possible 3.40 × 0.97 = 3.298 V > 3.2 V). |
| N3 | Custom sweep of `r_ce_mohm`: nominal Q09 equals 3.2 V at 11.000 mΩ. With the ±3% truncation bound, a seed can move the PASS/FAIL crossing anywhere between **≈10.534 mΩ** (reading +3%) and **≈11.495 mΩ** (reading −3%). Outside that interval the verdict is seed-independent. |

If N1 or N2 fails, report it. Do not widen thresholds or change σ without Said's approval recorded in §15.

## 12. Expected outcomes (σ = 0, default bench; reproduce exactly to display precision)

| Scenario | Stage outcomes | Key values | Safe state | Overall | Physical |
|---|---|---|---|---|---|
| **S0** Healthy | all `DONE` PASS; T06 `NOT_APPLICABLE`; T08b `NOT_MODELLED` | Q01 0.35 V · Q02 true · Q03/Q03b 6.0 W · Q04 11.0 W · Q05 true · Q06 15.0 V · Q07 −15.0 V · Q08 0.05 mA · Q09 2.40 V · Q11 0.05 mA · Q16 100 µs · Q12 1800 A/µs · Q13 780 V · Q14 6.5 µs · Q18 −15.0 V | v0 600 V; discharge 24.85 s; verified 40.94 V; SAFE | **PASS** (demo label) | 499.85 s |
| **S1** Shorted switch | T01 FAIL; T02, T03, T04 PASS; T06 n/a; **T05, T07, T08a, T09 BLOCKED**; T10 DONE | Q01 0.00 V · Q02 false · Q18 −15.0 V | v0 0 V; `DISCHARGE_NOT_REQUIRED`; verified 0 V; SAFE | **FAIL** | 280 s |
| **S2** Elevated drop | T05 FAIL; all others PASS (T07–T09 still run: they require T01–T04, not T05) | Q09 3.40 V, margin −0.20 V | as S0 | **FAIL** | 499.85 s |
| **S3** Slow protection | T09 FAIL; others PASS | Q14 18.0 µs | as S0 | **FAIL** | 499.85 s |
| **S4** IL1 opens at 50% T08a | T00–T07 PASS; T08a `INTERRUPTED`; T08b `NOT_MODELLED`; T09 `NOT_RUN`; T10 via abort | abort at physical 365.0 s; Q18 −15.0 V | trigger ABORT; v0 600 V; discharge 24.85 s; verified 40.94 V; SAFE | **ABORTED** (`IL1_OPEN`) | 409.85 s |
| **S5** Production unconfigured | CONFIG_BLOCKED; all stages `NOT_RUN`; no bus events | – | `null` | **NOT EVALUATED** (`CONFIGURATION_PREFLIGHT`) | 0 s |
| **S8** Discharge path failure | all module stages PASS | Q18 −15.0 V | v0 600 V; no decay; timeout 120 s; `DISCHARGE_FAILED`; door LOCKED; FAULT_LOCKED | **ABORTED** (`SAFE_STATE_NOT_VERIFIED`) | 595 s |
| S8b Meter unavailable (P1) | all module stages PASS | | discharge 24.85 s; `VERIFICATION_UNAVAILABLE`; LOCKED; FAULT_LOCKED | ABORTED (`SAFE_STATE_NOT_VERIFIED`) | 499.85 s |
| S3b Never trips (P2) | T09 FAIL | Q14 `null`, `NOT_OBSERVED_IN_WINDOW` | as S0 | FAIL | 499.85 s |
| S6 Driver fault (P2) | T02 FAIL (Q03b 0.4 W); T03 BLOCKED; T04 PASS; T05, T07, T08a, T09 BLOCKED; T10 DONE | Q18 0.0 V FAIL | v0 0 V; SAFE | FAIL | 260 s |
| S7 High leakage (P2) | T07 FAIL; T08a, T09 BLOCKED | Q11 3.5 mA | v0 600 V; discharge 24.85 s; SAFE | FAIL | 364.85 s |
| S9 Gate stays on (P2) | T03 FAIL (Q07 +15.0 V); T05, T07, T08a, T09 BLOCKED; T10 Q18 +15.0 V FAIL | | v0 0 V; `GATE_OFF_NOT_CONFIRMED` logged; SAFE | FAIL | 280 s |
| S10 Self-check fails (P2) | T00 DONE with warning; all later `NOT_RUN`; T10 not run | | `null` | INCOMPLETE | 150 s |

If the engine disagrees with this table, report it to Said; one of them is wrong. Do not edit this table to match the engine.

## 13. Acceptance checks (evidence from Nurkhan)

| ID | Pri | Check | Evidence |
|---|---|---|---|
| AC-01 | P0 | The **packaged artefact** (02 §3) launches with the documented method on a second laptop with the network disabled; S0 runs; JSON and HTML export; print to PDF works | Screen clip; laptop, OS and browser named |
| AC-02 | P0 | Two runs with identical inputs give identical `deterministic` sections; `metadata` may differ | Two JSON files and a diff (or matching hash) |
| AC-03 | P0 | Custom: `r_ce_mohm` 7 → 12 flips T05 to FAIL with the reason updated | Before/after screenshots |
| AC-04 | P0 | S1: BLOCKED stages with reasons, no bus charge events. S4: full safe-state event sequence; neither PASS | JSON for both |
| AC-05 | P0 | S5: CONFIG_BLOCKED, no stage executed, no bus events, `NOT EVALUATED` with `block_reason`; visibly different from INCOMPLETE (S10, if built) | JSON + screenshot |
| AC-06 | P0 | HTML and JSON agree on IDs, values, verdicts, chips; JSON parses | Both files |
| AC-07 | P0 | Banner and limitations on every screen and export, every printed page | Screenshots + PDF |
| AC-08 | P0 | Every event in the UI and HTML report shows `physical_time_s` and `animation_time_s = physical/speed`; the JSON `deterministic` section stores `physical_time_s` plus `speed` in inputs (05 §6); totals match §7/§12 | Event log excerpt + JSON |
| AC-09 | P0 | Every judged reading shows basis, reference (when any) and `NOT APPROVED`; Q08 shows `CASE_TRANSFERRED`; validation rejects `APPROVED` | Screenshot + validation message |
| AC-10 | P0 | Said's claims audit (§14) passes | Said sign-off |
| AC-11 | P0 | §12 reproduced for S0, S1, S2, S3, S4, S5, S8 | Actual vs expected table |
| AC-12 | P0 | Exactly one safe-state procedure per run (≤1 `DISCHARGE_START`); repeated Abort clicks change nothing; door unlocks only after `DISCHARGE_VERIFIED` | Event logs |
| AC-13 | P0 | S8: door stays locked, final state FAULT_LOCKED, never SAFE, overall ABORTED, report exportable | JSON + screenshot |
| AC-14 | P0 | Validation rejects: `r_ce_mohm = −1`, `dclink_c_mf = 0`, `v_safe_v ≥ v_dc_test_v`, `speed = 0`, window `min ≥ max`, `info` rule with a limit, demo rule missing a limit, unknown override key | Messages for each |
| AC-15 | P0 | Changing `i_pulse_a` or `v_dc_test_v` in the data file changes conditions text, equations and computed values consistently | Before/after |
| AC-16 | P1 | N1, N2, N3 (noise on) | Output of `selfcheck.html` |
| AC-17 | P1 | S8b behaves per §12 | JSON |

## 14. Claims audit (Said)

None of these may appear as claims in UI, report, slides or script: "tested a Wabtec module", "real measurements", "digital twin", "validated", "certified", "safe" (except "safe state" as a bench state name), "approved", "compliant", "Wabtec limit", "manufacturer limit", "detects all", any detection percentage, "reduces downtime by", any savings or payback presented as a result, "faster than 3.5 minutes". Also check that no case reference is described as an acceptance criterion and that the busbar figure is never described as a module requirement.

## 15. Change log of approved deviations

| Date/time | Change | Approved by | Reason |
|---|---|---|---|
| | | | |
