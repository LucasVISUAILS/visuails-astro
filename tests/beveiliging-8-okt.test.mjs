/**
 * VISUAILS — de beveiligingsronde van 8 oktober 2026, voor zover niet al in een
 * bestaand testbestand: de IPv6-teller en de randcache voor de openbare
 * capaciteitsvragen. Draai: node tests/beveiliging-8-okt.test.mjs
 */
import { rateIp } from '../src/lib/ratelimit.js';

let goed = 0, totaal = 0;
function ok(naam, kreeg, wil = true) {
  totaal++;
  const ja = JSON.stringify(kreeg) === JSON.stringify(wil);
  if (ja) goed++;
  console.log(`${ja ? ' ok  ' : ' FAIL'} ${naam}${ja ? '' : `  verwacht ${JSON.stringify(wil)}, kreeg ${JSON.stringify(kreeg)}`}`);
}

console.log('\nde snelheidsteller telt IPv6 per /64-blok');
ok('IPv4 blijft het hele adres', rateIp('203.0.113.7'), '203.0.113.7');
ok('een volledig IPv6-adres wordt zijn /64', rateIp('2001:db8:1:2:3:4:5:6'), '2001:db8:1:2::/64');
ok('een ander adres in hetzelfde blok telt mee', rateIp('2001:db8:1:2::ffff'), '2001:db8:1:2::/64');
ok('een ingekort adres wordt eerst uitgeschreven', rateIp('2001:db8::1'), '2001:db8:0:0::/64');
ok('voorloopnullen tellen niet', rateIp('2001:0db8:0001:0002::'), '2001:db8:1:2::/64');
ok('een zone-aanduiding valt weg', rateIp('fe80::1%eth0'), 'fe80:0:0:0::/64');
ok('onzin blijft onzin (en dus een eigen emmer)', rateIp('unknown'), 'unknown');

console.log('\nde capaciteitsvraag raakt D1 hooguit één keer per minuut per vraag');
{
  const bewaard = new Map();
  globalThis.caches = { default: {
    async match(req) { const r = bewaard.get(req.url); return r ? r.clone() : undefined; },
    async put(req, res) { bewaard.set(req.url, res); },
  } };
  const { viaRandCache } = await import('../src/lib/edgeCache.js');
  const ctx = (u) => ({ request: new Request(u), waitUntil: (p) => p });
  let gemaakt = 0;
  const maak = async () => { gemaakt++; return new Response(`antwoord ${gemaakt}`, { status: 200, headers: { 'cache-control': 'public, max-age=60' } }); };
  const a = await viaRandCache(ctx('https://visuails.com/api/capacity?x=1'), 'capacity', { products: 3, service: 'catalog' }, maak);
  const b = await viaRandCache(ctx('https://visuails.com/api/capacity?x=987'), 'capacity', { service: 'catalog', products: 3 }, maak);
  ok('een extra parameter maakt geen nieuwe vraag', gemaakt, 1);
  ok('en het tweede antwoord is het bewaarde', [await a.text(), await b.text()], ['antwoord 1', 'antwoord 1']);
  await viaRandCache(ctx('https://visuails.com/'), 'capacity', { products: 4, service: 'catalog' }, maak);
  ok('een andere geknipte waarde wel', gemaakt, 2);
  let fout = 0;
  const kapot = async () => { fout++; return new Response('nee', { status: 503 }); };
  await viaRandCache(ctx('https://visuails.com/'), 'x', {}, kapot);
  await viaRandCache(ctx('https://visuails.com/'), 'x', {}, kapot);
  ok('een 503 wordt niet bewaard', fout, 2);

  const { onRequestGet } = await import('../functions/api/capacity.js');
  const r = await onRequestGet({ request: new Request('https://visuails.com/api/capacity?tier=unattended&products=3'), env: {} });
  ok('de wachtrij werkt zonder database', [r.status, (await r.json()).reason], [200, 'queue']);

  /* `from` telt alleen binnen de horizon: anders is elke datum een nieuwe sleutel. */
  const legeDb = { prepare() { const st = { bind() { return st; }, async all() { return { results: [] }; }, async first() { return null; }, async run() { return {}; } }; return st; } };
  const vraag = (q) => onRequestGet({ request: new Request(`https://visuails.com/api/capacity?tier=attended&products=3&service=catalog${q}`), env: { DB: legeDb }, waitUntil: (p) => p });
  bewaard.clear();
  const dag = (n) => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);
  const r1 = await vraag(`&from=${dag(10)}`);
  const r2 = await vraag('&from=2999-01-01');
  const r3 = await vraag('&from=2026-02-31');
  const sleutels = [...bewaard.keys()];
  ok('een datum binnen de horizon krijgt zijn eigen sleutel', sleutels.some((k) => k.includes(`from=${dag(10)}`)), true);
  ok('een datum ver weg en een niet-bestaande datum niet', sleutels.filter((k) => /from=(2999|2026-02-31)/.test(k)).length, 0);
  ok('alle drie gaven gewoon antwoord', [r1.status, r2.status, r3.status], [200, 200, 200]);
  delete globalThis.caches;
}

/* ── De debugroute en een halve /admin-sessie ─────────────────────────────── */
{
  console.log('\nhasAdminSession laat een halve sessie (wachtwoord, nog geen code) niet toe');
  const { hasAdminSession } = await import('../src/lib/admin.js');
  const toekomst = new Date(Date.now() + 3600e3).toISOString();
  const nu = new Date().toISOString();
  const metRij = (rij) => ({ env: { DB: { prepare() { const st = { bind() { return st; }, async first() { return rij; } }; return st; } } },
    request: new Request('https://visuails.com/admin/debug', { headers: { cookie: 'vis_admin=abc123' } }) });
  ok('halve sessie → nee', await hasAdminSession(metRij({ expires_at: toekomst, issued_at: nu, last_used_at: nu, totp_pending: 1 })), false);
  ok('volle sessie → ja', await hasAdminSession(metRij({ expires_at: toekomst, issued_at: nu, last_used_at: nu, totp_pending: 0 })), true);
}

console.log(`\n${goed}/${totaal} geslaagd`);
if (goed !== totaal) process.exit(1);
