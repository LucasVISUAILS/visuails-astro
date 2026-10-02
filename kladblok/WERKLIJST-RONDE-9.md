# Werklijst ronde 9 — volledige doorloop op live

Opdracht: kladblok/PROMPT-RONDE-9.md. Per punt na afloop: wat ik deed, wat ik zag, bewijs (schermafdruk in kladblok/ronde-9/, ordernummer, mailonderwerp + tijd in Gmail), fout ja/nee. Een fout is pas opgelost als hij op live opgelost is.

Legenda: [ ] open · [x] gedaan, met bewijs · [!] fout gevonden (zie "Fouten") · [~] niet te testen op live (zie onderaan)

---

## 0 · Voorbereiden

- [x] 0.0 Herstel na ronde 8 (2 oktober, op aanwijzing van Lucas): kaarten op zwart terug op home en stijlpagina's (de "zonder grond"-modus is eruit); Editions weer zwart; "Wat we maken" terug; "Dit stuur jij. Dit krijg je terug." opnieuw opgebouwd als pijplijn in drie rijen (01 jij stuurt · 02 wij maken · 03 jij keurt goed) met kleine beelden op vaste hoogte; de vier CSS-waarschuwingen uit de build (keyframes `entry 0%` in LaptopCarousel) weg. Geleverd in de map; wacht op deploy.
- [x] 0.1 Live draait de laatste versie (2 oktober, na deploy): pijplijn op de home, kaarten op zwart, Editions zwart, #maken aanwezig, 2 videokaarten in /nl/gallery, "oktober 2026" op /nl/ai-act.
- [x] 0.2 Regressie ronde 8 op live: complete noindex, combi weg, sitemap/llms zonder complete, video "op aanvraag" in llms/menu, Q&A-antwoorden, levertijd, gidsentitel, vergelijking 30 catalogsets, hiw 120/90, bedanktpagina-blok "afgezegd", portaaltekst, lifestyle zonder Campaign — alles in orde. Eén nieuwe fout: F1.
- [x] 0.3 Werkkopie gelijk met de map; volledige testreeks groen (2 oktober, na het herstel: alleen "KLAAR").
- [x] 0.4 Deze werklijst.
- [x] 0.5 Klanttypes vastgelegd (tabel hieronder).
- [x] 0.6 Mailkoppen (mail "Betaling ontvangen — VIS-CVL5-CZP", 2 okt 03:02): spf=pass (send.visuails.com), dkim=pass (visuails.com, selector resend), dmarc=pass (p=QUARANTINE); From "VISUAILS <orders@visuails.com>", Reply-To hello@visuails.com.

### Klanttypes

| # | Wie | Adres | Apparaat | Taal | Bestelling |
|---|-----|-------|----------|------|------------|
| 1 | Jonge starter | hello+starter@visuails.com | 390 | NL | €1-proef catalog; tweede proef (moet geweigerd); catalog 1 product |
| 2 | Oudere boetiekeigenaar | hello+boetiek@visuails.com | 1280 | NL | contactformulier; lifestyle Dunes, 3 producten, 4K, 4:5 |
| 3 | Drukke webshop | hello+webshop@visuails.com | 1280 | NL | catalog 12, vaste datum, extra hoeken, voorrang, eigen kleur, model, outfit, map-upload; betaling verloopt, later via link |
| 4 | Wantrouwige klant | hello+twijfel@visuails.com | 390 | NL | WhatsApp, contact, Studiobrief, juridisch; lifestyle Phone-made 1; eerste betaling mislukt |
| 5 | Engelse klant buiten de EU | hello+uk@visuails.com | 1280 | EN | catalog 5, GB |
| 6 | EU-bedrijf | hello+eu@visuails.com | 1280 | EN | catalog 3, DE, geldig/ongeldig btw-nummer; afwijzen, dan goedkeuren |
| 7 | Bureau | hello+bureau@visuails.com | 1280 | NL | twee bestellingen, twee merken; video Motion → offerte; eigen look → offerte |
| 8 | Merkmodel-klant | hello+model@visuails.com | 390 | NL | merkmodel (beide routes bekijken), daarna bestelling met dat model |
| 9 | Abonnee | hello+abo@visuails.com | 1280 | NL | plannen bekijken, Pro afsluiten, hele abonnementsloop, opzeggen |
| 10 | Boze klant | hello+boos@visuails.com | 390 | NL | catalog 2; revisies, intrekken, na termijn; deels terug/tegoed; tweede bestelling met tegoed |
| 11 | Annuleerder | hello+annuleer@visuails.com | 1280 | NL | niet betalen → annuleren (2×) → heropenen → oude betaallink; betaalde bestelling annuleren met terugbetalen |
| 12 | WhatsApp-klant (via admin) | hello+whatsapp@visuails.com | 1280 | NL | klant + bestelling in /admin, klant uploadt en betaalt |
| 13 | Toetsenbordgebruiker | hello+toetsenbord@visuails.com | 1280 | NL | catalog zonder muis, Studio zonder muis |
| 14 | Tabletgebruiker | hello+tablet@visuails.com | 768 | NL | lifestyle Glow 2, volledige keten |

