# Levering 69: klaar voor echte klanten en echt geld (5 november 2026)

Cloudsessie, branch `claude/voor-de-launch`. Je antwoordde om 02:13 **"alles advies"** (vraag 1 tot en met
17, dus ook 17 = a: deze branch) en om 02:40 **16 = b** (na 08:59 doorgaan tot alles af is of je limiet op is;
bij twijfel het advies, in de notitie, en elke levering pushen zodra hij af is). Dus: 1 ja (alle negen),
2 a, 3 ja, 4 a.

Uitrollen met **UITROLLEN.bat**, zonder migratie. Eerst via de chat met de brug in je map zetten (§11 van de
opdracht). Er verandert niets aan hoe de site eruitziet, op drie zinnen na (§A2 en §A4).

**Wat het meest telde:** de naloop van de geldstromen vond drie echte geldfouten die vóór de eerste betalende
klant weg moesten: de knop "Nu betalen" in Studio liet een klant zijn verrekende tegoed dubbel betalen; het
automatisch terugstorten van een dubbele betaling zette een goede bestelling op "terugbetaald", met een
volledige creditnota aan de klant; en een SEPA-incasso rond de 28e kon een termijn zonder credits, factuur of
mail laten. De beveiligingsnaloop vond er vier: privélinks en een inlogknop in de kopie voor de administratie,
onbeperkt raden van de TOTP-code op /admin/security, de inlogcode in het logboek, en een race bij bijkopen.
Alle zeven zijn gerepareerd, elk met een toets die tegen de oude code rood was.

## A · De bekende reparaties uit §17

1. **"Betaallink opnieuw mailen" stuurt geen btw-mail meer** (§17 punt 3). `stuurBetaallink()` kreeg de
   soort `opnieuw`: onderwerp "Je betaallink, opnieuw — VIS-…", kop "Je betaallink", en "Hier is de betaallink
   voor VIS-… opnieuw." Geen woord over btw of een controle. Bij een offerte (een `quote_kind` op de bestelling)
   blijft de zin over het bedrag erbij (volledig, aanbetaling, restant). De tijdlijn zegt "Betaallink opnieuw
   verstuurd". `handlePayLinkResend` geeft `opnieuw: true` mee. De btw-zin komt alleen nog uit
   `handleVatDecision` (het echte btw-akkoord). Toets: `tests/klantmails-a2.test.mjs` (NL, EN, een EU-klant
   met btw, een offerte, de knop zelf); de mail staat ook in `tests/lib/alle-mails.mjs`, zodat de merk- en
   leesbaarheidstoetsen hem meetekenen.
2. **Credits alleen voor catalog en lifestyle** (§17 punt 8, vraag 2 = a). De welkomstmail (eerste maand en
   vooruit, NL en EN) zegt "catalog en lifestyle". `creditTips()` in de cron rekent alleen met
   `CREDIT_DIENSTEN`, dus nooit meer "2 × motion" of een hook. **Erbij, dezelfde belofte:** /pricing
   ("credits voor catalog, lifestyle en video"), de bedankpagina en de zin na drie maanden bestellen
   (`upgradePrompt`) zeiden het ook; die drie volgen nu dezelfde lijst. Toets:
   `tests/creditherinnering.test.mjs` (geen tip voor video of hooks bij 0 tot 240 credits, NL en EN; de
   welkomstmail tegen `CREDIT_DIENSTEN`). Alle zinnen in `kladblok/TEKSTEN-69.md`.
3. **De betaalstatus `credits`** staat in `src/data/status.js` als `done` ("betaald met credits", de stand van
   `paid`), en de klantpagina in /admin toont "betaald met credits" in plaats van het kale woord met een
   wachtpil. `trialing` is weg: geen code leest of schrijft hem. De andere waarden die "nooit voorkomen"
   (`awaiting_payment`, `past_due`, `canceled`, `expired`) worden wél ergens gelezen (Mollie-statussen), dus
   die bleven.
