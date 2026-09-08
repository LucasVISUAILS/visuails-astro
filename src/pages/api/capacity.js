// VISUAILS — GET /api/capacity. De code en de uitleg staan in
// functions/api/capacity.js; zie src/lib/route.js voor waarom dit vier regels is.
import { onRequestGet } from '../../../functions/api/capacity.js';
import { alsRoute, nietToegestaan } from '../../lib/route.js';

export const prerender = false;
export const GET = alsRoute(onRequestGet);
export const ALL = nietToegestaan('GET');
