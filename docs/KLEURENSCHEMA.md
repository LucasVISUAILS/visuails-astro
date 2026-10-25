# VISUAILS — kleurenschema

**Stand: 24 oktober 2026. Schema Blauw uur, overal (levering 68). De hoeken, glas en gloed,
de knoppen, Hoe het werkt in witte kaarten, de gloed van "Gemaakt met AI" en de iconen zonder
plaatje: 25 oktober 2026 (levering 74).** Dit is het ene bestand dat de kleuren draagt. Verandert hier iets, dan in de bestanden hieronder ook, en
andersom niet.

Lucas koos in lijst 55 (*"Wit, inkt en kobalt"*): blauw **a** (Blauw uur `#25508B`, uit de
fade van het logo), logo **a** (het hele logo kleurt), tempo **b** (3,6 s), warm **a** (geen
warme kleur), blok **b** (één inktblok per pagina, op 53°) en effecten **a** (E1, E4, E5, E6).
Zijn woorden:

- *"Ik wil de website eigenlijk puur wit als achtergrond maken en de blauwe/zwarte kleuren
  er in laten snijden (een beetje zoals de ovyon website) zoals het logo en sommige knoppen
  en eventueel hier en daar wat subtiele effecten gebruiken voor bepaalde delen maar nooit
  overdreven en rustig."*
- *"Ik wil dat het logo niet zelf beweegt maar dat de kleuren op als een soort schommel,
  als in snelheid, bewegen."*
- *"Ik denk dat deze kleur de kleur word, het voelt niet als een ai tool kleur en ook niet
  als een copy cat van een ander merk. Misschien is de kleur wat anders dan wat gebruikelijk
  is maar het zorgt er wel voor dat VISUAILS anders voelt wanneer je de website bezoekt."*

Het schema daarvoor (schema A, violet, 19 tot 23 oktober) staat verderop als geschiedenis,
en daaronder de hal (14 tot 18 oktober) en het schema van 20 september. Kelvin (lijst 50) en
Blauw uur als palet (lijst 54) zijn alleen schetsen geweest; ze stonden nooit op de site.

---

## In één zin

Puur wit. Inkt en één blauw snijden erin, zoals het logo. **Blauw staat op één plek per
scherm (Bestellen bovenin), bij het logo onder de muis, in het accentwoord van de opening
dat ademt, in een link in de tekst, in de focusrand en in geselecteerde tekst. Verder
nergens.** Eén inktblok per pagina, afgesneden op 53°. Geen verloop als vlak, geen bewogen
achtergrond, geen warme kleur. Glas op wat boven de pagina zweeft; een gloed in blauw uur op een
knop onder de muis en, even, om het product dat met AI gemaakt is (levering 74).

---

## De vijf kleuren (contrast nagerekend, WCAG)

| Kleur | Waarde | Token in hal.css | Rol | Contrast |
|---|---|---|---|---|
| **Wit** | `#FFFFFF` | `--h-wit` | De grond, overal, ook achter de foto's. Kaarten | — |
| **Inkt** | `#0B0F17` | `--h-inkt` | Alle tekst, koppen én lopende tekst. Het logo, de knoppen, het ene blok, "geleverd" | 19,18:1 op wit · 17,58:1 op vlak · 15,63:1 op lijn |
| **Blauw uur** | `#25508B` | `--h-blauw` | Eén plek per scherm, het logo onder de muis, links, de focusrand, selectie | 8,08:1 op wit · 7,41:1 op vlak · wit erop 8,08:1 |
| **Grijs** | `#636974` | `--h-grijs` | Alleen kleine tekst: bijschriften, labels, de lichte helft van een kop | 5,52:1 op wit · 5,06:1 op vlak · 4,50:1 op lijn |
| **Lijn** | `#E6E8EC` | `--h-lijn` | Alleen scheiding: haarlijnen, de rand van een kaart. Nooit tekst | 1,23:1 op wit |

**Blauw en inkt staan nooit op elkaar.** Naast elkaar haalt blauw op inkt maar 2,37:1. Zet
een blauwe en een zwarte knop dus nooit als gelijken tegen elkaar: wit ertussen, of de snede.

### Afgeleid: geen nieuwe kleuren, elk één rol

| Naam | Waarde | Token | Alleen voor | Gemeten |
|---|---|---|---|---|
| Vlak | `#F4F5F7` | `--h-vlak` (en de oude naam `--h-nevel`) | Het vlakje onder een pil, chip of klein knopje; een lege plek; iets onder de muis | 1,09:1 op wit · grijs erop 5,06:1 |
| Lijn sterk | `#C5C8CF` | `--h-lijn-sterk` | Een rand die je moet zien (de tweede knop) | 1,68:1 op wit, geen tekst |
| Veldlijn | `#858A94` | `--h-veldlijn` | De rand van een invulveld, een vinkvakje | 3,47:1 op wit · 3,18:1 op vlak (een veldgrens vraagt 3:1) |
| Blauw diep | `#1A4279` | `--h-blauw-diep` | Een blauwe knop onder de muis | wit erop 10,00:1 |
| Blauw licht | `#80A7DD` | `--h-blauw-licht` | Alleen op inkt: de focusrand en het logo op het inktblok, links in donkere modus | 7,75:1 op inkt · 7,19:1 op de donkere kaart |

Alle grijzen hebben de toon van de inkt (263°) en een klein beetje kleur, zodat ze bij het
blauw horen en niet bij een ander merk. Een grijs dat uit het vorige schema komt, kreeg het
koele grijs met **dezelfde helderheid**, dus elk contrast is gelijk gebleven.

**Oude namen.** `--h-nevel` = vlak, `--h-vak` = lijn, `--h-inkt-2` = inkt, `--h-inkt-3` en
`--h-kop-licht` = grijs, `--h-violet` = blauw, `--h-violet-diep` = blauw diep, `--h-lila` =
blauw licht, `--h-mist` = vlak, `--h-waas` = lijn, `--h-nacht` = inkt. Ze blijven bestaan
zodat een vergeten verwijzing niet breekt. Schrijf in nieuwe regels de nieuwe namen.

---

## 60 · 30 · 10, in elke sectie

| Deel | Wat | Waar |
|---|---|---|
| 60 | wit | de grond, de kaarten, de grond van elke foto |
| 30 | inkt en beeld | de tekst, de knoppen, het logo, de foto's zelf, het ene inktblok |
| 10 | blauw | Bestellen bovenin, een link, de focusrand; onder de muis het logo en een inktknop |

De producten zijn het warme. Een vierde kleur (amber, lamplicht) maakt er weer een palet van
(lijst 55, warm a).

---

## Waar blauw staat, en waar niet

| Plek | Hoe |
|---|---|
| **Bestellen bovenin** (`.nav-cta`, in de lade `.mobile-cta`) | Blauw met wit, met een zachte gloed in blauw uur eronder. Onder de muis blauw diep, de gloed iets sterker (levering 74). Dit is de ene plek per scherm |
| **Het logo onder de muis** | De schommel, zie hieronder. Op de balk, in de lade, in de voet en het grote woordmerk onderaan, in Studio, op de privélink en in /admin |
| **Het accentwoord in de opening** (`.o-acc`, alleen de voorpagina) | Inkt, met een laag blauw uur die ademt. Zie "Het accentwoord: inkt dat ademt" hieronder (levering 74) |
| **Een link in de tekst** | Blauw, met een streep in blauw op 38 %. In de voet: inkt, onder de muis blauw |
| **De focusrand** | 2 px blauw (`--focus-ring`). Op het inktblok blauw licht |
| **Geselecteerde tekst** | Blauw met witte letters |
| **Een knop onder de muis** | Blauw uur komt als gloed van de onderrand op (`.h-knop::before`, levering 74); tot 25 oktober werd een inktknop vol blauw. Het merk reageert op de hand |
| **"Gemaakt met AI" in de lagen** (Hoe het werkt, catalog, stap 02; `.o-ont-ai`) | Op het hoogtepunt van de lagen (ruim een seconde, met in- en uitlopen anderhalf, van de 12,9 s): een zachte gloed in blauw uur om het product en eronder "Gemaakt met AI" in mono, blauw uur op wit (8,08 : 1, 12 px). Daarna weg. Lucas, 16:57: *"laat alleen kort tijdens de lagen animatie zien met een soort subtiele gloed om het product heen dat het met ai gemaakt is"* |
| **Aandacht** (revisie, jij bent aan zet) | Blauw op vlak, zie de statusset. Blauw betekent: actie |

**Wat je kiest is inkt.** Een aangevinkte keuze, de gekozen kaart, stijl, look, gezicht, vorm,
kleur, verhouding of achtergrond: inkt (`--kies`). In schema A was dat violet.

**Nergens anders.** Geen blauw kopwoord (op het ene ademende accentwoord van de opening na,
en dat is in rust inkt), sectienummer, stip, icoon, rand of vlak. Geen blauwe achtergrond
van een sectie. Het blauw snijdt, het vult niet.

---

## Het ene inktblok per pagina (E6)

Eén blok inkt dat het wit in snijdt, afgesneden op 53° rechtsonder (een 3-4-5-driehoek: 36 ×
48 px, op een groot blok 48 × 64). Sinds 25 oktober 2026 zijn de andere drie hoeken rond: het
€1-paneel 24 (`--r-kaart`), het slot onderaan, een brede band, 32 (`--r-vlak`); tot die dag had
het één zachte hoek linksboven. Het staat stil: het is papier, geen beweging.

| Pagina | Het blok |
|---|---|
| Met het €1-blok (home, prijzen, start, catalog, lifestyle, vergelijken, contact, FAQ, galerij, gidsen, hoe het werkt, abonnementen, Studio, proef, uploadrichtlijnen) | `.h-proef`: het paneel met de tekst is inkt; de vier foto's staan ernaast op wit |
| Zonder €1-blok (elke look, video, edities, hooks, modellen, merkmodel, over ons) | `.h-lk-slot`: het slot onderaan |

**Hoe het werkt op de voorpagina: geen uitzondering meer** (levering 74). Om 14:39 vroeg Lucas
de drie stappen "meer als het voorbeeld met de donkere blokken"; om 16:28: *"De donkere
achtergrond maakt het ook wat heftiger dan dat het zou moeten dus deze mag wit zijn."* De drie
stappen zijn nu witte kaarten met een haarlijn (24 rond), het middelste iets breder (1 : 1,15 :
1); tussen de kaarten een lijn in lijn sterk door het wit, met een blokje in inkt dat oversteekt
als de volgende stap begint. Het €1-blok verderop is het ene inktblok van de pagina.

Op inkt alleen wit: koppen wit, de lichte helft van een kop wit op 72 % (10,09:1) of 82 %
(12,92:1), lopende tekst wit op 86 % (14,14:1), de feitjes wit op een vlak van 10 % wit
(14,99:1). De inktknop wordt daar een witte knop met inkt; de knop met een rand krijgt een
witte rand. De focusrand en het logo zijn daar blauw licht.

---

## Kaarten en vlakken

- **Een kaart is wit met een haarlijn** (`--h-kaart` wit, `--h-kaart-rand` 1 px lijn), 24 px
  rond aan alle vier de hoeken (zie "De hoeken" hieronder). In schema A waren kaarten
  nevelgrijs; nu snijdt alleen de inkt en het blauw, de rest is papier.
