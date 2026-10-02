# Ronde 8 — de hele site doorgelopen, als klant en als studio

Werklijst. Elk punt heeft een code, zodat ik achteraf per punt kan controleren of het is toegepast.
Bron per punt: **A** = admin-doorlichting, **B** = bestellen/abonnementen, **S** = Studio, **M** = mails/portaal, **C** = concept, **W** = zelf gezien in de browser, **L** = layoutmeting.
Volledige onderbouwing met regelnummers: `kladblok/audit-ronde-8/*.md`.

Status: `[ ]` open · `[x]` gedaan en gecontroleerd · `[~]` bewust niet / optie voor Lucas

---

## 1 · DIRECT — geld, verkeerde documenten, doodlopende wegen

### Geld
- [x] 1.1 (A-K1) Annuleren idempotent: weigeren als al geannuleerd + `WHERE status <> 'cancelled'` met `meta.changes`. Geen dubbel tegoed, geen dubbele mail.
- [x] 1.2 (A-K2) Geannuleerde bestelling niet via het statuslijstje heropenen (server weigert, lijstje verborgen).
- [x] 1.3 (A-K7, S-K1) Geannuleerd = niet meer betaalbaar: `paymentView`, `handleOrderPay`, `/api/order-pay`, `stuurBetaallink`. Webhook: betaling op geannuleerde bestelling → niet op "betaald", wel vastleggen + studio melden. Dashboardbewaker "betaald maar geannuleerd".
- [x] 1.4 (B-K1) Tegoed niet dubbel uit te geven: bij order-pay en in de webhook het tegoed opnieuw toetsen; reservering geldt zolang de bestelling onbetaald en niet geannuleerd is.
- [x] 1.5 (B-K2) Volledig met tegoed + beoordeling: na akkoord `betaalVolledigMetTegoed`; cron annuleert alleen als er echt iets te betalen is.
- [x] 1.6 (B-K3, M-K1, M-B5) Dubbele betaling: loggen + studiomail; `order-pay` hergebruikt een open Mollie-betaling; "betaling niet gelukt" niet als er al betaald is.
- [x] 1.7 (B-B7) Late incasso zet een opgezegd abonnement niet terug op actief; studio melden.
- [x] 1.8 (A-K8) Restant na aanbetaling: knop "Restant vragen" (vervolgbestelling met eigen betaallink).
- [x] 1.9 (B-B10, S-K4) Verlopen reservering: niet meer "je plek staat vast tot …" in het verleden; eerlijke zin + contactknop; cron geeft alleen onbetaalde vensters vrij.
- [x] 1.10 (B-B14) Onbetaalde bestellingen vervallen na 14 dagen (mail + tegoed terug), net als bij een btw-akkoord.

### Verkeerde documenten / knoppen die niets doen
- [x] 1.11 (S-K2) Abonnementsfactuur-pdf: eigen route, juiste link. Nooit meer andermans factuur.
- [x] 1.12 (S-K3) Abonnement › foto's toevoegen / gezicht wijzigen: knop altijd zichtbaar (CSP blokkeerde de onchange).
- [x] 1.13 (A-K3, W) Uploaden ≠ zichtbaar: de klant ziet een leveringsbeeld pas na melden. Bord en uploadpagina zeggen hetzelfde.
- [x] 1.14 (A-K4) Afronden vanuit admin: `maybeCloseOrder` na geleverd zetten, indelen, uploaden en melden.
- [x] 1.15 (A-K5) Afgewezen btw: tweede blok op /admin/vat, opnieuw beslissen kan; klant krijgt een mail.
- [x] 1.16 (A-K6) Annuleerblok ook op de bestelpagina.
- [x] 1.17 (M-K3) Nieuwe portaallink na 90 dagen werkt: eigen geldigheid voor met de hand uitgegeven links.
- [x] 1.18 (M-B1) Revisieronde uit het portaal → juiste studiomelding (`notifyRevisionRound`).
- [x] 1.19 (S-B18) Portaal: goedkeuren/terugdraaien alleen op levende beelden.
- [x] 1.20 (S-B14) GET /account/code → terug naar inloggen in plaats van een witte 405.

### Klantgegevens / verklaringen
- [x] 1.21 (B-B1) Btw-vorm controleren vóór het opslaan van klantgegevens (bestellen én abonnement).
- [x] 1.22 (B-B2) Niet-ingelogd formulier mag bestaande klantgegevens alleen aanvullen, niet overschrijven.
- [x] 1.23 (B-B3) Ingelogd abonnement afsluiten vraagt dezelfde verklaringen als /api/plan.
- [x] 1.24 (B-B9) Terugkerende EU-klant: btw-vinkje zichtbaar ook als stap 3 is ingeklapt.
- [x] 1.25 (B-N5) Voorrang opslaan zoals gerekend, niet zoals gepost.

