// VISUAILS — POST /api/order, de bestelling zelf. De code en de uitleg staan in
// functions/api/order.js; zie src/lib/route.js. GET stuurt door naar /start.
import { onRequestGet, onRequestPost } from '../../../functions/api/order.js';
import { alsRoute, nietToegestaan } from '../../lib/route.js';

export const prerender = false;
export const GET = alsRoute(onRequestGet);
export const POST = alsRoute(onRequestPost);
export const ALL = nietToegestaan('GET', 'POST');
