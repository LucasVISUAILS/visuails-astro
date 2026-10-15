/* VISUAILS — doorloop 27, de tweede helft: de keuzes uit afvinklijst 27
 *   node tests/doorloop-27b.test.mjs
 * ══════════════════════════════════════════════════════════════════════════════
 * WAAROM DEZE TOETS BESTAAT — 15 OKTOBER 2026
 * ══════════════════════════════════════════════════════════════════════════════
 * Lucas vinkte afvinklijst 27 af: elke kaart "doen", elke vraag "a" (B45 is
 * "later"). Daarbij twee notities:
 *   k-bedank  *"De tekst mag compacter en alles mag wat mooier en consistenter
 *             zoals de knop die nu een witte pijl midden op de knop heeft. (…)
 *             Controleer dit echt overal en zeer nauwkeurig."*
 *   k-credits *"De roze broek fotos mogen aangepast worden naar schetsen (…)"*
 *
 * Alles is in de harness doorgeklikt (bestellen, betalen, afbreken, verlopen,
 * de €1-proef twee keer, abonnement, opzeggen, terugboeking, tegoed, PNG-
 * verzoek, contact, aanvraag, revisieronde op de privélink, de inlogcode).
 * Deze toets bewaakt de bron en de functies, zodat het niet stil terugloopt.
 */
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { verseDb, d1 } from './lib/d1sqlite.mjs';

