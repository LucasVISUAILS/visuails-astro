# Levering: de beveiliging en de back-end sterker (5 november 2026)

> **NOG NIET AF** (deze notitie wordt bij elke push bijgewerkt):
> - De reparaties: stap 1 tot en met 9, en 14, 15 en 16 zijn af. Stap 10 tot en met 13 en 17 tot en met 19 in
>   `kladblok/PLAN-BEVEILIGING.md` §4 nog niet (stap 14 tot en met 19 kwamen uit het vierde deel van de naloop, de
>   betaal- en bestelroutes; 14 ging voor omdat hij het zwaarst is).
> - De eindcontrole.

Cloudsessie, branch `claude/voor-de-launch`. Het plan, met wat niet kapot mag en de nacontrole per stap, staat in
`kladblok/PLAN-BEVEILIGING.md`. Het nummer van deze levering laat ik aan de chat met de brug.

## Stap 0 · Het vangnet (af)

Eerst vastgelegd wat er nu goed werkt, zodat elke wijziging die het breekt meteen rood wordt:
**`tests/vangnet-beveiliging.test.mjs`** (`npm run test:vangnet`, in de keten, 40 controles):
- **/admin van begin tot eind met de tweede stap aan**, zoals Chrome het doet: wachtwoord → halve sessie → het scherm
  van de code → een verkeerde code geweigerd → de goede code → het dashboard en de pagina Beveiliging ("aan") →
  uitloggen, waarna het oude koekje niets meer opent; de tweede stap staat daarna nog aan.
- **De Origin-controle van /admin en Studio** in elke combinatie die een browser stuurt, ook `Origin: null` onder
  `Sec-Fetch-Site: same-origin` (de fout van 1 augustus, waar geen toets voor was).
- **De headers en koekjes** waar het op leunt: `referrer-policy: same-origin`, de CSP van /admin, HSTS, nosniff,
  no-store, `vis_admin` met HttpOnly, Secure, SameSite=Strict en Path=/admin.

**Nagekeken dat hij echt alarm slaat:** op een kopie van de code in het kladblok (zodat de echte code nooit kapot
staat) zes keer iets gebroken: de Origin-controle zoals op 1 augustus, een halve sessie die als hele telt, elke code
aangenomen, het koekje op Lax, `no-referrer`, en de Origin-controle van Studio uit. **Alle zes rood.**

**En door de echte Worker heen:** `kladblok/_e2e-beveiliging.mjs` logt van buitenaf in op de lokaal draaiende Worker
(`kladblok/_doorloop-worker.mjs`: de gebouwde site met een eigen D1 en R2, en een nep-Mollie en nep-Resend), met de
tweede stap aan en de headers van Chrome, doet een POST zoals Chrome onder `no-referrer`, opent Beveiliging, logt uit,
en kijkt naar Studio en de headers. Nulmeting op de code van vóór deze levering: **19 van 19**.

## Stap 1 · De grens van 100 waarden per query (af)

**Het gat.** D1 neemt hoogstens 100 gebonden waarden per query; daarboven: "too many SQL variables". Op negen plekken
ging een lijst met één `?` per bestelling, klant, adres of beeld in één query. Zolang de zaak klein is gaat dat goed;
daarna breekt het, en meestal stil:
- **/admin**: het dashboard toont tot 200 bestellingen en vroeg de modellen van al hun klanten in één query. Vanaf 101
  verschillende klanten: een **500**, dus geen dashboard. De rode pil "teruggeboekt" en de markering "mail kwam niet
  aan" vielen om dezelfde reden **stil** weg (hun fout werd opgevangen).
- **/admin, een klant wissen**: met meer dan 100 bestellingen niet te wissen (het faalde wel veilig, vóór er iets weg
  was).
- **Studio**: de tevredenheid bij meer dan 100 afgeronde bestellingen; een revisieronde of het nakijken met meer dan
  ongeveer 97 aangevinkte beelden; Formaten.
