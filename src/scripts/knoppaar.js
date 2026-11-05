/**
 * VISUAILS — twee knoppen naast elkaar op de telefoon, als ze passen (levering 55,
 * 17 oktober 2026; afvinklijst 35, v35-telefoon b).
 *
 * Vanaf 901 px breed zijn twee knoppen in .h-acties altijd één vorm met de snede
 * (hal.css, "TWEE KNOPPEN WORDEN ÉÉN VORM"). Smaller stonden ze onder elkaar, los. Nu
 * meet dit script per rij of de knoppen naast elkaar passen, met de smallere maat van
 * de telefoon (klasse h-meet, alleen tijdens het meten). Passen ze, dan krijgt de rij
 * h-passen en zet hal.css ze naast elkaar met de snede; anders blijven ze onder elkaar.
 * Opnieuw gemeten als de rij van breedte verandert (draaien, venster). Geen luisteraar
 * op window (tests/zachte-navigatie): een ResizeObserver op de rij zelf.
 */
const SMAL = '(max-width: 900px)';

/* Levering 77 (27 oktober 2026): op de computer is een paar altijd één vorm, op één regel. In een smal
   vak (een kaart in twee kolommen, de kop naast een beeld) op 901 – 1240 px paste dat soms niet, en
   liep de tweede knop over de rand van zijn vak (tot 164 px op de 404). Dan krijgt de rij h-los: de
   knoppen los, en onder elkaar als ze niet naast elkaar passen (hal.css). Gemeten tegen het vak van
   de ouder, niet tegen de rij zelf: in een raster maakt een te brede rij zijn eigen kolom breder. */
function meetBreed(rij, knoppen) {
  rij.classList.remove('h-los');
  const ouder = rij.parentElement;
  if (!ouder) return;
  const oc = getComputedStyle(ouder);
  const links = rij.getBoundingClientRect().left;
  const ruimte = ouder.getBoundingClientRect().right - parseFloat(oc.paddingRight) - parseFloat(oc.borderRightWidth) - links;
  const nodig = Math.max(...knoppen.map((k) => k.getBoundingClientRect().right)) - links;
  rij.classList.toggle('h-los', nodig > ruimte + 1);
}

function meet(rij) {
  const knoppen = [...rij.children].filter((k) => k.classList.contains('h-knop') && !k.hidden);
  if (knoppen.length >= 2 && !matchMedia(SMAL).matches) { rij.classList.remove('h-passen'); meetBreed(rij, knoppen); return; }
  rij.classList.remove('h-los');
  if (knoppen.length < 2 || !matchMedia(SMAL).matches) { rij.classList.remove('h-passen'); return; }
  rij.classList.remove('h-passen');
  rij.classList.add('h-meet');
  const past = rij.scrollWidth <= rij.clientWidth + 1 && knoppen.every((k) => k.scrollWidth <= k.clientWidth + 1);
  rij.classList.remove('h-meet');
  rij.classList.toggle('h-passen', past);
}

/* LEVERING 86 · LICHT DOOR DE KIER (3 november 2026, lijst 72, K4: goed). Lucas wil het blauwe uur
   vaker in de details. Tussen twee knoppen die één vorm zijn, staat de snede van het logo: een kier
   van 7,6 % van de hoogte. Daar viel de grond door; nu valt de lucht erdoor (blauw uur boven, het licht
   onder). De kier is geen element (hij is wat de twee clip-paths openlaten), dus meet dit script
   per paar waar hij staat en zet de lucht als achtergrond van de rij, alleen in die strook: van de
   snede van de eerste knop tot net voorbij de kier, zo hoog als de knop. Wat in die strook buiten de
   kier valt, ligt onder de twee knoppen. Niet op het inktblok en niet bij een witte of doorzichtige
   knop (blauw op inkt mag niet, en door een doorzichtige knop zou je de strook zien). Opnieuw gemeten
   als een knop of de rij van maat verandert (de letter, een knop die verschijnt of verdwijnt). */
/* De lucht in de kier begint bij blauw uur en niet bij blauw diep: de inktknop links ervan loopt sinds
   levering 86 zelf naar blauw diep (K2), en dan viel de kier bovenaan weg (gemeten: de rechterrand van
   de knop #193D70, blauw diep #1A4279). Van blauw uur naar #2D61A8 blijft hij van boven tot onder zichtbaar. */
const LUCHT = 'linear-gradient(180deg, #25508B 0%, #2D61A8 100%)';
function kier(rij) {
  const knoppen = [...rij.children].filter((k) => k.classList.contains('h-knop') && !k.hidden && k.getClientRects().length);
  const lagen = [];
  const opInkt = rij.closest('.h-lk-slot, .h-proef-woord');
  if (!opInkt) {
    const rr = rij.getBoundingClientRect();
    for (let i = 0; i < knoppen.length - 1; i++) {
      const a = knoppen[i], b = knoppen[i + 1];
      if ([a, b].some((k) => k.classList.contains('h-knop-wit') || k.classList.contains('h-knop-lijnwit'))) continue;
      const cs = getComputedStyle(a);
      if (!cs.clipPath || cs.clipPath === 'none' || getComputedStyle(b).clipPath === 'none') continue;
      const ra = a.getBoundingClientRect(), rb = b.getBoundingClientRect();
      if (Math.abs(ra.top - rb.top) > 1 || rb.left > ra.right) continue;
      const snede = parseFloat(cs.getPropertyValue('--h-snede')) || 36;
      const k = parseFloat(cs.getPropertyValue('--h-kier')) || 4.5;
      /* boven en onder 0,5 px binnen de knop: een achtergrond valt op hele beeldpunten, de rand van een knop
         niet, en dan stak de lucht bovenaan een haarlijn boven het paar uit (gemeten op 4 × zoom) */
      lagen.push([ra.right - rr.left - rij.clientLeft - snede - 1, ra.top - rr.top - rij.clientTop + 0.5, snede + k + 2, ra.height - 1]);
    }
  }
  if (!lagen.length) {
    if (!('hKier' in rij.dataset)) return;
    delete rij.dataset.hKier;
    for (const e of ['background-image', 'background-position', 'background-size']) rij.style.removeProperty(e);
    return;
  }
  rij.dataset.hKier = '';
  rij.style.backgroundImage = lagen.map(() => LUCHT).join(', ');
  rij.style.backgroundPosition = lagen.map(([x, y]) => `${x.toFixed(2)}px ${y.toFixed(2)}px`).join(', ');
  rij.style.backgroundSize = lagen.map(([, , w, h]) => `${w.toFixed(2)}px ${h.toFixed(2)}px`).join(', ');
}

export function knoppenNaastElkaar() {
  const rijen = [...document.querySelectorAll('.hal .h-acties')];
  /* de letter kan later binnenkomen dan de eerste meting: dan nog een keer */
  document.fonts?.ready.then(() => rijen.forEach((rij) => { meet(rij); kier(rij); }));
  for (const rij of rijen) {
    if (rij.dataset.hPaar) continue;
    rij.dataset.hPaar = '1';
    let breed = 0;
    new ResizeObserver((r) => {
      const w = Math.round(r[0].contentRect.width);
      if (w === breed) return;
      breed = w;
      meet(rij);
    }).observe(rij);
    /* de kier: na elke maatverandering van de rij of een knop, één keer per beeld */
    let wacht = 0;
    const ro = new ResizeObserver(() => {
      if (wacht) return;
      wacht = requestAnimationFrame(() => { wacht = 0; kier(rij); });
    });
    ro.observe(rij);
    for (const k of rij.children) if (k.classList.contains('h-knop')) ro.observe(k);
  }
}
