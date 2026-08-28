/*
 * ═══════════════════════════════════════════════════════════════════════════════
 * DE FOTO'S BIJ EEN LIJSTITEM
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * `plan_queue.upload_batch` bestond sinds migratie 0030 en werd door niemand
 * gevuld. Gevolg: elk item op elke lijst stond permanent op "nog geen foto's",
 * startPlanWindow() sloeg ze allemaal over en de nachtelijke taak telde elke
 * lijst als leeg. De hele abonnementsketen kon geen enkel product opleveren.
 *
 * Zie de kop bij stageerFotos() in src/lib/account.js voor waarom dit een gewoon
 * multipart-formulier is en geen uploader met script.
 *
 * ── WAT HIER BEWEZEN MOET WORDEN ────────────────────────────────────────────
 *
 *   · de bytes belanden in R2 en het kenmerk in de rij;
 *   · een bestand dat te groot is of het verkeerde type heeft, valt af zonder de
 *     rest mee te nemen — elf goede foto's en één pdf is elf foto's, niet nul;
 *   · komt er niets door, dan krijgt het item GEEN kenmerk. Een kenmerk zonder
 *     bytes is erger dan geen kenmerk: de wachtrij denkt dan dat het item klaar
 *     staat en startPlanWindow() maakt er werk van dat niet gemaakt kan worden;
 *   · en het formulier draagt enctype="multipart/form-data" — zonder dat komen
 *     de bytes niet mee en denkt de klant dat ze verstuurd zijn.
 */
import { readFileSync } from 'node:fs';
import { d1, verseDb } from './lib/d1sqlite.mjs';
import { accountPost } from '../src/lib/account.js';
import { loadQueue, queueMax } from '../src/lib/subscription.js';
import { mintToken, hashToken } from '../src/lib/token.js';
import { MAX_FILE_BYTES } from '../src/lib/uploads.js';

let goed = 0; let totaal = 0;
function ok(naam, kreeg, verwacht = true) {
  totaal += 1;
  const isGoed = JSON.stringify(kreeg) === JSON.stringify(verwacht);
  if (isGoed) goed += 1;
  console.log(` ${isGoed ? 'ok  ' : 'FAIL'} ${String(naam).padEnd(58)}${isGoed ? '' : ` verwacht ${JSON.stringify(verwacht)} kreeg ${JSON.stringify(kreeg)}`}`);
}

const { db, mislukt } = verseDb(new URL('../schema.sql', import.meta.url));
if (mislukt.length) { console.error('schema kon niet geladen worden:', mislukt); process.exit(1); }

/* Een R2-stub die onthoudt wat erin gaat. Geen echte bucket: wat hier bewezen
   moet worden is WAT er wordt weggeschreven en onder welke sleutel, niet dat
   Cloudflare bestanden kan opslaan. */
const bucket = new Map();
const env = {
  DB: d1(db),
  UPLOADS: { async put(key, body, opts) { bucket.set(key, { bytes: body.byteLength ?? body.length, opts }); } },
};

db.exec("INSERT INTO customers (id, email, brand) VALUES (1, 'mara@volt.test', 'VOLT')");
const token = await mintToken();
db.prepare("INSERT INTO account_sessions (customer_id, token_hash, expires_at) VALUES (1, ?, datetime('now','+1 day'))")
  .run(await hashToken(token));

const nepBestand = (naam, bytes, type = 'image/jpeg') =>
  new File([new Uint8Array(bytes)], naam, { type });

async function toevoegen(naam, bestanden) {
  const fd = new FormData();
  fd.set('do', 'add');
  fd.set('name', naam);
  bestanden.forEach((f) => fd.append('fotos', f));
  const request = new Request('https://visuails.com/account/plan/queue', {
    method: 'POST',
    headers: { cookie: `vis_account=${token}`, origin: 'https://visuails.com' },
    body: fd,
  });
  return accountPost({ request, env, waitUntil() {} });
}

console.log('\nfoto’s komen mee en het kenmerk komt op de rij');
const a = await toevoegen('Winterjas, zwart', [nepBestand('voor.jpg', 2048), nepBestand('achter.png', 3072, 'image/png')]);
ok('de post stuurt door naar de besteltab', [a.status, a.headers.get('location')],
  [303, '/account/plan?tab=bestellen']);
let rij = (await loadQueue(env, 1))[0];
ok('het item staat op de lijst', rij?.name, 'Winterjas, zwart');
ok('met een batchkenmerk', Boolean(rij?.upload_batch), true);
ok('en er staan twee objecten in R2', bucket.size, 2);
ok('onder het kenmerk van dit item',
  [...bucket.keys()].every((k) => k.includes(rij.upload_batch)), true);

console.log('\nwat niet door de controle komt, valt af zonder de rest mee te nemen');
bucket.clear();
await toevoegen('Cargobroek', [
  nepBestand('goed.jpg', 1024),
  nepBestand('brief.pdf', 1024, 'application/pdf'),   // verkeerd type
  nepBestand('reus.jpg', MAX_FILE_BYTES + 1),          // te groot
  nepBestand('tweede.webp', 900, 'image/webp'),
]);
ok('alleen de twee bruikbare zijn opgeslagen', bucket.size, 2);
rij = (await loadQueue(env, 1)).find((q) => q.name === 'Cargobroek');
ok('en het item heeft een kenmerk', Boolean(rij?.upload_batch), true);