4. **"vanaf het gewone tarief"** op de kaart van de eigen cataloglook, NL en EN ("from the regular rate").
5. **De noot bij `assertVoorrang`** zegt nu dat het plafond van € 249 wél bijt: 19 lifestyleproducten met 4K =
   € 1.387, 20% is € 277,40, de klant betaalt € 249 (nagerekend met `quoteOrder`). Het bedrag is niet veranderd.
6. **`notifyRevision()` is weg** uit `src/lib/notify.js`, met de import in `portal.js`. Er staat een noot op
   zijn plek; de studio krijgt één mail per ronde (`notifyRevisionRound`).
7. **e-Boekhouden in de lijst van ontvangers** (§17 punt 6), de drie stappen uit de kop van
   `src/data/subverwerkers.js`: een regel in `ONTVANGERS` (`beeld: false`, dus in het privacybeleid §5 en niet in
   §8 van de verwerkersovereenkomst), `LIJST_GEWIJZIGD` op 5 november 2026, en de partij in
   `docs/AVG-VERWERKINGSREGISTER.md` §5. "Laatst bijgewerkt" van /privacy en /data-processing-agreement staat
   daardoor op november 2026 (de toets eist dat een pagina niet ouder is dan de lijst die hij afdrukt).
   **Volgorde:** zet `EBOEKHOUDEN_API_TOKEN` pas als de meldtermijn van 14 dagen (`MELDTERMIJN_DAGEN`) voorbij
   is, dus op zijn vroegst 19 november. Er zijn nu nog geen klanten om te mailen, dus stap 2 (alle klanten
   mailen) valt nu weg; heb je vóór 19 november toch een klant, mail hem dan eerst.
8. **Twee regels voor de geldigheid van credits** (§17 punt 15). Nagekeken: geen scherm, mail of tekst toont
   nog de oude regel. Alles wat de klant leest, komt uit `CREDITS_GELDIG_MAANDEN` (3 maanden plus het
   spaarplafond): PlanPicker, PlansHal, de welkomstmail, pricing.js. De `rollover` 1 en 3 in `plans.js` voeden
   alleen nog de oude rekensom van `subscription_months`/`subscription_slots` (planState), die geen scherm
   toont; die staat nu met een noot in `plans.js` en gaat mee in het plan voor het weeksysteem (levering 73).
   Weggehaald: de ongebruikte import van `rolloverMonths` in `account.js`, de ongebruikte tekst
   `planSlotCarried` (NL en EN) en de ongebruikte import `vensterVoor` in de cron.
9. **Documenten bij** (§17 punt 25): `LIVE-STAPPEN.md` stap 4 ("Vandaag · ‹dag› — …"), stap 8 (Workers Paid
   bij de launch) en stap 9a (Abonnement › Je plan › Opzeggen); `docs/KLEURENSCHEMA.md` (Studio is alleen
   licht; alleen /admin heeft een donkere stand); `backup-weekly.bat` in `cron/index.js` en `scripts/backup.mjs`.
10. **De resten van het weeksysteem** (vraag 4 = a). Weg: `loadQueue` en `loadTaken` uit `planState()` (twee
    queries op elke pagina met een abonnement), `queueTerugNaAnnulering` en zijn aanroep bij annuleren in
    /admin, het opruimen dat `plan_queue` las (de verlaten uploads in de cron en `EXPIRED_FILES_SQL` in
    `retention.js`), `window_day` in de welkomstmail, en daarna alle `queue*`-functies uit
    `src/lib/subscription.js` en hun import in `account.js`. **Bewust blijven staan:** het wissen van
    `plan_queue` door de AVG-knop. Zolang de tabel bestaat kunnen er oude rijen van een klant in staan
    (productnamen, notities); weghalen zou die bij een AVG-verzoek laten staan. Dat gaat mee met de migratie
    (`kladblok/PLAN-WEEKSYSTEEM-OPRUIMEN.md`, levering 73). Tabel en kolom blijven staan.
    De toetsen die de wachtrij zelf toetsten (`abo-keten`, `abo-misbruik`, `slots`, `subscription`,
    `retention`), zijn herschreven: de delen over de wachtrij zijn weg met een noot, wat nog bestaat
    (webhook, termijnen, slots, planState, de adminpoort) blijft getoetst.

