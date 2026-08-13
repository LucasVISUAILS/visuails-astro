/*
 * ═══════════════════════════════════════════════════════════════════════════════
 * DE AANVRAAGKANT — HET EINDPUNT DAT NIET BESTOND, EN DRIE BELOFTES DIE NIET KLOPTEN
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Blok 6 van Lucas' lijst, 13 augustus 2026. Vier dingen die niets met elkaar te
 * maken lijken te hebben en één eigenschap delen: ze gaan allemaal STIL fout. Er
 * valt niets om, er komt geen foutmelding, en het verschil tussen goed en fout is
 * alleen te zien door iemand die weet wat er had moeten gebeuren.
 *
 * ── 1 · /api/order-status BESTOND NIET ──────────────────────────────────────
 *
 * Op 11 augustus is de annulering van een tweede proefvisual gebouwd: de webhook
 * zet `cancel_reason = 'sample-duplicate'`, de bedankpagina heeft het blok, en
 * interactions.js vraagt drie keer of het open moet. Het eindpunt is nooit
 * geschreven. functions/api/ had capacity, order, step, upload en webhook.
 *
 * En het VIEL NIET OP, omdat het niet kón opvallen: checkCancelled() faalt met
 * opzet stil — een gewone besteller mag nooit een annuleringsmelding zien omdat
 * er iets omvalt. Dus gaf elke fetch een 404, ving de `.catch` die op, en
 * gebeurde er niets. In het gewone geval hoort er ook niets te gebeuren. Dit is
 * de reden dat de eerste sectie hieronder de route AANROEPT in plaats van te
 * kijken of het bestand er staat: "het werkt" was hier niet te onderscheiden van
 * "het bestaat niet".
 *
 * ── 2 · HET AANTAL CLIPS POSTTE IN `products` ───────────────────────────────
 *
 * Op 12 augustus is `tierFor()` gerepareerd zodat tien clips geen gereserveerd
 * leveringsvenster meer beloven. Dat was één lezer van dat getal, niet de
 * oorzaak. `orders.product_count` betekent overal in dit systeem het aantal
 * producten dat door de fotopijplijn gaat, en er lezen er ongeveer twintig mee.
 * claimUpgradePrompt() telt het over een kwartaal op en zet bij twaalf een
 * verkoopregel in een mail; het klantportaal en het adminoverzicht schrijven het
 * letterlijk als "12 producten" naast een aanvraag zonder één product erin.
 *
 * ── 3 · /video BELOOFDE EEN VASTGEZETTE LEVERDATUM ──────────────────────────
 *
 * Drie plekken op de videopagina zeiden dat je vanaf tien een leverdatum krijgt
 * die niet meer wijkt. tierFor() geeft voor video ALTIJD 'unattended', want video
 * staat niet op de prijsladder — een clipaanvraag kan dat venster dus niet
 * krijgen, hoe groot hij ook is. Niet "krijgt het per ongeluk niet": kan niet.
 *
 * ── 4 · /start/complete VROEG NIET OM EEN LOOK ──────────────────────────────
 *
 * De grootste van de twee fotodiensten — catalog én lifestyle, zeven beelden per
 * product, de hoogste prijs — rendeerde alleen Step1Options. Dat is wat
 * /start/catalog doet. De lifestyle-helft heeft een vraag die de catalog-helft
 * niet heeft, en die werd aan niemand gesteld: precies het gat dat StylePicker
 * volgens zijn eigen kop moest dichten.
 */
import { readFileSync } from 'node:fs';
import { d1, verseDb } from './lib/d1sqlite.mjs';
import { buildStaat } from './lib/build.mjs';
import { onRequestGet } from '../functions/api/order-status.js';
import { tierFor } from '../src/data/pricing.js';

let pass = 0;
let fail = 0;
function ok(name, got, want = true, shown) {
  const good = got === want;
  if (good) pass++; else fail++;
  console.log(`${good ? ' ok  ' : ' FAIL'} ${String(name).padEnd(64)}${good ? '' : `verwacht ${JSON.stringify(want)} kreeg ${JSON.stringify(shown ?? got)}`}`);
}
const read = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8');

console.log('\nVISUAILS — de aanvraagkant\n');

