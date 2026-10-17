# Deploy IGBT Test Cell

Website source: approved `said/ui-premium` revision `de966f802f1fa499018bd6e732ac996232f58909`.
The deployment adapter preserves that revision's app, report, engine and AI validation byte for byte.

## Import

1. In Vercel choose Add New → Project and import `saidstrong/wabtec-igbt-demo`.
2. Production branch: `main`. Root Directory: the repository root (`.`).
3. Framework Preset: **Other**. The committed configuration supplies `npm run build`, output `public`, and Node 22.
4. Add **OPENAI_API_KEY** to the server environment for Production (and Preview only if you want AI on previews).
   Do not prefix the name with `NEXT_PUBLIC_`, paste the key into a file, or enter it in browser code.
5. Deploy. Open the generated HTTPS URL at `/`; `/app/` also redirects there.

Optional: `OPENAI_MODEL`, default `gpt-4.1-mini`. If you change environment variables after deploying, redeploy.

## How hosting works

`npm run build` publishes only the operator page, its classic scripts, and two browser helpers.
`POST /api/explain` runs as a Vercel Node function, reads the key server-side, validates the same sanitized evidence,
and uses the unchanged OpenAI request/response checks. One click makes one request; there is no automatic retry.
There is no need to start the localhost server on Vercel.

The site is accessible to people with its URL; visitors can use the AI button and consume API credits.
Keep deployment access restricted while rehearsing and set a suitable spending limit in your OpenAI project.
Same-origin checks and the per-instance concurrency lock are not visitor authentication or a global quota.

## Verify after deployment

Complete a test, generate one AI analysis, and save the PDF. Check the failure/value/limit or recorded bench issue
matches the results. Download JSON and HTML; confirm the HTML includes the same generated analysis.
No deployment-side paid request was made while preparing this adapter.

## Local and offline

- `npm test`: AI and hosting-adapter tests with mocked upstream calls.
- `npm run selfcheck`: existing simulator checks.
- `npm run build`: generate the public website without reading secrets.
- `npm start`: original loopback service at `http://127.0.0.1:8787/app/`.
- Open `igbt-test-cell/index.html` directly for the offline website without AI.

Reports remain local to the browser; no report database was added.
