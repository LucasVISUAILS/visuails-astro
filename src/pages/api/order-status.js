// VISUAILS — GET /api/order-status. De code en de uitleg staan in
// functions/api/order-status.js; zie src/lib/route.js.
import { onRequestGet } from '../../../functions/api/order-status.js';
import { alsRoute, nietToegestaan } from '../../lib/route.js';

export const prerender = false;
export const GET = alsRoute(onRequestGet);
export const ALL = nietToegestaan('GET');
