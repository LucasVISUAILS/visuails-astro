# Naloop van leveringen 69 en 73 (5 november 2026)

> **NOG NIET AF** (deze notitie wordt bij elke push bijgewerkt):
> - De hele testreeks aan het eind.

Lucas vroeg of alles van `kladblok/PROMPT-CLOUD-CODE.md` af was. Drie punten waren half gedaan en konden zonder hem
of zijn beelden af; die staan hier. De rest (Windows, de beelden, de opening) staat open in de notities van 69 tot en
met 73.

## Deel 7 · Het plan voor het weeksysteem (73) aangevuld

`kladblok/PLAN-WEEKSYSTEEM-OPRUIMEN.md` noemde "hoe je terug kunt" maar in één regel, en de toetsen die het bewaken
niet. Nu erbij: "Hoe het draait", "Terug, als het misgaat" en "Welke toetsen het bewaken". Gevonden tijdens het
nalezen, en belangrijk voor het plan zelf:
- `npm run migrate` zonder nummer draait **alle** migraties opnieuw. Zonder aanpassing maakt `0030` dan `plan_queue`
  weer aan, en loopt `idx_subs_status (status, window_day)` vast op de kolom die weg is: elke volgende migratie
  strandt. Zelfde soort storing als 12 september; zelfde oplossing (de aanmaakregels in 0030 en 0036 uitzetten).
- `migrate.mjs` kent `DROP COLUMN` nog niet: een tweede run na een afgebroken uitrol zou stranden. Erbij in het plan.
- UITROLLEN.bat draait een nieuwe migratie bij naam, dus ook een met `DROP TABLE`; met de hand hoeft niets.

## Deel 8 · De spellinglijst per pagina en per taal (73)

`kladblok/TEKSTRONDE-SPELLING.md` groepeerde per soort fout, met hoogstens een paar pagina's per woord. Nu erbij:
**`kladblok/TEKSTRONDE-SPELLING-PER-PAGINA.md`**: per pagina en per taal elk woord dat de spellingcontrole niet kent
en elke melding van `audit:tekst` (89 pagina's met iets eigens; wat op elke pagina staat, zoals het menu en de voet,
één keer bovenaan). Gemaakt met een kopie van de twee scripts in het kladblok van de sessie, met dezelfde regels; de
scripts zelf zijn niet veranderd.

Gevonden tijdens het nalezen: **één echte fout**. In het uitklapvak "complete look" op /start/lifestyle (NL en EN)
staan twee zinnen zonder spatie aan elkaar ("…achter de prijs.Verkoop je een set…"); `OrderFlow.astro` r. 2929 zet
`{LC.waarom} {LC.set}` neer en de build slikt de spatie in. Niet gerepareerd (deze naloop verandert niets aan de site);
staat bovenaan A in `TEKSTRONDE-SPELLING.md`, met de reparatie van één regel. Mijn eerdere zin dat "bijna alle" 16
meldingen "punt zonder spatie" regels onder elkaar waren, is nagekeken in een browser: 14 van de 16, en deze 2 niet.

## Deel 1 · `test:scheiding` uitgebreid (69 C)

`tests/klant-scheiding.test.mjs` kreeg twee blokken, van 144 naar 161 controles:
- **6 · bijkopen:** `/account/plan?bijkoop=<nummer>` met het nummer van een open aankoop van A. Als B: geen verzoek naar
  Mollie, niets veranderd in de database (de aankoop van A blijft open), niets van A te zien (de betaling, het bedrag,
  het merk). Zonder sessie: niets. De controle is A zelf: met hetzelfde nummer gaat er wél een verzoek naar Mollie,
  voor precies die betaling.
- **7 · de gedeelde maandset:** één beeld en de zip. A met een lopend abonnement krijgt ze (de controle); B zonder
  abonnement niet, en voor B wordt niets uit R2 gelezen; zonder sessie niets; een set die nog niet gepubliceerd is,
  krijgt ook A niet; een abonnement dat nog op de eerste incasso wacht, geeft nog geen set.
- **Nagekeken dat ze iets bewaken:** de eigendomscontrole in `aankoopVanKlant` (`bijkopen.js`) en `maandsetToegang`
  (`account.js`) even verzwakt: blok 6 werd rood (2) en blok 7 (4); daarna teruggezet. Aan de site zelf is niets
  veranderd.
