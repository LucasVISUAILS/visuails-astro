# Controleronde 20–21 augustus 2026

<!-- namen-bijgewerkt -->
> **Namen bijgewerkt, 30 augustus 2026.** Dit document noemt een bestand dat inmiddels anders heet of niet meer bestaat. De tekst eronder is niet herschreven — een deel van die namen staat in geciteerde foutmeldingen en bouwuitvoer, en die aanpassen zou het bewijs vervalsen in plaats van bijwerken. Wat ze vandaag zijn:
>
> - `functions/admin/debug-mollie.js` → `/admin/diagnose` in de padtabel van `src/lib/admin.js` — op 23 augustus 2026 verplaatst, juist omdat een statisch routebestand onder functions/admin/ de centrale originIsSelf()-controle omzeilde


Dit is het verslag van de ronde die volgde op *"laten we de hele lijst afwerken en
daarna een gehele controle doen om te kijken of alles succesvol is toegepast.
Hierna ook de gehele site controleren op bugs, inconsistenties, taalfouten of rare
zinnen en andere problemen."*

Het valt uiteen in vier delen: de zes backendpunten die af moesten, een
tegenlezing van diezelfde code, een controle over de hele site, en een defect in
de controlegereedschappen zelf. Onderaan staat wat er nog van jou nodig is en wat
er bewust open blijft staan.

---

## 1 · De zes backendpunten

Alle zes zijn af en staan op je schijf. Wat ze doen staat uitgebreid in de
commentaren bij de code zelf; hier alleen wat er nu anders werkt dan gisteren.

Een abonnement levert nu **een factuur per incasso**. Dat was het grootste gat:
de maandbedragen werden afgeschreven en er kwam geen enkel document uit.
Migratie 0032 voegt `subscription_invoices` toe, die uit dezelfde `invoice_series`
trekt als de bestelfacturen — één doorlopende nummering over alle documenten,
want dat is wat de Belastingdienst vraagt.

De **btw-poort heeft een uitgang gekregen**. Keurde je een bestelling goed op
`/admin/vat`, dan gebeurde er daarna niets: de klant zat te wachten op een
betaallink die jij met de hand moest maken, terwijl de bevestigingsmail hem
beloofde dat die binnen 24 uur zou komen. Nu gaat de link automatisch de deur uit.

**Een annulering met terugbetaling stort het geld ook echt terug.** De functie
`refundMolliePayment()` bestond al maar werd nergens aangeroepen; het
annuleerscherm legde alleen je *besluit* vast.

Verder: een **factuurherstelknop** op de bestelkaart (opnieuw renderen, opnieuw
mailen), een **dekkingscontrole** die weigert een factuur uit te geven voor geld
dat niet binnen is, **postcodes** die netjes als `1234 AB` op de factuur komen, en
een **nachttaak** die goedgekeurde maar onbetaalde bestellingen na zeven dagen
laat vervallen.

---

## 2 · De tegenlezing, en wat die vond

Toen die zes klaar waren stonden alle tests op groen — 3096 assertions. Ik heb
daarna twee onafhankelijke tegenlezingen over precies die nieuwe code laten gaan,
met de opdracht om hem stuk te krijgen in plaats van goed te keuren. Ze vonden
er twaalf, en de meeste kostten geld.

**De ergste: elke Nederlandse abonnee kreeg 0% btw op zijn factuur.** In
`vatVoorAbonnement()` stond de letterlijke tekst `'standard'` als terugval, terwijl
de constante `VAT_TREATMENT.standard` de waarde `'nl_standard'` draagt. De
vergelijking verderop werd daarmee altijd false en het tarief altijd nul. Precies
dezelfde fout had ik eerder diezelfde dag in `admin.js` gerepareerd en hier
opnieuw gemaakt. Het raakte uitsluitend de groep die 21% verschuldigd is: een
buitenlandse EU-abonnee heeft wél een VIES-bestelling en kwam dus nooit in de
terugval terecht. Op € 390 per maand is dat € 67,69 per abonnee per maand die je
zelf had mogen afdragen.

**Het merkmodel-tegoed werd honderd keer te klein geboekt.** `AMOUNT` is in
euro's, `customer_credits.delta_cents` in centen: 250 × 5 = 1250, en 1250 cent is
€ 12,50. De reden ernaast beloofde € 1.250. Dezelfde poort kon het tegoed
bovendien twee keer boeken (modellen worden echt verwijderd, dus de teller ging
terug naar nul) én helemaal overslaan (de tweede invoegplek, op de bestelkaart,
boekte niets). Alle drie zitten nu in één functie die op het grootboek kijkt in
plaats van op het aantal modellen.

