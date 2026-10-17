---
title: Session 2026-10-17 – TICKET 05 noise and S8b
tags:
  - session
  - wabtec
date: 2026-10-17
---

# Session 2026-10-17: TICKET 05 noise and S8b

Back to [[00 Index]] · [[Projects/Wabtec – IGBT Test Cell/Tickets|Tickets]]

**Done**
- Wrote and built TICKET 05 (P1). Seeded noise σ = 0.01: N1 1000/1000 PASS, N2 1000/1000 Q09 FAIL, N3 crossings inside 10.534–11.495 mΩ. Setup has a Noise toggle. S8b is enabled and matches 03 §12 (AC-17).
- Noise off: output byte-identical to v0.4.0.
- v0.5.0 zip: selfcheck 222/222 in node and in headless Chrome, offline, no errors.

**Next**
1. Nurkhan: AC-01 on a second laptop with the v0.5.0 zip (checklist updated).
2. TICKET 06 (optional, before 20:00): bus-voltage gauge and labelled T08a waveform.
3. Said's review 19:00; freeze 20:00.

**Open questions**
- Said: S8b `v_bus_at_verification_v` 40.94 V or null? Noise truncation: redraw or clamp? Seven earlier Pending Said entries.
