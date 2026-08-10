/*
 * ═══════════════════════════════════════════════════════════════════════════════
 * DE TEVREDENHEIDSVRAAG, EN WAT ERNA KOMT
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Fase 1 van reviewverzamelingspecificatie.md §4: stap 1 (de vraag) en stap 2
 * (de routing op de score). De herinnering na 5-7 dagen en het testimonialblok op
 * de homepage zijn iteratie twee; de kolommen daarvoor staan al in migratie 0020.
 *
 * ── WAAROM DIT ÉÉN BESTAND IS EN GEEN TWEE ───────────────────────────────────
 *
 * §2 stap 1 vraagt het letterlijk: *"uit één gedeelde component, niet twee losse
 * implementaties."* Een bestelling kan op twee plekken het punt "alles
 * goedgekeurd" bereiken — VISUAILS Studio (/account) en de portaallink uit de
 * levermail (/o/<token>) — en dat is niet toevallig dezelfde tweedeling die
 * close.js heeft opgeleverd: daar bleek dat het portaalpad de afronding NIET
 * aanriep, precies omdat er twee implementaties van hetzelfde waren.
 *
 * Dus staat hier alles: de tekst, de opmaak en het schrijven naar de database. De
 * twee aanroepers leveren alleen hun eigen formulier-doel aan, want dat is het
 * enige waarin ze echt verschillen.
 *
 * ── DE REGEL DIE HET MEEST TEGENINTUÏTIEF IS ─────────────────────────────────
 *
 * Bij een LAGE score blijven de publieke reviewknoppen staan. Ze worden kleiner
 * en ze staan onder het privéformulier, maar ze verdwijnen niet.
 *
 * Dat voelt verkeerd en het is verplicht. §2: reviews filteren op score — alleen
 * tevreden klanten naar Google sturen en ontevreden klanten de deur wijzen —
 * heet "review gating", en dat is bij Google en Trustpilot tegen de richtlijnen
 * én in de EU een oneerlijke handelspraktijk. Het verschil tussen dit en gating
 * zit precies in wat een ontevreden klant nog KAN: krijgt hij dezelfde knoppen te
 * zien, dan is de volgorde een advies; verdwijnen ze, dan is het een filter.
 *
 * Vandaar dat de knoppen in beide gevallen uit dezelfde functie komen en alleen
 * hun plek en maat verschillen. Eén codepad, dus niemand kan het per ongeluk
 * dichtzetten.
 *
 * ── GEEN BELONING, EN DAAROM OOK GEEN VELD ──────────────────────────────────
 *
 * §3 verbiedt korting of credit in ruil voor een review. Er is hier dus ook geen
 * parameter om er ooit een aan te hangen — zie de noot onderaan migratie 0020
 * over waarom een ontbrekend veld de goedkoopste manier is om een verboden
 * functie niet per ongeluk te bouwen.
 */

import { REVIEW_PLATFORMS, parsePlatforms, SCORE_HIGH, SCORE_MAX } from '../data/reviews.js';
import { sendMail } from './mail.js';
import { shell, h1, p as mailP, rows as mailRows, quote as mailQuote, note as mailNote } from './mailTemplate.js';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (ch) => (
  { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]
));

/* ── TEKST ───────────────────────────────────────────────────────────────────
 *
 * Geen enkele string staat los in de opmaak hieronder. Twee talen, en de
 * Nederlandse is geschreven zoals iemand het zegt — geen "gelieve", geen
 * "waardering", geen beeldspraak. Zie de tekstronde van 9 augustus 2026.
 */
