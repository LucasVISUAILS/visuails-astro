/*
 * GEHASHTE BESTANDEN EEN JAAR IN DE CACHE — 9 november 2026 (ronde 91, C16)
 *
 * public/_headers zei dat gehashte bestandsnamen "vanzelf lang gecachet" worden. De
 * standaard van Cloudflare (Pages en Workers static assets) is voor elk bestand
 * "public, max-age=0, must-revalidate": elke pagina vroeg al zijn css en scripts
 * onder /_astro/ opnieuw na. Een gehashte naam verandert met zijn inhoud, dus die
 * mag een jaar en immutable. Deze toets houdt vast:
 *   1 · /_astro/* krijgt precies die kop, en geen andere regel zet Cache-Control op
 *       een /_astro/-adres (twee regels worden door Cloudflare samengevoegd);
 *   2 · de vaste namen houden hun regel (admin.css no-cache, /img/* zeven dagen);
 *   3 · de kopregel belooft niet meer wat niet zo is;
 *   4 · is er een build, dan heeft elk bestand onder dist/_astro/ een hash in zijn naam.
 */
import { readFileSync, existsSync, readdirSync } from 'node:fs';

let goed = 0, fout = 0;
const ok = (naam, kreeg, wil = true) => {
  const p = JSON.stringify(kreeg) === JSON.stringify(wil);
  if (p) goed++; else fout++;
  console.log(`${p ? '  ok ' : 'FAIL'}  ${naam}${p ? '' : `    verwacht ${JSON.stringify(wil)} kreeg ${JSON.stringify(kreeg)}`}`);
};
const tekst = readFileSync(new URL('../public/_headers', import.meta.url), 'utf8');
/* De regels zoals Cloudflare ze leest: een pad op de eerste kolom, koppen ingesprongen. */
const regels = [];
for (const r of tekst.split(/\r?\n/)) {
  if (/^\s*#/.test(r) || !r.trim()) continue;
  if (!/^\s/.test(r)) regels.push({ pad: r.trim(), koppen: [] });
  else regels.at(-1)?.koppen.push(r.trim());
}
const past = (pad, url) => new RegExp(`^${pad.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*')}$`).test(url);
const cacheVoor = (url) => regels.filter((g) => past(g.pad, url)).flatMap((g) => g.koppen.filter((k) => /^cache-control:/i.test(k)));

console.log('\nVISUAILS — gehashte bestanden een jaar in de cache (ronde 91, C16)\n');
ok('/_astro/index.CJk3d9.css: één Cache-Control, een jaar en immutable', cacheVoor('/_astro/index.CJk3d9.css'), ['Cache-Control: public, max-age=31536000, immutable']);
ok('/_astro/x.js idem', cacheVoor('/_astro/BrandModelBrief.astro_astro_type_script_index_0_lang.DNgkBBmv.js'), ['Cache-Control: public, max-age=31536000, immutable']);
ok('/admin.css blijft no-cache', cacheVoor('/admin.css'), ['Cache-Control: no-cache']);
ok('/img/hal/x.webp blijft zeven dagen', cacheVoor('/img/hal/x.webp'), ['Cache-Control: public, max-age=604800']);
ok('een pagina (/nl/pricing/) krijgt geen lange cache', cacheVoor('/nl/pricing/'), []);
ok('de beveiligingskoppen op /* staan er nog', regels.find((g) => g.pad === '/*')?.koppen.some((k) => /^Strict-Transport-Security:/.test(k)), true);
ok('de kop zegt niet meer dat Cloudflare gehashte namen vanzelf lang bewaart', /houdt de standaard van Cloudflare\s*\n#\s*Pages: gehashte bestandsnamen mogen en moeten juist lang gecachet/.test(tekst) || /door Cloudflare Pages\s*\n#\s*vanzelf lang gecachet/.test(tekst), false);
const dist = new URL('../dist/_astro/', import.meta.url);
if (existsSync(dist)) {
  const zonder = readdirSync(dist).filter((n) => !/\.[A-Za-z0-9_-]{8}\.[a-z0-9]+$/.test(n));
  ok('elk bestand in dist/_astro/ heeft een hash in zijn naam', zonder.slice(0, 3), []);
} else {
  console.log('  --   geen dist/: de hashcontrole slaat over (draai na `npx astro build`)');
}
console.log(`\n${goed} goed, ${fout} fout`);
process.exit(fout ? 1 : 0);
