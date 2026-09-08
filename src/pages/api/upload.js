// VISUAILS — POST en DELETE /api/upload, de foto's van /start naar R2. De code en
// de uitleg staan in functions/api/upload.js; zie src/lib/route.js.
import { onRequestGet, onRequestPost, onRequestDelete } from '../../../functions/api/upload.js';
import { alsRoute, nietToegestaan } from '../../lib/route.js';

export const prerender = false;
export const GET = alsRoute(onRequestGet);
export const POST = alsRoute(onRequestPost);
export const DELETE = alsRoute(onRequestDelete);
export const ALL = nietToegestaan('POST', 'DELETE');
