/*
 * VISUAILS — levering 71: zelf beelden, iconen en teksten vervangen (5 november 2026)
 *   npm run test:zelfvervangen71
 *
 * Lucas wil een plaatshouder, een oude foto, een icoon of een zin zelf vervangen met
 * een dubbelklik: BEELDEN.bat, TEKSTEN.bat en TEKSTEN-TOEPASSEN.bat. Deze toets houdt
 * de scripts daarachter eerlijk, zonder dat er iets in public/img of src/ verandert:
 * alles wat schrijft, draait in een tijdelijke map (BEELDEN_WORTEL, TEKST_WORTEL).
 *
 *   1 · scripts/lib/xlsx.mjs: schrijven en weer lezen, ook met meer bladen
 *   2 · scripts/tekstblad-xlsx.mjs: de kolommen, en nooit over een bestaande tabel
 *   3 · scripts/tekst-toepassen.mjs: een .xlsx lezen, tonen wat er verandert, J/N,
 *       schrijven met een kopie, en --terug
 *   4 · scripts/beelden.mjs: keuren, de maat, de telefoonversie, de herkomst (C2PA)
 *   5 · scripts/beelden.mjs: iconen tegen het kit, KLAAR in beeld.js
 *   6 · scripts/beelden.mjs: de hele dubbelklik in een tijdelijke map
 *   7 · de drie .bat-bestanden, LEES-MIJ.txt, .gitignore en de README
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { schrijfXlsx, leesXlsx, crc32 } from '../scripts/lib/xlsx.mjs';
import { KOLOMMEN, maakTekstblad, nieuweNaam, sorteer } from '../scripts/tekstblad-xlsx.mjs';
import {
  keurBeeld, doelMaat, verwerkBeeld, telefoonMaat, leesHerkomst, zetHerkomstWebp, zetHerkomstAvif,
  zetHerkomst, markeerKlaar, keurIcoon, zetIcoon, vindVakken, lijstMarkdown, contactbladHtml, verhoudingTekst,
} from '../scripts/beelden.mjs';

const WORTEL = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'zelf-vervangen-71-'));
let pass = 0; let fail = 0;
const ok = (naam, cond, extra = '') => { if (cond) { pass++; console.log(`  ✓ ${naam}`); } else { fail++; console.log(`  ✗ ${naam}${extra ? `  — ${extra}` : ''}`); } };
const node = (args, { env = {}, invoer = '' } = {}) => spawnSync(process.execPath, args, { cwd: WORTEL, encoding: 'utf8', input: invoer, env: { ...process.env, ...env } });

/* ── 1 · xlsx ──────────────────────────────────────────────────────────────── */
console.log('\n1 · scripts/lib/xlsx.mjs');
{
  ok('crc32 geeft de bekende waarde', crc32(Buffer.from('123456789')) >>> 0 === 0xcbf43926);
  const lastig = 'Foto’s & <video> "zo" — één regel\nen een tweede';
  const buf = schrijfXlsx(null, { bladen: [
    { naam: 'Lees mij', rijen: [['uitleg'], ['', 'meer']], kop: false },
    { naam: 'Tekst', rijen: [['id', 'Engels nu'], ['a1', lastig], ['a2', 42]], breedtes: [10, 40] },
  ] });
  const tekst = leesXlsx(buf, { blad: 'Tekst' });
  ok('het blad op naam', tekst[0][0] === 'id' && tekst[1][0] === 'a1');
  ok('lastige tekens komen heel terug', tekst[1][1] === lastig, JSON.stringify(tekst[1][1]));
  ok('een getal wordt tekst', tekst[2][1] === '42');
  ok('zonder naam: het eerste blad', leesXlsx(buf)[0][0] === 'uitleg');
  ok('een naam die er niet is: het eerste blad', leesXlsx(buf, { blad: 'Bestaat niet' })[0][0] === 'uitleg');
  ok('een blad met één blad werkt nog zoals voor 71', leesXlsx(schrijfXlsx([['x', 'y'], ['1', '2']]))[1][1] === '2');
}

