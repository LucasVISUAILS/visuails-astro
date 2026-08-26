/*
 * ═══════════════════════════════════════════════════════════════════════════════
 * HET VERWERKINGSREGISTER EN DE DATALEKPROCEDURE — TEGEN DE CODE GEHOUDEN
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Een verwerkingsregister is het makkelijkste document om te schrijven en het
 * makkelijkste om te laten verlopen. Het wordt één keer opgesteld, er wordt één
 * keer naar gekeken, en daarna verandert de code eronder. Bij een controle is een
 * register dat NIET klopt slechter dan geen register: het is een verklaring over
 * je eigen verwerking waarvan aantoonbaar is dat hij onjuist is.
 *
 * Dit bestand koppelt het register daarom aan de drie dingen die eronder kunnen
 * schuiven, en die alle drie in deze codebase al één keer zijn geschoven:
 *
 *   1 · DE BEWAARTERMIJNEN. Ze stonden op vier pagina's ingetypt en zijn deze week
 *       naar src/lib/retention.js gehaald. Het register typt ze dus ook niet: het
 *       noemt de CONSTANTE bij naam, en deze test controleert dat het document geen
 *       eigen kopie van het getal bevat. Zelfde regel als in tests/legal.test.mjs.
 *
 *   2 · DE LIJST SUBVERWERKERS. Art. 30 lid 1 sub d vraagt de ontvangers, en die
 *       lijst staat óók in §8 van de verwerkersovereenkomst. Twee lijsten die uit
 *       elkaar lopen is precies het geval waarin de klant iets anders leest dan de
 *       toezichthouder — en dan is er geen versie die je nog kunt verdedigen.
 *
 *   3 · DE TABELLEN. Het register wijst per verwerking de tabellen aan waar de
 *       gegevens staan. Verdwijnt of verschijnt er een tabel met persoonsgegevens,
 *       dan hoort het register mee te bewegen; deze test houdt vast dat de tabellen
 *       die het register noemt in schema.sql bestaan.
 *
 * ── EN ÉÉN INHOUDELIJKE BEWAKING ────────────────────────────────────────────
 *
 * De datalekprocedure moet blijven zeggen dat een VERWERKER aan de KLANT meldt en
 * niet aan de Autoriteit Persoonsgegevens (art. 33 lid 2). Dat is de fout die een
 * leverancier met de beste bedoelingen maakt — zelf melden voelt behulpzaam — en
 * het is een melding namens iemand anders over een risico dat je niet hebt
 * beoordeeld. Als iemand die procedure ooit "vereenvoudigt", hoort dit rood te gaan.
 */
import { readFileSync, existsSync } from 'node:fs';
import { UPLOAD_DAYS, DELIVERY_MONTHS } from '../src/lib/retention.js';

let pass = 0;
let fail = 0;
function ok(name, got, want = true, shown) {
  const good = got === want;
  if (good) pass++; else fail++;
  console.log(`${good ? ' ok  ' : ' FAIL'} ${name.padEnd(62)}${good ? '' : `verwacht ${JSON.stringify(want)} kreeg ${JSON.stringify(shown ?? got)}`}`);
}
const read = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8');

console.log('\nVISUAILS — het verwerkingsregister en de datalekprocedure\n');

const REG = read('AVG-VERWERKINGSREGISTER.md');
const LEK = read('AVG-DATALEKPROCEDURE.md');

console.log('beide documenten bestaan en staan in de repository');
{
  ok('het register is er', REG.length > 3000, true, `${REG.length} tekens`);
  ok('de datalekprocedure is er', LEK.length > 2000, true, `${LEK.length} tekens`);
  /* NIET op de site. Een register is verantwoordingsdocumentatie voor de
     toezichthouder; het publiceren zou een lijst interne tabelnamen en een
     openstaand beveiligingspunt op straat leggen. */
  ok('het register is geen pagina', existsSync(new URL('../src/pages/verwerkingsregister.astro', import.meta.url)), false);
  ok('de procedure ook niet', existsSync(new URL('../src/pages/datalek.astro', import.meta.url)), false);
}

