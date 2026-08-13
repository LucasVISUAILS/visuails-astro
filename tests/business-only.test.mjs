/*
 * ═══════════════════════════════════════════════════════════════════════════════
 * UITSLUITEND ZAKELIJK — EN WAAROM DAT GEEN KVK-VELD IS
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Lucas, 12 augustus 2026, op de vraag of consumenten uitgesloten moeten worden:
 * *"Uitsluiten maar wat als iemand geen KVK heeft omdat diegene uit het buitenland
 * komt. Hier moet wel echt iets op bedacht worden."* En op de vraag hoe hard:
 * *"Hard in de EU, verklaring wereldwijd."*
 *
 * Die vraag is de hele reden dat dit bestand bestaat. Een formulier dat een
 * KVK-nummer eist, sluit geen consumenten uit maar buitenlandse ondernemingen —
 * dat nummer bestaat alleen in Nederland. De wettelijke toets (art. 6:230g lid 1
 * sub a BW) gaat over de HOEDANIGHEID van de klant en niet over een nummer, en de
 * verklaring is dus het dragende element. Het nummer onderbouwt haar.
 *
 * WAT HIER WORDT VASTGEHOUDEN, in volgorde van wat het kost als het fout gaat:
 *
 *   1 · DE DRIE SOORTEN BEWIJS gaan met het LAND mee en niet met het formulier.
 *       Een onbekend land valt op de mildste eis en niet op de strengste — de
 *       omgekeerde faalrichting zou een klant opleveren die niets kan invullen wat
 *       wij goedkeuren, en dat is de fout waar Lucas' vraag over ging.
 *
 *   2 · DE VERKLARING IS NOOIT OPTIONEEL. Zonder haar is er geen uitzondering op
 *       het herroepingsrecht, ook niet met een geldig KVK-nummer erbij.
 *
 *   3 · EEN ONTBREKEND BEWIJS VERLIEST DE BESTELLING NIET. Dat is de staande regel
 *       van functions/api/order.js, en de reden dat de uitkomst een BEOORDELING is
 *       en geen weigering. Wat het wél doet, is de betaallink tegenhouden.
 *
 *   4 · DE HERROEPINGSVERKLARING BLIJFT STAAN. Ze is de terugval: blijkt de
 *       zakelijke verklaring onjuist, dan geldt het consumentenrecht alsnog, en
 *       dan is zij het enige vinkje dat er nog toe doet. §10a van de voorwaarden
 *       zegt hetzelfde en mag dus ook niet verdwijnen.
 */
import { readFileSync } from 'node:fs';
import { buildStaat } from './lib/build.mjs';
import {
  businessCheck, regKindFor, looksLikeKvk, normaliseKvk,
  BUSINESS_VERSION, businessText, currentBusiness, REG_KIND,
} from '../src/data/business.js';
/* De herroepingsverklaring komt uit haar eigen bestand, en deze toets vergelijkt
   sinds 13 augustus 2026 de LETTERLIJKE tekst op de gebouwde pagina — dus moet
   hij hem hier kunnen ophalen in plaats van hem over te typen. */
import { currentConsent } from '../src/data/consent.js';

let pass = 0;
let fail = 0;
function ok(name, got, want = true, shown) {
  const good = got === want;
  if (good) pass++; else fail++;
  console.log(`${good ? ' ok  ' : ' FAIL'} ${name.padEnd(62)}${good ? '' : `verwacht ${JSON.stringify(want)} kreeg ${JSON.stringify(shown ?? got)}`}`);
}
const read = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8');
const body = (src) => {
  const einde = src.indexOf('---', src.indexOf('---') + 3);
  return einde === -1 ? src : src.slice(einde + 3);
};

console.log('\nVISUAILS — uitsluitend zakelijk\n');

