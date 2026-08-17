/*
 * ═══════════════════════════════════════════════════════════════════════════════
 * HET E-MAILADRES WIJZIGEN
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Dit adres IS de inlog. Er is geen wachtwoord; er is een link in de mail. Een
 * fout in deze drie stappen is dus niet "een veld staat verkeerd" maar "iemand kan
 * niet meer bij zijn eigen bestellingen" of "iemand anders wel".
 *
 * Wat hier bewezen wordt, in de volgorde van wat het kost als het misgaat:
 *
 *   1 · EEN VERZOEK VERANDERT NOG NIETS. Zolang er niet op de link in het nieuwe
 *       postvak is geklikt, blijft het oude adres werken. Zonder dat zet een
 *       typefout iemand buiten zijn eigen account.
 *   2 · DE OVERNAME IS TERUG TE DRAAIEN. Dat is de hele reden dat de melding aan
 *       het oude adres bestaat: iemand met een gestolen sessie kan stap 1 en 2
 *       zelf doen, maar niet het postvak van de eigenaar leegmaken.
 *   3 · EEN LINK WERKT ÉÉN KEER en niet na zijn houdbaarheid.
 *   4 · EEN BEZET ADRES WORDT GEWEIGERD, ook nog op het moment van bevestigen —
 *       tussen verzoek en klik kan een uur liggen.
 *
 * Tegen een echte SQLite met het echte schema, om de reden in tests/lib/d1sqlite.mjs:
 * een fout die bestaat omdat de database iets weigert (`customers.email UNIQUE`),
 * vind je niet met een database die nooit iets weigert.
 */
import { readFileSync } from 'node:fs';
import { d1, verseDb, telling } from './lib/d1sqlite.mjs';
import { accountGet, accountPost, maskEmail } from '../src/lib/account.js';

let ok_ = 0; let totaal = 0;
function ok(naam, kreeg, verwacht) {
  totaal += 1;
  const goed = JSON.stringify(kreeg) === JSON.stringify(verwacht);
  if (goed) ok_ += 1;
  console.log(` ${goed ? 'ok  ' : 'FAIL'} ${naam.padEnd(62)}${goed ? '' : ` verwacht ${JSON.stringify(verwacht)} kreeg ${JSON.stringify(kreeg)}`}`);
}

const { db, mislukt } = verseDb(new URL('../schema.sql', import.meta.url));
console.log('het schema draait');
ok('schema.sql draait zonder mislukte statements', mislukt, []);

/* Twee klanten: de onze, en iemand anders wiens adres bezet is. */
db.exec(`
  INSERT INTO customers (id, email, brand) VALUES
    (7, 'mara@voltbrand.test', 'VOLT'),
    (8, 'iemand@anders.test', 'ANDERS');
`);

/* GEEN RESEND_API_KEY, dus sendMail() slaat stil over en er gaat niets de deur uit.
   Dat is hier precies goed: wat deze test moet vastleggen is WELK kenmerk in welke
   rij belandt en wat de handlers ermee doen — niet hoe de html eruitziet. De inhoud
   van de twee mails staat in de sectie over maskEmail() en verder in
   tests/account-signin.test.mjs, dat de mailschil al bewaakt. */
const env = {
  DB: d1(db),
  /* Geen RESEND_API_KEY: sendMail() gaat er dan niet uit. De links halen we uit de
     database in plaats van uit een mail — wat we willen weten is of de juiste
     KENMERKEN bestaan, niet of Resend bereikbaar is. */
};

const ORIGIN = 'https://visuails.com';
let sessie = 'sessie-van-mara';

/* Een sessie voor klant 7. account_sessions bewaart een hash, dus wordt hij hier
   met dezelfde functie gezet die account.js gebruikt om hem terug te vinden. */
const { hashToken, mintToken, isWellFormedToken } = await import('../src/lib/token.js');

/* DE NEPKENMERKEN MOETEN DE ECHTE VORM HEBBEN. Eerste poging gebruikte leesbare
   strings ("kenmerk-uit-de-bevestigingsmail-1") en die vielen af op
   isWellFormedToken() — de handler keek niet verder dan de vorm. Dat is precies wat
   die controle moet doen (een kenmerk van de verkeerde lengte kost geen query), dus
   is niet de controle aangepast maar de test: mintToken() levert de echte vorm. */
const nepToken = () => mintToken();
async function zetSessie(token, customerId = 7) {
  db.prepare(
    `INSERT INTO account_sessions (customer_id, token_hash, expires_at)
     VALUES (?, ?, datetime('now', '+30 days'))`
  ).run(customerId, await hashToken(token));
}
await zetSessie(sessie);

