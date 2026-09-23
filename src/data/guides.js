/*
 * ═══════════════════════════════════════════════════════════════════════════════
 * DE GIDSEN-HUB — ÉÉN LIJST, DRIE LEZERS
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Deze vijf kaarten stonden twee keer uitgetypt: in src/pages/guides.astro en in
 * src/pages/nl/guides.astro (sinds 7 september 2026 allebei één regel die
 * src/components/GuidesPage.astro aanroept). Dat werkte, en het is precies de constructie die in dit
 * project al drie keer stil is verschoven — de drie parallelle menulijsten, de vier
 * kopieën van dezelfde leverdatum, de handgeschreven sitemap die veertien pagina's
 * achterliep. Twee lijsten die hetzelfde horen te zeggen, zeggen op een dag iets
 * anders, en niemand die de ene leest komt langs de andere.
 *
 * Er kwam op 3 september 2026 een DERDE lezer bij en dat besliste het: /guides draagt
 * nu een ItemList in zijn JSON-LD, gebouwd in src/data/schema.js. Een derde
 * uitgetypte kopie — machineleesbaar, dus onzichtbaar als hij afwijkt — is precies de
 * fout waar de kop van schema.js voor waarschuwt: "geen prijs hier die de zichtbare
 * pagina niet ook toont". Dat geldt voor een titel net zo goed.
 *
 * ── HET PAD IS TAALNEUTRAAL ────────────────────────────────────────────────
 *
 * `pad` is '/upload-guidelines' en niet '/nl/upload-guidelines'. Het voorvoegsel komt
 * er hier in één functie bij, en dat haalt een hele klasse fouten weg: in de oude
 * Nederlandse lijst stond het voorvoegsel vijf keer met de hand, en vijf keer met de
 * hand is vijf kansen om een Nederlandse kaart naar een Engelse pagina te laten
 * wijzen.
 *
 * ── DE BEDRAGEN ────────────────────────────────────────────────────────────
 *
 * De prijzenkaart noemt vier bedragen en die komen alle vier uit pricing.js, hier net
 * zo goed als eerst in de pagina. Ze stonden ooit uitgetypt, inclusief een "video
 * vanaf €49" die de herprijzing al had ingetrokken. Zie section 0 van pricing.js voor
 * waarom foto's een staffel hebben en een clip niet.
 */

import {
  euro, AMOUNT, ladderRate, ladderFloor, LADDER, vatLabel, VIDEO_OP_AANVRAAG,
} from './pricing.js';

const VOORVOEGSEL = { en: '', nl: '/nl' };

/** De vijf kaarten, in de volgorde waarin ze op de pagina staan. */
export function guides(lang = 'en') {
  const l = lang === 'nl' ? 'nl' : 'en';
  const pre = VOORVOEGSEL[l];
  const catInstap = euro(ladderRate('catalog', 1), l);
  const catVloer = euro(ladderFloor('catalog'), l);
  const lifeInstap = euro(ladderRate('lifestyle', 1), l);
  /* De vloer van lifestyle is NIET die van catalog. Hier stond ooit één waarde voor
     allebei, met "en lager" erachter — dus las de pagina dat lifestyle tot €33 zou
     dalen terwijl hij op €41 eindigt, en dat er nog iets onder zat. 8 augustus 2026. */
  const lifeVloer = euro(ladderFloor('lifestyle'), l);
  /* ── "VANAF" EN NIET "EEN VASTE" — 7 september 2026 ──────────────────────
     Hier stond "video een vaste €69 per clip". Lucas: *"die 69 euro slaat
     nergens op per clip omdat hier ook meerdere stylen in komen."* AMOUNT.video
     is het tarief van Motion; lifestyle- en campagnevideo rekenen anders af en
     hooks helemaal niet. Eén bedrag "vast" noemen belooft dus een prijs die
     drie van de vier videosoorten niet hebben. */
  /* 23 september 2026: video staat op aanvraag (VIDEO_OP_AANVRAAG), dus een
     bedrag per clip belooft hier een prijs die de videopagina niet noemt. */
  const vid = euro(AMOUNT.video, l);
  const videoNl = VIDEO_OP_AANVRAAG ? 'video op aanvraag' : `video vanaf ${vid} per clip`;
  const videoEn = VIDEO_OP_AANVRAAG ? 'video on request' : `video from ${vid} a clip`;
  const vanaf = LADDER.catalog[LADDER.catalog.length - 1][0];

  const rijen = l === 'nl' ? [
    ['Zo fotografeer je je product met je telefoon', 'De hoeken, het licht en de achtergrond. Lees dit vóór je bestelt.', '/upload-guidelines', 'Checklist'],
    ['Van foto naar publicatie — hoe het werkt', 'Van je foto tot het afgewerkte beeld.', '/how-it-works', 'Proces'],
    ['AI-tools vs een done-for-you studio', 'Wanneer een AI-tool genoeg is, en wanneer niet.', '/compare', 'Vergelijk'],
    ['Wat productvisuals echt kosten', `Catalog vanaf ${catInstap}, lifestyle vanaf ${lifeInstap}, dalend tot ${catVloer} en ${lifeVloer}; ${videoNl}. Alles ${vatLabel('excl', 'nl')}.`, '/pricing', 'Prijzen'],
    ['Vragen, beantwoord', 'Betaling, btw, modellen, levering en revisies.', '/faq', 'FAQ'],
  ] : [
    ['How to photograph your product with your phone', 'The angles, the light and the background. Read this before you order.', '/upload-guidelines', 'Checklist'],
    ['From photo to publish — how it works', 'From your photo to the finished image.', '/how-it-works', 'Process'],
    ['AI tools vs a done-for-you studio', 'When an AI tool is enough, and when it is not.', '/compare', 'Compare'],
    ['What product visuals actually cost', `Catalog from ${catInstap}, lifestyle from ${lifeInstap}, falling to ${catVloer} and ${lifeVloer}; ${videoEn}. All ${vatLabel('excl', 'en')}.`, '/pricing', 'Pricing'],
    ['Questions, answered', 'Payment, VAT, models, delivery and revisions.', '/faq', 'FAQ'],
  ];

  return rijen.map(([title, desc, pad, tag]) => ({
    title, desc, tag, pad, href: `${pre}${pad}/`,
  }));
}

/** De kop en de omschrijving van de hub zelf — voor de ItemList in schema.js. */
export const GUIDES_HUB = {
  en: {
    naam: 'VISUAILS guides',
    lede: 'Short, practical reads for founders getting their product visuals right.',
  },
  nl: {
    naam: 'VISUAILS-gidsen',
    lede: 'Korte, praktische stukken voor ondernemers die hun productbeelden goed willen hebben.',
  },
};

export default guides;
