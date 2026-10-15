# Levering 50 — 15 oktober 2026

Wat afvinklijst 29 nog open liet: kleine teksten in het bestelformulier (k-maat), een eigen kleur per beeld (v29-hex = b), echt overstappen naar een ander abonnement (v29-overstap = a), en in "Hoe het werkt" stap 1 met vinkjes (v29-stap1 = a) en stap 3 met een revisie (v29-stap3 = a). De titel naast de laptop blijft zoals hij is (v29-opening = nu), dus de slotregel onder de mails ook (v29-tagline). Het logo als los blok wacht op je schermafdruk (v29-logo = a).

● = nieuwe of veranderde tekst die de klant ziet. Eerst NL, daaronder EN.

---

## 1 · Kleine teksten in het bestelformulier (k-maat)

Alle stappen van /start/catalog, /start/lifestyle, /start/plan, video, eigen look, merkmodel en de proef gemeten op 1440 en 390, met alle uitklappers open en wat verborgen staat zichtbaar gemaakt. Geteld per woord op een volle regel.

- **Wat je zag, staat nog niet live.** De live site heeft levering 49 nog niet: daar staat kleine tekst nog op 15 em (vijf à zeven woorden). Met levering 49 (23 / 26 em) staan er in het formulier mediaan 10 woorden op een volle regel, net als op de legal pages. 29,5 em geprobeerd: dan worden het er 13 à 14, te breed. Dus de maat blijft.
- **Wat wél krap bleef, zat aan het vak eromheen.** Dat is nu anders:
  - De niveautabel ("Waarom twee niveaus", stap 1): het label staat boven de waarde in plaats van ernaast. De waarde kreeg 249 van de 367 px en heeft nu de hele kolom: acht à negen woorden.
  - De productvragen in stap 2 (stof, kleur): de kopieerregel op de eerste kaart hield vier kolommen van 196 px open. Elke vraag stond zo in een smalle kolom, met de uitleg op zes à acht regels. Nu delen de vragen de rij (minstens 260 px elk) en heeft de kopieerregel een eigen rij.
  - De uitlegvensters achter het vraagteken stonden op 30 ch (5 à 6 woorden per regel). Ze staan nu op 42 ch, overal op de site.
  - De tip op de telefoon: de tekst kreeg naast "Begrepen" en het kruisje 208 px. Nu staat hij over de volle breedte, met de knoppen eronder.
- Na de wijziging zijn er 23 volle regels onder de 8 woorden op 1440 (was 44). Het zijn korte zinnen die precies op de maat breken, zoals "Kies hoeveel producten en het totaal verschijnt hier."

## 2 · Een eigen kleur per beeld (v29-hex = b)

In stap 1, onder "Een foto een andere achtergrond geven", staat in de keuzelijst nu ook "Eigen kleur…". Kies je die, dan verschijnen een kleurvak en een veld voor de hexcode, net als bij de hele bestelling. Is de kleur donker, dan staat er een korte regel onder. De schets, de tegel in "Wat je krijgt" en de samenvatting nemen de kleur over ("Op model: eigen kleur #2B3A55").

- Het formulier post `beeld_bg_<vak>=eigen` en de code in `beeld_hex_<vak>`. /api/order maakt daar één veld van (`beeld_bg_<vak>=#…`) en gooit `beeld_hex_` weg. /admin, de werkmap, het Photoshop-script en de bevestiging lezen het zoals elke andere kleur. In /admin en de werkmap staat "eigen kleur" met de code.
- Dezelfde regels als bij de aanbevolen kleuren: alleen catalog, niet gelijk aan de hoofdkleur, en bij Amazon, bol of Zalando blijft de voorkant wit.
- **Rechtgezet:** in levering 49 schreef ik bij 9 dat "Opnieuw bestellen met alle instellingen" ook de achtergrond per beeld overneemt. Dat deed het nog niet. Nu wel, ook een eigen kleur, en bovenaan staat "de achtergrond van 2 foto's".