## B · Elke geldstroom van begin tot eind

Elke stroom is gevolgd van de knop naar de database, de mail, de factuur, het creditboek en de velden voor
e-Boekhouden. Alle bedragen uit §19 en §22 van het overzicht komen uit `quoteOrder`, `quoteTestSample`,
`creditKosten`, `bijkoopPrijs`, `customCreditsTotal` en `subMaandBruto` precies zo uit (€ 740,52 · € 546 ·
€ 596 · voorrang € 123/€ 249 · € 1,21 · bijkopen 87/206/390, 66/157/297, 59/139/263 · plafonds 135/360/870 ·
€ 3.900/7.900/16.900; de btw van een abonnement op maat klopt terug van bruto naar netto voor 30 tot 300
credits).

**Gerepareerd:**
- **F2 · "Nu betalen" in Studio negeerde het tegoed.** Een klant met € 210 tegoed op een bestelling van
  € 1.210 die Mollie afbrak en later in Studio op "Nu betalen" drukte, kreeg € 1.210 te betalen; de webhook
  boekte daarna ook de € 210 tegoed af. Nu bruto min tegoed, zoals `/api/order-pay` en de betaallinkmail.
  Dekt het tegoed alles, dan maakt de knop geen betaling. (`src/lib/account.js`, toets
  `tests/account-pay.test.mjs`.)
- **F1 · De terugstorting van een dubbele betaling zette de bestelling op `refunded`.** Twee betalingen van
  het volle bedrag; de webhook stort de tweede vanzelf terug; bij de melding van die terugstorting was de som
  van de terugstortingen gelijk aan het bruto bedrag, dus "volledig terug": `refunded`, een volledige
  creditnota tegenover de factuur van de eerste betaling, gemaild aan de klant, en /admin kon de echte betaling
  daarna niet meer terugbetalen. Nu gaat wat teveel betaald is (alle geslaagde betalingen plus het verrekende
  tegoed, min het bruto bedrag) er eerst af. Een echte deelrestitutie op de eerste betaling telt gewoon.
  (`functions/api/webhook/mollie.js`, `teveelBetaald()`; toets `tests/geldroute.test.mjs`, door de echte
  route; tegen de oude webhook vallen 5 regels om.)
- **F3 · De maand van een vervolgtermijn.** De webhook gaf een termijn de kalendermaand van `paidAt`; alles wat
  de maand leest gebruikt `termijnMaand()`. Bij termijndag 28 en een SEPA-incasso die op 1 december als betaald
  binnenkomt, kreeg de termijn van november de sleutel "december": de cron meldde van 1 tot 27 december
  "incasso uitgebleven", en de termijn van december (betaald op de 29e) botste op dezelfde sleutel en verdween
  stil: betaald, geen credits, factuur of mail. Nu `termijnMaand()` op de betaaldatum voor elke vervolgtermijn;
  bij betalen op of na de afschrijfdag (een kaart) is dat dezelfde maand als voorheen. (Toets
  `tests/geld-69.test.mjs`, nieuw; tegen de oude webhook rood.)
- **F4 · De factuur van een vooruitbetaald jaar** zei "Pro — abonnement oktober 2026". Nu "Pro — abonnement,
  12 maanden vooruit (oktober 2026 t/m september 2027)", het aantal uit `TERMS.prepaid`. (`src/lib/invoice.js`,
  toets `tests/geld-69.test.mjs`; de zin staat in `TEKSTEN-69.md`.)

**Open punten (niet zelf veranderd: bedrag, termijn of klanttekst), met mijn advies:**
- **F5 · VIES onbereikbaar.** Een Duits bedrijf met een geldig nummer bestelt terwijl VIES plat ligt: de
  bestelling staat op 21%. Na je akkoord zegt de mail "beantwoord, dan controleren we opnieuw en wordt de btw
  verlegd", maar /admin heeft geen knop om te verleggen (alleen goedkeuren, btw rekenen, afwijzen). *Advies:* een
  knop "Opnieuw bij VIES" in de btw-lijst die VIES opnieuw raadpleegt en bij een geldig nummer naar 0% gaat; tot
  die er is, de zin in de mail weghalen. Beide veranderen iets wat de klant leest, dus jij kiest.
