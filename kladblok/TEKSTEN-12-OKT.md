# Teksten van 12 oktober 2026 (NL en EN, met plek)

Naslag bij afvinklijst 5. B4 = abonnement (spaarplafond, extra credits bijkopen). K6 = back-ups 3, "Telefoon of WhatsApp", ontbrekende hoekfoto's, PNG en WebP met FORMATEN.bat.

# Teksten B4 (12 okt 2026)

Per tekst: plek · NL · EN. Alleen nieuwe of gewijzigde klantteksten. Getallen tussen ⟨ ⟩ komen uit de data (pricing.js: CREDITS_GELDIG_MAANDEN = 3, spaarPlafond() = 3 × credits per maand, bv. Pro 360); datums uit het creditboek.

## Deel 1 · Het spaarplafond (ab-v1 = c, ab-v2 = a)

**Studio /account/plan, blok "Je saldo"** — src/lib/creditWeergave.js (saldoWeergave)
- Naast het getal, bij een lopend abonnement
  - NL: Je hebt 356 credits (je kunt er ⟨360⟩ sparen)
  - EN: You have 356 credits (you can save up to ⟨360⟩)
- Wanneer er nieuwe bijkomen, niets boven het plafond
  - NL: Op 8 februari komen er 120 bij.
  - EN: On 8 February, 120 more come in.
- Boven het plafond (in de kleur van "bijna")
  - NL: Op 8 februari komen er 120 bij: gebruik er vóór die dag 116, anders vallen ze weg.
  - EN: On 8 February, 120 more come in: use 116 before that day, or they lapse.
- Pauze, stop of het jaar vooruit is op (één datum)
  - NL: Je credits blijven geldig tot en met 7 april.
  - EN: Your credits stay valid up to and including 7 April.
- Zelden: meer dan één datum (bv. een teruggave na de stop)
  - NL: 92 credits blijven geldig tot en met 10 februari, 48 tot en met 19 april.
  - EN: 92 credits stay valid up to and including 10 February, 48 up to and including 19 April.
- Oude partijen van vóór het plafond bij een lopend abonnement (alleen tijdens de overgang)
  - NL: 8 hiervan vervallen op 20 januari — die gaan als eerste op. Daarna vervallen er nog 24 op 1 februari.
  - EN: 8 of these expire on 20 January — they are used first. After that, 24 more expire on 1 February.
- De regel eronder (vervangt "Credits blijven 3 maanden geldig; de oudste gaan als eerste op.")
  - NL: Zolang je abonnement loopt, vervallen je credits niet; je kunt tot ⟨3⟩ maanden aan credits sparen. Pauzeer of stop je, dan blijven ze geldig tot ⟨3⟩ maanden na je laatste termijn.
  - EN: While your plan runs, your credits do not expire; you can save up to ⟨3⟩ months of them. If you pause or stop, they stay valid until ⟨3⟩ months after your last monthly credits came in.
- Weg: "De rest vervalt op …" en "De rest vervalt later, in stappen; de laatste op …".

**Studio /account/plan, creditboek** — src/lib/creditWeergave.js
- Nieuwe regel
  - NL: Vervallen: boven je spaarplafond
  - EN: Lapsed: above your savings limit
- "vervalt op …" staat bij een lopend abonnement niet meer bij de termijnen (de datum schuift mee).

**Studio /account/plan, de stand bovenaan** — src/lib/account.js (ABO)
- Pauze
  - NL: Je abonnement staat op pauze sinds 2 oktober. Er wordt niets afgeschreven en er komen geen credits bij. Je credits blijven geldig tot ⟨3⟩ maanden na je laatste termijn.
  - EN: Your plan is paused since 2 October. Nothing is collected and no credits come in. Your credits stay valid until ⟨3⟩ months after your last monthly credits came in.
- Opgezegd
  - NL: Je abonnement stopt op 8 november. Er wordt niets meer afgeschreven. Je credits blijven geldig tot ⟨3⟩ maanden na je laatste termijn.
  - EN: Your plan stops on 8 November. Nothing more is collected. Your credits stay valid until ⟨3⟩ months after your last monthly credits came in.
- Gestopt
  - NL: Je abonnement is gestopt. Je credits blijven geldig tot ⟨3⟩ maanden na je laatste termijn.
  - EN: Your plan has stopped. Your credits stay valid until ⟨3⟩ months after your last monthly credits came in.

**Studio /account/plan, pauzeren en opzeggen (uitklapvak)** — src/lib/account.js (ABO)
- Pauze-uitleg (met datum uit het boek)
  - NL: Je pauze gaat in op 8 november: deze maand loopt gewoon door. Daarna betaal je niets en komen er geen credits bij; wat je hebt, blijft geldig tot en met 7 januari (⟨3⟩ maanden na je laatste termijn).
  - EN: Your pause starts on 8 November: this month simply runs on. After that you pay nothing and no credits come in; what you have stays valid up to and including 7 January (⟨3⟩ months after your last monthly credits came in).
- Pauze-uitleg zonder lopende maand
  - NL: Je betaalt niets meer en er komen geen credits bij; wat je hebt, blijft geldig tot en met 7 januari (⟨3⟩ maanden na je laatste termijn).
  - EN: You pay nothing more and no credits come in; what you have stays valid up to and including 7 January (⟨3⟩ months after your last monthly credits came in).
