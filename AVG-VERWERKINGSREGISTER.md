# Verwerkingsregister — VISUAILS

**Artikel 30 AVG. Laatst bijgewerkt: 12 augustus 2026.**

Dit is een intern document. Het staat niet op de site en hoort daar ook niet:
een register is verantwoordingsdocumentatie voor de toezichthouder en niet
klantcommunicatie. Wat de klant moet weten staat in het
[privacybeleid](src/pages/nl/privacy.astro) en in de
[verwerkersovereenkomst](src/pages/nl/data-processing-agreement.astro).

---

## 0 · Waarom dit er is, en waarom de vrijstelling niet geldt

Art. 30 lid 5 stelt organisaties met minder dan 250 werknemers vrij van de
registerplicht — **tenzij** de verwerking niet incidenteel is, of bijzondere
categorieën betreft, of een risico voor rechten en vrijheden inhoudt.

VISUAILS is een eenmanszaak en zit dus onder die grens. De vrijstelling geldt
alsnog niet, en het is beter dat hier te lezen dan het te moeten uitleggen:
**de verwerking is de kernactiviteit en daarmee per definitie niet
incidenteel.** Elke bestelling brengt persoonsgegevens mee. Wie hier "kleine
onderneming, dus vrijgesteld" leest en dit document weggooit, haalt de enige
onderbouwing weg voor de vraag of er over is nagedacht.

## 1 · De twee rollen, en dat dit register er dus twee delen heeft

Dit is het punt waar een register meestal misgaat, en dus staat het vooraan.

| | Rol van VISUAILS | Over wie | Waar het staat |
|---|---|---|---|
| **Deel A** | verwerkingsverantwoordelijke | de klant zelf en zijn contactpersonen | §3 hieronder |
| **Deel B** | verwerker | de personen die op het aangeleverde beeld staan | §4 hieronder |

De klant is voor deel B de verwerkingsverantwoordelijke. Levert hij een
draagfoto aan waarop een model staat, dan bepaalt hij het doel en wij voeren
uit. Dat onderscheid is de hele reden dat er een verwerkersovereenkomst is.

## 2 · Verantwoordelijke en contact (art. 30 lid 1 sub a)

- **Naam:** VISUAILS, handelsnaam van Lucas Snuverink (eenmanszaak)
- **Vestigings- en postadres:** het adres zoals dat op de juridische pagina's
  van de site staat en in de Pages-secret `SELLER_ADDRESS`. *Niet hier
  ingetypt: dit bestand staat in versiebeheer.*
- **KVK:** 99742993 · **btw:** NL005407575B96
- **Contact voor privacyvragen:** hello@visuails.com
- **Functionaris voor gegevensbescherming:** geen. Niet verplicht op grond van
  art. 37: er is geen overheidstaak, geen grootschalige monitoring en geen
  grootschalige verwerking van bijzondere categorieën.
- **Vertegenwoordiger in de EU (art. 27):** niet van toepassing, VISUAILS is in
  de EU gevestigd.

---

## 3 · DEEL A — waar VISUAILS verantwoordelijke is

### 3.1 Klantadministratie en bestellingen

| Veld | Inhoud |
|---|---|
| **Doel** | een bestelling aannemen, uitvoeren, factureren en de klant erover informeren |
| **Grondslag** | art. 6 lid 1 sub b (uitvoering van de overeenkomst); voor de factuurgegevens art. 6 lid 1 sub c (fiscale bewaarplicht) |
| **Betrokkenen** | de klant, en de contactpersoon bij een klant die een bedrijf is |
| **Gegevens** | naam, bedrijfsnaam, e-mailadres, telefoonnummer, factuuradres, land, btw-nummer, registratienummer, bestelinhoud en correspondentie |
| **Waar** | Cloudflare D1, tabellen `customers`, `orders`, `order_events`, `order_notes`, `messages`, `invoices`, `credit_notes`, `payments` |
| **Ontvangers** | zie §5 |
| **Bewaartermijn** | facturen en de gegevens daarop: **7 jaar** na het boekjaar (art. 52 lid 4 AWR / art. 2:10 BW). Overige bestelgegevens: zolang de klantrelatie loopt, daarna opgeschoond |
| **Doorgifte** | zie §6 |

### 3.2 Toegang tot VISUAILS Studio

| Veld | Inhoud |
|---|---|
| **Doel** | de klant zijn eigen bestellingen, beelden en facturen laten zien |
| **Grondslag** | art. 6 lid 1 sub b |
| **Gegevens** | e-mailadres, een gehashte eenmalige inlogcode of -link, sessietokens (gehasht opgeslagen) |
| **Waar** | D1, tabellen `account_tokens`, `account_sessions`, `order_tokens` |
| **Bewaartermijn** | tokens vervallen automatisch; sessies bij uitloggen of verval |

### 3.3 Betalingen

