// TEMPORARY DIAGNOSTIC — delete this file once the empty 400 is understood.
//
// GET /admin/debug-mollie   (requires a live /admin session)
//
// ── WHY IT LIVES UNDER /admin AND NOT UNDER /api ────────────────────────────
// It was at /api/debug-mollie first and answered "Sign in at /admin first" to
// a browser that was, visibly, signed in at /admin. Not a bug in the session
// check — the session cookie is set with `Path=/admin` (see setSessionCookie
// in src/lib/admin.js), so the browser correctly declines to attach it to
// anything outside that path. The endpoint never saw a cookie because it was
// never sent one.
//
// The fix is to move the endpoint, NOT to widen the cookie. `Path=/admin` is
// a deliberate narrowing of where an ambient credential travels, and trading a
// standing security property for the convenience of a file that is meant to be
// deleted next week is the wrong way round.
//
// A static route beats a catch-all in Pages Functions, so this file wins over
// functions/admin/[[path]].js for this one path. If you ever see the admin's
// own "Not found" page here instead of JSON, that precedence is what changed.
//
// WHY IT EXISTS
// `/api/order` failed with:
//
//     (error) [order] Mollie 400: (empty body)
//
// and that message contains almost no information. Worse, it is the same
// symptom that killed the Stripe integration on this project — "blank HTTP
// 400s when called from Cloudflare, never from the CLI, never from local
// Node" — which was chased for a while and never resolved. Two different
// payment providers failing the same way from the same Pages Function is not
// a coincidence about the providers.
//
// The one fact worth holding on to: **Mollie answers every application-level
// error with a JSON body** ({status, title, detail, field}). A 400 with an
// EMPTY body therefore did not come from Mollie's application. It came from
// something in front of it refusing the request before Mollie ever parsed it —
// a load balancer or a WAF — which happens when the request is malformed at
// the HTTP layer rather than wrong at the API layer.
//
// So rather than guess which part is malformed, this bisects it. Four probes,
// cheapest first, each isolating one variable:
//
//   A · transport      a well-formed but WRONG key. If Mollie's edge is
//                      reachable and our requests are well-formed, this must
//                      come back as a clean JSON 401. If THIS is an empty 400,
//                      the problem is not our key and not our payload — it is
//                      the connection itself, and that is a Cloudflare↔Mollie
//                      question, not a code question.
//   B · auth           the real key, on a GET with no body at all. Isolates
//                      the Authorization header from everything else. If A
//                      passes and B is an empty 400, the key is carrying
//                      something the wire will not accept.
//   C · minimal POST   amount + description + redirectUrl, nothing else. If B
//                      passes and C fails, the problem is the body.
//   D · the real POST  byte-for-byte what functions/api/order.js sends. If C
//                      passes and D fails, it is one of the three fields D
//                      adds: webhookUrl, locale, or metadata.
//
// The first probe that misbehaves is the answer. Every probe reports the
// response headers as well as the status, because `server` and `cf-ray`
// together say WHO answered — Mollie, a WAF, or Cloudflare's own edge.
//
// C and D create real payments. With a `test_` key those are free, fake, and
// expire on their own; they are described as "DIAGNOSTIC" so they are obvious
// in the Mollie dashboard. With a `live_` key they are real but unpaid
// payments for €0.99, which nobody will ever complete.
//
// It reveals no secret: the key's length, its five-character prefix and a list
// of any invisible characters in it, never the key.

import { hasAdminSession } from '../../src/lib/admin.js';
import { mollieKey, mollieKeyProblems, describeHeaders } from '../../src/lib/mollie.js';
import { AMOUNT } from '../../src/data/pricing.js';

const MOLLIE_API = 'https://api.mollie.com/v2';

export async function onRequestGet(context) {
  const { request, env } = context;

  // Behind the same login as the dashboard — see hasAdminSession's own note.
  if (!(await hasAdminSession(context))) {
    return json({
      error: 'No admin session on this request.',
      hint: 'Sign in at /admin, then reload THIS url — it must be /admin/debug-mollie, not /api/debug-mollie. '
        + 'The session cookie is scoped Path=/admin, so anything outside that path never receives it.',
    }, 403);
  }

  const raw = env?.MOLLIE_API_KEY;
  const out = {
    when: new Date().toISOString(),
    origin: new URL(request.url).origin,
    key: {
      set: !!raw,
      rawLength: raw ? String(raw).length : 0,
      usableLength: raw ? String(raw).replace(/[^\x21-\x7E]/g, '').length : 0,
      prefix: raw ? String(raw).replace(/[^\x21-\x7E]/g, '').slice(0, 5) : null,
      mode: raw ? (String(raw).trim().startsWith('live_') ? 'LIVE' : String(raw).trim().startsWith('test_') ? 'test' : 'unrecognised') : null,
      problems: mollieKeyProblems(env),
    },
    probes: {},
    reading: null,
  };

  if (!raw) {
    out.reading = 'MOLLIE_API_KEY is not set on this deployment. That is the whole problem — nothing else below ran.';
    return json(out);
  }

  let key;
  try {
    key = mollieKey(env);
  } catch (e) {
    out.reading = `The stored key is not usable: ${e.message}`;
    return json(out);
  }

  // A · transport. A syntactically valid key that is not ours.
  out.probes.A_transport = await probe('GET', '/methods', 'test_0000000000000000000000000000000000');

  // B · auth, no body.
  out.probes.B_auth = await probe('GET', '/methods', key);

  // C · the smallest payment Mollie accepts.
  const origin = new URL(request.url).origin;
  out.probes.C_minimalPayment = await probe('POST', '/payments', key, {
    amount: { currency: 'EUR', value: AMOUNT.testSample.toFixed(2) },
    description: 'VISUAILS DIAGNOSTIC — ignore',
    redirectUrl: `${origin}/thank-you`,
  });

  // D · exactly what order.js sends, including the three fields C leaves out.
  const fullBody = {
    amount: { currency: 'EUR', value: AMOUNT.testSample.toFixed(2) },
    description: 'VISUAILS DIAGNOSTIC — ignore',
    redirectUrl: `${origin}/thank-you?ref=VIS-DIAG-000`,
    webhookUrl: `${origin}/api/webhook/mollie`,
    locale: 'en_US',
    metadata: { order_ref: 'VIS-DIAG-000' },
  };
  out.probes.D_realPayment = await probe('POST', '/payments', key, fullBody);
  out.probes.D_realPayment.urlsSent = { redirectUrl: fullBody.redirectUrl, webhookUrl: fullBody.webhookUrl };

  out.reading = read(out);
  return json(out);
}