console.log('het soort bewijs volgt het land, en een onbekend land valt mild uit');
{
  ok('NL vraagt een KVK-nummer', regKindFor('NL'), REG_KIND.kvk);
  ok('en dat is niet gevoelig voor kleine letters', regKindFor('nl'), REG_KIND.kvk);
  ok('DE vraagt een btw-nummer', regKindFor('DE'), REG_KIND.euVat);
  ok('FR ook', regKindFor('FR'), REG_KIND.euVat);
  ok('US valt op het vrije registratienummer', regKindFor('US'), REG_KIND.other);
  ok('GB ook, want dat is geen EU meer', regKindFor('GB'), REG_KIND.other);
  /* DE FAALRICHTING, en dit is de check die Lucas' vraag beantwoordt: een leeg of
     onbekend land mag NIET op de KVK-eis vallen. Dan zou een bezoeker van wie we
     het land nog niet weten een nummer moeten invullen dat in zijn land niet
     bestaat, en dat is precies het uitsluiten van de verkeerde groep. */
  for (const raar of ['', null, undefined, 'ZZ', '  ', 'XX']) {
    ok(`onbekend land ${JSON.stringify(raar)} valt op de mildste eis`, regKindFor(raar), REG_KIND.other);
  }
}

console.log('\nde vorm van een KVK-nummer');
{
  ok('acht cijfers is goed', looksLikeKvk('99742993'), true);
  ok('met punten erin ook', looksLikeKvk('997.429.93'), true);
  ok('met spaties ook', looksLikeKvk('99 74 29 93'), true);
  ok('zeven cijfers niet', looksLikeKvk('9974299'), false);
  ok('negen cijfers niet', looksLikeKvk('997429931'), false);
  ok('leeg niet', looksLikeKvk(''), false);
  ok('normaliseren haalt de opsmuk eraan', normaliseKvk('997.429 93'), '99742993');
  /*
   * EN "KVK 99742993" WORDT GOEDGEKEURD, met label en al. Ik had hier eerst
   * `false` staan met het label "letters niet", en dat was mijn verwachting en niet
   * de bedoeling: normaliseKvk() haalt alles weg wat geen cijfer is, dus wie zijn
   * nummer met het woord ervoor intypt heeft een geldig nummer ingevuld. Dat
   * afkeuren zou een klant tegenhouden die het goede antwoord gaf.
   *
   * Het gevolg is dat de controle mild is: "ABC12345678" komt er ook door. Dat is
   * aanvaardbaar en met opzet, want dit is CORROBORATIE en geen verificatie — er is
   * geen KVK-API in dit project, acht cijfers zijn acht cijfers, en de ruwe invoer
   * wordt bewaard zoals hij is aangeleverd. Het juridische werk doet de verklaring.
   */
  ok('een nummer met het woord KVK ervoor wordt goedgekeurd', looksLikeKvk('KVK 99742993'), true);
  ok('maar iets zonder acht cijfers niet', looksLikeKvk('KVK-nummer volgt'), false);
  ok('een verzonnen nummer met de juiste vorm wordt niet betrapt', looksLikeKvk('12345678'), true);
}

console.log('\nde beslissing per geval');
{
  const g = (over) => businessCheck({ declared: true, ...over });

  ok('NL met KVK-nummer is in orde', g({ country: 'NL', regNumber: '99742993', noVat: true }).ok, true);
  ok('NL met btw-nummer ook', g({ country: 'NL', vat: 'NL005407575B96' }).ok, true);
  ok('NL zonder beide niet', g({ country: 'NL', noVat: true }).ok, false);
  ok('en dat zegt waarom',
    /geen KVK-nummer en geen btw-nummer/.test(g({ country: 'NL', noVat: true }).reasons.join(' ')), true);

  /* HARD IN DE EU. Een bij VIES bevestigd nummer is het enige bewijs dat wij
     binnen de EU kunnen NAVRAGEN, en dus het enige dat zonder beoordeling door
     mag. Een Handelsregisternummer in een tekstveld is een bewering, en die staat
     al in de verklaring. */
  ok('DE met een bevestigd btw-nummer is in orde',
    g({ country: 'DE', vat: 'DE123456789', viesValid: true }).ok, true);
  ok('DE met een onbevestigd nummer niet',
    g({ country: 'DE', vat: 'DE123456789', viesValid: false }).ok, false);
  ok('DE met een nummer dat niet te controleren was ook niet',
    g({ country: 'DE', vat: 'DE123456789', viesValid: null }).ok, false);
  ok('DE met alleen een registratienummer ook niet',
    g({ country: 'DE', regNumber: 'HRB 12345', noVat: true }).ok, false);
  ok('en dat is de bedoelde hardheid, met de reden erbij',
    /zonder btw-nummer, wel een registratienummer/.test(
      g({ country: 'DE', regNumber: 'HRB 12345', noVat: true }).reasons.join(' ')), true);

  /* BUITEN DE EU IS DE VERKLARING DE ONDERGRENS, met het nummer als vastlegging.
     Dit is het antwoord op "wat als iemand geen KVK heeft omdat diegene uit het
     buitenland komt": dan kan hij wél bestellen. */
  ok('US met een registratienummer is in orde',
    g({ country: 'US', regNumber: '88-1234567', noVat: true }).ok, true);
  ok('een Braziliaans CNPJ ook, in zijn eigen vorm',
    g({ country: 'BR', regNumber: '12.345.678/0001-95', noVat: true }).ok, true);
  ok('US zonder nummer niet', g({ country: 'US', noVat: true }).ok, false);
}

