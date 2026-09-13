/* VISUAILS — het vraagteken. 12 september 2026.
 *
 *   npm run test:uitleg
 *
 * Lucas: *"wanneer er ergens extra informatie voor nodig is, pas dan het hover
 * vraagteken toe."*
 *
 * ── WAT HIER MIS KAN GAAN ───────────────────────────────────────────────────
 *
 * Een vraagteken dat je niet kunt openen is erger dan een zin die er gewoon
 * staat: de uitleg is dan niet korter geworden maar wég. Drie manieren waarop
 * dat gebeurt, en alle drie zijn hier vastgelegd:
 *
 *   1 · HET WORDT EEN <span>. Dan is hij onbereikbaar met een toetsenbord en
 *       noemt een schermlezer hem niet. Het moet een <button> blijven, en hij
 *       moet zijn eigen label houden.
 *   2 · HET PANEEL ERFT DE OMGEVING. Een popover staat in de top layer maar
 *       hangt in de DOM onder zijn buurman, en erft dus `text-transform`,
 *       `font-family` en `letter-spacing` van bijvoorbeeld een <label>. Dat
 *       gebeurde meteen de eerste keer: vijf regels uitleg in KAPITALEN.
 *   3 · TWEE VRAAGTEKENS KRIJGEN HETZELFDE id. Dan opent de tweede knop het
 *       eerste paneel, en dat valt pas op als er twee op één pagina staan.
 *
 * En één regel die geen code is maar wel telt: een vraagteken is voor uitleg
 * die je NIET nodig hebt om te beslissen. Die regel staat in de kop van het
 * bestand; sectie 4 controleert dat hij daar blijft staan.
 */
import { readFileSync, readdirSync } from 'node:fs';

let pass = 0, fail = 0;
function ok(naam, voorwaarde, verwacht = 'true', kreeg = 'false') {
  if (voorwaarde) { pass++; console.log(` ok   ${naam}`); }
  else { fail++; console.log(` FAIL ${naam}   verwacht ${verwacht}  kreeg ${kreeg}`); }
}
const lees = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const bron = lees('src/components/Uitleg.astro');

console.log('\nVISUAILS — het vraagteken\n');

/* ══ 1 · HET IS EEN KNOP, EN HIJ ZEGT WAAR HIJ OVER GAAT ══════════════════ */
console.log('het is een knop en geen span');
{
  ok('het teken is een <button>', /<button\b[\s\S]*?class="uitleg-mark"/.test(bron), '<button>', 'iets anders');
  ok('  met type="button"', /type="button"/.test(bron), 'type="button"', 'ontbreekt — post het formulier');
  ok('  en een eigen aria-label', /aria-label=\{aria\}/.test(bron));
  ok('het label noemt het onderwerp', /Uitleg over \$\{over\}/.test(bron), 'Uitleg over …', 'niet gevonden');
  ok('  en is tweetalig', /More about \$\{over\}/.test(bron));
  /* Het vraagteken zelf is versiering: een schermlezer die "vraagteken" zegt
     ná "Uitleg over het btw-nummer" herhaalt zichzelf. */
  ok('het ?-teken zelf is verborgen voor de schermlezer',
    /<span aria-hidden="true">\?<\/span>/.test(bron));
}

/* ══ 2 · HET PANEEL ERFT NIETS ════════════════════════════════════════════
   De fout die er de eerste keer in zat. Elke eigenschap hieronder kan door een
   ouder worden gezet en maakt het paneel onleesbaar als hij meekomt. */
console.log('\nhet paneel zet zijn eigen typografie');
{
  const blok = (bron.match(/\.uitleg-paneel \{[\s\S]*?\n  \}/) || [''])[0];
  ok('er is een paneelblok in de CSS', blok.length > 50);
  for (const eigenschap of ['font-family', 'text-transform', 'letter-spacing', 'font-weight', 'font-stretch']) {
    ok(`  ${eigenschap} wordt opnieuw gezet`, blok.includes(`${eigenschap}:`), eigenschap, 'ontbreekt');
  }
  ok('text-transform staat op none', /text-transform:\s*none/.test(blok));
  ok('het paneel staat vast aan het scherm', /position:\s*fixed/.test(blok), 'fixed', 'iets anders');
  ok('  want hij zit in de top layer', /popover="auto"/.test(bron));
}

