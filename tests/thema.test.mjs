/*
 * ═══════════════════════════════════════════════════════════════════════════════
 * LICHT OF DONKER, EN ALLES WAT DAARBIJ HOORT
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Lucas, 30 augustus 2026: *"Ik wil een wit en donker scherm optie voor het
 * VISUAILS Studio dashboard."*
 *
 * ── WAT HIER BEWAAKT WORDT, EN WAAROM JUIST DAT ─────────────────────────────
 *
 * Een tweede thema gaat niet stuk op de dag dat je hem bouwt. Hij gaat stuk drie
 * maanden later, als iemand één regel toevoegt met een kleur erin — en die regel
 * ziet er in het donker goed uit, want daar wordt hij gebouwd en bekeken. De
 * lichte kant merkt niemand, want daar kijkt niemand.
 *
 * Vandaar dat het zwaartepunt van dit bestand niet op de kleuren ligt maar op de
 * STRUCTUUR: elk token in `:root` met een echte kleur erin moet óf in het lichte
 * blok opnieuw gezet worden, óf op de lijst hieronder staan met een reden. Komt
 * er een token bij, dan valt hij automatisch tussen wal en schip en wordt deze
 * toets rood — precies op de dag dat het gebeurt, en niet drie maanden later.
 *
 * De leesbaarheid zelf wordt níét hier getoetst maar door
 * `npm run leesbaar` (scripts/dash-leesbaar.mjs), die de pagina echt rendert en
 * elke tekst tegen zijn eigen achtergrond meet. Die veeg draait sinds vandaag in
 * beide standen: `VISUAILS_THEMA=licht npm run leesbaar`. Hij vond bij het
 * bouwen 22 onleesbare plekken die met geen enkele broncontrole te vinden waren.
 */
import { readFileSync } from 'node:fs';

let goed = 0; let totaal = 0;
function ok(naam, kreeg, verwacht = true) {
  totaal += 1;
  const isGoed = JSON.stringify(kreeg) === JSON.stringify(verwacht);
  if (isGoed) goed += 1;
  console.log(` ${isGoed ? 'ok  ' : 'FAIL'} ${String(naam).padEnd(60)}${isGoed ? '' : ` verwacht ${JSON.stringify(verwacht)} kreeg ${JSON.stringify(kreeg)}`}`);
}
const lees = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');
const css = lees('../public/account.css');
const acc = lees('../src/lib/account.js');
/* ── ALLEEN DE CODE, NIET DE VERANTWOORDING ──────────────────────────────────
   Zevende keer dit jaar, en deze keer liep ik er in mijn eigen nieuwe toets in:
   de controle "color-scheme staat niet meer vast op light" sloeg aan op de noot
   die uitlegt DAT hij daar niet meer op staat. Dezelfde helper en dezelfde reden
   als in tests/subscription.test.mjs en tests/legal.test.mjs. */
const zonderUitleg = (bron) => bron
  .replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/(^|[^:])\/\/.*$/gm, '$1');
const accCode = zonderUitleg(acc);

const blok = (sel) => {
  const i = css.indexOf(`${sel} {`);
  if (i === -1) return '';
  return css.slice(i, css.indexOf('\n}', i));
};

console.log('de twee paletten staan er, en het lichte is een herdefinitie');
{
  ok('er is een donker palet op :root', blok(':root').length > 100);
  ok('en een licht palet op data-thema', blok(':root[data-thema="licht"]').length > 100);
  /* Het lichte blok mag GEEN opmaakregels bevatten, alleen tokens. Een regel als
     `.card { background: white }` erin zou werken en zou het model breken: dan
     staat de helft van het thema in tokens en de helft in losse regels, en de
     volgende kleur belandt in de verkeerde helft. */
  /* MET DE UITLEG ERUIT. Dit blok draagt lange noten, en een doorlopende
     commentaarregel begint net zo goed met een letter als een selector. Achtste
     keer dit jaar dat een controle zijn eigen verantwoording meetelt; hier had
     ik hem twee schermen eerder al beschreven en liep er alsnog in. */
  const lichtRegels = zonderUitleg(blok(':root[data-thema="licht"]'))
    .split('\n').slice(1)
    .map((l) => l.trim())
    .filter(Boolean);
  ok('het lichte blok zet alleen tokens',
    lichtRegels.filter((l) => !l.startsWith('--')), []);
}

