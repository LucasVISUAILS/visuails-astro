# Opdracht ronde 9 — volledige doorloop op live, per klanttype, met nacontrole

## Uitgangspunt
De laatste versie staat live op visuails.com (ik heb gedeployed). Test op LIVE, niet in een lokale kopie. Jouw werkplek kan visuails.com niet bereiken, dus alles wat op de site gebeurt doe je in de browser op mijn computer (Chrome met de extensie, of de ingebouwde browser). Codewerk en tests doe je in je eigen werkplek, op een kopie die je eerst gelijktrekt met mijn map.

Vaste afspraken (gelden de hele opdracht):
- Lees eerst de huidige stand van mijn map (datums en groottes vergelijken). Ga nooit uit van je eigen kopie.
- Nooit committen of pushen; dat doe ik.
- Mollie blijft in testmodus. Op de testpagina kies je alleen betaald/mislukt/verlopen/geannuleerd.
- /admin: ik log zelf in (wachtwoord en tweestapscode). Vraag het me als het nodig is; vul het nooit zelf in.
- Testklanten zijn hello+<type>@visuails.com (zie de klanttypes). Inlogcodes en alle klantmails lees je in mijn Gmail. Gebruik nooit mijn echte woon- of bedrijfsadres; KVK-testnummer 12345678 (of een ander verzonnen nummer als de proefregel dat vraagt).
- Prijzen alleen uit pricing.js/plans.js, nooit met de hand.
- Nederlands, beknopt, met je eigen mening en een alternatief. "Een specialist", niet "een mens". Levertijd: "vaak binnen een dag, soms een paar dagen" — nooit een belofte.
- Leesbaarheid: niets onder 11,5 px, contrast in orde, geen afgebroken woorden.

## Stap 0 · Voorbereiden (eerst afmaken, dan pas bestellen)
1. Controleer dat live de laatste versie draait (o.a. videokaarten in /nl/gallery, de nieuwe indeling van "Dit stuur jij. Dit krijg je terug.", "Laatst bijgewerkt: oktober 2026" op /nl/ai-act).
2. Trek je werkkopie gelijk met mijn map en draai de volledige testreeks. Alles groen voordat je verder gaat.
3. Maak `kladblok/WERKLIJST-RONDE-9.md` met alle punten hieronder als vinkjes. Elk punt krijgt na afloop: wat je deed, wat je zag, het bewijs (schermafdruk, ordernummer, mailonderwerp + tijd in Gmail), en of er een fout was.
4. Noteer per klanttype vooraf: e-mailadres, apparaat (desktop 1280 of telefoon 390), taal, en welke bestelling hij doet.

## Stap 1 · De klanttypes — elk van begin tot eind, Studio én /admin
Elke klant doorloopt de HELE keten. Pas als een klant helemaal klaar is, begin je aan de volgende. Per klant:

a. Vóór het bestellen: de pagina's die zo'n klant leest (home → dienstpagina → stijlpagina → prijzen → FAQ), op zijn apparaat. Noteer wat hij niet begrijpt of mist.
b. Bestellen met precies zijn combinatie (zie lijst), inclusief fouten die zo'n klant maakt (verkeerd veld, terugknop, verversen).
c. Betalen (of juist niet / mislukt, zie lijst).
d. Mails: controleer in Gmail ELKE mail aan de klant én aan hello@: onderwerp, afzender, antwoordadres, voorbeeldregel, aanhef met voornaam, bedragen en btw, links en knoppen (klik ze), PDF-bijlage, weergave op telefoon, spammap.
e. VISUAILS Studio als die klant: inloggen met code uit Gmail, overzicht, bestelling, wat hij ziet en wat hij kan in elke toestand.
f. /admin (ik log in): de bestelling vinden via dashboard en planning, controleren wat er staat, beelden uploaden per vak, op geleverd zetten.
g. Terug naar Studio: beelden bekijken, per beeld goedkeuren, één revisie aanvragen met notitie, ontvangstbevestiging.
h. /admin: revisie afhandelen (vervangen + melden; en bij één klant "geen nieuw beeld nodig").
i. Studio: herlevering zien, de rest goedkeuren, afronden, tevredenheidsvraag, zip en losse beelden downloaden, factuur-pdf openen.
j. /admin: score, tijdlijn, factuur in /admin/facturen, klantpagina.
k. Schrijf per klant op waar het stokte, wat onduidelijk was en wat je zou veranderen.

