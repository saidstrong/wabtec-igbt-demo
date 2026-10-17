---
title: Session 2026-10-17 – TICKET 02 engine and S0
tags:
  - session
  - wabtec
date: 2026-10-17
---

# Session 2026-10-17: TICKET 02 engine and S0

Back to [[00 Index]] · [[Projects/Wabtec – IGBT Test Cell/Tickets|Tickets]]

**Done**
- Engine, models, sequencer (single safe-state procedure, FAULT_LOCKED), JSON report; Pre-check, Run, Result screens; `dev/run-node.js`.
- S0 matches 03 §12 (499.85 s, 62.48 s, 24.85 s, 40.94 V, PASS). Every other §12 row also matches.
- AC-02 diff empty; AC-12 passed in headless Chrome over `file://`, offline; selfcheck 59/59; both greps empty.

**Next**
1. Write and build TICKET 03 (S1–S8 checks, HTML report) for M2 17:30.

**Open questions**
- Said: IL3, rounding, abort + unverified label, failed-discharge `discharge_time_s` (all Pending Said).
- Nurkhan: run S0 once in your own browser with Wi-Fi off.
