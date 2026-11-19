// VISUAILS — OP MAAT: DE DRIE MAILS TUSSEN VERSTUREN EN OFFERTE. Levering 117 (17 november 2026, proefronde P5-07).
//
// Tot de offerte mailde de intake op maat niemand. De klant hoorde niet dat zijn aanvraag binnen was, en niet dat er een
// voorbeeld klaarstond; hij moest zelf terugkomen om te zien dat hij aan zet was. De studio hoorde niet dat de klant
// gereageerd had. Nu drie korte mails, met hetzelfde sjabloon als de andere klantmails (src/lib/mailTemplate.js):
//
//   1 · klant  "We hebben je aanvraag"            na verstuur()            (src/lib/opMaat.js)
//   2 · klant  "Je eerste voorbeeld staat klaar"   na zetVoorbeeldKlaar()   (src/lib/opMaatRondes.js)
//   3 · studio "Reactie op voorbeeld"              na reactieOpRonde()      (src/lib/opMaatRondes.js)
//
// De klant krijgt hem op het adres van zijn account, in de taal van de aanvraag. De studio krijgt hem op hetzelfde adres
// als de andere studiomeldingen (NOTIFY_EMAIL, anders hello@), altijd in het Nederlands, met de klant als antwoordadres.
//
// MISLUKKEN MAG NOOIT DE HANDELING RAKEN (zelfde afspraak als src/lib/notify.js). Elke functie zit in zijn eigen try en
// geeft alleen terug of er gemaild is: true als de mail de deur uit ging, false zonder RESEND_API_KEY of bij een fout.

import { sendMail } from './mail.js';
import { studioUrl } from './studioLink.js';
import { shell, h1, p, rows, button, terugval, vragen, greeting, kenmerk, quote, esc } from './mailTemplate.js';
import { DIENST_NAAM } from '../data/opMaat.js';
import { aanhefTekst } from './aanhef.js';

/* levering 119 (18 november 2026, proefronde A0-01): de aanhef uit het veld Voornaam ("Jan Willem" helemaal); zonder
   voornaam het oude gedrag, het eerste woord van de volle naam. */
const aanhef = (a, lang) => (String(a?.first_name || '').trim()
  ? esc(aanhefTekst(String(a.first_name).trim().replace(/\s+/g, ' '), lang === 'nl' ? 'nl' : 'en'))
  : greeting(a?.name, lang));

/** Het kenmerk van een aanvraag op maat, zoals de offerte het ook schrijft (src/lib/opMaatOfferte.js). */
export const kenmerkVan = (id) => `OM-${id}`;
const STUDIO_ADRES = (env) => env.NOTIFY_EMAIL || 'hello@visuails.com';
const leesJson = (s) => { try { return JSON.parse(s) || {}; } catch { return {}; } };

/** De aanvraag met de klant erbij: naam, merk, adres en taal. */
async function aanvraagMetKlant(env, id) {
  const r = await env.DB.prepare(`SELECT a.id, a.dienst, a.taal, a.inhoud_json, c.email, c.name, c.first_name, c.brand
    FROM maat_aanvragen a JOIN customers c ON c.id = a.customer_id WHERE a.id = ?`).bind(id).first();
  return r ? { ...r, inhoud: leesJson(r.inhoud_json) } : null;
}

/** Eén regel die zegt waar de aanvraag over gaat, in de woorden van de klant (de brief, kort). */
export function briefRegel(dienst, inhoud, lang = 'nl') {
  const nl = lang !== 'en';
  const i = inhoud || {};
  if (dienst === 'lifestyle') return (i.moment && i.moment.zin) || '';
  if (dienst === 'catalog') {
    const n = (i.soorten || []).length;
    return n ? (nl ? `${n} ${n === 1 ? 'soort product' : 'soorten producten'}` : `${n} ${n === 1 ? 'kind of product' : 'kinds of product'}`) : '';
  }
  if (i.idee === 'eigen') return i.eigenIdee || '';
  if (i.idee === 'ons') return nl ? 'Wij bedenken het idee, met jouw antwoorden.' : 'We come up with the idea, using your answers.';
  return '';
}

async function stuur(env, bericht) {
  try {
    await sendMail(env, bericht);
    return !!env.RESEND_API_KEY;
  } catch (e) {
    console.error('[op-maat] mail niet verstuurd —', bericht.subject, '—', e?.message || e);
    return false;
  }
}

/* ── 1 · klant: we hebben je aanvraag ─────────────────────────────────────────────────────────────────────── */

