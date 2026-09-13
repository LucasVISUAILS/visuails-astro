/* VISUAILS — de vorm van het btw-nummer. 12 september 2026.
 *
 *   npm run test:btwvorm
 *
 * Lucas: *"Ook had hij een test order geplaatst met btwnummer NL000 die gewoon
 * doorkwam terwijl dit uiteraard geen goed btwnummer is. Klopt dit wel dat hij
 * dan alsnog door kon bestellen of maakt dat niet uit voor de rest."*
 *
 * ── WAT HIER BEWAAKT WORDT, EN WAAROM HET TWEE DINGEN ZIJN ──────────────────
 *
 * Het antwoord op zijn vraag heeft twee helften, en ze kunnen los van elkaar
 * stukgaan:
 *
 *   1 · HET TARIEF WAS GOED, EN MOET GOED BLIJVEN. Een Nederlandse klant
 *       betaalt 21%, wat er ook in het btw-veld staat. Zou iemand ooit
 *       vatDecision() "handiger" maken door bij een ingevuld nummer te
 *       verleggen, dan lekt er 21% weg op élke Nederlandse zakelijke
 *       bestelling — en dat komt uit de marge van VISUAILS, niet uit die van
 *       de klant. Sectie 1 meet dat, met `NL000` erbij als de letterlijke
 *       invoer uit zijn melding.
 *
 *   2 · HET NUMMER ZELF WAS FOUT, EN MOET NU WORDEN TEGENGEHOUDEN. Niet omdat
 *       het geld kost, maar omdat het via upsertCustomer() in
 *       `customers.vat_number` belandt en daarmee op de factuur staat — en op
 *       elke volgende factuur van die klant.
 *
 * En één ding dat NIET bewaakt hoort te worden met een lange lijst geldige
 * nummers per land: dat is de taak van VIES, en die staat al in vies.js. Wat
 * hier gemeten wordt is dat een echt nummer er niet per ongeluk uitvliegt —
 * een te strenge vorm kost een klant, en dat is duurder dan een verkeerd
 * nummer op een factuur.
 */
import { readFileSync } from 'node:fs';

let pass = 0, fail = 0;
function ok(naam, voorwaarde, verwacht = 'true', kreeg = 'false') {
  if (voorwaarde) { pass++; console.log(` ok   ${naam}`); }
  else { fail++; console.log(` FAIL ${naam}   verwacht ${verwacht}  kreeg ${kreeg}`); }
}
const lees = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');

console.log('\nVISUAILS — de vorm van het btw-nummer\n');

const {
  vatDecision, VAT_TREATMENT, vatFormatOk, vatShape, vatFormatError,
  EU_COUNTRIES, HOME_COUNTRY,
} = await import('../src/data/vat.js');
const { VAT_RATE } = await import('../src/data/pricing.js');

/* ══ 1 · HET TARIEF HANGT NIET AAN HET VELD ═══════════════════════════════ */
console.log('een Nederlandse klant betaalt het volle tarief, wat hij ook invult');
{
  for (const ingevuld of ['NL000', 'NL005407575B96', '', 'onzin', 'NL999999999B99']) {
    const d = vatDecision({ country: 'NL', vatValid: true });
    ok(`  met "${ingevuld}" in het veld: ${VAT_RATE * 100}%`,
      d.rate === VAT_RATE && d.treatment === VAT_TREATMENT.standard,
      `${VAT_RATE} / standard`, `${d.rate} / ${d.treatment}`);
  }
  /* De omkering, want dit is de regel die geld kost als hij wegvalt: verleggen
     mag alleen bij een ANDER EU-land én een bevestigd nummer. */
  ok('een Duits bedrijf met bevestigd nummer krijgt 0%',
    vatDecision({ country: 'DE', vatValid: true }).rate === 0);
  ok('  maar zonder bevestiging niet',
    vatDecision({ country: 'DE', vatValid: false }).rate === VAT_RATE);
}

