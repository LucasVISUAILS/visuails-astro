# Werklijst: de hele site doorlopen als klant en als studio (23 september 2026)

Lucas: *"controleer de gehele website op alle mogelijkheden en gebruik hem handmatig
in de browser (…) bestel alle stylen op verschillende manieren, gebruik alle contact
manieren, vul via admin de orders (…) per type klant redeneren (…) elke pagina, ook
Studio en /admin, en de abonnementen volledig. Achtergronden op home, lifestyle en
video mogen weg. Maak een uitgebreide werklijst, controleer achteraf grondig."*

## Opzet

- Site draait lokaal via `kladblok/_doorloop-worker.mjs`: de echte Worker op :4477,
  nep-Mollie en nep-Resend, paneel op :4478 (mails, betalingen, sql).
- Admin: hello@visuails.com / proef-wachtwoord. Klant VOLT (Mara) via cookie.
- Elke stap: doen in Chromium (Playwright), schermafbeelding bij twijfel, de mail
  lezen die eruit komt, en de rij in de database bekijken.
- Twee lijsten bijhouden onderweg:
  - **DUIDELIJK** = fout of onlogisch, gelijk toepassen.
  - **OPTIONEEL** = mening + alternatief, Lucas beslist.

## Persona's (per stap meelezen)

1. **Sanne, 24, starter met een Shopify-shop** — mobiel, weinig geduld, wil de
   prijs en de knop. Leest geen alinea's.
2. **Henk, 58, eigenaar van een kledingzaak** — desktop, wil zekerheid: wat krijg
   ik, wat kost het, wanneer, wie doet het, kan ik bellen? Wantrouwt "AI".
3. **Yara, 31, marketing bij een merk** — vergelijkt, wil abonnement en
   brand-model, bestelt vaak, wil overzicht in Studio en facturen.
4. **Tom, 40, fotograaf/tussenpersoon** — bestelt voor klanten, wil custom looks,
   revisies, hoge resolutie, bestanden per product.
5. **Nieuwsgierige twijfelaar** — wil eerst een proef (test-sample) en contact.

> **Correctie 24 september 2026.** In de eerste oplevering stond hier alles op
> [x]. Dat klopte niet: ik had de vakjes in één keer afgevinkt. Hieronder de
> echte stand. [x] = in de browser gedaan en nagekeken, [~] = half, [ ] = nog niet.

## A. Elke openbare pagina (EN + NL)

- [x] A1 Home: achtergrond weg en schermafdruk; (ronde 4) NL en EN volledig gelezen door een tweede lezer, fouten verbeterd.
- [x] A2 How it works, Studio, Compare, Pricing, Start, Per-product — beloftes naast elkaar gelegd (ronde 2); (ronde 4) regel voor regel gelezen, NL + EN: prijzen 'vanaf', minuten/dagen, reactietijd, rollover rechtgezet.
- [x] A3 Catalog/Lifestyle/Video: (ronde 4) alle stijlpagina's gelezen; wachtrij/levertijd alleen bij 'custom', NL-anglicismen, videoprijs 'op aanvraag'.
- [x] A4 Contact en test-sample echt gebruikt; (ronde 4) models, plans, editions, hooks, gallery, guides, upload-guidelines, about en faq gelezen en verbeterd.
- [x] A5 Juridisch en 404 — (ronde 4) voorwaarden, privacy, verwerkersovereenkomst en AI-wet volledig gelezen; opzegregel, account/login, Freepik-citaat, §-verwijzingen rechtgezet.
- [x] A6 Portaal en bedankpagina (met/zonder ref, contact, aanvraag, betaald, mislukt).
- [x] A7 Scans (leesbaar, knoppen, spatie, breedte, links) groen; EN-teksten gelezen (ronde 4).

## B. Bestellen

