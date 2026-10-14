# Het abonnement — ontwerp, prijs, en wat er gebouwd moet worden

*16 augustus 2026. Alle bedragen in dit stuk zijn uitgerekend met de echte modules
uit `src/data/pricing.js` en `src/data/capacity.js`, niet met de hand.*

---

## 1 · Wat er al is, en wat er niet is

Het abonnement bestaat al als PRODUCT. `pricing.js` draagt drie volledig
uitgewerkte plannen, ze staan live op /pricing, ze zitten in de structured data
en de FAQ beantwoordt de vraag of ze bestaan:

| Plan | Prijs | Producten/mnd | Erbij |
|---|---|---|---|
| Starter | € 390 | 5 | — |
| Studio | € 790 | 12 | 2 videoclips |
| Brand | € 1.690 | 30 | Merkmodel |

Met `PLAN_MIN_MONTHS = 3` en `PLAN_ROLLOVER_MONTHS = 1`. De knop eronder is
"Een plan opzetten" → /contact. **Het is dus vandaag een verkoopgesprek en geen
product.**

Wat er ontbreekt om het geautomatiseerd te laten werken, gemeten in de code:

1. **Mollie kent geen herhaling.** `src/lib/mollie.js` exporteert negen functies
   en geen enkele raakt aan `sequenceType`, een mandaat, een Mollie-customer of
   een subscription. Volgens Mollie's documentatie is de keten: customer
   aanmaken → eerste betaling met `sequenceType: 'first'` → mandaat komt eruit →
   daarna óf een subscription (Mollie schrijft zelf af) óf zelf afschrijven met
   `sequenceType: 'recurring'`. Daarvan bestaat nu niets.

2. **Er is geen tabel.** Geen `subscriptions`, geen saldo, geen termijn.

3. **De webhook zou elke afschrijving weggooien.** Dit is de belangrijkste
   regel in dit document. Abonnementsbetalingen dragen een `subscriptionId` en
   géén order-metadata. `recordPaid()` in `functions/api/webhook/mollie.js` doet:

   ```js
   const ref = meta.order_ref;
   if (!ref) {
     console.error('[mollie-webhook] paid payment carries no order_ref —', payment.id);
     return;
   }
   ```

   Geld binnen, foutregel in het log, niets geboekt. Geen bug van vandaag — er
   zijn geen abonnementen — maar het is de eerste regel die om moet.

4. **Er is geen pad om een abonnement te VERZILVEREN.** Dit is het zwaarste
   stuk, en het is niet het factureren. Elke bestelling rekent nu vanaf de
   ladder; er is nergens een "deze bestelling trekt uit mijn saldo". Dat raakt de
   orderflow, `quoteOrder()`, de capaciteitspoort, de bevestigingsmail en de
   werkmap.

---

## 2 · Het cijfer dat het ontwerp bepaalt

Uit `capacity.js`: 18 producten per dag, waarvan **15 met gereserveerd venster**
en 3 vloer voor de wachtrij. Over 21 werkdagen:

**315 producten per maand met venster. 378 in totaal.**

Wat één abonnee daarvan vastlegt:

| Plan | Producten | Aandeel van je venstercapaciteit | Max abonnees als álles naar plannen gaat |
|---|---|---|---|
| Starter | 5 | 1,6 % | 63 · € 24.570/mnd |
| Studio | 12 | 3,8 % | 26 · € 20.540/mnd |
| Brand | 30 | 9,5 % | 10 · € 16.900/mnd |

Tien Brand-abonnees en je hele venstercapaciteit is weg vóór er één losse
bestelling binnenkomt. **Een abonnement verkoopt capaciteit, niet software.**
Dat is het hele verschil met een SaaS-abonnement en het is de reden dat elk
ontwerpbesluit hieronder eruitziet zoals het eruitziet.

---

## 3 · De prijs — en waarom er geen ruimte is voor een jaarkorting

### Je huidige curve is goed. Ik dacht eerst van niet.

Naast elkaar gelegd als totalen lijkt de korting onlogisch: 28 % op Starter,
32 % op Studio, 13 % op Brand — de grootste verbintenis de kleinste korting.
Per product tegen het laddertarief dat dát aantal zelf al krijgt, is het:

| Plan | Ladder bij dit aantal | Plan | Onder de ladder |
|---|---|---|---|
| Starter (5) | € 109 | € 78,00 | 28,4 % |
| Studio (12) | € 85 | € 65,80 | 22,5 % |
| Brand (30) | € 65 | € 56,30 | 13,3 % |

