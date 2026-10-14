# Ontwerpkeuring 3 oktober 2026 — indeling en ontwerp per sectie, met het abonnement voorop

Gekeken op de code in je map (1280 en 390, testomgeving; live loopt achter). Schermen: `kladblok/ronde-9/keuring-site/` en `kladblok/ronde-9/herontwerp/`. Per punt: wat ik zie, wat ik zou doen, en een alternatief. **Vet** = mijn advies om als eerste te doen.

---

## 0 · Samenvatting in tien regels

1. **Het abonnement in Studio is nu een bestelformulier met vier tabs, geen abonnement.** Een abonnee ziet niet in één oogopslag waar hij staat: hoeveel credits, wanneer zijn week is, wat er in die week zit, wat er loopt, wat vorige maand is gemaakt. Dat is het grootste gat. Mijn voorstel: één tabblad "Jouw maand" dat bovenaan staat en de rest eronder (§1).
2. **Na de weekstart verdwijnt alles uit het abonnement.** De vastgezette producten gaan naar een bestelling onder Bestellingen; het abonnementsscherm zegt nog steeds "Je volgende week". De klant ziet nergens "je week loopt, 3 producten in de maak". Plus F65: de foto's kwamen niet mee (hersteld).
3. **Credits zonder geschiedenis.** Alleen "116 van 120". Geen regel per afschrijving, geen vervaldatum per maand, geen waarschuwing "47 credits vervallen op 1 december".
4. **Geen manier om het abonnement te veranderen.** Niet omhoog, niet omlaag, geen extra credits, geen betaalmethode. Alleen pauzeren en opzeggen.
5. **Het "Leg je look vast"-blok staat bovenaan elke tab, altijd**, ook als alleen Video open staat en de klant nooit video bestelt. Dat is zeuren, geen hulp.
6. **Studio-overzicht negeert het abonnement.** Een abonnee krijgt dezelfde vier bestellingstegels als een losse klant.
7. **De planningstab laat een maand zien met "0%" per dag en geen uitleg**, zonder dat de eigen week erin staat.
8. **/plans op de site is goed in inhoud, te lang in vorm** (5.200 px): dezelfde boodschap staat in de hero, de drie kaarten, "Waarom een abonnement", "Per maand, per jaar of vooruit" en de slotband. En de €1-popup valt over de kop "Drie abonnementen".
9. **/start/plan: stap 5 "Bevestigen" met de betaalknop staat rechts náást stap 4**, dus de knop staat in beeld vóórdat de gegevens zijn ingevuld.
10. **Site-breed:** de grijze plaatshouders (home "Kies een look", "Een gezicht zit erbij", lifestyle-looks Dunes/Flash/Glow, "Het assortiment in beweging") zijn nu het opvallendste ontwerpprobleem; dat is inhoud, geen code (O65).

---

## 1 · VISUAILS Studio — het abonnement (`/account/plan`)

### 1.1 Wat er nu staat, per tab

| Tab | Inhoud | Wat eraan ontbreekt |
|---|---|---|
| Overzicht | abonnementsnaam, volgende afschrijving, credits-balk, 8 modelportretjes, 5 diensttegels met credits, "Jouw week" (verzetten), vaste look-strook, maandset-tekst, Editions-regel | de **toestand** (loopt je week? wat zit erin?), geschiedenis, en wat de portretjes hier doen |
| Planning | maandraster met "0%" per dag, "Vastgezet, nog geen dag" eronder | de eigen week in het raster, legenda, wat 0% betekent, geleverde dagen |
| Producten | lijst (concept/vastgezet), per product foto-upload + gezicht, groot toevoegformulier | status na weekstart (in de maak/geleverd), vorige maanden, volgorde-uitleg, kleiner formulier |
| Facturering | "Wat je hebt opgebouwd" (3 regels), termijn/bedrag/status, pauzeren, opzeggen | betaalmethode, plan wijzigen, extra credits, volgende factuur, link naar de facturen zelf |

### 1.2 Wat een abonnee elke maand wil weten (de maat waarlangs ik keur)

1. Hoeveel credits heb ik nog, en wanneer vervallen ze?
2. Wanneer is mijn week, en wat zit erin?
3. Loopt er iets? Wanneer is het klaar?
4. Wat is er vorige maand gemaakt, en waar staat het?
5. Hoe zet ik iets op de lijst — zo snel mogelijk?
6. Wat betaal ik, wanneer, en hoe verander ik dat?

