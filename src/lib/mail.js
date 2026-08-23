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
 * uploads, and an empty array is a new key on every message that doesn’t
 * carry one — a wire-format difference that buys nothing.
 */
export async function sendMail(env, { to, bcc, subject, html, text, attachments }) {
  /* ── EEN MISLUKTE MAIL WAS ONZICHTBAAR — 23 augustus 2026 ─────────────────
   *
   * Twee halve maatregelen die samen niets deden. Hierboven stond
   * `if (!env.RESEND_API_KEY) return;` met de opmerking "skip quietly", en
   * onderaan `throw` bij een antwoord dat geen 2xx is. Dat gooien lijkt streng,
   * maar ELKE aanroeper wikkelt sendMail in `safe()` — en dat moet ook, want een
   * bestelling mag niet omvallen omdat een mailserver hikt.
   *
   * Netto: een verkeerde sleutel (Resend antwoordt 401) betekende dat
   * orderbevestigingen, facturen en INLOGLINKS stil nooit aankwamen. Niets in de
   * applicatie merkte het, en de klant die geen inloglink krijgt, mailt niet —
   * die gaat weg.
   *
   * De reparatie is niet harder falen maar ZICHTBAAR falen. Beide paden schrijven
   * nu één regel in het Workers-logboek met het onderwerp en de ontvanger erbij,
   * zodat je kunt zien wát er niet is aangekomen in plaats van alleen dát er iets
   * mis is. Het gooien onderaan blijft: aanroepers die er wél iets mee kunnen
   * (de beheerkant toont een mislukte verzending) blijven werken zoals ze deden.
   *
   * NOOIT DE SLEUTEL ZELF IN HET LOGBOEK. Alleen of hij er is, en wat Resend
   * ervan vond. */
  if (!env.RESEND_API_KEY) {
    console.error(
      `[mail] RESEND_API_KEY is niet ingesteld — "${subject}" is niet verstuurd `
      + `naar ${Array.isArray(to) ? to.join(', ') : to}.`
    );
    return;
  }
  const from = env.FROM_EMAIL || 'VISUAILS <orders@visuails.com>';
  // EVERY MESSAGE GOES OUT AS BOTH PARTS, August 2026 — a customer's sign-in
  // link landed in spam and this was one of the reasons.
  //
  // An HTML-only message is a multipart/alternative with one half missing, and
  // filters weight that heavily: legitimate bulk senders produce both parts
  // because their tooling does, while the things people report as spam very
  // often ship HTML alone. Combined with the shape of this particular mail —
  // short, one prominent link, a button — HTML-only is close to a template for
  // what a filter is trained to catch.
  //
  // Derived from the HTML when a caller does not supply its own, rather than
  // being made a required argument. A required argument is a thing five call
  // sites can forget, and a wrong plain-text part is worse than a derived one:
  // the two halves are supposed to say the same thing, and only one of them
  // gets read when they disagree. Callers who care — the sign-in link — pass a
  // hand-written `text` and get exactly that.
  const payload = {
    from,
    to,
    subject,
    html,
    text: text || htmlToText(html),
    reply_to: 'hello@visuails.com',
  };
  /* BCC EN NIET CC. Een kopie voor de eigen administratie hoort de klant niet te
     zien: zijn factuur is een bericht aan hém, en een tweede adres in de kop
     roept de vraag op wie dat is. Alleen meegestuurd als er ook echt een adres
     is — een lege bcc laat Resend de hele verzending weigeren. */
  if (bcc) payload.bcc = Array.isArray(bcc) ? bcc.filter(Boolean) : [bcc];
  if (attachments && attachments.length) payload.attachments = attachments;
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const lichaam = await res.text();
    /* Eerst loggen, dan gooien: de aanroeper vangt de fout in `safe()` en dan is
       deze regel het enige spoor dat er iets niet is aangekomen. 401 krijgt een
       eigen zin, want dat is bijna altijd dezelfde oorzaak en dan hoort de
       oplossing erbij te staan. */
    const uitleg = res.status === 401
      ? ' — RESEND_API_KEY wordt door Resend geweigerd; zet het secret opnieuw.'
      : '';
    console.error(
      `[mail] Resend ${res.status} bij "${subject}" naar `
      + `${Array.isArray(to) ? to.join(', ') : to}${uitleg} ${lichaam}`
    );
    throw new Error(`Resend ${res.status}: ${lichaam}`);
  }
}

