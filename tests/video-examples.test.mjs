/*
 * ═══════════════════════════════════════════════════════════════════════════════
 * DE VIDEOVOORBEELDEN, EN DE LIJST VAN WAT ER GELEVERD WORDT
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Blok 7 van Lucas' lijst: *"poster met klik-om-te-spelen"*, twee voorbeelden per
 * videotype, lege staten, en de exacte bestandsnamen die de klant krijgt.
 *
 * ── WAT HIER HET ZWAARST WEEGT ──────────────────────────────────────────────
 *
 * Niet of het er mooi uitziet, maar drie dingen die geld of vertrouwen kosten:
 *
 *   1 · `preload="none"` MOET ERIN BLIJVEN. Vier stijlen × twee voorbeelden is acht
 *       clips. Zodra iemand die attribuut weghaalt — of erger, `autoplay` toevoegt —
 *       laadt elke bestelpagina acht videobestanden voor een bezoeker die er
 *       misschien één bekijkt. Dat is niet een prestatiedetail maar de databundel
 *       van een klant op een telefoon.
 *
 *   2 · DE BESTANDSNAMEN IN DE TABEL MOETEN DE ECHTE ZIJN. Die tabel is een
 *       belofte: dit zijn de bestanden die je krijgt. Staat er iets anders in de
 *       tabel dan wat videoFilename() maakt, dan belooft de site een bestand dat de
 *       levering niet aanlevert — precies de soort fout die deze week op /video en
 *       in het batchplafond zat.
 *
 *   3 · DE LEGE STAAT MOET LEEG BLIJVEN ZOLANG ER NIETS IS. Het materiaal is nog
 *       niet gemaakt. Een poster die stiekem een bestaande lifestyle-still is, zou
 *       een voorbeeld zijn van werk dat niet bestaat.
 *
 * ── WAAROM ÉÉN TAK ALLEEN OP DE BRON WORDT GETOETST ────────────────────────
 *
 * De `<video>`-tak is vandaag onbereikbaar: elke `file` staat op null, dus geen
 * enkele gebouwde pagina bevat er één. Die tak wordt daarom op de BRON getoetst, en
 * dat staat hier expliciet omdat het een zwakkere toets is. Zodra de eerste clip er
 * is, hoort er een regel bij die de gebouwde pagina leest — de laatste sectie
 * hieronder zegt dat ook tegen wie deze test dan opent.
 */
import { readFileSync } from 'node:fs';
import { buildStaat } from './lib/build.mjs';
import {
  videoExamples, examplesFor, isReady,
  VIDEO_RATIOS, VIDEO_FORMAT, videoFilename,
} from '../src/data/videoExamples.js';
import { videoStyles } from '../src/data/videoStyles.js';
import { videoStyles as videoStylesNl } from '../src/data/videoStyles.nl.js';

let pass = 0;
let fail = 0;
function ok(name, got, want = true, shown) {
  const good = got === want;
  if (good) pass++; else fail++;
  console.log(`${good ? ' ok  ' : ' FAIL'} ${String(name).padEnd(62)}${good ? '' : `verwacht ${JSON.stringify(want)} kreeg ${JSON.stringify(shown ?? got)}`}`);
}
const read = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8');

/*
 * ── ALLEEN DE MARKUP, NIET DE UITLEG ────────────────────────────────────────
 *
 * Derde keer vandaag dat een regex op de eigen verantwoording aansloeg: de noot bij
 * dit component legt uit waarom er GEEN `autoplay` in staat, en dus staat het woord
 * `autoplay` in het bestand. Een test die daarop rood gaat, duwt de uitleg eruit — en
 * de uitleg is de helft van de code.
 *
 * Dus: commentaar en <style> eraf voordat er iets over de markup wordt beweerd. Het
 * <style>-blok moet mee, want `.vx-soon-label` staat daar als selector en zou anders
 * meegeteld worden als een voorbeeld dat er niet is.
 */
