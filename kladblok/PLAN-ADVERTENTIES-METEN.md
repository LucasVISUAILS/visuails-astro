# Plan: advertenties meten, zonder scripts van Meta, TikTok of Google op de site (5 november 2026)

Levering 73, plan 1 van 3. Alleen opgeschreven, niets gebouwd. Je kiest later via een afvinklijst in de chat met de
brug.

## Waarom

In Q4 begin je met advertenties op Meta, TikTok en Google. Dan wil je weten welke advertentie een bestelling
opleverde, en de platforms willen het ook: Meta en TikTok sturen hun advertenties bij op wie er bestelt. Hun eigen
manier is een script op elke pagina (de pixel, de tag). Dat wil je niet: het maakt de site trager (levering 72), het
past niet in de CSP, het vraagt toestemming voor elke bezoeker, en het geeft een derde partij een blik in elke pagina.

## Wat er nu is

- **De site legt bij een bestelling niet vast waar de klant vandaan kwam.** Er wordt geen `utm_*`, `gclid`, `fbclid`
  of `ttclid` gelezen, en er is geen veld "Waar zag je VISUAILS?" in het formulier. Een advertentieklik en een
  bestelling zijn nu niet aan elkaar te koppelen.
- **Cloudflare Web Analytics** staat klaar en laadt alleen na "Analytics accepteren" in de cookiemelding
  (`LIVE-STAPPEN.md` §6c). Het telt bezoeken per pagina en per bron, zonder koppeling aan een bestelling.
- **De cookiemelding** (`src/components/CookieConsent.astro`) kent twee keuzes: het noodzakelijke, en analytics.
- **`Referrer-Policy: strict-origin-when-cross-origin`** (`public/_headers`): wie van Instagram komt, laat alleen het
  domein achter, niet de hele link. De `utm_`-stukjes in de link zelf komen wel binnen.

## Drie opties

### A · Zelf laten zeggen, en tellen zonder koppeling (geen toestemming nodig)

1. In het bestelformulier één keuzelijst, niet verplicht: "Waar zag je VISUAILS?" (Instagram · TikTok · Google ·
   Iemand vertelde het · Anders). Komt in de bestelling en in /admin.
2. De `utm_source` en `utm_campaign` van de **eerste pagina** van een bezoek gaan als een telling per dag in D1
   (bron, campagne, aantal), zonder iets op het toestel van de bezoeker te bewaren en zonder koppeling aan een
   persoon. /admin toont per campagne: bezoeken, en ernaast de bestellingen die bij die bron "Instagram" kozen.
- **Goed:** meteen klaar voor de eerste advertentie; geen toestemming, geen nieuwe ontvanger, niets in de
  privacyverklaring behalve één zin over het veld.
- **Minder:** Meta en TikTok krijgen geen bestellingen terug, dus ze sturen niet bij op wie koopt. Wat de klant zegt
  is niet altijd waar.

### B · Na toestemming: de bestelling server-side terug naar het platform (Conversions API)

1. De cookiemelding krijgt een derde keuze: **"Advertenties meten"**, standaard uit, even groot als de andere.
2. Alleen bij ja: een eigen, eerste-partij-cookie `vis_bron` (30 dagen) met de eerste `utm_*` en de klik-id
   (`fbclid` → `fbc`, `gclid`, `ttclid`) en de datum. Geen script van een platform.
3. Bij **betaald** (de Mollie-webhook) stuurt de Worker de bestelling zelf naar het platform waar de klik vandaan
   kwam: **Meta Conversions API** (Purchase, het bedrag, de munt, de gehashte e-mail en `fbc`), **Google Ads**
   (een offline conversie met de `gclid`), **TikTok Events API** (`ttclid` en de gehashte e-mail). De proef van €1
   als apart, eerder moment ("Lead"): daar komen er veel meer van, en Meta leert pas goed bij zo'n 50 per week.
4. De bron gaat ook in de bestelling (`orders.bron_json`, een migratie), zodat /admin per campagne de omzet toont.
- **Goed:** de platforms leren van echte bestellingen; geen script op de site; alleen wie ja zegt wordt gemeten.
- **Minder:** meer werk, en een deel van de bezoekers zegt nee. Een gehashte e-mail is nog steeds een
  persoonsgegeven: drie nieuwe ontvangers.

### C · De pixels van de platforms

Niet gekozen, en alleen hier om te zeggen waarom niet: drie scripts van derden op elke pagina, trager (een paar
honderd kB en extra verbindingen bij het laden), een CSP die breed open moet, en toestemming die voor alles in één keer
gevraagd wordt. Het is wat de platforms aanraden, en het is precies wat jij niet wilt.

## Advies

**A nu, vóór de eerste advertentie. B voor Meta zodra je vast elke maand op Meta adverteert en de proef in de buurt
van 50 keer per week betaald wordt** (zo veel heeft Meta nodig om bij te sturen; daaronder levert B weinig op);
Google en TikTok in B daarna, als je daar ook adverteert. A blijft daarna staan: het is de
enige meting die ook werkt bij wie nee zegt.

## Wat er per optie verandert aan de cookiemelding, de privacyverklaring en de ontvangers

| | A | B |
|---|---|---|
| Cookiemelding | niets | een derde keuze "Advertenties meten", standaard uit; nee even makkelijk als ja (de eisen van de AP staan al in `CookieConsent.astro`) |
| Cookiebeleid | niets | de cookie `vis_bron`: wat erin staat, 30 dagen, waarvoor |
| Privacyverklaring | één zin over "Waar zag je VISUAILS?" | een alinea over het meten van advertenties: welke gegevens (bedrag, gehashte e-mail, klik-id), naar wie, op welke grond (toestemming), hoe lang, hoe je het intrekt |
| Ontvangers (`src/data/subverwerkers.js`, register §5) | niets | Meta Platforms Ireland Ltd., Google Ireland Ltd. (Google Ads), TikTok Technology Ltd.; bij Meta en TikTok gezamenlijke verantwoordelijkheid voor een deel (hun voorwaarden voor zakelijke tools), met doorgifte buiten de EU (Meta en Google onder het EU-VS-kader, TikTok naar onder meer Singapore). `LIJST_GEWIJZIGD` en de meldtermijn van 14 dagen gelden dan ook hier. |
| Secrets in de Worker | geen | een toegangssleutel per platform (Meta, Google Ads met OAuth, TikTok) |

## Wat jij zelf doet of aanmaakt

- **A:** niets aan te maken. Zet in elke advertentielink `?utm_source=instagram&utm_campaign=<naam>` (of
  tiktok/google); een lijstje kant-en-klare links komt in de notitie van de levering.
- **B, Meta:** in Business Manager een dataset (Events Manager) en een toegangssleutel voor de Conversions API.
  **Google:** in Google Ads een conversieactie "Bestelling" (importeren, klikken) en API-toegang (een
  ontwikkelaarssleutel, waar Google een paar dagen over doet). **TikTok:** in Events Manager een Events API-sleutel.
  Per sleutel: één keer `wrangler secret put` via een stap in LIVE-STAPPEN, zoals de andere sleutels.

## Kosten

- **A:** geen abonnement, geen bedrag per gebeurtenis. Bouwen: ± een halve levering (het veld, de telling, een scherm
  in /admin, toetsen).
- **B:** de API's van Meta, Google en TikTok kosten niets per gebeurtenis. Bouwen: ± een levering voor Meta en de
  cookiekeuze, ± een halve per extra platform. Jouw tijd: ± een uur per platform om de sleutel aan te maken.
- **C:** geen bedrag, wel snelheid en de toestemming van elke bezoeker.
