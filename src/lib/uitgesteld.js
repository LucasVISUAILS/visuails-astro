/* VISUAILS — de uitgestelde bevestiging (doorloop 27, B04, 15 oktober 2026)
 *
 * Wie na het bestellen meteen naar Mollie gaat, kreeg binnen seconden twee
 * mails: "We hebben je bestelling" (met een groot blok "Nog niet betaald?") en
 * "Betaling ontvangen". Lucas koos voor één mail na de betaalstatus.
 *
 * functions/api/order.js zet de bevestiging daarom in R2 in plaats van hem te
 * versturen, onder een vaste sleutel per kenmerk. De betaalwebhook beslist:
 *   betaald                        → de betaalmail met de factuur krijgt het
 *                                    overzicht ("Wat je bestelde") erbij; de
 *                                    bewaarde mail gaat weg.
 *   mislukt, afgebroken, verlopen  → de bewaarde bevestiging gaat alsnog uit,
 *                                    met de betaalknop, en gaat dan weg.
 * Een betaling die blijft hangen, verloopt bij Mollie (iDEAL na een kwartier)
 * en komt dan ook langs de webhook. Daarna geldt de gewone herinnering van de
 * nachtelijke taak.
 *
 * Alles best effort: een webhook mag niet omvallen omdat R2 of de mail hikt.
 */
import { sendMail } from './mail.js';

export const uitgesteldSleutel = (ref) => `mail-uitgesteld/${String(ref || '').trim().toUpperCase()}.json`;

/*
 * ── HET OVERZICHT BLIJFT VOOR DE BETAALMAIL — levering 119 (18 november 2026, proefronde W2-06) ──────────────
 * Na een eerst mislukte betaling ging de bewaarde bevestiging uit en werd hij gewist; betaalde de klant daarna,
 * dan miste de mail met de factuur "Wat je bestelde". Hetzelfde bij een bestelling die eerst werd nagekeken (de
 * bevestiging ging meteen). Nu blijft er onder dezelfde sleutel een "alleen overzicht" staan:
 * { samenvatting, alVerstuurd: true }, zonder `to` en `html`. De betaalmail leest het overzicht (leesUitgesteld),
 * maar er wordt nooit een tweede bevestiging van gemaakt (stuurUitgesteld kijkt naar `to` en `html`).
 */
const alleenOverzicht = (samenvatting) => JSON.stringify({ samenvatting: String(samenvatting), alVerstuurd: true, nieuwAdres: false });

/** Na een bevestiging die meteen uitging: het overzicht bewaren voor de betaalmail met de factuur. */
export async function bewaarOverzicht(env, ref, samenvatting) {
  if (!env?.UPLOADS || !ref || !samenvatting) return false;
  try {
    await env.UPLOADS.put(uitgesteldSleutel(ref), alleenOverzicht(samenvatting), { httpMetadata: { contentType: 'application/json' } });
    return true;
  } catch (err) {
    console.warn('[uitgesteld] overzicht niet bewaard voor', ref, '—', err?.message || err);
    return false;
  }
}

/** De bewaarde bevestiging (of alleen het overzicht, zie hierboven), of null. */
export async function leesUitgesteld(env, ref) {
  if (!env?.UPLOADS || !ref) return null;
  try {
    const obj = await env.UPLOADS.get(uitgesteldSleutel(ref));
    if (!obj) return null;
    const tekst = typeof obj.text === 'function' ? await obj.text() : '';
    const mail = JSON.parse(tekst || 'null');
    if (mail && mail.alVerstuurd && mail.samenvatting) return { samenvatting: mail.samenvatting, alVerstuurd: true, nieuwAdres: false };
    return mail && mail.to && mail.html ? mail : null;
  } catch (err) {
    console.warn('[uitgesteld] niet leesbaar voor', ref, '—', err?.message || err);
    return null;
  }
}

export async function wisUitgesteld(env, ref) {
  if (!env?.UPLOADS || !ref) return;
  try { await env.UPLOADS.delete(uitgesteldSleutel(ref)); } catch (err) {
    console.warn('[uitgesteld] niet gewist voor', ref, '—', err?.message || err);
  }
}

/**
 * Mislukt, afgebroken of verlopen: de bewaarde bevestiging alsnog versturen.
 * Eerst wissen, dan versturen — twee webhooks tegelijk (twee pogingen die
 * allebei verlopen) mogen hooguit één mail geven. Lukt het versturen niet,
 * dan komt hij terug in R2 en probeert de volgende webhook het opnieuw.
 * @returns {Promise<boolean>} of er een mail is verstuurd
 */
export async function stuurUitgesteld(env, ref) {
  const mail = await leesUitgesteld(env, ref);
  /* levering 119 (W2-06): een "alleen overzicht" is al verstuurd; nooit een tweede bevestiging. */
  if (!mail || !mail.to || !mail.html) return false;
  await wisUitgesteld(env, ref);
  try {
    await sendMail(env, { to: mail.to, subject: mail.subject, html: mail.html });
    /* levering 119 (W2-06): het overzicht blijft staan voor de betaalmail, als de klant daarna alsnog betaalt. */
    if (mail.samenvatting) await bewaarOverzicht(env, ref, mail.samenvatting);
    return true;
  } catch (err) {
    console.error('[uitgesteld] bevestiging niet verstuurd voor', ref, '—', err?.message || err);
    try { await env.UPLOADS.put(uitgesteldSleutel(ref), JSON.stringify(mail), { httpMetadata: { contentType: 'application/json' } }); } catch { /* dan niet */ }
    return false;
  }
}
