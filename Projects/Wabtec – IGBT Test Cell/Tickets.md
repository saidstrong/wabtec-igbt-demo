---
title: Wabtec – Builder tickets
tags:
  - wabtec
  - tickets
---

# Builder tickets: Wabtec

Back to [[Projects/Wabtec – IGBT Test Cell/Brief|Brief]] · [[00 Index]] · Specs: `Specs/02`–`05`

| Ticket | Goal | Milestone | Status |
| --- | --- | --- | --- |
| BRIEF | Builder standing brief | – | Superseded by `CLAUDE.md` (Claude Code does everything) |
| 01 | Offline skeleton, all data, validation + config preflight | Skeleton (+1 h) | **Done** (commit c874602; selfcheck 28/28; AC-01 on a second laptop still to do) |
| 01b | Design pass: `DESIGN.md` (NVIDIA style) applied to banner, header, Setup, 1a, 1b | – | **Done** (selfcheck 28/28; screenshots in `design/screenshots/`) |
| 02 | Engine, sequencer, safe-state, S0 end-to-end + JSON | M1 15:30 | **Done** (S0 matches 03 §12; AC-02 diff empty; AC-12 in headless Chrome over `file://`, offline; selfcheck 59/59; Nurkhan's own-browser check still to do) |
| 03 | S1, S2, S3, S4, S5, S8 match 03 §12 + HTML report + Report screen | M2 17:30 | **Done** (every §12 cell matches, AC-11 table; selfcheck 133/133 in node and headless Chrome; AC-02 diffs empty; PDFs carry banner and footer on every page; Nurkhan's own-browser check still to do) |
| 03b | Independent-review fixes: judge at full precision, complete rule sets, T10 timing with a long verify delay | M2 17:30 | **Done** (v0.3.1; all three probes fixed; selfcheck 174/174 in node and headless Chrome from the unzipped package; AC-11 unchanged; three Pending Said entries) |
| 04 | Custom (AC-03), AC-14 messages, AC-15, AC-01 package + checklist | M3 18:30 | **Done** (v0.4.0; selfcheck 198/198 in node and headless Chrome from the unzipped zip; AC-03 screenshots; AC-14 messages table; AC-15 checks; AC-11 unchanged; AC-01 on a second laptop still to do by Nurkhan) |
| 05 | P1: seeded noise with N1–N3 (AC-16), S8b (AC-17), noise on/off on Setup | Before freeze 20:00 | **Done** (v0.5.0; selfcheck 222/222 in node and headless Chrome from the unzipped zip; N1 1000/1000, N2 1000/1000, N3 inside bounds; S8b matches 03 §12; noise off byte-identical to v0.4.0; one Pending Said) |

## Builder standing brief

```
BUILDER STANDING BRIEF (read once, applies to every ticket)

You are the builder for a hackathon app: a virtual IGBT test cell (Wabtec case).
Specs (source of truth, do not edit): /Users/nurhangarifolla/Hackathon /Projects/Wabtec – IGBT Test Cell/Specs/
  02_SYSTEM_DESIGN.md, 03_TEST_AND_ACCEPTANCE.md, 04_BUILD_PLAN.md, 05_DATA_AND_REPORT_SCHEMA.md
  (IGBT_Test_Cell_Analysis_Report.md is background; 02–05 win where they differ.)
Note: the folder "Hackathon " has a TRAILING SPACE. Always quote paths.
App repo: /Users/nurhangarifolla/Hackathon /igbt-test-cell/

1. Build exactly what the ticket says. No extra scope.
2. Never invent values. Every number, rule, limit and fixed text comes from 03/05. A missing value is a visible placeholder, listed in your report.
3. Never change a threshold, sigma, expected outcome or fixed text to make something pass. If the engine disagrees with 03 §12, report it.
4. Invariants in every build: SIMULATION banner on every screen and export; NOT APPROVED chip on every judged reading; no verdict keyed on a scenario ID; offline only (no fetch, no ES modules, no CDN, no network, classic <script src> only).
5. No media tools. A missing asset is a blocker, not something to substitute.
6. Decisions you make on your own go in igbt-test-cell/NOTES-FOR-NURKHAN.md under "Needs your decision" and "Decisions I made".
7. Commit after each ticket with the ticket ID. Do not push anywhere.

Report format:
TICKET <ID> — DONE / PARTIAL
CHANGED: files
MET / NOT MET: each Done-when line
PLACEHOLDERS: gaps left
NOTES: decisions for the director
```

## TICKET 01

Run this in Claude Code from `/Users/nurhangarifolla/Hackathon /`.

```
TICKET 01: Offline skeleton with all data, domain validation and configuration preflight

Context: First slice of Delivery Method A (02 §3). Data + validation + preflight only; no engine yet.
Specs: "/Users/nurhangarifolla/Hackathon /Projects/Wabtec – IGBT Test Cell/Specs/" (02 §3, §4, §11; 05 §1–§4, §9, §11).
Repo: "/Users/nurhangarifolla/Hackathon /igbt-test-cell/" (create it, git init).

Hard rules
- Classic <script src> only. No fetch(), no type="module", no http(s) URLs, no CDN.
- Copy every value and fixed text verbatim from 05. Do not edit the Specs folder.
- Do not build the engine, sequencer, report or run screens this round (stub files only).

1. Create the folder tree exactly as 02 §3 Method A, plus NOTES-FOR-NURKHAN.md. Script load order in index.html and selfcheck.html: data.js, validate.js, rng.js, models.js, engine.js, sequencer.js, report.js, ui.js. Stubs attach an empty namespace to window.IGBT.
2. js/data.js: one global window.APP_DATA with: case_references (05 §1.1, all 9), module_defaults (05 §2), profiles = [demo (05 §3, bench_conditions §2.1, all rules §3.3), production_unconfigured (same rules, all limits null, badge "PRODUCTION — NO APPROVED LIMITS CONFIGURED")], scenarios (05 §4, all 14 incl. CUSTOM, with priority), fixed texts (banner, limitations, chip legend, verdict labels: 05 §8–§9).
   - Rule field `required`: 05 §3.3 has no column for it. Set true for every non-info rule, false for Q16. Log this in NOTES under "Needs your decision".
3. js/validate.js: pure functions, no DOM.
   - validateModule, validateBench: type + domain per 05 §2/§2.1, null only for desat_trip_us; derived checks 05 §2.3 (v_safe_v < v_dc_test_v; discharge_timeout_s > R·C·ln(v_dc_test_v/v_safe_v) with R in Ω from kΩ and C in F from mF).
   - validateRule/validateProfile: 05 §3.1–§3.2; approval_status must be NOT_APPROVED (reject APPROVED); profile_status production_approved rejected; demo rule missing a limit = error; info rule with a limit = error; window min >= max = error; CASE_*/INVENTED_TOLERANCE need a reference_id that exists; INVENTED needs null.
   - validateOverrides: 05 §2.2, unknown keys rejected.
   - validateSetup: speed in {1,4,8,16}; operator non-empty; seed integer.
   - Every error = { field, value, rule } in plain words.
   - configPreflight(setup) → { status: "INVALID", errors } | { status: "CONFIG_BLOCKED", block_reason: "CONFIGURATION_PREFLIGHT" } | { status: "OK", resolved inputs }. S5 uses force_profile.
4. js/ui.js: SIMULATION banner (fixed, all screens), profile badge, Limitations link (05 §9 text, always reachable).
   - Screen 1 Setup (02 §11): module ID, profile, scenario (all 14; mark P1/P2 as "not built yet" and disabled), seed (default 20261018), speed (default 8), operator, generated run_id RUN-YYYYMMDD-NNNN. Custom shows the module-parameter table with units, editable.
   - CONTINUE runs configPreflight → Screen 1a (each error: field, value, rule; START disabled) or Screen 1b (text from 02 §11, overall NOT EVALUATED) or a placeholder "Pre-check: next ticket".
5. selfcheck.html: runs validation cases in the browser and prints each with PASS/FAIL and a total. Cases: defaults valid; every AC-14 case rejected (r_ce_mohm = −1, dclink_c_mf = 0, v_safe_v ≥ v_dc_test_v, speed = 0, window min ≥ max, info rule with a limit, demo rule missing a limit, unknown override key); approval_status APPROVED rejected; production_approved rejected; S5 → CONFIG_BLOCKED; every P0 scenario's overrides valid.
6. README.txt: one-paragraph launch line (unzip, double-click index.html, Chrome or Edge).

Done when:
- Folder copied to a new location opens via file:// with Wi-Fi off; banner and Setup visible; no console errors.
- Custom with r_ce_mohm = −1 shows Screen 1a listing field, value, rule.
- S5 shows Screen 1b with NOT EVALUATED.
- selfcheck.html shows all cases PASS (give the count).
- grep -rnE 'fetch\(|type="module"|https?://' igbt-test-cell returns nothing.
Commit "TICKET 01: skeleton, data, validation, preflight". Report in the standing format, with the selfcheck output pasted.
```

## TICKET 02

Run this in Claude Code from `/Users/nurhangarifolla/Hackathon /`. Since 17 Oct the git repo is the vault root; the app lives in `igbt-test-cell/`.

```
TICKET 02: Engine, sequencer, safe-state procedure, S0 end to end + JSON export (M1, 15:30)

Context: Second slice (04 §3 M1). Readings computed from parameters, rule engine with chips,
prerequisites, explicit bus model, the single safe-state procedure, Pre-check / Run / Result
screens and JSON export. σ = 0 only. HTML report and the S1–S8 checks are TICKET 03; Custom
flip (AC-03) is TICKET 04.
Specs: 02 §4–§9, §11; 03 §5–§10, §12 (S0 row); 05 §5–§8, §11. Look and feel: DESIGN.md (vault root).
App: "/Users/nurhangarifolla/Hackathon /igbt-test-cell/".

Hard rules
- Everything from TICKET 01 still holds (classic <script src>, offline, values verbatim, no spec edits).
- engine.js, models.js and sequencer.js contain no scenario ID (S0–S10, CUSTOM), not even in
  comments. Scenario effects arrive only as overrides and scenario_events from configPreflight.
- σ = 0: rng.js returns x unchanged and never consults the PRNG (02 §10).
- If S0 does not match 03 §12, stop and log it in Decisions.md as "Pending Said". Never change a
  value, limit or expected outcome to make it match.

1. data.js: add, verbatim from the specs:
   - stages in the 02 §6 order (T00, T01, T02, T03, T06, T04, T05, T07, T08a, T08b, T09, T10),
     each with name (03 §1 "Test" column) and class (02 §6).
   - physical_components per stage (03 §7: basis, seconds, note). The COMPUTED parts of T07
     and T10 are filled in by the engine.
   - conditions templates (03 §6), hypotheses (03 §10, incl. "Safe state not verified"),
     interlocks IL1–IL7 with their demo control (02 §5).
2. models.js (pure): the 02 §8 micro-models (V_CE(sat), t1, V_peak, t_charge, t_safe, E) and a
   model_equation string built from the actual values, e.g.
   "V_CE(sat) = 1.00 V + 0.007 Ω × 200 A = 2.40 V". Never hard-code 600 V or 200 A.
3. engine.js (pure, no DOM):
   - Readings per 03 §6, incl. the dependency rule (driver_idle_w < 1.0 → gate readings 0 V;
     gate_turns_off_ok = false → gate stays at gate_on_v after OFF).
   - evaluateRule per 03 §8: verdict PASS / FAIL / INFO / NOT RUN; reason templates with chips
     "ILLUSTRATIVE · <basis>, NOT APPROVED" (+ "Case ref REF-xx"); margin = signed distance to the
     nearest numeric limit, positive inside, null when value or limit is missing;
     reference_text from case_references.
   - Stage PASS = every required reading PASS. Prerequisites per 03 §5: BLOCKED with a reason
     naming the failed stages; T06 NOT_APPLICABLE when gate_accessible = false; T08b always
     NOT_MODELLED and out of the roll-up.
   - Roll-up per 03 §9, in that order, with precedence_reason and verdict_label (05 §8).
     is_acceptance_decision is always false. Hypotheses per 03 §10, kept separate from verdicts.
   - Number hygiene: round stored reading values to 4 dp, and stored seconds and volts to 2 dp,
     before judging and serialising (removes float noise like 2.4000000000000004; keeps N3's
     11.000 mΩ exactly on the 3.2 V limit). Log this in NOTES under "Decisions I made".
4. sequencer.js (pure state machine on a physical clock; no DOM, no timers):
   - States per 02 §4. All interlocks OK to START. IL3 shows OK at Pre-check and is not tied to
     bench_selfcheck_ok (S10 must end INCOMPLETE, not ABORTED, 03 §12). Log in NOTES.
   - Explicit bench state 02 §7.1 (v_bus_v, source_enabled, contactor_closed, door_locked,
     gate_cmd, gate_meas_v). Bus: linear ramp from T07 start, hold through T09, exponential decay
     only inside the safe-state procedure; v_bus_v stays 0 V before T07.
   - advance(dt_physical) moves the run; abort(cause) with OPERATOR, IL1_OPEN…IL7_OPEN or
     WATCHDOG; scenario_events fire at {at_stage, at_progress}. On abort the running stage becomes
     INTERRUPTED (its elapsed fraction counts), later stages NOT_RUN (NOT_APPLICABLE and
     NOT_MODELLED keep their status).
   - One safe-state procedure, SS1–SS9 (02 §7.2), entered on completion or abort, exactly once
     per run. Triggers during it are logged as WARNING and ignored. Verification at
     t_safe + verify_delay_s after DISCHARGE_START (or at discharge_timeout_s on failure), also at
     0 V. Verified → DOOR_UNLOCKED → SAFE; otherwise FAULT_LOCKED (door stays locked; a logged
     "Reset simulation" is the only exit). T10's stage record is this procedure's record.
   - Events per 05 §5: seq, stage, type, physical_time_s (cumulative from RUN_START),
     animation_time_s = physical / speed, detail.
   - runToEnd() for node and selfcheck uses the same code path as the UI.
5. report.js: buildJson(run) in the 05 §6 shape: metadata; deterministic {inputs, overall, stages
   with readings and physical components, safe_state, events without animation_time_s,
   physical_total_s}; presentation; case_references used in this run; limitations text. Also the
   CONFIG_BLOCKED shape (05 §6 notes). Fixed key order. Download via Blob as report_<run_id>.json.
6. ui.js + index.html, styled per DESIGN.md:
   - Screen 2 Pre-check: IL1–IL7 lamps (text + colour, never colour alone); START enabled only
     when all are OK.
   - Screen 3 Run: stage list (status + class); active reading card (value, unit, rule, basis
     chip, reference chip, NOT APPROVED chip, margin); equation with values; bench panel (v_bus_v,
     source, contactor, door, gate command vs measured); event log with both clocks; the two
     clocks and the caption; demo controls Abort / Open door / Heartbeat loss. A timer calls
     advance(speed × real dt).
   - Screen 4 Result: overall verdict, label, precedence reason; per-reading table with chips;
     hypotheses box ("not diagnoses"); safe-state summary; clocks; Download JSON.
   - FAULT_LOCKED red banner (fixed text) with "Reset simulation". 1b's Export button now
     downloads the CONFIG_BLOCKED JSON.
7. dev/run-node.js (not loaded by index.html; leave dev/ out of the zip): loads data.js,
   validate.js, rng.js, models.js, engine.js, sequencer.js, report.js with a window shim, runs one
   scenario to the end and prints the deterministic section.
   Usage: node dev/run-node.js S0 > s0.json
8. selfcheck.html: add S0 engine checks (every S0 key value, stage statuses, safe-state block,
   499.85 s physical, 62.48 s animation at speed 8, exactly one DISCHARGE_START).

Done when:
- node dev/run-node.js S0 matches every S0 cell of 03 §12: all stages DONE PASS, T06
  NOT_APPLICABLE, T08b NOT_MODELLED; Q01 0.35 V · Q02 true · Q03/Q03b 6.0 W · Q04 11.0 W ·
  Q05 true · Q06 15.0 V · Q07 −15.0 V · Q08 0.05 mA · Q09 2.40 V · Q11 0.05 mA · Q16 100 µs ·
  Q12 1800 A/µs · Q13 780 V · Q14 6.5 µs · Q18 −15.0 V; v0 600 V, discharge 24.85 s, verified
  40.94 V, SAFE; overall PASS with the 05 §8 label; physical_total_s 499.85; animation 62.48 s at
  speed 8.
- AC-02: two node runs of S0 give byte-identical deterministic sections (empty diff).
- AC-12, in the browser: S0 with a manual Abort during T08a gives exactly one DISCHARGE_START;
  more Abort clicks only add WARNING events; the door unlocks only after DISCHARGE_VERIFIED.
- Browser, file://, Wi-Fi off: Setup → Pre-check → Run → Result for S0 with no console errors;
  every judged reading shows basis, reference (if any) and NOT APPROVED; Q08 shows
  CASE_TRANSFERRED; the banner is on every screen.
- The downloaded report_<run_id>.json parses and has "simulation": true and the banner text.
- grep -nE '\bS[0-9]+b?\b|CUSTOM' igbt-test-cell/js/engine.js igbt-test-cell/js/models.js
  igbt-test-cell/js/sequencer.js returns nothing; grep -rnE 'fetch\(|type="module"|https?://'
  igbt-test-cell returns nothing.
- selfcheck.html: all cases PASS (give the count).
Commit "TICKET 02: engine, sequencer, safe state, S0 + JSON". Report in the standing format,
with the S0 actual-vs-expected table.
```

## TICKET 03

Run this in Claude Code from `/Users/nurhangarifolla/Hackathon /`. The app lives in `igbt-test-cell/`.

```
TICKET 03: S1, S2, S3, S4, S5, S8 match 03 §12 + HTML report + Report screen (M2, 17:30)

Context: Third slice (04 §3 M2). The σ = 0 engine already gives every 03 §12 row in node
(Decisions.md, "Info"). This slice proves it with checks that run in node and in the browser,
adds the 05 §10 HTML report and Screen 5 Report (02 §11). Custom flip (AC-03), the AC-14 set
and AC-01 on a second laptop are TICKET 04.
Specs: 03 §12; 03 §13 AC-02, AC-04, AC-05, AC-06, AC-07, AC-08, AC-11, AC-13; 05 §6, §8, §10,
§11; 02 §2 (C4–C7), §11 (Screen 5). Look and feel: DESIGN.md.

Hard rules
- Everything from TICKETS 01–02 still holds (classic <script src>, offline, values verbatim,
  no spec edits, no scenario ID in engine.js / models.js / sequencer.js).
- Expected outcomes live only in the checks (selfcheck.html), never on the app's code path.
- If any scenario disagrees with 03 §12, stop and log it in Decisions.md as "Pending Said".
  Never change a value, limit or expected outcome to make it match.

1. selfcheck.html: an expected table copied from 03 §12 for S0, S1, S2, S3, S4, S5, S8
   (stage outcomes, key values, safe state, overall + abort/block reason, physical total).
   One case per scenario per column. Also:
   - AC-04: S1 BLOCKED stages carry reasons; S1 has no BUS_CHARGE_START / DISCHARGE_START.
     S4 has the full SS1–SS9 event sequence in order. Neither is PASS.
   - AC-05: S5 has no stage executed, no bus events, NOT EVALUATED + block_reason; its label
     differs from the INCOMPLETE label.
   - AC-13: S8 door LOCKED, final FAULT_LOCKED, no DOOR_UNLOCKED, overall ABORTED, report builds.
   - AC-02 per scenario (two runs, byte-identical deterministic sections).
2. dev/selfcheck-node.js: runs the same checks in node (reads the <script id="checks"> block
   from selfcheck.html, so there is one copy) and prints the total plus the AC-11
   actual-vs-expected table in Markdown.
3. report.js:
   - Shared text helpers (value, rule, margin, chips) used by both the UI and the HTML report,
     so the two never disagree (AC-06).
   - buildHtml(report): one self-contained HTML string in the 05 §10 order (sections 1–11),
     inline CSS, no <script>, no URL. Banner and footer repeat on every printed page.
     FAULT_LOCKED in red. Every chip carries text. All text escaped. Reading rows carry
     data-q and data-verdict for the AC-06 check. Works for the CONFIG_BLOCKED report too.
   - downloadHtml(report) → report_<run_id>.html (Blob, as JSON).
4. dev/run-node.js: --html prints the HTML report.
5. ui.js + index.html, styled per DESIGN.md: Screen 5 Report = preview (iframe srcdoc),
   Print / Save PDF (prints the preview), Download JSON, Download HTML, Back to result,
   New run (disabled in FAULT_LOCKED). Result gets VIEW REPORT. 1b gets View report.
6. selfcheck.html: HTML checks: banner, footer, limitations, chip legend; every JSON reading
   has an HTML row with the same ID, value text, verdict and chips (AC-06); every event row
   shows both clocks with animation = physical / speed (AC-08); no URL and no <script>.

Done when:
- node dev/selfcheck-node.js: all cases PASS (give the count) and the AC-11 table matches
  every cell for S0, S1, S2, S3, S4, S5, S8.
- AC-02: two node runs of each of those scenarios give byte-identical deterministic sections.
- HTML reports for S0, S1, S4, S5, S8 print to PDF in headless Chrome with the banner and
  footer on every page; S8 shows FAULT_LOCKED in red.
- Browser, file://, offline (headless Chrome): S1 and S8 go Setup → Pre-check → Run → Result
  → Report; Download JSON and Download HTML both write files; the preview's print is
  reachable; 1b → View report works for S5; no console errors.
- selfcheck.html in the browser gives the same count as node.
- Both greps from TICKET 02 return nothing.
Commit "TICKET 03: S1–S8 checks, HTML report, Report screen". Report in the standing format,
with the AC-11 table.
```

## TICKET 03b

Run this in Claude Code from `/Users/nurhangarifolla/Hackathon /`. Source: an independent review of
TICKET 03 (all 133 checks passed; three extra probes found defects).

```
TICKET 03b: Independent-review fixes (no new features)

Hard rules: as TICKETS 01–03. Preserve every threshold and every 03 §12 outcome. Each fix
changes verdict or timing logic, so log each in Decisions.md as "Pending Said".

1. engine.js: judge readings at full precision; round for display only. Only binary
   floating-point noise is removed (12 significant digits: 2.4000000000000004 → 2.4).
   The same goes for the safe-state decisions (discharge required, verification).
   r_ce_mohm = 11.0002 (Q09 = 3.20004 V), diode_fwd_v = 0.19999, desat_trip_us = 10.00001
   must each FAIL. When display rounding would make a value read like the limit it fails,
   show it at full precision (3.20004 V > max 3.20 V).
2. validate.js: a profile must carry exactly one rule for each modelled quantity (03 §6),
   on its stage, with its rule type, unit and required flag; no other rules. The list of
   modelled quantities goes in data.js. Missing Q09 or rules: [] → validation error, no run.
3. sequencer.js: when verify_delay_s is longer than the T10 DWELL, add a COMPUTED component
   for the extra wait, so T10's components, the final event time and physical_total_s agree.

Done when:
- Regression checks in selfcheck.html for each probe (incl. the stage-to-quantity mapping
  in engine.js matching the data.js list, and RUN_END time = physical_total_s = sum of stage
  estimates over a sweep of verify_delay_s and abort times) all PASS.
- The existing suite still passes in node and in headless Chrome; the AC-11 table still
  matches every cell; AC-02 diffs empty; both greps empty.
- Packaged zip (no dev/) rebuilt and handed over with the results.
Commit "TICKET 03b: review fixes (full-precision verdicts, complete rule sets, T10 timing)".
```

## TICKET 04

Run this in Claude Code from `/Users/nurhangarifolla/Hackathon /`. The app lives in `igbt-test-cell/`.

```
TICKET 04: Custom flip (AC-03), AC-14 messages, AC-15, AC-01 package (M3, 18:30)

Context: Fourth slice (04 §3 M3). Custom mode and the AC-14 validators exist since TICKET 01;
this slice proves them end to end and builds the package for AC-01. AC-15 is P0 and no ticket
covered it yet, so it is added here (checks only, no app change).
Specs: 03 §13 AC-01, AC-03, AC-14, AC-15; 02 §3, §11 (Screen 1 Custom); 05 §2–§2.3, §4 (CUSTOM).
Look and feel: DESIGN.md.

Hard rules
- Everything from TICKETS 01–03b still holds (classic <script src>, offline, values verbatim,
  no spec edits, no scenario ID in engine.js / models.js / sequencer.js).
- No threshold, value, expected outcome or fixed text changes. If a check disagrees with the
  specs, stop and log it in Decisions.md as "Pending Said".

1. selfcheck.html, AC-03: Custom with defaults (r_ce_mohm 7) → T05 DONE PASS, Q09 2.40 V,
   equation "… 0.007 Ω × 200 A = 2.40 V", overall PASS. Custom with r_ce_mohm 12 → T05 FAIL,
   Q09 3.40 V, margin −0.20 V, reason "… 3.40 V > max 3.20 V [ILLUSTRATIVE · INVENTED, NOT
   APPROVED]", equation "… 0.012 Ω × 200 A = 3.40 V", T05 hypothesis, overall FAIL with the
   05 §8 label; every other stage unchanged. Custom r_ce 12 and S2 give the same stages,
   overall, safe state, events and total (only scenario_id / name differ: no verdict keyed on
   the scenario).
2. selfcheck.html, AC-14: each of the eight cases goes through configPreflight → INVALID (no run,
   no verdict) with field, value and rule. Bench cases via Custom bench overrides; rule cases
   via a temporary edit of the in-memory demo profile. Expose ac14Table().
3. selfcheck.html, AC-15: change i_pulse_a (200 → 300) and v_dc_test_v (600 → 700) in the
   in-memory data file; S0's conditions text, equations and computed values (Q09, Q16, Q13,
   t_charge, v0, t_safe) follow; no "200 A" or "600 V" left in that report.
4. dev/selfcheck-node.js: also print the AC-14 messages table (Markdown).
5. ui.js: Result shows the inputs that differ from the defaults (same helper as the HTML report),
   so the AC-03 before/after screenshots show what changed.
6. Version 0.4.0. Package dist/igbt-test-cell-v0.4.0.zip (no dev/). AC-01 proxy on this Mac:
   unzip to a new folder, headless Chrome offline over file://: S0 Setup → Report, JSON + HTML
   download, PDF, selfcheck count, no console errors, no network requests. AC-03 before/after
   screenshots in design/screenshots/t04-*.
7. NOTES-FOR-NURKHAN.md: AC-01 checklist for the second laptop (what to run, what to record:
   laptop, OS, browser).

Done when:
- node dev/selfcheck-node.js: all cases PASS (give the count); AC-11 table unchanged; AC-14
  table lists all eight cases with their messages.
- AC-03: before/after screenshots of the Result screen in headless Chrome (Custom 7 → 12).
- AC-01 proxy passes from the unzipped v0.4.0 package; selfcheck.html gives the same count as node.
- AC-02 diffs empty for S0–S5, S8 and Custom r_ce 12; both greps from TICKET 02 empty.
- The real AC-01 (second laptop, Wi-Fi off) is Nurkhan's; checklist handed over.
Commit "TICKET 04: Custom flip, AC-14 messages, AC-15, v0.4.0 package".
```

## TICKET 05

Run this in Claude Code from `/Users/nurhangarifolla/Hackathon /`. The app lives in `igbt-test-cell/`.

```
TICKET 05: P1 seeded noise (N1–N3, AC-16), S8b (AC-17), noise on/off on Setup

Context: P0 is done (TICKETS 01–04, M1–M3). This is the first P1 slice, in the 04 §1 order:
seeded noise σ = 0.01 with selfcheck.html running N1–N3, and S8b. "Equation display with
substituted values" exists since TICKET 02. The bus-voltage gauge and the labelled T08a
waveform are the next P1 slice (TICKET 06). The engine already routes every noisy reading
through rng.n(x, σ, seed, quantity_id) and already gives the S8b row in node.
Specs: 02 §10, §11 (Setup: noise on/off, P1); 03 §6, §11, §12 (S8b row), §13 AC-02, AC-16,
AC-17; 05 §2.1 (noise_rel_sigma 0 ≤ x ≤ 0.05), §4 (S8b). Look and feel: DESIGN.md.

Hard rules
- Everything from TICKETS 01–04 still holds (classic <script src>, offline, values verbatim,
  no spec edits, no scenario ID in engine.js / models.js / sequencer.js).
- σ = 0 stays the default. With noise off, every deterministic section (S0–S5, S8, S8b,
  Custom r_ce 7 and 12) is byte-identical to v0.4.0, and the PRNG is never consulted.
- No limit, σ, expected outcome or fixed text changes. If N1 or N2 fails, stop and log it in
  Decisions.md as "Pending Said" (03 §11).

1. rng.js: n(x, σ, seed, q) = x · (1 + σ·z), z standard Gaussian, truncated at ±3 (so ±3σ).
   Per-quantity sub-seed = FNV-1a 32-bit hash of "<seed>:<quantity_id>"; mulberry32 from that
   sub-seed; Box–Muller; redraw while |z| > 3 (02 §10 SUGGEST). Every call starts a fresh
   generator from its sub-seed, so a value depends only on (x, σ, seed, quantity), never on
   call order. Expose factor(σ, seed, q) = 1 + σ·z for the checks and the equation text.
   prngCalls counts draws.
2. data.js: noise_on_sigma 0.01 (02 §10); built_priorities P0 + P1 (enables S8b; P2 stays
   "not built yet"); version 0.5.0.
3. validate.js: setup.noise (optional boolean). true → preflight sets bench noise_rel_sigma to
   noise_on_sigma (still validated against 05 §2.1); false or absent → the profile or override
   value. Anything else is a validation error.
4. engine.js: when noise moved Q09 away from the model value, the Q09 equation says so
   ("… = 2.40 V; seeded noise × 1.0123 → 2.43 V"). σ = 0 text unchanged.
5. ui.js + index.html: Setup "Noise" select, Off (σ = 0, default) / On (σ = 0.01; Q14 0.02).
   Run meta, Result and the HTML report show the noise state; with noise on, a note says the
   03 §12 values assume σ = 0. S8b selectable.
6. selfcheck.html:
   - AC-16 N1: σ = 0.01, S0 overall PASS for every seed 1…1000.
   - AC-16 N2: σ = 0.01, S2 Q09 FAIL for every seed 1…1000 (lowest ≥ 3.298 V).
   - AC-16 N3: Custom r_ce_mohm sweep, seeds 1…1000: 10.53 mΩ PASS and 11.50 mΩ FAIL for every
     seed; every seed's crossing lies in [10.534, 11.495] mΩ; at 11.00 mΩ both verdicts occur.
   - Noise basics: every factor within ±3σ (Q14 ±6%) over 1000 seeds; same seed → byte-identical
     deterministic section; another seed → different readings; σ = 0 → no PRNG call;
     setup.noise true → noise_rel_sigma 0.01 in the inputs; setup.noise "yes" → INVALID.
   - AC-17: S8b in the 03 §12 table (all module stages PASS; discharge 24.85 s;
     VERIFICATION_UNAVAILABLE; door LOCKED; FAULT_LOCKED; ABORTED (SAFE_STATE_NOT_VERIFIED);
     499.85 s), plus its AC-02, AC-12 and HTML checks.
7. dev/selfcheck-node.js: also print the AC-16 table (N1–N3) in Markdown.
8. Package dist/igbt-test-cell-v0.5.0.zip (no dev/). Headless Chrome from the unzipped zip,
   offline over file://: selfcheck count, S8b Setup → Report with FAULT_LOCKED, S0 with
   noise on → Result shows the noise note, no console errors, no network requests.
   Screenshots in design/screenshots/t05-*.

Done when:
- node dev/selfcheck-node.js: all cases PASS (give the count); AC-11 table unchanged; S8b row
  matches 03 §12 (AC-17); AC-16 table: N1 1000/1000 PASS, N2 1000/1000 Q09 FAIL, N3 crossings
  inside [10.534, 11.495] mΩ.
- Noise off: deterministic sections byte-identical to v0.4.0 (S0–S5, S8, S8b, Custom 7/12).
- Headless Chrome from the unzipped v0.5.0 zip: same selfcheck count as node; S8b and S0 noise-on
  runs as above; no console errors; no network requests.
- AC-02 diffs empty; both greps from TICKET 02 empty.
Commit "TICKET 05: seeded noise (N1–N3), S8b, noise toggle, v0.5.0".
```
