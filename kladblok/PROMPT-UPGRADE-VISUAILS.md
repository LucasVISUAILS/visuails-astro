# Opdracht: VISUAILS van top tot teen verbeteren — ideeën, oplossingen en upgrades

Je werkt voor Lucas, de enige persoon achter VISUAILS (visuails.com): een done-for-you dienst die van telefoonfoto's van kleding catalog- en lifestylebeelden maakt met AI, met een website, een klantportaal (VISUAILS Studio), een privélink per bestelling, een adminportaal en een abonnement. Alles wat je over VISUAILS moet weten staat in één bestand, en dat bestand is je enige bron van waarheid:

`kladblok/VISUAILS-OVERZICHT-6-OKT.md` (in de map `E:\Claude (VISUAILS)\visuails-astro`)

Lees eerst §0 (werkafspraken), §21 (wat er bewust níet is), §23 (wat Lucas onderweg al heeft omgegooid) en §28 (het abonnement zonder weeksysteem). Daarna de rest. Niets in dit bestand is "vergeten": wat er niet is, is meestal een keuze — als je het toch wilt voorstellen, zeg dan waarom de reden van toen niet meer opgaat.

## Doel

Drie dingen tegelijk, en elk voorstel zegt welke van de drie het dient:

1. **VISUAILS als systeem beter** — minder stappen, minder handwerk, minder plekken waar iets kan misgaan, minder uitleg nodig.
2. **Lucas' ervaring als verkoper/maker beter** — hij doet alles zelf: verkopen, maken, nakijken, leveren, factureren, mailen. Alles wat hem minuten per bestelling scheelt of een foutbron weghaalt telt. Voorbeeld van het soort idee dat we zoeken: hij moet nu `npm run tag:delivery` in CMD draaien om een herkomsttag in beelden te zetten; hij wil liever een klein venster met een sleepvak waar hij een map in gooit en een groen vinkje krijgt. **Dat soort ideeën op élk punt van zijn werkdag** (§25).
3. **De klantervaring aanzienlijk beter** — minder invullen, altijd weten waar je bestelling staat, nooit twijfelen wat iets kost of wanneer het komt, en redenen om terug te komen.

Het is een ideeën- en oplossingenronde, geen bouwronde. Je verandert geen code. Je levert één document.

## Vaste regels (uit §0; niet onderhandelbaar)

- Prijzen en getallen alleen uit het overzicht (§22); nooit zelf bedragen verzinnen. Een voorstel dat een prijs verandert, zegt dat expliciet als "prijsvoorstel" en rekent het effect voor.
- Levertijd is altijd "vaak binnen een dag, soms een paar dagen"; geen enkel voorstel mag een hardere belofte bevatten.
- Geen JavaScript in Studio en privélink is een keuze (§21); een voorstel dat JS vraagt moet zeggen waarom het zonder niet kan.
- Nederlands, "je", geen beeldspraak, geen lege woorden (§26). Wie nakijkt heet "onze beeldredactie".
- Video is op aanvraag tot de videostijlen er zijn; complete wordt niet meer verkocht; het weeksysteem van het abonnement gaat weg (§28). Bouw daar niet op voort.
- Lucas wil per idee een **eigen mening**: is het goed, waarom, en hoe wordt het nog beter — of is het onhandig, en wat is dan het logische alternatief. Geen opsomming zonder oordeel.
- Lucas beslist zelf. Lever opties, dicteer niet. Bij twijfel over hoe iets hoort te werken: niet aannemen, maar als vraag aan Lucas noteren in de vragenlijst aan het eind.

## Werkwijze: zet subagents in, parallel, elk op één gebied

Start minstens de volgende agents tegelijk. Elke agent leest het hele overzicht, maar beoordeelt alleen zijn gebied, en levert maximaal 12 voorstellen in het vaste format hieronder. Geef elke agent dit hele opdrachtbestand mee plus zijn gebied.

