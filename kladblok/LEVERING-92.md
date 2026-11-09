# Levering 92 · Lijst 87, de taalronde en het knoppensysteem

**9 november 2026. Staat alleen in je map; je rolt zelf uit met `UITROLLEN.bat`.** Komt bovenop levering 91 (zie
`LEVERING-91.md`; die zit er ook in, net als 90). Migraties: 0069 en 0070 (uit 91); deze ronde voegt er geen toe.
Opruimen: `_opruimen/LIJST.txt`, blok "9 november 2026 · moet weg (levering 91/92 …)".

## 1 · Lijst 87, de beslissingen (alles zoals je koos)

- **Geld en voorwaarden:** de factuur toont extra hoeken, 4K, eigen look en voorrang als eigen regels (B07). Namen
  en adressen alleen in Latijnse letters, emoji gaan stil uit de pdf (B08). Goedkeuren op de btw-lijst kan pas als
  je aanvinkt dat de klant de zakelijke verklaring bevestigde (B09). Een postcodelijst voor gebieden buiten het
  btw-gebied stuurt een bestelling naar de btw-lijst (B10; laat de lijst nakijken door je boekhouder). Voorwaarden
  §6, §9 en §9a aangevuld (B14, B15, B19). "Voorrang gemist" in Nu doen (B16). Testtegoed in Klaar voor live
  (B20). Frans btw-nummer met "FR" ervoor (B21).
- **Tijd:** vóór het betalen staat de echte leverdag (C07). Beelden in `/img/hal` krijgen een cacheteken (C16).
- **Uploads:** zachte melding bij een afgekapte JPEG (D08), uploads gaan vanzelf verder als de verbinding terugkomt
  (D11), een klein duimpje voor /admin (D13), een zin over locatiegegevens in /privacy (D07).
- **Mail en beelden:** kortere onderwerpen (E06), de klant als antwoordadres in studiomails (E07), een rand om de
  mailknop (E09). De beelden met "STUDIO 95" en Room 84 blijven (E13 teruggedraaid op 9 november: verzonnen merken,
  zoals je liet weten). "Voorbeeld merkmodel" (E15), een neutrale alt-tekst (E16).
- **Ronde 90:** "zoals jij het ziet" (F4), de 404 zonder canonical (S2), overal "Custom" (S6), grotere tikvlakken
  (S12), "YOURBRAND" in het Engels (S13), de voorbeeldpagina's weg met een redirect (I1), "Op aanvraag" met een
  offerteknop (I2).
- **Beveiliging:** zonder Turnstile-sleutels gelden de strenge grenzen (A06), de checklistmail alleen bij een nieuw
  adres (A08), een zin over de logs van Cloudflare in /privacy (A10).
- De twee oude testbestellingen stonden al verborgen; live staan ze nog in de btw-lijst omdat daar nog de oude
  versie draait. Na deze uitrol zijn ze weg.

## 2 · De taalronde

Elke zin op de site, in Studio, op de bestelpagina, in /admin en in de mails nagelezen (NL en EN): 207 verbeteringen.
O.a. de kapotte kop op de Motion-pagina's ("Motion eging."), "je bank geeft de machtiging af" (jij geeft hem af),
de leverdatum wordt bij binnenkomst *gereserveerd*, "op het pad van je dashboard", oude namen (portaal, privélink,
proefbeeld) gelijkgetrokken, anglicismen (checken, matchen, ads, grade). Het Engels blijft Brits, zoals je koos.
Niet aangeraakt: "Indicatieve tarieven" in de voorwaarden (jouw keuze) en de vijf vragen hieronder.

## 3 · Het knoppensysteem (lijst 88 en 89)

- **De vulling zegt hoe belangrijk een knop is, het icoon wat hij doet.** Per blok één volle knop; de rest een lijn;
  naar een andere pagina is een tekstlink. Elke knop heeft een rol met zijn eigen icoon en beweging.
- **Maten:** 36 · 44 · 52 px (gemeten), letter 600, altijd een pil. Op een aanraakscherm is een kleine knop 44 om op
  te tikken.
- **Vijf nieuwe iconen:** uploaden, ongedaan maken, mail, verwijderen, uitloggen. Elk icoon beweegt zoals de knop doet
  (de pijl schuift in één stuk, de download zakt, de plus draait, het potlood schrijft…); het vinkje zet zich als een
  stempel neer bij het klikken.
- **/admin, gevaarlijke knoppen:** annuleren, verwijderen, wissen, deactiveren … openen eerst "Zeker weten? Dit kan
  niet terug." op de pagina zelf, met een knop "Ja, …". De server doet niets anders.
- **Mail:** één knop per mail; de rest zijn tekstlinks.
- **Eén bron:** `src/styles/knoppen.css` (de kopie `public/knoppen.css` voor /admin en de bestelpagina maak je met
  `node scripts/knoppen-kopie.mjs`; een toets kijkt of ze gelijk zijn).
- **Wat je moet weten:** "Praat met ons", "Neem contact op" en "Terug naar home" zijn nu een lijn (naar elders), dus
  de slotblokken van Editions, Hooks en AI Act hebben geen volle knop meer. "Kies je look" en "Kies een abonnement"
  zijn vol gebleven (doorgaan). Zeg het als je dat anders wilt.

## 4 · Toetsen

Volledige reeks: 347 stappen groen. De eerste uitrol stopte op `halvoorbeeld`: de lege mappen `src/pages/voorbeeld`
bleven na het opruimen staan; de toets kijkt nu naar bestanden, niet naar mappen (de browsertoetsen die onder drukte omvielen, los opnieuw gedraaid en groen).
Nieuw: `lijst87-*` (8), `knoppen` en `knoppen-browser`.

## 5 · Voor jou

1. Turnstile-sleutels op de Worker zetten (`TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY`); tot dan 3 bestellingen per
   10 minuten en 5 uploadreeksen per dag per IP, ook voor jezelf.
2. De Resend-stappen voor de Studiobrief (zie LEVERING-91 §8).
3. DNS: DNSSEC aan, Namecheap uit SPF, de adressen hello@/orders@/dmarc@ nalopen. Workers Paid vóór live.
4. Eén testbestelling van 15 producten × 4 foto's op snelle wifi, en in Cloudflare kijken of `/api/upload` 429's geeft.
5. De postcodelijst (B10) laten nakijken.
6. De nieuwe zinnen in voorwaarden §6, §9, §9a en privacy §3 nalezen.

**Vijf vragen uit de taalronde** (niets aan veranderd): de spaartermijn van credits (Studio "tot eind volgende maand"
tegen de voorwaarden "tot 3 maanden"); de levertijd in Studio ("2 tot 4 dagen") tegen de site ("vaak binnen een
dag"); PNG, JPG én WebP op de bestelpagina tegen "JPG standaard"; "Indicatieve tarieven"; en of `custom-models-01/02`
en de telefoonfoto van het shirt van echte klanten zijn.
