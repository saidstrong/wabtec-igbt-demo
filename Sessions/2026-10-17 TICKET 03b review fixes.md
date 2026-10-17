---
title: Session 2026-10-17 – TICKET 03b review fixes
tags:
  - session
  - wabtec
date: 2026-10-17
---

# Session 2026-10-17: TICKET 03b review fixes

Back to [[00 Index]] · [[Projects/Wabtec – IGBT Test Cell/Tickets|Tickets]]

**Done**
- Fixed the three defects from the independent review: verdicts at full precision (3.20004 V now FAILs), complete rule sets required, T10 timing with a long `verify_delay_s`.
- 41 regression checks; selfcheck 174/174 in node and in headless Chrome from the unzipped v0.3.1 zip; AC-11 still matches every cell; AC-02 diffs empty.
- Private GitHub repo created; Said invited.
- Package and results: `dist/` (git-ignored).

**Next**
1. TICKET 04: Custom flip (AC-03), AC-14 set, AC-01 on a second laptop (M3 18:30).

**Open questions**
- Said: three new Pending Said entries (03b), plus the earlier four.
- Said: accept the GitHub invite.
- Nurkhan: own-browser check (S0 abort, S8 report PDF).
