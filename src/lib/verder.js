/* ── "ZO GAAT HET VERDER" — ÉÉN BLOK, VIER PLEKKEN — 8 oktober 2026 ──────────
 * (punten 1.05, 7.01 en 7.02)
 *
 * Na het bestellen en na het betalen hoort de klant bewust niets tot de
 * levering (overzicht §21: geen mail bij een statuswissel). Stilte is alleen een
 * probleem als de klant hem niet verwacht. Dit blok zegt het vooraf, in drie
 * regels: we kijken je foto's na, wanneer de beelden komen, en dat er tot de
 * levering niets meer komt — behalve als er iets mis is.
 *
 * Het staat op vier plekken: de bedankpagina (ThankYouPage.astro), de betaalmail
 * (invoiceMail.js, en de terugval in cancelMail.js), de bestelmail
 * (customerEmail() in functions/api/order.js) en de bevestiging van een
 * bestelling die met tegoed of credits betaald is. Stond het vier keer met de
 * hand, dan zei de mail "zo snel mogelijk" terwijl de pagina een datum noemde.
 * Daarom staan de zinnen hier en nergens anders, en komt de levertijd uit
 * turnaround() en voorrangZin() in pricing.js: nooit een getypte termijn.
 *
 * Geen DOM en geen database: de Worker, de cron, het mailscript en de Astro-
 * pagina laden dit bestand allemaal.
 */
import { turnaround, voorrangZin, heeftVoorrang } from '../data/pricing.js';
import { esc, p as mailP, datum as mailDatum } from './mailTemplate.js';

/* De levertijdzin uit pricing.js, als bijzin: "zo snel mogelijk (vaak binnen
   een dag, soms een paar dagen)". Eerste letter klein, punt eraf. */
const bijzin = (zin) => {
  const s = String(zin || '').trim().replace(/[.]+$/, '');
  return s.charAt(0).toLowerCase() + s.slice(1);
};

const T = {
  nl: {
    kop: 'Zo gaat het verder',
    fotos: 'We kijken eerst je foto’s na. Ontbreekt er iets, dan laten we het je weten.',
    ontbreekt: 'Er ontbreken nog foto’s:',
    ontbreektNa: 'Voeg ze toe bij deze bestelling in VISUAILS Studio (log in met dit e-mailadres), dan beginnen we met alles compleet.',
    zsm: () => `We leveren je beelden ${bijzin(turnaround('unattended', 'nl'))}, en we kijken elk beeld na voordat het bij je komt.`,
    datum: (d) => `We maken je beelden op je leverdatum: ${d}. We kijken elk beeld na voordat het bij je komt.`,
    datumVolgt: 'Je leverdatum staat nog niet vast; die spreken we met je af. We kijken elk beeld na voordat het bij je komt.',
    voorrang: () => `${voorrangZin('nl')}. We kijken elk beeld na voordat het bij je komt.`,
    /* Afvinklijst 22 (Lucas, 14 oktober 2026): de stilte tot de levering mag niet lezen als "je staat er
       alleen voor". Dus "mailen we pas weer" (geen statusmails, overzicht §21) in plaats van "hoor je pas weer van
       ons"; wij melden ons als er iets mis is of als we twijfelen, en de klant mag tussendoor altijd. */
    /* Afvinklijst 27 (k-bedank, "de tekst mag compacter"): dezelfde drie dingen in minder woorden. */
    stil: 'behalve als er iets mis is of als we twijfelen: dan nemen we contact met je op. Een vraag of nog een foto? App of mail ons gerust.',
    factuur: {
      bijgevoegd: 'Je krijgt weer een mail als je beelden klaarstaan. Tot dan sturen we niets —',
      volgt: 'Je factuur komt zo in je mail. Daarna mailen we pas weer als je beelden klaarstaan —',
      'na-factuur': 'Na de factuur mailen we pas weer als je beelden klaarstaan —',
      'na-betaling': 'Zodra je betaling binnen is, krijg je de factuur per mail. Daarna mailen we pas weer als je beelden klaarstaan —',
      /* Betaald met abonnementscredits (ronde B, 8 oktober 2026): de
         termijnfactuur is de factuur, er komt geen tweede. */
      credits: 'Er komt geen aparte factuur: je termijnfactuur dekt deze bestelling. We mailen pas weer als je beelden klaarstaan —',
    },
    /* Twee dagen achter elkaar: "woensdag 14 en donderdag 15 oktober" leest als
       één afspraak; verder uit elkaar wordt het "tot en met". */
    en: 'en',
    totEnMet: 'tot en met',
  },
  en: {
    kop: 'What happens next',
    fotos: 'We check your photos first. If anything is missing, we let you know.',
    ontbreekt: 'Some photos are still missing:',
    ontbreektNa: 'Add them to this order in VISUAILS Studio (sign in with this email address), so we start with everything complete.',
    zsm: () => `We deliver your order ${bijzin(turnaround('unattended', 'en'))}, and we check every image before it reaches you.`,
    datum: (d) => `We make your images on your delivery date: ${d}. We check every image before it reaches you.`,
    datumVolgt: 'Your delivery date is not fixed yet; we agree it with you. We check every image before it reaches you.',
    voorrang: () => `${voorrangZin('en')}. We check every image before it reaches you.`,
    stil: 'unless something is wrong or we’re unsure: then we get in touch with you. A question or another photo? Just message or email us.',
    factuur: {
      bijgevoegd: 'You get another email when your images are ready. Until then we send nothing —',
      volgt: 'Your invoice is on its way by email. After that we only email again when your images are ready —',
      'na-factuur': 'After the invoice we only email again when your images are ready —',
      'na-betaling': 'As soon as your payment is in, you get the invoice by email. After that we only email again when your images are ready —',
      credits: 'There is no separate invoice: your plan invoice covers this order. We only email again when your images are ready —',
    },
    en: 'and',
    totEnMet: 'to',
  },
};

