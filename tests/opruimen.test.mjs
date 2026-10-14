/**
 * OPRUIMEN.bat → scripts/opruimen.mjs (8 oktober 2026, Lucas' notitie bij 9.02).
 * Verplaatst wat in _opruimen/LIJST.txt staat naar _opruimen/<datum>/, verwijdert
 * niets, raakt nooit .git of node_modules, en haalt wat klaar is van de lijst.
 *
 * Sinds dezelfde dag ook _opruimen/VERPLAATS.txt ("oud -> nieuw"): sorteren binnen
 * de projectmap, met dezelfde regels, en nooit iets overschrijven. En de groepen
 * met "moet" in de kop, die UITROLLEN.bat laat wachten.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { opruimen, leesLijst, veiligPad, leesVerplaatsLijst, verplaatsen, openVoorUitrol, allesOpruimen, verslag } from '../scripts/opruimen.mjs';

let goed = 0, totaal = 0;
function ok(naam, kreeg, wil = true) {
  totaal++;
  const g = JSON.stringify(kreeg) === JSON.stringify(wil);
  if (g) goed++;
  console.log(`${g ? ' ok  ' : ' FAIL'} ${naam}${g ? '' : `  verwacht ${JSON.stringify(wil)} kreeg ${JSON.stringify(kreeg)}`}`);
}

const w = fs.mkdtempSync(path.join(os.tmpdir(), 'opruim-'));
const zet = (p, t = 'x') => { fs.mkdirSync(path.dirname(path.join(w, p)), { recursive: true }); fs.writeFileSync(path.join(w, p), t); };
zet('astro.config.mjs');
zet('src/pages/portal.astro', 'oud');
zet('src/pages/nl/portal.astro', 'oud nl');
zet('Oud bestand (kopie).md', 'kopie');
zet('.git/config', 'geheim');
zet('_opruimen/LIJST.txt', [
  '# kop',
  'src/pages/portal.astro # vervangen door /studio',
  'src\\pages\\nl\\portal.astro',
  'Oud bestand (kopie).md # een kopie',
  'bestaat-niet.txt # al weg',
  '.git/config # mag nooit',
  '../buiten.txt # mag nooit',
  '',
].join('\r\n'));

ok('de lijst leest pad en reden', leesLijst('a/b.js # waarom\n# niet\n\nc d.md').map((i) => [i.pad, i.reden]), [['a/b.js', 'waarom'], ['c d.md', '']]);
ok('.git en buiten de map zijn verboden', [veiligPad(w, '.git/config'), veiligPad(w, '../x')], [null, null]);

const r = opruimen(w, new Date('2026-10-08T09:00:00Z'));
ok('drie bestanden verplaatst', r.verplaatst.map((v) => v.pad), ['src/pages/portal.astro', 'src/pages/nl/portal.astro', 'Oud bestand (kopie).md']);
ok('naar _opruimen/<datum>/ met dezelfde mappen', fs.readFileSync(path.join(w, '_opruimen/2026-10-08/src/pages/nl/portal.astro'), 'utf8'), 'oud nl');
ok('het origineel is weg', fs.existsSync(path.join(w, 'src/pages/portal.astro')), false);
ok('er is niets verwijderd: de inhoud is er nog', fs.readFileSync(path.join(w, '_opruimen/2026-10-08/Oud bestand (kopie).md'), 'utf8'), 'kopie');
ok('.git is niet aangeraakt', fs.readFileSync(path.join(w, '.git/config'), 'utf8'), 'geheim');
ok('geweigerd: .git en ../', r.geweigerd.map((g) => g.pad), ['.git/config', '../buiten.txt']);
ok('wat er al niet stond, telt als klaar', r.weg.map((g) => g.pad), ['bestaat-niet.txt']);
const log = fs.readFileSync(path.join(w, '_opruimen/2026-10-08/VERPLAATST.txt'), 'utf8');
ok('VERPLAATST.txt noemt de reden', log.includes('src/pages/portal.astro  —  vervangen door /studio'), true);
const rest = fs.readFileSync(path.join(w, '_opruimen/LIJST.txt'), 'utf8');
ok('de lijst houdt alleen wat niet mocht', leesLijst(rest).map((i) => i.pad), ['.git/config', '../buiten.txt']);
ok('de kop blijft staan', rest.startsWith('# kop'), true);

const r2 = opruimen(w, new Date('2026-10-08T10:00:00Z'));
ok('nog een keer: niets meer te verplaatsen', r2.verplaatst.length, 0);


/* ── VERPLAATS.txt: sorteren binnen de projectmap ─────────────────────────── */
const v = fs.mkdtempSync(path.join(os.tmpdir(), 'verplaats-'));
const zetV = (p, t = 'x') => { fs.mkdirSync(path.dirname(path.join(v, p)), { recursive: true }); fs.writeFileSync(path.join(v, p), t); };
zetV('astro.config.mjs');
zetV('DESIGN.md', 'ontwerp');
zetV('naden.mjs', "const D = new URL('./dist/', import.meta.url);");
zetV('ARCHITECTURE.md', 'oud');
zetV('docs/ARCHITECTURE.md', 'nieuw');           // Claude schreef de nieuwe versie al
zetV('MOLLIE.md', 'gelijk');
zetV('docs/MOLLIE.md', 'gelijk');
zetV('kladblok/proef/a.png', 'png');
zetV('_opruimen/VERPLAATS.txt', [
  '# kop',
  '# ── 8 oktober 2026 · moet verplaatst: de naslag ──',
  'DESIGN.md -> docs/ # de test leest hem daar',
  'ARCHITECTURE.md -> docs/ARCHITECTURE.md',
  'MOLLIE.md -> docs/',
  '# ── 8 oktober 2026 · mag verplaatst: meten ──',
  'naden.mjs -> scripts\\meten\\ # met backslashes',
  'kladblok/proef -> kladblok/proef/binnen # een map in zichzelf',
  'weg.md -> docs/ # bestaat nergens',
  '.git/config -> docs/ # mag nooit',
  'docs/x.md -> ../buiten.md # mag nooit',
  'geen pijl hier',
  '',
].join('\r\n'));

