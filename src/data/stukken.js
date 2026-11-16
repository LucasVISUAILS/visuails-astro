/* VISUAILS — posterkleur in het klein (levering 89, 5 november 2026; lijst 82, E1 – E7: goed, E8: niet doen).
   ═══════════════════════════════════════════════════════════════════════════════════════════════════════════
   Lucas, 08:41: *"Nieuwe kleuren ook aan kleine dingen op de website toepassen waar mogelijk en het niet overheersend
   word. Ik wil altijd een poster achtige kleuren dus nooit clean alle kleuren achter elkaar, het mag juist wat random
   zijn zoals in de posters en korrel bevatten."*

   EEN STUKJE is een kleine poster: een grond, een baan licht op 53° en een roze gloed in een hoek, elke keer anders
   gelegd (zijn lagen licht verschoven, vast per zaad). Gemaakt met het veld van de site (src/scripts/veld.js) in
   lijst 82, zonder korrel: de korrel komt er in de pagina overheen (korrel-128/256.webp, één beeldpunt per korrel op
   elk scherm). Alle bestanden staan in public/img/stuk/.

   GEMETEN, PER SOORT PLEK. Waar tekst op een stukje staat, haalt die op het slechtste beeldpunt onder de tekst, met de
   korrel erbij, minstens 4,5 : 1; van de tien stukjes die per soort gemaakt zijn, vielen er tot zeven af. Daarom heeft
   elke plek zijn eigen lijst:
     vk   gezichten met initialen (vierkant; nacht en snede)           E4
     knop Bestellen bovenin (4 : 1; snede, de gloed rechts achter de pijl) E3, en het balkje van de voortgang (E6)
     pil  de status "geleverd" (4 : 1; nacht)                           E5
     blok het ene inktblok per pagina (16 : 10; nacht en snede)         E2
     fp   de lege fotoplek, zolang een beeld laadt (4 : 5; licht en donker door elkaar) E1
     raam het tekstlogo onder de muis (het venster; snede zonder roze en zonder wit licht, met de korrel erin;
          elk punt minstens 4,0 : 1 op de grond van de pagina, de eis voor een logo is 3 : 1) E7

   TOEVAL, MAAR VAST. Welk stukje een plek krijgt, volgt uit een hash van een sleutel (de pagina, de naam, het nummer):
   bij opnieuw laden blijft het hetzelfde, en twee buren krijgen nooit hetzelfde stukje (kies() schuift dan één op).
   NIET OVERHEERSEND: buiten de grote postervlakken staan er hoogstens drie stukjes tegelijk op een pagina (lijst 82
   E9: a); src/scripts/posterkleur.js telt mee. De lege fotoplek en het venster tellen niet: die zie je maar even. */

export const STUK_MAP = '/img/stuk/';
export const STUKKEN = {
  /* levering 99: met de gloed in zacht mint haalden n-vk-3 (4,12 : 1) en t-vk-3 (4,53) het niet of net; die twee vallen af */
  vk: ['n-vk-0', 'n-vk-1', 'n-vk-2', 't-vk-0', 't-vk-1', 't-vk-2'],
  knop: ['t-knop-0', 't-knop-5', 't-knop-6'],
  pil: ['n-knop-1', 'n-knop-2', 'n-knop-6', 'n-knop-8'],
  blok: ['n-blok-0', 'n-blok-1', 'n-blok-2', 't-blok-0', 't-blok-1', 't-blok-2'],
  /* het €1-blok blijft de nacht (lijst 78, C2: B4 Nacht, het licht rechtsonder, weg van de tekst) */
  nacht: ['n-blok-0', 'n-blok-1', 'n-blok-2'],
  fp: ['N-fp-1', 'S-fp-1', 'h-fp-1', 'h1-fp-1', 'g-fp-1', 'N-fp-6', 'S-fp-6', 'h-fp-6', 'h1-fp-6', 'g-fp-6'],
  raam: ['raam-0', 'raam-3', 'raam-6'],
};
export const KORREL = { x1: '/img/stuk/korrel-128.webp', x2: '/img/stuk/korrel-256.webp' };
/** hoogstens zoveel stukjes tegelijk op een pagina, buiten de grote postervlakken (lijst 82, E9) */
export const HOOGSTENS = 3;

/** FNV-1a: een vaste, gelijkmatige hash van een sleutel */
export function hash(s) {
  let x = 2166136261;
  for (let i = 0; i < s.length; i++) { x ^= s.charCodeAt(i); x = Math.imul(x, 16777619); }
  return x >>> 0;
}
/** het stukje voor een plek: vast per sleutel; is een buur (`naast`, één naam of een lijst) hetzelfde stukje,
    dan het volgende dat vrij is (elke lijst heeft er minstens drie, dus met twee buren is er altijd een) */
export function kies(soort, sleutel, naast = []) {
  const lijst = STUKKEN[soort];
  if (!lijst) return '';
  const buren = [].concat(naast).filter(Boolean);
  let i = hash(`${soort}:${sleutel}`) % lijst.length;
  for (let n = 0; n < lijst.length && buren.includes(lijst[i]); n++) i = (i + 1) % lijst.length;
  return lijst[i];
}
/** n plekken op een rij (of in een raster van `kolommen` breed): geen twee buren met hetzelfde stukje,
    links en rechts en, in een raster, ook boven en onder */
export function rij(soort, sleutel, n, kolommen = 0) {
  const uit = [];
  for (let i = 0; i < n; i++) uit.push(kies(soort, `${sleutel}:${i}`, [uit[i - 1], kolommen > 0 ? uit[i - kolommen] : '']));
  return uit;
}
/** n plekken in een raster waarvan je de breedte niet kent (Studio, zonder script): elk stukje verschilt van de
    `terug` plekken ervoor, dus links ernaast en, bij twee tot vijf kolommen, ook erboven */
export function rijUniek(soort, sleutel, n, terug = 5) {
  const uit = [];
  for (let i = 0; i < n; i++) uit.push(kies(soort, `${sleutel}:${i}`, uit.slice(Math.max(0, i - terug), i)));
  return uit;
}
export const stukUrl = (naam) => `${STUK_MAP}${naam}.webp`;
/** de klassen voor een plek: `pk` (korrel en stukje, posterkleur.css) en het stukje zelf */
export const pkKlasse = (naam) => (naam ? `pk pk-${naam}` : '');
/** het stukje van de status "geleverd": één kleur per lijst (lijst 82, E5), dus overal hetzelfde */
export const GELEVERD = 'n-knop-1';
