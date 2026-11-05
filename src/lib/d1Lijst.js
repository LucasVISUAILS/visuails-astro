/*
 * VISUAILS — een query met een lange lijst waarden, in groepen (5 november 2026).
 *
 * D1 neemt hoogstens 100 gebonden waarden per query; daarboven antwoordt hij met
 * "too many SQL variables". Een `WHERE x IN (?1, ?2, …)` met één plek per bestelling,
 * klant, adres of beeld gaat dus goed zolang de lijst kort is, en breekt zodra de zaak
 * groeit. Gevonden in de beveiligingsronde van 5 november: het dashboard van /admin
 * toont tot 200 bestellingen en vroeg de merkmodellen van al hun klanten in één
 * query, dus vanaf 101 verschillende klanten in de lijst gaf /admin een 500; de rode
 * pil "teruggeboekt" en de markering "mail kwam niet aan" vielen om dezelfde reden
 * stil weg (hun fout werd opgevangen).
 *
 * Deze twee hulpjes vragen in groepen van hoogstens GROEP waarden (80, zodat er naast
 * de lijst nog ruimte is voor de andere ?-plekken van een query) en plakken de rijen
 * aan elkaar. Elke groep is een gewone query; ze lopen na elkaar, niet tegelijk, zodat
 * een lange lijst geen piek aan gelijktijdige verzoeken geeft. Bij een lijst tot 80
 * verandert er niets: één query, zoals voorheen.
 *
 * LET OP DE VOLGORDE: een ORDER BY geldt per groep. Wie de rijen in één volgorde over
 * de hele lijst nodig heeft, sorteert ze daarna zelf. Op de plekken waar dit nu wordt
 * gebruikt, worden de rijen per sleutel gegroepeerd (een Map), en liggen alle rijen
 * van één sleutel in dezelfde groep, dus daar maakt het niet uit.
 *
 * De toets: tests/backend-sterker.test.mjs, met de nep-D1 op de echte grens
 * (`d1(db, { maxWaarden: 100 })`, zie tests/lib/d1sqlite.mjs).
 */

/** De grens van D1 zelf: gebonden waarden per query. */
export const D1_MAX_WAARDEN = 100;

/** Hoeveel waarden uit een lijst er hoogstens in één query gaan. */
export const GROEP = 80;

/** "?1, ?2, …" voor `aantal` plekken, beginnend bij `vanaf`. */
export function plaatsen(aantal, vanaf = 1) {
  return Array.from({ length: aantal }, (_, i) => `?${i + vanaf}`).join(', ');
}

/** De lijst in stukken van hoogstens `grootte`. */
export function inGroepen(lijst, grootte = GROEP) {
  const uit = [];
  for (let i = 0; i < lijst.length; i += grootte) uit.push(lijst.slice(i, i + grootte));
  return uit;
}

/**
 * De rijen van `vraag(deel)` voor elk stuk van de lijst, achter elkaar. `vraag` krijgt
 * een stuk van hoogstens `grootte` waarden en geeft terug wat `.all()` teruggeeft
 * (`{ results }`). Een lege lijst geeft een lege lijst, zonder query.
 */
export async function rijenPerGroep(lijst, vraag, grootte = GROEP) {
  const uit = [];
  for (const deel of inGroepen(lijst, grootte)) {
    const r = await vraag(deel);
    if (r?.results?.length) uit.push(...r.results);
  }
  return uit;
}
