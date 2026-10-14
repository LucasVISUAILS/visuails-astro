/* VISUAILS — "Telefoon of WhatsApp", veilig geframed. 12 oktober 2026 (K6, k-contact = a).
 *
 *   node tests/contact-gerust.test.mjs
 *
 * Lucas: *"Telefoon weet ik niet of dat erbij gezet moet worden omdat ik
 * voornamelijk alleen Nederlandse klanten bel en buitenlandse klanten straks
 * het idee krijgen dat zij ook zomaar gebeld worden, dus dit moet veilig
 * geframed worden want ik zou af en toe Engelse klanten gewoon kunnen bellen."*
 *
 * Wat hier bewaakt wordt:
 *   · op de drie plekken waar een klant zijn voorkeur kiest (stap 3, /start/plan,
 *     /contact) heten de keuzes "E-mail / Telefoon of WhatsApp", uit één bron;
 *   · onder de keuze staat één geruststellende regel die zegt WAAROVER en
 *     WANNEER we bellen of appen — en niets over landen;
 *   · /contact zegt niet meer alleen "WhatsApp" bij zijn keuze of zijn hint.
 * Met een gebouwde dist/ kijkt hij ook in de echte pagina's.
 */
import { readFileSync, existsSync } from 'node:fs';
import { VOORKEUR_COPY, VOORKEUREN } from '../src/data/contactvoorkeur.js';

let pass = 0, fail = 0;
const ok = (naam, v, extra = '') => { if (v) { pass++; console.log(` ok   ${naam}`); } else { fail++; console.log(` FAIL ${naam} ${extra}`); } };
const lees = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');

console.log('\nVISUAILS — contactvoorkeur, veilig geframed\n');

console.log('de bron (src/data/contactvoorkeur.js)');
ok('de waarden blijven email en whatsapp (geen migratie)', JSON.stringify(VOORKEUREN) === '["email","whatsapp"]');
ok('nl: "E-mail" / "Telefoon of WhatsApp"', VOORKEUR_COPY.nl.email === 'E-mail' && VOORKEUR_COPY.nl.whatsapp === 'Telefoon of WhatsApp');
ok('en: "Email" / "Phone or WhatsApp"', VOORKEUR_COPY.en.email === 'Email' && VOORKEUR_COPY.en.whatsapp === 'Phone or WhatsApp');
for (const taal of ['nl', 'en']) {
  const c = VOORKEUR_COPY[taal];
  ok(`${taal}: er is een geruststellende regel`, typeof c.gerust === 'string' && c.gerust.length > 20);
  ok(`${taal}: hij staat vooraan in de noot (stap 3 en /start/plan tonen de noot)`, c.noot.startsWith(c.gerust));
  ok(`${taal}: /contact heeft een eigen variant (een vraag, geen bestelling)`, typeof c.gerustContact === 'string' && c.gerustContact !== c.gerust);
  for (const [k, zin] of [['gerust', c.gerust], ['gerustContact', c.gerustContact]]) {
    ok(`${taal}.${k}: geen belofte over landen`, !/nederland|netherlands|dutch|buitenland|abroad|internation|land\b|countr/i.test(zin), zin);
    ok(`${taal}.${k}: zegt waarover én wanneer`, taal === 'nl' ? /alleen over .+ en alleen als/.test(zin) : /only .+ about .+ and only when/.test(zin), zin);
    ok(`${taal}.${k}: één korte regel (≤ 100 tekens)`, zin.length <= 100, String(zin.length));
  }
  ok(`${taal}: nootZonderNummer noemt de keuze bij zijn naam`, c.nootZonderNummer.includes(c.whatsapp));
}

console.log('\nde formulieren lezen de bron');
const flow = lees('src/components/order/OrderFlow.astro');
const plan = lees('src/components/order/PlanPicker.astro');
const contact = lees('src/components/ContactHal.astro'); // sinds 13 oktober 2026 in de hal
ok('stap 3: de noot uit de bron', /<span class="hint">\{vk\.noot\}<\/span>/.test(flow));
ok('/start/plan: de noot uit de bron', /<small>\{vk\.noot\}<\/small>/.test(plan));
ok('/contact: importeert VOORKEUR_COPY', /import \{ VOORKEUR_COPY \} from '\.\.\/data\/contactvoorkeur\.js'/.test(contact));
ok('/contact: de titels van de keuzes komen uit de bron', /kMail: \[VOORKEUR_COPY\.nl\.email/.test(contact) && /kWa: \[VOORKEUR_COPY\.nl\.whatsapp/.test(contact) && /kMail: \[VOORKEUR_COPY\.en\.email/.test(contact) && /kWa: \[VOORKEUR_COPY\.en\.whatsapp/.test(contact));
ok('/contact: de geruststellende regel onder de keuze', /role="radiogroup" aria-labelledby="preferred-label">[\s\S]*?<\/div>\s*<span class="hint">\{vk\.gerustContact\}<\/span>/.test(contact));
ok('/contact: de telefoonhint zegt niet meer alleen "appje"', !/liever een appje krijgt/.test(contact) && !/reply on WhatsApp\./.test(contact));

const DIST = new URL('../dist/', import.meta.url);
if (!existsSync(new URL('nl/contact/index.html', DIST))) {
  console.log('\n(dist/ ontbreekt: de gebouwde pagina\'s overgeslagen)');
} else {
  console.log('\nde gebouwde pagina\'s');
  const pg = (p) => readFileSync(new URL(`${p}/index.html`, DIST), 'utf8');
  for (const [taal, pre] of [['nl', 'nl/'], ['en', '']]) {
    const c = VOORKEUR_COPY[taal];
    const ct = pg(`${pre}contact`);
    ok(`${taal} /contact: "${c.whatsapp}" als keuze`, new RegExp(`<span class="opt-title"[^>]*>${c.whatsapp}</span>`).test(ct));
    ok(`${taal} /contact: de geruststellende regel`, ct.includes(c.gerustContact));
    for (const p of [`${pre}start/catalog`, `${pre}start/lifestyle`, `${pre}start/plan`]) {
      const h = pg(p);
      ok(`${taal} /${p}: "${c.whatsapp}" als keuze en de regel eronder`, h.includes(`>${c.whatsapp}</span>`) && h.includes(c.gerust));
    }
  }
}

console.log(`\n${pass} ok, ${fail} fout\n`);
process.exit(fail ? 1 : 0);
