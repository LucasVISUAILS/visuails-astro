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
// payments for €1, which nobody will ever complete.
//
// It reveals no secret: the key's length, its five-character prefix and a list
// of any invisible characters in it, never the key.

import { hasAdminSession } from '../../src/lib/admin.js';
import { mollieKey, mollieKeyProblems, describeHeaders } from '../../src/lib/mollie.js';
import { AMOUNT, ladderTotal } from '../../src/data/pricing.js';

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
    // ── EVERY OTHER SECRET, SHAPE ONLY ────────────────────────────────────
    // Added after MOLLIE_API_KEY turned out to be a single U+0016 — the SYN
    // character Windows cmd.exe inserts when you press Ctrl+V and it is not
    // configured to treat that as paste. Whoever set that secret that way
    // probably set the others in the same sitting, the same way. Two of them
    // fail SILENTLY if they are corrupt: sendMail() is wrapped in safe(), so a
    // broken RESEND_API_KEY means order confirmations simply never arrive and
    // nothing anywhere says so.
    //
    // Values are never read. Length, whether every character is printable
    // ASCII, and a prefix ONLY where that prefix is a documented public marker
    // (test_ / live_ / re_) — which is exactly the information that
    // distinguishes "set correctly" from "set to a control character".
    secrets: Object.fromEntries(
      ['MOLLIE_API_KEY', 'RESEND_API_KEY', 'PORTAL_SALT', 'STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET']
        .map((name) => [name, shapeOf(env?.[name])])
    ),
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

  // ── WHICH METHODS, AND AT WHICH AMOUNT ────────────────────────────────────
  // Added because the checkout showed two rows and that looked thin. It is a
  // fair worry and the answer is not a guess, it is a query: Mollie filters the
  // method list BY AMOUNT, because most methods have a minimum. €1 is the
  // smallest payment the site ever makes, so the test sample is the worst case
  // the list will ever look — a €1,850 drop is a different question entirely.
  //
  // Asking it both ways turns "are there too few methods?" into a comparison
  // Lucas can read off his own account instead of taking my word for it.
  out.methods = {
    note: 'Mollie filters methods by amount. The test sample is the smallest payment the site makes, so this is the shortest the list ever gets.',
    at_0_99: await methodList(key, AMOUNT.testSample.toFixed(2)),
    // WAS AMOUNT.fullDrop, the €1,950 package price. That constant is gone with
    // the package model; what this probe needs is simply a large amount, so it
    // asks the ladder for a full season instead of a retired package.
    at_large_order: await methodList(key, ladderTotal('complete', 30).toFixed(2)),
  };

  out.reading = read(out);
  return json(out);
}

