/*
 * ═══════════════════════════════════════════════════════════════════════════════
 * DE HERKOMSTTAG, OP ÉÉN PLEK
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * De IPTC-waarde die in een geleverd bestand hoort te staan, en de functie die hem
 * erin schrijft. Hier apart gezet omdat er sinds 9 augustus 2026 twee scripts zijn
 * die hem nodig hebben: scripts/tag-delivery.mjs (een map achteraf taggen) en
 * scripts/deliver.mjs (taggen als onderdeel van het leveren).
 *
 * WAAROM DAT EEN EIGEN BESTAND WAARD IS. Dit is een url met een woord erin dat
 * juridisch iets betekent: `compositeWithTrainedAlgorithmicMedia` zegt "deels door
 * een model gemaakt" en `trainedAlgorithmicMedia` zegt "volledig". Staan die twee
 * strings in twee scripts, dan is er een dag waarop het ene script iets anders in
 * een bestand zet dan het andere, en dan is de vermelding in de ene helft van de
 * levering een andere claim dan in de andere helft. Dat is precies het soort
 * verschil dat niemand ziet, want je leest de tag nooit.
 *
 * De volledige onderbouwing — waarom exiftool-vendored en niet een eigen writer,
 * en waarom webp met opzet meedoet — staat in de kop van scripts/tag-delivery.mjs
 * en is daar bewust NIET weggehaald: die uitleg gaat over het gereedschap en over
 * het moment (na de omzetting, niet ervoor), en dat is wat je daar wil lezen.
 */
import { exiftool } from 'exiftool-vendored';

/*
 * ── DE STRINGS ZIJN OP 9 AUGUSTUS 2026 ÉÉN LAAG NAAR BENEDEN GEGAAN ──────────
 *
 * Ze stonden hier. Het argument uit de kop hierboven — twee kopieën is een dag
 * waarop de ene helft van een levering een andere claim draagt dan de andere —
 * kreeg een derde plek: het adminportaal moet de tag kunnen NAKIJKEN, en dat
 * draait in workerd. Een Worker kan dit bestand niet importeren, want
 * exiftool-vendored is een binair programma.
 *
 * Dus: de waardes staan in src/lib/iptc.js, dat nul afhankelijkheden heeft en
 * daardoor overal heen kan. Dit bestand blijft de SCHRIJVER, en dat is nog steeds
 * de enige plek waar een tag wordt gezet.
 */
export { COMPOSITE, FULLY, TAGGABLE } from '../../src/lib/iptc.js';
import { COMPOSITE } from '../../src/lib/iptc.js';

/** Wat er nu in staat, of null. */
export async function readSourceType(file) {
  const tags = await exiftool.read(file);
  return tags?.DigitalSourceType || null;
}

/**
 * De herkomsttag in één bestand schrijven, en NAKIJKEN of hij er staat.
 *
 * Het terugleesje is niet overdreven. Het hele nut van deze tag is dat een bestand
 * later voor zichzelf kan antwoorden; een run die succes meldt terwijl er niets in
 * staat, is erger dan geen run — dan kijkt niemand nog. exiftool's exitcode is
 * daarvoor niet genoeg: hij is nul zodra het bestand geopend kon worden.
 *
 * `XMP-iptcExt` en niet `XMP-Iptc4xmpExt`: dat is de korte naam die exiftool zelf
 * op de Iptc4xmpExt-namespace zet, en het is de exacte string die in
 * scripts/tag-delivery.mjs al bewezen is op jpeg, png én webp. Twee namen voor
 * dezelfde namespace is precies de reden dat dit bestand bestaat.
 *
 * `-overwrite_original`, want exiftool laat standaard een `_original`-kopie naast
 * elk bestand staan, en dat verdubbelt de map die de klant krijgt.
 */
export async function writeSourceType(file, value = COMPOSITE) {
  await exiftool.write(file, { 'XMP-iptcExt:DigitalSourceType': value }, {
    writeArgs: ['-overwrite_original'],
  });
  const after = await readSourceType(file);
  if (after !== value) {
    throw new Error(`tag geschreven maar teruggelezen als ${after || 'niets'}`);
  }
}

/** exiftool houdt een proces open; zonder dit blijft node hangen. */
export async function closeExif() {
  try { await exiftool.end(); } catch { /* al dicht */ }
}
