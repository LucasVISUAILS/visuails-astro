/*
 * LIJST 87 · DE WOORDEN EN DE TIKVLAKKEN (9 november 2026)
 *
 *   R90-F4  · "Jouw merk, zoals jij het ziet." (merk is een het-woord).
 *   R90-S6  · de stijl op maat heet in het Engels overal "Custom", ook bij Catalog (was "Custom Brand").
 *   E15     · "Geleverd merkmodel" wordt "Voorbeeld merkmodel", "Drie die we leverden" wordt "Drie
 *             voorbeelden", de NL-kop gelijk aan de Engelse: "Echt resultaat, geen mock-up". custom-models-01
 *             is hetzelfde bestand als het standaardmodel model-01, dus "geleverd" was een claim.
 *   E16     · de alt-tekst van de voor-foto zegt niet meer "die een klant instuurde".
 *   R90-I2  · /start/video: "Op aanvraag" / "On request" in plaats van "In aanbouw", met een knop om via
 *             WhatsApp een offerte te vragen; het formulier blijft eronder.
 *   D07     · /privacy (NL en EN): één zin dat locatiegegevens in foto's meekomen en dat we ze niet gebruiken.
 *   R90-S13 · het Engelse laptopscherm heet "YOURBRAND" (was "JOUWMERK"); het Nederlandse blijft JOUWMERK.
 *   R90-S12 · tikvlakken van minstens 24 px op de telefoon: de streepjes onder de laptop, het aantalveld,
 *             de links in de voet. Zonder dat er iets verschuift.
 *
 *   node tests/lijst87-u-tekst.test.mjs
 */
import { readFileSync } from 'node:fs';

let goed = 0, fout = 0;
const ok = (naam, v, uitleg = '') => { if (v) { goed++; console.log(` ok   ${naam}`); } else { fout++; console.log(` FAIL ${naam}${uitleg ? `\n       ${uitleg}` : ''}`); } };
const lees = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');

console.log('\nR90-F4 · de titel van de voorpagina');
ok("titel80: ['Jouw merk,', 'zoals jij het ziet.']", lees('src/components/VoorpaginaHal.astro').includes("titel80: ['Jouw merk,', 'zoals jij het ziet.'],"));

console.log('\nR90-S6 · één Engelse naam: Custom');
{
  const { catalogStyles } = await import('../src/data/catalogStyles.js');
  const { styles } = await import('../src/data/styles.js');
  const { videoStyles } = await import('../src/data/videoStyles.js');
  const c = catalogStyles.find((s) => s.slug === 'custom');
  ok('Catalog: "Custom"', c.name === 'Custom', c.name);
  ok('  de knop: "Ask for a Custom look"', c.orderLabel === 'Ask for a Custom look', c.orderLabel);
  ok('  "What Custom feels like."', c.moodTitle === 'What Custom feels like.');
  ok('Lifestyle en Video heten ook "Custom"', styles.find((s) => s.slug === 'custom')?.name === 'Custom' && videoStyles.find((s) => s.slug === 'custom')?.name === 'Custom');
  ok('nergens in src meer "Custom Brand"', !/Custom Brand/.test(['src/data/catalogStyles.js', 'src/data/schema.js'].map(lees).join('')));
  ok('de kruimel van /catalog/custom: Custom', lees('src/data/schema.js').includes("'/catalog/custom': { en: 'Custom', nl: 'Custom' },"));
}