const COPY = {
  nl: {
    askH: 'Ben je tevreden met wat je hebt gekregen?',
    askLede: 'Eén klik. We vragen het één keer per bestelling.',
    scoreLow: 'Niet tevreden',
    scoreHigh: 'Heel tevreden',
    scoreLabel: (n) => `${n} van ${SCORE_MAX}`,

    // Lage score: eerst oplossen.
    fixH: 'Wat kunnen we beter doen?',
    fixLede: 'Dit komt alleen bij ons terecht. Vertel wat er niet klopte, dan kijken we ernaar.',
    fixPlaceholder: 'Wat ging er mis?',
    fixSend: 'Versturen',
    fixSkip: 'Liever niet, bedankt',
    fixThanks: 'Bedankt — we hebben het gelezen en nemen contact op.',

    // Hoge score: de drie acties.
    shareH: 'Wil je dat ergens kwijt?',
    shareLede: 'Alles hieronder is optioneel. Voor ons scheelt het veel.',
    platform: (name) => `Review op ${name}`,
    platformNote: 'Opent in een nieuw tabblad.',

    // De testimonial.
    quoteH: 'Mogen we je aan het woord laten op onze site?',
    quotePlaceholder: 'Wat zou je tegen een ander merk zeggen?',
    quoteName: 'Naam of merknaam',
    quoteConsent: 'Ja, jullie mogen dit met mijn naam op de site zetten.',
    quoteConsentNote: 'Zonder dit vinkje bewaren we het niet en zetten we het nergens neer. We plaatsen het pas nadat we het zelf hebben nagekeken.',
    quoteSend: 'Versturen',
    quoteThanks: 'Bedankt. We kijken ernaar voordat we het plaatsen.',

    // De kleine variant onder het privéformulier.
    alsoH: 'Toch een openbare review achterlaten?',
    alsoLede: 'Ook als je niet tevreden was. We houden die knoppen niet achter.',

    done: 'Bedankt voor je antwoord.',
    changeScore: 'Ander antwoord geven',
  },
  en: {
    askH: 'Are you happy with what you got?',
    askLede: 'One click. We ask once per order.',
    scoreLow: 'Not happy',
    scoreHigh: 'Very happy',
    scoreLabel: (n) => `${n} out of ${SCORE_MAX}`,

    fixH: 'What could we have done better?',
    fixLede: 'This reaches us and nobody else. Tell us what was wrong and we will look at it.',
    fixPlaceholder: 'What went wrong?',
    fixSend: 'Send',
    fixSkip: 'No thanks',
    fixThanks: 'Thank you — we have read it and we will be in touch.',

    shareH: 'Want to say that somewhere?',
    shareLede: 'Everything below is optional. It helps us a lot.',
    platform: (name) => `Review on ${name}`,
    platformNote: 'Opens in a new tab.',

    quoteH: 'May we quote you on our site?',
    quotePlaceholder: 'What would you tell another brand?',
    quoteName: 'Name or brand name',
    quoteConsent: 'Yes, you may put this on the site with my name.',
    quoteConsentNote: 'Without this box we do not keep it and we do not put it anywhere. We only publish it after we have read it ourselves.',
    quoteSend: 'Send',
    quoteThanks: 'Thank you. We will read it before we publish it.',

    alsoH: 'Still want to leave a public review?',
    alsoLede: 'Even if you were not happy. We do not hold those buttons back.',

    done: 'Thanks for answering.',
    changeScore: 'Give a different answer',
  },
};

/* ── DE DATABASE ─────────────────────────────────────────────────────────────
 *
 * Alles hieronder is BEST EFFORT en vangt zijn eigen fout op. Deze vraag hangt
 * onder een bestelling die al klaar is; hij mag het scherm eromheen nooit
 * omvergooien. Bestaat `order_feedback` nog niet — migratie 0020 niet gedraaid —
 * dan gedraagt alles zich als "nog niets ingevuld", en dat is precies de juiste
 * uitkomst: de vraag staat er, het antwoord komt nergens, en niemand ziet een
 * foutpagina in plaats van zijn beelden.
 */

/** Het antwoord bij deze bestelling, of null. */
export async function loadFeedback(env, orderId) {
  try {
    return await env.DB.prepare(
      'SELECT * FROM order_feedback WHERE order_id = ?1'
    ).bind(orderId).first();
  } catch (err) {
    console.warn('[feedback] niet te lezen voor bestelling', orderId, '—', err && err.message,
      '— migratie 0020 gedraaid?');
    return null;
  }
}

