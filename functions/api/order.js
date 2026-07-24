// VISUAILS — order / signup / contact intake (Cloudflare Pages Function).
//
// One POST endpoint for every form on the site. The form's hidden `service`
// field selects the flow:
//   • subscribe               → lead-magnet email capture (briefing checklist)
//   • contact                 → contact-form message
//   • catalog|lifestyle|video|custom|test-sample → an order
//
// Design notes:
//   • Defensive by construction: a missing binding or a failing email must
//     never show the customer a broken page. Every side-effect is wrapped in
//     try/catch and we ALWAYS redirect to the (localized) thank-you page.
//   • No personal data in the redirect URL — only a generated order ref.
//   • The customer row is upserted by email on every order, so the account /
//     profile-prefill phase has data to work with from day one.
//
// Bindings (see wrangler.toml): env.DB (D1), env.UPLOADS (R2, later),
// env.RESEND_API_KEY (secret), env.NOTIFY_EMAIL, env.FROM_EMAIL.

const ORDER_SERVICES = new Set(['catalog', 'lifestyle', 'video', 'custom', 'test-sample']);

// Fields we lift into their own columns; everything else goes to details_json.
const TOP_FIELDS = ['service', 'redirect', 'lang', 'name', 'brand', 'company', 'email', 'phone', 'vat', 'website', 'company_hp'];

export async function onRequestPost({ request, env }) {
  let form;
  try {
    form = await request.formData();
  } catch {
    return redirect('/thank-you');
  }

  const get = (k) => (form.get(k) || '').toString().trim();

  const service = get('service') || 'catalog';
  const lang = get('lang') === 'nl' ? 'nl' : 'en';
  const back = safeRedirect(get('redirect'), lang);

  // Honeypot: a hidden field real users never see. Bots fill it. Pretend success.
  if (get('company_hp')) return redirect(back);

  const email = get('email');
  if (!isEmail(email)) {
    // JS validation normally blocks this; for JS-off users, bounce back to the
    // form they came from (same-origin Referer), not the thank-you page.
    let dest = back;
    try {
      const ref = request.headers.get('Referer');
      if (ref) {
        const u = new URL(ref);
        if (u.origin === new URL(request.url).origin) dest = u.pathname + u.search;
      }
    } catch {}
    return redirect(dest + (dest.includes('?') ? '&' : '?') + 'error=email');
  }
  const name = get('name');
  const brand = get('brand') || get('company');
  const phone = get('phone');
  const vat = get('vat');
  const website = get('website');

  // Everything not lifted to a column becomes the order detail record.
  const details = {};
  for (const [k, v] of form.entries()) {
    if (TOP_FIELDS.includes(k)) continue;
    const val = (v || '').toString();
    if (val) details[k] = val;
  }

  // ---- subscribe (lead magnet) --------------------------------------------
  if (service === 'subscribe') {
    await safe(() => env.DB && env.DB
      .prepare('INSERT INTO subscribers (email, source) VALUES (?1, ?2) ON CONFLICT(email) DO NOTHING')
      .bind(email, get('subscribe') || 'lead-magnet').run());
    await safe(() => sendMail(env, {
      to: email,
      subject: lang === 'nl' ? 'Je briefing-foto checklist' : 'Your briefing-photo checklist',
      html: subscriberEmail(lang),
    }));
    await safe(() => sendMail(env, {
      to: env.NOTIFY_EMAIL || 'hello@visuails.com',
      subject: `Checklist signup — ${email}`,
      html: `<p>New checklist signup:</p><p><strong>${esc(email)}</strong></p>`,
    }));
    return redirect(back + (back.includes('?') ? '&' : '?') + 'ok=1');
  }

  // ---- contact -------------------------------------------------------------
  if (service === 'contact') {
    const body = details.message || details.notes || '';
    let customerId = null;
    await safe(async () => { customerId = await upsertCustomer(env, { email, name, brand, phone, website, vat }); });
    await safe(() => env.DB && env.DB
      .prepare('INSERT INTO messages (customer_id, email, name, subject, body) VALUES (?1,?2,?3,?4,?5)')
      .bind(customerId, email, name || null, get('subject') || 'Contact form', body || null).run());
    await safe(() => sendMail(env, {
      to: env.NOTIFY_EMAIL || 'hello@visuails.com',
      subject: `Contact — ${name || email}`,
      html: `<p>Contact message from <strong>${esc(name || email)}</strong> (${esc(email)}):</p><p>${esc(body).replace(/\n/g, '<br>')}</p>`,
    }));
    return redirect(back + (back.includes('?') ? '&' : '?') + 'ok=1');
  }

  // ---- order ---------------------------------------------------------------
  const svc = ORDER_SERVICES.has(service) ? service : 'catalog';
  const ref = makeRef();
  let customerId = null;
  await safe(async () => { customerId = await upsertCustomer(env, { email, name, brand, phone, website, vat }); });

  await safe(() => env.DB && env.DB
    .prepare(`INSERT INTO orders (ref, customer_id, service, name, brand, email, phone, vat_number, details_json, source)
              VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10)`)
    .bind(ref, customerId, svc, name || null, brand || null, email, phone || null, vat || null,
          JSON.stringify(details), get('source') || null).run());

  await safe(async () => {
    const row = await env.DB?.prepare('SELECT id FROM orders WHERE ref = ?1').bind(ref).first();
    if (row?.id) await env.DB.prepare('INSERT INTO order_events (order_id, status, note) VALUES (?1, ?2, ?3)')
      .bind(row.id, 'received', 'Order submitted via website').run();
  });

  await safe(() => sendMail(env, {
    to: env.NOTIFY_EMAIL || 'hello@visuails.com',
    subject: `New ${svc} order — ${ref}`,
    html: notifyEmail(ref, svc, { name, brand, email, phone, vat, website }, details),
  }));
  await safe(() => sendMail(env, {
    to: email,
    subject: lang === 'nl' ? `We hebben je aanvraag — ${ref}` : `We've got your request — ${ref}`,
    html: customerEmail(lang, ref, svc, name),
  }));

  return redirect(back + (back.includes('?') ? '&' : '?') + 'ref=' + encodeURIComponent(ref));
}

