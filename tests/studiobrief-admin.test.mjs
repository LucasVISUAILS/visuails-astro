/* ═══════════════════════════════════════════════════════════════════════════════
 * DE STUDIOBRIEF IN /admin — 9 november 2026 (ronde 92)
 * ═══════════════════════════════════════════════════════════════════════════════
 *   node tests/studiobrief-admin.test.mjs        (geen server, geen browser, geen echte Resend)
 *
 * Lucas: een lijst waar een aanmelding vanzelf op komt, een brief opstellen en inplannen, en wie
 * onderaan op afmelden klikt, staat hier vanzelf op afgemeld. Wat hier vast moet staan:
 *
 *   1  De routes: alleen voor de beheerder (zonder sessie naar het inloggen, een POST van buiten 403);
 *      Studiobrief staat in het klapje Instellingen; het voorbeeld heeft een eigen smalle CSP.
 *   2  De lijst: alleen aanmeldingen voor de brief (niet de checklist), tellers per taal, zoeken, geen export.
 *   3  Opslaan: een concept met de brief in de mailstijl, de afmeldplaatshouder van Resend en de regel
 *      "Afmelden kan onderaan elke brief."; tekst wordt ontsnapt; links en tussenkoppen werken.
 *   4  Proefmail naar het adres van de beheerder, met de plaatshouder ingevuld.
 *   5  Plannen en meteen versturen via een nagemaakte Resend: POST /broadcasts met segment_id, from,
 *      subject en html, dan POST /broadcasts/{id}/send (met scheduled_at); annuleren is DELETE. Zonder
 *      vinkje of met een moment in het verleden gebeurt er niets; twee keer drukken is één broadcast; een
 *      weigering van Resend wordt "fout" met de reden, en een half concept bij Resend wordt opgeruimd.
 *   6  De webhook: een geldige handtekening met contact.updated (unsubscribed: true) zet unsubscribed_at,
 *      contact.deleted ook, unsubscribed: false haalt hem weg; een foute handtekening is 401 en schrijft
 *      niets; zonder secret 503; een bounce gaat nog gewoon naar mail_bounces.
 *   7  Met de hand afmelden: hier en in Resend (PATCH /contacts/{e-mail}).
 *   8  Zonder RESEND_WEBHOOK_SECRET zegt het scherm dat de terugkoppeling nog uit staat.
 * Verzonnen adressen (@voorbeeld.test), testadres Teststraat 1, 1234 AB Teststad.
 */
import { d1, verseDb } from './lib/d1sqlite.mjs';
import { adminGet, adminPost } from '../src/lib/admin.js';
import { mintToken, hashToken } from '../src/lib/token.js';
import { onRequestPost as webhook } from '../functions/api/webhook/resend.js';
import { briefHtml, tekstNaarBlokken, parseContactEvent, AFMELD_PLAATSHOUDER, planMoment } from '../src/lib/studiobriefBeheer.js';

let goed = 0, fout = 0;
const ok = (naam, w, v = true) => {
  const p = JSON.stringify(w) === JSON.stringify(v);
  if (p) goed++; else fout++;
  console.log(`${p ? 'ok  ' : 'FAIL'}  ${naam}${p ? '' : `    verwacht ${JSON.stringify(v)} kreeg ${JSON.stringify(w)}`}`);
};

const { db, mislukt } = verseDb(new URL('../schema.sql', import.meta.url));
ok('het schema laadt (met migratie 0070)', mislukt.length, 0);
const SECRET = `whsec_${Buffer.from('proef-geheim-studiobrief-32-bytes').toString('base64')}`;
const env = {
  DB: d1(db), RESEND_API_KEY: 're_test_nep', RESEND_SEGMENT_NL: 'seg-nl', RESEND_SEGMENT_EN: 'seg-en',
  FROM_EMAIL: 'VISUAILS <orders@voorbeeld.test>', SELLER_ADDRESS: 'Teststraat 1, 1234 AB Teststad', VISUAILS_KVK: '12345678',
};
db.exec(`
  INSERT INTO admin_users (id, email, password_hash) VALUES (1, 'studio@voorbeeld.test', 'x');
  INSERT INTO subscribers (email, source) VALUES
    ('anna@voorbeeld.test', 'studiobrief-voet-nl'), ('bram@voorbeeld.test', 'studiobrief-gidsen-nl'),
    ('chris@voorbeeld.test', 'studiobrief-editions-en'), ('eva@voorbeeld.test', 'checklist');
`);
const token = await mintToken();
db.prepare("INSERT INTO admin_sessions (id, admin_id, token_hash, expires_at) VALUES (1, 1, ?, '2099-01-01T00:00:00Z')").run(await hashToken(token));

