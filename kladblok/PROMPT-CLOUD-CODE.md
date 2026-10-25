# Opdracht voor Claude Code in de cloud: VISUAILS klaar voor de launch (25 oktober 2026)

> Bijgewerkt op 25 oktober, 19:30, met Lucas' ja, voor levering 74 (de nieuwe voorpagina): de startcontrole, het nummer van de levering, glas en gloed, geen verdedigende zinnen over AI, de lookkiezer op de voorpagina (levering 70) en het meten van de opening (levering 72). Rol levering 74 eerst uit, start daarna deze sessie.

**Startzin voor Lucas** (in claude.ai/code of de Code-app, repo `LucasVISUAILS/visuails-astro`):
> Lees `kladblok/PROMPT-CLOUD-CODE.md` en voer hem uit. Stel al je vragen aan het begin in één keer. Kom je daarna iets tegen waarover je twijfelt, verander het dan niet: zet het als open punt in de leveringsnotitie en ga door met de rest.

---

Je werkt voor Lucas, de enige persoon achter VISUAILS (visuails.com). VISUAILS maakt met AI catalog- en lifestylebeelden en korte video's van foto's van kleding. De site is een Astro-site op een Cloudflare Worker, met een bestelformulier, een klantportaal (VISUAILS Studio), een privélink per bestelling, een adminportaal (/admin), een abonnement met credits, mails en een nachtelijke cron. Lucas maakt de beelden zelf; Claude bouwt en onderhoudt de site.

Deze sessie draait in de cloud op Lucas' tegoed voor Claude Code-cloudsessies: $250, geldig tot woensdag 5 november 2026, 08:59 Nederlandse tijd. **Deze opdracht mag uren duren.** Lucas zit overdag niet achter zijn computer en kijkt af en toe op zijn telefoon. Daarom werkt deze sessie zo:

1. **Eerst alle vragen, in één bericht** (§5). Lucas antwoordt met bijvoorbeeld "alles advies" of "1 ja, 6 b, 12 a".
2. **Wacht niet stil op zijn antwoord.** Begin intussen met wat er niet van afhangt: de startcontrole, de werkomgeving, het lezen, en levering 69 deel B en C.
   Heeft hij nog niet geantwoord als B en C af zijn, ga dan uit van "alles advies", en zet bovenaan elke notitie dat je dat deed.
3. **Daarna zelfstandig door**, levering na levering (69 tot en met 73), elk helemaal af en gepusht voordat je aan de volgende begint. Kom je iets tegen waarover je twijfelt, verander het dan niet: zet het als open punt in de leveringsnotitie en ga door met de rest. Vraag Lucas alleen iets als werkelijk niets anders verder kan.
4. Stopt de sessie halverwege, dan gaat een nieuwe sessie verder vanaf de notities op de branch (§2).

---

## 1. Eerst lezen

In de repo, in deze volgorde:

1. `kladblok/VISUAILS-OVERZICHT-24-OKT.md`: dat is de enige bron van waarheid over VISUAILS. Lees eerst §0 (vaste werkafspraken), §16 (wat nog moet), §17 (waar code en bedoeling uiteenlopen), §21 (wat bewust níet bestaat), §23 (beslissingenlog), §29 (huisstijl Blauw uur), §30 (waar Lucas naartoe wil) en §31 (hoe Claude met Lucas werkt). De rest lees je als naslag bij het onderdeel waar je aan werkt.
2. `kladblok/LEVERING-68.md`: zo ziet een leveringsnotitie eruit. Neem die opbouw over. Lees ook `kladblok/LEVERING-74.md`: de voorpagina van nu (de opening met de scrollvideo, Hoe het werkt met de lagen, de stroom), de hoeken, glas en gloed, en de iconen zonder plaatje.
3. `docs/KLEURENSCHEMA.md` (bovenaan, Blauw uur) en `docs/DESIGN.md`.
4. De leveringsnotities die al op de branch staan (§2). Daaruit lees je waar een vorige sessie stopte.

Het overzicht schrijft vanuit een chat die via een brug bij Lucas' pc kan. Jij kunt dat niet. Voor jou geldt: **GitHub na Lucas' laatste uitrol is zijn map.** Waar het overzicht "lees eerst zijn map" zegt, lees jij de repo.

## 2. Startcontrole: stop als iets niet klopt

