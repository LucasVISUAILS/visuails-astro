# Klantteksten ronde A2 tot en met A4 (8 oktober 2026)

Alles wat in deze rondes nieuw of anders is, met plek, Nederlands en Engels. Afvinken doe je in afvinklijst 3; dit bestand is de naslag.

---

## Teksten bouwer M2 · ronde A2 (1.05, 7.01, 7.02, 7.07, 9.07)

Elke nieuwe of gewijzigde klanttekst: plek, NL, EN. `{…}` wordt ingevuld (datum, bedrag, kenmerk).

### A · "Zo gaat het verder" — één bron: `src/lib/verder.js`
Staat op de bedankpagina (/thank-you, /nl/thank-you), in de betaalmail ("Betaling ontvangen"), in de bestelmail ("We hebben je bestelling") en in de bevestiging van een bestelling die met tegoed betaald is.

| Plek | NL | EN |
|---|---|---|
| Kop | Zo gaat het verder | What happens next |
| Regel 1 (overal) | We kijken eerst je foto’s na. Ontbreekt er iets, dan laten we het je weten. | We check your photos first. If anything is missing, we let you know. |
| Onder regel 1, alleen in de betaalmail als er foto’s ontbreken | **Er ontbreken nog foto’s:** {p2 Shirt wit: geen achterkant} · Voeg ze toe bij deze bestelling in VISUAILS Studio (log in met dit e-mailadres), dan beginnen we met alles compleet. | **Some photos are still missing:** {…} · Add them to this order in VISUAILS Studio (sign in with this email address), so we start with everything complete. |
| Regel 2 · zonder datum (uit turnaround()) | We leveren je beelden zo snel mogelijk (vaak binnen een dag, soms een paar dagen), en we kijken elk beeld na voordat het bij je komt. | We deliver your order as soon as it is ready (often within a day, sometimes a few days), and we check every image before it reaches you. |
| Regel 2 · gereserveerde dagen | We maken je beelden op je leverdatum: {woensdag 14 en donderdag 15 oktober}. We kijken elk beeld na voordat het bij je komt. | We make your images on your delivery date: {Wednesday 14 and Thursday 15 October}. We check every image before it reaches you. |
| Regel 2 · vanaf 10 producten, nog geen datum | Je leverdatum staat nog niet vast; die spreken we met je af. We kijken elk beeld na voordat het bij je komt. | Your delivery date is not fixed yet; we agree it with you. We check every image before it reaches you. |
| Regel 2 · voorrang (uit voorrangZin()) | Voorrang — geleverd uiterlijk de volgende werkdag om 17:00, of de toeslag komt terug. We kijken elk beeld na voordat het bij je komt. | Priority — delivered by 17:00 the next working day, or the surcharge comes back. We check every image before it reaches you. |
| Regel 3 · betaalmail (factuur zit erbij) | Je krijgt weer een mail als je beelden klaarstaan. Tot dan sturen we niets — behalve als er iets mis is: dan nemen we contact met je op. | You get another email when your images are ready. Until then we send nothing — unless something is wrong: then we get in touch with you. |
| Regel 3 · bedankpagina na betalen, bestelling met tegoed | Je factuur komt zo in je mail. Daarna hoor je pas weer van ons als je beelden klaarstaan — behalve als er iets mis is: dan nemen we contact met je op. | Your invoice is on its way by email. After that you only hear from us again when your images are ready — unless something is wrong: then we get in touch with you. |
| Regel 3 · bestelmail met betaalknop | Na de factuur hoor je pas weer van ons als je beelden klaarstaan — behalve als er iets mis is: dan nemen we contact met je op. | After the invoice you only hear from us again when your images are ready — unless something is wrong: then we get in touch with you. |
| Regel 3 · nog niet betaald (btw-controle, "opnieuw betalen") | Zodra je betaling binnen is, krijg je de factuur per mail. Daarna hoor je pas weer van ons als je beelden klaarstaan — behalve als er iets mis is: dan nemen we contact met je op. | As soon as your payment is in, you get the invoice by email. After that you only hear from us again when your images are ready — unless something is wrong: then we get in touch with you. |

### B · Bedankpagina (`src/components/ThankYouPage.astro`, `src/scripts/interactions.js`)

| Plek | NL | EN |
|---|---|---|
| Kop (balk) stand b · bevestigen | Je betaling wordt bevestigd. | Your payment is being confirmed. |
| Standvlak stand b | Je hoeft niet opnieuw te betalen. Deze pagina werkt zichzelf bij zodra Mollie de betaling bevestigt. | You do not need to pay again. This page updates itself as soon as Mollie confirms the payment. |
| Standvlak stand b na ±1 minuut (geen knop) | Dit duurt langer dan normaal. Je hoeft niets te doen: we mailen je zodra de betaling binnen is. Heb je de betaling zelf afgebroken? Dan staat de betaallink in je bevestigingsmail. | This is taking longer than usual. There is nothing you need to do: we email you as soon as the payment is in. Did you stop the payment yourself? Then the payment link is in your confirmation email. |
| Standvlak stand a · betaald (kop ongewijzigd: "Betaald — we gaan aan de slag.") | De betaling is binnen. Je hoeft niets meer te doen. | The payment is in. There is nothing left for you to do. |
| Kop van het blok (was "Wat er nu gebeurt") | Zo gaat het verder | What happens next |
| Rechterkolom onder "Bevestiging per mail", ook op de kaart "kijk in je mail" in Studio en het portaalscherm zonder link (`src/data/mailNote.js`) | Na een paar minuten nog niets? Kijk in je spam, en zet orders@visuails.com in je contacten, dan komt de volgende gewoon binnen. | Nothing there after a few minutes? Check your spam folder, and add orders@visuails.com to your contacts so the next one lands in your inbox. |

Stand c (kop "De betaling is niet afgerond.", knop "Opnieuw betalen") gebruikt de bestaande teksten.

### C · Betaalmail "Betaling ontvangen — VIS-…" (`src/lib/invoiceMail.js`, terugval in `src/lib/cancelMail.js`)

| Plek | NL | EN |
|---|---|---|
| Eerste zin, factuur als bijlage | Bedankt — je betaling van {€ 323,07} is binnen. De factuur zit als pdf bij deze mail. | Thank you — your payment of {€ 323.07} is in. The invoice is attached as a PDF. |
| Eerste zin, pdf ontbreekt | Bedankt — je betaling van {…} is binnen. Je factuur staat klaar in VISUAILS Studio, onder Facturen. | Thank you — your payment of {…} is in. Your invoice is waiting in VISUAILS Studio, under Invoices. |
| Knop (privélink) | Bekijk je bestelling | See your order |
| Onder de tabel | Je vindt de factuur ook altijd terug in VISUAILS Studio, onder **Facturen**. | You can also find the invoice any time in VISUAILS Studio, under **Invoices**. |
| Terugval zonder factuur, eerste zin | Bedankt — je betaling is binnen. Je factuur komt in VISUAILS Studio, onder Facturen. | Thank you — your payment is in. Your invoice will be in VISUAILS Studio, under Invoices. |

### D · Bestelmail "We hebben je bestelling — VIS-…" (`customerEmail()` in `functions/api/order.js`)

| Plek | NL | EN |
|---|---|---|
| Kop (was "Je bestelling staat genoteerd") | Je bestelling staat erin | Your order is in |
| Eerste zin, met betaallink | Bedankt — je bestelling voor {Catalog} staat erin. Al betaald bij Mollie? Dan hoef je niets te doen: je krijgt zo een tweede mail met je factuur. | Thanks — your {Catalog} order is in. Already paid at Mollie? Then there is nothing you need to do: a second email with your invoice follows shortly. |
| Eerste zin, zonder betaallink | Bedankt — je bestelling voor {Catalog} staat erin. | Thanks — your {Catalog} order is in. |
| Betaalvak, label (was "Te betalen" + "Net al betaald?…") | Nog niet betaald? | Not paid yet? |
| Betaalvak, bij gereserveerde dagen | Betaal vóór {woensdag 15 oktober}, dan blijft je leverdatum voor je vast. | Pay before {Wednesday 15 October} and your delivery date stays yours. |
| Betaalvak, bij voorrang | Voorrang: betaal je op een werkdag vóór 15:00, dan leveren we de volgende werkdag vóór 17:00; later betaald is het de werkdag daarna. | Priority: pay on a working day before 15:00 and we deliver before 17:00 the next working day; paid later, it is the working day after that. |
| Met tegoed betaald (laatste zin "De factuur krijg je in een aparte mail." eraf; staat nu in het blok) | **Betaald met je tegoed.** {€ …} is van je tegoed afgeschreven; je hoeft niets meer te betalen. | **Paid with your credit.** {€ …} was taken from your credit; there is nothing left to pay. |
| Na de privélink (was "We controleren elke visual… " + revisieregel; nu alleen de revisieregel uit aftercare()) | Tevredenheidscheck: 1 revisieronde per bestelling, aan te vragen binnen 7 dagen na levering. | (ongewijzigd, uit pricing.js) |

De vijf eigen tijdszinnen (proef, voorrang, datum, datum volgt, zo snel mogelijk) zijn vervangen door blok A.

### E · Overal in de klantmails (`vragen()` in `src/lib/mailTemplate.js`)