/* ── 2 · de tabel ──────────────────────────────────────────────────────────── */
console.log('\n2 · scripts/tekstblad-xlsx.mjs');
{
  const rijen = [
    { id: 'w1', groep: 'WhatsApp', slug: '', waar: 'wa', blok: 'b', soort: 'zin', bron: 'x', en: 'Hi', nl: 'Hoi' },
    { id: 'p1', groep: 'Pagina', slug: 'faq', waar: '/faq', blok: 'b', soort: 'zin', bron: 'x', en: 'Q', nl: 'V', interp: ['{n}'] },
    { id: 'p0', groep: 'Pagina', slug: 'home', waar: '/', blok: 'b', soort: 'kop', bron: 'x', en: 'Home', nl: 'Thuis', waarschuwing: 'kort houden' },
  ];
  ok('de volgorde: pagina eerst, home voor faq, WhatsApp achteraan', sorteer(rijen).map((r) => r.id).join() === 'p0,p1,w1');
  const blad = leesXlsx(maakTekstblad(rijen), { blad: 'Tekst' });
  ok('de kolommen in de volgorde van KOLOMMEN', blad[0].join('|') === KOLOMMEN.map(([n]) => n).join('|'));
  ok('de twee kolommen om in te vullen staan achteraan en zijn leeg', blad[0].slice(-2).join() === 'Engels nieuw,Nederlands nieuw' && blad[1].slice(-2).every((c) => c === ''));
  ok('de kolom "let op" noemt wat de code invult', /de code vult in/.test(blad[2][6]));
  const lees = leesXlsx(maakTekstblad(rijen));
  ok('het eerste blad is de uitleg', lees[0][0] === 'VISUAILS · tekstronde' && lees.some((r) => /TEKSTEN-TOEPASSEN\.bat/.test(r[1] || '')));
  const map = path.join(TMP, 'tabel'); fs.mkdirSync(map);
  const eerste = nieuweNaam(map, '2026-11-05');
  ok('een nieuwe naam met de datum', path.basename(eerste) === 'VISUAILS-tekstronde-2026-11-05.xlsx');
  fs.writeFileSync(eerste, 'ingevuld');
  ok('bestaat die al, dan -2: een ingevulde tabel wordt nooit overschreven', path.basename(nieuweNaam(map, '2026-11-05')) === 'VISUAILS-tekstronde-2026-11-05-2.xlsx');
}

/* ── 3 · terug in de bron ──────────────────────────────────────────────────── */
console.log('\n3 · scripts/tekst-toepassen.mjs');
{
  const wortel = path.join(TMP, 'site');
  for (const m of ['src/components', 'src/pages', 'src/data', 'src/i18n', 'src/layouts', 'src/lib']) fs.mkdirSync(path.join(wortel, m), { recursive: true });
  const bron = "export const zinnen = {\n  en: { kop: `Your photos, ready by tomorrow.` },\n  nl: { kop: `Je foto’s, morgen klaar.` },\n};\n";
  const bronPad = path.join(wortel, 'src', 'data', 'zinnen.js');
  fs.writeFileSync(bronPad, bron);
  const kop = KOLOMMEN.map(([n]) => n);
  const rij = (id, en, nl, enN, nlN) => [id, 'Pagina', '/', 'kop', 'kop', 'zinnen.js', '', en, nl, enN, nlN];
  const tabel = (rijen) => schrijfXlsx(null, { bladen: [{ naam: 'Lees mij', rijen: [['uitleg']], kop: false }, { naam: 'Tekst', rijen: [kop, ...rijen] }] });
  const xlsx = path.join(TMP, 'ingevuld.xlsx');
  fs.writeFileSync(xlsx, tabel([
    rij('p1', 'Your photos, ready by tomorrow.', 'Je foto’s, morgen klaar.', 'Your photos, often ready within a day.', "Je foto's, vaak binnen een dag klaar."),
    rij('p2', 'A sentence that is not there.', '', 'Something else.', ''),
  ]));
  const env = { TEKST_WORTEL: wortel };

  const droog = node(['scripts/tekst-toepassen.mjs', xlsx], { env });
  ok('droog: leest de .xlsx en vindt de zinnen', droog.status === 0 && /2 items · 3 ingevulde velden · 3 unieke vervangingen/.test(droog.stdout), droog.stdout + droog.stderr);
  ok('droog: meldt de zin die er niet is', /1 NIET GEVONDEN/.test(droog.stdout) && /p2/.test(droog.stdout));
  ok('droog: raakt niets aan', fs.readFileSync(bronPad, 'utf8') === bron);

  const nee = node(['scripts/tekst-toepassen.mjs', xlsx, '--vraag'], { env, invoer: 'N\n' });
  ok('--vraag: toont per zin wat er staat en wat het wordt', /WAT ER VERANDERT/.test(nee.stdout) && /was: {2}Your photos, ready by tomorrow\./.test(nee.stdout) && /nu: {3}Your photos, often ready within a day\./.test(nee.stdout), nee.stdout);
  ok('--vraag: de rechte apostrof wordt de krulle', /nu: {3}Je foto’s, vaak binnen een dag klaar\./.test(nee.stdout));
  ok('--vraag: N geeft uitgang 2 en verandert niets', nee.status === 2 && fs.readFileSync(bronPad, 'utf8') === bron, `uitgang ${nee.status}`);

  const sleep = node(['scripts/tekst-toepassen.mjs', '--vraag'], { env, invoer: `"${xlsx}"\nN\n` });
  ok('--vraag zonder bestand: vraagt erom, en een gesleept pad tussen aanhalingstekens werkt', /Sleep je ingevulde tekstronde/.test(sleep.stdout) && /WAT ER VERANDERT/.test(sleep.stdout) && sleep.status === 2, sleep.stdout + sleep.stderr);

  const ja = node(['scripts/tekst-toepassen.mjs', xlsx, '--vraag'], { env, invoer: 'J\n' });
  const na = fs.readFileSync(bronPad, 'utf8');
  ok('J: past het toe', ja.status === 0 && na.includes('Your photos, often ready within a day.') && na.includes('Je foto’s, vaak binnen een dag klaar.'), ja.stdout + ja.stderr);
  const laatste = fs.readFileSync(path.join(wortel, 'tekstronde', 'terug', 'LAATSTE.txt'), 'utf8').trim();
  ok('J: eerst een kopie van het oude bestand in tekstronde/terug', laatste && fs.readFileSync(path.join(wortel, 'tekstronde', 'terug', laatste, 'src', 'data', 'zinnen.js'), 'utf8') === bron);

  const nogEens = node(['scripts/tekst-toepassen.mjs', xlsx, '--vraag'], { env, invoer: 'J\n' });
  ok('een tweede keer: niets te doen (uitgang 3), en niets dubbel', nogEens.status === 3 && fs.readFileSync(bronPad, 'utf8') === na, `uitgang ${nogEens.status}`);

  const terugNee = node(['scripts/tekst-toepassen.mjs', '--terug', '--vraag'], { env, invoer: 'N\n' });
  ok('--terug --vraag met N: laat de nieuwe teksten staan', terugNee.status === 2 && fs.readFileSync(bronPad, 'utf8') === na);
  const terug = node(['scripts/tekst-toepassen.mjs', '--terug', '--vraag'], { env, invoer: 'J\n' });
  ok('--terug met J: het bestand is weer zoals het was', terug.status === 0 && fs.readFileSync(bronPad, 'utf8') === bron, terug.stdout + terug.stderr);
  const terug2 = node(['scripts/tekst-toepassen.mjs', '--terug'], { env });
  ok('--terug een tweede keer: er is niets meer om terug te zetten', terug2.status === 0 && /geen ronde om terug te zetten/.test(terug2.stdout));

  const leeg = path.join(TMP, 'leeg.xlsx');
  fs.writeFileSync(leeg, tabel([rij('p1', 'Your photos, ready by tomorrow.', 'Je foto’s, morgen klaar.', '', '')]));
  ok('niets ingevuld: uitgang 3', node(['scripts/tekst-toepassen.mjs', leeg, '--vraag'], { env }).status === 3);
  const vreemd = path.join(TMP, 'vreemd.xlsx');
  fs.writeFileSync(vreemd, schrijfXlsx([['naam', 'adres'], ['a', 'b']]));
  const v = node(['scripts/tekst-toepassen.mjs', vreemd], { env });
  ok('een andere tabel: rood, in gewone woorden', v.status === 1 && /geen tekstronde van TEKSTEN\.bat/.test(v.stderr));
  const weg = node(['scripts/tekst-toepassen.mjs', path.join(TMP, 'bestaat-niet.xlsx')], { env });
  ok('een bestand dat er niet is: rood', weg.status === 1 && /het bestand is er niet/.test(weg.stderr));
}

