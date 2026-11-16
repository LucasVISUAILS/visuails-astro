/**
 * VISUAILS — op maat: het gedeelde deel van de intake (lijst 107, 14 november 2026).
 * Op een echte database (node:sqlite, schema.sql): het merkprofiel, een concept opslaan en later verder, de versie
 * die een ouder tabblad tegenhoudt, versturen zonder te betalen, het concept-bord met akkoord en datum, en
 * referenties alleen onder de eigen sleutel.
 *   node tests/op-maat.test.mjs
 */
import { readFileSync } from 'node:fs';
import { d1, verseDb, telling } from './lib/d1sqlite.mjs';
import {
  normaliseerMerk, normaliseerInhoud, ontbreekt, merkVan, bewaarMerk, nieuweAanvraag, aanvragenVan, bewaarConcept, verstuur,
  zetStand, besluit, besluitenVan, voegReferentieToe, referentiesVan, referentieSleutel, verwijderConcept, REF_MAX,
} from '../src/lib/opMaat.js';
import { DIENSTEN, BUITEN_VRAGEN, SOORTEN, STAND_GROEPEN } from '../src/data/opMaat.js';
import { onRequestGet, onRequestPost } from '../src/lib/opMaatApi.js';
import { mintToken, hashToken } from '../src/lib/token.js';
const SESSION_COOKIE = 'vis_account';   /* src/lib/account.js */

let pass = 0, fail = 0;
const ok = (naam, v, extra = '') => { if (v) { pass++; console.log(` ok   ${naam}`); } else { fail++; console.log(` FAIL ${naam} ${extra}`); } };
const lees = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');

const { db, mislukt } = verseDb(new URL('../schema.sql', import.meta.url));
ok('schema.sql laadt met de tabellen van 0071', !mislukt?.length && telling(db, "SELECT COUNT(*) AS n FROM sqlite_master WHERE name IN ('merkprofielen','maat_aanvragen','maat_referenties','maat_besluiten')") === 4, JSON.stringify(mislukt));
db.exec("INSERT INTO customers (id, email, name, brand, country) VALUES (1, 'a@example.test', 'Test', 'Merk A', 'NL'), (2, 'b@example.test', 'Test B', 'Merk B', 'NL')");
const verwijderd = [];
const env = { DB: d1(db), UPLOADS: { delete: async (k) => { verwijderd.push(...[].concat(k)); } } };

