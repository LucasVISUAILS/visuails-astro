/*
 * ═══════════════════════════════════════════════════════════════════════════════
 * DE WERKMAP — HEEN EN TERUG, ZONDER ÉÉN BESTAND TE HERNOEMEN
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Lucas, 12 augustus 2026: *"Heen en terug, hernoemen helemaal weg, het moet zoveel
 * mogelijk tijd schelen."*
 *
 * De hele constructie hangt aan één afspraak: **de map waarin een bestand staat,
 * zegt welk product en welke shot het is.** Als die afspraak aan één van de twee
 * kanten schuift, gebeurt er niets zichtbaars — er komt geen foutmelding, de upload
 * lukt — en belandt er alleen dertig beelden op product 1 of helemaal nergens. Dat
 * is precies het soort fout dat je pas ziet als een klant zijn levering opent.
 *
 * Vandaar dat dit bestand de HEENWEG en de TERUGWEG tegen elkaar test in plaats van
 * elk apart: de mapnaam die scaffoldFiles() uitdeelt, gaat door parseScaffoldPath()
 * heen en moet er hetzelfde product en dezelfde shot uit laten komen. Een test die
 * alleen de namen controleert, zou twee kanten goedkeuren die niet op elkaar passen.
 *
 * ── EN DE DRIE DINGEN DIE HIER EERDER ZIJN MISGEGAAN ────────────────────────
 *
 *   1 · EEN LEGE MAP KOMT NIET IN EEN ZIP. Een uitpakker maakt alleen de mappen die
 *       hij uit een bestandspad kan afleiden, en dit archief bevat per definitie
 *       nog geen beelden. Zonder mapvermeldingen (`dir: true` in zip.js) pakt de
 *       werkmap dus vrijwel leeg uit — de ene fout die het hele idee waardeloos
 *       maakt zonder dat er iets omvalt.
 *
 *   2 · EEN LOS GETAL IS GEEN PRODUCT. De shotmappen heten `1 voorkant` … `4
 *       op-model`, met een cijfer ervoor omdat Verkenner alfabetisch sorteert.
 *       guessProductShot() in admin.js leest een los getal van 1 tot 3 cijfers wél
 *       als product, en zou dus elke shotmap als productsleutel lezen.
 *       parseScaffoldPath() doet dat met opzet niet.
 *
 *   3 · HET BRONMATERIAAL VAN DE KLANT MAG NIET TERUGKOMEN ALS LEVERING. Bij "de
 *       hele map kiezen" gaat álles mee wat erin staat.
 */
import { readFileSync } from 'node:fs';
import {
  scaffoldFiles, scaffoldFilename, parseScaffoldPath, isSourcePath, isScaffoldDoc,
  deliveryFilename,
  productFolder, safeSegment, SLOT_FOLDER, LOOSE_FOLDER, SOURCE_FOLDER,
  readmeText, licenceText, briefingText,
} from '../src/lib/scaffold.js';
import { zipStream } from '../src/lib/zip.js';
import { SHOT_IDS } from '../src/data/shots.js';

let pass = 0;
let fail = 0;
function ok(name, got, want = true, shown) {
  const good = got === want;
  if (good) pass++; else fail++;
  console.log(`${good ? ' ok  ' : ' FAIL'} ${name.padEnd(62)}${good ? '' : `verwacht ${JSON.stringify(want)} kreeg ${JSON.stringify(shown ?? got)}`}`);
}
const read = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8');

const ORDER = {
  id: 7, ref: 'VIS-2608-4471', brand: 'Atelier Noord', name: 'Sanne', service: 'catalog',
  lang: 'nl', product_count: 3, window_end: '2026-08-20T00:00:00Z', notes: 'Alles mat houden.',
};
const PRODUCTS = [
  { index: 1, name: 'Zwarte hoodie', material: 'zware fleece', colour: '#191510', background: '#F1F4F4', extras: ['detail van het label', ''] },
  { index: 2, name: 'T-shirt / oversized', material: null, colour: null, background: '#F1F4F4', extras: [] },
  { index: 3, name: null, material: 'runderleer, mat', colour: 'cognac', background: null, extras: [] },
];

