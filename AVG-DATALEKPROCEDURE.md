# Datalekprocedure — VISUAILS

**Artikel 33 en 34 AVG. Laatst bijgewerkt: 12 augustus 2026.**

Intern document. Het doel is niet compleetheid maar **snelheid**: bij een lek is
er geen tijd om uit te zoeken wat de regel is, dus staat de regel hier al.

---

## 0 · De klok, en waarom die eerder begint dan je denkt

De 72 uur van art. 33 lid 1 begint **op het moment dat je ervan weet** — niet
wanneer je het hebt uitgezocht, niet wanneer het is opgelost. "Ik was het nog
aan het onderzoeken" is geen verlenging.

Dat is de reden dat §2 hieronder met containment begint en niet met een
melding: je mag het gat eerst dichten, maar je mag de klok niet stilzetten.

## 1 · De twee rollen, en dus twee heel verschillende meldingen

Dit is het enige onderdeel van deze procedure waarop je echt de fout in kunt
gaan, en het kost je een boete in de ene richting en een onnodige melding in de
andere.

### Ligt het lek in het beeldmateriaal van een klant? → **wij zijn verwerker**

Dan melden wij het **aan de klant** en niet aan de Autoriteit
Persoonsgegevens. Art. 33 lid 2: een verwerker informeert de
verwerkingsverantwoordelijke. De klant beslist daarna zelf of hij naar de AP
gaat — dat is zijn afweging en niet de onze, en wij nemen die niet voor hem.

> **Melden wij het toch zelf bij de AP, dan doen wij een melding namens iemand
> anders over een risico dat wij niet hebben beoordeeld.** Dat is niet
> behulpzaam maar onjuist.

Termijn: **zonder onredelijke vertraging**, en de verwerkersovereenkomst maakt
dat concreet — §10 daarvan belooft **binnen 24 uur** nadat wij het weten, ook als
het beeld dan nog niet compleet is. Dat is een striktere termijn dan de wet van
een verwerker vraagt, en hij is met opzet strikt: de klok van 72 uur voor de
melding van de klant begint pas te lopen zodra wij het bij hem hebben neergelegd,
dus elk uur dat wij wachten is een uur van zijn termijn.

*Dit getal is op 12 augustus 2026 uit §10 van de overeenkomst overgenomen en niet
zelf bedacht. Wijkt het ooit af, dan is de overeenkomst de bron en dit document de
kopie — `tests/register.test.mjs` houdt de twee gelijk.*

### Ligt het lek in de klantadministratie? → **wij zijn verantwoordelijke**

Dan is de vraag of er een risico is voor rechten en vrijheden.

| Uitkomst | Wat je doet |
|---|---|
| **geen risico** | niet melden. Wél vastleggen in het logboek (§5) — dat is art. 33 lid 5 en dat geldt voor **elk** lek |
| **wel een risico** | binnen **72 uur** melden bij de Autoriteit Persoonsgegevens |
| **een hoog risico** | daarnaast **de betrokkenen zelf** informeren, in duidelijke taal (art. 34) |

Een lek kan beide zijn. Een gestolen laptop met de back-up erop raakt de
klantadministratie **en** het beeldmateriaal: dan lopen beide sporen, naast
elkaar, en niet het ene in plaats van het andere.

## 2 · De eerste twee uur

1. **Dicht het gat.** Sleutel intrekken, sessie beëindigen, wachtwoord wijzigen,
   route uitzetten. Eerst stoppen wat er loopt.
2. **Zet de tijd op.** Schrijf op wanneer je het merkte, met de minuut erbij, en
   waardoor. Dit is het begin van de 72 uur en het eerste dat later wordt
   nagevraagd.
3. **Verander niets aan de sporen.** Geen logboeken opschonen, geen rij
   verwijderen, geen bestand "even" weghalen. Wat je nu weggooit kun je later
   niet meer laten zien.
4. **Stel de omvang vast, met de vier vragen van art. 33 lid 3:**
   - *welke soorten gegevens*, en van *hoeveel* betrokkenen ongeveer;
   - *wat de gevolgen* kunnen zijn;
   - *wat je hebt gedaan* om het te beperken;
   - *wie er contactpersoon is* (hello@visuails.com).
