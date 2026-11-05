# Levering 85 · De golf in de laptopvideo, het witte podium, en Wat we maken komt omhoog

**3 november 2026. Staat alleen in je map; je rolt zelf uit met `UITROLLEN.bat`.** Bouwt voort op levering 84. De
maten staan in `docs/RUST-80.md` §13, de metingen in `kladblok/levering-85/meting.json`. De films en je keuzes: lijst 71.

---

## 1 · Wat je vroeg

- **Bij lijst 70** (snelheid b, 1,8 ×): *"Het mag wel wat meer snappy voelen en smooth door eerst rustig te sluiten en
  dan als een soort golvende snelheid sneller en op het einde heel iets trager. Daarna met de zelfde snappy feeling de
  volgende sectie openen met een animatie."*
- **Bij lijst 71**: *"Hij mag nog wel wat sneller en eerder al sneller gaan"*; voor de sectie **D, zacht**; levering: ja.
- **Bij de films, 02:42**: *"De animatie mag nog wel sneller. Het hoeft niet lang te zijn omdat het gewoon een kleine
  animatie tussendoor is."*
- **02:51**: *"Het begin duurt voornamelijk te lang en het mag wel een iets smoother golf hebben (niet visueel maar als
  gevoel). Ook zou ik dan eerst de pagina wit willen hebben wanneer hij naar beneden gaat en dat dan de services omhoog
  komen alsof je nog op dezelfde sectie zit."*

## 2 · Wat ik vond

Wat je voelt, is de beweging in de video maal de snelheid. De video zwelt zelf al aan. De klep komt de eerste 11 beelden
bijna niet van zijn plek, klapt dan steeds sneller dicht en houdt een korte adem (beeld 47 – 58). Daarna gaat de laptop
steeds sneller het beeld uit, tot 60 bronpixels per beeld. Mijn eerdere golven begonnen óók traag, en dan voelt het
begin dubbel traag. Dat was het lange begin.

## 3 · Wat er nu staat

- **De golf.** 4 × terwijl de klep dichtklapt en de telefoon weggaat. Daarna remt de snelheid in een zachte golf af naar
  2,5 ×, terwijl de laptop zelf het beeld uit versnelt. Zo voelt het als één golf die aan het eind een tikje uitloopt.
- **Het witte podium.** Als de telefoon weg is en de laptop het beeld uit gaat, verdwijnen de lucht achter de laptop, de
  stand eronder en het doek in 220 ms. Het podium is dan wit.
- **De sprong.** Als de laptop uit beeld is, springt de pagina zonder glijden naar Wat we maken. Alles in beeld is dan
  wit, dus je ziet de sprong niet.
- **Wat we maken komt omhoog**, op de plek waar de laptop stond, alsof je in dezelfde sectie bent. Na een witte tel van
  60 ms komt eerst de kop, dan de drie producten na elkaar (40 ms), dan de regels eronder: elk 0,4 s, 20 – 36 px omhoog,
  zacht uitlopend. Zonder video (telefoon, schuifbalk, een toets) gebeurt hetzelfde zodra de sectie in beeld komt, en na
  elke video opnieuw. Bij minder beweging, of als de sectie al in beeld staat, staat alles er meteen.
- **Terug naar boven** staan de lucht, de stand en de laptop er weer.
- Nog een keer scrollen tijdens de video maakt hem sneller: de golf × 1,6, minstens 3 × en hoogstens 5 ×.

| Na de tweede scroll | Levering 84 | Nu |
|---|---|---|
| De klep is dicht | 1,05 s | **0,47 s** |
| Het podium wordt wit | — | **1,0 – 1,2 s** |
| Wat we maken in beeld | het glijden begint na 2,3 s | **de sprong na 1,2 s** |
| Alles staat er | 3,0 s | **1,8 s** |

**Eén ding om op te letten.** Op 4 × pakt je computer ongeveer 0,7 s lang meer dan twee keer zoveel uit als nu: 251
miljoen beeldpunten per seconde, tegen 113 in levering 84 (1920 breed). Voor de videochip is dat weinig (4K op 60 beelden
per seconde is 498 miljoen). Hapert het weer, kijk dan in Chrome op `chrome://media-internals` (zie levering 84, §6).

## 4 · Wat je kunt weggooien

Niets nieuws. Staan ze er nog, dan kunnen de vijf oude video's uit levering 84 weg, in `public\img\hal\laptop-video\`:
`laptop-80-1280.mp4`, `laptop-80-1280.webm`, `laptop-80-1920.mp4`, `laptop-80-1920.webm` en `laptop-80-2560.mp4`.

## 5 · Nagekeken

- `npx astro build`: klaar, zonder fouten. De hele testreeks: **276 van de 276 stappen goed**.
- **Nieuwe toets:** `tests/opening-85.test.mjs` (npm run test:opening85, in de keten na laptop84). Hij controleert de
  golf, het witte podium, de sprong en hoe de sectie omhoog komt. Daarnaast draait hij de echte pagina in de browser,
  met een nepvideo en een klok die de toets zelf laat tikken. Daar meet hij:
  - de snelheid volgt de golf;
  - het podium wordt wit bij 3,75 s videotijd;
  - de pagina springt in één beeld bij 4,33 s, terwijl alles in beeld wit is;
  - de sectie staat tijdens de video dicht en onder het scherm, komt dan omhoog en staat er daarna helemaal;
  - terug naar boven staat alles er weer;
  - nog een scroll versnelt de video;
  - op de telefoon opent de sectie als hij in beeld komt;
  - bij minder beweging staat alles er meteen.
- Bijgewerkt: `tests/laptop-84.test.mjs` (de vaste 1,8 × is weg) en `tests/voorpagina-80.test.mjs` (de build zet de plek
  van elk product in een klasse).
- **Op het oog:** films van de echte voorpagina, beeld voor beeld met 60 beelden per seconde (lijst 71, en de films bij
  deze levering).

## 6 · Uitrollen

Rol uit met `UITROLLEN.bat` vanuit je map. Het commitbericht staat in `kladblok/COMMIT-BERICHT.txt`.
