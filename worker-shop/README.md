# Mal Griot book shop worker

A small Cloudflare Worker that powers the "f a l l i n g under where" purchase
flow on the Poetry page: creates Razorpay orders, verifies payments
server-side, tracks orders and physical inventory in D1, and hands out
time-limited signed download links for the PDF (stored privately in R2 —
never in this git repo, never on GitHub Pages).

Deployed independently of the static site, same pattern as `worker/` (the
chat bot worker) next to it.

## Why a backend at all

GitHub Pages is static and can't hold secrets, verify a payment, or gate a
file behind a login. This worker is the smallest layer that can:

- decide the real price/shipping/total for an order (never trust a number
  the browser sends),
- verify a Razorpay payment signature server-side before marking anything paid,
- keep the PDF in a private R2 bucket and only ever serve it behind a
  signed, expiring token — never a public URL anyone could discover by
  viewing page source.

## One-time setup

```bash
cd "worker-shop"
npm install
npx wrangler login

# Database for orders + the physical-inventory counter
npx wrangler d1 create book-shop
# → copy the printed database_id into wrangler.toml's [[d1_databases]] block
npm run db:init:remote

# Private bucket for the PDF. Do NOT enable public access on this bucket.
npx wrangler r2 bucket create mal-griot-book-private
npx wrangler r2 object put mal-griot-book-private/falling-under-where.pdf --file=/path/to/falling-under-where.pdf

# Secrets — never committed, never in wrangler.toml
npx wrangler secret put RAZORPAY_KEY_ID
npx wrangler secret put RAZORPAY_KEY_SECRET
npx wrangler secret put DOWNLOAD_TOKEN_SECRET   # e.g. `openssl rand -hex 32`
# Optional, enables the confirmation email:
npx wrangler secret put RESEND_API_KEY
npx wrangler secret put RESEND_FROM             # e.g. "Mal Griot <books@yourdomain.com>"
```

Get Razorpay keys from the Razorpay dashboard → Settings → API Keys. Use
test-mode keys while developing; switch to live keys only once you're ready
to take real payments.

## Deploying

```bash
npm run deploy
```

After the first deploy, wrangler prints this worker's URL (something like
`https://mal-griot-book-shop.<your-subdomain>.workers.dev`). Do two things
with it:

1. Update `SELF_URL` in `wrangler.toml` to that URL, then redeploy — it's
   used to build the absolute download link sent back to the browser/email.
2. Set `BOOK_SHOP_WORKER_URL` near the top of `book-shop.js` (repo root) to
   the same URL, then commit and push so the live site points at it.

## Restocking physical copies

```bash
npx wrangler d1 execute book-shop --remote --command "UPDATE inventory SET physical_count = 50 WHERE id = 1"
```

Physical/bundle checkout disables itself automatically once the counter
hits zero; PDF stays available (digital "inventory" is unlimited by
design — see `TRACK_INVENTORY` in `src/config.js`).

## Changing prices, titles, or what's for sale

Everything lives in one object: `src/config.js`'s `BOOK_CONFIG`. This is the
only place prices are decided — the frontend only ever displays what
`GET /api/config` reports, and every checkout is priced again from this
object server-side regardless of what the browser sends.

## Local development

```bash
npm run dev
```

D1 and R2 bindings run against local emulated storage by default (separate
from your remote/production data) — see `wrangler dev` docs if you want to
target the remote resources instead. Point `book-shop.js`'s
`BOOK_SHOP_WORKER_URL` at the printed `http://127.0.0.1:8787` while testing.

## Tests

```bash
npm test
```

Covers the pure logic (pricing/shipping math, signed-download-token
signing/verification/expiry) with Node's built-in test runner — no live
Razorpay, D1, or R2 calls are made.

## Order lifecycle

`POST /api/orders` creates a D1 row with `payment_status = 'created'` and a
matching Razorpay order. The browser opens Razorpay Checkout with that order
id, and on success calls `POST /api/orders/:id/verify` with the payment id
and signature Razorpay's Checkout.js handed back. This worker recomputes the
expected HMAC signature itself and only then marks the order paid — a
browser claiming "payment succeeded" with no valid signature is rejected.
Once paid, a physical/bundle order reserves one unit from the `inventory`
table (rejected if stock hit zero between checkout and payment — the order
is still recorded as paid with `physical_fulfillment = 'Cancelled'` for
manual follow-up), and a pdf/bundle order gets a signed download link good
for `DOWNLOAD_LINK_TTL_SECONDS`.