/* ════════════════════════════════════════════════════════════════════════════
   1 · HET STATUSEINDPUNT, AANGEROEPEN
   ════════════════════════════════════════════════════════════════════════════ */

const { db, mislukt } = verseDb(new URL('../schema.sql', import.meta.url));
ok('schema.sql draait zonder mislukte statements', mislukt.length, 0, mislukt.slice(0, 3));

const env = { DB: d1(db) };
const req = (ref) => new Request(`https://visuails.com/api/order-status?ref=${encodeURIComponent(ref)}`);
async function vraag(ref) {
  const res = await onRequestGet({ request: req(ref), env, waitUntil: () => {} });
  return { res, body: await res.json() };
}

db.exec(`INSERT INTO customers (id, email) VALUES (700, 'aanvraag@voorbeeld.nl')`);
db.exec(`INSERT INTO orders (id, ref, customer_id, service, email, status)
         VALUES (700, 'VIS-AAAA-001', 700, 'test-sample', 'aanvraag@voorbeeld.nl', 'received')`);
db.exec(`INSERT INTO orders (id, ref, customer_id, service, email, status, cancel_reason)
         VALUES (701, 'VIS-AAAA-002', 700, 'test-sample', 'aanvraag@voorbeeld.nl', 'cancelled', 'sample-duplicate')`);
/* De met de hand geannuleerde bestelling, met precies het soort reden dat Lucas
   in het adminpaneel typt. Die tekst mag het eindpunt niet uit. */
const INTERNE_NOTITIE = 'klant belt niet terug, vermoeden van doorverkoop';
db.exec(`INSERT INTO orders (id, ref, customer_id, service, email, status, cancel_reason)
         VALUES (702, 'VIS-AAAA-003', 700, 'catalog', 'aanvraag@voorbeeld.nl', 'cancelled', ?)`
  .replace('?', `'${INTERNE_NOTITIE}'`));

console.log('het eindpunt antwoordt, en zegt precies twee dingen');
{
  const gewoon = await vraag('VIS-AAAA-001');
  ok('een gewone bestelling geeft 200', gewoon.res.status, 200);
  ok('  en cancelled: false', gewoon.body.cancelled, false);
  ok('  en kind: null', gewoon.body.kind, null);

  const dubbel = await vraag('VIS-AAAA-002');
  ok('een tweede proefvisual geeft cancelled: true', dubbel.body.cancelled, true);
  ok('  met het machinewoord erbij', dubbel.body.kind, 'sample-duplicate');

  /* Het antwoord is precies twee sleutels. Niet omdat meer sleutels lelijk zijn,
     maar omdat elke extra sleutel iets over deze bestelling vertelt aan wie de
     referentie heeft — en een referentie is geen geheim. */
  ok('en het antwoord heeft niets anders in zich',
    Object.keys(dubbel.body).sort().join(','), 'cancelled,kind');
}

console.log('\nde met de hand getypte reden blijft binnen');
{
  const hand = await vraag('VIS-AAAA-003');
  ok('een handmatige annulering geeft wel cancelled: true', hand.body.cancelled, true);
  ok('  maar kind blijft null', hand.body.kind, null);
  /* De belangrijkste regel van dit bestand. Als deze ooit rood wordt, staat er
     een interne notitie in een publiek antwoord. */
  const alles = JSON.stringify(hand.body);
  ok('  en de notitie staat NERGENS in het antwoord', alles.includes('doorverkoop'), false, alles);
  ok('  ook niet een stuk ervan', /belt niet terug/.test(alles), false, alles);
}

console.log('\neen onbekende referentie is niet te onderscheiden van een niet-geannuleerde');
{
  const weg = await vraag('VIS-ZZZZ-999');
  ok('geen 404 maar 200', weg.res.status, 200);
  const gewoon = await vraag('VIS-AAAA-001');
  ok('en letterlijk hetzelfde antwoord als een bestaande, niet-geannuleerde bestelling',
    JSON.stringify(weg.body), JSON.stringify(gewoon.body));
}

