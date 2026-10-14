# De klant op de site, en Studio in de hal (14 oktober 2026)

Naslag bij afvinklijst 26 (levering 41). Getallen en namen tussen ⟨ ⟩ komen uit de data, nooit getypt.

**Leeswijzer**: = zelfde tekst als nu · ● nieuw of anders, graag nalezen.

Lucas, 14 oktober, 09:35: afvinklijst 23 ingevuld (k-klant: vervang, stand, abo, wa alle vier "doen"), "je gaat trouwens wel verder met de rest van het ombouwen van de website".
10:17: "Pas in /studio ook de nieuwe logo's toe en fix de inconsistenties."
10:20: het nieuwe kleurenschema "volledig" toepassen (ontwerpplan v10, §04 Kleur).
10:22: zijbalk dichtklappen = woordmerk naar V met een animatie; de laptop op de voorpagina groter; links in de bovenbalk de V in plaats van het woordmerk.
11:14: de melding liever als pop-up onderin het scherm die blijft tot je hem wegklikt; voor nieuwe bedrijven ook een proef-pop-up; klein en compact op de telefoon. 11:15: de proef voor wie niet is ingelogd of nieuw is; weggeklikt blijft hij een tijdje weg.

## De klant op de site (alleen voor wie is ingelogd)
Zonder inloggen, zonder JavaScript of zonder antwoord van de server blijft elke pagina zoals hij is. De zinnen staan in src/data/klant.js; het script vult alleen ⟨naam⟩, ⟨kenmerk⟩ en ⟨aantal⟩ in.

- ● De melding onderin het scherm (KlantMelding.astro), op elke pagina behalve het bestellen, de proef en de bedankpagina. Linksonder op een breed scherm, schermbreed en op één rij op een telefoon. Komt pas na de cookiekeuze.
- ● Voor een ingelogde klant met een bestelling: Welkom terug, ⟨voornaam⟩ · EN Welcome back, ⟨first name⟩ (zonder voornaam: Welkom terug · EN Welcome back), eronder ⟨VIS-2041⟩ · ⟨stand⟩, en één knop erheen (de knop uit Studio, bijvoorbeeld "Bekijk je beelden"). Blijft staan tot je hem wegklikt; komt terug als de stand verandert.
- ● Voor wie niet is ingelogd of nog nooit iets bestelde, zodra je voorbij de opening scrolt en er geen proefblok in beeld staat: Eerst zien? Eén product voor ⟨€1⟩ · ⟨4 catalogfoto’s of een carrousel van 4⟩, gemaakt van je eigen foto. · knop ⟨Probeer VISUAILS · €1⟩ · EN See it first? One product for ⟨€1⟩ · ⟨4 catalog images or a carousel of 4⟩, made from your own photo. · ⟨Try VISUAILS · €1⟩. Op een telefoon alleen de kop. Weggeklikt: ⟨30⟩ dagen weg (src/data/cookies.js, PROEF_WEG_DAGEN).
- ● Het kruisje (voor schermlezers): Sluit deze melding · EN Close this message. De meldingen heten Je bestelling · Proef · EN Your order · Test sample. Escape sluit ook.
- ● Cookiebeleid, onder "In je browser bewaard, niet als cookie": Twee notities blijven langer staan. […] En klik je een melding onderin het scherm weg, dan onthoudt dit apparaat dat (vis-melding): die over je bestelling komt pas terug als er iets aan die bestelling verandert, die over de proef na ⟨30 dagen⟩. Er staat alleen het kenmerk van die bestelling in, verder niets over wie je bent. · EN Two notes stay longer. […] And if you close a message at the bottom of the screen, this device remembers that you did (vis-melding): the one about your order comes back only when something about that order changes, the one about the test sample after ⟨30 days⟩. It holds only that order’s reference, nothing else about who you are.
- ● Het label bovenin de opening (VISUAILS · Enschede, NL) staat er weer voor iedereen; de welkomstregel daaronder is weg.
- ● De standen, kort (src/lib/nuzin.js, STAND_KORT):
  Er mist iets in je gegevens · Wacht op je betaling · Je revisieronde loopt bijna af · Geleverd, wacht op je goedkeuring · Er mist nog een foto · Afgerond, download je beelden · Afgerond · We kijken je btw-gegevens na · Je revisieronde ligt bij ons · Geleverd · Je proef is klaar · In productie (of Ontvangen / Wordt nagekeken, de stap waar hij staat) · Je aanvraag ligt bij ons · Geannuleerd
  EN Something is missing from your details · Waiting for your payment · Your revision round ends soon · Delivered, waiting for your approval · A photo is still missing · Completed, download your images · Completed · We are checking your VAT details · Your revision round is with us · Delivered · Your sample is ready · In production · Your request is with us · Cancelled
