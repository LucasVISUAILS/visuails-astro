# Levering 90 · Gewoon de video, en de test van A tot Z

**8 november 2026. Staat alleen in je map; je rolt zelf uit met `UITROLLEN.bat`.** Bouwt voort op levering 89 (live sinds
8 november, 02:45). **Opruimen gaat vanzelf in `UITROLLEN.bat` (§8)**: hij verplaatst eerst de 21 oude bestanden (na jouw J), anders zou
`test:ketenvolledig` melden dat twee oude toetsen niet meer in de keten staan. De opening staat in `docs/RUST-80.md` §16 (vervangt §12 – 15b).

---

## 1 · Wat je vroeg

- **15:59:** *"Ik heb 21 9 laptop.mp4 verbeterd en de nieuwe video staat in de map. Ik wil dat je deze gebruikt voor de home
  page. Gewoon de video gebruiken niet zelf animeren omdat de lag dan alleen maar erger word. Zorg dat hij er strak uit komt
  te zien en perfect van foto naar video overgaat."* Je keuzes: de winkel gaat uit, dan de video · de fade in de video · Wat
  we maken schuift erover · 1,5 × · B, de laptop 19 % groter.
- **21:44:** *"De grain op de achtergrond achter de laptop maakt de overloop tussen secties niet smooth. Los dit op door het
  smooth te laten faden of te verwijderen. De animatie van de laptop kan toch wel sneller (tussen de 1.5 en 2.5 seconden of
  zoiets, kijk wat het beste is). Ik wil dat je gaat kijken of alle knoppen op de home page wel de juiste kleur hebben omdat ze
  wat los van de website voelen. […] Ook wil ik dat je de gehele website met meerdere sub agents gaat testen om te kijken of
  alles wel werkt van A tot Z […] Plaats ook orders om te kijken of daar nog fouten zitten. (Haal alle test orders eruit).
  Kijk wat er nog toegevoegd moet worden om de workflow tussen studio en /admin te verbeteren […] probeer hier en daar ook het
  gehele systeem te versimpelen."* Testen mocht met echte bestellingen: Mollie staat in de testmodus.

## 2 · De opening

1. **Gewoon de video.** De browser speelt alleen nog een video af: geen WebGL, geen doek, geen metro, geen rit. Het veld B1
   Horizon zit in de video zelf, **zonder korrel** (het veld is glad, zoals de sectie eronder; de overgang naar Wat we maken
   is daardoor naadloos). Heen en terug zijn elk een eigen video, in vier breedtes.
2. **Sneller: 1,87 s.** De 112 beelden spelen op 60 per seconde (was ± 3 s). Binnen jouw 1,5 – 2,5 s, en snel genoeg dat het
   niet wacht, maar je ziet de laptop nog bewegen.
3. **De foto is beeld 0 van die video**, zoals de browser het eruit haalt, met gaten in de schermen waaronder de standen van
   de winkel liggen.
4. **De overgang.** Eén scroll omlaag op het podium: de winkel, de feitenregel en de foto vervagen samen in de video, in
   120 ms, terwijl de klep nog stilstaat (beeld 0 – 7, 117 ms). Dan speelt de video, met de pagina vast. Daarna schuift Wat we
   maken over het stilstaande veld. Omhoog: de video speelt terug, en aan het eind komen de foto, de winkel en de feitenregel
   samen weer op (300 ms).
5. **Strak.** Het vak van de foto en de video staat op hele pixels; de standen liggen tegen de rand van het toestel (geen witte
   streep meer). Zonder H.264 of als de video niet laadt: de stilstaande foto en gewoon scrollen. Telefoon, tablet en minder
   beweging: ongewijzigd (de foto van levering 79).
6. **Banden.** Zonder korrel zou een glad verloop in een video trappen laten zien; daarom CRF 17 met `aq-mode=3`. Gemeten op
   de beelden zelf: geen zichtbare trap.

## 3 · Gemeten

