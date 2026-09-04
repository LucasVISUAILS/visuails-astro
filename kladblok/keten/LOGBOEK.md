# Ketendoorloop — 2026-09-03T09:10

## 0 · Een lege winkel: hoe zien Studio en /admin eruit zonder klanten?

- /admin → 200
- 📷 `01-admin-leeg.png` (900px)
- 📷 `02-studio-login.png` (900px)

## 1 · Klant A (Mara, VOLT) bestelt 3 catalogproducten met foto's

- POST /api/upload (p1 front) → 200 {"ok":true,"batch":"lcAs_eUT7Z6yePI5zzBlEYz-cDIlTa1YI48GJyvx6C0","file":{"key":"intake/lcAs_eUT7Z6yePI5zzBlEYz-cDIlTa1YI
- 5 foto's in batch lcAs_eUT7Z6yePI5zzBlEYz-cDIlTa1YI48GJyvx6C0; R2 telt 5 objecten
- POST /api/order → 303 → /nl/thank-you?ref=VIS-0S4Y-Z35&pay=https%3A%2F%2Fwww.mollie.com%2Fcheckout%2Ftr_00000001
- bestelling VIS-0S4Y-Z35: catalog/unattended, 3 producten, €267 netto, betaling unpaid, review null
- bestanden aan de bestelling: 5 (kind upload)
- details_json sleutels: background, channels, model, product_p1, product_p2, product_p3, material_p1, business_declaration, business_version, no_vat_number, reg_number, uploads, upload_batch, business_kind, business_reg, business_ok, withdrawal_consent · product_p1=Hoodie zwart
- mails tot nu: [hello] New catalog order — VIS-0S4Y-Z35 · [mara] We hebben je aanvraag — VIS-0S4Y-Z35
- Mollie-betaling aangemaakt: tr_00000001 €323.07
- GET /api/order-status?ref → 200 {"cancelled":false,"kind":null}

## 2 · Mara opent VISUAILS Studio (nog niet betaald)

- POST /account/login → 200
- inlogmail: "Je inlogcode voor VISUAILS"
- link: ja · code: 954323
- GET /account/verify/5eLqonWhj00dgM… → 303 → /account
- /account → 200
- 📷 `03-studio-onbetaald-account.png` (1109px)
- /account/orders → 200
- 📷 `04-studio-onbetaald-account-orders.png` (900px)
- /account/brand-kit → 200
- 📷 `05-studio-onbetaald-account-brand-kit.png` (2151px)
- /account/details → 200
- 📷 `06-studio-onbetaald-account-details.png` (1464px)
- /account/invoices → 200
- 📷 `07-studio-onbetaald-account-invoices.png` (900px)
- /account/plan → 200
- 📷 `08-studio-onbetaald-account-plan.png` (900px)

## 3 · Mara betaalt (Mollie → webhook)

- webhook → 200
- bestelling: betaling paid, status received, paid_at 2026-09-03 09:10:04
- facturen: VIS-2026-0001 issued
- mails: [mara] Je inlogcode voor VISUAILS · [hello] Betaald · VIS-0S4Y-Z35 · € 323,07 · [mara] Betaling ontvangen — VIS-0S4Y-Z35
- 📷 `09-studio-betaald-overzicht.png` (924px)
- 📷 `10-studio-betaald-facturen.png` (900px)
- 📷 `11-admin-na-bestelling.png` (900px)
- 📷 `12-admin-bestelling-A.png` (2980px)

## 4 · Studio: de bestelling van A in productie zetten, beelden leveren, aankondigen

- status → in_production: 303 → /admin
- 📷 `13-studio-in-productie.png` (924px)
- geleverde bestanden: 12
- 📷 `14-admin-bestelling-A-geleverd.png` (5235px)
- status → delivered: 303; mails erna: [mara] Je bestelling staat klaar — VIS-0S4Y-Z35
- delivered_at 2026-09-03 09:10:09 · delivery_mailed_at 2026-09-03 09:10:09
- links in de leveringsmail: /img/mail/mark-groen.png , /o/XMiFwef5elG7uD-2Uivugoq39A0gCO_zL5q1poGFVCY , /o/XMiFwef5elG7uD-2Uivugoq39A0gCO_zL5q1poGFVCY , /nl/terms , /nl/privacy
- portaallink in de mail: /o/XMiFwef5elG7uD-2Uivugoq39A0gCO_zL5q1poGFVCY
- order_tokens: {"id":1,"order_id":1,"issued_at":"2026-09-03 09:09:59","expires_at":null,"revoked_at":"2026-09-03 09:10:09","token_hash":"0e169d8c9324b17fdd67a117837dc1266f214682aa16ffd4bafed2b203731333"} · hash van maillink = false
- order_tokens: {"id":2,"order_id":1,"issued_at":"2026-09-03 09:10:09","expires_at":null,"revoked_at":null,"token_hash":"707ff4c70d375bcf554740f0975c541137ee4f71a5027f4e86efcd438733e9a6"} · hash van maillink = true
- 📷 `15-studio-geleverd-overzicht.png` (1306px)
- 📷 `16-studio-geleverd-bestelling.png` (1402px)
- 📷 `17-studio-geleverd-product-open.png` (1875px)
- zip-download → 200 application/zip attachment; filename="VISUAILS-VIS-0S4Y-Z35.zip"; filename*=UTF-8''VISUAILS-VIS-0S4Y-Z35.zip

## 5 · Mara keurt goed, vraagt één revisie aan, en rondt de ronde af

- approve p1/front → 303
- revisieronde met 1 beeld p1/back → 303 → /account/orders?ronde=verstuurd; mails: [hello] Revisieronde · VIS-0S4Y-Z35 · 1 beeld
- bestand staat op revision_requested met notitie "De rugprint staat te laag, graag iets hoger."
- 📷 `18-studio-revisie-aangevraagd.png` (1687px)
- nog een ronde zonder beelden → 303 → /account/orders?ronde=leeg (verwacht: geweigerd)
- revision_round_at 2026-09-03 09:10:12 · count null · note null
- 📷 `19-admin-revisie-binnen.png` (1089px)

## 6 · Studio vervangt het beeld en kondigt aan; Mara ziet het nieuwe beeld

- vervangend beeld → 200
- oude beeld: superseded_at 2026-09-03 09:10:14, review_state revision_requested
- aankondigen → 303 → /admin/orders/1/files?announced=1; mails: [mara] Je revisie staat klaar — VIS-0S4Y-Z35
- oude beeld na aankondigen: review_state pending
- open revisieverzoeken in admin-inbox: 0
- 📷 `20-studio-na-vervanging.png` (1720px)
- 📷 `21-admin-na-vervanging.png` (900px)

## 7 · Het portaal uit de mail (/o/<token>) — dezelfde bestelling zonder inloggen

- token 1: issued 2026-09-03 09:09:59, revoked 2026-09-03 09:10:09
- token 2: issued 2026-09-03 09:10:09, revoked 2026-09-03 09:10:14
- token 3: issued 2026-09-03 09:10:14, revoked —
- GET /o/XMiFwef5elG7uD-2U… → 410 — Deze link is vervangen — VISUAILS VISUAILS Deze link is vervangen Voor deze bestelling is een nieuwere link uitgegeven. Kijk in de meest recente mail van ons — 
- 📷 `22-portaal-oude-link.png` (900px)
- nieuwste link uit de laatste mail → 200
- 📷 `23-portaal-nieuwste-link.png` (3090px)
- portaal toont goedkeurknoppen: false

## 8 · Mara geeft feedback en een aanbeveling; de studio keurt die goed

- alles goedgekeurd → closed_at 2026-09-03 09:10:18; mails: geen
- 📷 `24-studio-A-afgerond.png` (1306px)
- feedback score → 303 → /account/orders?order=1#order-1
- feedback aanbeveling → 303 → /account/orders?order=1#order-1
- feedback klik google → 200 → null
- order_feedback: score 5, testimonial ja, consent 1, approved 0
- 📷 `25-admin-aanbevelingen.png` (900px)
- goedkeuren → 303 → /admin/testimonials
- approved nu: 1
- 📷 `26-studio-na-feedback.png` (1306px)

## 9 · Klant B (Joris, NOORD, Duitsland, btw-nummer) bestelt 12 producten met leverdatum

- /api/capacity → 200 {"ok":true,"today":"2026-09-03","tier":"attended","products":12,"service":"catalog","reason":"ok","max":52,"maxImages":210,"windows":[{"start":"2026-09-06","end":"2026-09-07"},{"start":"2026-09-07","e
- VIES-aanroep nagebootst: geldig
- POST /api/order → 303 → /thank-you?ref=VIS-18EE-G91&pay=https%3A%2F%2Fwww.mollie.com%2Fcheckout%2Ftr_00000002
- bestelling VIS-18EE-G91: tier attended, venster 2026-09-06–2026-09-07, land DE, btw eu_reverse_charge 0 valid=1/1, review null, betaling unpaid, expires 2026-09-10 09:10:20
- Mollie-betalingen nu: 2
- mails: [hello] New catalog order — VIS-18EE-G91 · [joris] We've got your request — VIS-18EE-G91
- 📷 `27-admin-btw-controle.png` (900px)
- 📷 `28-admin-planning-met-B.png` (900px)
- POST /account/login → 200
- inlogmail: "Your VISUAILS sign-in code"
- link: ja · code: 959867
- GET /account/verify/7cZQNhV6zXUY6L… → 303 → /account
- 📷 `29-studio-B-overzicht-en.png` (1109px)

## 10 · Btw-besluit in /admin, daarna betaalt B; planning; venster verzetten

- btw-besluit → 303 → /admin/vat
- review_state null, betaling unpaid, payment_ref null, Mollie-betalingen 2, mails: [joris] Your VISUAILS sign-in code
- 📷 `30-studio-B-na-btw.png` (1109px)
- webhook → 200
- B betaling paid; facturen: VIS-2026-0001 issued, VIS-2026-0002 issued
- verzetten → 303 → /admin/planning?verzet=2
- 📷 `31-admin-planning-verzet.png` (1026px)
- 📷 `32-studio-B-bestellingen-na-verzet.png` (900px)

## 11 · Klant C bestelt met leverdatum en betaalt NIET → cron laat het venster los

- POST /api/order → 303
- VIS-1BTW-Y80: venster 2026-09-13–2026-09-14, expires 2026-09-10 09:10:25, deadline null
- cron releaseExpiredWindows → "1 vervallen reservering vrijgegeven: VIS-1BTW-Y80."
- daarna: status received, venster —, betaling unpaid; mails: geen

## 12 · Annuleren met terugbetaling (A) en de creditnota

- annuleren → 303 → /admin
- status cancelled, cancel_payment refund, refunded_cents 0; refunds bij Mollie: 1
- creditnota's vóór de refund-webhook: geen; mails: geen
- refund-webhook → 200
- refunded_cents 32307; creditnota's: VIS-2026-0003 issued; mails: geen
- 📷 `33-studio-A-facturen-na-annulering.png` (900px)
- 📷 `34-studio-A-na-annulering.png` (1260px)

## 13 · Klantgegevens, e-mail wijzigen, vaste look, eigen model

- details opslaan → 303 → /account/details?saved=1#details
- vaste look catalog → 303 → /account/brand-kit?saved=catalog#bk-catalog
- vaste look lifestyle → 303 → /account/brand-kit?saved=lifestyle#bk-lifestyle
- locks: {"style":"catalog","roster_model":"ava","background_hex":"#FFFFFF","look":null,"ratio":null,"channels":"amazon"} {"style":"lifestyle","roster_model":null,"background_hex":null,"look":"glow","ratio":null,"channels":null}
- 📷 `35-studio-vaste-look.png` (919px)
- e-mail wijzigen → 303 → /account/details?email=gevraagd; mails: [mara.nieuw@voorbeeld-volt.nl] Confirm your new email address
- admin: eigen model toevoegen → 303 → /admin/customers/1
- 📷 `36-admin-klant-A.png` (2062px)
- /account/me → 200 {"email":"mara@voorbeeld-volt.nl","name":"Mara Visser","brand":"VOLT","phone":"06 12345678","website":"","vat":"","noVat":false,"country":"NL","first_name":"Mara","last_name":"Visser","address_line1":

## 14 · De cron-taken op deze database

- releaseExpiredWindows → null
- purgeExpiredFiles → null
- sweepAbandonedIntake → null
- issuePendingInvoices → null
- checkPlanQueues → ""
- weekTeStarten → ""
- checkBackupAge → "BACK-UP: er staat geen enkele geslaagde back-up in de database. Draai `npm run backup` en controleer of de taak in de Taakplanner bestaat (

## 15 · Het activiteitenlogboek, de klantenlijst en de trechter

- 📷 `37-admin-eind-admin-log.png` (900px)
- 📷 `38-admin-eind-admin-customers.png` (900px)
- 📷 `39-admin-eind-admin-funnel.png` (900px)
- 📷 `40-admin-eind-admin-agenda.png` (1167px)
- 📷 `41-admin-eind-admin.png` (900px)

## Alle mails die de keten stuurde

- 01 → hello@visuails.com · **New catalog order — VIS-0S4Y-Z35**
- 02 → mara@voorbeeld-volt.nl · **We hebben je aanvraag — VIS-0S4Y-Z35**
- 03 → mara@voorbeeld-volt.nl · **Je inlogcode voor VISUAILS**
- 04 → hello@visuails.com · **Betaald · VIS-0S4Y-Z35 · € 323,07**
- 05 → mara@voorbeeld-volt.nl · **Betaling ontvangen — VIS-0S4Y-Z35**
- 06 → mara@voorbeeld-volt.nl · **Je bestelling staat klaar — VIS-0S4Y-Z35**
- 07 → hello@visuails.com · **Revisieronde · VIS-0S4Y-Z35 · 1 beeld**
- 08 → mara@voorbeeld-volt.nl · **Je revisie staat klaar — VIS-0S4Y-Z35**
- 09 → hello@visuails.com · **New catalog order — VIS-18EE-G91**
- 10 → joris@voorbeeld-noord.de · **We've got your request — VIS-18EE-G91**
- 11 → joris@voorbeeld-noord.de · **Your VISUAILS sign-in code**
- 12 → hello@visuails.com · **Betaald · VIS-18EE-G91 · € 612,00**
- 13 → joris@voorbeeld-noord.de · **Payment received — VIS-18EE-G91**
- 14 → hello@visuails.com · **New lifestyle order — VIS-1BTW-Y80**
- 15 → ayla@voorbeeld-lumen.nl · **We hebben je aanvraag — VIS-1BTW-Y80**
- 16 → mara.nieuw@voorbeeld-volt.nl · **Confirm your new email address**
