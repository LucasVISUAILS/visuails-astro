/*
 * ═══════════════════════════════════════════════════════════════════════════
 * WELKE BEELDEN WORDEN NERGENS GENOEMD?  ·  npm run beelden
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * ── WAAROM DIT SCRIPT ER IS EN DE OUDE LIJST WEG KON ───────────────────────
 *
 * ONGEBRUIKTE-BEELDEN-22-AUGUSTUS.txt zei: 62 ongebruikte bestanden. Nagemeten
 * op 30 augustus 2026: dat waren er in werkelijkheid één of twee. Zestig van die
 * tweeënzestig waren `.avif`-bestanden.
 *
 * Dat is geen kleine afwijking maar een gevaarlijke: een AVIF wordt NOOIT bij
 * naam genoemd in de bron. `scripts/avif-naast-webp.mjs` zet hem bij de bouw
 * naast de gelijknamige `.webp` en de pagina krijgt een <picture> met twee
 * bronnen. Wie die lijst had gevolgd en de zestig bestanden had opgeruimd, had
 * de hele AVIF-set gewist — en de site daarmee ruwweg twee keer zo zwaar
 * gemaakt, precies wat de bouwwaarschuwing sinds diezelfde dag roept.
 *
 * Vandaar dat dit een SCRIPT is en geen tekstbestand. Een inventaris van
 * augustus is in september een bewering; dit is een meting die je opnieuw kunt
 * draaien.
 *
 * ── WAT ALS "GEBRUIKT" TELT ────────────────────────────────────────────────
 *
 *   · de bestandsnaam komt ergens in de bron voor;
 *   · of de stam zonder extensie (zo vindt hij `<img src={`${stam}.webp`}>`);
 *   · of de kern zonder `-w380` / `-w760` / `-w960` / `-w1560`, want die
 *     derivaten komen uit een srcset die op de stam is gebouwd.
 *
 * Dat is met opzet RUIM. Een beeld ten onrechte "gebruikt" noemen kost een paar
 * kilobyte; een beeld ten onrechte "ongebruikt" noemen kost een gat op de site,
 * en dat is precies wat de lijst van augustus deed.
 *
 * ── HIJ LEEST DE BRON EN NIET dist/ ────────────────────────────────────────
 *
 * Een beeld dat alleen in een gebouwde pagina staat, staat daar omdat de bron
 * hem noemt. Andersom kan niet. De bron is dus het volledige antwoord, en hij
 * werkt ook zonder verse build.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

/* fileURLToPath en niet `.pathname` — de map heet "Claude (VISUAILS)" met een
   spatie erin, en `.pathname` geeft die als %20 terug plus een schuine streep
   vóór de schijfletter. Dezelfde fout heeft scripts/sitemap-and-404.mjs op
   Lucas' machine al een keer laten omvallen; tests/paths.test.mjs let er sinds
   die dag op, en heeft dit script binnen één minuut gepakt. */
const ROOT = fileURLToPath(new URL('..', import.meta.url));
const lees = (d, uit = []) => {
  for (const e of readdirSync(join(ROOT, d), { withFileTypes: true })) {
    if (e.name === 'node_modules' || e.name.startsWith('.')) continue;
    const p = `${d}/${e.name}`;
    if (e.isDirectory()) lees(p, uit);
    else if (/\.(astro|js|mjs|ts|css|json|html|txt)$/.test(e.name)) uit.push(p);
  }
  return uit;
};
const bronnen = ['src', 'functions', 'scripts', 'cron', 'public'].flatMap((d) => {
  try { return lees(d); } catch { return []; }
});
const tekst = bronnen.map((p) => { try { return readFileSync(join(ROOT, p), 'utf8'); } catch { return ''; } }).join('\n');

const IMG = 'public/img';
const beelden = [];
const loop = (d) => {
  for (const e of readdirSync(join(ROOT, d), { withFileTypes: true })) {
    const p = `${d}/${e.name}`;
    if (e.isDirectory()) loop(p);
    else if (/\.(webp|avif|png|jpg|svg|ico)$/.test(e.name)) beelden.push(p);
  }
};
loop(IMG);

const ongebruikt = [];
for (const p of beelden) {
  const naam = p.split('/').pop();
  const stam = naam.replace(/\.(webp|avif|png|jpg|svg|ico)$/, '');
  /* Een .avif wordt nooit met naam genoemd: de bouwstap zet hem naast de .webp
     (zie scripts/avif-naast-webp.mjs). Hij telt dus als gebruikt zodra zijn
     webp dat is. Zelfde voor de -w380/-w760/-w960/-w1560-derivaten, die uit een
     srcset komen die op de stam is gebouwd. */
  const kern = stam.replace(/-w\d+$/, '');
  const gebruikt = tekst.includes(naam) || tekst.includes(stam) || tekst.includes(kern);
  if (!gebruikt) ongebruikt.push([p, statSync(join(ROOT, p)).size]);
}
ongebruikt.sort((a, b) => a[1] - b[1]);
console.log(`${beelden.length} beelden in public/img, ${ongebruikt.length} nergens genoemd`);
for (const [p, n] of ongebruikt) console.log(`${String(Math.round(n / 1024)).padStart(8)} kB  ${p}`);
console.log(`\ntotaal ongebruikt: ${Math.round(ongebruikt.reduce((a, [, n]) => a + n, 0) / 1024)} kB`);
