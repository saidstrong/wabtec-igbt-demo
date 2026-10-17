import { prepareReport, reviewSummary, REPORT_LIMIT, STANDARD_LIMITATIONS } from '/evidence.mjs';

const $ = id => document.getElementById(id);
let reviewed = null, busy = false, selection = 0;
const say = message => { $('status').textContent = message; };
$('report').addEventListener('change', async () => {
  const current = ++selection;
  reviewed = null;
  $('explain').disabled = true; $('review').hidden = true; $('result').hidden = true;
  $('payload').textContent = '';
  $('limitations').replaceChildren();
  const file = $('report').files[0];
  if (!file) { say('No report selected. Nothing has been sent.'); return; }
  say('Reading locally. Nothing has been sent.');
  try {
    if (file.size > REPORT_LIMIT) throw new Error('Report exceeds the 512 KiB file limit.');
    let report;
    try { report = JSON.parse(await file.text()); }
    catch { throw new Error('Invalid JSON file. Select an exported simulator JSON report.'); }
    if (current !== selection) return;
    const payload = prepareReport(report), summary = reviewSummary(payload);
    reviewed = payload;
    $('review-summary').textContent = `Existing outcome: ${summary.verdict}. ${summary.facts} synthetic evidence fields (${summary.bytes} bytes) will be sent. Verification: ${summary.verification}. Identifiers and free-text descriptions are excluded.`;
    $('verification-note').textContent = summary.voltage_context;
    $('payload').textContent = JSON.stringify(payload, null, 2);
    for (const limitation of STANDARD_LIMITATIONS) {
      const li = document.createElement('li'); li.textContent = limitation; $('limitations').appendChild(li);
    }
    $('review').hidden = false; $('explain').disabled = busy;
    say('Review ready. Nothing sent to OpenAI. Click Explain result to send this evidence once.');
  } catch (error) { if (current === selection) say(error.message || 'Could not read the report.'); }
});

$('explain').addEventListener('click', async () => {
  if (busy || !reviewed) return;
  busy = true;
  const snapshot = reviewed;
  $('explain').disabled = true; $('report').disabled = true; $('result').hidden = true;
  say('Requesting one live OpenAI explanation. No automatic retries.');
  try {
    const response = await fetch('/api/explain', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(snapshot),
      signal: AbortSignal.timeout(40000)
    });
    const body = await response.json();
    if (!response.ok) {
      // Server diagnostics contain constant reason codes and numeric counts only; never raw AI/report text.
      const diagnostic = body.diagnostics ? ` Diagnostics: ${JSON.stringify(body.diagnostics)}` : '';
      throw new Error((body.error || 'Explanation request failed. No automatic retry.') + diagnostic);
    }
    $('ai-summary').textContent = body.explanation.summary;
    $('model').textContent = `Live OpenAI response · model ${body.model}`;
    const facts = new Map(snapshot.evidence.map(e => [e.ref, e.value]));
    $('evidence').replaceChildren();
    for (const item of body.explanation.supporting_evidence) {
      const li = document.createElement('li');
      li.textContent = `${item.ref} = ${JSON.stringify(facts.get(item.ref))} — ${item.explanation}`;
      $('evidence').appendChild(li);
    }
    $('result').hidden = false;
    say('Explanation received. The original report and verdict have not changed.');
  } catch (error) {
    const known = error.name === 'TimeoutError' ? 'Local request timed out. No automatic retry.'
      : error instanceof TypeError ? 'Could not reach the local service. Restart it and try manually.' : error.message;
    say(known || 'Explanation failed. No content substituted and no automatic retry.');
  } finally {
    busy = false; $('report').disabled = false; $('explain').disabled = !reviewed;
  }
});
