/*
 * LEVERING 119 · de overdrachten tussen de bouwers (integrator I9), 18 november 2026
 *
 *   node tests/levering-119-integratie.test.mjs        (geen build nodig)
 *
 * Wat de vijf bouwers in elkaars bestanden vroegen, en twee besluiten van Lucas van vandaag:
 *   P10-02  productnaam hoogstens 80 tekens (één bron, formulier én server); lange woorden breken in mail, /o/ en /admin.
 *   P10-09  een eigen gezicht per product in de bevestigingsmail.
 *   A0-01   de aanhef uit het veld Voornaam ("Hallo Jan Willem,") in greeting() en de mails buiten /admin.
 *   P6-22   het onderwerp privacy bij /contact, "Onderwerp: …" in de bevestiging, en NIET het bericht zelf (o04).
 *   P9-05   één deelzin (deelLink.js) in levermail, /o/, StudioHal en de tip.   P9-03  geen "stap 5" in de tip.
 *   P3-07   /admin/planning: een feestdag "dicht · feestdag" met "Toch open", en "Weer dicht".
 *   P6-24   voorrangGrens() op /pricing en in de voorwaarden.   L-05  "vastgehouden zodra je bestelt".
 *   P11-11 P11-12 P9-08 P6-26 D1-13 L-13  uit de bron.
 *   Lucas (18 nov): video op maat zonder bedrag voor de klant; privacy §4 zonder "analytische cookies".
 */
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';
import { d1, verseDb } from './lib/d1sqlite.mjs';
import { mintToken, hashToken } from '../src/lib/token.js';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const lees = (p) => readFileSync(`${ROOT}${p}`, 'utf8');
let pass = 0;
let fail = 0;
function ok(name, cond, extra = '') {
  if (cond) pass++; else fail++;
  console.log(`${cond ? ' ok  ' : ' FAIL'} ${name}${cond || !extra ? '' : ` — ${extra}`}`);
}
const stil = () => { const e = console.error, w = console.warn, l = console.log; console.error = console.warn = () => {}; return () => { console.error = e; console.warn = w; console.log = l; }; };
const tekst = (h) => String(h).replace(/<[^>]+>/g, ' ').replace(/&middot;/g, '·').replace(/&amp;/g, '&').replace(/\s+/g, ' ');
console.log('\nVISUAILS — levering 119: de overdrachten (I9)\n');

globalThis.fetch = async () => new Response(JSON.stringify({ id: 'msg_test' }), { status: 200, headers: { 'content-type': 'application/json' } });

const order = lees('functions/api/order.js');

console.log('P10-02 · de productnaam en lange woorden');
{
  const { PRODUCT_NAAM_MAX } = await import('../src/data/attributes.js');
  ok('PRODUCT_NAAM_MAX = 80 in attributes.js', PRODUCT_NAAM_MAX === 80);
  ok('OrderFlow importeert hem (geen eigen getal meer)', /PRODUCT_NAAM_MAX,\n\} from '\.\.\/\.\.\/data\/attributes\.js';/.test(lees('src/components/order/OrderFlow.astro')) && !/const PRODUCT_NAAM_MAX = 80;/.test(lees('src/components/order/OrderFlow.astro')));
  ok('/api/order knipt product_pN op PRODUCT_NAAM_MAX', /if \(\/\^product_p\\d\{1,3\}\$\/\.test\(key\)\) return capAnswer\(value, PRODUCT_NAAM_MAX\);/.test(order));
  const { rows, quote } = await import('../src/lib/mailTemplate.js');
  ok('mail: de tabel van rows() breekt lange woorden (erft door naar de cellen)', /<table[^>]*style="[^"]*word-break:break-word;overflow-wrap:anywhere"/.test(rows([['Product', 'x'.repeat(228)]])));
  ok('mail: quote() ook', /word-break:break-word;overflow-wrap:anywhere/.test(quote('x')));
  ok('/o/: .nu-zin en .shots-kop breken', /\.nu-zin, \.shots-kop \{ overflow-wrap: anywhere; \}/.test(lees('public/portal.css')));
  ok('/admin: het blok "foto ontbreekt" en de productnaam op het bord breken', /\.ontbreekt-blok p, \.board-naam \{ overflow-wrap: anywhere; \}/.test(lees('public/admin.css')));
}

