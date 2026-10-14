# Wat er nog aan beeld gemaakt moet worden

**19 september 2026 — de volledige lijst, op volgorde van wat het meeste oplevert.**

Lucas: *"Ik wil dat je gaat zoeken wat voor content allemaal moet maken voor op de
website zodat ik het stap voor stap kan afgaan en kan maken."*

Dit is die lijst. Hij is niet bedacht maar **afgelezen van de site zelf**: elke lege
plek op de site draagt een `<Placeholder>` met zijn eigen opdracht erin, en
`npm run placeholders` telt ze. Daar kwamen 31 plekken uit (het script zegt 62 — het
telt de Nederlandse en de Engelse pagina apart, maar één bestand vult ze allebei),
plus 8 videovoorbeelden die in `videoExamples.js` op `file: null` staan, plus 6
hoekfoto's die wel in de code staan maar niet op schijf. Samen **45 bestanden**. Geen ervan is kapot: overal
staat nu een nette plaatshouder met de opdracht erin, dus de site kan zo live.

---

## Hoe de overdracht werkt

1. **Jij maakt het bestand en geeft het de naam die hieronder staat.** De naam is het
   enige wat precies moet kloppen; daar hangt de koppeling aan.
2. **Zet het in `public/img/`** (clips in `public/video/`, die map maak ik aan).
   Formaat: **.webp** of **.jpg/.png** — ik zet het om. Clips: **MP4/H.264**.
3. **Lever groot aan.** Minimaal 2× de vakbreedte; 2000–2400 px aan de lange zijde is
   altijd genoeg. Ik draai daarna `npm run avif` en `npm run krimpen`, die maken de
   AVIF-versie en de kleinere maten ernaast.
4. **Ik koppel ze in één ronde**: plaatshouder eruit, `<img>`/`<video>` erin, alt-tekst
   in beide talen, en de testen erover.

Je hoeft dus niets in de code te doen. Eén uitzondering: overschrijf je een bestand
dat er al ligt onder dezelfde naam, zeg het dan even — dan moet die naam uit
`src/data/oude-beelden.json`, anders blijft hij een plaatshouder.

**De verhouding is niet vrij.** De plaatshouder houdt nu precies de ruimte vast die
het echte beeld krijgt. Lever je 16:9 waar 4:5 staat, dan verspringt de pagina of
wordt er afgesneden. Bij twee beelden die náást elkaar staan (bv. slecht/goed op
/upload-guidelines) geldt bovendien: **zelfde product, zelfde hoek, zelfde uitsnede** —
alleen de omstandigheden verschillen, anders vergelijkt de bezoeker het verkeerde.

---

## Mijn advies over de volgorde

**Blok 1 en 2 zijn de dertien die er echt toe doen.** Het zijn de beelden die een
bezoeker ziet die op het punt staat te bestellen, en vijf ervan maak je met een
telefoon bij daglicht. Als je deze week iets doet, doe dan deze.

**Blok 4 — de dertien stijlkaarten — zou ik eerst kleiner maken in plaats van
afwerken.** Dat zijn kaarten van stijlen die nog niet bestaan; die lijst is begin
september bedacht om lege categorieën te vullen. Elke naam die blijft staan is een
belofte die je moet waarmaken. Vier stijlen die er echt komen zijn sterker dan
dertien die "binnenkort" zijn — en schrappen is één regel uit `komendeStijlen.js`, dat
doe ik in een minuut.

Het logische alternatief, als je ze wél alle dertien wilt: maak de stijlkaart van de
**eerste echte klantbestelling** in die stijl. Dan is het bouwen van de stijl en het
maken van het kaartbeeld hetzelfde werk, en staat er nooit een voorbeeld op de site
dat je zelf nog nooit geleverd hebt.

**Blok 3 en 5 mogen wachten.** De hoekfoto's vervangen iets dat nu al werkt (zie daar),
en blok 5 hoort bij /hooks en /editions — twee pagina's die je nog niet kunt bestellen.
Beeld maken voor een dienst die nog niet te koop is, is de duurste volgorde.

---

