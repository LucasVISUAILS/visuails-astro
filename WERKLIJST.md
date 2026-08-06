# VISUAILS — werklijst

Opgesteld 6 augustus 2026. Dit is een werkbestand, geen rapport: streep door wat af is en laat het staan, dan zie je over twee weken nog wat je gedaan hebt.

**Afvinken:** zet een `x` tussen de haakjes — `- [x]` — dan verschijnt er een vinkje in VS Code, GitHub en de meeste markdown-viewers. Helemaal afgerond en niet meer relevant? Zet er `~~` omheen: `- [x] ~~oude taak~~` wordt doorgestreept.

**Markering:** 🔴 blokkeert iets anders · 🟡 kost geld of is een besluit · 🟢 gewoon doen

---

## 0 · Eerst, want de rest wacht erop

- [ ] 🔴 `npm run build` draaien en deployen. Alles van vandaag staat nog alleen op je schijf: het nieuwe logo in de topbar, de favicon, het mail-briefhoofd, en de drie servicepagina's
- [ ] 🔴 Na de deploy: `https://visuails.com/favicon.ico` en `/img/mail/mark-groen.png` openen in je browser om te zien dat ze laden
- [ ] 🔴 Search Console → URL-inspectie op `https://visuails.com/` → Indexering aanvragen. Daarna hetzelfde voor `https://www.visuails.com/`, zodat Google de 301 tegenkomt
- [ ] Migratie `0008` draaien tegen remote D1 (idempotent, dus twee keer draaien kan geen kwaad)
- [ ] Wrangler-autorisatie fixen — de 7403 blokkeert `npm run fetch:order` en het draaien van migraties vanaf de CLI
- [ ] Rond 11 augustus: DMARC-rapporten bekijken en beslissen of `p=quarantine` aan kan

---

## 1 · Teksten en merkboodschap

### De hoofdboodschap

- [ ] 🟡 "The brand you envisioned, visualized" vervangen. Je hebt gelijk dat hij ongemakkelijk zit: het is een woordspeling op de merknaam die zichzelf uitlegt, en zodra je hem één keer doorhebt zegt hij niets meer over wat je verkoopt
- [ ] Kiezen wat de kop moet dóén — de drie opties zijn niet uitwisselbaar:
  - [ ] Uitkomst beloven ("je hele assortiment ziet eruit als één merk")
  - [ ] Bezwaar wegnemen ("fotoshootkwaliteit, zonder shoot")
  - [ ] Contrast neerzetten (wat je nu doet vs. wat het kost)
- [ ] Nieuwe kop doortrekken naar `<title>`, og:image-tekst en de mailonderwerpen, anders staat de oude er over drie maanden nog ergens

### Nederlandse teksten nalopen

- [ ] 🟡 Beslissen of de NL-teksten een eigen stem krijgen of vertalingen blijven (zie de notitie hieronder — dit is de kern van het probleem)
- [ ] Tone-of-voice-document schrijven in de repo: vijf regels over aanspreekvorm, zinslengte, welke woorden nooit, en drie stukken tekst die je goed vindt als voorbeeld
- [ ] `/nl/catalog`, `/nl/lifestyle`, `/nl/video` herschrijven met dat document ernaast
- [ ] `/nl` homepage, `/nl/pricing`, `/nl/how-it-works`, `/nl/faq` idem
- [ ] De mails in het Nederlands nalopen — die zijn vandaag nieuw en met dezelfde methode geschreven, dus met dezelfde stijfheid
- [ ] Foutmeldingen en formulierteksten nalopen; die worden altijd vergeten en worden juist gelezen op het moment dat iemand geïrriteerd is

> **Waarom het NL stijf leest.** Het ligt niet aan de taal maar aan de volgorde waarin het gemaakt is: elke pagina is eerst in het Engels geschreven en daarna zin voor zin naar het Nederlands gezet, met een structuurcontrole die de twee versies tag-voor-tag identiek houdt. Die controle is goed voor de opmaak en slecht voor het proza — het Nederlands erft de Engelse zinsbouw. Vandaar dingen als *"Het is ook waar een klein merk stilletjes gevestigd begint te ogen"*, wat een letterlijke afdruk is van *"It is also where a small brand quietly starts to look established"*. Geen Nederlander zegt dat zo.
>
> Wat helpt is niet een koppeling maar een bron: een kort document met jouw stem erin plus drie stukken tekst die jij goed vindt. Dan schrijf ik het Nederlands als origineel in plaats van als vertaling. Dat mag ook andersom — NL eerst, EN erachteraan — want jouw klanten zijn grotendeels Nederlands.

---

## 2 · Betalen, btw en abonnementen

### Kan Mollie abonnementen?