/* Nagemaakte Resend: elke aanroep wordt bewaard; `antwoorden` bepaalt per pad wat er terugkomt. */
let aanroepen = [];
let antwoorden = {};
globalThis.fetch = async (url, init = {}) => {
  const u = new URL(String(url));
  const methode = (init.method || 'GET').toUpperCase();
  aanroepen.push({ methode, pad: u.pathname, body: init.body ? JSON.parse(init.body) : null, auth: init.headers?.Authorization || init.headers?.authorization });
  if (u.hostname !== 'api.resend.com') throw new Error(`onverwacht adres ${u.hostname}`);
  const sleutel = `${methode} ${u.pathname.replace(/\/bc-[\w-]+/, '/{id}')}`;
  const [status, body] = antwoorden[sleutel] || [200, { id: 'bc-1', object: 'broadcast' }];
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
};

const cookie = (met = true) => (met ? { cookie: `vis_admin=${token}` } : {});
const get = async (pad, { sessie = true, e = env } = {}) => {
  const res = await adminGet({ request: new Request(`https://visuails.com${pad}`, { headers: cookie(sessie) }), env: e, waitUntil() {} });
  return { status: res.status, html: await res.text(), loc: res.headers.get('location') || '', csp: res.headers.get('content-security-policy') || '' };
};
const post = async (velden, { sessie = true, origin = 'https://visuails.com', e = env } = {}) => {
  const fd = new FormData();
  for (const [k, v] of Object.entries(velden)) fd.set(k, v);
  const res = await adminPost({ request: new Request('https://visuails.com/admin/studiobrief', { method: 'POST', body: fd, headers: { ...cookie(sessie), origin } }), env: e, waitUntil() {} });
  return { status: res.status, loc: res.headers.get('location') || '', html: res.status === 303 ? '' : await res.text() };
};
const param = (loc, k) => new URL(loc, 'https://visuails.com').searchParams.get(k);
const rij = (id) => db.prepare('SELECT * FROM studiobrieven WHERE id = ?').get(id);
const brief = {
  taal: 'nl', onderwerp: 'Nieuw in november', voorvertoning: 'Drie looks.', kop: 'Drie nieuwe looks',
  tekst: 'Eerste alinea <script>x</script>.\n\n## Wat er verandert\nLees de [vragen](https://visuails.com/nl/faq).',
  knop_tekst: 'Bekijk de looks', knop_link: 'https://visuails.com/nl/lifestyle',
};
const inOverEenDag = (() => {
  const d = new Date(Date.now() + 26 * 3600 * 1000);
  const f = Object.fromEntries(new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Amsterdam', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(d).map((x) => [x.type, x.value]));
  return `${f.year}-${f.month}-${f.day}T${f.hour}:${f.minute}`;
})();

console.log('\n1 · de routes en de toegang');
{
  const zonder = await get('/admin/studiobrief', { sessie: false });
  ok('zonder sessie: naar het inloggen', [zonder.status, zonder.loc], [303, '/admin/login']);
  ok('  het voorbeeld ook', (await get('/admin/studiobrief/1/voorbeeld', { sessie: false })).loc, '/admin/login');
  const p = await post({ do: 'opslaan', ...brief }, { sessie: false });
  ok('een POST zonder sessie: naar het inloggen, niets bewaard', [p.loc, db.prepare('SELECT COUNT(*) AS n FROM studiobrieven').get().n], ['/admin/login', 0]);
  const buiten = await post({ do: 'opslaan', ...brief }, { origin: 'https://kwaad.voorbeeld.test' });
  ok('een POST van een ander domein: 403, niets bewaard', [buiten.status, db.prepare('SELECT COUNT(*) AS n FROM studiobrieven').get().n], [403, 0]);
  const { status, html, csp } = await get('/admin/studiobrief');
  ok('met sessie: 200', status, 200);
  const menu = (/<nav class="bar-nav"[\s\S]*?<\/nav>/.exec(html) || [''])[0];
  ok('Studiobrief staat in het klapje Instellingen, en dat klapje staat open',
    /<details class="adm-klap" open>\s*<summary class="bar-link adm-klap-kop">Instellingen<\/summary>[\s\S]*?aria-current="page">Studiobrief</.test(menu), true);
  ok('  geen vaste plek erbij: de bovenste laag blijft Dashboard, Planning, Klanten, Facturen',
    [...((/<div class="adm-groep">([\s\S]*?)<\/div>/.exec(menu) || ['', ''])[1]).matchAll(/>([^<]+)<\/a>/g)].map((x) => x[1]), ['Dashboard', 'Planning', 'Klanten', 'Facturen']);
  ok('de pagina mag alleen een frame van zichzelf tonen (frame-src \'self\'), verder de CSP van /admin',
    [/frame-src 'self'/.test(csp), /default-src 'none'/.test(csp), /script-src 'self'/.test(csp)], [true, true, true]);
  ok('geen script op de pagina', /<script/.test(html), false);
  ok('kop en lede', [/<h1>Studiobrief<\/h1>/.test(html), /hooguit één per maand/.test(html)], [true, true]);
  ok('404 voor een brief die niet bestaat', (await get('/admin/studiobrief/999/voorbeeld')).status, 404);
}

console.log('\n2 · de lijst met aanmeldingen');
{
  const { html } = await get('/admin/studiobrief');
  ok('de drie aanmeldingen voor de brief staan erin', ['anna@', 'bram@', 'chris@'].every((a) => html.includes(a)), true);
  ok('de checklist-inschrijving niet (geen toestemming voor de brief), wel een regel erover', [html.includes('eva@voorbeeld.test'), /1 andere inschrijving/.test(html)], [false, true]);
  ok('tellers: 2 Nederlands actief, 1 Engels actief, 0 afgemeld',
    [...html.matchAll(/<span class="stat-n">(\d+)<\/span><span class="stat-l">([^<]+)</g)].map((m) => `${m[1]} ${m[2]}`),
    ['2 Nederlands actief', '1 Engels actief', '0 Afgemeld']);
  ok('taal, bron en stand per rij', [/>Engels<\/td>\s*<td data-l="Bron">Editions</.test(html), /<span class="pill">actief<\/span>/.test(html)], [true, true]);
  const z = await get('/admin/studiobrief?q=BRAM');
  ok('zoeken (hoofdletters maken niet uit)', [z.html.includes('bram@voorbeeld.test'), z.html.includes('anna@voorbeeld.test')], [true, false]);
  const procent = await get('/admin/studiobrief?q=%25');
  ok('  een % zoekt naar een procentteken, niet naar alles', procent.html.includes('anna@voorbeeld.test'), false);
  ok('geen export: geen csv, geen download, geen mailto-lijst', [/\.csv|download|text\/csv/i.test(z.html), /href="mailto:[^"]*,/.test(z.html)], [false, false]);
}

