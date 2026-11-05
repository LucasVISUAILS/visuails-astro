# De launchset omzetten: wat er dan nog moet (5 november 2026, levering 70)

Gemeten in deze sessie: de hele testreeks met de schakelaar aan (`VISUAILS_LAUNCHSET=aan`, een build in die
stand). **27 toetsen zijn dan rood.** De site zelf bouwt en draait in die stand zonder fouten (geen scriptfout,
geen 404, geen link naar een verborgen pagina; `tests/launchset-70.test.mjs` en de schermafdrukken). Wat rood is,
valt in drie groepen. Zet je de schakelaar om zonder dit, dan stopt UITROLLEN.bat bij de testreeks en gaat er
niets live. Dat is veilig, maar het is werk dat eerst moet.

**Advies:** zet hem om in een chat met Claude (de brug), op de dag dat je beelden er zijn. Dan lopen de beelden,
de toetsen en de schermafdrukken in één keer mee. Reken op een uur tot anderhalf.

## A · Beelden die nog moeten komen (rood tot ze er zijn, en dat is goed)

Deze toetsen houden een launch zonder beelden tegen. Ze worden vanzelf groen als de beelden van
`kladblok/LEVERING-70.md` §4 er zijn (en de galerij opnieuw gemaakt is):

| Toets | Wat hij mist |
|---|---|
| `test:lookpagina` | de foto's van Classic en Casual (`catalog-classic-01/02`, `catalog-casual-01/02`) |
| `test:lookpagina-browser` | idem: het eerste beeld van de lookpagina van Classic en Casual |
| `test:startlooks` | "geen grijs vlak op /start": de kaart van August (`lifestyle-august-02`) |
| `test:proeflook` | een galerijtegel op de voorpagina naar Casual en August: `node scripts/galerij-80.mjs` opnieuw draaien als de beelden er zijn (`src/data/galerij80.json`) |
| `test:telefoonbeelden` | `catalog-raster` en `lifestyle-glow-05` staan met de schakelaar aan op geen pagina meer: de telefoonversies van de nieuwe beelden maken, en de toets laten kijken naar de foto's die op de site staan |

## B · Op /start/catalog moet je nu een stijl kiezen

Met twee huisstijlen (Classic en Casual) wordt de stijl op /start/catalog een verplichte keuzelijst zonder
voorkeuze. Zo hoort het: `tests/stijlkeuze.test.mjs` legt die regel vast ("bij twee of meer: niets
voorgeselecteerd, verplicht"). Maar de browsertoetsen die het formulier invullen, kiezen nog geen stijl en komen
daardoor niet voorbij stap 1:

`test:formuliera2`, `test:naloopa2browser`, `test:creditsstap5`, `test:creditsketen`, `test:concept-browser`,
`test:hoeken-ontbreekt-browser`, `test:bijkopen-stap5-browser`, `test:stap2-kaart-browser`, `test:werkplaats`,
`test:looks-browser`, `test:naleveringwerk`, `test:telefoon58`.

**Wat er moet:** in elke toets bij stap 1 de keuze maken als de lijst er is
(`select[name="catalog_style"]` → Classic). Eén regel per toets; een gedeelde hulp in `tests/lib/` maakt het netter.
En `test:stijlvel`: /catalog/ toont met twee huisstijlen geen "set" van één stijl meer (`.h-st-set`); de toets
moet de set per stijl verwachten.

## C · Toetsen die de looks van nu hard noemen

Deze moeten de site-lijst lezen in plaats van een getypte lijst (`siteLijst()` uit `src/data/launchset.js`):

| Toets | Wat er getypt staat |
|---|---|
| `test:huid`, `test:halvoorbeeld` | de pagina's van Dunes, Glow, Lifestyle Video en Campaign in `GROEPEN` |
| `test:paths` | `/nl/lifestyle/dunes` als voorbeeld van een lookpagina; de 301's van `/voorbeeld/lifestyle/dunes` enz. wijzen met de schakelaar aan naar een adres dat de middleware met een 302 doorstuurt (die bestemming als geldig tellen) |
| `test:publiek81` | `/lifestyle/dunes/` in de lijst van pagina's |
| `test:voorpagina80` | "21 beelden, 12 lifestyle en 9 catalog": met de schakelaar aan vallen de tegels van Dunes en Glow weg |
| `test:plaatshouderspad` | "de lookkaarten staan er (Classic tot Phone-made)" |
| `test:startlooks` | de videoband "motion, lifestyle, campaign, custom" |
| `test:opruimlijst` | `video/lifestyle` als gebouwde pagina |
| `test:doorloop27` | de knop van Lifestyle Video (`?style=lifestyle`) |
| `test:proefbrowser` | `?style=dunes` |

## Daarna

`VISUAILS_LAUNCHSET=aan TESTREEKS_TEGELIJK=4 node scripts/testreeks.mjs` moet groen zijn, en ook zonder de variabele
(de stand uit blijft dan de terugvaloptie). Dan pas de regel in `src/data/launchset.js` omzetten en uitrollen.
