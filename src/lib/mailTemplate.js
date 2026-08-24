/* VISUAILS — the shape every customer email has. Direction A, "Briefhoofd".
 *
 * Lucas, August 2026, after seeing three directions side by side: *"A vind ik
 * het beste."* Dark letterhead band with the mark, white letter under it, one
 * green accent, grey foot.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * WHY THIS FILE EXISTS. Four customer-facing emails — the order confirmation,
 * the sign-in link, the delivery notice and the lead-magnet checklist — each
 * opened with their own hand-written `<div style="font-family:system-ui,...">`
 * in three different files. Four copies of a design is four places to forget
 * when the logo, the accent or the address changes, and this project has
 * already been bitten by exactly that: the footer glow kept a dead accent
 * through a whole palette change because a comment asked a future reader to
 * update it by hand. So the design lives here once and the four call sites pass
 * content.
 *
 * WHY IT IS TABLES AND INLINE STYLES, NOT CSS. Outlook on Windows renders mail
 * with the Word engine: no flexbox, no grid, no border-radius, no box-shadow,
 * no background-image, and `<style>` blocks are unreliable across Gmail's
 * various apps. Everything here is a table with `bgcolor` and inline `style`,
 * which is the intersection of what every client honours. It looks like 2004
 * because email is 2004.
 *
 * WHY THE MARK IS A REMOTE PNG AND THE WORDMARK IS REAL TEXT. Email has no SVG,
 * so the mark has to be a raster at a stable https URL (see
 * scripts/make-mail-assets.mjs). But most clients block remote images until the
 * reader clicks "show images", and a header that is ONE image is a blank band
 * for that first read — which is the read that decides whether the mail looks
 * legitimate. So the mark is an <img> with `alt=""` and the word VISUAILS
 * beside it is live text: images off, you still get a branded dark band with
 * the name in it.
 *
 * WHY EVERY BAND CARRIES AN EXPLICIT bgcolor. Apple Mail and Outlook.com
 * re-colour light emails on a dark phone. Their heuristics leave a band alone
 * when it declares its own background and invert it when it does not — which is
 * how you end up with near-black text on a background the client just painted
 * black. Declaring it everywhere, plus the color-scheme meta below, is what
 * keeps the letter readable.
 *
 * THE PREHEADER IS NOT DECORATION. It is the grey line the inbox prints after
 * the subject. Left empty, clients scrape the first text they find — which here
 * would be "VISUAILS", so every message would preview identically. Each caller
 * passes one.
 */

import { mailNote } from '../data/mailNote.js';
import { tagline } from '../data/brand.js';

const SITE = 'https://visuails.com';

/* The palette, matched to global.css. Written out rather than imported because
 * email cannot use custom properties and these are the resolved values anyway. */
const C = {
  green: '#C6F100',
  ink: '#08090B',
  text: '#2D3138',
  head: '#0B0C0F',
  muted: '#6B7078',
  faint: '#8A8F98',
  rule: '#E6E7EB',
  ruleSoft: '#F0F1F4',
  paper: '#FFFFFF',
  foot: '#FAFAFB',
  tintBg: '#F7FBE8',
  tintInk: '#5C6318',
  page: '#EFEFF1',
};

const FONT = 'Arial,Helvetica,sans-serif';

export function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, ch => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]
  ));
}

/**
 * DE AANHEF, EN WAAROM DIE HIER STAAT EN NIET VIER KEER APART.
 *
 * Tot 24 augustus 2026 stond op vier plekken deze regel:
 *
 *   const hi = order.name ? `Hi ${esc(order.name)},` : 'Hi,';
 *
 * met daar één regel bóven `const nl = order.lang === 'nl';` — de vlag waar de
 * hele rest van diezelfde mail op splitst. Elke Nederlandse klant kreeg dus
 * "Hi Mara," boven een verder volledig Nederlandse brief: de bevestiging van een
 * bestelling, de levering, de herlevering en de nieuwe portaallink. Vier van de
 * vijf klantmails van dit project, en de vijfde (mailLegeWachtrij in cron) deed
 * het wél goed — wat het niet minder maar juist meer een fout maakt, want de
 * goede versie stond er al.
 *
 * Waarom nu hier: vier kopieën van één regel zijn vier kansen om hem opnieuw
 * verkeerd te krijgen, en de volgende mail die erbij komt is de vijfde. De
 * `esc()` zit erin en niet bij de aanroeper, om dezelfde reden — een aanroeper
 * die hem vergeet, zet de naam van de klant ongefilterd in de HTML.
 *
 * GEEN NAAM IS EEN GELDIG GEVAL. Een proefvisual vraagt niet altijd om een naam,
 * en "Hoi ," met een spatie voor de komma leest als een sjabloon dat is
 * omgevallen. Dan alleen de aanhef.
 */
