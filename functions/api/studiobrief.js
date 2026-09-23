// VISUAILS — POST /api/studiobrief: aanmelden voor de Studiobrief. 23 sep 2026.
//
// ── WAT DIT IS ─────────────────────────────────────────────────────────────
//
// Lucas: *"Niemand vangt de bezoeker op die vandaag niet bestelt."* Negen van de
// tien bezoekers klikken weg zonder te bestellen, en de site had geen enkele
// manier om die persoon ooit nog te bereiken. Zijn keuze: een Studiobrief,
// *hooguit één mail per maand* — nieuwe looks en wat er verandert. Met de
// uitdrukkelijke eis dat het niet "te sales-achtig" wordt: VISUAILS verkoopt
// aan bedrijven, en een merk wil geen nieuwsbrief, het wil weten wat er nieuw is.
//
// ── WAAROM EEN EIGEN EINDPUNT EN NIET `service=subscribe` OP /api/order ────
//
// Die tak bestond (de fotogids-checklist), maar hij zat ná de controle op het
// telefoonnummer, dat sinds 11 september op elk formulier behalve /contact
// verplicht is. Een aanmelding met alleen een e-mailadres kwam er dus nooit
// doorheen: dode code. En /api/order is het bestelpad — tien beslissingen over
// btw, betaling en capaciteit waar een e-mailadres niets mee te maken heeft.
// Eén veld verdient één eindpunt dat je in één keer kunt lezen.
//
// ── WAT ER GEBEURT ─────────────────────────────────────────────────────────
//
//   1  Ratelimit (5 per 10 minuten per IP), honeypot, e-mailvorm.
//   2  Een rij in `subscribers` — dat is het TOESTEMMINGSBEWIJS: wie, wanneer,
//      waar op de site. De taal zit in `source` ("studiobrief-voet-nl"), zodat
//      er geen migratie nodig is voor één woord.
//   3  Een contact in Resend, als RESEND_API_KEY er is. Resend is waar de brief
//      vandaan gaat en waar afmelden gebeurt (de link onderaan elke broadcast).
//      Staan RESEND_SEGMENT_NL / RESEND_SEGMENT_EN in de omgeving, dan komt het
//      contact in het segment van zijn taal. Zonder die twee komt hij in de
//      algemene contactlijst en kun je hem daar later indelen.
//   4  Eén welkomstmail in de taal van de pagina, en één regel naar de studio.
//
// Nooit een foutpagina: een mislukte mail of een haperende database mag de
// bezoeker niet zien. Alles wat mis kan gaan staat in safe(), en de bezoeker
// komt altijd terug op de pagina waar hij stond.
//
// ── GEEN JS NODIG ──────────────────────────────────────────────────────────
//
// Zonder JavaScript post het formulier gewoon en komt de bezoeker terug op
// dezelfde pagina met `#brief-ok-<bron>`: het bevestigingsregeltje staat al in
// de HTML en wordt met :target zichtbaar. Met JavaScript post Studiobrief.astro
// met mode=json en wisselt het blok zonder te herladen.

import { checkRate, clientIp, shouldSweep, sweepRateLimits } from '../../src/lib/ratelimit.js';
import { sendMail } from '../../src/lib/mail.js';
import { shell, h1, p, rows, esc } from '../../src/lib/mailTemplate.js';

/** De plekken op de site waar het veld staat. Iets anders is geen bron maar invoer. */
export const BRONNEN = ['voet', 'gidsen', 'editions'];

async function safe(fn) { try { return await fn(); } catch (e) { console.error('[studiobrief]', e && e.message ? e.message : e); } }
function isEmail(s) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s) && s.length <= 254; }
function json(body, status = 200, extra = {}) {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...extra } });
}
function redirect(location) { return new Response(null, { status: 303, headers: { Location: location } }); }

/** Terug naar de pagina waar het formulier stond — alleen als die van onszelf is. */
export function terugNaar(request, lang, anker) {
  let pad = lang === 'nl' ? '/nl/' : '/';
  try {
    const ref = request.headers.get('Referer');
    if (ref) {
      const u = new URL(ref);
      if (u.origin === new URL(request.url).origin && u.pathname.startsWith('/') && !u.pathname.startsWith('//')) pad = u.pathname + u.search;
    }
  } catch { /* geen bruikbare Referer: naar de voorpagina van de taal */ }
  return `${pad}#${anker}`;
}

