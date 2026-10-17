# Optional synthetic report explainer

Separate from `igbt-test-cell/`; it can also serve that app at `/app/` for the report AI section (see Report integration). Node 22+ and Internet access are required for explanations. No dependencies, install, package manifest, database or accounts. The offline simulator remains independent.

## Start (PowerShell, from repository root)

Configure `OPENAI_API_KEY` securely in the **server process environment**, then run:

```powershell
$explainerKey = Read-Host 'OpenAI API key (hidden)' -AsSecureString
$env:OPENAI_API_KEY = [System.Net.NetworkCredential]::new('', $explainerKey).Password
Remove-Variable explainerKey
$env:OPENAI_MODEL = 'gpt-4.1-mini' # optional; must support Responses structured output
$env:PORT = '8787'                # optional
node ai-explainer/server.mjs
```

Open **http://127.0.0.1:8787** manually. Use the literal IP, not localhost or a LAN address. Stop with Ctrl+C. If you configured the key after opening the terminal, open a fresh terminal/restart the process. Never put a key in source, the browser, a report, a command shared in chat, or a committed file. Missing credentials produce a clear error; no fake explanation is shown.

1. Export JSON from the simulator; select that file here.
2. Review the outcome, verification warning and expandable **exact outgoing evidence**. File selection does not contact OpenAI.
3. Click **Explain result**. One request is sent; concurrent clicks are ignored. Errors never retry automatically. A later deliberate click makes a new request and may incur another API charge.

## Report integration (test-cell app)

The same service also serves the test-cell app read-only at **http://127.0.0.1:8787/app/** (same loopback, Host and Origin rules). The served page gets one added module, `/app-ai.mjs`, which registers `window.IGBT_AI`. On the app's Report screen, **Generate AI analysis** sends this run's projected evidence (the same `prepareReport` projection and server-side validation as the explainer page) once; nothing is sent before that click. The generated summary and cited evidence appear in report section **B. AI analysis** and are included in Save PDF and Download HTML. A failure is shown as an error with the same diagnostics and adds nothing to the report. The JSON export is unchanged.

`igbt-test-cell/` itself still has no network code: opened from `file://` it works offline as before, the AI button is not shown, and section B states that no AI analysis was generated. Architecture change: AI requires running this local service with `OPENAI_API_KEY` in its environment and Internet access; the key never reaches the browser.

### Failure-focused output (18 Oct)

The request now names the decisive finding and requires it: for FAIL, the first failed reading (test ID, value and configured limit, from the projected evidence) and its value ref are mandatory; for an interruption, the stop trigger (`/deterministic/overall/abort_reason`) is mandatory and must be named; for a locked bench, the summary must lead with the discharge/verification problem. Module findings and bench/enclosure status are kept apart. New rejection codes: `MANDATORY_REFERENCE_MISSING`, `FAIL_CHECK_NOT_NAMED`, `FAIL_VALUE_MISSING`, `FAIL_LIMIT_MISSING`, `STOP_TRIGGER_MISSING`, `SAFE_STATE_FOCUS_MISSING`, `UNSUPPORTED_SAFETY_CLAIM` ("all safety conditions met", "safe to energise/install/use") and `POINTER_IN_TEXT`. Test and quantity names come from application constants (`STAGE_NAMES`, `QUANTITY_LABELS`, checked against `igbt-test-cell/js/data.js`); cited refs are shown as readable labels and values, and JSON pointers stay internal. The prompt asks for concise technical text without simulation/disclaimer prose; provenance stays in the raw JSON.

Bench status: the report prints a "Bench status (recorded, not generated)" line in section B from the recorded safe-state fields (final state, verification, bus voltage, enclosure door). Unless the bench is the decisive finding, the prompt tells the model not to describe it, and the verification citation is optional. Broad claims ("all safety devices confirmed", "safety conditions were met") are rejected as `UNSUPPORTED_SAFETY_CLAIM`, and "simulation/simulated/simulator" in generated text as `SIMULATION_WORDING`. Output bounds, the 1,400-token cap, explicit generation and server-side credentials are unchanged. Not yet verified with a live call.

## Data and limits

Schema 0.3 synthetic reports only. Maximum source file 512 KiB; outgoing evidence 32 KiB/350 scalar fields; stages 12, events at most 200. Numeric values must be finite and within ±1e9. Unknown/free-text enum values are rejected. Unsupported report shapes fail closed.

