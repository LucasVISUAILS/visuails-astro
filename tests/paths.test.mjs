/*
 * ═══════════════════════════════════════════════════════════════════════════════
 * EEN PAD MET EEN SPATIE — DE FOUT DIE TWEE KEER IS GEMAAKT
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Lucas' repo staat in `E:\Claude (VISUAILS)\visuails-astro`. Die map heeft een
 * spatie en twee haakjes in de naam. De mijne staat in `/home/claude/visuails-astro`
 * en heeft dat allebei niet.
 *
 * Dat verschil heeft nu twee keer een script gesloopt dat bij mij werkte:
 *
 *   10 aug · scripts/sitemap-and-404.mjs
 *            ENOENT: scandir 'E:\Claude%20(VISUAILS)\visuails-astro\dist\'
 *   19 aug · scripts/placeholders.mjs
 *            "dist/ ontbreekt — draai eerst `npx astro build`."
 *            direct na een build die 90 pagina's had weggeschreven.
 *
 * Allebei dezelfde oorzaak: `.pathname` op een file-URL. Dat is de PAD-component
 * van een URL, dus percent-gecodeerd — een spatie komt terug als `%20` — en op
 * Windows staat er ook nog een schuine streep vóór de schijfletter. `fileURLToPath()`
 * lost allebei op, per platform correct.
 *
 * ── WAAROM DIT EEN TEST IS EN GEEN NOTITIE ─────────────────────────────────
 *
 * Er stónd al een notitie. Ze staat sinds 10 augustus in sitemap-and-404.mjs en
 * legt precies dit uit. Negen dagen later maakte ik dezelfde fout in een nieuw
 * bestand, want een notitie in bestand A wordt niet gelezen als je bestand B
 * schrijft. Een test wordt bij elke `npm test` gelezen, ook door wie de notitie
 * nooit heeft gezien.
 *
 * De eerste helft is de gedragstest: het script draaien vanuit een map die wél
 * een spatie en haakjes in de naam heeft. Dat vangt de fout ongeacht hoe hij
 * geschreven is. De tweede helft is de bronwacht: geen `.pathname` op een
 * file-URL, nergens in scripts/ of tests/.
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

let pass = 0;
let fail = 0;
function ok(name, got, want = true, shown) {
  const good = got === want;
  if (good) pass++; else fail++;
  console.log(`${good ? ' ok  ' : ' FAIL'} ${name.padEnd(62)}${good ? '' : `verwacht ${JSON.stringify(want)} kreeg ${JSON.stringify(shown ?? got)}`}`);
}

/* ── 1 · HET GEDRAG ──────────────────────────────────────────────────────────
   Een wegwerpmap met precies de tekens uit Lucas' pad. Niet zijn map nabouwen om
   het mooi te maken: de spatie is de oorzaak en de haakjes zitten er in dezelfde
   naam, dus ze horen allebei in de test. */
console.log('\nplaceholders.mjs draait vanuit een map met een spatie in de naam');

const tijdelijk = fs.mkdtempSync(path.join(os.tmpdir(), 'visuails-pad-'));
const nep = path.join(tijdelijk, 'Claude (VISUAILS)', 'visuails-astro');
fs.mkdirSync(path.join(nep, 'scripts'), { recursive: true });
fs.mkdirSync(path.join(nep, 'dist', 'nl', 'test'), { recursive: true });
fs.copyFileSync(path.join(ROOT, 'scripts', 'placeholders.mjs'), path.join(nep, 'scripts', 'placeholders.mjs'));

/* Eén nagebouwde pagina met één placeholder erop, in dezelfde vorm als
   Placeholder.astro hem wegschrijft. Niet de echte dist/ kopiëren: die hoeft er
   voor deze test niet te zijn, en een test die een build nodig heeft is een test
   die soms overgeslagen wordt. */
fs.writeFileSync(path.join(nep, 'dist', 'nl', 'test', 'index.html'),
  '<figure class="ph" data-placeholder="photo" data-subject="een testonderwerp"'
  + ' data-message="wat het beeld moet overbrengen"></figure>');

let uit = '';
let viel = false;
try {
  uit = execFileSync(process.execPath, [path.join(nep, 'scripts', 'placeholders.mjs')], { encoding: 'utf8' });
} catch (e) {
  viel = true;
  uit = String(e.stdout || '') + String(e.stderr || '');
}

ok('het script eindigt zonder fout', viel, false, uit.trim().slice(0, 120));
ok('en zegt niet dat dist/ ontbreekt', /dist\/ ontbreekt/.test(uit), false);
ok('het vindt de placeholder die er staat', /een testonderwerp/.test(uit), true);
ok('met de opdracht erbij', /wat het beeld moet overbrengen/.test(uit), true);
/* De paginanaam moet met schuine strepen worden getoond en niet met de scheiding
   van het platform, anders leest dezelfde lijst op twee machines anders. */
