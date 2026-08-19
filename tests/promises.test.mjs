/* VISUAILS — de beloftes op de site tegen de code die ze moet nakomen.
 *
 *   npm run test:promises
 *
 * ── WAAROM DIT BESTAAT ──────────────────────────────────────────────────────
 *
 * Op 9 augustus 2026 bleken vijf beloftes op de site niet te worden nagekomen door
 * de code eronder. Niet één; vijf. En ze waren alle vijf jarenlang onopgemerkt,
 * omdat een belofte in tekst en het gedrag in code twee dingen zijn die niemand
 * naast elkaar legt:
 *
 *   1. /privacy §6 en /terms §7 beloofden dat bronmateriaal na 90 dagen wordt
 *      verwijderd. `files.expires_at` werd door geen enkele query gevuld en er was
 *      niets dat opruimde. Alles stond voor altijd in R2.
 *   2. /terms §9 beschreef een aanbetaling in twee termijnen van 50%. Die bestond
 *      nergens in de betaalcode — en de eerste helft van diezelfde alinea ("small
 *      orders paid in full at checkout") was óók onwaar: alleen de proefvisual van
 *      €1 wordt bij het afrekenen betaald.
 *   3. /ai-act §6 zei in het Nederlands dat wij een herkomsttag schrijven en in het
 *      Engels dat wij niets toevoegen. Tegengestelde beweringen over dezelfde
 *      wettelijke verplichting, op dezelfde pagina.
 *   4. Die Nederlandse claim gold alleen voor het leverscript; het adminportaal
 *      leverde ongetagd.
 *   5. De Nederlandse /about beloofde twee keer "binnen twee werkdagen", terwijl
 *      pricing.js voor kleine bestellingen geen datum geeft en /studio als hele
 *      pagina uitlegt dat we dat niet doen.
 *
 * ── WAT DEZE TEST DAAROM DOET ───────────────────────────────────────────────
 *
 * Voor elk van de vijf: de tekst nalezen én de code nalezen, en eisen dat ze
 * hetzelfde zeggen. Dit is bewust geen test van de tekst alleen — de tekst was elke
 * keer prachtig. Het is de VERBINDING die ontbrak.
 *
 * Waar het kan, wordt de code UITGEVOERD in plaats van gelezen (zie de sectie over
 * de bewaartermijn, die de echte SQL op een nagebouwde database draait). Een
 * broncontrole houdt een regel vast; een uitvoering houdt het gedrag vast.
 */

import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { TIERS } from '../src/data/pricing.js';
import { ROSTER } from '../src/data/models.js';
import { styles } from '../src/data/styles.js';
import { WINDOW_DAYS } from '../src/data/capacity.js';
import {
  UPLOAD_DAYS,
  DELIVERY_MONTHS,
  EXPIRED_FILES_SQL,
  stampUploadRetention,
  clearUploadRetention,
  stampDeliveryRetention,
} from '../src/lib/retention.js';
import { COMPOSITE, MARKER } from '../src/lib/iptc.js';
import { hasProvenanceTag, isScannable, MAX_SCAN_BYTES } from '../src/lib/provenance.js';

let pass = 0, fail = 0;
const check = (name, actual, expected) => {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (ok) pass++; else fail++;
  console.log(`${ok ? ' ok  ' : 'FAIL '} ${String(name).padEnd(62)} ${ok ? '' : `expected ${JSON.stringify(expected)} got ${JSON.stringify(actual)}`}`);
};
const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');

/* Alleen de code, zonder commentaar. Vierde keer dat dit nodig is in dit project,
   en hier is het onvermijdelijk: elke fout hierboven staat als noot in het bestand
   dat hem veroorzaakte, letterlijk geciteerd. Zonder deze stripper zou deze test
   rood worden op zijn eigen bestaansreden. */
const codeOnly = (src) => src
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
  .replace(/(^|\s)\/\/.*$/gm, '$1');

/* ══════════════════════════════════════════════════════════════════════════════
 * 1 · DE BEWAARTERMIJN — DE ECHTE SQL, OP EEN ECHTE DATABASE
 *
 * node:sqlite in plaats van D1, met een minimale nabouw van de twee tabellen. D1 is
 * SQLite, dus `datetime(closed_at, '+90 days')` gedraagt zich hier hetzelfde. Wat
 * getest wordt is niet "staat de query in het bestand" maar "stempelt hij de datum
 * die de site belooft" — en dat is het verschil tussen deze test en een grep.
 * ══════════════════════════════════════════════════════════════════════════════ */