console.log('\nkomt er niets door, dan ook geen kenmerk');
bucket.clear();
await toevoegen('Handschoenen', [nepBestand('brief.pdf', 500, 'application/pdf')]);
ok('er is niets opgeslagen', bucket.size, 0);
rij = (await loadQueue(env, 1)).find((q) => q.name === 'Handschoenen');
ok('het item staat er wel', Boolean(rij), true);
ok('maar zonder kenmerk', rij?.upload_batch || '', '');

console.log('\nzonder foto’s mag ook');
await toevoegen('Muts', []);
rij = (await loadQueue(env, 1)).find((q) => q.name === 'Muts');
ok('het item komt er gewoon op', Boolean(rij), true);
ok('en draagt geen kenmerk', rij?.upload_batch || '', '');

/* ── EEN WEIGERING MOET TE ZIEN ZIJN ────────────────────────────────────────
 *
 * queueAdd() gaf al null terug bij een lege naam en bij een volle lijst, en
 * handlePlanQueue keek daar niet naar: hij stuurde in alle drie de gevallen
 * dezelfde 303 terug. De klant zag zijn lijst ongewijzigd terugkomen zonder één
 * woord uitleg — precies het soort kapot dat op een knop lijkt die het niet doet.
 *
 * En bij een lege naam werden de foto's WEL al naar R2 geschreven. Bytes zonder
 * rij die ernaar wijst: onzichtbaar, niet op te ruimen, en ze tellen wel mee.
 */
console.log('\neen lege naam wordt geweigerd, en er gaat niets naar R2');
{
  bucket.clear();
  const voor = (await loadQueue(env, 1)).length;
  const r = await toevoegen('   ', [nepBestand('voor.jpg', 2048)]);
  ok('de post zegt waaróm het niet ging', [r.status, r.headers.get('location')],
    [303, '/account/plan?tab=bestellen&fout=naam']);
  ok('er staat niets in R2', bucket.size, 0);
  ok('en de lijst is niet gegroeid', (await loadQueue(env, 1)).length, voor);
}

console.log('\neen volle lijst wordt geweigerd, en er gaat niets naar R2');
{
  bucket.clear();
  /* Tot aan de grens vullen langs de deur waar de grens ook echt staat. */
  /* Rechtstreeks in de tabel en niet via het formulier. Veertig POSTs achter
     elkaar lopen tegen de snelheidsbegrenzer van accountPost aan (429), en dan
     meet deze toets die begrenzer in plaats van de grens aan de lijst. Wat hier
     bewezen moet worden is wat handlePlanQueue doet als de lijst VOL is; hoe hij
     vol raakt, doet er niet toe. */
  const nu = (await loadQueue(env, 1)).length;
  const zet = db.prepare('INSERT INTO plan_queue (customer_id, position, name) VALUES (1, ?, ?)');
  for (let i = nu; i < queueMax(); i += 1) zet.run(100 + i, `Vulling ${i}`);
  ok('de lijst zit precies op de grens', (await loadQueue(env, 1)).length, queueMax());
  const r = await toevoegen('Eentje te veel', [nepBestand('voor.jpg', 2048)]);
  ok('de post zegt dat de lijst vol is', [r.status, r.headers.get('location')],
    [303, '/account/plan?tab=bestellen&fout=vol']);
  ok('er staat niets in R2', bucket.size, 0);
  ok('en de lijst is niet gegroeid', (await loadQueue(env, 1)).length, queueMax());
}

console.log('\nde twee meldingen staan er ook echt, in beide talen');
{
  const bron = readFileSync(new URL('../src/lib/account.js', import.meta.url), 'utf8');
  ok('fout=vol toont planQueueFull', /fout === 'vol' \? t\.planQueueFull/.test(bron), true);
  ok('fout=naam toont planQueueNameMissing', /fout === 'naam'\s*\? t\.planQueueNameMissing/.test(bron), true);
  ok('planQueueFull staat er in twee talen',
    (bron.match(/^ {4}planQueueFull:/gm) || []).length, 2);
  ok('planQueueNameMissing staat er in twee talen',
    (bron.match(/^ {4}planQueueNameMissing:/gm) || []).length, 2);
}

console.log('\nhet formulier draagt de enctype die de bytes meestuurt');
{
  const bron = readFileSync(new URL('../src/lib/account.js', import.meta.url), 'utf8');
  ok('enctype staat op het toevoegformulier',
    /action="\/account\/plan\/queue" class="q-toevoegen" enctype="multipart\/form-data"/.test(bron), true);
  ok('en het bestandsveld heet fotos',
    /<input id="q-fotos" name="fotos" type="file"/.test(bron), true);
}

console.log(`\n${goed}/${totaal} geslaagd`);
process.exit(goed === totaal ? 0 : 1);
