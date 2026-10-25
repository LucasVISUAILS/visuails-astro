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

import { mailNote, mailNoteInMail } from '../data/mailNote.js';
import { tagline } from '../data/brand.js';
import { waHref } from '../data/whatsapp.js';
import { groetwoord, AANHEF } from './aanhef.js';

const SITE = 'https://visuails.com';

/* ═══════════════════════════════════════════════════════════════════════════
 * DE KLEUREN VAN DE MAIL — UIT KLEURENSCHEMA.md, 20 SEPTEMBER 2026
 * ═══════════════════════════════════════════════════════════════════════════
 * Mail rendert zonder CSS-variabelen, dus de waarden staan hier letterlijk.
 * Dit is een HANDKOPIE van KLEURENSCHEMA.md; verandert daar iets, dan hier ook.
 * Dat is precies waar de noot bovenaan dit bestand voor waarschuwt — *"de
 * voettekst hield een dood accent vast"* — en de reden dat ze bij elkaar staan
 * in plaats van verspreid door de sjablonen.
 *
 * DRIE DINGEN KANTELEN MEE MET HET VIOLET, en alle drie zijn ze de omkering
 * van wat het geel vroeg:
 *   · `onAccent` is NIEUW. Op lime stond zwarte tekst (15:1); op violet staat
 *     witte (7,16:1) en zwart haalt 2,93:1. Elke knop in elke mail draait dus
 *     om, en zonder dit veld zou die omkering per sjabloon moeten gebeuren.
 *   · `green` mag nu ook LETTER zijn. De naam blijft, want de sjablonen lezen
 *     hem; `accentText` is de donkere variant voor waar hij op papier staat.
 *   · `tintBg` was het geel op 12 % over wit. Dat is nu de werktint uit de
 *     statusset (#E4DFFF) met zijn eigen letter erop.
 *
 * DE STATUSSET STAAT ER OOK IN. Een mail is de vierde plek waar een
 * bestelstatus getoond wordt (na Studio, het klantportaal en admin), en tot
 * vandaag zei hij daar iets anders dan de andere drie. */
/* ── DE HAL, 14 OKTOBER 2026 ───────────────────────────────────────────────
   Lucas: het nieuwe kleurenschema "volledig toevoegen". De mail droeg nog het
   schema van 20 september: puur zwart, een grijsblauwe pagina (#E4E7EC) en
   alfa-grijzen. Nu de hal (KLEURENSCHEMA.md): inkt #0F0C24 met inkt 2 en 3,
   wit papier op nevel, de lijn #DEDCE8 en mist met nacht voor een vlak. Violet
   alleen op de knop. `faint` was zwart op 45 %, 3,4:1 op wit voor de voettekst
   van 12 px; nu inkt 3, 5,4:1. */
/* ── SCHEMA A, 19 OKTOBER 2026 (afvinklijst 41) ─────────────────────────────
   Wit, zwart en grijs zonder kleur: inkt #000000, lopende tekst #3D3D3D,
   klein #616161 (6,2:1 op wit), de lijn #DDDDDD, nevel #F2F2F2. Violet staat
   in de mail nergens: ook de knop is zwart, zoals de gewone knoppen op de site. */
/* ── BLAUW UUR, 24 OKTOBER 2026 (levering 68, lijst 55) ───────────────────────
   Inkt #0B0F17 voor alle tekst en de knop, klein #636974 (5,52:1 op wit), de lijn
   #E6E8EC, vlak #F4F5F7, aandacht blauw uur #25508B op vlak (7,41:1). De mail houdt
   de knop inkt: een mailclient kent geen muis, dus het blauw van de site (Bestellen,
   het logo onder de muis) komt hier niet. */