| Plek | NL | EN |
|---|---|---|
| Laatste regel van bestelmail, betaalmail, herinnering, btw-mail, offerte, levermail, herlevering, nieuwe link, revisieronde, vervallen | Vragen? Antwoord op deze mail of [app ons]. | Questions? Reply to this email or [WhatsApp us]. |
| Openingszin WhatsApp-link | Hoi VISUAILS, een vraag over mijn bestelling {VIS-…}: | Hi VISUAILS, a question about my order {VIS-…}: |

### F · Losse mails (7.07)

| Plek | NL | EN |
|---|---|---|
| Levermail (`deliveryEmail()` in admin.js), onder de knop | Je beelden staan online tot en met **{4 januari 2027}**; download ze op tijd. | Your images are online until **{4 January 2027}**; download them in good time. |
| Herinnering dag 3 (`stuurBetaallink(herinnering)` in betaallink.js) | Je bestelling **{VIS-…}** staat nog open: er is nog niet betaald. Wil je hem nog? Dan is dit de link. Je leverdatum houden we vast tot **{13 oktober}**; daarna komen die dagen weer vrij. Betaal je niet, dan vervalt de bestelling na **{20 oktober}**. Wil je hem niet meer, dan hoef je niets te doen: er wordt niets in rekening gebracht. | Your order **{VIS-…}** is still open: it has not been paid yet. Still want it? This is the link. We hold your delivery date until **{13 October}**; after that those days are released. If it stays unpaid, the order lapses after **{20 October}**. If you no longer want it, there is nothing to do: nothing is charged. |
| Btw-mail, onderwerp (goedgekeurd) | Je btw-gegevens zijn goedgekeurd — {VIS-…} | Your VAT details have been approved — {VIS-…} |
| Btw-mail, onderwerp (toch btw, of nummer niet bevestigd) | Je btw-gegevens zijn bekeken — {VIS-…} | We have reviewed your VAT details — {VIS-…} |
| Btw-mail, kop (goedgekeurd; was "Nagekeken en akkoord") | Goedgekeurd — klaar om te betalen | Approved — ready to pay |
| Btw-mail, kop (nummer niet bevestigd) | Klaar om te betalen | Ready to pay |
| Inlogmail, onderwerp | {482913} is je inlogcode voor VISUAILS | {482913} is your VISUAILS sign-in code |
| Offerte-mail: "Vragen? Beantwoord gewoon deze mail." eruit (staat nu als vragenregel onderaan) | — | — |

Weg: de mail "Je gereserveerde leverdatum is vrijgegeven — VIS-…" (dag 7) en de regel "Zet orders@visuails.com in je contacten…" onder alle klantmails behalve de eerste bestelmail op een adres, de checklist en "Bevestig je nieuwe e-mailadres".

---

## Klantteksten F2 · ronde A2 (1.07, 1.08, 8.06)

Alle teksten staan in `src/components/order/OrderFlow.astro` (PIPE = wat het script invult, FORM = vaste tekst), tenzij anders vermeld. Bedragen, aantallen, dagen en uren tussen {…} of ${…} worden ingevuld uit `src/data/pricing.js`; niets daarvan is getypt.

### 1.07 · Wat het kost, wat erbij zit en wanneer het komt

### Stap 1, onder het totaal — besparingsregel (PIPE `besparing.minder`)
Alleen bij aantallen waar een groter aantal even duur of goedkoper is (nu 4, 8, 9 en 16–19). "Met 5 producten" is een tekstknop die het aantal op 5 zet; de twee bedragen zijn vet. De ladderregel ("Nog één product en het tarief zakt …") verdwijnt zolang deze regel er staat.
- NL: {Met 5 producten} betaal je **€325** in plaats van **€356**. (Zonder "excl. btw" erachter: de regel eronder zegt al "Alle bedragen zijn excl. btw.")
- EN: {With 5 products} you pay **€325** instead of **€356**.

### Stap 1 — zelfde, als het even duur is (PIPE `besparing.gelijk`; komt met de staffel van nu niet voor)
- NL: {Met N producten} betaal je hetzelfde: **€…**.
- EN: {With N products} you pay the same: **€…**.

### Stap 1 — de tekstknop (PIPE `besparing.knop`) en zijn voorleestekst (`besparing.knopLabel`)
- NL: Met 5 producten · voorgelezen: "Met 5 producten: zet het aantal op 5"
- EN: With 5 products · voorgelezen: "With 5 products: set the count to 5"

### Stap 1 — erachter, alleen als het voorgestelde aantal 10 of meer is en het huidige minder (PIPE `besparing.datum`)
- NL: Vanaf 10 producten kies je zelf een vaste leverdatum; de vroegste ligt een paar dagen vooruit.
- EN: From 10 products you choose a fixed delivery date yourself; the earliest is a few days ahead.

### Stap 1, onder het totaal (en bij de proef onder het vaste bedrag) — wat erbij zit (FORM `s1.inbegrepen`)
- NL: Inbegrepen: een gezicht naar keuze, de styling eromheen, één revisieronde en volledige commerciële gebruiksrechten.
- EN: Included: a face of your choice, the styling around it, one revision round and full commercial usage rights.

### Idem bij de €1-proef (FORM `s1.inbegrepenProef`)
- NL: Inbegrepen: een gezicht naar keuze, de styling eromheen en volledige commerciële gebruiksrechten.
- EN: Included: a face of your choice, the styling around it and full commercial usage rights.

### Stap 3, hint onder het KVK-nummer (alleen bij land Nederland) — GEWIJZIGD (FORM `s3.regHintNl`)
Was: "Je KVK-nummer van acht cijfers. Daarmee bevestigen we dat je zakelijk bestelt." Het voorstel zei "Je KVK-nummer komt op je factuur", maar de factuur drukt het KVK-nummer van de klant niet af; daarom staat dat er niet.
- NL: VISUAILS werkt alleen voor bedrijven: met je KVK-nummer van acht cijfers bevestig je dat je zakelijk bestelt.
- EN: VISUAILS works for businesses only: your 8-digit Chamber of Commerce (KVK) number confirms that you are ordering as a business.

### Stap 5, laatste punt onder "Wat er gebeurt nadat je op de knop drukt" (PIPE `wanneer.*`)
Eén van de vier vormen, met daarachter de revisiezin (niet bij de €1-proef):
- NL gewoon (onder 10 producten): Je beelden komen zo snel mogelijk (vaak binnen een dag, soms een paar dagen).
- EN: Your order is delivered as soon as it is ready (often within a day, sometimes a few days).
- NL vanaf 10, datum gekozen: Je beelden komen in het venster dat je koos: {di 14 okt – wo 15 okt}.
- EN: Your images arrive in the window you chose: {Tue 14 Oct – Wed 15 Oct}.
- NL vanaf 10, nog geen datum: Je beelden komen op een leverdatum die we voor je vastleggen zodra je bestelling binnen is.
- EN: Your images arrive on a delivery date we reserve for you the moment your order is in.
- NL met voorrang: Je bestelling heeft voorrang: betaal je op een werkdag vóór 15:00, dan leveren we uiterlijk de volgende werkdag om 17:00.
- EN: Your order has priority: pay on a working day before 15:00 and we deliver by 17:00 the next working day.
- Revisiezin NL: Na levering heb je 7 dagen voor één revisieronde.
- Revisiezin EN: After delivery you have 7 days for one revision round.

### 1.08 · "App ons" onder elke stap

### Onder de knoppen van elke stap (1 t/m 5; bij de €1-proef 1 t/m 4) (FORM `appOns`)
Gewone link naar WhatsApp (nummer uit `src/data/whatsapp.js`), opent in een nieuw tabblad, geen tijdsbelofte.
- NL: Kom je er niet uit? [App ons]
- EN: Stuck? [Message us on WhatsApp]

### Het klaargezette WhatsApp-bericht (PIPE `appOns.*`)
Alleen de stand van de bestelling, nooit naam, merk, e-mail of telefoon. "met 3 producten" komt erbij zodra het aantal gekozen is (niet bij de proef).
- NL: Hoi, ik zit bij stap 2 (foto’s) van een catalogbestelling met 3 producten.
- EN: Hi, I am at step 2 (photos) of a catalog order with 3 products.
- Stapnamen NL: bestelling · foto’s · gegevens · levertijd · betalen (proef: zonder levertijd)
- Stapnamen EN: order · photos · details · timing · payment
- Diensten NL: een catalogbestelling · een lifestylebestelling · een bestelling voor catalog en lifestyle · de proef (Probeer VISUAILS · €1)
- Diensten EN: a catalog order · a lifestyle order · a catalog and lifestyle order · the trial (Try VISUAILS · €1)

### 8.06 · Het aparte 0%-vinkje weg, de verleggingszin in het zakelijk-vinkje, het land voorgevuld

### Stap 3 — VERWIJDERD (bestelformulier en abonnementsformulier)
Het aparte vinkje en de hint eronder zijn weg:
- NL (bestelformulier): "Ik verklaar dat mijn bedrijf buiten Nederland is gevestigd en dat dit btw-nummer van dat bedrijf is." + "Nodig voordat we 0% op je factuur kunnen zetten. …"
- NL (abonnement): "Ik verklaar dat mijn bedrijf buiten Nederland in de EU is gevestigd en dat dit btw-nummer van dat bedrijf is." + de foutmelding "Vink de verklaring bij je btw-nummer aan …"
- EN-tegenhangers idem.

