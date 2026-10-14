# Live zetten — de stappen in volgorde

*8 oktober 2026 · punten 9.03, 9.04, 9.05 en 8.01. Geen commando's: alles is een
dubbelklik of een klik in een dashboard. Claude zet nooit een sleutel en rolt nooit
iets uit; dat doe jij.*

Werk ze af van boven naar beneden. Elke stap zegt **zo zie je dat het gelukt is**.
Bijna alles kun je ook nakijken op **/admin/diagnose**: daar staan de blokken
"Klaar voor live", "Nachtwerk, wissen en mail" en "De gratis grenzen", met per
regel *klaar*, *te doen* of *wacht*.

| # | Wat | Hoeveel tijd |
|---|---|---|
| 1 | Een oud geheim weghalen (alleen als het er staat) | 2 min |
| 2 | Uitrollen | 5 min |
| 3 | Back-up instellen en op proef terugzetten | 15 min |
| 4 | Het eerste nachtrapport lezen | de ochtend erna, 5 min |
| 5 | Het wissen aanzetten | 5 min + een nacht |
| 6 | De Resend-webhook en zijn geheim | 10 min |
| 6c | Web Analytics na toestemming (als je tellingen wilt) | 5 min |
| 7 | De controle met bounced@resend.dev | 5 min |
| 8 | De drukteproef | ±1 uur, samen met Claude |
| 9 | Live: Workers Paid, opruimen, betaalmethoden, live-sleutel, rookproef | 30 min + een nacht |

---

## 1 · Een oud geheim weghalen (vóór de eerste uitrol)

De rem op het wissen (`PURGE_ENABLED`) staat nu in `cron/wrangler.toml`, zodat je in
git ziet of hij aan staat. Stond hij vroeger als *geheim* op de nachtelijke taak, dan
botsen die twee en weigert de uitrol.

1. Cloudflare-dashboard → **Workers & Pages**.
2. Staat **visuails-cron** er niet in? Dan ben je klaar met deze stap.
3. Staat hij er wel: klik erop → **Settings** → **Variables and Secrets**.
4. Staat daar `PURGE_ENABLED` met type **Secret**: klik op het prullenbakje en bevestig.

**Zo zie je dat het gelukt is:** onder Variables and Secrets staat geen `PURGE_ENABLED`
als Secret meer (de andere geheimen, zoals `RESEND_API_KEY`, blijven staan).

## 2 · Uitrollen

Drie dubbelklikken, in deze volgorde:

