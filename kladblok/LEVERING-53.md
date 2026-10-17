# Levering 53 — het logo, de aanhef en 440 breed (17 oktober 2026)

Uit afvinklijst 33 en je bericht van 02:21. Uitrollen met **UITROLLEN.bat**, zonder migratie.
Levering 52b en 52c zijn nog niet uitgerold (uitrol-log is van 16 oktober); ze gaan mee.

## 1. Het logo in de balk

Lucas: *"Ook had ik ooit een hover effect voor het logo op de top bar die er nu niet meer is, dit was
een soort glitch en electric effect van het logo zelf die ik mooi vond en nu is er een effect dat ik
niet meer wil wanneer je de pagina opent."*

- Het V-merk in de balk gebruikt weer de elektrische rand (`electro` in VMerk.astro): onder de muis
  tekent zich een dunne violette lijn om de V, die 6% naar linksboven schuift en onregelmatig trilt
  (mk-electro in global.css).
- Het glitch-effect bij het laden is weg (hal.css: de regels met `.wm-glitch` en een vertraging van
  0,9 s). Er beweegt niets meer als je de pagina opent.
- Minder beweging: de rand staat er meteen, zonder trilling.

## 2. De aanhef

Lucas (afvinklijst 33): *"Hoi vind ik wat cliché en kan wel iets netter. Wanneer het kan
Goedemorgen/Goedemiddag/Goedeavond "Naam" wanneer je de tijd van de klant kan weten … Kijk waar nog
meer hoi gebruikt word, zoals op whatsapp."*

- Nieuw: `src/lib/aanhef.js`. Eén plek voor het woord: "Hallo" / "Hello".
- Een dagdeel ("Goedemorgen", "Goedemiddag", "Goedenavond"; "Good morning/afternoon/evening") alleen
  als de klant nu leest: een mail die hij zelf in gang zet (bestellen, betalen, aanmelden, iets
  wijzigen in Studio) en een WhatsApp die jij nu uit /admin stuurt. In de tijd van zijn land
  (landen met één tijdzone); 's nachts (00–05) of onbekend: "Hallo".
- Mails van de nacht en de cron: altijd "Hallo", want die lees je misschien pas later.
- Alle vooringevulde WhatsApp-berichten op de site: "Hallo VISUAILS, …" / "Hello VISUAILS, …"
  (was "Hoi" / "Hi"), ook op de juridische pagina's (alleen de knoptekst, niets aan de voorwaarden).

● NL: Hallo Sanne,
● EN: Hello Sanne,
● NL (de klant leest nu, 's middags): Goedemiddag Sanne,
● EN: Good afternoon Sanne,
● NL (WhatsApp van de klant): Hallo VISUAILS, een vraag over mijn bestelling VIS-2608-4471:
● EN: Hello VISUAILS, a question about my order VIS-2608-4471:

## 3. De mails zijn 440 breed

Je koos v33-maat c. `BREED = 440`, `MARGE = 32` in mailTemplate.js. Gemeten: op een computer 7,5
woorden per regel, op een telefoon 6,8. Niets loopt over, ook de tabellen in de studiomails niet.

## Toetsen

Bijgewerkt voor Hallo/Hello en 440: aanhef (55), wa-momenten (84), nasturen-per-vak, fotogids,
mailtaal, ronde9, mails-merk (27), schrijfwijze, app-ons, doorloop-27b, klant-stand, review-vragen,
planning-scherm, formulier-a2-browser. Testreeks 257/257 (19 min 42 s).

## Niet in deze levering

De ontwerptaal, de nieuwe iconen, de mails in de nieuwe stijl, de beweging en de homepage staan als
voorstel in afvinklijst 34. Daar bouw ik pas aan als je ze hebt goedgekeurd.
