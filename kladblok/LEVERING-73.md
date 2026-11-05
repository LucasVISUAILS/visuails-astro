# Levering 73: drie plannen voor later (5 november 2026)

Cloudsessie, branch `claude/voor-de-launch`, na levering 72. Je antwoord ("alles advies"): 15 = alle drie. Alleen
opgeschreven, **niets gebouwd**: geen code, geen migratie, geen zin op de site veranderd. Je kiest later via een
afvinklijst in de chat met de brug.

> **Naloop, 5 november:** het plan voor het weeksysteem is aangevuld (hoe hij draait, terug, toetsen) en de spellinglijst
> staat nu ook per pagina en per taal (`kladblok/TEKSTRONDE-SPELLING-PER-PAGINA.md`). Zie `kladblok/NALOOP-69-73.md`.

## 1 · De drie plannen

| Plan | Waar | Opties | Advies |
|---|---|---|---|
| Advertenties meten, zonder scripts van Meta, TikTok of Google op de site | `kladblok/PLAN-ADVERTENTIES-METEN.md` | A zelf laten zeggen en tellen zonder koppeling · B na toestemming de bestelling server-side terug (Conversions API) · C de pixels | **A nu, vóór de eerste advertentie; B voor Meta zodra je vast adverteert en de proef in de buurt van 50 keer per week betaald wordt** |
| Het weeksysteem echt opruimen, met een migratie | `kladblok/PLAN-WEEKSYSTEEM-OPRUIMEN.md` | 1 de wachtrij en de dag (in twee uitrollen) · 2 plus de dode functies · 3 plus de oude rekensom | **2, na de launch**; 3 pas na drie maanden echte abonnees |
| Een spellinglijst voor je tekstronde | `kladblok/TEKSTRONDE-SPELLING.md` | 1 alleen A en B bij je tekstronde · 2 eerst de scripts schoon · 3 allebei | **3** |

## 2 · Wat opviel tijdens het schrijven

- **De site legt nu nergens vast waar een klant vandaan komt** (geen `utm_*`, geen klik-id, geen "Waar zag je
  VISUAILS?"). Zonder plan A weet je na de eerste advertentie niet wat hij opleverde.
- **`subscriptions.window_day` staat in een index** (`idx_subs_status`): de migratie moet die index eerst laten
  vallen, en de code moet een uitrol eerder klaar zijn dan de migratie (UITROLLEN.bat draait migraties vóór de site
  live gaat).
- **De spellingcontrole vond één echte zin om naar te kijken in de voorwaarden**: "Onze beelden zijn geen pure
  machine-uitvoer: ze worden met de hand gecomponeerd, gecorrigeerd en …" (/nl/terms). Dat is precies het soort zin
  van je regel van 25 oktober, maar hij staat er als juridisch argument. Niet veranderd; staat bovenaan de lijst.
- **hunspell** staat niet standaard in een cloudsessie (en waarschijnlijk niet op je pc); voor de meting heb ik hem in
  deze sessie gezet.

## 3 · Nagekeken

- Geen code veranderd: de testreeks van levering 72 geldt ongewijzigd (zelfde code).
- Elke bewering in de plannen is nagelezen in de code van levering 72 (bestanden en regels staan erbij).

## 4 · Open punten

- Geen; de keuzes staan in de plannen.

## 5 · Mag weg

Niets.

## 6 · Voor het overzicht

- **§16.2:** drie nieuwe keuzes, elk met een plan: advertenties meten (A/B/C), het weeksysteem opruimen (1/2/3), de
  spellinglijst (1/2/3).
- **§17:** "geen herkomst van een bestelling vastgelegd" als punt erbij, tot plan A gebouwd is.

## 7 · Bestanden

- **Kladblok:** `kladblok/LEVERING-73.md` (dit bestand), `kladblok/TEKSTEN-73.md`,
  `kladblok/PLAN-ADVERTENTIES-METEN.md`, `kladblok/PLAN-WEEKSYSTEEM-OPRUIMEN.md`, `kladblok/TEKSTRONDE-SPELLING.md`,
  `kladblok/COMMIT-BERICHT.txt`.