console.log('\nde verklaring is nooit optioneel');
{
  /* Ook niet met het beste bewijs erbij. Zonder verklaring is er geen uitzondering
     op het herroepingsrecht: art. 6:230g gaat over de hoedanigheid van de klant, en
     die stelt de klant vast en niet wij. */
  const zonder = [
    ['NL met KVK', { country: 'NL', regNumber: '99742993', noVat: true }],
    ['DE bij VIES bevestigd', { country: 'DE', vat: 'DE123456789', viesValid: true }],
    ['US met registratienummer', { country: 'US', regNumber: '88-1234567', noVat: true }],
  ];
  for (const [naam, invoer] of zonder) {
    const r = businessCheck({ ...invoer, declared: false });
    ok(`${naam} zonder vinkje is niet in orde`, r.ok, false);
    ok(`${naam}: het bewijs is er wel`, r.evidence, true);
    ok(`${naam}: en de reden noemt de verklaring`,
      /verklaring is niet aangevinkt/.test(r.reasons.join(' ')), true);
  }
  /* De omgekeerde kant: alleen een vinkje en geen enkel bewijs is ook niet in orde.
     Twee halve antwoorden zijn geen heel antwoord. */
  ok('alleen een vinkje is niet genoeg',
    businessCheck({ country: 'NL', noVat: true, declared: true }).ok, false);
}

console.log('\nde versie wordt vastgelegd, niet de tekst');
{
  /* Zelfde regel als bij de herroepingsverklaring in src/data/consent.js: het bewijs
     is niet "er is een vinkje gezet" maar "er is een vinkje gezet bij DEZE tekst".
     Een bestelling van augustus moet in november nog kunnen laten zien wat er stond. */
  ok('er is een huidige versie', typeof BUSINESS_VERSION === 'string' && BUSINESS_VERSION.length > 8, true);
  ok('en die heeft een Engelse tekst', (currentBusiness('en') || '').length > 40, true);
  ok('en een Nederlandse', (currentBusiness('nl') || '').length > 40, true);
  ok('de Engelse zegt "businesses only"', /businesses only/i.test(currentBusiness('en')), true);
  ok('de Nederlandse zegt "uitsluitend zakelijk"', /uitsluitend zakelijk/i.test(currentBusiness('nl')), true);
  ok('de Nederlandse zegt ook "niet als particulier"', /niet als particulier/i.test(currentBusiness('nl')), true);
  ok('een onbekende versie geeft null en niet de huidige tekst', businessText('business-v0-1999', 'nl'), null);
  /* Een taal die we niet kennen valt op Engels en niet op leeg: een verklaring die
     niet te lezen is, is geen verklaring. */
  ok('een onbekende taal valt op Engels', businessText(BUSINESS_VERSION, 'kl'), currentBusiness('en'));
}

