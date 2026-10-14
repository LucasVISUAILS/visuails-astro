# Voorpagina — de opbouw, inclusief bannerbeelden

**23 september 2026.** De samengevoegde versie van VOORSTEL-VOORPAGINA.md
(analyse, controle, aanvullingen) als één blauwdruk om te keuren. De tekening
staat in `voorpagina-opbouw.html` — open die naast dit bestand.

Er is nog niets gebouwd.

---

## De twaalf blokken, van boven naar beneden

| # | Blok | Vraag van de bezoeker | Beeld | Status |
|---|---|---|---|---|
| 0 | **Opening** — etiket, kop met wisselwoord, één zin, twee knoppen, laptop | wat is het | de laptop | blijft (net gedaan) |
| 1 | **Maatlijn** — vier feiten | in één blik | — | blijft; derde feit wordt "Klein: zo snel mogelijk · vanaf 10: jouw eigen week" |
| 2 | **Dit stuur jij. Dit krijg je terug.** — één echt paar met schuifknop | is het goed | T-shirt voor/na (bestaat) | **nieuw** |
| 3 | **Van jouw foto naar je shop** — vier stations | hoe werkt het | roze jeans (bestaat) | blijft |
| 4 | **Wat we maken** — drie tegels + regel "Ook: …" | wat kan ik kiezen | drie diensttegels (bestaan) | blijft; deur-tegel weg, video krijgt "Aanvragen →" |
| 5 | **De stijlen** — strook die opzij scrolt | past het bij mijn merk | lifestyle-stijlen, catalog-stalen, **banner 3**, Still | **nieuw** |
| 6 | **Een gezicht zit erbij** — één rij van vijf | wat zit er nog meer in | vijf portretten (bestaan) | blijft, half zo hoog |
| 7 | **Editions** — één breed beeld, één zin, één link | en daarna? | **banner 1** (21:9) | **nieuw** |
| 8 | **Voor wie** — drie regels | is dit voor mij | — | **nieuw** |
| 9 | **Direct antwoord** — vier vragen, twee-bij-twee | wat als | — | blijft |
| 10 | **Proef €1** — slot | hoe begin ik | de vier jeans (bestaan) | blijft |
| 11 | **Trustlijn** | kan ik ze vertrouwen | — | blijft; later één regel reviews |

**Weg:** "De catalogset. De carrousel. Of allebei." · "Eén tarief per
product. Daalt met het aantal." · de vierde deur-tegel · de proefkaart die
linksboven over de kop verschijnt.

**Maat:** 10 → 12 blokken, maar 7.700 → ±6.700 px op 1440, omdat de twee
weggehaalde secties samen 1.900 px waren en de nieuwe blokken kort zijn (het
voor-en-na is 450, de strook 420, Editions 380, Voor wie 180).

---

## De bannerbeelden — drie, en waar ze staan

| | Beeld | Maat | Waar op de site |
|---|---|---|---|
| **Banner 1** | Liggend, één scène | 2400×1030 (21:9) + dezelfde scène op 2400×1350 (16:9) voor de telefoon | Voorpagina blok 7 · kop van /plans · de OG-afbeelding (1200×630-uitsnede) |
| **Banner 2** | Liggend, tweede scène | 2400×1350 (16:9) | Slotpaneel van /plans en /about; reserve voor social |
| **Banner 3** | Staand | 1080×1350 (4:5) | Voorpagina blok 5 (de Editions-kaart in de strook) · Studio, abonnementsblok |

Alle drie zijn **Editions-beelden**: beelden zoals een abonnee ze elke maand
krijgt. Dat is de reden dat ze op de pagina mogen — ze tonen de dienst, ze
versieren niet.

De kleurregel, hard: de **plek** in het palet (koelgrijze muur of grond,
puur zwart in de schaduwen), de **kleding** vrij, het **violet alleen als
licht** — een lamp, een reflectie, een LED-strip op de rand van een raam.
Nooit als vlak, nooit op kleding. Zo blijft de 2%-regel uit KLEURENSCHEMA.md
overeind: het accent is klein en het is licht dat ergens op valt.

En je eigen promptregel: het **moment** eerst, dan plek, licht, pose. Ik
schrijf de drie prompts (drie versies elk, visuails-style-methode) zodra je
zegt dat de opbouw goed is.

Wat ik níét zou doen: een banner onder de opening of achter de kop. De laptop
ís het beeld van de opening; een foto erachter maakt er weer een "foto onder
een sluier" van, en dat is de vorm die je op 7 september hebt afgekeurd.

