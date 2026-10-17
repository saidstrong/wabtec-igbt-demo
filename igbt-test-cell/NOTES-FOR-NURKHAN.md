# Notes for Nurkhan

## Needs your decision
- **`required` flag on rules.** 05 §3.3 has no `required` column. I set `required: true` for every non-info rule and `false` for Q16 (info). This matches 03 §12. Logged in `Decisions.md` as Pending Said.
- **Presentation-laptop browser (D1).** Default Chrome or Edge. Tell me if it's Safari or Firefox; I'll test there.
- **TICKETS 02–03 in your own browser (3 min).** I tested `file://` in headless Chrome with the network off (screenshots in `../design/screenshots/t02-*` and `t03-*`). The app's built-in browser pane can't run it: the folder name ends in a space, so the pane shows a static copy without scripts. Please double-click `index.html` once with Wi-Fi off: run S0 and press Abort during T08a; then run S8 → VIEW RESULT → VIEW REPORT → Print / Save PDF and check every PDF page has the yellow banner and the black footer. Check the console is clean.
- **Abort and then a failed discharge (TICKET 02, Pending Said).** If a run is aborted *and* the safe state is then not verified, `abort_reason` keeps the trigger (e.g. `OPERATOR`) and the label is the "safe state not verified; enclosure kept locked" one. 05 §7 allows one reason only. Only reachable by aborting S8 by hand.

- **AC-01 on a second laptop (TICKET 04, M3 18:30, about 10 min).** Use the newest package: `dist/igbt-test-cell-v0.5.0.zip` (TICKET 05; replaces v0.4.0). SHA-256 `47fd8613249e08eb0efd54d0174de98c1d587d4f609cfd8b80551a1c2c9f1306`. Copy it to another laptop (USB or cloud). Then:
  1. Turn Wi-Fi off. Unzip anywhere and double-click `igbt-test-cell/index.html` (Chrome or Edge).
  2. Check the yellow banner and `v0.5.0` in the footer.
  3. Run S0 at 16×: CONTINUE → START → VIEW RESULT (overall PASS, 499.85 s). Download JSON.
  4. VIEW REPORT → Download HTML → Print / Save PDF. Check the yellow banner and black footer on every PDF page.
  5. Open `selfcheck.html`: it should say `Total: 222 / 222 PASS` (takes a second or two: it runs 1000-seed noise sweeps).
  6. Press F12 → Console: no red errors.
  7. Record a screen clip, plus the laptop model, OS and browser with version (03 §13 asks for these). Tell me, and I'll log it.
  Repeat on the presentation laptop on 18 Oct 08:00 (04 §3).

## Decisions I made
- **Scenario overrides shape.** Every scenario carries `overrides: { module, bench }`, `events: []` and `force_profile: null` even when empty, so the engine reads one shape. CUSTOM has `custom: true`; its overrides come from the Setup table.
- **Custom table sends only changed values** as module overrides. Text that isn't a number goes through as text so the validation screen shows it (e.g. `abc`). An empty `desat_trip_us` means `null` (never trips).
- **Module ID on Setup** overrides `module_parameters.module_id`. `module_note` is fixed text and read-only.
- **Profile forced by S5.** Picking S5 locks the profile selector to `production_unconfigured`. Picking that profile by hand with any scenario also blocks (same rule, 05 §3).
- **Preflight order.** Validation runs first; a profile block is only reported when every input is valid (02 §4: invalid data never produce a verdict).
- **Production profile** uses the same bench conditions as demo and the same rules with every limit `null`.
- **run_id counter** lives in `sessionStorage` (falls back to memory), so IDs stay unique across reloads in one browser session.
- **Extra data fields** (allowed by 05 header): `module_parameter_units`, `bench_parameter_units`, `built_priorities`, `speeds`, `seed_default`, `verdict_labels`, `fixed_texts` (banner, limitations, chip legend, Screen 1b text, FAULT_LOCKED banner, clock caption, report footer).
- **P1/P2 scenarios** are listed but disabled with "not built yet".
- **Design pass (01b).** Look follows `../DESIGN.md` (NVIDIA style; the project box at its top wins). Arial only (offline). Added a workflow strip (Setup → Report, display only), a black footer with the 05 report-footer text and version, a native `<dialog>` for Limitations (Escape closes), focus moves to each screen's heading, and the 1a message now says how to fix the inputs. Form borders use `mute` instead of `hairline` for contrast. No behaviour, value or fixed text changed.
- **Git.** The repo is now the vault root; this folder's TICKET 01 commit is kept in that history. `dev/` (TICKET 02) stays out of the zip.