**De AVG-wisknop viel om zodra er één abonnementsfactuur bestond.** De nieuwe
tabel verwees met `ON DELETE RESTRICT` naar het abonnement, en `subscriptions`
hangt met `ON DELETE CASCADE` aan de klant — dus liep de hele batch terug. Geen
bestellingen gewist, geen logregel, terwijl de R2-bestanden in stap 2 al
onherroepelijk weg waren. Precies de fout die op 12 augustus al één keer voor
`invoices` was gerepareerd. De verwijzingen staan nu op `SET NULL`: de factuur
draagt zichzelf in `snapshot_json` en haar pdf, en dát is het bewijsstuk waar de
fiscale bewaarplicht over gaat. **Migratie 0032 is hiervoor gewijzigd** — zie punt 5.

**De nachttaak liet aanvragen vervallen die nooit te betalen waren.** Een aanvraag
voor een merkmodel, een video of een look op maat gaat via hetzelfde formulier de
orders-tabel in, heeft geen prijs per product en gaat altijd door de
btw-beoordeling. Zeven dagen na jouw goedkeuring kreeg zo'n lead een mail dat zijn
bestelling was vervallen omdat hij niet betaald had. Er was nooit iets te betalen.
Dezelfde taak schreef bovendien de tijdlijnregel en de mail ook als de hercontrole
de bestelling terecht met rust liet — dus wie op dat moment betaalde, hield zijn
bestelling én kreeg een vervalmail.

**Een tweede terugbetaling vroeg altijd het hele bedrag.** Stond er al € 200
coulance terug op een bestelling van € 1.210, dan vroeg de annuleerknop Mollie om
€ 1.210 in plaats van om de resterende € 1.010. Mollie weigert dat, en de klant had
op zijn tijdlijn al gelezen dat het geld terugkwam.

**"Credit for a future order" boekte geen tegoed.** Die keuze zette alleen een
kolom en een regel op de tijdlijn — die de klant leest. In het grootboek stond
niets. Nu wel, met de bestelling erbij als herkomst.

En verder: de abonnementsfactuur droeg **geen adres** (een typefout waarbij een
array aan een functie werd gegeven die een object verwacht) en stond **altijd in
het Nederlands** (hij las `customer.lang`, een kolom die niet bestaat); een
vastgelopen abonnementsfactuur werd door **geen enkele hersteltaak** opgeraapt
terwijl migratie 0032 er wel een index voor aanmaakte; een gelijktijdige tweede
aanroep **verbruikte een factuurnummer** en liet een gat in de reeks achter; een
mislukte betaallink liet **nergens een spoor** na; de betaallink stuurde
Nederlandse klanten naar de **Engelse bedankpagina**; en de € 1 van het
mandaat leverde bij elke nieuwe abonnee een **rode foutregel** in het log op.

Er staat nu een nieuwe testsuite (`npm run test:nazicht`, 41 controles) die alle
zeven belangrijkste gevallen vastlegt — op een echte database uit `schema.sql`
met foreign keys aan, want vier ervan bestaan alleen omdat een database iets
weigert.

---

## 3 · De site zelf

Over alle 93 pagina's heen: alle bedragen, alle koppen, alle links.

**Wat goed was.** Van de 46 NL/EN-paren verschilt geen enkel bedrag (na
normalisatie van € 1.250 tegen € 1,250) en heeft geen enkel paar een andere
kopstructuur. Nul dode interne links, nul ontbrekende og-beelden, alle
hreflang-paren compleet, 93 JSON-LD-blokken zonder fout, de sitemap dekt precies
de 88 pagina's die geïndexeerd horen te worden. Geen mojibake, geen
plaatshouders, geen spelfouten (hunspell nl_NL en en_GB), geen Amerikaans-Britse
mengelmoes.

**Wat er mis was.** Op `/start/plan` stond het label boven de omschrijving en
begon de omschrijving met datzelfde woord: *"Maandelijks / Maandelijks, en elke
maand opzegbaar"*. Op `/compare` stond *"€ 65 per product, aflopend tot € 65"* —
geen tikfout maar een zin die ervan uitging dat het ankeraantal halverwege de
ladder ligt, terwijl 30 producten er al onder zit. Op `/catalog` stond *"elk
product voor vanaf € 89"*, twee voorzetsels achter elkaar, omdat de variabele het
eerste woord al bevatte. Op `/video` stond de doorlooptijd twee keer in dezelfde
zin. De FAQ zei *"catalog vanaf € 39"* waar elke andere pagina € 89 als
instapprijs noemt.

