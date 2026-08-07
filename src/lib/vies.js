// VISUAILS — de VIES-controle. Eén functie, en hij faalt dicht.
// Augustus 2026.
//
// WAT VIES IS. Geen database maar een zoekmachine van de Europese Commissie:
// hij bevraagt bij elke aanvraag de nationale btw-administratie van het
// betreffende land. Dat verklaart alles wat er hieronder aan foutafhandeling
// staat — de dienst is precies zo beschikbaar als het traagste lidstaatsysteem
// op dat moment, en Duitsland staat er bijvoorbeeld gedocumenteerd 's nachts
// uit.
//
// WAAROM WE HEM MOETEN AANROEPEN. De Belastingdienst: *"Als namelijk blijkt dat
// dit niet zo is, kunt u een naheffingsaanslag en een boete krijgen."* De
// bescherming die je krijgt zit in artikel 18(1)(a) van Uitvoeringsverordening
// 282/2011, en die eist "confirmation of the validity of that identification
// number" volgens artikel 31 van Verordening 904/2010 — dat ís deze controle.
// Zonder hem is er geen vangnet.
//
// ── HET RAADPLEEGNUMMER, EN WAAROM DE HELFT VAN DE IMPLEMENTATIES HET MIST ───
// VIES geeft een `requestIdentifier` terug — het bewijs dat je op dit moment
// dit nummer hebt gecontroleerd en dit antwoord kreeg. De officiële hulptekst:
// *"If you want to be able to prove to a tax administration of a Member State
// that you have checked a given VAT number at a given time … please keep this
// consultation number in your archives."*
//
// Je krijgt hem ALLEEN als je je eigen btw-nummer meestuurt in het verzoek.
// Laat je `requesterMemberStateCode` en `requesterNumber` weg, dan komt het
// veld leeg terug en heb je niets om te laten zien. Getest, beide kanten op,
// met het nummer van VISUAILS zelf.
//
// ── REST, NIET SOAP ──────────────────────────────────────────────────────────
// De Commissie documenteert op haar technische pagina nog steeds alleen de
// SOAP-dienst, maar de REST-endpoints zijn live, stabiel, en zijn wat de
// officiële VIES-website zelf aanroept. Er is geen OpenAPI-spec en geen
// officiële REST-documentatie; dat is een bekend gat, geen fout aan onze kant.
// Vragen gaan naar TAXUD-VIESWEB@ec.europa.eu.
//
// ── GEEN SLEUTEL, GEEN REGISTRATIE, WEL GRENZEN ──────────────────────────────
// De dienst is gratis en open. Er is geen gepubliceerd aantal verzoeken per
// minuut; de limieten komen naar buiten als foutcodes
// (`GLOBAL_MAX_CONCURRENT_REQ`, `MS_MAX_CONCURRENT_REQ`) in plaats van als een
// getal. Vandaar de cache in functions/api/order.js en niet hier: dit bestand
// doet één ding.

/** Waar het verzoek naartoe gaat. Path-parameters, geen query-string, voor het
 *  nummer zelf. */
const BASE = 'https://ec.europa.eu/taxation_customs/vies/rest-api';

/** Hoe lang we wachten. VIES kan minutenlang op een traag lidstaatsysteem
 *  blijven hangen, en een bestelformulier dat daarop wacht is een formulier dat
 *  de klant afbreekt. Vier seconden, en anders 21% — zie het `ok:false`-contract
 *  hieronder. */
const TIMEOUT_MS = 4000;

/**
 * Controleer één btw-nummer.
 *
 * @param {string} countryCode  De VIES-code van het land — `EL` voor
 *   Griekenland, de ISO-code voor de rest. Gebruik viesCode() uit
 *   src/data/vat.js; die kent dat verschil.
 * @param {string} number  Het nummer ZONDER landprefix.
 * @param {object} [requester]  Het eigen nummer, gesplitst. Zonder dit geen
 *   raadpleegnummer, dus het is geen optionele luxe.
 * @returns {Promise<{
 *   ok: boolean, valid: boolean, name: string|null, address: string|null,
 *   consultation: string|null, checkedAt: string|null, error: string|null,
 *   raw: object|null
 * }>}
 *
 * HET CONTRACT, EN HET IS BELANGRIJKER DAN DE CODE:
 *
 *   ok:true,  valid:true   → bevestigd. Dit is het ENIGE antwoord waarop 0%
 *                            mag volgen.
 *   ok:true,  valid:false  → VIES heeft geantwoord en zegt nee. Het nummer
 *                            bestaat niet, of het is niet vrijgegeven voor
 *                            intracommunautaire transacties. 21%.
 *   ok:false               → we weten het niet. Netwerk, time-out, lidstaat
 *                            eruit, onverwacht antwoord. 21%.
 *
 * Er is met opzet geen enkel pad waarop een storing als "geldig" wordt gelezen.
 * Dat is de duurste bug die hier gemaakt kan worden: een uur downtime bij één
 * lidstaat zou dan elke bestelling uit dat land 21% laten weglekken, en dat
 * bedrag komt uit de marge van VISUAILS.
 */
