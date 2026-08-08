# STIJL — hoe VISUAILS klinkt

> **Let op — prijs verouderd.** De bedragen in dit document zijn van de
> tekstronde zelf. De proefvisual kost sinds 8 augustus 2026 **€ 1**, niet
> € 0,99. Dit verslag is met opzet niet herschreven: het legt vast wat er op
> dat moment stond en waarom het veranderde. Neem hier dus geen prijs uit
> over — die staat in `src/data/pricing.js` (`AMOUNT.testSample`).

7 augustus 2026.

Dit document is niet bedacht. Het is afgeleid uit twee bronnen die er al waren:
`STEM-BRON.md` — Lucas over VISUAILS in doorlopende tekst — en negentig
letterlijke citaten van hem die verspreid door deze repo in commentaren staan.
Waar hieronder een regel staat, staat erbij uit welke zin van hem hij komt. Een
regel zonder bron is een mening, en die hoort hier niet.

Het geldt voor **elke tekst die een klant leest**: pagina's, knoppen, labels,
foutmeldingen, mails, het dashboard, het portaal. Niet voor commentaar in de
code — daar mag wél jargon staan, want die lezer werkt hier.

---

## Wat er mis was, en waarom

Elke pagina is eerst in het Engels geschreven en daarna zin voor zin naar het
Nederlands gezet. De copy-tabellen dwingen dat af: één sleutel per zin, dezelfde
sleutels in beide talen. Dat is goed voor de opmaak — geen ontbrekende tekst,
geen scheve markup — en slecht voor het proza, want het Nederlands krijgt de
Engelse zinsgrenzen cadeau en mag ze niet verleggen.

Het resultaat, letterlijk uit `CatalogPage.astro`:

> **EN** It is also where a small brand quietly starts to look established.
> **NL** Het is ook waar een klein merk stilletjes gevestigd begint te ogen.

Dat is geen Nederlands. Het is Engels met Nederlandse woorden erin, en het
gebeurt overal waar de Engelse zin een constructie gebruikt die het Nederlands
niet kent. **Het Nederlands is de brontaal voor alles wat een klant leest.** Het
Engels is de vertaling, en die mag zijn eigen zinsgrenzen kiezen. Dat is de
volgorde van de klanten: die zijn grotendeels Nederlands.

Een sleutel mag daarbij **meerdere zinnen** bevatten. Waar het Nederlands twee
korte zinnen wil en het Engels één lange, is dat goed — de sleutel bewaart de
gedachte, niet de interpunctie.

---

## De vijf regels

### 1 · Je, wij, ik — en wanneer welke

**Je** voor de klant, altijd. Nooit u, nooit "de klant" op een pagina die de
klant zelf leest. **Wij** voor het bedrijf, spaarzaam: de zin gaat over wat de
klant krijgt, niet over wat wij doen. **Ik** alleen waar het echt Lucas is — een
belofte, een oordeel, een reden om iets níet te doen.

> "Als jij ons je producten stuurt, wil ik dat je weet dat het goed komt."
> — `STEM-BRON.md`

Fout: "De klant ontvangt binnen 48 uur zijn beelden."
Goed: "Binnen 48 uur heb je je beelden."

### 2 · Elke knop draagt een zelfstandig naamwoord

Dit is de meest gemaakte fout op deze site en hij zit bijna alleen op knoppen:
een werkwoord plus een voornaamwoord, waar het zelfstandig naamwoord de hele
boodschap draagt.

> Lucas: *"'See it first 0,99' zegt eigenlijk niks. What do I need to see
> first? Klanten moeten niet nadenken over wat ze krijgen maar gelijk zien wat
> het is."*

De toets: dek de rest van de pagina af en lees alleen de knop. Weet je dan wat
er gebeurt als je erop drukt?

| Fout | Goed |
| --- | --- |
| Zie het eerst — € 0,99 | Stuur één productfoto, krijg één afgewerkt beeld — € 0,99 |
| Eén beeld van jouw product — € 0,99 | Eén afgewerkt beeld van jouw product — € 0,99 |
| Bekijk alle tien | Bekijk alle tien modellen |
| Zie wat je krijgt | Bekijk een geleverde bestelling |
| Vier dingen die de studio maakt | Vier soorten beeld die de studio maakt |

