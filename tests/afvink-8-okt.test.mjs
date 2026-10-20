/*
 * VISUAILS — de punten uit de afvinklijst van 8 oktober 2026 die bouwer T1
 * maakte (o03, o05, o16, o18, o25). o04 staat in tests/doorloop.test.mjs, o19
 * in tests/tweede-factor.test.mjs.
 *
 * Draai: node tests/afvink-8-okt.test.mjs
 */
import { d1, verseDb, telling } from './lib/d1sqlite.mjs';
import { adminGet, adminPost } from '../src/lib/admin.js';
import { hashPassword } from '../src/lib/adminAuth.js';

let goed = 0, totaal = 0;
function ok(naam, kreeg, wil = true) {
  totaal++;
  const ja = JSON.stringify(kreeg) === JSON.stringify(wil);
  if (ja) goed++;
  console.log(`${ja ? ' ok  ' : ' FAIL'} ${naam}${ja ? '' : `  verwacht ${JSON.stringify(wil)}, kreeg ${JSON.stringify(kreeg)}`}`);
}
/* Wacht tot iets waar is (of tot de tijd op is), in plaats van een vaste pauze:
   in een volle testrun naast andere bouwers is de machine soms traag. */
async function totDat(fn, ms = 15000) {
  const eind = Date.now() + ms;
  while (Date.now() < eind) {
    if (await fn()) return true;
    await new Promise((r) => setTimeout(r, 100));
  }
  return false;
}
const koekje = (res, naam) => {
  const m = new RegExp(`${naam}=([^;]*)`).exec(res.headers.get('set-cookie') || '');
  return m ? m[1] : '';
};

/* ══ o18 · /admin VANZELF UIT NA 12 UUR NIETS DOEN ═════════════════════════ */
console.log('\no18 · een /admin-sessie verloopt na 12 uur zonder verzoek');
{
  const { db, mislukt } = verseDb(new URL('../schema.sql', import.meta.url));
  if (mislukt.length) { console.error('schema:', mislukt); process.exit(1); }
  const env = { DB: d1(db), ADMIN_ORIGIN: 'https://visuails.com' };
  db.prepare('INSERT INTO admin_users (id, email, password_hash) VALUES (1, ?, ?)')
    .run('beheer@voorbeeld.test', await hashPassword('een-lang-verzonnen-wachtwoord'));
  const inlog = await adminPost({
    request: new Request('https://visuails.com/admin/login', {
      method: 'POST', headers: { origin: 'https://visuails.com' },
      body: new URLSearchParams({ email: 'beheer@voorbeeld.test', password: 'een-lang-verzonnen-wachtwoord' }),
    }), env, waitUntil() {},
  });
  const c = koekje(inlog, 'vis_admin');
  const open = () => adminGet({
    request: new Request('https://visuails.com/admin', { headers: { cookie: `vis_admin=${c}` } }),
    env, waitUntil() {},
  });
  ok('net ingelogd: het dashboard opent', (await open()).status, 200);
  ok('en het verzoek is als laatste gebruik bewaard',
    Boolean(db.prepare('SELECT last_used_at FROM admin_sessions').get().last_used_at), true);

  db.exec("UPDATE admin_sessions SET last_used_at = datetime('now', '-11 hours')");
  ok('elf uur niets gedaan: nog open', (await open()).status, 200);

  db.exec("UPDATE admin_sessions SET last_used_at = datetime('now', '-13 hours')");
  const dicht = await open();
  ok('dertien uur niets gedaan: terug naar inloggen', [dicht.status, dicht.headers.get('location')], [303, '/admin/login']);
  ok('en de sessie is weg', telling(db, 'SELECT COUNT(*) FROM admin_sessions'), 0);

  /* Nooit gebruikt na het inloggen: dan telt het inlogmoment. */
  const weer = await adminPost({
    request: new Request('https://visuails.com/admin/login', {
      method: 'POST', headers: { origin: 'https://visuails.com' },
      body: new URLSearchParams({ email: 'beheer@voorbeeld.test', password: 'een-lang-verzonnen-wachtwoord' }),
    }), env, waitUntil() {},
  });
  db.exec("UPDATE admin_sessions SET issued_at = datetime('now', '-13 hours'), last_used_at = NULL");
  const oud = await adminGet({
    request: new Request('https://visuails.com/admin', { headers: { cookie: `vis_admin=${koekje(weer, 'vis_admin')}` } }),
    env, waitUntil() {},
  });
  ok('ingelogd en daarna 13 uur niets: ook dicht', oud.headers.get('location'), '/admin/login');
}

/* ══ o21 · DE NAKIJKVRAAG VOOR HET TEGOEDLEK ══════════════════════════════ */
console.log('\no21 · kladblok/NAKIJKEN-TEGOED-8-OKT.sql vindt alleen verzonnen tegoed');
{
  const { readFileSync } = await import('node:fs');
  const sql = readFileSync(new URL('../kladblok/NAKIJKEN-TEGOED-8-OKT.sql', import.meta.url), 'utf8');
  const zonderCommentaar = sql.replace(/--[^\n]*/g, '').trim();
  ok('het is één SELECT en verder niets', /^SELECT\b/i.test(zonderCommentaar)
    && !/\b(INSERT|UPDATE|DELETE|DROP|ALTER|CREATE|REPLACE)\b/i.test(zonderCommentaar)
    && zonderCommentaar.replace(/;\s*$/, '').indexOf(';') === -1, true);
  ok('met bovenaan drie regels uitleg', sql.split('\n').slice(0, 3).every((r) => r.startsWith('-- ')), true);

  const { db } = verseDb(new URL('../schema.sql', import.meta.url));
  db.exec(`INSERT INTO customers (id, email) VALUES (1, 'eerlijk@voorbeeld.test'), (2, 'lek@voorbeeld.test'), (3, 'half@voorbeeld.test')`);
  /* Klant 1 kreeg €50 tegoed en gebruikte €30 op een betaalde bestelling. */
  db.exec(`INSERT INTO customer_credits (customer_id, delta_cents, reason, created_at) VALUES (1, 5000, 'Annulering VIS-OUD', '2026-09-01 10:00:00')`);
  const bestelling = (ref, klant, tegoed, op, betaald = 'paid') => db.prepare(
    `INSERT INTO orders (ref, service, email, customer_id, details_json, payment_status, created_at) VALUES (?, 'catalog', ?, ?, ?, ?, ?)`
  ).run(ref, `${ref.toLowerCase()}@voorbeeld.test`, klant, JSON.stringify({ tegoed_cents: tegoed }), betaald, op);
  bestelling('VIS-EERLIJK', 1, 3000, '2026-09-02 10:00:00');
  db.exec(`INSERT INTO customer_credits (customer_id, delta_cents, reason, order_id, created_at) VALUES (1, -3000, 'Verrekend met VIS-EERLIJK', 1, '2026-09-02 10:05:00')`);
  /* Klant 2 had nooit tegoed: het lek, en de webhook boekte het toch af. */
  bestelling('VIS-LEK', 2, 9000, '2026-09-20 12:00:00');
  db.exec(`INSERT INTO customer_credits (customer_id, delta_cents, reason, order_id, created_at) VALUES (2, -9000, 'Verrekend met VIS-LEK', 2, '2026-09-20 12:05:00')`);
  /* Klant 3 had €10 en zette er €80 op. */
  db.exec(`INSERT INTO customer_credits (customer_id, delta_cents, reason, created_at) VALUES (3, 1000, 'Coulance', '2026-09-01 09:00:00')`);
  bestelling('VIS-HALF', 3, 8000, '2026-09-21 12:00:00', 'unpaid');
  /* En een bestelling zonder klant en zonder tegoed. */
  db.exec(`INSERT INTO orders (ref, service, email, details_json) VALUES ('VIS-GEWOON', 'catalog', 'x@voorbeeld.test', '{}')`);

  const rijen = db.prepare(sql.replace(/;\s*$/, '')).all().map((r) => r.ref);
  ok('de eerlijke bestelling staat er niet in', rijen.includes('VIS-EERLIJK'), false);
  ok('de bestelling met verzonnen tegoed wel, ook al is hij betaald en afgeboekt', rijen.includes('VIS-LEK'), true);
  ok('en die met meer tegoed dan de klant had', rijen.includes('VIS-HALF'), true);
  ok('een bestelling zonder tegoed niet', rijen.includes('VIS-GEWOON'), false);
}