5. **Bepaal je rol** met §1 hierboven. Doe dit vóór je iemand belt.

## 3 · Waar je kijkt

Deze lijst staat hier omdat je hem bij een incident niet wilt hoeven verzinnen.

| Waar | Wat je ziet |
|---|---|
| Cloudflare-dashboard → R2 | toegang tot objecten, en of er iets publiek is gezet |
| Cloudflare-dashboard → Workers-logs | verzoeken aan `/api/*` en aan de portalen |
| D1, tabel `admin_log` | welke handelingen er in het adminportaal zijn gedaan, en wanneer |
| D1, tabel `order_events` | de tijdlijn per bestelling, inclusief wat de opruimtaak heeft verwijderd |
| D1, tabellen `account_sessions` en `admin_sessions` | actieve sessies; hier trek je ze ook in |
| D1, tabel `rate_limits` | ongebruikelijke pieken (gehashte ip-adressen, dus geen adressen) |
| Resend-dashboard | verzonden e-mail, inclusief de bijlagen die eraan hingen |
| Mollie-dashboard | betalingen; hier staan geen kaartgegevens van ons |

## 4 · De meldingen zelf

**Aan de Autoriteit Persoonsgegevens** (alleen als wij verantwoordelijke zijn en
er een risico is): via het meldloket op autoriteitpersoonsgegevens.nl. Kun je
binnen 72 uur nog niet alles vaststellen, dan meld je **in fasen** — dat mag
uitdrukkelijk (art. 33 lid 4) en het is beter dan te laat compleet zijn.

**Aan de klant** (als wij verwerker zijn): per e-mail aan het adres op de
bestelling, met daarin de vier punten van §2.4, welke bestelling(en) het raakt,
en wat wij hebben gedaan. Geen inschatting van *zijn* meldplicht — die maakt hij
zelf; wij leveren de feiten waarop hij dat kan.

**Aan de betrokkenen** (alleen bij hoog risico): in gewone taal, zonder
juridisch jargon, met wat er is gebeurd, wat het voor hen betekent en wat ze
kunnen doen.

## 5 · Het logboek

Art. 33 lid 5 vraagt om **elk** lek te documenteren, ook het lek dat je niet
hebt gemeld — en juist dat laatste is het bewijs dat er is nagedacht in plaats
van weggekeken.

Bijhouden in `AVG-DATALEK-LOGBOEK.md` (aanmaken bij het eerste voorval), per
voorval: datum en tijd van constatering, wat er gebeurde, welke gegevens en
hoeveel betrokkenen, onze rol, de beoordeling van het risico **met de reden**,
wat er is gemeld en aan wie, en wat er is veranderd om het te voorkomen.

Bewaren: minimaal 5 jaar. Dat is geen wettelijke termijn maar een praktische —
het overbrugt een AP-onderzoek dat jaren na het voorval kan beginnen.

## 6 · Wat op dit moment het grootste risico is

Twee dingen, en ze staan hier omdat een procedure die geen risico's benoemt geen
procedure is maar een formulier.

**De back-up op de eigen schijf.** Daar staat een volledige kopie van de
klantendatabase op. Op 12 augustus 2026 is die schijf nog niet versleuteld, dus
is verlies of diefstal van die machine op dit moment een datalek met een
volledige klantendatabase erin — en dat is te voorkomen met één schermpje.
Zodra BitLocker aan staat, wordt dit van een lek een non-lek: versleutelde
gegevens waarvan de sleutel niet is meegenomen, leveren geen risico voor
betrokkenen op. Zie ook §7 van het verwerkingsregister.

**De bestelmelding met bijlage.** De melding aan de studio draagt het
aangeleverde materiaal als bijlage mee, en gaat via Resend. Eén verkeerd
ingesteld ontvangstadres is dus een lek van klantmateriaal en niet alleen van
een melding. Het adres staat in de Pages-secret `NOTIFY_EMAIL` en hoort bij
elke wijziging daarvan één keer nagekeken te worden.
