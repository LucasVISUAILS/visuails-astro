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
import { serviceFaqs } from '../src/data/faq.js';
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

  /* De bedankpagina staat sinds de herbouw in EEN component, zodat EN en NL
     niet uit elkaar kunnen lopen. Het blok wordt daar getoetst, en de twee
     pagina's worden getoetst op het feit dat ze die component gebruiken --
     anders verhuist de markering ongemerkt en zegt deze test niets meer. */
  const tyComp = read('src/components/ThankYouPage.astro');
  ok('het blok staat in de gedeelde bedankcomponent',
    tyComp.includes('data-ty-cancelled'), true);
  ok('en de rest van de pagina kan weg', tyComp.includes('ty-hide-when-cancelled'), true);
  for (const p of ['src/pages/thank-you.astro', 'src/pages/nl/thank-you.astro']) {
    ok(`${p} gebruikt die component`, /<ThankYouPage\b/.test(read(p)), true);
  }

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
     dat een venster bij de BESTELLING hoort en niet bij het aantal clips.

     ── GEMETEN AAN HET ANTWOORD EN NIET AAN HET BESTAND — 23 AUGUSTUS 2026 ────

     Deze vier stonden als grep op VideoPage.astro. Op 23 augustus verhuisden de
     dienstvragen naar src/data/faq.js — nodig om ze als FAQPage in de graph te
     krijgen, want schema.js kan de frontmatter van een component niet lezen — en
     toen vielen ze om, terwijl er aan de BELOFTE niets veranderd was.

     Dat is dezelfde soort test-fout die planning.test.mjs en legal.test.mjs
     eerder deze maand hadden: een toets die de spelling van een regel vastpint
     in plaats van het feit. Nu leest hij het antwoord dat de bezoeker krijgt,
     via dezelfde functie als de pagina. Verhuist die tekst nog eens, dan
     verhuist de toets mee; verdwijnt de belofte, dan valt hij om. */
  const videoVragenEn = serviceFaqs('video', 'en').map((f) => f.a).join(' ');
  const videoVragenNl = serviceFaqs('video', 'nl').map((f) => f.a).join(' ');
  ok('het zegt dat een clipaanvraag in de wachtrij loopt',
    /clip request runs in the standard queue/.test(videoVragenEn), true);
  ok('en in het Nederlands hetzelfde',
    /clipaanvraag loopt mee in de normale doorlooptijd/.test(videoVragenNl), true);
  ok('het zegt waar het venster dan wél bij hoort (EN)',
    /the order carries the date/.test(videoVragenEn), true);
  ok('en (NL)', /draagt de bestelling de datum/.test(videoVragenNl), true);

  /* En dat ze ook echt op de gebouwde pagina staan. De regel hierboven bewijst
     dat de tekst bestaat; deze bewijst dat de pagina hem afdrukt. Zonder dit
     paar zou een component die serviceFaqs() niet meer aanroept, groen blijven. */
  ok('en de gebouwde /video drukt ze af',
    /clip request runs in the standard queue/.test(read('dist/video/index.html')), true);
  ok('  ook in het Nederlands',
    /clipaanvraag loopt mee in de normale doorlooptijd/.test(read('dist/nl/video/index.html')), true);

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
  /* ── HETZELFDE ANTWOORD, EEN ANDERE PLEK — 13 AUGUSTUS 2026 ────────────────
   *
   * Deze sectie toetste de `:has()`-regels op /test-sample, want die pagina had
   * toen een eigen formulier zonder JavaScript. Lucas, dezelfde dag: *"Ook de
   * test sample is nog steeds het oude formulier, deze zou al 2 keer aangepast
   * moeten zijn. Zelfde als lifestyle orderflow maar dan simpel."*
   *
   * Hij had gelijk om een reden die groter was dan de opmaak: OrderFlow.astro
   * had al een complete `mode="sample"` en geen enkele pagina gaf hem mee. De
   * pagina is nu die stroom, en dan is het schakelen tussen achtergrond en look
   * geen CSS-regel meer maar syncBackground() en syncStyle() in pipeline.js.
   *
   * DE BEWERING BLIJFT DEZELFDE en wordt alleen op de nieuwe plek gedaan:
   * catalog krijgt de achtergrond, lifestyle de look, en nooit allebei. Wat er
   * niet meer bij hoeft, is dat het zonder script moet — de proef draait nu op
   * dezelfde stroom als elke andere bestelling, met dezelfde <noscript>-belofte.
   */
  for (const [pad, taal] of [['src/pages/test-sample.astro', 'en'], ['src/pages/nl/test-sample.astro', 'nl']]) {
    const src = read(pad);
    ok(`${taal}: de pagina gebruikt de gedeelde stroom in proefstand`,
      /<OrderFlow lang="(en|nl)" service="lifestyle" mode="sample" hero=\{false\}>/.test(src), true);
    /* BEIDE KIEZERS IN DE SLOT, want de soort wordt hier in het formulier
       gekozen. Eén ervan weglaten is de helft van de klacht terugzetten. */
    ok(`${taal}: met de lookkiezer erin`, /<StylePicker lang="(en|nl)" \/>/.test(src), true);
    ok(`${taal}: en de achtergrondkiezer erin`, /<Step1Options lang="(en|nl)" \/>/.test(src), true);
    /* En geen eigen formulier meer ernaast. Twee bestelformulieren op één site is
       hoe de proef de vorige keer achterbleef bij wat /start al kon. */
    ok(`${taal}: geen eigen bestelformulier meer`, /<form[^>]*action="\/api\/order"/.test(src), false);
    ok(`${taal}: en geen handgetypte stijltegels meer`, /import \{ styles as styleData \}/.test(src), false);
  }

  const pl = read('src/scripts/pipeline.js');
  /* De achtergrond verdween al bij lifestyle; de look verdween NIET bij catalog,
     want op /start slot elke pagina er maar één in en viel er niets te
     verbergen. Dat is precies de helft die op de proef ontbrak. */
  ok("styleApplies() kent lifestyle en complete",
    /function styleApplies\(kind\) \{\s*return kind === 'complete' \|\| kind === 'lifestyle';/.test(pl), true);
  ok('syncStyle() verbergt de lookvraag', /field\.hidden = !applies;[\s\S]{0,120}field\.disabled = !applies;/.test(pl), true);
  /* `disabled` en niet alleen `hidden`: CSS houdt geen veld uit een POST. Dit is
     dezelfde regel die de opschoning hieronder op de server nog eens afdwingt. */
  ok('  en haalt hem uit de inzending', /function syncStyle\(kind\) \{[\s\S]{0,400}field\.disabled = !applies;/.test(pl), true);
  ok('StylePicker draagt de haak waar syncStyle op zoekt',
    /data-pl-look/.test(read('src/components/order/StylePicker.astro')), true);

  /* ── DE BINDING DIE ER NIET WAS ────────────────────────────────────────────
     kindOf() leest [data-pl-kind] sinds 11 augustus, maar bindOrder() luisterde
     alleen naar input[name="service"] — en de soortradio van de proef heet
     `sample_type`. Zonder deze regel bleef de hele stroom op de eerste soort
     staan, hoe vaak de bezoeker ook omschakelde. */
  ok('de soortkeuze van de proef is gebonden',
    /qa\('\[data-pl-kind\]'\)\.forEach\(\(r\) => \{\s*r\.addEventListener\('change', syncOrder\);/.test(pl), true);
  ok('en syncOrder schakelt beide vragen', /syncStyle\(kind\);\s*\n\s*syncRatio\(kind\);/.test(pl), true);
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
  /* De bron toetsen zegt niet wat een bezoeker krijgt. Dus wordt de UITVOER
     bekeken — en overgeslagen als die niet bij de bron hoort, om dezelfde reden
     als in tests/planning.test.mjs.

     WAT HIER VROEGER STOND was een toets op de uitgeschreven `:has()`-selector,
     omdat Astro's scoping daar een hash op de verkeerde plek kon zetten. Die
     regel bestaat niet meer: de pagina is nu de gedeelde stroom en het schakelen
     zit in pipeline.js. Wat blijft, is de vraag waar het altijd om ging — staat
     er op de proefpagina hetzelfde formulier als op /start, en niets ernaast? */
  const staat = buildStaat(new URL('../dist/test-sample/index.html', import.meta.url));
  if (!staat.er || staat.oud) {
    console.log(`      (overgeslagen — ${staat.uitleg})`);
  } else {
    for (const p of ['dist/test-sample/index.html', 'dist/nl/test-sample/index.html']) {
      const html = read(p);
      /* De stroom staat er echt, met zijn configblok — dat is het teken dat
         pipeline.js hier iets te doen heeft en niet alleen dat de markup lijkt. */
      ok(`${p}: de bestelstroom is gerenderd`, /data-pipeline-config/.test(html), true);
      ok('  in proefstand: het aantal is vast en verborgen',
        /<select name="products" hidden/.test(html), true);
      ok('  de soortvraag staat er', (html.match(/name="sample_type"/g) || []).length, 2);
      ok('  de achtergrondkeuzes staan er', (html.match(/name="background"/g) || []).length >= 4, true);
      ok('  en de looks posten slugs en geen namen', /value="phone-made"/.test(html), true);
      ok('  niet meer de weergavenaam', /name="style" value="Phone-made"/.test(html), false);
      /* De zin die de bezoeker vroeg zelf een vraag over te slaan. Hij hoort
         nergens meer te staan, ook niet nu het formulier eronder is vervangen. */
      ok('  en de "sla dit over"-zin staat niet meer op de pagina',
        /Skip it if you chose catalog|Sla dit over als je hierboven catalog koos/.test(html), false);
      /* De beeldverhouding, sinds 13 augustus 2026 op elk bestelformulier. Lucas:
         *"Ze missen ook nog in de orderflow, ik kan ze niet kiezen bij het maken
         van een order."* Ook op de proef, want dat is dezelfde stroom. */
      ok('  de beeldverhouding wordt gevraagd', /name="ratio"/.test(html), true);
    }
  }
}

console.log(`\n${pass}/${pass + fail} geslaagd`);
if (fail) process.exit(1);
