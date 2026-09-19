# Doorlichting visuails.com — 18/19 september 2026

Omgeving: visuails.com (live, build van 18 sep met pijlen onder de laptop, zonder hero-grond).
Betaling: alleen afronden als Mollie zichtbaar in testmodus staat.
Werkwijze: elke pagina op 1440 en op telefoonbreedte; per bevinding: waar, wat, voor wie, hoe zwaar.

## A. Publieke pagina's

### Homepage (1440 / 958)
- Op 958 px breed breekt de navigatie woorden af met koppeltekens: "PRIJ-ZEN", "GALE-RIJ", "CON-TACT". Ook de H1 breekt op 1424 px "CAM-PAGNE" af. `hyphens: auto` staat te breed aan (nav + koppen). → hyphens uit op nav en H1/H2; koppen breken op woordgrens.
- Placeholders (zwarte/grijze vlakken) in WAT WE MAKEN, DE SET, GEZICHTEN — bekend, hij maakt foto's zelf.
- Onder de footer ±280 px lege lime → nameten.

### /catalog (en zusters)
- 12.300 px lang. Prijs staat vijf keer (hero-feiten, tabel "Wat een catalogset kost", "Eén product. Vier foto's…", "Wat er verandert bij 10 producten", slot-CTA). Zelfde boodschap 3–5× is de grootste bron van onrust; pagina kan 30–40 % korter.
- Sectie "Kies je Catalog-stijl" + "In de maak" + "Eigen look" staan achter `.reveal.pending` (opacity 0 tot scroll). Werkt, maar zonder JS-observer blijft het leeg.

### /start/catalog — bestelformulier, klanttype 1 (starter, 1 product), account TEST
- Hero van het bestelformulier vult het hele eerste scherm (715 px) met alleen titel + 2 regels; het formulier begint pas na scrollen. → hero op bestelpagina's inkorten tot ±40 % scherm.
- Stap 1: aantal heeft twee bedieningen (− [ ] + én 1/5/10/20). → één: de snelkeuze met een "ander aantal" veld dat pas verschijnt op klik.
- Stap 1: drie secundaire links op één scherm ("Iets anders bestellen", "Vraag een eigen stijl aan", "Meer dan 20 producten?") + "Wijzigen voor deze bestelling" — vier ontsnappingen. → één "Iets anders?"-regel onderaan.
- Stap 1: onder "Beeldvorm" een lege accordeonregel (twee haarlijnen zonder inhoud). → bug, nakijken in markup.
- Stap 1: "Voorrang bij levering" — vette mono-kop in kapitalen + checkbox + "+ €49" rechts: leest als een waarschuwing. → zie ontwerpvoorstel.
- Stap 1: stappenbalk is een raster van 5 kolommen met 4 stappen → lege vijfde cel rechts.
- Stap 2: "Gedragen · OPTIONEEL" moet toch actief worden overgeslagen ("Nog één ding bij gedragen: stuur hem mee of sla hem over") — optioneel dat een klik eist. → leeg = overgeslagen; alleen een zachte hint.
- Stap 2: modelrij: "Zelfde"-tegel toont het oude V-beeldmerk i.p.v. het gekozen gezicht (Fiye), en Fiye staat er daarnaast nog een keer. Bij een merkkit-vergrendeling is de order-radio niet het gezicht zelf. → bug in vulModelTegels/beeldBoven.
- Stap 2: vaste balk "Ook lifestyle erbij? €89 → €149" onderaan overlapt de Terug/Verder-knoppen. → balk boven de knoppen laten stoppen of inklappen bij de stapnavigatie.
- Stap 2 → 3: na "Verder" blijft de scrollpositie staan; omdat stap 3 korter is, kijkt de klant ineens naar "NOG NIET KLAAR OM TE BESTELLEN?" → na elke stapwissel naar de stapkop scrollen.
- Stap 3 (ingelogd): opgeslagen gegevens als kale regels zonder labels (naam, achternaam, "Test", mail, tel, url, btw, NL, straat, postcode, plaats). → als adreskaart met labels.
- Stap 4: betaaluitleg staat twee keer (regel "Je betaalt meteen of via de link…" en alinea "Hier vul je geen kaartgegevens in…"). → één keer.
- Stap 4: "Referentiemateriaal: Dat product heeft wat we nodig hebben." — zin in een samenvattingsrij. → "Compleet (3 van 3)".
- Na versturen: bedankpagina "BEDANKT — WE HEBBEN JE AANVRAAG" in lime met vinkje, terwijl er nog niet betaald is; betalen is een tweede knop rechts. Klant kan denken dat hij klaar is. → óf direct naar Mollie, óf kop "Nog één stap: betalen".
- Mollie-pagina: domein niet vrijgegeven voor de extensie; testmodus niet kunnen zien. Bestelling VIS-7ENH-BMR staat onbetaald.
- Scrollen: bij snel scrollen paint Chrome eerst de donkere body en pas daarna de lichte panelen (donkere flitsen in schermopnames). Op device nakijken; zo ja: body-achtergrond licht maken en het donker per sectie.

