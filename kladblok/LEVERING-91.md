# Levering 91 · De blinde plekken, lijst 84 – 86, en de keten live getest

**9 november 2026. Staat alleen in je map; je rolt zelf uit met `UITROLLEN.bat`.** Bouwt voort op levering 90 (die zit er
ook in: hij stond nog niet in je map). Twee nieuwe migraties: `migrations/0069-indexen-schaal.sql` (indexen, verandert geen
gegevens) en `0070-studiobrief.sql` (de Studiobrief, §8); `UITROLLEN.bat` draait ze als stap. Verslagen per onderzoeker staan in de scratchpad (`91/bevindingen/`), de
toetsen in `tests/blind91-*.test.mjs` en `tests/fotoblok-browser.test.mjs`, allemaal in de keten van `npm test`.

---

## 1 · Wat je vroeg

- **00:38:** *"Maak een geheel onderzoek, plan en lijst voor jezelf voor dingen die we niet hebben gecontroleerd en wel
  belangrijk zijn om te controleren en werk die dan af. Vooral blinde plekken […] test het zeer nauwkeurig en specifiek."*
- **02:41:** lijst 84 (de knoppen) en lijst 85 (Studio en /admin) ingevuld; *"uiteindelijk een volledige controle of alles goed
  is doorgevoerd/aangepast."*
- **03:26:** lijst 86 (de fotoblokken) ingevuld; daarna in Studio de keten met een testbestelling (Mollie in testmodus, jij betaalde).
- **04:10:** de hoeken, gelijke hoogtes, een knoppensysteem, de socials, de Studiobrief en een consistentiecheck — dat is
  ronde 92; wat daarvan al af is staat in §8.

## 2 · Het onderzoek: zes kanten die nog niemand had bekeken