| Veld | Inhoud |
|---|---|
| **Doel** | een bestelling laten afrekenen en de betaling boeken |
| **Grondslag** | art. 6 lid 1 sub b en sub c |
| **Gegevens** | betaalstatus, bedrag, betaalmethode, een hash van betalersgegevens (`payer_hash`) om een tweede gratis proefvisual te herkennen |
| **Let op** | wij ontvangen en bewaren **geen** kaartnummers en geen IBAN-nummers; die blijven bij de betaalprovider. Van het IBAN wordt alleen een hash bewaard |
| **Bewaartermijn** | 7 jaar, samen met de factuur |

### 3.4 Beveiliging en misbruikbestrijding

| Veld | Inhoud |
|---|---|
| **Doel** | het bestellen, uploaden, inloggen en downloaden beschermen tegen geautomatiseerd misbruik |
| **Grondslag** | art. 6 lid 1 sub f (gerechtvaardigd belang: de dienst overeind houden) |
| **Gegevens** | een **gezouten hash** van het ip-adres, plus een teller en een tijdstip. Geen ruwe ip-adressen |
| **Waar** | D1, tabel `rate_limits` |
| **Bewaartermijn** | het venster van de limiet; de nachtelijke taak veegt op |

### 3.5 Meten van de bestelstroom

| Veld | Inhoud |
|---|---|
| **Doel** | zien op welke stap bezoekers afhaken |
| **Grondslag** | geen persoonsgegevens, dus geen grondslag nodig — en dat is met opzet zo gebouwd |
| **Gegevens** | uitsluitend opgetelde aantallen per dag, stroom, taal en stap. Geen identificator, geen sessie, geen ip-adres, ook niet gehasht |
| **Waar** | D1, tabel `funnel_hits` |
| **Waarom het hier staat** | om vast te leggen dat het is nagegaan. Een teller zonder identificator valt buiten de AVG, en dat is precies waarom er geen cookiebanner en geen regel in het privacybeleid voor nodig is |

### 3.6 Nieuwsbrief en reviewverzoeken

| Veld | Inhoud |
|---|---|
| **Doel** | een aanmelding voor de nieuwsbrief, en na levering vragen of de klant tevreden is |
| **Grondslag** | art. 6 lid 1 sub a (toestemming) voor de nieuwsbrief; art. 6 lid 1 sub f voor het reviewverzoek aan een bestaande klant |
| **Gegevens** | e-mailadres; bij feedback de score en de tekst die de klant zelf schrijft |
| **Waar** | D1, tabellen `subscribers`, `order_feedback` |
| **Bewaartermijn** | tot afmelding; een openbaar geplaatste review blijft staan zolang de klant dat wil |

### 3.7 Adminportaal

| Veld | Inhoud |
|---|---|
| **Doel** | de studio zijn eigen werk laten doen, en vastleggen wie wat wanneer heeft gewijzigd |
| **Grondslag** | art. 6 lid 1 sub f |
| **Gegevens** | gebruikersnaam en gehasht wachtwoord van de beheerder, sessietokens (gehasht), en een handelingenlogboek |
| **Waar** | D1, tabellen `admin_users`, `admin_sessions`, `admin_log` |

---

## 4 · DEEL B — waar VISUAILS verwerker is

Art. 30 lid 2 vraagt van een verwerker een kortere lijst, en die staat hier
compleet.

| Veld | Inhoud |
|---|---|
| **Verwerkingsverantwoordelijke** | de klant. Per bestelling vastgelegd in `orders` |
| **Categorieën verwerking** | ontvangen, opslaan, uitsnijden, bewerken en aanpassen van aangeleverd beeldmateriaal; het aanbieden ervan aan de subverwerker die de visual genereert; het opleveren van het resultaat aan de klant; het verwijderen ervan na de termijn |
| **Betrokkenen** | de personen die op het aangeleverde materiaal staan: doorgaans een model, een medewerker, of de klant zelf |
| **Gegevens** | beeltenis. **Geen** bijzondere categorieën (art. 9): daar wordt niet om gevraagd, en een gezicht op een foto is geen biometrisch gegeven zolang de verwerking niet op unieke identificatie is gericht — en dat is zij niet |
| **Waar** | Cloudflare R2 (het materiaal), D1 (`files`, `file_assets`, de verwijzingen) |
| **Bewaartermijn** | bronmateriaal `UPLOAD_DAYS` dagen na afsluiten van de bestelling; geleverde beelden `DELIVERY_MONTHS` maanden na levering. **De getallen staan hier niet ingetypt** — ze staan in `src/lib/retention.js` en `tests/register.test.mjs` controleert dat dit document en die constante niet uit elkaar lopen |
| **Uitvoering** | een nachtelijke taak (`cron/index.js`) verwijdert wat verlopen is, uit R2 én uit D1, en schrijft op de tijdlijn van de bestelling wat er weg is |
| **Subverwerkers** | zie §5 |
| **Doorgifte** | zie §6 |
| **Beveiliging** | zie §7 |
| **Instructie** | de bestelling zelf — het formulier, de briefing en de correspondentie erover. Er is geen andere |

