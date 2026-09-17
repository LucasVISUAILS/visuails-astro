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

import { localizedPath } from '../i18n/ui.js';

const HELE = '/img/laptop/voor_heel.webp';

export function laptopSlides(lang = 'nl') {
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
        src: '/img/ba2-na-front.webp', naam: nl ? 'Voorkant' : 'Front',
        alt: nl ? 'De broek recht van voren op een witte grond' : 'The jeans straight on against white',
        fon: '/img/ba2-voor-front.webp',
        fonAlt: nl ? 'Telefoonfoto: de broek plat op een betonnen magazijnvloer, voorkant'
                   : 'Phone photo: the jeans flat on a concrete warehouse floor, front',
      },
      {
        src: '/img/ba2-na-achter.webp', naam: nl ? 'Achterkant' : 'Back',
        alt: nl ? 'Dezelfde broek van achteren' : 'The same jeans from the back',
        fon: '/img/ba2-voor-achter.webp',
        fonAlt: nl ? 'Telefoonfoto: dezelfde broek omgedraaid, achterkant'
                   : 'Phone photo: the same jeans turned over, back',
      },
      {
        src: '/img/ba2-na-model.webp', naam: nl ? 'Op model' : 'On model',
        alt: nl ? 'De broek gedragen door een model' : 'The jeans worn by a model',
        fon: '/img/ba2-voor-pasvorm.webp',
        fonAlt: nl ? 'Spiegelselfie waarop de broek gedragen wordt' : 'Mirror selfie of the jeans being worn',
      },
      {
        src: '/img/ba2-na-detail.webp', naam: nl ? 'Detail' : 'Detail',
        alt: nl ? 'Close-up van de knoop en de tailleband' : 'Close-up of the button and waistband',
        fon: '/img/ba2-voor-detail.webp',
        fonAlt: nl ? 'Telefoonfoto: een hand houdt de tailleband met de knoop omhoog'
                   : 'Phone photo: a hand holding up the waistband and button',
      },
    ],
  };

  const lifestyle = {
    fon: HELE, duur: 2600,
    fonAlt: nl ? 'Telefoonfoto van de klant: de hele broek plat op een betonnen magazijnvloer'
               : "The customer’s phone photo: the whole garment flat on a concrete floor",
    naam: nl ? 'Lifestyle-carousel · 3 beelden' : 'Lifestyle carousel · 3 images',
    href: lp('/lifestyle'),
    alt: nl ? 'Drie lifestyle-beelden als carousel in een nagebouwd social-bericht'
            : 'Three lifestyle images as a carousel in a mocked-up social post',
    beelden: [
      { src: '/img/lifestyle-flash-03.webp', naam: nl ? 'Opening' : 'Opening',
        alt: nl ? 'Model in een wit gewatteerd jack, avondopname met flits' : 'Model in a white puffer jacket, night flash shot' },
      { src: '/img/lifestyle-band-08.webp', naam: nl ? 'Volledig' : 'Full length',
        alt: nl ? 'Dezelfde look ten voeten uit op straat' : 'The same look head to toe on the street' },
      { src: '/img/lifestyle-flash-01.webp', naam: 'Detail',
        alt: nl ? 'Close-up van de broek en de schoenen' : 'Close-up of the trousers and shoes' },
    ],
    post: {
      naam: 'visuails_com',
      avatar: '/img/merk-tegel.webp',
      vlag: nl ? 'Door AI gegenereerd' : 'AI generated',
      bijschrift: nl
        ? ['Eén telefoonfoto erin. Een hele carousel eruit.', 'Zelfde look, drie beelden, klaar om te plaatsen.']
        : ['One phone photo in. A whole carousel out.', 'Same look, three images, ready to post.'],
      reacties: nl
        ? [
            { naam: 'studio.novem', tekst: 'Dit scheelt ons een hele shootdag', tijd: '2 d' },
            { naam: 'mara.vanhoorn', tekst: 'De derde is mijn favoriet', tijd: '2 d' },
            { naam: 'wolkenkade', tekst: 'Hoe lang duurt zoiets?', tijd: '1 d' },
            { naam: 'atelier.brecht', tekst: 'Zo strak', tijd: '1 d' },
            { naam: 'nova.bergman', tekst: 'Welke stijl is dit?', tijd: '1 d' },
            { naam: 'kade.en.co', tekst: 'Het licht op de tweede', tijd: '22 u' },
          ]
        : [
            { naam: 'studio.novem', tekst: 'This saves us a whole shoot day', tijd: '2 d' },
            { naam: 'mara.vanhoorn', tekst: 'The third one is my favourite', tijd: '2 d' },
            { naam: 'wolkenkade', tekst: 'How long does this take?', tijd: '1 d' },
            { naam: 'atelier.brecht', tekst: 'So clean', tijd: '1 d' },
            { naam: 'nova.bergman', tekst: 'Which style is this?', tijd: '1 d' },
            { naam: 'kade.en.co', tekst: 'That light on the second one', tijd: '22 h' },
          ],
      likes: nl ? '412 vind-ik-leuks' : '412 likes',
      kort: nl ? '2 d' : '2 d',
      datum: nl ? '2 dagen geleden' : '2 days ago',
    },
  };

  const video = {
    src: '/img/laptop/uit_video.webp', fon: HELE, duur: 3200,
    fonAlt: nl ? 'Telefoonfoto van de klant: de hele broek plat op een betonnen magazijnvloer'
               : "The customer’s phone photo: the whole garment flat on a concrete floor",
    naam: nl ? 'Videoclip · verticaal' : 'Video clip · vertical',
    href: lp('/video'),
    alt: nl ? 'Een verticale clip, gesneden voor Reels en TikTok' : 'A vertical clip, cut for Reels and TikTok',
  };

  return { catalog, lifestyle, video };
}

/* De hele reeks, in de volgorde waarin de voorpagina hem afspeelt. */
export function laptopReeks(lang = 'nl') {
  const s = laptopSlides(lang);
  return [s.catalog, s.lifestyle, s.video];
}
