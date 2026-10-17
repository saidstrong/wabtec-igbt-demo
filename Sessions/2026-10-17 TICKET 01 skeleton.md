---
title: Session 2026-10-17 – TICKET 01 skeleton
tags:
  - session
  - wabtec
date: 2026-10-17
---

# Session 2026-10-17: TICKET 01 skeleton

Back to [[00 Index]] · [[Projects/Wabtec – IGBT Test Cell/Tickets|Tickets]]

**Done**
- `igbt-test-cell/` created (Method A): `data.js` (all 05 data), `validate.js` (validation + `configPreflight`), Setup / 1a / 1b screens, `selfcheck.html`, README. Commit c874602.
- Selfcheck 28/28 PASS (node and offline headless Chrome from a copied folder; no console errors, no network requests).
- Fixed: leaving S5 kept the production profile, so S0 got blocked.

**Next**
1. Write and build TICKET 02 (engine, safe state, S0 end to end + JSON) for M1 15:30.

**Open questions**
- `required` flag rule (Pending Said).
- Presentation-laptop browser (D1).
- AC-01 on a second laptop: Nurkhan.
