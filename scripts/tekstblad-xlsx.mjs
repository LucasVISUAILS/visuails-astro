/*
 * VISUAILS — tekstronde/blad.json als één werkblad om na te kijken, ZONDER PYTHON
 *   npm run build && node scripts/tekstblad.mjs && node scripts/tekstblad-xlsx.mjs
 *   (TEKSTEN.bat doet alle drie)
 *
 * Levering 71 (5 november 2026). Dezelfde tabel als scripts/tekstblad-xlsx.py, maar
 * in Node met scripts/lib/xlsx.mjs: op Lucas' pc staat geen Python. Twee tabbladen:
 * "Lees mij" met de uitleg, en "Tekst" met alle regels. Alleen de kolommen
 * "Engels nieuw" en "Nederlands nieuw" vul je in; de andere kolommen zijn hoe een
 * teruggestuurde regel herkend wordt. TEKSTEN-TOEPASSEN.bat leest hem terug.
 *
 * Geen kleuren in de cellen (de Node-schrijver kent alleen vet en terugloop): de twee
 * kolommen om in te vullen staan achteraan en heten "… nieuw".
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { schrijfXlsx } from './lib/xlsx.mjs';

const WORTEL = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export const PAGINA_ORDE = ['home', 'catalog', 'lifestyle', 'video', 'merkmodel', 'prijzen', 'abonnementen',
  'hoe-het-werkt', 'vergelijken', 'studio', 'modellen', 'galerij', 'over-ons', 'faq', 'gidsen',
  'uploadrichtlijnen', 'proefvisual', 'start', 'start-catalog', 'start-lifestyle', 'start-allebei',
  'start-video', 'start-merkmodel', 'start-eigen-look', 'start-abonnement', 'contact', 'bedankt',
  'portaal', 'voorwaarden', 'privacy', 'cookies', 'ai-act', 'verwerkersovereenkomst'];
export const GROEP_ORDE = ['Pagina', 'Menu en voettekst', 'VISUAILS Studio', 'E-mail', 'WhatsApp'];

/** De kolommen van het tabblad Tekst, in deze volgorde. tekst-toepassen.mjs leest ze op naam. */
export const KOLOMMEN = [
  ['id', 13], ['groep', 17], ['waar', 24], ['blok', 26], ['soort', 11],
  ['bron', 34], ['let op', 34], ['Engels nu', 58], ['Nederlands nu', 58],
  ['Engels nieuw', 44], ['Nederlands nieuw', 44],
];

export function sorteer(rijen) {
  return rijen
    .map((r, i) => ({ r, i, g: GROEP_ORDE.includes(r.groep) ? GROEP_ORDE.indexOf(r.groep) : 9, p: PAGINA_ORDE.includes(r.slug) ? PAGINA_ORDE.indexOf(r.slug) : 99 }))
    .sort((a, b) => a.g - b.g || a.p - b.p || a.i - b.i)
    .map((x) => x.r);
}

export function letOp(r) {
  const uit = [];
  if (r.interp?.length) uit.push(`de code vult in:  ${r.interp.join('  ·  ')}`);
  if (r.waarschuwing) uit.push(`LET OP — ${r.waarschuwing}`);
  if (r.elders?.length) uit.push(`staat ook op ${r.elders.length} andere pagina${r.elders.length === 1 ? '' : "'s"}`);
  return uit.join(' · ');
}