● Keuzelijst en velden
> Eigen kleur… · Kies een eigen kleur voor Op model · Hexwaarde voor Op model
> Your own colour… · Pick your own colour for On model · Hex value for On model
● Bij een donkere kleur
> Donkerder dan we zouden aanraden: de schaduw valt minder op. We maken het gewoon zo.
> Darker than we would recommend: the shadow shows less. We will make it this way anyway.
● Bovenaan na Opnieuw bestellen, en in Studio
> de achtergrond van 1 foto / van 2 foto's · Neemt alles over: de achtergrond (ook per foto), de verhouding, …
> the background of 1 photo / of 2 photos · Copies everything: the background (per photo too), the aspect ratio, …

## 3 · Overstappen naar een ander abonnement (v29-overstap = a)

In Studio, onder Abonnement → Je plan, staat nu "Overstappen". Elk ander plan staat er als keuzevak, met de credits per maand, het bedrag en hoeveel meer of minder dat is dan nu. "Abonnement op maat" heeft een veld van 30 tot 300 credits. Studio draait zonder script, dus het bedrag staat erbij voor het voorgestelde aantal, met drie ijkpunten. Het exacte bedrag zie je in de bevestiging.

- **Het gaat in bij de volgende termijn.** Mollie krijgt meteen het nieuwe bedrag (PATCH op het abonnement, dezelfde dag van de maand en hetzelfde mandaat). Het abonnement zelf blijft deze termijn wat het is: dezelfde credits, en hetzelfde plan op de factuur.
- **De webhook zet hem om.** Bij de eerste termijnbetaling die Mollie ná de overstap aanmaakte, wordt de overstap het abonnement. Daarna gaan de controle van het bedrag, de credits, het spaarplafond en de factuur over het nieuwe plan. Een betaling die al onderweg was, telt nog voor het oude plan; de overstap gaat dan een termijn later in.
- **Terugdraaien** kan tot die termijn ("Overstap terugdraaien"). Mollie gaat dan terug naar het oude bedrag.
- **Pauzeren** laat een klaarstaande overstap staan, en bij hervatten gaat hij meteen in. **Opzeggen** haalt hem weg.
- **Wat niet kan:** overstappen vanaf een vooruitbetaald jaar (dan staat er "mail ons"). Ook niet bij een abonnement dat gepauzeerd, opgezegd of nog niet betaald is.
- **Meer credits** moeten onder het plafond passen dat je in /admin zet. Anders staat er dat er nu geen plek is.
- **Mails:** de klant krijgt "Je overstap staat klaar" of "Je overstap is teruggedraaid", jij een studiomail. /admin toont bij de klant "Overstap klaar: naar Merk (290 credits per maand), vanaf de volgende termijn".
- **De belofte klopt nu.** /plans ("Overstappen in VISUAILS Studio"), de bijkoop-hint in Studio en de hint in het bestelformulier gaan naar dit formulier. Waar het kan, staat het voordeligere plan al gekozen (`?naar=brand`). De link heet nu "Overstappen".
- Migratie `0068-overstap.sql`: vijf kolommen op `subscriptions` (`overstap_plan`, `overstap_cents`, `overstap_slots_json`, `overstap_at`, `overstap_van`). Zonder die kolommen is er gewoon geen overstap: Studio, de webhook en /admin vallen niet om.
- Doorgelopen in de proefomgeving met nep-Mollie: overstappen naar Merk gaf de PATCH (€ 2.044,90, "VISUAILS brand — SUB-VOLT-7070"), beide mails en het blok in Studio. Een termijn op 1 november zette de rij op Merk, met 290 credits in het creditboek.