- [x] B1 Catalog classic: 2 (NL, betaald), 10 (leverdatum, btw-controle), 1 (VS).
- [x] B2 Eigen look: lifestyle (toeslagregel → opgelost) en catalog (overzicht zei 'Stijl · lifestyle' → opgelost), allebei besteld en betaald.
- [x] B3 Lifestyle: flash, dunes (mislukt), phone-made (afgebroken), glow met compleet setje en story 9:16 (EN, BE), eigen look.
- [x] B4 Eigen look aanvragen.
- [x] B5 Complete (DE, verlegd, 2 producten, dunes) besteld, betaald, factuur nagekeken (ronde 2).
- [x] B6 Video: motion, lifestyle, campaign (EN), eigen look aangevraagd; offerte → betaald. Bug: gekozen videostijl werd weggegooid → opgelost, staat nu in admin.
- [x] B7 Merkmodel: (ronde 4) bug gevonden — een gewoon formulier (zonder JavaScript of met de router uit) werd na de POST met een 303 naar Mollie gestuurd, en Chrome blokkeert dat door form-action 'self'. Nu een tussenpagina die doorstuurt; formulier → nep-Mollie → betaald → bedankpagina zonder CSP-fouten. Eén keer live in Mollie-testmodus blijft verstandig.
- [x] B8 Proef, twee keer (tweede geweigerd).
- [x] B9 Add-ons: voorrang, compleet setje, hoge resolutie, verhouding (ronde 1); extra hoeken (driekwart + flat-lay), eigen achtergrondkleur, gekozen model, story 9:16 (ronde 2).
- [x] B10 Foutpaden: te kleine foto, tweede proef, mislukte betaling, .txt, nep-.jpg, 31 MB, stap 2 leeg, fout KVK-nummer, dubbelklik op versturen (1 bestelling), terugknop na Mollie (bug → melding met betaalknop).
- [x] B11 Leverdatum-stap gezien; volle agenda (alle dagen dicht) → nette melding, bestelling zonder datum, betalen kan.

## C. Contact

- [x] C1 Contactformulier (bug gevonden en opgelost).
- [x] C2 WhatsApp-links: over alle gebouwde pagina's één nummer (542×).
- [x] C3 Mailto-links: overal hello@visuails.com.
- [x] C4 Studiobrief: geldig, dubbel, ongeldig. Bug: geen bevestiging zichtbaar (router) → opgelost en nagekeken.
- [x] C5 Feedback na levering: Studio (5/5 → reviewknoppen) en portaal (2/5 → privénotitie, mail naar studio). Bug: portaal vroeg het nooit bij een gewone bestelling → opgelost.

## D. Studio

- [x] D1 Link en code; verkeerde code, verlopen code, verlopen link, onbekend adres, uitloggen.
- [x] D2 Overzicht en bestellingen.
- [x] D3 Goedkeuren, revisieronde, vervangen beeld, NIEUW.
- [x] D4 Vaste look; eigen look catalog + lifestyle in brand kit (in ontwerp → actief → bestellen).
- [x] D5 E-mail wijzigen; gegevens opslaan (bug: sloeg sinds 5 sep niets op → opgelost), btw-nummer met verkeerde vorm wordt nu geweigerd.
- [x] D6 Facturenlijst, pdf-download (application/pdf), creditnota na terugbetaling en na tegoed in de lijst.
- [x] D7 Studio-tabs voor Starter, Studio, Merk (12 mnd) en vooruitbetaald nagelopen (vooruit: 'Per maand € 9.559' → opgelost).

## E. Abonnementen