console.log('\nVISUAILS — de werkmap\n');

console.log('heen: de zip bevat de mappen, en dat is niet vanzelfsprekend');
{
  const files = scaffoldFiles(ORDER, PRODUCTS, { origin: 'https://visuails.com' });
  const namen = files.map((f) => f.name);
  const mappen = files.filter((f) => f.dir).map((f) => f.name);

  /* DE CHECK DIE HET ECHT DOET. Zonder `dir: true` zou deze lijst leeg zijn, zou de
     zip alleen drie tekstbestanden bevatten, en zou er niets omvallen. */
  ok('er zitten mapvermeldingen in', mappen.length > 0, true, String(mappen.length));
  ok('vier shotmappen per product', mappen.filter((n) => !n.endsWith(`${LOOSE_FOLDER}/`)).length,
    PRODUCTS.length * SHOT_IDS.length);
  ok('en elke mapnaam eindigt op een schuine streep',
    mappen.every((n) => n.endsWith('/')), true, mappen.find((n) => !n.endsWith('/')));
  ok(`plus één ${LOOSE_FOLDER}`, mappen.filter((n) => n.endsWith(`${LOOSE_FOLDER}/`)).length, 1);

  ok('de leesmij zit erin', namen.some((n) => n.endsWith('/LEESMIJ.txt')), true);
  ok('het licentiebestand ook', namen.some((n) => n.endsWith('/LICENTIE.txt')), true);
  ok('en een briefing per product', namen.filter((n) => n.endsWith('/_briefing.txt')).length, PRODUCTS.length);
  ok('alles staat onder één wortelmap met de referentie erin',
    namen.every((n) => n.startsWith(`${ORDER.ref}/`)), true, namen.find((n) => !n.startsWith(`${ORDER.ref}/`)));
  ok('de zipnaam draagt de referentie', scaffoldFilename(ORDER.ref), 'VIS-2608-4471-werkmap.zip');

  /* SHOT_IDS en niet een eigen lijst: loopt de mapstructuur uit elkaar met het
     werkbord op /admin, dan komt een beeld in een map waar geen vakje voor is. */
  for (const shot of SHOT_IDS) {
    ok(`shot ${shot} heeft een mapnaam`, typeof SLOT_FOLDER[shot] === 'string' && SLOT_FOLDER[shot].length > 2, true);
  }
  ok('en er zijn niet meer mapnamen dan shots', Object.keys(SLOT_FOLDER).length, SHOT_IDS.length);
}

console.log('\nde zip pakt echt uit, met de mappen erin');
{
  /* NIET OP DE BYTES VERTROUWEN. Een zip die "geldig lijkt" is de klassieke manier
     waarop dit soort code doorglipt: de header klopt, de uitpakker klaagt niet, en er
     komt de helft uit. Hier wordt het archief werkelijk gelezen — de centrale
     directory eruit, en dan kijken welke namen erin staan. */
  const files = scaffoldFiles(ORDER, PRODUCTS, { origin: 'https://visuails.com' });
  const chunks = [];
  const reader = zipStream(files).getReader();
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(Buffer.from(value));
  }
  const buf = Buffer.concat(chunks);
  ok('het archief begint met de zipsignatuur', buf.subarray(0, 4).toString('latin1'), 'PK');

  /* De namen uit de centrale directory lezen: elke ingang begint met PK,
     de naamlengte staat op offset 28 en de naam op 46. Dat is het deel van het
     formaat waar een uitpakker naar kijkt, dus is het ook het deel dat getest hoort
     te worden — de lokale headers kunnen kloppen terwijl de directory dat niet doet.
     Precies die fout zat er op 10 augustus in (0x0808 tegenover 0x0800). */
  const uitDirectory = [];
  for (let i = 0; i + 46 <= buf.length; i++) {
    if (buf.readUInt32LE(i) !== 0x02014b50) continue;
    const len = buf.readUInt16LE(i + 28);
    uitDirectory.push(buf.subarray(i + 46, i + 46 + len).toString('utf8'));
  }
  ok('de centrale directory noemt elke ingang', uitDirectory.length, files.length,
    `${uitDirectory.length} van ${files.length}`);
  ok('inclusief de shotmappen',
    uitDirectory.includes(`${ORDER.ref}/p1 - Zwarte hoodie/${SLOT_FOLDER.front}/`), true,
    uitDirectory.filter((n) => n.includes('voorkant')).join(' | '));
  /* Een mapvermelding heeft nul bytes en crc nul. Zou zip.js er een gewoon bestand
     van maken, dan pakt hij uit als bestand mét naam en zonder inhoud — en dan staat
     er in Verkenner een bestand waar een map hoort. */
  const idx = uitDirectory.indexOf(`${ORDER.ref}/p1 - Zwarte hoodie/${SLOT_FOLDER.front}/`);
  ok('en die mapvermelding is te vinden', idx >= 0, true);
}