console.log('\nde bewaartermijn doet wat /privacy §6 belooft');
{
  const db = new DatabaseSync(':memory:');
  db.exec(`
    /* De kolom 'status' staat er niet omdat deze test hem nodig heeft, maar omdat
       EXPIRED_FILES_SQL hem meeneemt: de opruimtaak schrijft op de tijdlijn van de
       bestelling wat hij weghaalde, en een gebeurtenis herhaalt de bestaande status.
       Haal je hem hier weg, dan valt de opruimquery om op "no such column".
       Of de nabouw hieronder nog op het échte schema past, test tests/retention.test.mjs
       — die draait tegen schema.sql zelf. */
    CREATE TABLE orders (id INTEGER PRIMARY KEY, closed_at TEXT, status TEXT NOT NULL DEFAULT 'received');
    CREATE TABLE files (
      id INTEGER PRIMARY KEY, order_id INTEGER, kind TEXT, r2_key TEXT, preview_key TEXT,
      announced_at TEXT, superseded_at TEXT, expires_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    INSERT INTO orders (id, closed_at) VALUES (1, '2026-01-10 12:00:00'), (2, NULL);
    INSERT INTO files (id, order_id, kind, r2_key, announced_at) VALUES
      (10, 1, 'upload',   'intake/a.jpg',   NULL),
      (11, 1, 'delivery', 'delivery/a.png', '2026-01-05 09:00:00'),
      (12, 2, 'upload',   'intake/b.jpg',   NULL),
      (13, 1, 'delivery', 'delivery/old.png', '2026-01-05 09:00:00');
    UPDATE files SET superseded_at = '2026-01-06 09:00:00' WHERE id = 13;
  `);

  /* De D1-vorm nabouwen: onze modules geven een prepared statement terug met .run(),
     node:sqlite wil .run(...params). Deze schil is het hele verschil. */
  const env = {
    DB: {
      prepare: (sql) => ({
        bind: (...args) => ({
          run: () => db.prepare(sql).run(...args),
          all: () => ({ results: db.prepare(sql).all(...args) }),
        }),
      }),
    },
  };
  const fileById = (id) => db.prepare('SELECT * FROM files WHERE id = ?').get(id);

  stampUploadRetention(env, 1).run();
  check(`bronmateriaal krijgt closed_at + ${UPLOAD_DAYS} dagen`,
    fileById(10).expires_at, '2026-04-10 12:00:00');
  check('een niet-afgesloten bestelling krijgt geen klok', (stampUploadRetention(env, 2).run(), fileById(12).expires_at), null);
  check('en het leveringsbeeld blijft ongemoeid', fileById(11).expires_at, null);

  stampDeliveryRetention(env, 1).run();
  check(`geleverd beeld krijgt announced_at + ${DELIVERY_MONTHS} maanden`,
    fileById(11).expires_at, '2027-01-05 09:00:00');
  check('een vervangen beeld krijgt geen eigen klok', fileById(13).expires_at, null);

  // ── DE HEROPENING. Dit is de subtielste van de vijf: een revisie zet closed_at
  // terug op NULL, en zonder deze wis verdwijnt het bronmateriaal 90 dagen na de
  // EERSTE afronding — precies het materiaal dat nodig is voor die revisie.
  clearUploadRetention(env, 1).run();
  check('een heropende bestelling verliest de klok op zijn bronmateriaal',
    fileById(10).expires_at, null);
  check('maar de levering houdt de hare', fileById(11).expires_at, '2027-01-05 09:00:00');

  // ── DE OPRUIMQUERY, met een klok in de toekomst nagebootst door oude datums.
  const expired = db.prepare(EXPIRED_FILES_SQL.replace('?1', '500')).all();
  const ids = expired.map((r) => r.id).sort();
  // 10 en 12: uploads. 10 hoort erbij (afgesloten 10 jan, dus 90 dagen zijn in 2026
  // lang om), 12 niet (nooit afgesloten). 11 en 13 zijn leveringen van januari 2026,
  // dus 12 maanden zijn per vandaag (aug 2026) nog niet om.
  check('de opruimquery vindt het verlopen bronmateriaal', ids.includes(10), true);
  check('en laat een openstaande bestelling staan', ids.includes(12), false);
  check('en een levering van vijf maanden oud blijft ook staan', ids.includes(11), false);
  db.close();
}

/* ══ 1b · DE TERMIJNEN IN DE CODE ZIJN DE TERMIJNEN OP DE PAGINA ═══════════ */
console.log('\nde getallen op de pagina komen overeen met de code');
{
  for (const p of ['src/pages/privacy.astro', 'src/pages/nl/privacy.astro', 'src/pages/terms.astro', 'src/pages/nl/terms.astro']) {
    const body = read(p);
    check(`${p.replace('src/pages/', '')} noemt ${UPLOAD_DAYS} dagen`,
      new RegExp(`${UPLOAD_DAYS} (days|dagen)`).test(body), true);
  }
  for (const p of ['src/pages/privacy.astro', 'src/pages/nl/privacy.astro']) {
    check(`${p.replace('src/pages/', '')} noemt ${DELIVERY_MONTHS} maanden`,
      new RegExp(`${DELIVERY_MONTHS} (months|maanden)`).test(read(p)), true);
  }
  // En de drie plekken die stempelen of opruimen lezen de module in plaats van de
  // getallen te herhalen. Dit is de regel die voorkomt dat er over een jaar 60 dagen
  // in de cron staat en 90 op de site.
  /*
   * ── DEZE LUS STOND ROOD, EN NIET OM DE REDEN DIE HIJ BEDOELDE — 12 aug 2026 ─
   *
   * `src/lib/portal.js` en `src/lib/account.js` stonden in deze lijst en importeren
   * retention.js niet. Ze noemen ook nergens een bewaartermijn: de enige tweecijferige
   * dagvermelding in beide bestanden is een noot over een verzonnen "12 days until
   * renewal"-teller die er juist NIET staat. Er was dus niets om uit de module te halen,
   * en `npm run test:promises` was al rood vóór vanavond — twee regels die niets
   * beschermden en al het andere in dit bestand verdachten.
   *
   * De regel die wél iets betekent is niet "deze vijf bestanden importeren de module"
   * maar "wie een termijn NOEMT, haalt hem uit de module". Zo blijft de bewaking staan
   * (schrijft iemand morgen `90 dagen` in account.js, dan wordt dit rood) en verdwijnt
   * de valse rode regel. De drie bestanden die vandaag wél stempelen of opruimen —
   * close.js, admin.js en cron/index.js — worden onvoorwaardelijk vastgehouden, want
   * daar is het importeren zelf de afspraak.
   */
  for (const p of ['src/lib/close.js', 'src/lib/admin.js', 'cron/index.js']) {
    check(`${p} leest retention.js`, /from '.*retention\.js'/.test(read(p)), true);
  }
  for (const p of ['src/lib/portal.js', 'src/lib/account.js', 'src/lib/feedback.js', 'src/lib/delivery.js']) {
    const code = codeOnly(read(p));
    const noemtTermijn = /\b(UPLOAD_DAYS|DELIVERY_MONTHS)\b/.test(code)
      || /\b(30|60|90|120)\s*(dagen|days)\b/i.test(code)
      || /\b(6|12|18|24)\s*(maanden|months)\b/i.test(code);
    check(`${p} noemt geen termijn buiten retention.js om`,
      !noemtTermijn || /from '.*retention\.js'/.test(read(p)), true);
  }
  for (const p of ['cron/index.js', 'src/lib/close.js', 'src/lib/admin.js']) {
    const code = codeOnly(read(p));
    check(`${p} herhaalt de getallen niet`,
      /'\+\s*\d+\s*(days|months)'/.test(code), false);
  }
}

