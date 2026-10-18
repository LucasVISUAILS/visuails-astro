/*
 * ═══════════════════════════════════════════════════════════════════════════════
 * 4.07 · PHOTOSHOP LEEST DE WERKMAP — 8 oktober 2026
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * ExtendScript draait hier niet. Wat wel kan: de rekenregels van het script — de
 * INSTELLINGEN-regel lezen, de namen maken, wel of niet opschalen, lifestyle
 * overslaan — staan in tools/photoshop/01-catalog-afwerken.jsx tussen
 * "LOGICA BEGIN" en "LOGICA EINDE", in gewoon ES3. Deze toets knipt dat blok eruit,
 * draait het in een lege context en houdt het tegen wat de server schrijft
 * (scaffold.js) en terugleest (parseScaffoldPath, isRawPath, kenmerkenInPad).
 *
 * Zo kan de afspraak tussen de werkmap en het script niet stil uit elkaar lopen:
 * verandert de INSTELLINGEN-regel of een mapnaam aan één kant, dan valt dit om.
 */
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import {
  briefingText, instellingen, scaffoldFiles, parseScaffoldPath, isRawPath, kenmerkenInPad,
} from '../src/lib/scaffold.js';
import { leverVakken } from '../src/data/levervakken.js';

let pass = 0;
let fail = 0;
function ok(name, cond, extra = '') {
  if (cond) pass++; else fail++;
  console.log(`${cond ? ' ok  ' : ' FAIL'} ${name}${cond || !extra ? '' : ` — ${extra}`}`);
}

const JSX = readFileSync(new URL('../tools/photoshop/01-catalog-afwerken.jsx', import.meta.url), 'utf8');
const begin = JSX.indexOf('// ==== LOGICA BEGIN');
const einde = JSX.indexOf('// ==== LOGICA EINDE');
ok('het script heeft een logicablok', begin > 0 && einde > begin);
const LOGICA = JSX.slice(begin, einde);
const L = {};
vm.runInNewContext(`${LOGICA}
  uit.leesInstellingen = leesInstellingen; uit.verhoudingGetal = verhoudingGetal;
  uit.vakVolgnummer = vakVolgnummer; uit.vakWoord = vakWoord; uit.behandeling = behandeling;
  uit.verhoudingVoorVak = verhoudingVoorVak; uit.achtergrondVoorVak = achtergrondVoorVak; uit.eindNaam = eindNaam; uit.isBeeldNaam = isBeeldNaam;
  uit.isAlAf = isAlAf; uit.moetDoorPhotoshop = moetDoorPhotoshop; uit.maatBesluit = maatBesluit;
  uit.nieuweTellers = nieuweTellers; uit.slotmelding = slotmelding;`, { uit: L });