// GET on this route → send people to the order hub rather than a blank 405.
export function onRequestGet() {
  return redirect('/order');
}

// ---------- helpers ----------------------------------------------------------

async function upsertCustomer(env, c) {
  if (!env.DB) return null;
  await env.DB.prepare(
    `INSERT INTO customers (email, name, brand, phone, website, vat_number)
     VALUES (?1,?2,?3,?4,?5,?6)
     ON CONFLICT(email) DO UPDATE SET
       name=COALESCE(excluded.name, customers.name),
       brand=COALESCE(excluded.brand, customers.brand),
       phone=COALESCE(excluded.phone, customers.phone),
       website=COALESCE(excluded.website, customers.website),
       vat_number=COALESCE(excluded.vat_number, customers.vat_number),
       updated_at=datetime('now')`
  ).bind(c.email, c.name || null, c.brand || null, c.phone || null, c.website || null, c.vat || null).run();
  const row = await env.DB.prepare('SELECT id FROM customers WHERE email = ?1').bind(c.email).first();
  return row?.id ?? null;
}

async function sendMail(env, { to, subject, html }) {
  if (!env.RESEND_API_KEY) return;                 // not configured yet → skip quietly
  const from = env.FROM_EMAIL || 'VISUAILS <orders@visuails.com>';
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from, to, subject, html, reply_to: 'hello@visuails.com' }),
  });
  if (!res.ok) throw new Error(`Resend ${res.status}: ${await res.text()}`);
}

async function safe(fn) { try { return await fn(); } catch (e) { console.error('[order]', e && e.message ? e.message : e); } }

