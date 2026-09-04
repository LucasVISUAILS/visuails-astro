# Back-end, VISUAILS Studio en /admin — doorlichting

*3 september 2026 · derde onderzoek, apart van "Fable en VISUAILS" (1) en "Bestellen bij VISUAILS" (2).*

Wat je vroeg: de back-end écht gebruiken van bestelling tot factuur, kijken of alles goed overkomt van Studio naar /admin, fouten en gaten vinden, beoordelen of het stabiel genoeg is om te lanceren, en Studio, /admin en de site nog eens als verschillende mensen doorlopen.

## Hoe ik het heb gedaan

Niet met stubs van je eigen code. `kladblok/keten-doorloop.mjs` draait de echte routes — `functions/api/*`, `account.js`, `portal.js`, `admin.js`, `cron/index.js` — op het echte `schema.sql` in SQLite, met een R2-emmer die onthoudt en een nep-Mollie, nep-Resend en nep-VIES die elke aanroep bewaren. Vijftien stappen, drie klanten, 41 schermafdrukken en 16 mails; het logboek staat in `kladblok/keten/LOGBOEK.md`. Daarnaast: de publieke site uit de build op 1440 en 390 px (`kladblok/site-afdrukken.mjs`), en de code van de webhook, de cron en de secrets nagelezen op wat er gebeurt als iets uitvalt.

De keten die is doorlopen: foto's uploaden → bestelling (3 producten, wachtrij) → inloggen in Studio via de mail → betalen via Mollie-webhook → factuur → in productie → 12 beelden leveren → aankondigen → goedkeuren en één revisie aanvragen → vervangen en aankondigen → portaallink uit de mail → afronden → tevredenheidsscore, aanbeveling en Google-klik → aanbeveling goedkeuren in /admin → tweede klant (Duitsland, btw-nummer, 12 producten met leverdatum) → VIES → betalen → verzetten vanuit de planning → derde klant die niet betaalt → cron laat het venster los → annuleren met terugbetaling → refund-webhook → creditnota → gegevens, vaste look, e-mailwijziging, eigen model → alle zeven cron-taken.

## 1 · Wat goed werkt

Het hart klopt. Elke stap kwam aan waar hij hoort, in beide talen, met de juiste mail: aanvraag ontvangen, betaling ontvangen, bestelling staat klaar, revisie staat klaar, "your order has been checked" na het btw-besluit, en de studio kreeg bij elke gebeurtenis zijn eigen melding. Productnamen uit stap 2 komen in Studio en in /admin terug (de fix van vanochtend), de zip-download werkt, de factuur krijgt een doorlopend nummer en een tweede aanroep hernummert niet, de creditnota komt vanzelf zodra Mollie de terugbetaling bevestigt, en een dubbel afgeleverde webhook wordt herkend en overgeslagen.

Wat me opviel als sterk: de webhook gelooft de body niet maar haalt de betaling bij Mollie op; een betaling met iDEAL onder een 0%-btw-claim wordt gesignaleerd; een bestelling wordt opgeslagen ook als Mollie onbereikbaar is (de betaalknop in Studio maakt dan later een nieuwe betaling); mails die mislukken breken nooit een bestelling; het portaal heeft één levende link per bestelling; /admin heeft een tweede factor en een rate-limiter; de opruimtaak van de cron verwijdert niets zolang `PURGE_ENABLED` niet expliciet aan staat.

## 2 · Wat niet klopte — vandaag gerepareerd

**Na een revisie zei Studio "we zijn ermee bezig" terwijl het beeld al klaarstond.** De klant kreeg de mail "Je revisie staat klaar", opende Studio en las dat we er nog mee bezig waren; het nieuwe beeld was niet te onderscheiden van de andere drie en droeg zijn eigen opmerking niet. Nu: het blok zegt "Je revisie staat klaar", het vervangende beeld draagt een groene markering NIEUW en eronder staat "Opnieuw gemaakt na je opmerking: …". (`account.js`: het antwoord hing aan het oude, onzichtbare beeld.)

**De beelden stonden in alfabetische volgorde**: achterkant, detail, voorkant, gedragen. Nu voor, achter, detail, gedragen — de volgorde van de aanlevering.

**"Wordt per bestelling gevraagd · Wordt per bestelling gevraagd · Wordt per bestelling gevraagd"** op de dichte catalogkaart van Je vaste look bij een klant zonder voorkeuren. Eén zin nu.

**Het portaal zei "voeren.. Stuur"** — dubbele punt uit een samengestelde zin. Weg.