---

## Per blok, kort

**0 · Opening.** Zoals hij nu staat. De wisselreeks blijft
productbeelden → catalogfoto's → lifestylebeelden → productvideo's, omdat
video in blok 4 een echte deur krijgt.

**1 · Maatlijn.** Derde feit uit `turnaround()` in pricing.js, twee
waarheden in één regel. De andere drie ongewijzigd.

**2 · Dit stuur jij. Dit krijg je terug.** `Compare.astro` op volle breedte
(5:4), het paar `catalog-before-1x1` / `catalog-after`, daaronder één
monoregel: *ingestuurd met een telefoon · 4 beelden terug · 2048 px · jpg,
png, webp*. Geen kop erboven nodig; de regel eronder is de kop.

**3 · De band.** Ongewijzigd.

**4 · Wat we maken.** Drie tegels. De videotegel krijgt "Aanvragen →" naar
/contact met het onderwerp ingevuld, zolang `VIDEO_OP_AANVRAAG` aanstaat;
zet je de vlag uit, dan wordt het vanzelf weer een bestelknop. De regel
eronder: *Ook: Hooks · Editions · werk op maat →* naar /start.

**5 · De stijlen.** `Stijlstrook.astro`, leest uit `styles.js`
(lifestyle), `backgrounds.js` (één catalog-kaart met drie stalen),
`komendeStijlen.js` (Still, gestippeld, zonder link) en één Editions-kaart
(banner 3, naar /plans). Scroll-snap, twee pijlen, toetsenbord, teller
"6 van 8", stil bij reduced-motion. Op de telefoon anderhalve kaart in
beeld. Elke kaart linkt naar `#<slug>` op zijn dienstpagina — **die ankers
moeten er nog komen** (nu alleen `#looks`).

Geen zelfdraaiende diavoorstelling; wel, als je beweging wilt, een langzame
doorlopende strook die stilstaat onder de muis — tweede ronde.

**6 · Een gezicht zit erbij.** Kop links, vijf portretten rechts, twee links.
Wat er nu staat (tien koppen, drie regels tekst) wordt de helft.

**7 · Editions.** Donker paneel, banner 1 op volle breedte, daaronder één zin
en één link naar /plans. Beeld náást de tekst, niet eronder.

**8 · Voor wie.** Drie regels met een haarlijn, geen kaarten:
- *Je begint een merk en hebt twaalf producten* → catalogset, vanaf één product
- *Je hebt een shop met honderden sku's* → vanaf 10 producten je eigen week op de kalender
- *Je bestelt voor klanten (bureau, fotograaf)* → één account, per bestelling een ander merk

**9 · Direct antwoord.** Ongewijzigd.

**10 · Proef €1.** Ongewijzigd (woorden links, de vier jeans rechts).

**11 · Trustlijn.** Ongewijzigd; één regel erbij zodra er drie echte
reviews zijn. Optioneel: één regel met je voornaam.

---

## Erbuiten, maar hoort bij dezelfde ronde

1. **De proefkaart** (linksboven na de cookiekeuze) weg — drie keer €1 in één scherm.
2. **Taaldetectie op `/`** — `Accept-Language` in de Worker, met cookie.
3. **Hooks en Editions uit het hoofdmenu** tot ze te bestellen zijn.
4. **De galerij** — één blok "zo ziet een levering eruit" bovenaan.
5. **De twintig conceptpagina's** uit `src/pages/concept/` — weg, git bewaart ze.
6. **Lead magnet** — de Playbook met een e-mailveld in de voettekst en op /guides (Resend audiences).

---

## Bouwvolgorde

1. Weg: De set, Tarieven, de deur-tegel, de proefkaart. — een uur
2. Blok 2 (voor-en-na) en het derde maatlijnfeit. — een dagdeel
3. Blok 5 (de strook) + de ankers op /lifestyle en /catalog. — een dag
4. Blok 4 (video-deur), 6 (gezichten kleiner), 8 (voor wie). — een dagdeel
5. Blok 7 (Editions) — zodra banner 1 er is; tot dan staat het blok er niet.
6. Meten: leesbaarheid, spatiescan, telefoon 320/360/390, de volledige testreeks.

Wat ik van jou nodig heb: **(a)** akkoord op de opbouw, **(b)** welke stijlen
in de strook horen (de huidige vier, of de nieuwe), **(c)** de drie
bannerbeelden — of het sein dat ik de prompts mag schrijven.
