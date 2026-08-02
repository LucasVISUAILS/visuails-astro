# Mollie — how it is wired, and how to test the €0.99 sample

Mollie is connected for exactly one thing: the **€0.99 test sample**. Every
other service on the site still goes straight to the thank-you page with no
payment step, on purpose — see "What is deliberately not wired" at the bottom.

Both halves of the loop now exist. Until August 2026 only the first did:

| | File | What it does |
|---|---|---|
| Out | `functions/api/order.js` → `src/lib/mollie.js` | creates a Mollie payment and redirects the customer to Mollie's checkout |
| Back | `functions/api/webhook/mollie.js` | **new** — Mollie calls it, it verifies with Mollie, and marks the order paid |

Without the second one, a customer could pay and the order would read
"payment pending" in `/admin` forever. The URL was being handed to Mollie
already; nothing was serving it.

---

## The thing to understand before anything else

**Mollie's webhook contains no status and no signature.** The entire body is:

```
id=tr_5B8cwPMGnU6qLbRvo7qEZo
```

That is not an oversight, it is the design. Mollie's own wording: *"Since the
status is not transmitted in the webhook, fake calls to your webhook will never
result in orders being processed without being actually paid."*

So the handler does not check a signature — there isn't one. It takes the id,
**asks Mollie's API what that payment actually did**, using our own key, and
believes only the answer. Anyone on the internet can POST an id to
`/api/webhook/mollie`. Nobody can make Mollie's API say `paid` for a payment
that was not.

This is the opposite of how the Stripe handler next door works, which is why
the two files do not look alike.

---

## Setting the key

You need this once, and I cannot do it for you — an API key is a credential and
I do not handle those.

**1 · Get the test key.** Mollie dashboard → *Developers* → *API keys*. There
are two, and they are distinguishable at a glance: the test one starts with
`test_`, the live one with `live_`. Take the `test_` one.

**2 · Put it in Cloudflare.** It is a secret, so it must **not** go in
`wrangler.toml` — that file is in git. Either:

```
npx wrangler pages secret put MOLLIE_API_KEY
```

or the dashboard: your Pages project → *Settings* → *Variables and Secrets* →
add `MOLLIE_API_KEY` as an encrypted **Secret**, not a plaintext variable.

**3 · Redeploy.** A newly-added secret only reaches a new deployment.

There is nothing else to configure. In particular there is **no webhook URL to
register in Mollie's dashboard** — unlike Stripe, Mollie takes the webhook URL
per payment, and `order.js` already sends it (`<origin>/api/webhook/mollie`).
That also means the webhook automatically follows whichever deployment created
the payment, which matters in step 2 of the walkthrough.

---

## Testing the €0.99 sample, end to end

### It has to be the deployed site, not localhost

Mollie calls your webhook from its own servers, so the URL has to be reachable
from the public internet. `localhost:4321` is not, and Mollie rejects it
outright at payment-creation time. Test on `visuails.com` or on a
`*.pages.dev` preview deployment.

If you genuinely need to run it against your own machine, that is what ngrok is
for — but for this loop the deployed preview is simpler and closer to real.

### The walkthrough

1. **Go to `/test-sample`** on the deployed site and complete the form as a
   customer would. Use a real address you can read — the confirmation email
   goes out before the payment step.
2. **You land on Mollie's test checkout.** Because the key is a `test_` key,
   Mollie replaces its normal hosted payment page with a test screen that lets
   you *choose the outcome*. That screen is the whole point of test mode.
3. **Pick `paid`.** Mollie fires the webhook within a few seconds.
4. **Check `/admin`.** The order should now read `payment paid`, and its
   timeline should carry:

   > Payment received via Mollie (tr_…) — **TEST MODE, no money moved**

   That suffix is deliberate. A test payment writes a real `paid` into the real
   database, and six weeks from now that label is the only thing telling it
   apart from a genuine €0.99.

5. **Then do it again and pick `failed` or `expired`.** The order must stay
   unpaid and nothing must appear in its timeline. A payment integration that
   only gets tested on the happy path is a payment integration that marks
   things paid when they are not.

### What "it worked" looks like in the logs

```
npx wrangler pages deployment tail
```

On success:

```
[mollie-webhook] order VIS-XXXX-XXX marked paid from tr_… (test)
```

On a chosen failure:

```
[mollie-webhook] tr_… is "failed" (test) — acknowledged, order unchanged
```

### If nothing happens

