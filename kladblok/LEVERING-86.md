# Levering 86 · Het blauwe uur in de details

**3 en 4 november 2026. Staat alleen in je map; je rolt zelf uit met `UITROLLEN.bat`.** Bouwt voort op levering 85. De
regel en alle fades staan in `docs/KLEURENSCHEMA.md`, "Levering 86". Je keuzes: lijst 72; wat er gebouwd is: lijst 73.

---

## 1 · Wat je vroeg

- **12:54**: *"Wellicht kan je wel een plan maken om deze blue hour style meer in details zoals knoppen te verwerken
  en ik wil meer fade kleuren gebruiken voor kleine details waar mogelijk. Ook het logo wil ik witte achtergrond met
  fade blue hour VISUAILS logo maken, om met het blauw door het wit te snijden."*
- **Lijst 72**: logo a (langs de snede), schommel a (het licht schommelt), favicon b (wit op de snede), K1 – K4 en
  D1 – D8 goed, K5 niet. Bij K2: *"De gloed van onder mag bij alle knoppen weg, dit voelt generiek en ai achtig. Ik
  zou het beter vinden bij deze specifieke knop om de gehele knop te vullen met blauw on hover."* Verder: ja.
- **15:04**: *"Fix ook alle logo's in de map met de nieuwe looks"*. Je koos: allebei (de site en de logomap), en voor
  de oude pakketten in de logomap: weggooien, pakket 86 houden.
- **4 november, 01:22**: *"Posters moeten ook gebruik maken van de nieuwe lettertypes en ontwerp rules. Controleer
  de gehele website om te kijken of er nog meer ontwerp rules niet correct zijn toegepast en zorg dat er nooit
  elementen/texten te dicht tegen elkaar aan staan en consistentie is altijd belangrijk om na te gaan. Nadat je
  dit hebt gedaan wil ik deployen."*

## 2 · De regel

Alleen kleuren uit het schema: blauw diep `#1A4279`, blauw uur `#25508B` en `#2D61A8` (de lichtste toon van de lucht
in de gloed), en de nacht van inkt naar blauw diep. Een fade loopt **langs de snede**: de lijnen van gelijke kleur
evenwijdig aan de snede van het vlagje (53,13°), donker linksboven en het licht rechtsonder. Alleen op details,
nooit als vlak, nooit in een kop of woord, nooit op een icoon. Wit op elke stop van de snede: 6,2 : 1 of meer.

## 3 · Wat er nu staat

- **Het logo in de snede** (alleen herkleurd, dezelfde paden): de V in de balk, de lade en de bestelstroom, het
  woordmerk in de voet, de kleine woordmerken in de portaalschermen, Studio, de privélink, /admin en het account.
  Onder de muis schommelt het licht (dezelfde fade een stap lichter), in hetzelfde tempo. Op inkt (Studio op inkt,
  /admin en het account donker) blijft het logo licht, met de schommel in blauw licht.
- **Het grote woordmerk onderaan** loopt het wit in: van blauw uur naar nevel, waar de rand hem afsnijdt.
- **De gloed is weg**, bij alle knoppen, ook de schaduw onder Bestellen.
- **De inktknop** staat in de nacht (inkt, het blauw komt op naar rechtsonder) en vult zich onder de muis en met de
  toets helemaal met de snede, vanuit de hoek rechtsonder (0,36 s). Ook de inktknop in Studio.
- **Bestellen** (en onderaan de lade) in de snede; onder de muis schuift het licht door de knop (0,5 s).
- **De lijnknop** krijgt onder de muis een rand van 1 px in de snede.
- **De witte knop op inkt** (het €1-blok, het slot onderaan) vult zich zo met blauw licht naar nevel; de letters
  blijven inkt.
- **De kier** tussen twee knoppen die één vorm zijn: daar valt de lucht door (blauw uur boven, het licht onder).
  `src/scripts/knoppaar.js` meet waar de kier staat.
- **De details**: de streep van het sectielabel in de snede (D1), de streep onder een link loopt het wit in (D2, ook
  in Studio), de focusrand van een knop in de snede (D3), de voortgang en de stand-streep (D4), de rand van een kaart
  onder de muis (D5), het inktblok uit de nacht (D6), het vlagje dat vult (D8: het laadscherm en de laptopvideo).
- **Het favicon** wit op de snede, uit het nieuwe **logopakket 86** (`images\Logo\visuails-logo-86`, 119 beelden
  plus het script, het kleurenschema van het logo en LEES-MIJ.txt). Het pakket heeft de snede als standaard, en inkt,
  blauw en wit voor waar maar één kleur kan.
