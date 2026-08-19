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

## 7 · De wekelijkse back-up

*Dit onderdeel staat in het Nederlands, zoals al het nieuwere materiaal in deze
repository. De secties hierboven blijven Engels; die worden niet omgezet om een
sectie heen.*

Er is één ding in dit project dat je niet opnieuw kunt maken: de database. De
bestellingen, de revisiegeschiedenis, de indeling per product, de notities, de
factuurnummers. R2 heeft geen versiebeheer en D1's point-in-time recovery is
Cloudflare's kopie op Cloudflare's account — precies het ding dat je niet meer
kunt gebruiken op de dag dat je dat account kwijt bent.

`npm run backup` maakte die kopie al. Wat eraan ontbrak was dat het gebeurde
zonder dat je eraan dacht, en dat je hoorde wanneer het stopte.

### Eenmalig instellen

Eén regel in een opdrachtprompt, in de map van het project:

```
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\install-backup-task.ps1
```

Dat is alles. Het script zet de taak neer, leest hem daarna terug uit de
Taakplanner en drukt af wat er werkelijk staat.

**Hier stond eerst een regel met `schtasks`**, over twee regels met een `^` ertussen
en met `\"`-escapes in de `/tr`-waarde. Op 12 augustus 2026 ging dat mis op de enige
manier die je niet ziet: `schtasks` meldde `SUCCESS` en zette een taak neer met het
pad er twee keer in. Een verkeerd ingestelde back-uptaak die zegt dat hij goed
staat, is erger dan geen taak — want dan kijk je er niet meer naar. Vandaar een
script: het pad komt uit het script zelf (`$PSScriptRoot`), dus er valt geen pad met
spaties en haakjes met de hand te quoten, en aan het einde controleert het of de
taak precies één pad uitvoert.

Wat het instelt, en waarom:

- **wekelijks, zondag 13:00** — de middag en niet de nacht. Dat komt door het punt
  hieronder: de taak loopt alleen als je bent aangemeld, en op een middag ben je dat.
  's Nachts om drie uur staat de machine uit en gebeurt er niets.
- **alleen wanneer je bent aangemeld** (`LogonType Interactive`) — geen beperking maar
  een eis: `wrangler` bewaart zijn inloggegevens in jouw Windows-profiel, en een taak
  die als SYSTEM draait heeft die niet. De variant "uitvoeren ook als de gebruiker
  niet is aangemeld" vraagt je wachtwoord, en dat is een slechtere ruil dan een taak
  die op maandag inhaalt.
- **inhalen na een gemiste start** (`-StartWhenAvailable`) — het belangrijkste van de
  drie. Staat de PC zondag uit, dan loopt de back-up bij je volgende aanmelding in
  plaats van pas de week erna. `schtasks` kan dit niet meegeven; daar moest je het
  met de hand aanvinken.
- **uit de slaapstand halen** (`-WakeToRun`) — alleen nuttig als de machine slaapt in
  plaats van uitstaat, en het kost niets als dat niet zo is.

Er hoeft daarna niets meer met de hand aangevinkt te worden.

### Controleren dat het werkt

Draai hem één keer met de hand, en kijk dan op drie plekken:

```
scripts\backup-weekly.bat
```

