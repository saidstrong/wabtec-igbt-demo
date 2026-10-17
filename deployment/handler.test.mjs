import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFile, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { createHostedExplainer } from './handler.mjs';
import { prepareReport, requiredReferences } from '../ai-explainer/evidence.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const report = JSON.parse(execFileSync(process.execPath, ['igbt-test-cell/dev/run-node.js', 'S2', '--report'], { cwd: root, encoding: 'utf8' }));
const payload = prepareReport(report);
const explanation = {
  summary: 'FAIL in T05 Pulsed on-state voltage: 3.4 V exceeded the configured maximum of 3.2 V.',
  supporting_evidence: requiredReferences(payload).map(ref => ({ ref, explanation: 'Recorded evidence for this result.' }))
};
const envelope = { status: 'completed', output: [{ type: 'message', role: 'assistant',
  content: [{ type: 'output_text', text: JSON.stringify(explanation) }] }] };
const makeRequest = (body = payload, overrides = {}) => new Request('https://igbt.example/api/explain', {
  method: 'POST', headers: { origin: 'https://igbt.example', 'content-type': 'application/json', 'sec-fetch-site': 'same-origin', ...overrides },
  body: typeof body === 'string' ? body : JSON.stringify(body)
});

test('hosted HTTPS API returns the validated explanation with one upstream call', async () => {
  let calls = 0;
  const handler = createHostedExplainer({ apiKey: 'test-only-key', fetchImpl: async (url, options) => {
    calls++; assert.equal(url, 'https://api.openai.com/v1/responses');
    assert.equal(options.headers.Authorization, 'Bearer test-only-key');
    return Response.json(envelope);
  } });
  const response = await handler(makeRequest());
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.deepEqual(body.explanation, explanation); assert.equal(calls, 1);
  assert.ok(!JSON.stringify(body).includes('test-only-key'));
});

test('missing server key returns a controlled error without an upstream call', async () => {
  const handler = createHostedExplainer({ apiKey: '', fetchImpl: () => assert.fail('No paid call') });
  const response = await handler(makeRequest());
  assert.equal(response.status, 503);
});

test('foreign/missing origins and cross-site requests never call OpenAI', async () => {
  const handler = createHostedExplainer({ apiKey: 'test', fetchImpl: () => assert.fail('No upstream call') });
  for (const change of [{ origin: 'https://other.example' }, { origin: '' }, { 'sec-fetch-site': 'cross-site' }])
    assert.equal((await handler(makeRequest(payload, change))).status, 403);
});

test('wrong method and content type are rejected before model invocation', async () => {
  const handler = createHostedExplainer({ fetchImpl: () => assert.fail('No upstream call') });
  assert.equal((await handler(new Request('https://igbt.example/api/explain'))).status, 405);
  assert.equal((await handler(makeRequest(payload, { 'content-type': 'text/plain' }))).status, 415);
});

test('oversized, malformed and invalid evidence never reaches OpenAI', async () => {
  const handler = createHostedExplainer({ fetchImpl: () => assert.fail('No upstream call') });
  assert.equal((await handler(makeRequest('x'.repeat(32769)))).status, 413);
  assert.equal((await handler(makeRequest('['))).status, 400);
  assert.equal((await handler(makeRequest({ evidence: [] })) ).status, 400);
});

test('hosted adapter preserves the strict response validator', async () => {
  const invalid = { ...explanation, summary: 'FAIL because something failed.' };
  const handler = createHostedExplainer({ apiKey: 'test', fetchImpl: async () => Response.json({ ...envelope,
    output: [{ type: 'message', role: 'assistant', content: [{ type: 'output_text', text: JSON.stringify(invalid) }] }] }) });
  const response = await handler(makeRequest());
  assert.equal(response.status, 502);
  assert.ok((await response.json()).diagnostics.codes.includes('FAIL_CHECK_NOT_NAMED'));
});

test('concurrent request is refused and the per-instance lock is released', async () => {
  let unblock; const gate = new Promise(resolve => { unblock = resolve; });
  let signalStart; const started = new Promise(resolve => { signalStart = resolve; });
  const handler = createHostedExplainer({ apiKey: 'test', fetchImpl: async () => {
    signalStart(); await gate; return Response.json(envelope);
  } });
  const first = handler(makeRequest()); await started;
  assert.equal((await handler(makeRequest())).status, 409);
  unblock(); assert.equal((await first).status, 200);
  assert.equal((await handler(makeRequest())).status, 200);
});

test('build publishes only app assets, resolves every script and never embeds environment keys', async () => {
  execFileSync(process.execPath, ['deployment/build.mjs'], { cwd: root,
    env: { ...process.env, OPENAI_API_KEY: 'BUILD_SECRET_MUST_NOT_APPEAR' } });
  const publicURL = new URL('../public/', import.meta.url);
  assert.deepEqual((await readdir(publicURL)).sort(), ['app-ai.mjs', 'evidence.mjs', 'index.html', 'js']);
  const html = await readFile(new URL('index.html', publicURL), 'utf8');
  const original = await readFile(new URL('../igbt-test-cell/index.html', import.meta.url), 'utf8');
  assert.equal(html, original.replace('</body>', '<script type="module" src="/app-ai.mjs"></script>\n</body>'));
  for (const match of html.matchAll(/<script[^>]+src="([^"]+)"/g))
    assert.ok((await readFile(new URL(match[1].replace(/^\//, ''), publicURL))).length > 0);
  for (const name of ['index.html', 'app-ai.mjs', 'evidence.mjs', ...(await readdir(new URL('js/', publicURL))).map(n => 'js/' + n)])
    assert.ok(!(await readFile(new URL(name, publicURL), 'utf8')).includes('BUILD_SECRET_MUST_NOT_APPEAR'));
});
