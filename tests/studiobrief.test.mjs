/* ═══════════════════════════════════════════════════════════════════════════════
 * DE STUDIOBRIEF — het aanmeldveld en zijn eindpunt. 23 september 2026.
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Lucas koos een Studiobrief van *"hooguit één per maand"*, zonder dat het
 * sales-achtig wordt. Wat hier vast moet staan:
 *
 *   1  Een aanmelding wordt een toestemmingsrij (wie, taal, waar) en een
 *      contact in Resend, in het segment van zijn taal als dat er is.
 *   2  Eén welkomstmail per adres, niet bij elke druk op de knop.
 *   3  Een bot (honeypot) of een kapot adres laat geen rij achter.
 *   4  Zonder JS komt de bezoeker terug op dezelfde pagina, op het anker
 *      waar de bevestiging staat; een vreemde Referer telt niet.
 *   5  Het veld staat in de voettekst, op /guides en /editions, en de
 *      privacyverklaring noemt het, in beide talen.
 */
import { readFileSync } from 'node:fs';
import { d1, verseDb } from './lib/d1sqlite.mjs';
import { onRequestPost, BRONNEN, terugNaar } from '../functions/api/studiobrief.js';

let goed = 0, fout = 0;
function ok(naam, kreeg, verwacht = true) {
  const g = JSON.stringify(kreeg) === JSON.stringify(verwacht);
  if (g) goed++; else fout++;
  console.log(` ${g ? 'ok  ' : 'FAIL'} ${String(naam).padEnd(64)}${g ? '' : ` verwacht ${JSON.stringify(verwacht)} kreeg ${JSON.stringify(kreeg)}`}`);
}
const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');

const { db } = verseDb(new URL('../schema.sql', import.meta.url));
const verstuurd = [];
globalThis.fetch = async (url, init = {}) => {
  verstuurd.push({ url: String(url), body: init.body ? JSON.parse(init.body) : null });
  return new Response(JSON.stringify({ id: 'x' }), { status: 200, headers: { 'content-type': 'application/json' } });
};
const env = {
  DB: d1(db), PORTAL_SALT: 'zout', RESEND_API_KEY: 're_test', NOTIFY_EMAIL: 'studio@voorbeeld.test',
  RESEND_SEGMENT_NL: 'seg-nl', RESEND_SEGMENT_EN: 'seg-en',
};
let ipTeller = 1;
function post(velden, { referer, ip } = {}) {
  const f = new FormData();
  for (const [k, v] of Object.entries(velden)) f.set(k, v);
  const headers = new Headers({ 'cf-connecting-ip': ip || `10.0.0.${ipTeller++}` });
  if (referer) headers.set('Referer', referer);
  return onRequestPost({ request: new Request('https://visuails.com/api/studiobrief', { method: 'POST', body: f, headers }), env });
}
const rij = (email) => db.prepare('SELECT email, source FROM subscribers WHERE email = ?').get(email);

console.log('1 · een aanmelding');
{
  verstuurd.length = 0;
  const res = await post({ email: 'Mara@VoltBrand.test', lang: 'nl', bron: 'gidsen', mode: 'json' });
  ok('200 en ok', [res.status, (await res.json()).ok], [200, true]);
  ok('de rij: kleine letters, bron en taal', rij('mara@voltbrand.test'), { email: 'mara@voltbrand.test', source: 'studiobrief-gidsen-nl' });
  const contact = verstuurd.find((v) => v.url.endsWith('/contacts'));
  ok('een Resend-contact', Boolean(contact), true);
  ok('in het Nederlandse segment', contact?.body?.segments, [{ id: 'seg-nl' }]);
  const mails = verstuurd.filter((v) => v.url.endsWith('/emails'));
  ok('twee mails: welkom en een regel naar de studio', mails.length, 2);
  ok('de welkomstmail is Nederlands', /Studiobrief/.test(mails[0]?.body?.subject || ''), true);
  ok('en hij belooft geen acties', /Geen acties/.test(mails[0]?.body?.html || ''), true);
}

