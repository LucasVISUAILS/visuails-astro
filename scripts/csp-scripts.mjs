/*
 * ═══════════════════════════════════════════════════════════════════════════════
 * script-src OP DE PUBLIEKE SITE, MET HASHES UIT DE BUILD
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * ── WAT ER MIS WAS ──────────────────────────────────────────────────────────
 *
 * De 93 statische pagina's hadden alles behalve een Content-Security-Policy:
 * HSTS, nosniff, Referrer-Policy, Permissions-Policy en `frame-ancestors 'none'`
 * staan sinds 9 augustus 2026 in public/_headers. De CSP zelf stond er niet, en
 * de reden staat in dat bestand: `style-src 'self'` blokkeert ook inline
 * style-ATTRIBUTEN, en die zijn er 1663. Een CSP toevoegen zou de opmaak van de
 * hele site slopen.
 *
 * DAT ARGUMENT GAAT OVER STIJL EN NIET OVER SCRIPTS. `script-src` is een aparte
 * richtlijn; hem toevoegen raakt geen enkel style-attribuut, want zonder
 * `default-src` valt `style-src` nergens op terug. De helft die wél kan, is
 * bovendien de helft die ertoe doet: een geïnjecteerd <script> is het verschil
 * tussen een lelijke pagina en een pagina die meeleest.
 *
 * ── WAAROM DE HASHES UIT dist/ KOMEN EN NIET UIT DE BRON ────────────────────
 *
 * Er staan negen unieke inline scripts in de build, over 93 pagina's verdeeld.
 * Ze met de hand hashen zou werken tot de eerste keer dat iemand er een regel in
 * verandert — en dan is het gevolg niet een foutmelding maar een pagina waarop de
 * cookiebanner het stil niet meer doet. Erger nog: ÉÉN ervan hangt aan een
 * omgevingsvariabele. `CF_ANALYTICS_TOKEN` wordt bij het bouwen in de pagina
 * gezet, dus die hash is in Lucas' productiebuild een andere dan hier. Een
 * ingetypte lijst zou dus precies daar breken waar niemand hem test.
 *
 * Deze stap leest daarom de GEBOUWDE HTML, hasht wat er werkelijk in staat, en
 * schrijft de header in dist/_headers. Verandert er een script, dan verandert de
 * hash mee zonder dat iemand eraan hoeft te denken.
 *
 * ── WAT ER BEWUST NIET IN DE HEADER STAAT ───────────────────────────────────
 *
 * · GEEN `style-src`. Zie hierboven: 1663 attributen, dat is een opruiming en
 *   geen header. Hem hier alvast neerzetten met 'unsafe-inline' erbij zou een
 *   regel opleveren die streng oogt en niets doet — erger dan geen regel, want
 *   dan denkt iedereen dat het geregeld is.
 * · GEEN `default-src`. Diezelfde val: `default-src` zou style-src meetrekken.
 * · GEEN `'unsafe-inline'` bij script-src. Een hash-lijst NAAST 'unsafe-inline'
 *   wordt door de browser genegeerd ten gunste van de laatste — dan is de hele
 *   berekening hieronder decoratie.
 *
 * ── WAT ER WEL BIJ MOET, EN WAAROM ──────────────────────────────────────────
 *
 * · `'self'` voor de gebundelde /_astro/*.js.
 * · static.cloudflareinsights.com, want src/scripts/consent.js hangt de beacon
 *   er pas NA een expliciete ja aan. Zonder deze host is het gevolg van "ja"
 *   een geblokkeerd script en geen enkele melding — precies het soort stilte
 *   waar de kop van consent.js over gaat.
 * · `object-src 'none'` en `base-uri 'self'`: allebei gratis. Een <base> die
 *   iemand injecteert, verlegt elk relatief pad op de pagina, en dat is een
 *   omweg om 'self' te laten wijzen waar hij niet hoort.
 *
 * ── EN JSON IS GEEN SCRIPT ──────────────────────────────────────────────────
 *
 * <script type="application/ld+json"> en <script type="application/json"> worden
 * nooit uitgevoerd; de browser bereidt ze niet voor als script en toetst ze dus
 * ook niet aan script-src. Ze worden hier overgeslagen — hun inhoud hashen zou
 * de header 101 hashes langer maken voor blokken die niets kunnen doen.
 */