- **F6 · Een tweede €1-proef na de betaling** wordt alleen aan de betaler (IBAN of kaart) herkend. Twee proeven
  die allebei vóór de eerste betaling geplaatst zijn, met een andere betaalmethode betaald, komen er allebei
  door. *Advies:* in de proeftak van de webhook ook e-mail, telefoon en KVK tegen andere betaalde proeven
  leggen, met hetzelfde terugstorten. Kosten: één proef van € 1 te veel; bouwen in een rustige week.
- **F7 · Voorrang "niet als de agenda vol zit"** is niet gebouwd: de noot in `pricing.js` zegt het en
  `VOORRANG_COPY.busy` wordt nergens gebruikt. *Advies:* de noot en §3.2 aanpassen (geen grens op drukte) tot je
  echt drukte hebt; dan bouwen met de agenda.
- **F8 · Twee betalingen in dezelfde seconde** op één bestelling worden geen van beide als dubbel herkend (beide
  zien "onbetaald"). Zeldzaam. *Advies:* later, bij `meta.changes === 0` dezelfde weg als "dubbel".
- **Kleinere twijfels:** een live betaling op een bestelling uit de testmodus krijgt een PROEF-nummer (advies:
  `/api/order-pay` weigert die zodra de sleutel live is; "Klaar voor live" op /admin/diagnose vangt het nu);
  geen creditnota als de factuur bij de terugbetaling nog op `pending` stond, en een mislukte INSERT na
  `nextNumber` laat een gat in de reeks (advies: een inhaalslag in de cron); stap 5 rekent bij een netto op ,50
  één cent anders dan de server (alleen met een looktoeslag in oneven centen); e-Boekhouden boekt het tegoeddeel
  en een terugbetaling zonder creditnota niet (vraag voor de boekhouder); tegoed "24 maanden geldig" wordt niet
  afgedwongen (in het voordeel van de klant); een terugbetaalde termijn heeft geen creditnota-route (§4.3 belooft
  er één); de afwijsmail zegt ook tegen een consument "laat weten dat je geen btw-nummer hebt"; een mislukte
  incasso mailt bij elke herhaalde melding van Mollie opnieuw; een vooruitbetaald jaar kan op pauze (dan rekt het
  jaar op; staat nergens); twee proeven van dezelfde betaler die tegelijk betaald worden annuleren elkaar.

### De tabel

