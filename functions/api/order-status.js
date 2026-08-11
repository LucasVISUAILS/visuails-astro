/*
 * ─────────────────────────────────────────────────────────────────────────────
 * IS DEZE BESTELLING ONDERWEG, OF IS HIJ TEGENGEHOUDEN? — 11 AUGUSTUS 2026
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Lucas, vandaag: *"Misschien na de betaling dat er een pagina is van dat de
 * bestelling is geannuleerd omdat de persoon al eerder een test sample heeft
 * aangevraagd."*
 *
 * Dat kan niet zonder dit eindpunt, en de reden is een kwestie van volgorde. De
 * betalerscontrole draait in de Mollie-webhook, want daar is het IBAN voor het
 * eerst bekend. De bedankpagina is statisch en weet dus niets. Zonder iets wat
 * die twee verbindt, komt iemand die zojuist geannuleerd is op een scherm dat
 * hem bedankt voor zijn bestelling — en hoort hij het pas uit een mail.
 *
 * ── WAT DIT WEL EN NIET TERUGGEEFT ──────────────────────────────────────────
 *
 * Alleen of deze bestelling is afgewezen, en waarom. Geen naam, geen bedrag,
 * geen e-mailadres, geen status uit de productiepijplijn. Dat is geen
 * voorzichtigheid om de voorzichtigheid: een referentie als VIS-4Q7-2AB is kort
 * genoeg om te raden, dus alles wat hier uit komt moet ook mogen uitlekken naar
 * iemand die gokt. "Deze bestelling is geannuleerd" is dat; een naam of een
 * bedrag niet.
 *
 * Wie meer wil zien, heeft het portaal, en dat werkt op een token in plaats van
 * op een referentie — zie src/lib/token.js.
 *
 * ── EN HET ANTWOORD IS NOOIT "IK WEET HET NIET" ─────────────────────────────
 *
 * Een onbekende referentie, een lege database, een kapotte query: allemaal
 * `cancelled: false`. De bedankpagina toont dan gewoon de bedanktekst, en dat is
 * de goede kant om — een bezoeker die wél gewoon besteld heeft, mag nooit een
 * annuleringsmelding zien omdat er hier iets omviel.
 */

const REF = /^VIS-[A-Z0-9-]{3,32}$/i;

export async function onRequestGet({ request, env }) {
  const nothing = () =>
    new Response(JSON.stringify({ cancelled: false }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        // Niet bewaren. De hele vraag is "is dit NET geannuleerd", en het antwoord
        // verandert binnen enkele seconden na de betaling — zie de wedloop tussen
        // de webhook en de terugkeer van de bezoeker in initThankYou().
        'Cache-Control': 'no-store',
      },
    });

  let ref = '';
  try {
    ref = (new URL(request.url).searchParams.get('ref') || '').trim();
  } catch {
    return nothing();
  }
  if (!REF.test(ref) || !env?.DB) return nothing();

  try {
    const row = await env.DB
      .prepare(`SELECT status, cancel_reason FROM orders WHERE ref = ?1`)
      .bind(ref.toUpperCase())
      .first();

    if (row?.status === 'cancelled') {
      return new Response(
        JSON.stringify({ cancelled: true, reason: row.cancel_reason || '' }),
        { status: 200, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } }
      );
    }
  } catch (err) {
    console.error('[order-status] kon', ref, 'niet lezen —', err?.message || err);
  }

  return nothing();
}
