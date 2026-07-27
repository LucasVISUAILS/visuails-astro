# Deploying visuails-astro to GitHub + Cloudflare Pages

*Rewritten after the site-wide check. The previous version of this file was
written before the repositioning and had gone wrong in ways that mattered: it
said the site had ~27 pages when it has 48, and it said the forms didn't submit
anywhere when they post to `/api/order`. Both are the kind of error you'd only
discover mid-deploy, with the dashboard open. Everything below was checked
against the repository on the day it was written, and the numbers are stated so
that the next drift is visible rather than silent.*

**Read `BACKEND-SETUP.md` alongside this file.** This one gets the site
compiled and served. That one creates the database, the bucket and the mail
sender the forms need. The site will deploy and render without any of it — and
every form on it will fail.

---

## Where this stands before you start

| | |
|---|---|
| Pages authored | **48** `.astro` files in `src/pages` |
| Routes served | **64** — 32 English, 32 Dutch |
| Components | 63 `.astro` files under `src/` in total |
| Images | 73 `.webp` in `public/img`, 83 files / 15 MB in `public/` |
| Serverless | 5 files in `functions/` |
| Repo | 17 MB without `.git` |
| Times this has been compiled | **once, on your machine** |

That last row changed, and it changed the way this document said it would. The
npm registry is blocked from the sandbox this was built in, so there is still no
`node_modules` here and no `dist/`; the first `astro build` ever run against this
code was the one you ran locally. **It failed, once, and the failure was worth
more than a green build would have been.**

esbuild stopped at `HomePage.astro` with `Expected ")" but found "$render"`. The
cause was a single `{/* … */}` comment sitting inside a JavaScript expression
rather than inside markup. That distinction is invisible to the eye and total to
the compiler: `{/* … */}` is an Astro comment only when it is a *child of
markup*. Inside an open expression — the body of an `.map(… => ( … ))`, say —
the `{` is a plain JavaScript brace, Astro passes the text straight through, and
esbuild reads `( {} $render\`…\` )` and gives up.

Two things followed. First, a **second, identical** defect was found in
`StartPage.astro`, in the doors map — it would have broken your next build the
moment the first fix cleared. Both are fixed. Second, the class now has a
checker: `check_astro_expr.py` models markup-vs-expression context across all
**63** `.astro` templates and reports any comment that would land on the wrong
side of it. It sweeps clean, it has a mutation harness holding eighteen cases
(ten that must be caught, eight legal look-alikes that must not be), and that
harness has a meta-test that breaks the checker six ways and requires the harness
to notice each one. Nothing in that chain existed before your build failed.

Alongside that compile, what has been done is static analysis, and it is worth
knowing exactly how far that reaches, because it is further than "nothing" and a
long way short of "it builds":

- All **211** import specifiers across `src/` and `functions/` resolve to a file
  that exists. A wrong relative path is the most common way a hand-authored
  Astro project fails its first build, and there isn't one.
- All **6** dynamic routes (`catalog/[slug]`, `lifestyle/[slug]`, `video/[slug]`,
  and their `/nl` twins) export `getStaticPaths`. Missing it is a hard build
  error in a static build.
- Nothing sets `prerender = false`, and nothing touches `Astro.request`,
  `Astro.cookies`, `Astro.redirect` or `Astro.locals` — all of which would
  demand a server adapter this project doesn't have.
- Nothing reads `import.meta.env`, so there is no build-time variable to forget.
- All **66** distinct asset references (`/img/…`, favicons) point at files that
  exist in `public/`.

- Every `{/* … */}` and `<!-- … -->` in all **63** templates sits in markup
  position, where it compiles — the rule your first build taught us, now checked.

None of that proves the templates compile. A malformed expression inside a
`.astro` frontmatter block, a mismatched tag deep in a component — those show up
in the build log and nowhere earlier, which is exactly how the comment defect
surfaced. **Run `npm run build` locally before you push, and watch the log.** If
it fails, paste it to me in full; the fix is usually one line, and if it is a
class no checker covers yet, one line plus a new checker.

---

## 1 · The GitHub repo

Already created: `https://github.com/LucasVISUAILS/visuails-astro.git`

The folder on your machine is a git repo on branch `main` with that remote
already set. From Command Prompt, in the `visuails-astro` folder:

```
git add -A
git commit -m "Pre-deploy"
git push
```

Or double-click **`push-to-github.bat`** in the folder — it does add, commit and
push in one go, and it still handles the first-run case of initialising the repo
if it ever needs to. If Windows pops up a browser asking you to sign in to
GitHub, that's normal.

## 2 · Create the Pages project

