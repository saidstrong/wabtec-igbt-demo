import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { validateEvidence, EVIDENCE_LIMIT } from './evidence.mjs';
import { explain, ExplainerError } from './openai.mjs';

const assets = new Map([
  ['/', ['public/index.html', 'text/html']], ['/app.mjs', ['public/app.mjs', 'text/javascript']],
  ['/style.css', ['public/style.css', 'text/css']], ['/evidence.mjs', ['evidence.mjs', 'text/javascript']]
]);
const headers = {
  'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer',
  'Content-Security-Policy': "default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'"
};
// The test-cell app (igbt-test-cell/) is served read-only at /app/ so its report screen can request an analysis
// without a JSON download/upload. The app itself has no network code: the served index.html gets one added module,
// /app-ai.mjs, which registers window.IGBT_AI. Opened from file:// the app works as before, without AI.
const APP_DIR = new URL('../igbt-test-cell/', import.meta.url);
const APP_JS = /^\/app\/js\/([a-z]+)\.js$/;
const appHeaders = {
  ...headers,
  // Inline <style> in the app and in the report preview (srcdoc) needs style-src 'unsafe-inline'; scripts stay 'self' only.
  'Content-Security-Policy': "default-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; frame-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'self'"
};
async function serveApp(req, res) {
  let name, type;
  if (req.url === '/app/' || req.url === '/app/index.html') { name = 'index.html'; type = 'text/html'; }
  else if (req.url === '/app-ai.mjs') {
    const data = await readFile(new URL('public/app-ai.mjs', import.meta.url));
    res.writeHead(200, { ...appHeaders, 'Content-Type': 'text/javascript; charset=utf-8' }); res.end(data); return true;
  } else {
    const m = APP_JS.exec(req.url);
    if (!m) return false;
    name = 'js/' + m[1] + '.js'; type = 'text/javascript';
  }
  let data = await readFile(new URL(name, APP_DIR), 'utf8');
  if (name === 'index.html') {
    if (!data.includes('</body>')) throw new Error('index.html has no </body>');
    data = data.replace('</body>', '<script type="module" src="/app-ai.mjs"></script>\n</body>');
  }
  res.writeHead(200, { ...appHeaders, 'Content-Type': `${type}; charset=utf-8` }); res.end(data);
  return true;
}
function reply(res, status, data) {
  res.writeHead(status, { ...headers, 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(data));
}
async function body(req) {
  let bytes = 0; const chunks = [];
  for await (const chunk of req) {
    bytes += chunk.length;
    if (bytes > EVIDENCE_LIMIT) throw new ExplainerError(413, 'Sanitized evidence is too large.');
    chunks.push(chunk);
  }
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); }
  catch { throw new ExplainerError(400, 'Invalid JSON request. Select a valid simulator JSON report.'); }
}

export function createExplainerServer(options = {}) {
  let busy = false;
  const server = http.createServer(async (req, res) => {
    const authority = `127.0.0.1:${server.address().port}`;
    const origin = `http://${authority}`;
    const site = req.headers['sec-fetch-site'];
    if (req.headers.host !== authority || (req.headers.origin && req.headers.origin !== origin) ||
        (site && !['same-origin', 'none'].includes(site))) return reply(res, 403, { error: 'Unexpected host or origin. Use the printed loopback URL.' });
    if (req.method === 'GET' && assets.has(req.url)) {
      const [name, type] = assets.get(req.url);
      try {
        const data = await readFile(new URL(name, import.meta.url));
        res.writeHead(200, { ...headers, 'Content-Type': `${type}; charset=utf-8` }); res.end(data);
      } catch { reply(res, 500, { error: 'Local page files could not be read.' }); }
      return;
    }
    if (req.method === 'GET' && req.url === '/app') { res.writeHead(308, { ...headers, Location: '/app/' }); res.end(); return; }
    if (req.method === 'GET') {
      try { if (await serveApp(req, res)) return; }
      catch { return reply(res, 404, { error: 'Not found.' }); }
    }
    if (req.url !== '/api/explain') return reply(res, 404, { error: 'Not found.' });
    if (req.method !== 'POST') return reply(res, 405, { error: 'Use POST.' });
    if (req.headers.origin !== origin) return reply(res, 403, { error: 'Same-origin request required.' });
    if (req.headers['content-type']?.split(';')[0].trim() !== 'application/json') return reply(res, 415, { error: 'Expected application/json.' });
    if (Number(req.headers['content-length']) > EVIDENCE_LIMIT) return reply(res, 413, { error: 'Sanitized evidence is too large.' });
    if (busy) return reply(res, 409, { error: 'An explanation is already in progress. No additional request sent.' });
    busy = true;
    const controller = new AbortController();
    res.once('close', () => controller.abort());
    try {
      const payload = await body(req);
      try { validateEvidence(payload); } catch { throw new ExplainerError(400, 'Invalid sanitized report evidence. Select the original exported JSON again.'); }
      const model = options.model || process.env.OPENAI_MODEL || 'gpt-4.1-mini';
      if (!/^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,99}$/.test(model)) throw new ExplainerError(500, 'OPENAI_MODEL is invalid.');
      const result = await explain(payload, {
        ...options, model, apiKey: options.apiKey ?? process.env.OPENAI_API_KEY,
        signal: controller.signal
      });
      reply(res, 200, { model, explanation: result });
    } catch (error) {
      reply(res, error instanceof ExplainerError ? error.status : 500,
        { error: error instanceof ExplainerError ? error.message : 'Local explainer failed. No automatic retry.',
          ...(error instanceof ExplainerError && error.diagnostics ? { diagnostics: error.diagnostics } : {}) });
    } finally { busy = false; }
  });
  server.requestTimeout = 10000;
  server.headersTimeout = 10000;
  server.timeout = 45000;
  return server;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.PORT || 8787);
  if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('PORT must be between 1024 and 65535.');
  const server = createExplainerServer();
  server.on('error', () => { console.error('Cannot start local explainer. Check that PORT is free.'); process.exitCode = 1; });
  server.listen(port, '127.0.0.1', () => {
    console.log(`Report explainer: http://127.0.0.1:${port} (loopback only)`);
    console.log(`API key: ${process.env.OPENAI_API_KEY ? 'configured (hidden)' : 'missing; set OPENAI_API_KEY and restart'}`);
  });
}
