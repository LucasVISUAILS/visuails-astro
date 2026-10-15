# Levering 51 — 15 oktober 2026

Wat afvinklijst 30 open liet: de overstapzin in de voorwaarden (v30-voorwaarden = a). Een eigen mail als de overstap ingaat komt er niet (v30-ingaan = a): de factuurmail noemt het nieuwe plan. Daarna jouw bericht van 16:10 over de contentbreedte, en de controle die je vroeg: de website, Studio en /admin doorgelopen, vooral de abonnementen. Eerst in de proefomgeving (deel 3), daarna live op visuails.com in je Chrome, in testmodus (deel 5).

● = nieuwe of veranderde tekst die de klant ziet. Eerst NL, daaronder EN.

---

## 1 · De contentbreedte (bericht 16:10)

Gemeten op 1920 px had de site drie breedtes. De secties liepen van 280 tot 1640 px. De opening liep van 64 tot 1884 px: de tekst tegen de linkerrand, de telefoon tegen de rechterrand. De footer liep van 166 tot 1754 px.

- Nu lezen alle onderdelen één waarde (`--h-kolom` in hal.css): de secties, de paginakoppen, het €1-blok, de opening en de footer. Op 1920 begint de tekst van de opening op 280 px, gelijk met de secties. Het beeld schuift even ver mee: de telefoon eindigt nu op 1704 px, was 1884.
- Tot 1440 px verandert er niets. Op 2560 staat de tekst ook op de kolom, maar het beeld blijft tegen de rechterrand. De foto vloeit rechts niet uit, en de strepen lopen door tot de rand. Daarom werd de ruimte tussen titel en laptop daar groter.
- Gemeten van 1024 tot 2560 px: tussen de titel en de laptop zit nergens minder dan 29 px (op 1440, zoals het al was).
- Nog smaller, bijvoorbeeld 1360? Dat is één waarde, maar dan moet de foto rechts uitvloeien. Anders schuift de titel tegen de laptop. Dat staat als vraag in afvinklijst 31.

## 2 · Overstappen in de voorwaarden (v30-voorwaarden = a)

In §9a staat nu een alinea "Overstappen", tussen bijkopen en opzeggen. De datum op de voorwaarden blijft "oktober 2026", want het is nog oktober en de pagina noemt alleen de maand. In src/data/juridischeDatums.js staat erbij wat er vandaag veranderde.

● Voorwaarden §9a
> Overstappen. Op de maandelijkse termijn kun je in VISUAILS Studio overstappen naar een ander abonnement, ook naar een abonnement op maat. De overstap gaat in bij je volgende termijn: vanaf dan schrijven we het nieuwe bedrag af en krijg je de credits van het nieuwe abonnement. Tot die dag blijft je huidige abonnement zoals het is, en kun je de overstap terugdraaien. Pauzeer je intussen, dan gaat de overstap in zodra je hervat; zeg je op, dan vervalt hij. De credits die je al hebt, blijven staan. Vanaf de overstap hoort je spaarplafond bij het nieuwe abonnement: is dat lager, dan vervalt op die dag wat erboven komt, en vooraf sturen we je een herinnering. Halverwege een vooruitbetaald jaar stap je niet over; mail ons dan. Meer credits per maand kan alleen als er in de studio plek voor is; is die er niet, dan zegt VISUAILS Studio dat.
> Switching plans. On the monthly term you can switch to another plan in VISUAILS Studio, including a plan made to measure. The switch starts with your next monthly payment: from then on we collect the new amount and you get the credits of the new plan. Until that day your current plan stays as it is, and you can undo the switch. If you pause in the meantime, the switch starts when you resume; if you cancel, it lapses. The credits you already have stay. From the switch your savings limit follows the new plan: if it is lower, whatever is above it lapses on that day, and we send you a reminder beforehand. You cannot switch partway through a prepaid year; email us instead. More credits a month is only possible if the studio has room for them; if it does not, VISUAILS Studio says so.

## 3 · Wat de controle vond, en wat er nu anders is

