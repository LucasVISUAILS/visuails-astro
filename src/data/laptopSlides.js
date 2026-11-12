// VISUAILS — wat er op het laptopscherm te zien is, per dienst.
//
// Stond eerst in LaptopCarousel.astro zelf. Dat kon zolang de carousel alleen
// op de voorpagina stond; nu hij ook op /catalog, /upload-guidelines en een
// aantal andere pagina's komt, moet een pagina kunnen zeggen WELKE dienst hij
// toont — en moet dat in twee talen kunnen, want elke productiepagina wordt
// door zowel de EN- als de NL-route gedeeld.
//
// ══════════════════════════════════════════════════════════════════════
// WAT HIER ECHT IS EN WAT NIET — LEES DIT VOORDAT JE DIT ERGENS PLAATST
// ══════════════════════════════════════════════════════════════════════
// CATALOG is echt. De vier geleverde beelden zijn daadwerkelijk gemaakt van de
// vier telefoonfoto's die ernaast staan: voorkant bij voorkant, achterkant bij
// achterkant, de spiegelselfie bij het modelbeeld en de hand met de knoop bij
// het detail. Dit paar mag overal staan waar het als bewijs moet werken.
//
// LIFESTYLE is dat NIET. Er bestaat geen lifestyle-carousel van dit
// kledingstuk, dus daar staan nu drie sfeerbeelden van ANDERE producten. Als
// compositie klopt het, als bewering niet. Deze hoort dus NIET op /lifestyle of
// op een lifestylestijlpagina, want daar leest hij als bewijs. Op de voorpagina
// kan hij mee zolang hij als voorbeeld van de werkwijze leest — en zodra er een
// echte set van één kledingstuk is, is het drie bestanden vervangen.
//
// VIDEO wacht op de clip. Het `video`-veld staat er met opzet niet in: een
// verwijzing naar een bestand dat niet bestaat is een 404 bij elke
// paginaweergave. Zodra de clip er is, komt hier `video` en `duur` bij.
// ══════════════════════════════════════════════════════════════════════

import { LIFESTYLE_IMAGES, LEVERVLAKKEN } from './pricing.js';
import { localizedPath } from '../i18n/ui.js';

const HELE = '/img/laptop/voor_heel.webp';

