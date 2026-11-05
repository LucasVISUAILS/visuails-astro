# Levering 87 · De laptop blijft staan, super ronde hoeken, korte zinnen op één regel, posters 13 – 20

**4 november 2026. Staat alleen in je map; je rolt zelf uit met `UITROLLEN.bat`.** Bouwt voort op levering 86. Je keuzes
staan in lijst 74. De maten staan in `docs/RUST-80.md` §14 (de opening), `docs/DESIGN.md` "Hoeken — 4 november 2026" en
`docs/RUIMTE-EN-RUST.md` §5b (de korte zinnen).

---

## 1 · Wat je vroeg (lijst 74)

- **De opening, fade f2**: *"Met scroll wil ik een soort korte energetic motion blur effect van blauw uur naar weer wit.
  Ook wil ik dat op de eerste sectie geen scroll effect zit met de snappy scroll … dus je scrollt dus normaal naar de
  laptop waarna de laptop sectie sticky is en als je door scrollt je de animatie van de laptop krijgt en je het motion
  blur effect krijgt tot de sectie wit is en de services komen. Het motion blur effect moet overigens kort en subtiel
  zijn en niet te heftig."* Klik **k1**. Compositie goed: *"Tekst mag iets naar onder geplaatst worden … maar wel genoeg
  ruimte om alles heen."* Scherpte goed.
- **De hoeken**: knop **pil**, paar **snede**, blok **snede**, kaart **24**. En om 03:02: *"overal waar van toepassing
  super ronde hoeken … Bij sectie gedeeltes zoals de achtergrond van de laptop niet."*
- **Posters**: 13, 14, 16, 18, 19 en 20 goed. 15: *"Andere achtergrond foto of geen tekstlogo"*. 17: *"Kleine teksten
  staan niet echt op fijne plekken"*. Ook in het Engels (b); het merk erop mag (a).
- **Korte zinnen** en **ÉÉN**: goed. **Levering 87**: ja.

## 2 · De opening

- **Bij het laden** de fade f2 over het hele scherm en de titel iets lager, met ruimte erom. Niets beweegt.
- **Je scrolt gewoon** naar de laptop: geen sprong, geen glijden en geen afgevangen wiel meer.
- **Daarna blijft de laptop staan** onder de balk (sticky). Het scrollen zelf speelt de video af, vooruit en terug.
  Elke centimeter scroll geeft ongeveer even veel beweging. De video begint bijna stil (de klep) en eindigt snel; dat
  is gemeten in de video zelf (`kladblok/levering-87/beweging.py`).
- **De bewegingsonscherpte** is kort en subtiel: zijdelings, alleen als de laptop beweegt, hoogstens 3 % van de
  breedte. Als je stopt is hij na 0,14 s weer scherp.
- **Van blauw uur naar wit.** Het wit veegt op 53° over de fade, met een rand die zachter wordt als je sneller scrolt.
  Daarna is het wit en schuift Wat we maken erover. Terug omhoog loopt alles terug.
- **K1**: een streepje per stand, wit op blauw. Je kiest met de muis of met de pijltjes; het wisselt pas na je eerste
  beweging.
- **Telefoon, tablet en minder beweging**: geen baan, alles staat stil. Hetzelfde als je computer geen WebGL heeft of de
  video niet laadt: dan valt de baan weg en verdwijnt het vlagje, in plaats van een stilstaande laptop over 1440 px.
- **Waarom de video nu in het geheugen staat.** Cloudflare geeft statische bestanden terug zonder Range, en zonder Range
  kan een browser niet terugspoelen. De video komt dus als blob binnen, met het vlagje dat zich vult. De CSP heeft
  daarom `media-src 'self' blob:`. Elke 6 beelden staat een sleutelbeeld, zodat terugspoelen meteen gaat.
- **Scherper**: een fotomaat van 4608 px erbij, en de juiste `sizes` (de foto staat op 120,5 % van de breedte).
- De film: `opening-87.mp4` (1440 × 900).

## 3 · De hoeken

- **Wat je bedient is een pil**: elke knop, chip, tab, segment en elk invulveld van één regel. Ook de keuzelijsten, de
  statusplaatjes, de schakelaars en de balk met de bediening. `--hoek-knop` is `999px`, in `global.css`,
  `account.css`, `admin.css` en `portal.css`.
- **Een paar** is één pil met de snede ertussen. De kant van de snede blijft 0; de focusrand heft de snede op.
- **Het inktblok** houdt zijn snede rechtsonder en is verder 32 rond. De drie abonnementen op /plans zijn één vorm:
  32 aan de buitenkant, met de snede rechtsonder.
- **Kaarten 24, vlakken 32, tegels 12.** Tegels in een raster zijn nu rond aan alle vier de hoeken. Wat het hele scherm
  bedekt blijft recht: de banden, de voet en de achtergrond van de laptop.
- **Geen pil**: een tekstvak van meer regels (18), een vinkje (5), een keuzerondje (rond), een menu (24) en een rij in
  een menu (14).
- **Gezet in de stijlbladen zelf.** 287 waarden met de ene zachte hoek en 103 harde hoeken van 2 tot 4 px. Die harde
  hoeken stonden vooral in het bestelformulier: de knopjes 1 · 5 · 10 · 20, de 1:1 · 4:5 · 3:4, de prijsrijen en de
  schakelaar.