console.log('\nP10-09 + A0-01 · de bevestigingsmail');
{
  const herstel = stil();
  const { customerEmail } = await import('../functions/api/order.js');
  const maak = (details, opties = {}) => tekst(customerEmail('nl', 'VIS-AB12-CD3', 'catalog', 'Jan Willem de Vries', { quote: { netCents: 9000, lines: [] }, details, ...opties }));
  const a = maak({ model: 'ava', model_p2: 'seme', model_p3: 'ava' }, { voornaam: 'Jan Willem' });
  const b = maak({ model: 'ava', model_p1: 'seme', model_p2: 'noor', model_p3: 'seme', model_p4: 'dana' });
  const c = maak({ model: 'ava' });
  herstel();
  ok('"Gezicht Ava · product 2: Seme" (product 3 is gelijk aan de keuze en telt niet)', /Gezicht Ava · product 2: Seme Zo gaat/.test(a), (a.match(/Gezicht.{0,60}/) || [''])[0]);
  ok('boven drie alleen het aantal: "4 producten met een eigen gezicht"', /Gezicht Ava · 4 producten met een eigen gezicht/.test(b), (b.match(/Gezicht.{0,60}/) || [''])[0]);
  ok('zonder afwijking alleen "Ava"', /Gezicht Ava Zo gaat/.test(c), (c.match(/Gezicht.{0,40}/) || [''])[0]);
  ok('de aanhef uit het veld Voornaam: "Hallo Jan Willem,"', /(Hallo|Goede\w+) Jan Willem,/.test(a), (a.match(/(Hallo|Goede\w+) [^,]*,/) || [''])[0]);
  ok('zonder voornaam het eerste woord: "Jan,"', /(Hallo|Goede\w+) Jan,/.test(c));
  ok('order.js geeft de voornaam van het formulier mee', /voornaam: firstName \|\| '',/.test(order));
}

console.log('\nA0-01 · greeting() en de mails buiten /admin');
{
  const { greeting } = await import('../src/lib/mailTemplate.js');
  ok('greeting(naam, nl, { voornaam }) zegt de hele voornaam', greeting('Jan Willem de Vries', 'nl', { voornaam: 'Jan Willem' }) === 'Hallo Jan Willem,');
  ok('zonder voornaam blijft het eerste woord', greeting('Jan Willem de Vries', 'nl') === 'Hallo Jan,');
  ok('de voornaam wordt ge-escapet', greeting('x', 'en', { voornaam: '<b>' }) === 'Hello &lt;b&gt;,');
  const bron = {
    'src/lib/invoiceMail.js': 3, 'src/lib/cancelMail.js': 7, 'src/lib/afrondMail.js': 1, 'src/lib/betaallink.js': 1, 'src/lib/formaten.js': 1, 'cron/index.js': 5,
  };
  for (const [f, n] of Object.entries(bron)) {
    const s = lees(f);
    const m = s.split('\n').filter((r) => /reeting\(/.test(r) && /voornaam/.test(r)).length;
    ok(`${f}: ${n}× de voornaam aan de aanhef`, m === n, String(m));
  }
  ok('cron leest first_name in de vier klantquery\'s', (lees('cron/index.js').match(/NULLIF\(TRIM\(c\.first_name\), ''\) AS first_name/g) || []).length === 4);
  const { cancelEmail } = await import('../src/lib/cancelMail.js');
  const m = tekst(cancelEmail({ order: { ref: 'VIS-AB12-CD3', lang: 'nl', name: 'Jan Willem de Vries', first_name: 'Jan Willem', email: 'jan@voorbeeld.test' }, money: 'unpaid' }).html);
  ok('annuleringsmail: "Hallo Jan Willem,"', /Hallo Jan Willem,/.test(m), (m.match(/Hallo[^,]*,/) || [''])[0]);
}

console.log('\nP6-22 · contact over privacy');
{
  ok('TOPICS: privacy vóór hooks, hooks en other naast elkaar', /'custom-request': 'Iets op maat', privacy: 'Privacy of je gegevens', hooks: 'Hooks', other: 'Anders' \}/.test(order));
  ok('TOPICS_EN idem', /'custom-request': 'Something custom', privacy: 'Privacy or your data', hooks: 'Hooks', other: 'Other' \}/.test(order));
  ok('de bevestiging: kop zonder grijze onderkop, en "Onderwerp: …"', /body: h1\(nlC \? 'Je bericht is binnen' : 'Your message is in'\)\n\s+\+ \(vasteOnderwerp \? p\(`\$\{nlC \? 'Onderwerp' : 'Topic'\}: \$\{esc\(vasteOnderwerp\)\}`\) : ''\)/.test(order));
  const blok = order.slice(order.indexOf("subject: nlC ? 'We hebben je bericht'"), order.indexOf('const okUrl'));
  ok('het bericht zelf staat NIET in de kopie (o04, 8 oktober)', !/Je schreef|You wrote|esc\(body\)/.test(blok));
  const ty = lees('src/components/ThankYouPage.astro');
  ok('bedankpagina: "Je krijgt ook een bevestiging per mail." (NL en EN)', /de volgende ochtend\. Je krijgt ook een bevestiging per mail\.'/.test(ty) && /the next morning\. You also get a confirmation by email\.'/.test(ty));
}

