# Admin en klantportaal — hoe ze op elkaar in horen te spelen

Opgesteld 7 augustus 2026, na de vraag: *"ik wil dat admin orders kan verwijderen en meer belangrijke functies krijgt. Denk na over hoe het klantenportaal en adminportaal mooi op elkaar in kunnen spelen."*

Afvinken met `- [x]`, doorstrepen met `~~`.

---

## Het idee in één alinea

Er zijn nu drie schermen die met een bestelling te maken hebben, en ze zijn los van elkaar gegroeid. Het **klantdashboard** (`/account`, cookie) toont alle bestellingen van één merk. Het **portaal** (`/o/<token>`, link uit de mail) toont één bestelling aan wie de link heeft. **Admin** toont alles aan jou. Ze delen dezelfde database en vertellen daar drie verschillende verhalen over, en op de plekken waar ze elkaar zouden moeten aanvullen zit stilte.

De ordening die ik zou aanhouden: **admin is de enige plek waar de toestand van een bestelling verandert, het dashboard is waar een merk zijn hele geschiedenis ziet, en het portaal is één bestelling voor wie geen account heeft.** Alles wat een klant doet — goedkeuren, revisie vragen — is een *verzoek* dat in admin binnenkomt, nooit een directe wijziging aan de planning.

---

## Wat er nu al staat

Meer dan je zou denken, en dat is de reden dat de rest zo opvalt.

Admin heeft een dashboard met statusfilters, een revisie-inbox met beeld en tellingen, per bestelling een bestandsscherm met intake en levering, het uploaden van leveringen, statuswijzigingen, merkmodellen aanmaken en goedkeuren, een klantenpagina met omzet en brand kit, en sinds vandaag het intrekken van revisierechten. `order_events` legt elke statuswijziging vast met wie hem deed.

De klant heeft sinds vandaag beide kanten van zijn bestelling als beeld, per foto downloaden, een zip, en per beeld goedkeuren of een revisie vragen.

---

## De zes gaten, op volgorde van wat het eerst pijn doet

### 1 · Een herlevering is stil 🔴

`sendDeliveryMail()` stopt zodra `delivery_mailed_at` gevuld is. Dat is goed bedoeld — het voorkomt dat één bestelling twee keer wordt aangekondigd — maar sinds vanavond bestaan revisies. Jij lost een revisie op, zet een nieuw beeld klaar, en de klant hoort **niets**. Hij zit te wachten op een mail die per ontwerp niet meer komt, en jij denkt dat het afgehandeld is.

Dit is het eerste wat af moet, want het breekt de functie die we vandaag hebben gebouwd.

- [ ] 🔴 Een tweede mailsoort: "je revisie staat klaar", los van de eerste levering
- [ ] `delivery_mailed_at` blijft de eerste aankondiging bewaken; herleveringen krijgen hun eigen teller
- [ ] Niet automatisch bij elke upload versturen maar met een knop, zodat drie beelden achter elkaar één bericht zijn

### 2 · Een geleverd beeld weet niet welk product het is 🔴

Uploads dragen `product_key` en `shot` — "p3 · achterkant". Leveringen dragen niets. Op het dashboard staan de twee kanten dus naast elkaar zonder dat iemand kan zien welk beeld bij welk product hoort. Bij één product valt dat niet op. Bij dertig is het onbruikbaar, en het is precies de bestelling waar het uitmaakt.

- [ ] 🔴 Bij het uploaden van een levering per bestand het product kiezen (of afleiden uit de bestandsnaam met bevestiging)
- [ ] Dashboard groepeert dan per product: upload en resultaat naast elkaar in plaats van twee losse stapels
- [ ] Revisie krijgt daarmee vanzelf context — je ziet waar de klant naar kijkt

### 3 · De tijdlijn ziet alleen het portaal 🟡

`order_events` wordt gevuld bij elke statuswijziging en gelezen door `portal.js` — maar alleen voor `attended` bestellingen, en niet door het dashboard. Een klant met een account ziet dus mínder over zijn eigen bestelling dan iemand met een linkje. Dat is precies verkeerd om.

- [ ] Tijdlijn naar het dashboard, voor elke trede
- [ ] Klantvriendelijke tekst per status, niet de databasewaarde
- [ ] "Wat gebeurt er nu" bovenaan, in plaats van een lijst die je zelf moet interpreteren

### 4 · Elk gesprek gebeurt buiten het systeem 🟡

Een klant vraagt een revisie met een notitie, jij lost hem op, en daarna is er geen kanaal meer. Alles wat volgt gaat via WhatsApp of mail, en staat dus nergens bij de bestelling. Over drie maanden weet niemand meer waarom die extra ronde er was.

