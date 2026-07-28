# VISUAILS backend — setup

*Rewritten after the site-wide check. The previous version described a "Phase 1"
in which only the order form was wired, uploads were "not built" and the client
portal was a future phase. All three are built. Working from the old version
would have had you skip the R2 bucket the upload endpoint needs and skip the
migrations folder entirely.*

The site itself stays fully static. Everything server-side lives in `functions/`,
which is six files:

| Route | File | What it does |
|---|---|---|
| `POST /api/order` | `functions/api/order.js` | Receives the pipeline's submission, runs the capacity gate, writes the order, emails you and the customer, and — for a `test-sample` order, once `STRIPE_SECRET_KEY` is set — starts its Stripe Checkout |
| `GET /api/capacity` | `functions/api/capacity.js` | Serves the live delivery window the `/start` widget shows |
| `POST · DELETE /api/upload` | `functions/api/upload.js` | Takes the customer's product photos into R2 before the order is placed; `DELETE` is how they remove one again mid-form |
| `GET · POST /o/<token>` | `functions/o/[[token]].js` | The client portal |
| `GET /o` | `functions/o/index.js` | The "you need the link from your email" page, and where `/order-status` redirects |
| `POST /api/webhook/stripe` | `functions/api/webhook/stripe.js` | Stripe telling us a Checkout Session was paid; marks the order paid |

They read exactly **seven** bindings between them — `DB`, `UPLOADS`,
`FROM_EMAIL`, `NOTIFY_EMAIL`, `RESEND_API_KEY`, `STRIPE_SECRET_KEY`,
`STRIPE_WEBHOOK_SECRET` — and one optional override, `PORTAL_SALT`, which you
should leave unset (§4). The two Stripe secrets are conditional in a way the
other five aren't: unset, `order.js` skips the Stripe branch entirely and a
test-sample order behaves exactly as it did before this addition — created,
emailed, straight to thank-you, unpaid. See §9.

## What you need