/* ── 4 · beelden: keuren, maat, telefoon, herkomst ─────────────────────────── */
console.log('\n4 · scripts/beelden.mjs: keuren, maat, telefoon, herkomst');
const vlak = (w, h, kleur = { r: 40, g: 80, b: 140 }) => sharp({ create: { width: w, height: h, channels: 3, background: kleur } });
{
  const vak = { naam: 'x', breedtes: new Set([380, 760]) };
  const maat = { w: 800, h: 1000, bron: 'bestand' };
  ok('de goede verhouding en maat: goed', keurBeeld({ w: 1600, h: 2000 }, vak, maat).ok);
  ok('2 % ernaast mag nog', keurBeeld({ w: 1600, h: 2035 }, vak, maat).ok);
  const scheef = keurBeeld({ w: 1600, h: 1600 }, vak, maat);
  ok('een andere verhouding: rood, met wat het vak vraagt', !scheef.ok && /verhouding klopt niet/.test(scheef.waarom) && /4 : 5/.test(scheef.waarom), scheef.waarom);
  const klein = keurBeeld({ w: 600, h: 750 }, vak, maat);
  ok('te klein: rood, met de maat', !klein.ok && /te klein/.test(klein.waarom) && /800 px/.test(klein.waarom), klein.waarom);
  ok('verhoudingTekst noemt de bekende verhouding', verhoudingTekst(1200, 800) === '3 : 2 (1200 × 800)');
  ok('ligt er een beeld, dan precies die maat', JSON.stringify(doelMaat({ w: 3000, h: 3750 }, maat)) === '{"w":800,"h":1000}');
  ok('een plaatshouder: de verhouding van de pagina, hoogstens 2400', JSON.stringify(doelMaat({ w: 3000, h: 2000 }, { w: 1200, h: 800, bron: 'pagina' })) === '{"w":2400,"h":1600}');
  ok('staand en groot: de hoogte hoogstens 2400', JSON.stringify(doelMaat({ w: 2400, h: 3000 }, { w: 4, h: 5, bron: 'pagina' })) === '{"w":1920,"h":2400}');
  ok('de telefoonversie komt uit telefoonbeelden.js', telefoonMaat('banners-13') === 1200 && telefoonMaat('lifestyle-phone-made-11') === 1400 && telefoonMaat('bestaat-niet') === null);

  const img = path.join(TMP, 'img'); fs.mkdirSync(img);
  const bron = path.join(TMP, 'bron.png');
  await vlak(1600, 2000).png().toFile(bron);
  await vlak(800, 1000, { r: 200, g: 0, b: 0 }).webp().toFile(path.join(img, 'x.webp'));
  const vorige = path.join(TMP, 'vorige');
  const uit = await verwerkBeeld(bron, vak, { img, vorige, doel: doelMaat({ w: 1600, h: 2000 }, maat) });
  const m0 = await sharp(path.join(img, 'x.webp')).metadata();
  const m380 = await sharp(path.join(img, 'x-w380.webp')).metadata();
  ok('het origineel op de maat van het vak', m0.width === 800 && m0.height === 1000, `${m0.width}×${m0.height}`);
  ok('elke kleinere maat die de site gebruikt', uit.length === 3 && m380.width === 380 && fs.existsSync(path.join(img, 'x-w760.webp')));
  ok('het oude beeld staat in _vorige', fs.readdirSync(vorige).some((f) => /^x-\d{4}-\d\d-\d\d\.webp$/.test(f)));
  const tel = { naam: 'banners-13', breedtes: new Set([760, 1200]) };
  const uitTel = await verwerkBeeld(bron, tel, { img });
  ok('de telefoonversie laat hij aan make-telefoon.mjs', !fs.existsSync(path.join(img, 'banners-13-w1200.webp')) && uitTel.some((p) => p.endsWith('banners-13-w760.webp')));

  /* De herkomst uit een echt beeld van de site. */
  const echt = fs.readdirSync(path.join(WORTEL, 'public', 'img')).filter((f) => f.endsWith('.webp')).map((f) => path.join(WORTEL, 'public', 'img', f)).find((p) => leesHerkomst(fs.readFileSync(p)));
  ok('leest het C2PA-blok uit een webp van de site', !!echt);
  const man = echt ? leesHerkomst(fs.readFileSync(echt)) : Buffer.from('....jumb....c2pa....manifest');
  ok('het blok is een JUMBF-box met c2pa', man.subarray(4, 8).toString('ascii') === 'jumb' && man.includes('c2pa'));
  const echtAvif = fs.readdirSync(path.join(WORTEL, 'public', 'img')).filter((f) => f.endsWith('.avif')).map((f) => path.join(WORTEL, 'public', 'img', f)).find((p) => leesHerkomst(fs.readFileSync(p)));
  ok('en uit een AVIF van de site', !!echtAvif);

  const kaal = await vlak(200, 250).webp({ quality: 80 }).toBuffer();
  ok('een vers webp heeft geen blok', leesHerkomst(kaal) === null);
  const metW = zetHerkomstWebp(kaal, man);
  ok('webp: het blok gaat erin en komt er heel weer uit', leesHerkomst(metW)?.equals(man));
  ok('webp: de RIFF-maat klopt', metW.readUInt32LE(4) === metW.length - 8);
  ok('webp: twee keer geeft één blok', zetHerkomstWebp(metW, man).length === metW.length);
  const rauw = async (b) => (await sharp(b).raw().toBuffer());
  ok('webp: het beeld is pixel voor pixel hetzelfde', (await rauw(metW)).equals(await rauw(kaal)));

  const avif = await vlak(200, 250).avif({ quality: 52 }).toBuffer();
  const metA = zetHerkomstAvif(avif, man);
  ok('AVIF: het blok gaat erin en komt er heel weer uit', leesHerkomst(metA)?.equals(man));
  ok('AVIF: achteraan, zodat de beelddata niet verschuift', metA.subarray(0, avif.length).equals(avif));
  ok('AVIF: het beeld is pixel voor pixel hetzelfde', (await rauw(metA)).equals(await rauw(avif)));
  ok('AVIF: twee keer geeft één blok', zetHerkomstAvif(metA, man).length === metA.length);

  /* Een jpg uit de beeldmaker: het blok over twee APP11-segmenten. */
  const jpg = await vlak(200, 250).jpeg().toBuffer();
  const seg = (z, stuk) => { const kop = Buffer.alloc(12); kop.writeUInt16BE(0xffeb, 0); kop.writeUInt16BE(10 + stuk.length, 2); kop.write('JP', 4, 'ascii'); kop.writeUInt16BE(1, 6); kop.writeUInt32BE(z, 8); return Buffer.concat([kop, stuk]); };
  const helft = Math.floor(man.length / 2);
  const metJ = Buffer.concat([jpg.subarray(0, 2), seg(1, man.subarray(0, helft)), seg(2, Buffer.concat([man.subarray(0, 8), man.subarray(helft)])), jpg.subarray(2)]);
  ok('jpg: het blok over twee segmenten komt heel terug', leesHerkomst(metJ)?.equals(man));
  ok('jpg: het bestand is nog een leesbaar beeld', (await sharp(metJ).metadata()).width === 200);
  /* Een png: de chunk caBX voor IEND. */
  const png = await vlak(200, 250).png().toBuffer();
  const chunk = Buffer.alloc(8); chunk.writeUInt32BE(man.length, 0); chunk.write('caBX', 4, 'ascii');
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(Buffer.concat([chunk.subarray(4), man])) >>> 0, 0);
  const metP = Buffer.concat([png.subarray(0, png.length - 12), chunk, man, crc, png.subarray(png.length - 12)]);
  ok('png: het blok komt heel terug', leesHerkomst(metP)?.equals(man));
  ok('png: het bestand is nog een leesbaar beeld', (await sharp(metP).metadata()).width === 200);

  const hk = path.join(TMP, 'herkomst'); fs.mkdirSync(hk);
  fs.writeFileSync(path.join(hk, 'y.webp'), kaal); fs.writeFileSync(path.join(hk, 'y-w380.webp'), kaal); fs.writeFileSync(path.join(hk, 'y.avif'), avif);
  fs.writeFileSync(path.join(hk, 'yy.webp'), kaal);
  const gezet = zetHerkomst(hk, 'y', man);
  ok('zetHerkomst: elke webp en AVIF van het vak, en geen ander vak', gezet.join() === 'y.webp,y-w380.webp,y.avif' && leesHerkomst(fs.readFileSync(path.join(hk, 'yy.webp'))) === null);
  ok('zetHerkomst: de AVIF is niet ouder dan zijn webp (make-avif.mjs maakt hem anders opnieuw)', fs.statSync(path.join(hk, 'y.avif')).mtimeMs >= fs.statSync(path.join(hk, 'y.webp')).mtimeMs);
}

