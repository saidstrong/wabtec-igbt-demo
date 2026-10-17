import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const context = { console, Blob, File, TextEncoder, TextDecoder, Uint8Array, ArrayBuffer,
  setTimeout, clearTimeout, atob, btoa, navigator: { userAgent: 'node' } };
context.window = context; context.self = context; vm.createContext(context);
for (const name of ['data', 'validate', 'rng', 'models', 'engine', 'sequencer', 'report', 'jspdf', 'autotable', 'pdffont', 'pdf'])
  vm.runInContext(await readFile(new URL('../igbt-test-cell/js/' + name + '.js', import.meta.url), 'utf8'), context, { filename: name });
const pdf = context.IGBT.pdf;
const sampleAI = {
  model: 'mock-test-only', generated_local: '2026-10-18T01:30:00+05:00',
  summary: 'FAIL in T01: diode forward drop is 0 V against a minimum of 0.2 V; reverse-open is false instead of true.',
  items: [{ label: 'T01 diode forward drop', value: 0, unit: 'V', explanation: 'The reading is below the configured minimum of 0.2 V.' }]
};

for (const scenario of ['S0', 'S1', 'S8b']) {
  test(scenario + ': share PDF has valid bytes, preserves report and includes Unicode operator', async () => {
    const report = JSON.parse(execFileSync(process.execPath, ['igbt-test-cell/dev/run-node.js', scenario, '--report'], { cwd: root, encoding: 'utf8' }));
    report.metadata.operator = 'Саид Аманжол';
    const before = JSON.stringify(report), result = pdf.create(report, { ai: scenario === 'S1' ? sampleAI : null });
    assert.equal(JSON.stringify(report), before); assert.equal(result.blob.type, 'application/pdf');
    assert.match(result.name, /\.pdf$/); const bytes = Buffer.from(await result.blob.arrayBuffer());
    assert.equal(bytes.subarray(0, 5).toString(), '%PDF-'); assert.ok(bytes.length > 10000);
    const out = new URL('../tmp/pdfs/', import.meta.url); await mkdir(out, { recursive: true });
    await writeFile(new URL(scenario + '.pdf', out), bytes);
  });
}

test('native file sharing is called synchronously with the actual PDF File', async () => {
  const file = new File(['%PDF-test'], 'report.pdf', { type: 'application/pdf' }); let called = false;
  const promise = pdf.shareFile(file, { navigator: {
    canShare: data => data.files[0] === file,
    share: data => { called = true; assert.equal(data.files[0].type, 'application/pdf'); return Promise.resolve(); }
  }, download: () => assert.fail('Must not download') });
  assert.equal(called, true); assert.equal(await promise, 'share');
});

test('unsupported file sharing downloads the PDF rather than sharing HTML or a URL', async () => {
  const file = new File(['%PDF-test'], 'report.pdf', { type: 'application/pdf' }); let downloaded;
  assert.equal(await pdf.shareFile(file, { navigator: { canShare: () => false }, download: value => { downloaded = value; } }), 'download');
  assert.equal(downloaded, file);
});

test('user cancellation does not trigger a download', async () => {
  assert.equal(await pdf.shareFile({}, { navigator: { canShare: () => true, share: () => Promise.reject({ name: 'AbortError' }) },
    download: () => assert.fail('No unexpected download') }), 'cancelled');
});

test('share permission failure falls back to downloading the same file', async () => {
  const file = {}; let downloaded;
  assert.equal(await pdf.shareFile(file, { navigator: { canShare: () => true, share: () => Promise.reject({ name: 'NotAllowedError' }) },
    download: value => { downloaded = value; } }), 'download');
  assert.equal(downloaded, file);
});
