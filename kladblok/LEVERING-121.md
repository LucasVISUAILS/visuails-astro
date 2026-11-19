# Levering 121 · Alle koppen in VISUAILS Display 2

**19 november 2026. Staat alleen in je map; je rolt zelf uit met `UITROLLEN.bat`. Rol eerst 120 uit, of beide tegelijk.**

Je koos in lijst 134 versie c. De videokop blijft Light; alle andere koppen staan nu in VISUAILS Display 2 Medium, in gewone schrijfwijze.

## Wat er veranderde

- **De koppen.** Elke kop op de site staat in de nieuwe letter (Medium 500) en niet meer in hoofdletters: paginatitels, sectiekoppen en kaartkoppen. Ook koppen die technisch geen kop zijn tellen mee, zoals de namen van de abonnementen, de stapnamen, de namen in de galerij en "Jij stuurt / Wij maken / Jij keurt goed.". De paginakop van Studio en die van de privélink zijn ook omgezet.
- **Niet veranderd:**
  - de videokop (Light);
  - de kleine labels in mono (`/ 02 WAT WE MAKEN`);
  - de lopende tekst, knoppen en formulieren;
  - de maten van de koppen: alleen de letter, de dikte en de spatiëring veranderden;
  - het woordmerk: dat is geen letter maar een pad.
- **Hoe:** de koppen wijzen naar één plek (`--h-kopletter` in hal.css). Onderaan hal.css staat één blok "levering 121" met de letter, dikte, schrijfwijze en spatiëring. Grote koppen hebben regelafstand 1,0 en −0,025 em, kleine koppen 1,2 en −0,005 em. In de oude bestanden staan nog regels met 700 en hoofdletters, maar die doen niets meer.
- **Laden:** Medium (30 KB) wordt op elke pagina vooraf geladen, net als in Studio en de privélink, en het laadscherm wacht erop. Bold wordt alleen nog in het bestelformulier geladen, voor het grote cijfer in het aantal-veld. Dat bestand blijft dus staan, net als Blok.
- **Twee koppen zijn kleiner gezet, alleen onder 340 px breed:**
  - de kop in de modelkaart op /nl/lifestyle van 18 naar 17 px;
  - op /test-sample is het streepje tussen "03" en "/ 04" smaller geworden (48 → 24 px), zodat de stapnamen op 2 regels passen. De tekst is nergens veranderd.

## Gemeten

- 88 pagina's, NL en EN, op 320, 360, 390, 768, 1280, 1440 en 1920 px, samen 7.396 koppen: elke kop in de juiste letter en dikte, zonder hoofdletters, hoogstens 2 regels en met genoeg contrast. Niets wordt afgesneden of overlapt, en er is nergens een horizontale schuifbalk.
- Studio en de privélink zijn in de echte Worker gemeten op dezelfde breedtes.

## Vragen aan jou

1. **Studio:** alleen de paginakop is omgezet. De kleine koppen daar ("Je laatste bestelling") staan nog in DM Sans. Ook omzetten?
2. **Het grote cijfer in het aantal-veld** van het bestelformulier staat nog in de oude Bold. Ook naar Medium?
3. **De fotogids en de handleiding** (losse documenten, niet de site) staan nog in Bold met hoofdletters. Ook omzetten?

## Toetsen

Nieuw: `tests/levering-121-koppen` (bron) en `levering-121-koppen-browser` (na de build: alle pagina's en breedtes). Beide staan in de keten van package.json.

Bijgewerkt, omdat ze de oude letter of de hoofdletters vastpinden: letter-77, publiek-81, voorpagina-80, hal-voorbeeld, levering-117-tekst-laadscherm en werkplaats-82.

- **De hele reeks** na een nieuwe build: 402 toetsen (315 snelle en 87 browsertoetsen), alle 402 groen in één ronde.
