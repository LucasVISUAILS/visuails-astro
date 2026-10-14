// VISUAILS — POST /api/proef-wachtlijst: "Mail me als hij weer open is". De code
// staat in functions/api/proef-wachtlijst.js; zie src/lib/route.js.
import { onRequestGet, onRequestPost } from '../../../functions/api/proef-wachtlijst.js';
import { alsRoute, nietToegestaan } from '../../lib/route.js';

export const prerender = false;
export const GET = alsRoute(onRequestGet);
export const POST = alsRoute(onRequestPost);
export const ALL = nietToegestaan('GET', 'POST');
