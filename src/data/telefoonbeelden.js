/* VISUAILS — de grote foto's die een telefoon in een kleinere versie krijgt
   (levering 66, 21 oktober 2026; afvinklijst 44 vraag 2 = b, afvinklijst 45 vraag 1 = b).
   ═══════════════════════════════════════════════════════════════════════════

   WAAROM. Deze foto's laadde een telefoon op hun volle 1340 tot 2400 px: los als
   <img> zonder srcset (home, faq, video, uitleg), en op de lookpagina's, waar de
   srcset alleen een -w760 en de volle foto had. Nu staat er een kleinere versie
   naast (`<naam>-w<breedte>.webp` en `.avif`, gemaakt door scripts/make-telefoon.mjs).
   Los zet de bouwstap scripts/avif-naast-webp.mjs er `srcset` en `sizes="100vw"` bij
   (of houdt hij de sizes die de <img> al had); op de lookpagina's zet
   LookDetailHal.astro hem tussen de -w760 en de volle foto. De browser kiest zelf.

   WELKE. Elke foto van 1250 px of breder die een telefoon op volle breedte laadde.
   Twee vielen af na meten: catalog-before-1x1 en hal/sfeer-bewogen. Bij allebei werd
   de kleine versie, op de kwaliteit die nodig is, niet lichter dan de volle foto.

   WELKE KWALITEIT (afvinklijst 45, vraag 1 = b: "minstens zo scherp als nu").
   Vóór levering 66 kreeg een telefoon de volle foto op AVIF-kwaliteit 52 en verkleinde
   hij die zelf; bij dat verkleinen verdwijnt veel van het inpakken. Een kleine versie
   ziet de telefoon bijna 1 op 1, dus die heeft een hogere kwaliteit nodig om even
   scherp te zijn. GEMETEN per foto, op een iPhone-scherm (390 × 3 = 1170 px breed):
   de gelijkenis (SSIM, kleur) met de volle foto, eerst van wat de telefoon vóór 66
   zag, dan van de kleine versie op kwaliteit 64, 72, 78 en 84 (84 met volle kleur,
   4:4:4). Per foto staat hier de laagste die minstens zo scherp is. Achter elke
   regel: was → nu. Samen 25 foto's: geen enkele zachter, de telefoon iets lichter.
   Ter vergelijking: overal kwaliteit 64 was 41 % lichter geweest, maar 22 van de
   25 foto's iets zachter (de laagste 0,918 tegen 0,944).

   WELKE BREEDTE. 1200 is op elk scherm waar de browser hem kiest genoeg, behalve
   voor lifestyle-phone-made-11: die heeft op home op 390 × 3 1306 px nodig (cover in
   een vak van 260 × 325), dus die krijgt 1400. tests/telefoonbeelden.test.mjs meet
   dat bij elke testreeks opnieuw met de echte keuze van de browser.

   vol: de breedte van de volle foto (voor de w-maat in de srcset).
   klein: de breedte van de kleine versie.
   q, kleur: de AVIF-kwaliteit en de kleuropslag (420 of 444) van de kleine versie.
   Wijzig je q of kleur, draai dan `node scripts/make-telefoon.mjs --opnieuw`. */
export const TELEFOONBEELDEN = {
  '/img/banners-13.webp': { vol: 2400, klein: 1200, q: 72, kleur: '420' }, // 0,962 → 0,964
  '/img/banners-14.webp': { vol: 2400, klein: 1200, q: 78, kleur: '420' }, // 0,968 → 0,970
  '/img/banners-16.webp': { vol: 2400, klein: 1200, q: 84, kleur: '444' }, // 0,955 → 0,957
  '/img/catalog-after.webp': { vol: 1800, klein: 1200, q: 78, kleur: '420' }, // 0,978 → 0,981
  '/img/catalog-raster.webp': { vol: 1600, klein: 1200, q: 72, kleur: '420' }, // 0,983 → 0,985
  '/img/lifestyle-flash-02.webp': { vol: 1340, klein: 1200, q: 64, kleur: '420' }, // 0,950 → 0,962
  '/img/lifestyle-flash-03.webp': { vol: 1340, klein: 1200, q: 64, kleur: '420' }, // 0,958 → 0,968
  '/img/lifestyle-flash-04.webp': { vol: 2400, klein: 1200, q: 78, kleur: '420' }, // 0,952 → 0,956
  '/img/lifestyle-flash-05.webp': { vol: 2400, klein: 1200, q: 72, kleur: '420' }, // 0,954 → 0,954
  '/img/lifestyle-flash-06.webp': { vol: 2400, klein: 1200, q: 84, kleur: '444' }, // 0,944 → 0,954
  '/img/lifestyle-flash-07.webp': { vol: 2400, klein: 1200, q: 84, kleur: '444' }, // 0,960 → 0,968
  '/img/lifestyle-flash-08.webp': { vol: 2400, klein: 1200, q: 78, kleur: '420' }, // 0,955 → 0,961
  '/img/lifestyle-glow-02.webp': { vol: 2400, klein: 1200, q: 78, kleur: '420' }, // 0,970 → 0,973
  '/img/lifestyle-glow-05.webp': { vol: 2400, klein: 1200, q: 78, kleur: '420' }, // 0,977 → 0,978
  '/img/lifestyle-phone-made-02.webp': { vol: 2400, klein: 1200, q: 72, kleur: '420' }, // 0,974 → 0,977
  '/img/lifestyle-phone-made-03.webp': { vol: 2400, klein: 1200, q: 78, kleur: '420' }, // 0,979 → 0,980
  '/img/lifestyle-phone-made-04.webp': { vol: 2400, klein: 1200, q: 72, kleur: '420' }, // 0,969 → 0,972
  '/img/lifestyle-phone-made-05.webp': { vol: 2400, klein: 1200, q: 78, kleur: '420' }, // 0,948 → 0,949
  '/img/lifestyle-phone-made-06.webp': { vol: 2400, klein: 1200, q: 78, kleur: '420' }, // 0,971 → 0,974
  '/img/lifestyle-phone-made-07.webp': { vol: 2400, klein: 1200, q: 84, kleur: '444' }, // 0,968 → 0,973
  '/img/lifestyle-phone-made-08.webp': { vol: 2400, klein: 1200, q: 78, kleur: '420' }, // 0,972 → 0,975
  '/img/lifestyle-phone-made-09.webp': { vol: 2400, klein: 1200, q: 78, kleur: '420' }, // 0,967 → 0,970
  '/img/lifestyle-phone-made-10.webp': { vol: 2400, klein: 1200, q: 84, kleur: '444' }, // 0,960 → 0,964
  '/img/lifestyle-phone-made-11.webp': { vol: 2400, klein: 1400, q: 64, kleur: '420' }, // 0,970 → 0,973
};

/** Het pad van de kleine versie naast een foto uit de lijst. */
export const telefoonPad = (src) => src.replace(/\.webp$/, `-w${TELEFOONBEELDEN[src].klein}.webp`);

/** Alle kleine versies (webp), voor make-avif.mjs: die laat ze met rust. */
export const telefoonVersies = () => Object.keys(TELEFOONBEELDEN).map(telefoonPad);
