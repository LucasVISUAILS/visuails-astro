# Levering 52c — 17 oktober 2026

Je berichten van 00:13 en 00:15:

> *"Kijk even goed of de VISUAILS branding wel goed is bij alle mails en wanneer hoe ze er nog mooier eruit kunnen zien."*
> *"Ook controleren nadat je alles hebt aangepast en verbeterd of ze allemaal consistent zijn en kloppen."*

Je schermafdruk kwam uit de Gmail-app in de donkere stand: het woordmerk bovenaan was bijna weg. Dat is opgelost. Daarna heb ik alle mails naast elkaar gelegd: 83 stuks, klant en studio, NL en EN. Alles wat niet gelijk liep, is gelijkgetrokken.

Levering 52b (de laptopfoto zonder paars) is nog niet uitgerold, zie ik in uitrol-log.txt. Hij gaat met deze mee, met één commitbericht.

● = nieuwe of veranderde tekst die de klant ziet. Eerst NL, daaronder EN.

---

## 1 · Het logo in de donkere stand van Gmail

- **Waarom het wegviel.** De Gmail-app maakt een lichte mail zelf donker, maar laat beelden zoals ze zijn. Het woordmerk was donkere inkt op een doorzichtige achtergrond: in de donkere stand stond dat donker op donker.
- **Nu staat het woordmerk op een wit plaatje** met ronde hoeken (`public/img/mail/woordmerk-plaat.png`, 156 × 46 in de mail, 3× scherp). Het woordmerk zelf is niet veranderd en even groot (124 × 22).
  - In de lichte stand zie je het plaatje niet: wit op wit.
  - In de donkere stand is het een witte pil met het donkere woordmerk erin.
- **Nagemeten** in Chromium met dezelfde automatische donkere stand als de Gmail-app, op 7 mails: de pil is wit (helderheid boven 235 van 255), de letters donker (onder 60). Met het oude beeld faalt die meting, dus de toets vangt het oude probleem.
- `woordmerk-inkt.png` blijft staan: mails die al verstuurd zijn, wijzen ernaar.

## 2 · Eén huisstijl voor alle mails