/* ── 5 · iconen en KLAAR ───────────────────────────────────────────────────── */
console.log('\n5 · scripts/beelden.mjs: iconen en KLAAR');
{
  const iconen = fs.readFileSync(path.join(WORTEL, 'src', 'data', 'iconen.js'), 'utf8');
  const vink = /'vink': '([^']+)'/.exec(iconen)[1];
  const svg = (binnen, vb = '0 0 24 24') => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}">${binnen}</svg>`;
  const k = keurIcoon(svg(`<path d="${vink}"/>`));
  ok('een icoon uit het kit zelf: goed', k.ok && k.d === vink, k.waarom);
  ok('een ander raster: rood', !keurIcoon(svg(`<path d="${vink}"/>`, '0 0 32 32')).ok);
  ok('een lijn: rood', /lijn/.test(keurIcoon(svg(`<path d="${vink}" stroke="#000" stroke-width="2"/>`)).waarom));
  ok('een transform: rood', /transform/.test(keurIcoon(svg(`<path d="${vink}" transform="rotate(45)"/>`)).waarom));
  ok('een kleur: rood', /kleur/.test(keurIcoon(svg(`<path d="${vink}" fill="#25508B"/>`)).waarom));
  ok('zwart of currentColor mag', keurIcoon(svg(`<path d="${vink}" fill="currentColor"/>`)).ok && keurIcoon(svg(`<path d="${vink}" fill="#000"/>`)).ok);
  ok('een cirkel in plaats van een pad: rood', /paden/.test(keurIcoon(svg('<circle cx="12" cy="12" r="5"/>')).waarom));
  ok('een ingesloten beeld: rood', !keurIcoon(svg('<image href="x.png"/><path d="M1 1L2 2Z"/>')).ok);
  ok('een punt buiten het raster: rood', /buiten het raster/.test(keurIcoon(svg('<path d="M1 1L30 2L2 2Z"/>')).waarom));
  const z = zetIcoon(iconen, 'vink', 'M1 1L23 1L12 22Z');
  ok('zetIcoon vervangt alleen dat ene pad', z.veranderd && z.tekst.includes("'vink': 'M1 1L23 1L12 22Z'") && z.tekst.split('\n').length === iconen.split('\n').length && z.tekst.replace('M1 1L23 1L12 22Z', vink) === iconen);
  ok('een icoon dat er niet is: niet veranderd, met uitleg', !zetIcoon(iconen, 'bestaat-niet', 'M1 1Z').veranderd);
  const beeld = fs.readFileSync(path.join(WORTEL, 'src', 'data', 'beeld.js'), 'utf8');
  const kl = markeerKlaar(beeld, 'nieuw-vak-71');
  ok('markeerKlaar zet de naam in KLAAR', kl.veranderd && /KLAAR = new Set\(\[[\s\S]*'nieuw-vak-71'[\s\S]*\]\);/.test(kl.tekst));
  ok('markeerKlaar een tweede keer: niets dubbel', !markeerKlaar(kl.tekst, 'nieuw-vak-71').veranderd);
}

