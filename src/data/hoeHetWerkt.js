/**
 * HOE HET WERKT — de woorden van de drie stappen per dienst (levering 81, 1 november 2026).
 *
 * Stond tot levering 80 in VoorpaginaHal.astro (COPY), toen Hoe het werkt met de animaties op de
 * voorpagina stond. Sinds 80 toont de voorpagina alleen de drie stapnamen (HalHoeKort80), en staat
 * Hoe het werkt met de animaties op /catalog, /lifestyle en /video (HalHoeDienst.astro; Lucas, 1
 * november, 22:10: "Ja, nu meenemen"). Eén bron voor beide: VoorpaginaHal leest hier `stappen`,
 * HalHoeDienst de rest. De woorden zelf zijn niet veranderd; Lucas kijkt de teksten zelf na.
 *
 * Getallen komen uit de code: het aantal foto's uit shots.js (de verplichte hoeken), de levertijd uit
 * levertijdDelen() (pricing.js), de vanafprijs uit ladderFloor().
 */
import { euro, ladderFloor, levertijdDelen } from './pricing.js';
import { telwoord } from './models.js';
import { REQUIRED_SHOT_IDS, SHOTS } from './shots.js';
import { styles as lifestyleEn } from './styles.js';
import { styles as lifestyleNl } from './styles.nl.js';

/* De namen van de verplichte foto's, als zin: "voorkant, achterkant en detail". */
const shotNamen = (l) => {
  const n = REQUIRED_SHOT_IDS.map((id) => SHOTS.find((x) => x.id === id).name[l].toLowerCase());
  return n.length < 2 ? n.join('') : `${n.slice(0, -1).join(', ')} ${l === 'nl' ? 'en' : 'and'} ${n[n.length - 1]}`;
};

/** De look die in de uitleg van lifestyle gekozen wordt (Flash), per taal. */
export const flashLook = (lang) => {
  const lijst = lang === 'nl' ? lifestyleNl : lifestyleEn;
  return lijst.find((s) => s.slug === 'flash') || lijst[0];
};