import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { globSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

/** De hosts die een script mogen leveren, buiten de site zelf. */
export const SCRIPT_HOSTS = ['https://static.cloudflareinsights.com'];

/*
 * De host waar de Cloudflare-beacon zijn meting naartoe stuurt. Dat is een
 * ANDERE host dan waar het script vandaan komt — het script staat op
 * static.cloudflareinsights.com, de POST gaat naar cloudflareinsights.com
 * /cdn-cgi/rum. Wie alleen de scripthost in connect-src zet, blokkeert de
 * meting en ziet daar niets van, want de beacon slikt zijn eigen fout.
 */
export const CONNECT_HOSTS = ['https://cloudflareinsights.com'];

/** De regel waarop de header in dist/_headers wordt vervangen. */
const CSP_REGEL = /^(\s*)Content-Security-Policy:.*$/m;

/**
 * Elk <script> zonder src, behalve de JSON-blokken.
 *
 * DE HASH GAAT OVER DE INHOUD TUSSEN DE TAGS, byte voor byte zoals hij in het
 * bestand staat — dat is wat de browser hasht, inclusief de witruimte en de
 * regeleindes. Vandaar geen trim() en geen normalisatie: elke opschoning hier is
 * een hash die niet meer klopt.
 */
/**
 * Elke <style> die in de pagina is BLIJVEN staan.
 *
 * scripts/stijl-uit-de-pagina.mjs haalt ze er normaal uit, met één uitzondering
 * die ertoe doet: een <style> binnen <noscript>. Daar IS de plek de voorwaarde —
 * verhuizen betekent hem altijd laten gelden, en dat heeft één keer de
 * before/after-slider gesloopt (zie de kop van die stap). Zo'n blok blijft dus
 * staan, en dan heeft `style-src 'self'` een hash nodig.
 *
 * Net als bij de scripts wordt er gehasht wat er WERKELIJK in de build staat, en
 * niet wat iemand hier heeft ingetypt: verandert die regel, dan verandert de hash
 * mee zonder dat er aan gedacht hoeft te worden.
 */
export function inlineStyleHashes(html) {
  const uit = new Set();
  for (const m of html.matchAll(/<style([^>]*)>([\s\S]*?)<\/style>/g)) {
    uit.add(`'sha256-${createHash('sha256').update(m[2], 'utf8').digest('base64')}'`);
  }
  return uit;
}

export function inlineScriptHashes(html) {
  const uit = new Set();
  for (const m of html.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/g)) {
    const attrs = m[1];
    if (/\ssrc\s*=/.test(attrs)) continue;
    const type = (/type\s*=\s*"([^"]*)"/.exec(attrs) || [, ''])[1];
    if (/json/i.test(type)) continue;
    uit.add(`'sha256-${createHash('sha256').update(m[2], 'utf8').digest('base64')}'`);
  }
  return uit;
}

