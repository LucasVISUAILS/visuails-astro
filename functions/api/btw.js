// VISUAILS — POST /api/btw. 15 oktober 2026 (doorloop 27, B05).
//
// { land, nummer } → { stand: 'geldig' | 'ongeldig' | 'onbekend' }
//
// Een EU-btw-nummer dat de Europese controle (VIES) niet kent, werd pas na het
// bestellen opgemerkt: de klant kreeg "we kijken je gegevens na, binnen een
// werkdag" en geen betaallink. Het formulier vraagt het nu in stap 3, zodra het
// nummer de goede vorm heeft, en zegt het meteen.
//
// Alleen geldig of niet: geen bedrijfsnaam of adres terug (VIES geeft die wel).
// Dit is een hulp, niet de beslissing: functions/api/order.js vraagt VIES bij
// het bestellen opnieuw en beslist daar. Bij een storing, de grens of een
// nummer van de verkeerde vorm: 'onbekend', en het formulier zegt niets.
import { normaliseVat, viesCode, vatFormatOk, HOME_COUNTRY } from '../../src/data/vat.js';
import { checkVat } from '../../src/lib/vies.js';
import { checkRate, clientIp } from '../../src/lib/ratelimit.js';

const kop = { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' };
const antwoord = (stand) => new Response(JSON.stringify({ stand }), { status: 200, headers: kop });

export async function onRequestPost({ request, env }) {
  let body = {};
  try { body = await request.json(); } catch { body = {}; }
  const land = String(body?.land || '').trim().toUpperCase().slice(0, 2);
  const nummer = String(body?.nummer || '').trim().slice(0, 30);
  const cc = viesCode(land);
  if (!cc || land === HOME_COUNTRY || vatFormatOk(land, nummer) !== true) return antwoord('onbekend');
  const gate = await checkRate(env, { ip: clientIp(request), action: 'btw-check', limit: 12, windowSeconds: 600 });
  if (!gate.allowed) return antwoord('onbekend');
  const { number } = normaliseVat(nummer);
  const vies = await checkVat(cc, number, null).catch(() => null);
  if (!vies || !vies.ok) return antwoord('onbekend');
  return antwoord(vies.valid ? 'geldig' : 'ongeldig');
}
