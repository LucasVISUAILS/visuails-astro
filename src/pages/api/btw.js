// VISUAILS — POST /api/btw (doorloop 27). De code en de uitleg staan in
// functions/api/btw.js; zie src/lib/route.js.
import { onRequestPost } from '../../../functions/api/btw.js';
import { alsRoute, nietToegestaan } from '../../lib/route.js';

export const prerender = false;
export const POST = alsRoute(onRequestPost);
export const ALL = nietToegestaan('POST');
