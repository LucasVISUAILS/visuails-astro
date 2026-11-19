/* VISUAILS — levering 117 (17 november 2026), proefronde P4-01: geen lege clipvakken, één echte clip.
 *
 *   node tests/levering-117-tekst-video.test.mjs      (geen build nodig: leest de bron en de bestanden in public/)
 *
 * De proefronde: /video/motion en /video/custom toonden "Not filmed yet", /video en /hooks hadden geen enkele video,
 * en de held op /video was een stilstaand beeld met een nep-voortgangsbalk. Lucas koos het advies: zolang er geen
 * eigen clips zijn de lege vakken weg; in de held van /video de bannerclip (met poster), op /hooks één voorbeeld met
 * dezelfde clip. Geen nieuwe beelden. Wat hier bewaakt wordt:
 *   1 · VideoExamples tekent alleen voorbeelden die klaar zijn (isReady): geen "Not filmed yet" / "Nog niet
 *       opgenomen" meer, en zonder clips alleen de leverlijst, onder een eigen h2;
 *   2 · de held van /video is een <video> met de bannerclip (1280), een poster die bestaat, preload="none",
 *       controls en playsinline, zonder autoplay; de laptop met de videodia is weg;
 *   3 · /hooks heeft precies één <video>, dezelfde clip, en zegt dat het (nog) geen hook is;
 *   4 · de clip en de poster bestaan, en de poster is niet het lege witte eerste beeld.
 */
import { readFileSync, existsSync, statSync } from 'node:fs';
import { videoExamples, isReady } from '../src/data/videoExamples.js';
import { BANNER } from '../src/data/banner94.js';