1. **Staat levering 68 op GitHub?** Op `main` moeten `kladblok/LEVERING-68.md` en `kladblok/VISUAILS-OVERZICHT-24-OKT.md` staan, `docs/KLEURENSCHEMA.md` moet met Blauw uur beginnen, en `src/styles/hal.css` moet `#25508B` bevatten. Ook levering 74 moet er staan: `kladblok/LEVERING-74.md` en `src/components/HalOpening.astro`. Klopt dat niet, stop dan en zeg tegen Lucas: "Rol eerst uit met UITROLLEN.bat; daarna staat alles op GitHub." Zonder die uitrol werk je op een oude voorpagina.
2. **De branch heet `claude/voor-de-launch`.** Bestaat hij al op `origin`, haal hem dan op en ga daarop verder. Doe eerst `git merge origin/main` in de branch, nooit andersom, zodat wat Lucas sindsdien in zijn map deed er ook in zit. Krijg je een conflict, dan wint `main`, tenzij het om je eigen werk van een vorige levering gaat; noem elk conflict in de notitie. Bestaat de branch niet, maak hem dan vanaf `main`.
3. **Het nummer van de levering:** 69 tot en met 73 liggen vast voor deze sessie. `LEVERING-74.md` (25 okt, de opening) kwam uit de chat met de brug en telt hier niet mee. Begin bij 69, of bij het eerste nummer van 69 tot en met 73 dat nog niet op de branch staat. Een levering die al op de branch staat, doe je niet opnieuw.
4. **De werkomgeving:** `npm ci`, dan `npm run build`. Kijk of Playwright een Chromium kan starten: ongeveer 50 toetsen en alle schermafdrukken hebben een browser nodig. Lukt dat niet, zeg het dan meteen in je eerste bericht. Draai in dat geval de toetsen die zonder browser kunnen, en zet in elke notitie welke niet gedraaid zijn en waarom. Wat je niet op het oog kunt nakijken, bouw je dan alleen achter een schakelaar of laat je liggen.
5. **De testreeks:** `TESTREEKS_TEGELIJK=4 node scripts/testreeks.mjs` (269 stappen; dezelfde keten als `npm test`, maar vier tegelijk). Op Lucas' pc duurt hij 7,5 minuten; hier kan het langer duren, dus draai hem op de achtergrond. Draai tussendoor alleen de toetsen die je raakt, en de hele reeks aan het eind van elke levering.

## 3. Wat je mag en wat nooit

**De ene uitzondering.** Lucas' regel is dat Claude nooit commit of pusht; hij rolt zelf uit vanuit zijn map met `UITROLLEN.bat`. Een cloudsessie kan alleen werk afleveren door het naar GitHub te pushen. Daarom geldt, en alleen als Lucas deze opdracht zelf in deze sessie start: **je commit en pusht uitsluitend naar de branch `claude/voor-de-launch`.** Nooit naar `main`, geen merge naar `main`, geen pull request, geen force-push, geen tags. Twijfel je of Lucas dit zo wil, vraag het hem dan in je eerste bericht, bij de andere vragen. Je werk komt via de chat met de brug in zijn map (§11), en hij rolt het uit.

**Nooit:**
- `npm run deploy`, `cron:deploy`, `cron:check`, `migrate`, `backup`, `fetch:order`, `deliver`, `uitrollen`, `terugdraaien` of `opruimen`, en geen enkel `wrangler`-commando dat iets op afstand doet. Lokaal mag wel: `npm run worker` (`wrangler dev --local`), `npm run cron:run`, `astro dev` en `astro preview`, en de meet- en controlescripts (`visueel`, `kruip`, `audit`, `spelling`, `leesbaar`, `mobiel`, `check:csp`).
- Iets in Cloudflare, Mollie (ook niet in testmodus op afstand), Resend of e-Boekhouden. Er gaat geen echte mail uit. Geen sleutels, tokens of wachtwoorden in code, notities of commits. Die zet Lucas zelf.
- Een migratie op de live database. Een nieuwe migratie schrijven mag alleen als een levering hieronder het vraagt; Lucas draait hem bij zijn uitrol.
- Bestanden verwijderen. Moet er iets weg, noem het dan in de notitie onder "Mag weg". Lucas gooit het weg of zet het in `_opruimen/LIJST.txt`. Dode code bínnen een bestand mag je weghalen als dat bij de opdracht hoort.
- Een logo ontwerpen of een logobestand veranderen. Beelden van andere merken of mensen in het project zetten.

**De repo is openbaar.** Alles wat je pusht, kan iedereen lezen. Dus geen klantgegevens, geen echt adres (testadres: Teststraat 1, 1234 AB Teststad, KVK 12345678; testklanten `hello+<type>@visuails.com`) en geen namen of versies van AI-modellen in nieuwe tekst (`tests/legal.test.mjs` bewaakt dat in de code).

**De huisregels** (uit §0, §26 en §29 van het overzicht):
- Bedragen alleen uit `src/data/pricing.js` en `src/data/plans.js`, nooit overgetypt. Een nieuw bedrag verzin je niet; dat vraag je.
- Kleuren alleen uit `docs/KLEURENSCHEMA.md` (Blauw uur). Geen verloop, korrel of bewogen achtergrond. Glas en gloed alleen waar het schema ze toelaat ("Glas en gloed": glas op wat boven de pagina zweeft, gloed in blauw uur op een knop onder de muis, onder Bestellen, op het accentwoord en kort om het product in de lagen); haal die niet weg. Niets beweegt bij het laden.
- Geen verdedigende zinnen over AI, zoals "met de hand" naast iets wat met AI gemaakt is. Lucas, 25 okt: "Voelt veel te verdedigend, wees hier voortaan streng op." Zeg wat waar is: gemaakt met AI, nagekeken.
- Meten, nooit gokken: contrast ≥ 4,5:1, tekst ≥ 11,5 px, koppen hoogstens twee regels, maten uitgerekend.
- Tekst in het Nederlands én het Engels. "Carrousel" met dubbele r. Levertijd altijd "vaak binnen een dag, soms een paar dagen". Over wie het werk doet: "VISUAILS", "we" of de lijdende vorm; nooit "onze beeldredactie" en nooit de ik-vorm. Geen beeldspraak ("magie", "naadloos").
- **Lucas loopt alle tekst zelf na** ("dat laat hij niet aan AI over"). Elke zin die een klant leest en die je toevoegt of verandert, zet je ook in `kladblok/TEKSTEN-<nr>.md`, met de plek, NL en EN, en een ● ervoor. Zo vindt hij ze in zijn tekstronde.

