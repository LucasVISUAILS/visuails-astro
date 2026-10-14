// VISUAILS — GET /api/botcheck. 8 oktober 2026 (o03).
//
// De publieke sleutel van Cloudflare Turnstile, voor de browser. Hij staat niet
// in de pagina's zelf: die worden één keer gebouwd, en de sleutel staat als
// geheim bij de Worker (Cloudflare-dashboard), zodat Lucas hem kan zetten,
// wisselen of weghalen zonder opnieuw te bouwen. src/scripts/botcheck.js vraagt
// hem één keer per pagina op, en alleen als iemand een beschermd formulier
// aanraakt.
//
// `sleutel: null` betekent: de botcheck staat uit (een van de twee sleutels
// ontbreekt). Dan laadt de browser niets van Cloudflare en werkt elk formulier
// zoals voorheen. Zie src/lib/turnstile.js voor de regels.
import { botcheckAan } from '../../src/lib/turnstile.js';

export function onRequestGet({ env }) {
  const sleutel = botcheckAan(env) ? String(env.TURNSTILE_SITE_KEY).trim() : null;
  return new Response(JSON.stringify({ sleutel }), {
    status: 200,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      /* Vijf minuten in de browser: een bezoeker die drie formulieren opent,
         vraagt het één keer. Zet Lucas de sleutels aan of uit, dan geldt dat
         uiterlijk vijf minuten later overal. */
      'cache-control': 'private, max-age=300',
      'x-content-type-options': 'nosniff',
    },
  });
}
