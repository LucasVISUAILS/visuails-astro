// VISUAILS — GET /api/land. 8 oktober 2026 (8.06).
//
// Het land van de bezoeker, zodat het bestelformulier het veld "Land"
// kan voorvullen. Cloudflare zet het land van het ip-adres op het verzoek
// (`request.cf.country`); dat is hetzelfde gegeven dat o16 al gebruikt bij de
// btw-controle in functions/api/order.js. De pagina's zelf zijn statisch
// gebouwd en kennen de bezoeker niet, vandaar deze ene kleine vraag.
//
// Alleen een land uit de keuzelijst, anders null (zie bezoekersLand() in
// src/data/vat.js). Er wordt niets opgeslagen of gelogd, en het antwoord wordt
// niet gedeeld gecachet: het hoort bij deze ene bezoeker.
import { bezoekersLand } from '../../src/data/vat.js';

export function onRequestGet({ request }) {
  const land = bezoekersLand(request?.cf?.country);
  return new Response(JSON.stringify({ land }), {
    status: 200,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'private, no-store',
      'x-content-type-options': 'nosniff',
    },
  });
}
