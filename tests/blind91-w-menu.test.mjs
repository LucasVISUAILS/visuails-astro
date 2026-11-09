/* VISUAILS — ronde 91, w8 (lijst 85, B4 = goed): het menu van /admin van 17 naar 8 ingangen.
 *   node tests/blind91-w-menu.test.mjs        (geen server, geen browser)
 *
 * Vast: Dashboard · Planning · Klanten · Facturen · Maandset (alleen met abonnees). Daaronder twee klapjes,
 * "Instellingen" (Twee stappen, Melding in Studio, Studiobrief — sinds ronde 92 —, €1-proef open of dicht, Diagnose) en "Cijfers en logboek"
 * (Trechter, Berichten, Logboek). Abonnees is een tab op de klantenpagina; Btw-controle, Formaten en
 * Aanbevelingen staan niet meer in het menu, maar de pagina's bestaan nog, met hun naam in de kruimel.
 * Een 404 houdt het menu. Verzonnen merken en adressen.
 */
import { d1, verseDb } from './lib/d1sqlite.mjs';
import { adminGet } from '../src/lib/admin.js';
import { mintToken, hashToken } from '../src/lib/token.js';

let goed = 0, fout = 0;
const ok = (naam, w, v = true) => {
  const p = JSON.stringify(w) === JSON.stringify(v);
  if (p) goed++; else fout++;
  console.log(`${p ? 'ok  ' : 'FAIL'}  ${naam}${p ? '' : `    verwacht ${JSON.stringify(v)} kreeg ${JSON.stringify(w)}`}`);
};