Netjes aflopend, en dat hóórt zo: **de ladder belóónt volume al.** Een
volumeplan bovenop een volumekorting kan niet nog een keer hetzelfde belonen.

### En daar loopt het jaarabonnement op stuk

Twee maanden korting, maandelijks afgeschreven — de vorm die je koos —
uitgerekend op je eigen bedragen:

| Plan | Jaar netto | Per maand | Per product | Bodem van de ladder |
|---|---|---|---|---|
| Starter | € 3.900 | € 325 | **€ 65,00** | € 65 |
| Studio | € 7.900 | € 658 | € 54,80 | ⚠ onder € 65 |
| Brand | € 16.900 | € 1.408 | € 46,90 | ⚠ ver onder € 65 |

Met één maand korting in plaats van twee gaan Studio (€ 60,30) en Brand
(€ 51,60) er nog steeds onder.

**De conclusie is niet "kies een ander percentage".** Je maandelijkse Studio- en
Brand-plannen prijzen al op of onder je eigen ladderbodem van € 65. Er is geen
ruimte meer in de prijs, op geen enkel percentage. Wie dat toch doortrekt,
verkoopt straks dertig producten per maand voor € 47 per stuk aan een klant die
op de losse ladder € 65 zou betalen — en dat is de klant die het meeste van je
capaciteit opeet.

### Wat een jaarverbintenis dan wél mag kopen

Alle vier deze dingen kosten je niets extra en zijn voor de klant meer waard dan
tien procent:

1. **Een STAANDE gereserveerde week.** Dezelfde plek in de agenda, elke maand,
   niet elke keer opnieuw onderhandeld. Dit is het waardevolste dat je hebt en
   het kost je nul, want je reserveert capaciteit die je anders ook verkoopt.
   Voor een merk dat elke maand moet posten, is een vaste datum precies waarom
   je een abonnement neemt.
2. **Doorschuiven van 1 naar 3 maanden.** `PLAN_ROLLOVER_MONTHS` staat op 1. Een
   merk met een seizoen kan dat niet halen. Drie maanden is een echt verschil en
   het vlakt jóuw capaciteit juist af.
3. **Prijsslot voor twaalf maanden.** Gaat je ladder omhoog, dan blijft hun
   tarief staan. Kost vandaag niets en is precies wat een inkoper aan zijn
   directeur wil kunnen uitleggen.
4. **Het merkmodel ook op Studio.** Nu alleen op Brand. De setup van € 1.250 is
   een eenmalige kost die je over twaalf maanden toch al afschrijft (€ 104/mnd).

**Voorstel voor het jaarabonnement:** dezelfde maandprijs, twaalf maanden vast,
en die vier dingen erbij. Op Starter kun je de twee maanden korting wél geven —
dat brengt hem op exact € 65 per product, precies de bodem van je ladder, en dat
is een lijn die je in één zin kunt uitleggen.

---

## 4 · Hoe het eruit moet zien

### Op /pricing

De drie kaarten staan er al. Wat erbij hoort:

* Een schakelaar **maandelijks / 12 maanden** boven de drie kaarten, die alleen
  het bedrag en de regel eronder verandert — geen tweede set kaarten.
* Onder elke kaart de vergelijking die `planSaving()` al uitrekent, en bij de
  jaarvariant de vier dingen uit §3 als de reden, niet een percentage.
* **De teller.** "Nog 3 van de 8 plekken deze maand." Waar dat vandaan komt
  staat in §5. Dit is geen schaarste-truc: het is waar, het volgt uit
  `capacity.js`, en het is de eerlijkste manier om te zeggen waarom een
  abonnement niet altijd kan.

### Het opzetten

Vier stappen, en de eerste drie heb je al staan in de bestelstroom:

1. **Wat maken we, en hoeveel** — het plan, en de maand- of jaarvorm.
2. **Je merk** — dezelfde brand kit als in VISUAILS Studio: gezicht,
   achtergrond, kanalen, beeldverhouding. Bij een abonnement is dit geen
   voorkeur meer maar een afspraak, en dat is precies waar de brand kit voor
   gebouwd is.
3. **Wie je bent** — hergebruik van stap 3 van de orderflow, inclusief de
   zakelijke verklaring en de btw-controle. Een abonnement is uitsluitend
   zakelijk, dus die verklaring is hier zwaarder dan bij een losse bestelling.
