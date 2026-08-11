/*
 * ─────────────────────────────────────────────────────────────────────────────
 * WIE ER BETAALD HEEFT, ZONDER TE ONTHOUDEN WIE ER BETAALD HEEFT
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Lucas, 11 augustus 2026: *"IBAN lijkt het meest betrouwbare... als dit
 * geautomatiseerd kan worden zou dat perfect zijn."*
 *
 * De belofte "één proefvisual per bedrijf" stond tot vanochtend nergens in code.
 * De klep die er sinds vanochtend is, kijkt naar het e-mailadres, en dat houdt
 * precies één ding tegen: dezelfde persoon die het nog eens probeert zonder
 * moeite te doen. Elk ander herkenningspunt op dat formulier vult de bezoeker
 * zelf in, en wat je zelf invult kun je ook anders invullen.
 *
 * Op één na. Het IBAN waarmee betaald wordt komt niet van het formulier maar van
 * de bank, en een tweede bankrekening openen om een proef van € 1 te herhalen is
 * geen moeite meer maar een project. Dat maakt het het enige betrouwbare
 * herkenningspunt in deze keten — en het enige dat Lucas anders met de hand zou
 * zitten na te lopen.
 *
 * ── WAT HIER NIET GEBEURT ───────────────────────────────────────────────────
 *
 * Er wordt geen IBAN opgeslagen. Niet omdat het niet mag, maar omdat het niet
 * nodig is: de enige vraag die dit systeem ooit stelt is "is dit dezelfde betaler
 * als toen", en op die vraag is een hash een volledig antwoord. Een rekeningnummer
 * bewaren dat je nooit uitleest, is een risico zonder opbrengst.
 *
 * Datzelfde staat al in `rate_limits`, over ip-adressen: *"The key is a salted
 * hash of the IP plus a minute stamp — no IP address is stored here."* Dit bestand
 * volgt dat patroon tot en met het zout, dat uit dezelfde `app_settings`-rij komt.
 *
 * ── WAAROM GEZOUTEN ─────────────────────────────────────────────────────────
 *
 * Om dezelfde reden als daar, en die reden is hier zo mogelijk nog sterker. Een
 * Nederlands IBAN heeft een vaste lengte, een vaste vorm en een controlegetal;
 * de hele verzameling die een bank ooit uitgeeft is klein genoeg om er kaal
 * doorheen te rekenen. Een ongezouten SHA-256 van een rekeningnummer is dus geen
 * versleuteling maar een omweg. Met een zout is een gelekte export een kolom
 * betekenisloze tekst — en dat is precies het geval dat je wilt afdekken.
 */

const SALT_KEY = 'payer_salt';

/** Per-isolate cache, zoals in ratelimit.js: een waarde die nooit verandert. */
let saltCache = null;

async function getSalt(env) {
  if (env?.PAYER_SALT) return env.PAYER_SALT;
  if (saltCache) return saltCache;

  const fresh = randomHex(32);
  // Wie er als eerste is wint; de INSERT van de rest wordt genegeerd en de SELECT
  // eronder geeft ze de winnende waarde. Twee koude isolaten die tegelijk starten
  // komen zo op één zout uit in plaats van elkaar te overschrijven.
  await env.DB.prepare('INSERT OR IGNORE INTO app_settings (key, value) VALUES (?1, ?2)')
    .bind(SALT_KEY, fresh)
    .run();
  const row = await env.DB.prepare('SELECT value FROM app_settings WHERE key = ?1').bind(SALT_KEY).first();

  saltCache = row?.value || fresh;
  return saltCache;
}

function randomHex(bytes) {
  const b = new Uint8Array(bytes);
  crypto.getRandomValues(b);
  return [...b].map((x) => x.toString(16).padStart(2, '0')).join('');
}

/*
 * ── WAT MOLLIE TERUGGEEFT, EN WAT DAARVAN BRUIKBAAR IS ──────────────────────
 *
 * `payment.details` verschilt per betaalmethode. Twee velden zijn hier bruikbaar:
 *
 *   iDEAL  `consumerAccount` — het IBAN van de rekening waarvandaan betaald is.
 *          Dit is de sterke: hij hoort bij een bankrekening, niet bij een sessie.
 *   kaart  `cardFingerprint` — een waarde die Mollie stabiel aan één kaart hangt.
 *          Zwakker dan een IBAN (een tweede kaart is makkelijker dan een tweede
 *          rekening) maar nog altijd oneindig veel sterker dan een e-mailadres.
 *
 * Alles daarbuiten levert niets op, en dat is uitdrukkelijk in orde. Een betaling
 * zonder herkenbare betaler krijgt geen hash, en een order zonder hash wordt door
 * de controle overgeslagen. Dat is de goede kant om: deze klep hoort een tweede
 * poging op te vangen, niet een eerste klant te laten struikelen over een
 * betaalmethode waar Mollie toevallig weinig over zegt.
 */
