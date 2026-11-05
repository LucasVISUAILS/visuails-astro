# Tekstronde: wat de spellingcontrole vindt (5 november 2026)

Levering 73, plan 3 van 3. **Er is geen enkele zin veranderd.** Dit is een lijst om naast je tekstronde
(TEKSTEN.bat) te leggen. Je kiest later via een afvinklijst in de chat met de brug.

## Hoe gemaakt

- `npm run spelling` (hunspell, Nederlands en Brits Engels, over de zichtbare tekst van elke gebouwde pagina) en
  `npm run audit:tekst` (punt zonder spatie, dubbel woord, lege link, te korte omschrijving), op de build van
  levering 71 met de launchset uit: 95 pagina's.
- **hunspell stond niet in deze cloudsessie**; ik heb hem er voor deze meting bij gezet (`hunspell`, `hunspell-nl`,
  `hunspell-en-gb`). Op jouw pc staat hij waarschijnlijk ook niet: `npm run spelling` werkt daar dan niet. Dat
  hoeft niet: deze lijst is de uitkomst.
- Uitkomst: **259 woorden** die het woordenboek niet kent in de eigen taal van de pagina, en 128 woorden uit de
  andere taal (bijna allemaal met opzet: Catalog, Lifestyle, on-model, feed, Reels). `audit:tekst`: 28 meldingen.

## A · Om naar te kijken (een mens beslist)