/** The methods Mollie would actually offer for a payment of this size. */
async function methodList(key, value) {
  const res = await probe('GET', `/methods?amount%5Bvalue%5D=${value}&amount%5Bcurrency%5D=EUR`, key);
  if (res.threw || res.status !== 200) return { amount: value, error: res.error || `HTTP ${res.status}` };
  // probe() summarises the body; ask again for the names, which is the only
  // thing worth reading here.
  const full = await fetch(`${MOLLIE_API}/methods?amount%5Bvalue%5D=${value}&amount%5Bcurrency%5D=EUR`, {
    headers: { Authorization: `Bearer ${key}`, Accept: 'application/json' },
  }).then((r) => r.json()).catch(() => null);
  const list = full?._embedded?.methods || [];
  return {
    amount: `€${value}`,
    count: list.length,
    methods: list.map((m) => `${m.description} (${m.id})`),
  };
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
    const s = out.secrets?.MOLLIE_API_KEY;
    // The specific case, called by name, because the generic advice
    // ("re-paste it") is what put the wrong value there in the first place.
    if (s?.set && s.length <= 3 && s.controlChars?.length) {
      return `MOLLIE_API_KEY is ${s.length} character(s) long and contains ${s.controlChars.join(', ')}. ` +
        `That is not a truncated key — U+0016 is the SYN control character Windows cmd.exe inserts when Ctrl+V ` +
        `is pressed and the console is not set to treat it as paste. The key was never pasted; a control code was. ` +
        `Set it again from the Cloudflare dashboard (Settings → Variables and Secrets), where paste works normally, ` +
        `then redeploy. Check the other secrets in this response too — they were probably set the same way.`;
    }
    return `The stored key has a problem before anything is sent: ${out.key.problems.join('; ')}. ` +
      `Set it again — preferably from the Cloudflare dashboard rather than a terminal — then redeploy and reload this.`;
  }
  // WHAT MAKES A PROBE "GOOD" IS A STRUCTURED ANSWER, NOT A PARTICULAR STATUS.
  // This first read on `A` keyed on 401, on the assumption that a wrong key
  // gets you "Unauthorized". It does not: Mollie answers a syntactically
  // unacceptable key with **400 "Invalid Authorization header"** in JSON. So
  // the real check came back with every probe green and the verdict
  // "Inconclusive", which is the least useful thing a diagnostic can do.
  //
  // The distinction that actually matters here is not 400-vs-401. It is
  // WHETHER MOLLIE'S APPLICATION ANSWERED AT ALL — a JSON body means the
  // request got through the front door and was judged on its merits; an empty
  // body means it was refused before that. `isJson` is that question, and the
  // logic below asks it instead.
  const reached = (p) => p && !p.threw && p.isJson;
  const refused = (p) => p && !p.threw && !p.isJson;

  if (A && A.threw) return `Could not reach api.mollie.com from this Function at all (${A.error}). This is a connectivity problem, not a payment one.`;
  if (refused(A)) {
    return `Probe A was refused with a ${A.status} and no JSON, using a key that is deliberately wrong — so it is neither our key nor our payload. ` +
      `Requests from this Pages Function are being rejected before Mollie's application sees them. Headers: ${A.headers}. ` +
      `That is the same shape as the old Stripe failure; take the cf-ray to Cloudflare.`;
  }

  // A reached Mollie. Everything from here is about our own key and payload.
  if (refused(B)) return `Transport is fine — A got a structured ${A.status} back — but the real key is refused with a ${B.status} and no JSON. The key is carrying a character the wire will not accept. Re-set it from the Cloudflare dashboard and redeploy.`;
  if (B && B.status === 401) return 'Mollie reached, but the key is not valid for this account. Check you copied the right one and that the account is activated.';
  if (B && B.status >= 400) return `Mollie refused the key: ${JSON.stringify(B.body)}.`;
  if (B && B.status !== 200) return `Unexpected ${B.status} on a plain authenticated read. Body: ${JSON.stringify(B.body)}.`;

  if (refused(C)) return 'Auth works, but even a minimal payment is refused with no JSON — the POST itself is the problem, not the key.';
  if (C && C.status >= 400) return `A minimal payment was refused: ${JSON.stringify(C.body)}. That is Mollie telling us what is wrong — read the field.`;
  if (refused(D)) return 'A minimal payment works; the real one is refused with no JSON. So it is one of the three fields the real one adds: webhookUrl, locale or metadata. The URLs actually sent are in D.urlsSent.';
  if (D && D.status >= 400) return `The real payload was refused: ${JSON.stringify(D.body)}. Field to look at: ${D.body?.field || 'see detail'}.`;

  if (C?.status === 201 && D?.status === 201) {
    return `All four probes pass and Mollie created both test payments (${C.body?.id}, ${D.body?.id}, mode ${D.body?.mode}). ` +
      `Payment creation works from this deployment. Those two are diagnostic payments — they sit "open" in your Mollie dashboard, ` +
      `nobody will pay them, and they expire on their own. Next step is a real run through /test-sample; this endpoint has done its job ` +
      `and can be deleted.`;
  }

  return 'Inconclusive — send the whole of this JSON over and I will read it.';
}

/**
 * A secret's shape, never its value. `looksPasted` is the specific tell this
 * whole endpoint was built to catch: a value one or two characters long, made
 * of control characters, is not a truncated key — it is a terminal that typed
 * a control code instead of pasting.
 */
function shapeOf(value) {
  if (value === undefined || value === null || value === '') return { set: false };
  const s = String(value);
  const control = [...s].filter((c) => c.charCodeAt(0) < 0x20 || c.charCodeAt(0) === 0x7f);
  const out = {
    set: true,
    length: s.length,
    allPrintable: control.length === 0 && s === s.trim(),
  };
  if (control.length) {
    out.controlChars = control.map((c) => 'U+' + c.charCodeAt(0).toString(16).toUpperCase().padStart(4, '0'));
  }
  // Public prefixes only. Mollie and Resend both put the environment in the
  // clear at the front of the key precisely so it can be read at a glance.
  const m = s.match(/^(test_|live_|re_|sk_test_|sk_live_|whsec_)/);
  if (m) out.prefix = m[1];
  if (s.length <= 3) out.verdict = 'FAR too short — this is a stray keystroke, not a key';
  else if (control.length) out.verdict = 'contains control characters — re-set it';
  else if (s !== s.trim()) out.verdict = 'has leading or trailing whitespace';
  return out;
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj, null, 2), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  });
}