Ja. Mollie heeft een Subscriptions API bovenop mandaten: je laat de klant één keer betalen met `sequenceType: "first"`, daaruit rolt een mandaat, en daarna incasseer je periodiek zonder dat de klant iets hoeft te doen. iDEAL en Bancontact maken een SEPA-incassomandaat aan; creditcard maakt een creditcardmandaat. Alleen SEPA-incasso en creditcard staan standaard aan.

- [ ] Nagaan of Recurring op jouw Mollie-account is vrijgegeven (het moet apart aangezet worden)
- [ ] Eerste betaling met `sequenceType: "first"` inbouwen, klant-record aanmaken, mandaat opslaan
- [ ] Webhook afhandelen voor mislukte incasso's — Mollie probeert tot vijf keer opnieuw en zet de boel daarna stil, en jouw kant moet weten dat dat gebeurd is
- [ ] Opzeggen en pauzeren inbouwen, plus wat er met resterende credits gebeurt bij opzegging

> **De belangrijkste beperking:** de Subscriptions API is voor **vaste bedragen**. Variabel per maand kan er niet op. Dat is voor jou geen probleem maar juist het antwoord: het abonnement is een vast maandbedrag, en de credits zijn een tabel in je eigen database. Mollie int, jij telt.

### Btw

- [ ] 🟡 Beslissen: bij Mollie blijven of naar Stripe. Mollie rekent geen btw voor je uit — bepalen, tonen en factureren is jouw verantwoordelijkheid. Stripe Tax doet dat wel, tegen een percentage per transactie
- [ ] Zolang je bij Mollie blijft: de verlegging-op-de-factuur-route netjes dichttimmeren. Nu betaalt iedereen 21% en wordt een geldig EU-btw-nummer achteraf rechtgezet, wat klopt maar handwerk is
- [ ] Btw-nummers valideren via VIES bij het bestellen in plaats van achteraf
- [ ] 🟡 De €0,99 proefvisual: als het een échte visual is die de klant krijgt, is het een levering tegen vergoeding en hoort er btw op. Wil je puur verifiëren dat een kaart geldig is, dan is een **€0-eerste betaling** de schone route — Mollie staat dat toe voor creditcard en PayPal, en dan is er geen levering en dus geen btw-vraag
- [ ] Factuurnummering en bewaarplicht regelen (doorlopend genummerd, zeven jaar)

> Ik ben geen belastingadviseur. Bovenstaande is hoe de systemen werken, niet wat jij fiscaal moet doen — laat de btw-behandeling van de proefvisual en de verlegging één keer bevestigen door je boekhouder, dat is een half uur dat je later dubbel terugverdient.

---

## 3 · Creditsysteem

Het model: een abonnement is een vast maandbedrag bij Mollie, en de credits zijn van jou. Drie tabellen en je bent er.

- [ ] Datamodel ontwerpen: `subscriptions`, `credit_balances`, `credit_ledger` (elke mutatie een regel, nooit een saldo overschrijven)
- [ ] Per soort apart tellen — catalogproducten, lifestyleproducten, videoclips — want ze kosten niet hetzelfde
- [ ] 🟡 Beslissen wat er aan het eind van de maand gebeurt: vervallen, doorrollen, of doorrollen met een plafond
- [ ] Bestelformulier laten weten dat er credits zijn en ze automatisch aftrekken vóór de betaalstap
- [ ] Wat als een bestelling groter is dan het saldo — bijbetalen tegen staffeltarief, of weigeren
- [ ] Saldo tonen in het klantportaal en in de accountpagina
- [ ] Saldo tonen en handmatig kunnen bijstellen in admin (er gaat een keer iets mis en dan wil je het kunnen rechtzetten)
- [ ] Credits terugboeken als een bestelling geannuleerd wordt

---

## 4 · Inloggen

- [ ] 🔴 Uitzoeken wát er stroef gaat. Nu is het een gevoel; om het te repareren moet het een meting worden. Loggen: hoeveel inlogmails verstuurd, hoeveel links aangeklikt, hoeveel binnen de geldigheid
- [ ] Nagaan of het aan de bezorging ligt (mail komt laat of in spam) of aan de flow (te veel stappen, link verloopt, andere browser)
- [ ] 🟡 Overwegen: een 6-cijferige code naast de magic link. Dan hoeft niemand van mailapp naar browser te springen, wat op mobiel precies de plek is waar mensen afhaken
- [ ] "Onthoud mij" met een langere sessie, zodat terugkerende klanten niet elke keer opnieuw moeten
- [ ] Vervallen link: nu een doodlopende pagina, moet een knop worden die meteen een nieuwe stuurt
- [ ] Inloggen aanbieden op het moment dat het loont — bovenaan het bestelformulier staat het al, maar ook na het bestellen ("bewaar dit zodat je het niet opnieuw hoeft in te vullen")