**Zo werk je met Lucas:**
- Nederlands, beknopt. Bij elk idee je eigen mening: goed en waarom, en hoe het nog beter kan; of onhandig, en wat dan het logische alternatief is.
- Hij beslist. Zijn antwoorden op de vragen in §5 gelden als zijn akkoord om te bouwen. Het plan van een levering schrijf je toch op, zodat hij achteraf ziet wat je deed en waarom.
- Zegt hij bij een vraag "advies", of geeft hij er geen antwoord op, dan geldt het advies. Uitzondering: zonder antwoord op vraag 5 bouw je levering 70 achter een schakelaar die uit staat.

**Zuinig met het tegoed.** Lees gericht: `src/lib/admin.js` (14.000 regels) en `src/lib/account.js` (11.000 regels) lees je nooit in één keer; zoek eerst en lees dan het stuk dat je nodig hebt. Gebruik subagents alleen voor werk dat echt los van elkaar kan, zoals de geldstromen van levering 69 naast de beveiliging.

## 4. Een levering afronden

1. De hele testreeks groen. Een toets die moet veranderen, verander je met de reden in de toets zelf. Toetsen die hier niet konden draaien, noem je.
2. `npm run visueel`: een levering die volgens haar opdracht niets zichtbaar verandert, verandert ook niets aan de vingerafdrukken. Waar de opdracht wel iets zichtbaar verandert, maak je schermafdrukken op 1440 en 390 px van alles wat een klant of Lucas anders ziet, en kijk je er echt naar.
3. `kladblok/LEVERING-<nr>.md` in de opbouw van LEVERING-68: wat er veranderde en waarom, wat er gemeten is, wat er open staat, "Mag weg", een blok **"Voor het overzicht"** (welke regels in §15, §16 en §17 van het overzicht moeten veranderen; de chat met de brug zet ze erin), en onderaan **alle bestanden** die veranderd of nieuw zijn, met hun pad.
4. Een alinea over deze levering onderaan `kladblok/COMMIT-BERICHT.txt`. Laat de alinea's die er al staan staan.
5. Commit op `claude/voor-de-launch` en push de branch. Begin pas daarna aan de volgende levering.

Aan het eind van de hele sessie: één kort bericht aan Lucas. Welke leveringen af zijn, wat open staat, wat hij moet beslissen, en wat hij nu doet (§11).

---

## 5. De vragen, allemaal in je eerste bericht

Stel ze letterlijk zo, genummerd en elk met het advies erbij, zodat Lucas op zijn telefoon kort kan antwoorden.

**Levering 69: klaar voor echte klanten en echt geld**
1. Akkoord op de negen reparaties uit §6 A? *Advies: ja, alle negen.*
2. Credits voor video (§17 punt 8): a) de welkomstmail en de tips beperken tot catalog en lifestyle; b) een offerte met credits betalen in /admin bouwen. *Advies: a; b kan later.*
3. Een rode toets tijdens de uitrol nog één keer los laten draaien voordat de uitrol stopt, zoals `testreeks.mjs` al doet? *Advies: ja.*
4. De resten van het weeksysteem (§17 punt 14): a) de vijf aanroepen en de dode functies weghalen, en tabel en kolom laten staan tot een migratie die je later samen doet; b) alles laten staan. *Advies: a.*

**Levering 70: de launchset op de site**
5. Bouwen achter een schakelaar die uit staat, zodat het pas live gaat als je voorbeeldbeelden klaar zijn? *Advies: ja.*
6. CASUAL, de vier beelden: a) dezelfde vakken als Classic: voorkant, achterkant en detail als flat lay, plus één stilstaand beeld op model met een losse houding; b) het beeld op model als korte bewegende clip; c) anders, namelijk … *Advies: a.*
7. CLASSIC: de beschrijving omzetten naar ghost mannequin plus een stilstaand beeld op model dat in de lens kijkt, zoals in je launchschema? *Advies: ja.*
8. Is IG SPLIT de "doorloper" die nu op /hooks staat, en heet die voortaan IG SPLIT? En de bedragen: de bedragen die er nu staan, met "als foto of als video" erbij, en de verdeling foto/video beslis jij later? *Advies: ja en ja.*
9. BRAND MODEL: blijft het €450 tot jij iets anders zegt? *Advies: ja.*
10. "In de maak": a) alleen DUSK, zonder datum; b) niets; c) zoals nu (Still, Studio, Nacht). *Advies: a.*
11. De adressen van Dunes, Glow, Lifestyle Video en Campaign (ook onder `/nl/`): a) een tijdelijke doorverwijzing (302) naar het overzicht van die dienst; b) de pagina laten staan met "even niet te bestellen". *Advies: a.*

