# Teksten van de formulieren in de hal (12 oktober 2026, nacht)

Naslag bij afvinklijst 9 (v9-form = a: "de vorm van de proef op alle formulieren en de bedankpagina, met alle formuliertoetsen erbij") en afvinklijst 10 (goedkeuren). De voorbeelden staan op:

- /voorbeeld/start/catalog · /nl/voorbeeld/start/catalog
- /voorbeeld/start/lifestyle · /nl/voorbeeld/start/lifestyle
- /voorbeeld/start/plan · /nl/voorbeeld/start/plan
- /voorbeeld/start/brand-model · /nl/voorbeeld/start/brand-model
- /voorbeeld/start/custom-look · /nl/voorbeeld/start/custom-look
- /voorbeeld/start/video · /nl/voorbeeld/start/video
- /voorbeeld/thank-you · /nl/voorbeeld/thank-you

De formulieren op de voorbeelden zijn de echte: wat je daar bestelt en betaalt, is echt besteld. Getallen tussen ⟨ ⟩ komen uit de data (pricing.js), nooit getypt.

**Leeswijzer**
- = zelfde tekst als op de huidige pagina.
- ● nieuw, korter of anders. Graag nalezen.

---

## Wat er verandert: alleen de vorm

= Alle teksten van alle zeven pagina's: de koppen, de vragen, de stappen, de knoppen, de meldingen, de kleine lettertjes, de bedankpagina. Zelfde volgorde, zelfde werking.

● De vorm is die van de proef (afvinklijst 9, k-formulier):
- de kop op wit, met de pil van de hal (= "Bestellen", "Abonnement", "Start", "Merkmodel"; dat waren etiketten in hoofdletters)
- daarna nevelvlakken met witte kaarten en ronde hoeken
- de letter van de hal, geen hoofdletters meer in koppen, etiketten en knoppen
- de stappenrij als losse vakken, de huidige stap in inkt (ook op /start/brand-model)
- de donkere vlakken ("Wat bij elk aantal hetzelfde is", "Nog niet klaar om te bestellen?", de plaat "Jouw maand" bij je abonnement) worden licht: nevel, en de plaat het lichte verloop van de hal
- plat violet alleen nog op wat je aanklikt: "Beste waarde" (abonnement) en "Prijs op aanvraag" / "In de maak" (eigen look, video) staan nu in inkt

## Eén tekst anders

**Onder de voorbeeldbeelden** ● (in het overzicht naast het formulier en bij je abonnement)
- NL: Voorbeeldbeelden. Wat jij stuurt bepaalt hoe de jouwe eruitzien.
- EN: Example images. What you send decides how yours look.
- Was: "Een voorbeeld van een echte bestelling. Wat jij stuurt bepaalt hoe die van jou eruitziet." / "An example from a real order. …"
- Waarom: jouw regel "noem voorbeeldbeelden geen echte bestellingen". De catalogbeelden zijn de voorbeeldset (de roze jeans) en de lifestylestrook mengt looks van verschillende producten.
- Let op: deze zin komt uit één bestand (overzichtbeelden.js), dus hij verandert bij uitrollen ook op de huidige /start/catalog, /start/lifestyle en /start/plan, niet alleen op de voorbeelden.

## Ook op de proef

● Twee kleine dingen gelden ook voor /test-sample, omdat het hetzelfde formulier is:
- "Je was bezig met een bestelling" en "Deze bestelling staat al klaar" (alleen als je terugkomt): een witte kaart met de kop in inkt, in plaats van een violette kop in een lila kader.
- De vouwen in stap 1 ("Waar verkoop je ze?", "Achtergrond") en "Meer opties" zijn losse witte kaarten. Op de proef staan die vouwen niet, dus daar zie je dit niet.

## Gezien, niet veranderd

- Na betalen of versturen stuurt de server je naar de echte /thank-you en bij een fout terug naar de echte /start/plan, niet naar het voorbeeld (die adressen staan in functions/api). Bij live gaan klopt het vanzelf.
- De vaste balk met het totaal onderaan op de telefoon (catalog, lifestyle) blijft zoals hij is.

---

## Na afvinklijst 10 (13 oktober 2026, nacht)

Alles "doen": /start/catalog, /start/lifestyle, /start/plan, /start/brand-model, /start/custom-look, /start/video en /thank-you (en /nl/…) staan in de hal; de voorbeelden sturen door (301).
- v10-slot = a: "Nog niet klaar om te bestellen?" blijft een rustig nevelvlak met inktknoppen.
- v10-noot = a: de zin onder de voorbeeldbeelden ("Voorbeeldbeelden. …") staat meteen overal.
- v10-volgende = a: hoe het werkt is de volgende groep (kladblok/TEKSTEN-HOE-HET-WERKT.md).