- **Ook in de mails** (de knop en de statuspil) en in **de fotogids**: Nodig en Optioneel als pil, opnieuw als pdf gemaakt
  in NL en EN.
- **Eén ding boven wat je in de proef zag.** De proef maakte alleen de zachte hoeken rond. De harde hoeken in het
  formulier heb ik ook een pil gemaakt, anders stond er een pil naast een vierkant knopje.
- `tests/hoekregel-browser` bewaakt nu twee dingen, op 22 pagina's en 3 breedtes: nergens nog de oude zachte hoek, en
  elk bedieningsdeel tot 64 px hoog is een pil. Dat geldt ook in het bestelformulier.

## 4 · Korte zinnen op één regel, en ÉÉN

- **Na de build** zet `scripts/korte-zinnen.mjs` op elke zin van hoogstens 9 woorden de klasse h-1r: geen maat. Een kleine
  zin van 10 tot 12 woorden krijgt h-1k. Een icoon in de zin houdt dat niet tegen; een rij die alleen uit links bestaat
  (knoppen) wel. Het geldt ook voor elke nieuwe zin.
- **Gemeten** op alle 45 pagina's in twee talen, op 1440 en op de telefoon. Eerst stonden 190 (NL) en 326 (EN) korte
  zinnen op twee regels, nu 0. Wat overblijft (77 per taal) is lopende tekst van 10 tot 14 woorden, die zijn maat
  houdt. Je voorbeeld onder de nieuwsbrief staat op één regel.
- **ÉÉN.** In 15 koppen die in hoofdletters staan, staat nu "Één". De browser maakt van "Eén" in hoofdletters "EÉN",
  terwijl het "ÉÉN" moet zijn.
- **Een verbetering op de lijst.** Daar schreef ik dat "Één" ook in gewone tekst goed is. Dat klopt niet: aan het begin
  van een gewone zin is "Eén" de juiste vorm. Die heb ik dus laten staan.

## 5 · Posters 13 – 20

- **15 Nachtspoor** is opnieuw gemaakt, zonder woordmerk en met een andere foto. Room 84 is één directe flits van
  dichtbij, 's avonds, dus nu een flits aan het eind van een lange sluitertijd. Het meisje met het T-shirt staat
  scherp, op de muur blijft haar spoor achter. Onderaan valt de nacht in, met de kop in wit.
- **17 De snede**: de twee bijschriften staan langs de snede, elk aan zijn eigen kant van de kier, op dezelfde plek.
  Dus "Feed · bewogen" boven de snede en "Productpagina · stil" eronder.
- **Allemaal ook in het Engels**, met de Engelse teksten van de site. Het contrast is gemeten bij elke tekst tegen wat
  eronder ligt: 0 te laag, in beide talen.
- In `images\Posters\blauw-uur\` naast 01 – 12: `poster-13-bewogen.png` … `poster-20-de-wereld.png`, de Engelse met
  `-en`. Op 1920 × 2400. Erbij komen twee contactbladen en een stuk in `LEES-MIJ.txt`. De scripts staan in
  `kladblok\levering-87\posters\`.

## 6 · Een tweede paar ogen

Een aparte controle (die het werk niet had gemaakt) vond vier fouten in het script van de opening; ze zijn opgelost en
staan nu in de toets:
- zonder WebGL of zonder video bleef de baan staan en bleef het vlagje laden;
- na het kleiner en weer groter maken van het venster midden in de baan liepen de standen door over de video;
- wie tijdens het laden van de video naar een andere pagina ging, hield de video in het geheugen;
- vooruit spelen op hoge snelheid schoot een paar beelden voorbij het doel en sprong dan terug.

Ook de stap voor de korte zinnen is steviger: een > tussen aanhalingstekens in een attribuut en een klasse tussen enkele
aanhalingstekens gaan goed, en een melding die het script vult (aria-live, role="status") houdt zijn maat.

## 7 · Wat je kunt weggooien

- `tests\opening-85.test.mjs`: vervangen door `tests\opening-87-browser.test.mjs` (de golf en de sprong bestaan niet
  meer).

## 8 · Nagekeken

- `npx astro build`: klaar, zonder fouten.
- De hele testreeks: **278 van de 278 stappen goed** (op de laatste build, na de controle).
- `scripts/account-render.mjs` geeft een 303 terug in plaats van een pagina; dat deed het in levering 86 ook al, dus het is geen nieuw probleem.
- Nieuw: `tests/opening-87-browser.test.mjs` en `tests/korte-zinnen.test.mjs`.
- Herschreven: `tests/hoekregel-browser.test.mjs`.
- Bijgewerkt voor de pil, de korte zinnen en de nieuwe opening: `blauw-uur-86`, `voorpagina-80`, `laptop-84`, `nav`,
  `hal-voorbeeld`, `stijlvel`, `grond-79` en `minder-sjabloon-browser`.

## 9 · Je notities bij lijst 75 (voor de volgende ronde)

- **De opening (kan beter):** *"Ik wou echt een gemaakte animatie beter dan deze simpele. Ik wou een soort metro gevoel
  met de motion blur creëren dat het voelt alsof het blauwe weg racet smooth naar het witte waarna de service omhoog
  komen."*
- **Het bestelformulier (goed, met een wens):** *"Ik wil dat de product hoeveelheid keuze in het bestelformulier veel
  subtieler word het is nu 1 groot blok en kan veel simpeler en mooier dan dit."*
