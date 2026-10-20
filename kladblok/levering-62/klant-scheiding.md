# Klant tegen klant — de routes met klantgegevens (19 oktober 2026)

Lucas vroeg of zijn RLS aan stond. De site draait op Cloudflare D1; die kent geen RLS, en de
browser praat nooit met de database. Het vangnet is daarom een toets:
`tests/klant-scheiding.test.mjs` (`npm run test:scheiding`, in de keten). Klant B probeert
met zijn eigen sessie bij de gegevens van klant A, op elke route die één klant leest of
wijzigt. Elke route wordt ook door A zelf aangeroepen (de controle). Met sabotage nagekeken:
een `OR 1=1` in de eigendomscontrole van de factuur, de goedkeuring en het bestand op de
privélink maakt de toets rood.

## Wat de toets dekt (144 controles)

- **Lezen onder /account:** instellingen van een bestelling, het zip-archief, een geleverd
  beeld, een eigen upload, een factuur, een abonnementsfactuur, een creditnota, het voorbeeld
  van een eigen gezicht en van een eigen look. B krijgt geen 200, niets van A in het
  antwoord en er wordt geen bestand van A uit R2 gelezen.
- **/account/me en de schermen van Studio** (overzicht, bestellingen, facturen, merkkit,
  gegevens, abonnement, terug van Mollie): niets van A.
- **Wijzigen onder /account:** vastzetten van gezicht en look, goedkeuren en terugdraaien,
  de hele bestelling of één product goedkeuren, een revisieronde, feedback, de ronde
  nakijken, betalen, foto's weghalen en een formaat aanvragen. Daarna is elke tabel gelijk
  (op B's eigen sessie na) en ging er niets naar R2 of Mollie.
- **De privélink:** een beeld van A via het kenmerk van B, de pagina en het archief van B,
  en goedkeuren, terugdraaien, alles goedkeuren en een ronde via het kenmerk van B.
- **De open routes (blok 5):** bestellen en een abonnement afsluiten met het e-mailadres van A,
  zonder sessie. Zie hieronder.

De inventaris vond op /account en /o geen enkel gat: elke route bindt het kenmerk uit de URL
of het formulier aan de klant van de sessie of aan het geheime kenmerk van de privélink.

## De open routes: twee gaten dicht (19 oktober 2026, Lucas: "dicht de gaten")

Zonder account bestellen en een abonnement afsluiten kan iedereen. De klant is dan het
e-mailadres dat iemand intypt. Wie het adres van een bestaande klant kende, kon zo iets in
diens naam doen. Dat is nu dicht:

1. **/api/order (en het contactformulier).** Zonder inlog maakt het formulier een nieuwe
   klant aan, maar laat het een bestaande klant precies zoals hij is, ook zijn lege velden
   (`klantUitFormulier()` in `functions/api/order.js`). Zijn opgeslagen land en adres, zijn
   eigen look (`cs-<nr>`) en zijn eigen gezicht (`c<nr>`) gelden alleen met zijn sessie:
   Studio bestelt via /account/order, net als de credits en het tegoed. Zonder sessie gaat de
   look of het gezicht stil uit de bestelling, met een regel in het logboek. De bestelling
   zelf komt wel binnen en draagt haar eigen naam, adres en btw-nummer.
2. **/api/plan.** Een adres dat al bij een klant hoort, krijgt altijd hetzelfde antwoord,
   wat er ook loopt: terug naar het formulier met "Dit e-mailadres hoort al bij een account.
   Log in; daarna sluit je hier je abonnement af" (`?fout=account`). Er verandert niets in de
   database en er gaat niets naar Mollie. Een nieuw adres gaat zoals altijd door naar de
   betaling. Een ingelogde klant sluit af via /account/plan/start, achter zijn sessie.

**Nagekeken:** blok 5 van de toets doet beide als buitenstaander en als de klant zelf (de
controle). Op de code van vóór vandaag faalt hij op 10 punten, nu op 0.
**Aangepaste toetsen:** `tests/afvink-8-okt.test.mjs` ("een leeg veld mag wel gevuld
worden" is nu "ook een leeg veld blijft leeg") en `tests/eigen-stijl.test.mjs` (de eigen
look bestelt met de sessie, zoals Studio; zonder sessie valt hij weg).

## Wat bewust open blijft

- **/api/order-status en /api/order-pay** werken op bestelkenmerk. Het kenmerk is geen geheim
  (het staat op bankafschriften). Je leest alleen ja/nee-standen (betaald, geannuleerd), en
  je kunt een onbetaalde bestelling van een ander betalen. Daar verliest niemand iets mee.
- **/account/plan/return?sub=…** zonder sessie zegt of dat abonnement actief is. Dat is de
  terugkeer van Mollie voor wie net betaalde en nog niet ingelogd is. Je moet het
  abonnementskenmerk kennen, en dat komt alleen in de mail van de klant zelf.