const C = {
  green: '#0B0F17',
  onAccent: '#FFFFFF',
  accentText: '#0B0F17',
  ink: '#0B0F17',
  text: '#0B0F17',
  head: '#0B0F17',
  muted: '#636974',
  faint: '#636974',
  rule: '#E6E8EC',
  ruleSoft: '#E6E8EC',
  paper: '#FFFFFF',
  foot: '#F4F5F7',
  tintBg: '#F4F5F7',
  tintInk: '#0B0F17',
  page: '#F4F5F7',

  /* De vijf toestanden, lichte stand — zie de tabel in KLEURENSCHEMA.md.
     Mail kent geen donkere stand: een mailclient kan zijn eigen donkere modus
     hebben, maar die herkleurt ons vlak niet, dus een tweede set zou alleen
     maar een tweede waarheid zijn. */
  stWaitFill: 'transparent', stWaitEdge: '#858A94',            stWaitInk: '#0B0F17',
  stWorkFill: '#F4F5F7',     stWorkEdge: '#E6E8EC',             stWorkInk: '#0B0F17',
  stDoneFill: '#0B0F17',     stDoneEdge: '#0B0F17',             stDoneInk: '#FFFFFF',
  stRevFill:  '#F4F5F7',     stRevEdge:  'rgba(37,80,139,.30)',  stRevInk:  '#25508B',
  stCanFill:  '#E6E8EC',     stCanEdge:  '#858A94',             stCanInk:  '#0B0F17',
};

import { stand } from '../data/status.js';

export const FONT = 'Arial,Helvetica,sans-serif';
/* De vaste breedte-letter van de labels en kenmerken (levering 55, afvinklijst 34
   E: m-kop, m-stap). Op de site is dat IBM Plex Mono; een webfont laadt in mail
   niet betrouwbaar, dus hier de mono die elke computer al heeft (v34-mono). */
export const MONO = 'Menlo,Consolas,monospace';
export { C };

/* ── DE MATEN VAN DE BRIEF — 17 oktober 2026 ─────────────────────────────────
   Lucas: *"Kijk even goed of de VISUAILS branding wel goed is bij alle mails"*
   en *"ook controleren … of ze allemaal consistent zijn en kloppen"*. Gemeten in
   alle 66 mails: op 600 breed met 15 px liep de lopende tekst tot 15 woorden per
   regel (zijn regel: 8–10). Nu 544 breed met 36 px marge, dus 472 px tekst, en
   16 px letter: 9–10 woorden per regel op een computer. Op een telefoon van 390
   blijft er 318 px over, net als voorheen (326). Kop, brief en voet gebruiken
   dezelfde marge, zodat het woordmerk boven de eerste letter van de tekst staat.
   440 BREED (17 oktober 2026, afvinklijst 33, v33-maat = c): zijn regel is 5–7
   woorden per regel. Gemeten in alle klantmails, de mediaan per alinea: bij 544
   breed 8,8 op een computer en 6,5 op een telefoon; bij 440 met 32 px marge (376
   px tekst) 7,5 en 6,8. Niets loopt over, ook de tabellen in de studiomails niet. */
const BREED = 440;
const MARGE = 32;

/* Een bedrag in centen, met duizendtallen, in de tekens van de taal:
   nl € 1.512,50 · en € 1,512.50. Hier stond in vier bestanden
   `toFixed(2).replace('.', ',')`, wat "€ 1512,50" gaf — ook in een Engelse mail.
   Dezelfde rekenregel als formatEuro() in invoicePdf.js (die trekt pdf-lib mee,
   daarom niet vanaf daar geïmporteerd). 24 september 2026. */
export function bedrag(cents, lang = 'nl') {
  const n = Number.isFinite(Number(cents)) ? Math.round(Number(cents)) : 0;
  const abs = Math.abs(n);
  const nl = lang !== 'en';
  const heel = String(Math.floor(abs / 100)).replace(/\B(?=(\d{3})+(?!\d))/g, nl ? '.' : ',');
  return `${n < 0 ? '-' : ''}€ ${heel}${nl ? ',' : '.'}${String(abs % 100).padStart(2, '0')}`;
}

