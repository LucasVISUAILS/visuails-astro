# Ruimte en rust — het indelingssysteem van VISUAILS

**Opgesteld 27 oktober 2026 (levering 78), op Lucas' vraag van 16:50:** *"creëer een heel systeem die je
consistent kan volgen voortaan wanneer ik zeg dat de nieuwe style goed is."* Eerst op de voorpagina.
Zodra Lucas de nieuwe stijl goedkeurt, geldt dit voor elke pagina. Kleuren blijven die van
`docs/KLEURENSCHEMA.md`, letters die van `docs/DESIGN.md` ("De letters van de hal").

---

## 0 · Waar het vandaan komt

Lucas: *"het voelt nu zo generiek alle plekken"*. Gemeten op de voorpagina van 77: elke sectie had
hetzelfde sjabloon. Een mono-label met een nummer ("/ 02 WAT WE MAKEN"), een kop in twee tonen, één
beeld met een smalle kolom ernaast, links of rechts. Hoe het werkt bestond uit drie gelijke kaarten,
alles stond strak op dezelfde lijn, en elke sectie had even veel lucht.

Wat een indeling generiek of "AI-achtig" maakt (onderzoek van 27 oktober; bronnen onderaan):
1. **Hetzelfde sjabloon in elke sectie**: label boven de kop, kop, zin, knop, steeds even groot.
   Het oog leest het ritme voordat het de inhoud leest.