| Geldstroom | Getoetst door | Gevonden | Gedaan |
|---|---|---|---|
| Losse bestelling: NL 21%, EU verlegd, buiten de EU; voorrang, 4K, hoeken, complete look, eigen look | vat, vat-gate, btw-verlegd-vinkje, order-api, geldroute, bedragen, vanaf-bedragen, invoice-pdf | de server rekent alles opnieuw; bedragen kloppen. Voorrang "bij drukte" niet gebouwd (F7); 1 cent bij netto ,50 | open punten |
| VIES twijfelt of onbereikbaar → akkoord → betaallink → 7 dagen | vat-gate, nachtgrenzen, betaalherinnering, nazicht, ronde9 | termijn gelijk in cron en mail; verleggen na een storing kan niet (F5) | open punt |
| Consument | business-only | naar de btw-lijst, de afwijsmail past niet helemaal | open punt |
| €1-proef | sample-payer, sample-invoice, proef-dicht, proef-schaarste, proef-afgerond, doorloop-27b | € 1,21 en proef dicht kloppen; na de betaling alleen herkend aan de betaler (F6) | open punt |
| Abonnement: eerste betaling, maandincasso | subscribe, subscription, abo-btw, abo-keten, abonnement-credits, **geld-69** | de maand van een vervolgtermijn (F3) | gerepareerd |
| Mislukte incasso | abo-incasso, abo-qa-52 | pauze met reden klopt; mails opnieuw bij herhaalde melding | open (klein) |
| Terugboeking en "Weer laten lopen" | terugboeking, abo-qa-52 | klopt | — |
| Terugbetaalde termijn | abo-restitutie | credits vervallen; geen creditnota-route | open punt |
| 12 maanden vooruit | abo-vooruitbetaald, **geld-69** | de factuurregel noemde één maand (F4); pauze kan | gerepareerd / open |
| Spaarplafond, mail 7 dagen vooraf | spaarplafond (+browser), creditherinnering, credit-vervalzin | klopt | — |
| Bijkopen 10/25/50, hoogstens 100 per maand | bijkopen, bijkopen-stap5-browser, **beveiliging-69** | de maandgrens was "eerst kijken, dan schrijven" (K4) | gerepareerd |
| Overstappen en terugdraaien | overstap, subscribe | klopt | — |
| Pauze en opzeggen | abonnementspagina, abo-qa-51, doorloop | klopt | — |
| Plafond van 1.200 credits | plans, abonnement-zonder-week | telling klopt; gelijktijdig afsluiten is "eerst kijken" (laag) | open (klein) |
| Bestellen met credits | creditboek, credits-bestellen, credits-admin, credits-stap5/keten-browser | bijgekocht eerst, dan oudste datum; atomair; nooit gemengd | — |
| Annuleren (terug, tegoed, niets), tegoed besteden | admin, toegang-na-annulering, tegoed, tegoed-verrekening, credit-note, **account-pay** | "Nu betalen" negeerde het tegoed (F2) | gerepareerd |
| Deelrestitutie uit het Mollie-dashboard | credit-note, **geldroute** | klopt, behalve na een dubbele betaling (F1) | gerepareerd |
| Facturen: VIS, PROEF, creditnota's | invoice-issue, credit-note, proefmerk, account-invoices | één teller; PROEF bij een live betaling op een testbestelling; gat na een mislukte INSERT | open punten |
| e-Boekhouden (staat uit) | eboekhouden | btw-codes en tekens kloppen; tegoed en terugbetaling zonder nota niet geboekt | vraag boekhouder |

## C · Beveiliging van wat er sinds 8 oktober bij kwam

Nagelopen per eindpunt en adminhandeling: Studio (alle nieuwe routes: bijkopen, overstap, pauze, opzeggen,
bespreken, formaten, maandset, kopiëren, ingelogd bestellen), de privélink, de publieke eindpunten (`btw`,
`proef-check`, `proef-wachtlijst`, `upload`, `order`, `plan`, `order-status`, `order-pay`, `plan-plek`,
`botcheck`, `land`, `proef-stand`), de webhooks van Mollie en Resend, alle nieuwe adminhandelingen
(abonnees, proef en wachtlijst, formaten, melding, abo-plafond, boekhouding, credits bijstellen, weer openen,
restant) en de cron. Overal: sessie of adminpoort, Origin-controle op POST, eigendom per rij in de WHERE,
bedragen en aantallen op de server opnieuw berekend, snelheidsgrenzen. De Mollie-webhook haalt elke betaling
opnieuw op bij Mollie en verwerkt hem één keer (UNIQUE-sleutels); Resend controleert de handtekening en het
tijdvenster. Geen sleutels in logs; e-Boekhouden zet het token alleen in de body van `/v1/session`.

**Gerepareerd, met `tests/beveiliging-69.test.mjs` (nieuw, `npm run test:beveiliging69`):**
- **K1 · Privélinks en een inlogknop in de kopie voor de administratie.** De factuurmail ging als bcc naar
  `INVOICE_BCC`, mét de knop naar de privélink; de welkomstmail van een abonnement mét de inlogknop (twee dagen
  geldig). Wie die postbus leest (straks een boekhouder) kon in elke bestelling en in het Studio van elke nieuwe
  abonnee. Nu een eigen bericht aan `INVOICE_BCC`: dezelfde factuur en tekst, zonder link.