/* ══ 2 · EN DE VORM WORDT WÉL GECONTROLEERD ═══════════════════════════════ */
console.log('\nde vorm van het nummer wordt gecontroleerd');
{
  ok('NL000 wordt afgekeurd', vatFormatOk('NL', 'NL000') === false, false, vatFormatOk('NL', 'NL000'));
  ok('  en een echt nummer niet', vatFormatOk('NL', 'NL005407575B96') === true);

  /* De vier schrijfwijzen waarin een Nederlander zijn eigen nummer intypt. Elk
     hiervan afkeuren is een klant kwijtraken op een typefout die er geen is. */
  for (const vorm of ['NL005407575B96', '005407575B96', 'NL 0054 07575 B96', 'nl005407575b96', 'NL-005407575-B96']) {
    ok(`  "${vorm}" telt als hetzelfde nummer`, vatFormatOk('NL', vorm) === true, true, vatFormatOk('NL', vorm));
  }

  /* Bijna goed is fout: dit is precies het geval waar een lengtecontrole alleen
     niet genoeg is, en waarom Nederland als enige een exacte vorm heeft. */
  ok('acht cijfers in plaats van negen wordt afgekeurd', vatFormatOk('NL', 'NL12345678B01') === false);
  ok('zonder de B wordt afgekeurd', vatFormatOk('NL', 'NL00540757596') === false);

  /* Een prefix die niet bij het land hoort. Twee mogelijkheden — verkeerd land
     aangewezen of verkeerd nummer geplakt — en de klant wil ze allebei weten
     vóór hij betaalt. */
  ok('een Duits nummer bij Nederland wordt afgekeurd', vatFormatOk('NL', 'DE123456789') === false);
  ok('  en andersom ook', vatFormatOk('DE', 'NL005407575B96') === false);
  /* Griekenland heeft twee codes (GR in ISO, EL bij de btw) en beide horen te
     werken — zie viesCode() in vat.js. */
  ok('Griekenland mag EL of GR schrijven',
    vatFormatOk('GR', 'EL123456789') === true && vatFormatOk('GR', 'GR123456789') === true);
}

/* ══ 3 · GEEN OORDEEL IS IETS ANDERS DAN AFKEUREN ═════════════════════════
   Dit is het verschil waar de server op leunt: hij stuurt alleen terug bij
   `false`. Zou `null` ooit `false` worden, dan kan niemand buiten de EU nog
   bestellen en niemand meer het vinkje "ik heb er geen" gebruiken. */
console.log('\nleeg en onbekend zijn geen fout');
{
  ok('een leeg veld krijgt geen oordeel', vatFormatOk('NL', '') === null, null, vatFormatOk('NL', ''));
  ok('  ook niet met spaties erin', vatFormatOk('NL', '   ') === null);
  ok('buiten de EU wordt niets gecontroleerd', vatFormatOk('US', 'wat dan ook') === null);
  ok('  en zonder land ook niet', vatFormatOk('', 'NL000') === null);
}

/* ══ 4 · ELK EU-LAND HEEFT EEN VORM, EN DIE IS TE GEBRUIKEN ═══════════════
   Een lidstaat zonder vorm is een gat: daar komt alles doorheen. En een vorm
   die geen geldig `pattern`-attribuut is, is een veld dat stil niets doet — de
   browser negeert een patroon dat hij niet kan lezen.

   MET DE v-VLAG, EN DAT IS GEEN DETAIL. Dit stond hier eerst met 'u', en toen
   was deze hele sectie groen terwijl NL000 in Chrome gewoon werd goedgekeurd:
   de HTML-specificatie compileert een `pattern` als `unicodeSets` (v), en daar
   is `[ .-]` — met een kaal koppelteken — een SyntaxError die 'u' wél slikt.
   Chrome meldt dat in de console en beschouwt het veld daarna als geldig, dus
   de controle valt stil weg. De vlag hieronder is het verschil tussen een toets
   die de waarheid meet en een die zichzelf geruststelt. */