# BLOK 1 · Vijf foto's, meteen nodig

Dit zijn de vijf die het meeste doen en het minste kosten. Alle vijf met een telefoon
of camera bij daglicht te maken. Alleen bij nr. 3 komt er iemand in beeld, en handen
en een schouder zijn genoeg — er hoeft geen gezicht op.

| # | Bestandsnaam | Pagina | Verhouding |
|---|---|---|---|
| 1 | `uitleg-upload-slecht.webp` | /upload-guidelines | 4:3 |
| 2 | `uitleg-upload-goed.webp` | /upload-guidelines | 4:3 |
| 3 | `uitleg-studio-nakijken.webp` | /studio | 16:9 |
| 4 | `uitleg-compare-shootdag.webp` | /compare | 4:3 |
| 5 | `uitleg-compare-laptop.webp` | /compare | 4:3 |

- [ ] **1 · `uitleg-upload-slecht.webp`** — 4:3
  *Wat erop staat:* hetzelfde product slecht gefotografeerd — een telefoonfoto in een
  donkere kamer, op een rommelig oppervlak, net niet scherp.
  *Wat het moet overbrengen:* het moet lijken op een foto die iemand echt zou insturen,
  geen karikatuur. Donker, vlak, drukke achtergrond, en net zo zacht dat de rand van
  het product niet scherp is.

- [ ] **2 · `uitleg-upload-goed.webp`** — 4:3
  *Wat erop staat:* hetzelfde product goed gefotografeerd — daglicht van een raam, een
  egaal oppervlak, scherp van rand tot rand.
  *Wat het moet overbrengen:* het moet **haalbaar met een telefoon zonder apparatuur**
  zijn — dat is de hele belofte van die pagina. Niets gestyled, niets geretoucheerd.
  Ziet het eruit als studiowerk, dan concludeert de lezer dat hij het niet kan.
  → Zelfde product en zelfde hoek als nr. 1.

- [ ] **3 · `uitleg-studio-nakijken.webp`** — 16:9
  *Wat erop staat:* iemand aan het werk: een afgewerkt beeld op het scherm, ernaast de
  originele telefoonfoto van de klant.
  *Wat het moet overbrengen:* dat *"met de hand nagekeken"* een handeling is en geen
  zin. Het vergelijken moet zichtbaar zijn — twee beelden naast elkaar, iemand die
  ernaar kijkt. Geen geposeerd portret, geen stockkantoor.

- [ ] **4 · `uitleg-compare-shootdag.webp`** — 4:3
  *Wat erop staat:* een shootdag: statieven, lampen, rekken kleding, mensen die wachten.
  *Wat het moet overbrengen:* de **dag**, niet de foto die eruit komt. Opbouw, spullen,
  wachten. De bezoeker moet "dit kost me een dag" denken vóór hij één woord van de
  tabel leest. Rommelig mag; geromantiseerd niet.

- [ ] **5 · `uitleg-compare-laptop.webp`** — 4:3
  *Wat erop staat:* een laptop met VISUAILS Studio open, ernaast één kledingstuk en een
  telefoon.
  *Wat het moet overbrengen:* hetzelfde moment, andere wereld: alles wat je nodig hebt
  past op een tafel. Zelfde uitsnede en zelfde licht als nr. 4 — het verschil moet in
  de inhoud zitten, niet in de fotografie.

---

# BLOK 2 · Acht videovoorbeelden voor /video

Dit is het grootste gat op een dienst waar je **nu al kunt bestellen**: de vier
stijlpagina's onder /video (`/video/motion`, `/video/lifestyle`, `/video/campaign`,
`/video/custom`) tonen elk twee lege vakken, acht in totaal.

Elk voorbeeld heeft **twee bestanden** nodig — de clip en de poster (de still die je
ziet vóór je op play drukt). Alleen een clip is niet genoeg: dan is de knop een knop
op niets.

Clips: **MP4/H.264, ±8 seconden, zonder geluid nodig.** Posters: de eerste frame van
de clip, **geen aparte foto die erop lijkt**.