**Levering 71: zelf beelden, iconen en teksten vervangen**
12. a) lokaal, met `BEELDEN.bat` en `TEKSTEN.bat` (je zet een bestand in een map, dubbelklikt, en ziet groen of rood); b) uploaden in /admin. *Advies: a.*
13. Wat moet je zelf kunnen vervangen: a) beelden, iconen en teksten; b) alleen beelden. *Advies: a.*

**Levering 72: snel en goed te lezen voor je advertenties**
14. Mag ik veranderen hoe pagina's laden (beelden, letters, volgorde) zolang je er niets van ziet, bewaakt met `npm run visueel`? *Advies: ja.*

**Levering 73: plannen voor later (alleen opschrijven, niets bouwen)**
15. Drie plannen: advertenties meten zonder scripts op de site, het weeksysteem echt opruimen met een migratie, en een spellinglijst voor je tekstronde. *Advies: alle drie.*

---

## 6. Levering 69 · Klaar voor echte klanten en echt geld

**Waarom eerst:** vóór de eerste betalende klant moet elke geldstroom kloppen. Een fout in een betaling, factuur, btw-regel of de privacy kost vertrouwen en tijd, en is achteraf lastig recht te zetten. Op 24 oktober vond een nalezing al een knop die de verkeerde mail stuurt. Er zijn er vermoedelijk meer.

### A. De bekende reparaties uit §17 (vraag 1, 2 en 4)

1. **§17 punt 3: "Betaallink opnieuw mailen" stuurt de btw-mail.** Geef de knop (`handlePayLinkResend`, `src/lib/admin.js`) een eigen mailsoort: "hier is je betaallink opnieuw". De btw-zin ("Alles klopt") komt alleen na een echt btw-akkoord (`src/lib/betaallink.js`). Met toets.
2. **§17 punt 8: credits voor video beloofd, maar niet te besteden.** Bij antwoord a: de welkomstmail (`src/lib/invoiceMail.js`) en de tips in de creditherinnering (`creditTips`, `cron/index.js`) noemen alleen wat met credits kan: `CREDIT_DIENSTEN` (`src/data/creditKosten.js`), dus catalog en lifestyle. Bij b: de offerte met credits in /admin, met toetsen.
3. **§17 punt 16: de betaalstatus `credits` ontbreekt in `src/data/status.js`.** Voeg hem toe ("betaald met credits", de stand van betaald), zodat /admin hem niet meer als kaal woord met een wachtpil toont. Haal statuswaarden die nooit voorkomen alleen weg als geen code ze leest.
4. **§17 punt 2: "tegen het gewone tarief" wordt "vanaf het gewone tarief".** NL in `src/data/catalogStyles.nl.js`, EN "at the regular rate" in `catalogStyles.js`. Zet ze in `TEKSTEN-69.md`.
5. **§17 punt 4: de noot bij `assertVoorrang` (`pricing.js`)** zegt dat het plafond van €249 niet meer bijt. Met 4K, looks of extra hoeken bijt het wel. Verbeter de noot; aan het bedrag verander je niets.
6. **§17 punt 17: `notifyRevision()` is dode code.** Haal de functie (`src/lib/notify.js`) en de import (`portal.js`) weg.
7. **§17 punt 6: e-Boekhouden staat niet in de lijst van ontvangers.** Volg de drie stappen in de kop van `src/data/subverwerkers.js`. Dus: een regel in `ONTVANGERS` (naam, wat, waar, grondslag, NL en EN), `LIJST_GEWIJZIGD` op vandaag, en de partij in `docs/AVG-VERWERKINGSREGISTER.md` §5 (`tests/subverwerkers.test.mjs`). Zet in de notitie dat Lucas het token pas zet als de meldtermijn van 14 dagen (`MELDTERMIJN_DAGEN`) voorbij is, en dat er nu nog geen klanten zijn om te mailen.
8. **§17 punt 15: twee regels voor hoe lang credits geldig zijn.** Zoek welk scherm, welke mail of welke tekst nog de oude regel toont (`rollover` 1 en 3 in `plans.js`, `rolloverMonths()` en `rolloverDetail()` in `subscription.js` en `slots.js`). Zet ze op de regel van nu: 3 maanden voor iedereen plus het spaarplafond.
9. **§17 punt 25: documenten die achterlopen.** `kladblok/LIVE-STAPPEN.md` stap 4 ("Nachtelijke taken" heet nu "Vandaag · ‹dag› — …"), stap 8 (V3 = a; Lucas gaat bij de launch naar Workers Paid) en stap 9a ("Facturering" heet nu Abonnement › Je plan › Opzeggen). `docs/KLEURENSCHEMA.md` r. 197 ("Studio donker"; Studio is alleen licht). Het commentaar in `cron/index.js` dat `backup-weekly.cmd` noemt; het bestand heet `.bat`.
10. **Bij vraag 4 = a: de resten van het weeksysteem.** Haal eerst de vijf levende aanroepen weg die §17 punt 14 noemt: `loadQueue` in `planState()`, `queueTerugNaAnnulering`, de AVG-knop die `plan_queue` wist, het opruimen dat `plan_queue` leest, en de welkomstmail die `window_day` leest. Daarna de `queue*`-functies en hun import. Tabel en kolom blijven staan; de migratie komt in het plan van levering 73.