console.log('\nelk EU-land heeft een bruikbare vorm');
{
  for (const land of EU_COUNTRIES) {
    const vorm = vatShape(land.id);
    if (!vorm) { ok(`${land.id}: heeft een vorm`, false, 'een vorm', 'null'); continue; }
    let bruikbaar = true;
    try { new RegExp(`^(?:${vorm.pattern})$`, 'v'); } catch { bruikbaar = false; }
    ok(`${land.id}: het patroon is geldig`, bruikbaar, 'een leesbare regex', vorm.pattern);
    /* Het voorbeeld in de foutmelding moet zelf door de controle komen — anders
       staat er een voorbeeld dat we zelf zouden afkeuren. */
    ok(`  en het voorbeeld ${vorm.voorbeeld} komt er zelf door`,
      vatFormatOk(land.id, vorm.voorbeeld) === true, true, vatFormatOk(land.id, vorm.voorbeeld));
  }
  ok('buiten de EU is er geen vorm', vatShape('US') === null);
}

/* ══ 4b · EN HET PATROON KEURT HETZELFDE AF ALS DE SERVER ═════════════════
   vatFormatOk() is de waarheid, maar de klant ziet het patroon. Lopen die twee
   uiteen, dan wordt hij tegengehouden op iets wat de server goed vindt (of, veel
   erger, doorgelaten op iets wat de server weigert — en dan verliest hij zijn
   ingevulde formulier aan een omleiding). Dit meet ze naast elkaar, met de vlag
   die de browser gebruikt. */
console.log('\nhet patroon en de server zijn het eens');
{
  const alsBrowser = (land, waarde) => {
    const vorm = vatShape(land);
    if (!vorm) return null;
    return new RegExp(`^(?:${vorm.pattern})$`, 'v').test(waarde);
  };
  const gevallen = [
    ['NL', 'NL000', false], ['NL', 'NL005407575B96', true], ['NL', '005407575B96', true],
    ['NL', 'nl005407575b96', true], ['NL', 'NL 0054 07575 B96', true], ['NL', 'NL-005407575-B96', true],
    ['NL', 'NL12345678B01', false], ['DE', 'DE123456789', true], ['DE', 'DE000', false],
    ['FR', 'FRXX123456789', true], ['IT', 'IT12345678901', true], ['IT', 'IT123', false],
  ];
  for (const [land, waarde, verwacht] of gevallen) {
    const b = alsBrowser(land, waarde);
    ok(`${land} "${waarde}" → ${verwacht ? 'door' : 'tegengehouden'}`, b === verwacht, verwacht, b);
  }
}

/* ══ 5 · DE MELDING ZEGT WAT DE VORM IS ═══════════════════════════════════ */
console.log('\nde melding noemt een voorbeeld');
{
  const nl = vatFormatError('NL', 'nl');
  const en = vatFormatError('NL', 'en');
  ok('de Nederlandse melding noemt de vorm', nl.includes('NL000000000B00'), 'het voorbeeld', nl);
  ok('  en de Engelse ook', en.includes('NL000000000B00'), 'het voorbeeld', en);
  ok('  en ze zijn niet hetzelfde', nl !== en);
}

/* ══ 6 · DE SERVER WEIGERT, MET ECHTE POSTS ═══════════════════════════════
   De laag die telt. Een `pattern` in het formulier kan verdwijnen bij een
   herschrijving zonder dat er iets stukgaat; dit is wat er werkelijk gebeurt
   met wat er binnenkomt. */