/* Een datum voor in een mail: "10 oktober 2026" / "10 October 2026" in plaats
   van de ruwe "2026-10-10" uit de database. Met de hand en niet via Intl, om
   dezelfde reden als bedrag() hierboven. Iets wat geen datum is, komt ongewijzigd
   terug. 24 september 2026. */
const MAANDEN = {
  nl: ['januari', 'februari', 'maart', 'april', 'mei', 'juni', 'juli', 'augustus', 'september', 'oktober', 'november', 'december'],
  en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
};
export function datum(iso, lang = 'nl') {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso || ''));
  if (!m) return String(iso || '');
  return `${Number(m[3])} ${(MAANDEN[lang === 'en' ? 'en' : 'nl'])[Number(m[2]) - 1]} ${m[1]}`;
}

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
/* Sinds 17 oktober 2026 (afvinklijst 33) niet meer "Hoi": "Goedemiddag Sanne," als
   de klant de mail nu leest (hij zette hem zelf in gang) en we de tijd in zijn land
   kennen, anders "Hallo Sanne,". Het waarom staat in src/lib/aanhef.js. Een
   aanroeper die weet dat de klant nu leest, geeft { nu: new Date(), land } mee. */
export const greeting = (name, lang = 'en', { nu = null, land = '' } = {}) => {
  const woord = groetwoord(lang === 'nl' ? 'nl' : 'en', { nu, land });
  const naam = voornaam(name);
  return naam ? `${woord} ${esc(naam)},` : `${woord},`;
};

/* ── DE VOORNAAM — 1 oktober 2026 (ronde 8) ───────────────────────────────
   "Hoi Sanne Keten," leest als een formulier dat terugpraat. Een mens zegt
   "Hoi Sanne,". Het eerste woord van de naam, tenzij dat een losse letter of
   een voorvoegsel is ("J. de Vries", "van Dam"): dan de hele naam, want een
   gok die verkeerd uitvalt is erger dan een volledige naam. */
const VOORVOEGSELS = new Set(['van', 'de', 'den', 'der', 'het', "'t", 'ten', 'ter', 'te', 'la', 'le', 'du', 'von', 'mr', 'mevr', 'dhr', 'mw']);
export function voornaam(name) {
  const naam = String(name ?? '').trim().replace(/\s+/g, ' ');
  if (!naam) return '';
  const eerste = naam.split(' ')[0];
  if (eerste.length < 2 || /\.$/.test(eerste) || VOORVOEGSELS.has(eerste.toLowerCase())) return naam;
  return eerste;
}

/* ── blocks ──────────────────────────────────────────────────────────────── */

/** A paragraph of body copy. */
export const p = (html, { muted = false, top = 0, bottom = 16 } = {}) =>
  `<p style="margin:${top}px 0 ${bottom}px;font-family:${FONT};font-size:16px;line-height:1.6;color:${muted ? C.muted : C.text}">${html}</p>`;

/** The headline, and the reference line under it. */
export const h1 = (text, sub = '') =>
  `<h1 style="margin:0 0 ${sub ? '6' : '18'}px;font-family:${FONT};font-size:24px;line-height:1.25;font-weight:700;color:${C.head}">${esc(text)}</h1>` +
  (sub ? `<p style="margin:0 0 22px;font-family:${MONO};font-size:12px;color:${C.muted};letter-spacing:.1em;text-transform:uppercase">${sub}</p>` : '');

/* ── HET KENMERK ONDER DE KOP — 17 oktober 2026 ──────────────────────────────
   Onder de kop stond het ene keer "Referentie VIS-2608-4471", het andere keer
   alleen "VIS-2026-0031" of "VIS-AB-0012", en bij het tegoed een bedrag. Een
   nummer zonder woord ervoor laat de lezer raden wat het is (een factuur? een
   bestelling?). Nu altijd een woord en dan het nummer, uit deze ene tabel. */
