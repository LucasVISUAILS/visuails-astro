# D4 · Abonnementen in de bestelstroom

Voorstel, nog niets van gebouwd. Jouw opdracht: *"Wellicht subscriptions toevoegen op de
order pagina naast foto's of video's omdat deze wel belangrijk zijn voor stabiele omzet en
hebben dus ook prioriteit, bedenk wat handig is om te doen en leg het me voor, kijk
uitgebreid hoe dit het beste verkocht kan worden aan de klant en werk het uit."*

---

## 1 · Waar het abonnement nu staat

| Plek | Wat er staat | Wanneer iemand het ziet |
|---|---|---|
| `/start` | Eén rij, paneel **5 van 6**, "Of betaal het maandelijks", vanaf-prijs, twee knoppen | Alleen wie de hele pagina uitleest |
| `/plans` | De drie plannen, volledige vergelijking, plekkenteller | Wie er zelf naartoe klikt |
| `/pricing` | Een blok onderaan dat naar `/plans` verwijst | Idem |
| `/start/plan` | Het echte formulier — vereist een account, dus een eerdere bestelling | Alleen bestaande klanten |
| **Het bestelformulier** | **Niets.** Geen woord, op geen enkele stap | — |
| `/thank-you` | **Niets** | — |
| De bevestigingsmail | `upgradePrompt()` — één zin, vanaf 12 producten in een rollend kwartaal | Wie genoeg besteld heeft |

De mail is op dit moment de **enige** plek waar een kopende klant een abonnement aangeboden
krijgt. Iemand die 30 producten in één bestelling doet, ziet in het hele formulier — twintig
minuten invullen, een totaal dat live meeloopt — nergens dat hetzelfde werk ook op een vaste
afspraak kan.

---

## 2 · De rekensom die elk voorstel eerst moet overleven

Dit is het belangrijkste stuk, en het is de reden dat ik hier eerst mee kom in plaats van
het te bouwen.

| Plan | Producten | Per maand | Per product | Dezelfde output los (catalog + lifestyle) | Alleen catalog los |
|---|---|---|---|---|---|
| Starter | 5 | € 390 | € 78,00 | € 545 (€ 109) | **€ 325** (€ 65) |
| Studio | 12 + 2 clips | € 790 | € 65,83 | € 1.158 | **€ 612** (€ 51) |
| Merk | 30 | € 1.690 | € 56,33 | € 1.950 (€ 65) | **€ 1.170** (€ 39) |

Een abonnement is goedkoper dan **dezelfde levering** los besteld. Het is **niet** goedkoper
dan een catalogbestelling — en catalog is de goedkoopste en meest voor de hand liggende deur.
Bij Studio scheelt dat € 178 per maand in het nadeel van het abonnement.

`pricing.js` weet dit al. In de kop van `upgradePrompt()` staat de hele redenering
uitgeschreven, met de conclusie: *"a prompt a client can disprove with a calculator costs
more than it earns."* De functie noemt daarom twee bedragen en zegt nooit "goedkoper".

**Gevolg voor het voorstel:** een levende regel in het bestelformulier mag het woord
*goedkoper* niet gebruiken. Hij moet zeggen wát er in zit en wát het kost, en de klant zelf
laten aftrekken. Dat is bovendien overtuigender voor precies het type koper dat het narekent.

### Drie plekken waar die claim nu al te ruim staat

Gevonden tijdens dit nazicht, los van wat je bouwt:

1. `StartPage.astro` r. 505 (NL) en 322 (EN) — *"Elk abonnement kost minder dan datzelfde
   **aantal producten** los besteld"*. "Aantal producten" is niet "dezelfde output"; voor een
   catalogkoper is die zin onwaar.
2. `PricingPage.astro` `toPlansB` — *"dezelfde producten, een lager tarief"*. Zelfde
   dubbelzinnigheid, milder.
3. De FAQ doet het **wel** goed: *"Alleen als dezelfde output elke maand terugkomt... op de
   prijs per product kost diezelfde output € 1.158."* Dat is de formulering die de andere
   twee moeten overnemen.

Dit is een correctie van twee zinnen en hoort er sowieso in, welk voorstel je ook kiest.

---

## 3 · Wat ik uitdrukkelijk **niet** zou doen

**Een abonnement als derde tak naast Foto's en Video op `/start`.** Dat is de letterlijke
lezing van je vraag, en het is een categoriefout.

