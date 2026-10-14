# Het demospel — een bestelling die je kunt spelen

*Uitgedacht 7 augustus 2026. Nog niets van gebouwd; dit is het denkwerk.*

## Wat het ding eigenlijk moet doen

De site legt op vier plekken uit hoe het werkt: de pipeline op de homepage, de
uploadrichtlijnen, de FAQ en het bestelformulier zelf. Alle vier vertellen. Geen
van vier laat het *doen*. En het echte bezwaar van een merk dat hier voor het
eerst komt, is niet "ik snap het niet" maar "ik geloof niet dat het met míjn
foto's ook zo goed uitkomt".

Een spel lost dat niet op met een betere uitleg maar met een handeling. Wie een
foto in een vak sleept, twee keuzes maakt en een set terugkrijgt, heeft de
bestelling al gedaan — alleen zonder eigen product en zonder te betalen. Wat je
daarna nog moet overtuigen is klein: dat het met hún kleding net zo gaat. Daar
is de testsample van €1 voor, en dát is waar dit spel op uitkomt.

**Eén regel die alles stuurt: er wordt niets gegenereerd.** Elke uitkomst is een
beeld dat wij eerder echt gemaakt hebben. Dat is geen valsspelen zolang je het
zegt — en het zeggen is zelfs sterker dan het verzwijgen, want "dit is echt werk
van ons" is precies de claim die je wilt maken. Het spel is een ritueel, geen
rekenmachine. Wat het simuleert is de HANDELING, niet de techniek.

Dat heeft ook een harde consequentie voor het ontwerp: elke keuze die de speler
maakt, moet vermenigvuldigen met een beeld dat bestaat. Drie producten × vier
stijlen × vier shots is 48 bestanden. Hou de vertakking klein of het project
wordt een fotoshoot in plaats van een pagina.

---

## Vier richtingen

### A · De studio van zestig seconden
Lineair en filmisch. Eén product, één weg, een zichtbare klok die loopt vanaf de
eerste sleep. Aan het eind: *"41 seconden. Een echte bestelling kost je
ongeveer hetzelfde."*

De kracht zit in de belofte die de hele site al doet — geen shootdag, geen
studio — en die hier meetbaar wordt gemaakt met een getal dat de bezoeker zelf
heeft veroorzaakt. Goedkoop te bouwen, moeilijk te vergeten.

Zwak: één keer spelen en je bent klaar. Geen reden om terug te komen.

### B · Het bureau
Een bovenaanzicht van een werkblad. Drie productfoto's liggen als polaroids,
in het midden staat een lichtbak. Je sleept een polaroid op de lichtbak, een
lichtbalk veegt eroverheen, en de resultaten rollen in een bakje.

Het mooiste om naar te kijken en het meest werk: één scène met echte diepte,
schaduwen die meebewegen, een sleep die fysiek aanvoelt. Dit is het soort
pagina dat gedeeld wordt.

Zwak: op een telefoon valt de ruimtelijkheid weg, en dat is waar de meeste
bezoekers zitten. Reken op twee ontwerpen in plaats van één.

### C · De machine (aanbevolen)
De hele pagina ís de vergelijker. Je dropt de foto, het scherm splitst, en
elke keuze die je daarna maakt verandert de rechterhelft meteen. Stijl
aanklikken: de rechterkant wisselt. Achtergrond wisselen: de rechterkant
wisselt. De schuif zit ertussen, dus je ziet altijd het verschil met wat je
erin stopte.

Dit is de enige van de vier waar spelen zin heeft ná de eerste keer, en dat is
precies wat een merk doet dat twijfelt: heen en weer klikken tussen Dunes en
Flash met dezelfde trui ernaast. Het gebruikt `Compare.astro`, dat er al is. En
het is eerlijk over wat het is: geen laadbalk die doet alsof er gerekend wordt,
maar een schakelaar die laat zien wat er ligt.

Zwak: minder verhaal. Dat vang je op met de stappen eromheen (hieronder).

### D · Het echte formulier, met nepdata
`/start` met een voorbeeldproduct erin en een instant resultaat. Het goedkoopst
en het minst waard: wie het formulier al wilde invullen, doet dat wel. Dit
overtuigt niemand die twijfelt. Noem het hier alleen om het af te kunnen wijzen.