const { db, mislukt } = verseDb(new URL('../schema.sql', import.meta.url));
ok('het schema laadt', mislukt.length, 0);
const env = { DB: d1(db) };
db.exec("INSERT INTO admin_users (id, email, password_hash) VALUES (1, 'studio@voorbeeld.test', 'x')");
const token = await mintToken();
db.prepare("INSERT INTO admin_sessions (id, admin_id, token_hash, expires_at) VALUES (1, 1, ?, '2099-01-01T00:00:00Z')").run(await hashToken(token));
db.exec("INSERT INTO customers (id, email, name, brand, country) VALUES (1, 'sanne@voorbeeld-volt.test', 'Sanne Voorbeeld', 'VOLT', 'NL')");
const get = async (pad) => {
  const res = await adminGet({ request: new Request(`https://visuails.com${pad}`, { headers: { cookie: `vis_admin=${token}` } }), env, waitUntil() {} });
  return { status: res.status, html: await res.text() };
};
const menu = (h) => (/<nav class="bar-nav"[\s\S]*?<\/nav>/.exec(h) || [''])[0];
const ingangen = (m) => {
  /* Bovenste laag: de vaste regels plus de koppen van de klapjes. */
  const vast = (/<div class="adm-groep">([\s\S]*?)<\/div>/.exec(m) || ['', ''])[1];
  return [...vast.matchAll(/class="bar-link[^"]*"[^>]*>([^<]+)</g)].map((x) => x[1])
    .concat([...m.matchAll(/<summary class="bar-link adm-klap-kop">([^<]+)</g)].map((x) => x[1]));
};

console.log('\n1 · de ingangen');
{
  const { status, html } = await get('/admin');
  ok('dashboard laadt', status, 200);
  const m = menu(html);
  ok('zonder abonnees: Dashboard, Planning, Klanten, Facturen en de twee klapjes', ingangen(m),
    ['Dashboard', 'Planning', 'Klanten', 'Facturen', 'Instellingen', 'Cijfers en logboek']);
  ok('  en geen merktekens meer in de HTML', /nav:maandset/.test(html), false);
  /* 9 november 2026 (ronde 92): de Studiobrief kwam erbij, IN dit klapje en niet als vaste plek, zodat de
     bovenste laag en de acht ingangen van w8 blijven staan (zie renderStudiobrief() in admin.js). */
  ok('Instellingen: Twee stappen, Melding in Studio, Studiobrief, €1-proef open of dicht, Diagnose',
    [...(/Instellingen<\/summary>([\s\S]*?)<\/details>/.exec(m) || ['', ''])[1].matchAll(/>([^<]+)<\/a>/g)].map((x) => x[1]),
    ['Twee stappen', 'Melding in Studio', 'Studiobrief', '€1-proef open of dicht', 'Diagnose']);
  ok('Cijfers en logboek: Trechter, Berichten, Logboek',
    [...(/Cijfers en logboek<\/summary>([\s\S]*?)<\/details>/.exec(m) || ['', ''])[1].matchAll(/>([^<]+)<\/a>/g)].map((x) => x[1]),
    ['Trechter', 'Berichten', 'Logboek']);
  ok('Btw-controle, Formaten, Aanbevelingen en Abonnees staan niet in het menu',
    ['/admin/vat', '/admin/formaten', '/admin/testimonials', '/admin/abonnees'].filter((p) => m.includes(`href="${p}"`)), []);
  ok('op het dashboard staan beide klapjes dicht', (m.match(/<details class="adm-klap" open>/g) || []).length, 0);
}
{
  db.exec("INSERT INTO subscriptions (id, customer_id, ref, plan, status, started_at, testmodus) VALUES (1, 1, 'SUB-W-0001', 'studio', 'active', datetime('now','-3 days'), 1)");
  const { html } = await get('/admin');
  ok('met een lopend abonnement (ook een testabonnement) staat de Maandset erbij, als vijfde', ingangen(menu(html)).slice(0, 5),
    ['Dashboard', 'Planning', 'Klanten', 'Facturen', 'Maandset']);
  ok('  hoogstens acht ingangen, met Uitloggen erbij', ingangen(menu(html)).length + 1 <= 8, true);
  db.exec("UPDATE subscriptions SET status = 'cancelled', cancelled_at = datetime('now') WHERE id = 1");
  ok('opgezegd: de Maandset gaat weer uit het menu', /href="\/admin\/maandset"/.test(menu((await get('/admin')).html)), false);
  const set = await get('/admin/maandset');
  ok('maar de pagina bestaat, en daar staat hij aan', [set.status, /aria-current="page">Maandset</.test(set.html)], [200, true]);
}

console.log('\n2 · de pagina\'s buiten het menu');
for (const [pad, kruimel] of [['/admin/vat', 'Btw-controle'], ['/admin/formaten', 'Formaten'], ['/admin/testimonials', 'Aanbevelingen']]) {
  const { status, html } = await get(pad);
  ok(`${pad} bestaat nog (200) en heet in de kruimel "${kruimel}"`, [status, html.includes(`<i aria-hidden="true">/</i><b>${kruimel}</b>`)], [200, true]);
  ok(`  zonder actieve menuregel`, /bar-link is-active/.test(menu(html)), false);
}
{
  const { status, html } = await get('/admin/abonnees');
  ok('/admin/abonnees: 200, kruimel "Abonnees"', [status, html.includes('<b>Abonnees</b>')], [200, true]);
  ok('  Klanten staat aan in het menu (Abonnees is zijn tab)', /<a class="bar-link is-active" href="\/admin\/customers">Klanten<\/a>/.test(menu(html)), true);
  ok('  de tab "Abonnees" is de huidige, "Alle klanten" een link',
    /<span class="fl-chip is-active" aria-current="page">Abonnees<\/span>/.test(html) && /<a class="fl-chip" href="\/admin\/customers">Alle klanten<\/a>/.test(html), true);
  const k = await get('/admin/customers');
  ok('/admin/customers: dezelfde twee tabs, "Alle klanten" aan',
    /<span class="fl-chip is-active" aria-current="page">Alle klanten<\/span>/.test(k.html) && /<a class="fl-chip" href="\/admin\/abonnees">Abonnees<\/a>/.test(k.html), true);
}
{
  const { html } = await get('/admin/diagnose');
  ok('op Diagnose staat het klapje Instellingen open, de ander dicht',
    [/<details class="adm-klap" open>\s*<summary class="bar-link adm-klap-kop">Instellingen/.test(html), /<details class="adm-klap">\s*<summary class="bar-link adm-klap-kop">Cijfers en logboek/.test(html)], [true, true]);
  const p = await get('/admin/proef');
  ok('de €1-proef: menu en kop zeggen hetzelfde', [/aria-current="page">€1-proef open of dicht</.test(p.html), /<h1>€1-proef open of dicht<\/h1>/.test(p.html)], [true, true]);
}

console.log('\n3 · een 404 houdt het menu');
{
  const r = await get('/admin/bestaat-niet');
  ok('onbekend pad: 404 met het menu', [r.status, /<aside class="adm-side">/.test(r.html), /href="\/admin\/planning">Planning</.test(r.html)], [404, true, true]);
  ok('  en de melding', r.html.includes('Niet gevonden.'));
  const b = await get('/admin/orders/9999/files');
  ok('onbekende bestelling: 404 met het menu', [b.status, /<aside class="adm-side">/.test(b.html), b.html.includes('Die bestelling bestaat niet.')], [404, true, true]);
  const k = await get('/admin/customers/9999');
  ok('onbekende klant: 404 met het menu', [k.status, /<aside class="adm-side">/.test(k.html)], [404, true]);
}

console.log(`\n${goed} goed, ${fout} fout`);
process.exit(fout ? 1 : 0);