/**
 * Bytes → base64, in chunks. Wat Resend in `attachments[].content` verwacht.
 *
 * String.fromCharCode(...bytes) op een foto van 25 MB is geen langzaam pad maar
 * een stack overflow — de spread wordt één aanroep met 25 miljoen argumenten.
 * 32 kB per keer zit ruim onder de argumentgrens van elke engine en kost één
 * concatenatie per blok.
 *
 * ── WAAROM DIT HIER STAAT EN NIET IN order.js (9 augustus 2026) ──────────────
 *
 * Hij stond daar, als privéfunctie, zolang de bestelnotificatie het enige was
 * dat ooit iets meestuurde. De factuurmail is de tweede, en een tweede kopie van
 * precies deze lus is een tweede plek waar iemand ooit `CHUNK` groter zet en de
 * fout in de andere laat staan. Dit hoort bij versturen, niet bij bestellen —
 * dus staat het naast sendMail(), waar de aanroepers al kijken.
 */
export function toBase64(buf) {
  const bytes = new Uint8Array(buf);
  const CHUNK = 0x8000;
  let bin = '';
  for (let i = 0; i < bytes.length; i += CHUNK) {
    bin += String.fromCharCode.apply(null, bytes.subarray(i, i + CHUNK));
  }
  return btoa(bin);
}

/**
 * A readable plain-text version of an HTML email.
 *
 * NOT a general HTML-to-text converter, and it should not grow into one. It
 * handles the shapes this project's own emails are built from — paragraphs,
 * line breaks, table rows, links, bold — because those are the only inputs it
 * will ever see, and a converter that tries to be complete is one that fails
 * quietly on the case nobody tested.
 *
 * THE LINKS ARE THE POINT. A plain-text part that says "Sign in" where the HTML
 * had a button is a dead end for anyone reading in text mode — including the
 * spam filters that compare the two halves. So an anchor becomes `label (url)`,
 * and an anchor whose label already IS its url stays as just the url rather
 * than being printed twice.
 */
export function htmlToText(html) {
  if (!html) return '';
  let s = String(html);

  // Block boundaries first, while the tags are still there to find.
  s = s
    .replace(/<\s*br\s*\/?\s*>/gi, '\n')
    .replace(/<\s*\/\s*(p|div|h[1-6]|tr|li)\s*>/gi, '\n')
    .replace(/<\s*(hr)\s*\/?\s*>/gi, '\n---\n')
    .replace(/<\s*\/\s*(td|th)\s*>/gi, '  ');

  // Anchors: keep the destination, and do not print it twice when the label is
  // already the url (which is how several of these emails render a link).
  s = s.replace(/<a\b[^>]*href\s*=\s*["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi, (_m, href, label) => {
    const clean = label.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
    if (!clean) return href;
    if (clean === href || clean.replace(/\/$/, '') === href.replace(/\/$/, '')) return href;
    return `${clean} (${href})`;
  });

  s = s.replace(/<[^>]+>/g, '');

  // Entities this project actually emits, via esc() and by hand.
  s = s
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#0?39;|&apos;/gi, "'")
    .replace(/&euro;/gi, '€')
    .replace(/&middot;/gi, '·')
    .replace(/&rsquo;/gi, '’')
    .replace(/&mdash;/gi, '—')
    .replace(/&ndash;/gi, '–');

  return s
    .replace(/[ \t]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
