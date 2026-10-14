/*
 * VISUAILS — de beelden die Lucas nog maakt, en waar ze komen. 8 oktober 2026 (1.02).
 *
 * Lucas koos V13 = a: *alles buiten het pad naar betalen blijft verborgen tot er
 * een beeld is.* Een sectie waarvan het beeld nog een plaatshouder zou worden
 * (geen bestand in public/img, zie src/lib/beeldAanwezig.js) staat dan niet op
 * de pagina; er verschijnt geen grijs vlak. Op het pad naar betalen — de
 * lookkaarten op de voorpagina, /start, /catalog#looks, /lifestyle#looks en het
 * bestelformulier — blijft een plaatshouder wél staan (`betaalpad: true`).
 *
 * DEZE LIJST is wat /admin/diagnose toont onder "Beelden die nog ontbreken":
 * per beeld de plek en de bestandsnaam. Leg het bestand onder die naam in
 * public/img (een -w760/-w1560 ernaast mag), rol uit, en de sectie staat er.
 * Geen code nodig.
 *
 * Puur gegevens: geen fs, dus ook bruikbaar in de Worker (admin.js).
 * tests/plaatshouders-pad.test.mjs controleert dat elk grijs vlak in de build
 * hier staat, en dat wat hier staat zonder betaalpad nergens als grijs vlak
 * verschijnt.
 */
import { STOCK_ON_BRAND } from './pricing.js';

/* 12 oktober 2026: de hal is de voorpagina. Twee beelden zijn van de lijst,
   omdat hun plek niet meer bestaat: editions-breed (het blok Editions) en
   editions-staand (de Editions-kaart in de stijlenstrook) stonden alleen op de
   oude voorpagina, en de hal heeft geen van beide. dienst-video-shirt stond ook
   in "Wat je stuurt. Wat je terugkrijgt." op de oude voorpagina; hij blijft voor
   de videorij op /gallery. */
export const BEELDEN_NODIG = [
  {
    naam: 'dienst-video-shirt',
    bestand: '/img/dienst-video-shirt.webp',
    maat: '1080 × 1920 px (9:16), staand',
    plek: '/gallery — de videorij (verborgen tot het beeld er is)',
    wat: 'De eerste frame van de productclip van het gewassen zwarte T-shirt — hetzelfde shirt als de telefoonfoto links op de dia.',
  },
  /* 14 oktober 2026 (afvinklijst 24, v24-laptop): de carrousel heeft de vier vaste beelden.
     "Volledig" (lifestyle-band-08) bestaat niet meer; het beeld dat nog ontbreekt, is "Alleen het product". */
  {
    naam: 'lifestyle-flash-product',
    bestand: '/img/lifestyle-flash-product.webp',
    maat: '928 × 1152 px (4:5), staand',
    plek: 'De laptop op de voorpagina en op /lifestyle — het derde beeld van de lifestylecarrousel, "Alleen het product" (tot dan staat er een plaat met die naam)',
    wat: 'Dezelfde look als lifestyle-flash-03 (avond, flits): het product zonder model, in dezelfde scène.',
  },
  {
    naam: 'lucas',
    bestand: '/img/lucas.webp',
    maat: '1200 × 1500 px (4:5), staand',
    plek: '/about — het portret naast de opening (verborgen tot het beeld er is)',
    wat: 'Een portret van de oprichter, voor de opening van /about.',
  },
  {
    naam: 'hooks-kop',
    bestand: '/img/hooks-kop.webp',
    maat: '1200 × 1500 px (4:5), staand',
    plek: '/hooks — het beeld naast de kop (verborgen tot het beeld er is)',
    wat: 'Eén hookvideo, stilgezet op het frame waar de naad zit: bovenin het einde van de video, eronder het beeld uit de feed dat er precies op aansluit.',
  },
  {
    naam: 'editions-maandgrid',
    bestand: '/img/editions-maandgrid.webp',
    maat: '1200 × 1500 px (4:5), staand',
    plek: '/editions — het beeld naast de kop (verborgen tot het beeld er is)',
    wat: `Een maandraster van ${STOCK_ON_BRAND} beelden voor één merk — steeds dezelfde kleuren en hetzelfde licht, en in geen enkel beeld een product.`,
  },
  {
    naam: 'lifestyle-band-04',
    bestand: '/img/lifestyle-band-04.webp',
    maat: '1800 × 1005 px, liggend (zoals lifestyle-band-01)',
    plek: 'Bestelformulier lifestyle en abonnement — het strookje voorbeeldbeelden in het overzicht. Pad naar betalen: blijft als plaatshouder staan tot het er is.',
    wat: 'Een lifestylebeeld in een tweede look (een andere dan lifestyle-band-01).',
    betaalpad: true,
  },
];

/** Eén regel uit de lijst, of null. */
export function beeldNodig(naam) {
  return BEELDEN_NODIG.find((b) => b.naam === naam) || null;
}