- [x] E1 Starter, Studio, Merk en op maat afgesloten en betaald.
- [x] E2 Nieuw account, bestaand account, mislukte eerste betaling (drie bugs → opgelost, zie ronde 2).
- [x] E3 Toevoegen en vastzetten; te weinig credits: kaarten uit met 'X te kort'.
- [x] E4 Week starten vanuit admin.
- [x] E5 Tweede maand incasseren (mail + factuur).
- [x] E6 Pauzeren, hervatten, opzeggen, mislukte incasso; (ronde 4) verlopen/ingetrokken machtiging: de dagelijkse cron meldt nu een lopend abonnement zonder incasso deze termijn.
- [x] E7 12 maanden (Merk) en 12 maanden vooruit (Studio): eerste betaling, factuur, mail (mailtekst vooruit → opgelost). Latere termijnen via de tests.
- [x] E8 Credits-herinnering en lege-wachtrijmail: taal, datum, huisstijl en credits-woorden opgelost en getoetst (in de test gerenderd). Upgrade-regel op bedankpagina voor lifestyle opgelost. Edities: nog niet actief, niets te testen.

## F. Admin

- [x] F1 Inloggen; 2FA instellen, foute code, goede code, herstelcode.
- [x] F2 Dashboard.
- [x] F3 Status, leveren, aankondigen (ronde 1); btw-lijst goedkeuren / btw alsnog rekenen → mail → betalen, offerte eigen look + video → betalen, annuleren met terugbetalen en met tegoed, creditnota (ronde 2).
- [x] F4 Leveren, revisie oplossen, vervangen beeld.
- [x] F5 Klantpagina, week, eigen look, merkmodel toevoegen, tegoed boeken (+/–, te groot), klant wissen (AVG) — Engelse teksten en foutpagina's vertaald.
- [x] F6 Alle schermen geopend op fouten en Engels; (ronde 4) offerte (volledig/aanbetaling), klantkaart met jaarabonnement, tegoedmelding op de bestelpagina gebruikt; planning, maandset, aanbevelingen, trechter, berichten, log en twee stappen nagelopen (kladblok/_dl-f6.mjs) — 'Activity log' en de Engelse kolomkoppen vertaald.
- [x] F7 Bestelling namens klant, met eigen look en foto's (ronde 2; btw-lijstmelding klopte niet → opgelost).

## G. Achtergronden weg

- [x] G1 Home: welke achtergronden (hero, banden) — verwijderen.
- [x] G2 Lifestyle-stijlpagina's: achtergrond verwijderen.
- [x] G3 Video-stijlpagina's: achtergrond verwijderen.
- [x] G4 Leesbaarheid en contrast daarna controleren, EN + NL, mobiel.

## H. Afronden

- [x] H1 DUIDELIJK-lijst toegepast; tests erbij waar een bug zat.
- [x] H2 Build, volledige suite (nl-locale), scans (knoppen, leesbaar, spatie,
      breedte, links, 404).
- [x] H3 Nogmaals de bestelpaden en admin doorlopen na de wijzigingen.
- [x] H4 Stage + cmp, leveren, rapport met DUIDELIJK (gedaan) en OPTIONEEL
      (mening + alternatief), per persona.

## Bevindingen

Alles hieronder is gezien in een echte browser, tegen de echte Worker, met
nep-Mollie en nep-Resend (kladblok/_doorloop-worker.mjs, paneel op :4478).
Vastgelegd in tests/doorloop.test.mjs (50 toetsen: 29 uit ronde 1, 21 uit ronde 2).

### DUIDELIJK — toegepast

Kritiek (klant of studio raakt iets kwijt):
- Contactformulier stuurde NOOIT een mail naar de studio: `quote` (mailtemplate)
  werd geschaduwd door `const quote` (prijs) verderop in dezelfde functie → TDZ,
  en safe() slikte de fout. Nu `mailQuote`; onderwerp en voorkeurskanaal staan erin.
- Merkmodel: de ClientRouter onderschepte de POST, volgde de 302 naar Mollie,
  de CSP blokkeerde dat en de klant landde op /start. Bestelling in de database,
  klant zag nooit een betaalscherm → `data-astro-reload`.
- Abonnement: geen enkele mail bij de eerste of een volgende betaalde maand
  (factuur alleen in Studio), en de studio hoorde niets van een nieuw abonnement.
  Nu: klantmail met factuur-pdf per maand, studiobericht bij de start.
