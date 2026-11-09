/* VISUAILS — posterkleur in het klein: de plekken die hun stukje niet al bij het bouwen kregen (levering 89).
   ═══════════════════════════════════════════════════════════════════════════════════════════════════════
   Zie src/styles/posterkleur.css en src/data/stukken.js. Bestellen bovenin (E3), het gezicht in Studio (E4), de
   status "geleverd" (E5), het balkje (E6), de 404 en het venster in het logo (E7) krijgen hun stukje al in de
   HTML: daar knippert niets. Dit script doet de rest, en alles is te zien zonder: zonder script blijft het slot
   de nacht uit levering 86 en blijft een lege fotoplek zijn eigen grijs.

   E1  de lege fotoplek: een stukje op het beeld zelf zodra het in de buurt van het scherm komt en nog niet
       geladen is; weg zodra het beeld er is (of niet komt). Buren krijgen nooit hetzelfde stukje: wat links
       ernaast of erboven ligt, telt mee.
   E2 en B4 (het slot onderaan en het €1-blok) VERVALLEN 9 november 2026: daar staat sinds lijst 86 een vaste,
   bewogen foto (src/styles/fotoblok.css), en geen stukje meer.
   Vast per pagina: de sleutel is het pad, het soort plek en het nummer. Hoogstens drie stukjes tegelijk op een
   pagina buiten de grote plekken (HOOGSTENS): wat al in de HTML staat telt mee, de fotoplek niet. */
import { kies, pkKlasse } from '../data/stukken.js';

const FOTOPLEKKEN = [
  '.g8-tegel img:not(.g8-veeg)',          // de galerij op de voorpagina
  '.h-gl-duim img', '.h-gl-raster img',   // /gallery
  '.h-lk-held-beeld img', '.h-lk-beeld img', '.h-lk-raster img', // de looks
].join(', ');

let io = null;
function pad() { return location.pathname.replace(/\/$/, '') || '/'; }
function zetStuk(el, naam) { if (!naam) return; for (const k of pkKlasse(naam).split(' ')) el.classList.add(k); el.dataset.pk = naam; }
function haalWeg(img) {
  img.classList.remove('pk-fp', 'pk', `pk-${img.dataset.pk || ''}`);
  delete img.dataset.pk;
}

/* buren: wat al een stukje heeft en direct links ervan of erboven ligt (binnen 24 px) */
function buren(el, gezet) {
  const r = el.getBoundingClientRect(), uit = [];
  for (const [ander, naam] of gezet) {
    const q = ander.getBoundingClientRect();
    const naastLinks = Math.abs(q.right - r.left) < 24 && q.bottom > r.top + 4 && q.top < r.bottom - 4;
    const erboven = Math.abs(q.bottom - r.top) < 24 && q.right > r.left + 4 && q.left < r.right - 4;
    const zelfde = Math.abs(q.left - r.left) < 2 && Math.abs(q.top - r.top) < 2;
    if (naastLinks || erboven || zelfde) uit.push(naam);
  }
  return uit;
}

function fotoplekken() {
  io?.disconnect();
  const plekken = [...document.querySelectorAll(FOTOPLEKKEN)];
  if (!plekken.length) return;
  const gezet = [];
  const nummer = new Map(plekken.map((img, i) => [img, i]));
  io = new IntersectionObserver((rij) => {
    for (const e of rij) {
      if (!e.isIntersecting) continue;
      const img = e.target; io.unobserve(img);
      if (img.dataset.pk || (img.complete && img.naturalWidth > 0)) continue;
      const naam = kies('fp', `${pad()}:fp:${nummer.get(img)}`, buren(img, gezet));
      zetStuk(img, naam); img.classList.add('pk-fp'); gezet.push([img, naam]);
      const klaar = () => { haalWeg(img); const j = gezet.findIndex(([a]) => a === img); if (j >= 0) gezet.splice(j, 1); };
      img.addEventListener('load', klaar, { once: true });
      img.addEventListener('error', klaar, { once: true });
    }
  }, { rootMargin: '400px 0px' });
  for (const img of plekken) io.observe(img);
}

/* astro:page-load komt ook bij de eerste keer laden: niet twee keer beginnen (zie HalPoster89) */
function start() {
  if (document.body.dataset.pkKlaar) return;
  document.body.dataset.pkKlaar = '1';
  fotoplekken();
}
start();
document.addEventListener('astro:page-load', start);
document.addEventListener('astro:before-swap', () => { io?.disconnect(); io = null; });