console.log('\n1 · normaliseren: alleen wat src/data/opMaat.js kent');
const merk = normaliseerMerk({ naam: '  NON/STD ', woorden: ['rauw', 'stil', 'eerlijk', 'te veel'], kleuren: ['#090d0b', 'rood', '#3DFFB0'], prijsklasse: 'goedkoop', vreemd: 'x' });
ok('merk: getrimd, drie woorden, alleen hex, onbekende keuze en vreemde velden weg', merk.naam === 'NON/STD' && merk.woorden.length === 3 && merk.kleuren.join() === '#090D0B,#3DFFB0' && !('prijsklasse' in merk) && !('vreemd' in merk), JSON.stringify(merk));
/* Lijst 113: een eigen stand is draai en kantel samen; het licht hoort er niet meer bij (dat is de omgeving). */
const cat = normaliseerInhoud('catalog', {
  soorten: [{ soort: 'schoen', voorkant: { yaw: 270, pitch: 200, licht: 'links', camera: 'laag', lig: '1', tekst: ' punt naar rechts ' } }, { soort: 'tshirt', voorkant: { legwijze: 'plat-netjes', yaw: 10 } }, { soort: 'anders', voorkant: { yaw: 5, pitch: 5 } }, { soort: 'raket' }],
  standen: { shoes: { hoek: 'van-boven', tekst: 'netjes' }, top: { hoek: 'maan' }, eyewear: { hoek: 'voorkant' } },
  buiten: { durven: 'iets', hack: 'x' },
});
ok('catalog: een eigen stand binnen de grenzen, de draai tussen -180 en 180, zonder licht', JSON.stringify(cat.soorten[0].voorkant) === JSON.stringify({ yaw: -90, pitch: 90, lig: true, tekst: 'punt naar rechts' }), JSON.stringify(cat.soorten[0]));
/* Lucas, 15 november 17:12: het model is de referentie voor de voorkant; de achterkant is al de tweede foto. */
{
  const v = normaliseerInhoud('catalog', { soorten: [{ soort: 'tshirt', voorkant: { yaw: 170, pitch: 0 } }, { soort: 'tas', voorkant: { yaw: 170, pitch: 0 } }] });
  ok('alleen een voorkant: een T-shirt draait niet verder dan de zijkant, een tas wel', [v.soorten[0].voorkant.yaw, v.soorten[1].voorkant.yaw], [100, 170]);
  ok('geen achterkant als hoek, behalve bij accessoires', STAND_GROEPEN.filter((g) => [...g.hoeken, ...g.plat].some((h) => Math.abs(h.yaw) > 100)).map((g) => g.id), ['accessoires']);
  ok('elke groep heeft beide looks, met de standaard voorop', STAND_GROEPEN.every((g) => g.hoeken.length >= 3 && g.plat.length === 4 && g.plat[0].id === 'recht'));
}
ok('catalog: een halve stand (geen kantel) valt weg, de oude legwijze ook', !('voorkant' in cat.soorten[1]), JSON.stringify(cat.soorten[1]));
ok('catalog: "iets anders" heeft geen 3D-model, dus geen eigen stand', !('voorkant' in cat.soorten[2]));
ok('catalog: een onbekende soort valt weg', cat.soorten.length === 3);
ok('catalog: zonder keuze de look ghost mannequin, en alleen een bekende look', cat.standLook === 'ghost' && normaliseerInhoud('catalog', { standLook: 'flatlay' }).standLook === 'flatlay' && normaliseerInhoud('catalog', { standLook: 'hanger' }).standLook === 'ghost');
ok('catalog: flat lay heeft zijn eigen hoeken', JSON.stringify(normaliseerInhoud('catalog', { soorten: [{ soort: 'tshirt' }], standLook: 'flatlay', standen: { top: { hoek: 'diagonaal' } } }).standen) === JSON.stringify({ top: { hoek: 'diagonaal' } }) && !normaliseerInhoud('catalog', { soorten: [{ soort: 'tshirt' }], standLook: 'flatlay', standen: { top: { hoek: 'zijkant' } } }).standen?.top);
ok('catalog: de stand per groep, alleen een bekende hoek en alleen voor zijn eigen groepen', JSON.stringify(cat.standen) === JSON.stringify({ shoes: { hoek: 'van-boven', tekst: 'netjes' } }), JSON.stringify(cat.standen));
ok('buiten de lijntjes: alleen de bekende vragen', cat.buiten.durven === 'iets' && !('hack' in cat.buiten));
/* Lijst 110 (15 november 2026): meer shots kunnen, elk met één camerabeweging; een shot duurt hoogstens 15 seconden. */
const vid = normaliseerInhoud('video', { shots: Array.from({ length: 20 }, () => ({ soort: 'logo', duur: 99, beweging: 'orbit' })), materiaal: 'wol', seconden: 3, personen: 5, geluid: 'eigen-muziek' });
ok('video: hoogstens twaalf shots, een shot hoogstens 15 seconden, met zijn beweging', vid.shots.length === 12 && vid.shots.every((s) => s.duur === 15 && s.beweging === 'orbit'));
ok('video: minstens 8 seconden, hoogstens twee personen, en geen geluid meer', vid.seconden === 8 && vid.personen === 2 && !('geluid' in vid));
const hk = normaliseerInhoud('hooks', { idee: 'ons', vragen: { doelgroep: 'studenten', hack: 'x' }, storyboard: [{ zin: 'x' }], geluid: 'eigen-muziek', personen: 4, effecten: 9, tekstOpBeeld: { taal: 'nl', tekst: 'Nu binnen' } });
ok('hooks: het idee met de vragen, geen storyboard of geluid meer, en de extra’s binnen de grenzen',
  hk.idee === 'ons' && hk.vragen.doelgroep === 'studenten' && !('hack' in hk.vragen) && !('storyboard' in hk) && !('geluid' in hk) && hk.personen === 2 && hk.effecten === 3 && hk.tekstOpBeeld.tekst === 'Nu binnen', JSON.stringify(hk));
