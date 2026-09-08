// VISUAILS — POST /api/step, de stappenteller van /start. De code en de uitleg
// staan in functions/api/step.js; er is bewust geen GET (zie daar).
import { onRequestPost } from '../../../functions/api/step.js';
import { alsRoute, nietToegestaan } from '../../lib/route.js';

export const prerender = false;
export const POST = alsRoute(onRequestPost);
export const ALL = nietToegestaan('POST');
