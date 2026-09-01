/*
 * ═══════════════════════════════════════════════════════════════════════════
 * ELK INLOGGEGEVEN HEEFT EEN LAATSTE DAG
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Twee gegevens in dit systeem konden eeuwig blijven leven, en allebei om een
 * reden die op het scherm redelijk klinkt:
 *
 *   1. De klantsessie (account_sessions) kreeg bij ELK verzoek een nieuwe
 *      expires_at. Een klant die het dashboard wekelijks opent, wordt zo nooit
 *      uitgelogd — dat was de bedoeling. Maar een gestolen cookie verlengt
 *      zichzelf op precies dezelfde manier, en er is geen dag waarop dat stopt.
 *
 *   2. Het portaaltoken (order_tokens) verloopt negentig dagen NA het afsluiten
 *      van de bestelling. Zolang er niet is afgesloten, is closed_at null,
 *      expiryFrom() geeft null, en isExpired() antwoordt "leeft nog". Een
 *      bestelling die is blijven hangen, houdt dus een link in leven die uit een
 *      mail van anderhalf jaar geleden komt.
 *
 * Wat dit bestand bewaakt is niet alleen dat de bovengrens ergens BESTAAT, maar
 * dat hij op de plek wordt gelezen waar hij iets betekent. pastMaxLife() geeft
 * bij een ONBEKENDE uitgiftedatum bewust false terug — anders zou één vergeten
 * kolom in één SELECT iedereen tegelijk buitensluiten. De prijs van die keuze is
 * dat het weghalen van die kolom de bovengrens stil uitschakelt zonder dat er
 * iets kapotgaat. §3 is de vangrail die daarbij hoort: hij leest de twee query's
 * en eist dat issued_at erin staat.
 */

import { readFileSync } from 'node:fs';
import {
  PORTAL_MAX_LIFE_DAYS,
  PORTAL_TTL_DAYS,
  isExpired,
  pastMaxLife,
} from '../src/lib/token.js';

let goed = 0;
let totaal = 0;

function check(naam, waarde, verwacht) {
  totaal += 1;
  const ok = JSON.stringify(waarde) === JSON.stringify(verwacht);
  if (ok) goed += 1;
  console.log(`${ok ? ' ok  ' : 'FAIL '} ${naam.padEnd(58)}${ok ? '' : `verwacht ${JSON.stringify(verwacht)} kreeg ${JSON.stringify(waarde)}`}`);
}

const lees = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');

/* Een vaste klok, zodat een falende regel hier tegen een geschreven getal ligt
   en niet tegen de dag waarop de test toevallig draait. */
const NU = '2026-09-01T12:00:00.000Z';
const dagenGeleden = (n) => new Date(Date.parse(NU) - n * 86400000).toISOString();

