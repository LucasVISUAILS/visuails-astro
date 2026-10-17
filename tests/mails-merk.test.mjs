/**
 * De huisstijl van ALLE mails — 17 oktober 2026.
 *
 *   node tests/mails-merk.test.mjs
 *
 * Lucas stuurde een schermafdruk uit de Gmail-app (donkere stand): het woordmerk
 * in de kop was bijna weg. Daarna: *"Kijk even goed of de VISUAILS branding wel
 * goed is bij alle mails"* en *"ook controleren … of ze allemaal consistent zijn
 * en kloppen."* Deze toets roept 83 mails op met hun echte bouwers
 * (tests/lib/alle-mails.mjs) en houdt per mail dezelfde regels vast:
 *
 *   K · de kop: het woordmerk op het witte plaatje (woordmerk-plaat.png, 156 × 46),
 *       en de brief 440 breed (ook voor Outlook; afvinklijst 33, v33-maat = c).
 *   P · alleen kleuren uit het palet van de mail (C in src/lib/mailTemplate.js),
 *       en geen link in het blauw van de mailapp.
 *   T · tekst: geen letter kleiner dan 12 px, lopende tekst 16 px.
 *   R · het kenmerk onder de kop heeft een woord ervoor ("Referentie VIS-…"),
 *       nooit een kaal nummer.
 *   O · het onderwerp: een nummer staat achteraan na " — ", en de voorregel is
 *       niet leeg en niet het onderwerp nog eens.
 *   V · elke klantmail eindigt met een weg terug (de vragenregel, of een zin die
 *       om antwoord vraagt), op een paar mails na die dat bewust niet doen.
 *   A · de aanhef: "Hallo"/"Hello", of het dagdeel als de klant nu leest (afvinklijst
 *       33, src/lib/aanhef.js); nooit meer "Hoi"/"Hi", en niet in de verkeerde taal.
 */
import { alleMails } from './lib/alle-mails.mjs';
import { C } from '../src/lib/mailTemplate.js';

let pass = 0;
let fail = 0;
function ok(name, got, want = true) {
  const good = JSON.stringify(got) === JSON.stringify(want);
  if (good) pass++; else fail++;
  console.log(`${good ? ' ok  ' : ' FAIL'} ${name.padEnd(86)}${good ? '' : `verwacht ${JSON.stringify(want)}, kreeg ${JSON.stringify(got)}`}`);
}

console.log('\nVISUAILS — de huisstijl van alle mails\n');
const alle = await alleMails();
ok('geen bouwer gaf een fout', alle.filter((m) => m.error).map((m) => `${m.id}: ${m.error}`), []);
ok('elke opgeroepen mail is ook verstuurd, met html', alle.filter((m) => !m.error && !m.html).map((m) => m.id), []);
const mails = alle.filter((m) => m.html);
ok('minstens 80 mails gevangen', mails.length >= 80, true);
/* Een paar die makkelijk stil wegvallen: de feedbackmails, de cron, het Engels. */
const MOET = ['studio-low-score', 'studio-consent-withdrawn', 'studio-nightly-report', 'order-expired', 'credits-expiring', 'credits-limit-in-sight', 'prepaid-last-month', 'order-cancelled-en', 'subscription-welcome-en', 'sign-in-code-en'];
ok('de mails die makkelijk wegvallen, zijn er', MOET.filter((id) => !mails.some((m) => m.id === id)), []);
const isStudio = (m) => /studio@voorbeeld\.test/.test(JSON.stringify(m.to || '')) || /^studio[:-]/.test(m.id);
const klant = mails.filter((m) => !isStudio(m));
const studio = mails.filter(isStudio);
ok(`klantmails (${klant.length}) en studiomails (${studio.length}) allebei aanwezig`, klant.length > 30 && studio.length > 15, true);

const zonder = (lijst) => lijst.map((m) => m.id);
/* De zichtbare tekst: zonder de voorregel, de opmerkingen en de tags. */
const zichtbaar = (h) => h.replace(/<!--tekst:uit-->[\s\S]*?<!--\/tekst:uit-->/g, ' ').replace(/<!--[\s\S]*?-->/g, ' ').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ');