/**
 * De score vastleggen, of bijwerken.
 *
 * BIJWERKEN EN NIET OPTELLEN. §2 vraagt de vraag één keer per bestelling; een
 * klant die eerst een 3 gaf en na een revisie een 5 wil geven, verandert zijn
 * antwoord. Een geschiedenis van scores is niet gevraagd en zou de regel "één
 * keer vragen" tegenspreken — zie de UNIQUE op order_id in migratie 0020.
 *
 * `asked_at` blijft bij een tweede antwoord staan: dat is het moment waarop we
 * het vroegen, en dat is waar de herinnering van iteratie twee op rekent.
 */
export async function saveScore(env, orderId, customerId, score) {
  const n = Number.parseInt(String(score), 10);
  if (!Number.isInteger(n) || n < 1 || n > SCORE_MAX) return { ok: false, changed: false, score: null };
  try {
    // De vorige score eerst, want de aanroeper moet weten of er iets VERANDERT.
    // Dezelfde 2 nog een keer opslaan is geen nieuw feit en hoort geen tweede
    // mail naar de studio te sturen — zie notifyStudio() hieronder.
    const before = await env.DB.prepare(
      'SELECT score FROM order_feedback WHERE order_id = ?1'
    ).bind(orderId).first();
    await env.DB.prepare(
      `INSERT INTO order_feedback (order_id, customer_id, score)
       VALUES (?1, ?2, ?3)
       ON CONFLICT(order_id) DO UPDATE SET
         score = excluded.score,
         updated_at = datetime('now')`
    ).bind(orderId, customerId || null, n).run();
    return { ok: true, changed: Number(before?.score) !== n, score: n };
  } catch (err) {
    console.error('[feedback] score niet opgeslagen voor bestelling', orderId, '—', err && err.message);
    return { ok: false, changed: false, score: null };
  }
}

/** Het privéantwoord op "wat kunnen we beter doen?". Gaat naar de studio en nergens anders. */
export async function saveNote(env, orderId, note) {
  const text = String(note || '').trim().slice(0, 2000);
  if (!text) return false;
  try {
    /*
     * DE EERSTE NOTITIE WINT — `AND private_note IS NULL`.
     *
     * Twee redenen, en de tweede is de belangrijkste. Ten eerste past het bij het
     * scherm: zodra er een notitie staat verdwijnt het formulier, dus een tweede
     * POST komt niet van iets wat wij hebben getekend. Ten tweede gaat er een mail
     * naar de studio zodra er een notitie binnenkomt — als een herhaalde POST de
     * tekst zou overschrijven, zou hij ook een tweede mail sturen, en zou de
     * eerste versie weg zijn terwijl die al gelezen is.
     *
     * De uitkomst van de UPDATE is daarmee ook het antwoord op "is dit nieuw?",
     * en dat is wat de aanroeper nodig heeft om wel of niet te mailen. D1 geeft
     * dat in meta.changes; is dat er niet, dan lezen we het terug.
     */
    const res = await env.DB.prepare(
      `UPDATE order_feedback
          SET private_note = ?2, updated_at = datetime('now')
        WHERE order_id = ?1 AND private_note IS NULL`
    ).bind(orderId, text).run();
    const changes = res?.meta?.changes;
    if (Number.isInteger(changes)) return changes > 0;
    const row = await env.DB.prepare(
      'SELECT private_note FROM order_feedback WHERE order_id = ?1'
    ).bind(orderId).first();
    return row?.private_note === text;
  } catch (err) {
    console.error('[feedback] notitie niet opgeslagen voor bestelling', orderId, '—', err && err.message);
    return false;
  }
}

/**
 * Vastleggen dat er op een platformknop is geklikt.
 *
 * ── WAT DIT WEL EN NIET WEET ────────────────────────────────────────────────
 *
 * Dit zegt: er is geklikt. Niet: er is een review geschreven. Google en
 * Trustpilot vertellen ons dat niet, en de kolom heet daarom `platforms_clicked`
 * en niet `reviews_left` — zie de noot in migratie 0020 over waarom een kolom die
 * suggereert dat we het weten, een kolom is die ooit als bewijs wordt gebruikt.
 *
 * Waar dit wél voor dient: de herinnering van iteratie twee mag niet naar iemand
 * die al geklikt heeft.
 */