console.log('\nterug: het pad geeft product en shot, precies zoals de heenweg ze uitdeelde');
{
  /*
   * DE KERN VAN DIT BESTAND. Elke map die scaffoldFiles() uitdeelt, wordt hier
   * teruggelezen met de functie die de upload gebruikt. Slaagt dit, dan is de
   * afspraak rond. Verandert iemand een mapnaam aan één kant, dan valt dit om — en
   * dat is de enige plek waar dat zichtbaar wordt.
   */
  const files = scaffoldFiles(ORDER, PRODUCTS, { origin: 'https://visuails.com' });
  let gecontroleerd = 0;
  const scheef = [];
  for (const f of files.filter((x) => x.dir && !x.name.endsWith(`${LOOSE_FOLDER}/`))) {
    // Zoals de browser hem post: het pad plus een bestandsnaam die niets zegt.
    const gepost = `${f.name}upscaled_v3(2).PNG`;
    const uit = parseScaffoldPath(gepost);
    const m = f.name.match(/\/p(\d+) - /);
    const verwachtProduct = m ? `p${m[1]}` : null;
    const verwachtShot = Object.entries(SLOT_FOLDER)
      .find(([, folder]) => f.name.includes(`/${folder}/`))?.[0] || null;
    gecontroleerd += 1;
    if (uit.product !== verwachtProduct || uit.shot !== verwachtShot) {
      scheef.push(`${f.name} -> ${JSON.stringify(uit)}`);
    }
  }
  ok('er zijn mappen om te controleren', gecontroleerd, PRODUCTS.length * SHOT_IDS.length);
  ok('elke uitgedeelde map leest terug op hetzelfde product en dezelfde shot',
    scheef.length, 0, scheef.slice(0, 3).join(' | '));

  /* HET LOSSE GETAL. `1 voorkant` mag nooit als product 1 gelezen worden. Deze regel
     is de reden dat parseScaffoldPath() bestaat naast guessProductShot(). */
  ok('een shotmap wordt niet als product gelezen',
    parseScaffoldPath(`${ORDER.ref}/${SLOT_FOLDER.front}/x.jpg`).product, null);
  ok('ook niet bij het vierde vakje',
    parseScaffoldPath(`${ORDER.ref}/${SLOT_FOLDER.worn}/x.jpg`).product, null);
  /* Maar de shot wordt er wél uit gelezen — anders zou een beeld dat per ongeluk
     één laag te hoog staat helemaal niets meekrijgen. */
  ok('maar de shot wel', parseScaffoldPath(`${ORDER.ref}/${SLOT_FOLDER.worn}/x.jpg`).shot, 'worn');

  /* Een hernoemde shotmap zonder cijfer hoort nog te werken: iemand haalt dat cijfer
     weg omdat het hem niet bevalt, en dat mag geen levering kosten. */
  ok('een shotmap zonder cijfer werkt ook',
    parseScaffoldPath(`${ORDER.ref}/p2 - Tee/voorkant/x.jpg`).shot, 'front');
  ok('met het product er nog bij',
    parseScaffoldPath(`${ORDER.ref}/p2 - Tee/voorkant/x.jpg`).product, 'p2');

  /* En de gevallen waarin niets zeggen het juiste antwoord is. */
  ok('een bestand los in de wortel geeft geen product',
    parseScaffoldPath(`${ORDER.ref}/losbestand.jpg`).product, null);
  ok('en geen shot', parseScaffoldPath(`${ORDER.ref}/losbestand.jpg`).shot, null);
  ok('een bestand zonder pad ook niet', parseScaffoldPath('foo.jpg').product, null);
  ok(`${LOOSE_FOLDER} wordt als los gemarkeerd`,
    parseScaffoldPath(`${ORDER.ref}/${LOOSE_FOLDER}/variant.jpg`).loose, true);
  ok('en geeft geen shot mee', parseScaffoldPath(`${ORDER.ref}/${LOOSE_FOLDER}/variant.jpg`).shot, null);

  /* Windows-backslashes: sommige browsers en zipprogramma's leveren die. */
  ok('backslashes in het pad werken ook',
    parseScaffoldPath(`${ORDER.ref}\\p3 - Ding\\${SLOT_FOLDER.detail}\\x.jpg`).shot, 'detail');
  ok('met het product erbij',
    parseScaffoldPath(`${ORDER.ref}\\p3 - Ding\\${SLOT_FOLDER.detail}\\x.jpg`).product, 'p3');
  /* Drie cijfers is de bovengrens; vier is geen productsleutel maar een referentie
     of een datum, en die hoort niets te veranderen. */
  ok('p2026 is geen product', parseScaffoldPath('x/p2026 - iets/1 voorkant/f.jpg').product, null);
  ok('p200 wel', parseScaffoldPath('x/p200 - iets/1 voorkant/f.jpg').product, 'p200');
}

