// VISUAILS — OP MAAT: DE OFFERTE MET BETAALLINK. 15 november 2026.
//
// Lucas: "Ik wil de offerte met betaallink voor het bedrag dat betaald moet worden via /admin doen. Ik wil daar alles
// kunnen invullen en dan gelijk de offerte en betaallink kunnen opsturen." En: "Ik wil een manier dat de klant op
// akkoord drukt of nog wat wil aanpassen. Akkoord zorgt ervoor dat de betaallink automatisch naar hem wordt verstuurd
// als dat mogelijk is (wel correct mailadres moet gelinkt zijn met de offerte)." Zijn keuzes: de helft nu en de rest
// later, bedragen exclusief btw, en na de betaling een gewone bestelling.
//
// Zo loopt het:
//   1. /admin (stuurOfferte): regels, mailadres, land en btw-nummer. De btw wordt hier beslist, met dezelfde regel als
//      bij elke bestelling (vatDecision; VIES bij een ander EU-land). De offerte gaat per mail naar dat adres, met een
//      link naar Studio. Stand `offerte`.
//   2. Studio, Iets aanpassen (vraagAanpassing): de tekst van de klant staat bij de offerte, de stand gaat terug naar
//      `akkoord` en Nu doen zegt "Op maat: offerte". De studio past aan en stuurt opnieuw.
//   3. Studio, Akkoord (akkoordEnBetaallink): met het zakelijk-vinkje (en bij verlegde btw de verleggingszin) ontstaat
//      een gewone bestelling (dienst `custom`, request `op-maat`, quote_kind `aanbetaling`) voor de helft, en gaat de
//      bestaande betaallinkmail (src/lib/betaallink.js) naar het adres van de offerte. Stand `vastgelegd`.
//      Lukt de mail niet (geen Mollie-sleutel, mail weigert), dan blijft link_op leeg en zegt Nu doen
//      "Op maat: betaallink"; /admin heeft dan "Betaallink opnieuw sturen" (betaallinkOpnieuw).
//   4. Betaalt hij, dan doet de webhook wat hij bij elke bestelling doet: betaald, factuur, in de planning. Het restant
//      vraagt de studio op de bestelling met de bestaande restantknop (het bedrag staat er al in).

import { aanvraagVan } from './opMaat.js';
import { AANBETALING_DEEL } from '../data/opMaatPrijs.js';
import { DIENST_NAAM } from '../data/opMaat.js';
import { vatDecision, normaliseVat, viesCode, isEu, HOME_COUNTRY, VAT_TREATMENT, vatStatement } from '../data/vat.js';
import { BUSINESS_VERSION, VERLEGGING_VERSION, verleggingZin } from '../data/business.js';
import { checkVat } from './vies.js';
import { sendMail } from './mail.js';
import { studioUrl } from './studioLink.js';
import { stuurBetaallink, markeerProefbestelling } from './betaallink.js';
import { shell, h1, p, rows, button, terugval, vragen, bedrag as mailBedrag, greeting, kenmerk, esc } from './mailTemplate.js';
import { aanhefTekst } from './aanhef.js';

export const EMAIL_VORM = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const KENMERK_VAN = (id) => `OM-${id}`;

/** Een kenmerk zoals functions/api/order.js het maakt: VIS-XXXX-XXX, het staartje uit de cryptografische generator. */
export function nieuwKenmerk(nu = Date.now()) {
  const t = nu.toString(36).toUpperCase().slice(-4);
  const r = (crypto.getRandomValues(new Uint32Array(1))[0] % 46656).toString(36).toUpperCase().padStart(3, '0');
  return `VIS-${t}-${r}`;
}

/**
 * De btw voor een offerte. Dezelfde beslissing als bij elke bestelling (vatDecision): Nederland of geen land 21%,
 * buiten de EU 0% (niet belastbaar), een ander EU-land alleen 0% verlegd met een door VIES bevestigd nummer.
 * De verklaring van de klant (verleggingTelt) volgt bij zijn akkoord: zonder dat vinkje kan hij niet akkoord geven.
 * VIES onbereikbaar of ongeldig: 21%, zoals altijd (fails closed).
 */