### Stap 5 (bestelformulier) en onderaan het abonnementsformulier — NIEUW, eerste zin IN het verplichte zakelijk-vinkje (`src/data/business.js`, VERLEGGING_TEXT)
Alleen voor een klant in een ander EU-land dan Nederland die een btw-nummer invulde (en niet "Ik heb geen btw-nummer"). {merk} en {nummer} zijn wat de klant zelf typte. Daaronder blijft de bestaande zakelijke zin (business-v2) woord voor woord staan.
- NL: Ik bestel zakelijk voor {merk}, het btw-nummer {nummer} is van dit bedrijf, en de btw wordt verlegd naar mijn bedrijf.
- EN: I am ordering as a business for {merk}, the VAT number {nummer} belongs to this company, and the VAT is reverse-charged to my company.

### Stap 3 — het veld "Land"
Geen nieuwe tekst: het land staat voorgevuld met het land van de bezoeker (als dat in de lijst staat), zichtbaar en te wijzigen.

---

## Klantteksten N2 (naloop A2) — 8 okt 2026

Bedragen hieronder zijn voorbeelden zoals ze nu uit pricing.js komen; in de code staat geen enkel getypt bedrag.

### N2-1 · Ladderregel, stap 1 van het bestelformulier (OrderFlow.astro `rung.one` / `rung.many`, opmaak in pipeline.js)
Tekst ongewijzigd, alleen rustiger: geen kader, gewone tekstkleur, alleen de drie bedragen vet.
- NL: "Nog 2 producten en het tarief zakt van **€89** naar **€65** per product — 5 voor **€325**, excl. btw."
- EN: "2 more products and every product drops from **€89** to **€65** — 5 for **€325**, excl. VAT."

### N2-2 · Merkmodelformulier (BrandModelBrief.astro)
- WEG (stap 4, onder het btw-nummer): het aparte vinkje met uitleg
  - NL: "Ik bevestig dat mijn onderneming buiten Nederland is gevestigd en dat dit btw-nummer van haar is." / "Nodig voordat we op 0% mogen factureren. …"
  - EN: "I confirm that my company is established outside the Netherlands and that this VAT number belongs to it." / "Required before we can invoice at 0%. …"
- ERBIJ (stap 5, eerste regel in het verplichte zakelijk-vinkje; alleen bij een ander EU-land dan NL mét btw-nummer). Bestaande zin uit business.js, dezelfde als in het bestel- en abonnementsformulier:
  - NL: "Ik bestel zakelijk voor <merk>, het btw-nummer <nummer> is van dit bedrijf, en de btw wordt verlegd naar mijn bedrijf."
  - EN: "I am ordering as a business for <merk>, the VAT number <nummer> belongs to this company, and the VAT is reverse-charged to my company."

### N2-3 · Abonnementsformulier (PlanPicker.astro)
Geen nieuwe tekst; het veld Land staat voorgevuld met het land van de bezoeker.

### N2-4 · "Vanaf"-bedragen en de ene uitlegregel (pricing.js `eenProductRegel()`)
De uitlegregel (dezelfde als /start al had):
- NL (voorpagina en /start): "Eén product kost €89 bij catalog of €109 bij lifestyle; het tarief zakt naarmate je meer bestelt, tot het bedrag hierboven vanaf 20 producten."
- EN: "One product costs €89 for catalog or €109 for lifestyle; the rate drops as you order more, down to the price above from 20 products."

Voorpagina (Voorpagina.astro):
- Feitenrij bovenaan: NL "Vanaf €39 per product" (was €89) · EN "From €39 per product"
- Wissel "Dit stuur jij": NL "vanaf €39" / "vanaf €49" (was €89 / €109) · EN "from €39" / "from €49"
- Blok "Wat we maken", tegels: NL "vanaf €39 per product" / "vanaf €49 per product" · EN "from €39 per product" / "from €49 per product"
- Blok "Wat we maken", NIEUW onder de tegels: de uitlegregel hierboven (NL en EN)
- Blok "Voor wie", kaart "Je begint een merk.": NL "Eén product mag, voor €89." (was "vanaf €89") · EN "One product is fine, for €89." (was "from €89")

/catalog (CatalogPage.astro + catalogStyles):
- Classic-kaart: NL "Vanaf €39 / product · excl. btw" (was "vanaf €89 / product excl. btw") · EN "From €39 / product · excl. VAT"
- Prijsband "Wat een catalogset kost": NL "Eén product kost €89; het tarief zakt naarmate je meer bestelt, tot het bedrag hierboven vanaf 20 producten. Het tarief geldt voor elk product in de bestelling; alle bedragen excl. btw." · EN "One product costs €89; the rate drops as you order more, down to the price above from 20 products. The rate applies to every product in the order; all amounts excl. VAT."
  (was: "€89 per product, tot €39 vanaf 20 producten — excl. btw. Het tarief geldt voor elk product in de bestelling.")

/lifestyle (LifestylePage.astro):
- Prijsband "Wat een carrousel kost": NL "Eén product kost €109; het tarief zakt naarmate je meer bestelt, tot het bedrag hierboven vanaf 20 producten. Het tarief geldt voor elk product in de bestelling; alle bedragen excl. btw." · EN "One product costs €109; the rate drops as you order more, down to the price above from 20 products. The rate applies to every product in the order; all amounts excl. VAT."

/start: tekst ongewijzigd (komt nu uit pricing.js).

### N2-5 · StylePicker, stap 1 (StylePicker.astro `vastHint`, onder "Jouw look")
- NL: "Gekozen bij de look. Hier veranderen kan met één klik." (was "Gekozen op de lifestyle-pagina. …")
- EN: "Picked from the looks. Changing it here is one click." (was "Picked on the lifestyle page. …")

### N2-6 · Stap 2, "Liever later opsturen?" (shots.js `laterLead`)
- NL: "Bestel nu en voeg de foto’s daarna toe in VISUAILS Studio. Ontbreekt er na één dag nog iets, dan maken we wat er is."
- EN: "Order now and add the photos afterwards in VISUAILS Studio. If anything is still missing after one day, we make what we have."
  ("één dag" komt uit FOTO_WACHT_DAGEN in termijnen.js; bij 2 wordt het "twee dagen" / "two days")

### N2-7 · Levermail
Geen tekstwijziging (de datums komen nu uit leverdatums.js).

### N2-8 · /admin (alleen NL)
- Planning en ontbreekt-blok, als het landnummer onzeker is: knop "Bel <merk>" + "Landnummer niet zeker, dus geen WhatsApp-link."

### N2-9 · Bedankpagina en cookiebeleid
- Bedankpagina, "Zo gaat het verder", tweede regel bij voorrang (bestaande zin uit verder.js):
  - NL: "Voorrang — geleverd uiterlijk de volgende werkdag om 17:00, of de toeslag komt terug. We kijken elk beeld na voordat het bij je komt."
  - EN: "Priority — delivered by 17:00 the next working day, or the surcharge comes back. We check every image before it reaches you."
- Bedankpagina, rij "Levertijd" bij voorrang: NL "Voorrang — geleverd uiterlijk de volgende werkdag om 17:00, of de toeslag komt terug" · EN "Priority — delivered by 17:00 the next working day, or the surcharge comes back"
- Cookiebeleid, "In je browser bewaard, niet als cookie":
  - NL: "… na een bestelling de referentie, het aantal producten, de dienst, de leverdatum, of je voorrang koos en het e-mailadres dat je opgaf, voor de bedankpagina …" (was: "de referentie, het aantal producten en het e-mailadres")
  - EN: "… after an order, its reference, the number of products, the service, the delivery date, whether you chose priority and the email address you gave, for the thank-you page …"

---

## Klantteksten bouwer T2 · ronde A2 (2.05 en 2.03)

Per tekst: plek · NL · EN. Alles staat in `src/lib/account.js` (COPY, sleutel tussen haakjes) tenzij anders vermeld.

### 2.05 · Foto's nasturen per vak (Studio → Bestellingen → de bestelling, blok "Je foto's")

1. **Uitleg boven de vakken** (`vakLede`)
   - NL: Per product zie je welke foto's we hebben. Een leeg vak vul je hier aan; we zetten de foto meteen op de goede plek.
   - EN: Per product you see which photos we have. Fill an empty slot here and we put the photo in the right place straight away.
2. **Kop van de lijst "wat ontbreekt"** (`vakOntbreektH`) — de regels zelf komen uit `ontbrekendRegels()` ("p2: geen achterkant, geen detail")
   - NL: Nog niet compleet
   - EN: Not complete yet
3. **Zin onder die lijst** (`vakOntbreektNa`)
   - NL: Zonder deze foto's moeten we raden hoe dat deel van je product eruitziet. Voeg ze hieronder toe, dan beginnen we met alles compleet.
   - EN: Without these photos we have to guess what that part of your product looks like. Add them below, so we start with everything complete.
4. **Stand van een vak** (`vakOntvangen`, `vakLeeg`, `vakMagLeeg`)
   - NL: Ontvangen · Nog niet ontvangen · Mag leeg (bij Gedragen)
   - EN: Received · Not received yet · Optional
5. **Veld per product** (`vakAnder`)
   - NL: Andere foto (voorbeeld of detail)
   - EN: Other photo (example or detail)
6. **Naam van elk bestandsveld voor schermlezers** (`vakKies`)
   - NL: "Achterkant voor Product 2 · Hoodie zwart"
   - EN: "Back for Product 2 · Hoodie black"
7. **Knop** (`vakCta`)
   - NL: Foto's versturen
   - EN: Send photos