- [ ] Eén notitieveld per bestelling in admin dat de klant óók ziet
- [ ] Interne notities apart, die de klant nooit ziet — het verschil moet in de kolom zitten, niet in jouw hoofd
- [ ] Bij een afgehandelde revisie: één regel terug naar de klant over wat er is aangepast

### 5 · Admin kan niets ongedaan maken 🟡

Geen verwijderen, geen annuleren met reden, geen terugbetaling, geen correctie van een verkeerd aantal producten. De enige uitweg is de database in.

Zie de volgende sectie — dit is jouw eigenlijke vraag en hij verdient een eigen antwoord.

### 6 · Admin heeft geen zoekfunctie en geen spoor 🟢

Bij twintig bestellingen scroll je. Bij tweehonderd niet. En er wordt nergens vastgelegd wie in admin wat heeft gedaan — `order_events.actor` bestaat, maar alleen statuswijzigingen schrijven erin. Het intrekken van revisierechten, een verwijdering, een prijscorrectie: allemaal spoorloos.

- [ ] Zoeken op referentie, merk, e-mailadres
- [ ] Elke admin-handeling in `order_events` of een eigen `admin_log`
- [ ] Vaste filters: openstaande revisies, onbetaald, geleverd maar niet aangekondigd

---

## Verwijderen: wat je eigenlijk wilt is drie dingen

"Orders verwijderen" klinkt als één knop, maar er zitten drie verschillende situaties onder en ze verdienen verschillende antwoorden. Ze op één hoop gooien is hoe je per ongeluk een betaalde bestelling weggooit die je zeven jaar moet bewaren.

**Annuleren** — een echte bestelling die niet doorgaat. De status `cancelled` bestaat al maar wordt nergens aangeboden. De rij blijft, de reden staat erbij, de klant ziet "geannuleerd" in zijn dashboard. Dit is verreweg het vaakst wat je bedoelt.

- [ ] Annuleren met verplichte reden, zichtbaar in `order_events`
- [ ] Wat er met een betaling gebeurt: terugbetalen, tegoed, of niets — expliciet kiezen, niet impliciet laten

**Verbergen** — een testbestelling van jezelf, of een dubbele die per ongeluk twee keer verzonden is. Die wil je uit je lijsten en uit je cijfers, maar niet uit de database, want morgen wil je misschien weten wat er gebeurde.

- [ ] `orders.hidden_at` — verdwijnt uit het dashboard, uit de omzettelling en uit de capaciteitsagenda
- [ ] Een filter "inclusief verborgen" zodat het terug te vinden is

**Echt verwijderen** — alleen voor een AVG-verzoek, en dan hoort het bij de klant en niet bij de bestelling: alles van dat merk weg, inclusief de bestanden in R2.

- [ ] 🟡 Eén knop op de klantpagina, met bevestiging waarin je de merknaam moet overtypen
- [ ] Ruimt op: bestellingen, bestanden in R2, modellen, sessies, tokens
- [ ] Bewaart wat de belastingdienst wil zien: een geanonimiseerde factuurregel met bedrag en datum

> **De regel die ik zou aanhouden:** een betaalde bestelling wordt nooit verwijderd, alleen geannuleerd of verborgen. Een onbetaalde testbestelling mag echt weg. Het verschil zit in `payment_status`, dus de knop kan dat zelf bepalen in plaats van erop te vertrouwen dat jij het onthoudt om middernacht.

---

## De workflow, van bestelling tot afgerond

Zo zou het moeten lopen als de zes gaten dicht zijn. Elke stap staat op de plek waar hij hoort, en elke overgang is zichtbaar voor beide kanten.

**1 · Besteld.** De klant plaatst en betaalt. Admin krijgt een melding, de bestelling staat op `received`, de klant ziet in zijn dashboard "ontvangen" plus wat hij heeft aangeleverd. *Nu al zo.*

**2 · Ingepland.** Jij zet hem op `in_production`. De klant ziet de status veranderen en, bij een gereserveerd venster, de datum. *Statuswijziging bestaat; de tijdlijn in het dashboard nog niet.*

**3 · Geleverd.** Jij uploadt de beelden en koppelt ze aan de producten. Eén knop stuurt de aankondiging. De klant ziet upload en resultaat naast elkaar per product. *Uploaden bestaat; de koppeling en de knop niet.*

**4 · Beoordeeld.** De klant keurt goed of vraagt een revisie met notitie. Dat is een verzoek, geen wijziging: de bestelling blijft `delivered`, de revisie komt in jouw inbox. *Bestaat sinds vandaag.*

**5 · Herzien.** Jij lost het op, zet het nieuwe beeld erbij, en stuurt één bericht. De oude versie blijft zichtbaar zodat de klant kan zien wat er veranderd is. *Oplossen bestaat; het bericht en de versiegeschiedenis niet.*

**6 · Afgerond.** Alles goedgekeurd of het venster verlopen. `closed_at` gaat om, revisieknoppen verdwijnen, de download blijft. *`closed_at` bestaat maar wordt nergens gezet.*