Van die zes beantwoordt het huidige scherm 1 (half), 2 (half) en 5. Dat is de kern van "er mist enorm veel".

### 1.3 Voorstel: "Jouw maand" als eerste tab, de rest eronder

**Tab 1 · Jouw maand** (vervangt Overzicht)

- **Statusregel bovenaan**, één zin in de kleur van de toestand: *"Je week van 10 oktober loopt — 3 producten in de maak, klaar rond 14 oktober."* / *"Je volgende week begint 10 november · 4 producten vastgezet · 68 credits over."* / *"Nog niets vastgezet voor november — zet vóór 7 november iets op je lijst."* Dit is het antwoord op vraag 2 en 3 in één regel.
- **Drie tegels** (zelfde vorm als de vier op het overzicht): *Credits over* (116 van 120, met "47 vervallen op 1 dec" als dat zo is), *Vastgezet voor je week* (4 producten · 18 credits), *Deze maand geleverd* (12 beelden → link naar de bestelling).
- **Tijdlijn van de maand** in plaats van het maandraster: één horizontale strook met vier punten — *credits binnen (1 okt)* → *vastzetten tot (7 okt)* → *je week (10–14 okt)* → *geleverd (14 okt)*, met "nu" als stip. Dezelfde taal als de tijdlijn bij een bestelling. Het raster met 0% kan dan weg uit Studio (het is informatie van de studio, niet van de klant).
- **De lijst van deze week** compact: naam, dienst, foto-duim, status (vastgezet / in de maak / geleverd), en één knop "Product toevoegen". Geen formulier op deze tab.
- **Vorige maanden** als uitklapregel: *september · 11 producten · 42 beelden → bekijk*.
- Vaste look-strook blijft, maar als één regel: *Catalog Ava · wit · 4:5 · Lifestyle Dunes · Video —*, met "Wijzigen". Het nag-blok "Leg je look vast" alleen tonen als er een dienst open staat die de klant ook gebruikt (zie 1.4).

**Tab 2 · Producten** — blijft, maar:
- het toevoegformulier in een `<details>` of een eigen pagina (`/account/plan/nieuw`), zodat de lijst zelf bovenaan staat; de header-knop "Product toevoegen" opent dat formulier;
- per rij een **status-pil** met dezelfde `.stand`-vorm als de bestellingen: Concept · Vastgezet · In je week · In de maak · Geleverd;
- producten die in een bestelling zijn opgenomen blijven zichtbaar (grijs, met de bestelreferentie) tot de maand om is, in plaats van te verdwijnen;
- de vier losse upload-vakjes (voor/achter/detail/gedragen) terug naar één "Foto's" met de sleep-en-herken van het bestelformulier (bestandsnaam → vak), want dat werkt daar al;
- "Meteen vastzetten" standaard **aan** als de look compleet is: dat is wat 9 van de 10 abonnees willen (Lucas: "sneller laten bestellen"). Alternatief: aan laten staan maar met de credits erbij in de knop ("Toevoegen en vastzetten · 4 credits").

**Tab 3 · Credits** (nieuw, kan ook in Jouw maand onderaan)
- een **ledger**: datum · wat · credits (+120 oktober · −4 Grijze hoodie · +4 losgemaakt · −5 …), met per maandbundel de vervaldatum;
- "Extra credits" kopen (10/25/50, prijs uit plans.js) — bestaat nog niet in de code; eerst besluit van jou of je dat wilt verkopen;
- de vijf diensttegels verhuizen hierheen als "wat kost wat", zonder "4 te kort" in rood bij een leeg saldo (nu leest dat als fout).

**Tab 4 · Abonnement** (vervangt Facturering)
- plan · termijn · bedrag · volgende afschrijving · betaalmethode (iDEAL-machtiging via Mollie, "wijzigen" → Mollie) · status;
- **Plan wijzigen** (Starter ↔ Pro ↔ Merk, op maat) — code ontbreekt; omhoog kan per direct met verrekening, omlaag per volgende maand;
- Pauzeren en opzeggen zoals nu, maar als secundaire acties onderaan;
- "Je facturen" als link naar het menu-item Facturen (staat er al als zin, maak er een knop van);
- "Wat je hebt opgebouwd" kan weg of naar Jouw maand als "vorige maanden".

