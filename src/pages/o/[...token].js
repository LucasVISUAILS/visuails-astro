// VISUAILS — het klantportaal als Astro-endpoint. 5 september 2026.
//
//   GET  /o/<token>            de bestelpagina, of de leverpagina op tier 0
//   GET  /o/<token>/f/<id>     één beeld, inline, voor de pagina hierboven
//   GET  /o/<token>/zip        het archief: de map die de klant echt krijgt
//   POST /o/<token>            goedkeuren / een revisie vragen / ongedaan maken
//
// WAAROM HEAD APART STAAT. De runtime leidt HEAD niet af uit GET, dus zonder
// die export zou een HEAD op een echte bestelling 405 geven. Het lichaam wordt
// er zelf afgegooid, dus de handler hoeft niet te weten welke van de twee hij
// bedient — en een HEAD kost dezelfde tik op de snelheidsbegrenzer als de GET
// waar hij voor in de plaats komt, wat precies de bedoeling is.
//
// Er is met opzet geen vangnet voor andere methodes: wat geen GET, HEAD of POST
// is hoort een 405 te krijgen en geen portaalpagina die gerenderd is voor een
// werkwoord dat het portaal niet kent.
//
// DEZE TABEL STOND IN functions/o/[[token]].js — 7 september 2026. Dat bestand
// en functions/o/index.js zijn verwijderd; zie de noot in
// src/pages/admin/[...path].js voor waarom. De code staat in src/lib/portal.js.
import { portalGet, portalPost } from '../../lib/portal.js';
import { alsRoute, nietToegestaan } from '../../lib/route.js';

export const prerender = false;
export const GET = alsRoute(portalGet);
export const HEAD = alsRoute(portalGet);
export const POST = alsRoute(portalPost);
export const ALL = nietToegestaan('GET', 'HEAD', 'POST');