Doorgelopen in de proefomgeving met nep-Mollie:

- afsluiten: Starter, Merk, op maat (Engels) en een vooruitbetaald jaar;
- termijnen, een mislukte afschrijving en een terugboeking, elke webhook ook nog een keer;
- bijkopen, overstappen (omhoog, omlaag, op maat, terug, ongeldige invoer), pauzeren en hervatten met en zonder overstap, en opzeggen;
- bestellen met credits op 390 px, en annuleren in /admin met de credits terug;
- de hele site op 390 en 1440, als gast, als klant en als admin: 292 paginametingen en 1454 links.

Wat goed ging, staat onderaan. Dit kwam eruit:

**A02 · Overstappen naar minder credits kostte credits zonder waarschuwing (hoog).** Een Merk-klant met 870 credits stapte over naar Starter. Studio zei "Op 15 november komen er 290 bij: gebruik er vóór die dag 290". Er kwamen er 45 bij en er vielen er 780 weg, want het plafond van Starter is 135. Ook de plafondmail en stap 5 rekenden met het oude plan. Nu kent het saldo een klaarstaande overstap. Dat geldt voor de credits die erbij komen, voor het plafond bij die termijn, voor de plafondmail, voor stap 5 en voor /admin. Bij elke keuze onder Overstappen staat al vóór het overstappen wat er dan wegvalt.

● Bij de keuze, en in het blok als de overstap klaarstaat
> Je kunt er dan 135 sparen: gebruik er vóór 15 november 780, anders vallen ze bij de overstap weg.
> You can then save up to 135: use 780 before 15 November, or they lapse at the switch.
● Het saldo in Studio (en in /admin)
> Op 15 november gaat je overstap in en komen er 45 bij; je kunt er dan 135 sparen. Gebruik er vóór die dag 780, anders vallen ze weg. · Op 15 november gaat je overstap in en komen er 45 bij.
> On 15 November your switch starts and 45 more come in; you can then save up to 135. Use 780 before that day, or they lapse. · On 15 November your switch starts and 45 more come in.
● De plafondmail, 7 dagen vooraf
> Je hebt 870 credits. Op 15 november gaat je overstap naar Starter in: dan komen er 45 bij en kun je er 135 sparen. Gebruik er vóór die dag 780, anders vallen ze weg.
> You have 870 credits. On 15 November your switch to Starter starts: 45 more come in and you can save up to 135. Use 780 before that day, or they lapse.

**A03 · De termijnmail zei "vervallen niet" op de dag dat er vervielen (midden).** Komt een termijn boven het plafond, door een overstap of gewoon, dan staat het nu in de mail.

● Termijnmail
> Je saldo kwam daarmee boven je spaarplafond van 135: 780 credits zijn vandaag vervallen.
> That took your balance above your savings limit of 135: 780 credits lapsed today.

**A01 · Nieuwe abonnementen kregen geen startdatum (hoog).** Bij de eerste betaling ging het abonnement al op "loopt" voordat activateSubscription() eraan toekwam. Die werkt alleen vanuit "wacht", dus `started_at` bleef leeg. Daardoor sloeg de nachtcontrole elk nieuw abonnement over. Die controle meldt een uitgebleven incasso, bijvoorbeeld bij een verlopen machtiging. Nu zet de webhook de datum. Voor oude rijen valt de controle terug op de dag van afsluiten.

**A07 · Hervatten vóór de pauze inging zette de overstap meteen om (midden).** Iemand pauzeerde Starter tegen de volgende termijn en hervatte nog dezelfde maand. Daarmee stond hij meteen op Pro, voor een maand die op Starter betaald was: het plafond en de bijkoopprijs van Pro, voor het geld van Starter. Nu blijft de overstap klaarstaan, en Mollie krijgt al het nieuwe bedrag. Bij de eerste termijn zet de webhook hem om, net als zonder pauze. Was de pauze wél ingegaan, dan gaat de overstap bij hervatten in, zoals in levering 50.

**A06 · De pauze- en hervatmail zwegen over een klaarstaande overstap (midden).**