export function laptopSlides(lang = 'nl', { product = 'standaard' } = {}) {
  const nl = lang === 'nl';
  const lp = (p) => localizedPath(lang, p);

  const catalog = {
    fon: HELE, duur: 2300, schim: true,
    naam: nl ? 'Catalogset · 4 beelden' : 'Catalog set · 4 images',
    href: lp('/catalog'),
    alt: nl
      ? 'De vier afgewerkte catalogbeelden van deze broek in de galerij van een productpagina'
      : 'The four finished catalog images of these jeans in a product page gallery',
    beelden: [
      {
        src: '/img/ba2-na-front-grijs.webp', naam: nl ? 'Voorkant' : 'Front',
        alt: nl ? 'De broek recht van voren op een lichtgrijze grond' : 'The jeans straight on against light grey',
        fon: '/img/ba2-voor-front.webp',
        fonAlt: nl ? 'Telefoonfoto: de broek plat op een betonnen magazijnvloer, voorkant'
                   : 'Phone photo: the jeans flat on a concrete warehouse floor, front',
      },
      {
        src: '/img/ba2-na-achter-grijs.webp', naam: nl ? 'Achterkant' : 'Back',
        alt: nl ? 'Dezelfde broek van achteren' : 'The same jeans from the back',
        fon: '/img/ba2-voor-achter.webp',
        fonAlt: nl ? 'Telefoonfoto: dezelfde broek omgedraaid, achterkant'
                   : 'Phone photo: the same jeans turned over, back',
      },
      {
        /* Sinds 15 oktober 08:14 staat elk beeld in een vierkant vak op zijn eigen 1:1
           (zie .sc-hoofd in hal.css); de `vul` van 05:59 is daarmee overbodig. */
        src: '/img/ba2-na-model-grijs.webp', naam: nl ? 'Op model' : 'On model',
        alt: nl ? 'De broek gedragen door een model' : 'The jeans worn by a model',
        fon: '/img/ba2-voor-pasvorm.webp',
        fonAlt: nl ? 'Spiegelselfie waarop de broek gedragen wordt' : 'Mirror selfie of the jeans being worn',
      },
      {
        src: '/img/ba2-na-detail-grijs.webp', naam: nl ? 'Detail' : 'Detail',
        alt: nl ? 'Close-up van de knoop en de tailleband' : 'Close-up of the button and waistband',
        fon: '/img/ba2-voor-detail.webp',
        fonAlt: nl ? 'Telefoonfoto: een hand houdt de tailleband met de knoop omhoog'
                   : 'Phone photo: a hand holding up the waistband and button',
      },
    ],
  };

  /* ── DE HOODIE IN DE OPENING — 12 november 2026 (levering 94) ──────────────────────────────────────
     Lucas, 07:46: "Ik wil dat je de roze broek in de laptop vervangt met … NONSTD\\Hoodie, deze hoodie. Zorg ervoor dat de
     achtergrond van de shop in de laptop dezelfde achtergrond heeft zodat de producten er mooi in verwerkt worden."
     Alleen de laptop van de voorpagina (openingStanden.js, product 'hoodie'); de andere laptops hebben vaste foto's van de
     broek (public/img/hal/stand/) en blijven zo tot die opnieuw gemaakt worden. De vier beelden staan op (251, 252, 255),
     de grond van de site: de winkel krijgt diezelfde grond (.sc-shop.sc-wit in hal.css). Eén telefoonfoto (Phone.png):
     de hoodie plat op beton. */
  if (product === 'nonstd') {
    /* 08:08: "Ik wil deze foto's veranderen naar een sectie "Voorgestelde producten". Hier staan de sokken en de broek die
       ook in de map staan … De klant kan hier dan op klikken en de andere producten bekijken." Drie productpagina's (de
       hoodie, de broek, de sokken), elk met de andere twee als voorgestelde producten; in de opening is elke pagina een
       stand, en een klik op een voorgesteld product gaat naar zijn stand. De prijzen zijn verzonnen, van een verzonnen
       winkel (de hoodie € 129,95: Lucas, 08:01, "Wat meer premium geprijsd"; de broek en de sokken: mijn voorstel).
       `fon`: de telefoonfoto van dat product (Phone.png in zijn map; die van de broek en de sokken kwamen om 08:19).
       `kleur`: de drie kleurbolletjes, per product (08:19: "Denk er ook aan om de kleuren correct toe te passen en te
       varieren"): de eerste is de kleur van het product op de foto (gemeten), de andere twee passen bij dat product. */
    const P = (naam, nlNaam, enNaam, prijsNl, prijsEn, kruimelNl, kruimelEn, fon, kleur, beelden) => ({ naam, titel: nl ? nlNaam : enNaam, prijs: nl ? prijsNl : prijsEn, kruimel: nl ? kruimelNl : kruimelEn, fon, kleur, beelden });
    const B = (src, vul, nlAlt, enAlt) => ({ src, vul, alt: nl ? nlAlt : enAlt });
    const producten = [
      P('hoodie', 'Zip hoodie', 'Zip hoodie', '€ 129,95', '€129.95', 'Home / Hoodies', 'Home / Hoodies', '/img/hoodie-voor.webp', ['#465692', '#2B2B33', '#8C909A'], [
        B('/img/hoodie-na-front.webp', 'contain', 'De hoodie recht van voren op wit', 'The hoodie straight on against white'),
        B('/img/hoodie-na-achter.webp', 'contain', 'Dezelfde hoodie van achteren', 'The same hoodie from the back'),
        /* 07:59: "De on-model mag wel zijn eigen achtergrond behouden omdat dit zo bedoeld was": de foto uit de map zelf
           (On-model.jpg, niet die uit Site/), vult zijn vak, van boven (het hoofd blijft heel) */
        B('/img/hoodie-na-model.webp', 'boven', 'De hoodie gedragen door een model', 'The hoodie worn by a model'),
        B('/img/hoodie-na-detail.webp', 'cover', 'Close-up van de capuchon, de rits en het label', 'Close-up of the hood, the zip and the label')]),
      P('broek', 'Logo jeans', 'Logo jeans', '€ 149,95', '€149.95', 'Home / Denim', 'Home / Denim', '/img/nonstd-broek-voor.webp', ['#322F3A', '#4F6385', '#C3C9D4'], [
        B('/img/nonstd-broek-front.webp', 'contain', 'De jeans recht van voren op wit', 'The jeans straight on against white'),
        B('/img/nonstd-broek-achter.webp', 'contain', 'Dezelfde jeans van achteren', 'The same jeans from the back'),
        B('/img/nonstd-broek-model.webp', 'boven', 'De jeans gedragen door een model', 'The jeans worn by a model'),
        B('/img/nonstd-broek-detail.webp', 'cover', 'Close-up van het logo en het koord', 'Close-up of the logo and the drawstring')]),
      P('sokken', 'Logo sokken', 'Logo socks', '€ 24,95', '€24.95', 'Home / Accessoires', 'Home / Accessories', '/img/nonstd-sokken-voor.webp', ['#E4E3DE', '#2B2B33', '#9AA0AA'], [
        B('/img/nonstd-sokken-front.webp', 'contain', 'De sokken gekruist op wit', 'The socks crossed against white'),
        B('/img/nonstd-sokken-achter.webp', 'contain', 'De sokken naast elkaar', 'The socks side by side'),
        B('/img/nonstd-sokken-model.webp', 'boven', 'De sokken gedragen, in slippers', 'The socks worn, with slides'),
        B('/img/nonstd-sokken-detail.webp', 'cover', 'Close-up van het logo op de sok', 'Close-up of the logo on the sock')]),
    ];
    catalog.product = 'nonstd';
    catalog.producten = producten;
    catalog.fon = producten[0].fon;
    catalog.alt = nl ? 'Drie productpagina’s van een webshop, elk met de vier catalogbeelden van één product'
                     : 'Three product pages of a web shop, each with the four catalog images of one product';
    /* één stand per product: het eerste beeld staat groot */
    catalog.beelden = producten.map((p) => ({ ...p.beelden[0], naam: p.titel, product: p.naam, fon: p.fon || undefined }));
  }

  const lifestyle = {
    fon: HELE, duur: 2600,
    fonAlt: nl ? 'Telefoonfoto van de klant: de hele broek plat op een betonnen magazijnvloer'
               : "The customer’s phone photo: the whole garment flat on a concrete floor",
    naam: nl ? `Lifestylecarrousel · ${LIFESTYLE_IMAGES} beelden` : `Lifestyle carousel · ${LIFESTYLE_IMAGES} images`,
    href: lp('/lifestyle'),
    alt: nl ? 'Lifestyle-beelden als carrousel in een nagebouwd social-bericht'
            : 'Lifestyle images as a carousel in a mocked-up social post',
    /* De vier vaste beelden van een carrousel, met hun vaste namen (LEVERVLAKKEN in
       pricing.js). Afvinklijst 24, v24-laptop = a: voor "Alleen het product" is er in
       de flash-look nog geen foto; tot Lucas er een levert staat er een plaat met de
       naam (`plaat`). Leg hem neer als public/img/lifestyle-flash-product.webp en de
       plaat wordt bij de volgende build een foto. Hier stonden Opening, Achterkant,
       Volledig (lifestyle-band-08, dat er niet was) en Detail. */
    beelden: LEVERVLAKKEN.lifestyle[nl ? 'nl' : 'en'].map((naam, i) => ({ naam, ...[
      { src: '/img/lifestyle-flash-03.webp',
        alt: nl ? 'Op model, van voren: een wit gewatteerd jack, avondopname met flits' : 'On model, from the front: a white puffer jacket, night flash shot' },
      { src: '/img/lifestyle-flash-05.webp',
        alt: nl ? 'Hetzelfde model van achteren, op straat bij nacht' : 'The same model from behind, on the street at night' },
      { src: '/img/lifestyle-flash-product.webp', plaat: true,
        alt: nl ? 'Alleen het product, in dezelfde scène (foto volgt)' : 'The product on its own, in the same scene (photo to follow)' },
      { src: '/img/lifestyle-flash-01.webp',
        alt: nl ? 'Detail op het model: de broek en de schoenen van dichtbij' : 'Detail on the model: the trousers and shoes up close' },
    ][i] })),
    post: {
      naam: 'visuails_com',
      avatar: '/img/merk-tegel.webp',
      vlag: nl ? 'Door AI gegenereerd' : 'AI generated',
      /* 12 oktober 2026: hier stond "Eén telefoonfoto erin" / "One phone photo
         in". Dat is de belofte die op 8 augustus overal van de site ging: een
         bestelling vraagt de verplichte hoeken (shots.js), niet één foto. Het
         bijschrift staat klein in de laptop op de voorpagina en op /lifestyle,
         en zegt nu wat de dienstband van de hal ook zegt: een paar foto's. */
      bijschrift: nl
        ? ['Een paar telefoonfoto’s erin. Een hele carrousel eruit.', 'Zelfde look, vier beelden, klaar om te plaatsen.']
        : ['A few phone photos in. A whole carousel out.', 'Same look, four images, ready to post.'],
      /* ── GEEN VERZONNEN MENSEN MEER — 20 september 2026 ──────────────────
         Hier stonden zes accountnamen met zes uitspraken, in twee talen. Zie de
         noot bij `interface Reactie` in LaptopCarousel.astro voor waarom die
         eruit zijn: een verzonnen handle kan morgen een echt account zijn, en
         twee van de zes lazen als een aanbeveling van iemand die niet bestaat.

         Wat blijft is de VORM: zes rijen met een naambalkje en een tekstbalkje,
         in wisselende breedtes zodat het leest als een gesprek en niet als een
         tabel. Twee getallen per rij, tussen 0 en 1. Ze zijn niet meer per taal
         verschillend, want er staat geen taal meer in. */
      reacties: [
        { naam: 0.5, tekst: 0.9 },
        { naam: 0.6, tekst: 0.6 },
        { naam: 0.4, tekst: 0.7 },
        { naam: 0.5, tekst: 0.4 },
        { naam: 0.6, tekst: 0.5 },
        { naam: 0.4, tekst: 0.8 },
      ],
      /* Het aantal is een balkje geworden: een getal is een bewering, ook
         als niemand het gelooft. Zie dezelfde noot. */
      likes: '',
      kort: nl ? '2 d' : '2 d',
      datum: nl ? '2 dagen geleden' : '2 days ago',
    },
  };

  /* ── DE CLIP VULT HET SCHERM — 18 september 2026 ──────────────────────────
     Lucas: *"De video op de laatste slide moet gevuld worden in het hele
     scherm."* Hij stond als één plaat van 1200 × 728 in het scherm, met de
     verticale clip in het midden en aan weerszijden dood zwart: gemeten liep de
     inhoud van kolom 239 tot 653, dus ruim de helft van het laptopscherm was
     leeg.

     Een verticale clip kan een liggend scherm niet vullen zonder er hard in te
     snijden — dat is geen bug maar meetkunde. Wat een videospeler in dat geval
     doet, doen wij nu ook: de clip zelf staat scherp en op volle hoogte in het
     midden, en achter hem staat diezelfde clip uitvergroot en onscherp als
     grond. Het scherm is vol, de clip is heel, en het leest als een speler in
     plaats van als een plaat met randen.

     `staand` is dus het bestand ZONDER dat dode zwart — uitgesneden uit de
     oorspronkelijke plaat, niet opnieuw geschoten. Komt er een echte clip, dan
     vervangt hij dit veld en werkt dezelfde opmaak. */
  const video = {
    src: '/img/laptop/uit_video.webp',
    staand: '/img/laptop/uit_video_clip.webp',
    fon: HELE, duur: 3200,
    fonAlt: nl ? 'Telefoonfoto van de klant: de hele broek plat op een betonnen magazijnvloer'
               : "The customer’s phone photo: the whole garment flat on a concrete floor",
    naam: nl ? 'Videoclip · verticaal' : 'Video clip · vertical',
    href: lp('/video'),
    alt: nl ? 'Een verticale clip, gesneden voor Reels en TikTok' : 'A vertical clip, cut for Reels and TikTok',
  };

  return { catalog, lifestyle, video };
}

/* De hele reeks, in de volgorde waarin de voorpagina hem afspeelt. */
export function laptopReeks(lang = 'nl', opties = {}) {
  const s = laptopSlides(lang, opties);
  return [s.catalog, s.lifestyle, s.video];
}
