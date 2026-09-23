# BerOpp AI backend

This folder contains a server-side Cloudflare Worker for the BerOpp AI Career & CV Studio.

## Why a backend is needed

The BerOpp website is hosted as a static GitHub Pages site. The OpenAI API key must **not** be placed in `index.html` or another public file.

The worker keeps `OPENAI_API_KEY` server-side and calls the OpenAI Responses API. BerOpp sends the user's CV/profile text and, when selected, the CV photo to the worker.

## Configuration

Set these Worker secrets/variables:

- `OPENAI_API_KEY` — your OpenAI API key, stored as a secret.
- `OPENAI_MODEL` — optional model name. Default: `gpt-5.6-luna`.

Do not commit an API key to GitHub.

## Connect the BerOpp website

After deploying the worker, set this browser local-storage value:

`beropp_ai_api_url` = your deployed Worker URL

The current BerOpp frontend will use the real backend when this value exists. If it is missing or the request fails, it keeps the local assistant as a fallback.

## Privacy

The worker does not create a database. The OpenAI request is made with `store: false`. Users should still review what personal information they choose to submit.

## OpenAI API

The worker uses the OpenAI Responses API with text and optional image input. See the official OpenAI documentation for current API details and model availability.


## Automatic deployment

The repository now contains `.github/workflows/worker.yml`. It deploys the Worker automatically whenever `backend/**` changes.

Before the first deployment, add these GitHub Actions repository secrets:

- `CLOUDFLARE_API_TOKEN` — a Cloudflare API token allowed to deploy Workers.
- `CLOUDFLARE_ACCOUNT_ID` — the Cloudflare account ID.

Then set the Worker secrets in Cloudflare:

```
wrangler secret put OPENAI_API_KEY
wrangler secret put OPENAI_MODEL
```

Use `gpt-5.6-luna` for `OPENAI_MODEL` if you want the cost-sensitive current model.

After deployment, copy the Worker URL (for example, the `*.workers.dev` URL) and set it in the browser once:

```js
localStorage.setItem("beropp_ai_api_url", "https://YOUR-WORKER-URL")
```

The website intentionally does not contain the OpenAI API key. If the Worker is not connected, the built-in local career assistant remains available.