Work down this list; it is ordered by how often each one is the answer.

| Symptom | Almost always |
|---|---|
| Never reached Mollie at all, went straight to thank-you | `MOLLIE_API_KEY` is not set on **this** deployment, or the deployment predates the secret. `order.js` fails open on purpose — a missing key must not cost you the order. |
| Paid on Mollie, order still pending | Open `https://<your-site>/api/webhook/mollie` in a browser. It should answer `{"ok":true,"route":"mollie-webhook","method":"POST"}`. A 404 means the deployment does not have the function yet. |
| Log says `no order … in this database` | The payment was created on one deployment and the webhook landed on another. Preview and production share a Mollie account but **not** a D1 database. Create and pay in the same place. |
| Log says `Mollie will not give us tr_…` | The key cannot see that payment — a live id at a test key, or vice versa. Test entities cannot be read in live mode, or the other way round. |
| Nothing in the log at all | Mollie never called. Check the payment in Mollie's dashboard: it lists the webhook attempts and their responses. |

Mollie retries a failed webhook up to 10 times over about 26 hours, so a
misconfiguration you fix within the day will still land. It gives up after
that, and it times out a single call at 15 seconds.

---

## What the handler does with each status

`paid` is the only one that touches the order.

| Status | Final? | What happens |
|---|---|---|
| `paid` | yes | order → `payment_status = 'paid'`, `payments` row, timeline event |
| `canceled` `expired` `failed` | yes | acknowledged, order untouched — the customer can pay again from the same order |
| `open` `pending` | no | acknowledged, nothing to do yet |
| `authorized` | no | acknowledged and **not** treated as paid. It is a hold, not a payment. No method offered today can produce it; it is handled anyway so that adding Klarna later cannot quietly mean "shipped before it settles". |

Three failure modes are answered with a **500 on purpose**, which is what asks
Mollie to retry: its API being unreachable, the database write throwing, and
the key being missing. In each of those the customer has paid and the order
does not know it, so 26 hours of retries is exactly what you want. Everything
else answers 200, because retrying it would change nothing.

A duplicate delivery is normal, not an error — Mollie re-delivers on retry and
again on any later status change of the same payment. The `UNIQUE(provider,
external_id)` index on `payments` is the gate: the second insert fails, and
that failure *is* the "already handled" signal.

---

## The test suite

```
npm run test:mollie
```

29 assertions, run against the real handler with `fetch` and D1 stubbed. It
covers the things Mollie's test checkout cannot show you: a duplicate delivery,
a 503 from Mollie, a D1 write that throws, a forged payment id, a path
traversal attempt in the id, metadata arriving as a string, an amount of
€1850.00 converting to 185000 cents without float drift, and the test/live
label being right in both directions.

Run it after touching either file. It needs no network and no credentials.

---

## What is deliberately not wired

- **Every service except the test sample.** Drops, à-la-carte products and the
  Brand Model add-on still complete without payment. Charging for those needs
  server-side price computation first — a payment is never created from an
  amount the browser can influence — and then decisions you have not made yet:
  deposit vs. full amount up front, and how BTW is applied per customer
  (`BRIEF-14-VAT-BTW.md` has the rules, the code does not implement them).
- **Refunds and chargebacks.** Mollie re-calls the same webhook when a payment
  is refunded or charged back. Today that delivery is recognised as a duplicate
  and skipped, so the order stays `paid`. Nothing is corrupted, but a refunded
  order will read as paid until someone changes it by hand. Worth building when
  the first refund happens, not before.
- **The customer never sees the payment state.** `/o/<token>` and the
  thank-you page do not read `payment_status`. Today the only place a payment
  shows is `/admin`.
- **`src/lib/stripe.js` and `functions/api/webhook/stripe.js` are still in the
  tree** and are not called by anything. They were left rather than deleted in
  case the Cloudflare↔Stripe networking failure that forced the move to Mollie
  gets resolved.

---

## Going live, when you get there

1. Swap the secret for the `live_` key and redeploy. That is the only code-side
   change — the same endpoints serve both modes.
2. Enable the payment methods you want in Mollie's dashboard. Test mode
   activates them all; live mode does not.
3. Do one real €0.99 payment against your own card or iDEAL and confirm the
   timeline event has **no** `TEST MODE` suffix. That absence is the check.
4. Existing test rows in D1 stay `paid` and stay labelled. Clear them out if a
   clean payment history matters to you.