### TICKET 02 (engine, sequencer, safe state, S0 + JSON)
- **IL3 (ground-bond) shows OK at Pre-check and is not tied to `bench_selfcheck_ok`.** If it were, a self-check failure would open IL3 and end ABORTED, but 03 §12 wants S10 to end INCOMPLETE. Pending Said in `Decisions.md`.
- **Number hygiene.** Superseded by TICKET 03b (see below): values are judged at full precision; only event and stage times run on a 10 ms clock (2 dp).
- **Display precision** per quantity (`display_decimals` in `data.js`) is read off the 03 §12 key values (Q01 0.35, Q06 15.0, Q12 1800, …). Display only; stored values keep 4 dp.
- **Reason text** follows the 03 §8 templates with the full rule label. The 05 §6 example uses a shorter label and adds "at I = 200 A pulse"; I kept 03 §8. PASS reasons mirror the FAIL template ("≤ max", "within"). Chips are also added to `time_max` reasons. Readings not run say "`<label>`: not measured (stage `<status>`)".
- **Extra fields** (allowed by the 05 header): `reading.conditions`, `stage.status_note`, `stage.model_equation` (T07 bus charge; T10 t_safe and E), `deterministic.hypotheses` (a list kept apart from verdicts). Stage `conditions` = the stage's reading conditions joined with "; ".
- **Safe-state timing.** SS1–SS6 events share the moment the procedure starts; verification is at t_safe + `verify_delay_s` (or `discharge_timeout_s` on failure). T10 = COMPUTED discharge + DWELL 20 s, so the 2 s verification sits inside the 20 s. On a failed discharge `discharge_time_s` is `null` (the bus never reached v_safe) and the COMPUTED part is the 120 s timeout.
- **An abort in T00 still runs the safe-state procedure** (02 §5: every abort enters it). T10 is skipped only after a T00 self-check failure (03 §5); that run ends in state `ENDED` with the door unlocked and no discharge events (nothing was energised).
- **Demo controls.** Heartbeat loss opens IL6 with abort cause `WATCHDOG`; Open door opens IL1 (`IL1_OPEN`). A control pressed during the safe-state procedure logs a WARNING and is ignored. Pre-check has toggles for IL1, IL2 and IL6 so you can show START being disabled.
- **Gate command/measured** on the bench panel is set per stage for display only (not in the JSON).
- **Run timer**: ticks every 100 ms and advances `speed × real dt`, with a cap of 0.5 s real time per tick (a hidden tab slows the run instead of jumping). Every boundary is processed at its exact planned time, so the browser run gives the same deterministic section as `node dev/run-node.js` (checked).
- **Run → Result** needs a click on VIEW RESULT, so the final event log stays readable. In FAULT_LOCKED, New run is disabled; the red banner's "Reset simulation" is the only exit and logs a WARNING event (05 §5 has no RESET event type).
- **`case_references` in the JSON** = references cited by this run's readings, plus REF-09 when it appears in conditions text. The CONFIG_BLOCKED JSON has a single `CONFIG_BLOCKED` event.
- **Noise.** `rng.n` returns x unchanged for σ = 0 and never touches a PRNG. σ > 0 (P1) throws "not built"; nothing in the UI can set it.
- **Result table** puts each reason on its own line under the reading, so the table fits without sideways scrolling.

