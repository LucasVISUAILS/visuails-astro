/**
 * VISUAILS — de oude foto's als plaatshouder, in de build. 5 september 2026.
 *
 * Zie src/data/beeld.js voor het waarom en de knop. Wat dit doet, ná de build en
 * VÓÓR avif-naast-webp (die zoekt naar .webp en laat een .svg met rust):
 *
 *   1 · leest elke HTML in dist/ en elke CSS in dist/_astro/;
 *   2 · vindt elke verwijzing naar /img/<naam>[-wNNN].(webp|avif|png|jpg);
 *   3 · staat <naam> in oude-beelden.json en niet in KLAAR, dan wordt de
 *       verwijzing /img/plaatshouder/<naam>.svg, srcset en sizes gaan eraf,
 *       en de svg wordt één keer gemaakt in dist/img/plaatshouder/ — in de
 *       maat van het grootste origineel, met de naam en de maat erin;
 *   4 · ligt er ONDER <naam> HELEMAAL GEEN bestand in public/img (een foto die
 *       nog gemaakt moet worden — de voorpagina van sectie 21 vraagt er
 *       veertien), dan krijgt hij óók een plaatshouder, in de maat die het
 *       <img> met width/height vraagt. Zo staat op de pagina precies welke foto
 *       er nog moet komen en hoe groot, en zodra het bestand er ligt, staat
 *       de foto er — zonder dat hier iets verandert.
 *
 * Een <img data-plaatshouder="donker"> krijgt de donkere variant, voor beeld
 * waar een lichte chip of witte tekst overheen staat.
 *
 * De plaatshouder is bewust saai: lichtgrijs, een haarlijn, het teken op 12%,
 * en drie regels mono. Het is een werkbestand voor Lucas, geen ontwerp.
 */
import { readFile, writeFile, mkdir, readdir, stat } from 'node:fs/promises';
import { join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const MERK_V = 'M 0 16 L 144.25 266.75 L 463.25 813.25 L 662.75 354.75 L 619.25 408.25 L 515.5 546.25 L 264.5 119 A 201.21 201.21 0 0 0 101 15.75 L 0 16 Z';
const MERK_VLAG = 'M 701.75 0 L 543.25 366.25 L 507.25 453.75 L 652 259.25 L 702 338.25 L 701.75 0 Z';
const REF = /\/img\/([a-z0-9][a-z0-9-]*?)(-w\d+|-\d{4})?\.(webp|avif|png|jpe?g)/g;

async function* walk(dir) {
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) yield* walk(p); else yield p;
  }
}

const IMG_MAP = join(ROOT, 'public', 'img');
let bestanden = null;
async function bestaat(naam) {
  bestanden ??= new Set(await readdir(IMG_MAP));
  for (const b of bestanden) if (b === `${naam}.webp` || b === `${naam}.png` || b === `${naam}.jpg` || b === `${naam}.jpeg` || new RegExp(`^${naam}-w\\d+\\.`).test(b)) return true;
  return false;
}

async function maat(naam, gevraagd) {
  // Het grootste origineel dat er ligt: de kale naam, anders de breedste -wNNN.
  // Ligt er niets, dan de maat die de pagina vraagt.
  if (!(await bestaat(naam))) return gevraagd || { width: 1200, height: 1500 };
  const map = IMG_MAP;
  const kandidaten = (await readdir(map)).filter((f) => f.startsWith(naam) && /\.(webp|png|jpe?g)$/.test(f))
    .filter((f) => f === `${naam}.webp` || f === `${naam}.png` || f === `${naam}.jpg` || new RegExp(`^${naam}-w\\d+\\.`).test(f));
  let beste = null;
  for (const f of kandidaten) {
    try {
      const m = await sharp(join(map, f)).metadata();
      if (!beste || (m.width || 0) > beste.width) beste = { width: m.width || 1200, height: m.height || 1500 };
    } catch { /* geen beeld */ }
  }
  return beste || { width: 1200, height: 1500 };
}

