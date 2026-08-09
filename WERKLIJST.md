# VISUAILS — werklijst

Opgesteld 6 augustus 2026. Dit is een werkbestand, geen rapport: streep door wat af is en laat het staan, dan zie je over twee weken nog wat je gedaan hebt.

**Afvinken:** zet een `x` tussen de haakjes — `- [x]` — dan verschijnt er een vinkje in VS Code, GitHub en de meeste markdown-viewers. Helemaal afgerond en niet meer relevant? Zet er `~~` omheen: `- [x] ~~oude taak~~` wordt doorgestreept.

**Markering:** 🔴 blokkeert iets anders · 🟡 kost geld of is een besluit · 🟢 gewoon doen

---

## 0 · Eerst, want de rest wacht erop

## 0a · Migraties die nog moeten draaien

Ze zitten allemaal in één plakbestand, omdat `npm run migrate` vastloopt op
Cloudflare-foutcode 7403 (een sleutelprobleem op je eigen machine, niet op de
database).

- [x] ~~0019 (verkoopkanaal in de brand kit) en 0020 (tevredenheid en reviews)~~ — door Lucas gedraaid.
- [x] ~~0021 (facturen)~~ — gedraaid 9 augustus 2026 met `npm run migrate`, nadat bleek dat een `npx wrangler whoami` ervoor de 7403 wegneemt. `invoice_series`, `invoices` en de vier indexen staan erin. Het plakken in het D1-console was niet meer nodig; `MIGRATIE-0021-PLAKKEN.sql` blijft staan als terugval.
- [x] ~~Wrangler-autorisatie: de 7403 verklaard.~~ Het was geen rechtenprobleem maar een verlopen OAuth-toegangstoken. `npm run migrate`, `npm run backup` en `npm run fetch:order` vernieuwen hem nu zelf voordat ze beginnen (`warmLogin()` in scripts/lib/wrangler.mjs), en `npm run check:wrangler` meet deze oorzaak nu als eerste. Roep je wrangler met de hand aan en krijg je 7403: eerst `npx wrangler whoami`.
- [ ] 🔴 **Deployen, en dan VISUAILS Studio → Facturen openen.** De tabellen staan in de database, de code staat nog alleen op je schijf. Na de deploy haalt die sectie de achterstand van je betaalde testbestellingen zelf in — maximaal vijf per bezoek, met de betaaldatum als factuurdatum. Zie je nummers verschijnen, dan werkt de hele keten.
- [ ] 🔴 **`SELLER_ADDRESS` als secret in Pages zetten, vóór de eerste echte factuur.** Zonder die variabele valt `sellerOf()` terug op een voorbeeldadres. Je huisadres hoort daar niet in — zet een adres dat je op een factuur wilt zien. `VISUAILS_IBAN` erbij als je het rekeningnummer erop wilt.

---

## Facturen (gebouwd 9 augustus 2026)

Wat er staat: migratie 0021 (`invoice_series` + `invoices`), `src/lib/invoice.js`
(nummer uitgeven, momentopname, idempotent), `src/lib/invoicePdf.js` (de pdf, met
alle drie de btw-behandelingen en de wettelijk vereiste teksten),
`src/lib/invoiceMail.js` (de mail "Betaling ontvangen" met de pdf als bijlage —
die mail bestond niet, dus iemand betaalde en hoorde daarna niets), de sectie
**Facturen** in VISUAILS Studio met `/account/invoices/<id>/pdf`, en de aanroep uit
de Mollie-webhook. Onder test in `tests/invoice-pdf.test.mjs` (141),
`tests/invoice-issue.test.mjs` (63, tegen een echte SQLite) en
`tests/account-invoices.test.mjs`.

Wat er nog niet is, en bewust niet:

- [ ] 🟡 **Creditnota's.** Een refund wordt wel geboekt (`refunded_cents`) maar er komt geen document tegenover. Dat is een eigen nummerreeks en een eigen rij die naar de factuur verwijst — geen tweede factuur op dezelfde bestelling, want dat weigert het schema met opzet.
- [ ] 🟡 **De factuur naar de studio.** Nu gaat hij alleen naar de klant. Voor je eigen administratie is de bron `invoices` + R2, en dat is genoeg zolang je erbij kunt; een maandoverzicht in het adminscherm zou hier de logische volgende stap zijn.
- [ ] 🟢 **Een herstelroute voor `pending` in het adminscherm.** Blijft een factuur op 'pending' staan, dan repareert het klantbezoek hem al. Er is nog geen knop om dat vanaf jouw kant te forceren; de index `idx_invoices_pending` staat er wel voor klaar.
- [ ] 🟢 **`SELLER_ADDRESS` als secret zetten.** Zonder die variabele valt `sellerOf()` terug op een voorbeeldadres. Zet hem in de Pages-omgeving vóór de eerste echte factuur, samen met `VISUAILS_IBAN` als je wilt dat het rekeningnummer erop staat.