export function aanvraagOntvangenMail(a, origin) {
  const lang = a.taal === 'en' ? 'en' : 'nl';
  const nl = lang === 'nl';
  const dienst = (DIENST_NAAM[lang] || {})[a.dienst] || a.dienst;
  const ref = kenmerkVan(a.id);
  const link = studioUrl(origin, `/op-maat?id=${a.id}`, lang);
  const brief = briefRegel(a.dienst, a.inhoud, lang);
  return {
    subject: nl ? `We hebben je aanvraag — ${ref}` : `We have your request — ${ref}`,
    html: shell({
      lang,
      preheader: nl ? 'We maken eerst een voorbeeld. Je krijgt een mail als het klaarstaat.' : 'We make a preview first. You get an email when it is ready.',
      body: [
        h1(nl ? 'We hebben je aanvraag' : 'We have your request', kenmerk('aanvraag', ref, lang)),
        p(aanhef(a, lang)),
        p(nl ? `Je aanvraag voor <strong>${esc(dienst)}</strong> is binnen.` : `Your request for <strong>${esc(dienst)}</strong> is in.`),
        rows([
          [nl ? 'Aanvraag' : 'Request', esc(ref)],
          [nl ? 'Dienst' : 'Service', esc(dienst)],
          [a.dienst === 'lifestyle' ? (nl ? 'Je moment' : 'Your moment') : (nl ? 'Waar het over gaat' : 'What it is about'), brief ? esc(brief) : ''],
        ]),
        p(nl
          ? 'Wat nu? We maken eerst een voorbeeld. Dat is in neutrale kleuren en zonder je product: het laat de omgeving en het gevoel zien. Je krijgt een mail als het klaarstaat.'
          : 'What next? We make a preview first. It is in neutral colours and without your product: it shows the setting and the feel. You get an email when it is ready.'),
        p(nl ? 'Je betaalt niets tot je akkoord geeft op de offerte.' : 'You pay nothing until you accept the quote.'),
        button(link, nl ? 'Bekijk je aanvraag' : 'View your request'),
        terugval(link, lang, { top: 0 }),
        vragen(lang, ref, { aanvraag: true }),
      ].join(''),
    }),
  };
}

/** Na verstuur(): de bevestiging aan de klant. */
export async function mailAanvraagOntvangen(env, id, { origin } = {}) {
  try {
    const a = await aanvraagMetKlant(env, id);
    if (!a || !a.email) return false;
    return await stuur(env, { to: a.email, ...aanvraagOntvangenMail(a, origin) });
  } catch (e) {
    console.error('[op-maat] ontvangstmail niet gemaakt voor', id, '—', e?.message || e);
    return false;
  }
}

/* ── 2 · klant: je voorbeeld staat klaar ──────────────────────────────────────────────────────────────────── */

export function voorbeeldKlaarMail(a, ronde, origin) {
  const lang = a.taal === 'en' ? 'en' : 'nl';
  const nl = lang === 'nl';
  const dienst = (DIENST_NAAM[lang] || {})[a.dienst] || a.dienst;
  const ref = kenmerkVan(a.id);
  const link = studioUrl(origin, `/op-maat?id=${a.id}#om-ronde`, lang);
  const eerste = !(Number(ronde) > 1);
  const kop = eerste
    ? (nl ? 'Je eerste voorbeeld staat klaar' : 'Your first preview is ready')
    : (nl ? `Ronde ${ronde} van je voorbeeld staat klaar` : `Round ${ronde} of your preview is ready`);
  return {
    subject: `${kop} — ${ref}`,
    html: shell({
      lang,
      preheader: nl ? 'Kijk of het klopt en zeg wat anders moet.' : 'Check if it is right and tell us what should change.',
      body: [
        h1(kop, kenmerk('aanvraag', ref, lang)),
        p(aanhef(a, lang)),
        p(nl
          ? `Het voorbeeld voor <strong>${esc(dienst)}</strong> staat in Studio. Het is in neutrale kleuren en zonder je product. Het gaat om de omgeving en het gevoel.`
          : `The preview for <strong>${esc(dienst)}</strong> is in Studio. It is in neutral colours and without your product. It is about the setting and the feel.`),
        p(nl
          ? 'Zeg per beeld wat goed is en wat anders moet. Klopt alles? Dan maken we de offerte.'
          : 'Tell us per image what works and what should change. All good? Then we make the quote.'),
        button(link, nl ? 'Bekijk het voorbeeld' : 'View the preview'),
        terugval(link, lang, { top: 0 }),
        vragen(lang, ref, { aanvraag: true }),
      ].join(''),
    }),
  };
}

/** Na zetVoorbeeldKlaar(): de klant hoort dat hij aan zet is. */
export async function mailVoorbeeldKlaar(env, id, ronde, { origin } = {}) {
  try {
    const a = await aanvraagMetKlant(env, id);
    if (!a || !a.email) return false;
    return await stuur(env, { to: a.email, ...voorbeeldKlaarMail(a, ronde, origin) });
  } catch (e) {
    console.error('[op-maat] voorbeeldmail niet gemaakt voor', id, '—', e?.message || e);
    return false;
  }
}

/* ── 3 · studio: reactie op voorbeeld ─────────────────────────────────────────────────────────────────────── */