/* ══ o25 (2) · EEN INLOGLINK VAN EEN ANDER ACCOUNT WISSELT NIET STIL ═══════ */
console.log('\no25 · een inloglink van iemand anders vraagt eerst of je wilt wisselen');
{
  const { studioAuth } = await import('../src/lib/account.js');
  const { mintToken, hashToken } = await import('../src/lib/token.js');
  const { db } = verseDb(new URL('../schema.sql', import.meta.url));
  const env = { DB: d1(db) };
  db.exec(`INSERT INTO customers (id, email) VALUES (1, 'klant@voorbeeld.test'), (2, 'iemand-anders@voorbeeld.test')`);
  const sessie = mintToken();
  db.prepare(`INSERT INTO account_sessions (customer_id, token_hash, expires_at) VALUES (1, ?, datetime('now', '+30 days'))`)
    .run(await hashToken(sessie));
  const link = mintToken();
  db.prepare(`INSERT INTO account_tokens (customer_id, token_hash, expires_at) VALUES (2, ?, ?)`)
    .run(await hashToken(link), new Date(Date.now() + 3600e3).toISOString());

  const vraag = (method, { cookie = `vis_account=${sessie}`, origin = 'https://visuails.com' } = {}) => studioAuth({
    request: new Request(`https://visuails.com/account/verify/${link}`, {
      method, headers: { cookie, ...(method === 'POST' ? { origin } : {}) },
    }), env, waitUntil() {},
  });

  const v = await vraag('GET');
  ok('ingelogd als klant 1 en de link van klant 2: een vraag, geen wissel', v instanceof Response ? 'response' : v.view, 'wissel');
  ok('met beide adressen erin', [v.huidig, v.doel], ['klant@voorbeeld.test', 'iemand-anders@voorbeeld.test']);
  ok('de link is nog niet gebruikt', db.prepare('SELECT used_at FROM account_tokens').get().used_at, null);
  ok('en er is geen nieuwe sessie', telling(db, 'SELECT COUNT(*) FROM account_sessions'), 1);

  const vreemd = await vraag('POST', { origin: 'https://ergens-anders.test' });
  ok('de knop vanaf een andere site werkt niet', [vreemd.view, vreemd.status, telling(db, 'SELECT COUNT(*) FROM account_sessions')], ['login', 403, 1]);

  const wissel = await vraag('POST');
  ok('de knop zelf wisselt wel', wissel instanceof Response && wissel.status === 303 && /vis_account=/.test(wissel.headers.get('set-cookie') || ''), true);
  ok('naar een sessie van klant 2', telling(db, 'SELECT COUNT(*) FROM account_sessions WHERE customer_id = 2'), 1);

  /* Zonder sessie (of met de eigen link) verandert er niets: meteen binnen. */
  const link2 = mintToken();
  db.prepare(`INSERT INTO account_tokens (customer_id, token_hash, expires_at) VALUES (2, ?, ?)`)
    .run(await hashToken(link2), new Date(Date.now() + 3600e3).toISOString());
  const zonder = await studioAuth({
    request: new Request(`https://visuails.com/account/verify/${link2}`), env, waitUntil() {},
  });
  ok('zonder sessie: meteen binnen, zoals altijd', zonder instanceof Response && zonder.status === 303, true);
}

/* ══ o25 (4) · KLANTGEGEVENS NIET TE OVERSCHRIJVEN MET ALLEEN EEN E-MAILADRES ══ */
console.log('\no25 · een formulier zonder inlog verandert een bestaande klant niet (sinds 19 oktober 2026 ook geen leeg veld)');
{
  const { onRequestPost: orderPost, upsertCustomer, MAX_FORM_FIELDS } = await import('../functions/api/order.js');
  const { db } = verseDb(new URL('../schema.sql', import.meta.url));
  const env = { DB: d1(db) };
  const id = await upsertCustomer(env, {
    email: 'abonnee@voorbeeld.test', name: 'Echte Naam', firstName: 'Echte', lastName: 'Naam',
    phone: '+31 6 00000001', vat: 'NL000000000B01', country: 'NL', address: 'Verzonnenstraat 1\n0000 AA Nergenshuizen',
    line1: 'Verzonnenstraat 1', postal: '0000 AA', city: 'Nergenshuizen', contactPreference: 'email',
  });
  ok('een nieuwe klant wordt gewoon aangemaakt', typeof id, 'number');
  const fd = new FormData();
  for (const [k, v] of Object.entries({
    service: 'contact', lang: 'nl', email: 'abonnee@voorbeeld.test', first_name: 'Vreemde', last_name: 'Ander',
    phone: '+31 6 99999999', brand: 'Nieuw Merk', message: 'hallo', contact_preference: 'whatsapp',
  })) fd.append(k, v);
  await orderPost({ request: new Request('https://visuails.com/api/order', { method: 'POST', body: fd }), env, waitUntil() {} });
  const rij = db.prepare('SELECT name, first_name, phone, vat_number, billing_address, contact_preference, brand FROM customers WHERE id = ?').get(id);
  ok('de naam blijft staan', [rij.name, rij.first_name], ['Echte Naam', 'Echte']);
  ok('het telefoonnummer ook', rij.phone, '+31 6 00000001');
  ok('en btw-nummer en adres', [rij.vat_number, rij.billing_address], ['NL000000000B01', 'Verzonnenstraat 1\n0000 AA Nergenshuizen']);
  ok('en de contactvoorkeur', rij.contact_preference, 'email');
  /* Tot 19 oktober 2026 mocht een leeg veld wel gevuld worden. Sindsdien verandert een
     formulier zonder inlog een bestaande klant helemaal niet (klantUitFormulier() in
     functions/api/order.js, tests/klant-scheiding.test.mjs): ook een leeg veld van een
     ander was zo met alleen zijn e-mailadres te vullen. */
  ok('ook een leeg veld blijft leeg (sinds 19 oktober 2026)', rij.brand, null);

  /* Ook via /api/plan's tweede stap: KVK-nummer en "geen btw-nummer" niet omzetten. */
  db.prepare('UPDATE customers SET reg_number = ? WHERE id = ?').run('00000001', id);
  const plan = (await import('node:fs')).readFileSync(new URL('../functions/api/plan.js', import.meta.url), 'utf8');
  ok('/api/plan zet een KVK-nummer alleen als het leeg is',
    /reg_number = CASE WHEN \?2 IS NOT NULL AND \(reg_number IS NULL OR reg_number = ''\) THEN \?2/.test(plan), true);

  /* ══ o25 (5) · EEN MAXIMUM AANTAL VELDEN ══ */
  console.log('\no25 · een bestelformulier met absurd veel velden wordt geweigerd');
  const veel = new FormData();
  veel.append('service', 'catalog'); veel.append('mode', 'json'); veel.append('email', 'veel@voorbeeld.test');
  for (let i = 0; i < MAX_FORM_FIELDS; i++) veel.append(`veld_${i}`, 'x');
  const res = await orderPost({ request: new Request('https://visuails.com/api/order', { method: 'POST', body: veel }), env, waitUntil() {} });
  ok('boven de grens: 413 en niets aangemaakt', [res.status, (await res.json()).error, telling(db, "SELECT COUNT(*) FROM customers WHERE email = 'veel@voorbeeld.test'")], [413, 'te-veel-velden', 0]);
  ok('de grens ligt ruim boven het grootste echte formulier (±450)', MAX_FORM_FIELDS >= 1000, true);
}

