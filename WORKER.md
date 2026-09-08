# Eén Worker — de site en de serverkant in één build

*5 september 2026. Fase 1 van "dashboard en /admin in Astro": de fundering.
Er is nog niets zichtbaar veranderd. Alles hoort precies zo te werken als
onder Pages.*

## Wat er veranderd is

Tot vandaag was dit een **Cloudflare Pages**-project. Astro bouwde de statische
site naar `dist/`, en de serverkant — bestellen, betalen, het klantdashboard,
het beheer, het portaal — stond ernaast in `functions/` als Pages Functions.
Die twee werelden deelden niets: geen Layout, geen fonts, geen tokens. Dat is
waarom het dashboard er anders uitzag dan de site.

Nu is het **één Worker**. `npm run build` levert in één keer:

- de statische pagina's, in de wortel van `dist/`, precies waar ze stonden;
- de Worker, in `dist/server/entry.mjs`, met daarin alle server-routes.

De handlers zelf zijn **niet** veranderd. `functions/` staat er nog, met
dezelfde code, en alle tests draaien er nog tegen. Wat erbij kwam zijn dunne
Astro-endpoints die ze aanroepen:

| Route | Endpoint | Roept aan |
|---|---|---|
| `/account`, `/account/*` | `src/pages/account/[...path].js` | `src/lib/account.js` |
| `/admin`, `/admin/*` | `src/pages/admin/[...path].js` | `src/lib/admin.js` |
| `/o`, `/o/*` | `src/pages/o/[...token].js` | `src/lib/portal.js` |
| `/api/order`, `/api/step`, `/api/upload`, `/api/capacity`, `/api/order-status` | `src/pages/api/*.js` | `functions/api/*.js` |
| `/api/webhook/mollie`, `/stripe`, `/resend` | `src/pages/api/webhook/*.js` | `functions/api/webhook/*.js` |

De vertaling tussen wat Astro geeft en wat de handlers verwachten staat in
`src/lib/route.js` — één bestand, dertig regels.

`functions/api/debug-egress-ip.js` is weg. Vier documenten vroegen daar al om;
nu de Worker alleen kent wat in `src/pages` staat, is hij vanzelf verdwenen.

### Wat er verder in de config gebeurde

- `astro.config.mjs`: de adapter `@astrojs/cloudflare`, met `build.client './'`
  (statische site blijft in de wortel van `dist/`, voor de tests), zonder
  Astro-sessies (eigen sessies in D1), zonder Astro's Origin-controle (de
  handlers doen die zelf; Astro's versie zou Mollie's webhook een 403 geven),
  en de statische pagina's worden onder Node gebouwd zoals altijd.
- `wrangler.toml`: geen `pages_build_output_dir` meer, wél dezelfde D1, R2 en
  vars. Geen `main` en geen `[assets]` — die vult de adapter zelf in
  (`dist/server/wrangler.json`), en `wrangler deploy` volgt die verwijzing.
- `public/.assetsignore`: `server/` gaat niet mee als bestand, anders zou de
  servercode op `/server/entry.mjs` te lezen zijn.
- `.wrangler/` staat nu in `.gitignore` en niet meer in git. Daar stond een
  lokale D1-database in — werkstaat, geen bron.
- `package.json`: `npm run deploy` (build + `wrangler deploy`) en
  `npm run worker` (`wrangler dev`, lokaal, met lokale D1 en R2).

## De eerste deploy — op een workers.dev-adres, naast de huidige site

De Pages-site blijft gewoon staan. De Worker komt er los naast, met een eigen
adres, tot je hem gezien hebt.

```
npx wrangler whoami            # vernieuwt de login (zie check-wrangler.mjs)
npm run deploy
```

Wrangler meldt het adres: `https://visuails-site.<jouw-account>.workers.dev`.

Dit is een deploy vanaf je eigen machine, niet via een push naar GitHub. Dat is
voor nu de bedoeling: de Pages-koppeling met GitHub blijft de productiesite
bouwen, en de Worker rol je zelf uit tot hij het domein overneemt. (Wil je later
tóch bouwen-bij-push voor de Worker: Workers & Pages → Create → Workers →
Connect to Git, build `npm run build`, deploy `npx wrangler deploy`, en dan
geldt hetzelfde `GIT_DEPTH = 0` als in DEPLOY.md §3 — anders vallen de datums
in de sitemap weg.)

Dan de secrets. **Een Worker deelt geen secrets met een Pages-project**, dus
alles wat je ooit met `wrangler pages secret put` zette, moet nu opnieuw, één
voor één, zonder `pages`:

```
npx wrangler secret put RESEND_API_KEY
npx wrangler secret put MOLLIE_API_KEY
npx wrangler secret put STRIPE_SECRET_KEY
npx wrangler secret put STRIPE_WEBHOOK_SECRET
npx wrangler secret put RESEND_WEBHOOK_SECRET
npx wrangler secret put SELLER_ADDRESS
npx wrangler secret put VISUAILS_IBAN
npx wrangler secret put VISUAILS_VAT
```

(`PORTAL_SALT`, `PAYER_SALT` en `ALLOWED_ORIGIN_HOSTS` alleen als je die op
Pages ook had — BACKEND-SETUP.md §4 zegt van de eerste twee: laat ze leeg.)
Elk commando vraagt om de waarde; plak hem in het venster, niet in het commando
(MOLLIE.md, de les van 10 augustus). Of via het dashboard: Workers & Pages →
visuails-site → Settings → Variables and Secrets.

Wat je daarna op het workers.dev-adres moet zien, in deze volgorde:

1. de homepage, `/nl`, een categoriepagina — identiek aan de Pages-versie;
2. `/order` → 301 naar `/start` (de `_redirects` werken);
3. een pagina die niet bestaat → de eigen 404;
4. `/account/login` — het inlogscherm, en na een e-mailadres een echte mail;
5. `/admin` → `/admin/login`;
6. `/api/capacity?products=12&tier=attended` → JSON met vensters.

Mollie en Stripe posten intussen nog naar visuails.com, dus naar Pages. Dat
blijft zo tot het domein overgaat; de webhooks hoeven nu nog niet aangepast.

## Wat er NIET moet gebeuren — het domein

Zet visuails.com nog **niet** op de Worker. Dat is de laatste stap, na fase 2
en 3, en hij bestaat uit: in het dashboard bij de Worker onder Settings →
Domains & Routes het domein toevoegen, bij Pages het custom domain weghalen,
en in Mollie/Stripe/Resend niets — de webhook-URL's blijven visuails.com.
De cron-worker (`cron/`) blijft een apart project en verandert niet.

## Lokaal

```
npm run dev                          # astro dev, mét de server-routes in workerd
npm run migrate -- --local           # de lokale D1 opbouwen (eenmalig per machine)
npm run build && npm run worker      # de échte Worker, lokaal, op :8787
```

E-mail werkt lokaal niet (geen RESEND_API_KEY), betalen ook niet; dat was
onder `wrangler pages dev` net zo.

## Als het misgaat

De Pages-site is niet aangeraakt. Zolang het domein daar staat, kan de Worker
kapot zijn zonder dat een klant er iets van merkt. `npx wrangler delete` haalt
hem weer weg; de code in git is gewoon te herbouwen.