Make a **new** Pages project rather than repointing the one serving the current
live site. The old site keeps running untouched until you deliberately switch
the domain, which means you get to click through the new one for as long as you
want first.

In the Cloudflare dashboard: **Workers & Pages → Create → Pages → Connect to
Git**, pick the repo, then:

- Framework preset: **Astro**
- Build command: `npm run build`
- Build output directory: `dist`

Nothing else needs setting here. `functions/` at the repo root is picked up
automatically — you do not configure it, and it does not go in the output
directory.

`wrangler.toml` already carries `pages_build_output_dir = "dist"`,
`compatibility_date = "2026-07-01"` and `compatibility_flags =
["nodejs_compat"]`. Leave the binding blocks in it commented out; they are
commented for a reason, which is that a `database_id` in that file is read at
build time and fails the deploy with "Invalid database UUID" until it's a real
one. **Bindings go in the dashboard.** `BACKEND-SETUP.md` §4.

## 3 · The first build

Cloudflare runs `npm install && npm run build` on its own machines, with real
network access. Two things about that command were unpinned, and both are the
kind of thing that fails the build for a reason that has nothing to do with your
code — so they were dealt with before this section says "watch it".

**The Node version is pinned now.** `.nvmrc` holds `22`, which is what this
project was written and tested against here. Without it Cloudflare's build image
picks its own default, and a default older than Astro 6 accepts fails the install
with a version error that looks alarming and means nothing. One file, added
pre-emptively, nothing to click.

**There is no lockfile, and that is one command before you push.**
`package-lock.json` is not in this repo, so `npm install` on Cloudflare's machine
resolves `^6.4.5` to whatever the newest Astro 6 is on the day it builds — not
necessarily the version these templates were written against, and not necessarily
the same version on the next build either. Run `npm install` once locally and
commit the `package-lock.json` it writes. Every build after that installs exactly
what you tested. It also leaves you a local `node_modules`, which is what the
Archivo swap in §4 item 5 has been waiting for.

Then watch it. Three outcomes:

**Green.** You get a `*.pages.dev` URL immediately. Go to §4.

**Red on install.** With the Node pin in place and a lockfile committed this
would have to be a registry outage — three dependencies, all ordinary
(`astro`, `gsap`, `@fontsource/archivo`).

**Red on build.** Still the likeliest failure mode for hand-authored templates,
though less likely now than before your local build — that one already caught and
retired the comment-position class described at the top of this document. The log
names the file and the line. Send it over.

## 4 · What to click on the preview URL

The preview is the first time this site has been rendered as pages by anything —
your local build compiled the templates, it did not tell you what they look like.
Go
through it on desktop **and** at phone width. In rough order of how likely each
is to be wrong:

1. **The homepage shader and the chrome signature.** Most custom code, most
   GPU-dependent, and the one thing that has never been seen. Also check it
   doesn't cost you the LCP target — under 2.5s on mobile 4G is the standing
   requirement, and the shader runs during it.
2. **`/start`, both languages.** The order pipeline is the commercial path.
   Walk it end to end. It will fail at submit until the backend exists — that's
   §5, not a bug.
3. **The before/after comparison rows.** `--pos` is read three times in CSS and
   set by nothing, so these are expected to be **frozen at 50%**. This is a
   known open item, not a surprise. Confirm it looks deliberate rather than
   broken; if it looks broken, tell me and it gets fixed before cutover.
4. **The mobile nav drawer**, and the language switcher on a page that exists in
   both languages.
5. **Typography.** `portal.css` is on its fallback font — the Archivo swap needs
   an `npm install` that couldn't run in the sandbox. Look at `/o` (it renders
   its "you need the link from your email" state without a token) and see
   whether that reads as acceptable for now.
6. **Heading levels.** Ten heading-level skips are recorded but unfixed, because
   fixing one means seeing the rendered page: `ComparePage`, `HomePage`,
   `HowItWorksPage`, `LifestylePage`, and both languages of `thank-you` and
   `upload-guidelines`. `/thank-you` is the worst — it goes h1 straight to h4.
   Now that you can see them, they can be fixed properly.
7. **Anything that looks off.** You are the first human to see this rendered.
   That is worth more than the rest of the list.

One thing on the preview that is correct and reads as broken if you go looking:
every `<link rel="canonical">`, every `hreflang` alternate and the OG image
resolve against `https://visuails.com`, because that is the configured `site` in
`astro.config.mjs` and it has no idea it is being served from a `pages.dev`
address. So in the preview's page source those point at the **old live site**.
Navigation is unaffected — the nav and the language switcher emit root-relative
paths and keep you on the preview — and the canonical pointing at the real domain
is the thing that stops Google indexing the preview as a duplicate of the site
you are about to launch. Do not "fix" it.

