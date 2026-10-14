# e-Boekhouden koppelen — stappenkaart

*8 oktober 2026 · punt 8.08*

Na deze stappen gaat elke factuur, creditnota en abonnementsfactuur vanzelf naar e-Boekhouden, met de Mollie-betaling ertegenover. Je typt niets meer over.

**Zolang stap 4 niet gedaan is, staat de koppeling uit.** Dan gebeurt er niets, ook niet als de nieuwe code al live staat.

---

## 1 · Kies je pakket: ZZP of Standaard

Elke verkoop kost twee boekingen: de factuur en de betaling. Volgens het onderzoek mag het ZZP-pakket **240 boekingen per boekjaar**, dus ongeveer **120 verkopen per jaar** (facturen plus abonnementstermijnen). Een creditnota met terugbetaling kost er ook twee.

- Verwacht je minder dan zo'n 10 verkopen per maand: ZZP is genoeg.
- Meer, of abonnementen erbij: neem Standaard.

Kijk het aantal en of de API in jouw pakket zit na op de tarievenpagina van e-Boekhouden.

## 2 · Eerst proberen in een proefadministratie

e-Boekhouden heeft geen aparte testomgeving: alles wat de koppeling doet, komt in de administratie van het token. Probeer het daarom eerst in een tweede, lege administratie (een proefaccount of een extra administratie), niet in je echte boekhouding.

Wil je daar ook je **proefbestellingen** (met de test-sleutel van Mollie, nummers die met PROEF- beginnen) in zien: zet in stap 4 ook de variabele `EBOEKHOUDEN_PROEFREEKS` op `aan`. **Haal die weg** voordat je overstapt op je echte administratie.

## 3 · In e-Boekhouden: de rekening "Mollie" en het token

1. **Grootboekrekening Mollie aanmaken.** Ga naar de grootboekrekeningen en maak een nieuwe aan:
   - code **1105** (bezet? kies een vrije code en zet die in stap 4 als `EBOEKHOUDEN_GROOTBOEK_MOLLIE`)
   - omschrijving **Mollie**
   - categorie **Financieel** (bank/kas, in de API heet dat FIN)

   Mollie stort niet per betaling, maar in partijen min kosten. Elke betaling komt eerst op deze tussenrekening; de uitbetaling naar je bank boek je (of de bankkoppeling) van Mollie naar Bank. Dan klopt "Mollie" met het saldo in je Mollie-dashboard.

2. **Controleer twee bestaande rekeningen:** **1300** Debiteuren en **8000** Omzet. Heten ze bij jou anders, noteer de codes voor stap 4.

3. **Token aanmaken.** Ga naar **Beheer → API-token** (in sommige administraties: **Beheer → Inrichting → Koppelingen → API**). Maak een nieuw token aan, kies de geldigheid (bijv. 12 maanden) en **kopieer het meteen**: je ziet het maar één keer. Zet de vervaldatum in je agenda; daarna stopt de koppeling en meldt het nachtrapport "Inloggen bij e-Boekhouden lukt niet".

## 4 · Het token als geheim in Cloudflare

Doe dit bij **beide** workers: **visuails-site** én **visuails-cron** (de nachtelijke taak heeft eigen geheimen).

1. Cloudflare-dashboard → **Workers & Pages** → kies de worker.
2. **Settings → Variables and Secrets → Add**.
3. Type: **Secret**. Naam: `EBOEKHOUDEN_API_TOKEN`. Waarde: het token uit stap 3. Opslaan (Deploy).

Wijkt een code af van de standaard, voeg dan op dezelfde plek de variabele toe, ook bij beide workers. Kies ook hier type **Secret**: een gewone tekstvariabele uit het dashboard verdwijnt bij de volgende deploy, omdat wrangler.toml zijn eigen lijst variabelen meebrengt.