● In Studio
> Overstappen — Kies een ander abonnement. Het gaat in bij je volgende termijn, op 1 november: dan schrijven we het nieuwe bedrag af en krijg je de credits van het nieuwe plan. Tot die dag blijft alles zoals het is.
> Switch plans — Choose another plan. It starts with your next monthly payment, on 1 November: we then collect the new amount and you get the credits of the new plan. Until that day everything stays as it is.
● Per keuze
> 290 credits per maand · € 2.044,90 per maand incl. btw · 170 meer dan nu · Bij 120 credits: € 955,90 per maand incl. btw
> 290 credits a month · €2,044.90 a month incl. VAT · 170 more than now · At 120 credits: €955.90 a month incl. VAT
● Klaar
> Je stapt over naar Merk: 290 credits per maand voor € 2.044,90 per maand incl. btw, vanaf je volgende termijn op 1 november. Tot dan blijft je huidige abonnement gewoon staan. · Overstap terugdraaien
> You are switching to Merk: 290 credits a month for €2,044.90 a month incl. VAT, from your next monthly payment on 1 November. Until then your current plan simply stays. · Undo the switch
● Mail aan de klant
> Je overstap staat klaar — Vanaf je volgende termijn op 1 november heb je Merk: 290 credits per maand voor € 2.044,90 per maand (incl. btw). Tot dan loopt je Pro-abonnement gewoon door, met je credits van nu. Je kunt de overstap tot die dag terugdraaien in VISUAILS Studio, onder Abonnement → Je plan.
> Your switch is ready — From your next monthly payment on 1 November you have Merk: 290 credits a month for €2,044.90 a month (incl. VAT). Until then your Pro plan simply runs on, with your current credits. You can undo the switch until that day in VISUAILS Studio, under Plan → Your plan.

## 4 · "Hoe het werkt", stap 1: compleet (v29-stap1 = a)

Rechtsboven in stap 1 staat een lijstje zoals in stap 2: Voorkant, Achterkant, Detail. Elk krijgt een vinkje zodra de foto in de waaier valt, daarna volgt "Compleet". Stap 1 duurt nu 3,0 s (was 2,2).

● De uitlegzin
> Je stuurt drie telefoonfoto's per product: voorkant, achterkant en detail. We kijken meteen of ze compleet zijn.
> You send three phone photos per product: front, back and detail. We check right away that they are complete.

## 5 · "Hoe het werkt", stap 3: een revisie (v29-stap3 = a)

Drie beelden krijgen hun vinkje, dan gaat de draagfoto terug. Er staat "Revisie: kleur" en het beeld is iets te warm. Een glans loopt eroverheen, de kleur klopt, er staat "Opnieuw geleverd" en dan komt het vierde vinkje. Daarna "4 van 4 goedgekeurd". Stap 3 duurt nu 3,6 s (was 2,6). Zonder uitleg, of bij minder beweging, staat alles er af en zonder revisiechip.

● In het beeld en de uitlegzin
> Revisie: kleur · Opnieuw geleverd — Je keurt per beeld goed, vraagt zo nodig een revisie en downloadt alles in één keer.
> Revision: colour · Delivered again — You approve image by image, ask for a revision if needed, and download everything at once.

## Testreeks

- `node scripts/testreeks.mjs`: 250 stappen (twee nieuw: `test:overstap`, `test:hoestappen29`). In de eerste ronde waren er 249 goed. `test:subscribe` zocht bij hervatten nog `hervatIncasso(env, state.sub`, maar hervatten gaat nu eerst langs een klaarstaande overstap (`subNu`). De toets kijkt nu naar allebei (153/153).
- Na de reeks nog één wijziging: het blok Overstappen staat er ook bij een pauze en een vooruitbetaald jaar, met waarom het nu niet kan. /plans wijst immers naar #overstappen. Daarna opnieuw gebouwd en nagelopen: overstap (44/44), subscribe, abonnementspagina, saldo-strook, studio-vorm, subscription, abonnement-b3-browser (300/300) en spaarplafond-browser (220/220). Alles goed. Stand: 250/250.

## Uitrollen

OPRUIMEN.bat is niet nodig. Draai UITROLLEN.bat. **Er is één nieuwe migratie: `0068-overstap.sql`.** UITROLLEN.bat laat hem zien en draait hem na jouw J. Nieuwe route: `POST /account/plan/overstap` (achter je Studio-sessie).
