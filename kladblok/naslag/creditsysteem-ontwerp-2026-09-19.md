# Het creditsysteem — ontwerp en doorrekening

**19 september 2026. Vervangt slots-per-soort. Lees §3 en §7 als je maar twee stukken leest.**

Lucas: *"Ze mogen alles kiezen behalve editions en custom stylen behalve wanneer
deze predefined stylen zijn (…) sommige stylen nemen meer slots/credits in (…)
maar de klant moet wel gemiddeld goedkoper uit zijn dan wanneer iemand losse
bestellingen plaatst."*

---

## 1 · Wat er vandaag staat, en waarom het niet meer klopt

Een abonnement geeft nu **slots per soort**: `{ complete: 5 }` voor Starter,
`{ complete: 12, 'video-motion': 2 }` voor Studio, `{ complete: 30 }` voor Brand.
Drie problemen:

1. **`complete` bestaat niet meer als dienst.** Het is de enige soort waar alle
   drie de plannen op draaien, en de klant kiest hem nog steeds in het
   plan-scherm. Een klant bestelt dus iets wat de site niet verkoopt.
2. **Een slot is niet deelbaar.** Iemand met 5 completes die alleen catalog wil,
   kan niet "de lifestyle-helft" laten staan. Hij verliest hem.
3. **Een nieuwe dienst is een nieuwe kolom.** Hooks, een eigen style, 4K — elk
   daarvan is vandaag een nieuwe sleutel in elke bundel van elke klant.

Credits lossen alle drie op: één getal per abonnement, elke dienst een prijs in
dat getal.

---

## 2 · De eenheid

> **Eén credit is het kleinste stukje werk dat we los verkopen, gedeeld door vier.
> Wat iets in credits kost, staat in dezelfde verhouding als de losse prijzen.**

Concreet: een catalogset is de goedkoopste dienst op de ladder en kost 4 credits.
Al het andere volgt daaruit, recht evenredig met de losse prijs bij tien tot
twintig producten (de trede waar de meeste abonnees zitten).

Dat is de hele regel, en hij is met opzet saai. Een puntensysteem dat je moet
opzoeken, is een puntensysteem dat niemand controleert.

**Credits zijn NIET hetzelfde als de agendapunten uit `capacity.js`.** Die meten
jouw tijd en bewaken een dag; credits meten waarde en bewaken een abonnement.
Twee vragen, twee schalen — en ze mogen nooit één getal worden, want dan
verandert wat een klant krijgt zodra jij sneller gaat werken.

---

## 3 · De tabel

| Dienst | Credits | Los (10–19 prod.) | € per credit |
|---|---|---|---|
| Catalogset (4 beelden) | **4** | € 51 | 12,75 |
| Lifestylecarrousel (3 beelden) | **5** | € 64 | 12,80 |
| Motion-clip | **5** | € 69 | 13,80 |
| Lifestyle-clip | **12** | € 149 | 12,42 |
| Hook | **10** | € 119 | 11,90 |
| Extra beeld bij een product | **2** | € 29 | 14,50 |
| 4K-levering van een product | **1** | € 9 | 9,00 |

**Waarom die spreiding klopt.** De vijf echte diensten liggen tussen € 11,90 en
€ 13,80 per credit — een verschil van 14 procent. Er is dus geen dienst die "de
slimme keuze" is, en dat is precies wat een creditsysteem stuk maakt als je het
verkeerd doet: als één dienst 40 procent meer waarde per credit geeft, bestelt
iedereen alleen nog dat.

De twee toeslagen onderaan vallen er bewust buiten. Een **extra beeld** is met
2 credits aan de gunstige kant (€ 14,50), en dat mag: het kost je ongeveer één
agendapunt tegen twee credits — de beste verhouding in de hele tabel, voor jou.
**4K** is met 1 credit aan de zuinige kant (€ 9,00), en dat mag ook: het is een
tweede render en geen tweede opdracht, en één credit is nu eenmaal het kleinste
wat er bestaat.

