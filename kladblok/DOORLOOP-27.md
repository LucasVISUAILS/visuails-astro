# Doorloop 27 — de hele site, als klant en als Lucas (14 oktober 2026)

Lucas 21:30: alles handmatig in de browser gebruiken, elke stijl op verschillende
manieren bestellen, elke contactweg, per type klant redeneren, via /admin de
orders vullen, abonnementen helemaal doorlopen, elke pagina en elk product,
VISUAILS Studio en /admin. Uitkomst: wat direct moest (toegepast, levering 47) en
wat optioneel is (afvinklijst 27). Daarna alles wat toegepast is opnieuw
nagelopen, op werking en op uiterlijk.

Omgeving: kladblok/_doorloop-worker.mjs (Worker met eigen D1 en R2, nep-Mollie,
nep-Resend, paneel op :4478). Browser: Chromium via Playwright, 390 en 1440 px,
NL en EN. Live (visuails.com) alleen bekeken, niets ingediend.

Per punt in de lijsten hieronder: waar · wat er misging · voor wie (P1–P6, L = Lucas).

## Wie bestelt (de typen klant)

- P1 · jong, eigen streetwearmerkje, telefoon, WhatsApp, ongeduldig, let op de prijs
- P2 · 55+, webshop in damesmode, laptop, mail, voorzichtig, wil zekerheid en uitleg
- P3 · perfectionist, merkmanager, wil controle over looks, revisies en formaten
- P4 · twijfelaar, eerste keer, wil eerst de €1-proef, leest alles, haakt af bij onduidelijkheid
- P5 · bureau, meerdere merken, veel producten, EU-bedrijf (btw verlegd), facturen
- P6 · Engelstalig, buiten Nederland, andere btw

## Wat er gedaan is (de werklijst)

A · voorbereiding
- [x] harness, admin-inlog, mails en betalingen zichtbaar in het paneel
- [x] inventaris: 97 publieke pagina's, alle Studio-pagina's, alle adminschermen

B · publieke pagina's (NL + EN, 390 + 1440)
- [x] elke pagina gekropen op beide breedtes: links, beelden, console, horizontale scroll
- [x] contrast gemeten met alle uitklapblokken open: nergens onder 4,5:1
- [x] koppen: 780 gemeten, na de aanpassing 0 boven twee regels (B25)
- [x] cookiekaart (alles, weigeren, later), meldingen onderin, WhatsApp-knop, taalwissel (B37)

C · bestellen
- [x] catalog: 1, 2, 5 en 20 producten; Zalando; voorrang met verhouding 4:5; zonder foto's
- [x] btw: NL bedrijf, DE verlegd, GB, BE met ongeldig nummer (B05)
- [x] betalen: betaald, mislukt, geannuleerd, opnieuw betalen
- [x] lifestyle: dunes, flash (telefoon), glow (EN), phone-made, eigen look
- [x] video: motion, lifestyle (telefoon), campaign, eigen look (EN); aanvraag, offerte, betalen (B14, B17)
- [x] merkmodel: aanvraag en betalen
- [x] €1-proef: wachtlijst, catalog, lifestyle EN op de telefoon, tweede keer geweigerd (B41)
- [x] uploads: te klein, donker, HEIC, 30 MB, pdf, zes tegelijk
- [x] rand: dubbel klikken, terugknop, verversen midden in het formulier
- [x] ingelogd bestellen met credits (B26, B26b, B27), bestellimiet (B06)

D · abonnementen
- [x] maand en jaar afsluiten, eerste betaling, termijn, mislukte termijn (B20), terugboeking (B19)
- [x] pauzeren, hervatten, opzeggen (B28), credits bijkopen, bestellen met credits
- [x] /start/plan en /pricing nagerekend: bedragen en credits overal gelijk

E · VISUAILS Studio
- [x] inloggen met code en link, onbekend adres, verkeerde code drie keer (B40), oude link, uitloggen op de telefoon
- [x] VOLT, NOORD (leeg, EN) en een nieuwe klant: elke pagina op 390 en 1440
- [x] beelden bekijken, revisie aanvragen, revisieronde terug, afronden
- [x] PNG/WebP vragen (B31), tevredenheid, foto's nasturen
- [x] facturen: pdf gedownload en gelezen; de factuur van een ander geeft 404
- [x] privélink /o/… voor catalog en lifestyle (B11, B36); klant A ziet niets van klant B