**/admin/customers/<id> toonde bij lifestyle "—"** terwijl de klant Glow had vastgezet; de tabel kende alleen gezicht en achtergrond. Nu ook look, verhouding en kanalen — het scherm dat je opent vóór je begint te produceren.

**De diagnosepagina kende vijf secrets en zweeg over de rest.** Bij de doorloop bleek dat een factuur zonder `VISUAILS_VAT`/`VISUAILS_KVK` stil met plaatshoudergegevens de deur uitgaat en dat VIES zonder eigen btw-nummer geen bewijsnummer oplevert. /admin/diagnose toont nu alles wat de code uit de omgeving leest, met per lege waarde wat het gevolg is.

**Op een telefoon lag de cookiebalk over de twee knoppen van de hero.** De eerste twee knoppen van de site waren onzichtbaar tot je de cookies had beantwoord. Zolang de balk staat, schuift de hero-tekst er nu bovenuit.

**"Proefvisual" stond nog op 65 plekken in de build**: de voettekst, de knoppen op /about, /contact, /gallery, de dienstpagina's, de FAQ, de breadcrumb, de Mollie-omschrijving, Studio en het portaal. Vanochtend waren alleen de hoofdknoppen hernoemd. Alles wat een klant leest zegt nu "Probeer VISUAILS" (of "de proef" in een lopende zin); alleen de algemene voorwaarden noemen het nog "proefvisual", dat is jouw juridische tekst.

**Kleiner:** twee keer "een mens" → "een specialist", de bovenbalk ook op de klantpagina van /admin.

## 3 · Wat er ontbreekt

Per punt: wat ik zag, wat het de klant of jou kost, en wat ik voorstel. Op volgorde van wat het meest oplevert.

### 3.1 Wie niet betaalt hoort niets, en zijn datum verdwijnt in stilte
Klant C bestelde met een leverdatum en betaalde niet. Na de termijn liet de cron het venster netjes los — en stuurde niemand iets. Er is ook geen herinnering vóór het verloopt: de zeven cron-taken zijn `releaseExpiredWindows`, `purgeExpiredFiles`, `sweepAbandonedIntake`, `issuePendingInvoices`, `checkPlanQueues`, `weekTeStarten`, `checkBackupAge`. Een klant die de betaalmail heeft gemist, denkt dat zijn datum staat.
**Voorstel.** Twee mails in de cron: een herinnering twee dagen voor de termijn ("je datum staat nog tot …, betaal via deze link") en een bericht als het venster is losgelaten ("je bestelling staat er nog, zonder datum; kies een nieuwe of betaal en wij plannen hem in"). Beide sjablonen bestaan grotendeels al in `notify.js`/`mailTemplate.js`. Een halve dag.
**Wat het oplevert.** Dit is vermoedelijk de grootste stille omzetlek zodra er verkeer is.

### 3.2 Annuleren en terugbetalen: de klant hoort het alleen als hij Studio opent
Bij annuleren met terugbetaling gaat de restitutie naar Mollie en komt de creditnota vanzelf — maar er gaat geen mail naar de klant, niet bij het annuleren en niet bij de creditnota. In Studio staat het wel, met jouw reden.
**Voorstel.** Eén mail bij annuleren (reden + wat er met het geld gebeurt) en de creditnota als bijlage zodra hij er is, net als de factuur.

### 3.3 Boven de 20 producten stuurt de site naar WhatsApp — en dan kan /admin niets
De nieuwe route van vanochtend eindigt bij jou in WhatsApp. Daarna moet er een bestelling ontstaan, met een betaallink en een plek in de agenda, en dat kan /admin niet: er is geen "bestelling aanmaken namens een klant". Je zou de klant terug moeten sturen naar het formulier dat hem net heeft weggestuurd.
**Voorstel.** Een formulier op /admin (klant kiezen of aanmaken, dienst, aantal, prijs uit de staffel of een eigen bedrag, leverdatum uit de agenda) dat dezelfde route gebruikt als het publieke formulier: bestelling + betaallink per mail + Studio-toegang. Dit is het grootste gat tussen wat de site belooft en wat /admin kan.