---

## 1 · Klanttypes (per klant: a eerste indruk · b bestellen · c betalen · d mails · e Studio · f admin leveren · g Studio keuren/revisie · h admin revisie · i Studio afronden/downloads/factuur · j admin score/factuur/klant · k factuur controleren · l bevindingen)

- [ ] 1.1 Jonge starter
- [ ] 1.2 Oudere boetiekeigenaar
- [ ] 1.3 Drukke webshop
- [ ] 1.4 Wantrouwige klant
- [ ] 1.5 Engelse klant buiten de EU
- [ ] 1.6 EU-bedrijf
- [ ] 1.7 Bureau
- [ ] 1.8 Merkmodel-klant
- [ ] 1.9 Abonnee
- [ ] 1.10 Boze klant
- [ ] 1.11 Annuleerder
- [ ] 1.12 WhatsApp-klant via admin
- [ ] 1.13 Toetsenbordgebruiker
- [ ] 1.14 Tabletgebruiker

## 2 · Bestelmatrix
- [ ] 2.1 Catalog: elke stijl, achtergrond, beeldverhouding, extra hoeken, outfit, model/merkmodel, marktplaatsformaten
- [ ] 2.2 Lifestyle: Dunes, Flash, Glow, Phone-made, eigen look; 4K; verhouding per beeld
- [ ] 2.3 Video: Motion, Lifestyle Video, Campaign, eigen look
- [ ] 2.4 Hooks en Editions: wat kan een bezoeker doen
- [ ] 2.5 Aantallen 1, 4, 5, 9, 10, 19, 20+
- [ ] 2.6 Uploads: HEIC, >25 MB, verkeerd type, verplichte foto vergeten, map, later nasturen
- [ ] 2.7 Land/btw: NL ±KVK, EU geldig/ongeldig, buiten EU, particulier
- [ ] 2.8 Betalen: betaald, mislukt, verlopen, geannuleerd, later via link, tegoed deels/volledig
- [ ] 2.9 Ingelogd/niet, terugkerende klant, terugknop/verversen, twee tabbladen
- [ ] 2.10 /start: elke deur

## 3 · Contact
- [ ] 3.1 Contactformulier: elk onderwerp, elke voorkeur
- [ ] 3.2 WhatsApp-knoppen per pagina (tekst + nummer)
- [ ] 3.3 Mailadressen en telefoonnummer
- [ ] 3.4 Studiobrief aan- en afmelden
- [ ] 3.5 "Vraag een specialist" in Studio
- [ ] 3.6 Antwoorden op mails → juiste ontvanger
- [ ] 3.7 Fotogids-pdf

