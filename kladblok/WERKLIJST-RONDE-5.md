# Werklijst ronde 5 (29 september 2026)

Bron: Lucas' antwoorden op de acht punten uit het rapport van ronde 4, plus drie
opdrachten erna. Werkwijze als altijd: eerst de stand in zijn map lezen (gedaan:
map = geleverde stand van ronde 4, niets nieuwers), dan per punt bouwen, testen in
de echte Worker (kladblok/_doorloop-worker.mjs), en pas daarna leveren.

Stand: [ ] nog niet · [~] bezig/half · [x] gedaan en nagekeken.

## A. De acht punten

- [x] A1 · (1) Laatste-maandmail en automatisch afsluiten na twaalf maanden: "goed".
      Staat er al (ronde 4). Alleen noteren, niets te doen.
- [x] A2 · (2) TEGOED AUTOMATISCH VERREKENEN. Tegoed = geld van een terugbetaling
      die de klant als tegoed nam (customer_credits, excl. btw). Nu: alleen een
      boekhouding, verrekenen met de hand. Nieuw:
      - [x] A2.1 Ontwerp vastleggen (wanneer, voor wie, hoe met btw, factuur, annuleren).
      - [x] A2.2 /account/me geeft het tegoed mee → bestelformulier toont "Tegoed −€ X".
      - [x] A2.3 /api/order: tegoed van de INGELOGDE klant (zelfde e-mail) gaat eraf;
            Mollie-bedrag lager; alles gedekt → geen Mollie, meteen betaald.
      - [x] A2.4 Afboeken in het grootboek pas als de bestelling betaald/bevestigd is.
      - [x] A2.5 Betaallink opnieuw (order-pay, herinnering, offerte): zelfde verrekening.
      - [x] A2.6 Factuur: regel "Verrekend tegoed" en "Te betalen".
      - [x] A2.7 Annuleren/terugbetalen van een bestelling met tegoed: tegoeddeel komt
            terug als tegoed (nooit als geld — regel 2 in tegoed.js).
      - [x] A2.8 Studio (tegel), /admin (bestelpagina, klantkaart), mails: kloppende tekst.
      - [x] A2.9 Voorwaarden/FAQ: wat er over tegoed staat.
      - [x] A2.10 Tests + doorloop in de browser.
- [x] A3 · (2b) Abonnees: bestelling annuleren en credits terug zolang Lucas nog niet
      heeft bevestigd. Bestaat als "losmaken" tot de week gestart is (queueUnlock).
      Nakijken of Studio dat duidelijk zegt; mening over conversie.
- [x] A4 · (3) Verlopen machtiging alleen melden: "goed". Staat er al.
- [x] A5 · (4) BEDRIJF EN BTW-NUMMER, SIMPEL VOOR DE KLANT. Probleem: een bedrijf
      buiten de EU (VS) heeft geen btw-nummer. Ontwerp per land:
      NL → KVK-nummer; EU → btw-nummer (optioneel, zonder = 21%); buiten de EU →
      geen nummer nodig. Altijd: bedrijfsnaam verplicht + bevestiging "zakelijk".
      - [x] A5.1 Huidige logica lezen (OrderFlow, pipeline, order.js, PlanPicker, subscribe.js).
      - [x] A5.2 Abonnementsformulier gelijktrekken met het bestelformulier.
      - [x] A5.3 Server dwingt het af (niet alleen de browser).
      - [x] A5.4 Teksten (formulier, FAQ, voorwaarden) + tests.
- [x] A6 · (5) Vaste week: ook bij maandabonnement → voorwaarden/teksten aanpassen.
- [x] A7 · (6) VOORRANG: een harde, waardevolle, haalbare termijn bedenken en overal
      doorvoeren (pricing.js, bestelformulier, voorwaarden, FAQ, mails, admin/planning).
- [x] A8 · (7) VERWERKERSOVEREENKOMST juridisch nakijken (art. 28 AVG, EDPB,
      Autoriteit Persoonsgegevens, subverwerkers, doorgifte buiten de EU), NL + EN,
      zin "nog niet door een jurist bekeken" weg, daarna tweede volledige controle.
- [x] A9 · (8) NL overal "carrousel"; "stockfoto's" → "maandset"; beelden NIET verbergen.

## B. Volledige browsercheck: welke mogelijkheden zijn nog niet gebruikt?

- [x] B1 Lijst van alle functies op de site, Studio en /admin maken en afstrepen
      tegen WERKLIJST-DOORLOOP.md.
- [x] B2 Wat nog niet in de browser gebruikt is: gebruiken, fouten oplossen.

## C. Volledige controle: bugs en spelling NL/EN

- [x] C1 Openbare pagina's NL (tekstextracten uit dist).
- [x] C2 Openbare pagina's EN.
- [x] C3 Studio, klantmails, portaal.
- [x] C4 /admin en studiomails.
- [x] C5 Code: bugs (tweede lezer).
- [x] C6 Bevindingen verwerken, build, suite, scans.

## D. Beter, efficiënter, overzichtelijker, compacter

- [x] D1 Openbare site (alle pagina's).
- [x] D2 VISUAILS Studio.
- [x] D3 Adminportaal.
- [x] D4 Duidelijke verbeteringen doorvoeren; grotere voorstellen met mening +
      alternatief in het rapport.

## E. Afronden

- [x] E1 Build, volledige suite, scans (leesbaar, knoppen, spatie, breedte, links).
- [x] E2 Stand in zijn map opnieuw lezen, vergelijken, leveren.
- [x] E3 Rapport: wat is veranderd (belangrijk), waar zijn mening nodig is.


## Verslag van de uitvoering (30 september 2026)

- A2: in de browser doorlopen — deels met tegoed (Mollie kreeg bruto min tegoed),
  helemaal met tegoed (geen Mollie, meteen betaald, factuur met tegoedregel),
  annuleren met terugbetalen (tegoeddeel terug als tegoed, Mollie-deel terug,
  creditnota na de webhook). Scripts: kladblok/_dl-ronde5-tegoed.mjs en
  _dl-ronde5-annuleer.mjs.
- A5: bestelformulier en abonnementsformulier per land (VS zonder nummer betaalt
  meteen tegen 0%, NL eist KVK, DE zonder btw-nummer 21% en eerst nagekeken).
  Scripts: _dl-ronde5-land.mjs en _dl-ronde5-plan.mjs.
- A7: voorrang rekent nu ook met Nederlandse feestdagen (Algemene termijnenwet),
  staat op /pricing en in de FAQ.
- A8: DPA NL+EN, privacy NL+EN, voorwaarden §7/§8/§10, verwerkingsregister.
- C: bugs uit de drie doorlichtingen (admin, Studio/mails, openbare tekst) en
  de NL/EN-tekstfouten verwerkt; tegenstrijdige beloftes staan in het rapport.
- D: zie het rapport — de laagrisico-verbeteringen zijn doorgevoerd, de grotere
  keuzes liggen bij Lucas.
- E: build, volledige suite (KLAAR, geen FAIL), leesbaar/knoppen/spatie/breedte/
  links schoon.