function makeRef() {
  const t = Date.now().toString(36).toUpperCase().slice(-4);
  const r = Math.floor(Math.random() * 46656).toString(36).toUpperCase().padStart(3, '0');
  return `VIS-${t}-${r}`;
}

function isEmail(s) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s); }

function redirect(location, status = 303) { return new Response(null, { status, headers: { Location: location } }); }

// Only allow same-site thank-you targets, and match the language.
function safeRedirect(raw, lang) {
  if (raw && raw.startsWith('/') && !raw.startsWith('//') && raw.includes('thank-you')) return raw;
  return lang === 'nl' ? '/nl/thank-you' : '/thank-you';
}

function esc(s) { return String(s == null ? '' : s).replace(/[<>&]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c])); }

function detailRows(obj) {
  return Object.entries(obj).map(([k, v]) =>
    `<tr><td style="padding:4px 12px 4px 0;color:#8a8aa0">${esc(k)}</td><td style="padding:4px 0"><strong>${esc(v)}</strong></td></tr>`
  ).join('');
}

function notifyEmail(ref, service, top, details) {
  const rows = detailRows({ ...top, ...details });
  return `<div style="font-family:system-ui,Arial,sans-serif;color:#111">
    <h2 style="margin:0 0 8px">New ${esc(service)} order</h2>
    <p style="margin:0 0 16px">Reference <strong>${esc(ref)}</strong></p>
    <table style="border-collapse:collapse;font-size:14px">${rows}</table>
  </div>`;
}

function customerEmail(lang, ref, service, name) {
  const hi = name ? `${lang === 'nl' ? 'Hi' : 'Hi'} ${esc(name)},` : (lang === 'nl' ? 'Hi,' : 'Hi,');
  if (lang === 'nl') {
    return `<div style="font-family:system-ui,Arial,sans-serif;color:#111">
      <p>${hi}</p>
      <p>Bedankt — we hebben je ${esc(service)}-aanvraag ontvangen. Je referentie is <strong>${esc(ref)}</strong>.</p>
      <p>We nemen binnen ongeveer 24 uur contact met je op, meestal sneller via WhatsApp. Een mens controleert elke visual voordat hij bij je komt.</p>
      <p style="color:#666;font-size:13px">VISUAILS · Enschede, NL · hello@visuails.com</p>
    </div>`;
  }
  return `<div style="font-family:system-ui,Arial,sans-serif;color:#111">
    <p>${hi}</p>
    <p>Thanks — we've received your ${esc(service)} request. Your reference is <strong>${esc(ref)}</strong>.</p>
    <p>We'll get back to you within about 24 hours, usually faster on WhatsApp. A person checks every visual before it reaches you.</p>
    <p style="color:#666;font-size:13px">VISUAILS · Enschede, NL · hello@visuails.com</p>
  </div>`;
}

function subscriberEmail(lang) {
  const url = 'https://visuails.com' + (lang === 'nl' ? '/nl/upload-guidelines' : '/upload-guidelines');
  if (lang === 'nl') {
    return `<div style="font-family:system-ui,Arial,sans-serif;color:#111">
      <p>Hi,</p>
      <p>Hier is de briefing-foto checklist — de vier hoeken, het licht en de achtergrond die een telefoonfoto tot een campagne maken:</p>
      <p><a href="${url}">Bekijk de checklist →</a></p>
      <p style="color:#666;font-size:13px">VISUAILS · Enschede, NL</p>
    </div>`;
  }
  return `<div style="font-family:system-ui,Arial,sans-serif;color:#111">
    <p>Hi,</p>
    <p>Here's the briefing-photo checklist — the four angles, lighting and background that turn a phone photo into a campaign:</p>
    <p><a href="${url}">Read the checklist →</a></p>
    <p style="color:#666;font-size:13px">VISUAILS · Enschede, NL</p>
  </div>`;
}