---

## De aanbevolen vorm: C met de stappen van A

Vijf toestanden, één pagina, geen herladen.

**1 · Kies je product.** Drie kaarten: een T-shirt met print (catalog), een
jas op een hangertje (lifestyle), een sneaker (video). Elke kaart zegt in drie
woorden welke dienst erachter zit. De keuze bepaalt de rest van het spel — dat
is het enige moment waarop de drie wegen uit elkaar lopen.

**2 · Sleep hem in het vak.** Het vak is een echte dropzone met een gestippelde
rand, precies de rand uit het bestelformulier. Slepen mag; tikken mag ook (op
een telefoon bestaat slepen niet, en dat is geen randgeval maar de meerderheid).
Bij het loslaten: één zachte klik, de foto valt op zijn plek, de rand wordt
groen. Dit is het moment waarop iemand "ja, dit ken ik" denkt.

**3 · De twee vragen die er echt zijn.** Niet meer dan twee, en het moeten
dezelfde vragen zijn die het echte formulier stelt — anders leer je iemand een
flow die niet bestaat. Per dienst verschillen ze (zie hieronder).

**3b · Wie draagt hem.** Alleen bij catalog en lifestyle. Eén gezicht is actief,
de rest is zichtbaar en vergrendeld — zie de aanvulling onderaan dit bestand
over waarom dat geen nepkeuze is maar de goedkoopste manier om te laten zien dat
er tien gezichten zijn en dat een eigen merkmodel bestaat.

**4 · De controle.** Geen laadbalk. Drie regels die één voor één afvinken:
*pasvorm gecontroleerd · kleur vergeleken met je foto · achtergrond schoon.* Dat
is letterlijk wat er in de menselijke controle gebeurt, dus het is waar, en het
duurt precies lang genoeg (1,5 seconde) om de onthulling iets te laten zijn.
Een nepvoortgangsbalk van acht seconden zou hier hetzelfde effect hebben en
liegen; dit niet.

**5 · Het resultaat.** De vergelijker springt open met jouw bronfoto links en
het eindbeeld rechts. Daaronder de rest van de set als kleine tegels — en die
tegels zijn het echte argument, want een catalogusbestelling levert vier
beelden en dat weet bijna niemand voordat hij bestelt.

---

## De drie wegen

### Catalog — het T-shirt
Vraag 1: **welke achtergrond?** Wit, gebroken wit, of de kleur van je merk.
Vraag 2: **welke shots?** Vier vakjes, alle vier standaard aan: voorkant,
achterkant, detail, op model.

Het resultaat is de complete set van vier. En hier zit de sterkste vondst van
het hele spel: **zet de achterkant standaard uit en laat de speler hem
aanzetten.** Doet hij dat niet, dan komt in het resultaat op de plek van de
achterkant een vraagteken te staan met de zin die al in `src/data/shots.js`
staat — dat een achterkant verzinnen geen afleiding is maar uitvinding, en dat
je dan een foto krijgt van een kledingstuk dat je niet verkoopt. Dat is de enige
uitleg op de hele site die iemand nooit meer vergeet, omdat hij hem zelf heeft
veroorzaakt.

### Lifestyle — de jas
Vraag 1: **kies een stijl.** De vier huisstijlen die echt bestaan: Glow, Dunes,
Flash, Phone-made. Als swatchkaarten met een klein bewegend voorbeeld erin.
Vraag 2: **welk formaat** — 9:16, 4:5 of 16:9. Bewust dít en niet "binnen of
buiten": een tweede omgeving verdubbelt de fotoproductie, een uitsnede kost
niets en leert bovendien iets waars, namelijk dat je meerdere kaders
terugkrijgt van hetzelfde beeld.

Bij elke stijl die je aanklikt wisselt de rechterhelft van de vergelijker
onmiddellijk. Dat is het speelmoment: dezelfde jas, vier werelden, één schuif
ertussen.