export async function savePlatformClick(env, orderId, platform) {
  const [id] = parsePlatforms(platform);
  if (!id) return false;
  try {
    const row = await env.DB.prepare(
      'SELECT platforms_clicked FROM order_feedback WHERE order_id = ?1'
    ).bind(orderId).first();
    const set = new Set(parsePlatforms(row?.platforms_clicked));
    if (set.has(id)) return true;
    set.add(id);
    // De volgorde van reviews.js aanhouden, zodat de opgeslagen waarde niet
    // afhangt van de volgorde waarin iemand toevallig klikte.
    const value = REVIEW_PLATFORMS.filter((p) => set.has(p.id)).map((p) => p.id).join(',');
    await env.DB.prepare(
      `UPDATE order_feedback SET platforms_clicked = ?2, updated_at = datetime('now') WHERE order_id = ?1`
    ).bind(orderId, value).run();
    return true;
  } catch (err) {
    console.error('[feedback] klik niet opgeslagen voor bestelling', orderId, '—', err && err.message);
    return false;
  }
}

/**
 * De testimonial.
 *
 * ZONDER VINKJE WORDT ER NIETS BEWAARD. Niet "wel bewaren, niet tonen" — dat is
 * een tekst over jezelf op onze server waar je geen ja tegen hebt gezegd. §3
 * eist expliciete, aparte toestemming, en de goedkoopste manier om die eis niet
 * te overtreden is de tekst weggooien in plaats van hem te bewaren met een vlag
 * eraan die iemand ooit omzet.
 *
 * `testimonial_approved` blijft 0. Publiceren is een aparte handeling van de
 * studio, en dat is stap 4 van de specificatie.
 */
export async function saveTestimonial(env, orderId, { text, name, consent }) {
  if (!consent) return false;
  const body = String(text || '').trim().slice(0, 1200);
  if (!body) return false;
  try {
    await env.DB.prepare(
      `UPDATE order_feedback
          SET testimonial_text = ?2, testimonial_name = ?3, testimonial_consent = 1,
              updated_at = datetime('now')
        WHERE order_id = ?1`
    ).bind(orderId, body, String(name || '').trim().slice(0, 120) || null).run();
    return true;
  } catch (err) {
    console.error('[feedback] testimonial niet opgeslagen voor bestelling', orderId, '—', err && err.message);
    return false;
  }
}

/* ── DE OPMAAK ───────────────────────────────────────────────────────────────
 *
 * Losse HTML met eigen `fb-`-klassen in public/feedback.css, en dat bestand wordt
 * door BEIDE pagina's ingeladen. De reden is prozaïsch: account.css en portal.css
 * hebben geen gedeelde componentklassen — portal.css kent `.card` niet en `.meta`
 * alleen binnen `.shot` — maar ze definiëren wél dezelfde tokens. Eén stylesheet
 * die alleen op tokens leunt, werkt daarmee in beide zonder dat er iets
 * gedupliceerd wordt.
 */

/** De sterrenrij. Radio's in een formulier: werkt zonder JavaScript, en één klik verstuurt. */
function scoreRow(t, action, hidden) {
  const stars = Array.from({ length: SCORE_MAX }, (_, i) => {
    const n = i + 1;
    return `<button class="fb-star" type="submit" name="score" value="${n}"
      aria-label="${esc(t.scoreLabel(n))}"><span aria-hidden="true">${n}</span></button>`;
  }).join('');
  return `<form class="fb-scores" method="post" action="${esc(action)}">
    ${hidden}<input type="hidden" name="fb" value="score">
    <span class="fb-scale">${esc(t.scoreLow)}</span>
    <span class="fb-stars">${stars}</span>
    <span class="fb-scale">${esc(t.scoreHigh)}</span>
  </form>`;
}

