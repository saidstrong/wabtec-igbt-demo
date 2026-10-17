import { validateEvidence, EVIDENCE_LIMIT } from '../ai-explainer/evidence.mjs';
import { explain, ExplainerError } from '../ai-explainer/openai.mjs';

const headers = { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store',
  'X-Content-Type-Options': 'nosniff' };
const reply = (status, body) => new Response(JSON.stringify(body), { status, headers });

async function readPayload(request) {
  if (!request.body) throw new ExplainerError(400, 'Expected JSON evidence.');
  const reader = request.body.getReader();
  const chunks = []; let bytes = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > EVIDENCE_LIMIT) {
        await reader.cancel();
        throw new ExplainerError(413, 'Sanitized evidence is too large.');
      }
      chunks.push(Buffer.from(value));
    }
  } finally { reader.releaseLock(); }
  let payload;
  try { payload = JSON.parse(Buffer.concat(chunks).toString('utf8')); }
  catch { throw new ExplainerError(400, 'Invalid JSON evidence.'); }
  try { validateEvidence(payload); }
  catch { throw new ExplainerError(400, 'Invalid sanitized report evidence.'); }
  return payload;
}

export function createHostedExplainer(options = {}) {
  // This lock is per warm function instance, not a global rate limit or authentication.
  let busy = false;
  return async function handle(request) {
    if (request.method !== 'POST') return reply(405, { error: 'Use POST.' });
    const origin = new URL(request.url).origin;
    const site = request.headers.get('sec-fetch-site');
    if (request.headers.get('origin') !== origin || (site && !['same-origin', 'none'].includes(site)))
      return reply(403, { error: 'Same-origin request required.' });
    if (request.headers.get('content-type')?.split(';')[0].trim() !== 'application/json')
      return reply(415, { error: 'Expected application/json.' });
    if (Number(request.headers.get('content-length')) > EVIDENCE_LIMIT)
      return reply(413, { error: 'Sanitized evidence is too large.' });
    if (busy) return reply(409, { error: 'An explanation is already in progress. No additional request sent.' });
    busy = true;
    try {
      const payload = await readPayload(request);
      const model = options.model ?? process.env.OPENAI_MODEL ?? 'gpt-4.1-mini';
      if (!/^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,99}$/.test(model))
        throw new ExplainerError(500, 'OPENAI_MODEL is invalid.');
      const result = await explain(payload, { ...options, model,
        apiKey: options.apiKey ?? process.env.OPENAI_API_KEY, signal: request.signal });
      return reply(200, { model, explanation: result });
    } catch (error) {
      const known = error instanceof ExplainerError;
      return reply(known ? error.status : 500, {
        error: known ? error.message : 'AI analysis failed. No automatic retry.',
        ...(known && error.diagnostics ? { diagnostics: error.diagnostics } : {})
      });
    } finally { busy = false; }
  };
}
