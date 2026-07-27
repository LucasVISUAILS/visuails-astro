# VISUAILS backend — setup

*Rewritten after the site-wide check. The previous version described a "Phase 1"
in which only the order form was wired, uploads were "not built" and the client
portal was a future phase. All three are built. Working from the old version
would have had you skip the R2 bucket the upload endpoint needs and skip the
migrations folder entirely.*

The site itself stays fully static. Everything server-side lives in `functions/`,
which is five files:

| Route | File | What it does |
|---|---|---|
| `POST /api/order` | `functions/api/order.js` | Receives the pipeline's submission, runs the capacity gate, writes the order, emails you and the customer |
| `GET /api/capacity` | `functions/api/capacity.js` | Serves the live delivery window the `/start` widget shows |
| `POST · DELETE /api/upload` | `functions/api/upload.js` | Takes the customer's product photos into R2 before the order is placed; `DELETE` is how they remove one again mid-form |
| `GET · POST /o/<token>` | `functions/o/[[token]].js` | The client portal |
| `GET /o` | `functions/o/index.js` | The "you need the link from your email" page, and where `/order-status` redirects |

They read exactly **five** bindings between them — `DB`, `UPLOADS`,
`FROM_EMAIL`, `NOTIFY_EMAIL`, `RESEND_API_KEY` — and one optional override,
`PORTAL_SALT`, which you should leave unset (§4).

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
eleven tables, all indexes, all comments.

```bash
npx wrangler d1 execute visuails --remote --file=./schema.sql
```

*A database that predates section 10* — one you set up from the older version of
this document — already has the early tables and needs the two migrations, in
order, instead:

```bash
npx wrangler d1 execute visuails --remote --file=./migrations/0001-section-10-pipeline.sql
npx wrangler d1 execute visuails --remote --file=./migrations/0002-section-13-upgrade-prompt.sql
```

`0001` adds the pipeline: `blackout_days`, `order_tokens`, `rate_limits` and
`app_settings`, plus the `tier`, `lang`, `product_count`, `window_start`,
`window_end` and `closed_at` columns on `orders` and the four review columns on
`files`. `0002` adds one column, `customers.upgrade_prompt_at`, which is how
section 13's upgrade prompt knows it has already been shown this quarter.

**Running a migration twice is safe and it looks like a failure.** SQLite has no
`ADD COLUMN IF NOT EXISTS`, so the second run stops at the first column that
already exists and reports it. Verified against SQLite 3.45: re-running `0001`
gives you

```
duplicate column name: tier
```

and re-running `0002` gives you

```
duplicate column name: upgrade_prompt_at
```

Both mean *already applied*. Everything before the failing statement in each
file is `CREATE TABLE IF NOT EXISTS` or `CREATE INDEX IF NOT EXISTS`, so nothing
is half-written and no data is touched.

If you are not sure which case you're in, ask the database:

```bash
npx wrangler d1 execute visuails --remote \
  --command "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
```

Eleven tables — `app_settings`, `blackout_days`, `custom_models`, `customers`,
`files`, `messages`, `order_events`, `order_tokens`, `orders`, `rate_limits`,
`subscribers` — and you are current. Fewer, and you need the migrations.

Every SQL statement any of the Functions can issue has been compiled against
`schema.sql`: **30 `.prepare()` call sites resolving to 29 distinct
statements**, and all 29 resolve. They were found by walking all eleven files
reachable from `functions/` rather than by listing the ones that looked
relevant — the queries turn out to live in only four of those files, and two of
the four are library modules the function files import rather than function
files themselves. A column name that doesn't exist would not show up in a build
log or a test run; it would be a 500 on your first real order, with the customer
already reading the thank-you page.

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

That is the complete list. It was derived by reading every `env.*` access in
every file reachable from `functions/`, not from memory, so if a sixth one ever
appears in the code it will be missing from here rather than silently undefined
in production.

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
6. Hit `/api/capacity` in a browser. It should return JSON with a window. If it
   500s, the `DB` binding is wrong — that endpoint throws deliberately rather
   than inventing a calendar out of nothing.

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

*`/start` shows no delivery window* — `/api/capacity` is failing, which is the
`DB` binding again.

---

## What is still ahead

**Payments.** Nothing on the site takes money yet. The €0.99 test sample and
real orders both need a processor — Mollie for iDEAL, or Stripe — and that
choice is still open (flag **xlii**). Section 14, the VAT and reverse-charge
work, is deferred behind it and is a substantial piece in its own right:
server-side determination, VIES validation, sequential invoice numbers.

**Portal token issuance.** The portal is finished and a client cannot reach it.
Tokens are minted, hashed, expired and validated correctly, and `order_tokens`
is read on every lookup — but nothing in the codebase ever writes a row to it,
so there is no link to send. Whatever closes an order needs to mint a token,
store its SHA-256, and put the URL in the delivery mail. Flag **xxxviii** —
which of the two readings of the brief's *"single-use on issue"* you meant — is
a decision that has to land first, because it changes what that code does.

**The twelve-month retention promise** is published in ten places across the
privacy and terms pages in both languages, and nothing deletes anything.
Cloudflare Pages Functions has no cron triggers, so today this promise is kept
by hand. Flag **lxiii**.

**Accounts.** Login, profile-prefill of contact and VAT details, a per-account
custom-model roster. `custom_models` is the one table in the schema that no code
touches yet; it is there for this.
