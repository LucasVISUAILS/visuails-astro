# VISUAILS — kleurenschema

**Stand: 19 oktober 2026. Schema A, overal.** Dit is het ene bestand dat de
kleuren draagt. Verandert hier iets, dan in de bestanden hieronder ook, en
andersom niet.

Lucas koos in afvinklijst 41 schema A, "wit, zwart, elektrisch violet", met
zwarte knoppen en een vlak violet €1-blok zonder korrel. Zijn notitie: *"Ook
alle afbeeldingen/logo's aanpassen en een nieuw kleurenschema maken voor de
nieuwe kleuren. Zoek of er al een kleurenschema in de map zit zodat je die kan
aanpassen. Doe dit heel uitgebreid en nauwkeurig."* Op de vraag wat er met de
kleine plekken violet gebeurt (een kopwoord, het sectienummer, een stip, een
icoon, een link): *"Ook zwart"*.

Het schema daarvoor (de hal, 14 tot 18 oktober) staat verderop als
geschiedenis, en daaronder dat van 20 september.

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
statuspil blijft een pil. Het actieve menu-item is een witte tint en geen violet
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
