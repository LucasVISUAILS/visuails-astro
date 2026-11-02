/**
 * VISUAILS — de schakelaars glijden (levering 83, 2 november 2026; lijst 68, schakel = a).
 *
 * Lucas (opdracht van 1 november): "soms smooth human dopamine animations/sections/switches". Lijst 68 koos a,
 * de golf: bij een tab of filter glijdt het inktblok naar je keuze, 240 ms op de kleine golf
 * (cubic-bezier(.2, .8, .2, 1), docs/RUST-80.md §5): snel weg, zacht aankomen, geen stuiter.
 *
 * HOE. Boven de rij ligt een kopie waarin álle knoppen de gekozen stand hebben (inkt, witte letter). Die kopie
 * is afgeknipt tot een venster in de vorm van de gekozen knop, en dat venster schuift (clip-path: polygon(), vier punten) naar
 * de nieuwe keuze. Zo blijft elke knop zijn eigen vorm houden (de snede tussen de galerijpillen, de zachte
 * hoek van een tab) en hoeft er niets met lagen gegoocheld te worden: wat in het venster valt, is inkt.
 * In de rij zelf ziet de gekozen knop eruit als de andere (hal.css, "DE SCHAKELAARS"), anders stond de inkt
 * er al voordat het venster aankomt.
 *
 * TWEE SOORTEN VENSTER. Knoppen met de snede ertussen (de galerijpillen, de formaten) krijgen een venster met vier
 * punten in hun eigen vorm; de kier die het blok onderweg doorsnijdt, is de snede van het merk. Rechte knoppen met
 * ruimte ertussen (de FAQ, Leveringen | Alle beelden) krijgen een venster met hun eigen ronde hoeken (inset … round),
 * en de kopie krijgt de kleur van de gekozen knop als grond: zo blijft het blok onderweg één blok en breekt het
 * niet open waar het over de ruimte tussen twee knoppen glijdt (lijst 69: het blok brak in tweeën).
 *
 * De kopie is aria-hidden, inert en niet aan te klikken: schermlezers, de tab-toets en de muis zien alleen de
 * echte knoppen. Bij minder beweging springt het venster (geen overgang). Zonder script: de gewone stand.
 * Geen luisteraar op window (tests/zachte-navigatie): een ResizeObserver op de rij en een MutationObserver
 * op de knoppen.
 */

/** Waar schakelaars staan: de rij, de knoppen erin en het attribuut dat de keuze draagt. */
export const SCHAKELS = [
  { rij: '.h-faq-index', knop: '.h-faq-tab', attr: 'aria-selected' },   // /faq: de tabs (FaqHal.astro)
  { rij: '.h-gl-pillen', knop: '.h-gl-pil', attr: 'aria-pressed' },     // /gallery: dienst en soort (GalleryHal.astro)
  { rij: '.h-fmt-knoppen', knop: '.h-fmt-knop', attr: 'aria-pressed' }, // de formaten (FormatenHal.astro)
  { rij: '.h-gl-wissel', knop: '.h-gl-seg', invoer: true },            // /gallery: Leveringen | Alle beelden (rondjes)
];

const rustig = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

/* Een maat uit een clip-path ("30px", "100%", "calc(100% - 30px)") in px, bij een zijde van s px. */
function maatIn(uitdr, s) {
  const t = uitdr.replace(/calc\(|\)/g, ' ').trim().split(/\s+/);
  let som = 0, teken = 1;
  for (const d of t) {
    if (d === '+') teken = 1; else if (d === '-') teken = -1;
    else { som += teken * (d.endsWith('%') ? (parseFloat(d) / 100) * s : parseFloat(d)); teken = 1; }
  }
  return som;
}
/* De vier hoekpunten van een knop: zijn clip-path (polygon met vier punten) of zijn rechthoek. */
function punten(el, w, h) {
  const cp = getComputedStyle(el).clipPath || '';
  const m = /^polygon\((.*)\)$/.exec(cp.trim());
  if (m) {
    const p = m[1].split(/,(?![^(]*\))/).map((paar) => {
      const delen = paar.trim().match(/calc\([^)]*\)|\S+/g) || [];
      return [maatIn(delen[0], w), maatIn(delen[1], h)];
    });
    if (p.length === 4 && p.every(([x, y]) => Number.isFinite(x) && Number.isFinite(y))) return p;
  }
  return [[0, 0], [w, 0], [w, h], [0, h]];
}

