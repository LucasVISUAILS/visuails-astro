// VISUAILS — GET /api/botcheck, de publieke Turnstile-sleutel. De code en de
// uitleg staan in functions/api/botcheck.js; zie src/lib/route.js.
import { onRequestGet } from '../../../functions/api/botcheck.js';
import { alsRoute, nietToegestaan } from '../../lib/route.js';

export const prerender = false;
export const GET = alsRoute(onRequestGet);
export const ALL = nietToegestaan('GET');