| # | Clip (`public/video/`) | Poster (`public/img/`) | Verhouding |
|---|---|---|---|
| 6 | `motion-1.mp4` | `video-motion-1.webp` | 9:16 |
| 7 | `motion-2.mp4` | `video-motion-2.webp` | 1:1 |
| 8 | `lifestyle-1.mp4` | `video-lifestyle-1.webp` | 9:16 |
| 9 | `lifestyle-2.mp4` | `video-lifestyle-2.webp` | 1:1 |
| 10 | `campaign-1.mp4` | `video-campaign-1.webp` | 16:9 |
| 11 | `campaign-2.mp4` | `video-campaign-2.webp` | 9:16 |
| 12 | `custom-1.mp4` | `video-custom-1.webp` | 16:9 |
| 13 | `custom-2.mp4` | `video-custom-2.webp` | 1:1 |

- [ ] **6 · motion-1 · 9:16** — *Een flacon, één langzame draai.* Een flacon op een
      egale ondergrond die één keer langzaam van links naar rechts draait.
- [ ] **7 · motion-2 · 1:1** — *Een sneaker, licht dat overtrekt.* Sneaker staat stil
      terwijl een zachte lichtstreep over het bovenwerk trekt.
- [ ] **8 · lifestyle-1 · 9:16** — *Vastgehouden, dan neergezet.* Twee handen tillen
      het product in beeld en zetten het op tafel neer.
- [ ] **9 · lifestyle-2 · 1:1** — *Gedragen, weglopend.* Een model draagt het
      kledingstuk en loopt van de camera af weg in een lichte ruimte.
- [ ] **10 · campaign-1 · 16:9** — *Drie shots, één idee.* Een detail, het hele
      product, het product in gebruik — achter elkaar gemonteerd.
- [ ] **11 · campaign-2 · 9:16** — *Hetzelfde idee, verticaal.* Dezelfde drie shots
      opnieuw gemonteerd voor een telefoonscherm, strakker in beeld.
- [ ] **12 · custom-1 · 16:9** — *Een eigen beweging, één keer gebouwd.* Een beweging
      die voor één merk is ontworpen en over het hele assortiment terugkomt.
- [ ] **13 · custom-2 · 1:1** — *Dezelfde beweging, ander product.* Dezelfde ontworpen
      beweging op een ander product uit hetzelfde assortiment.

> **Let op de belofte eronder.** Zodra deze clips er zijn, hoort de echte resolutie en
> bitrate in `videoExamples.js` te staan — dat getal staat er nu met opzet niet in,
> omdat een verzonnen getal morgen een belofte op een pagina is. Geef ze door, ik zet
> ze erin.

---

# BLOK 3 · Zes hoekfoto's voor het bestelformulier

**Lees dit eerst, want hier ligt een keuze.** Deze zes namen staan in
`src/data/angles.js` als `shot:`, maar er staat nergens een `<img>` die ze ophaalt:
de hoekkiezer in het bestelformulier tekent een **schets** (`AngleSketch`), en die
werkt. Het veld is dus dood hout. Maak je de foto's, dan bouw ik de kiezer om zodat
hij bij elke hoek een echte foto toont in plaats van een lijntekening.

**Mijn advies:** doe dit pas als blok 1 en 2 klaar zijn, en dan alle zes in
één keer — een kiezer met drie foto's en drie tekeningen is rommeliger dan zes
tekeningen. Wil je het niet, zeg het dan: dan haal ik het `shot:`-veld eruit, en staat
er geen bestandsnaam meer in de code die nergens naar wijst.

Allemaal **1:1**, hetzelfde product over de hele set als het kan — dat is precies wat
de kiezer laat zien: zes keer hetzelfde ding, zes keer anders bekeken.

*Op model:*

- [ ] **14 · `hoek-three-quarter.webp`** — **Driekwart.** Het model een graad of
      veertig gedraaid, het hele product in beeld.
- [ ] **15 · `hoek-back-on-model.webp`** — **Van achter.** De achterkant, gedragen —
      hoe hij zit en waar hij valt.
