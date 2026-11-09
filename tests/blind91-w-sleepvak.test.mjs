/* VISUAILS — ronde 91, w9 (lijst 85, D17 = goed): leveren met één sleepvak per product.
 *   node tests/blind91-w-sleepvak.test.mjs        (geen server, geen browser)
 *
 *   1 · de indeling (sleepvakIndeling): wat Lucas koos, dan de naam (dezelfde woorden als Map uploaden), dan op
 *       volgorde in de lege vakjes; twee bestanden nooit in hetzelfde vakje; geen vrij vakje → null;
 *   2 · het bord: per product één sleepvak (product vast, sleepvak=1, meerdere bestanden), met de vakken en de
 *       woorden voor de browser in data-sleepvak; het script toont eerst de indeling en vraagt dan "Bevestigen";
 *   3 · de echte route: drie beelden in één keer in het vak van product 1 komen in voorkant, achterkant en detail;
 *       met een keuze uit de browser (vak=…) wint die keuze.
 * Verzonnen merken en adressen; niets hiervan bestaat.
 */
import { readFileSync } from 'node:fs';
import { d1, verseDb } from './lib/d1sqlite.mjs';
import { adminGet, adminPost, sleepvakIndeling } from '../src/lib/admin.js';
import { mintToken, hashToken } from '../src/lib/token.js';

let goed = 0, fout = 0;
const ok = (naam, w, v = true) => {
  const p = JSON.stringify(w) === JSON.stringify(v);
  if (p) goed++; else fout++;
  console.log(`${p ? 'ok  ' : 'FAIL'}  ${naam}${p ? '' : `    verwacht ${JSON.stringify(v)} kreeg ${JSON.stringify(w)}`}`);
};

console.log('\n1 · de indeling');
const VAK = ['front', 'back', 'detail', 'worn'];
ok('op naam: voorkant, achterkant en detail op hun plek', sleepvakIndeling({ namen: ['VOLT-achterkant.jpg', 'detail_02.jpg', 'voorkant.jpg'], vakken: VAK }), ['back', 'detail', 'front']);
ok('zonder herkenbare naam: op volgorde in de lege vakjes', sleepvakIndeling({ namen: ['IMG_1.jpg', 'IMG_2.jpg', 'IMG_3.jpg'], vakken: VAK }), ['front', 'back', 'detail']);
ok('wat er al staat, wordt overgeslagen bij de volgorde', sleepvakIndeling({ namen: ['a.jpg', 'b.jpg'], vakken: VAK, bezet: ['front', 'detail'] }), ['back', 'worn']);
ok('een naam mag een gevuld vakje vervangen (bewust: dan is het een nieuwe versie)', sleepvakIndeling({ namen: ['voorkant-v2.jpg'], vakken: VAK, bezet: ['front'] }), ['front']);
ok('twee keer "voorkant": de tweede naar het volgende vrije vakje', sleepvakIndeling({ namen: ['voorkant.jpg', 'voorkant (2).jpg'], vakken: VAK }), ['front', 'back']);
ok('de keuze uit de browser wint van de naam', sleepvakIndeling({ namen: ['voorkant.jpg', 'b.jpg'], vakken: VAK, gekozen: ['worn', 'front'] }), ['worn', 'front']);
ok('een onzinkeuze telt niet', sleepvakIndeling({ namen: ['x.jpg'], vakken: VAK, gekozen: ['<script>'] }), ['front']);
ok('meer bestanden dan vakjes: de rest null (de indeeltabel)', sleepvakIndeling({ namen: ['1.jpg', '2.jpg', '3.jpg'], vakken: ['front', 'back'] }), ['front', 'back', null]);
ok('het pad uit de werkmap telt ook (zoals Map uploaden)', sleepvakIndeling({ namen: ['VIS-W-0001/p1 - Hoodie/2 achterkant/upscaled.png'], vakken: VAK }), ['back']);

/* ── De vulling ─────────────────────────────────────────────────────────────── */
const { db, mislukt } = verseDb(new URL('../schema.sql', import.meta.url));
ok('het schema laadt', mislukt.length, 0);
const r2 = new Map();
const UPLOADS = {
  async put(k, body, opts = {}) { const b = body && typeof body.getReader === 'function' ? new Uint8Array(await new Response(body).arrayBuffer()) : body; r2.set(k, { b, opts }); return { key: k }; },
  async get(k) { const x = r2.get(k); return x ? { body: new Response(x.b).body, arrayBuffer: async () => x.b, size: x.b?.length || 0 } : null; },
  async head(k) { return r2.has(k) ? { key: k } : null; },
  async delete(k) { r2.delete(k); },
};
const env = { DB: d1(db), UPLOADS };
db.exec("INSERT INTO admin_users (id, email, password_hash) VALUES (1, 'studio@voorbeeld.test', 'x')");
const token = await mintToken();
db.prepare("INSERT INTO admin_sessions (id, admin_id, token_hash, expires_at) VALUES (1, 1, ?, '2099-01-01T00:00:00Z')").run(await hashToken(token));
db.exec(`
  INSERT INTO customers (id, email, name, brand, country) VALUES (1, 'sanne@voorbeeld-volt.test', 'Sanne Voorbeeld', 'VOLT', 'NL');
  INSERT INTO orders (id, ref, customer_id, service, status, tier, name, brand, email, total_cents, vat_cents, lang, product_count, payment_status, country, created_at, paid_at) VALUES
    (71, 'VIS-WV-0071', 1, 'catalog', 'in_production', 'unattended', 'Sanne', 'VOLT', 'sanne@voorbeeld-volt.test', 20000, 4200, 'nl', 2, 'paid', 'NL', datetime('now','-1 days'), datetime('now','-1 days'));
`);
const get = async (pad) => {
  const res = await adminGet({ request: new Request(`https://visuails.com${pad}`, { headers: { cookie: `vis_admin=${token}` } }), env, waitUntil() {} });
  return { status: res.status, html: await res.text() };
};
const postForm = async (pad, fd) => {
  const res = await adminPost({ request: new Request(`https://visuails.com${pad}`, { method: 'POST', headers: { cookie: `vis_admin=${token}`, origin: 'https://visuails.com' }, body: fd }), env, waitUntil() {} });
  return { status: res.status, location: res.headers.get('location') };
};
/* Een paar bytes die als jpg beginnen; de tagcontrole meldt hem als "zonder tag", dat is hier geen punt. */
const jpg = (naam) => new File([new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 16, 74, 70, 73, 70, 0, 1, Math.floor(Math.random() * 250)])], naam, { type: 'image/jpeg' });