const KENMERK = {
  bestelling: ['Referentie', 'Reference'],
  abonnement: ['Abonnement', 'Plan'],
  factuur: ['Factuur', 'Invoice'],
  creditnota: ['Creditnota', 'Credit note'],
  tegoed: ['Tegoed', 'Credit'],
  merkmodel: ['Merkmodel', 'Brand model'],
};
/** "Referentie VIS-2608-4471" / "Plan VIS-AB-0012": het woord en het nummer (ge-escapet), als html. */
export function kenmerk(soort, nummer, lang = 'nl') {
  if (!nummer) return '';
  const [nl, en] = KENMERK[soort] || KENMERK.bestelling;
  /* Levering 55 (m-kop): als een label op een doos, het woord en het nummer los
     van elkaar, het nummer in inkt en vet: REFERENTIE  VIS-2608-4471. */
  return `${lang === 'en' ? en : nl}&nbsp;&nbsp;<span style="color:${C.head};font-weight:700">${esc(nummer)}</span>`;
}

/* ── EEN UITGESCHREVEN LINK — 17 oktober 2026 ─────────────────────────────────
   Vier mails zetten de portaallink voluit onder een notitie, in #8A8F98: een
   grijs uit het palet van augustus, 3,25:1 op wit. Nu het grijs van de hal
   (C.muted, 5,4:1), op één plek. */
export const linkUit = (href) =>
  `<span style="color:${C.muted};word-break:break-all">${esc(href)}</span>`;

/* ── "WERKT DE KNOP NIET?" — 17 oktober 2026 ─────────────────────────────────
   Drie vormen: "Kopieer deze link in je browser:" met de link in het blauw van
   de mailapp, "Open deze link:", en bij de betaallink een vette zin met een pijl
   en geen adres. Nu één: een stille regel met het adres voluit, aanklikbaar. */
export function terugval(href, lang = 'nl', { top = 14 } = {}) {
  /* top: 14 onder het betaalvlak; 0 direct onder button(), dat zelf al 20 px ruimte meegeeft. */
  const zin = lang === 'en' ? 'Button not working? Open this link:' : 'Werkt de knop niet? Open deze link:';
  return `<p style="margin:${top}px 0 18px;font-family:${FONT};font-size:13px;line-height:1.6;color:${C.muted}">${zin}<br>`
    + `<a href="${esc(href)}" style="color:${C.muted};word-break:break-all">${esc(href)}</a></p>`;
}

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

/**
 * DE STATUSPIL, MAILVERSIE — 20 september 2026.
 *
 * Dezelfde vorm als `.stand` in src/styles/global.css: pil, 28px hoog,
 * hoofdletters, 11px, een stip van 6px, en ALTIJD het woord ernaast. De stand
 * komt uit dezelfde tabel als overal — src/data/status.js — zodat een mail
 * nooit iets anders over een bestelling zegt dan Studio, portaal of admin.
 *
 * DRIE DINGEN ZIJN ANDERS DAN IN CSS, en alle drie omdat mail geen browser is:
 *   · `border` in plaats van `inset box-shadow` — box-shadow bestaat niet in
 *     Outlook, en de randsimulatie is precies wat KLEURENSCHEMA.md toestaat.
 *   · `currentColor` staat er niet; de stip krijgt de inktkleur letterlijk.
 *   · de letter is FONT (Arial), niet de mono van de site: een webfont laadt
 *     in mail niet en de terugval zou een tweede vorm zijn.
 * De hoogte klopt op de punt: 5 + 16 + 5 + 2 × 1px rand = 28px.
 *
 * De kleuren staan in C bovenaan dit bestand — handkopie van KLEURENSCHEMA.md.
 */