console.log('\nvormfouten raken de database niet, en de cache is uit');
{
  for (const rommel of ['', 'x', 'VIS', 'VIS-', 'DROP TABLE orders', 'VIS-' + 'A'.repeat(40)]) {
    const res = await onRequestGet({ request: req(rommel), env, waitUntil: () => {} });
    const body = await res.json();
    ok(`"${rommel.slice(0, 22)}" geeft rustig cancelled: false`, body.cancelled, false);
  }

  /* ── WAAROM DIT GEEN DETAIL IS ─────────────────────────────────────────────
     checkCancelled() vraagt het drie keer, op 0, 2 en 4 seconden, JUIST om een
     ander antwoord te kunnen krijgen dan de eerste keer: Mollie stuurt de
     bezoeker terug én roept de webhook aan, en wie eerst aankomt staat niet
     vast. Een cache van zestig seconden — zoals /api/capacity die met opzet
     heeft — maakt poging twee en drie letterlijk hetzelfde antwoord, en dan is
     de hele wedloop-afhandeling een lus die niets doet. */
  const { res } = await vraag('VIS-AAAA-001');
  ok('cache-control zegt no-store', /no-store/.test(res.headers.get('cache-control') || ''), true,
    res.headers.get('cache-control'));
  ok('en niet public/max-age zoals de capaciteitskaart',
    /max-age/.test(res.headers.get('cache-control') || ''), false);
}

console.log('\nzonder databasebinding wordt er niets beweerd');
{
  const res = await onRequestGet({ request: req('VIS-AAAA-001'), env: {}, waitUntil: () => {} });
  /* 503 en niet 200-met-false. Beide laten de bezoeker niets zien — dat regelt
     checkCancelled() zelf — maar het verschil tussen "niet geannuleerd" en "ik
     kon niet kijken" moet blijven bestaan, want het staat in de logs. Zelfde
     afweging als /api/capacity bij een onbereikbare kalender. */
  ok('een ontbrekende DB geeft 503', res.status, 503);
}

console.log('\nde bedankpagina en het eindpunt sluiten op elkaar aan');
{
  const inter = read('src/scripts/interactions.js');
  ok('interactions.js vraagt /api/order-status', inter.includes('/api/order-status'), true);
  /* Het blok op de pagina zegt letterlijk dat er al een proefvisual naar dit
     bedrijf ging en dat de euro terugkomt. Bij een handmatige annulering is dat
     onwaar, dus mag `cancelled` alleen niet genoeg zijn. */
  ok('en opent het blok alleen op het machinewoord',
    /d\.kind !== 'sample-duplicate'/.test(inter), true);

  const ty = read('src/pages/thank-you.astro');
  ok('het blok staat op de Engelse bedankpagina', ty.includes('data-ty-cancelled'), true);
  ok('en de rest van de pagina kan weg', ty.includes('ty-hide-when-cancelled'), true);
  const tyNl = read('src/pages/nl/thank-you.astro');
  ok('idem op de Nederlandse', tyNl.includes('data-ty-cancelled'), true);

  /* De webhook is de enige die dit woord zet. Verandert het daar, dan moet het
     hier meeveranderen, en dan zegt deze regel dat. */
  const hook = read('functions/api/webhook/mollie.js');
  ok("de webhook zet 'sample-duplicate' en niets anders",
    hook.includes("cancel_reason = 'sample-duplicate'"), true);
}

/* ════════════════════════════════════════════════════════════════════════════
   2 · HET AANTAL CLIPS IS GEEN AANTAL PRODUCTEN
   ════════════════════════════════════════════════════════════════════════════ */

