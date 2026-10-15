/**
 * GEEN NIEUWE HARDGETYPTE BEDRAGEN OF DAGTERMIJNEN — punt 9.11, 8 oktober 2026
 *
 *   npm run test:hardgetypt
 *   node tests/hardgetypt.test.mjs --telling     (de huidige telling per bestand, om de lijst bij te werken)
 *
 * ── WAAROM ───────────────────────────────────────────────────────────────────
 *
 * Bedragen horen in src/data/pricing.js (en plans.js, vat.js), termijnen in
 * src/lib/retention.js en src/data/juridischeDatums.js (werkafspraak: "nooit
 * een getal hardtypen dat al een constante heeft"). Toch kwamen ze telkens terug
 * zonder dat een test het zag: €69 in videoStyles.js, "€1" in
 * VideoStyleDetail.astro, '+7 days' op vier plekken (§17 van het overzicht).
 *
 * Deze test doorzoekt src/, cron/ en functions/ (zonder commentaar) op een
 * euro-bedrag ("€ 89", "89 €", "EUR 89") en op een dagtermijn in SQL
 * ("'+7 days'"). Wat er vandaag staat, staat hieronder per bestand met een
 * aantal en een reden. Komt er in een bestand een bij, dan faalt precies dat
 * bestand, met de regel erbij. Wordt het er minder (een opruimronde zoals 9.01
 * pakket A), dan meldt hij dat de uitzondering krapper kan — zonder te falen,
 * zodat een opruimer nooit rood ziet omdat hij iets goeds deed.
 *
 * Wat hij NIET doet: getallen zonder €-teken vangen (een "89" in een tabel), of
 * termijnen in lopende tekst ("binnen 7 dagen"). Die vorm is te gewoon om zonder
 * valse meldingen te zoeken; de bedragentest (tests/bedragen.test.mjs) houdt de
 * bron vast, en de beloftetest (promises) een deel van de teksten.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const MAPPEN = ['src', 'cron', 'functions'];
const BRONNEN = new Set([
  'src/data/pricing.js', 'src/data/plans.js', 'src/data/vat.js',
  'src/lib/retention.js', 'src/data/juridischeDatums.js',
]);
const EURO = /€\s?\d[\d.,]*|\d[\d.,]*\s?€|\bEUR\s?\d/g;
const DAGEN = /['"`][+-]\s?\d+\s+days?['"`]/g;

/** Commentaar eruit, zodat uitleg met een bedrag erin mag blijven staan. */
export function zonderCommentaar(tekst) {
  return tekst
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
    .replace(/<!--[\s\S]*?-->/g, (m) => m.replace(/[^\n]/g, ' '))
    .split('\n')
    .map((r) => r.replace(/(^|[\s;,{}()])\/\/.*$/, '$1'))
    .join('\n');
}

function bestanden(map) {
  const uit = [];
  const loop = (d) => {
    for (const e of fs.readdirSync(path.join(ROOT, d), { withFileTypes: true })) {
      const p = `${d}/${e.name}`;
      if (e.isDirectory()) loop(p);
      else if (/\.(m?js|astro|ts)$/.test(e.name)) uit.push(p);
    }
  };
  loop(map);
  return uit;
}

export function telling() {
  const t = {};
  for (const m of MAPPEN) {
    for (const f of bestanden(m)) {
      if (BRONNEN.has(f)) continue;
      const code = zonderCommentaar(fs.readFileSync(path.join(ROOT, f), 'utf8'));
      const regels = code.split('\n');
      const vondsten = [];
      regels.forEach((r, i) => {
        for (const re of [EURO, DAGEN]) {
          re.lastIndex = 0;
          for (const x of r.match(re) || []) vondsten.push({ regel: i + 1, wat: x.trim(), tekst: r.trim().slice(0, 110) });
        }
      });
      if (vondsten.length) t[f] = vondsten;
    }
  }
  return t;
}

/* ── DE UITZONDERINGEN VAN VANDAAG, MET REDEN ────────────────────────────────
   [aantal, reden]. Het aantal is hoeveel er vandaag (8 okt 2026) in staan. */