/** @param {'en'|'nl'} lang */
export function hoeHetWerkt(lang) {
  const e = (n) => euro(n, lang);
  /* tests/uploadbelofte.test.mjs: het aantal foto's komt uit de verplichte hoeken. */
  const FOTOS = telwoord(REQUIRED_SHOT_IDS.length, lang, true);
  /* midden in een zin: zonder hoofdletter */
  const fotos = telwoord(REQUIRED_SHOT_IDS.length, lang);
  const [snel, traag] = levertijdDelen('unattended', lang);
  const LEVERTIJD = traag ? `${snel}, ${traag}` : snel;
  const FLASH = flashLook(lang);
  const SHOT_NAMEN = shotNamen(lang);
  if (lang === 'nl') return {
    ctaStart: 'Start een bestelling', planCta: 'Sluit een abonnement af',
    feiten: [`Vanaf <b>${e(ladderFloor('catalog'))}</b> per product`, LEVERTIJD, 'Geen minimum'],
    hoeLabel: 'Hoe het werkt', hoeKop: ['Dit stuur jij.', 'Dit krijg je terug.'],
    stappen: [
      /* 25 okt, 16:28: niet "telefoonfoto's" ("een aanname dat de klant alleen met zijn telefoon
         foto's maakt") */
      ['Jij stuurt', `${FOTOS} foto’s van je product zijn genoeg om te beginnen.`, 'jouw foto’s'],
      ['Wij maken', `Het beeld dat je kiest, in jouw look. ${LEVERTIJD}.`, 'Elk beeld gelijk'],
      ['Jij keurt goed', 'Per beeld goedkeuren. Alles in één keer downloaden.', ''],
    ],
    goedgekeurd: (n) => `${n} van ${n} goedgekeurd`,
    inFormaat: (l) => `In het formaat dat jij kiest: ${l.slice(0, -1).join(', ')} of ${l[l.length - 1]}.`,
    compleet: 'Compleet',
    uitlegZinnen: [
      `Je uploadt ${fotos} foto’s per product: ${SHOT_NAMEN}. We kijken meteen of ze compleet zijn.`,
      'Wij maken elk beeld uit je foto’s, met dezelfde uitstraling voor je hele set.',
      'Je keurt per beeld goed, vraagt zo nodig een revisie en downloadt alles in één keer.',
    ],
    stapAlt: ['', 'De roze jeans, uitgeknipt en op lichtgrijs gezet, met de natuurlijke schaduw eronder'],
    /* 16:57, Lucas: geen "met de hand"-labels ("voelt veel te verdedigend"); alleen kort, tijdens
       de lagen, een zachte gloed om het product met dat het met AI gemaakt is. */
    gemaaktMetAI: 'Gemaakt met AI',
    stappenLifestyle: [
      ['Kies je look', 'Een look uit de collectie, of een eigen stijl die wij voor je merk ontwerpen.'],
      ['Upload je foto’s', 'Upload de foto’s van je product.'],
      ['Ontvang je beelden', `In de look die je koos. ${LEVERTIJD}.`],
    ],
    stappenVideo: [
      ['Kies je stijl', 'Een videostijl uit de collectie, of een eigen stijl voor je merk.'],
      ['Upload je foto’s', 'Upload de foto’s van je product.'],
      ['Ontvang je clip', 'Een korte, verticale clip van je product.'],
    ],
    uitlegLifestyle: [
      'Je kiest een look uit de collectie, of laat ons een eigen stijl voor je merk ontwerpen.',
      'Je uploadt de foto’s van je product. We kijken meteen of ze compleet zijn.',
      'Je ontvangt je beelden in de look die je koos, en downloadt alles in één keer.',
    ],
    uitlegVideo: [
      'Je kiest een videostijl, of laat ons er een voor je merk ontwerpen.',
      'Je uploadt de foto’s van je product. We kijken meteen of ze compleet zijn.',
      'Je ontvangt een korte, verticale clip van je product, voor reels en je webshop. Voorbeelden volgen binnenkort.',
    ],
    lookGekozen: `Look gekozen: ${FLASH.name}`,
    inDeLook: (n, look) => `${n} beelden in ${look}`,
    binnenkort: 'Voorbeelden volgen binnenkort',
    binnenkortKlip: 'Voorbeeldclips volgen binnenkort',
  };
  return {
    ctaStart: 'Start an order', planCta: 'Start a plan',
    feiten: [`From <b>${e(ladderFloor('catalog'))}</b> per product`, LEVERTIJD, 'No minimum'],
    hoeLabel: 'How it works', hoeKop: ['What you send.', 'What you get back.'],
    stappen: [
      ['You send', `${FOTOS} photos of your product are all you need to start.`, 'your photos'],
      ['We make', `The image you pick, in your look. ${LEVERTIJD}.`, 'Every image the same'],
      ['You approve', 'Approve image by image. Download everything at once.', ''],
    ],
    goedgekeurd: (n) => `${n} of ${n} approved`,
    inFormaat: (l) => `In the format you choose: ${l.slice(0, -1).join(', ')} or ${l[l.length - 1]}.`,
    compleet: 'Complete',
    uitlegZinnen: [
      `You upload ${fotos} photos per product: ${SHOT_NAMEN}. We check right away that they are complete.`,
      'We make every image from your photos, with the same look across your whole set.',
      'You approve image by image, ask for a revision if needed, and download everything at once.',
    ],
    stapAlt: ['', 'The pink jeans, cut out and set on light grey, with the natural shadow underneath'],
    gemaaktMetAI: 'Made with AI',
    stappenLifestyle: [
      ['Pick your look', 'A look from the collection, or a style of your own that we design for your brand.'],
      ['Upload your photos', 'Upload the photos of your product.'],
      ['Get your images', `In the look you picked. ${LEVERTIJD}.`],
    ],
    stappenVideo: [
      ['Pick your style', 'A video style from the collection, or a style of your own for your brand.'],
      ['Upload your photos', 'Upload the photos of your product.'],
      ['Get your clip', 'A short, vertical clip of your product.'],
    ],
    uitlegLifestyle: [
      'You pick a look from the collection, or have us design a style of your own for your brand.',
      'You upload the photos of your product. We check right away that they are complete.',
      'You get your images in the look you picked, and download everything at once.',
    ],
    uitlegVideo: [
      'You pick a video style, or have us design one for your brand.',
      'You upload the photos of your product. We check right away that they are complete.',
      'You get a short, vertical clip of your product, for reels and your shop. Examples are coming soon.',
    ],
    lookGekozen: `Look picked: ${FLASH.name}`,
    inDeLook: (n, look) => `${n} images in ${look}`,
    binnenkort: 'Examples coming soon',
    binnenkortKlip: 'Example clips coming soon',
  };
}