1. **`backups\`** — er staat een `<datum>-d1.sql` en een `<datum>-r2.json`.
2. **`backups\_log\laatste.txt`** — het volledige verslag van de laatste ronde. Bij
   een geslaagde ronde eindigt dat bestand op `KLAAR - gelukt`.
3. **`/admin`** — bovenaan staat een chip **"Back-up ok · \<datum\>"**. Die leest
   `app_settings.backup_last_run`, en die rij schrijft `scripts/backup.mjs` als de
   export echt gelukt is (er staan tabellen in, en `orders`, `customers` en `files`
   zitten erbij).

De Taakplanner zet "Laatste resultaat van uitvoering" op `0x0` als het goed ging.
Staat er `0x1`, dan staat in `laatste.txt` waarom. Negen van de tien keer is dat
de wrangler-login: `npx wrangler whoami` in de projectmap zegt het meteen.

### Wat er gebeurt als het stopt

Dit is het stuk dat niet op je PC zit, en met opzet.

`cron/index.js` leest elke nacht `app_settings.backup_last_run`. Is die datum ouder
dan **tien dagen** — of staat er niets — dan gaat er een mail naar `NOTIFY_EMAIL`,
en daarna hoogstens één keer per week zolang de toestand duurt. Tien dagen en niet
zeven: één gemiste zondag is een uitgezette laptop, twee gemiste zondagen is een
taak die niet meer loopt. En hoogstens één keer per week, omdat een mail die elke
nacht komt de mail is die je na een week wegveegt.

De alarmbel hangt dus in de cloud en de back-up op je schijf. Dat is de hele
constructie: **een PC die het probleem is, kan het probleem niet melden.** Dezelfde
reden waarom `cron_last_run` bestaat, één laag hoger.

Beide wachters staan naast elkaar bovenaan `/admin`, en de drempels staan op twee
plekken (`WATCH` in `src/lib/admin.js` en `BACKUP_STALE_DAYS` in `cron/index.js`).
Verander je er één, verander dan de ander mee — `tests/backup-age.test.mjs` houdt
de rest vast.

### De bestanden zelf

De standaard back-up neemt de database en een *inventaris* van R2 mee, niet de
beelden. Dat is een keuze: de database is een paar honderd kilobyte en in seconden
binnen, de bucket is gigabytes en duurt uren, en een wekelijkse kopie van het
eerste is een gewoonte die je volhoudt. De inventaris is het verschil tussen
"alles weg" en "ik weet precies welke 340 bestanden weg zijn en bij welke klant ze
hoorden".

Doe één keer, met de hand, een volledige kopie inclusief beelden — en daarna
opnieuw wanneer de bibliotheek wezenlijk gegroeid is:

```
npm run backup -- --files
```

### Terugzetten

Met opzet handwerk. Op de dag dat je het nodig hebt, wil je kijken naar wat je
terugzet voordat je het over de echte database heen giet. Op een **lege** database:

```
npx wrangler d1 execute visuails --remote --file backups/<datum>-d1.sql
```

### Wat hier niet in staat

Een Cloudflare API-token in een omgevingsvariabele zou de taak onafhankelijk maken
van je wrangler-login, en dus ook laten lopen als SYSTEM en zonder aanmelding. Dat
is een betere constructie, maar het is een sleutel met schrijfrechten op je hele
account die dan op je schijf staat. Dat is een afweging die je één keer bewust
maakt en niet en passant op een deploy-avond — en het hoort in ieder geval niet in
een chatvenster of in deze repository.

## 8 · De nachtelijke taak — een APART project, en dus een aparte deploy

Dit stond hier niet, en dat is precies één keer misgegaan: `cron/` is een eigen
Cloudflare Worker met zijn eigen `cron/wrangler.toml`. **Een push naar GitHub
deployt hem NIET mee.** De Pages-build hierboven bouwt `dist/` en pakt
`functions/` op; `cron/` valt daar buiten. Verander je iets in `cron/index.js`,
dan blijft de oude versie draaien tot je hem los uitrolt.

Waarom het een tweede project is: Pages Functions hebben geen `scheduled`
handler, een Worker wel. Zie de kop van `cron/wrangler.toml`, die de hele
afweging draagt.

### De twee commando's

Kopieer ze zoals ze staan, elk op een eigen regel:

```
npm run cron:check
```

```
npm run cron:deploy
```

`cron:check` is `wrangler deploy --dry-run`: hij bouwt en controleert de
bindings en uploadt niets. Loopt die schoon, dan is `cron:deploy` de echte.

### PLAK GEEN COMMENTAAR ACHTER EEN COMMANDO

Op 18 augustus 2026 ging dit mis en het is de moeite van opschrijven waard,
want het ziet eruit als een fout in het project en het is er geen. In een
instructie stond:

```
npm run cron:check     # droogloop, bouwt schoon
```

In **PowerShell en cmd.exe is `#` geen commentaarteken.** Windows gaf de hele
Nederlandse zin door aan wrangler, die antwoordde met
`Unknown arguments: droogloop,, ik, heb, hem, net, gedraaid:, bouwt, schoon` en
zijn volledige helptekst. Er was niets kapot: het commando was nooit gedraaid.

In `bash` en `zsh` had het gewerkt. Op Windows hoort de uitleg dus BOVEN het
blok en niet erin — zoals in dit document.

*(De `Assertion failed: !(handle->flags & UV_HANDLE_CLOSING), file
src\win\async.c` die daar soms achteraan komt, is Node die op Windows rommelig
afsluit nádat wrangler al met een fout is gestopt. Het is de nasleep van het
afbreken en niet de oorzaak ervan.)*

### De sleutel staat op het TWEEDE project

`RESEND_API_KEY` is een secret en secrets zijn per project. Hij op de
Pages-site zetten doet niets voor deze Worker. Controleren:

```
npx wrangler secret list --config cron/wrangler.toml
```

Zetten als hij er niet staat:

```
npx wrangler secret put RESEND_API_KEY --config cron/wrangler.toml
```

Zonder die sleutel valt er niets om — de taak doet alles behalve mailen en zegt
in de log dat hij niet kon mailen. Dat is met opzet: opruimen, vrijgeven en de
abonnementswacht zijn belangrijker dan het bericht erover. Maar de herinnering
naar een klant met een lege wachtrij gaat dan ook niet uit.

### Wat hij doet, in de volgorde waarin hij het doet

Eén trigger om 03:10 UTC, vijf taken, elk met zijn eigen `try` zodat er geen
één een ander meesleept:

1. vensters vrijgeven die nooit betaald werden
2. verlopen bestanden opruimen (bewaartermijn uit `/privacy` §6)
3. vastgelopen facturen alsnog uitgeven
4. **de abonnementswacht** — een klant mailen wiens vaste week over vijf dagen
   begint met een lege lijst, en de uitzonderingen in het nachtverslag zetten
5. de leeftijd van de back-up controleren

Geen mail betekent: er was niets te doen en er ging niets mis. Of de Worker
draait niet — en dáárvoor bestaat `app_settings.cron_last_run`, die /admin
bovenaan leest. Staat daar een datum van vannacht, dan loopt hij.

### Lokaal proberen zonder te wachten tot 03:10

```
npm run cron:run
```

Dat start `wrangler dev --test-scheduled`; daarna kun je de taak met de hand
afvuren op het adres dat hij noemt.

---

*Numbers in this file were measured, not remembered. If you change the shape of
the site and this document starts disagreeing with it, that disagreement is the
document's fault — say so and it gets corrected. The previous version rotted
quietly for months, which is exactly how a deploy checklist stops being one.*