console.log('\nde twee rollen staan erin, want daar gaat het meestal mis');
{
  ok('het register onderscheidt verantwoordelijke en verwerker',
    /verwerkingsverantwoordelijke/.test(REG) && /\bverwerker\b/.test(REG), true);
  ok('met een deel A en een deel B', /DEEL A/.test(REG) && /DEEL B/.test(REG), true);
  /* Hoofdletters: het document schrijft "Art. 30 lid 2" aan het begin van een
     tabelregel en "art. 30 lid 2" midden in een zin. De eerste versie van deze drie
     regels was hoofdlettergevoelig en ging rood op een document dat in orde was --
     de meting was mis, niet de tekst. */
  ok('en art. 30 lid 2 voor de verwerkerskant', /art\. 30 lid 2/i.test(REG), true);
  /* Art. 30 lid 5 zondert kleine organisaties uit, en een eenmanszaak valt onder
     die grens. Dat de uitzondering hier NIET geldt moet in het document staan,
     want anders leest de volgende lezer "kleine onderneming, dus vrijgesteld". */
  ok('en de reden waarom de vrijstelling van lid 5 niet geldt',
    /art\. 30 lid 5/i.test(REG) && /niet incidenteel/.test(REG), true);
}

console.log('\nde bewaartermijnen staan niet ingetypt');
{
  ok('het register noemt UPLOAD_DAYS bij naam', /UPLOAD_DAYS/.test(REG), true);
  ok('en DELIVERY_MONTHS', /DELIVERY_MONTHS/.test(REG), true);
  ok('en wijst naar retention.js', /src\/lib\/retention\.js/.test(REG), true);
  /*
   * DE OMGEKEERDE CHECK, en dit is degene die het werk doet. Een register dat "90
   * dagen" typt naast de variabele is hoe de twee alsnog uit elkaar lopen -- en dan
   * staat er in een verantwoordingsdocument een andere termijn dan de nachtelijke
   * taak uitvoert.
   */
  ok(`geen ingetypte ${UPLOAD_DAYS} dagen`, new RegExp(`${UPLOAD_DAYS} dagen`).test(REG), false);
  ok(`geen ingetypte ${DELIVERY_MONTHS} maanden`, new RegExp(`${DELIVERY_MONTHS} maanden`).test(REG), false);
  /* De fiscale termijn mag wél ingetypt: 7 jaar staat in art. 52 lid 4 AWR en niet
     in onze code, dus daar is geen constante om naar te wijzen. */
  ok('de fiscale bewaarplicht van 7 jaar staat er wel', /7 jaar/.test(REG), true);
  ok('met het artikel erbij', /AWR/.test(REG), true);
}