console.log('\nhet aantal clips heeft zijn eigen veld');
{
  const hold = read('src/components/order/HoldingPage.astro');
  ok('de keuzelijst post name="clips"', /id="h-clips"[^>]*name="clips"/.test(hold), true);
  /* De kern van de reparatie: geen enkel BESTURINGSELEMENT op deze pagina post
     nog in `products`. Gericht op de tag en niet op de tekst, want de noot bij
     het veld citeert de oude naam met opzet — die uitleg is de helft van de
     reparatie, en een test die hem wegpest maakt de code slechter. */
  ok('geen enkel veld post nog in products',
    /<(?:select|input|textarea)[^>]*\sname="products"/.test(hold), false);

  /* En het mag geen TOP_FIELD worden, want dan verdwijnt het uit details_json —
     en daarmee uit de studiomail, die de details generiek uitprint via
     detailRows(). Een kolom zou hier dus MINDER opleveren dan een JSON-veld. */
  const orderApi = read('functions/api/order.js');
  const topBlok = orderApi.slice(orderApi.indexOf('const TOP_FIELDS'), orderApi.indexOf('export async function onRequestPost'));
  ok("'clips' staat niet in TOP_FIELDS", /'clips'/.test(topBlok), false);
  ok("en 'products' staat er nog wel in (voor de echte bestelstroom)", /'products'/.test(topBlok), true);

  /* Waar Lucas het aantal moet kunnen lezen zonder de mail erbij te zoeken. */
  const admin = read('src/lib/admin.js');
  ok('de adminpagina van een bestelling leest details_json',
    /SELECT id, ref, service, status, brand, name, email, lang, product_count,\s*\n\s*details_json/.test(admin), true);
  ok('  ook in de smalle variant (die kolom bestaat sinds migratie 1)',
    /details_json, delivery_mailed_at/.test(admin), true);
  ok('  en zet het aantal clips op de regel bij de dienst', /\$\{esc\(String\(d\.clips\)\)\} clips/.test(admin), true);
}

console.log('\nen video kan nog steeds geen venster krijgen, hoe groot ook');
{
  /* De reparatie van 12 augustus blijft staan. Nu het veld niet meer gedeeld
     wordt is dit de tweede sluis en niet de enige — maar een dienst die geen
     venster kán inplannen, mag er ook niet één beloven als iemand ooit een
     `products` terugzet op dit formulier. */
  for (const n of [1, 9, 10, 12, 40]) {
    ok(`video met ${n} is unattended`, tierFor(n, 'video'), 'unattended');
  }
}

/* ════════════════════════════════════════════════════════════════════════════
   3 · WAT /video BELOOFT
   ════════════════════════════════════════════════════════════════════════════ */

console.log('\n/video belooft geen vastgezette leverdatum meer');
{
  const vid = read('src/components/VideoPage.astro');

  /* De drie oude formuleringen, elk letterlijk. Ze staan hier als tekst en niet
     als patroon-met-gaten, want juist de exacte woorden waren de belofte. */
  ok('geen "your own order is the one with the date"',
    /your own order is the one with the date/.test(vid), false);
  ok('geen "houden we een leverdatum voor je vrij, en die wijkt niet meer"',
    /houden we een leverdatum voor je vrij, en die wijkt niet meer/.test(vid), false);
  ok('geen "we hold a delivery date for the order and confirm it in writing"',
    /we hold a delivery date for the order and confirm it in writing/.test(vid), false);
  ok('geen "houden we een leverdatum voor je vrij en zetten we die vast"',
    /houden we een leverdatum voor je vrij en zetten we die vast/.test(vid), false);

  /* En wat er nu staat: dat een clipaanvraag in de normale doorlooptijd loopt, en
     dat een venster bij de BESTELLING hoort en niet bij het aantal clips. */
  ok('het zegt dat een clipaanvraag in de wachtrij loopt',
    /clip request runs in the standard queue/.test(vid), true);
  ok('en in het Nederlands hetzelfde',
    /clipaanvraag loopt mee in de normale doorlooptijd/.test(vid), true);
  ok('het zegt waar het venster dan wél bij hoort (EN)',
    /the order carries the date/.test(vid), true);
  ok('en (NL)', /draagt de bestelling de datum/.test(vid), true);

  /* TierCompare staat op deze pagina en print de twee tredes van de ladder.
     Weghalen zou informatie kosten aan wie ook foto's koopt; er staat dus één
     regel context boven. */
  ok('en er staat een voorbehoud boven de laddervergelijking', /c\.tierNote/.test(vid), true);
  ok('  in het Engels', /The two columns below describe the ladder/.test(vid), true);
  ok('  en in het Nederlands', /De twee kolommen hieronder gaan over de ladder/.test(vid), true);

  /* De knoppen. Drie stuks, en ze gingen alle drie naar de keuzepagina waar de
     bezoeker net vandaan kwam. */
  ok('geen enkele knop gaat nog naar /start zelf', /lp\('\/start'\)/.test(vid), false);
  const naarVideo = (vid.match(/lp\('\/start\/video'\)/g) || []).length;
  ok('alle drie gaan naar /start/video', naarVideo, 3);

  /* En die pagina moet dan ook bestaan, in beide talen. */
  ok('/start/video bestaat', read('src/pages/start/video.astro').includes('HoldingPage'), true);
  ok('/nl/start/video bestaat', read('src/pages/nl/start/video.astro').includes('HoldingPage'), true);
}