2. **Een nummer en een label in hoofdletters boven elke sectie** (01 · 02 · 03): bij Krebs (1.590 pagina's gescoord) een van de vaste kenmerken.
3. **Drie gelijke kaarten op een rij**, elk met een icoon bovenaan.
4. **Overal dezelfde ruimte**: dezelfde padding, ronding en kaarthoogte, zodat er geen hiërarchie overblijft.
5. **Alles gecentreerd of alles op één lijn**: volmaakte symmetrie is "less engaging" (IBM).
6. **De standaardvolgorde**: kop, logo's, voordelen, citaat, prijs, knop. Niet het eigen verhaal.
7. **Glas, verlopen, gloed op alles, fade-up op elk element.**
8. **Twee knoppen van gelijk gewicht naast elkaar.**
9. **Vage tekst** die over elk bedrijf kan gaan.

Wat het niet-generiek maakt, en wat hieronder in regels staat:
- **Gebalanceerde asymmetrie**: één brandpunt per sectie, dan een tweede en een derde.
- **Ritme door structuur**: dezelfde eenheid herhaalt zich met dezelfde maten. Een afwijkende eenheid
  komt zelden, als contrast.
- **Ruimte die verschilt met het gewicht**: een zware sectie krijgt meer lucht dan een lichte.
  Weinig ruimte binnen een groep, veel ruimte tussen groepen.
- **Eén systeem van verschuivingen**, uitgerekend en steeds hetzelfde, en per pagina een eigen maat.
- **Echte beelden**, beweging alleen waar ze iets vertelt, één accent.

---

## 1 · Het raster

- **12 kolommen**, tussenruimte **24 px** (telefoon 16). De inhoud is hoogstens **1440 px** breed.
  De buitenmarge is `max(clamp(20px, 5.2vw, 96px), (100vw − 1440px) / 2)`.
- Een sectie kiest één verdeling van de 12 kolommen, nooit twee gelijke helften: **6 + 1 + 5** (beeld,
  één lege kolom lucht, tekst), gespiegeld **5 + 1 + 6**, of **12** (een kop of een reeks over de hele
  breedte). Het inktblok staat als **7 + 5** naast zijn beeld, met het gat `--r-6` (51 px).
- Tussen 901 en 1100 px is er geen ruimte voor een lege kolom: dan 6 + 6 (beeld en tekst), en het beeld
  wordt nooit breder dan zijn zes kolommen.
- Op de telefoon (≤ 900 px) is alles één kolom. De verschuiving (§3) blijft, de kolommen niet.

## 2 · De ruimtematen (dezelfde 4 : 3 als de letters)

De letterschaal springt per stap 4 : 3 (13,5 · 18 · 24 · 32 · 42,7 · 56,9 · 75,9). De ruimte ook,
vanaf 16:

| Naam | px | Waarvoor |
|---|---|---|
| `--r-1` | 12 | tussen een label en zijn kop, tussen knopjes |
| `--r-2` | 16 | tussen regels in een lijst |
| `--r-3` | 21 | tussen een kop en zijn zin |
| `--r-4` | 28 | tussen een zin en zijn knop |
| `--r-5` | 38 | tussen twee groepen in één kolom |
| `--r-6` | 51 | tussen beeld en tekst (het gat van een verdeling) |
| `--r-7` | 67 | tussen een kop van een sectie en de inhoud eronder |
| `--r-8` | 90 | op de telefoon zijn de drie sectieluchten 72 · 90 · 120 (licht · gewoon · zwaar) |
| `--r-9` | 120 | een lichte sectie, die bij de vorige hoort (Meer weten), en Wat we maken onder de balk |
| `--r-10` | 160 | een gewone sectie (Hoe het werkt) |
| `--r-11` | 213 | een zware sectie, waar de pagina even stilstaat (de looks, het €1-blok) |

**Regel:** binnen een groep hoogstens `--r-4`, tussen groepen `--r-5` tot `--r-7`, tussen secties
`--r-9` tot `--r-11`. Nooit twee keer dezelfde sectielucht na elkaar. Op de voorpagina: Wat we maken 120
onder de balk (daar landt de foto uit de opening), Hoe het werkt 160, de looks 213, Meer weten 120, het
€1-blok 213.

## 3 · De verschuiving: de stap (S)

Lucas: *"de teksten mogen express (maar wel consistent uitgerekend) een beetje off staan … volgens een
systeem dat telkens weer terugkomt. Elke pagina/service heeft een eigen systeem."*

**De stap S** is de horizontale verschuiving tussen een kop en de tekst eronder. Hij komt uit een hoek van
de V. Elke soort pagina heeft zijn eigen hoek:

| Pagina | Hoek uit de V | S = tan(90° − hoek) × de korpsgrootte van de kop |
|---|---|---|
| **Voorpagina** | de snede, **53,13°** | **0,75** × de kop (bij 56,9 px is S 42,7 px: de volgende stap van de schaal) |
| Catalog | het linkerbeen, **59,8°** | **0,58** × de kop |
| Lifestyle | het rechterbeen, **66,5°** | **0,43** × de kop |
| Video, hooks | de snede, omgekeerd | **0,75** × de kop, naar links |
| De rest (prijzen, over, contact, gidsen) | het linkerbeen | **0,58** × de kop |

**Vier regels voor de stap:**
- **R1 · De hangende kop.** In een tekstgroep staat de kop op de lijn van de kolom. De zin, de knoppen
  en de details eronder staan één stap S naar rechts. De kop hangt er dus S buiten, zoals in een
  tijdschrift. Nooit twee stappen in één groep.
- **R2 · Het optische midden.** Staat een tekstgroep naast een beeld, dan staat zijn midden op het
  midden van het beeld, en daarna **S omhoog**. Het optische midden van een vlak ligt boven het
  meetkundige.
- **R3 · Doorsteken.** Een beeld mag aan de buitenkant **S** buiten het raster steken (regel 5 van de
  ontwerptaal), nooit aan de kant van de tekst.
- **R4 · De trap.** Staan dingen van gelijke soort naast elkaar (de drie stappen van Hoe het werkt),
  dan staat elk volgend ding **S lager**. Samen lopen ze op de hoek van de pagina.

Op de telefoon is S 12 px (ongeveer de helft), en R2 en R3 vervallen (alles onder elkaar).

## 4 · Soorten secties

Er zijn vijf soorten. Elke pagina gebruikt er hoogstens vier, en twee van dezelfde soort staan nooit
direct na elkaar.

| Soort | Opbouw | Voorbeeld op de voorpagina |
|---|---|---|
| **A · Beeld en tekst** | 6 + 1 + 5 (beeld links) of 5 + 1 + 6, de tekst in het optische midden (R2) | Wat we maken, Looks (gespiegeld) |
| **B · Een reeks** | de kop over 12 kolommen, de dingen eronder als trap (R4) | Hoe het werkt |
| **C · Een kop en een lijst** | de kop groot over 5 kolommen, een lege kolom, de lijst over 6, zonder beeld | Meer weten |
| **D · Het inktblok** | één per pagina, met de snede rechtsonder | Het €1-blok |
| **E · Het podium** | één per pagina, alleen bovenaan, het enige scrolleffect | De opening met de tablet |

## 5 · Wat elke sectie heeft

- **Eén groot, twee middel** (Lucas, 26 oktober): één brandpunt (een beeld of een kop vanaf 56,9 px),
  hoogstens twee middelgrote dingen (24 – 42,7 px).
- **60 : 30 : 10** per sectie (wit · inkt en beeld · blauw).
- **Eén knop met gewicht.** Een tweede keuze is een tekstlink of een lijnknop, nooit een tweede inktknop.
- **Een label alleen als het iets zegt**: de nummers 01 – 03 bij Hoe het werkt (de volgorde telt) en
  "Proef" bij het €1-blok. Geen nummer en geen label boven de andere secties.
- **Kaarten alleen voor een groep** die bij elkaar hoort. Nooit drie gelijke kaarten: verschillen ze
  in gewicht, dan verschillen ze in maat.

## 6 · De gloed op de tweede toon

Lucas: *"de geciteerde woorden … de blue hour kleur … een hele subtiele ademende gloed die komt en
weer verdwijnt. Wanneer de gloed weg is, is de tekst … de normale donkere tekst kleur."*

- De tweede toon van een kop (`.l`) staat in **inkt**, net als de eerste.
- Is de kop in beeld, dan komt **af en toe** de gloed, als een golf: **blauw uur `#25508B`** rolt met een
  zachte rand van links het woord in, staat even helemaal, en trekt langzaam naar rechts weg. Daarna is
  het weer inkt. Alleen de kleur, geen lichtrand eromheen: zoals het logo onder de muis (Lucas, 17:56:
  *"een soortgelijke gloed … als die op het logo zit. Heel subtiel"*; 17:58: *"een soort golvende
  beweging heel smooth en langzaam en die ook weer heel langzaam wegtrekt"*).
- **In de golf een lucht** (18:00, *"afbeeldingen … die een soortgelijke blauwe lucht hebben"*; zijn keuze
  "Lucht, rustig"): de lucht rechtsboven in zijn beeld hero-dunes, omgekleurd naar het schema (blauw diep
  `#1A4279` · blauw uur `#25508B` · `#2D61A8`, overal minstens 6 : 1). Zo zoals hij was, was hij te licht
  (3,4 : 1) en te cyaan. Hij schuift langzaam door het woord.
- **Een fijne korrel** (18:06, *"een soort hele fijne/subtiele film grain"*): 10 %, twaalf keer per seconde
  een andere plek, alleen in het blauw van de golf. Het lichtste korreltje haalt in de browser nog minstens 4,7 : 1.
- **Het ritme:** 1,9 s erin (sinus), 0,5 s vol, 2,4 s eruit: 4,8 s, onder de 5 s van WCAG 2.2.2 (zoals
  het accentwoord van 25 oktober, "één keer, dan stil"). Daarna 9 – 13 s niets. Er gloeit nooit
  meer dan één kop tegelijk: de kop die het dichtst bij het midden van het scherm staat. Elke kop
  gloeit hoogstens één keer per bezoek, dus de gloed komt terug terwijl je verder leest, niet steeds
  op dezelfde plek.
- **Niets bij het laden:** de eerste gloed komt pas na je eerste beweging (muis, toets, aanraking,
  wiel), en dan 1,5 s later.
- **Op inkt** (het €1-blok): van wit naar **blauw licht `#80A7DD`**.
- **Minder beweging:** geen gloed, de tweede toon blijft inkt.
- Contrast: inkt 19,18 : 1, blauw uur 8,08 : 1 op wit, blauw licht 7,75 : 1 op inkt; elk moment van de
  gloed haalt 4,5 : 1.

Dit wijkt bewust af van `KLEURENSCHEMA.md` ("geen blauw kopwoord"); Lucas vroeg het op 27 oktober.

## 7 · De balk

Lucas: *"niet meer als pilvormige balk maar gewoon een moderne die de hele bovenkant bedekt en
rechthoekig is."*

- Over de hele breedte, **72 px** hoog (telefoon **60**), wit, onderaan een haarlijn `#E6E8EC`.
  Geen glas, geen schaduw, geen ronding.
- Links het V-merk, de menu's direct ernaast (op de lijn van het raster), rechts Inloggen, de taal en
  Bestellen (de enige blauwe knop).
- Hij blijft bovenaan staan. Niets beweegt eraan bij het scrollen.
- Een uitklapmenu hangt **8 px onder de haarlijn**, wit met een haarlijn, de zachte hoek linksboven.
- De balk staat op alle pagina's op dit raster. Tot de andere pagina's het systeem krijgen, staat hun
  inhoud nog op de oude marge (40 px op 1440); dat trekt recht zodra ze meegaan.

## 8 · Beweging

- **Eén scrolleffect per pagina, alleen bovenaan** (soort E). Daarna scrolt de pagina gewoon: geen
  vastgezette secties, geen sprong per wieltik, geen fade-up bij binnenkomen.
- Wat binnen een sectie beweegt, vertelt iets (de stappen van Hoe het werkt) en begint pas als je
  ernaar kijkt.
- Wat vanzelf beweegt: de gloed (§6), die per kop één keer komt, en de voorbeeldschermen in de tablet van
  de opening, die je met de pauzeknop stilzet (en die bij minder beweging stilstaan).

## 9 · Toetsen (meten, nooit gokken)

Elke pagina wordt gemeten op 320 – 1920 px: koppen hoogstens twee regels (drie tot 340 px),
5 – 7 woorden per regel lopende tekst, tekst minstens 11,5 px, contrast 4,5 : 1, CLS 0 bij het laden,
de stap S en het optische midden tot op 1 px zoals hierboven.

---

**Bronnen:** [Scoring 500 Show HN pages for AI design patterns](https://adriankrebs.ch/blog/design-slop/) ·
[AI Slop Web Design guide (925 Studios)](https://www.925studios.co/blog/ai-slop-web-design-guide) ·
[How to stop your frontend looking AI-generated](https://medium.com/design-bootcamp/how-to-stop-your-frontend-looking-ai-generated-efbb9681a6a2) ·
[How to make your AI-built site not look AI-built (Joshua Snoddy)](https://www.joshuasnoddy.com/blog/make-ai-built-site-not-look-ai/) ·
[Fix a generic AI landing page (Superdesign)](https://superdesign.dev/blog/fix-generic-ai-landing-page) ·
[Anti AI slop ban list](https://github.com/Laith0003/ux-skill/wiki/Anti-AI-slop-ban-list) ·
[IBM Design Language: layout tips and techniques](https://ibm.com/design/language/layout/tips-and-techniques) ·
[Broken grid layouts (HubSpot)](https://blog.hubspot.com/website/broken-grid-layouts) ·
[Asymmetric grid layouts](https://www.pravinkumar.co/blog/webflow-asymmetric-grid-layouts-2026)