| Wat | Gemeten | Eis |
|---|---|---|
| Beeld 0 uit de video tegen de foto, in de browser, buiten de gaten (1288 / 1840 / 2392 / 2944) | gemiddeld 1,72 / 1,64 / 1,61 / 1,55 op 255; 99 % ≤ 5; hoogstens 25 / 23 / 26 / 23 (de randen) | gemiddeld ≤ 3, 99 % ≤ 10, max ≤ 40 |
| Duur heen | 112 beelden op 60 per seconde = 1,87 s | 1,5 – 2,5 s |
| De klep beweegt pas als de foto weg is | foto (deels) op bij beeld ≤ 7, nooit later | — |
| Grootte heen · terug · foto (1288 / 1840 / 2392 / 2944) | 207 / 364 / 562 / 755 kB · 220 / 374 / 581 / 817 kB · 23 / 39 / 57 / 69 kB (met korrel was heen 0,47 / 1,15 / 2,16 / 3,72 MB) | — |
| Op 1440 × 900 laadt de browser | de 2392-video (562 kB) en de 2392-foto (57 kB); terug pas na de eerste keer | — |

## 4 · De test van A tot Z

Vier onderzoekers tegelijk, elk met een eigen opdracht, en ik erboven:

- **De publieke site** (lokale build, alle 97 pagina's, EN en NL, op 1440 × 900 en 390 breed): console, netwerk, links,
  meta, structured data, sitemap, cookiebalk, zachte navigatie, mobiel menu, prijzen tegen `pricing.js` en `plans.js`, de
  opening met het muiswiel, en elke knop op de voorpagina. 31 bevindingen, geen blokkerende. **Alle prijzen kloppen**, overal.
- **Bestellen, live** (Mollie-testmodus): 9 testbestellingen (catalog 1, 12 en 20 producten, lifestyle 5, video, merkmodel
  twee keer, eigen look, lifestyle vanuit Zwitserland), betaald, mislukt, geannuleerd, verlopen, open, en terug met de knop van
  de browser. 37 bevindingen. Niet tot het einde: de €1-proef (het testadres, het nummer en het KVK-nummer hadden er elk al
  een) en het abonnement (het testadres heeft een account, dus eerst inloggen, en dat doe ik niet op de echte site).
- **/admin, live, alleen lezen**: elke pagina, in het lichte en het donkere thema, contrast gemeten. 50 bevindingen.
- **De stroom in de code**: één bestelling van begin tot eind (22 stappen, wie doet wat, welke mail, welke stand).

**VISUAILS Studio** (inloggen, levering bekijken, revisie, facturen) is niet getest: daarvoor moest jij één keer inloggen, en
dat kwam er vanavond niet van. Dat is de volgende ronde.

**De lijsten** (keuzes voor jou):
- **Lijst 84, De knoppen, één familie:** elke knop van de voorpagina in rust en onder de muis, met varianten en mijn advies.
- **Lijst 85, Studio en /admin, rustiger:** 14 voorstellen met waarom, hoe en wat het kost, drie vragen, en wat al klopt.

## 5 · Wat ik rechtzette (allemaal in `tests/doorloop-90.test.mjs`, 101 controles)

**Bestellen**
- Terug van Mollie zonder te betalen: de bedankpagina zei "Je hoeft niet opnieuw te betalen" en had geen knop, terwijl de
  bevestiging met de betaallink pas komt als Mollie de betaling laat verlopen (± een kwartier). Nu "Betaald? Dan hoef je niets
  te doen", en na een minuut zonder bericht, als er nog betaald kan worden, de knop "Opnieuw betalen". **Dit wijkt af van punt
  1.05 (voorstellen van 7 oktober, gebouwd op 8 oktober): daar bleef de wachtstand zonder knop,** tegen dubbel betalen bij een
  trage bank. Dat punt ging ervan uit dat de link al in de mail stond, en die mail komt sinds 15 oktober pas later. Het risico
  blijft klein: de knop komt pas na een minuut, de zin zegt dat hij alleen voor wie níet betaalde is, en betaalt iemand toch
  twee keer, dan stort de webhook de tweede betaling vanzelf terug (dat bestond al). Wil je 1.05 zoals het was, dan is dat één
  regel terug.
- Terug met de knop van de browser: het formulier hing op "Versturen…". Nu komt de knop terug, met het blok "Je hebt een
  bestelling die nog niet betaald is". Dat blok zegt ook niet meer "je ging terug" als je dat niet deed.
- Stap 3: een e-mailadres zonder .com of .nl (`hello@visuails`) en een telefoonnummer zonder cijfers (`abc`) komen niet meer
  door, met een eigen zin bij het veld. De postcode heet in het Engels niet meer "AB1 2CD" maar "1234 AB". Het websiteveld neemt
  "merk.nl" aan (geen https:// meer nodig). De notitie stopt bij 2000 tekens, zoals de server.
- Stap 5: een fout in de laatste stap zet de pagina niet meer bovenaan terwijl de melding onderaan staat; een fout uit stap 3
  staat bij het veld. Vanaf 10 producten zonder leverdatum zegt stap 5 dat de betaalknop op de volgende pagina staat.
- Voorrang noemt de echte dag ("uiterlijk dinsdag 10 november om 17:00") in de betaalmail en in Studio, en op de bedankpagina
  de regel met de grens van 15:00. Zondagavond betaald was voor de klant "maandag", voor /admin terecht dinsdag.
- Mollie (checkout en bankafschrift) noemt het kenmerk: "VISUAILS VIS-ABCD-EFG — 1 product, catalogsets".
- Een EU-klant met een btw-nummer dat de Europese controle niet bevestigde, leest in zijn mail waarom er (nog) geen betaalknop
  is en wat er gebeurt als het nummer niet klopt. Het abonnementsformulier noemt het bedrag met 21% btw bij de afschrijving, en
  het land springt na "dit adres heeft al een account" niet meer terug naar Nederland.
- De €1-proef: de weigering noemt ook het KVK-nummer, en de chip zegt "4 beelden, catalog of lifestyle" in plaats van "4 photos,
  or 4".
- De mails: "Standaardachtergrond" als beelden een eigen achtergrond hebben, "1 product" in plaats van "1 producten", "Je
  beelden komen op je leverdatum" in plaats van "We maken je beelden op je leverdatum", en de mail aan jou zegt niet meer dat
  hij dezelfde link heeft als de klant (de betaalmail geeft een nieuwe; beide werken).

**/admin**
- "Betaallink opnieuw mailen" stuurde "Je btw-gegevens zijn goedgekeurd". Nu de herinnering; bij een offerte de offerte.
- De formaatwaarschuwing ("… nog geen JPG, PNG én WEBP … npm run deliver") ging af bij elke bestelling die je in /admin
  leverde. Nu alleen bij een open PNG/WebP-verzoek, en het uitlegblok volgt de regel van 12 oktober (JPG hier, PNG en WebP op
  aanvraag met FORMATEN.bat).
- Facturen: de tegels voor de aangifte (1a, 3b) en de CSV tellen de PROEF-reeks niet meer mee (in november stond er € 5.380
  aan testfacturen); de testdocumenten staan apart eronder.
- Onbetaald telde geannuleerde bestellingen mee; zoeken nam het filter stil mee en zei "Nog geen bestellingen."; de dashboardregel
  "zet de status opnieuw op geleverd" (dat gaf de klant een tweede "Geleverd") wijst nu naar de knop voor de levermail.
- Btw-controle: geen betaallink voor een bestelling die al betaald is, geen "€ 0,00 erbij" bij een aanvraag zonder prijs, "1
  product", en een intro die klopt. Verborgen (test)bestellingen staan er niet meer in, ook niet in Nu doen.
- Abonnees: testabonnementen tellen niet mee per maand. Bestelpagina: een pil "Proef · testmodus" bij een testbestelling.
- Klein: "Deze bestelling is Geleverd.", "Staand 4:5 — 4:5", twee keer de kop Revisies, de knop "Vervangen" in het donkere thema
  (3,21 : 1 op 11,5 px, nu 8,85 : 1 op 13 px).

**De publieke site**
- Editions: in de witte kaart van de Studiobrief stonden kop en uitleg wit op wit (1 : 1). Weer inkt.
- Hoeveel foto's: de structured data (die zoekmachines en AI-tools citeren) zei "built from a single product photo", stap 2 zei
  "Four phone photos is enough", Catalog zei "One photo in.". Nu overal de drie verplichte vakken (voorkant, achterkant,
  detail), zoals `src/data/shots.js`, de FAQ en /start.
- De voet zegt "Try VISUAILS · €1" (was nog "Test sample"); de cookiedialoog zegt niet meer "adminportaal"; meta-beschrijvingen
  zonder losse "excl. VAT." en zonder kleine letter na een punt; geen "Motion in motion"; llms.txt zonder hoofdletter midden in
  een zin; de WebSite-knoop in de structured data heet nu "en" én "nl".
- De opening: de feitenregel ("Vanaf €39 per product / …") bleef tijdens de video als enige onder de balk hangen; nu gaat hij
  mee met de winkel. Op een telefoon staan de drie feiten onder elkaar in plaats van regels die met "/" beginnen. De naam in de
  laptopspeler op /lifestyle wordt op een telefoon niet meer afgeknipt.
- Drie links reageerden niet op de muis (Inloggen, "Of probeer één product voor €1", Cookievoorkeuren); nu blauw, zoals de rest.
- De voetknop "Start een bestelling" en "Aanmelden" volgen de inktknop van bovenaan (K2: in rust de nacht, onder de muis de
  snede), uit één token `--knop-inkt` in `hal.css`, zodat je keuze uit lijst 84 (A2) één regel is.

## 6 · Wat er nog openstaat

- **Voor jou (buiten de code):** de botcheck staat uit (`TURNSTILE_SITE_KEY` niet gezet, zegt Diagnose); de nachttaak zat boven
  zijn databasegrens ("54 van 50"); `/api/step` geeft bij bijna elke stapwissel 503 terwijl de functie altijd 204 geeft (dus
  van vóór de functie, kijk in Cloudflare › Security › Events); de back-up staat alleen lokaal.
- **Beeld:** op `lifestyle-phone-made-04` (de grote poster op de voorpagina, de galerij en /lifestyle/phone-made) is op de jas
  "…xander wang" te lezen. Een echt merk in je eigen beeld; dat beeld moet je zelf vervangen of bijwerken.
- **De kop van het €1-blok** loopt op 26 pagina's (desktop) naar 3 – 4 regels, op de voorpagina niet. Je regel is hoogstens 2.
  Dat vraagt kortere zinnen per pagina (een tekstkeuze), dus heb ik hem niet zelf ingekort. Langste: /contact "Rather see it
  first? One of your own products, for €1" en /faq.
- **Te controleren:** "Brand models we made — Three we delivered" op /start/brand-model: klopt "geleverd"?
- **Taal:** "Jouw merk, zoals jij **hem** ziet" (merk is een het-woord; netjes is "het"). Jouw kop, dus jouw keuze.
- **Klein, later:** de EN-laptopwinkel heet "JOUWMERK" (zit in de schermbeelden); EN zegt "Custom Brand" bij Catalog en
  "Custom" elders; de voorbeeldpagina's `/voorbeeld/uitleg` en `/voorbeeld/voorpagina` zijn bereikbaar (noindex) met interne
  notities; /start/video zegt "In aanbouw"; een paar tikdoelen op de telefoon zijn kleiner dan 24 px (de streepjes onder de
  laptop, het aantalveld); de 404 heeft een canonical naar `/404/`.
- **De lijsten 84 en 85** wachten op je keuzes; daarna bouw ik ze.

## 7 · De testbestellingen

Alle **37 testbestellingen** zijn uit /admin verborgen (`Verberg proefbestellingen` voor de 36 met een testsleutel, en
VIS-QGM0-5MZ van "Merk Abo (TEST)" los, want die was met credits betaald en droeg het label niet). Niets is definitief verwijderd:
ze staan nog in de database. De 9 van vanavond: VIS-UMWY-IXI, VIS-3KDZ-D8J, VIS-8OI4-ZP6, VIS-APHE-FFV, VIS-HM02-QE7,
VIS-JNFU-I43, VIS-MDZH-VPD, VIS-NJX4-114, VIS-RSSK-JQK. Vier verborgen testbestellingen bleven in de btw-controle en in Nu doen
staan (een fout, opgelost in deze levering; tot je uitrolt staan ze er nog). De twee testabonnementen (Merk Abo (TEST), Studio
Proefmerk) en de testklanten heb ik laten staan: wil je die ook weg, zeg het, dan doe ik het (dat is wel definitief).

## 8 · Opruimen: dat doet `UITROLLEN.bat` nu zelf

De 21 oude bestanden staan in `_opruimen/LIJST.txt` onder een kop met **moet weg** (zoals je op 8 oktober koos, punt 9.02,
en zoals levering 88 het deed). `UITROLLEN.bat` ziet dat in stap 0, noemt ze, en vraagt "Nu opruimen? J/N". Bij J verplaatst
hij ze naar `_opruimen/<datum>/` (er wordt niets verwijderd; jij gooit daar zelf weg), en pas als ze weg zijn gaat hij verder.
Liever eerst zelf kijken: dubbelklik `OPRUIMEN.bat`, dan `UITROLLEN.bat`.

Wat erin staat: de oude toetsen `tests/laptop-84.test.mjs` en `tests/opening-89-browser.test.mjs`, het doek en de rit
(`src/scripts/laptopdoek.js`, `src/scripts/metro.js`), de twee oude videoscripts (`scripts/laptop-video.mjs`,
`scripts/laptop-video-terug.mjs`) en de 15 oude video's in `public/img/hal/laptop-video/` (`laptop-84-*` en `laptop-80-*`).
Daarna staan in `laptop-video` alleen nog de acht `laptop-90-*`.

`LIJST.txt` is jouw versie van 6 november (alles daarin was al opgeruimd) met alleen dit blok erbij.

## 9 · Nagekeken

- Nieuw: `tests/laptop-90.test.mjs` (14), `tests/opening-90-browser.test.mjs` (50), `tests/doorloop-90.test.mjs` (101).
- Bijgewerkt: `voorpagina-80`, `posterkleur-89-browser`, `beweging-83` (zie levering 90 eerder vandaag), `bedankpagina-standen`
  (de knop na een minuut), `doorloop-27b` (de weigering van de proef), `herbestel` (de notitie heeft nu een maxlength).
- De film: `kladblok/levering-90/opening-90-1440x900.mp4` (1440 × 900, 10 s, zonder korrel; de opname loopt op 30 beelden per
  seconde, de video op de site op 60): rust, één scroll, de video, Wat we maken erover, terug omhoog, de winkel weer aan.
- De testreeks: zie §10.

## 10 · De testreeks

`node scripts/testreeks.mjs` op een schone kopie van deze levering (eerst de build, dan de 281 stappen één voor één,
± 30 minuten): **280 goed, 1 fout, en die ene is daarna rechtgezet.** De fout was `test:opening90`: de feitenregel gaat nu mee
met de winkel, dus de toets die de foto met beeld 0 van de video vergelijkt, mat ineens de tekst van die regel mee (99,9 % 133
in plaats van ≤ 30). De toets verbergt de regel nu in beide opnames, net als de winkel; alleen het toetsbestand veranderde.
Daarna los gedraaid: 50 goed, 0 fout. Eerder in de reeks: `test:herbestel` liep vast op de nieuwe `maxlength` van de notitie
(ook alleen de toets aangepast, 65 goed).