export const statusPil = (status, label) => {
  const k = {
    wait: [C.stWaitFill, C.stWaitEdge, C.stWaitInk],
    work: [C.stWorkFill, C.stWorkEdge, C.stWorkInk],
    done: [C.stDoneFill, C.stDoneEdge, C.stDoneInk],
    rev: [C.stRevFill, C.stRevEdge, C.stRevInk],
    can: [C.stCanFill, C.stCanEdge, C.stCanInk],
  }[stand(status)];
  const [vul, rand, inkt] = k;
  return `<span style="display:inline-block;padding:5px 11px;border:1px solid ${rand};border-radius:8px 3px 3px 3px;`
    + `background:${vul === 'transparent' ? 'none' : vul};font-family:${FONT};font-size:12px;line-height:16px;`
    + `font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:${inkt};white-space:nowrap">`
    + `<span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:${inkt};margin-right:6px;vertical-align:1px"></span>`
    + `${esc(label == null || label === '' ? status : label)}</span>`;
};

/** The green call-to-action. A table cell with bgcolor, which Outlook honours. */
const knop = (href, label) =>
  `<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
    <!-- Levering 55 (m-knop): één zachte hoek linksboven, zoals de knop op de site.
         Outlook op Windows kent border-radius niet en toont hem recht; dat is goed zo. -->
    <td bgcolor="${C.green}" align="center" style="background:${C.green};padding:15px 24px;border-radius:14px 3px 3px 3px">
      <!-- De letter op het accent is WIT sinds 20 september: zwart op violet
           haalt 2,93:1 en is in KLEURENSCHEMA.md met zoveel woorden afgekeurd. -->
      <a href="${esc(href)}" style="font-family:${FONT};font-size:16px;font-weight:700;color:${C.onAccent};text-decoration:none;display:block">${esc(label)}</a>
    </td>
  </tr></table>`;

/* ── DE RUIMTE ONDER DE KNOP — 17 oktober 2026 ────────────────────────────────
   Zes mails zetten na de knop zelf een lege regel van 22 px, de rest niet: daar
   stond de volgende alinea tegen de knop aan (gezien bij de proefronde-mail en
   de welkomstmail). Nu zit de ruimte in de knop zelf, overal gelijk (20 px).
   In het betaalvak niet: daar sluit de knop het vak af. */
export const button = (href, label) =>
  `${knop(href, label)}<div style="height:20px;font-size:0;line-height:0">&nbsp;</div>`;

/** The amount-due panel: a mist panel with the total and the button. Sinds 14
    oktober 2026 zonder de violette rand links (violet is voor de knop). */
export const payPanel = ({ label, amount, sub, href, cta }) =>
  `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${C.tintBg}" style="background:${C.tintBg};margin:8px 0 0;border-radius:22px 3px 3px 3px">
    <tr>
      <td style="padding:22px 24px;font-family:${FONT}">
        <p style="margin:0 0 2px;font-family:${MONO};font-size:12px;letter-spacing:.1em;color:${C.tintInk};text-transform:uppercase">${esc(label)}</p>
        <p style="margin:0 0 4px;font-size:26px;font-weight:700;color:${C.head}">${esc(amount)}</p>
        ${sub ? `<p style="margin:0 0 16px;font-size:12px;line-height:1.5;color:${C.muted}">${sub}</p>` : ''}
        ${href ? knop(href, cta) : ''}
      </td>
    </tr>
  </table>`;