**Motion staat er met opzet net iets gunstig op** (€ 13,80, de hoogste van de
tabel). Dat is de enige bewuste afwijking: motion is de videodienst die je wilt
verkopen, hij kost je vier agendapunten tegen vijf credits, en dat is een betere
verhouding voor jou dan een catalogset (vier punten, vier credits).

### Wat er NIET in credits gaat

| | Waarom |
|---|---|
| **Editions** | Een maandset is een eigen product met een eenmalige opzet. Jouw keuze, en de juiste. |
| **Een nieuwe custom style laten bouwen** | De opzet ís het werk en wordt per project geoffreerd. |
| **Campagnevideo** | Idem — geen tarief, dus geen creditprijs. |
| **Voorrang (priority)** | Een abonnee prikt zelf zijn datum. Voorrang kopen bovenop je eigen datum is een lege belofte. |
| **Je merkmodel als gezicht** | Al betaald toen het gebouwd werd. Kiezen kost niets. |
| **Een eigen style die al op je account staat** | Kost de credits van de dienst eronder — een eigen lifestylelook is een lifestylecarrousel: 5 credits. Het bouwen was eenmalig, het maken is gewoon werk. |

---

## 4 · Wat elk plan geeft

De bedragen blijven ongewijzigd. De credits zijn **exact wat elk plan vandaag al
waard is**, omgerekend — niemand krijgt minder.

| Plan | Per maand | Credits | € per credit | Wat het vandaag was |
|---|---|---|---|---|
| Starter | € 390 | **45** | 8,67 | 5 × (catalog + lifestyle) |
| Studio | € 790 | **120** | 6,58 | 12 × (catalog + lifestyle) + 2 motion |
| Brand | € 1690 | **270** | 6,26 | 30 × (catalog + lifestyle) |

**De belofte is waar, en te controleren.** Los kost een credit € 16,30 (bij 5
producten), € 12,75 (bij 12) of € 9,80 (bij 30). In een plan kost hij € 8,67,
€ 6,58 of € 6,26. Een abonnee is dus 47, 48 en 36 procent goedkoper uit — en
belangrijker: **hoe groter het plan, hoe lager de prijs per credit.** Dat was
tot vandaag niet netjes te zeggen.

### Eén getal dat ik niet voor je kan zetten

Brand geeft € 6,26 per credit tegen Studio's € 6,58 — vijf procent beter voor
meer dan het dubbele bedrag. Dat is vandaag al zo (Brand was altijd het zwakste
plan van de drie), en het is een commerciële keuze en geen rekenfout. Wil je hem
rechttrekken: **Brand op 290 credits** maakt het € 5,83 (elf procent beter dan
Studio). Eén regel in `pricing.js`. Ik laat hem op 270 staan tot je het zegt.

### De ondergrens, zodat je weet waar je aan vastzit

Een klant die zijn hele Brand-plan aan catalogsets besteedt, koopt 67 sets =
268 agendapunten ≈ 2,7 studiodagen voor € 1690, oftewel **€ 626 per studiodag**.
Dat is de slechtste afloop en hij kan niet slechter. Vandaag is die ondergrens
€ 804 per dag, dus dit is 22 procent lager. Wil je die grens hoger, dan is
Brand op 250 credits het antwoord (€ 681 per dag). Ook dat laat ik aan jou.

---

## 5 · Doorschuiven, en wanneer een credit vervalt

Ongewijzigd in bedoeling, eenvoudiger in uitvoering. Vandaag schuift elk slot
**per soort** door en moet de oudste soort als eerste op. Straks is het één
saldo:

- Credits uit maand M zijn bruikbaar tot en met het eind van **M + 1**
  (maandtermijn) of **M + 3** (jaartermijn). Dezelfde `rolloverMonths()`.
- **De oudste credits gaan er als eerste af.** Zonder die regel is doorschuiven
  een sigaar uit eigen doos — zie de bestaande noot in `slots.js`, die blijft
  woordelijk gelden.