/* ── 0 · HET BLOK IS ECHT ES3 ──────────────────────────────────────────────── */
const code = LOGICA.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
for (const [naam, re] of [
  ['geen let/const', /\b(let|const)\s/], ['geen pijlfuncties', /=>/], ['geen template-strings', /`/],
  ['geen forEach/map/filter', /\.(forEach|map|filter|some|every|reduce)\(/], ['geen trim()', /\.trim\(/],
  ['geen JSON', /\bJSON\./], ['geen Object.keys/assign', /Object\.(keys|assign|entries)/],
]) ok(`logica: ${naam}`, !re.test(code));
let syntaxGoed = true;
try { new vm.Script(JSX.replace(/^#target .*$/m, '')); } catch { syntaxGoed = false; }
ok('het hele script is geldige syntaxis (zonder de #target-regel)', syntaxGoed);
ok('de rest van het script: geen hex-constante meer om te typen', !/backgroundHex/.test(JSX));
ok('het script draagt een menunaam voor de sneltoets', /<name>VISUAILS werkmap afwerken<\/name>/.test(JSX));
ok('tekst in de code alleen als \\u-escape (Photoshop leest geen UTF-8 zonder BOM)',
  !/[^\x00-\x7f]/.test(JSX.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:\\])\/\/.*$/gm, '$1')));
ok('er is een LEESMIJ over de sneltoets', /Functietoets: F9/.test(readFileSync(new URL('../tools/photoshop/LEESMIJ.txt', import.meta.url), 'utf8')));

/* ── 1 · DE INSTELLINGEN-REGEL: WAT DE SERVER SCHRIJFT, LEEST HET SCRIPT ──── */
const ORDER = { ref: 'VIS-TEST-0407', service: 'catalog', kanaal: 'webshop,amazon' };
const PRODUCT = { index: 3, name: 'Overhemd · "linnen"', garment: 'top', colour: '#E8E1D5', background: '#f5f5f5', ratio: '4:5', imageRatios: ['', '1:1'], hoogRes: true, extras: [] };
const brief = briefingText({ order: ORDER, product: PRODUCT });
const gelezen = L.leesInstellingen(brief);
const verwacht = Object.fromEntries(instellingen(ORDER, PRODUCT));
ok('elke sleutel=waarde komt ongeschonden terug', JSON.stringify(gelezen) === JSON.stringify(verwacht), `${JSON.stringify(gelezen)} vs ${JSON.stringify(verwacht)}`);
ok('achtergrond in hoofdletters met hekje', gelezen.achtergrond === '#F5F5F5');
ok('lange_zijde 4096 bij 4K', gelezen.lange_zijde === '4096');
/* Kladblok of ExtendScript zonder UTF-8: het middenpunt wordt "Â·". */
const verkeerd = brief.replace(/·/g, 'Â·');
ok('ook als het middenpunt verkeerd gelezen wordt', JSON.stringify(L.leesInstellingen(verkeerd)) === JSON.stringify(verwacht));
ok('zonder INSTELLINGEN-regel: null (oude werkmap)', L.leesInstellingen('p1 - x\r\nBestelling  VIS-1\r\n') === null);

/* ── 2 · NAMEN EN VAKKEN, TEGEN DE MAPPEN DIE DE WERKMAP UITDEELT ──────────── */
const DET = { extra_slots: 'extra1:driekwart' };
for (const [dienst, det] of [['catalog', DET], ['lifestyle', {}]]) {
  const vakken = leverVakken(dienst, det);
  const files = scaffoldFiles({ ref: 'VIS-TEST-0407', brand: 'Voorbeeldmerk', service: dienst }, [{ index: 1, name: 'Hoodie' }], { vakken });
  const vakMappen = files.filter((f) => f.dir && /\/p1 - Hoodie\/[^_][^/]*\/$/.test(f.name)).map((f) => f.name.split('/').slice(-2, -1)[0]);
  ok(`${dienst}: het script kent elke vakmap`, vakMappen.length === vakken.length, vakMappen.join(' | '));
  vakMappen.forEach((map, i) => {
    const v = vakken[i];
    ok(`${dienst}: "${map}" → woord "${v.woord.nl}" (gelijk aan de server)`, L.vakWoord(map) === v.woord.nl, L.vakWoord(map));
    /* De eindnaam van het script, in de map waar hij hoort, leest de server terug
       op hetzelfde product en vak, met het eigen kenmerk en zonder "_ruw". */
    const pad = `VIS-TEST-0407 - Voorbeeldmerk/p1 - Hoodie/${map}/${L.eindNaam('VIS-TEST-0407', 'p1', map)}`;
    const terug = parseScaffoldPath(pad);
    ok(`${dienst}: ${L.eindNaam('VIS-TEST-0407', 'p1', map)} landt in p1/${v.id}`, terug.product === 'p1' && terug.shot === v.id && kenmerkenInPad(pad).join() === 'VIS-TEST-0407', JSON.stringify(terug));
  });
}
ok('eindnaam: VIS-…-p1-voorkant.jpg', L.eindNaam('VIS-2608-4471', 'p1', '1 voorkant') === 'VIS-2608-4471-p1-voorkant.jpg');
ok('het ruwe beeld in _ruw/ komt nooit als levering terug', isRawPath(`VIS-TEST-0407 - M/p1 - Hoodie/1 voorkant/_ruw/${'gen_0042.png'}`));
ok('vak 2 met een eigen verhouding: verhouding_2 wint', L.verhoudingVoorVak(gelezen, '2 achterkant') === '1:1' && L.verhoudingVoorVak(gelezen, '1 voorkant') === '4:5');
/* Werklijst 27 (15 oktober 2026): een andere achtergrond per beeld. Wat de
   server schrijft (instellingen() met beeldAchtergronden), leest het script. */
{
  const regel = `INSTELLINGEN ${instellingen({ ref: 'VIS-TEST-0407', service: 'catalog', kanaal: 'own' }, { index: 1, background: '#F5F5F5', ratio: '4:5', beeldAchtergronden: [{ nr: 4, hex: '#EDE4D8', nl: 'Op een model', naam: { nl: 'Beige' } }] }).map(([k, v]) => `${k}=${v}`).join(' · ')}`;
  const inst = L.leesInstellingen(regel);
  ok('per beeld: de server schrijft achtergrond_4', /achtergrond_4=#EDE4D8/.test(regel), regel);
  ok('per beeld: het script vult vak 4 met die kleur, de rest met de achtergrond', L.achtergrondVoorVak(inst, '4 op-model') === '#EDE4D8' && L.achtergrondVoorVak(inst, '1 voorkant') === '#F5F5F5', JSON.stringify(inst));
  ok('per beeld: het script gebruikt achtergrondVoorVak bij het afwerken', /processDocument\(doc, route, achtergrondVoorVak\(inst, vnaam\), besluit\)/.test(JSX));
}
ok('behandeling: detail', L.behandeling('3 detail', 'catalog') === 'detail');
ok('behandeling: op-model is Select Subject', L.behandeling('4 op-model', 'catalog') === 'model');
ok('behandeling: voorkant en extra hoek zijn product', L.behandeling('1 voorkant', 'catalog') === 'product' && L.behandeling('5 driekwart [extra1]', 'catalog') === 'product');
ok('behandeling: lifestyle is alleen bijsnijden (scene)', L.behandeling('1 beeld-1', 'lifestyle') === 'scene');
ok('al afgewerkt herkend aan het kenmerk', L.isAlAf('VIS-2608-4471-p1-voorkant.jpg', 'VIS-2608-4471') && !L.isAlAf('magnific_0042.png', 'VIS-2608-4471'));
ok('beelden: jpg/png/tif/psd/webp, geen verborgen bestand', L.isBeeldNaam('a.PNG') && L.isBeeldNaam('b.tif') && !L.isBeeldNaam('._a.jpg') && !L.isBeeldNaam('_briefing.txt'));

/* ── 3 · NOOIT OPSCHALEN ───────────────────────────────────────────────────── */
{
  const b = L.maatBesluit(3000, 3000, '4:5', 2048, 'uitbreiden');
  ok('uitbreiden: 3000×3000 naar 4:5 wordt 3000×3750', b.ok && b.canvasB === 3000 && b.canvasH === 3750);
  ok('en verkleind tot de lange zijde 2048', b.eindH === 2048 && b.eindB === 1638 && b.schaal < 1);
  const k = L.maatBesluit(1500, 1800, '4:5', 2048, 'uitbreiden');
  ok('te klein: geen schaal, wel de melding', !k.ok && k.melding === '1875 px, besteld 2048 — eerst opschalen', k.melding);
  const v = L.maatBesluit(2048, 2560, '4:5', 2048, 'uitbreiden');
  ok('net groot genoeg: geen herschaling nodig maar toegestaan', v.ok && v.eindH === 2048 && v.eindB === 1638);
  const d = L.maatBesluit(4000, 3000, '1:1', 2048, 'bijsnijden');
  ok('bijsnijden: 4000×3000 naar 1:1 is 3000×3000', d.ok && d.canvasB === 3000 && d.canvasH === 3000 && d.eindB === 2048);
  const k4 = L.maatBesluit(3000, 3000, '1:1', 4096, 'bijsnijden');
  ok('4K besteld, 3000 aangeleverd: melding, niet opschalen', !k4.ok && /besteld 4096/.test(k4.melding));
  let nooit = true;
  for (const [w, h] of [[800, 600], [2048, 2048], [5000, 2000], [1000, 4000]]) {
    for (const r of ['1:1', '4:5', '3:4', '16:9', '9:16', '']) {
      for (const wijze of ['uitbreiden', 'bijsnijden']) {
        const x = L.maatBesluit(w, h, r, 2048, wijze);
        if (x.ok && x.schaal > 1) nooit = false;
      }
    }
  }
  ok('over een raster van maten: de schaal is nooit groter dan 1', nooit);
}

/* ── 4 · LIFESTYLE STANDAARD OVERSLAAN (V35 = b) ──────────────────────────── */
ok('catalog: door Photoshop', L.moetDoorPhotoshop(L.leesInstellingen(briefingText({ order: { ref: 'VIS-A-B', service: 'catalog' }, product: { index: 1 } }))));
ok('lifestyle: overslaan', !L.moetDoorPhotoshop(L.leesInstellingen(briefingText({ order: { ref: 'VIS-A-B', service: 'lifestyle' }, product: { index: 1 } }))));
ok('lifestyle met photoshop=ja (eigen look): wel', L.moetDoorPhotoshop(L.leesInstellingen(briefingText({ order: { ref: 'VIS-A-B', service: 'lifestyle', photoshop: true }, product: { index: 1 } }))));
ok('zonder regel: niets doen', !L.moetDoorPhotoshop(null));

/* ── 5 · DE SLOTMELDING ────────────────────────────────────────────────────── */
{
  const t = L.nieuweTellers();
  t.afgewerkt = 24;
  t.overgeslagen.push('p4 detail (geen beeld)');
  ok('de slotmelding zoals voorgesteld', L.slotmelding(t) === '24 beelden afgewerkt · 1 overgeslagen: p4 detail (geen beeld)', L.slotmelding(t));
  t.teKlein.push('p2 achterkant: 1800 px, besteld 2048 — eerst opschalen');
  t.lifestyle.push('p5');
  ok('met te klein en lifestyle erbij', /Te klein, niet afgewerkt \(1\):\n  p2 achterkant/.test(L.slotmelding(t)) && /Niet door Photoshop \(photoshop=nee, lifestyle\): p5/.test(L.slotmelding(t)));
  const een = L.nieuweTellers(); een.afgewerkt = 1;
  ok('enkelvoud: 1 beeld afgewerkt', L.slotmelding(een) === '1 beeld afgewerkt');
}

console.log(`\n${pass}/${pass + fail} geslaagd`);
if (fail) process.exit(1);
