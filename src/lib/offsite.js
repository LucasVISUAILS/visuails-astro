/*
 * ═══════════════════════════════════════════════════════════════════════════════
 * NAAR BUITEN STUREN, TERWIJL DE PAGINA form-action 'self' HEEFT
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Lucas, 9 augustus 2026, over de reviewknoppen in VISUAILS Studio: *"Deze
 * knoppen verwijzen nergens naartoe."* Een nieuw tabblad opende, bleef staan op
 * /account/feedback, en bleef leeg.
 *
 * ── WAT ER GEBEURDE ─────────────────────────────────────────────────────────
 *
 * Zowel /account als /o/<token> stuurt deze header mee (zie html() in account.js
 * en portal.js):
 *
 *   content-security-policy: default-src 'none'; … form-action 'self'; …
 *
 * `form-action` beperkt waar een FORMULIER naartoe mag posten. Wat er niet bij
 * staat, en wat het hele verschil maakt: Chrome past hem óók toe op elke
 * REDIRECT die op die post volgt. Een 303 van ons eigen /account/feedback naar
 * https://g.page/… is dus een form-action-overtreding, ook al is de post zelf
 * netjes naar 'self'.
 *
 * Gemeten in plaats van aangenomen — scripts/csp-probe.mjs, met de echte Chromium uit
 * playwright, drie vormen naast elkaar:
 *
 *   POST → 303 naar een andere origin   tabblad blijft leeg, url blijft de post
 *   POST → 200 met een meta refresh     komt aan
 *   POST → 200 zonder meta              blijft staan (controle)
 *
 * Twee dingen aan die meting zijn de reden dat dit maanden onopgemerkt kon
 * blijven:
 *
 *   1 · DE POST KOMT WEL AAN. In de probe stond `SITE POST /go` in het log van
 *       de server. De klik werd dus geregistreerd, de Mollie-betaling werd
 *       aangemaakt — alleen de reis erna werd geblokkeerd. Er is aan onze kant
 *       niets om aan te zien.
 *   2 · CHROME NOEMT DE VERKEERDE URL. De console zei "Refused to send form data
 *       to 'http://localhost:4610/go'" — onze eigen url, die 'self' IS. Dat is
 *       met opzet: bij een redirect rapporteert CSP de url van vóór de redirect,
 *       zodat de melding niet verklapt waar de redirect heen ging. Wie die
 *       melding leest, gaat dus zoeken naar een fout in een pad dat geen fout
 *       heeft.
 *
 * ── WAAROM form-action NIET VERBREED WORDT ──────────────────────────────────
 *
 * De korte oplossing was `form-action 'self' https://g.page https://*.google.com
 * https://*.trustpilot.com https://*.mollie.com`. Dat is afgewezen, om twee
 * redenen die allebei over de VOLGENDE keer gaan:
 *
 * · Een verkorte Google-reviewlink is zelf een redirect, en waar hij tussendoor
 *   langsgaat is niet iets wat wij bepalen. Eén hop die niet in de lijst staat en
 *   de knop is weer stil stuk. Precies deze bug, opnieuw.
 * · De storing is ONZICHTBAAR. Geen 500, geen regel in de logs, geen mail. Alleen
 *   een leeg tabblad bij de klant. Een oplossing waarvan de faalvorm onzichtbaar
 *   is, is geen oplossing maar een tweede kans op hetzelfde.
 *
 * Deze pagina is immuun voor het aantal hops, want zodra het document er staat is
 * de navigatie erna een gewone documentnavigatie en niet meer de afhandeling van
 * een formulier. CSP kent daar geen richtlijn voor (`navigate-to` is nooit
 * verscheept). De header blijft dus zo streng als hij was.
 *
 * ── EN HET IS GEEN OPEN REDIRECT ────────────────────────────────────────────
 *
 * Een pagina die doorstuurt naar een url is precies de vorm van een open
 * redirect, dus staat de grens hier en niet bij de aanroeper: alleen absolute
 * https-urls, en de aanroeper moet zijn doel al gecontroleerd hebben (de
 * platformlijst in data/reviews.js, de mollie.com-toets in handleOrderPay). Komt
 * er iets anders binnen, dan geeft dit null terug en valt de aanroeper terug op
 * zijn eigen pagina — nooit op de url waar hij niet van weet.
 *
 * ── WAAROM ER GEEN INLINE STYLE IN STAAT ────────────────────────────────────
 *
 * default-src 'none' met style-src 'self' verbiedt zowel een <style>-blok als een
 * style-attribuut. Deze pagina leunt daarom op de stylesheet die de aanroeper al
 * gebruikt (account.css of portal.css) en op twee klassen die in beide bestaan:
 * .btn en .btn-primary. Geen nieuwe regels, geen derde bestand, en de tussenpagina
 * ziet eruit als de site — ook op het moment dat hij blijft staan omdat de meta
 * refresh door een instelling geblokkeerd is.
 */