export function reactieStudioMail(a, { ronde, goed, notitie = '', beelden = { goed: 0, aanpassen: 0 } }, origin) {
  const ref = kenmerkVan(a.id);
  const wie = a.brand || a.name || a.email || '—';
  const link = `${String(origin || 'https://visuails.com').replace(/\/+$/, '')}/admin/op-maat/${a.id}`;
  const perBeeld = beelden.goed || beelden.aanpassen ? `${beelden.goed} goed, ${beelden.aanpassen} aanpassen` : '';
  return {
    subject: `Reactie op voorbeeld · ${ref}${goed ? ' · goed' : ''}`,
    html: shell({
      lang: 'nl',
      preheader: goed ? `${wie} vindt het voorbeeld goed. Jij maakt de offerte.` : `${wie} wil iets anders. Jij maakt de volgende ronde.`,
      body: [
        h1('Reactie op het voorbeeld', kenmerk('aanvraag', ref, 'nl')),
        rows([
          ['Klant', esc(wie)],
          ['E-mail', esc(a.email || '')],
          ['Dienst', esc(DIENST_NAAM.nl[a.dienst] || a.dienst)],
          ['Ronde', esc(String(ronde))],
          ['Besluit', goed ? 'Dit is goed: offerte maken' : 'Aanpassen: volgende ronde'],
          ['Per beeld', esc(perBeeld)],
        ]),
        notitie ? quote(esc(notitie).replace(/\n/g, '<br>')) : '',
        p(goed ? 'Jij bent aan zet: maak de offerte.' : 'Jij bent aan zet: zet de volgende ronde klaar.'),
        button(link, 'Open de aanvraag'),
      ].join(''),
    }),
  };
}

/** Na reactieOpRonde(): de studio hoort dat hij aan zet is. Naar NOTIFY_EMAIL (of hello@), antwoorden gaat naar de klant. */
export async function mailReactieStudio(env, id, reactie, { origin } = {}) {
  try {
    const a = await aanvraagMetKlant(env, id);
    if (!a) return false;
    return await stuur(env, { to: STUDIO_ADRES(env), replyTo: a.email || '', ...reactieStudioMail(a, reactie, origin) });
  } catch (e) {
    console.error('[op-maat] reactiemail niet gemaakt voor', id, '—', e?.message || e);
    return false;
  }
}

/* ── 4 · klant: je aanvraag is afgerond — levering 118 (17 november 2026, proefronde P5-09) ─────────────────────
   Zette de studio een betaalde aanvraag op Gesloten, dan verdween hij uit Studio zonder bericht. Nu een korte mail: de
   aanvraag is klaar, de bestelling loopt door onder Bestellingen. */
export function aanvraagAfgerondMail(a, orderRef, origin) {
  const lang = a.taal === 'en' ? 'en' : 'nl';
  const nl = lang === 'nl';
  const dienst = (DIENST_NAAM[lang] || {})[a.dienst] || a.dienst;
  const ref = kenmerkVan(a.id);
  const link = studioUrl(origin, '/orders', lang);
  return {
    subject: nl ? `Je aanvraag op maat is afgerond — ${ref}` : `Your custom request is completed — ${ref}`,
    html: shell({
      lang,
      preheader: nl ? 'Je bestelling loopt door. Je vindt hem in Studio.' : 'Your order carries on. You find it in Studio.',
      body: [
        h1(nl ? 'Je aanvraag is afgerond' : 'Your request is completed', kenmerk('aanvraag', ref, lang)),
        p(aanhef(a, lang)),
        p(nl
          ? `Je aanvraag voor <strong>${esc(dienst)}</strong> is afgerond. Je stijl staat vast en je aanbetaling is binnen.`
          : `Your request for <strong>${esc(dienst)}</strong> is completed. Your style is set and your deposit is in.`),
        rows([
          [nl ? 'Aanvraag' : 'Request', esc(ref)],
          [nl ? 'Bestelling' : 'Order', esc(orderRef || '')],
        ]),
        p(nl ? 'Je bestelling loopt gewoon door. Je volgt hem in Studio onder Bestellingen.' : 'Your order carries on as normal. You follow it in Studio under Orders.'),
        button(link, nl ? 'Naar je bestellingen' : 'To your orders'),
        terugval(link, lang, { top: 0 }),
        vragen(lang, ref, { aanvraag: true }),
      ].join(''),
    }),
  };
}

export async function mailAanvraagAfgerond(env, id, orderRef, { origin } = {}) {
  try {
    const a = await aanvraagMetKlant(env, id);
    if (!a || !a.email) return false;
    return await stuur(env, { to: a.email, ...aanvraagAfgerondMail(a, orderRef, origin) });
  } catch (e) {
    console.error('[op-maat] afrondmail niet gemaakt voor', id, '—', e?.message || e);
    return false;
  }
}