const VOORBEELD = 'een voorbeeldbedrag in een getekend scherm of uitleg (geen prijs die de klant betaalt)';
const PROEF = 'de €1-proef: zelfde getal als AMOUNT.testSample; staat als tekst in de pagina (9.01 pakket A)';
const SQL = "een SQL-datummodifier ('+N days'); hoort in retention.js of het termijnenbestand van 9.01";
const TOEGESTAAN = {
  'cron/index.js': [4, `${SQL}: '-30 days' (aanbevelingen/levering, venster van de nachtrapport-telling) en '-7 days' (goedgekeurde aanbeveling)`],
  'functions/api/order.js': [3, `'+7 days' = venster vasthouden onbetaald (§22: "hardgetypt, §17"); plus ${PROEF}`],
  'functions/api/webhook/mollie.js': [1, `${SQL}: '-1 day' tegen een dubbele betaling`],
  'src/lib/subscription.js': [1, `${SQL}: '-1 day' voor een openstaande betaling`],
  'src/lib/admin.js': [3, 'twee keer de boekgrens "€ 1.000" in /admin-tekst en "tot € 16.900" (Merk jaar vooruit) in een /admin-uitleg; alleen voor Lucas'],
  'src/lib/notify.js': [1, `de studiomail aan Lucas noemt het proefbedrag; ${PROEF}`],
  'src/i18n/ui.js': [1, PROEF],
  'src/components/VideoStyleDetail.astro': [2, PROEF],
  'src/components/LaptopCarousel.astro': [2, `${VOORBEELD}: de prijs op de getekende webshop van een klant`],
  /* 12 oktober 2026: dezelfde getekende webshop, nu in het laptopscherm van het
     voorbeeld van de nieuwe voorpagina (/voorbeeld/). Ook geen prijs van ons. */
  /* 15 oktober 2026: de getekende webshop staat sinds levering 48b in de bron van de
     laptopstanden (HalLaptopSchermen.astro); HalLaptop.astro toont alleen nog foto's. */
  'src/components/HalLaptopSchermen.astro': [2, `${VOORBEELD}: de prijs op de getekende webshop van een klant (JOUWMERK), NL en EN`],
};

const telt = telling();
const args = process.argv.slice(2);
if (args.includes('--telling')) {
  for (const [f, v] of Object.entries(telt)) console.log(`  '${f}': [${v.length}, ''],  // ${[...new Set(v.map((x) => x.wat))].join(' ')}`);
  process.exit(0);
}

let goed = 0, totaal = 0;
const ok = (naam, kreeg, wil = true) => {
  totaal++;
  const g = JSON.stringify(kreeg) === JSON.stringify(wil);
  if (g) goed++;
  console.log(`${g ? ' ok  ' : ' FAIL'} ${naam}${g ? '' : `  verwacht ${JSON.stringify(wil)} kreeg ${JSON.stringify(kreeg)}`}`);
};

console.log('\ngeen nieuwe hardgetypte bedragen of dagtermijnen in src/, cron/ en functions/');
const nieuw = [];
const krapper = [];
for (const [f, v] of Object.entries(telt)) {
  const mag = TOEGESTAAN[f]?.[0] ?? 0;
  if (v.length > mag) nieuw.push(`${f}: ${v.length} (was ${mag}) — ${v.map((x) => `r${x.regel} ${x.wat}`).join(', ')}`);
}
for (const [f, [mag]] of Object.entries(TOEGESTAAN)) {
  const nu = telt[f]?.length ?? 0;
  if (nu < mag) krapper.push(`${f}: ${nu} in plaats van ${mag}`);
}
ok('geen bestand heeft er een bij (anders: zet het bedrag in pricing.js, de termijn in retention.js)', nieuw, []);
ok('elke uitzondering heeft een reden', Object.entries(TOEGESTAAN).filter(([, [, r]]) => !r).map(([f]) => f), []);
ok('de bronbestanden zelf worden niet doorzocht', [...BRONNEN].every((b) => fs.existsSync(path.join(ROOT, b))), true);
if (krapper.length) console.log(`  (minder dan toegestaan, de uitzondering kan krapper: ${krapper.join('; ')})`);

/* De zoeker zelf: vangt hij wat hij moet vangen, en laat hij commentaar staan? */
const proef = zonderCommentaar("const a = '€ 69'; // €70 in uitleg\n/* € 71 */\nconst b = `datetime('now', '+7 days')`;\nconst u = 'https://x.nl/€5';");
ok('de zoeker vangt € 69, +7 days en een bedrag in een URL, niet het commentaar',
  [proef.match(EURO), proef.match(DAGEN)].map((m) => (m || []).map((x) => x.trim())), [['€ 69', '€5'], ["'+7 days'"]]);

console.log(`\n${goed}/${totaal} geslaagd`);
if (goed !== totaal) process.exit(1);