Onder de vier swatches staat een vijfde kaart die er anders uitziet: **"Iets
anders voor ogen?"** Die is niet aan te klikken in het spel — hij zegt dat een
eigen stijl via een notitie bij de bestelling gaat en dat we er dan samen naar
kijken. Precies zoals het werkt. Een uitgeschakelde kaart die uitlegt waarom hij
uit staat, verkoopt de maatwerkoptie beter dan een kaart die hem doet alsof.

### Video — de sneaker
Vraag 1: **kies een stijl** uit de drie uit `src/data/videoStyles.js`.
Vraag 2: **staand of liggend** — 9:16 voor social, 16:9 voor je site.

Het resultaat is een echte clip van drie seconden, gedempt, in een loop, in het
formaat dat je koos. Daaronder dezelfde uitgeschakelde "iets anders"-kaart.

Video is de dienst waar de site het minst van laat zien en waar het verschil
tussen vertellen en tonen het grootst is. Als er maar één weg gebouwd wordt,
zou ik met deze beginnen — niet met catalog.

---

## Toevoegingen, op volgorde van wat ze opleveren

**De teller.** Klikken en seconden meelopen, en aan het eind één regel: *"3
keuzes, 38 seconden. Bij een echte bestelling doe je hetzelfde, met je eigen
foto's."* Kost tien regels code en is het enige stuk bewijs op de hele site voor
de belofte in de kop.

**De overdracht.** De laatste knop is dezelfde knop die de speler het hele spel
al gebruikt heeft, en hij neemt de keuze mee: heb je Dunes gespeeld, dan opent
`/start` met Dunes voorgeselecteerd. Eén queryparameter, en het verschil tussen
"leuk" en "ik ben al begonnen".

**De prijs op het juiste moment.** Pas ná de onthulling, één regel, uit
`src/data/pricing.js` zodat hij nooit uit de pas loopt: *"Zo'n set kost €X per
product."* Een prijs vóór het resultaat is een drempel; erna is het een
opluchting.

**De verkeerde foto.** Een vierde kaart bij stap 1: een slechte foto — schuin,
donker, rommelige achtergrond. Wie die kiest, krijgt niet een slecht resultaat
maar het gesprek dat wij in het echt ook voeren: *"deze kunnen we doen, maar we
vragen je eerst om één rechte foto — dit is waarom."* De uploadrichtlijnen,
gespeeld in plaats van gelezen. Bouw dit pas als de drie goede wegen staan.

**Terugkomen.** Onthoud de laatste uitkomst (`localStorage`) en begroet een
terugkerende bezoeker met *"je maakte laatst een Dunes-set — bekijk hem opnieuw,
of probeer Flash."* Klein, maar het maakt van een demo een plek.

**Geluid, gedempt.** Eén zachte sluiterklik bij het loslaten van de foto, uit
tenzij je hem aanzet. Waarschijnlijk niet doen. Genoteerd omdat het de
verleiding is die iedereen bij zo'n pagina voelt, en omdat een pagina die
ongevraagd geluid maakt precies één keer bezocht wordt.

---

## Wat het kost

**Beeldmateriaal.** Catalog: één bronfoto plus vier eindbeelden, maal drie
achtergronden voor de eerste shot = 7 bestanden. Lifestyle: één bronfoto plus
vier stijlen maal twee omgevingen = 9. Video: één bronfoto, drie clips van drie
seconden in twee verhoudingen = 6 clips van elk hooguit 1,5 MB. Bij elkaar
ongeveer twintig beelden en zes clips — een dag produceren, en het is werk dat
ook in de galerij kan.

**Code.** Eén Astro-pagina, één toestandsmachine van vijf stappen, de bestaande
`Compare.astro` voor de schuif, en GSAP dat er al in zit voor de bewegingen. Geen
nieuwe afhankelijkheid, geen server, geen database. Voorladen per stap in plaats
van alles vooraf, anders is de eerste indruk een laadbalk van 20 MB.

**Waar het staat.** `/demo` en `/nl/demo`, met een link vanaf de tweede knop in
de hero ("Zie het eerst zonder te bestellen") en vanaf `/start` voor wie daar
aarzelt. Niet in het hoofdmenu: dit is een omweg naar de bestelling, geen
bestemming.

---

## Volgorde van bouwen

1. Video, één stijl, geen keuzes — puur slepen en kijken. Als dat niet werkt,
   werkt de rest ook niet, en je weet het in een dag.