Client-side projection and independent server validation allow only selected outcome, profile, stage/reading and safety-event facts with JSON Pointer references into the original report. Operator, module/run identifiers, dates, seed, full module/bench parameters, filenames, descriptions, hypotheses, equations and event details are not sent. Discarded free text can contain identifiers or prompt injections; no report text is treated as instructions. Identifiers deliberately encoded as numbers in evidence cannot be detected; review the exact payload before sending.

The fixed endpoint is `https://api.openai.com/v1/responses`; there is no configurable upstream URL. The request uses `store: false`, a strict JSON schema and an **unchanged 1,400-token output cap**. The reliability fix reduces requested text and removes fixed-disclosure echoing rather than raising cost or assuming a token-limit failure. `store: false` is not a promise of zero provider retention. Maximum upstream wait 30 seconds; response body at most 96 KiB. A refusal, incomplete response, invalid JSON, invalid citation, timeout or network/API error is displayed as an error without fallback content. No report, key or response is logged or saved by this service. The model is read from `OPENAI_MODEL`, never supplied by the page.

AI output contract: **only `summary` and `supporting_evidence`**. Request a brief summary (1–2 sentences, at most 480 characters) and **2–4 evidence items**, each explanation at most 220 characters. Schema array bounds and string-length patterns use the same constants as the validator. The prompt explicitly requires nonblank concise text, unique citations, the original case-sensitive verdict in summary, and the verdict/verification refs exactly once (verification ref mandatory only when the bench is the decisive finding: verification not VERIFIED, or a locked bench). The minimum remains two items even when verification did not run. Cross-item/content requirements remain strictly checked locally; unsupported `uniqueItems`/`contains` keywords are not sent. Models must support the documented base-model schema constraints; fine-tuned variants may not.

Standard limitations are a **local-only** application-owned catalogue. They are absent from the AI response schema, prompt copying requirements and limitation-validation rules. The page renders them in **Standard limitations — fixed application text**, outside the generated explanation and before any API call. Unexpected AI response properties are rejected generically. The page does not render generated limitation prose, silently repair invalid responses or use standard text as a substitute AI explanation. Invalid responses remain errors even though the fixed disclosures stay visible.

Loopback binding, exact Host/Origin checks, same-origin JSON POST, no CORS, CSP and text-only rendering bound the local surface. Do not expose it through a proxy/tunnel. Schema checks verify source references and preserve the original displayed verdict, but do not prove every AI sentence correct. Treat explanations as fallible commentary. No tools, hardware connection, certification or energisation instructions are provided.

The prompt and local review note receive explicit context from the actual verification field: **S8 / DISCHARGE_FAILED** means simulated verification ran and reported failed discharge; verification was available. **S8b / VERIFICATION_UNAVAILABLE** means retained voltage is a **model estimate, not independently verified**. For S8b, all three qualifications must appear in generated summary/evidence, independently of any local text: "model estimate", "verification is unavailable" and "not independently verified". A status enum alone is insufficient. Even `VERIFIED` only describes simulated verification. Explicit contradictory status claims in generated text are rejected. These checks do not prove every possible AI statement correct. T10 DONE and Q18 PASS do not establish successful discharge. The explanation does not amend the original report or decide Pending Said items.

## Verify

```powershell
node --test ai-explainer/test/*.test.mjs
```

Tests generate S0/S4/S8/S8b reports using the existing Node runner, check field-level provenance/redaction and mock upstream failures. HTTP tests use loopback; page logic tests use a minimal DOM stub, not a browser. Mock outputs exist only in tests and are never available to the running page.

After configuring the real environment key, perform **one small live request**:

```powershell
node ai-explainer/live-check.mjs
```

This explicitly authorized smoke check generates S8b locally, selects only outcome/verification context, validates one real structured response and prints PASS/FAIL only. It never prints credentials, the report or AI response and never retries. A failed call must be investigated before any manual rerun.

### Safe failure diagnostics

Rejected responses include a `diagnostics` object in the HTTP error, displayed by the page and live-check script. It contains a constant `codes` array and numeric `counts`. For `RESPONSE_INCOMPLETE`, it also includes **`incomplete_reason`**, allowlisted from OpenAI's `incomplete_details.reason`: `max_output_tokens`, `max_messages`, `content_filter`, or `steered`. A missing/null reason maps to `not_provided`; any unrecognized value maps to `unknown`, never its raw text. The first failed check is reported; no raw field refs, credentials, report/response prose or provider error messages are recorded. There is no response logging or new diagnostic storage, and no retry or continuation for any reason.