/* ══ o05 · UPLOADS: DAGGRENS PER IP-BLOK, EN ONLEESBAAR = GEWEIGERD ═════════ */
console.log('\no05 · uploads: een daggrens per IP-blok, ruim boven een echte grote bestelling');
{
  const { onRequestPost: upload, UPLOAD_DAG } = await import('../functions/api/upload.js');
  const { checkRate } = await import('../src/lib/ratelimit.js');
  const { MAX_FILE_BYTES } = await import('../src/lib/uploads.js');
  const { SHOTS_PER_PRODUCT, MAX_REF_PER_PRODUCT } = await import('../src/data/shots.js');
  const { FORM_MAX_PRODUCTS, MAX_EXTRA_PER_PRODUCT } = await import('../src/data/pricing.js');
  const { CONTEXT_SLOT_IDS } = await import('../src/data/garments.js');

  /* Het grootste wat het formulier kan tekenen, elk vakje gevuld op 25 MB. */
  const vakjes = FORM_MAX_PRODUCTS * (SHOTS_PER_PRODUCT + MAX_EXTRA_PER_PRODUCT + MAX_REF_PER_PRODUCT + CONTEXT_SLOT_IDS.length);
  ok(`het maximale formulier (${vakjes} bestanden) past onder de grens van ${UPLOAD_DAG.bestanden}`, vakjes <= UPLOAD_DAG.bestanden, true);
  ok('ook als elk bestand 25 MB is', vakjes * MAX_FILE_BYTES <= UPLOAD_DAG.bytes, true);

  const { db } = verseDb(new URL('../schema.sql', import.meta.url));
  const opgeslagen = new Map();
  const env = {
    DB: d1(db),
    UPLOADS: {
      async list({ prefix }) { return { objects: [...opgeslagen.keys()].filter((k) => k.startsWith(prefix)).map((key) => ({ key })) }; },
      async put(key) { opgeslagen.set(key, true); },
    },
  };
  const JPG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0x10, 0x4a, 0x46, 0x49, 0x46, 0, 1, 1, 0, 0, 1]);
  const stuur = async (ip, { batch = '', bestand = new File([JPG], 'voorkant.jpg') } = {}) => {
    const fd = new FormData();
    fd.append('file', bestand);
    if (batch) fd.append('batch', batch);
    const res = await upload({ request: new Request('https://visuails.com/api/upload', { method: 'POST', body: fd, headers: { 'cf-connecting-ip': ip } }), env });
    return { status: res.status, body: await res.json() };
  };

  const eerste = await stuur('203.0.113.10');
  ok('een gewone upload gaat door', [eerste.status, eerste.body.ok], [200, true]);

  /* Onleesbaar: de eerste bytes zijn niet te lezen. */
  const kapot = new File([JPG], 'kapot.jpg');
  kapot.slice = () => ({ arrayBuffer: async () => { throw new Error('niet te lezen'); } });
  const fdK = new FormData();
  fdK.append('file', kapot);
  const resK = await upload({ request: { headers: new Headers({ 'cf-connecting-ip': '203.0.113.11' }), formData: async () => fdK }, env });
  ok('een bestand dat niet te lezen is, wordt geweigerd', [resK.status, (await resK.json()).error], [400, 'bad-type']);

  /* De teller op bestanden: de dag vol zetten op één na. */
  await checkRate(env, { ip: '198.51.100.20', action: 'upload-bestanden-dag', limit: UPLOAD_DAG.bestanden, windowSeconds: 86400, gewicht: UPLOAD_DAG.bestanden - 1 });
  const laatste = await stuur('198.51.100.20');
  ok('de laatste van de dag gaat nog door', laatste.status, 200);
  const teVeel = await stuur('198.51.100.20', { batch: laatste.body.batch });
  ok('de volgende krijgt de daggrens, met een eigen code (niet "rate")', [teVeel.status, teVeel.body.error], [429, 'dag-limiet']);
  ok('een ander adres heeft er geen last van', (await stuur('198.51.100.21')).status, 200);

  /* Bytes: tellen per bestand, in bytes. */
  await checkRate(env, { ip: '198.51.100.30', action: 'upload-bytes-dag', limit: UPLOAD_DAG.bytes, windowSeconds: 86400, gewicht: UPLOAD_DAG.bytes - 4 });
  ok('over de grens in bytes: ook de daggrens', (await stuur('198.51.100.30')).body.error, 'dag-limiet');

  /* Nieuwe batches: een upload zonder batch mag niet eindeloos een nieuwe beginnen. */
  await checkRate(env, { ip: '2001:db8:aa:1::1', action: 'upload-batch-dag', limit: UPLOAD_DAG.batches, windowSeconds: 86400, gewicht: UPLOAD_DAG.batches });
  const zonderBatch = await stuur('2001:db8:aa:1::99');
  ok('dertig nieuwe batches op één dag: de volgende zonder batch wordt geweigerd (zelfde /64-blok)', [zonderBatch.status, zonderBatch.body.error], [429, 'dag-limiet']);
  const metBatch = await stuur('2001:db8:aa:1::99', { batch: eerste.body.batch });
  ok('maar een upload in een bestaande batch gaat gewoon door', metBatch.status, 200);
  ok('en een ander /64-blok begint zonder last', (await stuur('2001:db8:aa:2::1')).status, 200);

  /* Het formulier: een eigen melding met WhatsApp en mail, en niet automatisch opnieuw. */
  const fs = await import('node:fs');
  const pl = fs.readFileSync(new URL('../src/scripts/pipeline.js', import.meta.url), 'utf8');
  const pu = fs.readFileSync(new URL('../src/components/order/ProductUploader.astro', import.meta.url), 'utf8');
  const of = fs.readFileSync(new URL('../src/components/order/OrderFlow.astro', import.meta.url), 'utf8');
  ok('pipeline.js zet bij dag-limiet het uitlegblok aan', /code === 'dag-limiet'[\s\S]{0,200}data-pl-upload-note="limiet"/.test(pl), true);
  ok('en probeert dag-limiet niet vanzelf opnieuw', /function retryableUpload\(code, httpStatus\) \{\s*if \(code === 'network' \|\| code === 'rate'\) return true;/.test(pl), true);
  ok('het blok staat in de uploader, met WhatsApp en mail', /data-pl-upload-note="limiet"[\s\S]{0,600}waHref\(t\.limietWaText\)[\s\S]{0,300}mailto:/.test(pu), true);
  ok('in het Nederlands en het Engels', (pu.match(/limietBody:/g) || []).length, 2);
  ok('en de regel bij het vakje staat in de copytabel (beide talen)', (of.match(/'dag-limiet':/g) || []).length, 2);
}

/* ══ o05 · EN WAT DE KLANT ZIET, IN DE GEBOUWDE PAGINA ═════════════════════
   Na `astro build`: de echte /start/catalog/ met de gebundelde pipeline.js, en
   /api/upload nagebootst met het antwoord van de daggrens. */
