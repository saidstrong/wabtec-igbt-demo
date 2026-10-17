# Design reset: calm, premium instrument interface

Current target: `saidstrong/wabtec-igbt-demo`, branch `feat/product-design`. This is Said's visual direction and supersedes the NVIDIA-style presentation requirements in DESIGN.md. No engineering-rule change is authorized.

## Paste into the existing Claude session

```text
The last pass improved information hierarchy, but the visual direction is wrong. I want a calm, premium product interface inspired by the restraint of Apple, OpenAI and Anthropic. The current result is too boxed, colorful, dense and dominated by prototype warnings.

Keep the functional improvements, including truthful T10 VERIFYING/LOCKED rendering, real scenario selection, evidence access and working exports. Work from the current feat/product-design branch, preserving local edits. Do not reimport the ZIP or restart the project.

First correct the context: I am Said. This copy is saidstrong/wabtec-igbt-demo. Do not follow the inherited CLAUDE.md instructions to push Nurkhan's main, use his Mac path or create tickets/session reports. Replace only those stale ownership/workflow instructions and the conflicting visual rules in DESIGN.md. Preserve engineering constraints.

Design direction:
- A light workspace throughout. Background #fafafa, surfaces #ffffff, primary text #1d1d1f, secondary text #6e6e73, subtle dividers #e5e5e7.
- System sans-serif typography, clear size hierarchy, larger key values, comfortable line height. No remote font downloads.
- One compact header: IGBT Test Cell, a quiet but legible SIMULATION / synthetic-data indicator, and a secondary About link. No repeated identity bars.
- A restrained five-step progression. No decorative numbered boxes competing with the content.
- Dark neutral primary buttons, quiet secondary actions, approximately 10–12px corners. No lime-green outlines on every control.
- Group with space and alignment first. Use a border only when it establishes a useful boundary. Avoid nesting multiple cards and outlines.
- Keep green, amber and red local to genuine states. Do not remove meaningful state distinctions; always include text. Avoid painting entire panels red or orange.
- Remove decorative corner squares, uppercase microcopy everywhere, instructional sidebars and the black console treatment.

Disclosure and interaction:
- Keep simulation status continuously visible in neutral styling; this is synthetic data, not physical testing.
- Put fuller prototype/limitations explanations in a user-opened About/Information panel and the report. Do not auto-open a modal or ask users to acknowledge the same facts repeatedly.
- Keep the illustrative/not-approved qualification legible close to verdicts. Preserve required provenance within evidence and exports.
- Keep functional alerts: invalid configuration, abort, failed discharge and locked enclosure. Present each consequence clearly once at the appropriate level, without repeating the same paragraph in several boxes.
- Do not hide a critical locked state in About or an accordion.
- If an existing acceptance requirement mandates fuller banner wording, keep it in a compact neutral line. Do not weaken acceptance checks to remove it.

FIRST DELIVERY: redesign only the Setup screen and shared header/stepper to establish the visual direction.
- Main heading: Configure test.
- Required module/operator fields in a clean, aligned form.
- Three understated scenario choices: Healthy run, Interrupted run, Failed discharge. Preserve current handlers; keep all scenarios and advanced controls accessible.
- One clear primary action: Continue to pre-check.
- Short supporting text only where it helps the next decision.
- No hero marketing section, invented performance statistics, decorative graph or unnecessary illustration.

Open it in the available permitted browser and show the actual Setup at 1366×768. Briefly inspect Run/Result too, since shared CSS affects them. Run relevant existing checks once. If browser access is blocked, report it and provide a manual preview path; do not bypass browser restrictions or claim visual verification.

Stop after this concrete preview for my visual review. Do not redesign every screen before establishing the look. No new framework, backend, dependencies, speculative features, lengthy documents or additional agents. Summary: at most 100 words.
```

## After the Setup direction is accepted

Apply the same visual language to Run, Result, Pre-check and Report. Run should lead with the current test and actual bench state; Result should lead with the outcome, its qualification and reason, and the enclosure state. Then verify S0/S4/S8 and exports and freeze the interface for recording.

The goal is clear and convincing demonstration, not an unsupported claim of superiority over other teams.
