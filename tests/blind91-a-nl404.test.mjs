/**
 * Ronde 91, A16 (9 november 2026): de Nederlandse 404 komt als het gebouwde
 * bestand, met de koppen uit public/_headers. src/pages/nl/[...pad].astro draait
 * in de Worker en kreeg daardoor geen enkele beveiligingskop (geen CSP, geen
 * frame-ancestors/X-Frame-Options, geen nosniff, HSTS of Referrer-Policy) — de
 * Engelse 404 wel, want die haalt Astro zelf via de ASSETS-binding. Nu doet de
 * Nederlandse hetzelfde (src/lib/vaste404.js).
 * Lokaal met de echte binding nagekeken: kladblok 91/werk/a/assets-proef.
 * Draai: node tests/blind91-a-nl404.test.mjs
 */
import { readFileSync } from 'node:fs';
import { statischeNl404 } from '../src/lib/vaste404.js';

let goed = 0, fout = 0;
function ok(naam, waar, detail = '') {
  if (waar) goed++; else fout++;
  console.log(`${waar ? ' ok  ' : ' FAIL'} ${naam}${waar ? '' : `  ${detail}`}`);
}
const URL_ = new URL('https://visuails.com/nl/bestaat-niet/');
const koppen = { 'content-type': 'text/html; charset=utf-8', 'content-security-policy': "frame-ancestors 'none'; object-src 'none'", 'x-frame-options': 'DENY', 'x-content-type-options': 'nosniff', 'strict-transport-security': 'max-age=31536000; includeSubDomains', 'referrer-policy': 'strict-origin-when-cross-origin' };
const gevraagd = [];
const ASSETS = { async fetch(req) { gevraagd.push(new URL(req.url).pathname); return new Response('<html lang="nl"><h1>Pagina niet gevonden</h1></html>', { status: 200, headers: koppen }); } };

console.log('\nmet de binding: het bestand, status 404, alle koppen');
{
  const r = await statischeNl404({ ASSETS }, URL_);
  ok('er komt een antwoord', r instanceof Response);
  ok('vraagt /nl/404 op (het gebouwde bestand)', gevraagd[0] === '/nl/404', gevraagd.join(','));
  ok('status 404', r?.status === 404, r?.status);
  for (const k of Object.keys(koppen)) ok(`  ${k}`, r?.headers.get(k) === koppen[k], r?.headers.get(k));
  ok('de Nederlandse inhoud', /Pagina niet gevonden/.test(await r.text()));
}
console.log('\nzonder bruikbare binding: null, en de pagina rendert zelf');
ok('geen ASSETS', (await statischeNl404({}, URL_)) === null);
ok('ASSETS geeft 404', (await statischeNl404({ ASSETS: { fetch: async () => new Response('x', { status: 404, headers: { 'content-type': 'text/html' } }) } }, URL_)) === null);
ok('ASSETS geeft geen HTML', (await statischeNl404({ ASSETS: { fetch: async () => new Response('{}', { status: 200, headers: { 'content-type': 'application/json' } }) } }, URL_)) === null);
ok('ASSETS gooit', (await statischeNl404({ ASSETS: { fetch: async () => { throw new Error('weg'); } } }, URL_)) === null);

console.log('\nde route gebruikt hem vóór hij zelf rendert');
{
  const bron = readFileSync(new URL('../src/pages/nl/[...pad].astro', import.meta.url), 'utf8');
  const i = bron.indexOf('await statischeNl404(env, Astro.url)');
  ok('roept statischeNl404 aan', i > 0);
  ok('  en geeft dat antwoord terug', /if \(vast\) return vast;/.test(bron));
  ok('  vóór de eigen 404', i > 0 && i < bron.indexOf('Astro.response.status = 404'));
  ok('  met env uit cloudflare:workers', /import \{ env \} from 'cloudflare:workers';/.test(bron));
}
console.log(`\n${goed} goed, ${fout} fout`);
if (fout) process.exit(1);