- Aanbod bij opzeggen
  - NL: Een rustige periode? Pauzeer liever: je betaalt niets en hervatten kan wanneer je wilt.
  - EN: A quiet period? Pause instead: you pay nothing and you can resume whenever you like.
- Opzeg-uitleg
  - NL: Opzeggen stopt het abonnement na de termijn die je al betaald hebt. Je credits blijven geldig tot ⟨3⟩ maanden na je laatste termijn; wat je al hebt laten maken, blijft van jou.
  - EN: Cancelling stops the plan after the term you have already paid for. Your credits stay valid until ⟨3⟩ months after your last monthly credits came in; everything you have had made stays yours.

**Studio, overige zinnen** — src/lib/account.js (COPY)
- Bevestiging na pauzeren (planPauseOk)
  - NL: Je abonnement staat op pauze. Er wordt niets meer afgeschreven tot je hervat; je credits blijven geldig tot ⟨3⟩ maanden na je laatste termijn. Je krijgt een bevestiging per mail.
  - EN: Your plan is paused. Nothing more will be collected until you resume; your credits stay valid until ⟨3⟩ months after your last monthly credits came in. We sent a confirmation by email.
- Uitleg zonder abonnement (planVisSlotsP)
  - NL: Elke dienst kost credits: een catalogset 4, een lifestyle-carrousel 5. Zolang je abonnement loopt, vervallen ze niet; je kunt tot ⟨3⟩ maanden aan credits sparen.
  - EN: Each service costs credits: a catalog set 4, a lifestyle carousel 5. While your plan runs they do not expire; you can save up to ⟨3⟩ months of credits.
- planCreditsLede
  - NL: Eén saldo voor alles wat je kunt bestellen. Zolang je abonnement loopt, vervallen je credits niet; je kunt tot ⟨3⟩ maanden aan credits sparen.
  - EN: One balance for everything you can order. While your plan runs, your credits do not expire; you can save up to ⟨3⟩ months of them.
- planCancelledNote
  - NL: Je abonnement is opgezegd en er wordt niets meer afgeschreven. Het loopt tot 8 november; je credits blijven geldig tot ⟨3⟩ maanden na je laatste termijn.
  - EN: Your plan is cancelled and nothing more will be collected. It runs until 8 November; your credits stay valid until ⟨3⟩ months after your last monthly credits came in.
- planPauseNote
  - NL: Pauzeren stopt de volgende afschrijving. Je credits blijven geldig tot ⟨3⟩ maanden na je laatste termijn.
  - EN: Pausing stops the next payment. Your credits stay valid until ⟨3⟩ months after your last monthly credits came in.

**Studio Overzicht, strook "Je saldo"** — src/lib/account.js (STROOK)
- NL: Van je abonnement (je kunt er ⟨360⟩ sparen). Genoeg voor 89 catalogsets of 71 carrousels. [+ de plafondzin of "Je credits blijven geldig tot en met …" als die er is]
- EN: From your plan (you can save up to ⟨360⟩). Enough for 89 catalog sets or 71 carousels. [+ idem]

**Mail aan de klant: pauze en opzeggen** — src/lib/account.js (mailAboWijziging); de zin vervangt "Credits blijven 3 maanden geldig, ook tijdens een pauze: wat je hebt, kun je gebruiken tot de eigen datum." en "(3 maanden na binnenkomst)"
- NL: Je credits blijven geldig tot en met 7 januari: ⟨3⟩ maanden na je laatste termijn. (zonder credits: Je credits blijven geldig tot ⟨3⟩ maanden na je laatste termijn.)
- EN: Your credits stay valid up to and including 7 January: ⟨3⟩ months after your last monthly credits came in. (without credits: Your credits stay valid until ⟨3⟩ months after your last monthly credits came in.)

**Mail aan de klant: welkom + maandtermijn** — src/lib/invoiceMail.js
- Welkomstmail, regel onder de drie stappen (rollover)
  - NL: Zolang je abonnement loopt, vervallen je credits niet: je kunt tot ⟨3⟩ maanden aan credits sparen. Komt er een termijn bij die je daarboven brengt, dan vervalt alleen wat erboven komt, en we waarschuwen je vooraf. Pauzeer of stop je, dan blijven je credits geldig tot ⟨3⟩ maanden na je laatste termijn.
  - EN: While your plan runs, your credits do not expire: you can save up to ⟨3⟩ months of credits. If a payment takes you above that, only what goes above it lapses, and we warn you beforehand. If you pause or stop, your credits stay valid until ⟨3⟩ months after your last monthly credits came in.
- Mail bij elke maandtermijn (ledeNext)
  - NL: De termijn voor februari 2027 is binnen. Je 120 credits voor deze maand staan klaar in VISUAILS Studio. Zolang je abonnement loopt, vervallen je credits niet; in Studio zie je hoeveel je er kunt sparen.
  - EN: The payment for February 2027 came through. Your 120 credits for this month are ready in VISUAILS Studio. While your plan runs, your credits do not expire; Studio shows how many you can save.