console.log('\nde lijst subverwerkers is dezelfde als in de verwerkersovereenkomst');
{
  /* Uit de SUBS-array van de overeenkomst en niet uit de lopende tekst: de namen
     staan daar in de frontmatter. Zie de noot bij dezelfde aanpak in
     tests/legal.test.mjs. */
  const DPA = read('src/pages/nl/data-processing-agreement.astro');
  const blok = (() => {
    const start = DPA.indexOf('const SUBS');
    const einde = DPA.indexOf('];', start);
    return start === -1 || einde === -1 ? '' : DPA.slice(start, einde);
  })();
  ok('de SUBS-array is gevonden', blok.length > 50, true, `${blok.length} tekens`);

  const namen = [...blok.matchAll(/naam: '([^']+)'/g)].map((m) => m[1]);
  ok('er staan drie subverwerkers in de overeenkomst', namen.length, 3, namen.join(' | '));

  /*
   * ── IN DE JUISTE TABEL, EN NIET ERGENS IN HET DOCUMENT ─────────────────────
   *
   * De eerste versie hiervan deed `REG.includes(naam)` over het hele register. Bij de
   * mutatietest bleef die groen terwijl Resend uit de subverwerkerstabel was gehaald --
   * de naam staat namelijk ook in de tweede tabel van Sectie 5 en in Sectie 7. Een check
   * die overal mag kijken, bewijst niets over de plek waar het om gaat.
   *
   * Dus wordt eerst het STUK tussen de twee kopjes van Sectie 5 geknipt: alleen de
   * tabel met de subverwerkers voor het beeldmateriaal telt. Dat is de lijst die
   * gelijk moet zijn aan Sectie 8 van de verwerkersovereenkomst.
   */
  const subsSectie = (() => {
    const start = REG.indexOf('Subverwerkers voor het beeldmateriaal');
    const einde = REG.indexOf('**Verwerkers voor de gegevens', start);
    return start === -1 || einde === -1 ? '' : REG.slice(start, einde);
  })();
  ok('de subverwerkerstabel van het register is gevonden', subsSectie.length > 100, true,
    `${subsSectie.length} tekens`);
  for (const naam of namen) {
    ok(`de subverwerkerstabel noemt ${naam}`, subsSectie.includes(naam), true);
  }
  /* En de tegenhanger: Mollie mag daar juist NIET in staan, want die raakt het
     beeldmateriaal niet. Zonder deze regel zou een tabel waarin alles staat ook
     slagen. */
  ok('en Mollie staat niet in die tabel', /Mollie/.test(subsSectie), false);

  /* En de andere kant op: Mollie hoort NIET bij de subverwerkers voor beeld, maar
     wel bij de verwerkers voor de gegevens waarvoor wij zelf verantwoordelijke
     zijn. Het register moet dat onderscheid maken en niet één lijst zijn. */
  ok('het register noemt Mollie apart', /Mollie B\.V\./.test(REG), true);
  ok('en Mollie staat niet in de subverwerkerslijst van de overeenkomst',
    /Mollie/.test(blok), false);

  /* Adobe en Blackmagic staan in geen van beide, want de nabewerking is lokaal.
     Het register legt dat uit in plaats van het weg te laten -- een lezer die zich
     afvraagt waar Photoshop blijft, hoort het antwoord te vinden. */
  ok('het register legt uit waarom Adobe er niet in staat', /Adobe/.test(REG), true);
  ok('en noemt het onderscheid dat dat bepaalt',
    /Software die op de eigen machine draait verwerkt niets namens ons/.test(REG), true);
}

