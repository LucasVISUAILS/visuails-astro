/*
 * ═══════════════════════════════════════════════════════════════════════════
 * GEEN ZIN IN EEN ZIN
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Op 25 augustus 2026 stonden er ZEVENTIEN kapotte antwoorden op de site, in
 * beide talen, op /faq, /pricing, /catalog, /lifestyle en /video — en in de
 * FAQPage-JSON-LD die Google uitleest. Wat een bezoeker las:
 *
 *   "…gets a reserved 48-hour window — fully confirmed before you pay.. Below…"
 *   "…met bijbehorende datum toont., vanaf 10 producten…"
 *   "Satisfaction check: 1 revision round included per order to adjust any
 *    details.. Tell us what is wrong…"
 *
 * ── DE OORZAAK, EN WAAROM EEN TEST HET JUISTE ANTWOORD IS ──────────────────
 *
 * `turnaround()`, `aftercare()`, `reviewClaim()` en `TIERS.*.delivery` waren
 * FRAGMENTEN toen de aanroepplekken werden geschreven. Een tekstronde heeft er
 * afgeronde zinnen van gemaakt — met een label ervoor en een punt erachter — en
 * de tientallen plekken die ze middenin een zin plakken zijn niet meegegaan.
 *
 * Dat is geen fout van één van beide kanten en het gebeurt weer. Iemand
 * herschrijft een belofte, de belofte is nog steeds waar, en de punctuatie
 * valt om op vijf pagina's tegelijk zonder dat er iets kapotgaat waar een
 * mens naar kijkt. `clause()` in pricing.js is de reparatie; dit bestand is
 * wat de volgende ronde tegenhoudt.
 *
 * ── WAAROM DIT DE GERENDERDE STRING LEEST EN NIET DE BRON ──────────────────
 *
 * Omdat de fout pas ontstaat bij het samenvoegen. In de bron staat
 * `${aftercare(...)}. Tell us…` en dat ziet er goed uit; pas als de functie een
 * zin met een punt teruggeeft, wordt het `details.. Tell us`. Een test die de
 * broncode leest, ziet dat nooit. Deze roept de echte functies aan.
 */

import {
  faqPageItems, pricingFaqs, serviceFaqs, faqPageGroups,
} from '../src/data/faq.js';
import { clause, turnaround, aftercare, reviewClaim } from '../src/data/pricing.js';

let goed = 0;
let totaal = 0;
const stuk = [];

function check(naam, waarde, verwacht) {
  totaal += 1;
  const ok = JSON.stringify(waarde) === JSON.stringify(verwacht);
  if (ok) goed += 1;
  console.log(`${ok ? ' ok  ' : 'FAIL '} ${naam.padEnd(58)}${ok ? '' : `verwacht ${JSON.stringify(verwacht)} kreeg ${JSON.stringify(waarde)}`}`);
}

/*
 * DRIE VORMEN, EN ALLEDRIE ONTSTAAN ZE OP DEZELFDE MANIER.
 *
 * `..`  een zin met punt, gevolgd door de punt van de omringende zin.
 * `.,`  dezelfde zin, gevolgd door een komma-clausule.
 * ` .`  een spatie voor een punt, wat gebeurt als de ingevoegde string leeg is.
 *
 * Het beletselteken is uitgezonderd: `...` is een geldig leesteken en geen fout.
 */
function leestekenfouten(t) {
  if (typeof t !== 'string') return [];
  const uit = [];
  if (/(?<!\.)\.\.(?!\.)/.test(t)) uit.push('dubbele punt');
  if (/\.,/.test(t)) uit.push('punt voor komma');
  if (/\s\./.test(t)) uit.push('spatie voor punt');
  if (/,,/.test(t)) uit.push('dubbele komma');
  if (/\s,/.test(t)) uit.push('spatie voor komma');
  return uit;
}

console.log('\nclause() haalt de punt weg en laat de rest staan');
{
  check('punt eraf', clause('Twee werkdagen.'), 'Twee werkdagen');
  check('meerdere punten eraf', clause('Klaar...'), 'Klaar');
  check('zonder punt blijft gelijk', clause('Twee werkdagen'), 'Twee werkdagen');
  check('spaties eromheen weg', clause('  Twee werkdagen.  '), 'Twee werkdagen');
  check('hoofdletters blijven staan', clause('Levering via WhatsApp.'), 'Levering via WhatsApp');
  check('leeg blijft leeg', clause(''), '');
  check('null wordt leeg en gooit niet', clause(null), '');
  /* Een vraagteken of uitroepteken is geen zinsafsluiter die hier weg mag: die
     dragen betekenis. Alleen de punt gaat eraf. */
  check('vraagteken blijft', clause('Klopt dat?'), 'Klopt dat?');
}

console.log('\nde bouwstenen zelf zijn hele zinnen — dat mag, mits ze via clause() gaan');
{
  /* Deze controle legt de HUIDIGE vorm vast. Verandert hij, dan is dat prima —
     maar dan hoort iemand hier te lezen waarom deze test bestaat voordat hij het
     getal aanpast. */
  check('turnaround attended eindigt op een punt', /\.$/.test(turnaround('attended', 'en')), true);
  check('aftercare eindigt op een punt', /\.$/.test(aftercare('attended', 'en')), true);
  check('reviewClaim eindigt op een punt', /\.$/.test(reviewClaim('attended', 'en')), true);
  check('en clause() haalt hem er in alle drie af', [
    /\.$/.test(clause(turnaround('attended', 'en'))),
    /\.$/.test(clause(aftercare('attended', 'en'))),
    /\.$/.test(clause(reviewClaim('attended', 'en'))),
  ], [false, false, false]);
}

console.log('\ngeen enkel gerenderd antwoord heeft een leestekenfout');
{
  const bronnen = [];
  for (const lang of ['en', 'nl']) {
    faqPageItems(lang).forEach((it, i) => {
      bronnen.push([`faqPageItems.${lang}[${i}].q`, it.q]);
      bronnen.push([`faqPageItems.${lang}[${i}].a`, it.a]);
    });
    pricingFaqs(lang).forEach((it, i) => {
      bronnen.push([`pricingFaqs.${lang}[${i}].q`, it.q]);
      bronnen.push([`pricingFaqs.${lang}[${i}].a`, it.a]);
    });
    for (const dienst of ['catalog', 'lifestyle', 'video']) {
      serviceFaqs(dienst, lang).forEach((it, i) => {
        bronnen.push([`serviceFaqs.${dienst}.${lang}[${i}].q`, it.q]);
        bronnen.push([`serviceFaqs.${dienst}.${lang}[${i}].a`, it.a]);
        /* Sommige dienstvragen dragen een `html`-veld voor de rijke weergave. */
        if (it.html) bronnen.push([`serviceFaqs.${dienst}.${lang}[${i}].html`, it.html]);
      });
    }
    faqPageGroups(lang).forEach((g, i) => bronnen.push([`faqPageGroups.${lang}[${i}].title`, g.title]));
  }

  for (const [waar, tekst] of bronnen) {
    const f = leestekenfouten(tekst);
    if (f.length) stuk.push([waar, f.join(' + '), tekst]);
  }

  check(`${bronnen.length} gerenderde strings nagelopen`, stuk.length, 0);
  for (const [waar, wat, tekst] of stuk) {
    console.log(`      ${waar}  [${wat}]`);
    console.log(`      ${tekst.slice(0, 200)}`);
  }
}

console.log(`\n${goed}/${totaal} geslaagd`);
if (goed !== totaal) process.exit(1);
