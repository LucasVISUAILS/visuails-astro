// VISUAILS — lifestyle style data (Dutch / NL). Localized copy of
// src/data/styles.js — same shape and exports, only the human-readable
// strings are translated. Order paths are prefixed with /nl.

import { reviewClaim, turnaround, LIFESTYLE_IMAGES } from './pricing.js';

// No euro figure and no delivery time may be typed into this file.
// Both used to live here as literals, which is how the hub cards and the
// [slug] pages ended up quoting a turnaround the capacity gate had never
// cleared — and how a video price that exists nowhere in pricing.js
// survived a repricing nobody caught. Derive, never type.
/* Wat een carousel IS, als eerste regel op elke stijlpagina — 4 september 2026.
   Geen van de vier zei hoeveel foto's je krijgt; dat stond alleen op de hub. */
const SET = `${LIFESTYLE_IMAGES} foto’s per product — sfeer, op een model en detail`;
const TIMING = turnaround('unattended', 'nl');
const REVIEW = reviewClaim('unattended', 'nl');

function grid(photos, icons) {
  const widths = { bottle: '42%', sneaker: '54%', jar: '46%', bag: '46%' };
  return icons.map((icon, i) => ({ photo: photos[i] ?? null, icon, width: widths[icon] }));
}

export const styles = [
  {
    slug: 'dunes',
    /* ── DE STIJL REIST MEE — 21 augustus 2026 ────────────────────────────
       Deze knop ging naar `/start`, de keuzepagina. Wie op /lifestyle/dunes op
       "Bestel Dunes" klikte, moest daar Lifestyle aanwijzen en vervolgens in het
       formulier zelf Dunes nóg een keer. Drie keer dezelfde keuze.

       `?style=` is veilig op de manier die /start/plan?plan= al gebruikt: de
       waarde wordt gefilterd en dient alleen om een radio aan te vinken die de
       pagina zelf heeft gerenderd. Hij raakt de PRIJS niet — die hangt aan de
       route, en pipeline.js leest de URL met opzet nooit voor de dienst. */
    orderHref: '/nl/start/lifestyle/?style=dunes',
    name: 'Dunes',
    tagline: 'Zon, zand en ingetogen luxe.',
    heroPhoto: '/img/lifestyle-dunes-01.webp',
    cardPhoto: '/img/lifestyle-dunes-01.webp',
    beforeAfter: { before: '/img/lifestyle-dunes-02.webp', after: '/img/lifestyle-dunes-01.webp' },
    cardIcon: 'bag',
    cardDesc: 'Warme, zonovergoten editorial-scènes met zacht natuurlijk licht en aardse, zandkleurige omgevingen — een sfeer waar je in wilt stappen, en die premium producten flatteert.',
    moodTitle: 'Hoe Dunes eruitziet.',
    moodParagraphs: [
      'Zonovergoten minimalisme, aardse tonen, lange zachte schaduwen. De look van ingetogen luxe.',
      'Producten krijgen hier de ruimte. Woestijnlicht, linnen, en veel leegte eromheen die het werk doet.',
    ],
    steps: [
      { title: 'Vind de horizon', body: 'Brede, rustige composities met ademruimte rond het product.' },
      { title: 'Laat schaduwen rekken', body: 'Lang, laaghoekig licht voor een premium, ongehaaste sfeer.' },
      { title: 'Laat ruimte voor tekst', body: 'Kadering die ruimte houdt voor je eigen boodschap en layout.' },
    ],
    grid: grid(
      ['/img/lifestyle-dunes-02.webp'],
      ['bottle', 'sneaker', 'jar', 'bag', 'bottle', 'sneaker', 'jar', 'bag', 'bottle']
    ),
    craft: [
      { title: 'Een ingehouden palet, streng bewaakt', body: 'Zand, bot, terracotta en schaduw. Alles wat luider is, wordt verwijderd voordat het in beeld komt.' },
      { title: 'Geometrie van lang licht', body: 'Schaduwen vallen laag en lang, wat vlakke producten dimensie geeft en premium producten gewicht.' },
      { title: 'Oppervlakken die je kunt zien', body: 'Steen, pleisterwerk en geweven achtergronden houden hun structuur op volle resolutie, zodat een rustige scène toch iets te bekijken heeft.' },
      { title: 'Ruimte met opzet gelaten', body: 'Composities houden royale negatieve ruimte — klaar voor tekst, of voor stilte.' },
    ],
    why: [
      { title: 'Ingetogen luxe, zonder de studiokosten', body: 'De ingetogenheid van een premium shoot, tegen gewone visualprijs.' },
      { title: 'Gebouwd voor rust', body: 'Een sfeer die het product ondersteunt in plaats van ermee te concurreren.' },
      { title: 'Campagne-flexibel', body: 'Negatieve ruimte die werkt voor advertenties, banners en verpakking.' },
    ],
    bestFor: ['Premium skincare, sieraden en lederwaren', 'Merken die rust verkopen, geen ruis', 'Campagnes met een ingehouden stem', 'Producten die een galeriebehandeling verdienen'],
    whatYouGet: [SET, 'Zonovergoten, aardse minimalistische scènes', 'Premium belichting met lange schaduwen', 'Composities met ruimte voor je boodschap', TIMING, REVIEW],
  },
  {
    slug: 'flash',
    orderHref: '/nl/start/lifestyle/?style=flash',
    name: 'Flash',
    tagline: 'Directe flits. Geen excuses.',
    heroPhoto: '/img/lifestyle-flash-01.webp',
    cardPhoto: '/img/lifestyle-flash-02.webp',
    beforeAfter: { before: '/img/lifestyle-flash-07.webp', after: '/img/lifestyle-flash-01.webp' },
    cardIcon: 'sneaker',
    cardDesc: 'Energieke flitsvisuals met een nightlife-/editorial-gevoel — pittig, contrastrijk, trendgedreven.',
    moodTitle: 'Hoe Flash eruitziet.',
    moodParagraphs: [
      'Hard on-camera licht, diepe schaduwen, kleur die knalt. De nightlife-look, confronterend van opzet.',
      'Verkeerd toegepast is dit licht gewoon hard. Goed toegepast is het elektrisch. Wij hebben er een discipline van gemaakt.',
    ],
    steps: [
      { title: 'Plaats hard licht', body: 'De flits zo geplaatst dat het product strak uit het donker wordt gesneden.' },
      { title: 'Teken met schaduw', body: 'Negatieve ruimte met opzet gevormd — nooit per ongeluk leeg gelaten.' },
      { title: 'Bescherm het product', body: 'Contrast hard opgevoerd zonder kleur of textuur te overbelichten.' },
    ],
    grid: grid(
      ['/img/lifestyle-flash-01.webp', '/img/lifestyle-flash-02.webp', '/img/lifestyle-flash-03.webp', '/img/lifestyle-flash-04.webp', '/img/lifestyle-flash-05.webp', '/img/lifestyle-flash-06.webp', '/img/lifestyle-flash-07.webp', '/img/lifestyle-flash-08.webp'],
      ['bottle', 'sneaker', 'jar', 'bag', 'bottle', 'sneaker', 'jar', 'bag', 'bottle']
    ),
    craft: [
      { title: 'Hard licht, strak geplaatst', body: 'De flits valt precies af waar hij moet: het product blijft scherp en de achtergrond zakt weg.' },
      { title: 'Schaduw als compositie', body: 'Het zwart achter het onderwerp is niet leeg — het is getekend en bepaalt waar het oog landt.' },
      { title: 'Hard, maar niets brandt uit', body: 'We zetten het contrast hoog en houden tegelijk de kleur en de structuur van je product heel.' },
      { title: 'Energie die zich herhaalt', body: 'De chaos is gesystematiseerd: je tiende Flash-foto raakt net zo hard als je eerste, en matcht hem.' },
    ],
    why: [
      { title: 'Valt op in een feed', body: 'Hard licht en diepe schaduw zijn ook op thumbnailformaat te zien, waar zacht gelijkmatig licht wegvalt.' },
      { title: 'Een edge die zich herhaalt', body: 'Dezelfde intensiteit op lifestylefoto één en lifestylefoto honderd.' },
      { title: 'Gemaakt voor een lancering', body: 'De look past bij een release, een bijbestelling of een beperkte oplage.' },
    ],
    bestFor: ['Streetwear, sneakers en accessoires', 'Lanceringen en beperkte oplages', 'Merken met een harde, herkenbare stijl', 'Social-advertenties die tussen de rest moeten opvallen'],
    whatYouGet: [SET, 'Energieke flitsverlichte scènes', 'Diep, doelbewust schaduwwerk', 'Consistente modellen, vastgezet op je merk', TIMING, REVIEW],
  },
  {
    slug: 'glow',
    orderHref: '/nl/start/lifestyle/?style=glow',
    name: 'Glow',
    tagline: 'Golden hour, op afroep.',
    heroPhoto: '/img/lifestyle-glow-01.webp',
    cardPhoto: '/img/lifestyle-glow-01.webp',
    beforeAfter: { before: '/img/lifestyle-glow-03.webp', after: '/img/lifestyle-glow-01.webp' },
    cardIcon: 'jar',
    cardDesc: 'Gedurfde lifestylefoto’s geïnspireerd op fashion-editorial — directe on-camera flits, scherp contrast, sterke schaduwen, moderne campagne-esthetiek.',
    moodTitle: 'Hoe Glow eruitziet.',
    moodParagraphs: [
      'Laagstaande zon, zachte gloed, huid en product gehuld in hetzelfde amberkleurige licht. De look van een avond die goed verliep.',
      'Editorial-merken gebruiken dit licht omdat het alles flatteert wat het raakt. Nu is het een instelling, geen locatieshoot van twee weken.',
    ],
    steps: [
      { title: 'Jaag op golden hour', body: 'Warm, laaghoekig licht op elk kader, zonder uitzondering.' },
      { title: 'Style de scène', body: 'Kleding, props en setting die aantrekkelijk aanvoelen, niet in scène gezet.' },
      { title: 'Grade voor warmte', body: 'Een consistente, editorial kleurafwerking over de hele set.' },
    ],
    grid: grid(
      ['/img/lifestyle-glow-01.webp', '/img/lifestyle-glow-02.webp', '/img/lifestyle-glow-03.webp', '/img/lifestyle-glow-04.webp', '/img/lifestyle-glow-05.webp', '/img/lifestyle-glow-06.webp'],
      ['bottle', 'sneaker', 'jar', 'bag', 'bottle', 'sneaker', 'jar', 'bag', 'bottle']
    ),
    craft: [
      { title: 'Een afgestemde warmtecurve', body: 'Onze gouden tint is geen filter — het is een gekalibreerde grade die de productkleur eerlijk houdt terwijl alles eromheen opwarmt.' },
      { title: 'Gloed onder controle', body: 'De zachtheid van highlights wordt per materiaal gedoseerd: glas gloeit, stof vlekt niet, metaal houdt zijn scherpte.' },
      { title: 'Scènes gebouwd voor schemering', body: 'Sets, oppervlakken en props zijn gekozen om laag licht geloofwaardig te maken — balkons, linnen, late interieurs.' },
      { title: 'Harmonie tussen model en licht', body: 'Wanneer een model het product draagt, worden huidtint en producttint in dezelfde grade in balans gebracht, nooit botsend.' },
    ],
    why: [
      { title: 'Verkoopt een gevoel, niet alleen een product', body: 'De sfeer waar beauty- en fashion-kopers echt op reageren.' },
      { title: 'Campagnekwaliteit, elke bestelling', body: 'Geen aparte \'hero shot\'-laag — deze afwerking is de standaard.' },
      { title: 'Eén consistente gloed', body: 'Dezelfde warmte over je hele feed, launch na launch.' },
    ],
    bestFor: ['Beauty, skincare en parfum', 'Fashion die een gevoel verkoopt', 'Campagnes en launches die sfeer nodig hebben', 'Merken die een feed bouwen waar mensen bij willen horen'],
    whatYouGet: [SET, 'Warme, editorial golden-hour scènes', 'Consistente modellen, vastgezet op je merk', 'Campagnekwaliteit-afwerking op elke lifestylefoto', TIMING, REVIEW],
  },
  {
    slug: 'phone-made',
    orderHref: '/nl/start/lifestyle/?style=phone-made',
    name: 'Phone-made',
    tagline: 'Ziet eruit alsof het zo gemaakt is. Dat is het niet.',
    heroPhoto: '/img/lifestyle-phone-made-01.webp',
    cardPhoto: '/img/lifestyle-phone-made-11.webp',
    beforeAfter: { before: '/img/lifestyle-phone-made-05.webp', after: '/img/lifestyle-phone-made-01.webp' },
    cardIcon: 'bottle',
    cardDesc: 'Minimalistische lifestylefoto’s die lijken op authentieke, alledaagse fotografie — natuurlijk en ongepolijst, als een foto die iemand net even maakte.',
    moodTitle: 'Hoe Phone-made eruitziet.',
    moodParagraphs: [
      'Daglicht door een raam, een product op een aanrecht, een licht imperfect kader. Het leest als echt.',
      'Deze stijl laat een feed je vertrouwen. Geen studioglans, geen harde verkoop. Gewoon je product in een geloofwaardig leven.',
    ],
    steps: [
      { title: 'Zet het licht', body: 'Eén raam of lamp, niets geënsceneerd — licht zoals het thuis echt valt.' },
      { title: 'Alsof je het zelf even hebt gemaakt', body: 'Natuurlijke hoeken en een beetje scheef, zonder dat het er stijf van een statief uitziet.' },
      { title: 'Snijd uit voor de feed', body: 'Gekaderd voor het platform waar het landt, vanaf de allereerste versie.' },
    ],
    grid: grid(
      ['/img/lifestyle-phone-made-02.webp', '/img/lifestyle-phone-made-03.webp', '/img/lifestyle-phone-made-04.webp', '/img/lifestyle-phone-made-05.webp', '/img/lifestyle-phone-made-06.webp', '/img/lifestyle-phone-made-07.webp', '/img/lifestyle-phone-made-08.webp', '/img/lifestyle-phone-made-09.webp', '/img/lifestyle-phone-made-10.webp'],
      ['bottle', 'sneaker', 'jar', 'bag', 'bottle', 'sneaker', 'jar', 'bag', 'bottle']
    ),
    craft: [
      { title: 'Geëngineerde imperfectie', body: 'Lichte kanteling, natuurlijke lichtafval, eerlijke schaduwen — elk \'ongelukje\' is bewust geplaatst, zodat het gevonden aanvoelt in plaats van geënsceneerd.' },
      { title: 'Daglichtlogica', body: 'Elke scène houdt zich aan één lichtbron en één tijdstip van de dag. Dat scheidt geloofwaardig van griezelig.' },
      { title: 'Aankleding die fluistert', body: 'Props zijn zo gekozen dat ze niets dateren en van niets afleiden. Het product blijft het luidste in beeld.' },
      { title: 'Feed-first kadering', body: 'Vooraf gecomponeerd voor 4:5 en 9:16, zodat niets belangrijks sneuvelt in de uitsnede.' },
    ],
    why: [
      { title: 'Leest als echt', body: 'Geen studioverklikker — gemaakt om naast UGC te staan zonder ooit op te vallen.' },
      { title: 'Vertrouwen vóór glans', body: 'De look die presteert wanneer een publiek wantrouwig is tegenover alles wat te gestyled is.' },
      { title: 'Meteen goed voor je feed', body: 'Je hoeft er niets meer uit te snijden — de verhouding klopt al zoals je hem krijgt.' },
    ],
    bestFor: ['Social-first merken en UGC-achtige advertenties', 'Producten die verkopen op herkenbaarheid', 'Ondernemers die eerst vertrouwen opbouwen en dan glans', 'Organische content die er niet als advertentie uit mag zien'],
    whatYouGet: [SET, 'Authentieke, telefoon-echte lifestyle-scènes', 'Natuurlijke belichting met één lichtbron', 'Feed-klare uitsnedes vanaf dag één', TIMING, REVIEW],
  },
  {
    slug: 'custom',
    name: 'Eigen look',
    tagline: 'Je eigen wereld, gebouwd rond je product.',
    priceTrust: 'Op aanvraag',
    priceUnit: '',
    heroPhoto: '/img/banners-13.webp',
    cardPhoto: '/img/banners-13.webp',
    cardIcon: 'bag',
    cardDesc: 'Geen van onze vier vaste sferen — een lifestyle-scène op maat, ontworpen vanuit jouw referenties.',
    /* ── NIET MEER NAAR HET BESTELFORMULIER, 18 augustus 2026 ──────────────
       Lucas: een stijl op maat heeft geen standaardtarief; die prijs volgt pas
       als de klant heeft gezegd wat hij wil. Deze knop wees naar het formulier
       dat een prijs uitrekent, terwijl de regel erboven op deze zelfde pagina
       "Op aanvraag" zegt. Nu naar de aanvraagpagina — zie
       StylePicker.astro en het 'custom-look'-blok in HoldingPage.astro. */
    orderHref: '/nl/start/custom-look/',
    orderLabel: 'Vraag een eigen look aan',
    moodParagraphs: [
      'Geen van onze vier vaste sferen — een scène ontworpen vanuit jouw referenties. De setting, de styling en het licht die alleen bij jouw merk passen.',
      'We bouwen de wereld één keer, samen met jou, en houden daarna elke toekomstige lifestylefoto daaraan trouw.',
    ],
    steps: [
      { title: 'Brief', body: 'Deel referenties en de wereld waarin je je product wilt laten leven.' },
      { title: 'Ontwerp', body: 'We vormen een scène op maat en een stylingrichting, samen met jou gecontroleerd.' },
      { title: 'Produceer', body: 'Je lifestylefoto’s op maat, consistent van bestelling tot bestelling.' },
    ],
    grid: grid(
      ['/img/banners-14.webp'],
      ['bottle', 'sneaker', 'jar', 'bag', 'bottle', 'sneaker', 'jar', 'bag', 'bottle']
    ),
    bestFor: [
      'Merken met een specifieke wereld voor ogen',
      'Concepten die onze vier sferen niet dekken',
      'Campagnes die hun eigen handtekening nodig hebben',
      'Assortimenten waar de scène het verhaal is',
    ],
    whatYouGet: [
      'Een lifestyle-concept op maat, samen met jou ontworpen',
      'Scène, styling en licht afgestemd op je merk',
      'Consistent bij elke toekomstige bestelling',
      'Een heldere prijs, afgesproken voordat we beginnen',
      'Eén ontwerpbedrag op schrift; elke carousel daarna tegen het gewone lifestyle-tarief voor dat aantal',
      'Van jou: we gebruiken de look niet voor een ander merk',
      'Daarna een eigen tegel in je account en in het bestelformulier',
    ],
  },
];

export function getStyle(slug) {
  return styles.find((s) => s.slug === slug);
}