console.log('\nP9-05 + P9-03 · één deelzin, geen stapnummer');
{
  const { DEEL_ZIN } = await import('../src/lib/deelLink.js');
  const { TIPS } = await import('../src/data/tips.js');
  ok('tip privélink NL eindigt op de deelzin', TIPS.nl.privelink.endsWith(DEEL_ZIN.nl) && !/vertrouwt/.test(TIPS.nl.privelink));
  ok('tip privélink EN idem', TIPS.en.privelink.endsWith(DEEL_ZIN.en) && !/trust/.test(TIPS.en.privelink));
  ok('tip abonnement zonder "stap 5" / "step 5"', !/stap 5|step 5/.test(TIPS.nl.abonnement + TIPS.en.abonnement) && /de laatste stap, Betalen/.test(TIPS.nl.abonnement) && /the last step, Pay/.test(TIPS.en.abonnement));
  ok('levermail (admin.js) gebruikt deelZin()', /mailNote\(`\$\{esc\(deelZin\(nl \? 'nl' : 'en'\)\)\} <br>\$\{mailLinkUit\(link\)\}`\)/.test(lees('src/lib/admin.js')) && !/de sleutel tot je bestelling/.test(lees('src/lib/admin.js')));
  const portal = lees('src/lib/portal.js');
  ok('/o/ voet: DEEL_ZIN voorop, de termijn blijft', /footPrivate: \(days\) => `\$\{DEEL_ZIN\.en\} It stops working/.test(portal) && /footPrivate: \(days\) => `\$\{DEEL_ZIN\.nl\} Hij werkt tot/.test(portal));
  const studio = lees('src/components/StudioHal.astro');
  ok('StudioHal: secNote begint met DEEL_ZIN (NL en EN), geen "stuur hem gerust door"', /secNote: `\$\{DEEL_ZIN\.en\}/.test(studio) && /secNote: `\$\{DEEL_ZIN\.nl\}/.test(studio) && !/Stuur hem gerust door/.test(studio));
}

console.log('\nP3-07 · een feestdag in /admin/planning');
{
  const { adminGet, adminPost } = await import('../src/lib/admin.js');
  const { db, mislukt } = verseDb(new URL('../schema.sql', import.meta.url));
  ok('het schema laadt', mislukt.length === 0, mislukt.slice(0, 1).join(''));
  db.exec("INSERT INTO admin_users (id, email, password_hash) VALUES (1, 'studio@voorbeeld.test', 'x')");
  const token = await mintToken();
  db.prepare("INSERT INTO admin_sessions (id, admin_id, token_hash, expires_at) VALUES (1, 1, ?, '2099-01-01T00:00:00Z')").run(await hashToken(token));
  const env = { DB: d1(db), PUBLIC_ORIGIN: 'https://visuails.com', PORTAL_SALT: 'zout' };
  const headers = { cookie: `vis_admin=${token}`, origin: 'https://visuails.com' };
  const get = async (pad) => { const h = stil(); try { return await (await adminGet({ request: new Request(`https://visuails.com${pad}`, { headers }), env, waitUntil() {} })).text(); } finally { h(); } };
  const post = async (velden) => {
    const fd = new FormData();
    for (const [k, v] of Object.entries(velden)) fd.set(k, v);
    const h = stil();
    try { return await adminPost({ request: new Request('https://visuails.com/admin/agenda/dagen', { method: 'POST', body: fd, headers }), env, waitUntil() {} }); } finally { h(); }
  };
  const cel = (html, dag) => {
    const nr = String(Number(dag.slice(8)));
    const delen = html.split('<div class="pl-dag');
    return delen.find((d) => d.includes(`name="dag" value="${dag}"`) || false) || '';
  };
  const VAN = '2026-12-21';
  let h = await get(`/admin/planning?van=${VAN}`);
  ok('25 december: "dicht · feestdag"', /dicht · feestdag/.test(h));
  ok('  met een knop "Toch open" (do=feestdag-open, dag, van)', /name="do" value="feestdag-open">\s*<input type="hidden" name="dag" value="2026-12-25">\s*<input type="hidden" name="van" value="2026-12-21">/.test(h));
  ok('  de knop heeft een rol', /data-rol="bevestigen" type="submit" title="Deze feestdag toch als leverdag aanbieden">Toch open<\/button>/.test(h));
  const r = await post({ do: 'feestdag-open', dag: '2026-12-26', van: VAN });
  ok('POST "Toch open" → terug naar dezelfde twee weken', r.status === 303 && r.headers.get('location') === '/admin/planning?van=2026-12-21#raster', `${r.status} ${r.headers.get('location')}`);
  const rij = db.prepare("SELECT value FROM app_settings WHERE key = 'agenda.feestdag_open'").get();
  ok('  de uitzondering staat in app_settings', rij && JSON.parse(rij.value).includes('2026-12-26'), rij && rij.value);
  ok('  en in het logboek', db.prepare("SELECT COUNT(*) AS n FROM admin_log WHERE action = 'agenda.feestdag'").get().n === 1);
  h = await get(`/admin/planning?van=${VAN}`);
  const c26 = cel(h, '2026-12-26');
  ok('26 december: open, "feestdag, open", met "Weer dicht"', /feestdag, open/.test(c26) && /value="feestdag-dicht"/.test(c26) && />Weer dicht<\/button>/.test(c26), c26.slice(0, 200));
  ok('25 december blijft dicht', /value="feestdag-open">\s*<input type="hidden" name="dag" value="2026-12-25">/.test(h));
  const r2 = await post({ do: 'feestdag-dicht', dag: '2026-12-26', van: VAN });
  ok('POST "Weer dicht" → 303, en 26 december is weer dicht', r2.status === 303 && !JSON.parse(db.prepare("SELECT value FROM app_settings WHERE key = 'agenda.feestdag_open'").get().value).includes('2026-12-26'));
  const r3 = await post({ do: 'feestdag-open', dag: '2026-12-22', van: VAN });
  ok('een gewone dag is geen feestdag: 400', r3.status === 400, String(r3.status));
  h = await get('/admin/planning?van=2026-11-16');
  ok('in een gewone week geen feestdagknop', !/feestdag-open|feestdag-dicht/.test(h));
}

