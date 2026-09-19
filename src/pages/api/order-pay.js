// VISUAILS — GET /api/order-pay. De code en de uitleg staan in
// functions/api/order-pay.js; zie src/lib/route.js.
import { onRequestGet } from '../../../functions/api/order-pay.js';
import { alsRoute, nietToegestaan } from '../../lib/route.js';

export const prerender = false;
export const GET = alsRoute(onRequestGet);
export const ALL = nietToegestaan('GET');