/* Lijst 112: "alleen selecteren zegt niks". Elke gekozen edit vraagt een zin van de klant; bij catalog de stand en het licht. */
{
  const c = normaliseerInhoud('catalog', { soorten: [{ soort: 'jas', voorkant: { legwijze: 'hanger' } }], licht: { eigen: true }, toelichting: { 'c-pose': 'aan een houten hanger, licht scheef', hack: 'x' }, praktisch: { contact: 'mail' } });
  ok('toelichting: alleen bij bekende edits', c.toelichting['c-pose'] === 'aan een houten hanger, licht scheef' && !('hack' in c.toelichting));
  ok('ontbreekt: het licht is gekozen maar niet uitgelegd', ontbreekt('catalog', c, { naam: 'x' }).join() === 'toelichting.c-licht', ontbreekt('catalog', c, { naam: 'x' }).join());
  const h = normaliseerInhoud('hooks', { idee: 'eigen', eigenIdee: 'de jas valt uit de lucht', kanalen: ['reels'], personen: 1, praktisch: { contact: 'mail' } });
  ok('ontbreekt bij hooks: wie de persoon is, maar niet de stijl zelf (die heeft zijn eigen veld)', ontbreekt('hooks', h, { naam: 'x' }).join() === 'toelichting.h-persoon', ontbreekt('hooks', h, { naam: 'x' }).join());
}
ok('ontbreekt: bij ons idee vragen we de doelgroep, bij zijn eigen idee het idee zelf',
  ontbreekt('hooks', { idee: 'ons', kanalen: ['reels'], praktisch: { contact: 'mail' } }, { naam: 'x' }).includes('vragen.doelgroep')
  && ontbreekt('video', { idee: 'eigen', hoofdproduct: 'jas', materiaal: 'wol', praktisch: { contact: 'mail' } }, { naam: 'x' }).join() === 'eigenIdee,shots');