console.log('\nP6-24 · L-05 · voorrang en vastgehouden');
{
  const { voorrangGrens, turnaroundShort, VIDEO_OP_AANVRAAG } = await import('../src/data/pricing.js');
  const ph = lees('src/components/PricingHal.astro');
  ok('PricingHal: "Up to ${voorrangGrens(\'en\')}." en "Tot ${voorrangGrens(\'nl\')}."', /Up to \$\{voorrangGrens\('en'\)\}\./.test(ph) && /Tot \$\{voorrangGrens\('nl'\)\}\./.test(ph) && !/VOORRANG\.maxClips/.test(ph));
  ok('voorwaarden EN en NL lezen voorrangGrens()', /up to \{voorrangGrens\('en', \{ komma: true \}\)\}, and only/.test(lees('src/pages/terms.astro')) && /Voorrang kan tot \{voorrangGrens\('nl'\)\}, en alleen/.test(lees('src/pages/nl/terms.astro')));
  ok('zolang video op aanvraag is noemt de grens geen clips', !VIDEO_OP_AANVRAAG || !/clips/.test(voorrangGrens('nl') + voorrangGrens('en')));
  ok('turnaroundShort: "vastgehouden zodra je bestelt" / "held once you order"', /vastgehouden zodra je bestelt/.test(turnaroundShort('attended', 'nl')) && /held once you order/.test(turnaroundShort('attended', 'en')));
}

