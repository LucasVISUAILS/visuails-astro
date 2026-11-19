# Levering 118 · De middenpunten uit de proefronde

**18 november 2026. Staat alleen in je map; je rolt zelf uit met `UITROLLEN.bat`.**

Je koos in lijst 127 overal het advies. Dit zijn de 83 middenpunten met advies "doen", plus 3 restjes uit het naspelen
van 117 (N3-01, N3-02, N3-03). De 7 middenpunten met advies "later" — L-02 P12-04 P4-05 P5-02 W1-07 P5-13 P2-04 — zitten
er bewust niet in. Van vier daarvan was al iets gebouwd; dat is er weer uit (nagekeken: niets ervan staat in de site). De
lage en kleine punten komen in 119.

## Eerst: wat jij moet doen

1. **Twee nieuwe migraties (0074 en 0075).** `UITROLLEN.bat` zet ze zelf op de live database, na jouw J (`LIVE-STAPPEN.md`
   §2, stap 3; zo ging het ook met 0071–0073 in levering 101–104). 0074 bewaart het merk bij een aanvraag op maat
   (P12-02), 0075 het VIES-nummer van een abonnement (P5-11). Kijk of het eindscherm groen is.
2. **Turnstile aanzetten (`LIVE-STAPPEN.md` §6b).** Tot dan kan elk internetadres hoogstens 5 keer per dag foto's
   uploaden (P9-09). De melding zegt nu wel waarom, en wijst naar WhatsApp of mail.
3. **Analytics (`LIVE-STAPPEN.md` §6c).** Zet de regel `PUBLIC_CF_ANALYTICS_TOKEN=…` in `.env` in de projectmap. De waarde
   staat in `LIVE-STAPPEN.md` r. 168. Dubbelklik dan `UITROLLEN.bat`. Controle: privévenster, kies **Meten toestaan** (zo
   heet de knop nu).
4. **Gmail-filter (W2-01, 2 minuten).** Instellingen → Filters → Nieuw filter. Van: `orders@visuails.com`. Vink aan:
   "Nooit naar Spam sturen", "Altijd markeren als belangrijk" en "Categoriseren als: Primair". Dan landen meldingen nooit
   meer in Updates.
5. **Toeslag terugstorten (P8-02).** De nieuwe knop in Nu doen stort echt geld terug via Mollie. Probeer hem eerst in
   testmodus.
6. **Zoeklink KVK/KBO (W1-04).** Klik op /admin/vat één keer op beide links "opzoeken bij KVK/KBO". De vorm van die
   zoeklinks kon hier niet live gecontroleerd worden.
7. **Termijn van een merkmodel (P4-09).** De site zegt nu "binnen 3 werkdagen" voor de eerste richtingen. Dat getal staat
   in `src/data/termijnen.js`: `MERKMODEL_RICHTINGEN_WERKDAGEN = 3`. Kies jij het getal; /admin plant mee.
8. **De naam van de dienst (P2-10).** Overal heet hij nu **Catalog** (menu, /start, formulier, mails, facturen). Het
   voorstel was "Productfoto's", maar dat woord gebruikt de site ook voor de foto's die de klant zelf stuurt. Wil je een
   andere naam, zeg het; dan is het één tekstronde.
9. **Portfolio is nu streng opt-in (P6-03).** Een klant die nooit ja zei, valt buiten het portfolio. Staan er beelden op de
   site van klanten zonder ja? Haal ze weg of vraag het alsnog.
10. **Voorrang en foto's via WhatsApp of mail (L-16).** De klok loopt nu vanaf betaald én alle foto's binnen. Komen de
    foto's via WhatsApp of mail, dan legt de site "foto's compleet" niet vast. /admin toont dan de gewone streefdag en Nu
    doen meldt nooit "voorrang gemist". Houd voorrang daar dus zelf bij. Bij voorrang biedt Mollie geen overboeking meer.
11. **Vierde plankaart en bijkopen (P3-03).** Die blijven verborgen. Wil je ze terug (op /plans, /start/plan en in
    Studio), zet dan `ABO_EXTRA_ZICHTBAAR` in `src/data/aboZichtbaar.js` op `true`.
12. **Tweede proef (B1-01).** Hetzelfde btw-nummer weigert nu een tweede proef, net als hetzelfde KVK-nummer. Alleen
    dezelfde bedrijfsnaam + postcode wordt aangenomen en op de nakijklijst gezet. Wil je het btw-nummer ook als twijfel,
    zeg het; dat is één regel.