8. **Regel onder de knop** (`vakHint`; formaten, MB en aantal uit uploads.js)
   - NL: Toegestaan: jpg, png, webp, avif, heic, heif, gif of tif, hoogstens 25 MB per foto. Tot 12 per keer.
   - EN: Accepted: jpg, png, webp, avif, heic, heif, gif or tif, at most 25 MB per photo. Up to 12 per send.
9. **Ingeklapte complete producten** (`vakCompleet`)
   - NL: 3 producten compleet / 1 product compleet
   - EN: 3 complete products / 1 complete product
10. **Melding na versturen, deels gelukt** (`fotosDeels`)
    - NL: 2 foto's toegevoegd. 1 foto kon niet mee: kies hem opnieuw, als jpg, png, … van hoogstens 25 MB.
    - EN: 2 photos added. 1 photo could not be added: choose it again, as a jpg, png, … file of at most 25 MB.
11. **Melding bij de daggrens** (`fotosDag`)
    - NL: Je hebt vandaag het maximum aantal foto's verstuurd. Stuur de rest morgen, of stuur ze ons via WhatsApp of mail.
    - EN: You have sent the most photos we take in one day. Send the rest tomorrow, or send them to us on WhatsApp or by email.
12. **Regel op de tijdlijn van de klant** (`handleOrderFotos`, in de taal van de bestelling; ook zichtbaar in /admin)
    - NL: Nagestuurd in Studio: p2 achterkant, p3 andere foto
    - EN: Sent later in Studio: p2 back, p3 other photo

### 2.05 · De vaste tekst waarmee Lucas de klant benadert (/admin → bestelling → Het bord; `ontbreektKlantTekst()` in `src/lib/admin.js`)

Gaat via de knop "App …" (wa.me, tekst ingevuld) of "Mail …"; Lucas past hem nog aan voordat hij hem verstuurt. "na een dag" komt uit `FOTO_WACHT_DAGEN` in `src/data/termijnen.js`.

- NL (één foto): Hoi Mara, over VIS-…: we missen nog een foto van Hoodie zwart (achterkant). Kun je hem sturen? Dat kan bij je bestelling in VISUAILS Studio (log in met je e-mailadres), of als antwoord op dit bericht. Hebben we na een dag niets gehoord, dan maken we je beelden met wat er is. VISUAILS
- NL (meer): … we missen nog foto's van Hoodie zwart (detail); product 2 (achterkant, detail). Kun je ze sturen? Dat kan …
- EN: Hi Mara, about VIS-…: we are still missing photos of Hoodie black (detail); product 2 (back, detail). Could you send them? You can add them to your order in VISUAILS Studio (sign in with your email address), or reply to this message. If we have not heard from you after a day, we make your images with what we have. VISUAILS
- Onderwerp bij mail — NL: VIS-… — ontbrekende foto's · EN: VIS-… — missing photos

### 2.03 · De bestelkaart (Studio → Bestellingen; `src/lib/account.js` COPY, `src/components/studio/Bestelling.astro`)

1. **Nu-zin bij een ontbrekende foto** (`nuMist`; in de kop van de dichte kaart). De andere Nu-zinnen zijn de bestaande "Nu:"-zinnen van de tijdlijn (`flowNow`), ongewijzigd.
   - NL: Er ontbreekt nog een foto: Product 2 · achterkant. Voeg hem toe, dan beginnen we met alles compleet.
   - EN: A photo is still missing: Product 2 · back. Add it, so we start with everything complete.
2. **De ene knop onder de dichte kaart** — per stand:
   - onbetaald: NL "Nu betalen · € 98,00" · EN "Pay now · €98.00" (bestaande `payNow` + bedrag)
   - geleverd: NL "Bekijk je beelden" · EN "View your images" (`nuBekijkBeelden`, nieuw)
   - foto ontbreekt: NL "Foto's toevoegen" · EN "Add photos" (bestaande `fotosCta`)
   - bezig / revisie bij ons: NL "Open deze bestelling" · EN "Open this order" (bestaande `ovOpenOrder`)
   - afgerond: NL "Downloaden (zip)" · EN "Download (zip)"
   - geannuleerd: geen knop
3. **Revisiedatum** (`datumRevisie`; alleen zolang de revisieronde nog kan)
   - NL: Revisie aanvragen kan tot en met 15 okt.
   - EN: You can request a revision until 15 Oct.
4. **Bewaardatum** (`datumBewaar`) — let op: "tot en met", net als de levermail ("Je beelden staan online tot en met …"), en niet "tot" zoals in het voorstel
   - NL: Je beelden staan hier tot en met 6 jan.
   - EN: Your images stay here until 6 Jan.
5. **Bij de proef, in plaats van de revisiedatum** (`datumProef`)
   - NL: Bij de proef zit geen revisieronde. Iets niet goed? App of mail ons.
   - EN: A trial has no revision round. Something not right? Message or email us.
6. **Knop van de map, bovenaan de open kaart** (`bDownloadAll`, was "Download de map" / "Download the folder")
   - NL: Downloaden (zip)
   - EN: Download (zip)
7. **Ingeklapte groep afgeronde bestellingen** (`ordersAfgerond`; `src/pages/account/orders.astro`)
   - NL: Afgerond (3)
   - EN: Completed (3)

### 2.05 · Bestaande verwijzing naar nasturen, nu naar Studio (`src/components/ThankYouPage.astro`, blok "Meer hoeken, nauwkeuriger resultaat" onderaan /thank-you)

Was een WhatsApp-knop ("Extra foto's sturen via WhatsApp"); is nu een gewone link naar /account/orders (V31-3 = a).
- NL: Extra foto's toevoegen in VISUAILS Studio
- EN: Add extra photos in VISUAILS Studio

### Studiomail "Foto's binnen" (alleen NL, aan Lucas; `notifyFotosToegevoegd()` in `src/lib/notify.js`) — geen klanttekst, ter info
Twee rijen erbij: "Vakken: p2 achterkant, p3 andere foto" en "Ontbreekt nog: p1 Hoodie zwart: geen detail" (of "niets"); de slotzin wordt "Ze staan op het bord van de bestelling, elk in zijn vak, met "nagestuurd" erbij."

---

## Klantteksten bouwer S2 · ronde A2 (1.01, 1.02, 1.06, G2)

Per tekst: plek · NL · EN. Bedragen staan als {…}: ze komen uit pricing.js.

### 1.01 · /start (src/components/StartPage.astro)

| Plek | NL | EN |
|---|---|---|
| /start, kop | Kies een look. | Pick a look. |
| /start, zin onder de kop | Elke bestelling begint met een look. Kies er een en het bestelformulier opent met die look al gekozen. Er wordt niets afgeschreven tot je betaalt. | Every order starts with a look. Pick one and the order form opens with it already chosen. Nothing is charged until you pay. |
| /start, groepskop 1 (uit orderDoors.js) | Catalog — voorkant, achterkant, detail en on-model | Catalog — front, back, detail and on-model |
| /start, groepskop 2 (uit orderDoors.js) | Lifestyle — je product in een gestylede scène | Lifestyle — your product in a styled scene |
| /start, etiket naast elke groepskop (uit eigenproduct.js, bestond al) | Van jouw eigen productfoto’s | From your own product photos |
| /start, elke kaart: zin | de tagline uit de lookdata (bestond al) | idem |
| /start, elke kaart: bedrag | Vanaf {€39/€49} per product, excl. btw | From {€39/€49} per product, excl. VAT |
| /start, elke kaart: hoofdknop | Kies deze look | Pick this look |
| /start, elke kaart: tweede knop (TEST_SAMPLE.cta, bestond al) | Probeer VISUAILS · {€1} | Try VISUAILS · {€1} |
| /start, elke kaart: kleine link | Meer over deze look | More about this look |
| /start, regel onder de kaarten | Eén product kost {€89} bij catalog of {€109} bij lifestyle; het tarief zakt naarmate je meer bestelt, tot het bedrag hierboven vanaf {20} producten. Bekijk de volledige prijslijst | One product costs {€89} for catalog or {€109} for lifestyle; the rate drops as you order more, down to the price above from {20} products. See the full rate card |
| /start, rustige rij: label | Ook | Also |
| /start, rustige rij | Abonnement · Video (op aanvraag) · Eigen look · Jouw merkmodel · Probeer VISUAILS · {€1} · App ons | Monthly plan · Video (on request) · Your own look · Your Brand Model · Try VISUAILS · {€1} · Message us on WhatsApp |
| /start, WhatsApp-bericht achter "App ons" | Hoi VISUAILS, ik weet niet zeker welke look bij mijn producten past. | Hi VISUAILS, I'm not sure which look fits my products. |
| /start, meta-omschrijving (src/pages/start.astro, nl/start.astro) | Kies een look voor catalog- of lifestylebeelden. Het bestelformulier opent met die look al gekozen — er wordt niets afgeschreven tot je betaalt. | Pick a look for catalog or lifestyle images. The order form opens with that look already chosen — nothing is charged until you pay. |

Weg van /start (stond er tot vandaag): de acht deuren met filter, het blok "Of betaal er maandelijks voor", het blok "Merkmodel — je eigen gezicht" en het slot "Nog niet zeker welke?". Abonnement, merkmodel, proef en WhatsApp staan nu in de rustige rij. "Wat er gebeurt nadat je erop drukt" is ongewijzigd.

### 1.02 · Plaatshouders (geen nieuwe klanttekst)