- **De privélink**: een revisieronde met meer dan 99 beelden gaf "even niet bereikbaar"; de mail aan de studio
  noemde de beelden dan niet bij naam.
- **De nachtelijke opruiming**: vraagt tot 400 bestanden in één keer op en zou vanaf 101 elke nacht omvallen, zodra
  de rem `PURGE_ENABLED` los gaat.

**De reparatie.** Eén hulpje, `src/lib/d1Lijst.js`: vraag in groepen van 80 (ruimte voor de andere `?`-plekken),
na elkaar, en plak de rijen aan elkaar. Bij een lijst tot 80 verandert er niets: één query, zoals voorheen. Op de twee
plekken waar de volgorde over de hele lijst ertoe deed, wordt daarna nog één keer gesorteerd.

**Het bewijs.** De nep-D1 van de toetsen (`tests/lib/d1sqlite.mjs`) kan nu de echte grens afdwingen
(`d1(db, { maxWaarden: 100 })`). `tests/backend-sterker.test.mjs` (`npm run test:backend`, in de keten) speelt elk
geval na met de echte aantallen: /admin met 200 bestellingen van 150 klanten, 120 bestellingen in Studio, 110 beelden
op de privélink, een klant met 120 bestellingen wissen, 150 verlopen bestanden opruimen. **Op de oude code 9 controles
rood, op de nieuwe 15 van 15 groen.**

**Nacontrole.** De 2FA-set (vangnet 40, tweede stap 51, beveiliging 40, 8 oktober 17, 69 24, klantscheiding 161,
inloggen, /admin), de toetsen van de nachtelijke taak (opruimen 46, nachtgrenzen 65), en de hele testreeks:
**286 van 286 groen**. De diff regel voor regel teruggelezen: hij raakt geen inlog, geen koekje, geen Origin-controle,
geen betaling en geen mail; alleen hoe negen lijsten worden opgevraagd.

## Stap 14, 15 en 16 · De betaalwebhook (af)

**14 · Een betaalde bestelling kon voorgoed onbetaald blijven.** De webhook zet eerst een rij in `payments` en daarna
de bestelling op betaald. Haperde D1 precies daartussen, dan antwoordde hij 500 en kwam Mollie terug, zoals het hoort.
Maar de herhaling stuitte op de UNIQUE van `payments`, las dat als "al gedaan" en stopte. De bestelling bleef
onbetaald: de nacht stuurt dan een betaalherinnering en annuleert haar later, terwijl de klant betaald heeft. Nu kijkt
de webhook bij die UNIQUE eerst hoe de bestelling er nu voor staat. Betaald, terugbetaald of geannuleerd: stil
aflopen, zoals voorheen. Anders: alsnog afmaken, waarbij de UPDATE naar betaald de claim is (zet hij niets, dan was
een andere aflevering net eerder en stopt deze, zodat melding en factuur niet twee keer uitgaan).
Erbij: de tijdlijnregel "Betaling ontvangen" had geen vangnet. Mislukte alleen die regel, dan gingen de melding aan de
studio en de factuur nooit uit (de herhaling zag een betaalde bestelling). Nu wordt die fout gelogd en loopt de rest
door.

**15 · Een mislukte incasso gaf bij elke herhaalde aflevering opnieuw een mail** aan de klant en de studio. Nu niet
meer: zette de INSERT niets, dan is de mail al uit. Het pauzeren loopt wel gewoon (dat is twee keer hetzelfde).
Hetzelfde voor de melding "betaling niet gelukt" bij een bestelling.

**16 · Een 429 of 401 van Mollie telde als blijvend.** De webhook antwoordde 200 en Mollie hield op, ook als de
melding een echte `paid` was: weg bij drukte of tijdens een sleutelwissel. Nu krijgen 401, 403, 408 en 429 een 500,
zodat Mollie het opnieuw probeert. 404 en 422 (een id dat niet van ons is) blijven 200.