## 4 · VISUAILS Studio
- [ ] 4.1 Inloggen: verkeerde/verlopen code, te vaak, inloglink, terug naar bestemming, uitloggen, twee apparaten
- [ ] 4.2 Lege en volle staat
- [ ] 4.3 Elke bestelstatus
- [ ] 4.4 Goedkeuren/ongedaan/revisie/notitie
- [ ] 4.5 Downloads (zip, los)
- [ ] 4.6 Facturen en creditnota's
- [ ] 4.7 Gegevens wijzigen (btw, e-mail)
- [ ] 4.8 Vaste look
- [ ] 4.9 Abonnementstabbladen
- [ ] 4.10 Licht/donker, taalwissel, menu op telefoon
- [ ] 4.11 Indeling per scherm (lege vlakken, onduidelijke teksten)

## 5 · /admin
- [ ] 5.1 Dashboard en planning
- [ ] 5.2 Klanten, nieuwe klant
- [ ] 5.3 Bestelling: upload vak/map, verkeerd bestand, melden, herleveren, revisie, nieuwe link
- [ ] 5.4 Offerte, aanbetaling/restant
- [ ] 5.5 Terugbetalen deels/volledig, tegoed, annuleren, verbergen, verwijderen
- [ ] 5.6 Btw-lijst
- [ ] 5.7 Maandset, aanbevelingen/testimonials
- [ ] 5.8 Berichten, logboek, trechter, diagnose, twee stappen
- [ ] 5.9 Facturen per kwartaal + CSV
- [ ] 5.10 Abonnementen: week starten, credits corrigeren
- [ ] 5.11 Uitloggen, sessieverloop, telefoon, donker
- [ ] 5.12 Indeling per scherm

## 6 · Veiligheid en privacy
- [ ] 6.1 Klant A ziet niets van klant B (nummers in URL)
- [ ] 6.2 Verlopen/ingetrokken links, tokens, codes
- [ ] 6.3 Formulieren: honeypot, dubbel versturen, limieten, herkomstcontrole
- [ ] 6.4 Cookiemelding
- [ ] 6.5 AVG: bewaren, verwijderen, /privacy

## 7 · Automatisch en koppelingen
- [ ] 7.1 Nachtrapport, betaalherinnering, verval, vrijgegeven datum, tevredenheidsherinnering (live)
- [ ] 7.2 Tijd vooruit, beelden verlopen, chargeback, bounce, dubbele webhook, mislukte incasso (testomgeving → mail via Resend naar hello@)

## 8 · Alle pagina's (NL + EN)
- [ ] 8.1 Indeling op 1440/1280/768/390
- [ ] 8.2 Teksten consistent; NL/EN gelijk; taalwissel blijft op de pagina
- [ ] 8.3 Links/404, toetsenbord/focus, contrast/leesbaarheid
- [ ] 8.4 Consolefouten, mislukte verzoeken, beeldgewicht
- [ ] 8.5 Meta/JSON-LD/sitemap/robots/hreflang/llms.txt
- [ ] 8.6 Juridische pagina's, cookiemelding, 404

## 9 · Concept (voorleggen)
- [ ] 9.1 Voorstellen met wat/waarom/kosten/schets

---

## Inventaris openstaand (2 oktober, na vraag van Lucas: "kijk zorgvuldig na of dat echt alles is")

Opdracht stap 0–9 + nacontrole regel voor regel naast deze lijst gelegd. Wat er nog niet stond:

