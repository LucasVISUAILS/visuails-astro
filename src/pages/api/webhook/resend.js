// VISUAILS — POST /api/webhook/resend. De code en de uitleg staan in
// functions/api/webhook/resend.js; zie src/lib/route.js.
import { onRequestPost } from '../../../../functions/api/webhook/resend.js';
import { alsRoute, nietToegestaan } from '../../../lib/route.js';

export const prerender = false;
export const POST = alsRoute(onRequestPost);
export const ALL = nietToegestaan('POST');
