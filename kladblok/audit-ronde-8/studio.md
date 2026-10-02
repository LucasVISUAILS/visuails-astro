# Doorlichting VISUAILS Studio (klantaccount) — 1 oktober 2026

Alleen gelezen, niets gewijzigd. Elke bevinding is in de code nagelopen; regelnummers verwijzen naar `/home/claude/repo`.
Prioriteit: **Kritiek** (geld, verkeerde documenten, knoppen die niets doen) · **Belangrijk** (verkeerde toestand, doodlopende weg, stille fout) · **Nice-to-have** (frictie, ontbrekende functies).

---

## KRITIEK

### K1 · Een geannuleerde, onbetaalde bestelling toont "Nu betalen" — en de betaling gaat ook echt door
- `paymentView()` kijkt alleen naar `payment_status` en de dienst, niet naar `status`: `src/lib/account.js:7357` (`payHref = state === 'unpaid' && payable ? …`).
- Annuleren in admin laat `payment_status` op `'unpaid'` en `cancel_payment` op NULL bij een onbetaalde bestelling: `src/lib/admin.js:1270-1272`.
- `handleOrderPay()` controleert eigendom, `payment_status`, dienst, btw-poort en bedrag, maar niet `status = 'cancelled'`: `src/lib/account.js:4721-4772`. Er wordt een Mollie-betaling aangemaakt.
- De webhook zet hem daarna op betaald, ook als hij geannuleerd is: `functions/api/webhook/mollie.js:1353-1356` (`WHERE … payment_status NOT IN ('paid','refunded')`).
- Daarbovenop klapt de kaart altijd open (`needsAttention`, `account.js:8743-8747`) en staat het bedrag in de kop als openstaand (`account.js:8749, 8762`).

**Fix:** in `paymentView()` en `handleOrderPay()` `o.status !== 'cancelled'` eisen. `needsAttention`/`unpaidMoney` alleen bij `payment_status === 'unpaid' && status !== 'cancelled'`. De webhook moet een betaling op een geannuleerde bestelling als "terugbetalen" aanmerken in plaats van als betaald.

### K2 · Facturen van een abonnement downloaden de verkeerde PDF, of niets
- Abonnementsfacturen komen uit `subscription_invoices` en krijgen het eigen `id` van die tabel: `account.js:5873-5889` (`isSubscription: true` wordt nergens gelezen).
- `invoicesView()` maakt voor elke niet-creditrij dezelfde link: `/account/invoices/${inv.id}/pdf` (`account.js:8840`).
- `serveInvoicePdf()` zoekt dat id op in de tabel **`invoices`** (via `orders`): `account.js:5062-5069`. Het gevolg is een lege 404, of — als de klant ook een bestelfactuur heeft met hetzelfde getal als id — **een andere factuur van dezelfde klant**. Er is geen route voor de PDF van een abonnementsfactuur.

**Fix:** een eigen route `/account/plan-invoices/<id>/pdf` met een eigendomscontrole via `subscription_invoices.customer_id`/`subscriptions.customer_id`, en in `invoicesView` kiezen op `inv.isSubscription`.

