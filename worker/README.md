# Mal Griot chat worker

A small Cloudflare Worker that holds the Anthropic API key server-side and
answers `POST /chat` for the "Mal" chat widget on the main site. Deployed
independently of the static site (which stays on GitHub Pages).

## Local development

    npm install
    cp .dev.vars.example .dev.vars   # then paste in a real Anthropic API key
    npm run dev

This starts `wrangler dev`, usually on `http://127.0.0.1:8787`. Test it:

    curl -X POST http://127.0.0.1:8787/chat \
      -H "Content-Type: application/json" \
      -H "Origin: http://localhost:5500" \
      -d '{"messages":[{"id":"a1","role":"user","content":"do you do weddings?"}]}'

Point the frontend at this local URL by temporarily setting `CHAT_WORKER_URL`
in `chat.js` (repo root) to `http://127.0.0.1:8787/chat` while testing locally.

## Tests

    npm test

Runs Node's built-in test runner over `test/`. No live API calls are made;
Anthropic responses are stubbed.

## Deploying

    npx wrangler login
    npx wrangler secret put ANTHROPIC_API_KEY   # paste the real key when prompted
    npm run deploy

After the first deploy, `wrangler` prints the Worker's URL (something like
`https://mal-griot-chat.<your-subdomain>.workers.dev`). Copy the full URL
with `/chat` appended into `CHAT_WORKER_URL` near the top of `chat.js` in
the repo root, then commit and push that change so the live site points at
the deployed Worker.
