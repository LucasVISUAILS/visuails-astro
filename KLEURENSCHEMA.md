# VISUAILS — kleurenschema

**Stand: 20 september 2026.** Dit is het ene bestand dat de kleuren draagt. De
tokens in `src/styles/global.css` (site), `src/styles/studio.css` (Studio),
`public/account.css` / `portal.css` / `admin.css` (portaal, admin),
`src/lib/mailTemplate.js` (mail) en `scripts/make-*.mjs` (favicons, OG,
logopakket) volgen dit bestand — verandert hier iets, dan daar ook, en
andersom niet.

Vervangt de `#D2E04A`-familie van 6 september. **Lettertypen en teksten
blijven ongewijzigd.** Dit is uitsluitend een kleurwissel.

---

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
