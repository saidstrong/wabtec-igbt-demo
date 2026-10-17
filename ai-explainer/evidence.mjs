// Shared, dependency-free projection. Never forward arbitrary report prose or metadata.
export const REPORT_LIMIT = 512 * 1024;
export const EVIDENCE_LIMIT = 32 * 1024;
export const VERDICT_REF = '/deterministic/overall/verdict';
export const VERIFY_REF = '/deterministic/safe_state/verification';
// Fixed application disclosures, never generated report-specific claims or fallback AI content.
export const STANDARD_LIMITATIONS = Object.freeze([
  'All readings and events are synthetic; no physical module, measurement chain or industrial safety system was validated.',
  'Rules are illustrative and NOT APPROVED; this explanation is not an acceptance, certification or safety decision.',
  'Physical durations are engineering estimates, not measured test-cycle times.',
  'Generated commentary can be wrong; check cited evidence against the original report.'
]);
const quantityStages = {
  Q01: 'T01', Q02: 'T01', Q03: 'T02', Q03b: 'T02', Q04: 'T02',
  Q05: 'T03', Q06: 'T03', Q07: 'T03', Q08: 'T04', Q09: 'T05',
  Q10: 'T06', Q11: 'T07', Q12: 'T08a', Q13: 'T08a', Q14: 'T09', Q16: 'T08a', Q18: 'T10'
};
const stages = ['T00', 'T01', 'T02', 'T03', 'T06', 'T04', 'T05', 'T07', 'T08a', 'T08b', 'T09', 'T10'];
const stageStates = ['DONE', 'BLOCKED', 'NOT_APPLICABLE', 'NOT_MODELLED', 'NOT_RUN', 'INTERRUPTED'];
const eventTypes = ['ABORT_TRIGGER', 'DISCHARGE_START', 'DISCHARGE_NOT_REQUIRED', 'DISCHARGE_VERIFIED',
  'DISCHARGE_FAILED', 'VERIFICATION_UNAVAILABLE', 'FAULT_LOCKED', 'DOOR_UNLOCKED', 'RUN_END', 'CONFIG_BLOCKED'];
const oneOf = values => v => values.includes(v);
const numeric = v => typeof v === 'number' && Number.isFinite(v) && Math.abs(v) <= 1e9;
const nullableNumber = v => v === null || numeric(v);
const boolean = v => typeof v === 'boolean';
const scalar = v => v === null || numeric(v) || boolean(v);
const nullableEnum = values => oneOf([null, ...values]);
const specs = {
  '/simulation': v => v === true,
  '/schema_version': v => v === '0.3',
  '/deterministic/overall/verdict': oneOf(['PASS', 'FAIL', 'ABORTED', 'INCOMPLETE', 'NOT EVALUATED']),
  '/deterministic/overall/is_acceptance_decision': v => v === false,
  '/deterministic/overall/abort_reason': nullableEnum(['OPERATOR', 'WATCHDOG', 'SAFE_STATE_NOT_VERIFIED', ...Array.from({ length: 7 }, (_, i) => `IL${i + 1}_OPEN`)]),
  '/deterministic/overall/block_reason': nullableEnum(['CONFIGURATION_PREFLIGHT']),
  '/deterministic/inputs/profile_id': oneOf(['demo', 'production_unconfigured']),
  '/deterministic/inputs/profile_status': oneOf(['demo', 'production_unconfigured']),
  '/deterministic/inputs/noise_rel_sigma': v => numeric(v) && v >= 0 && v <= 0.05,
  '/deterministic/physical_total_s': v => numeric(v) && v >= 0,
  [VERIFY_REF]: oneOf(['VERIFIED', 'DISCHARGE_FAILED', 'VERIFICATION_UNAVAILABLE']),
  '/deterministic/safe_state/trigger': oneOf(['NORMAL_COMPLETION', 'ABORT']),
  '/deterministic/safe_state/door': oneOf(['LOCKED', 'UNLOCKED']),
  '/deterministic/safe_state/final_state': oneOf(['SAFE', 'FAULT_LOCKED']),
  '/deterministic/safe_state/v_bus_at_start_v': nullableNumber,
  '/deterministic/safe_state/v_bus_at_verification_v': nullableNumber,
  '/deterministic/safe_state/discharge_time_s': nullableNumber,
  ...Object.fromEntries(['gate_off_commanded', 'gate_off_confirmed', 'hv_source_disabled', 'contactor_open', 'discharge_required']
    .map(k => [`/deterministic/safe_state/${k}`, boolean]))
};
const readingSpecs = {
  quantity_id: oneOf(Object.keys(quantityStages)), unit: oneOf(['V', 'W', 'mA', 'µs', 'A/µs', 'boolean', '', 'bool']),
  value: scalar, verdict: oneOf(['PASS', 'FAIL', 'INFO', 'NOT RUN']),
  observation: oneOf(['OBSERVED', 'NOT_OBSERVED_IN_WINDOW', 'NOT_MEASURED']),
  rule_basis: nullableEnum(['CASE_INFERRED', 'CASE_TRANSFERRED', 'INVENTED_TOLERANCE', 'INVENTED']),
  approval_status: v => v === 'NOT_APPROVED',
  'rule/type': oneOf(['window', 'max', 'min', 'bool', 'boolean', 'time_max', 'info']),
  'rule/min': nullableNumber, 'rule/max': nullableNumber, 'rule/expect': scalar
};
const get = (obj, ref) => ref.split('/').slice(1).reduce((v, key) => v?.[key], obj);
const size = value => new TextEncoder().encode(JSON.stringify(value)).length;
function invalid() { throw new Error('Invalid simulator JSON: expected a complete schema 0.3 synthetic report with supported fields.'); }
function specFor(ref) {
  if (Object.hasOwn(specs, ref)) return specs[ref];
  let m = ref.match(/^\/deterministic\/stages\/(\d|1[01])\/(test_id|status)$/);
  if (m) return m[2] === 'test_id' ? oneOf(stages) : oneOf(stageStates);
  m = ref.match(/^\/deterministic\/stages\/(\d|1[01])\/readings\/(\d|1\d)\/(quantity_id|unit|value|verdict|observation|rule_basis|approval_status|rule\/(?:type|min|max|expect))$/);
  if (m) return readingSpecs[m[3]];
  m = ref.match(/^\/deterministic\/events\/(\d{1,3})\/(type|stage|physical_time_s)$/);
  if (m && Number(m[1]) < 200) return m[2] === 'type' ? oneOf(eventTypes) : m[2] === 'stage' ? nullableEnum(stages) : v => numeric(v) && v >= 0;
  return null;
}