## 5 · Before you point the domain at it

**The backend has to exist or every form is dead.** Do `BACKEND-SETUP.md` first,
then re-test the order flow on the preview. A form posting to `/api/order` with
no `DB` binding will not error visibly — it is written to always show the
customer the thank-you page — so "it looked fine" is not evidence. The
verification query in that document is.

**The portal is reachable now.** This page used to say the opposite, and the
correction is worth reading rather than skipping: `functions/api/order.js` mints
a token on every order that gets an id, stores its SHA-256 in `order_tokens`,
and puts the URL in the confirmation mail. Flag **cxxxvi** is closed. Two
properties of that design will look like faults the first time you meet them
and are not: the database holds only the hash, so a lost email means issuing a
*new* token rather than looking the old one up; and the mint is wrapped in
`safe()`, so a D1 hiccup at that moment costs the link, not the order — the
customer gets a confirmation without a portal URL instead of losing the order.
Flag **xxxviii** is still open and decides whether a token dies on first use or
stays valid until it expires; today it is the second.

**Two things are built, correct, and still not usable by a client:**

- **There is no payment processor.** Flag **xlii** is a decision waiting on you,
  and section 14 (VAT) is deferred behind it. Nothing on the site takes money.
- **`PRODUCTS_PER_DAY = 18`** in the capacity gate is a placeholder that has
  never been checked against what you can actually finish in a day. Every
  delivery date the site promises rests on it. The brief's standing rule is
  *never promise a delivery date the capacity gate hasn't cleared* — right now
  the gate clears them against a number nobody has verified. Flag **xxxvii**.

**Two defects break at the first real client**, both known, both scoped, neither
fixed: a failed `orders` INSERT still returns the customer a dated confirmation
for an order that doesn't exist (**lxxv**), and the portal serves
full-resolution deliverables as thumbnails whenever `preview_key` is null, so a
client's browser downloads the finished work to draw a preview (**xli**).

## 6 · Cutting over

URL shape is unchanged for everything that survived the repositioning, and
everything that didn't is a real 301 in `public/_redirects` — the retired order
funnel (`/order`, `/order-catalog`, `/order-custom`, `/order-lifestyle`,
`/order-video` and the `/nl` twins) to `/start`, `/order-status` to `/o`, and
`/models` to `/custom-models`. All 28 lines are explicit 301s, both with and
without a trailing slash, and none of them names a route the site actually
serves — that last one has been checked mechanically, because a rule in that
file outranks a real page and would take it off the air with no error anywhere.

`public/sitemap.xml` is current: 62 entries against 64 routes, and the two
absentees are `/thank-you` and `/nl/thank-you`, which are deliberately
`noindex`. Nothing to regenerate.

`public/robots.txt` disallowed `/order-status`, which stopped being a page when
section 10 retired it. That line is gone: a `Disallow` on a redirect *source*
forbids the fetch, so the crawler never sees the 301 and never learns the page
moved, which is the only thing a 301 exists to say. The file now carries a
comment explaining why neither `/order-status` nor `/o` is listed, because both
omissions look like oversights and neither is. The portal stays out of the index
by answering with `x-robots-tag: noindex, nofollow` — letting a crawler in to be
told no is stronger than forbidding the request that carries the refusal.

**There is no `public/_headers` file, and this document is not going to add one
for you.** The site ships with whatever Cloudflare sets by default: no
`X-Content-Type-Options`, no `Referrer-Policy`, no explicit cache policy on
`public/img`. None of that stops a deploy and none of it is urgent for a
brochure site with no login. It is called out because the two obvious things to
put in such a file are both traps here. A Content-Security-Policy with the usual
`script-src 'self'` would break the site on the first page load: four templates
carry inline `<script>` — `Layout.astro`, `StartPage.astro` and both languages
of `gallery.astro` — and every one of them would stop executing silently. And a
long `max-age` on `/img/*` would freeze your photography in visitors' browsers
for the duration, because those are hand-optimised `.webp` with stable filenames
rather than the content-hashed bundles Astro emits for its own assets; replacing
a product shot would not reach anyone who had already seen the old one. If you
want headers, they want designing once, deliberately — not guessing at them on
deploy day.

---

*Numbers in this file were measured, not remembered. If you change the shape of
the site and this document starts disagreeing with it, that disagreement is the
document's fault — say so and it gets corrected. The previous version rotted
quietly for months, which is exactly how a deploy checklist stops being one.*