export function payerIdentity(payment) {
  const d = (payment && typeof payment.details === 'object' && payment.details) || {};

  const iban = typeof d.consumerAccount === 'string' ? d.consumerAccount.trim() : '';
  if (iban) {
    // Spaties en hoofdletters eruit: "NL91 ABNA 0417 1643 00" en
    // "nl91abna0417164300" zijn hetzelfde rekeningnummer, en een hash kent dat
    // verschil niet weg. Normaliseren moet dus hiervoor gebeuren, één keer, op
    // deze plek — anders is het een conventie die overal moet blijven kloppen.
    return { kind: 'ideal', raw: iban.replace(/\s+/g, '').toUpperCase() };
  }

  const card = typeof d.cardFingerprint === 'string' ? d.cardFingerprint.trim() : '';
  if (card) return { kind: 'card', raw: card };

  return null;
}

/**
 * De gezouten hash van de betaler, of null als deze betaling er geen prijsgeeft.
 *
 * De soort gaat MEE in de hash. Zonder dat zou een IBAN dat toevallig gelijk is
 * aan een kaartvingerafdruk als dezelfde betaler tellen — vergezocht, maar het
 * kost één tekenreeks om onmogelijk te maken in plaats van onwaarschijnlijk.
 */
export async function payerHash(env, payment) {
  const id = payerIdentity(payment);
  if (!id || !env?.DB) return null;

  const salt = await getSalt(env);
  const bytes = new TextEncoder().encode(`${salt}:${id.kind}:${id.raw}`);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  const hex = [...new Uint8Array(digest)].map((x) => x.toString(16).padStart(2, '0')).join('');

  return { hash: hex, kind: id.kind };
}

/*
 * ─────────────────────────────────────────────────────────────────────────────
 * WAT DE BEZOEKER ZELF INVULT — EN HOE JE DAAR TOCH IETS AAN HEBT
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * De twee functies hieronder horen bij de andere kant van deze klep: de weigering
 * VÓÓR de betaling, in functions/api/order.js. Daar bestaat het IBAN nog niet, dus
 * daar is alleen te vergelijken wat de bezoeker zelf intypt.
 *
 * Dat is zwakker, en het hoort ook zwakker te zijn: dit is de laag die iemand een
 * nette melding geeft in plaats van hem door een betaling te laten lopen die
 * daarna teruggedraaid wordt. Hij hoeft niet waterdicht te zijn — daarvoor is de
 * betalerscontrole — hij hoeft alleen te voorkomen dat de makkelijke herhaling
 * lukt, en dat de klant het op een fatsoenlijk moment te horen krijgt.
 */

/**
 * Twee adressen die dezelfde inbox zijn, gelijktrekken.
 *
 * `lucas+2@merk.nl` komt aan bij `lucas@merk.nl`. Dat is geen truc van
 * fraudeurs maar een standaardfunctie die iedereen kan gebruiken, en tot vandaag
 * was het de goedkoopste manier om de klep te omzeilen: vijf seconden typen, geen
 * tweede account nodig. De plus en alles erachter gaan er dus af.
 *
 * De puntjes alleen bij Gmail, en dat verschil is belangrijk. Gmail negeert ze —
 * `l.ucas@` en `lucas@` zijn daar dezelfde inbox. Bij vrijwel elke andere
 * provider zijn het WEL verschillende adressen, dus ze overal weghalen zou
 * betekenen dat je twee collega's met de namen `jan.smit@` en `jansmit@` als
 * dezelfde persoon behandelt en de tweede onterecht weigert. Dat is precies de
 * fout die dit systeem overal weigert te maken: bij twijfel doorlaten.
 */
export function normalizeEmail(raw) {
  const s = String(raw || '').trim().toLowerCase();
  const at = s.lastIndexOf('@');
  if (at < 1) return s;

  let local = s.slice(0, at);
  const domain = s.slice(at + 1);

  const plus = local.indexOf('+');
  if (plus > 0) local = local.slice(0, plus);

  if (domain === 'gmail.com' || domain === 'googlemail.com') local = local.replace(/\./g, '');

  return `${local}@${domain}`;
}

/**
 * Een telefoonnummer terugbrengen tot de cijfers die ertoe doen.
 *
 * "+31 6 12 34 56 78", "0612345678" en "06-12345678" zijn één nummer dat op drie
 * manieren getypt is. De landcode gaat eraf zodat de eerste twee vormen ook
 * onderling gelijk worden — een Nederlands nummer wordt net zo vaak met 06 als
 * met +316 ingevuld, vaak door dezelfde persoon.
 *
 * Geeft leeg terug bij minder dan acht cijfers, en dat is met opzet: een half
 * ingevuld nummer mag NOOIT ergens op matchen. Een bezoeker die "06" typt zou
 * anders iedereen tegenkomen die hetzelfde deed.
 */
export function normalizePhone(raw) {
  let d = String(raw || '').replace(/\D+/g, '');
  if (!d) return '';

  if (d.startsWith('0031')) d = d.slice(4);
  else if (d.startsWith('31') && d.length > 10) d = d.slice(2);
  if (d.startsWith('0')) d = d.slice(1);

  return d.length >= 8 ? d : '';
}