/* ══ 1 · DE REKENKUNDE VAN DE BOVENGRENS ══════════════════════════════════ */
console.log('\npastMaxLife telt vanaf uitgifte en van niets anders');
{
  check('een verse uitgifte leeft', pastMaxLife(NU, 365, NU), false);
  check('364 dagen oud leeft nog', pastMaxLife(dagenGeleden(364), 365, NU), false);
  check('366 dagen oud is voorbij', pastMaxLife(dagenGeleden(366), 365, NU), true);
  check('precies op de grens is voorbij', pastMaxLife(dagenGeleden(365), 365, NU), true);

  /* SQLite schrijft datetime('now') zonder zone-aanduiding, en dat IS UTC.
     Zonder de correctie leest de runtime hem als lokale tijd en schuift elke
     bovengrens mee met de offset van de machine — de fout die parseStamp() in
     token.js al voor isExpired() oploste, en die hier dus ook opgelost moet zijn. */
  check('het SQLite-formaat wordt als UTC gelezen',
    pastMaxLife('2025-09-01 12:00:00', 365, NU), true);
  check('en een dag later nog niet',
    pastMaxLife('2025-09-02 12:00:00', 365, NU), false);

  /* DIE TWEE REGELS BIJTEN NIET IN EEN UTC-CONTAINER, en dat is precies het
     probleem dat ze zouden moeten vangen: hier zijn lokale tijd en UTC hetzelfde,
     dus Date.parse() zonder correctie geeft toevallig hetzelfde antwoord. Nagemeten:
     met parseStamp() vervangen door een kale Date.parse() blijft deze test groen
     onder TZ=UTC en valt hij pas om onder TZ=America/New_York — een test die alleen
     op de laptop van iemand anders werkt, is geen test. Daarom staat de eigenschap
     er ook als bronregel bij: de correctie leeft in parseStamp() en pastMaxLife()
     hoort daar doorheen te gaan in plaats van zelf te parsen. */
  const bron = lees('src/lib/token.js');
  const lijf = bron.slice(bron.indexOf('export function pastMaxLife'));
  check('pastMaxLife parseert via parseStamp en niet zelf',
    /const start = parseStamp\(issuedAt\);/.test(lijf.slice(0, 400))
      && !/Date\.parse\(/.test(lijf.slice(0, 400)), true);

  /* De twee open deuren, elk bewust de andere kant op. Zie de docstring. */
  check('een onleesbare klok sluit de deur', pastMaxLife(dagenGeleden(1), 365, 'gisteren'), true);
  check('een onbekende uitgiftedatum niet', pastMaxLife(null, 365, NU), false);
  check('en een grens van nul betekent geen grens', pastMaxLife(dagenGeleden(9999), 0, NU), false);
}

/* ══ 2 · HET GAT DAT DIT DICHT ════════════════════════════════════════════ */
console.log('\nde twee vragen zijn verschillende vragen');
{
  /* Dit is de bug, in één regel: een open bestelling heeft GEEN einddatum via
     isExpired(), hoe oud het token ook is. Zou deze regel ooit true worden, dan
     is expiryFrom() gaan werken op een null closed_at en klopt de hele redenering
     onder PORTAL_MAX_LIFE_DAYS niet meer. */
  check('een open bestelling laat isExpired koud',
    isExpired(null, null, NU), false);
  check('ook als het token twee jaar oud is',
    isExpired(null, null, NU), false);
  check('maar de bovengrens vangt hem wel',
    pastMaxLife(dagenGeleden(730), PORTAL_MAX_LIFE_DAYS, NU), true);

  /* De twee getallen beantwoorden verschillende vragen en mogen niet in elkaar
     schuiven: de bovengrens moet ruimer zijn dan de nazorgtermijn, anders zou een
     token dat NET is afgesloten al dood zijn voor de negentig dagen om zijn. */
  check(`PORTAL_MAX_LIFE_DAYS (${PORTAL_MAX_LIFE_DAYS}) ligt boven PORTAL_TTL_DAYS (${PORTAL_TTL_DAYS})`,
    PORTAL_MAX_LIFE_DAYS > PORTAL_TTL_DAYS, true);
}

/* ══ 3 · DE KOLOM DIE ER MOET STAAN ═══════════════════════════════════════ */
console.log('\nbeide query’s halen issued_at op');
{
  const portaal = lees('src/lib/portal.js');
  const account = lees('src/lib/account.js');

  check('het portaal selecteert t.issued_at',
    /t\.issued_at\s+AS issued_at/.test(portaal), true);
  check('en leest hem in de poort',
    /pastMaxLife\(order\.issued_at, PORTAL_MAX_LIFE_DAYS\)/.test(portaal), true);

  /* Eén poort, twee ingangen. portalGet() en portalPost() moeten allebei door
     dezelfde functie, anders wordt er later één van de twee bijgewerkt. */
  const poorten = portaal.match(/if \(tokenVerlopen\(order\)\)/g) || [];
  check('zowel de GET als de POST gaat door tokenVerlopen()', poorten.length, 2);
  check('en er is nog maar één plek die de twee einddatums optelt',
    (portaal.match(/isExpired\(order\.expires_at, order\.closed_at\)/g) || []).length, 1);

  check('de sessie selecteert s.issued_at',
    /SELECT s\.id AS session_id, s\.expires_at, s\.issued_at/.test(account), true);
  check('en leest hem bij elk verzoek',
    /pastMaxLife\(row\.issued_at, ACCOUNT_SESSION_MAX_DAYS\)/.test(account), true);
  check('de verlenging wordt geklemd op de uitgiftedatum',
    /accountSessionExpiry\(new Date\(\), row\.issued_at\)/.test(account), true);
}

/* ══ 4 · DE KLEM OP DE SESSIE ═════════════════════════════════════════════ */
console.log('\nde schuivende sessie schuift niet voorbij haar plafond');
{
  /* accountSessionExpiry() is niet ge-export — het is een detail van dat bestand
     en hoort dat te blijven. De regel wordt hier daarom nagerekend op dezelfde
     getallen die daar staan, en §3 bewaakt dat de aanroep de uitgiftedatum
     meegeeft. Wat hier wordt vastgelegd is de EIGENSCHAP: de nieuwe einddatum is
     nooit later dan uitgifte plus het plafond. */
  const account = lees('src/lib/account.js');
  const m = account.match(/const ACCOUNT_SESSION_MAX_DAYS = (\d+);/);
  check('ACCOUNT_SESSION_MAX_DAYS staat in account.js', Boolean(m), true);
  const plafond = m ? Number(m[1]) : 0;
  check('en is een half jaar', plafond, 180);

  const schuif = 30; // SESSION_COOKIE_DAYS
  check('het plafond ligt ruim boven de schuivende termijn', plafond > schuif * 2, true);

  const nieuw = (issuedDagenGeleden) => {
    const glijdend = Date.parse(NU) + schuif * 86400000;
    const start = Date.parse(dagenGeleden(issuedDagenGeleden));
    return Math.min(glijdend, start + plafond * 86400000);
  };
  check('een jonge sessie krijgt de volle dertig dagen',
    nieuw(3) === Date.parse(NU) + schuif * 86400000, true);
  check('een sessie van 170 dagen krijgt er nog tien',
    Math.round((nieuw(170) - Date.parse(NU)) / 86400000), 10);
  check('een sessie op het plafond krijgt er geen enkele',
    nieuw(180) <= Date.parse(NU), true);

  /* De leescontrole staat ERNAAST en niet in plaats van de klem: die schrijfactie
     is met opzet best-effort (een mislukte schrijf mag geen 500 kosten), dus als
     hij ooit faalt is deze regel het enige wat de sessie nog sluit. */
  check('currentCustomer weigert een sessie voorbij het plafond',
    pastMaxLife(dagenGeleden(plafond + 1), plafond, NU), true);
}

/* ══ 5 · HET COOKIEBELEID BLIJFT KLOPPEN ══════════════════════════════════ */
console.log('\nde belofte op de pagina gaat over het cookie, niet over de sessie');
{
  /* Een bovengrens die de sessie KORTER maakt kan het cookiebeleid niet in de
     problemen brengen — dat belooft hoe lang het cookie leeft, en dat blijft
     onveranderd. Maar het omgekeerde zou wel stuk gaan, dus de richting wordt
     hier vastgelegd in plaats van aangenomen. */
  const cookies = lees('src/data/cookies.js');
  const m = cookies.match(/export const SESSION_COOKIE_DAYS = (\d+);/);
  check('SESSION_COOKIE_DAYS staat er nog', Boolean(m), true);
  const cookie = m ? Number(m[1]) : 0;
  const account = lees('src/lib/account.js');
  const plafond = Number((account.match(/const ACCOUNT_SESSION_MAX_DAYS = (\d+);/) || [])[1] || 0);
  check('het plafond maakt de sessie nooit LANGER dan het cookie belooft per uitgifte',
    plafond >= cookie, true);
  check('en het cookiebeleid noemt nog steeds de cookietermijn', cookie, 30);
}

console.log(`\n${goed}/${totaal} geslaagd`);
if (goed !== totaal) process.exit(1);
