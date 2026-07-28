// VISUAILS — the one place any function sends an email. Extracted 2026-07-27.
//
// This used to be a local, non-exported function inside functions/api/order.js
// (the order/signup/contact endpoint), which was fine while it was the only
// thing that ever sent mail. The new customer-accounts system (src/lib/account.js)
// needs to send a magic-link email too, and copy-pasting the Resend call a
// second time would mean two places that both need to change the next time
// the FROM address, the reply-to, or the provider itself changes. So it moved
// here, next to token.js/ratelimit.js/portal.js/admin.js — the other pieces of
// shared plumbing that live in src/lib/ specifically because more than one
// Cloudflare Pages Function needs them.
//
// order.js's own detailRows()/eventNote()/mail-HTML helpers stayed put — they
// are about the shape of an ORDER email specifically, not about sending mail
// in general, so they did not belong here.
//
// Bindings: env.RESEND_API_KEY (secret), env.FROM_EMAIL (optional override).

/**
 * One message out through Resend.
 *
 * `attachments` is omitted from the payload entirely when there are none,
 * rather than sent as []. Every message this project has ever sent through
 * this function was unattached until the order-notification path grew
 * uploads, and an empty array is a new key on every message that doesn't
 * carry one — a wire-format difference that buys nothing.
 */
export async function sendMail(env, { to, subject, html, attachments }) {
  if (!env.RESEND_API_KEY) return;                 // not configured yet → skip quietly
  const from = env.FROM_EMAIL || 'VISUAILS <orders@visuails.com>';
  const payload = { from, to, subject, html, reply_to: 'hello@visuails.com' };
  if (attachments && attachments.length) payload.attachments = attachments;
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`Resend ${res.status}: ${await res.text()}`);
}