console.log('\nhet bronmateriaal van de klant komt niet terug als levering');
{
  ok(`${SOURCE_FOLDER} wordt herkend`, isSourcePath(`${ORDER.ref}/p1 - Hoodie/${SOURCE_FOLDER}/klantfoto.jpg`), true);
  ok('ook diep in het pad', isSourcePath(`a/b/${SOURCE_FOLDER}/c/d.jpg`), true);
  ok('en met backslashes', isSourcePath(`a\\${SOURCE_FOLDER}\\d.jpg`), true);
  ok('een gewone levering niet', isSourcePath(`${ORDER.ref}/p1 - Hoodie/1 voorkant/x.jpg`), false);
  /* Een map die er alleen op LIJKT mag niet worden overgeslagen: dan verdwijnt er
     stil een levering. Het moet het hele segment zijn. */
  ok('_aangeleverde-versie-2 is geen bronmap', isSourcePath('x/_aangeleverde-versie-2/y.jpg'), false);

  /* En de andere kant: de scaffold maakt die map NIET aan. Hij bestaat alleen als
     iemand hem zelf maakt of als hij ooit gevuld wordt uitgeleverd. */
  const namen = scaffoldFiles(ORDER, PRODUCTS, {}).map((f) => f.name);
  ok('de werkmap deelt geen bronmap uit', namen.some((n) => n.includes(SOURCE_FOLDER)), false);
}