- [ ] **16 · `hoek-detail-on-model.webp`** — **Detail op model.** Dichtbij terwijl het
      gedragen wordt: de stof op spanning, de pasvorm bij een naad.

*Op de ondergrond:*

- [ ] **17 · `hoek-flat-lay.webp`** — **Flat-lay.** Recht van boven, uitgelegd en
      rechtgelegd.
- [ ] **18 · `hoek-inside.webp`** — **Binnenkant.** De voering, het label, de afwerking
      aan de binnenkant.
- [ ] **19 · `hoek-hardware.webp`** — **Los detail.** Een logo, een rits, een zool, een
      knoop — één ding, beeldvullend.

---

# BLOK 4 · Dertien stijlkaarten

Elke aangekondigde stijl heeft één kaartbeeld. **Lees eerst het advies bovenaan** —
schrappen is hier een geldig antwoord, en een goedkopere.

Bij video en hooks is een **poster (stilstaand beeld) genoeg** om de kaart te vullen;
een clip is mooier maar niet nodig. Lever je wel een clip, dan onder dezelfde naam
met `.mp4`, in `public/video/`.

### Catalog — 1:1

- [ ] **20 · `stijl-catalog-ghost.webp`** — *Ghost.* De gedragen vorm zonder model —
      voor- en achterkant, zoals fashion-webshops het tonen.
- [ ] **21 · `stijl-catalog-kleurvlak.webp`** — *Kleurvlak.* Je merkkleur als
      achtergrond in plaats van wit, voor een productpagina die niet klinisch voelt.
- [ ] **22 · `stijl-catalog-podium.webp`** — *Podium.* Het product op steen, beton of
      linnen — voor sieraden, skincare en alles wat premium moet lezen.

### Lifestyle — 4:5

- [ ] **23 · `stijl-lifestyle-studio.webp`** — *Studio.* Eén kleur, één licht, één
      model — de scène gestript tot alleen het product en de drager.
- [ ] **24 · `stijl-lifestyle-nacht.webp`** — *Nacht.* Stad na zonsondergang: neon,
      natte stoep, harde schaduwen. Voor merken die na achten leven.

### Video — 9:16

- [ ] **25 · `stijl-video-draaitafel.webp`** — *Draaitafel.* Eén volle rotatie op wit,
      naadloos rond — de videoversie van je catalogset.
- [ ] **26 · `stijl-video-kleurwissel.webp`** — *Kleurwissel.* Hetzelfde product
      wisselt van kleur of materiaal in één clip. Voor webshops met veel varianten.
- [ ] **27 · `stijl-video-detail.webp`** — *Detail.* Macro over stiksel, weefsel en
      sluiting — de tweede clip naast een productfilm.

### Hooks — 9:16

De eerste bestaat al als format en staat als eerste kaart op /hooks; alleen het beeld
ontbreekt nog.

- [ ] **28 · `stijl-hooks-overloop.webp`** — *De overloop.* De clip loopt door in het
      beeld eronder — samen lezen de twee als één beeld.
- [ ] **29 · `stijl-hooks-lus.webp`** — *De lus.* Het laatste beeld sluit naadloos aan
      op het eerste, zodat de clip eindeloos doorloopt zonder dat je de naad ziet.
- [ ] **30 · `stijl-hooks-drieluik.webp`** — *Drieluik.* Drie posts naast elkaar die in
      je grid één beeld vormen — de hook zit in het openen van je profiel.
- [ ] **31 · `stijl-hooks-onthulling.webp`** — *De onthulling.* De eerste seconden
      tonen alles behalve het product; het komt pas in beeld als de duim al stopte.
- [ ] **32 · `stijl-hooks-stapel.webp`** — *Stapel.* Meerdere producten wisselen elkaar
      af in hetzelfde kader, op dezelfde plek. Voor een drop van een serie.

---

# BLOK 5 · Dertien uitlegbeelden voor /hooks, /editions en /start

/hooks en /editions kun je **nog niet bestellen**, dus die twaalf zijn niet urgent.
Ze zijn wel het moeilijkst te maken: dit zijn geen productfoto's maar uitleg in beeld.
Nr. 33 is de uitzondering — die staat op /start, de pagina waar elke bezoeker zijn
dienst kiest. Doe je er één uit dit blok, doe dan die.