● Pauzemail
> Je overstap naar Pro blijft klaarstaan en gaat in zodra je hervat.
> Your switch to Pro stays ready and starts as soon as you resume.
● Hervatmail
> Je overstap naar Pro gaat in op 15 november 2026, zoals gepland. · Je overstap naar Pro is daarmee ingegaan: vanaf je volgende afschrijving krijg je 120 credits per maand.
> Your switch to Pro starts on 15 November 2026, as planned. · Your switch to Pro has started with it: from your next payment you get 120 credits a month.

**A08 · De voorwaarden over een mislukte afschrijving klopten niet (midden).** Er stond "we zetten het abonnement op pauze". Maar Mollie probeert het tot vijf keer, één keer per dag (docs.mollie.com, recurring payments). Het abonnement loopt zolang door, en pas als Mollie stopt, zet de webhook het op pauze. De mail aan de klant zei het al goed.

● Voorwaarden §9a
> Als een afschrijving mislukt. Dan laten we het je weten, en probeert Mollie het de dagen erna nog een paar keer. De credits van die termijn komen erbij zodra de betaling binnen is. Lukt het steeds niet, dan zetten wij het abonnement op pauze. Je credits blijven staan en blijven geldig tot 3 maanden na je laatste termijn. Komt de betaling alsnog binnen, dan loopt het abonnement door alsof er niets gebeurd is.
> If a collection fails. We let you know, and Mollie tries again a few times over the following days. The credits for that term come in as soon as the payment does. If the collection keeps failing, we put the subscription on pause. Your credits stay where they are and stay valid until 3 months after your last term. If the payment comes in after all, the subscription carries on as though nothing had happened.

**A18 · Vooruitbetaald jaar: "Overstappen kan bij de verlenging" (midden).** Een vooruitbetaald jaar verlengt nooit vanzelf.

● Studio, Je plan → Overstappen
> Je hebt een vooruitbetaald jaar. Dat verlengt niet vanzelf: een ander abonnement kies je als het jaar om is. Wil je eerder overstappen, mail ons dan.
> You have a prepaid year. It does not renew by itself: you choose another plan when the year is over. To switch sooner, email us.

**A20 · /start/plan zei in Google nog "in een week die voor jou gereserveerd is" (midden).** Die vaste week bestaat sinds 8 oktober niet meer.

● Zoekresultaat /start/plan
> Elke maand een vast aantal credits, onder het tarief per product. Pauzeren en opzeggen doe je zelf. Hier stel je het in.
> A fixed number of credits every month, below the per-product rate. You pause or cancel it yourself. Set it up here.

**Klein:**

- **A04, Op maat:** het voorgestelde aantal was het aantal van nu. Een Starter zag "Bij 45 credits: € 471,90", wat hij al had. Nu is het voorstel het midden tussen nu en het volgende plan: Starter 85, Pro 205, Merk 205.
- **A19, Op maat:** Studio zei "per 5", maar nam 77 aan. /start/plan neemt elk heel aantal aan. Nu zeggen ze allebei "Van 30 tot 300".
- **A05, bijkopen:** "tegen de prijs per credit van je abonnement", maar een Starter betaalt € 8,70 en /plans zegt € 8,67. De pakketten worden afgerond op hele euro's, en dat staat er nu bij.
- **A16, bijkopen:** de factuur en de mail volgen nu de taal van het abonnement, zoals de andere abonnementsmails.
- **A10–A12, /admin bij de klant:**
  - de reden van pauzeren bleef staan na hervatten, en staat er nu alleen bij een pauze of opzegging van de klant zelf;
  - boven het saldo staat "Zo staat het voor de klant in Studio:", want het zijn zijn zinnen ("Je hebt 165 credits");
  - de Mollie-kenmerken (cst_… · sub_…) staan erbij, om in het Mollie-dashboard te zoeken.

● Studio
> Tegen de prijs per credit van je abonnement, afgerond op hele euro's: bij 25 krijg je 5% korting, bij 50 10%. · Van 30 tot 300.
> At the price per credit of your plan, rounded to whole euros: 5% off with 25, 10% off with 50. · From 30 to 300.

