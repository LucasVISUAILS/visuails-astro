# Doorlichting visuails.com — bevindingen, oplossingen en wat er nu staat

Datum: 19 september 2026 · Omgeving: visuails.com (live, Mollie in testmodus) + lokale build van dezelfde code voor de schermafdrukken.
Ruwe bevindingen per pagina staan in `kladblok/doorlichting-2026-09-18.md`. Dit document is de uitwerking: per probleem wie er last van heeft, waarom het gebeurt, wat de oplossing is en of hij al in de code zit.

Legenda status: **GEDAAN** = zit in deze levering · **VOORSTEL** = uitgewerkt, nog niet gebouwd · **BESLUIT** = ik heb jouw keuze nodig.

---

## 1. Samenvatting

Zes klanttypen, zes proefbestellingen via hello@visuails.com (allemaal in Mollie-testmodus; zie §2). De site houdt stand: niemand loopt écht vast, er is geen enkel punt waar een bestelling niet kan worden afgemaakt. Maar er zijn drie soorten problemen die de klantervaring drukken:

1. **Geld- en statusfouten die vertrouwen kosten** — voorrang wordt betaald maar daarna overal vergeten (mail, Studio, admin), de samenvatting toont een ander bedrag dan de zijbalk, de bedankpagina zegt "bedankt" terwijl er nog betaald moet worden, en na een abonnementsbetaling van bijna €1.000 land je op een kale inlogpagina. → Allemaal **GEDAAN**.
2. **Onrust in het bestelformulier** — dubbele bedieningen, lege haarlijnen, een voorrangsblok dat als waarschuwing leest, een stappenbalk met een lege cel, scrollpositie die blijft hangen na "Verder", kale gegevensregels zonder labels. → **GEDAAN** (subtieler, wel duidelijk).
3. **Structuurkeuzes die jouw besluit vragen** — direct naar Mollie of eerst een bedankpagina; de kalender als rij van dagkaarten; aanvragen (video/custom) uit de planning; admin-tabel en referentie als link. → **BESLUIT / VOORSTEL** in §4.

Grootste verliesstap volgens /admin/funnel (30 dagen): **stap 1 → stap 2** van het bestelformulier (Catalog EN 38 → 11, Probeer EN 39 → 3). Dat is precies de stap die deze ronde rustiger is gemaakt; de tweede meting komt vanzelf uit de funnel.

---

## 2. Klanttypen en proefbestellingen

| # | Klanttype | Route | Referentie | Uitkomst | Waar het wrong |
|---|---|---|---|---|---|
| 1 | Starter, 1 product, bestaand account TEST | /start/catalog | VIS-7ENH-BMR (onbetaald) | Bestelling geplaatst | Bedankpagina zegt "bedankt" vóór betaling; kale gegevensregels in stap 3; scroll blijft hangen |
| 2 | Modemerk, 5 producten, model per product, **voorrang** | /start/lifestyle | VIS-JMYK-XMO (onbetaald) | Bestelling geplaatst | Samenvatting €410 vs zijbalk €492; voorrang kwijt in mail/Studio/admin; validatie 2000 px onder het veld |
| 3 | Groothandel, 20 producten, bulk-map, vaste leverdatum | /start/catalog | VIS-SJ93-NDK (onbetaald) | Bestelling geplaatst | Kalender toont hele maand zonder oktober; "we bevestigen vóór je betaalt" vs meteen betalen; opnieuw slepen = doorschuiven i.p.v. vervangen |
| 4 | Video-klant | /start/video | VIS-TYI4-XCL (aanvraag) | Aanvraag verstuurd | Bedank-/Studio-/admin-teksten behandelen een aanvraag als bestelling; "0 clips × Video" en "Eerst af: MORGEN" |
| 5 | Twijfelaar, €1 proef | /test-sample | VIS-VX60-HON (**betaald**) | Betaald | Terugkomst van Mollie zegt nergens "betaald"; oud V-logo op de Mollie-pagina |
| 6 | Abonnee Studio, maandelijks | /start/plan | SUB-YM3O-MYF (**betaald**, €955,90 test) | Abonnement loopt | Na betalen kale inlogpagina zonder één woord over de betaling |

Alle zes staan nog in /admin en in het Studio-account **hello@visuails.com** (bedrijf "Studio Proefmerk", verzonnen adres Voorbeeldstraat 12, 1234 AB Voorbeeldstad). Die mag je annuleren/opruimen — de proefbestellingen via de opruimknop, het testabonnement handmatig. Het account kun je laten staan; het is handig voor volgende rondes.

---

## 3. Per probleem: oorzaak en oplossing

### A. Bestelformulier — rustiger, even duidelijk

**A1. Voorrang bij levering leest als waarschuwing** (jouw screenshot)
- Wie: iedereen in stap 1. Een vette mono-kop in kapitalen, een checkbox en "+ €65" rechts — dat is de grammatica van een foutmelding, niet van een optie.
- Oorzaak: het blok zat in een `.field`, en `.field > label` zet elke label in de mono-kopstijl (kapitalen, letterspatiëring). De prijs stond in accentkleur.
- Oplossing **GEDAAN**: een rustig kader (haarlijn, hoeken van het formulier), de kop als gewone tekstregel op .98rem gewicht 500, het bedrag in stille mono rechts, de hint eronder op .84rem. Als je hem aanvinkt wordt de rand sterker en verschijnt "Wanneer kan het sneller?" ín het kader zonder eigen haarlijnen. Hij blijft op dezelfde plek en met dezelfde woorden, dus je mist hem niet — hij schreeuwt alleen niet meer.

**A2. Aantal heeft twee bedieningen** (jouw screenshot: − [ ] + én 1/5/10/20)
- Wie: iedereen in stap 1. Twee manieren voor één getal, naast elkaar, even zwaar getekend → "welke moet ik gebruiken?"
- Oplossing **GEDAAN**: de −/+ teller blijft de bediening; de vier getallen zijn nu stille tekst-snelkeuzes ("Snel: 1 5 10 20") met een onderstreping, waarvan de actieve een accent-onderstreping krijgt. Zelfde functie, één visuele hiërarchie. Alternatief dat ik níét heb gedaan: alleen de snelkeuze met een "ander aantal"-veld op klik — dat kost een extra klik voor 2, 3, 4 producten, en dat zijn juist de veel voorkomende aantallen.