console.log('\no05 · de klant ziet bij de daggrens één uitleg met WhatsApp en mail');
{
  const { buildStaat } = await import('./lib/build.mjs');
  const staat = buildStaat(new URL('../dist/start/catalog/index.html', import.meta.url));
  if (!staat.er || staat.oud) {
    ok(`de build is er en is van deze bron (${staat.uitleg || 'ok'})`, false, true);
  } else {
    const { chromium } = await import('playwright');
    const { existsSync } = await import('node:fs');
    const { readFile } = await import('node:fs/promises');
    const http = (await import('node:http')).default;
    const path = (await import('node:path')).default;
    const { fileURLToPath } = await import('node:url');
    const DIST = path.join(path.dirname(path.dirname(fileURLToPath(import.meta.url))), 'dist');
    const TYPES = { '.js': 'text/javascript', '.css': 'text/css', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.json': 'application/json' };
    const srv = http.createServer(async (req, res) => {
      const u = new URL(req.url, 'http://x');
      const p = path.join(DIST, u.pathname);
      try {
        const body = await readFile(p).catch(() => readFile(path.join(p, 'index.html')));
        res.writeHead(200, { 'content-type': TYPES[path.extname(u.pathname)] || 'text/html; charset=utf-8' });
        res.end(body);
      } catch { res.writeHead(404); res.end('nee'); }
    });
    await new Promise((r) => srv.listen(0, r));
    const base = `http://localhost:${srv.address().port}`;
    const EXE = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
    const browser = await chromium.launch(existsSync(EXE) ? { executablePath: EXE } : {});
    try {
      for (const [pad, woord] of [['/start/catalog/', /WhatsApp/], ['/nl/start/catalog/', /WhatsApp/]]) {
        const pg = await browser.newPage();
        let verzoeken = 0;
        await pg.route('**/api/upload', (route) => {
          if (route.request().method() !== 'POST') return route.fulfill({ status: 200, body: '{"ok":true}' });
          verzoeken += 1;
          return route.fulfill({ status: 429, contentType: 'application/json', body: JSON.stringify({ ok: false, error: 'dag-limiet', retryAfter: 3600 }) });
        });
        await pg.goto(base + pad, { waitUntil: 'load' });
        await pg.waitForSelector('form[data-pipeline].is-live', { timeout: 15000 });
        const JPEG = { name: 'voorkant.jpg', mimeType: 'image/jpeg', buffer: Buffer.from([0xff, 0xd8, 0xff, 0xd9]) };
        const invoer = pg.locator('.pu-slot-input');
        await invoer.nth(0).setInputFiles(JPEG);
        const blok = pg.locator('[data-pl-upload-note="limiet"]');
        await totDat(() => blok.evaluate((el) => !el.hidden));
        await invoer.nth(1).setInputFiles({ ...JPEG, name: 'achterkant.jpg' });
        await totDat(async () => (await pg.locator('.pu-slot').nth(1).getAttribute('data-state')) === 'failed', 5000);
        /* De vakjes staan in stap 2, die hier (op stap 1) nog dicht is; het
           blok zelf moet aan staan. Voor het meten wordt stap 2 zichtbaar gezet. */
        ok(`${pad}: het uitlegblok staat aan`, await blok.evaluate((el) => !el.hidden), true);
        await pg.addStyleTag({ content: '.pl-step { display: block !important; }' });
        ok('  en is zichtbaar zodra de stap open is', await blok.isVisible(), true);
        ok('  met een WhatsApp-knop naar wa.me en een mailknop', [
          /^https:\/\/wa\.me\/\d+\?text=/.test(await blok.locator('a.knop-inkt').getAttribute('href') || ''),
          /^mailto:hello@visuails\.com\?subject=/.test(await blok.locator('a.knop-lijn').getAttribute('href') || ''),
        ], [true, true]);
        ok('  en de tekst noemt WhatsApp', woord.test(await blok.innerText()), true);
        ok('  het vakje zegt het ook', await pg.locator('.pu-slot').first().getAttribute('data-state'), 'failed');
        ok('  niet automatisch opnieuw, en de tweede foto gaat niet meer de deur uit', verzoeken, 1);
        /* Leesbaarheid: geen tekst onder 11,5 px, en geen tekst die buiten het blok loopt. */
        const maten = await blok.evaluate((el) => [...el.querySelectorAll('h3, p, a')].map((n) => parseFloat(getComputedStyle(n).fontSize)));
        ok('  alle tekst in het blok is minstens 11,5 px', Math.min(...maten) >= 11.5, true);
        await pg.setViewportSize({ width: 360, height: 780 });
        const past = await blok.evaluate((el) => el.scrollWidth <= el.clientWidth + 1);
        ok('  en op een smalle telefoon loopt niets buiten het blok', past, true);
        await pg.close();
      }
    } finally {
      await browser.close();
      srv.close();
    }
  }
}

/* ══ o03 · TURNSTILE: DE SERVERKANT ════════════════════════════════════════ */
console.log('\no03 · de botcheck: alleen weigeren als Cloudflare uitdrukkelijk nee zegt');
{
  const { controleerBotcheck, botcheckBesluit, TURNSTILE_VERIFY } = await import('../src/lib/turnstile.js');
  const SLEUTELS = { TURNSTILE_SITE_KEY: '0x4AAAAAAAverzonnen', TURNSTILE_SECRET_KEY: '0x4AAAAAAAgeheimverzonnen' };
  const echteFetch = globalThis.fetch;
  let antwoord = null;
  let gevraagd = [];
  globalThis.fetch = async (url, init) => {
    if (String(url) === TURNSTILE_VERIFY) {
      gevraagd.push(Object.fromEntries(init.body.entries()));
      if (antwoord === 'gooi') throw new Error('geen verbinding');
      if (antwoord === 'traag') return new Promise((_, nee) => init.signal.addEventListener('abort', () => nee(Object.assign(new Error('afgebroken'), { name: 'AbortError' }))));
      if (typeof antwoord === 'number') return new Response('kapot', { status: antwoord });
      return new Response(JSON.stringify(antwoord), { status: 200, headers: { 'content-type': 'application/json' } });
    }
    return new Response('{"id":"x"}', { status: 200, headers: { 'content-type': 'application/json' } });
  };
  const vraag = async (a, env = SLEUTELS, token = 'tok-123', extra = {}) => { antwoord = a; return (await controleerBotcheck(env, { token, ip: '203.0.113.5', ...extra })).stand; };
  try {
    gevraagd = [];
    ok('zonder sleutels: uit, en er gaat niets naar Cloudflare', [await vraag({ success: true }, {}), gevraagd.length], ['uit', 0]);
    ok('met maar één sleutel ook uit', await vraag({ success: true }, { TURNSTILE_SITE_KEY: 'x' }), 'uit');
    ok('geen token: geen-token (niet weigeren)', [await vraag({ success: true }, SLEUTELS, ''), botcheckBesluit('geen-token')], ['geen-token', 'streng']);
    ok('Cloudflare zegt ja: goed', await vraag({ success: true }), 'goed');
    ok('  met het geheim, het token en het ip erbij', [gevraagd.at(-1).secret, gevraagd.at(-1).response, gevraagd.at(-1).remoteip], ['0x4AAAAAAAgeheimverzonnen', 'tok-123', '203.0.113.5']);
    ok('Cloudflare zegt uitdrukkelijk ongeldig: weigeren', [await vraag({ success: false, 'error-codes': ['invalid-input-response'] }), botcheckBesluit('ongeldig')], ['ongeldig', 'weiger']);
    ok('al gebruikt of verlopen: niet weigeren, wel streng', [await vraag({ success: false, 'error-codes': ['timeout-or-duplicate'] }), botcheckBesluit('verlopen')], ['verlopen', 'streng']);
    ok('een verkeerd ingevuld geheim is onze fout: doorlaten', await vraag({ success: false, 'error-codes': ['invalid-input-secret'] }), 'storing');
    ok('Cloudflare geeft een 500: doorlaten', await vraag(500), 'storing');
    ok('geen verbinding: doorlaten', await vraag('gooi'), 'storing');
    ok('te traag (na de wachttijd): doorlaten', await vraag('traag', SLEUTELS, 'tok', { wachtMs: 30 }), 'storing');
    ok('storing betekent streng, niet weigeren', botcheckBesluit('storing'), 'streng');

    /* /api/botcheck geeft de publieke sleutel, of null. */
    const { onRequestGet: sleutelGet } = await import('../functions/api/botcheck.js');
    ok('/api/botcheck zonder sleutels: null', (await sleutelGet({ env: {} }).json()).sleutel, null);
    ok('/api/botcheck met sleutels: de publieke, nooit het geheim', JSON.stringify(await sleutelGet({ env: SLEUTELS }).json()), JSON.stringify({ sleutel: '0x4AAAAAAAverzonnen' }));

    /* Het bestelformulier en het contactformulier. */
    const { onRequestPost: orderPost } = await import('../functions/api/order.js');
    const { db } = verseDb(new URL('../schema.sql', import.meta.url));
    const env = { DB: d1(db), ...SLEUTELS };
    let nr = 0;
    const bestel = (velden, { ip = '198.51.100.40', envX = env, sessieKlant = null } = {}) => {
      nr += 1;
      const fd = new FormData();
      for (const [k, v] of Object.entries({
        service: 'catalog', mode: 'json', lang: 'nl', email: `bestelling${nr}@voorbeeld.test`, first_name: 'Test', last_name: 'Klant',
        phone: '+31 6 00000000', brand: 'Verzonnen Merk', products: '3', country: 'NL', business_declaration: 'yes',
        business_version: 'business-v2-2026-09', no_vat: '1', reg_number: '00000000', ...velden,
      })) fd.append(k, v);
      return orderPost({ request: new Request('https://visuails.com/api/order', { method: 'POST', body: fd, headers: { 'cf-connecting-ip': ip } }), env: envX, waitUntil() {}, sessieKlant });
    };
    antwoord = { success: false, 'error-codes': ['invalid-input-response'] };
    const nee = await bestel({ turnstile: 'nep-token' });
    ok('bestelling met een token dat Cloudflare ongeldig noemt: 403 botcheck', [nee.status, (await nee.json()).error], [403, 'botcheck']);
    ok('  en er is niets aangemaakt', telling(db, 'SELECT COUNT(*) FROM orders'), 0);

    antwoord = { success: true };
    const ja = await bestel({ turnstile: 'goed-token', botcheck: 'zelf-ingevuld' });
    ok('met een goed token: gewoon door', [ja.status, (await ja.json()).ok], [200, true]);
    const rijJa = db.prepare('SELECT details_json FROM orders ORDER BY id DESC LIMIT 1').get();
    ok('  zonder markering', JSON.parse(rijJa.details_json).botcheck ?? null, null);

    const zonder = await bestel({}, { ip: '198.51.100.41' });
    ok('zonder token (adblocker): gewoon door', [zonder.status, (await zonder.json()).ok], [200, true]);
    const rijZonder = db.prepare('SELECT details_json FROM orders ORDER BY id DESC LIMIT 1').get();
    ok('  en in /admin gemarkeerd', JSON.parse(rijZonder.details_json).botcheck, 'geen-token');
    ok('  een gepost "botcheck"-veld telt niet (dat zet de server)', JSON.parse(rijJa.details_json).botcheck ?? null, null);
    await bestel({}, { ip: '198.51.100.41' });
    await bestel({}, { ip: '198.51.100.41' });
    const vierde = await bestel({}, { ip: '198.51.100.41' });
    ok('  maar strenger begrensd: de vierde zonder token in 10 minuten wacht', [vierde.status, (await vierde.json()).error], [429, 'rate']);

    antwoord = 'gooi';
    const storing = await bestel({ turnstile: 'tok' }, { ip: '198.51.100.42' });
    ok('storing bij Cloudflare: door (fail-open)', storing.status, 200);
    ok('  gemarkeerd als storing', JSON.parse(db.prepare('SELECT details_json FROM orders ORDER BY id DESC LIMIT 1').get().details_json).botcheck, 'storing');

    gevraagd = [];
    const zonderSleutels = await bestel({}, { ip: '198.51.100.43', envX: { DB: d1(db) } });
    ok('zonder sleutels: werkt precies zoals voorheen, niets naar Cloudflare', [zonderSleutels.status, gevraagd.length], [200, 0]);
    ok('  en geen markering', JSON.parse(db.prepare('SELECT details_json FROM orders ORDER BY id DESC LIMIT 1').get().details_json).botcheck ?? null, null);

    gevraagd = [];
    antwoord = { success: false, 'error-codes': ['invalid-input-response'] };
    const ingelogd = await bestel({ turnstile: 'wat-dan-ook' }, { ip: '198.51.100.44', sessieKlant: { customer_id: 999, email: 'x@voorbeeld.test' } });
    ok('een ingelogde klant (via Studio) wordt niet gecontroleerd', [ingelogd.status, gevraagd.length], [200, 0]);

    /* Het contactformulier post zonder JavaScript: weigeren is terug naar de pagina met ?error=botcheck. */
    antwoord = { success: false, 'error-codes': ['invalid-input-response'] };
    const cfd = new FormData();
    for (const [k, v] of Object.entries({ service: 'contact', lang: 'nl', email: 'vraag@voorbeeld.test', name: 'Iemand', message: 'hallo', turnstile: 'nep' })) cfd.append(k, v);
    const cnee = await orderPost({ request: new Request('https://visuails.com/api/order', { method: 'POST', body: cfd, headers: { referer: 'https://visuails.com/nl/contact/' } }), env, waitUntil() {} });
    ok('contact met een ongeldig token: terug naar /contact met ?error=botcheck', [cnee.status, cnee.headers.get('location')], [303, '/nl/contact/?error=botcheck']);
    ok('  en er staat geen bericht', telling(db, 'SELECT COUNT(*) FROM messages'), 0);

    /* De Studiobrief. */
    const { onRequestPost: briefPost } = await import('../functions/api/studiobrief.js');
    const brief = (velden, ip = '198.51.100.50') => {
      const fd = new FormData();
      for (const [k, v] of Object.entries({ lang: 'nl', bron: 'voet', mode: 'json', ...velden })) fd.append(k, v);
      return briefPost({ request: new Request('https://visuails.com/api/studiobrief', { method: 'POST', body: fd, headers: { 'cf-connecting-ip': ip } }), env, waitUntil() {} });
    };
    antwoord = { success: false, 'error-codes': ['invalid-input-response'] };
    const bnee = await brief({ email: 'lezer1@voorbeeld.test', turnstile: 'nep' });
    ok('Studiobrief met een ongeldig token: 403 botcheck', [bnee.status, (await bnee.json()).error], [403, 'botcheck']);
    const b1 = await brief({ email: 'lezer2@voorbeeld.test' });
    const b2 = await brief({ email: 'lezer3@voorbeeld.test' });
    const b3 = await brief({ email: 'lezer4@voorbeeld.test' });
    ok('Studiobrief zonder token: twee gaan door, de derde in 10 minuten wacht', [b1.status, b2.status, b3.status], [200, 200, 429]);

    /* Een nieuwe uploadbatch. */
    const { onRequestPost: upload } = await import('../functions/api/upload.js');
    const uenv = { ...env, UPLOADS: { async list() { return { objects: [] }; }, async put() {} } };
    const JPG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0x10, 0x4a, 0x46, 0x49, 0x46, 0, 1, 1, 0, 0, 1]);
    const stuur = async (velden, ip) => {
      const fd = new FormData();
      fd.append('file', new File([JPG], 'voorkant.jpg'));
      for (const [k, v] of Object.entries(velden)) fd.append(k, v);
      const r = await upload({ request: new Request('https://visuails.com/api/upload', { method: 'POST', body: fd, headers: { 'cf-connecting-ip': ip } }), env: uenv });
      return { status: r.status, body: await r.json() };
    };
    antwoord = { success: false, 'error-codes': ['invalid-input-response'] };
    const unee = await stuur({ turnstile: 'nep' }, '198.51.100.60');
    ok('eerste upload (nieuwe batch) met een ongeldig token: 403 botcheck', [unee.status, unee.body.error], [403, 'botcheck']);
    gevraagd = [];
    const uok = await stuur({ batch: 'b'.repeat(43) }, '198.51.100.61');
    ok('een upload in een bestaande batch vraagt de botcheck niet', [uok.status, gevraagd.length], [200, 0]);
    const zonderTok = [];
    for (let i = 0; i < 6; i += 1) zonderTok.push((await stuur({}, '198.51.100.62')).status);
    ok('nieuwe batches zonder token: vijf per dag, de zesde wacht', zonderTok, [200, 200, 200, 200, 200, 429]);
  } finally {
    globalThis.fetch = echteFetch;
  }
}