console.log('\nhet formulier vraagt het, en op de juiste plek');
{
  const FORM = read('src/components/order/OrderFlow.astro');
  ok('er is een veld voor het registratienummer', /name="reg_number"/.test(FORM), true);
  /* AAN HETZELFDE VINKJE ALS HET BTW-VELD, de andere kant op. Wie een btw-nummer
     heeft, heeft zijn bewijs al; wie "ik heb er geen" aanvinkt, moet iets anders
     aandragen. Twee velden, één vinkje, en nooit beide verplicht. */
  ok('en het is verplicht zodra er geen btw-nummer is',
    /data-pl-req-when="no_vat"/.test(FORM), true);
  ok('het btw-veld hangt aan hetzelfde vinkje, omgekeerd',
    /data-pl-req-unless="no_vat"/.test(FORM), true);
  /* HET LABEL MAG NIET "KVK" HETEN. Dat is de hele les van deze opdracht: een veld
     dat om een KVK-nummer vraagt sluit buitenlandse ondernemingen uit. Het
     Nederlandse geval hoort in de HINT te staan, niet in het label. */
  ok('het label heet niet KVK', /reg: '(Registration number|Registratienummer)'/.test(FORM), true);
  ok('maar de hint noemt het Nederlandse geval wel', /KVK/.test(FORM), true);

  ok('de zakelijke verklaring staat op het formulier', /name="business_declaration"/.test(FORM), true);
  ok('met de versie ernaast', /name="business_version"/.test(FORM), true);
  ok('en hij is verplicht', /name="business_declaration" value="yes" required/.test(FORM), true);

  /* DE HERROEPINGSVERKLARING BLIJFT, en staat ERONDER. De hoedanigheid komt eerst:
     een zakelijke klant heeft de bedenktijd nooit gehad, dus die vraag komt logisch
     voor de vraag of hij haar opgeeft. */
  ok('de herroepingsverklaring staat er nog', /name="withdrawal_consent"/.test(FORM), true);
  ok('en de zakelijke verklaring staat erboven',
    FORM.indexOf('name="business_declaration"') < FORM.indexOf('name="withdrawal_consent"'), true);
}