### /start — 1

- [ ] **33 · `uitleg-start-hook.webp`** — 4:3, **video-achtig beeld**
      *Wat erop staat:* één frame waarop je het tweeluik van een Hook ziet: de eerste
      seconde en de tweede naast elkaar.
      *Wat het moet overbrengen:* dat het **één clip** is en geen twee, in één oogopslag.
      → Dit is inhoudelijk hetzelfde beeld als nr. 28 (`stijl-hooks-overloop`), alleen
      in 4:3 in plaats van 9:16. Eén opname, twee uitsneden.

### /hooks — 6

- [ ] **34 · `uitleg-hooks-hero.webp`** — 4:5, video
      Eén hookvideo, stilgezet op het frame waar de naad zit: bovenin het einde van de
      video, eronder het beeld uit de feed dat er precies op aansluit.
      *Moet de hele gedachte in één blik dragen: twee beelden die je los verwacht, die
      als één lezen. Moet een bezoeker daarna nog lezen wát een hook is, dan doet het
      beeld zijn werk niet.*
- [ ] **35 · `uitleg-hooks-video.webp`** — 9:16, video
      De verticale video zelf, op volle hoogte, zoals hij in een feed staat.
      *Moet laten zien dat dit een VIDEO is en geen foto in een telefoonkader:
      beweging, een productvorm die draait, en leesbaar zonder geluid.*
- [ ] **36 · `uitleg-hooks-snit.webp`** — 9:16, video
      Dezelfde montage in drie uitsneden naast elkaar: verticaal, 4:5 en 1:1.
      *Moet laten zien dat het product in elke uitsnede heel blijft — één montage, geen
      drie keer bijsnijden waarbij er telkens iets afvalt.*
- [ ] **37 · `uitleg-hooks-stills.webp`** — 9:16, video
      De losse beelden uit dezelfde montage — de frames waar de naad zit, naast elkaar.
      *Moet duidelijk maken dat je er meer aan overhoudt dan één bestand.*
- [ ] **38 · `uitleg-hooks-naad.webp`** — 21:9, foto
      Een feed van bovenaf, waarin één post uit twee delen bestaat die op elkaar
      aansluiten, met de naad aangewezen.
      *Moet zonder woorden uitleggen waar de video ophoudt en het beeld eronder begint,
      en waarom een kijker dat moment niet merkt.*
- [ ] **39 · `uitleg-hooks-stappen.webp`** — 4:5, foto
      De vier telefoonfoto's die een klant instuurt, naast het scherm waarop de montage
      gebouwd wordt.
      *Moet bewijzen dat het werk aan onze kant zit: links iets wat iedereen kan maken,
      rechts iets wat niemand daar zelf van bouwt.*

### /editions — 6

- [ ] **40 · `uitleg-editions-maandgrid.webp`** — 4:5, foto
      Een maandraster van 20 beelden voor één merk — overal dezelfde kleuren en hetzelfde
      licht, en in geen enkel beeld een product.
      *Moet lezen als één merk en niet als een verzameling. Komt het over als een greep
      uit een bibliotheek, dan is het mislukt.*
- [ ] **41 · `uitleg-editions-welproduct.webp`** — 1:1, foto
      Een gewoon catalogbeeld: één kledingstuk, scherp, op een egale achtergrond.
      *Staat er om afgestreept te worden: moet zó onmiskenbaar "productfoto" zijn dat je
      meteen ziet dat het beeld ernaast iets anders is.*
- [ ] **42 · `uitleg-editions-geenproduct.webp`** — 1:1, foto
      Een merkbeeld uit dezelfde wereld: stof van dichtbij, een muur in laat licht, een
      hand — en nergens een kledingstuk om te verkopen.
      *Zelfde sfeer als nr. 41, onmiskenbaar iets anders. Het verschil is niet kwaliteit
      maar onderwerp: dit verkoopt niets, het zegt wie je bent.*