- Klanttype 1 (starter, 390): a) eerste indruk op de telefoon niet vastgelegd · b) "klikt veel terug": terugknop, verversen en dubbelklik op versturen niet gedaan · d) links in de mails op telefoonbreedte en spammap · e) maillink op een ander apparaat · i) zip en losse downloads, factuur-pdf openen · k) factuur volledig nalopen (nummerreeks, datum, KVK/btw beide kanten) · l) bevindingen
- Klanttype 2 (boetiek, 1280): a) home → dienst → stijl → prijzen → FAQ lezen en vastleggen · i) downloads · j) klantpagina in /admin · k) factuur nalopen
- Klanttype 3 (webshop): f t/m l nog te doen (VIS-VS4X-BRJ, order 82)
- h) bij één klant revisie afhandelen met "geen nieuw beeld nodig" — nog bij niemand gedaan
- j) testimonial met toestemming goedkeuren en nakijken waar hij op de site verschijnt — nog bij niemand gedaan (op live alleen als TEST en meteen weer verbergen, of in de testomgeving)
- Bewijs: schermafdrukken in kladblok/ronde-9/ ontbreken nog; tot nu toe alleen ordernummers en mailonderwerpen + tijden
- Labels per dienst: ook het revisieblok op het admin-dashboard, de bestandentabel van een bestelling en de LEESMIJ in de zip noemden een lifestylebeeld "Voorkant" — hersteld in de werkkopie (bij F17)
- Elke "wacht op deploy" hierboven: na de deploy op live opnieuw, pas dan afvinken
- Geld: nagaan of er echte bestellingen van 10+ producten met extra hoeken zonder betaling zijn (F25) — query aan Lucas gegeven

## Fouten

Vorm: F-nummer · waar · wat er gebeurt · ernst (hoog/middel/laag) · status.