**A3. Lege accordeonregel onder Beeldvorm / bij "Wanneer kan het sneller?"**
- Wie: iedereen zolang voorrang uit staat, en bij ≥20 producten altijd. Twee haarlijnen zonder inhoud tussen de velden.
- Oorzaak: `.dc-plain` tekent boven- én onderlijn; de laatste in een rij krijgt zo een dubbele lijn, en een verborgen uitklapper (hoogte 0) hield zijn lijnen.
- Oplossing **GEDAAN**: laatste `.dc-plain` zonder onderlijn; de uitklapper in het voorrangkader zonder eigen lijnen.

**A4. Stappenbalk met een lege vijfde cel**
- Oorzaak: raster van 5 kolommen voor 4 stappen (de vijfde, "Levertijd", bestaat alleen bij ≥10 producten).
- Oplossing **GEDAAN**: kolommen volgen het aantal zichtbare stappen (`grid-auto-flow: column`), verborgen stap doet niet mee.

**A5. Na "Verder" blijft de scrollpositie staan**
- Wie: iedereen bij elke stapwissel. Stap 3 is korter dan stap 2, dus je kijkt ineens naar "NOG NIET KLAAR OM TE BESTELLEN?" onder het formulier.
- Oorzaak: er wérd gescrold, maar met `behavior: smooth` — Chrome breekt een smooth-scroll af zodra de documenthoogte verandert, en die verandert precies op dat moment.
- Oplossing **GEDAAN**: na twee animatieframes (als de nieuwe stap staat) instant naar de stapkop.

**A6. Combi-balk ("Ook lifestyle erbij?") overlapt de knoppen / staat leeg bij lifestyle**
- Oplossing **GEDAAN**: de balk rendert alleen in stap 2 én alleen als er een combi-aanbod is.

**A7. "Zelfde"-modeltegel toont het oude V-beeldmerk**
- Oorzaak: `beeldBoven` viel terug op het merkteken als het gekozen gezicht "any" was.
- Oplossing **GEDAAN**: tegel zonder beeld krijgt een neutrale "="-tegel (zelfde als hierboven). Geen V meer in het formulier.

**A8. Opgeslagen gegevens in stap 3 als kale regels**
- Oplossing **GEDAAN**: drie/vier gegroepeerde regels — naam · merk / mail · telefoon · website / adres, postcode plaats, regio, land / "Btw-nummer: …" — met labels waar ze nodig zijn.

**A9. Betaaluitleg twee keer in stap 4**
- Oplossing **GEDAAN**: één zin: "Hier vul je geen kaartgegevens in — betalen doe je op de volgende pagina via Mollie (iDEAL of kaart)."

**A10. Hero van het bestelformulier vult het hele eerste scherm**
- Oplossing **GEDAAN**: de open-kop (`.of-open`) heeft nu een verticale maat van ±1.6–3rem in plaats van een vol scherm; het formulier begint direct onder de titel.