- Terugval in de melding, niet te zien (de melding komt alleen met een bestelling): Je bestellingen en beelden staan in VISUAILS Studio. · Naar VISUAILS Studio · EN Your orders and images are in VISUAILS Studio. · Go to VISUAILS Studio
- ● Waar de proef voor een klant wegvalt (Hoe het werkt, Prijzen, een look, een videostijl): Bestel opnieuw met je look · EN Order again in your look. Alleen als er een geleverde bestelling is; de link is die uit Studio (zelfde look, achtergrond, verhouding en gezicht).
- ● Op /upload-guidelines, waar de proef de hoofdknop was: Bestel opnieuw met je look, of anders Start een bestelling · EN Order again in your look / Start an order. Met een herbestelknop komt Start een bestelling ernaast.
- ● De abonnementsknop in de opening van de voorpagina, met credits: Bestel met je credits · ⟨48⟩ over · EN Order with your credits · ⟨48⟩ left. Naar het beginscherm van het bestellen, niet naar het formulier. Zonder credits: = Sluit een abonnement af · EN Start a plan.
- ● Het proefblok voor een klant die al bestelde (v26-proefblok a, en je notitie: "een product voor €1" doet er dan niet meer toe), op elke pagina met het proefblok, de voorpagina ook:
  pil: Je look · EN Your look
  met een levering: Meer producten? Bestel met je look. · EN More products? Order in your look.
  Het formulier opent met de keuzes van ⟨VIS-2041⟩. Je voegt alleen de nieuwe producten toe. · EN The form opens with the choices of ⟨VIS-2041⟩. You only add the new products.
  knoppen: Bestel opnieuw met je look (de link uit Studio) · Naar VISUAILS Studio · EN Order again in your look · Go to VISUAILS Studio
  met credits, als stille regel: Je hebt nog ⟨48⟩ credits. · EN You have ⟨48⟩ credits left.
  beelden: de vier uit zijn laatste levering (jouw keuze); heeft die er minder dan vier, dan de voorbeeldset
  nog geen levering: Meer producten? Start je volgende bestelling. · Zodra je eerste levering klaar is, staat hier je eigen look, met één knop om opnieuw te bestellen. · knop Start een bestelling · EN More products? Start your next order. · Once your first delivery is ready, your own look is here, with one button to order again. · Start an order
  een nieuw account (nog nooit besteld) houdt de proef, met de knop Probeer VISUAILS · €1
- ● Op een videostijl staat geen "Bestel opnieuw met je look" meer (v26-video a): een video heeft geen formulier om naar terug te gaan.
- ● WhatsApp (zwevende knop, menu op de telefoon, contact, FAQ, 404, Over): Hoi VISUAILS, een vraag over bestelling ⟨VIS-2609-4471⟩: · EN Hi VISUAILS, a question about order ⟨VIS-2609-4471⟩: — letterlijk de zin van de WhatsApp-knop op een bestelkaart in Studio (de test vergelijkt ze).

## VISUAILS Studio in de hal
Alleen vorm, geen andere woorden, behalve:
- ● De kop in twee tonen waar hij een komma heeft: "Welkom terug," licht, "⟨Mara⟩" in inkt. De tekst zelf is gelijk.
- ● Geen maantje meer: Studio is alleen licht (v26-donker a). De knop "Licht scherm / Donker scherm" · EN "Light screen / Dark screen" staat nergens meer. Ook de schakelaar naar de vorige vormgeving is weg (v26-schakelaar a).
- ● Cookiebeleid: de regel over vis_thema is weg (Studio zet hem niet meer; /admin wel, alleen onder /admin, en net als vis_admin staat die er niet op). Telwoord: Dat zijn ze alle vier · EN That is all four (was vijf).
- ● Privélink (portal.js), het vinkje onder een beeld: Deze aanmerken · EN Mark this one (was Niet goed / Not right), en de melding als er niets is aangevinkt: Er is niets verstuurd: je had geen beeld aangevinkt. Vink onder elk beeld dat anders moet “Deze aanmerken” aan en verstuur de ronde opnieuw — je opmerking staat er nog. · EN Nothing was sent: no image was ticked. Tick “Mark this one” under each image you would like different and send the round again — your note is still there.