- **Eén palet.** Elke kleur in elke mail komt uit het palet van de mail (`C` in `src/lib/mailTemplate.js`). Er stonden nog een grijs uit augustus (#8A8F98, 3,25:1 op wit) en een zwart in. Ook de studiomails gebruiken nu het palet, ook de mail bij een nieuwe bestelling.
- **Elke link heeft een eigen kleur**, dus nooit meer het blauw van de mailapp.
- **De letter.** Lopende tekst is overal 16 px (was 15). Nergens staat iets kleiner dan 12 px. Het laagste contrast is 4,72:1. Overal Arial.
- **De brief is 544 breed** (was 600), ook in Outlook. Gemeten, de woorden per regel in de lopende tekst:
  - op een telefoon (390): mediaan 6,5;
  - op een computer (640): mediaan 8,8 (was 11 tot 15).

  Je regel is 5 tot 7. Op een computer zit de brief daar nog boven. Dat staat als vraag in afvinklijst 33, met drie gemeten breedtes.
- **Het nachtrapport is een brief geworden.** Het was platte tekst, op een telefoon tot 1100 px breed. Nu heeft het het briefhoofd. De lijst is genummerd en elke knop is een link. Wat misging staat in amber. De platte tekst gaat als tweede deel mee. Het rapport gaat nu ook via dezelfde verzendfunctie als de andere mails, met de gewone afzender.
- **De ruimte onder een knop** zit nu in de knop zelf (20 px). Losse tussenruimtes die daardoor dubbel werden, zijn weg. Gemeten in alle mails: onder een knop staat 20 tot 24 px, voor een nieuw kopje of de vragenregel 34 tot 38 px.

## 3 · Het kenmerk, het onderwerp en de voorregel

- **Onder elke kop een woord vóór het nummer.** Eerst stond er soms "Referentie VIS-…", soms alleen een kaal nummer. Nu staat er altijd een woord voor, uit één tabel:
  - Referentie / Reference
  - Abonnement / Plan
  - Factuur / Invoice
  - Creditnota / Credit note
  - Tegoed / Credit
  - Merkmodel / Brand model
  - Ook bij een offerte staat er "Referentie". Het is hetzelfde nummer als in de aanvraag.
- **In het onderwerp staat het nummer achteraan**, na " — ". Dat deden de meeste mails al. Vier deden het nog anders of hadden geen nummer: de annulering, de vervallen bestelling, het welkom bij een abonnement en de pauzevraag. Hetzelfde geldt voor de onderwerpen die /admin voorinvult als jij zelf mailt (ontbrekende foto's, betaling staat open, nieuwe leverdatum).
- **De voorregel** (het grijze stukje na het onderwerp in de inbox):
  - Een factuurmail zonder pdf zei toch "zit als pdf bij deze mail". Dat staat er alleen nog als de pdf erbij zit. Anders: "staat klaar in VISUAILS Studio".
  - De vijf abonnementsmails (pauze, hervat, opgezegd, overstap, overstap terug) herhaalden hun kop. Nu staat er de eerste zin van de mail.

## 4 · De aanhef en de vragenregel

- **Elke klantmail begint met "Hoi Sanne,"** (EN "Hi Sanne,"). De factuur, de creditnota, de abonnementsmails, de vervalmail, de pauzevraag en de creditmails hadden er geen. Is de naam niet bekend, dan staat er "Hoi,", zoals in de andere mails. Waar de naam ontbrak in wat de site ophaalt (de creditnota, de factuur na betalen met tegoed, de bijkoop en de nachtmails), haalt hij die nu op.
- **Elke klantmail eindigt met de vragenregel.** "Vragen? Antwoord op deze mail of **app ons**." staat er nu overal, met de link naar WhatsApp.
  - Bewust zonder vragenregel: de inlogcode, de twee adresmails, de kopie van het contactformulier, de checklist, de Studiobrief en de proefronde.
  - De annulering eindigt al met "Beantwoord deze mail".
- In de creditmails stond nog "Twijfel je, app ons even; dan denken we mee." zonder link. Die zin is weg, de vragenregel staat er nu.

## 5 · De controle

- **Twee nieuwe toetsen over alle 83 mails** (in `tests/lib/alle-mails.mjs` roep ik ze op met hun echte bouwers en nepgegevens; er gaat niets de deur uit):
  - `test:mailsmerk` (25 regels). Overal het witte plaatje en 544 breed. Alleen kleuren uit het palet, elke link gekleurd. Niets onder de 12 px en lopende tekst 16 px. Een woord vóór elk nummer onder de kop. Het nummer achteraan in het onderwerp. Een voorregel die niet het onderwerp herhaalt, en nooit "zit als pdf" zonder pdf. De vragenregel en de aanhef. En of er geen mail stil wegvalt.
  - `test:mailsmerk-browser` (26, in Chromium). De donkere stand van Gmail op 7 mails. En alle mails op 390 en 640: minstens 12 px, minstens 4,5:1, niets breder dan het scherm, overal Arial.
- `scripts/mail-render.mjs` tekent nu ook alle mails, in drie standen: licht, Gmail donker en telefoon (in `.render/mails/`, niet in git).
- **Een tweede agent heeft alles nagelezen**, los van mij. Hij vond elf punten. Die zijn gemaakt, op één na: boven een nieuw kopje vlak na een knop ("Zo gaat het verder") blijft 38 px. Dat is ongeveer de ruimte na een alinea (34), en zo begint daar zichtbaar een nieuw stuk. Wat hij vond:
  - In het nachtrapport hoorde de punt of het haakje na een adres bij de link. Daardoor gaf "/admin):" een kapotte link.
  - De voorregel van de overstapmail brak af bij "(incl.".
  - De creditnota zei "Hierbij de creditnota" ook als de pdf er niet bij zat.
  - Op een paar plekken stond de ruimte na een knop dubbel.
  - Was de voornaam leeg, dan zeiden de nachtmails "Hoi,", ook als de volledige naam er wel was. Nu nemen ze dan de volledige naam.
  - Gaat het opmaken van het nachtrapport ooit mis, dan gaat de platte tekst toch.
- **Onderweg gevonden:** in twee studiomails stond de merknaam die de klant zelf typt, onder de kop als HTML. Een merknaam met een link erin was daar een echte link. Nu staat hij er als tekst.

## ● Teksten die de klant ziet

● Werkt de knop niet? (inloggen, adres wijzigen, betaallink, betaalherinnering, offerte)
> Werkt de knop niet? Open deze link:
> Button not working? Open this link:

(was "Gebruik deze link: →" zonder adres, of "Kopieer deze link in je browser:")

● Het kenmerk onder de kop
> Referentie · Abonnement · Factuur · Creditnota · Tegoed · Merkmodel
> Reference · Plan · Invoice · Credit note · Credit · Brand model

● De annulering, onderwerp
> Je bestelling is geannuleerd — VIS-…
> Your order has been cancelled — VIS-…

● De vervallen bestelling, onderwerp
> Je bestelling is vervallen — VIS-…
> Your order has expired — VIS-…

● Het welkom bij een abonnement, onderwerp
> Welkom bij VISUAILS: je abonnement loopt — VIS-AB-…
> Welcome to VISUAILS: your plan is running — VIS-AB-…

● De pauzevraag na 3 maanden, onderwerp en voorregel
> Je abonnement staat 3 maanden op pauze: hervatten of opzeggen? — VIS-AB-…
> Your plan has been paused for 3 months: resume or cancel? — VIS-AB-…
>
> Allebei met één klik in VISUAILS Studio. Doe je niets, dan wordt er niets afgeschreven.
> Both take one click in VISUAILS Studio. If you do nothing, nothing is charged.

● Een factuurmail zonder pdf, voorregel
> Je factuur VIS-… staat klaar in VISUAILS Studio.
> Your invoice VIS-… is waiting in VISUAILS Studio.

● De creditnota zonder pdf, eerste zin
> De terugbetaling is bevestigd. Hieronder de creditnota die tegenover je factuur staat, voor je eigen administratie.
> The refund has been confirmed. Below is the credit note that stands against your invoice, for your own records.

● De laatste maand van een vooruitbetaald jaar, onder de knop
> Bekijk de abonnementen →
> See the plans →

● De creditmails (vervallen, spaarplafond): de zin is weg
> ~~Twijfel je, app ons even; dan denken we mee.~~
> ~~In doubt? Send us a message and we will help you choose.~~

● De vragenregel, nu overal gelijk
> Vragen? Antwoord op deze mail of app ons.
> Questions? Reply to this email or WhatsApp us.

(was op twee plekken "Beantwoord deze mail of app ons", en in het Engels één keer "message us on WhatsApp")

● De aanhef, nu ook in de factuur, de creditnota, de abonnementsmails, de vervalmail, de pauzevraag en de creditmails
> Hoi Sanne,
> Hi Sanne,

## Wat níet veranderd is

- Het woordmerk zelf. Het staat alleen op een wit plaatje.
- De factuur-pdf en de creditnota-pdf.
- Wat de mails beloven of doen. Alleen de vorm en de teksten hierboven zijn anders.
- De studiomails blijven Nederlands.

## Bestanden

- Mails: `src/lib/mailTemplate.js`, `account.js`, `admin.js`, `betaallink.js`, `bijkopen.js`, `cancelMail.js`, `feedback.js`, `formaten.js`, `invoiceMail.js`, `notify.js`, `tegoedBetaling.js`, `verder.js`, `waLink.js`
- `functions/api/order.js`, `functions/api/studiobrief.js`, `functions/api/webhook/mollie.js`
- Het nachtwerk: `cron/index.js`
- Het beeld: `public/img/mail/woordmerk-plaat.png` (nieuw), gemaakt door `scripts/make-mail-assets.mjs`
- `scripts/mail-render.mjs`
- Toetsen: `tests/lib/alle-mails.mjs`, `tests/mails-merk.test.mjs` en `tests/mails-merk-browser.test.mjs` (nieuw); `tests/doorloop.test.mjs` en `tests/ronde9.test.mjs` (bijgewerkt)
- `package.json` (de twee toetsen in de testreeks)

## Testreeks

- Nieuw: `test:mailsmerk` (25) en `test:mailsmerk-browser` (26).
- Bijgewerkt: `test:doorloop` (het nieuwe welkomstonderwerp, en de vragenregel in de creditherinnering) en `test:ronde9` (de factuur zonder naam heeft nu "Hi,").
- Stand: 257/257, alles groen (20 min)

## Uitrollen

Draai UITROLLEN.bat. Er is geen migratie. Het nachtwerk gaat mee live (cron/index.js is veranderd), dat doet UITROLLEN zelf.