- The Cloudflare account that already hosts the Pages site.
- A free [Resend](https://resend.com) account, for sending email.
- Access to DNS for `visuails.com`, to verify the sending domain.

---

## 1 · The database (D1)

```bash
npx wrangler d1 create visuails
```

You do **not** paste the returned `database_id` into `wrangler.toml`. That file
is read at build time and a database id in it fails the deploy with "Invalid
database UUID" until it's real — the binding blocks stay commented out and the
dashboard is the single source of truth. Runtime `env.DB` comes from the
dashboard binding regardless.

**Then load the schema — and which file you load depends on whether this
database is new.**

*A database you just created*, or any database that has never had this project's
tables in it, needs `schema.sql` and nothing else. It is the full current shape:
seventeen tables, all indexes, all comments.

```bash
npx wrangler d1 execute visuails --remote --file=./schema.sql
```

*A database that predates section 10, section 13, or the 2026-07-27
admin/accounts/payments addition* — one you set up from an older version of
this document — already has the early tables and needs the migrations it is
missing, in order:

```bash
npx wrangler d1 execute visuails --remote --file=./migrations/0001-section-10-pipeline.sql
npx wrangler d1 execute visuails --remote --file=./migrations/0002-section-13-upgrade-prompt.sql
npx wrangler d1 execute visuails --remote --file=./migrations/0003-admin-accounts-payments.sql
```

`0001` adds the pipeline: `blackout_days`, `order_tokens`, `rate_limits` and
`app_settings`, plus the `tier`, `lang`, `product_count`, `window_start`,
`window_end` and `closed_at` columns on `orders` and the four review columns on
`files`. `0002` adds one column, `customers.upgrade_prompt_at`, which is how
section 13's upgrade prompt knows it has already been shown this quarter.
`0003` adds `admin_users`, `admin_sessions`, `account_tokens`,
`account_sessions`, `customer_style_locks` and `payments`, plus the
`payment_provider`, `payment_status`, `payment_ref` and `paid_at` columns on
`orders` and the `actor` column on `order_events` — the admin dashboard, the
customer account dashboard and payments, all from Lucas's 2026-07-27 request.

**Running a migration twice is safe and it looks like a failure.** SQLite has no
`ADD COLUMN IF NOT EXISTS`, so the second run stops at the first column that
already exists and reports it. Verified against SQLite 3.45: re-running `0001`
gives you

```
duplicate column name: tier
```

re-running `0002` gives you

```
duplicate column name: upgrade_prompt_at
```

and re-running `0003` gives you

```
duplicate column name: payment_provider
```

All three mean *already applied*. Everything before the failing statement in
each file is `CREATE TABLE IF NOT EXISTS` or `CREATE INDEX IF NOT EXISTS`, so
nothing is half-written and no data is touched.

If you are not sure which case you're in, ask the database:

```bash
npx wrangler d1 execute visuails --remote \
  --command "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
```

Seventeen tables — `account_sessions`, `account_tokens`, `admin_sessions`,
`admin_users`, `app_settings`, `blackout_days`, `custom_models`,
`customer_style_locks`, `customers`, `files`, `messages`, `order_events`,
`order_tokens`, `orders`, `payments`, `rate_limits`, `subscribers` — and you
are current. Fewer, and you need the migrations you are missing.

Every SQL statement any of the Functions can issue has been compiled against
`schema.sql`: **41 `.prepare()` call sites resolving to at least 38 distinct
statements**, and all resolve. They were found by walking all fourteen files
reachable from `functions/` rather than by listing the ones that looked
relevant — the queries turn out to live in only five of those files, and three
of the five are library modules the function files import rather than function
files themselves. A column name that doesn't exist would not show up in a build
log or a test run; it would be a 500 on your first real order, with the customer
already reading the thank-you page.

Before 2026-07-27 this was 31 call sites resolving to 28 distinct statements,
walking eleven files with four query-bearing (`functions/api/order.js`,
`functions/api/capacity.js`, `src/lib/portal.js`, `src/lib/ratelimit.js`).
`src/lib/admin.js` (task #256) added ten call sites, all of them new tables
this migration introduces (`admin_users`, `admin_sessions`, `order_events`
with an `actor` column, and so on) — none of the ten can collide with anything
that existed before, so the new floor is the old 28 plus all ten, no dedup
required to state it as a floor. **"At least"** rather than a second exact
count because the harder half of the old number — four call sites that pass a
variable rather than a literal, one of which collapses against another file's
statement — was resolved by hand once and is not being re-derived from
scratch here; if the true count matters again, resolving `orderSql` and the
`files` insert the way the paragraph below always has is still the way to get
it, not arithmetic on this one.

Those two numbers are further apart than they look because four of the call
sites take a variable rather than a literal, and once you resolve them one pair
collapses: the calendar `SELECT` in `functions/api/order.js` and the one in
`functions/api/capacity.js` are the *same string*, which is that file's
"mirrors readCalendar deliberately and exactly" comment being true byte for
byte rather than approximately. Recount by resolving `orderSql` and the `files`
insert before de-duplicating, or the second number comes out too high.

## 2 · The storage bucket (R2)

```bash
npx wrangler r2 bucket create visuails-uploads
```

This is not optional and not future work. `POST /api/upload` writes customer
product photos into it, `order.js` attaches them to the order as `files` rows,
and the portal serves deliveries out of it. Limits, if you want them on record:
25 MB per file, 80 files per batch, and a rate limit of 40 uploads per minute
per IP.

## 3 · Resend (email)

1. Sign up, add the domain `visuails.com`.
2. Add the SPF/DKIM records it gives you and wait for **Verified**.
3. Create an API key.

Mail goes **from** `orders@visuails.com` and notifications land at
`hello@visuails.com`. Both are environment variables, so either can change
without a deploy.

## 4 · Connect it to the Pages project

Cloudflare dashboard → your Pages project → **Settings → Functions → Bindings**,
and **Environment variables**:

| Kind | Name | Value |
|---|---|---|
| D1 database | `DB` | the `visuails` database |
| R2 bucket | `UPLOADS` | `visuails-uploads` |
| Variable | `NOTIFY_EMAIL` | `hello@visuails.com` |
| Variable | `FROM_EMAIL` | `VISUAILS <orders@visuails.com>` |
| **Secret** | `RESEND_API_KEY` | the key — mark it encrypted |
| **Secret** | `STRIPE_SECRET_KEY` | from Stripe → Developers → API keys — optional; see §9 |
| **Secret** | `STRIPE_WEBHOOK_SECRET` | from Stripe → Developers → Webhooks, once the endpoint exists — optional; see §9 |

That is the complete list. It was derived by reading every `env.*` access in
every file reachable from `functions/`, not from memory, so if an eighth one
ever appears in the code it will be missing from here rather than silently
undefined in production. The two Stripe rows are marked optional because
`functions/api/order.js` and `functions/api/webhook/stripe.js` both check for
them before using them — leaving them unset does not break anything that
worked before §9's checkout landed, it just means the test sample stays
unpaid the way every order has been until now.

**One deliberate omission.** `src/lib/ratelimit.js` will use `env.PORTAL_SALT`
if you set it, and you should not set it. The rate limiter hashes visitor IPs so
the table can't become a visitor log, and that hash needs a secret salt to be
worth anything. Requiring an environment variable for it would mean choosing, on
the day someone forgets to set it, between failing closed (portal down for real
clients) and failing open (the privacy property silently gone). Instead the salt
generates itself on first use, stores itself in `app_settings`, and is read back
— so the failure mode of forgetting a variable does not exist. The override is
there only in case there is ever a reason to pin one.

Confirm the build settings while you're in there: build command `npm run build`,
output directory `dist`. `functions/` is picked up automatically.

## 5 · Deploy

Push to the connected branch and Pages builds it, or:

```bash
npm run build
npx wrangler pages deploy dist
```

## 6 · Verify — and read this before you decide it worked

**Everything in the order handler is wrapped so the customer always sees the
thank-you page.** That is the right behaviour for a customer and a trap for you:
a completely broken backend and a working one look identical from the front.
Landing on `/thank-you` with a `VIS-…` reference proves the function ran. It
does not prove the order was stored.

So verify from the database, in this order:

1. Submit a real order through `/start` on the live site.
2. **Check the row exists.** This is the actual test.
   ```bash
   npx wrangler d1 execute visuails --remote \
     --command "SELECT ref, tier, service, email, window_start, created_at FROM orders ORDER BY id DESC LIMIT 5"
   ```
   For a Tier 1 order `window_start` should hold a date. For Tier 0 it is
   correctly `NULL` — Tier 0 has no named delivery date by design.
3. **Check the notification arrived** at `hello@visuails.com`, and the
   confirmation at the address you used.
4. **Check the timeline row**, which is what the portal reads:
   ```bash
   npx wrangler d1 execute visuails --remote \
     --command "SELECT order_id, status, note, created_at FROM order_events ORDER BY id DESC LIMIT 5"
   ```
5. Submit the homepage checklist signup and confirm a row in `subscribers`.
6. Hit `/api/capacity?products=12&tier=attended` in a browser. It should return
   JSON with a `windows` array. A **503** carrying `"reason": "unavailable"`
   means the `DB` binding is missing or wrong — that endpoint refuses
   deliberately rather than inventing a calendar out of nothing. A **404** means
   you are not looking at a Pages deployment at all; see *The calendar did not
   answer* below.

Because failures are swallowed and logged rather than shown, the log is where
they live:

```bash
npx wrangler pages deployment tail
```

Errors from the order handler are prefixed `[order]`.

**Symptom to cause, for the three that look alike:**

*Thank-you page appears, no row in `orders`* — the `DB` binding is missing or
points at a database without the schema. Check the log for `[order]`.

*Row in `orders`, no email* — Resend. Either the domain isn't verified yet, the
API key is wrong, or `FROM_EMAIL` isn't on the verified domain. The order is
safe: mail is sent after the database writes, so a Resend outage costs you the
notification and nothing else.

*`/start` shows no delivery window* — `/api/capacity` is failing. See the next
section, which is about exactly this.

---

## 7 · "The calendar did not answer"

Step 3 of `/start` can show this instead of a list of windows:

> **The calendar did not answer**
> That is our problem, not yours. Try again, or send the order and we will
> confirm a window by email. No date is assumed either way.

**This is not a bug in the page.** It is the page correctly reporting that
`/api/capacity` gave it no windows and told it why. The brief's rule is *never
promise a delivery date the capacity gate hasn't cleared*, and the failure mode
that rule is really about is the database being unreachable — an endpoint that
shrugs and treats a failed query as "nothing is booked" hands back a wide-open
calendar at the moment it knows least. So `functions/api/capacity.js` throws on
a missing `DB` binding on purpose (`readCalendar()`, line 122) and the handler
turns that into a `503` with `"reason": "unavailable"` and an empty `windows`
array. `/start` renders that reason as the message above. Every part of that
chain is behaving as designed.

There are two reasons you would see it, and they are told apart by what
`/api/capacity` returns when you open it directly.

**A · 404 — nothing is serving the functions.**

`npm run preview` is `astro preview`. It serves the contents of `dist/` and
nothing else; it has never heard of `functions/`, so every `/api/*` route 404s
and the whole backend appears dead. The same is true of any plain static server
you point at `dist/`. This is the likeliest cause if you are looking at the site
on your own machine.

To run the real thing locally, build first and then serve it with Wrangler,
which does execute `functions/`:

```bash
npm run build
npx wrangler pages dev dist --d1 DB --r2 UPLOADS
```

`--d1 DB` and `--r2 UPLOADS` create **local** stand-ins — a SQLite file and a
folder under `.wrangler/`, not your live data. The local database starts empty,
so apply the migrations to it once:

```bash
npx wrangler d1 execute DB --local --file migrations/0001-section-10-pipeline.sql
npx wrangler d1 execute DB --local --file migrations/0002-section-13-upgrade-prompt.sql
```

Email is the one part that will not work locally: `RESEND_API_KEY` is not set,
so the order handler logs the send failure and carries on. The order still
writes. If you want mail locally too, put the three mail variables in a
`.dev.vars` file next to `wrangler.toml` — and keep that file out of git.

**B · 503 with `"reason": "unavailable"` — the functions run, D1 does not.**

The deployment is serving `functions/`, but the `DB` binding is not reaching a
database. Check, in this order:

1. **Pages → Settings → Functions → D1 database bindings.** The variable name
   must be exactly `DB`. A binding called `d1`, `DATABASE` or `visuails` is not
   picked up — the code reads `env.DB` and nothing else.
2. **The binding exists on the right environment.** Production and Preview are
   configured separately. A binding added to Production only will leave every
   `*.pages.dev` preview URL showing this message while the live domain is fine.
3. **A deployment happened after the binding was added.** Bindings attach at
   deploy time. Adding one to an already-deployed project changes nothing until
   you redeploy.
4. **The schema is actually in that database.** A binding pointing at an empty
   D1 fails on the first query. Re-run the migration files against it and
   confirm:
   ```bash
   npx wrangler d1 execute visuails --remote \
     --command "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
   ```
   Seventeen tables should come back.

`npx wrangler pages deployment tail` shows the throw as it happens.

**What it is not.** It is not a broken date picker, a timezone problem, or the
studio being full. "Full" is a different reason with different copy — the
endpoint distinguishes `ok`, `full`, `too-large`, `invalid` and `unavailable`
precisely so the page never flattens them into one apology. If you are seeing
*this* text, the page never got as far as looking at the calendar.

---

## 8 · Your admin login

`/admin` has no signup page on purpose — a public "create an admin account"
form is a hole on a site with exactly one studio and one login, not a
feature. Instead, create your own row once with the helper script:

```bash
node scripts/hash-admin-password.mjs you@visuails.com "a real password, 12+ characters"
```

It prints a `wrangler d1 execute` command with the password already hashed —
nothing sensitive crosses the network until you run the command it gives you,
and nothing is written until then either. Run the same command again any time
to change your password; it replaces the row rather than failing on the
`UNIQUE` constraint on `email`.

Then sign in at `https://visuails.com/admin/login`. The session cookie is
`HttpOnly`, `Secure` and `SameSite=Strict`, and lasts 14 days
(`ADMIN_SESSION_TTL_DAYS` in `src/lib/adminAuth.js`) before you need to sign
in again.

No new Cloudflare binding or secret is needed for this — `/admin` only reads
`env.DB`, which §4 above already connects.

## 9 · Connecting Mollie and Stripe

Both processors, decided 2026-07-27: iDEAL through Mollie, cards through
Stripe. **Creating the accounts is independent of the checkout code landing**
— do this whenever, and hand over the keys when it's ready.

**Mollie.**

1. Sign up at [mollie.com](https://www.mollie.com) and create a website
   profile for VISUAILS — Mollie organises API keys per profile, so this
   comes before the keys exist.
2. In the dashboard, go to **Developers → API keys**. You get a **Test** key
   immediately; the **Live** key activates once Mollie has verified the
   business (KVK number, IBAN, ID verification — their onboarding flow asks
   for these directly, nothing to prepare in advance).
3. Use the test key while this integration is being built and checked; swap
   in the live key only once real orders are meant to charge real cards.

**Stripe.**

1. Sign up at [stripe.com](https://stripe.com) or sign in if VISUAILS already
   has an account for anything else.
2. **Dashboard → Developers → API keys**
   (`dashboard.stripe.com/apikeys`). Requires Administrator permission on the
   account, which the account creator has by default.
3. Test-mode keys (`pk_test_…` / `sk_test_…`) are visible any time. Live keys
   (`pk_live_…` / `sk_live_…`) are shown **once**, at creation — copy the
   secret key somewhere safe immediately, because Stripe will not show it
   again; if it's lost, roll it and issue a new one rather than trying to
   recover the old value.
4. The webhook handler now exists in the code
   (`functions/api/webhook/stripe.js`), so this step can be done any time:
   **Developers → Webhooks → Add endpoint**, pointed at
   `https://visuails.com/api/webhook/stripe` — Stripe gives you a **signing
   secret** (`whsec_…`) at that point, which is what proves a webhook call
   actually came from Stripe and not from anyone who found the URL.

**What to hand over, once you have it — as Cloudflare Pages secrets, the same
way `RESEND_API_KEY` was set up in §4, not pasted into chat or committed to
the repo:**

| Secret | From |
|---|---|
| `MOLLIE_API_KEY` | Mollie → Developers → API keys |
| `STRIPE_SECRET_KEY` | Stripe → Developers → API keys |
| `STRIPE_WEBHOOK_SECRET` | Stripe → Developers → Webhooks, after the endpoint exists |

`MOLLIE_API_KEY` is not read by any code yet — Mollie/iDEAL checkout is still
ahead. The two Stripe secrets ARE read now, by `functions/api/order.js` (via
`src/lib/stripe.js`) and `functions/api/webhook/stripe.js`, and §4's binding
table above already lists them. Set `STRIPE_SECRET_KEY` and
`STRIPE_WEBHOOK_SECRET` and the test sample starts taking real payment on the
next deploy — nothing else to flip.

**What this actually covers today: the €0.99 test sample only.** A
`test-sample` order is the only thing `order.js` sends to Stripe — every
other service (`catalog`, `lifestyle`, `video`, `custom`, `drop`) still ends
at the thank-you page unpaid, on purpose. Wiring those needs a server-side
price computation from `src/data/pricing.js`'s tier/package/per-product model
first, so that a Checkout Session is never built from an amount the client
sent — see the comment above the Stripe call in `order.js` and the header of
`src/lib/stripe.js`. That is separate work, not yet started.

**Testing it, once both secrets are set.** Use Stripe's own test card,
`4242 4242 4242 4242`, any future expiry, any CVC. Submit a test-sample order
on the live site or via `wrangler pages dev` (§7 explains why `astro preview`
alone won't serve `/api/webhook/stripe`); you should land on Stripe's
Checkout page for €0.99, and completing it redirects to `/thank-you` with the
order's `ref`. Then confirm the payment actually landed, the same way §6
verifies an order — from the database, not from the page you're looking at:

```bash
npx wrangler d1 execute visuails --remote \
  --command "SELECT ref, payment_status, payment_ref, paid_at FROM orders WHERE ref = 'VIS-...'"
npx wrangler d1 execute visuails --remote \
  --command "SELECT provider, external_id, status, amount_cents FROM payments ORDER BY id DESC LIMIT 5"
```

`payment_status` should read `paid`, and there should be exactly one
`payments` row for that order even if you refresh the success page or Stripe
retries the webhook — see the idempotency note in
`functions/api/webhook/stripe.js` for why a second delivery of the same event
is silently a no-op rather than a duplicate payment. If `payment_status`
stays `unpaid` after a completed Checkout, check
`npx wrangler pages deployment tail` for a `[stripe-webhook]` line — the
likeliest cause is the webhook endpoint not yet added in Stripe's dashboard
(step 4 above), or `STRIPE_WEBHOOK_SECRET` not matching the endpoint that
actually fired.

Locally, `wrangler pages dev` cannot receive a real webhook from Stripe (your
machine has no public URL), so use the
[Stripe CLI](https://docs.stripe.com/stripe-cli) to forward events instead:

```bash
stripe listen --forward-to localhost:8788/api/webhook/stripe
```

`stripe listen` prints its own `whsec_…` — use that one for local testing,
not the dashboard endpoint's secret; they're different values for the same
reason a preview deploy and production have separate bindings in §4.

---

## What is still ahead

**Admin dashboard — done.** `/admin` (`src/lib/admin.js`, task #256,
2026-07-27): password login, an order overview with a working status control
(`received → in_production → human_check → delivered/cancelled`, writing both
`orders.status` and an `order_events` row so the client's own portal timeline
moves too), and a revision inbox reading `files.review_state =
'revision_requested'` — the notes clients leave in their portal, which had
nowhere to surface on the studio's side before this. See **"Your admin
login"** below to create the one row (`admin_users`) this needs before it
works at all; nothing bootstraps it for you.

**Payments — Mollie AND Stripe, decided 2026-07-27** (closes flag **xlii** —
the processor was undecided; it no longer is). Both processors are being
wired rather than one, so a client will eventually pay by iDEAL (Mollie) or
card (Stripe). **The €0.99 test sample takes real payment today, through
Stripe**, once `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` are set (§9) —
`functions/api/order.js` starts a Checkout Session for it and
`functions/api/webhook/stripe.js` marks the order paid. **Real orders — every
other service, and Mollie/iDEAL entirely — still take no payment**, because
nothing server-side computes what a real order costs yet (tiers, packages,
per-product, VAT); building that price function is what unblocks the rest,
not the Stripe or Mollie plumbing itself, which is either done (Stripe) or a
known, separate piece of work (Mollie). Section 14, the VAT and
reverse-charge work, stays out of scope — Lucas: no KOR, files a normal
return — but a standard 21% will still need to be added and shown on the
receipt regardless, once real orders take payment; that is not section 14,
which was specifically about VIES validation and reverse-charge for EU
business buyers, not about charging VAT at all. See **"Connecting Mollie and
Stripe"** above for account setup and **§9's testing note** for how to verify
the test-sample checkout.

**Accounts — done.** `/account` (`src/lib/account.js`, task #257, 2026-07-27):
sign in with a magic link to the email an order was placed under — no
password, see that file's header for why customers get a different design
from Lucas's own login. Once in: an order history with download links for
every delivered file, and a per-style (catalog / lifestyle / video) brand-lock
picker backed by `customer_style_locks`, so a repeat client's shoots keep
using the same custom model without being asked each time. There is
deliberately no signup page — an account already exists the moment a first
order does, the same "no public admin-signup route" reasoning `src/lib/admin.js`
documents for Lucas's own login.

**Portal token issuance — done, and worth knowing how it behaves.** Until
recently the portal was finished and unreachable: nothing wrote an
`order_tokens` row, so the table stayed empty, every lookup missed, and no
confirmation ever carried a link. `functions/api/order.js` now mints one on
every order that gets an id, stores its SHA-256, and puts the URL in the
confirmation mail.

Two consequences follow from the design and neither is a fault:

- **The link cannot be re-derived.** The database holds the hash, never the
  token. If a client loses the email, you issue a *new* token; you cannot look
  the old one up.
- **A mint failure costs the link, not the order.** The whole block is wrapped
  in `safe()`, so a D1 hiccup at that moment sends a confirmation without a
  portal link rather than losing the order.

Flag **xxxviii** — which of the two readings of the brief's *"single-use on
issue"* you meant — is still open, and it decides whether a token dies on first
use or stays valid until it expires. Today it is the second.

**The twelve-month retention promise** is published in ten places across the
privacy and terms pages in both languages, and nothing deletes anything.
Cloudflare Pages Functions has no cron triggers, so today this promise is kept
by hand. Flag **lxiii**.