/* ══ o03 · TURNSTILE: WAT DE BROWSER DOET, IN DE GEBOUWDE PAGINA'S ═══════════
   Cloudflare zelf is hier niet bereikbaar; challenges.cloudflare.com wordt
   nagebootst met een script dat hetzelfde doet als het echte (render, execute,
   een token terug). Wat hier bewezen wordt is OUR kant: wanneer we laden, wat er
   meegaat, en dat een geblokkeerd script niets tegenhoudt. */
console.log('\no03 · de botcheck in de browser: onzichtbaar, laat, en nooit een blokkade');
{
  const { buildStaat } = await import('./lib/build.mjs');
  const staat = buildStaat(new URL('../dist/start/catalog/index.html', import.meta.url));
  if (!staat.er || staat.oud) {
    ok(`de build is er en is van deze bron (${staat.uitleg || 'ok'})`, false, true);
  } else {
    const { chromium } = await import('playwright');
    const { existsSync, readFileSync } = await import('node:fs');
    const { readFile } = await import('node:fs/promises');
    const http = (await import('node:http')).default;
    const path = (await import('node:path')).default;
    const { fileURLToPath } = await import('node:url');
    const DIST = path.join(path.dirname(path.dirname(fileURLToPath(import.meta.url))), 'dist');
    const TYPES = { '.js': 'text/javascript', '.css': 'text/css', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.json': 'application/json' };
    const srv = http.createServer(async (req, res) => {
      const u = new URL(req.url, 'http://x');
      const p = path.join(DIST, u.pathname);
      try {
        const body = await readFile(p).catch(() => readFile(path.join(p, 'index.html')));
        res.writeHead(200, { 'content-type': TYPES[path.extname(u.pathname)] || 'text/html; charset=utf-8' });
        res.end(body);
      } catch { res.writeHead(404); res.end('nee'); }
    });
    await new Promise((r) => srv.listen(0, r));
    const base = `http://localhost:${srv.address().port}`;
    /* Het nagebootste api.js: render() onthoudt de opties, execute() geeft een token. */
    const NEP_TURNSTILE = `window.turnstile = {
      _w: [], render(el, o) { this._w.push(o); window.__tsOpties = o; return 'w' + this._w.length; },
      execute(el) { const o = this._w[this._w.length - 1]; setTimeout(() => o.callback('NEP-TOKEN-123'), 50); },
      reset() {}, remove() {}, getResponse() { return ''; } };`;
    const EXE = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
    const browser = await chromium.launch(existsSync(EXE) ? { executablePath: EXE } : {});
    const pagina = async ({ sleutel = '0x4AAAAAAAverzonnen', scriptKapot = false } = {}) => {
      const pg = await browser.newPage();
      const log = { cloudflare: 0, posts: [] };
      await pg.route('**/api/botcheck', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ sleutel }) }));
      await pg.route('https://challenges.cloudflare.com/**', (r) => {
        log.cloudflare += 1;
        return scriptKapot ? r.abort('blockedbyclient') : r.fulfill({ status: 200, contentType: 'text/javascript', body: NEP_TURNSTILE });
      });
      await pg.route('**/api/upload', (r) => {
        if (r.request().method() !== 'POST') return r.fulfill({ status: 200, body: '{}' });
        log.posts.push({ waar: 'upload', body: r.request().postData() || '' });
        return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, batch: 'b'.repeat(43), file: { key: 'k', name: 'voorkant.jpg', bytes: 4, product: 'p1', shot: 'front' } }) });
      });
      await pg.route('**/api/order', (r) => { log.posts.push({ waar: 'order', body: r.request().postData() || '' }); return r.fulfill({ status: 200, contentType: 'text/html', body: '<p>ok</p>' }); });
      await pg.route('**/api/studiobrief', (r) => { log.posts.push({ waar: 'brief', body: r.request().postData() || '' }); return r.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' }); });
      return { pg, log };
    };
    const JPEG = { name: 'voorkant.jpg', mimeType: 'image/jpeg', buffer: Buffer.from([0xff, 0xd8, 0xff, 0xd9]) };
    try {
      /* 1 · Het contactformulier: pas laden bij de eerste aanraking, token mee bij versturen. */
      {
        const { pg, log } = await pagina();
        await pg.goto(`${base}/nl/contact/`, { waitUntil: 'load' });
        await pg.waitForTimeout(500);
        ok('/contact: bij het openen nog niets van Cloudflare geladen', log.cloudflare, 0);
        await pg.fill('#c-name', 'Iemand Verzonnen');
        await pg.fill('#c-email', 'iemand@voorbeeld.test');
        await pg.fill('#c-message', 'Een vraag.');
        await totDat(() => log.cloudflare >= 1, 5000);
        ok('  na de eerste aanraking wel (het script, één keer)', log.cloudflare, 1);
        await pg.click('form[data-botcheck="contact"] button[type="submit"]');
        await totDat(() => log.posts.some((x) => x.waar === 'order'));
        const post = log.posts.find((x) => x.waar === 'order');
        ok('  het bericht gaat mét token naar de server', /turnstile=NEP-TOKEN-123|name="turnstile"\r?\n\r?\nNEP-TOKEN-123/.test(post?.body || ''), true);
        await pg.close();
      }
      /* 2 · Script geblokkeerd (adblocker): het formulier gaat toch, zonder token. */
      {
        const { pg, log } = await pagina({ scriptKapot: true });
        await pg.goto(`${base}/contact/`, { waitUntil: 'load' });
        await pg.fill('#c-name', 'Someone Madeup');
        await pg.fill('#c-email', 'someone@voorbeeld.test');
        await pg.fill('#c-message', 'A question.');
        await pg.click('form[data-botcheck="contact"] button[type="submit"]');
        /* De browser wacht hooguit zes seconden op Cloudflare (WACHT_MS); een
           geblokkeerd script faalt meteen. Vijftien seconden is ruim, ook traag. */
        const kwam = await totDat(() => log.posts.some((x) => x.waar === 'order'), 15000);
        const post = log.posts.find((x) => x.waar === 'order');
        ok('script geblokkeerd: het bericht gaat toch (blijft niet hangen)', kwam, true);
        ok('  zonder token (de server laat het door, gemarkeerd)', /turnstile=NEP/.test(post?.body || ''), false);
        await pg.close();
      }
      /* 3 · Geen sleutel: niets van Cloudflare, formulier zoals altijd. */
      {
        const { pg, log } = await pagina({ sleutel: null });
        await pg.goto(`${base}/contact/`, { waitUntil: 'load' });
        await pg.fill('#c-name', 'Someone Madeup');
        await pg.fill('#c-email', 'someone@voorbeeld.test');
        await pg.fill('#c-message', 'A question.');
        await pg.click('form[data-botcheck="contact"] button[type="submit"]');
        await totDat(() => log.posts.some((x) => x.waar === 'order'));
        ok('zonder sleutel: niets van Cloudflare geladen', log.cloudflare, 0);
        ok('  en het bericht gaat meteen', log.posts.some((x) => x.waar === 'order'), true);
        await pg.close();
      }
      /* 4 · Het bestelformulier: de eerste upload (nieuwe batch) krijgt het token, de tweede niet. */
      {
        const { pg, log } = await pagina();
        await pg.goto(`${base}/start/catalog/`, { waitUntil: 'load' });
        await pg.waitForSelector('form[data-pipeline].is-live', { timeout: 15000 });
        const invoer = pg.locator('.pu-slot-input');
        await invoer.nth(0).setInputFiles(JPEG);
        await totDat(() => log.posts.filter((x) => x.waar === 'upload').length >= 1);
        await invoer.nth(1).setInputFiles({ ...JPEG, name: 'achterkant.jpg' });
        await totDat(() => log.posts.filter((x) => x.waar === 'upload').length >= 2);
        const ups = log.posts.filter((x) => x.waar === 'upload');
        ok('bestelformulier: de eerste upload draagt het token', /name="turnstile"[\s\S]*NEP-TOKEN-123/.test(ups[0]?.body || ''), true);
        ok('  de tweede (met batch) niet meer', /name="turnstile"/.test(ups[1]?.body || ''), false);
        const opties = await pg.evaluate(() => window.__tsOpties);
        ok('  onzichtbaar, pas bij versturen, en zonder eigen veld van Cloudflare', [opties?.appearance, opties?.execution, opties?.['response-field']], ['interaction-only', 'execute', false]);
        await pg.close();
      }
      /* 5 · De Studiobrief in de voettekst. */
      {
        const { pg, log } = await pagina();
        await pg.goto(`${base}/nl/`, { waitUntil: 'load' });
        await pg.waitForTimeout(400);
        ok('voorpagina: bij het openen niets van Cloudflare', log.cloudflare, 0);
        await pg.fill('#studiobrief-voet-email', 'lezer@voorbeeld.test');
        await pg.click('#studiobrief-voet button[type="submit"]');
        await totDat(() => log.posts.some((x) => x.waar === 'brief'));
        const post = log.posts.find((x) => x.waar === 'brief');
        ok('  de aanmelding gaat mét token', /name="turnstile"[\s\S]*NEP-TOKEN-123/.test(post?.body || ''), true);
        await pg.close();
      }
      /* 6 · De CSP in de build: alleen challenges.cloudflare.com erbij. */
      const kop = readFileSync(path.join(DIST, '_headers'), 'utf8');
      const csp = (/Content-Security-Policy:(.*)$/m.exec(kop) || [, ''])[1];
      ok('de CSP laat het script van de botcheck toe', /script-src[^;]*https:\/\/challenges\.cloudflare\.com/.test(csp), true);
      ok('  en zijn iframe, en verder geen enkel', (/frame-src[^;]*/.exec(csp) || [''])[0].trim(), 'frame-src https://challenges.cloudflare.com');
      ok('  en connect-src blijft zoals hij was', /connect-src[^;]*challenges/.test(csp), false);
    } finally {
      await browser.close();
      srv.close();
    }
  }
}