/**
 * De twee platformknoppen.
 *
 * ÉÉN FUNCTIE VOOR BEIDE SCORES. Zie de noot bovenaan dit bestand: het verschil
 * tussen een advies en review gating is of een ontevreden klant deze knoppen nog
 * ziet. Door ze uit dezelfde functie te halen kan een latere wijziging ze niet
 * voor de ene groep dichtzetten en voor de andere niet.
 *
 * Het is een POST en geen gewone link, omdat de klik geregistreerd moet worden
 * (zie savePlatformClick). `target="_blank"` op het formulier: de review opent in
 * een nieuw tabblad — §2 vraagt dat letterlijk — en de bestelpagina blijft staan
 * waar hij stond. `rel="noopener"` hoort daarbij; zonder dat krijgt het nieuwe
 * tabblad een verwijzing naar dit venster.
 */
/*
 * ── DE VERHOUDING WAS FOUT — 10 AUGUSTUS 2026 ───────────────────────────────
 *
 * Lucas op een telefoonschermafdruk: "zorg dat alles een in verhouding is, sommige knoppen
 * zijn veel te groot bijvoorbeeld." Wat hij zag: twee volle accentgroene knoppen,
 * "REVIEW ON GOOGLE" en "REVIEW ON TRUSTPILOT", elk bijna de volle schermbreedte, onder
 * elkaar, in een blok dat er zelf boven zegt *"Everything below is optional."*
 *
 * Dat is de hiërarchie precies omgedraaid. De accentvulling is op dit dashboard het teken
 * van DE handeling die de bestelling verder brengt — "Nu betalen", "Download de map". Twee
 * optionele verzoeken in datzelfde gewicht schreeuwen harder dan de knop die geld
 * verplaatst, en dat maakt niet alleen de kaart onrustig maar de betaalknop minder
 * vindbaar.
 *
 * DRIE DINGEN VERANDERD, EN GEEN VIERDE.
 *
 * 1 · Ze zijn ghost + klein geworden, altijd. De `small`-optie bestond al en werd op de
 *     ene plek gebruikt en op de andere niet — dat verschil was geen keuze maar een
 *     omissie, dus is de optie weg en is er één vorm.
 * 2 · Het label is alleen nog de platformnaam. "Review op Google" herhaalde de kop die er
 *     twee regels boven staat ("Wil je dat ergens zeggen?"), en die herhaling was precies
 *     wat de knop zo breed maakte dat er geen tweede naast paste.
 * 3 · Ze staan nu naast elkaar in plaats van onder elkaar; zie .fb-actions in account.css.
 *
 * WAT NIET IS AANGERAAKT: dat het een POST is, dat hij in een nieuw tabblad opent en dat
 * de klik geregistreerd wordt. Dat is de werking, en die was niet het probleem.
 */
function platformButtons(t, action, hidden, clicked) {
  return REVIEW_PLATFORMS.map((p) => `<form method="post" action="${esc(action)}" target="_blank" rel="noopener">
    ${hidden}<input type="hidden" name="fb" value="click">
    <input type="hidden" name="platform" value="${esc(p.id)}">
    <button class="btn btn-ghost btn-sm" type="submit">${esc(p.name)}</button>
  </form>`).join('') + (clicked.length ? '' : `<span class="fb-hint">${esc(t.platformNote)}</span>`);
}

/** Het testimonialformulier. */
function quoteForm(t, action, hidden, fb) {
  if (fb?.testimonial_consent) {
    return `<p class="fb-thanks">${esc(t.quoteThanks)}</p>`;
  }
  return `<form class="fb-quote" method="post" action="${esc(action)}">
    ${hidden}<input type="hidden" name="fb" value="quote">
    <h4>${esc(t.quoteH)}</h4>
    <textarea name="quote" rows="3" placeholder="${esc(t.quotePlaceholder)}" maxlength="1200" required></textarea>
    <input type="text" name="quote_name" placeholder="${esc(t.quoteName)}" maxlength="120" autocomplete="organization">
    <label class="fb-check">
      <input type="checkbox" name="quote_consent" value="1" required>
      <span>${esc(t.quoteConsent)}</span>
    </label>
    <p class="fb-hint">${esc(t.quoteConsentNote)}</p>
    <button class="btn btn-ghost fb-btn-sm" type="submit">${esc(t.quoteSend)}</button>
  </form>`;
}

