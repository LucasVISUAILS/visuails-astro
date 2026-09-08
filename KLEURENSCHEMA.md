# VISUAILS — kleurenschema

**Stand: 6 september 2026.** Dit is het ene bestand dat de kleuren draagt. De
tokens in `src/styles/global.css` (site), `src/styles/studio.css` (Studio),
`public/account.css` / `portal.css` / `admin.css` (portaal, admin),
`src/lib/mailTemplate.js` (mail) en `scripts/make-*.mjs` (favicons, OG,
logopakket) volgen dit bestand — verandert hier iets, dan daar ook, en
andersom niet.

De waarden zijn per pixel gemeten in de Komma-beelden van Ovyon Labs
(`kladblok/komma-kleur.html`), op verzoek van Lucas: *"de feeling van de
kleuren wil ik echt 1 op 1 hebben."*

## De grond

| Rol | Waarde | Waar |
|---|---|---|
| Wit vel | `#FFFFFF` | Posters, kaarten, het vel in een donker vlak |
| Lichte grond | `#F5F5F5` | De pagina zelf (`--bg-0`), Studio licht |
| Tweede trede | `#EAEAEA` | Een vlak op de lichte grond (`--surface-2`) |
| Inkt | `#111111` | Het donkere paneel, Studio donker, de posterachtergrond (`--glass`, `--ink-900`) |
| Letter op licht | `#0A0A0A` · `#454545` · `#686868` | `--ink-1` koppen · `--ink-2` lopende tekst · `--ink-3` gedempt (5,6:1 op wit — de laatste trede die nog letter mag zijn; op 7 september van `#6E6E6E` naar `#686868` omdat hij op `#EDEDED` op 4,36:1 uitkwam en dat nét onder de eis is) |
| Lijn | `#DFDFDF` · `#BDBDBD` · inkt 42 % | `--line` · `--line-strong` · `--ink-4` — **lijnen, nooit letters** |

## Het geel — één familie

| Token | Waarde | Rol | Contrast |
|---|---|---|---|
| `--accent` | **`#D2E04A`** | De vulling: knoppen, het ene gekleurde vlak, het blok achter een woord | 13,7:1 met zwarte letter |
| `--accent-ink` | `#0A0A0A` | Wat OP het geel staat — altijd zwart, nooit wit (wit op geel is 1,3:1) | — |
| `--accent-dim` | `#B8CC46` | Hover en ingedrukt; de meter, de ring | 11,1:1 met zwart |
| `--accent-text` (op inkt) | `#E4F474` | Het geel als LETTER op `#111111`: mono-labels, een woord in een kop op het donkere paneel | 16,5:1 op inkt |
| `--accent-text` (op licht) | `var(--ink-1)` | Op de lichte grond is het geel nooit een letter — daar is het inkt | — |
| `--glow` | `#9EB42F` | De gloeirand om een donker paneel; alleen als licht, nooit als letter | — |
| Tint | `rgb(210 224 74 / .12–.38)` | Een zweem van het geel als vlak (weekstrook, chip) | — |

Wat in de Komma-beelden verder voorkomt en hier bewust **niet** als token
staat: het metallic olijfgoud van de folie (`#D4D444`, in de schaduw
`#8C8C1C`). Dat is materiaal in een foto, geen UI-kleur — het komt terug
zodra Lucas de foto's schiet, niet uit CSS.

## De regels

1. **Geel is vulling of licht, nooit letter op licht.** Op wit/`#F5F5F5` is
   het 1,3:1. Wil een regel "het accent als tekst", dan is dat inkt.
2. **Op geel staat altijd zwart.** Knoplabels, cijfers, het woord in een blok.
3. **Op inkt is het geel lichter dan als vulling.** Letter `#E4F474`, vulling
   `#D2E04A`. Dat is precies het verschil dat de Komma-pil maakt.
4. **Eén geel per scherm draagt.** De foto blijft het meest verzadigde object;
   het geel is een knop, een lijn, één woord.
5. **`--ink-4` en `--line-strong` zijn lijnen.** Elke letter staat minstens op
   `--ink-3`. `scripts/dash-leesbaar.mjs` meet dit op de echte Worker.

## Geschiedenis

- tot aug 2026: Harbor (teal) → lime `#C6F100` (sectie 18)
- 5 sep 2026: Komma-geel gemeten op `#DEDA14` (sectie 20), dezelfde avond
  naar `#C8F206` ("een stuk meer toxic groen/gelig")
- 6 sep 2026: terug naar de meting — `#D2E04A`-familie, want `#C8F206` was
  verzadigder en groener dan alles in de Komma-beelden

## Logopakket

`E:\Claude (VISUAILS)\images\Logo\visuails-logo` — groen = `#D2E04A`,
zwart = `#111111`, wit = `#FFFFFF`. Bestaande bestanden, alleen herkleurd
(`scripts/make-logo-pack.mjs` voor de vlakke, `kladblok/herkleur-contour.mjs`
voor de contourbestanden); de vorm verandert nooit.

### Nagemeten op 7 september 2026

Elk bestand in die map is per pixel nagemeten. Zesentwintig contourbestanden
en de meeste vlakke stonden goed. Vijf niet, en dat waren precies de bestanden
die buiten een script om waren ontstaan:

| Bestand | Stond op | Nu |
|---|---|---|
| `Logo/visuails-mark-groen-2048.png` (los, naast de map) | `#C6F100` | vervangen door de versie uit het pakket |
| `png-tegel/visuails-tegel-groen-op-zwart-1024-vierkant.png` | `#C6F100` op `#08090B` | opnieuw gerenderd |
| `jpg/visuails-tegel-zwart-op-wit-1024.jpg` | zwart `#08090B` | opnieuw gerenderd |
| `Logo/2731698b-…png` (bron van de contourvariant) | `#C2EB02` + `#000000` | herkleurd |
| `Logo/ChatGPT_Image_19_jul_2026…png` (woordmerk) | `#16110C` | herkleurd |

**De les zit in het patroon.** Alles wat `npm run logo:pack` maakt, klopt —
één opdracht en de hele map staat weer goed. Wat níét uit dat script komt,
drijft af: een los bestand naast de map, een bron die iemand ooit heeft
aangeleverd, een render van vóór een kleurwissel. Voor die gevallen zijn er nu
twee gereedschappen, allebei met een meetstand die per bestand kijkt wat er
staat in plaats van het aan te nemen — twee keer draaien verandert dus niets
meer:

- `kladblok/herkleur-contour.mjs <bron> <doel> meet '#D2E04A'` — het groen
- `kladblok/herkleur-donker.mjs <bron> <doel> '#111111'` — het zwart
