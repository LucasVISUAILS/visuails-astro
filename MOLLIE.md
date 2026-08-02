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

**2 · Put it in Cloudflare, from the DASHBOARD.** Your Pages project →
*Settings* → *Variables and Secrets* → add `MOLLIE_API_KEY` as an encrypted
**Secret**, not a plaintext variable. It must not go in `wrangler.toml` — that
file is in git.

The dashboard rather than the terminal, and that is not a preference. Setting
this key from `cmd.exe` with `npx wrangler pages secret put` is what cost this
project two payment integrations: `cmd.exe` does not paste on Ctrl+V unless it
is configured to, it types the SYN control character instead, and the stored
"key" was one invisible byte. See "The empty 400, and what it actually was"
below. The dashboard field is an ordinary web input where paste behaves.

If you do use a terminal, use Windows Terminal or PowerShell — or right-click
to paste in `cmd.exe` — and then verify with `/admin/debug-mollie` rather than
assuming.

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

## The empty 400, and what it actually was

**Answered, 2 August 2026: `MOLLIE_API_KEY` was one character long, and that
character was U+0016.**

The diagnostic's first block said it before a single probe ran:

```json
"key": { "set": true, "rawLength": 1, "usableLength": 0, "prefix": "",
         "mode": "unrecognised",
         "problems": ["1 non-printable character(s): U+0016", ...] }
```

U+0016 is **SYN**, an ASCII control character. It is what Windows `cmd.exe`
types when you press **Ctrl+V** and the console is not configured to treat that
as paste — it echoes `^V` and inserts the control code. So the sequence was:
`wrangler pages secret put MOLLIE_API_KEY` prompted for a value, Ctrl+V typed a
SYN instead of pasting the key, Enter stored it. The key never left the
clipboard.

Everything downstream follows mechanically. `Bearer \x16` is a header value
containing a C0 control character, which is not legal in an HTTP header value,
so Mollie's edge rejected the request at the HTTP layer — before Mollie's
application ran, and therefore without Mollie's JSON error shape. **400 Bad
Request, empty body.** Exactly the symptom, for exactly the predicted reason.

### This is almost certainly the Stripe story too

The Stripe integration on this project died with "blank HTTP 400s when called
from Cloudflare, never from Stripe's CLI, never from local Node", was escalated
to both Stripe and Cloudflare support, was never resolved, and is the entire
reason Mollie was adopted. Same machine, same terminal, same paste, same class
of secret — and "works from the CLI and from local Node" is precisely what you
would expect, because those read the key from somewhere else.

It was written up as *"a networking-layer failure between Cloudflare and
api.stripe.com"*. It was a keystroke. If Stripe is ever revisited, check
`STRIPE_SECRET_KEY`'s shape before assuming anything else — the diagnostic
reports it.

### The fix, and how not to reproduce it

**Set the secret from the Cloudflare dashboard**, not from `cmd.exe`: your
Pages project → *Settings* → *Variables and Secrets* → `MOLLIE_API_KEY` as an
encrypted **Secret**. It is a web form; Ctrl+V behaves. Then redeploy — a
secret only reaches deployments created after it.

If you would rather stay in a terminal, do not use `cmd.exe` with Ctrl+V. Use
**right-click** to paste in `cmd.exe`, or use Windows Terminal / PowerShell,
where Ctrl+V is a real paste.

### What now stops it happening quietly again

`mollieKey()` in `src/lib/mollie.js` strips non-printable characters and
rejects anything that is not `test_…`/`live_…`, so a mangled key now fails with
a message that names the problem instead of becoming a blank 400 forty
milliseconds later. That guard is what turned this from an unfixable symptom
into a one-line answer.

The diagnostic also reports the **shape of every other secret** —
`RESEND_API_KEY`, `PORTAL_SALT`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` —
length, whether every character is printable, and any control characters, never
values. Two of those fail *silently*: `sendMail()` is wrapped in `safe()`, so a
corrupted `RESEND_API_KEY` means order confirmations never arrive and nothing
anywhere says so. If several secrets were set in the same sitting, they were
probably set the same way.

---

## If it ever comes back: `Mollie 400: (empty body)`

The general shape of the problem, kept because the reasoning is what found it
and would find the next one. It first appeared on production at the *first*
step — creating the payment, before the customer ever reaches Mollie:

```
POST https://visuails.com/api/order - Ok
 (error) [order] Mollie 400: (empty body)
