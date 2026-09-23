// VISUAILS — POST /api/studiobrief, de aanmelding voor de Studiobrief. De code
// en de uitleg staan in functions/api/studiobrief.js; zie src/lib/route.js.
import { onRequestGet, onRequestPost } from '../../../functions/api/studiobrief.js';
import { alsRoute, nietToegestaan } from '../../lib/route.js';

export const prerender = false;
export const GET = alsRoute(onRequestGet);
export const POST = alsRoute(onRequestPost);
export const ALL = nietToegestaan('GET', 'POST');