// Also run at the server boundary: client-supplied paths and text are not trusted.
export function validateEvidence(payload) {
  if (!payload || Object.keys(payload).sort().join(',') !== 'evidence' || !Array.isArray(payload.evidence) ||
      payload.evidence.length < 10 || payload.evidence.length > 350 || size(payload) > EVIDENCE_LIMIT) invalid();
  const seen = new Set();
  for (const item of payload.evidence) {
    if (!item || Object.keys(item).sort().join(',') !== 'ref,value' || typeof item.ref !== 'string' || seen.has(item.ref)) invalid();
    const check = specFor(item.ref);
    if (!check || !check(item.value)) invalid();
    seen.add(item.ref);
  }
  for (const ref of ['/simulation', '/schema_version', VERDICT_REF, '/deterministic/overall/is_acceptance_decision',
    '/deterministic/overall/abort_reason', '/deterministic/overall/block_reason', '/deterministic/inputs/profile_id',
    '/deterministic/inputs/profile_status', '/deterministic/inputs/noise_rel_sigma', '/deterministic/physical_total_s']) {
    if (!seen.has(ref)) invalid();
  }
  const fields = new Map(payload.evidence.map(e => [e.ref, e.value]));
  const verification = fields.get(VERIFY_REF);
  if (fields.has('/deterministic/safe_state/v_bus_at_verification_v') && !verification) invalid();
  if (verification) {
    const safe = verification === 'VERIFIED';
    if (fields.get('/deterministic/safe_state/door') !== (safe ? 'UNLOCKED' : 'LOCKED') ||
        fields.get('/deterministic/safe_state/final_state') !== (safe ? 'SAFE' : 'FAULT_LOCKED') ||
        (!safe && fields.get(VERDICT_REF) !== 'ABORTED')) invalid();
  }
  return payload;
}