/**
 * Het hele blok, in de toestand waarin deze bestelling nu staat.
 *
 * @param {object} o
 * @param {'nl'|'en'} o.lang
 * @param {string} o.action   waar de formulieren naartoe posten
 * @param {string} [o.hidden] extra verborgen velden die de aanroeper nodig heeft
 *   (het portaal heeft niets nodig — de token staat in de URL; VISUAILS Studio
 *   stuurt het bestelnummer mee)
 * @param {object|null} o.feedback  de rij uit order_feedback, of null
 * @returns {string} html, of '' als er niets te vragen is
 */
export function feedbackBlock({ lang = 'nl', action, hidden = '', feedback = null }) {
  const t = COPY[lang === 'en' ? 'en' : 'nl'];
  const fb = feedback;
  const clicked = parsePlatforms(fb?.platforms_clicked);

  // ── NOG NIETS GEVRAAGD: alleen de vraag ───────────────────────────────────
  if (!fb || !fb.score) {
    return `<section class="fb" aria-labelledby="fb-h">
      <h3 id="fb-h">${esc(t.askH)}</h3>
      <p class="fb-lede">${esc(t.askLede)}</p>
      ${scoreRow(t, action, hidden)}
    </section>`;
  }

  const score = Number(fb.score) || 0;
  const high = score >= SCORE_HIGH;

  // Terug naar de vraag. Een score is een mening en die mag veranderen; hem
  // vastzetten na één klik betekent dat een mis-tik voor altijd in de cijfers
  // staat. Zelfde argument als de undo op een goedgekeurd beeld in portal.js.
  const again = `<form class="fb-again" method="post" action="${esc(action)}">
    ${hidden}<input type="hidden" name="fb" value="reset">
    <button class="btn-quiet" type="submit">${esc(t.changeScore)}</button>
  </form>`;

  const head = `<h3 id="fb-h">${esc(t.done)}</h3>
    <p class="fb-lede"><span class="fb-given">${esc(t.scoreLabel(score))}</span></p>`;

  // ── HOGE SCORE: de drie acties naast elkaar ───────────────────────────────
  if (high) {
    return `<section class="fb" aria-labelledby="fb-h">
      ${head}
      <div class="fb-share">
        <h4>${esc(t.shareH)}</h4>
        <p class="fb-lede">${esc(t.shareLede)}</p>
        <div class="fb-actions">${platformButtons(t, action, hidden, clicked)}</div>
      </div>
      ${quoteForm(t, action, hidden, fb)}
      ${again}
    </section>`;
  }

  // ── LAGE SCORE: eerst oplossen, en de knoppen blijven staan ───────────────
  //
  // De volgorde is het advies; het weglaten zou het filter zijn. Zie de noot
  // bovenaan dit bestand over waarom dat onderscheid juridisch en niet cosmetisch
  // is.
  const fix = fb.private_note
    ? `<p class="fb-thanks">${esc(t.fixThanks)}</p>`
    : `<form class="fb-fix" method="post" action="${esc(action)}">
        ${hidden}<input type="hidden" name="fb" value="note">
        <h4>${esc(t.fixH)}</h4>
        <p class="fb-lede">${esc(t.fixLede)}</p>
        <textarea name="note" rows="3" placeholder="${esc(t.fixPlaceholder)}" maxlength="2000" required></textarea>
        <button class="btn btn-primary" type="submit">${esc(t.fixSend)}</button>
      </form>`;

  return `<section class="fb" aria-labelledby="fb-h">
    ${head}
    ${fix}
    <div class="fb-also">
      <h4>${esc(t.alsoH)}</h4>
      <p class="fb-lede">${esc(t.alsoLede)}</p>
      <div class="fb-actions">${platformButtons(t, action, hidden, clicked)}</div>
    </div>
    ${again}
  </section>`;
}