/** De volledige headerwaarde, uit een verzameling hashes. */
export function cspWaarde(hashes, stijlHashes = []) {
  return [
    "frame-ancestors 'none'",
    "object-src 'none'",
    "base-uri 'self'",
    /* ── style-src ERBIJ, SINDS scripts/stijl-uit-de-pagina.mjs ───────────────
     * Dit stond hier niet, en de reden was hard: 1735 inline style-attributen en
     * 302 <style>-elementen in de build. Sinds die stap zijn het er nul — alle
     * stijl staat in bestanden onder /_astro/ — en dan is `'self'` genoeg, zonder
     * één hash en zonder 'unsafe-inline'.
     *
     * GEEN APARTE style-src-attr. Zonder die richtlijn valt een style-attribuut
     * terug op deze regel en is het dus geblokkeerd, en dat is precies wat we
     * willen: gebeurt het toch weer, dan valt het meteen op in plaats van stil
     * door een ruimere -attr te worden toegelaten.
     *
     * DE HASHES ZIJN VOOR WAT ER MOEST BLIJVEN STAAN. Eén <style> zit in een
     * <noscript> en kan daar niet weg: daar is de PLEK de voorwaarde. Zie
     * inlineStyleHashes() hierboven.
     */
    ['style-src', "'self'", ...[...(stijlHashes || [])].sort()].join(' '),
    ['script-src', "'self'", ...SCRIPT_HOSTS, ...[...hashes].sort()].join(' '),
    /* ── DE REST VAN DE DEUREN, GEMETEN EN NIET GEGOKT ────────────────────────
     *
     * script-src en style-src stonden er al; alles wat GEEN script en geen stijl
     * is, viel tot nu toe nergens onder — er is geen default-src, dus img, font,
     * fetch en formulierdoel waren onbeperkt. Dat is precies het gat waar een
     * geïnjecteerde <img src="https://…/?c=" + document.cookie> doorheen loopt:
     * geen script nodig, en de CSP kijkt er niet naar.
     *
     * Elke waarde hieronder is aan de BUILD gemeten, niet uit het hoofd:
     *
     *   img-src   'self' data: — 651 verwijzingen naar visuails.com zelf, en in
     *             de stylesheets drie data:image/svg+xml-achtergronden (de ruis-
     *             filter en twee chevrons). Geen enkele externe afbeelding.
     *   font-src  'self' — alle woff2 staan onder /_astro/. Geen Google Fonts,
     *             geen Typekit; als er ooit één bij komt, valt hij hier om en
     *             dat is de bedoeling.
     *   connect-src — elke fetch en XHR in src/scripts/ gaat naar /api/… of
     *             /account/… op de eigen origin. Daarbuiten alleen de beacon.
     *   media-src 'self' — VideoExamples.astro zet <source src> op eigen
     *             bestanden. Vandaag staat er nog geen clip in de build; de
     *             regel staat er wél, zodat de eerste clip niet stilvalt.
     *   form-action 'self' — de 204 formulieren in de build posten naar
     *             /account/logout, /api/order en /account/plan/start. Een
     *             betaling verlaat de site via een SERVER-redirect en niet via
     *             een formulier, dus Mollie hoort hier niet.
     *   frame-src 'none' — er staat geen enkele iframe in de build.
     *   worker-src 'none' — geen Worker, geen serviceWorker.
     *
     * GEEN default-src. Die zou al deze regels overbodig lijken maken en is
     * juist gevaarlijker: hij dekt ook richtlijnen die we niet overwogen hebben
     * met een waarde die we niet voor die richtlijn gekozen hebben. Liever een
     * lijst die zegt wat hij dekt, en die omvalt bij het eerste nieuwe soort
     * verzoek — dan staan we ervoor in plaats van dat het stil goed gaat.
     */
    "img-src 'self' data:",
    "font-src 'self'",
    ['connect-src', "'self'", ...CONNECT_HOSTS].join(' '),
    "media-src 'self'",
    "form-action 'self'",
    "frame-src 'none'",
    "worker-src 'none'",
  ].join('; ');
}

export async function schrijfCsp(distDir) {
  const paginas = globSync(join(distDir, '**/*.html').replace(/\\/g, '/'));
  const hashes = new Set();
  const stijl = new Set();
  for (const p of paginas) {
    const html = await readFile(p, 'utf8');
    for (const h of inlineScriptHashes(html)) hashes.add(h);
    for (const h of inlineStyleHashes(html)) stijl.add(h);
  }

  const pad = join(distDir, '_headers');
  let tekst;
  try {
    tekst = await readFile(pad, 'utf8');
  } catch {
    /* Geen _headers in de build betekent dat public/_headers is weggehaald. Dan is
       er meer aan de hand dan een ontbrekende CSP, en stil een nieuw bestand
       aanmaken zou dat verstoppen. */
    return { paginas: paginas.length, hashes: hashes.size, stijl: stijl.size, geschreven: false };
  }
  if (!CSP_REGEL.test(tekst)) {
    return { paginas: paginas.length, hashes: hashes.size, stijl: stijl.size, geschreven: false };
  }
  await writeFile(pad, tekst.replace(CSP_REGEL, `$1Content-Security-Policy: ${cspWaarde(hashes, stijl)}`), 'utf8');
  return { paginas: paginas.length, hashes: hashes.size, stijl: stijl.size, geschreven: true };
}

export default function cspScripts() {
  return {
    name: 'visuails:csp-scripts',
    hooks: {
      /* ALS LAATSTE IN DE RIJ INTEGRATIES. avif-naast-webp schrijft HTML terug;
         zou deze stap eerder draaien, dan hashte hij een pagina die daarna nog
         verandert. Dat de AVIF-stap geen scripts aanraakt, is vandaag waar en is
         geen reden om de volgorde aan het toeval over te laten. */
      'astro:build:done': async ({ dir, logger }) => {
        /* fileURLToPath en geen eigen ombouw — zie de noot in
           scripts/sitemap-and-404.mjs over "Claude%20(VISUAILS)". */
        const uit = await schrijfCsp(fileURLToPath(dir));
        if (!uit.geschreven) {
          logger.warn('csp: geen Content-Security-Policy-regel in dist/_headers gevonden — header NIET geschreven');
          return;
        }
        logger.info(`csp: script-src met ${uit.hashes} hash(es), style-src met ${uit.stijl}, uit ${uit.paginas} pagina's`);
      },
    },
  };
}