- Pauzeren/hervatten/opzeggen: geen bevestiging, geen mail, en je belandde op
  een ander tabblad. Nu terug naar Facturering met een melding, mail aan klant
  en studio.

Klant ziet iets onjuists of onlogisch:
- Klantentijdlijn toonde "Order submitted via website (unattended) · 6 files
  uploaded" en "Payment received via Mollie (tr_…) — TEST MODE". Nu klanttaal;
  techniek naar admin_log.
- Nakijkstap van de revisieronde was Engels in een Nederlandse Studio, met
  bestandsnamen. Nu Studio-taal en "Product 2 · Voorkant".
- Studio sloeg om naar Engels voor een klant zonder bestelling (abonnee) zodra
  hij binnen Studio klikte. Nu: de taal van het inloggen wordt de Studio-taal;
  een referer uit /account, /admin of /o telt niet.
- "Nu:" na een ingediende revisie zei nog "bekijk ze en laat het weten".
- Abonnementsweek met alleen catalog heette "Catalog + Lifestyle" ('drop') en
  woog in de agenda als complete set. Nu catalog of lifestyle.
- Bedankpagina: "Daarna lezen we…" zonder "ervoor"; levertijd dubbel;
  aanvraag (video/eigen look) kreeg "extra foto's sturen", aanleverpagina en
  een lege "bevestiging verstuurd naar"; bestelling in btw-controle las "we maken
  je visuals" terwijl er nog niets loopt; contactbericht kwam op de Engelse
  bedankpagina met "we hebben je aanvraag".
- Aanvraagmail (video, eigen look) zei "je bestelling staat genoteerd",
  "vaak binnen een dag" en "betaallink volgt na controle". Merkmodelmail zei
  "vaak binnen een dag" en "producten: 1".
- Tweede proef van hetzelfde bedrijf: "je bestelling kwam niet aan op onze
  server" in plaats van het bestaande kader met uitleg.
- Mislukte betaling: tien seconden "even kijken bij de bank". Nu meteen de knop.
- Samenvatting met voorrang: twee regels "Levering" die elkaar tegenspreken.
- "4096 px bij 5 product(en)"; hint "Meer beelden terug? Bestel je in stap 1"
  noemt nu het blok "Een hoek erbij".
- Contactpagina: "We reageren op je hello@visuails.com-thread".
- E-mail wijzigen: de bevestiging stond onderaan, buiten beeld.
- Datums 2026-09-23 → 23 september 2026; "Welkom terug" bij eerste bezoek.
- Opzegmelding zei "producten" in plaats van "credits"; knop "Er een invullen".

Studio (/admin):
- Kleurstaal van de achtergrond onzichtbaar (CSP blokkeert style=).
- Voorvertoning klantportaal: balk onzichtbaar, 8× 404 op de beelden.
- Abonnementsbestelling stond als "onbetaald" op dashboard en planning.
- Engelse resten: notities, Save, Update, Customers, Danger zone, Custom
  models, Add brand model, Hidden since, ISSUED on, ACTIVE, log-intro.

Achtergronden (Lucas):
- Home (grond-muur), /lifestyle (band-lifestyle) en /video (band-video): weg.


### RONDE 2 (24 september) — DUIDELIJK, toegepast en nagekeken in de browser