export async function btwVoorOfferte(env, { land, btwNummer, vies = checkVat } = {}) {
  const cc = String(land || '').trim().toUpperCase();
  const nummer = normaliseVat(btwNummer || '', cc || null);
  let check = null;
  const vc = viesCode(cc);
  if (cc && cc !== HOME_COUNTRY && isEu(cc) && vc && nummer.number) {
    const eigen = env.VISUAILS_VAT ? normaliseVat(env.VISUAILS_VAT) : null;
    check = await vies(vc, nummer.number, eigen && eigen.number ? { country: eigen.country || HOME_COUNTRY, number: eigen.number } : null).catch(() => null);
  }
  const besluit = vatDecision({ country: cc, vatValid: !!(check && check.ok && check.valid === true) });
  return { ...besluit, land: cc || null, btwNummer: nummer.number ? `${nummer.country || cc}${nummer.number}` : null,
    raadpleging: check && besluit.treatment === VAT_TREATMENT.reverseCharge ? (check.consultation || null) : null };
}

const centen = (euro) => Math.round(Number(euro) * 100);

/** De bedragen van een offerte: alles exclusief btw in hele euro's, de aanbetaling de helft (afgerond), btw op de aanbetaling. */
export function bedragen(regels, tarief) {
  const totaal = regels.reduce((s, r) => s + r.bedrag, 0);
  const aanbetaling = Math.round(totaal * AANBETALING_DEEL);
  const btw = Math.round(centen(aanbetaling) * (Number(tarief) || 0));
  return { totaal, aanbetaling, rest: totaal - aanbetaling, aanbetalingBtwCents: btw, aanbetalingBrutoCents: centen(aanbetaling) + btw };
}

export async function offerteRij(env, id) {
  return env.DB.prepare('SELECT * FROM maat_offertes WHERE aanvraag_id = ?').bind(id).first().catch(() => null);
}

/** De offerte zoals Studio en /admin hem tonen. */
export async function offerteVoorScherm(env, id) {
  const r = await offerteRij(env, id);
  if (!r) return null;
  let regels = [];
  try { regels = JSON.parse(r.regels_json) || []; } catch { regels = []; }
  const tarief = Number(r.btw_tarief) || 0;
  const b = bedragen(regels, tarief);
  let ref = null, betaald = false;
  if (r.order_id) {
    const o = await env.DB.prepare('SELECT ref, payment_status FROM orders WHERE id = ?').bind(r.order_id).first().catch(() => null);
    ref = o ? o.ref : null; betaald = !!(o && o.payment_status === 'paid');
  }
  return {
    regels, totaal: b.totaal, aanbetaling: b.aanbetaling, rest: b.rest, btwTarief: tarief, btwBehandeling: r.btw_behandeling || VAT_TREATMENT.standard,
    aanbetalingBtw: b.aanbetalingBtwCents / 100, aanbetalingBruto: b.aanbetalingBrutoCents / 100,
    email: r.email || '', land: r.land || '', btwNummer: r.btw_nummer || '',
    verstuurdOp: r.verstuurd_op, akkoordOp: r.akkoord_op, aanpassing: r.aanpassing || '', aanpassingOp: r.aanpassing_op,
    linkOp: r.link_op, orderId: r.order_id || null, ref, betaald,
  };
}

/* ── 1 · de studio stuurt de offerte ─────────────────────────────────────────────────────────────────────── */

/**
 * Zet de offerte en stuurt hem per mail. Kan vanaf `akkoord` (de eerste keer, of na een aanpassing) en vanaf `offerte`
 * (een vervanging zolang de klant nog geen akkoord gaf).
 */
