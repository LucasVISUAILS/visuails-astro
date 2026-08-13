/*
 * ═══════════════════════════════════════════════════════════════════════════════
 * DE JURIDISCHE PAGINA'S — DRIE FOUTEN DIE ZICHZELF NIET MELDEN
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Een juridische pagina heeft geen tests nodig omdat de tekst kan omvallen. Hij heeft
 * ze nodig omdat de tekst iets BELOOFT dat elders in de codebase moet gelden, en omdat
 * dit project alle drie de manieren waarop dat scheefloopt al één keer heeft laten zien:
 *
 *   1 · ÉÉN TAAL WEL, DE ANDERE NIET. Op 8 augustus 2026 is de regel "dit is een
 *       algemeen sjabloon — laat het nakijken" van de Engelse pagina's gehaald en op de
 *       Nederlandse laten staan. Op 10 augustus is het geënsceneerde voor/na-blok van
 *       /gallery gehaald en op /nl/gallery laten staan. Beide keren stond de tekst die
 *       nog fout was op de pagina die vrijwel elke klant leest. Vandaar dat elke check
 *       hieronder BEIDE talen doet, altijd.
 *
 *   2 · TWEE DOCUMENTEN DIE ELKAAR TEGENSPREKEN. Het privacybeleid claimde
 *       verwerkingsverantwoordelijke te zijn voor alles wat erin staat, terwijl de
 *       draagfoto een verwerkersrelatie is. Zolang die twee naast elkaar leven, is er
 *       altijd één die het bij een klacht verliest. De verwerkersovereenkomst noemt
 *       zichzelf "onlosmakelijk onderdeel van de voorwaarden" — dan moeten de
 *       voorwaarden daar ook naar wijzen, anders is dat een bewering over een verband
 *       dat niet bestaat.
 *
 *   3 · EEN GETAL DAT DRIFT. De bewaartermijnen staan op vier pagina's en in de
 *       nachtelijke taak. De nieuwe pagina's lezen ze uit retention.js, en deze test
 *       houdt vast dat ze dat blijven doen — een ingetypte 90 is precies de wijziging
 *       die niemand opvalt tot een klant erop wijst.
 *
 * ── EN ÉÉN INHOUDELIJKE BEWAKING ────────────────────────────────────────────
 *
 * Lucas, 12 augustus 2026: *"Ik wil niet precies aangeven wat voor modellen ik gebruik
 * omdat dit mensen zou kunnen sturen op eigen productie."* Dat is een bedrijfsbeslissing
 * en de AVG vraagt het ook niet — art. 13 lid 1 sub e vraagt de ONTVANGER, niet het
 * gereedschap dat die gebruikt. De laatste sectie van dit bestand houdt vast dat er geen
 * modelnaam op een juridische pagina belandt, want dat is een wijziging die iemand met de
 * beste bedoelingen doorvoert ("laten we transparant zijn") en die niet meer terug te
 * draaien is nadat een concurrent het heeft gelezen.
 */
import { readFileSync } from 'node:fs';
import { UPLOAD_DAYS, DELIVERY_MONTHS } from '../src/lib/retention.js';

let pass = 0;
let fail = 0;
function ok(name, got, want = true, shown) {
  const good = got === want;
  if (good) pass++; else fail++;
  const label = good ? ' ok  ' : ' FAIL';
  console.log(`${label} ${name.padEnd(64)}${good ? '' : `expected ${JSON.stringify(want)} got ${JSON.stringify(shown ?? got)}`}`);
}

const read = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8');

/*
 * ALLEEN WAT DE BEZOEKER TE ZIEN KRIJGT, en dat is geen detail — de eerste versie van
 * dit bestand ging op drie checks rood om zijn eigen commentaar. De noot in de
 * frontmatter zegt letterlijk "90 dagen en 12 maanden staan hier niet ingetypt" en legt
 * uit waarom de pagina niet /nl/verwerkersovereenkomst heet; die uitleg bevat dus precies
 * de tekst waarvan de check moet vaststellen dat hij ontbreekt.
 *
 * Dat is de zesde keer in dit project dat een test op zijn eigen woorden struikelt (zie
 * de noot bij de poortcheck in tests/order-api.test.mjs), en de les is elke keer dezelfde:
 * meet de UITKOMST en niet de bron. Een verplichting die alleen in een codecommentaar
 * staat, is bovendien geen verplichting — dus dit is ook inhoudelijk de juiste omvang.
 */
const body = (src) => {
  const einde = src.indexOf('---', src.indexOf('---') + 3);
  return einde === -1 ? src : src.slice(einde + 3);
};

/* SRC is de hele bron — nodig voor de importcheck, want die staat per definitie in de
   frontmatter. Alle inhoudelijke checks lopen over de body. */
const SRC = {
  en: read('src/pages/data-processing-agreement.astro'),
  nl: read('src/pages/nl/data-processing-agreement.astro'),
};
const DPA = { en: body(SRC.en), nl: body(SRC.nl) };
const PRIV = {
  en: body(read('src/pages/privacy.astro')),
  nl: body(read('src/pages/nl/privacy.astro')),
};
const TERMS = {
  en: body(read('src/pages/terms.astro')),
  nl: body(read('src/pages/nl/terms.astro')),
};
const LAYOUT = read('src/layouts/Layout.astro');
const UI = read('src/i18n/ui.js');