console.log('\n3 · een brief opstellen en bewaren');
{
  const leeg = await post({ do: 'opslaan', ...brief, knop_link: 'javascript:alert(1)' });
  ok('een knoplink die niet met https:// begint: geweigerd', [/https:\/\//.test(param(leeg.loc, 'fout')), db.prepare('SELECT COUNT(*) AS n FROM studiobrieven').get().n], [true, 0]);
  const r = await post({ do: 'opslaan', ...brief });
  ok('opslaan: terug naar de brief met "opgeslagen"', [r.status, param(r.loc, 'brief'), param(r.loc, 'klaar')], [303, '1', 'opgeslagen']);
  const b = rij(1);
  ok('de rij: concept, nl, met de velden', [b.status, b.taal, b.onderwerp, b.knop_link], ['concept', 'nl', 'Nieuw in november', 'https://visuails.com/nl/lifestyle']);
  ok('de HTML: kop, knop en de afmeldplaatshouder van Resend', [b.html.includes('Drie nieuwe looks'), b.html.includes('Bekijk de looks'), b.html.includes(AFMELD_PLAATSHOUDER)], [true, true, true]);
  ok('  en de regel "Afmelden kan onderaan elke brief."', b.html.includes('Afmelden kan onderaan elke brief.'), true);
  ok('  de tekst is ontsnapt (geen <script> uit de brief)', [b.html.includes('<script>'), b.html.includes('&lt;script&gt;')], [false, true]);
  ok('  een tussenkop en een link', [/<h2[^>]*>Wat er verandert<\/h2>/.test(b.html), /<a href="https:\/\/visuails.com\/nl\/faq"[^>]*>vragen<\/a>/.test(b.html)], [true, true]);
  ok('  in de mailstijl: de schil van mailTemplate (lockup, voet)', [b.html.includes('lockup-plaat.png'), b.html.includes('Privacyverklaring')], [true, true]);
  ok('  zonder werknotities (HTML-commentaar) erin', /<!--(?!\[if|<!\[endif)/.test(b.html), false);
  const en = briefHtml({ ...brief, taal: 'en' });
  ok('Engels: "You can unsubscribe at the bottom of every letter."', [en.includes('You can unsubscribe at the bottom of every letter.'), /<html lang="en">/.test(en)], [true, true]);
  ok('een tussenkop pakt alleen zijn eigen regel', tekstNaarBlokken('## Kop\nTekst eronder').join('').includes('<h2'), true);
  const { html } = await get('/admin/studiobrief?brief=1');
  ok('het scherm toont het concept met het voorbeeldframe', [/<iframe class="sb-voorbeeld" src="\/admin\/studiobrief\/1\/voorbeeld"/.test(html), html.includes('value="Nieuw in november"')], [true, true]);
  const vb = await get('/admin/studiobrief/1/voorbeeld');
  ok('het voorbeeld: de brief, met een dode afmeldlink in plaats van de plaatshouder', [vb.status, vb.html.includes('Drie nieuwe looks'), vb.html.includes('{{{'), vb.html.includes('href="#afmelden"')], [200, true, false, true]);
  ok('  met een eigen CSP: inline stijl en beelden, geen script, alleen in een frame van ons',
    [/style-src 'unsafe-inline'/.test(vb.csp), /script-src/.test(vb.csp), /frame-ancestors 'self'/.test(vb.csp)], [true, false, true]);
  const bij = await post({ do: 'opslaan', id: '1', ...brief, onderwerp: 'Nieuw in november (bijgewerkt)' });
  ok('een concept weer opslaan werkt dezelfde rij bij', [param(bij.loc, 'brief'), rij(1).onderwerp, db.prepare('SELECT COUNT(*) AS n FROM studiobrieven').get().n], ['1', 'Nieuw in november (bijgewerkt)', 1]);
}

console.log('\n4 · de proefmail');
{
  aanroepen = [];
  const r = await post({ do: 'proef', id: '1', ...brief });
  ok('terug met "proef"', param(r.loc, 'klaar'), 'proef');
  const mail = aanroepen.find((a) => a.pad === '/emails');
  ok('één mail via sendMail, naar het adres van de beheerder', [aanroepen.length, mail?.body?.to], [1, 'studio@voorbeeld.test']);
  ok('  met "[Proef]" voor het onderwerp', mail?.body?.subject, '[Proef] Nieuw in november');
  ok('  de afmeldplaatshouder is een mailto (Resend vult hem alleen in een broadcast in)', [mail.body.html.includes('{{{'), /mailto:hello@visuails\.com\?subject=Afmelden/.test(mail.body.html)], [false, true]);
  ok('  geen broadcast', aanroepen.some((a) => a.pad.startsWith('/broadcasts')), false);
  const zonderSleutel = await post({ do: 'proef', id: '1', ...brief }, { e: { ...env, RESEND_API_KEY: '' } });
  ok('zonder RESEND_API_KEY: opgeslagen, maar de melding zegt dat er geen proef ging', /RESEND_API_KEY/.test(param(zonderSleutel.loc, 'fout')), true);
}

console.log('\n5 · inplannen, annuleren, meteen versturen');
{
  aanroepen = [];
  const zonderVink = await post({ do: 'plannen', id: '1', moment: inOverEenDag });
  ok('zonder vinkje: niets naar Resend, nog concept', [/Vink/.test(param(zonderVink.loc, 'fout')), aanroepen.length, rij(1).status], [true, 0, 'concept']);
  const verleden = await post({ do: 'plannen', id: '1', moment: '2020-01-01T10:00', zeker: '1' });
  ok('een moment in het verleden: geweigerd, niets naar Resend', [/vijf minuten/.test(param(verleden.loc, 'fout')), aanroepen.length], [true, 0]);
  ok('planMoment rekent Amsterdamse tijd naar UTC (winter: -1 uur)', planMoment('2030-01-15T10:00', new Date('2029-01-01')).iso, '2030-01-15T09:00:00.000Z');

  antwoorden = { 'POST /broadcasts': [200, { id: 'bc-1', object: 'broadcast' }] };
  const r = await post({ do: 'plannen', id: '1', moment: inOverEenDag, zeker: '1' });
  ok('inplannen: terug met "gepland"', param(r.loc, 'klaar'), 'gepland');
  const [maak, stuur] = aanroepen;
  ok('eerst POST /broadcasts, dan POST /broadcasts/bc-1/send', [aanroepen.length, `${maak.methode} ${maak.pad}`, `${stuur.methode} ${stuur.pad}`], [2, 'POST /broadcasts', 'POST /broadcasts/bc-1/send']);
  ok('  met de sleutel als Bearer', maak.auth, 'Bearer re_test_nep');
  ok('  het segment van de taal, de afzender, het onderwerp', [maak.body.segment_id, maak.body.from, maak.body.subject, maak.body.reply_to], ['seg-nl', 'VISUAILS <orders@voorbeeld.test>', 'Nieuw in november', 'hello@visuails.com']);
  ok('  de opgeslagen HTML, met de afmeldplaatshouder; de platte tekst ook', [maak.body.html === rij(1).html, maak.body.html.includes(AFMELD_PLAATSHOUDER), maak.body.text.includes(AFMELD_PLAATSHOUDER)], [true, true, true]);
  ok('  niet meteen versturen bij het aanmaken (geen send: true)', maak.body.send === undefined, true);
  const verwacht = planMoment(inOverEenDag).iso;
  ok('  scheduled_at is het gekozen moment in UTC (ISO 8601)', stuur.body.scheduled_at, verwacht);
  const b = rij(1);
  ok('de rij: gepland, met het id van Resend en het moment', [b.status, b.resend_id, b.gepland_op], ['gepland', 'bc-1', verwacht.slice(0, 19).replace('T', ' ')]);
  aanroepen = [];
  const nogEens = await post({ do: 'plannen', id: '1', moment: inOverEenDag, zeker: '1' });
  ok('nog eens drukken: geen tweede broadcast', [/al gepland/.test(param(nogEens.loc, 'fout')), aanroepen.length], [true, 0]);
  const bewerk = await post({ do: 'opslaan', id: '1', ...brief, onderwerp: 'stiekem anders' });
  ok('een geplande brief is niet meer te bewerken', [/niet meer te bewerken/.test(param(bewerk.loc, 'fout')), rij(1).onderwerp], [true, 'Nieuw in november']);
  const scherm = await get('/admin/studiobrief');
  ok('het scherm toont hem als gepland, met Annuleren', [/<span class="pill is-warn">Gepland<\/span>/.test(scherm.html), /name="do" value="annuleren"/.test(scherm.html)], [true, true]);

  const an = await post({ do: 'annuleren', id: '1' });
  ok('annuleren: DELETE /broadcasts/bc-1', [param(an.loc, 'klaar'), aanroepen.map((a) => `${a.methode} ${a.pad}`)], ['geannuleerd', ['DELETE /broadcasts/bc-1']]);
  ok('  en de brief is weer een concept, zonder id en moment', [rij(1).status, rij(1).resend_id, rij(1).gepland_op], ['concept', null, null]);

  aanroepen = [];
  antwoorden = { 'POST /broadcasts': [200, { id: 'bc-2', object: 'broadcast' }] };
  const nu = await post({ do: 'nu', id: '1', zeker: '1' });
  ok('nu versturen: send zonder scheduled_at', [param(nu.loc, 'klaar'), aanroepen[1].pad, JSON.stringify(aanroepen[1].body)], ['verstuurd', '/broadcasts/bc-2/send', '{}']);
  ok('  de rij: verstuurd, met verstuurd_op', [rij(1).status, rij(1).resend_id, !!rij(1).verstuurd_op], ['verstuurd', 'bc-2', true]);
  const logboek = db.prepare("SELECT action FROM admin_log WHERE action LIKE 'studiobrief.%' ORDER BY id").all().map((x) => x.action);
  ok('het logboek: proef, gepland, geannuleerd, verstuurd', logboek, ['studiobrief.proef', 'studiobrief.gepland', 'studiobrief.geannuleerd', 'studiobrief.verstuurd']);

  /* Een gepland moment dat voorbij is, staat bij het openen van het scherm als verstuurd. */
  db.exec("INSERT INTO studiobrieven (id, taal, onderwerp, html, resend_id, status, gepland_op) VALUES (5, 'en', 'Oud gepland', '<p>x</p>', 'bc-5', 'gepland', datetime('now', '-1 hour'))");
  await get('/admin/studiobrief');
  ok('een geplande brief waarvan het moment voorbij is: verstuurd', [rij(5).status, rij(5).verstuurd_op === rij(5).gepland_op], ['verstuurd', true]);

  /* Resend weigert. */
  await post({ do: 'opslaan', ...brief, taal: 'en' });
  const id2 = db.prepare('SELECT MAX(id) AS id FROM studiobrieven').get().id;
  aanroepen = [];
  antwoorden = { 'POST /broadcasts': [403, { name: 'restricted_api_key', message: 'This API key is restricted to only send emails' }] };
  const weig = await post({ do: 'nu', id: String(id2), zeker: '1' });
  ok('Resend weigert het aanmaken: stand "fout" met de reden en de uitleg over Full access', [rij(id2).status, /restricted/.test(rij(id2).fout), /Full access/.test(param(weig.loc, 'fout'))], ['fout', true, true]);
  aanroepen = [];
  antwoorden = { 'POST /broadcasts': [200, { id: 'bc-3' }], 'POST /broadcasts/{id}/send': [422, { message: 'scheduled_at is invalid' }] };
  await post({ do: 'plannen', id: String(id2), moment: inOverEenDag, zeker: '1' });
  ok('versturen mislukt na het aanmaken: het concept bij Resend wordt weer weggehaald', aanroepen.map((a) => `${a.methode} ${a.pad}`), ['POST /broadcasts', 'POST /broadcasts/bc-3/send', 'DELETE /broadcasts/bc-3']);
  ok('  en de brief staat op fout, niet op gepland', [rij(id2).status, rij(id2).gepland_op], ['fout', null]);
  antwoorden = {};
  aanroepen = [];
  const geenSegment = await post({ do: 'nu', id: String(id2), zeker: '1' }, { e: { ...env, RESEND_SEGMENT_EN: '' } });
  ok('zonder segment voor de taal: niets naar Resend, de melding noemt RESEND_SEGMENT_EN', [aanroepen.length, /RESEND_SEGMENT_EN/.test(param(geenSegment.loc, 'fout'))], [0, true]);
  const weg = await post({ do: 'verwijderen', id: String(id2) });
  ok('een concept (of fout) verwijderen', [param(weg.loc, 'klaar'), rij(id2)], ['verwijderd', undefined]);
  await post({ do: 'verwijderen', id: '1' });
  ok('  een verstuurde brief niet', rij(1)?.status, 'verstuurd');
}

console.log('\n6 · de webhook: afmelden komt terug in de lijst');
const teken = async (body, { geheim = SECRET, id = `msg_${Math.random().toString(36).slice(2)}`, ts = Math.floor(Date.now() / 1000) } = {}) => {
  const sleutel = Buffer.from(geheim.replace(/^whsec_/, ''), 'base64');
  const key = await crypto.subtle.importKey('raw', sleutel, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const mac = Buffer.from(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${id}.${ts}.${body}`))).toString('base64');
  return { 'svix-id': id, 'svix-timestamp': String(ts), 'svix-signature': `v1,${mac}` };
};
const haak = async (payload, { e = { ...env, RESEND_WEBHOOK_SECRET: SECRET }, geheim, kopjes } = {}) => {
  const body = JSON.stringify(payload);
  const headers = kopjes || await teken(body, geheim ? { geheim } : {});
  const res = await webhook({ request: new Request('https://visuails.com/api/webhook/resend', { method: 'POST', body, headers }), env: e });
  return res.status;
};
const af = (email) => db.prepare('SELECT unsubscribed_at FROM subscribers WHERE email = ?').get(email)?.unsubscribed_at ?? null;
{
  const update = (email, unsubscribed) => ({ type: 'contact.updated', created_at: '2026-11-09T10:00:00.000Z', data: { id: 'c-1', email, segment_ids: ['seg-nl'], updated_at: '2026-11-09T10:00:00.000Z', unsubscribed } });
  ok('parseContactEvent: contact.updated met unsubscribed', parseContactEvent(update('Anna@Voorbeeld.test', true)), { type: 'contact.updated', email: 'anna@voorbeeld.test', afgemeld: true, op: '2026-11-09 10:00:00' });
  ok('  een ander event is geen contactbericht', parseContactEvent({ type: 'email.delivered', data: { to: ['x@voorbeeld.test'] } }), null);
  const vals = await haak(update('anna@voorbeeld.test', true), { geheim: `whsec_${Buffer.from('een-ander-geheim-van-32-bytes!!').toString('base64')}` });
  ok('een foute handtekening: 401, niets geschreven', [vals, af('anna@voorbeeld.test')], [401, null]);
  const geen = await haak(update('anna@voorbeeld.test', true), { kopjes: { 'content-type': 'application/json' } });
  ok('geen handtekening: 401', geen, 401);
  const oud = await haak(update('anna@voorbeeld.test', true), { kopjes: await teken(JSON.stringify(update('anna@voorbeeld.test', true)), { ts: Math.floor(Date.now() / 1000) - 3600 }) });
  ok('een handtekening van een uur oud: 401', oud, 401);
  ok('geen secret ingesteld: 503', await haak(update('anna@voorbeeld.test', true), { e: env }), 503);
  ok('een geldige afmelding: 200', await haak(update('Anna@voorbeeld.test', true)), 200);
  ok('  unsubscribed_at staat in subscribers', af('anna@voorbeeld.test'), '2026-11-09 10:00:00');
  await haak({ ...update('anna@voorbeeld.test', true), data: { ...update('anna@voorbeeld.test', true).data, updated_at: '2026-11-10T10:00:00.000Z' } });
  ok('  een tweede aflevering laat de eerste datum staan', af('anna@voorbeeld.test'), '2026-11-09 10:00:00');
  ok('contact.deleted telt als afgemeld', [await haak({ type: 'contact.deleted', created_at: '2026-11-09T11:00:00.000Z', data: { email: 'bram@voorbeeld.test' } }), !!af('bram@voorbeeld.test')], [200, true]);
  ok('weer aangemeld in Resend (unsubscribed: false): de datum gaat eraf', [await haak(update('bram@voorbeeld.test', false)), af('bram@voorbeeld.test')], [200, null]);
  ok('een adres dat hier niet staat: 200, geen rij erbij', [await haak(update('onbekend@voorbeeld.test', true)), db.prepare("SELECT COUNT(*) AS n FROM subscribers WHERE email = 'onbekend@voorbeeld.test'").get().n], [200, 0]);
  const bounce = await haak({ type: 'email.bounced', created_at: '2026-11-09T12:00:00.000Z', data: { email_id: 'e-1', to: ['chris@voorbeeld.test'], subject: 'x', bounce: { type: 'Permanent' } } });
  ok('een bounce gaat nog gewoon naar mail_bounces', [bounce, db.prepare("SELECT COUNT(*) AS n FROM mail_bounces WHERE email = 'chris@voorbeeld.test'").get().n], [200, 1]);
  const { html } = await get('/admin/studiobrief', { e: { ...env, RESEND_WEBHOOK_SECRET: SECRET } });
  ok('de lijst toont anna als afgemeld, de teller telt hem', [/anna@voorbeeld\.test<\/td>[\s\S]*?<span class="pill is-warn">afgemeld<\/span>/.test(html), /<span class="stat-n">1<\/span><span class="stat-l">Afgemeld/.test(html)], [true, true]);
  ok('met het secret: "de terugkoppeling van afmeldingen staat aan", met het laatste bericht', [/terugkoppeling van afmeldingen staat aan/.test(html), /Laatste bericht over een contact/.test(html)], [true, true]);
}

console.log('\n7 · met de hand afmelden (wie per mail vroeg)');
{
  aanroepen = [];
  const r = await post({ do: 'afmelden', email: 'chris@voorbeeld.test' });
  ok('afgemeld, hier en in Resend', [param(r.loc, 'klaar'), !!af('chris@voorbeeld.test'), aanroepen.map((a) => `${a.methode} ${a.pad}`), aanroepen[0]?.body], ['afgemeld', true, ['PATCH /contacts/chris%40voorbeeld.test'], { unsubscribed: true }]);
  aanroepen = [];
  const vreemd = await post({ do: 'afmelden', email: 'eva@voorbeeld.test' });
  ok('een checklist-adres is geen aanmelding: niets naar Resend', [!!param(vreemd.loc, 'fout'), aanroepen.length], [true, 0]);
}

console.log('\n8 · zonder webhook-secret');
{
  const { html } = await get('/admin/studiobrief');
  ok('het scherm zegt dat de terugkoppeling nog uit staat', /terugkoppeling van afmeldingen staat nog uit/.test(html), true);
  ok('  en "Zo zet je het aan" staat open, met de stappen voor de webhook', [/<details class="card sb-aan" open>/.test(html), /contact\.updated<\/code> en <code>contact\.deleted<\/code>/.test(html)], [true, true]);
  const alles = await get('/admin/studiobrief', { e: { ...env, RESEND_WEBHOOK_SECRET: SECRET } });
  ok('met alles gezet staat het blok dicht', /<details class="card sb-aan">/.test(alles.html), true);
}

console.log('\n9 · zonder migratie 0070');
{
  const { db: oud } = verseDb(new URL('../schema.sql', import.meta.url));
  oud.exec('DROP TABLE studiobrieven; ALTER TABLE subscribers DROP COLUMN unsubscribed_at;');
  oud.exec("INSERT INTO admin_users (id, email, password_hash) VALUES (1, 'studio@voorbeeld.test', 'x'); INSERT INTO subscribers (email, source) VALUES ('anna@voorbeeld.test', 'studiobrief-voet-nl')");
  oud.prepare("INSERT INTO admin_sessions (id, admin_id, token_hash, expires_at) VALUES (1, 1, ?, '2099-01-01T00:00:00Z')").run(await hashToken(token));
  const r = await get('/admin/studiobrief', { e: { ...env, DB: d1(oud) } });
  ok('het scherm valt niet om: 200, de lijst staat er, met de melding over de migratie', [r.status, r.html.includes('anna@voorbeeld.test'), /migratie 0070/.test(r.html)], [200, true, true]);
}

console.log(`\n${goed} goed, ${fout} fout`);
process.exit(fout ? 1 : 0);
