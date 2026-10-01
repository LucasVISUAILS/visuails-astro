# Ronde 6 — 30 september 2026

Jouw zeven punten, wat er gebeurd is, en wat er nog bij jou ligt.

## Gedaan

1. **Vaste leverdatum.** Voorwaarden §6 (NL/EN): de datum wordt bij de bestelling gereserveerd, 7 dagen vastgehouden zolang er niet betaald is, en ligt vast zodra er betaald is. Alleen overmacht is een uitzondering. Alle pagina's die iets anders zeiden, zijn gelijkgetrokken.
2. **Eén vinkje.** De zakelijke verklaring (business-v2-2026-09) draagt nu de herroepingsverklaring in zich. Bestelformulier, abonnement en merkmodel hebben nog één vinkje. De server legt `withdrawal_consent = withdrawal-v2-2026-09` vast via `withdrawalRecord()` in src/data/consent.js. De oude versies (v1) blijven opzoekbaar voor oude bestellingen.
3. **Abonnement heet "Pro".** Alleen de naam die klanten zien (src/data/planNames.js); het id blijft `studio` in de database en bij Mollie. "Studio" betekent nu alleen nog VISUAILS Studio, de klantomgeving.
4. **Meer opties.** Extra hoek, beeldvorm en voorrang staan achter één uitklapper in stap 1 (standaard dicht, 1:1 blijft de standaard). Stap 4 (levertijd) wordt onder 10 producten overgeslagen.
5. **Alles in één keer goedkeuren.** In Studio staat boven de productkaarten "Keur alle N resterende beelden goed". Hij verschijnt vanaf 2 beelden verspreid over meer dan één product. Beelden waar een revisie op loopt, blijven zoals ze zijn. Nieuwe actie `approve-order` in src/lib/account.js.
6. **Tegenstrijdigheden.** Beeldverhouding (catalog één per bestelling, lifestyle per beeld), bestandsformaten per marktplaats, correctieronde, bewaartermijn portaal, "werkdagen" → "open studiodagen" op /studio, credits van het maatwerkabonnement.
7. **Verwerkersovereenkomst + register.** Tekst aangepast: aangeleverde foto's worden nooit in bewerkingssoftware geopend. Alleen de beelden die wij maken worden lokaal nabewerkt.

## Getest

- Volledige testreeks groen, na een verse build.
- Scans: leesbaarheid 0, knoppen 0, regelafstand 0, geen horizontale scroll op 5 breedtes, links in orde.
- Browser: bestelling met hoek + 4:5 + voorrang via Meer opties → betaallink, en in de database staan de juiste versies en keuzes. "Alles goedkeuren" op desktop en telefoon → 8 beelden goedgekeurd, bestelling gesloten.

## Bij jou

- [ ] Verwerkersovereenkomst met Freepik/Magnific aanvragen (mail aan rpd@magnific.com), of besluiten dat foto's met mensen nooit naar Freepik gaan.
- [ ] Beslissen of "Pro" de naam blijft (andere opties: Plus, Merk, Maand).
- [ ] Datalekprocedure (AVG-DATALEKPROCEDURE.md) één keer doorlezen, zodat je weet waar hij staat.
- [ ] Zelf committen en pushen.

# Ronde 6b — 1 oktober 2026 (jouw keuze: eerst B en C, dan A)

## B · juridische kleinigheden
- **Verlengzin direct boven de abonnementsknop**, per plan en termijn met het echte bedrag: maandelijks loopt door tot je opzegt, 12 maanden stopt vanzelf na 11 volgende afschrijvingen, vooruitbetaald kent geen latere afschrijving. De knop heet nu "Doorgaan naar betalen" (was "naar de machtiging", wat niet klopte voor het vooruitbetaalde jaar). De zin onder de knop zegt alleen nog "Wat je hebt laten maken, blijft van jou."
- **KVK 99742993 in de voet van elke mail** (html en platte tekst).
- **Meldpunt / contactpunt (Digital Services Act)** als alinea in §5 van de voorwaarden, NL en EN. "Laatst bijgewerkt" van voorwaarden, privacy, cookies en verwerkersovereenkomst staat op oktober 2026.

## C · Freepik
- Conceptmail staat in het chatbericht. Freepik/Magnific zegt in zijn privacybeleid zelf dat zakelijke klanten een verwerkersovereenkomst kunnen opvragen via rpd@magnific.com, met accountgegevens en de afgenomen dienst.

## A · Web Interface Guidelines
- Alle invoervelden zijn op een telefoon minimaal 16 px (iOS zoomde in): contact, abonnement, bestelformulier (hoeknotities, materiaal, kleur, soort, beeldverhouding per beeld, stijlkeuze), en de dagkeuze in Studio.
- Tikvlakken: pijltje "Volgende foto" op de voorpagina (12 × 11 → 44 × 44 onzichtbaar vlak), snelkeuze 1·5·10·20 (40 × 44 op touch), het "?" bij uitleg (44 × 44 op touch), "Gemaakt door Lucas" vult nu de hele pil, "Vraag een eigen stijl aan" 24 px hoog.

## Getest
- Volledige testreeks groen, scans schoon, alle formulieren gemeten op 390 px: geen veld meer onder 16 px.

## Bij jou
- [ ] De mail aan Freepik versturen (of laten klaarzetten als concept in Gmail).
- [ ] De voet van je nieuwsbriefsjabloon in Resend nalopen: afmeldlink, KVK, plaats.
- [ ] Zelf committen en pushen. Commit in oktober, anders klopt de datumtoets niet.