---

## 2 · DIRECT — Studio (klantomgeving)

- [x] 2.1 (S-B3, W) Notitieveld pas na het vinkje; een notitie zonder vinkje telt als aangevinkt.
- [x] 2.2 (S-B4) Na goedkeuren terug naar dezelfde bestelling en hetzelfde product (open).
- [x] 2.3 (S-B1) "Intrekken" van een aanmerking: ook de revisieaanvraag sluiten en de studio melden.
- [x] 2.4 (S-B2) Ingetrokken revisierechten: uitleg tonen.
- [x] 2.5 (S-B5) "Download de map" alleen met levende beelden; anders de verloopdatum.
- [x] 2.6 (S-B6, A-B10) Tijdlijnregels in de taal van de bestelling; interne aanwijzing nooit zichtbaar voor de klant.
- [x] 2.7 (S-B7) Terugbetaald ziet er niet uit als openstaand.
- [x] 2.8 (S-B8) Abonnement: alle `ok=`/`fout=`-codes hebben een zin; "dag vol" ≠ "lijst vol".
- [x] 2.9 (S-B9) Opzeggen met een verkeerd woord → melding op hetzelfde tabblad.
- [x] 2.10 (S-B10) Pending abonnement: geen pauzeknop; server weigert.
- [x] 2.11 (S-B11) "Laatst geleverd" op Abonnement: nieuwste eerst, zonder verlopen beelden.
- [x] 2.12 (S-B12, C-17) Abonnee met credits: primaire knop "Product toevoegen"; "Los bestellen" → /start.
- [x] 2.13 (S-B13) Na inloggen terug naar waar je heen wilde (`terug=` met allowlist).
- [x] 2.14 (S-B15) Je gegevens: invoer blijft staan bij een btw-fout; label zegt dat je moet kiezen.
- [x] 2.15 (S-B16) Goedkeuren valt niet onder de krappe 20/min; 429 is een nette pagina.
- [x] 2.16 (S-B17) Vaste knop "Vraag een specialist" (WhatsApp met ordernummer + mail) per bestelling.
- [x] 2.17 (S-B19) Eén weergavestatus overal ("Wacht op betaling"); tegels "Te betalen" en "Te beoordelen".
- [x] 2.18 (S-B20) Revisieronde Studio = portaal (alleen `pending`), en een melding als het niet lukt.
- [x] 2.19 (S-B23) Afgeronde bestelling zonder feedback klapt alleen de eerste 14 dagen open.
- [x] 2.20 (W) "De foto's hierboven zijn voorbeeldweergaven" → klopt met de plek ("hieronder").
- [x] 2.21 (W) Begroeting met voornaam ("Welkom, Sanne" i.p.v. "Welkom, Keten Studio").
- [x] 2.22 (W) "Normale doorlooptijd …" niet meer na levering.
- [x] 2.23 (W) Ontvangstbevestiging na een revisieronde (mail + zin in Studio).
- [x] 2.24 (W) Bevestigingspagina van de revisieronde in de Studio-huisstijl (was een smalle kaart).
- [x] 2.25 (S-N3) Lege staat Facturen omgedraaid.
- [x] 2.26 (S-N4) "Beelden in je bibliotheek" telt alleen levende leveringen.
- [x] 2.27 (S-N5) "Kies zo snel mogelijk" verwijst naar de bestaande knop.
- [x] 2.28 (S-N6) Taal/thema/zijbalk behouden de huidige weergave.
- [x] 2.29 (S-N7) "Alles goedkeuren" zegt dat de bestelling daarmee afgerond wordt.
- [x] 2.30 (S-N9) Verwijderen uit de abonnementslijst vraagt bevestiging.
- [x] 2.31 (S-N10) "3 prod." → "3 producten"; "#2 · Voorkant" dubbel; tijdlijnlabel revisieronde.
- [x] 2.32 (S-N14) Gepauzeerd abonnement: bovenaan "Gepauzeerd — hervat om te bestellen".
- [x] 2.33 (S-N16) Geannuleerd-maar-behouden: geen product-goedkeur/revisieknoppen.
- [x] 2.34 (W) "Wat jij stuurde": achterkant-miniatuur leeg — oorzaak zoeken. Geen fout: alle zes miniaturen laden (1600×2000); de lege tegel was een lui geladen beeld in een schermafdruk die niet scrolde.