13. **Nalezen:** de veranderde juridische zinnen staan hieronder onder *Nalezen*.
14. **Goed om te weten:**
    - Te kleine foto's (onder 1000 px aan de lange kant) worden niet geweigerd, alleen gemeld in /admin en de studiomail.
    - Wie al een offerte zonder adres kreeg, ziet op /o/ eerst de factuurgegevens (P4-06).
    - Bestellingen van vóór deze levering rekenen voorrang zoals altijd vanaf de betaling. Bestellingen zonder prijsopbouw
      (vóór 9 november 2026) hebben geen terugstortknop: met de hand in Mollie.
    - Aanvragen op maat van vóór deze levering hebben geen kopie van het merk; /admin zegt dat erbij.
    - Een bestaande klant die bij een nieuwe bestelling een andere contactvoorkeur kiest, houdt zijn oude (W1-09).
    - Mails die al klaarstonden vóór de uitrol, houden het oude onderwerp (W2-15). Dat gaat over hooguit een paar uur.
    - Het menu opent met het toetsenbord nu met Enter, niet meer vanzelf bij focus (P11-03).
    - Drie nieuwe bestanden in `public/img/hal/banner/` gaan mee: `banner-540.mp4`, `eind-1280.webp`, `eind-1920.webp`
      (uit je eigen bannervideo, geen nieuw beeld).

## Vragen aan jou

- **(a) Het bedrag op /o/.** /o/ noemt het bedrag van de offerte niet ("De prijs staat op de betaalpagina"). Het staat
  alleen in de mail en bij Mollie. Moet /o/ het bedrag ook tonen? Dan is het een kleine wijziging in `portal.js` (het
  bedrag uit de bestelling, nooit getypt).
- **(b) De €1 in de kop van /test-sample.** De kop is nu twee regels tekst, met de €1 als eigen regel eronder (zo staat
  het sinds oktober: de €1 houdt zijn eigen maat). Telt de €1 voor jou als derde regel? Dan moet hij uit de kop.

## Wat er veranderde

### Bestellen en betalen

| punt | wat er mis was | nu |
|---|---|---|
| L-07 | wie na een bestelling een abonnement wilde, moest zelf de weg naar inloggen zoeken | hoort het adres al bij een account, dan gaat er meteen een inlogmail met code; de zin en een codeveld staan bij het e-mailveld; na de code kom je terug op het formulier |
| P1-10 | een verlopen tweede proef kreeg een betaalmail; de bedankpagina zei "betaald" boven "geannuleerd" | geen betaalmail als het bedrijf al een betaalde proef heeft; opnieuw betalen geeft "Je bedrijf had al een proef. Er is niets afgeschreven"; de kop zegt "Je proef is geannuleerd", met een eigen mail over het terugstorten |
| B1-01 (b) | een tweede €1-proef lukte met ander e-mailadres, telefoon en KVK | hetzelfde btw-nummer weigert; dezelfde bedrijfsnaam + postcode wordt aangenomen en op de nakijklijst gezet: "NAKIJKEN" in de studiomail, het logboek, een rij *Proef* op de bestelpagina en *Proef nakijken* in Nu doen |
| B1-11 | mislukte en verlopen betalingen zag je nergens | elke mislukte, afgebroken of verlopen betaling krijgt één regel in het logboek en op de tijdlijn (alleen /admin); de bestelpagina zegt "laatste poging verlopen (datum)" |
| P10-03 | dezelfde bestelling in twee tabbladen werd twee keer betaald | het tweede tabblad krijgt de bestaande bestelling: betaald → de bedankpagina, anders "deze bestelling betalen" |
| P3-08 | extra hoeken telden niet mee in de agenda | elke extra hoek telt als een foto; 20 producten met 4 hoeken wegen dubbel; de kalender in het formulier vraagt met de hoeken |
| P9-09 (a) | uploads dicht na 5 bestellingen per dag per internetadres, met een vage melding | de grens blijft tot Turnstile aan staat; de melding noemt de echte oorzaak ("een paar bestellingen op één dag") en de weg via WhatsApp of mail |
| P9-12 | na hervatten noemden Studio en Mollie een andere datum | Mollie krijgt de gewone termijndag, net als Studio en de mail |
| W2-01 | meldingen landden in Gmail-tab Updates | geen codefout; jouw Gmail-filter (stap 4) |
| W2-08 | de melding "Nieuwe bestelling" zei niet: betaald of nakijken? | onderwerp begint met "NAKIJKEN · " of eindigt op " · nog niet betaald"; bovenaan een vlak met de stand; look en extra hoeken staan erin; een datum heet "gereserveerd" tot de betaling |
| W2-10 | "je btw-nummer konden we niet bevestigen" zonder btw-nummer | "Je vulde geen btw-nummer in, dus rekenen we 21% Nederlandse btw…", in de bestelmail, de betaallinkmail en de melding aan jou |
| W2-15 | na een mislukte betaling heette de mail "We hebben je bestelling" | "Nog niet betaald — je bestelling VIS-… staat klaar", met "Er is niets afgeschreven" |
| P4-08 | te vaak verstuurd gaf een witte lege pagina | terug naar het formulier met een kader: wacht een paar minuten, of bestel via WhatsApp of mail; ook op proef, contact, video/eigen look en merkmodel |