- **K2 · De TOTP-code op /admin/security was onbeperkt te raden.** Met een overgenomen sessie was de code in
  een paar uur te raden, en daarna de tweede stap uit te zetten of eigen herstelcodes te maken. Nu dezelfde twee
  emmers als /admin/code (per IP en per account, 10 per kwartier), met een 429.
- **K3 · De inlogcode in het logboek.** Mislukte een verzending (bijv. Resend 429), dan stond het onderwerp
  "482913 is je inlogcode" in de Workers Logs, en de code bleef 10 minuten geldig. Nu `••••••`.
- **K4 · Meer dan 100 bijgekochte credits per maand.** Drie aankopen van 50 tegelijk lazen allemaal "ruimte
  100" en schreven alle drie. Nu draagt de INSERT de grens in zijn WHERE (zoals `verbruikBoeken`): de derde
  krijgt "te veel".
- `test:scheiding` (klant tegen klant) bleef groen (144); de naloop vond geen weg naar andermans bestelling,
  abonnement of factuur. Twee routes zonder toets in `test:scheiding` (de bijkoop op `/account/plan?bijkoop=` en
  de maandset onder `/account/set/`) zijn wel goed afgeschermd in de code. **Naloop, 5 november:** nu getoetst
  (blok 6 en 7, 144 → 161 controles); zie `kladblok/NALOOP-69-73.md`.

**Twijfels (geen bewezen gat), met advies:**
- **De tweede stap is optioneel** in /admin. Staat hij live niet aan, dan is /admin alleen een wachtwoord, en kan
  iemand met een overgenomen sessie een eigen authenticator koppelen. *Advies:* aanzetten (/admin/security) en
  daarna verplicht maken. Kijk op /admin/security of hij aan staat.
- `/api/proef-check` zegt of een e-mail, telefoon of KVK al een proef had (8 per 10 minuten per IP): een kleine
  privacylek. De wachtlijst heeft geen dubbele bevestiging. Turnstile controleert `hostname` en `action` uit het
  antwoord niet. `/account/plan/return?sub=` zonder sessie zegt of een abonnement loopt. Elke factuurmail maakt
  een nieuwe privélink zonder de vorige in te trekken. Een terugboeking die twee keer tegelijk binnenkomt, kan
  twee meldingen geven. Na een mislukte verzending blijft de inlogcode geldig (advies: dan intrekken).

**npm audit:** 6 × high, 0 × critical, alles volgens npm op te lossen zonder `--force` en binnen de ranges in
`package.json`. Alleen `zod` draait in productie (via Astro; de site gebruikt zod en actions niet); de rest
(undici, sharp, miniflare, wrangler, @cloudflare/vite-plugin) alleen bij bouwen en lokaal draaien.
**Gedaan:** `npm audit fix` zonder `--force`. Alleen `package-lock.json` veranderde, binnen de ranges van
`package.json`: wrangler 4.148 → 4.156, miniflare 5.20261006 → 5.20261101, workerd 1.20261006 → 1.20261101,
@cloudflare/vite-plugin 1.63 → 1.67, zod 4.6.5 → 4.6.7, undici 7 → 8 (alleen binnen miniflare), de oude geneste
sharp eruit. Daarna `npm audit`: **0 kwetsbaarheden**, en de hele reeks groen. **Jij:** omdat het lockbestand
veranderd is, vraagt UITROLLEN.bat je eerst NA-UPDATE-INSTALLEREN.bat te draaien; doe dat, dan uitrollen.

## D · Wankele toetsen (vraag 3 = ja)

- **De twee stops uit de opdracht** hadden allebei een vaste oorzaak die al hersteld was: `test:doorloop27b`
  op 15 oktober was het Windows-pad (`E:\E:\…`, levering 48b) en `test:mailsmerk-browser` op 17 oktober de
  headless shell die de donkere stand van Gmail niet kan nadoen (levering 55). Geen van beide wacht op een vaste
  tijd. `mails-merk-browser` wacht nu wel op een voorwaarde (het woordmerk gedecodeerd en twee keer getekend)
  voordat hij meet, zodat drukte de meting niet kan voor zijn. Aan `doorloop-27b` is niets veranderd.
