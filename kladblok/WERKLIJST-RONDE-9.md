# Werklijst ronde 9 — volledige doorloop op live

Opdracht: kladblok/PROMPT-RONDE-9.md. Per punt na afloop: wat ik deed, wat ik zag, bewijs (schermafdruk in kladblok/ronde-9/, ordernummer, mailonderwerp + tijd in Gmail), fout ja/nee. Een fout is pas opgelost als hij op live opgelost is.

Legenda: [ ] open · [x] gedaan, met bewijs · [!] fout gevonden (zie "Fouten") · [~] niet te testen op live (zie onderaan)

---

## 0 · Voorbereiden

- [x] 0.0 Herstel na ronde 8 (2 oktober, op aanwijzing van Lucas): kaarten op zwart terug op home en stijlpagina's (de "zonder grond"-modus is eruit); Editions weer zwart; "Wat we maken" terug; "Dit stuur jij. Dit krijg je terug." opnieuw opgebouwd als pijplijn in drie rijen (01 jij stuurt · 02 wij maken · 03 jij keurt goed) met kleine beelden op vaste hoogte; de vier CSS-waarschuwingen uit de build (keyframes `entry 0%` in LaptopCarousel) weg. Geleverd in de map; wacht op deploy.
- [ ] 0.1 Live draait de laatste versie (pijplijn op de home, kaarten op zwart, videokaarten in /nl/gallery, "oktober 2026" op /nl/ai-act). Stand 2 oktober 00:50: videokaarten en ai-act-datum staan live; het herstel (pijplijn, kaarten, Editions zwart) nog niet → wacht op deploy.
- [ ] 0.2 Regressie ronde 8: elk punt van WERKLIJST-RONDE-8.md nagelopen op live.
- [x] 0.3 Werkkopie gelijk met de map; volledige testreeks groen (2 oktober, na het herstel: alleen "KLAAR").
- [x] 0.4 Deze werklijst.
- [x] 0.5 Klanttypes vastgelegd (tabel hieronder).
- [ ] 0.6 Mailkoppen gecontroleerd (SPF, DKIM, DMARC, afzender, antwoordadres) bij de eerste mail.

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

## Fouten

(nog geen)

## Niet te testen

- Safari/iPhone-specifiek gedrag (alleen Chrome beschikbaar)
- Outlook en andere mailprogramma's (alleen Gmail)
- Echte betalingen (Mollie in testmodus)