| Wie | Waar | Hersteld in deze levering |
|---|---|---|
| A | beveiliging en privacy | A-01 onderwerp van de contactmail veilig · A-02 geen omleiding naar `//ander-domein` · A-03 `nosniff` op bestanden in /admin · A-04 /nl/404 met de juiste koppen · A-05 inlogcodes tellen atomair (na 5 missers dood) · A-06 geen werknotities in vaste css/js |
| B | geld, btw, facturen | B-01 alsnog betalen · B-02 en B-06 de juiste betaalmethodes (ook buiten de EU) · B-03 factuur- en creditnotadatum in Nederlandse tijd · B-04 landcode overal gelijk · B-05 bedragen in de Studiomail · B-07 aantallen streng |
| C | tijd, nachttaak, schaal | C-01 de nachtgrens · C-02 een cacheteken op meer bestanden · C-03 indexen voor groei (migratie 0069) · C-04 "vandaag" is de Nederlandse dag (bewaar- en revisiedatum klopten 's nachts niet) · C-05 betaalmoment · C-06 voorrang en de agenda · C-07 volgorde in de nacht · C-08 saldo bij abonnees · C-09 cache van de build |
| D | browsers, uploads, netwerk | D-01 de opening blijft niet hangen als Safari afspelen weigert · D-02 emoji in bestandsnamen · D-03 HEIC/TIFF in /admin met uitleg · D-04 en D-06 sleutels · D-05 versturen wacht op foto's die nog onderweg zijn · D-07 de fotolijst |
| E | inhoud, mail, merk in beelden, DNS | E-01 de mailkop in de taal van de klant; E17 de verwerkerslijst (e-Boekhouden en VIES erbij, privacy en register bijgewerkt); E19 de herkomsttag ook in webp/review |
| F | live koppen, de laptop | in orde; zie F.md |

Plus de restjes daarna (helper R): links in mails gaan rechtstreeks naar Studio mét de taal (`?lang=nl/en`), het bedrag in de
overstapmail via het vaste geldformaat, een nette fout én een melding vóór een upload boven 32 MB in /admin, een JPEG zonder
extensie wordt herkend aan zijn eerste bytes, en "vandaag" ook in de agenda, het neerzetten en de nu-zin in Nederlandse tijd;
het voorrang-vinkje gaat uit als de agenda dicht is.

## 3 · Lijst 84 · de knoppen

A1 c: Bestellen bovenin is de snede, schoon (op de voorpagina een lijnknop, elders inkt). A2 b: de inktknop is inkt in rust,
de snede onder de muis (site en Studio). A3 a, A5 b: de vinkjes zonder vlak. A4 a werd lijst 86.

## 4 · Lijst 85 · Studio en /admin

Klantkant (K): het gezicht met naam in plaats van "gezicht —", de notitie, KVK bij een merkmodel, het abonnement (extra's
verborgen tot de start, w13 "na de start"), de afrondmail, wat ontbreekt, de bestelpagina, en de levermail wijst naar de
bestelpagina. Beheerkant (W, w1 – w11): het menu (vijf vaste plekken, twee klapjes), de woorden ("test" en "Proef" uit elkaar,
"Leveren en klant mailen"), Nu doen (één regel per bestelling, voorrang bovenaan met de echte termijn), het statuspad zonder
"In controle", het dashboard als lijst, de revisie in het vakje met één mail per ronde, één sleepvak per product.

**Wat je moet weten (W):** oude rijen op de privélink zeggen nog "Wordt nagekeken" (portal.js); de uitlegpagina /studio en
FigBoard/FigDash tonen nog vier stappen · "Terug naar In productie" wist de leverstempels (opnieuw leveren stuurt weer de
eerste levermail) · een ronde zonder nieuw beeld gaat pas naar de klant na "Antwoord op de revisieronde sturen" · de
maandsetregel telt testabonnementen mee · het sleepvak toont de indeling alleen met JavaScript · een oude link
`/admin/agenda?soort=…` verliest het filter.

## 5 · Lijst 86 · de fotoblokken

Je koos glas a, kleur a, beweging a en de vier blokken. Elk blok heeft altijd dezelfde foto van jou, bewogen langs de snede
en in Blauw uur gezet: **het €1-blok** (de straat in de avond), **het slot onderaan** (beton en lucht), **de Studiobrief** (de
duinen; in de voet, op Editions en bij de gidsen) en **de 404** (de nacht met flits). De tekst staat op een glazen plaat; op
het slot loopt de plaat om de tekst heen, zodat de foto rechts vrij blijft.

- Gemeten: wit haalt op het slechtste beeldpunt overal minstens 4,5 : 1 (1440 en 390); de V op de 404 minstens 7,6 : 1.
  In de schets lag het lichtspoor midden achter de V (1 : 1); de foto is nu zo uitgesneden dat het spoor naast de V ligt.
- De plaat volgt de hoekregel: rond aan alle vier de hoeken, concentrisch met zijn blok (in de schets stond nog 26/6/6/6).
- Zonder glas (oude browser) inkt 80 %; bij hoog contrast geen foto. De beelden zijn 4 – 27 kB (avif en webp, 800 en 1600).
- De bron: `src/data/fotoblok.js` (welk blok welke foto), `scripts/fotoblok.mjs` (maakt de beelden: `node scripts/fotoblok.mjs`),
  `src/styles/fotoblok.css`. Een foto met een merk erop kan er niet in (de toets houdt een lijst bij).
- **Gevonden onderweg (live):** op Editions waren de kop en de zin van de Studiobrief onleesbaar (wit op wit). Dat is hiermee weg.
- De posterkleur staat niet meer op deze vier blokken; KLEURENSCHEMA.md en DESIGN.md zijn bijgewerkt.

## 6 · De keten in Studio, live (VIS-DEFK-9AP)

Bestellen → betalen (test) → leveren in /admin → in Studio goedkeuren en één beeld aanmerken → revisieronde → in /admin
vervangen en melden → in Studio "Allebei goed" → /admin "Review vragen". Elke stap en elke mail kwam aan. De bestelling is
daarna **verborgen** (niet verwijderd). Hersteld wat ik vond: de kop na een herlevering zegt wat er nog te doen is ("Je nieuwe
beeld staat klaar"), de datumzin en de proefzin staan één keer op de kaart, "Allebei goed", een geannuleerde bestelling met
beelden zegt dat je ze nog kunt downloaden, de waarschuwing bij de revisieronde is blauw op vlak (was amber), de samenvatting
in stap 3 plakt geen hulptekst meer aan het label, de herlevermail zegt welke link nieuw is, en de mail bij één aangemerkt
beeld staat in het enkelvoud. Verslag: `91/bevindingen/S.md`.

Twee oudere testbestellingen "TEST Claude BV" (VIS-APHE-FFV, VIS-HM02-QE7) staan nog in Nu doen: verberg ze zelf of laat ze staan.

## 7 · Toetsen

De volledige reeks (`node scripts/testreeks.mjs`, 4 tegelijk zoals bij jou): **337 stappen, alles groen, 23 min 52 s**
(twee browsertoetsen, beweging83 en opening90, liepen in de drukte één keer uit en waren los groen). De eerste ronde gaf
rood door een verouderde build en door toetsen die het gedrag van vóór je keuzes vastlegden; die zijn bijgewerkt, elk met een
commentaar waarom (o.a. subverwerkers: de overeenkomst noemt de datum van de subverwerkers; nu-doen hing van het uur af;
liveqa51, kopiebrowser en stap2-kaart volgen K-14, K-C2 en K-C1). Nieuw: 54 toetsen `blind91-*`, `fotoblok-browser`,
`studiobrief-admin` en `studiobrief-admin-browser`.

## 8 · Ronde 92, wat er al in zit

- De laatste zachte hoek: het vinkje op de bedankpagina (24,7 % / 4 / 4 / 4) is een rondje; in /admin waren de knoppen in de
  hoek van Nu doen en onder een notitie halve pillen (één hoek 8 of 12): nu hele pillen. Gemeten op elke pagina, Studio en
  /admin (licht en donker); de hoekregeltoets kijkt nu ook op de bedankpagina, de 404 en de pagina's met een fotoblok.
- Op één lijn: in Studio houdt de bestandsnaam onder een beeld altijd twee regels vast (de knoppen springen niet meer), de regel
  "Stel een vraag · WhatsApp · Mail" staat op één lijn; de voet onderaan, de bijschriften in de galerij en de stappen op /start.
- De sociale knoppen in de voet: drie losse rondjes, zonder streep.
- Ook op één lijn: de vier cijferkaarten op /about (label, getal en zin delen nu hun rijen), "op aanvraag" in de creditlijst
  op /plans staat op de onderlijn van de getallen, en op de telefoon begint de regel "Ook te bestellen" niet meer met een losse punt.
- Het label "Binnenkort" op Editions rekt niet meer uit tot de hele breedte.
- **De Studiobrief in /admin** (Instellingen → Studiobrief): de lijst aanmeldingen per taal, een brief opstellen in de mailstijl
  met voorbeeld, een proefmail naar jezelf, inplannen of meteen sturen via Resend, een geplande brief annuleren. Wie onderaan op
  afmelden klikt, staat via de webhook vanzelf op "afgemeld"; wie zich later opnieuw aanmeldt, staat weer aan. Nieuwe migratie
  `0070-studiobrief.sql`. **Wat jij moet doen** (staat ook bovenaan het scherm): `RESEND_API_KEY` met *Full access*; in Resend
  twee segmenten (Studiobrief NL en EN) en hun id's als `RESEND_SEGMENT_NL` / `RESEND_SEGMENT_EN`; bij de webhook naar
  `/api/webhook/resend` de events `contact.updated` en `contact.deleted` aanvinken (secret als `RESEND_WEBHOOK_SECRET`).
  Kijk één keer met een eigen testadres of afmelden echt terugkomt: dat Resend dan `contact.updated` stuurt, staat niet
  letterlijk in hun documentatie. Wie zich eerder aanmeldde, staat in Resend nog zonder segment: deel die daar met de hand in.
- Nog bezig (volgt in levering 92): het knoppensysteem (eerst een lijst om af te vinken), de andere systemen en de volledige
  consistentiecheck.