/* ════════════════════════════════════════════════════════════════════════════
   4 · /start/complete VRAAGT OM EEN LOOK
   ════════════════════════════════════════════════════════════════════════════ */

console.log('\n/start/complete vraagt nu ook om een look');
{
  for (const p of ['src/pages/start/complete.astro', 'src/pages/nl/start/complete.astro']) {
    const src = read(p);
    ok(`${p} importeert StylePicker`, /import StylePicker from/.test(src), true);
    ok('  en rendert hem', /<StylePicker lang=/.test(src), true);
    ok('  naast Step1Options, want deze bestelling heeft beide helften',
      /<Step1Options lang=/.test(src), true);
    /* De look staat boven de drie folds: het is het enige blok in stap 1 waar
       niets is voorgeselecteerd, dus het enige dat echt beantwoord moet worden. */
    ok('  met de look boven de optionele blokken',
      src.indexOf('<StylePicker') < src.indexOf('<Step1Options'), true);
  }

  /* En de meta description moet het meebeloven, want die stond er nog zonder. */
  ok('de Engelse meta noemt de look', /Pick the count, the look and the background/.test(read('src/pages/start/complete.astro')), true);
  ok('de Nederlandse ook', /Kies het aantal, de look en de achtergrond/.test(read('src/pages/nl/start/complete.astro')), true);

  /* Het veld dat StylePicker post, en waar het landt. Geen serverwijziging: dat
     is de reden dat dit een slot mocht zijn en geen migratie. */
  const picker = read('src/components/order/StylePicker.astro');
  ok('StylePicker post name="style"', /name="style"/.test(picker), true);
  const orderApi = read('functions/api/order.js');
  const topBlok = orderApi.slice(orderApi.indexOf('const TOP_FIELDS'), orderApi.indexOf('export async function onRequestPost'));
  ok("'style' staat niet in TOP_FIELDS, dus het landt in details_json", /'style'/.test(topBlok), false);

  /* Het bevestigingsscherm print de look zodra de stroom de vraag heeft. Dat was
     al zo en het is precies waarom dit werkt zonder pipeline.js aan te raken. */
  const pl = read('src/scripts/pipeline.js');
  ok('het bevestigingsscherm print de gekozen look al generiek',
    /input\[name="style"\]:checked/.test(pl), true);
  /* En de achtergrond blijft van toepassing op complete — deze bestelling heeft
     echt een catalog-helft, dus die vraag hoort er ook nog bij te staan. */
  ok("bgApplies('complete') blijft waar", /kind === 'complete' \|\| kind === 'catalog'/.test(pl), true);
}

/* ════════════════════════════════════════════════════════════════════════════
   5 · DE PROEFVISUAL VRAAGT ÉÉN VRAAG PER SOORT
   ════════════════════════════════════════════════════════════════════════════

   Lucas, 13 augustus 2026: *"Test sample form is nog steeds oude form. Dit zou
   meer hetzelfde moeten zijn als catalog form en als bezoekers lifestyle kiezen
   moet deze aangepast worden daarop, dus achtergrondkleur optie verdwijnt dan."*

   Wat er stond: eerst "catalog of lifestyle?", en daarna ALTIJD de vier
   lifestyle-looks, met eronder *"Skip it if you chose catalog above."* Een
   formulier dat de bezoeker vraagt zelf een vraag over te slaan. En de
   tegenhanger ontbrak helemaal: wie catalog koos kreeg de achtergrondvraag
   nergens te zien, terwijl dat op /start de kernvraag van een catalogbestelling
   is — en de reden staat in backgrounds.js: een merk dat al productfoto's heeft
   moet de nieuwe ernaast kunnen leggen. Een proef op de verkeerde ondergrond
   toetst een gok en niet ons werk. */

