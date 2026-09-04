// @ts-check
import { defineConfig } from 'astro/config';
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

// VISUAILS — Astro v2 rebuild. Fully static output (Cloudflare Pages serves
// the build/ output directly, same deploy shape as the previous SvelteKit
// site). Motion is vanilla CSS/JS (see src/scripts/interactions.js). Beeld gaat
// niet door astro:assets: het staat als vooraf geschaalde .webp in public/img en
// krijgt bij de build een AVIF-bron ernaast — zie IMAGES.md voor waarom, en de
// drie integraties onderaan voor wat er wél in de build gebeurt.
export default defineConfig({
  site: 'https://visuails.com',
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
  integrations: [brandLockupGuard(), gewijzigdOp(), sitemapAnd404(), llmsTxt(), avifNaastWebp(), stijlUitDePagina(), cspScripts()],
});