Geen nieuwe klanttekst. Verborgen tot het beeld er is: het blok Editions op de voorpagina, de kaart Editions in de stijlenstrook, de dia "Video" in "Wat je stuurt. Wat je terugkrijgt.", het laptopbeeld "Volledig", de videorij op /gallery, het portret op /about en het beeld naast de kop van /hooks en /editions. /admin/diagnose kreeg het blok "Beelden die nog ontbreken" (alleen NL, alleen admin).

### 1.06 · De proef begint bij een look

| Plek | NL | EN |
|---|---|---|
| Elke lookpagina (/lifestyle/<look>, /catalog/classic), tweede knop bovenaan en onderaan — was "Probeer VISUAILS" / "Test sample" | Probeer VISUAILS · {€1} | Try VISUAILS · {€1} |
| /catalog#looks en /lifestyle#looks, elke vaste look: nieuwe stille knop | Probeer VISUAILS · {€1} | Try VISUAILS · {€1} |
| Voorpagina, stijlenstrook, onder elke vaste look: nieuwe stille knop | Probeer VISUAILS · {€1} | Try VISUAILS · {€1} |
| /test-sample met een look, kop van stap 1 (vervangt "Wat maken we voor je?") | Je proef in {look} | Your test sample in {look} |
| /test-sample met een look, regel onder de kop | Andere look of soort? Kies opnieuw | Different look or type? Choose again |
| /test-sample, kleine lettertjes (nieuw, V18 = a) | Met de proef maken we je account in VISUAILS Studio aan: daar download je je beelden, en je volgende bestelling staat al ingevuld. | The test sample sets up your account in VISUAILS Studio: that is where you download your images, and your next order starts filled in. |
| Cookiebeleid (EN en NL), alinea "In je browser bewaard": zin weg | (weg) "Eén notitie blijft langer: sluit je de kaart ‘Probeer VISUAILS’, dan onthoudt vis_proef_dicht dat 7 dagen lang." | (weg) "One note stays longer: if you close the ‘Try VISUAILS’ card, vis_proef_dicht remembers that for 7 days." |

Weg: de zwevende popup "Eerst zien? Eén product voor €1…" (Proefkaart.astro) op alle pagina's. Het vinkje "Bewaar mijn gegevens" in stap 5 staat niet meer op /test-sample (de proef bewaart ze altijd).

### G2 · Proef tijdelijk dicht, met de wachtlijst

| Plek | NL | EN |
|---|---|---|
| /test-sample, dicht: kop | Even niet beschikbaar | Not available right now |
| /test-sample, dicht: zin | We maken nu even geen nieuwe proeven, zodat de bestellingen die al lopen op tijd klaar zijn. Laat je e-mailadres achter, dan mailen we je één keer zodra de proef weer open is. | We are not taking new test samples for a little while, so the orders already running are ready on time. Leave your email address and we will email you once when the test sample opens again. |
| /test-sample, alleen lifestyle: kop | De catalogproef is even niet beschikbaar | The catalog test sample is not available right now |
| /test-sample, alleen lifestyle: zin | De lifestyleproef wel: die kies je hieronder. Liever een catalogset? Laat je e-mailadres achter, dan mailen we je één keer zodra de proef weer helemaal open is. | The lifestyle one is: choose it below. Rather have a catalog set? Leave your email address and we will email you once when the test sample is fully open again. |
| /test-sample, veldlabel | Je e-mailadres | Your email address |
| /test-sample, knop | Mail me als hij weer open is | Email me when it reopens |
| /test-sample, na aanmelden | Dank je. We mailen je één keer zodra de proef weer open is; daarna halen we je adres van de lijst. | Thank you. We will email you once when the test sample opens again; after that we take your address off the list. |
| /test-sample, fout adres | Dat e-mailadres klopt niet helemaal. Kijk het even na en probeer het opnieuw. | That email address does not look quite right. Check it and try again. |
| /test-sample, te veel tegelijk | Er kwamen veel aanmeldingen tegelijk binnen. Probeer het over een paar minuten opnieuw. | A lot of sign-ups came in at once. Try again in a few minutes. |
| /test-sample, botcheck | We konden niet bevestigen dat deze aanmelding van een mens komt. Probeer het zo nog eens, of mail hello@visuails.com. | We could not confirm this sign-up came from a person. Try again in a moment, or email hello@visuails.com. |
| /test-sample, andere fout | Dat lukte even niet. Probeer het zo nog eens. | That did not work just now. Try again in a moment. |
| /test-sample, onder het veld | We gebruiken je adres alleen voor deze ene mail. Privacy | We use your address for this one email only. Privacy |
| Mail "weer open": onderwerp | De proef van VISUAILS is weer open | The VISUAILS test sample is open again |
| Mail "weer open": voorregel | Eén product voor {€1}, gemaakt van jouw eigen foto. | One product for {€1}, made from your own photo. |
| Mail "weer open": kop | De proef is weer open | The test sample is open again |
| Mail "weer open": tekst | Hoi, / Je vroeg ons je te laten weten wanneer de proef van VISUAILS weer open is. Dat is nu[, voor een lifestylecarrousel]: één product voor {€1}, gemaakt van jouw eigen foto. / [knop: Probeer VISUAILS · {€1}] / Dit is de enige mail die je hierover krijgt: we hebben je adres nu van de lijst gehaald. / — VISUAILS | Hi, / You asked us to let you know when the VISUAILS test sample opened again. It is open now[, for a lifestyle carousel]: one product for {€1}, made from your own photo. / [button: Try VISUAILS · {€1}] / This is the only email you get about this: we have now taken your address off the list. / — VISUAILS |
| Privacy §2 (nieuw punt) | De wachtlijst van de proef, als je je adres achterliet — staat ‘Probeer VISUAILS’ even dicht, dan kun je op de proefpagina je e-mailadres achterlaten. We bewaren het adres, de taal en het moment, en gebruiken het alleen voor één mail zodra de proef weer open is; daarna wissen we het. | The test sample waiting list, if you left your address — when ‘Try VISUAILS’ is closed for a while, you can leave your email address on the test sample page. We keep the address, the language and the moment, and use it for one email only, when the test sample opens again; then we delete it. |
| Privacy §4 (toestemming, opsomming) | … het bericht bij lancering, de Studiobrief, de wachtlijst van de proef en een aanbeveling … | … the launch notice, the Studio letter, the test sample waiting list and a recommendation … |
| Privacy §6 (nieuwe alinea) | Liet je je adres achter op de wachtlijst van de proef, dan staat het daar tot we de mail sturen dat de proef weer open is, en wissen we het meteen daarna. | If you left your address on the test sample waiting list, it stays there until we send the email that the test sample is open again, and we delete it right after. |

Cookiebeleid: geen wijziging voor G2 (er wordt niets in de browser bewaard). /admin/proef is alleen Nederlands.


### Toegevoegd door de hoofdbouwer
- /test-sample, wachtlijst (proef dicht), melding bij een leeg e-mailveld
  - NL: Vul je e-mailadres in, dan mailen we je één keer zodra de proef weer open is.
  - EN: Enter your email address and we’ll email you once, as soon as the trial reopens.

---

## Teksten GIDS · punt 5.07 Fotogids op één A4 · ronde A2

Eén bron: `src/data/fotogids.js` (blokken, vragen, titel, intro) en `src/data/shots.js` (regel per vak, aanname bij gedragen). Wat hier staat, staat op /upload-guidelines, in de fotogids-pdf én in de checklistmail, tenzij anders vermeld.

### Titel (pagina-h1, pdf-kop, mailkop en mailonderwerp)
- NL: Zo maak je de productfoto’s die wij nodig hebben
- EN: How to shoot the product photos we need
  (EN-pagina had "How to photograph your product so we can rebuild it faithfully"; NL-pagina "Zo maak je de foto die wij nodig hebben")

### Inleiding (pagina onder h1, pdf onder de kop, mail na "Hoi,")
- NL: Een telefoon bij het raam is genoeg. Let op vier dingen, en loop vóór het uploaden de vijf vragen onderaan na.
- EN: A phone by a window is enough. Watch four things, and run through the five questions at the bottom before you upload.

### Blok 1 · Licht
- NL: Licht · Daglicht bij een raam; lamp en flits uit. · Alle producten in één keer, op dezelfde plek: dan lijken de foto’s van een set op elkaar. · Te donker? Dan zegt het formulier het meteen bij het uploaden.
- EN: Light · Daylight by a window; lamp and flash off. · All products in one go, in the same spot: then the photos in a set match. · Too dark? The form tells you right away when you upload.

### Blok 2 · Ondergrond
- NL: Ondergrond · Een lege vloer of een deur, niet een bed of bank. · Gestreken of gestoomd, zonder plooien. · Hangkaartjes en prijsstickers eraf.
- EN: Surface · A clear floor or a door, not a bed or sofa. · Ironed or steamed, no creases. · Swing tags and price stickers off.

### Blok 3 · Kader
- NL: Kader · Recht ervoor of recht van boven, met de lens op 1×. · Geen portretmodus en geen filter; veeg de lens eerst schoon. · Het hele product in beeld, met wat ruimte eromheen. · Minstens 1000 pixels op de lange zijde; het formulier weigert een kleinere foto.
- EN: Frame · Straight on or straight from above, with the lens at 1×. · No Portrait mode and no filter; wipe the lens clean first. · The whole product in frame, with a little room around it. · At least 1000 pixels on the long side; the form refuses a smaller photo.
  (1000 komt uit MIN_LANGE_ZIJDE; "weigert" uit de keuring zelf. "Portretmodus" i.p.v. "portretstand" uit het voorstel: portretstand leest als staand fotograferen.)

