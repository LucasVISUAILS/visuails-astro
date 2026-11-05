# Levering: de beveiliging en de back-end sterker (5 november 2026)

> **NOG NIET AF** (deze notitie wordt bij elke push bijgewerkt):
> - Stap 0, het vangnet: `tests/vangnet-beveiliging.test.mjs` staat (40 controles, groen). Nog te doen: nagaan dat hij
>   echt rood wordt als de tweede stap of de Origin-controle breekt (een proef met de code even kapot).
> - Stap 1, de naloop van de hele site: loopt (/admin, Studio en de privélink, de openbare API met de webhooks en de
>   cron, en wat overal geldt: headers, koekjes, geheimen, afhankelijkheden).
> - Stap 2 en verder: de reparaties, elk met een toets, en de eindcontrole.

Cloudsessie, branch `claude/voor-de-launch`. Het plan, met wat niet kapot mag en de nacontrole per stap, staat in
`kladblok/PLAN-BEVEILIGING.md`. Het nummer van deze levering laat ik aan de chat met de brug.