### TICKET 03 (S1–S8 checks, HTML report, Report screen)
- **One copy of the checks.** The 03 §12 expected table lives only in `selfcheck.html`. `node dev/selfcheck-node.js` reads that same `<script id="checks">` block and also prints the AC-11 actual-vs-expected table. Where 03 §12 says only "T10 DONE" (S1, S4, S8), the check asks for status DONE; Q18 is checked under key values.
- **S8 "timeout 120 s"** is checked as DISCHARGE_FAILED exactly 120 s after DISCHARGE_START, with the bus still at 600 V at verification.
- **Shared display text.** Value, rule, margin and chip text moved from `ui.js` into `report.js` (`IGBT.report.text`). The Result screen and the HTML report use the same helpers, so they can't disagree (AC-06).
- **HTML report layout.** 05 §10 order. A4 landscape. Banner and footer repeat on every printed page (fixed elements plus repeating table header/footer spacers; checked: every page of the S0, S1, S4, S5, S8 PDFs). The footer also carries the banner text and run ID. Each stage gets its own row (status, blocked reason) above its readings; each reading has a second line with conditions, reason and model equation. Hypotheses appear only in section 5. S8 shows the FAULT_LOCKED text in red under Overall and in the safe-state block.
- **"Overrides" in the report inputs** = values that differ from the data-file defaults, plus the scenario's events and forced profile (read from `data.js` by scenario ID, display only, never used for a verdict).
- **No deterministic hash in the footer.** It's P2 in 04 §1 (05 §6.2 only suggests it). Easy to add later if Said wants it for AC-02.
- **Screen 5 Report.** Preview in an iframe. Print / Save PDF prints the preview only; if the frame can't be reached it opens the report in a new tab with a note. New run is disabled in FAULT_LOCKED, as on Result. VIEW REPORT is now the Result screen's main button; 1b has View report too.
- **1b report** is built once when 1b opens, so its JSON and HTML downloads share the same `created_local`.

### TICKET 03b (independent-review fixes)
- **Full precision.** Readings, margins and the safe-state decisions are judged and stored at full precision. Only binary floating-point noise beyond 12 significant digits is removed, so 1 + 0.007 × 200 is 2.4, not 2.4000000000000004, while 3.20004 V stays 3.20004 V and FAILs max 3.2 V. Margins use the same idea relative to their operands (−0.00004, not −0.0000399999999998). The screens and the HTML report round for display, but show full precision when rounding would make a value read like the limit it fails ("3.20004 V > max 3.20 V", margin "−0.00004 V").
- **What changed in the outputs.** Only `v_bus_at_verification_v` in the JSON: 40.9365376539 instead of 40.94 (still shown as 40.94). Every reading, verdict, event and total is byte-identical to TICKET 03 for S0–S5 and S8. The 03 §12 checks compare voltages at display precision, as 03 §12 states them.
- **Complete rule sets.** `data.js` lists the 17 modelled quantities (`modelled_quantities`: stage, rule type, unit, required). Validation rejects a profile that misses one, moves one to another stage, changes its type, unit or required flag, or adds a rule for anything else. A selfcheck confirms that the engine computes exactly this list, stage by stage.
- **T10 timing.** If `verify_delay_s` is longer than the 20 s closing DWELL, T10 gets an extra COMPUTED component "verification wait beyond the closing DWELL", so T10's components, RUN_END and `physical_total_s` agree (509.85 s at 30 s).
- **Version 0.3.1** (metadata and footer only), so this package can be told apart from the TICKET 03 build.
- All three are logged as Pending Said in `Decisions.md`.