export const greeting = (name, lang = 'en') => {
  const hoi = lang === 'nl' ? 'Hoi' : 'Hi';
  const naam = String(name ?? '').trim();
  return naam ? `${hoi} ${esc(naam)},` : `${hoi},`;
};

/* ── blocks ──────────────────────────────────────────────────────────────── */

/** A paragraph of body copy. */
export const p = (html, { muted = false, top = 0, bottom = 16 } = {}) =>
  `<p style="margin:${top}px 0 ${bottom}px;font-family:${FONT};font-size:15px;line-height:1.65;color:${muted ? C.muted : C.text}">${html}</p>`;

/** The headline, and the reference line under it. */
export const h1 = (text, sub = '') =>
  `<h1 style="margin:0 0 ${sub ? '6' : '18'}px;font-family:${FONT};font-size:22px;line-height:1.25;font-weight:700;color:${C.head}">${esc(text)}</h1>` +
  (sub ? `<p style="margin:0 0 22px;font-family:${FONT};font-size:13px;color:${C.muted};letter-spacing:.04em">${sub}</p>` : '');

/**
 * The label/value table.
 *
 * Rows arrive as [label, value] pairs and are dropped when the value is empty,
 * so a caller can hand over everything it might know and let the table decide.
 * An order without a reserved window should not print an empty "Gereserveerd"
 * row — that reads as a missing promise rather than an absent one.
 */