---

## 5 · Adminpaneel

- [ ] Klantaccounts kunnen inzien: bestellingen, credits, modellen, aanmeldmoment
- [ ] Custom modellen kunnen verwijderen (jouw voorbeeld — nu kan een per ongeluk toegevoegd model er niet meer uit)
- [ ] Custom modellen kunnen hernoemen en verbergen zonder ze te verwijderen
- [ ] Klantgegevens kunnen corrigeren (verkeerd merknaam, verkeerd btw-nummer)
- [ ] Account kunnen deactiveren of samenvoegen bij dubbele registratie
- [ ] Credits handmatig bijboeken of afboeken, met reden erbij in het ledger
- [ ] Een klant handmatig een nieuwe inloglink kunnen sturen vanuit admin
- [ ] Verwijderverzoek kunnen uitvoeren (AVG) — één knop die klant, bestellingen en bestanden opruimt

---

## 6 · Bestelformulieren

- [ ] Catalogformulier afmaken en nalopen
- [ ] Lifestyleformulier afmaken en nalopen
- [ ] Videoformulier afmaken — dit is de dunste van de drie
- [ ] 🔴 De 35+-trede in de staffel is onbereikbaar omdat het formulier op 30 producten dichtklapt. Of het plafond eraf, of de trede eruit — nu staat er een prijs op de site die niemand kan bestellen
- [ ] Videobestellingen worden meegeteld als attended orders in de capaciteitsagenda; dat klopt niet en vervuilt je planning
- [ ] Voortgang bewaren zodat iemand die halverwege wegklikt niet opnieuw hoeft te beginnen
- [ ] Foutafhandeling op de uploadstap (te groot, verkeerd formaat, verbinding weg)
- [ ] Bevestigingsscherm nalopen: staat er alles op wat iemand nodig heeft om gerust te zijn

---

## 7 · Content en voorbeelden

- [ ] 🔴 Videovoorbeelden maken — `/video` en de vier subpagina's verkopen nu iets wat nergens te zien is. Dit is het grootste gat op de site
- [ ] Per videosoort minstens twee voorbeelden: Motion, Lifestyle Video, Campaign, Custom
- [ ] Beslissen hoe je ze toont: autoplay-loop zonder geluid, of poster met klik-om-te-spelen (autoplay kost laadtijd, dus niet vijf op één pagina)
- [ ] Galerij aanvullen met recent werk
- [ ] Before/after-paren verzamelen — dat is het overtuigendste wat je hebt en er staat er nu één op de site

---

## 8 · Stock-content als nieuwe categorie

Je noemt twee modellen. Ze sluiten elkaar niet uit, maar ze vragen wel een ander bouwwerk, dus kies er één om mee te beginnen.

- [ ] 🟡 **Besluit:** gedeelde bibliotheek (Death to the Stock Photo-model) óf per merk exclusief
  - Gedeelde bibliotheek: één keer maken, alle abonnees kunnen kiezen en downloaden. Schaalt goed, maar het beeld is niet van hen alleen — en dat botst met "meer merkgevoel", want een concurrent kan hetzelfde beeld gebruiken
  - Per merk exclusief: zelfde bestelformulier-principe, klant kan eigen model of kledingstuk toevoegen. Meer werk per klant, hogere prijs te vragen, en het past beter bij wat je nu verkoopt
  - Tussenvorm die het overwegen waard is: een gedeelde basisbibliotheek in neutrale merkkleuren, plus een exclusieve laag per merk. Abonnees krijgen de basis, de exclusieve laag is een bestelling
- [ ] Kleurenschema per merk vastleggen zodat de beelden er echt bij passen (dit is de kern van het idee — vul het niet met generieke sfeerbeelden)
- [ ] 🟡 Licentietekst schrijven. "Royalty free" is geen licentie maar een marketingterm; er moet staan wat wel en niet mag, hoe lang, en wat er gebeurt als het abonnement stopt
- [ ] Downloadbeperking bedenken (aantal per maand, of credits ervoor gebruiken)
- [ ] Zoeken en filteren in de bibliotheek — zonder dat is een grote bibliotheek onbruikbaar
- [ ] Bepalen of stock ook los te koop is of alleen bij een abonnement

---

## 9 · Uploaden en kwaliteit

- [ ] Uploadschema ontwerpen: welke soorten foto's, hoeveel, welke hoeken, welk minimumformaat
- [ ] Onderzoeken wat er per soort echt nodig is om consistent resultaat te halen — meten aan echte bestellingen, niet aan aannames
- [ ] Uploadrichtlijnen-pagina bijwerken naar dat schema
- [ ] Validatie bij het uploaden: te klein, te donker, te veel compressie — meteen zeggen in plaats van na levering
- [ ] Afwijsprocedure: wat doe je als de aangeleverde foto's het gewoon niet halen
- [ ] Bewaartermijn en opruimen van uploads in R2 vastleggen

