/* VISUAILS — privacy en verwerkersovereenkomst na afvinklijst 2. 11 oktober 2026 (K5 punt 3).
 *
 *   node tests/bewaren-11-okt.test.mjs      (geen server; leest de bron, en dist/ als die vers is)
 *
 * Bewaakt, in NL en EN:
 *   · kmeld = b: de meldtermijn voor een nieuwe maker is 14 dagen, één constante;
 *   · ko08 = a: ByteDance (BytePlus) via Magnific in de lijst, met land, zonder modelnaam;
 *   · ko06 = a: eigen kopie van klantfoto's en stijlreferenties zolang het account
 *     bestaat (ACCOUNT_YEARS), weg op verzoek vanaf het accountadres, zonder reden;
 *   · Lucas' notitie bij kback: afgeleverde beelden zonder einddatum in het eigen
 *     archief, weg op verzoek ook daaruit; met een echt, herkenbaar persoon de
 *     termijn van het account; de oude "twaalf maanden" is overal weg (behalve in
 *     de voorwaarden, die J3 doet — zie het verslag);
 *   · kback = a: "uiterlijk na N weken", N uit retention.js (prullenbak inbegrepen);
 *   · kcorr = a: mail en WhatsApp CORRESPONDENTIE_JAREN na het laatste contact;
 *   · de termijn in Studio blijft DELIVERY_DAYS (de downloadlink, niet het archief).
 */
import { readFileSync, existsSync } from 'node:fs';
import {
  ACCOUNT_YEARS, BACKUP_KEEP, BACKUP_EVERY_DAYS, DRIVE_PRULLENBAK_DAGEN, BACKUP_UITERLIJK_WEKEN,
  CORRESPONDENTIE_JAREN, DELIVERY_DAYS,
} from '../src/lib/retention.js';
import { MELDTERMIJN_DAGEN, ontvangers, subverwerkers } from '../src/data/subverwerkers.js';
import { buildStaat } from './lib/build.mjs';

let pass = 0, fail = 0;
const ok = (naam, v, extra = '') => { if (v) { pass++; console.log(` ok   ${naam}`); } else { fail++; console.log(` FAIL ${naam} ${extra}`); } };
const lees = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');

const PRIV = { en: lees('src/pages/privacy.astro'), nl: lees('src/pages/nl/privacy.astro') };
const DPA = { en: lees('src/pages/data-processing-agreement.astro'), nl: lees('src/pages/nl/data-processing-agreement.astro') };
const REG = lees('docs/AVG-VERWERKINGSREGISTER.md');

console.log('de getallen');
ok('meldtermijn 14 dagen (kmeld = b)', MELDTERMIJN_DAGEN === 14);
ok('back-ups: uiterlijk na ceil((KEEP × 7 + prullenbak) / 7) weken', BACKUP_UITERLIJK_WEKEN === Math.ceil((BACKUP_KEEP * BACKUP_EVERY_DAYS + DRIVE_PRULLENBAK_DAGEN) / 7), String(BACKUP_UITERLIJK_WEKEN));
ok(`  met --keep ${BACKUP_KEEP} en ${DRIVE_PRULLENBAK_DAGEN} dagen prullenbak: ${BACKUP_UITERLIJK_WEKEN} weken, en dat is "uiterlijk" (nooit korter dan de som)`, BACKUP_UITERLIJK_WEKEN * 7 >= BACKUP_KEEP * BACKUP_EVERY_DAYS + DRIVE_PRULLENBAK_DAGEN);
/* k-back (12 okt, afvinklijst 4): drie kopieën, zodat de zin "uiterlijk na 8 weken" zegt. */
ok('k-back: drie kopieën → uiterlijk na 8 weken (3 × 7 + 30 = 51 dagen)', BACKUP_KEEP === 3 && BACKUP_UITERLIJK_WEKEN === 8, `${BACKUP_KEEP} / ${BACKUP_UITERLIJK_WEKEN}`);
ok('mail en WhatsApp: zoals het account (kcorr = a)', CORRESPONDENTIE_JAREN === ACCOUNT_YEARS && ACCOUNT_YEARS === 2);

console.log('\nde tweede maker (ko08 = a)');
{
  const b = ontvangers('nl').find((o) => o.id === 'bytedance');
  ok('ByteDance (BytePlus Pte. Ltd.) staat erin, via Magnific', b && b.naam === 'ByteDance (BytePlus Pte. Ltd.)' && b.via === 'magnific' && b.viaNaam === 'Magnific AI, S.L.U.');
  ok('  met land: Singapore, in beide talen', b && b.waar === 'Singapore' && ontvangers('en').find((o) => o.id === 'bytedance').waar === 'Singapore');
  ok('  en één zin wat hij doet, zoals Google', /^maker van de videomodellen die wij via Magnific gebruiken\. Verwerkt je beeld als subverwerker van Magnific$/.test(b?.wat || ''));
  ok('  hij krijgt beeldmateriaal: hij staat ook in de lijst van de overeenkomst', subverwerkers('en').some((s) => s.id === 'bytedance'));
  ok('  geen modelnaam (12 augustus)', !/seedance|seedream/i.test(lees('src/data/subverwerkers.js')) && !/seedance|seedream/i.test(REG));
  ok('het register noemt hem in §5 en §6', /\| ByteDance \(BytePlus Pte\. Ltd\.\), via Magnific \| Singapore \|/.test(REG) && /ByteDance \(BytePlus\) in Singapore/.test(REG));
}