De tweede regel is er op 8 augustus 2026 bij gekomen, en hij is de strengste van
de vier. `Eén beeld van jouw product` haalt de eerste toets: er staat een
zelfstandig naamwoord in, en er staat bij van wie het product is. En hij is nóg
niet goed. Lucas: *"1 foto van je product zegt helemaal niets van wat je krijgt
en te zien krijgt in het volgende scherm, te vaag weer."*

Dus komt er een tweede toets bij, en die is zwaarder: **zegt de knop ook wat er
op het volgende scherm gebeurt?** Een knop die klopt maar de bezoeker verrast, is
een knop die niet klopt.

Hetzelfde geldt voor een getal: **een getal draagt zijn eenheid mee.** "€ 0,99"
is geen prijs zolang er niet bij staat waarvoor. "48 uur" is geen belofte zolang
er niet bij staat waarvan.

### 3 · Onze woorden zijn niet zijn woorden

Er is een woordenlijst ontstaan uit onze eigen werkverdeling, en die is op de
klantzijde beland. Een bezoeker heeft deze woorden nog nooit gezien:

| Nooit op de klantzijde | Wel |
| --- | --- |
| drop | bestelling · een hele collectie |
| venster / window | de leverdatum · de dagen die we voor je vrijhouden |
| gereserveerd venster | een vastgezette leverdatum |
| wachtrij / queue | de normale doorlooptijd |
| staffel / ladder / prijsladder | de prijs per product · alle prijzen per aantal |
| trede / rung | een stap in het aantal · één product erbij |
| scope | wat je bestelt |
| brief / briefing | wat je ons vertelt · je notitie |
| capaciteitspoort / capacity gate | de agendacheck · of er nog plek is |
| capaciteitsagenda / capacity calendar | de agenda |
| pipeline | de productie · onze werkwijze |
| brand kit | je vaste look · your look |
| full outfit | een compleet setje: broek, top en schoenen samen |
| attended / unattended · tier 0/1 | (nooit noemen; beschrijf het verschil) |
| intake | een gesprek vooraf |

De regel erachter is algemener dan de tabel: **als een woord alleen klopt omdat
je weet hoe het hier achter de schermen werkt, is het het verkeerde woord.**

**Twee uitzonderingen, en alleen deze twee.** `drop` blijft staan waar het de
collectielancering van de klant is — "voor drops met lawaai" is gewone modetaal
en niet ons woord. `window` blijft staan waar het een echt raam of een lichtbron
is ("daylight through a window").

`brand kit` stond er eerst bij als derde uitzondering, omdat Lucas die naam zelf
gebruikt. Dat was de verkeerde afweging, en hij zei het meteen: *"brand kit ook
aanpassen naar iets logisch."* Dat een woord van ons komt maakt het geen
klantwoord. Het was bovendien het enige Engelse label in een Nederlandse
navigatie naast Overzicht, Bestellingen en Je gegevens. Het heet nu **Je vaste
look** / **Your look** — de woorden die de lede van de pagina al gebruikte.

Het pad `/account/brand-kit` blijft wél zoals het was: dat staat in inloglinks
in mails die al verstuurd zijn. Een naam die verandert is geen reden om een link
te laten breken.

