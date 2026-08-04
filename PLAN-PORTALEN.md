# VISUAILS — plan voor het klantenportaal en het adminportaal

Voorstel, augustus 2026. Nog niets gebouwd. Alles hieronder is gecontroleerd tegen de code
zoals die nu in de repo staat, niet tegen wat de site erover belooft — dat verschil is
groter dan je zou hopen en het is het eerste onderwerp van dit document.

---

## Deel 0 — Wat er nu echt staat, en de ene bug die alles blokkeert

Voordat er één nieuwe functie bij komt: dit is de eerlijke stand van zaken.

**Wat werkt en goed werkt.** Het tokenportaal `/o/<token>` is af en degelijk. 256-bits token,
alleen de hash in de database, ratelimiting per IP, geen cookie, geen JavaScript, alles doet
het met JS uit. De klantomgeving `/account` heeft vier secties (overzicht, bestellingen,
merkkit, plan) met magic-link login en een sessie van dertig dagen die bij elk bezoek
opschuift. De capaciteitspoort is het best doordachte stuk van de hele site: hij rekent
vensters uit tegen de echte agenda, herberekent bij het plaatsen van de bestelling, en lost
een gelijktijdige boeking deterministisch op — de laagste order-id wint. De Mollie-webhook
werkt en is idempotent.

**En dan de blokkade.** De galerij waarin een klant beeld voor beeld goedkeurt — het scherm
waar `/portal` de hele verkoop op bouwt — is onbereikbaar. Niet stuk: onbereikbaar. De
volledige code staat er, in twee varianten zelfs (token- en cookie-geauthenticeerd), en leest
`files` met `kind='delivery'`. Er is precies één `INSERT INTO files` in de hele codebase, in
`functions/api/order.js`, en die staat hard op `kind='upload'`. Er bestaat geen enkele route,
knop of endpoint waarmee jij een afgerond beeld naar een klant stuurt. Wat er nu gebeurt is
dat je levert via WhatsApp of e-mail, en dat het portaal daar niets van weet.

Daar hangt een tweede aan vast: **niets schrijft ooit `orders.closed_at`**. Vier plekken lezen
die kolom — de tokenvervaldatum van 90 dagen, het slot op de reviewknoppen, de belofte in de
voorwaarden dat bronbestanden na 90 dagen weg zijn — en geen enkele plek zet hem. In de
praktijk verlopen portaallinks dus nooit en gaat een bestelling nooit dicht.

En een derde: **een statuswijziging stuurt geen enkel bericht.** `handleStatusUpdate` schrijft
twee databaserijen en is klaar. Geen mail, geen WhatsApp. Een klant komt erachter door zelf
terug te gaan naar zijn link. Er zit ook nergens een WhatsApp Business API in de code — elke
`wa.me`-link op de site is een knop waarmee de bezoeker zelf een gesprek begint.

**Drie beloftes op `/portal` hebben geen code achter zich.** De pagina zegt in beide talen dat
downloads per kanaal komen (Shop vierkant + 4:5, Social 4:5 + 9:16, Ads 16:9 + 1:1), dat bij
elke download een herkomstmanifest zit, en dat het goedkeuringslogboek "als pdf exporteert" —
dat laatste gepresenteerd als de documentatie die de AI Act vraagt. In `portal.js` zit geen
van drieën. De pdf-claim is de gevoeligste, omdat hij naleving belooft. Zolang die functie er
niet is, hoort de zin te worden aangepast of de functie gebouwd; niets ertussenin.

Verder, kleiner maar het noemen waard: `subscribers` en `messages` worden geschreven en door
niets gelezen (je contactformulier heeft geen inbox), `payments` idem, `blackout_days` heeft
geen schrijver dus vrije dagen zet je met de hand via `wrangler d1 execute`, `makeRef()` kan
botsen en die botsing wordt stil ingeslikt, uploads lopen door de Worker in plaats van
gepresigned naar R2, en de Stripe-integratie is compleet en dood.

**Waarom dit vooraan staat.** Een all-in-one scherm bouwen bovenop een portaal dat het
belangrijkste niet kan tonen, is een gevel voor een leeg gebouw. Module 1 hieronder is
daarom niet de leukste maar wel de enige die echt moet.

---

# Deel 1 — Het klantenportaal

## Het idee in één zin

Eén scherm per bestelling waarop de klant altijd drie dingen ziet zonder te zoeken: **waar
staat het**, **wat moet ik nu doen**, en **waar zijn mijn bestanden** — en waarop alles wat hij
daarna wil (goedkeuren, foto's nasturen, herbestellen, factuur, vragen) binnen bereik ligt in
plaats van in een mailwisseling.

Waarom die drie en niet meer: Gartner ondervroeg 5.728 klanten en vond dat 73% zelfservice
probeert maar dat slechts 14% van de problemen er volledig wordt opgelost — de grootste
oorzaak is dat mensen in 43% van de gevallen niet konden vinden wat op hún vraag sloeg. Een
statusscherm dat "In productie" zegt en verder niets, vangt geen enkel telefoontje op. Een
scherm dat zegt "In productie, klaar rond dinsdag 11 augustus, jij hoeft nu niets" wel.

---

## 1. De actiebalk bovenaan — "wat moet ik nu doen"

Bovenaan het scherm, boven alles, één regel die zegt wat er van de klant wordt verwacht.
Vier mogelijke toestanden: *je hoeft niets, wij zijn bezig*; *we wachten op jou* (met wat er
mist en een knop ernaartoe); *er ligt werk klaar om te beoordelen* (met het aantal); *klaar,
hier zijn je bestanden*.

**Waarvoor dit handig is.** Dit is het enige onderdeel dat structureel telefoontjes en
appjes scheelt. WISMO — "where is my order" — is bij kledingbedrijven gemeten op 21,8% van
alle klantcontacten buiten piek en 36% in piek (platformdata van DigitalGenius). Jij bent in
je eentje; elk appje dat je niet hoeft te beantwoorden is werktijd. Maar het werkt alleen als
de balk de specifieke vraag beantwoordt in plaats van een algemene status te herhalen — zie
het Gartner-cijfer hierboven.

**Bouwlast:** klein, zodra module 2 en 3 er zijn. Het is afgeleide logica, geen nieuwe data.

---

## 2. De tijdlijn met echte datums, en het principe eronder

De tijdlijn bestaat al (`order_events`, gelezen door `portal.js`). Wat ontbreekt is een
verwachte datum per volgende stap, en die moet conservatief zijn.

**Waarom conservatief.** Het beste bewijs in dit hele plan komt uit een veldstudie in *Journal
of Service Research* (Harter, Stich & Spann, 2025) over 2.096.539 bestellingen van 304.407
terugkerende klanten. Te laat leveren verlengt de tijd tot de volgende bestelling significant;
te vroeg leveren verkort hem; en het effect is **asymmetrisch** — te laat doet meer kwaad dan
even veel te vroeg goed doet (Wald z=−2,08, p<0,04). Bovendien is de gevoeligheid afnemend:
de eerste minuten te laat richten de meeste schade aan. Narvar's consumentenonderzoek (n=3.461,
2025) vult aan: 50% zegt minder snel terug te komen na één te late levering, en 57% kiest
inmiddels op nauwkeurigheid van de datum boven prijs.