ok('elke dienst normaliseert een lege aanvraag zonder fout', DIENSTEN.every((d) => typeof normaliseerInhoud(d, null) === 'object'));
let gooit = false; try { normaliseerInhoud('drukwerk', {}); } catch { gooit = true; }
ok('een onbekende dienst gooit', gooit);
ok('de vier vragen buiten de lijntjes hebben elk een voorbeeldantwoord, in beide talen', ['nl', 'en'].every((t) => BUITEN_VRAGEN[t].length === 4 && BUITEN_VRAGEN[t].every((v) => v.vraag && v.voorbeeld)));
/* Lijst 113: een 3D-model voor elke productsoort (behalve "iets anders"), gegroepeerd; de eerste hoek is de standaard. */
ok('de 3D-stap: elke soort een model en een groep, behalve "iets anders"', SOORTEN.filter((s) => !s.model).map((s) => s.id).join() === 'anders' && SOORTEN.every((s) => STAND_GROEPEN.some((g) => g.id === s.groep)));
ok('de groepen in de volgorde van Lucas: headwear, eyewear, top, bottom, socks, shoes (en accessoires)', STAND_GROEPEN.map((g) => g.id).join() === 'headwear,eyewear,top,bottom,socks,shoes,accessoires');
ok('elke groep heeft unieke hoeken met een naam in beide talen, en "wij" is geen hoek', STAND_GROEPEN.every((g) => new Set(g.hoeken.map((h) => h.id)).size === g.hoeken.length && g.hoeken.every((h) => h.naam[0] && h.naam[1] && h.id !== 'wij')));
{
  const m = readFileSync(new URL('../public/js/op-maat-3d.js', import.meta.url), 'utf8');
  ok('het script heeft een model voor elk model uit de lijst', SOORTEN.filter((s) => s.model).every((s) => new RegExp(`\\b${s.model}\\b`).test(m.slice(m.indexOf('const MAKER')))));
  ok('three.js van onszelf, niets van buiten, geen innerHTML', /import\('\/js\/three\.module\.min\.js'\)/.test(m) && !/https?:\/\//.test(m.replace(/\/\*[\s\S]*?\*\//g, '')) && !/innerHTML/.test(m.replace(/\/\*[\s\S]*?\*\//g, '')));
}

console.log('\n2 · het merkprofiel en een concept');
await bewaarMerk(env, 1, { naam: 'NON/STD', site: 'https://example.test' });
ok('het merkprofiel komt terug', (await merkVan(env, 1)).naam === 'NON/STD');
await bewaarMerk(env, 1, { naam: 'NON/STD 2' });
ok('opnieuw opslaan overschrijft (één rij per klant)', (await merkVan(env, 1)).naam === 'NON/STD 2' && telling(db, 'SELECT COUNT(*) AS n FROM merkprofielen') === 1);
const a = await nieuweAanvraag(env, 1, 'catalog', 'nl');
const a2 = await nieuweAanvraag(env, 1, 'catalog', 'nl');
ok('één open concept per dienst: nog eens op maat kiezen gaat verder waar hij was', a.id === a2.id && a.stand === 'concept' && a.versie === 1);
const s1 = await bewaarConcept(env, 1, a.id, { soorten: [{ soort: 'schoen', voorkant: { yaw: -90 } }] }, 1);
ok('tussendoor opslaan hoogt de versie op', s1.ok && s1.aanvraag.versie === 2);
const s2 = await bewaarConcept(env, 1, a.id, { soorten: [] }, 1);
ok('een ouder tabblad overschrijft niets en krijgt de nieuwste terug', !s2.ok && s2.reden === 'versie' && s2.aanvraag.inhoud.soorten.length === 1);
ok('een andere klant ziet de aanvraag niet', !(await bewaarConcept(env, 2, a.id, {}, 2)).ok && (await aanvragenVan(env, 2)).length === 0);

console.log('\n3 · versturen, zonder te betalen');
const v1 = await verstuur(env, 1, a.id);
ok('zonder contactvoorkeur kan hij nog niet versturen, en hoort hij wat er mist', !v1.ok && v1.reden === 'ontbreekt' && v1.ontbreekt.includes('praktisch.contact'), JSON.stringify(v1.ontbreekt));
await bewaarConcept(env, 1, a.id, { soorten: [{ soort: 'schoen', voorkant: { yaw: -90 } }], toelichting: { 'c-pose': 'punt naar links, licht van boven' }, praktisch: { contact: 'mail' } }, 2);
const v2 = await verstuur(env, 1, a.id);
ok('volledig: verstuurd, met datum, zonder betaling', v2.ok && v2.aanvraag.stand === 'verstuurd' && !!v2.aanvraag.verstuurdOp && telling(db, 'SELECT COUNT(*) AS n FROM payments') === 0);
ok('een verstuurde aanvraag kan hij niet meer bewerken', (await bewaarConcept(env, 1, a.id, {}, 3)).reden === 'stand');
ok('ontbreekt: video vraagt het materiaal (v4)', ontbreekt('video', { hoofdproduct: 'jas', shots: [{ soort: 'logo' }], praktisch: { contact: 'mail' } }, { naam: 'x' }).includes('materiaal'));

console.log('\n4 · het concept-bord (g7)');
ok('een besluit kan pas als het concept er staat', (await besluit(env, 1, a.id, 'concept', 'goed')).reden === 'stand');
ok('de studio zet het concept klaar', (await zetStand(env, a.id, 'voorstel')).ok);
ok('de studio kan niet zomaar naar vastgelegd springen', !(await zetStand(env, a.id, 'vastgelegd')).ok);
ok('"aanpassen" zonder notitie gaat niet', (await besluit(env, 1, a.id, 'foto:2', 'aanpassen', '')).reden === 'notitie');
await besluit(env, 1, a.id, 'foto:2', 'aanpassen', 'Iets lager licht');
await besluit(env, 1, a.id, 'concept', 'goed');
const b = await besluitenVan(env, a.id);
ok('elk besluit staat vast met datum, en het hele concept goed = akkoord', b.length === 2 && b.every((x) => x.op) && (await aanvragenVan(env, 1))[0].stand === 'akkoord');
ok('een vreemd onderwerp wordt geweigerd', (await besluit(env, 1, a.id, 'drop table', 'goed')).reden !== undefined);

console.log('\n5 · referenties (g2)');
const c = await nieuweAanvraag(env, 1, 'lifestyle', 'nl');
const sleutel = referentieSleutel(1, c.id, 'mood.JPG');
ok('de sleutel staat onder de klant en de aanvraag', sleutel.startsWith(`maat/1/${c.id}/`) && sleutel.endsWith('.jpg'));
ok('een referentie met wat de klant ervan wil', (await voegReferentieToe(env, 1, c.id, { r2Key: sleutel, wat: ['licht', 'onzin'], notitie: 'dit licht' })).ok && (await referentiesVan(env, c.id))[0].wat.join() === 'licht');
ok('een sleutel van iemand anders wordt geweigerd', (await voegReferentieToe(env, 1, c.id, { r2Key: 'maat/2/9/x.jpg' })).reden === 'sleutel');
for (let i = 1; i < REF_MAX; i++) await voegReferentieToe(env, 1, c.id, { r2Key: referentieSleutel(1, c.id, `r${i}.png`) });
ok(`hoogstens ${REF_MAX} referenties`, (await voegReferentieToe(env, 1, c.id, { r2Key: referentieSleutel(1, c.id, 'x.png') })).reden === 'vol');
ok('een concept weggooien ruimt zijn referenties op in R2 en in de database', (await verwijderConcept(env, 1, c.id)).ok && verwijderd.length === REF_MAX && telling(db, 'SELECT COUNT(*) AS n FROM maat_referenties') === 0);
ok('een verstuurde aanvraag kan hij niet weggooien', (await verwijderConcept(env, 1, a.id)).reden === 'stand');

console.log('\n6 · de klant wissen (AVG)');
db.exec('DELETE FROM customers WHERE id = 1');
ok('met de klant gaan zijn merkprofiel, aanvragen en besluiten weg', ['merkprofielen', 'maat_aanvragen', 'maat_besluiten'].every((t) => telling(db, `SELECT COUNT(*) AS n FROM ${t}`) === 0));

const adminSrc = lees('src/lib/admin.js');
ok('het AVG-verzoek in /admin wist de referenties in R2 en de vier tabellen uitdrukkelijk', /FROM maat_referenties r JOIN maat_aanvragen/.test(adminSrc) && ['maat_besluiten', 'maat_referenties', 'maat_aanvragen', 'merkprofielen'].every((t) => adminSrc.includes(`DELETE FROM ${t}`)));

console.log('\n7 · geen bedragen in de intake (lijst 107, q3)');
ok('src/data/opMaat.js en src/lib/opMaat.js noemen geen bedrag', !/€\s?\d|\d+[,.]\d{2}\s?(eur|euro)/i.test(lees('src/data/opMaat.js') + lees('src/lib/opMaat.js')));


console.log('\n8 · de deur: /account/op-maat/api');
{
  const { db: db2 } = verseDb(new URL('../schema.sql', import.meta.url));
  db2.exec("INSERT INTO customers (id, email, name, brand, country) VALUES (7, 'c@example.test', 'C', 'Merk C', 'NL'), (8, 'd@example.test', 'D', 'Merk D', 'NL')");
  const token = mintToken();
  db2.prepare("INSERT INTO account_sessions (customer_id, token_hash, expires_at) VALUES (7, ?, datetime('now', '+7 days'))").run(await hashToken(token));
  const gezet = [];
  const env2 = { DB: d1(db2), UPLOADS: { put: async (k) => { gezet.push(k); }, delete: async () => {} } };
  const kop = (extra = {}) => ({ Cookie: `${SESSION_COOKIE}=${encodeURIComponent(token)}`, 'Sec-Fetch-Site': 'same-origin', ...extra });
  const post = (body) => onRequestPost({ request: new Request('https://visuails.com/account/op-maat/api', { method: 'POST', headers: kop({ 'content-type': 'application/json' }), body: JSON.stringify(body) }), env: env2 });
  const zonder = await onRequestPost({ request: new Request('https://visuails.com/account/op-maat/api', { method: 'POST', headers: { 'content-type': 'application/json', 'Sec-Fetch-Site': 'same-origin' }, body: '{"doe":"begin","dienst":"catalog"}' }), env: env2 });
  ok('zonder inloggen: 401', zonder.status === 401);
  const vreemd = await onRequestPost({ request: new Request('https://visuails.com/account/op-maat/api', { method: 'POST', headers: kop({ 'Sec-Fetch-Site': 'cross-site', 'content-type': 'application/json' }), body: '{"doe":"begin","dienst":"catalog"}' }), env: env2 });
  ok('vanaf een andere site: 403', vreemd.status === 403);
  const b1 = await (await post({ doe: 'begin', dienst: 'hooks' })).json();
  ok('beginnen geeft een concept', b1.ok && b1.aanvraag.stand === 'concept' && b1.aanvraag.dienst === 'hooks');
  ok('een onbekende dienst: 400', (await post({ doe: 'begin', dienst: 'drukwerk' })).status === 400);
  const o1 = await post({ doe: 'opslaan', id: b1.aanvraag.id, inhoud: { kanalen: ['reels'] }, versie: 1 });
  const o2 = await post({ doe: 'opslaan', id: b1.aanvraag.id, inhoud: { kanalen: ['tiktok'] }, versie: 1 });
  ok('opslaan, en een ouder tabblad krijgt 409 met de nieuwste', o1.status === 200 && o2.status === 409 && (await o2.json()).aanvraag.inhoud.kanalen[0] === 'reels');
  const v = await post({ doe: 'verstuur', id: b1.aanvraag.id });
  ok('versturen met wat er ontbreekt: 422 en de lijst', v.status === 422 && (await v.json()).ontbreekt.includes('merk.naam'));
  const g = await onRequestGet({ request: new Request(`https://visuails.com/account/op-maat/api?id=${b1.aanvraag.id}`, { headers: kop() }), env: env2 });
  const gj = await g.json();
  ok('ophalen geeft de aanvraag, het merk en wat er ontbreekt, zonder R2-sleutels', gj.ok && Array.isArray(gj.ontbreekt) && !JSON.stringify(gj).includes('r2Key'));
  db2.prepare("INSERT INTO maat_aanvragen (id, customer_id, dienst) VALUES (99, 8, 'video')").run();
  ok('een aanvraag van een ander: 404', (await onRequestGet({ request: new Request('https://visuails.com/account/op-maat/api?id=99', { headers: kop() }), env: env2 })).status === 404);
  const fd = new FormData(); fd.set('id', String(b1.aanvraag.id)); fd.set('bestand', new File([new Uint8Array(10)], 'ref.png', { type: 'image/png' })); fd.append('wat', 'licht');
  const up = await onRequestPost({ request: new Request('https://visuails.com/account/op-maat/api', { method: 'POST', headers: kop(), body: fd }), env: env2 });
  ok('een referentie uploaden: in R2 onder maat/<klant>/<aanvraag>/', up.status === 200 && gezet[0].startsWith(`maat/7/${b1.aanvraag.id}/`));
  const fd2 = new FormData(); fd2.set('id', String(b1.aanvraag.id)); fd2.set('bestand', new File(['x'], 'x.exe', { type: 'application/x-msdownload' }));
  ok('een ander soort bestand: 415', (await onRequestPost({ request: new Request('https://visuails.com/account/op-maat/api', { method: 'POST', headers: kop(), body: fd2 }), env: env2 })).status === 415);
}

ok('de deur staat onder /account (de sessiecookie is Path=/account), via de vangroute en niet onder /api', (() => { const a = lees('src/lib/account.js'); if (!/path === '\/account\/op-maat\/api'\) return \(await import\('\.\/opMaatApi\.js'\)\)\.onRequestGet/.test(a) || !/onRequestPost\(context\)/.test(a)) return false; try { lees('src/pages/api/op-maat.js'); return false; } catch { return /COOKIE_FLAGS = `Path=\/account;/.test(a); } })());
console.log(`\n${pass} goed, ${fail} fout`);
process.exit(fail ? 1 : 0);