### /admin

| punt | wat er mis was | nu |
|---|---|---|
| W1-01 | een onbetaalde bestelling leek betaald of vast | "Voorrang aangevraagd … onbetaald" en "Gereserveerd … · onbetaald", met de dag waarop de dagen vrijkomen; in de planning een gestippelde chip met "onbetaald" of "test" |
| W1-04 | de btw-kaart vroeg het KVK-nummer na maar toonde het niet | rij *Registratienummer* (KVK, KBO …) met een zoeklink voor NL en BE en een link naar de klantkaart; "niet opgegeven" als het ontbreekt |
| N3-03 | een algemene 21%-zin naast de knop btw verleggen | onder de knoppen staat per geval wat elke knop doet |
| W1-06 | het logboek zei "Bestelling binnen · order.created", in het Engels, zonder referentie of bedrag | Nederlands, met referentie, merk, dienst, bedrag en hoe het binnenkwam; aanvraag, btw-controle en €1-proef hebben een eigen naam; contactberichten staan ertussen |
| W1-09 | belverzoek en contactvoorkeur vielen weg | "Wat de klant koos" begint met het bericht, de contactvoorkeur (met *Bel de klant*) en de stand van de foto's; de opmerking staat bovenaan de studiomail, met belknop |
| P8-02 | een gemiste voorrangstoeslag terugstorten ging met de hand | in Nu doen de knop *Toeslag terugstorten* met het bedrag incl. btw; één keer, met verplicht vinkje; de klant krijgt een mail en de creditnota volgt vanzelf |

### Studio en op maat

| punt | wat er mis was | nu |
|---|---|---|
| P5-01 | "Bekijk je aanvraag" opende een lege bestelpagina | /o/ toont "Je aanvraag": de brief in woorden en de stappen Aanvraag → Voorstel → Offerte → Bestelling |
| P5-09 | op maat stond altijd op "VERSTUURD", ook na betalen | een label per stand, ook *Betaald* en *Afgerond*; gesloten aanvragen onder "Afgerond"; sluit je na betalen, dan krijgt de klant een mail |
| P12-02 | een verstuurde aanvraag veranderde mee met het merkprofiel | de aanvraag bewaart het merk van dat moment (migratie 0074) |
| P12-06 | een oude bestellink na de bewaartermijn gaf een verkeerde of dode pagina | "De downloadperiode is voorbij", met de datum en knoppen naar Studio, WhatsApp en mail |
| P5-10 | de offerte op maat stond op Nederland voor een Belgische klant | zonder land of btw-nummer op het account neemt het formulier die van de laatste betaalde bestelling, met "kijk ze na" |
| P5-11 | de jaarfactuur heette "abonnement november 2026", zonder periode of VIES-nummer | "12 maanden vooruit", met begin- en einddatum en de credits per maand; het VIES-nummer gaat mee (migratie 0075); Studio volgt de btw van het abonnement |
| P9-13 | de creditherinnering raadde hooks en video aan | die staan er niet meer in; het onderwerp noemt hoeveel credits vervallen, niet het hele saldo |
| P4-06 | een video-factuur ging uit zonder adres | zonder adres wijst de betaallink eerst naar /o/: daar vult de klant bedrijf en adres in, dan pas betalen |
| P4-09 | nergens stond wanneer je de richtingen van een merkmodel krijgt | "binnen 3 werkdagen" op /custom-models, het formulier, de bedankpagina, Studio en de betaalmail; /admin plant op betaling + 3 werkdagen (stap 7) |
| P4-10 (a) | een vastgelegd merkmodel zei "beelden klaar, alles goedgekeurd" | "Je merkmodel staat vast. Het is alleen van jou, en je kiest het bij je volgende bestelling.", zonder knoppen |
| B1-05 | iemand kon een bestelling in andermans Studio zetten | een bestelling zonder inlog op een bestaand adres staat pas na betalen in diens Studio (de mails gaan nog wel naar dat adres) |
| N3-01 | de offertemail zei "zoals besproken" zonder gesprek | "met wat je krijgt en wanneer het klaar is" |
| N3-02 | /o/ zei "Dit is een aanvraag…" terwijl de offerte er stond | die zin staat er alleen zolang er geen bedrag is |