console.log('\nen het formulier van de proefvisual vraagt het ook — dat deed het niet');
{
  /*
   * ── HET GAT DAT HET MEEST KOSTTE ───────────────────────────────────────────
   *
   * /test-sample HAD zijn eigen wizard en gebruikte OrderFlow.astro niet. Toen de
   * herroepingsverklaring in augustus 2026 werd toegevoegd, is die pagina daarbij
   * overgeslagen — en dat is precies de verkeerde pagina om over te slaan:
   *
   *   · het is de goedkoopste deur op de site en dus waar een particulier het
   *     eerst binnenkomt;
   *   · het is de ENIGE bestelling die meteen wordt afgerekend, dus de enige
   *     waar het geld al binnen is voordat er iets is geleverd.
   *
   * Beide verklaringen staan er nu, in beide talen, en uit dezelfde bron als het
   * andere formulier. Een land- en btw-veld komen er NIET bij: voor één euro is dat
   * te veel formulier, en de verklaring is het deel dat juridisch werkt. Het
   * corroborerende bewijs komt bij de echte bestelling.
   *
   * DEZE SECTIE TOETST BEIDE PAGINA'S APART. Dat is geen dubbelop maar de les van
   * dit project: op 8 augustus is een zin van de Engelse pagina's gehaald en op de
   * Nederlandse laten staan, in de taal van vrijwel elke klant.
   */
  /*
   * ── OP DE GEBOUWDE PAGINA EN NIET MEER OP DE BRON — 13 AUGUSTUS 2026 ──────
   *
   * Deze toets las src/pages/test-sample.astro, omdat de verklaringen daar met de
   * hand in stonden. Sinds vandaag wijst die pagina naar OrderFlow.astro in
   * `mode="sample"` — de stroom die /start ook gebruikt — en staan ze daar één
   * keer in plaats van drie keer overgetypt. Dat is precies wat de noot hierboven
   * wilde, en het zou deze toets rood maken terwijl de pagina beter is geworden.
   *
   * Dus verhuist de bewering mee naar waar hij nooit had mogen weggaan: NAAR WAT
   * DE BEZOEKER KRIJGT. dist/test-sample/index.html is het antwoord op de vraag
   * die deze sectie stelt — staat de verklaring op de goedkoopste deur van de
   * site? — en het is een antwoord dat waar blijft, wie hem daar ook zet.
   *
   * Een verouderde build wordt overgeslagen en niet afgekeurd; zie
   * tests/lib/build.mjs voor waarom, en tests/planning.test.mjs voor dezelfde
   * vorm. De bron wordt daarnaast nog één ding gevraagd: dat de pagina de
   * gedeelde stroom AANROEPT. Zonder die regel zou een pagina die de verklaring
   * opnieuw overtypt deze toets alsnog halen.
   */
  const TS = {
    en: { src: read('src/pages/test-sample.astro'), dist: new URL('../dist/test-sample/index.html', import.meta.url) },
    nl: { src: read('src/pages/nl/test-sample.astro'), dist: new URL('../dist/nl/test-sample/index.html', import.meta.url) },
  };
  for (const [lang, { src, dist: distPad }] of Object.entries(TS)) {
    /* DE STROOM EN NIET EEN EIGEN FORMULIER. `mode="sample"` is wat het aantal op
       één zet en de levertijdstap weglaat; zonder die stand is dit de gewone
       bestelling met een proefprijs eronder. */
    ok(`${lang}: de proefvisual gebruikt de gedeelde bestelstroom`,
      /<OrderFlow[^>]*mode="sample"/.test(src), true);
    ok(`${lang}: en heeft geen eigen bestelformulier meer`,
      /<form[^>]*action="\/api\/order"/.test(src), false);

    const staat = buildStaat(distPad);
    if (!staat.er || staat.oud) {
      console.log(`      (${lang} overgeslagen — ${staat.uitleg})`);
      continue;
    }
    const html = readFileSync(distPad, 'utf8');
    ok(`${lang}: de proefvisual vraagt de zakelijke verklaring`,
      /name="business_declaration"[^>]*required/.test(html), true);
    ok(`${lang}: met de versie ernaast`,
      new RegExp(`name="business_version" value="${BUSINESS_VERSION}"`).test(html), true);
    ok(`${lang}: en de herroepingsverklaring`,
      /name="withdrawal_consent"[^>]*required/.test(html), true);
    ok(`${lang}: met die versie ernaast`, /name="consent_version" value="/.test(html), true);
    /* UIT DE GEDEELDE BRON en niet als eigen tekst op de pagina. Een tweede kopie
       van een juridische verklaring is hoe de twee uit elkaar gaan lopen — en dan
       staat er op de goedkoopste deur een andere belofte dan op de duurste. Op de
       gebouwde pagina is dat te toetsen op de TEKST zelf, wat sterker is dan op de
       aanroep: een overgetypte zin die per ongeluk gelijk is, is geen probleem —
       een die afwijkt, valt hier om. */
    ok(`${lang}: de tekst komt letterlijk uit business.js`,
      html.includes(esc(currentBusiness(lang))), true);
    ok(`${lang}: en uit consent.js`, html.includes(esc(currentConsent(lang))), true);
    /* En in de JUISTE taal: een Nederlandse pagina met de Engelse verklaring erop
       is precies de fout die deze sectie hierboven beschrijft, maar dan omgekeerd. */
    const anders = lang === 'nl' ? 'en' : 'nl';
    ok(`${lang}: en niet in de andere taal`, html.includes(esc(currentBusiness(anders))), false);
  }
}

/* Astro zet in html-tekst dezelfde drie tekens om als elke andere renderer. Zonder
   deze omzetting valt een verklaring met een apostrof of een &-teken erin ten
   onrechte om — en dat is precies het soort toets dat daarna wordt uitgezet. */
function esc(s) {
  return String(s).replace(/&/g, '&#38;').replace(/</g, '&#60;').replace(/>/g, '&#62;');
}

console.log('\nde server legt het vast en houdt de betaallink tegen');
{
  const ORDER = read('functions/api/order.js');
  const code = ORDER.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');

  ok('order.js voert de controle uit', /businessCheck\(\{/.test(code), true);
  ok('met het VIES-antwoord erin', /viesValid: viesState/.test(code), true);
  ok('de verklaring wordt als VERSIE vastgelegd',
    /details\.business_declaration = declared[\s\S]{0,80}business_version/.test(code), true);
  ok("en als 'MISSING' wanneer hij ontbreekt", /'MISSING'/.test(code), true);
  ok('het registratienummer wordt vastgelegd', /details\.business_reg/.test(code), true);
  ok('en de redenen wanneer het niet in orde is', /details\.business_notes/.test(code), true);

  /* DE BESTELLING GAAT NIET VERLOREN. Er mag hier geen `return` of `json(...400)`
     op de uitkomst van businessCheck staan: dat zou de staande regel van dit
     bestand breken (nooit een bestelling verliezen om een secundaire stap). Wat er
     wél gebeurt is een beoordeling. */
  ok('een ontbrekend bewijs leidt tot een beoordeling',
    /needsReview: vatReview\.needsReview \|\| !bizCheck\.ok/.test(code), true);
  ok('en de redenen komen in hetzelfde veld',
    /reasons: \[\.\.\.vatReview\.reasons, \.\.\.bizReasons\]/.test(code), true);
  ok('de bestelling wordt niet geweigerd op de uitkomst',
    /if \(!bizCheck\.ok\)[\s\S]{0,60}return/.test(code), false);

  /* MAAR DE BETAALLINK WORDT TEGENGEHOUDEN, en dat is waar "hard" op neerkomt: er
     gaat geen geld lopen en er wordt niets geproduceerd voordat het bewijs er is. */
  ok('de betaalpoort leest de gecombineerde uitkomst',
    /vatReview\.payableNow && !review\.needsReview/.test(code), true);
  ok('en de beoordelingsrij wordt ook uit die uitkomst geschreven',
    /review\.needsReview \? REVIEW\.pending : null/.test(code), true);
}

console.log('\nde voorwaarden zeggen het, in beide talen, met 10a als terugval');
{
  const T = { en: body(read('src/pages/terms.astro')), nl: body(read('src/pages/nl/terms.astro')) };

  ok('EN zegt dat de dienst zakelijk is', /supplies businesses only/i.test(T.en), true);
  ok('NL idem', /levert uitsluitend zakelijk/i.test(T.nl), true);
  ok('EN noemt de drie soorten bewijs',
    /KVK number/.test(T.en) && /VIES/.test(T.en) && /registration number/.test(T.en), true);
  ok('NL idem',
    /KVK-nummer/.test(T.nl) && /VIES/.test(T.nl) && /registratienummer/.test(T.nl), true);
  /* DE UITLEG WAAROM HET GEEN KVK-EIS IS hoort op de pagina en niet alleen in een
     codecommentaar. Een klant buiten Nederland leest hier waarom hij niet wordt
     weggestuurd, en dat is precies de zorg waar deze opdracht mee begon. */
  ok('EN legt uit waarom het geen KVK-eis is', /only exists in the Netherlands/i.test(T.en), true);
  ok('NL idem', /alleen in Nederland bestaat/i.test(T.nl), true);
  /* EN HET WEIGERT NIET. De pagina belooft hetzelfde als de code doet: stilzetten,
     zeggen wat er nodig is, en beginnen zodra het er is. */
  ok('EN belooft stilzetten en niet weigeren', /we do not refuse the order/i.test(T.en), true);
  ok('NL idem', /weigeren we de bestelling niet/i.test(T.nl), true);

  /* 10a BLIJFT DE TERUGVAL. Blijkt de zakelijke verklaring onjuist, dan geldt het
     consumentenrecht alsnog — dat is niet iets wat je met een contract wegschrijft,
     en een clausule die het tegendeel suggereert is precies de clausule die
     onderuit gaat. */
  ok('EN heeft 10a nog', /Right of withdrawal for consumers/i.test(T.en), true);
  ok('NL idem', /Herroepingsrecht voor consumenten/i.test(T.nl), true);
  ok('EN wijst er ook naar vanuit de nieuwe clausule', /section 10a says what happens/i.test(T.en), true);
  ok('NL idem', /paragraaf 10a wat er geldt/i.test(T.nl), true);
}

console.log(`\n${pass}/${pass + fail} geslaagd`);
if (fail) process.exit(1);