### Blok 4 · Close-up
- NL: Close-up · Het logo, de print of het label — wat in je beelden moet kloppen. Geen logo? Dan de stof. · De kleur die je bij je bestelling opgeeft, zoals in je webshop, is leidend. · Tip: leg een wit vel printpapier half in beeld; dan zien we welke kleur het licht geeft.
- EN: Close-up · The logo, the print or the label — whatever has to be right in your images. No logo? Then the fabric. · The colour you give with your order, as in your webshop, is what counts. · Tip: put a sheet of white printer paper half in the frame; it shows us what colour the light adds.

### De vijf vragen (pagina: onderaan in het slotpaneel · pdf: violet blok onderaan · mail: genummerd)
- NL: Voor je uploadt · Daglicht, lamp uit? · Scherp tot in de randen? · Het hele product in beeld? · Voor- en achterkant echt verschillend? · Kleur zoals in je hand?
- EN: Before you upload · Daylight, lamp off? · Sharp right to the edges? · The whole product in frame? · Front and back really different? · Colour as it looks in your hand?

### Per vak (src/data/shots.js `regel` / `zonder`) — pagina (donkere sectie) en pdf (rij "Per product"); straks ook stap 2
- Voorkant — NL: Plat op een lege vloer of tegen een deur, helemaal in beeld, bij daglicht. · EN: Flat on a clear floor or against a door, fully in frame, in daylight.
- Achterkant — NL: Zelfde plek en licht, product omgedraaid. · EN: Same spot and light, product turned over.
- Detail — NL: Het logo, de print of het label — wat in je beelden moet kloppen. Geen logo? Dan de stof. · EN: The logo, the print or the label — whatever has to be right in your images. No logo? Then the fabric.
- Gedragen — NL: Laat zien hoe het valt. + Zonder draagfoto gaan we uit van een normale, rechte pasvorm. · EN: Show how it hangs. + Without a worn photo we assume a regular, straight fit.

### Alleen op de pagina /upload-guidelines
- Kop donkere sectie — NL: Wat we per product vragen · EN: What we ask for per product (etiket erboven: Per product)
- Pdf-link (boven én onderaan) — NL: Download de fotogids als A4 (pdf) · EN: Download the guide as one A4 (pdf)
- Weg: de lijsten "Wel doen / Vermijden" (Do / Avoid), "De set die we aanraden — en waarom", de noot "Verplicht zijn…", de slotkop "Foto klaar? Stuur hem in." / "Got a photo ready? Let’s see it transformed." (vervangen door "Voor je uploadt" + de vijf vragen)

### Alleen in de mail (checklistmail, functions/api/order.js · subscriberEmail)
- Voorregel (preheader) — NL: Licht, ondergrond, kader en close-up, en vijf vragen voor je uploadt. · EN: Light, surface, frame and close-up, and five questions before you upload.
- Zin per product — NL: Per product nodig: voorkant, achterkant en detail. Gedragen mag erbij: zonder draagfoto gaan we uit van een normale, rechte pasvorm. · EN: Needed per product: front, back and detail. Worn is up to you: without a worn photo we assume a regular, straight fit.
- Links — NL: Neem hem mee als A4 (pdf) → · Met voorbeeldfoto’s op de site → · EN: Take it with you as one A4 (pdf) → · With example photos on the site →
- Weg: "Hier staat het in vier punten — de hoeken, het licht en de achtergrond die van een telefoonfoto een campagnebeeld maken." en "Bekijk de checklist".

### Alleen op het A4 (scripts/lib/fotogids-html.mjs)
- Onder de foto bij ondergrond en close-up — NL: Zo ingestuurd · EN: Sent in like this
- Contactregel — NL: Twijfel je over een foto? Stuur hem vooruit: WhatsApp … · hello@visuails.com · EN: Unsure about a photo? Send it ahead: WhatsApp … · hello@visuails.com
- Weg (oude bladen 2 en 3): de zes tips, "Meer hoeken, preciezer resultaat", "Vragen we je om één specifieke foto?", "Zo ziet één set eruit".

---

## Teksten P3 · ronde A3 ("na de levering")

Per tekst: plek · NL · EN. Alleen nieuwe of gewijzigde klantteksten.

### 3.01 · "Wat nu" bovenaan privélink, Studio en levermail

Alle zinnen staan in `src/lib/nuzin.js` (NU_TEKST) en worden door de privélink, de bestelkaart en het overzicht in Studio gedeeld. De zinnen van de tijdlijn (betalen, btw, in productie, afgerond enz.) zijn ongewijzigd overgenomen uit Studio.

| Plek | NL | EN |
|---|---|---|
| Nu-zin, geleverd (privélink bovenaan, bestelkaart, overzicht) | Je 12 beelden staan klaar. Klopt alles, keur ze dan in één keer goed. Klopt er iets niet, vink die aan en schrijf erbij wat er anders moet. Je hebt één revisieronde; daarna ronden we je bestelling af. | Your 12 images are ready. If everything is right, approve them all in one go. If something is off, tick those and write what should change. You have one revision round; after that we complete your order. |
| idem, één beeld | Je beeld staat klaar. Klopt het, keur het dan goed. Klopt er iets niet, vink het aan en schrijf erbij wat er anders moet. Je hebt één revisieronde; daarna ronden we je bestelling af. | Your image is ready. If it is right, approve it. If something is off, tick it and write what should change. You have one revision round; after that we complete your order. |
| idem, revisieronde al gebruikt/ingetrokken | Je 12 beelden staan klaar. Klopt alles, keur ze dan in één keer goed. | Your 12 images are ready. If everything is right, approve them all in one go. |
| Nu-zin, revisietermijn loopt binnen 2 dagen af | Je revisieronde loopt bijna af. Klopt alles, keur je beelden dan goed; klopt er iets niet, vink het aan en schrijf erbij wat er anders moet. | Your revision round is nearly over. If everything is right, approve your images; if something is off, tick it and write what should change. |
| Nu-zin, afgerond, nog geen cijfer (eerste 14 dagen) | Afgerond — dank je. Je beelden staan klaar om te downloaden. | Complete — thank you. Your images are ready to download. |
| Nu-zin, bewaardatum binnen 14 dagen | Je beelden gaan binnenkort van deze pagina. Download ze vóór die tijd. | Your images leave this page soon. Download them before then. |
| Nu-zin, proef geleverd | Je proefset staat klaar om te downloaden. | Your trial set is ready to download. |
| Knop (violet, V22 = a) | Alles goed — naar je downloads | All good — to your downloads |
| Link naast de knop | Eerst downloaden | Download first |
| Link | Iets aanmerken ↓ | Flag something ↓ |
| Link (afgerond) | Hoe vond je het? ↓ | How did we do? ↓ |
| Knop privélink, onbetaald | Nu betalen | Pay now |
| Studio-overzicht, kop boven de bestelling die op de klant wacht | Nu te doen | To do now |
| Studio-overzicht, onder het blok | En nog 1 bestelling: / En nog 2 bestellingen: | And 1 more order: / And 2 more orders: |
| Levermail, eerste alinea (vervangt "Je bestelling is klaar — … Via de knop hieronder …") | Je 12 beelden staan klaar. Klopt alles, keur ze dan in één keer goed. Klopt er iets niet, vink die aan en schrijf erbij wat er anders moet. Je hebt één revisieronde, tot en met **15 oktober 2026**; daarna ronden we je bestelling af. | Your 12 images are ready. If everything is right, approve them all in one go. If something is off, tick those and write what should change. You have one revision round, until **15 October 2026**; after that we complete your order. |
| Levermail zonder aantal (terugval) | Je bestelling is klaar. Je hebt één revisieronde, tot en met **…**; daarna ronden we je bestelling af. | Your order is ready. You have one revision round, until **…**; after that we complete your order. |

Weggehaald op de privélink: de regel "Tevredenheidscheck: 1 revisieronde per bestelling, aan te vragen binnen 7 dagen na levering." zodra er geleverd is (het blok bovenaan zegt het met datum).

### 3.05 · Afrondscherm · 10.05 · Toestemming

Tevredenheidsblok: `src/lib/feedback.js` (COPY), gedeeld door privélink en Studio.