### TICKET 04 (Custom flip, AC-14 messages, AC-15, v0.4.0 package)
- **Custom already worked** (TICKET 01 table, TICKET 02 engine). This slice adds proof: 24 new checks (198 in total). Custom r_ce_mohm 7 → 12 flips T05 to FAIL with the reason, equation, margin and hypothesis updated. Custom r_ce 12 and S2 give byte-identical stages, overall, safe state, events and total, so nothing keys on the scenario ID.
- **Result screen shows "Overrides:"** (inputs that differ from the data-file defaults). It uses the same helper as the HTML report's Overrides row, so the AC-03 before/after screenshots show what changed. Layout only; no rule or value touched.
- **AC-14 end to end.** All eight cases (ten checks; both `v_safe_v` = and > `v_dc_test_v`, and both window min = and > max) now go through `configPreflight` → INVALID with no run. Bench cases go in as Custom bench overrides (05 §2.2, same validation). Rule cases are a temporary edit of the in-memory data file, restored afterwards. `node dev/selfcheck-node.js` prints the messages table.
- **AC-15 added here.** It's P0 and no ticket covered it. Setting `i_pulse_a` 300 A and `v_dc_test_v` 700 V in the in-memory data file updates conditions, equations and values. Q09 = 3.10 V, Q16 = 128.57 µs, Q13 = 880 V, t_charge 7 s, v0 700 V, t_safe 26.39 s, E 245 J, total 501.39 s, and no "200 A" or "600 V" is left in the JSON or HTML. The expected numbers are worked out by hand from 02 §8. Checks only; no app change.
- **Version 0.4.0** (metadata and footer only). Every deterministic section (S0–S5, S8) is byte-identical to v0.3.1, and the HTML reports differ only in the version string.
- **AC-01 proxy** on this Mac: unzipped v0.4.0 into a folder with a space in its name, then ran headless Chrome 155 offline over `file://`. Custom 7/12 and S0 went Setup → Report, with JSON + HTML downloads and a 9-page PDF. selfcheck showed 198/198, with no console errors and no network requests. This doesn't replace the second-laptop run (see "Needs your decision").

### TICKET 05 (P1: seeded noise, S8b, noise toggle)
- **Seeded noise built (02 §10 SUGGEST).** `rng.js`: value = x · (1 + σ·z). The sub-seed is the FNV-1a 32-bit hash of `"<seed>:<quantity_id>"`, fed to mulberry32 and then Box–Muller. z is truncated at ±3 by drawing again (not by clamping). Each reading starts a fresh generator, so a value depends only on σ, seed and quantity, never on call order. Q14 uses 2σ (±6%), as 03 §6 says.
- **Setup "Noise" select.** Off (σ = 0) is the default; On sets bench `noise_rel_sigma` = 0.01 (`data.js noise_on_sigma`). It shows up in "Overrides" and in run meta. With noise on, the Result screen and the HTML report add a line saying the 03 §12 values assume σ = 0. A non-boolean `setup.noise` is a validation error. A Custom bench override above 0.05 is rejected (05 §2.1).
- **Noise off changes nothing.** Every deterministic section and HTML report (S0–S5, S8, S8b, Custom 7/12) is byte-identical to v0.4.0, apart from the version string. The PRNG is never called.
- **N1–N3 (AC-16) pass.** N1: S0 PASS for 1000/1000 seeds. N2: S2 Q09 FAIL for 1000/1000 seeds; the lowest is 3.3061 V (the bound is 3.298 V). N3: each seed's crossing lies between 10.554 and 11.454 mΩ, inside 10.534–11.495, and the engine confirms it on both sides. 10.00–10.53 mΩ PASS and 11.50–12.00 mΩ FAIL for every seed. At 11.00 mΩ, 475 seeds PASS and 525 FAIL.
- **Q09 equation with noise:** "… = 2.40 V; with seeded noise × 1.0129 ≈ 2.431 V". The "≈" is there because the factor is shown to 4 dp. The V_peak equation shows di/dt to 4 dp (a noisy di/dt has many digits). Display only.
- **Bench panel gate value** now uses the same sub-seed as its reading (Q06 ON, Q07 OFF, Q18 at SS3), so it matches the reading with noise on. Display only; it was "gate".
- **S8b enabled** (`built_priorities` P0 + P1). The engine already matched 03 §12, so this adds the AC-17 checks: the §12 row, AC-02, AC-12, the HTML checks, and the event order VERIFICATION_UNAVAILABLE → FAULT_LOCKED with no DOOR_UNLOCKED. 03 §12 gives no v0 or SS8 bus figure for S8b. The check uses 600 V and 40.94 V from 03 §6 (Pending Said: see Decisions.md).
- **Version 0.5.0.** Selfcheck 222/222 in node and in headless Chrome from the unzipped zip. Screenshots are `design/screenshots/t05-*`. The noise-on S0 and S8b JSON downloaded in Chrome are byte-identical to node runs.
- **Next P1 slice (TICKET 06, not written):** bus-voltage gauge and a labelled synthetic T08a waveform.