function maak(rij, { knop, attr, invoer }) {
  if (rij.dataset.skKlaar) return;
  const knoppen = () => [...rij.querySelectorAll(knop)].filter((k) => !k.closest('.sk-kopie'));
  /* gekozen: het attribuut is "true", of (bij rondjes) het rondje van dit label is aangevinkt */
  const isAan = (k) => (invoer ? !!(k.htmlFor && document.getElementById(k.htmlFor)?.checked) : k.getAttribute(attr) === 'true');
  /* pas als er een keuze is (de FAQ wordt pas tabs als zijn eigen script draait) */
  if (!knoppen().some(isAan)) return;
  rij.dataset.skKlaar = '1';
  /* de rij draagt de kopie: hal.css maakt hem relative waar hij dat nog niet is (niet inline, want de FAQ is op
     de computer sticky en op de telefoon gewoon) */

  let kopie = null, vul = false;
  const bouw = () => {
    kopie?.remove();
    kopie = rij.cloneNode(true);
    kopie.querySelectorAll('.sk-kopie').forEach((k) => k.remove());
    /* geen invoervelden in de kopie: een gekopieerd rondje met dezelfde naam hoort bij dezelfde groep */
    kopie.querySelectorAll('input, select, textarea').forEach((k) => k.remove());
    kopie.classList.add('sk-kopie');
    kopie.removeAttribute('data-sk-klaar');
    kopie.classList.remove('sk-aan');
    kopie.style.removeProperty('position');
    kopie.setAttribute('aria-hidden', 'true');
    kopie.inert = true;
    /* De kopie draagt geen haakjes: geen id, geen rol, geen aria-pressed/-selected, geen data-*, geen link. Zo
       vindt geen script (en geen toets) de knoppen van de kopie als hij de echte zoekt. De gekozen stand komt
       uit de klasse .sk-k (hal.css). */
    for (const el of [kopie, ...kopie.querySelectorAll('*')]) {
      for (const a of [...el.attributes]) {
        if (a.name === 'id' || a.name === 'role' || a.name === 'href' || a.name === 'for' || a.name.startsWith('aria-') || a.name.startsWith('data-')) el.removeAttribute(a.name);
      }
      el.classList?.remove('h-in', 'is-in');   // de kopie komt niet zelf binnen: hij volgt de rij
      if (el.matches?.(knop)) { el.classList.add('sk-k'); el.tabIndex = -1; }
    }
    kopie.setAttribute('aria-hidden', 'true');
    rij.append(kopie);
    /* rechte knoppen (geen veelhoek): de grond van de kopie in de kleur van de gekozen knop, zie TWEE SOORTEN VENSTER */
    vul = !knoppen().some((k) => /^polygon\(/.test((getComputedStyle(k).clipPath || '').trim()));
    const k = kopie.querySelector('.sk-k');
    kopie.style.backgroundColor = vul && k ? getComputedStyle(k).backgroundColor : '';
  };

  let eerst = true;
  const zet = (direct = false) => {
    const aan = knoppen().find(isAan);
    if (!aan || !kopie) return;
    /* het venster heeft de vorm van de knop zelf, in de maat van de kopie: rechte knoppen een rechthoek met hun
       eigen ronde hoeken, knoppen met de snede hun vier punten; de browser laat beide vloeiend glijden */
    const K = kopie.getBoundingClientRect(), r = aan.getBoundingClientRect();
    const x0 = r.left - K.left, y0 = r.top - K.top;
    kopie.classList.toggle('sk-direct', direct || eerst || rustig());
    if (vul) {
      const s = getComputedStyle(aan);
      const rond = ['borderTopLeftRadius', 'borderTopRightRadius', 'borderBottomRightRadius', 'borderBottomLeftRadius'].map((n) => `${parseFloat(s[n]) || 0}px`).join(' ');
      kopie.style.clipPath = `inset(${y0.toFixed(1)}px ${(K.width - x0 - r.width).toFixed(1)}px ${(K.height - y0 - r.height).toFixed(1)}px ${x0.toFixed(1)}px round ${rond})`;
    } else {
      const vorm = punten(aan, r.width, r.height);
      kopie.style.clipPath = `polygon(${vorm.map(([x, y]) => `${(x0 + x).toFixed(1)}px ${(y0 + y).toFixed(1)}px`).join(', ')})`;
    }
    eerst = false;
  };

  bouw();
  rij.classList.add('sk-aan');
  zet(true);
  new MutationObserver((m) => {
    if (m.some((x) => x.type === 'childList' && [...x.addedNodes, ...x.removedNodes].some((n) => n.nodeType === 1 && !n.classList.contains('sk-kopie')))) { bouw(); zet(true); return; }
    zet();
  }).observe(rij, { attributes: true, attributeFilter: [attr || 'aria-pressed', 'hidden'], subtree: true, childList: true });
  if (invoer) rij.addEventListener('change', () => zet());
  new ResizeObserver(() => { bouw(); zet(true); }).observe(rij);
}

/** Zoek de schakelaars op de pagina en laat ze glijden. Mag vaker draaien (astro:page-load). */
export function schakelaars() {
  for (const s of SCHAKELS) {
    for (const rij of document.querySelectorAll(s.rij)) {
      if (rij.closest('.sk-kopie')) continue;
      maak(rij, s);
      /* nog geen keuze: wacht tot de eerste keuze er is */
      if (!rij.dataset.skKlaar && !rij.dataset.skWacht && s.attr) {
        rij.dataset.skWacht = '1';
        const mo = new MutationObserver(() => { maak(rij, s); if (rij.dataset.skKlaar) mo.disconnect(); });
        mo.observe(rij, { attributes: true, attributeFilter: [s.attr], subtree: true });
      }
    }
  }
}