/* ══ 3 · ELK VRAAGTEKEN HEEFT ZIJN EIGEN id ═══════════════════════════════ */
console.log('\ntwee vraagtekens op één pagina botsen niet');
{
  ok('het id wordt per exemplaar gemaakt',
    /const id = `ul-\$\{Math\.random/.test(bron), 'een eigen id', 'een vaste string');
  ok('  en de knop wijst ernaar', /popovertarget=\{id\}/.test(bron));
  ok('  en het paneel draagt hem', /id=\{id\}/.test(bron));
}

/* ══ 4 · HET WERKT ZONDER SCRIPT, EN HET SCRIPT DOET MAAR TWEE DINGEN ═════
   `popovertarget` opent de popover in de browser zelf — met een muisklik, met
   een tik en met de spatiebalk. Valt het script uit, dan is het vraagteken dus
   nog steeds bruikbaar. Dat is het verschil tussen degraderen naar omslachtig
   en degraderen naar stuk. */
console.log('\nhet werkt ook zonder script');
{
  ok('openen gebeurt met popovertarget en niet met een klikluisteraar',
    /popovertarget=/.test(bron) && !/addEventListener\('click'/.test(bron),
    'popovertarget', 'een klikluisteraar');
  ok('de hover is alleen voor een echte muis',
    /\(hover: hover\) and \(pointer: fine\)/.test(bron), 'hover-media-query', 'niet gevonden');
  ok('  en focus opent hem ook', /addEventListener\('focus'/.test(bron));
  /* Zonder deze vertraging valt het paneel weg zodra je de muis ernaartoe
     beweegt — de klassieke onbereikbare tooltip. */
  ok('het paneel blijft open als je hem aanwijst',
    /for \(const el of \[knop, paneel\]\)/.test(bron), 'ook op het paneel', 'alleen op de knop');
  ok('en de zachte navigatie bindt opnieuw',
    /astro:page-load/.test(bron), 'astro:page-load', 'niet gevonden');
}

/* ══ 5 · DE REGEL STAAT ERBIJ ═════════════════════════════════════════════
   Een component zonder regel wordt een component die overal staat. Deze toets
   is met opzet een tekstcontrole: hij bewaakt de zin, niet de code. */
console.log('\nde regel wanneer het mag, staat in het bestand');
{
  ok('de regel staat in de kop',
    /NIET nodig hebt om te beslissen/.test(bron), 'de regel', 'weggehaald');
  ok('  met een voorbeeld van wat er níét in mag',
    /Wat kost het/.test(bron), 'het prijsvoorbeeld', 'weggehaald');
}

/* ══ 6 · EN WAAR HIJ AL GEBRUIKT WORDT, IS DE LOSSE ZIN WEG ═══════════════
   Het doel is een kortere pagina. Een vraagteken NAAST een zin die er ook nog
   staat, maakt de pagina langer in plaats van korter — dan is het versiering.
   Deze sectie loopt elk bestand na dat het component gebruikt. */
console.log('\nwaar het staat, is de losse zin verdwenen');
{
  const mappen = ['src/components', 'src/components/order'];
  const gebruikers = [];
  for (const map of mappen) {
    for (const naam of readdirSync(new URL(`../${map}`, import.meta.url))) {
      if (!naam.endsWith('.astro') || naam === 'Uitleg.astro') continue;
      const b = lees(`${map}/${naam}`);
      if (/<Uitleg\b/.test(b)) gebruikers.push([`${map}/${naam}`, b]);
    }
  }
  ok('het vraagteken wordt ergens gebruikt', gebruikers.length > 0, '≥1 bestand', 0);
  for (const [pad, b] of gebruikers) {
    /* Elke `tekst={...}` die wordt doorgegeven, mag niet óók nog in een
       <span class="hint"> op dezelfde pagina staan. */
    const sleutels = [...b.matchAll(/<Uitleg[^>]*tekst=\{([^}]+)\}/g)].map((m) => m[1].trim());
    for (const sleutel of sleutels) {
      const dubbel = new RegExp(`<span class="hint">\\{\\s*${sleutel.replace(/[.[\]]/g, '\\$&')}\\s*\\}`);
      ok(`${pad.split('/').pop()}: ${sleutel} staat niet óók als losse hint`,
        !dubbel.test(b), 'alleen in het vraagteken', 'staat er twee keer');
    }
  }
}

/* ── HET AANRAAKVLAK — 12 september 2026 ─────────────────────────────────────
 *
 * Gemeten op een telefoon van 390 pixels: het vraagteken was 11 bij 11 pixels.
 * WCAG 2.2 SC 2.5.8 vraagt 24 bij 24, en Note.astro lost dat al op met een knop
 * van 24×24 en een kleiner teken erin — met een noot erbij die precies uitlegt
 * waarom. Uitleg.astro is die maatregel bij het bouwen vergeten, en dat gold
 * dus voor elk vraagteken dat ermee gezet is.
 *
 * Waarom een toets en geen losse reparatie: de fout is niet dat er één verkeerd
 * getal stond, maar dat een nieuwe component de les van een oudere niet
 * meekreeg. De volgende component die een klein teken in lopende tekst zet,
 * maakt hem opnieuw — tenzij er iets is dat het tegenhoudt.
 */
{
  const b = lees('src/components/Uitleg.astro');

  ok('het vraagteken heeft een eigen aanraakvlak',
    /\.uitleg-mark::after\s*\{/.test(b), '.uitleg-mark::after', 'geen ::after');

  const blok = b.match(/\.uitleg-mark::after\s*\{([^}]*)\}/)?.[1] || '';

  ok('en dat vlak is minstens 24 pixels breed',
    /inline-size:\s*max\([^)]*24px[^)]*\)/.test(blok), 'max(…, 24px)', blok.slice(0, 60));
  ok('en minstens 24 pixels hoog',
    /block-size:\s*max\([^)]*24px[^)]*\)/.test(blok), 'max(…, 24px)', blok.slice(0, 60));
  ok('het staat absoluut, zodat het de regelhoogte niet oprekt',
    /position:\s*absolute/.test(blok), 'absolute', 'niet absolute');
  ok('en het is gecentreerd op het teken zelf',
    /translate:\s*-50%\s+-50%/.test(blok), 'translate: -50% -50%', 'niet gecentreerd');

  /* Zonder `position: relative` op de knop zelf hangt het vlak aan de eerste
     voorouder die wél gepositioneerd is — meestal de hele sectie. Dan is het
     aanraakvlak niet te groot maar volslagen verkeerd geplaatst, en dat is
     erger dan de fout die het moest oplossen. */
  const knop = b.match(/\.uitleg-mark\s*\{([^}]*)\}/)?.[1] || '';
  ok('en de knop zelf draagt het, met position: relative',
    /position:\s*relative/.test(knop), 'relative op .uitleg-mark', 'ontbreekt');
}

console.log(`\n${pass}/${pass + fail} geslaagd`);
if (fail) process.exitCode = 1;
