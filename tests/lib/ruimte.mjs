/*
 * VISUAILS — DE RUIMTEMETING, ALS ÉÉN REGEL
 * 12 september 2026
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Lucas, twee keer in dezelfde opdracht: *"Controleer ook altijd of overal
 * genoeg ruimte tussen zit, de knoppen in de dashboards en teksten willen nog
 * soms op elkaar staan waardoor het ook onoverzichtelijk word."*
 *
 * Dit bestand is die regel, en alleen de regel — zodat tests/ruimte.test.mjs en
 * elke verkenning in kladblok/ dezelfde meting doen. Twee kopieën van deze code
 * is twee definities van "te krap", en dan is de toets groen op iets anders dan
 * wat er met de hand gecontroleerd wordt.
 *
 * ── WAAROM DE REGEL ZO SMAL IS, EN DAT MET OPZET ────────────────────────────
 *
 * De eerste versie mat "elk paar naburige elementen" en meldde achttien
 * vondsten per pagina, op élke pagina dezelfde achttien: het mobiele menu. Dat
 * staat gewoon in de DOM, met maat en al, en wat hem onzichtbaar maakt is een
 * transform op een voorouder. Een meting die op elke pagina hetzelfde meldt,
 * meet de sjabloon en niet de pagina — en achttien valse meldingen zijn erger
 * dan geen meting, want dan kijkt niemand meer.
 *
 * Wat er na het aanscherpen overbleef op zes marketingpagina's: twee vondsten,
 * allebei op /start/catalog, allebei tussen twee vouwpanelen die met opzet aan
 * elkaar staan. Dat is de goede orde van grootte voor een controle die je
 * serieus neemt.
 *
 * DRIE INPERKINGEN, elk met een reden:
 *
 *   1 · ALLEEN WAT ER ECHT STAAT. Niet zwevend (`position: absolute/fixed`),
 *       niet verschoven (`transform`), en geen enkele voorouder die het wegzet,
 *       wegklipt of doorzichtig maakt. Een lade die dichtstaat is geen krappe
 *       pagina.
 *
 *   2 · ALLEEN ONDER ELKAAR. Twee elementen die náást elkaar staan hebben geen
 *       verticale afstand die iets betekent; die worden overgeslagen.
 *
 *   3 · "KRAP" GELDT ALLEEN TUSSEN EEN BEDIENDEEL EN TEKST. Twee links met nul
 *       pixels ertussen zijn een menu, geen fout — dat is precies wat een
 *       lijst doet. Een KNOP die tegen een ZIN aan staat is wat Lucas meldde,
 *       en dat is het enige wat hier als krap telt. OVERLAP telt altijd, waar
 *       hij ook zit: twee elementen in de normale stroom horen elkaar nooit te
 *       bedekken.
 */

/** De meting, als tekst, om aan page.evaluate() te geven. */
export const RUIMTE_METING = `(() => {
  const OK_POS = new Set(['static', 'relative']);

  /* Staat dit element er echt, of zet iets het weg? */
  const weggezet = (el) => {
    let n = el;
    while (n && n !== document.body) {
      const s = getComputedStyle(n);
      if (s.display === 'none' || s.visibility === 'hidden') return true;
      if (n !== el && (s.transform !== 'none' || s.clipPath !== 'none')) return true;
      if (n.hasAttribute('hidden') || n.getAttribute('aria-hidden') === 'true') return true;
      if (parseFloat(s.opacity) < 0.9) return true;
      if (s.overflow !== 'visible') {
        const r = n.getBoundingClientRect();
        if (r.width < 2 || r.height < 2) return true;
      }
      n = n.parentElement;
    }
    return false;
  };

  const meetbaar = (el) => {
    const s = getComputedStyle(el);
    if (!OK_POS.has(s.position) || s.transform !== 'none') return false;
    const r = el.getBoundingClientRect();
    if (r.width <= 1 || r.height <= 1) return false;
    if (r.right < -50 || r.left > document.documentElement.scrollWidth + 50) return false;
    return !weggezet(el);
  };

  const naam = (el) => el.tagName.toLowerCase() + (el.className && typeof el.className === 'string'
    ? '.' + el.className.trim().split(/\\s+/).slice(0, 2).join('.') : '');

  const BEDIEND = 'button,input,select,textarea,[role=button],.knop,.btn,a.knop,a.btn';
  const isBediend = (el) => el.matches(BEDIEND) || !!el.querySelector('button,select,textarea,[role=button],.knop,.btn');
  const heeftTekst = (el) => (el.textContent || '').trim().length > 1;

  const vondsten = [];
  for (const ouder of document.querySelectorAll('body *')) {
    const s = getComputedStyle(ouder);
    /* Alleen normale blokstapeling. In een grid of flex kan overlap een keuze
       zijn (twee items op dezelfde grid-area), en die keuze is niet aan deze
       meting. */
    if (s.display !== 'block' && s.display !== 'flow-root' && s.display !== 'list-item') continue;
    const kinderen = [...ouder.children].filter(meetbaar);
    for (let i = 0; i < kinderen.length - 1; i++) {
      const a = kinderen[i], b = kinderen[i + 1];
      const ra = a.getBoundingClientRect(), rb = b.getBoundingClientRect();
      if (rb.left > ra.right - 1 || ra.left > rb.right - 1) continue;
      const gat = Math.round(rb.top - ra.bottom);
      if (gat < -1) { vondsten.push({ soort: 'overlap', gat, a: naam(a), b: naam(b) }); continue; }
      if (gat < 6 && (isBediend(a) !== isBediend(b)) && heeftTekst(a) && heeftTekst(b)) {
        vondsten.push({ soort: 'krap', gat, a: naam(a), b: naam(b) });
      }
    }
  }
  return vondsten;
})()`;

/** Eén regel per vondst, zoals hij in de uitvoer van een toets hoort te staan. */
export function regelVoor(pagina, breedte, v) {
  return `${pagina} @${breedte}  ${v.soort} ${v.gat}px  ${v.a} ↕ ${v.b}`;
}