| Plek | NL | EN |
|---|---|---|
| Afrondblok, kop tekstvak (score 4–5) | Wat zou je tegen een ander merk zeggen? | What would you tell another brand? |
| idem, uitleg | Mag leeg blijven. Wat je hier schrijft lezen we zelf; we zetten het alleen ergens neer als je dat hieronder aangeeft, en pas nadat we het hebben nagekeken. | You may leave this empty. We read what you write here ourselves; we only put it anywhere if you say so below, and only after we have read it. |
| idem, veld | Merknaam, zoals hij erbij mag staan | Brand name, as it may appear |
| Toestemmingsblok, vraag | Mogen we dit laten zien op visuails.com en social? | May we show this on visuails.com and social? |
| idem, groepen | Je tekst · Je beelden en productfoto’s | Your text · Your images and product photos |
| idem, keuzes | Ja, met merknaam · Ja, zonder merknaam · Liever niet (staat standaard aan) | Yes, with brand name · Yes, without brand name · Rather not |
| idem, zin eronder (V30-2 = a) | Foto’s waarop iemand je product draagt, laten we nooit zien. Je kunt je toestemming altijd intrekken, in VISUAILS Studio of met een mail; dan halen we je beelden binnen een week van de site en social. | We never show photos of someone wearing your product. You can withdraw your permission at any time, in VISUAILS Studio or by email; we then take your images off the site and social within a week. |
| Na versturen, kop (met tekst) | Wil je dit ook op Trustpilot zetten? | Want to put this on Trustpilot too? |
| idem, regel eronder | Je tekst staat hieronder; kopieer hem gerust. | Your text is below; feel free to copy it. |
| Na versturen, kop (zonder tekst) | Wil je ook een review op Trustpilot achterlaten? | Want to leave a review on Trustpilot as well? |
| Tekstvak (aria-label) | Je tekst, om te kopiëren | Your text, to copy |
| Grote knop / kleine link (REVIEW_VOORKEUR) | Review op Trustpilot · Of op Google | Review on Trustpilot · Or on Google |
| Wat gekozen is | Je tekst: ja, met merknaam · Je beelden: liever niet | Your text: yes, with brand name · Your images: rather not |
| Knop | Toestemming intrekken | Withdraw permission |
| Na intrekken | Je hebt je toestemming ingetrokken. We halen je beelden binnen een week van de site en social, en zetten je tekst nergens meer neer. | You withdrew your permission. We take your images off the site and social within a week, and no longer use your text anywhere. |
| Privélink, map in het afrondblok (portal.js) | De foto's hieronder zijn voorbeeldweergaven op schermformaat. De echte bestanden zitten in de map. | The photos below are review copies, at screen size. The folder holds the real files. |
| /privacy §2, nieuw punt | **Toestemming om je bestelling te laten zien, als je die geeft** — na de levering vragen we of we je tekst en je beelden (de beelden die we leverden en de productfoto’s die je stuurde) op visuails.com en social mogen laten zien, met je merknaam, zonder of liever niet. Allebei vrijwillig, en we tonen niets voordat we het zelf hebben nagekeken. Foto’s waarop iemand je product draagt, laten we nooit zien: voor de persoon op de foto kun jij geen toestemming geven. Je kunt je toestemming altijd intrekken, in VISUAILS Studio of met één mail; dan halen we je beelden en tekst binnen een week van de site en social. | **Permission to show your order, if you give it** — after delivery we ask whether we may show your text and your images (the visuals we delivered and the product photos you sent) on visuails.com and social media, with your brand name, without it, or not at all. Both are voluntary and nothing is shown before we have checked it ourselves. Photos of someone wearing your product are never shown: you cannot give permission on behalf of the person in them. You can withdraw your permission at any time, in VISUAILS Studio or with one email; we then take your images and text off the site and social media within a week. |
| /privacy §2, feedback (ingekort) | de score en een eventuele tekst na de levering, en naar welke reviewsite je doorklikt. | the score and any text you leave after delivery, and which review site you click through to. |
| /privacy, grondslag toestemming | … en de tekst of beelden die je ons laat tonen, allemaal uit paragraaf 2. | … and the text or images you allow us to show, all described in section 2. |
| Mail aan Lucas bij intrekken (alleen NL) | Onderwerp: Toestemming ingetrokken bij VIS-… — binnen een week weghalen. Tekst: Haal zijn beelden en zijn tekst binnen een week van de site en van social. Dat is wat het scherm hem belooft. In /admin/testimonials staat hij nu onder "Ingetrokken". | — |

### 3.07 · "Bestel met dezelfde look"

Teksten in `src/lib/herbestel.js` (T). Staat op de privélink na afronden (in het afrondblok), in Studio bij elke geleverde bestelling, en op de proef-privélink.

| Plek | NL | EN |
|---|---|---|
| Kop boven de knop | Meer producten in deze look? | More products in this look? |
| Knop (uit de echte keuzes) | Catalog bestellen — Classic · gebroken wit · 4:5 / Lifestyle bestellen — Dunes · 9:16 | Order Catalog — Classic · off-white · 4:5 / Order Lifestyle — Dunes · 9:16 |
| Knop zonder keuzes (terugval) | Catalog bestellen in dezelfde look | Order Catalog in the same look |
| Eigen look in de knop | eigen look | own look |
| Regel voor abonnees (uit pricing.js) | 4 credits per product (lifestyle: 5) | 4 credits per product |
| Kleine regel eronder | Opent het bestelformulier met dezelfde keuzes. Je gegevens vul je daar zelf in, of je logt in. | Opens the order form with the same choices. You fill in your details there, or sign in. |

### 3.08 · De privélink van de €1-proef

| Plek | NL | EN |
|---|---|---|
| Proef-privélink, zin bovenaan (nuzin.js) | Je proefset staat klaar om te downloaden. | Your trial set is ready to download. |
| Proef-privélink en Studio, knop (herbestel.js) | Bestel in deze look | Order in this look |
| idem, regel eronder (bedrag uit LADDER, onderste trede) | catalogfoto’s vanaf €39 per product / lifestylecarrousels vanaf €… per product | catalog photos from €39 per product / lifestyle carousels from €… per product |
| Levermail van de proef (vervangt "Je proef is klaar. In VISUAILS Studio kun je … vanaf €89 per product.") | Je proefset staat klaar om te downloaden. Bevalt het? Bestel de rest van je producten in dezelfde look — catalogfoto’s vanaf €39 per product. | Your trial set is ready to download. Like it? Order the rest of your products in the same look — catalog photos from €39 per product. |
| Tijdlijn (order_events) bij afronden van de proef | Afgerond bij levering (proef): bij de proef hoort geen revisieronde. Downloaden blijft mogelijk tot 90 dagen na levering. | Completed on delivery (trial): a trial has no revision round. Downloads stay available for 90 days after delivery. |

---

## Klantteksten W3 — ronde A3 (3.03 · 7.05 · 3.06 · 5.03)

Per tekst: plek, NL, EN. /admin en het nachtrapport zijn alleen Nederlands en staan hier niet.

### 3.03 · Stil afronden

**Plek:** het revisiebeleid, punt "Eén ronde zit erbij" (`REVISIEBELEID` in src/data/pricing.js) — staat op /faq, in /terms §10 en in Studio bij het aanvragen van een revisieronde. Zin toegevoegd aan het eind.
- NL: "Vraag je in die dagen niets aan, dan ronden we je bestelling af; je beelden blijven gewoon te downloaden."
- EN: "If you request nothing in those days, we complete your order; your images stay available to download."

(De cron zelf stuurt geen mail; de regel in order_events is intern en niet zichtbaar voor de klant.)

### 7.05 · WhatsApp-teksten op vijf momenten (src/lib/waLink.js, `waTekst()`)

Lucas drukt zelf op verzenden; "Sanne" en "VIS-AB12-C3D" zijn voorbeelden.

**1 · Betaling staat open** (bestelpagina /admin, zijkolom "wacht op betaling", studiomail "Betaling niet gelukt")
- NL: "Hoi Sanne, je bestelling VIS-AB12-C3D staat nog open: de betaling is niet afgerond. Betalen kan met de link in je mail of in VISUAILS Studio (log in met je e-mailadres). Betaal je niet, dan vervalt de bestelling na 15 oktober. Lukt het niet, laat het dan weten. VISUAILS"
- EN: "Hi Sanne, your order VIS-AB12-C3D is still open: the payment did not go through. You can pay with the link in your email or in VISUAILS Studio (sign in with your email address). If it stays unpaid, the order lapses after 15 October. If something is not working, let us know. VISUAILS"
- De datum is dezelfde som als in de herinneringsmail (14 dagen na bestellen, of 7 na de btw-goedkeuring).

**2 · Foto's ontbreken** (blok "foto's ontbreken" in /admin, studiomail nieuwe bestelling) — ongewijzigd uit ronde A2, alleen verhuisd.
- NL: "Hoi Sanne, over VIS-AB12-C3D: we missen nog een foto van Hoodie zwart (achterkant). Kun je hem sturen? Dat kan bij je bestelling in VISUAILS Studio (log in met je e-mailadres), of als antwoord op dit bericht. Hebben we na een dag niets gehoord, dan maken we je beelden met wat er is. VISUAILS"
- EN: "Hi Sanne, about VIS-AB12-C3D: we are still missing a photo of Hoodie zwart (back). Could you send it? You can add it to your order in VISUAILS Studio (sign in with your email address), or reply to this message. If we have not heard from you after a day, we make your images with what we have. VISUAILS"

**3 · Mail kwam niet aan** (bestelpagina /admin, nachtrapport)
- NL: "Hoi Sanne, onze mail over je bestelling VIS-AB12-C3D kwam niet aan op s…@voorbeeld.nl. Klopt je e-mailadres nog? Stuur ons het goede adres, dan sturen we de mail opnieuw. VISUAILS"
- EN: "Hi Sanne, our email about your order VIS-AB12-C3D did not reach s…@voorbeeld.nl. Is your email address still right? Send us the correct one and we will send the email again. VISUAILS"

**4 · Incasso mislukt** (studiomail "Incasso niet gelukt"; de maand staat er alleen in als hij bekend is — nu niet)
- NL: "Hoi Sanne, de betaling voor je VISUAILS-abonnement (van oktober) is niet gelukt. Wil je kijken of er iets is met je rekening? Lukt het niet, laat het dan weten. VISUAILS"
- EN: "Hi Sanne, the payment for your VISUAILS subscription (for October) did not go through. Could you check whether something is up with your bank account? If something is not working, let us know. VISUAILS"

**5 · Review vragen** — zie 3.06 hieronder.

### 7.05 · Telefoonveld en "we appen je"