---

## 3 · DIRECT — admin

- [x] 3.1 (W) Per-vak upload zonder tussenscherm ("1 bestand opgeslagen / Verder naar de bestanden"): terug naar het vak met een melding.
- [x] 3.2 (A-B1) "Geleverd zetten" alleen met ≥ 1 beeld; waarschuwing bij onbetaald.
- [x] 3.3 (A-B2, M-N12) Leveringsmail telt alleen levende beelden.
- [x] 3.4 (A-B3) Bestelpagina: kopregel met betaalstatus, bedrag, klantlink en het statusformulier.
- [x] 3.5 (A-B4) Tijdlijn ingeklapt op de bestelpagina (intern gemarkeerd).
- [x] 3.6 (A-B5) "Betaallink opnieuw mailen".
- [x] 3.7 (A-B6, W) Planning, "Eerst af" en tellers zonder onbetaalde checkouts en aanvragen; "0 clips × Video" weg.
- [x] 3.8 (A-B7) Dashboardblok "Abonnementen klaar om te starten".
- [x] 3.9 (A-B9) Engels op het adminscherm → Nederlands.
- [x] 3.10 (A-B11, M-B8) Inloglink in de taal van de klant.
- [x] 3.11 (A-B12) "Geen nieuw beeld nodig": fout tonen, klant krijgt een korte mail.
- [x] 3.12 (A-B13, W) Revisieteller = revisielijst (vervangen niet meetellen); "REVISIES 1" niet dubbel.
- [x] 3.13 (A-B15) `.muted`, `.hint`, `.req` krijgen opmaak.
- [x] 3.14 (A-B16) Administratieblok gaat open bij een btw-aandachtspunt.
- [x] 3.15 (A-B17) Logboek labelt een geslaagde terugboeking niet als "deels".
- [x] 3.16 (A-N1) Creditzin uit `SERVICE_CREDITS`; standaard "4" weg.
- [x] 3.17 (A-N2) `country` in de SELECT van de klantpagina.
- [x] 3.18 (A-N5) "Vandaag" in Nederlandse tijd.
- [x] 3.19 (A-N6) Geen link naar `/admin/customers/null`.
- [x] 3.20 (A-N9) Tevredenheidsscore zichtbaar op de bestelpagina.
- [x] 3.21 (A-N10) Aparte knop "Leveringsmail opnieuw proberen".
- [x] 3.22 (A-B8) Facturenlijst per kwartaal met CSV (voor de aangifte).

---

## 4 · DIRECT — mails

- [x] 4.1 (M-B2) Herleveringsmail belooft geen tweede revisie.
- [x] 4.2 (W, M-C2) Levermail: voornaam in de begroeting, revisietermijn met datum, "één ronde".
- [x] 4.3 (M-B3) Proefvisual: eigen tekst in bevestiging en levermail (geen revisiebelofte, wel een vervolgstap).
- [x] 4.4 (M-K2) Mislukte incasso / stilgezet abonnement: klant krijgt een mail.
- [x] 4.5 (M-B4) `replyTo` per mail; studiomails over één klant → antwoord gaat naar de klant.
- [x] 4.6 (M-B6, M-B11) Betaalbevestiging ook zonder factuur; studiomail zegt niet dat de factuur al weg is.
- [x] 4.7 (M-B7) Nieuw e-mailadres werkt door naar lopende bestellingen.
- [x] 4.8 (M-B9) Mislukte levermail valt op (rode regel + nachtrapport).
- [x] 4.9 (M-B10) Bevestiging zonder betaallink legt uit dat de link volgt.
- [x] 4.10 (M-C1) Betaalmail met "Wat nu" (levertijd + link naar de bestelling).
- [x] 4.11 (M-C5) Afgewezen btw → mail aan de klant.
- [x] 4.12 (M-C6) Bevestiging noemt de betaaltermijn bij een gereserveerde datum.
- [x] 4.13 (M-C9) Contactformulier: ontvangstbevestiging aan de bezoeker.
- [x] 4.14 (M-N1) Spamregel → "voeg ons toe aan je contacten".
- [x] 4.15 (M-N2) Platte tekst zonder preheader/briefhoofd-ruis.
- [x] 4.16 (M-N5) Inlogknop in de welkomstmail langer geldig.
- [x] 4.17 (M-N11) Geen betaalherinnering voor een oude, onbetaalde proef.
- [x] 4.18 (M-N12) "blijven N dagen staan" klopt; demo.js-zin over buiten de EU.

