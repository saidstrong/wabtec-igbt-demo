# Wabtec product finish — start here

Repository: https://github.com/saidstrong/wabtec-igbt-demo

## Current status

- Private repository created for Said's product/design work.
- The newly attached `nu-ieee-hackathon-2026-main (1)(1).zip` has NOT yet been imported or verified. Attachment access was unavailable in this session. Do not confuse this repository with a complete imported build.
- Earlier project screenshots informed the design direction below; inspect the actual imported build before editing.
- The original team repository remains https://github.com/nurkhangarifolla/nu-ieee-hackathon-2026. This new repository is a separate copy; changes will not automatically reach Nurkhan's repository.
- Deadline: 18 October 2026, 11:00 Asia/Qyzylorda (UTC+5).

## One skill

Use Anthropic's official `frontend-design` plugin. In Claude Code:

```text
/plugin install frontend-design@claude-plugins-official
```

If already enabled, do not install it again. Use `/plugin` to check. No additional skill bundle, framework or orchestration system is needed.

Official references:
- https://github.com/anthropics/claude-plugins-official/tree/main/plugins/frontend-design
- https://code.claude.com/docs/en/discover-plugins

## Paste this into Claude Code — Local

```text
You are finishing our Wabtec IGBT Test Cell hackathon product for a compelling, truthful demo and pitch. Use the frontend-design skill if available. Work locally with the actual project files.

We are four students. Nurkhan owns the simulation engineering. Said owns this product/design copy; Ramazan and Darkhan pitch and help with visuals. Deadline: 18 October 2026 at 11:00 UTC+5. Existing subscriptions and laptops only.

FIRST: establish the correct source and a recoverable baseline.
- Destination: https://github.com/saidstrong/wabtec-igbt-demo (private, already created).
- Source: my newest supplied project ZIP, shown in ChatGPT as nu-ieee-hackathon-2026-main (1)(1).zip. Locate the actual source file I provide locally; do not assume ChatGPT's attachment filename equals its local filename. If ambiguous, ask only for its exact path.
- Use a genuine clone of the destination if possible. Inspect existing files and git status; preserve my edits. Extract the project into the repository root, removing only the ZIP's single enclosing directory. Do not import another .git directory. Do not delete originals, force-push, or use an unrelated local repository's history.
- Preserve project files and root instructions; do not copy .obsidian workspace/session settings or temporary output into the new repository. Keep source documents private. Add only necessary ignore patterns.
- Commit the unchanged imported application as the baseline. Record the archive SHA-256 and application version in a short commit description or final summary. Push this baseline to the new repository if authentication allows; do not spend the session repairing authentication. Report a real blocker accurately.
- Branch feat/product-design before presentation edits. Never push or overwrite Nurkhan's repository.

THEN: finish the interface for the demo. Inspect CLAUDE.md / AGENTS.md if present, igbt-test-cell/index.html, the UI script, DESIGN.md and existing screenshots. Read engine files or specs only when needed to preserve behavior. Run the existing Node self-check once as a baseline if available. Do not scan the entire notes vault, unrelated case folders or every source document.

Give a design plan of no more than 200 words, then implement the highest-value improvements in one coherent pass. Make routine design choices yourself.

Design direction: a precise industrial instrument interface, with clear hierarchy, generous usable space, disciplined black/white/green styling, and readable engineering information. Give it its own identity; do not copy a manufacturer's logo. Create visual interest through composition, typography, a clear test progression and meaningful state changes. The current app is an operator workflow, not a marketing landing page.

Priorities, in order:
1. RUN: Make the active test, stage progression, current bench state and primary action immediately understandable. Give energized/disabled/discharging/locked states clear text as well as color. Keep abort and critical warnings prominent. Separate live status from detailed logs. Preserve actual sequencing and control behavior.
2. RESULT: Lead with the genuine overall outcome, its qualification, the reason, and enclosure/safe-state status. Passing module checks do not imply a verified safe state. Put dense per-reading evidence behind accessible details or secondary sections, without removing it or hiding material limitations. Never show a transient PASS for an aborted/locked scenario.
3. SETUP + PRE-CHECK: Reduce form clutter, group necessary inputs, improve validation and explain what must happen next. If adding shortcuts for S0, S4 and S8, use existing scenario selection handlers rather than inventing new simulation behavior. Keep advanced controls available in a secondary area.
4. REPORT: Improve hierarchy, spacing and print layout while preserving readings, units, outcomes, provenance and approval status. Keep exports working.

Keep the existing offline application architecture. Do not migrate frameworks, add a backend/authentication, redesign the engine, or install a large dependency stack. Preserve existing DOM contracts when practical. No new features unless required to complete an existing interaction.

Truth and engineering boundaries:
- Keep a legible SIMULATION / synthetic-data notice on every app screen. Keep the illustrative, not-approved qualification close to verdicts. Do not remove necessary context for aesthetics.
- Do not change equations, limits, scenario outcomes, seed behavior, estimated duration, interlocks or export semantics for a better-looking demo.
- S0 healthy, S4 interrupted run and S8 failed discharge are the primary demonstration paths. Inspect the current implementation before assuming their values. S8b is a different scenario; do not silently substitute it.
- Never fabricate app readings, performance improvements, savings, detection rates, physical testing or industrial validation. Our differentiation is the proposed workflow, visible fault handling and traceable evidence, not an unverified claim that competitors are inferior.
- Any conceptual module graphic must be labelled conceptual. Do not present decorative waveforms as measured data.

Finish and verify:
- Add only restrained motion that clarifies transitions; respect reduced-motion preferences. Do not animate every card or alter simulated timing.
- Check the complete Setup → Pre-check → Run → Result → Report path in a real browser, plus S4 and S8, navigation/reset and report export. Inspect Run and Result at 1366×768 and 1920×1080; check a narrow width for overflow. Follow browser permissions; never bypass a blocked origin or protocol.
- Run the existing relevant checks after changes. Do not add tests that just mirror CSS or write a new test framework.
- If browser access is unavailable, distinguish source checks from visual verification and give me a brief manual checklist. Never claim screenshots or browser tests you did not perform.
- Commit the focused change and push feat/product-design to this new private repository if authentication allows. Do not merge automatically. Summarize changes, checks and remaining blockers in at most 150 words, with three useful before/after views if browser capture is available.

Be economical: one implementation agent, targeted file reads, no long research, no elaborate ticket system, no repeated full audits, no new planning documents. Spend effort where judges will see and understand it.
```

## How Said should review the first pass

- In ten seconds on Run, can I identify what is being tested and what the bench is doing?
- On Result, can I explain the outcome without reading the full table?
- Does a failed discharge clearly leave the enclosure locked, without blaming the module?
- Are the actual demo paths and exports usable on the presentation laptop?

Review these before spending time on icon variants, font hunting, additional scenarios or decorative motion. If they pass, freeze the UI for recordings and pitch rehearsal.
