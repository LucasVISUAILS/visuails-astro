// VISUAILS — Resend webhook (Cloudflare Pages Function). 4 september 2026.
//
// POST /api/webhook/resend
//
// Vangt `email.bounced` en `email.complained` op en schrijft ze in mail_bounces,
// zodat /admin een rode regel kan tonen bij de bestelling en de klant met dat
// adres. Alles erover — de handtekening, wat er wordt bewaard, waarom een
// dubbele aflevering geen fout is — staat in src/lib/bounces.js.
//
// Binding: env.RESEND_WEBHOOK_SECRET (het `whsec_…` uit het Resend-dashboard bij
// de webhook voor https://visuails.com/api/webhook/resend). Zonder secret wordt
// ELKE aanroep geweigerd: een webhook zonder handtekening is een open deur.
//
// Dezelfde antwoordregels als de andere twee webhooks:
//   · ongeldige handtekening → 401, niets geschreven;
//   · een gebeurtenis die ons niet aangaat (sent, delivered, opened) → 200;
//   · dubbele aflevering → 200 (de UNIQUE op event_id vangt hem);
//   · elke andere databasefout → 500, zodat Svix het opnieuw probeert.

import { verifySvix, parseBounce, recordBounce } from '../../../src/lib/bounces.js';

export async function onRequestPost({ request, env }) {
  const secret = env?.RESEND_WEBHOOK_SECRET;
  if (!secret) {
    console.error('[resend-webhook] RESEND_WEBHOOK_SECRET niet gezet — aanroep geweigerd');
    return new Response('webhook not configured', { status: 503 });
  }

  // De RUWE tekst, één keer gelezen, vóór alles — zie de kop van stripe.js.
  const raw = await request.text();
  const headers = {
    id: request.headers.get('svix-id'),
    timestamp: request.headers.get('svix-timestamp'),
    signature: request.headers.get('svix-signature'),
  };
  if (!(await verifySvix(raw, headers, secret))) {
    console.warn('[resend-webhook] ongeldige handtekening');
    return new Response('bad signature', { status: 401 });
  }

  let payload;
  try {
    payload = JSON.parse(raw);
  } catch {
    return new Response('bad json', { status: 400 });
  }

  const bounce = parseBounce(payload);
  if (!bounce) return new Response('ignored', { status: 200 });

  try {
    const nieuw = await recordBounce(env, headers.id, bounce);
    console.log(`[resend-webhook] ${bounce.kind} voor ${bounce.email}${nieuw ? '' : ' (al bekend)'}`);
    return new Response(nieuw ? 'recorded' : 'duplicate', { status: 200 });
  } catch (err) {
    console.error('[resend-webhook] niet weggeschreven —', err?.message || err);
    return new Response('storage error', { status: 500 });
  }
}
