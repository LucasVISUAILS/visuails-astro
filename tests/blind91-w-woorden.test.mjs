/* VISUAILS — ronde 91, w7 (lijst 85, B3 = goed): één woord per ding, aan de /admin-kant.
 *   node tests/blind91-w-woorden.test.mjs        (geen server, geen browser)
 *
 *   · "proef" is alleen nog de €1-proef; een bestelling met een Mollie-testsleutel heet "test" (de pil op de
 *     dashboardrij en op de bestelpagina, "Verberg N testbestellingen", Diagnose). De factuurreeks PROEF- blijft.
 *   · leveren heet de eerste keer "Leveren en klant mailen", daarna "N nieuwe beelden sturen"; "melden",
 *     "aankondigen" en "op de hoogte brengen" staan niet meer op het scherm;
 *   · één werkwoord voor een datum: "verzetten" (niet verlengen, verplaatsen of vastzetten);
 *   · menu en pagina zeggen allebei "Btw-controle" en "€1-proef open of dicht".
 * Gelezen wordt de ZICHTBARE tekst (zonder tags en zonder <!-- -->-noten). Verzonnen merken en adressen.
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
db.exec(`
  INSERT INTO customers (id, email, name, brand, phone, country) VALUES (1, 'sanne@voorbeeld-volt.test', 'Sanne Voorbeeld', 'VOLT', '06 12345678', 'NL');
  INSERT INTO orders (id, ref, customer_id, service, status, name, brand, email, total_cents, vat_cents, lang, product_count, payment_status, country, created_at, paid_at, delivery_mailed_at, delivered_at, testmodus, tier, window_start, window_end) VALUES
    (71, 'VIS-WO-0071', 1, 'catalog', 'in_production', 'Sanne Voorbeeld', 'VOLT', 'sanne@voorbeeld-volt.test', 10000, 2100, 'nl', 1, 'paid', 'NL', datetime('now','-2 days'), datetime('now','-2 days'), NULL, NULL, 1, 'unattended', NULL, NULL),
    (72, 'VIS-WO-0072', 1, 'catalog', 'delivered',     'Sanne Voorbeeld', 'VOLT', 'sanne@voorbeeld-volt.test', 10000, 2100, 'nl', 1, 'paid', 'NL', datetime('now','-6 days'), datetime('now','-6 days'), datetime('now','-3 days'), datetime('now','-3 days'), 0, 'unattended', NULL, NULL),
    (73, 'VIS-WO-0073', 1, 'catalog', 'received',      'Sanne Voorbeeld', 'VOLT', 'sanne@voorbeeld-volt.test', 10000, 2100, 'nl', 12, 'paid', 'NL', datetime('now','-1 days'), datetime('now','-1 days'), NULL, NULL, 0, 'attended', date('now','+5 days'), date('now','+6 days'));
  INSERT INTO files (id, order_id, kind, r2_key, filename, product_key, shot, review_state, announced_at, created_at) VALUES
    (710, 71, 'delivery', 'lever/71/a.jpg', 'a.jpg', 'p1', 'front', 'pending', NULL, datetime('now','-2 hours')),
    (720, 72, 'delivery', 'lever/72/a.jpg', 'a.jpg', 'p1', 'front', 'approved', datetime('now','-3 days'), datetime('now','-3 days')),
    (721, 72, 'delivery', 'lever/72/b.jpg', 'b.jpg', 'p1', 'back',  'pending', NULL, datetime('now','-2 hours')),
    (722, 72, 'delivery', 'lever/72/c.jpg', 'c.jpg', 'p1', 'side',  'pending', NULL, datetime('now','-1 hours'));
`);
const get = async (pad) => {
  const res = await adminGet({ request: new Request(`https://visuails.com${pad}`, { headers: { cookie: `vis_admin=${token}` } }), env, waitUntil() {} });
  return { status: res.status, html: await res.text() };
};
/* De zichtbare tekst: zonder noten, scripts, stijl en tags, met de waarde van knoppen en titels erbij. */
const zichtbaar = (h) => h.replace(/<!--[\s\S]*?-->/g, ' ').replace(/<(script|style)[\s\S]*?<\/\1>/g, ' ')
  .replace(/<[^>]+>/g, ' ').replace(/&[a-z]+;/g, ' ').replace(/\s+/g, ' ');
const OUDE_LEVERWOORDEN = /\b(melden|meld|gemeld|aankondigen|aangekondigd)\b|op de hoogte brengen|Op geleverd zetten/i;