export function prepareReport(report) {
  if (!report || size(report) > REPORT_LIMIT || !Array.isArray(report.deterministic?.stages) ||
      report.deterministic.stages.length !== stages.length || !Array.isArray(report.deterministic.events) ||
      report.deterministic.events.length > 200) invalid();
  const evidence = [];
  const add = ref => { const value = get(report, ref); if (value === undefined) invalid(); evidence.push({ ref, value }); };
  for (const ref of Object.keys(specs)) {
    if (ref.startsWith('/deterministic/safe_state/') && report.deterministic.safe_state === null) continue;
    add(ref);
  }
  report.deterministic.stages.forEach((stage, i) => {
    const prefix = `/deterministic/stages/${i}`;
    if (stage.test_id !== stages[i] || !Array.isArray(stage.readings) || stage.readings.length > 20) invalid();
    add(prefix + '/test_id'); add(prefix + '/status');
    const ids = new Set();
    stage.readings.forEach((reading, j) => {
      if (quantityStages[reading.quantity_id] !== stage.test_id || ids.has(reading.quantity_id)) invalid();
      ids.add(reading.quantity_id);
      const keys = ['quantity_id', 'unit', 'value', 'verdict', 'observation', 'rule_basis', 'approval_status'];
      if (reading.verdict === 'FAIL') keys.push('rule/type', 'rule/min', 'rule/max', 'rule/expect');
      keys.forEach(key => add(`${prefix}/readings/${j}/${key}`));
    });
  });
  report.deterministic.events.forEach((event, i) => {
    if (eventTypes.includes(event.type)) ['type', 'stage', 'physical_time_s'].forEach(key => add(`/deterministic/events/${i}/${key}`));
  });
  return validateEvidence({ evidence });
}

export function verificationContext(payload) {
  validateEvidence(payload);
  const status = payload.evidence.find(e => e.ref === VERIFY_REF)?.value || 'NOT_RUN';
  const meanings = {
    VERIFIED: 'The bench verification ran and reported VERIFIED. This is a recorded verification step, not physical testing or an independently verified physical measurement.',
    DISCHARGE_FAILED: 'The bench verification ran and reported failed discharge (DISCHARGE_FAILED). Verification was available; it did not confirm a safe discharge. This is not a physical measurement.',
    VERIFICATION_UNAVAILABLE: 'Bus voltage is a model estimate; verification is unavailable. It is not an independently verified reading.',
    NOT_RUN: 'No safe-state verification procedure ran in this report.'
  };
  return { status, meaning: meanings[status] };
}

export function reviewSummary(payload) {
  const context = verificationContext(payload);
  const values = new Map(payload.evidence.map(e => [e.ref, e.value]));
  const verification = values.get(VERIFY_REF) || 'Procedure not run';
  return {
    verdict: values.get(VERDICT_REF), verification, facts: payload.evidence.length, bytes: size(payload),
    voltage_context: context.meaning
  };
}

// ---- Readable names and the decisive evidence (application-owned constants; never read from report prose) ----
// Names mirror igbt-test-cell/js/data.js (stages, rule labels); a test checks they stay equal.
export const STAGE_NAMES = Object.freeze({
  T00: 'Identification, visual, bench self-check', T01: 'Terminal integrity and freewheeling-diode check',
  T02: 'Gate-driver supply behaviour', T03: 'Fibre command/status loop and gate levels', T06: 'Gate threshold',
  T04: 'Insulation leakage to baseplate', T05: 'Pulsed on-state voltage', T07: 'Blocking leakage at test voltage',
  T08a: 'Double pulse: DUT transistor switching', T08b: 'Double pulse: DUT diode reverse recovery',
  T09: 'Out-of-saturation protection response', T10: 'Safe state and discharge verification'
});
export const QUANTITY_LABELS = Object.freeze({
  Q01: 'Diode forward drop (low-current check)', Q02: 'Diode reverse direction reads open', Q03: 'Driver supply power, idle',
  Q03b: 'Driver idle power, plausible band', Q04: 'Driver supply power, switching', Q05: 'Fibre status answers command',
  Q06: 'Gate level, commanded ON', Q07: 'Gate level, commanded OFF', Q10: 'Gate threshold',
  Q08: 'Insulation leakage, module to baseplate', Q09: 'V_CE(sat) at pulse current', Q11: 'Blocking leakage at test voltage',
  Q16: 'Pulse-1 width t1', Q12: 'Switching di/dt', Q13: 'V_CE peak at turn-off', Q14: 'Protection response time',
  Q18: 'Gate voltage after OFF command'
});
export const ABORT_REF = '/deterministic/overall/abort_reason';
const READING_RE = /^\/deterministic\/stages\/(\d+)\/readings\/(\d+)\/(.+)$/;