### Het bestelformulier

| punt | wat er mis was | nu |
|---|---|---|
| L-10 | de betaalstap kende de btw-uitkomst niet | dezelfde regels als de server: "btw verlegd · €0", "btw €0 (buiten de EU)" of "na het nakijken, via de betaallink" met de knop *Bestelling versturen*; geen verleggingszin bij een nummer dat VIES afkeurde; "Bestel je elders in de EU zonder btw-nummer…" alleen als nakijken kan. Het blijft een voorspelling: kent het formulier het land alleen uit je account, dan kan de server alsnog nakijken |
| L-16 (a) | voorrang liep vanaf betalen, ook zonder foto's; Mollie bood overboeking | de klok loopt vanaf betaald én alle foto's binnen; overal dezelfde zin; bij voorrang geen overboeking (stap 10) |
| P1-03 | de €1-proef kost €1,21, maar dat stond nergens vóór betalen | "€1 excl. btw (€1,21 incl. btw)" op de proefpagina en in stap 1; het overzicht toont btw en "Totaal bij Mollie" (uit de code) |
| P1-04 (a) | een tweede proef hoorde je pas in stap 3, en "Bestel gewoon" begon opnieuw | "Bestel deze look voor €…" neemt look en foto's mee naar het gewone formulier |
| P1-06 | op de telefoon sloeg de vaste Verder drie keuzes over | eerst "Nog N keuzes", die naar het volgende blok scrolt; de verhouding is op de telefoon een eigen blok |
| P10-05 | zonder verbinding zei het formulier "nog geen foto's gekozen" | "Je verbinding is weg; 3 foto's wachten en gaan vanzelf", met *Wachten* of *Toch later* |
| P12-05 | de laatste stap toonde niet op welk bedrijf de factuur komt | regel "Factuur aan: merk · adres, land · btw-nummer", met *Wijzig* |
| P2-07 (a) | de groene Verder sloeg "Je was bezig" over | bij terugkomst zet het formulier alles meteen terug; alleen *Opnieuw beginnen* blijft |
| P9-02 | met credits toonde het formulier euro's | alles in credits ("1 × 4 credits", "+2 credits per product") |
| P2-05 | de vaste tipbalk dekte vakken en foutmeldingen af | de tip staat in de pagina boven de vakken en wisselt niet vanzelf; een mislukte foto staat ook bovenaan het product |
| P10-04 | na verversen in stap 3 was alles weg | stap 3 blijft bewaard zolang het tabblad open is (staat in het cookiebeleid); je komt terug in stap 3 |
| P2-06 | een te kleine foto kwam via *Opnieuw* toch binnen | alleen nog *Vervangen*; de server meet elke foto en meldt te kleine in /admin en de studiomail, zonder te weigeren |
| P8-04 | de voorrangsdag bleef staan na 15:00 | de dag wordt elke minuut opnieuw gerekend; het bevestigscherm noemt de dag |
| P3-05 | het hoekvenster dimde half en de focus liep weg | een echt venster dat alles dimt en de focus vasthoudt; de twee "Zelf bedenken"-vinkjes hebben een eigen naam |
| T1-06 | "Hulp nodig?" had op de telefoon geen naam | de tekst is alleen voor het oog verborgen; de schermlezer leest hem |
| P3-11 | een volle datum verdween zonder uitleg | een grijze kaart "vol"; een venster over volle dagen zegt bijvoorbeeld "(29–30 vol)" |

### /start en /plans

