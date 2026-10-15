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

/** De bewaarde bevestiging, of null. */
export async function leesUitgesteld(env, ref) {
  if (!env?.UPLOADS || !ref) return null;
  try {
    const obj = await env.UPLOADS.get(uitgesteldSleutel(ref));
    if (!obj) return null;
    const tekst = typeof obj.text === 'function' ? await obj.text() : '';
    const mail = JSON.parse(tekst || 'null');
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
  if (!mail) return false;
  await wisUitgesteld(env, ref);
  try {
    await sendMail(env, { to: mail.to, subject: mail.subject, html: mail.html });
    return true;
  } catch (err) {
    console.error('[uitgesteld] bevestiging niet verstuurd voor', ref, '—', err?.message || err);
    try { await env.UPLOADS.put(uitgesteldSleutel(ref), JSON.stringify(mail), { httpMetadata: { contentType: 'application/json' } }); } catch { /* dan niet */ }
    return false;
  }
}
