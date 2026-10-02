# Concept ronde 9 — voorstellen om te kiezen

Niets hiervan is gebouwd. Per voorstel: wat, waarom, wat het kost, een schets, en wat ik zou doen (met een alternatief). "Kost" is werk in de code plus wat het jou kost (inhoud, besluiten, risico). Kies per regel: **ja / nee / later / anders**.

Volgorde: eerst wat geld of vertrouwen raakt, dan wat de site korter en duidelijker maakt, dan het kleine werk.

---

## A · Geld en vertrouwen

### A1 · Mail vóór de beelden verdwijnen (O56)
- **Wat:** 7 dagen voor de 90-dagentermijn één mail: "Je beelden van VIS-… staan nog 7 dagen in Studio — download ze nu." Met één knop naar de zip.
- **Waarom:** /privacy belooft dat ze na 90 dagen weg zijn; nu hoort de klant het alleen als hij toevallig in Studio kijkt. De eerste "waar zijn mijn foto's?" is een gesprek dat je liever niet voert.
- **Kost:** klein (nachtelijke taak + één mailtekst NL/EN + test). Hangt samen met O55: zonder PURGE_ENABLED wordt er niets gewist, dus eerst dat besluit.
- **Schets:** `Je beelden staan nog 7 dagen klaar · VIS-8ALM-6I7 · [Alles downloaden (zip)] · Daarna verwijderen we ze, zoals afgesproken.`
- **Advies:** ja, samen met PURGE_ENABLED aan. Alternatief: de termijn naar 12 maanden en geen mail — kost R2-ruimte en de privacytekst moet mee.

### A2 · Tevredenheidsherinnering (staat in de opdracht, bestaat niet)
- **Wat:** wie na levering 5–7 dagen geen score gaf en nog geen reviewknop aanklikte, krijgt één korte mail met de vijf cijfers als knoppen. De kolommen staan er al (migratie 0020, "iteratie twee").
- **Waarom:** de score is je enige signaal of iets misging vóór de klant wegloopt, en de bron van je reviews.
- **Kost:** klein–middel (nachtelijke taak, mail, één klik = score opslaan via een getekende link, test). Geen review gating: dezelfde knoppen voor iedereen.
- **Schets:** `Hoe tevreden ben je met VIS-…? [1] [2] [3] [4] [5]` — één klik, klaar.
- **Advies:** ja. Alternatief: alleen een regel in de levermail (bestaat al) en niets na.

### A3 · "Deel terugbetalen" in /admin (O53)
- **Wat:** op de bestelpagina een knop met bedrag en reden → Mollie-restitutie voor dat bedrag. De webhook boekt het al en maakt de creditnota.
- **Waarom:** nu moet je voor een gedeeltelijke terugbetaling naar het Mollie-dashboard; het geld klopt daarna, maar de handeling zit niet waar je werkt.
- **Kost:** klein (formulier + één Mollie-aanroep + bevestiging met bedrag overtypen). Raakt geld → bevestiging verplicht.
- **Advies:** ja. Alternatief: laten zoals het is en in /admin een link "Terugbetalen in Mollie" naar de juiste betaling.

### A4 · Geen 401 in de console voor bezoekers (O60)
- **Wat:** een klein cookie `vis_in=1` (geen inhoud, alleen "er is een sessie") dat bij inloggen gezet en bij uitloggen gewist wordt. Zonder dat cookie vraagt de site /account/me niet.
- **Waarom:** elke nieuwe bezoeker krijgt nu een rode fout in de console (telt mee in Lighthouse) en kost een Worker-aanroep plus een D1-schrijfactie.
- **Kost:** klein, maar raakt inloggen; het cookie moet op /cookie-policy (functioneel, geen toestemming nodig).
- **Advies:** ja, laag risico. Alternatief: laten — het werkt, het is alleen ruis.

---

## B · De site korter en duidelijker

### B1 · Vaste "zo werkt het in 4 stappen"
- **Wat:** één blok dat overal hetzelfde is (home, catalog, lifestyle, prijzen, /start): **1 Je stuurt foto's · 2 Wij maken het · 3 Jij keurt goed · 4 Je downloadt.** Nu staan er drie stappen op home ("Dit stuur jij…"), drie op /how-it-works ("De drie stappen, en de twee waar jij in zit") en andere varianten per dienst.
- **Waarom:** dezelfde vier woorden overal = één verhaal dat blijft hangen; nu tel je per pagina een ander aantal.
- **Kost:** middel (één component, op 6–8 plekken vervangen, teksten NL/EN; geen nieuwe beelden nodig).
- **Schets:**
  ```
  01 JIJ STUURT        02 WIJ MAKEN          03 JIJ KEURT          04 JIJ DOWNLOADT
  4 telefoonfoto's     catalog, lifestyle,   per beeld goed of     alle formaten,
  per product          video — vaak binnen   een revisie           één zip
                       een dag
  ```