### B. Elke geldstroom van begin tot eind (het hoofdwerk)

Volg voor elke stroom de code van de knop naar de database, de mail, de factuur, het creditboek en de gegevens die naar e-Boekhouden zouden gaan (die koppeling staat uit, maar de vulling moet kloppen). Toets lokaal: met de bestaande toetsen, met de lokale Worker (`kladblok/_doorloop-worker.mjs`, overzicht §13) en met Mollie nagebootst zoals de bestaande toetsen dat doen. Ontbreekt een toets voor een stroom, schrijf die dan.

- **Losse bestelling:** NL-bedrijf (21%); EU-bedrijf met geldig VIES (0%, verlegd); VIES twijfelt of is onbereikbaar (`orders.review_state = pending` → akkoord in /admin → betaallink → betalen binnen 7 dagen); buiten de EU; een consument wordt geweigerd. Met voorrang (minimaal €49, maximaal €249), 4K, extra hoeken, de complete look en een eigen look met toeslag.
- **De €1-proef** (€1,21 incl. btw): één per bedrijf (ook de controle op dezelfde betaler), proef dicht met wachtlijst, geen proef meer voor wie al klant is.
- **Het abonnement:**
  - de eerste betaling als machtiging, en de maandelijkse incasso;
  - een mislukte incasso: Mollie probeert opnieuw, daarna pauze;
  - een terugboeking: de incasso stopt, de credits van die termijn worden bevroren, en "Weer laten lopen";
  - 12 maanden vooruit: credits per maand, de mail in de laatste maand, nooit vanzelf verlengen;
  - het spaarplafond, met de mail 7 dagen vooraf;
  - bijkopen: 10, 25 of 50 credits, hoogstens 100 per maand;
  - overstappen: per volgende termijn, terugdraaien, en wat vervalt boven het nieuwe plafond;
  - pauze (hoogstens 3 maanden) en opzeggen;
  - het plafond van 1.200 credits voor alle abonnees samen.
- **Bestellen met credits:** bijgekochte credits eerst, dan de oudste vervaldatum; te weinig credits; nooit credits en euro's in één bestelling.
- **Geld terug:** annuleren met terugbetalen, tegoed of niets; tegoed besteden; een creditnota; een gedeeltelijke terugbetaling vanuit het Mollie-dashboard die via de webhook binnenkomt (`refunded_cents`).
- **Facturen:** de VIS-reeks loopt zonder gaten door, de PROEF-reeks is alleen voor testmodus, creditnota's trekken uit dezelfde reeks, btw-regels en de vermelding "btw verlegd" kloppen, en adres, KVK en btw-nummer van de klant staan erop.

Repareer echte fouten meteen, met een toets. Verandert een reparatie een bedrag, een termijn of iets wat de klant leest, buiten een duidelijke fout? Verander het dan niet en zet het als open punt in de notitie, met je advies. Lever onderaan de notitie een tabel: **geldstroom · getoetst door · gevonden · gedaan**.

### C. Beveiliging van wat er sinds 8 oktober bij kwam

Op 8 oktober kwamen 14 beveiligingsreparaties en een toets "klant tegen klant" (`test:scheiding`). Daarna kwamen er onder meer bij: bijkopen, overstappen, pauze en terugboeking, formaten (PNG/WebP), het bestelformulier als werkplaats, bestellingen kopiëren, de complete look, /admin/abonnees, Proef dicht/open, e-Boekhouden en Turnstile. Loop per nieuw eindpunt en per nieuwe adminhandeling na:
- wie mag het (klant, admin, niemand);
- kan een klant bij andermans bestelling, abonnement of factuur (breid `test:scheiding` uit);
- worden de invoer en de bedragen op de server opnieuw berekend en nagekeken;
- controleert de webhook zijn bron, en verwerkt hij hetzelfde bericht maar één keer;
- de snelheidsgrenzen, en of er geen geheimen in logs belanden.

Draai ook `npm audit`. Werk een pakket alleen bij binnen dezelfde hoofdversie, en alleen als de hele reeks daarna groen is; de rest zet je met je advies in de notitie. Repareer, toets, en zet in de notitie wat je nagelopen hebt en wat je vond.

### D. Wankele toetsen (vraag 3)

Twee uitrollen stopten op een toets die daarna toch slaagde: `test:doorloop27b` (15 okt) en `test:mailsmerk-browser` (17 okt). Een uitrol die op een toevalstreffer stopt, kost Lucas een kwartier, en na de launch is dat op een slecht moment. Maak ze stabiel zonder ze zwakker te maken: wacht op een voorwaarde in plaats van een vaste tijd. Bij vraag 3 = ja: laat `scripts/uitrol.mjs` een rode toets nog één keer los draaien voordat hij stopt, zoals `testreeks.mjs` doet, met een toets.

