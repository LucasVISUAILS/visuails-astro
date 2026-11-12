# Levering 94 · De bannervideo, de laptop met de NONSTD-winkel en één set lettermaten

**12 november 2026. Staat alleen in je map; je rolt zelf uit met `UITROLLEN.bat`.** Bevat ook levering 93 (lijst 90),
die nog niet in je map stond. Geen migraties. Opruimen: `_opruimen/LIJST.txt`, blok "12 november 2026 · moet weg
(levering 94 …)".

## 1 · Levering 93 (lijst 90): de laptop

- Geen grijze randjes meer om de armen en handen (het uitknippen opnieuw, `scripts/laptop-video-90.py`, `uitknippen93`).
- De schermen gaan uit in #16181E in plaats van wit.
- De video duurt 1,4 s (snelheid 1,336). Scrol je ertijdens, dan versnelt hij in treden: 1,8×, 3× en 4×.

## 2 · De bannervideo (lijst 92)

- **Banner:** je montage `opener-montage-gegrade.mov` vult de bovenkant van de voorpagina over de hele breedte
  (`HalBanner94.astro`, `banner-94.css`, `src/data/banner94.js`). Er zijn twee versies: 1920 voor grote schermen en
  1280 voor de rest. Het wit is gelijkgetrokken naar de grond van de site.
- **Kop:** "Je merk groeit. / Je beelden groeien mee." (EN "Your brand grows. / Your visuals keep up."), linksonder.
  Hij is zo groot als zijn kolom toelaat, hoogstens 96 px, altijd op twee regels.
- **Uitleg:** rechts vijf stappen die met de knippen in de video meelopen, met balkjes. Bij de balkjes staat een
  pauzeknop.
- **Negatief met blauw uur:** de teksten in de banner tonen de video als negatief, gemengd met blauw uur. Zie tabel 1.
- **Bestellen:** volgt het beeld, inkt op licht en wit op donker. De helderheid komt uit `licht.bin`, een kleine
  lichtkaart van de video, zodat de videokaart niet wacht.
- **€1-link en Studio-link:** de €1-link staat er weer naast. Een klant ziet in plaats daarvan de link naar Studio,
  zoals in de oude opening.
- **Bovenbalk:** weg zolang de pagina helemaal bovenaan staat; hij komt terug zodra je scrolt.

**Tabel 1 · Het negatief per videokaart**

| Situatie | Hoe het getekend wordt |
|---|---|
| Echte videokaart | WebGL |
| Software-tekenaar | Een canvas met een svg-filter (die zou anders bij elk beeld wachten) |

## 3 · De laptop (lijst 92 B, berichten van 07:46 – 08:19)

- **Plek:** onder Wat we maken. Het kleurveld achter de laptop is weg; de video is opnieuw gemaakt op de grond van
  de site (`VELD=wit`, `public/img/hal/laptop-video/`). De streepjes en de naam eronder staan nu in inkt.
- **Volgorde:** video → de drie productpagina's → lifestyle.
- **Videostand:** speelt de clip vanaf het moment dat de kap opgaat, met K3 als telefoonfoto.
- **De winkel van NONSTD:** drie productpagina's met hun telefoonfoto (Phone.png), zie tabel 2.
  - De winkel staat op #FBFCFF, net als de foto's. De on-model-foto's houden hun eigen achtergrond.
  - Onder elke pagina staan bij "Voorgestelde producten" de andere twee.
  - De eerste kleur van de kleurbolletjes is gemeten op de foto.
- **Interactie:** met de muis op de laptop staan de dia's stil. Klik op een beeldje en dat komt groot; klik op een
  voorgesteld product en je gaat naar zijn pagina.
- **Schermen opnieuw maken:** met `node scripts/opening-catalog-94.mjs`. Dat script laat de clip staan;
  `opening-reeks.mjs` gooit hem weg.
- **Andere laptops:** de laptops op andere pagina's zijn niet veranderd (nog de roze broek). Hun foto's zijn
  opnieuw gemaakt en pixel voor pixel gelijk; alleen de vingerafdruk is bijgewerkt.

