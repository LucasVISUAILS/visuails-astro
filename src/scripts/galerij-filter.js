/* ═══════════════════════════════════════════════════════════════════════════════
 * DE FILTERBALK VAN DE GALERIJ — ZONDER GSAP
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * ── WAAROM DIT BESTAAT ──────────────────────────────────────────────────────
 *
 * Deze code stond twee keer als <script> in de pagina: één keer in
 * src/pages/gallery.astro en één keer, woord voor woord gelijk, in
 * src/pages/nl/gallery.astro. Allebei begonnen ze met `import gsap from 'gsap'`.
 *
 * Gemeten aan de build: dat is één bestand van 68 kB (index.xgxdCp6f.js, de hele
 * GSAP-kern) dat op /gallery en /nl/gallery wordt gehaald. Elke andere pagina
 * van de site komt uit op 58 kB JavaScript in totaal; de galerij stond op 128 kB.
 * Meer dan de helft van het script op die pagina was een animatiebibliotheek voor
 * één overgang: foto's die uitfaden, de rij die opnieuw opbouwt, foto's die
 * infaden.
 *
 * Dat is precies wat de Web Animations API doet, die in elke browser zit die
 * deze site ondersteunt. Zelfde bewegingen, zelfde tijden, nul kilobyte.
 *
 * Het staat nu in ÉÉN bestand omdat het twee keer dezelfde code was. Een fout
 * die je in de ene kopie herstelt en in de andere vergeet, is de enige soort
 * fout die dubbele code oplevert.
 *
 * ── WAT ER NIET VERANDERT ───────────────────────────────────────────────────
 *
 * De overgang zelf, en de noot die het waarom ervan vasthield:
 *
 *   De filterwissel is een crossfade en geen synchrone `display: none`-omslag.
 *   Vertrekkers faden weg en zakken een fractie terug, de rij bouwt opnieuw op
 *   op het moment dat ze onzichtbaar zijn, daarna faden de nieuwkomers op.
 *   Alleen opacity en transform — geen enkele lay-outeigenschap wordt
 *   geanimeerd, dus het geheel composit op de GPU en veroorzaakt nooit een
 *   reflow midden in een beweging. De display-omslag die WÉL reflowt, gebeurt
 *   één keer, op de naad, als er niets beweegt.
 *
 *   AFWIJKING VAN BRIEF §8, bewust gemeld: §8 vraagt om een "WebGL crossfade on
 *   filter change". Dit is geen WebGL. Dat zou tot 38 rasterfoto's als texture
 *   uploaden en een tweede GL-context naast de hero-shader draaien, op de ene
 *   pagina waarvan de LCP al een muur van beelden is — tegen een budget van
 *   "LCP onder 2,5s op mobiel 4G MÉT de shader". Wat je ziet van een
 *   texture-crossfade en van een gecomposite opacity-crossfade is dezelfde
 *   dissolve van 300ms. Voorgelegd in plaats van stil vervangen.
 *
 * ── DE VERSNELLINGSCURVES ───────────────────────────────────────────────────
 *
 * GSAP's `power2.out` en `power3.out` zijn easeOutQuad en easeOutCubic, en die
 * hebben allebei een exacte bezier-tegenhanger. Ze staan hier met hun naam
 * erbij, zodat niemand hoeft te raden waar die vier getallen vandaan komen.
 *
 * ── ONGEDULDIG KLIKKEN IS HET NORMALE GEBRUIK ───────────────────────────────
 *
 * Een onderbroken overgang is geen randgeval maar de gewone gang van zaken bij
 * een filterbalk. In de GSAP-versie was `killTweensOf` NIET genoeg: de
 * display-omslag was een callback op de tijdlijn en overleefde de kill, vuurde
 * te laat af tegen een filter die niet meer gold, en verstopte foto's die het
 * huidige filter juist wilde — vijf snelle klikken maakten de rij leeg.
 *
 * Hier is dat een GENERATIETELLER. Elke klik verhoogt hem; de vertraagde omslag
 * kijkt of zijn eigen nummer nog het huidige is en doet anders niets. Een
 * afgebroken overgang kan dus nooit meer iets omzetten. `stopAlles()` haalt
 * daarnaast alle lopende animaties weg — alleen die van ONS, bijgehouden in een
 * eigen Map, want `element.getAnimations()` geeft ook CSS-transities terug en
 * die zijn niet van dit script.
 */

const FADE_OUT = 260;   // ms
const FADE_IN = 420;    // ms
const STAP_UIT = 18;    // ms tussen twee vertrekkers
const STAP_IN = 22;     // ms tussen twee nieuwkomers
const UIT = 'cubic-bezier(.25,.46,.45,.94)';   // easeOutQuad  = GSAP power2.out
const IN = 'cubic-bezier(.215,.61,.355,1)';    // easeOutCubic = GSAP power3.out