- **Advies:** ja, vier en niet drie: "downloaden" is precies de stap waar klanten nu om mailen. Alternatief: drie stappen houden maar overal dezelfde drie.

### B2 · Menu inkorten
- **Nu:** Wat we maken (5) · Hoe het werkt (5) · Prijzen · Galerij · Contact · Inloggen · NL/EN · Bestellen.
- **Voorstel:** Wat we maken (Catalog, Lifestyle, Video, Merkmodel, Abonnement) · **Zo werkt het** (één pagina, met daarin planning, Studio, modellen en aanleveren als secties) · Prijzen · Galerij · Inloggen · Bestellen. Contact naar de voet en de WhatsApp-knop (die staat al op elke pagina).
- **Waarom:** het tweede uitklapmenu heeft vijf pagina's die samen één vraag beantwoorden ("hoe gaat het?").
- **Kost:** middel (nav + één samengestelde pagina; oude adressen 301 naar de juiste sectie, sitemap past zich vanzelf aan).
- **Advies:** ja, samen met B1. Alternatief: alleen "De planning en de capaciteit" en "De modellen" uit het menu halen (dat zijn de minst gezochte) — één uur werk.

### B3 · Keuzehulp "Wat past bij mij?"
- **Wat:** drie vragen op /start (Wat verkoop je? Waar komt het te staan — shop, ads, social? Hoeveel producten per maand?) → één advies met prijs en een knop die het juiste formulier opent, voorgevuld.
- **Waarom:** /start heeft nu acht kaarten; wie twijfelt tussen catalog en lifestyle of los en abonnement, kiest vaak niets.
- **Kost:** middel (pure front-end, regels uit pricing.js/plans.js — geen eigen prijzen).
- **Schets:** `Shop + 12 producten/maand → Catalog, 12 × €51 = €612 per keer — of het Pro-abonnement, €790 per maand voor 120 credits, waarmee ook lifestyle en video kunnen. (Bedragen excl. btw, uit pricing.js.) [Start met catalog] [Bekijk Pro]`
- **Advies:** ja, als kaart bovenaan /start. Alternatief: geen quiz maar één vergelijkingstabel "los of abonnement" (bestaat deels op /compare).

### B4 · Prijscalculator
- **Wat:** op /pricing een schuif "aantal producten" + vinkjes (lifestyle, extra hoek, 4K, voorrang) → totaal ex. en in. btw, live uit `quote()` in pricing.js — dezelfde functie als het bestelformulier.
- **Waarom:** de staffel staat nu als tabel; "wat kost 14 producten met 4K" moet je zelf uitrekenen.
- **Kost:** klein–middel (de rekenfunctie bestaat; alleen een eiland op /pricing). Combineert met B3.
- **Advies:** ja. Alternatief: alleen drie voorbeeldbestellingen uitgeschreven (5, 14, 30 producten).

### B5 · FAQ naar ~20 vragen
- **Nu:** /faq heeft 62 vragen (JSON-LD telt 62), plus per dienstpagina eigen vragen.
- **Voorstel:** /faq = de 20 vragen die echt gesteld worden (levertijd, revisie, rechten, AI, aanleveren, betalen, btw, abonnement opzeggen, privacy …); de rest blijft op de dienstpagina waar hij hoort.
- **Kost:** klein in code, het werk is kiezen. Ik maak een voorstel van 20 op basis van wat in de contactberichten en WhatsApp terugkomt als jij die lijst wilt laten zien; anders kies ik op de onderwerpen van de bestelflow.
- **Advies:** ja. Alternatief: alles houden maar de 20 bovenaan, de rest onder "Meer vragen".