1. **Bestelstroom en website** (§5, §6, §19, §22): van eerste bezoek tot betaald. Afhaakpunten, onnodige vragen, wat een eerste klant niet snapt, plaatshouders, /plans, de €1-proef als instap.
2. **VISUAILS Studio (klantportaal)** (§8, §4, §28): wat een klant wil zien zonder te zoeken; status, beelden, revisie, facturen, tegoed; de nieuwe abonnementstab uit §28 — beoordeel het voorstel daar en verbeter het.
3. **Privélink en levering naar de klant** (§9, §10.1, §20): het moment dat beelden aankomen; goedkeuren/aanmerken; downloaden; wat erna komt (herbestellen, review, 90 dagen).
4. **Lucas' werkdag en /admin** (§10, §25, §12): van "nieuwe bestelling" tot "afgerond". Elke handeling tellen; voor elke handeling: kan hij weg, kan hij één klik worden, kan hij een eigen klein gereedschap worden (sleepvak-app, knop, Windows-venster, Photoshop-script, automatische tag, automatische zip), kan de cron het doen zonder risico (§21 zegt welke dingen bewust handmatig zijn — respecteer dat of beargumenteer het).
5. **Productie en kwaliteit** (§24, §25, §2.11): van foto's van de klant tot afgewerkt beeld. Wat zorgt voor minder revisies, minder "foto's ontbreken", meer consistentie per look; intake-vragen die een slecht beeld voorkomen; wat de klant vooraf moet weten over zijn foto's; de fotogids-pdf.
6. **Abonnement en herhaalomzet** (§4, §28, §22): waarom een klant blijft; wat de tab uniek maakt; credits begrijpelijk; herbestellen; maandset; Editions; wat het aantal abonnees beperkt (`seatsLeft`) en of dat klopt.
7. **Mails, meldingen en communicatie** (§11, §26): elke mail die een klant of Lucas krijgt: nodig, op tijd, duidelijk? Wat ontbreekt (bv. "je bestelling is opgepakt"), wat is te veel, WhatsApp als kanaal, het nachtrapport als Lucas' ochtendlijst.
8. **Geld, btw, facturen, tegoed** (§3, §7, §22): betaalmomenten, betaallink, herinneringen, deel-terugbetalen, tegoed, creditnota's, EU-btw, ICP; wat Lucas handmatig doet dat de code kan doen.
9. **Techniek, risico en onderhoud** (§13, §14, §17, §21): wat breekt het eerst als het druk wordt; de 26 inconsistenties van §17 als opruimlijst met volgorde; back-up, purge, webhook; wat een tweede persoon ooit nodig zou hebben.
10. **Groei en nieuwe diensten** (§1, §2, §16.3, §23): wat ontbreekt in het aanbod voor de doelgroep (jonge kleding- en e-commercemerken, dropshippers), wat concurrenten doen dat VISUAILS bewust niet doet en of dat nog klopt, welke dienst de hoogste marge per uur van Lucas heeft. Houd je aan de stem: serieuze partner, geen beloftes over volgers of viraal.

Een elfde agent, **de tegenspreker**, leest daarna alle voorstellen en schrapt of degradeert: wat tegen §21/§23 ingaat zonder goede reden, wat meer werk voor Lucas oplevert dan het bespaart, wat de klant extra uitleg kost, wat dubbel is, wat alleen "mooi" is.

## Format per voorstel (verplicht, zodat alles vergelijkbaar is)

```
### <nummer>. <titel in één regel>
Gebied: <1–10>  ·  Dient: systeem / Lucas / klant (één of meer)
Nu: <wat er nu gebeurt, met §-verwijzing>
Voorstel: <wat er verandert, concreet genoeg om te bouwen; schermtekst erbij als het een scherm is>
Waarom: <het probleem dat het oplost, in één of twee zinnen>
Winst: <minuten per bestelling / per week voor Lucas, of wat de klant niet meer hoeft; schat het>
Kosten: <uren bouwen: S (< halve dag) / M (1–2 dagen) / L (ronde op zich); wat het raakt>
Risico: <wat er mis kan gaan; wat §21 of §23 erover zegt>
Mening: <goed/onhandig en waarom; hoe het nog beter kan of wat het alternatief is>
Vraag aan Lucas: <alleen als er iets onduidelijk is; anders "—">
```

## Eindrapport (één bestand: `kladblok/UPGRADE-VOORSTELLEN-<datum>.md`)

1. **Top 10** over alle gebieden heen, gesorteerd op winst ÷ kosten, elk met één regel waarom het bovenaan staat.
2. **Per gebied** alle overgebleven voorstellen in het format, met het oordeel van de tegenspreker erbij ("blijft", "later", "nee: …").
3. **Kleine gereedschappen voor Lucas** apart gebundeld: alles wat een knop, venster, sleepvak, script of automatische stap kan worden, met per stuk: waar het staat in zijn dag (§25), input, output, en hoe hij ziet dat het gelukt is.
4. **Vereenvoudigingen**: wat er wég kan (schermen, vragen, mails, regels) zonder dat iemand het mist — vaak de beste upgrade.
5. **Prijs- en aanbodvoorstellen** apart, met de getallen uit §22 ernaast, nooit erin verwerkt alsof ze al gelden.
6. **Vragenlijst aan Lucas**: elke onduidelijkheid als één vraag met twee of drie antwoordopties en jouw advies.
7. **Voorgestelde volgorde**: drie rondes (ronde A: S-punten die meteen helpen; ronde B: de abonnementsomslag van §28 plus wat daarbij hoort; ronde C: de L-punten), elk met wat Lucas zelf moet doen en wat Claude kan doen.

Schrijf het rapport in het Nederlands, beknopt, zonder lege woorden; elke regel moet iets zeggen dat Lucas niet al wist. Noem bij elk voorstel het §-nummer waar het aan raakt, zodat hij het kan nalezen. Verander geen code, maak geen schetsen zonder dat erom gevraagd is, en commit of push niets — Lucas doet dat zelf vanuit zijn eigen map.
