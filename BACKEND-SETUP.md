# VISUAILS backend — Phase 1 setup (forms → database + email)

This is everything the code needs to go live. The site stays fully static; the
only server-side piece is one Cloudflare Pages Function (`functions/api/order.js`)
that receives form submissions, stores them in a D1 database, emails you a
notification + the customer a confirmation, and sends the visitor to the
thank-you page with a real order reference (e.g. `VIS-4Q7-2AB`).

Nothing here changes the look of the site. Until you complete these steps the
wired forms won't submit correctly on the live site, so **deploy the setup and
the form changes together.**

## What you need
- The Cloudflare account that already hosts the Pages site.
- A free [Resend](https://resend.com) account (for sending email).
- Access to the DNS for `visuails.com` (to verify the sending domain).

## 1. Create the database (D1)
From the project folder:
```bash
npx wrangler d1 create visuails
```
You do **not** need to paste the `database_id` into `wrangler.toml` — the
binding is set in the dashboard (step 4). Putting a database id in `wrangler.toml`
is what causes the "Invalid database UUID" deploy error, so the binding blocks
there stay commented out. Now load the schema (uses the database name, not the
binding):
```bash
npx wrangler d1 execute visuails --remote --file=./schema.sql
```

## 2. Create the storage bucket (R2) — used from Phase 3, make it now
```bash
npx wrangler r2 bucket create visuails-uploads
```

## 3. Set up Resend (email)
1. Sign up at resend.com and add the domain `visuails.com`.
2. Add the DNS records it shows you (SPF/DKIM) and wait for "Verified".
3. Create an API key (Full access is fine to start).

Emails are sent **from** `orders@visuails.com` (change in `wrangler.toml` if you
prefer another address on the verified domain) and notifications land at
`hello@visuails.com`.

## 4. Connect it to the Pages project
In the Cloudflare dashboard → your Pages project → **Settings → Functions →
Bindings** (and **Environment variables**):

- **D1 database binding** — variable name `DB` → the `visuails` database.
- **R2 bucket binding** — variable name `UPLOADS` → `visuails-uploads`.
- **Environment variables**:
  - `NOTIFY_EMAIL` = `hello@visuails.com`
  - `FROM_EMAIL` = `VISUAILS <orders@visuails.com>`
  - `RESEND_API_KEY` = *(paste the key — mark it as a Secret / encrypted)*

(These mirror `wrangler.toml`; the dashboard values are what the live site uses.)

Confirm the build settings: **build command** `npm run build`, **output
directory** `dist`. The `/functions` folder is picked up automatically.

## 5. Deploy
Push to the connected git branch (Pages builds automatically), or:
```bash
npm run build
npx wrangler pages deploy dist
```

## 6. Test (important — this is our verification step)
On the **live** site:
1. Fill in the **catalog order** form and submit → you should land on the
   thank-you page showing a `VIS-…` reference.
2. Check `hello@visuails.com` for the "New catalog order" email, and the address
   you entered for the confirmation email.
3. Confirm the row landed in the database:
   ```bash
   npx wrangler d1 execute visuails --remote \
     --command "SELECT ref, service, email, created_at FROM orders ORDER BY id DESC LIMIT 5"
   ```
4. Submit the homepage **checklist** signup → you should get the checklist email
   and a row in `subscribers`.

If email doesn't arrive, check the function logs (Pages → your project →
Functions → Logs, or `npx wrangler pages deployment tail`) — the handler logs
`[order]` errors but always still shows the customer the thank-you page.

## Once it works
Tell me it's landing in your inbox + database and I'll wire the remaining forms
(lifestyle, video, custom, test-sample, contact) the same way — they all use the
same endpoint, so it's a quick, safe follow-up.

## What's still ahead (not in Phase 1)
- **Phase 2 — payments:** the €0.99 test sample and orders take payment (Mollie
  iDEAL / Stripe). For now those forms submit as a request, no charge.
- **Phase 3 — uploads:** customers attach product photos (stored in R2). For now
  photos come in over WhatsApp/email.
- **Phase 4 — accounts + dashboard:** login, profile-prefill of contact/VAT,
  per-account custom-model roster, order tracking + downloads. The database
  above already has the tables for all of it.
- **Last — subscriptions.**