console.log('\nwat VISUAILS zelf bewaart (ko06 = a, notitie bij kback)');
for (const lang of ['en', 'nl']) {
  const p = PRIV[lang];
  const d = DPA[lang];
  const zes = p.slice(p.indexOf(lang === 'en' ? '<h2>6.' : '<h2>6.'), p.indexOf('<h2>7.'));
  const twaalf = lang === 'en' ? /twelve months|12 months/ : /twaalf maanden|12 maanden/;
  ok(`${lang} privacy §6: geen archieftermijn van twaalf maanden meer`, !twaalf.test(zes));
  ok(`${lang} DPA §12: idem`, !twaalf.test(d.slice(d.indexOf('<h2>12.'), d.indexOf('<h2>13.'))));
  if (lang === 'en') {
    ok('en privacy: eigen kopie van foto’s en stijlreferenties zolang het account bestaat', /We keep our own copy of your product photos and style references for as long as your customer account exists, so that a new order keeps the same look: up to \{ACCOUNT_YEARS\} years after your last order\./.test(zes));
    ok('en privacy: weg op verzoek vanaf het accountadres, zonder reden, en de look kan afwijken', /Email us from the address of your account and we delete it; you do not need to give a reason\. A new order may then turn out differently from your earlier look\./.test(zes));
    ok('en privacy: afgeleverde beelden zonder einddatum, om de look gelijk te houden en te verbeteren', /We keep a copy of the visuals we made in our own archive, with no end date, so that we can keep your look consistent and keep improving it\./.test(zes));
    ok('en privacy: ook uit dat archief, zonder reden', /we delete it, from that archive too; you do not need to give a reason/.test(zes));
    ok('en privacy: uitzondering voor een echt, herkenbaar persoon', /visuals showing a real, recognisable person — your own model, for example, or someone in a worn photo — we keep only for as long as your customer account exists/.test(zes));
    ok('en privacy: de termijn in Studio blijft DELIVERY_DAYS', /stay in VISUAILS Studio to download for \{DELIVERY_DAYS\} days from delivery/.test(zes));
    ok('en privacy: mail en WhatsApp', /<strong>Email and WhatsApp<\/strong> — the emails and WhatsApp messages we exchange with you are kept for \{CORRESPONDENTIE_JAREN\} years after our last contact/.test(zes));
    ok('en privacy: back-ups uiterlijk na N weken, met de prullenbak', /sits in the Google Drive bin for up to \{DRIVE_PRULLENBAK_DAGEN\} days\. Something we delete is therefore gone from the back-ups too after \{BACKUP_UITERLIJK_WEKEN\} weeks at the latest\./.test(zes));
    ok('en privacy: de oude correspondentiezin is weg', !/Correspondence about an order is kept for as long as it is useful/.test(p));
    ok('en DPA: eigen kopie en archief', /Our own copy of your product photos and style references we keep for as long as your customer account exists, up to \{ACCOUNT_YEARS\} years/.test(d) && /A copy stays in our own archive with no end date/.test(d) && /Visuals showing a real, recognisable person/.test(d));
    ok('en DPA: weg op verzoek, zonder reden', /Email us from the address of your account and we delete it; you do not need to give a reason\./.test(d));
  } else {
    ok('nl privacy: eigen kopie van foto’s en stijlreferenties zolang het account bestaat', /Een eigen kopie van je productfoto’s en stijlreferenties bewaren we zolang je klantaccount bestaat, zodat een nieuwe bestelling dezelfde look houdt: tot \{ACCOUNT_YEARS\} jaar na je laatste bestelling\./.test(zes));
    ok('nl privacy: weg op verzoek vanaf het accountadres, zonder reden, en de look kan afwijken', /Mail ons vanaf het adres van je account, dan verwijderen we hem; een reden hoef je niet te geven\. Een nieuwe bestelling kan daarna wel anders uitvallen dan je eerdere look\./.test(zes));
    ok('nl privacy: afgeleverde beelden zonder einddatum', /Een kopie van de visuals die wij maakten, bewaren we zonder einddatum in ons eigen archief, zodat we je look gelijk kunnen houden en kunnen blijven verbeteren\./.test(zes));
    ok('nl privacy: ook uit dat archief, zonder reden', /dan verwijderen we hem, ook uit dat archief; een reden hoef je niet te geven/.test(zes));
    ok('nl privacy: uitzondering voor een echt, herkenbaar persoon', /visuals waarop een echt, herkenbaar persoon staat — bijvoorbeeld je eigen model, of iemand op een draagfoto — bewaren we alleen zolang je klantaccount bestaat/.test(zes));
    ok('nl privacy: de termijn in Studio blijft DELIVERY_DAYS', /staan \{DELIVERY_DAYS\} dagen na levering in VISUAILS Studio om te downloaden/.test(zes));
    ok('nl privacy: mail en WhatsApp', /<strong>Mail en WhatsApp<\/strong> — de mails en WhatsApp-berichten die we met je uitwisselen, bewaren we \{CORRESPONDENTIE_JAREN\} jaar na ons laatste contact/.test(zes));
    ok('nl privacy: back-ups uiterlijk na N weken, met de prullenbak', /tot \{DRIVE_PRULLENBAK_DAGEN\} dagen in de prullenbak van Google Drive\. Wat we verwijderen, is daardoor uiterlijk na \{BACKUP_UITERLIJK_WEKEN\} weken ook uit de back-ups verdwenen\./.test(zes));
    ok('nl privacy: de oude correspondentiezin is weg', !/Correspondentie over een bestelling bewaren we zolang die nuttig is/.test(p));
    ok('nl DPA: eigen kopie en archief', /Een eigen kopie van je productfoto’s en stijlreferenties bewaren wij zolang je klantaccount bestaat, tot \{ACCOUNT_YEARS\} jaar/.test(d) && /Een kopie blijft zonder einddatum in ons eigen archief/.test(d) && /Beelden waarop een echt, herkenbaar persoon staat/.test(d));
    ok('nl DPA: weg op verzoek, zonder reden', /Mail ons vanaf het adres van je account, dan verwijderen wij het; een reden hoef je niet te geven\./.test(d));
  }
  ok(`${lang}: de getallen komen uit retention.js`, /CORRESPONDENTIE_JAREN[^}]*\} from '\.\.\/(\.\.\/)?lib\/retention\.js'/.test(p) && /ACCOUNT_YEARS[^}]*\} from '\.\.\/(\.\.\/)?lib\/retention\.js'/.test(d));
}