/* ══ o16 · 0% BTW BUITEN DE EU, MET EEN IP IN DE EU: EERST NAKIJKEN ══════════
   De bestelkant staat in tests/order-api.test.mjs (de bedankpagina met
   nakijk=1, geen betaling). Hier de regel zelf en het abonnement. */
console.log('\no16 · land buiten de EU met een ip in de EU gaat eerst langs Lucas');
{
  const { ipLandVraagtNakijken, vatGate, VAT_TREATMENT } = await import('../src/data/vat.js');
  ok('VS gekozen, ip in Nederland: nakijken', ipLandVraagtNakijken('US', 'NL'), true);
  ok('VS gekozen, ip in Duitsland: nakijken', ipLandVraagtNakijken('US', 'DE'), true);
  ok('VS gekozen, ip in de VS: niet', ipLandVraagtNakijken('US', 'US'), false);
  ok('Duitsland gekozen (EU): niet, daar is VIES voor', ipLandVraagtNakijken('DE', 'NL'), false);
  ok('onbekend ip-land (XX, Tor): niet', [ipLandVraagtNakijken('US', 'XX'), ipLandVraagtNakijken('US', 'T1'), ipLandVraagtNakijken('US', '')], [false, false, false]);
  const poort = vatGate({ country: 'US', treatment: VAT_TREATMENT.outsideScope, vatValid: null, confirmed: false, hadNumber: false, ipCountry: 'NL' });
  ok('de poort zet hem op de btw-lijst, met een reden voor jou', [poort.needsReview, /ip-adres in NL/.test(poort.reasons.join(' '))], [true, true]);

  const { handleSubscribeStart } = await import('../src/lib/subscribe.js');
  const { db } = verseDb(new URL('../schema.sql', import.meta.url));
  db.exec(`INSERT INTO customers (id, email, brand, country) VALUES (1, 'reiziger@voorbeeld.test', 'Verzonnen Inc', 'US'), (2, 'goedgekeurd@voorbeeld.test', 'Ook Verzonnen LLC', 'US')`);
  const mollie = [];
  const echteFetch = globalThis.fetch;
  globalThis.fetch = async (url, init) => {
    const pad = new URL(url).pathname;
    mollie.push(pad);
    const geef = (b) => new Response(JSON.stringify(b), { status: 201, headers: { 'content-type': 'application/json' } });
    if (pad === '/v2/customers') return geef({ id: 'cst_nep' });
    if (pad === '/v2/payments') return geef({ id: 'tr_nep', _links: { checkout: { href: 'https://www.mollie.com/checkout/nep' } } });
    return new Response('{}', { status: 200 });
  };
  const env = { DB: d1(db), MOLLIE_API_KEY: 'test_neppesleutelvoordetest0123456789' };
  const start = (klant, ipLand) => {
    const req = new Request('https://visuails.com/api/plan', {
      method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ plan: 'studio', term: 'monthly', lang: 'nl', country: 'US', brand: 'Verzonnen', business_declaration: 'yes', business_version: 'business-v2-2026-09' }).toString(),
    });
    Object.defineProperty(req, 'cf', { value: { country: ipLand } });
    return handleSubscribeStart({ env, request: req }, klant);
  };
  try {
    const wacht = await start({ customer_id: 1, email: 'reiziger@voorbeeld.test', brand: 'Verzonnen Inc' }, 'NL');
    ok('abonnement, VS gekozen, ip in NL: terug met een mededeling, niet naar Mollie', wacht.headers.get('location'), '/nl/start/plan?fout=nakijken');
    ok('niets bij Mollie en geen abonnement', [mollie.length, telling(db, 'SELECT COUNT(*) FROM subscriptions')], [0, 0]);

    db.exec("UPDATE customers SET btw_land_akkoord = 'US' WHERE id = 2");
    const ok2 = await start({ customer_id: 2, email: 'goedgekeurd@voorbeeld.test', brand: 'Ook Verzonnen LLC' }, 'NL');
    ok('door Lucas goedgekeurd: gewoon naar de betaling', ok2.headers.get('location'), 'https://www.mollie.com/checkout/nep');
    ok('met 0% (buiten de heffing)', db.prepare('SELECT vat_treatment FROM subscriptions WHERE customer_id = 2').get()?.vat_treatment, 'outside_scope');

    const vanuitUs = await start({ customer_id: 1, email: 'reiziger@voorbeeld.test', brand: 'Verzonnen Inc' }, 'US');
    ok('zelfde klant met een ip in de VS: gewoon naar de betaling', vanuitUs.headers.get('location'), 'https://www.mollie.com/checkout/nep');
  } finally {
    globalThis.fetch = echteFetch;
  }

  /* De mededeling op /start/plan is geen rode foutmelding. */
  const pp = (await import('node:fs')).readFileSync(new URL('../src/components/order/PlanPicker.astro', import.meta.url), 'utf8');
  ok('PlanPicker toont "nakijken" als mededeling, niet als fout', /<p class="ps-plek" data-plan-fout="nakijken" hidden role="status">/.test(pp), true);

  /* De knop in /admin. */
  const env2 = { DB: d1(db), ADMIN_ORIGIN: 'https://visuails.com' };
  db.prepare('INSERT INTO admin_users (id, email, password_hash) VALUES (1, ?, ?)')
    .run('beheer@voorbeeld.test', await hashPassword('een-lang-verzonnen-wachtwoord'));
  const inlog = await adminPost({
    request: new Request('https://visuails.com/admin/login', {
      method: 'POST', headers: { origin: 'https://visuails.com' },
      body: new URLSearchParams({ email: 'beheer@voorbeeld.test', password: 'een-lang-verzonnen-wachtwoord' }),
    }), env: env2, waitUntil() {},
  });
  const c = koekje(inlog, 'vis_admin');
  const knop = (id, action) => adminPost({
    request: new Request(`https://visuails.com/admin/customers/${id}/btw-land`, {
      method: 'POST', headers: { origin: 'https://visuails.com', cookie: `vis_admin=${c}` },
      body: new URLSearchParams({ action }),
    }), env: env2, waitUntil() {},
  });
  const pagina = await (await adminGet({ request: new Request('https://visuails.com/admin/customers/1', { headers: { cookie: `vis_admin=${c}` } }), env: env2, waitUntil() {} })).text();
  ok('de klantpagina toont de knop bij een klant buiten de EU', /Land goedkeuren: Verenigde Staten, 0% btw/.test(pagina), true);
  await knop(1, 'akkoord');
  ok('de knop zet het akkoord op het land van de klant', db.prepare('SELECT btw_land_akkoord FROM customers WHERE id = 1').get().btw_land_akkoord, 'US');
  await knop(1, 'intrekken');
  ok('en intrekken haalt het weg', db.prepare('SELECT btw_land_akkoord FROM customers WHERE id = 1').get().btw_land_akkoord, null);
  db.exec("INSERT INTO customers (id, email, country) VALUES (3, 'nl@voorbeeld.test', 'NL')");
  await knop(3, 'akkoord');
  ok('bij een klant in de EU doet de knop niets', db.prepare('SELECT btw_land_akkoord FROM customers WHERE id = 3').get().btw_land_akkoord, null);

  /* o03: de markering van de botcheck op de bestelpagina in /admin. */
  db.prepare(`INSERT INTO orders (id, ref, service, email, customer_id, details_json) VALUES (50, 'VIS-BOT-TEST', 'catalog', 'nl@voorbeeld.test', 3, ?)`)
    .run(JSON.stringify({ botcheck: 'geen-token', style: 'x' }));
  const bord = await adminGet({ request: new Request('https://visuails.com/admin/orders/50/files', { headers: { cookie: `vis_admin=${c}` } }), env: env2, waitUntil() {} });
  const bordHtml = await bord.text();
  ok('o03: een bestelling zonder botcheck staat in /admin gemarkeerd', [bord.status, /Even nakijken<\/strong> — geen botcheck meegestuurd/.test(bordHtml)], [200, true]);
}

