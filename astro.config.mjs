// @ts-check
import fs from 'node:fs';
import { defineConfig, sessionDrivers } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
import brandLockupGuard from './scripts/brand-lockup-guard.mjs';
import sitemapAnd404 from './scripts/sitemap-and-404.mjs';
/* De `dateModified` per pagina, uit git. Moet VÓÓR de sitemapstap staan: die leest
   de datum weer uit de gebouwde HTML voor zijn <lastmod>. Zie de kop van dat
   bestand voor waarom de datum niet uit de klok komt. */
import gewijzigdOp from './scripts/gewijzigd-op.mjs';
/* /llms.txt — de kaart voor iets dat de site citeert. Zie de kop van dat
   bestand; hij draait na de build om dezelfde reden als de sitemap. */
import llmsTxt from './scripts/llms-txt.mjs';
import avifNaastWebp from './scripts/avif-naast-webp.mjs';
import stijlUitDePagina from './scripts/stijl-uit-de-pagina.mjs';
import cspScripts from './scripts/csp-scripts.mjs';
import plaatshouders from './scripts/plaatshouders.mjs';
// De woff2's voor Studio, portaal en /admin — die laden de sitebundel niet.
import fontsVoorWorker from './scripts/fonts-voor-worker.mjs';

// VISUAILS — Astro v2 rebuild. Fully static output (Cloudflare Pages serves
// the build/ output directly, same deploy shape as the previous SvelteKit
// site). Motion is vanilla CSS/JS (see src/scripts/interactions.js). Beeld gaat
// niet door astro:assets: het staat als vooraf geschaalde .webp in public/img en
// krijgt bij de build een AVIF-bron ernaast — zie IMAGES.md voor waarom, en de
// drie integraties onderaan voor wat er wél in de build gebeurt.
/* ── LIGT SATOSHI ER? — 8 september 2026 ──────────────────────────────────
   Eén keer per build gemeten, hier, met gewone fs. Layout.astro en
   StudioLayout.astro lezen het als __SATOSHI__ en linken op grond daarvan
   public/fonts/satoshi/satoshi.css — zie de noot in dat bestand voor wat er
   dan omgaat, en de noot in Layout.astro voor wat hier eerst stond en waarom
   dat de site sloopte zodra de schakelaar voor het eerst aan ging.

   Waarom niet gewoon altijd linken: dan vraagt de browser een woff2 op die er
   niet is, en dat is een 404 in de console — waar tests/consoleschoon.test.mjs
   op let, en terecht.

   Alleen het romeinse bestand telt. Ligt de cursieve er niet naast, dan valt
   die ene stijl terug op Instrument Sans; dat is een detail, geen halve site. */
const SATOSHI = fs.existsSync(new URL('./public/fonts/satoshi/Satoshi-Variable.woff2', import.meta.url));