- **Vlak** (`#F4F5F7`) alleen onder iets kleins: een pil, een chip, een rond knopje, een lege
  fotoplek, of onder de muis.
- **De bewogen achtergronden van levering 62 zijn weg.** Elk sfeervlak is een witte kaart met
  een haarlijn. De beelden staan nog in `public/img/achter/` maar worden niet meer gebruikt.
- **Glas op wat zweeft, nergens in de pagina zelf.** Zie "Glas en gloed" hieronder.
- **De voet is wit**, met een haarlijn bovenaan, de tekst in inkt, de kleine koppen in grijs,
  en het woordmerk groot in inkt, door de onderrand afgesneden.

---

## De hoeken (25 oktober 2026)

Lucas: *"Wat ik overigens wel aan de style wil aanpassen is het 1 zachte hoek en de rest harde
hoeken systeem voor alles. Ik wil dit alleen op hele specifieke plekken behouden en niet voor
grote kaarten of objecten en puur alleen voor bijvoorbeeld knoppen. De hoeken van kaarten
worden gewoon heel rond, iets ronder dan in het voorbeeld."* (Zijn voorbeeld: ongeveer 19 px op
een paneel van 415 × 311; 24 is "iets ronder".) Zijn keuzes: kaarten 24 px rond aan alle vier de
hoeken, grote vlakken 32, knoppen en chips houden de zachte hoek; overal in één keer.

| Wat | Hoek | Token |
|---|---|---|
| Kaart, paneel, foto, beeldkader, modal, paneel in de lade, blok, tabel in een kader | 24 rondom | `--r-kaart` |
| Groot vlak: een brede band, een paneel over de pagina, het slot onderaan | 32 rondom | `--r-vlak` |
| Kleine tegel, duimnagel, een strook van één regel | 12 rondom | `--r-klein` |
| Knop (ook een link-knop), chip, pil, tab, segment, invulveld, klein statusplaatje | één zachte hoek linksboven, 3 px op de andere drie | `--hoek-knop` (14 · 3 · 3 · 3); een grote knop 16, een chip 8 tot 11 |
| Een icoonplaatje dat blijft (een pijl of afspeelknop op een foto, een knopje op /about of in de galerij) | vier gelijke hoeken, 24,7 % van de hoogte; in de hoek van een kaart concentrisch (alle vier op die maat). Geen zachte hoek (16:44, zie "De iconen") | — |
| Het inktblok | rond, rechtsonder de snede van 53° | `--r-kaart` of `--r-vlak` |
| Rondjes en pillen | blijven rond | — |

- **Concentrisch.** Ligt iets in een hoek van een rond vlak, dan is die hoek de straal min de
  afstand tot de rand, minstens 8 (in een klein vlak de helft van zijn straal). Een foto die
  zijn vlak vult neemt de vorm over (`inherit`). Een knop in een hoek: die hoek loopt mee, de
  andere zijn licht (3 px), langs een snede 0.
