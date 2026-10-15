# Levering 52 — 15 oktober 2026

Afvinklijst 31: alles doen, en bij alle zes vragen a. Op één na zit alles erin: de terugkeer met een sleutel (v31-terugkeer) heb ik gebouwd en weer weggehaald, zie deel 5. Daarna je bericht van 20:42 over stap 3 op de voorpagina. v31-afbouw = a en v31-kolom = a betekenen: zo laten, dus daar is niets veranderd.

Levering 51 staat er ook in. Had je die nog niet uitgerold, dan gaan ze samen mee, met één commitbericht.

● = nieuwe of veranderde tekst die de klant ziet. Eerst NL, daaronder EN.

---

## 1 · Stap 3 op de voorpagina: alleen goedkeuren (bericht 20:42)

- De revisie is uit de animatie: geen "Revisie: kleur", geen glans en geen "Opnieuw geleverd" meer.
- Nu geeft elk beeld even mee, alsof iemand erop tikt, en krijgt dan zijn vinkje. Daarna komt "4 van 4 goedgekeurd".
- De tikken vallen op 0,45, 0,9, 1,25 en 1,75 s. Dat tempo is met opzet niet gelijk: zo keurt iemand die elk beeld even bekijkt.
- Stap 3 duurt weer 3,0 s (was 3,6). Bij minder beweging staan de vinkjes er meteen.
- De zin in de uitlegbalk noemt de revisie nog. Dat staat als vraag in afvinklijst 32 (mijn advies: laten staan).

## 2 · Een terugboeking stopt de incasso (v31-terugboeking = a)

- **Bij een terugboeking stopt de site ook het Mollie-abonnement; het mandaat blijft staan.** De mail aan de klant zei al "er wordt niets afgeschreven", en dat klopt nu. De studiomail heeft een regel "Incasso bij Mollie: gestopt". Lukte het stoppen niet, dan staat er LET OP: stop het dan zelf in het Mollie-dashboard.
- **Draait Mollie de terugboeking terug:**
  - de site maakt een nieuw Mollie-abonnement, vanaf de volgende termijndag;
  - de bevroren credits komen vrij;
  - het abonnement loopt weer.

  Lukt het nieuwe Mollie-abonnement niet, dan blijft het abonnement stilstaan. Dat zie je in Nu doen, en de studiomail zegt het.
- **/admin bij de klant, "Weer laten lopen".** Gebruik dit als het met de klant anders rond is: hij betaalde het over, of de bank draait de terugboeking niet terug.
  - Er komt een nieuw Mollie-abonnement vanaf de volgende termijndag. De teruggeboekte termijn wordt niet opnieuw afgeschreven.
  - Met het vinkje komen ook de bevroren credits vrij.
  - De klant krijgt de gewone mail "Je abonnement loopt weer".
  - In het logboek staat "Abonnement weer laten lopen".
- **Onderweg gevonden.** Een latere melding van Mollie over een oude termijn draagt het id van het Mollie-abonnement van toen. Denk aan een terugboeking, het terugdraaien daarvan, of een restitutie. Was dat abonnement gestopt (na een pauze, en nu ook na een terugboeking), dan gooide de webhook de melding weg als "onbekend abonnement". De bevroren credits kwamen dan nooit meer vrij. Nu herkent de webhook hem aan de betaling zelf.

## 3 · Abonnees in /admin (v31-abonnees = a)

