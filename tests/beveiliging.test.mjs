/*
 * ═══════════════════════════════════════════════════════════════════════════
 * DE ZWAKKE PLEKKEN DIE OP 31 AUGUSTUS 2026 GEVONDEN ZIJN
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Lucas vroeg om de site van meerdere kanten te benaderen alsof iemand hem
 * probeert te kraken. Dit bestand is wat er van die ronde is overgebleven: elke
 * regel hieronder hoort bij één gevonden gat, en valt om zodra de reparatie
 * teruggedraaid wordt.
 *
 * ── WAAROM DIT ÉÉN BESTAND IS EN GEEN LOSSE REGELS OVERAL ──────────────────
 *
 * Beveiligingsreparaties hebben geen zichtbaar gedrag. Een verkeerd Content-Type
 * op een preview, een teller op de verkeerde as, een kop die er niet staat: geen
 * enkele daarvan valt op bij het gebruiken van de site, en alle drie komen ze
 * terug bij de eerstvolgende herschrijving als er niets naar kijkt. Bij elkaar
 * zetten maakt bovendien leesbaar wát er beschermd wordt en waartegen — de
 * aanvalsverhalen staan erbij, want een toets zonder verhaal wordt bij de eerste
 * rode regel weggehaald in plaats van begrepen.
 *
 * WAT HIER NIET IN STAAT. Alles wat al goed was en dus niets te bewaken heeft:
 * de gebonden query's, de webhookhandtekeningen, de eigenaarscontrole op elke
 * klantroute. Die zijn nagelopen en in orde bevonden; een toets die niets kan
 * betrappen, is ruis.
 */

import { readFileSync } from 'node:fs';
import { d1, verseDb } from './lib/d1sqlite.mjs';
import { checkRate } from '../src/lib/ratelimit.js';

let goed = 0;
let totaal = 0;
function ok(naam, kreeg, verwacht) {
  totaal += 1;
  const isGoed = JSON.stringify(kreeg) === JSON.stringify(verwacht);
  if (isGoed) goed += 1;
  console.log(` ${isGoed ? 'ok  ' : 'FAIL'} ${String(naam).padEnd(60)}${isGoed ? '' : ` verwacht ${JSON.stringify(verwacht)} kreeg ${JSON.stringify(kreeg)}`}`);
}
const lees = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');

/* ── DE CODE ZONDER HET COMMENTAAR ──────────────────────────────────────────
 * Dit project schrijft bij een reparatie op wat er stónd, letterlijk, in een noot
 * erboven. Een toets die zoekt of een fout weg is, vindt hem dan terug in de
 * uitleg van zijn eigen reparatie — dat is hier al zes keer gebeurd. Regels die
 * er als commentaar uitzien vallen daarom af, op VORM en niet met een
 * commentaarstripper: die zou struikelen over elke `/*` in een tekenreeks. */
const zonderNoten = (bron) => bron.split('\n')
  .filter((r) => !/^\s*(\*|\/\/|\/\*)/.test(r))
  .join('\n');

/* ══ 1 · DE ZESCIJFERIGE CODE IS NIET MEER TE ZEVEN ═══════════════════════
 *
 * AANVAL: vraag een code aan voor het slachtoffer, gok vijf keer, vraag een
 * nieuwe code — die zet een verse rij neer met de teller op nul. De begrenzing
 * stond alleen op het IP, dus met een handvol IP's is een miljoen mogelijkheden
 * een kwestie van uren, en het enige alarm is de inbox van het slachtoffer.
 */