/* ══════════════════════════════════════════════════════════════════════════════
 * 2 · DE BETAALREGELING IN /terms §9 BESTAAT
 * ══════════════════════════════════════════════════════════════════════════════ */
console.log('\n/terms §9 beschrijft geen betaalregeling die niet bestaat');
{
  /*
   * ── DE VIERDE KEER DAT EEN BRONCONTROLE OP ZIJN EIGEN INHOUD STRUIKELT ──────
   *
   * De eerste versie hiervan verbood het WOORD "instalment", en werd meteen rood op
   * de zin die ik er net had gezet: *"There are no instalments."* Precies de zin die
   * de belofte wegneemt, afgekeurd door de test die de belofte moet weren.
   *
   * Dat is hetzelfde patroon als bij `seeOther(checkout)` in offsite.test.mjs, bij
   * Lucas' citaat "niet €39 - €19" in nav.test.mjs, en bij `.cb-note { display:
   * none }`. Vier keer nu, en de les is elke keer dezelfde en elke keer scherper:
   * ZOEK NAAR DE VORM VAN DE BELOFTE, NIET NAAR HET ONDERWERP. Een tekst die zegt
   * dat iets NIET zo is, gebruikt dezelfde woorden als een tekst die het belooft.
   *
   * Wat hieronder staat is de vorm die de oude alinea had: een percentage, een
   * verdeling in delen, of een eerste termijn die iets in gang zet. Die kun je niet
   * per ongeluk schrijven als je bedoelt dat het er niet is.
   */
  for (const p of ['src/pages/terms.astro', 'src/pages/nl/terms.astro']) {
    const body = codeOnly(read(p));
    check(`${p.replace('src/pages/', '')} belooft geen termijnen`,
      /50\s*%|50\/50|in twee delen|in two parts|first instalment|eerste termijn|aanbetaling/i.test(body), false);
  }
  // En de code die dit zou moeten kunnen, kan het nog steeds niet — dus de tekst mag
  // het ook niet zeggen. Gaat dit ooit gebouwd worden, dan wordt DEZE regel rood en
  // dat is precies het moment om de tekst weer aan te passen.
  const payCode = ['functions/api/order.js', 'src/lib/quote.js', 'src/data/pricing.js']
    .map((p) => codeOnly(read(p))).join('\n');
  check('en de betaalcode kent nog geen termijnen',
    /\b(deposit|instalment|installment|aanbetaling|eerste termijn)\b/i.test(payCode), false);
  /*
   * ── OP DE POORT, NIET OP DE TEKST VAN DE REGEL — 10 augustus 2026 ─────────
   *
   * Hier stond een controle op de letterlijke bron: `svc === 'test-sample' &&
   * env.MOLLIE_API_KEY`. Die viel om zodra er `orderId &&` tussen kwam, terwijl die
   * toevoeging juist de reparatie was van de ernstigste fout die deze flow had. Zesde keer
   * in dit project dat een test op zijn eigen zin staat in plaats van op wat er moet
   * gelden.
   *
   * Wat er moet gelden: ELK pad dat een Mollie-betaling aanmaakt, staat achter `orderId`.
   * Zonder die poort wordt er een echte betaling gemaakt voor een bestelling die niet in de
   * database staat — de klant betaalt, de webhook vindt niets en antwoordt 200, en Mollie
   * stopt met opnieuw aanbieden. Geld binnen, geen bestelling, geen spoor.
   */
  {
    const order = codeOnly(read('functions/api/order.js'));
    /* Per REGEL en niet met een haakjes-regex: de eerste poort bevat
       `isPayableService(svc)`, dus een patroon dat op ')' stopt vindt hem niet. */
    const gates = order.split('\n').filter((l) => /^\s*if \(.*MOLLIE_API_KEY/.test(l));
    check('er zijn twee plekken die een betaling kunnen maken', gates.length, 2);
    check('en allebei staan achter orderId', gates.every((g) => /\borderId\b/.test(g)), true);
    /* En als `orderId` null is, moet iemand het HOREN — anders maakt de poort hierboven
     * de fout alleen maar stiller dan hij al was: de klant krijgt een bevestiging, er is
     * geen betaallink, en het enige spoor is een consoleregel in een omgeving zonder
     * logbewaring (`[observability]` staat in geen van beide wrangler.toml's).
     *
     * Op het onderwerp van die mail en niet op een functienaam: de melding is een inline
     * sendMail() in dit bestand, en de vraag die vast moet staan is of hij bestaat en
     * achter `orderRowMissing` hangt — niet hoe hij heet. */
    check('een verloren bestelling wordt gemeld', /Bestelling niet weggeschreven/.test(order), true);
    check('en die melding hangt aan het ontbreken van de rij', /orderRowMissing/.test(order), true);
  }
  for (const p of ['src/pages/terms.astro', 'src/pages/nl/terms.astro']) {
    check(`${p.replace('src/pages/', '')} noemt VISUAILS Studio als betaalplek`,
      /VISUAILS Studio/.test(read(p)), true);
  }
}

/* ══════════════════════════════════════════════════════════════════════════════
 * 3 · /ai-act §6 ZEGT IN TWEE TALEN HETZELFDE
 *
 * De directe wachter op de fout die ik zelf maakte: de Nederlandse tak herschreven
 * en de Engelse laten staan, waardoor er een halve dag twee tegengestelde
 * beweringen over dezelfde wettelijke verplichting op de site stonden.
 * ══════════════════════════════════════════════════════════════════════════════ */
console.log('\n/ai-act §6: de twee talen beweren hetzelfde');
{
  const page = read('src/components/AiActPage.astro');
  const body = codeOnly(page);

  // De verworpen bewering, in beide talen, mag nergens meer staan.
  check('"we add nothing" staat er niet meer', /we add nothing/i.test(body), false);
  check('"wij voegen niets toe" ook niet', /voegen (wij|we) niets toe/i.test(body), false);

  // En beide talen zeggen wél dat wij schrijven.
  check('de Engelse tekst zegt dat wij de tag schrijven',
    /We write an IPTC DigitalSourceType tag into every delivered file/.test(body), true);
  check('de Nederlandse tekst zegt dat ook',
    /Wij schrijven in elk geleverd bestand een IPTC DigitalSourceType-tag/.test(body), true);

  // Beide noemen de webp expliciet, want dat is het formaat waar de bewering het
  // meest kan verrassen — de omzetting gooit weg wat de aanbieder erin zette.
  const en = body.slice(0, body.indexOf('Elk bestand dat wij leveren'));
  const nl = body.slice(body.indexOf('Elk bestand dat wij leveren'));
  for (const [lang, part] of [['en', en], ['nl', nl]]) {
    check(`${lang}: noemt de webp`, /webp/i.test(part), true);
    check(`${lang}: noemt de datum 2 december 2026`, /2 (December|december) 2026/.test(part), true);
    check(`${lang}: zegt dat het geen garantie is`,
      /(not a guarantee|geen garantie)/i.test(part), true);
    check(`${lang}: en dat de zichtbare vermelding telt`,
      /(disclosure that counts|vermelding die telt)/i.test(part), true);
  }

  /* ── EN HET BESTELFORMULIER ZEGT NIET HET OMGEKEERDE — 14 AUGUSTUS 2026 ────
   *
   * Deze sectie bewaakte alleen /ai-act, en dat is de pagina die het GOED had.
   * src/data/channels.js vertelde ondertussen elke klant die een marktplaats of
   * Google Shopping aanvinkte dat onze webp de AI-vermelding NIET draagt — op
   * drie plekken: de Google-note, `COPY.format` in beide talen, en de redenering
   * in de bestandskop die de foute zin bij de volgende bewerking terugschrijft.
   *
   * Die zin was waar tot 9 augustus 2026. Sindsdien tagt scripts/deliver.mjs ná
   * de conversie, in alle drie de formaten, en tag-delivery.mjs draagt de meting:
   * een getagde webp krijgt VP8X- en XMP-chunks en decodeert gewoon.
   *
   * Wat dat een klant kostte: wie op Google Shopping verkoopt, las in het
   * bestelformulier dat de webp de eigenschap mist die Google eist, gooide elke
   * webp weg en uploadde de zwaardere jpg — op advies dat onwaar was. En las
   * daarna op /ai-act het omgekeerde, op de pagina die er precies voor bestaat
   * om te zeggen wat wij wel en niet beweren over AI-herkomst.
   *
   * De toets kijkt naar de BEWERING en niet naar een formulering: nergens in dat
   * bestand mag nog staan dat de webp hem niet draagt of dat de omzetting hem
   * bij ons weghaalt. */
  const ch = read('src/data/channels.js');
  check('channels.js beweert nergens dat onze webp de tag mist',
    /(a webp does not|webp niet, omdat)/i.test(ch), false);
  check('en nergens dat de omzetting hem bij ons weghaalt',
    /(which webp conversion strips|die webp-omzetting eruit haalt)/i.test(ch), false);
  check('de Google-note zegt dat elk formaat hem draagt',
    /(Every format we deliver carries it|Elk formaat dat wij leveren draagt hem)/.test(ch), true);
}

/* ══════════════════════════════════════════════════════════════════════════════
 * 4 · DE ADMINROUTE KIJKT DE TAG NA
 * ══════════════════════════════════════════════════════════════════════════════ */
console.log('\nde adminroute meldt een levering zonder herkomsttag');
{
  // De waarde staat op één plek en de schrijver leest die plek.
  check('COMPOSITE is de IPTC-url', COMPOSITE.startsWith(MARKER), true);
  check('aitag.mjs definieert de waardes niet zelf',
    /const BASE = /.test(codeOnly(read('scripts/lib/aitag.mjs'))), false);
  check('aitag.mjs leest src/lib/iptc.js',
    /from '\.\.\/\.\.\/src\/lib\/iptc\.js'/.test(read('scripts/lib/aitag.mjs')), true);

  // De lezer vindt de tag in bytes, en vindt hem niet als hij er niet staat.
  const withTag = new TextEncoder().encode(`\x00\x01binaire rommel <xmp>${COMPOSITE}</xmp> meer rommel\xff`);
  const without = new TextEncoder().encode('\x00\x01binaire rommel zonder tag\xff');
  check('een getagd bestand wordt herkend', hasProvenanceTag(withTag), true);
  check('een ongetagd bestand ook', hasProvenanceTag(without), false);
  check('een leeg bestand valt niet om', hasProvenanceTag(new Uint8Array(0)), false);
  // Een tag die precies aan het einde staat — de klassieke off-by-one in een
  // eigen zoekfunctie. Vandaar deze.
  check('een tag helemaal aan het einde wordt gevonden',
    hasProvenanceTag(new TextEncoder().encode('xx' + COMPOSITE)), true);

  check('een png wordt gecontroleerd', isScannable('voorkant.png', 1024), true);
  check('een video niet', isScannable('clip.mp4', 1024), false);
  check('en een te groot bestand ook niet', isScannable('groot.png', MAX_SCAN_BYTES + 1), false);

  // En het adminportaal doet er iets mee.
  const admin = read('src/lib/admin.js');
  check('admin.js controleert bij het uploaden', /if \(isScannable\(clean, file\.size\)\)/.test(admin), true);
  check('en meldt wat er mist', /untagged\.length/.test(admin), true);
  check('en noemt het commando om het te herstellen', /npm run tag:delivery/.test(admin), true);

  /*
   * ── GEEN BLOKKADE, EN NIET GETEST OP MIJN EIGEN ZIN ───────────────────────
   *
   * Hier stond een controle op de letterlijke paginatitel: `title: 'Upload — geen
   * herkomsttag'`. Op 10 augustus 2026 kwam er een tweede waarschuwing bij op datzelfde
   * scherm, de titel werd afhankelijk van welke van de twee er speelt, en deze regel
   * viel om — terwijl er precies niets stuk was aan wat hij hoort te bewaken.
   *
   * Vijfde keer in dit project dat een test op de tekst van een boodschap staat in
   * plaats van op wat die boodschap moet DOEN. Wat het moet doen is: een pagina
   * teruggeven en géén foutcode, want de bestanden zijn opgeslagen. Dus wordt de
   * waarschuwingstak uit de bron gehaald en daarop nagekeken.
   */
  const branch = (() => {
    const i = admin.indexOf('if (untagged.length');
    if (i < 0) return '';
    return admin.slice(i, admin.indexOf('return seeOther(', i));
  })();
  check('er is een waarschuwingstak', branch.length > 0, true);
  check('die een pagina teruggeeft', /return html\(page\(/.test(branch), true);
  check('en geen foutcode — de bestanden zijn opgeslagen', /\}\)\s*,\s*(4|5)\d\d\s*\)/.test(branch), false);
  check('de 500 zit alleen bij echt mislukte uploads', /if \(failed\.length\) \{[\s\S]{0,400}?\}\), 500\)/.test(admin), true);

  /*
   * ── EN DE TWEEDE WAARSCHUWING OP DAT SCHERM ───────────────────────────────
   *
   * Gemeten op 10 augustus 2026 in de eerste volledige back-up: `preview_key` is NULL op
   * alle vijftien geleverde beelden, en drie bestellingen wegen 33,1 / 24,6 / 18,4 MB.
   * Het bord vult die kolom niet (alleen scripts/deliver.mjs doet dat), en het portaal
   * valt terug op `preview_key || r2_key`. Zonder melding is dat onzichtbaar tot een
   * klant met een telefoon een pagina van dertig megabyte opent.
   */
  check('het bord meet het gewicht van de portaalpagina', /PORTAL_WEIGHT_WARN/.test(admin), true);
  check('alleen levende beelden tellen mee', /superseded_at IS NULL[\s\S]{0,80}\)\.bind\(orderId\)/.test(admin), true);
  check('en het noemt npm run deliver als uitweg', /npm run deliver/.test(admin), true);
  check('een mislukte meting blokkeert de upload niet', /catch \{\s*return null;\s*\}/.test(admin), true);
}