console.log('\nde werkbestanden van de werkmap komen niet bij de klant terecht');
{
  /*
   * ── GEVONDEN BIJ HET NASPELEN, NIET BIJ HET BEDENKEN ───────────────────────
   *
   * De terugweg is één keer nagespeeld met de bestandsnamen die er werkelijk uit
   * Magnific en Photoshop komen, en toen viel dit eruit: kiest de studio "de hele
   * map", dan gaat ALLES mee — dus ook LEESMIJ.txt en elke _briefing.txt. Die zouden
   * als kind='delivery' in de database landen en in het portaal van de klant staan:
   * een werkinstructie voor de studio, tussen zijn afgewerkte beelden, in een raster
   * dat er een miniatuur van probeert te maken.
   *
   * Niets viel om, niets gaf een foutmelding. Precies het soort fout dat je pas ziet
   * als een klant zijn levering opent — en dat is de reden dat de simulatie er hoort
   * te zijn en niet alleen de eenheidstest.
   */
  ok('de leesmij wordt overgeslagen', isScaffoldDoc('VIS-1/LEESMIJ.txt'), true);
  ok('de briefing ook', isScaffoldDoc('VIS-1/p1 - Hoodie/_briefing.txt'), true);
  ok('en het licentiebestand', isScaffoldDoc('VIS-1/LICENTIE.txt'), true);
  ok('ook met backslashes', isScaffoldDoc('VIS-1\\p1 - Hoodie\\_briefing.txt'), true);
  /* EN DE ANDERE KANT, want dit is een verbod: een levering die er alleen op lijkt
     mag niet stil verdwijnen. Alleen de exacte naam telt. */
  ok('een gewoon beeld niet', isScaffoldDoc('VIS-1/p1 - Hoodie/1 voorkant/x.png'), false);
  ok('een beeld dat LEESMIJ heet niet', isScaffoldDoc('VIS-1/p1/1 voorkant/LEESMIJ.png'), false);
  ok('en _briefing-2.txt ook niet', isScaffoldDoc('VIS-1/p1/_briefing-2.txt'), false);

  /* De drie namen moeten dezelfde zijn als die de heenweg uitdeelt. Zou scaffoldFiles()
     ze ooit anders noemen, dan komen ze alsnog bij de klant terecht — dus wordt hier
     de UITKOMST van de heenweg door het verbod van de terugweg gehaald. */
  const docs = scaffoldFiles(ORDER, PRODUCTS, {}).filter((f) => !f.dir).map((f) => f.name);
  ok('de heenweg deelt alleen tekstbestanden uit die de terugweg kent',
    docs.every((n) => isScaffoldDoc(n)), true, docs.find((n) => !isScaffoldDoc(n)));
  ok('en er zijn er meer dan twee om te controleren', docs.length > 2, true, String(docs.length));
}

console.log('\nde naam die de klant ziet, gemaakt door de server');
{
  /* HET TWEEDE STUK VAN "HERNOEMEN HELEMAAL WEG". Niet alleen hoeft de studio niets
     te hernoemen — de uitkomst is beter dan wanneer hij het met de hand deed, want
     `upscaled_v3(2).png` is wat de klant anders in zijn portaal had gelezen. */
  ok('nederlands', deliveryFilename('VIS-2608-4471', 'p1', 'front', 'upscaled_v3(2).PNG', 'nl'),
    'VIS-2608-4471-p1-voorkant.png');
  ok('engels', deliveryFilename('VIS-2608-4471', 'p12', 'worn', 'x.webp', 'en'),
    'VIS-2608-4471-p12-on-model.webp');
  /* De extensie komt van het bestand en wordt niet verzonnen: een webp die .jpg gaat
     heten is een bestand dat bij de klant niet opent. */
  ok('een ontbrekende extensie wordt niet verzonnen',
    deliveryFilename('VIS-1', 'p1', 'back', 'naamloos', 'nl'), 'VIS-1-p1-achterkant');
  ok('en de extensie wordt niet geraden bij een rare naam',
    deliveryFilename('VIS-1', 'p1', 'back', 'foto.tar.gz', 'nl'), 'VIS-1-p1-achterkant.gz');
  ok('tekens die niet in een bestandsnaam horen gaan eruit',
    /^[A-Za-z0-9._-]+$/.test(deliveryFilename('VIS 1/2', 'p1', 'front', 'a b.jpg', 'nl')), true);
}

