/*
 * VISUAILS — de fotoblokken: welk blok welke foto heeft (lijst 86, 9 november 2026).
 *
 * Lucas, lijst 84 (A4): "dat bepaalde blokken dezelfde fotoachtergrond krijgen
 * waardoor je ze gaat herkennen als je ze weer tegenkomt." Dus: één blok, één foto,
 * op elke pagina. De beelden maakt scripts/fotoblok.mjs (bewogen langs de snede, in
 * Blauw uur); de opmaak staat in src/styles/fotoblok.css. Gekozen in lijst 86:
 * glas a (een glazen plaat achter de tekst), kleur a (helemaal in het schema),
 * beweging a (langs de snede), en B1 – B4 alle vier "goed".
 *
 * Een andere foto: verander `bron`, draai `node scripts/fotoblok.mjs <blok>`, bouw,
 * en draai tests/fotoblok.test.mjs (contrast op elk blok, en geen foto met een merk).
 */

/** Elk blok en zijn vaste foto (uit public/img/). */
export const FOTOBLOKKEN = {
  /* B1 · het €1-blok (26 pagina's): een straat in de avond met een auto die voorbijschiet */
  proef: { bron: 'banners-09.webp' },
  /* B2 · het slot onderaan pagina's zonder €1-blok: de witte jas tegen beton en blauwe lucht */
  slot: { bron: 'lifestyle-phone-made-06.webp' },
  /* B3 · de Studiobrief (de voet, Editions, de gidsen): blauw uur in de duinen */
  brief: { bron: 'lifestyle-dunes-01.webp' },
  /* B4 · het vlak met de V op de 404: een witte broek in de flits, in de nacht */
  nf: { bron: 'lifestyle-flash-05.webp', uitsnede: { maat: 1.8, x: 0.45, y: 0.7 } },
  /* uitsnede (9 november 2026): het lichtspoor lag midden achter de witte V (1,0 : 1 op het slechtste punt).
     Een uitsnede van 1/1,8, iets links en onder het midden, zet het spoor naast de V: de V haalt op alle
     breedtes minstens 7,5 : 1 (gemeten 7,6 – 14,4) en het spoor blijft 13 – 19 % van het vlak (91/l86/prod/nf_zoek.py). */
};

/** De twee breedtes: 1600 voor de computer, 800 voor de telefoon. */
export const FOTOBLOK_MATEN = [800, 1600];

/** Blauw uur als verloop op de helderheid (docs/KLEURENSCHEMA.md): inkt → blauw diep → blauw uur → blauw licht → wit. */
export const FOTOBLOK_SCHEMA = [
  [0, '#0B0F17'],
  [0.34, '#1A4279'],
  [0.58, '#25508B'],
  [0.84, '#80A7DD'],
  [1, '#FFFFFF'],
];

/* Foto's die nooit een fotoblok mogen worden: er staat een merknaam of een herkenbaar
   figuur op (ronde 91, E10 – E13). Ook al vervaagt de beweging de tekst, het blijft
   zijn foto van andermans merk. tests/fotoblok.test.mjs houdt dit vast. */
export const FOTOBLOK_NIET = [
  /^lifestyle-flash-03/,      // "alexander wang" op het jack (E10)
  /^lifestyle-phone-made-04/, // idem, de bekende
  /^banners-05/,              // "STUDIO 95" (E13)
  /^banners-02/,              // klein geborduurd embleem (E13)
  /^custom-models-05/,        // Kirby-tattoo (E12)
  /nonstd|non-std/i,          // NON/STD (E11)
  /room84|room-84/i,          // Room 84 / "ABANDON" (E13)
];
