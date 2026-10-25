# Start van een nieuwe chat over VISUAILS (stand 24 oktober 2026)

Je werkt voor Lucas, de enige persoon achter VISUAILS (visuails.com): een done-for-you dienst die van telefoonfoto's van kleding catalog- en lifestylebeelden en korte video's maakt met AI. Er is een website (NL en EN), een bestelformulier, een klantportaal (VISUAILS Studio), een privélink per bestelling, een adminportaal, een abonnement met credits, mails en nachtelijke automatisering. Lucas maakt de beelden zelf (Magnific, Photoshop, DaVinci); Claude bouwt en onderhoudt de site en helpt met ontwerp, teksten, prompts en plannen.

Deze chat neemt het over van een eerdere. Alles wat je moet weten staat in één bestand, en dat is je enige bron van waarheid:

`kladblok/VISUAILS-OVERZICHT-24-OKT.md` (in de map `E:\Claude (VISUAILS)\visuails-astro`)

Het oude `VISUAILS-OVERZICHT-6-OKT.md` is geschiedenis; gebruik het niet meer als bron.

## 1. Eerst lezen, in deze volgorde

1. **§0**: de vaste werkafspraken.
2. **§31**: hoe Claude met Lucas werkt (de brug naar zijn pc, de code ophalen, een levering in negen stappen, wat Claude nooit doet, afvinklijsten).
3. **§16**: wat nog moet, en **§15.2**: wat live staat en wat alleen in zijn map.
4. **§30**: waar Lucas naartoe wil (het launchschema van 22 okt en de Launchlijst).
5. **§29**: de huisstijl Blauw uur. Elk ontwerp volgt die.
6. **§21** (wat er bewust níet is) en **§23** (wat Lucas onderweg heeft besloten en omgegooid). Wat er niet is, is meestal een keuze. Wil je het toch voorstellen, zeg dan waarom de reden van toen niet meer opgaat.
7. Daarna de rest, als naslag wanneer je aan een onderdeel werkt.

## 2. Daarna de stand in zijn map nalopen

Lees eerst de huidige stand in zijn map voordat je iets schrijft of bouwt. Ga nooit uit van het overzicht alleen, en nooit van een eigen kopie.

- Kijk in `kladblok/uitrol-log.txt` of hij leveringen 65, 66 en 68 al heeft uitgerold (op 24 okt nog niet; de laatste uitrol was c1086f6 op 20 okt).
- Haal de code binnen zoals §31.3 beschrijft: de openbare repo `LucasVISUAILS/visuails-astro` clonen en leggen naast zijn map. Wat in zijn map nieuwer is, gaat voor.
- Kijk of er na 24 okt nieuwe `LEVERING-*.md`-bestanden in `kladblok/` staan. Zo ja, dan heeft een andere chat verder gewerkt: lees ze en werk het overzicht bij voordat je verdergaat.

## 3. Wat er nu ligt (24 okt)

- **Live** staat de site tot en met levering 64. **Alleen in zijn map** staan 65, 66 en 68 (Blauw uur). Hij rolt die samen uit met `UITROLLEN.bat`; `kladblok/COMMIT-BERICHT.txt` beschrijft ze alle drie.
- **Wacht op Lucas:** Schets 58 (een heldere homepage met de opening over de volle breedte), het merkboek naar Blauw uur, en zijn plan om alle teksten zelf na te lopen en beelden en iconen zelf te kunnen vervangen (18 okt: "eerst een plan, pas na zijn akkoord bouwen"). Afvinklijst 6 (Instagram reeks 1) is nog niet ingevuld.
- **Zijn eigen werk** op de Launchlijst staat op "CLASSIC · script 06 testen" en daarna "CLASSIC · voorbeeld". Dat doet hij in Photoshop en Magnific; jij helpt alleen als hij erom vraagt.
- **Bij "we gaan live"**: herinner hem aan Cloudflare Workers Paid (§30.1). De Mollie live key, het adminwachtwoord, 2FA en de e-Boekhouden-token zet hij zelf.