const vl = leesVerplaatsLijst(fs.readFileSync(path.join(v, '_opruimen/VERPLAATS.txt'), 'utf8'));
ok('VERPLAATS: "doel/" houdt de naam, backslashes worden /', vl.filter((i) => !i.fout).slice(0, 4).map((i) => [i.bron, i.doel]),
  [['DESIGN.md', 'docs/DESIGN.md'], ['ARCHITECTURE.md', 'docs/ARCHITECTURE.md'], ['MOLLIE.md', 'docs/MOLLIE.md'], ['naden.mjs', 'scripts/meten/naden.mjs']]);
ok('VERPLAATS: "moet" en "mag" uit de kop', vl.filter((i) => !i.fout).slice(0, 4).map((i) => i.moet), [true, true, true, false]);
ok('VERPLAATS: een regel zonder -> is een fout', vl.filter((i) => i.fout).map((i) => i.regel), ['geen pijl hier']);
const open1 = openVoorUitrol(v);
ok('vóór de uitrol: de drie "moet"-regels staan nog open', open1.verplaats.map((i) => i.bron), ['DESIGN.md', 'ARCHITECTURE.md', 'MOLLIE.md']);

const vr = verplaatsen(v, new Date('2026-10-08T09:00:00Z'));
ok('verplaatst: DESIGN.md en naden.mjs', vr.verplaatst.map((i) => i.bron), ['DESIGN.md', 'naden.mjs']);
ok('… en ze staan echt op de nieuwe plek', [fs.readFileSync(path.join(v, 'docs/DESIGN.md'), 'utf8'), fs.existsSync(path.join(v, 'scripts/meten/naden.mjs'))], ['ontwerp', true]);
ok('nooit overschrijven: docs/ARCHITECTURE.md is nog de nieuwe', fs.readFileSync(path.join(v, 'docs/ARCHITECTURE.md'), 'utf8'), 'nieuw');
ok('… de oude kopie staat in _opruimen/<datum>/', fs.readFileSync(path.join(v, '_opruimen/2026-10-08/ARCHITECTURE.md'), 'utf8'), 'oud');
ok('… met "verschilt" als hij anders was, zonder als hij gelijk was', vr.dubbel.map((d) => [d.bron, d.zelfde]), [['ARCHITECTURE.md', false], ['MOLLIE.md', true]]);
ok('… en VERPLAATST.txt zegt waarom', fs.readFileSync(path.join(v, '_opruimen/2026-10-08/VERPLAATST.txt'), 'utf8').includes('ARCHITECTURE.md  —  op docs/ARCHITECTURE.md staat al een nieuwere versie'), true);
ok('geweigerd: map in zichzelf, .git, buiten de map, tikfout', vr.geweigerd.map((g) => g.regel.split(' ')[0]), ['kladblok/proef', '.git/config', 'docs/x.md', 'geen']);
ok('wat nergens staat, gaat van de lijst', vr.weg.map((i) => i.bron), ['weg.md']);
ok('een verhuisd script dat vanaf zijn eigen plek zoekt, wordt gemeld', vr.letop.map((i) => i.doel), ['scripts/meten/naden.mjs']);
const vrest = fs.readFileSync(path.join(v, '_opruimen/VERPLAATS.txt'), 'utf8');
ok('de lijst houdt alleen wat niet mocht, plus de koppen', leesVerplaatsLijst(vrest).map((i) => i.bron || i.regel), ['kladblok/proef', '.git/config', 'docs/x.md', 'geen pijl hier']);
ok('de koppen blijven staan', vrest.split(/\r?\n/).filter((r) => r.startsWith('#')).length, 3);
const vlog = fs.readFileSync(path.join(v, '_opruimen/VERPLAATS-LOG.txt'), 'utf8');
ok('elke verplaatsing een regel in VERPLAATS-LOG.txt', ['DESIGN.md -> docs/DESIGN.md', 'naden.mjs -> scripts/meten/naden.mjs'].every((x) => vlog.includes(x)), true);
ok('na het verplaatsen staat er niets meer open voor de uitrol', openVoorUitrol(v).aantal, 0);
ok('nog een keer: niets meer te doen', verplaatsen(v).verplaatst.length, 0);

