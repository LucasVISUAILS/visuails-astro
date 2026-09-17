/* VISUAILS — staat de stijl vóór het aantal, en staat hij er precies één keer?
 *   npm run test:stijlkeuze      (vereist een build: npm run build)
 * ══════════════════════════════════════════════════════════════════════════════
 * WAAROM DEZE TOETS BESTAAT — 13 SEPTEMBER 2026
 * ══════════════════════════════════════════════════════════════════════════════
 * Lucas heeft dezelfde klacht twee keer gemaakt, negen september en dertien
 * september:
 *
 *   *"Als je vanaf deze pagina op start order klikt ga je gelijk naar het
 *   bestelformulier zonder een style gekozen te hebben."*
 *
 *   *"De klant moet altijd een style kiezen voor elke service die ze kiezen dus
 *   fix dit en controleer waar dit nog meer gebeurd anders is het voor de klant
 *   ook totaal niet duidelijk wat ze kunnen ontvangen en verlaten dan gelijk de
 *   bestelpagina."*
 *
 * De reparatie van 9 september zette de stijlregel op /start/catalog, maar op
 * de plek waar het blok stond dat hem rendeerde: als ZEVENDE element in stap 1,
 * onder het meelopende totaal. Gemeten op 13 september stond "Welke look?" op
 * /start/lifestyle zelfs op plek NEGEN — ná het aantal, ná de prijsuitleg en ná
 * het totaal. De klant zag dus eerst een bedrag en daarna pas waar het over
 * ging.
 *
 * ── DRIE REGELS, EN ALLE DRIE ZIJN ZE ÉÉN KEER GEBROKEN ────────────────────
 *
 *   1 · ELKE BESTELPAGINA HEEFT EEN STIJLVELD. /start/catalog had er geen tot
 *       9 september; de bestelling ging de deur uit zonder dat er ergens stond
 *       in welke stijl hij gemaakt werd.
 *   2 · HET STAAT BOVEN HET AANTAL. Anders komt het bedrag vóór wat je ervoor
 *       krijgt, en dan wint het bedrag — zie de kop van BestelOverzicht.astro.
 *   3 · PER CATEGORIE PRECIES ÉÉN. Bij het bouwen van punt 2 stond de regel op
 *       /start/catalog even twee keer op het scherm: één uit de nieuwe
 *       look-slot en één uit de `huisLook`-prop van Step1Options. Twee radio's
 *       met dezelfde `name` in één formulier zijn één groep — de tweede kan de
 *       eerste uitvinken zonder dat iemand het ziet.
 */
import { readFileSync, existsSync } from 'node:fs';

let pass = 0, fail = 0;
function ok(naam, waar, verwacht = true, kreeg = '') {
  if (waar) { pass += 1; console.log(` ok   ${naam}`); }
  else { fail += 1; console.log(`FAIL   ${naam}`.padEnd(64) + `verwacht ${JSON.stringify(verwacht)} kreeg ${JSON.stringify(kreeg)}`); }
}

/* De zes bestelpagina's die een stijl kennen: drie diensten × twee talen. De
   proefvisual staat er niet bij — die maakt één beeld en kiest zijn soort met
   een eigen radiogroep (sample_type), niet met een stijl. */
const PAGINAS = [
  ['/start/catalog/', ['catalog_style']],
  ['/start/lifestyle/', ['style']],
  ['/start/complete/', ['catalog_style', 'style']],
  ['/nl/start/catalog/', ['catalog_style']],
  ['/nl/start/lifestyle/', ['style']],
  ['/nl/start/complete/', ['catalog_style', 'style']],
];

console.log('elke bestelpagina vraagt een stijl, boven het aantal');

/* Geen DOM-bibliotheek: dit project heeft er geen, en er is er ook geen nodig.
   De VOLGORDE IN DE BRON is wat deze toets meet, en die staat één op één in de
   HTML-tekst — het formulier zet stap 1 niet om met grid-order, dus wat eerder
   in het bestand staat, staat hoger op het scherm. Een tekenpositie is daarmee
   een even geldige maat als een DOM-index, en hij leest zonder browser. */
function stapEen(html) {
  const begin = html.indexOf('data-pl-step="1"');
  if (begin === -1) return null;
  /* Tot het begin van stap 2 — of tot het eind als die er niet is. */
  const eind = html.indexOf('data-pl-step="2"', begin);
  return html.slice(begin, eind === -1 ? html.length : eind);
}

