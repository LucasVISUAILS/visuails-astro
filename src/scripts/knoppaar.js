/**
 * VISUAILS — twee knoppen naast elkaar op de telefoon, als ze passen (levering 55,
 * 17 oktober 2026; afvinklijst 35, v35-telefoon b).
 *
 * Vanaf 901 px breed zijn twee knoppen in .h-acties altijd één vorm met de snede
 * (hal.css, "TWEE KNOPPEN WORDEN ÉÉN VORM"). Smaller stonden ze onder elkaar, los. Nu
 * meet dit script per rij of de knoppen naast elkaar passen, met de smallere maat van
 * de telefoon (klasse h-meet, alleen tijdens het meten). Passen ze, dan krijgt de rij
 * h-passen en zet hal.css ze naast elkaar met de snede; anders blijven ze onder elkaar.
 * Opnieuw gemeten als de rij van breedte verandert (draaien, venster). Geen luisteraar
 * op window (tests/zachte-navigatie): een ResizeObserver op de rij zelf.
 */
const SMAL = '(max-width: 900px)';

/* Levering 77 (27 oktober 2026): op de computer is een paar altijd één vorm, op één regel. In een smal
   vak (een kaart in twee kolommen, de kop naast een beeld) op 901 – 1240 px paste dat soms niet, en
   liep de tweede knop over de rand van zijn vak (tot 164 px op de 404). Dan krijgt de rij h-los: de
   knoppen los, en onder elkaar als ze niet naast elkaar passen (hal.css). Gemeten tegen het vak van
   de ouder, niet tegen de rij zelf: in een raster maakt een te brede rij zijn eigen kolom breder. */
function meetBreed(rij, knoppen) {
  rij.classList.remove('h-los');
  const ouder = rij.parentElement;
  if (!ouder) return;
  const oc = getComputedStyle(ouder);
  const links = rij.getBoundingClientRect().left;
  const ruimte = ouder.getBoundingClientRect().right - parseFloat(oc.paddingRight) - parseFloat(oc.borderRightWidth) - links;
  const nodig = Math.max(...knoppen.map((k) => k.getBoundingClientRect().right)) - links;
  rij.classList.toggle('h-los', nodig > ruimte + 1);
}

function meet(rij) {
  const knoppen = [...rij.children].filter((k) => k.classList.contains('h-knop') && !k.hidden);
  if (knoppen.length >= 2 && !matchMedia(SMAL).matches) { rij.classList.remove('h-passen'); meetBreed(rij, knoppen); return; }
  rij.classList.remove('h-los');
  if (knoppen.length < 2 || !matchMedia(SMAL).matches) { rij.classList.remove('h-passen'); return; }
  rij.classList.remove('h-passen');
  rij.classList.add('h-meet');
  const past = rij.scrollWidth <= rij.clientWidth + 1 && knoppen.every((k) => k.scrollWidth <= k.clientWidth + 1);
  rij.classList.remove('h-meet');
  rij.classList.toggle('h-passen', past);
}

export function knoppenNaastElkaar() {
  const rijen = [...document.querySelectorAll('.hal .h-acties')];
  /* de letter kan later binnenkomen dan de eerste meting: dan nog een keer */
  document.fonts?.ready.then(() => rijen.forEach(meet));
  for (const rij of rijen) {
    if (rij.dataset.hPaar) continue;
    rij.dataset.hPaar = '1';
    let breed = 0;
    new ResizeObserver((r) => {
      const w = Math.round(r[0].contentRect.width);
      if (w === breed) return;
      breed = w;
      meet(rij);
    }).observe(rij);
  }
}