**Nieuwe mail: het plafond is in zicht (7 dagen vóór de termijn, één keer)** — cron/index.js (mailPlafondInZicht)
- Onderwerp
  - NL: Op 8 februari komen er 120 credits bij — gebruik er vóór die dag 116
  - EN: On 8 February, 120 credits come in — use 116 before that day
- Voorvertoning
  - NL: Je kunt 360 credits sparen; 116 vallen anders weg op 8 februari.
  - EN: You can save up to 360 credits; otherwise 116 lapse on 8 February.
- Kop
  - NL: Je spaarplafond is in zicht
  - EN: Your savings limit is in sight
- Tekst
  - NL: Je hebt **356 credits** (je kunt er 360 sparen). Op **8 februari** komen er 120 bij: gebruik er vóór die dag **116**, anders vallen ze weg. / Zolang je abonnement loopt, vervallen je credits niet; je kunt tot ⟨3⟩ maanden aan credits sparen. Alleen wat er boven komt, valt weg, op de dag van je termijn. Dit is de enige herinnering. / Wat je ervoor kunt laten maken: 29 × catalogset, of … Je bestelt zoals altijd via het bestelformulier; ben je ingelogd, dan betaal je met je credits. / [knop Bestellen] / Weet je niet wat je zou laten maken? Het product dat je het vaakst verkoopt, is bijna altijd het goede antwoord. Twijfel je, app ons even; dan denken we mee.
  - EN: You have **356 credits** (you can save up to 360). On **8 February**, 120 more come in: use **116** before that day, or they lapse. / While your plan runs, your credits do not expire; you can save up to ⟨3⟩ months of credits. Only what goes above that lapses, on the day of your payment. This is the only reminder. / What you can have made with them: … You order as usual through the order form; when you are signed in, you pay with your credits. / [Order now] / Not sure what to have made? The product you sell most is almost always the right answer. In doubt? Send us a message and we will help you choose.

**Mail "Er staan nog credits open" (7 dagen vóór de ene einddatum na pauze/stop)** — cron/index.js (mailCreditsVervallen)
- Gewijzigde zin (was "Credits blijven 3 maanden geldig; dit is de enige herinnering.")
  - NL: Na een pauze of opzegging blijven credits geldig tot ⟨3⟩ maanden na je laatste termijn; dit is de enige herinnering.
  - EN: After a pause or cancellation, credits stay valid until ⟨3⟩ months after your last monthly credits came in; this is the only reminder.
- Weg uit de tipzin: "en gaan de oudste eerst" / "and the oldest go first".

**Annuleringsmail en tijdlijn bij credits terug** — src/lib/creditWeergave.js (terugZin), src/lib/cancelMail.js, src/lib/admin.js
- Lopend abonnement
  - NL: Je betaalde deze bestelling met credits. 48 credits staan weer op je saldo. [+ als de volgende termijn daardoor boven het plafond komt: Op 8 april komen er 120 bij: gebruik er vóór die dag 220, anders vallen ze weg.]
  - EN: You paid for this order with subscription credits. 48 credits are back on your balance. [+ On 8 April, 120 more come in: use 220 before that day, or they lapse.]
- Geen lopend abonnement
  - NL: … 4 credits staan weer op je saldo, geldig tot en met 31 mei.
  - EN: … 4 credits are back on your balance, valid up to and including 31 May.
- Tijdlijn "niet gemaakt": ⟨reden⟩ — dezelfde zin.

**Stap 5 van het bestelformulier, betalen met credits** — src/components/order/OrderFlow.astro (credits.boven), src/scripts/pipeline.js
- Nieuw, alleen als er na deze bestelling bij de volgende termijn nog iets boven het plafond komt
  - NL: Op 8 februari komen er 120 bij: gebruik er vóór die dag nog 68, anders vallen ze weg.
  - EN: On 8 February, 120 more come in: use 68 more before that day, or they lapse.

**/plans, "Zo werkt het"** — src/components/PlansPage.astro
- NL: … en betaalt met je credits in plaats van met geld. Zolang je abonnement loopt, vervallen ze niet: je kunt tot ⟨3⟩ maanden aan credits sparen (bij Pro ⟨360⟩). Pauzeer of stop je, dan blijven ze geldig tot ⟨3⟩ maanden na je laatste termijn. Bij elk abonnement krijg je ook de maandset (zie hieronder).
- EN: … and pay with your credits instead of money. While your plan runs, they do not expire: you can save up to ⟨3⟩ months of credits (⟨360⟩ on Pro). If you pause or stop, they stay valid until ⟨3⟩ months after your last monthly credits came in. With every plan you also get the monthly set (see below).

**/plans, elke plankaart (nieuwe regel onder de vertaling)** — src/components/PlansPage.astro
- NL: Sparen tot ⟨135 / 360 / 870⟩ credits; zolang het loopt vervalt er niets
- EN: Save up to ⟨135 / 360 / 870⟩ credits; nothing expires while it runs

