/**
 * VISUAILS — welke foto's er staan, en welke nog moeten komen. 5 september 2026.
 *
 * Lucas: *"Ik wil voor alle foto's placeholders hebben voor nu omdat de kleuren
 * niet meer kloppen, deze wil ik dan vandaag allemaal gaan maken en toevoegen."*
 *
 * Hoe het werkt (scripts/plaatshouders.mjs, bij de build):
 *   · elk beeld uit src/data/oude-beelden.json — de foto's van vóór het nieuwe
 *     kleurenschema — wordt op elke pagina vervangen door een plaatshouder met
 *     de bestandsnaam en de maat erin, zodat je ziet wat er waar moet komen;
 *   · een NIEUW bestand (een naam die niet in die lijst staat) staat gewoon;
 *   · een naam die NERGENS in public/img ligt — de voorpagina vraagt sinds
 *     sectie 21 om veertien nieuwe foto's, voorpagina-hero.webp tot en met
 *     voorpagina-set-07.webp — krijgt óók een plaatshouder, in de maat die de
 *     pagina vraagt. Leg het bestand onder die naam in public/img (met een
 *     -w760/-w1560 ernaast als je wilt) en de foto staat er bij de volgende
 *     build. Wat er nog mist, lees je van de plaatshouders zelf af;
 *   · overschrijf je een bestaand bestand onder dezelfde naam, zet die naam dan
 *     hieronder in KLAAR — of haal hem uit oude-beelden.json, dat is hetzelfde.
 *
 * Zet PLAATSHOUDERS op false zodra alles vervangen is; de lijst mag dan weg.
 * Iconen (i-*.svg), de logo's, de og-beelden en de mailbeelden doen niet mee.
 */
export const PLAATSHOUDERS = true;

/** Basisnamen zonder -wNNN en zonder extensie, bv. 'lifestyle-glow-03'. */
export const KLAAR = new Set([
]);