export function leesMij(aantal) {
  const r = [];
  const blok = (kop, regels) => { r.push([kop]); for (const t of regels) r.push(['', t]); r.push([]); };
  r.push(['VISUAILS · tekstronde']);
  r.push([`Gemaakt op ${new Date().toLocaleDateString('nl-NL')} uit de gebouwde site en de broncode (TEKSTEN.bat)`]);
  r.push([]);
  blok('Wat je hier hebt', [
    `Alle ${aantal} zinnen die een klant van VISUAILS te lezen krijgt, op het tabblad Tekst: de publieke pagina's in beide talen, het menu en de voettekst, de schermen in VISUAILS Studio, de e-mails die uitgaan, en de voorgevulde WhatsApp-berichten.`,
    'Ze staan in de volgorde waarin je ze tegenkomt: van de voordeur naar de kassa, daarna het portaal, daarna de berichten.',
  ]);
  blok('Wat jij doet', [
    'Lees de kolommen "Engels nu" en "Nederlands nu". Klopt de zin, doe je niets: leeg betekent ongewijzigd.',
    'Wil je hem anders, typ je versie in "Engels nieuw" en/of "Nederlands nieuw". Dat zijn de enige twee kolommen die je invult.',
    'Je hoeft niet in één keer door. Filter op de kolom "waar" en doe één pagina, sla op, ga later verder.',
    'Klaar? Sla het bestand op (als .xlsx) en dubbelklik TEKSTEN-TOEPASSEN.bat. Die laat eerst zien wat er verandert, en past het pas toe als jij J typt.',
  ]);
  blok('Wat je NIET aanpast', [
    'De kolommen id, groep, waar, blok, soort, bron en let op. Daaraan wordt de rij herkend.',
    'Rijen verwijderen of de volgorde omgooien hoeft niet: filteren doet hetzelfde en houdt het bestand heel.',
  ]);
  blok('De kolom "let op"', [
    'Staat er "de code vult in: …", dan vult de code dat stuk van de zin in (een bedrag, een aantal). Schrijf je het bedrag voluit, dan staat het straks vast en beweegt het niet meer mee met de prijslijst. Laat dat stuk staan zoals het er staat.',
    'Staat er "staat ook op N andere pagina\'s", dan verander je met deze ene rij die N pagina\'s tegelijk.',
  ]);
  blok('De kolom "bron"', [
    'HomeV2.astro › en.priceLede: het bestand, en daarin de sleutel priceLede in de Engelse helft.',
    'delivery.js › mailGeleverd(): de zin staat los in die functie en niet onder een sleutel.',
    'Een tilde ~ erachter: het adres is op een DEEL van de zin gevonden; de zin wordt samengesteld.',
  ]);
  return r;
}

export function tekstRijen(rijen) {
  const kop = KOLOMMEN.map(([n]) => n);
  return [kop, ...sorteer(rijen).map((r) => [r.id, r.groep, r.waar, r.blok, r.soort, r.bron, letOp(r), r.en || '', r.nl || '', '', ''])];
}

export function maakTekstblad(rijen) {
  return schrijfXlsx(null, {
    bladen: [
      { naam: 'Lees mij', rijen: leesMij(rijen.length), breedtes: [22, 104], kop: false },
      { naam: 'Tekst', rijen: tekstRijen(rijen), breedtes: KOLOMMEN.map(([, b]) => b) },
    ],
  });
}

/** Een naam in `map` die er nog niet is: VISUAILS-tekstronde-2026-11-05.xlsx, dan -2, -3 … */
export function nieuweNaam(map, datum = new Date().toISOString().slice(0, 10)) {
  for (let i = 1; ; i++) {
    const p = path.join(map, `VISUAILS-tekstronde-${datum}${i > 1 ? `-${i}` : ''}.xlsx`);
    if (!fs.existsSync(p)) return p;
  }
}

const hierAangeroepen = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (hierAangeroepen) {
  const bron = path.join(WORTEL, 'tekstronde', 'blad.json');
  if (!fs.existsSync(bron)) { console.error('  ROOD: tekstronde\\blad.json ontbreekt. Draai eerst node scripts/tekstblad.mjs (TEKSTEN.bat doet dat).'); process.exit(1); }
  const rijen = JSON.parse(fs.readFileSync(bron, 'utf8'));
  /* Nooit over een bestaande heen: daar kan je ingevulde ronde in staan. Elke keer
     een nieuwe naam met de datum (en -2, -3 … op dezelfde dag). */
  const pad = process.argv[2] || nieuweNaam(path.join(WORTEL, 'tekstronde'));
  fs.writeFileSync(pad, maakTekstblad(rijen));
  fs.writeFileSync(path.join(path.dirname(pad), 'LAATSTE-TABEL.txt'), path.basename(pad));
  console.log(`  geschreven: ${path.relative(WORTEL, pad)} · ${rijen.length} regels`);
}
