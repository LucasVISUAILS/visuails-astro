# Levering 48b — 15 oktober 2026

Een kleine levering bovenop 48. Het gaat om wat je na de uitrol zag: van 08:12 tot 08:30.

● = nieuwe of veranderde tekst die de klant ziet. Eerst NL, daaronder EN.

---

## 1 · De laptop in de opening hapert (08:12)

**Wat er gebeurde.** Over de laptopfoto lag een nagebouwd scherm: een webshop, een bericht, een clip en de telefoon. Dat stond in 3D in het perspectief van de foto, met een masker per scherm. Bij elke wissel liep er een overgang in dat scherm. Dan moet de browser het hele schuine, gemaskerde scherm elk frame opnieuw tekenen. Op een telefoon vroeg dat zoveel grafisch geheugen dat de rest van de pagina niet meer getekend werd: jouw witte scherm.

**Wat het nu is.** Elke stand is vooraf één keer gefotografeerd, met de schermen erin. De laptop vloeit alleen nog twee kant-en-klare foto's in elkaar over: geen 3D, geen masker, niets dat per frame getekend moet worden. Een foto komt pas in beeld als hij geladen en gedecodeerd is. Ook het script meet de pagina bij een wissel niet meer opnieuw op; dat kostte op de lange voorpagina tientallen milliseconden per wissel.

**Gemeten** (vier wissels, CPU 4× trager):

| | frames boven 50 ms, oud | nieuw | mediane frametijd, oud | nieuw |
|---|---|---|---|---|
| 1440 px | 58 | 8 | 50 ms | 17 ms |
| telefoon 390 px | 26 | 0 | 17 ms | 17 ms |

De lange taken op de hoofdthread (183 ms) zijn weg. Op een telefoon laadt hij de foto van 1600 px en niet die van 2304, want twee van die grote tegelijk is wat het geheugen opvrat.

**Iets veranderen aan de schermen?** Pas `src/components/HalLaptopSchermen.astro` of `src/data/laptopSlides.js` aan en draai:

    npm run laptop-standen

Dat maakt de 18 standen (9 per taal) opnieuw, in drie breedtes, als webp en avif. De toets `test:laptopstanden` ziet het als de schermen veranderd zijn zonder dat de foto's opnieuw gemaakt zijn.

Kleine bijvangst: de naam onder de laptop werd na de eerste wissel violet. Dat kwam doordat hij per ongeluk de klasse van het wisselwoord in de kop kreeg. Nu blijft hij inkt.

## 2 · De foto's op de laptop op 1:1 (08:14)

Het vak in de webshop was 680 × 880 px, met de foto op 118% breed. Daardoor werd elk beeld bijgesneden: de modelfoto oogde uitgerekt en de knoop viel onderaan weg. Nu is het vak vierkant (860 × 860) en staat elk beeld er helemaal in, op zijn eigen 1:1. De kleine beelden onder de knop zijn ook vierkant.

## 3 · Stap 2 op de telefoon (08:12)

Onder de 300 px breedte van het vak liep het lijstje over de rechterpijp: tot 6 px overlap op 320 en 360 px, en op 1024 px, waar de stappen in drie kolommen staan. Daar wordt de broek nu iets kleiner en schuift hij naar links. Gemeten op 320 tot 1440 px, in NL en EN: overal minstens 12 px tussen pijp en lijstje.

## 4 · Stap 2: één zin in plaats van "met de pen" en "met de hand" (08:30)

In het lijstje staat alleen nog wat er gebeurt, met de twee waarden die erbij horen (de kleur van je grond en de dekking van de schaduw).

● Het lijstje in stap 2
> Uitgeknipt · Jouw achtergrond #EFEFEF · Schaduw 20% · Gelijk aan je set
> Cut out · Your background #EFEFEF · Shadow 20% · Matches your set

● Het label bij het beeld
> Elk beeld gelijk
> Every image the same

● De uitleg onder stap 2 (de zin in de balk)
> Elk beeld kijken we zorgvuldig na en werken we met de hand af, zodat je hele set dezelfde professionele uitstraling heeft: als een fotostudio, maar sneller, en jij houdt tijd over voor je merk.
> We check every image carefully and finish it by hand, so your whole set has the same professional look: like a photo studio, only faster, and you keep your time for your brand.

## 5 · De uitrol stopte bij stap 2 (07:58)

Al eerder hersteld en in je map gezet: `tests/doorloop-27b.test.mjs` las de dist-map met `.pathname`, wat op Windows `E:\E:\…` werd. De wacht in `tests/paths.test.mjs` ziet die fout nu ook over twee regels.

---

## Uitrollen

OPRUIMEN.bat is niet nodig. Draai UITROLLEN.bat. Er zijn geen migraties en geen nieuwe endpoints.
