/*
 * ═══════════════════════════════════════════════════════════════════════════════
 * DE BEELDVERHOUDING — VAN HET FORMULIER TOT DE WERKMAP
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Lucas, 13 augustus 2026, in drie berichten die samen één functie beschrijven:
 *
 *   *"wat ik verder nog mis bij bijvoorbeeld catalog orderflow is dat de klant
 *   per product het afbeelding formaat kan aangeven. Hoewel ik denk dat bij
 *   catalog het beter is om 1 te kiezen [...] over de gehele batch. Bij lifestyle
 *   moeten deze wel per foto ingesteld kunnen worden omdat je soms een simpele
 *   post en soms een banner lifestyle foto wil."*
 *
 *   *"Formaat kan ook toegevoegd worden aan brand kit in visuails studio om het
 *   proces te versnellen, voornamelijk handig voor catalog omdat dit bijna altijd
 *   zelfde formaat moet krijgen."*
 *
 *   *"Ze missen ook nog in de orderflow, ik kan ze niet kiezen bij het maken van
 *   een order."*
 *
 * Dat laatste bericht is de reden dat dit bestand bestaat. De verhouding had een
 * datalaag, een kolom en een plek in de brand kit — en de enige plek waar een
 * bestelling ontstaat, had hem niet. Alles was gebouwd behalve het stuk waar de
 * klant bij kan. Deze toetsen lopen daarom de hele KETEN af en niet één laag:
 *
 *   1 · de data — welke verhouding hoort bij welke dienst, en wat wint waar
 *   2 · het formulier — de vraag staat er, in beide talen, op elke stroom
 *   3 · het schakelen — 16:9 is er bij lifestyle en niet bij catalog
 *   4 · de server — een verzonnen waarde uit een formulier komt er niet door
 *   5 · de studio — wat gekozen is, staat in de werkmap
 *
 * ── WAT HIER NIET GETOETST WORDT, EN WAAROM ────────────────────────────────
 *
 * Of de vormen ook ZICHTBAAR anders zijn. Dat is een browservraag: het antwoord
 * hangt aan een intrinsieke verhouding uit een viewBox, en een regexp op de
 * broncode kan er niets zinnigs over zeggen. Gemeten met een echte Chromium op
 * 13 augustus 2026 — 64×64, 52×64, 49×64 en 112×64 in de brand kit; 72, 58, 55 en
 * 126 breed op het bestelformulier — en de reden dat die meting nodig was, staat
 * in ratioViewBox(): met een inline `style` stond elke vorm als een streepje van
 * één pixel, want de CSP van /account weigert style-attributen. Wat een regexp
 * WEL kan vasthouden, is dat die fout niet terugkomt, en dat staat hieronder.
 */
import { readFileSync } from 'node:fs';
import {
  CATALOG_RATIOS, LIFESTYLE_RATIOS, DEFAULT_RATIO_ID,
  ratiosPerImage, ratiosFor, ratioById, effectiveRatio,
  ratioField, parseRatioField, ratioViewBox,
} from '../src/data/ratios.js';

let pass = 0;
let fail = 0;
function ok(name, got, want = true, shown) {
  const good = got === want;
  if (good) pass++; else fail++;
  console.log(`${good ? ' ok  ' : ' FAIL'} ${name.padEnd(62)}${good ? '' : `verwacht ${JSON.stringify(want)} kreeg ${JSON.stringify(shown ?? got)}`}`);
}
const read = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8');

/*
 * ── ALLEEN DE CODE, NIET DE UITLEG ──────────────────────────────────────────
 *
 * Vierde keer deze week dat een regex op de eigen verantwoording aansloeg. De kop
 * van ratioShape() in account.js legt uit waarom er GEEN `style="aspect-ratio…"`
 * meer staat — en zet die string dus letterlijk in het bestand. Een toets die
 * daarop rood gaat, duwt de uitleg eruit, en de uitleg is de helft van de code.
 *
 * Dezelfde helper en dezelfde reden als in tests/video-examples.test.mjs.
 */