/** A quiet aside with a hairline down its left — the spam note lives in one. */
export const note = html =>
  `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:4px 0 16px"><tr>
    <!-- De lijn van de hal (#E6E8EC), als bgcolor: dat slikt elke mailclient. -->
    <td width="3" bgcolor="${C.rule}" style="width:3px;font-size:0;line-height:0">&nbsp;</td>
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
  `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${C.tintBg}" style="background:${C.tintBg};margin:2px 0 16px;border-radius:18px 3px 3px 3px"><tr>
    <td style="padding:16px 20px">
      <p style="margin:0;font-family:${FONT};font-size:16px;line-height:1.6;color:${C.text}">${html}</p>
    </td>
  </tr></table>`;

/** The "check your spam" line, from the one place that sentence is written.
 *  Sinds 8 oktober 2026 (punt 7.07, V21-1) alleen nog in de eerste mail aan een
 *  nieuw adres: de bestelbevestiging bij een eerste bestelling, de checklist en
 *  de bevestiging van een nieuw e-mailadres. Een zin die in dertig mails staat,
 *  leest niemand meer. */
export const spamNote = lang => note(esc(mailNoteInMail(lang)));

/* ── DE VRAGENREGEL — 8 oktober 2026 (punt 7.07) ─────────────────────────────
   Elke klantmail eindigt met dezelfde regel: "Vragen? Antwoord op deze mail of
   app ons." Het antwoordadres is hello@ (src/lib/mail.js), en "app ons" is een
   gewone wa.me-link met het kenmerk erin, zonder persoonsgegevens. Dit is de
   knop voor wie zelf een vraag heeft; wij appen nooit uit onszelf over een
   statuswissel (overzicht §21). */
/* Doorloop 27 (B46): de bevestiging van een AANVRAAG eindigde met "een vraag
   over mijn bestelling". { aanvraag: true } zet het woord goed, net als de
   WhatsApp-link op de bedankpagina. */
export function vragen(lang = 'nl', ref = '', { aanvraag = false, over = '' } = {}) {
  const nl = lang !== 'en';
  const wat = aanvraag ? (nl ? 'aanvraag' : 'request') : (nl ? 'bestelling' : 'order');
  /* `over` (15 oktober 2026): een mail die niet over een bestelling gaat (tegoed)
     zegt dat ook in de WhatsApp-tekst, zoals B24/B46 dat deden voor de aanvraag. */
  const onderwerp = over || `${nl ? 'mijn' : 'my'} ${wat}${ref ? ` ${ref}` : ''}`;
  const tekst = nl
    ? `Hallo VISUAILS, een vraag over ${onderwerp}:`
    : `Hello VISUAILS, a question about ${onderwerp}:`;
  const a = `<a href="${esc(waHref(tekst))}" style="color:${C.head};font-weight:700">${nl ? 'app ons' : 'WhatsApp us'}</a>`;
  return p(nl ? `Vragen? Antwoord op deze mail of ${a}.` : `Questions? Reply to this email or ${a}.`, { top: 14, bottom: 0 });
}

/** A prominent text link on its own line, the way the portal link is offered. */
export const linkLine = (href, label) =>
  `<p style="margin:0 0 20px;font-family:${FONT};font-size:16px"><a href="${esc(href)}" style="color:${C.head};font-weight:700">${esc(label)} &rarr;</a></p>`;

/* ── the shell ───────────────────────────────────────────────────────────── */

/* De kop (14 oktober 2026): wit, met het woordmerk als beeld (een mail kent
   geen SVG; scripts/make-mail-assets.mjs tekent het uit src/data/woordmerk.js)
   en een haarlijn eronder. Hier stond een zwarte band met het V-merk en het
   woord VISUAILS ernaast — twee merken naast elkaar, wat nergens anders mag —
   en een violette streep van 4 px. Zonder beelden leest de alt-tekst
   "VISUAILS" op dezelfde plek.

   HET WOORDMERK STAAT OP EEN WIT PLAATJE — 17 oktober 2026. Lucas stuurde een
   schermafdruk uit de Gmail-app op zijn telefoon, in de donkere stand: het
   woordmerk was bijna weg. Gmail op Android en iOS maakt een lichte mail zelf
   donker (de achtergrond zwart, de letters licht) maar laat beelden zoals ze
   zijn, en `color-scheme: light` hieronder helpt daar niet. Een woordmerk in
   inkt op een doorzichtige png stond dus donker op donker (1,2:1). Nu is het
   beeld zelf een witte pil (woordmerk-plaat.png, 156 × 46) met het woordmerk
   erin: op wit is de pil onzichtbaar en staat alles op de pixel waar het stond;
   in de donkere stand staat er een witte pil met VISUAILS erin, zoals de pillen
   op de site. De marges om het beeld zijn met de pil verminderd (16 en 12 px),
   zodat de letters op dezelfde plek blijven. */
const letterhead = () => `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${C.paper}" style="background:${C.paper}">
  <tr><td style="padding:14px ${MARGE - 16}px 10px">
    <a href="${SITE}" style="font-family:${FONT};font-size:15px;font-weight:700;letter-spacing:.12em;color:${C.ink};text-decoration:none"><img src="${SITE}/img/mail/woordmerk-plaat.png" width="156" height="46" alt="VISUAILS" style="display:block;border:0;outline:none;text-decoration:none;color:${C.ink}"></a>
  </td></tr>
  <!-- Levering 55 (m-kop): de lijn onder de kop begint met een violet streepje met
       een schuin eind op 53°, de snede van het merk (snede.png, 28 × 3). -->
  <tr><td style="padding:0 ${MARGE}px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td width="28" style="width:28px;font-size:0;line-height:0"><img src="${SITE}/img/mail/snede.png" width="28" height="3" alt="" style="display:block;border:0"></td><td valign="bottom" style="font-size:0;line-height:0"><div style="height:1px;background:${C.rule};font-size:0;line-height:0">&nbsp;</div></td></tr></table></td></tr>
