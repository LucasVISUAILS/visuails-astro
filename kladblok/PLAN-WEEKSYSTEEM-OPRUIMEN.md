# Plan: het weeksysteem echt opruimen, met een migratie (5 november 2026)

Levering 73, plan 2 van 3. Alleen opgeschreven, niets gebouwd en geen migratie geschreven. Je kiest later via een
afvinklijst in de chat met de brug.

## Waarom

Het weeksysteem (een vaste week per maand, een wachtrij van de klant) is sinds 8 oktober weg uit de site: het
abonnement werkt met credits (overzicht §28). In levering 69 is de wachtrij uit de code gehaald. Wat er nog staat,
is opslag zonder lezer, en die kost op drie plekken: in elke wijziging moet iemand weten dat het dood is, de
AVG-export en het wissen moeten er rekening mee houden, en `plan_queue` bevat vrije tekst die klanten zelf typten.

## Wat er nog staat (nagekeken op de code van levering 71)

| Wat | Waar | Leest iemand het nog? |
|---|---|---|
| De tabel `plan_queue` en drie indexen | `schema.sql` r. 1258 – 1323, migraties 0030 en 0036 | Nee. Alleen het AVG-wissen (`src/lib/admin.js` r. 2416, `DELETE FROM plan_queue WHERE customer_id = ?1`) en een rij in `tests/retention.test.mjs` (r. 311) die bewijst dat de opruiming hem niet meer leest. |
| De kolom `subscriptions.window_day` | `schema.sql` r. 1087, de index `idx_subs_status (status, window_day)` | Nee, maar hij staat nog in drie SELECT's en de INSERT: `src/lib/subscription.js` r. 202, 672, 680, 950; `functions/api/webhook/mollie.js` r. 971 en 1000 (`windowDay` gaat mee naar een mail die hem niet gebruikt); `cron/index.js` r. 1447. |
| Vijf functies voor slots zonder aanroeper | `src/lib/slots.js`: `verbruikCredits`, `geefCreditsTerug`, `verbruikSlot`, `geefSlotTerug`, `slotToegestaan` (en de doorgifte in `subscription.js`) | Alleen hun eigen toetsen: `tests/slots.test.mjs`, `abo-keten`, `abo-misbruik`. |
| `rollover` per looptijd | `src/data/plans.js` (`PLAN_ROLLOVER_MONTHS`, `rolloverMonths`, `rolloverDetail`) | Ja: `planState` rekent er nog mee over `subscription_months` en `subscription_slots`, en `planState` wordt gelezen door Studio, /admin, de webhook en de cron. Geen scherm toont de uitkomst als geldigheid (levering 69, §17 punt 15). |

## Drie opties

### 1 · Klein: alleen de wachtrij en de dag

1. **Eerst de code, zonder migratie** (één uitrol): `window_day` uit de SELECT's, de INSERT, de webhook en de cron;
   het AVG-wissen van `plan_queue` en de rij in `retention.test` weg; `schema.sql` bij.
2. **Een uitrol later de migratie** `0069-weeksysteem-weg.sql`:
   `DROP INDEX IF EXISTS idx_subs_status;` · `ALTER TABLE subscriptions DROP COLUMN window_day;` ·
   `CREATE INDEX IF NOT EXISTS idx_subs_status ON subscriptions(status);` · de drie indexen van `plan_queue` en
   `DROP TABLE IF EXISTS plan_queue;`.
- **Waarom in twee stappen:** UITROLLEN.bat draait de migraties vóór de nieuwe site live staat. Met alles in één
  uitrol leest de oude site een paar minuten een kolom die er niet meer is: elke abonnementspagina en elke
  betaling van een abonnee geeft dan een fout. **Waarom de index eerst:** SQLite laat een kolom niet vallen die in
  een index staat.
- **Werk:** een halve levering. **Risico:** klein, met een back-up vooraf (BACKUP.bat).

### 2 · Middel: 1, plus de dode functies

Optie 1, en de vijf functies uit `slots.js` met hun toetsen. `subscription_months` en `subscription_slots` blijven,
want `planState` leest ze nog.
- **Werk:** een levering. **Risico:** klein; de toetsen van de credits (creditboek, abo-credits, spaarplafond)
  bewaken wat er overblijft.

### 3 · Groot: 2, plus de oude rekensom

Optie 2, en `planState` laten rekenen uit het creditboek in plaats van uit `subscription_months` /
`subscription_slots`; dan kan `rollover` uit `plans.js`, en in een latere migratie kunnen die twee tabellen weg.
- **Werk:** twee tot drie leveringen, omdat Studio, /admin, de webhook, de cron en de factuur allemaal `planState`
  lezen. **Risico:** middel: dit raakt het geld van abonnees. Pas zinnig als het creditboek een paar maanden met
  echte abonnees gedraaid heeft en de twee rekensommen naast elkaar hetzelfde zeiden.

## Advies

**Optie 2, na de launch, in de stille week na een maandwissel.** Optie 3 pas na drie maanden echte abonnees, met
eerst een toets die `planState` en het creditboek op dezelfde abonnees naast elkaar legt.

## Wat jij zelf doet

- Voor de migratie: **BACKUP.bat** (de back-up van de live database). De migratie zelf draait mee met
  UITROLLEN.bat, zoals elke migratie; er is niets in Cloudflare met de hand te doen.
- Niets aan te maken, geen nieuwe sleutel.

## Kosten

Geen bedrag: geen nieuwe dienst, geen abonnement. Alleen de leveringen hierboven en twee uitrollen.

## Wat er voor een klant verandert

Niets. Er is geen scherm, mail of factuur die iets van dit alles toont. Wel goed nieuws voor de AVG: de vrije tekst
in `plan_queue` (wat klanten in de wachtrij typten) is na de migratie echt weg, ook uit de back-ups die daarna komen.
