# 04 — Build Plan, Milestones and Fallback

Version 0.3 · 17 Oct 2026 · Owner: Said · Implementer: Nurkhan
Supersedes v0.2. Companion files: `02_SYSTEM_DESIGN.md`, `03_TEST_AND_ACCEPTANCE.md`, `05_DATA_AND_REPORT_SCHEMA.md`.
Times are local (UTC+05:00). Deadline **18 Oct 2026, 11:00**. If the build started late, shift milestone times, but the **freeze (20:00) and sleep (23:00–07:00) do not move** without Said's decision; cut scope instead (§4). The freeze and sleep times are Said's proposal pending team agreement.

---

## 1. Scope

| Priority | Items |
|---|---|
| **P0 (must)** | Delivery Method A (or a tested Method B) per 02 §3; CONFIG_PREFLIGHT with domain validation and the configuration block; stage engine with the 03 §5 prerequisites; explicit bus model; single safe-state procedure with FAULT_LOCKED; computed readings with **σ = 0**; rule engine with provenance chips; scenarios S0, S1, S2, S3, S4, S5, S8 + Custom (module parameters); dual clocks; HTML + JSON report; banner and limitations; deterministic `deterministic` section |
| **P1 (should)** | Seeded noise (σ = 0.01) with `selfcheck.html` running N1–N3; S8b; equation display with substituted values; bus-voltage gauge; synthetic waveform for T08a (labelled) |
| **P2 (could)** | S3b, S6, S7, S9, S10; speed selector; deterministic hash in footer; single-file bundle |
| **Excluded** | 02 §12 (incl. T08b waveforms) |

## 2. Division of work and dependencies

| Owner | Deliverable | Depends on |
|---|---|---|
| **Said** | 01 v0.2 update (pending); written proposal (architecture, connection configurations from 03 §3, DPT circuit 03 §4, safety architecture, test instructions, cycle-time justification from 03 §7, cost and payback model, limitations, validation roadmap); figure specs; claims list; claims audit (AC-10); organiser/Wabtec questions | Report + 02–05 |
| **Nurkhan** | App and evidence for 03 §13 | 02, 03, 05 |
| **Darkhan** | Bench diagram (incl. reference module in the DPT circuit), slides, demo visuals, fallback video | Said's figure spec (16:00); stable build (M3) |
| **Ramazan** | Narrative, script, delivery | Said's claims list and figures (16:00) |

Critical path: validation + engine → prerequisites and bus/safe-state → report → freeze.

## 3. Milestones

| Time | Milestone | Definition of done |
|---|---|---|
| 17 Oct, on receipt | **Handoff** | Nurkhan has 02, 03, 05 v0.3; confirms delivery method and presentation-laptop browser |
| **+1 h** | Skeleton | `index.html` opens from a copied folder via `file://` with data loaded from `data.js`; validation screen works on one bad input |
| **15:30** | **M1** | S0 end-to-end: all stages, readings from parameters, verdicts with chips, safe-state procedure, JSON export parses |
| 16:00 | Inputs to Darkhan and Ramazan | Figure specs; claims list; selected figures (499.85 s, 280 s, corrected cost ranges) |
| **17:30** | **M2** | S1, S2, S3, S4, S5, S8 match 03 §12; HTML report |
| **18:30** | **M3** | Custom mode (AC-03); AC-14 validation set; AC-01 on a second laptop with the packaged artefact |
| 19:00 | Said's review | AC-09, AC-10; proposal text and cost sheet complete |
| **20:00** | **FEATURE FREEZE** | Tag the build; backup; after this only defect fixes and wording, each approved by Said |
| 20:00–21:30 | Fallback pack (§6) | |
| 21:30–22:30 | Timed pitch run-through; consistency review | Pitch, slides, report and app agree on every figure and label |
| **23:00–07:00** | Sleep | No dependency on overnight work |
| 18 Oct 08:00–09:30 | Final rehearsal; AC-01 repeated on the presentation laptop with the final package | |
| **10:00** | Submission package ready | One-hour buffer |
| 11:00 | Deadline | |