/* OPRUIMEN.bat doet beide in één keer. */
zetV('oud.txt', 'weg');
zetV('nog.md', 'naar docs');
zetV('_opruimen/LIJST.txt', '# ── 8 oktober 2026 · moet weg ──\r\noud.txt # weg ermee\r\n');
fs.appendFileSync(path.join(v, '_opruimen/VERPLAATS.txt'), '\r\nnog.md -> docs/\r\n');
ok('"moet weg" telt ook mee voor de uitrol', openVoorUitrol(v).lijst.map((i) => i.pad), ['oud.txt']);
const beide = allesOpruimen(v, new Date('2026-10-09T09:00:00Z'));
ok('allesOpruimen: eerst sorteren, dan weggooien', [beide.sorteren.verplaatst.map((i) => i.bron), beide.weg.verplaatst.map((i) => i.pad)], [['nog.md'], ['oud.txt']]);
ok('het verslag zegt het in gewone woorden', verslag(beide).split('\n')[0], '1 bestand(en) op een nieuwe plek gezet:');
fs.rmSync(v, { recursive: true, force: true });

/* De echte lijst in de projectmap: elke regel is een geldig pad binnen de map. */
const echt = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const lijst = leesLijst(fs.readFileSync(path.join(echt, '_opruimen/LIJST.txt'), 'utf8'));
ok('de echte lijst heeft geen verboden paden', lijst.filter((i) => !veiligPad(echt, i.pad)).map((i) => i.pad), []);
ok('OPRUIMEN.bat roept het script aan', /node scripts\\opruimen\.mjs/.test(fs.readFileSync(path.join(echt, 'OPRUIMEN.bat'), 'utf8')), true);
ok('_opruimen/<datum>/ staat in .gitignore', /^_opruimen\/\*\/$/m.test(fs.readFileSync(path.join(echt, '.gitignore'), 'utf8')), true);

/* De echte VERPLAATS.txt: geldig, en in deze map al uitgevoerd voor alles wat hier staat. */
const echtV = leesVerplaatsLijst(fs.readFileSync(path.join(echt, '_opruimen/VERPLAATS.txt'), 'utf8'));
ok('de echte VERPLAATS.txt heeft geen fouten of verboden paden', echtV.filter((i) => i.fout || !veiligPad(echt, i.bron) || !veiligPad(echt, i.doel)).map((i) => i.regel), []);
ok('wat in deze map al op de nieuwe plek staat, staat niet ook nog op de oude',
  echtV.filter((i) => fs.existsSync(path.join(echt, i.doel)) && fs.existsSync(path.join(echt, i.bron))).map((i) => i.bron), []);
ok('niets staat op beide lijsten', echtV.filter((i) => lijst.some((l) => l.pad === i.bron)).map((i) => i.bron), []);
/* Na OPRUIMEN.bat staan ze niet meer op de lijst, maar ook niet meer in de map: dat telt ook. */
ok('de oude knoppen staan op de opruimlijst (of zijn al opgeruimd)', ['push-to-github.bat', 'fix-secret-and-push.bat', 'cleanup-stale-files.bat', 'opruimen-concepten.bat'].every((b) => lijst.some((l) => l.pad === b && l.reden) || !fs.existsSync(path.join(echt, b))), true);
ok('wat die oude knoppen opruimden, is al weg', ['src/pages/de', 'src/components/ThreeWay.astro', 'src/pages/order-catalog.astro', 'src/pages/order', 'src/pages/concept', 'src/layouts/ConceptLayout.astro', 'src/data/conceptInhoud.js']
  .filter((p) => fs.existsSync(path.join(echt, p))), []);

/* Elk npm-script dat een bestand start, vindt dat bestand: hier, of op de plek waar OPRUIMEN het zet. */
const doelen = new Set(echtV.map((i) => i.doel));
const pkg = JSON.parse(fs.readFileSync(path.join(echt, 'package.json'), 'utf8'));
const kwijt = [];
for (const [naam, cmd] of Object.entries(pkg.scripts)) {
  for (const m of cmd.matchAll(/\bnode\s+([\w./-]+\.m?js)\b/g)) {
    const f = m[1];
    if (fs.existsSync(path.join(echt, f)) || doelen.has(f) || f.startsWith('kladblok/')) continue;
    kwijt.push(`${naam}: ${f}`);
  }
}
ok('elk "node …" in package.json wijst naar een bestand dat er is (of komt)', kwijt, []);
ok('de tests lezen de naslag in docs/', ['tests/ontwerpdoc.test.mjs', 'tests/register.test.mjs', 'tests/bewaartermijn.test.mjs', 'tests/promises.test.mjs']
  .every((t) => /docs\/(DESIGN|AVG-)/.test(fs.readFileSync(path.join(echt, t), 'utf8'))), true);

fs.rmSync(w, { recursive: true, force: true });
console.log(`\n${goed}/${totaal} geslaagd`);
if (goed !== totaal) process.exit(1);