export function initGalerijFilter() {
  const grid = document.querySelector('.photo-grid[data-filterable]');
  const knoppen = document.querySelectorAll('.filter-bar button[data-filter-key]');
  if (!grid || !knoppen.length) return;
  /* Per grid-element gebonden en niet per module: dit bestand draait één keer
     bij het inlezen ÉN nog een keer op de astro:page-load die erop volgt, wat
     anders twee klikafhandelaars op elke pil stapelt. */
  if (grid.dataset.filterBound) return;
  grid.dataset.filterBound = '1';

  const fotos = Array.from(grid.querySelectorAll('img'));
  const zichtbaar = (img) => img.style.display !== 'none';
  const gewenst = (img, sleutel) => sleutel === 'all' || img.dataset.tag === sleutel;

  /* ── HOE WE ONZE EIGEN ANIMATIES TERUGVINDEN ─────────────────────────────
     Elke animatie die dit script maakt krijgt hetzelfde id. `schoon()` haalt
     met getAnimations() alles op wat op een element loopt en raakt alleen die
     met dit id aan — CSS-transities en CSS-animaties van de stylesheet blijven
     dus met rust, en die zijn hier niet van ons.

     DIT WAS EERST EEN Map VAN Sets, EN DAT LEKTE. De animatie werd bij
     `finished` uit de Map gehaald, maar een animatie met `fill: forwards` BLIJFT
     zijn eindwaarde opleggen nadat hij klaar is. Een vertrekker was dus precies
     op het moment van de omslag al uit de boekhouding verdwenen, `schoon()` vond
     niets meer om af te breken, en de foto hield opacity 0 vast. Bij de volgende
     filterklik kwam hij terug als nieuwkomer — display werd goed gezet, en hij
     bleef onzichtbaar. Gevonden door de proef in kladblok/galerij-proef.mjs, die
     na elke klik meet of er nog iets half doorzichtig staat; in de code zag het
     er tot twee keer toe goed uit.

     getAnimations() kan niet lekken: het vraagt de browser wat er NU op dit
     element ligt, in plaats van bij te houden wat er ooit op gelegd is. */
  const MERK = 'vis-galerij-filter';
  const volg = (el, animatie) => { animatie.id = MERK; return animatie; };
  /* Eén foto terug naar zijn onaangeroerde staat: onze animaties eraf, en de
     inline stijl die wij geschreven hebben weg. Dit is de tegenhanger van
     GSAP's `clearProps: 'opacity,transform'`. */
  const schoon = (el) => {
    for (const a of el.getAnimations()) if (a.id === MERK) a.cancel();
    el.style.opacity = '';
    el.style.transform = '';
  };
  const stopAlles = () => fotos.forEach(schoon);

  let generatie = 0;
  let wachtend = null;

  const toepassen = (sleutel) => {
    const rustig = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    generatie += 1;
    const mij = generatie;
    if (wachtend !== null) { window.clearTimeout(wachtend); wachtend = null; }
    stopAlles();

    const blijft = fotos.filter((img) => gewenst(img, sleutel));
    const vertrekt = fotos.filter((img) => zichtbaar(img) && !gewenst(img, sleutel));
    const komt = blijft.filter((img) => !zichtbaar(img));
    if (!vertrekt.length && !komt.length) return;

    /* De omslag: pas hier gaat display om, en dus pas hier reflowt de rij. */
    const omslag = () => {
      vertrekt.forEach((img) => { img.style.display = 'none'; });
      komt.forEach((img) => { img.style.display = ''; });
      vertrekt.forEach(schoon);
    };

    if (rustig) {
      omslag();
      komt.forEach(schoon);
      return;
    }

    let uitKlaar = 0;
    vertrekt.forEach((img, i) => {
      const na = i * STAP_UIT;
      uitKlaar = Math.max(uitKlaar, na + FADE_OUT);
      /* `fill: forwards` want ze moeten ONZICHTBAAR blijven staan tot de omslag
         ze op display:none zet; zonder fill springen ze één frame terug op vol. */
      volg(img, img.animate(
        [{ opacity: 1, transform: 'scale(1)' }, { opacity: 0, transform: 'scale(.96)' }],
        { duration: FADE_OUT, delay: na, easing: UIT, fill: 'forwards' },
      ));
    });

    const daarna = () => {
      wachtend = null;
      if (mij !== generatie) return;   // er is intussen op een andere pil geklikt
      omslag();
      komt.forEach((img, i) => {
        /* `fill: backwards` en niet forwards: het eindbeeld ís de gewone staat
           (vol, op ware grootte), dus daar hoeft niets vastgehouden te worden.
           Wat wél moet, is dat een foto met 88ms vertraging in die 88ms al op
           nul staat — anders knippert hij vol in beeld en dan pas weg. */
        volg(img, img.animate(
          [{ opacity: 0, transform: 'scale(.96)' }, { opacity: 1, transform: 'scale(1)' }],
          { duration: FADE_IN, delay: i * STAP_IN, easing: IN, fill: 'backwards' },
        ));
      });
    };

    if (uitKlaar > 0) wachtend = window.setTimeout(daarna, uitKlaar);
    else daarna();
  };

  knoppen.forEach((knop) => {
    knop.addEventListener('click', () => {
      const sleutel = knop.dataset.filterKey || 'all';
      knoppen.forEach((k) => k.setAttribute('aria-pressed', String(k === knop)));
      toepassen(sleutel);
    });
  });
}

initGalerijFilter();
document.addEventListener('astro:page-load', initGalerijFilter);