De klanttypes en hun bestelling:
1. **Jonge starter, telefoon, NL** (hello+starter@): €1-proef catalog → daarna een echte catalogbestelling van 1 product. Twijfelt, klikt veel terug.
2. **Oudere boetiekeigenaar, desktop, NL** (hello+boetiek@): lifestyle, 3 producten, 4K, beeldverhouding 4:5, Dunes. Leest alles, belt liever: gebruikt het contactformulier vóór hij bestelt.
3. **Drukke webshop, desktop, NL** (hello+webshop@): catalog 12 producten met vaste leverdatum, extra hoeken, voorrang, eigen achtergrondkleur, model gekozen, outfit, map-upload. Laat de betaling eerst verlopen en betaalt later via de herinnering/link.
4. **Wantrouwige klant, telefoon, NL** (hello+twijfel@): WhatsApp-knoppen, contactformulier, Studiobrief, leest AI Act/voorwaarden; bestelt pas daarna lifestyle Phone-made 1 product; betaling mislukt eerst.
5. **Engelse klant buiten de EU, desktop, EN** (hello+uk@): catalog 5 producten, land GB; alles moet Engels zijn (site, mails, Studio, portaal, factuur).
6. **EU-bedrijf met btw-nummer, desktop, EN** (hello+eu@): catalog 3 producten, Duitsland, geldig btw-nummer (verlegging) — en een tweede poging met een ongeldig nummer; btw-akkoord in /admin, één keer afwijzen, dan alsnog goedkeuren.
7. **Bureau voor meerdere merken, desktop, NL** (hello+bureau@): twee bestellingen onder één account met verschillende merknamen; één video-aanvraag (Motion) met offerte → betalen; één eigen look-aanvraag.
8. **Merkmodel-klant, telefoon, NL** (hello+model@): merkmodel aanvragen (beide routes bekijken, één afronden), betalen.
9. **Abonnee, desktop, NL** (hello+abo@): Pro-abonnement afsluiten; vaste look per dienst; producten met foto's toevoegen, vastzetten, losmaken; week verzetten; ik start de week in /admin; levering; product toevoegen met credits; pauzeren, hervatten; factuur-pdf; opzeggen (eerst met verkeerd woord). Mislukte incasso alleen als Mollie-test dat toelaat.
10. **Boze klant, telefoon, NL** (hello+boos@): catalog 2 producten; na levering vraagt hij revisies op meerdere beelden, trekt er één in, vraagt na de termijn nog iets; in /admin: deels terugbetalen of tegoed; daarna een tweede bestelling die het tegoed gebruikt.
11. **Annuleerder, desktop, NL** (hello+annuleer@): bestelt en betaalt niet → ik annuleer in /admin → nog een keer annuleren → heropenen proberen → oude betaallink openen. En een tweede, betaalde bestelling annuleren met terugbetalen (creditnota-mail).

## Stap 2 · Bestelmatrix (wat de klanttypes nog niet dekken)
Loop daarna systematisch na dat ELKE stijl, add-on en randgeval minstens één keer besteld of geprobeerd is:
- Catalog: elke catalogstijl, elke achtergrond, elke beeldverhouding, extra hoeken, outfit, model/merkmodel, marktplaatsformaten.
- Lifestyle: Dunes, Flash, Glow, Phone-made, eigen look; 4K; beeldverhouding per beeld.
- Video: Motion, Lifestyle Video, Campaign, eigen look (aanvraag → offerte → betalen).
- Aantallen: 1, 4, 5, 9, 10, 19, 20+ (prijs per aantal klopt met pricing.js; datumkeuze vanaf 10).
- Uploads: HEIC, >25 MB, verkeerd bestandstype, verplichte foto vergeten, map in één keer.
- Land/btw: NL met en zonder KVK, EU geldig/ongeldig, buiten EU, particulier (moet geweigerd).
- Betalen: betaald, mislukt, verlopen, geannuleerd, later via link, met tegoed (deels/volledig).
- Ingelogd vs. niet ingelogd, terugkerende klant met ingevulde gegevens, terugknop/verversen midden in het formulier.

## Stap 3 · Contactmogelijkheden
Contactformulier (elk onderwerp, elke voorkeur), WhatsApp-knoppen op elke pagina (klopt de tekst bij de pagina en het nummer?), mailadressen, Studiobrief aan- en afmelden, "Vraag een specialist" in Studio, antwoorden op elke mail (komt het antwoord bij de juiste persoon?).

## Stap 4 · VISUAILS Studio — elk scherm, elke toestand
Inloggen (verkeerde code, verlopen code, te vaak, inloglink, terug naar waar je heen wilde). Overzicht met lege staat (nieuwe klant) en volle staat. Bestellingen in elke toestand: onbetaald, wacht op btw, betaald, in productie, geleverd, revisie loopt, afgerond, geannuleerd, terugbetaald, beelden verlopen. Goedkeuren/ongedaan/revisie/notitie, downloads, facturen en creditnota's, gegevens wijzigen (btw, e-mail), vaste look, alle abonnementstabbladen, thema licht/donker, taalwissel, menu op telefoon.