- [ ] Stap 6 automatisch: alles goedgekeurd → afgerond, met een mail
- [ ] Of na een termijn, met een aankondiging vooraf in plaats van stilte

---

## Wat ik bewust níét zou bouwen

Een klant die zijn eigen bestelling kan annuleren of van datum kan wisselen. Dat klinkt als service en het is een planning die jij niet meer overziet — de capaciteitsagenda is precies het ding waar één merk niet in hoort te kunnen graaien.

Een chatvenster. Het notitieveld uit gat 4 doet negentig procent van het werk, en een chat die je niet binnen een uur beantwoordt is erger dan geen chat.

Statussen erbij. Vijf is genoeg. Elke extra status is een vraag die jij per bestelling moet beantwoorden en die een klant anders interpreteert dan jij bedoelt.

---

## Volgorde

**Deze week** — gaten 1 en 2. Zonder die twee is de functie van vandaag half af: revisies worden niet aangekondigd en beelden hangen aan geen enkel product.

**Daarna** — annuleren en verbergen, plus de tijdlijn in het dashboard. Dat is jouw oorspronkelijke vraag plus het scherm waar de klant hem terugziet.

**Als het rustig is** — zoeken, admin-logboek, het notitieveld, automatisch afronden.

**Pas als een klant erom vraagt** — echt verwijderen. Het is de meeste zorg voor het minste gebruik, en het moet in één keer goed omdat het onomkeerbaar is.

---

## Meer gereedschap dat de moeite waard is

Losse ideeën, geordend naar wat ze jou per week schelen. Niets hiervan is nodig om te draaien; alles hiervan is iets wat je nu met de hand doet of helemaal niet doet.

### Voor jou, dagelijks

- [ ] **Eén werkscherm per bestelling.** Nu spring je tussen het bestandsscherm, de klantpagina en het dashboard. Eén pagina met alles van die order — uploads, leveringen, revisies, tijdlijn, notities, status — is de plek waar je een bestelling van begin tot eind afhandelt zonder terug te navigeren.
- [ ] **Bulk-status.** Vijf bestellingen tegelijk op `in_production` zetten aan het begin van een dag, in plaats van vijf keer hetzelfde formulier.
- [ ] **Slepen om te leveren.** Bestanden in het venster laten vallen in plaats van een bestandskiezer, met de productkoppeling geraden uit de bestandsnaam en door jou bevestigd.
- [ ] **Vandaag-lijst.** Wat moet er vandaag klaar: gereserveerde vensters die aflopen, revisies ouder dan een dag, betaalde bestellingen die nog op `received` staan. Eén lijst in plaats van drie filters.
- [ ] 🟡 **Een sjabloon per stijl.** Welke prompt en instellingen leverden dit resultaat — gekoppeld aan de bestelling, herbruikbaar op de volgende. Dit is de promptbibliotheek uit `WERKLIJST.md`, maar dan op de plek waar je hem nodig hebt.

### Voor de klant

- [ ] **Alles goedkeuren in één keer.** Wie tevreden is, is dat meestal over de hele set. Nu zijn dat twintig klikken.
- [ ] **Vergelijken met de upload.** Zijn foto en jouw resultaat over elkaar heen, met een schuif — je hebt de component al (`Compare.astro`).
- [ ] **Opnieuw bestellen.** Zelfde merk, zelfde stijl, nieuwe producten. Eén knop die het bestelformulier voorinvult vanuit een eerdere bestelling.
- [ ] **Een deelbare kijklink.** Read-only, zonder goedkeuren, voor de inkoper of de fotograaf die even mee moet kijken. Voorkomt dat iemand zijn portaallink doorstuurt en daarmee ook zijn goedkeurrechten weggeeft.
- [ ] **Factuur als PDF** in het dashboard, in plaats van op verzoek.

### Waar geld doorheen loopt

- [ ] 🔴 **Betaald maar niet geleverd, en geleverd maar niet betaald.** Twee lijsten die je nu nergens ziet. De tweede is de enige die je echt geld kost.
- [ ] **Omzet per maand** naast de bestaande totalen per klant, zodat je een trend ziet in plaats van een som.
- [ ] **Herinnering bij een openstaande betaling**, automatisch na een paar dagen.

### Wat je beschermt

- [ ] 🔴 **Back-up van D1 en R2.** Staat al in `WERKLIJST.md` en verdient hier herhaling: er is er nu geen. Alles hierboven is bouwwerk op iets wat je in één ongeluk kwijt bent.
- [ ] **Waarschuwing als een levering mislukt.** Nu faalt een upload naar R2 stil en merk je het als de klant belt.
- [ ] **Wekelijkse samenvatting** naar jezelf: nieuwe bestellingen, omzet, openstaande revisies, wat er blijft hangen.