**Plek:** formulier stap 3, tekst onder het telefoonveld (`phoneHint` in src/components/order/OrderFlow.astro)
- NL: "We nemen contact met je op als er iets met je bestelling is." (was: "We gebruiken het alleen voor deze bestelling.")
- EN: "We get in touch if anything comes up with your order." (was: "We only use it for this order.")

**Plek:** foutmelding bij een leeg telefoonveld — formulier stap 3 (`phoneErr`, OrderFlow.astro), de factuurgegevens (`phoneErr`, src/data/billing.js), de aanvraagpagina (`phoneErr`, src/components/order/HoldingPage.astro) en het abonnementsformulier (`errTelefoon`, src/components/order/PlanPicker.astro)
- NL: "Vul een nummer in waarop we je kunnen bereiken — we nemen contact met je op als er iets met je bestelling is." (was: "… — we appen je als er iets (aan je foto's) onduidelijk is.")
- EN: "Fill in a number we can reach you on — we get in touch if anything comes up with your order." (was: "… — we message you if anything (about your photos) is unclear.")

### 3.06 · Review vragen via WhatsApp

**Plek:** WhatsApp-bericht na de knop "Vraag om een review via WhatsApp" (bestelpagina /admin; nachtrapport "Afgerond gisteren" linkt ernaar). Tekst uit `waTekst('review')` in src/lib/waLink.js; de link is de Google-reviewlink uit src/data/reviews.js.
- NL: "Hoi Sanne, je bestelling VIS-AB12-C3D is afgerond. Wil je in een paar zinnen op Google zetten hoe het ging? Een eerlijke review helpt ons het meest: https://g.page/r/CfzOkJ97zZCKEBM/review VISUAILS"
- EN: "Hi Sanne, your order VIS-AB12-C3D is complete. Would you put a few sentences on Google about how it went? An honest review helps us most: https://g.page/r/CfzOkJ97zZCKEBM/review VISUAILS"

### 5.03 · Kleurtrouw

**Plek:** formulier stap 2, het (bestaande) kleurveld per product — label (`name`), plaatshouder en de uitleg "Wat dit oplevert" (`buys`) in src/data/attributes.js
- Label NL: "Kleur, zoals in je webshop" (was: "De exacte kleur, als je die weet")
- Label EN: "Colour, as in your webshop" (was: "Its exact colour, if you know it")
- Plaatshouder NL: "bosgroen, #1B3A2F" · EN: "forest green, #1B3A2F"
- Uitleg NL: "Een telefoonfoto neemt de kamer mee — een warme lamp of een koud raam trekt de kleur scheef. Noem de kleur zoals in je webshop, met de kleurcode als je die hebt (Pantone of hex). Wijkt je foto af van je product, dan houden we deze kleur aan."
- Uitleg EN: "A phone photograph carries the room with it — a warm bulb or a cold window pulls the colour off. Name the colour as in your webshop, with the colour code if you have one (Pantone or hex). If your photo differs from your product, we go by this colour."

**Plek:** het revisiebeleid, punt "Is het onze fout, dan lossen we het op" (`REVISIEBELEID` in src/data/pricing.js) — /terms §10, /faq en Studio
- NL: "Verkeerd product, een kleur die afwijkt van de kleur die je opgaf (of van je foto’s, als je geen kleur opgaf), iets mis in de afwerking — als het aan onze kant ligt, maken we het kosteloos goed. Ook na die ene ronde."
- EN: "Wrong product, a colour that differs from the colour you gave us (or from your photos, if you gave none), something off in the finishing — if it is on our side we put it right at no cost, even after the included round."

**Plek:** /faq, de revisievraag bij catalog en bij lifestyle (src/data/faq.js, NL en EN, elk twee keer)
- NL: "… Alles wat niet overeenkomt met je product — een kleur die afwijkt van de kleur die je opgaf (of van je foto’s, als je geen kleur opgaf), print, pasvorm — is waar die ronde voor is. …" (was: "Alles wat niet overeenkomt met je eigen foto’s — kleur, print, pasvorm — …")
- EN: "… Anything that does not match your product — a colour that differs from the colour you gave us (or from your photos, if you gave none), print, fit — is what that round is for. …"

---

## Teksten D4 · ronde A4 (4.05 en 4.08)

### Klantteksten (NL en EN), om na te kijken

### 4.08 · Drie vaste redenen voor "Geen nieuw beeld nodig" (V37 = a) · CONCEPT

Plek: `src/data/revisieRedenen.js` (één databestand; vervangen = alleen dit bestand aanpassen).
Lucas kiest ze met één klik op een revisiekaart in /admin. De tekst komt in het redenveld en kan daar nog aangepast worden.
De klant leest hem in de mail "Antwoord op je revisie" / "An answer to your revision" (onder "Dit is ons antwoord:") en op zijn tijdlijn.
Er gaat alleen de taal van de klant mee: NL bij een Nederlandse bestelling, EN bij een Engelse.

1. Knop in /admin: **Kleur en details kloppen**
   - NL: We hebben het beeld naast je eigen foto’s en de kleur die je opgaf gelegd. Kleur en details komen overeen, daarom blijft dit beeld zoals het is.
   - EN: We compared the image with your own photos and the colour you gave us. The colour and details match, so this image stays as it is.

2. Knop in /admin: **Hoort bij het product**
   - NL: Wat je aanmerkt, zit ook op het product zelf: we zien het terug op je eigen foto’s. We laten het staan, zodat het beeld laat zien wat je klant ontvangt.
   - EN: What you flagged is part of the product itself: it shows on your own photos too. We are keeping it, so the image shows what your customer receives.

3. Knop in /admin: **Andere keuze dan besteld**
   - NL: Het beeld volgt de keuzes van deze bestelling: de look, de achtergrond en de verhouding. Wil je een andere keuze, dan is dat een nieuw beeld en geen revisie; dat maken we graag in een nieuwe bestelling.
   - EN: The image follows the choices in this order: the look, the background and the ratio. A different choice means a new image rather than a revision; we are happy to make it in a new order.

Let op bij reden 3: REVISIEBELEID (/terms) zegt dat we in de ene revisieronde "je aanpassingen" verwerken, niet alleen fouten. Reden 3 zegt dat een andere look, achtergrond of verhouding een nieuwe bestelling is. Klopt dat met hoe je het wilt, of moet die aanpassing binnen de ronde vallen? Pas anders de tekst aan of vervang de reden.

### Alleen /admin en het nachtrapport (alleen NL, ter info)

- Dashboard, bovenaan: kop **Nu doen**. Leeg: "**Niets wacht op jou.** Nieuwe bestellingen komen hier vanzelf bij." Lukt het lezen niet: "De lijst kon niet gelezen worden (…). Kijk zolang in de bestellingen hieronder."
- Soorten en knoppen, in deze volgorde: Btw-controle → Beoordelen · Klaar om te leveren → Leverkeuring · Revisie afgehandeld / Nieuwe beelden → "N nieuwe beelden melden" · Revisie → Revisie openen · Betaald, niet opgepakt → Oppakken · Foto’s ontbreken → Foto’s vragen · Aanvraag zonder offerte → Offerte maken · Afgerond → Review vragen.
- Na melden vanaf het dashboard: "VIS-…: gemeld aan de klant — N beelden."
- Bestelpagina, onder de referentie: "**Volgende stap:** Oppakken — betaald, niet opgepakt, betaald gisteren." Als er niets in de lijst staat, bijvoorbeeld: "Volgende stap: niets, de bestelling wacht op betaling." / "… is afgerond." / "… de klant beoordeelt de beelden."
- Revisiekaart, boven het redenveld: "Deze klant leest Engels — schrijf je reden in het Engels." (of Nederlands). Daaronder "Vaste reden:" met de drie knoppen.
- Afgehandelde revisiekaart: "revisieronde afgehandeld, nog niet gemeld", per beeld "nieuw beeld geüpload" of "geen nieuw beeld nodig: “…”", de knop "N nieuwe beelden melden", en "Eén mail voor alles wat nog niet gemeld is; daarna is deze kaart weg."
- Onderwerp van het nachtrapport: "Vandaag · vr 9 okt — 3 wachten op jou", "Vandaag · vr 9 okt — niets open", met "er ging iets mis · " ervoor als er een taak misging. Eerste regel: "NU DOEN — 3 dingen, in deze volgorde (dezelfde lijst staat bovenaan https://visuails.com/admin):". Slotregel: "Het komt elke nacht, ook als er niets open staat. Komt het een ochtend niet, dan draaide de nacht niet: /admin zegt het dan bij de bewakers."

---

## Klantteksten K4 (ronde A4: 4.02, 4.07, 4.01)

Geen nieuwe of gewijzigde klanttekst.

Alles wat K4 schreef staat op plekken die alleen Lucas leest, in het Nederlands:
- /admin: de knop "De werkmap — met N foto's van de klant (X MB)" en "zonder foto's",
  de weigering "Deze map hoort bij VIS-…, niet bij deze bestelling (VIS-…). Er is niets geüpload.",
  "ongewijzigd", de chips "AI-tag" / "geen AI-tag" / "png", en de blokken "Geen jpg" en
  "Geen herkomsttag" na een upload (src/lib/admin.js).
- De werkmap: LEESMIJ.txt en _briefing.txt (src/lib/scaffold.js).
- tools/photoshop/LEESMIJ.txt en de meldingen van 01-catalog-afwerken.jsx.

De LEESMIJ.txt en LICENTIE.txt in de downloadmap van de klant (src/lib/delivery.js) zijn
niet veranderd.