**Het bewijs.** `tests/backend-sterker.test.mjs` §14 (tegen een echte SQLite met een D1 die één keer hapert) en §15;
`tests/mollie-webhook.test.mjs` voor 429 en 401. Op de oude code alle zeven rood. Eén bestaande toets ging uit van het
gat ("dubbele aflevering op een bestelling die nog niet betaald is → niets doen") en is aangepast: de echte dubbele
aflevering is er een op een betaalde bestelling; het geval ernaast staat nu als eigen toets.

**Nacontrole.** Alle 28 toetsbestanden die de betaalwebhook aanroepen (abonnementen, bijkopen, terugboekingen,
creditnota's, de geldroute, de proefvisual, e-Boekhouden en meer), mail (`test:email`, `test:mailsmerk`,
`test:bounces`), de 2FA-set, en `npx astro build`: groen. De diff teruggelezen: hij raakt geen inlog, geen koekje en
geen Origin-controle; in de betaalroute alleen de drie plekken hierboven.

## Stap 2 · Studio: een leeg KvK-veld, en woorden uit de adresbalk (af)

- **"Gegevens opslaan" met een leeg KvK-veld gaf een fout** (nagespeeld: "Cannot read properties of null"). Een
  klant zonder KvK-nummer die zijn telefoonnummer wilde wijzigen, kwam er niet doorheen. Nu wordt het veld gewoon leeg
  opgeslagen.
- **`?ok=`, `?fout=` en `?ronde=` werden opgezocht met `{…}[woord]`.** Een woord als `constructor` of `__proto__`
  vond dan geen melding maar iets van JavaScript zelf: `?ok=constructor` liet Je plan van een abonnee vastlopen (een
  500), en `?fout=__proto__` zette een object op de plek van de melding. Onschuldig voor de veiligheid (het raakt
  alleen de eigen pagina van wie de link opent), maar een link die een klant toegestuurd krijgt, hoort niet te
  breken. Nu telt alleen wat echt in het lijstje staat (`uitLijst()`).

**Het bewijs.** `tests/backend-sterker.test.mjs` §2: op de oude code 7 rood, de twee controles met echte woorden
groen; op de nieuwe alles groen. **Nacontrole:** de 31 toetsbestanden die Je plan, Gegevens of de rondes aanroepen, de
2FA-set (ook `test:code`), `npx astro build`: groen. De diff raakt geen inlog en geen koekje.

## Stap 3 · Studio: het e-mailadres wijzigen en terugzetten (af)

**Het gat.** Het e-mailadres is de inlog van Studio. Wie een sessiekoekje steelt, kan het adres op zijn eigen postvak
zetten en dat zelf bevestigen; het slot is de terugzetlink die naar het OUDE adres gaat. Dat slot was te omzeilen, op
twee manieren (allebei nagespeeld in een toets, allebei een overname op de oude code):
- **A:** de aanvaller zet vóór het terugzetten een tweede wijziging klaar en bevestigt die pas daarna. Die bevestiging
  werkte nog, en de terugzetlink ervan ging naar het adres van de eerste wijziging: het zijne.
- **B:** de aanvaller bevestigt twee wijzigingen achter elkaar. De eigenaar zet terug; daarna gebruikt de aanvaller de
  terugzetlink van de tweede wijziging (die in zijn eigen postvak staat) en zet het adres weer op het zijne.

**De reparatie.**
- Terugzetten laat alle andere openstaande links van die klant vervallen: bevestigingen én terugzetlinks.
- Bevestigen kan alleen nog als het account nog op het adres staat waar de wijziging van uitging; anders de bekende
  pagina "Deze link is verlopen" (geen nieuwe tekst).
- Terugzetten zet de lopende bestellingen terug van elk adres uit die wijziging en de wijzigingen erna (na B stonden
  ze op het tweede adres van de aanvaller, en daar gaan levering, factuur en betaallink heen).
