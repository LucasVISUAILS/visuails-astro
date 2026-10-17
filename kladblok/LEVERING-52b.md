# Levering 52b — 16 oktober 2026

Je bericht van 16:47: *"De laptop banner foto wil ik het paarse weg hebben omdat dit het te druk maakt denk ik."*

Geen nieuwe tekst voor de klant, dus geen ●-regels.

---

## Wat er veranderd is

- **De paarse lichtstrepen rechtsboven zijn weg.** Daar is het nu wit, net als linksboven. Het wit is niet één vlakke kleur: het loopt mee met het wit eromheen en heeft de korrel van de foto, zodat je geen naad ziet.
- **De paarse gloed is ook weg**: op de kleding, de knie, de laptop, de telefoon en de hand. De kleding is nu wit met grijze schaduwen.
- **De rechterhand is niet grijs gemaakt.** Hij heeft nu de huidtint van de linkerhand (gemeten: tint 14°, verzadiging 13 bij helderheid 14). De linkerhand is gebleven zoals hij was.
- **De schermen zijn niet aangeraakt.** Het beeld op de laptop en de telefoon blijft zoals het was. Ik heb de schermmaskers van de site gebruikt, dus de vingers vóór de schermen zijn wel meegenomen.
- **Alle 18 standen zijn opnieuw gefotografeerd**, met `node scripts/laptop-standen.mjs`: NL en EN, in 1000, 1600 en 2304 px, als webp en avif. De vingerafdruk in `src/data/halStanden.bron.json` is bijgewerkt.
- Dit geldt overal waar die laptop staat: de voorpagina, /catalog en /lifestyle.
- **De bestanden zijn kleiner**, omdat er minder in de foto zit.
  - De standen samen: 8,3 MB → 6,1 MB (−27%).
  - Wat een telefoon laadt (de stand in 1600, avif): 39,8 → 31,2 kB.

## Wat er níet veranderd is

- Het paars van de site zelf blijft: het woord in de kop, de stippen en draadjes van de twee labels, de knop Bestellen en de voortgangsbalk.
- Het origineel in `images/Website Banners - Unspecified/` heb ik niet aangeraakt.

## Bestanden

- `public/img/hal/laptop-1000/1600/2304.webp` en `.avif` (de foto zonder JavaScript, en de basis van de standen)
- `public/img/hal/stand/*` (108 bestanden, dezelfde namen)
- `src/data/halStanden.bron.json`

## Testreeks

- Stand: 255/255, alles groen.

## Uitrollen

Draai UITROLLEN.bat. Er is geen migratie.
