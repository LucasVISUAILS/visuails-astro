// VISUAILS — GET /api/proef-stand: staat de €1-proef open, dicht, of alleen
// lifestyle? De code staat in functions/api/proef-stand.js; zie src/lib/route.js.
import { onRequestGet } from '../../../functions/api/proef-stand.js';
import { alsRoute, nietToegestaan } from '../../lib/route.js';

export const prerender = false;
export const GET = alsRoute(onRequestGet);
export const ALL = nietToegestaan('GET');