### 3.4 Elke mail maakt de vorige link dood
Bij elke aankondiging wordt een nieuwe portaallink uitgegeven en de vorige ingetrokken. De klant die de eerste mail ("je bestelling staat klaar") twee dagen later opent, ziet "deze link is vervangen, kijk in de nieuwste mail". Bovendien zijn het twee ervaringen voor dezelfde bestelling: het portaal uit de mail is een kale bestandenlijst met goedkeurknoppen, Studio heeft productkaarten, de revisieronde en de map.
**Voorstel.** Laat de link uit de mail direct in Studio landen (een token dat een sessie opent en naar de bestelling springt) en houd één scherm. Tot die tijd: intrekken pas bij afronding, niet bij elke nieuwe mail.

### 3.5 Het KVK-nummer wordt niet onthouden
Een Nederlandse klant zonder btw-nummer vult bij elke bestelling opnieuw zijn KVK-nummer in: het staat in `details_json` van de bestelling, niet op de klant, en "Je gegevens" heeft er geen veld voor. Migratie van één kolom plus het veld op Je gegevens en de voorinvulling in stap 3.

### 3.6 Studio: de beoordeling zelf is zwaar
Vier beelden per product, elk met Goedkeuren, "Deze aanmerken" en een altijd zichtbaar tekstvak — bij twaalf producten 48 tekstvakken. De beoordeelbeelden zijn 132 px breed; je beoordeelt kwaliteit op een postzegel. Voorstel: het tekstvak pas tonen als "Deze aanmerken" is aangevinkt (kan zonder script via `:checked`), één "Alles goed" per product, en een grotere weergave bij klikken (een lightbox of simpelweg een grote tegel). Kleiner: de statuspil "Ontvangen" naast een tijdlijn die "Wacht op betaling" zegt; vier nullen als tellers bij een nieuwe klant; "Recente activiteit" herhaalt "Je laatste bestelling".

### 3.7 /admin: wat je er nog buiten doet
Alles voor de dagelijkse gang zit erin: bestellingen, bestanden, leveren, aankondigen, revisies, planning, agenda, klanten, tegoed, btw-controle, aanbevelingen, log, trechter. Wat je nog buiten /admin doet en of dat erin zou moeten:

- **Mollie-dashboard** — handmatige betaallinks (bijbetalingen), refund-status. Kan blijven; een "nieuwe betaallink voor dit bedrag" in /admin scheelt de helft.
- **Resend** — bounces en niet-aangekomen mail. /admin weet niet dat een mail niet aankwam. Voorstel: de Resend-webhook voor bounces opvangen en per bestelling een rood vlaggetje "mail bounced" tonen.
- **Cloudflare** — secrets, deploy, D1-migraties. Hoort daar; /admin/diagnose zegt nu wél wat er ontbreekt.
- **Back-ups** — `npm run backup` op je eigen machine. De cron waarschuwt als er geen recente back-up is; dat werkte in de doorloop.
- **Prijzen en teksten** — code. Hoort daar, met de testketen erbij.
- **Bestelling namens klant** — zie 3.3. Dit hoort erin.
- **Klantcommunicatie** — WhatsApp en mail zitten buiten; de planning geeft nu de tekst mee, meer is niet nodig.

Kleiner: de revisieronde uit Studio zet `revision_round_count` niet (het portaal wel) — schermen tellen daardoor via een omweg; niet zichtbaar voor de klant, wel slordig.

### 3.8 De site
De hoofdpagina's zijn lang: home 9.500 px, catalog 10.800, lifestyle 11.800, hoe-het-werkt 10.000 op desktop, op een telefoon tot 16.000. Dat is nog steeds "veel tegelijk", ondanks de uitklappers. Op de homepage staat "FOTO VOLGT" in het vertrouwensblok — dat staat zo op live. De kaarten "Wat wij maken" laden hun beeld pas bij scrollen (lazy), wat op een langzame verbinding als lege kaders oogt. Verder: zie de nacontrole van vanochtend (audit, keuring, leesbaarheid en mobiel zijn schoon).

## 4 · Stabiel genoeg om te lanceren?

Ja, voor de eerste klanten — met vijf dingen die je vóór de eerste betaalde bestelling doet, en drie die het sterker maken.

**Vóór de eerste betaalde bestelling**
1. Secrets: `SELLER_ADDRESS`, `VISUAILS_VAT`, `VISUAILS_KVK`, `NOTIFY_EMAIL`, `FROM_EMAIL`, `PORTAL_SALT` (en `INVOICE_BCC` als je een kopie wilt). /admin/diagnose laat zien wat er nog leeg is. Zonder de eerste drie gaat een factuur met voorbeeldgegevens de deur uit.
2. `npm run migrate` (0039) en pushen.
3. Testbestelling VIS-NZDT-1I5 annuleren; daarna één échte proef van €1 met een live Mollie-sleutel — dat pad is nog nooit live gelopen.
4. Back-up: `npm run backup` in de Taakplanner; de cron meldt het als hij ouder is dan de drempel.
5. `GIT_DEPTH=0` in Pages, anders ontbreken de "bijgewerkt op"-datums in productie.