**Gaat goed:**

- de bedragen op /plans, /start/plan, in Studio, in de mails en in Mollie: elk plan, op maat bij 60, 75, 150 en 300, het vooruitbetaalde jaar (€ 9.559,00 = 10 × € 790 + btw) en de bijkooppakketten;
- dubbele webhooks: een termijn, een terugboeking en een bijkoop geven één boeking en één mail;
- annuleren in /admin met de credits terug, ook twee keer;
- de taalknop houdt de zoekstring en het anker vast;
- de site: geen pagina breder dan het scherm, geen dubbele id's, geen kapotte beelden, één h1 per pagina. De enige consolemelding is de verwachte 401 van /account/me bij gasten (zie de vraag in afvinklijst 31).

## 4 · Wat ik je in afvinklijst 31 vraag

- **Terugboeking (A09, hoog).** Bij een teruggeboekte termijn zet de site het abonnement stil en mailt de klant "er wordt niets afgeschreven". Maar het Mollie-abonnement loopt door. In de proef werd de volgende termijn gewoon afgeschreven, met credits en factuurmail, terwijl Studio "staat stil" bleef zeggen. De klant kan niet zelf hervatten, en /admin heeft er geen knop voor.
- **Overstap naar minder credits (A02):** wat boven het nieuwe plafond komt, laten vervallen bij de overstap (nu, met waarschuwing), of drie maanden geldig laten zoals bij een pauze.
- **Abonnees in /admin (A13–A15):** er is geen overzicht van abonnees, geen lijst met termijnen per klant, en Nu doen meldt geen terugboeking of mislukte incasso.
- **/account/me (A21):** elke paginaweergave van een gast geeft een rode consolemelding (401), en Lighthouse telt die mee.
- **Contentbreedte:** zo laten (1440), of smaller met de foto rechts uitgevloeid.
- **Na de eerste betaling (live, deel 5):** de klant meteen ingelogd laten terugkomen van Mollie, met een eenmalige sleutel, of inloggen met een code zoals nu.

## 5 · De controle in de browser, op visuails.com (testmodus)

Na de proefomgeving heb ik de live site doorgelopen in jouw Chrome, met de testsleutel van Mollie: als gast, als testklant (QA51 Merk (TEST), hello+qa51merk@visuails.com) en in /admin. Afgesloten: een Merk-abonnement via iDEAL in het Mollie-testscherm. Daarna: bijkopen, overstappen, pauzeren en hervatten, bestellen met credits, annuleren in /admin met de credits terug, opzeggen. Ook alle andere pagina's van /admin, Studio in NL en EN, en de site in beide talen. De live site draait nog op levering 50, dus wat in deel 1 tot 4 staat, zag ik daar nog niet.

**De grootste: een abonnement zonder incasso (L01, L02).** Na de iDEAL-betaling bleef het mandaat bij Mollie op 'pending' staan. De site wilde alleen een 'valid' mandaat en maakte daarom geen Mollie-abonnement aan. Studio zei "Loopt" en "volgende afschrijving 15 november", maar er werd nooit meer afgeschreven. Overstappen kon niet ("lukt hier nu niet"), en hervatten na een pauze mislukte. De terugkeerpagina probeert het nog een keer, maar die zag de klant niet: zonder sessie ging hij naar het inlogscherm. Mollie zelf zegt bij het aanmaken van een abonnement: "pending or valid". Mollie schrijft pas af als het mandaat geldig is, en de eerste termijn valt pas een maand later.