Praktisch: beloof een dag later dan je denkt, want vroeg zijn kost je bijna niets en te laat
zijn kost je de herhaalaankoop. En zet er een **wijzigingsgeschiedenis** onder — als een datum
opschuift, staat er waarom en wanneer dat besloten is. Een verschoven datum met uitleg is
iets anders dan een datum die stilletjes verandert.

**Bouwlast:** klein voor de weergave, middel als je de datum wilt afleiden uit de
capaciteitsmodule in plaats van hem met de hand te zetten.

---

## 3. De leveringsgalerij — het scherm dat er nog niet kan zijn

Dit is module 1 in de bouwvolgorde, ook al staat het hier als derde. Er moet een pad komen
waarlangs een afgerond beeld een `files`-rij met `kind='delivery'` wordt. Zonder dat is de
rest van dit document decoratie. Het bouwwerk aan de klantkant is er al: `loadFiles`,
`serveFile`, `review_state`, `review_note`, `reviewed_at`, per-beeld goedkeuren, terugdraaien,
en een aparte weergave voor Tier 0 zonder knoppen.

Wat ik daarbovenop zou toevoegen:

**Een derde beslissing: "akkoord, met opmerking".** Nu zijn er twee knoppen — goedkeuren of
revisie vragen. Ziflow, het serieuste proofing-platform in deze markt, werkt met vier
beslissingen en de derde is precies deze: *approved with changes*. Het is de knop die een
volledige revisieronde omzet in een goedgekeurd beeld met een aantekening. Voor een klant die
denkt "prima, maar volgende keer de mouw iets losser" is dat het eerlijke antwoord, en het
scheelt jou een ronde. Eerlijk erbij: niemand heeft dit gemeten, de logica is wel
gepubliceerd en overneembaar.

**Batch-goedkeuren, met een uitzondering.** Bij 25 producten × 4 beelden is 100 keer klikken
geen zorgvuldigheid maar een obstakel. Voorstel: "keur alle beelden van dit product goed" en
"keur alles goed waar ik niets van gezegd heb", maar nooit een knop die ook beelden goedkeurt
die de klant nog niet heeft opengeklikt. `/portal` belooft nu letterlijk "er is geen bulk
accept" — die belofte moet je dan wel bijstellen, of de knop moet aantoonbaar per beeld gaan.

**Versies naast elkaar.** Als beeld 3 een revisie krijgt, wordt v2 een nieuwe rij die aan de
oude hangt. De klant ziet v1 en v2 naast elkaar en kan zien of zijn opmerking is verwerkt.
Zonder dat blijft het "volgens mij is het veranderd". Vergt een `parent_file_id` en een
`version`-kolom.

**Aantekenen op het beeld zelf.** Een punt aanklikken en daar een opmerking bij zetten, in
plaats van "de zoom links onder klopt niet". Elke serieuze tool doet dit; niemand heeft het
gemeten. Ik zou het pas in fase 3 doen, omdat het als enige onderdeel JavaScript in het
portaal introduceert — en het portaal is nu bewust volledig JS-vrij met `default-src 'none'`.
Dat is een echte architectuurkeuze om op te geven, geen detail.

**Bouwlast:** de leverkant (admin) is middel-groot, de klantkant is klein want die staat er.
Versies en annotatie zijn elk apart middel.

---

## 4. Downloads per kanaal

`/portal` belooft dit al met zoveel woorden: Shop (vierkant + 4:5), Social (4:5 + 9:16), Ads
(16:9 + 1:1), "zodat er niets meer bijgesneden hoeft te worden". In de code bestaat het niet
— er is één bestand per rij en één downloadknop.

**Waarvoor het handig is.** Dit is het verschil tussen "ik heb mooie beelden gekregen" en "ik
kan vanmiddag posten". Voor een merk zonder designer is bijsnijden de stap waar het blijft
liggen. Het is ook het makkelijkste echte verkoopargument tegenover een goedkopere
AI-tool: die levert je één bestand.

**Hoe.** Bij levering genereert de studio-kant per beeld de uitsnedes, of ze worden op
aanvraag in de Worker gemaakt. Ik zou beginnen met vooraf genereren — voorspelbaar, geen
rekentijd bij de klant, en R2 is goedkoop. Een "download alles als zip per kanaal" hoort
erbij, anders klikt iemand met 25 producten honderd keer.

**Bouwlast:** middel. Vergt beeldbewerking in de pipeline, wat er nu nergens zit.

---

## 5. Foto's nasturen vanuit het portaal

Nu kan een klant alleen foto's meesturen op het moment van bestellen. Het bestelformulier
zegt zelf "liever later opsturen? bestel nu en stuur de foto's daarna — je krijgt een link
zodra de bestelling binnen is". Die link bestaat, maar er is niets achter: het portaal heeft
geen uploadmogelijkheid.

Voorstel: dezelfde per-product-per-shot-structuur als op `/start` (voorkant verplicht,
achterkant/detail/gedragen optioneel), maar dan in het portaal, met een voortgangsteller
"3 van de 12 producten compleet". Plus een lijst van wat er per product nog mist, want dat is
precies de informatie die jij nu met de hand achterna zit.

**Waarvoor het handig is.** Dit is waarschijnlijk de grootste tijdwinst voor jou van alle
modules. Elke keer dat je een klant moet herinneren aan de foto's van product 7, is een
gesprek dat het portaal had kunnen voeren. En het maakt de belofte waar die het
bestelformulier al doet.