- Een credit wordt afgeschreven **op het vastzetten van een product**, niet op de
  levering. Dat is jouw aangiftevergelijking en die verandert niet: op tijd
  indienen, niet op tijd beoordeeld zijn.

---

## 6 · Wat er met bestaande abonnementen gebeurt

Migratie `0051`. Geen klant raakt iets kwijt:

- `subscriptions.slots_json` → `credits_json` blijft leeg voor gewone plannen;
  het plan bepaalt het saldo, zoals nu.
- **Maand op maat** (`slots_json` op de rij) wordt omgerekend met dezelfde
  tabel: `{complete: 8}` wordt 72 credits, `{'video-motion': 3}` wordt 15.
- `subscription_slots` (verbruik per soort per maand) wordt
  `subscription_credits` (verbruik in credits per maand). Bestaande rijen worden
  omgerekend, niet weggegooid.
- `plan_queue.kind` blijft bestaan en blijft de dienst dragen — daar verandert
  niets aan, behalve dat `complete` er niet meer bij kan komen. Rijen die er al
  staan blijven leesbaar en worden in `/admin` getoond als "catalog + lifestyle".

---

## 7 · Wat de klant ziet

Eén balk boven het plan-scherm:

```
   CREDITS DEZE MAAND            78 van 120 over
   ████████████░░░░░░░░░░░░      42 gebruikt · 18 vervallen op 31 oktober
```

Daaronder de diensten als kaarten, elk met zijn creditprijs, wat je ervoor
krijgt, en een beeld. Klikken zet hem in je wachtrij; de balk telt live af. Wat
je niet kunt betalen, is zichtbaar maar uitgeschakeld — met erbij hoeveel je
tekortkomt, want "grijs zonder reden" is de ergste knop die er is.

En dat is meteen het antwoord op de leverweek: de klant ziet zelf wat hij nog
heeft, prikt zelf zijn datum in de planning, en krijgt een mail als er credits
dreigen te vervallen — met erin wat hij er het beste mee kan doen. Wij hoeven
dus niet te raden welke content hij wil, en dat was precies je bezwaar.

---

## 8 · Wat dit raakt in de code

| Bestand | Wat er verandert |
|---|---|
| `src/data/pricing.js` | `SLOT_KINDS` → `SERVICE_CREDITS` (tabel §3), `PLAN_SLOTS` → `PLAN_CREDITS` (§4), `complete` uit de abonnementskant |
| `src/lib/slots.js` | `bundelVoor()` → `creditsVoor()`, saldo per maand in plaats van per soort |
| `src/lib/subscription.js` | `verbruikSlot`/`geefSlotTerug` → `verbruikCredits`/`geefCreditsTerug`, poort in `queueLock()` |
| `src/lib/account.js` | plan-scherm, creditbalk, dienstkaarten, eigen styles |
| `src/lib/admin.js` | `complete` blijven lezen, credits tonen |
| `migrations/0051` | `subscription_credits`, omrekening van `subscription_slots` |
| `src/data/capacity.js` | ongemoeid — credits en punten blijven gescheiden |

---

## 9 · De capaciteit als percentage

Aparte wijziging, uit dezelfde opdracht: *"Het puntensysteem wil ik voor mijzelf
wat logischer maken, bijvoorbeeld 100% capaciteit."*

Vandaag leest een dag als `0/79`. Die 79 is `PUNTEN_PER_DAG (100) − de drie
producten die voor de wachtrij gereserveerd blijven (21)`. Twee getallen die
allebei uitleg nodig hebben.

Straks: **100 punten is 100 procent, overal.** De gereserveerde 21 procent wordt
een gearceerde band aan het eind van de balk waar een klant niet in kan boeken.
Eén schaal, in jouw planning en in die van de klant, en de klant leest gewoon
"78% vol" in plaats van "62/79".
