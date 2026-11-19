# Levering 120 · De kop op de video

**19 november 2026. Staat alleen in je map; je rolt zelf uit met `UITROLLEN.bat`.**

Dit is lijst 130 tot en met 133: de kop op de homepagevideo is rustiger, dunner en één grootte.

## Wat er veranderde

**Nieuwe letter.** VISUAILS Display 2 Light is DM Sans Light met drie details uit het logo:
- de a met de V-driehoek;
- vierkante punten;
- de zachte hoek in E F B D P R en in b h k l i j m n p r.

Het bestand is `public/fonts/visuails-display/VISUAILSDisplay2-Light.woff2` (28 KB). De bron is `docs/letter/bron/familie2.py`. Alleen de videokop gebruikt deze letter; de andere koppen zijn niet veranderd.

**De kop.** Titel en zin hebben één grootte en dunne letters (300). De bovenregel en de grote onderregel zijn weg, en de WebGL-kop (negatief, masker, canvas) ook.
- **EN:** "Your brand's visual content partner" met eronder "Product photos, lifestyle images and videos of your clothing. AI lays the groundwork; we finish every image and check it down to the last detail."
- **NL:** "De beeldmakers achter jouw merk" met eronder "Productfoto's, lifestylebeelden en video's van je kleding. AI legt de basis, wij werken elk beeld af en controleren het tot in detail."
- Zonder "met de hand": dat vond je op 25 oktober te verdedigend (de toets laptop-standen bewaakt dat). De zin is 2–4 regels; de titel blijft overal 2 regels.

**Plek.** Vanaf 1100 px breed staat de kop links naast de telefoon (titel 61 px op 1440, 76 px op 1920, steeds 2 regels). Onder 1100 px staat hij onder de video, in inkt (40 px op 390, 2 regels). Op 761–1099 px staan ook de stappen en knoppen onder de video.

**Video.** De banner zakt één bovenbalk plus 10 px, zodat de telefoon niet meer onder de bovenbalk valt. De video wordt niet vergroot, dus de scherpte blijft gelijk. Er valt ongeveer 10 % van de onderkant weg. Boven 1280 px laadt de 1920-versie (was boven 1400).

**Kleur (lijst 133).** Titel en zin zijn samen zwart of wit; de kleur volgt het licht achter de kop.
- Hij begint en eindigt in inkt.
- Hij wisselt alleen als de huidige kleur onder 3 : 1 zakt én de andere kleur duidelijk beter is.
- Elke kleur blijft minstens 1,5 s staan.
- De overgang duurt 0,35 s.

Het licht per beeld is vooraf gemeten (`scripts/kop-licht-120.py`) en staat in `banner94.js`. Zo kijkt de kop vooruit en slaat hij korte flitsen over.
- **Wissels in de hele video: 6.** Wit om 6,75 s, inkt om 8,25, wit om 12,79, inkt om 18,83, wit om 20,33 en inkt om 25,63 s.
- **Onder 3 : 1:** samen ongeveer 2 s. Het grootste stuk is 9,3–10,3 s: inkt op de donkere jas (1,5 : 1). Wisselen helpt daar niet, want het donkere stuk is korter dan de 1,5 s die een kleur moet blijven staan. Elders haalt de kop 3,4 tot 19 : 1.
- **Wil je liever zwart tot het lifestyle-stuk?** Dat is één getal (`KOP_REGELS.prijs` op 0,5). Dan wisselt hij 2 keer, maar is hij bijna 4 s slecht leesbaar.
- Met minder beweging staat het eindbeeld stil en is de kop wit (13 : 1).

**Deelplaatjes.** `npm run og` werkt weer met de nieuwe titel en letter. De vijf plaatjes in `public/img/og-*.jpg` zijn opnieuw gemaakt en halen 7,6–9,4 : 1.

## Vragen aan jou

- Is de NL-titel "De beeldmakers achter jouw merk" goed?
- Is de nieuwe zin onder de kop goed (zie boven)?
- Een scherpere telefoonvideo kan alleen als je een export van 1080 px breed stuurt.
- Nog open sinds 118: moet /o/ het offertebedrag tonen? En telt de €1-regel in de kop van /test-sample als derde regel?

## Toetsen

Nieuw: `tests/levering-120-videokop` en `levering-120-videokop-browser`; beide staan in de keten van package.json. Ze controleren titel en zin in NL en EN, 2 regels, de plek, de kleurregels (start en eind in inkt, nooit twee wissels binnen 1,5 s) en het contrast.

Bijgewerkt, omdat ze de oude kop vastpinden: banner-kop-110-browser, blauw-uur-86, letter-77, voorpagina-80, levering-117-tekst-laadscherm, levering-118-ontwerp, levering-118-herstel, levering-118-herstel-browser en levering-118-snelheid.

- **De hele reeks** na een nieuwe build: 400 toetsen (314 snelle en 86 browsertoetsen). In de volle reeks faalden er 3. `laptop-standen` vond "met de hand" in de nieuwe zin; die zin is herschreven en daarna nog eens gebouwd. `opening-90` en `opmaat-3d` liepen vast onder belasting en zijn los groen. Na de laatste build zijn laptop-standen, opening-90 en beide levering-120-toetsen opnieuw gedraaid: groen.
- **Nagemeten:** de titel is 2 regels op 360, 390, 1280, 1440 en 1920 px, in NL en EN.

## Hierna: levering 121

Je koos in lijst 134 versie c: alle koppen in VISUAILS Display 2 (de videokop Light, de andere koppen Medium), in gewone schrijfwijze. Dat wordt een aparte levering.
