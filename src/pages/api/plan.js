// VISUAILS — POST /api/plan, het abonnement afsluiten zonder account. De code en
// de uitleg staan in functions/api/plan.js; zie src/lib/route.js. GET stuurt
// terug naar /start/plan.
//
// ── WAAROM DIT BESTAND ER PAS OP 11 SEPTEMBER 2026 KWAM ──────────────────────
//
// Lucas: *"Als ik op abonnement kopen knop druk kom ik op een 404 terecht."*
// Met een schermafdruk van visuails.com/api/plan met de 404-pagina erop.
//
// Dit is dezelfde fout als die van gisterochtend bij /account, /admin en
// /o/<token>, en hij zat op precies één plek meer dan we toen hebben nagelopen.
//
// De achtergrond: visuails.com wordt sinds gisteren geserveerd door de Worker
// `visuails-site` en niet meer door het Pages-project. Een Worker draait wat de
// Astro-build erin stopt, en die build kent alleen `src/pages/`. Alles in
// `functions/` is een Cloudflare PAGES Function — dat is een ander mechanisme,
// dat de Worker niet leest.
//
// Vijf van de zes ingangen hadden daarom allang een dun bestandje hier
// (capacity, order, order-status, step, upload, plus de webhook-map) dat de
// echte handler uit `functions/` importeert. `plan` was de enige die er geen
// had. Zolang het domein op Pages stond viel dat niet op, want dan bediende
// Pages hem gewoon; sinds de verhuizing bestond het adres domweg niet meer, en
// een POST naar een adres dat niet bestaat is een 404 — precies wat Lucas zag,
// met het abonnementsformulier al helemaal ingevuld.
//
// DE CODE ZELF IS NIET AANGERAAKT. functions/api/plan.js doet nog exact wat het
// deed; dit bestand is alleen de deur die de Worker nodig heeft om erbij te
// kunnen. Dat is met opzet: één handler, twee ingangen, geen tweede waarheid
// over wat een abonnement afsluiten betekent.
import { onRequestGet, onRequestPost } from '../../../functions/api/plan.js';
import { alsRoute, nietToegestaan } from '../../lib/route.js';

export const prerender = false;
export const GET = alsRoute(onRequestGet);
export const POST = alsRoute(onRequestPost);
export const ALL = nietToegestaan('GET', 'POST');