**Sterker maken (zodra het kan)**
- **Fouten zien.** Alles wat misgaat staat nu alleen in `console.error` van de Worker. Zet in Cloudflare een notificatie op fouten van de Pages Functions en de cron, of laat de cron een dagelijkse regel mailen "x fouten sinds gisteren" (hij mailt al een nachtrapport).
- **Bereikbaarheid meten.** Een gratis uptime-check op `/api/order-status?ref=x` (die antwoordt zonder database te schrijven) zodat je het hoort als de site of D1 eruit ligt.
- **Bounces.** Zie 3.7 — de eerste keer dat een klant zegt "ik heb nooit een mail gehad", wil je dat in /admin kunnen zien.

Wat ik bewust níet als risico zie: de webhook is idempotent en geeft 5xx als de database faalt (Mollie probeert dan opnieuw), rate-limiting zit op alle publieke routes, de CSP van Studio en /admin is `default-src 'none'`, de opruimtaak staat uit, en R2-bestanden worden alleen via een pad met sessie geserveerd.

## 5 · Vijf keer Studio als iemand anders

**Mara, 29, VOLT, telefoon.** Bestelt, betaalt, en opent Studio twee dagen later vanuit de mail. Ze klikt de eerste mail — "vervangen, kijk in je nieuwste mail" (3.4). In Studio vindt ze alles, maar de foto's zijn klein en ze wil er één groot zien voordat ze goedkeurt (3.6).

**Joris, 47, NOORD, Berlijn, Engels.** Wil één ding: een factuur zonder Nederlandse btw. Dat gaat goed (VIES, 0%, factuur met verlegging), en de mail "your order has been checked" is precies wat hij nodig heeft. Hij zoekt daarna waar zijn leverdatum staat: in Studio op de bestelkaart — hij had hem bovenaan het overzicht verwacht.

**Ayla, 24, LUMEN, eerste keer.** Bestelt met een datum en vergeet te betalen. Ze hoort niets meer, ook niet als haar datum vervalt (3.1). Dit is de klant die je kwijtraakt zonder het te weten.

**Sem, 38, RUIS, operations, 20+ producten.** Wordt naar WhatsApp gestuurd, krijgt van jou een prijs — en dan? Er is geen weg terug naar een bestelling met betaallink en Studio zonder het formulier opnieuw te doen (3.3).

**Nina, 52, KOEL, niet handig met computers.** Het inloggen met een code in de mail werkt goed voor haar. Waar ze op vastloopt: de vier tekstvakken onder elke foto — "moet ik hier iets typen?" (3.6). "Je gegevens" is voor haar het duidelijkste scherm van allemaal.

## 6 · In welke volgorde

Eerst de lanceerlijst uit §4 (een uur, en het is voorwaarde voor geld ontvangen). Dan 3.1 en 3.2, de twee mails die nu ontbreken — een halve dag, en ze voorkomen de klanten die stil afhaken. Dan 3.3, bestellen namens een klant in /admin, want dat maakt de "meer dan 20"-route af die vanochtend is gebouwd — een dag. Daarna 3.6 (de beoordeling lichter) en 3.5 (KVK onthouden). 3.4 (één scherm in plaats van portaal én Studio) is de grootste verbouwing en kan wachten tot je ziet hoe klanten de mail-link gebruiken.

## Wat er precies in je map is veranderd

`src/lib/account.js` (revisie-klaar-toestand, NIEUW-markering, shot-volgorde, samenvatting vaste look, "de proef"), `src/lib/admin.js` (klantpagina: look/verhouding/kanalen + balk; diagnose: lanceerlijst), `src/lib/portal.js` (dubbele punt), `src/lib/mollie.js` (omschrijving), `src/components/CookieConsent.astro` (hero op telefoon), de hernoeming in `pricing.js`, `ui.js`, `schema.js`, `faq.js`, `PricingPage`, `ComparePage`, `HomeV2`, `HowItWorksPage`, `ThankYouPage`, `StudioPage`, `PlanPicker` en de NL-pagina's, `public/account.css`. Nieuw: `kladblok/keten-doorloop.mjs`, `kladblok/keten/` (logboek + 41 schermafdrukken), `kladblok/site-afdrukken.mjs`.