console.log('\n2 · het bord');
{
  const { status, html } = await get('/admin/orders/71/files');
  ok('bestelpagina laadt', status, 200);
  const vakken = [...html.matchAll(/<form class="sleepvak" method="post" action="\/admin\/orders\/71\/deliver" enctype="multipart\/form-data" data-sleepvak="([^"]*)">([\s\S]*?)<\/form>/g)];
  ok('één sleepvak per product (2 producten)', vakken.length, 2);
  const [eerste] = vakken;
  ok('  met het product vast, sleepvak=1 en meerdere bestanden', /name="product" value="p1"/.test(eerste[2]) && /name="sleepvak" value="1"/.test(eerste[2]) && /<input type="file" name="files" multiple accept="image\/\*" required aria-label="Beelden voor product 1">/.test(eerste[2]), true);
  const plan = JSON.parse(eerste[1].replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>'));
  ok('  data-sleepvak: de vakken van dit product, met hun naam en of ze vol zijn', plan.vakken.map((v) => [v.id, v.label, v.vol]), [['front', 'Voorkant', false], ['back', 'Achterkant', false], ['detail', 'Detail', false], ['worn', 'Op een model', false]]);
  ok('  en de woorden van de server voor de browser', plan.woorden.map((w) => w[0]).sort(), ['back', 'detail', 'front', 'worn']);
  ok('  de tekst zegt wat er gebeurt', /Sleep de beelden van product 1 hierheen/.test(eerste[2]) && /op volgorde in de lege vakjes/.test(eerste[2]), true);
  ok('het script van de pagina wordt geladen (eerst zien, dan bevestigen)', /<script src="\/admin-voorvertoning\.js" defer><\/script>/.test(html), true);
  const js = readFileSync(new URL('../public/admin-voorvertoning.js', import.meta.url), 'utf8');
  ok('  het script leest data-sleepvak, maakt per bestand een keuzelijst name="vak" en zegt "Bevestigen en uploaden"', /form\[data-sleepvak\]/.test(js) && /kies\.name = 'vak'/.test(js) && /Bevestigen en uploaden/.test(js), true);
  ok('  en zet bestandsnamen alleen als tekst neer (geen innerHTML)', /innerHTML/.test(js), false);
  ok('het losse vakje (Uploaden per beeld) blijft voor één los beeld', /name="shot" value="front"/.test(html), true);
}

console.log('\n3 · de echte route');
{
  const fd = new FormData();
  fd.append('product', 'p1');
  fd.append('sleepvak', '1');
  for (const n of ['IMG_0001.jpg', 'achterkant.jpg', 'IMG_0002.jpg']) fd.append('files', jpg(n));
  const r = await postForm('/admin/orders/71/deliver', fd);
  ok('drie beelden in het sleepvak van product 1: opgeslagen, terug naar het product', [r.status, /\/admin\/orders\/71\/files\?.*#p1$/.test(r.location || '')], [303, true]);
  const rijen = db.prepare("SELECT filename, product_key, shot FROM files WHERE order_id = 71 AND kind = 'delivery' ORDER BY id").all();
  ok('  achterkant op naam, de andere twee op volgorde in voorkant en detail', rijen.map((x) => [x.product_key, x.shot]), [['p1', 'front'], ['p1', 'back'], ['p1', 'detail']]);
  ok('  en de klant ziet straks nette namen', rijen.every((x) => /^VIS-WV-0071-p1-/.test(x.filename)), true);

  const fd2 = new FormData();
  fd2.append('product', 'p2');
  fd2.append('sleepvak', '1');
  fd2.append('files', jpg('voorkant.jpg'));
  fd2.append('files', jpg('IMG_9.jpg'));
  fd2.append('vak', 'worn');
  fd2.append('vak', 'front');
  await postForm('/admin/orders/71/deliver', fd2);
  const p2 = db.prepare("SELECT shot FROM files WHERE order_id = 71 AND product_key = 'p2' ORDER BY id").all().map((x) => x.shot);
  ok('met de keuze uit de browser (eerst gezien, dan bevestigd): die keuze wint', p2, ['worn', 'front']);
  const { html } = await get('/admin/orders/71/files');
  const plan = JSON.parse(((/data-sleepvak="([^"]*)"/.exec(html) || ['', '{}'])[1]).replace(/&quot;/g, '"').replace(/&amp;/g, '&'));
  ok('daarna weet het sleepvak van product 1 welke vakjes vol zijn', plan.vakken.map((v) => v.vol), [true, true, true, false]);
}

console.log(`\n${goed} goed, ${fout} fout`);
process.exit(fout ? 1 : 0);