- **`test:beweging83`** (grijs naar inkt op de voorpagina) wachtte na het scrollen een vaste 450 ms en viel in deze
  sessie onder drukte om. Hij wacht nu tot de woorden de stand hebben die bij de scrollpositie hoort en de
  kleurovergang klaar is. Zet het script niets, dan verloopt die wacht en valt hij nog steeds om.
- **De uitrol** draaide een rode toets al één keer los na (via `scripts/testreeks.mjs`), maar alleen als de
  reeks meerdere tegelijk draaide. Nu geeft `scripts/uitrol.mjs` `--nog-eens` mee, zodat het ook bij één
  tegelijk gebeurt, en meldt hij aan het eind "Let op: … faalde eerst en slaagde los". Toets:
  `tests/testreeks.test.mjs` (beide standen) en `tests/uitrol.test.mjs`.
- **`test:backupterugzet`** was hier rood: `scripts/TERUGZETTEN.txt` hoort CRLF te hebben (Kladblok), maar dat
  kwam alleen doordat git op Windows het omzet. `.gitattributes` zet hem nu vast op CRLF, zoals de .bat-bestanden.
- **De browsertoetsen in deze werkomgeving:** Playwright in het project zoekt Chromium 1234, hier staat 1243.
  Gedraaid met `PLAYWRIGHT_BROWSERS_PATH` naar een map met verwijzingen. Bij jou verandert er niets.

## Nagekeken

- **De nulmeting** (het begin van deze sessie, `main` op b2808ee): 279 stappen, alles groen op de werkomgeving
  na (zie §D: de browserversie en de CRLF van TERUGZETTEN.txt).
- **De testreeks na 69:** `TESTREEKS_TEGELIJK=4 node scripts/testreeks.mjs`, **281 van 281 groen** (9 min 2 s).
  Zes toetsen faalden eerst en slaagden los: dat kwam doordat ik tijdens de reeks een nieuw bestand in `src/` zette
  (de toetsen die `dist/` lezen, vonden de build daardoor "ouder dan de bron"). Het bestand is eruit gehaald; los
  waren ze groen. Een eerdere reeks vond nog vier echte dingen, die zijn gerepareerd: `test:legal` en
  `test:mailsmerk` zochten naar de weggehaalde wachtrij en `notifyRevision`, `test:sjabloon` telde op /privacy één
  gedachtestreepje meer (de rij van e-Boekhouden), en `test:beweging83` wachtte een vaste 450 ms (nu op een
  voorwaarde, §D).
- **Nieuw:** `tests/beveiliging-69.test.mjs` (24) en `tests/geld-69.test.mjs` (8), allebei in de keten. F1, F3,
  K4 en de tegoedfout van F2 zijn ook tegen de oude code gedraaid: daar zijn ze rood.
