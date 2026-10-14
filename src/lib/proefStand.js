/*
 * ═══════════════════════════════════════════════════════════════════════════════
 * PROEF TIJDELIJK DICHT, EN DE WACHTLIJST — 8 oktober 2026 (G2, ronde A2)
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Lucas koos V9 = a: een schakelaar in /admin, "Proef tijdelijk dicht", met de
 * stand "alleen de lifestyleproef open". Een catalogproef kost 20–30 minuten;
 * één goede post kan een week vullen en de levertijd van betalende klanten
 * breken. Er gebeurt niets vanzelf (§21): jij zet hem dicht en weer open.
 *
 * Zijn notitie: *"Wellicht de mail van klanten vragen om ze een pushbericht te
 * sturen wanneer hij weer open is … dit verhoogt wellicht conversie en laat mij
 * ook zien hoeveel animo er is voor de proef, ook wanneer hij niet aan staat."*
 * Uitvoering: één veld en één knop op /test-sample zolang hij dicht is; de
 * adressen in `proef_wachtlijst` (migratie 0054); in /admin het aantal; en zodra
 * hij weer open is de knop "Mail de wachtlijst (N)": één mail per adres, daarna
 * weg. Geen nieuwsbrief, geen pushbericht.
 *
 * ── DE STAND ────────────────────────────────────────────────────────────────
 *
 * In app_settings onder `proef_stand`, zoals de melding in Studio (melding.js):
 *   'open'       — gewoon (ook als er niets staat)
 *   'dicht'      — geen nieuwe €1-proeven
 *   'lifestyle'  — alleen de lifestyleproef; de catalogproef is dicht
 * Een kapotte of lege waarde is 'open': de schakelaar mag nooit de reden zijn
 * dat iemand niet kan bestellen zonder dat jij hem omzette.
 *
 * ── HET WISSEN, OP ÉÉN PLEK ─────────────────────────────────────────────────
 *
 * Lucas kiest nog tussen "weg na de mail" en "bewaren voor een nieuwsbrief met
 * een apart vinkje". Nu: weg na de mail. Dat besluit staat in NA_DE_MAIL en in
 * naDeMail() hieronder, en nergens anders; privacy §2/§6 zeggen hetzelfde.
 */
import { sendMail } from './mail.js';
import { shell, h1, p, button, esc } from './mailTemplate.js';
import { TEST_SAMPLE } from '../data/pricing.js';

export const PROEF_STAND_KEY = 'proef_stand';
export const PROEF_STANDEN = ['open', 'dicht', 'lifestyle'];

/** 'wissen' = weg na de mail (nu). Een andere waarde bestaat nog niet. */
export const NA_DE_MAIL = 'wissen';

/** De stand, nooit een fout: bij twijfel 'open'. */
export async function leesProefStand(env) {
  try {
    const rij = await env?.DB?.prepare('SELECT value FROM app_settings WHERE key = ?1').bind(PROEF_STAND_KEY).first();
    return PROEF_STANDEN.includes(rij?.value) ? rij.value : 'open';
  } catch {
    return 'open';
  }
}

/** Zet de stand. Geeft { ok, fout }. */
export async function zetProefStand(env, stand) {
  if (!PROEF_STANDEN.includes(stand)) return { ok: false, fout: 'Kies open, dicht of alleen lifestyle.' };
  await env.DB.prepare(
    `INSERT INTO app_settings (key, value) VALUES (?1, ?2)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`
  ).bind(PROEF_STAND_KEY, stand).run();
  return { ok: true };
}

/** Mag een proef van deze soort ('catalog' | 'lifestyle') nu besteld worden? */
export function proefOpenVoor(stand, soort) {
  if (stand === 'dicht') return false;
  if (stand === 'lifestyle') return soort === 'lifestyle';
  return true;
}

/* ── DE WACHTLIJST ─────────────────────────────────────────────────────────── */