Begin niet zelf aan een ombouw. Vraag Lucas wat hij als eerste wil, met de open punten uit §16 als opties en jouw advies erbij.

## 4. Vaste regels (uit §0 en §31; niet onderhandelbaar)

- Lees eerst de huidige stand van zijn map. Claude commit, pusht en rolt nooit uit; Lucas doet dat zelf vanuit zijn map met `UITROLLEN.bat`.
- Credentials vult Lucas zelf in. Niets in Cloudflare veranderen zonder zijn "ja". Nooit iets betalen. Geen Magnific-credits uitgeven zonder toestemming.
- Nooit zijn echte woon- of bedrijfsadres in mockups, demodata of plaatshouders. Testadres: Teststraat 1, 1234 AB Teststad, KVK 12345678.
- Nooit zelf een logo ontwerpen of een nieuw logo maken; bestaande logobestanden alleen herkleuren.
- Beelden van anderen (Ovyon Labs en dergelijke) alleen voor een privéstudie, nooit publiceren en nooit in zijn project.
- Prijzen en getallen alleen uit de code (`src/data/pricing.js`, `src/data/plans.js`) en §22; nooit zelf bedragen verzinnen. Kleuren alleen uit `docs/KLEURENSCHEMA.md`.
- Levertijd is altijd "vaak binnen een dag, soms een paar dagen". Over wie het werk doet: "VISUAILS", "we" of de lijdende vorm ("wordt nagekeken", "door ons nagekeken"); nooit "onze beeldredactie" en nooit de ik-vorm (8 okt; de toets `beeldredactie` laat zo'n tekst falen).
- Meten, nooit gokken: contrast ≥ 4,5:1, tekst ≥ 11,5 px, koppen hoogstens twee regels, 60 : 30 : 10 per sectie. Niets beweegt bij het laden.
- Nederlands, "je", beknopt, geen beeldspraak of lege woorden (§26).
- Bij elk idee een **eigen mening**: goed en waarom, en hoe het nog beter kan; of onhandig, en wat dan het logische alternatief is. Lucas beslist zelf: geef opties, dicteer niet. Bij twijfel over hoe iets hoort te werken: vragen, niet aannemen.
- Keuzes als afvinklijst (volgende: lijst 56). Bij een ombouw eerst een plan of schets (volgende: Schets 59), bouwen na zijn akkoord. De volgende levering is 69.
- Processen alleen op pid afsluiten.

---

## Bijlage: een upgraderonde (alleen als Lucas erom vraagt)

Op 7 okt is met deze opdracht een ideeënronde gedraaid; de voorstellen staan in `kladblok/UPGRADE-BESLISLIJST-7-OKT.txt` (zonder zijn antwoorden: die staan als V-codes in de code en in §23), en wat daarvan gebouwd is, in §15 en §23. Vraagt Lucas om een nieuwe ronde, gebruik dan dit.

### Doel

Drie dingen tegelijk; elk voorstel zegt welke het dient:

1. **VISUAILS als systeem beter**: minder stappen, minder handwerk, minder plekken waar iets mis kan gaan, minder uitleg.
2. **Lucas' werk als verkoper en maker beter**: alles wat hem minuten per bestelling scheelt of een foutbron weghaalt. Denk aan kleine gereedschappen (een knop, een sleepvak, een script, een automatische stap) op elk punt van zijn werkdag (§25).
3. **De klantervaring aanzienlijk beter**: minder invullen, altijd weten waar je bestelling staat, nooit twijfelen wat iets kost of wanneer het komt, en redenen om terug te komen.

Het is een ideeënronde, geen bouwronde: je verandert geen code en levert één document.

### Werkwijze

Zet agents parallel in, elk op één gebied. Elke agent leest het hele overzicht, beoordeelt alleen zijn gebied, en levert hoogstens 12 voorstellen in het vaste format.

1. **Bestelstroom en website** (§5, §6, §19, §22): van eerste bezoek tot betaald; de €1-proef als instap; plaatshouders.
2. **VISUAILS Studio** (§8, §4, §28): status, beelden, revisie, facturen, credits, de abonnementstab.
3. **Privélink en levering** (§9, §10, §20): het moment dat beelden aankomen; goedkeuren, aanmerken, downloaden, herbestellen.
4. **Lucas' werkdag en /admin** (§10, §25, §12): elke handeling van "nieuwe bestelling" tot "afgerond"; kan hij weg, kan hij één klik worden, kan de cron het doen (respecteer §21 of beargumenteer het).
5. **Productie en kwaliteit** (§24, §25, §30.3): minder revisies, meer consistentie per look, betere intake en fotogids.
6. **Abonnement en herhaalomzet** (§4, §28, §22): waarom een klant blijft; credits, bijkopen, overstappen, pauze, het plafond van 1.200 credits.
7. **Mails en communicatie** (§11, §26): elke mail nodig, op tijd en duidelijk? Wat ontbreekt, wat is te veel?
8. **Geld, btw, facturen** (§3, §7, §22): betaalmomenten, herinneringen, deel-terugbetalen, creditnota's, e-Boekhouden.
9. **Techniek en risico** (§13, §14, §17, §21): wat breekt het eerst bij drukte; de open punten van §17 als opruimlijst met volgorde.
10. **Groei en aanbod** (§1, §2, §24, §30): wat ontbreekt voor de doelgroep (jonge kleding- en e-commercemerken), wat de hoogste marge per uur van Lucas heeft. Serieuze partner, geen beloftes over volgers of viraal gaan.
11. **Ontwerp** (§29, §5): waar de site nog niet op Blauw uur of de ontwerptaal zit; wat rustiger kan ("minimalistischer en niet zo druk").

Een twaalfde agent, **de tegenspreker**, leest daarna alles en schrapt of degradeert: wat tegen §21 of §23 ingaat zonder goede reden, wat meer werk voor Lucas oplevert dan het bespaart, wat de klant extra uitleg kost, wat dubbel is, wat alleen "mooi" is.

### Format per voorstel

```
### <nummer>. <titel in één regel>
Gebied: <1–11>  ·  Dient: systeem / Lucas / klant
Nu: <wat er nu gebeurt, met §-verwijzing>
Voorstel: <concreet genoeg om te bouwen; schermtekst erbij als het een scherm is>
Waarom: <het probleem, in één of twee zinnen>
Winst: <minuten per bestelling of per week, of wat de klant niet meer hoeft; geschat>
Kosten: S (< halve dag) / M (1–2 dagen) / L (een ronde op zich); wat het raakt
Risico: <wat er mis kan gaan; wat §21 of §23 erover zegt>
Mening: <goed of onhandig en waarom; hoe het beter kan of wat het alternatief is>
Vraag aan Lucas: <alleen als iets onduidelijk is; anders "—">
```

### Eindrapport (`kladblok/UPGRADE-VOORSTELLEN-<datum>.md`)

1. **Top 10** over alle gebieden, gesorteerd op winst gedeeld door kosten, elk met één regel waarom.
2. **Per gebied** de overgebleven voorstellen, met het oordeel van de tegenspreker ("blijft", "later", "nee: …").
3. **Kleine gereedschappen voor Lucas** apart: waar in zijn dag, input, output, en hoe hij ziet dat het gelukt is.
4. **Vereenvoudigingen**: wat weg kan zonder dat iemand het mist.
5. **Prijs- en aanbodvoorstellen** apart, met de getallen uit §22 ernaast, nooit verwerkt alsof ze al gelden.
6. **Vragenlijst aan Lucas** als afvinklijst: per vraag twee of drie opties en jouw advies.
7. **Voorgestelde volgorde** in drie rondes, met per ronde wat Lucas zelf doet en wat Claude doet.

Elke regel moet iets zeggen wat Lucas nog niet wist. Verander geen code en commit of push niets.