- **De mail**: het woordmerk op het witte plaatje in de snede, het streepje onder de kop in de snede, het woordmerk in
  de voet van nevel naar mist.
- **Elk ander logo**: het deelplaatje (`og-nl.png`, `og-en.png`; zie ook § 3b), de V-tegel (`merk-tegel.webp/avif`, de avatar in de laptopschermen en de modelkiezer: wit op de
  snede), de factuur en de creditnota (het woordmerk als vector met één verloop erin, nog onder de 6 kB), de fotogids
  (`public/downloads`, opnieuw gemaakt; zie § 3b) en de drie oude, ongebruikte beelden `logo-mark`,
  `logo-wordmark` en `logo-wordmark-light` (nu het huidige logo).

## 3b · De posters en de ruimte (4 november)

- **Het deelplaatje** in de letters van de site: de kop in VISUAILS Display Bold in hoofdletters, zoals elke kop in
  hoofdletters op de site (-0,01 em, regelhoogte 0,92), de eerste regel grijs en de rest inkt, zo groot dat de
  langste regel in 560 px past. Onderaan het sectielabel (de streep in de snede, `VISUAILS.COM` in IBM Plex Mono).
  De foto staat 40 px rechts van de kop en is links al vervloeid voordat hij de kop bereikt; eerst liep de hand
  onder de laptop onder de letters door. De zin komt nog steeds uit `src/data/brand.js`.
- **De fotogids** (A4, NL en EN) volgt nu de pagina `/upload-guidelines`: het etiket als sectielabel boven de kop,
  koppen in VISUAILS Display, tekst in DM Sans, de rij `01 —— / 04` boven elk blok, Nodig en Optioneel als
  statusplaatje met de zachte hoek (geen pil met een stip meer), een vinkje uit de iconenkit in plaats van een
  bolletje, kaarten 24 rondom, en de vijf vragen in het ene inktblok uit de nacht met zijn snede rechtsonder. De
  contactregel stond 2 px boven de lijn van de voet en staat er nu 11 px onder. Gemeten: nergens minder dan 11 px
  tussen twee buren. Past op één A4 (de vragen houden 22 px vrij boven de voet).
- **De ruimte op de site.** Elke pagina, NL en EN, op 1440 en 390 gemeten met `kladblok/te-dicht.mjs` (minstens
  8 px tussen twee buren, cellen van een rij op één lijn). Eerst vond hij 60 plekken in 17 onderdelen, nu nul.
  Te dicht stonden: de naam en de regel eronder in de galerij (0 – 6 px), een kop en zijn zin (Eigen look op de
  dienstpagina's, Je product blijft herkenbaar op /custom-models en /upload-guidelines, de kaarten op /editions,
  de status bij een eigen look, de modelkiezer bij de proef), het tarief en het abonnement op /start (ook op de
  telefoon), het totaal en zijn noot in de bestelling, twee alinea's na elkaar op de dienstpagina's, de noot
  onder de stappen en de tijdlijn in de galerij, de noot onder de tegels bij een abonnement, de FAQ, en het
  etiket boven de kop van een bestelpagina (nu het sectielabel, 20 px erboven, zonder stip).
  Scheef stond de rij "Nog vragen?": de kop en de lijst begonnen 16 px uit elkaar, nu op één lijn.
- **De gekozen kaart bij een abonnement** (`/start/plan`): de zwarte stip rechtsboven, vlak boven de prijs, is weg.
  De kaart krijgt nu dezelfde inktrand als elke andere keuze op de site (de rand in inkt en 1 px inkt erbinnen).
  Een stip als teken stond nergens anders meer; ik heb op elke pagina gezocht naar een rond stipje voor een
  etiket of keuze, en dit was de enige.
- **Een oude fout die ik onderweg vond**: op de interne voorbeeldpagina `/voorbeeld/uitleg` (noindex, nergens
  gelinkt) brak de noot bovenaan per lettergreep af, 24 px breed: hij kreeg de marge van een sectie én de
  leesmaat van een alinea. Dat stond er al in levering 85. Nu leesbaar.
- **De regel staat nu op papier** (`docs/RUIMTE-EN-RUST.md` § 2, "In het klein"): een kleine kop en zijn zin 8 px,
  twee alinea's 12 px, een noot onder een rij, lijst of tegels 16 px, een etiket boven een paginakop 20 px, en
  tussen twee buren altijd minstens 8 px. In `hal.css`: "LEVERING 86 · RUIMTE EN EENHEID".
