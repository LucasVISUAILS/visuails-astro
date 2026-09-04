-- VISUAILS — het KVK-nummer op de klant, 4 september 2026.
--
-- Doorlichting §3.5: een Nederlandse klant zonder btw-nummer vulde bij elke
-- bestelling opnieuw zijn KVK-nummer in; het stond alleen in details_json
-- (business_reg) van de bestelling. Eén kolom, gevuld bij een bestelling
-- (functions/api/order.js), te wijzigen op Je gegevens, voorgevuld in stap 3
-- en bij een bestelling namens de klant in /admin.
ALTER TABLE customers ADD COLUMN reg_number TEXT;
