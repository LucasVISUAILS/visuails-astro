import { waHref } from './whatsapp.js';
// VISUAILS — video style data (Dutch / NL). Localized copy of
// src/data/videoStyles.js — same shape and exports, only the human-readable
// strings are translated. Internal CTA paths are prefixed with /nl; external
// wa.me links keep their domain, their ?text= message is translated.

import { perProduct, reviewClaim, turnaround, vatLabel } from './pricing.js';

// No euro figure and no delivery time may be typed into this file.
// Both used to live here as literals, which is how the hub cards and the
// [slug] pages ended up quoting a turnaround the capacity gate had never
// cleared — and how a video price that exists nowhere in pricing.js
// survived a repricing nobody caught. Derive, never type.
const VID = perProduct('video', 'nl');
// A clip is NOT on the ladder — it is the same rate at one clip and at fifty,
// which is what makes it quotable inside or outside an order. So this one keeps
// a flat figure; it just no longer prints it without saying which side of VAT
// it sits on.
const VID_VAT = vatLabel('excl', 'nl');
const TIMING = turnaround('unattended', 'nl');
const REVIEW = reviewClaim('unattended', 'nl');

function grid(photos, icons) {
  const widths = { bottle: '42%', sneaker: '54%', jar: '46%', bag: '46%' };
  return icons.map((icon, i) => ({ photo: photos[i] ?? null, icon, width: widths[icon] }));
}