---

## 7. Levering 70 · De launchset op de site

**Waarom:** de site verkoopt nu looks die niet in de launchset zitten, en mist er een paar die wel moeten (overzicht §17 punt 21, §24.2 en §30.2). Dit is de grootste stap die nog tussen de site en de launch staat. Lucas' keuzes liggen vast. Wat nog moet gebeuren, is ombouwen.

**Wat vastligt** (Launchlijst, 22 okt, zeven keuzes, alle zeven "a"):

| Dienst | Bij de launch | Gaat van de site tot na de launch |
|---|---|---|
| Catalog | CLASSIC (ghost mannequin; on-model staat stil en kijkt in de lens), CASUAL (flat lay; on-model met heel lichte beweging), CUSTOM | — |
| Lifestyle | FLASH, PHONE-MADE, AUGUST (luxe), CUSTOM | Dunes, Glow |
| Video | MOTION · 8 s (één doorlopend shot; het model doet één handeling, de camera reageert), SHIFT · 8 s (bewerkte look, meerdere shots, close-ups), CUSTOM (per seconde, minimaal 8 s) | Lifestyle Video, Campaign |
| Hooks | IG SPLIT (een deel van het product komt uit de bovenste post en zweeft over de zwarte balk; als foto, of duurder als video) | — |
| Merkmodel | BRAND MODEL | — |
| Abonnement | drie standaard abonnementen of op maat; Editions later als add-on | — |

- Stijlen buiten de launchset gaan van de site, maar niet uit de code. Na de launch komt er één per maand terug, met DUSK als eerste. Bouw het dus zo dat een stijl met één regel weg kan en terug kan komen.
- Casual en Classic kosten hetzelfde. Alle vaste looks binnen een dienst kosten hetzelfde en wegen even zwaar (`STYLE_PUNTEN = {}`).
- Video blijft op aanvraag (`VIDEO_OP_AANVRAAG = true`), hooks ook. CAMPAIGN wordt later een eigen categorie en komt als laatste.
- Op maat bij het abonnement blijft zoals het is: het formulier op /start/plan bestaat al.

**Stap 1: het plan.** Schrijf `kladblok/PLAN-70-LAUNCHSET.md` met per dienst wat er verandert, welke bestanden het raakt, de antwoorden op vraag 5 tot en met 11, en wat Lucas moet aanleveren: per look, per beeldvak, de beelden (naam, maat, verhouding).

**Stap 2: bouwen.**
- **Waar het zit** (beginpunten, zoek zelf verder): `src/data/styles.js` en `styles.nl.js` (lifestyle), `catalogStyles.js` en `.nl.js`, `videoStyles.js` en `.nl.js`, `komendeStijlen.js`, `looks.js`, `pricing.js`, `beeld.js` (plaatshouders), `telefoonbeelden.js`, `schema.js` en `demo.js`; de componenten `order/StylePicker.astro`, `LifestyleHal`, `CatalogHal`, `VideoHal`, `HooksHal`, `StartHal`, `GalleryHal`, `Compare`, `OverHal` en `FormatenHal`; `functions/api/order.js` (welke stijlen de server aanneemt); `src/lib/admin.js` en `src/lib/scaffold.js` (de werkmap per look); de vaste look in Studio (`src/lib/account.js`); mails die een look noemen; de sitemap en `public/_redirects`. Let op `_redirects`: op 14 okt stopte een uitrol op te veel dynamische regels.
- **De toetsen die erover gaan:** `looks`, `looks-browser`, `lookpagina`, `lookpagina-browser`, `start-looks`, `stijlkeuze`, `stijlvel`, `eigen-stijl`, `vaste-look-zelf` en `proef-look`. Toets beide standen van de schakelaar.
- Alles volgt uit de data. Geen tweede lijst met stijlnamen ergens anders: daar is het eerder misgegaan.
- **Beelden:** plaatshouders via het bestaande mechanisme in `beeld.js`. Geen stockbeelden, geen beelden van anderen. **Teksten:** schrijf ze vanuit Lucas' eigen woorden in de tabel hierboven en in §30 van het overzicht, NL en EN, en zet ze allemaal in `TEKSTEN-70.md` met een ●.
- Blauw uur en de ontwerptaal van §29. Het sjabloon van een lookpagina blijft zoals het is: dit is geen nieuwe vormgeving.
- **De voorpagina (levering 74):** in Hoe het werkt, tab Lifestyle, staat een lookkiezer met Dunes, Flash, Glow en de eigen look (`KIES_LOOKS` in `VoorpaginaHal.astro`). Zet daar de launchset in (Flash, Phone-made, August, eigen look), uit dezelfde data, en laat Flash de gekozen look. Op de voorpagina staat Formaten zonder tekst (`FormatenHal` met `kaal`); dat blijft zo.
- In de notitie: in welk bestand en op welke regel hij de schakelaar omzet, en per look welke beelden hij nog moet maken.

---

## 8. Levering 71 · Zelf beelden, iconen en teksten vervangen