| punt | wat er mis was | nu |
|---|---|---|
| P1-11 | de bevestiging van de wachtlijst stond buiten beeld | het blok komt in beeld en krijgt de focus |
| P4-02 | de videokaarten leidden weg uit /start | de kaart opent de aanvraag met de stijl al gekozen ("Kies deze stijl"); *Bekijk* is een kleine link eronder |
| L-06 | het vinkje "Ik heb geen btw-nummer" was een leeg tekstvak | een gewoon vinkje |
| P1-05 | "Gekozen" was zwart op zwart | wit op inkt |
| P10-07 | terug uit het formulier toonde stap 1 | je ziet de stap waar je was |
| L-08 | 12 maanden vooruit noemde een machtiging én "niets meer afschrijven" | "Je betaalt het hele jaar nu via Mollie. Er is geen machtiging." |
| P11-04 | bij stap 1 naar 2 hoorde de schermlezer niets | de focus gaat naar de kop van de nieuwe stap |
| P3-03 (a) | op maat "vanaf €272" stond niet op /plans | in de regel *Bespreek met ons*: "van 30 tot 300, vanaf €272 per maand excl. btw" (uit de code); geen vierde kaart (stap 11) |
| P2-02 | /start bij 200 % zoom brak woorden midden door | op heel smal scherm staan de tegels onder elkaar, zonder afbreekstreepjes |

### Teksten en juridisch

| punt | wat er mis was | nu |
|---|---|---|
| P2-10 | dezelfde dienst heette onderweg vijf keer anders | overal "Catalog" (stap 8); "fotolijst" werd "je foto's of je map" |
| P2-12 (a) | "vanaf €40" leek de prijs van één product | direct onder het vanaf-bedrag: "Eén product kost €90; vanaf 20 producten €40 per product." (uit de code) |
| P6-03 (a) | portfolio: opt-out in de voorwaarden, opt-in in privacy | overal opt-in: voorwaarden §8, de FAQ en `LICENTIE.txt` in de levermap (stap 9, *Nalezen*) |
| P6-04 | de FAQ sprak de proefpagina tegen | de FAQ noemt e-mailadres, telefoon en KVK, en na de betaling de rekening |
| P12-03 (a) | bureau: wat Studio onthoudt is per account, niet per merk | de FAQ zegt het, met het advies: per klantmerk een eigen account |
| P6-06 | de meeste pagina's zeiden niet dat het AI is | "Gemaakt met AI uit jouw productfoto's. De gezichten bestaan niet." op de lookpagina's, /lifestyle en /video; "deze mensen bestaan niet" op /models, /editions en /custom-models |
| P6-07 | "de beelden zijn van jou" tegenover een licentie | "Je mag de beelden overal gebruiken, voor altijd, en niemand anders krijgt ze" (voorpagina, FAQ, levermap) |
| P6-08 | "jij keurt elk beeld goed" tegenover aanvaard na 7 dagen | /ai-act noemt de 7 dagen (*Nalezen*) |
| P6-12 | "genereren gebeurt in Spanje" | privacy §8 noemt Magnific (Spanje), Google (VS) en ByteDance (Singapore) (*Nalezen*) |
| P6-18 | dienstpagina's zeiden niet wat er gebeurt als het tegenvalt | de tevredenheidsregel (1 revisieronde, binnen 7 dagen) bij de bestelknop op de lookpagina's, /video en /editions; niet op /custom-models, want een merkmodel heeft zijn eigen correctieronde |
| P8-06 | elke pagina zei iets anders over voorrang | één zin, met "Nederlandse tijd", op elke plek |
| P8-08 | voorrang vond je pas diep in het formulier | "Morgen nodig? Kies voorrang als je bestelt: +20%, minstens €50, tot 9 producten." (uit de code) op de voorpagina, /catalog, /lifestyle, /start en de lookpagina's |
| P4-07 (a) | geen aanvraagweg voor hooks | /contact heeft het onderwerp *Hooks*; de knoppen op /hooks kiezen het al |

### Ontwerp en toegankelijkheid

