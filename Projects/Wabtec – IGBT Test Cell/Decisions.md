---
title: Wabtec – Decisions
tags:
  - decisions
  - wabtec
---

# Decisions: Wabtec

Back to [[Projects/Wabtec – IGBT Test Cell/Brief|Brief]] · [[00 Index]]

| Date | Decision | Why | Status |
| --- | --- | --- | --- |
| 2026-10-17 | Rank this case **#2 of 3** | Clear, concrete task, but it needs real power-electronics skills; an econ member could own the cost estimate and the time-saved business case | Proposed, team to confirm |
| 2026-10-17 | Promote to #1 if the team has 2+ strong EE students | A working test-cell design is hard for other teams to copy | Conditional |
| 2026-10-17 | **Chosen** as the team's case | Team decision | Confirmed |
| 2026-10-17 | Deliver the app as Method A (offline folder, classic scripts) | 02 §3 default; works from `file://` with no install | Default, D1 browser still open |
| 2026-10-17 | Every non-info rule gets `required: true` | 05 §3.3 has no `required` column | Pending Said |
| 2026-10-17 | Claude Code does everything (plan, build, review, notes); director/builder relay dropped | Fewer hand-offs under time pressure | Confirmed |
| 2026-10-17 | One git repo at the vault root; the app's own repo folded in with its history (c874602 kept) | Notes, specs and app versioned together; graphify can see the code | Confirmed (Nurkhan) |
| 2026-10-17 | App look follows `DESIGN.md`: NVIDIA style, Arial, offline, status colours always with text | Engineering-grade look for technical judges | Confirmed (Nurkhan) |
| 2026-10-17 | IL3 (ground-bond) shows OK at Pre-check and is not tied to `bench_selfcheck_ok` | Tying it would turn a T00 self-check failure into ABORTED; 03 §12 wants S10 to end INCOMPLETE | Pending Said |
| 2026-10-17 | Stored readings rounded to 4 dp, stored seconds and volts to 2 dp, before judging and serialising | Removes float noise (2.4000000000000004); keeps N3's 11.000 mΩ exactly on the 3.2 V limit (PASS). No limit or value changed | Superseded by TICKET 03b (full precision) |
| 2026-10-17 | Abort followed by an unverified safe state: `abort_reason` = the trigger, label = "safe state not verified; enclosure kept locked" | 05 §7 allows one abort reason; the locked enclosure is the stronger message. Only reachable by aborting S8 by hand | Pending Said |
| 2026-10-17 | Failed discharge: `discharge_time_s` = null, T10 COMPUTED part = `discharge_timeout_s` | The bus never reached v_safe; 03 §7 and §12 (S8 595 s) count the timeout | Pending Said |
| 2026-10-17 | Engine (σ = 0) reproduces every 03 §12 row, S0 through S10; no discrepancy to report | Checked with `node dev/run-node.js` per scenario; S1–S8 are formally TICKET 03 | Info |
| 2026-10-17 | TICKET 03: S0, S1, S2, S3, S4, S5, S8 match every 03 §12 cell (AC-11 table from `node dev/selfcheck-node.js`, 133/133 checks) | Engine unchanged since TICKET 02; no discrepancy to report | Info |
| 2026-10-17 | Private GitHub repo `nurkhangarifolla/nu-ieee-hackathon-2026` for the whole vault; push `main` after each ticket | Said needs the project files for motion design; private because it holds sponsor case material | Confirmed (Nurkhan) |
| 2026-10-17 | TICKET 03b: readings, margins and the safe-state decisions (discharge required, verification) are judged and stored at full precision; only binary float noise beyond 12 significant digits is removed; display rounds and shows full precision when rounding would hide a FAIL (3.20004 V > max 3.20 V) | Independent review: 4 dp rounding let r_ce_mohm = 11.0002 (Q09 = 3.20004 V), diode_fwd_v = 0.19999 and desat_trip_us = 10.00001 PASS. No limit changed; every 03 §12 outcome unchanged; JSON `v_bus_at_verification_v` now 40.9365… (shown 40.94) | Pending Said |
| 2026-10-17 | TICKET 03b: a profile must carry exactly one rule for each modelled quantity (data.js `modelled_quantities`: stage, rule type, unit, required) and no other rules | Independent review: removing Q09 or `rules: []` gave an overall PASS. Now a validation error, no run | Pending Said |
| 2026-10-17 | TICKET 03b: if `verify_delay_s` exceeds the T10 DWELL (20 s), T10 gets an extra COMPUTED component for the wait | Independent review: with verify_delay_s = 30 the run ended at 509.85 s but reported 499.85 s. Defaults unchanged (2 s sits inside the dwell) | Pending Said |
| 2026-10-17 | TICKET 04: AC-03 (Custom r_ce_mohm 7 → 12 flips T05 to FAIL), AC-14 (all cases INVALID through preflight, with messages) and AC-15 (i_pulse_a / v_dc_test_v follow through text, equations and values) pass; 198/198 checks in node and in headless Chrome from the v0.4.0 zip | No rule, limit, value or outcome changed; AC-11 still matches every cell; v0.3.1 → v0.4.0 deterministic sections identical. AC-15 was P0 and unassigned, so it was added to this ticket | Info |
| 2026-10-17 | AC-01 on a second laptop is still open: Nurkhan runs the v0.4.0 zip offline (checklist in `igbt-test-cell/NOTES-FOR-NURKHAN.md`) | 03 §13 needs a second laptop and a named laptop, OS and browser; the headless proxy on this Mac passed | Open (Nurkhan) |
| 2026-10-17 | TICKET 05: seeded noise (P1) built per 02 §10: σ = 0.01 multiplicative Gaussian, Q14 2σ, truncated at ±3σ by redrawing; sub-seed FNV-1a("seed:quantity_id") → mulberry32 → Box–Muller. Setup has Noise Off (default) / On | 04 §1 P1. N1 1000/1000 PASS; N2 1000/1000 Q09 FAIL (lowest 3.3061 V); N3 crossings 10.554–11.454 mΩ, inside 10.534–11.495. No limit, σ or outcome changed. Noise off: v0.4.0 output byte-identical | Info (Said may prefer clamping to redrawing; N1–N3 hold either way) |
| 2026-10-17 | TICKET 05: S8b enabled (P1). Matches 03 §12: all module stages PASS, discharge 24.85 s, VERIFICATION_UNAVAILABLE, LOCKED, FAULT_LOCKED, ABORTED (SAFE_STATE_NOT_VERIFIED), 499.85 s | AC-17; engine unchanged since TICKET 03b | Info |
| 2026-10-17 | S8b JSON still reports `v_bus_at_verification_v` = 40.94 V (the modelled bus from the 03 §6 formula), although the meter could not verify it | 03 §6 gives the formula with no meter condition; 03 §12 is silent for S8b. Alternative: `null` when `verify_meter_ok` = false | Pending Said |
