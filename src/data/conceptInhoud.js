/**
 * VISUAILS — de inhoud van de voorpagina, los van de vorm. 6 september 2026.
 *
 * WAAROM DIT BESTAAT. De conceptpagina's onder /concept/ tonen dezelfde
 * voorpagina in drie totaal andere vormen. De informatie moet daarbij exact
 * hetzelfde blijven — Lucas: *"door wel de informatie op de website te behouden,
 * hoe het naar voren word gebracht staat helemaal open"* — en dus staat ze hier
 * één keer, en lezen alle drie de concepten haar hieruit. De tekst is die van
 * Voorpagina.astro (sectie 21), woord voor woord; de getallen komen zoals daar
 * uit pricing.js, lexicon.js, shots.js en models.js en zijn nergens getypt.
 *
 * Wordt één van de concepten de nieuwe voorpagina, dan verhuist COPY uit
 * Voorpagina.astro hierheen en leest die pagina ook uit dit bestand.
 */
import {
  AMOUNT, euro, TEST_SAMPLE, reviewClaim, aftercare,
  LADDER, ladderRate, vatLabel, PLAN_AMOUNT, PLAN_PRODUCTS, PLAN_CLIPS, plans,
  CATALOG_IMAGES, LIFESTYLE_IMAGES, COMPLETE_IMAGES,
} from './pricing.js';
import { countedShort } from './lexicon.js';
import { binnenkortNamen } from './binnenkort.js';
import { TAGLINE, MERK } from './brand.js';
import { ROSTER, modelId, telwoord } from './models.js';
import { REQUIRED_SHOT_IDS } from './shots.js';

const FRAMES = {
  en: ['Front', 'Back', 'Detail', 'On model', 'Scene', 'On model', 'Close-up'],
  nl: ['Voor', 'Achter', 'Detail', 'Op model', 'Scène', 'Op model', 'Close-up'],
};
if (FRAMES.en.length !== COMPLETE_IMAGES) throw new Error(`conceptInhoud: ${FRAMES.en.length} frames voor ${COMPLETE_IMAGES} beelden.`);

/* De negen sfeerbeelden uit Lucas' map "Website Banners", met het groene licht.
   Plaatshouders tot de echte foto's er zijn; de maten zijn de echte maten. */
export const SFEER = [
  { n: '01', w: 2000, h: 1125, alt: 'Model in een pufferjas op de achterbank, in groen licht' },
  { n: '02', w: 1248, h: 1872, alt: 'Leren broek op een zebrapad, in groen licht' },
  { n: '03', w: 2000, h: 1125, alt: 'Kabeltrui in een baan groen licht' },
  { n: '04', w: 1536, h: 1536, alt: 'Pufferjas, close, op de achterbank' },
  { n: '05', w: 2000, h: 1125, alt: 'Model kijkt om vanaf de achterbank' },
  { n: '06', w: 1536, h: 1536, alt: 'Silhouet in profiel tegen groen' },
  { n: '07', w: 1872, h: 1248, alt: 'Model in een lichtvenster op de vloer' },
  { n: '08', w: 2000, h: 1125, alt: 'Een vlek groen licht op een donkere vloer' },
  { n: '09', w: 2000, h: 1125, alt: 'Een baan groen licht over de vloer' },
].map((s) => ({ ...s, src: `/img/concept/sfeer-${s.n}.webp`, klein: `/img/concept/sfeer-${s.n}-w1000.webp` }));

/* De belofte over de rechten staat op één plek, omdat hij op de pagina twee keer
   voorkomt: als punt onder de hero en als belofte bij Studio. Zie de lange noot in
   Voorpagina.astro; dit bestand moet daar woord voor woord gelijk aan blijven. */
const RECHTEN = {
  en: 'Full commercial rights included',
  nl: 'Volledige commerciële rechten inbegrepen',
};

/**
 * @param {'en'|'nl'} lang
 */