| punt | wat er mis was | nu |
|---|---|---|
| D1-01 (a) | de bannerkop zakte op de telefoonbeelden naar 1,5 : 1 | effen letters met een harde rand; gemeten minstens 5,58 : 1 |
| D1-02 | wit op de groene kaarten haalde 3,2–4,4 : 1 | een effen laag eronder; minstens 4,6 : 1 |
| D1-05 | de €1-kop liep naar 3 tot 5 regels | "Eerst zien? €1" |
| P11-01 | de cookiebalk kwam achteraan in de tabvolgorde | tweede tabstop; na je keuze gaat de focus terug |
| P11-02 | de focusrand in de menu's haalde 1,3 : 1 | inkt |
| P11-03 (a) | het menu heette "menu" maar werkte niet zo | gewone uitklapknoppen: Enter opent, Escape of Tab eruit sluit |
| P11-05 | galerijtegels waren geen links; 21 tabstops | links; 6 tabstops |
| P11-06 | met minder beweging was de banner leeg | een stilstaand eindbeeld (de jas bij de waterval), geen video |
| P11-07 | in hoog contrast verdwenen keuzes, velden en logo | randen en markering voor keuzes, velden en de schakelaar; het logo ook in de werkplaatsbalk; de bannerkop leesbaar |
| P2-01 | cookieknoppen liepen bij 200 % uit hun knop | de tekst breekt af en de balk is hoogstens 60 % hoog; de knop heet *Meten toestaan* |
| P2-03 | koppen krompen mee bij inzoomen | een ondergrens; op 320–390 px hoogstens 2 regels (de koppen hieronder bij *Nalezen*) |
| T1-02 | de telefoon haalde 16 MB video op bij binnenkomst | video's laden pas als ze spelen; de telefoon krijgt een versie van 2,1 MB |
| T1-03 | de proefpagina laadde traag | de eerste beelden laden eerst, de voorbeelden pas later |
| T1-07 | schuifstroken waren niet met het toetsenbord te bekijken | Tab erheen, schuiven met de pijltjes |
| P4-03 | de taalwissel gooide invoer en look weg | de link neemt de gekozen look mee; ingevulde velden komen terug (niet in het bestelformulier, niet wachtwoord of bestand) |
| P6-09 (a) | analytics toestaan mat niets | de site maakt de sleutel schoon; jij zet hem in `.env` (stap 3) |

## Nalezen

**Voorwaarden §8, portfolio (NL, `src/pages/nl/terms.astro`; EN in `terms.astro` met dezelfde vier wijzigingen):**
1. OUD: "**Ons portfolio — het enige dat wij achterhouden, en waarom dat opgeschreven moet staan.** De licentie hierboven is
   exclusief, en exclusief betekent exclusief: zonder deze alinea zouden wij inbreuk maken op jouw rechten door ons eigen
   werk te laten zien. Wij houden daarom één smal recht voor onszelf, en dat is de enige uitzondering in deze paragraaf.
   Wij mogen *geleverde visuals* — nooit jouw bronmateriaal — in ons portfolio, in een casus en op onze eigen kanalen laten
   zien, tenzij je ons schriftelijk vraagt dat niet te doen."
   NIEUW: "**Ons portfolio — alleen als jij ja zegt.** De licentie hierboven is exclusief, en exclusief betekent exclusief:
   zonder jouw ja zouden wij inbreuk maken op jouw rechten door ons eigen werk te laten zien. Daarom vragen wij het. Na de
   levering vragen wij of wij *geleverde visuals* en de productfoto's die je stuurde in ons portfolio, in een casus en op
   onze eigen kanalen mogen laten zien: met je merknaam, zonder merknaam, of liever niet. Zeg je ja, dan is dat je
   toestemming. Zeg je niets of liever niet, dan laten wij niets zien."
2. NIEUW, achter "…zelf mee heeft ingestemd.": "Foto's waarop iemand je product draagt, laten wij nooit zien."
3. OUD: "…dan publiceren wij niets voordat jij het hebt gelanceerd of schriftelijk ja hebt gezegd, wat eerder komt — …"
   NIEUW: "…dan publiceren wij niets voordat jij het hebt gelanceerd, ook als je al ja zei, tenzij je ons apart schriftelijk
   laat weten dat het eerder mag — …"
4. OUD: "En je kunt dit op elk moment intrekken, met één regel per e-mail, ook jaren later en ook voor werk dat al op onze
   site staat; dan halen wij het weg. Wij vragen het liever dan dat wij het aannemen, en een leverancier die een beding
   nodig heeft om werk te blijven tonen dat een klant hem heeft gevraagd weg te halen, heeft een groter probleem dan een
   portfolio."
   NIEUW: "En je kunt dit op elk moment intrekken, in VISUAILS Studio of met één regel per e-mail, ook jaren later en ook
   voor werk dat al op onze site staat; dan halen wij het binnen een week weg. Wij vragen het liever dan dat wij het
   aannemen." ("een week" komt uit de code, net als in privacy §2.)

**Voorwaarden, Voorrang bij levering (L-16, NL en EN):**
OUD: "Betaal je op een werkdag vóór 15:00, dan leveren we uiterlijk de volgende werkdag om 17:00; betaal je later, dan …"
NIEUW: "Zijn je betaling én al je foto's op een werkdag vóór 15:00 binnen, dan leveren we uiterlijk de volgende werkdag om
17:00; komen ze later binnen, dan …" (de uren komen uit de code).