export function isEmail(s) {
  return typeof s === 'string' && s.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

/** Zet een adres op de lijst. Dubbel = één rij. Geeft { ok, nieuw }. */
export async function opWachtlijst(env, email, taal) {
  const adres = String(email || '').trim().toLowerCase();
  if (!isEmail(adres)) return { ok: false, nieuw: false };
  const t = taal === 'en' ? 'en' : 'nl';
  const r = await env.DB.prepare(
    'INSERT INTO proef_wachtlijst (email, taal) VALUES (?1, ?2) ON CONFLICT(email) DO NOTHING'
  ).bind(adres, t).run();
  return { ok: true, nieuw: Boolean(r?.meta?.changes) };
}

/** Hoeveel adressen er wachten. null als de tabel er niet is (migratie 0054 nog niet gedraaid). */
export async function telWachtlijst(env) {
  try {
    const r = await env.DB.prepare('SELECT COUNT(*) AS n FROM proef_wachtlijst').first();
    return Number(r?.n || 0);
  } catch {
    return null;
  }
}

/** De mail "de nieuwe ronde is open". Kort, één knop, en dat het de enige is.
 *  kG2 (11 oktober 2026): in de woorden van /test-sample — rondes, een beperkt
 *  aantal per ronde, en je hoort het als eerste. Geen aantal: dat is er niet. */
export function weerOpenMail(lang, stand = 'open', origin = 'https://visuails.com') {
  const nl = lang === 'nl';
  const s = TEST_SAMPLE[nl ? 'nl' : 'en'];
  const href = `${origin}${nl ? '/nl' : ''}/test-sample/`;
  const alleenLifestyle = stand === 'lifestyle';
  return {
    subject: nl ? 'De nieuwe proefronde van VISUAILS is open' : 'A new VISUAILS test sample round is open',
    html: shell({
      lang: nl ? 'nl' : 'en',
      preheader: nl ? `Eén product voor ${s.price}, gemaakt van jouw eigen foto.` : `One product for ${s.price}, made from your own photo.`,
      body: [
        h1(nl ? 'De nieuwe ronde is open' : 'The new round is open'),
        p(nl ? 'Hoi,' : 'Hi,'),
        p(esc(nl
          ? `Je stond op de lijst voor de proef van VISUAILS, dus je hoort het als eerste: de nieuwe ronde is open${alleenLifestyle ? ', voor een lifestylecarrousel' : ''}. Eén product voor ${s.price}, gemaakt van jouw eigen foto. Per ronde nemen we een beperkt aantal proeven aan.`
          : `You were on the list for the VISUAILS test sample, so you are the first to hear: the new round is open${alleenLifestyle ? ', for a lifestyle carousel' : ''}. One product for ${s.price}, made from your own photo. We take a limited number of test samples per round.`)),
        button(href, s.cta),
        p(esc(nl
          ? 'Dit is de enige mail die je hierover krijgt: we hebben je adres nu van de lijst gehaald.'
          : 'This is the only email you get about this: we have now taken your address off the list.'), { muted: true }),
        p(esc('— VISUAILS')),
      ].join(''),
    }),
  };
}

/**
 * Na de mail: wat er met de adressen gebeurt. DE ENIGE PLEK waar dat besloten
 * wordt (zie de kop). Nu: wissen, alleen de adressen die de mail echt kregen —
 * een adres waarvan de mail mislukte, blijft staan voor de volgende poging.
 */
export async function naDeMail(env, verstuurd) {
  if (NA_DE_MAIL !== 'wissen' || !verstuurd.length) return 0;
  let weg = 0;
  for (const email of verstuurd) {
    const r = await env.DB.prepare('DELETE FROM proef_wachtlijst WHERE email = ?1').bind(email).run();
    weg += Number(r?.meta?.changes || 0);
  }
  return weg;
}

/**
 * Mail iedereen op de lijst, één mail per adres, en wis daarna (naDeMail).
 * Weigert als de proef nog dicht is: dan klopt de mail niet.
 * Geeft { ok, fout?, verstuurd, mislukt, gewist }.
 */
export async function mailWachtlijst(env, { stand, origin = 'https://visuails.com', verstuur = sendMail } = {}) {
  const nu = stand || await leesProefStand(env);
  if (nu === 'dicht') return { ok: false, fout: 'De proef staat nog dicht. Zet hem eerst open; dan klopt de mail.', verstuurd: 0, mislukt: 0, gewist: 0 };
  if (!env?.RESEND_API_KEY) return { ok: false, fout: 'RESEND_API_KEY ontbreekt: er is niets verstuurd en niets gewist.', verstuurd: 0, mislukt: 0, gewist: 0 };
  const { results = [] } = await env.DB.prepare('SELECT email, taal FROM proef_wachtlijst ORDER BY id').all();
  const gelukt = [];
  let mislukt = 0;
  for (const rij of results) {
    const mail = weerOpenMail(rij.taal, nu, origin);
    try {
      await verstuur(env, { to: rij.email, subject: mail.subject, html: mail.html });
      gelukt.push(rij.email);
    } catch {
      mislukt += 1;
    }
  }
  const gewist = await naDeMail(env, gelukt);
  return { ok: true, verstuurd: gelukt.length, mislukt, gewist };
}