/* ── 6 · de hele dubbelklik ────────────────────────────────────────────────── */
console.log('\n6 · scripts/beelden.mjs: de hele dubbelklik, in een tijdelijke map');
{
  const w = path.join(TMP, 'project');
  const map = (...p) => path.join(w, ...p);
  for (const d of ['dist', 'public/img', 'src/data', 'kladblok', 'eigen-beelden']) fs.mkdirSync(map(d), { recursive: true });
  fs.writeFileSync(map('dist', 'index.html'), '<img src="/img/vak-a.webp" srcset="/img/vak-a-w380.webp 380w, /img/vak-a.webp 800w" width="800" height="1000" alt=""><img src="/img/plaatshouder/vak-b.svg" width="1200" height="800" alt=""><img src="/img/og-home.png" alt="">');
  fs.mkdirSync(map('dist', 'nl')); fs.writeFileSync(map('dist', 'nl', 'index.html'), '<img src="/img/vak-a-w380.webp" alt="">');
  await vlak(800, 1000, { r: 200, g: 0, b: 0 }).webp().toFile(map('public', 'img', 'vak-a.webp'));
  await vlak(380, 475, { r: 200, g: 0, b: 0 }).webp().toFile(map('public', 'img', 'vak-a-w380.webp'));
  const beeldJs = "export const PLAATSHOUDERS = true;\nexport const KLAAR = new Set([\n  'banners-01',\n]);\n";
  const iconenJs = "export const ICONEN = {\n  'vink': 'M1 1L2 2Z',\n  'pijl': 'M3 3L4 4Z',\n};\n";
  fs.writeFileSync(map('src', 'data', 'beeld.js'), beeldJs);
  fs.writeFileSync(map('src', 'data', 'iconen.js'), iconenJs);
  fs.writeFileSync(map('src', 'data', 'oude-beelden.json'), JSON.stringify(['vak-a']));
  const echt = fs.readdirSync(path.join(WORTEL, 'public', 'img')).filter((f) => f.endsWith('.webp')).map((f) => path.join(WORTEL, 'public', 'img', f)).find((p) => leesHerkomst(fs.readFileSync(p)));
  const man = leesHerkomst(fs.readFileSync(echt));
  /* vak-a: een png uit de beeldmaker met herkomst; vak-b: te klein; een naam die er niet is; een icoon. */
  const png = await vlak(1600, 2000, { r: 0, g: 120, b: 60 }).png().toBuffer();
  const chunk = Buffer.alloc(8); chunk.writeUInt32BE(man.length, 0); chunk.write('caBX', 4, 'ascii');
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(Buffer.concat([chunk.subarray(4), man])) >>> 0, 0);
  fs.writeFileSync(map('eigen-beelden', 'Vak-A.png'), Buffer.concat([png.subarray(0, png.length - 12), chunk, man, crc, png.subarray(png.length - 12)]));
  await vlak(600, 400).jpeg().toFile(map('eigen-beelden', 'vak-b.jpg'));
  await vlak(800, 1000).png().toFile(map('eigen-beelden', 'onbekend.png'));
  fs.writeFileSync(map('eigen-beelden', 'vink.svg'), '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M2 2L22 2L12 22Z"/></svg>');
  fs.writeFileSync(map('eigen-beelden', 'LEES-MIJ.txt'), 'uitleg');
  const env = { BEELDEN_WORTEL: w, BEELDEN_ZONDER_SCRIPTS: '1' };

  const r = node(['scripts/beelden.mjs'], { env });
  const uit = r.stdout + r.stderr;
  ok('rood als er iets niet gedaan is (uitgang 1)', r.status === 1, uit);
  ok('vak-a: GOED, met de herkomst', /GOED {3}Vak-A\.png: .*met de herkomst \(C2PA\)/.test(uit), uit);
  ok('vak-b: te klein, met de maat die het vak vraagt', /ROOD {3}vak-b\.jpg: te klein: 600 px breed, het vak vraagt minstens 1200 px/.test(uit));
  ok('een naam die er niet is: rood, met waar de namen staan', /ROOD {3}onbekend\.png: er is geen vak met deze naam\. Kijk in eigen-beelden\\BEELDVAKKEN\.html/.test(uit));
  ok('het icoon: GOED', /GOED {3}vink\.svg: het icoon "vink" staat in src\\data\\iconen\.js/.test(uit));
  ok('de samenvatting zegt hoeveel wel en niet, en wat je doet', /ROOD: 2 bestand\(en\) niet gedaan.*2 wel/.test(uit) && /Wat je doet: pas het bestand aan/.test(uit));
  const m = await sharp(map('public', 'img', 'vak-a.webp')).metadata();
  ok('het nieuwe vak-a heeft de maat van het oude', m.width === 800 && m.height === 1000);
  const kleur = (await sharp(map('public', 'img', 'vak-a.webp')).raw().toBuffer()).subarray(0, 3);
  ok('en is het nieuwe beeld', kleur[0] < 40 && kleur[1] > 90);
  ok('de herkomst zit in het origineel en in de -w380', leesHerkomst(fs.readFileSync(map('public', 'img', 'vak-a.webp')))?.equals(man) && leesHerkomst(fs.readFileSync(map('public', 'img', 'vak-a-w380.webp')))?.equals(man));
  ok('vak-a staat in KLAAR (het stond in oude-beelden.json)', fs.readFileSync(map('src', 'data', 'beeld.js'), 'utf8').includes("'vak-a',"));
  ok('het icoon staat in iconen.js, de andere iconen niet aangeraakt', fs.readFileSync(map('src', 'data', 'iconen.js'), 'utf8') === iconenJs.replace('M1 1L2 2Z', 'M2 2L22 2L12 22Z'));
  ok('het oude vak-a staat in _vorige', fs.readdirSync(map('eigen-beelden', '_vorige')).some((f) => /^vak-a-.*\.webp$/.test(f)));
  ok('wat gedaan is, staat in _verwerkt; wat rood was, staat er nog', fs.existsSync(map('eigen-beelden', '_verwerkt', 'Vak-A.png')) && fs.existsSync(map('eigen-beelden', '_verwerkt', 'vink.svg')) && fs.existsSync(map('eigen-beelden', 'vak-b.jpg')) && !fs.existsSync(map('eigen-beelden', 'Vak-A.png')));
  ok('LEES-MIJ.txt blijft staan', fs.existsSync(map('eigen-beelden', 'LEES-MIJ.txt')));
  const contact = fs.readFileSync(map('eigen-beelden', 'CONTACTBLAD.html'), 'utf8');
  ok('het contactblad: voor en na, en wat niet gedaan is', /_vorige\/vak-a-/.test(contact) && /\.\.\/public\/img\/vak-a\.webp/.test(contact) && /NIET GEDAAN/.test(contact));
  const lijst = fs.readFileSync(map('kladblok', 'BEELDVAKKEN.md'), 'utf8');
  ok('de lijst van vakken: vak-a en vak-b, geen og-beeld', /`vak-a` \| staat er \| 4 : 5/.test(lijst) && /`vak-b` \| plaatshouder \| 3 : 2/.test(lijst) && !/og-home/.test(lijst), lijst);
  ok('BEELDVAKKEN.html staat in eigen-beelden', /FOTO VOLGT/.test(fs.readFileSync(map('eigen-beelden', 'BEELDVAKKEN.html'), 'utf8')));

  const r2 = node(['scripts/beelden.mjs'], { env });
  ok('een tweede dubbelklik doet vak-a niet nog eens', r2.status === 1 && !/Vak-A/.test(r2.stdout) && /vak-b\.jpg/.test(r2.stdout));
  fs.rmSync(map('eigen-beelden', 'vak-b.jpg')); fs.rmSync(map('eigen-beelden', 'onbekend.png'));
  const r3 = node(['scripts/beelden.mjs'], { env });
  ok('een lege map: uitgang 3 (BEELDEN.bat opent dan de lijst), niets veranderd', r3.status === 3 && /Er staat nog geen beeld/.test(r3.stdout));
  fs.rmSync(map('dist'), { recursive: true });
  const r4 = node(['scripts/beelden.mjs'], { env });
  ok('zonder build: rood, met wat je doet', r4.status === 1 && /ROOD: er is nog geen build/.test(r4.stdout) && /UITROLLEN\.bat/.test(r4.stdout));

  /* vindVakken los: de -w-maten, de plaatshouder en de maat uit het <img>. */
  const d2 = path.join(TMP, 'dist2'); fs.mkdirSync(path.join(d2, 'catalog'), { recursive: true });
  fs.writeFileSync(path.join(d2, 'catalog', 'index.html'), '<img src="/img/foo-w760.webp" width="760" height="950"><img src="/img/plaatshouder/bar-donker.svg" width="800" height="1000"><img src="/img/i-pijl.png">');
  const v = vindVakken({ dist: d2, img: path.join(TMP, 'geen-img') });
  ok('vindVakken: de maat uit de srcset en de pagina', v.get('foo')?.breedtes.has(760) && v.get('foo').paginas.has('/catalog/'));
  ok('vindVakken: een plaatshouder met de maat uit het <img>', v.get('bar')?.plaatshouder && v.get('bar').vraag.w === 800 && !v.has('i-pijl'));
  ok('lijstMarkdown en contactbladHtml ontsnappen tekens', /\| `a` \|/.test(lijstMarkdown([{ naam: 'a', stand: 'staat er', verhouding: '1 : 1', minimaal: 760, maten: [], paginas: [] }])) && !contactbladHtml([{ naam: '<b>', paginas: [], ok: true }]).includes('<b><'));
}

