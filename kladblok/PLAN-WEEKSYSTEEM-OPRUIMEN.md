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
   `DROP TABLE IF EXISTS plan_queue;`. **In dezelfde levering** gaan de aanmaakregels uit de oude migraties (zie
   "Hoe het draait" hieronder), anders komt alles terug.
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

## Hoe het draait (aangevuld 5 november, naloop)

Drie dingen in `scripts/migrate.mjs` en `scripts/uitrol.mjs` bepalen hoe deze migratie eruit moet zien:

1. **UITROLLEN.bat draait alleen de nieuwe migraties, bij naam** (`node scripts/migrate.mjs 0069`, stap 5 in
   `uitrol.mjs`). Een migratie met `DROP TABLE` slaat `migrate.mjs` anders over ("bouwt een tabel om"); bij naam
   draait hij wel. Je hoeft dus niets met de hand te doen: UITROLLEN.bat draait hem bij de uitrol.
2. **`npm run migrate` zonder nummer draait ÁLLE migraties opnieuw**, met opzet, zodat een afgebroken run gewoon
   opnieuw kan. Gevolg: `0030-abonnementen.sql` maakt `plan_queue` dan opnieuw aan (leeg), en
   `CREATE INDEX IF NOT EXISTS idx_subs_status ON subscriptions(status, window_day)` loopt vast op de kolom die er
   niet meer is: **elke volgende migratie strandt dan**. Dat is precies de storing van 12 september (index
   `idx_order_tokens_live`), en de oplossing is dezelfde als toen in `0001`: in dezelfde levering de aanmaakregels
   in de oude migraties uitzetten (als commentaar laten staan, met de reden):
   - `0030`: `CREATE TABLE IF NOT EXISTS plan_queue (…)` en zijn indexen; `idx_subs_status` wordt `(status)`;
   - `0036`: de drie `ALTER TABLE plan_queue ADD COLUMN` en `idx_plan_queue_window`.
   De kolom `window_day` zelf staat in de `CREATE TABLE subscriptions` van 0030; die doet op een bestaande database
   niets (`IF NOT EXISTS`), dus die regel mag blijven of mee uit `schema.sql`.
3. **`ALTER TABLE … DROP COLUMN` kent `migrate.mjs` nog niet.** Een tweede run (na een afgebroken uitrol) zou op
   "no such column" stranden. Erbij in `decide()`: `DROP COLUMN` overslaan als de kolom er al niet meer is, zoals
   `ADD COLUMN` nu wordt overgeslagen als hij er al is. SQLite (en dus D1) laat een kolom pas vallen als er geen
   index meer op staat; daarom staat de `DROP INDEX` ervoor.

## Terug, als het misgaat

- **Vooraf:** BACKUP.bat, keuze 2 (een back-up nu), en keuze 3 (de proef: die back-up terugzetten in een lege
  database op je pc; er verandert niets live). Dan weet je dat de back-up van vandaag te gebruiken is.
- **Strandt de migratie halverwege:** niets terugzetten. De opdrachten zijn los; draai UITROLLEN.bat opnieuw, en wat
  al gebeurd is wordt overgeslagen (met de aanpassing van punt 3 hierboven ook de `DROP COLUMN`).
- **Werkt de site daarna niet:** eerst TERUGDRAAIEN.bat (de vorige versie van de site). De oude code leest
  `window_day` nog op drie plekken, dus **daarom gaat de code één uitrol vóór de migratie**: de versie waar je naar
  terugdraait, leest de kolom dan al niet meer.
- **De gegevens zelf terug** (bijna nooit nodig: in `plan_queue` staat niets meer dat gebruikt wordt): D1 kan een
  database terugzetten naar een moment in de afgelopen dagen (Time Travel: 7 dagen op het gratis plan, 30 op Workers
  Paid), of de back-up van vóór de migratie terug volgens `scripts/TERUGZETTEN.txt`. Dat doet Claude samen met jou;
  het is een opdracht op de echte database.

## Welke toetsen het bewaken

- **`tests/migratievolgorde.test.mjs`** (bestaat al): faalt zolang 0030 of 0036 nog iets aanmaakt wat 0069 weghaalt.
  Hij vangt punt 2 hierboven vanzelf; er komt een regel bij die `plan_queue` en `window_day` bij naam noemt, zoals hij
  dat voor `idx_order_tokens_live` doet.
- **Nieuw, voor `migrate.mjs`:** er is nog geen toets voor `decide()` (wat er wordt overgeslagen). Die functie los
  te roepen maken, met de lezer van de kolommen als argument, en toetsen: `ADD COLUMN` op een bestaande kolom en
  `DROP COLUMN` op een kolom die er niet meer is, worden allebei overgeslagen.
- **Een toets die de migratie echt draait** op een kopie, met `node:sqlite` zoals `tests/lib/d1sqlite.mjs`: een
  database uit het huidige `schema.sql` (met `plan_queue` en `window_day`), dan 0069 via `decide()` twee keer achter
  elkaar, en daarna alle migraties nog eens zoals `npm run migrate` ze draait. Zonder fout, en daarna `plan_queue` weg
  en `window_day` weg.
- **De toetsen die nu `plan_queue` of `window_day` noemen**, gaan mee: `retention.test` (de rij met de oude batch),
  `abonnement-zonder-week.test` (leest nu dat niets `window_day` schrijft), `abo-misbruik.test` en de AVG-export in
  `admin` (de tabel staat in de lijst van wat er van een klant gewist wordt).
- **De hele reeks** daarna, en `npm run worker` met een abonnee die een maand doorloopt (`test:doorloop` doet dat al).

## Advies

**Optie 2, na de launch, in de stille week na een maandwissel.** Optie 3 pas na drie maanden echte abonnees, met
eerst een toets die `planState` en het creditboek op dezelfde abonnees naast elkaar legt.

## Wat jij zelf doet

- Voor de migratie: **BACKUP.bat**, keuze 2 en daarna keuze 3 (zie "Terug" hierboven). De migratie zelf draait mee
  met UITROLLEN.bat, zoals elke nieuwe migratie; er is niets in Cloudflare met de hand te doen.
- Twee uitrollen, met minstens een dag ertussen: eerst de code, dan de migratie.
- Niets aan te maken, geen nieuwe sleutel.

## Kosten

Geen bedrag: geen nieuwe dienst, geen abonnement. Alleen de leveringen hierboven en twee uitrollen.

## Wat er voor een klant verandert

Niets. Er is geen scherm, mail of factuur die iets van dit alles toont. Wel goed nieuws voor de AVG: de vrije tekst
in `plan_queue` (wat klanten in de wachtrij typten) is na de migratie echt weg, ook uit de back-ups die daarna komen.
