/* VISUAILS — een donker vlak dat de tokens niet meeneemt
 *   npm run test:donkervlak
 * ══════════════════════════════════════════════════════════════════════════════
 * WAAROM DEZE TOETS BESTAAT — 13 SEPTEMBER 2026
 * ══════════════════════════════════════════════════════════════════════════════
 * Lucas: *"Ook zijn er nog knoppen op de website die niet goed leesbaar zijn
 * (zie bijvoorbeeld VISUAILS Studio in de subscription tab)."*
 *
 * Gemeten op /account/plan in het lichte thema: de knop "Order one-off" stond
 * op 1,14:1 — wit op rgb(240,240,240). De eis is 4,5:1, en 1,14 is niet
 * "moeilijk leesbaar" maar onzichtbaar.
 *
 * ── DE FOUT ZAT NIET IN DE KNOP ────────────────────────────────────────────
 *
 * `.st-geenabo` schilderde een donkere grond en zette de tekstkleur, maar liet
 * de TOKENS staan. `.btn` haalt zijn vulling uit `var(--ghost)`, en die is in
 * het lichte thema een donkere alfa van zes procent — op een lichte pagina
 * precies goed, op een donkere grond een bijna-witte pil. Met witte letters
 * erop, want die kwamen uit een regel die wél wist dat het donker was.
 *
 * Twee halve waarheden die elkaar niet kennen. Dezelfde fout als `--flag-ink`
 * op de voorpagina een dag eerder (zie tests/donkere-blokken.test.mjs), en die
 * toets ving hem niet: hij meet `.op-nacht` op GEBOUWDE pagina's, en het
 * accountpaneel is een Worker-route achter een login.
 *
 * ── DUS EEN REGEL OVER DE BRON, EN NIET OVER EEN SCHERM ────────────────────
 *
 * Wie een donkere grond schildert, verzet de tokens die zijn kinderen lezen.
 * Dat is te controleren zonder browser en zonder sessie, en het geldt voor elk
 * blok dat er ooit bij komt — ook de blokken die nooit op een openbare pagina
 * staan.
 */
import { readFileSync } from 'node:fs';

let pass = 0, fail = 0;
function ok(naam, waar, verwacht = true, kreeg = '') {
  if (waar) { pass += 1; console.log(` ok   ${naam}`); }
  else { fail += 1; console.log(`FAIL   ${naam}`.padEnd(66) + `verwacht ${JSON.stringify(verwacht)} kreeg ${JSON.stringify(kreeg)}`); }
}

/* De donkere gronden van dit project. Wie een van deze waarden als
   `background` zet, maakt een donker vlak — hoe de klasse ook heet. */
const DONKER = /background:\s*var\(--ink-9\d\d\)|background:\s*var\(--ink-850\)|background:\s*#0[0-9A-Fa-f]{5}\b|background:\s*#1[01][0-9A-Fa-f]{3}\b/;

/* Wat zo'n vlak minimaal moet verzetten. `--ghost` is de vulling die elke
   knop leest, `--ink` de letterkleur die elk element zonder eigen `color`
   erft. Dat zijn precies de twee die op /account/plan fout stonden. */
const NODIG = ['--ghost', '--ink'];

/* ── WAT DEZE TOETS WEL EN NIET DEKT ───────────────────────────────────────
   Alleen de vier panelen achter een login: studio, account, admin en portaal.
   Daar staan de themascopes op `:root` (het paneel is standaard donker en
   schakelt naar licht met `data-thema`), en een donker BLOK binnen het lichte
   thema is dus altijd een vlak dat tegen zijn eigen scope in gaat — precies de
   situatie waar de fout in ontstond.

   global.css doet het andersom: daar is de pagina licht en dragen de donkere
   secties hun eigen `.on-dark`/`.op-nacht`-systeem, met een browsermeting
   eroverheen in tests/donkere-blokken.test.mjs. Die twee overlappen niet, en
   allebei proberen te dekken met één regel zou hier een regel opleveren die op
   de helft van de treffers niet klopt. */
const BESTANDEN = ['src/styles/studio.css', 'public/account.css', 'public/admin.css', 'public/portal.css'];

console.log('elk donker vlak verzet de tokens die zijn kinderen lezen');
let vlakken = 0;

for (const pad of BESTANDEN) {
  const bron = readFileSync(new URL(`../${pad}`, import.meta.url), 'utf8');
  /* Commentaar eruit: de noten in dit project citeren de waarden die ze
     uitleggen, en een toets die zijn eigen uitleg leest, vlagt zichzelf. */
  const code = bron.replace(/\/\*[\s\S]*?\*\//g, '');

  /* Elke regelset als losse blok: selector + wat er tussen de accolades staat.
     Geen CSS-parser nodig — dit bestand kent geen geneste regels. */
  for (const m of code.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const selector = m[1].trim();
    const body = m[2];
    if (!DONKER.test(body)) continue;

    /* De token-LIJSTEN zelf staan hier buiten: `:root` en de themascopes
       schilderen geen vlak, ze definiëren de rollen. Datzelfde geldt voor
       body en html — die dragen de paginagrond. */
    if (/^(:root|html|body)\b/.test(selector) || selector.includes(':root[')) continue;
    /* En een vlak zonder tekst erin heeft geen tokens nodig. Een selector die
       alleen een pseudo-element schildert, is decoratie. */
    if (/::(before|after|backdrop|marker)/.test(selector)) continue;
    /* ── DE UITZONDERINGEN, MET NAAM EN REDEN ───────────────────────────────
       Een KNOP is zelf het component: hij zet zijn eigen letterkleur en bevat
       geen kinderen die tokens lezen. Een donkere knop is donker omdat hij dat
       hoort te zijn, niet omdat hij een scope opent.

       Dit is met opzet een LIJST en geen slimme regex op de naam. Een regex die
       "knop" of "btn" in de selector zoekt, raadt — en hij raadde bij het
       schrijven hiervan al meteen fout op `.pl-zet-knop`, dat geen punt voor
       "knop" heeft. Erger is de andere kant op: een container die toevallig
       "knoppen" heet, zou er stil doorheen glippen. Een naam op deze lijst is
       een beslissing die iemand genomen heeft; een regex is er een die niemand
       neemt. */
    const GEEN_SCOPE = new Set([
      '.btn-dark',                                  // knop, zet zijn eigen kleur
      '.btn-dark:hover, .btn-dark:focus-visible',   // idem, hoverstaat
      '.pl-zet-knop',                               // de "hierheen"-knop in de planning
      '.pl-zet-knop:hover, .pl-zet-knop:focus-visible',
      '.pl-pak.is-aan',                             // het oppak-pijltje, aangezet
    ]);
    if (GEEN_SCOPE.has(selector)) continue;

    vlakken += 1;
    const mist = NODIG.filter((t) => !new RegExp(`${t}\\s*:`).test(body));
    ok(`${pad} · ${selector.slice(0, 44)}`, mist.length === 0, 'alle tokens',
      mist.length ? `mist ${mist.join(' en ')}` : '');
  }
}

/* Een toets die nul vlakken vindt, meet niets. */
ok(`er zijn donkere vlakken om te meten (${vlakken})`, vlakken > 0, '≥1', `${vlakken}`);

console.log(`\n${pass}/${pass + fail} geslaagd`);
if (fail) process.exitCode = 1;