ok('en de paginanaam met schuine strepen', /nl\/test\/index\.html/.test(uit), true);

fs.rmSync(tijdelijk, { recursive: true, force: true });

/* ── 2 · DE BRONWACHT ────────────────────────────────────────────────────────
   `.pathname` op een file-URL, in welke vorm dan ook. De uitzondering is een URL
   die uit een VERZOEK komt (`new URL(request.url).pathname`) — dat is een echte
   http-URL en daar is .pathname juist het goede antwoord. Die staan in
   functions/ en src/, niet hier. */
console.log('\ngeen file-URL wordt met .pathname naar een pad omgezet');

const verdacht = [];
const loop = (dir) => {
  for (const naam of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, naam.name);
    if (naam.isDirectory()) { loop(p); continue; }
    if (!naam.name.endsWith('.mjs') && !naam.name.endsWith('.js')) continue;
    const ruw = fs.readFileSync(p, 'utf8');
    /* HET COMMENTAAR ERUIT, EN WEL ECHT. De eerste versie hiervan sloeg alleen
       regels over die met `*` of `//` beginnen, en betrapte daardoor zijn eigen
       kop: de regel hierboven begint met `/*` en noemt allebei de woorden. Dat is
       voor de vijfde keer in deze repo dezelfde val — een controle die op zijn
       eigen toelichting matcht keurt niets goed en meldt alleen zichzelf.
       Blokcommentaar en regelcommentaar gaan er nu allebei uit vóór het zoeken,
       zodat alleen echte code wordt gewogen. De regelnummers verschuiven niet:
       het commentaar wordt vervangen door lege regels en niet weggeknipt. */
    const code = ruw
      .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
      .replace(/(^|[^:])\/\/[^\n]*/g, (m, p1) => p1 + ' '.repeat(m.length - p1.length));
    for (const regel of code.split('\n')) {
      if (/import\.meta\.url/.test(regel) && /\.pathname/.test(regel)) {
        verdacht.push(`${path.relative(ROOT, p)}: ${regel.trim().slice(0, 70)}`);
      }
    }
  }
};
for (const map of ['scripts', 'tests', 'cron']) {
  const d = path.join(ROOT, map);
  if (fs.existsSync(d)) loop(d);
}

ok('scripts/, tests/ en cron/ gebruiken fileURLToPath', verdacht.length, 0, verdacht.slice(0, 3));

/* En de twee bestanden die er ooit op omvielen, bij naam — zodat een herschrijving
   die de wacht hierboven omzeilt alsnog opvalt. */
const sitemap = fs.readFileSync(path.join(ROOT, 'scripts', 'sitemap-and-404.mjs'), 'utf8');
const ph = fs.readFileSync(path.join(ROOT, 'scripts', 'placeholders.mjs'), 'utf8');
ok('sitemap-and-404.mjs zet de map om met fileURLToPath', /fileURLToPath\(dir\)/.test(sitemap), true);
ok('placeholders.mjs ook', /fileURLToPath\(new URL\('\.\.\/dist\//.test(ph), true);
/* De sabotagecontrole: als de test zichzelf per ongeluk op zijn eigen commentaar
   zou matchen, is hij waardeloos. Dit bestand NOEMT `.pathname` in zijn kop, dus
   de wacht hierboven moet hem overslaan — en dat doet hij alleen als de
   commentaarregels eruit gefilterd worden. Hier staat dat die tekst er echt is. */
const zelf = fs.readFileSync(fileURLToPath(import.meta.url), 'utf8');
ok('dit bestand noemt .pathname zelf in het commentaar', /\.pathname/.test(zelf), true);
ok('en wordt daar niet door zichzelf op betrapt', verdacht.some((v) => v.startsWith('tests/paths')), false);
/* En de andere kant op: een wacht die alles overslaat meldt ook nooit iets. Deze
   regel voert de fout in zijn echte vorm op en kijkt of de filter hem vindt. Zonder
   deze controle zou een te ruime commentaarfilter er onopgemerkt doorheen komen. */
/* In stukken, en niet als één string: dit bestand wordt door de wacht hierboven
   zelf ook gelezen, en een volledig uitgeschreven fout is voor die wacht geen
   voorbeeld maar een vondst. De regel moet dus pas bestaan op het moment dat hij
   gedraaid wordt. */
const nepBestand = ['const D = new URL(\'../dist/\', import.meta', '.url)', '.pathname;'].join('');
const gefilterd = nepBestand
  .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
  .replace(/(^|[^:])\/\/[^\n]*/g, (m, p1) => p1 + ' '.repeat(m.length - p1.length));
ok('de wacht vindt de fout nog wél als hij er echt staat',
  /import\.meta\.url/.test(gefilterd) && /\.pathname/.test(gefilterd), true);

console.log(`\n${pass}/${pass + fail} geslaagd`);
if (fail) process.exit(1);