**Waarom:** Lucas, 18 oktober: hij loopt alle tekst NL en EN zelf na, en hij wil ook de beelden en iconen zelf kunnen vervangen, want "er staan nog veel plaatshouders en oude foto's en stijlen op de site". Nu kost elke beeldwissel een levering van Claude. Na de launch, met één nieuwe stijl per maand, wordt dat zijn vaste werk.

**Wat er al is:**
- **Beelden:** `src/data/beeld.js` met `PLAATSHOUDERS = true` en `scripts/plaatshouders.mjs`. Een nieuw bestand onder de verwachte naam in `public/img/` staat er bij de volgende build; een bestaande naam overschrijf je en zet je in `KLAAR`. Daarnaast `oude-beelden.json`, de beeldscripts (`make-avif.mjs`, `beeldtelling`, de telefoonversies in `telefoonbeelden.js`) en `sharp` in de devDependencies.
- **Teksten:** `npm run tekstronde` (markdown om te lezen), `npm run tekstblad` (één tabel als xlsx) en `scripts/tekst-toepassen.mjs` (een ingevulde ronde terug in de bron, met de reparaties voor apostrofs en dubbele zinnen).
- **Iconen:** het iconenkit in `src/data/iconen.js` (raster 24, gevuld, één snede, één zachte hoek, §29.4).
- **Een gereedschap dat al werkt zoals hij het wil:** `FORMATEN.bat`, een dubbelklik met een duidelijk resultaat. Hij wil geen opdrachtregel waarbij hij "hoopt dat het gelukt is".

**Stap 1: een telling en een plan.** Tel eerst: hoeveel beeldvakken heeft de site, welke zijn plaatshouder, welke zijn oud, op welke pagina staan ze, en welke verhouding, minimale maat en formaten vraagt elk vak? Schrijf dat met de gekozen opzet (vraag 12 en 13) in `kladblok/PLAN-71-ZELF-VERVANGEN.md`.