async function probe(method, path, key, body) {
  const started = Date.now();
  try {
    const res = await fetch(MOLLIE_API + path, {
      method,
      headers: {
        Authorization: `Bearer ${key}`,
        Accept: 'application/json',
        ...(body ? { 'Content-Type': 'application/json' } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    const text = await res.text();
    let parsed = null;
    try { parsed = JSON.parse(text); } catch { /* not JSON — that is itself the finding */ }
    return {
      status: res.status,
      ms: Date.now() - started,
      bodyBytes: text.length,
      isJson: parsed !== null,
      // Mollie's own error shape, when there is one. For a success, just the
      // identifying bits — never a full payment object in a debug response.
      body: parsed
        ? (parsed.title
          ? { title: parsed.title, detail: parsed.detail, field: parsed.field }
          : { id: parsed.id, status: parsed.status, mode: parsed.mode, count: parsed.count })
        : text.slice(0, 200),
      headers: describeHeaders(res),
    };
  } catch (e) {
    // A throw is a different finding from a 400 and must not be flattened into
    // one: it means the request never completed at all.
    return { threw: true, error: String(e && e.message ? e.message : e), ms: Date.now() - started };
  }
}

/** Turn the four probes into the one sentence that says what to do next. */
function read(out) {
  const { A_transport: A, B_auth: B, C_minimalPayment: C, D_realPayment: D } = out.probes;
  const empty400 = (p) => p && !p.threw && p.status === 400 && p.bodyBytes === 0;

  if (out.key.problems) {
    return `The stored key has a problem before anything is sent: ${out.key.problems.join('; ')}. ` +
      `Re-paste it (wrangler pages secret put MOLLIE_API_KEY), redeploy, and run this again.`;
  }
  if (A && A.threw) return `Could not reach api.mollie.com from this Function at all (${A.error}). This is a connectivity problem, not a payment one.`;
  if (empty400(A)) {
    return 'Probe A got an EMPTY 400 with a key that is deliberately wrong — so it is not our key and not our payload. ' +
      'Requests from this Pages Function are being rejected before Mollie sees them. This is the same shape as the old ' +
      'Stripe failure and belongs in a Cloudflare support ticket, with the cf-ray above.';
  }
  if (A && A.status === 401) {
    if (empty400(B)) return 'Transport is fine (A got a clean 401) but the real key produces an empty 400 — the key itself is carrying something the wire will not accept. Re-paste it by typing rather than pasting, then redeploy.';
    if (B && B.status === 401) return 'The key is rejected by Mollie as unauthorised. It is well-formed but not valid for this account — check you copied the right one, and that the account is activated.';
    if (B && B.status === 200) {
      if (empty400(C)) return 'Auth works (B is 200) but even a minimal payment gets an empty 400 — the POST body or the POST itself is the problem, not the key.';
      if (C && C.status >= 400) return `A minimal payment was refused: ${JSON.stringify(C.body)}. That is Mollie telling us what is wrong — read the field.`;
      if (C && C.status === 201) {
        if (empty400(D)) return 'A minimal payment works, the real one gets an empty 400 — so it is one of the three fields the real one adds: webhookUrl, locale or metadata. The URLs actually sent are in D.urlsSent.';
        if (D && D.status >= 400) return `The real payload was refused: ${JSON.stringify(D.body)}. Field to look at: ${D.body?.field || 'see detail'}.`;
        if (D && D.status === 201) return 'All four probes pass. Mollie is working from this deployment right now — whatever caused the earlier 400 is not reproducing. Check whether the failing attempt ran on an older deployment, or before the key was set.';
      }
    }
  }
  return 'Inconclusive — send the whole of this JSON over and I will read it.';
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj, null, 2), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  });
}
