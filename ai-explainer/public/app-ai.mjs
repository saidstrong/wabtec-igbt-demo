// Companion for the test-cell app when it is served by this local service at /app/.
// Registers window.IGBT_AI so the app's report screen can request one analysis on an explicit click.
// The same client-side projection as the explainer page is used (prepareReport), the server validates it again,
// and the OpenAI key stays in the server process. No placeholder text: failures are thrown as errors.
import { prepareReport, describeRef } from '/evidence.mjs';

async function explain(report) {
  const payload = prepareReport(report);
  let response;
  try {
    response = await fetch('/api/explain', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
      signal: AbortSignal.timeout(40000)
    });
  } catch (error) {
    throw new Error(error && error.name === 'TimeoutError' ? 'The AI service timed out. No automatic retry.'
      : 'Could not reach the local AI service. Check that it is running.');
  }
  let body;
  try { body = await response.json(); } catch { throw new Error('The AI service returned an unreadable response.'); }
  if (!response.ok) {
    // Diagnostics are constant codes and counts only (see README); never raw model or report text.
    const diagnostic = body.diagnostics ? ` Diagnostics: ${JSON.stringify(body.diagnostics)}` : '';
    throw new Error((body.error || 'AI request failed. No automatic retry.') + diagnostic);
  }
  // Cited refs stay internal; the report shows a readable label and the recorded value instead.
  return {
    model: body.model,
    summary: body.explanation.summary,
    items: body.explanation.supporting_evidence.map(i => {
      const d = describeRef(payload, i.ref);
      return { ref: i.ref, label: d.label, value: d.value, unit: d.unit || '', explanation: i.explanation };
    })
  };
}

window.IGBT_AI = Object.freeze({ explain });
