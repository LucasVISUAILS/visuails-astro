// VISUAILS — the sign-in link: what keeps it working, and what kills it.
// August 2026.
//
// WHY THIS FILE EXISTS
//
// The magic link was strictly single-use, consumed by the first GET that
// touched it. The first GET is very often not the customer: corporate mail
// security — Microsoft Defender Safe Links, Proofpoint, Mimecast — fetches every
// URL in an inbound message to see where it leads, and that is switched on by
// default for anyone on Microsoft 365. The scanner burned the token and the
// customer, clicking for the FIRST time seconds later, was shown "This link does
// not work. It may have expired, already been used…" — a sentence that is
// technically true and reads as a lie.
//
// The fix is a fifteen-minute window after first redemption rather than a
// confirmation page with a button, which would put a click in front of every
// customer to defend against a machine. See LOGIN_TOKEN_GRACE_MINUTES in
// src/lib/account.js for the full argument.
//
// So the thing under test is a BALANCE, and both halves have to hold: the link
// must survive a machine touching it, and it must still die — at expiry always,
// and shortly after first use. Every case below is one of those two halves.
import { accountGet, accountPost } from '../src/lib/account.js';
import { mintToken, hashToken } from '../src/lib/token.js';

/** D1 writes used_at as 'YYYY-MM-DD HH:MM:SS' in UTC, with no zone marker. */
const stamp = (msAgo) => new Date(Date.now() - msAgo).toISOString().replace('T', ' ').slice(0, 19);

function makeDb(tokenRow) {
  const writes = [];
  const row = { ...tokenRow };
  const db = {
    writes,
    row,
    prepare(sql) {
      const st = {
        sql,
        _b: [],
        bind(...a) { st._b = a; return st; },
        async first() {
          if (sql.includes('FROM account_tokens')) return row.token_hash === st._b[0] ? row : null;
          return null;   // rate_limits and anything else: no row, which reads as "allowed"
        },
        async all() { return { results: [] }; },
        async run() { writes.push(sql.replace(/\s+/g, ' ')); return {}; },
      };
      return st;
    },
    async batch(list) {
      for (const st of list) {
        const sql = st.sql || '';
        writes.push(sql.replace(/\s+/g, ' '));
        // Behave like SQLite would: honour the `AND used_at IS NULL` guard, so
        // the test can prove the window is anchored to the first redemption.
        if (/UPDATE account_tokens SET used_at/.test(sql)) {
          if (!/used_at IS NULL/.test(sql) || !row.used_at) row.used_at = stamp(0);
        }
      }
      return [];
    },
  };
  return db;
}

async function visit(tokenRow, token) {
  const db = makeDb(tokenRow);
  const request = new Request(`https://visuails.com/account/verify/${token}`);
  const res = await accountGet({ request, env: { DB: db }, waitUntil() {} });
  return { status: res.status, cookie: res.headers.get('set-cookie') || '', db };
}

let fails = 0;
const check = (name, cond, got = '') => {
  console.log(`${cond ? ' ok  ' : 'FAIL '} ${String(name).padEnd(58)} ${got}`);
  if (!cond) fails++;
};

const token = await mintToken();
const hash = await hashToken(token);
const base = { id: 1, customer_id: 7, token_hash: hash };
const inAnHour = new Date(Date.now() + 60 * 60000).toISOString();
const anHourAgo = new Date(Date.now() - 60 * 60000).toISOString();

// ── the half that has to keep working ────────────────────────────────────────
{
  const r = await visit({ ...base, expires_at: inAnHour, used_at: null }, token);
  check('a fresh link signs you in', r.status === 303 && /vis_account=/.test(r.cookie), r.status);
  check('and marks the token used', r.db.writes.some((w) => /UPDATE account_tokens SET used_at/.test(w)));
  check('and records that the address is verified',
    r.db.writes.some((w) => /email_verified = 1/.test(w)));
}

{
  const r = await visit({ ...base, expires_at: inAnHour, used_at: stamp(20 * 1000) }, token);
  check('a link a mail scanner already fetched still works', r.status === 303, r.status);
  check('and the first-use stamp is not restamped',
    r.db.writes.some((w) => /used_at IS NULL/.test(w)), 'guarded by WHERE');
}

{
  const r = await visit({ ...base, expires_at: inAnHour, used_at: stamp(14 * 60000) }, token);
  check('still redeemable at 14 minutes', r.status === 303, r.status);
}

// ── the half that has to stay closed ─────────────────────────────────────────
{
  const r = await visit({ ...base, expires_at: inAnHour, used_at: stamp(16 * 60000) }, token);
  check('dead at 16 minutes', r.status === 410, r.status);
}