| Wat | Waar | Waarom het opvalt |
|---|---|---|
| "…achter de **prijs.Verkoop** je een set…" / "…behind the **price.Selling** a set…" | /start/lifestyle en /nl/start/lifestyle, het uitklapvak bij "Stukken die samen gedragen worden?" | **een echte fout** (gevonden in de naloop): twee zinnen zonder spatie aan elkaar. `OrderFlow.astro` r. 2929 zette `{LC.waarom} {LC.set}` neer en de build slikte de spatie in. **Gerepareerd** op 5 november (naloop deel 9, op Lucas' "ja"). |
| "or a whole product at **once once** you have looked at its images" | /studio (EN), `StudioHal.astro` › `galleryLede` | twee keer "once" achter elkaar: leest als een fout, ook al klopt de zin |
| "Onze beelden zijn geen pure machine-uitvoer: ze worden **met de hand** gecomponeerd, gecorrigeerd en …" | /nl/terms (de voorwaarden, over het auteursrecht) | dit is precies de soort zin van je regel van 25 oktober (geen verdedigende zinnen over AI). Hij staat in de voorwaarden als juridisch argument, dus niet zomaar weghalen: eerst kijken wat de Engelse versie zegt en of het argument nodig is. |
| "**met de hand**" (de rest) | /nl/thank-you ("we lossen het met de hand op"), /nl/faq en /nl/hooks ("Hooks plannen we met de hand in"), het formulier op /nl/start/catalog, /nl/start/lifestyle, /nl/start/video en /nl/test-sample ("Dan controleren we het met de hand", "met de hand geoffreerd"), /nl/terms, de verwerkersovereenkomst | deze gaan over een probleem oplossen, plannen of een prijs maken, niet over de beelden. Toch dezelfde woorden: jij beslist. |
| "**Campagnekwaliteit-afwerking** op elke lifestylefoto" | /nl/lifestyle/glow | een koppelteken in een Nederlandse samenstelling; leest stroef |
| "Authentieke, **telefoon-echte** lifestyle-scènes" | /nl/lifestyle/phone-made | een nieuw woord met koppelteken; leest als vertaald |
| "Lang, **laaghoekig** licht" / "Warm, **laaghoekig** licht" | /nl/lifestyle/dunes, /nl/lifestyle/glow | geen bestaand woord ("licht van laag bij de horizon"?) |
| "**eenrichtings-gehashte**", "**eenrichtings-versleutelde**", "**eenrichtings-SHA**" | /nl/privacy | het koppelteken staat op een plek waar het Nederlands er geen zet |
| "tegen normale **catalogus-snelheid** en -prijs" | /nl/catalog/custom | de site zegt overal "catalog", hier "catalogus", en met koppelteken |
| "dezelfde verplichtingen **doorlegt**" | /nl/verwerkersovereenkomst | bestaat, maar zelden; "oplegt" of "doorgeeft" is gewoner |
| "voorbeeld", "voorpagina" | /voorbeeld/uitleg (EN) | Nederlandse woorden op een Engelse pagina (het adres van een voorbeeldpagina) |

## B · Hetzelfde woord, twee schrijfwijzen

| Zo | En zo | Advies |
|---|---|---|
| catalogstijl (1×) | catalog-stijl (1×), Catalog-stijlen (2×), catalog-look (3×) | één vorm kiezen; de rest van de site schrijft aaneen (catalogset, catalogbeeld, catalogfoto) |
| catalogset (14×), Catalogset (10×) | catalogsets, Catalogsets | goed zo |
| lifestylescène, Lifestylescènes | lifestyle-scènes (2×), Dunes-scène, Flash-scène | met een stijlnaam ervoor mag het koppelteken; zonder liever aaneen |
| privélink (4×), Privélink | privé-webadres (1×) | goed zo, maar "privélink" is het woord dat de site overal gebruikt |
| e-mailbanner, E-mailheaders | | goed zo |

## C · Geen fout (voor de woordenlijst van het script)

- **Samenstellingen** die het woordenboek niet kent maar goed zijn: Cookievoorkeuren, adminportaal, cookieloze,
  paginatellingen, gestylede, productvisuals, Shootdag, betaallink, inloglink, shoplink, maandset, botcontrole,
  webshoppagina, mapnaam, merkneutraal, studiodag, fashionmerk, Hexwaarde, productmappen, bannerformaat, en zo'n
  honderd meer van dezelfde soort.
- **Namen en merken:** VISUAILS, Magnific, ByteDance, BytePlus, Bancontact, Blackmagic, Turnstile, Resend, de
  namen van de modellen (Maegan, Fabi, Seme), Málaga, en een achternaam en een straatnaam in de voorwaarden en de
  privacyverklaring.
- **Afkortingen en codes:** excl, incl, px, NL, com, nl, mnd, vr, za, HK, NDA, STD, MP, FFFFFF en EFEFEF (kleurcodes),
  `trainedAlgorithmicMedia` en `DigitalSourceType` (de herkomsttag), LEESMIJ.txt.
- **Engels met opzet in het Nederlands:** de citaten uit de voorwaarden van Magnific en Adobe op /nl/privacy en
  /nl/verwerkersovereenkomst ("Under no circumstances …", "For Content stored locally …"), en de namen van de
  sferen op /nl/custom-models (Quiet luxury, Coastal sun-worn, Bold colour-block).
- **Twee blinde vlekken in de scripts zelf**, die meldingen geven die er niet zijn:
  1. `spelling.mjs` knipt een woord op het zachte afbreekstreepje (`&shy;`): "Aansprakelijkheids|beperkingen" en
     "vestigings|adres" komen er als twee halve woorden uit.
  2. `audit-tekst.mjs` kent de klasse `h-regel` niet als blok: "Catalog photos.Every one alike." is in de pagina
     twee regels van de kop, met niets ertussen omdat ze onder elkaar staan. In de naloop elke melding "punt zonder
     spatie" in een browser nagekeken (de tekst zoals hij op het scherm staat): 14 van de 16 staan op twee regels of
     zijn een verborgen variant (de zin voor credits naast die voor euro's). De andere 2 zijn de echte fout bovenaan
     A. De 5 "dubbel woord" zijn "Plus Five Five, Inc." (de naam van Resend, 4×) en "at once once" hierboven.

## De volledige lijst

Per pagina en per taal, met elk woord en elke melding: **`kladblok/TEKSTRONDE-SPELLING-PER-PAGINA.md`** (naloop,
5 november). Daar staat bij elke pagina wat de spellingcontrole en `audit:tekst` er vinden, met een ● bij wat in A en
B staat.

## Opties

1. **Alleen A en B bij je tekstronde.** Je legt deze lijst naast TEKSTEN.bat en past aan wat je wilt. Kost: jouw tijd,
   ± een half uur voor A en B.
2. **Eerst de scripts schoon.** Claude zet C in de woordenlijst van `spelling.mjs` en repareert de twee blinde
   vlekken, zodat een volgende meting alleen nog laat zien wat echt naar een mens moet. Geen zin verandert. Kost:
   ± een kwart levering.
3. **Allebei**, in die volgorde.

## Advies

**3.** Eerst 2 (dan wordt de lijst bij elke nieuwe stijl kort en bruikbaar), dan A en B in je volgende tekstronde.

## Wat jij zelf doet

Bij optie 1 en 3: in TEKSTEN.bat de regels van A en B opzoeken (filter op de kolom "waar") en je versie in "Nederlands
nieuw" of "Engels nieuw" typen. Niets aan te maken, geen kosten buiten de levering.