export async function stuurOfferte(env, id, { regels, email, land, btwNummer }, { origin, vies } = {}) {
  const a = await env.DB.prepare('SELECT a.id, a.customer_id, a.dienst, a.stand, a.taal, c.name, c.first_name, c.brand FROM maat_aanvragen a JOIN customers c ON c.id = a.customer_id WHERE a.id = ?').bind(id).first();
  if (!a) return { ok: false, reden: 'weg' };
  if (a.stand !== 'akkoord' && a.stand !== 'offerte') return { ok: false, reden: 'stand' };
  const oud = await offerteRij(env, id);
  if (oud && oud.akkoord_op) return { ok: false, reden: 'al' };
  const adres = String(email || '').trim().toLowerCase();
  if (!EMAIL_VORM.test(adres) || adres.length > 200) return { ok: false, reden: 'email' };
  if (!regels.length) return { ok: false, reden: 'regels' };
  const b0 = bedragen(regels, 0);
  if (b0.totaal <= 0 || b0.aanbetaling <= 0) return { ok: false, reden: 'regels' };
  const btw = await btwVoorOfferte(env, { land, btwNummer, vies });
  await env.DB.prepare(`INSERT INTO maat_offertes (aanvraag_id, regels_json, totaal_cents, aanbetaling_cents, email, land, btw_nummer, btw_behandeling, btw_tarief, vies_raadpleging, verstuurd_op)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    ON CONFLICT(aanvraag_id) DO UPDATE SET regels_json = excluded.regels_json, totaal_cents = excluded.totaal_cents, aanbetaling_cents = excluded.aanbetaling_cents,
      email = excluded.email, land = excluded.land, btw_nummer = excluded.btw_nummer, btw_behandeling = excluded.btw_behandeling, btw_tarief = excluded.btw_tarief,
      vies_raadpleging = excluded.vies_raadpleging, verstuurd_op = excluded.verstuurd_op, gemaakt_op = datetime('now'),
      akkoord_op = NULL, aanpassing = NULL, aanpassing_op = NULL, order_id = NULL, link_op = NULL`)
    .bind(id, JSON.stringify(regels), centen(b0.totaal), centen(b0.aanbetaling), adres, btw.land, btw.btwNummer, btw.treatment, btw.rate, btw.raadpleging).run();
  await env.DB.prepare("UPDATE maat_aanvragen SET stand = 'offerte', bijgewerkt_op = datetime('now') WHERE id = ?").bind(id).run();
  const b = bedragen(regels, btw.rate);
  /* sendMail zwijgt zonder RESEND_API_KEY; dan is er ook niets gemaild en zegt /admin dat. */
  let gemaild = false;
  try {
    await sendMail(env, { to: adres, subject: offerteOnderwerp(a), html: offerteMail(a, regels, b, btw, origin) });
    gemaild = !!env.RESEND_API_KEY;
  } catch (e) { console.error('[op-maat] offertemail niet verstuurd —', e?.message || e); }
  return { ok: true, totaal: b.totaal, aanbetaling: b.aanbetaling, btw: btw.treatment, tarief: btw.rate, gemaild, email: adres };
}

function offerteOnderwerp(a) {
  const nl = a.taal !== 'en';
  const dienst = (DIENST_NAAM[nl ? 'nl' : 'en'] || {})[a.dienst] || a.dienst;
  return nl ? `Je offerte voor ${dienst} — ${KENMERK_VAN(a.id)}` : `Your quote for ${dienst} — ${KENMERK_VAN(a.id)}`;
}