### B6 · Lichte achtergrond op alle pagina's
- **Nu:** lichte panelen op een inktzwarte achtergrond, met donkere tussenblokken en een zwarte voet met het grote VISUAILS-woordmerk.
- **Voorstel:** de pagina zelf licht (het grijs van de panelen), panelen zonder rand ertussen; donker alleen nog voor één accentblok per pagina (de "Maak … van jou"-afsluiter) en de voet.
- **Waarom:** de foto's zijn het product; op licht lezen ze rustiger en de pagina wordt korter (geen marges tussen panelen).
- **Kost:** groot (stijl22.css/stelsel.css raken alle pagina's; contrast opnieuw meten — test:leesbaar doet dat; donkere modus moet mee). Risico op kleine scheefstanden overal → eerst op twee pagina's als proef.
- **Advies:** eerst een proef op /pricing en /catalog naast elkaar, jij kiest daarna. Alternatief: niets doen — het huidige beeld is consistent (stap 8), dit is smaak.

### B7 · De naam "Beam" in de galerij
- **Nu:** het filter "Beam" staat naast Dunes, Flash, Glow en Phone-made, maar Beam is geen look die je kunt bestellen.
- **Waarom:** wie op Beam filtert en het mooi vindt, zoekt het daarna in het bestelformulier en vindt het niet.
- **Voorstel (mijn keuze):** het filter weghalen; de zes beelden blijven in "Alles" met het onderschrift "Eigen werk VISUAILS". **Alternatief:** van Beam een vijfde lifestyle-look maken (pagina, formulieroptie, voorbeelden) — dan klopt de naam wél, maar dat is een productbesluit en middel werk.
- **Kost:** klein (één filter, alt-teksten blijven).

---

## C · Studio en mails

### C1 · Startlijstje in Studio
- **Wat:** voor een nieuwe klant bovenaan het overzicht vier vinkjes die vanzelf afgaan: *Gegevens compleet · Eerste bestelling · Eerste beelden goedgekeurd · Vaste look opgeslagen* (bij abonnees: *Eerste week vastgezet*). Verdwijnt als alles af is.
- **Waarom:** Studio heeft veel tabbladen; een nieuwe klant weet niet wat hij als eerste moet doen.
- **Kost:** klein–middel (alleen lezen uit bestaande tabellen; geen nieuwe data).
- **Advies:** ja, vooral voor abonnees. Alternatief: één regel "Volgende stap: …" in plaats van een lijst.

### C2 · Mail bij weekstart (abonnement)
- **Nu:** vijf dagen vooraf een mail als de lijst leeg is; jij krijgt een regel in het nachtrapport als een week klaar is om te starten; de klant hoort niets als je hem start.
- **Wat:** bij "Week starten" in /admin één mail aan de klant: welke producten, hoeveel credits, wanneer hij de eerste beelden kan verwachten (in de vaste bewoording: vaak binnen een dag, soms een paar dagen).
- **Kost:** klein.
- **Advies:** ja. Alternatief: alleen de bestaande levermail (dan weet de klant pas iets bij levering).

### C3 · Betaalherinnering noemt de vervaldatum (O57)
- **Wat:** één zin: "Na [datum] vervalt de bestelling vanzelf; er wordt dan niets in rekening gebracht."
- **Kost:** heel klein. **Advies:** ja.

### C4 · Kleinigheden uit de klanttypes
- **O47** concept bewaren bij verversen van het bestelformulier (nu begin je opnieuw na een refresh) — middel; advies: ja, alleen tekstvelden en keuzes, geen foto's.
- **O43** het getypte bericht op de privélink bewaren als de pagina herlaadt — klein; ja.
- **O45** de looknaam (Dunes, Flash …) op de factuurregel — klein; ja, het helpt bij het terugvinden.
- **O35** na het intrekken van één revisie de teller bijwerken en "ingetrokken" bevestigen — klein; ja.

---

## D · Besluiten die alleen jij kunt nemen (geen bouwwerk)

1. **PURGE_ENABLED aan** op visuails-cron (O55) — eerst `npm run backup -- --files`. Zonder dit wist niets na 90 dagen, terwijl /privacy dat belooft. En het nachtrapport herhaalt dan niet meer elke nacht dezelfde regel.
2. **RESEND_WEBHOOK_SECRET** zetten + webhook in Resend (O59) — anders zie je live nooit welke mail niet aankwam.
3. **Testabonnement "Studio Proefmerk"** opzeggen/verbergen — staat elke nacht in het rapport.
4. **Plaatshouders** (O65): Editions-beeld, kop /hooks en /guides, portret op /about — beeld maken of de sectie tot dan weglaten.
5. **F44, F30/O12** — staan nog open van eerder in deze ronde.

---

**Mijn volgorde als je alles "ja" zegt:** D1–D3 (vandaag, vijf minuten) → A1 + A2 + C3 (één ronde, nachtelijke taken) → B1 + B2 (samen) → B4 + B3 → C1 + C2 → A3, A4, C4 → B6 als proef → B5 en B7.