console.log('\nVISUAILS — de juridische pagina’s\n');

console.log('de verwerkersovereenkomst bestaat in beide talen en dekt art. 28 lid 3');
{
  /* Per onderdeel van lid 3 één kenmerkende zinsnede, in beide talen. Niet op het
   * artikelnummer, want dat kan er staan zonder dat de verplichting er staat. */
  const EISEN = [
    ['a · alleen op gedocumenteerde instructie', /documented instruction/i, /gedocumenteerde instructie/i],
    ['a · en melden als een instructie de AVG schendt', /infringes the GDPR/i, /in strijd is met de AVG/i],
    ['b · geheimhouding, ook na het einde', /confidentiality in writing/i, /schriftelijk tot geheimhouding/i],
    ['c · beveiliging: versleuteld in rust', /encrypted at rest/i, /versleuteld in rust/i],
    ['d · algemene toestemming voor subverwerkers', /general written authorisation/i, /algemene schriftelijke toestemming/i],
    ['d · en dezelfde plichten doorgelegd (lid 4)', /Art\. 28\(4\)/, /art\. 28 lid 4/],
    ['e · verzoeken van betrokkenen gaan naar de klant', /forward it to you/i, /sturen het binnen <strong>drie werkdagen<\/strong>/i],
    ['f · datalek wordt aan de KLANT gemeld', /Art\. 33\(2\)/, /art\. 33 lid 2/],
    ['f · bijstand bij art. 32 tot en met 36', /Art\. 32 to 36/i, /art\. 32 tot en met 36/i],
    ['g · aan het einde wissen of teruggeven', /delete everything it covers/i, /verwijderen wij alles wat onder deze/i],
    ['h · informatie en een audit door een deskundige', /independent expert/i, /onafhankelijke deskundige/i],
  ];
  for (const [naam, reEn, reNl] of EISEN) {
    ok(`EN ${naam}`, reEn.test(DPA.en), true);
    ok(`NL ${naam}`, reNl.test(DPA.nl), true);
  }
  /* Onderwerp, duur, aard, doel, soort gegevens en categorieën betrokkenen: de
   * aanhef van lid 3, en die is even verplicht als de onderdelen. */
  ok('EN de aanhef van lid 3 staat er (onderwerp, aard, doel, duur)', /Subject matter, nature, purpose and duration/i.test(DPA.en));
  ok('NL idem', /Onderwerp, aard, doel en duur/i.test(DPA.nl));
  ok('EN soort gegevens en categorieën betrokkenen', /categories of data subjects/i.test(DPA.en));
  ok('NL idem', /categorieën betrokkenen/i.test(DPA.nl));
}

console.log('\nde termijnen komen uit retention.js en staan niet ingetypt');
{
  for (const [lang, src] of Object.entries(DPA)) {
    ok(`${lang}: leest retention.js`, /from '\.\.?\/(\.\.\/)?lib\/retention\.js'/.test(SRC[lang]), true);
    ok(`${lang}: gebruikt UPLOAD_DAYS als variabele`, src.includes('{UPLOAD_DAYS}'), true);
    ok(`${lang}: en DELIVERY_MONTHS`, src.includes('{DELIVERY_MONTHS}'), true);
    /* De omgekeerde check, en dit is de mutatie die het echt doet: een ingetypt getal
       naast de variabele is hoe de twee alsnog uit elkaar lopen. */
    ok(`${lang}: geen ingetypte ${UPLOAD_DAYS} dagen`, new RegExp(`${UPLOAD_DAYS} (days|dagen)`).test(src), false);
    ok(`${lang}: geen ingetypte ${DELIVERY_MONTHS} maanden`, new RegExp(`${DELIVERY_MONTHS} (months|maanden)`).test(src), false);
  }
}

console.log('\nde drie documenten spreken elkaar niet tegen');
{
  /* Het privacybeleid claimde verwerkingsverantwoordelijke te zijn voor ALLES. Die zin
     mag er niet meer staan, want hij is onjuist voor de draagfoto — en dit is de check
     die voorkomt dat een latere opschoning hem terugzet. */
  ok('EN §1 claimt niet meer "controller" voor alles',
    /For the personal data described in this policy, VISUAILS acts as the data controller/.test(PRIV.en), false);
  ok('NL §1 idem',
    /Voor de persoonsgegevens die in dit beleid worden beschreven, treedt VISUAILS op als verwerkingsverantwoordelijke/.test(PRIV.nl), false);

  ok('EN §1 legt de twee rollen uit', /we are the <strong>processor<\/strong>/.test(PRIV.en), true);
  ok('NL §1 idem', /zijn wij <strong>verwerker<\/strong>/.test(PRIV.nl), true);

  /* De verwerkersovereenkomst noemt zichzelf onderdeel van de voorwaarden. Dan moeten de
     voorwaarden daarnaar wijzen, anders is dat een bewering over een verband dat er niet
     is — en dat is precies het soort tegenspraak dat een beding onderuit haalt. */
  ok('EN de voorwaarden wijzen naar de verwerkersovereenkomst',
    TERMS.en.includes('/data-processing-agreement'), true);
  ok('NL idem', TERMS.nl.includes('/nl/data-processing-agreement'), true);
  ok('EN het privacybeleid wijst er ook naar', PRIV.en.includes('/data-processing-agreement'), true);
  ok('NL idem', PRIV.nl.includes('/nl/data-processing-agreement'), true);
  ok('en de overeenkomst wijst terug naar beide (EN)',
    DPA.en.includes('/terms') && DPA.en.includes('/privacy'), true);
  ok('en terug naar beide (NL)',
    DPA.nl.includes('/nl/terms') && DPA.nl.includes('/nl/privacy'), true);
}