const COPY = {
  nl: {
    title: (name) => `Doorsturen naar ${name}`,
    line: (name) => `We sturen je door naar ${name}.`,
    cta: (name) => `Ga verder naar ${name}`,
    note: 'Blijft deze pagina staan, klik dan op de knop.',
  },
  en: {
    title: (name) => `Continuing to ${name}`,
    line: (name) => `We are sending you on to ${name}.`,
    cta: (name) => `Continue to ${name}`,
    note: 'If this page stays put, use the button.',
  },
};

function esc(s) {
  return String(s == null ? '' : s).replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]
  );
}

/**
 * Is dit een url waar we iemand naartoe mogen sturen?
 *
 * Alleen https, en alleen een absolute url met een host. Geen relatieve url
 * (daar is seeOther voor), geen javascript:, geen data:, geen protocol-relatieve
 * //evil.example — die laatste is de klassieker waar een naïeve controle op
 * `startsWith('/')` op stukloopt.
 */
export function isOffsiteUrl(value) {
  let u;
  try {
    u = new URL(String(value || ''));
  } catch {
    return false;
  }
  return u.protocol === 'https:' && !!u.host;
}

/**
 * De tussenpagina.
 *
 * @param {object} o
 * @param {string} o.url    het doel — al gecontroleerd door de aanroeper
 * @param {string} o.name   hoe het doel heet voor de lezer ('Google', 'Mollie')
 * @param {'nl'|'en'} o.lang
 * @param {string} o.css    de stylesheet van de aanroepende pagina
 * @returns {string|null} html, of null als de url niet door de toets komt
 */
export function offsitePage({ url, name, lang = 'nl', css = '/account.css' }) {
  if (!isOffsiteUrl(url)) return null;
  const t = COPY[lang === 'en' ? 'en' : 'nl'];
  const l = lang === 'en' ? 'en' : 'nl';
  const u = esc(url);
  /*
   * RAUW, niet hier al ontsnapt. Eerst stond hier `esc(name)`, en dat werd
   * hieronder een tweede keer door esc() gehaald: een naam met een < erin kwam er
   * als `&amp;lt;` uit te staan, zichtbaar voor de lezer. Één plek waar ontsnapt
   * wordt, en dat is het moment van uitschrijven.
   */
  const n = name || new URL(url).host;
  return `<!doctype html>
<html lang="${l}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<meta http-equiv="refresh" content="0; url=${u}">
<title>${esc(t.title(n))} — VISUAILS</title>
<link rel="stylesheet" href="${esc(css)}">
</head>
<body>
<main>
<h1>${esc(t.title(n))}</h1>
<p>${esc(t.line(n))}</p>
<p><a class="btn btn-primary" href="${u}" rel="noopener">${esc(t.cta(n))}</a></p>
<p>${esc(t.note)}</p>
</main>
</body>
</html>`;
}