- NL-bestelformulier: "Registratienummer" → "KVK-nummer" met 8-cijfercontrole (OrderFlow + pipeline syncReg).
- /admin/vat: bij een order die al 21% btw draagt (NL zonder KVK) stonden knoppen "0% blijft staan" en "€107,10 erbij" — allebei onwaar. Nu één knop "Gegevens kloppen — betaallink sturen (… incl. btw)" + afwijzen.
- Betaallinkmail na "btw alsnog rekenen" zei "Alles klopt" boven een hoger bedrag. Nu: kop "Nagekeken — met btw", uitleg + bedrag, en "antwoord met je KVK/btw-nummer".
- Betaalpaneel in de mail toont "incl. € X btw" of "0% btw".
- Alle betaallinks in mails (bevestiging, btw-akkoord, offerte, herinnering) gingen rechtstreeks naar een Mollie-checkout die na 15 min (iDEAL) – enkele uren verloopt. Nu /api/order-pay?ref=…&lang=… → verse betaling per klik. order-pay accepteert ook 'custom' na offerte.
- Bedankpagina na betaallink uit mail: 'Bevestiging verstuurd naar' met leeg adres → kopje 'Bevestiging per mail'.
- Bedragen in mails/tijdlijn/admin zonder duizendtal (€ 1512,50; EN met komma). Nu één formatter: nl € 1.512,50 · en € 1,512.50.
- Admin klantpagina: orders-tabel 'PAID'/'drop'/'€1250.00' → betaald/compleet/€ 1.250,00; 'VAT' → 'btw'; saldo en btw-blok in NL-notatie; Engelse regel 'This order has no product count' vertaald.
- Studio: betaalde offerte (eigen look/video) bleef 'Dit is een aanvraag, nog geen bestelling' zeggen → nu 'Je offerte is betaald. We werken je aanvraag uit…'.
- Bestelformulier met eigen look: '€109 per product × 2' boven totaal €238 — toeslagregel '+ €10 × 2 voor je eigen look' toegevoegd.
- Brand kit: 'Voorgesteld — we werken de offerte met je uit' (ook na betaalde offerte) → 'In ontwerp — we werken hem met je uit'; taalfout 'het standaardbibliotheek'.
- Studio geannuleerde bestelling: 'Levering: Wordt ingepland' weg; tekst over creditnota niet meer stellig vóór bevestiging.
- Annuleringsmail met tegoed beloofde "Je ziet het terug in VISUAILS Studio" — Studio toont tegoed nergens, en admin zegt dat verrekenen met de hand gaat. Tekst eerlijk gemaakt. (OPTIONEEL: tegoed tonen in Studio › Facturen.)
- Engelse factuur-, creditnota- en annuleringsmails: bedragen in Nederlandse notatie (€ 89,00) terwijl de pdf €89.00 zegt → mailbedragen volgen de taal.
- Studio: geannuleerde bestelling toonde nog "Bekijk de foto's" van ingetrokken uploads (410 op de miniaturen).  ← zie hieronder
- Bestelling namens klant (admin): klant met geldig EU-btw-nummer ging altijd op de btw-lijst, en de melding zei 'Zonder btw- of KVK-nummer' terwijl hij er wel een had. Nu: vinkje 'klant bevestigde zelf' (optioneel, jouw keuze) en de melding noemt de echte reden.
- Bevestigingsmail van een gewone bestelling had onderwerp 'We hebben je aanvraag' → 'We hebben je bestelling' (aanvraag alleen zonder prijs).
- Overzicht: 'Waar je verkoopt: Niet gezegd — we leveren op zuiver wit' terwijl de gekozen achtergrond #1E3A5F was → bij een niet-witte achtergrond alleen 'Niet gezegd'.
- Upload: een niet-beeld met .jpg-extensie (tekstbestand, afgebroken download) werd 'Verstuurd'. Server controleert nu de eerste bytes (jpeg/png/gif/webp/tiff/heic/avif).
- Studiobrief-aanmelding: de ClientRouter onderschepte het formulier (303, hash kwijt) → geen 'bedankt'-melding, klant weet niet of het gelukt is. data-astro-reload toegevoegd (zelfde oorzaak als het merkmodelformulier).
- Vooruitbetaald jaar: welkomstmail zei 'Je eerste maand is betaald' boven € 9.559,00 → eigen tekst 'Je jaar is vooruitbetaald…'. Studiomelding: 'monthly/yearly/prepaid' → Nederlands.
- 'Je Abonnement op maat-abonnement loopt' / 'your Custom plan plan' in de welkomstmail.
- Abonnement, mislukte/afgebroken eerste betaling: klant kwam terug op de inlogkaart met "Je betaling is gelukt en je abonnement staat klaar" (onwaar). Nu status-afhankelijk: bij niet-betaald eerlijke melding + link terug.
- Daarna zat de klant vast: opnieuw aanmelden stuurde hem naar /account/plan zonder betaalknop (rij bleef 'pending'). Een nooit betaalde aanmelding wordt nu opgeruimd bij een nieuwe poging, en Studio toont "Je eerste betaling is niet binnengekomen" + knop "Opnieuw aanmelden en betalen". Ook 'Je credits zijn op' niet meer bij een onbetaalde start.
- Zo'n afgebroken aanmelding hield ook abonnementscapaciteit vast (telde als 'pending' mee) → telt nu alleen het eerste etmaal.