- Count/text bounds: `EVIDENCE_COUNT`, `SUMMARY_TEXT_INVALID`, `EVIDENCE_TEXT_INVALID`.
- Status consistency: `VERIFICATION_STATUS_CONTRADICTION`.
- Citation/verdict rules: `CITATION_UNKNOWN`, `CITATION_DUPLICATE`, `VERDICT_REFERENCE_MISSING`, `VERIFICATION_REFERENCE_MISSING`, `VERDICT_TEXT_MISSING`.
- Unavailable-verification qualification: `UNAVAILABLE_MODEL_ESTIMATE_MISSING`, `UNAVAILABLE_VERIFICATION_WORDING_MISSING`, `UNAVAILABLE_NOT_VERIFIED_MISSING`.
- Shape/envelope/JSON failures have separate `*_SHAPE`, `*_NOT_ARRAY`, `RESPONSE_*` or `OUTPUT_*` codes.

### Validation evidence and one manual S8 retest

Said reported a successful **reduced S8b** live-check on 17 October 2026. Subsequently the user-run **full S8 browser flow failed** after successful local loading (177 evidence fields, 12,087 bytes), with the generic validation error. The original response was not retained; which rule failed on that call remains unknown. Confirmed code defect: the previous schema omitted bounds enforced by the validator, and the prompt omitted count/uniqueness requirements. That contract mismatch is corrected; it is not proof of the specific call's cause. No paid request was made during this fix. Automated checks use mocks, including valid explanations of full projections.

After the contract fix, Said reported a **successful live full-browser response and rendering**. Record that transport/rendering success separately from **failed semantic verification**: its S8 limitation incorrectly said simulated verification was unavailable, despite DISCHARGE_FAILED. The earlier validator did not reject that claim for S8. The semantic fix added actual-status context and generated-text status checks, and initially made the AI echo a fixed limitation catalogue.

The subsequent **user-run S8 retest on 7929aac failed with `RESPONSE_INCOMPLETE`, counts `{}`**. Its upstream incomplete reason was not surfaced or retained, so token exhaustion, filtering or another upstream reason is **not confirmed**. The reliability fix exposes only the allowlisted reason, removes limitations from the AI contract entirely and reduces generated text to 2–4 cited items plus a brief summary. Status, citation and S8b qualification checks remain. Tests use mocks; no paid request or agent browser operation was made during this fix. Post-reliability-fix live/browser acceptance remains pending.

For one **user-run**, post-fix S8 browser retest:

1. In the `said/ai-explainer` checkout, stop the service with Ctrl+C, run `git pull --ff-only origin said/ai-explainer`, then `node ai-explainer/server.mjs` in the same terminal with the existing environment key. Do not run live-check.mjs as well.
2. Reload http://127.0.0.1:8787 and select the same exported S8 JSON. Confirm ABORTED, DISCHARGE_FAILED and unchanged projection counts (177 / 12,087 for the reported file). Selection must send no OpenAI request.
3. Review the status-specific note and separately labelled fixed standard limitations, then click **Explain result exactly once**. Success must preserve ABORTED, cite the actual verdict and verification refs, and say simulated verification ran and reported failed discharge, not unavailable verification. It must make no physical-verification or hardware-acceptance claim. S8b, if checked in a separately authorized run, must distinguish its model estimate from unavailable verification.
4. If rejected, stop and share only the displayed `diagnostics` codes/counts/allowlisted incomplete reason; do not share credentials, report text or model prose, and do not click again automatically.

Post-reliability-fix live/browser acceptance is pending. Earlier user-run response/rendering success does not establish semantic acceptance or validate the current revision. Agent browser/visual checks remain unperformed under the restriction. Physical-device and real simulator-download/print acceptance remain separate.

## API sources

- [OpenAI structured outputs](https://developers.openai.com/api/docs/guides/structured-outputs?api-mode=responses): Responses `text.format`, strict JSON schema, refusals and incomplete output handling.
- [Responses API reference](https://developers.openai.com/api/reference/resources/responses/methods/create): `incomplete_details.reason` allowlist and output-token cap.
- [GPT-4.1 mini](https://developers.openai.com/api/docs/models/gpt-4.1-mini): default model; configurable because account access may differ.
