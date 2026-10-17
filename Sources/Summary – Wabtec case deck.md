---
title: Summary – Wabtec case deck
tags:
  - source
  - wabtec
original: "[[Originals/NU_IEEE_2026_IGBT_test_cell_AK_Final.pptx]]"
type: slide deck (12 slides)
---

# Summary: Wabtec case deck

**Original:** [[Originals/NU_IEEE_2026_IGBT_test_cell_AK_Final.pptx]] · **Project:** [[Projects/Wabtec – IGBT Test Cell/Brief|Wabtec brief]]

**Company:** Wabtec makes locomotives, freight and passenger components, and digital rail systems. It monitors 23,000+ locomotives worldwide and its products are in 100+ countries. Locomotives built in Kazakhstan:
- **TE33AC** (freight): 3,356 kW, 120 km/h
- **TEP33A** (passenger): 160 km/h
- **TEM11A** (shunter): 1,100 kW, 100 km/h

All three are rated for −50 to +50 °C and certified to TR CU 001/2011.

**How the power flows:** alternator → main rectifier (AC→DC) → IGBT inverter (DC→variable-frequency AC) → 6 AC traction motors. The IGBTs control speed and traction effort, limit overcurrent, overvoltage and overheating, and enable dynamic braking. Each locomotive has **36 modules** (6 inverters × 3 phases × 2 switches); each phase module weighs about 25 kg. Main parts: phase module, gate driver, 100 VAC gate-driver power supply, laminated busbar, heatsink.

**Key specs:**
- Gate +15 V on / −15 V off (turns on at about +4–7 V); driver power up to 20 W.
- Current change rate (di/dt) up to 5000 A/µs; free-wheeling diode drop 0.2–0.8 V.
- Shuts off within 10 µs after a desaturation fault, which prevents shoot-through.
- Busbar leakage up to 2 mA.
- The traction motor controller sends commands to each gate driver over fiber optics.

**Problem:** a module can only be verified after it's installed on a locomotive, which costs labor and time if it turns out to be bad.

**Task:** propose a prototype test cell that:
- checks parameters and reports working condition to a laptop
- comes with the chosen parameters, a justified test duration, test instructions, and a cost estimate

**Benchmark (speaker notes):** about 3.5 min per IGBT with a PASS / NO PASS result, from Wabtec instruction IM-LE-0008. Installed base: 600+ locomotives.