**Stap 2: bouwen** (bij vraag 12 = a):
- **`BEELDEN.bat` en een map `eigen-beelden\`.** Daarbij een lijst of contactblad van alle vakken, met per vak een naam, de pagina, de verhouding en de minimale maat. Lucas zet een bestand onder die naam in de map en dubbelklikt. Het script maakt alle maten en formaten die de site nodig heeft, zet ze in `public/img/`, werkt `beeld.js` bij, controleert maat en verhouding, en maakt een contactblad voor en na. Daarna rolt hij uit zoals altijd.
- **`TEKSTEN.bat` en `TEKSTEN-TOEPASSEN.bat`.** De eerste maakt de tabel. De tweede zet zijn ingevulde tabel terug, toont wat er verandert en draait de toetsen. `tekst-toepassen.mjs` leert daarvoor ook een xlsx lezen.
- **Iconen:** een svg onder de naam van het icoon, die het script tegen de regels van het kit legt.
- Alleen Node en wat al in `package.json` staat; ga er niet van uit dat hij Python heeft. Windows-paden met spaties en haakjes (`E:\Claude (VISUAILS)\visuails-astro`): kijk hoe `FORMATEN.bat` dat oplost. Het resultaat is groen of rood, in gewone woorden, met wat hij moet doen als het rood is. Met toetsen voor de scripts zelf, en een korte uitleg bovenaan elke .bat, zoals in `FORMATEN.bat`.

Bij vraag 12 = b schrijf je in het plan hoe de upload in /admin zou werken (R2, cache, CSP, herkomsttag, toetsen) en bouw je hem; vraag 13 bepaalt wat erin zit.

## 9. Levering 72 · Snel en goed te lezen voor je advertenties

**Waarom:** in Q4 begint Lucas met advertenties op Meta, TikTok en Google. Elke klik gaat naar een landingspagina, meestal op een telefoon. Een pagina die traag laadt of verspringt, kost dan echt geld. De landingspagina's zijn de voorpagina, /catalog, /lifestyle, /video, /hooks, de lookpagina's, /pricing, /plans, /start en /test-sample, NL en EN.

1. **Meten, op 390 en 1440 px:** wanneer het grootste beeld staat (op de voorpagina de still van de opening, `public/img/hal/opening/still-*.avif|webp`; de 117 videobeelden in `opening/f/` laden pas daarna; op /catalog, /lifestyle en /video nog de laptopstanden in `public/img/hal/stand/`), verspringingen tijdens het laden, de letters (Urbanist en IBM Plex Mono, zelf gehost), het gewicht per pagina, en wat de Worker meegeeft aan cache. Gebruik Playwright; is Lighthouse via npm te draaien, dan dat ook.
   Al gemeten op 25 okt (lokaal, zonder compressie): voorpagina op 390 px 2,0 MB in het eerste scherm, ook de beelden van Hoe het werkt en Formaten die pas verder naar beneden staan; op 1440 px laadt de reeks van de opening (117 beelden) direct na de still. LCP 0,8 s, CLS 0,002 tot 0,016, axe zonder fouten.
2. **Verbeteren, zonder dat iemand iets anders ziet:** de volgorde en voorrang van het laden, de maten in `srcset`, voorladen wat boven de vouw staat, verspringingen weg, cache. Bij vraag 14 = nee alleen meten en een plan schrijven.
3. **Toegankelijkheid:** draai axe over alle openbare pagina's. In `kladblok/` staan al `axe-admin.mjs` en `axe-dashboard.mjs` als voorbeeld. Repareer wat je niet ziet: labels, alt-teksten, volgorde voor de tab-toets, namen van knoppen. Nieuwe alt-teksten gaan in `TEKSTEN-72.md`.
4. **De bestaande controles:** `npm run kruip`, `npm run audit` en `npm run check:csp`. Repareer wat ze vinden, of zet het met reden in de notitie.
5. `npm run visueel` moet daarna precies gelijk zijn. Lever een tabel per pagina: **voor · na · wat je deed**.
6. **Laat de opening heel.** De voorpagina is sinds levering 74 een vastgezet podium met een scrollvideo op een canvas, Hoe het werkt in hetzelfde scherm, en op de computer de stroom (één wieltik of toets naar de volgende sectie, `STROOM` in `HalOpening.astro`). Verander niets aan hoe dat beweegt of wanneer het afspeelt; `tests/opening-74.test.mjs` moet groen blijven. De beelden die Claude aflevert, dragen content credentials (C2PA, een uuid-blok van ongeveer 6 kB per beeld); dat blok blijft erin. De toets meet daarom de beelddata apart.

## 10. Levering 73 · Plannen voor later (alleen opschrijven, niets bouwen)

Drie korte plannen in `kladblok/`, elk met twee of drie opties, jouw advies, wat Lucas zelf moet doen of aanmaken, en de kosten. Lucas kiest later via een afvinklijst in de chat met de brug.

1. **`PLAN-ADVERTENTIES-METEN.md`.** Hoe Lucas straks per advertentie ziet wat die oplevert, zonder scripts van advertentieplatforms op de site (hij koos op 8 aug voor zo min mogelijk scripts van buiten, zodat cookiebanner en privacybeleid eenvoudig blijven). Kijk wat de site nu al vastlegt van waar een bezoeker vandaan komt (UTM-parameters, verwijzer). Werk dan uit:
   - dat vastleggen bij de bestelling, op de server;
   - een betaalde bestelling vanuit de Worker doorgeven aan de Meta Conversions API en aan de conversies van Google Ads;
   - wat dat betekent voor de cookiebanner, het privacybeleid en de lijst van ontvangers.
2. **`PLAN-WEEKSYSTEEM-OPRUIMEN.md`.** De migratie die `plan_queue` en `subscriptions.window_day` laat vallen: in welke volgorde, hoe Lucas hem draait, hoe je terug kunt, en welke toetsen het bewaken.
3. **`TEKSTRONDE-SPELLING.md`.** De uitkomst van `npm run spelling` en `npm run audit:tekst`, per pagina en per taal, als lijst voor Lucas' tekstronde. Je verandert zelf geen enkele zin. Ontbreekt hunspell en is het niet te installeren, zeg dat dan.

---

## 11. Terug naar zijn map (voor Lucas en voor de chat met de brug)

1. **Lucas** zegt in zijn chat met de brug: "Haal de leveringen op van branch `claude/voor-de-launch`."
2. **Die chat** haalt de branch op (de repo is openbaar) en leest de `kladblok/LEVERING-*.md` die nieuw zijn. Hij vergelijkt hun bestandenlijsten met `git diff --name-status origin/main...origin/claude/voor-de-launch`. Daarna kijkt hij in Lucas' map naar de wijzigtijd van elk van die bestanden. Is een bestand in zijn map veranderd na de laatste uitrol, dan stopt hij en vraagt hij wat voorgaat. Anders zet hij de bestanden in porties van hoogstens 50 in zijn map en legt hij de groottes na. Wat onder "Mag weg" staat, verwijdert hij niet; dat zegt hij tegen Lucas. De blokken "Voor het overzicht" verwerkt hij in `kladblok/VISUAILS-OVERZICHT-24-OKT.md`.
3. **Lucas** rolt uit met `UITROLLEN.bat`. Daarna staat alles ook op `main`. Levering 70 blijft uit tot hij de schakelaar omzet.

Rol tussen twee cloudsessies altijd eerst uit. Dan begint de volgende sessie met alles wat in zijn map staat.

---

## 12. Wat bewust níet in deze sessie zit

- **De voorpagina:** die is net omgebouwd (levering 74, 25 okt). Alleen levering 70 (de looks in de data) en levering 72 (laden, zonder dat iemand iets ziet) raken hem.
- **De beelden van 1560 px (lijst 45):** de bronbestanden staan op zijn pc, niet in de repo.
- **Het merkboek naar Blauw uur:** dat is een artifact, geen code.
- **Een productanalyse per bestelling:** die zit al in zijn Magnific-borden.
- **De live-stappen (§16.1):** sleutels, Workers Paid, Mollie live en het opruimen van testabonnementen doet Lucas zelf.
- **Teksten herschrijven:** dat doet Lucas zelf. Jij levert alleen wat hij nodig heeft om het te doen.
