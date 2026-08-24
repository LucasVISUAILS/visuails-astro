# Versie 1 — bewaard omdat jouw ingevulde TEKST-00 hiernaar verwijst

Op 24 augustus 2026 zijn er twee fouten in `scripts/tekstronde.mjs` gerepareerd:
de landenkiezer stond verkeerd gepaard (EN Cyprus naast NL Duitsland) en één zin
stond er dubbel in (`site-001` en `site-037`). Bij het opnieuw genereren schoof
daardoor de hele nummering op — terwijl TEKST-00 al was ingevuld.

Deze map is de staat van vóór die reparatie:

- `index-v1.json` — de 3.462 regels met de nummers die in jouw ingevulde
  document staan.
- `TEKST-00-navigatie-en-voettekst.md` — het bestand zoals jij het kreeg.
- `oud-naar-nieuw.json` — per oud nummer het nieuwe id, gevonden via de tekst.
  Alle 286 nummers uit TEKST-00 zijn teruggevonden, dus jouw werk is volledig
  toe te passen.

**Dit hoeft niet bewaard te blijven zodra TEKST-00 verwerkt is.** De nummering
kan sindsdien niet meer verschuiven: een id wordt nu afgeleid uit de tekst zelf
(`maakId()` in het script), dus dezelfde zin houdt hetzelfde id, hoeveel er
omheen ook verandert.