- **/admin/abonnees (nieuw, in het menu onder Klanten).**
  - Per abonnement: de stand, de volgende afschrijving met het bedrag incl. btw, het saldo en wat aandacht vraagt. Staat er een overstap klaar, dan is het bedrag al het nieuwe.
  - Bovenaan staat wat geld kost: een terugboeking, een incasso die Mollie opgaf, of een abonnement zonder incasso bij Mollie.
  - Daaronder: lopend, op pauze, wachtend. Opgezegde en afgelopen abonnementen zijn ingeklapt.
  - Erboven staat de telling, met wat er per maand binnenkomt (excl. btw, alleen maandincasso's).
- **Bij de klant: een tabel Termijnen.** Elke betaling van het abonnement, met datum, maand, bedrag, Mollie-id, factuur en wat ermee gebeurde: betaald, mislukt, teruggeboekt, (deels) terugbetaald of "betaald (terugboeking teruggedraaid)". Bijkopen staan daar niet, die hebben hun eigen tabel. De stand bovenaan het paneel gebruikt dezelfde woorden als de pagina Abonnees.
- **Nu doen.** Drie soorten regels erbij, direct na de btw-controle, met een knop naar de klant:
  - een terugboeking;
  - een incasso die Mollie opgaf;
  - een abonnement dat al een dag loopt zonder incasso bij Mollie.

  Ze staan ook in het nachtrapport. Bij een bestelling ("Volgende stap") staan ze niet.
- Gemeten op 1440 en 390: alle tekst is minstens 11,5 px en haalt minstens 4,5:1. Niets is breder dan het scherm.

## 4 · Geen 401 meer voor bezoekers (v31-me = a)

- **Het cookie vis_in.** Inloggen (met de code of de link) zet naast vis_account een klein cookie: `vis_in=1`, op het hele domein, Secure en SameSite=Lax. Het is niet HttpOnly, want de pagina moet het lezen. Er staat alleen "1" in.
- **De site vraagt /account/me alleen als vis_in er staat.** Dat geldt voor de kop van de site, de melding onderin, de bedankpagina en het bestelformulier. Een bezoeker zonder account doet dus geen enkel verzoek meer, en de console blijft schoon. Gemeten in Chromium op / en /start/plan: 0 verzoeken, 0 fouten.
- **Wanneer vis_in weggaat.** Bij uitloggen, en bij een 401: een verlopen sessie geeft nog één 401, daarna niet meer. Het inlogscherm haalt een achtergebleven vis_in ook weg.
- **Wie al ingelogd was vóór deze levering**, heeft vis_in nog niet. Hij krijgt het de eerste keer dat hij Studio opent. Tot dan staat er op de site "Inloggen" in plaats van zijn naam. Dat merkt alleen wie nu al ingelogd is.
- Het cookiebeleid noemt vis_in nu. De datum blijft "oktober 2026".

● Cookiebeleid, de lijst van cookies
> vis_in — zegt de website dat je bent ingelogd, zodat die alleen dan je account opvraagt (bijvoorbeeld om je naam in de balk te zetten). Er staat niets in behalve een 1. Wordt gezet als je inlogt. Noodzakelijk. Verloopt samen met vis_account, of wanneer je uitlogt.
> vis_in — tells the website that you are signed in, so it only asks for your account then (to show your name in the bar, for example). It holds nothing but a 1. Set when you sign in. Essential. Expires together with vis_account, or when you sign out.

## 5 · Meteen ingelogd na de eerste betaling (v31-terugkeer = a): gebouwd, en weer weggehaald

Ik heb het gebouwd zoals in afvinklijst 31 stond: een eenmalige sleutel in de terugkeerlink van Mollie, 30 minuten geldig, alleen bij een betaalde eerste maand. Daarna las een aparte agent de code na, en die vond een gat dat mijn advies over het hoofd zag.

- **Het gat.** /start/plan kun je ook uitgelogd invullen, met elk e-mailadres. Bestaat er al een klant met dat adres (bijvoorbeeld iemand die alleen een bestelling plaatste), dan komt het abonnement op díe klant te staan. Met de sleutel kon iemand dus het adres van een ander invullen, zelf de eerste maand betalen, en stond hij daarna 30 dagen in Studio van die ander: zijn bestellingen, beelden, facturen en gegevens. Zonder dat ooit bewezen was dat het adres van hem was.
- Ook bij een nieuw adres is het niet veilig. Wie op die manier een account aanmaakt op het adres van een ander, ziet later ook wat die ander als gast bestelt.
- **Daarom zit het er niet in.** De terugkeer werkt zoals voorheen: het inlogscherm zegt dat de betaling gelukt is, en de welkomstmail heeft de inloglink.
- Een veilige versnelling staat als vraag in afvinklijst 32. De terugkeerpagina stuurt dan zelf de inlogcode naar het adres van het abonnement, met het invulveld er meteen bij. Dat is één stap, zonder dat iemand in een account komt dat niet van hem is.

**Wat de tweede controle verder vond, en wat er nu anders is:**

- **Een terugboeking op de EERSTE betaling zette het abonnement weer aan.** Sinds de incasso bij een terugboeking stopt, zag de webhook van die eerste betaling "nog geen Mollie-abonnement". Hij koppelde opnieuw, zette het stilgezette abonnement weer op actief en startte de incasso. Nu koppelt de site alleen een nieuw of lopend abonnement. Iets dat stilstaat of is opgezegd, blijft zo staan, ook een vooruitbetaald jaar.
- **Hervatten kon twee incasso's maken.** Dat gebeurde bij twee keer klikken op "Weer laten lopen", of als de knop gelijk liep met de webhook van een teruggedraaide terugboeking. Hervatten gebruikt nu hetzelfde slot als het koppelen, en kijkt eerst of de rij of Mollie al een abonnement heeft.
- **Een overstap die klaarstond, ging bij "Weer laten lopen" niet mee.** Na het terugdraaien van een terugboeking gebeurde hetzelfde: Mollie kreeg het oude bedrag, terwijl de webhook bij de volgende termijn het nieuwe plan verwacht. Nu krijgt Mollie het nieuwe bedrag, zoals bij hervatten in Studio.
- **Een incasso die al onderweg was toen het Mollie-abonnement stopte (SEPA duurt dagen), raakte zoek als hij later toch betaald werd.** Er volgden dan geen boeking, geen credits en geen factuur. Nu wordt hij geboekt op het nieuwste abonnement met hetzelfde Mollie-klant-id.
- **vis_in hield na 30 dagen op**, terwijl de sessie meeschuift bij gebruik. Nu verlengen elke Studio-pagina en elk geslaagd /account/me hem. Een 401 in de melding onderin haalt hem ook weg.

## Testreeks

- Nieuw: `test:aboqa52` (61 controles: de terugboeking via de webhook, "Weer laten lopen", Abonnees, Termijnen, Nu doen, vis_in, geen sleutel in de terugkeer, en alles uit de tweede controle) en `test:aboqa52-browser` (20, in Chromium: geen /account/me voor een bezoeker, de 401-opruiming, en contrast en breedte van Abonnees en de klantpagina op 1440 en 390).
- 20 browsertoetsen doen een ingelogde klant na, met een sessie of met een nep-antwoord op /account/me. Die zetten nu ook vis_in (tests/lib/vis-in.mjs), anders vraagt de pagina niets meer. Zonder die regel faalden `test:naloopa2browser`, `test:klantstand` en `test:creditsketen`.
- Bijgewerkt: `test:hoestappen29` (stap 3 zonder revisie, 3,0 s) en `test:doorloop27c` (de tijden van de uitleg).
- Stand: 255/255, alles groen (20 min).

## Uitrollen

OPRUIMEN.bat is niet nodig. Draai UITROLLEN.bat. Er is geen nieuwe migratie.