</table>`;

const footer = lang => {
  const nl = lang === 'nl';
  const base = nl ? `${SITE}/nl` : SITE;
  const terms = nl ? 'Algemene voorwaarden' : 'Terms';
  const privacy = nl ? 'Privacyverklaring' : 'Privacy policy';
  return `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
  <!-- Levering 55 (m-stap): onderaan zakt het woordmerk in lila in de voet, door de
       rand afgesneden, zoals het grote woordmerk onder de site. Een beeld
       (voet-woordmerk.png, 376 × 38), dus het staat er ook in de donkere stand. -->
  <tr><td style="padding:30px ${MARGE}px 0;font-size:0;line-height:0"><img src="${SITE}/img/mail/voet-woordmerk.png" width="376" height="38" alt="" style="display:block;border:0;width:100%;max-width:376px;height:auto"></td></tr>
  <tr><td bgcolor="${C.foot}" style="padding:20px ${MARGE}px 26px;background:${C.foot};font-family:${FONT}">
    <p style="margin:0 0 6px;font-size:12px;color:${C.faint}">
      <a href="${base}/terms" style="color:${C.faint}">${terms}</a> &middot;
      <a href="${base}/privacy" style="color:${C.faint}">${privacy}</a>
    </p>
    <p style="margin:0 0 4px;font-size:12px;color:${C.faint}">VISUAILS &middot; Enschede, NL &middot; KVK 99742993 &middot; hello@visuails.com</p>
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
<!--tekst:uit--><div style="display:none;font-size:1px;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden">${esc(preheader)}</div><!--/tekst:uit-->
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${C.page}" style="background:${C.page}">
  <tr><td align="center" style="padding:0">
    ${/* Ronde 9 (3 okt 2026): op een telefoon van 390 breed stak de vaste 600 px
       210 px buiten beeld — in een mailapp die niet zelf verkleint betekent dat
       zijwaarts scrollen om de betaalknop te zien. Nu 100% tot een maximum van
       BREED (544 sinds 17 oktober 2026, zie DE MATEN VAN DE BRIEF); Outlook voor
       Windows kent max-width niet en krijgt via de mso-commentaren zijn eigen
       tabel van die breedte. */ ''}<!--[if mso]><table role="presentation" width="${BREED}" cellpadding="0" cellspacing="0" border="0"><tr><td><![endif]-->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${C.paper}" style="width:100%;max-width:${BREED}px;background:${C.paper}">
      <tr><td><!--tekst:uit-->${letterhead()}<!--/tekst:uit--></td></tr>
      <tr><td style="padding:34px ${MARGE}px 26px">${body}</td></tr>
      <tr><td>${footer(lang)}</td></tr>
    </table>
    <!--[if mso]></td></tr></table><![endif]-->
  </td></tr>
</table>
</body>
</html>`;
}
