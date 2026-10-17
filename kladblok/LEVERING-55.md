# Levering 55 — de mails, de beweging en wat uit afvinklijst 35 kwam (17 oktober 2026)

Uit afvinklijst 34 (E: de mails, F: de beweging, allebei "doen") en afvinklijst 35 (v35-volgende a).
Uitrollen met **UITROLLEN.bat**, zonder migratie. Levering 54 (en de leveringen ervoor die nog niet
uitgerold waren) gaan mee als ze nog niet live staan.

De homepage is niet omgebouwd. De beweging geldt voor elke pagina in de hal, dus ook daar.

## 1. De mails (afvinklijst 34, E)

- Het kenmerk onder de kop in de vaste breedte-letter, als een label op een doos:
  REFERENTIE&nbsp;&nbsp;**VIS-2608-4471** (het nummer vet in inkt). In mail is dat Menlo/Consolas: een
  webletter laadt daar niet betrouwbaar.
- De lijn onder het briefhoofd begint met een violet streepje met een schuin eind op 53°
  (`public/img/mail/snede.png`).
- De knop en het prijsvak krijgen één zachte hoek linksboven, zoals op de site. Outlook op Windows
  toont ze recht; dat is goed zo.
- De stappen in de bestelmail: 01, 02, 03 in de mono.
- Onderaan zakt het woordmerk in lila in de voet, door de rand afgesneden
  (`public/img/mail/voet-woordmerk.png`). Een beeld, dus ook goed in de donkere stand.
- Beide beelden maakt `npm run mail:assets` (scripts/make-mail-assets.mjs); de bestaande
  mailbeelden blijven precies hetzelfde.

## 2. De beweging (afvinklijst 34, F)

- **Een blok verschijnt** met de snede van 53°: een wis van links naar rechts in 0,62 s, in plaats van
  omhoog schuiven en vervagen. De helling is 0,75 × de hoogte van het blok, en de wis loopt 24 px
  buiten het blok door. Het is een masker, geen clip-path: zo blijft de muis werken terwijl het
  blok verschijnt.
- **Het getal** slaat om als een stationsbord in plaats van uit een waas te komen: zes tikken, elk
  cijfer stopt op zijn eigen tik (`src/scripts/omslag.js`). De echte tekst blijft in de pagina staan,
  voor schermlezers en zoekmachines.
- **Laden**: geen draaiend rondje. Op de verzendknop van het bestelformulier en bij de Studiobrief
  springt het vlagje van de V los en terug. De knop blijft daarbij in zijn kleur.
- **De voortgang van een strook**: een violet balkje met een schuine kop, dat in vier stappen
  verspringt.
- Minder beweging: alles staat meteen in de eindstand.
- Het vinkje dat goedkeurt (b-vink) volgt met Studio (levering 56).

## 3. Uit afvinklijst 35

- **De focusrand** (g-focus, Lucas: *"subtieler en iets unieker en meer VISUAILS style"*): één violette
  rand van 2 px op een witte kier van 3,5 px (de kier van het merk), zonder de lila echo.
- **De grijze knop** (g-knoppen): het grijs zat alleen in mijn schermafbeelding, de knop vaagde nog in.
  In het echt is hij inkt. Omdat er nu niets meer invaagt, bestaat die halfdoorzichtige stand niet meer.
  Een knop die bezig is wordt ook niet meer grijs.
- **De chips** (v35-chips b): los, als plaatje met één zachte hoek, in IBM Plex Mono, hoofdletters.
- **De pilletjes op foto's** (v35-pillen a): geen bolletje meer, de naam in mono, op een plaatje met
  één zachte hoek. Ze mogen afbreken als ze niet op één regel passen (op 320 px breed).
- **Twee knoppen op de telefoon** (v35-telefoon b): naast elkaar met de snede als ze passen
  (`src/scripts/knoppaar.js` meet dat per rij). Op 390 px breed passen 24 van de 39 paren, op 360 px 12.
  De rest staat onder elkaar, zoals eerst.
- **De inktknop van het bestelformulier** had nog de witte cirkel met een lijnpijl (die zag mijn meting
  in 54 niet: hij zat in een ::after). Nu zoals elke knop: één zachte hoek, de pijl in twee delen.
- Het keuzevak "soort beeld" in de galerij (telefoon) heeft het gevulde uitklap-icoon.
- **De schuine pijl** (Lucas, 08:03: *"Hover effect van pijl schuin omhoog is wat apart"*): hij valt onder
  de muis niet meer uit elkaar. Kop en schacht springen samen 3 px schuin omhoog, op 53°, in twee
  stappen, net als de pijl in de balk. De rechte pijl schuift nog wel uit elkaar.
- Studio, /admin en de privélink (v35-studio a): levering 56.

## 4. Het merkboek

Los van de site: het merkboek staat als pagina bij je artifacts ("VISUAILS Merkboek"), in de opmaak van
het ontwerpplan, en is te downloaden als PDF en als HTML.

## Toetsen

Testreeks 257/257 (21 min 2 s). Daarna is alleen de regel van de schuine pijl veranderd; hal-voorbeeld
(130/130) en telefoon-tekst (32/32) daarna nog eens gedraaid. Aangepast: `tests/mails-merk.test.mjs`, `tests/mails-merk-browser.test.mjs` en
`tests/klantmails-a2.test.mjs` lezen het kenmerk nu ook als het nummer in een eigen `<span>` staat, en de
mono van de mails telt als toegestane letter. De controle op een kaal nummer onder de kop is strenger
geworden: hij kijkt nu naar de tekst zonder opmaak.

**Na het eerste uitrollen (08:19):** `test:mailsmerk-browser` faalde bij jou 7 keer op "de achtergrond is
donker gemaakt". Niet de mails: de toets doet de donkere stand van Gmail na met een functie die alleen
de volledige Chromium heeft, en op jouw laptop startte Playwright de kleine "headless shell". De toets
start nu eerst de volledige Chromium van Playwright, dan je eigen Chrome of Edge. Kan geen van allen de
donkere stand nadoen, dan zegt hij dat en slaat hij dat deel over, in plaats van te falen.

