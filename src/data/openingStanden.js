/* VISUAILS — de standen van de laptop in de opening van de voorpagina (levering 75, 25 oktober 2026).
   ═══════════════════════════════════════════════════════════════════════════

   Lucas, 23:35: "de mogelijkheden van de laptop en het wisselen van scherm (zoals het instagram
   voorbeeld mockup) [zijn] verdwenen terwijl ik dit nooit heb aangegeven, ik wil dit terug."

   Dezelfde reeks als de laptop van vóór levering 74 (src/data/halStanden.js, HalLaptop.astro): de
   webshop met de vier catalogbeelden, het Instagram-bericht met de vier lifestylebeelden en de
   clip. Alleen zijn het hier platte schermen (scripts/opening-reeks.mjs fotografeert ze uit
   /laptop-bron/), die de opening per beeld van de video op de hoeken van het scherm zet.

   Een stand zonder schermbeeld valt weg in plaats van leeg te staan (zoals in standenVoor). Het
   telefoonscherm wisselt alleen als een stand een eigen telefoonfoto heeft (…-tel). */
import { alleStanden, standNaam } from './halStanden.js';
import { existsSync } from 'node:fs';
import path from 'node:path';

export const SCHERM_MAP = '/img/hal/opening/scherm';
const opSchijf = (p) => existsSync(path.join(process.cwd(), 'public', p));

/** [{ naam, set, i, duur, lap, tel }] — lap en tel zonder extensie (.avif en .webp liggen ernaast). */
export function openingStanden(lang) {
  let tel = '/img/hal/opening/scherm-telefoon';
  const uit = [];
  for (const s of alleStanden(lang)) {
    const naam = standNaam(lang, s);
    const lap = `${SCHERM_MAP}/${naam}`;
    if (!opSchijf(`${lap}.webp`)) continue;
    if (opSchijf(`${SCHERM_MAP}/${naam}-tel.webp`)) tel = `${SCHERM_MAP}/${naam}-tel`;
    uit.push({ naam, set: s.set, i: s.i, duur: s.duur, lap, tel });
  }
  return uit;
}