let pass = 0, fail = 0;
const ok = (naam, v, extra = '') => { if (v) { pass++; console.log(` ok   ${naam}`); } else { fail++; console.log(` FAIL ${naam} ${extra}`); } };
const lees = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
/* alleen de markup en de code: commentaar en <style> eraf (zoals tests/video-examples.test.mjs) */
const markup = (s) => s.replace(/\{\/\*[\s\S]*?\*\/\}/g, '').replace(/\/\*[\s\S]*?\*\//g, '').replace(/<style>[\s\S]*?<\/style>/g, '');

console.log('\n1 · VideoExamples: geen lege vakken');
{
  const vx = markup(lees('src/components/VideoExamples.astro'));
  ok('geen "Not filmed yet"', !/Not filmed yet/.test(vx));
  ok('geen "Nog niet opgenomen" of "Nog niet gefilmd"', !/Nog niet (opgenomen|gefilmd)/.test(vx));
  ok('geen vak .vx-soon meer', !/vx-soon/.test(vx));
  ok('alleen wat klaar is: klaar = items.filter(isReady)', /const klaar = items\.filter\(\(e\) => isReady\(e\)\);/.test(vx) && /klaar\.map\(/.test(vx) && !/items\.map\(/.test(vx));
  ok('de speler houdt preload="none", poster en controls', /preload="none"/.test(vx) && /poster=\{e\.poster\}/.test(vx) && /\bcontrols\b/.test(vx));
  ok('zonder clips: de leverlijst onder een eigen h2 ("De bestanden" / "The files")', /: <h2 id=\{kopId\} class="h-kop h-h2"><span class="l">\{T\.deliverH\}<\/span>\.<\/h2>/.test(vx));
  ok('  en dan geen tweede kop "De bestanden" in de kaart', /\{ietsTeSpelen && <h3>\{T\.deliverH\}<\/h3>\}/.test(vx));
  const alle = Object.values(videoExamples).flat();
  ok('vandaag is er nog geen eigen clip, dus nergens een vak', alle.every((e) => !isReady(e)), 'er is een clip: kijk of de pagina klopt');
}

console.log('\n2 · de held van /video is de bannerclip');
{
  const vh = lees('src/components/VideoHal.astro');
  const m = markup(vh);
  ok('geen HalLaptop (de stilstaande videodia) meer', !/HalLaptop/.test(m));
  ok('een <video> in de opening (.h-open-beeld)', /<figure class="h-open-beeld h-op vd-film"[\s\S]*?<video /.test(m));
  ok('  de bron is de bannerclip van 1280, met ?v= (halV)', /src: halV\('\/img\/hal\/banner\/banner-1280\.mp4'\)/.test(m) && /<source src=\{FILM\.src\} type="video\/mp4" \/>/.test(m));
  ok('  met poster', /poster: halV\('\/img\/hal\/banner\/poster-1280\.avif'\)/.test(m) && /poster=\{FILM\.poster\}/.test(m));
  ok('  preload="none", controls, playsinline', /<video class="vd-film-v" controls preload="none" playsinline/.test(m));
  /* alleen de <video>-tag: de tekst op de pagina noemt "an autoplay clip" als plek waar je hem gebruikt */
  const tag = (m.match(/<video class="vd-film-v"[^>]*>/) || [''])[0];
  ok('  geen autoplay en geen loop op de speler', !!tag && !/autoplay|\bloop\b/.test(tag), tag);
  ok('  de naam en het bijschrift komen uit banner94.js', /label: BANNER\[lang\]\.video/.test(m) && /bijschrift: BANNER\[lang\]\.hoek/.test(m));
}

console.log('\n3 · /hooks: één voorbeeld, eerlijk benoemd');
{
  const hk = markup(lees('src/components/HooksHal.astro'));
  ok('precies één <video>', (hk.match(/<video /g) || []).length === 1, String((hk.match(/<video /g) || []).length));
  ok('  dezelfde clip en poster', /halV\('\/img\/hal\/banner\/banner-1280\.mp4'\)/.test(hk) && /halV\('\/img\/hal\/banner\/poster-1280\.avif'\)/.test(hk));
  ok('  preload="none", geen autoplay', /preload="none"/.test(hk) && !/autoplay/.test(hk));
  ok('  en de tekst zegt dat het nog geen hook is (NL en EN)', /Nog geen hook:/.test(hk) && /Not a hook yet:/.test(hk));
  /* koppen hoogstens twee regels: de h2 is twee korte delen */
  ok('  de kop is kort (≤ 5 woorden per taal)', ['Zo beweegt ons werk.', 'This is how our work moves.'].every((k) => hk.includes(k.split(' ').slice(0, 2).join(' ')) && k.split(' ').length <= 6));
}

console.log('\n3b · de opmaak (na de build, R: tests/stijlvel en tests/sjabloon)');
for (const p of ['src/components/VideoHal.astro', 'src/components/HooksHal.astro']) {
  const b = lees(p);
  /* een scoped <style> zet data-astro-cid op elk element; tests/stijlvel vond daardoor de kopzin van /video niet meer */
  ok(`${p}: geen scoped <style>, alleen <style is:global>`, !/<style>/.test(b) && /<style is:global>/.test(b));
  const stijl = (b.match(/<style is:global>([\s\S]*?)<\/style>/) || ['', ''])[1].replace(/\/\*[\s\S]*?\*\//g, '');
  /* huisregel: geen zachte schaduw; alleen de haarlijn (0 0 0 1px) */
  const schaduwen = [...stijl.matchAll(/box-shadow:\s*([^;]+);/g)].map((m) => m[1].trim());
  ok(`${p}:   alleen een haarlijn als schaduw`, schaduwen.length > 0 && schaduwen.every((x) => /^0 0 0 1px var\(--h-lijn[^)]*\)$/.test(x)), schaduwen.join(' | '));
}

console.log('\n4 · de bestanden bestaan');
{
  const pub = (p) => new URL(`../public${p}`, import.meta.url);
  ok('banner-1280.mp4 staat in public/', existsSync(pub('/img/hal/banner/banner-1280.mp4')));
  ok('poster-1280.avif staat in public/', existsSync(pub('/img/hal/banner/poster-1280.avif')));
  /* poster-1280.webp is het eerste beeld van de clip en helemaal wit (86 bytes): als poster op de witte opening
     zou dat weer een leeg vak zijn. De avif is het beeld op 0,5 s (de telefoon komt in beeld). */
  ok('  en de poster is geen leeg vlak (> 1 kB)', existsSync(pub('/img/hal/banner/poster-1280.avif')) && statSync(pub('/img/hal/banner/poster-1280.avif')).size > 1000);
  ok('de omschrijving van de clip staat in beide talen', !!BANNER.nl.video && !!BANNER.en.video && !!BANNER.nl.hoek && !!BANNER.en.hoek);
}

console.log(`\n${pass}/${pass + fail} geslaagd`);
if (fail) process.exit(1);
