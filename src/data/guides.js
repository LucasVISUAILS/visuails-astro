/*
 * ═══════════════════════════════════════════════════════════════════════════════
 * DE GIDSEN-HUB — ÉÉN LIJST, DRIE LEZERS
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Deze vijf kaarten stonden twee keer uitgetypt: in src/pages/guides.astro en in
 * src/pages/nl/guides.astro. Dat werkte, en het is precies de constructie die in dit
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
  euro, AMOUNT, ladderRate, ladderFloor, LADDER, vatLabel,
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
  const vid = euro(AMOUNT.video, l);
  const vanaf = LADDER.catalog[LADDER.catalog.length - 1][0];

  const rijen = l === 'nl' ? [
    ['Zo fotografeer je je product met je telefoon', 'De vier hoeken, het licht, de achtergrond — alles wat een telefoonfoto omzet in een campagneklaar resultaat. Het nuttigste om te lezen voordat je bestelt.', '/upload-guidelines', 'Checklist'],
    ['Van foto naar publicatie — hoe het werkt', 'Wat er precies gebeurt tussen het sturen van één foto en het terugkrijgen van een afgewerkte, met de hand gecontroleerde visual.', '/how-it-works', 'Proces'],
    ['AI-tools vs een done-for-you studio', 'Wanneer een AI-tool die je zelf bedient echt genoeg is — en waar hij je stilletjes uren kost aan overdoen en kleur die niet bij je merk past.', '/compare', 'Vergelijk'],
    ['Wat productvisuals echt kosten', `Catalog vanaf ${catInstap} per set van vier foto’s en lifestyle vanaf ${lifeInstap}, dalend tot ${catVloer} en ${lifeVloer} vanaf ${vanaf} producten; video een vaste ${vid} per clip. Alles ${vatLabel('excl', 'nl')}.`, '/pricing', 'Prijzen'],
    ['Vragen, beantwoord', 'Betaling, btw, modellen, levering, wat als iets niet klopt — de praktische dingen die merken vragen vóór hun eerste bestelling.', '/faq', 'FAQ'],
  ] : [
    ['How to photograph your product with your phone', 'The four angles, the lighting, the background — everything that turns a phone photo into a campaign-ready result. The single most useful thing to read before you order.', '/upload-guidelines', 'Checklist'],
    ['From photo to publish — how it works', 'What actually happens between sending one photo and getting a finished, human-checked visual back.', '/how-it-works', 'Process'],
    ['AI tools vs a done-for-you studio', 'When a self-serve AI tool is genuinely enough — and where it quietly costs you in redos, off-brand colour and hours.', '/compare', 'Compare'],
    ['What product visuals actually cost', `Catalog from ${catInstap} for a four-photo set and lifestyle from ${lifeInstap}, falling to ${catVloer} and ${lifeVloer} from ${vanaf} products up; video a flat ${vid} a clip. All ${vatLabel('excl', 'en')}.`, '/pricing', 'Pricing'],
    ['Questions, answered', 'Payment, VAT, models, delivery, what if something is off — the practical things brands ask before their first order.', '/faq', 'FAQ'],
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
