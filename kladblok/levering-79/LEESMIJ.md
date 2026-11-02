# Levering 79 — de grond #F4F7FD en de laptop over de hele breedte

Werkbestanden bij `kladblok/LEVERING-79.md`. Niets hier draait mee in de site; het is de bron en de
uitleg van wat er in `public/` en `src/` staat.

## De foto van de opening

- **De bron:** Lucas' foto 21 : 9 (6336 × 2688, PNG, "Made with Google AI" en IPTC
  `trainedAlgorithmicMedia` in de metagegevens; die zijn overal bewaard). Lichtgrijs verloop met een plank
  rechtsonder en een zachte schaduw onder de voet van de laptop.
- **Ontmengen** (`maak_wit.py`, dan `samenstellen.py`): eerst de achtergrond B per pixel geschat (het
  verloop boven de plank en de iets donkerdere band eronder apart, zodat de rand van de plank scherp
  blijft en daarna precies verdwijnt). De kern (handen, laptop, telefoon: duidelijk donkerder dan B)
  blijft onaangeroerd: de grootste afwijking in de kern is 0. Een randpixel is een menging van het
  voorwerp O (de kleur van de dichtstbijzijnde kernpixel) en de achtergrond: I = a·O + (1 − a)·B, dus
  a = (B − I) / (B − O). Zo blijven de randen zacht en komt er geen grijze of witte zoom.
- **De schaduw onder de voet en onder de telefoon** (Lucas, 02:38: "Deze lichte schaduw moet ook weg"):
  in die twee stroken blijft alleen wat echt donker is (de voet, de rand, de hand), met hoogstens 3 px
  zachte rand eromheen; de rest is grond.
- **`laptop-21x9-gaten.png`:** doorzichtig waar de grond is én in de twee schermen (alleen de rand van het
  toestel en de inkeping blijven). Daaruit maakt `node scripts/laptop-breed.mjs` de zes maten in
  `public/img/hal/breed/`.
- **De gaten** (in breukdelen van de foto): laptop x .31581 + .35006, y .19643 + .53795 (1,534 : 1);
  telefoon x .74463 + .07986, y .37128 + .42001. De schermen op de site zijn een fractie groter dan het
  gat (laptop-breed.css), zodat er nergens een haarlijn grond doorkomt.
- **Waarom doorzichtig en niet de kleur erin:** een gecomprimeerd beeld (webp, avif) verschuift een vlak
  grijs 1 à 2 tinten (gemeten op twaalf kandidaten). Doorzichtig is altijd exact de grond van de pagina,
  ook als die ooit verandert.

## De grond op de site

- **De meting** (`meting-grond.mjs`, met de pagina's in `paginas.json`): op 40 pagina's, op 1440 en 390
  breed, elk element met een eigen achtergrond, met zijn rand, schaduw, ronding en wat eronder ligt.
  Daaruit: welke witte vlakken de grond overschilderden (het €1-blok, de body zelf, de balk van het
  bestelformulier), welke vensters alleen wit leken omdat de pagina wit was, en welk vlak (#F4F5F7)
  direct op de grond stond (pillen, chips, rondjes, feitjes, tabs, code, de lege fotoplekken).
- **Het vlak op de grond wordt wit** via de kleur zelf (`--h-vlak`, `--h-nevel`, `--h-mist` op die
  onderdelen), niet door de achtergrond te overschrijven: zo houden ze hun kleur onder de muis.
- **`tests/grond-79.test.mjs`** legt het vast, ook op het scherm zelf: de lege plekken in de foto's
  zijn exact #F4F7FD.
