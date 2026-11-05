# Naloop van leveringen 69 en 73 (5 november 2026)

> **NOG NIET AF** (deze notitie wordt bij elke push bijgewerkt):
> - Deel 8: de spellinglijst per pagina en per taal.
> - Deel 1: `test:scheiding` uitbreiden met bijkopen en de maandset.
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
