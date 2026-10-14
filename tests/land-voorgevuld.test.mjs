/*
 * 8.06 · HET LAND STAAT VOORGEVULD MET HET LAND VAN DE BEZOEKER — 8 oktober 2026
 *
 * GET /api/land geeft het land van het ip-adres (Cloudflare request.cf.country,
 * hetzelfde gegeven dat o16 gebruikt), maar alleen als dat in de keuzelijst
 * staat. Het formulier vult het in als er nog niets staat — nooit over een land
 * uit het account of een eigen keuze heen — en het veld blijft zichtbaar en te
 * wijzigen.
 *
 * Licht: de echte handler en de bron, geen server of browser.
 * node tests/land-voorgevuld.test.mjs (de browsertoets staat in formulier-a2-browser).
 */
import { readFileSync } from 'node:fs';
import { onRequestGet } from '../functions/api/land.js';
import { bezoekersLand, EU_COUNTRIES, OTHER_COUNTRIES } from '../src/data/vat.js';

let pass = 0;
let fail = 0;
function ok(name, got, want = true) {
  const good = JSON.stringify(got) === JSON.stringify(want);
  if (good) pass++; else fail++;
  console.log(`${good ? ' ok  ' : ' FAIL'} ${name.padEnd(70)}${good ? '' : `verwacht ${JSON.stringify(want)}, kreeg ${JSON.stringify(got)}`}`);
}
const lees = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');

console.log('\n8.06 — het land voorgevuld\n');

console.log('GET /api/land');
async function vraag(cf) {
  const request = new Request('https://visuails.com/api/land');
  if (cf !== undefined) Object.defineProperty(request, 'cf', { value: cf });
  const res = onRequestGet({ request });
  return { res, body: await res.json() };
}
{
  const be = await vraag({ country: 'BE' });
  ok('België → BE', be.body, { land: 'BE' });
  ok('niet gedeeld gecachet', be.res.headers.get('cache-control'), 'private, no-store');
  ok('json', /application\/json/.test(be.res.headers.get('content-type') || ''));
  ok('Nederland → NL', (await vraag({ country: 'NL' })).body.land, 'NL');
  ok('Verenigde Staten → US', (await vraag({ country: 'US' })).body.land, 'US');
  ok('kleine letters tellen ook', (await vraag({ country: 'de' })).body.land, 'DE');
  ok('XX (Cloudflare weet het niet) → niets, ook al staat "Ergens anders" in de lijst', (await vraag({ country: 'XX' })).body.land, null);
  ok('T1 (Tor) → niets', (await vraag({ country: 'T1' })).body.land, null);
  ok('een land dat niet in de keuzelijst staat → niets', (await vraag({ country: 'JP' })).body.land, null);
  ok('geen cf (lokaal) → niets', (await vraag(undefined)).body.land, null);
  ok('rommel → niets', (await vraag({ country: '<script>' })).body.land, null);
}
console.log('\nde keuzelijst');
ok('elk EU-land uit de lijst wordt herkend', EU_COUNTRIES.every((c) => bezoekersLand(c.id) === c.id));
ok('elk land buiten de EU uit de lijst, behalve XX', OTHER_COUNTRIES.filter((c) => c.id !== 'XX').every((c) => bezoekersLand(c.id) === c.id));

console.log('\nhet formulier');
const pipe = lees('src/scripts/pipeline.js');
const route = lees('src/pages/api/land.js');
const fn = (pipe.match(/function vulLandVoor\(\) \{[\s\S]*?\n\}/) || [''])[0];
ok('de route bestaat, alleen GET, niet voorgebouwd', /export const prerender = false;/.test(route) && /export const GET = alsRoute\(onRequestGet\)/.test(route) && /nietToegestaan\('GET'\)/.test(route));
ok('pipeline.js vraagt /api/land', /fetch\('\/api\/land'/.test(fn));
ok('pas na de opgeslagen gegevens van het account', /\.catch\(\(\) => \{\}\) \/\/ offline[^\n]*\n[\s\S]{0,200}\.then\(\(\) => vulLandVoor\(\)\);/.test(pipe));
ok('nooit overschrijven: alleen als er nog geen land staat (vóór en na het verzoek)',
  /if \(!select \|\| select\.value/.test(fn) && /if \(!land \|\| select\.value\) return;/.test(fn));
ok('alleen een land dat als keuze bestaat', /Array\.from\(select\.options\)\.some\(\(o\) => o\.value === land\)/.test(fn));
ok('daarna een change-event, zodat btw-veld en KVK meegaan', /select\.dispatchEvent\(new Event\('change', \{ bubbles: true \}\)\)/.test(fn));
const flow = lees('src/components/order/OrderFlow.astro');
ok('het land blijft een gewone, zichtbare keuzelijst in stap 3', /<select class="input" id="pl-country" name="country" autocomplete="country" required/.test(flow));

/* N2 (8 okt 2026): het abonnementsformulier doet hetzelfde. De browserkant
   (account wint, eigen keuze wint, onbekend land laat NL staan) staat in
   tests/naloop-a2-browser.test.mjs. */
console.log('\nhet abonnementsformulier (PlanPicker)');
const plan = lees('src/components/order/PlanPicker.astro');
const pfn = (plan.match(/var vulLandVoor = function \(\) \{[\s\S]*?\n {4}\};/) || [''])[0];
ok('PlanPicker vraagt /api/land', /fetch\('\/api\/land'/.test(pfn));
ok('pas na het account (visAccount), en ook zonder account', /\.then\(vulLandVoor\);/.test(plan) && /if \(typeof window\.visAccount !== 'function'\) \{ vulLandVoor\(\); return; \}/.test(plan));
ok('nooit overschrijven: niet na een eigen keuze, een land uit het account of een terugkeer met ?fout=',
  /if \(!landSel \|\| eigenKeuze \|\| uitAccount \|\| terugMetFout/.test(pfn) && /if \(!code \|\| eigenKeuze \|\| uitAccount/.test(pfn) && /if \(me\.country\) uitAccount = true;/.test(plan));
ok('alleen een land dat als keuze bestaat, daarna een change-event', /o\.value === code/.test(pfn) && /landSel\.dispatchEvent\(new Event\('change', \{ bubbles: true \}\)\)/.test(pfn));

console.log(`\n${pass}/${pass + fail} geslaagd`);
if (fail) process.exit(1);