F · contact
- [x] contactformulier NL en EN (B29, B30), WhatsApp zonder nummer, studiobrief
- [x] WhatsApp-links op de bedankpagina (B24)

G · /admin
- [x] inloggen, licht en donker, elk scherm gekropen (B02)
- [x] Nu doen (B03, B10, B35), oppakken, vullen, melden, revisieronde (B08, B09)
- [x] annuleren met terugbetaling en met tegoed (B32), btw-controle, offerte
- [x] planning: dag dichtzetten en weer open, verzetten naar een dichte dag (B39), verzetten met reden, App/Mail de klant
- [x] melding in Studio, proef dicht en open, tegoed boeken (B33), bestelling namens een klant (B34)

H · mails: elke mail die voorbijkwam, NL en EN, in het paneel gelezen (B04, B08, B12, B20)

I · achter de schermen: bedragen formulier = Mollie = factuur = Studio; rechten tussen klanten; de testreeks (244 stappen)

## Per type klant: waar het nog wringt

- P1 · opgelost: de WhatsApp-tekst na bestellen noemt het kenmerk, WhatsApp kiezen zonder nummer kan niet meer, koppen passen op de telefoon. Open: na het afsluiten van een abonnement opnieuw je adres typen (B18), de proef wordt pas aan het eind geweigerd (B41).
- P2 · opgelost: de kaart "nog geen abonnement" is weer leesbaar, de leesmij klopt met de zip en wijst naar Studio, "in VISUAILS Studio" overal. Open: twee mails vlak na elkaar bij betalen (B04), beelden heten hun bestandsnaam (B36), niets horen na een terugboeking (B19) of na een PNG-verzoek (B31), tegoed zonder bericht (B33), de code-zin bij een tikfout (B40).
- P3 · opgelost: de revisiemail aan Lucas noemt "Product 2 · Detail", "geldig tot en met" overal, met credits staat er één prijs in credits. Open: een notitie per beeld in de revisieronde (B44).
- P4 · opgelost: de bedankpagina na een offerte belooft niet meer "vaak binnen een dag". Open: de proef wordt pas na alle stappen geweigerd (B41), de €1-knop op de videopagina's (B42).
- P5 · opgelost: de bestellimiet zegt wat er aan de hand is, aanvragen staan niet meer in de btw-controle. Open: een ongeldig btw-nummer wordt pas na het bestellen opgemerkt (B05), de factuurregel (B45).
- P6 · opgelost: het Engelse onderwerp in de contactbevestiging, de taalwissel houdt de zoekstring, name@brand.com, de annuleringsreden zegt dat de klant Engels leest.

## Direct toegepast (levering 47)

