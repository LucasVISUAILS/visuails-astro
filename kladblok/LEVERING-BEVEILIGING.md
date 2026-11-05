# Levering: de beveiliging en de back-end sterker (5 november 2026)

> **NOG NIET AF** (deze notitie wordt bij elke push bijgewerkt):
> - De reparaties: stap 1 is af. Stap 2 tot en met 19 in `kladblok/PLAN-BEVEILIGING.md` §4 nog niet (stap 14 tot en
>   met 19 kwamen uit het vierde deel van de naloop, de betaal- en bestelroutes; zie daar).
> - De eindcontrole.

Cloudsessie, branch `claude/voor-de-launch`. Het plan, met wat niet kapot mag en de nacontrole per stap, staat in
`kladblok/PLAN-BEVEILIGING.md`. Het nummer van deze levering laat ik aan de chat met de brug.

## Stap 0 · Het vangnet (af)

Eerst vastgelegd wat er nu goed werkt, zodat elke wijziging die het breekt meteen rood wordt:
**`tests/vangnet-beveiliging.test.mjs`** (`npm run test:vangnet`, in de keten, 40 controles):
- **/admin van begin tot eind met de tweede stap aan**, zoals Chrome het doet: wachtwoord → halve sessie → het scherm
  van de code → een verkeerde code geweigerd → de goede code → het dashboard en de pagina Beveiliging ("aan") →
  uitloggen, waarna het oude koekje niets meer opent; de tweede stap staat daarna nog aan.
- **De Origin-controle van /admin en Studio** in elke combinatie die een browser stuurt, ook `Origin: null` onder
  `Sec-Fetch-Site: same-origin` (de fout van 1 augustus, waar geen toets voor was).
- **De headers en koekjes** waar het op leunt: `referrer-policy: same-origin`, de CSP van /admin, HSTS, nosniff,
  no-store, `vis_admin` met HttpOnly, Secure, SameSite=Strict en Path=/admin.

**Nagekeken dat hij echt alarm slaat:** op een kopie van de code in het kladblok (zodat de echte code nooit kapot
staat) zes keer iets gebroken: de Origin-controle zoals op 1 augustus, een halve sessie die als hele telt, elke code
aangenomen, het koekje op Lax, `no-referrer`, en de Origin-controle van Studio uit. **Alle zes rood.**

**En door de echte Worker heen:** `kladblok/_e2e-beveiliging.mjs` logt van buitenaf in op de lokaal draaiende Worker
(`kladblok/_doorloop-worker.mjs`: de gebouwde site met een eigen D1 en R2, en een nep-Mollie en nep-Resend), met de
tweede stap aan en de headers van Chrome, doet een POST zoals Chrome onder `no-referrer`, opent Beveiliging, logt uit,
en kijkt naar Studio en de headers. Nulmeting op de code van vóór deze levering: **19 van 19**.

## Stap 1 · De grens van 100 waarden per query (af)

**Het gat.** D1 neemt hoogstens 100 gebonden waarden per query; daarboven: "too many SQL variables". Op negen plekken
ging een lijst met één `?` per bestelling, klant, adres of beeld in één query. Zolang de zaak klein is gaat dat goed;
daarna breekt het, en meestal stil:
- **/admin**: het dashboard toont tot 200 bestellingen en vroeg de modellen van al hun klanten in één query. Vanaf 101
  verschillende klanten: een **500**, dus geen dashboard. De rode pil "teruggeboekt" en de markering "mail kwam niet
  aan" vielen om dezelfde reden **stil** weg (hun fout werd opgevangen).
- **/admin, een klant wissen**: met meer dan 100 bestellingen niet te wissen (het faalde wel veilig, vóór er iets weg
  was).
- **Studio**: de tevredenheid bij meer dan 100 afgeronde bestellingen; een revisieronde of het nakijken met meer dan
  ongeveer 97 aangevinkte beelden; Formaten.
- **De privélink**: een revisieronde met meer dan 99 beelden gaf "even niet bereikbaar"; de mail aan de studio
  noemde de beelden dan niet bij naam.
- **De nachtelijke opruiming**: vraagt tot 400 bestanden in één keer op en zou vanaf 101 elke nacht omvallen, zodra
  de rem `PURGE_ENABLED` los gaat.

**De reparatie.** Eén hulpje, `src/lib/d1Lijst.js`: vraag in groepen van 80 (ruimte voor de andere `?`-plekken),
na elkaar, en plak de rijen aan elkaar. Bij een lijst tot 80 verandert er niets: één query, zoals voorheen. Op de twee
plekken waar de volgorde over de hele lijst ertoe deed, wordt daarna nog één keer gesorteerd.

**Het bewijs.** De nep-D1 van de toetsen (`tests/lib/d1sqlite.mjs`) kan nu de echte grens afdwingen
(`d1(db, { maxWaarden: 100 })`). `tests/backend-sterker.test.mjs` (`npm run test:backend`, in de keten) speelt elk
geval na met de echte aantallen: /admin met 200 bestellingen van 150 klanten, 120 bestellingen in Studio, 110 beelden
op de privélink, een klant met 120 bestellingen wissen, 150 verlopen bestanden opruimen. **Op de oude code 9 controles
rood, op de nieuwe 15 van 15 groen.**

**Nacontrole.** De 2FA-set (vangnet 40, tweede stap 51, beveiliging 40, 8 oktober 17, 69 24, klantscheiding 161,
inloggen, /admin), de toetsen van de nachtelijke taak (opruimen 46, nachtgrenzen 65), en de hele testreeks:
**286 van 286 groen**. De diff regel voor regel teruggelezen: hij raakt geen inlog, geen koekje, geen Origin-controle,
geen betaling en geen mail; alleen hoe negen lijsten worden opgevraagd.