**Privacy §8 (NL, `src/pages/nl/privacy.astro`):**
OUD: "Het meeste blijft binnen de Europese Economische Ruimte. Het genereren gebeurt bij een partij in Spanje, de betalingen
bij een partij in Nederland."
NIEUW: "Ons contract voor het genereren is met een partij in Spanje (Magnific). De modellen die daar voor ons draaien, zijn
van Google in de Verenigde Staten en ByteDance in Singapore; zij verwerken je beeld dus buiten de Europese Economische
Ruimte, onder standaardcontractbepalingen die Magnific met hen sloot. De betalingen lopen via een partij in Nederland."
EN (`privacy.astro`): "Our contract for the generation is with a party in Spain (Magnific). The models that run there for us
are made by Google in the United States and ByteDance in Singapore, so they process your image outside the European Economic
Area, under Standard Contractual Clauses that Magnific concluded with them. Payments go through a party in the Netherlands."

**AI Act (`src/components/AiActHal.astro`; de pagina heeft nu de datum 17 november 2026):**
- NL, nieuw na "…vastgelegd met de datum.": "Doe je 7 dagen na de levering niets, dan ronden wij de bestelling af en geldt
  de levering als aanvaard. Dat leggen we met de datum vast bij je bestelling, en je krijgt er een mail over."
- NL blok 4, OUD: "Jij keurt elk beeld goed — voordat je bestelling wordt afgerond." NIEUW: "… voordat je bestelling wordt
  afgerond, of na 7 dagen zonder reactie geldt de levering als aanvaard."
- EN idem: "Do nothing for 7 days after delivery, and we complete the order: the delivery then counts as accepted. …" en
  "… or the delivery counts as accepted after 7 days without a reply."
- Let op: het staat vast bij de bestelling, niet bij elk beeld. Zo werkt het stil afronden echt.

**`LICENTIE.txt` in de levermap (`src/lib/scaffold.js`):**
OUD: "VISUAILS mag deze beelden in zijn eigen portfolio laten zien, tenzij je daar per e-mail bezwaar tegen maakt …"
NIEUW: "VISUAILS laat deze beelden alleen in zijn portfolio zien als je daar na de levering ja op zegt. Dat ja kun je altijd
intrekken, in VISUAILS Studio of per e-mail. Is het product nog niet uitgebracht, dan gebeurt dat pas na de lancering,
tenzij je apart schriftelijk laat weten dat het eerder mag." (EN idem.) De leverbrief zegt nu "Je mag deze beelden overal
gebruiken." in plaats van "De beelden zijn van jou."

**Cookiebeleid (P10-04, NL en EN):** bij "Zolang een tabblad open is" staat er nu ook dat de gegevens uit stap 3 van een
bestelling bewaard blijven, zodat ze er na verversen nog staan (`vis-bestelling-s3`).

**Kortere koppen (zodat ze op de telefoon op 2 regels passen):**
- Verwerkersovereenkomst NL: "4. Soort persoonsgegevens en categorieën betrokkenen" → "4. Persoonsgegevens en betrokkenen";
  "11. Doorgifte buiten de Europese Economische Ruimte" → "11. Doorgifte buiten de EER".
- Verwerkersovereenkomst EN: "4. Type of personal data and categories of data subjects" → "4. Personal data and data
  subjects"; "11. Transfers outside the European Economic Area" → "11. Transfers outside the EEA".
  Alleen de koppen; de tekst eronder noemt beide begrippen en de afkorting al.
- Bedankpagina: NL "Betaald met je credits — we gaan aan de slag." → "Betaald met credits — we beginnen."; EN "Paid with
  your credits — we are on it." → "Paid with credits — we are on it."; EN "Your company already had a sample." → "Your
  company had a sample already."
- /nl/start: "Wat heb je nodig? Daarna kies je de look." → "Wat heb je nodig? Dan kies je de look."

## Toetsen

16 nieuwe toetsen, alle groen:
- zonder build: `levering-118-admin` (54), `-bestelformulier` (73), `-bestellen` (53), `-bestelpagina` (38), `-betalen`
  (41), `-herstel` (36), `-integratie-ia` (61), `-ontwerp` (24), `-opmaat` (29), `-snelheid` (20), `-start-plans` (60),
  `-studio` (27), `-teksten` (56), `-toegankelijkheid` (43), `-voorkant` (70);
- na de build: `levering-118-herstel-browser` (17).
(Alle als `tests/levering-118-*.test.mjs`, en alle in de keten van `package.json`.)

