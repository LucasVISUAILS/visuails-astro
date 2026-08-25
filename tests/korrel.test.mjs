/*
 * ═══════════════════════════════════════════════════════════════════════════════
 * DE TWEE KORRELLAGEN HOREN HETZELFDE GETAL TE DRAGEN  ·  npm run test:korrel
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * ── WAT ER MISGING, EN WAAROM GEEN ENKELE ANDERE TOETS HET ZAG ──────────────
 *
 * Lucas, 24 augustus 2026: *"Iets minder film grain op achtergrond."* De
 * grondlaag in `body::before` ging van .05 naar .04. `.korrel-mee` ging niet mee
 * en bleef op .05 staan.
 *
 * Dat is geen kwestie van smaak maar een omkering. `.korrel-mee` bestaat om de
 * korrel die een DEKKENDE FOTO tegenhoudt terug te leggen: op een punt waar de
 * foto dekking α heeft laat de grond (1 − α) door, en deze laag vult α aan.
 * Samen is dat precies één keer de dekking van de grondlaag — mits de twee
 * getallen gelijk zijn. Met .05 hier en .04 daar droeg een fotoband ineens MEER
 * korrel dan de grond eromheen, en het verschil dat deze laag moest wegnemen was
 * er weer, met het teken omgedraaid.
 *
 * Er is geen screenshot die dit vangt. Het gaat om een verschil van .01 in ruis
 * over een verloop; dat verdrinkt in de compressie van elke opname, en tegen de
 * tijd dat een mens het ziet is het al een maand oud. Het is wél in de bron te
 * lezen, want daar staan het twee getallen die gelijk horen te zijn.
 *
 * ── DIT PINT GEEN WAARDE, MAAR EEN GELIJKHEID ──────────────────────────────
 *
 * Er staat nergens dat de korrel .04 moet zijn. Zet Lucas hem morgen op .03 of
 * op .06, dan blijft deze toets groen zolang hij ze ALLEBEI verzet — en dat is
 * precies de handeling die vergeten werd. Een toets die het getal zelf vastlegde,
 * zou bij de volgende wens rood gaan op een verandering die goed is, en dan wordt
 * hij weggehaald in plaats van gevolgd (zie SCHRIJFWIJZER.md §6).
 */
import { readFileSync } from 'node:fs';

const css = readFileSync(new URL('../src/styles/global.css', import.meta.url), 'utf8');

let pass = 0, fail = 0;
const check = (naam, gekregen, verwacht) => {
  const ok = JSON.stringify(gekregen) === JSON.stringify(verwacht);
  if (ok) pass++; else fail++;
  console.log(`${ok ? ' ok  ' : 'FAIL '} ${String(naam).padEnd(56)}${ok ? '' : `  kreeg ${JSON.stringify(gekregen)}, verwacht ${JSON.stringify(verwacht)}`}`);
};

/* ── DE GRONDLAAG ───────────────────────────────────────────────────────────
   Zijn dekking staat niet in een CSS-regel maar IN de data-URI, op de <rect>
   binnen de SVG, want die laag draagt nog twee verlopen die hun eigen dekking
   hebben en dus niet mee mogen zakken. Vandaar dat hier de eerste
   `opacity='…'` uit het body::before-blok wordt gelezen en niet een
   `opacity:`-regel. */
const grondBlok = /body::before\s*\{([\s\S]*?)\n\}/.exec(css);
check('het body::before-blok is gevonden', Boolean(grondBlok), true);
const grond = grondBlok && /opacity='([\d.]+)'/.exec(grondBlok[1]);
check('en er staat een korreldekking in', Boolean(grond), true);

/* ── DE LAAG OVER DE FOTO ───────────────────────────────────────────────── */
const meeBlok = /\.korrel-mee\s*\{([\s\S]*?)\n\}/.exec(css);
check('het .korrel-mee-blok is gevonden', Boolean(meeBlok), true);
const mee = meeBlok && /(?:^|\n)\s*opacity:\s*([\d.]+)\s*;/.exec(meeBlok[1]);
check('en er staat een dekking in', Boolean(mee), true);

if (grond && mee) {
  const a = Number(grond[1]);
  const b = Number(mee[1]);
  console.log(`\n  grondlaag body::before  ${a}\n  fotolaag  .korrel-mee    ${b}\n`);
  check('de fotolaag draagt dezelfde dekking als de grondlaag', b, a);
}

/* ── EN DE LEZER VINDT DE FOUT ALS HIJ ER ECHT STAAT ────────────────────────
   Zonder deze helft bewijst groen hierboven niets: twee regexen die niets
   vinden, melden ook nooit een verschil. */
{
  const nep = `body::before {\n  background: url("...opacity='0.05'/%3E...") 0 0 / 170px repeat;\n}\n.korrel-mee {\n  opacity: .04;\n}`;
  const g = /opacity='([\d.]+)'/.exec(/body::before\s*\{([\s\S]*?)\n\}/.exec(nep)[1])[1];
  const m = /(?:^|\n)\s*opacity:\s*([\d.]+)\s*;/.exec(/\.korrel-mee\s*\{([\s\S]*?)\n\}/.exec(nep)[1])[1];
  check('de lezer ziet een verschil dat er echt is', Number(g) !== Number(m), true);
}

console.log(`\n${pass}/${pass + fail} geslaagd`);
process.exit(fail ? 1 : 0);
