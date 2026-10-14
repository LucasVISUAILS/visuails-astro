# Opdracht ronde 9 — volledige doorloop op LIVE, per klanttype, met nacontrole

## Uitgangspunt
De laatste versie staat live op visuails.com. Test op live, niet in een lokale kopie. Je werkplek kan visuails.com niet bereiken, dus alles op de site doe je in de browser op mijn computer (Chrome met de extensie; lukt dat niet, de ingebouwde browser). Codewerk en tests doe je in je werkplek, op een kopie die je eerst gelijktrekt met mijn map. Lees naast de browser ook de code (front-end en back-end) van elke functie die je test.

Vaste afspraken (gelden de hele opdracht):
- Lees eerst de huidige stand van mijn map; ga nooit uit van je eigen kopie.
- Nooit committen of pushen.
- Mollie blijft in testmodus; op de testpagina kies je alleen betaald/mislukt/verlopen/geannuleerd.
- In /admin log ik zelf in (wachtwoord + tweestapscode); vraag het me, vul het nooit zelf in.
- Testklanten: hello+<type>@visuails.com. Inlogcodes en klantmails lees je in mijn Gmail. Nooit mijn echte adres; KVK-testnummer 12345678 (of een ander verzonnen nummer waar de proefregel dat vraagt).
- Prijzen alleen uit pricing.js/plans.js. Nederlands, beknopt, met eigen mening en alternatief. "Een specialist", nooit "een mens". Levertijd "vaak binnen een dag, soms een paar dagen", nooit een belofte. Geen logo's ontwerpen. Niets onder 11,5 px.
- Werk door tot alles af is. Raakt je geheugen vol, ga dan verder vanaf WERKLIJST-RONDE-9.md; die is altijd de stand van zaken.
- Geef me na stap 0 en na elk afgerond klanttype een korte tussenstand (wat klaar is, welke fouten, wat je van mij nodig hebt).

## Stap 0 · Voorbereiden
1. Controleer dat live de laatste versie draait: videokaarten in /nl/gallery, de nieuwe indeling van "Dit stuur jij. Dit krijg je terug.", "Laatst bijgewerkt: oktober 2026" op /nl/ai-act.
2. Regressie ronde 8: loop elk punt van kladblok/WERKLIJST-RONDE-8.md na op live (staat het er, werkt het).
3. Trek je werkkopie gelijk met mijn map en draai de volledige testreeks: alles groen.
4. Maak kladblok/WERKLIJST-RONDE-9.md met alle punten hieronder als vinkjes. Per punt na afloop: wat je deed, wat je zag, bewijs (schermafdruk in kladblok/ronde-9/, ordernummer, mailonderwerp + tijd in Gmail), fout ja/nee.
5. Leg per klanttype vast: e-mailadres, apparaat (1280, 768 of 390), taal, bestelling.
6. Mails: controleer bij de eerste mail de kopregels in Gmail ("Origineel weergeven"): SPF, DKIM en DMARC geslaagd, afzender, antwoordadres.