De eerste vraag op `/start` is *wat er gemaakt moet worden*. Een abonnement beantwoordt niet
die vraag maar een andere: *hoe vaak*. Wie op "Abonnement" drukt, moet daarna alsnog kiezen
wat erin gaat — dus hij komt na één klik terug op precies de vraag die hij dacht te hebben
beantwoord. `StartPage.astro` voert dat argument al zelf in zijn kop (punt 4: *"Een abonnement
is geen dienst maar een MANIER VAN BETALEN voor hetzelfde werk"*), en die pagina is in blok D
juist op dat argument opgeruimd. Het terugdraaien maakt de pagina weer wat hij was.

Wat er wél achter je vraag zit — *het abonnement is te onzichtbaar en het is belangrijk voor
stabiele omzet* — klopt volledig. Alleen ligt de oplossing niet in de eerste vraag maar in de
drie momenten hieronder.

---

## 4 · Het voorstel — drie plekken, op volgorde van opbrengst

### A · In het bestelformulier, op het moment dat het aantal bekend is

**Waar.** Direct onder `.pl-total-rung` in de vaste totaalbalk — de regel die nu zegt *"Nog
2 producten en het tarief zakt van € 85 naar € 65"*. Dezelfde balk, dezelfde tekenfunctie,
dezelfde plek waar de klant toch al naar zijn eigen getal zit te kijken.

**Wanneer.** Zodra het aantal het kleinste plan haalt (`planFor(n)` geeft dan een plan) en
de gekozen dienst de vergelijking eerlijk maakt:

| Gekozen dienst | Wat de regel zegt |
|---|---|
| Catalog + Lifestyle | De volledige vergelijking met bedragen — het plan wint met € 155 tot € 368 |
| Lifestyle | Idem — bij 5 producten € 410 los tegen € 390, en het plan doet er catalog bij |
| Catalog | **Geen bedragen.** Het plan is hier duurder. Hooguit één neutrale regel over de vaste week en de Editions-beelden, of niets |
| Video | Niets — alleen Studio heeft clips, en dan twee |

**De tekst** (NL, bij 12 producten, catalog + lifestyle):

> Elke maand hetzelfde? Studio dekt 12 producten en 2 clips per maand voor € 790 — dezelfde
> levering los besteld is € 1.158. **Bekijk de abonnementen →**

Twee bedragen, allebei uitgerekend, geen bijvoeglijk naamwoord. Precies de vorm van
`upgradePrompt()`, alleen dan vóór de bestelling in plaats van erna.

**Wat het kost om te bouwen.** `cfg` in `OrderFlow.astro` krijgt er een `plans`-lijst bij
(id, naam, producten, clips, maandbedrag, ladderbedrag) — allemaal uit `plans()` en
`planSaving()`, geen nieuw getal. In `pipeline.js` komt er een blok naast het bestaande
rung-blok, zo'n twintig regels. Geen nieuwe rekenkunde, geen nieuwe bron van waarheid.

**Waarom dit het meeste doet.** Het is het enige moment waarop de klant zijn eigen aantal
al heeft ingevuld. Elke andere plek moet raden wat hij nodig heeft; hier staat het op het
scherm.

---

### B · Op `/start`: de rij een halve pagina omhoog

De abonnementsrij staat nu als paneel 5, ná de deuren, ná "wat er daarna gebeurt" en ná "wat
er meegaat". Het is een betaalvraag over de deuren die erboven staan, en er zitten twee
panelen tussen die allebei een reden zijn om te stoppen met lezen.

**Voorstel:** de rij direct onder de deuren, vóór "wat er daarna gebeurt". Hij blijft een
**rij** en wordt geen tegel — het argument uit §3 blijft staan; alleen de volgorde verandert.

Kosten: het verplaatsen van één `<section>`.

---

### C · Na de bestelling: `/thank-you` en de mail

De mail heeft `upgradePrompt()` al, vanaf 12 producten in een rollend kwartaal. `/thank-you`
zegt niets. Iemand die net 20 producten heeft besteld, staat op een pagina die hem bedankt en
niets vraagt.

**Voorstel:** één regel onderaan `ty-foot`, met dezelfde drempel als de mail, dus dezelfde
functie en geen tweede regel om te onderhouden.

Kosten: vier regels.

---

## 5 · Hoe het verkocht hoort te worden — het argument zelf

Dit is het deel waar je om vroeg ("kijk uitgebreid hoe dit het beste verkocht kan worden").
Een abonnement heeft vier verkoopargumenten, en de site leidt nu met het zwakste.

1. **Een vastgezette week in de planning.** Het abonnement reserveert capaciteit
   (`PLAN_CAPACITY_SHARE = 0.30`); een losse bestelling wacht op wat er over is. Dit is het
   enige argument dat een concurrent niet kan kopiëren door de prijs te verlagen, en het is
   het argument dat groeiende merken het meest raakt.
2. **20 Editions-beelden per maand die los niet te koop zijn.** Sfeer, textuur en licht voor
   de maanden waarin er niets nieuws te fotograferen valt. Dat is precies het gat waar een
   abonnement normaal op sneuvelt ("deze maand heb ik niets nieuws"), en het is dichtgezet.
3. **Doorschuiven.** Ongebruikte producten schuiven een maand door, op de jaartermijn drie.
   Haalt het grootste bezwaar weg: *ik betaal voor iets dat ik niet gebruik.*
4. **De prijs.** Waar — maar alleen tegenover dezelfde output, en dat is precies de
   voorwaarde die een klant niet in zijn hoofd heeft als hij het leest.

De volgorde op `/start` is nu: planning → prijs → Editions. Ik zou er **planning → Editions →
doorschuiven** van maken en de prijs naar de vergelijkingsregel in het formulier verhuizen,
waar hij met twee echte getallen staat in plaats van als bewering.

Reden: de prijs als bewering is zwak (de klant kan hem weerleggen), de prijs als twee getallen
naast elkaar is sterk (de klant rekent hem na en gelooft hem daarna). Verplaats hem naar de
plek waar de getallen kloppen.

---

## 6 · Wat ik je vraag te kiezen

| # | Vraag | Opties |
|---|---|---|
| 1 | De regel in het bestelformulier | **a** met bedragen bij catalog+lifestyle en lifestyle, neutraal bij catalog · **b** bij elke dienst, zonder bedragen · **c** niet doen |
| 2 | De abonnementsrij op `/start` omhoog, direct onder de deuren | ja / nee |
| 3 | Eén regel op `/thank-you` | ja / nee |
| 4 | De volgorde van de argumenten omdraaien (planning → Editions → doorschuiven) | ja / nee |

De correctie van de twee te ruime zinnen (§2) doe ik hoe dan ook — die staat er nu fout.

Mijn eigen voorkeur: **1a, 2 ja, 3 ja, 4 ja.** Samen is dat ongeveer een halve dag werk en
het raakt geen enkel bedrag: alles komt uit `pricing.js` en `plans.js` zoals het er al staat.