console.log('\n2 · nog eens aanmelden: geen tweede welkomstmail');
{
  verstuurd.length = 0;
  const res = await post({ email: 'mara@voltbrand.test', lang: 'nl', bron: 'voet', mode: 'json' });
  ok('nog steeds ok', res.status, 200);
  ok('geen mail', verstuurd.filter((v) => v.url.endsWith('/emails')).length, 0);
  ok('de eerste rij blijft staan', rij('mara@voltbrand.test').source, 'studiobrief-gidsen-nl');
}

console.log('\n3 · Engels, en een onbekende bron');
{
  verstuurd.length = 0;
  await post({ email: 'ana@shop.test', lang: 'en', bron: 'ergens', mode: 'json' });
  ok('een onbekende bron wordt voet', rij('ana@shop.test').source, 'studiobrief-voet-en');
  ok('in het Engelse segment', verstuurd.find((v) => v.url.endsWith('/contacts'))?.body?.segments, [{ id: 'seg-en' }]);
  ok('de bronnen zijn de drie plekken', BRONNEN, ['voet', 'gidsen', 'editions']);
}

console.log('\n4 · wat niet mag');
{
  let res = await post({ email: 'bot@spam.test', website_hp: 'http://x', lang: 'en', mode: 'json' });
  ok('honeypot: de bot ziet "gelukt"', res.status, 200);
  ok('maar er staat geen rij', rij('bot@spam.test') ?? null, null);
  res = await post({ email: 'geen-adres', lang: 'nl', mode: 'json' });
  ok('een kapot adres: 400', res.status, 400);
  const ip = '10.9.9.9';
  const codes = [];
  for (let i = 0; i < 6; i++) codes.push((await post({ email: `r${i}@x.test`, lang: 'nl', mode: 'json' }, { ip })).status);
  ok('de zesde binnen tien minuten: 429', codes, [200, 200, 200, 200, 200, 429]);
}

console.log('\n5 · zonder JavaScript: terug naar dezelfde pagina');
{
  let res = await post({ email: 'zonder@js.test', lang: 'nl', bron: 'voet' }, { referer: 'https://visuails.com/nl/catalog/' });
  ok('303 naar de pagina met het anker', [res.status, res.headers.get('Location')], [303, '/nl/catalog/#brief-ok-voet']);
  res = await post({ email: 'kapot', lang: 'en', bron: 'gidsen' }, { referer: 'https://visuails.com/guides/' });
  ok('een fout gaat naar het foutanker', res.headers.get('Location'), '/guides/#brief-fout-gidsen');
  const vreemd = new Request('https://visuails.com/api/studiobrief', { headers: { Referer: 'https://kwaad.test/nl/x' } });
  ok('een vreemde Referer telt niet', terugNaar(vreemd, 'nl', 'brief-ok-voet'), '/nl/#brief-ok-voet');
}

console.log('\n6 · waar het veld staat, en wat de verklaring zegt');
{
  const layout = read('src/layouts/Layout.astro');
  ok('de voettekst draagt het veld', /<Studiobrief lang=\{lang\} bron="voet"/.test(layout), true);
  ok('/guides', /<Studiobrief lang=\{lang\} bron="gidsen"/.test(read('src/components/GuidesPage.astro')), true);
  ok('/editions', /<Studiobrief lang=\{lang\} bron="editions"/.test(read('src/components/EditionsPage.astro')), true);
  const comp = read('src/components/Studiobrief.astro');
  ok('het formulier post naar het eindpunt', /action="\/api\/studiobrief"/.test(comp), true);
  ok('en het anker bestaat in de HTML', /id=\{`brief-ok-\$\{bron\}`\}/.test(comp), true);
  ok('het blok zegt "hooguit één mail per maand"', /Hooguit één mail per maand/.test(comp) && /One email a month at most/.test(comp), true);
  for (const [taal, pad, woord] of [['nl', 'src/pages/nl/privacy.astro', 'Studiobrief'], ['en', 'src/pages/privacy.astro', 'Studio letter']]) {
    const t = read(pad);
    ok(`privacy ${taal}: noemt het`, (t.match(new RegExp(woord, 'g')) || []).length >= 4, true);
  }
}

console.log(`\n${goed}/${goed + fout} geslaagd`);
if (fout) process.exit(1);