2. De vergelijker eromheen en de stijlwissel, nog steeds video.
3. Catalog met de vier shots, inclusief het vraagteken op de achterkant.
4. Lifestyle.
5. De teller, de overdracht naar `/start`, de prijsregel.
6. Pas daarna: de verkeerde foto, en het onthouden van de laatste uitkomst.

Stap 1 tot en met 3 is het spel. De rest is wat het beter maakt.

---

# Aanvulling: het model, en de precieze productielijst

*7 augustus 2026, na Lucas' twee vragen: de modelkeuze moet erin, en met één
model per dienst omdat tien modellen tien keer zoveel foto's betekent.*

## Het model: één gezicht, drie diensten

Die rem is de juiste, en er zit een gratis winst in die je op het eerste gezicht
niet ziet: **neem niet één model per dienst, maar één model voor alle drie.**

Dan is de demo geen verzameling losse voorbeelden meer maar één campagne — een
merk, een gezicht, drie diensten. Dat is precies wat een klant koopt, en het is
ook wat je in de galerij nog eens kunt gebruiken. Drie modellen zouden hier drie
keer "kijk wat we kunnen" zeggen; één model zegt "dit is hoe het eruitziet als
wij je merk doen".

### Hoe de stap dan toch een keuze is

Een keuzescherm met één optie is geen keuze. De stap wordt daarom:

Vier tegels naast elkaar. **Eén is actief** — het gezicht dat in de demo staat.
**Twee zijn zichtbaar maar vergrendeld**, met echte portretten uit de bestaande
roster (`/img/model-*.webp`, die staan er al, dus dit kost geen enkele nieuwe
foto). **De vierde is de merkmodel-kaart**, ook vergrendeld, met de zin dat je
bij een echte bestelling uit tien gezichten kiest of je eigen model laat maken.

Bij het aantikken van een vergrendelde tegel gebeurt er iets kleins in plaats
van niets: de tegel schudt niet en er verschijnt geen foutmelding, er schuift
één regel open — *"In de demo staat Lisa. Bij een echte bestelling kies je uit
tien gezichten, of we maken er één die alleen van jou is."* Met een link naar
`/models` en `/custom-models`.

Dat is de hele truc van dit spel in het klein: een uitgeschakelde optie die
uitlegt waarom hij uit staat, verkoopt beter dan een optie die doet alsof. Je
gebruikt dezelfde vorm al bij de custom stijl.

**Welk gezicht.** Uit de bestaande roster, en consistentie telt zwaarder dan de
keuze zelf. Lisa (*natural, approachable*) of Fabi (*clean, contemporary*) —
allebei breed leesbaar en geen van beide zo uitgesproken dat het de kleding
overstemt. Kies er één en gebruik hem overal in de demo.

**Waar de stap staat.** Alleen bij catalog en lifestyle vóór de controle-stap.
Bij video hoort hij bij de stijl (Motion heeft geen model) — daar is het geen
aparte stap maar een regel onder het resultaat.

---

## Wat je moet maken