## /studio (de uitlegpagina) — de inconsistenties
- ● De tellers in de mockup zijn nu de tegels van het echte overzicht: Te betalen ⟨1⟩ · Bij ons in de maak ⟨2⟩ · Geleverd ⟨2⟩ · EN To pay · With us · Delivered (was: in productie · wordt nagekeken · geleverd · onbetaald).
- ● Ingepland van ⟨vr 7 aug⟩ tot ⟨za 8 aug⟩. · EN Planned for ⟨Fri 7 Aug⟩ – ⟨Sat 8 Aug⟩. "Nu:" ervoor is weg.
- ● Betaald op ⟨3 aug⟩. · EN Paid on ⟨3 Aug⟩. (was: "— je leverdatum … ligt vast", en een knop Factuur downloaden die in het echte scherm niet op die plek staat).
- ● Per bestelling: waar hij staat, wanneer hij klaar is en wat je betaalde. · EN Per order: where it stands, when it is ready and what you paid.
- ● EN Our studio is making your images. (was visuals).
- ● Facturen en Abonnement staan als tabs, niet aanklikbaar in de mockup.
- ● Product 1 · op model · EN on model (de naam van het geleverde beeld in Studio, zoals overal op de site; ook de tellerrij in het overzicht: Op model · EN On model).
- ● Wat wil je anders aan dit beeld? · EN What would you like different about this image? (de zin van het echte scherm).
- ● Downloaden (zip) · EN Download (zip) (de knop van het echte scherm; was Download de map).
- ● Studio begint bij de status van je bestelling. Vier stappen die hij doorloopt, een revisie die onderweg kan gebeuren en het afronden aan het eind — en waar jij staat is het eerste dat je ziet. · EN Studio opens on the state of your order. Four steps it moves through, a revision that can happen along the way, and completion at the end — and where you are is the first thing on the page.
- ● Afgerond · EN Completed (was Afgesloten / Closed), en "nadat de bestelling is afgerond" in de teksten eronder.
- ● Het etiket boven het tweede vak: Na de levering · EN After delivery (stond twee keer Onderweg).
- ● Revisie aangevraagd (was Revisie gevraagd), zoals op de kaart in Studio.
- ● Formaten, JPG eerst: De standaard: het formaat dat elk systeem aanneemt. Voor een productpagina, een lookbook, een mail. · PNG: Met één klik erbij. Zonder kwaliteitsverlies, het grootste bestand: voor drukwerk en voor alles wat nog bewerkt wordt. · WebP: Met één klik erbij. Een derde van de grootte bij dezelfde kwaliteit: voor je eigen site, zodat een pagina snel laadt. · EN The default: … / One click to add. Lossless, … / One click to add. A third of the size …
- ● De map in de mockup komt uit dezelfde code als de echte zip: 01 - Wijde jeans/ met JPG/voorkant.jpg, en PNG en WEBP met "· met één klik erbij".
- ● Beveiliging: Tegen raden beschermd — Wie blijft proberen, wordt na een paar pogingen tegengehouden, nog voordat er iets wordt opgezocht. · EN Protected against guessing — Keep trying and you are stopped after a few attempts, before anything is looked up. (was Snelheidsbegrensd, "het endpoint", "het record").
- ● Hij verloopt: De link werkt niet meer vanaf ⟨90⟩ dagen nadat de bestelling is afgerond. De bronbestanden die je stuurde worden ⟨90⟩ dagen na het afronden verwijderd.
- ● Slot: … VISUAILS Studio krijg je bij elke betaalde bestelling. · EN VISUAILS Studio comes with every paid order. (was "Het portaal").

## Het merk
- ● Studio, de privélink, de mail en de mockups op /studio gebruiken het nieuwe woordmerk (src/data/woordmerk.js), één pad.
- ● Klap je in Studio de zijbalk in, dan schuift het woordmerk dicht tot de V, en open weer terug (0,46 s; met "minder beweging" meteen).
- ● Links in de bovenbalk van de site staat de V (met de glitch), niet meer het woordmerk. In het menu op de telefoon ook.
- ● De mail begint wit, met het woordmerk in inkt (img/mail/woordmerk-inkt.png, 124 × 22).


## Kleine punten (14 oktober 2026, 18:05)
- ● Het proefblok op /how-it-works en /studio, de kop: Eén product van jezelf, voor ⟨€1⟩ · EN One of your own products, for ⟨€1⟩ (was "…, als set of carrousel, voor" / "…, as a set or a carousel, for": op een telefoon drie regels).
- ● /how-it-works, de zin eronder: Als catalogset of carrousel · één proef per bedrijf · ⟨excl. btw⟩ · zonder verplichting. · EN As a catalog set or a carousel · one test sample per business · ⟨excl. VAT⟩ · no commitment.
- = /test-sample: dezelfde kop, op een scherm tot 340 px 26 px groot in plaats van 30 (twee regels in plaats van drie).
- Op een telefoon schuift de WhatsApp-knop boven de uitlegbalk zolang die onderin plakt.
- De favicons (PNG en .ico) hebben het witte V-teken van favicon.svg; vorm en violet zijn gelijk gebleven.