---

## 5 · DIRECT — concept: Catalog + Lifestyle eruit, video erbij, één waarheid

- [x] 5.1 (C-1A-4) Meta-descriptions zonder €149 (home, prijzen, FAQ, NL+EN).
- [x] 5.2 (C-1A-1) `complete` uit `DOORS` ("Ook mogelijk: … Catalog + Lifestyle" weg op 18 pagina's).
- [x] 5.3 (C-1A-2/3) Prijstabel: kolom Catalog + Lifestyle en "met lifestyle erbij" weg.
- [x] 5.4 (C-1A-6..10) FAQ-teksten en FAQ-schema.
- [x] 5.5 (C-1A-11, Lucas) Galerij: filter "Catalog + lifestyle" weg; video-diensten erbij.
- [x] 5.6 (C-1A-12) "210 afgewerkte beelden" → 120.
- [x] 5.7 (C-1A-13) Combi-upsell uit het catalogformulier.
- [x] 5.8 (C-1A-14) /start/complete: noindex, uit sitemap en llms.txt (route blijft voor oude links en bestellingen).
- [x] 5.9 (C-1A-15/16) JSON-LD en llms.txt opgeschoond (geen complete, video "op aanvraag", credits i.p.v. "5 complete products").
- [x] 5.10 (C-1A-5, 1D) /compare ankert op 30 catalogsets.
- [x] 5.11 (C-T2) Video overal "op aanvraag" (menu, home, video-pagina, prijzen).
- [x] 5.12 (C-T3) Hooks: geen "10 credits" zolang ze niet te bestellen zijn — of wel te bestellen voor abonnees (nagaan).
- [x] 5.13 (C-T4) "3 foto's verplicht, 1 optioneel" overal.
- [x] 5.14 (C-T5) Beeldverhouding: één waarheid (één per catalogbestelling, per beeld bij lifestyle).
- [x] 5.15 (C-T6) Abonnement "vanaf" overal gelijk.
- [x] 5.16 (C-T7, 5.2) Levertijd in een getal op home en dienstpagina's.
- [x] 5.17 (C-T8) Editions-hero zonder "Zo snel mogelijk".
- [x] 5.18 (C-T12/13) Eén naam voor de klantomgeving (VISUAILS Studio) in klantteksten.
- [x] 5.19 (C-3) Jargon: Tevredenheidscheck, staffel, setje, IPTC/hash-blok, hexcodes.
- [~] 5.20 (C-T14) "Campaign" in de lifestylerij / "Beam" in de galerij. — "Campaign" uit de lifestylerij gehaald; de naam "Beam" in de galerij blijft (eerdere keuze, tests/galerij bewaakt hem) → voor Lucas.
- [x] 5.21 (C-6) "Wat als ze niet goed zijn?" geeft het antwoord.
- [x] 5.22 (C-guides) "vóór je shoot" op /guides.
- [x] 5.23 (C-thank-you) Dubbele upsellzin nagaan.
- [x] 5.24 (C-404) "waar de staffel zakt".

---

## 6 · DIRECT — layout en rust (elke sectie)

- [x] 6.1 (Lucas, L) Voorpagina "Wat je stuurt. Wat je terugkrijgt.": kop over de volle breedte, invoer en uitkomst op één hoogte, geen gat.
- [x] 6.2 (Lucas) Achtergronden weg: stralen in de hero van de voorpagina (lifestyle/video waren al leeg — nagaan).
- [x] 6.3 (L) /catalog hero: tekst 941 px tegen beeld 508 px → in balans.
- [x] 6.4 (L) /portal pp-open en pp-twee: tekstkolom meeschuiven (sticky) of beeld kleiner.
- [x] 6.5 (L) /studio sp-twee-licht: idem.
- [x] 6.6 (L) Lifestyle-stijlpagina's ls-twee en ls/cs-bewijs: kolommen in balans.
- [x] 6.7 (C-5.1, 21) Voorpagina: één blok "Zo werkt het" met tijden; dubbele dienstkaarten weg; hero max. 2 knoppen.
- [x] 6.8 Na de wijzigingen: gatenmeting opnieuw op 1280 en 390 px, alle stijlpagina's.

---

## 7 · OPTIONEEL — voor Lucas om te beslissen (niet uitgevoerd tenzij klein en duidelijk)

- [~] 7.1 Menu inkorten: /studio, /guides, /per-product uit het menu; /models + /custom-models samen.
- [~] 7.2 Editions en Hooks: één "Binnenkort"-pagina, FAQ-groepen eruit.
- [~] 7.3 FAQ van 70 naar ~20 vragen.
- [~] 7.4 /start: twee hoofddeuren + twee tekstregels.
- [~] 7.5 Voorrang als garantie formuleren.
- [~] 7.6 €1-formulier inkorten (standaardkeuzes, uitleg ingeklapt).
- [~] 7.7 Bureau-blok.
- [~] 7.8 Automatisch afronden na de revisietermijn + reviewmail (M-C3).
- [~] 7.9 SEPA-vooraankondiging (M-C8) — nagaan met Mollie.
- [~] 7.10 Jaartermijn als echte verbintenis (B-B8).
- [~] 7.11 Credits terug naar de maand waar ze vandaan kwamen (B-B4), saldo-venster (B-B5), termijnmaand (B-B6), incassodag na hervatten (B-B17).
- [~] 7.12 Capaciteit telt extra hoeken (B-B13), voorrang vs. datum (B-B12), voorrang zonder foto's (B-B15).
- [~] 7.13 "Wacht op klant"-status en foto's van de klant toevoegen in admin (A-B14).
- [~] 7.14 Eén beeld downloaden (S-B22), "bestel opnieuw" (S-N1), thumbnails (S-N12).
- [~] 7.15 Studiobrief dubbele opt-in (M-N10).
- [~] 7.16 Testimonials zodra er echte zijn.

---

## 8 · Browser — wat nog doorlopen moet worden (na de reparaties, als controle)

- [x] Catalog, 2 producten, mobiel → betalen → admin per vak → geleverd → Studio → goedkeuren → revisieronde.
- [x] Revisie afhandelen in admin (vervangen + melden) → portaal → rest goedkeuren → afgerond → 5 sterren. Gevonden en gerepareerd: de tevredenheidsscore stond nooit op de adminbestelpagina (query vroeg `created_at`, de tabel heeft `updated_at`); herleveringsmail zei "Bekijk ze" bij één beeld.
- [x] Lifestyle (desktop, NL) met 4K: 3 × €109 + 4K = €354 excl. btw, betaald, mails kloppen.
- [x] Proefvisual €1 (mobiel, starter): bestellen, betalen, leveren. Tweede proef met hetzelfde telefoonnummer → terecht geweigerd. Gerepareerd: levermail zei "proefbeeld" (het zijn er 3 of 4) en noemde altijd het catalogtarief.
- [x] Video-aanvraag, eigen look, merkmodel (5 stappen, mobiel, direct betaald €450), offerte €375 → betaallink → betaald.
- [x] Abonnement: afsluiten, look vastleggen, product met foto's vastzetten, week starten (admin), leveren, maand 2 incasso, mislukte incasso (klant + studio gemaild), pauzeren, hervatten, opzeggen (verkeerd woord → melding), factuur-pdf's, /admin/facturen + CSV. Gerepareerd: studiomail zei "de klant merkt hier niets van" terwijl de klant nu wél een mail krijgt.
- [x] Contactformulier (studio + ontvangstbevestiging), Studiobrief (bevestiging + studiomelding), WhatsApp-links (445, allemaal hetzelfde nummer).
- [x] Annuleren (dubbel → "al geannuleerd", geen tweede mail), heropenen geweigerd. Gerepareerd: na annuleren landde admin op het dashboard zonder bevestiging (nu terug op de bestelling met "Geannuleerd, klant gemaild"); de oude betaallink na annuleren toonde "Bedankt — we gaan aan de slag" (nu "Deze bestelling is geannuleerd" + contact).
- [x] Engelstalige klant (GB): mails, tijdlijn en portaal in het Engels, btw buiten de EU.


---

## 9 · Uitkomst van de controle (1 oktober 2026, avond)

- Volledige testreeks na de laatste build: alles groen (alleen "KLAAR").
- Gatenmeting 1280 px: geen gaten meer op de voorpagina; resterende "kolommen" zijn bewust (stijlpagina-vergelijker gecentreerd, bestelformulier met meelopende samenvatting). 390 px: niets gevonden.
- Gerepareerd tijdens de browserrondes (naast de werklijst): tevredenheidsscore in admin, annuleren → terug naar de bestelling met bevestiging, oude betaallink na annulering, enkelvoud in de herleveringsmail, proefmail (aantal en tarief), studiomail bij mislukte incasso.
