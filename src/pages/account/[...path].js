// VISUAILS — het klantdashboard als Astro-endpoint. 5 september 2026.
//
// WAT HIER LANGSKOMT, EN WAT NIET. De SCHERMEN zijn Astro-pagina's onder
// src/pages/account/ (index, orders, invoices, details, brand-kit, plan,
// login, verify, code); Astro kiest die vóór deze vangroute. Wat hier
// binnenkomt is alles wat geen scherm is:
//
//   POST /account/login            de inlogmail versturen
//   POST /account/logout           de sessie wissen
//   POST /account/lock             een vaste look zetten of wissen
//   POST /account/details          de gegevens die niet per bestelling wisselen
//   POST /account/email            een adreswijziging aanvragen
//   GET  /account/me               JSON: wie is er ingelogd (leest /start)
//   GET  /account/files/<id>/f     één geleverd beeld, achter de sessie
//   GET  /account/orders/<id>/zip  het archief van die bestelling
//   GET  /account/invoices/<id>/pdf  ·  /account/credit-notes/<id>/pdf
//   GET  /account/plan/return      terug van Mollie met het mandaat
//
// Alles wat daar niet bij staat krijgt de bewuste 404 onderaan accountGet() —
// zie de noot daar van 6 september.
//
// DEZE TABEL STOND IN functions/account/[[path]].js — 7 september 2026. Dat
// bestand en functions/account/index.js zijn verwijderd; zie de noot in
// src/pages/admin/[...path].js voor waarom. De code staat in src/lib/account.js;
// zie src/lib/route.js voor de vertaling.
import { accountGet, accountPost } from '../../lib/account.js';
import { alsRoute, nietToegestaan } from '../../lib/route.js';

export const prerender = false;
export const GET = alsRoute(accountGet);
export const HEAD = alsRoute(accountGet);
export const POST = alsRoute(accountPost);
export const ALL = nietToegestaan('GET', 'HEAD', 'POST');