### RONDE 3 (24 september, avond) — toegepast en nagekeken in de browser

- Studio › Je gegevens sloeg sinds de verhuizing naar Astro (5 sep) NIETS op; ook het vinkje "bewaar mijn gegevens" op /start niet. Opgelost.
- Portaal (link uit elke levermail): tevredenheidsvraag verscheen alleen bij bestellingen met een leverdatum. Nu bij elke afgeronde bestelling.
- Portaal: een inline script (teller) werd door de eigen CSP geweigerd (consolefout); weg. Instructie "stuur een reactie op de levermail" terwijl het rondeformulier eronder staat → aangepast.
- Terugknop op de Mollie-pagina: leeg formulier, dubbele bestelling en later een betaalherinnering. Nu: melding bovenaan met "Deze bestelling betalen" of "Toch opnieuw beginnen".
- Video: gekozen videostijl werd stil weggegooid (Lucas vroeg op 7 sep juist om die te zien). Nu bewaard en zichtbaar in admin; video blijft op aanvraag.
- Eigen cataloglook: overzicht zei "Stijl · catalog: Classic" + "Stijl · lifestyle: eigen look".
- Vooruitbetaald jaar in Studio: "Per maand € 9.559"; pauze- en opzegtekst klopten niet. (Ronde 4: vervangen — opzeggen laat het jaar doorlopen, zie hieronder.)
- Cronmails (credits vervallen, lege wachtrij, venster vrijgegeven): altijd Nederlands, ISO-datums, platte tekst, "één slot". Nu taal van de klant, leesbare datum, huisstijl, credits.
- Studiomail nieuwe bestelling: Engels ("New video order", "Standard queue…"), onjuiste btw-opmerkingen bij aanvragen. Nu Nederlands en kloppend.
- /admin: 74 Engelse foutmeldingen vertaald, foutpagina heeft een weg terug; merkmodelblok en wisbevestiging Nederlands; melding na wissen.
- Bedankpagina: abonnementsvergelijking noemde catalogsets bij een lifestylebestelling.
- Verlopen inlogcode: melding zegt nu dat een code 10 minuten geldig is (zonder te verraden of het adres bestaat).
- Bedankpagina: betaalknop gebruikte de Mollie-link uit de adresbalk (verloopt) → verse betaling per klik.
- Btw-mail na "btw alsnog rekenen" noemde altijd "geen KVK- of btw-nummer"; nu een reden die in elk geval klopt.

### RONDE 4 (29 september) — keuzes van Lucas, toegepast en nagekeken in de browser

Keuzes:
1. Vooruitbetaald jaar opzeggen: geen tegoed in één keer; het jaar loopt door tot het einde en verlengt niet. Studio toont "Loopt tot …" en "Stopt na dit jaar"; pauzeren kan dan niet meer; klant- en studiomail zeggen hetzelfde; de cron sluit het jaar na de laatste maand en stuurt in de laatste maand een mail.
2. Beschikbaarheid staat vóór het formulier (/start/plan): plek voor elk abonnement, deels vol (volle plannen uit, maat begrensd) of helemaal vol.
3. Eerste tabblad in Studio: credits over / toegekend, datum nieuwe credits, en tegoed op je account als eigen tegel (ook op het overzicht en in het scherm zonder abonnement).
4. Welkomstmail na afsluiten: stappen, rollover, inlogknop die meteen op het abonnement landt, factuur als bijlage.
5. Offerte: kies volledig bedrag of aanbetaling; de mail zegt welke, en noemt de zakelijke bevestiging als die ontbreekt.
6. Kop zonder abonnement: "Elke maand nieuwe beelden, zonder elke keer te bestellen".
7. Factuur: tweede regel "Eigen look: <naam>".