const alleenMarkup = (src) => src
  .replace(/\{\/\*[\s\S]*?\*\/\}/g, '')   // {/* … */} in de markup
  .replace(/\/\*[\s\S]*?\*\//g, '')         // /* … */ in de frontmatter
  .replace(/<style>[\s\S]*?<\/style>/g, '');

console.log('\nVISUAILS — de videovoorbeelden\n');

/* ════════════════════════════════════════════════════════════════════════════
   1 · ELKE STIJL HEEFT ER TWEE, EN GEEN STIJL VALT ERBUITEN
   ════════════════════════════════════════════════════════════════════════════ */
console.log('elke videostijl heeft twee voorbeelden');
{
  const slugs = videoStyles.map((s) => s.slug);
  ok('er zijn videostijlen om voorbeelden bij te zetten', slugs.length > 0, true, slugs.length);
  for (const slug of slugs) {
    ok(`${slug} heeft er twee`, examplesFor(slug).length, 2);
  }
  /* En de omgekeerde kant: geen voorbeeldenlijst voor een stijl die niet bestaat.
     Zo'n verdwaalde sleutel is stil — hij tekent nergens en niemand mist hem —
     tot iemand hem als bewijs neemt dat een stijl bestaat. */
  const extra = Object.keys(videoExamples).filter((k) => !slugs.includes(k));
  ok('en geen voorbeelden voor een stijl die er niet is', extra.length, 0, extra);

  /* De Nederlandse stijlen hebben dezelfde slugs, want het component zoekt op slug
     en niet op naam. Liepen die uiteen, dan viel het blok op /nl stil weg — zonder
     fout, want examplesFor() geeft dan gewoon een lege lijst. */
  ok('de NL-stijlen hebben dezelfde slugs',
    videoStylesNl.map((s) => s.slug).join(','), slugs.join(','));

  /* Elk voorbeeld heeft in BEIDE talen een titel en een omschrijving. De
     omschrijving is de alt-tekst én de tekst in de lege staat, dus een ontbrekende
     zou een leeg vlak zonder uitleg geven. */
  for (const [slug, items] of Object.entries(videoExamples)) {
    for (const e of items) {
      const heel = ['en', 'nl'].every((l) => e.title?.[l] && e.alt?.[l]);
      ok(`  ${e.id} heeft titel en omschrijving in beide talen`, heel, true);
      ok(`  ${e.id} heeft een bekende verhouding`,
        VIDEO_RATIOS.some((r) => r.id === e.ratio), true, e.ratio);
    }
  }
}

/* ════════════════════════════════════════════════════════════════════════════
   2 · DE LEGE STAAT, ZOLANG ER NIETS IS
   ════════════════════════════════════════════════════════════════════════════ */
console.log('\nzolang er geen materiaal is, staat er een lege staat');
{
  const alle = Object.values(videoExamples).flat();
  ok('nog geen enkel voorbeeld is opgenomen', alle.every((e) => !isReady(e)), true);
  ok('  en geen enkel voorbeeld leent een bestaande foto als poster',
    alle.every((e) => e.poster === null), true);

  /* isReady() vraagt om BEIDE. Alleen een clip zou een zwart vlak geven tot de eerste
     frame binnen is, en dan is "klik om te spelen" een knop op niets. Alleen een
     poster zou een speler geven zonder iets om te spelen. */
  ok('alleen een clip is niet genoeg', isReady({ file: '/v/x.mp4', poster: null }), false);
  ok('alleen een poster ook niet', isReady({ file: null, poster: '/img/x.webp' }), false);
  ok('samen wel', isReady({ file: '/v/x.mp4', poster: '/img/x.webp' }), true);
  ok('en niets is niets', isReady(null), false);
}

/* ════════════════════════════════════════════════════════════════════════════
   3 · DE BESTANDSNAMEN DIE DE KLANT KRIJGT
   ════════════════════════════════════════════════════════════════════════════ */
console.log('\nde leverlijst noemt de echte bestandsnamen');
{
  ok('er zijn drie verhoudingen', VIDEO_RATIOS.length, 3);
  ok('verticaal staat vooraan', VIDEO_RATIOS[0].id, 'vertical');

  const namen = VIDEO_RATIOS.map((r, i) => videoFilename(i, r.id));
  ok('de namen zijn genummerd en verwijzen naar de verhouding',
    namen.join(' '), '1-vertical-9x16.mp4 2-square-1x1.mp4 3-wide-16x9.mp4');

  /* HET NUMMER IS DE HELE REDEN dat deze functie bestaat. Zonder zou een verkenner
     alfabetisch sorteren: square, vertical, wide -- en verticaal is het formaat waar
     de klant meestal naar zoekt. Zelfde reparatie als bij de fotomappen. */
  ok('en alfabetisch sorteren geeft onze volgorde',
    [...namen].sort().join(' '), namen.join(' '));
  const zonderNummer = VIDEO_RATIOS.map((r) => `${r.id}-${r.ratio}.mp4`);
  ok('  wat zonder de nummers NIET zo zou zijn',
    [...zonderNummer].sort().join(' ') === zonderNummer.join(' '), false);

  /* Een dubbele punt mag niet in een bestandsnaam op Windows, dus de verhouding
     draagt een x. Dit is het soort ding dat pas opvalt als een klant de map niet
     kan uitpakken. */
  ok('geen dubbele punt in een bestandsnaam', namen.some((n) => n.includes(':')), false);
  ok('en geen spaties', namen.some((n) => /\s/.test(n)), false);

  ok('een onbekende verhouding gooit', (() => {
    try { videoFilename(0, 'diagonaal'); return false; } catch { return true; }
  })(), true);

  /* Resolutie en bitrate staan er met OPZET niet in: dat zijn keuzes over materiaal
     dat nog niet gemaakt is, en een getal dat hier verzonnen wordt staat morgen als
     belofte op een pagina. Deze regel is er zodat dat een besluit blijft en niet
     een keer stil wordt ingevuld. */
  ok('het formaat noemt geen resolutie of bitrate',
    /\d{3,4}p|\bMbps\b|\bkbps\b/i.test(JSON.stringify(VIDEO_FORMAT)), false, JSON.stringify(VIDEO_FORMAT));
  ok('en is MP4', VIDEO_FORMAT.ext, 'mp4');
}

/* ════════════════════════════════════════════════════════════════════════════
   4 · WAT ER IN HET COMPONENT STAAT, EN WAT ER NIET IN MAG
   ════════════════════════════════════════════════════════════════════════════ */
console.log('\nhet component laadt niets tot er geklikt wordt');
{
  const vx = alleenMarkup(read('src/components/VideoExamples.astro'));

  /* ── DE DUURSTE REGEL VAN DIT BESTAND ──────────────────────────────────────
     Acht clips op één pagina. `preload="none"` betekent nul bytes video tot de
     bezoeker op play drukt; zonder dat attribuut begint de browser aan alle acht.
     Deze tak is vandaag niet in een gebouwde pagina te vinden (elke `file` is
     null), dus wordt hij op de bron getoetst -- zwakker, en daarom expliciet. */
  ok('de speler heeft preload="none"', /preload="none"/.test(vx), true);
  ok('en een poster', /poster=\{e\.poster\}/.test(vx), true);
  ok('en controls, dus de native knop', /\bcontrols\b/.test(vx), true);
  ok('en playsinline, zodat een iPhone het scherm niet overneemt', /playsinline/.test(vx), true);
  ok('GEEN autoplay', /autoplay/i.test(vx), false);
  ok('GEEN loop of muted die autoplay zou uitlokken', /\bloop\b|\bmuted\b/i.test(vx), false);

  /* De tabel mag geen eigen namenlijst zijn. */
  ok('de leverlijst komt uit videoFilename()', /videoFilename\(i, r\.id\)/.test(vx), true);
  ok('  en typt geen .mp4 in de markup', /<code>[^<]*\.mp4/.test(vx), false);

  /* Geen script. De hele reden dat dit met een native <video> is gebouwd. */
  ok('er zit geen script bij', /<script/.test(vx), false);

  /* En de lege staat leent geen foto uit public/img. */
  ok('de lege staat leent geen bestaande foto', /\/img\//.test(vx), false);
}

console.log('\nen het staat op alle acht de stijlpagina\'s');
{
  const staat = buildStaat(new URL('../dist/video/motion/index.html', import.meta.url));
  if (!staat.er || staat.oud) {
    console.log(`      (overgeslagen — ${staat.uitleg})`);
  } else {
    for (const slug of videoStyles.map((s) => s.slug)) {
      for (const pre of ['', 'nl/']) {
        const html = alleenMarkup(read(`dist/${pre}video/${slug}/index.html`));
        const leeg = (html.match(/vx-soon-label/g) || []).length;
        ok(`${pre}video/${slug}: twee lege voorbeelden`, leeg, 2);
        ok('  met de leverlijst eronder', /1-vertical-9x16\.mp4/.test(html), true);
        /* Geen enkele gebouwde pagina mag een videobestand aanhalen zolang er geen
           is. Zou dat wel zo zijn, dan staat er een <source> naar een 404. */
        ok('  en geen verwijzing naar een clip die niet bestaat', /<video/.test(html), false);
      }
    }
  }
}

console.log(`\n${pass}/${pass + fail} geslaagd`);
if (fail) process.exit(1);
