// Ronde 9, F67: een vastgezet product in Studio → Planning verzetten gaf een
// foutpagina ná de verzetting (ReferenceError op `context`). Verwacht nu: 303
// naar ?ok=verzet, rij verzet, mail "Week verzet" naar hello@ in het paneel.
import { start, sql, sqlw, SITE } from './_dl.mjs';
const volt = await fetch('http://localhost:4478/').then((r) => r.json()).then((j) => j.volt);
const s = await start({ cookie: volt.token }); const { page } = s;
const post = async (velden) => {
  await Promise.all([page.waitForNavigation(), page.evaluate((v) => { const f = document.createElement('form'); f.method = 'post'; f.action = '/account/plan/queue'; for (const [k, val] of Object.entries(v)) { const i = document.createElement('input'); i.type = 'hidden'; i.name = k; i.value = val; f.appendChild(i); } document.body.appendChild(f); f.requestSubmit(); }, velden)]);
  return { url: page.url(), status: (await page.evaluate(() => document.title)) };
};

await sqlw(`INSERT INTO subscription_slots (subscription_id, month, kind, granted, used, created_at) SELECT id, '2026-10', 'credits', 120, 0, datetime('now') FROM subscriptions WHERE customer_id=${volt.id} AND NOT EXISTS (SELECT 1 FROM subscription_slots WHERE kind='credits' AND subscription_id=subscriptions.id)`).then((r) => console.log('slot:', r));

await page.goto(SITE + '/account/plan?tab=bestellen');
const add = page.locator('form[action="/account/plan/queue"]:has(input[name="do"][value="add"])');
await add.locator('#q-name').fill('Hoodie F67 (TEST)');
await add.locator('#q-type').selectOption('jacket').catch(async () => add.locator('#q-type').selectOption({ index: 3 }));
await add.locator('input[name="fotos_voorkant"]').setInputFiles('/tmp/claude-0/dl/voor.jpg');
await add.locator('input[name="fotos_achterkant"]').setInputFiles('/tmp/claude-0/dl/achter.jpg');
await Promise.all([page.waitForNavigation(), add.locator('button[type="submit"]').last().click()]);
const q = (await sql(`SELECT id, locked_at, window_start, window_end FROM plan_queue WHERE customer_id=${volt.id} ORDER BY id DESC LIMIT 1`))[0];
console.log('toegevoegd:', q);
if (!q.locked_at) {
  const eigenDag = new Date(Date.now() + 6 * 864e5).toISOString().slice(0, 10);
  await Promise.all([page.waitForNavigation(), page.evaluate(({ id, dag }) => { const f = [...document.querySelectorAll('form')].find((f) => f.querySelector('input[name=do][value=lock]') && f.querySelector(`input[name=id][value="${id}"]`)); const i = document.createElement('input'); i.type = 'hidden'; i.name = 'dag'; i.value = dag; f.appendChild(i); f.requestSubmit(); }, { id: q.id, dag: eigenDag })]);
  console.log('na lock:', page.url());
}
const planUit = await post({ do: 'plan', id: String(q.id), dag: new Date(Date.now() + 12 * 864e5).toISOString().slice(0, 10) });
console.log('do=plan:', planUit);
const voor = (await sql(`SELECT window_start, window_end FROM plan_queue WHERE id=${q.id}`))[0];
console.log('venster vóór:', voor);
if (!voor.window_start) { console.log('FAIL: niet vastgezet, kan niet verzetten'); await s.stop(); process.exit(1); }

// Een dag later dan nu (handler eist "vóór de huidige"? nee: alleen ≥ eerste aanbiedbare dag en ruimte).
const d = new Date(voor.window_start + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() - 5);
const nieuw = d.toISOString().slice(0, 10);
const mailsVoor = (await fetch('http://localhost:4478/mails').then((r) => r.json())).length;
const uit = await post({ do: 'verzet', id: String(q.id), dag: nieuw, bevestig: 'ja' });
console.log('POST verzet:', uit);
await page.goto(SITE + '/account/plan?tab=planning');
const na = (await sql(`SELECT window_start, window_end FROM plan_queue WHERE id=${q.id}`))[0];
console.log('venster ná:', na, 'gevraagd:', nieuw);
await new Promise((r) => setTimeout(r, 1500));
const mails = await fetch('http://localhost:4478/mails').then((r) => r.json());
const nieuwe = mails.slice(mailsVoor).map((m) => `${m.to} · ${m.subject}`);
console.log('nieuwe mails:', nieuwe);
const goed = na.window_start === nieuw && /ok=verzet/.test(uit.url) && nieuwe.some((m) => /verzet|naar voren/i.test(m));
console.log(goed ? 'KLAAR F67 ok' : 'FAIL F67');
await s.stop();