function svg(naam, w, h, donker = false) {
  const grond = donker ? '#2A2A2A' : '#F0F0F0', lijn = donker ? '#3A3A3A' : '#C2C2C2', inkt = donker ? '#FFFFFF' : '#0A0A0A';
  const k = Math.min(w, h);
  const mw = Math.round(k * 0.12), mh = Math.round(mw * 813.25 / 702);
  const fs1 = Math.max(14, Math.round(k * 0.028)), fs2 = Math.max(12, Math.round(k * 0.022));
  const cx = w / 2, cy = h / 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
<rect width="${w}" height="${h}" fill="${grond}"/>
<rect x="0.5" y="0.5" width="${w - 1}" height="${h - 1}" fill="none" stroke="${lijn}"/>
<g transform="translate(${cx - mw / 2} ${cy - mh - fs1 * 1.6}) scale(${mw / 702})" fill="${inkt}" opacity=".12"><path d="${MERK_V}"/><path d="${MERK_VLAG}"/></g>
<g font-family="Sometype Mono, ui-monospace, Menlo, monospace" text-anchor="middle" fill="${inkt}">
<text x="${cx}" y="${cy + fs1 * 0.4}" font-size="${fs1}" letter-spacing="${fs1 * 0.08}">FOTO VOLGT</text>
<text x="${cx}" y="${cy + fs1 * 0.4 + fs2 * 1.9}" font-size="${fs2}" opacity=".6">${naam}</text>
<text x="${cx}" y="${cy + fs1 * 0.4 + fs2 * 3.6}" font-size="${fs2}" opacity=".6">${w} × ${h}</text>
</g>
</svg>
`;
}

export default function plaatshouders() {
  return {
    name: 'visuails:plaatshouders',
    hooks: {
      'astro:build:done': async ({ dir, logger }) => {
        const { PLAATSHOUDERS, KLAAR } = await import(new URL('../src/data/beeld.js', import.meta.url).href);
        if (!PLAATSHOUDERS) { logger.info('plaatshouders: uit'); return; }
        const oud = new Set(JSON.parse(await readFile(new URL('../src/data/oude-beelden.json', import.meta.url), 'utf8')));
        const dist = fileURLToPath(dir);
        const uit = join(dist, 'img', 'plaatshouder');
        await mkdir(uit, { recursive: true });
        const gemaakt = new Map();
        /* Wat elke <img> vraagt, per naam — voor beeld dat er nog niet ligt. */
        const gevraagd = new Map();
        const vraag = (html) => {
          for (const tag of html.match(/<img\b[^>]*>/g) || []) {
            const src = tag.match(/\ssrc="\/img\/([a-z0-9][a-z0-9-]*?)(?:-w\d+|-\d{4})?\.(?:webp|avif|png|jpe?g)"/);
            const w = tag.match(/\swidth="(\d+)"/), h = tag.match(/\sheight="(\d+)"/);
            if (src && w && h && !gevraagd.has(src[1])) gevraagd.set(src[1], { width: Number(w[1]), height: Number(h[1]) });
          }
        };
        /* Een foto ONDER tekst — een hero-achtergrond, een fotoband, een
           css-achtergrond — krijgt de donkere plaatshouder, anders staat er
           witte tekst op lichtgrijs zolang de foto er niet is. Herkend aan de
           klasse van de <img> (…-bg, …-scrim, hero) of aan een url() in css. */
        const vervang = async (tekst, css = false) => {
          const namen = new Set();
          if (!css) vraag(tekst);
          /* Welke namen in dít bestand nog niet bestaan — één keer opzoeken. */
          const ontbreekt = new Set();
          for (const m of tekst.matchAll(REF)) if (!oud.has(m[1]) && !(await bestaat(m[1]))) ontbreekt.add(m[1]);
          let out = tekst.replace(REF, (heel, naam) => {
            if (!(ontbreekt.has(naam) || (oud.has(naam) && !KLAAR.has(naam)))) return heel;
            const donker = css;
            namen.add(`${naam}${donker ? '-donker' : ''}`);
            return `/img/plaatshouder/${naam}${donker ? '-donker' : ''}.svg`;
          });
          if (!css) {
            out = out.replace(/<img\b[^>]*>/g, (tag) => {
              if (!tag.includes('/img/plaatshouder/') || !(/class="[^"]*(-bg\b|-scrim\b|hero-bg|-achtergrond)[^"]*"/.test(tag) || /data-hero-img/.test(tag) || /data-plaatshouder="donker"/.test(tag))) return tag;
              return tag.replace(/\/img\/plaatshouder\/([a-z0-9-]+?)\.svg/g, (m, naam) => { namen.add(`${naam}-donker`); return `/img/plaatshouder/${naam}-donker.svg`; });
            });
          }
          for (const naam of namen) {
            if (gemaakt.has(naam)) continue;
            const kaal = naam.replace(/-donker$/, '');
            const m = await maat(kaal, gevraagd.get(kaal));
            await writeFile(join(uit, `${naam}.svg`), svg(kaal, m.width, m.height, naam.endsWith('-donker')));
            gemaakt.set(naam, m);
          }
          return { out, geraakt: namen.size };
        };
        let paginas = 0, verwijzingen = 0;
        for await (const f of walk(dist)) {
          const ext = extname(f);
          if (ext !== '.html' && ext !== '.css') continue;
          const tekst = await readFile(f, 'utf8');
          if (!REF.test(tekst)) { REF.lastIndex = 0; continue; }
          REF.lastIndex = 0;
          let { out, geraakt } = await vervang(tekst, ext === '.css');
          if (ext === '.html') {
            /* Een <img> die nu een svg is, heeft niets aan zijn srcset/sizes met
               de oude varianten; die verwijzen we ook, maar één bron is genoeg. */
            out = out.replace(/<img\b[^>]*>/g, (tag) => tag.includes('/img/plaatshouder/')
              ? tag.replace(/\s(srcset|sizes)="[^"]*"/g, '')
              : tag);
            out = out.replace(/<source\b[^>]*\/img\/plaatshouder\/[^>]*>/g, '');
          }
          if (out !== tekst) { await writeFile(f, out); paginas++; verwijzingen += geraakt; }
        }
        logger.info(`plaatshouders: ${gemaakt.size} beelden vervangen in ${paginas} bestand(en); zie src/data/beeld.js`);
      },
    },
  };
}