**Bouwlast:** middel. De uploadcode bestaat (`/api/upload`, R2 `intake/<batch>/`), maar hij
hangt nu aan een bestelling-in-wording; hij moet aan een bestaande order kunnen hangen. Let
op: het portaal is JS-vrij, dus dit wordt een gewoon `<form enctype="multipart/form-data">`
met een pagina-refresh, of het portaal krijgt hier zijn eerste JavaScript.

---

## 6. Het blokkadepaneel — "waar wij op wachten"

Eén lijstje, klantzichtbaar, met alles wat jouw werk tegenhoudt: ontbrekende foto's, een
onbeantwoorde vraag, een openstaande goedkeuring, een niet-betaalde factuur. Elk item met een
knop erheen.

**Waarvoor het handig is.** Het verschuift de verantwoordelijkheid zichtbaar. Zonder dit
lijstje voelt elke vertraging als jouw vertraging, ook als jij al een week op foto's wacht.
Met het lijstje ziet de klant dat de klok bij hem stilstaat. Zendesk doet dit intern met een
pauze-icoon op de SLA-teller; hier zou het gewoon zichtbaar moeten zijn voor beiden.

**Bouwlast:** klein, mits de onderliggende zaken bestaan. Het is een afgeleide weergave.

---

## 7. Opnieuw bestellen

Een knop "nog een keer, zelfde instellingen" op het startscherm van het portaal én in
`/account`: zelfde achtergrondkleur, zelfde stijl, zelfde model, alleen nieuwe producten.

**Waarvoor het handig is.** Voor een merk dat elke maand nieuwe artikelen heeft is de tweede
bestelling nu net zoveel werk als de eerste. Baymard's gebruikersonderzoek vond dat mensen
net zo vaak op het *beginscherm* naar hun eerdere bestellingen zoeken als in een
accountgeschiedenis, en dat "past purchases" op de landingspagina een webconventie aan het
worden is. Zet het dus vooraan, niet weggestopt onder "bestellingen".

**Eerlijk over het bewijs:** ik heb geen enkele geloofwaardige meting kunnen vinden van wat
een herbestelknop doet met herhaalaankopen in B2B-diensten. Het is een goedkope, conventionele
functie — bouw hem daarom, niet omdat er een percentage aan hangt.

**Bouwlast:** klein tot middel. De gegevens staan in `details_json` van de vorige order.

---

## 8. Merkprofiel in het portaal

`/account/brand-kit` bestaat al en doet twee dingen: opgeslagen bedrijfsgegevens en een
stijlslot per soort werk (welk custom model bij catalog, lifestyle, video hoort). Ik zou dat
uitbreiden tot het geheugen van het merk: standaard achtergrondkleur, standaardmateriaal,
wat er nooit mag verschuiven, welke modellen wel en niet, en de bestanden van het logo.

**Waarvoor het handig is.** Dit is wat een "done-for-you"-dienst onderscheidt van een tool.
Bij de vijfde bestelling hoort de klant niets meer te hoeven uitleggen. Het is ook het enige
onderdeel dat met elke bestelling waardevoller wordt, wat het overstappen naar een
concurrent duurder maakt.

**Bouwlast:** klein per veld; de sectie en het opslagmechanisme staan er al
(`customers.details_saved_at`, `customer_style_locks`).

---

## 9. Eén berichtendraad per bestelling

Nu loopt alles via WhatsApp en e-mail, en staat er in de database wel een `messages`-tabel die
door niets wordt gelezen. Voorstel: per bestelling één draad, klant en studio, met de
bestanden en beelden waar het over gaat erbij.

**Waarvoor het handig is.** Voor jou: alles over één order op één plek terug te vinden in
plaats van in een appgesprek van drie maanden. Voor de klant: het antwoord staat bij het beeld
waar het over ging.

**Belangrijk ontwerpdetail:** interne notities en klantzichtbare notities zijn verschillende
dingen en moeten er verschillend uitzien. Zendesk zet interne notities op een gele achtergrond
en maakt ze *onomkeerbaar* — een interne notitie kan nooit publiek worden, en niets kan worden
verwijderd, alleen geredigeerd door een beheerder. Dubsado's portaal synchroniseert
uitdrukkelijk géén taken, notities, gesprekslogs of tags naar de klant. Die scheiding is de
enige manier waarop je er ooit op durft te vertrouwen.

Ik zou WhatsApp niet vervangen maar ernaast zetten: het portaal wordt het archief, WhatsApp
blijft het snelle kanaal, en de belangrijke dingen worden naar de draad gekopieerd.

**Bouwlast:** middel.

---

## 10. Facturen en betalen

Nu wordt er alleen voor het testmonster van €0,99 afgerekend; elke echte bestelling gaat
zonder betaalstap naar de bedankpagina, en de klant ziet nergens zijn betaalstatus. De
kolommen bestaan wel (`payment_status`, `paid_at`, `payments`-tabel) maar zijn voor de klant
onzichtbaar.

Voorstel: per bestelling de bedragen (netto, altijd exclusief btw, conform je regel dat er
nooit een inclusief-bedrag mag staan omdat elk land een ander tarief heeft), de betaalstatus,
een betaallink via Mollie, en de factuur als PDF met de btw-behandeling erop — 21% of verlegd
bij een geldig EU-btw-nummer.

**Waarvoor het handig is.** Het is de op één na meest gestelde vraag na "waar blijft het".
En het is de enige module die direct geld binnenhaalt in plaats van tijd te besparen.

**Let op:** de prijs mag nooit uit de browser komen. Nu bestaat er server-side helemaal geen
prijsberekening voor een echte order — `quote()` in `pricing.js` draait bij het bouwen en in
de browser. Die berekening moet naar de server verhuizen voordat er ook maar één euro over
Mollie gaat.

**Bouwlast:** groot. Dit is de zwaarste module in het plan.

---

## 11. Herkomst en de AI Act — sinds gisteren geen theorie meer

Artikel 50 van de AI-verordening geldt sinds **2 augustus 2026**, dus vanaf gisteren. Het is
niet uitgesteld: de Digital Omnibus van mei 2026 heeft alleen de hoog-risico-verplichtingen
verschoven (naar december 2027 en augustus 2028), transparantie is gewoon doorgegaan.

Wat dat concreet voor jou betekent, want de rolverdeling is belangrijk en wordt vaak
verkeerd samengevat:

- **Artikel 50 lid 2** — machine-leesbare markering van synthetische output — is een
  verplichting van de **aanbieder** van het model, niet van jou. Dat zijn OpenAI, Adobe,
  Google, Black Forest Labs. Je wordt geen aanbieder door hun model te gebruiken; de regel
  die zegt "je wordt aanbieder als je je naam erop zet" (artikel 25) geldt alleen voor
  hoog-risicosystemen.
- **Artikel 50 lid 4** — de openbaarmaking bij deepfakes — is een verplichting van de
  **gebruiksverantwoordelijke**, en dat ben jij mogelijk wel. Of AI-gegenereerde
  productfotografie onder "deepfake" valt is tussen advocatenkantoren omstreden: Lewis Silkin
  leest de praktijkcode zo dat productfotografie er niet automatisch onder valt, Heuking legt
  het breder uit. De wettelijke definitie ("beeld dat lijkt op bestaande personen, objecten,
  plaatsen... en ten onrechte authentiek zou lijken") past er bij letterlijke lezing wél op.
- De **praktijkcode voor transparantie** is op 10 juni 2026 vastgesteld; eind juli hadden
  circa 190 organisaties getekend. De Autoriteit Persoonsgegevens adviseert ondertekening
  uitdrukkelijk. Boetes lopen tot €15 miljoen of 3% van de wereldwijde omzet, met expliciete
  verzachting voor mkb.
- De EU heeft **officiële iconen** gepubliceerd voor AI-content, in drie varianten. Voor
  jouw werk — gegenereerd uit de echte productfoto's van de klant — is "gedeeltelijk door AI
  aangepast" waarschijnlijk de juiste.

**Wat ik zou bouwen, en wat niet.** Zelf C2PA-manifesten ondertekenen vereist een certificaat
van een CA op de C2PA-trustlijst en in productie een HSM voor de sleutel — dat is voor een
eenmanszaak onevenredig. Wat wel kan en veel oplevert: **bewaar de manifesten die er al op
zitten** (Firefly, DALL·E en Imagen zetten ze er standaard op; Midjourney niet), lever bij
elke bestelling een leesbaar herkomstoverzicht mee — wat is gemaakt, waaruit, wanneer, door
wie beoordeeld — en geef de klant het juiste EU-icoon met een suggestie voor het bijschrift.

**Waarom dit een verkoopargument is en niet alleen een plicht.** Je klant is degene die de
beelden publiceert; het risico ligt bij hem. Een leverancier die de naleving kant-en-klaar
meelevert, is precies het verschil tussen jou en een goedkope generator. En het gebeurt
toevallig samen te vallen met wat `/portal` nu al belooft ("een herkomstmanifest bij elke
download") en wat de code niet doet.

**Bouwlast:** klein voor het overzicht en het icoon, middel als je manifesten door de
pipeline heen wilt bewaren.

---

## 12. Notificaties — de belofte die nu niet wordt waargemaakt

Er gaat vandaag geen enkel bericht uit bij een statuswijziging. Voorstel: e-mail bij vier
momenten (in productie, klaar om te beoordelen, geleverd, en "we wachten op jou"), met een
directe link naar het portaal, en per klant instelbaar. Later eventueel WhatsApp erbij, maar
dat vergt de Business API en die zit nergens in de code — elke `wa.me`-link op de site is
een knop die de bezoeker zelf indrukt.

Voor de "we wachten op jou"-herinnering is er echt bewijs over de vorm: Ariely en
Wertenbroch (*Psychological Science*, 2002) lieten in twee experimenten zien dat **gelijkmatig
verspreide tussentijdse deadlines beter werken dan één einddeadline** — één deadline aan het
eind was in hun proefopzet de slechtst presterende variant. Dus: bij een grote bestelling
liever "product 1 t/m 8 graag deze week" dan "alles voor de 20e".

**Waarvoor het handig is.** Dit is de tegenhanger van module 1: samen bepalen ze hoeveel
appjes je krijgt. parcelLab meldt bij klanten 15–20% minder klantenservicecontacten door
proactieve communicatie — leverancierscijfers, geen onafhankelijk onderzoek, maar de richting
is onomstreden.

**Bouwlast:** klein. `sendMail()` bestaat, Resend is aangesloten, de sjablonen zijn er.

---

## 13. Een meekijklink voor het team van de klant

Bij een merk zit er meestal iemand anders op marketing dan degene die bestelt. Nu betekent
dat: de portaallink doorsturen, wat neerkomt op volledige rechten weggeven inclusief
goedkeuren.

Voorstel: een tweede, alleen-lezen link per bestelling, apart intrekbaar. De tabel
`order_tokens` heeft daar al ruimte voor (`revoked_at`, en een unieke index op "één levend
token"), maar er is geen code die ooit een tweede token uitgeeft of een token intrekt.

**Bouwlast:** klein. Dit is bijna gratis gegeven wat er al staat.

---

## 14. Kleine dingen die het scherm af maken

Een **compacte samenvatting** bovenaan die het merk, het aantal producten, de soort en het
venster in één regel toont. Een **"wat gebeurt er nu"-uitleg** per status in gewone taal, want
"human_check" zegt een klant niets. Een **contactknop** die meegeeft over welke bestelling het
gaat, zodat jij niet hoeft te vragen. Een **printbare orderbevestiging**, want inkoopafdelingen
vragen daarom. En **de vervaldatum van de link** zichtbaar, zodra `closed_at` eindelijk wordt
geschreven — nu belooft de site 90 dagen en klopt dat niet.

---

# Deel 2 — Het adminportaal

Het uitgangspunt dat je noemde is de goede: het adminportaal moet **klanten kunnen bedienen**,
niet alleen statussen bijwerken. Vandaag is het één pagina met een revisie-inbox en een lijst
orderkaarten, elk met een statusdropdown en een knop om een custom model toe te voegen. Dat is
alles.

---

## 1. De werkbank per bestelling

Nu is een bestelling een kaart in een lijst van tweehonderd. Voorstel: een eigen pagina per
bestelling waar alles bij elkaar staat — de klantgegevens, het merkprofiel, alle geüploade
referentiefoto's per product en per hoek, de antwoorden op de vragen, het venster, de
betaalstatus, de tijdlijn, de berichtendraad, de interne notities, en het leverpaneel.

**Waarvoor het handig is.** Dit is het scherm waarop je een halve dag werkt. Alles wat je nu
uit vier plekken bij elkaar zoekt — de mail met de bijlagen, het appgesprek, R2, de
adminlijst — staat op één pagina. Het is ook de voorwaarde voor bijna alle andere
adminmodules.

**Bouwlast:** middel. Het is vooral samenvoegen van bestaande query's, in het stringpatroon
dat `admin.js` al gebruikt.

---

## 2. Leveren — het endpoint dat er niet is

Een uploadveld waarmee jij afgeronde beelden aan een bestelling hangt, per product, met de
juiste `product_key`, dat een `files`-rij met `kind='delivery'` schrijft, een kleinere
`preview_key` genereert voor de galerij, en de klant een bericht stuurt.

**Waarvoor het handig is.** Dit is de module waar alles aan hangt. Zonder deze is het
klantenportaal een statuspagina en zijn de galerij, de goedkeuringen, de revisies, het
AI-Act-logboek en de downloads per kanaal allemaal onbereikbaar. Als je uit dit hele document
één ding bouwt, is het deze.

**Bouwlast:** middel-groot, en het is de kritieke schakel. Reken op meer werk aan de
previews en de uitsnedes dan aan het uploaden zelf.

---

## 3. Het dagbord — capaciteit zien in plaats van uitrekenen

De capaciteitspoort rekent al alles uit: 18 producten per dag, 3 daarvan gereserveerd voor de
losse wachtrij, dus 15 per dag voor gereserveerde vensters, een venster is 2 werkdagen, dus
maximaal 30 producten per venster, minimaal 2 werkdagen vooruit, tot 60 dagen vooruit. Alleen
kun jij die belasting nergens *zien*.

Voorstel: een kalender met per dag de geboekte belasting, welke bestellingen dat zijn, hoeveel
ruimte er over is, en de vrije dagen. Plus een scherm om `blackout_days` te beheren, want dat
doe je nu met de hand via de commandoregel.

**Waarvoor het handig is.** Je kunt zien of je die vakantieweek kunt nemen zonder een
belofte te breken. En je ziet aankomen dat een week volloopt, in plaats van het te merken als
de poort een klant "geen vensters beschikbaar" laat zien — een verkoop die je nooit ziet
gebeuren.

Eén ding dat opvalt en dat je zelf moet bevestigen: `PRODUCTS_PER_DAY = 18` staat in de code
met een comment erbij dat het "een operationele aanname is, geen ontwerpkeuze". De hele
planning van de site hangt aan dat getal.

**Bouwlast:** middel. De rekenkern bestaat, dit is weergave plus een beheerscherm.

---

## 4. De revisie-inbox met echte acties

Nu toont het dashboard revisieverzoeken alleen: bestandsnaam, ref, notitie, tijd. Je kunt er
niets mee doen. Voorstel: per verzoek antwoorden, een nieuwe versie uploaden die als v2 aan
het oorspronkelijke beeld hangt, of afwijzen met uitleg — en de klant krijgt bericht.

**Waarvoor het handig is.** Een revisie is nu een aanleiding om buiten het systeem te gaan
werken. Zo blijft het binnen, en zo blijft het logboek kloppen — wat er voor de AI Act toe
doet.

**Bouwlast:** middel, hangt aan module 2.

---

## 5. Handelen namens een klant

Voor jou de belangrijkste servicefunctie: de bestelling van een klant kunnen aanpassen,
foto's namens hem uploaden, of iets voor hem goedkeuren nadat hij het per WhatsApp heeft
gezegd.

**Hoe je dat veilig doet.** GitHub Enterprise heeft hier de best gedocumenteerde regels voor,
en het zijn er vier: een **reden is verplicht** (dropdown, met vrije tekst bij "anders"); elke
handeling wordt **tweemaal gelogd**, in het beheerderslog én in het log van de klant zelf; de
klant krijgt **automatisch bericht** dat de sessie is gestart en dat kan niet worden
uitgezet; en de sessie is **beperkt in tijd** (bij hen één uur).

De onderliggende regel uit de identiteitswereld: geen sessie aanmaken die niet van een echte
klantsessie te onderscheiden is. RFC 8693 doet dit met een `act`-claim — de sessie blijft
*jouw* sessie, met de klant erbij genoemd. Elke schrijfactie krijgt dus twee namen: wie het
deed en namens wie.

**Waarvoor het handig is.** Zonder dit ga je uiteindelijk met de hand in de database
rommelen, en dan is er geen spoor van wie wat wanneer heeft veranderd. Mét dit kun je een
klant aan de telefoon helpen zonder dat je jezelf onbetrouwbaar maakt in je eigen logboek.

**Bouwlast:** middel. Vooral zorgvuldigheid, weinig code.

---

## 6. Interne notities naast klantzichtbare notities

Per bestelling en per klant een notitieveld dat de klant nooit ziet — wat er de vorige keer
misging, dat ze altijd te laat leveren, dat de eigenaar in augustus weg is.

Overneembaar van Zendesk: interne notities krijgen een duidelijk andere achtergrondkleur, ze
kunnen **niet** achteraf publiek worden gemaakt, en niets kan worden verwijderd — alleen
geredigeerd. Dubsado's lijst van wat nooit naar het klantportaal gaat (taken, notities,
gesprekslogs, eigen velden, tags) is een bruikbaar uitgangspunt voor de scheidslijn.

**Bouwlast:** klein.

---

## 7. Het klantdossier

Alles van één merk op één plek: alle bestellingen, totale omzet, gemiddeld aantal producten,
hoeveel revisies ze gemiddeld vragen, wanneer ze voor het laatst bestelden, hun merkprofiel,
hun modellen, hun notities.

**Waarvoor het handig is.** Dit is waarmee je ziet wie je goede klanten zijn en wie er stil
is geworden. Het is ook de plek waar de upgrade-nudge thuishoort die nu automatisch afgaat op
12 producten per kwartaal — nu gebeurt dat zonder dat jij het ziet aankomen.

**Bouwlast:** klein-middel; de gegevens staan er, dit is een query en een pagina.

---

## 8. Facturatie en btw

Facturen genereren met het juiste btw-regime: 21% standaard, verlegd bij een geldig
EU-btw-nummer buiten Nederland. Jouw tussenoplossing was: iedereen 21% rekenen en achteraf op
de factuur corrigeren. Dat kan, maar dan moet het adminportaal wel bijhouden **welke facturen
nog gecorrigeerd moeten worden**, anders is die tussenoplossing een lijstje in je hoofd.

Er is nu geen enkele btw-logica in het betaalpad, en `orders.total_cents` wordt door niets
geschreven — er staat dus nergens wat een bestelling heeft gekost.

**Bouwlast:** groot, samen met module 10 van het klantenportaal.

---

## 9. De inbox die er nog niet is

`messages` (contactformulier) en `subscribers` (weggever) worden geschreven en door niets
gelezen. Er komt alleen een mail binnen op het moment zelf; raakt die kwijt, dan is het weg.
Een simpel scherm dat beide tabellen toont, met status "beantwoord/niet beantwoord", is
weinig werk en sluit een gat.

**Bouwlast:** klein.

---

## 10. Cijfers die ergens over gaan

Vier getallen die je wekelijks wilt zien: doorlooptijd van bestelling tot levering, aantal
revisierondes per bestelling, hoeveel procent van de vensters gehaald is, en hoeveel producten
er per klant per kwartaal doorheen gaan.

**Waarvoor het handig is.** Het aantal revisierondes is je belangrijkste kostenpost per
bestelling en tegelijk je beste kwaliteitsmaatstaf. Als referentie: een creatief-operationeel
onderzoek vond dat 60% van de creatieve leidinggevenden 2–3 revisierondes noemt als normaal —
methodologie niet gepubliceerd, en het is uit 2018, dus gebruik het als ruwe ijking en niet
meer dan dat. Wat je wél zuiver kunt meten is je eigen trend.

Het percentage gehaalde vensters is de andere: gezien de asymmetrie uit het onderzoek in
module 2 is een gemiste datum duurder dan hij voelt.

**Bouwlast:** klein-middel.

---

## 11. Beveiliging en beheer

Er is geen enkele manier om een adminaccount aan te maken — `admin_users` heeft geen
registratieroute, geen seed, niets in de migraties. De eerste rij moet met de hand via
`wrangler d1 execute`. Dat is voor één eigenaar verdedigbaar, maar het hoort opgeschreven te
staan, en er hoort een tweede factor op zodra er ooit iemand meekijkt.

Verder: `functions/admin/debug-mollie.js` staat er nog en is in zijn eigen bestand aangemerkt
als "verwijderen zodra de 400 begrepen is" — dat is hij, op 2 augustus. En de Stripe-code is
compleet en dood.

**Bouwlast:** klein, maar het is opruimwerk dat blijft liggen als je het niet plant.

---

## 12. De vier bugs die in dezelfde beweging mee moeten

**`closed_at` wordt nooit geschreven.** Zet hem bij "geleverd + goedgekeurd" of bij handmatig
afsluiten. Daarmee gaat de klok van 90 dagen lopen die je in de voorwaarden belooft, gaan
portaallinks daadwerkelijk verlopen, en gaan de reviewknoppen dicht.

**`makeRef()` kan botsen en de botsing wordt ingeslikt.** De `INSERT` zit in `safe()`, dus bij
een dubbele ref wordt de nieuwe bestelling niet weggeschreven, levert de daaropvolgende
`SELECT ... WHERE ref=?` de *oude* bestelling op, en hangen de uploads en het portaaltoken van
de nieuwe klant aan de order van iemand anders. Zeldzaam, maar het faalt in de ergst denkbare
richting.

**Uploads lopen door de Worker.** Elke byte van elke referentiefoto gaat door de Pages
Function in plaats van gepresigned rechtstreeks naar R2. Bij 25 producten × 4 foto's is dat
merkbaar en het kost onnodig rekentijd.

**Er staat nergens wat een bestelling kost.** `orders.total_cents` heeft geen schrijver en
geen lezer. Zolang dat zo is, kan geen enkele module in dit plan een bedrag tonen dat
achteraf klopt.

---

# Deel 3 — Volgorde

*Definitief, 3 augustus 2026. Jouw keuzes: je twee grote tijdvreters zijn resultaten rondsturen
en administratie; het portaal mag JavaScript krijgen waar het echt helpt; Mollie gaat echte
bestellingen afrekenen (optie B uit deel 6); de AI Act op minimumniveau, met de onjuiste
claims op de site rechtgetrokken.*

**Vooraf, deze week, los van alle fases.** Twee kleine dingen die niet kunnen wachten, omdat de
site nu iets belooft dat niet bestaat. Eén: `/portal` zegt dat het goedkeuringslogboek "als pdf
exporteert" en dat dat de documentatie is die de EU AI Act vraagt. Je hebt voor het minimum
gekozen, dus die export komt er voorlopig niet — dan hoort de zin te worden bijgesteld. Een
claim over naleving is de verkeerde plek om vooruit te lopen, zeker nu artikel 50 sinds
2 augustus geldt. Datzelfde geldt voor de belofte van downloads per kanaal en een
herkomstmanifest bij elke download. Twee: `orders.closed_at` laten schrijven, zodat de klok van
90 dagen uit je voorwaarden daadwerkelijk gaat lopen en portaallinks verlopen zoals beloofd.
Samen een halve dag.

**Fase 1 — het leverpad.** De schakel waar het halve document aan hangt:

1. **Het leverendpoint in admin** — beelden aan een bestelling hangen per product, met de
   juiste `product_key`, wat een `files`-rij met `kind='delivery'` schrijft. Dit is het
   ontbrekende stuk: er bestaat vandaag geen enkele route die zo'n rij kan maken.
2. **Previewgeneratie** (`preview_key`), zodat de galerij niet 25 volledige beelden hoeft te
   laden. `portal.js` leest al `preview_key || r2_key`, dus het degradeert netjes als een
   preview ontbreekt.
3. **`closed_at` schrijven** bij geleverd-en-goedgekeurd of bij handmatig afsluiten.
4. **E-mail bij statuswijziging** — nu gaat er bij een statuswissel helemaal niets uit.
   `sendMail()` en Resend staan er al, dit is vooral sjabloonwerk.
5. **De werkbank per bestelling** in admin: één pagina per order met de klantgegevens, de
   referentiefoto's per product en hoek, de antwoorden, het venster, de tijdlijn en het
   leverpaneel bij elkaar.

Zodra dit er is, is het klantenportaal voor het eerst compleet zoals `/portal` het beschrijft,
en werken de galerij, de goedkeuringen, de revisies en het beoordelingslogboek eindelijk echt.

**Meeliftend in fase 1, als fundament voor fase 2:** de prijs naar de server en het btw-regime
vastgelegd op de bestelling. Dit is klein werk naast het leverpad en het is niet optioneel —
zonder een bedrag dat de server zelf heeft berekend kan er geen betaling worden aangemaakt, en
vandaag bestaat die berekening alleen bij het bouwen van de site en in de browser.

**Fase 2 — de betaalmodule.** Nu je voor Mollie op echte bestellingen hebt gekozen, is dit de
tweede fase in plaats van de laatste, omdat administratie je andere grote tijdvreter is:

1. **Betaallink per bestelling** en de bestaande webhook verbreed van €0,99 naar elk bedrag.
   Die webhook is idempotent en heeft bewezen gewerkt, dus dit is het makkelijke deel.
2. **Terugbetalingen**, en dit is nu een echt gat dat met betalen meekomt: een refund stuurt
   dezelfde webhook opnieuw, botst op de uniciteitsregel `UNIQUE(provider, external_id)`, wordt
   als dubbele melding weggegooid, en de bestelling blijft voor altijd op `paid` staan. Met
   testbedragen van €0,99 viel dat niet op; met echte bedragen wel.
3. **Factuur als pdf** met het juiste btw-regime erop — 21% of verlegd bij een geldig
   EU-btw-nummer buiten Nederland — plus de correctielijst in admin die hoort bij jouw
   tussenoplossing (iedereen 21%, achteraf corrigeren).
4. **Betaalstatus zichtbaar** in het portaal en in `/account`. De kolommen bestaan al.

Bewaking die hierbij hoort: het bedrag dat de bezoeker in zijn browser zag en het bedrag dat
de server berekent moeten aantoonbaar hetzelfde zijn. `pricing.js` valideert zichzelf al bij
het inladen (`assertLadder()`); die controle moet meegroeien, zodat een wijziging aan de ladder
niet stil twee verschillende waarheden oplevert.

**Fase 3 — het all-in-one scherm.** Actiebalk "wat moet ik nu doen", tijdlijn met conservatieve
datums, blokkadepaneel "waar wij op wachten", foto's nasturen vanuit het portaal (met
JavaScript, dus met voortgang per product, en een werkende terugval zonder JS), meekijklink
voor het team van de klant, herbestellen.

**Fase 4 — de revisielus af maken.** Revisie-inbox met echte acties, versies naast elkaar
(v1/v2), "akkoord met opmerking" als derde beslissing, batch-goedkeuren per product, en
aantekenen op het beeld — dat laatste nu mogelijk gemaakt door de JS-keuze.

**Fase 5 — AI Act en downloads.** Herkomstoverzicht per bestelling (wat is gemaakt, waaruit,
wanneer, door wie beoordeeld) en het juiste EU-icoon meeleveren: "gedeeltelijk door AI
aangepast" past bij jouw werkwijze, omdat je uit de echte productfoto's van de klant werkt.
Plus de downloads per kanaal. Kan pas na fase 1, omdat er zonder geleverde beelden niets te
documenteren valt. **Niet in scope, op jouw keuze:** zelf C2PA-manifesten ondertekenen en het
ondertekenen van de praktijkcode.

**Fase 6 — verfijning en overzicht.** Het dagbord op de capaciteitspoort, het beheerscherm voor
vrije dagen (nu handwerk via de commandoregel), de cijfers, het klantdossier, de
berichtendraad, en de scheiding tussen interne en klantzichtbare notities.

**Doorlopend:** de vier bugs uit deel 2 module 12 — waarvan `makeRef()` en de niet-gepresignede
uploads het eerst, want die worden erger naarmate er meer bestellingen binnenkomen — en het
opruimen van de dode Stripe-code en `debug-mollie.js`.

---

# Deel 4 — Wat ik bewust niet zou bouwen

**Automatisch goedkeuren na N dagen.** Nergens gemeten, en zelfs Ziflow — het zwaarste
proofing-platform in deze markt — doet het niet: hun beslissingslogica rekent alleen als een
beoordelaar daadwerkelijk iets indient. Het is bovendien geen ontwerpkeuze maar een
contractuele: je zegt ermee "wie zwijgt stemt toe". Als je het toch wilt, hoort het in de
voorwaarden en niet in de interface.

**Zelf C2PA-manifesten ondertekenen.** Vereist een certificaat van een CA op de C2PA-trustlijst
en in productie sleutelbeheer in een HSM. Voor een eenmanszaak onevenredig; het bewaren van
bestaande manifesten levert vrijwel hetzelfde op.

**Een eigen chat in plaats van WhatsApp.** Je klanten zitten al in WhatsApp en dat werkt.
Bouw het archief, niet het kanaal.

**Een echt abonnementen-/creditsysteem** zolang de maandplannen nog niet lopen. `/account/plan`
zegt nu eerlijk dat er per bestelling wordt gefactureerd; dat is beter dan een half werkend
tegoedsysteem.

---

# Deel 5 — Beslissingen

**Beantwoord op 3 augustus 2026.**

*Startpunt: het leverpad.* Fase 1 hierboven.

*JavaScript in het portaal: ja, waar het echt helpt.* Geen algemene vrijbrief maar per scherm.
In de praktijk zijn dat er drie: foto's nasturen (voortgang per product), batch-goedkeuren, en
later aantekenen op het beeld. Onder alledrie blijft een werkende variant zonder JS liggen,
zodat een geblokkeerd script niets breekt. De CSP gaat van `default-src 'none'` naar een
nonce-gebaseerde `script-src` op die schermen — niet naar `unsafe-inline`, en niet op het hele
portaal.

*Betalingen: optie B, Mollie voor echte bestellingen.* Fase 2, met het fundament in fase 1.

*AI Act: het minimum, en de claims kloppend maken.* Herkomstoverzicht per bestelling, het juiste
EU-icoon meeleveren ("gedeeltelijk door AI aangepast"), en de C2PA-manifesten bewaren die er bij
Firefly, DALL·E en Imagen al op zitten in plaats van zelf te ondertekenen. Geen praktijkcode,
geen eigen certificaat. En de drie beloftes op `/portal` die geen code hebben — downloads per
kanaal, het herkomstmanifest bij elke download, en de pdf-export van het goedkeuringslogboek —
worden meteen bijgesteld naar wat er is, en later naar wat er dan staat.

**Nog open — de capaciteitsvraag.** Klopt **18 producten per dag**? De hele capaciteitspoort,
elk venster dat je verkoopt en elke datum die je belooft rusten op dat getal, en het staat in
`capacity.js` aangemerkt als een operationele aanname die jij moet bevestigen. Als het in
werkelijkheid 12 is, verkoop je vandaag vensters die je niet kunt halen — en het onderzoek in
module 2 zegt dat een gemiste datum je duurder komt te staan dan hij voelt.

---

# Deel 6 — De betaalvraag, uitgelegd

Je wilde eerst weten wat elke optie inhoudt. Hieronder wat ze concreet betekenen, wat ze
kosten, en waar je je aan vastlegt.

## Waarom er überhaupt een keuze is

Er staat vandaag nergens vast wat een bestelling kost. `orders.total_cents` heeft geen
schrijver en geen lezer, en `quote()` uit `pricing.js` draait alleen bij het bouwen van de site
en in de browser van de bezoeker. De server heeft dus geen enkel getal. Dat blokkeert meer dan
alleen betalen: het portaal kan geen bedrag tonen, admin kan niets optellen, een klantdossier
kan geen omzet laten zien, en een factuur moet elke keer opnieuw met de hand worden uitgerekend.

De ijzeren regel bij betalen: **een bedrag uit de browser mag nooit een betaling worden.** Wat
de bezoeker ziet is een weergave; wat er wordt afgerekend moet de server zelf hebben berekend.
Daarom staat "de prijs naar de server" in elke optie hieronder die verder gaat dan niets.

## Optie A — Factureren blijft volledig buiten de site

**Wat het is.** Je factureert zoals nu, met de hand of via je boekhoudpakket. Het portaal zegt
niets over geld, of hooguit "betaald: ja/nee" dat jij zelf in admin omzet. Mollie blijft alleen
voor het testmonster van €0,99.

**Bouwlast.** Nul.

**Wat je ervoor terugkrijgt.** Niets nieuws, maar ook geen nieuw onderhoud.

**De prijs.** Elke factuur blijft handwerk, inclusief het uitrekenen van de laddertrede en het
btw-regime. Er komt nooit een omzetcijfer uit het systeem. En elke module in dit plan die een
bedrag zou willen tonen — portaal, klantdossier, cijfers — kan dat niet.

## Optie B — Mollie voor echte bestellingen, helemaal af

**Wat het is.** De prijs wordt bij het plaatsen op de server berekend en vastgezet op de order.
Het btw-regime wordt bepaald en opgeslagen (21%, of verlegd bij een geldig EU-btw-nummer buiten
Nederland). De klant krijgt een betaallink. De bestaande Mollie-webhook wordt verbreed van
€0,99 naar elk bedrag. Er komt een factuur-pdf, en de betaalstatus wordt zichtbaar in het
portaal.

**Bouwlast.** De grootste module in het plan. De webhook is het makkelijke deel — die bestaat,
is idempotent en heeft bewezen gewerkt. Het zware zit in de prijsberekening op de server (met
gegarandeerd dezelfde uitkomst als de ladder in de browser, anders zie je één bedrag en betaal
je een ander), de btw-beslissing, de factuur-pdf, en terugbetalingen. Dat laatste is nu een
echt gat: een terugbetaling stuurt dezelfde webhook opnieuw, die botst op de uniciteitsregel,
wordt als dubbele melding weggegooid, en de bestelling blijft voor altijd op "betaald" staan.

**Wat je ervoor terugkrijgt.** Klanten kunnen direct afrekenen in plaats van op jouw
factuurtermijn. Het is de enige module in het hele plan die direct geld binnenhaalt in plaats
van tijd te besparen.

**Waar je je aan vastlegt.** Zodra er geld over de site loopt, moet de prijs elke keer kloppen.
Er is geen "ongeveer". Elke wijziging aan de prijsladder moet daarna op twee plekken kloppen
en dat moet afgedwongen worden, niet onthouden.

## Optie C — Nu voorbereiden, later aanzetten

**Wat het is.** Alleen de eerste twee stappen van optie B: de prijs naar de server, en het
btw-regime vastgelegd op de bestelling. Verder niets — geen betaallink, geen pdf, geen Mollie
voor echte orders.

**Bouwlast.** Ruwweg een vijfde van optie B.

**Wat je ervoor terugkrijgt.** Elke module in dit plan kan een bedrag tonen dat klopt: het
portaal, admin, het klantdossier, de omzetcijfers. Je facturen worden "het getal van de order
overnemen" in plaats van opnieuw uitrekenen. En het verschil tussen dit en optie B is later een
betaallink en een verbrede webhook — een stap, geen verbouwing.

**Wat je niet krijgt.** Klanten kunnen nog steeds niet online afrekenen.

## Gekozen: optie B

Je kiest voor echt betalen via het portaal. Dat staat in fase 2, met het fundament ervoor
(prijs naar de server, btw-regime op de bestelling) meeliftend in fase 1 — die volgorde is niet
omkeerbaar.

Twee dingen om vast te houden nu er echt geld gaat lopen. Ten eerste: de prijs die de bezoeker
ziet en de prijs die wordt afgerekend moeten uit dezelfde bron komen, afgedwongen door een
controle en niet door onthouden. Ten tweede: het terugbetalingsgat hierboven moet in dezelfde
fase dicht, want met echte bedragen is "de bestelling staat eeuwig op betaald" geen schoonheids-
foutje meer.

---

*Bronnen voor de cijfers in dit document: DigitalGenius WISMO-platformdata (2023); Gartner
zelfservice-onderzoek, n=5.728 (2024); Harter, Stich & Spann, Journal of Service Research
28(2), n=304.407 klanten / 2.096.539 bestellingen (2025); Narvar State of Post-Purchase, n=3.461
(2025); Ariely & Wertenbroch, Psychological Science (2002); Baymard Institute
gebruikersonderzoek; Ziflow beslissingsdocumentatie; Zendesk en Dubsado productdocumentatie;
GitHub Enterprise impersonatiedocumentatie; Europese Commissie, artikel 50 AI-verordening en
de praktijkcode van 10 juni 2026. Waar een claim alleen van een leverancier komt, staat dat
erbij; waar ik geen bewijs kon vinden, staat dat er ook bij.*