## Stap 5 · /admin — elke pagina, elke knop
Dashboard, planning, klanten (ook nieuwe klant via WhatsApp-bestelling), bestelling (upload per vak en per map, verkeerd bestand, melden, herleveren, revisie afhandelen, nieuwe link, offerte, aanbetaling/restant, deels/volledig terugbetalen, tegoed, annuleren, verbergen, verwijderen), btw-lijst (akkoord/afwijzen), maandset, aanbevelingen/testimonials, berichten, logboek, trechter, diagnose, twee stappen, facturen per kwartaal + CSV, abonnementen (week starten, credits corrigeren). Ook op telefoon en in donker thema. Alles moet Nederlands zijn en zeggen wat er gebeurde.

## Stap 6 · Automatisch en koppelingen
Wat op live te zien is: nachtrapport, betaalherinnering, verval, vrijgegeven datum, tevredenheidsherinnering. Wat niet op live te forceren is (tijd vooruitzetten, chargeback, bounce, dubbele webhook): in je werkkopie met de testomgeving, en dan de mail via Resend naar hello@ sturen zodat ik hem echt zie.

## Stap 7 · Alle pagina's (NL + EN, ±97)
Per pagina op 1440, 1280, 768 en 390 px: indeling per sectie (lege vlakken, scheve kolommen, te grote of te kleine elementen), teksten onderling consistent (prijzen, levertijd, aantallen, namen), links/404, toetsenbord en focus, contrast en leesbaarheid, beeldgewicht en laadtijd, meta/JSON-LD, juridische pagina's (datum, KVK), cookiemelding. Herbouw secties van de grond af waar dat duidelijk beter en compacter is — met het idee achter VISUAILS als maatstaf.

## Stap 8 · Concept (voorstellen, eerst voorleggen)
Lever per voorstel: wat, waarom, wat het kost, een schets of schermafdruk. Minstens: één vaste "zo werkt het in 4 stappen", menu inkorten, keuzehulp "wat past bij mij?", prijscalculator, startlijstje in Studio, mail bij weekstart, FAQ naar ~20 vragen, dezelfde lichte achtergrond op alle pagina's, de naam "Beam" in de galerij.

## Repareren
- Fout gevonden → noteer in de werklijst (klanttype, stap, wat je verwachtte, wat er gebeurde, bewijs).
- Repareer in je werkkopie, draai de bijbehorende test én de volledige reeks, lever de gewijzigde bestanden in mijn map (eerst mijn datums controleren), en vraag me te deployen.
- Na mijn deploy: dezelfde stap op live opnieuw doen en pas dan afvinken. Een fout is pas "opgelost" als hij op live opgelost is.
- Kun je iets niet zelf (inloggen, iets wat geld of mijn accounts raakt), stop dan en vraag het.

## Nacontrole — stap voor stap, pas na alle reparaties
1. Open WERKLIJST-RONDE-9.md: elk punt afgevinkt met bewijs? Elk punt zonder bewijs is niet gedaan → alsnog doen.
2. Per klanttype: open zijn bestelling(en) in Studio en in /admin en controleer de eindtoestand (status, betaald, geleverd, afgerond, score, factuur).
3. Gmail: lijst per klanttype alle ontvangen mails met onderwerp en tijd. Ontbreekt er een mail die er had moeten zijn, of kwam er een die niet hoorde? → fout.
4. Bestelmatrix (stap 2): elke cel heeft een ordernummer of een notitie waarom niet.
5. Pagina's (stap 7): voor elke pagina op 1280 en 390 een schermafdruk na de laatste deploy; leg ze naast de eerste ronde.
6. Volledige testreeks nog één keer op de laatste stand van mijn map: alles groen.
7. Elke reparatie: staat hij in mijn map, en is hij op live te zien? (code vergelijken met mijn map; pagina op live openen).
8. Opruimen: alle testbestellingen en testklanten in /admin verbergen of verwijderen, testabonnementen opgezegd, geen open Mollie-testbetalingen.
9. Eindverslag: per klanttype wat goed ging en wat niet; lijst DIRECT (gedaan) en OPTIONEEL (voor mij); wat je NIET hebt kunnen testen en waarom; werkschema voor mij.

Begin bij stap 0 en meld je na stap 0 kort voordat je gaat bestellen.