- [ ] **43 · `uitleg-editions-feed.webp`** — 21:9, foto
      Een maand feed van bovenaf: de eigen productposts van het merk afgewisseld met
      merkbeeld, zodat je ziet welke dagen waarmee gevuld zijn.
      *Moet het probleem tonen waar dit product voor bestaat: de gaten in een maand
      zonder nieuwe collectie. Twee kleuren markering is genoeg — dit is een feed, geen
      infographic.*
- [ ] **44 · `uitleg-editions-opzet.webp`** — 4:5, foto
      De opzet van één merk uitgelegd: kleurstalen, twee locatiereferenties en een
      materiaalstaal, met de notities van de klant ernaast.
      *Moet duidelijk maken waaruit de eenmalige opzet bestaat en waarom je die één keer
      betaalt. Het is het recept, niet het gerecht.*
- [ ] **45 · `uitleg-editions-twaalf.webp`** — 16:9, foto
      Drie maandsets van hetzelfde merk naast elkaar, met de maand erboven —
      herkenbaar dezelfde opzet, en toch drie verschillende dingen.
      *Moet de angst wegnemen die bij een maandset hoort: dat het na drie maanden
      twaalf keer dezelfde foto is. Kun je de drie maanden niet uit elkaar houden, dan
      doet dit beeld het tegenovergestelde van zijn werk.*

---

# Doorlopend — geen lijst maar een gewoonte

Deze drie komen vanzelf goed als het werk loopt; er is niets te "maken" op een
zaterdag.

- **Aanbevelingen (testimonials).** `src/data/testimonials.js` is leeg, en met opzet:
  hij wordt gevuld door `npm run testimonials` uit goedgekeurde klantfeedback. De keten
  is: klant vult het feedbackformulier in → jij keurt goed op `/admin/testimonials` →
  ik draai het script. **Niets zelf typen** — een verzonnen aanbeveling is het enige
  op deze hele lijst dat schade kan doen.
- **Voor/na-paren.** Er is er precies één echt op de hele site (de `ba2-`-set op de
  homepagina-band). Elke nieuwe klantbestelling waarbij je de ingestuurde telefoonfoto
  mág tonen, is een tweede paar. Dat is het overtuigendste beeld dat je hebt.
- **Galerij.** 40+ beelden, vol genoeg. Aanvullen mag, maar er ontbreekt niets.

---

## Wat er NIET op deze lijst staat, en waarom

- **De voorpagina, de modellen, de galerij, /about, de gidsen, de FAQ, de prijzen** —
  compleet. Geen enkele lege plek.
- **`portal-gallery.webp`** — komt alleen voor in een toelichting in `FigDash.astro`,
  niet in een `<img>`. Hoeft niet gemaakt.
- **Iconen, logo's, favicons, og-beelden, mailbeelden** — allemaal gegenereerd uit de
  bestanden die je al hebt. Daar hoef je niets aan te doen.
- **Tekst.** Er staat nergens meer een lege of voorlopige tekst op de site. Alles wat
  hier open staat, is beeld.

---

## De telling, zodat je hem kunt controleren

| | Aantal | Waarvan video |
|---|---|---|
| Blok 1 · meteen nodig | 5 | 0 |
| Blok 2 · videovoorbeelden | 8 clips + 8 posters | 8 |
| Blok 3 · hoekfoto's | 6 | 0 |
| Blok 4 · stijlkaarten | 13 | 8 (poster volstaat) |
| Blok 5 · uitlegbeelden | 13 | 5 |
| **Totaal** | **45 plekken** | |

`npm run placeholders` zegt *"59 beeld(en) te maken, op 62 plek(ken)"* en dat is
hetzelfde getal: het script telt de Nederlandse en de Engelse pagina apart, en dat is
2 × 31. **Eén bestand vult beide talen** — je maakt dus 31 beelden en niet 62. De 8
videovoorbeelden en de 6 hoekfoto's zitten daar niet bij, want die tekenen hun eigen
lege staat. Als je een blok af hebt, draai ik het script en dan zie je het getal
zakken.
