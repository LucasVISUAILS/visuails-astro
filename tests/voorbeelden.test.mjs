/*
 * ═══════════════════════════════════════════════════════════════════════════════
 * DE VOOR/NA-PAREN OP DE HOMEPAGE
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Deze sectie is het enige bewijs op de hele site dat de INVOER een gewone
 * telefoonfoto is. Alles wat er verder staat is uitvoer — mooi, en het bewijst
 * iets anders.
 *
 * Lucas, 30 augustus 2026: *"1 foto als bewijs in de tweede is natuurlijk niet
 * genoeg."* Daarom leest de sectie sinds vandaag een lijst in plaats van twee
 * vaste bestandsnamen, en past de opmaak zich aan het aantal aan. Deze toets
 * bewaakt wat er dan mis kan gaan.
 *
 * ── DRIE DINGEN, EN DE EERSTE IS DE BELANGRIJKSTE ──────────────────────────
 *
 *   1 · Elk pad in de lijst bestaat ook echt in public/img. Een typefout in een
 *       bestandsnaam geeft geen bouwfout: Astro zet de <img> gewoon neer, de
 *       browser vindt niets, en er staat een leeg vlak op de plek waar het
 *       bewijs hoorde te staan. Dat is precies het soort fout dat pas opvalt
 *       als iemand de gebouwde pagina opent — en dat is al eens gebeurd, met
 *       de EXAMPLES-lijst op /custom-models (zie de noot daar: twee losse
 *       strings in een lijst met objecten, een derde van het bewijsraster leeg).
 *
 *   2 · De maten staan erbij en kloppen met het bestand. Compare.astro werpt
 *       zelf al bij een onbekende maat, maar een maat die er WEL staat en niet
 *       klopt, komt daar ongemerkt doorheen en laat de pagina verspringen.
 *
 *   3 · Beide talen hebben hun teksten. Een ontbrekende `nl` zou de Engelse
 *       alt-tekst op de Nederlandse pagina zetten, en dat is precies het soort
 *       stille taalgat dat de rest van deze site met check_lang_parity bewaakt.
 *
 * ── WAT DEZE TOETS NIET DOET ───────────────────────────────────────────────
 *
 * Hij eist GEEN minimum aantal. Er is er vandaag één omdat er op schijf één
 * echt paar is; een toets die er twee eist zou rood staan tot iemand er een
 * verzint, en verzonnen bewijs is precies wat deze site verbiedt. Wat hij wel
 * doet is het aantal AFDRUKKEN, zodat het opvalt als het jaren één blijft.
 */

import { readFileSync, existsSync, statSync } from 'node:fs';
import { VOORBEELDEN, voorbeelden, voorbeeldBestanden } from '../src/data/voorbeelden.js';

let goed = 0, totaal = 0;
const ok = (naam, werkelijk, verwacht) => {
  totaal++;
  const gelijk = JSON.stringify(werkelijk) === JSON.stringify(verwacht);
  if (gelijk) goed++;
  console.log(`${gelijk ? ' ok  ' : 'FAIL '} ${String(naam).padEnd(58)} ${gelijk ? '' : `verwacht ${JSON.stringify(verwacht)} kreeg ${JSON.stringify(werkelijk)}`}`);
};

const pad = (src) => new URL(`../public${src}`, import.meta.url);

console.log(`de lijst telt ${VOORBEELDEN.length} paar${VOORBEELDEN.length === 1 ? '' : 'en'}`);
ok('er staat er minstens één', VOORBEELDEN.length >= 1, true);
if (VOORBEELDEN.length === 1) {
  console.log('     (er is op schijf één echt voor/na-paar — zie de kop van src/data/voorbeelden.js)');
}

console.log('\nelk bestand bestaat, en de maat klopt');
for (const src of voorbeeldBestanden()) {
  ok(`${src} staat in public/img`, existsSync(pad(src)), true);
}

/** De breedte en hoogte uit de webp-kop. VP8X, VP8L en VP8 (lossy) hebben
 *  elk hun eigen plek voor het formaat; alle drie komen voor in public/img. */
function webpMaat(bestand) {
  const b = readFileSync(bestand);
  if (b.toString('ascii', 0, 4) !== 'RIFF' || b.toString('ascii', 8, 12) !== 'WEBP') return null;
  const soort = b.toString('ascii', 12, 16);
  if (soort === 'VP8X') return { w: 1 + b.readUIntLE(24, 3), h: 1 + b.readUIntLE(27, 3) };
  if (soort === 'VP8L') {
    const bits = b.readUInt32LE(21);
    return { w: 1 + (bits & 0x3fff), h: 1 + ((bits >> 14) & 0x3fff) };
  }
  if (soort === 'VP8 ') return { w: b.readUInt16LE(26) & 0x3fff, h: b.readUInt16LE(28) & 0x3fff };
  return null;
}

for (const v of VOORBEELDEN) {
  for (const [rol, beeld] of [['voor', v.voor], ['na', v.na]]) {
    const f = pad(beeld.src);
    if (!existsSync(f)) continue;
    const m = webpMaat(f);
    ok(`${v.id}/${rol}: ${beeld.w}×${beeld.h} klopt met het bestand`,
      m ? [m.w, m.h] : 'geen webp-kop gelezen', [beeld.w, beeld.h]);
    ok(`${v.id}/${rol}: het bestand is niet leeg`, statSync(f).size > 1000, true);
  }
}

console.log('\nbeide talen zijn compleet');
for (const taal of ['en', 'nl']) {
  const lijst = voorbeelden(taal);
  ok(`${taal}: evenveel paren als in de bron`, lijst.length, VOORBEELDEN.length);
  for (const v of lijst) {
    ok(`${taal}/${v.id}: twee alt-teksten`, Array.isArray(v.alt) && v.alt.length === 2 && v.alt.every((a) => a.trim().length > 10), true);
    ok(`${taal}/${v.id}: een bijschrift`, typeof v.cap === 'string' && v.cap.trim().length > 10, true);
  }
}

/* En de id's zijn uniek — ze worden als sleutel gebruikt in de opmaak. */
ok('de id’s zijn uniek', new Set(VOORBEELDEN.map((v) => v.id)).size, VOORBEELDEN.length);

console.log(`\n${goed}/${totaal} geslaagd`);
process.exit(goed === totaal ? 0 : 1);