console.log('\nde proefvisual: catalog krijgt de achtergrond, lifestyle de look');
{
  for (const [pad, taal] of [['src/pages/test-sample.astro', 'en'], ['src/pages/nl/test-sample.astro', 'nl']]) {
    const src = read(pad);
    ok(`${taal}: het achtergrondblok bestaat`, /class="field ts-when-catalog"/.test(src), true);
    ok(`${taal}: en het lookblok is voorwaardelijk`, /class="field ts-when-lifestyle"/.test(src), true);
    ok(`${taal}: de keuze bovenaan schakelt ze`, /form:has\(#ts-type-catalog:checked\) \.ts-when-catalog/.test(src), true);
    ok(`${taal}: en de andere kant ook`, /form:has\(#ts-type-lifestyle:checked\) \.ts-when-lifestyle/.test(src), true);
    /* Beide staan uit tot er gekozen is. Zonder deze regel zou één van de twee
       standaard aan staan, en dan is er weer een vraag die misschien niet over
       de bezoeker gaat. */
    ok(`${taal}: en beide staan uit tot er gekozen is`,
      /\.ts-when-catalog,\s*\n\s*\.ts-when-lifestyle \{ display: none; \}/.test(src), true);

    /* De zin die niet meer nodig is staat in de GERENDERDE pagina getoetst en niet
       hier: de kop van dit bestand citeert hem met opzet, want die uitleg is de
       helft van de reparatie. Een test die zijn eigen verantwoording wegpest,
       maakt de code slechter. Zie het distblok onderaan. */

    /* Geen JavaScript. Dit is geen puurheid: pipeline.js staat niet op deze
       pagina, en de €1-stroom is het laatste formulier waar een
       JS-afhankelijkheid in hoort. */
    ok(`${taal}: er komt geen script bij kijken`, /<script/.test(src), false);

    /* De looks komen uit de bron in plaats van met de hand ingetypt, en ze posten
       de slug — net als StylePicker op /start/lifestyle. */
    ok(`${taal}: de looks komen uit styles`, /import \{ styles as styleData \}/.test(src), true);
    ok(`${taal}: en posten de slug`, /name="style" value=\{s\.slug\}/.test(src), true);
    ok(`${taal}: 'custom' zit er niet bij`, /filter\(\(s\) => s\.slug !== 'custom'\)/.test(src), true);
    /* Een ontbrekende tegelfoto valt luidruchtig om in plaats van stil een tegel
       minder te tonen. Zelfde afspraak als CARDS in StylePicker.astro. */
    ok(`${taal}: een onbekende stijl gooit`, /throw new Error\(`test-sample: geen tegelfoto/.test(src), true);

    /* En de hexwaarden komen uit backgrounds.js: een swatch die #F7F5F1 laat zien
       terwijl er #F5F5F5 uitkomt, is een levering die een klant kan meten. */
    ok(`${taal}: de swatches komen uit backgrounds.js`, /import \{ RECOMMENDED, CUSTOM_ID, DEFAULT_ID/.test(src), true);
    ok(`${taal}: geen hexwaarde met de hand ingetypt in de markup`,
      /style=\{`background:\$\{b\.hex\}`\}/.test(src), true);
  }
}

console.log('\nen wat er verborgen is, komt niet in het record');
{
  /* ── WAAROM DIT DE HELFT VAN DE REPARATIE IS ───────────────────────────────
     `display: none` verbergt een radio voor de bezoeker; de browser verstuurt hem
     onverminderd. Zonder de opschoning in /api/order zou elke lifestyle-proef
     `background: white` meesturen — de voorgeselecteerde standaard van een vraag
     die niemand te zien kreeg. Dan staat er in details_json, in de studiomail en
     in de werkmap een achtergrondkleur bij werk dat er geen heeft, en die is niet
     van een echt antwoord te onderscheiden. */
  const { tidyTestSampleDetails: net } = await import('../functions/api/order.js');
  const na = (o) => net({ ...o });

  {
    const r = na({ sample_type: 'lifestyle', style: 'glow', background: 'white', background_hex: '#FFFFFF' });
    ok('een lifestyle-proef houdt zijn look', r.style, 'glow');
    ok('  en verliest de achtergrond', 'background' in r, false);
    ok('  ook de hexwaarde', 'background_hex' in r, false);
  }

  {
    const r = na({ sample_type: 'catalog', style: 'glow', background: 'beige' });
    ok('een catalogproef verliest de look', 'style' in r, false);
    ok('  houdt de achtergrond', r.background, 'beige');
    /* De hexwaarde wordt hier afgeleid en niet in de browser gezet, zodat een
       proef dezelfde vorm heeft als een gewone bestelling — de werkmap in /admin
       doet `background_hex || background`. */
    ok('  en krijgt de hexwaarde uit backgrounds.js', r.background_hex, '#EDE4D8');
  }

  {
    const r = na({ sample_type: 'catalog', background: 'custom', background_custom: 'f7f5f1' });
    ok('een eigen kleur wordt genormaliseerd', r.background_hex, '#F7F5F1');
    ok('  met een hekje ervoor', /^#[0-9A-F]{6}$/.test(r.background_hex), true);
  }

  {
    /* Half ingevuld is geen kleur. Er tegen renderen betekent tegen niets
       renderen, en dan weet niemand meer waartegen. */
    const r = na({ sample_type: 'catalog', background: 'custom', background_custom: 'donkerblauw graag' });
    ok('een kleur die geen hex is verdwijnt helemaal', 'background' in r, false);
    ok('  en laat geen halve waarde achter', 'background_hex' in r, false);
  }

  {
    const r = na({ sample_type: 'catalog', background: 'paars' });
    ok('een onbekende achtergrond-id verdwijnt ook', 'background' in r, false);
  }

  {
    /* Zonder soort verandert er niets. Een oud tabblad dat nog geen sample_type
       post, mag niet stil zijn antwoorden verliezen. */
    const r = na({ style: 'glow', background: 'white' });
    ok('zonder sample_type blijft alles staan', `${r.style}|${r.background}`, 'glow|white');
  }

  /* En de koppeling: dat de functie bestaat zegt niets zolang de route hem niet
     aanroept. */
  const api = read('functions/api/order.js');
  ok('/api/order roept de opschoning aan',
    /if \(service === 'test-sample'\) tidyTestSampleDetails\(details\);/.test(api), true);
  /* Ná de details-lus en niet ervoor: de lus is wat details vult. */
  ok('  en wel nadat details gevuld is',
    api.indexOf('if (cleaned) details[k] = cleaned;') < api.indexOf("if (service === 'test-sample') tidyTestSampleDetails(details);"), true);
}

console.log('\nen de gebouwde pagina laat het ook zien');
{
  /* De bron toetsen zegt niet dat Astro het scoped-CSS goed heeft uitgeschreven:
     `:has()` met een id erin is precies het soort selector waar een bundler een
     hash op de verkeerde plek kan zetten. Dus wordt de UITVOER bekeken — en
     overgeslagen als die niet bij de bron hoort, om dezelfde reden als in
     tests/planning.test.mjs. */
  const staat = buildStaat(new URL('../dist/test-sample/index.html', import.meta.url));
  if (!staat.er || staat.oud) {
    console.log(`      (overgeslagen — ${staat.uitleg})`);
  } else {
    for (const p of ['dist/test-sample/index.html', 'dist/nl/test-sample/index.html']) {
      const html = read(p);
      ok(`${p}: de :has()-regel staat erin`,
        /:has\(#ts-type-catalog:checked\) \.ts-when-catalog\[data-astro-cid-[a-z0-9]+\]\{display:block\}/.test(html), true);
      ok('  de id waar hij naar wijst is niet gehasht',
        /id="ts-type-catalog"/.test(html), true);
      ok('  het achtergrondblok is gerenderd', /ts-when-catalog/.test(html), true);
      ok('  de vier achtergrondkeuzes staan er', (html.match(/name="background"/g) || []).length, 4);
      ok('  en het veld voor een eigen hexwaarde', /name="background_custom"/.test(html), true);
      ok('  de looks posten slugs en geen namen', /value="phone-made"/.test(html), true);
      ok('  en niet meer de weergavenaam', /name="style" value="Phone-made"/.test(html), false);
      /* De zin die de bezoeker vroeg zelf een vraag over te slaan. In de bron mag
         hij nog als citaat staan; op de pagina niet meer. */
      ok('  en de "sla dit over"-zin staat niet meer op de pagina',
        /Skip it if you chose catalog|Sla dit over als je hierboven catalog koos/.test(html), false);
    }
  }
}

console.log(`\n${pass}/${pass + fail} geslaagd`);
if (fail) process.exit(1);
