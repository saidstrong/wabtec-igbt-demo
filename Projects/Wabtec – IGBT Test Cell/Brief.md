---
title: Wabtec – IGBT Test Cell (Brief)
tags:
  - project
  - wabtec
sponsor: Wabtec (Kazakhstan)
status: chosen
rank: 1
---

# Wabtec: IGBT Test Cell

Back to [[00 Index]] · Log: [[Projects/Wabtec – IGBT Test Cell/Decisions|Decisions]] · Sources: [[Sources/Summary – Wabtec case deck]], [[Sources/Summary – Sponsor talks transcript#Wabtec]] · Tickets: [[Projects/Wabtec – IGBT Test Cell/Tickets|Tickets]]

## Goal
Propose a prototype test cell that checks an IGBT phase module **on the bench, before it's installed** on a locomotive. Today a bad module is only discovered after installation, which wastes labor and makes troubleshooting harder.

The test cell must:
- test several parameters and report working condition
- connect to a laptop and produce a report

The team must deliver:
- which parameters to test, and why
- how long the test takes, with justification
- step-by-step test instructions
- an approximate cost for the equipment

## Audience
Wabtec engineers, including a lead reliability engineer and Almaz, an engineer who handles Q&A. Technically strict judges.

## Constraints
- Real hardware: 36 IGBT modules per locomotive, about 25 kg per phase module, a fleet of 600+ Wabtec locomotives in Kazakhstan.
- Key specs:
  - Gate drive: +15 V on / −15 V off; turns on at about +4–7 V.
  - Gate driver power up to 20 W; maximum current change rate (di/dt) up to 5000 A/µs.
  - Shuts off within 10 µs after a desaturation fault.
  - Busbar leakage current up to 2 mA.
- Benchmark from the speaker notes: about 3.5 min per IGBT with a PASS / NO PASS result (Wabtec Reparo Light instruction IM-LE-0008).
- Needs real power-electronics knowledge to be believable.

## Status
**Chosen (17 Oct).** Build in progress. Said owns the specs and proposal; Nurkhan builds the virtual test-cell app.

- Specs v0.3 (source of truth): `Specs/02_SYSTEM_DESIGN.md`, `Specs/03_TEST_AND_ACCEPTANCE.md`, `Specs/04_BUILD_PLAN.md`, `Specs/05_DATA_AND_REPORT_SCHEMA.md`; background `Specs/IGBT_Test_Cell_Analysis_Report.md`.
- App: `igbt-test-cell/` at the vault root (offline HTML/JS, Method A).
- Deadline 18 Oct 11:00; feature freeze 20:00 on 17 Oct.