const zonderUitleg = (src) => src
  .replace(/\{\/\*[\s\S]*?\*\/\}/g, '')   // {/* … */} in de markup
  .replace(/\/\*[\s\S]*?\*\//g, '')         // /* … */ in de frontmatter en in css
  .replace(/(^|[^:])\/\/.*$/gm, '$1');      // // … in js

console.log('de data: welke verhouding hoort bij welke dienst');
{
  ok('catalog heeft er drie', CATALOG_RATIOS.length, 3);
  ok('lifestyle heeft die drie plus de brede', LIFESTYLE_RATIOS.length, 4);
  /* DE BREDE IS HET VERSCHIL, en het is geen smaakverschil: een catalogset gaat
     in een grid, en één breed beeld ertussen is precies het scheve grid waar een
     merk mee bij ons komt. Zie de kop van src/data/ratios.js. */
  ok('en 16:9 hoort niet bij catalog', !!ratioById('wide', 'catalog'), false);
  ok('maar wel bij lifestyle', !!ratioById('wide', 'lifestyle'), true);
  ok('de standaard is het vierkant', DEFAULT_RATIO_ID, 'square');
  ok('en het vierkant staat vooraan', CATALOG_RATIOS[0].id, 'square');

  /* Elke verhouding zegt WAARVOOR hij is, in beide talen. Lucas: *"Wellicht bij
     elk formaat aangeven waarvoor het bedoelt is."* Een tegel met een lege
     regel is een tegel die de vraag niet beantwoordt. */
  for (const r of LIFESTYLE_RATIOS) {
    ok(`${r.label}: korte gebruiksregel in beide talen`,
      !!(r.use?.en?.trim() && r.use?.nl?.trim()), true);
    ok(`${r.label}: en de lange uitleg ook`,
      !!(r.what?.en?.trim() && r.what?.nl?.trim()), true);
    /* De korte regel moet op een tegel van 150px passen. Boven de vijftig tekens
       wordt hij vier regels en dan leest niemand hem meer. */
    ok(`${r.label}: en die is kort genoeg voor een tegel`,
      r.use.en.length <= 50 && r.use.nl.length <= 50, true,
      `en ${r.use.en.length}, nl ${r.use.nl.length}`);
  }
}

console.log('\nper beeld of per bestelling — en `drop` telt mee');
{
  ok('catalog kiest één verhouding voor de hele bestelling', ratiosPerImage('catalog'), false);
  ok('lifestyle mag per beeld', ratiosPerImage('lifestyle'), true);
  ok('complete ook, want die heeft een lifestyle-helft', ratiosPerImage('complete'), true);
  /* `drop` is wat /start/complete post. Dezelfde val als bij tierFor() en
     PAYABLE_SERVICES — daar kostte hij een bestelling van € 2.359,50. */
  ok("en 'drop' is complete op de draad", ratiosPerImage('drop'), true);
  ok('video kent de vraag niet per beeld', ratiosPerImage('video'), false);
  ok('ratiosFor(catalog) is de korte lijst', ratiosFor('catalog').length, 3);
  ok('ratiosFor(drop) is de lange', ratiosFor('drop').length, 4);
}

console.log('\nwat wint: de keuze bij het beeld, dan de bestelling, dan de standaard');
{
  ok('een keuze bij het beeld wint', effectiveRatio('wide', 'square', 'lifestyle').id, 'wide');
  ok('geen keuze bij het beeld volgt de bestelling', effectiveRatio('', 'portrait45', 'lifestyle').id, 'portrait45');
  ok('geen van beide valt op de standaard', effectiveRatio('', '', 'lifestyle').id, 'square');
  /* EEN ONBEKENDE WAARDE LEKT NIET DOOR. Dit getal komt uit een formulier en gaat
     naar de productie; alles wat de dienst niet kent, valt terug. */
  ok('onzin bij het beeld valt terug op de bestelling', effectiveRatio('vierkantje', 'portrait34', 'catalog').id, 'portrait34');
  ok('en 16:9 op een catalogbestelling telt als onzin', effectiveRatio('wide', '', 'catalog').id, 'square');
  ok('maar niet op lifestyle', effectiveRatio('wide', '', 'lifestyle').id, 'wide');
}

console.log('\nde veldnaam, heen en terug');
{
  ok('ratioField schrijft ratio_p3_2', ratioField('p3', 2), 'ratio_p3_2');
  ok('en parseRatioField leest hem terug', JSON.stringify(parseRatioField('ratio_p3_2')), '{"product":"p3","image":2}');
  ok('een gewone productnaam is geen verhouding', parseRatioField('product_p3'), null);
  ok('en onzin ook niet', parseRatioField('ratio_x_1'), null);
}

console.log('\nde vorm komt uit een viewBox en niet uit een style-attribuut');
{
  /* ── DE FOUT DIE HIER TWEE KEER IS GEMAAKT ────────────────────────────────
     /account draait op `style-src 'self'`, en `style-src-attr` valt daarop terug —
     dus een style-ATTRIBUUT wordt geweigerd. Op 7 augustus 2026 maakte dat de
     kleurvakjes doorzichtig (zie swatch() in account.js) en op 13 augustus de
     vormen één pixel breed. Deze toets is de afspraak die dat afsluit. */
  ok('ratioViewBox rekent 4x5 om', ratioViewBox({ ratio: '4x5' }), '0 0 4 5');
  ok('en 16x9', ratioViewBox({ ratio: '16x9' }), '0 0 16 9');
  /* Terugvallen op een vierkant en niet op niets: een svg zonder viewBox heeft
     geen intrinsieke verhouding, en dan staat het streepje er alsnog. */
  ok('onzin wordt een vierkant en geen lege string', ratioViewBox({ ratio: 'kapot' }), '0 0 1 1');
  ok('en niets ook', ratioViewBox(null), '0 0 1 1');

  const account = read('src/lib/account.js');
  ok('de brand kit tekent de vorm met een viewBox', /viewBox="\$\{safe\}"/.test(account), true);
  ok('en nergens meer met aspect-ratio in een style-attribuut',
    /style="aspect-ratio/.test(zonderUitleg(account)), false);
  const css = zonderUitleg(read('public/account.css'));
  ok('het stylesheet zet de hoogte en laat de breedte volgen',
    /\.bk-ratio-box \{[^}]*height: 64px; width: auto/.test(css), true);
  /* `width: 100%` zou de berekende breedte overschrijven en elke vorm even breed
     maken — dan toont de rij niets en is de bug terug in een andere vorm. */
  ok('en zet er geen breedte overheen',
    /\.bk-ratio-box \{[^}]*(^|[^-])width: 100%/.test(css), false);
}

console.log('\nhet bestelformulier stelt de vraag');
{
  const picker = read('src/components/order/RatioPicker.astro');
  ok('de kiezer post name="ratio"', /name="ratio"/.test(picker), true);
  ok('en de waarden zijn de ids uit ratios.js', /value=\{r\.id\}/.test(picker), true);
  ok('met de vorm als viewBox', /viewBox=\{r\.viewBox\}/.test(picker), true);
  ok('en de gebruiksregel eronder', /\{r\.use\}/.test(picker), true);
  /* Geen handgetypte lijst. Een verhouding die aan ratios.js wordt toegevoegd,
     hoort op het formulier te verschijnen zonder dat iemand hier iets doet. */
  ok('de tegels komen uit LIFESTYLE_RATIOS', /LIFESTYLE_RATIOS\.map/.test(picker), true);
  /* Er is er één voorgeselecteerd, en dat is hier de juiste uitzondering: een
     bestelling zonder verhouding bestaat niet. Zie de kop van het bestand. */
  ok('het vierkant staat voor', /checked=\{r\.id === DEFAULT_RATIO_ID\}/.test(picker), true);

  const flow = read('src/components/order/OrderFlow.astro');
  ok('de stroom rendert de kiezer', /<RatioPicker lang=\{lang\} \/>/.test(flow), true);
  /* NA de slot: de vraag die de dienst definieert staat boven de vraag die hem
     opmaakt. Zelfde volgorde als in de brand kit. */
  ok('  ná het blok dat per dienst verschilt',
    flow.indexOf('<slot />') < flow.indexOf('<RatioPicker'), true);
  ok('en het bevestigingsscherm heeft er een regel voor', /'sum\.ratio'/.test(flow), true);
  ok('in beide talen', (flow.match(/ratio: '(Image shape|Beeldverhouding)'/g) || []).length, 2);
}

console.log('\nen hij schakelt mee met de soort');
{
  const pl = read('src/scripts/pipeline.js');
  ok('syncRatio verbergt wat deze dienst niet kent',
    /function syncRatio\(kind\)[\s\S]{0,600}tile\.hidden = !on;/.test(pl), true);
  /* VERBERGEN IS NIET GENOEG. Een verborgen radio post gewoon door; zonder deze
     regel zou een catalogbestelling een verhouding meesturen die catalog niet
     kent, en dan corrigeert de server stilletjes iets wat de klant niet koos. */
  ok('  en vinkt hem uit in plaats van hem te laten posten',
    /if \(!on && input\.checked\) \{ input\.checked = false; bumped = true; \}/.test(pl), true);
  ok('  waarna er altijd één aangevinkt staat',
    /if \(bumped \|\| !q\('input\[name="ratio"\]:checked'\)\)/.test(pl), true);
  ok('de kaartjes krijgen de gekozen verhouding in hun eerste optie',
    /function ratioSameText\(\)/.test(pl), true);
  /* De brand kit is de helft die de vraag SNELLER maakt. Zonder deze regel staat
     het antwoord in /account en begint elke bestelling toch op het vierkant. */
  ok('de brand kit vult hem vooruit in', /const wantRatio = String\(lock\.ratio \|\| ''\)/.test(pl), true);
  ok('  maar overschrijft geen keuze van de klant',
    /wantRatio[\s\S]{0,200}if \(!current \|\| current\.defaultChecked\)/.test(pl), true);
  ok('  en zet geen verhouding aan die deze dienst niet kent',
    /r\.value === wantRatio && !r\.disabled/.test(pl), true);

  /* De afwijking per beeld bestaat alleen waar hij bestaat. `perImage` is een
     AANTAL en geen vlag, want bij complete mogen alleen de lifestyle-beelden
     afwijken en de catalogbeelden niet. */
  ok('buildRatios geeft null als de stroom het niet per beeld vraagt',
    /const perImage = Number\(\(cfg\.ratio && cfg\.ratio\.perImage\) \|\| 0\);\s*\n\s*if \(!perImage\) return null;/.test(pl), true);
  ok('en het veld heet ratio_p3_2', /sel\.name = `ratio_\$\{card\.key\}_\$\{i\}`;/.test(pl), true);
  /* Niets hiervan mag Doorgaan tegenhouden: wie er niet naar kijkt, krijgt de
     verhouding die hij bovenaan koos, en dat is een compleet antwoord. */
  ok('en niets ervan is verplicht',
    /function buildRatios\(card\)[\s\S]{0,2600}data-pl-req/.test(pl), false);
}

console.log('\nde server laat er geen verzonnen waarde door');
{
  const api = read('functions/api/order.js');
  ok('vetAnswer controleert ratio', /if \(key === 'ratio' \|\| parseRatioField\(key\)\)/.test(api), true);
  ok('  tegen de lijst uit ratios.js', /RATIO_IDS\.has\(v\) \? v : ''/.test(api), true);
  ok('  en die lijst is niet overgetypt',
    /const RATIO_IDS = new Set\(LIFESTYLE_RATIOS\.map\(\(r\) => r\.id\)\);/.test(api), true);
  /* Niet in TOP_FIELDS: het is een antwoord uit de briefing en hoort in
     details_json, naast `product_p3` waar het op de sleutel `p3` aan vastzit. */
  const top = api.slice(api.indexOf('const TOP_FIELDS'), api.indexOf('export async function onRequestPost'));
  ok("'ratio' staat niet in TOP_FIELDS", /'ratio'/.test(top), false);
}

console.log('\nen de studio leest het in de werkmap');
{
  const admin = read('src/lib/admin.js');
  ok('de werkmap lost de verhouding op met de dienst erbij',
    /ratioById\(tekst\(details\.ratio\) \|\| '', order\.service\)/.test(admin), true);
  ok('  en de afwijkingen per beeld ook', /ratioById\(tekst\(details\[ratioField\(key, k\)\]\)/.test(admin), true);
  /* Alleen ECHTE afwijkingen. Drie regels die hetzelfde zeggen als de regel
     erboven, zijn drie regels die niemand meer leest. */
  ok('  maar alleen wat echt afwijkt', /gezet\.id !== \(orderRatio && orderRatio\.id\)/.test(admin), true);
  /* Het LABEL en niet het id: dit is het bestand dat een mens leest voordat hij
     begint, en 'portrait45' is een woord dat je moet opzoeken. */
  ok('  als label en niet als id', /orderRatio \? orderRatio\.label : null/.test(admin), true);

  const scaffold = read('src/lib/scaffold.js');
  ok('de briefing drukt de verhouding af', /Verhouding  \$\{product\.ratio\}/.test(scaffold), true);
  ok('  en de afwijking per beeldnummer', /beeld \$\{i \+ 1\}/.test(scaffold), true);
}

console.log('\nde brand kit onthoudt hem, en alleen wat mag');
{
  const account = read('src/lib/account.js');
  ok('de kolom wordt gevalideerd tegen de lijst van die dienst',
    /const ratio = ratioById\(ratioRaw, style\) \? ratioRaw : null;/.test(account), true);
  ok('  en meegeschreven in de rij', /ratio           = excluded\.ratio,/.test(account), true);
  /* Een database zonder de kolom mag het scherm niet omver halen — migratie 0028
     draait niet op elke omgeving tegelijk. Zelfde afspraak als bij `channels`. */
  ok('  met een terugval als migratie 0028 nog niet draait',
    /channels\|ratio/.test(account), true);
  ok('en /account/me geeft hem terug', /ratio: ratioById\(l\.ratio \|\| '', l\.style\)/.test(account), true);

  const sql = read('migrations/0028-vaste-verhouding.sql');
  ok('de migratie voegt één kolom toe',
    /ALTER TABLE customer_style_locks ADD COLUMN ratio TEXT;/.test(sql), true);
  const schema = read('schema.sql');
  ok('en schema.sql kent hem ook', /ratio/.test(schema), true);
}

console.log(`\n${pass}/${pass + fail} geslaagd`);
if (fail) process.exit(1);
