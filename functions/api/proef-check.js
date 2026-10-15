// VISUAILS — POST /api/proef-check. 15 oktober 2026 (doorloop 27, B41).
//
// { email, phone, reg_number } → { al: true | false }
//
// Wie al een betaalde €1-proef had, hoorde dat pas na alle stappen en de
// foto's ("Je hebt VISUAILS al geprobeerd"). Het formulier vraagt het nu bij
// het verlaten van stap 3. Dezelfde vergelijking als bij het versturen
// (src/lib/proefGebruikt.js); de weigering bij het versturen blijft staan.
//
// Wat eruit komt is hetzelfde wat het versturen al zei: "dit adres had al een
// proef", niets meer (geen naam, geen datum). Wel strenger begrensd dan het
// versturen, omdat dit eindpunt goedkoper te bevragen is. Faalt open: bij een
// storing of de grens zegt het `al: false`, en beslist het versturen.
import { proefGebruikt } from '../../src/lib/proefGebruikt.js';
import { checkRate, clientIp } from '../../src/lib/ratelimit.js';

const kop = { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' };
const antwoord = (al) => new Response(JSON.stringify({ al: !!al }), { status: 200, headers: kop });

export async function onRequestPost({ request, env }) {
  let body = {};
  try { body = await request.json(); } catch { body = {}; }
  const email = String(body?.email || '').trim().slice(0, 254);
  const phone = String(body?.phone || '').trim().slice(0, 40);
  const reg = String(body?.reg_number || '').trim().slice(0, 40);
  if (!email && !phone && !reg) return antwoord(false);
  const gate = await checkRate(env, { ip: clientIp(request), action: 'proef-check', limit: 8, windowSeconds: 600 });
  if (!gate.allowed) return antwoord(false);
  const { checked, used } = await proefGebruikt(env, { email, phone, reg });
  return antwoord(checked && used > 0);
}