/*
 * ═══════════════════════════════════════════════════════════════════════════════
 * EEN LAGE SCORE MOET BIJ EEN MENS TERECHTKOMEN
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Het scherm zegt tegen de klant: *"Dit komt alleen bij ons terecht. Vertel wat er
 * niet klopte, dan kijken we ernaar."* Zonder deze mail was dat een halve
 * waarheid — het kwam wel bij ons terecht, in een kolom die niemand opent.
 *
 * ── TWEE MOMENTEN, EN ALLEBEI ZIJN ZE NIEUW ─────────────────────────────────
 *
 * Er gaat een bericht uit als de SCORE laag wordt, en nog een als er een NOTITIE
 * bij komt. Dat zijn geen twee meldingen van hetzelfde: een 2 zonder uitleg is nog
 * steeds een 2 — dat argument staat al in migratie 0020, bij de reden dat
 * `private_note` leeg mag zijn — en het is precies het geval waarin jij degene
 * bent die moet bellen, omdat de klant je niets gaat schrijven.
 *
 * ── EN ALLEBEI PRECIES ÉÉN KEER ─────────────────────────────────────────────
 *
 * Zonder een kolom om dat in bij te houden, want die zou een nieuwe migratie
 * kosten voor iets wat de bestaande gegevens al weten:
 *   · de score mailt alleen als hij VERANDERT (saveScore geeft dat terug),
 *     dus dezelfde 2 nog eens opsturen doet niets;
 *   · de notitie mailt alleen als hij NIEUW is (de eerste wint, zie saveNote).
 *
 * ── BEST EFFORT, EN DAT IS HIER GEEN LUIHEID ────────────────────────────────
 *
 * Mislukt de mail, dan is de klant zijn antwoord niet kwijt: het staat in
 * `order_feedback` en je ziet het in het adminportaal. Andersom zou wél schade
 * opleveren — een klant die zijn klacht typt, op versturen drukt en een foutpagina
 * krijgt omdat Resend het even niet deed, is een klant die twee keer boos is.
 */
async function notifyStudio(env, { orderId, kind, score, note }) {
  try {
    if (!env?.RESEND_API_KEY) return;
    const to = env.NOTIFY_EMAIL || 'hello@visuails.com';

    // De bestelling erbij, zodat de mail bruikbaar is zonder eerst te zoeken.
    let order = null;
    try {
      order = await env.DB.prepare(
        'SELECT ref, service, email, brand, first_name, last_name, name, lang FROM orders WHERE id = ?1'
      ).bind(orderId).first();
    } catch { /* dan zonder — de score is het bericht, niet de opmaak */ }

    const ref = order?.ref || `#${orderId}`;
    const who = order?.brand
      || [order?.first_name, order?.last_name].filter(Boolean).join(' ')
      || order?.name || order?.email || '—';

    const subject = kind === 'note'
      ? `Klacht bij ${ref} — ${score}/${SCORE_MAX}`
      : `Lage score bij ${ref} — ${score}/${SCORE_MAX}`;

    const body = [
      h1(kind === 'note' ? 'Een klant heeft uitgelegd wat er misging' : 'Een klant is niet tevreden', ref),
      mailRows([
        ['Score', `${score} / ${SCORE_MAX}`],
        ['Bestelling', ref],
        ['Klant', who],
        ['E-mail', order?.email || ''],
        ['Dienst', order?.service || ''],
      ]),
      note ? mailQuote(String(note).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c])).replace(/\n/g, '<br>')) : '',
      mailP(kind === 'note'
        ? 'Het scherm heeft beloofd dat we ernaar kijken. Reageer op deze mail of bel ze.'
        : 'Er staat nog geen uitleg bij. Juist dan is bellen het snelst — wie een 1 of 2 geeft en niets typt, gaat je meestal ook niets schrijven.',
        { top: 16 }),
      mailNote('Dit antwoord is privé. Het staat nergens op de site en gaat naar geen enkel reviewplatform.'),
    ].join('');

    await sendMail(env, {
      to,
      subject,
      html: shell({ lang: 'nl', preheader: `${who} gaf ${score} van ${SCORE_MAX} op ${ref}.`, body }),
    });
  } catch (err) {
    console.error('[feedback] melding niet verstuurd voor bestelling', orderId, '—', err && err.message);
  }
}