/* ══ o25 (3) · DE KOPPEN VAN /account VIA src/middleware.js, IN DE ECHTE WORKER ══
   Draait de gebouwde Worker (tests/lib/studio-worker.mjs), dus na `astro build`.
   De doorverwijzing naar inloggen komt uit seeOther() in account.js en had
   alleen no-store en referrer-policy; dat hij nu ook HSTS en de CSP draagt,
   kan alleen van de middleware komen — het bewijs dat die in Astro 6 met de
   Cloudflare-adapter echt draait. */
console.log('\no25 · de middleware zet de Studio-koppen in de gebouwde Worker');
{
  const { ontbrekendeKoppen } = await import('../src/middleware.js');
  const zonder = new Response(null, { status: 303, headers: { location: '/account/login', 'cache-control': 'no-store' } });
  ok('een doorverwijzing onder /account mist koppen', ontbrekendeKoppen('/account/', zonder).map(([k]) => k).includes('content-security-policy'), true);
  ok('een beeld onder /account niet (dat zet zijn eigen koppen)', ontbrekendeKoppen('/account/files/1/f', new Response('x', { headers: { 'content-type': 'image/webp' } })).length, 0);
  ok('en buiten /account nooit', ontbrekendeKoppen('/admin', new Response('<p>', { headers: { 'content-type': 'text/html' } })).length, 0);
  ok('wat er al staat blijft staan', ontbrekendeKoppen('/account/x', new Response('<p>', { headers: { 'content-type': 'text/html', 'content-security-policy': "default-src 'none'" } })).some(([k]) => k === 'content-security-policy'), false);

  const { startStudio } = await import('./lib/studio-worker.mjs');
  const w = await startStudio();
  try {
    const uit = await w.fetch('/account/', { token: null });
    ok('uitgelogd naar /account: 303 naar inloggen', [uit.status, (uit.headers.get('location') || '').startsWith('/account/login')], [303, true]);
    ok('en die doorverwijzing draagt nu HSTS', /max-age=31536000/.test(uit.headers.get('strict-transport-security') || ''), true);
    ok('en de Studio-CSP', /frame-ancestors 'none'/.test(uit.headers.get('content-security-policy') || ''), true);
    const binnen = await w.fetch('/account/');
    ok('ingelogd: de pagina zelf heeft haar koppen nog', [binnen.status, binnen.headers.get('cache-control'), /default-src 'none'/.test(binnen.headers.get('content-security-policy') || '')], [200, 'no-store', true]);
    const admin = await w.fetch('/admin/login', { token: null });
    ok('/admin houdt zijn eigen CSP (met zijn ene script)', /script-src 'self'/.test(admin.headers.get('content-security-policy') || ''), true);
  } finally {
    await w.dispose();
  }
}

console.log(`\n${goed}/${totaal} geslaagd`);
if (goed !== totaal) process.exit(1);