1. **OPRUIMEN.bat** — zet de oude naslag en meetscripts op hun nieuwe plek
   (docs\, scripts\meten\) en de rest in `_opruimen\<datum>\`. Zolang er nog iets
   op de oude plek staat dat weg *moet*, weigert de uitrol.
2. **NA-UPDATE-INSTALLEREN.bat** — installeert Astro 7 en de rest uit
   package-lock.json. Eén keer na deze levering; de uitrol controleert het.
3. **UITROLLEN.bat** — test, commit, pusht, zet nieuwe migraties op live (deze keer
   0054, 0055, 0056, 0058, 0060, 0061, 0063, 0065, 0066 en 0067), en zet de site én de nachtelijke taak live.

**Zo zie je dat het gelukt is:** het eindscherm is groen ("LIVE EN NAGEKEKEN"). Op
/admin/diagnose staat bovenaan "site: test · cron: nog niet gemeld" — dat klopt: de
nachtelijke taak meldt zich pas na zijn eerste nacht (05:10 Nederlandse tijd).

## 3 · Back-up instellen, en op proef terugzetten

De back-up gaat voortaan naar Google Drive, **zonder** je wachtwoord, tweestapscode,
herstelcodes, sessies en inlogcodes, en **mét** de map
`C:\Users\Gebruiker\VISUAILS\Prompts`.

1. Kijk of Google Drive voor desktop aan staat (het Drive-icoon rechtsonder in de
   taakbalk; in de Verkenner staat dan **Mijn Drive**, meestal als schijf G:).
2. Dubbelklik **BACKUP.bat** in de projectmap → kies **1**.
   - Het stelt een map voor, zoals `G:\Mijn Drive\VISUAILS back-ups`. Enter = goed.
   - Het zet de wekelijkse taak in de Taakplanner (zondag 13:00, en hij haalt een
     gemiste zondag in zodra je pc aan staat).
   - Het maakt meteen de eerste back-up.
3. Dubbelklik **BACKUP.bat** nog een keer → kies **3** (de proef). Dat zet de nieuwste
   back-up terug in een lege database op je pc en vergelijkt de aantallen. Er
   verandert niets live.
4. Gooi daarna de **oude** back-ups weg die nog in `backups\` in de projectmap staan
   (de bestanden die met `2026-` beginnen). Daar zitten je wachtwoordhash en
   tweestapsgeheim nog wél in, op een onversleutelde schijf. Laat de map `_log` en
   `BESTEMMING.txt` staan. Leeg daarna de Prullenbak.

**Zo zie je dat het gelukt is:**
- In Drive staat de map *VISUAILS back-ups* met een `…-d1.sql`, een `…-controle.json`,
  een map `…-prompts` en `LEESMIJ-TERUGZETTEN.txt`.
- Op /admin staat bovenaan de chip **"Back-up ok · (datum) · gecontroleerd, .. tabellen"**.
  Is hij oranje ("staat alleen lokaal" of "niet in orde"), wijs dan met je muis op de
  chip: daar staat waarom.
- De proef eindigt met **"TERUGZETTEN WERKT"**.

Hoe je in een noodgeval terugzet: `LEESMIJ-TERUGZETTEN.txt` naast de back-ups (en
`scripts\TERUGZETTEN.txt` in de projectmap). Kort: eerst Time Travel van Cloudflare
(7 dagen terug op het gratis plan), dan pas deze back-up — en altijd met Claude erbij.

## 4 · Het eerste nachtrapport lezen

De ochtend na stap 2 komt er een mail **"Nachtelijke taken"** in hello@. Het wissen
staat nog in *verslagmodus*: het noemt wat het **zou** wissen, en wist niets.

**Zo zie je dat het gelukt is:** in de regel "VERSLAGMODUS: …" staan alleen
proefbestellingen (geen echte klant). Op /admin/diagnose, blok "Nachtwerk, wissen en
mail", staat bij *De nachtelijke taak* **klaar** met de tijd van vannacht.
Twijfel je over een bestelling in die lijst? Stuur de mail door naar Claude vóór stap 5.

## 5 · Het wissen aanzetten

Alleen na stap 3 (een gecontroleerde back-up) en stap 4 (verslag gelezen). R2 heeft
geen prullenbak: wat de taak wist, is weg.

1. Zeg tegen Claude: *"back-up staat, verslag gelezen, zet het wissen aan"*. Claude
   zet in `cron/wrangler.toml` de regel `PURGE_ENABLED = "false"` op `"true"`.
   (Zelf kan ook: open het bestand in Kladblok, maak van `"false"` `"true"`, opslaan.)
2. Dubbelklik **UITROLLEN.bat**.

**Zo zie je dat het gelukt is:** op /admin/diagnose staat bij *Wissen na de
bewaartermijn* **klaar** ("Aan") — de nachtelijke taak meldt dat na de eerstvolgende
nacht. Het nachtrapport zegt daarna "… verlopen bestanden verwijderd" in plaats van
"VERSLAGMODUS". Op het gratis plan doet hij er hoogstens een paar dozijn per nacht;
staat er meer klaar, dan staat er "morgen gaat de rest". Dat is goed.

*De mail aan de klant vóór het wissen (O56) hoeft hier niet op te wachten: je koos dat
die er uiterlijk twee maanden na de eerste echte levering moet zijn (punt 7.09, later).*

## 6 · De Resend-webhook en zijn geheim

Zonder dit merkt alleen de klant dat zijn betaallink of levermail nooit aankwam.

**In Resend:**
1. Ga naar **resend.com/webhooks** → **Add Webhook**.
2. Endpoint URL: `https://visuails.com/api/webhook/resend`
3. Vink twee gebeurtenissen aan: **email.bounced** en **email.complained**. Niets anders.
4. Opslaan. Open daarna de webhook die je net maakte: daar staat het **Signing Secret**
   (begint met `whsec_`). Klik om het te tonen en kopieer het.

**In Cloudflare:**
5. **Workers & Pages** → **visuails-site** → **Settings** → **Variables and Secrets** →
   **Add**.
6. Type: **Secret**. Naam: `RESEND_WEBHOOK_SECRET`. Waarde: plak het `whsec_…`-geheim.
   Plak met de muis of Ctrl+V in de browser — niet in een zwart venster.
7. **Deploy**.