console.log('\nE15 · voorbeeld, niet geleverd');
{
  const brief = lees('src/components/BrandModelBrief.astro');
  ok('alt: "Voorbeeld merkmodel n van 3" / "Example brand model n of 3"', brief.includes('`Voorbeeld merkmodel ${i + 1} van 3` : `Example brand model ${i + 1} of 3`'));
  const data = lees('src/data/brandModelBrief.js');
  ok('de noot: "Three examples." / "Drie voorbeelden."', data.includes("bewijsNoot: 'Three examples.',") && data.includes("bewijsNoot: 'Drie voorbeelden.',"));
  const hal = lees('src/components/BrandModelHal.astro');
  ok('de NL-kop: "Echt resultaat, geen mock-up."', hal.includes("outH: 'Echt resultaat, geen mock-up.',") && hal.includes("uit: ['Echt resultaat,', 'geen mock-up.']"));
  ok('het label: Voorbeelden / Examples', hal.includes("geleverdPil: 'Voorbeelden'") && hal.includes("geleverdPil: 'Examples'"));
  const alles = brief + data + hal;
  ok('geen "geleverd merkmodel", "we delivered", "Echt geleverd werk" meer', !/Geleverd merkmodel|Delivered brand model|we delivered|Drie die we leverden|Echt geleverd werk/.test(alles.replace(/\/\*[\s\S]*?\*\//g, '')));
}

console.log('\nE16 · de voor-foto');
{
  const { voorbeelden } = await import('../src/data/voorbeelden.js');
  const nl = voorbeelden('nl')[0], en = voorbeelden('en')[0];
  ok('NL: "Een telefoonfoto van een shirt"', nl.alt[0] === 'Een telefoonfoto van een shirt', nl.alt[0]);
  ok('EN: "A phone photo of a shirt"', en.alt[0] === 'A phone photo of a shirt', en.alt[0]);
  ok('geen "klant" of "client" meer in die alt', !/klant|client/i.test(nl.alt[0] + en.alt[0]));
}

console.log('\nR90-I2 · /start/video');
{
  const h = lees('src/components/order/HoldingPage.astro');
  ok('"In aanbouw" en "In build" zijn weg', !/'In aanbouw'|'In build'/.test(h));
  ok("status: 'Op aanvraag' / 'On request'", h.includes("status: 'Op aanvraag',") && h.includes("status: 'On request',"));
  ok('een knop om een offerte te vragen via WhatsApp, in beide talen', h.includes("quoteLabel: 'Vraag een offerte via WhatsApp',") && h.includes("quoteLabel: 'Ask for a quote on WhatsApp',"));
  ok('  als lijnknop (een pil), met de WhatsApp-link en het klantkenmerk', /<a class="knop knop-lijn" data-rol="contact" href=\{waHref\(k\.quoteWa\)\} target="_blank" rel="noopener" \{\.\.\.waKlant\(lang\)\}>/.test(h));  /* knoppensysteem lijst 88/89: met data-rol="contact" */ 
  ok('  alleen op de videopagina (de eigen look heeft geen quoteLabel)', (h.match(/quoteLabel:/g) || []).length === 2);
  ok('de omschrijving zegt niet meer "not finished" / "niet af"', !/not finished/.test(lees('src/pages/start/video.astro')) && !/niet af/.test(lees('src/pages/nl/start/video.astro')));
}

console.log('\nD07 · locatie in foto\'s, op /privacy');
{
  ok('NL', lees('src/pages/nl/privacy.astro').includes('Foto’s van een telefoon of camera bevatten vaak de plek waar ze genomen zijn (locatiegegevens in het bestand). Die komen met je upload mee; wij gebruiken ze niet.'));
  ok('EN', lees('src/pages/privacy.astro').includes('Photos from a phone or camera often contain the place they were taken (location data in the file). It comes along with your upload; we do not use it.'));
}

console.log('\nR90-S13 · het Engelse laptopscherm');
{
  const s = lees('src/components/HalLaptopSchermen.astro');
  ok("EN: merk 'YOURBRAND'", /: \{ shop: \{ merk: 'YOURBRAND', menu: \['New'/.test(s));
  ok("NL: merk 'JOUWMERK'", /\? \{ shop: \{ merk: 'JOUWMERK', menu: \['Nieuw'/.test(s));
}

console.log('\nR90-S12 · tikvlakken');
{
  const o = lees('src/styles/opening-80.css');
  ok('de streepjes onder de laptop: een laag van 10,5 px boven/onder en 9 px opzij (44 px hoog)', /html body\.hal \.o8-kies \{ position: relative; \}/.test(o) && /html body\.hal \.o8-kies::after \{ content: ""; position: absolute; inset: -10\.5px -9px; \}/.test(o));
  ok('  23 + 2 × 10,5 = 44; 9 is de helft van de 18 px tussenruimte, dus geen overlap', 23 + 2 * 10.5 === 44 && /gap: 18px/.test(o.match(/\.o8-stand \{[^}]*\}/)[0]));
  const w = lees('src/styles/werkplaats.css');
  ok('het aantalveld: binnenruimte 16,5 px en marge −10,5 px (cijfer en woord op hun plek, vlak 44 px)', /margin: 0 -10\.5px; padding: 0 16\.5px;/.test(w) && 23 + 2 * 10.5 === 44 && 16.5 - 10.5 === 6);
  ok('  ook zonder field-sizing 21 px breder', w.includes('width: calc(1.25em + 21px);'));
  const L = lees('src/layouts/Layout.astro');
  ok('de voetlinks op een aanraakscherm: .6rem boven en onder', /\.footer-col li > a, \.footer-col li > \.mi-off \{ display: inline-block; padding-block: \.6rem; \}/.test(L));
  ok('  en zonder: 3 px binnenruimte en −3 px marge (25,5 px, niets verschuift)', /@media not \(pointer: coarse\) \{\s*\.footer-col li > a \{ display: inline-block; padding-block: 3px; margin-block: -3px; \}/.test(L));
}

console.log(`\n${goed} goed, ${fout} fout`);
if (fout) process.exit(1);