/* ══════════════════════════════════════════════════════════════════════════════
 * 5 · GEEN HARDE LEVERTERMIJN WAAR DE POORT ER GEEN GEEFT
 * ══════════════════════════════════════════════════════════════════════════════ */
console.log('\ngeen belofte van twee werkdagen buiten de gesanctioneerde tekst');
{
  // pricing.js is de enige plek die mag zeggen hoe lang iets duurt. De tekst daar
  // is "meestal 2-4 werkdagen" voor kleine bestellingen; een pagina die "twee
  // werkdagen" belooft, belooft iets scherper dan het mechanisme kan houden.
  const pages = [
    'src/pages/about.astro', 'src/pages/nl/about.astro',
    'src/pages/contact.astro', 'src/pages/nl/contact.astro',
    'src/components/HomeV2.astro', 'src/components/StudioPage.astro',
  ];
  for (const p of pages) {
    const body = codeOnly(read(p));
    check(`${p.split('/').pop()} belooft geen twee werkdagen`,
      /(binnen twee werkdagen|within two working days|twee werkdagen,)/i.test(body), false);
  }
  // En de gesanctioneerde tekst staat er nog wel, want die MOET blijven.
  const pricing = read('src/data/pricing.js');
  check('pricing.js houdt de enige toegestane termijn', /Meestal 2–4 werkdagen/.test(pricing), true);
  check('en de Engelse tegenhanger', /Typically 2–4 working days/.test(pricing), true);
}