**Tabel 2 · De productpagina's**

| Product | Prijs | Herkomst prijs | Eerste kleur |
|---|---|---|---|
| Zip hoodie | € 129,95 | Jouw keuze | #465692 |
| Logo jeans | € 149,95 | Mijn voorstel | #322F3A |
| Logo sokken | € 24,95 | Mijn voorstel | #E4E3DE |

## 4 · De lettermaten (lijst 93, alles volgens advies)

- **Tekst:** vier maten voor alle tekst onder de koppen, als tokens in `global.css`. Zie tabel 3. Daarvoor stonden
  er onder de 17 px 24 maten, tot twaalf op één pagina; nu vier, en hoogstens vier per pagina.
- **Eén afwijking van de lijst:** lopende tekst die op 16 of 16,5 px stond (de juridische teksten, de inleidende
  zinnen) is 17 geworden in plaats van 15. Het is lopende tekst, en 15 leest daar te klein.
- **Knoppen:** 15 en 13,5. De grote knop is alleen nog hoger (52 px); zijn letter is 15 (was 16).
  `public/knoppen.css` is bijgewerkt, dus dat geldt ook voor /admin.
- **Koppen** op de 4 : 3-schaal:
  - sectiekop 42,67 (was 41,5);
  - kleinere kop 32 (was 34);
  - namen 32, 24 en 18 (was 30, 26, 22, 20 en 19).
- **Inleiding:** 19, op de pagina van een stijl 24. /about (21) en het bestelformulier (17) gaan mee naar 19.
- **Gemeten:** alle koppen op zeven breedtes. Alleen de kop van het €1-blok gaat over twee regels, en die telde al
  niet mee (de reuzen-€1).
- **Bewaking:** de nieuwe `tests/lettermaten-94.test.mjs` laat de keten falen als er een maat bijkomt.

**Tabel 3 · De tekstmaten**

| Token | Maat | Gewicht |
|---|---|---|
| lopend | 17 | |
| klein | 15 | |
| fijn | 13,5 | |
| label | 12 | mono-labels 600 |

## 5 · Tests

**Bijgewerkt voor de nieuwe opening:**
- voorpagina-80
- opening-90-browser
- klant-stand
- blauw-uur-86
- grond-79
- posterkleur-89
- letter-77
- console-schoon
- fotoblok-browser
- knoppen-systeem

**Nieuw:** lettermaten-94.

**Wat er in de bron is gerepareerd:**
- Een `play()` die geweigerd wordt, wordt nu afgehandeld.
- De bannerkop is echt 700.
- De banner start niet meer twee keer.

## 6 · Open

- De prijzen van de jeans en de sokken: zeg het als je andere wilt.
- De laptops op /video, /lifestyle en /upload-guidelines tonen nog de roze broek. Wil je daar ook NONSTD, dan maak
  ik die standen opnieuw.
- Op 1440 × 900 ligt de cookiebalk over Bestellen in de banner, tot je een keuze maakt.

## 7 · Na de eerste uitrolpoging (12 november, 17:07, gestopt bij stap 2)

- **test:a11y**
  - Op de telefoon blijft de bovenbalk nu altijd staan. Anders zat het menu helemaal bovenaan verstopt. Op een breed
    scherm verdwijnt hij nog steeds (`banner-94.css`).
  - De test scrolt op de voorpagina eerst een stukje voordat hij het menu opent.
  - De vullaag van de bannerkop (aria-hidden) telt niet mee als "tekst over tekst".
- **test:juridischedatums** (niet uit deze levering): de verwerkersovereenkomst en /ai-act kregen op 9 november een
  andere tekst ("VISUAILS Studio", een paar herschreven zinnen, geen nieuwe plichten). "Laatst bijgewerkt" staat
  daarom op november 2026 (`juridischeDatums.js`).
- De volledige testreeks daarna: 348 van 348 groen.