console.log('\nelk token met een kleur is bewust wel of niet omgekeerd');
{
  const lit = /^\s*(--[a-z0-9-]+):\s*(.+?);/gm;
  const rootv = {};
  for (const m of blok(':root').matchAll(lit)) rootv[m[1]] = m[2].trim();
  const lichtv = new Set([...blok(':root[data-thema="licht"]').matchAll(lit)].map((m) => m[1]));
  const isKleur = (v) => /#[0-9a-fA-F]{3,8}\b|rgb\(|hsl\(|color\(/.test(v);

  /* ── DE ELF DIE MET OPZET NIET OMKEREN ──────────────────────────────────────
   * Elk met de reden erbij, want zonder reden is een uitzonderingslijst een
   * plek waar je iets neerzet om van een rode toets af te komen.
   *
   *   ink-850 / ink-800        .btn-dark. Een donkere knop blijft een donkere
   *                            knop; het is geen grond maar een vlak.
   *   paper-on-dark (+2)       de tekst ÓP dat vlak, en op de foto van het lege
   *                            abonnementsscherm. Die grond wisselt niet mee.
   *   teal / clay              de VULLINGEN. Lime met --accent-ink erop haalt
   *                            15,2:1, op wit net zo goed als op zwart. Wat wél
   *                            wijkt zijn teal-text en clay-text.
   *   bg-deep                  het zwart achter diezelfde foto.
   *   accent-on / accent-ink   de letter op een lime vlak. Zie hierboven.
   *   accent-soft              een limetint van 14%; nergens in gebruik. Blijft
   *                            staan omdat hij in de andere stylesheets bestaat.
   */
  const mag = {
    '--ink-850': '.btn-dark blijft donker',
    '--ink-800': '.btn-dark blijft donker',
    '--paper-on-dark': 'tekst op een donker vlak',
    '--paper-soft-on-dark': 'tekst op een donker vlak',
    '--paper-muted-on-dark': 'tekst op een donker vlak',
    '--teal': 'de vulling, gelijk in beide standen',
    '--clay': 'de vulling, gelijk in beide standen',
    '--bg-deep': 'het zwart achter de foto',
    '--accent-on': 'de letter op een lime vlak',
    '--accent-ink': 'de letter op een lime vlak',
    '--accent-soft': 'ongebruikt, bestaat elders wel',
  };
  const vergeten = Object.keys(rootv)
    .filter((k) => isKleur(rootv[k]) && !lichtv.has(k) && !(k in mag));
  ok('geen token vergeten in het lichte blok', vergeten, []);
  /* En andersom: een naam op de lijst die inmiddels wél omkeert, hoort van de
     lijst af. Een uitzondering die niets meer uitzondert, leest als een regel. */
  const overbodig = Object.keys(mag).filter((k) => lichtv.has(k) || !(k in rootv));
  ok('en geen overbodige uitzondering', overbodig, []);
}

console.log('\nhet accent wisselt van rol en niet van kleur');
{
  const licht = blok(':root[data-thema="licht"]');
  /* Lime als LETTER is 1,26:1 op de lichte grond. Deze vier namen zijn precies
     de plekken waar het accent een letter is; ze horen daar dieper te gaan. */
  for (const t of ['--teal-text', '--teal-deep', '--clay-text', '--signal-ink', '--warn-ink']) {
    ok(`${t} gaat dieper in het licht`, new RegExp(`${t}:`).test(licht));
  }
  ok('maar --teal zelf blijft de vulling', /--teal:/.test(licht), false);
  /* En een gevulde balk is een GEGEVEN en geen letter: WCAG 1.4.11 vraagt daar
     3:1 tegen wat ernaast ligt. Lime op een lichtgrijze baan haalt 1,3:1. */
  ok('de gegevensbalk heeft een eigen kleur', /--accent-data:/.test(licht));
  ok('en de opmaak leest die ook', /--accent-data\)/.test(css));
  /* Geen enkele regel mag het accent nog rechtstreeks als getal schrijven —
     dan valt hij buiten beide paletten. */
  const buitenRoot = css.slice(css.indexOf('\n}', css.indexOf(':root[data-thema="licht"] {')));
  ok('nergens meer een los lime getal in de opmaak',
    /rgb\(198 241 0/.test(buitenRoot.replace(/\/\*[\s\S]*?\*\//g, '')), false);
}

console.log('\nde schakelaar werkt zonder JavaScript');
{
  ok('het thema komt uit een cookie', /function themaCookie\(/.test(acc));
  ok('en de standaard is donker', /\? 'licht' : 'donker'/.test(acc));
  ok('?thema= legt de keuze vast', /searchParams\.get\('thema'\)/.test(acc));
  ok('en stuurt terug zonder de parameter', /searchParams\.delete\('thema'\)/.test(acc));
  ok('de cookie heet vis_thema', /vis_thema=\$\{kleur\}/.test(acc));
  /* Een LINK en geen knop met een handler: dit dashboard draait op nul
     JavaScript — er staat geen script-src in de CSP, alleen default-src 'none'. */
  ok('de schakelaar is een link', /class="sidethema" href="\?thema=/.test(acc));
  ok('en hij wijst naar de andere stand',
    /thema === 'licht' \? 'donker' : 'licht'/.test(acc));
  ok('het wortelelement draagt de stand', /data-thema="licht"/.test(acc));
  /* color-scheme stond onvoorwaardelijk op light, op een donker dashboard. Dat
     vertelt de browser: teken je scrollbalk en je <progress> licht. */
  ok('color-scheme volgt het thema', /content="\$\{licht \? 'light' : 'dark'\}"/.test(acc));
  ok('en staat niet meer vast op light', /content="light"/.test(accCode), false);
}

console.log('\nde cookie staat in de cookieverklaring');
{
  for (const p of ['../src/pages/cookie-policy.astro', '../src/pages/nl/cookie-policy.astro']) {
    const pagina = lees(p);
    ok(`${p.split('/').slice(-2).join('/')} noemt vis_thema`, pagina.includes('vis_thema'));
  }
  /* Het telwoord wordt door tests/legal.test.mjs bewaakt — die telt de cookies
     die de code werkelijk zet en vergelijkt dat met het woord op de pagina. Hier
     staat alleen dat de rij er is; daar staat of het er vijf zijn. */
}

console.log(`\n${goed}/${totaal} geslaagd`);
process.exit(goed === totaal ? 0 : 1);