- B02 · /admin, Studio, privélink · keuzelijsten zonder pijltje (data:-beeld geweigerd door de CSP) → pijltjes als bestand in /img/ui/, toets paneel-beelden
- B03 · Nu doen · "Oppakken" opende alleen de bestelling → de knop zet de status meteen en opent de werkmap
- B06 · bestellen · bij de bestellimiet stond "kwam niet aan op onze server" → eigen tekst met het aantal minuten
- B07 · EN · voorbeeld naam@merk.nl → name@brand.com
- B08 · revisiemail aan Lucas · "p2 · worn" en de notitie onder elk beeld → "Product 2 · Op model", de notitie één keer
- B10 · bestelpagina · "Revisie openen" sprong naar het dashboard → naar het vak met de revisie op dezelfde pagina
- B11 · privélink en Studio · "één map per product" → "in één download, de bestandsnaam zegt welk product"
- B12 · LEESMIJ · /nl/portal (uitlegpagina), "dashboard", "dertig mappen" → VISUAILS Studio en de levermail, platte map, WhatsApp-nummer
- B13 · Studio /account/plan · wit op wit (1,0:1) → donkere kaart
- B14 · videopagina's → aanvraag · ?style= ging niet mee → meegegeven en voorgeselecteerd
- B15 · bedankpagina na een aanvraag · "Bekijk je bestelling" → "Bekijk je aanvraag"
- B16 · /catalog/custom → aanvraag · opende met "Lifestylescènes" → ?voor=catalog
- B17 · bedankpagina na een betaalde offerte · beeldenbestelling-tekst → offertetekst, zonder levertijd en aanleverblok
- B20 · mail mislukte afschrijving · "vernieuw je machtiging" (kan nergens) → "beantwoord deze mail of app ons"
- B21 · Studio, credits · "geldig t/m 13 jan" naast "vervalt op 14 jan" → overal "geldig tot en met"
- B22 · /start/plan · "in je dashboard" → "in VISUAILS Studio"
- B23 · bedankpagina · "zo snel mogelijk" terwijl de datum volgt → "Leverdatum volgt"
- B24 · bedankpagina · WhatsApp-tekst zonder kenmerk → met kenmerk, bestelling of aanvraag
- B25 · telefoon · koppen op drie regels → h1 40/36 px, h2 32/28 px onder 480/380 px
- B26 · stap 5 met credits · euroregels onder de creditregel → één regel "Betaling · 8 credits"
- B26b · overzicht naast het formulier en stap 1 met credits · "Totaal €178 excl. btw" → "Totaal 8 credits", zonder "excl. btw"
- B27 · bedankpagina na credits · "je factuur komt zo" → "Betaald met je credits", geen factuurregel
- B29 · contactformulier · WhatsApp zonder nummer ging door → nummer verplicht zodra WhatsApp aanstaat
- B30 · contact EN · Nederlands onderwerp in de bevestiging → Engels
- B32 · /admin annuleren · de reden komt in de mail, dat stond nergens → zichtbare regel, ook "deze klant leest Engels"
- B34 · /admin bestelling namens een klant · 500 zonder telefoon → telefoonveld, fouten in gewone taal, status 400, link terug
- B35 · btw-controle · elke aanvraag van € 0 stond erin → aanvragen zonder prijs eruit
- B37 · taalwissel · zoekstring en anker vielen weg → gaan mee
- B38 · overzicht naast het formulier · "Gezicht —" bij "wij kiezen" → "Wij kiezen er een"
- B39 · /admin planning · verzetten naar een dichtgezette dag gaf "hij zit echt vol" → zegt dat de dag dicht staat, met de link terug naar de planning
- B46 · bevestigingsmail van een aanvraag · de WhatsApp-link zei "mijn bestelling" → "mijn aanvraag"

## Optioneel (afvinklijst 27, met advies)

- B01 · console na doorklikken naar /start · één CSP-regel, geen zichtbaar effect · a: de twee inline modulescripts als bestand bouwen (advies) · b: laten
- B04 · twee mails binnen seconden na betalen · a: één mail na de betaalstatus (advies) · b: de eerste zonder betaalblok
- B05 · ongeldig EU-btw-nummer pas na bestellen · a: in stap 3 nakijken (VIES) en meteen zeggen (advies)
- B09 · revisieronde: drie paarse knoppen, de klant kreeg twee mails · a: de knoppen per product stil, die in "Volgende stap" primair (advies)
- B14b · Campaign en Eigen look gaan alleen naar WhatsApp · a: ook naar het formulier, WhatsApp als tweede knop (advies)
- B15b · aanvraagmail aan Lucas met ruwe velden ("Reden: no-country") · a: opschonen (advies)
- B18 · na een abonnement opnieuw je adres typen · a: adres vooringevuld en de uitlegzin weg (advies) · b: meteen ingelogd via de terugkeerlink
- B19 · terugboeking: de klant hoort niets · a: korte mail (advies) · b: bewust niet, Lucas belt
- B28 · opzeggen: de bevestiging staat twee keer · a: alleen de melding bovenaan (advies)
- B29b · contactmail aan Lucas zonder "App <naam>"-knop · a: knop erbij (advies)
- B31 · PNG/WebP: daarna niets meer · a: mail bij Klaar (advies) · b: alleen de zin aanvullen
- B33 · tegoed boeken zonder bericht aan de klant · a: vinkje "klant mailen" met de reden (advies)
- B36 · beelden heten hun bestandsnaam · a: kopje per product, "Voorkant · Op model" als label (advies)
- B40 · verkeerde inlogcode: "werkt niet (meer) — 10 minuten geldig" ook bij een tikfout · a: "Die code klopt niet of is verlopen. Kijk de zes cijfers na, …" (advies; zelfde zin voor iedereen, dus geen accountopsomming)
- B41 · €1-proef: "je had al een proef" pas na alle stappen · a: in stap 3 nakijken zodra het adres er staat (advies)
- B42 · €1-knop op de videopagina's · a: "met foto's" erbij, de proef is geen video (advies) · b: weg op de videopagina's
- B43 · bestelpagina "daarna de status op In controle", terwijl Melden die stap overslaat · a: "daarna Melden" (advies)
- B44 · revisieronde: één notitie voor alle beelden · a: notitie per beeld (advies, groter werk)
- B45 · factuurregel "Catalog — 3 producten · 1 × €267" · a: later "3 × €89", toeslagen als eigen regels (advies; credits en toeslagen maken het groter) · b: nu · c: zo laten