## Stap 1 · Klanttypes — elk van begin tot eind, Studio én /admin, één klant tegelijk
Per klant:
a) Eerste indruk: kan hij na het eerste scherm in één zin zeggen wat VISUAILS doet, wat het kost en wat hij moet doen? Daarna de pagina's die hij leest (home → dienst → stijl → prijzen → FAQ), op zijn apparaat. Wat begrijpt hij niet, wat mist hij?
b) Bestellen met zijn combinatie, inclusief zijn typische fouten (terugknop, verversen, verkeerd veld, dubbel klikken op versturen).
c) Betalen (of mislukt/verlopen waar aangegeven). Klopt het bedrag met pricing.js, incl./excl. btw goed getoond?
d) ELKE mail in Gmail (klant én hello@): onderwerp, afzender, antwoordadres, voorbeeldregel, aanhef met voornaam, bedragen/btw, alle links en knoppen aanklikken (ook op de telefoon), pdf-bijlage openen, telefoonweergave, spammap.
e) Studio als die klant: inloggen met code, wat ziet en kan hij. Ook: de link uit de mail openen op een ander apparaat dan waar hij bestelde.
f) /admin: bestelling vinden via dashboard en planning, controleren wat er staat, per vak uploaden, op geleverd zetten.
g) Studio: goedkeuren per beeld, één revisie met notitie, ontvangstbevestiging.
h) /admin: revisie afhandelen (vervangen + melden; bij één klant "geen nieuw beeld nodig").
i) Studio: herlevering, rest goedkeuren, afronden, tevredenheid (ook een testimonial met toestemming bij één klant), zip en losse downloads, factuur-pdf.
j) /admin: score, tijdlijn, factuur in /admin/facturen, klantpagina; testimonial goedkeuren en controleren waar hij op de site verschijnt.
k) Factuur controleren: nummer en reeks (testmodus), datum, KVK/btw van VISUAILS en klant, btw-bedrag en -behandeling (NL 21%, verlegd, buiten de EU), creditnota bij terugbetalen.
l) Noteer waar het stokte, wat onduidelijk was en wat je zou veranderen.

Klanttypes:
1. Jonge starter, telefoon, NL (hello+starter@): €1-proef catalog; daarna een tweede proef proberen (moet geweigerd worden); dan catalog 1 product. Klikt veel terug.
2. Oudere boetiekeigenaar, desktop, NL (hello+boetiek@): eerst contactformulier; lifestyle Dunes, 3 producten, 4K, 4:5. Leest alles.
3. Drukke webshop, desktop, NL (hello+webshop@): catalog 12 producten, vaste leverdatum, extra hoeken, voorrang, eigen achtergrondkleur, model, outfit, map-upload; betaling eerst laten verlopen, later via herinnering/link betalen.
4. Wantrouwige klant, telefoon, NL (hello+twijfel@): WhatsApp-knoppen, contactformulier, Studiobrief, AI Act/voorwaarden/privacy; dan lifestyle Phone-made 1 product; eerste betaling mislukt.
5. Engelse klant buiten de EU, desktop, EN (hello+uk@): catalog 5 producten, GB; alles Engels (site, mails, Studio, portaal, factuur, tijdlijn).
6. EU-bedrijf, desktop, EN (hello+eu@): catalog 3 producten, Duitsland, geldig btw-nummer (verlegd) en een poging met een ongeldig nummer; in /admin één keer afwijzen, dan goedkeuren.
7. Bureau, desktop, NL (hello+bureau@): twee bestellingen onder één account met verschillende merknamen; video Motion aanvraag → offerte → betalen; eigen look-aanvraag → offerte.
8. Merkmodel-klant, telefoon, NL (hello+model@): beide routes bekijken, één afronden en betalen; daarna een bestelling met dat merkmodel.
9. Abonnee, desktop, NL (hello+abo@): Starter, Pro, Brand en "op maat" bekijken; Pro afsluiten (maand), jaarvariant bekijken; vaste look per dienst; producten met foto's toevoegen/vastzetten/losmaken; week verzetten; ik start de week in /admin; levering; product toevoegen met credits; "los bestellen" als abonnee; pauzeren, hervatten; factuur-pdf; opzeggen (eerst verkeerd woord).
10. Boze klant, telefoon, NL (hello+boos@): catalog 2 producten; revisie op meerdere beelden, één intrekken, na de termijn nog iets vragen; in /admin deels terugbetalen of tegoed; tweede bestelling die dat tegoed gebruikt.
11. Annuleerder, desktop, NL (hello+annuleer@): bestelt en betaalt niet → ik annuleer → nog eens annuleren → heropenen proberen → oude betaallink openen; plus een betaalde bestelling annuleren met terugbetalen (creditnota-mail).
12. Klant via WhatsApp, door mij in /admin aangemaakt (hello+whatsapp@): nieuwe klant + bestelling in /admin, klant krijgt link, uploadt zijn foto's, betaalt, en de rest van de keten.
13. Toetsenbordgebruiker, desktop, NL (hello+toetsenbord@): een catalogbestelling volledig zonder muis, plus Studio goedkeuren zonder muis. Focus altijd zichtbaar, niets onbereikbaar.
14. Tabletgebruiker, 768 px, NL (hello+tablet@): lifestyle Glow 2 producten, volledige keten.