export function offerteMail(a, regels, b, btw, origin) {
  const lang = a.taal === 'en' ? 'en' : 'nl';
  const nl = lang === 'nl';
  const euro = (x) => mailBedrag(centen(x), lang);
  const dienst = (DIENST_NAAM[lang] || {})[a.dienst] || a.dienst;
  const link = studioUrl(origin, `/op-maat?id=${a.id}#om-offerte`, lang);
  const btwRegel = b.aanbetalingBtwCents > 0
    ? [nl ? `Btw (${Math.round(btw.rate * 100)}%)` : `VAT (${Math.round(btw.rate * 100)}%)`, esc(mailBedrag(b.aanbetalingBtwCents, lang))]
    : [nl ? 'Btw' : 'VAT', esc(vatStatement(btw.treatment, lang) || (nl ? 'geen' : 'none'))];
  return shell({
    lang,
    preheader: nl ? 'De prijs van je stijl op maat. Akkoord of iets aanpassen kan in Studio.' : 'The price of your custom style. Accept or ask for a change in Studio.',
    body: [
      h1(nl ? 'Je offerte' : 'Your quote', kenmerk('aanvraag', KENMERK_VAN(a.id), lang)),
      /* levering 119 (18 november 2026, proefronde A0-01): de voornaam helemaal; zonder voornaam het oude gedrag. */
      p(String(a.first_name || '').trim() ? esc(aanhefTekst(String(a.first_name).trim().replace(/\s+/g, ' '), lang === 'nl' ? 'nl' : 'en')) : greeting(a.name, lang)),
      p(nl
        ? `Hieronder staat de prijs voor <strong>${esc(dienst)}</strong>, zoals we hem na het voorbeeld hebben uitgewerkt. Alle bedragen zijn exclusief btw.`
        : `Below is the price for <strong>${esc(dienst)}</strong>, as we worked it out after the preview. All amounts exclude VAT.`),
      rows([
        ...regels.map((r) => [r.naam, esc(euro(r.bedrag))]),
        [nl ? 'Totaal' : 'Total', esc(euro(b.totaal))],
        [nl ? 'Nu, de helft' : 'Now, half', esc(euro(b.aanbetaling))],
        btwRegel,
        [nl ? 'Bij levering' : 'On delivery', esc(euro(b.rest))],
      ]),
      p(nl
        ? `Klopt het? Geef in Studio akkoord; dan krijg je meteen de betaallink voor de helft (${esc(mailBedrag(b.aanbetalingBrutoCents, lang))}) op dit adres. Wil je iets anders, dan zeg je daar wat, en sturen we een nieuwe offerte.`
        : `Looks right? Accept it in Studio and you get the payment link for half (${esc(mailBedrag(b.aanbetalingBrutoCents, lang))}) at this address straight away. Want something different? Tell us there and we send a new quote.`),
      button(link, nl ? 'Bekijk en geef akkoord' : 'Review and accept'),
      terugval(link, lang, { top: 0 }),
      vragen(lang, KENMERK_VAN(a.id), { aanvraag: true }),
    ].join(''),
  });
}

/* ── 2 · de klant wil iets aanpassen ─────────────────────────────────────────────────────────────────────── */

export async function vraagAanpassing(env, customerId, id, tekstIn) {
  const a = await aanvraagVan(env, customerId, id);
  if (!a) return { ok: false, reden: 'weg' };
  if (a.stand !== 'offerte') return { ok: false, reden: 'stand' };
  const tekst = String(tekstIn || '').replace(/\s+/g, ' ').trim().slice(0, 800);
  if (tekst.length < 3) return { ok: false, reden: 'anders' };
  const r = await offerteRij(env, id);
  if (!r || r.akkoord_op) return { ok: false, reden: 'al' };
  await env.DB.batch([
    env.DB.prepare("UPDATE maat_offertes SET aanpassing = ?, aanpassing_op = datetime('now') WHERE aanvraag_id = ?").bind(tekst, id),
    env.DB.prepare("INSERT INTO maat_besluiten (aanvraag_id, onderwerp, besluit, notitie) VALUES (?, 'offerte', 'aanpassen', ?)").bind(id, tekst),
    env.DB.prepare("UPDATE maat_aanvragen SET stand = 'akkoord', bijgewerkt_op = datetime('now') WHERE id = ? AND stand = 'offerte'").bind(id),
  ]);
  return { ok: true };
}

/* ── 3 · de klant geeft akkoord: de bestelling en de betaallink ─────────────────────────────────────────── */