const taal = (lang) => (lang === 'en' ? 'en' : 'nl');

/** De kop van het blok, voor wie hem los nodig heeft (de bedankpagina). */
export function verderKop(lang = 'nl') {
  return T[taal(lang)].kop;
}

/**
 * Welke leverregel hoort bij deze bestelling?
 *
 * @param {{ window_start?: string|null, window_end?: string|null, tier?: string|null, details_json?: string|object|null, details?: object|null }} order
 * @returns {{ soort: 'datum'|'voorrang'|'datum-volgt'|'zsm', van?: string, tot?: string }}
 */
export function leveringVan(order = {}) {
  const o = order || {};
  if (o.window_start) return { soort: 'datum', van: String(o.window_start), tot: String(o.window_end || o.window_start) };
  if (heeftVoorrang(o.details && typeof o.details === 'object' ? o.details : o)) return { soort: 'voorrang' };
  if (o.tier === 'attended') return { soort: 'datum-volgt' };
  return { soort: 'zsm' };
}

/* "woensdag 14 en donderdag 15 oktober" — de dag erbij, want een leverdatum
   plant iemand in zijn week. UTC, net als de poort die de dagen vastlegt. */
function dagNaam(iso, lang) {
  try {
    return new Intl.DateTimeFormat(lang === 'en' ? 'en-GB' : 'nl-NL', {
      weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC',
    }).format(new Date(`${String(iso).slice(0, 10)}T00:00:00Z`));
  } catch {
    return mailDatum(iso, lang);
  }
}

/** De gereserveerde dagen als leesbare tekst. */
export function leverdagen(van, tot, lang = 'nl') {
  const t = T[taal(lang)];
  if (!van) return '';
  const a = dagNaam(van, lang);
  if (!tot || String(tot).slice(0, 10) === String(van).slice(0, 10)) return a;
  const b = dagNaam(tot, lang);
  const dagen = Math.round((Date.parse(`${String(tot).slice(0, 10)}T00:00:00Z`) - Date.parse(`${String(van).slice(0, 10)}T00:00:00Z`)) / 86400000);
  /* Zelfde maand: de maand één keer, "woensdag 14 en donderdag 15 oktober". */
  const zelfdeMaand = String(van).slice(0, 7) === String(tot).slice(0, 7);
  const eerste = zelfdeMaand ? a.replace(/\s+\S+$/, '') : a;
  return `${eerste} ${dagen === 1 ? t.en : t.totEnMet} ${b}`;
}

