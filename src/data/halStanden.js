/* VISUAILS — de standen van de laptop in de opening, als kant-en-klare foto's (15 oktober 2026).
   ═══════════════════════════════════════════════════════════════════════════

   WAAROM FOTO'S EN GEEN NAGEBOUWD SCHERM MEER. Lucas, 08:12: *"De laptop
   animatie op de beginpagina sectie is nog steeds heel erg buggy en bij elke
   volgende foto in de reeks loopt hij ontzettend vast en stotterd de foto
   nogal (…) gebeurt overigens op pc en telefoon."* Op zijn telefoon werd het
   hele scherm wit, met alleen een scheef stuk laptop.

   Tot vandaag lag er over de foto een laag van 2304 × 1728 px met twee
   nagebouwde schermen (een webshop, een bericht, een clip, en de telefoon),
   elk in het perspectief van de foto gezet met matrix3d en uitgesneden met een
   masker. Bij elke wissel liep er een overgang IN die laag, en dan moet de
   browser het hele schuine, gemaskerde scherm opnieuw tekenen, elk frame.
   Levering 46 en 47 lieten de beelden pas wisselen als ze binnen waren; dat
   hielp tegen half getekende foto's, niet tegen het tekenen zelf. En op een
   telefoon met DPR 3 vroeg die laag zoveel grafisch geheugen dat de browser
   de rest van de pagina niet meer tekende: dat witte scherm.

   Nu wordt elke stand vooraf één keer gefotografeerd, met de schermen erin:
   `node scripts/laptop-standen.mjs` bouwt de bron (HalLaptopSchermen.astro op
   /laptop-bron/<taal>/, alleen met LAPTOP_BRON=1), maakt van elke stand een
   foto van 2304 × 1728 en zet die als webp en avif in public/img/hal/stand/.
   De laptop zelf is daarna twee foto's die in elkaar overvloeien: geen 3D,
   geen masker, niets dat per frame getekend moet worden.

   PAS DE SCHERMEN AAN IN HalLaptopSchermen.astro (of in laptopSlides.js) EN
   DRAAI HET SCRIPT. Een stand zonder foto valt uit de reeks in plaats van leeg
   te staan (zie standenVoor), en tests/laptop-standen.test.mjs zegt welke er
   ontbreken. */
import { laptopReeks } from './laptopSlides.js';
import { isEcht } from '../lib/beeldAanwezig.js';
import { existsSync } from 'node:fs';
import path from 'node:path';

/** De breedtes waarin elke stand er ligt (de foto is 2304 × 1728). */
export const STAND_BREEDTES = [1000, 1600, 2304];
export const STAND_MAP = '/img/hal/stand';

/** De reeks zoals de schermen hem tonen: wat er van elke set echt is. */
export function halReeks(lang) {
  const [catalog, lifestyle, video] = laptopReeks(lang);
  const cat = catalog.beelden.filter((b) => isEcht(b.src));
  const life = lifestyle.beelden.filter((b) => isEcht(b.src) || b.plaat);
  return { catalog, lifestyle, video, cat, life };
}

/** Alle standen in volgorde, voor deze sets. */
export function alleStanden(lang, sets = ['catalog', 'lifestyle', 'video']) {
  const { catalog, lifestyle, video, cat, life } = halReeks(lang);
  return [
    ...cat.map((b, i) => ({ set: 'catalog', i, fon: b.fon ?? catalog.fon, duur: catalog.duur })),
    ...life.map((_, i) => ({ set: 'lifestyle', i, fon: lifestyle.fon, duur: lifestyle.duur })),
    { set: 'video', i: 0, fon: video.fon, duur: video.duur },
  ].filter((s) => sets.includes(s.set));
}

/** De naam van de foto van een stand, zonder breedte en extensie. */
export const standNaam = (lang, s) => `${lang === 'nl' ? 'nl' : 'en'}-${s.set}-${s.i}`;
export const standPad = (lang, s, w, ext = 'webp') => `${STAND_MAP}/${standNaam(lang, s)}-${w}.${ext}`;
export const standSrcset = (lang, s) => STAND_BREEDTES.map((w) => `${standPad(lang, s, w)} ${w}w`).join(', ');

/** Ligt de foto van deze stand er, in elke breedte? (Bij de build, vanuit de projectmap.) */
export function standGemaakt(lang, s) {
  return STAND_BREEDTES.every((w) => existsSync(path.join(process.cwd(), 'public', standPad(lang, s, w).slice(1))));
}

/** De standen die de laptop echt toont: alleen die met een foto. */
export function standenVoor(lang, sets) {
  return alleStanden(lang, sets).filter((s) => standGemaakt(lang, s));
}
