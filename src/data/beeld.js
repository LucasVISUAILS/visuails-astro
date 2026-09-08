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

/**
 * Basisnamen zonder -wNNN en zonder extensie, bv. 'lifestyle-glow-03'.
 *
 * ── DE LIJST WAS TE BREED GETROKKEN — 8 september 2026 ──────────────────────
 *
 * Lucas: *"Er zijn ook foto's die niet inladen terwijl die wel in mijn bestanden
 * staan."* Dat klopte, en er was niets kapot: geen enkele 404, geen enkele lege
 * <img>. Het waren 86 foto's die door DEZE machinerie werden weggehaald
 * omdat hun naam in oude-beelden.json staat — de lijst "van vóór het nieuwe
 * kleurenschema".
 *
 * Die lijst is te ruim. Er zijn er twintig doorgelopen, groep voor groep, en wat
 * eruit kwam is dit: de modelportretten zijn zwart-op-wit koppen zonder één
 * kleur erin, de catalogfoto's zijn een grijs shirt op wit, de brand- en
 * planbeelden zijn limoen op zwart — dus precies de nieuwe kleuren — en de
 * lifestylereeksen zijn donker, neutraal of limoen. Er was één beeld waar je
 * over kunt twijfelen (een print met paars erin), en dat is een KLEDINGSTUK en
 * geen paginakleur.
 *
 * Twintig plaatshouders op de plek waar het modellenrooster hoort, terwijl de
 * foto's op schijf staan, is erger dan een foto waar je iets van kunt vinden.
 * Alles wat er ligt, staat er dus weer op. Wat NIET op schijf ligt, blijft
 * vanzelf een plaatshouder met zijn opdracht erin — dat is de andere helft van
 * dit bestand en die blijft ongemoeid (5 stuks).
 *
 * Klopt één beeld toch niet: haal zijn naam hier weg en hij is de volgende
 * build weer een plaatshouder.
 */
export const KLAAR = new Set([
  'banners-01',
  'banners-02',
  'banners-03',
  'banners-04',
  'banners-05',
  'banners-06',
  'banners-07',
  'banners-08',
  'banners-09',
  'banners-10',
  'banners-11',
  'banners-12',
  'banners-13',
  'banners-14',
  'banners-15',
  'banners-16',
  'banners-17',
  'brand-boots',
  'brand-car',
  'brand-car-lens',
  'brand-desk',
  'brand-knit',
  'brand-pool',
  'brand-rest',
  'brand-silhouet',
  'brand-stair',
  'catalog-after',
  'catalog-before',
  'catalog-before-1x1',
  'custom-models-01',
  'custom-models-02',
  'custom-models-03',
  'custom-models-04',
  'custom-models-05',
  'hero-dunes',
  'lifestyle-dunes-01',
  'lifestyle-dunes-02',
  'lifestyle-flash-01',
  'lifestyle-flash-02',
  'lifestyle-flash-03',
  'lifestyle-flash-04',
  'lifestyle-flash-05',
  'lifestyle-flash-06',
  'lifestyle-flash-07',
  'lifestyle-flash-08',
  'lifestyle-glow-01',
  'lifestyle-glow-02',
  'lifestyle-glow-03',
  'lifestyle-glow-04',
  'lifestyle-glow-05',
  'lifestyle-glow-06',
  'lifestyle-phone-made-01',
  'lifestyle-phone-made-02',
  'lifestyle-phone-made-03',
  'lifestyle-phone-made-04',
  'lifestyle-phone-made-05',
  'lifestyle-phone-made-06',
  'lifestyle-phone-made-07',
  'lifestyle-phone-made-08',
  'lifestyle-phone-made-09',
  'lifestyle-phone-made-10',
  'lifestyle-phone-made-11',
  'lifestyle-phone-made-12',
  'lifestyle-phone-made-13',
  'lifestyle-phone-made-14',
  'model-01',
  'model-02',
  'model-03',
  'model-aaron',
  'model-ava',
  'model-dana',
  'model-elias',
  'model-fabi',
  'model-lisa',
  'model-maegan',
  'model-rae',
  'model-raw-01',
  'model-raw-02',
  'model-ryan',
  'model-seme',
  'plan-beam',
]);
