/*
 * ═══════════════════════════════════════════════════════════════════════════════
 * DE GOEDGEKEURDE AANBEVELINGEN UIT D1 NAAR src/data/testimonials.js
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 *   npm run testimonials          → lezen en schrijven
 *   npm run testimonials -- --dry → alleen laten zien wat er zou komen
 *
 * ── WAAROM EEN BOUWSTAP EN GEEN QUERY OP DE PAGINA ──────────────────────────
 *
 * ARCHITECTURE.md §1: geen client-side ophalen van paginainhoud. De site is
 * statisch, er staan nul externe scripts op, en /cookie-policy belooft dat ook.
 * Een blok aanbevelingen dat bij het laden fetcht, breekt alle drie tegelijk.
 * Dus leest dit script de rijen één keer en zet ze in een bestand dat meegaat in
 * de build. Zie de kop van src/data/testimonials.js voor de hele keten.
 *
 * ── DE QUERY IS DE PRIVACYGRENS EN NIET DE SCHRIJFKANT ──────────────────────
 *
 * Er wordt precies drie kolommen opgehaald: de tekst, de naam die de klant zelf
 * opgaf, en de maand. Geen e-mailadres, geen bestelnummer, geen bedrag. Dat is
 * met opzet in de SELECT gezet en niet in de filter erna: wat je niet ophaalt,
 * kan ook niet per ongeluk in een bestand belanden dat in git staat en door de
 * hele wereld gelezen wordt.
 *
 * `testimonial_consent = 1` staat er als tweede sluiting op dezelfde deur.
 * saveTestimonial() bewaart al niets zonder vinkje, en /admin/testimonials toont
 * niets zonder vinkje — dit is de derde plek waar het staat, en dat is er één te
 * veel alleen als je nooit een handmatige INSERT hebt zien gebeuren.
 *
 * ── LEEG IS EEN UITKOMST EN GEEN FOUT ───────────────────────────────────────
 *
 * Nul goedgekeurde aanbevelingen is de normale toestand aan het begin. Het script
 * schrijft dan een lege lijst en zegt dat, en de homepage valt terug op de
 * eerlijke regel die er nu al staat: "Nog geen muur vol reviews." Een script dat
 * hierop met een foutcode stopt, zou een build breken om een waarheid.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { wrangler, warmLogin, asCommandArg, volhard } from './lib/wrangler.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DOEL = path.join(ROOT, 'src', 'data', 'testimonials.js');
const DROOG = process.argv.includes('--dry');

const DB = (() => {
  const toml = fs.readFileSync(path.join(ROOT, 'wrangler.toml'), 'utf8');
  const m = /database_name\s*=\s*"([^"]+)"/.exec(toml);
  if (!m) throw new Error('testimonials: geen database_name in wrangler.toml');
  return m[1];
})();

/* substr(updated_at, 1, 7) is 'YYYY-MM'. De MAAND en niet de dag: een citaat
   dateren op de dag suggereert een precisie die niemand nodig heeft, en het is
   ook een gegeven minder over een bestelling die te herleiden is. */
const SQL = `SELECT testimonial_text AS text,
                    COALESCE(NULLIF(TRIM(testimonial_name), ''), '') AS name,
                    substr(updated_at, 1, 7) AS month
               FROM order_feedback
              WHERE testimonial_approved = 1
                AND testimonial_consent = 1
                AND testimonial_text IS NOT NULL
                AND TRIM(testimonial_text) <> ''
              ORDER BY updated_at DESC`;

console.log(`Aanbevelingen ophalen uit ${DB} (remote)…`);
await warmLogin();

/* asCommandArg() geeft null zodra de regel te lang wordt of een dubbel
   aanhalingsteken bevat — dan is hij op Windows niet veilig door cmd.exe te
   krijgen. Deze query heeft geen van beide, maar dat controleren is goedkoper
   dan er `null` achter `--command` in laten belanden en een foutmelding krijgen
   die over iets anders gaat. */
const cmd = asCommandArg(SQL);
if (!cmd) {
  console.error('testimonials: de query is niet veilig als --command mee te geven.');
  console.error('Dat kan alleen als hij is aangepast — kijk daar eerst even naar.');
  process.exit(1);
}

const res = await volhard(() => wrangler(
  ['d1', 'execute', DB, '--remote', '--json', '--command', cmd],
));

if (!res.ok) {
  console.error('\nHet ophalen ging niet door:\n' + res.out.trim());
  console.error('\nEr is NIETS geschreven. src/data/testimonials.js staat er nog zoals hij stond.');
  process.exit(1);
}