| Wat | Standaard | Variabele |
|---|---|---|
| Debiteuren | 1300 | `EBOEKHOUDEN_GROOTBOEK_DEBITEUREN` |
| Omzet | 8000 | `EBOEKHOUDEN_GROOTBOEK_OMZET` |
| Omzet EU, verlegd | = omzet | `EBOEKHOUDEN_GROOTBOEK_OMZET_EU` |
| Omzet buiten de EU | = omzet | `EBOEKHOUDEN_GROOTBOEK_OMZET_BUITEN_EU` |
| Tussenrekening Mollie | 1105 | `EBOEKHOUDEN_GROOTBOEK_MOLLIE` |
| Btw Nederland | HOOG_VERK_21 | `EBOEKHOUDEN_BTW_NL` |
| Btw EU, verlegd | BI_EU_VERK_D | `EBOEKHOUDEN_BTW_EU` |
| Btw buiten de EU | BU_EU_VERK | `EBOEKHOUDEN_BTW_BUITEN_EU` |
| Boeken vanaf | dag van de eerste run | `EBOEKHOUDEN_VANAF` (bijv. `2026-10-01`) |

**Boeken vanaf:** zonder deze variabele begint de koppeling bij de dag dat hij voor het eerst draait. Oudere facturen gaan er dan niet heen; die staan misschien al met de hand in e-Boekhouden. Wil je ze er wél in, zet dan een eerdere datum. Een factuur die er met hetzelfde nummer al in staat, wordt niet dubbel geboekt.

## 5 · De database bijwerken

Migratie **0056** maakt de tabel waarin staat wat er geboekt is. Draai hem zoals de andere migraties van deze ronde (of plak `migrations/0056-boekhouding-boekingen.sql` in de D1-console: Cloudflare-dashboard → D1 → visuails → Console).

## 6 · Testen

1. Ga naar **/admin/diagnose** → blok **De boekhouding (e-Boekhouden)**. Er staat "aan".
2. Druk op **Koppeling testen (boekt niets)**. Alle rekeningen moeten "gevonden" zijn, en Mollie met categorie FIN.
3. Doe een proefbestelling (in de proefadministratie, met `EBOEKHOUDEN_PROEFREEKS = aan`) en betaal hem.
4. In **/admin/facturen** staat bij die factuur "in de boekhouding". In e-Boekhouden staan nu een verkoopfactuur en een betaling op Mollie, en de factuur staat niet meer open.
5. Probeer ook een terugbetaling: dan komen er een creditnota (negatief) en een terugbetaling op Mollie bij.

## 7 · Laat een boekhouder één ding bevestigen

**De btw-code voor een klant buiten de EU.** VISUAILS levert een dienst; de standaard is `BU_EU_VERK`, maar e-Boekhouden omschrijft die code als "leveringen buiten de EU". Vraag of dat de goede rubriek is voor diensten aan een bedrijf buiten de EU, of dat het `GEEN` moet zijn. Verander het dan met `EBOEKHOUDEN_BTW_BUITEN_EU`.

Vraag meteen ook of `BI_EU_VERK_D` (diensten binnen de EU, verlegd → rubriek 3b en de ICP) klopt voor jouw EU-klanten.

---

## Als er iets misgaat

- Een betaling, factuur of mail wacht **nooit** op e-Boekhouden. Lukt een boeking niet, dan staat er in **/admin/facturen** "mislukt" met de reden en een knop **Opnieuw**.
- Elke nacht probeert de nachtelijke taak elke mislukte boeking één keer opnieuw. Wat dan nog misgaat, staat in het nachtrapport.
- **Voer een factuur niet ook met de hand in** zolang de koppeling aan staat. Gebeurt het toch met hetzelfde factuurnummer, dan neemt de koppeling hem over in plaats van hem dubbel te boeken; met een ander nummer staat hij er twee keer in.
- Met tegoed betaald? Dan staat dat deel in e-Boekhouden open tot je het aflettert tegen de creditnota van het tegoed. /admin/facturen noemt die facturen.