/* ══════════════════════════════════════════════════════════════════════════════
 * 6 · DE VERVALLEN RESERVERING KOMT VRIJ
 * ══════════════════════════════════════════════════════════════════════════════ */
console.log('\neen onbetaalde reservering blokkeert de agenda niet voor altijd');
{
  const cap = read('functions/api/capacity.js');
  check('de capaciteitsquery leest window_expires_at', /window_expires_at <= datetime\('now'\)/.test(cap), true);
  check('en alleen bij onbetaald', /COALESCE\(payment_status, 'unpaid'\) = 'unpaid'/.test(cap), true);

  /* ── EN DE BOEKINGSPOORT LEEST HEM OOK — 14 AUGUSTUS 2026 ──────────────────
   *
   * Deze toets keek alleen naar capacity.js, en dat was precies de helft. De
   * kop van readCalendar() in functions/api/order.js beloofde de query van
   * capacity.js "deliberately and exactly" te spiegelen, en deed dat drie van de
   * vier filters lang: de vervalclausule ontbrak. De pagina bood een dag dus aan
   * en het endpoint weigerde hem, met een banner die zei dat het venster net weg
   * was — en de bestelling werd op dat pad niet weggeschreven.
   *
   * Twee bestanden en geen gedeelde module, want het zijn twee Functions. Dus is
   * dit de plek waar ze aan elkaar gehouden worden: allebei dezelfde twee
   * regels, woordelijk. */
  const ord = read('functions/api/order.js');
  check('de boekingspoort leest window_expires_at ook',
    /window_expires_at <= datetime\('now'\)/.test(ord), true);
  check('en ook daar alleen bij onbetaald',
    /COALESCE\(payment_status, 'unpaid'\) = 'unpaid'/.test(ord), true);

  const cron = read('cron/index.js');
  check('de cron geeft de reservering ook echt vrij',
    /SET window_start = NULL, window_end = NULL, window_expires_at = NULL/.test(cron), true);
  check('en gooit de bestelling niet weg', /DELETE FROM orders/.test(cron), false);
  check('en schrijft het op de tijdlijn', /INSERT INTO order_events/.test(cron), true);
}