- firstPaymentMandate() neemt nu het nieuwste geldige mandaat, en anders het nieuwste in 'pending'.
- Het koppelen wordt opnieuw geprobeerd: elke keer dat de klant Abonnement opent, bij hervatten (ook zonder mandaat op de rij), en elke nacht. Lukt het 's nachts niet, dan staat het in de nachtmail: "N lopende abonnementen zonder incasso bij Mollie — er wordt niet afgeschreven".
- Mollie schrijft af op de dag van het abonnement, niet op de dag van het koppelen. Koppelt de nacht een abonnement van 7 oktober op 15 oktober, dan valt de termijn op 7 november, zoals Studio zegt.
- Voor jouw testabonnementen op de live site: open ze één keer in Studio, of wacht een nacht. Dan krijgen ze alsnog een Mollie-abonnement.

Daarna heeft een aparte controle (een tweede agent die deze wijziging niet had geschreven) de code nagelezen. Die vond nog twee gaten. Ze zijn ook dicht:

- **Dubbel.** Kwamen de webhook en de terugkeerpagina tegelijk, dan maakten ze allebei een Mollie-abonnement aan: twee incasso's per maand. Dat kon al bij een creditcard, en nu ook bij iDEAL. Nu doet er één het tegelijk (een slot van twee minuten in `rate_limits`). Hij kijkt eerst of Mollie er al een heeft voor dit kenmerk. Was de ander bezig, dan probeert de webhook het na drie seconden nog eens.
- **Te vroeg.** Een mandaat staat ook op 'pending' zolang de eerste betaling nog open is. Wie dan op "terug naar de webshop" klikte, kreeg een lopend abonnement zonder te betalen. Nu telt 'pending' alleen als de eerste maand betaald is; de webhook zet de rij dan op actief.
- Studio probeert het hoogstens één keer per minuut, en wacht er hoogstens 5 seconden op.
- Niet meegenomen: wordt een abonnement pas gekoppeld ná zijn volgende termijndag (de machtiging ontbrak een hele maand), dan valt die ene termijn weg: geen afschrijving en geen credits. De nachtmail noemt zo'n abonnement elke nacht, dus je ziet het vóór het zover is.

**Verder gevonden en gemaakt:**

- L03: een pauze die nog moet ingaan. De rij "Status" zei "Gepauzeerd", terwijl de melding erboven zei "tot dan loopt je maand gewoon door". Onder Overstappen stond "Overstappen lukt hier nu niet", zonder uitleg.
- L04: opgezegd. Studio zei "geldig tot 3 maanden na je laatste termijn", de opzegmail "tot en met 14 januari 2027". Nu staat de datum ook in Studio.
- L05: /start/plan. 5000 credits getypt bij Op maat en daarna Merk gekozen: "Doorgaan naar betalen" deed niets, zonder melding. Het verborgen veld bleef 5000 en de browser keurde het af. Een link met `?credits=500` deed hetzelfde. Nu zet het veld zich terug naar 30 of 300. Staat er een ander plan aan, dan wordt het veld niet gekeurd en niet verstuurd.
- L06: afbreken. Op 1920 stond in de opening "li- / festyle", op /start/plan "no- / dig", in de footer "VI- / SUAILS". Nu breken alleen woorden van tien letters of meer af, met minstens vier aan elke kant. Lange samenstellingen breken dus nog wel. Een veld met een fout scrolt nu tot onder de vaste balk; de foutmelding stond half achter het menu. De bedankpagina zette "Zo gaat het verder" op 3 tot 5 woorden per regel. De tekstmaat gold voor zin en nummer samen; nu krijgt de zin de hele maat.
- L07: een geannuleerde creditsbestelling zei "Betaald met 4 credits", met de factuur van de bijgekochte credits erbij, terwijl die 4 credits al terug waren. Eronder stond "de betaling is met je afgerekend … een eventuele creditnota". Nu staat er "Teruggezet 4 credits", zonder factuurlink. Bij een deel terug (een product niet gemaakt) staan beide regels, met de factuur.
- L08: de melding onderin elke pagina zei "Welkom terug · VIS-… · Geannuleerd · Open deze bestelling". Voor een geannuleerde bestelling komt die er niet meer. In Studio staat hij gewoon.
- L09: /admin/log. 21 acties stonden er alleen als code, zoals `order.credits-terug` en `testimonial.unapprove`. Die hebben nu een naam. Het e-mailadres in "Wie" brak af ("hello@visuails.co / m").

