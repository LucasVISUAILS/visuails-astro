// VISUAILS — POST /api/webhook/stripe. De code en de uitleg staan in
// functions/api/webhook/stripe.js; zie src/lib/route.js.
import { onRequestPost } from '../../../../functions/api/webhook/stripe.js';
import { alsRoute, nietToegestaan } from '../../../lib/route.js';

export const prerender = false;
export const POST = alsRoute(onRequestPost);
export const ALL = nietToegestaan('POST');