**Zo zie je dat het gelukt is:** op /admin/diagnose staat bij *Resend-webhook*
**klaar**, en onderaan bij *De secrets* staat `RESEND_WEBHOOK_SECRET` op **gezet**.
(Resend staat op het gratis plan één webhook toe; dit is hem.)

## 6b · De botcheck (Turnstile) aanzetten

Zonder deze twee sleutels staat de botcheck uit en werkt alles gewoon, alleen zonder bescherming tegen bots.

**In Cloudflare:**
1. Links in het menu: **Turnstile** → **Add widget**.
2. Naam: `visuails`. Hostnames: `visuails.com` en `www.visuails.com`.
3. Widget mode: **Invisible**. Opslaan.
4. Je ziet nu een **Site Key** en een **Secret Key**. Laat dit scherm open.
5. **Workers & Pages** → **visuails-site** → **Settings** → **Variables and Secrets** → **Add**.
6. Type: **Text**. Naam: `TURNSTILE_SITE_KEY`. Waarde: de Site Key.
7. Nog een keer **Add**. Type: **Secret**. Naam: `TURNSTILE_SECRET_KEY`. Waarde: de Secret Key.
8. **Deploy**.

**Zo zie je dat het gelukt is:** op /admin/diagnose staan onderaan bij *De secrets* beide sleutels op **gezet**.

## 6c · Web Analytics, alleen na toestemming (als je tellingen wilt)

Cloudflare zet de teller niet meer vanzelf in de pagina's ("automatic setup" gaat uit).
De site zet hem dan zelf, en alleen bij een bezoeker die in de cookiemelding
**Analytics accepteren** kiest. Daarvoor heeft de site de openbare sitesleutel nodig.
Wil je geen tellingen, sla deze stap dan over.

1. Open in de projectmap het bestand `.env` in Kladblok. Staat het er niet: nieuw
   bestand in Kladblok → **Bestand → Opslaan als** → bij *Opslaan als type* **Alle
   bestanden** → naam `.env`.
2. Zet er deze regel in en sla op:
   `PUBLIC_CF_ANALYTICS_TOKEN=313a5e2e507840b8a99086181052cde1`
   Dat is de openbare sitesleutel van visuails.com in Web Analytics, geen geheim: hij
   staat straks in de broncode van elke pagina. `.env` gaat niet mee naar GitHub.
3. Dubbelklik **UITROLLEN.bat**.

**Zo zie je dat het gelukt is:** open visuails.com in een privévenster en kies
**Analytics accepteren**; de dag erna staan er bij Cloudflare → **Web Analytics** →
visuails.com bezoeken. Kies je **Alleen het noodzakelijke**, dan wordt er niets geteld.

## 7 · De controle met bounced@resend.dev

1. Ga naar visuails.com, scroll naar de voet en meld bij de Studiobrief het adres
   **bounced@resend.dev** aan. Dat is een testadres van Resend dat altijd weigert.
2. Wacht een minuut en ververs /admin/diagnose.
3. Haal het testadres daarna weg in Resend: **Contacts** (of **Audience**) → bounced@resend.dev
   → verwijderen. (Het telt als één mail van je dagquotum.)

**Zo zie je dat het gelukt is:** in het blok "Nachtwerk, wissen en mail" staat bij
*Melding van Resend* **klaar**, met de tijd en "bounce · bounced@resend.dev".
Blijft het leeg: kijk in Resend → Webhooks → je webhook → de laatste pogingen. Een 401
betekent dat het geheim in stap 6 niet klopt; plak het opnieuw.

## 8 · De drukteproef (±1 uur, samen met Claude, Mollie nog op test)

Workers en Resend staan allebei op het **gratis** plan (je koos V3 = a). De proef meet
met één echte, zware bestelling waar de grenzen zitten — vóór de eerste grote klant dat
doet. Doe hem **vóór stap 9**: Mollie moet nog op de testsleutel staan.