// Failed readings in stage order, with the configured limit they violated (null for boolean rules).
export function failedChecks(payload) {
  const facts = new Map(payload.evidence.map(e => [e.ref, e.value])), out = [];
  for (const { ref, value } of payload.evidence) {
    const m = ref.match(READING_RE);
    if (!m || m[3] !== 'verdict' || value !== 'FAIL') continue;
    const base = `/deterministic/stages/${m[1]}/readings/${m[2]}/`;
    const v = facts.get(base + 'value'), type = facts.get(base + 'rule/type');
    const min = facts.get(base + 'rule/min'), max = facts.get(base + 'rule/max');
    let limit = null, bound = null;
    if (typeof v === 'number') {
      if ((type === 'max' || type === 'time_max') && typeof max === 'number') { limit = max; bound = 'maximum'; }
      else if (type === 'min' && typeof min === 'number') { limit = min; bound = 'minimum'; }
      else if (type === 'window') {
        if (typeof max === 'number' && v > max) { limit = max; bound = 'maximum'; }
        else if (typeof min === 'number') { limit = min; bound = 'minimum'; }
      }
    }
    out.push({ valueRef: base + 'value', test_id: facts.get(`/deterministic/stages/${m[1]}/test_id`),
      quantity_id: facts.get(base + 'quantity_id'), unit: facts.get(base + 'unit'), value: v, limit, bound,
      expect: facts.get(base + 'rule/expect') });
  }
  return out;
}

// The bench is the decisive finding only when verification did not succeed or the bench locked out. Otherwise the
// report renders bench status from the recorded fields and the explanation stays on the module findings.
export function benchIsDecisive(payload) {
  const facts = new Map(payload.evidence.map(e => [e.ref, e.value]));
  return facts.has(VERIFY_REF) && (facts.get(VERIFY_REF) !== 'VERIFIED' || facts.get('/deterministic/safe_state/final_state') === 'FAULT_LOCKED');
}

// Mandatory refs: verdict, verification (when the bench is decisive), the stop trigger for an interruption, and the
// decisive failed reading values (as many as fit within the evidence maximum).
export function requiredReferences(payload, maxItems = 4) {
  const facts = new Map(payload.evidence.map(e => [e.ref, e.value]));
  const refs = [VERDICT_REF];
  if (benchIsDecisive(payload)) refs.push(VERIFY_REF);
  const stop = facts.get(ABORT_REF);
  if (stop && stop !== 'SAFE_STATE_NOT_VERIFIED') refs.push(ABORT_REF);
  if (facts.get(VERDICT_REF) === 'FAIL') for (const f of failedChecks(payload)) { if (refs.length >= maxItems) break; refs.push(f.valueRef); }
  return refs;
}

// Readable label and value for a cited ref (for display; the ref itself stays internal).
export function describeRef(payload, ref) {
  const facts = new Map(payload.evidence.map(e => [e.ref, e.value])), value = facts.get(ref);
  const fixed = { [VERDICT_REF]: 'Overall result', [VERIFY_REF]: 'Safe-state verification', [ABORT_REF]: 'Stop trigger',
    '/deterministic/overall/block_reason': 'Block reason', '/deterministic/safe_state/door': 'Enclosure door',
    '/deterministic/safe_state/final_state': 'Final bench state', '/deterministic/safe_state/v_bus_at_verification_v': 'Bus voltage at verification',
    '/deterministic/safe_state/v_bus_at_start_v': 'Bus voltage at start', '/deterministic/safe_state/discharge_time_s': 'Discharge time',
    '/deterministic/safe_state/trigger': 'Safe-state trigger', '/deterministic/physical_total_s': 'Estimated physical duration' };
  if (fixed[ref]) return { label: fixed[ref], value };
  let m = ref.match(READING_RE);
  if (m) {
    const t = facts.get(`/deterministic/stages/${m[1]}/test_id`), q = facts.get(`/deterministic/stages/${m[1]}/readings/${m[2]}/quantity_id`);
    const unit = facts.get(`/deterministic/stages/${m[1]}/readings/${m[2]}/unit`);
    const field = m[3] === 'value' ? '' : ' (' + m[3].replace('rule/', 'rule ') + ')';
    return { label: `${t} ${QUANTITY_LABELS[q] || q}${field}`, value, unit: m[3] === 'value' && unit && unit !== 'bool' && unit !== 'boolean' ? unit : '' };
  }
  m = ref.match(/^\/deterministic\/stages\/(\d+)\/(test_id|status)$/);
  if (m) { const t = facts.get(`/deterministic/stages/${m[1]}/test_id`); return { label: `${t} ${STAGE_NAMES[t] || ''} ${m[2] === 'status' ? 'status' : ''}`.trim(), value }; }
  m = ref.match(/^\/deterministic\/events\/(\d+)\/(type|stage|physical_time_s)$/);
  if (m) return { label: `Event ${facts.get(`/deterministic/events/${m[1]}/type`) || ''} ${m[2] === 'physical_time_s' ? 'time' : m[2]}`.trim(), value };
  return { label: ref.split('/').pop().replace(/_/g, ' '), value };
}
