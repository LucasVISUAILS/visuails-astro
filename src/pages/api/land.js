// VISUAILS — GET /api/land, het land van de bezoeker om het formulier voor te
// vullen (8.06). De code en de uitleg staan in functions/api/land.js; zie
// src/lib/route.js.
import { onRequestGet } from '../../../functions/api/land.js';
import { alsRoute, nietToegestaan } from '../../lib/route.js';

export const prerender = false;
export const GET = alsRoute(onRequestGet);
export const ALL = nietToegestaan('GET');
