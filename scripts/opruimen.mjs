/**
 * VISUAILS — oude bestanden naar één map verplaatsen, zodat Lucas kan kijken
 * en zelf beslist wat weg mag. En sinds 8 oktober ook: bestanden binnen de
 * projectmap op een nieuwe plek zetten.
 *
 * ── WAAROM DIT BESTAND ER IS — 8 oktober 2026 ────────────────────────────────
 *
 * Lucas (afvinklijst, 9.02): "Los van dit zou ik ook een map willen waar Claude
 * bestanden in zet die verwijderd moeten/mogen worden zodat ik deze niet telkens
 * handmatig hoef op te zoeken en gewoon in de map kan kijken en kan beslissen
 * wat ik wil verwijderen uit de map."
 *
 * Claude kan op Lucas' computer wel bestanden schrijven, maar niets verplaatsen
 * of verwijderen. Daarom deze tweedeling:
 *   · Claude zet in `_opruimen/LIJST.txt` welke bestanden weg mogen, met de
 *     reden erachter;
 *   · Lucas dubbelklikt OPRUIMEN.bat. Dit script verplaatst dan elk bestand op
 *     de lijst naar `_opruimen/<datum>/`, met dezelfde mappen eronder, en
 *     schrijft daar VERPLAATST.txt met wat er waarom staat.
 *
 * Er wordt niets verwijderd. Lucas kijkt in de map en gooit zelf weg wat weg
 * mag. Terugzetten = het bestand terugslepen. Git ziet een verplaatst bestand
 * als verwijderd; dat gaat bij de volgende commit mee, en `_opruimen/<datum>/`
 * zelf staat in .gitignore, dus de kopieën gaan niet naar GitHub.
 *
 * LIJST.txt: één pad per regel, vanaf de projectmap, met / of \. Achter een #
 * mag de reden. Lege regels en regels die met # beginnen tellen niet. Wat
 * verplaatst is, haalt het script van de lijst; wat er al niet meer stond ook.
 *
 * ── DE TWEEDE LIJST: VERPLAATS.txt — 8 oktober 2026 ─────────────────────────
 *
 * Lucas' notitie ging verder: "misschien ook nog even alle bestanden in die map
 * goed sorteren zodat ik wat meer overzicht heb". Sorteren is verplaatsen
 * BINNEN de projectmap (naslag naar docs/, meetscripts naar scripts/meten/),
 * en dat kan Claude net zo min als weggooien. Dus een tweede lijst, met
 * dezelfde regels:
 *
 *   ARCHITECTURE.md -> docs/ARCHITECTURE.md   # waarom
 *   naden.mjs -> scripts/meten/                # eindigt op / = zelfde naam, in die map
 *
 * Veilig op dezelfde manier: nooit in of uit .git, node_modules, _opruimen,
 * .wrangler of .astro; nooit buiten de projectmap; NOOIT iets overschrijven.
 * Staat er op de nieuwe plek al een bestand (omdat Claude de nieuwe versie daar
 * al schreef), dan gaat de oude kopie naar `_opruimen/<datum>/` met een regel
 * waarom — weg is dan nog steeds niets. Wat klaar is gaat van de lijst, en elke
 * verplaatsing krijgt een regel in `_opruimen/VERPLAATS-LOG.txt`.
 *
 * ── "MOET" EN "MAG" — voor UITROLLEN.bat ────────────────────────────────────
 *
 * Een kopregel met "──" erin begint een groep. Staat er "moet" in die kop
 * ("moet weg voor de volgende build", "moet verplaatst: de tests lezen de nieuwe
 * plek"), dan laat UITROLLEN.bat niets live gaan zolang er uit die groep nog iets
 * op de oude plek staat (zie openVoorUitrol). Een groep met "mag" is gewoon
 * opruimwerk: dat wacht tot het Lucas uitkomt.
 *
 * Gebruik:  node scripts/opruimen.mjs            (de projectmap van dit script)
 *           node scripts/opruimen.mjs <map>      (alleen voor tests)
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const VERBODEN = new Set(['.git', 'node_modules', '_opruimen', '.wrangler', '.astro']);

/** Is deze commentaarregel de kop van een groep, en zo ja: moet die groep vóór een uitrol klaar zijn? */
function kopVan(kaal) {
  if (!kaal.startsWith('#') || !kaal.includes('──')) return null;
  return { kop: kaal.replace(/^#\s*/, ''), moet: /\bmoet\b/i.test(kaal) };
}

/** Pad zoals het in een lijst staat → met /, zonder ./ ervoor. */
function netPad(p) {
  return p.trim().replace(/\\/g, '/').replace(/^\.\//, '');
}

/** Leest LIJST.txt: [{ pad, reden, regel, moet }] plus de regels die geen pad zijn. */
export function leesLijst(tekst) {
  const items = [];
  let groep = { kop: '', moet: false };
  for (const regel of String(tekst).split(/\r?\n/)) {
    const kaal = regel.trim();
    const kop = kopVan(kaal);
    if (kop) { groep = kop; continue; }
    if (!kaal || kaal.startsWith('#')) continue;
    const hekje = kaal.indexOf(' #');
    const pad = netPad(hekje === -1 ? kaal : kaal.slice(0, hekje));
    const reden = hekje === -1 ? '' : kaal.slice(hekje + 2).trim();
    if (pad) items.push({ pad, reden, regel: kaal, moet: groep.moet, groep: groep.kop });
  }
  return items;
}

/**
 * Leest VERPLAATS.txt: [{ bron, doel, reden, regel, moet }].
 * Een regel zonder "->" is een tikfout en komt terug als { fout }.
 */
export function leesVerplaatsLijst(tekst) {
  const items = [];
  let groep = { kop: '', moet: false };
  for (const regel of String(tekst).split(/\r?\n/)) {
    const kaal = regel.trim();
    const kop = kopVan(kaal);
    if (kop) { groep = kop; continue; }
    if (!kaal || kaal.startsWith('#')) continue;
    const hekje = kaal.indexOf(' #');
    const kern = hekje === -1 ? kaal : kaal.slice(0, hekje);
    const reden = hekje === -1 ? '' : kaal.slice(hekje + 2).trim();
    const pijl = kern.indexOf('->');
    if (pijl === -1) { items.push({ fout: 'geen -> in de regel', regel: kaal, moet: groep.moet }); continue; }
    const bron = netPad(kern.slice(0, pijl));
    let doel = netPad(kern.slice(pijl + 2));
    if (!bron || !doel) { items.push({ fout: 'bron of doel ontbreekt', regel: kaal, moet: groep.moet }); continue; }
    if (doel.endsWith('/')) doel += bron.split('/').pop();
    items.push({ bron, doel, reden, regel: kaal, moet: groep.moet, groep: groep.kop });
  }
  return items;
}

/** Mag dit pad verplaatst worden? Alleen binnen de projectmap, nooit .git e.d. */
export function veiligPad(wortel, pad) {
  const vol = path.resolve(wortel, pad);
  const rel = path.relative(wortel, vol);
  if (!rel || rel.startsWith('..') || path.isAbsolute(rel)) return null;
  const eerste = rel.split(path.sep)[0];
  if (VERBODEN.has(eerste)) return null;
  return { vol, rel };
}

/** Een vrije plek: "x.md" of anders "x (2).md", "x (3).md", … */
function vrijePlek(naar) {
  if (!fs.existsSync(naar)) return naar;
  const ext = path.extname(naar);
  const stam = naar.slice(0, naar.length - ext.length);
  let n = 2;
  while (fs.existsSync(`${stam} (${n})${ext}`)) n++;
  return `${stam} (${n})${ext}`;
}

/** Naar _opruimen/<datum>/<rel>, zonder iets te overschrijven. Geeft het nieuwe pad terug. */
function naarOpruimmap(wortel, datum, vol, rel) {
  const naar = vrijePlek(path.join(wortel, '_opruimen', datum, rel));
  fs.mkdirSync(path.dirname(naar), { recursive: true });
  fs.renameSync(vol, naar);
  return naar;
}

function schrijfLogInDatummap(wortel, datum, regels) {
  if (!regels.length) return;
  const log = path.join(wortel, '_opruimen', datum, 'VERPLAATST.txt');
  fs.mkdirSync(path.dirname(log), { recursive: true });
  const oud = fs.existsSync(log) ? fs.readFileSync(log, 'utf8') : '';
  const kop = oud ? '' : `Verplaatst op ${datum} door OPRUIMEN.bat. Kijk, en gooi weg wat weg mag.\r\nTerugzetten: sleep het bestand terug naar dezelfde plek in de projectmap.\r\n\r\n`;
  fs.writeFileSync(log, `${oud}${kop}${regels.join('\r\n')}\r\n`);
}

/** Haal de regels die klaar zijn van een lijst; de kop en de rest blijven staan. */
function haalVanLijst(lijstPad, tekst, klaar) {
  if (!klaar.size) return;
  const rest = tekst.split(/\r?\n/).filter((r) => !klaar.has(r.trim()));
  fs.writeFileSync(lijstPad, rest.join('\r\n'));
}

export function opruimen(wortel, nu = new Date()) {
  const map = path.join(wortel, '_opruimen');
  const lijstPad = path.join(map, 'LIJST.txt');
  if (!fs.existsSync(lijstPad)) return { verplaatst: [], weg: [], geweigerd: [], doel: null };

  const tekst = fs.readFileSync(lijstPad, 'utf8');
  const items = leesLijst(tekst);
  const datum = nu.toISOString().slice(0, 10);
  const verplaatst = [], weg = [], geweigerd = [];
  const klaar = new Set();

  for (const it of items) {
    const v = veiligPad(wortel, it.pad);
    if (!v) { geweigerd.push(it); continue; }
    if (!fs.existsSync(v.vol)) { weg.push(it); klaar.add(it.regel); continue; }
    const naar = naarOpruimmap(wortel, datum, v.vol, v.rel);
    verplaatst.push({ ...it, naar: path.relative(wortel, naar) });
    klaar.add(it.regel);
  }

  schrijfLogInDatummap(wortel, datum, verplaatst.map((v) => `${v.pad}${v.reden ? `  —  ${v.reden}` : ''}`));
  /* De lijst houdt alleen wat nog moet: opnieuw dubbelklikken doet dan niets. */
  haalVanLijst(lijstPad, tekst, klaar);
  return { verplaatst, weg, geweigerd, doel: verplaatst.length ? path.join('_opruimen', datum) : null };
}

/** Zijn twee bestanden byte voor byte gelijk? Een map telt nooit als gelijk. */
function gelijk(a, b) {
  try {
    const sa = fs.statSync(a), sb = fs.statSync(b);
    if (!sa.isFile() || !sb.isFile() || sa.size !== sb.size) return false;
    return fs.readFileSync(a).equals(fs.readFileSync(b));
  } catch { return false; }
}

/**
 * VERPLAATS.txt afwerken. Geeft terug wat er gebeurde:
 *   verplaatst  — op de nieuwe plek gezet
 *   dubbel      — de nieuwe plek had al een bestand; de oude kopie staat in _opruimen/<datum>/
 *   al          — de bron was er niet meer en het doel wel: al gedaan
 *   weg         — bron en doel allebei nergens: van de lijst gehaald
 *   geweigerd   — buiten de map, in .git e.d., of een map in zichzelf
 */
export function verplaatsen(wortel, nu = new Date()) {
  const map = path.join(wortel, '_opruimen');
  const lijstPad = path.join(map, 'VERPLAATS.txt');
  const leeg = { verplaatst: [], dubbel: [], al: [], weg: [], geweigerd: [], letop: [] };
  if (!fs.existsSync(lijstPad)) return leeg;

  const tekst = fs.readFileSync(lijstPad, 'utf8');
  const datum = nu.toISOString().slice(0, 10);
  const tijd = nu.toISOString().slice(0, 16).replace('T', ' ');
  const r = { verplaatst: [], dubbel: [], al: [], weg: [], geweigerd: [], letop: [] };
  const klaar = new Set();
  const log = [];

  for (const it of leesVerplaatsLijst(tekst)) {
    if (it.fout) { r.geweigerd.push({ ...it, waarom: it.fout }); continue; }
    const van = veiligPad(wortel, it.bron);
    const naar = veiligPad(wortel, it.doel);
    if (!van || !naar) { r.geweigerd.push({ ...it, waarom: 'buiten de projectmap of in een map die dicht blijft' }); continue; }
    const binnen = path.relative(van.vol, naar.vol);
    if (!binnen || (!binnen.startsWith('..') && !path.isAbsolute(binnen))) {
      r.geweigerd.push({ ...it, waarom: 'een map kan niet in zichzelf' });
      continue;
    }
    const bronEr = fs.existsSync(van.vol);
    const doelEr = fs.existsSync(naar.vol);
    if (!bronEr) {
      (doelEr ? r.al : r.weg).push(it);
      klaar.add(it.regel);
      continue;
    }
    if (doelEr) {
      /* Nooit overschrijven. Claude heeft de nieuwe versie daar al neergezet
         (of iemand anders): dan is wat hier staat de oude kopie. */
      const zelfde = gelijk(van.vol, naar.vol);
      const bewaard = naarOpruimmap(wortel, datum, van.vol, van.rel);
      const waarom = zelfde
        ? `stond al precies zo op ${it.doel}; dit was een dubbele kopie`
        : `op ${it.doel} staat al een nieuwere versie; dit is de oude, kijk even voor je hem weggooit`;
      r.dubbel.push({ ...it, naar: path.relative(wortel, bewaard), zelfde });
      schrijfLogInDatummap(wortel, datum, [`${it.bron}  —  ${waarom}`]);
      log.push(`${tijd}  ${it.bron} -> ${path.relative(wortel, bewaard).replace(/\\/g, '/')}  (oude kopie; ${it.doel} bestond al)`);
      klaar.add(it.regel);
      continue;
    }
    fs.mkdirSync(path.dirname(naar.vol), { recursive: true });
    fs.renameSync(van.vol, naar.vol);
    r.verplaatst.push(it);
    /* Een script dat bestanden zoekt vanaf zijn EIGEN plek (import './x', new URL(…,
       import.meta.url)) kijkt na de verhuizing in een andere map. Niet tegen te
       houden zonder de inhoud te kennen, wel te melden: Claude kijkt de paden na. */
    if (/\.(mjs|cjs|js)$/.test(it.doel) && path.dirname(van.rel) !== path.dirname(naar.rel)) {
      try {
        const code = fs.readFileSync(naar.vol, 'utf8');
        if (/import\.meta\.url|from\s+['"]\.\.?\/|import\(\s*['"]\.\.?\//.test(code)) r.letop.push(it);
      } catch { /* niet te lezen: dan ook niets te melden */ }
    }
    log.push(`${tijd}  ${it.bron} -> ${it.doel}`);
    klaar.add(it.regel);
  }

  if (log.length) {
    const logPad = path.join(map, 'VERPLAATS-LOG.txt');
    const oud = fs.existsSync(logPad) ? fs.readFileSync(logPad, 'utf8') : 'Wat OPRUIMEN.bat binnen de projectmap verplaatste (oud -> nieuw).\r\n\r\n';
    fs.writeFileSync(logPad, `${oud}${log.join('\r\n')}\r\n`);
  }
  haalVanLijst(lijstPad, tekst, klaar);
  return r;
}

/**
 * Wat moet er vóór een uitrol nog gebeuren? Alleen de groepen met "moet" in de
 * kop, en alleen wat er nog op de oude plek staat. Leest, verandert niets.
 */
export function openVoorUitrol(wortel) {
  const lees = (naam) => {
    const p = path.join(wortel, '_opruimen', naam);
    return fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : '';
  };
  const lijst = leesLijst(lees('LIJST.txt'))
    .filter((i) => i.moet && veiligPad(wortel, i.pad) && fs.existsSync(path.join(wortel, i.pad)));
  const verplaats = leesVerplaatsLijst(lees('VERPLAATS.txt'))
    .filter((i) => i.moet && !i.fout && veiligPad(wortel, i.bron) && fs.existsSync(path.join(wortel, i.bron)));
  return { lijst, verplaats, aantal: lijst.length + verplaats.length };
}

/** Wat OPRUIMEN.bat doet: eerst sorteren binnen de map, dan het weggooiwerk. */
export function allesOpruimen(wortel, nu = new Date()) {
  const sorteren = verplaatsen(wortel, nu);
  const weg = opruimen(wortel, nu);
  return { sorteren, weg };
}

/** De uitvoer voor in het venster, in gewone woorden. */
export function verslag({ sorteren, weg }) {
  const r = [];
  const lijn = (i, extra = '') => `  ${i.pad ?? i.bron}${i.doel ? ` -> ${i.doel}` : ''}${extra}${i.reden ? `  —  ${i.reden}` : ''}`;
  if (sorteren.verplaatst.length) {
    r.push(`${sorteren.verplaatst.length} bestand(en) op een nieuwe plek gezet:`);
    for (const v of sorteren.verplaatst) r.push(lijn(v));
    r.push('');
  }
  if (sorteren.letop.length) {
    r.push('Let op: deze scripts zoeken bestanden vanaf hun eigen plek. Ze staan nu ergens anders;');
    r.push('laat Claude de paden erin nakijken voordat ze weer gebruikt worden:');
    for (const v of sorteren.letop) r.push(`  ${v.doel}`);
    r.push('');
  }
  if (sorteren.dubbel.length) {
    r.push(`${sorteren.dubbel.length} stond(en) al op de nieuwe plek; de oude kopie staat nu in _opruimen\\:`);
    for (const v of sorteren.dubbel) r.push(`  ${v.bron}${v.zelfde ? '' : '  (verschilt — kijk even voor je hem weggooit)'}`);
    r.push('');
  }
  if (weg.verplaatst.length) {
    r.push(`${weg.verplaatst.length} bestand(en) verplaatst naar ${weg.doel.replace(/\//g, '\\')}:`);
    for (const v of weg.verplaatst) r.push(lijn(v));
    r.push('', 'Kijk in die map en gooi weg wat weg mag. VERPLAATST.txt zegt per bestand waarom.', '');
  }
  const klaar = sorteren.al.length + sorteren.weg.length + weg.weg.length;
  if (klaar) r.push(`${klaar} regel(s) waren al gedaan; die zijn van de lijst gehaald.`, '');
  const nee = [...sorteren.geweigerd, ...weg.geweigerd];
  if (nee.length) {
    r.push('NIET gedaan (buiten de projectmap, in .git/node_modules, of een tikfout in de regel):');
    for (const g of nee) r.push(`  ${g.regel}${g.waarom ? `  —  ${g.waarom}` : ''}`);
  }
  if (!r.length) r.push('Niets te doen: _opruimen\\LIJST.txt en _opruimen\\VERPLAATS.txt zijn leeg.');
  return r.join('\n').replace(/\n+$/, '');
}

const hierAangeroepen = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (hierAangeroepen) {
  const wortel = path.resolve(process.argv[2] || path.join(path.dirname(fileURLToPath(import.meta.url)), '..'));
  if (!fs.existsSync(path.join(wortel, 'astro.config.mjs')) && !process.argv[2]) {
    console.log('FOUT: dit is niet de projectmap van VISUAILS. Er is niets verplaatst.');
    process.exit(1);
  }
  console.log(verslag(allesOpruimen(wortel)));
}
