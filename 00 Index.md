---
title: Hackathon Index
tags:
  - index
event: NU × IEEE Case Hackathon 2026 (sponsor cases from Stadler, Wabtec, Alstom)
date: 2026-10-17
---

# Hackathon Index

Hackathon at Nazarbayev University, 17 Oct 2026. Three rail companies each set one case, and the team picks one.

## Projects

| Rank | Project | Sponsor | One-line task | Status |
| --- | --- | --- | --- | --- |
| 1 | [[Projects/Wabtec – IGBT Test Cell/Brief\|IGBT Test Cell]] | Wabtec | Design a bench tester that checks IGBT modules before they're installed on a locomotive | **Chosen (17 Oct)**; build in progress |
| – | [[Projects/Stadler – Steel vs Aluminium/Brief\|Steel vs Aluminium carbodies]] | Stadler Kazakhstan | Life-cycle energy cost of a light aluminium train vs a heavier steel one, then apply it to Kazakhstan | Not chosen |
| – | [[Projects/Alstom – TF1-PP Transformer/Brief\|TF1-PP Transformer failures]] | Alstom | Find the root cause of repeated voltage-transformer failures on KZ8A locomotives | Not chosen |

Each project folder has a `Brief.md` (goal, audience, constraints, status) and a `Decisions.md` (decision log table). Wabtec also has `Tickets.md` (builder tickets; TICKETS 01–05 are done (P0 + seeded noise and S8b); AC-01 on a second laptop, the 19:00 review and the 20:00 freeze next) and `Specs/` (Said's build specs).

- Stadler: [[Projects/Stadler – Steel vs Aluminium/Brief|Brief]] · [[Projects/Stadler – Steel vs Aluminium/Decisions|Decisions]]
- Wabtec: [[Projects/Wabtec – IGBT Test Cell/Brief|Brief]] · [[Projects/Wabtec – IGBT Test Cell/Decisions|Decisions]] · [[Projects/Wabtec – IGBT Test Cell/Tickets|Tickets]]
- Alstom: [[Projects/Alstom – TF1-PP Transformer/Brief|Brief]] · [[Projects/Alstom – TF1-PP Transformer/Decisions|Decisions]]

## Wabtec specs (v0.3, Said)

| Spec | Covers |
| --- | --- |
| `Projects/Wabtec – IGBT Test Cell/Specs/02_SYSTEM_DESIGN.md` | Architecture, state machine, safe-state procedure, UI screens |
| `Projects/Wabtec – IGBT Test Cell/Specs/03_TEST_AND_ACCEPTANCE.md` | Tests T00–T10, prerequisites, expected outcomes, acceptance checks |
| `Projects/Wabtec – IGBT Test Cell/Specs/04_BUILD_PLAN.md` | Scope, milestones, freeze, fallback |
| `Projects/Wabtec – IGBT Test Cell/Specs/05_DATA_AND_REPORT_SCHEMA.md` | Parameters, rules, scenarios, report JSON/HTML |
| `Projects/Wabtec – IGBT Test Cell/Specs/IGBT_Test_Cell_Analysis_Report.md` | Background analysis (02–05 win where they differ) |

## Sessions

| Date | Note |
| --- | --- |
| 2026-10-17 | [[Sessions/2026-10-17 Wabtec kickoff]] |
| 2026-10-17 | [[Sessions/2026-10-17 TICKET 01 skeleton]] |
| 2026-10-17 | [[Sessions/2026-10-17 Repo, design pass, TICKET 02]] |
| 2026-10-17 | [[Sessions/2026-10-17 TICKET 02 engine and S0]] |
| 2026-10-17 | [[Sessions/2026-10-17 TICKET 03 S1–S8 and HTML report]] |
| 2026-10-17 | [[Sessions/2026-10-17 TICKET 03b review fixes]] |
| 2026-10-17 | [[Sessions/2026-10-17 TICKET 04 Custom, AC-14, AC-01 package]] |
| 2026-10-17 | [[Sessions/2026-10-17 TICKET 05 noise and S8b]] |

## Sources (summaries, 300 words or fewer)

| Summary | Original |
| --- | --- |
| [[Sources/Summary – Stadler case deck]] | [[Originals/Stadler_Kazakhstan_NU_171026.pptx]] |
| [[Sources/Summary – Wabtec case deck]] | [[Originals/NU_IEEE_2026_IGBT_test_cell_AK_Final.pptx]] |
| [[Sources/Summary – Alstom case deck]] | [[Originals/IEEE_case_championship_deck.pptx]] |
| [[Sources/Summary – Sponsor talks transcript]] | [[Originals/Sponsor talks transcript.md]] |

## Where things are

```
Hackathon/
├── 00 Index.md          ← you are here
├── CLAUDE.md            ← how Claude Code works in this vault (auto-loaded)
├── DESIGN.md            ← app look and feel (NVIDIA style, adapted)
├── design/screenshots/  ← design-pass screenshots
├── Projects/            ← one folder per case: Brief.md + Decisions.md (Wabtec: + Tickets.md, Specs/)
├── Sessions/            ← handoff notes, one per working session
├── igbt-test-cell/      ← Wabtec app (created by TICKET 01)
├── Sources/             ← summary notes, each linked to its original
├── Originals/           ← untouched decks and transcript as received (.pptx not in git)
└── graphify-out/        ← code and notes graph, rebuilt automatically (not in git)
```

The whole vault is one git repo (created 17 Oct; the app's TICKET 01 history is kept).

> [!tip] Adding new material
> Put the raw file in `Originals/`, write a short summary in `Sources/` that links to it, log any choice it triggers in the right `Decisions.md`, and add a row to this index.
