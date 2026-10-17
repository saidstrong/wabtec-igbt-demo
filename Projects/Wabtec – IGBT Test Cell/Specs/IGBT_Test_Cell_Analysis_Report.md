# Wabtec IGBT Test Cell — Independent Technical Analysis and Plan

Version 1.1 · 17 Oct 2026 · Prepared for Said (cc: Nurkhan, ChatGPT reviewer)
Status: analysis and proposal. **Not** a validated engineering specification. Nothing here was measured or approved by Wabtec.

> **Correction note (v1.1, after ChatGPT review).** Build specifications 02–05 v0.3 supersede this report wherever they differ. Superseded items:
>
> 1. **Equipment sums** (§6.2): line items add to **$21–67k** for Tier 1, **$53–225k** additional for Tier 2, **$74–292k** combined (v1.0 wrongly said ~25–60k, ~+100–225k, ~125–285k). Line items unchanged; no contingency added. Tier 2 also needs a **reference module with driver** for the double-pulse test; its cost is unknown and not in these sums.
> 2. **Cycle times** (§2.4, §3.1, §4.3): healthy simulated run **499.85 s (≈8.3 min)**; Tier-1-only without bus energisation **280 s (≈4.7 min)**; full proposed cycle including the not-modelled diode-recovery test ≈ 530 s (≈ 550 s with the gate-threshold test). v1.0 said ~305 s / ~5 min and 505–565 s / ~9 min.
> 3. **Limit-source tags** `WS`/`DEMO`/`UNK` are replaced by three separate fields: case reference, rule basis (`CASE_INFERRED`, `CASE_TRANSFERRED`, `INVENTED_TOLERANCE`, `INVENTED`) and approval status (always `NOT APPROVED`). A slide number does not make our comparison an approved criterion. In particular the slide's **2 mA busbar** statement is *transferred* to module-to-baseplate insulation and is illustrative only; v1.0 §4.3 and §5.5 presented it too directly.
> 4. **T01** (diode check) does not establish that the transistor conducts when commanded ON; T05 covers that. **T06** is a low-current gate test, not a DC-bus test. Connection configurations, and where an attached driver may interfere, are in 03 §3.
> 5. **Double-pulse test** split into T08a (DUT transistor switching, reference module's diode freewheels) and T08b (DUT diode reverse recovery, reference module switches); see 03 §4. Only T08a is simulated.
> 6. **Production profile without limits** no longer runs any stage: it is blocked at configuration preflight and returns NOT EVALUATED. Missing limits never authorise energisation.
> 7. **Abort/discharge:** modelled from the actual virtual bus voltage; failed discharge or unavailable verification keeps the door locked (FAULT_LOCKED) and the run ABORTED; one safe-state procedure per run.
> 8. **Economics** (§6.3): simple cash payback is now shown separately from the annualised-capital analysis.
> 9. **Noise** is optional and off in the minimum build; the T05 PASS/FAIL crossing with ±3% noise lies between ≈10.534 and ≈11.495 mΩ, not "within about 1% of 11 mΩ".

**Evidence tags used throughout**

| Tag | Meaning |
|---|---|
| **[F]** | Fact stated in the supplied case (slides, speaker notes, photos, transcript) |
| **[X]** | Supported by an external source I actually read (link in §9) |
| **[E]** | Engineering proposal (ours; needs qualified review before any hardware) |
| **[I]** | Illustrative simulation assumption (never an acceptance limit) |
| **[U]** | Unknown / not supplied |

---

## 1. Recommended direction and rationale

**Propose a tiered, gate-driver-in-the-loop test cell, and demonstrate it with a rule-driven virtual prototype.**

- **Tier 1 (always run, low energy, no high-voltage stored energy):** identification, terminal/diode check, gate-driver supply behaviour, fibre command/status loop, gate voltage levels, insulation leakage.
- **Tier 2 (optional per Wabtec risk appetite, derated or representative voltage):** pulsed on-state voltage, blocking leakage, double-pulse switching with the module's *own* driver, and a controlled out-of-saturation (desat) protection response check.
- **Virtual prototype:** behavioural simulation of the *bench* (sequence, interlocks, safe state, decision rules, report), with four tiny equation-backed micro-models (§5.2). No SPICE, no calibrated semiconductor model.

**Why this and not something else**

1. The case asks for parameters, duration, instructions, cost and a laptop report (slide 11 **[F]**). That is an *equipment concept*, so the written proposal is the main deliverable and the simulation is the evidence that the workflow and logic work.
2. The only primary-source guidance I could read on incoming inspection is blunt: testing with rudimentary equipment that cannot supply datasheet voltage and current "results in unnecessarily rejected parts and at worst, damage" (Semikron Danfoss AN 20-003 §1.2 **[X]**). So a credible bench must either be honest about being a screen, or genuinely stress the module in a representative way. Tiering does both and says which is which.
3. Slide 8 **[F]** shows each IGBT has its own gate driver fed over fibre, and the protection function (turn-off ≈10 µs after a saturation fault) lives in that driver. A bench that tests only the silicon would miss the function Wabtec describes. Hence "driver-in-the-loop".
4. We cannot validate a physics model in 22 h, and an uncalibrated physics model adds false precision. Explicit rules on explicit parameters, plus a few visible equations, are defensible in Q&A.

**What I would change in `01_CASE_AND_REQUIREMENTS.md` (v0.1)**

| # | Draft says | Challenge |
|---|---|---|
| 1 | Behavioural simulation as default | Agree, but add four equation-backed micro-models (pulse width, gate RC, DC-link discharge, conduction drop). They are cheap and make results traceable to physics, not to scenario names. |
| 2 | SW-07 outcomes | Keep. Add **precondition gating**: HV stages are *blocked* (not run) when Tier-1 shows a shorted switch or dead driver. This is real bench logic and a strong demo moment. |
| 3 | SW-15 determinism | Keep. Add seeded noise (seed in report) so "same inputs → same result" is shown *and* "result near limit" can be shown. |
| 4 | Feature freeze 21:00 | Too late given a recorded fallback, rehearsal and sleep. **Freeze 20:00** (§7). |
| 5 | Software scope drives the plan | The **bench proposal, test instructions, cost model and limitations** are Said's work and are graded items. Schedule them explicitly (§7). |
| 6 | "3.5 min" treated as a bench benchmark | It is probably the *on-locomotive* post-install check (§2.3). Do not race it. |
| 7 | Detection claims | The simulation can only "detect" faults we modelled. State plainly: it validates the **workflow and decision logic**, not detection capability or field performance. |

**Honest risk: software-only acceptance is unconfirmed.** The slide says "suggest a prototype of testing equipment" **[F]**, which a judge could read as expecting hardware. Mitigations: (a) lead with the engineering proposal; (b) call the demo a *virtual prototype of the operator and reporting workflow*; (c) include a validation roadmap; (d) ask the organisers through an official channel today (no waiting, no autonomous contact; the contact on slide 12 is the user's call to use).

---

## 2. Case facts, ambiguities, and missing information

### 2.1 What Wabtec needs

A way to know, **before** a 25 kg replacement module goes onto a locomotive, that it works, so that a bad one does not cost installation labour and a troubleshooting hunt in which "new module vs. something else on the locomotive" is undecidable (transcript, slide 9 **[F]**). A credible submission must show:

1. which parameters, why those, and what each does *not* prove;
2. a test duration that is justified, not asserted;
3. operator instructions (an explicit task item);
4. a laptop-connected report;
5. an approximate cost with its assumptions visible;
6. honest limits.

### 2.2 What is the unit under test?

| Candidate | Description | Supported by attachments? |
|---|---|---|
| (a) Bare IGBT die/chip | Silicon only | No. Not a field-replaceable item. |
| (b) Single switch position "phase module" | One IGBT + antiparallel diode, ~25 kg, with its own gate driver | **Best fit.** Notes: "36 modules = 6 inverters × 3 phases × 2 switches" **[F]**; slide 5 "2×3 negative and positive phase modules per TM"; slide 8 diagram shows one IGBT+diode with one GD per switch. |
| (c) Phase *leg* (two switches) | Positive + negative module | Contradicted by the 36 = 6×3×2 count. |
| (d) Complete assembly | Module + gate driver + GDPS + laminated busbar + heatsink (slide 6 lists these as system components) | Plausible as a *test boundary choice*, not the replaceable unit. [U] |

**Working assumption [E]:** DUT = one switch-position phase module **with its attached gate driver**, tested off the locomotive. Slide-7 photos *appear* to show a driver housing with a 4-pin connector fixed to the module, a bus tab with two bolt holes, torque labels (14 ft-lb/19 N·m, 10 ft-lb/13.5 N·m), and supplier stickers reading HIPOT PASS / PD PASS / VIS PASS. I am reading photos; the connector function and sticker meaning are **[U]**.

**Needs confirmation:** is the heatsink part of the 25 kg? Is the driver always attached? What exactly are the electrical interfaces (power terminals, driver connector pinout, fibre protocol)?

### 2.3 Fact register (supplied specifications)

| ID | Statement | Source | Tag | Caveat |
|---|---|---|---|---|
| F1 | 36 IGBT modules per locomotive; 6 AC traction motors; 2×3 modules per motor | Slide 5, notes | [F] | |
| F2 | ≈55 lb (≈25 kg) per phase module | Slide 5 (from 84A215577 Fig. 2) | [F] | Weight of what boundary? [U] |
| F3 | Gate +15 V ON, −15 V OFF; fully on above roughly +4 to +7 V | Slides 5, 8, notes | [F] | Test current for the threshold [U] |
| F4 | Driver power "up to 20 W" | Slide 5 | [F] | Idle/switching split [U] |
| F5 | Max di/dt "0–5000 A/µs" | Slide 5 | [F] | Max permitted or typical range? Condition [U] |
| F6 | Free-wheeling diode 0.2–0.8 V, "reserves direction – open" | Slide 5 | [F] | Reads like a diode-check result (forward drop; reverse open). Current/method [U] |
| F7 | Fault protection: switch turns off 10 µs after a saturation fault | Slides 5, 8 | [F] | Maximum or nominal? Measured from what event? [U] |
| F8 | "Busbar insulation: leakage current up to 2 mA" | Slide 5 | [F] | Applies to busbar; test voltage and duration [U] |
| F9 | GDPC supplies each GD at "25 kHz, 100 Vrms"; TMC sends command and receives status over fibre; fuses in the DC+ path | Slide 8 diagram, slide 6 ("GDPS 100 VAC") | [F] | Fibre protocol [U] |
| F10 | Functionality can only be verified after installation today | Slide 9 | [F] | |
| F11 | Benchmark ≈3.5 min per IGBT with PASS / NO PASS, from IM-LE-0008 step 14 ("Reparo Light") | Slide 10 speaker notes | [F] | **Manual not supplied** |
| F12 | Four chip suppliers named in the same troubleshooting guide (Mitsubishi, Hitachi, ABB, Eupec) | Slide 5 notes | [F] | Implies limits may be **per part number / supplier** [E] |
| F13 | 600+ locomotives in the fleet ("around the country") | Transcript, slide 10 | [F] | Slide 3 says 23,000+ in the global installed base; do not mix them |
| F14 | Rated DC-link voltage, module current rating, blocking voltage, thermal data, acceptance limits | — | **[U]** | Not in any attachment |

### 2.4 The 3.5-minute benchmark

Two readings, and the notes cannot distinguish them:

- **H1 (more likely):** time for the existing *on-locomotive* PASS / NO PASS check after a replacement (step 14 of an instruction titled "Reparo Light"). This is the cost the bench tries to *avoid repeating*; it is not a bench-cycle target.
- **H2:** an existing bench or portable tester check. Then it is a baseline, but its scope (setup? discharge? report?) is **[U]**.

**Position:** do not claim to beat 3.5 min. Our estimated physical cycle (§4.3, corrected v1.1) is ≈4.7 min (280 s) for Tier 1 and ≈8.3 min (499.85 s) for the simulated Tier 1+2 run, dominated by mounting a 25 kg part, not by electrical dwell. Justify the cycle by *coverage per minute* and by the expected avoided cost of one failed installation (§6), not by speed. Ask Wabtec what the 3.5 min covers.

### 2.5 Ambiguities and missing information that change design

Interfaces (fibre protocol, driver connector, whether gate terminals are accessible), ratings and test voltages, which defects actually occur and escape current checks, whether shelf spares are new, repaired or both ("Reparo" hints at repaired parts, which would raise the defect rate and the bench's value), annual volumes, and the cost of a failed install. Prioritised in §8.

### 2.6 Attachment status

| Item | Status |
|---|---|
| `NU IEEE 2026 IGBT test cell_AK_Final.pptx` | Read: all 12 slides, 9 speaker notes, 8 key images |
| `transcript.md` | Read the Wabtec section only (auto-transcript, Russian/English mix; technical terms may be wrong) |
| `01_CASE_AND_REQUIREMENTS.md` | Read as a provisional draft |
| Google Drive folder | Top-level listing only: a "Presentations" subfolder and one 1 KB file. I did not open either; the deck was supplied locally, so nothing is missing |
| IM-LE-0008, 84A215577 | **Not available.** Titles appear in slide notes; I did not read them and nothing below claims to rest on them |
| IEC 60747-9, IEC 61287-1 full texts | Paywalled. Previews and summaries only |

---

## 3. Comparison of approaches

### 3.1 Options

| | **A. Screening bench** | **B. Tiered functional bench (recommended)** | **C. Full characterisation bench** |
|---|---|---|---|
| Idea | Low-energy electrical checks plus driver check plus insulation leakage | A, plus pulsed static, blocking leakage, double-pulse and desat response at derated or representative voltage, with the module's own driver | Power-device-analyser class static curves at rated V/I, rated-condition double-pulse, thermal (Rth), optionally PD |
| Equipment functions | Programmable LV supplies, GDPC emulator (25 kHz, 100 Vrms **[F]**), optical TMC emulator, DMM-class meters, leakage/hipot, DAQ | A + HV DC source, small DC-link with active discharge, load inductor, pulse generator, 4-ch scope with isolated/HV probes and low-inductance shunt, pulsed Kelvin on-state measurement, safety enclosure with hardwired chain | B at full rating + thermal chamber/heating, PD set-up (IEC 60270 style **[X]**), high-current source |
| Cost category (ROM, unquoted) | Low | Medium–high | Very high |
| Cycle (estimate, corrected v1.1) | ≈4.7 min | ≈8.3–9.2 min | 30+ min (thermal) |
| Complexity / safety | Low; mostly LV | Moderate; HV energy storage, needs real interlocked enclosure | High |
| Software-only demo suitability | High | High (same state machine, more stages) | Low value: demo would be mostly waveforms |

### 3.2 Defect coverage (generic failure modes; **[E]** hypotheses, not Wabtec data)

✔ detected with decent confidence · ◐ partial / indirect · ✘ not detected

| Failure mode | A | B | C |
|---|---|---|---|
| Shorted or open switch / diode (gross) | ✔ | ✔ | ✔ |
| Gate-oxide damage from ESD/handling | ◐ (via driver level behaviour) | ✔ | ✔ |
| Gate-driver power or logic fault | ✔ | ✔ | ✔ |
| Fibre command/status interface fault | ✔ | ✔ | ✔ |
| Desaturation/out-of-saturation protection not working or slow | ✘ | ◐–✔ (controlled-fault emulation, method to confirm) | ✔ |
| Insulation weakness (busbar/baseplate) | ✔ (leakage at specified V) | ✔ | ✔ + PD |
| Raised on-state drop (connection/bond degradation) | ✘ | ◐ (pulsed, ambient, derated current) | ✔ |
| Degraded blocking at rated voltage | ✘ | ◐ (only up to the chosen test voltage) | ✔ |
| Abnormal switching (slow edges, excess overshoot) | ✘ | ✔ (relative to a golden-unit baseline) | ✔ |
| Thermal interface / solder voids | ✘ | ✘ | ◐ (thermal-transient method) |
| Short-circuit withstand capability | ✘ | ✘ (deliberately not tested, destructive) | ◐ |
| Defects that appear only after load cycling | ✘ | ✘ | ✘ |

### 3.3 Recommendation and trade-offs

**Choose B**, built so Tier 1 can be bought and used on its own. Reasons: it is the smallest bench that exercises the module *as it will operate* (own driver, fibre command, real switching), it keeps energy and cost bounded, and it scales down (A) or up (C).

Trade-offs to state openly:

- Derated-voltage Tier 2 proves "switches on command, protects, and matches a golden unit at this voltage". It does **not** prove datasheet ratings. The test voltage fraction is **[U]**; Wabtec must set it.
- AN 20-003 recommends fixing quality at the supplier and doing functional test in a sub-assembly rather than incoming electrical testing **[X]**. Our counter-position: the bench's unique value is catching **transport/handling damage, repaired units, and dead-on-arrival driver/fibre function**, in the configuration it will run in. It is *not* a replacement for the manufacturer's production test, and we should say so.
- Quick screening vs. verification: **Tier 1 is a screen** (answers "is it grossly broken?"). **Tier 2 is verification under more representative conditions** (answers "does it switch and protect like a good one?"). Neither is qualification.

### 3.4 Why a software interface alone does not solve it

The laptop is the *reporting and sequencing* layer. The hard parts are the measurement chain (pulsed Kelvin sensing, isolated high-voltage probes, low-inductance current sensing, probe deskew **[X: Tektronix AN]**), the stored-energy hazard, and the driver/fibre interface. The proposal must therefore present equipment functions and a safety architecture, not just a GUI.

---

## 4. Proposed bench architecture and test matrix

### 4.1 Architecture (conceptual **[E]**)

```
 Laptop (sequencing, logging, report; NOT in safety chain)
   │ USB/Ethernet
 Bench controller (real-time I/O, watchdog heartbeat)
   ├─ Safety chain (hardwired relay/PLC): door, E-stop, ground-bond, fixture clamp, DC-link voltage monitor
   │     └─ enables HV contactor ── HV DC source (current-limited) ── DC-link (small C, bleeder + active discharge)
   ├─ GDPC emulator (25 kHz, 100 Vrms, current-monitored)       ─► module gate driver
   ├─ Optical TMC emulator (command TX / status RX)              ─► module fibre ports
   ├─ Pulse generator ─► drive of switching pulses via the module's driver
   └─ Measurement: pulsed Kelvin on-state, leakage/hipot, scope (isolated HV probe, shunt, isolated gate probe)
 Mechanical: lifting aid, locating fixture, HV-insulated clamps, ESD station
```

### 4.2 Safety architecture (conceptual; no physical work planned)

1. **Zone separation:** HV and stored energy only inside an interlocked enclosure; LV and operator controls outside.
2. **Hardwired safety chain independent of the laptop:** door, E-stop, ground-bond check, fixture engaged. Any open state forces the safe state. Commercial hipot enclosures with magnetic interlocks and integrated HV safety modules with precharge, active discharge, isolation monitoring and safety PLC exist as design references **[X: Vitrek/Bosch listings, search-level only]**.
3. **Stored-energy control:** smallest practical DC-link capacitance; passive bleeder plus active discharge; **independent** voltage verification that holds the door lock until below a safe threshold.
4. **Energy limiting:** current-limited source, protective fuses, millisecond pulses, escalate from low to high energy only if the previous stage passed.
5. **Default-off gating:** gate commanded to −15 V OFF **[F]** on any abort; HV source disabled; contactor opened; discharge; verify; unlock.
6. **Laptop watchdog:** loss of heartbeat triggers the safe state, so a software crash cannot leave HV live.
7. **People:** ESD handling, lifting aid for 25 kg, lockout/tagout for maintenance, trained operators.
8. **Governance:** a qualified HV engineer's risk assessment and applicable standards (e.g. IEC 61010-1 as candidate; **not verified by me**) before anything is built.

### 4.3 Test matrix

Limit-source classes: **WS** = Wabtec slide (case-stated, unverified against the manual) · **DEMO** = illustrative demo threshold · **UNK** = unknown, production limit must come from manufacturer/Wabtec.
Durations are **first-order estimates [E]** from dwell/handling assumptions, not measurements.

| ID | Parameter / behaviour | Failure mode addressed | Method and conditions | Equipment function | Limit source | Est. duration (basis) | Cannot establish |
|---|---|---|---|---|---|---|---|
| **T00** | Identification, visual, terminal condition, bench self-check | Wrong part, visible damage, bench not trustworthy | Read label/S/N; inspect terminals; reference-resistor and interlock-loop check | Barcode/scan, fixture sensor, self-check reference | n/a (procedural) | 120–180 s (mounting 25 kg part dominates) | Anything electrical |
| **T01** | Terminal integrity and freewheeling-diode check | Shorted/open switch or diode | Low-current forward/reverse between C and E (diode-check style, AN 20-003 §4.1 **[X]**) | Low-current source + meter | Fwd 0.2–0.8 V, reverse open (**WS**, F6); current **UNK** | ~10 s | Blocking capability at voltage; reverse recovery |
| **T02** | Gate-driver supply behaviour (idle and switching) | Driver supply or circuit fault | Apply emulated GDPC (25 kHz, 100 Vrms **[F]**), log idle current, then complementary gating, log switching current; no HV (method per AN 20-003 §5.2 **[X]**) | GDPC emulator with current/power monitor | ≤20 W ceiling (**WS**, F4); idle/switching bands **UNK**; DEMO bands in sim | ~20 s | Driver internals, timing |
| **T03** | Fibre command/status loop and gate levels | Dead fibre/status, wrong gate rails | Send ON/OFF over optical TX; read status RX; isolated probe on gate–emitter | Optical TMC emulator, isolated probe | ±15 V (**WS**, F3); tolerance and fibre protocol **UNK** | ~20 s | Anything the real TMC does differently (protocol unknown) |
| **T04** | Insulation leakage to baseplate/heatsink | Cracked insulation, contamination, handling damage | Specified DC test voltage and dwell between shorted power+gate terminals and baseplate | Hipot/leakage tester | ≤2 mA (**WS**, F8, busbar); voltage/time **UNK** | 60 s placeholder (dwell **UNK**) | Partial discharge (not included: needs shielded PD set-up) |
| **T05** | Pulsed on-state voltage V_CE(sat) at specified current, gate +15 V | Raised conduction drop: degraded connections/dies | Millisecond-scale pulse, Kelvin sense, ambient temperature | Pulsed current source, Kelvin measurement | **UNK**; DEMO in sim | ~30 s (setup, a few points, settling) | Hot behaviour; current sharing between paralleled dies |
| **T06** | Gate threshold | Gate-oxide/chip defect | Small collector current with V_CE = V_GE, **only if gate pins are accessible**; otherwise inferred from T03/T07 | Precision source, meter | ≈+4 to +7 V (**WS**, F3, approximate); test current **UNK** | ~20 s | n/a if driver blocks gate access |
| **T07** | Blocking leakage (I_CES-type) at the chosen test voltage, gate held OFF | Degraded blocking, contamination | Ramp V_CE to the profile voltage with driver holding −15 V; dwell; read leakage | HV source, nA–mA leakage measurement | **UNK**; DEMO in sim | 20–40 s | Blocking at rated voltage if test voltage is derated |
| **T08** | Double-pulse switching with the module's own driver | Slow or abnormal switching, excess overshoot, driver mismatch | Pulse 1 builds current in load inductor to target (t₁ = L·I/V), turn-off, short gap, pulse 2; measure delays, V_CE peak, di/dt, energies, diode recovery; compare with golden-unit baseline (Tektronix AN **[X]**) | DC-link, inductor, pulse generator, 4-ch scope, isolated/HV probes, shunt | di/dt ≤5000 A/µs (**WS**, F5, interpretation **UNK**); others **UNK** (golden unit/datasheet) | 60–120 s (charge, 2–3 current points, discharge) | Datasheet energies unless conditions match; hot switching; parasitic differences between bench and locomotive |
| **T09** | Out-of-saturation protection response | Protection missing or slow | Controlled, current-limited fault emulation (not a hard short); time from fault onset to gate OFF and status flag | Fault-emulation switch, scope, fibre status RX | ≤10 µs (**WS**, F7, max vs nominal **UNK**) | 30–60 s | Short-circuit withstand; behaviour in a real short. **Method must be confirmed with Wabtec** |
| **T10** | Safe-state, discharge verification, report | Residual stored energy; untraceable result | De-energise, discharge, verify below safe threshold, close log, export | Active discharge, independent voltmeter | Threshold set by bench risk assessment (**UNK**; 50 V is a DEMO placeholder) | 30–60 s (RC time, §5.2) | n/a |

**Cycle estimate [E] (corrected v1.1; component breakdown in 03 §7):** Tier 1 (T00–T04, T10, bus never charged) = **280 s ≈ 4.7 min**. Healthy simulated Tier 1+2 run = **499.85 s ≈ 8.3 min**; adding the diode-recovery test (placeholder 30 s) and an applicable gate-threshold test (20 s) gives ≈ 550 s. Mounting and connecting (150 s) is about 27–54% of these.

**Sequencing rule [E]:** low-energy first; each HV stage requires the previous stages to pass *and* all interlocks closed. This protects the bench and prevents applying energy to a shorted device.

---

## 5. Simulation scope and acceptance criteria

### 5.1 What to build and why

**Behavioural bench simulation + four equation-backed micro-models + explicit rule engine.**

| Option | Verdict |
|---|---|
| Pure behavioural (scenario → canned values) | Rejected: violates SW-06; indistinguishable from a slideshow |
| **Parameterised behavioural model**, readings computed from a module parameter set plus noise | **Core** |
| Micro-models (equations shown in UI) | **Include**: ~1–2 h total, high explanatory value |
| Simplified circuit/SPICE-like model | **Exclude**: no manufacturer model, no validation data, no time; would look more precise than it is |
| Calibrated physics/digital twin | **Exclude and do not claim** |

What a physics model would add: credibility of waveform *shape* and sensitivity trends. What it cannot add without calibration data: any confidence in absolute values. Not worth the time now; list as a validation-roadmap item.

### 5.2 Micro-models (all explicit, all labelled [I])

| Model | Equation | Used for |
|---|---|---|
| Conduction drop | V_CE(sat) = V₀ + r_ce·I | T05, shows a degraded connection (higher r_ce) crossing a limit |
| Load-inductor ramp | I = V·t/L, so t₁ = L·I/V | T08 pulse width, e.g. 600 V, 200 A, 300 µH → 100 µs (all **[I]**) |
| Stray-inductance overshoot | V_peak = V_dc + L_σ·di/dt | T08 overshoot, e.g. 100 nH × 1800 A/µs = 180 V **[I]** |
| DC-link discharge | V(t) = V₀·e^(−t/RC); t = RC·ln(V₀/V_safe) | T10 and abort: 1 mF × 10 kΩ, 600 V → 50 V in ≈25 s; stored energy ½CV² = 180 J **[I]** |
| Gate charge | RC rise to +15 V | T03 gate-waveform display (synthetic, labelled) |

### 5.3 Operator workflow (screens)

1. **Setup:** module ID/S/N, profile (Demo or Production), scenario (or Custom), operator.
2. **Pre-check:** interlock panel (door, E-stop, ground bond, fixture, DC-link < safe, watchdog) with a simple bench animation.
3. **Run:** ordered stage list with status, live reading and limit, event log, **two clocks** (animation time and estimated physical time, with basis tags).
4. **Result:** per-test table: reading, unit, conditions, limit, **limit source tag**, margin, verdict, reason string.
5. **Report:** HTML print-to-PDF and JSON export; persistent SIMULATION banner on every screen and export.

### 5.4 Scenarios (minimum five, plus Custom)

| ID | Scenario | Injected parameter change | Expected path |
|---|---|---|---|
| S0 | Healthy | nominal set + seeded noise | All tests pass → "PASS, demo profile, not an acceptance decision" |
| S1 | Shorted switch (C–E) | diode check reads ~0 V both ways | T01 FAIL → HV stages **BLOCKED** (not run) → overall FAIL |
| S2 | Elevated conduction drop | r_ce raised so V_CE(sat) exceeds demo limit | T05 FAIL; others pass; reason shows modelled cause as *hypothesis* |
| S3 | Slow/absent protection | desat trip delay 18 µs or never | T09 FAIL (safety-relevant); fibre status flag also checked |
| S4 | Interlock opens during HV stage | door-open event at T08 | Gate OFF → HV disabled → contactor open → discharge curve → verify → **ABORTED**; remaining stages INCOMPLETE; never PASS |
| S5 | Production profile selected, no limits | none | Every test **NOT EVALUATED**; overall cannot be PASS |
| Custom | Editable parameter table | any | Changing a value changes the verdict (evidence for SW-06) |

Optional (P2): driver fault (idle current low, status missing); high leakage; operator abort button.

### 5.5 Module parameter set and demo profile (illustrative **[I]** unless tagged WS)

| Quantity | Healthy value [I] | Demo limit | Source tag |
|---|---|---|---|
| Diode fwd drop | 0.35 V | 0.2–0.8 V | WS |
| Diode reverse | open | open | WS |
| Gate rails | +15.0 / −15.0 V | ±1 V window | rails WS, window DEMO |
| Driver power idle / switching | 6 W / 11 W | ≤20 W ceiling | ceiling WS, rest DEMO |
| Fibre status present | yes | yes | DEMO |
| Insulation leakage | 0.05 mA | ≤2 mA | WS (busbar), test V **UNK** |
| V_CE(sat) at 200 A pulse | 2.4 V (V₀ 1.0, r_ce 7 mΩ) | ≤3.2 V | DEMO |
| Blocking leakage at 600 V | 0.05 mA | ≤1 mA | DEMO |
| Gate threshold | 5.5 V | 4–7 V | WS (approx.) |
| di/dt | 1800 A/µs | ≤5000 A/µs | WS |
| V_CE peak at 600 V | 780 V | ≤1000 V | DEMO (fictional module) |
| Desat trip delay | 6.5 µs | ≤10 µs | WS |
| Discharge safe threshold | n/a | 50 V | DEMO |

The 600 V / 200 A / 1 mF / 300 µH / 100 nH test-bench values describe a **fictional demo module and bench**. They are not Wabtec ratings.

### 5.6 Decision logic

- Rule types: window, max, min, boolean presence, time-to-event. Every verdict stores reading, limit, source tag, margin and a human-readable reason.
- **Roll-up precedence:** ABORTED if an abort event occurred; else FAIL if any test failed; else INCOMPLETE if any required test did not run (including BLOCKED by a failed precondition after a FAIL → still FAIL); else NOT EVALUATED if any required limit is missing from the profile; else PASS (demo). A production profile with missing limits can never produce PASS.
- Optional P2: guard-band flag when a reading is within an assumed measurement uncertainty of a limit ("REVIEW").
- Failure explanations are labelled **hypotheses** ("consistent with a degraded internal connection"), never diagnoses.

### 5.7 Abort and interlock behaviour

Triggers: any interlock opens, E-stop, operator abort, watchdog loss, bench over-current. Sequence (each step logged with simulated time): gate OFF (−15 V) → HV source disabled → contactor opens → discharge with RC curve → independent verification below threshold → door lock released → run marked ABORTED → report generated. Abort during discharge verification never skips verification.

### 5.8 Report contents and export

- **HTML** (print to PDF) and **JSON**. Fields: run ID, module ID, scenario or "Custom" with parameter dump, profile ID/version and status (demo/production), software version, seed, operator, simulated timestamps, per-test rows (reading, unit, conditions, limit, limit-source tag, margin, verdict, reason), overall verdict and precedence reason, interlock/abort event log, two durations with basis tags, the limitations statement, and the SIMULATION banner.
- Failed, aborted and blocked runs export unchanged.

### 5.9 Keeping assumptions and limits visible

Persistent banner; limit-source tag chips on every number; profile badge ("DEMO, ILLUSTRATIVE, UNVALIDATED"); synthetic-waveform label on every plot; limitations panel and report footer stating that no physical module, measurement chain or industrial safety system was validated.

### 5.10 Acceptance criteria for the software (traceable to `01` SW-xx)

| ID | Check |
|---|---|
| AC-01 | Runs fully offline on a fresh team laptop (network disabled) |
| AC-02 | Same scenario + profile + seed gives identical JSON; changing the seed changes noise only |
| AC-03 | Editing one Custom parameter flips a verdict, with the reason string updated |
| AC-04 | S1 shows HV stages BLOCKED; S4 shows ABORTED with discharge log; neither ever shows PASS |
| AC-05 | S5 yields NOT EVALUATED on all tests and no PASS |
| AC-06 | HTML report and parsed JSON match on IDs, verdicts and tags |
| AC-07 | SIMULATION banner and limitations text present on every screen and export |
| AC-08 | Animation time and physical-estimate time shown separately with basis tags |
| AC-09 | Slide-derived values are tagged WS; no DEMO value appears without its tag |
| AC-10 | Said's claims audit of UI text, report text and pitch script finds no forbidden claim (§7.6) |

---

## 6. Equipment economics and assumptions

### 6.1 Three separate cost categories

| Category | Amount | Note |
|---|---|---|
| Hackathon cash spend | **0** | Existing laptops and AI subscriptions |
| Proposed industrial bench capital | ROM below | **No quotes obtained; replace with vendor quotes** |
| Deployment engineering, risk assessment, validation, training | Not in capital | Must be estimated separately and likely comparable to equipment cost for Tier 2 |

### 6.2 Equipment budget (ROM, **[E]**, unquoted, USD)

| Function | Tier 1 | Tier 2 add-on |
|---|---|---|
| Interlocked enclosure, safety relay/PLC, beacon, E-stop | 5–15k | included |
| Fixture, lifting aid, ESD station, connectors | 5–20k | — |
| GDPC emulator (25 kHz, 100 Vrms) + optical TMC emulator | 3–12k | — |
| LV supplies, meters, leakage/hipot tester, DAQ/controller | 8–20k | — |
| HV DC source, small DC-link with active discharge, voltage monitor | — | 15–50k |
| Load inductor + pulse generator | — | 3–15k |
| Scope (4-ch), isolated/HV probes, low-inductance shunt | — | 15–60k |
| Pulsed Kelvin on-state/blocking measurement unit | — | 20–100k |
| **Indicative total (corrected v1.1: sum of rows above)** | **~21–67k** | **~+53–225k (total ~74–292k)**, excluding the reference module (cost unknown) |
| Annual calibration/service (assumption) | 8–12% of capital | same |

Reference only: a power-device-analyser class instrument (Keysight B1506A: 3 kV / 1500 A class, datasheet **[X]**) represents approach C. I did not find public pricing; treat C as "very high".

### 6.3 Savings and payback model (all inputs adjustable, none supplied by Wabtec)

Annual net benefit = N · p · s · C_avoid − (annualised capital + O&M + test labour) − N · f · C_false

| Symbol | Meaning | Source |
|---|---|---|
| N | modules tested per year | **Need from Wabtec** |
| p | incoming defect fraction (would fail after install) | **Need from Wabtec** |
| s | bench detection sensitivity for those defects | Unknown; must be measured in validation. **Do not assert.** |
| C_avoid | avoided cost per caught defect: install + removal labour, locomotive downtime, troubleshooting hours (avoid double counting) | **Need from Wabtec** |
| f, C_false | false-reject rate, cost per false reject (retest, supplier return, delay) | Unknown |

Break-even (ignoring false rejects): **p\* = (annual capital + O&M) / (N · s · C_avoid)**. Payback is meaningful only if net benefit is positive.

**Worked illustration, all numbers placeholders [I]:** N = 200 modules/yr, s = 0.7, C_avoid = $2,000, 7-year straight-line capital, O&M 10%.

| Configuration | Capital | Annual cost | Break-even p\* |
|---|---|---|---|
| Tier 1 only | $35k | 5.0k + 3.5k = 8.5k | 3.0% |
| Tier 1+2 | $200k | 28.6k + 20k = 48.6k | 17.4% |

**Two separate views (added v1.1).** *Annualised analysis* (above) asks whether yearly benefit covers capital spread over its life plus O&M. *Simple cash payback* asks how many years of net cash benefit repay the up-front capital: **payback = capital / (N·p·s·C_avoid − O&M − test labour − N·f·C_false)**, defined only if the denominator is positive. Illustration at a placeholder p = 5% (test labour and false rejects set to 0 here): gross benefit 200 × 0.05 × 0.7 × $2,000 = $14.0k/yr.

| Configuration | Cash net/yr (14.0k − O&M) | Simple payback | Annualised net/yr (14.0k − annual cost) |
|---|---|---|---|
| Tier 1 only | 14.0k − 3.5k = 10.5k | 35k / 10.5k ≈ 3.3 yr | +5.5k |
| Tier 1+2 | 14.0k − 20k = −6.0k | none (never repays) | −34.6k |

What this shows: at low module volume a heavy bench is hard to justify, which supports a Tier-1-first rollout (or one shared regional bench) and moving to Tier 2 only if Wabtec's own failure data justify it. It also shows the case could come out *negative*; we should say that rather than hide it.

---

## 7. Execution plan and Markdown handoff structure

### 7.1 Minimum viable scope

Must (P0): single-page local app, ordered stage engine, parameter-driven readings, rule engine with source tags, five scenarios + Custom, interlock/abort/discharge sequence, dual clocks, HTML + JSON report, banners and limitations.
Should (P1): micro-model displays (pulse width, discharge curve), seeded noise.
Could (P2): guard-band REVIEW, extra scenarios, nicer waveforms.

### 7.2 Exclude

SPICE/physics modelling, hardware or serial I/O, accounts, database, cloud, live AI, ML anomaly detection, batch/fleet integration, calibrated waveforms, 3D physics animation, anything that implies measured data.

### 7.3 Division of work and dependencies

| Owner | Deliverable | Needs |
|---|---|---|
| Said | This decision set; handoff files 02–05; **test instructions**, bench architecture figure spec, cost model sheet, validation roadmap, claims audit | — |
| Nurkhan | App, engine, report, offline check, evidence for AC-01..09 | 02–05 (stub parameters can start before 03 is final) |
| Darkhan | Bench diagram, slides, demo visuals, fallback video capture | Architecture figure spec from Said; stable build from Nurkhan |
| Ramazan | Narrative and script | Allowed-claims list and numbers from Said |

### 7.4 Timeline (local UTC+05:00)

| Time | Milestone |
|---|---|
| 17 Oct 13:15 | **Handoff A** to Nurkhan: architecture, state machine, schema, UI screens (file 02, 05) |
| 14:30 | **Handoff B**: test matrix, parameter set, scenarios, rules (file 03) |
| 15:30 | M1: healthy run end-to-end + JSON |
| 16:00 | Darkhan has architecture figure spec; Ramazan has claims list and outline |
| 17:30 | M2: five scenarios, abort/discharge, report |
| 18:30 | M3: Custom parameters, micro-model displays, banners, offline check |
| 19:00 | Said: written proposal and cost sheet complete; claims audit of build |
| **20:00** | **FEATURE FREEZE** (fixes and clarity only) |
| 20:00–21:30 | Record fallback video; export sample reports; backup package |
| 21:30–22:30 | Timed pitch run-through; consistency review |
| 23:00–07:00 | **Sleep** (no dependency on overnight work) |
| 18 Oct 08:00–09:30 | Final rehearsal, offline re-test on the presentation laptop |
| 10:00 | Package ready, one-hour buffer |
| 11:00 | Deadline |

### 7.5 Verification and fallback

- Nurkhan returns evidence for AC-01..AC-09; Said performs AC-10 and a second pair of eyes runs S0, S1, S4 cold.
- **Fallback:** screen recording of S0, S1, S4 and one Custom edit; pre-generated sample HTML/PDF/JSON reports; static screenshots in the deck; the app as a single offline folder. If the live demo fails, switch to the video without commentary on "tech trouble".
- Submission package guess (format **[U]**): proposal PDF, app folder, demo video, sample reports.

### 7.6 Allowed and forbidden claims (for Ramazan and Darkhan)

Allowed: "virtual prototype demonstrating the proposed test sequence, fault handling, decision logic and reporting with simulated data"; "tiered bench: screening plus verification under more representative conditions"; "limits shown are illustrative unless tagged as case-stated".
Forbidden: tested a Wabtec module; certified or safe; detects all or X% of failures; validated bench or digital twin; faster than 3.5 min; any saving or payback figure presented as a result.

### 7.7 Handoff file structure (Said → Nurkhan)

| File | Contents |
|---|---|
| `01_CASE_AND_REQUIREMENTS.md` (v0.2) | Update with: freeze 20:00, unit-of-test assumption, evidence tags, precondition gating, claims rules |
| `02_SYSTEM_DESIGN.md` | Architecture, run state machine, interlock list, abort sequence, UI screens, stack suggestion (single offline HTML/JS or small local app; Nurkhan's call) |
| `03_TEST_AND_ACCEPTANCE.md` | §4.3 matrix as a machine-readable table, rule definitions, roll-up precedence, scenarios, AC-01..10 |
| `04_BUILD_PLAN.md` | §7 milestones, priorities, freeze, fallback |
| `05_DATA_AND_REPORT_SCHEMA.md` | Module parameter set, profile file format (limit, unit, source tag, status), JSON report schema, HTML report layout, banner/limitation texts |

---

## 8. Highest-priority questions for Wabtec

Ask through an official channel; record the answer, source and time.

1. Is a software-only virtual prototype plus a physical bench proposal acceptable? What are the judging criteria, pitch length and submission format?
2. What is the exact unit under test and boundary: switch-position module with attached driver? Heatsink included? What do the power terminals, driver connector and fibre interface look like (pinout, protocol)?
3. What does the 3.5-minute PASS / NO PASS in IM-LE-0008 step 14 cover, and where is it performed (on locomotive or bench; with what equipment)?
4. Rated DC-link voltage, module current and blocking ratings, and approved test voltages and dwell times for insulation and functional checks. Can we have approved excerpts or datasheets?
5. Which failures occur most often after installation, and which escape today's checks? Are shelf spares new, repaired ("Reparo"), or both?
6. Is the desaturation response of ≈10 µs a maximum or nominal, and is a non-destructive method for checking it acceptable to Wabtec?
7. Annual modules to be tested, labour and downtime cost of a failed installation, and the budget range Wabtec expects?
8. Are there site constraints (voltage permitted in the workshop, enclosure and operator requirements)?

---

## 9. Sources and unresolved technical claims

### 9.1 Sources actually read

| Source | Used for | Link |
|---|---|---|
| Wabtec case deck (local file), slides, notes, images | All **[F]** facts | `Downloads/Telegram Desktop/NU IEEE 2026 IGBT test cell_AK_Final.pptx` |
| Semikron Danfoss AN 20-003, *Field Testing of Power Semiconductor Modules* (2024-10-07), read in full | Incoming-inspection caution (§1.2), diode check (§4.1), gate handling (§4.2), driver supply-current method (§5.2), warning on ohmmeter/DMM limits | https://assets.danfoss.com/documents/latest/444231/AB501643313479en-000201.pdf |
| Tektronix, *Double Pulse Test with AFG31000* application note | DPT purpose, pulse structure, measured parameters, probe/isolation/parasitic-inductance cautions, safety interlock note | https://www.tek.com/en/documents/application-note/double-pulse-test-tektronix-afg31000-arbitrary-function-generator |
| Keysight PD1500A help, IEC 60747-9 parameter extraction | Example of how E_off thresholds are defined | https://helpfiles.keysight.com/sp/PD1000A/Content/PD1500A%20DPT%20Tests/Parameter%20Extraction/IEC60747-9.htm |

### 9.2 Search-level only (snippets; underlying document not read in full)

| Source | Claim it supports | Link |
|---|---|---|
| IEC 60747-9:2019 preview pages | Standard exists and covers IGBT terminology, ratings, methods of measurement | https://www.vde-verlag.de/iec-normen/preview-pdf/info_iec60747-9{ed3.0}b.pdf · https://webstore.iec.ch/p-preview/info_iec60747-9%7Bed2.0%7Db.pdf |
| Infineon module datasheets | Typical conditions: V_CE(sat) at specified I_C with V_GE = 15 V, V_GE(th) at small I_C with V_CE = V_GE, I_CES with V_GE = 0 | https://www.infineon.com/assets/row/public/documents/60/49/infineon-fd300r12ke3-ds-en.pdf |
| Keysight B1506A datasheet | Approach C reference (3 kV / 1500 A class, static parameters, datasheet mode) | https://www.keysight.com/gb/en/assets/7018-04399/data-sheets/5991-4441.pdf |
| IEC/EN 61287-1:2014 listings | Onboard rail power-converter test standard; EN edition references IEC 60270 (PD) | https://www.evs.ee/en/evs-en-61287-1-2014 |
| Broadcom desaturation application note | Desat trip threshold ~7 V typical, blanking-time trade-off | https://docs.broadcom.com/doc/AV02-0258EN |
| Infineon EVAL-DCLINK-DPT article (Wevolver) | Typical DPT arrangement | https://www.wevolver.com/article/double-pulse-testing-for-power-semiconductor-devices-with-infineons-eval-dclink-dpt-evaluation-board |
| Bosch HVSB datasheet; Vitrek SE-series enclosure | Examples of HV safety module and interlocked enclosures | https://www.bosch-engineering.com/media/downloads/220128_data-sheet_hvsb_en.pdf · https://www.testequity.com/product/20021853-SE-4836-10X |
| Dynex static tester note | Static test parameter list (my fetch returned 404; snippet only) | https://www.dynexsemi.com/assets/downloads/DYN-PA-19002-V1_-_Power_Semiconductor_Static_Testers.pdf |

### 9.3 Not obtained / unresolved

| Item | Status |
|---|---|
| IM-LE-0008 and GE guide 84A215577 | Not supplied; web search found no public copy. **Not read.** |
| All Wabtec acceptance limits, ratings and test voltages | **[U]**; every non-WS number in this report is [I] or [E] |
| IEC 60747-9 and IEC 61287-1 clause-level test conditions | Paywalled; not read |
| Whether slide-5 values are maxima, nominals or diode-check readings | Interpretation only |
| Whether a non-destructive desat check is feasible on this driver | Engineering proposal, unverified |
| Equipment prices | ROM estimates by us; no quotes; B1506A price not public |
| Vitrek/Bosch/Broadcom/Infineon pages | Used as design references only; not read beyond search results |
| IEC 61010-1 applicability to the bench | Candidate only; not verified |
| Drive folder contents | Top-level listing only; subfolder and 1 KB file not opened |