4. **Mandaat en eerste maand** — één betaling met `sequenceType: 'first'`, en
   daarna schrijft Mollie zelf af.

### In VISUAILS Studio

Eén nieuw blok op /account, en het moet drie vragen beantwoorden zonder dat
iemand hoeft te rekenen:

* **Wat heb ik nog** — "7 van je 12 producten deze maand, 3 schuiven door tot
  september."
* **Wanneer is mijn week** — de staande gereserveerde datum.
* **Wat kost het en wanneer** — het volgende afschrijfmoment en het bedrag,
  plus de facturen. Die laatste heb je al.

En een **opzeggen**-knop die zegt wat er gebeurt en niet vraagt of je het zeker
weet: per welke datum, wat er met het resterende saldo gebeurt, en wat de
minimumtermijn nog betekent. Een abonnement dat je alleen per e-mail kunt
opzeggen, is een abonnement dat mensen niet durven te nemen.

### In /admin

De plekken, de vastgelegde capaciteit als percentage, wie er deze maand nog niet
besteld heeft (dat is werk dat gaat komen), en de mandaten die zijn ingetrokken —
want een ingetrokken mandaat is een abonnement dat stilletjes stopt te betalen.

---

## 5 · Wat er gebouwd moet worden, op volgorde

De eerste vijf zijn identiek ongeacht hoe iemand aan een abonnement komt. Die
keuze raakt alleen nummer 6.

1. **`migrations/0030` — de tabellen.** `subscriptions` (klant, plan, vorm,
   status, mandaat-id, Mollie-subscription-id, startdatum, minimumtermijn,
   staande vensterdag) en `subscription_credits` (per maand: toegekend,
   verbruikt, doorgeschoven, vervallen). Twee tabellen en niet één, om dezelfde
   reden als `payments` naast `orders`: de regel en het totaal.

2. **`src/data/plans.js` — het contract.** Wat een plan bevat, de jaarvorm, de
   doorschuifregels, en hoeveel plekken er zijn. Zelfde rol als `ratios.js` en
   `backgrounds.js`: de studio, het formulier, de mail en /admin lezen hier één
   getal in plaats van vier.

3. **Mollie recurring in `src/lib/mollie.js`** — customer, eerste betaling met
   mandaat, subscription aanmaken, subscription opzeggen, mandaat intrekken.

4. **De webhook laat een abonnementsbetaling niet meer vallen.** De `!ref`-tak
   krijgt een tweede pad op `subscriptionId`: boek de betaling, ken het saldo van
   die maand toe, factureer. De idempotentiepoort op `UNIQUE(provider,
   external_id)` werkt hier al goed, want elke afschrijving heeft zijn eigen id.

5. **Verzilveren in de orderflow.** Het zwaarste stuk. Een ingelogde abonnee
   ziet in stap 1 niet de ladder maar zijn saldo, met het meerdere boven zijn
   saldo op de ladder erbij. Raakt `quoteOrder()`, de capaciteitspoort (een
   staande week hoort niet met losse bestellingen te concurreren, hij is al
   gereserveerd), de bevestigingsmail en de werkmap.

6. **De ingang** — en dat is de keuze die nog open staat.

7. **De voorwaarden.** §-en over termijn, opzegging, prijswijziging en het
   SEPA-mandaat. Je huidige voorwaarden zijn voor eenmalige bestellingen
   geschreven. Dit is geen bijzaak: een doorlopende afschrijving zonder
   voorwaarde die hem dekt, is een terugboeking die je verliest.

---

## 6 · De ene meting die de ingang bepaalt

De vraag "zelfbediening of op aanvraag" is in feite één vraag: **hoeveel van je
venstercapaciteit wil je vastleggen aan abonnementen?**

* Onder ~30 % (95 producten/mnd): dat is 7 Studio-abonnees, of 3 Brand. Bij die
  aantallen is een aanvraag met een handeling van jou geen knelpunt — het zijn
  een paar per maand — en bouwt het het minst.
* Boven ~50 %: dan komen er genoeg aanmeldingen dat jouw goedkeuring de rem
  wordt, en dan is zelfbediening met een harde plekkenteller het antwoord.

**Mijn advies:** begin op aanvraag met een limiet van 30 % in `plans.js`, en zet
de teller wél op /pricing. Dan meet je drie maanden lang hoeveel aanvragen er
komen en hoeveel er blijven na de minimumtermijn — precies de twee getallen die
je nu niet hebt. Zelfbediening is daarna een kleine stap, want alles eronder is
dan al gebouwd. De andere richting is duurder: een zelfbedieningsknop
terugdraaien nadat je capaciteit hebt oververkocht, kost je een klant en een
belofte.