- **`npm run visueel`:** de referentie in `visual/referentie.json` is van vóór levering 74 (hij kent `/portal` en
  `/start/complete` nog); tegen die referentie meet hij 1064 verschillen die niets met 69 te maken hebben. Ik heb de
  referentie niet bijgezet. Wel gekeken, op 1440 en 390, NL en EN: de zin bij de abonnementen op /pricing ("credits
  voor catalog en lifestyle") staat netjes in zijn vlak. De kaartzin van de eigen cataloglook staat op dit moment op
  geen gebouwde pagina; de zin op de bedankpagina staat verborgen tot het script hem toont. Voor levering 72 maak ik
  een verse referentie van `main`.
- **Contrast en maten:** niets nieuws op het scherm buiten tekst in bestaande vlakken; geen nieuwe kleur.

## Mag weg

Niets. (Het wissen van `plan_queue` door de AVG-knop blijft bewust tot de migratie.)

## Voor het overzicht

- **§15:** levering 69 (5 nov, cloudsessie): betaallink opnieuw met een eigen mail; credits alleen catalog en
  lifestyle in mails, tips, /pricing en de bedankpagina; status `credits`; "vanaf het gewone tarief"; noot
  voorrang; `notifyRevision` weg; e-Boekhouden in de ontvangers (lijst 5 nov, token pas na 19 nov); de resten
  van het weeksysteem uit de code (tabel en kolom staan nog); geldfouten F1–F4 en beveiliging K1–K4 gerepareerd;
  de uitrol herhaalt een rode toets ook bij één tegelijk.
- **§16.1 punt 4 (e-Boekhouden):** het token op zijn vroegst 19 november (meldtermijn); de partij staat in de lijst.
- **§16.2:** nieuw: F5 (verleggen na een VIES-storing), F6 (tweede proef), F7 (voorrang bij drukte), F8 (twee
  betalingen tegelijk), de tweede stap van /admin verplicht maken, de kleinere twijfels uit §B en §C.
- **§16.3 punt 6:** de dode abonnementscode is weg; alleen de migratie (plan in levering 73) en het wissen in de
  AVG-knop zijn nog over. **Punt 7:** de credits-voor-video-zinnen en "tegen het gewone tarief" zijn gedaan.
- **§17:** punt 2, 3, 4, 6, 8, 16, 17 en 25 opgelost; punt 14 grotendeels (tabel, kolom en het AVG-wissen staan
  nog); punt 15: geen scherm toont de oude regel meer, de rekensom in `plans.js` gaat mee met de migratie.
  Nieuw in §17.1: F5, F6, F7, F8.

## Bestanden

- **Geld en mail:** `src/lib/betaallink.js`, `src/lib/invoiceMail.js`, `src/lib/invoice.js`, `src/lib/mail.js`,
  `src/lib/bijkopen.js`, `src/lib/account.js`, `src/lib/admin.js`, `functions/api/webhook/mollie.js`,
  `src/lib/notify.js`, `src/lib/portal.js`.
- **Abonnement en opruimen:** `src/lib/subscription.js`, `src/lib/retention.js`, `cron/index.js`, `src/data/plans.js`.
- **Data:** `src/data/status.js`, `src/data/pricing.js`, `src/data/catalogStyles.js`, `src/data/catalogStyles.nl.js`,
  `src/data/subverwerkers.js`, `src/data/juridischeDatums.js`.
- **Pagina's:** `src/components/PricingHal.astro`, `src/components/ThankYouPage.astro`.
- **Scripts:** `scripts/testreeks.mjs`, `scripts/uitrol.mjs`, `scripts/backup.mjs`.
- **Instellingen:** `.gitattributes`, `package.json` (twee toetsen in de keten), `package-lock.json` (npm audit fix).
- **Documenten:** `docs/AVG-VERWERKINGSREGISTER.md`, `docs/KLEURENSCHEMA.md`, `kladblok/LIVE-STAPPEN.md`.
- **Toetsen, nieuw:** `tests/beveiliging-69.test.mjs`, `tests/geld-69.test.mjs`.
- **Toetsen, bijgewerkt (de reden staat in de toets):** `tests/klantmails-a2.test.mjs`, `tests/creditherinnering.test.mjs`,
  `tests/doorloop.test.mjs`, `tests/account-pay.test.mjs`, `tests/geldroute.test.mjs`, `tests/subverwerkers.test.mjs`,
  `tests/juridische-datums.test.mjs`, `tests/testreeks.test.mjs`, `tests/mails-merk-browser.test.mjs`,
  `tests/beweging-83.test.mjs`, `tests/legal.test.mjs`, `tests/minder-sjabloon-browser.test.mjs`,
  `tests/abo-keten.test.mjs`, `tests/abo-misbruik.test.mjs`, `tests/slots.test.mjs`, `tests/subscription.test.mjs`,
  `tests/retention.test.mjs`, `tests/lib/alle-mails.mjs`, `tests/lib/d1sqlite.mjs` (alleen een noot).
- **Kladblok:** `kladblok/LEVERING-69.md` (dit bestand), `kladblok/TEKSTEN-69.md`, `kladblok/COMMIT-BERICHT.txt`.