{
  const r = await visit({ ...base, expires_at: anHourAgo, used_at: null }, token);
  check('an expired link is dead even if never used', r.status === 410, r.status);
}

{
  // Expiry is absolute and is checked first, so a link cannot be resurrected by
  // having been touched a moment ago.
  const r = await visit({ ...base, expires_at: anHourAgo, used_at: stamp(10 * 1000) }, token);
  check('expiry beats the grace window', r.status === 410, r.status);
}

{
  const r = await visit({ ...base, expires_at: inAnHour, used_at: 'not a date' }, token);
  check('an unreadable used_at closes the door', r.status === 410, r.status);
}

{
  // The stamp has no zone marker. Reading it as local time would silently hand
  // out an extra hour, or refuse a valid link, depending on where this runs.
  const r = await visit({ ...base, expires_at: inAnHour, used_at: stamp(0).replace(' ', 'T') + 'Z' }, token);
  check('an ISO stamp with a Z is read the same way', r.status === 303, r.status);
}

{
  const other = await mintToken();
  const r = await visit({ ...base, expires_at: inAnHour, used_at: null }, other);
  check('a token matching no row is refused', r.status === 410, r.status);
}

{
  const r = await visit({ ...base, expires_at: inAnHour, used_at: null }, 'not-a-token');
  check('a malformed token never reaches the database', r.status === 404, r.status);
}

// ─────────────────────────────────────────────────────────────────────────────
// THE MESSAGE ITSELF — a customer's sign-in link went to spam, August 2026.
//
// The domain-side causes (a duplicate SPF record, DMARC at p=none) are DNS and
// cannot be tested from here. This half can: the message was HTML-only, which
// is a multipart/alternative with one side missing, and combined with the shape
// of this particular mail — very short, one prominent link, a button — that is
// close to a template for what a filter is trained to catch.
// ─────────────────────────────────────────────────────────────────────────────

{
  const realFetch = globalThis.fetch;
  let sent = null;
  globalThis.fetch = async (url, init) => {
    if (String(url).includes('resend.com')) { sent = JSON.parse(init.body); return new Response('{"id":"x"}', { status: 200 }); }
    return realFetch(url, init);
  };

  const mailDb = {
    prepare(sql) {
      const st = { _b: [], bind(...a) { st._b = a; return st; },
        async first() { return /FROM customers WHERE lower\(email\)/.test(sql) ? { id: 7 } : null; },
        async all() { return { results: [] }; }, async run() { return {}; } };
      return st;
    },
    async batch() { return []; },
  };

  const login = async (email, lang) => {
    sent = null;
    const request = new Request('https://visuails.com/account/login', {
      method: 'POST',
      body: new URLSearchParams({ email, lang }),
      headers: { origin: 'https://visuails.com', 'content-type': 'application/x-www-form-urlencoded' },
    });
    await accountPost({ request, env: { DB: mailDb, RESEND_API_KEY: 'k' }, waitUntil() {} });
    return sent;
  };

  const nl = await login('studio@voltbrand.nl', 'nl');
  check('the sign-in mail carries an HTML part', !!nl?.html);
  check('and a plain-text part', !!nl?.text, 'both halves present');
  check('the text half contains the actual URL, not just "Sign in"',
    /https:\/\/visuails\.com\/account\/verify\/[A-Za-z0-9_-]+/.test(nl.text || ''));
  check('the HTML half prints the URL too, for clients that strip the button',
    (nl.html.match(/\/account\/verify\//g) || []).length >= 2, 'button + fallback');
  check('replies reach a person', nl.reply_to === 'hello@visuails.com', nl.reply_to);

  // The copy used to promise "works once and expires in 30 minutes" while the
  // token had already moved to an hour with a reuse window. On the one screen
  // where being wrong costs a sign-in, the duration is read from the constant.
  check('the mail states the real lifetime', /een uur/.test(nl.text), 'NL: een uur');
  check('and no longer claims it works only once', !/één keer|works once/i.test(nl.text));

  const en = await login('studio@voltbrand.nl', 'en');
  check('the English mail says the same thing', /an hour/.test(en.text), 'EN: an hour');

  // The capitals bug, end to end: the address as typed must still find the row.
  const caps = await login('Studio@VoltBrand.nl', 'nl');
  check('an address typed with capitals still gets a link', !!caps, caps ? caps.to : 'no mail sent');
  check('and it is sent to the lowercased address', caps.to === 'studio@voltbrand.nl', caps.to);

  globalThis.fetch = realFetch;
}


console.log(`\n${fails ? `${fails} FAILED` : 'all passed'}`);
process.exit(fails ? 1 : 0);