- **Nagelopen en goed**: alle letters op elke pagina zijn VISUAILS Display, DM Sans of IBM Plex Mono; elke kleur
  komt uit het schema; nergens tekst onder 11,5 px; geen kop langer dan twee regels; geen spatiëring strakker dan
  -0,035 em.

## 4 · Wat ik zelf besliste (lijst 73 en 4 november)

1. De kier begint bij blauw uur, niet bij blauw diep: de inktknop links ervan loopt zelf naar blauw diep, en dan viel
   de kier bovenaan weg.
2. De witte knop op inkt vult zich met blauw licht (blauw uur op inkt mag niet: 2,37 : 1).
3. Het woordmerk in de voet van de mail een stap lichter dan op de site (nevel → mist), zodat de voet rustig blijft
   en in de donkere stand van de Gmail-app te zien is.
4. Links in de juridische teksten en bij een geweigerde proef houden hun gewone volle streep.
5. De streep van het sectielabel ligt op de site (16 × 3 px); de fade loopt daarom langs de snede, niet van boven
   naar onder.
6. Nodig en Optioneel in de fotogids staan in DM Sans, net als op de pagina `/upload-guidelines`, en niet in mono:
   het vel is de papieren versie van die pagina, en dan moeten ze hetzelfde zijn.
7. Het deelplaatje houdt de zin uit `brand.js` ("Al je productbeelden. Zonder shoot."), niet de kop van de opening.
8. Drie oude mailbeelden (`mark-groen.png`, `mark-wit.png`, `woordmerk-inkt.png`) blijven zoals ze zijn: geen mail
   gebruikt ze nog, alleen al verstuurde mails wijzen ernaar.

## 5 · Wat je kunt weggooien

- In `E:\Claude (VISUAILS)\images\Logo`, zoals je koos: de mappen `visuails-logo`, `visuails-logo-nieuw`,
  `visuails-logo-blauw-uur` en `visuails-logo-80`, en het losse `visuails-mark-groen-2048.png`. Dan is
  `visuails-logo-86` het enige pakket. De twee andere losse beelden daar (`2731698b-….png` en
  `ChatGPT_Image_19_jul_2026….png`) heb ik laten staan: dat lijken je eigen ontwerpen.
- In de site: `public\img\mark-contour-lime.png` (een oud lijnlogo; niets gebruikt het).
- Staan ze er nog: de vijf oude video's uit levering 84 in `public\img\hal\laptop-video\` (`laptop-80-1280.mp4`,
  `laptop-80-1280.webm`, `laptop-80-1920.mp4`, `laptop-80-1920.webm` en `laptop-80-2560.mp4`).

## 6 · Nagekeken

- `npx astro build`: klaar, zonder fouten. De hele testreeks: **277 van 277 stappen goed** (één browsertoets, `bijkopen-stap5-browser`, liep in de reeks vast op een time-out terwijl de machine druk was; los opnieuw gedraaid 98 van 98 goed).
- **Nieuwe toets:** `tests/blauw-uur-86.test.mjs` (npm run test:blauwuur86, in de keten na opening85). Hij
  controleert de regel (elke kleur uit het schema, de hoeken, het contrast), het logo en zijn fades, de favicons en
  de mailbeelden in de pixels, en op de echte pagina's in de browser: het logo, geen gloed, de inktknop in rust en
  onder de muis (zonder haarlijn inkt aan de rand), Bestellen, de focusrand, de kier, de lijnknop, de witte knop op
  inkt, de link, de kaart, het sectielabel, het inktblok, de voortgang en minder beweging.
- **Bijgewerkt:** `tests/invoice-pdf.test.mjs` (het verloop in de pdf), `tests/mails-merk-browser.test.mjs` (de donkerste stop van de snede) en `tests/blauw-uur-86.test.mjs` § 3c (het deelplaatje en de fotogids in de letters van de site).
- **Gemeten op elke pagina** (NL en EN, 1440 en 390, ook 900 voor de regels): letters, kleuren, kleine tekst, koppen, spatiëring, te dicht en scheef, en stipjes voor een etiket.
- **Op het oog:** lijst 73, schermafdrukken van de gebouwde site, telkens nu en nieuw.

## 7 · Uitrollen

Rol uit met `UITROLLEN.bat` vanuit je map. Het commitbericht staat in `kladblok/COMMIT-BERICHT.txt`.
