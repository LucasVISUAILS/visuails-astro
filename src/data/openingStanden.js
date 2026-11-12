/* VISUAILS — de standen van de laptop in de opening van de voorpagina (levering 75, 25 oktober 2026).
   ═══════════════════════════════════════════════════════════════════════════

   Lucas, 23:35: "de mogelijkheden van de laptop en het wisselen van scherm (zoals het instagram
   voorbeeld mockup) [zijn] verdwenen terwijl ik dit nooit heb aangegeven, ik wil dit terug."

   Dezelfde reeks als de laptop van vóór levering 74 (src/data/halStanden.js, HalLaptop.astro): de
   webshop met de vier catalogbeelden, het Instagram-bericht met de vier lifestylebeelden en de
   clip. Alleen zijn het hier platte schermen (scripts/opening-reeks.mjs fotografeert ze uit
   /laptop-bron/), die de opening per beeld van de video op de hoeken van het scherm zet.

   Een stand zonder schermbeeld valt weg in plaats van leeg te staan (zoals in standenVoor). Het
   telefoonscherm wisselt alleen als een stand een eigen telefoonfoto heeft (…-tel). */
import { alleStanden, standNaam } from './halStanden.js';
import { laptopSlides } from './laptopSlides.js';
import KLIK from './openingKlik.json' with { type: 'json' };
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';

export const SCHERM_MAP = '/img/hal/opening/scherm';
/* de duur van de clip in de videostand (13,958 s: 335 beelden op 24 per seconde) */
export const CLIP_MS = 13958;
const opSchijf = (p) => existsSync(path.join(process.cwd(), 'public', p));

/** [{ naam, set, i, duur, lap, tel }] — lap en tel zonder extensie (.avif en .webp liggen ernaast). */
export function openingStanden(lang) {
  let tel = '/img/hal/opening/scherm-telefoon';
  const uit = [];
  /* levering 94 (Lucas, 07:50: "begin de dia slide op de laptop met de video, daarna catalog en dan lifestyle"), en de
     catalog met de hoodie (laptopSlides.js) */
  const volgorde = ['video', 'catalog', 'lifestyle'];
  const producten = laptopSlides(lang, { product: 'nonstd' }).catalog.producten || [];
  const standen = alleStanden(lang, volgorde, { product: 'nonstd' }).sort((a, b) => volgorde.indexOf(a.set) - volgorde.indexOf(b.set));
  for (const s of standen) {
    const naam = standNaam(lang, s);
    const lap = `${SCHERM_MAP}/${naam}`;
    if (!opSchijf(`${lap}.webp`)) continue;
    if (opSchijf(`${SCHERM_MAP}/${naam}-tel.webp`)) tel = `${SCHERM_MAP}/${naam}-tel`;
    /* levering 94 (lijst 92, Lucas: "De video mag trouwens op de video categorie komen te staan bij de laptop … Knip de video
       echter wel vanaf dat de persoon de kap op zet en de wereld om hem heen veranderd"): de videostand speelt zijn clip
       (12,79 – 26,75 s van de bannervideo, 1600 × 1034, scripts/banner-94.md). De stand duurt zo lang als de clip; het
       schermbeeld is het eerste beeld (de poster). De telefoon toont zijn foto K3 als voorfoto (…-video-0-tel). */
    const clip = s.set === 'video' && opSchijf(`${SCHERM_MAP}/video-clip.mp4`) ? `${SCHERM_MAP}/video-clip.mp4` : '';
    /* levering 94 (08:08 – 08:11): een productpagina weet welk product hij is, heeft de schermen met beeld 2 – 4 groot (…-b1 – b3),
       en de plekken waarop je klikt (openingKlik.json: de beeldjes en de voorgestelde producten, in breukdelen van het scherm) */
    const extra = {};
    if (s.set === 'catalog' && producten[s.i]) {
      extra.product = producten[s.i].naam;
      extra.beelden = [1, 2, 3].map((k) => `${lap}-b${k}`).filter((b) => opSchijf(`${b}.webp`));
      extra.klik = (KLIK[lang === 'nl' ? 'nl' : 'en'] || {})[`catalog-${s.i}`] || [];
    }
    uit.push({ naam, set: s.set, i: s.i, duur: clip ? CLIP_MS : s.duur, lap, tel, mp4: clip, ...extra });
  }
  return uit;
}

/* ── DE VERSIE VAN DE BEELDEN (levering 77, 27 oktober 2026) ──────────────────────────────────────
   Lucas, 15:19: "de verhouding met de animatie [klopt] totaal niet meer". Oorzaak: public/_headers
   laat /img/* zeven dagen in de browser staan, en tussen levering 74 en 75 kregen 117 beelden van
   de video (f/017 – 133.avif) en zes schermen (scherm-*.avif/webp) een andere inhoud onder dezelfde
   naam. Wie de voorpagina al eens zag, kreeg de nieuwe still met de oude video en oude schermen.

   Daarom hangt achter elk beeld van de opening ?v=<teken>: de eerste tien tekens van een sha1 over
   de namen en de inhoud van alle bestanden in public/img/hal/opening/. Verandert er één beeld, dan
   verandert het teken, dus de adressen, dus haalt elke browser (en de rand van Cloudflare) alles
   opnieuw. Verandert er niets, dan blijft het teken gelijk en blijft de cache werken.
   tests/opening-77.test.mjs rekent het na op de gebouwde voorpagina. */
export const OPENING_MAP = path.join('public', 'img', 'hal', 'opening');
/* ── EN DE STILSTAANDE FOTO — 9 november 2026 (ronde 91, C09) ─────────────────────────────────────
   HalOpening80.astro hangt hetzelfde teken ook achter de laptopfoto in public/img/hal/breed/ (en
   tests/letter-77.test.mjs eist dat sinds levering 79), maar de som las alleen opening/. Kreeg de foto
   een andere inhoud zonder dat er in opening/ iets veranderde, dan bleef zijn adres gelijk en kreeg een
   terugkerende bezoeker zeven dagen de oude foto onder de nieuwe video: de mismatch van 27 oktober.
   Nu telt breed/ mee (met de mapnaam ervoor, zodat twee gelijke namen niet samenvallen). */
export const BREED_MAP = path.join('public', 'img', 'hal', 'breed');
let versie = null;
export function openingVersie(map = path.join(process.cwd(), OPENING_MAP), extra = map === path.join(process.cwd(), OPENING_MAP) ? [path.join(process.cwd(), BREED_MAP)] : []) {
  const standaard = map === path.join(process.cwd(), OPENING_MAP) && extra.length === 1 && extra[0] === path.join(process.cwd(), BREED_MAP);
  if (versie && standaard) return versie;
  const h = createHash('sha1');
  const loop = (dir, rel) => {
    for (const naam of readdirSync(dir).sort()) {
      const vol = path.join(dir, naam), r = rel ? `${rel}/${naam}` : naam;
      if (statSync(vol).isDirectory()) loop(vol, r);
      else { h.update(r); h.update('\0'); h.update(readFileSync(vol)); h.update('\0'); }
    }
  };
  loop(map, '');
  for (const dir of extra) if (existsSync(dir)) loop(dir, `${path.basename(dir)}:`);
  const v = h.digest('hex').slice(0, 10);
  if (standaard) versie = v;
  return v;
}