---

## 7 · HERZIENING — 16 augustus 2026: de wachtrij is van de klant

Lucas, nadat hij het eerste ontwerp zag: *"Ik wil niet dat visuails zegt wat er
aan de beurt is. Ergens vind ik dit idee wel sterk maar dat wil ik denk ik voor
duurdere abonnementen hebben [...] Onthoud ik werk alleen dus ik kan uiteindelijk
overzicht verliezen dus zoveel mogelijk moet geautomatiseerd zijn."*

Dat is een terechte afwijzing van §4, en de reden is structureel: een blok dat
"klaargezet voor september" heet, vraagt om iemand die het klaarzet. Per abonnee,
elke maand. Bij vijf abonnees is dat een half uur; bij vijfentwintig is het een
baan die je niet hebt. Een retentiemechanisme dat met de omzet meegroeit in
handwerk, is geen mechanisme maar een plafond.

### Wat ervoor in de plaats komt

**De wachtrij is van de klant, en die vult hem zelf.** Hij zet erin wat hij
gemaakt wil hebben op het moment dat hij eraan denkt — een product bedacht in
maart mag in juni gemaakt worden. Foto's mogen er meteen bij, of later. Als zijn
week aanbreekt, pakt het systeem de bovenste N en begint. Er komt geen mens aan
te pas.

Vier redenen waarom dit STERKER vasthoudt dan een voorstel van ons:

1. **Het is zijn eigen werk.** Een lijst die je zelf hebt opgebouwd, gooi je niet
   weg. Een voorstel van een leverancier wel.
2. **Er staat altijd iets te wachten.** Opzeggen is dan geen abonnement
   beëindigen maar zes producten laten liggen die je al had bedacht.
3. **Het maakt de brand kit noodzakelijk.** Als er niemand kijkt voordat er
   geproduceerd wordt, moet vastliggen hóe het gemaakt wordt — gezicht,
   achtergrond, verhouding, kanalen. De brand kit was tot nu toe een gemak; in
   een abonnement is het het contract dat automatisering mogelijk maakt.
4. **Het kost jou nul.** En dat is de eis.

### En de premium-variant blijft bestaan, precies waar hij hoort

Meedenken over wat er aan de beurt is, blijft het idee dat het is — maar het is
JOUW TIJD, en dat is het schaarste goed in dit bedrijf. Niet je capaciteit: je
aandacht. Dus wordt het geen onderdeel van een plan maar een **losse toevoeging
boven Brand**, apart geprijsd, en met een harde limiet op het aantal klanten dat
hem mag hebben. Vier is genoeg om te beginnen: vier keer een uur per maand is
in te plannen, veertig keer niet.

Dat is ook de eerlijke verkoop: bij Starter en Studio koop je productie, bij de
toevoeging koop je een gesprek. Twee dingen die niet in één prijs horen.

### Wat "geautomatiseerd" concreet betekent voor een eenmanszaak

Het normale pad mag JOU NIET BEREIKEN. Alleen uitzonderingen. Dat vraagt vier
dingen die alle vier in de bouwlijst van §5 horen:

* **De plekkenlimiet uit `capacity.js`** — zodat je jezelf niet kunt oververkopen
  terwijl je slaapt. Dit is de belangrijkste van de vier.
* **Eén dagelijkse samenvatting** in plaats van losse meldingen: welke vensters
  vandaag starten, hoeveel producten, welke wachtrijen leeg zijn, welke mandaten
  zijn gesneuveld. Eén mail per dag, en die is leeg als er niets is.
* **Een leeg-wachtrij-mail naar de KLANT** en niet naar jou. Vijf dagen voor zijn
  week: *"je week begint maandag en je wachtrij is leeg."* Dat is zijn probleem
  om op te lossen en het systeem mag het hem zelf vertellen.
* **Zelfherstel bij een mislukte afschrijving.** Mandaat ingetrokken of betaling
  geweigerd: het abonnement pauzeert zichzelf, de klant krijgt bericht met een
  link om het mandaat te vernieuwen, en het venster komt vrij voor losse
  bestellingen. Jij hoort er pas van als het twee keer mislukt.

Zonder die vier is een abonnement voor één persoon een baan. Met die vier is het
een systeem dat je alleen 's ochtends leest.