let pass = 0, fail = 0;
function ok(naam, kreeg, verwacht = true) {
  const p = JSON.stringify(kreeg) === JSON.stringify(verwacht);
  if (p) { pass += 1; console.log(` ok   ${naam}`); }
  else { fail += 1; console.log(`FAIL   ${naam}`.padEnd(72) + `verwacht ${JSON.stringify(verwacht)} kreeg ${JSON.stringify(kreeg)}`); }
}
const lees = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const zonderCommentaar = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '');
/* De klaargezette WhatsApp-tekst uit een mail (de ?text= van de wa.me-link). */
const waTekst = (html) => { const m = /wa\.me\/\d+\?text=([^"&]+)/.exec(String(html).replace(/&amp;/g, '&')); return m ? decodeURIComponent(m[1]) : ''; };

/* Een nep-Resend: elke mail komt in `verstuurd`. */
const verstuurd = [];
let mailFaalt = false;
const echteFetch = globalThis.fetch;
globalThis.fetch = async (url, opts = {}) => {
  if (String(url).includes('resend')) {
    if (mailFaalt) return new Response('{"message":"stuk"}', { status: 500, headers: { 'content-type': 'application/json' } });
    verstuurd.push(JSON.parse(String(opts.body || '{}')));
    return new Response('{"id":"m"}', { status: 200, headers: { 'content-type': 'application/json' } });
  }
  return echteFetch(url, opts);
};
const MAILENV = { RESEND_API_KEY: 're_test', NOTIFY_EMAIL: 'studio@voorbeeld.test', FROM_EMAIL: 'VISUAILS <orders@visuails.com>', PUBLIC_ORIGIN: 'https://visuails.com' };

/* ── B01 · geen inline modulescript meer ─────────────────────────────────── */
console.log('B01 · /start: geen CSP-regel na doorklikken');
{
  const cfg = lees('astro.config.mjs');
  ok('astro.config: elk scriptbestand wordt een bestand (assetsInlineLimit-functie)', /assetsInlineLimit:\s*\(bestand\)\s*=>\s*\(\/\\\.js\$\/\.test\(bestand\)\s*\?\s*false\s*:\s*undefined\)/.test(cfg));
  const dist = new URL('../dist/', import.meta.url);
  if (existsSync(new URL('start/index.html', dist))) {
    const paginas = [];
    const loop = (d) => { for (const n of readdirSync(d)) { const p = join(d, n); if (n === 'server' || n === '_astro') continue; if (statSync(p).isDirectory()) loop(p); else if (n.endsWith('.html')) paginas.push(p); } };
    /* fileURLToPath en niet `.pathname`: op Windows maakt .pathname van deze map
       "/E:/Claude%20(VISUAILS)/…", en dat werd bij Lucas E:\E:\…%20… (uitrol
       15 okt 07:58, ENOENT). De paginanaam daarna met schuine strepen. */
    const distPad = fileURLToPath(dist);
    loop(distPad);
    const met = paginas.filter((p) => /<script type="module">/.test(readFileSync(p, 'utf8')));
    ok(`dist: geen <script type="module"> zonder src (${paginas.length} pagina's)`, met.map((p) => relative(distPad, p).split(sep).join('/')), []);
  } else console.log('  (geen dist/: de buildcontrole slaat over)');
}

/* ── B04 · één mail na het betalen ───────────────────────────────────────── */
console.log('\nB04 · de uitgestelde bevestiging');
{
  const { uitgesteldSleutel, leesUitgesteld, stuurUitgesteld } = await import('../src/lib/uitgesteld.js');
  const bak = new Map();
  const UPLOADS = {
    put: async (k, v) => { bak.set(k, String(v)); },
    get: async (k) => (bak.has(k) ? { text: async () => bak.get(k) } : null),
    delete: async (k) => { bak.delete(k); },
  };
  const env = { ...MAILENV, UPLOADS };
  ok('de sleutel is vast per kenmerk', uitgesteldSleutel(' vis-ab12-cd3 '), 'mail-uitgesteld/VIS-AB12-CD3.json');
  await UPLOADS.put(uitgesteldSleutel('VIS-AB12-CD3'), JSON.stringify({ to: 'klant@voorbeeld.test', subject: 'We hebben je bestelling — VIS-AB12-CD3', html: '<p>x</p>' }));
  ok('leesUitgesteld geeft de bewaarde mail', (await leesUitgesteld(env, 'VIS-AB12-CD3'))?.to, 'klant@voorbeeld.test');
  mailFaalt = true;
  ok('versturen mislukt → false', await stuurUitgesteld(env, 'VIS-AB12-CD3'), false);
  ok('  en de mail staat weer klaar voor de volgende webhook', bak.has(uitgesteldSleutel('VIS-AB12-CD3')));
  mailFaalt = false;
  verstuurd.length = 0;
  ok('mislukt/afgebroken/verlopen → de bevestiging gaat alsnog', await stuurUitgesteld(env, 'VIS-AB12-CD3'), true);
  ok('  precies één mail', verstuurd.length, 1);
  ok('  en hij is weg uit R2', bak.has(uitgesteldSleutel('VIS-AB12-CD3')), false);
  ok('een tweede webhook verstuurt niets meer', await stuurUitgesteld(env, 'VIS-AB12-CD3'), false);

  const order = zonderCommentaar(lees('functions/api/order.js'));
  ok('order.js: ook de €1-proef wacht op Mollie (proefNaarKassa)', /const proefNaarKassa = svc === SAMPLE_SERVICE && !!orderId && !!env\.MOLLIE_API_KEY/.test(order));
  ok('  met de knop naar /api/order-pay in de bewaarde bevestiging', /betaalOpnieuw = bevestigingOpties\.pay\s*\|\|\s*\(proefNaarKassa \? `\$\{requestOrigin\(request\)\}\/api\/order-pay/.test(order) && /pay: betaalOpnieuw, naMislukking: true/.test(order));
  ok('  en zonder kassalink gaat hij meteen (stuurUitgesteld)', /if \(uitgesteld\) await safe\(\(\) => stuurUitgesteld\(env, ref\)\)/.test(order));
  ok('na een mislukte betaling de factuurregel "na-betaling"', /\(pay && !naMislukking\) \? 'na-factuur' : 'na-betaling'/.test(order));
  const hook = zonderCommentaar(lees('functions/api/webhook/mollie.js'));
  ok('webhook: een geweigerde tweede proef wist de bewaarde bevestiging', /notifySampleBlocked\([\s\S]{0,200}\}\);\s*await wisUitgesteld\(env, ref\);/.test(hook));
}

/* ── B05 · het btw-nummer in stap 3 ──────────────────────────────────────── */
console.log('\nB05 · VIES in stap 3');
{
  const flow = lees('src/components/order/OrderFlow.astro');
  ok('NL: korte zin bij een onbekend nummer', /viesOngeldig: 'Dit nummer staat niet in de Europese btw-controle \(VIES\)\. Kijk het even na\. Klopt het toch\? Dan controleren we het met de hand/.test(flow));
  ok('EN: idem', /viesOngeldig: 'This number is not in the European VAT check \(VIES\)\./.test(flow));
  ok('de zin staat in de tekstmaat van de hal', /\.pl-vies \[data-pl-vies-tekst\] \{ display: block; max-width: var\(--h-maat/.test(flow));
  ok('pipeline.js vraagt /api/btw', /fetch\('\/api\/btw'/.test(lees('src/scripts/pipeline.js')));
  ok('het eindpunt bestaat (Astro-route)', existsSync(new URL('../src/pages/api/btw.js', import.meta.url)) && existsSync(new URL('../functions/api/btw.js', import.meta.url)));
}

/* ── B18 · na een abonnement het adres al ingevuld ───────────────────────── */
console.log('\nB18 · inloggen na een abonnement');
{
  const { setPlanMailCookie, readPlanMail, COPY } = await import('../src/lib/account.js');
  const koek = setPlanMailCookie('Ria@Proef.test').split(';')[0];
  ok('het koekje draagt het adres en leeft een uur', /^vs_plan_mail=Ria%40Proef\.test$/.test(koek) && /Max-Age=3600/.test(setPlanMailCookie('a@b.nl')));
  ok('readPlanMail leest het terug', readPlanMail(new Request('https://x.test/', { headers: { cookie: `a=1; ${koek}` } })), 'Ria@Proef.test');
  ok('een korte uitleg als het adres er al staat (NL en EN)', !!(COPY.nl.loginLedeVooraf && COPY.en.loginLedeVooraf));
  const kaart = lees('src/components/studio/Inlogkaart.astro');
  ok('Inlogkaart gebruikt hem bij een vooringevuld adres', /view\.vooraf \? t\.loginLedeVooraf : t\.loginLede/.test(kaart) && /value=\{view\.vooraf \|\| undefined\}/.test(kaart));
}

/* ── B19 · terugboeking: een korte mail ──────────────────────────────────── */
console.log('\nB19 · terugboeking');
{
  const cm = zonderCommentaar(lees('src/lib/cancelMail.js'));
  ok('één keer "antwoord of app ons"', /Beantwoord deze mail of app ons, dan zoeken/.test(cm), false);
  ok('  en de WhatsApp-tekst noemt het abonnement', /vragen\(nl \? 'nl' : 'en', '', \{ over: nl \? `mijn abonnement \$\{ref\}`/.test(cm));
  const { vragen } = await import('../src/lib/mailTemplate.js');
  ok('vragen() met `over`', waTekst(vragen('nl', '', { over: 'mijn tegoed' })), 'Hoi VISUAILS, een vraag over mijn tegoed:');
  ok('  en zonder `over` zoals altijd', waTekst(vragen('nl', 'VIS-X')), 'Hoi VISUAILS, een vraag over mijn bestelling VIS-X:');
}

/* ── B29b · "App <naam>" onder een contactbericht ────────────────────────── */
console.log('\nB29b · de contactmail aan Lucas');
{
  const { contactAppKnop } = await import('../functions/api/order.js');
  const html = contactAppKnop({ kanaal: 'WhatsApp', phone: '06 12345678', country: '', name: 'Ria Proef', brand: '' });
  ok('06 met acht cijfers en geen land: Nederlands, met knop', /wa\.me\/31612345678/.test(html));
  ok('een Belgisch nummer zonder land: geen gok', contactAppKnop({ kanaal: 'WhatsApp', phone: '0470 12 34 56', country: '', name: 'Ria' }), '');
  ok('met een landnummer gewoon', /wa\.me\/32470123456/.test(contactAppKnop({ kanaal: 'WhatsApp', phone: '+32 470 12 34 56', country: '', name: 'Ria' })));
  ok('kanaal e-mail: geen knop', contactAppKnop({ kanaal: 'E-mail', phone: '06 12345678', name: 'Ria' }), '');
}

/* ── B31 · PNG/WebP klaar: de mail ───────────────────────────────────────── */
console.log('\nB31 · de formatenmail');
{
  const { db } = verseDb(new URL('../schema.sql', import.meta.url));
  db.exec(`INSERT INTO orders (id, ref, service, email, name, status, payment_status, lang) VALUES (77, 'VIS-FM-0077', 'catalog', 'klant@voorbeeld.test', 'Ria Proef', 'delivered', 'paid', 'nl')`);
  db.exec(`INSERT INTO formaat_verzoeken (id, order_id, formaat, klaar_at) VALUES (5, 77, 'png', '2026-10-15 03:00:00')`);
  const { formaatMail } = await import('../src/lib/formaten.js');
  const { sendMail } = await import('../src/lib/mail.js');
  const mail = await import('../src/lib/mailTemplate.js');
  verstuurd.length = 0;
  const r = await formaatMail({ ...MAILENV, DB: d1(db) }, 5, { origin: 'https://visuails.com', sendMail, mail });
  ok('verstuurd', r.ok, true);
  const html = String(verstuurd[0]?.html || '');
  ok('de knop wijst naar /account/orders?order=77 (en niet naar een 404)', html.includes('https://visuails.com/account/orders?order=77#order-77') && !html.includes('/account/orders/77"'));
  ok('onderwerp noemt PNG en het kenmerk', /PNG/.test(verstuurd[0]?.subject || '') && /VIS-FM-0077/.test(verstuurd[0]?.subject || ''));
}

/* ── B33 · tegoed met een mail ───────────────────────────────────────────── */
console.log('\nB33 · tegoed boeken');
{
  const { tegoedMail } = await import('../src/lib/admin.js');
  const html = tegoedMail({ naam: 'Ria', lang: 'nl', cents: 1500, reden: 'Excuus voor de late levering', saldoCents: 1500, studio: 'https://visuails.com/account' });
  ok('de reden staat er letterlijk', html.includes('Excuus voor de late levering'));
  ok('het bedrag', /€\s?15,00/.test(html));
  ok('de WhatsApp-tekst gaat over het tegoed', waTekst(html), 'Hoi VISUAILS, een vraag over mijn tegoed:');
}

/* ── B36 · vaknaam als label, de bestandsnaam klein eronder ──────────────── */
console.log('\nB36 · beelden heten hun vak');
{
  const { shotView, COPY } = await import('../src/lib/account.js');
  const f = { id: 1, kind: 'delivery', filename: 'VIS-X-p1-voorkant.jpg', shot: 'front', product_key: 'p1', review_state: 'pending' };
  const v = shotView(COPY.nl, f, { service: 'catalog', details_json: '{}' }, true);
  ok('Studio: het label is het vak', v.caption, 'Voorkant');
  ok('  met de bestandsnaam ernaast', v.file, 'VIS-X-p1-voorkant.jpg');
  ok('  zonder vak blijft de naam het label (en geen tweede keer)', shotView(COPY.nl, { ...f, shot: null, product_key: null }, null, true).file, '');
  ok('Beeld.astro toont hem klein', /st-beeld-file/.test(lees('src/components/studio/Beeld.astro')) && /\.st-beeld-file \{[^}]*font-size: \.75rem/.test(lees('src/styles/studio.css')));
  const portal = lees('src/lib/portal.js');
  ok('privélink: een kopje per product', /<section class="shots-groep">\$\{k \? `<h3 class="shots-kop">/.test(portal));
  ok('  en de stille knop lijnt uit met de tekst', /\.btn\.btn-quiet \{ padding-left: 0; padding-right: 0; \}/.test(lees('public/portal.css')));
}

/* ── B40 · de zin bij een verkeerde code ─────────────────────────────────── */
console.log('\nB40 · verkeerde inlogcode');
{
  const { COPY } = await import('../src/lib/account.js');
  ok('NL', COPY.nl.codeWrong, 'Die code klopt niet of is verlopen. Kijk de zes cijfers na, gebruik de link in dezelfde mail, of vraag hieronder een nieuwe aan.');
  ok('EN begint met dezelfde gedachte', /^That code is wrong or has expired\. Check the six digits/.test(COPY.en.codeWrong));
}

/* ── B41 · de €1-proef in stap 3 ─────────────────────────────────────────── */
console.log('\nB41 · al een proef gehad');
{
  const { db } = verseDb(new URL('../schema.sql', import.meta.url));
  db.exec(`INSERT INTO orders (id, ref, service, email, phone, status, payment_status, lang, details_json) VALUES
    (1, 'VIS-PR-0001', 'test-sample', 'Proef@Merk.test', '+31 6 11112222', 'received', 'paid', 'nl', '{"business_reg":"KVK 1234 5678"}'),
    (2, 'VIS-PR-0002', 'test-sample', 'nooit@betaald.test', '', 'received', 'unpaid', 'nl', '{}')`);
  const { proefGebruikt, regKey } = await import('../src/lib/proefGebruikt.js');
  const env = { DB: d1(db) };
  ok('zelfde adres, andere hoofdletters: gebruikt', (await proefGebruikt(env, { email: 'proef@merk.test' })).used > 0);
  ok('zelfde KvK-nummer anders geschreven: gebruikt', (await proefGebruikt(env, { reg: '12345678' })).used > 0);
  ok('zelfde telefoon anders geschreven: gebruikt', (await proefGebruikt(env, { phone: '06 1111 2222' })).used > 0);
  ok('een onbetaalde proef telt niet', (await proefGebruikt(env, { email: 'nooit@betaald.test' })).used, 0);
  ok('niets ingevuld: niets gebruikt', (await proefGebruikt(env, {})).used, 0);
  ok('regKey: te kort is geen sleutel', regKey('123'), '');
  ok('zonder database: openvallen', (await proefGebruikt({}, { email: 'x@y.z' })).checked, false);
  const flow = lees('src/components/order/OrderFlow.astro');
  ok('de weigering is kort (NL)', /proefAl: \['Er is één proef per bedrijf, en op dit e-mailadres of telefoonnummer staat er al een\. Er is niets besteld\. ', 'Bestel gewoon'/.test(flow));
  ok('  en de order-API gebruikt dezelfde functie', /proefGebruikt\(env, \{ email, phone, reg: get\('reg_number'\) \}\)/.test(lees('functions/api/order.js')));
}

/* ── B44 · een notitie per aangemerkt beeld ──────────────────────────────── */
console.log('\nB44 · notitie per beeld');
{
  const portal = lees('src/lib/portal.js');
  ok('privélink: een notitieveld per beeld (note-<id>)', /<textarea form="rr" name="note-\$\{f\.id\}"/.test(portal));
  ok('  de algemene notitie is niet meer verplicht', /<textarea id="rrnote" name="note"[^>]*required/.test(portal), false);
}

/* ── k-bedank · de bedankpagina compacter en in verhouding ───────────────── */
console.log('\nk-bedank · de bedankpagina');
{
  const hal = lees('src/styles/hal.css');
  ok('de pijl aan de rechterrand van elke formulierknop (space-between)', /html body\.hal \.h-form \.s22 \.knop \{ justify-content: space-between; \}/.test(hal));
  ok('de stappen met een genummerd rondje', /\.ty-verder li::before \{ content: counter\(verder\); width: 28px; height: 28px;/.test(hal));
  ok('het standvlak zo breed als zijn zin', /\.ty-status \{ width: fit-content;/.test(hal));
  ok('de inlogzin in de letter van de pagina, 15 px', /\.ty-signin \{ margin: 14px 0 0; font: 400 15px\/1\.5 var\(--h-letter\)/.test(hal));
  const ty = lees('src/components/ThankYouPage.astro');
  ok('de inlogzin is korter (NL)', /signin: 'De link in je mail opent deze bestelling zonder inloggen\. In VISUAILS Studio log je in met het e‑mailadres van de bestelling: je krijgt een code, geen wachtwoord\.'/.test(ty));
  ok('  en zegt "aanvraag" bij een aanvraag', /data-ty-signin-request=\{c\.signinRequest\}/.test(ty) && /dataset\.tySigninRequest/.test(lees('src/scripts/interactions.js')));
  ok('de knop "Foto’s toevoegen in VISUAILS Studio" past op een telefoon', /extraCta: 'Foto’s toevoegen in VISUAILS Studio'/.test(ty));
  const ix = lees('src/scripts/interactions.js');
  ok('het standvlak na betalen herhaalt de kop niet', /tyPaidNote: 'Je hoeft niets meer te doen\.'/.test(ix) && /tyPaidNote: 'There is nothing left for you to do\.'/.test(ix));
  const { stilteRegel } = await import('../src/lib/verder.js');
  ok('"Zo gaat het verder", stap 3 is korter', /twijfelen: dan nemen we contact met je op\. Een vraag of nog een foto\? App of mail ons gerust\./.test(stilteRegel({ lang: 'nl', factuur: 'volgt' })));
}

/* ── k-credits · schetsen in plaats van de roze broek ────────────────────── */
console.log('\nk-credits · het zijpaneel');
{
  const { tegelsVoor, ECHTE_BESTELLING } = await import('../src/data/overzichtbeelden.js');
  for (const dienst of ['catalog', 'lifestyle', 'plan']) {
    const t = tegelsVoor(dienst, 'nl');
    ok(`${dienst}: vier schetsen uit /img/schets/`, t.length === 4 && t.every((x) => x.src.startsWith('/img/schets/') && existsSync(new URL(`../public${x.src}`, import.meta.url))));
    ok(`${dienst}: vier verschillende labels`, new Set(t.map((x) => x.label)).size, 4);
    ok(`${dienst}: elke alt begint met "Schets"`, t.every((x) => /^Schets: /.test(x.alt)) && tegelsVoor(dienst, 'en').every((x) => /^Sketch: /.test(x.alt)));
  }
  ok('geen voorbeeldfoto meer in de lijst', /ba2-na|lifestyle-band|lifestyle-flash/.test(zonderCommentaar(lees('src/data/overzichtbeelden.js'))), false);
  ok('de noot zegt dat het schetsen zijn', /schets/i.test(ECHTE_BESTELLING.nl) && /sketch/i.test(ECHTE_BESTELLING.en));
  ok('het label staat onder de tegel (BestelOverzicht en PlanPicker)', /bo-tegel-naam/.test(lees('src/components/order/BestelOverzicht.astro')) && /ps-tegel-naam/.test(lees('src/components/order/PlanPicker.astro')));
  ok('de schetsen hebben een eigen script', existsSync(new URL('../scripts/schetsen-zijpaneel.py', import.meta.url)));
}

globalThis.fetch = echteFetch;
console.log(`\n${pass}/${pass + fail} geslaagd`);
if (fail) process.exit(1);