```

**The one fact that narrows it down:** Mollie answers every application-level
error with a JSON body — `{status, title, detail, field}`. So a 400 with
*nothing* in it did not come from Mollie's application. Something in front of
Mollie refused the request before Mollie parsed it, which is what happens when
a request is malformed at the HTTP layer rather than merely wrong at the API
layer.

It is also the exact symptom that killed the Stripe integration on this project
— "blank HTTP 400s when called from Cloudflare, never from the CLI, never from
local Node" — which was never resolved and is why Mollie was adopted in the
first place. Two different providers failing identically from the same Pages
Function says the cause is on our side of the connection.

### The candidates, and how to tell them apart

**The key.** `mollieKey()` in
`src/lib/mollie.js` strips every non-printable character from the key before it
goes into a header and rejects anything that is not `test_…`/`live_…`. This is
not cosmetic. A secret is delivered by pasting, and paste carries invisible
passengers:

| what got pasted | what reaches the wire |
|---|---|
| trailing newline | stripped by the Fetch spec — harmless |
| leading/trailing space | stripped — harmless |
| **U+00A0 non-breaking space** | **survives, sent as raw byte `0xA0`** |
| **U+0016 SYN (`cmd.exe` Ctrl+V)** | **survives, sent as raw byte `0x16`** ← this one |
| U+200B zero-width space | `fetch` throws a TypeError |

The bottom two rows are the dangerous ones — and U+0016 from `cmd.exe`, the
actual culprit here, belongs with them. A byte outside printable ASCII is not
legal inside a header value, so the receiving end rejects the whole request at
the HTTP layer: **400, empty body**. (Verified on the wire against a raw
socket, not assumed.)

**The error message now says who answered.** An empty body no longer logs as
`(empty body)` but as `(EMPTY BODY — not a Mollie application error. Response
headers: server=… cf-ray=…)`. `server` and `cf-ray` together identify whether
the answer came from Mollie, from a WAF in front of Mollie, or from
Cloudflare's own edge — the first question, and until now an unanswerable one.

### The diagnostic: `/admin/debug-mollie`

Sign in at `/admin`, then open **`https://visuails.com/admin/debug-mollie`** in
the same browser.

It lives *under* `/admin` rather than under `/api`, and that is not tidiness:
the admin session cookie is set with `Path=/admin`, so the browser will not
attach it to anything outside that path. An `/api/…` version of this page
answers "sign in first" to a browser that is visibly signed in. The endpoint
moved; the cookie's scope stayed narrow, which is the right way round.

It runs four probes and returns JSON. Each isolates one variable, and **the
first one that misbehaves is the answer**:

| Probe | What it sends | What it proves |
|---|---|---|
| **A · transport** | a well-formed but deliberately *wrong* key | Should be a clean JSON **401**. If A is an empty 400, it is not our key and not our payload — it is the connection, and that is a Cloudflare support ticket with the `cf-ray` attached. |
| **B · auth** | the real key, GET, no body | Isolates the `Authorization` header. A passing but B empty-400 = the key is carrying something the wire rejects. |
| **C · minimal POST** | amount + description + redirectUrl only | B passing but C failing = the body, not the key. |
| **D · the real POST** | byte-for-byte what `order.js` sends | C passing but D failing = one of the three fields D adds: `webhookUrl`, `locale`, `metadata`. D also echoes the exact URLs it sent. |

It ends with a `reading` field that states what to do next in one sentence.

It reveals no secret — the key's length, its five-character prefix (`test_` /
`live_`, which is not secret and is the single most useful thing to know) and a
list of any invisible characters in it, never the key itself. It is behind the
`/admin` login rather than open, and it is marked **delete after use** at the
top of the file, the same way `debug-egress-ip.js` was.

Probes C and D create real payments. On a `test_` key those are free and fake;
on a `live_` key they are genuine but unpaid €0.99 payments nobody will
complete. Both are described as `VISUAILS DIAGNOSTIC — ignore` so they are
obvious in the dashboard.

### Before running it, check the cheap thing

The order in the log **succeeded** — `POST /api/order - Ok`. That is the design:
`order.js` fails open, so a Mollie failure costs the payment link and not the
order. Which also means a run from before the secret was set, or from an older
deployment, looks exactly like this. Confirm the deployment you tested is newer
than the secret; a secret only reaches deployments created after it.

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