De ronde van 8 augustus 2026 haalde deze woorden van ruim vierhonderd plekken
weg; `TEKST-RONDE.md` heeft de before en after van elke regel. Wat daarbij bleek:
één woord vervangen verandert soms het geslacht ("het venster" wordt "de
leverdatum"), en dan moeten het lidwoord en het verwijswoord mee. Een vervanging
zonder de zin daarna hardop te lezen levert "het leverdatum" op, en dat is een
nieuwe fout in plaats van een opgeloste.

### 4 · Kort, en één gedachte per zin

Gemeten over zijn eigen 122 zinnen: gemiddeld 16 woorden, mediaan 13, en 72
procent blijft onder de 20. Dat is de maat. Eén zin boven de 25 woorden per
alinea mag, meer niet.

Twee dingen die hij consequent doet en die het ritme maken:

**Het gedachtestreepje voor de opsomming.** Eerst de bewering, dan de concrete
dingen.

> "Een fotoshoot regelen kost al snel duizenden euro's, weken plannen en een
> heel team — een fotograaf, een model, een studio, een stylist."

**Definiëren met wat er níet is.** Drie keer "geen", en je weet precies waar je
aan toe bent.

> "Geen studio nodig, geen model dat moet worden ingepland, geen weken wachten."
>
> "Zonder gedoe, zonder torenhoge kosten, gewoon beelden waar je trots op kunt
> zijn."

En het patroon dat de site het vaakst mist: **de bewering, dan het gevolg in een
korte zin erachter.**

> Lucas: *"Bij één product valt dat niet op. Bij dertig is het onbruikbaar."*

### 5 · Geen zin die op elke site kan staan

Als je VISUAILS uit de zin haalt en er een willekeurig ander bedrijf in kunt
zetten zonder dat er iets verandert, is de zin leeg. Weg ermee.

Woorden die hier nooit staan, omdat ze in `STEM-BRON.md` ook niet staan:
oplossing, ervaring, naadloos, innovatief, state-of-the-art, uniek, passie,
kwaliteit die je verdient, wij denken met je mee, de toekomst van, revolutionair,
moeiteloos, in een handomdraai.

Wél: gedoe, gewoon, rust, tijd, drempel, vastlopen, uit handen nemen. Dat zijn
zijn woorden.

---

## Drie stukken die het goed doen

Voorstel; vervang ze zodra er iets beters staat. Wat ze delen: elk zelfstandig
naamwoord is concreet, en je weet na één keer lezen wat je krijgt.

**1 · Het aanbod, in drie zinnen.** Uit `STEM-BRON.md`. Dit is de maat voor elke
pagina-inleiding op de site.

> Je stuurt je productfoto's op, en wij maken er catalogusfoto's,
> lifestyle-beelden en campagnevideo's van — professioneel, consistent, en met
> een mens die elk resultaat controleert voordat het bij jou terechtkomt. Geen
> studio nodig, geen model dat moet worden ingepland, geen weken wachten.

**2 · De belofte, persoonlijk.** Uit `HomeV2.astro`, en het is al bijna
letterlijk hoe hij praat. Dit is de maat voor alles waar "ik" staat.

> Ik bekijk elk beeld zelf voordat het naar je toe gaat, en ik doe er liever één
> over dan dat ik hem verstuur.

**3 · Een grens, zonder excuus.** Uit de spamnotitie in `src/data/mailNote.js`.
Dit is de maat voor foutmeldingen en voor alles wat een klant leest op het
moment dat er iets niet lukt.

> Na een paar minuten nog niets? Kijk in je spam- of ongewenste-mailmap — en
> markeer hem als veilig, dan komt de volgende gewoon binnen.

---

## Foutmeldingen apart

Ze worden altijd vergeten en juist gelezen door iemand die geïrriteerd is. Drie
eisen, en alle drie zijn ze te zien in het voorbeeld hierboven:

1. **Zeg wat er is,** niet dat er iets is. "Er ging iets mis" is geen melding.
2. **Zeg wat de volgende stap is,** in dezelfde zin of de zin erna. Een melding
   zonder uitweg is een doodlopende weg.
3. **Geen schuld bij de lezer.** Niet "je hebt het verkeerd ingevuld" maar "een
   code bestaat uit zes cijfers".

Nooit: "ongeldig", "mislukt", "fout opgetreden", "probeer het later opnieuw"
zonder te zeggen wanneer later is.

---

## Bij een nieuwe tekst

1. Schrijf hem in het Nederlands, hardop, alsof je hem tegen iemand zegt.
2. Lees alleen de knoppen en de kopjes. Kloppen ze los van de rest?
3. Zoek de woorden uit de tabel bij regel 3.
4. Tel de zinnen boven de 25 woorden. Eén per alinea.
5. Vertaal daarna pas naar het Engels, en gun die zijn eigen zinsgrenzen.
