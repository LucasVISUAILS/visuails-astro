# Levering 119 · De lage en kleine punten uit de proefronde

**18 november 2026. Staat alleen in je map; je rolt zelf uit met `UITROLLEN.bat`.**

Je koos in lijst 127 overal het advies. Dit zijn de 65 lage en kleine punten met advies "doen". Punten met advies "later"
of "niet" zitten er niet in, ook T1-05 (het grote stijlblad dat elke pagina laat wachten) en T1-08. Daarmee is lijst 127
af, op de "later"-punten na. Uitgebreide notities per onderdeel staan in de werkmap van de bouw (niet in jouw map); hieronder
wat je moet weten.

## Eerst: wat jij moet doen

1. **Feestdagen.** Kerst en 1 januari zijn nu standaard dicht in de agenda. Bestellingen die al op 25 of 26 december
   gereserveerd stonden, schuiven niet mee: kijk de planning in /admin na. Wil je een feestdag toch open: /admin/planning,
   knop *Toch open* (en *Weer dicht*).
2. **Testklanten.** /admin heeft nu een filter (Alle / Zonder test / Alleen test) en *Testklanten opruimen*. Dat verbergt
   alleen; er wordt niets gewist, en *Testklanten weer gewoon tonen* zet precies die bestellingen terug.
3. **Nalezen** (juridisch, datum 18 november 2026): cookiebeleid (geen aantal meer; de nieuwe opslagnaam `vis-proef-stand`),
   privacy §4 (geen "analytische cookies" meer: meten gebeurt zonder cookies), privacy en verwerkersovereenkomst (één datum
   voor de lijst van partijen), voorwaarden §11 en /ai-act (de AI-markering staat op foto's én video's), /plans
   ("Binnenkort: de maandset"), de FAQ (elke bestelling krijgt een eigen bestelpagina), /how-it-works ("Wit, of elke kleur
   die je opgeeft").
4. **Je twee besluiten van vannacht** zitten erin: de video-intake in Studio noemt geen bedragen meer (ook geen
   optieprijzen; /admin rekent nog wel), en privacy §4 is herschreven.
5. **Je besluit van 8 oktober (o04)** is overal gevolgd: de bevestiging van een contactbericht en van een aanvraag stuurt
   geen vrije tekst of links van de klant terug. Jouw eigen melding houdt alles.

## Vragen aan jou (open sinds 118)

- Moet de bestelpagina /o/ het bedrag van een offerte tonen? Nu alleen in de mail en bij Mollie.
- De €1 op /test-sample staat als eigen regel in de kop. Telt die als derde regel? Dan haal ik hem uit de kop.

## Wat er veranderde

**Bestelformulier en bedankpagina** — het controlescherm toont wat de klant invulde (ook "Je bericht", de achtergrond per
kant en het eigen gezicht per product), geen vierde tegel en geen afgekapte namen meer; de soort product springt niet meer
stil mee; boven 20 producten zegt het formulier waarom het aantal terugspringt; "+ €10" in plaats van het ladderbedrag;
één woord voor de leverdatum ("vastgehouden zodra je bestelt, vast zodra je betaalt", ook op /how-it-works, /start en
Studio); "vaak binnen een dag" verdwijnt met voorrang aan; de stijlvraag is één regel (advies b); namen hoogstens 80 tekens
en lange woorden breken (formulier, mails, /o/, /admin); terug van Mollie zonder betalen zegt niet meer "je factuur komt
zo"; bij een dichte proef zegt geen enkele knop nog "Probeer voor €1"; de €1-melding blijft niet open hangen;
schermlezer en toetsenbord (gekozen stijl en trap, "Later →", het vraagteken bij het model, de melding 'al geprobeerd');
geen scriptfout meer bij een afgebroken stapovergang.

**Achterkant en mails** — feestdagen dicht (zie boven); de melding aan jou heeft voorrang in het onderwerp en geen
"[object Object]" meer; de nakijkmail noemt het bedrag; de aanvraagmail geeft de vaste keuzes terug; de betaalmail na een
tweede poging houdt "Wat je bestelde"; de creditherinnering zegt niet meer "de enige herinnering"; de vervalmail zegt wat
er met de foto's gebeurt en de proefvervalmail stuurt niet meer naar /start; een abonnement met verlegde btw biedt geen
iDEAL; Mollie krijgt bij een merkmodel het kenmerk; voorrang noemt geen clips meer; één zin over het delen van de privélink;
de rekennoot in pricing.js klopt weer (9 × €80 = €720).

**/admin en Studio** — de telling "wacht op betaling" klopt met de lijst (geleverd-onbetaald heeft een eigen chip);
testklanten (zie boven); de aanhef komt uit de voornaam; na vijf foute codes een eigen zin; alleen kijken in Op maat maakt
geen aanvraag meer; Studio noemt alleen prijzen die de site ook noemt; een geweigerde referentie zegt waarom; na een
klaargezette overstap is de keuzelijst ingeklapt; het Studiobrief-veld is op de tablet even breed als de knop.

**Ontwerp** — koppen hoogstens 2 regels (31 koppen die 118 niet zag, plus vijf op 320–360 px; bijwerking: bij 200 % zoom
zijn die vijf h1's 18 px in plaats van 26, nog groter dan de lopende tekst); de WhatsApp-knop ligt op de telefoon niet meer
over tekst of links; de knoppen van het merkmodel zijn mint en Verder staat rechts; plaatshouder 6,05 : 1; vijf blokken
gecentreerd op de telefoon; de paginakop plakt geen woorden meer; verspringen op de voorpagina 0,41 → 0,002; Merk 12
maanden telt op (€1.410, bespaart €1.470); de €450-zin van het merkmodel verdwijnt voor een NL-bedrijf; de voet zegt in het
Engels "Chamber of Commerce (KVK)".

## Toetsen

Nieuw: tests/levering-119-{achterkant, admin-studio, bestelformulier, integratie, ontwerp, ontwerp-browser, teksten,
whatsapp, herstel, herstel-browser}.test.mjs, in de keten van package.json. Bijgewerkt omdat ze bewust veranderd gedrag
vastpinden: o.a. legal, subverwerkers, juridische-datums, opruimlijst, whatsapp-bestelling, promises, bedankpagina-standen,
blind91-s-keten, levering-117-voorrang-grens, levering-117-tekst-bewaren, levering-118-teksten, ronde9, lijst87-g-beheer,
hal-voorbeeld, op-maat-3d-browser, op-maat-studio-browser.

- **De hele reeks** is gedraaid na een nieuwe build: 398 toetsen (313 snelle en 85 browsertoetsen); 397 groen in de volle reeks, `levering-119-whatsapp` pinde de oude broncode van de knop vast en is bijgewerkt, daarna 12/12.
- Daarna in de browser nagespeeld (lokaal); wat daarbij gevonden werd (10 punten) is hersteld en opnieuw getoetst. Een
  volledige tweede kopmeting over alle pagina's is uit zuinigheid overgeslagen; de veranderde koppen zijn nagemeten.