- **Waar het staat.** De tokens in `global.css` (site en Studio) en met de hand in
  `public/account.css`, `public/admin.css`, `public/portal.css`. De regels in `hal.css` ("DE
  HOEKREGEL"), `studio-hal.css` ("DE HOEKREGEL IN STUDIO"), onderaan `public/admin.css` en
  `public/portal.css`. De mails (`src/lib/mailTemplate.js`): het betaalvak 24, een citaat 12, de
  knop en de statuspil houden de zachte hoek.
- **Bewaakt** door `tests/hoekregel-browser` (geen zachte hoek op een groot object; wat in een
  hoek ligt is concentrisch) en `tests/minder-sjabloon-browser` (een knop wordt niet even rond
  als een kaart).

---

## Glas en gloed (levering 74)

Lucas, 25 oktober 2026: *"Ik wil dat je de topbar ook gaat redesignen en weer een wat meer glas
effect geeft dat goed past bij de nieuwe moderne minimalistische style van de website"*, en om
15:24: *"gebruik voor plekken als top bar wel glas en maak de knoppen wat mooier, ze zijn nu wat
in your face en mogen wat subtieler. Gloed mag in accentkleur, zolang het er modern en eruit
ziet als iets dat bij VISUAILS past."*

**Glas** ligt op wat boven de pagina zweeft, en alleen daar:

| Waar | Glas | Waarom het leesbaar blijft |
|---|---|---|
| De balk bovenin (`.site-header .nav::before`) | wit 68 %, 18 px vervaging, verzadiging 1,6; witte binnenrand, haarlijn in inkt op 7 %, lage zachte schaduw; 18 px rond | boven inkt blijft de grond minstens `#B1B2B5`: de menuletters 9,1 : 1 |
| De uitklapmenu's van de balk (`.nav-menu`) | wit 90 %, 20 px vervaging; dezelfde randen; 20 px rond | de grijze kopjes halen boven inkt nog 4,5 : 1 |
| De WhatsApp-knop rechtsonder (`.wa-launcher`) | wit 72 %, 16 px vervaging | alleen een icoon in inkt |
| De uitlegbalk zolang hij onderin plakt (`.u-balk`) | vlak 78 %, 16 px vervaging | inkt op de donkerste grond nog 10 : 1 |
| De bovenbalk van Studio (`.st-balk`) en van /admin (`.adm-balk`), die bovenaan blijven staan | wit (in /admin donker: de eigen kaartkleur) op 92 %, 16 px vervaging | de grijze kruimels halen boven inkt nog 4,69 : 1 |

Niet op een kaart, een blok, een sectie of het €1-blok: wat in de pagina ligt, is papier.
Zonder `backdrop-filter` (oude browsers) zijn ze vol wit of vol vlak.

**Gloed** is licht in blauw uur, en hoort bij de hand of bij de ene blauwe knop:

- **Een knop onder de muis** (`.h-knop::before` in `hal.css`, "LEVERING 74 · KNOPPEN"): blauw
  uur komt als een radiaal verloop van de onderrand op, in 0,32 s, zoals het blauwe uur aan de
  horizon. Binnen de knop, dus ook binnen de snede van een knoppenpaar. Wit op inkt (19,18 : 1)
  en wit op blauw uur (8,08 : 1): elke tussenstand haalt het. Op een witte knop is hij zwak (16 tot
  20 %); op het inktblok in blauw licht.
- **Bestellen bovenin**: een zachte gloed in blauw uur eronder, iets sterker onder de muis.
- **Het accentwoord van de opening**: een zachte gloed die met de adem meekomt (zie hieronder).
- **Het product in de lagen** (Hoe het werkt, catalog, stap 02): een zachte gloed in blauw uur
  (`drop-shadow` 12 px op 50 %, met een smalle zoom van 2 px in blauw licht: licht, geen vlak), ruim
  een seconde op het hoogtepunt van de lagen, met "Gemaakt met AI" eronder.
  Dit is de enige plek waar de site zegt wat AI doet; geen labels als "met de hand" ernaast
  (16:57: *"Voelt veel te verdedigend, wees hier voortaan streng op"*).
- Geen gloed achter het logo, geen gloed als vlak of achtergrond, geen andere kleur dan blauw uur
  (op inkt blauw licht). Minder beweging: geen overgang; hoog contrast: geen gloed.

`tests/minder-sjabloon-browser.test.mjs` laat glas en een zachte schaduw alleen toe op wat
zweeft en onder Bestellen.

---

## De knoppen (levering 74)

Lucas (15:24): *"maak de knoppen wat mooier, ze zijn nu wat in your face en mogen wat
subtieler."* Wat er veranderde, in `hal.css` onderaan:

| | Was | Nu |
|---|---|---|
| Hoogte (klein) | 56 px (46) | 48 px (40) |
| Letter | 16 px | 15 px (klein 14) |
| De pijl | 20 px | 17 px |
| De inktknop | inkt, onder de muis vol blauw | inkt met een dunne lichtrand bovenaan; onder de muis de gloed |
| De lijnknop | 1,5 px inkt, onder de muis vol inkt | 1 px lijn sterk; onder de muis een lijn in inkt en een zweem blauw uur |
| De snede tussen twee knoppen | 42 px, kier 5,3 | 0,75 × de hoogte: 36 px, kier 4,5 (klein 30 en 3,8) |

De ene zachte hoek blijft (14 px, klein 12). Bestellen bovenin houdt zijn maat (38 px).

---

## De iconen (levering 74)

Lucas, 16:44: *"Als het kan wil ik de vinkjes gewoon zonder achtergrond maken om het er schoner
uit te laten zien. Let er wel op dat ze zichtbaar zijn dus als wit niet goed zichtbaar is maak hem
dan zwart. Ook wil ik hier niet meer de zachte rand gebruiken voor plekken waar het icoontje met
achtergrond nog wel word toegepast."* In `hal.css` onderaan ("ICOONTJES ZONDER PLAATJE"):

| Wat | Nu |
|---|---|
| Een vinkje op een beeld (Hoe het werkt, /per-product, /how-it-works, het bestelformulier) | geen plaatje, het vinkje zelf 19 tot 22 px, lijn 2,6, in inkt. Wit alleen op een beeld dat gemeten donker is (de beelden van Flash op de voorpagina: 4 – 5 van 255) |
| Een vinkje of icoon in een lijst of naast een zin (de leverlijst, de feiten van een abonnement, de controles op /custom-models en /upload-guidelines, Studio, de kleine iconen `.h-cirkel-mini` op /pricing, /ai-act en in links) | geen plaatje, inkt; in een lijst die zich afvinkt lijn sterk zolang het nog moet |
| Een pijl naast tekst of rechtsboven in een lichte kaart (Wat we maken, Nog vragen?, /start, /how-it-works) | geen plaatje, de pijl in inkt |
| Wat een plaatje houdt (een pijl of afspeelknop op een foto, de knopjes op /about en in de galerij) | vier gelijke hoeken, 24,7 % van de hoogte; concentrisch in de hoek van een kaart |
| Knoppenparen met de snede (vorige · volgende) | blijven knoppen, met hun vorm |

---

## Het logo: staat stil, de kleur schommelt

Lijst 55, logo a en tempo b. Het logo beweegt niet. Onder de muis (en bij focus op de link)
kleurt het **hele** logo van inkt naar blauw uur en terug, als één vlak, in **3,6 s** heen
en terug. De snelheid is die van een schommel: de dekking van de blauwe laag is
`(1 − cos t) / 2`. Aan de uiteinden (inkt, blauw) remt de kleur af en hangt hij even; door het
midden gaat hij het snelst.

- Hoe: een tweede laag in blauw (`.mk-kleur`, hetzelfde symbool, niet nagetekend) ligt op de
  inkt. Alleen zijn dekking beweegt. `--vs-fase` loopt van 0 tot 1 (`@property`, lineair),
  `--vs-amp` schuift in 450 ms open en in 700 ms dicht, zodat de kleur nooit verspringt.
- Waar: `src/styles/global.css` (de site en Studio) en een kopie in `public/account.css`,
  `public/admin.css` en `public/portal.css`. De vorm komt uit `VMerk.astro`, `Woordmerk.astro`
  en `woordmerkSvg()` in `src/data/wordmarkPath.js`.
- `--mk-kleur` zet per plek de kleur: blauw uur op wit, blauw licht op inkt.
- Minder beweging: onder de muis meteen blauw, zonder schommel.
- Niets beweegt bij het laden. De elektrische lijn (mk-line) en de echo's zijn weg.
- Het logo zelf is altijd één kleur: inkt (de standaard), blauw of wit.

---

## Het accentwoord: inkt dat ademt (levering 74)

Lucas, 25 oktober 2026: *"Normaalgesproken hebben veel ai tools accentwoorden in zinnen
gekleurd maar ik denk dat ik een soort blauwe animatie gloed wil gebruiken in plaats van de
gekleurde woorden, een soortgelijk effect als over het logo"*, en na Schets 59: *"Ik bedoel dat
er wel echt een soort breathing effect op het woord zit en het woord niet zelf gekleurd is,
net zoals het hover effect op het logo in de topbar maar dan wat smoother en rustiger. Zoals
het nu is lijkt het weer meer op een ai tool, dit wil ik tegen gaan."*

- Eén woord op de hele site: het laatste stuk van de kop van de voorpagina ("Zonder shoot." /
  "Without a shoot."), `.o-acc` in `src/styles/opening.css`.
- In rust is het **inkt**, zoals de rest van de kop. Een tweede laag in blauw uur (dezelfde
  letters, niet nagetekend) ademt erop met de slinger van het logo, `(1 − cos t) / 2`, maar
  rustiger: één keer heen en terug in 4,8 s (het logo 3,6 s), en de amplitude groeit in 1,6 s
  aan zodat het nooit verspringt. Daarna blijft het inkt. (Eerst ademde het zonder einde, elke
  8 s; Lucas koos op 25 oktober "één keer, dan stil": wat vanzelf beweegt en langer duurt dan
  5 s, moet stil te zetten zijn, WCAG 2.2.2.) Sinds 15:24 ("Gloed mag in accentkleur") komt er met de adem een zachte
  gloed in blauw uur mee (`text-shadow`, 38 % en 18 %); geen verloop, geen lijn licht (dat was
  Schets 59).
- Hij begint pas na de eerste beweging van de bezoeker (muis, toets, aanraking, wiel): niets
  beweegt bij het laden. Minder beweging: inkt, zonder adem. Hoog contrast: geen blauwe laag.
- Contrast: inkt 19,18 : 1 en blauw uur 8,08 : 1 op wit, en elke tussenstand ligt daartussen.

---

## De effecten (lijst 55, effecten a)

Elk effect speelt één keer, op de hand of als iets in beeld komt. Nooit bij het laden, nooit
in een lus, behalve bij echte voortgang. Alleen het idee kwam uit *Logo in Kelvin* en *Logo
ronde 2*, niet de kleuren.

| | Effect | Waar | Duur |
|---|---|---|---|
| E1 | **De snede-wis**: koppen en beelden komen binnen langs 53°, in stappen | elke `.h-in` (bestond al: `h-wis` in hal.css) | 420 tot 620 ms |
| E4 | **De tl-buis**: de streep van een sectielabel springt aan, twee keer haperen, dan aan | `.h-sec-kop.is-in p.h-pil::before` (nieuw, `h-tl`) | 460 ms, in stappen |
| E5 | **Het vlagje vult**: bij uploaden vult het vlagje van de V zich met de echte voortgang; vol is één sprong. Geen spinner | het uploaden van je foto's (bestond al, levering 55) | zo lang als het uploaden |
| E6 | **Het blok op 53°**: één inktblok per pagina | zie hierboven | staat stil |

Niet gebruikt: de haarlijn bij hover (E2) en het scherpstellen (E3). Bewaard voor later, bijvoorbeeld
voor de stijlpagina's.

---

## De statusset

Het gelukte pad loopt voller: een lijn, vlak met een lijn, inkt. Massief alleen voor
"geleverd". Aandacht is blauw, want blauw is de actie. Geen amber meer.

| Stand | Vulling | Rand | Letter | Contrast |
|---|---|---|---|---|
| Wacht (ontvangen, wachtrij) | geen | veldlijn `#858A94` | inkt | 19,18:1 |
| Bezig (in productie, onderweg) | vlak `#F4F5F7` | lijn `#E6E8EC` | inkt | 17,58:1 |
| Klaar (geleverd, betaald) | inkt | inkt | wit | 19,18:1 |
| Aandacht (revisie, actie nodig) | vlak `#F4F5F7` | blauw op 40 % | blauw | 7,41:1 |
| Geannuleerd, verlopen | lijn `#E6E8EC` | veldlijn | inkt | 15,63:1 |

Tokens: `--st-wait-*`, `--st-work-*`, `--st-done-*`, `--st-rev-*`, `--st-can-*` (fill, edge,
ink). Buiten CSS: `STAND_KLEUR` in `src/data/status.js` en `C.st*` in `src/lib/mailTemplate.js`.

**Een fout in een formulier** blijft rood (`#B3261E` in het bestelformulier, de rode tinten in
/admin en Studio), altijd met een woord erbij. Dat is geen merkkleur maar een waarschuwing.

---

## Donker (Studio donker, /admin donker)

Dezelfde rollen, omgekeerd, in de koele grijzen van inkt:

| Rol | Waarde | Gemeten |
|---|---|---|
| Grond | inkt `#0B0F17` | — |
| Kaart | `#16181E` | — |
| Vlak | `#1E2128` | — |
| Letters | `#F4F5F7` op 100 / 72 / 58 % | 17,58:1 op de grond (100 %) |
| Knop | wit-vlak `#F4F5F7` met inkt | 17,58:1 |
| Links, focusrand, logo onder de muis | blauw licht `#80A7DD` | 7,75:1 op inkt · 7,19:1 op de kaart |

---

## Waar het schema staat

| Plek | Bestand | Hoe |
|---|---|---|
| De site | `src/styles/hal.css` | `body.hal`: de tokens bovenaan (SCHEMA BLAUW UUR), alle tokens van global.css opnieuw; onderaan het blok "LEVERING 68" (sfeervlakken, het inktblok, het €1-blok, de voet, het logo, E4) |
| Het logo onder de muis | `src/styles/global.css` (HET LOGO SCHOMMELT IN KLEUR) | en een kopie in `public/account.css`, `public/admin.css`, `public/portal.css` |
| De bestelstroom | `src/styles/werkplaats.css`, `stijl22.css`, de onderdelen in `src/components/order/` | wat je kiest via `--kies` (inkt) |
| VISUAILS Studio | `src/styles/studio-hal.css` | de tokens in `body.studio.st-hal`; `--mk-kleur` op `.st-merk` |
| De privélink (`/o/…`) | `public/portal.css` | blok "DE HAL" onderaan |
| De losse kaarten van account.js | `public/account.css` | blok "DE HAL" onderaan |
| /admin | `public/admin.css` | licht en donker; de focusrand blauw, donker blauw licht |
| De mails | `src/lib/mailTemplate.js` (`C`) en de beelden in `public/img/mail/` | `npm run mail:assets`: het woordmerk inkt, het streepje inkt, het woordmerk in de voet in lijn sterk |
| De factuur | `src/lib/invoicePdf.js` | `INK`, `MUTED`, `RULE`, `NADRUK`, `VLAK` |
| De fotogids (pdf) | `scripts/lib/fotogids-html.mjs` | `npm run handleiding` |
| De statuspil buiten CSS | `src/data/status.js` | `STAND_KLEUR` |
| Het deelplaatje | `scripts/make-og.mjs` | `npm run og` |
| De schetsen in het formulier | `scripts/schetsen-zijpaneel.py` | → `public/img/schets/` |
| De pijl in een keuzelijst | `public/img/ui/keuzepijl-0b0f17.svg`, `-f4f5f7.svg` | een `data:`-adres kan geen variabele lezen |
| De adresbalk | `src/layouts/Layout.astro` | `theme-color` wit op een hal-pagina |
| Favicon | `public/favicon*.png`, `favicon.ico`, `favicon.svg`, `apple-touch-icon.png` | een kopie uit het logopakket (`images/Logo/visuails-logo-blauw-uur/favicon`): wit V-merk op vlak blauw uur |
| Het logopakket | `E:\Claude (VISUAILS)\images\Logo\visuails-logo-blauw-uur` | `python3 maak-logopakket.py --site <map van de site>`, met een eigen KLEURENSCHEMA.md |
| De laptopfoto in de opening | `public/img/hal/pov-2304.webp` en de standen in `public/img/hal/stand/` | `python3 scripts/laptop-foto.py <de witte foto>` en `node scripts/laptop-standen.mjs`. De grond is na het decoderen precies `#FFFFFF` |

**Wat bewust niet meegaat.** De schermen van de laptop in de opening (`.sc…` in hal.css,
`HalLaptopSchermen.astro`) tonen de winkel van een klant (JOUWMERK), niet VISUAILS: die
houden hun eigen kleuren. Ook de kleuren die inhoud zijn blijven staan: de achtergronden
waaruit je kiest, kledingkleuren, het lichtgrijs van de geleverde set (`#EFEFEF`, de grond
van de foto's), het blauw van Instagram in het voorbeeldscherm, de rode tekst van een fout.

---

## De kleurentabel (oud → nieuw)

`kladblok/levering-68/kleurmap.py` paste dit toe op elke letterlijke waarde (`#hex`,
`rgb()`, `%23hex` in een `data:`-adres), buiten commentaar en buiten de laptopschermen.

| Oud (schema A) | Nieuw | Rol |
|---|---|---|
| `#000000` | `#0B0F17` | inkt |
| `#3D3D3D` | `#0B0F17` | lopende tekst is inkt; als vlak van een knop onder de muis: `#25508B` |
| `#616161`, `#6E6E6E` | `#636974` | grijs |
| `#F2F2F2` | `#F4F5F7` | vlak (kaarten worden wit met een haarlijn) |
| `#E8E8E8`, `#DDDDDD` | `#E6E8EC` | lijn |
| `#C8C8C8` | `#C5C8CF` | lijn sterk |
| `#8A8A8A` | `#858A94` | veldlijn |
| `#4400FF` | `#25508B` | blauw uur |
| `#3600CC` | `#1A4279` | blauw diep |
| `#8F66FF` | `#80A7DD` | blauw licht (alleen op inkt) |
| `#F6E7D1` · `#8A4D06` | `#F4F5F7` · `#25508B` | aandacht: geen amber meer |
| `#0E0E0E` | `#0B0F17` | de donkere grond |
| elk ander grijs zonder kleur | het koele grijs met dezelfde helderheid | bijvoorbeeld `#181818` → `#16181E`, `#212121` → `#1E2128`, `#F5F5F5` → `#F5F5F7` |
| `rgb(0 0 0 / x)` | `rgb(11 15 23 / x)` | schaduw en lijn in inkt |

---

## Altijd

1. Wit is de grond, ook achter de foto's. Geen grijze sectie, geen getinte band.
2. Lopende tekst en knoppen minstens **4,5:1**, ook een kop. Tekst minstens 11,5 px.
3. **Blauw op één plek per scherm**, plus het logo onder de muis, het ademende accentwoord
   van de opening, links, de focusrand en selectie. Geen blauw kopwoord, icoon, stip, rand of
   vlak.
4. **Eén inktblok per pagina**, afgesneden op 53°, de andere hoeken rond.
5. Blauw en inkt nooit op elkaar (2,37:1). Op inkt alleen wit en blauw licht.
6. Geen verloop als vulling, geen bewogen achtergrond. Glas alleen op wat zweeft (de balk,
   zijn menu's, de WhatsApp-knop, de plakkende uitlegbalk). Een gloed alleen in blauw uur (op
   inkt blauw licht): een knop onder de muis, Bestellen bovenin, het ademende accentwoord, en
   kort het product dat met AI gemaakt is (de lagen van Hoe het werkt).
12. Een vinkje of icoon in een lijst, zin of beeld heeft geen plaatje: het icoon zelf, in inkt
   (wit alleen op een gemeten donker beeld). Een plaatje dat blijft heeft vier gelijke hoeken.
7. Een kaart is wit met een haarlijn, 24 rond aan alle vier de hoeken. Vlak alleen onder iets
   kleins. De zachte hoek linksboven alleen op wat je bedient.
8. Een stand is pil plus woord; massief alleen voor "geleverd"; aandacht blauw.
9. Het logo is één kleur: inkt, blauw of wit. Onder de muis de schommel. Woordmerk en los
   V-merk nooit naast elkaar (`scripts/brand-lockup-guard.mjs`).
10. Niets beweegt bij het laden; beweging stopt helemaal bij "minder beweging".
11. Een nieuw grijs heeft de toon van de inkt (263°) en de helderheid van wat het vervangt.

---

# Schema A (19 – 23 oktober 2026)

Tot levering 68 stond dit op de site: wit, zwart en één elektrisch violet `#4400FF`.
Hieronder staat het zoals het toen was, als geschiedenis.

Lucas koos in afvinklijst 41 schema A, "wit, zwart, elektrisch violet", met
zwarte knoppen en een vlak violet €1-blok zonder korrel. Zijn notitie: *"Ook
alle afbeeldingen/logo's aanpassen en een nieuw kleurenschema maken voor de
nieuwe kleuren. Zoek of er al een kleurenschema in de map zit zodat je die kan
aanpassen. Doe dit heel uitgebreid en nauwkeurig."* Op de vraag wat er met de
kleine plekken violet gebeurt (een kopwoord, het sectienummer, een stip, een
icoon, een link): *"Ook zwart"*.


---

## In één zin

Wit, zwart en één elektrisch violet. **Violet staat in de voet, het €1-blok,
de knop Bestellen bovenin en wat je kiest. Verder nergens.** Het grijs heeft
geen kleur: geen lila en geen blauwe zweem, zodat het violet nergens op lijkt.

---

## De kleuren (contrast nagerekend, WCAG)

| Rol | Waarde | Token in hal.css | Contrast |
|---|---|---|---|
| Grond | `#FFFFFF` | `--h-wit` | — |
| Nevel (vlakken, de tweede laag) | `#F2F2F2` | `--h-nevel` | — |
| Vak (beeldvak, lege staat, geannuleerd) | `#E8E8E8` | `--h-vak` | — |
| Lijn (haarlijn, rand) | `#DDDDDD` | `--h-lijn` | — |
| Lijn, sterk (een rand die je moet zien) | `#C8C8C8` | `--h-lijn-sterk` | geen tekst |
| Veldlijn (de rand van een invulveld) | `#8A8A8A` | `--h-veldlijn` | 3,45:1 op wit · 3,08:1 op nevel |
| Zwart (koppen, knoppen, links) | `#000000` | `--h-inkt` | 21:1 op wit · 18,76:1 op nevel |
| Grijs 2 (lopende tekst) | `#3D3D3D` | `--h-inkt-2` | 10,86:1 op wit · 9,70:1 op nevel · 8,87:1 op vak |
| Grijs 3 (kleine tekst) | `#616161` | `--h-inkt-3` | 6,19:1 op wit · 5,53:1 op nevel · 5,05:1 op vak |
| Lichte kop (het lichte deel van een kop) | `#6E6E6E` | `--h-kop-licht` | 5,10:1 op wit · 4,55:1 op nevel |
| Violet | `#4400FF` | `--h-violet` | wit erop 7,81:1 · op wit 7,81:1 · op nevel 6,97:1 |
| Violet diep (hover van violet) | `#3600CC` | `--h-violet-diep` | wit erop 10,35:1 |
| Lila (alleen de echo bij het logo) | `#8F66FF` | `--h-lila` | 5,51:1 op zwart · 2,05:1 op violet: nooit tekst |
| Aandacht (amber, een uitzondering) | `#8A4D06` op `#F6E7D1` | `--st-rev-*` | 5,49:1 |

Het violet heeft dezelfde kleurtoon als het violet van daarvoor (256° tegen
252°), maar zonder groen erin: daardoor feller en dieper.

**Vier namen die niet meer bestaan als kleur.** Ze blijven gedefinieerd, zodat
een vergeten verwijzing niet breekt, maar ze vallen samen met een andere:

| Token | Was | Is | Waarom |
|---|---|---|---|
| `--h-mist` | `#F1EEFF` | `#F2F2F2` (nevel) | de lila vlakken verdwijnen (A5 uit lijst 39) |
| `--h-waas` | `#DCD5FF` | `#DDDDDD` (lijn) | idem |
| `--h-verloop-licht` | `#F1EEFF` | `#F2F2F2` (nevel) | idem; was tot 17 oktober een verloop |
| `--h-nacht` | `#2A0E8F` | `#000000` (zwart) | "geleverd" en de letters op mist zijn nu zwart |

Daarnaast `--kies` (= `--h-violet`) en `--kies-ink` (wit): wat een onderdeel
leest voor "wat je kiest". `--accent` is in de hal zwart, want dat is de kleur
van een knop.

---

## Waar violet staat, en waar niet

| Plek | Hoe |
|---|---|
| **De voet** (`.site-footer`) | Violet met een bewogen beeld (afvinklijst 42): het figuur als donkere stroom in het violet, `public/img/achter/voet.webp`, met fijne korrel. Zijn kaartvorm (12 px marge, één zachte hoek). Lopende tekst wit op 90 % (6,44:1), kleine koppen en kleine lettertjes wit op 82 % (5,44:1), links en koppen wit (7,81:1). Knoppen zwart, het veld van de Studiobrief en de sociale knoppen wit met zwart. Het woordmerk wit, de echo lila. De focusrand wit |
| **Het €1-blok** (`.h-proef`) | Een licht bewogen beeld (`glas-proef.webp`, Lucas' foto lifestyle-glow-05 met een lila spookrand) met de tekst op een paneel van **violet glas** (afvinklijst 42, glas 1): 84 % violet, 22 px vervaging, één zachte hoek, rechtsonder de snede van 53°. Het enige glas op de site. Op het glas alleen wit; het lichte deel van de kop wit op 82 %. De vier foto's staan recht. De focusrand wit |
| **Bestellen bovenin** (`.nav-cta`, en in de lade `.mobile-cta`) | Violet, onder de muis violet diep; de pijl violet in het witte rondje |
| **Wat je kiest** | Een aangevinkte keuze in een formulier: vakje en rondje (`accent-color`), de gekozen kaart, stijl, look, gezicht, vorm, kleur, verhouding, achtergrond, pakket, termijn en abonnement, en een gekozen andere achtergrond in het overzicht. Via `--kies` of `--h-violet` |
| **Tekstselectie** | Violet met witte letters, op de site, in Studio, op de privélink en in /admin |
| **Het logo** | De elektrische lijn onder de muis (`--mk-line-ink`) en de echo's van het woordmerk (`wm-echo`). Op violet is de lijn lila |

**Waar je bent is geen keuze.** Het menu-item van de pagina, een tab, een
filter, de stap in het formulier, de taal: zwart of wit, zoals daarvoor.

**Nergens anders.** Knoppen zijn zwart (onder de muis grijs 2), links zwart met
een grijze streep (de veldlijn), iconen, stippen, het sectienummer en de
schuine streep van het sectielabel zwart, de focusrand zwart (wit op violet).
Ook geen violet kopwoord meer: "productbeelden." in de opening is zwart.

---

## De statusset

Het gelukte pad loopt voller: een lijn, nevel met een lijn, zwart. Massief
blijft gereserveerd voor "geleverd". Een stand is geen keuze, dus geen violet.
De twee uitzonderingen verlaten de reeks met opzet.

| Stand | Vulling | Rand | Letter | Contrast |
|---|---|---|---|---|
| Wacht (ontvangen, wachtrij) | geen | `#8A8A8A` | `#3D3D3D` | 10,86:1 |
| Bezig (in productie, onderweg) | `#F2F2F2` | `#DDDDDD` | `#000000` | 18,76:1 |
| Klaar (geleverd, betaald) | `#000000` | gelijk | `#FFFFFF` | 21:1 |
| Aandacht (revisie, actie nodig) | `#F6E7D1` | `rgba(138,77,6,.30)` | `#8A4D06` | 5,49:1 |
| Geannuleerd, verlopen | `#E8E8E8` | `#8A8A8A` | `#3D3D3D` | 8,87:1 |

Tokennamen zoals altijd: `--st-wait-*`, `--st-work-*`, `--st-done-*`,
`--st-rev-*`, `--st-can-*` (fill, edge, ink). Buiten CSS: `STAND_KLEUR` in
`src/data/status.js` en `C.st*` in `src/lib/mailTemplate.js`.

**/admin donker** gebruikt dezelfde rollen zonder de inkttint van daarvoor:
grond `#0E0E0E`, kaart `#181818`, vlak `#212121`, letters `#F2F2F2` op 100 / 72 /
58 %. Een knop is daar wit (`#F2F2F2`) met zwarte letters (18,8:1), het
omgekeerde van de zwarte knop op licht. Bezig `#1E1E1E` met `#C8C8C8`, klaar
`#F2F2F2` met zwart.

---

## Waar het schema staat

| Plek | Bestand | Hoe |
|---|---|---|
| De site | `src/styles/hal.css` | `body.hal`: de hal-tokens (`--h-*`) en alle tokens van global.css opnieuw, op schema A. De voet en het €1-blok in hun eigen blok; onderaan "LEVERING 62" (het aangevinkte vakje) |
| De bestelstroom | `src/styles/werkplaats.css`, `stijl22.css`, de onderdelen in `src/components/order/` | de gekozen kaart, stijl, vorm en kleur violet via `--kies` |
| VISUAILS Studio | `src/styles/studio-hal.css` | de tokens in `body.studio.st-hal`, onderaan het aangevinkte vakje |
| De privélink (`/o/…`) | `public/portal.css` | blok "DE HAL" onderaan, op `html body` |
| De losse kaarten van account.js | `public/account.css` | blok "DE HAL" onderaan, op `html[data-thema="licht"] body` |
| /admin | `public/admin.css` | licht op `html:not([data-thema="donker"]) body`, donker op `html[data-thema="donker"] body` en het accent in `:root[data-thema="donker"]`; onderaan "LEVERING 62" |
| De mails | `src/lib/mailTemplate.js` (`C`) en de beelden in `public/img/mail/` | `npm run mail:assets` (scripts/make-mail-assets.mjs): het woordmerk zwart, het streepje onder de kop zwart, het woordmerk in de voet lichtgrijs |
| De factuur | `src/lib/invoicePdf.js` | `INK`, `MUTED`, `RULE`, `NADRUK` (zwart, was violet), `VLAK` |
| De fotogids (pdf) | `scripts/lib/fotogids-html.mjs` | `npm run handleiding` |
| De statuspil buiten CSS | `src/data/status.js` | `STAND_KLEUR` |
| Het deelplaatje | `scripts/make-og.mjs` | `npm run og` |
| De schetsen in het formulier | `scripts/schetsen-zijpaneel.py` | `python3 scripts/schetsen-zijpaneel.py` → `public/img/schets/` |
| De pijl in een keuzelijst | `public/img/ui/keuzepijl-000000.svg`, `-f2f2f2.svg` | een `data:`-adres kan geen variabele lezen |
| De adresbalk | `src/layouts/Layout.astro` | `theme-color` wit op een hal-pagina |
| Favicon | `public/favicon*.png`, `favicon.ico`, `favicon.svg`, `apple-touch-icon.png` | een kopie uit het logopakket (`images/Logo/visuails-logo-nieuw/favicon`), wit V-merk op vlak violet |
| Het logopakket | `E:\Claude (VISUAILS)\images\Logo\visuails-logo-nieuw` | `python3 maak-logopakket.py --site <map van de site>` maakt het hele pakket opnieuw, met zijn eigen KLEURENSCHEMA.md |

**Wat bewust niet meegaat.** De schermen van de laptop op de voorpagina
(`.sc…` in hal.css, de beelden uit `laptop-standen`) tonen de winkel van een
klant (JOUWMERK), niet VISUAILS: die houden hun eigen kleuren, en ze tellen mee
in de vingerafdruk van `scripts/lib/laptopbron.mjs`. Ook de kleuren die inhoud
zijn blijven staan: de achtergronden waaruit je kiest, kledingkleuren, het
blauw van Instagram in het voorbeeldscherm.

---

## De kleurentabel (oud → nieuw)

Elke oude kleur kreeg één nieuwe; `kladblok/levering-62/hexmap.py` paste hem toe
op elke letterlijke waarde (`#hex`, `rgb()`, `%23hex` in een `data:`-adres).
Een grijs met een zweem werd het grijs met **dezelfde helderheid**, zodat elk
contrast gelijk bleef. Violet werd zwart, behalve op de plekken hierboven.
In de hal-regels zelf ging het per rol (`kladblok/levering-62/herkleur.py`): violet zwart, een
violette hover op een zwarte knop grijs 2, mist en waas nevel en lijn (op een
hover een tree dieper: vak), lila in een onderstreping de veldlijn.

| Oud | Nieuw | Familie |
|---|---|---|
| `#F5F5F9` | `#F2F2F2` | neutraal |
| `#ECEBF3` | `#E8E8E8` | neutraal |
| `#DEDCE8` | `#DDDDDD` | neutraal |
| `#C9C6D8` | `#C8C8C8` | neutraal |
| `#8E8BA2` | `#8A8A8A` | neutraal |
| `#0F0C24` | `#000000` | neutraal |
| `#4B4960` | `#3D3D3D` | neutraal |
| `#6A6880` | `#616161` | neutraal |
| `#807E97` | `#6E6E6E` | neutraal |
| `#74728C` | `#6E6E6E` | neutraal |
| `#9C9AB0` | `#9C9C9C` | neutraal |
| `#F1EFF7` | `#F2F2F2` | neutraal |
| `#E6E4EF` | `#E8E8E8` | neutraal |
| `#E6E4EE` | `#E8E8E8` | neutraal |
| `#A3A1B5` | `#A3A3A3` | neutraal |
| `#A9A7B8` | `#A9A9A9` | neutraal |
| `#4C4960` | `#3D3D3D` | neutraal |
| `#858393` | `#858585` | neutraal |
| `#6F6D80` | `#6F6F6F` | neutraal |
| `#5B5872` | `#5B5B5B` | neutraal |
| `#5E5B75` | `#5E5E5E` | neutraal |
| `#A6A3BC` | `#A6A6A6` | neutraal |
| `#F4F2FB` | `#F2F2F2` | neutraal |
| `#EDE9FF` | `#F2F2F2` | neutraal |
| `#0F0C1C` | `#0E0E0E` | neutraal |
| `#18152A` | `#181818` | neutraal |
| `#221E38` | `#212121` | neutraal |
| `#F2F1F8` | `#F2F2F2` | neutraal |
| `#1F1C30` | `#1F1F1F` | neutraal |
| `#0A0815` | `#0A0A0A` | neutraal |
| `#F1EEFF` | `#F2F2F2` | neutraal |
| `#E7E2FF` | `#DDDDDD` | neutraal |
| `#DCD5FF` | `#DDDDDD` | neutraal |
| `#E4DFFF` | `#EDEDED` | neutraal |
| `#BFB2FF` | `#BCBCBC` | neutraal |
| `#C9BFFF` | `#C7C7C7` | neutraal |
| `#C9BDFF` | `#C5C5C5` | neutraal |
| `#1E1840` | `#1E1E1E` | neutraal |
| `#2A0E8F` | `#000000` | neutraal |
| `#1F0B66` | `#000000` | neutraal |
| `#4A1FFF` | `#000000`; waar violet blijft `#4400FF` | violet |
| `#3D17D6` | `#000000`; waar violet blijft `#3600CC` | violet |
| `#A694FF` | `#C8C8C8`; waar violet blijft `#8F66FF` | violet |
| `#6B4BFF` | `#000000`; waar violet blijft `#4400FF` | violet |
| `#F2F3F5` | `#F2F2F2` | vorig schema |
| `#E4E7EC` | `#E7E7E7` | vorig schema |
| `#DADEE5` | `#DEDEDE` | vorig schema |
| `#0C0D10` | `#0D0D0D` | vorig schema |
| `#14161A` | `#161616` | vorig schema |
| `#1C1F25` | `#1F1F1F` | vorig schema |
| `#7C8096` | `#818181` | vorig schema |
| `#4A4E6B` | `#505050` | vorig schema |
| `#83868A` | `#868686` | vorig schema |
| `#3E4145` | `#414141` | vorig schema |
| `#5B5F7A` | `#606060` | vorig schema |
| `#A7ABC7` | `#ACACAC` | vorig schema |
| `#1B1E23` | `#1E1E1E` | vorig schema |
| `#5C6066` | `#606060` | vorig schema |
| `#A0A4AA` | `#A4A4A4` | vorig schema |
| `#17191E` | `#191919` | vorig schema |
| `#15171C` | `#171717` | vorig schema |
| `#0A0B0E` | `#0B0B0B` | vorig schema |
| `#262A33` | `#2A2A2A` | vorig schema |
| `#34383F` | `#383838` | vorig schema |
| `#303236` | `#323232` | vorig schema |
| `#3A3E46` | `#3E3E3E` | vorig schema |
| `#AFB4BC` | `#B4B4B4` | vorig schema |
| `#EEF0F6` | `#F0F0F0` | vorig schema |
| `#F3F5F8` | `#F5F5F5` | vorig schema |
| `#1F2229` | `#222222` | vorig schema |
| `#55585F` | `#585858` | vorig schema |
| `#8A8F98` | `#8F8F8F` | vorig schema |
| `#F4F5F7` | `#F5F5F5` | vorig schema |
| `#E9EDEE` | `#ECECEC` | vorig schema |
| `#0E1013` | `#101010` | vorig schema |
| `#9BA1A8` | `#A0A0A0` | vorig schema |
| `#E8EAEC` | `#EAEAEA` | vorig schema |
| `#16181F` | `#181818` | vorig schema |
| `#0B0C0E` | `#0C0C0C` | vorig schema |
| `#1E1E24` | `#1F1F1F` | vorig schema |

---

## Altijd

1. Lopende tekst en knoppen minstens **4,5:1**, ook een kop. Tekst minstens 11,5 px.
2. **Violet alleen op de vier plekken** hierboven. Geen violet kopwoord, icoon, stip, link of rand.
3. Op violet staat alleen wit (of een witte knop met zwart erop). Zwart op violet haalt 2,69:1.
4. **Grijs zonder kleur.** Een nieuwe grijstint heeft drie gelijke kanalen.
5. Geen verloop als vulling, geen schaduw in een kleur. Een sfeervlak draagt een bewogen foto (hieronder), geen egale kleur en geen verloop.
6. Een stand is pil plus woord, in grijs en zwart; massief alleen voor "geleverd".
7. Het logo is één kleur: zwart, violet of wit. Lila alleen als echo. Woordmerk en los V-merk nooit naast elkaar (`scripts/brand-lockup-guard.mjs`).
8. Beweging stopt helemaal bij "minder beweging".
9. **Glas alleen op het €1-blok** (het violette paneel). Nergens anders, ook niet op kaarten (`tests/minder-sjabloon-browser.test.mjs`).

---

## Bewogen achtergronden (19 oktober 2026, afvinklijst 42)

Lucas: geen vlakken in één volle kleur, maar een afbeelding met motion blur. Elk
sfeervlak (waar eerst `--h-verloop-licht` stond) draagt een bewogen foto uit zijn eigen
shoots. Gemaakt met `scripts/maak-achtergronden.py` (numpy en Pillow), in
`public/img/achter/`; welk beeld waar staat in `src/styles/hal.css` onder
BEWOGEN ACHTERGRONDEN.

- **Sluiter** (je ziet een mens, strepen langs de beweging en een scherpere flits): waar
  een groot getal of lege ruimte is. **Stroom** (het figuur lost op): achter kaarten met
  tekst.
- **Licht:** de foto op nevel, de muur weggewerkt, kleuren buiten het violet naar grijs,
  62 % foto en 38 % nevel. Violet alleen als gloed: een vage, verschoven kopie langs het
  figuur.
- **Per soort pagina een eigen foto:** prijzen en abonnementen, contact, edities, Studio,
  home, 404, juridisch, over, merkmodel, uploadrichtlijnen, elke look, elke videostijl.
  Het €1-blok en de voet houden één vast beeld.
- **Korrel:** fijn, als laag in de achtergrond (`--h-korrel-fijn`, 16 %, overlay), niet
  in het beeld. Een beeld weegt zo 10 tot 30 KB.
- **Telefoon en kleine tablet** (tot 820 px): in een klein vlak het beeld rechtsboven in
  de hoek (62 % van de hoogte), in een lang vlak als strook van 180 px bovenaan met de
  inhoud eronder (192 tot 212 px ruimte bovenin, per vlak gemeten). De samenvatting in het
  bestelformulier heeft op elke breedte een strook van 160 px. In een band (`.h-st-band`)
  ligt het beeld tot 1180 px over de volle breedte bovenaan.
- **Blijft vlak:** kaarten om te lezen (FAQ, stappen, prijskaarten, tabellen),
  formulieren, de putten achter foto's en video, de laptopschermen van de klantshop,
  Studio, de privélink, /admin en de mails.
- **Contrast:** elke regel tekst gemeten tegen de pixels die er echt achter staan, op
  85 pagina's en 8 breedtes van 390 tot 1440: 1648 metingen, de laagste 4,56:1
  (`kladblok/levering-62/meting-achter.json`). De lichte helft van een kop is op een
  beeld grijs 3 (`#616161`).

## Het merk op elke plek (19 oktober 2026)

| Plek | Merk | Kleur |
|---|---|---|
| Bovenbalk en lade van de site | het V-merk, met de glitch | zwart; de lijn violet |
| Footer van de site | het woordmerk, en groot onderaan | wit op violet; de lijn lila |
| De voorbeeldschermen (/studio, /how-it-works) | het woordmerk in de balk | zwart |
| Studio, de privélink, /admin | het woordmerk | zwart; de lijn violet (op donker lila) |
| De mail | het woordmerk als beeld (`woordmerk-plaat.png`, `woordmerk-inkt.png`) | zwart op wit |
| De factuur en de fotogids | het woordmerk als vector | zwart |
| Favicon | het V-merk | wit op vlak violet |
| Deelplaatje | het woordmerk, met de kop van de voorpagina | zwart op wit |

---

# Het schema van de hal (14 – 18 oktober 2026)

Hieronder het schema zoals het gold van 14 tot en met 18 oktober: inkt `#0F0C24`,
violet `#4A1FFF`, lila vlakken en mist. Het blijft staan als geschiedenis.

### Waar het schema staat

| Plek | Bestand | Hoe |
|---|---|---|
| De site | `src/styles/hal.css` | `body.hal`: de hal-tokens (`--h-*`) én alle tokens van global.css opnieuw, op het hal-palet. Een afgeleide token volgt niet vanzelf (zie de noot daar), dus elke naam staat er |
| VISUAILS Studio | `src/styles/studio-hal.css` | `body.studio.st-hal`; Studio is sinds 14 oktober alleen licht en heeft geen schakelaar naar de vorige vormgeving meer |
| De privélink (`/o/…`) | `public/portal.css` | blok "DE HAL" onderaan, op `html body` |
| De losse kaarten van account.js | `public/account.css` | blok "DE HAL" onderaan, op `html[data-thema="licht"] body` |
| /admin | `public/admin.css` | blok "DE HAL" onderaan: licht op `html:not([data-thema="donker"]) body`, donker op `html[data-thema="donker"] body`, en de vorm (zijbalk, knoppen, velden, kaarten, etiketten) voor allebei |
| De mails | `src/lib/mailTemplate.js` | `C` en de kop (het woordmerk als beeld) |
| De statuspil buiten CSS | `src/data/status.js` | `STAND_KLEUR` |
| Het deelplaatje | `scripts/make-og.mjs` | `npm run og` |
| De letter op de Worker-pagina's | `scripts/fonts-voor-worker.mjs` | Urbanist in `/fonts/gedeeld.css` |
| De adresbalk | `src/layouts/Layout.astro` | `theme-color` wit op een hal-pagina |
| Favicon | `public/favicon.svg`, `scripts/make-favicons.mjs` | wit V-merk op violet |

---

### De kleuren (contrast nagerekend, WCAG)

| Rol | Waarde | Token in hal.css | Contrast |
|---|---|---|---|
| Grond | `#FFFFFF` | `--h-wit` | — |
| Nevel (kaart, footer, tweede laag) | `#F5F5F9` | `--h-nevel` | — |
| Vak (beeldvak, lege staat) | `#ECEBF3` | `--h-vak` | — |
| Haarlijn | `#DEDCE8` | `--h-lijn` | — |
| Inkt (koppen, knoppen) | `#0F0C24` | `--h-inkt` | 19,1:1 op wit |
| Inkt 2 (tekst) | `#4B4960` | `--h-inkt-2` | 8,7:1 op wit · 8,0:1 op nevel |
| Inkt 3 (klein) | `#6A6880` | `--h-inkt-3` | 5,4:1 op wit · 4,95:1 op nevel · 4,54:1 op vak — niet op glas |
| Kop-licht | `#807E97` | `--h-kop-licht` | 3,9:1 — **alleen in koppen van 32 px of groter** |
| Violet (actie) | `#4A1FFF` | `--h-violet` | wit erop 7,2:1 |
| Violet diep (hover, link) | `#3D17D6` | `--h-violet-diep` | wit erop 9,2:1 |
| Nacht (slotbeeld, "geleverd") | `#2A0E8F` | `--h-nacht` | wit erop 13,5:1 |
| Lila (verloop) | `#A694FF` | `--h-lila` | inkt erop 7,6:1 |
| Waas (verloop) | `#DCD5FF` | `--h-waas` | inkt erop 13,7:1 |
| Mist (label, actief) | `#F1EEFF` | `--h-mist` | nacht erop 11,8:1 · inkt 16,8:1 |

#### Twee afgeleide lijnen (14 oktober 2026)

Niet in het plan, wel nodig. Allebei uit de lijn, in dezelfde toon.

| Rol | Waarde | Token | Waar |
|---|---|---|---|
| Lijn, sterk | `#C9C6D8` | `--h-lijn-sterk` (`--line-strong`) | een rand die je moet zien: de tweede knop, een rand bij hover |
| Veldlijn | `#8E8BA2` | `--h-veldlijn` (`--line-ui`) | de rand van een invulveld: 3,3:1 op wit, boven de 3:1 die een veldgrens nodig heeft |

Hier stonden eerst vier verschillende waarden voor hetzelfde (`#CFCCDD`,
`#B4B1C6`, `#C9C6D8`, `#8E8BA2`); `#B4B1C6` haalde voor een invulveld maar 2,0:1.

#### De statusset in de hal

Het gelukte pad loopt voller **in de eigen familie**: een lijn, mist, nacht.
Massief blijft gereserveerd voor "geleverd". De twee uitzonderingen verlaten de
familie met opzet.

| Stand | Vulling | Rand | Letter | Contrast |
|---|---|---|---|---|
| Wacht (ontvangen, wachtrij) | geen | `#8E8BA2` | `#4B4960` | 8,7:1 |
| Bezig (in productie, onderweg) | `#F1EEFF` | `#DCD5FF` | `#2A0E8F` | 11,8:1 |
| Klaar (geleverd, betaald) | `#2A0E8F` | gelijk | `#FFFFFF` | 13,5:1 |
| Aandacht (revisie, actie nodig) | `#F6E7D1` | `rgba(138,77,6,.30)` | `#8A4D06` | 5,49:1 |
| Geannuleerd, verlopen | `#ECEBF3` | `#8E8BA2` | `#4B4960` | 7,3:1 |

Tokennamen zoals altijd: `--st-wait-*`, `--st-work-*`, `--st-done-*`,
`--st-rev-*`, `--st-can-*` (fill, edge, ink).

#### Verlopen, korrel en glas

| | Waarde | Waar |
|---|---|---|
| Verloop licht | `radial-gradient(120% 90% at 75% 15%, #DCD5FF 0%, #F1EEFF 42%, #FFFFFF 100%)` | sfeervlakken, de "meer weten"-kaart, het scherm op /studio |
| Verloop violet | `radial-gradient(110% 130% at 85% 0%, #6B4BFF 0%, #4A1FFF 38%, #2A0E8F 100%)` | alleen het slotbeeld (de proef van €1) |
| Korrel | `--h-korrel` (SVG-ruis), 16 % in overlay | alleen op verlopen en sfeervlakken |
| Glas | wit 74 %, blur 16–24 | alleen boven een beeld; tekst erop alleen inkt (15,8:1) of inkt 2 (7,2:1) |
| Zweefschaduw | `0 30px 60px -30px rgba(15,12,36,.28)` | één, onder kaarten en glas boven beeld |

#### De vorm

Vlak 40 · kaart 28–36 · wat in een kaart ligt 22 · beeld 16–22 · knop, pil en
eenregelig veld rond (999). Een tekstvak 16–18.

---

### Altijd in de hal

1. Lopende tekst en knoppen minstens **4,5:1**, koppen van 24 px of groter minstens 3:1. Tekst minstens 11,5 px.
2. **Kop-licht** alleen in koppen van 32 px of groter.
3. **Vlak violet alleen voor een actie.** Waar je bent (een menu-item, een filter) is een toestand: inkt of wit. Violet als licht: hoogstens één sfeervlak per scherm, met korrel. Geen gekleurde zijrand.
4. Op het violette slotbeeld alleen wit. Op glas altijd inkt of inkt 2, glas minstens 74 % wit.
5. Korrel alleen op verlopen en sfeervlakken, nooit op een product, logo, icoon of glas.
6. Hoogstens drie glaslagen tegelijk in beeld.
7. Het logo blijft één kleur (inkt, violet of wit); het woordmerk en het losse V-merk staan nooit naast elkaar (`scripts/brand-lockup-guard.mjs` controleert dat bij elke build).
8. Beweging is rustig en stopt helemaal bij "minder beweging". Geen bedragen die optellen.

---

### Het merk op elke plek (14 oktober 2026)

| Plek | Merk | Kleur |
|---|---|---|
| Bovenbalk en lade van de site | het V-merk (`VMerk.astro`), met de glitch | inkt |
| Footer van de site | het woordmerk, en groot in het verloop | inkt · lila → nevel |
| De voorbeeldschermen (/studio, /how-it-works) | het woordmerk in de balk van het scherm | inkt |
| Studio, zijbalk open | het woordmerk | inkt |
| Studio, zijbalk dicht | de V: het woordmerk afgeknipt tot zijn eerste letter, met een view transition ertussen | inkt |
| De privélink, de losse kaarten | het woordmerk, inline | inkt |
| De mail | het woordmerk als beeld (`public/img/mail/woordmerk-inkt.png`, `npm run mail:assets`) | inkt op wit |
| Favicon | het V-merk | wit op violet |
| Deelplaatje | het woordmerk, met de kop van de voorpagina | inkt op wit |

---

### Nog open

- **Niets meer in de hal zelf.** Afgehandeld op 14 oktober 2026:
  - Studio is alleen nog licht (afvinklijst 26); het maantje en `vis_thema` zijn
    weg uit Studio.
  - /admin staat in de hal, licht én donker: Urbanist, het getekende woordmerk,
    een nevelgrijze zijbalk met een witte pil voor waar je bent, ronde knoppen en
    velden, kaarten van 22 px, etiketten zonder kapitalen. Het donkere thema van
    /admin gebruikt dezelfde rollen in een inkttint: grond `#0F0C1C`, kaart
    `#18152A`, vlak `#221E38`, inkt `#F2F1F8` op 100 / 72 / 58 %. Het lichte
    violet `#A694FF` en de donkere statusset blijven zoals hieronder.
    Gemeten met `kladblok/admin-kiek.mjs` (6 schermen, licht en donker, 1440 en
    390 px): geen tekst onder 4,5:1.
  - De favicon-PNG's (16–512, apple-touch-icon, favicon.ico) zijn herkleurd naar
    wit, met hun vierkante tegel. `scripts/make-favicons.mjs` is daarvoor niet
    gebruikt (die maakt ronde tegels).
- **Het vorige schema** hieronder is nu alleen nog geschiedenis: de losse
  kaarten van account.js staan altijd licht (Studio is alleen licht), en het
  donkere /admin heeft de inkttint hierboven.

---

# Het vorige schema (20 september – 13 oktober 2026)

Hieronder staat het schema zoals het tot 14 oktober gold buiten de hal. Het
blijft staan als geschiedenis.

## De grond

| Rol | Waarde | Token | Waar |
|---|---|---|---|
| Lichte grond | `#F2F3F5` | `--paper` | De pagina zelf, Studio licht. Koel en neutraal — **niet warm**, niet puur wit |
| Tweede trede | `#E4E7EC` | `--surface` | Kaarten, kopbalken, tabelkoppen |
| Verdiept | `#DADEE5` | `--sunken` | Invulvelden, lege staten |
| Inkt | `#000000` | `--ink` | Alle letters en alle lijnen. Puur zwart, niet `#111111` |
| Letter, tweede trede | `rgba(0,0,0,.66)` | `--ink-2` | Lopende tekst · 6,95:1 |
| Letter, derde trede | `rgba(0,0,0,.56)` | `--ink-3` | Labels, onderschriften, microcopy · 4,81:1 — de laatste trede die nog letter mag zijn |
| Lijn | `rgba(0,0,0,.20)` | `--line` | Scheidingen. **Lijnen, nooit letters** |
| Lijn, zacht | `rgba(0,0,0,.10)` | `--line-soft` | Rijen binnen een tabel |
| Donker paneel | `#000000` | `--panel` | De zwarte band, de footer, de bovenbalk |
| Letter op paneel | `#F2F3F5` | `--on-panel` | — |

> De grond is bewust **koel**. Een warme of gebroken-witte grond in combinatie
> met violet leest als een beautymerk; dat is een andere categorie dan waar je
> in wilt zitten.

### Donkere modus (Studio, portaal, admin)

| Token | Waarde |
|---|---|
| `--paper` | `#0C0D10` |
| `--surface` | `#14161A` |
| `--sunken` | `#1C1F25` |
| `--ink` | `#F2F3F5` |
| `--ink-2` | `rgba(242,243,245,.72)` |
| `--ink-3` | `rgba(242,243,245,.55)` |
| `--line` | `rgba(242,243,245,.20)` |
| `--line-soft` | `rgba(242,243,245,.11)` |

Studio start standaard licht; donker is een keuze van de klant.

---

## Het violet — één familie

| Token | Licht | Donker | Rol | Contrast |
|---|---|---|---|---|
| `--accent` | **`#4A1FFF`** | `#A694FF` | De vulling: knoppen, links | 7,16:1 met witte letter |
| `--on-accent` | `#FFFFFF` | `#000000` | Wat OP het violet staat | — |
| `--accent-text` | `#3D17D6` | `#A694FF` | Het violet als LETTER op de grond | 8,25:1 |
| `--accent-tint` | `#E4DFFF` | `#1E1840` | Zacht accentvlak — **hoogstens één per scherm** | — |
| `--on-accent-tint` | `#2A0E8F` | `#A694FF` | Letter op die tint | 10,46:1 |

Anders dan het geel is het violet **wél een letterkleur op licht**. Waar vroeger
"het accent als tekst" terugviel op inkt, mag het nu gewoon violet zijn.

---

## De statuskleuren

Vijf toestanden. Het gelukte pad blijft in de violetfamilie en **loopt voller**
naarmate de bestelling vordert: leeg → getint → massief. De twee uitzonderingen
verlaten de familie. Omdat de reeks tegelijk van licht naar donker loopt, werkt
hij ook in grijswaarden en voor wie kleurenblind is.

### Het gelukte pad

| Status | Vulling | Rand | Letter | Contrast |
|---|---|---|---|---|
| **Ontvangen** | geen | `#7C8096` | `#4A4E6B` | 7,29:1 |
| **In productie** | `#E4DFFF` | `rgba(61,23,214,.30)` | `#3D17D6` | 7,11:1 |
| **Geleverd** | `#1F0B66` | gelijk aan de vulling | `#FFFFFF` | 16,18:1 |

### De uitzonderingen — altijd getint, nooit massief

| Status | Vulling | Rand | Letter | Contrast |
|---|---|---|---|---|
| **Revisie gevraagd** | `#F6E7D1` | `rgba(138,77,6,.30)` | `#8A4D06` | 5,49:1 |
| **Geannuleerd** | `#E4E7EC` | `#83868A` | `#3E4145` | 8,28:1 |

### Donkere modus

| Status | Vulling | Rand | Letter | Contrast |
|---|---|---|---|---|
| Ontvangen | geen | `#5B5F7A` | `#A7ABC7` | 8,60:1 |
| In productie | `#1E1840` | `rgba(166,148,255,.34)` | `#A694FF` | 6,59:1 |
| Geleverd | `#A694FF` | gelijk | `#000000` | 8,30:1 |
| Revisie gevraagd | `#2B1D0A` | `rgba(233,150,59,.34)` | `#E9963B` | 6,93:1 |
| Geannuleerd | `#1B1E23` | `#5C6066` | `#A0A4AA` | 6,67:1 |

In de donkere modus keert de reeks om: daar is "vol" juist de lichtste stand.
De logica blijft dezelfde — vol = klaar.

> **Geannuleerd is grijs, niet rood.** Een geannuleerde bestelling is niet
> gevaarlijk, hij is dood; de afwezigheid van kleur zegt dat preciezer. Wil je
> toch rood, gebruik dan licht `#F4DDDA` / `#A32117` en donker `#2B120E` /
> `#F08A7E`. Verander het dan overal tegelijk.

### Tokennamen

Neutraal gehouden, zodat ze ook op facturen, abonnementen en in het
adminportaal kloppen:

```
--st-wait-fill / -edge / -ink    ontvangen, in de wachtrij, factuur opgesteld
--st-work-fill / -edge / -ink    in productie, betaling onderweg, model in briefing
--st-done-fill / -edge / -ink    geleverd, betaald, abonnement actief
--st-rev-fill  / -edge / -ink    revisie gevraagd, actie nodig
--st-can-fill  / -edge / -ink    geannuleerd, verlopen, terugboeking, creditnota
```

---

## De vorm

| Token | Waarde | Waar |
|---|---|---|
| `--r-pill` | `999px` | Knoppen, chips, statuslabels, eenregelige invoervelden |
| `--r-card` | `12px` | Kaarten, panelen, beelden, modale vensters |
| `--r-field` | `10px` | Tekstvakken, selects, uploadvlakken |

---

## De strengheidsregels

**Dit is het belangrijkste deel van dit bestand.** Violet is niet zeldzaam; de
manier waarop het wordt toegepast bepaalt of een site als studio of als
dashboard leest. Zonder deze regels is het kleurenschema waardeloos.

### Nooit

1. **Geen verloop** — nergens, ook niet subtiel, ook niet in de hero. Een
   verloop van violet naar blauw is de sterkste tell die er is.
2. **Geen gloed en geen schaduw** in de accentkleur.
3. **Geen lavendel vlakken** als achtergrond van een sectie of kaart. De tint
   is voor een statuslabel, niet voor een oppervlak.
4. **Violet nooit als grote vulling** — geen violette hero, geen violette band
   over de breedte.
5. **Geen violet in iconen.** Die zijn zwart, of ze bestaan niet.
6. **Geen glans of verloop in het logo.** Eén kleur, één vorm.

### Altijd

1. **Violet op maximaal 2% van een scherm**: één knop, of één woord in een kop.
   Niet allebei in dezelfde sectie.
2. **Violet is alleen voor actie.** Knoppen, links, één kopwoord. Alles wat een
   toestand is, gebruikt de statusset; die twee rollen lopen nooit door elkaar.
3. **De foto's zijn het grootste gekleurde object op elke pagina**, niet de
   interface. Dat is in één blik het verschil tussen een studio en een tool.
4. **Alles wat geen actie is, is zwart of inkt.**
5. **Diepte komt uit een lijn of een tweede vlak**, nooit uit een schaduw.
6. **Een status is altijd pil plus woord**, nooit kleur alleen.
7. **Massief is gereserveerd voor "geleverd".** Geen andere status krijgt een
   volle vulling.
8. **Op violet staat wit** (licht) of **zwart** (donker). Nooit andersom.
9. **Rood is voor mislukt, nooit voor een waarschuwing.** Die is oranje.
10. **Geen zesde status.** Bij zes wordt kleur betekenisloos.

---

## Logopakket

`E:\Claude (VISUAILS)\images\Logo\visuails-logo\mercury-hard` — herkleurd uit
`svg/visuails-mark-groen.svg` van het bestaande pakket. Beide paden en de
viewBox zijn letterlijk overgenomen; alleen `fill` verschilt. De vorm is niet
aangeraakt.

| Inkt | Waarde |
|---|---|
| violet | `#4A1FFF` |
| violet-licht | `#A694FF` |
| zwart | `#000000` |
| wit | `#F2F3F5` — de grond van het schema, bewust niet `#FFFFFF` |

**Welk bestand waar:**

| Plek | Bestand |
|---|---|
| Bovenbalk op licht | `png-transparant/visuails-mark-violet-512.png` of de SVG |
| Bovenbalk op het zwarte paneel | `visuails-mark-wit-512.png` |
| Studio donker | `visuails-mark-violet-licht-512.png` |
| Factuur, drukwerk in één kleur | `visuails-mark-zwart-*` |
| Sociale profielen | `png-tegel/visuails-tegel-wit-op-violet-512-vierkant.png` |
| OG-beeld | dezelfde tegel, 1024 |

De tegels hebben **alleen de `-vierkant`-variant**: platforms ronden zelf af,
en een tegel is geen knop.

### Acht combinaties geleverd, acht afgekeurd

Geleverd: violet op wit (6,45:1), wit op violet (6,45:1), zwart op wit
(18,91:1), wit op zwart (18,91:1), violet-licht op zwart (8,30:1), zwart op
violet-licht (8,30:1), violet op surface (5,78:1), zwart op surface (16,94:1).

Afgekeurd onder 3,0:1 — daar verdwijnt de dunne punt van de V op klein
formaat: zwart op violet (2,93:1), violet op zwart (2,93:1), violet op
violet-licht (2,83:1) en omgekeerd, violet-licht op wit (2,28:1) en omgekeerd,
violet-licht op surface (2,04:1), wit op surface (1,12:1).

> **Let op bij de favicon.** `zwart op violet` is de directe vertaling van het
> huidige icoon (bijna-zwart op gifgroen) en haalt het niet. Het nieuwe icoon is
> **wit op violet** (6,45:1). Alternatief: **violet-licht op zwart** (8,30:1),
> dat aansluit op Studio donker.

```html
<link rel="icon" href="/favicon.ico" sizes="any">
<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32.png">
<link rel="icon" type="image/png" sizes="16x16" href="/favicon-16.png">
<link rel="apple-touch-icon" sizes="180x180" href="/favicon-180.png">
<meta name="theme-color" content="#4A1FFF">
```

**Nog niet meegenomen:** het woordmerk (staat niet in die map) en de
contourvariant (twee kleuren in zich, komt uit een aangeleverde afbeelding in
plaats van uit het pad). Allebei krijgen dezelfde behandeling zodra ze er zijn.
De staande regel blijft: woordmerk en beeldmerk nooit samen.

`mercury-hard/maak-logopakket.py` regenereert het hele pakket. Schuif je aan de
kleuren, draai dat script dan opnieuw in plaats van bestanden met de hand aan
te passen — dat is precies waar het oude pakket op afdreef.

---

## Alle tokens

```css
:root[data-mode="licht"] {
  --paper:#F2F3F5;  --surface:#E4E7EC;  --sunken:#DADEE5;
  --ink:#000000;    --ink-2:rgba(0,0,0,.66);  --ink-3:rgba(0,0,0,.56);
  --line:rgba(0,0,0,.20);  --line-soft:rgba(0,0,0,.10);
  --panel:#000000;  --on-panel:#F2F3F5;

  --accent:#4A1FFF;       --on-accent:#FFFFFF;
  --accent-text:#3D17D6;  --accent-tint:#E4DFFF;  --on-accent-tint:#2A0E8F;

  --st-wait-fill:transparent; --st-wait-edge:#7C8096;             --st-wait-ink:#4A4E6B;
  --st-work-fill:#E4DFFF;     --st-work-edge:rgba(61,23,214,.30);  --st-work-ink:#3D17D6;
  --st-done-fill:#1F0B66;     --st-done-edge:#1F0B66;              --st-done-ink:#FFFFFF;
  --st-rev-fill:#F6E7D1;      --st-rev-edge:rgba(138,77,6,.30);    --st-rev-ink:#8A4D06;
  --st-can-fill:#E4E7EC;      --st-can-edge:#83868A;               --st-can-ink:#3E4145;

  --r-pill:999px; --r-card:12px; --r-field:10px;
}

:root[data-mode="donker"] {
  --paper:#0C0D10;  --surface:#14161A;  --sunken:#1C1F25;
  --ink:#F2F3F5;    --ink-2:rgba(242,243,245,.72);  --ink-3:rgba(242,243,245,.55);
  --line:rgba(242,243,245,.20);  --line-soft:rgba(242,243,245,.11);
  --panel:#000000;  --on-panel:#F2F3F5;

  --accent:#A694FF;       --on-accent:#000000;
  --accent-text:#A694FF;  --accent-tint:#1E1840;  --on-accent-tint:#A694FF;

  --st-wait-fill:transparent; --st-wait-edge:#5B5F7A;               --st-wait-ink:#A7ABC7;
  --st-work-fill:#1E1840;     --st-work-edge:rgba(166,148,255,.34);  --st-work-ink:#A694FF;
  --st-done-fill:#A694FF;     --st-done-edge:#A694FF;                --st-done-ink:#000000;
  --st-rev-fill:#2B1D0A;      --st-rev-edge:rgba(233,150,59,.34);    --st-rev-ink:#E9963B;
  --st-can-fill:#1B1E23;      --st-can-edge:#5C6066;                 --st-can-ink:#A0A4AA;
}
```

---

## Studio, privélink en /admin — herontwerp 3 oktober 2026

Lucas: *"een volledige front-end redesign van elke tab in VISUAILS Studio (…)
teksten voelen te groot en het voelt uit proportie op meerdere plekken"*, met
een donkere zijbalk "volgens het VISUAILS kleurenschema" en het violet
spaarzaam. Wat er voor deze drie werkschermen bij komt:

| Rol | Licht | Donker | Waar |
|---|---|---|---|
| Grond | `#F2F3F5` (`--paper`) | `#0C0D10` | De pagina |
| Kaart | `#FFFFFF` | `#14161A` | Elk blok. **De enige plek waar puur wit een vlak is** — "wit bewust niet #FFFFFF" hierboven gaat over het logo |
| Vulling in een kaart | `#F4F5F7` | `#1C1F25` | Een tweede laag binnen een kaart, nooit een tweede kader |
| Haarlijn | `rgba(0,0,0,.09)` | `rgba(242,243,245,.10)` | Rand van een kaart, rijen |
| Lijn, sterk | `rgba(0,0,0,.18)` | `rgba(242,243,245,.20)` | Secundaire knop, velden |
| Zijbalk | `#0C0D10` | `#000000` (`--panel`) | Studio en /admin; letter `--on-panel` op 70 %, actief item 11 % wit |

De hoek van een kaart is **10 px**, van een knop, veld of tegel **8 px**; een
statuspil blijft een pil. *(Vervangen op 25 oktober 2026: zie "De hoeken" bovenaan.)* Het actieve menu-item is een witte tint en geen violet
("waar je bent" is een toestand, "Altijd 2"). Letters: alleen Figtree, in gewone
zinsbouw; kleine kapitalen alleen voor etiketten bij data (cijfertegels,
kolomkoppen).

---

## Geschiedenis

- tot aug 2026: Harbor (teal) → lime `#C6F100`
- 5 sep 2026: Komma-geel `#DEDA14`, dezelfde avond `#C8F206`
- 6 sep 2026: `#D2E04A`-familie, gemeten in de Komma-beelden
- **20 sep 2026: violet `#4A1FFF`.** Het geel eruit, inkt van `#111111` naar
  puur zwart, en voor het eerst een echte statusset in plaats van losse kleuren
  per scherm. Aanleiding: het geel dwong "accent als letter" terug naar inkt,
  en er was geen systeem voor bestelstatussen terwijl Studio, het portaal en
  admin er allemaal een nodig hebben. Onderweg getest en verworpen: warme en
  gebroken-witte gronden (leest als beautymerk), donkere gronden (verlaagt de
  waargenomen prijs en botst met catalogbeelden op wit), en accenten in rood,
  oranje, geel, magenta en groen.
- 14 okt 2026: de hal. Inkt `#0F0C24` met een violette zweem, lila vlakken (mist
  `#F1EEFF`, waas `#DCD5FF`), verlopen en korrel, en nacht `#2A0E8F` voor "geleverd".
- **19 okt 2026: schema A** (afvinklijst 41). Wit, zwart en één elektrisch violet
  `#4400FF`, zoals Ovyon het blauw laat schreeuwen; Lucas, lijst 39: *"het paars moet
  echt pijn doen"*. Het grijs zonder lila, de inkt puur zwart, knoppen zwart, de lila
  vlakken weg, violet alleen in de voet, het €1-blok, Bestellen en wat je kiest.
  Getest en niet gekozen: B (de inkt `#0F0C24` houden met ultraviolet `#5B00FF`) en
  C (A met grote violette vlakken op /pricing en /plans).

---

## Nagekeken: gronden, schaduwen en grijstinten — 20 september 2026

Lucas: *"Controleer of de achtergrond fotos met schaduw en grijze tinten (ook op
de style pagina's) nog wel in het kleurenschema zitten."*

Gemeten in de browser op 120 pagina's, met `kladblok/_schaduwmeet.mjs` (elke
niet-`inset` slagschaduw), `kladblok/_grondkleur.mjs` (de eigen kleur van een
beeldbestand) en `kladblok/_vlek.mjs` (de rand van een foto tegenover de grond
eromheen).

### Wat de meting vond, en wat eraan gedaan is

**Zeven echte slagschaduwen** — onscherpe diepte, verboden door "Altijd 5"
(*diepte uit een lijn of een tweede vlak, nooit uit een schaduw*). Allemaal
overblijfselen van de donkere site, waar een zwarte wolk onder een blok nog
ergens op sloeg:

| Waar | Stond | Staat |
| --- | --- | --- |
| `.sr-card` (de fotostapels, stijlpagina's) | `0 16px 34px -20px rgb(0 0 0 / .7)` | haarlijn `rgb(0 0 0 / .17)` |
| `.nt-pop` (de notities) | `0 18px 40px -20px rgb(0 0 0 / .75)` | vlak `5px 5px 0 0` |
| `.uitleg-paneel` | `0 8px 28px rgb(0 0 0 / .12)` | vlak `5px 5px 0 0` |
| `.cc` (de cookiebalk) | `0 -18px 40px -20px rgb(0 0 0 / .7)` | alleen de bovenlijn |
| `.fb-frame` (FigBoard) | `0 30px 70px -30px rgb(0 0 0 / .8)` | alleen de lijn |
| `.fgt-frame` (FigGate) | `0 30px 70px -30px rgb(0 0 0 / .8)` | alleen de lijn |
| `.lift` / `.ed-vgl-col` / `.guide-card` | drie lagen tot `0 14px 30px -18px` | `inset 0 0 0 1px` |

Wat overblijft na de ingreep is óf `inset` (randsimulatie, en dat staat dit
bestand toe) óf een vlak met nul onscherpte — `.nav-menu`, `.cmp-knob`,
`.cmp-divider` en de twee nieuwe. Dat is geen schaduw maar een verschoven kopie
van de vorm: het tweede vlak dat "Altijd 5" juist aanwijst. Eén idioom voor
alles wat op deze site boven de pagina hangt.

**Eén violette gloed.** `.sr-fan::before` legde onder elke fotostapel op de
stijlpagina's een radiaal verloop in de accentkleur van 4:3 groot, 34px
onscherp. Drie regels tegelijk: "Nooit 1" (geen verloop), "Nooit 2" (geen gloed
in de accentkleur) en "Nooit 4" (violet nooit als grote vulling). Eraf.

**Eén violette statusring.** `.fd-step.is-now .fd-dot` — "waar je nu staat" in
de tijdlijn — was een violette stip met een ring van 22% violet. Dat is zowel
de gloed van "Nooit 2" als de verwisseling die "Altijd 2" verbiedt: violet is
voor actie, een toestand hoort in de statusset. Nu `--st-work-ink`.

**Eén achtergrondfoto met het verkeerde wit.** `grond-muur.webp` (de hero van de
voorpagina) is op 18 september op het toenmalige wit gezet en stond dus nog op
`#EBEBEB`, *lean 0* — neutraal grijs, terwijl elke grond van dit schema koel
leunt (`--paper` +3, `--surface` +8, `--sunken` +11). Zeven punten donkerder en
een halve graad warmer dan de pagina eromheen: precies de klacht van 17
september (*"De achtergrond kleur is een ander wit dan wat het moet zijn"*),
teruggekomen via een beeldbestand.

Het beeld is niet vervangen maar hergeschaald: elke pixel is `--paper` maal zijn
eigen luminantie. De lichtste pixel is daarmee exact `#F2F3F5`, de plooi zakt
tot `#DCDDDF` (de diepte die de foto zelf had) en de hele plaat leunt nu koel
(+4, gemiddelde op Δ3 van `--surface`). De vorm van de muur is niet aangeraakt.

### Wat NIET aangepast is, en waarom

**De productbeelden zelf.** De geleverde voorbeelden hebben hun eigen wit, en
dat is een besluit over het product en niet over de interface — zie de open
punten hieronder. Dit bestand zegt in "Altijd 3" met zoveel woorden dat de
foto's het grootste gekleurde object op elke pagina horen te zijn; ze
gelijktrekken met de paginagrond zou dat juist ongedaan maken. Wat er speelt is
iets anders: ze zijn onderling niet gelijk.

**`.lime-panel` in `global.css`.** Draagt nog een olijfgroene grond (`#2A3412`)
en twee ongebruikte beelden (`sub-beam-2400/1400`, samen 209 kB in `dist/`),
maar de klasse staat in geen enkele markup — dode CSS uit het limoentijdperk.
Buiten beeld, dus geen schemafout; wel gewicht. Zie de open punten.