Uitgangspunt: drie producten, één model, en de stijlen die er al zijn —
`src/data/styles.js` (Dunes, Flash, Glow, Phone-made, en Custom als
vergrendelde kaart), `src/data/videoStyles.js` (Motion, Lifestyle Video,
Campaign, en Custom) en `src/data/backgrounds.js` (wit #FFFFFF, gebroken wit
#F7F5F1, beige #EDE4D8).

### De bronfoto's — het belangrijkste van de hele lijst

Vier stuks, en ze moeten er **slecht** uitzien. Niet onbruikbaar, maar gewoon:
met een telefoon, in een kamer, tegen een muur die niet helemaal wit is, licht
van één raam, een beetje scheef. Dat is de "voor" in elke vergelijking, en als
die eruitziet als een studiofoto valt het hele spel plat — dan lijkt het alsof
we van een goede foto een goede foto maken.

| bestand | wat | verhouding |
|---|---|---|
| `demo/src-catalog-front.webp` | hoodie of T-shirt, plat of hangend, recht van voren | 4:5 |
| `demo/src-catalog-back.webp` | zelfde stuk, omgedraaid | 4:5 |
| `demo/src-lifestyle.webp` | jas of jurk, hangend aan een deurpost | 4:5 |
| `demo/src-video.webp` | sneaker, op tafel | 4:5 |

### Catalog — het T-shirt

Achtergrondkeuze geldt voor de drie packshots; het on-model beeld heeft zijn
eigen studiolook en verandert niet mee. Dat is geen bezuiniging maar hoe het in
het echt ook is.

| bestand | shot | achtergrond |
|---|---|---|
| `demo/cat-front-white.webp` | voorkant | wit |
| `demo/cat-front-offwhite.webp` | voorkant | gebroken wit |
| `demo/cat-front-beige.webp` | voorkant | beige |
| `demo/cat-back-white.webp` | achterkant | wit |
| `demo/cat-back-offwhite.webp` | achterkant | gebroken wit |
| `demo/cat-back-beige.webp` | achterkant | beige |
| `demo/cat-detail-white.webp` | detail (stof, naad of label) | wit |
| `demo/cat-detail-offwhite.webp` | detail | gebroken wit |
| `demo/cat-detail-beige.webp` | detail | beige |
| `demo/cat-worn.webp` | op model — het gekozen gezicht | studio |

Tien beelden, alle vier de shots op 4:5, 1600px op de lange zijde.

### Lifestyle — de jas

Vier stijlen, per stijl twee beelden: één wijde scène en één dichterbij. De
tweede is wat de klant later gebruikt voor een vierkante post, en het laat zien
dat je meer terugkrijgt dan één plaatje.

| bestand | stijl | kader |
|---|---|---|
| `demo/lif-dunes-wide.webp` / `-close.webp` | Dunes — *sun, sand and quiet luxury* | wijd / dichtbij |
| `demo/lif-flash-wide.webp` / `-close.webp` | Flash — *direct flash, no apologies* | wijd / dichtbij |
| `demo/lif-glow-wide.webp` / `-close.webp` | Glow — *golden hour, on demand* | wijd / dichtbij |
| `demo/lif-phone-wide.webp` / `-close.webp` | Phone-made — *looks effortless, isn't* | wijd / dichtbij |

Acht beelden. Zelfde jas, zelfde model, vier werelden — dat is precies waarom
de vergelijker hier zo goed werkt: je klikt en alleen de wereld verandert.

Maak de wijde beelden op 3:2 en snijd de close op 4:5 uit dezelfde render als
dat kan. De formaatkeuze in het spel (9:16 · 4:5 · 16:9) is een uitsnede van
hetzelfde beeld en kost dus geen extra werk — en het leert dat je meerdere
uitsnedes krijgt.

### Video — de sneaker

Drie clips, want Custom is een vergrendelde kaart en geen clip.

| bestand | stijl | lengte |
|---|---|---|
| `demo/vid-motion.mp4` + `.webp` (posterframe) | Motion — één stille camera, subtiele beweging, naadloze loop | 6–8 s |
| `demo/vid-lifestyle.mp4` + `.webp` | Lifestyle Video — de scène in beweging, met model | 6–8 s |
| `demo/vid-campaign.mp4` + `.webp` | Campaign — meerdere shots, het grote moment | 8–10 s |

Film of render in 9:16 en houd het midden veilig, dan is de 16:9-keuze in het
spel een uitsnede in plaats van een tweede clip. Per clip hooguit 1,5 MB
(H.264, geen audio) en een posterframe als `.webp`, zodat er iets staat voordat
de video geladen is.

### Bij elkaar

Vier bronfoto's, achttien eindbeelden, drie clips met drie posterframes. Achtentwintig
bestanden, één model, één productiedag als je het achter elkaar doet. De
modelkeuze zelf kost nul nieuwe foto's, want de vergrendelde tegels gebruiken de
portretten die al in `/img/model-*.webp` staan.

### Waar ze komen te staan

Alles onder `public/img/demo/`. Eén map, één naamgeving (`dienst-onderwerp-variant`),
zodat de code de bestandsnaam kan samenstellen uit de keuzes van de speler in
plaats van een tabel met paden bij te houden — en zodat een ontbrekend beeld
meteen te zien is aan de naam die niet bestaat.