/* ══════════════════════════════════════════════════════════════════════════════
 * 7 · DE CRON-WORKER IS ÉÉN PROJECT MET DE JUISTE BINDINGS
 *
 * Een cron-worker met een andere database_id draait elke nacht vrolijk op niets en
 * meldt dat er niets te doen was. Dat is de stilste manier waarop dit kan mislukken,
 * dus staat het hier.
 * ══════════════════════════════════════════════════════════════════════════════ */
console.log('\nde cron-worker kijkt naar dezelfde database als de site');
{
  const site = read('wrangler.toml');
  const cron = read('cron/wrangler.toml');
  const grab = (src, key) => (src.match(new RegExp(`${key}\\s*=\\s*"([^"]+)"`)) || [])[1];

  check('dezelfde database_id', grab(cron, 'database_id'), grab(site, 'database_id'));
  check('dezelfde bucket_name', grab(cron, 'bucket_name'), grab(site, 'bucket_name'));
  check('een eigen naam', grab(cron, 'name') !== grab(site, 'name'), true);
  check('en een cron-trigger', /crons = \["[^"]+"\]/.test(cron), true);
  // Geen secret in het bestand — zelfde regel als voor de site.
  check('geen sleutel in de toml', /RESEND_API_KEY\s*=/.test(cron.replace(/^#.*$/gm, '')), false);

  const idx = read('cron/index.js');
  check('er is een scheduled-handler', /async scheduled\(event, env, ctx\)/.test(idx), true);
  check('elke taak valt apart om', /catch \(err\) \{[\s\S]{0,200}problems\.push/.test(idx), true);
  check('R2 gaat vóór de rij', idx.indexOf('UPLOADS.delete') < idx.indexOf('DELETE FROM files'), true);
  check('de varianten uit 0022 gaan mee', /FROM file_assets WHERE file_id IN/.test(idx), true);
  check('facturen worden niet opnieuw genummerd', /issueInvoice\(/.test(codeOnly(idx)), false);
}

/* ══ DE TWEE TALEN BELOVEN HETZELFDE ═══════════════════════════════════════
 *
 * TIERS.attended.turnaround staat op veertien pagina's per taal, en de twee
 * regels hebben twee keer iets anders gezegd:
 *
 *   · vóór 8 augustus 2026 — NL "een leverdatum met 48 uur werk erin". Dat gaat
 *     over hoeveel uur wij eraan werken en zegt niets over snelheid.
 *   · daarna, tot 18 augustus — NL "levering binnen 48 uur vanaf je
 *     leverdatum". De reparatie schoot door: EN belooft een gereserveerd BLOK,
 *     NL beloofde LEVERING BINNEN. Een zwaardere toezegging, in de taal van de
 *     thuismarkt, en in strijd met capacity.js — die zegt met zoveel woorden
 *     dat 48 uur nooit als aftelling aan een klant wordt verteld, omdat een
 *     venster dat vrijdag opengaat vrijdag en maandag loopt.
 *
 * Twee keer dezelfde regel, twee keer mis, en beide keren pas gevonden door hem
 * naast de Engelse te leggen. Vandaar deze test: niet WELKE woorden er staan,
 * maar dat geen van beide talen iets belooft wat de ander niet belooft.
 */
console.log('\nde levertijdbelofte is in beide talen dezelfde belofte');
{
  const en = TIERS.attended.turnaround.en;
  const nl = TIERS.attended.turnaround.nl;

  /* Geen van beide mag LEVERING BINNEN een termijn beloven. Het aanbod is een
     blok dat wordt vrijgehouden; wanneer het geleverd wordt, staat als datum in
     de bevestiging en niet als aftelling in een tariefkaart. */
  check('en belooft geen levering binnen een termijn', /deliver\w* (with)?in \d/i.test(en), false);
  check('nl belooft geen levering binnen een termijn', /levering binnen \d|geleverd binnen \d/i.test(nl), false);

  /* Beide noemen wél het getal en beide zeggen dat het vooraf vaststaat — dat
     is de belofte die er wel is. */
  check('en noemt de 48 uur', /48/.test(en), true);
  check('nl noemt de 48 uur', /48/.test(nl), true);
  check('en zegt dat het vooraf vaststaat', /before you pay/i.test(en), true);
  check('nl zegt dat het vooraf vaststaat', /voordat je betaalt/i.test(nl), true);

  /* En capacity.js blijft de bron van wat 48 uur betekent. Verandert WINDOW_DAYS,
     dan klopt de zin niet meer en hoort iemand hier langs te komen. */
  check('een venster is twee werkdagen', WINDOW_DAYS, 2);
}

/* ══ GETYPTE AANTALLEN TEGEN DE ECHTE LIJSTEN ══════════════════════════════
 *
 * HERONTWERP.md §2.9. Op de gebouwde site staan zinnen als "de tien gezichten"
 * (88 pagina's), "vier huisstijlen" en "drie diensten". Ze KLOPPEN vandaag
 * allemaal — nagemeten — en dat is precies waarom ze gevaarlijk zijn: het
 * eerstvolgende model dat aan de roster wordt toegevoegd, maakt van tweeënnegentig
 * pagina's een leugen, en niets valt om.
 *
 * WAAROM EEN TEST EN GEEN AFGELEIDE ZIN. De copy zou het aantal uit de bron
 * kunnen halen — `${ROSTER.length} gezichten` — en op sommige plekken gebeurt dat
 * al. Maar "de tien gezichten" is lopende zin, geen cijfer in een tegel: er staat
 * een lidwoord voor en een komma achter, en in twee talen met een ander
 * meervoud. Elke zin met een sjabloon erin zou hem stroever maken om iets te
 * beschermen dat maar één keer per jaar verandert.
 *
 * Deze test doet het omgekeerde: de zin blijft gewoon een zin, en de DAG dat de
 * lijst verandert, wordt hij rood en zegt hij welk woord waar aangepast moet
 * worden. Dat is het goedkoopste moment om het te weten.
 */
console.log('\ngetypte aantallen kloppen nog met de lijsten waar ze over gaan');
{
  const woord = { 3: ['three', 'drie'], 4: ['four', 'vier'], 5: ['five', 'vijf'], 10: ['ten', 'tien'] };
  const bron = readFileSync(new URL('../src/components/order/ModelPicker.astro', import.meta.url), 'utf8');

  /* De roster. Twee zinnen, één per taal, allebei met het aantal uitgeschreven. */
  const [enW, nlW] = woord[ROSTER.length] || [];
  check(`het aantal gezichten (${ROSTER.length}) heeft een woord`, Boolean(enW), true);
  if (enW) {
    check(`de Engelse zin zegt "${enW} faces"`, bron.includes(`${enW} faces`), true);
    check(`de Nederlandse zin zegt "${nlW} gezichten"`, bron.includes(`${nlW} gezichten`), true);
  }

  /* De huisstijlen. styles.js draagt er vijf, maar Custom is er geen — die heeft
     geen moodTitle en wél een orderHref, want hij is de bespoke-uitweg en niet
     een look waaruit je kiest. Het getal in de copy is dus het aantal ECHTE
     stijlen, en die afleiding staat hier zodat hij niet nog eens geraden wordt. */
  const echteStijlen = styles.filter((s2) => s2.moodTitle).length;
  const [enS, nlS] = woord[echteStijlen] || [];
  check(`het aantal huisstijlen is ${echteStijlen}`, echteStijlen >= 1, true);
  const start = readFileSync(new URL('../src/components/StartPage.astro', import.meta.url), 'utf8');
  if (enS) {
    check(`StartPage zegt "${enS} house styles"`, start.includes(`${enS} house styles`), true);
    check(`en "${nlS} huisstijlen"`, start.includes(`${nlS} huisstijlen`), true);
  }
}

/* ══ DESIGN.md BESCHRIJFT DE GEBOUWDE SITE ═════════════════════════════════
 *
 * HERONTWERP.md §2.11. DESIGN.md heeft vier paletten beschreven en liet er drie
 * als tabel staan. Gevolg: `#90BEFF` — het lichtblauw van sectie 18 — stond er
 * op vier plekken nog in terwijl global.css al maanden `#C6F100` draagt. Een
 * ontwerpbestand is het eerste waar iemand een waarde uit overneemt, dus een
 * verouderde tabel is geen documentatieschuld maar een val.
 *
 * Deze test leest de tokens uit global.css en eist dat elke hexwaarde die
 * DESIGN.md als TOKENWAARDE noemt, ook echt in het stylesheet staat. Niet
 * andersom: het stylesheet mag kleuren hebben die het ontwerpbestand niet
 * uitschrijft. Wat verboden is, is het omgekeerde — een waarde documenteren die
 * nergens bestaat.
 *
 * De uitzondering die met zoveel woorden is toegestaan: een hex in een noot die
 * uitlegt wat er VROEGER stond. Die staat er juist om te voorkomen dat iemand de
 * oude waarde terugzet, en hij is te herkennen aan het woord "tot" of "was" in
 * dezelfde regel. Zonder die uitzondering zou deze test de enige goede manier om
 * een palet af te schrijven, verbieden.
 */
console.log('\nDESIGN.md noemt geen kleuren die de site niet heeft');
{
  const css = readFileSync(new URL('../src/styles/global.css', import.meta.url), 'utf8');
  const design = readFileSync(new URL('../DESIGN.md', import.meta.url), 'utf8');
  /* ZONDER COMMENTAAR, en dat is de reparatie die deze test pas bruikbaar maakt.
     Eerste versie las global.css inclusief noten — en daar staat, bij het accent,
     letterlijk *"Was #90BEFF, a light blue, until August 2026"*. Die ene regel zet
     de oude waarde in de verzameling van "kleuren die de site heeft", en dus kon
     DESIGN.md het afgeschreven accent gewoon blijven noemen zonder rood te worden.
     Bewezen door precies dat te doen: het accent in DESIGN.md terugzetten op
     #90BEFF liet de test groen. Nu niet meer. */
  const cssCode = css.replace(/\/\*[\s\S]*?\*\//g, '');
  const inCss = new Set([...cssCode.matchAll(/#([0-9a-fA-F]{6})\b/g)].map((m) => m[1].toUpperCase()));

  /* EEN AFGESCHREVEN PARAGRAAF TELT NIET MEE, en dat is geen achterdeur maar de
     enige manier waarop een palet netjes afgeschreven KAN worden. Een kop met
     "INGETROKKEN" erin zet alles eronder buiten deze controle tot de volgende
     `## `-kop; de tabellen blijven staan als verantwoording van de methode, en
     de waarden erin gelden aantoonbaar niet meer. Zonder deze uitzondering zou
     de test eisen dat oude paletten worden gewist, en dan is de reden waarom er
     iets veranderde ook weg. */
  let ingetrokken = false;
  const spook = [];
  for (const regel of design.split('\n')) {
    if (/^#{2,3}\s/.test(regel)) ingetrokken = /INGETROKKEN|RETIRED|SUPERSEDED/i.test(regel);
    // Alleen regels die een hex als WAARDE van een token opvoeren.
    if (!/`--[a-z0-9-]+`/.test(regel) && !/\| `#/.test(regel)) continue;
    if (/\b(tot|was|voorheen|until|previously)\b/i.test(regel)) continue;   // een noot over het verleden
    if (ingetrokken) continue;                                               // een afgeschreven paragraaf
    for (const m of regel.matchAll(/#([0-9a-fA-F]{6})\b/g)) {
      if (!inCss.has(m[1].toUpperCase())) spook.push(`#${m[1]} — ${regel.trim().slice(0, 72)}`);
    }
  }
  check('geen tokenwaarde in DESIGN.md die global.css niet kent', spook, []);

  /* En het accent bij name, want dat is de waarde die drie keer is verhuisd en
     die op elke pagina te zien is. */
  const accent = /--accent:\s*(#[0-9a-fA-F]{6})/.exec(css)?.[1];
  check('global.css draagt een accent', Boolean(accent), true);
  check('en DESIGN.md noemt datzelfde accent', design.includes(accent), true);
}

/*
 * ═══════════════════════════════════════════════════════════════════════════════
 * DE HOMEPAGE BELOOFT GEEN BEREIK, OOK NIET IN EEN BAAT — 18 AUGUSTUS 2026
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Het Hooks-blok op de homepage stelt de regel zelf: *"Wat wij verkopen: het
 * format en de uitvoering. Geen bereik — of een post ergens terechtkomt hangt af
 * van het platform en van timing, en die twee zijn niet aan ons om te beloven."*
 *
 * Drie schermen hoger stond op de videokaart "Subtle motion that lifts
 * click-through where a still photo plateaus". Dat is precies wat die regel
 * verbiedt, in dezelfde talige stroom, op dezelfde pagina — en het viel niet op
 * omdat het als BAAT geschreven was en niet als belofte. Vandaar dat deze toets
 * op de baatregels van de dienstkaarten kijkt en niet op de pagina als geheel.
 *
 * En de tweede helft: de twee talen beschreven dezelfde vier producten
 * verschillend. De Engelse kaarten hadden op twee van de vier een baat, de
 * Nederlandse op nul. Eén tekst in twee talen, niet twee teksten.
 */
console.log('\nde dienstkaarten op de homepage beloven niets buiten de studio');
{
  const home = read('src/components/HomeV2.astro');

  /* Alleen de svc-tabellen, en zonder commentaar: de noot erboven CITEERT de
     verwijderde zin, en een toets die zijn eigen toelichting leest, faalt op de
     reparatie in plaats van op de fout. Dit is in deze repository al vier keer
     misgegaan. */
  const tabellen = [...home.matchAll(/svc: \[([\s\S]*?)\n    \],/g)].map((m) => m[1]);
  check('er staan twee svc-tabellen (en, nl)', tabellen.length, 2);

  const kaarten = tabellen.map((t) =>
    [...t.matchAll(/\[\s*\n\s*'([^']+)',\s*\n\s*'([^']+)',/g)].map((m) => ({ naam: m[1], baat: m[2] })));
  check('en elk vier kaarten', kaarten.map((k) => k.length), [4, 4]);

  /* Wat een baat NIET mag noemen: iets waar het platform over gaat. Geen van
     deze woorden is op zichzelf verboden op de site — ze mogen alleen niet in
     de zin staan waarin de studio zegt wat je eraan hebt. */
  const BUITEN = /click-?through|doorklik|bereik\b|reach\b|impressie|engagement|volgers|followers|conversie|conversion|meer verkopen|sell more|viral/i;
  for (const set of kaarten) {
    for (const k of set) {
      check(`"${k.naam}" belooft niets van het platform`, BUITEN.test(k.baat), false);
    }
  }

  /* En de talen blijven aan elkaar gekoppeld: even veel kaarten, in dezelfde
     volgorde van diensten. De TEKST mag verschillen — het zijn twee talen — maar
     een kaart die in één taal een baat heeft en in de andere niet, is de drift
     die deze sectie heeft gevonden. Een baat herken je hier aan wat hij NIET is:
     een opsomming van wat er geleverd wordt. */
  const FEITELIJK = /^\d|beelden per product|images per product|Eén korte|One short|Eén keer opgezet|Set up once/;
  for (const [i, set] of kaarten.entries()) {
    const zonder = set.filter((k) => FEITELIJK.test(k.baat)).map((k) => k.naam);
    check(`tabel ${i + 1}: geen kaart begint met het feit in plaats van de baat`, zonder, []);
  }
}

console.log(`\n${pass}/${pass + fail} passed`);
if (fail) process.exit(1);