---

## Wat de site belooft maar niet doet (onderzocht 9 augustus 2026)

Elk punt hieronder is met bestandsverwijzingen bewezen, niet vermoed. Gesorteerd op ernst.

- [ ] 🔴 **De bewaartermijnen worden door niets uitgevoerd.** /terms en /privacy beloven dat aangeleverde foto's 90 dagen na afronding worden verwijderd en visuals 12 maanden bewaard blijven; /portal zegt zelfs dat de bronbestanden "op dezelfde klok" verdwijnen. Er is geen enkele geplande taak (geen `[triggers]` in wrangler.toml, geen `scheduled`-handler), en `files.expires_at` wordt nergens geschreven. De foto's van elke klant staan er na 90 dagen nog. Dit klemt twee kanten op: contractbreuk én een AVG-bewaartermijn die je zelf op twee juridische pagina's hebt vastgelegd. De 90-dagen-*linkexpiry* werkt wél.
- [ ] 🔴 **"Eén proefvisual per bedrijf" wordt niet gehandhaafd.** `functions/api/order.js` gaat bij `test-sample` rechtstreeks naar de betaling zonder ooit op een eerdere proef te controleren. Eén merk kan zijn hele collectie voor €1 per product laten maken. Het enige punt op deze lijst dat direct geld kost.
- [ ] 🔴 **De bevestigingsmail zegt "incl. 21% btw" ook bij 0%.** `customerEmail()` krijgt de btw-uitkomst wél mee maar leest die parameter nergens; "21%" staat hard in de regel. Een verleggingsklant krijgt twee keer hetzelfde bedrag te zien met "excl." en "incl. 21%" ernaast — in de enige mail die zijn bestelling bevestigt.
- [ ] 🔴 **"De verlegging wordt achteraf op je factuur rechtgezet" is sinds migratie 0015 onwaar.** De verlegging wordt bij het afrekenen toegepast. Staat op /pricing, /how-it-works, /start, in de FAQ én in de bevestigingsmail. Een Duitse klant betaalt al 0% maar leest dat hij 21% betaalt en een correctie krijgt die niet komt.
- [ ] 🔴 **De tevredenheidsvraag wordt nooit gesteld.** "We vragen of je tevreden bent, en zetten recht wat dat niet is" staat op zeven pagina's, in de bevestigingsmail en in /terms §10 — en het is de belofte die de revisierondes heeft vervangen. Tabel `order_feedback` staat in migratie 0020 (nog te draaien, zie boven); nul code raakt hem aan.
- [ ] 🔴 **Een order die de btw-poort tegenhoudt komt er niet meer uit.** Geen betaallink, en er is geen adminscherm dat de beoordeling afrondt: `orders.review_state` wordt één keer geschreven en nergens gelezen. Een klant buiten de EU krijgt een bevestiging zonder bedrag en zonder betaalknop.
- [ ] 🟡 **De €250 merkmodel-credit wordt niet verrekend.** Alle treffers zijn presentatie in .astro-bestanden; `quote.js` kent het begrip niet en er is geen kolom om de teller bij te houden. Een geldbelofte met een rekensom die de pagina zelf uitschrijft.
- [ ] 🟡 **"Downloads per kanaal gesneden" bestaat niet.** Eén rij in `files` is één bestand; `preview_key` is expliciet géén uitsnede. De klant downloadt wat de studio uploadde en schaalt alles zelf bij — precies het werk waarvan /portal zegt dat het niet meer nodig is.
- [ ] 🟡 **De Engelse /ai-act-lead spreekt §6 van dezelfde pagina tegen.** "We say so on the file" tegenover "We add nothing […] do not rely on a file identifying itself". De Nederlandse lead klopt. Dit is de pagina waarmee je je zorgvuldigheid verkoopt.
- [ ] 🟡 **Niet-betaalde leverdata worden nooit vrijgegeven.** `window_expires_at` wordt gezet, maar `functions/api/capacity.js` filtert er niet op. Wie niet betaalt houdt zijn week voor altijd bezet, en de volgende klant ziet "vol" voor een vrije week.
- [ ] 🟡 **"Mail ons en we sturen een nieuwe link" kan niemand uitvoeren.** `freshPortalLink()` bestaat, maar beide aanroepen zitten achter een poort die nieuwe bestanden vereist. Na 90 dagen — precies wanneer de klant volgens de voorwaarden mag mailen — is er geen route.
- [ ] 🟡 **Geen aftelling bij de leverdatum**, terwijl de homepage die beschrijft. En /portal noemt zes statussen; de code heeft er vijf, waarvan "Revision" en "Closed" niet als status bestaan.
- [ ] 🟢 **/demo belooft te weinig**: zegt dat per beeld goedkeuren vanaf 10 producten geldt, terwijl elke betaalde bestelling het sinds 7 augustus mag.