● Studio, Abonnement, een pauze die nog moet ingaan (rij Status, en onder Overstappen)
> Loopt tot 13 november, daarna pauze
> Je pauze gaat in op 13 november. Wil je liever overstappen, kies dan eerst "Toch doorgaan".
> Running until 13 November, then paused
> Your pause starts on 13 November. To switch instead, choose "Keep going after all" first.

● Studio, Abonnement, opgezegd
> Je abonnement stopt op 15 november. Er wordt niets meer afgeschreven. Je credits blijven geldig tot en met 14 januari 2027: 3 maanden na je laatste termijn.
> Your plan stops on 15 November. Nothing more is collected. Your credits stay valid up to and including 14 January 2027: 3 months after your last monthly credits came in.

● Studio, Bestellingen, een geannuleerde creditsbestelling
> Betaald met 4 credits · Teruggezet 4 credits · De credits staan weer op je saldo.
> Deze bestelling is geannuleerd, dus er staan hier geen beelden. Wat er met je credits is gebeurd, staat in het creditboek onder Abonnement.
> Paid with 4 credits · Returned 4 credits · The credits are back on your balance.
> This order was cancelled, so there are no images here. What happened to your credits is in the credit log under Plan.

**Wat goed ging in de browser:** iDEAL in het Mollie-testscherm, de factuurmails (in je inbox), bijkopen met eigen factuur, het creditboek in Studio en /admin (gelijk tot op de credit), annuleren met de credits terug, opzeggen met de reden in /admin. Alle pagina's van /admin openen zonder fout. Geen consolefouten op de pagina's die ik bekeek, behalve de bekende 401 van /account/me bij gasten.

**Testrecords op de live site** (testmodus, geen echte klant geraakt): klant 118 QA51 Merk (TEST), abonnement SUB-3KN2-AUO (opgezegd), bestelling VIS-G5BU-A8Z (geannuleerd), facturen PROEF-2026-0031 en -0032, één contactbericht. Je Chrome is in Studio ingelogd als die testklant.

## Testreeks

- `node scripts/testreeks.mjs`: 251 stappen, één nieuw (`test:aboqa51`, 36 controles op wat hierboven staat). In de eerste ronde 247 goed. De vier andere verwachtten nog het oude gedrag:
  - `test:subscribe`: hervatten gaat nu soms met `voorMollie`;
  - `test:abonnementspagina`: de oude pauzereden staat er niet meer bij een terugboeking;
  - `test:spaarplafond`: de plafondregel heeft twee velden erbij;
  - `test:doorloop27c`: de opening schuift met de kolom mee.
  De toetsen zijn bijgewerkt en geven alle vier groen.
- Na de reeks nog één wijziging in src: een harde spatie in de datum bij Overstappen ("vóór 15 november" brak midden in de datum af). Daarna opnieuw gebouwd en nagelopen: overstap, aboqa51, abonnementspagina, saldostrook, bijkopen, studio, account, subscribe, spaarplafond, b3browser (300/300), spaarplafond-browser (220/220) en bijkopen-stap5-browser. Alles goed. Stand: 251/251.
- Na de controle in de browser (deel 5) twee nieuwe toetsen: `test:liveqa51` (65 controles, L01 tot L09, en L01b uit de tweede controle) en `test:liveqa51-browser` (14, in Chromium: het veld credits op /start/plan, de bedankpagina op 1920, 1280 en 390, afbreken en de vaste balk). In de eerste ronde 252 van 253 goed: `test:abonnementspagina` verwachtte de oude opzegzin zonder datum; bijgewerkt. Daarna L07 tot L09 erbij en de hele reeks opnieuw: 253/253 (19 min 46 s). Na de tweede controle (L01b) nog een keer: **253/253** (19 min 51 s).

## Uitrollen

OPRUIMEN.bat is niet nodig. Draai UITROLLEN.bat. Er is geen nieuwe migratie. Heb je 0068 (levering 50) al gedraaid? Dan is er niets met de database.