export async function checkVat(countryCode, number, requester) {
  const cc = String(countryCode || '').trim().toUpperCase();
  const num = String(number || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  const blank = {
    ok: false, valid: false, name: null, address: null,
    consultation: null, checkedAt: null, error: null, raw: null,
  };

  if (!/^[A-Z]{2}$/.test(cc) || !num) {
    return Object.assign({}, blank, { error: 'bad-input' });
  }

  // The requester pair is what earns the consultation number. Missing it is not
  // fatal — the check still tells us valid or not — but it is worth saying out
  // loud in the result, because an archive full of confirmations with no proof
  // is an archive that proves nothing.
  const qs = requester && requester.country && requester.number
    ? `?requesterMemberStateCode=${encodeURIComponent(requester.country)}&requesterNumber=${encodeURIComponent(requester.number)}`
    : '';

  const ctrl = new AbortController();
  const timer = setTimeout(function abort() { ctrl.abort(); }, TIMEOUT_MS);

  let res;
  let body;
  try {
    res = await fetch(`${BASE}/ms/${cc}/vat/${encodeURIComponent(num)}${qs}`, {
      method: 'GET',
      headers: { accept: 'application/json' },
      signal: ctrl.signal,
    });
    body = await res.json();
  } catch (err) {
    clearTimeout(timer);
    // An abort and a DNS failure are the same thing to us: we do not know, so
    // we charge. The distinction is kept only so the admin log can say which.
    return Object.assign({}, blank, {
      error: err && err.name === 'AbortError' ? 'timeout' : 'network',
    });
  }
  clearTimeout(timer);

  if (!res.ok || !body || typeof body !== 'object') {
    return Object.assign({}, blank, { error: 'http-' + (res ? res.status : 'none') });
  }

  // `userError` carries the real answer. VALID and INVALID are both a reply
  // from the member state; everything else — MS_UNAVAILABLE, TIMEOUT,
  // SERVICE_UNAVAILABLE, the two concurrency codes and their time-slot
  // variants — means the question was never answered, and that is not a no.
  const code = String(body.userError || '').toUpperCase();
  const answered = code === 'VALID' || code === 'INVALID';
  if (!answered) {
    return Object.assign({}, blank, { error: code || 'unknown', raw: body });
  }

  // Name and address come back as '---' from the member states that do not
  // disclose them — Germany among them. That is not an error and not a
  // mismatch; it is simply a name we cannot check, and it has to be stored as
  // "not disclosed" rather than as the literal dashes, or a later comparison
  // will read three hyphens as a company called three hyphens.
  const undisclosed = function undisclosed(v) {
    const s = String(v == null ? '' : v).trim();
    return !s || s === '---' ? null : s;
  };

  return {
    ok: true,
    valid: body.isValid === true && code === 'VALID',
    name: undisclosed(body.name),
    address: undisclosed(body.address),
    consultation: body.requestIdentifier ? String(body.requestIdentifier) : null,
    checkedAt: body.requestDate ? String(body.requestDate) : new Date().toISOString(),
    error: null,
    raw: body,
  };
}

/**
 * What we keep for seven years.
 *
 * The Belastingdienst's retention is seven years, and what has to survive is
 * not the whole HTTP exchange but the four things a tax inspector would ask
 * for: which number, when, what the answer was, and the consultation number
 * that proves it. Trimmed to those, because the raw payload also carries a
 * `viesApproximate` block full of `---` that means nothing to anyone.
 */
export function viesEvidence(result) {
  if (!result) return null;
  return JSON.stringify({
    ok: result.ok,
    valid: result.valid,
    name: result.name,
    address: result.address,
    consultation: result.consultation,
    checkedAt: result.checkedAt,
    error: result.error,
  });
}
