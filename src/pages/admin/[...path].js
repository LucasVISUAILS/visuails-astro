// VISUAILS — het beheer als Astro-endpoint. 5 september 2026.
//
//   GET  /admin/login              het inlogformulier
//   POST /admin/login              wachtwoord controleren, sessiecookie zetten
//   GET  /admin                    het dashboard: bestellingen + revisiepostvak
//   POST /admin/logout             de sessie wissen
//   POST /admin/orders/<id>/status status wijzigen, plus de tijdlijnregel die
//                                  de klant leest
//   (en de rest — agenda, planning, klanten, bestanden, btw, log, maandset —
//    staat in de padtabel bovenin src/lib/admin.js, want die is de waarheid.)
//
// DEZE TABEL STOND IN functions/admin/[[path]].js — 7 september 2026. Dat
// bestand is verwijderd: sinds de site één Worker is (zie wrangler.toml) leest
// niets in /functions nog mee behalve functions/api/*, dat hier wél nog vanuit
// src/pages/api/ geïmporteerd wordt. Een routebestand dat niet meer draait maar
// wel de enige plek is waar de routes beschreven staan, is een kaart van een weg
// die er niet meer ligt.
//
// De code zelf staat in src/lib/admin.js; zie src/lib/route.js voor waarom dit
// bestand vier regels is.
import { adminGet, adminPost } from '../../lib/admin.js';
import { alsRoute, nietToegestaan } from '../../lib/route.js';

export const prerender = false;
export const GET = alsRoute(adminGet);
export const POST = alsRoute(adminPost);
export const ALL = nietToegestaan('GET', 'POST');