## Geen fout (harness)

- VOLT "Hervatten" faalt: de nep-Mollie kent het ingezaaide abonnement niet. Met een nieuw abonnement werkt hervatten.
- De facturen van VOLT geven 404 bij de pdf: de zaaidata heeft geen bestanden in R2. Een echte factuur downloadt en klopt.
- "nep-mollie" in de betaallinks bestaat alleen in de harness; molliePayUrl laat live alleen mollie.com toe.

## Nagelopen na het toepassen

- Elk toegepast punt opnieuw door de browser, met dezelfde schermen (afvink27/png).
- Bestellen met credits: overzicht, stap 1 en stap 5 zeggen "8 credits"; naar meer dan 20 producten en terug: de euroregel komt terug en gaat weer weg.
- Koppen: 780 gemeten, 0 boven twee regels. Contrast: nergens onder 4,5:1.
- Kruipers: publieke pagina's alleen 401 (/account/me) en 429 door het kruiptempo; Studio en /admin schoon.
- De hele testreeks (244 stappen) groen.

## Nieuwe en gewijzigde klantteksten (plek · NL · EN)

● Bestelformulier, laatste stap, bij de bestellimiet · Je hebt kort na elkaar een paar bestellingen geplaatst. Er is niets aangemaakt en niets in rekening gebracht. Probeer het over {min} opnieuw — of mail hello@visuails.com, dan zetten we hem met de hand in. · You have placed several orders in a short time. Nothing has been created and nothing charged. Try again in {min} — or email hello@visuails.com and we will enter it by hand.
● Bestelformulier EN, onvolledig e-mailadres · (alleen EN) …like name@brand.com. Check it and send again.
● Stap 5, met credits, regel "Betaling" · {n} credits van je abonnement — je betaalt niets bij Mollie · {n} credits from your plan — nothing to pay at Mollie
● Overzicht naast het formulier en stap 1, totaal met credits · {n} credits · {n} credits
● Overzicht naast het formulier, gezicht · Wij kiezen er een · We pick one
● Stap 5, credits die als eerste opgaan · De oudste gaan eerst: {aantal} daarvan blijven geldig tot en met {datum}. · The oldest go first: {aantal} of these stay valid up to and including {datum}.
● Stap 5, credits die daarna binnenkort aflopen · Na deze bestelling zijn er {aantal} nog maar geldig tot en met {datum}. · After this order, {aantal} credits are only valid up to and including {datum}.
● Bedankpagina na een betaalde offerte · We gaan aan de slag zoals in de offerte staat. Heb je je productfoto's nog niet gestuurd? Beantwoord dan de mail met de foto's, of stuur ze via WhatsApp. Je krijgt een mail zodra er iets klaarstaat om te bekijken. · We get to work as set out in the quote. Not sent your product photos yet? Reply to the email with the photos, or send them on WhatsApp. You get an email as soon as there is something to look at.
● Bedankpagina na een aanvraag, knop · Bekijk je aanvraag · See your request
● Bedankpagina na credits, kop · Betaald met je credits — we gaan aan de slag. · Paid with your credits — we are on it.
● Bedankpagina na credits, onder de kop · Betaald met de credits van je abonnement. Je hoeft niets meer te doen. · Paid with your plan credits. There is nothing left for you to do.
● Bedankpagina, levertijd als de datum nog volgt · Leverdatum volgt — we spreken hem met je af · Delivery date to follow — we agree it with you
● Bedankpagina, WhatsApp-tekst na een bestelling · Hoi VISUAILS, een vraag over mijn bestelling {ref}: · Hi VISUAILS, a question about my order {ref}:
● Bedankpagina, WhatsApp-tekst na een aanvraag · Hoi VISUAILS, een vraag over mijn aanvraag {ref}: · Hi VISUAILS, a question about my request {ref}:
● Bevestigingsmail van een aanvraag, de link "app ons" · Hoi VISUAILS, een vraag over mijn aanvraag {ref}: · Hi VISUAILS, a question about my request {ref}:
● Bedankpagina, WhatsApp-tekst na het contactformulier · Hoi VISUAILS, ik stuurde net een bericht via het contactformulier. · Hi VISUAILS, I just sent a message through the contact form.
● Contactformulier, WhatsApp zonder nummer · Vul je nummer in, dan kunnen we je via WhatsApp antwoorden — met landcode als het geen Nederlands nummer is. · Fill in your number so we can reply on WhatsApp — with the country code if it is not a Dutch number.
● Contactbevestiging (mail), WhatsApp gekozen zonder nummer · …antwoorden per mail (je koos WhatsApp, maar er stond geen telefoonnummer bij)… · …reply by email (you chose WhatsApp, but there was no phone number)…
● Mail mislukte afschrijving · Is je rekening veranderd? Beantwoord deze mail of app ons, dan sturen we je een link om je nieuwe rekening te koppelen. · Has your bank account changed? Reply to this email or message us on WhatsApp, and we send you a link to connect your new account.
● Studio, credits (saldo, creditboek, bijgekocht) · …blijven geldig tot en met {datum} · …stay valid up to and including {datum}
● /start/plan, opzeggen · zelf, in VISUAILS Studio · Elke maand opzegbaar, zelf in VISUAILS Studio. · yourself, in VISUAILS Studio · Cancel any month, yourself in VISUAILS Studio.
● Privélink, "Jouw bestanden" · Al je beelden in één download, zoals we ze leverden ({fmt}). De bestandsnaam zegt welk product en welke opname het is. · Every image in one download, as we delivered it ({fmt}). The filename tells you which product and which shot it is.
● Studio, bestelling, "Jouw bestanden" · Alle beelden van deze bestelling in één download, in de beeldverhouding die je koos. De bestandsnaam zegt welk product en welke opname het is. · Every image from this order in one download, in the shape you chose. The filename tells you which product and which shot it is.
● LEESMIJ, platte map · Ze staan al bij elkaar in deze map. Selecteer ze allemaal en sleep ze naar je webshop. · They are already together in this folder. Select them all and drag them into your shop.
● LEESMIJ, bewaartermijn · De map blijft {n} dagen te downloaden in VISUAILS Studio (visuails.com/account) en via de link in je levermail. · The folder stays downloadable for {n} days in VISUAILS Studio (visuails.com/account) and through the link in your delivery email.
● LEESMIJ, revisie · Vraag een revisie aan bij het beeld zelf: via de link in je levermail, of in VISUAILS Studio op visuails.com/account. · Ask for a revision on the image itself: through the link in your delivery email, or in VISUAILS Studio at visuails.com/account.
● LEESMIJ, contact · Liever bellen of appen? App ons op {nummer} of mail hello@visuails.com, dan bellen we je terug. · Prefer a call or a message? WhatsApp us on {nummer} or mail hello@visuails.com, and we will call you back.
● /admin (Lucas), annuleren · Je reden komt letterlijk in de annuleringsmail en op de tijdlijn — deze klant leest Engels, schrijf hem in het Engels.
● /admin (Lucas), bestelling namens een klant, fouten · Er staat geen geldig telefoonnummer bij (minstens acht cijfers). Vul het in het formulier in. · Het e-mailadres van deze klant is niet compleet. … · Er staat geen naam of merk bij deze klant. … · Er zijn net te veel bestellingen achter elkaar aangemaakt. Wacht een paar minuten en probeer het opnieuw.
● /admin (Lucas), planning, verzetten naar een dichte dag · {datum} staat dicht ({reden}). Kies een andere dag, of zet hem weer open onderaan de planning.