console.log('\nde server weigert een nummer met de verkeerde vorm');
{
  const { onRequestPost } = await import('../functions/api/order.js');
  const post = async (velden) => {
    const fd = new FormData();
    for (const [k, v] of Object.entries(velden)) fd.append(k, String(v));
    let geschreven = 0;
    const env = { DB: { prepare(sql) {
      const st = {
        bind() { if (/INSERT INTO orders/i.test(sql)) geschreven += 1; return st; },
        async first() { return null; }, async run() { return { success: true }; },
        async all() { return { results: [] }; },
      };
      return st;
    } } };
    const res = await onRequestPost({
      request: new Request('https://visuails.com/api/order', { method: 'POST', body: fd }),
      env, waitUntil: () => {},
    });
    return { naar: res.headers.get('location') || '', geschreven };
  };

  const basis = {
    service: 'catalog', email: 'klant@merk.nl', first_name: 'Jan', last_name: 'Jansen',
    brand: 'Merk', products: '3', country: 'NL', back: '/thank-you',
    address_line1: 'Straat 1', postal_code: '1234 AB', city: 'Rotterdam',
    business_declaration: 'yes', business_version: 'v1', phone: '+31 6 12345678',
  };

  const fout = await post({ ...basis, vat: 'NL000' });
  ok('NL000 komt er niet doorheen', /error=vat/.test(fout.naar), 'error=vat', fout.naar || '(geen omleiding)');
  ok('  en er wordt niets weggeschreven', fout.geschreven === 0, 0, fout.geschreven);

  const goed = await post({ ...basis, vat: 'NL005407575B96' });
  ok('een echt nummer wel', !/error=vat/.test(goed.naar) && goed.geschreven > 0,
    'geschreven', `${goed.naar} / ${goed.geschreven}`);

  /* De uitweg die de klant altijd heeft, en die dus moet blijven werken. */
  const geen = await post({ ...basis, no_vat: '1', reg_number: '99742993' });
  ok('zonder nummer + het vinkje komt hij er wel door',
    !/error=vat/.test(geen.naar) && geen.geschreven > 0, 'geschreven', `${geen.naar} / ${geen.geschreven}`);

  const buiten = await post({
    ...basis, country: 'US', vat: 'wat dan ook',
    address_line1: 'Main 1', postal_code: '10001', city: 'New York',
  });
  ok('buiten de EU wordt de vorm niet gecontroleerd',
    !/error=vat/.test(buiten.naar), 'geen vat-fout', buiten.naar);
}

/* ══ 7 · EN DE KLANT ZIET WAAROM ══════════════════════════════════════════
   Een omleiding met `?error=vat` naar een pagina die dat nergens leest, is een
   doodlopende weg: de klant komt terug op een formulier dat er precies zo
   uitziet als voor hij op verzenden drukte. Dezelfde fout stond ooit op
   /test-sample en is daar met data-form-refusal opgelost; dit meet dat hij niet
   terugkomt — ook niet voor `error=phone`, die er sinds 11 september is. */
console.log('\nde weigering is zichtbaar op het formulier');
{
  const flow = lees('src/components/order/OrderFlow.astro');
  for (const code of ['phone', 'vat']) {
    ok(`het bestelformulier leest ?error=${code}`,
      flow.includes(`data-form-refusal="${code}"`), `data-form-refusal="${code}"`, 'niet gevonden');
  }
  /* En het veld vraagt er zelf al om, zodat bijna niemand die omleiding haalt. */
  ok('het btw-veld krijgt een patroon uit het land',
    /syncVatFormat/.test(lees('src/scripts/pipeline.js')), 'syncVatFormat()', 'niet gevonden');

  const plan = lees('src/components/order/PlanPicker.astro');
  ok('het abonnementsformulier heeft een melding voor fout=btw',
    /btw: '/.test(plan), 'een zin bij de sleutel btw', 'niet gevonden');
  ok('  en zet daar ook een patroon op het veld',
    /data-ps-btwvormen/.test(plan), 'de vormen als data', 'niet gevonden');
  ok('de server van het abonnement controleert de vorm',
    /vatFormatOk/.test(lees('functions/api/plan.js')), 'vatFormatOk()', 'niet gevonden');
}

console.log(`\n${pass}/${pass + fail} geslaagd`);
if (fail) process.exitCode = 1;
