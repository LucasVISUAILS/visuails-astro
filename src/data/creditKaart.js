/*
 * ═══════════════════════════════════════════════════════════════════════════════
 * DE CREDITKAART — 8 oktober 2026 (punt 6.01)
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * "Op /plans, /start/plan, in Studio en in stap 5 staat dezelfde creditkaart:
 * catalogset 4, carrousel 5, extra foto 2, 4K 1, video op aanvraag. Per plan en
 * achter elk saldo staat de vertaling (Pro: 30 catalogsets of 24 carrousels) in
 * plaats van '≈ producten'."
 *
 * Dit bestand is de inhoud van die kaart; src/components/CreditKaart.astro tekent
 * hem. Geen getal staat hier ingetypt: de credits komen uit SERVICE_CREDITS en
 * EXTRA_CREDITS in pricing.js. Geen DOM en geen database, dus ook bruikbaar in
 * Studio (account.js) en in de browser.
 *
 * ── WAAROM VIDEO GEEN GETAL KRIJGT ──────────────────────────────────────────
 * Video is op aanvraag (§2.4 van het overzicht). De videocredits blijven in
 * SERVICE_CREDITS staan voor een offerte die met credits betaald wordt; ze staan
 * alleen niet meer op de kaart.
 */
import { SERVICE_CREDITS, EXTRA_CREDITS, PLAN_CREDITS, BIJKOOP_PAKKETTEN, BIJKOOP_KORTING_PCT, BIJKOOP_MAX_PER_MAAND } from './pricing.js';
import { planName } from './planNames.js';

const T = {
  nl: {
    kop: 'Wat een credit oplevert',
    credits: 'credits',
    opAanvraag: 'op aanvraag',
    regels: {
      catalog: ['Catalogset', 'per product'],
      lifestyle: ['Lifestylecarrousel', 'per product'],
      photo: ['Extra foto', 'een extra hoek'],
      hires: ['4K', 'per carrousel'],
      video: ['Video', 'clips en hooks'],
    },
    /* De kernzin (6.01): het voordeel van credits bij kleine bestellingen. */
    kern: (n) => `Met een abonnement kost een catalogset altijd ${n} credits, ook als je er maar twee bestelt.`,
    vertaling: (cat, life) => `${cat} catalogset${cat === 1 ? '' : 's'} of ${life} carrousel${life === 1 ? '' : 's'}`,
    plan: (naam, n, vert) => `${naam}: ${n} credits, ${vert}`,
    saldo: (n, vert) => `Je hebt ${n} credits: genoeg voor ${vert}`,
  },
  en: {
    kop: 'What a credit buys',
    credits: 'credits',
    opAanvraag: 'on request',
    regels: {
      catalog: ['Catalog set', 'per product'],
      lifestyle: ['Lifestyle carousel', 'per product'],
      photo: ['Extra photo', 'one extra angle'],
      hires: ['4K', 'per carousel'],
      video: ['Video', 'clips and hooks'],
    },
    kern: (n) => `With a plan a catalog set always costs ${n} credits, even if you order just two.`,
    vertaling: (cat, life) => `${cat} catalog set${cat === 1 ? '' : 's'} or ${life} carousel${life === 1 ? '' : 's'}`,
    plan: (naam, n, vert) => `${naam}: ${n} credits, ${vert}`,
    saldo: (n, vert) => `You have ${n} credits: enough for ${vert}`,
  },
};

const taal = (lang) => (lang === 'nl' ? 'nl' : 'en');
const heel = (n) => Math.max(0, Math.floor(Number(n) || 0));

/** De vijf regels van de kaart, in deze volgorde. `credits` is null bij video. */
export function creditKaartRegels(lang = 'nl') {
  const t = T[taal(lang)];
  const rij = (id, credits) => ({ id, naam: t.regels[id][0], per: t.regels[id][1], credits });
  return [
    rij('catalog', SERVICE_CREDITS.catalog),
    rij('lifestyle', SERVICE_CREDITS.lifestyle),
    rij('photo', EXTRA_CREDITS.photo),
    rij('hires', EXTRA_CREDITS.hires),
    rij('video', null),
  ];
}

/**
 * Wat een aantal credits oplevert, in één zin: "30 catalogsets of 24 carrousels".
 * Dezelfde functie voor een plan, een saldo in Studio en stap 5 (6.01, 2.02).
 */
export function creditVertaling(n, lang = 'nl') {
  const c = heel(n);
  return T[taal(lang)].vertaling(Math.floor(c / SERVICE_CREDITS.catalog), Math.floor(c / SERVICE_CREDITS.lifestyle));
}

/** "Pro: 120 credits, 30 catalogsets of 24 carrousels" — de vertaling per plan. */
export function planVertaling(planId, lang = 'nl') {
  const n = PLAN_CREDITS[planId];
  if (!n) throw new Error(`creditKaart.js: onbekend plan "${planId}"`);
  return T[taal(lang)].plan(planName(planId, taal(lang)), n, creditVertaling(n, lang));
}

/** "Je hebt 72 credits: genoeg voor 18 catalogsets of 14 carrousels" — achter een saldo. */
export function saldoVertaling(n, lang = 'nl') {
  return T[taal(lang)].saldo(heel(n), creditVertaling(n, lang));
}

/** De kernzin bovenaan /plans (6.01). */
export function creditKern(lang = 'nl') {
  return T[taal(lang)].kern(SERVICE_CREDITS.catalog);
}

/** De vaste woorden van de kaart: kop, het woord credits, en "op aanvraag". */
export function creditKaartTekst(lang = 'nl') {
  const t = T[taal(lang)];
  return { kop: t.kop, credits: t.credits, opAanvraag: t.opAanvraag };
}

/**
 * Extra credits bijkopen (12 oktober 2026, ab-v3 = c), als één bijzin voor
 * /plans, de FAQ en de voorwaarden: "in pakketten van 10, 25 of 50 credits,
 * tegen de prijs per credit van je eigen abonnement, met korting: 5% bij 25, 10%
 * bij 50". Uit BIJKOOP_* in pricing.js; geen getal ingetypt.
 */
export function bijkoopRegel(lang = 'nl') {
  const nl = taal(lang) === 'nl';
  const p = BIJKOOP_PAKKETTEN.map(String);
  const lijst = p.length > 1 ? `${p.slice(0, -1).join(', ')} ${nl ? 'of' : 'or'} ${p[p.length - 1]}` : p.join('');
  const k = BIJKOOP_PAKKETTEN.filter((x) => BIJKOOP_KORTING_PCT[x] > 0).map((x) => (nl ? `${BIJKOOP_KORTING_PCT[x]}% bij ${x}` : `${BIJKOOP_KORTING_PCT[x]}% with ${x}`));
  return nl
    ? `in pakketten van ${lijst} credits, tegen de prijs per credit van je eigen abonnement${k.length ? `, met korting: ${k.join(', ')}` : ''}`
    : `in packages of ${lijst} credits, at the price per credit of your own plan${k.length ? `, with a discount: ${k.join(', ')}` : ''}`;
}

/** Het maximum per maand, als getal (voor dezelfde teksten). */
export const BIJKOOP_MAX = BIJKOOP_MAX_PER_MAAND;
