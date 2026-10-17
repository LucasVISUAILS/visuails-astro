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

function meet(rij) {
  const knoppen = [...rij.children].filter((k) => k.classList.contains('h-knop') && !k.hidden);
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