---

## 10 · Prompts en interne bestanden

- [ ] Promptbibliotheek opzetten: per dienst en per stijl, met de versie die werkte en waarom
- [ ] Prompts koppelen aan bestellingen zodat je een geslaagd resultaat kunt terugvinden en herhalen
- [ ] 🟡 De "sitemap-map met klanteninfo" die je noemt: dit is in feite een klantendossier. Voordat we bestanden gaan maken, eerst bepalen of het in de database hoort (dan is het automatisch bij het inloggen beschikbaar) of op schijf (dan is het handwerk maar direct te openen). Mijn voorstel: database als bron, en een exportknop die er een map van maakt wanneer je hem nodig hebt
- [ ] Per klant vastleggen: merkkleuren, voorkeursmodellen, achtergronden, eerdere bestellingen, wat ze eerder afkeurden
- [ ] Dat dossier bij het inloggen automatisch de bestelvelden laten voorvullen

---

## 11 · Social media

- [ ] Discord-ideeën uit de chat halen en op één plek zetten
- [ ] Ordenen naar formaat: before/after, proces, klantresultaat, uitleg
- [ ] Contentkalender voor vier weken maken
- [ ] Vaste beeldsjablonen in het kleurenschema, zodat een post herkenbaar van jou is
- [ ] Instagram- en Facebook-bio's afstemmen op de nieuwe hoofdboodschap
- [ ] Bepalen waar posts naartoe linken (`/start` of een servicepagina, niet de homepage)

---

## 12 · Techniek en onderhoud

- [ ] FAQPage-structured-data voor `/catalog`, `/lifestyle` en `/video` — er staan nu twintig vragen op die Google niet als FAQ ziet
- [ ] `DESIGN.md` bijwerken: die documenteert nog het blauwe `#90BEFF`-accent en de oude pastelvlakken als geldend
- [ ] D1-aanroepen zonder guard die een 500 geven in plaats van een nette foutmelding
- [ ] Het woord "drop" staat nog in klantteksten op ongeveer vijf pagina's terwijl het intern is afgeschaft
- [ ] De AI Act-pagina spreekt in zijn hero zijn eigen §6 tegen
- [ ] 🟡 Prijs van het merkmodel (€1.250) staat nog niet vast
- [ ] Beslissen wat er met `orders@visuails.com` gebeurt: echte gebruiker aanmaken, of mail versturen vanaf `hello@` en die profielfoto meteen goed hebben
- [ ] Interne meldingsmail (die jij krijgt bij een bestelling) ook in het nieuwe briefhoofd, als je dat wilt
- [ ] Back-up van D1 en R2 regelen — er is er nu geen
- [ ] Meten wat er gebeurt: hoeveel mensen starten een bestelling en hoeveel maken hem af

---

## 13 · Juridisch en administratief

- [ ] Algemene voorwaarden uitbreiden met abonnementen, credits en opzegtermijn
- [ ] Licentievoorwaarden voor de stockbibliotheek (zie §8)
- [ ] Privacyverklaring nalopen op wat je met klantdossiers en uploads doet
- [ ] Verwerkersovereenkomst met de partijen die je gebruikt, als daar persoonsgegevens langs gaan

---

## Beslissingen die eerst moeten vallen

Dit zijn de knopen die andere taken blokkeren. Zolang deze open staan, kan er in die onderdelen niets af.

- [ ] **Mollie of Stripe** → blokkeert abonnementen, credits en de btw-afhandeling
- [ ] **Credits: vervallen of doorrollen** → blokkeert het datamodel
- [ ] **Stock: gedeeld of exclusief** → blokkeert de licentietekst en het hele bouwwerk eromheen
- [ ] **De hoofdboodschap** → blokkeert de teksten, de social-bio's en de mailonderwerpen
- [ ] **NL als vertaling of als origineel** → blokkeert de tekstronde

---

## Een realistische dag

Alles op deze lijst is meer dan een dag. Als je vandaag echt wilt afronden in plaats van overal aan te beginnen:

1. Deployen en Search Console (§0) — een half uur, en het maakt al het werk van gisteren pas echt
2. Eén besluit nemen uit het rijtje hierboven — het liefst Mollie of Stripe, want daar hangt het meeste aan
3. Videovoorbeelden maken (§7) — het grootste gat, en het is maakwerk in plaats van denkwerk
4. Eén tekstronde op één pagina, met het tone-of-voice-document als eerste stap