/* ── 7 · de .bat-bestanden en de rest ──────────────────────────────────────── */
console.log('\n7 · de drie .bat-bestanden, LEES-MIJ.txt, .gitignore en de README');
{
  const bats = { 'BEELDEN.bat': 'node scripts\\\\beelden\\.mjs', 'TEKSTEN.bat': 'node scripts\\\\tekstblad-xlsx\\.mjs', 'TEKSTEN-TOEPASSEN.bat': 'node scripts\\\\tekst-toepassen\\.mjs --vraag' };
  for (const [naam, roep] of Object.entries(bats)) {
    const bat = fs.readFileSync(path.join(WORTEL, naam), 'latin1');
    ok(`${naam}: CRLF-regeleinden`, !/[^\r]\n/.test(bat) && /\r\n/.test(bat));
    ok(`${naam}: alleen ASCII (cmd.exe en zijn codepagina)`, !/[^\x00-\x7F]/.test(bat));
    ok(`${naam}: springt naar zijn eigen map en controleert de projectmap`, /cd \/d "%~dp0"/.test(bat) && /if not exist "astro\.config\.mjs" goto nietindemap/.test(bat) && /^:nietindemap/m.test(bat));
    ok(`${naam}: geen blokken tussen haakjes (de projectmap heeft haakjes)`, /\(\s*$/m.test(bat.replace(/^REM.*$/gim, '')) === false && !/^\s*(if|for)\b.*\(/im.test(bat.replace(/^REM.*$/gim, '')));
    ok(`${naam}: roept het script aan`, new RegExp(roep).test(bat));
    ok(`${naam}: wacht aan het eind (pause) en zegt groen of rood`, /pause\r\nexit \/b 0/.test(bat) && /ROOD/.test(bat));
    ok(`${naam}: een korte uitleg bovenin`, /^REM {2}Wat jij doet:/m.test(bat) && /^REM {2}Wanneer:/m.test(bat));
    ok(`${naam}: toont de uitvoer in UTF-8`, /chcp 65001 >nul/.test(bat));
  }
  const toepassen = fs.readFileSync(path.join(WORTEL, 'TEKSTEN-TOEPASSEN.bat'), 'latin1');
  ok('TEKSTEN-TOEPASSEN.bat: na J draaien alle toetsen, en bij rood biedt hij terugzetten aan', /node scripts\\testreeks\.mjs --nog-eens\r\nif errorlevel 1 goto rood/.test(toepassen) && /:rood[\s\S]*node scripts\\tekst-toepassen\.mjs --terug --vraag/.test(toepassen));
  ok('TEKSTEN-TOEPASSEN.bat: 3 en 2 voor 1 (errorlevel is "minstens")', toepassen.indexOf('errorlevel 3') < toepassen.indexOf('errorlevel 2') && toepassen.indexOf('errorlevel 2') < toepassen.indexOf('errorlevel 1'));
  const teksten = fs.readFileSync(path.join(WORTEL, 'TEKSTEN.bat'), 'latin1');
  ok('TEKSTEN.bat: eerst de build, dan de zinnen, dan de tabel, en hij opent hem', /call npm run build[\s\S]*node scripts\\tekstblad\.mjs[\s\S]*node scripts\\tekstblad-xlsx\.mjs[\s\S]*start "" "tekstronde\\%TABEL%"/.test(teksten));
  const lees = fs.readFileSync(path.join(WORTEL, 'eigen-beelden', 'LEES-MIJ.txt'), 'latin1');
  ok('eigen-beelden/LEES-MIJ.txt: CRLF, voor Kladblok', !/[^\r]\n/.test(lees) && /BEELDEN\.bat/.test(lees));
  const ign = fs.readFileSync(path.join(WORTEL, '.gitignore'), 'utf8');
  ok('.gitignore: eigen-beelden gaat niet mee, op de uitleg na', /^eigen-beelden\/\*$/m.test(ign) && /^!eigen-beelden\/LEES-MIJ\.txt$/m.test(ign));
  const attr = fs.readFileSync(path.join(WORTEL, '.gitattributes'), 'utf8');
  ok('.gitattributes: de .bat-bestanden en LEES-MIJ.txt als CRLF', /^\*\.bat text eol=crlf$/m.test(attr) && /^eigen-beelden\/LEES-MIJ\.txt text eol=crlf$/m.test(attr));
  const readme = fs.readFileSync(path.join(WORTEL, 'README.md'), 'utf8');
  ok('de README noemt de drie', ['BEELDEN.bat', 'TEKSTEN.bat', 'TEKSTEN-TOEPASSEN.bat'].every((b) => readme.includes(b)));
  const pkg = JSON.parse(fs.readFileSync(path.join(WORTEL, 'package.json'), 'utf8'));
  ok('npm run tekstblad draait zonder Python', !/python/.test(pkg.scripts.tekstblad) && /tekstblad-xlsx\.mjs/.test(pkg.scripts.tekstblad));
  ok('deze toets staat in de keten', /npm run test:zelfvervangen71/.test(pkg.scripts.test));
}

fs.rmSync(TMP, { recursive: true, force: true });
console.log(`\n${pass}/${pass + fail} geslaagd`);
process.exit(fail ? 1 : 0);
