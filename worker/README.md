# Mal Griot chat worker

A small Cloudflare Worker that calls Cloudflare Workers AI and answers
`POST /chat` for the "Mal" chat widget on the main site. Deployed
independently of the static site (which stays on GitHub Pages).

Uses Workers AI (`@cf/meta/llama-3.3-70b-instruct-fp8-fast`) rather than a
third-party API: it's free up to 10,000 neurons/day (resets daily, no
credit card required), and auth rides on your Cloudflare account via the
Worker's own `AI` binding in `wrangler.toml` — there's no separate API key
to create, store, or rotate.

## Local development

    npm install
    npm run dev

This starts `wrangler dev`, usually on `http://127.0.0.1:8787`. The `AI`
binding talks to the real Workers AI service even in local dev (Workers AI
isn't emulated locally), so this needs you to be logged in — see Deploying
below if `npm run dev` complains about auth. Test it:

    curl -X POST http://127.0.0.1:8787/chat \
      -H "Content-Type: application/json" \
      -H "Origin: http://localhost:5500" \
      -d '{"messages":[{"id":"a1","role":"user","content":"do you do weddings?"}]}'

Point the frontend at this local URL by temporarily setting `CHAT_WORKER_URL`
in `chat.js` (repo root) to `http://127.0.0.1:8787/chat` while testing locally.

## Tests

    npm test

Runs Node's built-in test runner over `test/`. No live Workers AI calls are
made; `env.AI.run` is stubbed.

## Deploying

    npx wrangler login
    npm run deploy

`wrangler login` opens a browser to authorize against your Cloudflare
account (free — no separate signup needed if you already have a Cloudflare
account for anything else). No secret needs to be set: Workers AI billing
and auth are tied to that same account, not a key passed by this project.

After the first deploy, `wrangler` prints the Worker's URL (something like
`https://mal-griot-chat.<your-subdomain>.workers.dev`). Copy the full URL
with `/chat` appended into `CHAT_WORKER_URL` near the top of `chat.js` in
the repo root, then commit and push that change so the live site points at
the deployed Worker.

## A note on model quality

Llama 3.3 70B is a strong open model, but it's not as reliable as a
frontier model like Claude at consistently following a long list of
behavioral rules (no en dash, exactly one hand emoji, always opening the
first reply with "Peace and love!", etc. — see `src/systemPrompt.js`). If
the bot occasionally slips on one of these, that's the tradeoff for a
completely free backend; the fixes that matter most for user experience
(input length, message-count, contact-link safety) are enforced in code,
not just prompted, so they hold regardless of the model's mood.