/** De tweede regel: wanneer de beelden komen. `datumTekst` gaat vóór van/tot. */
export function leverregel({ lang = 'nl', levering = { soort: 'zsm' }, datumTekst = '' } = {}) {
  const t = T[taal(lang)];
  const l = levering || { soort: 'zsm' };
  if (l.soort === 'datum') return t.datum(datumTekst || leverdagen(l.van, l.tot, lang));
  if (l.soort === 'voorrang') return t.voorrang();
  if (l.soort === 'datum-volgt') return t.datumVolgt;
  return t.zsm();
}

/** De derde regel: de factuur, en de stilte tot de levering. */
export function stilteRegel({ lang = 'nl', factuur = 'volgt' } = {}) {
  const t = T[taal(lang)];
  return `${t.factuur[factuur] || t.factuur.volgt} ${t.stil}`;
}

/**
 * Het hele blok als platte tekst: een kop en drie (of vier) regels.
 *
 * @param {object} o
 * @param {'nl'|'en'} o.lang
 * @param {{soort: string, van?: string, tot?: string}} [o.levering]  uit leveringVan()
 * @param {'bijgevoegd'|'volgt'|'na-factuur'|'na-betaling'|'credits'} [o.factuur]
 *   bijgevoegd   de betaalmail: de factuur zit erbij
 *   volgt        betaald, de factuurmail is onderweg (bedankpagina, tegoed)
 *   na-factuur   de bestelmail: de regel erboven zegt al dat de factuur komt
 *   na-betaling  nog niet betaald (bedankpagina "opnieuw betalen", btw-controle)
 *   credits      betaald met abonnementscredits: geen aparte factuur
 * @param {string[]|null} [o.ontbreekt]  regels uit ontbrekendRegels(); leeg of null = geen regel
 * @returns {{ kop: string, regels: string[], ontbreekt: string[] }}
 */
export function zoGaatHetVerder({ lang = 'nl', levering = { soort: 'zsm' }, factuur = 'volgt', ontbreekt = null, datumTekst = '' } = {}) {
  const t = T[taal(lang)];
  return {
    kop: t.kop,
    regels: [t.fotos, leverregel({ lang, levering, datumTekst }), stilteRegel({ lang, factuur })],
    ontbreekt: Array.isArray(ontbreekt) ? ontbreekt.filter(Boolean) : [],
  };
}

/* ── IN EEN MAIL ────────────────────────────────────────────────────────────
   Een kop in vet en drie genummerde regels als gewone alinea's: een <ol> krijgt
   in Outlook en Gmail elk een eigen inspringing, en een nummer dat de lezer ziet
   staan is hier alles wat een lijst moet doen. De ontbrekende foto's staan
   direct onder de regel over het nakijken, waar ze bij horen. */
const NUM = (n) => `<span style="display:inline-block;min-width:18px;font-weight:700;color:#3D17D6">${n}.</span>`;

/**
 * Het blok als mail-HTML (mailTemplate-blokken).
 * @param {Parameters<typeof zoGaatHetVerder>[0]} opts
 */
export function verderBlokHtml(opts = {}) {
  const lang = taal(opts.lang);
  const t = T[lang];
  const b = zoGaatHetVerder({ ...opts, lang });
  const delen = [mailP(`<strong>${esc(b.kop)}</strong>`, { top: 18, bottom: 6 })];
  b.regels.forEach((regel, i) => {
    const laatste = i === b.regels.length - 1;
    delen.push(mailP(`${NUM(i + 1)} ${esc(regel)}`, { bottom: laatste ? 18 : 6 }));
    if (i === 0 && b.ontbreekt.length) {
      /* Ingesprongen onder regel 1, waar hij bij hoort. */
      delen.push(`<div style="padding-left:22px">${mailP(
        `<strong>${esc(t.ontbreekt)}</strong><br>${b.ontbreekt.map((r) => esc(r)).join(' <br>')} <br>${esc(t.ontbreektNa)}`,
        { bottom: 6 },
      )}</div>`);
    }
  });
  return delen.join('');
}