console.log('\nhij is te vinden — en dat is een eis, geen gemak');
{
  /* Art. 28 lid 2 laat een algemene toestemming voor subverwerkers alleen toe als er een
     lijst is die de klant kan vinden. Een lijst achter twee klikken is geen lijst. */
  ok('de footer linkt naar de verwerkersovereenkomst',
    LAYOUT.includes("lp('/data-processing-agreement')"), true);
  ok('met een eigen label', LAYOUT.includes("t('foot_dpa')"), true);
  ok('en dat label bestaat in het Engels', /foot_dpa: 'Data processing'/.test(UI), true);
  ok('en in het Nederlands', /foot_dpa: 'Verwerkersovereenkomst'/.test(UI), true);

  /* DE SLUG. localizedPath() zet domweg /nl voor het pad en kent geen slugtabel, dus een
     Nederlandse slug zou de footerlink op élke NL-pagina naar een 404 sturen. Deze check
     bestaat omdat de eerste versie van deze pagina /nl/verwerkersovereenkomst heette. */
  ok('de Nederlandse pagina staat op de Engelse slug met /nl-prefix',
    DPA.nl.includes('/nl/verwerkersovereenkomst'), false);
}

console.log('\nde subverwerkers staan met naam, en de twee lijsten zijn gelijk');
{
  /* Art. 13 lid 1 sub e vraagt de ontvangers. "Een aanbieder van AI-beeldgeneratie"
     is geen ontvanger maar een omschrijving. */
  /*
   * TWEE CHECKS EN NIET ÉÉN, want de namen staan in de frontmatter (de SUBS-array) en de
   * body bevat alleen de lus die ze afdrukt. Op alleen de bron kijken zou een array
   * goedkeuren die nergens gerenderd wordt; op alleen de body kijken vindt de namen
   * helemaal niet. Samen zeggen ze wat er moet gelden: de partijen staan er, én ze komen
   * op de pagina terecht.
   */
  const PARTIJEN = ['Freepik Company, S.L.U.', 'Cloudflare, Inc.', 'Resend'];
  for (const naam of PARTIJEN) {
    ok(`EN de overeenkomst noemt ${naam}`, SRC.en.includes(naam), true);
    ok(`NL idem`, SRC.nl.includes(naam), true);
  }
  ok('EN en de lijst wordt op de pagina gerenderd', /\{SUBS\.map\(/.test(DPA.en), true);
  ok('NL idem', /\{SUBS\.map\(/.test(DPA.nl), true);
  ok('EN het privacybeleid noemt Freepik', PRIV.en.includes('Freepik Company, S.L.U.'), true);
  ok('NL idem', PRIV.nl.includes('Freepik Company, S.L.U.'), true);
  ok('EN en Mollie, want die staat niet in de overeenkomst', PRIV.en.includes('Mollie B.V.'), true);
  ok('NL idem', PRIV.nl.includes('Mollie B.V.'), true);

  /* De oude omschrijvingen mogen niet blijven staan náást de namen — dan staat er twee
     keer iets anders over dezelfde partij. */
  ok('EN "An AI image-generation provider" is weg',
    /An AI image-generation provider/.test(PRIV.en), false);
  ok('NL "Een aanbieder van AI-beeldgeneratie" is weg',
    /Een aanbieder van AI-beeldgeneratie/.test(PRIV.nl), false);

  /* De belofte over trainen is een citaat en geen eigen bewering. Staat het citaat er
     niet meer, dan staat er een garantie zonder bron — en dat is de gevaarlijkste vorm. */
  const CITAAT = 'Under no circumstances will we use your images or voices';
  for (const [lang, src] of Object.entries(PRIV)) {
    ok(`${lang}: de trainingsbelofte staat er als citaat`, src.includes(CITAAT), true);
  }
  for (const [lang, src] of Object.entries(DPA)) {
    ok(`${lang}: ook in de overeenkomst`, src.includes(CITAAT), true);
  }
}

console.log('\nde licentie die de klant ons geeft staat in de voorwaarden, met zijn grenzen');
{
  /*
   * WAAROM DIT ER MOEST KOMEN, en waarom het in §8 staat en niet in §5.
   *
   * Het auteursrecht op de aangeleverde foto is van de klant. Opslaan, kopiëren,
   * uitsnijden, bewerken en aanbieden aan een generatieplatform zijn alle vijf
   * voorbehouden handelingen (art. 1 en 12 Aw). Tot 12 augustus 2026 stond in §8
   * alleen wat de klant KRIJGT en nergens wat hij ONS GEEFT — en dan is elke stap
   * van de productie formeel een inbreuk waar de klant zich op zou kunnen beroepen,
   * inclusief de aanlevering aan de subverwerker in §8 van de verwerkersovereenkomst.
   *
   * §5 is de garantie ("je hebt de rechten"), §8 is het recht dat wordt verleend.
   * Die twee horen niet in dezelfde alinea, want de eerste is een verklaring van de
   * klant en de tweede is een verbintenis — bij een geschil worden ze los gelezen.
   *
   * De DOELBINDING is het deel dat de klant beschermt en dus het deel dat een
   * latere opschoning niet mag weghalen: een licentie zonder doel is een licentie
   * voor alles. Vandaar dat de check op de beperking staat en niet op het woord
   * "licentie".
   */
  const LICENTIE = [
    ['de licentie wordt uitdrukkelijk verleend', /grant VISUAILS a licence/i, /geeft VISUAILS daarom een licentie/i],
    ['met een doelbinding, en niet ruimer', /single purpose of producing and delivering your order/i, /uitsluitend om jouw bestelling te maken en te leveren/i],
    ['er gaat geen eigendom over', /transfers no ownership/i, /Er gaat geen eigendom over/i],
    ['niet voor een eigen model of dataset', /model or a dataset of our own/i, /eigen model of dataset/i],
    ['en hij is intrekbaar', /withdraw the licence in writing/i, /licentie op elk moment schriftelijk intrekken/i],
    /* Woordvolgorde: in het Nederlands staat de link vóór het werkwoord ("de partijen
       die in onze verwerkersovereenkomst STAAN"). De eerste versie van deze regel
       zocht "staan in onze" en ging rood op een pagina die in orde was — dezelfde
       misgreep als eerder in dit bestand, en de reden dat elke mutatie hieronder ook
       de andere kant op getest wordt. */
    ['de aanlevering aan de subverwerkers is benoemd', /named in our <a href="\/data-processing-agreement">/, /in onze <a href="\/nl\/data-processing-agreement">verwerkersovereenkomst<\/a> staan/],
  ];
  for (const [naam, reEn, reNl] of LICENTIE) {
    ok(`EN ${naam}`, reEn.test(TERMS.en), true);
    ok(`NL ${naam}`, reNl.test(TERMS.nl), true);
  }

  /*
   * HET PORTFOLIO, en dit is de commerciële en niet de juridische reden.
   *
   * De oude regel was één zin met een opt-out: "we kunnen voorbeelden van ons werk
   * bewaren, tenzij je schriftelijk vraagt dit niet te doen." Voor een merk dat een
   * collectie nog niet heeft gelanceerd is dat het verkeerde antwoord op de
   * verkeerde vraag — het beeld is dan hun bedrijfsgeheim, en een opt-out betekent
   * dat de klant eraan moet denken vóórdat wij het plaatsen. Dat is precies de
   * situatie waarin je een klant kwijt bent zonder dat je iets fout hebt gedaan
   * volgens je eigen voorwaarden.
   *
   * Twee dingen worden nu vastgehouden: het gaat alleen over GELEVERDE visuals en
   * nooit over bronmateriaal, en voor een product dat nog niet uit is geldt een
   * opt-IN. De rest van de zin blijft een opt-out, want anders is er geen portfolio.
   */
  ok('EN het portfolio gaat alleen over geleverde visuals', /<em>delivered visuals<\/em> — never your source material/i.test(TERMS.en), true);
  ok('NL idem', /<em>geleverde visuals<\/em> — nooit jouw bronmateriaal/i.test(TERMS.nl), true);
  ok('EN een nog niet uitgebracht product is opt-in', /not yet publicly available/i.test(TERMS.en), true);
  ok('NL idem', /nog niet openbaar te koop/i.test(TERMS.nl), true);

  /* En de termijnen in §7 van de VOORWAARDEN komen nu ook uit retention.js. Dat is
     dezelfde drift als bij de verwerkersovereenkomst, maar in een contract waar de
     klant zich op de tekst mag beroepen — dus zwaarder, niet lichter. */
  for (const [lang, src] of Object.entries(TERMS)) {
    ok(`${lang}: §7 gebruikt UPLOAD_DAYS`, src.includes('{UPLOAD_DAYS}'), true);
    ok(`${lang}: §7 gebruikt DELIVERY_MONTHS`, src.includes('{DELIVERY_MONTHS}'), true);
    ok(`${lang}: geen ingetypte ${UPLOAD_DAYS} dagen meer`, new RegExp(`${UPLOAD_DAYS} (days|dagen)`).test(src), false);
    ok(`${lang}: geen ingetypte ${DELIVERY_MONTHS} maanden meer`, new RegExp(`${DELIVERY_MONTHS} (months|maanden)`).test(src), false);
  }
}

console.log('\nde licentie in §8 somt op, en belooft niets wat de wet niet toestaat');
{
  /*
   * ── DRIE DINGEN UIT HET ONDERZOEK VAN 12 AUGUSTUS 2026 ─────────────────────
   *
   * Lucas ging ervan uit dat de klant het auteursrecht krijgt zodra er geleverd en
   * betaald is. Dat is de gangbare aanname en op drie punten onjuist, en alle drie
   * staan nu in §8 in plaats van dat de tekst er langsheen leest:
   *
   *   1 · EEN OVERDRACHTSBEDING IN ALGEMENE VOORWAARDEN IS NIET RECHTSGELDIG.
   *       Art. 2 lid 3 Aw: overdracht vereist een daartoe bestemde akte, met
   *       ondertekening (art. 3:95 BW). Een clausule die zegt "door te bestellen
   *       gaat het auteursrecht op je over" doet dus een belofte die de wet niet
   *       laat houden -- en een klant die daarop vertrouwt bij een merkregistratie
   *       of een due diligence komt bedrogen uit. §8 geeft daarom een LICENTIE (die
   *       geen akte nodig heeft) plus een akte op verzoek.
   *
   *   2 · DE LICENTIE WORDT BEPERKT UITGELEGD. Tweede volzin van art. 2 lid 3:
   *       een exclusieve licentie van de maker omvat alleen de bevoegdheden die
   *       UITDRUKKELIJK in de overeenkomst staan. "Commerciele gebruiksrechten" is
   *       daarmee geen opsomming maar een samenvatting, en alles wat je vergeet op
   *       te schrijven heeft de klant niet gekregen. Vandaar de vijf punten.
   *
   *   3 · OP EEN AI-BEELD RUST MISSCHIEN GEEN AUTEURSRECHT. Bescherming vraagt een
   *       eigen intellectuele schepping van een MENS. §8 zegt dat, en zegt daarna
   *       wat de uitkomst is in beide gevallen -- want een leverancier die stilzwijgt
   *       over een recht dat hij misschien niet heeft, verkoopt iets wat hij niet kan
   *       leveren.
   *
   * EN HET PORTFOLIO WORDT NU VOORBEHOUDEN. Een exclusieve licentie sluit de maker
   * uit van zijn eigen werk: zonder een uitdrukkelijk voorbehoud zou VISUAILS
   * inbreuk maken door zijn eigen portfolio te tonen. Dat voorbehoud is dus geen
   * extraatje maar de voorwaarde waaronder de exclusiviteit klopt.
   */
  const LICENTIE8 = [
    ['de licentie is exclusief en eeuwigdurend', /exclusive, perpetual, worldwide and royalty-free licence/i, /exclusieve, eeuwigdurende, wereldwijde en royaltyvrije licentie/i],
    ['en pas bij volledige betaling', /On full payment you receive/i, /Bij volledige betaling ontvang je/i],
    ['1 · verveelvoudigen en openbaar maken', /reproduce and publish/i, /verveelvoudigen en openbaar maken/i],
    ['2 · bewerken en aanpassen', /edit and adapt/i, /bewerken en aanpassen/i],
    ['3 · commercieel gebruiken', /use them commercially/i, /commercieel gebruiken/i],
    ['4 · sublicentiëren aan het eigen bureau', /sublicense/i, /sublicenti/i],
    ['5 · meeverhuizen met het bedrijf', /transfer<\/strong> the licence with your business/i, /overdragen<\/strong> met je bedrijf/i],
    ['het artikel dat de beperkte uitleg voorschrijft', /art\. 2\(3\) Copyright Act/, /art\. 2 lid 3 Auteurswet/],
    ['geen naamsvermeldingsplicht voor de klant', /You do not have to credit us/i, /Je hoeft ons niet te vermelden/i],
  ];
  for (const [naam, reEn, reNl] of LICENTIE8) {
    ok(`EN ${naam}`, reEn.test(TERMS.en), true);
    ok(`NL ${naam}`, reNl.test(TERMS.nl), true);
  }

  /* HET AI-PUNT. Dit is het deel dat een latere opschoning weghaalt omdat het
     "onzeker klinkt" -- en juist die onzekerheid is het eerlijke deel. Zonder de
     tweede helft (wat er geldt als er géén auteursrecht is) is het een probleem
     zonder antwoord, en dan leest het als een voorbehoud tegen de klant. */
  ok('EN §8 zegt dat er misschien geen auteursrecht op rust',
    /there may be no copyright at all/i.test(TERMS.en), true);
  ok('NL idem', /misschien helemaal geen auteursrecht/i.test(TERMS.nl), true);
  ok('EN met de menselijke toets erbij', /human being's own intellectual creation/i.test(TERMS.en), true);
  ok('NL idem', /eigen intellectuele schepping van een mens/i.test(TERMS.nl), true);
  ok('EN en het antwoord voor beide gevallen', /nobody holds it, which means nobody can stop you/i.test(TERMS.en), true);
  ok('NL idem', /houdt niemand het, en dan kan niemand je iets verbieden/i.test(TERMS.nl), true);
  ok('EN en de belofte om geen recht te claimen dat er niet is',
    /We will not assert any right we do not have/i.test(TERMS.en), true);
  ok('NL idem', /geen beroep op een recht dat wij niet hebben/i.test(TERMS.nl), true);

  /* DE AKTE. Het beding dat de wet niet toestaat mag er niet staan, en de route die
     hij wél toestaat moet er wel staan. Beide kanten worden getoetst. */
  ok('EN §8 biedt een akte van overdracht op verzoek', /we will sign a deed of transfer/i.test(TERMS.en), true);
  ok('NL idem', /ondertekenen wij daarvoor een akte van overdracht/i.test(TERMS.nl), true);
  ok('EN en zegt dat een overdrachtsbeding in voorwaarden ongeldig is',
    /a transfer clause in general terms is not valid/i.test(TERMS.en), true);
  ok('NL idem', /een overdrachtsbeding in algemene voorwaarden is niet rechtsgeldig/i.test(TERMS.nl), true);
  /* En de omgekeerde check: §8 mag NIET beweren dat het auteursrecht overgaat. Dat
     is precies het beding dat art. 2 lid 3 Aw niet toestaat. */
  ok('EN §8 beweert geen overdracht door te bestellen',
    /(copyright|ownership) (in the visuals )?(is|are|passes|transfers) to you/i.test(TERMS.en), false);
  ok('NL idem', /het auteursrecht gaat op je over|wordt eigenaar van het auteursrecht/i.test(TERMS.nl), false);

  /* PERSOONLIJKHEIDSRECHTEN. Art. 25 lid 3 laat afstand toe van sub a en, voor
     wijzigingen, van b en c -- maar niet van sub d. Een clausule die van alles
     afstand doet, doet dus afstand van iets wat niet kan, en dat is precies het
     soort onwaarheid dat de rest van de paragraaf verdacht maakt. */
  ok('EN de persoonlijkheidsrechten staan erin met het artikel', /art\. 25 Copyright Act/.test(TERMS.en), true);
  ok('NL idem', /art\. 25 Auteurswet/.test(TERMS.nl), true);
  ok('EN afstand van naamsvermelding wel', /We waive the right to be named/i.test(TERMS.en), true);
  ok('NL idem', /afstand van het recht op naamsvermelding/i.test(TERMS.nl), true);
  ok('EN en van het verminkingsrecht juist niet', /cannot be waived by law and so is not/i.test(TERMS.en), true);
  ok('NL idem', /laat de wet niet wegschrijven en dat doen wij dus ook niet/i.test(TERMS.nl), true);

  /* HET PORTFOLIOVOORBEHOUD als tegenhanger van de exclusiviteit. */
  ok('EN het portfolio is een uitdrukkelijk voorbehoud',
    /we would be infringing your rights by showing our own work/i.test(TERMS.en), true);
  ok('NL idem', /zouden wij inbreuk maken op jouw rechten door ons eigen werk te laten zien/i.test(TERMS.nl), true);
  ok('EN en het is smal: niet verkopen, niet doorlicentiëren',
    /may not sell them, licence them to anyone else/i.test(TERMS.en), true);
  ok('NL idem', /mogen ze niet verkopen, niet aan iemand anders in licentie geven/i.test(TERMS.nl), true);
  ok('EN het niet-uitgebrachte product blijft opt-in', /we publish nothing/i.test(TERMS.en), true);
  ok('NL idem', /dan publiceren wij niets/i.test(TERMS.nl), true);
  ok('EN en het is op elk moment intrekbaar', /you can withdraw this at any time/i.test(TERMS.en), true);
  ok('NL idem', /kunt dit op elk moment intrekken/i.test(TERMS.nl), true);
}

console.log('\nde vrijwaring in §11 heeft de drie grenzen die haar bruikbaar maken');
{
  /*
   * EEN VRIJWARING ZONDER PROCEDURE IS EEN BEDING WAAR NIEMAND IETS MEE KAN.
   *
   * "De klant vrijwaart ons" is één regel en voelt als de hele clausule. In de
   * praktijk strandt zo'n beding op precies de dingen die er niet in staan: wie
   * meldt wanneer, wie voert het verweer, en wie mag schikken. Zonder die drie is de
   * vrijwaring bij een geschil eerder een onderhandelingspunt dan een recht — en een
   * clausule die de klant geen enkele controle geeft over een aanspraak waarvoor hij
   * moet betalen, is bovendien de clausule die als onredelijk bezwarend wordt
   * aangevochten (art. 6:233 BW).
   *
   * De carve-out is het deel dat een latere opschoning eruit haalt "omdat het
   * gunstiger leest zonder": een vrijwaring die ook onze eigen fouten dekt, is geen
   * vrijwaring maar een vrijbrief, en die houdt geen stand.
   */
  const VRIJWARING = [
    ['de vrijwaring staat er', /you indemnify us against that claim/i, /vrijwaar je ons voor die aanspraak/i],
    ['1 · wij melden op tijd', /we notify you without unreasonable delay/i, /zonder onredelijke vertraging weten/i],
    ['2 · de klant mag het verweer voeren', /You may take it over with counsel of your choice/i, /advocaat van je eigen keuze/i],
    ['2 · en wij schikken niet alleen', /We do not settle or admit anything without your written consent/i, /schikken niets en erkennen niets zonder jouw schriftelijke instemming/i],
    ['3 · het dekt onze eigen fouten niet', /results from our breach of these terms/i, /gevolg is van een tekortkoming van ons/i],
    ['3 · en niet wat wij er zelf bij hebben verzonnen', /on our own initiative rather than from your brief/i, /op eigen initiatief aan het werk hebben toegevoegd/i],
  ];
  for (const [naam, reEn, reNl] of VRIJWARING) {
    ok(`EN ${naam}`, reEn.test(TERMS.en), true);
    ok(`NL ${naam}`, reNl.test(TERMS.nl), true);
  }

  /* HET BEREIK, en dit is de reden dat deze paragraaf pas ná de uitsluiting kon
     worden geschreven: een vrijwaring van deze soort kun je een consument niet
     opleggen. Zou §11 dat toch doen, dan is het beding nietig en niet slechts
     ongebruikt — en dan sleept het de rest van de paragraaf mogelijk mee. */
  ok('EN de vrijwaring geldt niet voor een consument',
    /this section does not apply to you at all/i.test(TERMS.en), true);
  ok('NL idem', /geldt deze paragraaf voor jou helemaal niet/i.test(TERMS.nl), true);
  ok('EN met de reden erbij', /cannot be imposed on a consumer/i.test(TERMS.en), true);
  ok('NL idem', /kun je een consument niet opleggen/i.test(TERMS.nl), true);

  /* En de aansprakelijkheidsbeperking die er al stond, mag er niet door verdwijnen:
     de vrijwaring is een toevoeging aan §11 en geen vervanging ervan. */
  ok('EN de cap op onze eigen aansprakelijkheid staat er nog',
    /limited to the amount you paid for that order/i.test(TERMS.en), true);
  ok('NL idem', /beperkt tot het bedrag dat je voor die bestelling hebt betaald/i.test(TERMS.nl), true);

  /* De vrijwaring wijst naar /ai-act voor de publicatieplicht. Die link moet bestaan
     en per taal de juiste zijn — localizedPath() kent geen slugtabel. */
  ok('EN de vrijwaring wijst naar de AI Act-verklaring', TERMS.en.includes('href="/ai-act"'), true);
  ok('NL idem', TERMS.nl.includes('href="/nl/ai-act"'), true);
}

console.log('\nde beveiligingsparagraaf belooft niets wat niet gemeten is');
{
  /*
   * DEZE SECTIE BESTAAT OM ÉÉN ZIN DIE IK ZELF HEB OPGESCHREVEN.
   *
   * In de eerste versie van §7 stond: "Die kopie bevat persoonsgegevens en staat daarom op
   * een versleutelde schijf." Dat is niet gecontroleerd — het stond er omdat het zo hóórt.
   * Op 12 augustus 2026 gevraagd of BitLocker op E: aanstaat, was het antwoord "nee, of ik
   * weet het niet". Een beveiligingsbelofte die je niet kunt aantonen is bij een incident
   * geen belofte maar een verklaring, en die weegt zwaarder tegen je dan het ontbreken ervan.
   *
   * Daarom staat de claim eruit tot de schijf werkelijk versleuteld is. Deze check houdt
   * hem eruit. Zet BitLocker aan (`manage-bde -status E:` moet "Percentage versleuteld:
   * 100,0%" geven), dan mag de zin terug — en dan hoort deze check om te klappen naar
   * `true`, met de datum van de meting erbij.
   */
  ok('EN geen ongecontroleerde claim over een versleutelde back-upschijf',
    /lives on an encrypted disk/i.test(DPA.en), false);
  ok('NL idem', /staat daarom op een versleutelde schijf/i.test(DPA.nl), false);

  /* Wat er wél staat, en dat is wel gemeten: de kopie gaat niet naar een clouddienst, en
     de nachtelijke taak in cron/index.js kijkt of hij niet verouderd is. */
  ok('EN de back-up gaat niet naar een clouddienst', /does not go to a cloud service/i.test(DPA.en), true);
  ok('NL idem', /gaat niet naar een clouddienst/i.test(DPA.nl), true);
  ok('EN en de leeftijd ervan wordt bewaakt', /no older than ten days/i.test(DPA.en), true);
  ok('NL idem', /niet ouder is dan tien dagen/i.test(DPA.nl), true);
}

console.log('\nde nabewerking is lokaal, en dus staan Adobe en Blackmagic niet in de lijst');
{
  /*
   * Software die op de eigen machine draait is geen verwerker; een dienst die het bestand
   * ONTVANGT is dat wel. Dat onderscheid bepaalt de hele lijst van §8, en het valt in het
   * voordeel van VISUAILS uit — dus het hoort er te staan in plaats van weggelaten te
   * worden. Adobe's eigen voorwaarden maken het citeerbaar: voor lokaal opgeslagen
   * materiaal wordt er niet gescand.
   *
   * De keerzijde, en dat is wat deze sectie werkelijk bewaakt: zodra de nabewerking naar
   * een clouddienst gaat — Creative Cloud-opslag daaronder begrepen — is dit een onjuiste
   * bewering én een ontbrekende subverwerker, in één keer. Dan gaat deze check rood, en
   * dat is precies het moment waarop iemand ernaar moet kijken.
   */
  const ADOBE_CITAAT = 'we do not scan or review your Content';
  ok('EN de lokale nabewerking staat er, met citaat', DPA.en.includes(ADOBE_CITAAT), true);
  ok('NL idem', DPA.nl.includes(ADOBE_CITAAT), true);
  for (const [lang, src] of Object.entries(DPA)) {
    ok(`${lang}: Photoshop wordt genoemd`, /Photoshop/.test(src), true);
    ok(`${lang}: DaVinci Resolve ook`, /DaVinci Resolve/.test(src), true);
  }
  ok('EN en het onderscheid staat erbij, niet alleen de conclusie',
    /Software running on our machine processes nothing on our behalf/i.test(DPA.en), true);
  ok('NL idem', /Software die op onze machine draait verwerkt niets namens ons/i.test(DPA.nl), true);

  /*
   * EN NU DE OMGEKEERDE CHECK, over de SUBS-array en niet over de pagina: Adobe en
   * Blackmagic worden in de LOPENDE TEKST genoemd (juist om te zeggen dat ze er niet in
   * staan), dus een check over de hele bron zou altijd slagen. Alleen de array telt.
   */
  const subsBlok = (src) => {
    const start = src.indexOf('const SUBS');
    if (start === -1) return '';
    const einde = src.indexOf('];', start);
    return einde === -1 ? '' : src.slice(start, einde);
  };
  for (const [lang, src] of Object.entries(SRC)) {
    const blok = subsBlok(src);
    ok(`${lang}: de SUBS-array is gevonden`, blok.length > 50, true, `${blok.length} tekens`);
    ok(`${lang}: Adobe staat niet in de subverwerkerslijst`, /Adobe/i.test(blok), false);
    ok(`${lang}: Blackmagic ook niet`, /Blackmagic/i.test(blok), false);
    /* De controle op de controle: de partijen die er WEL in horen zitten in dit blok, want
       anders meet bovenstaande niets meer dan een leesfout. */
    ok(`${lang}: en Freepik zit er wel in`, /Freepik/.test(blok), true);
  }
}

console.log('\nen er staat geen modelnaam op een juridische pagina');
{
  /*
   * Lucas' uitdrukkelijke keuze, en de AVG vraagt het niet: art. 13 lid 1 sub e vraagt de
   * ONTVANGER van de gegevens, niet welk van de tientallen modellen op dat platform de
   * kwaliteit maakt. Dit is de check die het tegenhoudt als iemand later "voor de
   * transparantie" een modelnaam toevoegt — een wijziging die je niet terugdraait nadat
   * een concurrent hem heeft gelezen.
   *
   * Woordgrenzen, zodat "flux" in een gewoon woord geen valse rode regel geeft.
   */
  const MODELLEN = [
    'nano banana', 'seedance', 'seedream', 'flux', 'midjourney', 'stable diffusion',
    'dall-e', 'imagen', 'kling', 'veo', 'sora', 'ideogram', 'recraft',
  ];
  /* Over de HELE bron en niet over de body: een modelnaam die in de SUBS-array of in een
     codecommentaar terechtkomt, staat straks in een diff die iemand publiceert. De
     frontmatter is hier dus even gevoelig als de tekst. */
  const PAGINAS = {
    'vwo en': SRC.en, 'vwo nl': SRC.nl,
    'privacy en': read('src/pages/privacy.astro'), 'privacy nl': read('src/pages/nl/privacy.astro'),
    'terms en': read('src/pages/terms.astro'), 'terms nl': read('src/pages/nl/terms.astro'),
  };
  const gevonden = [];
  for (const [waar, src] of Object.entries(PAGINAS)) {
    for (const m of MODELLEN) {
      if (new RegExp(`\\b${m.replace(/[-.]/g, '\\$&')}\\b`, 'i').test(src)) gevonden.push(`${waar}: ${m}`);
    }
  }
  /* Op het AANTAL en niet op de array: `[] === []` is false, dus de eerste versie van deze
     check stond rood terwijl er niets gevonden was. Dezelfde misgreep als in
     tests/account-invoices.test.mjs eerder deze week — ok() vergelijkt met === en niet
     diep, en dat moet je bij een lijst zelf oplossen. */
  ok('geen enkele modelnaam op de juridische pagina’s', gevonden.length, 0, gevonden.join(' | '));

  /* En de reden staat er wél, want een weigering zonder uitleg leest als iets verbergen. */
  ok('EN legt uit waarom er geen model genoemd wordt', /Which model, we do not say/i.test(PRIV.en), true);
  ok('NL idem', /Welk model, dat zeggen we niet/i.test(PRIV.nl), true);
}

console.log(`\n${pass}/${pass + fail} geslaagd`);
if (fail) process.exit(1);