console.log('\nhet raden van een inlogcode wordt op het account geteld en niet alleen op het IP');
{
  const acc = lees('src/lib/account.js');
  ok('er is een tweede emmer op het adres bij het raden',
    /action: 'account-code-id'/.test(acc), true);
  ok('en één bij het aanvragen van een code',
    /action: 'account-login-id'/.test(acc), true);
  ok('allebei op het e-mailadres en niet op het IP',
    /key: `account-code\|\$\{email\}`/.test(acc) && /key: `account-login\|\$\{email\}`/.test(acc), true);

  /* EN DE STILTE BLIJFT. Dit formulier antwoordt met opzet altijd hetzelfde, of
     het adres nu bestaat of niet. Een 429 die alleen bij een bestaand adres
     verschijnt, is een accountopsommer. */
  const blok = acc.slice(acc.indexOf('async function handleLoginPost'), acc.indexOf('async function handleCodePost'));
  /* De eigenschap en niet de spelling: vanaf de nieuwe emmer tot het einde van de
     functie mag er geen enkele `return` staan. Zou de geblokkeerde aanvraag een
     eigen antwoord krijgen — een 429, een andere pagina, wat dan ook — dan
     verschilt het antwoord tussen een bestaand en een onbestaand adres, en is dit
     formulier een accountopsommer geworden. De 429 die er wél in zit, hoort bij de
     bestaande teller per IP en die staat vóór het adres bekend is. */
  const naEmmer = blok.slice(blok.indexOf('const perAccount'));
  ok('een geblokkeerde aanvraag krijgt geen eigen antwoord',
    /\breturn\b/.test(naEmmer.slice(0, naEmmer.lastIndexOf('return html'))), false);
  ok('en de pagina is dezelfde als altijd',
    /return html\(page\([\s\S]{0,160}checkEmailBody/.test(blok), true);

  // De begrenzer kan op een eigen sleutel tellen en niet alleen op een IP.
  const { db, mislukt } = verseDb(new URL('../schema.sql', import.meta.url));
  if (mislukt.length) throw new Error('schema: ' + mislukt[0]);
  const env = { DB: d1(db) };
  const een = await checkRate(env, { key: 'proef|a@b.test', action: 'toets', limit: 2, windowSeconds: 60 });
  const twee = await checkRate(env, { key: 'proef|a@b.test', action: 'toets', limit: 2, windowSeconds: 60 });
  const drie = await checkRate(env, { key: 'proef|a@b.test', action: 'toets', limit: 2, windowSeconds: 60 });
  const ander = await checkRate(env, { key: 'proef|c@d.test', action: 'toets', limit: 2, windowSeconds: 60 });
  ok('dezelfde sleutel loopt vol', [een.allowed, twee.allowed, drie.allowed], [true, true, false]);
  ok('en een ander adres heeft zijn eigen emmer', ander.allowed, true);
}

/* ══ 2 · WAT ER NÍET GEREPAREERD IS, EN WAAROM ═══════════════════════════
 *
 * "Een e-mailwissel hoort elke sessie te doden" kwam als bevinding boven, ik heb
 * het ingebouwd, en het is er weer uit. De aanval die het zou moeten stoppen —
 * gestolen koekje, adres naar het eigen postvak, bevestigen — loopt er dwars
 * doorheen: de aanvaller valt er ook uit en logt een seconde later weer in op het
 * adres dat nu van hem is. Het slot staat elders en het staat er al: de
 * terugzetlink ligt in het OUDE postvak.
 *
 * Deze regels bewaken dus wat er echt beschermt, en niet wat er goed uitzag.
 */
console.log('\nde terugzetlink is het slot op een overgenomen account');
{
  const acc = lees('src/lib/account.js');
  const undo = acc.slice(acc.indexOf('async function handleEmailUndo'), acc.indexOf('async function handleEmailUndo') + 4200);
  ok('de terugzetlink ruimt elke sessie op', /DELETE FROM account_sessions WHERE customer_id/.test(undo), true);
  ok('en elke openstaande inloglink', /DELETE FROM account_tokens WHERE customer_id/.test(undo), true);
  ok('en zet het oude adres terug', /UPDATE customers SET email/.test(undo), true);
}

/* ══ 3 · DE PREVIEW KAN GEEN SCRIPT MEER ZIJN ═════════════════════════════
 *
 * AANVAL: sla via het klantformulier in het beheerpaneel een `image/svg+xml` of
 * `text/html` op als modelpreview. /account/models/<id>/preview gaf dat type
 * ongezien terug, waarna het in het tabblad draaide — op het origin van de klant,
 * en zonder de CSP van de dashboardpagina, want die zit op de paginarespons.
 * Er is een ingelogde beheerder voor nodig; de reparatie stond één functie verderop.
 */
console.log('\neen modelpreview is een afbeelding, bij het opslaan én bij het teruggeven');
{
  const adm = lees('src/lib/admin.js');
  const acc = lees('src/lib/account.js');
  ok('het beheerformulier toetst het type tegen de lijst',
    /if \(!PREVIEW_TYPES\.includes\(String\(file\.type/.test(adm), true);
  ok('en houdt zich aan hetzelfde plafond',
    /file\.size > PREVIEW_MAX_BYTES/.test(adm), true);

  const serve = acc.slice(acc.indexOf('preview_key FROM custom_models'), acc.indexOf('preview_key FROM custom_models') + 1600);
  ok('de respons zet het type zelf', /headers\.set\('Content-Type'/.test(serve), true);
  ok('  uit een gesloten lijst', /PREVIEW_MIME\.includes\(bewaard\)/.test(serve), true);
  ok('  en verbiedt raden', /X-Content-Type-Options'?,\s*'nosniff'/.test(serve), true);
}

/* ══ 4 · DE CACHESLEUTEL VAN /api/capacity IS BEGRENSD ════════════════════
 *
 * AANVAL: de kop van dat bestand zegt dat er geen snelheidsbegrenzer nodig is
 * omdat een cache van zestig seconden de belasting wegneemt. Dat klopt alleen als
 * het aantal verschillende antwoorden begrensd is — en `products` was elk geheel
 * getal en `service` elke tekenreeks. Een lus met een oplopende `products` mist
 * de rand-cache elke keer en komt met drie query's zonder LIMIT bij dezelfde D1
 * uit waar de studio op draait.
 */
console.log('\nhet publieke capaciteits-endpoint kan niet om zijn eigen cache heen');
{
  const cap = lees('functions/api/capacity.js');
  ok('het aantal wordt geknipt op een bovengrens',
    /Math\.min\(Math\.max\(gevraagd, 1\), MAX_PRODUCTS_ANY_SERVICE \+ 1\)/.test(cap), true);
  ok('een onbekende dienst valt terug op complete',
    /kindImages\(gevraagdeDienst, 1\) === null \? 'complete'/.test(cap), true);
  ok('en het antwoord blijft cachebaar', /'cache-control': 'public, max-age=60'/.test(cap), true);
  ok('met nosniff erbij', /'x-content-type-options': 'nosniff'/.test(cap), true);
  ok('ook op /api/order-status',
    /'x-content-type-options': 'nosniff'/.test(lees('functions/api/order-status.js')), true);
}

/* ══ 5 · GEEN KOP MEER TE BOUWEN UIT EEN BESTANDSNAAM ═════════════════════
 *
 * Een nieuwe regel in een kopwaarde is een tweede kop. Drie van de vier bouwers
 * van Content-Disposition filterden al op stuurtekens; de vierde haalde alleen
 * het aanhalingsteken weg.
 */
console.log('\nelke bijlagekop filtert stuurtekens en niet alleen het aanhalingsteken');
{
  const adm = lees('src/lib/admin.js');
  ok('de beheerdownload schoont de naam',
    /veiligeNaam[\s\S]{0,120}\\r\\n\\t/.test(adm), true);
  ok('en zet er geen ongefilterde naam meer in',
    /filename="\$\{\(row\.filename \|\| 'file'\)\.replace\(\/"\/g, ''\)\}"/.test(adm), false);

  /* ── EN DE ANDERE DRIE, OP DE EIGENSCHAP EN NIET OP DE SPELLING ──────────
     Eerst stond hier een zoektocht naar de tekenklasse `\r\n\t\x00-\x1f` in de
     bron. Die viel om op zip.js, en ten onrechte: zipDisposition() vervangt alles
     buiten `\x20-\x7e`, wat CR en LF inbegrepen is. De toets keek dus naar hoe het
     opgeschreven was en niet naar wat het deed — precies de soort regel die je
     leert negeren. Nu wordt de functie gevoerd met een naam die een tweede kop zou
     bouwen, en gekeken of er iets van overblijft. */
  const gemeen = 'factuur\r\nSet-Cookie: vis_account=gekaapt\r\n\r\n.pdf';
  const { zipDisposition } = await import('../src/lib/zip.js');
  ok('zipDisposition laat geen regeleinde staan', /[\r\n]/.test(zipDisposition(gemeen)), false);
  for (const p of ['src/lib/account.js', 'src/lib/portal.js']) {
    ok(`${p} filtert de stuurtekens`, /\\r\\n\\t\\x00-\\x1f/.test(lees(p)), true);
  }
}

/* ══ 4b · EEN BETALING MOET DE BESTELLING DEKKEN ═════════════════════════
 *
 * Geen van beide betaalwegen vergeleek het betaalde bedrag met wat de bestelling
 * kost. Een betaling van één euro die aan een bestelling van elfhonderd hangt,
 * zette hem op volledig betaald. Van buitenaf niet te forceren — elke betaallink
 * wordt door de server met het juiste bedrag gemaakt — maar recordPaid() noemt zelf
 * één weg waarlangs het wél kan: een betaling met de hand in het Mollie-dashboard,
 * met een order_ref in de metadata.
 *
 * Lucas' keuze: niet op betaald zetten, wel melden. De betaling wordt vastgelegd,
 * de bestelling blijft onbetaald, en er gaat een regel naar het logboek en de
 * tijdlijn.
 */
console.log('\neen betaling die het totaal niet dekt, zet de bestelling niet op betaald');
{
  const mol = lees('functions/api/webhook/mollie.js');
  const str = lees('functions/api/webhook/stripe.js');

  /* ── DE SOM GAAT OVER DE BESTELLING EN NIET OVER DEZE BETALING ───────────
     Dat verschil is de hele correctheid. Een controle per betaling breekt de
     bijbetaling die beide webhooks uitdrukkelijk ondersteunen: één euro nu, de
     rest later. Per betaling dekt geen van beide het totaal en blijft de
     bestelling voor altijd hangen. En het is dezelfde vraag die issueInvoice()
     al stelde, dus het is dezelfde functie — een eigen kopie zou een tweede
     waarheid zijn. */
  for (const [naam, bron] of [['Mollie', mol], ['Stripe', str]]) {
    ok(`${naam} gebruikt betalingGedekt() uit invoice.js`,
      /import \{ betalingGedekt \} from/.test(bron), true);
    ok(`  en heeft geen eigen bedragvergelijking`,
      /dektHetBedrag|amount_total\s*[<>]=?|cents\s*\+\s*2\s*>=/.test(zonderNoten(bron)), false);
    ok(`  ${naam} stopt vóór het op betaald zetten`,
      bron.indexOf('dekt de bestelling niet') < bron.indexOf("SET payment_status = 'paid'"), true);
    ok(`  en laat een onbekend totaal gewoon door`,
      /is niet tegen een totaal te leggen/.test(bron), true);
  }

  /* GEEN BEDRAGEN IN order_events. Die tabel is óók de klantentijdlijn — portal.js
     en account.js lezen hem zonder filter op actor. issueInvoice() maakt dat
     onderscheid al bij precies dit geval; de weigering één stap eerder hoort
     dezelfde vorm te hebben. De getallen gaan naar admin_log. */
  for (const [naam, bron] of [['Mollie', mol], ['Stripe', str]]) {
    /* Op de zin zelf en niet op de omgeving: dit bestand schrijft óók een
       restitutieregel mét bedrag naar dezelfde tabel, en dat hoort — een klant wil
       weten hoeveel er terugkomt. Wat hij niet hoort te lezen is een verschil in
       centen over zijn eigen betaling. */
    const zin = (/const zichtbaar = '([^']+)'/.exec(bron) || [])[1] || '';
    ok(`${naam} meldt het in gewone taal`, /nagekeken/.test(zin), true);
    ok(`  en zonder één cijfer erin`, /\d/.test(zin), false);
    ok(`  en legt ze wel in admin_log als payment.short`,
      /'payment\.short'[\s\S]{0,400}binnengekomen \$\{/.test(bron), true);
  }

  /* En de betaling zelf wordt altijd vastgelegd: het geld is binnen en dat hoort
     in de boeken, ook als de bestelling blijft hangen. */
  ok('de weigering komt ná het vastleggen van de betaling',
    mol.indexOf('INSERT INTO payments') < mol.indexOf('const dekking = await betalingGedekt'), true);
}

/* ══ 5b · EN EEN AFLEVERING KRIJGT HAAR TYPE UIT DE NAAM ═════════════════
 *
 * AANVAL: mimeFor() valt op het OPGESLAGEN type terug zodra hij de extensie niet
 * kent, en de twee downloadroutes geven af met `content-disposition: inline`. Een
 * afgeleverd bestand met een onbekende extensie en `text/html` erop kwam dus als
 * pagina in het tabblad van de klant terecht. De intakekant deed dit al goed.
 */
console.log('\nhet type van een afgeleverd bestand komt uit de extensie en niet uit de browser');
{
  const adm = lees('src/lib/admin.js');
  /* Op de code en niet op de noten: de reparatie citeert hierboven letterlijk wat
     er stond, en die zin is geen bug. */
  ok('er wordt nergens meer een browsertype opgeslagen',
    /contentType: file\.type/.test(zonderNoten(adm)), false);
  ok('de aflevering leest de extensie', /contentType: leveringMime\(clean\)/.test(adm), true);
  ok('en wat er niet in staat, wordt octet-stream',
    /LEVERING_MIME\[ext\] \|\| 'application\/octet-stream'/.test(adm), true);
}

/* ══ 6 · DE VIJF ESCAPERS DOEN ALLEMAAL VIJF TEKENS ═══════════════════════
 *
 * Vier van de vijf kopieën escapeten `& < > " '`; die in functions/api/order.js
 * deed er drie. Hij vult vandaag alleen tekstknopen in een mail, dus er was geen
 * levend gat — maar afwijken zonder reden is hier de fout.
 */
console.log('\nelke escaper in dit project dekt dezelfde vijf tekens');
{
  for (const p of ['src/lib/admin.js', 'src/lib/account.js', 'src/lib/portal.js', 'functions/api/order.js']) {
    const bron = lees(p);
    const m = /function esc\([\s\S]{0,400}?\}/.exec(bron);
    const tekst = m ? m[0] : '';
    ok(`${p}: & < > " '`,
      ['&amp;', '&lt;', '&gt;', '&quot;', '&#39;'].every((e) => tekst.includes(e)), true);
  }
}

console.log(`\n${goed}/${totaal} geslaagd`);
if (goed !== totaal) process.exit(1);
