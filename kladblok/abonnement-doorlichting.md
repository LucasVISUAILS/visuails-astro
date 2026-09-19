# Abonnement — doorlichting en herontwerp (19 september 2026)

Doorlopen als Studio Proefmerk (hello@visuails.com) met het testabonnement SUB-YM3O-MYF (Studio, maandelijks, betaald in Mollie-testmodus): /plans → /start/plan → betalen → Studio → Abonnement & facturering → product op de lijst zetten → vastzetten → datum kiezen → Je vaste look.

## Wat er fout ging (vóór het herontwerp)

### Logica
1. **Drie tijdverhalen naast elkaar.** "Jouw week — de 8e" (vaste week per maand), "Zo snel mogelijk — meestal 2 tot 4 dagen" (per product) en "kies een datum" (per product, kalender met "te vroeg"). Op het overzicht staat "in deze week pakken we op wat je hebt vastgezet"; op de lijst staat bij hetzelfde product "Zo snel mogelijk". Welke geldt?
2. **Twee bestelpaden die niet hetzelfde vragen.** Het bestelformulier vraagt per product voorkant/achterkant/detail/gedragen, de productsoort, het model per product, hoeken, achtergrond, formaat en een bericht. De abonnementslijst vroeg: naam, soort slot, notitie en één kaal bestandsveld. De tab "Je look" zei bij Lifestyle "Look: wordt per bestelling gevraagd" en bij Catalog "Formaat: wordt per bestelling gevraagd" — maar de lijst vroeg het nergens. De studio kon dus niet zonder vragen maken, terwijl de kop belooft "zonder dat wij je nog iets hoeven te vragen".
3. **Vastzetten zonder foto's of look was mogelijk** (slot verbruikt, product "vastgezet", maar niets om mee te werken).
4. **Woordenlijst.** Slot, credit, plek, vastzetten, losmaken, concept, lijst, week, bundel, Complete bundel, Motion-clip, tegoed, Editions, gedeelde set, maandset — veertien woorden voor vier begrippen.
5. **/plans en /start/plan** zeiden in elke plankaart "Een leverdatum die we vastleggen en bevestigen voordat je betaalt" — een abonnee betaalt vooraf en heeft geen leverdatum per bestelling maar een vaste week.
6. **/start/plan** had geen zakelijke verklaring en geen herroepingsverklaring, terwijl het bestelformulier die wél heeft en dit formulier in een doorlopende machtiging eindigt.

### Scherm
7. Vijf tabben (Deze maand, Bestellen, Editions, Je look, Facturering) plus twee zijbalkpagina's die overlappen: "Je look" = "Je vaste look" (zijbalk), "Facturering" naast "Facturen", "Editions" als tab voor iets wat "nog niet actief" is.
8. Twaalf "+"-tegels onder "Complete bundel" lazen als twaalf uploadvakken.
9. "Jouw week: de 8e" met een strook van 28 dagnummers zonder maandnaam; "19" omkaderd (vandaag) naast "8–14" gemarkeerd — welke maand?
10. Lijstregel: het oude V-beeldmerk als miniatuur in plaats van de eigen foto; "foto's toegevoegd" zonder aantal; "mag ook later" zonder knop om later toe te voegen.
11. Grammatica: "In je week pakken we de 1 vastgezette product op."
12. De permanente kaart "Leg je look vast — Nog open: Catalog, Lifestyle, Video" blijft staan zolang "geen voorkeur" niet expliciet is opgeslagen.
13. Het oude V-beeldmerk in de Studio-zijbalk, in elk "vastgezet"-kader, in elke "FOTO VOLGT"-plaatshouder (site én Studio) en als watermerk op de factuur-pdf.

## Het herontwerp (gebouwd)

**Eén tijdverhaal.** Je abonnement heeft één productieweek per maand (de dag die je koos). Wat je vóór die week vastzet, maken we in die week; wat erna komt, gaat mee in de volgende. Eén uitzondering: "Eerder nodig? Kies een datum" bij het product zelf (de bestaande agenda). "Zo snel mogelijk" is uit het abonnement; de knop heet nu "In je week" en zet het venster terug naar de standaard.

**Drie tabben.** Overzicht · Producten · Facturering. Oude links (?tab=look, ?tab=edities) landen op het overzicht.

**Overzicht, van boven naar beneden:** je abonnement en de volgende afschrijving → wat je deze maand hebt (de gemaakte kaders met echt beeld, de vastgezette donker, en één tegel "8 vrij") → jouw week als zin met echte datums ("Je volgende week loopt van 8 oktober tot en met 14 oktober") → je vaste look als één regel feiten met "Wijzigen →" naar de zijbalkpagina → de gedeelde set → één regel over Editions.

**Producten:** hetzelfde productvak als het bestelformulier, in het klein: naam, productsoort (dezelfde lijst als het bestelformulier), soort slot, notitie, en vier fotovakken (voorkant, achterkant, detail-close-up, gedragen) plus "meer foto's". De bestandsnamen krijgen het vak ervoor (voorkant--…), zodat de studio op de bestandenpagina ziet wat wat is. De lijstregel toont de eigen eerste foto als miniatuur, het aantal foto's, en "Foto's toevoegen" op elk concept.

**Sitebreed:** /plans-kaarten zeggen "Een vaste week per maand, voor jou vrijgehouden vóór losse bestellingen"; de losse-bestelling-zin is "Een leverdatum die we voor je vastleggen zodra je bestelling binnen is" (geen "bevestigen voordat je betaalt" meer — betalen is direct). /start/plan vraagt de twee verklaringen; migratie 0049 bewaart de versies op het abonnement. Het V-beeldmerk is weg uit de Studio-zijbalk (woordmerk), uit de plaatshouders (dun kruis) en van de factuur-pdf (watermerk uit).

## Wat ik níét heb gebouwd, en waarom (besluit)

- **Het bestelformulier zélf als bestelpad voor het abonnement** (model per product, hoeken, achtergrond per product, beeldcontrole). Dat is de echte eindvorm: één formulier voor alles, het abonnement verandert alleen wie betaalt. Het vraagt een plan-tak in /api/order (slots afboeken, payment_status 'plan', venster uit de week) en raakt ~10 tests. Mijn advies: ronde 3, nadat je dit overzicht hebt gezien.
- **Vastzetten pas toestaan als de look voor die dienst gezet is.** "Geen voorkeur — wij kiezen" is ook een keuze; ik heb de poort niet dichtgezet. Wil je hem wel, dan is dat één regel in queueLock().
- **De week verzetten door de klant zelf.** Er is geen route voor; de zin verwijst nu naar een mail. Kleine bouw als je het wilt.
