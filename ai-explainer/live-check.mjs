// Explicit one-call smoke test. No secret, source report or response is printed.
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { prepareReport, validateEvidence } from './evidence.mjs';
import { explain } from './openai.mjs';

if (!process.env.OPENAI_API_KEY?.trim()) {
  console.error('LIVE CHECK NOT RUN: OPENAI_API_KEY is missing from the process environment.');
  process.exitCode = 1;
} else {
  try {
    const runner = fileURLToPath(new URL('../igbt-test-cell/dev/run-node.js', import.meta.url));
    const report = JSON.parse(execFileSync(process.execPath, [runner, 'S8b', '--report'], { encoding: 'utf8' }));
    const allowed = new Set(['/simulation', '/schema_version', '/deterministic/overall/verdict',
      '/deterministic/overall/is_acceptance_decision', '/deterministic/overall/abort_reason',
      '/deterministic/overall/block_reason', '/deterministic/inputs/profile_id',
      '/deterministic/inputs/profile_status', '/deterministic/inputs/noise_rel_sigma',
      '/deterministic/physical_total_s', '/deterministic/safe_state/verification',
      '/deterministic/safe_state/door', '/deterministic/safe_state/final_state',
      '/deterministic/safe_state/v_bus_at_verification_v']);
    const payload = validateEvidence({ evidence: prepareReport(report).evidence.filter(e => allowed.has(e.ref)) });
    await explain(payload, { apiKey: process.env.OPENAI_API_KEY, model: process.env.OPENAI_MODEL || 'gpt-4.1-mini' });
    console.log('LIVE CHECK PASS: one real structured response; valid source citations and unavailable-verification distinction.');
  } catch (error) {
    const diagnostic = error.diagnostics ? ` Diagnostics: ${JSON.stringify(error.diagnostics)}` : '';
    console.error(`LIVE CHECK FAIL: ${error.status ? error.message : 'Local report or configuration error.'}${diagnostic}`);
    process.exitCode = 1;
  }
}