- F1 · /nl/<onbekend> · geeft de Engelse 404 ("Page not found"), niet de Nederlandse · middel · hersteld in de map (2 okt), getest in de testomgeving — wacht op deploy
- F2 · bestellen, €1-proef, stap 2 · de uploader zegt "Meer beelden terug? Kies in stap 1 bij 'Een hoek erbij' tot 4 extra hoeken" — bij een proef kan dat niet · middel · hersteld in de map (2 okt), getest in de testomgeving — wacht op deploy
- F3 · bestellen, stap 5 (controleer en betaal) · "een vastgezette leverdatum blijft zeven dagen voor je staan terwijl je betaalt" staat er ook bij een bestelling zonder vaste datum (VIS-CVL5-CZP) · laag · hersteld in de map (2 okt), getest in de testomgeving — wacht op deploy
- F4 · Studiobrief in de voet · de foutregel "Dat lukte niet. Klopt het adres?…" heeft bij het laden geen hidden-attribuut — zichtbaarheid nog nagaan · geen fout: de regel staat met display:none in de CSS (.sb-fout) en verschijnt alleen bij .is-fout; voor een voorleeshulp is hij dan ook onzichtbaar
- F5 · bestellen, stap 2 "Wie draagt het?" · niets is voorgekozen; de tegel "Wij kiezen" is een blauw vlak en lijkt al aangevinkt. De starter klikt op Verder en krijgt pas dan "Kies wie het draagt". Voorstel: "Wij kiezen" standaard aanvinken · middel · hersteld in de map (2 okt), getest in de testomgeving — wacht op deploy. Niet "Wij kiezen" voorgekozen (jij wilde bewust een eerste keuze), wel: het VISUAILS-vak is grijs tot het gekozen is, en de hint zegt "Kies een gezicht, of tik op het VISUAILS-vak"
- F6 · bestellen, stap 5 · de strook bovenaan toont naast de roze jeans twee keer een zwart T-shirt als voorbeeld voor "Wit · #FFFFFF" en "1:1 · Vierkant" — leest als een verkeerd product · middel · hersteld in de map (2 okt), getest in de testomgeving — wacht op deploy: achtergrond als kleurstaal, verhoudingskader met de eigen voorkant van de klant
- F7 · bestellen, stap 5 · laatste bedrag vóór Mollie is "€89 excl. btw"; Mollie vraagt €107,69. Het bedrag incl. btw staat nergens op de pagina (wel in de mail achteraf) · middel · hersteld in de map (2 okt), getest in de testomgeving — wacht op deploy
- F8 · alle klantmails · interne ontwikkelaarsopmerkingen staan als HTML-commentaar in de mail ("DE BELOFTE STAAT IN DE VOET…", "#CCCCCC is --line…") — zichtbaar via "Origineel weergeven" · laag · hersteld in de map (2 okt), getest in de testomgeving — wacht op deploy
- F9 · bevestigingsmail · de knop heet "Volg je bestelling in VISUAILS Studio", maar opent de losse pagina "Je bestanden" zonder weg naar Studio (alleen een mailto) · laag · hersteld in de map (2 okt), getest in de testomgeving — wacht op deploy
- F10 · Studio-overzicht · tegel "In productie: 1" terwijl de bestelling zelf "Ontvangen" zegt · laag · hersteld in de map (2 okt), getest in de testomgeving — wacht op deploy: tegel heet "Bij ons in de maak" en linkt naar een filter dat precies die bestellingen toont
- F2b · lifestyle, stap 2 (productkaart) · dezelfde zin "Kies in stap 1 bij 'Een hoek erbij' tot 4 extra hoeken" staat ook bij lifestyle, waar stap 1 geen "Een hoek erbij" heeft · middel · hersteld in de map (2 okt), getest in de testomgeving — wacht op deploy
- F11 · bestellen, stap 5 · een afwijkende verhouding per beeld (product 1, beeld 3 op 16:9) staat niet in het overzicht; daar staat alleen "4:5". Wel goed doorgekomen in de adminmail (ratio_p1_3 wide) · laag · hersteld in de map (2 okt), getest in de testomgeving — wacht op deploy: regel "Afwijkend per beeld" (tot drie bij naam, daarboven het aantal)
- F12 · bevestigingsmail klant · noemt alleen dienst en aantal; niet de look (Dunes), het model (Dana), het formaat, 4K of de kanalen. Een klant kan niet nalezen wat hij bestelde · middel · hersteld in de map (2 okt), getest in de testomgeving — wacht op deploy
- F13 · portaal /o/…, revisieronde · zonder aangevinkt beeld op "Verstuur deze revisieronde" drukken: de pagina laadt opnieuw, de notitie is weg en er staat geen uitleg (portal.js handleRevisionRound → stille redirect naar #rr) · middel · hersteld in de map (2 okt), getest in de testomgeving — wacht op deploy
- F14 · admin, bestelpagina · de opmerking van de klant bij een revisie staat niet op de bestelpagina (alleen "revisie gevraagd" bij het vakje); hij staat op het dashboard. De adminmail zegt "De verzoeken staan bovenaan in het adminportaal, bij de bestelling" · middel · hersteld in de map (2 okt), getest in de testomgeving — wacht op deploy
- F15 · portaal na herlevering · blok "Je revisieronde ligt bij ons" blijft staan nadat het nieuwe beeld er is en is goedgekeurd; het herleverde beeld schuift naar achteren (voorkant als laatste) · laag · hersteld in de map (2 okt), getest in de testomgeving — wacht op deploy: portaal en Studio zeggen "Je revisieronde is verwerkt" zodra niets meer open staat; portaal sorteert op product en vak; Studio zet p10 na p9
- F16 · portaal "Jouw bestanden" · belooft "hetzelfde beeld als PNG, JPG en WebP"; admin zegt bij deze bestelling "4 van de 4 geleverde beelden hebben nog geen JPG, PNG én WEBP — de klant krijgt geen formaatmappen". Bij levering via de browser klopt de belofte dus niet · middel · hersteld in de map (2 okt), getest in de testomgeving — wacht op deploy: het portaal noemt de formaten die er echt in de map zitten; Studio belooft geen formaten meer. Mijn advies: altijd via npm run deliver leveren, dan klopt de oude zin weer vanzelf
- F17 · admin, werkbord bij lifestyle · het bord kent alleen de vier catalogushoeken (Voorkant/Achterkant/Detail/Gedragen; admin.js SHOT_KEYS). Een lifestylebestelling van 3 producten toont "0 van 12 vakjes", na levering "9 van 12". De studio moet de drie lifestylebeelden in catalogusvakjes zetten; de klant ziet ze in Studio als "Voorkant/Achterkant/Detail" en de bestanden heten …-voorkant.jpg. Ook de bijbestelde hoeken van catalog ("Een hoek erbij") hebben geen vakje · hoog · hersteld in de map (2 okt), getest in de testomgeving — wacht op deploy
- F17b · admin, bestelpagina · 4K (hi_p1) en de afwijkende verhouding per beeld (ratio_p1_3 = 16:9) staan nergens op de bestelpagina; alleen in de werkmap-zip en de adminmail. Wie vanaf het bord werkt, mist ze — en de klant betaalde €9 voor 4K · hoog · hersteld in de map (2 okt), getest in de testomgeving — wacht op deploy
- F18 · Studio "Laatst geleverd" en productkaarten · tegels van 128 px laden het volle origineel (3277–4096 px). Bij levering via de browser bestaat er geen beoordeelbeeld; met echte 4K-PNG's is dat tientallen MB per scherm · middel · open — voorstel aan Lucas: (A) bij uploaden via /admin een beoordeelbeeld van 1600 px in de browser laten maken en als preview_key opslaan, of (B) altijd npm run deliver. Admin meet het gewicht al (grens 8 MB)
- F19 · Studio na afronden · alle beelden goedgekeurd en score gegeven, maar "Nu: Je beelden staan klaar. Bekijk ze en laat het weten als er iets niet klopt." blijft staan · laag · hersteld in de map (2 okt), getest in de testomgeving — wacht op deploy: "Deze bestelling is afgerond. Je beelden staan hieronder klaar om te downloaden."
- **F25 · bestellen vanaf 10 producten met extra hoeken · de hoeken worden niet betaald · KRITIEK · hersteld in de map, wacht op deploy. Nagespeeld in de testomgeving (12 producten, driekwart + flat-lay): hoekvelden en extra_slots in de post, €1.308 berekend (was €612).** VIS-VS4X-BRJ: 12 producten + 2 hoeken; zijbalk €1.308, stap 5 en Mollie €612 / €740,52. Oorzaak (nagespeeld met kladblok/_r9-hoeken.mjs en een spoor op textContent): renderGate() in pipeline.js zette de tekst van élk `[data-max]` op het maximum uit /api/capacity; de hoekkiezer (AnglePicker.astro) draagt zelf `data-max`, dus zodra stap 4 de agenda ophaalt is de hele hoekkiezer vervangen door "39" en gaan er geen hoeken meer mee. Bij 3 producten (geen stap 4) ging het goed. Herstel: eigen haak `data-pl-cap-max` voor de twee getallen in stap 4; test in tests/hoeken.test.mjs
- F20 · bestellen, achtergrond · met bol aangevinkt zijn Gebroken wit/Beige/Eigen kleur uitgeschakeld, maar zien er normaal uit (geen grijs, cursor = hand); klikken doet niets en er staat niet waarom. De uitleg noemt Amazon terwijl de klant bol koos · middel · hersteld in de map (2 okt), getest in de testomgeving — wacht op deploy
- F21 · bestellen, eigen kleur · "groen" in het hexveld geeft "Hier moet nog een antwoord staan voordat je verder kunt" — er staat wél iets, het is alleen geen hexwaarde · laag · hersteld in de map (2 okt), getest in de testomgeving — wacht op deploy
- F22 · bestellen, "Een hoek erbij" · stap 1 zegt alleen bij "Zelf bedenken" dat je per product een foto meestuurt; stap 2 eist voor élke gekozen hoek een foto per product (bij 12 producten en 2 hoeken: 24 extra foto's) · middel · hersteld in de map (2 okt), getest in de testomgeving — wacht op deploy
- F23 · bestellen, stap 2, map slepen · bestanden met "driekwart"/"flat-lay" in de naam worden niet herkend; ze landen in "Nog niet geplaatst", en het menu daar biedt alleen Voorkant/Achterkant/Detail/Gedragen (48 opties), geen Driekwart/Flat-lay. Elk menu staat voorgekozen op "cargo-olijf · Voorkant" — één klik op "Plaats deze" overschrijft dus de voorkant van product 1 · hoog · hersteld in de map (2 okt), getest in de testomgeving — wacht op deploy
- F24 · (vervallen — bij nader inzien schoof de pagina gewoon mee)
- F26 · bestellen, stap 2, bulk na afgewezen bestanden · na een eerste map met te kleine foto's (900 px, terecht geweigerd) en een tweede goede map stond bij product 1 de achterkant twee keer (ook als voorkant) en de voorkant als "gedragen" (adminmail VIS-VS4X-BRJ) · hoog · hersteld in de map (2 okt), getest in de testomgeving — wacht op deploy. Nagespeeld (kladblok/_r9-f26.mjs): dezelfde map nogmaals → elk bestand vervangt zijn eigen vak (zelfde naam); een ander bestand op een vol vak gaat naar de bak in plaats van stil een ander vak te vullen
- F27 · bestellen, stap 2 · 23 bestanden in "Nog niet geplaatst" staan op "Verstuurd", maar gaan niet mee met de bestelling (39 van 62 aangekomen); het overzicht "11 producten zijn nog niet af" noemt ze niet · middel · hersteld in de map (2 okt), getest in de testomgeving — wacht op deploy
- F28 · bedanktpagina · "Je bent ingelogd — de bestelling staat al in VISUAILS Studio" terwijl de sessie van een ánder account is (boetiek ingelogd, webshop bestelt): die bestelling staat niet in dat Studio · middel · hersteld in de map (2 okt), getest in de testomgeving — wacht op deploy
- F29 · bedanktpagina bij een bestelling met vaste leverdata · "Levertijd: Zo snel mogelijk (vaak binnen een dag…)" terwijl er een venster 8–9 oktober vastligt · middel · hersteld in de map (2 okt), getest in de testomgeving — wacht op deploy
- O5 (opmerking) · admin "Wat de klant koos": KANALEN "own" (id i.p.v. "Eigen webshop"); upsell "Elke maand hetzelfde? Dat is 48 credits" telt de extra hoeken niet mee · hersteld in de map (2 okt), getest in de testomgeving — wacht op deploy (kanaalnamen + credits tellen extra hoeken en 4K mee)
- O4 (opmerking) · Studio-404 (/account/profile) heeft geen menu en de paginatitel is een hele zin · Studio "Je gegevens": telefoon "optioneel", in het bestelformulier verplicht · 404: hersteld in de map (2 okt), getest in de testomgeving — wacht op deploy (titel "Pagina niet gevonden", /account/profile → je gegevens); telefoon: besluit van Lucas (mijn advies: in het formulier ook optioneel, WhatsApp-klanten geven hem toch)
- O3 (opmerking) · lifestyle "Wat je krijgt" toont een plaatshouder (lifestyle-band-04, oude foto die nog vervangen moet worden — scripts/plaatshouders.mjs) · admin: het vak "Deze bestelling is nog nooit gemeld — 4 beelden klaar" ziet eruit als een invoerveld · bedanktpagina: "Extra foto's sturen" opent WhatsApp zonder dat de knop dat zegt · admin-zin en WhatsApp-knop hersteld in de map (2 okt), getest in de testomgeving — wacht op deploy; de plaatshouderfoto vraagt een echte foto van Lucas
- O1 (opmerking) · bevestigingsmail met "Te betalen €107,69" en betaallink komt 40 s vóór "Betaling ontvangen" — wie meteen betaalt, krijgt eerst een betaalverzoek. Twee termen voor hetzelfde: "revisieronde" (mail 1, portaal) en "correctieronde" (mail 2) · hersteld in de map (2 okt), getest in de testomgeving — wacht op deploy ("Net al betaald?"-regel bij de betaalknop; overal "revisieronde" — "correctieronde" blijft alleen voor het ontwerp van een merkmodel/eigen look)
- O2 (opmerking) · modelkeuze laadt 800px-beelden voor tegels van 64px (traag op telefoon; tegels eerst grijs) · hersteld in de map (2 okt), getest in de testomgeving — wacht op deploy (srcset 160/380/800, gemaakt met kladblok/_r9-w160.mjs)

## Bewijs per klanttype

### 1 · Jonge starter (hello+starter@)
- €1-proef: geweigerd met 409 "Je hebt VISUAILS al geprobeerd" — klopt, want hello+…@ telt als hello@ (plus-adressen worden gelijkgetrokken). Een echte proef vanaf een nieuw adres is met alleen hello@ niet te testen → zie "Niet te testen".
- Catalog 1 product (roze wijde jeans, 4 foto's, Wij kiezen model, wit, 1:1), NL zonder btw-nummer met KVK 12345678 → VIS-CVL5-CZP, Mollie test "betaald" €107,69.
- Bedanktpagina: "Betaald — we gaan aan de slag", herkomstvraag (Instagram) beantwoord.
- Gmail: "We hebben je bestelling — VIS-CVL5-CZP" 03:02:01 · "Betaling ontvangen — VIS-CVL5-CZP" 03:02:43 met PROEF-2026-0015.pdf · "Je inlogcode voor VISUAILS" 03:06:40.
- Privélink /o/… werkt (status Ontvangen, noindex). Studio-inlog met code werkt; factuur staat onder Facturen.
- Admin (order 80): 4 vakjes per stuk geüpload → "Op geleverd zetten en klant mailen" → "Je bestelling staat klaar — VIS-CVL5-CZP" 03:22 (correctieronde t/m 9 oktober).
- Portaal: achterkant, detail, op model goedgekeurd; lege revisieronde → F13; voorkant "niet goed" met notitie → "We hebben je revisieronde" (klant) + "Revisieronde · VIS-CVL5-CZP · 1 beeld" (hello@) 03:24.
- Admin: revisie via dashboard vervangen, gemeld met notitie → "Je revisie staat klaar" 03:26. Klant keurt goed → tijdlijn "Alle beelden goedgekeurd — bestelling afgerond"; tevredenheid 4/5 en testcitaat (gemarkeerd TEST, niet plaatsen) → admin toont "Tevredenheid: 4/5". Factuur PROEF-2026-0015 €89 + €18,69 = €107,69.
- Oude privélink uit de bevestigingsmail werkt na levering nog steeds.

### 2 · Oudere boetiekeigenaar (hello+boetiek@)
- Contactformulier (nieuwe bestelling, voorkeur e-mail) → bedankpagina; "We hebben je bericht" (klant) + "Contact — Ingrid Boetiek · Nieuwe bestelling" (hello@, antwoordadres = klant) 03:09.
- Lifestyle Dunes, 3 producten via één map-upload (9 foto's, verdeling op bestandsnaam klopt), model Dana, 4:5, product 1 op 4K, beeld 3 van product 1 op 16:9, NL met btw-nummer + KVK, "Bewaar mijn gegevens" aan → VIS-WAJD-KXD, €336 + €70,56 = €406,56 (klopt met pricing.js: 3 × €109 + €9).
- Mails: bestelling 03:17, betaling + PROEF-2026-0016 03:18; adminmail met alle keuzes en 9 bijlagen.
- Admin (order 81): 9 losse bestanden geüpload → indeling met de hand (beeld 1/2/3 → voor/achter/detail, F17) → geleverd 03:31.
- Studio via inloglink (niet de code): product 1 in één klik goedgekeurd; revisie op product 2 beeld 2 met controlepagina "Je revisieronde nakijken" (goed) → rest goedgekeurd → admin vervangt via het vakje en meldt → klant keurt goed → 5/5. Gegevens stonden opgeslagen in "Je gegevens".
- 7 mails voor dit adres, alle in de goede volgorde.

## Niet te testen

- Safari/iPhone-specifiek gedrag (alleen Chrome beschikbaar)
- Outlook en andere mailprogramma's (alleen Gmail)
- Echte betalingen (Mollie in testmodus)
- €1-proef tot het eind: elk hello+…@-adres telt als hello@, en dat adres heeft al een proef gehad. Kan alleen met een ander mailadres van Lucas.
