/*
 * VISUAILS — SPELLING OVER DE HELE SITE. 22 augustus 2026.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Lucas: *"Ook kijken of alle spelling goed staat inclusief alle sub pages."*
 *
 * Wat dit doet: van elke gebouwde pagina de ZICHTBARE tekst halen, per taal
 * door hunspell halen (nl of en_GB), en wat overblijft naast een eigen
 * woordenlijst leggen. Die lijst staat onderaan dit bestand en bevat wat een
 * woordenboek niet kan weten: merknamen, stijlnamen, vaktermen, en de Engelse
 * woorden die met opzet in de Nederlandse tekst staan (Catalog, Lifestyle,
 * Hooks, Editions — zie de noot bij `drops` in src/i18n/ui.js).
 *
 * WAT ER NIET IN MEEGAAT en waarom:
 *   · alles in <script>, <style>, <code>, <kbd> — dat is geen proza;
 *   · bestandsnamen en URL's, want die horen niet gespeld te zijn;
 *   · bedragen, maten en tijden;
 *   · tekst in de andere taal (een NL-pagina met een Engelse citaatregel).
 *
 * Het is een ZEEF en geen oordeel: alles wat eruit komt moet met de hand
 * bekeken worden. Dat is ook de bedoeling — een woord dat het woordenboek niet
 * kent is meestal goed, en precies daarom is de lijst met uitzonderingen het
 * echte werk.
 */
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { execSync } from 'node:child_process';
import { parse } from 'parse5';

const SKIP = new Set(['script', 'style', 'noscript', 'template', 'svg', 'head', 'code', 'kbd', 'samp']);
const walk = (n, f) => { f(n); for (const c of n.childNodes || []) walk(c, f); };
const attr = (n, naam) => (n.attrs || []).find((a) => a.name === naam)?.value;

function tekstVan(n, out = []) {
  if (n.nodeName === '#text') { out.push(n.value); return out; }
  if (SKIP.has(n.nodeName)) return out;
  if ((n.attrs || []).some((a) => a.name === 'hidden')) return out;
  for (const c of n.childNodes || []) tekstVan(c, out);
  return out;
}

const paden = [];
(function loop(d, rel) {
  for (const e of readdirSync(d, { withFileTypes: true })) {
    if (e.isDirectory()) loop(join(d, e.name), `${rel}${e.name}/`);
    else if (e.name === 'index.html') paden.push([`/${rel}`, join(d, e.name)]);
  }
}('dist', ''));

