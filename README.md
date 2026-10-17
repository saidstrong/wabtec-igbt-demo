# IGBT Test Cell

Operator website for the Wabtec IEEE Hackathon case: prepare a module, check readiness, run tests,
review findings, generate an optional OpenAI analysis, export PDF or JSON reports, and share report PDFs.

## Deploy your website

Import this repository into Vercel with the **Other** preset and repository root (`.`).
Set **OPENAI_API_KEY** in Vercel's server environment and deploy. Build and routing are already configured.
The website opens at `/`; the original local `/app/` URL is supported through a redirect.

Full instructions and verification: [DEPLOY_VERCEL.md](DEPLOY_VERCEL.md).

## Local use

Requires Node 22 for the optional AI service and development commands. No dependencies are needed.

```sh
npm test
npm run selfcheck
npm run build
npm start
```

`npm start` opens the original service at `http://127.0.0.1:8787/app/`.
The standalone `igbt-test-cell/index.html` also works offline, with AI unavailable.

The current interface and reporting are based on upstream revision `de966f802f1fa499018bd6e732ac996232f58909`.
Underlying test readings are model-generated; physical hardware validation is outside this hackathon build.
The existing case notes and specifications remain in their original folders as project background.