for (const [pad, velden] of PAGINAS) {
  const bestand = new URL(`../dist${pad}index.html`, import.meta.url);
  if (!existsSync(bestand)) { ok(`${pad} is gebouwd`, false, 'bestand', 'ontbreekt'); continue; }
  /* ── SCRIPTS TELLEN NIET MEE — 13 september 2026 ─────────────────────────
     De combinatieblok-knop leest de gekozen stijl uit om hem mee te geven aan
     het volgende formulier, en noemt daarvoor `[name="catalog_style"]` in een
     inline script. Dat is geen tweede invoerveld — het POST niets — maar deze
     toets telde het wel als tweede groep, omdat hij op de kale tekst zoekt.
     Een veld staat nooit in een <script>; dat blok kan er dus uit voordat er
     geteld wordt, zonder dat de toets iets echts laat glippen. */
  const zonderScript = readFileSync(bestand, 'utf8').replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '');
  const stap1 = stapEen(zonderScript);
  if (!stap1) { ok(`${pad} heeft een stap 1`, false); continue; }

  const aantal = stap1.indexOf('data-pl-qty');

  for (const veld of velden) {
    const treffers = [...stap1.matchAll(new RegExp(`name="${veld}"`, 'g'))].map((m) => m.index);
    ok(`${pad} vraagt ${veld}`, treffers.length > 0, '≥1', `${treffers.length}`);
    if (!treffers.length) continue;

    /* Radio's staan er zoveel als er keuzes zijn en dat is goed. Wat niet mag
       is twee GROEPEN — twee blokken die allebei hetzelfde veld posten. Die
       liggen in de bron ver uit elkaar; één groep staat binnen een paar
       kilobyte bij elkaar. Vier kilobyte is ruim boven de grootste echte groep
       (het lifestyle-raster met vier looks en hun beelden, ~2,5 kB) en ruim
       onder de afstand tussen twee blokken in stap 1. */
    const gaten = treffers.slice(1).map((t, i) => t - treffers[i]).filter((d) => d > 4096);
    ok(`  en precies één keer`, gaten.length === 0, 0, `${gaten.length + 1} groepen, gaten van ${gaten.join(', ')} tekens`);

    ok(`  en boven het aantal`, aantal === -1 || treffers[0] < aantal,
      'stijl < aantal', `stijl op ${treffers[0]}, aantal op ${aantal}`);
  }

  /* Waar meer dan één stijl te kiezen valt, mag er geen voorgeselecteerd
     antwoord staan en moet de groep verplicht zijn. Eén stijl is geen keuze
     maar een mededeling, en die hoeft niets af te dwingen.

     `checked` en `required` staan in Astro's uitvoer als kaal attribuut, dus
     de test kijkt naar het stukje HTML van elke <input> apart. */
  for (const veld of velden) {
    const inputs = [...stap1.matchAll(new RegExp(`<input[^>]*name="${veld}"[^>]*>`, 'g'))].map((m) => m[0]);
    if (inputs.length >= 2) {
      const aan = inputs.filter((i) => /\schecked(\s|>|=)/.test(i));
      ok(`  ${veld}: geen radio staat vooraf aan`, aan.length === 0, 0, `${aan.length} aangevinkt`);
      const eist = inputs.some((i) => /\srequired(\s|>|=)/.test(i) || /data-pl-req="1"/.test(i));
      ok(`  ${veld}: de radiogroep is verplicht`, eist, true, 'geen enkele radio eist iets');
    }

    /* ── EN DE KEUZELIJST, WANT DIE FAALT ANDERS ─────────────────────────────
       Dit is de fout die deze toets bij het schrijven ervan zelf vond, en hij
       zat op /start/complete: de lifestylestijl is daar geen radiogroep maar
       een <select>, en die stond op zijn eerste optie. Een <select> zonder lege
       eerste optie IS altijd beantwoord — dus iedereen die de lijst niet
       openklapte, bestelde "Dunes" zonder het te weten, op de helft van een
       bestelling die zeven beelden per product oplevert.

       De toets hierboven zag dat niet: hij telde <input>-elementen, en die zijn
       er dan nul. Een regel die alleen de vorm controleert die je toevallig
       voor ogen had, is geen regel. */
    const sel = stap1.match(new RegExp(`<select[^>]*name="${veld}"[^>]*>[\\s\\S]*?</select>`));
    if (sel) {
      const opties = [...sel[0].matchAll(/<option[^>]*>/g)].map((m) => m[0]);
      if (opties.length >= 2) {
        const leeg = opties.filter((o) => /value=""/.test(o));
        ok(`  ${veld}: de keuzelijst opent op een lege optie`, leeg.length === 1, 1,
          `${leeg.length} lege opties — zonder die optie is de eerste stijl het stilzwijgende antwoord`);
        ok(`  ${veld}: en die lege optie staat geselecteerd`,
          leeg.length === 1 && /\sselected(\s|>|=)/.test(leeg[0]), true, leeg[0] || '');
        const eist = /\srequired(\s|>|=)/.test(sel[0].slice(0, sel[0].indexOf('>'))) || /data-pl-req="1"/.test(sel[0]);
        ok(`  ${veld}: en de lijst is verplicht`, eist, true, 'geen required');
      }
    }
  }
}

/* ── EN DE PROP DIE DE DUBBELING MAAKTE, BESTAAT NIET MEER ─────────────────
   `huisLook` rendeerde de stijlregel binnen Step1Options. Zolang die prop
   bestaat kan een volgende pagina hem aanzetten en staat de regel er weer twee
   keer — precies wat er bij het bouwen hiervan gebeurde. */
console.log('\nen de oude tweede plek is echt weg');
{
  const bron = readFileSync(new URL('../src/components/order/Step1Options.astro', import.meta.url), 'utf8');
  const code = bron.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\{\/\*[\s\S]*?\*\/\}/g, '');
  ok('Step1Options rendert geen stijlregel meer', !/StijlRegel/.test(code), true, 'StijlRegel staat er nog in');
  ok('en kent de prop huisLook niet meer', !/huisLook/.test(code), true, 'huisLook staat er nog in');
}

console.log(`\n${pass}/${pass + fail} geslaagd`);
if (fail) process.exitCode = 1;