Check-ins (5 min) at M1, M2, M3 and freeze: works / discrepancies vs 03 §12 / defects / deviations / questions.

## 4. If time slips: cut order

1. P2 items.
2. P1 noise and `selfcheck.html` noise sweeps (keep σ = 0).
3. Waveform and gauge (keep numbers and event log).
4. S8b.
5. Report styling (keep structure and content).

**Never cut:** configuration block (S5), prerequisites (S1), single safe-state procedure with abort (S4) and FAULT_LOCKED (S8), domain validation, provenance chips and `NOT APPROVED`, banner and limitations, JSON export, computed readings, AC-01 on the packaged artefact.

## 5. Risks

| Risk | Mitigation |
|---|---|
| Launch fails on the presentation laptop | Method A avoids `fetch`/modules; AC-01 on the packaged artefact, twice (M3 and 08:00) |
| Organisers expect hardware | Lead with the engineering proposal; ask organisers today; validation roadmap |
| Scenario-name logic creeps in | AC-03, AC-11; Said scans `engine.js` for verdicts keyed on scenario IDs |
| Figures drift between files | Single sources: 05 (data/rules), 03 §7 and §12 (timings, outcomes), report correction note (costs). Change one → update all and log in 03 §15 |
| Thresholds quietly adjusted | Forbidden without approval (02 §10, 03 §11) |
| Overclaiming | 03 §14 audit; chips in UI |
| Fatigue | Freeze 20:00; sleep protected |

## 6. Fallback pack (20:00–21:30)

- Recordings (each < 90 s): S0, S1, S4, S5, S8, and one Custom edit flipping T05.
- Sample reports (HTML, PDF, JSON) for S0, S1, S4, S5, S8.
- Screenshots of Setup, Validation error, Config blocked, Run, Result, FAULT_LOCKED, Report.
- The packaged artefact (zip) on the presentation laptop, a USB drive and cloud storage.
- Rule: if the live demo fails once, switch to the recording.

## 7. Verification procedure

1. Nurkhan runs 03 §13 and returns evidence.
2. Said runs S0, S1, S4, S5, S8 cold from the zip on a different laptop, offline.
3. Said diffs two `deterministic` sections (AC-02) and reviews the rule table against 05 §3.3 (AC-09).
4. Said runs the claims audit (AC-10) on app, report, slides and script.
5. Ramazan's timed run uses only figures from the pack.
6. Record the frozen build's folder timestamp or hash; the submitted zip must match it.

## 8. Change control

Free: layout, styling, code structure, extra non-misleading UI.
Needs Said's agreement and a 03 §15 entry: rules, limits, bases, references, prerequisites, verdict logic, bus/safe-state behaviour, scenario outcomes, timing components, banner/limitations text, cost/performance claims.
After 20:00: defect fixes and wording only; each change re-runs AC-02, AC-04, AC-05, AC-07, AC-12, AC-13.

## 9. Submission checklist (10:00, 18 Oct)

- [ ] Written engineering proposal (PDF): unit and boundary, architecture, connection configurations, DPT circuit with reference module, safety architecture, test matrix and instructions, cycle-time justification, cost (corrected ranges) and payback model, limitations, validation roadmap, questions for Wabtec
- [ ] Packaged app, AC-01 passed on the presentation laptop
- [ ] Recordings and sample reports
- [ ] Slides consistent with app and proposal
- [ ] No forbidden claims; every rule shown as illustrative and not approved
- [ ] Format and channel confirmed against organiser instructions (currently unknown)
- [ ] Backups in two places

## 10. Open decisions (not blocking the start)

| # | Decision | Default if no answer |
|---|---|---|
| D1 | Delivery method (Nurkhan) and presentation-laptop browser | Method A, Chrome or Edge |
| D2 | New illustrative bench values: `charge_current_a` 0.1 A, `discharge_timeout_s` 120 s, `verify_delay_s` 2 s, Q18 limit −10 V | Use defaults |
| D3 | T08b stays `NOT_MODELLED` | Yes |
| D4 | Team agreement on 20:00 freeze and 23:00–07:00 sleep | As planned |