### K3 · Abonnement › Producten: "Foto's toevoegen" en "Gezicht wijzigen" doen niets
- Beide gebruiken een inline-handler `onchange="this.form.requestSubmit()"`: `src/pages/account/plan.astro:286` en `:294`.
- De CSP van Studio is `default-src 'none'` zonder `script-src` (`account.js:8625`, gezet in `StudioLayout.astro:68`). Inline-handlers worden dus geblokkeerd.
- De terugvalknop staat in `<noscript>` (`plan.astro:287, 298`). Die wordt **niet** getoond, omdat scripting in de browser gewoon aan staat. Alleen de CSP blokkeert het.
- Gevolg: de klant kiest foto's of een gezicht en er gebeurt niets. Er is geen knop en geen melding. Bij foto's is dit de enige manier om een concept "vast te zetten" mogelijk te maken (`lockUit` vereist foto's, `account.js:9145`).

**Fix:** de `<noscript>`-knoppen gewoon altijd tonen (bijvoorbeeld "Opslaan" / "Uploaden"), en de onchange-attributen weghalen.

### K4 · Een verlopen reservering blijft "je plek staat vast tot …" zeggen, en betalen kan nog
- Een onbetaalde bestelling wordt nooit automatisch geannuleerd. De agenda geeft de plek wel vrij zodra `window_expires_at` voorbij is (`src/lib/agenda.js:63-68`).
- Studio laat de datum ongewijzigd staan: `account.js:7348-7350` (`payDueBy` = "Nog niet betaald — je plek staat vast tot 3 sep", ook als dat in het verleden ligt). De levering blijft op het oude venster staan (`account.js:8767-8777`).
- `handleOrderPay()` toetst `window_expires_at` niet (`account.js:4721-4772`). De klant betaalt dan voor dagen die intussen aan iemand anders kunnen zijn gegeven.
- Op het overzicht blijft hij als "lopende bestelling" en in de chip staan (`account.js:5683-5687`).

**Fix:** is `window_expires_at < nu`, dan in `paymentView` een andere zin ("Je reservering is verlopen — kies een nieuwe datum") en een knop naar het opnieuw inplannen in plaats van betalen. Weiger in `handleOrderPay` of laat de capaciteit opnieuw toetsen. Daarnaast een cron die verlopen, onbetaalde bestellingen na X dagen annuleert.

---

## BELANGRIJK

### B1 · "Intrekken" op een aangemerkt beeld trekt niets in bij de studio
- Een beeld met `revision_requested` krijgt de knop "Intrekken" (`account.js:8679-8682`, label `bCancelShort` `:1440`).
- De handler zet alleen `files.review_state` terug op `pending`: `account.js:4443-4470`. De rij in `revision_requests` blijft onopgelost staan, de studio krijgt geen bericht en werkt dus gewoon door. De ronde blijft verbruikt (`revision_round_at`), dus de klant kan het beeld daarna niet opnieuw aanmerken.

**Fix:** bij intrekken ook `revision_requests.resolved_at`/`withdrawn_at` zetten en de studio een bericht sturen. Of de knop hier weglaten en uitleggen dat het via WhatsApp loopt. Zet in elk geval bij de knop wat het gevolg is.

### B2 · Klanten met ingetrokken revisierechten krijgen nooit de uitleg te zien
- `revisionRoundState()` geeft `'ingetrokken'` (`src/data/pricing.js:1053-1054`), dus `rondeOpen` is false. In `shotView` wordt `ask` dan `null` voordat `revokedNote` aan de beurt komt: `account.js:8685-8688`. In `orderView` is er geen tak voor `'ingetrokken'` (`account.js:8780-8790`).
- De tekst "Revisieaanvragen staan op dit account uit…" (`:1218`) is dus dode code. De klant ziet alleen nog "Goedkeuren" en weet niet waarom het aanmerken verdwenen is.

**Fix:** in `orderView` een `ronde = { kind: 'revoked', … }` toevoegen, en in `shotView` de volgorde omdraaien.

### B3 · Revisie aanmerken: het notitieveld staat altijd open, en een notitie zonder vinkje verdwijnt stil
- Op 4 september werd het tekstvak alleen getoond na het vinkje (via CSS `:has`). Die regel staat alleen in het oude `public/account.css`. `src/styles/studio.css:440-443` heeft hem niet, dus `Beeld.astro:249-257` toont bij twaalf producten weer tientallen open tekstvakken.
- De server telt alleen aangevinkte `file`-waarden. Een getypte notitie zonder vinkje wordt genegeerd (`account.js:4547-4553`, `4148-4156`). Dan volgt "Er is niets aangevinkt" en de getypte tekst is weg.

**Fix:** de `:has(input:checked)`-regel overzetten naar `.st-aanmerk`. Server-side: een niet-lege `note-<id>` telt als aangevinkt.

### B4 · Goedkeuren per beeld laadt de pagina opnieuw, en het werk daaromheen gaat verloren
- Elke "Goedkeuren" is een eigen formulier met een volledige herlaadbeurt naar `/account/orders#f<id>` (`account.js:4415, 4482`). Daar zit geen `?order=` in, dus een oudere bestelkaart opent alleen als hij de nieuwste is of aandacht vraagt (`account.js:8748`).
- Het productpaneel staat alleen open bij een lopende revisie (`Product.astro:176`, `open={v.revising}`). Na elke goedkeuring klapt het product dus dicht.
- Vinkjes en notities die al in andere beelden waren ingevuld (horend bij `form="ronde-<id>"`) gaan bij die herlaadbeurt verloren. Juist dat is de volgorde die `rdWarn` aanmoedigt.

**Fix:** de redirect naar `?order=<id>&p=<product>#f<id>` laten gaan en het product open zetten. Beter nog: één formulier per product met per beeld een keuze "Goed / Aanpassen + notitie" en één verzendknop.

### B5 · "Download de map" blijft staan als alle beelden verlopen zijn, en geeft dan een lege 404
- De voorwaarde is alleen `delivered.length` (`account.js:8819`). De zip filtert verlopen bestanden eruit en geeft bij nul bestanden `new Response(null, {status: 404})` (`account.js:4916`, `delivery.js:245`).

**Fix:** alleen tonen als er levende beelden zijn. Zijn ze verlopen, dan een zin met de verloopdatum en "vraag ons als je ze nog nodig hebt".

### B6 · Tijdlijnnotities in de verkeerde taal, en een interne instructie zichtbaar voor de klant
- Studio schrijft altijd Nederlands in `order_events`, die de klant in zijn tijdlijn leest: "Revisieronde ingediend — …" (`account.js:4259`) en "Een goedkeuring is teruggedraaid…" (`account.js:4467`). Het portaal kiest hier wel op `order.lang` (`portal.js:590, 719-721`).
- De webhook schrijft met `actor 'system'` "…geannuleerd, TERUGBETALING MISLUKT, met de hand doen" (`functions/api/webhook/mollie.js:1514-1516`). Studio filtert alleen `actor = 'intern'` (`account.js:3736`), dus de klant leest die instructie aan Lucas.

**Fix:** notities via `order.lang` en een NL/EN-sleutel. Interne aanwijzingen met `actor 'intern'`.

### B7 · Een terugbetaalde bestelling ziet eruit alsof hij nog openstaat
- `needsAttention` en `unpaidMoney` gebruiken `payment_status !== 'paid'` (`account.js:8744, 8749`). Bij `'refunded'` staat het bruto bedrag dus in de kop als openstaand (`:8762`) en klapt de kaart altijd open.

**Fix:** toets op `=== 'unpaid'`.

### B8 · Abonnement: bevestigingen en foutmeldingen ontbreken, of zeggen het verkeerde
- De handlers sturen `ok=gepland` (`account.js:6817`) en `ok=verzet` (`:6972`). In de map `bevestiging` staan die niet (`:9007`), dus er verschijnt niets.
- `fout=weegt|vroeg|agenda|dag` (`:6807, 6812, 6814, 6875, 6885, 6901, 6932, 6938, 6944, 6952`) en de reden van `queueVerzet` (`:6957`) staan niet in `melding` (`:9005`). Ook daar verschijnt niets.
- `fout=vol` betekent bij plannen en verzetten "deze dag zit vol" (`:6815, 6903, 6954`), maar toont `planQueueFull` = "Je lijst is vol. Haal er iets af…" (`:1569`).

**Fix:** voor elk van deze codes een eigen zin, en een eigen code `dagvol` voor een volle dag.

### B9 · Opzeggen met een verkeerd getypt woord stuurt stil terug naar Overzicht
- `account.js:7190`: `if (woord !== 'CANCEL' && woord !== 'OPZEGGEN') return seeOther(home)`. Er volgt geen melding en de klant belandt op een ander tabblad. Hij denkt dat het gelukt is, of dat de knop stuk is.

**Fix:** `?tab=facturering&fout=bevestig` met de zin "Typ OPZEGGEN (of CANCEL) om op te zeggen".

### B10 · Een nooit betaald (pending) abonnement krijgt "Pauzeren", en dan zit de klant vast
- Facturering toont Pauzeren bij elke status behalve opgezegd (`plan.astro:626-636`). `pauseSubscription` accepteert `pending` (`src/lib/subscription.js:1261`).
- Daarna, bij maandelijks: hervatten mislukt altijd, want er is geen mandaat (`src/lib/subscribe.js:583`). Opnieuw aanmelden wordt doorgestuurd naar /account/plan, omdat alleen `pending` als "afgebroken aanmelding" wordt opgeruimd (`subscribe.js:213, 232`). De hint "opnieuw proberen" verdwijnt, want `nooitBetaald` eist `pending` (`account.js:9368`).
- Bij vooruitbetaald: hervatten geeft `true` zonder betaling (`subscribe.js:582`) en `activateSubscription` zet de status op `active` (`subscription.js:1243`).

**Fix:** bij `pending` geen pauze- of hervatknop, alleen "Betaling afronden" en "Aanmelding annuleren". Laat de server dat ook weigeren.

### B11 · Abonnement › Overzicht: de "laatst geleverde" beelden zijn de oudste, en sommige zijn kapot
- De sortering gebruikt `created_at` (`account.js:9298`), maar `loadCustomerFiles` selecteert die kolom niet (`account.js:3658-3675`). De volgorde blijft dus `ORDER BY f.order_id` (oud eerst).
- Er wordt niet gefilterd op verlopen of ingetrokken bestellingen (`account.js:9296-9297`). Die beelden geven een 410 (`account.js:4972, 4979`) en verschijnen als gebroken plaatje. Het overzicht filtert dat wel (`account.js:5655-5662`).

**Fix:** `f.created_at` meenemen, en hetzelfde filter gebruiken als `overviewView`.

### B12 · De primaire knoppen voor abonnees wijzen naar betaald bestellen
- Op Abonnement is de topknop "Los bestellen" (`/start/complete`) en verschijnt die juist **wanneer er credits over zijn**: `account.js:9344` (`state.actief && state.saldo > 0`), label `:968/1533`. Dat is omgekeerd: met credits hoort de knop "Product toevoegen" te zijn.
- Op Overzicht en Bestellingen is de enige primaire knop "Nieuwe bestelling" naar `/start/` (`index.astro:38`, `orders.astro:35`). Een abonnee belandt zo in de betaalde flow terwijl hij credits heeft.

**Fix:** voor abonnees met saldo is de primaire actie overal "Product toevoegen (credits)" (`/account/plan?tab=bestellen`), met "Los bestellen" als tweede knop.

### B13 · Na het inloggen kom je niet terug waar je heen wilde
- Elke Studio-pagina zonder sessie stuurt naar `/account/login` zonder doel (`account.js:1888, 8606`). Na de code gaat het naar `/account` (`account.js:2498`). Na de link alleen bij `naar=plan` naar /account/plan (`account.js:2556-2557`).
- Een link naar `/account/orders?order=91#order-91` (bijvoorbeeld uit WhatsApp, een bladwijzer of een collega) eindigt op het overzicht.

**Fix:** `?terug=` met een allowlist van paden onder `/account/` (geen open redirect) meenemen door login, code en verify.

### B14 · `/account/code` met GET geeft een lege 405
- `studioAuth()` kent voor `/account/code` alleen POST: `account.js:5349, 5356`. `accountGet` stuurt `/account/code` zelfs door naar `/account/code/` (`:1912`).
- Wie op het codescherm ververst, op "terug" drukt of de tab na het overschakelen naar de mail-app opnieuw laadt (iOS), krijgt een wit scherm.

**Fix:** GET `/account/code` doorsturen naar `/account/login`, of het codeformulier tonen met een leeg e-mailveld.

### B15 · Je gegevens: één fout in het btw-nummer en alles wat je typte is weg
- Bij een ontbrekend btw-nummer zonder vinkje, of een verkeerde vorm, volgt een redirect zonder iets op te slaan (`account.js:3405-3421`). Het scherm toont dan weer de opgeslagen waarden uit de database (`detailsView`, `account.js:8853`), niet wat de klant net invulde.
- Het btw-veld lijkt optioneel ("optioneel" staat er alleen bij als het vinkje al aan staat, `details.astro:75`), maar is verplicht tenzij je "geen btw-nummer" aanvinkt.

**Fix:** de rest van de velden wél opslaan en alleen het btw-veld afwijzen, of de geposte waarden terug in het formulier zetten. Het label duidelijk maken: "Btw-nummer (of vink aan dat je er geen hebt)".

### B16 · Snel goedkeuren levert een witte 429 op
- Alle POST's, ook elke losse "Goedkeuren", delen 20 per minuut per IP: `account.js:327, 1982-1986`. Wie 20 beelden afvinkt of met een team achter één kantoor-IP werkt, krijgt `new Response(null, {status: 429})`: een lege pagina.

**Fix:** reviewacties een eigen, ruimere emmer per klant (sleutel `customer_id`) geven, en een 429 als nette pagina met "wacht even, er is niets verloren".

### B17 · Contact met een specialist: genoemd, maar nergens aanklikbaar
- Na een ingediende ronde staat er "Verder iets … loopt via WhatsApp of e-mail" zonder link (`Bestelling.astro:153-155`, tekst `account.js:1380, 1370`). `pricing.js` belooft hier zelf "een WhatsApp-link in de plaats".
- De enige WhatsApp-link staat per product in het opengeklapte paneel (`Product.astro:208`). In de "twee kolommen"-weergave (bestellingen zonder productindeling, `Bestelling.astro:134-151`) is er geen enkele link. In de zijbalk en op de bestelkaart staat ook geen contactknop.

**Fix:** één vaste knop "Vraag een specialist" (WhatsApp met het ordernummer vooringevuld, plus mail) op elke bestelkaart en in de zijbalk, en een link in het blok `rdUsed`/`rdReady`.

### B18 · Portaal (/o/…): goedkeuren en terugdraaien op vervangen of verlopen beelden
- `portal.js:524-533` controleert alleen `order_id` en `kind`. `superseded_at` en `expires_at` ontbreken. Studio repareerde precies dit (`account.js:4395-4408`): een undo op een vervangen beeld wist `closed_at` (`portal.js:571-573`), terwijl `maybeCloseOrder` dat beeld niet meer meetelt. De bestelling raakt dan nooit meer afgerond.

**Fix:** dezelfde levendheidseisen als in `handleFileReview`, het liefst via een gedeelde helper.

### B19 · Overzicht: status en tellers zeggen iets anders dan Bestellingen
- De lopende en recente lijsten gebruiken de kale `o.status` (`index.astro:80, 129`). Een onbetaalde bestelling heet daar "Ontvangen", op de kaart "Wacht op betaling" (`account.js:8805-8806`, `Bestelkaart.astro:16`).
- De vier tellers zijn in productie, wordt nagekeken, geleverd en totaal (`account.js:5632-5637`). Juist de twee toestanden waarin de klant iets moet doen ontbreken: "wacht op betaling" en "wacht op jouw akkoord".
- Het filter op Bestellingen telt hetzelfde geval als "Ontvangen". `?status=awaiting_payment` is toegestaan (`:2859`), maar geeft altijd een lege lijst (`:8641-8645`).

**Fix:** één afgeleide `weergaveStatus(o)` overal gebruiken. Tegels "Te betalen" en "Te beoordelen (N beelden)" bovenaan, met een link naar de juiste kaart.

### B20 · De revisieronde in Studio is losser dan die in het portaal, en zwijgt bij een fout
- In Studio telt elk levend beeld, ook een dat al is **goedgekeurd** (`account.js:4180-4191`). Het portaal eist `review_state = 'pending'` (`portal.js:684`).
- Bij een mismatch (een beeld net verlopen of vervangen) of een gesloten poort volgt een redirect naar `/account/orders` **zonder** `?ronde=` (`account.js:4198, 4204, 4211, 4218`). De klant ziet geen melding en weet niet of de ronde verstuurd is.

**Fix:** dezelfde `pending`-eis. Altijd `?ronde=mislukt` of `?ronde=dicht` met uitleg.

### B21 · Elke Studio-pagina laadt alles van de klant
- `sectionState` draait voor élk scherm zes queries, waaronder alle bestanden van alle bestellingen met twee gecorreleerde subqueries per bestand: `account.js:2757-2764, 3658-3675`. Dat gebeurt ook op Facturen en Je gegevens.
- Abonnement doet daarbovenop per wachtrij-item een aparte R2-listing, na elkaar (`account.js:9128-9135`).
- Bij een merk met tientallen bestellingen wordt Studio op mobiel traag.

**Fix:** per sectie alleen laden wat nodig is (`loadCustomerFiles` alleen voor overview en orders), de R2-listings parallel draaien met `Promise.all`, of het aantal opslaan op de rij.

### B22 · Eén beeld downloaden kan niet; je moet de hele map halen
- De downloadknop per beeld is sinds 9 augustus weg (`account.js:1803-1813`). Het beeld opent alleen als voorbeeldweergave van 1400px (`:4997, 5016`).
- Een mobiele gebruiker die één foto voor Instagram wil, moet de zip van de hele bestelling downloaden (soms honderden MB, `ZIP_MAX_BYTES` 2 GB) en die op een telefoon uitpakken.

**Fix:** per product een kleine zip, of per beeld een download van het echte bestand via een getekende, kortlevende link. Dat sluit ook de "achterdeur"-zorg uit de noot.

### B23 · Elke afgeronde bestelling zonder tevredenheidsantwoord blijft opengeklapt
- `needsAttention` bevat `o.closed_at && !isSample(o) && !fb` (`account.js:8746`). Feedback is vrijblijvend, dus wie hem niet invult, heeft na een paar maanden een pagina vol opengeklapte, afgeronde bestellingen.

**Fix:** alleen de laatste afgeronde bestelling openen voor de vraag, of alleen binnen 14 dagen na `closed_at`.

---

## NICE-TO-HAVE

### N1 · "Bestel opnieuw" ontbreekt
De gegevens zijn er: dienst, productnamen en soort in `details_json` (`orderProductNames`, `account.js:8702`) en de vaste look. Voeg op elke geleverde kaart en op productniveau een knop toe: "Zelfde producten/look opnieuw bestellen". Die opent `/start/<dienst>?van=<ref>` met de velden ingevuld. Voor abonnees: "Zet op mijn lijst" (`queueAdd`).

### N2 · Geen verwachte levertijd en geen concrete downloaddeadline
- Bij de standaardwachtrij staat "Normale doorlooptijd — zo snel mogelijk, geen vaste datum" (`account.js:8777`, tekst `:1205`). Een ongeduldige klant ziet geen enkele datum. De keuze om niets te beloven is bewust (`src/data/capacity.js:155-163`), maar "meestal binnen 24 uur – we mailen zodra het klaar is" is geen belofte en neemt wel de onzekerheid weg.
- De verlooptijd staat alleen generiek in `settledNote` ("tot 90 dagen na levering", `:1222`). Toon per bestelling "Beschikbaar tot 30 dec" uit `files.expires_at`, ook op het overzicht.

### N3 · De lege staat bij Facturen is omgedraaid
`account.js:8847`: als er een betaalde bestelling is, toont de pagina "…zodra de betaling binnen is" (`:1694`). Die zin hoort bij het omgekeerde geval.

### N4 · "Beelden in je bibliotheek" telt de eigen uploads en verlopen bestanden mee
`account.js:9382` (`files.length`). Tel alleen levende leveringen.

### N5 · "Kies zo snel mogelijk" verwijst naar een knop die niet meer bestaat
`planWhenNone` (`account.js:1022, 1587`) tegenover de knop "In je week" (`plan.astro:410-417`).

### N6 · Taal-, thema- en zijbalkschakelaar wissen de huidige weergave
De links zijn `?lang=…`, `?thema=…` en `?nav=…` (`StudioLayout.astro:116, 134-135, 161-162`), relatief, zonder de bestaande query. Een klant op `?tab=planning` of `?status=delivered` belandt na de klik weer op de standaardweergave. Neem `url.search` mee.

### N7 · "Alles goedkeuren" zegt niet dat het de bestelling afsluit
Na `approve-order` volgt `maybeCloseOrder` (`account.js:4360`), waarmee de revisieronde vervalt (`pricing.js:1055`). Zet bij de knop (`Bestelling.astro:105-111`): "Hiermee rond je de bestelling af; aanmerken kan daarna niet meer."

### N8 · De nakijkpagina van de revisieronde valt buiten de huisstijl
`handleRondeNakijken` tekent met de oude `page()` en `/account.css` (`account.js:4613-4633`), zonder zijbalk. Dit is de belangrijkste stap om niet mis te klikken, maar hij voelt als een andere site. Hetzelfde geldt voor de 403/404-pagina's (`:1977, 2048`). Zet ze over naar `StudioLayout`.

### N9 · Verwijderen uit de abonnementslijst zonder bevestiging
`plan.astro:317-320`: één tik verwijdert een product met zijn foto's. Op mobiel staat die knop naast ↑/↓. Gebruik een `<details>`-bevestiging zoals bij opzeggen.

### N10 · Kleine tekstdingen
- In het NL staat "3 prod." (`account.js:8755`).
- Een upload heet binnen het paneel van product 2 "#2 · Voorkant", met het productnummer dubbel (`account.js:8722` roept `shotView` aan zonder `inProduct`).
- Een revisieronde staat in de tijdlijn als "Geleverd — Revisieronde ingediend" (status `delivered`, `account.js:4258`).

### N11 · Vaste look leegmaken geeft geen bevestiging
`account.js:4024` en `:4064` sturen terug zonder `?saved=`. Bij de andere opslagroutes staat er wel een regel.

### N12 · Zware miniaturen
De strook op het overzicht (12 stuks), de productomslagen en de abonnementsframes laden de beoordeelversie van 1400px (`account.js:4997`, `index.astro:103`). Een thumbnail-variant (bijvoorbeeld 400px) scheelt veel op 4G.

### N13 · Een abonnee ziet op het overzicht niets van zijn abonnement
Credits, de week en "x producten vastgezet" staan alleen onder Abonnement. Het overzicht toont bij hem alleen bestellingen en het tegoed (`index.astro:41-66`). Voeg één tegel toe: "Nog 78 credits · je week start 8 okt".

### N14 · Bij een gepauzeerd abonnement blijven de bestelknoppen gewoon staan
"Product toevoegen", "Los bestellen" en "Kies deze" (`plan.astro:148-151, 176`) zijn zichtbaar. Pas bij vastzetten volgt "Je abonnement loopt niet" (`account.js:6694-6700`, `subscription.js:824-825`). Zet bovenaan "Gepauzeerd — hervat om te bestellen" met de hervatknop.

### N15 · Meldingen
Er is geen voorkeur voor e-mail of WhatsApp per gebeurtenis (levering, revisie klaar, reservering loopt af). Alleen de nudge om een telefoonnummer in te vullen (`account.js:8862`). Een herinnering "je reservering verloopt morgen" en "er wachten 12 beelden op je akkoord (dag 3)" sluiten direct aan op K4 en B19.

### N16 · Producten in de "Alle … zijn goed"-knop en geannuleerd-maar-behouden
`productView` en `approve-product` toetsen `status = 'cancelled'` niet (`account.js:8713, 4367-4370`). De bestelknop doet dat wel (`:8797, 4354`). Bij `cancel_payment = 'none'` (annulering waarbij de klant de beelden houdt) staat de productknop en het revisieformulier er dus nog wel (`revisionRoundState` kent geen geannuleerd). Maak het gelijk.

---

## Snelle samenvatting per scherm

| Scherm | Belangrijkste punt |
|---|---|
| Overzicht | Tellers missen "te betalen" en "te beoordelen"; statuspil zegt "Ontvangen" bij onbetaald (B19) |
| Bestellingen | Betalen op een geannuleerde of verlopen bestelling (K1, K4); intrekken van een revisie (B1); herlaadfrictie (B4); lege zip (B5) |
| Facturen | Abonnementsfacturen geven de verkeerde of geen PDF (K2) |
| Abonnement | Foto's/gezicht doen niets (K3); meldingen ontbreken (B8, B9); pending-pauze (B10); CTA's omgedraaid (B12) |
| Je gegevens | Invoer weg bij een btw-fout (B15) |
| Inloggen | Geen terugkeer naar het doel (B13); 405 op /account/code (B14) |
| Portaal | Undo op een vervangen beeld (B18) |