/* Per taal één grote hoop woorden, met per woord waar hij vandaan komt. */
const perTaal = { nl: new Map(), en: new Map() };
for (const [url, bestand] of paden) {
  const html = readFileSync(bestand, 'utf8');
  const doc = parse(html);
  let taal = 'en';
  walk(doc, (n) => { if (n.nodeName === 'html') taal = (attr(n, 'lang') || 'en').startsWith('nl') ? 'nl' : 'en'; });
  let body = null;
  walk(doc, (n) => { if (n.nodeName === 'body' && !body) body = n; });
  if (!body) continue;
  const stukken = tekstVan(body).join(' ');
  /* Ook de teksten die alleen een schermlezer hoort: alt, aria-label, title. */
  const extra = [];
  walk(body, (n) => {
    for (const naam of ['alt', 'aria-label', 'title']) {
      const v = attr(n, naam);
      if (v && v.length > 1) extra.push(v);
    }
  });
  const alles = stukken + ' ' + extra.join(' ');
  for (const w of alles.split(/[^\p{L}\p{M}'’-]+/u)) {
    const woord = w.replace(/^[-'’]+|[-'’]+$/g, '');
    if (woord.length < 2) continue;
    if (/\d/.test(woord)) continue;
    if (!perTaal[taal].has(woord)) perTaal[taal].set(woord, new Set());
    perTaal[taal].get(woord).add(url);
  }
}

/* ── DE EIGEN WOORDENLIJST ───────────────────────────────────────────────── */
const EIGEN = new Set([
  // merk en product
  'VISUAILS', 'visuails', 'Visuails', 'KVK', 'BTW', 'btw', 'AVG', 'IPTC', 'C2PA', 'VIES',
  'SEPA', 'IBAN', 'Mollie', 'Cloudflare', 'WhatsApp', 'Instagram', 'Facebook', 'Trustpilot',
  'Freepik', 'Adobe', 'Photoshop', 'DaVinci', 'Resolve', 'Astro',
  // diensten en stijlen (blijven in beide talen Engels)
  'Catalog', 'catalog', 'Lifestyle', 'lifestyle', 'Hooks', 'Editions', 'Studio', 'studio',
  'Classic', 'Dunes', 'Flash', 'Glow', 'Phone', 'made', 'Motion', 'Campaign', 'Custom',
  'Starter', 'Brand', 'brand', 'Model', 'model', 'Portal', 'portal',
  // marktplaatsen en kanalen
  'Amazon', 'bol', 'Zalando', 'Shopify', 'About', 'You', 'Marktplaats', 'webshop', 'webshops',
  // technische termen
  'webp', 'WebP', 'jpg', 'JPG', 'png', 'PNG', 'avif', 'AVIF', 'SKU', 'SKU’s', 'SKUs',
  'URL', 'URL’s', 'HTML', 'CSS', 'JavaScript', 'PDF', 'RGB', 'hex', 'sRGB', 'DPI',
  'e-commerce', 'ecommerce', 'online', 'e-mail', 'e-mailadres', 'e-mails',
  // rechtsvormen en juridisch
  'BV', 'NV', 'VOF', 'eenmanszaak', 'AI', 'EU', 'GDPR', 'SCC', 'SCCs', 'DPA',
  // plaatsen
  'Enschede', 'Nederland', 'Netherlands', 'Rotterdam', 'Voorbeeldstraat',
  // namen in voorbeelden
  'Nadia', 'Aaron', 'Ava', 'Elias', 'Lisa', 'Mara', 'Groot', 'VOLT', 'Lucas',
]);

const uit = [];
for (const taal of ['nl', 'en']) {
  const woorden = [...perTaal[taal].keys()].filter((w) => !EIGEN.has(w) && !EIGEN.has(w.toLowerCase()));
  if (!woorden.length) continue;
  writeFileSync(`/tmp/spel-${taal}.txt`, woorden.join('\n'), 'utf8');
  const dict = taal === 'nl' ? 'nl' : 'en_GB';
  let ruw = '';
  try {
    ruw = execSync(`hunspell -d ${dict} -l -i UTF-8 < /tmp/spel-${taal}.txt`, { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });
  } catch (e) { ruw = e.stdout || ''; }
  const fout = [...new Set(ruw.split('\n').map((x) => x.trim()).filter(Boolean))];
  for (const w of fout) {
    /* Een woord dat het ANDERE woordenboek wél kent, is meestal een bewuste
       vreemde term (een Engelse productnaam in een Nederlandse zin). Die
       worden apart gemerkt in plaats van als fout gemeld. */
    let anders = false;
    try {
      const r = execSync(`echo ${JSON.stringify(w)} | hunspell -d ${taal === 'nl' ? 'en_GB' : 'nl'} -l -i UTF-8`, { encoding: 'utf8' });
      anders = r.trim() === '';
    } catch { /* niets */ }
    const bron = perTaal[taal].get(w);
    uit.push({ taal, w, anders, paginas: bron ? [...bron] : [] });
  }
}

uit.sort((a, b) => b.paginas.length - a.paginas.length);
const echt = uit.filter((x) => !x.anders);
const vreemd = uit.filter((x) => x.anders);
console.log(`\nSPELLING — ${paden.length} pagina's\n`);
console.log(`── ONBEKEND IN DE EIGEN TAAL (${echt.length}) ──`);
for (const x of echt) console.log(`  [${x.taal}] ${x.w.padEnd(28)} ${x.paginas.length}× ${x.paginas.slice(0, 3).join(' ')}`);
console.log(`\n── BEKEND IN DE ANDERE TAAL — waarschijnlijk met opzet (${vreemd.length}) ──`);
for (const x of vreemd) console.log(`  [${x.taal}] ${x.w.padEnd(28)} ${x.paginas.length}× ${x.paginas.slice(0, 3).join(' ')}`);