- Een grens per klant op wijzigingsmails: 5 per uur, naast de bestaande grens per IP (wie een sessie stal, kiest zijn
  IP).
- `email_changes.request_ip_hash` is nu gezouten, met hetzelfde zout als de grenzen (geen nieuw geheim). Een kale hash
  van een IP-adres is in minuten terug te rekenen. Oude rijen blijven zoals ze zijn.

**Het bewijs.** `tests/backend-sterker.test.mjs` §3: A, B, de bestelling, de grens per klant en het zout. Op de oude
code 5 rood (beide overnames gelukt), op de nieuwe alles groen. **Nacontrole:** `tests/email-change.test.mjs` en de
andere toetsen rond grenzen en registreren, de 2FA-set met `test:code`, de bouw, en `test:afvink8okt` (136): groen.
De inlog zelf (code, link, sessie) is niet aangeraakt.

## Stap 4 · Studio: raden naar de inlogcode (af)

**Het gat.** Een inlogcode is zes cijfers. Per account golden vijftien pogingen per kwartier, maar geen grens per dag:
1440 gokken per etmaal, elke dag opnieuw (nagespeeld: zestig foute codes in een uur, geen enkele geweigerd, en de goede
code logde daarna in).

**De reparatie.** Een tweede grens op hetzelfde account: vijftig per etmaal. Wie zich vertypt, komt daar niet in de
buurt; en de link in dezelfde mail werkt gewoon door, want deze grens telt alleen het intypen van de code. De melding
is de bestaande ("Te veel pogingen vanaf hier. Wacht even, of gebruik de link in de mail."), dus geen nieuwe tekst.

**Bewust niet:** het tellen van pogingen per code "eerst lezen, dan schrijven" atomair maken. Bij gelijktijdige
pogingen telt die teller te weinig, maar de grens per account telt wél atomair (één statement met `RETURNING`) en
begrenst het totaal al; een atomaire teller zou het succespad van het inloggen herschrijven voor vrijwel geen winst.

**Het bewijs.** `tests/backend-sterker.test.mjs` §4, met een verzette klok: op de oude code rood, op de nieuwe groen
(ook: de volgende dag werkt de goede code weer). **Nacontrole:** de elf toetsbestanden rond inloggen in Studio, de
2FA-set met `test:code`, de bouw, `test:afvink8okt`: groen.

## Stap 5 en 6 · De privélink en oude bestanden (af)

**5 · Terugdraaien na het venster.** In Studio heropent "terugdraaien" een afgeronde bestelling alleen binnen het
venster (90 dagen); in de privélink stond die controle niet. Kleiner dan het leek: een gewone privélink verloopt
samen met dat venster. Maar een link die /admin met de hand opnieuw uitgaf, heeft een eigen einddatum, en daarmee kon
een bestelling van maanden geleden weer open (met bronmateriaal dat dan al opgeruimd kan zijn). Nu dezelfde regel als
in Studio.

**6 · Een oud bestand met een onbekend type.** Bestanden werden geserveerd met het type dat R2 had bewaard als de
extensie onbekend was. Vóór de typecontrole van de upload kon dat alles zijn: een `text/html` met een onbekende
extensie werd dan een pagina op ons eigen domein, inline (nagespeeld, in de privélink én in Studio). Nu telt een
opgeslagen type alleen als het in de lijst staat (jpg, png, webp, avif, gif, tiff, mp4, webm, mov, pdf, zip); anders
wordt het een download zonder type. Bewust geen strengere CSP op de bestanden zelf: die kan de PDF-weergave in de
browser breken. De previews in /admin worden sinds 31 augustus bij het uploaden al tegen een lijst gehouden.

**Het bewijs.** `tests/backend-sterker.test.mjs` §5 en §6: op de oude code rood (de controles met een geldig geval
groen), op de nieuwe groen. **Nacontrole:** de bouw, de 30 toetsbestanden rond de privélink en de bestanden van
Studio, de 2FA-set: groen.