## Stap 2 · Bestelmatrix (alles wat de klanttypes niet dekken)
- Catalog: elke stijl, achtergrond, beeldverhouding, extra hoeken, outfit, model/merkmodel, marktplaatsformaten.
- Lifestyle: Dunes, Flash, Glow, Phone-made, eigen look; 4K; beeldverhouding per beeld.
- Video: Motion, Lifestyle Video, Campaign, eigen look (aanvraag → offerte → betalen).
- Hooks en Editions: wat kan een bezoeker doen (aanvraag, wachtlijst, contact) en klopt wat de pagina belooft.
- Aantallen 1, 4, 5, 9, 10, 19, 20+ (prijs per aantal klopt, datumkeuze vanaf 10).
- Uploads: HEIC, >25 MB, verkeerd type, verplichte foto vergeten, map, extra foto's later nasturen.
- Land/btw: NL met/zonder KVK, EU geldig/ongeldig, buiten EU, particulier (moet geweigerd).
- Betalen: betaald, mislukt, verlopen, geannuleerd, later via link, met tegoed (deels/volledig).
- Ingelogd vs. niet, terugkerende klant met ingevulde gegevens, terugknop/verversen midden in het formulier, twee tabbladen tegelijk.
- /start: elke deur leidt naar het juiste formulier.

## Stap 3 · Contact
Contactformulier (elk onderwerp, elke voorkeur), WhatsApp-knoppen op elke pagina (tekst klopt bij de pagina, nummer klopt), mailadressen, telefoonnummer, Studiobrief aanmelden en afmelden via de link in de mail, "Vraag een specialist" in Studio, antwoorden op elke mail (komt bij de juiste persoon), fotogids-pdf downloaden.

## Stap 4 · VISUAILS Studio — elk scherm, elke toestand
Inloggen (verkeerde/verlopen code, te vaak, inloglink, terug naar bestemming, uitloggen, op twee apparaten). Lege en volle staat. Elke bestelstatus (onbetaald, wacht op btw, betaald, productie, geleverd, revisie, afgerond, geannuleerd, terugbetaald, beelden verlopen). Goedkeuren/ongedaan/revisie/notitie, downloads, facturen en creditnota's, gegevens wijzigen (btw, e-mail), vaste look, alle abonnementstabbladen, licht/donker, taalwissel, menu op telefoon. Ook hier: lege vlakken, scheve indelingen, onduidelijke teksten → opnieuw opbouwen waar het duidelijk beter kan.

## Stap 5 · /admin — elke pagina, elke knop
Dashboard, planning, klanten (ook nieuwe klant), bestelling (upload per vak/map, verkeerd bestand, melden, herleveren, revisie, nieuwe link, offerte, aanbetaling/restant, deels/volledig terugbetalen, tegoed, annuleren, verbergen, verwijderen), btw-lijst, maandset, aanbevelingen/testimonials, berichten, logboek, trechter, diagnose, twee stappen, facturen per kwartaal + CSV, abonnementen (week starten, credits corrigeren), uitloggen en sessie-verloop. Ook op telefoon en in donker thema. Alles Nederlands; elke knop zegt wat er gebeurde. Ook hier opnieuw opbouwen waar het duidelijk beter kan.

## Stap 6 · Veiligheid en privacy (code én browser)
- Kan klant A iets van klant B zien of doen (bestelling, bestand, factuur, portaallink) door een nummer in de URL te veranderen?
- Verlopen en ingetrokken links, tokens, inlogcodes.
- Formulieren: honeypot, dubbel versturen, limieten (rate limits), CSRF/herkomstcontrole.
- Cookiemelding: standaard niets aan, keuze onthouden, cookiebeleid klopt.
- AVG: wat bewaren we, kan een klant zijn gegevens laten verwijderen, staat dat juist op /privacy.