/**
 * `zakelijk`: het zakelijk-vinkje (BUSINESS_TEXT); bij een verlegde offerte zit de verleggingszin erin. Zonder vinkje
 * geen akkoord: VISUAILS levert alleen aan bedrijven, en zonder verklaring is 0% verlegd niet te verdedigen.
 */
export async function akkoordEnBetaallink(env, customerId, id, { zakelijk = false, origin } = {}) {
  const a = await aanvraagVan(env, customerId, id);
  if (!a) return { ok: false, reden: 'weg' };
  if (a.stand !== 'offerte') return { ok: false, reden: 'stand' };
  if (zakelijk !== true) return { ok: false, reden: 'zakelijk' };
  const r = await offerteRij(env, id);
  if (!r) return { ok: false, reden: 'weg' };
  if (r.akkoord_op) return { ok: false, reden: 'al' };
  let regels = [];
  try { regels = JSON.parse(r.regels_json) || []; } catch { regels = []; }
  const tarief = Number(r.btw_tarief) || 0;
  const b = bedragen(regels, tarief);
  const k = await env.DB.prepare('SELECT name, brand, phone, country FROM customers WHERE id = ?').bind(customerId).first();
  const lang = a.taal === 'en' ? 'en' : 'nl';
  const verlegd = r.btw_behandeling === VAT_TREATMENT.reverseCharge;
  const details = {
    request: 'op-maat', opmaat_id: id, opmaat_dienst: a.dienst, quote_kind: 'aanbetaling',
    opmaat_totaal: b.totaal, opmaat_rest: b.rest, opmaat_regels: regels,
    business_declaration: BUSINESS_VERSION,
    ...(verlegd ? { vat_declaration: verleggingZin(lang, { merk: (k && k.brand) || '', btw: r.btw_nummer || '' }, VERLEGGING_VERSION), vies_consultation: r.vies_raadpleging || null } : {}),
  };
  /* Eerst het akkoord vastzetten (één keer, ook bij twee tabbladen), dan pas de bestelling. */
  const vast = await env.DB.prepare("UPDATE maat_offertes SET akkoord_op = datetime('now') WHERE aanvraag_id = ? AND akkoord_op IS NULL RETURNING akkoord_op").bind(id).first();
  if (!vast) return { ok: false, reden: 'al' };
  const ref = nieuwKenmerk();
  /* Bij verlegde btw het VIES-bewijs op de bestelling zelf, waar de factuur en de ICP-opgaaf het lezen. */
  await env.DB.prepare(`INSERT INTO orders (ref, customer_id, service, status, name, brand, email, phone, vat_number, lang, details_json,
        total_cents, vat_cents, vat_rate, vat_treatment, country, payment_status, review_state, reviewed_at, reviewed_by, source,
        vat_valid, vat_valid_state, vat_checked_at, vat_consultation)
      VALUES (?1, ?2, 'custom', 'received', ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, 'unpaid', 'approved', datetime('now'), 'op-maat-akkoord', 'op-maat',
        ?15, ?16, ?17, ?18)`)
    .bind(ref, customerId, (k && k.name) || null, (k && k.brand) || null, r.email, (k && k.phone) || null, r.btw_nummer || null, lang, JSON.stringify(details),
      centen(b.aanbetaling), b.aanbetalingBtwCents, tarief, r.btw_behandeling || VAT_TREATMENT.standard, r.land || (k && k.country) || null,
      verlegd ? 1 : 0, verlegd ? 1 : null, verlegd ? r.verstuurd_op : null, verlegd ? (r.vies_raadpleging || null) : null).run()
    .catch(async (e) => {
      /* Lukt de bestelling niet, dan het akkoord terug: anders staat de offerte vast zonder bestelling. */
      await env.DB.prepare('UPDATE maat_offertes SET akkoord_op = NULL WHERE aanvraag_id = ?').bind(id).run().catch(() => {});
      throw e;
    });
  const o = await env.DB.prepare('SELECT id FROM orders WHERE ref = ?').bind(ref).first();
  /* levering 118 (17 november 2026, proefronde P4-06): het factuuradres uit Je gegevens op de bestelling, waar de
     factuur het leest; zonder adres ging de aanbetaling uit met alleen een naam. Ontbreekt het, dan vraagt de betaallink
     er eerst om (de bestelpagina, src/lib/betaallink.js en portal.js). Werpt niet: het akkoord staat al. */
  await env.DB.prepare(`UPDATE orders SET address_line1 = c.address_line1, address_line2 = c.address_line2, postal_code = c.postal_code,
      city = c.city, region = c.region, first_name = c.first_name, last_name = c.last_name
      FROM (SELECT address_line1, address_line2, postal_code, city, region, first_name, last_name FROM customers WHERE id = ?2) AS c
     WHERE orders.id = ?1 AND c.address_line1 IS NOT NULL AND TRIM(c.address_line1) != ''`).bind(o.id, customerId).run()
    .catch((e) => console.error('[op-maat] adres niet op de bestelling gezet —', e?.message || e));
  /* levering 117 (17 november 2026, proefronde P5-08): met een test_-sleutel is dit een proefbestelling,
     net als in /api/order. Zonder deze regel gaf een testbetaling een factuur uit de echte reeks. */
  await markeerProefbestelling(env, o.id);
  const nlT = lang === 'nl';
  await env.DB.batch([
    env.DB.prepare('UPDATE maat_offertes SET order_id = ? WHERE aanvraag_id = ?').bind(o.id, id),
    env.DB.prepare("INSERT INTO maat_besluiten (aanvraag_id, onderwerp, besluit, notitie) VALUES (?, 'offerte', 'goed', ?)").bind(id, ref),
    env.DB.prepare("UPDATE maat_aanvragen SET stand = 'vastgelegd', bijgewerkt_op = datetime('now') WHERE id = ? AND stand = 'offerte'").bind(id),
    env.DB.prepare("INSERT INTO order_events (order_id, status, note, actor) VALUES (?, 'received', ?, 'studio')").bind(o.id, nlT
      ? `Akkoord op de offerte op maat (${KENMERK_VAN(id)}): aanbetaling van ${mailBedrag(centen(b.aanbetaling), 'nl')} excl. btw, de helft van ${mailBedrag(centen(b.totaal), 'nl')}.`
      : `Quote accepted (${KENMERK_VAN(id)}): deposit of ${mailBedrag(centen(b.aanbetaling), 'en')} excl. VAT, half of ${mailBedrag(centen(b.totaal), 'en')}.`),
  ]);
  const link = await stuurLink(env, id, o.id, origin);
  return { ok: true, ref, email: r.email, link: !!link, betaalUrl: `/api/order-pay?ref=${encodeURIComponent(ref)}&lang=${lang}` };
}

