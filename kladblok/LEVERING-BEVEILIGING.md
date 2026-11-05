# Levering: de beveiliging en de back-end sterker (5 november 2026)

> **NOG NIET AF** (deze notitie wordt bij elke push bijgewerkt):
> - De naloop: drie van de vier delen zijn binnen en nagekeken; het deel over de openbare API, de webhooks en de cron
>   loopt nog (opnieuw gestart, zie het plan).
> - De reparaties, stap 1 tot en met 13 in `kladblok/PLAN-BEVEILIGING.md` §4: nog geen enkele gedaan.
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