Bijgewerkt omdat ze het oude gedrag vastpinden:
- `order-api` (P4-08: 303 terug naar het formulier in plaats van een witte 429), `klantmails-a2` (W2-15: het nieuwe
  onderwerp), `doorloop-27b` (B1-01: de proefcontrole krijgt naam, postcode en btw-nummer mee), `klant-scheiding` (L-07:
  een bestaand adres krijgt nu bewust een inlogcode, niets naar Mollie).
- `op-maat-offerte`, `ronde9` F44, `blind91-r-studiolink` en `eigen-stijl` (P4-06: zonder adres gaat de link eerst naar de
  factuurstap op /o/).
- `scaffold` en `legal` (P6-03: opt-in in plaats van opt-out), `juridische-datums` en `levering-117-tekst-bewaren` (/ai-act
  staat nu op de dag; de maandvorm wordt op het cookiebeleid getoetst).
- `doorloop-90` (L-16: voorrang vanaf betaald én foto's), `lijst87-g-beheer` (L-16: de nieuwe voorrangszin),
  `btw-verlegd-vinkje` (L-10: geen verlegging bij een afgekeurd nummer).
- `doorloop` (P9-13: de Engelse creditherinnering heet nu "… credits expire in 7 days"), `nu-doen` (P4-09: een merkmodel
  plant op betaling + 3 werkdagen), `agenda` (P4-09: "werkdagen" mag op de merkmodelpagina's, want /admin plant echt in
  werkdagen).
- `vanaf-bedragen`, `telefoon-58`, `naloop-a2-browser` (P2-12: de uitlegregel staat direct onder het vanaf-bedrag; "ÉÉN"
  in hoofdletters).
- `nav` (P11-03: geen role=menu meer).
- Browsertoetsen: `concept-browser` (P2-07: het formulier herstelt vanzelf), `werkplaats-browser` (P2-05: de tip wisselt
  niet vanzelf en staat in de pagina; P1-06: het nieuwe blok verhouding), `stap2-kaart-browser` (P2-05: alleen het label).
- Eigen toetsen van 118 die mee moesten: `levering-118-bestelformulier` en `-voorkant` (één voorrangszin, spatie vóór de
  regelbreuk), `-ontwerp` en `-toegankelijkheid` (hal.css zonder `:is()`), `-start-plans` (P11-04: de focus ook bij een
  klik).

- **De hele reeks** is gedraaid na een nieuwe build: 388 toetsen (306 snelle en 82 browsertoetsen), alle groen. `laptop90` zakte één keer in de volle reeks (beeld 0 van de video onder zware last, net als `opening90` bij 117); los gedraaid: 14/14. `agenda-dagen` en `invoice-issue` falen alleen tussen 00:00 en 01:00 Nederlandse tijd (ze vergelijken de UTC-datum met de Nederlandse); daarbuiten groen.
- **Nagespeeld op de lokale stack**, met de migraties erop en een browserronde op 390, 1280 en 200 % zoom: L-10, L-16,
  P10-03, B1-01, B1-11, W2-15, P8-02, P9-12, P12-02, P3-08, N3-01, N3-02 en P1-10 deden wat ze moeten. De vijf
  later-punten staan nergens in de site.
- **Bijgesteld na het naspelen:** "Nog N keuzes" verscheen nooit (P1-06, verkeerde kiezer); de focus bleef na een klik op
  /start op de pagina (P11-04); 19 koppen hadden 3 regels op 320–390 px (zie *Nalezen*); de twijfelproef stond niet op de
  bestelpagina en in Nu doen (B1-01); in hoog contrast was de aanloop van de bannerkop een vlek en het logo in de
  werkplaatsbalk onzichtbaar (P11-07); "Bestel je elders in de EU zonder btw-nummer…" stond ook bij een Belgische klant met
  een goed nummer (L-10); Studio zei "We hebben je bestelling en je bestanden binnen" zonder één foto, nu "We hebben je
  bestelling binnen, maar nog geen foto's. Voeg ze toe, dan plannen we hem in." Ook hersteld na de eerste reeks: een leeg
  formulier bewaarde een concept (P10-04), en "excl. btwEén product" zonder spatie (P2-12).
- `agenda-dagen` en `invoice-issue` vergelijken de datum in UTC met de Nederlandse. Tussen 00:00 en 01:00 Nederlandse tijd
  falen ze; dat staat los van deze levering (met de klok op 10:00 UTC: groen).