console.log('\nhet register');
ok('§3.1: mail en WhatsApp CORRESPONDENTIE_JAREN na het laatste contact', /Mail en WhatsApp-berichten met de klant: `CORRESPONDENTIE_JAREN` jaar na het laatste contact/.test(REG));
ok('§4: klantfoto’s zolang het account, beelden zonder einddatum, echt persoon: account', /klantfoto's en stijlreferenties zolang het klantaccount bestaat/.test(REG) && /afgeleverde beelden die VISUAILS maakte zonder einddatum/.test(REG) && /beelden met een echt, herkenbaar persoon erop/.test(REG));
ok('§4: weg op verzoek zonder reden', /Alles op verzoek weg, vanaf het accountadres en zonder dat de klant een reden geeft/.test(REG));
ok('§7: de open vraag over de back-ups is beantwoord', !/Open vraag aan Lucas, 8 oktober 2026: zegt het\s+privacybeleid dat ook/.test(REG) && /`BACKUP_UITERLIJK_WEKEN`/.test(REG));

console.log('\nde gebouwde pagina’s');
{
  const pad = (p) => new URL(`../dist/${p}/index.html`, import.meta.url);
  const staat = buildStaat(pad('privacy'));
  if (!staat.er || staat.oud) {
    console.log(`      (overgeslagen — ${staat.uitleg})`);
  } else {
    const en = readFileSync(pad('privacy'), 'utf8');
    const nl = readFileSync(pad('nl/privacy'), 'utf8');
    ok('en: "after 8 weeks at the latest" (uit de constanten)', en.includes(`after ${BACKUP_UITERLIJK_WEKEN} weeks at the latest`));
    ok('nl: "uiterlijk na 8 weken"', nl.includes(`uiterlijk na ${BACKUP_UITERLIJK_WEKEN} weken`));
    ok('en: 2 years after our last contact', en.includes(`kept for ${CORRESPONDENTIE_JAREN} years after our last contact`));
    ok('nl: 2 jaar na ons laatste contact', nl.includes(`bewaren we ${CORRESPONDENTIE_JAREN} jaar na ons laatste contact`));
    ok('beide: ByteDance in de lijst', en.includes('ByteDance (BytePlus Pte. Ltd.)') && nl.includes('ByteDance (BytePlus Pte. Ltd.)'));
    const vwo = readFileSync(pad('data-processing-agreement'), 'utf8');
    ok('DPA: at least 14 days in advance', /at least 14 days in advance/.test(vwo));
    ok('DPA: Studio blijft 90 dagen', vwo.includes(`${DELIVERY_DAYS} days in VISUAILS Studio`));
  }
}

console.log(`\n${pass}/${pass + fail} geslaagd`);
if (fail) process.exit(1);
