# Levering 88b · De laptop rijdt soepel mee

**4 november 2026. Staat alleen in je map; je rolt zelf uit met `UITROLLEN.bat`.** Bouwt voort op levering 88, die je nog
niet hebt uitgerold: rol 88 en 88b samen uit (het commitbericht in `kladblok/COMMIT-BERICHT.txt` dekt allebei). De maten
staan in `docs/RUST-80.md` §15, punt 3.

---

## 1 · Wat je vroeg

- **19:33:** *"In de video lagged de laptop een beetje, komt dit omdat dit een voorbeeld opname is of is er echt lag"*
- **19:41:** *"Ja ga hiermee aan de slag"* (op mijn voorstel: de fout repareren en de laptop in de rit zelf laten schuiven).

## 2 · Wat er mis was (gemeten)

Het lag niet aan de opname. Twee oorzaken:

1. **Twee doelen voor de video.** De klok van de rit zette de video 4 beelden vooruit, elke scroll zette hem weer terug.
   Scrol je nog terwijl het blauw vertrekt, dan stopte de video, zocht hij en speelde hij weer, om beurten. In de film
   van 88 sprong hij aan het eind in één keer van beeld 99 naar 104: het laatste stuk, waarin de laptop het beeld uit
   glijdt, ontbrak.
2. **24 beelden per seconde naast elk schermbeeld.** De video heeft 24 beelden per seconde, het blauw tekent elk
   schermbeeld (60 per seconde, op een snel scherm meer). In de film van 88 stond elk beeld van de laptop 2 of 3
   filmbeelden stil.

Gemeten in de film van 88, op 1440: zolang de laptop in beeld was, stond hij in 16 van de 30 filmbeelden stil, sprong
hij in de andere 34 px, en aan het eind in één keer 171 px.

## 3 · Wat er nu is

- **De video houdt beeld 86 vast** zodra het blauw vertrekt, en heeft nog maar één doel (`videoDoel`): tijdens de rit beeld
  86, daarna weer de scroll.
- **Het doek schuift de laptop zelf**, elk schermbeeld, op de klok van de rit (`laptopdoek.js`). Dat kan omdat de laptop
  in de video vanaf beeld 76 alleen nog naar links schuift, zonder van vorm te veranderen: **38,0 beeldpunten per beeld op
  1920** (een rechte lijn door beeld 86 – 104, hoogstens 5 beeldpunten ernaast). Op 1440 is dat 34 px per videobeeld; nu
  gaat hij in stappen van 15 px per schermbeeld. De rand van de telefoon (op elke breedte buiten beeld) gaat apart naar
  rechts.
- **Dezelfde onscherpte als de banen:** wat de laptop aflegt in 0,07 s (3,7 % van de breedte), aangroeiend in het eerste
  achtste van de rit, zodat hij niet in één beeld van scherp naar onscherp springt.
- **Liep de video bij het vertrek nog achter** (hij haalt de scroll in ± 0,16 s in), dan begint de laptop waar hij stond
  en loopt dat verschil in ± 0,4 s weg. Geen sprong vooruit bij het vertrek, en geen sprong terug als de rit terug is.
- Het tempo, de golf en wanneer de laptop het beeld uit gaat (driekwart van de rit) zijn niet veranderd.
- De film: `kladblok/levering-88/opening-88.mp4` is vervangen door die van 88b (1440 × 900). Omdat de laptop nu alleen
  op de klok van de rit beweegt, is de film tijdens de rit gelijk aan wat je browser doet.

## 4 · Nagekeken

- **De meetfilm** (alleen de laptop op wit, 60 beelden per seconde, 1440 × 900; `rand.py` meet zijn rechterrand in elke
  schermafdruk): tijdens de rit gaat de laptop elk filmbeeld 15 of 16 px naar links, 35 beelden lang, tot hij uit beeld is.
  Geen stilstand en geen sprong. Was: 16 van de 30 beelden stil, de andere 34 px, aan het eind 171 px.
- De video blijft tijdens de hele rit op beeld 86 staan en zoekt niet.
- `npx astro build`: klaar, zonder fouten.
- De hele testreeks: **279 van de 279 stappen goed (op de laatste build)**.
- Bijgewerkt: `tests/opening-88-browser.test.mjs` (de video blijft in de rit op beeld 86; de laptop gaat elk schermbeeld
  verder naar links, nooit terug en nooit stil zolang hij in beeld is).
- `kladblok/levering-88/film88.cjs` kan nu meten: met `MEET=1` staat alleen de laptop op wit, `rand.py` meet zijn rand per
  beeld.

## 5 · Gewijzigd

`src/scripts/laptopdoek.js`, `src/components/HalOpening80.astro`, `tests/opening-88-browser.test.mjs`, `docs/RUST-80.md`,
`docs/DESIGN.md`, `kladblok/VISUAILS-OVERZICHT-24-OKT.md`, `kladblok/COMMIT-BERICHT.txt`, `kladblok/LEVERING-88.md` (één
verwijzing), `kladblok/levering-88/film88.cjs` en `opening-88.mp4`. Nieuw: dit bestand en `kladblok/levering-88/rand.py`.

## 6 · Wat je kunt weggooien

Niets nieuws. Uit 88 nog: `tests\opening-87-browser.test.mjs`, als je dat nog niet deed.

## 7 · Nog niet gedaan (mijn mening)

Vóór het vertrek speelt de scroll de laptop nog steeds met de 24 beelden van de video. Daar valt het minder op, want het
blauw staat dan stil. Zie je het toch, dan kan het laatste stuk van de scroll (beeld 76 – 86) op dezelfde manier: de
laptop schuift daar ook al alleen.