/* ── K · de kop ─────────────────────────────────────────────────────────── */
console.log('K · het woordmerk op het witte plaatje');
ok('elke mail: woordmerk-plaat.png, 156 × 46, alt VISUAILS', zonder(mails.filter((m) => !/<img src="https:\/\/visuails\.com\/img\/mail\/woordmerk-plaat\.png" width="156" height="46" alt="VISUAILS"/.test(m.html))), []);
ok('geen mail wijst nog naar het doorzichtige woordmerk', zonder(mails.filter((m) => /woordmerk-inkt\.png/.test(m.html))), []);
ok('de brief is 440 breed, ook in Outlook', zonder(mails.filter((m) => !/max-width:440px/.test(m.html) || !/<table role="presentation" width="440"/.test(m.html))), []);

/* ── P · het palet ──────────────────────────────────────────────────────── */
console.log('\nP · alleen kleuren uit het palet');
const PALET = new Set(Object.values(C).filter((v) => /^#/.test(v)).map((v) => v.toUpperCase()));
const buiten = [];
for (const m of mails) for (const k of m.html.match(/#[0-9A-Fa-f]{6}\b|#[0-9A-Fa-f]{3}\b(?![0-9A-Fa-f])/g) || []) if (!PALET.has(k.toUpperCase())) buiten.push(`${m.id} ${k}`);
ok('geen kleur buiten het palet van de mail', [...new Set(buiten)], []);
const blauw = [];
for (const m of mails) for (const a of m.html.match(/<a\s[^>]*>/g) || []) if (!/color:/.test(a)) blauw.push(`${m.id}: ${a.slice(0, 60)}`);
ok('elke link heeft een eigen kleur (geen blauw van de mailapp)', blauw, []);

/* ── T · de letter ──────────────────────────────────────────────────────── */
console.log('\nT · de letter');
const klein = [];
for (const m of mails) for (const [, px] of m.html.matchAll(/font-size:(\d+(?:\.\d+)?)px/g)) if (Number(px) < 12 && Number(px) !== 1 && Number(px) !== 0) klein.push(`${m.id} ${px}px`);
ok('geen letter kleiner dan 12 px (de voorregel van 1 px uitgezonderd)', [...new Set(klein)], []);
ok('de lopende tekst is 16 px (p() uit mailTemplate.js)', zonder(klant.filter((m) => !/font-size:16px;line-height:1\.6/.test(m.html))), []);
/* Dat elke letter Arial is (en geen schreefletter), meet tests/mails-merk-browser.test.mjs:
   een <p> erft zijn letter vaak van de cel eromheen, en dat ziet alleen een browser. */

/* ── R · het kenmerk onder de kop ───────────────────────────────────────── */
console.log('\nR · het kenmerk onder de kop');
const kaal = [];
for (const m of mails) {
  /* Sinds levering 55 staat het nummer in een eigen <span> (vet, in inkt), dus de tekst
     van de regel zonder tags. */
  const sub = /<\/h1><p style="margin:0 0 22px;[^"]*">(.*?)<\/p>/.exec(m.html);
  const regel = sub ? sub[1].replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim() : '';
  if (sub && /^(VIS|SUB|PROEF|€)[-\s\w.,]*$/.test(regel)) kaal.push(`${m.id}: ${regel}`);
}
ok('geen kaal nummer onder de kop (altijd "Referentie", "Abonnement", "Factuur", …)', kaal, []);
ok('de bestelmails zeggen "Referentie VIS-2608-4471"', zonder(klant.filter((m) => /^(order|delivery|redelivery|fresh|revision)/.test(m.id) && !/(?:Referentie|Reference)(?:&nbsp;|\s)+(?:<span[^>]*>)?VIS-2608-4471/.test(m.html))), []);
ok('de abonnementsmails zeggen "Abonnement VIS-AB-0012"', zonder(klant.filter((m) => /^subscription-(paused|resumed|cancelled|switch|chargeback|on-hold)|^direct-debit/.test(m.id) && !/(?:Abonnement|Plan)(?:&nbsp;|\s)+(?:<span[^>]*>)?VIS-AB-0012/.test(m.html))), []);

/* ── O · onderwerp en voorregel ─────────────────────────────────────────── */
console.log('\nO · onderwerp en voorregel');
const nummerMidden = mails.filter((m) => m.subject && /(VIS|SUB)-[A-Z0-9-]+/.test(m.subject)
  && !/ — (VIS|SUB|PROEF)-[A-Z0-9-]+$/.test(m.subject) && !isStudio(m) && !/^Contact — /.test(m.subject));
ok('in een klantonderwerp staat het nummer achteraan, na " — "', nummerMidden.map((m) => `${m.id}: ${m.subject}`), []);
ok('niemand krijgt nog "(SUB-…)" tussen haakjes in het onderwerp', mails.filter((m) => /\((VIS|SUB)-/.test(m.subject || '')).map((m) => m.subject), []);
const voorregel = (h) => (/<div style="display:none[^>]*>([^<]*)<\/div>/.exec(h) || [])[1] || '';
ok('elke mail heeft een voorregel', zonder(mails.filter((m) => !voorregel(m.html).trim())), []);
ok('de voorregel van een klantmail is niet het onderwerp nog eens', klant.filter((m) => m.subject && voorregel(m.html).trim() === m.subject.trim()).map((m) => m.id), []);
ok('de abonnementsmail opent met zijn eerste zin, niet met zijn kop', /<div style="display:none[^>]*>[^<]*gaat op pauze op[^<]*<\/div>/.test(mails.find((m) => m.id === 'subscription-paused').html), true);
ok('"zit als pdf bij deze mail" alleen als de pdf erbij zit (abonnementsmail zonder pdf)', /zit als pdf bij deze mail/.test(voorregel(mails.find((m) => m.id === 'subscription-month-invoice').html)), false);

/* ── V · een weg terug ──────────────────────────────────────────────────── */
console.log('\nV · elke klantmail heeft een weg terug');
/* Bewust zonder vragenregel: de inlogcode en de twee adresmails (veiligheid, zo
   kort mogelijk), de kopie van het contactformulier (alleen onze eigen zin, zie
   order.js), de checklist, de Studiobrief en de proefronde (geen klant, geen
   bestelling), de btw-vraag en het antwoord op een revisie (die vragen zelf om
   antwoord), en de annulering (die eindigt met "Beantwoord deze mail"). */
const BEWUST = /^(sign-in-code|email-change|email-changed|contact-copy|checklist|studiobrief|test-sample|order-cancelled)/;
const wegTerug = (h) => /Vragen\? Antwoord op deze mail|Questions\? Reply to this email|Beantwoord deze mail|Reply to this (mail|email)/.test(h);
ok('elke andere klantmail heeft de vragenregel of vraagt om antwoord', zonder(klant.filter((m) => !BEWUST.test(m.id) && !wegTerug(m.html))), []);
ok('"app ons" is overal een link', zonder(klant.filter((m) => /app ons/.test(zichtbaar(m.html)) && !/<a [^>]*wa\.me[^>]*>app ons<\/a>/.test(m.html))), []);

/* ── A · de aanhef ──────────────────────────────────────────────────────── */
console.log('\nA · de aanhef');
const nlMails = klant.filter((m) => /<html lang="nl"/.test(m.html));
ok('geen "Hi" en geen "Hoi" meer (afvinklijst 33)', zonder(klant.filter((m) => /<p [^>]*>(Hi|Hoi)[ ,]/.test(m.html))), []);
ok('geen Engelse aanhef in een Nederlandse mail', zonder(nlMails.filter((m) => /<p [^>]*>(Hello|Good (morning|afternoon|evening))[ ,]/.test(m.html))), []);
const metNaam = ['order-confirmation', 'delivery-ready', 'payment-received-invoice', 'credit-note', 'subscription-paused', 'payment-reminder', 'order-expired'];
const AANHEF = /<p [^>]*>(Hallo|Hello|Goedemorgen|Goedemiddag|Goedenavond|Good morning|Good afternoon|Good evening)( [^<,]+)?,<\/p>/;
ok('de aanhef staat er ook in de factuur-, creditnota-, abonnements- en vervalmail', zonder(klant.filter((m) => metNaam.includes(m.id) && !AANHEF.test(m.html))), []);
/* Het dagdeel alleen waar de klant nu leest: niet in een mail die Lucas of de nacht verstuurt. */
const LATER = /^(delivery|redelivery|fresh-portal|credit-added|payment-reminder|payment-link|quote-payment|order-cancelled|credit-note|order-expired|pause-resume|direct-debit|subscription-on-hold|subscription-chargeback|subscription-month|credits-|prepaid-|extra-format)/;
ok('geen dagdeel in een mail die later gelezen wordt', zonder(klant.filter((m) => LATER.test(m.id) && /<p [^>]*>(Goedemorgen|Goedemiddag|Goedenavond|Good morning|Good afternoon|Good evening)[ ,]/.test(m.html))), []);

console.log(`\n${pass}/${pass + fail} geslaagd`);
if (fail) process.exit(1);