const post = (path, body, cookie = `vis_account=${sessie}; vis_lang=nl`) => accountPost({
  request: new Request(`${ORIGIN}${path}`, {
    method: 'POST',
    headers: {
      cookie,
      origin: ORIGIN,
      'content-type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams(body).toString(),
  }),
  env,
  waitUntil() {},
});

const get = (path, cookie = 'vis_lang=nl') => accountGet({
  request: new Request(`${ORIGIN}${path}`, { headers: { cookie } }),
  env,
  waitUntil() {},
});

const adresVan = (id) => db.prepare('SELECT email FROM customers WHERE id = ?').get(id).email;
const laatsteRij = () => db.prepare('SELECT * FROM email_changes ORDER BY id DESC LIMIT 1').get();

/* De kenmerken uit de database halen kan niet — ze staan er gehasht in. Dus wordt
   hier hetzelfde gedaan als een echte klant doet: het kenmerk komt uit de mail. En
   omdat er geen mail uitgaat, wordt hij hier opnieuw gemaakt en de hash ernaast
   gelegd. Dat kan niet, dus draait deze test het om: hij zet zelf een bekend
   kenmerk in de rij. Dat is eerlijker dan doen alsof we de mail lezen — en het test
   nog precies wat het moet testen, namelijk wat de handler met een geldig kenmerk
   doet. */
async function zetKenmerk(kolom, id, token, expiresKolom, expires) {
  db.prepare(`UPDATE email_changes SET ${kolom} = ?, ${expiresKolom} = ? WHERE id = ?`)
    .run(await hashToken(token), expires, id);
}
const overMinuten = (n) => new Date(Date.now() + n * 60000).toISOString();

console.log('\neen verzoek verandert nog niets');
{
  const res = await post('/account/email', { new_email: 'nieuw@voltbrand.test' });
  ok('het formulier stuurt terug naar de gegevenspagina', res.status, 303);
  ok('met een melding in de url', res.headers.get('location'), '/account/details?email=gevraagd');

  const rij = laatsteRij();
  ok('er staat een verzoek', Boolean(rij), true);
  ok('met het oude adres erin — dat is wat terugzetten nodig heeft', rij.previous_email, 'mara@voltbrand.test');
  ok('en het nieuwe', rij.new_email, 'nieuw@voltbrand.test');
  ok('nog niet bevestigd', rij.confirmed_at, null);
  ok('en er is nog niets om terug te zetten', rij.undo_hash, null);

  /* HET BELANGRIJKSTE VAN DEZE SECTIE. Een verzoek dat het adres al zou wijzigen,
     zet iemand met een typefout buiten zijn eigen account. */
  ok('HET ADRES VAN DE KLANT IS ONGEWIJZIGD', adresVan(7), 'mara@voltbrand.test');

  /* Het kenmerk staat gehasht en niet in platte tekst: een gelekte export mag geen
     werkende links bevatten. Zelfde regel als bij account_tokens. */
  ok('het kenmerk staat gehasht', /^[0-9a-f]{64}$/.test(rij.confirm_hash), true);
  ok('en het ip-adres ook, niet in platte tekst', /^[0-9a-f]{64}$/.test(rij.request_ip_hash || ''), true);
}

console.log('\nwat er niet door de voordeur komt');
{
  const voor = adresVan(7);
  ok('een adres dat geen adres is, wordt geweigerd',
    (await post('/account/email', { new_email: 'geen adres' })).headers.get('location'),
    '/account/details?email=gevraagd');
  ok('en verandert niets', adresVan(7), voor);

  /* HETZELFDE ADRES. Dit lijkt onschuldig en is het niet: het zou een geldige
     bevestigingsmail opleveren voor een wijziging die niets doet, en dus een klant
     die op een link klikt en zich afvraagt wat er gebeurd is. */
  await post('/account/email', { new_email: 'MARA@voltbrand.test' });
  ok('het eigen adres levert geen nieuw verzoek op', telling(db, 'SELECT COUNT(*) FROM email_changes'), 1);

  /* HET ADRES VAN IEMAND ANDERS. En de uitkomst is dezelfde pagina als bij succes:
     een formulier dat "dat adres is al in gebruik" zegt, is een manier om te vragen
     of iemand klant is bij VISUAILS. */
  const res = await post('/account/email', { new_email: 'iemand@anders.test' });
  ok('een bezet adres geeft dezelfde uitkomst als een vrij',
    res.headers.get('location'), '/account/details?email=gevraagd');
  ok('maar levert geen verzoek op', telling(db, 'SELECT COUNT(*) FROM email_changes'), 1);

  /* Zonder sessie is er geen klant om iets te wijzigen. */
  const uit = await post('/account/email', { new_email: 'weer@anders.test' }, 'vis_lang=nl');
  ok('zonder sessie stuurt hij naar de inlogpagina', uit.headers.get('location'), '/account/login');
}

console.log('\nde bevestiging in het nieuwe postvak wijzigt het adres');
{
  const rij = laatsteRij();
  const token = await nepToken();
  await zetKenmerk('confirm_hash', rij.id, token, 'confirm_expires', overMinuten(60));

  const res = await get(`/account/email/${token}`);
  ok('de pagina laadt', res.status, 200);
  const body = await res.text();
  ok('en zegt dat het gelukt is', /bevestigd/i.test(body), true);

  ok('NU is het adres gewijzigd', adresVan(7), 'nieuw@voltbrand.test');
  const na = laatsteRij();
  ok('de rij is afgetekend', Boolean(na.confirmed_at), true);
  /* PAS NU BESTAAT ER IETS OM TERUG TE ZETTEN. Vóór de bevestiging zou een
     terugzetlink naar een wijziging wijzen die nooit is gebeurd. */
  ok('en er is een terugzetkenmerk', /^[0-9a-f]{64}$/.test(na.undo_hash), true);
  ok('met een houdbaarheid van weken en niet van minuten',
    new Date(na.undo_expires).getTime() - Date.now() > 10 * 86400000, true);

  /* De link werkt één keer. Twee keer klikken is normaal gedrag — een mailclient
     die vooruitleest, iemand die terugnavigeert — en mag geen tweede wijziging
     opleveren. */
  const weer = await get(`/account/email/${token}`);
  ok('een tweede klik doet niets nieuws', /al bevestigd/i.test(await weer.text()), true);
  ok('en het adres blijft staan', adresVan(7), 'nieuw@voltbrand.test');
}

console.log('\nde terugzetlink in het oude postvak — het slot');
{
  /* DIT IS DE SECTIE DIE DE OVERNAME AFDEKT. Iemand met een gestolen sessiekoekje
     kan een adres van zichzelf zetten en dat uit zijn eigen postvak bevestigen. Wat
     hij niet kan, is het postvak van de eigenaar leegmaken — en daar ligt deze link. */
  const rij = laatsteRij();
  const undo = await nepToken();
  await zetKenmerk('undo_hash', rij.id, undo, 'undo_expires', overMinuten(60 * 24 * 14));

  ok('de sessie van de aanvaller bestaat nog', telling(db, 'SELECT COUNT(*) FROM account_sessions'), 1);

  const res = await get(`/account/email/undo/${undo}`);
  ok('de pagina laadt', res.status, 200);
  ok('en zegt dat het terugstaat', /terug/i.test(await res.text()), true);

  ok('HET OUDE ADRES IS TERUG', adresVan(7), 'mara@voltbrand.test');
  /* EN ELKE SESSIE IS DOOD. Het adres terugzetten zonder de sessie te doden zou de
     aanvaller laten zitten waar hij zat, en hem laten proberen het nog eens te doen. */
  ok('en alle sessies zijn eruit', telling(db, 'SELECT COUNT(*) FROM account_sessions'), 0);
  ok('en de openstaande inloglinks ook', telling(db, 'SELECT COUNT(*) FROM account_tokens'), 0);

  const na = laatsteRij();
  ok('de rij is afgetekend', Boolean(na.undone_at), true);
  ok('een tweede klik doet niets nieuws', /al teruggezet/i.test(await (await get(`/account/email/undo/${undo}`)).text()), true);
}

console.log('\nlinks die niet meer horen te werken');
{
  await zetSessie('tweede-sessie');
  sessie = 'tweede-sessie';

  /* EEN VERLOPEN BEVESTIGING. Er is niets veranderd, en de pagina zegt dat — geen
     404, want deze url's zitten in mail en worden dagen later aangeklikt. */
  await post('/account/email', { new_email: 'laat@voltbrand.test' });
  const rij = laatsteRij();
  const token = await nepToken();
  await zetKenmerk('confirm_hash', rij.id, token, 'confirm_expires', overMinuten(-1));

  const res = await get(`/account/email/${token}`);
  ok('een verlopen link geeft geen 404', res.status, 200);
  ok('en zegt dat hij verlopen is', /verlopen/i.test(await res.text()), true);
  ok('en verandert niets', adresVan(7), 'mara@voltbrand.test');

  const onzin = await get(`/account/email/${await nepToken()}`);
  ok('een onbekend kenmerk geeft ook geen 404', onzin.status, 200);
  /* En een kenmerk van de verkeerde vorm komt niet eens bij de database. */
  ok('een kenmerk van de verkeerde lengte wordt op de vorm afgewezen',
    isWellFormedToken('te-kort'), false);
  ok('en geeft ook een nette pagina', (await get('/account/email/te-kort')).status, 200);
  ok('en verandert niets', adresVan(7), 'mara@voltbrand.test');

  /* EEN ADRES DAT INTUSSEN BEZET IS. Tussen het verzoek en de klik kan een uur
     liggen, en in dat uur kan iemand anders onder dat adres besteld hebben. Zonder
     de tweede toets loopt de UPDATE op de UNIQUE-index stuk en ziet de klant een
     foutpagina in plaats van een uitleg. */
  await post('/account/email', { new_email: 'straks@bezet.test' });
  const rij2 = laatsteRij();
  const token2 = await nepToken();
  await zetKenmerk('confirm_hash', rij2.id, token2, 'confirm_expires', overMinuten(60));
  db.prepare('UPDATE customers SET email = ? WHERE id = 8').run('straks@bezet.test');

  const res2 = await get(`/account/email/${token2}`);
  ok('een inmiddels bezet adres wordt geweigerd', /in gebruik/i.test(await res2.text()), true);
  ok('en het eigen adres blijft staan', adresVan(7), 'mara@voltbrand.test');
  ok('en dat van de ander ook', adresVan(8), 'straks@bezet.test');
}

console.log('\nwat er in de mail naar het oude adres staat');
{
  /* HET NIEUWE ADRES STAAT ER GEDEELTELIJK IN. Voluit zou betekenen dat een
     aanvaller die dit postvak later alsnog leest, weet welk adres hij te pakken
     heeft; helemaal weglaten zou de eigenaar niet laten zien wat er gebeurd is. */
  ok('een adres wordt gemaskeerd', maskEmail('mara@voltbrand.nl'), 'm***@voltbrand.nl');
  ok('en onzin levert geen halve gegevens op', maskEmail('geen-adres'), '***');
  ok('en leeg ook niet', maskEmail(''), '***');
}

console.log('\nen wat de code zelf belooft');
{
  const src = readFileSync(new URL('../src/lib/account.js', import.meta.url), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');

  /* De twee links staan VÓÓR de sessiecontrole. Wie op "zet dit terug" klikt, is
     per definitie iemand die misschien niet meer kan inloggen — dat is juist het
     geval dat die link moet oplossen. */
  /* Het ijkpunt is de eerste route die een ingelogde klant NODIG heeft — die staat
     per definitie na de sessiecontrole. Eerste poging zocht op de tekst van de
     controle zelf, en die staat vier keer eerder in dit bestand (bij de bestanden
     en de zip), dus wees indexOf() naar de verkeerde. */
  /* Op `undoMatch` en niet op het pad: in de route staan de schuine strepen
     ontsnapt (`\/account\/email\/undo\/`), dus een zoekopdracht op het gewone pad
     vond pas de link in de mail — twintig regels na de sessiecontrole, en dus een
     toets die groen had kunnen zijn om de verkeerde reden. */
  const undoRegel = src.indexOf('undoMatch');
  const naSessie = src.indexOf("if (path === '/account') return sectionGet(context, customer, 'overview');");
  ok('de terugzetlink zit vóór de routes die een sessie eisen',
    undoRegel > 0 && naSessie > 0 && undoRegel < naSessie, true);
  /* En hij krijgt geen `customer` mee, want die is er misschien niet. */
  ok('en hij verwacht geen ingelogde klant',
    /handleEmailUndo\(context, undoMatch\[1\]\)/.test(src), true);

  /* Een eigen limiet, strenger dan POST_LIMIT: elk verzoek stuurt een mail naar een
     adres dat de aanvrager zelf intypt. */
  ok('het verzoek heeft zijn eigen limiet', /action: 'account-email-change'/.test(src), true);

  /* De melding aan het oude adres is het slot en geen hoffelijkheid, dus mag het
     mislukken ervan niet stil zijn. */
  ok('een mislukte melding wordt luidruchtig gelogd',
    /MELDING AAN OUD ADRES NIET VERSTUURD/.test(src), true);
}

console.log(`\n${ok_}/${totaal} geslaagd`);
if (ok_ !== totaal) process.exit(1);