## Stap 7 · De open doorverwijzing in /api/order (af)

**Het gat.** Na het bestellen stuurt `/api/order` de klant naar het adres uit het formulierveld `redirect`, als dat op
visuails.com ligt en "thank-you" bevat. Maar `https://visuails.com//kwaad.example/thank-you` heeft onze origin met het
pad `//kwaad.example/thank-you`, en een Location die met `//` begint, is een adres op een andere site (nagespeeld,
ook met `/.//` en met een backslash na onze naam). Een nagemaakt formulier kon een klant zo na een echte bestelling
naar een nagemaakte "betaal nu"-pagina sturen.

**De reparatie.** Een pad dat met `//` begint, valt terug op de gewone bedankpagina. Hetzelfde op de vier plekken waar
`/api/order` terugstuurt naar de Referer (`studiobrief.js` had deze controle al; Studio houdt zijn terugweg tegen een
vaste lijst).

**Het bewijs.** Drie nieuwe gevallen in `tests/order-api.test.mjs`: op de oude code rood, nu 132 van 132.
**Nacontrole:** de 49 toetsbestanden die `/api/order` aanroepen, mail, de 2FA-set, de bouw: groen.

## Stap 8 · /admin: vier kleine dingen (af)

- **Twee foutmeldingen zonder escapen**: de 403 van de Origin-controle toonde de meegestuurde Origin letterlijk, en
  "staat niet in de landenlijst" het landveld. Geen echt gat (een browser vult Origin niet met HTML, het landveld is
  twee tekens, en de CSP van /admin houdt scripts tegen), maar nu wel geëscaped. Aan de Origin-controle zelf is
  niets veranderd, alleen aan de tekst van de 403.
- **De themaknop** (`?thema=licht`) stuurde terug naar het ruwe pad; `//admin?thema=licht` gaf een Location `//admin`,
  en dat is voor de browser een andere site. Nu altijd één schuine streep vooraan.
- **Een offerte of restant van 0 cent**: `0,001` kwam door de controle (groter dan nul), werd afgerond 0 cent, en zette
  een offerte op goedgekeurd zonder bedrag. Nu minimaal 1 cent.
- **Een dubbelklik op "restant"** gaf twee restantbestellingen en twee betaalmails aan de klant. Nu telt hetzelfde
  bedrag, nog onbetaald, binnen tien minuten als dezelfde klik (je komt bij dat restant uit). Een tweede restant met een
  ander bedrag, of later, blijft gewoon mogelijk.

**Het bewijs.** `tests/backend-sterker.test.mjs` §8: op de oude code alle zes rood, op de nieuwe groen. **Nacontrole:**
de 2FA-set (vangnet 40, tweede stap 51, beveiliging 40, 8 oktober 17, 69 24, klantscheiding 161, inloggen, /admin,
code), de 86 toetsbestanden die admin.js aanroepen (de taaltoets van /admin las een stuk SQL als Engelse zin; de SQL is
herschreven met `!=`), de bouw: groen.

## Stap 9 · Mail: één regel in het onderwerp (af)

Het onderwerp gaat als JSON naar Resend, dus een echte kopregel-injectie is niet waarschijnlijk. Maar onderwerpen
dragen soms een merk- of productnaam die een klant zelf intypte, en een regeleinde of stuurteken daarin kan Resend de
hele mail laten weigeren (dan is bijvoorbeeld de melding aan de studio weg). `sendMail` maakt van regeleinden, tabs en
andere stuurtekens nu een spatie; een gewoon onderwerp blijft precies zoals het was. Geen lengtegrens: die zou een
lang maar echt onderwerp afknippen.

**Het bewijs.** `tests/backend-sterker.test.mjs` §9: rood op de oude code, groen nu. **Nacontrole:** de 34
toetsbestanden die naar onderwerpen kijken (waaronder alle mails in `test:mailsmerk`), en inloggen met de code en de
link: groen.
