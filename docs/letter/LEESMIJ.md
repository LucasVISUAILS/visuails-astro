# VISUAILS Display

De eigen kopletter van VISUAILS. Gekozen in lijst 60 (27 oktober 2026), alle vijf keuzes volgens advies.
DM Sans 40pt (SIL OFL 1.1) met drie details uit de V. Alleen voor koppen; lopende tekst blijft DM Sans.

**Open `VISUAILS-Display-specimen.html`** (dubbelklik) voor het hele specimen: de negen gewichten, een typetester,
alle 385 tekens met hun maten, de drie details, groottes, talen en de bestanden. De letters zitten in de pagina zelf,
dus hij werkt ook zonder internet.

## In deze map

| Wat | Waarvoor |
|---|---|
| `VISUAILS-Display-specimen.html` | Het specimen. |
| `fonts/*.ttf` | Negen gewichten om op je computer te installeren. |
| `fonts/*.woff2` | Dezelfde negen voor de site (ongeveer 29 kB per gewicht). |
| `OFL.txt` | De licentie. Hoort altijd bij de letters. |
| `bron/` | Om de letter en het specimen opnieuw te bouwen (zie onder). |

## Installeren op je computer

Windows: rechtsklik op een `.ttf` in `fonts/` en kies **Installeren** (of **Installeren voor alle gebruikers**).
Doe dat voor elk gewicht dat je wilt. Daarna staat hij in je programma's onder VISUAILS Display.

## De negen gewichten

Thin 100 · ExtraLight 200 · Light 300 · Regular 400 · Medium 500 · SemiBold 600 · **Bold 700** · ExtraBold 800 · Black 900.
Koppen op de site komen in Bold 700 (lijst 60, vraag 4).

## De drie details (gemeten in Bold, eenheden op 1000 per em)

Eén hoek voor alles: 53,13°, de 3-4-5-driehoek uit de vlag van de V (0,75 opzij op 1 omhoog).

1. **De snede.** De rechte open uiteinden van f, fi, g, j, ȷ, r en t eindigen schuin, als "/":
   0,75 × de dikte van het uiteinde opzij. In Bold: 84 op 112. Waar de schuine lijn de stam in zou lopen (f, j),
   stopt hij op de binnenkant van de stam.
2. **De vierkante punt.** De punt op i en j, de puntjes op ë ï ü ä ö ÿ, de punt op ġ ż İ, en de punten in . : ; … ! ? ¡ ¿ ·
   worden een vierkant van 0,94 × de oude ronde punt (in Bold 144, de stam is 135), met de hoek rechtsboven eraf:
   0,38 × de zijde breed en 4/3 daarvan hoog.
3. **Het gat van de a** (en de a in æ). Rechts staand langs de stam, links schuin op 53,13°, boven en onder vlak.
   De schuine kant snijdt hoogstens 0,41 × de dikte van de buik van het gat af, en de buik houdt overal minstens 70 %
   van zijn dikte. Daardoor groeit het detail mee met het gewicht: in Bold het hele vlagje (gat 98 % van DM Sans),
   in Thin alleen een smalle rechte kant.

Samen hebben 66 tekens een detail (ook de samengestelde, zoals à á â ä å ã ā ă ą ǽ ĳ ŀ ŕ ř ť ğ ﬂ).

## Wat bewust zo blijft

- De ronde uiteinden (c, e, s, a, 2, 3, 5, C, G, J, S): een schuine snede neemt daar een hap uit de bocht.
- De vormen, de afstanden (voortgang) en het kernen: precies die van DM Sans, nagekeken per gewicht.
- De ª (in DM Sans een a met één verdieping) en de tekenvarianten ss01 tot ss08.
- Cursief is er niet. Kan later, op dezelfde manier.

## Gecontroleerd

- Elk gewicht geldig volgens OTS (de controle die Chrome en Firefox zelf doen), als .ttf en als .woff2.
- Voortgang van alle 486 glyphs, het kernen (GPOS) en de ligaturen (GSUB) gelijk aan DM Sans.
- Opnieuw hinten met ttfautohint, zoals DM Sans zelf.
- Alle letters en accenten voor 16 talen: Nederlands, Engels, Duits, Frans, Spaans, Italiaans, Portugees, Deens,
  Noors, Zweeds, Fins, Pools, Tsjechisch, Turks, Roemeens en Hongaars.

## Opnieuw bouwen

Nodig: Python 3 met `pip install fonttools skia-pathops ttfautohint-py brotli`.

```
cd docs\letter\bron
python familie.py          :: bouwt de negen gewichten uit dm-sans-40pt\ naar ..\fonts\
python maak_specimen.py    :: bouwt ..\VISUAILS-Display-specimen.html
```

`familie.py` bevat alle maten met uitleg. Uit dezelfde bron komt steeds dezelfde letter (alleen de datum in de
kop van het bestand verschilt).

## Licentie

SIL Open Font License 1.1 (`OFL.txt`). Gebaseerd op DM Sans van Colophon Foundry,
© 2014 The DM Sans Project Authors. DM Sans heeft geen gereserveerde naam; de aangepaste letter heet toch anders,
zoals de licentie aanraadt. Je mag hem gebruiken, aanpassen en meeleveren met de site en je materiaal.
Los verkopen mag niet, en een aangepaste versie blijft onder dezelfde licentie.

## Nog niet

Nog niet op de site. Dat is levering 77: de grote koppen in VISUAILS Display Bold (lijst 59: vet, beide tonen),
de lopende tekst in DM Sans, en elke kop opnieuw gemeten op hoogstens twee regels.