**Kost:** Jouw maand + statuspillen + ledger-weergave: middel (leest alleen uit bestaande tabellen; de weekstart schrijft al `order_id` op de queue-rij). Plan wijzigen en extra credits: groot (Mollie-bedragen aanpassen, verrekening, factuur) — eerst jouw besluit.

**Alternatief (klein):** niets herindelen, alleen (a) de statusregel bovenaan Overzicht, (b) statuspillen op de productlijst, (c) "Leg je look vast" alleen bij een open dienst die de klant gebruikt, (d) formulier inklappen. Dat haalt de ergste verwarring weg in een dag werk.

### 1.4 Losse punten in het abonnementsscherm

| # | Waar | Wat | Advies |
|---|---|---|---|
| S1 | header | titel "Abonnement & facturering" boven tabs Planning/Producten; zijbalk zegt "Abonnement" | titel "Abonnement", punt |
| S2 | header | "Product toevoegen" (primair) springt naar het formulier onderaan Producten | formulier bovenaan of eigen pagina |
| S3 | Overzicht | 8 modelportretjes zonder kop of functie | weg, of kop "Je vaste gezicht: Ava" met alleen Ava |
| S4 | Overzicht | "Deze maand is nog niet betaald…" in oranje terwijl het abonnement "Loopt" | alleen tonen als de incasso echt open staat; anders de volgende afschrijving |
| S5 | Overzicht | Maandset-blok en Editions-regel voor iets wat niet bestaat | weg tot het bestaat (Lucas' besluit, zie stap 9 B7/Editions) |
| S6 | Planning | "0%" per dag, geen legenda, eigen week niet zichtbaar | tijdlijn (1.3) of: raster met de eigen week gekleurd en 0% weg |
| S7 | Planning | "Vastgezet, nog geen dag · Grijze hoodie · Wanneer wil je ze hebben?" — de link is de enige actie en staat rechts onderaan | per product een datumknop in de lijst zelf |
| S8 | Producten | lege foto-vakjes "No file chosen" ×5 in elke rij én in het formulier | één knop "Foto's toevoegen", sleepvak |
| S9 | Producten | "Losmaken" / "Vastzetten" / "In je week" / "Concept" naast elkaar: vier woorden voor twee toestanden | pil + één knop |
| S10 | Producten | gele waarschuwing "nog geen foto's · Leg je look vast voor Lifestyle" in de rij, in 12 px | hint onder de naam in gewone tekst, actie als knop |
| S11 | Facturering | "Wat je hebt opgebouwd: Nog niets opgepakt." | weg of "Geleverd via je abonnement: 0 bestellingen" |
| S12 | Facturering | pauzeren/opzeggen staan boven de facturen-zin, de belangrijkste info (volgende afschrijving) staat op een andere tab | bedrag + datum + betaalmethode bovenaan, acties onderaan |
| S13 | alle tabs | "Leg je look vast — Nog open: Lifestyle, Video" op elke tab, ook voor een catalog-only klant | alleen als een open dienst in zijn lijst of plan zit; anders één regel in de look-strook |
| S14 | weekstart | klant krijgt geen mail als de week start (concept C2) | mail "Je week is begonnen · 3 producten · klaar rond …" (klein) |
| S15 | mobiel 390 | de tabs Overzicht/Planning/Producten/Facturering als pillen onder het nag-blok; het eerste wat je ziet is "Leg je look vast" | statusregel eerst, tabs daaronder |

### 1.5 Studio-overzicht voor een abonnee

Het overzicht (`/account`) toont "Te betalen · Te beoordelen · Bij ons in de maak · Geleverd" en "Laatst geleverd". Voor een abonnee hoort daar bovenaan één kaart bij: *Je abonnement · Pro · 116 credits · volgende week 10 oktober · 4 vastgezet → Naar je maand*. Zonder die kaart is het abonnement een menu-item dat je moet weten te vinden. Kost: klein (de gegevens staan al in planState). Alternatief: de tegel "Te betalen" vervangen door "Credits over" voor abonnees.

### 1.6 De andere Studio-schermen (kort)

- **Bestellingen:** goed sinds het herontwerp. Twee wensen: een abonnementsbestelling draagt de pil "Uit abonnement" (in /admin wel, in Studio niet), en de kaart zegt "Standaard levertijd, geen vaste datum" terwijl hij bij een week met een datum hoort (live, VIS-QGM0-5MZ) — daar hoort "In je week van 10 oktober" te staan.
- **Je vaste look:** de drie blokken (catalog/lifestyle/video) zijn even groot terwijl video voor de meeste klanten leeg blijft; zet video als derde, ingeklapt, "niet nodig voor jou" als het plan geen video heeft.
- **Je gegevens:** in orde. KVK en btw-nummer staan nu onder elkaar met uitleg; prima.
- **Facturen:** in orde; de creditnota's horen in dezelfde lijst (dat doen ze).

---

## 2 · De site — het abonnement

### 2.1 `/nl/plans` (5.223 px op 1280, 8.600 px op 390)

| Sectie | Wat ik zie | Advies | Alternatief |
|---|---|---|---|
| Hero | kop in twee gewichten + "Wat een credit oplevert"-tabel rechts: sterk, dit is de beste uitleg van credits op de site | laten | — |
| "Drie abonnementen" | vier kolommen (Starter/Pro/Merk/Op maat); de €1-popup valt over de kop op 1280; "je bespaart €171 — 11 catalogsets los kosten €561" in 12 px grijs | **popup niet tonen op /plans en /start/plan** (hij verkoopt het verkeerde product op de verkooppagina); besparing één maat groter en als pil | popup pas na 60% scroll |
| Kaartinhoud | "11 catalogsets of 9 carrousels of 4 hooks" — de "of"-reeks leest als drie aparte opties | "bijv. 11 catalogsets, of een mix" + link naar de rekentool (B4) | — |
| "Stel je eigen abonnement samen" | schuif + "daar krijg je bijvoorbeeld 21 catalogsets of 17 … of 17 … of 7 … of 8 hooks" | goed idee, te veel getallen: toon één voorbeeldmix ("bijv. 10 catalogsets + 6 carrousels + 3 clips") | — |
| "Waarom een abonnement" | vier cijfers (30–40% · 5 · Vaste week · 3) zwart op zwart | dit is het hero-metric-sjabloon; de vier feiten staan al in de hero en in de kaartvoet. **Weg**, of samenvoegen met "Per maand, per jaar of vooruit" | — |
| "Per maand, per jaar of vooruit" | drie kolommen, duidelijk | laten; wel de vooruit-korting (2 maanden gratis) als pil bovenop, dat is het verkoopargument | — |
| "En wat eraan komt" | Maandset/Hooks/Editions met "binnenkort"/"op aanvraag" | op een verkooppagina geen beloftes zonder datum: **weg** tot het bestaat, of één regel onder de FAQ | — |
| Slotband "Begin met één product voor €1" | tweede CTA voor het verkeerde product (de proef) op de abonnementspagina | "Sluit een abonnement af" primair, "Twijfel je? Begin met €1" als tekstlink | — |
| Mobiel | de drie kaarten onder elkaar met elk 12 regels: 2.800 px kaarten | compacte kaart (naam, credits, prijs, 1 regel, knop) met "Alles wat erin zit" als uitklap | — |

Mijn samenvatting voor /plans: de pagina overtuigt in de eerste 1.500 px en herhaalt zichzelf daarna. Haal "Waarom een abonnement" en "En wat eraan komt" weg en zet een FAQ van vijf abonnementsvragen (opzeggen, doorschuiven, wat als ik niets vastzet, btw, eigen look) op die plek. Dat maakt de pagina 1.500 px korter en beantwoordt wat mensen echt vragen.

### 2.2 `/nl/start/plan`

| Stap | Wat ik zie | Advies |
|---|---|---|
| Kop + drie feiten | goed | — |
| 1 Welk abonnement | vier kaarten in een 2×2-raster, de gekozen met paarse rand; de zwarte samenvatting rechts | goed; de samenvatting mag "sticky" blijven tijdens stap 2–4 |
| 2 Welke termijn | drie kaarten, "voordeligst"-pil | goed |
| 3 Je vaste week | kaal getalveld "Dag van de maand: 8" | een rij van 28 dagknoppen (zoals de planning) of ten minste "de 8e van elke maand — je kunt dit later wijzigen" |
| 4 Jouw gegevens | lang formulier links… | prima inhoud |
| 5 Bevestigen | …maar stap 5 met "Doorgaan naar betalen" staat **rechts naast stap 4 bovenaan**, dus de knop is in beeld vóór het formulier klaar is; op 390 staat hij gewoon onder | **stap 5 onder stap 4**, volle breedte; de samenvatting rechts blijft |
| Betalen | "Je betaalt de eerste maand via Mollie… daarna automatisch €790 excl. btw" | noem ook het bedrag incl. btw (O29-regel): "€955,90 incl. 21% btw" |

### 2.3 Elders op de site over het abonnement

- Home: "Of betaal er maandelijks voor — vanaf €272" staat op /start, niet op home. Home noemt het abonnement alleen in de voet. Eén regel onder "Wat we maken" ("Elke maand nieuwe beelden? Abonnement vanaf €390") is genoeg.
- /pricing: de band "Elke maand nieuwe beelden?" staat er — goed.
- /start: de kaart "Of betaal er maandelijks" is een losse witte strook tussen zes kaarten en de stappen; maak er de zevende kaart van, of zet hem bovenaan als de keuzehulp (B3) er komt.

---

## 3 · De site — per pagina, per sectie (1280 en 390)

Alleen wat beter kan; wat goed is laat ik weg. "P" = plaatshouder (inhoud, O65).

**Home**
- Hero: sterk. De cookiebalk + de €1-popup samen bedekken op 1280 de halve laptop; laat de popup pas komen als de cookiebalk weg is.
- "Dit stuur jij, dit krijg je terug": de drie stappen hebben elk een andere beeldmaat (foto, grijs vlak P, drie shirts); het grijze vlak bij "Wij maken" is het gat dat opvalt.
- "Wat we maken": drie kaarten, goed. De kaartvoet (prijs + "vanaf") in 11,5 px mono is het kleinste op de pagina; één maat groter.
- "Kies een look": vijf grijze vakken (P) — dit is nu de lelijkste sectie van de site. Tot de foto's er zijn: deze sectie weg of alleen de twee looks met foto (Phone-made, Classic).
- "Een gezicht zit erbij": één gezicht + vier grijze vakken (P). Zelfde: toon de gezichten die er zijn, zonder lege vakken.
- Zwart Editions-blok met "Foto volgt": P, weg tot het bestaat.
- "Voor wie" + "Veelgestelde vragen": goed, rustig.
- "Eerst zien? Een product voor €1": goed, maar de €1-popup zegt hetzelfde 2.000 px eerder. Kies één.
- 390: 9.900 px lang; met de P-secties weg wordt het ±7.000.

**/pricing**
- Tabel + "Wat dat wordt" + "De kleinere posten": compleet, maar "De kleinere posten" is een lijst van zeven toeslagen in 12 px mono-labels. Een prijscalculator (B4) maakt deze sectie overbodig.
- "Elke maand nieuwe beelden?" en "Een product van jezelf" als twee banden achter elkaar: één band met twee knoppen.

**/catalog, /lifestyle, /video**
- Hero: de feitenstrook (4 feiten) breekt op 1280 bij lifestyle in drie regels ("Door ons gemaakt en nagekeken" / "elke visual"); korter label: "Nagekeken · elke visual".
- "Dit is een telefoonfoto. Dit is wat eruit kwam" (catalog): goed.
- Lifestyle "Het assortiment, in beweging": één foto + vier lege vakken (P).
- Lifestyle "Vier sferen": Dunes/Flash/Glow grijs (P), alleen Phone-made met foto. Zolang dat zo is: de looks als tekstkaarten zonder beeldvakken.
- "In de maak" (Stil/Studio/Nacht): mooie teaser, maar ook hier beloftes zonder datum.
- Video: hero-beeld laadt 1–2 s zwart (klanttype 7).

**/how-it-works, /studio (planning), /portal (Studio)**
- URL-namen kloppen niet met de inhoud: `/nl/studio/` is de planningspagina, `/nl/portal/` is de pagina over VISUAILS Studio. Niet nu veranderen (redirects, SEO), wel noteren voor als het menu wordt ingekort (B2).
- Planning-pagina: drie zwarte mock-ups van /admin boven elkaar; op 390 schalen de tabellen erin mee tot ver onder leesbaar. Vervang op mobiel door één uitsnede per mock-up.

**/start**
- Zes kaarten + "Of betaal er maandelijks" + "Wat er gebeurt nadat je erop drukt" + Merkmodel + "Nog niet zeker": vijf blokken die allemaal een keuze aanbieden. De keuzehulp (B3) bovenaan lost dit op; tot die tijd: Merkmodel en "Nog niet zeker" samenvoegen tot één band.

**/compare**
- Goed opgebouwd (tabel, "Wat op één lijn moet komen", "Waar een shootdag wint", self-serve). Lang (5.400 px) maar elk blok zegt iets anders. Laten.

**/faq** — 62 vragen in vier groepen; B5 (naar 20) staat in het concept.

**/gallery** — filters bovenaan goed; "Beam" (B7). Op 390 het raster van 2 kolommen goed.

**/contact, /about** — rustig. /about: portret P.

**/models** — tien gezichten in een raster, goed; "Jouw merkmodel"-band eronder goed.

**/upload-guidelines** — de laptop-mock-up bovenaan is hier het minst nuttige blok (hij staat ook op home en de dienstpagina's); "Wel doen / Vermijden" en de drie telefoonfoto's zijn het nuttigst — zet die direct onder de kop. De genummerde lijst "De set die we aanraden" (01–04) is een echte volgorde, prima.

**/per-product** — de vier shot-pictogrammen en de extra hoeken per rij: duidelijk. Het rasterblok "Op een model" en "Op de ondergrond" heeft elk een leeg grijs vierde vak (P-raster met drie items in vier kolommen): drie kolommen maken.

**/hooks, /editions** — "op aanvraag"/"binnenkort"-pagina's met P-koppen; in het menu als zodanig gelabeld, dat is eerlijk.

**/test-sample** — goed; de band "wat je krijgt" met vier beelden is het best verkopende blok van de site.

**Bestelformulier (/start/catalog)** — na ronde 8/9 in orde; alleen F-punten.

---

## 4 · Stijlzaken die op elke pagina terugkomen

1. **Kleine mono-kapitalen** (11,5 px, letterspacing .1em) als label op bijna elke kaart, feit en prijs: het is het DESIGN.md-"eyebrow"-patroon dat je zelf wilde beperken. Op 1280 oké, op 390 is het de kleinste tekst op het scherm en staat hij 30–40× per pagina. Advies: labels in Figtree 12,5 px zonder kapitalen, behalve de sectie-eyebrow.
2. **Twee knoppenstijlen per sectie** (zwarte pil + omlijnde pil) is consequent; op de donkere secties worden ze wit + omlijnd wit — ook goed. Alleen de paarse knop (BESTELLEN in de kop, "Vraag een eigen look aan") komt op sommige pagina's 3× voor en op andere 0×.
3. **Donker/licht-afwisseling**: licht paneel → zwart blok → licht paneel. Het ritme werkt, maar elke pagina eindigt met twee zwarte blokken (slotband + voet met het reuzenwoordmerk), samen 1.300 px zwart. Het reuzenwoordmerk in de voet kan de helft kleiner.
4. **Plaatshouders**: zie boven. Dit is het ene ding dat een bezoeker nu als "niet af" leest.

---

## 5 · Volgorde die ik zou aanhouden

1. Studio "Jouw maand" + statuspillen + nag-blok alleen bij relevantie + formulier inklappen (middel, geen besluit nodig, grootste winst).
2. Abonnee-kaart op het Studio-overzicht (klein).
3. /start/plan: stap 5 onder stap 4; bedrag incl. btw (klein).
4. /plans: popup uit, "Waarom" en "Wat eraan komt" weg, FAQ erin (klein–middel).
5. Plaatshouders op home en lifestyle verbergen tot de foto's er zijn (klein, jouw ja).
6. Besluiten: plan wijzigen en extra credits (groot), weekstart-mail (klein), Editions/Maandset tonen of niet.

De schets van 1 staat al klaar: **`kladblok/ronde-9/schets-jouw-maand.html`** — vier toestanden om aan te klikken (vóór de week, week loopt, geleverd, niets vastgezet), 1280 en 390. Zeg welke onderdelen je wilt, dan bouw ik 1 t/m 4 in de werkkopie.