Het voorbeeldscherm op de homepage en `/portal` zette **€ 630 voor 30
catalogproducten** — dat is € 21 per product, een tarief dat nergens bestaat. De
btw eronder klopte keurig bij die 630, wat het geheel juist geloofwaardiger maakte.
Het bedrag komt nu uit `quote()` in plaats van uit mijn hoofd. In datzelfde scherm
droeg *Aaron* de kenmerken van *Ava* en een verzonnen *Tomas* die van Aaron; wie
van `/models` hierheen komt zag hetzelfde gezicht met twee omschrijvingen.

In het Engels: *"on the week it is not true"* (Nederlands "in de week"), *"we
regulate it properly"* (van "regelen", wat *sort out* betekent en niet
*reguleren*), *"we are glad to think along"* (drie keer, van "meedenken"), *"that
is not distance"* (van "afstandelijkheid"), *"Choose one that fits our brand"* op
een plek waar VISUAILS aan het woord is en het Nederlands gewoon *"Wij kiezen er
een die bij je merk past"* zegt. In het Nederlands: *"2 compleete setjes"* (de
code plakte een -e achter "compleet"), *"controleert of het klopt, consistentie en
artefacten"* (een opsomming die niet meer op het werkwoord aansloot), *"Zo krijgt
een drukker, een productpagina en een feed"*, *"dezelfde colour grade"*,
*"machine-leesbare"*, *"degene die er wél een hebben"*.

En een paar kleinere: de bestelpagina beloofde *"een offerte op basis van dezelfde
bedragen als op deze pagina"* op een pagina die *"prijs op aanvraag"* zegt; de
referentiefoto-uitleg zei *"één van de vier die je krijgt"* ook op de
lifestyle-pagina, waar er drie geleverd worden; `bol` stond zes keer met een
hoofdletter en acht keer zonder; en de 404-pagina had rechte apostroffen tussen
de krulletjes.

Alles hierboven is gerepareerd. De 24 `Placeholder`-blokken (*"Foto volgt"*) staan
er nog en zijn bewust: `npm run placeholders` geeft de lijst met per beeld wat het
moet laten zien.

---

## 4 · De vangrail was zelf kapot

Dit hoort erbij, want het is de reden dat ik een deel van de nacht heb
weggegooid: `npm run visueel` meldde **80 verschillen op 66 plekken** terwijl er
aan die pagina's niets veranderd was. Ze zagen er stuk voor stuk echt uit —
tientallen secties, beide richtingen, steeds ongeveer één tekstregel.

Twee oorzaken, allebei in het gereedschap en niet in de site.

De site laadt **twaalf `@font-face`-regels met `font-display: swap`**. Swap
betekent: teken de tekst nu met de terugvalletter en wissel om zodra de echte
binnen is. `waitUntil: 'load'` wacht daar niet op, dus viel de opname soms vóór en
soms ná de omwisseling — en de terugvalletter is niet even breed als Archivo. Eén
woord meer of minder op een regel, en een sectie is een regelhoogte langer of
korter. Beide gereedschappen wachten nu op `document.fonts.ready`.

Daarna bleef `/demo` over, met een verschil van **drieduizend pixels**. In
`Layout.astro` staat een poort die de klasse `js` op `<html>` zet en er 600ms na
`load` weer afhaalt als de onthulmodule zich niet gemeld heeft. `.wk-step` in
`FigWalk.astro` hangt met `min-height: 66svh` aan diezelfde klasse, dus de tien
stappen van de walkthrough zijn samen ruim 7000px mét die klasse en een fractie
daarvan zonder. Met acht werkers op één machine haalde de module die 600ms de ene
keer wel en de andere keer niet. Beide gereedschappen wachten nu tot die poort
uitgepraat is.

Dat is geen schoonheidsfoutje: een vangrail die af en toe wolf roept, wordt
uitgezet. Na de reparatie: referentie opnieuw vastgelegd, en twee volledige runs
achter elkaar met **GEEN VERSCHILLEN** over 364 opnamen.

---

## 5 · Wat er van jou nodig is