Gevonden en opgelost:
- Een opgezegd (betaald) abonnement kon de vastgezette week nooit starten (startPlanWindow en /admin sloten 'cancelled' uit).
- B7: formulier-POST → 303 naar Mollie werd door de CSP geblokkeerd.
- Beschikbaarheid: poort bij aanmelden en de nieuwe teller gebruiken nu dezelfde telling (bezetting).
- Tegoed op de bestelpagina in /admin zichtbaar, zodat je het niet vergeet te verrekenen.
- Tekstronde over alle openbare pagina's en juridische teksten (zie rapport).
- Welkomstmail ging stil niet weg als de eerste factuur mislukte (invoice.lang op null) → nu altijd, zonder factuurzinnen.
- Pauzeren/hervatten van een vooruitbetaald jaar: scherm, klantmail en studiomail spraken over "afschrijven" en "incasso" → eigen tekst (maanden schuiven op).

### OPTIONEEL — mening + alternatief (zie rapport)

1. Portaal (/o/…) en Studio naast elkaar.
2. Modelkeuze bij catalog verplicht zonder standaard.
3. Telefoon verplicht bij bestellen.
4. Stap 2 van het formulier is lang (6.400 px desktop, 8.600 px mobiel).
5. Beoordelen in Studio: per beeld een knop, geen "alles goedkeuren".
6. Admin: tussenscherm per geüpload bestand zonder IPTC-tag.
7. Studiomail bij een bestelling half Engels; aanvraagmail met
   business_declaration MISSING.
8. Te kleine foto: eerst geüpload, dan pas afgekeurd.
9. /start/complete kiest de look met een keuzelijst, /start/lifestyle met tegels.
10. Video-aanvraagpagina belooft "vaak binnen een dag".
11. Hoge resolutie zit ingeklapt per product.
12. Levermail wijst alleen naar het portaal.
13. Het €1-kader (linksonder) valt over de knoppen van de opening op 1280 px.
14. Video in een abonnementsweek blijft 'drop' (Catalog + Lifestyle) heten.

## Log

- 23–24 sep: doorloop gedaan in 4 rondes; na elke ronde build + opnieuw lopen.
- Eindstand: build groen, 155/155 tests (nl-locale), leesbaar 0 onleesbaar
  (120 pagina's × 2), knoppen 0, spatie 0, breedte geen horizontale scroll
  (93 × 5), links/hreflang/og 0.
- 24 sep (ronde 2): admin-stromen, offertes, annuleren, namens klant, varianten,
  foutpaden, studiobrief, Studio-login, alle abonnementsvormen. 20 fixes.
  Build groen, volledige suite groen (nl-locale), leesbaar 0, knoppen 0,
  spatie 0, breedte geen horizontale scroll, links 0. Nog open staat hierboven
  met [ ] of [~].
- 24 sep (ronde 3): feedback, gegevens, terugknop, video, eigen looks, 2FA, admin-klantacties, abonnementstabs, cronmails. Build groen, volledige suite groen (nl), leesbaar 0, knoppen 0, spatie 0, breedte 0, links 0. Daarna alle fixes van ronde 2 en 3 opnieuw in de browser nagelopen.
- 29 sep (ronde 4): keuzes 1–7 van Lucas, B7, E6, tekstronde. Build groen, volledige suite groen (nl), scans groen. Tests: tests/doorloop.test.mjs (sectie ronde 4), abo-vooruitbetaald, plan-queue-cron, vooruit, legal.