console.log('\n1 · test en proef');
{
  const { html } = await get('/admin');
  const rij = (/<details class="or" id="order-71">[\s\S]*?<\/summary>/.exec(html) || [''])[0];
  ok('de dashboardrij van een testbestelling draagt de pil "test"', />test<\/span>/.test(rij), true);
  ok('  en nergens meer "proef" in die rij', /proef</i.test(rij), false);
  ok('de opruimknop heet "Verberg 1 testbestelling"', /type="submit">Verberg 1 testbestelling<\/button>/.test(html), true);
  ok('het dashboard zegt nergens "proefbestelling"', /proefbestelling/i.test(zichtbaar(html)), false);
  const b = await get('/admin/orders/71/files');
  ok('de bestelpagina: de pil "Test", niet "Proef · testmodus"', [/<span class="pill is-warn"[^>]*>Test<\/span>/.test(b.html), /Proef · testmodus/.test(b.html)], [true, false]);
  const d = await get('/admin/diagnose');
  ok('Diagnose: "Open testbestellingen" en "Testabonnementen"', [/Open testbestellingen/.test(d.html), /Testabonnementen/.test(d.html)], [true, true]);
  ok('  en geen "proefbestelling(en)" of "proefabonnement" meer in de tekst', /proefbestelling|proefabonnement/i.test(zichtbaar(d.html)), false);
  ok('  de factuurreeks PROEF- heet wel nog zo', /PROEF-/.test(d.html), true);
  const p = await get('/admin/proef');
  ok('de €1-proef heet "€1-proef open of dicht"', /<h1>€1-proef open of dicht<\/h1>/.test(p.html), true);
}

console.log('\n2 · leveren');
{
  const a = await get('/admin/orders/71/files');
  ok('nog nooit geleverd: de knop "Leveren en klant mailen"', /<button class="btn btn-primary btn-sm" data-rol="doorgaan" type="submit">Leveren en klant mailen(?:<svg[^]*?<\/svg>)?<\/button>/.test(a.html), true);  /* knoppensysteem lijst 88/89: klein in /admin, met de pijl */ 
  ok('  het blok heet "Leveren"', /<h2 id="melden">Leveren<\/h2>/.test(a.html), true);
  ok('  geen "melden", "aankondigen" of "op de hoogte brengen" op de pagina', (zichtbaar(a.html).match(OUDE_LEVERWOORDEN) || [null])[0], null);
  const b = await get('/admin/orders/72/files');
  ok('al geleverd, twee nieuwe beelden: "2 nieuwe beelden sturen"', /type="submit">2 nieuwe beelden sturen(?:<svg[^]*?<\/svg>)?<\/button>/.test(b.html), true);  /* knoppensysteem lijst 88/89: met de pijl */ 
  ok('  en ook daar geen oud leverwoord', (zichtbaar(b.html).match(OUDE_LEVERWOORDEN) || [null])[0], null);
  const dash = await get('/admin');
  ok('het dashboard: geen oud leverwoord (filters, rijen, Nu doen)', (zichtbaar(dash.html).match(OUDE_LEVERWOORDEN) || [null])[0], null);
  ok('  de Nu-doen-knop zegt "2 nieuwe beelden sturen"', /<button[^>]*>2 nieuwe beelden sturen(?:<svg[^]*?<\/svg>)?<\/button>/.test(dash.html), true);  /* knoppensysteem lijst 88/89: met de pijl */ 
}

console.log('\n3 · verzetten');
{
  const p = await get('/admin/planning?pak=73');
  ok('de planning: de balk boven het raster zegt "Verzetten"', /<span class="pl-pakbalk-l">Verzetten<\/span>/.test(p.html), true);
  ok('  en nergens "verlengen", "verplaatsen" of "vastzetten"', (zichtbaar(p.html).match(/\b(verlengen|verleng|verplaatsen|vastzetten)\b/i) || [null])[0], null);
  const b = await get('/admin/orders/73/files');
  ok('de bestelpagina: "Verzetten naar" en de knop "Venster verzetten"', /Verzetten naar/.test(b.html) && /type="submit">Venster verzetten(?:<svg[^]*?<\/svg>)?<\/button>/.test(b.html), true);  /* knoppensysteem lijst 88/89: met de pijl */ 
}

console.log(`\n${goed} goed, ${fout} fout`);
process.exit(fout ? 1 : 0);