async function stuurLink(env, id, orderId, origin) {
  /* Zonder mailsleutel geeft stuurBetaallink wel een link terug, maar komt er niets aan: dan telt het niet als verstuurd. */
  if (!env.RESEND_API_KEY) return null;
  const url = await stuurBetaallink(env, orderId, { origin, offerte: true }).catch((e) => { console.error('[op-maat] betaallink niet verstuurd —', e?.message || e); return null; });
  if (url) await env.DB.prepare("UPDATE maat_offertes SET link_op = datetime('now') WHERE aanvraag_id = ?").bind(id).run();
  return url;
}

/** /admin: de betaallink opnieuw, als hij bij het akkoord niet weg kon of de klant hem kwijt is. */
export async function betaallinkOpnieuw(env, id, { origin } = {}) {
  const r = await offerteRij(env, id);
  if (!r || !r.order_id) return { ok: false, reden: 'weg' };
  const o = await env.DB.prepare('SELECT payment_status, status FROM orders WHERE id = ?').bind(r.order_id).first();
  if (!o || o.payment_status === 'paid' || o.status === 'cancelled') return { ok: false, reden: 'stand' };
  const url = await stuurLink(env, id, r.order_id, origin);
  return url ? { ok: true } : { ok: false, reden: 'link' };
}
