# Levering 111 · Fase 6: de mails, de factuur, /admin en de laatste blauwe resten

**16 november 2026. Staat alleen in je map; je rolt zelf uit met `UITROLLEN.bat`.**

In lijst 123 zette je alles volgens advies: MA goed, MB niet, Q1 a, Q2 a, factuur goed, /admin goed, Q3 a, de balk op /lifestyle goed, levering a.

## De mails (alle 89, één opmaak)

**Kleuren.** Zwart, wit en grijs, met dezelfde waarden als de site:

| | was | wordt |
|---|---|---|
| tekst, logo, knop | `#0F1217` | `#090D0B` |
| klein | `#636974` | `#5E6461` (6,1 : 1) |
| lijn | `#E6E8EC` | `#E7EAE8` |
| vlak | `#F4F5F7` | `#F4F5F4` |

**Onderdelen:**
- **De knop:** zwart met witte letters en hoeken van 8 px, zoals de knoppen op de site. Was een pil.
- **Het vlak "Nog niet betaald?":** 18 px hoeken, zoals de kaarten. Was 24 px.
- **Status "aandacht":** mint 700 op mint 100 (6,5 : 1). Was blauw uur.
- **De beelden** (`public/img/mail/`, gemaakt door `scripts/make-mail-assets.mjs`):
  - het logo en het streepje zijn zwart;
  - het woordmerk in de voet is lichtgrijs;
  - alleen herkleurd, de vormen zijn dezelfde.

**Mint staat nergens in de mail.** De Gmail-app maakt in de donkere stand de letters op een knop wit, en wit op mint is onleesbaar (lijst 123, MB).

**De zin onder elke mail** (Q2 a):

| | was | wordt |
|---|---|---|
| Engels | *All your product imagery. Without a shoot.* | *Every visual your brand needs. Without a shoot.* |
| Nederlands | *Al je productbeelden. Zonder shoot.* | *Elk beeld dat je merk nodig heeft. Zonder shoot.* |

Deze zin staat in `src/data/brand.js` (`MAIL_ZIN`).

**Let op na het uitrollen.** De mailbeelden hebben dezelfde namen als voorheen. Gmail en Outlook bewaren een beeld soms een tijdje; mails die al verstuurd zijn, kunnen daar nog even het blauwe logo tonen. Nieuwe mails krijgen het zwarte zodra de cache verloopt.

## De factuur

- Het logo is zwart.
- De grijzen en vlakken zijn die van de site.
- De indeling is niet veranderd.

## /admin

- **Standaard donker** (Q3 a): zwart met mint, ook op het inlogscherm.
  - Met de knop rechtsboven kies je licht; dat onthoudt de cookie, net als eerst.
  - Heb je de cookie al op licht gezet, dan blijft het licht.
- **De lijst met bestellingen past op 1280.**
  - De lijst was minstens 62rem breed (992 px), terwijl er naast het menu 984 px ruimte is. Daardoor viel *Bestanden (9)* half weg.
  - Nu is hij 61rem: drie kolommen zijn iets smaller (Referentie 9rem, Wanneer 10rem, Status 8rem).
  - Smaller dan 1280 schuift hij zijwaarts, zoals eerst.

## De laatste blauwe resten

De "stukjes" van het oude posterschema waren nog blauw uur:
- **De voortgangsbalk onder de carrousel op /lifestyle** (lijst 123, KL) is nu zwart, zoals op de voorpagina.
  - Het stukje is eraf.
  - Het verloop in mint onder alle balkjes (`hal.css`) is ook zwart; mint staat alleen op de bestelknop en in de kaarten.
- **Twee andere plekken**, die ik bij het nalopen vond:
  - de lege fotoplek, zolang een beeld laadt (galerij, looks, Studio), is nu het vlak `#F4F5F4`;
  - de initialen in de zijbalk van Studio staan op zwart (19,6 : 1).

  Ze stonden niet als aparte vraag in de lijst, maar het is hetzelfde blauw dat weg moest. Wil je ze anders, zeg het.

## Bestanden

| bestand | wat |
|---|---|
| `src/lib/mailTemplate.js` | de kleuren, de knop, het vlak, de zin onderaan |
| `src/data/brand.js` | `MAIL_ZIN` |
| `scripts/make-mail-assets.mjs`, `public/img/mail/*.png` (7) | de mailbeelden herkleurd |
| `src/lib/invoicePdf.js` | de factuur |
| `src/lib/admin.js` | /admin standaard donker |
| `public/admin.css` | de lijst past op 1280 |
| `src/styles/posterkleur.css`, `src/components/LifestyleHal.astro`, `src/styles/hal.css` | de blauwe stukjes eraf |
| `docs/KLEURENSCHEMA.md`, `docs/DESIGN.md` | bijgewerkt |
| `tests/adminthema.test.mjs`, `tests/lijst87-u-mail.test.mjs`, `tests/invoice-pdf.test.mjs`, `tests/blauw-uur-86.test.mjs`, `tests/nu-doen-browser.test.mjs` | volgen de nieuwe stand (zwart in plaats van blauw, /admin donker als standaard) |

## Toetsen

- **De hele reeks is gedraaid:** 274 snelle toetsen en 81 browsertoetsen, alle groen.
- **Vijf toetsen vroegen nog om het oude:** blauw in de mail en de factuur, een pilknop, /admin licht zonder cookie en het blauwe stukje op /lifestyle. Ze toetsen nu de nieuwe stand.
- **`mails-merk`** controleert dat alle 89 mails alleen kleuren uit het nieuwe palet gebruiken.
- **`opening90`** viel om terwijl de hele reeks tegelijk liep, door een tijdslimiet. Los gedraaid is hij groen (52 goed).