Niet vast te stellen uit code, wel na te gaan: de verwerkersovereenkomsten met Resend, Mollie, Cloudflare en de modelaanbieder (/privacy §5 en §8 beloven die), en hoe de ICP-opgaaf feitelijk gedaan wordt — `icp_reported_at` en `needsIcp()` bestaan, maar er wordt nooit naar geschreven.

- [ ] 🔴 **Juridische pagina's laten nakijken.** Op /terms, /privacy en /cookie-policy stonden tot 8 augustus 2026 noten aan de klant dat het "een algemene template" is en "door een jurist nagekeken moet worden". Die zijn van de klantpagina's gehaald — ze hoorden daar niet, want ze vertelden iedere klant dat het contract dat hij aanging niet was nagekeken. **Het onderliggende punt staat nog: de teksten zijn niet door een jurist gezien.** Neem dit mee in dezelfde ronde als de btw-verlegging.
- [ ] 🔴 **/terms §9 spreekt zichzelf en de site tegen over betalen.** De voorwaarden zeggen "kleine bestellingen en proefvisuals worden bij het afrekenen volledig betaald" en "een gereserveerde bestelling in twee delen: 50% bij bevestiging, 50% voor oplevering". De bestelstroom, /pricing, /faq en /how-it-works zeggen alle vier iets anders: kleine bestellingen op levering, gereserveerde bestellingen ineens vóór productie, met zeven dagen betaaltermijn. Er bestaat nergens een 50/50-splitsing. Welke kant waar is, is een bedrijfsbeslissing — niet iets om in stilte gelijk te trekken.
- [ ] 🟡 **/terms §4 noemt video, maandplannen en merkmodel "op aanvraag geprijsd"** terwijl /pricing, /video, /custom-models en de JSON-LD €69 per clip, €390/€790/€1.690 per maand en €1.250 setup als vaste prijzen publiceren.
- [ ] 🔴 `npm run build` draaien en deployen. Alles van vandaag staat nog alleen op je schijf: het nieuwe logo in de topbar, de favicon, het mail-briefhoofd, en de drie servicepagina's
- [ ] 🔴 Na de deploy: `https://visuails.com/favicon.ico` en `/img/mail/mark-groen.png` openen in je browser om te zien dat ze laden
- [ ] 🔴 Search Console → URL-inspectie op `https://visuails.com/` → Indexering aanvragen. Daarna hetzelfde voor `https://www.visuails.com/`, zodat Google de 301 tegenkomt
- [x] ~~Migratie `0008` draaien tegen remote D1~~ — meegegaan in de run van 9 augustus 2026 (56 opdrachten uitgevoerd, 81 overgeslagen omdat ze er al stonden).
- [x] ~~Wrangler-autorisatie fixen — de 7403 blokkeert `npm run fetch:order` en het draaien van migraties vanaf de CLI~~ — zie boven: verlopen toegangstoken, wordt nu automatisch vernieuwd.
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
- [ ] 🟡 De €1 proefvisual: als het een échte visual is die de klant krijgt, is het een levering tegen vergoeding en hoort er btw op. Wil je puur verifiëren dat een kaart geldig is, dan is een **€0-eerste betaling** de schone route — Mollie staat dat toe voor creditcard en PayPal, en dan is er geen levering en dus geen btw-vraag
- [x] ~~Factuurnummering en bewaarplicht regelen (doorlopend genummerd, zeven jaar)~~ — gedaan 9 augustus 2026, zie "Facturen" boven. Reeks per jaar zonder gaten, momentopname per factuur, pdf in R2 en zeven jaar bewaard.

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