console.log('\nde tabellen die het register noemt bestaan echt');
{
  const SCHEMA = read('schema.sql');
  const bestaand = new Set(
    [...SCHEMA.matchAll(/CREATE TABLE (?:IF NOT EXISTS )?([a-z_]+)/g)].map((m) => m[1])
  );
  ok('schema.sql levert tabellen op', bestaand.size > 15, true, String(bestaand.size));

  /* De tabelnamen staan in het register tussen backticks. Alles wat op een
     tabelnaam lijkt en niet bestaat, is een verwijzing naar iets wat er niet meer
     is -- en dat is precies de manier waarop een register stilletjes onwaar wordt. */
  /* ── EEN KOLOMNAAM IS GEEN SPOOKTABEL — 26 augustus 2026 ─────────────────
     Het register noemt sinds vandaag ook kolommen tussen backticks, omdat §3.7 t/m
     §3.9 uitleggen wat er ín een tabel staat: `snapshot_json`, `customer_id`,
     `preview_key`. Die zijn hier onder de oude regel als "genoemde tabel die niet
     bestaat" gelezen. Alles wat een KOLOM is in schema.sql valt daarom af — dat is
     preciezer dan de namen één voor één op de uitzonderingslijst zetten, en het
     blijft kloppen als het register morgen een andere kolom noemt. */
  const kolommen = new Set([
    ...[...SCHEMA.matchAll(/^\s*([a-z_]{3,})\s+(?:TEXT|INTEGER|REAL|BLOB|NUMERIC)/gm)].map((m) => m[1]),
    ...[...SCHEMA.matchAll(/ADD COLUMN ([a-z_]+)/g)].map((m) => m[1]),
  ]);
  const genoemd = [...REG.matchAll(/`([a-z_]{4,})`/g)].map((m) => m[1]);
  const tabelachtig = [...new Set(genoemd)].filter((n) => n.includes('_') || bestaand.has(n));
  const spook = tabelachtig.filter((n) => !bestaand.has(n)
    && !kolommen.has(n)
    // niet elke naam met een liggend streepje is een tabel: dit zijn de
    // uitzonderingen die het register om andere redenen noemt.
    && !['payer_hash', 'manage-bde', 'SELLER_ADDRESS', 'NOTIFY_EMAIL', 'test_register'].includes(n));
  ok('elke genoemde tabel bestaat in schema.sql', spook.length, 0, spook.join(', '));
  /* En de controle op de controle: het register noemt er werkelijk een aantal, want
     anders meet bovenstaande niets. */
  ok('en het register noemt er meer dan tien', tabelachtig.filter((n) => bestaand.has(n)).length > 10, true,
    String(tabelachtig.filter((n) => bestaand.has(n)).length));
}

/*
 * ── EN DE ANDERE KANT OP — 26 AUGUSTUS 2026 ─────────────────────────────────
 *
 * De controle hierboven loopt van het REGISTER naar het SCHEMA: noemt het register
 * een tabel die niet bestaat? Dat vangt een verwijderde tabel.
 *
 * Het vangt niet wat er werkelijk gebeurde. Tussen 12 en 20 augustus kwamen er acht
 * tabellen bij met persoonsgegevens erin — `subscriptions`, `plan_queue`,
 * `email_changes`, `subscription_invoices` en vier oudere — en het register bleef
 * ongewijzigd. Deze toets bleef groen, want elke naam die er WEL in stond bestond
 * nog steeds. §8 van het register belooft intussen letterlijk: *"`npm run
 * test:register` gaat rood als dat niet gebeurt"*. Dat was de gevaarlijkste zin van
 * de twee documenten, want hij is de reden dat niemand het register nakijkt.
 *
 * ── HOE "BEVAT PERSOONSGEGEVENS" HIER WORDT BEPAALD ────────────────────────
 *
 * Aan de KOLOMMEN en niet aan een lijst die iemand bijhoudt — een lijst die je met
 * de hand bijwerkt, is precies het ding dat hier stuk ging. Een tabel telt mee als
 * hij een kolom heeft die naar een mens wijst: `customer_id`, een e-mailadres, een
 * naam, een adres, een btw-nummer, een gezouten IP, of een `snapshot_json` (daar
 * staat een factuuradres in).
 *
 * Dat is met opzet RUIM. Een valse melding kost één regel in het register; een
 * gemiste tabel is een register dat de verwerking niet beschrijft, en dat is art. 30
 * lid 1 sub b en c. Vind je een tabel die er echt niet in hoort, zet hem dan in
 * GEEN_PERSOON hieronder mét de reden — niet in stilte.
 */