export const videoStyles = [
  {
    slug: 'motion',
    name: 'Motion',
    tagline: 'Acht seconden onverdeelde aandacht.',
    priceTrust: VID.price,
    priceUnit: ' / clip',
    ctaLabel: 'Bestel Motion',
    ctaHref: '/nl/start',
    ctaExternal: false,
    heroIcon: 'bottle',
    heroWidth: '26%',
    cardIcon: 'bottle',
    cardWidth: '42%',
    cardPrice: `${VID.price} / clip`,
    cardDesc: 'Een clip van 8 seconden, subtiele beweging, strakke presentatie. Vaste prijs.',
    moodTitle: 'Hoe Motion voelt.',
    moodParagraphs: [
      'Acht seconden, één product, één strakke beweging — genoeg om het oog vast te houden, nooit genoeg om af te leiden.',
    ],
    steps: [
      { title: 'Zet het kader vast', body: 'Eén strakke compositie, camera volkomen stil.' },
      { title: 'Voeg subtiele beweging toe', body: 'Lichte drift, zachte rotatie of onthulling.' },
      { title: 'Loop het naadloos', body: 'Het laatste kader sluit aan op het eerste.' },
    ],
    grid: grid(
      [],
      ['bottle', 'sneaker', 'jar', 'bag', 'bottle', 'sneaker', 'jar', 'bag', 'bottle']
    ),
    craft: [
      { title: 'Eén beweging per film', body: 'Eén doelbewuste camera- of lichtbeweging. Ingehoudenheid is de stijl.' },
      { title: 'Loop-schone eindes', body: 'Begin- en eindkaders op elkaar afgestemd zodat het naadloos loopt.' },
      { title: 'Materiaalbewuste beweging', body: 'Snelheid en licht afgestemd op waar het product van gemaakt is.' },
      { title: 'Grading afgestemd op stills', body: 'Deelt een grade met je catalogusset.' },
    ],
    why: [
      { title: 'Leven zonder ruis', body: 'Maakt af wat een statische foto niet helemaal kan zeggen.' },
      { title: 'Elk formaat, één shoot', body: 'Gemonteerd voor vierkant, portret en breed vanuit één bestand.' },
      { title: 'Klaar voor de scroll', body: '8 seconden, gebouwd om aandacht vast te houden.' },
    ],
    bestFor: [
      'Productpagina\'s die leven nodig hebben',
      'Social feeds en eenvoudige advertenties',
      'E-mailheaders en launch-teasers',
      'Marktplaatsen die video ondersteunen',
    ],
    whatYouGet: [
      'Strakke productfilm van 8 seconden',
      'Naadloze loop, subtiele beweging',
      'Formaat gemonteerd voor jouw kanaal',
      TIMING,
      REVIEW,
    ],
  },
  {
    slug: 'lifestyle',
    name: 'Lifestyle Video',
    tagline: 'De scène, in beweging gezet.',
    priceTrust: VID.price,
    priceUnit: ' / clip',
    ctaLabel: 'Bestel Lifestyle Video',
    ctaHref: '/nl/start',
    ctaExternal: false,
    heroIcon: 'jar',
    heroWidth: '26%',
    cardIcon: 'jar',
    cardWidth: '46%',
    cardPrice: `${VID.price} / clip`,
    cardDesc: 'Een gestylede scène, in beweging — voor social en advertenties. Vaste prijs.',
    moodTitle: 'Hoe Lifestyle Video voelt.',
    moodParagraphs: [
      'Een gestylede scène, losgelaten: opstijgende stoom, verschuivend licht, een model dat zich naar de lens draait.',
    ],
    steps: [
      { title: 'Bouw de scène', body: 'Je wereld van lifestyle-stills, in beweging gebracht.' },
      { title: 'Regisseer lichtbeweging', body: 'Natuurlijk gebaar en licht dat geobserveerd aanvoelt.' },
      { title: 'Monteer voor het kanaal', body: 'Opgemaakt voor waar het ook draait.' },
    ],
    grid: grid(
      [],
      ['bottle', 'sneaker', 'jar', 'bag', 'bottle', 'sneaker', 'jar', 'bag', 'bottle']
    ),
    craft: [
      { title: 'Verhaal in één adem', body: 'Eén beat — onthulling, gebruik of sfeer — in enkele seconden.' },
      { title: 'Scène-continuïteit', body: 'Sets, licht en modellen matchen je lifestyle-stills.' },
      { title: 'Verticaal-eerst regie', body: 'Getimed voor 9:16 als eerste, 1:1- en 16:9-versies beschikbaar.' },
      { title: 'Beweging met manieren', body: 'Vloeiend en doelbewust — duur, niet druk.' },
    ],
    why: [
      { title: 'Continuïteit met je stills', body: 'Hetzelfde model, licht en sfeer — nu in beweging.' },
      { title: 'Gebouwd voor short-form', body: 'Getimed voor Reels, TikTok en Shorts.' },
      { title: 'Eén shoot, twee assets', body: 'Stills en beweging uit dezelfde gestylede scène.' },
    ],
    bestFor: [
      'Reels, TikTok en Shorts',
      'Advertenties die warmte en context nodig hebben',
      'Launches die stills en film samen dragen',
      'Merken die een herkenbare wereld bouwen',
    ],
    whatYouGet: [
      'Gestylede short-form scène in beweging',
      'Continuïteit met je lifestyle-stills',
      'Consistente modellen beschikbaar',
      TIMING,
      REVIEW,
    ],
  },
  {
    slug: 'campaign',
    name: 'Campaign',
    tagline: 'Je grootste moment, goed geproduceerd.',
    priceTrust: 'Offerte per project',
    priceUnit: '',
    ctaLabel: 'Vraag een campagne-offerte aan',
    ctaHref: waHref("Hoi VISUAILS, ik wil graag een offerte voor een campagnevideo."),
    ctaExternal: true,
    heroIcon: 'sneaker',
    heroWidth: '26%',
    cardIcon: 'sneaker',
    cardWidth: '56%',
    cardPrice: 'Offerte op maat',
    cardDesc: 'Campagnestukken met meerdere shots, gebouwd rond jouw brief. Prijs per project.',
    moodTitle: 'Hoe Campaign voelt.',
    moodParagraphs: [
      'De volledige productie: meerdere shots, een verhaallijn, montages gesneden om een launch te laten landen.',
    ],
    steps: [
      { title: 'Bepaal de scope van de campagne', body: 'Shots en deliverables afgesproken via WhatsApp.' },
      { title: 'Schiet de reeks', body: 'Een film met meerdere shots, gegraded als één verhaal.' },
      { title: 'Lever elke versie', body: 'Het formaat van elk kanaal, uit één campagne.' },
    ],
    grid: grid(
      [],
      ['bottle', 'sneaker', 'jar', 'bag', 'bottle', 'sneaker', 'jar', 'bag', 'bottle']
    ),
    craft: [
      { title: 'Een brief, serieus genomen', body: 'Shotlijst en verhaal gebouwd op jouw launch, geen template.' },
      { title: 'Opbouw met meerdere shots', body: 'Openers, details, heromomenten, eindkaarten — in volgorde gezet.' },
      { title: 'Monteren, graden, leveren', body: 'Versies voor feed, stories en site, één gedeelde grade.' },
      { title: 'Een vaste prijs, vooraf', body: 'Scope bepaald via WhatsApp. Jij keurt goed voordat we beginnen.' },
    ],
    why: [
      { title: 'Eén partner voor de hele campagne', body: 'Stills, beweging en elke versie, één brief.' },
      { title: 'Eén grade, elk kanaal', body: 'Consistente kleur en sfeer over elk formaat.' },
      { title: 'Geprijsd voordat je je vastlegt', body: 'Een heldere offerte, afgesproken voordat er werk begint.' },
    ],
    bestFor: [
      'Productlaunches en seizoensdrops',
      'Merkfilms en store-takeovers',
      'Campagnes die stills en film omvatten',
      'Teams die één partner voor alles nodig hebben',
    ],
    whatYouGet: [
      'Een afgekaderde campagnefilm met meerdere shots',
      'Versies voor elk kanaal waarop je zit',
      'Eén grade over je hele campagne',
      'Een heldere, afgesproken prijs voordat het werk begint',
    ],
  },
  {
    slug: 'custom',
    name: 'Custom',
    tagline: 'Een videoconcept volledig rond jouw merk gebouwd.',
    priceTrust: 'Offerte per project',
    priceUnit: '',
    ctaLabel: 'Bespreek een video op maat',
    ctaHref: waHref("Hoi VISUAILS, ik wil graag een video op maat bespreken."),
    ctaExternal: true,
    heroIcon: 'jar',
    heroWidth: '26%',
    cardIcon: 'jar',
    cardWidth: '46%',
    cardPrice: 'Offerte op maat',
    cardDesc: 'Je eigen concept, tempo en look — een video volledig afgekaderd op jouw brief.',
    moodTitle: 'Hoe Custom voelt.',
    moodParagraphs: [
      'Voorbij de drie formaten — een videoconcept afgekaderd op jouw brief: jouw verhaal, jouw tempo, jouw look.',
    ],
    steps: [
      { title: 'Brief', body: 'Vertel ons het idee en waar het moet draaien.' },
      { title: 'Concept', body: 'We ontwerpen een motion-concept op maat en kaderen het samen met jou af.' },
      { title: 'Lever', body: 'Elke versie die je nodig hebt, gegraded als één.' },
    ],
    craft: [
      { title: 'Gebouwd vanuit jouw idee', body: 'Geen template — het concept begint bij jouw brief en referenties.' },
      { title: 'Afgekaderd voordat we beginnen', body: 'Shots, lengte en deliverables vooraf afgesproken, helder geprijsd.' },
      { title: 'Elk formaat, één grade', body: 'Versies voor feed, stories en site, allemaal met één look.' },
      { title: 'Consistent met je stills', body: 'Kleur en sfeer afgestemd op je catalogus- en lifestyle-set.' },
    ],
    why: [
      { title: 'Precies jouw idee', body: 'Een concept gevormd naar jouw merk, niet in een preset geperst.' },
      { title: 'Eén partner, één look', body: 'Stills en beweging die duidelijk bij elkaar horen.' },
      { title: 'Geprijsd voordat je je vastlegt', body: 'Een heldere offerte, afgesproken voordat er werk begint.' },
    ],
    bestFor: [
      'Ideeën die de drie formaten niet dekken',
      'Launches met een specifiek verhaal te vertellen',
      'Merken die een kenmerkende motion-stijl willen',
      'Alles wat per project wordt afgekaderd en geoffreerd',
    ],
    whatYouGet: [
      'Een videoconcept op maat, samen met jou ontworpen',
      'Elke versie die je kanalen nodig hebben',
      'Eén grade over het hele stuk',
      'Een heldere, afgesproken prijs voordat het werk begint',
    ],
  },
];

export function getVideoStyle(slug) {
  return videoStyles.find((s) => s.slug === slug);
}