export default defineConfig({
  site: 'https://visuails.com',
  /* ── ÉÉN WORKER — 5 SEPTEMBER 2026 ─────────────────────────────────────────
   *
   * Tot hier was dit een Pages-project: Astro bouwde de statische site, en de
   * serverkant (bestelling, betaling, dashboard, beheer) stond los ernaast in
   * /functions, buiten Astro om. Dat is waarom het dashboard er anders uitzag dan
   * de site: het deelde er geen Layout, geen fonts, geen tokens mee.
   *
   * Nu is het één Worker. Dezelfde build levert de statische pagina's (als assets)
   * én de server-routes (dist/server/entry.mjs). De site zelf blijft volledig
   * statisch — `output: 'static'` — en alleen de bestanden in src/pages die
   * `export const prerender = false` zeggen, draaien op de server. Zie
   * src/pages/api/, /account, /admin en /o: dunne endpoints die de bestaande
   * handlers in /functions aanroepen. De handlers zelf zijn niet veranderd.
   */
  adapter: cloudflare({
    /* Onder `astro dev` draaien de server-routes in workerd met de bindings uit
       wrangler.toml en een lokale D1/R2 in .wrangler/state/v3 — dezelfde staat
       als `wrangler dev` gebruikt, dus `npm run migrate -- --local` hoeft maar
       één keer. Dat is de standaard van de adapter; er staat hier bewust niets
       over. */
    /* Beeld gaat niet door astro:assets (zie IMAGES.md); geen beeldservice in de
       Worker dan ook. */
    imageService: 'passthrough',
    /* De statische pagina's bouwen onder Node, zoals altijd. De adapter wil ze
       standaard in workerd bouwen, en daar kan /gallery de map public/img niet
       lezen en struikelen de /start-pagina's over een URL zonder host. De Worker
       zelf draait natuurlijk wél in workerd; dit gaat alleen over de build. */
    prerenderEnvironment: 'node',
  }),
  /* Geen Astro-sessies. Het dashboard, het beheer en het portaal hebben hun
     eigen sessies (cookies plus tabellen in D1, zie src/lib/account.js en
     admin.js). Zonder deze regel zet de adapter er een KV-namespace "SESSION"
     bij die bij elke deploy aangemaakt wordt en nooit gebruikt. */
  session: { driver: sessionDrivers.null() },
  /* Astro's eigen Origin-controle op formulier-POSTs staat UIT, en dat is geen
     versoepeling: elke handler doet die controle al zelf (originIsSelf in
     account.js, de Origin-vergelijking in admin.js en portal.js), precies zoals
     onder Pages. Astro's versie zou wél iets breken: Mollie's webhook post
     application/x-www-form-urlencoded zonder Origin-header, en die zou dan
     zonder een regel code van ons een 403 krijgen — en de betaling blijft dan
     stil op "open" staan. */
  security: { checkOrigin: false },
  output: 'static',
  trailingSlash: 'ignore',
  // Bilingual: English at the root (/), Dutch at /nl.
  // prefixDefaultLocale:false keeps the existing English URLs unchanged;
  // localized pages live in src/pages/nl. See src/i18n/ui.js for the shared
  // string dictionary and the Layout's language switcher/hreflang.
  i18n: {
    defaultLocale: 'en',
    locales: ['en', 'nl'],
    routing: { prefixDefaultLocale: false },
  },
  build: {
    format: 'directory',
    /* Met een adapter zet Astro de statische bestanden standaard in dist/client
       en de Worker in dist/server. Hier blijft de statische site in de wortel van
       dist/ staan, precies waar hij altijd stond: elke test in tests/ en elk
       script dat de gebouwde HTML leest, kijkt in dist/index.html. De Worker
       staat ernaast in dist/server/ en wordt door public/.assetsignore buiten de
       assets gehouden. */
    client: './',
    server: './server/',
    /* ── GEEN ENKELE STIJL IN DE PAGINA — 1 SEPTEMBER 2026 ────────────────────
     *
     * Astro zet een kleine componentstylesheet standaard als <style> IN de pagina.
     * Dat scheelt een verzoek en het kost precies het ding dat we hier willen:
     * `style-src 'self'` blokkeert een inline <style> net zo goed als een inline
     * script. Geteld in de build: 302 <style>-elementen, 57 unieke — die zouden
     * allemaal als hash in de header moeten, ruim drie kilobyte, op elk antwoord
     * van elke pagina.
     *
     * 'never' maakt er gewone bestanden van. Ze worden gecachet (met een hash in
     * de naam), ze zijn deelbaar tussen pagina's, en `style-src 'self'` heeft
     * geen enkele hash meer nodig. De prijs is een verzoek erbij op een verbinding
     * die toch al open staat.
     */
    inlineStylesheets: 'never',
  },
  // NO `redirects` BLOCK HERE — deliberately. Retired routes are 301s in
  // public/_redirects, which Cloudflare Pages applies at the edge.
  //
  // Astro's `redirects` option does work in a static build, but what it emits
  // is a meta-refresh + canonical stub: a 200 OK HTML page that bounces the
  // browser. That is enough to keep a visitor off a 404 and not much more.
  // Link equity passes murkily, a crawler pays for a fetch and a parse to
  // learn the page moved, and anything that follows redirects without running
  // HTML sees a success. Section 10 replaced the stubs with real 301s; see the
  // header comment in public/_redirects for the routes and the reasoning.
  //
  // If a route needs retiring later, add it there, not here. Two mechanisms
  // for one job is how a stub and a 301 end up disagreeing about a
  // destination.
  compressHTML: true,
  // The one brand rule that markup can break silently: the V glyph and the
  // wordmark are two alternative signatures, never a lockup. Checked on the
  // built HTML, so it holds for every page and every component that renders
  // one. See scripts/brand-lockup-guard.mjs for the exact formulation.
  // De sitemap wordt uit de build gelezen in plaats van met de hand bijgehouden, en
  // de Nederlandse 404 wordt platgezet zodat Cloudflare Pages hem vindt. Zie de kop
  // van scripts/sitemap-and-404.mjs: het handgeschreven bestand liep veertien
  // pagina's achter, waaronder /demo, waar niets naartoe linkte.
  // Elke <img> die naar een /img/*.webp wijst waar een .avif naast ligt, wordt in
  // een <picture> gezet met de AVIF ervoor. 19.4 MB webp tegen 9.3 MB AVIF, en de
  // webp blijft als terugval staan. In de build en niet in een component, omdat het
  // om 73 tags in 38 bestanden gaat en om directives (transition:name) die niet door
  // een component heen kunnen — zie de kop van scripts/avif-naast-webp.mjs.
  // En als LAATSTE: de script-src van de publieke site, gehasht uit de gebouwde
  // HTML. Publieke pagina's hadden wel HSTS en frame-ancestors maar geen CSP, en de
  // reden daarvoor (1663 inline style-attributen) gaat over stijl en niet over
  // scripts. Laatste in de rij omdat hij de HTML hasht die de stappen ervóór
  // eventueel nog herschrijven — zie de kop van scripts/csp-scripts.mjs.
  // gewijzigdOp() staat als TWEEDE en niet ergens achteraan: hij schrijft de
  // dateModified in de JSON-LD, en sitemapAnd404() leest die er meteen daarna weer
  // uit voor de <lastmod>. Achteraan zou hij de HTML aanpassen nadat csp-scripts hem
  // gehasht heeft — en dan klopt de hash niet meer met wat er staat.
  // En dan de twee stappen die de CSP mogelijk maken, in deze volgorde: eerst de
  // stijl uit de pagina halen (1735 attributen → 149 klassen, plus de <style>-
  // blokjes die Astro voor view-transitions maakt), dan de hashes van de scripts
  // berekenen op de HTML zoals hij er ná die verhuizing uitziet.
  // plaatshouders() staat VÓÓR avifNaastWebp(): hij maakt van de oude foto's een
  // .svg, en de avif-stap laat alles wat geen .webp is met rust. Zie
  // src/data/beeld.js voor de knop en de lijst.
  integrations: [brandLockupGuard(), gewijzigdOp(), sitemapAnd404(), llmsTxt(), plaatshouders(), avifNaastWebp(), fontsVoorWorker(), stijlUitDePagina(), cspScripts()],
  /* __SATOSHI__ wordt tijdens het bouwen vervangen door true of false — zie de
     noot bij de constante bovenaan dit bestand. Vervanging en geen import, zodat
     er in de Worker niets te lezen valt en er niets kan mislukken. */
  vite: { define: { __SATOSHI__: JSON.stringify(SATOSHI) } },
});