/**
 * Eén POST op het blok verwerken, welke van de vier het ook is.
 *
 * Beide aanroepers hebben dezelfde vier gevallen, dus staan ze hier en niet twee
 * keer. De aanroeper doet zijn eigen autorisatie — is dit jouw bestelling — en
 * geeft daarna alleen door wat er is ingevuld.
 *
 * @returns {Promise<{ok: boolean, redirect: string|null, redirectName?: string|null}>}
 *   `redirect` is de url waar een platformknop naartoe moet, met `redirectName`
 *   als de naam die de tussenpagina noemt; bij de andere acties is `redirect`
 *   null, want die blijven op de pagina.
 */
export async function handleFeedbackPost(env, { orderId, customerId, form }) {
  const kind = String(form.get('fb') || '');

  if (kind === 'score') {
    const res = await saveScore(env, orderId, customerId, form.get('score'));
    // Alleen bij een score die de klant naar het privéformulier stuurt, en alleen
    // als hij verandert. Een 4 of 5 hoeft niemand te wekken.
    if (res.ok && res.changed && res.score < SCORE_HIGH) {
      await notifyStudio(env, { orderId, kind: 'score', score: res.score });
    }
    return { ok: true, redirect: null };
  }

  if (kind === 'note') {
    const isNew = await saveNote(env, orderId, form.get('note'));
    if (isNew) {
      const row = await loadFeedback(env, orderId);
      await notifyStudio(env, {
        orderId, kind: 'note', score: row?.score ?? '?', note: row?.private_note,
      });
    }
    return { ok: true, redirect: null };
  }

  if (kind === 'quote') {
    await saveTestimonial(env, orderId, {
      text: form.get('quote'),
      name: form.get('quote_name'),
      consent: form.get('quote_consent') === '1',
    });
    return { ok: true, redirect: null };
  }

  if (kind === 'click') {
    const [id] = parsePlatforms(form.get('platform'));
    if (!id) return { ok: false, redirect: null };
    await savePlatformClick(env, orderId, id);
    const p = REVIEW_PLATFORMS.find((x) => x.id === id);
    /*
     * `redirectName` gaat mee omdat de aanroeper geen tussenpagina kan schrijven
     * die "Doorsturen naar Google" zegt zonder te weten dat dit Google is — en de
     * enige andere manier om dat te weten is de url terugzoeken in
     * REVIEW_PLATFORMS, wat een tweede plek is waar dezelfde lijst gelezen wordt.
     * Waarom die tussenpagina er is en waarom een 303 hier niet kan: zie de kop
     * van offsite.js.
     */
    return { ok: true, redirect: p ? p.url : null, redirectName: p ? p.name : null };
  }

  if (kind === 'reset') {
    /*
     * Terug naar de vraag. Alleen de SCORE gaat weg, niet de rij: een
     * privénotitie die je al hebt gestuurd is verstuurd, en die onder je weg
     * halen omdat je je cijfer wilt bijstellen zou betekenen dat wij hem al
     * gelezen hebben en jij denkt dat hij nooit is aangekomen.
     *
     * score is NOT NULL met een CHECK tussen 1 en 5, dus "geen score" bestaat
     * niet in het schema — met opzet, zie migratie 0020. De rij verdwijnt dus
     * helemaal als er verder niets in staat, en anders blijft hij met de oude
     * score staan tot er een nieuwe komt.
     */
    try {
      await env.DB.prepare(
        `DELETE FROM order_feedback
          WHERE order_id = ?1
            AND private_note IS NULL
            AND testimonial_text IS NULL
            AND platforms_clicked IS NULL`
      ).bind(orderId).run();
    } catch (err) {
      console.error('[feedback] terugzetten mislukt voor bestelling', orderId, '—', err && err.message);
    }
    return { ok: true, redirect: null };
  }

  return { ok: false, redirect: null };
}
