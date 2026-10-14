# Voortgang — waar staat het? (bijgewerkt 12 oktober)

Dit bestand houdt Claude bij, zodat er niets verloren gaat als een sessie stopt.

## In je map, getest (241 tests groen), nog niet live
- Blok 1 (14 beveiligingsfixes), blok 2, de NU-lijst, ronde A1
- Ronde A2: bedankpagina, mails, formulier (kosten, App ons, btw-vinkje), Studio (foto's nasturen, bestelkaart), /start, €1-proef, proef dicht + wachtlijst, fotogids op één A4
- Ronde A3: "wat nu"-blok, afrondscherm, toestemming, bestel met dezelfde look, proef als verkooppagina, stil afronden, WhatsApp/bel-knoppen, review vragen, kleurtrouw
- Ronde A4: Nu-doen-lijst + nachtrapport, revisie op één plek, werkmap compleet, Photoshop-script leest de werkmap, herkomsttag automatisch
- Ronde B: abonnement zonder week — bestellen met credits in het gewone formulier, creditboek, credits 3 maanden geldig, twee termijnen, één abonnementspagina met saldo, pauzeren/opzeggen met reden, terugboeking
- Na de controle tegen afvinklijst 1: botcheck-sleutels in /admin/diagnose (stap 6b in LIVE-STAPPEN), tip met het witte vel bij het close-upvak, back-ups hoogstens 30 dagen
- 11 oktober: stap 2 is één kaart per product (5 fotokiezers in plaats van 15 bij 5 producten), het gezicht kies je één keer in stap 1, stap 3 zegt "Telefoon of WhatsApp", en het formulier onthoudt je keuzes en foto's (niet je gegevens)
- 11 oktober: "Ook als PNG / WebP" op de bestelkaart in Studio + pagina Formaten in /admin; herkomsttag trainedAlgorithmicMedia, ook in video
- 11 oktober: privacy en verwerkersovereenkomst (14 dagen, ByteDance via Magnific, beelden zonder einddatum, mail 2 jaar, back-ups), proef "opent in rondes", lookpagina's kort en beeldvullend
- 11 oktober: voorwaarden (stil afgerond = aanvaard, portretrecht, beelden zonder einddatum) en "Weer openen" in /admin
- 12 oktober (afvinklijst 4): spaarplafond — zolang het abonnement loopt vervalt er niets, je spaart hoogstens 3 maanden aan credits, bij pauze of stop één einddatum (3 maanden na de laatste termijn); voorwaarden §9a, /plans, FAQ en Studio zeggen het zo
- 12 oktober: extra credits bijkopen (10, 25 of 50; prijs van je eigen plan, 5% en 10% korting; hoogstens 100 per maand) in Studio en in stap 5, met eigen Mollie-betaling en factuur; nieuwe migratie 0067
- 12 oktober: back-ups 3 kopieën ("uiterlijk na 8 weken"), "Telefoon of WhatsApp" met een geruststellende regel (ook op /contact), ontbrekende extra hoekfoto's overal gemeld, PNG-tekst "zonder kwaliteitsverlies" en FORMATEN.bat
- 12 oktober (afvinklijst 5): het eerste voorbeeld van de nieuwe voorpagina op /nl/voorbeeld/ en /voorbeeld/ (noindex, niet in de sitemap; de echte voorpagina is niet veranderd). Nieuwe huid "hal" (src/styles/hal.css), het nieuwe woordmerk in balk en footer met een glitch, Urbanist, de laptop met losse schermen, de dienstband "Wij doen de rest". Het ™ achter het logo is overal weg. Nieuwe test: tests/hal-voorbeeld.test.mjs. Huisregels voor de hal in KLEURENSCHEMA.md
- 12 oktober, avond: de hal IS de voorpagina (/ en /nl/), live bij je volgende UITROLLEN.bat. /voorbeeld/ stuurt met een 301 door naar /. Bewerken zegt "het formaat dat je kiest"; stap 3 toont goedkeuren per beeld (vier beelden met een vinkje) in plaats van drie formaten; het aanbevelingenblok staat er weer (onzichtbaar tot je de eerste publiceert). In de laptop zegt het nagemaakte bericht "Een paar telefoonfoto's erin" (was "Eén telefoonfoto erin"). De oude voorpagina (Voorpagina.astro) staat op de opruimlijst. editions-breed en editions-staand hoef je niet meer te maken: hun plek bestond alleen op de oude voorpagina

## Jouw stappen, in deze volgorde (dubbelklikken)
1. OPRUIMEN.bat
2. NA-UPDATE-INSTALLEREN.bat
3. UITROLLEN.bat (draait de tests, commit, push, nieuwe migraties 0054, 0055, 0056, 0058, 0060, 0061, 0063, 0065, 0066, 0067, live)
4. kladblok\LIVE-STAPPEN.md

## FORMATEN.bat (nieuw)
Vraagt een klant om PNG of WebP (je ziet het in /admin/formaten): download in Magnific de PNG-originelen van die bestelling naar één map, dubbelklik FORMATEN.bat, typ het bestelnummer (VIS-…) en sleep de map in het venster. Je ziet welke PNG bij welk beeld hoort; klopt het, typ J. Het script maakt van elke PNG een WebP, zet ze in de leverzip en zet het verzoek zelf op Klaar. Na een revisie: opnieuw draaien met de nieuwe PNG's.

## Cloudflare
- Het oude Pages-project is dicht (11 oktober), en "Automatic setup" van Web Analytics staat uit (12 oktober). Niets meer open.

## Wacht op jou
- Afvinklijst 7: welke andere pagina's een voorbeeld in de hal krijgen, en in welke volgorde (link in de chat)
- De teksten van de voorpagina nalezen: kladblok\TEKSTEN-VOORBEELD.md (● = nieuw in het voorbeeld, ◆ = veranderd op 12 oktober 's avonds)
- Afvinklijst 6 (Instagram-reeks 1), als je eraan toe bent
- Teksten van eerder vandaag met plek en Engels: kladblok\TEKSTEN-12-OKT.md

## Nog te bouwen
- De andere pagina's in de hal, in de volgorde die je in afvinklijst 7 kiest
- Instagram: de bewegende versies (als je dat kiest in afvinklijst 6)