### /account en Studio (account TEST)
- /nl/account/ → 404, en die 404 is Engels op een /nl/-URL. Studio leeft op /account zonder taalprefix. → /nl/account/* doorsturen naar /account?lang=nl; 404 taal uit de URL afleiden.
- Overzicht/bestellingen: pil "ONTVANGEN" naast "Nog niet betaald" en tijdlijn "Wacht op betaling" — drie statuswoorden voor één toestand. → één status: "Wacht op betaling".
- Facturen: PROEF-2026-00xx-facturen staan bij geannuleerde bestellingen; geen creditnota. → factuur pas bij betaling, of creditnota bij annulering (voor echte klanten belangrijk).
- Abonnement-pagina: kaart "Je look, één keer gezet" toont GEZICHT "—" met daarnaast wél een portret (Fiye). → één bron.
- Het oude V-beeldmerk staat nog op: de "Zelfde"-tegel in het bestelformulier, de abonnement-illustratie (donkere tegels met V), het inlogscherm, de FOTO-VOLGT-plaatshouders en het middelste voorbeeld in "Wat je krijgt" bij lifestyle. Lucas: dat merk nooit meer gebruiken. → neutrale plaatshouder (raster/haarlijn) en een "="-tegel voor "Zelfde".
- Inloggen: "Als dat adres al eerder bij ons besteld heeft, is er een mail onderweg" — goed tegen enumeratie, maar wie een tikfout maakt wacht eindeloos. → na 2× "Nieuwe mail sturen" een WhatsApp-uitweg tonen.
- Eigenaarsmail "New catalog order — VIS-…": Engelse onderwerpregel, Nederlandse body, sleutel-waarde-dump ("tier unattended", "model c4", "Standard queue — no window, by design"), 10 MB met bijlagen. → leesbare labels (Fiye i.p.v. c4), bijlagen als links.

### /start/lifestyle — klanttype 2 (modemerk, 5 producten, model per product, voorrang), nieuw account hello@visuails.com
- Stap 1: de vier looks zijn radio's maar getekend als vierkante checkboxes → leest als meerkeuze. → radiostijl (rond) of de hele kaart als keuze zonder vinkje.
- Stap 1: vier lege lookkaarten van ±300 px (FOTO VOLGT) domineren het scherm; bekend.
- Stap 1: de lege accordeonregel is "Wanneer kan het sneller?" (`.dc.dc-plain`, hoogte 0 maar de scheidingslijnen blijven staan) zolang voorrang uit staat. → bij verbergen ook de lijnen weg (`display: none` op de wrapper).
- Stap 2: "Wie draagt het?" — de tegel "Wij kiezen" heeft standaard een zwarte rand en oogt gekozen, maar er is NIETS gekozen; pas onderaan de stap (2000 px lager) komt "Kies wie het draagt — of kies de eerste tegel". Klant ziet de fout niet bij het veld. → geen rand op ongekozen tegels; fout bij het veld + ernaartoe scrollen; of "Wij kiezen" echt voorvinken.
- Stap 2: de portretten in "Wie draagt het?" laden lui en staan de eerste seconden grijs terwijl de rij eronder al portretten heeft. → eager laden voor de eerste rij.
- Stap 2: lege vaste balk `.pl-combi-balk` (46 px, alleen een ˄) onderaan het scherm bij lifestyle — de combi-upsell heeft hier geen inhoud maar rendert wel. → balk alleen renderen met inhoud.
- Stap 2: rail met vakjes werkt goed (5 × 4 vakjes, "Product 3 van 5 · 3 af"). Per-product model (Ava, Aaron, Seme) werkt en staat in "Meer over dit product".
- Stap 3 (nieuw): 16 velden op één scherm; telefoon verplicht; btw-nummer verplicht tenzij vinkje → dan KVK verplicht; "Wat voor soort product gaat deze bestelling over?" is één keuze voor een bestelling met 5 verschillende producten (overhemd, jack, trui, cargo, sneaker) en triggert nog een vervolgvraag ("tailleband aan de rand van het beeld"). → soort per product in stap 2 (het staat al in "Meer over dit product"); telefoon optioneel tenzij WhatsApp gekozen; adres pas op de factuur-tab.
- Stap 4: "ORDERBEDRAG (EXCL. BTW) €410" terwijl de zijbalk €492 zegt (410 + 82 voorrang). De samenvatting laat de toeslag weg. → BUG, geld.
- Stap 4: "LEVERING" staat twee keer in de tabel (voorrang-regel én levertijdregel).
- Stap 4: de miniatuurstrook toont 5 producten + een zesde foto met bijschrift "1:1 · Vierkant" — een productfoto als verhoudingsicoon.
- Bevestigingsmail klant (VIS-JMYK-XMO): zegt "Standaard levertijd, geen vaste opleverdatum" terwijl er voorrang (+€82) is betaald → BUG. Bevat een rauwe entiteit "&rarr;" in de platte tekst. Zin "Na een paar minuten nog niets? Kijk in je spam" staat ín de mail die al binnen is. Geen look (Dunes) en geen modelkeuzes in de mail.

### /start/catalog — klanttype 3 (20 producten, bulk-upload, vaste leverdatum), hello@visuails.com
- Stap 1: bij 20 verdwijnt "Voorrang" (goed) maar de lege regel "Wanneer kan het sneller?" blijft als twee haarlijnen staan.
- Stap 2, "Liever één hele map sturen?": de sorteerder werkt goed — 3 losse bestanden "SKU-01-voorkant/-achterkant/-detail" landen in de juiste vakjes met de productnaam "SKU-01". (Mijn eerdere meting met 40 losse bestanden was een dubbele drop van dezelfde 60 bestanden; dat was geen fout van de sorteerder.)
- Wél gevonden door die dubbele drop: wie dezelfde bestanden nog een keer sleept (bijv. een verbeterde map), krijgt geen vervanging maar het eerste bestand in het vak "Gedragen" en de rest in de bak met keuzelijsten — 40 rijen met elk 80 opties en een knop "Plaats deze". → zelfde bestandsnaam op dezelfde kaart = vervangen (met melding), nooit doorschuiven naar een leeg vak.
- Na die drop telt admin "Bestanden (56)" bij 60 verstuurde bestanden: vervangen bestanden verdwijnen uit de telling maar niet uit de bak. → telling en bak gelijk trekken.
- Stap 4 (samenvatting) zei "20 optionele foto's toegevoegd" door datzelfde doorschuiven naar "Gedragen".
- Stap 5 "Levertijd": kalender toont heel september (1–18 grijs, 28–30 grijs), alleen 22–27 kiesbaar; geen oktober, geen maandnavigatie. Wie over drie weken een launch heeft kan niets kiezen. Cellen 112 px hoog vóór de keuze, 56 px erna (sprong). → alleen het kiesbare venster tonen als rij van dagkaarten + "later"-knop; celhoogte vast.
- Stap 5 tekst zegt "we bevestigen de leverdatum voordat je betaalt", bedankpagina vraagt meteen om te betalen. → één verhaal.
- Stap 4: miniatuurstrook toont productfoto's als icoon voor "Wit · #FFFFFF" en "1:1 · Vierkant" (een T-shirtfoto met bijschrift "Wit").
- Stappenbalk: de lege vijfde cel is voor "Levertijd", die alleen bij ≥10 producten bestaat; bij 1 product blijft de cel leeg staan.

### /start/video — klanttype 4
- Video is "In aanbouw": geen bestelling maar een aanvraag (soort, aantal, bericht). Homepage en /video adverteren "vanaf €69 per clip" met bestelknoppen. → op de deur "op aanvraag" zetten, of het bestelformulier openzetten.
- Na versturen: bedankpagina gebruikt de bestel-tekst ("we maken je visuals", "Levertijd: zo snel mogelijk"), Studio toont "We hebben je bestelling en je bestanden binnen. We plannen hem in.", admin toont "0 clips × Video" (1 gekozen) en "Eerst af: MORGEN". → aparte kopij en status voor aanvragen; aanvragen niet in de planning.
- "Een schriftelijk antwoord van Lucas" — enige plek met een voornaam; elders "een specialist".

### /test-sample — klanttype 5 (€1)
- Stuurt na versturen DIRECT door naar Mollie (goed) — anders dan de gewone bestelling die eerst op de bedankpagina landt. → gewone bestelling ook direct naar Mollie.
- Mollie staat in testmodus op visuails.com ("Let op: dit is een testmode-betaling"). Betaling afgerond: VIS-VX60-HON betaald.
- Terug van Mollie: bedankpagina zegt nergens "betaling ontvangen" — zelfde pagina als onbetaald, alleen zonder betaalknop. → expliciete bevestiging.
- Mollie-checkout toont het oude V-beeldmerk als winkellogo (Mollie-profiel). → logo in Mollie vervangen.
- Hero op /test-sample (live) heeft nog de laptop met witte studiogrond op een donker paneel; lokaal al weg.

### /start/plan — klanttype 6 (abonnement Studio, maandelijks)
- Formulier heeft géén zakelijk-verklaring en géén herroepingsvinkje, btw optioneel zonder KVK-alternatief — anders dan het bestelformulier. → één juridische set.
- Na betalen (€955,90 test) landt de klant op een kale INLOGPAGINA ("Vul het e-mailadres in waarmee je hebt besteld") zonder één woord over de betaling of het abonnement. Wie net €956 betaalde, denkt dat er iets mis is. → bedankpagina "Je abonnement loopt" + automatisch ingelogd (de mail-link) of minstens de uitleg op de inlogkaart.
- Daarna in Studio klopt alles: LOOPT, volgende afschrijving oktober, 0/12 slots, "Jouw week: de 8e", factuur PROEF-2026-0013.

### Studio als Studio Proefmerk (na inloggen met code)
- Overzicht: "Probeer VISUAILS · 1 producten" (meervoud bij 1).
- Bestellingen: lifestyle-order met voorrang toont "Normale doorlooptijd — zo snel mogelijk" → voorrang kwijt (zie backend).
- 20-productorder: 20 productregels volledig uitgeklapt met 20× "Hier is nog niets voor geleverd · Bekijk de foto's" → inklappen tot geleverd.
- "Bekijk de foto's" toont lege leverplaatsen (#1 · Voorkant…), niet wat de klant zelf stuurde. → "Wat je stuurde" tonen.
- Inlogcode: typen via de extensie kwam niet aan (form_input wel) — de code-input zet waarschijnlijk de waarde op input-event; nakijken of plakken/autofill werkt.

### /admin (ingelogd door Lucas)
- Dashboard: bestellingen-tabel scrollt horizontaal op 1424 px; de kolom BESTANDEN (de enige link naar de orderpagina) staat buiten beeld. Klik op de referentie doet niets (de rij is een <summary> die alleen status/annuleren/merkmodel opent). → referentie = link naar de orderpagina.
- Orderpagina (/admin/orders/75/files) "Wat de klant koos": Stijl, Verhouding, Gezicht "any", Kledingsoort "top" — maar NIET: het model per product (ava/aaron/seme staan wél in de data), het bericht van de klant, de voorrang, "Meer over dit product". Lucas kan niet zien wat er gemaakt moet worden. → alle klantkeuzes op de orderpagina, per product.
- Voorrang: `voorrang 1` zit in de data en is berekend (€82), maar mail klant, mail eigenaar ("Standard queue — no window, by design"), Studio en admin ("wachtrij · zo snel mogelijk") negeren hem. → BUG: voorrang doorzetten naar levermodus, tijdlijn, mails, planning.
- Taalmix in admin: "lifestyle · received · 5 products", "Note (optional, goes on the client's timeline too)", "New custom model label (e.g. 'Studio Look A')", "One standing message on their order page. Not a chat…", "SAVE".
- Video-aanvraag telt als bestelling "0 clips × Video", staat in "Eerst af: MORGEN".
- "Bestanden (56)" bij 60 geüploade bestanden.