**Draai `npm run migrate`.** Migratie 0032 is nieuw *en is vannacht gewijzigd* —
de twee vreemde sleutels staan nu op `SET NULL` in plaats van `RESTRICT`. Heb je
0032 eerder al een keer gedraaid, zeg dat dan even: `CREATE TABLE IF NOT EXISTS`
slaat een bestaande tabel over, en dan is er een losse ombouw nodig. Anders is
gewoon `npm run migrate` genoeg.

**Zet `SELLER_ADDRESS` als Pages-secret.** Zonder dat secret staat er
"Voorbeeldstraat 12" op elke factuur — dat is met opzet zo: een terugval die per
ongeluk klopt, valt niemand op. Eén regel, met `|` of `\n` tussen de adresregels.

**Optioneel: `INVOICE_BCC`** als je een kopie van elke factuur in je eigen
administratie wilt.

**Verwijder `functions/api/debug-egress-ip.js`.** Dat bestand zegt in zijn eigen
eerste regel *"TEMPORARY — delete this file after we've got the egress IP"* en
staat er sinds het Cloudflare-ticket van juli. Het is onbeveiligd bereikbaar en
doet bij elk bezoek een uitgaande fetch. Ik kan geen bestanden op jouw schijf
verwijderen. `functions/admin/debug-mollie.js` staat wél achter je adminlogin, dus
die heeft geen haast — maar die zegt ook "delete this file once the empty 400 is
understood", en dat is inmiddels begrepen.

**`npm run krimpen`** staat klaar als proefrun. 73 beelden worden nog veel groter
aangeleverd dan ze ooit getoond worden: samen 6,2 MB die niemand ziet. De taak
doet niets tot jij het zegt en weigert te schrijven zolang `public/img` niet
schoon in git staat.

En daarna de gewone route: `git push`, dan `npm run cron:check` en
`npm run cron:deploy` — en controleer dat `RESEND_API_KEY` ook op het cron-project
staat.

---

## 6 · Wat er open blijft, en waarom ik het niet zelf heb beslist

**De € 1 van het mandaat staat nergens.** Bij elke nieuwe abonnee wordt één euro
geïncasseerd om het SEPA-mandaat op te halen. Die betaling draagt geen
`order_ref` en geen `subscriptionId`, dus de webhook ziet hem niet als bestelling
en niet als abonnementstermijn. Het abonnement wordt op de terugkeerpagina
geactiveerd, dus de keten loopt — maar die euro is ontvangen en staat in geen
enkele tabel. Of daar een factuur bij hoort is een btw-vraag en geen codevraag.
Ik heb alleen de misleidende foutregel weggehaald; er wordt bewust nog niets
vastgelegd, want het verkeerd vastleggen is erger dan het niet vastleggen.

**Een abonnementsfactuur is niet te crediteren.** `credit_notes.invoice_id`
verwijst naar `invoices` en niet naar `subscription_invoices`. Komt er ooit geld
terug op een abonnementstermijn, dan blijft de factuur op zijn volle bedrag staan.
Dat vraagt een tweede tabel of een verbreding van de bestaande, en dat is een
ontwerpbeslissing die ik niet in mijn eentje moet nemen op de dag dat de eerste
abonnementsfactuur nog moet worden uitgegeven.

**Er staat geen volledige CSP op de site** — alleen `frame-ancestors 'none'`.
`scripts/csp-probe.mjs` bestaat, dus het is ooit onderzocht. Een CSP die te streng
staat breekt de site stil bij bezoekers en niet bij jou; dat is een aparte ronde
met een meting erbij, geen regel die je er even bij zet.

---

## 7 · De stand van de controles

| | |
|---|---|
| `npm test` | 49 suites, 3137 assertions, exit 0 |
| `npm run keuring` | 364 pagina-metingen, **geen bevindingen** |
| `npm run visueel` | 364 opnamen, **geen verschillen** (twee runs achter elkaar) |
| tekstcontrole | 93 pagina's, alleen de twee bekende valse meldingen |
| NL/EN-paren | 46 paren, 0 verschillen in bedragen of kopstructuur |
| links en meta | 0 dode links, 0 hreflang-gaten, 93 JSON-LD-blokken zonder fout |

`test:a11y` en `test:steps` zaten niet in `npm test` en zijn er nu aan toegevoegd
— de toegankelijkheidssuite vond bij de eerste run meteen iets, en een suite die
alleen draait als je eraan denkt, draait niet.