console.log('\nmapnamen waar Verkenner niet over valt');
{
  ok('een schuine streep wordt een streepje', productFolder(2, 'T-shirt / oversized'), 'p2 - T-shirt - oversized');
  ok('een koppelteken blijft een koppelteken', safeSegment('T-shirt'), 'T-shirt');
  ok('de tekens die Windows verbiedt gaan eruit', safeSegment('a:b*c?d"e<f>g|h'), 'a-b-c-d-e-f-g-h');
  ok('een punt aan het eind gaat eraf', safeSegment('Hoodie...'), 'Hoodie');
  ok('een lege naam krijgt een terugval', safeSegment(''), 'zonder naam');
  ok('en een product zonder naam krijgt zijn nummer', productFolder(3, null), 'p3 - product 3');
  ok('een lange naam wordt afgekapt', safeSegment('x'.repeat(200)).length <= 48, true,
    String(safeSegment('x'.repeat(200)).length));
  /* De sleutel staat VOORAAN, dus een afgekapte naam kost nooit de indeling. Dat is
     de reden dat de naam achteraan staat en niet vooraan. */
  ok('en de sleutel overleeft dat afkappen',
    parseScaffoldPath(`${productFolder(7, 'x'.repeat(200))}/1 voorkant/a.jpg`).product, 'p7');
}

console.log('\nde tekstbestanden zeggen wat er gedaan moet worden');
{
  const leesmij = readmeText({ order: ORDER, products: PRODUCTS, origin: 'https://visuails.com' });
  ok('de leesmij noemt de bestelling', leesmij.includes(ORDER.ref), true);
  ok('en de url waar geüpload wordt', leesmij.includes('/admin/orders/7/files'), true);
  ok('en zegt dat de bestandsnaam niet uitmaakt', /bestandsnaam maakt NIET uit/.test(leesmij), true);
  ok('en waarschuwt voor het wijzigen van de sleutel', /mapnamen wijzigen/.test(leesmij), true);
  ok('en dat uploaden geen melden is', /Uploaden is niet melden/.test(leesmij), true);
  /* CRLF: dit bestand wordt op Windows in Kladblok geopend, en een leesmij die als
     één lange regel opent is een leesmij die niet gelezen wordt. */
  ok('met windows-regeleindes', leesmij.includes('\r\n'), true);
  ok('en zonder losse LF ertussen', /[^\r]\n/.test(leesmij), false);

  const briefing = briefingText({ order: ORDER, product: { ...PRODUCTS[0], folder: 'p1 - Zwarte hoodie' } });
  ok('de briefing noemt het materiaal', briefing.includes('zware fleece'), true);
  ok('en de kleur', briefing.includes('#191510'), true);
  ok('en de extra foto met zijn notitie', briefing.includes('detail van het label'), true);
  ok('en de notitie bij de hele bestelling', briefing.includes('Alles mat houden'), true);
  /* Een product waar de klant niets heeft ingevuld moet dat ZEGGEN. Een leeg blok
     leest als "ik heb het niet overgenomen" en dan ga je in het adminscherm kijken. */
  const leeg = briefingText({ order: { ref: 'X' }, product: { index: 9, folder: 'p9 - x', extras: [] } });
  ok('een leeg product zegt dat de klant niets opgaf', /geen materiaal, kleur of/.test(leeg), true);
}

console.log('\nhet licentiebestand zegt wat de klant mag, in de taal van de bestelling');
{
  const nl = licenceText({ order: ORDER, lang: 'nl' });
  const en = licenceText({ order: ORDER, lang: 'en' });

  /* DE VIJF BEVOEGDHEDEN. Art. 2 lid 3 Auteurswet leest een licentie beperkt: wat er
     niet staat, is niet gegeven. Dit bestand belandt bij het bureau of de marktplaats
     van de klant, en dat is precies de lezer die op deze lijst kijkt. Zie §8 van de
     voorwaarden — dat is de bron, dit is de samenvatting. */
  for (const [taal, tekst, woorden] of [
    ['nl', nl, ['verveelvoudigen', 'bewerken', 'commercieel', 'sublicentieren', 'meenemen']],
    ['en', en, ['reproduce', 'edit and adapt', 'commercially', 'sublicense', 'take them with you']],
  ]) {
    for (const w of woorden) ok(`${taal}: de licentie noemt "${w}"`, tekst.includes(w), true);
    ok(`${taal}: exclusief en eeuwigdurend`, /exclusieve, eeuwigdurende|exclusive, perpetual/.test(tekst), true);
    ok(`${taal}: pas bij volledige betaling`, /volledige betaling|full payment/.test(tekst), true);
    ok(`${taal}: de AI-vermelding staat erbij`, /AI Act/.test(tekst), true);
    ok(`${taal}: met de pagina waar de zin staat`, /ai-act/.test(tekst), true);
    ok(`${taal}: het portfoliovoorbehoud staat erbij`, /portfolio/.test(tekst), true);
    ok(`${taal}: en dat het intrekbaar is`, /bezwaar|object/.test(tekst), true);
    ok(`${taal}: met de voorwaarden als bron`, /terms/.test(tekst), true);
    ok(`${taal}: de bestelling staat erop`, tekst.includes(ORDER.ref), true);
    ok(`${taal}: en het merk`, tekst.includes('Atelier Noord'), true);
  }
  ok('de nederlandse tekst is nederlands', /gebruiksrechten/.test(nl), true);
  ok('de engelse is engels', /usage rights/.test(en), true);
  /* Een onbekende taal valt op Engels en niet op leeg: een licentiebestand zonder
     tekst is erger dan een in de verkeerde taal. */
  ok('een onbekende taal valt op nederlands (de standaard)', licenceText({ order: ORDER, lang: 'kl' }), nl);
}