console.log('\nelke tabel met persoonsgegevens staat in het register');
{
  const SCHEMA = read('schema.sql');
  const PERSOON = /\b(customer_id|email|previous_email|new_email|full_name|ip_hash|request_ip_hash|payer_hash|snapshot_json|vat_number|vat_check_name|address|phone)\b/;

  /* Tabellen die een persoonskolom hebben en er tóch niet in hoeven, met de reden.
     Leeg zolang er geen is: elke uitzondering hier is een stukje register dat niet
     meer door deze toets wordt gedekt. */
  const GEEN_PERSOON = {};

  const blokken = [...SCHEMA.matchAll(/CREATE TABLE (?:IF NOT EXISTS )?([a-z_]+)\s*\(([\s\S]*?)\n\);/g)];
  ok('schema.sql levert tabellen op om te wegen', blokken.length > 20, true, String(blokken.length));

  const metPersoon = blokken
    .map(([, naam, body]) => [naam, body.replace(/--[^\n]*/g, '')])
    .filter(([, kaal]) => PERSOON.test(kaal))
    .map(([naam]) => naam)
    .filter((naam) => !(naam in GEEN_PERSOON));

  /* De controle op de controle: vindt hij er werkelijk een stel, of meet hij niets? */
  ok('en er zijn tabellen met persoonsgegevens gevonden', metPersoon.length > 8, true, String(metPersoon.length));

  const ongenoemd = metPersoon.filter((naam) => !new RegExp('`' + naam + '`').test(REG));
  /* ok() vergelijkt met ===, dus een array moet als tekst worden aangeboden —
     anders is hij nooit gelijk aan [] en gaat deze regel altijd rood, óók als er
     niets ontbreekt. */
  ok('elke tabel met persoonsgegevens wordt in het register genoemd',
     ongenoemd.join(', '), '', ongenoemd.join(', ') || '(geen)');
}

console.log('\nde datalekprocedure houdt de rollen gescheiden');
{
  /*
   * DE BELANGRIJKSTE CHECK VAN DIT BESTAND. Art. 33 lid 2: een verwerker meldt aan
   * de VERWERKINGSVERANTWOORDELIJKE. Zelf naar de AP stappen voelt behulpzaam en is
   * onjuist -- dan doe je een melding namens iemand anders over een risico dat je
   * niet hebt beoordeeld. Deze regel is wat een latere "vereenvoudiging" van dit
   * document moet laten omvallen.
   */
  ok('als verwerker melden wij aan de klant', /melden wij het \*\*aan de klant\*\*/.test(LEK), true);
  ok('en uitdrukkelijk niet aan de AP',
    /niet aan de Autoriteit\s*\n?\s*Persoonsgegevens/.test(LEK), true);
  ok('met art. 33 lid 2 erbij', /art\. 33 lid 2|Art\. 33 lid 2/.test(LEK), true);
  ok('en de klant beslist zelf over zijn eigen melding', /dat is zijn afweging/.test(LEK), true);

  ok('als verantwoordelijke geldt 72 uur', /72 uur/.test(LEK), true);
  ok('en bij hoog risico ook de betrokkenen zelf', /art\. 34/.test(LEK), true);
  ok('een lek zonder risico wordt niet gemeld maar wél vastgelegd',
    /art\. 33 lid 5/.test(LEK), true);
  ok('en dat geldt voor elk lek', /voor \*\*elk\*\* lek/.test(LEK), true);
  ok('melden in fasen mag, met het artikel erbij', /art\. 33 lid 4/.test(LEK), true);
  /* De vier vragen van art. 33 lid 3 horen erin te staan als LIJST, want dat is wat
     je bij een melding invult en niet iets wat je dan nog wilt opzoeken. */
  ok('de vier vragen van lid 3 staan erin', /art\. 33 lid 3/.test(LEK), true);
  /*
   * DE TERMIJN KOMT UIT DE OVEREENKOMST EN IS DAAR OVERGENOMEN, NIET BEDACHT.
   *
   * De eerste versie van de procedure zei 48 uur en schreef dat toe aan Sectie 10 van
   * de verwerkersovereenkomst. Daar staat 24 uur. Dat is geen detail: het document dat
   * de klant heeft aanvaard belooft de striktere termijn, en een interne procedure die
   * een ruimere termijn noemt is een procedure die je je eigen belofte laat missen.
   *
   * Vandaar dat deze check BEIDE kanten toetst -- het getal in de procedure, en dat
   * hetzelfde getal in de overeenkomst staat. Wijzigt er een van de twee, dan gaat dit
   * rood in plaats van dat de twee stil uit elkaar lopen.
   */
  const TERMIJN = '24 uur';
  ok('de termijn naar de klant is concreet', LEK.includes(TERMIJN), true);
  ok('en die staat ook in de verwerkersovereenkomst',
    read('src/pages/nl/data-processing-agreement.astro').includes('<strong>binnen ' + TERMIJN + '</strong>'), true);
  ok('en de procedure noemt de overeenkomst als bron',
    /uit .10 van de overeenkomst overgenomen en niet[\s\S]{0,4}zelf bedacht/.test(LEK), true);
}