/* Wrangler zet er soms regels vóór de JSON (een waarschuwing, een versienoot).
   Vanaf de eerste `[` of `{` lezen is stabieler dan hopen dat de uitvoer schoon
   is — en als er niets te vinden is, zeggen we dát in plaats van te struikelen
   over een JSON.parse die "Unexpected token" roept. */
const ruw = res.stdout || res.out;
const start = Math.min(...['[', '{'].map((c) => {
  const i = ruw.indexOf(c);
  return i === -1 ? Number.POSITIVE_INFINITY : i;
}));
if (!Number.isFinite(start)) {
  console.error('\nGeen JSON in het antwoord van wrangler:\n' + ruw.trim());
  process.exit(1);
}

let rijen;
try {
  const data = JSON.parse(ruw.slice(start));
  const eerste = Array.isArray(data) ? data[0] : data;
  rijen = eerste?.results || eerste?.result?.[0]?.results || [];
} catch (e) {
  console.error('\nHet antwoord was geen geldige JSON:', e?.message || e);
  process.exit(1);
}

/* De tekst schoonmaken op de manier waarop hij straks getoond wordt: geen
   regeleinden, geen dubbele spaties, en een harde grens. Een citaat van 900
   tekens is geen citaat maar een brief, en het breekt elke opmaak waar het in
   valt. Afkappen doen we NIET stilletjes — te lang wordt overgeslagen en
   gemeld, zodat jij hem inkort in plaats van dat de site hem half toont. */
const MAX = 320;
const teLang = [];
const schoon = rijen.map((r) => ({
  text: String(r.text || '').replace(/\s+/g, ' ').trim(),
  name: String(r.name || '').replace(/\s+/g, ' ').trim().slice(0, 60),
  month: /^\d{4}-\d{2}$/.test(String(r.month || '')) ? String(r.month) : '',
})).filter((r) => {
  if (!r.text) return false;
  if (r.text.length > MAX) { teLang.push(r); return false; }
  return true;
});

console.log(`\n${schoon.length} goedgekeurde aanbeveling${schoon.length === 1 ? '' : 'en'} gevonden.`);
for (const r of schoon) {
  console.log(`  · ${r.name || 'geen naam'} (${r.month || 'geen maand'}) — ${r.text.slice(0, 70)}${r.text.length > 70 ? '…' : ''}`);
}
if (teLang.length) {
  console.log(`\n${teLang.length} overgeslagen omdat ze langer zijn dan ${MAX} tekens:`);
  for (const r of teLang) console.log(`  · ${r.name || 'geen naam'} — ${r.text.length} tekens`);
  console.log('  Kort ze in op /admin/testimonials, of laat ze staan — ze komen dan niet op de site.');
}

if (DROOG) {
  console.log('\n--dry: er is niets geschreven.');
  process.exit(0);
}

/* De kop van het bestand blijft staan. Hij legt de keten uit en die verandert
   niet als de inhoud verandert; hem elke keer opnieuw genereren zou betekenen
   dat een verbetering aan die uitleg de volgende run verdwijnt. Alleen alles
   vanaf de eerste export wordt vervangen. */
const bestaand = fs.readFileSync(DOEL, 'utf8');
const knip = bestaand.indexOf('/** @type {');
if (knip === -1) {
  console.error('testimonials: de ankerregel `/** @type {` staat niet meer in src/data/testimonials.js.');
  console.error('Er is niets geschreven — kijk daar eerst even naar.');
  process.exit(1);
}

const lijst = schoon.length
  ? '[\n' + schoon.map((r) => `  ${JSON.stringify(r)},`).join('\n') + '\n]'
  : '[]';

const staart = `/** @type {{text: string, name: string, month: string}[]} */
export const TESTIMONIALS = ${lijst};

/** Wanneer dit bestand voor het laatst is bijgewerkt. Leeg = nog nooit gedraaid. */
export const TESTIMONIALS_UPDATED = '${new Date().toISOString().slice(0, 10)}';

/**
 * De aanbevelingen die op een pagina getoond mogen worden, hooguit \`max\`.
 *
 * Een functie en geen kale export, zodat er precies één plek is waar de grens en
 * de volgorde staan. De nieuwste eerst: een aanbeveling van vorige maand zegt
 * meer over hoe het nu gaat dan een van vorig jaar.
 */
export function testimonialsToShow(max = 3) {
  return TESTIMONIALS.slice(0, Math.max(0, max));
}
`;

fs.writeFileSync(DOEL, bestaand.slice(0, knip) + staart, 'utf8');
console.log(`\nGeschreven naar src/data/testimonials.js.`);
console.log('Commit het bestand en deploy — pas dan staan ze op de site.');