console.log('\nP11-11 · P11-12 · P9-08 · P6-26 · D1-13 · L-13 (uit de bron)');
{
  const mp = lees('src/components/order/ModelPicker.astro');
  ok('ModelPicker: alt="" op de foto (de naam staat eronder)', !/alt=\{m\.name\}/.test(mp) && /class="mp-thumb"[\s\S]{0,200}alt=""/.test(mp));
  ok('ModelPicker: de korte naam als alt-tekst "" met terugval', /content: attr\(data-kort\); font-size[^\n]*\n\s+content: attr\(data-kort\) \/ "";/.test(mp));
  ok('ModelKeuze: het vraagteken in de verborgen kop is verborgen', /\.mdl :global\(#pl-model-h\) :global\(button\) \{ visibility: hidden; \}/.test(lees('src/components/order/ModelKeuze.astro')));
  const lay = lees('src/layouts/Layout.astro');
  const kop = lay.slice(lay.indexOf('<head>'), lay.indexOf('</head>'));
  const i = kop.indexOf("addEventListener('pagereveal'");
  ok('Layout: inline pagereveal-vanger in <head>, vóór elk ander script', i > 0 && i < kop.indexOf('<script', kop.indexOf('<script') + 1) && /\['ready','finished','updateCallbackDone'\]\.forEach\(function\(k\)\{v\[k\]&&v\[k\]\.catch\(function\(\)\{\}\)\}\)/.test(kop));
  ok('cookiebeleid NL en EN noemen vis-proef-stand', /<code>vis-proef-stand<\/code>/.test(lees('src/pages/nl/cookie-policy.astro')) && /<code>vis-proef-stand<\/code>/.test(lees('src/pages/cookie-policy.astro')) && /'vis-proef-stand'/.test(lees('src/scripts/interactions.js')));
  /* levering 119 (18 november 2026, hersteller H10, D1-13): het veld is nu even breed als de knop (align-items: stretch, ook
     het veld 100 %); deze regel pinde de oude tekst zonder breedte voor het veld. */
  ok('Studiobrief: veld en knop onder elkaar tussen 761 en 1000 px', /@media \(min-width: 761px\) and \(max-width: 1000px\) \{\s*\.sb-veld \{ flex-direction: column; align-items: stretch; \}\s*\.sb-veld input, \.sb-veld button \{ width: 100%;/.test(lees('src/components/Studiobrief.astro')));
  const ia = lees('src/scripts/interactions.js');
  ok('L-13: de bedankpagina zet het kenmerk uit ?paid= (ook bij ?soort=merkmodel, dat later komt)', /const ref = \(\(params\.get\('ref'\) \|\| ''\)\.trim\(\) \|\| betaald\);/.test(ia) && ia.indexOf("refCel.textContent = ref.toUpperCase()") < ia.indexOf("params.get('soort') === 'merkmodel'"));
  ok('L-13: Mollie keert terug met paid=<ref> (order.js) en het merkmodelformulier zet ?soort=merkmodel', /'paid=' \+ encodeURIComponent\(ref\)/.test(order) && /lp\('\/thank-you'\) \+ '\?soort=merkmodel'/.test(lees('src/components/BrandModelBrief.astro')));
}

console.log('\nLucas, 18 november · video op maat zonder bedrag · privacy §4');
{
  const api = lees('src/lib/opMaatApi.js');
  ok('opMaatApi: video op aanvraag → alleen id en naam per regel, totaal null', /sch\.dienst === 'video' && VIDEO_OP_AANVRAAG\s*\? \{ dienst: sch\.dienst, opAanvraag: true, producten: sch\.producten, regels: sch\.regels\.map\(\(r\) => \(\{ id: r\.id, naam: regelNaam\(r\.id, taal\) \}\)\), totaal: null, aanbetaling: null \}/.test(api) && /schatting: voorKlant\(schatting\(/.test(api));
  const js = lees('public/js/op-maat.js');
  ok('op-maat.js: bij opAanvraag geen bedrag en geen totaal', /var opAanvraag = !!r\.schatting\.opAanvraag;/.test(js) && /if \(!opAanvraag\) \{ var b = document\.createElement\('span'\); b\.textContent = eur\(g\.bedrag\);/.test(js) && /if \(!opAanvraag\) \{\s*document\.getElementById\('om-totaal'\)/.test(js));
  const pg = lees('src/pages/account/op-maat.astro');
  ok('op-maat.astro: "Prijs" + videoPrijsLabel(taal) en geen "Ongeveer € –" bij video', /\{videoOpAanvraag \? L\('Prijs', 'Price'\) : L\('Ongeveer', 'About'\)\}<\/span><b id="om-totaal">\{videoOpAanvraag \? videoPrijsLabel\(taal\) : '€ –'\}<\/b>/.test(pg));
  ok('/admin rekent nog gewoon (adminOpMaat.js gebruikt schatting())', /schatting\(r\.dienst, inhoud\)/.test(lees('src/lib/adminOpMaat.js')));
  const nl = lees('src/pages/nl/privacy.astro');
  const en = lees('src/pages/privacy.astro');
  ok('privacy §4 NL: geen "analytische cookies", wel cookieloos meten', !/analytische cookies/.test(nl.replace(/\{\/\*[\s\S]*?\*\/\}/g, '')) && /het meten van bezoek \(Cloudflare Web Analytics, zonder cookies, alleen als je dat aanzet\)/.test(nl));
  ok('privacy §4 EN idem', !/analytics cookies/.test(en.replace(/\{\/\*[\s\S]*?\*\/\}/g, '')) && /measuring visits \(Cloudflare Web Analytics, without cookies, only if you switch it on\)/.test(en));
}

console.log(`\n${pass}/${pass + fail} geslaagd`);
if (fail) process.exit(1);
