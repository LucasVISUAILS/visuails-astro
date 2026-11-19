/*
 * LIJST 87 · DE TEKSTEN — 9 november 2026
 *
 *   B14  voorwaarden §9: een offerte met de hand kan een aanbetaling en een restant noemen
 *   B15  voorwaarden §6: een onbetaalde bestelling vervalt (getal uit termijnen.js), met een mail
 *   B19  voorwaarden §9a: de tweede termijn rond dezelfde dag, uiterlijk de 28e
 *   K01  Lifestyle staat ook op "Wij kiezen" (verplicht={false})
 *   K04  "bestelpagina" in plaats van "privélink" op /studio, in privacy, voorwaarden en cookiebeleid
 *   A10  privacy: één zin over de logboeken die Cloudflare kort bewaart
 *
 * Leest de bron (de gebouwde pagina's toetst tests/juridische-datums.test.mjs op de datum).
 *   node tests/lijst87-g-teksten.test.mjs
 */
import { readFileSync } from 'node:fs';
import { VERVAL_DAG, BETALEN_NA_BTW_AKKOORD, inWoorden } from '../src/data/termijnen.js';
import { LAATST_BIJGEWERKT } from '../src/data/juridischeDatums.js';

let goed = 0, fout = 0;
const ok = (naam, v, uitleg = '') => { if (v) { goed++; console.log(` ok   ${naam}`); } else { fout++; console.log(` FAIL ${naam}${uitleg ? `\n       ${uitleg}` : ''}`); } };
const lees = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
/* Alleen de tekst, zonder commentaar: een opmerking die "privélink" noemt, telt niet. */
const tekst = (p) => lees(p).replace(/\/\*[\s\S]*?\*\//g, '').replace(/\{\/\*[\s\S]*?\*\/\}/g, '').replace(/^\s*\/\/.*$/gm, '');

const NL = tekst('src/pages/nl/terms.astro');
const EN = tekst('src/pages/terms.astro');

console.log('B14 · aanbetaling bij een offerte met de hand');
ok('NL: de zin staat er', /Alleen bij werk dat we met de hand offreren, kan de offerte een aanbetaling en een restant noemen/.test(NL));
ok('EN: de zin staat er', /Only for work we quote by hand can the quote set out a deposit and a balance/.test(EN));
ok('"er zijn geen termijnen" / "there are no instalments" is weg', !/er zijn geen termijnen/.test(NL) && !/there are no instalments/.test(EN));

console.log('B15 · een onbetaalde bestelling vervalt');
ok('NL en EN lezen VERVAL_DAG en BETALEN_NA_BTW_AKKOORD uit termijnen.js', [NL, EN].every((s) => /VERVAL_DAG, BETALEN_NA_BTW_AKKOORD \} from '\.\.\/(\.\.\/)?data\/termijnen\.js'/.test(lees(s === NL ? 'src/pages/nl/terms.astro' : 'src/pages/terms.astro'))));
ok('NL: "dan vervalt hij en krijg je daar een mail over"', /\{vervalDagen\} dagen na het plaatsen nog niet betaald \(of \{naAkkoordDagen\} dagen nadat wij hem hebben nagekeken, als dat nodig was\), dan vervalt hij en krijg je daar een mail over/.test(NL));
ok('EN: "it lapses and we email you"', /\{vervalDagen\} days after you placed it \(or \{naAkkoordDagen\} days after we checked it, where that was needed\), it lapses and we email you to say so/.test(EN));
ok(`in woorden: ${inWoorden(VERVAL_DAG, 'nl')} / ${inWoorden(BETALEN_NA_BTW_AKKOORD, 'nl')}`, inWoorden(VERVAL_DAG, 'nl') !== String(VERVAL_DAG) && inWoorden(BETALEN_NA_BTW_AKKOORD, 'en') !== String(BETALEN_NA_BTW_AKKOORD));
ok('"blijft de bestelling zelf staan." (zonder meer) is weg', !/blijft de bestelling zelf staan\./.test(NL) && !/the order itself stays\./.test(EN));

console.log('B19 · de tweede termijn');
ok('NL: "rond dezelfde dag (uiterlijk de 28e)"', /de tweede termijn valt een maand later, rond dezelfde dag \(uiterlijk de 28e\)\./.test(NL));
ok('EN: "on or around the same day (the 28th at the latest)"', /the second term falls a month after it, on or around the same day \(the 28th at the latest\)\./.test(EN));

console.log('K01 · Lifestyle op "Wij kiezen"');
for (const [p, lang] of [['src/pages/start/lifestyle.astro', 'en'], ['src/pages/nl/start/lifestyle.astro', 'nl']]) {
  ok(`${lang}: verplicht={false}`, new RegExp(`<ModelKeuze slot="model" lang="${lang}" soort="lifestyle" verplicht=\\{false\\} />`).test(lees(p)));
}

console.log('K04 · bestelpagina in plaats van privélink');
const K04 = ['src/components/StudioHal.astro', 'src/pages/privacy.astro', 'src/pages/nl/privacy.astro', 'src/pages/terms.astro', 'src/pages/nl/terms.astro', 'src/pages/cookie-policy.astro', 'src/pages/nl/cookie-policy.astro'];
for (const p of K04) {
  const t = tekst(p);
  ok(`${p.replace('src/', '')}: geen "privélink" of "private (order) link" meer`, !/privélink|private (order )?link/i.test(t), (t.match(/.{0,40}(privélink|private (order )?link).{0,40}/i) || [''])[0]);
}
const studio = lees('src/components/StudioHal.astro');
ok('/studio: de kaart heet "Bestelpagina" / "Order page"', /label: 'Bestelpagina'/.test(studio) && /label: 'Order page'/.test(studio));
ok('/studio: "een eigen bestelpagina" / "its own order page"', /een eigen bestelpagina, voor wie mee moet kijken/.test(studio) && /its own order page, for anyone who needs to look along/.test(studio));
ok('voorwaarden en privacy: "de link naar je bestelpagina" / "the link to your order page"', /de link naar je bestelpagina/.test(NL) && /the link to your order page/.test(EN)
  && /de link naar je bestelpagina/.test(tekst('src/pages/nl/privacy.astro')) && /the link to your order page/.test(tekst('src/pages/privacy.astro')));
ok('cookiebeleid: "op je bestelpagina" / "on your order page"', /op je bestelpagina hebt weggeklikt/.test(tekst('src/pages/nl/cookie-policy.astro')) && /on your order page, so they do not come back/.test(tekst('src/pages/cookie-policy.astro')));

console.log('A10 · logboeken bij Cloudflare in de privacyverklaring');
ok('NL: één zin', /Cloudflare, waar de site draait, bewaart korte tijd \(enkele dagen\) logboeken van de verzoeken aan de site/.test(tekst('src/pages/nl/privacy.astro')));
ok('EN: één zin', /Cloudflare, where the site runs, keeps logs of requests to the site for a short time \(a few days\)/.test(tekst('src/pages/privacy.astro')));

console.log('De datum van de documenten');
/* levering 117: voorwaarden en privacy staan sinds 17 november op de dag ('2026-11-17'); nog steeds november */
ok('voorwaarden, privacy en cookiebeleid staan op november 2026', ['terms', 'privacy', 'cookie-policy'].every((k) => LAATST_BIJGEWERKT[k].startsWith('2026-11')), JSON.stringify(LAATST_BIJGEWERKT));

console.log(`\n${goed} goed, ${fout} fout`);
if (fout) process.exit(1);