/** De welkomstmail. Kort, zonder aanbieding: hij bevestigt wat je net deed. */
export function welkomMail(lang) {
  const nl = lang === 'nl';
  return shell({
    lang,
    preheader: nl ? 'Je staat op de lijst. Hooguit één mail per maand.' : 'You are on the list. One email a month, at most.',
    body: [
      h1(nl ? 'Je staat op de lijst' : 'You are on the list'),
      p(nl ? 'Hoi,' : 'Hi,'),
      p(esc(nl
        ? 'Dank je. Je krijgt de Studiobrief van VISUAILS: hooguit één mail per maand, met de nieuwe looks en wat er bij ons verandert. Geen acties, geen kortingscodes.'
        : 'Thank you. You will get the VISUAILS Studio letter: one email a month at most, with the new looks and what changes on our side. No promotions, no discount codes.')),
      p(esc(nl
        ? 'Afmelden kan onderaan elke brief, met één klik. Heb je je niet zelf aangemeld, dan hoef je niets te doen: antwoord op deze mail en we halen je adres weg.'
        : 'You can unsubscribe at the bottom of every letter, in one click. If you did not sign up yourself, you need not do anything: reply to this email and we remove your address.'), { muted: true }),
      p(esc(nl ? '— Lucas, VISUAILS' : '— Lucas, VISUAILS')),
    ].join(''),
  });
}

export async function onRequestPost(context) {
  const { request, env, waitUntil } = context;

  let form;
  try { form = await request.formData(); } catch { form = new FormData(); }
  const get = (k) => { const v = form.get(k); return typeof v === 'string' ? v.trim() : ''; };
  const lang = get('lang') === 'nl' ? 'nl' : 'en';
  const bron = BRONNEN.includes(get('bron')) ? get('bron') : 'voet';
  const wantsJson = get('mode') === 'json';
  const ok = () => (wantsJson ? json({ ok: true }) : redirect(terugNaar(request, lang, `brief-ok-${bron}`)));
  const fout = (code, status = 400) => (wantsJson ? json({ ok: false, error: code }, status) : redirect(terugNaar(request, lang, `brief-fout-${bron}`)));

  const rate = await checkRate(env, { ip: clientIp(request), action: 'studiobrief', limit: 5, windowSeconds: 600 });
  if (shouldSweep() && typeof waitUntil === 'function') waitUntil(sweepRateLimits(env));
  if (!rate.allowed) return fout('rate', 429);

  // Honeypot: een veld dat een mens niet ziet. Een bot vult het in en krijgt
  // gewoon "gelukt" te zien — anders leert hij het verschil.
  if (get('website_hp')) return ok();

  const email = get('email').toLowerCase();
  if (!isEmail(email)) return fout('email');

  const bronLabel = `studiobrief-${bron}-${lang}`;
  let nieuw = true;
  await safe(async () => {
    if (!env.DB) return;
    const r = await env.DB
      .prepare('INSERT INTO subscribers (email, source) VALUES (?1, ?2) ON CONFLICT(email) DO NOTHING')
      .bind(email, bronLabel).run();
    nieuw = Boolean(r?.meta?.changes);
  });

  await safe(async () => {
    if (!env.RESEND_API_KEY) return;
    const segment = lang === 'nl' ? env.RESEND_SEGMENT_NL : env.RESEND_SEGMENT_EN;
    const body = { email, unsubscribed: false };
    if (segment) body.segments = [{ id: String(segment) }];
    const res = await fetch('https://api.resend.com/contacts', {
      method: 'POST',
      headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    // Bestaat het contact al, dan is dat geen fout: hij stond er al op.
    if (!res.ok && res.status !== 409 && res.status !== 422) {
      console.error(`[studiobrief] Resend-contact niet aangemaakt (${res.status}) voor ${bronLabel}`);
    }
  });

  // Alleen bij een NIEUWE aanmelding een welkomstmail: wie twee keer op de knop
  // drukt, of zich een maand later nog eens aanmeldt, krijgt er niet elke keer één.
  if (nieuw) {
    await safe(() => sendMail(env, {
      to: email,
      subject: lang === 'nl' ? 'Je staat op de lijst voor de Studiobrief' : 'You are on the list for the Studio letter',
      html: welkomMail(lang),
    }));
    await safe(() => sendMail(env, {
      to: env.NOTIFY_EMAIL || 'hello@visuails.com',
      subject: `Studiobrief — ${email}`,
      html: shell({
        lang: 'nl',
        preheader: `Nieuwe aanmelding · ${email}`,
        body: h1('Nieuwe aanmelding voor de Studiobrief') + rows([
          ['E-mail', esc(email)],
          ['Taal', lang === 'nl' ? 'Nederlands' : 'Engels'],
          ['Waar', esc(bron)],
        ]),
      }),
    }));
  }

  return ok();
}

export function onRequestGet() {
  return new Response(null, { status: 303, headers: { Location: '/' } });
}