**Voorbereiden (5 min):**
1. Dubbelklik `kladblok\drukteproef-beelden.bat`. Dat maakt in `kladblok\drukteproef\`
   60 nep-telefoonfoto's (±8 MB elk) en 60 beelden in 4K voor de levering. Grijze ruis,
   geen personen. Ze gaan niet mee naar GitHub.
2. Open /admin/diagnose en noteer bij *De gratis grenzen* het mailgebruik van vandaag.
3. Open in Cloudflare **Workers & Pages → visuails-site → Logs** (laat dat tabblad open).

**De proef — schrijf per regel "houdt" of "breekt bij …":**

| Grens | Wat je doet | Waar je kijkt | Gratis grens |
|---|---|---|---|
| Uploaden | Bestelformulier, 20 producten lifestyle, per product 3 foto's uit `drukteproef\klant` | Komen alle 60 vakken op "klaar"? Een melding over te veel uploads? | 40 uploads per minuut en 400 per dag per internetaansluiting (o05); 25 MB per bestand; 100 MB per verzoek |
| Bestelknop | "Bestellen en betalen" (Mollie test) | Duurt het lang? Foutpagina? Logs: "Exceeded CPU" of "Too many API requests" | 10 ms rekentijd en 50 databaseverzoeken per verzoek |
| Studiomail | De mail "Nieuwe bestelling" in hello@ | Komt hij aan, met per product één regel en "wat ontbreekt"? (Foto's zitten er sinds 9.07 nooit meer bij.) | geen bijlagen meer |
| Levering in /admin | De 60 beelden uit `drukteproef\levering` in één keer in de bestelling zetten | Lukt het in één keer, of moet het in stukken? | 100 MB per verzoek, 128 MB geheugen |
| Zip | Als klant in Studio "Download alles" | Komt de zip helemaal binnen? | 128 MB geheugen, 10 ms rekentijd |
| Levermail | De bestelling op geleverd zetten | Komt de levermail aan? | Resend: 100 mails per dag |
| De nacht erna | Niets; de volgende ochtend /admin/diagnose, en Cloudflare → Workers & Pages → **visuails-cron** → Metrics | *De gratis grenzen* → nachtelijke taak: "database .. van 50"; in Metrics: fouten en CPU-tijd van vannacht | 50 databaseverzoeken en 50 verzoeken naar buiten per nacht; 10 ms rekentijd |
| Je telefoon | Open het formulier **vanuit de Instagram-app** (link in je bio of een DM aan jezelf), kies een **HEIC-foto** uit je galerij, ga door tot Mollie | Kun je de foto kiezen? Komt hij aan? Kom je bij Mollie? | — |
| Mail die dag | Na afloop opnieuw /admin/diagnose | Hoeveel mails kostte één bestelling? | 100 per dag, 3.000 per maand |

Test je die dag vaker vanaf hetzelfde wifi, dan kom je zelf aan de daggrens van 400
foto's: dat is dan een uitkomst van de proef, geen fout van jou.

**Afronden:** zeg tegen Claude welke regels "breekt bij …" zijn. Alleen als de upload
iets laat zien, komt er een reparatie (1.03: een paar uploads tegelijk, vanzelf
opnieuw proberen, per vak "Bezig / Klaar / Mislukt — opnieuw"). De proefbestelling
ruim je op in stap 9a.

**Zo zie je dat het gelukt is:** een lijstje van negen regels met "houdt" of "breekt
bij …", en in hello@ de mails van de proef.

**Vooraf al bekend, en waarom dit de moeite is:** het gratis plan geeft per verzoek
10 ms rekentijd en 50 databaseverzoeken. Een zip van 60 beelden en een bestelknop die
foto's aan een mail hangt, zijn de eerste kandidaten om daar tegenaan te lopen. Breekt
er iets, dan is Workers Paid ($5 per maand) de eenvoudigste oplossing: 30 seconden
rekentijd en 1.000 databaseverzoeken per verzoek. Vraag het Claude; dan wordt ook
`WORKERS_PLAN` in `cron/wrangler.toml` "betaald".

## 9 · Live (in deze volgorde)

Alles hieronder staat ook als blok **"Klaar voor live"** bovenaan /admin/diagnose; daar
kleurt elke regel vanzelf (behalve *Vooraf*).

**Vooraf · Cloudflare Workers Paid ($5 per maand) — vóór de lancering.**
- Cloudflare → **Workers & Pages** → **Plans** → Workers Paid. Jouw keuze in afvinklijst 3 (w1).
- Zeg het daarna tegen Claude: dan wordt `WORKERS_PLAN` in `cron/wrangler.toml`
  "betaald" en rekent het nachtwerk met de ruimere grenzen. Daarna **UITROLLEN.bat**.
- **Zo zie je dat het gelukt is:** onder Plans staat Workers Paid als je huidige plan.

**Vooraf · De vaste modellen door de gezichtszoekers halen — vóór de lancering.**
- Per vast model de bronfoto door de drie gezichtszoekers (staat in `src/data/modelChecks.js`)
  en de uitslag daar invullen. Zeg het tegen Claude als het af is.
- Waarom: §5 van de voorwaarden en /ai-act noemen "ook onze vaste modellen" pas als dat
  logboek gevuld is. Zolang het leeg is, staat die zin er gewoon niet.

**9a · Proefwerk opruimen — terwijl de testsleutel er nog op staat.**
- *Proefabonnementen:* op /admin/diagnose staat een link per proefabonnement. Klik →
  **Inloglink** → in Studio bij **Facturering** het abonnement opzeggen.
- *Open proefbestellingen:* klik op /admin/diagnose op **"Annuleer de .. open
  proefbestellingen"**. Er gaat geen mail uit en er wordt niets betaald.
- **Zo zie je dat het gelukt is:** stap 1 in het blok staat twee keer op **klaar**.

**9b · In Mollie de betaalmethoden aanzetten — op Live.**
- Mollie-dashboard, schakelaar op **Live** → **Betaalmethoden**: zet aan **iDEAL**,
  **Kaart**, **Bancontact**, **PayPal** en **SEPA-incasso** (die laatste is nodig voor
  de maandtermijnen van een abonnement). **Overboeking** ook, voor een jaar vooruit.
- **Zo zie je dat het gelukt is:** dat kan pas na 9c; dan staat elke methode in stap 2
  van het blok op **klaar**.

**9c · De live-sleutel op beide Workers.**
- Mollie-dashboard (Live) → **Ontwikkelaars** → **API-sleutels** → kopieer de sleutel
  die met `live_` begint.
- Cloudflare → **Workers & Pages** → **visuails-site** → **Settings** → **Variables and
  Secrets** → bij `MOLLIE_API_KEY` het potloodje → plak → **Deploy**.
- Precies hetzelfde bij **visuails-cron**.
- **Zo zie je dat het gelukt is:** op /admin/diagnose staat meteen **"site: live"**, en
  de ochtend na de eerstvolgende nacht **"cron: live"**. Daaronder: "Volgende factuur:
  VIS-2026-0001 · PROEF-facturen tellen niet mee".

**9d · De rookproef (je koos V4 = a).**
- Een bevriend bedrijf dat nog nooit een proef deed, bestelt via **Probeer VISUAILS**
  (/test-sample) en betaalt **€1,21** (€1 + btw), echt.
- Daarna open jij die bestelling in /admin en betaalt alles terug.
- **Zo zie je dat het gelukt is:** stap 4 in het blok staat op **klaar**, met
  "factuur VIS-2026-0001" en een creditnota. Daarna krimpt het hele blok tot één
  regel: "Alles staat goed". Dan is de site klaar voor de eerste klant.

---

### De gratis grenzen (nagekeken 8 oktober 2026)

Ze veranderen af en toe; de getallen staan in de code op één plek
(`src/lib/meetlat.js`), met deze bronnen erbij.

| Dienst | Gratis grens | Bron |
|---|---|---|
| Workers | 100.000 verzoeken per dag; 10 ms rekentijd per verzoek én per nachtelijke run; 50 verzoeken naar buiten en 1.000 naar Cloudflare zelf per verzoek; 128 MB geheugen; 100 MB per verzoek; 5 cron-triggers per account | [developers.cloudflare.com/workers/platform/limits](https://developers.cloudflare.com/workers/platform/limits/) (bijgewerkt 5 sep 2026) |
| D1 (database) | 50 databaseverzoeken per verzoek; 5 miljoen rijen lezen en 100.000 schrijven per dag; 500 MB per database; Time Travel 7 dagen terug | [developers.cloudflare.com/d1/platform/limits](https://developers.cloudflare.com/d1/platform/limits/) en [/d1/platform/pricing](https://developers.cloudflare.com/d1/platform/pricing/) (bijgewerkt 21 apr 2026) |
| R2 (bestanden) | 10 GB opslag; 1 miljoen schrijf/lijst-acties en 10 miljoen lees-acties per maand; verwijderen en downloaden gratis | [developers.cloudflare.com/r2/pricing](https://developers.cloudflare.com/r2/pricing/) (bijgewerkt 1 okt 2026) |
| Resend | 100 mails per dag, 3.000 per maand (elke ontvanger telt, ook een bcc); 1 webhook; 1.000 contacten | [resend.com/pricing](https://resend.com/pricing) en [account-quotas-and-limits](https://resend.com/docs/knowledge-base/account-quotas-and-limits) |