console.log('\nbeide documenten benoemen het openstaande punt in plaats van het weg te schrijven');
{
  /*
   * De back-upschijf is nog niet versleuteld. Dat staat in beide documenten, en het
   * is de tegenhanger van de zin die op 12 augustus 2026 uit §7 van de
   * verwerkersovereenkomst is gehaald omdat hij niet gecontroleerd was.
   *
   * Een openstaand punt in een register is verantwoording. Een dichtgeschreven punt
   * dat niet waar is, is een verklaring waar je op afgerekend wordt. Deze checks
   * horen om te klappen zodra BitLocker aan staat -- en dan hoort de tekst mee te
   * veranderen, niet alleen de test.
   */
  ok('het register noemt de onversleutelde back-upschijf', /nog niet versleuteld/.test(REG), true);
  ok('met de controle die het antwoord geeft', /manage-bde -status E:/.test(REG), true);
  ok('de procedure benoemt hem als het grootste risico', /nog niet versleuteld/.test(LEK), true);
  ok('en legt uit waarom versleuteling het van een lek een non-lek maakt',
    /geen risico voor\s*\n?betrokkenen/.test(LEK), true);
  /* En het tweede risico, dat minder opvalt: de bestelmelding aan de studio draagt
     het klantmateriaal als bijlage. Eén verkeerd ontvangstadres is dan een lek van
     materiaal en niet van een melding. */
  ok('de procedure benoemt de bijlage in de bestelmelding', /als bijlage/.test(LEK), true);
  ok('met de secret waar dat adres in staat', /NOTIFY_EMAIL/.test(LEK), true);
}

console.log('\nen er staat geen adres en geen modelnaam in');
{
  /* Deze bestanden staan in versiebeheer. Het vestigingsadres hoort daarom in de
     Pages-secret en niet hier -- zelfde regel als de repofallback in invoice.js,
     die op Voorbeeldstraat 12 staat. */
  ok('het register typt het vestigingsadres niet in', /Vaarwerkhorst/.test(REG), false);
  ok('de procedure ook niet', /Vaarwerkhorst/.test(LEK), false);
  ok('het register wijst naar de secret', /SELLER_ADDRESS/.test(REG), true);

  /* En dezelfde bewaking als op de juridische pagina's: geen modelnamen. Een
     register is intern, maar het staat in een repository waarvan een diff
     gepubliceerd kan worden. */
  const MODELLEN = ['nano banana', 'seedance', 'seedream', 'flux', 'midjourney',
    'stable diffusion', 'dall-e', 'imagen', 'kling', 'veo', 'sora', 'ideogram', 'recraft'];
  const gevonden = [];
  for (const [waar, src] of Object.entries({ register: REG, procedure: LEK })) {
    for (const m of MODELLEN) {
      if (new RegExp(`\\b${m.replace(/[-.]/g, '\\$&')}\\b`, 'i').test(src)) gevonden.push(`${waar}: ${m}`);
    }
  }
  ok('geen modelnaam in beide documenten', gevonden.length, 0, gevonden.join(' | '));
  ok('en het register legt uit waarom dat een keuze is',
    /Welk AI-model/.test(REG), true);
}

console.log(`\n${pass}/${pass + fail} geslaagd`);
if (fail) process.exit(1);
