# /admin zelf doorlopen — wat er misgaat en wat eraan is gedaan

**20 september 2026.** Lucas: *"Ik wil dat je bij elke stap waar dat mogelijk is de
website handmatig controleert (…) en kijkt bij bijvoorbeeld /admin hoe processen
beter kunnen door het zelf te gebruiken en aan te voelen waar je vast loopt of in
de war raakt."*

Dus gedaan: `/admin/orders/90/files` opgevraagd met echte nepdata en de echte CSS,
en gekeken alsof ik er een bestelling doorheen moest krijgen. Dit is wat er gebeurde,
op volgorde van hoe erg het was.

---

## 1 · Er waren drie manieren om te uploaden, en niets zei welke

Op één pagina stonden drie ingangen:

| Waar | Wat het is |
|---|---|
| Per vakje op het bord | `Choose File` → *Vervangen* / *Uploaden*, twaalf keer |
| Onder **De werkmap** | `Map uploaden` |
| Onder **Het afgewerkte werk uploaden** | `Uploaden` |

Ik wist niet welke ik moest hebben. Toen ik in de code keek, bleek het antwoord:
**de laatste twee posten naar exact hetzelfde endpoint** (`/admin/orders/<id>/deliver`)
en verschillen alleen in het attribuut `webkitdirectory` — de ene opent een
mapkiezer, de andere een bestandskiezer. Het was dus nooit een keuze tussen twee
manieren van werken, maar één handeling die in twee blokken uit elkaar was gegroeid,
met twee koppen en twee alinea's uitleg die elk een ánder verhaal vertelden.

**Wat er nu staat:** één blok, bovenaan, met drie genummerde stappen naast elkaar —
de lege mappen downloaden, de hele map terugzetten, of losse bestanden erbij. Eén
kop, één zin uitleg. De endpoints en de knoppen doen precies wat ze deden.

## 2 · Het werk stond vijfde

De pagina liep: wat de klant instuurde → het bord → de tabel met alle bestanden →
de werkmap → het uploaden → wanneer → de klant melden → notities. Elf koppen in één
kolom, en wat je er negen van de tien keer komt doen stond halverwege.

**Wat er nu staat:** het werk bovenaan, daarna het bord (dat is de uitkomst van het
werk), daarna pas de rest.

## 3 · Twee blokken die hetzelfde zeggen stonden allebei open

Het bord toont twaalf vakjes met miniaturen. De tabel "Alle geleverde bestanden"
toont diezelfde bestanden als regels met keuzelijsten. Twee weergaven van één
waarheid, allebei bewerkbaar, allebei permanent open. Plus "Aangeleverd door de
klant", waar je één keer in kijkt.

**Wat er nu staat:** allebei in een dichtgeklapte `<details>` — dezelfde vorm die
het abonnementenpaneel al gebruikt voor de correctieknop. Ze zijn er nog, ze liggen
alleen niet meer open op tafel.

## 4 · De uitleg herhaalde zich elke keer

Vier regels vetgedrukte waarschuwing over JPG/PNG/WEBP, met een commandoregel erin,
boven de uploadknop. Nuttig de eerste keer, ruis de honderdste.

**Wat er nu staat:** dichtgeklapt onder *"Waarom een upload de formaten niet omzet"*.

---

## Het resultaat, gemeten

De pagina was **4158 pixels** hoog en is **3206** — 23 procent korter, zonder dat er
één knop of één endpoint is verdwenen. Alle adminstesten blijven groen
(`test:admin`, `test:beheer`, `test:geld`, `test:order`).

---

## Wat ik NIET heb aangeraakt, en waarom

- **Het bord zelf.** Twaalf vakjes met een miniatuur en een vervangknop is de beste
  vorm die er voor dit werk is; daar viel niets te winnen.
- **De commandoregel `npm run deliver`.** Die kan niet weg zolang een Cloudflare
  Worker geen beeld kan omzetten (geen sharp, geen 128 MB om een PNG in te laden).
  Hij staat nu alleen niet meer in de weg.
- **De endpoints.** Dit is een herschikking en geen herbouw. De duurste fout op deze
  pagina is een bestelling die de deur uit gaat met de verkeerde beelden erin, en die
  fout maak je door de werking te veranderen terwijl je de opmaak opruimt.

---

## Wat er nog open staat op /admin

Deze twee zijn gezien maar nog niet aangepakt, want ze raken meer dan één scherm:

1. **De acht knoppen hebben geen rangorde.** "Naar de klant sturen", "Indeling
   opslaan", "Mappen downloaden", "Uploaden", "Nieuw beeld melden", "Nieuwe
   portaallink mailen", "Save", "Notitie toevoegen" — allemaal even zwaar. Er hoort
   er één primair te zijn per blok en de rest secundair.
2. **Het dashboard en de klantpagina zijn nog niet doorgelopen.** Deze ronde ging
   over de bestandenpagina, omdat daar het werk zit.