export const rows = pairs => {
  const live = pairs.filter(([, v]) => v !== null && v !== undefined && v !== '');
  if (!live.length) return '';
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="font-family:${FONT};font-size:14px;border-top:1px solid ${C.rule};margin:0 0 8px">
    ${live.map(([k, v]) => `<tr>
      <td style="padding:11px 0;color:${C.muted};border-bottom:1px solid ${C.ruleSoft};width:38%;vertical-align:top">${esc(k)}</td>
      <td style="padding:11px 0;color:${C.head};font-weight:700;border-bottom:1px solid ${C.ruleSoft}">${v}</td>
    </tr>`).join('')}
  </table>`;
};

/** The green call-to-action. A table cell with bgcolor, which Outlook honours. */
export const button = (href, label) =>
  `<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
    <td bgcolor="${C.green}" align="center" style="background:${C.green};padding:14px 26px">
      <a href="${esc(href)}" style="font-family:${FONT};font-size:15px;font-weight:700;color:${C.ink};text-decoration:none;display:block">${esc(label)}</a>
    </td>
  </tr></table>`;

/** The amount-due panel: green edge, tinted ground, total, button. */
export const payPanel = ({ label, amount, sub, href, cta }) =>
  `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${C.tintBg}" style="background:${C.tintBg};margin:8px 0 0">
    <tr>
      <td width="4" bgcolor="${C.green}" style="width:4px;background:${C.green};font-size:0;line-height:0">&nbsp;</td>
      <td style="padding:20px 22px;font-family:${FONT}">
        <p style="margin:0 0 2px;font-size:12px;letter-spacing:.1em;color:${C.tintInk};text-transform:uppercase">${esc(label)}</p>
        <p style="margin:0 0 4px;font-size:26px;font-weight:700;color:${C.head}">${esc(amount)}</p>
        ${sub ? `<p style="margin:0 0 16px;font-size:12px;line-height:1.5;color:${C.muted}">${sub}</p>` : ''}
        ${href ? button(href, cta) : ''}
      </td>
    </tr>
  </table>`;

/** A quiet aside with a hairline down its left — the spam note lives in one. */
export const note = html =>
  `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:4px 0 0"><tr>
    <td width="3" bgcolor="#D8DBE1" style="width:3px;font-size:0;line-height:0">&nbsp;</td>
    <td style="padding:2px 0 2px 14px">
      <p style="margin:0;font-family:${FONT};font-size:13px;line-height:1.6;color:${C.muted}">${html}</p>
    </td>
  </tr></table>`;

/**
 * What the studio typed, set apart from what the template says.
 *
 * August 2026, with the re-delivery mail. `note()` above is for boilerplate —
 * the spam line, the link repeated in full — and in a mail whose whole point is
 * "here is what we changed", the changed-bit must not look like the footnotes.
 * Green edge and a tinted ground, same pair as payPanel, so the eye lands on it
 * before the button rather than after.
 */
export const quote = html =>
  `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${C.tintBg}" style="background:${C.tintBg};margin:2px 0 0"><tr>
    <td width="4" bgcolor="${C.green}" style="width:4px;background:${C.green};font-size:0;line-height:0">&nbsp;</td>
    <td style="padding:14px 18px">
      <p style="margin:0;font-family:${FONT};font-size:15px;line-height:1.6;color:${C.text}">${html}</p>
    </td>
  </tr></table>`;

/** The "check your spam" line, from the one place that sentence is written. */
export const spamNote = lang => note(esc(mailNote(lang)));

/** A prominent text link on its own line, the way the portal link is offered. */
export const linkLine = (href, label) =>
  `<p style="margin:0 0 20px;font-family:${FONT};font-size:15px"><a href="${esc(href)}" style="color:${C.head};font-weight:700">${esc(label)} &rarr;</a></p>`;

/* ── the shell ───────────────────────────────────────────────────────────── */

const letterhead = () => `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${C.ink}" style="background:${C.ink}">
  <tr><td style="padding:20px 32px">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
      <td style="padding:0 12px 0 0;vertical-align:middle">
        <a href="${SITE}"><img src="${SITE}/img/mail/mark-groen.png" width="28" height="32" alt="" style="display:block;border:0;outline:none;text-decoration:none"></a>
      </td>
      <td style="vertical-align:middle">
        <a href="${SITE}" style="font-family:${FONT};font-size:15px;font-weight:700;letter-spacing:.22em;color:#FFFFFF;text-decoration:none">VISUAILS</a>
      </td>
    </tr></table>
  </td></tr>
  <tr><td height="4" bgcolor="${C.green}" style="height:4px;line-height:4px;font-size:0">&nbsp;</td></tr>
</table>`;

const footer = lang => {
  const nl = lang === 'nl';
  const base = nl ? `${SITE}/nl` : SITE;
  const terms = nl ? 'Algemene voorwaarden' : 'Terms';
  const privacy = nl ? 'Privacyverklaring' : 'Privacy policy';
  return `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
  <tr><td style="padding:28px 32px 0"><div style="height:1px;background:${C.rule};font-size:0;line-height:0">&nbsp;</div></td></tr>
  <tr><td bgcolor="${C.foot}" style="padding:20px 32px 26px;background:${C.foot};font-family:${FONT}">
    <p style="margin:0 0 6px;font-size:12px;color:${C.faint}">
      <a href="${base}/terms" style="color:${C.faint}">${terms}</a> &middot;
      <a href="${base}/privacy" style="color:${C.faint}">${privacy}</a>
    </p>
    <p style="margin:0 0 4px;font-size:12px;color:${C.faint}">VISUAILS &middot; Enschede, NL &middot; hello@visuails.com</p>
    <!-- DE BELOFTE STAAT IN DE VOET, NIET IN DE ONDERWERPREGEL. Een onderwerp
         moet zeggen wat er in de mail staat — "Je bestelling staat genoteerd —
         VIS-2608-4471" is scanbaar in een volle inbox en een slogan ervoor
         maakt hem langer en vager. Erger: een transactionele mail met een
         reclamezin in het onderwerp leest voor een filter als marketing, en
         daar is deze mail juist van weggehouden (zie src/lib/mail.js over
         waarom alles als twee delen verstuurd wordt). De voet is waar een
         merkzin hoort: gelezen door wie doorleest, genegeerd door wie scant. -->
    <p style="margin:0;font-size:12px;color:${C.faint}">${esc(tagline(lang).plain)}</p>
  </td></tr>
</table>`;
};

/**
 * Wrap blocks in the letterhead, the white letter and the foot.
 *
 * @param {object} o
 * @param {'nl'|'en'} o.lang
 * @param {string} o.preheader  the grey line the inbox prints after the subject
 * @param {string} o.body       already-built blocks, in order
 */
export function shell({ lang = 'en', preheader = '', body = '' }) {
  return `<!doctype html>
<html lang="${lang === 'nl' ? 'nl' : 'en'}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
</head>
<body style="margin:0;padding:0;background:${C.page};-webkit-font-smoothing:antialiased">
<div style="display:none;font-size:1px;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden">${esc(preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${C.page}" style="background:${C.page}">
  <tr><td align="center" style="padding:0">
    <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" bgcolor="${C.paper}" style="width:600px;max-width:600px;background:${C.paper}">
      <tr><td>${letterhead()}</td></tr>
      <tr><td style="padding:34px 32px 26px">${body}</td></tr>
      <tr><td>${footer(lang)}</td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>`;
}