console.log('\nde admin-kant is bedraad');
{
  const ADMIN = read('src/lib/admin.js');
  const code = ADMIN.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');

  ok('er is een route voor de werkmap', /\/admin\\\/orders\\\/\(\\d\+\)\\\/scaffold\$/.test(code)
    || /scaffold\$/.test(code), true);
  ok('en een handler', /async function serveScaffold\(/.test(code), true);
  ok('die de zip streamt', /zipStream\(files\)/.test(code), true);
  ok('met de juiste naam erop', /scaffoldFilename\(order\.ref\)/.test(code), true);

  /* DE TERUGWEG. De rangorde is een rangorde: het vakje van het bord gaat voor het
     pad, en het pad gaat voor de gok uit de bestandsnaam. Zou de gok voorop staan,
     dan overschrijft een toevallig getal in een exportnaam de structuur die wij zelf
     hebben uitgedeeld. */
  ok('de upload leest het pad', /parseScaffoldPath\(relPath\)/.test(code), true);
  ok('met het vakje van het bord vóór het pad',
    /slotProduct \|\| fromPath\.product \|\| guessed\.product/.test(code), true);
  ok('en hetzelfde voor de shot',
    /slotShot \|\| fromPath\.shot \|\| guessed\.shot/.test(code), true);
  ok('het bronmateriaal wordt overgeslagen', /isSourcePath\(relPath\)/.test(code), true);
  ok('en dat wordt geteld en gemeld', /skippedSource/.test(code), true);
  ok('de eigen werkbestanden worden ook overgeslagen', /isScaffoldDoc\(relPath\)/.test(code), true);
  ok('en apart geteld', /skippedOwn/.test(code), true);
  ok('de klantnaam wordt door de server gemaakt', /deliveryFilename\(order\.ref/.test(code), true);
  ok('en die naam gaat de rij in, niet de ruwe naam',
    /\.bind\(orderId, key, shown,/.test(code), true);

  /* HET MAPVELD. `webkitdirectory` is het hele mechanisme van de terugweg: zonder dat
     attribuut post de browser losse bestanden zonder pad, en dan is er niets om te
     lezen. Het staat in de markup en niet in script, want /admin laadt geen script. */
  ok('er is een veld dat een hele map post', /webkitdirectory/.test(ADMIN), true);
  ok('met de directory-terugval erbij', /webkitdirectory directory multiple/.test(ADMIN), true);
  ok('en een knop om de mappen te downloaden', /\/scaffold">Mappen downloaden/.test(ADMIN), true);
  /* Het losse veld blijft bestaan: een browser die webkitdirectory niet kent, en een
     enkel bestand dat je snel wil vervangen. */
  ok('het losse uploadveld blijft ook staan',
    (ADMIN.match(/name="files" multiple required/g) || []).length >= 1, true);
}

console.log(`\n${pass}/${pass + fail} geslaagd`);
if (fail) process.exit(1);
