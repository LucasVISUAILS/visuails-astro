# Teksten · levering 69 (5 november 2026)

Elke zin die een klant leest en die in levering 69 nieuw is of veranderde, NL en EN, met de plek.
Een ● is nieuw of anders. Onderaan staan de zinnen die alleen jij in /admin leest. Jij loopt ze na;
ik heb geen enkele zin als af beschouwd.

## De mail "Betaallink opnieuw mailen" (nieuw, `src/lib/betaallink.js`, `opnieuw`)
De knop in /admin stuurde de btw-mail ("Je btw-gegevens zijn goedgekeurd", "Alles klopt"). Nu een eigen mail.
● Onderwerp · NL: Je betaallink, opnieuw — VIS-… · EN: Your payment link, again — VIS-…
● Kop · NL: Je betaallink · EN: Your payment link
● De zin · NL: Hier is de betaallink voor **VIS-…** opnieuw. Na je betaling gaan we voor je aan het werk.
  EN: Here is the payment link for **VIS-…** again. Once you have paid, we start on it.
  (Bij een offerte staat de bestaande zin over het bedrag ertussen: "Dit is de volledige prijs …",
  "Dit is een aanbetaling …" of "Dit is het restant …".)
● De regel op de tijdlijn (de klant ziet die in Studio) · NL: Betaallink opnieuw verstuurd naar … voor € … ·
  EN: Payment link resent to … for € …

## Credits: alleen catalog en lifestyle (§17 punt 8, vraag 2 = a)
● De welkomstmail van het abonnement, eerste maand (`src/lib/invoiceMail.js`, `ledeFirst`)
  NL: Bedankt. Je eerste maand is betaald en … loopt: N credits per maand, die je besteedt aan catalog en lifestyle. Je bestelt wanneer je wilt, via het gewone formulier.
  EN: Thank you. Your first month is paid and … is running: N credits a month, which you spend on catalog and lifestyle. You order whenever you like, through the regular form.
● Idem, een vooruitbetaald jaar (`ledeFirstPrepaid`)
  NL: … twaalf maanden lang N credits per maand, die je in VISUAILS Studio besteedt aan catalog en lifestyle. Er wordt dit jaar niets meer afgeschreven. …
  EN: … twelve months of N credits a month, which you spend in VISUAILS Studio on catalog and lifestyle. Nothing else is charged this year. …
● /pricing, de zin bij de abonnementen (`src/components/PricingHal.astro`, `bandZin`)
  NL: Een abonnement geeft je elke maand credits voor catalog en lifestyle: drie vaste abonnementen vanaf € … per maand, of je eigen aantal credits vanaf € ….
  EN: A plan gives you credits every month for catalog and lifestyle: three set plans from € … a month, or your own number of credits from € ….
● De bedankpagina, de vergelijking met het abonnement (`src/components/ThankYouPage.astro`, `compareLs`)
  NL: Het …-abonnement geeft N credits per maand voor € …, te besteden aan catalog en lifestyle. …
  EN: The … plan gives N credits a month for € …, to spend on catalog and lifestyle. …
● De zin na drie maanden bestellen (`src/data/pricing.js`, `upgradePrompt`)
  NL: … Het …-abonnement geeft N credits per maand voor € …, te besteden aan catalog en lifestyle.
  EN: … The … plan gives N credits a month for € …, to spend on catalog and lifestyle.
● De tips in de creditherinnering (`cron/index.js`, `creditTips`): geen nieuwe zin, maar er staat
  nooit meer een tip voor motion, de lifestyle-clip of een hook ("2 × motion"), alleen catalogsets en
  lifestylecarrousels.

## Eigen cataloglook (§17 punt 2)
● De kaart (`src/data/catalogStyles.nl.js` en `catalogStyles.js`, `cardDesc`)
  NL: Een catalog-look ontworpen rond jouw merk — daarna elk product als set van vier foto’s, vanaf het gewone tarief.
  EN: A catalog look designed around your brand — then every product as a four-photo set, from the regular rate.

## Privacybeleid §5 · de lijst van ontvangers (`src/data/subverwerkers.js`, §17 punt 6)
● Nieuwe regel · naam: e-Boekhouden.nl
  waar · NL: Nederland (EU) · EN: the Netherlands (EU)
  wat · NL: onze boekhouding: de gegevens op je factuur (bedrijfsnaam, contactnaam, adres, e-mailadres, btw- en KVK-nummer) en de facturen zelf
        EN: our bookkeeping: the details on your invoice (company name, contact name, address, email address, VAT and Chamber of Commerce number) and the invoices themselves
  grond · NL: binnen de EU; wettelijke bewaarplicht voor de administratie (art. 6 lid 1 sub c AVG)
          EN: inside the EU; the legal duty to keep records (Art. 6(1)(c) GDPR)
  Kijk na: de juiste naam van de rechtspersoon en of e-Boekhouden de gegevens binnen de EU houdt.
  Daarom staat er nu alleen "e-Boekhouden.nl" en "Nederland (EU)".
● "Laatst gewijzigd" boven de lijst · NL: 5 november 2026 · EN: 5 November 2026
● "Laatst bijgewerkt" van /privacy en /data-processing-agreement · NL: november 2026 · EN: November 2026

## De factuur van een vooruitbetaald jaar (`src/lib/invoice.js`)
De regel zei "Pro — abonnement oktober 2026", alsof het één maand was.
● NL: Pro — abonnement, 12 maanden vooruit (oktober 2026 t/m september 2027)
  EN: Pro — subscription, 12 months in advance (October 2026 to September 2027)

## Alleen in /admin (voor jou)
● De betaalstatus op de klantpagina · betaald met credits (stond als het kale woord "credits")
● /admin/security, na te veel codes · Te veel pogingen. Wacht een kwartier en probeer het dan opnieuw.
● De uitrol, als een test eerst rood was en los slaagde · Let op: test:… faalde eerst en slaagde los. Geef kladblok\uitrol-tests.txt aan Claude als dat vaker gebeurt.