**A11. Looks in lifestyle-stap 1 getekend als vierkante checkboxes** (radio's)
- **VOORSTEL**: ronde radio-stijl of de hele kaart als keuze zonder vinkje. Klein CSS-werk, maar ik wil eerst je mening: de vierkante vorm is bewust "sectie 22"; een ronde radio breekt daar mee. Alternatief: geen vinkje, maar een sterke rand + "GEKOZEN"-etiket op de gekozen kaart.

**A12. Validatiefout 2000 px onder het veld ("Kies wie het draagt")**
- **VOORSTEL**: fout bij het veld zelf tonen én ernaartoe scrollen (zelfde mechaniek als A5). Of "Wij kiezen" echt voorvinken — dan is er nooit een fout. Ik zou het tweede doen: het is de aanbevolen keuze en de meeste klanten willen precies dat.

**A13. "Gedragen · optioneel" moet actief worden overgeslagen**
- **BESLUIT**: leeg = overgeslagen (alleen een zachte hint), óf zo laten omdat je wilt dat de klant er bewust over nadenkt. Mijn mening: optioneel dat een klik eist is geen optioneel; ik zou het loslaten.

**A14. 16 velden in stap 3 voor een nieuwe klant; "soort product" is één keuze voor 5 verschillende producten**
- **VOORSTEL**: soort per product hoort in stap 2 bij "Meer over dit product" (staat daar al deels); telefoon optioneel tenzij WhatsApp is gekozen; adres pas als facturatiegegeven onder een uitklapper. Dit is een grotere ingreep in de validatie (`verplichte-velden`- en `telefoon-verplicht`-tests) — eerst je akkoord.

**A15. Opnieuw slepen van dezelfde map = doorschuiven i.p.v. vervangen; "Bestanden (56)" bij 60**
- **VOORSTEL**: zelfde bestandsnaam op dezelfde kaart = vervangen met een melding "3 bestanden vervangen"; telling en bak gelijk trekken. Middelgroot werk in `ProductUploader`.

### B. Betaling en bevestiging

**B1. Bedankpagina zegt "Bedankt — we hebben je aanvraag" terwijl er nog betaald moet worden**
- Wie: klanttypen 1–3. Betalen is een tweede knop rechts; wie hier afhaakt denkt dat hij klaar is.
- Oplossing **GEDAAN**: kop wordt "Nog één stap: betalen." zolang de betaalknop er staat, en "Betaald — we gaan aan de slag." bij terugkomst van Mollie (ook voor de proef van €1, die nu op dezelfde bedankpagina met `?paid=` landt).
- **BESLUIT B1b**: de proef van €1 stuurt direct door naar Mollie; de gewone bestelling niet. Eén verhaal is beter. Mijn advies: gewone bestelling ook direct naar Mollie, met de bedankpagina alléén als landing ná betaling. Dat scheelt een scherm en de twijfel. Nadeel: wie op Mollie afhaakt, ziet de "betaal later via de link"-uitleg niet — die staat wel in de mail. Jouw keuze.

**B2. Voorrang betaald, daarna overal vergeten**
- Wie: klanttype 2 (en elke echte klant die de toeslag betaalt). Klantmail zei "Standaard levertijd", eigenaarsmail "Standard queue — no window, by design", Studio "Normale doorlooptijd", admin "wachtrij · zo snel mogelijk". De toeslag werd wél berekend.
- Oorzaak: `voorrang=1` zit alleen in `details_json` en werd alleen door de prijsberekening gelezen.
- Oplossing **GEDAAN**: één bron (`heeftVoorrang()` + `voorrangZin()` in pricing.js) en die overal gebruikt: klantmail ("Voorrang — we mikken op levering binnen 24 uur, of de toeslag komt terug"), eigenaarsmail (vette VOORRANG-regel), Studio-tijdlijn, admin-dashboard, planning, agenda-pil "voorrang · 24 u", "Eerst af"-lijst en orderpagina.

**B3. Samenvatting €410 vs zijbalk €492**
- Oorzaak: de samenvatting berekende de prijs zonder extra's en zonder voorrang.
- Oplossing **GEDAAN**: samenvatting gebruikt dezelfde `quoteFor()` + voorrangsbedrag als de zijbalk.

**B4. Abonnement: na €955,90 betalen een kale inlogpagina**
- Oplossing **GEDAAN**: `/plan/return` stuurt naar de inlogkaart met een groene statusregel "Je betaling is gelukt — log in om je abonnement te zien" (NL/EN). Automatisch inloggen na Mollie is niet veilig (Mollie-terugkeer is geen bewijs van identiteit), dus de code-mail blijft de stap.
- **VOORSTEL**: /start/plan mist de zakelijk-verklaring en het herroepingsvinkje die het bestelformulier wél heeft. Eén juridische set voor beide — kleine ingreep, maar juridisch wil ik dat jij hem afvinkt.

**B5. Kalender (≥10 producten) toont de hele maand, geen oktober, cel springt van 112 naar 56 px**
- **VOORSTEL**: alleen het kiesbare venster als rij van dagkaarten (bijv. 6 dagen) met "later →" om een week op te schuiven; vaste celhoogte. Daarmee kan een klant met een launch over drie weken wél kiezen. Middelgroot werk in de `Leverdata`-component en de slot-berekening.
- Tekst "we bevestigen de leverdatum voordat je betaalt" vs meteen betalen: **BESLUIT** — welke is waar? Als je altijd meteen laat betalen, moet de zin weg.

### C. VISUAILS Studio

**C1. Drie statuswoorden voor één toestand** (pil ONTVANGEN + "Nog niet betaald" + tijdlijn "Wacht op betaling")
- Oplossing **GEDAAN**: onbetaalde bestelling krijgt één status "Wacht op betaling" (pil in klei-kleur), overal.

**C2. Aanvraag (video/custom) behandeld als bestelling** ("We plannen hem in")
- Oplossing **GEDAAN**: eigen tekst "Dit is een aanvraag, nog geen bestelling. We antwoorden schriftelijk met een voorstel en een prijs — meestal binnen een werkdag." in Studio én op de bedankpagina (`?soort=aanvraag`), levertijd-rij verborgen.

**C3. 20 productregels volledig uitgeklapt met 20× "nog niets geleverd"**
- Oplossing **GEDAAN**: bij ≥7 producten zonder levering ingeklapt tot één regel "20 producten · nog niets geleverd" (uitklapbaar).

**C4. "1 producten"** → **GEDAAN** (enkelvoud).

**C5. /nl/account → Engelse 404**
- Oplossing **GEDAAN**: `/nl/account`, `/nl/account/*` → `/account?lang=nl` (301).

**C6. Facturen bij geannuleerde bestellingen zonder creditnota**
- **VOORSTEL** (belangrijk voor echte klanten): factuur pas aanmaken bij betaling, en bij annulering van een betaalde bestelling automatisch een creditnota (het creditnota-mechanisme bestaat al voor abonnementen, taak #243). Boekhoudkundig het netst; ik bouw het als jij het wilt.

**C7. "Bekijk de foto's" toont lege leverplaatsen, niet wat de klant stuurde**
- **VOORSTEL**: een blok "Wat je stuurde" met de eigen uploads per product boven de (nog lege) levering. Geruststellend voor de klant én handig als hij twijfelt of de goede foto's mee zijn.

**C8. Oud V-beeldmerk** op de abonnement-illustratie, het inlogscherm, FOTO-VOLGT-plaatshouders en het middelste lifestyle-voorbeeld
- **VOORSTEL**: neutrale plaatshouder (haarlijnraster) op al die plekken; formulier is al gedaan (A7). Zeg het en ik loop ze af.

### D. E-mails

**D1. Klantmail: "&rarr;" als rauwe tekst** → **GEDAAN** (`htmlToText` kent nu →, ←, … en numerieke entiteiten).
**D2. Klantmail zonder look en modelkeuzes; "kijk in je spam" ín de mail** → **VOORSTEL**: kies-samenvatting (look, gezicht per product, voorrang) in de mail; spam-zin alleen op de bedankpagina.
**D3. Eigenaarsmail: Engelse onderwerpregel, sleutel-waarde-dump ("tier unattended", "model c4"), 10 MB bijlagen** → **VOORSTEL**: leesbare labels (Fiye i.p.v. c4), bijlagen als links naar de orderpagina. De VOORRANG-regel is al gedaan.

### E. /admin

**E1. Orderpagina mist model per product, bericht van de klant, voorrang**
- Oplossing **GEDAAN**: "Wat de klant koos" toont nu gezicht met naam, een regel per product (model + productsoort), Levering (voorrang) en het bericht van de klant. Je kunt zien wat er gemaakt moet worden zonder de JSON te openen.

**E2. Tabel scrolt horizontaal op 1424 px; referentie is geen link**
- **VOORSTEL**: referentie = link naar de orderpagina (de rij-summary blijft voor status/annuleren); kolommen Bestanden en Klant samenvoegen zodat de tabel op 1280 past. Klein werk, maar de dashboardkaders-test kijkt mee.

**E3. Video-aanvraag telt als "0 clips × Video" en staat in "Eerst af: MORGEN"**
- Aantal → **GEDAAN** (leest de clips uit `details_json`).
- Aanvragen uit planning en btw-controle → **VOORSTEL**: `details.request` uitsluiten in de planning-, agenda- en btw-query's; aparte lijst "Aanvragen" op het dashboard.

**E4. Taalmix** ("Note (optional…)", "SAVE", "5 products") → **VOORSTEL**: laatste Engelse resten in admin.js vertalen (de `admin-taal`-test mag strenger).

**E5. Planning vs Agenda overlappen** → **BESLUIT**: samenvoegen tot één scherm met twee standen, of laten. Mijn mening: samenvoegen; twee schermen met bijna dezelfde data zijn een bron van "waar stond dat ook alweer".

### F. Publieke pagina's

**F1. Navigatie breekt woorden af ("PRIJ-ZEN", "GALE-RIJ"); H1 "CAM-PAGNE" op 1424** → **GEDAAN** (`hyphens: manual` op nav en op koppen vanaf 60rem breed).
**F2. Telefoon: tabelkoppen en beeldvorm-bijschriften braken per letter** → **GEDAAN** (geen `overflow-wrap: anywhere` op th/td/etiketten; beeldvormen op telefoon als strook).
**F3. /catalog herhaalt de prijs vijf keer; 12.300 px lang** → **VOORSTEL**: prijs één keer in de hero-feiten en één keer bij de slot-CTA; tabel en "Wat er verandert bij 10" samenvoegen. Pagina wordt 30–40 % korter. Dit raakt de tekstkeuzes van de dienstpagina's, dus ik wil dit met je bespreken voordat ik snoei.
**F4. Video adverteert "vanaf €69 per clip" met bestelknoppen, maar is een aanvraag** → **BESLUIT**: "op aanvraag" op de deur, of het bestelformulier openzetten.
**F5. Mollie-checkout toont het oude V-logo** → dit staat in je Mollie-profiel (Instellingen → Profiel → Logo); ik kan daar niet bij. Nieuw logo: `images/Logo/visuails-logo` (lime-versie).
**F6. "Een schriftelijk antwoord van Lucas"** — enige plek met een voornaam → **VOORSTEL**: "van een specialist", conform de rest.

---

## 4. Je besluiten van 19 september, en wat ermee gebeurd is

| # | Jouw besluit | Status |
|---|---|---|
| 1 | Gewone bestelling direct naar Mollie; de VIES-/btw-controle moet intact blijven | **GEDAAN.** Elke bestelling met een betaallink gaat nu meteen naar de Mollie-checkout. De btw-poort staat er los van: een adres buiten de EU, een VIES-antwoord dat uitbleef of een verlegging zonder verklaring krijgt géén betaallink en landt op de bedankpagina met "we kijken er eerst naar" — jij keurt goed in /admin/vat (met het land van het ip ernaast), en dan pas gaat de betaallink per mail. Dat is precies de handmatige controle die je wilde, en hij wordt nu niet meer omzeild door een klant die de betaalknop op de bedankpagina indrukte voordat jij gekeken had. Twee dingen erbij: een bestelling van 10+ producten die géén datum kon kiezen (agenda vol) blijft op de bedankpagina met de link (eerst samen inplannen), en een terugkeer van Mollie wordt nu écht gecontroleerd — Mollie stuurt óók terug als de betaling mislukte, dus de bedankpagina vraagt /api/order-status en zegt pas "Betaald" als de webhook het bevestigt; anders "De betaling is niet afgerond" met een knop "Opnieuw betalen" (verse checkout via /api/order-pay). |
| 2 | "Gedragen" écht optioneel | **GEDAAN.** Leeg vakje = overgeslagen; "Sla deze over" blijft bestaan voor wie het expliciet wil zeggen. |
| 3 | Kalender als rij dagkaarten met "later →"; betalen meteen | **GEDAAN.** Zes dagkaarten van vaste maat (weekdag, dag, maand, "– wo 23" voor de tweede dag), "← Eerder" / "Later →" per zes dagen tot 60 dagen vooruit; de agenda-API kreeg een `from`-parameter. De zin "bevestigen voordat je betaalt" is overal vervangen door "een leverdatum die we voor je vastleggen zodra je bestelling binnen is". |
| 4 | Planning en Agenda samenvoegen | **GEDAAN.** /admin/planning is het ene scherm: raster + aflopende lijst met de filters (Alles / Vastgelegd / Zo snel mogelijk / Voorrang) en "Dagen dichtzetten" onderaan (#dagen). /admin/agenda stuurt door. Bijvangst: de bezettingsbalkjes in het raster stonden altijd op nul, want het paneel verbiedt inline `style` (CSP) — nu via een data-attribuut. |
| 5 | Video op aanvraag + placeholders | **GEDAAN.** Eén schakelaar `VIDEO_OP_AANVRAAG` in pricing.js. Aan: voorpagina, /start, /video en /pricing zeggen "op aanvraag" i.p.v. het bedrag; op /video hebben Motion en Lifestyle Video geen bestelknop en een "clip volgt"-plaat (dezelfde vorm als een lifestyle-look zonder foto). Zet hem op `false` zodra de pijplijn staat en alles komt terug. De FAQ noemt de clipprijs nog wel — die tekst is een feit over de prijs, geen deur; zeg het als je hem ook weg wilt. |
| 6 | Lifestyle-looks: kies voor mij | **GEDAAN — rand + etiket.** Het vierkante keuzerondje (dat als checkbox las) is onzichtbaar maar blijft bestaan voor toetsenbord en schermlezer; de gekozen kaart krijgt een inktrand, de accenttint en "GEKOZEN" naast de naam. Past bij sectie 22; een rond rondje zou het enige ronde element op de site zijn. Erbij: een fout ("Kies eerst een look", "Kies wie het draagt") staat nu bij het veld zelf én het veld komt in beeld — niet meer 2000 px lager. |
| 7 | Factuur pas bij betaling + creditnota bij annulering | **GEDAAN / al zo.** Facturen werden al pas uitgegeven als de betaling het bedrag dekt (de PROEF-facturen op geannuleerde bestellingen waren betaalde proefbestellingen). Wat ontbrak: bij annuleren met "tegoed voor een volgende bestelling" kwam er geen creditnota tegenover de factuur — nu wel, automatisch. Bij "terugbetalen" komt hij zodra jij in Mollie terugbetaalt (webhook), bij "geen restitutie" blijft de factuur staan. |
| 8 | /catalog, /lifestyle, /video korter | **DEELS.** −20 % / −17 % / −12 % op 1440 (TierCompare-blok weg, stappen + checklist samengevoegd, FAQ tot vijf met link, dubbele shot-kaarten weg, look-rijen compacter, paneelpadding 5 → 4 rem sitebreed). De rest van de 30–40 % zit in secties met jouw eigen betoog — de "kamer"-uitleg, het bewijs, de assortiment-galerij. Zeg welke mogen. |

---

## 4b. Het abonnement — herontworpen

Zie `kladblok/abonnement-doorlichting.md` voor de dertien bevindingen en het volledige ontwerp. In het kort: drie tijdverhalen zijn er één geworden (je vaste week; "eerder nodig" als enige uitzondering), vijf tabben zijn er drie (Overzicht · Producten · Facturering), de twaalf plus-tegels zijn de gemaakte en vastgezette kaders plus één tegel "8 vrij", de week is een zin met echte datums, de vaste look staat als één regel op het overzicht, en het productvak vraagt nu hetzelfde als het bestelformulier (soort, voorkant/achterkant/detail/gedragen, meer foto's) met de eigen foto als miniatuur en "Foto's toevoegen" op elk concept. /start/plan vraagt nu ook de twee verklaringen (migratie 0049 — draai die mee). Het oude V-merk is weg uit de Studio-zijbalk, de plaatshouders en de factuur-pdf.

**Wat ik bewust níét heb gebouwd** (mijn advies: volgende ronde): het bestelformulier zélf als bestelpad voor het abonnement (model per product, hoeken, beeldcontrole) — de echte eindvorm, maar een plan-tak in /api/order met ~10 tests.

## 4c. Compacter, sitebreed

- **Voorpagina, "Van jouw foto naar je shop"**: van vier stations om en om licht/donker (2.293 px) naar één licht paneel met vier kolommen (689 px). Zelfde beelden, zelfde woorden.
- **Voorpagina, tarieven**: de twee tabellen (prijsladder én abonnementen — letterlijk dezelfde als op /pricing en /plans) zijn één strip: per soort de vanaf-prijs en tot waar hij zakt, één regel voor de drie abonnementen, en de knoppen naar /pricing en /plans.
- **Sitebreed**: paneelruimte 5 → 4 rem (bovengrens), look-rijen compacter.
- **Nog te bekijken, met jouw akkoord**: /custom-models (10.400 px, tien secties — de rekensom en de standaardbibliotheek zijn dubbel met /pricing en /models), /how-it-works ("Je bestelling, van begin tot eind" is 2.800 px), /plans ("Wat een abonnement eigenlijk is" + "En twee dingen die eraan komen").

---

## 5. Tweede lijst — wat ik verder heb gecontroleerd

Na de zes bestellingen heb ik voor mezelf een tweede lijst gemaakt van dingen die je niet ziet als je alleen "bestelt". Uitslag:

| Controle | Uitslag |
|---|---|
| Leesbaarheidsvloer (.72rem / 11,5 px) in de gewijzigde bestanden | 15 regels zaten eronder (kalender-weekdagen .64, bijschriften .68, Studio-badges .6–.68) → allemaal op .72rem gezet |
| Koppeltekens in navigatie en koppen (958 / 1424 breed) | Weg; H1 breekt nu op woordgrens |
| Telefoon 390 px: tabellen, beeldvormen, horizontale overloop | Geen overloop (0 px), geen per-letter-afbrekingen |
| Bedankpagina in drie toestanden (nog betalen / betaald / aanvraag) | Kop en tekst volgen de toestand; vinkje alleen bij "Betaald" |
| /nl/account, /nl/account/… | 301 naar Studio met taal; de build heeft nu ook een Nederlandse 404 (`nl/404.html`) |
| `_redirects`: elke bestemming bestaat | Test aangescherpt (leest `?lang=` niet als pad) — 20/20 |
| Combi-balk op lifestyle | Rendert niet meer zonder inhoud |
| Stappenbalk bij 1 product | 4 cellen, 4 kolommen |
| Volledige testbank (143 scripts) | Groen; build groen |
| E-mails na de fixes (voorrang-regel, entiteiten) | In de code getoetst (`order-api`, `mailtaal`, `request-flow`); een échte mail met voorrang komt pas bij de volgende proefbestelling op live — die zou ik na deploy nog één keer doen |
| Factuur-PDF, mislukte betaling (Mollie "failed"/"expired"), abonnementsincasso, SEO/robots/sitemap, snelheid | Mislukte betaling: nu gedekt (bedankpagina controleert via /api/order-status, "Opnieuw betalen" via /api/order-pay — 156 tests in `request-flow`). Factuur-PDF: watermerk uit, test aangepast. De rest: bestaande tests dekken herinnering, incasso en robots; snelheid niet opnieuw gemeten |

**Erbij in de tweede ronde (19 september, na je besluiten):**

| Controle | Uitslag |
|---|---|
| Dagkaarten: bladeren "← Eerder / Later →", keuze blijft staan na bladeren, geen verkeerd gemarkeerde kaart | Gecontroleerd met een nagebootste agenda (`kladblok/_dagen.mjs`): keuze blijft, één kaart gemarkeerd, "Eerder" verdwijnt op de eerste pagina |
| Bedankpagina na een mislukte Mollie-terugkeer | "We controleren je betaling…" → na vier pogingen "De betaling is niet afgerond" + knop; bij betaald "Betaald" met vinkje; bij een aanvraag geen vinkje |
| /api/order-pay: alleen onbetaald, niet geannuleerd, btw goedgekeurd, bedrag > 0; 10 per uur per ip | 3 bestellingen in de test: betaalbaar → 302 Mollie; betaald → 302 bedankpagina; buiten de EU zonder goedkeuring → 302 bedankpagina |
| Studio-abonnement na het herontwerp (drie tabben, kaders + "vrij", weekzin, lookstrip, productvak met vier fotovakken, oude links) | `studio-vorm` 133/133, `planfotos` 25/25; schermen bekeken via `kladblok/studio-schermen.mjs` |
| /start/plan zonder verklaringen | Terug naar het formulier met de fout "verklaring"; met beide vinkjes door naar Mollie |
| Leesbaarheidsvloer in de nieuwe CSS (dagkaarten, tariefstrip, lopende band, Studio-tegels) | Alles ≥ .72rem; de mono-regels op de tariefstrip .72–.78rem |
| Nieuwe voorpagina-secties (band en tariefstrip) en de plaatshouder met kruis op 1200/1440 | Bekeken op het scherm: band 689 px, strip drie kolommen + abonnementsregel; plaatshouder toont dun kruis en "FOTO VOLGT", geen V |
| Admin-planning: filters, "Dagen dichtzetten", bezettingsbalk zonder inline style | `admin`, `planning-scherm`, `agenda-dagen` groen; CSP-veilig |
| Volledige testbank na de laatste wijzigingen | Zie §6 |

---

## 6. Wat er in deze levering zit (ronde 2, 19 september)

**Bestellen en betalen**: `functions/api/order.js` (direct naar Mollie; uitzonderingen: venster verloren, 10+ zonder datum), `functions/api/order-status.js` (`paid`/`payable`), `functions/api/order-pay.js` + `src/pages/api/order-pay.js` (nieuw), `functions/api/capacity.js` + `src/data/capacity.js` (`from`, `earlier`, `more`), `src/scripts/pipeline.js` (dagkaarten, fout bij het veld), `src/scripts/interactions.js` (bedankpagina controleert de betaling), `ThankYouPage.astro`, `order/OrderFlow.astro`, `order/StylePicker.astro`, `src/data/shots.js` (gedragen optioneel)
**Abonnement**: `src/lib/account.js`, `src/pages/account/plan.astro`, `src/styles/studio.css`, `functions/api/plan.js`, `src/lib/subscribe.js`, `order/PlanPicker.astro`, `migrations/0049-abonnement-verklaringen.sql` + `schema.sql` (**draai 0049 mee**), `layouts/StudioLayout.astro` + `src/data/wordmarkPath.js` (woordmerk i.p.v. V), `studio/Plaatshouder.astro`, `Placeholder.astro`, `src/lib/invoicePdf.js` (watermerk uit)
**Admin**: `src/lib/admin.js` (planning + agenda samengevoegd, creditnota bij tegoed), `public/admin.css`
**Video op aanvraag**: `src/data/pricing.js` (`VIDEO_OP_AANVRAAG`, `videoPrijsLabel`, nieuwe leverzinnen), `Voorpagina.astro`, `StartPage.astro`, `VideoPage.astro`, `PricingPage.astro`
**Compacter**: `LopendeBand.astro`, `Voorpagina.astro` (tariefstrip), `CatalogPage.astro`, `LifestylePage.astro`, `VideoPage.astro`, `StyleRows.astro`, `src/styles/stijl22.css`
**Tests**: `account-brand-kit`, `admin`, `agenda-dagen`, `invoice-pdf`, `order-api`, `planning-scherm`, `promises`, `request-flow`, `studio-vorm`, `uploadbelofte`
**Gereedschap/notities**: `kladblok/abonnement-doorlichting.md`, `kladblok/secties-meten.mjs`, `kladblok/studio-schermen.mjs`, `kladblok/vellen-c.mjs`, `kladblok/_dagen.mjs`, `kladblok/_lb.mjs`, `kladblok/_lk.mjs`, `kladblok/_ph.mjs`

Testbank: alle 143 scripts groen na de laatste wijziging (o.a. request 156/156, order 102/102, studio 133/133, planfotos 25/25). Build groen. Niet gepusht — dat doe jij vanuit je eigen map.

---

## 7. Ronde 3 — de diepere snoei, en /start

Lucas: *"Diepere snoei op /catalog e.d., /custom-models, /how-it-works, /plans doorvoeren. Zorg ervoor dat alles consistent is."* En daarna: *"Op de dienstkaarten ga je gelijk naar het bestelformulier … Je moet altijd eerst een style kiezen … tegels compacter … foto's klikbaar."*

### Gemeten op 1440 (hoogte hele pagina)

| Pagina | Oorspronkelijk | Na ronde 2 | Nu | Wat eruit ging |
|---|---|---|---|---|
| /catalog | 12.304 | 9.901 | 8.349 (−32 %) | De donkere kamer "Catalogfotografie: zo duidelijk…" (plaatshouder + Wat het is + Waar je het gebruikt). "Waar je het gebruikt" staat als één regel onder de checklist. |
| /lifestyle | 13.207 | 11.019 | 8.877 (−33 %) | Zelfde kamer weg; de vier sferen staan twee naast elkaar (looks-sectie 3.911 → 2.690). |
| /video | 10.359 | 9.094 | 7.611 (−27 %) | Zelfde kamer weg (de merkmodel-regel staat nu onder de stappen); looks twee naast elkaar. |
| /custom-models | 10.395 | — | 7.216 (−31 %) | De rekensom (dubbel met /pricing) → één regel + link; de kamer "Eén look door alles" → één regel "Waar je het gebruikt"; de kamer "Waarom niet zelf een generator" → één zin + link naar /compare#ai-tools; het richtingenblad-plaatshouder weg; "Wat jij stuurt / wat je terugkrijgt" in de processectie; de standaardbibliotheek zonder de drie portretten (die staan op /models), anker #standard blijft. Tien secties → zeven. |
| /how-it-works | 8.169 | — | 7.559 (−7 %) | De zes stappen in twee kolommen (2.777 → 2.167). De rest van de pagina is al kort per sectie; verder snoeien betekent secties schrappen — zeg het als je "Nog een vraag?" of de kamer met de formaten kwijt wilt. |
| /plans | 7.280 | — | 6.154 (−15 %) | De kamer zonder Note/WhatsApp-vraag en in Studio-woorden ("producten", niet "credits/plekken"); "En een maand die al gevuld is" + "En twee dingen die eraan komen" → één sectie "En wat eraan komt" met drie kolommen (anker #binnenkort en #editions blijven). |

### Consistent gemaakt (het oude verhaal "bevestigd voordat je betaalt" stond nog op zeven plekken)

- /how-it-works: de belofte boven de doorloop is nu *"Je ziet alleen dagen die de agenda nog kan vasthouden"*; stap 03 heet *"Je kiest een leverdatum"* (jij, in het formulier) en stap 04 *"Je betaalt, en dan start de productie"* (jij, meteen — de laatste stap brengt je naar de checkout; buiten de EU eerst de btw-controle en dan de link per mail). Ook de meta-omschrijving.
- /pricing: dezelfde belofte in twee zinnen.
- /start, "Wat er gebeurt nadat je erop drukt": *"Je betaalt aan het eind, in de checkout"* en *"De leverdatum kies je zelf"* (stond: "in het formulier wordt niets afgeschreven" / "staat vast vóór je betaalt").
- FAQ "Wat als de week die ik nodig heb niet kan?": je ziet die dagen niet in het formulier.
- Bedankpagina bij een aanvraag: "meestal binnen 24 uur" (geen werkdag-belofte meer).
- **Het V-beeldmerk stond nog in de bovenbalk van de site** (en op live — zie je schermafdruk). Nu het woordmerk, zoals Studio en de voettekst. De favicons zijn nog van de V gemaakt — dat is een nieuw bestand maken en dat doe ik niet zonder jou; zeg wat het moet worden (de letters "VI" uit het woordmerk is het minste).

### /start

- **Eerst een look, dan het formulier.** "Start deze bestelling" bij Catalog en Lifestyle gaat naar `/catalog#looks` en `/lifestyle#looks`: de look-sectie ("Stap 1 · kies je look") waar "Kies deze look" het formulier opent met de look al ingevuld. Dezelfde regel voor de bestelknoppen op /catalog, /lifestyle, /per-product en in `orderDoors.js`. Een anker landt niet meer onder de plakkende balk (`scroll-margin-top`). Het formulier zelf (`/start/catalog`) blijft bereikbaar met een eigen look-stap als iemand er rechtstreeks komt.
- **Tegels compacter**: de lange beschrijving is van de kaart (staat op de dienstpagina), 16:10-beeld, tarief en knoppen in één voet, kleinere knop; 700 → 520 px per tegel, de pagina 6.900 → 5.550.
- **De foto is de knop**: dezelfde bestemming als "Start deze bestelling" (buiten de tabvolgorde — de knop is er al voor het toetsenbord).
- Bijvangst: het productetiket op de kaart stond op .62rem (onder de vloer) → .72rem.

Testbank na ronde 3: 143 scripts, 6.465 controles, alles groen (één test aangepast: `nav.test.mjs` keek 4.000 tekens voorbij #binnenkort en viel nu op de knop van het slotpaneel — hij kijkt nu tot het einde van de sectie, wat de eis altijd was). Telefoon 390: geen horizontale overloop op de acht pagina's.

---

## 8. De proef: € 1 exclusief btw

Lucas: *"Bij test sample wordt btw niet verrekend op de 1 euro maar het is 1 euro inclusief btw op dit moment. Fix dit."*

Was: `quoteTestSample()` rekende van bruto naar netto (€ 0,83 + € 0,17 = € 1,00) en `createTestSampleMolliePayment()` stuurde `AMOUNT.testSample` zelf naar Mollie — dus altijd precies € 1,00, btw erin. Nu: dezelfde regel als elk ander bedrag op de site — € 1 is netto, de btw gaat erover, en Mollie vraagt het bruto uit de offerte: **€ 1,21** voor een Nederlandse klant, € 1,00 bij verlegging of buiten de EU. De Mollie-aanroep weigert nu een aanroep zonder dat bruto, zodat niemand stilletjes weer € 1,00 kan afschrijven tegenover een factuur van € 1,21.

Meegenomen: "excl. btw" bij het bedrag in het proefformulier en in de kleine letters op /test-sample; de bedankpagina bij een tweede proef zegt "het betaalde bedrag" (niet meer "de € 1") komt terug; §9 van de voorwaarden (EN/NL) zegt nu € 1 exclusief btw én dat een gewone bestelling direct bij het afrekenen wordt betaald (dat stond er nog als "via een betaallink in Studio"). Tests `sample-invoice` (83) en `geldroute` (74) herschreven op de nieuwe verdeling; volledige testbank groen.

---

## 9. Ronde 4 — Studio als bestelpad, de poort op de look, de week, FAQ, band, Stripe

### Het merk (rechtgezet)
Op 5 september stond genoteerd dat het V-teken niet meer gebruikt zou worden; daarop zijn in ronde 2 en 3 de V uit de Studio-zijbalk, de plaatshouders, het factuur-watermerk en de bovenbalk gehaald. Lucas' eigen logopakket (`images/Logo/visuails-logo/png-tegel`, 5–8 september) ís dat teken, en op 19 september vroeg hij er een zwart-op-groen-versie van. Dus: de V staat weer in de bovenbalk; de favicon-set in `public/` is opnieuw gesneden uit hetzelfde pad in **bijna-zwart op gifgroen** (`scripts/make-favicons.mjs`, `ACTIVE = 'b2'`, 13:1 in plaats van 1,45:1 op 16 px); zes tegels `visuails-tegel-zwart-op-groen-*.png` staan naast zijn originelen (alleen het wit is #111111 geworden, vorm en ronding onaangeraakt). Studio-zijbalk (woordmerk), plaatshouders (kruis) en factuur (geen watermerk) zijn zo gelaten — zeg het als de V daar ook terug moet.

### Studio als bestelpad voor abonnees (`src/lib/vasteLook.js`, nieuw)
Wat er mis was: de bestelling die uit een abonnementsweek ontstond droeg géén achtergrond, look, gezicht of verhouding — de studio moest het opzoeken, terwijl het scherm beloofde "zonder dat wij je nog iets hoeven te vragen".
- **De vaste look gaat mee in de bestelling** (`planStart.js`): `style`, `background_hex`/`background`, `ratio`, `model`, `channels` — dezelfde sleutels als het bestelformulier, dus /admin en de werkmap lezen hem als elke andere bestelling. Bij een complete bundel staan de catalog- en lifestylekant apart (`ratio_catalog`/`ratio_lifestyle`, `model_catalog`/`model_lifestyle`); /admin toont ze als "per dienst".
- **Gezicht per product** (migratie **0050**, `plan_queue.model`): in het productvak een keuzelijst (volg de vaste look · eigen merkmodellen · bibliotheek) en op elke conceptregel te wijzigen; gaat als `model_pN` mee, precies zoals het formulier. De soort slot gaat mee als `kind_pN`.
- **Meteen vastzetten**: één vinkje op het productvak — toevoegen én vastzetten in één keer; kan het niet (foto's, look, slot, abonnement), dan staat het product als concept op de lijst met de reden bovenaan.
- **Vastzetten alleen als de look gezet is** (`queueLock()`): catalog = een achtergrond, lifestyle = een huisstijl, video = de kaart bestaat. De knop staat uit en de regel zegt "Leg je look vast voor Lifestyle →" met de link naar precies die kaart (`/account/brand-kit#bk-lifestyle`). De lookstrip op het overzicht zegt niet meer "niet gezet — wij kiezen" maar "nog niet gezet →". De brand-kit-kaart telt "af" nu met dezelfde maat als de poort.
- **Week verzetten door de klant** (`POST /account/plan/week`): keuzelijst 1–28 op het overzicht; ondergrens drie dagen als de nieuwe start nog deze maand valt; bevestiging op het scherm en een mail naar de studio (`notifyPlanWeekMoved`). Wat al op een dag gepland stond blijft staan.
- Niet gedaan, bewust: extra hoeken en 4K per product in het abonnement — dat zijn betaalde extra's per bestelling en het abonnement heeft daar geen prijs voor. Jouw besluit als je ze wilt (meerprijs per slot, of inbegrepen in Merk).

### /how-it-works (aanbeveling doorgevoerd)
"Nog een vraag?" is een regel onder het slot (met de gidsen-link); "De details die ertoe doen" van vijf naar drie kolommen (consistentie en de twee ingangen stonden al elders); de kamer "Eén bestelling, overal" van acht blokjes naar acht regels in twee kolommen.

### FAQ — fout of verouderd, rechtgezet
- "Elk plan kost minder dan dezelfde hoeveelheid op de prijs per product" — **onwaar** (12 catalogsets los €612 tegen Studio €790). Nu: minder dan dezelfde *complete* levering, en een catalogbestelling blijft los goedkoper; plus de vaste week.
- Video "Wat kost een clip? €69" terwijl de pagina's "op aanvraag" zeggen — volgt nu dezelfde schakelaar `VIDEO_OP_AANVRAAG`.
- "Staat onder 'Deze maand' bij je abonnement" — die tab bestaat niet meer; nu "op het overzicht".
- "plus een korte notitie over de look" — het formulier laat je een look kíezen.
- Engels: "a person checks every visual" (drie plekken, plus AI Act-pagina, /custom-models, /catalog) → "a specialist", zoals in het Nederlands.
- Gecontroleerd en klopt: proef excl. btw, 4K alleen bij lifestyle, verhoudingen per dienst (catalog 1:1/4:5/3:4, lifestyle + 16:9/9:16), leverdatum-verhaal, btw/VIES, bewaartermijnen, hooks/editions "niet te bestellen".

### Homepage-band
Stap 04: de drie vormen staan op één grondlijn met hun echte verhouding (de staande het hoogst), de maat als etiket ín het beeld, en "shop · advertentie · reel" in dezelfde etiketregel als stap 01 en 02. De etiketregels van 01 en 02 waren ook aan het breken ("3 van 5 foto's · telefoon") — ingekort en op één regel gehouden. Op de telefoon vullen de vormen de kolom.

### Stripe eruit
Verwijderd: `src/lib/stripe.js`, `functions/api/webhook/stripe.js`, `src/pages/api/webhook/stripe.js`, `tests/stripe-webhook.test.mjs`, het script `test:stripe`, de twee STRIPE-regels in het admin-diagnosescherm en in de beveiligingstest; docs (WORKER.md, BACKEND-SETUP.md, wrangler.toml) bijgewerkt. De kolommen `payment_provider`/`provider` in de database blijven (oude rijen kunnen 'stripe' zeggen; niets schrijft het nog).
**Wat jij nog doet:** (1) in Cloudflare de secrets weghalen — `npx wrangler secret delete STRIPE_SECRET_KEY` en `npx wrangler secret delete STRIPE_WEBHOOK_SECRET` (alleen als je ze ooit gezet had); (2) in het Stripe-dashboard het webhook-endpoint `…/api/webhook/stripe` verwijderen of uitzetten, anders blijft Stripe 404's krijgen; (3) niets in Mollie.
