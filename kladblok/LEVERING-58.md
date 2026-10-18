# Levering 58 — lichtgrijs, een bestelling kopiëren, de melding als voortgang en lijst 37 (17 oktober 2026)

Uit afvinklijst 36 (alles "doen"; v36-aantal a, v36-bericht a, v36-datum a, v36-melding c, v36-outfits a, en je
noot bij b-kleur: *"gebroken wit nu heel licht grijs maken zoals farfetch heeft. Pas dit overal consistent toe"*)
en afvinklijst 37 (alles "doen"; v37-start a, v37-kanalen b). Het nieuwe bestelformulier (lijst 36 B) en de
looks (lijst 38) komen in levering 59.
Uitrollen met **UITROLLEN.bat**, zonder migratie. Levering 56 en 57 gaan mee: die staan nog niet live
(de laatste regel in uitrol-log.txt is van 08:35).

## 1. Lichtgrijs in plaats van gebroken wit

- De tweede aanbevolen achtergrond is nu **Lichtgrijs, #F5F5F5** (was Gebroken wit, #F7F5F1).
- Gemeten bij Farfetch: van 25 productbeelden stonden er 20 op #FFFFFF en 5 op #F5F5F5. Geen warme tint meer.
- Overal hetzelfde: de keuze in het formulier, het voorbeeld en de kleurtegels in Studio (Je vaste look), de
  uitleg op /how-it-works, de demo, de werkmap en de mail.
- De vier catalogusbeelden `catalog-after` (webp en avif, groot en w420) zijn opnieuw ingekleurd en gemeten:
  de grond is #F5F5F5.
- Oude bestellingen met "off-white" blijven leesbaar: Gebroken wit staat bij de oude achtergronden.
  Wie zo'n bestelling opnieuw bestelt, krijgt de kleur die er toen bij stond.
- Het oude grijs #EDEDED heette ook Lichtgrijs; dat heet nu Grijs, zodat twee kleuren niet dezelfde naam dragen.

## 2. Een bestelling kopiëren (lijst 36, C)

- **Het aantal producten** staat ingevuld (v36-aantal a), en pas daarna de outfits (v36-outfits a).
- **De vorm per foto** gaat mee als die bij alle producten gelijk was (lifestyle; catalog heeft die keuze niet).
- **Je bericht** gaat niet vanzelf mee (v36-bericht a). Er staat een knop *"Neem je bericht van VIS-… over"*;
  één klik zet het erin en de knop gaat weg.
- Het blok bovenaan noemt wat er overgenomen is, ook het aantal en de vorm ("de vorm van foto's 2 en 4").
- De datum verandert niet (v36-datum a).
- Nieuwe toets **test:kopiebrowser**, in de echte Worker en een echte browser.

## 3. De melding "Welkom terug" als voortgang (v36-melding c)

- Bovenaan het kenmerk in de vaste breedte-letter, eronder vier stappen: Ontvangen, In productie, Nakijken,
  Geleverd. De stap waar je bestelling is, is violet, met de snede van het merk; de stappen ervoor zijn inkt.
- Op de telefoon staan de vier balkjes er zonder namen (die lees je wel voor met een schermlezer).
- Een aanvraag (video, eigen look) heeft geen stappen; daar blijft de zin zoals hij was.

## 4. De punten uit lijst 37

- **/start op de telefoon (b-start, v37-start a).** De lifestylelooks staan in een rij om opzij te vegen. Elke
  kaart is 80% breed, zodat je de volgende al ziet, met alleen het beeld, de naam, de zin en "Kies deze look".
  De prijs en de planprijs staan één keer boven de rij, de €1-proef één keer eronder. Die proef begint bij de
  look die je in beeld hebt. Op 390 breed is /start nu 6637 px hoog (was 8182). Op een breder scherm is
  er niets veranderd.
- **De zwevende WhatsApp-knop (b-wa).**
  - Weg op /contact (daar lag hij over "Chat on WhatsApp") en in het bestelformulier (/start en alles eronder).
  - Op de telefoon pas zichtbaar na één scherm scrollen.
  - Daarna schuift hij opzij weg (in drie tikken) zodra er op zijn plek een knop of link zou liggen. Gemeten op
    elke scrolstand van de voorpagina, /pricing en /lifestyle: nooit meer boven iets klikbaars.
  - Op een breed scherm is er niets veranderd.
- **Verlopen als vulling (b-verloop).** Het lila verloop is overal een vlak mist (#F1EEFF): /plans, /pricing,
  /contact, /test-sample, en ook de vlakken "volgt" op /gallery. Wat nog een verloop heeft, is gereedschap:
  het schaakbord achter een doorzichtig beeld en de regenboog van "Eigen kleur".
- **/pricing (b-korting).** *"Geen kortingscodes, geen acties. Minder per product betaal je alleen met een plan."*,
  met een link naar /plans. "Geen pakketten" is weg.
- **De paginatitels (b-titels).** Overal "Onderwerp | VISUAILS", ook in het Nederlands. Layout.astro zet de oude
  vormen om ("X — VISUAILS", "VISUAILS — X"). Nieuwe toets **test:titels**.
- **v37-kanalen b.** "Where you sell it" blijft in Je vaste look.

Nieuwe toets **test:telefoon58** (de WhatsApp-knop en /start op de telefoon).

## Nagekeken

- Testreeks: 262/262 groen (23 min 15 s).
- Gekeken op 1440, 900 en 390 breed.
- Contrast gemeten: inkt-2 op mist 7,6:1.

## Niet gedaan, en waarom

- Het nieuwe bestelformulier en de looks: levering 59.
- De lichtgrijze keuze in het kleurpaneel per hoek: komt mee met het nieuwe formulier (lijst 36, b-kleur).