**/start/plan, regel per plan** — src/components/order/PlanPicker.astro (vervangt "Credits blijven 3 maanden geldig")
- NL: **Sparen tot ⟨360⟩ credits** · ⟨3⟩ maanden; zolang het loopt vervalt er niets
- EN: **Save up to ⟨360⟩ credits** · ⟨3⟩ months; nothing expires while it runs
- Voordeel "Maandelijks opzegbaar"
  - NL: Zolang het loopt vervallen je credits niet; je spaart tot ⟨3⟩ maanden. Opzeggen doe je zelf, in VISUAILS Studio.
  - EN: While it runs your credits do not expire; you save up to ⟨3⟩ months. You cancel yourself, in VISUAILS Studio.

**Plan-overzicht (plans() in pricing.js, o.a. /pricing)** — src/data/pricing.js
- NL: Sparen tot ⟨360⟩ credits (⟨3⟩ maanden); zolang het loopt vervalt er niets
- EN: Save up to ⟨360⟩ credits (⟨3⟩ months); nothing expires while it runs

**Abonnementsband (o.a. op dienstpagina's)** — src/components/PlanBand.astro
- NL: Via het gewone bestelformulier, zoals iedereen; je betaalt met je credits. Zolang je abonnement loopt, vervallen ze niet: je spaart tot ⟨3⟩ maanden aan credits.
- EN: Through the regular order form, like everyone else; you pay with your credits. While your plan runs, they do not expire: you save up to ⟨3⟩ months of credits.

**FAQ** — src/data/faq.js
- "Wat gebeurt er met credits die ik niet gebruik?"
  - NL: Zolang je abonnement loopt, vervallen ze niet. Je kunt tot ⟨3⟩ maanden aan credits sparen: bij Pro ⟨360⟩. Brengt een nieuwe termijn je daarboven, dan vervalt alleen wat erboven komt, op de dag van die termijn; we sturen je vooraf een herinnering. Pauzeer of stop je, dan blijven je credits geldig tot ⟨3⟩ maanden na je laatste termijn. Een maandabonnement zeg je elke maand op.
  - EN: While your plan runs, they do not expire. You can save up to ⟨3⟩ months of credits: ⟨360⟩ on Pro. If a new payment takes you above that, only what goes above it lapses, on the day of that payment; we send you a reminder first. If you pause or stop, your credits stay valid until ⟨3⟩ months after your last monthly credits came in. A monthly plan can be cancelled in any month.
- "Is er een abonnement?" (de zin "Credits blijven 3 maanden geldig." wordt)
  - NL: Zolang je abonnement loopt, vervallen ze niet: je spaart tot ⟨3⟩ maanden aan credits.
  - EN: While your plan runs, they do not expire: you save up to ⟨3⟩ months of credits.

**/admin (alleen NL, geen klanttekst)** — src/lib/admin.js: "(je kunt er 360 sparen)" naast het saldo, de plafondzin als eigen waarschuwingsregel; bij "Credits bijstellen": "Erbij krijgt dezelfde datum als de rest en is minstens 3 maanden geldig vanaf vandaag; bij een lopend abonnement telt het mee voor het spaarplafond, dus bij de volgende termijn vervalt wat erboven komt." Bij "Credits terug": "Ze komen terug op het saldo en tellen gewoon mee, bij een lopend abonnement ook voor het spaarplafond bij de volgende termijn. Zonder lopend abonnement zijn ze minstens 3 maanden geldig vanaf vandaag." en de keuze "Credits terug — op het saldo, minstens 3 maanden geldig". Studiomail bij pauze/opzeggen: "de credits blijven geldig tot 3 maanden na de laatste termijn". Nachtrapport: "Spaarplafond in zicht: N klant(en) gemaild — …".

## Deel 2 · Extra credits bijkopen (ab-v3 = c, ab-v4 = b)

Pakketten, korting en maximum uit pricing.js (BIJKOOP_PAKKETTEN = 10, 25, 50; BIJKOOP_KORTING_PCT = 5% bij 25, 10% bij 50; BIJKOOP_MAX_PER_MAAND = 100); de prijs uit bijkoopPrijs() (prijs per credit van het eigen plan). Voorbeeld Pro, 25 credits: €157 excl. btw.

**Studio /account/plan, blok "Extra credits bijkopen"** (#bijkopen, alleen bij een lopend abonnement) — src/lib/account.js (ABO.bij*), src/pages/account/plan.astro
- Kop
  - NL: Extra credits bijkopen
  - EN: Buy extra credits
- Uitleg
  - NL: Tegen de prijs per credit van je abonnement: bij ⟨25⟩ krijg je ⟨5⟩% korting, bij ⟨50⟩ ⟨10⟩%. Bijgekochte credits gaan als eerste op, blijven ⟨3⟩ maanden geldig en tellen niet mee voor je spaarplafond.
  - EN: At the price per credit of your plan: ⟨5⟩% off with ⟨25⟩, ⟨10⟩% off with ⟨50⟩. Bought credits are used first, stay valid for ⟨3⟩ months and do not count towards your savings limit.
- Per pakket (keuzerondje)
  - NL: 25 credits · 5% korting · € 157,00 excl. btw · € 189,97 incl. btw · € 6,28 per credit
  - EN: 25 credits · 5% off · € 157.00 excl. VAT · € 189.97 incl. VAT · € 6.28 per credit
- Ruimte deze maand
  - NL: Deze maand kun je nog 75 credits bijkopen (hoogstens ⟨100⟩ per maand). / Je kunt hoogstens ⟨100⟩ credits per maand bijkopen.
  - EN: This month you can still buy 75 credits (at most ⟨100⟩ a month). / You can buy at most ⟨100⟩ credits a month.
- Maximum bereikt
  - NL: Je hebt deze maand al ⟨100⟩ credits bijgekocht. Vanaf 1 november kan het weer.
  - EN: You have already bought ⟨100⟩ credits this month. From 1 November you can again.
- Knop
  - NL: Bijkopen en betalen
  - EN: Buy and pay
- Onder de knop
  - NL: Je betaalt via iDEAL of kaart (buiten NL: met een kaart), los van je maandtermijn; de factuur krijg je per mail. Zodra de betaling binnen is, staan de credits erbij.
  - EN: You pay by iDEAL or card (outside NL: by card), separately from your monthly payment; the invoice comes by email. As soon as the payment is in, the credits are added.
- Hint bij een pakket (alleen als het volgende plan hoogstens ⟨€25⟩ per maand meer kost dan plan + pakket)
  - NL: Koop je er 50 bij, dan is overstappen naar Pro voordeliger: € 790,00 per maand voor 120 credits. (voorbeeld Starter: € 390 + € 390 voor 50 = € 780, Pro kost € 10 meer)
  - EN: If you buy 50, switching to Pro is better value: € 790.00 a month for 120 credits.
- Hint na twee maanden achter elkaar bijkopen
  - NL: Overstappen naar Pro is voordeliger: € 790,00 per maand voor 120 credits, elke maand. · Bekijk je plan
  - EN: Switching to Pro is better value: € 790.00 a month for 120 credits, every month. · See your plan
- Lijst eronder
  - NL: Eerder bijgekocht — 25 credits · € 189,97 · betaald / wacht op betaling / niet gelukt / afgebroken / verlopen
  - EN: Bought before — 25 credits · € 189.97 · paid / awaiting payment / failed / cancelled / expired

**Studio /account/plan, meldingen na de terugkeer van Mollie** — src/lib/account.js
- Betaald
  - NL: Je 25 extra credits staan erbij. Ze gaan als eerste op en blijven geldig tot en met 11 januari.
  - EN: Your 25 extra credits have been added. They are used first and stay valid up to and including 11 January.
- Nog geen bevestiging
  - NL: We wachten nog op de bevestiging van je betaling. Je credits staan erbij zodra die binnen is; ververs deze pagina over een minuut.
  - EN: We are still waiting for the confirmation of your payment. Your credits are added as soon as it is in; refresh this page in a minute.
- Mislukt, afgebroken of verlopen
  - NL: De betaling is niet gelukt. Er is niets afgeschreven en er zijn geen credits bijgekomen.
  - EN: The payment did not go through. Nothing was charged and no credits were added.
- Terug naar de bestelling (kwam de klant uit stap 5)
  - NL: Verder met je bestelling
  - EN: Continue with your order
- Fouten (er is niets veranderd)
  - NL: Dat past niet meer binnen de ⟨100⟩ credits per maand. Er is niets veranderd.
  - EN: That no longer fits within the ⟨100⟩ credits a month. Nothing has changed.
  - NL: Bijkopen kan alleen bij een lopend abonnement. Er is niets veranderd.
  - EN: You can only buy credits with a running plan. Nothing has changed.
  - NL: Kies een pakket van ⟨10, 25 of 50⟩ credits. Er is niets veranderd.
  - EN: Choose a package of ⟨10, 25 or 50⟩ credits. Nothing has changed.
  - NL: Voor dit abonnement kunnen we nu geen prijs uitrekenen. Neem contact met ons op; er is niets afgeschreven.
  - EN: We cannot work out a price for this plan right now. Please get in touch; nothing was charged.
  - NL: De betaling kon nu niet worden gestart. Er is niets afgeschreven; probeer het zo opnieuw.
  - EN: The payment could not be started just now. Nothing was charged; try again in a moment.
  - NL: Je hebt dit het afgelopen uur al vaak geprobeerd. Probeer het later opnieuw.
  - EN: You have tried this often in the last hour. Please try again later.

**Studio /account/plan, blok "Je saldo" en creditboek** — src/lib/creditWeergave.js
- Bij bijgekochte credits
  - NL: Waarvan 25 bijgekocht: die gaan als eerste op en tellen niet mee voor je spaarplafond; ze vervallen op 11 januari.
  - EN: Of these, 25 were bought: they are used first and do not count towards your savings limit; they expire on 11 January.
- Regel in het creditboek
  - NL: Extra credits bijgekocht
  - EN: Extra credits bought

**Bestellen, stap 5 bij te weinig credits** — src/components/order/OrderFlow.astro (tekst), src/scripts/pipeline.js (vullen); link naar /account/plan/?pakket=…&verder=…#bijkopen
- Met het kleinste pakket dat het tekort dekt
  - NL: Je komt 18 credits tekort. Koop 25 credits bij voor €157 excl. btw, of betaal deze bestelling gewoon via Mollie. · Credits bijkopen
  - EN: You are 18 credits short. Buy 25 credits for €157 excl. VAT, or simply pay for this order through Mollie. · Buy credits
- Geen pakket dekt het tekort binnen het maximum
  - NL: Je komt 140 credits tekort. Je kunt deze maand nog 75 credits bijkopen, of je betaalt deze bestelling gewoon via Mollie. · Credits bijkopen
  - EN: You are 140 credits short. You can buy up to 75 extra credits this month, or simply pay for this order through Mollie. · Buy credits
- Hint (zelfde voorwaarden als in Studio)
  - NL: Overstappen naar Pro is voordeliger: €790 per maand voor 120 credits.
  - EN: Switching to Pro is better value: €790 a month for 120 credits.

**Mail na een betaalde bijkoop, met de factuur** — src/lib/invoiceMail.js (mailBijkoopFactuur)
- Onderwerp
  - NL: Je 25 extra credits staan klaar — ⟨factuurnummer⟩
  - EN: Your 25 extra credits are ready — ⟨invoice number⟩
- Kop
  - NL: Je extra credits staan klaar
  - EN: Your extra credits are ready
- Tekst
  - NL: Bedankt. Je betaling is binnen en er staan 25 extra credits op je saldo in VISUAILS Studio. Ze gaan als eerste op, tellen niet mee voor je spaarplafond en blijven ⟨3⟩ maanden geldig, tot en met 11 januari.
  - EN: Thank you. Your payment came through and there are 25 extra credits on your balance in VISUAILS Studio. They are used first, do not count towards your savings limit and stay valid for ⟨3⟩ months, up to and including 11 January.
- Rijen: Extra credits / Factuurnummer / Factuurdatum / Betaald (EN: Extra credits / Invoice number / Invoice date / Paid); onderaan de bestaande zinnen over de pdf en de knop "Naar je abonnement in VISUAILS Studio" (EN: "Go to your plan in VISUAILS Studio").

**Factuur** — src/lib/invoice.js
- Regel (NL en EN gelijk): Extra credits · 25 · Pro

**Herinnering vóór het vervallen, als het alleen bijgekochte credits zijn** — cron/index.js
- NL: Er staan nog **25 bijgekochte credits** open die op **11 januari** vervallen. Bijgekochte credits blijven ⟨3⟩ maanden geldig vanaf de aankoop; dit is de enige herinnering.
- EN: You still have **25 bought credits** that expire on **11 January**. Bought credits stay valid for ⟨3⟩ months from the purchase; this is the only reminder.

**/plans, alinea "Zo werkt het"** — src/components/PlansPage.astro (bijzin uit creditKaart.js: bijkoopRegel)
- NL: Kom je een maand tekort, dan koop je in VISUAILS Studio extra credits bij, in pakketten van ⟨10, 25 of 50⟩ credits, tegen de prijs per credit van je eigen abonnement, met korting: ⟨5⟩% bij ⟨25⟩, ⟨10⟩% bij ⟨50⟩ (hoogstens ⟨100⟩ per maand).
- EN: Need more in a month? Buy extra credits in VISUAILS Studio, in packages of ⟨10, 25 or 50⟩ credits, at the price per credit of your own plan, with a discount: ⟨5⟩% with ⟨25⟩, ⟨10⟩% with ⟨50⟩ (up to ⟨100⟩ a month).

**FAQ, nieuwe vraag** — src/data/faq.js (pricingFaqs, ook op /faq)
- NL: **Kan ik extra credits bijkopen?** Ja, zolang je abonnement loopt: in VISUAILS Studio, in pakketten van ⟨10, 25 of 50⟩ credits, tegen de prijs per credit van je eigen abonnement, met korting: ⟨5⟩% bij ⟨25⟩, ⟨10⟩% bij ⟨50⟩. Bij Pro kosten ⟨25⟩ credits ⟨€157⟩ excl. btw. Je koopt hoogstens ⟨100⟩ credits per maand bij. Bijgekochte credits gaan als eerste op, blijven ⟨3⟩ maanden geldig vanaf de aankoop en tellen niet mee voor je spaarplafond. Koop je vaak bij, dan is een groter abonnement voordeliger; dat zie je in Studio.
- EN: **Can I buy extra credits?** Yes, while your plan runs: in VISUAILS Studio, in packages of ⟨10, 25 or 50⟩ credits, at the price per credit of your own plan, with a discount: ⟨5⟩% with ⟨25⟩, ⟨10⟩% with ⟨50⟩. On Pro, ⟨25⟩ credits cost ⟨€157⟩ excl. VAT. You buy at most ⟨100⟩ credits a month. Bought credits are used first, stay valid for ⟨3⟩ months from the purchase and do not count towards your savings limit. If you buy often, a bigger plan is better value; Studio shows you when.

**/admin (alleen NL, geen klanttekst)** — src/lib/admin.js: in het klantpaneel de saldozin "Waarvan 25 bijgekocht: …"; een tabel "Extra credits gekocht" met de uitleg "Bijgekochte credits gaan als eerste op, zijn 3 maanden geldig vanaf de betaling en tellen niet mee voor het spaarplafond. Hoogstens 100 per kalendermaand."; in het creditboek de reden "bijgekocht"; bij Facturen het soort "extra credits".

## VOOR AFVINKLIJST 5

**Voorwaarden §9a, alinea "Sparen, en wanneer credits vervallen"** (was "Hoe lang credits geldig zijn") — src/pages/nl/terms.astro, src/pages/terms.astro
- NL: **Sparen, en wanneer credits vervallen.** Zolang je abonnement loopt, vervallen je credits niet. Je kunt tot ⟨3⟩ maanden aan credits sparen: ⟨3⟩ keer het aantal dat je abonnement per maand geeft (in VISUAILS Studio staat het getal). Brengt een nieuwe termijn je saldo daarboven, dan vervalt alleen wat erboven komt, op de dag van die termijn; vooraf sturen we je een herinnering. Credits die terugkomen, na een annulering of voor een product dat we niet konden maken, tellen gewoon mee in je saldo. Pauzeer of stop je, dan blijven al je credits geldig tot ⟨3⟩ maanden na je laatste termijn; daarna vervallen ze, en ook dan sturen we vooraf een herinnering. Bij een bestelling gaan de oudste credits altijd als eerste op.
- EN: **Saving credits, and when they lapse.** While your subscription runs, your credits do not lapse. You can save up to ⟨3⟩ months of credits: ⟨3⟩ times the number your plan gives you each month (VISUAILS Studio shows the figure). If a new term takes your balance above that, only what goes above it lapses, on the day of that term; we send you a reminder beforehand. Credits that come back, after a cancellation or for a product we could not make, count towards your balance like any other. If you pause or cancel, all your credits stay valid until ⟨3⟩ months after your last term and then lapse; here too we send you a reminder beforehand. When you order, the oldest credits are always used first.

**§9a "Opzeggen"** — de zin over credits
- NL: … en de credits die je al hebt, blijven geldig tot ⟨3⟩ maanden na je laatste termijn. (was: blijven bruikbaar tot hun eigen vervaldatum)
- EN: … and the credits you already have stay valid until ⟨3⟩ months after your last term. (was: stay usable until their own expiry date)

**§9a "Pauzeren"**
- NL: De credits die je hebt, blijven staan en blijven geldig tot ⟨3⟩ maanden na je laatste termijn. (was: en vervallen op hun eigen datum)
- EN: The credits you have stay where they are and stay valid until ⟨3⟩ months after your last term.

**§9a "Als een afschrijving mislukt"**
- NL: Je credits blijven staan en blijven geldig tot ⟨3⟩ maanden na je laatste termijn.
- EN: Your credits stay where they are and stay valid until ⟨3⟩ months after your last term.

"Laatst bijgewerkt" van /terms blijft oktober 2026 (juridischeDatums.js, notitie erbij).

**§9a, slotzin van "Sparen, en wanneer credits vervallen"** (deel 2) — src/pages/nl/terms.astro, src/pages/terms.astro
- NL: Bij een bestelling gaan de oudste credits altijd als eerste op, na eventuele bijgekochte credits (zie hieronder).
- EN: When you order, the oldest credits are always used first, after any bought credits (see below).

**§9a, nieuwe alinea "Extra credits bijkopen"** (deel 2) — src/pages/nl/terms.astro, src/pages/terms.astro (bijzin uit creditKaart.js: bijkoopRegel)
- NL: **Extra credits bijkopen.** Loopt je abonnement, dan kun je in VISUAILS Studio extra credits bijkopen, in pakketten van ⟨10, 25 of 50⟩ credits, tegen de prijs per credit van je eigen abonnement, met korting: ⟨5⟩% bij ⟨25⟩, ⟨10⟩% bij ⟨50⟩, hoogstens ⟨100⟩ per kalendermaand. Je betaalt ze los, met een eigen factuur; ze komen erbij zodra de betaling binnen is. Bijgekochte credits gaan als eerste op, blijven ⟨3⟩ maanden geldig vanaf de aankoop, ook als je pauzeert of opzegt, en tellen niet mee voor je spaarplafond.
- EN: **Buying extra credits.** While your subscription runs, you can buy extra credits in VISUAILS Studio, in packages of ⟨10, 25 or 50⟩ credits, at the price per credit of your own plan, with a discount: ⟨5⟩% with ⟨25⟩, ⟨10⟩% with ⟨50⟩, at most ⟨100⟩ per calendar month. You pay for them separately, with their own invoice; they are added as soon as the payment is in. Bought credits are used first, stay valid for ⟨3⟩ months from the purchase, also if you pause or cancel, and do not count towards your savings limit.


# Teksten K6 (12 okt 2026)

Elke nieuwe of gewijzigde klanttekst, NL en EN, met plek. Juridische zinnen staan onder "VOOR AFVINKLIJST 5".

## 2. Contactvoorkeur "Telefoon of WhatsApp", veilig geframed (k-contact = a)
Bron: `src/data/contactvoorkeur.js` (`VOORKEUR_COPY`). De keuzes zelf heetten in stap 3 en /start/plan al "E-mail / Telefoon of WhatsApp"; /contact nu ook.

### 2a. De regel onder de keuze, stap 3 van het bestelformulier en het abonnementsformulier (/start/plan)
Plek: stap 3 "Hoe kunnen we je het beste bereiken?" (OrderFlow.astro) en /start/plan (PlanPicker.astro), de grijze regel onder de twee knoppen. Eerste zin nieuw, tweede zin bestond al ("Voor vragen tijdens het werk." is vervallen).
- NL: "We bellen of appen alleen over je bestelling, en alleen als dat sneller is dan mailen. Je factuur en de link naar je beelden gaan altijd per mail."
- EN: "We only call or message about your order, and only when it is quicker than email. Your invoice and the link to your images always come by email."

### 2b. /contact, de keuze "Voorkeurskanaal"
Plek: `src/components/ContactPage.astro`, formulier "Stuur een bericht", tweede keuzekaart (titel) en de nieuwe regel onder de twee kaarten.
- Titel kaart, NL: "Telefoon of WhatsApp" (was "WhatsApp"); onderregel ongewijzigd "Snelst — meestal binnen het uur".
- Titel kaart, EN: "Phone or WhatsApp" (was "WhatsApp"); onderregel ongewijzigd "Fastest — usually within the hour".
- Nieuwe regel, NL: "We bellen of appen alleen over je vraag, en alleen als dat sneller is dan mailen."
- Nieuwe regel, EN: "We only call or message about your question, and only when it is quicker than email."

### 2c. /contact, de hint onder het veld "Telefoon of WhatsApp (optioneel)"
- NL: "Alleen nodig als je liever via telefoon of WhatsApp antwoord krijgt." (was "Alleen nodig als je liever een appje krijgt.")
- EN: "Only needed if you would rather get a reply by phone or WhatsApp." (was "Only needed if you would rather get a reply on WhatsApp.")

### 2d. `nootZonderNummer` in contactvoorkeur.js (staat nu nergens op de site, alleen gelijkgetrokken)
- NL: "Kies Telefoon of WhatsApp en laat een nummer achter, dan antwoorden we daar."
- EN: "Pick Phone or WhatsApp and leave a number, and we answer there."

## 3. Ontbrekende extra hoekfoto's overal melden (k-hoeken = a)
Geen nieuwe zinnen. De bestaande regels ("p1 Jas groen: geen driekwart" / "p1 Jas groen: no three-quarter") noemen nu ook een bijbestelde hoek, met de naam uit `src/data/angles.js` (of wat de klant bij "Zelf bedenken" typte). Plekken: het tussenscherm van stap 2, Studio (lijst bovenaan "Je foto's" en een eigen vak per hoek, met de bestaande vakteksten "Nog niet ontvangen"), de betaalmail ("Er ontbreken nog foto's:"), de vaste WhatsApp-/mailtekst aan de klant vanuit /admin ("we missen nog foto's van product 2 (binnenkant van de kraag)"), de Nu-zin op de privélink.

## 4. PNG en WebP (k-png = a, k-lever = a)

### 4a. Studio, bestelkaart van een geleverde bestelling, blok "Andere formaten" (`src/lib/formaten.js`)
- NL: "JPG is de standaard. PNG is zonder kwaliteitsverlies, voor drukwerk of verder bewerken. WebP laadt snel op je eigen site."
  (was: "JPG is de standaard. PNG kies je voor een transparante achtergrond, WebP laadt snel op je eigen site.")
- EN: "JPG is the default. PNG has no quality loss, for print or further editing. WebP loads fast on your own site."
  (was: "JPG is the default. Choose PNG for a transparent background; WebP loads fast on your own site.")

### 4b. LEESMIJ in de zip (`src/lib/delivery.js`, FORMAT_HELP)
Niet veranderd: daar stond het transparant-verhaal niet ("Het onbewerkte bestand, zonder compressieverlies. Dit is je archief en je werkbestand …"). Na FORMATEN.bat beschrijft de leesmij vanzelf de mappen JPG/, PNG/ en WEBP/ per product.

### 4c. Alleen /admin (Nederlands, geen klanttekst)
- /admin/formaten, de inleiding: "… Lever het formaat met FORMATEN.bat in de projectmap (de PNG-originelen uit Magnific in een map, bestelnummer typen, map erin slepen): dat maakt de WebP, zet beide in de zip van de klant en zet het verzoek hier op Klaar zodra elk beeld ze heeft. Lever je het anders, klik dan zelf op Klaar. In Studio staat daarna "PNG geleverd" met de datum."
- /admin/orders/<id>/files, tooltip bij "nog niet omgezet": "Alleen het bestand dat je uploadde (jpg is de standaard). Vroeg de klant PNG of WebP: dubbelklik FORMATEN.bat in de projectmap."

## VOOR AFVINKLIJST 5

### 1. Privacybeleid §6, de back-upzin (k-back = a)
Plek: `src/pages/nl/privacy.astro` en `src/pages/privacy.astro`, §6, punt "Back-ups". De zin zelf is niet veranderd; de getallen komen uit `src/lib/retention.js` en zijn nu 3 kopieën en 8 weken (was 4 en 9).

- NL: "Back-ups — eens per week maken we een kopie van onze database, en we bewaren de 3 meest recente; een oudere kopie die we opruimen, staat daarna nog tot 30 dagen in de prullenbak van Google Drive. Wat we verwijderen, is daardoor uiterlijk na 8 weken ook uit de back-ups verdwenen."
- EN: "Back-ups — once a week we make a copy of our database, and we keep the 3 most recent copies; an older copy we clear out then sits in the Google Drive bin for up to 30 days. Something we delete is therefore gone from the back-ups too after 8 weeks at the latest."