export function inhoud(lang) {
  const sample = TEST_SAMPLE[lang];
  const e = (n) => euro(n, lang);
  const FOTOS = telwoord(REQUIRED_SHOT_IDS.length, lang, true);

  /* Zelfde volgorde als /pricing en de voorpagina sinds 8 september: de instap
     vooraan, de bundel als derde. Zie de lange noot in PricingPage.astro.
     KINDS en priceKinds lopen hier op INDEX mee — negen conceptpagina's lezen
     `c.priceKinds[i]` — dus deze twee horen altijd samen te verspringen. */
  const KINDS = ['catalog', 'lifestyle', 'complete'];
  const KIND_PAGE = { complete: null, catalog: '/catalog', lifestyle: '/lifestyle' };
  const vorm = (id) => LADDER[id].map(([lo, hi]) => `${lo}:${hi}`).join(',');
  for (const id of KINDS) if (vorm(id) !== vorm('complete')) throw new Error(`conceptInhoud: staffel "${id}" breekt op andere aantallen dan "complete".`);
  const RUNGS = LADDER.complete.map(([lo, hi]) => ({ at: lo, label: hi === null ? `${lo}+` : `${lo}–${hi}` }));
  const PLANS = plans(lang);
  const PLAN_CHEAPEST = Object.keys(PLAN_AMOUNT).reduce((a, b) => (PLAN_AMOUNT[b] < PLAN_AMOUNT[a] ? b : a));

  if (!/\b1 revision round\b/i.test(aftercare('attended', 'en'))) {
    throw new Error(`conceptInhoud: de Studio-regel belooft één revisieronde, AFTERCARE zegt nu: "${aftercare('attended', 'en')}"`);
  }

  const COPY = {
    en: {
      labels: [MERK, 'Studio', 'Enschede, NL'],
      secties: ['What we make', 'Studio production', 'The set', 'The process', 'Rates', 'Studio', 'Faces', 'Test sample'],
      posterLine: [MERK, 'All rights reserved · 2026'],
      h1: TAGLINE.en.lines, h1plain: TAGLINE.en.plain,
      lede: 'Catalog, lifestyle and video, made from the product photos you already have. No shoot.',
      ctaStart: 'Start an order',
      heroAlt: 'A VISUAILS campaign visual', heroChip: 'Campaign',
      facts: ['One product is enough, no shoot', `From ${e(AMOUNT.catalog)} per product`, 'Your own week on the calendar', RECHTEN.en],
      svcH: 'What we make.',
      svcLede: 'Four services, all from the photos you already have.',
      svc: [
        ['Catalog set', `${countedShort('catalog', CATALOG_IMAGES, 'en')} · front, back, detail, on model`, `from ${e(AMOUNT.catalog)} per product`, '/catalog'],
        ['Lifestyle carousel', `${countedShort('lifestyle', LIFESTYLE_IMAGES, 'en')} in one styled scene, ready to post`, `from ${e(AMOUNT.lifestyle)} per product`, '/lifestyle'],
        ['Video clip', 'One vertical clip, cut for Reels and TikTok', `${e(AMOUNT.video)} per clip`, '/video'],
        ['Your brand model', 'One face, yours alone, in every order', `once ${e(AMOUNT.brandModel)}`, '/custom-models'],
      ],
      svcMore: 'See',
      svcSoon: ['Coming:', `${binnenkortNamen('en').join(' & ')} — what they are`],
      vnH: 'You send a phone photo. We turn it into a studio production.',
      vnLede: 'The garment stays as it is. Light, background, model and crop are built around it.',
      vnIn: ['Sent in', 'Phone photo'], vnOut: ['Delivered', `Catalog 01/${String(CATALOG_IMAGES).padStart(2, '0')}`],
      vnLink: 'See the gallery',
      vnNoten: ['Light', 'Background', 'Model', 'Crop'],
      /* Zie de lange noot bij setH in Voorpagina.astro: de set is een bovengrens
         en geen pakket. */
      setH: `One product. Up to ${COMPLETE_IMAGES} images and a clip.`,
      setLede: 'The catalog set for your shop, the lifestyle carousel for your socials, a clip for the feed — together in one order, or any one of them on its own.',
      setGroups: [[`Catalog set · ${countedShort('catalog', CATALOG_IMAGES, 'en')}`, '/catalog'], [`Lifestyle carousel · ${countedShort('lifestyle', LIFESTYLE_IMAGES, 'en')}`, '/lifestyle']],
      frames: FRAMES.en,
      extrasLabel: 'On the same product',
      extras: [
        ['Video clip', `One vertical clip for Reels and TikTok · ${e(AMOUNT.video)}`, '/video'],
        ['Your brand model', `One face, yours alone · once ${e(AMOUNT.brandModel)}`, '/custom-models'],
      ],
      stepsH: 'From folder to launch.',
      stepsLede: 'You do two things: send and approve.',
      steps: [
        ['You send a folder', `One folder per product. ${FOTOS} phone photos are all you need.`],
        ['Your week is set', 'The calendar follows our real capacity.'],
        ['The studio runs', 'Catalog, lifestyle and video in your style, fully finished.'],
        ['A specialist checks', 'Every image, before it reaches you.'],
      ],
      priceH: 'One rate per product. It drops as the count rises.',
      priceCount: 'Products',
      priceKinds: [`Catalog · ${countedShort('catalog', CATALOG_IMAGES, 'en')}`, `Lifestyle · ${countedShort('lifestyle', LIFESTYLE_IMAGES, 'en')}`, `Complete · ${countedShort('complete', COMPLETE_IMAGES, 'en')}`],
      priceVat: `Per product, ${vatLabel('excl', 'en')}.`,
      priceCta: 'Start an order', priceCta2: 'Full price list',
      planH: 'Or every month.',
      planLede: 'A fixed number of finished products a month, in a week on the calendar that is yours.',
      planCols: ['Plan', 'Products a month', 'Video clips', 'Per month'],
      planLink: 'Compare the plans', planCta: 'Start a plan', planVat: `Per month, ${vatLabel('excl', 'en')}.`,
      studioH: 'Then: VISUAILS Studio.',
      studioLede: 'Live status, approve image by image, one revision round, download as jpg, png and webp.',
      studioFig: { head: 'Your delivered images, one by one', ok: 'Approved', rev: 'Sent back', wait: 'On its way' },
      studioLink: 'See Studio', studioLink2: 'How an order runs',
      beloften: [
        ['No final delivery without your check', 'Something off? We go through it together until it is right.'],
        [RECHTEN.en, 'Shop, marketplaces, ads and social — no extra licence fees.'],
      ],
      facesH: 'Pick a face — or claim one.',
      facesLede: 'A model from the roster, or a brand model nobody else gets. The face, background and format you approve stay with your brand, so the next order starts where the last one ended.',
      facesLink: 'How a brand model works', facesLink2: 'The roster',
      qH: 'Straight answers.',
      qs: [
        ['What if the visuals are not right?', 'See Studio', '/portal'],
        ['Will a customer see it is AI?', 'Read the AI Act page', '/ai-act'],
        ['Are my photos good enough?', 'What makes a photo usable', '/upload-guidelines'],
        ['Why not do it myself?', 'The honest comparison', '/compare'],
      ],
      qAll: 'All questions',
      closeH: `See it first. One product for ${sample.price}.`,
      closeLede: `${sample.deliverable} · made from your own photo · ${sample.unit}.`,
      closeAlt: 'Or start an order',
      trust: ['Made in Enschede, NL', 'Registered with the KVK', reviewClaim('attended', 'en'), 'Direct line on WhatsApp'],
      nav: [['What we make', '#maken'], ['Rates', '#tarieven'], ['Studio', '#studio'], ['Faces', '#gezichten']],
    },
    nl: {
      labels: [MERK, 'Studio', 'Enschede, NL'],
      secties: ['Wat we maken', 'Studioproductie', 'De set', 'Het proces', 'Tarieven', 'Studio', 'Gezichten', 'Proef'],
      posterLine: [MERK, 'Alle rechten voorbehouden · 2026'],
      h1: TAGLINE.nl.lines, h1plain: TAGLINE.nl.plain,
      lede: 'Catalog, lifestyle en video van de productfoto’s die je al hebt. Geen shoot.',
      ctaStart: 'Start een bestelling',
      heroAlt: 'Een VISUAILS-campagnebeeld', heroChip: 'Campagne',
      facts: ['Eén product mag, geen shoot nodig', `Vanaf ${e(AMOUNT.catalog)} per product`, 'Jouw eigen week op de kalender', RECHTEN.nl],
      svcH: 'Wat we maken.',
      svcLede: 'Vier diensten, allemaal uit de foto’s die je al hebt.',
      svc: [
        ['Catalogset', `${countedShort('catalog', CATALOG_IMAGES, 'nl')} · voor, achter, detail, op model`, `vanaf ${e(AMOUNT.catalog)} per product`, '/catalog'],
        ['Lifestyle-carousel', `${countedShort('lifestyle', LIFESTYLE_IMAGES, 'nl')} in één gestylede scène, klaar om te posten`, `vanaf ${e(AMOUNT.lifestyle)} per product`, '/lifestyle'],
        ['Videoclip', 'Eén verticale clip, gesneden voor Reels en TikTok', `${e(AMOUNT.video)} per clip`, '/video'],
        ['Je merkmodel', 'Eén gezicht, alleen van jou, in elke bestelling', `eenmalig ${e(AMOUNT.brandModel)}`, '/custom-models'],
      ],
      svcMore: 'Bekijk',
      svcSoon: ['Binnenkort:', `${binnenkortNamen('nl').join(' & ')} — wat het is`],
      vnH: 'Jij stuurt een telefoonfoto. Wij maken er een studioproductie van.',
      vnLede: 'Het kledingstuk blijft zoals het is. Licht, achtergrond, model en uitsnede bouwen wij eromheen.',
      vnIn: ['Ingestuurd', 'Telefoonfoto'], vnOut: ['Geleverd', `Catalog 01/${String(CATALOG_IMAGES).padStart(2, '0')}`],
      vnLink: 'Bekijk de galerij',
      vnNoten: ['Licht', 'Achtergrond', 'Model', 'Uitsnede'],
      /* Zie de Engelse tegenhanger. */
      setH: `Eén product. Tot ${COMPLETE_IMAGES} beelden en een clip.`,
      setLede: 'De catalogset voor je shop, de lifestyle-carousel voor je socials, een clip voor de feed — samen in één bestelling, of elk apart.',
      setGroups: [[`Catalogset · ${countedShort('catalog', CATALOG_IMAGES, 'nl')}`, '/catalog'], [`Lifestyle-carousel · ${countedShort('lifestyle', LIFESTYLE_IMAGES, 'nl')}`, '/lifestyle']],
      frames: FRAMES.nl,
      extrasLabel: 'Bij hetzelfde product',
      extras: [
        ['Videoclip', `Eén verticale clip voor Reels en TikTok · ${e(AMOUNT.video)}`, '/video'],
        ['Je merkmodel', `Eén gezicht, alleen van jou · eenmalig ${e(AMOUNT.brandModel)}`, '/custom-models'],
      ],
      stepsH: 'Van map tot lancering.',
      stepsLede: 'Jij doet twee dingen: sturen en goedkeuren.',
      steps: [
        ['Jij stuurt een map', `Eén map per product. ${FOTOS} telefoonfoto’s zijn genoeg om te beginnen.`],
        ['Je week staat vast', 'De kalender volgt onze echte capaciteit.'],
        ['De studio draait', 'Catalog, lifestyle en video in jouw stijl, volledig afgewerkt.'],
        ['Een specialist kijkt', 'Elk beeld, voordat het bij je staat.'],
      ],
      priceH: 'Eén tarief per product. Daalt met het aantal.',
      priceCount: 'Producten',
      priceKinds: [`Catalog · ${countedShort('catalog', CATALOG_IMAGES, 'nl')}`, `Lifestyle · ${countedShort('lifestyle', LIFESTYLE_IMAGES, 'nl')}`, `Compleet · ${countedShort('complete', COMPLETE_IMAGES, 'nl')}`],
      priceVat: `Per product, ${vatLabel('excl', 'nl')}.`,
      priceCta: 'Start een bestelling', priceCta2: 'De volledige prijslijst',
      planH: 'Of elke maand.',
      planLede: 'Een vast aantal afgewerkte producten per maand, in een week op de kalender die van jou is.',
      planCols: ['Abonnement', 'Producten per maand', 'Videoclips', 'Per maand'],
      planLink: 'Vergelijk de abonnementen', planCta: 'Sluit een abonnement af', planVat: `Per maand, ${vatLabel('excl', 'nl')}.`,
      studioH: 'Daarna: VISUAILS Studio.',
      studioLede: 'Live status, beeld voor beeld goedkeuren, één revisieronde, downloaden als jpg, png en webp.',
      studioFig: { head: 'Je geleverde beelden, stuk voor stuk', ok: 'Goedgekeurd', rev: 'Teruggestuurd', wait: 'Nog onderweg' },
      studioLink: 'Bekijk Studio', studioLink2: 'Hoe een bestelling draait',
      beloften: [
        ['Geen definitieve oplevering zonder jouw check', 'Klopt er iets niet? Dan gaan we er samen doorheen tot het klopt.'],
        [RECHTEN.nl, 'Webshop, marktplaatsen, ads en social — zonder extra licentiekosten.'],
      ],
      facesH: 'Kies een gezicht — of claim er een.',
      facesLede: 'Een model uit de roster, of een merkmodel dat niemand anders krijgt. Het gezicht, de achtergrond en het formaat die je goedkeurt blijven bij je merk, dus een volgende bestelling begint waar de vorige ophield.',
      facesLink: 'Hoe een merkmodel werkt', facesLink2: 'De roster',
      qH: 'Direct antwoord.',
      qs: [
        ['Wat als ze niet goed zijn?', 'Bekijk Studio', '/portal'],
        ['Ziet een klant dat het AI is?', 'Lees de AI Act-pagina', '/ai-act'],
        ['Zijn mijn foto’s goed genoeg?', 'Wat maakt een foto bruikbaar', '/upload-guidelines'],
        ['Waarom niet zelf?', 'De eerlijke vergelijking', '/compare'],
      ],
      qAll: 'Alle vragen',
      closeH: `Eerst zien? Eén product voor ${sample.price}.`,
      closeLede: `${sample.deliverable} · gemaakt van jouw eigen foto · ${sample.unit}.`,
      closeAlt: 'Of start een bestelling',
      trust: ['Gemaakt in Enschede, NL', 'Ingeschreven bij de KVK', reviewClaim('attended', 'nl'), 'Directe lijn via WhatsApp'],
      nav: [['Wat we maken', '#maken'], ['Tarieven', '#tarieven'], ['Studio', '#studio'], ['Gezichten', '#gezichten']],
    },
  };

  return {
    c: COPY[lang],
    sample,
    e,
    KINDS, KIND_PAGE, RUNGS, PLANS, PLAN_CLIPS, PLAN_CHEAPEST,
    ladderRate,
    CATALOG_IMAGES, LIFESTYLE_IMAGES, COMPLETE_IMAGES,
    ROSTER, modelId,
    AMOUNT,
    SFEER,
  };
}
