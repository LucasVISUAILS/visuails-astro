/*
 * VISUAILS — staat dit beeld er echt, of wordt het een plaatshouder? 8 oktober 2026 (1.02).
 *
 * ALLEEN BIJ DE BUILD, IN NODE. Leest public/img en src/data/oude-beelden.json
 * van schijf, dus niet importeren in iets wat in de Worker draait (admin.js,
 * functions/). /admin/diagnose kijkt daarom met env.ASSETS — zie
 * src/lib/beeldenDiagnose.js.
 *
 * Dezelfde regel als scripts/plaatshouders.mjs, die bij de build een grijs vlak
 * met "FOTO VOLGT" neerzet:
 *   · een naam die nergens in public/img ligt (geen <naam>.webp/png/jpg en geen
 *     <naam>-wNNN.*), of
 *   · een naam uit oude-beelden.json die niet in KLAAR staat (zolang
 *     PLAATSHOUDERS aan staat).
 * Een pagina die wil weten of zo'n vlak er zou komen, vraagt het hier — en laat
 * het blok dan weg in plaats van een grijs vlak te tonen (Lucas, V13 = a).
 *
 * Via process.cwd() en niet via import.meta.url: de pagina's worden bij de build
 * vanuit dist/ uitgevoerd (zie de noot in GalleryPage.astro).
 */
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { PLAATSHOUDERS, KLAAR } from '../data/beeld.js';

const MAP = () => path.join(process.cwd(), 'public', 'img');
let opSchijf = null;
let oud = null;
const schijf = () => (opSchijf ??= new Set(readdirSync(MAP())));
const oudeLijst = () => (oud ??= new Set(JSON.parse(readFileSync(path.join(process.cwd(), 'src', 'data', 'oude-beelden.json'), 'utf8'))));

/** De basisnaam zoals plaatshouders.mjs hem leest: '/img/x-w760.webp' → 'x'. null voor iets anders. */
export function basisnaam(src) {
  const m = String(src || '').match(/^\/img\/([a-z0-9][a-z0-9-]*?)(?:-w\d+|-\d{4})?\.(?:webp|avif|png|jpe?g)$/);
  return m ? m[1] : null;
}

/** Ligt er onder deze basisnaam een bestand in public/img? */
export function bestaat(naam) {
  if (!naam) return false;
  const lijst = schijf();
  if (['webp', 'png', 'jpg', 'jpeg'].some((e) => lijst.has(`${naam}.${e}`))) return true;
  const varianten = new RegExp(`^${naam.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}-w\\d+\\.`);
  for (const f of lijst) if (varianten.test(f)) return true;
  return false;
}

/**
 * Zou dit beeld in de build een plaatshouder worden? Een pad dat geen beeld uit
 * /img is (een svg-icoon, een data-uri, leeg) telt als "geen plaatshouder" — dat
 * raakt de regel niet.
 */
export function isPlaatshouder(src) {
  const naam = basisnaam(src);
  if (!naam) return !src;
  if (!bestaat(naam)) return true;
  return Boolean(PLAATSHOUDERS && oudeLijst().has(naam) && !KLAAR.has(naam));
}

/** Het omgekeerde, voor leesbaarheid in een filter. */
export const isEcht = (src) => !isPlaatshouder(src);

/** De kleinere variant (-w760) als die op schijf ligt, anders het origineel. */
export function kleiner(src, breedte = 760) {
  const naam = basisnaam(src);
  if (!naam) return src;
  return schijf().has(`${naam}-w${breedte}.webp`) ? `/img/${naam}-w${breedte}.webp` : src;
}

/** De echte maat van het bestand achter dit pad, of null. Voor width/height op een <img>. */
export async function beeldMaat(src) {
  const naam = basisnaam(src);
  if (!naam || !bestaat(naam)) return null;
  const bestand = String(src).replace(/^\/img\//, '');
  const kandidaat = schijf().has(bestand) ? bestand : [...schijf()].find((f) => f.startsWith(`${naam}.`));
  if (!kandidaat) return null;
  try {
    const { default: sharp } = await import('sharp');
    const m = await sharp(path.join(MAP(), kandidaat)).metadata();
    return m.width && m.height ? { w: m.width, h: m.height } : null;
  } catch {
    return null;
  }
}

/** Alleen voor de toetsen: vergeet wat er op schijf lag. */
export function _vergeet() { opSchijf = null; oud = null; }