## Stap 7 · Automatisch en koppelingen
Op live te zien: nachtrapport, betaalherinnering, verval, vrijgegeven datum, tevredenheidsherinnering. Niet op live te forceren (tijd vooruit, beelden verlopen, chargeback, bounce, dubbele webhook, mislukte incasso als Mollie-test die niet kent): in je testomgeving, en die mail via Resend naar hello@ sturen zodat ik hem echt zie.

## Stap 8 · Alle pagina's (NL + EN, ±97)
Op 1440, 1280, 768 en 390 px per sectie: indeling (lege vlakken, scheve kolommen, te groot/te klein), teksten onderling consistent (prijzen, levertijd, aantallen, namen, beloftes), NL/EN gelijk, taalwissel blijft op dezelfde pagina, links/404, toetsenbord/focus, contrast/leesbaarheid, consolefouten en mislukte netwerkverzoeken, beeldgewicht en laadtijd, meta/JSON-LD/sitemap/robots/hreflang/llms.txt, juridische pagina's (datum, KVK), 404-pagina. Bouw secties van de grond af opnieuw op waar dat duidelijk beter en compacter is, met het idee achter VISUAILS als maatstaf.

## Stap 9 · Concept (eerst voorleggen, met wat/waarom/kosten/schets)
Minstens: vaste "zo werkt het in 4 stappen", menu inkorten, keuzehulp "wat past bij mij?", prijscalculator, startlijstje in Studio, mail bij weekstart, FAQ naar ~20 vragen, lichte achtergrond op alle pagina's, de naam "Beam" in de galerij. En alles wat je onderweg zelf bedenkt: taken die ik mis.

## Wat je niet kunt testen
Schrijf het op in plaats van het over te slaan: Safari/iPhone-specifiek gedrag, Outlook en andere mailprogramma's, echte (niet-test) betalingen. Geef per punt aan hoe ik het zelf kan controleren.

## Repareren
- Fout → werklijst (klanttype, stap, verwacht, gebeurd, bewijs).
- Repareer in je werkkopie, draai de test én de volledige reeks, lever in mijn map (eerst mijn datums controleren), vraag mij te deployen.
- Daarna dezelfde stap op live opnieuw: pas afvinken als het op live klopt.
- Stop en vraag bij inloggen of alles wat geld of mijn accounts raakt.

## Nacontrole — stap voor stap, na alle reparaties
1. Elk punt in WERKLIJST-RONDE-9.md heeft bewijs; zonder bewijs = niet gedaan → alsnog doen.
2. Vergelijk de werklijst met deze opdracht, kopje voor kopje: is elk onderdeel van stap 0 t/m 9 terug te vinden?
3. Per klanttype de eindtoestand in Studio en /admin (status, betaald, geleverd, afgerond, score, factuur).
4. Gmail per klanttype: alle mails met onderwerp en tijd; ontbrekende of onterechte mails = fout.
5. Bestelmatrix: elke cel een ordernummer of een reden.
6. Pagina's: schermafdruk op 1280 en 390 na de laatste deploy, naast die van de eerste ronde.
7. Volledige testreeks op de laatste stand van mijn map: groen.
8. Elke reparatie staat in mijn map én is op live te zien.
9. Opruimen: testbestellingen/-klanten verbergen of verwijderen, testabonnementen opgezegd, geen open testbetalingen, testfacturen herkenbaar als test (en niet in de echte aangifte-CSV).
10. Eindverslag: per klanttype wat goed en fout ging; DIRECT (gedaan) en OPTIONEEL (voor mij); wat je niet kon testen en hoe ik het zelf controleer; werkschema voor mij.

Begin bij stap 0 en meld je na stap 0 kort voordat je gaat bestellen.