---

## 5 · Ontvangers (art. 30 lid 1 sub d)

**Subverwerkers voor het beeldmateriaal** — dit is dezelfde lijst als in §8 van
de verwerkersovereenkomst, en dat moet zo blijven:

| Wie | Waar | Waarvoor |
|---|---|---|
| Freepik Company, S.L.U. | Málaga, Spanje (EU) | het genereren van de visuals |
| Cloudflare, Inc. | Verenigde Staten, met opslag in de EU | opslag en het draaien van de site |
| Resend | Verenigde Staten | e-mail; de bestelmelding aan de studio draagt het materiaal als bijlage |

**Verwerkers voor de gegevens waarvoor wij zelf verantwoordelijke zijn:**

| Wie | Waarvoor |
|---|---|
| Mollie B.V. (Amsterdam) | betalingen |
| Cloudflare, Inc. | database en hosting |
| Resend | transactionele e-mail |
| Google (Business Profile) en Trustpilot | uitsluitend wanneer de klant zelf op een reviewknop klikt; wij sturen daar geen gegevens naartoe |

**Welk AI-model er binnen het platform van de subverwerker wordt gebruikt, staat
hier niet, en dat is een bewuste keuze** — zie de noot in §8 van de
verwerkersovereenkomst. Art. 30 vraagt de *categorieën ontvangers*, en de
ontvanger is het platform. Het model is gereedschap van die ontvanger.

**Wat géén ontvanger is:** de nabewerking gebeurt lokaal in Photoshop en DaVinci
Resolve, op een eigen machine. Adobe en Blackmagic Design ontvangen het
materiaal dus niet en staan daarom niet in deze lijst.
Software die op de eigen machine draait verwerkt niets namens ons; een dienst die
het bestand ontvangt doet dat wel.

## 6 · Doorgifte buiten de EER (art. 30 lid 1 sub e)

| Naar wie | Grondslag |
|---|---|
| Cloudflare, Inc. (VS) | verwerkersovereenkomst met standaardcontractbepalingen (art. 46 lid 2 sub c). Opslag is ingesteld op de EU |
| Resend (VS) | verwerkersovereenkomst met standaardcontractbepalingen |
| modelaanbieders buiten de EER, via Freepik | Freepik sluit daarvoor zelf standaardcontractbepalingen; wij dragen niet zelf over |

Freepik zelf is in Spanje gevestigd, dus op dat niveau is er geen doorgifte.

## 7 · Beveiligingsmaatregelen (art. 30 lid 1 sub g, art. 32)

Hieronder staat wat er werkelijk is en niets meer. **Niet** aanwezig: een
ISO-certificering, een pentest, een managementsysteem voor
informatiebeveiliging. Een register dat meer opschrijft dan er staat, is het
document dat bij een incident tegen je wordt gebruikt.

- TLS voor al het verkeer; R2 en D1 versleuteld in rust
- aangeleverd materiaal onder een sleutel met een willekeurige component, geen
  doorlopende nummering waarlangs iemand kan lopen
- adminportaal met gehasht wachtwoord en gehashte sessietokens
- klantportaal met eenmalige inloglink of -code, cookies `HttpOnly` en `Secure`,
  beperkt tot het pad van het dashboard
- een eigendomscontrole bij elke download, gebonden aan de bestelling en niet aan
  het webadres, met een test die die controle bewust probeert te ondermijnen
- snelheidslimieten op bestellen, uploaden, inloggen en opvragen
- gezouten hashes in plaats van ruwe ip-adressen
- bewaartermijnen die door een nachtelijke taak worden uitgevoerd en niet alleen
  belooft
- een wekelijkse kopie van de database op een schijf die wij zelf beheren; niet
  in een clouddienst, niet in een gedeelde map, niet in de
  versiebeheergeschiedenis. Een nachtelijke controle waarschuwt als die kopie
  ouder dan tien dagen wordt

**Openstaand punt, en het hoort hier te staan:** de schijf waarop die back-up
staat is op 12 augustus 2026 nog niet versleuteld. Zodra BitLocker aan staat
(`manage-bde -status E:` geeft dan 100%), gaat die regel hierboven erbij en
mag §7 van de verwerkersovereenkomst het weer beweren. Een openstaand punt in
een register is verantwoording; een dichtgeschreven punt dat niet waar is, is
een verklaring waar je op afgerekend wordt.

## 8 · Waar dit document van afhangt

Wijzigt een van deze dingen, dan wijzigt dit register mee — en `npm run
test:register` gaat rood als dat niet gebeurt:

- `src/lib/retention.js` — de twee bewaartermijnen
- `src/pages/nl/data-processing-agreement.astro` — de lijst subverwerkers
- `schema.sql` — de tabellen waarin persoonsgegevens staan

Beoordelen: bij elke wezenlijke wijziging in wat er wordt verwerkt, en in ieder
geval één keer per jaar.
