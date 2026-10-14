/*
 * ═══════════════════════════════════════════════════════════════════════════════
 * DE BOEKHOUDING — FACTUREN, CREDITNOTA'S EN BETALINGEN NAAR E-BOEKHOUDEN
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * 8 oktober 2026, punt 8.08. Lucas koos V7 = a (een boekhoudpakket met API) en
 * schreef erbij: *"Ik gebruik e-boekhouden.nl."* Dit bestand zet elke uitgereikte
 * VIS-factuur, creditnota en abonnementsfactuur in zijn e-Boekhouden-administratie,
 * met de betaling van Mollie ertegenover. Hij typt niets meer over.
 *
 * ── WELKE API, EN WAAROM DEZE VELDEN ─────────────────────────────────────────
 *
 * De REST-API van e-Boekhouden (https://api.e-boekhouden.nl, OpenAPI v1). De
 * veldnamen, types en foutcodes hieronder komen uit die specificatie — niet uit
 * het hoofd. De oude SOAP-API wordt bewust niet gebruikt. Kort:
 *
 *   POST /v1/session    { accessToken, source }  → { token, expiresIn }
 *                       daarna `Authorization: <token>` op elk verzoek
 *   GET  /v1/ledger     ?code=1300               → grootboekrekening-id
 *   GET  /v1/relation   ?email= / ?code=         → relatie zoeken
 *   POST /v1/relation   { type, code, name, … }  → { id, code }
 *   GET  /v1/mutation   ?type=&invoiceNumber=&description=   → bestaat hij al?
 *   POST /v1/mutation   { type, date, ledgerId, invoiceNumber, inExVat,
 *                         relationId, rows: [{ ledgerId, vatCode, amount, … }] }
 *
 * Mutatiesoort 2 is "Factuur verstuurd" (de verkoopfactuur), soort 3 "Factuurbetaling
 * ontvangen". Een creditnota is een soort 2 met negatieve bedragen; een
 * terugbetaling en een storno zijn een soort 3 met een negatief bedrag.
 *
 * GEEN /v1/invoice. Dat is de factuurmodule van e-Boekhouden zelf: die maakt een
 * EIGEN factuur met een eigen opmaak en desnoods een eigen nummer. VISUAILS heeft
 * de factuur al gemaakt, genummerd en gemaild; in e-Boekhouden hoort alleen de
 * BOEKING, met ons nummer. Een pdf meesturen kan de API niet.
 *
 * ── DE DRIE REGELS DIE HIER ALLES BEPALEN ────────────────────────────────────
 *
 *   1 · NOOIT IETS TEGENHOUDEN. Dit draait achteraf (waitUntil, of 's nachts),
 *       nooit in de weg van een betaling, een factuur of een mail. Een fout hier
 *       wordt een rij met status 'mislukt' en een knop "Opnieuw" in /admin.
 *
 *   2 · NOOIT TWEE KEER BOEKEN. Elke boeking is een rij in
 *       `boekhouding_boekingen` met een unieke sleutel (migratie 0056). Vóór elke
 *       POST wordt bovendien bij e-Boekhouden gezocht of hij er al staat — op
 *       factuurnummer, of op de vaste omschrijving van een betaling. Een poging
 *       die halverwege werd afgekapt, of een factuur die Lucas al met de hand had
 *       ingevoerd, wordt daardoor overgenomen in plaats van verdubbeld.
 *
 *   3 · UIT ZOLANG HET GEHEIM ER NIET IS. Zonder EBOEKHOUDEN_API_TOKEN doet dit
 *       bestand niets: geen verzoek, geen rij.
 *
 * ── WAT 'MOLLIE' HIER IS ─────────────────────────────────────────────────────
 *
 * Een tussenrekening (grootboek, categorie FIN). Mollie zet het geld niet per
 * betaling op de bank maar in partijen, min kosten. Elke betaling komt dus eerst
 * op "Mollie"; de uitbetaling naar de bank boekt Lucas (of de bankkoppeling van
 * e-Boekhouden) van Mollie naar Bank. Zo klopt de rekening Mollie met het saldo
 * in het Mollie-dashboard.
 */

import { VAT_RATE } from '../data/pricing.js';
import { VAT_TREATMENT, EU_COUNTRIES, OTHER_COUNTRIES } from '../data/vat.js';
import { mollieAmountToCents } from './mollie.js';
import { bedrag } from './mailTemplate.js';

const BASIS = 'https://api.e-boekhouden.nl';

/* ── DE STANDAARDINSTELLINGEN — om na te kijken ──────────────────────────────
 *
 * Elke waarde is te overschrijven met een variabele van BEIDE workers (de site
 * en visuails-cron), met de naam die erachter staat — in het dashboard als
 * Secret, want een tekstvariabele uit het dashboard verdwijnt bij de volgende
 * `wrangler deploy` (wrangler.toml heeft een eigen [vars]). Ze staan hier en niet
 * in wrangler.toml, omdat het twee workers zijn: twee lijsten in twee bestanden
 * lopen een keer uit elkaar. Zie kladblok/E-BOEKHOUDEN-KOPPELEN.md.
 *
 * De grootboekCODES (zoals 1300) zijn wat je in e-Boekhouden ziet. De API wil
 * het interne id; dat zoekt deze code zelf op met GET /v1/ledger?code=.
 *
 * DE BTW-CODES komen uit de lijst van e-Boekhouden:
 *   HOOG_VERK_21   verkoop met 21% btw                  → rubriek 1a
 *   BI_EU_VERK_D   diensten binnen de EU, 0%, verlegd   → rubriek 3b en de ICP
 *   BU_EU_VERK     "leveringen buiten de EU, 0%"        → LAAT DE BOEKHOUDER KIJKEN
 * De laatste is de twijfel: VISUAILS levert een DIENST buiten de EU, en de lijst
 * van e-Boekhouden noemt bij BU_EU_VERK "leveringen". Of dat de goede rubriek is
 * (of dat het GEEN moet zijn), is een vraag voor een boekhouder — zie de
 * stappenkaart in kladblok/E-BOEKHOUDEN-KOPPELEN.md.
 */
export const STANDAARD = {
  /** `source` bij het openen van een sessie: 1–10 tekens, letters, cijfers, _ en spatie. */
  bron: 'VISUAILS',                       // EBOEKHOUDEN_BRON
  grootboek: {
    debiteuren: '1300',                   // EBOEKHOUDEN_GROOTBOEK_DEBITEUREN
    omzet: '8000',                        // EBOEKHOUDEN_GROOTBOEK_OMZET
    /* Leeg = dezelfde als omzet. De btw-code bepaalt de rubriek, niet de rekening. */
    omzetEu: '',                          // EBOEKHOUDEN_GROOTBOEK_OMZET_EU
    omzetBuitenEu: '',                    // EBOEKHOUDEN_GROOTBOEK_OMZET_BUITEN_EU
    /* Bestaat nog niet: maak hem aan (categorie FIN). Zie de stappenkaart. */
    mollie: '1105',                       // EBOEKHOUDEN_GROOTBOEK_MOLLIE
  },
  btw: {
    nl: 'HOOG_VERK_21',                   // EBOEKHOUDEN_BTW_NL
    eu: 'BI_EU_VERK_D',                   // EBOEKHOUDEN_BTW_EU
    buitenEu: 'BU_EU_VERK',               // EBOEKHOUDEN_BTW_BUITEN_EU
  },
};

/** Alle btw-codes die de API kent (de enum `VatCode` uit de specificatie). */
export const BTW_CODES = Object.freeze([
  'HOOG_VERK_21', 'LAAG_VERK_9', 'VERL_VERK', 'VERL_VERK_L9', 'AFW', 'BU_EU_VERK',
  'BI_EU_VERK', 'BI_EU_VERK_D', 'AFST_VERK', 'LAAG_INK_9', 'HOOG_INK_21', 'VERL_INK',
  'AFW_VERK', 'BU_EU_INK', 'BI_EU_INK', 'GEEN',
]);

/** De twee mutatiesoorten die hier gebruikt worden (de enum `MutationType`, een getal). */
export const MUTATIESOORT = Object.freeze({ verkoopfactuur: 2, betalingOntvangen: 3 });

/* Hoeveel tijd één verzoek mag kosten. Een boeking die blijft hangen, houdt
   niemand op — dit draait achteraf — maar een Worker heeft een eindige looptijd
   na het antwoord, en die is beter besteed aan de volgende rij. */
const WACHTTIJD_MS = 15000;

/* Hoe lang een rij op 'bezig' mag staan voordat hij als afgebroken telt. Een
   Worker die halverwege werd gestopt, laat hem zo achter; de volgende run pakt
   hem op, en de zoekvraag vóór de POST voorkomt dat hij dubbel komt. */
const BEZIG_MINUTEN = 10;

/* ─────────────────────────────────────────────────────────────────────────────
 * AAN OF UIT, EN DE INSTELLINGEN
 * ───────────────────────────────────────────────────────────────────────────── */

/** Staat de koppeling aan? Alleen als het geheim gezet is. */
export function koppelingAan(env) {
  return String(env?.EBOEKHOUDEN_API_TOKEN ?? '').trim() !== '';
}

/** De instellingen voor deze omgeving: de standaard, met wat er in env staat erover. */
export function instellingen(env) {
  const v = (naam, standaard) => {
    const w = String(env?.[naam] ?? '').trim();
    return w || standaard;
  };
  const bron = v('EBOEKHOUDEN_BRON', STANDAARD.bron);
  const omzet = v('EBOEKHOUDEN_GROOTBOEK_OMZET', STANDAARD.grootboek.omzet);
  const vanaf = v('EBOEKHOUDEN_VANAF', '');
  return {
    /* De specificatie: `^[\w_ ]{1,10}$`. Een ongeldige bron zou elke sessie laten
       weigeren (API_SESSION_002); dan liever de standaard. */
    bron: /^[\w ]{1,10}$/.test(bron) ? bron : STANDAARD.bron,
    grootboek: {
      debiteuren: v('EBOEKHOUDEN_GROOTBOEK_DEBITEUREN', STANDAARD.grootboek.debiteuren),
      omzet,
      omzetEu: v('EBOEKHOUDEN_GROOTBOEK_OMZET_EU', STANDAARD.grootboek.omzetEu) || omzet,
      omzetBuitenEu: v('EBOEKHOUDEN_GROOTBOEK_OMZET_BUITEN_EU', STANDAARD.grootboek.omzetBuitenEu) || omzet,
      mollie: v('EBOEKHOUDEN_GROOTBOEK_MOLLIE', STANDAARD.grootboek.mollie),
    },
    btw: {
      nl: v('EBOEKHOUDEN_BTW_NL', STANDAARD.btw.nl),
      eu: v('EBOEKHOUDEN_BTW_EU', STANDAARD.btw.eu),
      buitenEu: v('EBOEKHOUDEN_BTW_BUITEN_EU', STANDAARD.btw.buitenEu),
    },
    /** Alleen documenten van deze datum of later. Leeg = de dag van de eerste run. */
    vanaf: /^\d{4}-\d{2}-\d{2}$/.test(vanaf) ? vanaf : null,
    /* PROEF-documenten (een `test_`-sleutel van Mollie) gaan standaard NIET mee.
       Alleen in een proefadministratie zet Lucas dit aan, om de keten met
       testbetalingen te kunnen zien. Zie de stappenkaart. */
    proefreeks: /^(aan|ja|1|true)$/i.test(v('EBOEKHOUDEN_PROEFREEKS', '')),
  };
}

/* ─────────────────────────────────────────────────────────────────────────────
 * REKENEN: CENTEN, EURO'S EN DE BTW-CODE
 * ───────────────────────────────────────────────────────────────────────────── */

/** VISUAILS rekent in centen; de API wil euro's als getal met twee decimalen. */
export function naarEuro(cents) {
  return Math.round(Number(cents) || 0) / 100;
}

/** De btw-code bij een behandeling op de factuur (src/data/vat.js). */
export function btwCodeVoor(treatment, inst) {
  if (treatment === VAT_TREATMENT.reverseCharge) return inst.btw.eu;
  if (treatment === VAT_TREATMENT.outsideScope) return inst.btw.buitenEu;
  return inst.btw.nl;
}

/** De omzetrekening bij een behandeling. */
export function omzetCodeVoor(treatment, inst) {
  if (treatment === VAT_TREATMENT.reverseCharge) return inst.grootboek.omzetEu;
  if (treatment === VAT_TREATMENT.outsideScope) return inst.grootboek.omzetBuitenEu;
  return inst.grootboek.omzet;
}

/* Het tarief achter een verkoopcode. HOOG_VERK_21 is het Nederlandse tarief,
   en dat staat als VAT_RATE in pricing.js; de rest van de verkoopcodes die
   VISUAILS kan gebruiken, rekent 0%. */
function btwTarief(code) {
  if (code === 'HOOG_VERK_21') return VAT_RATE;
  if (code === 'LAAG_VERK_9') return 0.09;
  return 0;
}

/*
 * ── INCLUSIEF OF EXCLUSIEF — EN DAN TOT OP DE CENT ──────────────────────────
 *
 * e-Boekhouden rekent de btw zelf uit, uit het bedrag en de btw-code. Komt daar
 * een cent anders uit dan op onze factuur, dan klopt de boekhouding niet met het
 * document dat de klant heeft. Dus wordt gekozen op het bedrag dat SAMENVALT:
 *
 *   EX — netto meesturen, als btw = netto × tarief (zo rekent quote.js voor een
 *        bestelling, dus dit is het gewone geval);
 *   IN — bruto meesturen, als netto = bruto ÷ (1 + tarief) (zo rekent een
 *        abonnementsfactuur, die van het geïncasseerde bedrag terugrekent).
 *
 * Past geen van beide, dan wordt er NIET geboekt: een fout die je ziet is beter
 * dan een cent verschil die niemand ziet tot de aangifte.
 */
export function inOfEx({ netCents, vatCents, grossCents = null, btwCode }) {
  const net = Math.abs(Math.round(Number(netCents) || 0));
  const vat = Math.abs(Math.round(Number(vatCents) || 0));
  const gross = grossCents === null ? net + vat : Math.abs(Math.round(Number(grossCents) || 0));
  const tarief = btwTarief(btwCode);
  if (!(tarief > 0)) {
    if (vat !== 0) {
      throw new EboekhoudenFout(`Btw-code ${btwCode} rekent geen btw, maar op het document staat ${bedrag(vat)} btw. Boek dit document met de hand of kijk de btw-code na.`);
    }
    return { inExVat: 'EX', cents: net };
  }
  if (Math.round(net * tarief) === vat) return { inExVat: 'EX', cents: net };
  if (Math.round(gross / (1 + tarief)) === net) return { inExVat: 'IN', cents: gross };
  throw new EboekhoudenFout(`De btw op het document (${bedrag(vat)} op ${bedrag(net)}) is niet ${Math.round(tarief * 100)}% — met btw-code ${btwCode} zou e-Boekhouden iets anders boeken. Boek dit document met de hand.`);
}

/* ─────────────────────────────────────────────────────────────────────────────
 * DE MUTATIES ZELF — losse functies, zodat de toets precies kan zien wat er
 * naar e-Boekhouden gaat
 * ───────────────────────────────────────────────────────────────────────────── */

const kort = (t, n = 200) => String(t ?? '').replace(/\s+/g, ' ').trim().slice(0, n);

/**
 * Een verkoopfactuur of creditnota als mutatie (soort 2).
 *
 * `snap` is de bewaarde momentopname van het document (snapshot_json). Een
 * creditnota staat daarin met POSITIEVE bedragen (het teken staat in de titel,
 * zie migratie 0026); hier krijgt hij het minteken dat e-Boekhouden verwacht.
 */
export function mutatieVoorDocument({ snap, nummer, datum, relatieId, debiteurenId, omzetId, btwCode, creditnota = false, omschrijving }) {
  if (!BTW_CODES.includes(btwCode)) {
    throw new EboekhoudenFout(`"${btwCode}" is geen btw-code van e-Boekhouden. Kijk de instelling na (EBOEKHOUDEN_BTW_…).`);
  }
  const teken = creditnota ? -1 : 1;
  const net = Math.round(Number(snap?.netCents) || 0);
  const vat = Math.round(Number(snap?.vatCents) || 0);
  const gross = Number.isFinite(Number(snap?.grossCents)) ? Math.round(Number(snap.grossCents)) : net + vat;
  const keuze = inOfEx({ netCents: net, vatCents: vat, grossCents: gross, btwCode });

  /* Per factuurregel een mutatieregel, als dat optelt; anders één regel met het
     totaal. VISUAILS zet op een document altijd één regel (zie snapshotFromOrder),
     dus het tweede pad is het vangnet. */
  const lijnen = Array.isArray(snap?.lines) ? snap.lines : [];
  const somLijnen = lijnen.reduce((s, l) => s + Math.round(Number(l?.totalCents) || 0), 0);
  const perLijn = keuze.inExVat === 'EX' && lijnen.length > 0 && somLijnen === net;
  const omschrijvingVan = (l) => kort([l?.description, l?.detail].filter(Boolean).join(' — ') || omschrijving);
  const regels = perLijn
    ? lijnen.map((l) => ({ cents: Math.round(Number(l.totalCents) || 0), omschrijving: omschrijvingVan(l) }))
    : [{ cents: keuze.cents, omschrijving: omschrijvingVan(lijnen[0] || {}) }];

  return {
    type: MUTATIESOORT.verkoopfactuur,
    date: datum,
    ledgerId: debiteurenId,
    invoiceNumber: nummer,
    description: kort(omschrijving),
    inExVat: keuze.inExVat,
    relationId: relatieId,
    rows: regels.map((r) => ({
      ledgerId: omzetId,
      vatCode: btwCode,
      amount: naarEuro(teken * r.cents),
      description: r.omschrijving,
    })),
  };
}

/**
 * Geld op de tussenrekening Mollie, tegen een openstaande factuur (soort 3).
 * Positief = binnengekomen; negatief = terugbetaald of teruggeboekt (storno).
 *
 * Het factuurnummer en de relatie staan OOK op de regel: de specificatie vraagt
 * ze daar bij een factuurbetaling (MUT_120 en MUT_112), want dat is hoe
 * e-Boekhouden de betaling aan de openstaande post koppelt — het afletteren.
 */
export function mutatieVoorGeld({ datum, mollieId, debiteurenId, document, bedragCents, relatieId, omschrijving }) {
  return {
    type: MUTATIESOORT.betalingOntvangen,
    date: datum,
    ledgerId: mollieId,
    invoiceNumber: document,
    description: kort(omschrijving),
    inExVat: 'EX',
    relationId: relatieId,
    rows: [{
      ledgerId: debiteurenId,
      vatCode: 'GEEN',
      amount: naarEuro(bedragCents),
      invoiceNumber: document,
      relationId: relatieId,
      description: kort(omschrijving),
    }],
  };
}

/* De landnaam zoals e-Boekhouden hem in zijn eigen scherm toont ("Nederland").
   Onbekende code: de code zelf, dan staat er tenminste iets. */
function landNaam(code) {
  const up = String(code || '').trim().toUpperCase();
  if (!up) return undefined;
  const hit = [...EU_COUNTRIES, ...OTHER_COUNTRIES].find((c) => c.id === up);
  return hit && up !== 'XX' ? hit.nl : up;
}

/** De vaste relatiecode voor een VISUAILS-klant: VIS + klantnummer. */
export function relatieCode(klantId) {
  return Number.isInteger(Number(klantId)) && Number(klantId) > 0 ? `VIS${Number(klantId)}` : '';
}

/** De velden voor een nieuwe relatie (POST /v1/relation). Alleen wat er is. */
export function relatieVelden(klant, code = '') {
  const kvk = String(klant?.kvk || '').replace(/\D/g, '');
  const email = String(klant?.email || '').trim().toLowerCase();
  const velden = {
    /* VISUAILS levert alleen aan bedrijven (zie business-only), dus altijd 'B'. */
    type: 'B',
    code: code || undefined,
    name: kort(klant?.bedrijf || klant?.naam || email || 'Klant zonder naam', 100),
    contact: klant?.bedrijf && klant?.naam ? kort(klant.naam, 100) : undefined,
    address: kort(klant?.adres, 100) || undefined,
    postalCode: kort(klant?.postcode, 20) || undefined,
    city: kort(klant?.plaats, 100) || undefined,
    country: landNaam(klant?.land),
    emailAddress: email || undefined,
    vatNumber: kort(String(klant?.btw || '').replace(/\s+/g, '').toUpperCase(), 30) || undefined,
    /* De specificatie: alleen cijfers (REL_008). Een buitenlands nummer met letters
       laten we dus weg in plaats van de hele relatie te laten weigeren. */
    companyRegistrationNumber: /^\d{6,12}$/.test(kvk) ? kvk : undefined,
  };
  return Object.fromEntries(Object.entries(velden).filter(([, w]) => w !== undefined && w !== ''));
}

/* ─────────────────────────────────────────────────────────────────────────────
 * DE CLIENT
 * ───────────────────────────────────────────────────────────────────────────── */

/**
 * Een fout van of over e-Boekhouden. `code` is de foutcode uit de API (MUT_019,
 * REL_023, API_SESSION_003 …), `stopAlles` zegt dat de volgende rij in dezelfde
 * run toch ook zou falen (geen verbinding, geen sessie).
 */
export class EboekhoudenFout extends Error {
  constructor(bericht, { status = 0, code = '', stopAlles = false } = {}) {
    super(bericht);
    this.name = 'EboekhoudenFout';
    this.status = status;
    this.code = code;
    this.stopAlles = stopAlles;
  }
}

/**
 * Een client voor één run. De sessie en de opgezochte grootboek-id's blijven
 * binnen de run bewaard; een volgende run begint opnieuw. Dat is goedkoop
 * (één verzoek) en het voorkomt een sessietoken dat ergens blijft rondzwerven.
 *
 * `fetchFn` is er voor de toetsen.
 */
export function maakClient(env, { fetchFn = null, basis = BASIS } = {}) {
  const inst = instellingen(env);
  const haal = fetchFn || ((...a) => globalThis.fetch(...a));
  let sessie = null;
  const grootboekIds = new Map();

  async function rauw(method, pad, { query = null, body, token = null } = {}) {
    const url = new URL(basis + pad);
    for (const [k, w] of Object.entries(query || {})) {
      if (w !== undefined && w !== null && w !== '') url.searchParams.set(k, String(w));
    }
    const headers = { Accept: 'application/json' };
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    /* Het token kaal, zonder "Bearer": zo staat het in de Quick Start van de
       specificatie (`Authorization: SESSION_TOKEN`) en zo is het securityschema
       gedefinieerd (een apiKey in de header Authorization). */
    if (token) headers.Authorization = token;
    let res;
    try {
      res = await haal(url.toString(), {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: AbortSignal.timeout(WACHTTIJD_MS),
      });
    } catch (e) {
      const waarom = e?.name === 'TimeoutError' ? `geen antwoord binnen ${WACHTTIJD_MS / 1000} seconden` : (e?.message || String(e));
      throw new EboekhoudenFout(`e-Boekhouden is niet bereikbaar (${waarom}).`, { stopAlles: true });
    }
    const tekst = await res.text().catch(() => '');
    let data = null;
    try { data = tekst ? JSON.parse(tekst) : null; } catch { data = null; }
    if (res.ok) return data ?? {};

    /* De foutvorm uit de specificatie: { type, code, title, message, status,
       traceId, errors }. Hoofdletters ook, want het voorbeeld in de
       specificatie schrijft ze zo. */
    const code = String(data?.code ?? data?.Code ?? '');
    const titel = String(data?.title ?? data?.Title ?? '');
    const extra = String(data?.message ?? data?.Message ?? '');
    const lijst = Array.isArray(data?.errors ?? data?.Errors) ? (data.errors ?? data.Errors).join('; ') : '';
    const bericht = [code, titel || `HTTP ${res.status}`, extra, lijst].filter(Boolean).join(' — ');
    throw new EboekhoudenFout(bericht, {
      status: res.status,
      code,
      stopAlles: res.status >= 500 || res.status === 429 || res.status === 403,
    });
  }

  async function token() {
    if (sessie && sessie.tot > Date.now() + 30_000) return sessie.token;
    let data;
    try {
      data = await rauw('POST', '/v1/session', {
        body: { accessToken: String(env?.EBOEKHOUDEN_API_TOKEN ?? '').trim(), source: inst.bron },
      });
    } catch (e) {
      /* Geen sessie = elke rij in deze run zou hier stranden. Alleen een WEIGERING
         (400/403: token ontbreekt, verlopen of onbekend) wijst naar het token; een
         storing (geen verbinding, 5xx) zegt dat zelf al en heeft niets met het
         token te maken. */
      if (e instanceof EboekhoudenFout) {
        e.stopAlles = true;
        if (e.status >= 400 && e.status < 500) {
          e.message = `Inloggen bij e-Boekhouden lukt niet (${e.message.replace(/\.$/, '')}). Kijk het token na: Beheer → API-token in e-Boekhouden, en EBOEKHOUDEN_API_TOKEN in Cloudflare.`;
        }
      }
      throw e;
    }
    if (!data?.token) throw new EboekhoudenFout('e-Boekhouden gaf geen sessie terug.', { stopAlles: true });
    const seconden = Number(data.expiresIn) > 0 ? Number(data.expiresIn) : 600;
    sessie = { token: String(data.token), tot: Date.now() + seconden * 1000 };
    return sessie.token;
  }

  /* Een verlopen sessie geeft 401. Eén keer opnieuw inloggen en het nog eens
     proberen; daarna is het een echte fout. */
  async function verzoek(method, pad, opties = {}) {
    try {
      return await rauw(method, pad, { ...opties, token: await token() });
    } catch (e) {
      if (e instanceof EboekhoudenFout && e.status === 401) {
        sessie = null;
        try {
          return await rauw(method, pad, { ...opties, token: await token() });
        } catch (e2) {
          if (e2 instanceof EboekhoudenFout && e2.status === 401) e2.stopAlles = true;
          throw e2;
        }
      }
      throw e;
    }
  }

  const items = (data) => (Array.isArray(data?.items) ? data.items : []);

  return {
    instellingen: inst,

    /** Het interne id van een grootboekrekening, op de code die Lucas kent. */
    async grootboek(code) {
      const c = String(code || '').trim();
      if (grootboekIds.has(c)) return grootboekIds.get(c);
      const lijst = items(await verzoek('GET', '/v1/ledger', { query: { code: c, limit: 10 } }));
      const hit = lijst.find((l) => String(l?.code) === c) || null;
      if (!hit || !Number.isInteger(Number(hit.id))) {
        throw new EboekhoudenFout(`Grootboekrekening ${c} bestaat niet in e-Boekhouden. Maak hem aan of zet de goede code in de instellingen.`, { stopAlles: true });
      }
      grootboekIds.set(c, Number(hit.id));
      return Number(hit.id);
    },

    /** Een grootboekrekening met alles erop, voor de test in /admin/diagnose. */
    async grootboekInfo(code) {
      const c = String(code || '').trim();
      const lijst = items(await verzoek('GET', '/v1/ledger', { query: { code: c, limit: 10 } }));
      return lijst.find((l) => String(l?.code) === c) || null;
    },

    async zoekRelaties(filter) {
      return items(await verzoek('GET', '/v1/relation', { query: { ...filter, limit: 10 } }));
    },

    async maakRelatie(velden) {
      const data = await verzoek('POST', '/v1/relation', { body: velden });
      if (!Number.isInteger(Number(data?.id))) throw new EboekhoudenFout('e-Boekhouden gaf geen relatienummer terug.');
      return { id: Number(data.id), code: data.code ?? null };
    },

    async zoekMutaties(filter) {
      return items(await verzoek('GET', '/v1/mutation', { query: { ...filter, limit: 10 } }));
    },

    async mutatie(id) {
      return await verzoek('GET', `/v1/mutation/${encodeURIComponent(String(id))}`);
    },

    async maakMutatie(body) {
      const data = await verzoek('POST', '/v1/mutation', { body });
      if (data?.id === undefined || data?.id === null) throw new EboekhoudenFout('e-Boekhouden gaf geen mutatienummer terug.');
      return Number(data.id);
    },

    /** Sessie netjes afsluiten. Mislukt dat, dan verloopt hij vanzelf. */
    async sluit() {
      if (!sessie) return;
      const t = sessie.token;
      sessie = null;
      try { await rauw('DELETE', '/v1/session', { token: t }); } catch { /* verloopt vanzelf */ }
    },
  };
}

/* ─────────────────────────────────────────────────────────────────────────────
 * DE LIJST: WAT ER GEBOEKT MOET WORDEN
 *
 * De lijst wordt AFGELEID uit wat er al in de database staat — uitgereikte
 * documenten, betaalde betalingen, terugbetaalde bedragen — en niet bijgehouden
 * op elke plek waar een factuur ontstaat. Er zijn vier wegen naar een factuur
 * (webhook, Studio, /admin, de nachtelijke taak) en een lijst die op één ervan
 * vergeten wordt, mist precies de factuur waar niemand naar kijkt. Afleiden
 * vangt ze alle vier. De sleutel maakt het herhaalbaar: INSERT OR IGNORE.
 *
 * Eén uitzondering: een storno (terugboeking door de bank van de klant) staat
 * in geen enkele kolom, alleen in de melding van Mollie. Die komt binnen via
 * meldStorno() vanuit de webhook.
 * ───────────────────────────────────────────────────────────────────────────── */

const vandaagUtc = () => new Date().toISOString().slice(0, 10);

async function eerste(env, sql, ...binds) {
  return await env.DB.prepare(sql).bind(...binds).first();
}
async function alle(env, sql, ...binds) {
  return (await env.DB.prepare(sql).bind(...binds).all())?.results || [];
}

/* De datum vanaf wanneer er geboekt wordt. Zonder instelling: de dag dat de
   koppeling voor het eerst draaide, bewaard in app_settings. Zo gaat er bij het
   aanzetten geen half jaar aan oude facturen ineens naar e-Boekhouden — die
   staan er misschien al, met de hand ingevoerd. Wie dat wél wil, zet
   EBOEKHOUDEN_VANAF op een eerdere datum; de zoekvraag vóór elke boeking
   voorkomt dan dat een al ingevoerde factuur dubbel komt. */
export async function vanafDatum(env, inst = instellingen(env), vandaag = null) {
  if (inst.vanaf) return inst.vanaf;
  const dag = vandaag || vandaagUtc();
  await env.DB.prepare("INSERT OR IGNORE INTO app_settings (key, value) VALUES ('boekhouding_vanaf', ?1)").bind(dag).run();
  const rij = await eerste(env, "SELECT value FROM app_settings WHERE key = 'boekhouding_vanaf'");
  return /^\d{4}-\d{2}-\d{2}$/.test(String(rij?.value || '')) ? rij.value : dag;
}

async function zetKlaar(env, r) {
  const res = await env.DB.prepare(
    `INSERT OR IGNORE INTO boekhouding_boekingen
       (sleutel, soort, document, bron, bron_id, order_id, bedrag_cents, datum, kenmerk)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)`
  ).bind(r.sleutel, r.soort, r.document, r.bron, r.bronId, r.orderId ?? null,
    Math.round(r.bedragCents || 0), r.datum, r.kenmerk ?? null).run();
  return Number(res?.meta?.changes) > 0 ? 1 : 0;
}

const datumVan = (rij, snap) => String(snap?.date || rij.issued_at || rij.created_at || vandaagUtc()).slice(0, 10);
const leesSnap = (s) => { try { return JSON.parse(s || '{}') || {}; } catch { return {}; } };

/**
 * Zet op de lijst wat er nog niet op staat. Met `orderId` of
 * `subscriptionPaymentId` alleen die ene bestelling of termijn (de webhook);
 * zonder allebei alles (de nachtelijke taak). Geeft het aantal nieuwe rijen.
 *
 * ZUINIG MET VRAGEN. Elke vraag hieronder slaat over wat al op de lijst staat
 * (NOT EXISTS op de sleutel), zodat een nacht met niets nieuws een handvol
 * vragen kost en niet één per factuur sinds de vanafdatum — een Worker mag per
 * aanroep maar een beperkt aantal databasevragen doen.
 */
export async function verzamel(env, { orderId = null, subscriptionPaymentId = null, vandaag = null } = {}) {
  if (!koppelingAan(env)) return 0;
  const inst = instellingen(env);
  const vanaf = await vanafDatum(env, inst, vandaag);
  const dag = vandaag || vandaagUtc();
  const proef = (a) => (inst.proefreeks ? '' : ` AND ${a}.testmodus = 0`);
  const nogNiet = (sleutel) => `NOT EXISTS (SELECT 1 FROM boekhouding_boekingen x WHERE x.sleutel = ${sleutel})`;
  const metBestellingen = !subscriptionPaymentId || orderId;
  const metAbonnementen = !orderId || subscriptionPaymentId;
  const opBestelling = (a) => (orderId ? ` AND ${a}.order_id = ?2` : '');
  const bindB = orderId ? [vanaf, orderId] : [vanaf];
  let nieuw = 0;

  if (metBestellingen) {
    /* 1 · Facturen op bestellingen. */
    const facturen = await alle(env,
      `SELECT i.id, i.number, i.order_id, i.snapshot_json, i.issued_at, i.created_at FROM invoices i
        WHERE i.status = 'issued'${proef('i')} AND substr(COALESCE(i.issued_at, i.created_at), 1, 10) >= ?1${opBestelling('i')}
          AND ${nogNiet("'factuur:' || i.number")}
        ORDER BY i.id`, ...bindB);
    for (const f of facturen) {
      const snap = leesSnap(f.snapshot_json);
      nieuw += await zetKlaar(env, {
        sleutel: `factuur:${f.number}`, soort: 'factuur', document: f.number, bron: 'invoice', bronId: f.id,
        orderId: f.order_id, bedragCents: snap.grossCents, datum: datumVan(f, snap),
      });
    }

    /* 2 · De betalingen daarop. Elke betaalde Mollie-betaling op een bestelling
       met een factuur die mee mag — ook een tweede betaling die later kwam. */
    const betalingen = await alle(env,
      `SELECT p.external_id, p.amount_cents, p.created_at, i.id AS factuur_id, i.number, i.order_id
         FROM payments p JOIN invoices i ON i.order_id = p.order_id
        WHERE i.status = 'issued'${proef('i')} AND substr(COALESCE(i.issued_at, i.created_at), 1, 10) >= ?1${opBestelling('i')}
          AND p.status IN ('paid', 'refunded') AND p.amount_cents > 0 AND UPPER(COALESCE(p.currency, 'EUR')) = 'EUR'
          AND ${nogNiet("'betaling:' || p.external_id")}
        ORDER BY p.id`, ...bindB);
    for (const p of betalingen) {
      nieuw += await zetKlaar(env, {
        sleutel: `betaling:${p.external_id}`, soort: 'betaling', document: p.number, bron: 'invoice', bronId: p.factuur_id,
        orderId: p.order_id, bedragCents: p.amount_cents, datum: String(p.created_at || dag).slice(0, 10), kenmerk: p.external_id,
      });
    }

    /* 3 · Creditnota's. */
    const notas = await alle(env,
      `SELECT c.id, c.number, c.order_id, c.gross_cents, c.snapshot_json, c.issued_at, c.created_at FROM credit_notes c
        WHERE c.status = 'issued'${proef('c')} AND substr(COALESCE(c.issued_at, c.created_at), 1, 10) >= ?1${opBestelling('c')}
          AND ${nogNiet("'creditnota:' || c.number")}
        ORDER BY c.id`, ...bindB);
    for (const c of notas) {
      const snap = leesSnap(c.snapshot_json);
      nieuw += await zetKlaar(env, {
        sleutel: `creditnota:${c.number}`, soort: 'creditnota', document: c.number, bron: 'credit_note', bronId: c.id,
        orderId: c.order_id, bedragCents: -Math.abs(Number(c.gross_cents) || 0), datum: datumVan(c, snap),
      });
    }

    /* 4 · Geld dat via Mollie terugging en nog niet geboekt is — alleen de
       bestellingen waar dat zo is (meestal geen). */
    const terug = await alle(env,
      `SELECT t.order_id FROM (
          SELECT order_id, SUM(refunded_cents) AS n FROM payments
           WHERE provider = 'mollie' AND refunded_cents > 0 AND UPPER(COALESCE(currency, 'EUR')) = 'EUR'
           GROUP BY order_id) t
        WHERE t.n > COALESCE((SELECT SUM(-b.bedrag_cents) FROM boekhouding_boekingen b
                               WHERE b.soort = 'terugbetaling' AND b.bron = 'credit_note' AND b.order_id = t.order_id), 0)
          ${orderId ? 'AND t.order_id = ?1' : ''}`, ...(orderId ? [orderId] : []));
    for (const t of terug) {
      const opNota = await alle(env,
        `SELECT c.id, c.number, c.gross_cents FROM credit_notes c
          WHERE c.order_id = ?1 AND c.status = 'issued'${proef('c')} AND substr(COALESCE(c.issued_at, c.created_at), 1, 10) >= ?2
          ORDER BY c.id`, t.order_id, vanaf);
      if (opNota.length) nieuw += await verdeelTerugbetaling(env, t.order_id, opNota, dag);
    }
  }

  if (metAbonnementen) {
    /* 5 · Abonnementsfacturen, hun incasso en wat daarvan terugging. Een termijn
       heeft geen creditnota (credit_notes verwijst naar `invoices`); een
       terugbetaling gaat dus tegen de abonnementsfactuur zelf in. Die staat dan
       in e-Boekhouden weer open, en dat is precies wat er is: geld terug, nog
       geen tegenboeking. */
    const abofacturen = await alle(env,
      `SELECT s.id, s.number, s.snapshot_json, s.issued_at, s.created_at,
              p.external_id, p.amount_cents, p.refunded_cents, p.status AS betaalstatus, p.created_at AS betaald_at,
              UPPER(COALESCE(p.currency, 'EUR')) AS munt,
              ${nogNiet("'factuur:' || s.number")} AS nieuwe_factuur,
              ${nogNiet("'betaling:' || p.external_id")} AS nieuwe_betaling,
              COALESCE((SELECT SUM(-b.bedrag_cents) FROM boekhouding_boekingen b
                         WHERE b.soort = 'terugbetaling' AND b.bron = 'subscription_invoice' AND b.bron_id = s.id), 0) AS al_terug
         FROM subscription_invoices s
         LEFT JOIN subscription_payments p ON p.id = s.subscription_payment_id
        WHERE s.status = 'issued'${proef('s')} AND substr(COALESCE(s.issued_at, s.created_at), 1, 10) >= ?1
          ${subscriptionPaymentId ? 'AND s.subscription_payment_id = ?2' : ''}
          AND (${nogNiet("'factuur:' || s.number")} OR ${nogNiet("'betaling:' || p.external_id")}
               OR COALESCE(p.refunded_cents, 0) > COALESCE((SELECT SUM(-b.bedrag_cents) FROM boekhouding_boekingen b
                         WHERE b.soort = 'terugbetaling' AND b.bron = 'subscription_invoice' AND b.bron_id = s.id), 0))
        ORDER BY s.id`,
      ...(subscriptionPaymentId ? [vanaf, subscriptionPaymentId] : [vanaf]));
    for (const s of abofacturen) {
      const snap = leesSnap(s.snapshot_json);
      if (Number(s.nieuwe_factuur)) {
        nieuw += await zetKlaar(env, {
          sleutel: `factuur:${s.number}`, soort: 'factuur', document: s.number, bron: 'subscription_invoice', bronId: s.id,
          bedragCents: snap.grossCents, datum: datumVan(s, snap),
        });
      }
      if (Number(s.nieuwe_betaling) && s.external_id && s.munt === 'EUR' && Number(s.amount_cents) > 0 && ['paid', 'refunded'].includes(s.betaalstatus)) {
        nieuw += await zetKlaar(env, {
          sleutel: `betaling:${s.external_id}`, soort: 'betaling', document: s.number, bron: 'subscription_invoice', bronId: s.id,
          bedragCents: s.amount_cents, datum: String(s.betaald_at || dag).slice(0, 10), kenmerk: s.external_id,
        });
      }
      const terugTotaal = Math.max(0, Math.round(Number(s.refunded_cents) || 0));
      const erbij = terugTotaal - Math.round(Number(s.al_terug) || 0);
      if (erbij > 0) {
        nieuw += await zetKlaar(env, {
          sleutel: `terug:${s.number}:${terugTotaal}`, soort: 'terugbetaling', document: s.number, bron: 'subscription_invoice',
          bronId: s.id, bedragCents: -erbij, datum: dag, kenmerk: s.external_id,
        });
      }
    }
  }
  return nieuw;
}

/*
 * ── TERUGBETAALD GELD HOORT BIJ EEN CREDITNOTA ──────────────────────────────
 *
 * Mollie houdt per betaling bij hoeveel er terug is (payments.refunded_cents,
 * een lopend totaal). Dat geld gaat in e-Boekhouden tegen de CREDITNOTA in die
 * ervoor is uitgegeven, zodat die negatieve post wordt afgeletterd en de
 * factuur betaald blijft. Wat er bij een bestelling terug is en nog niet
 * geboekt, wordt over de creditnota's verdeeld in de volgorde waarin ze zijn
 * uitgegeven, tot hun bedrag vol is.
 *
 * Een creditnota "als tegoed" (de klant houdt het geld als tegoed) krijgt zo
 * niets: er ging geen geld terug, dus er is niets te verdelen. Hij blijft in
 * e-Boekhouden openstaan als tegoed van de klant — en dat is het ook.
 *
 * Staat er meer terug dan de creditnota's samen (een nota die nog op 'pending'
 * staat), dan wacht het restant tot de volgende run.
 */
async function verdeelTerugbetaling(env, orderId, notas, dag) {
  const geld = await eerste(env,
    `SELECT COALESCE(SUM(refunded_cents), 0) AS n FROM payments
      WHERE order_id = ?1 AND provider = 'mollie' AND UPPER(COALESCE(currency, 'EUR')) = 'EUR'`, orderId);
  const al = await eerste(env,
    `SELECT COALESCE(SUM(-bedrag_cents), 0) AS n FROM boekhouding_boekingen
      WHERE soort = 'terugbetaling' AND bron = 'credit_note' AND order_id = ?1`, orderId);
  let rest = Math.round(Number(geld?.n || 0)) - Math.round(Number(al?.n || 0));
  let nieuw = 0;
  for (const c of notas) {
    if (rest <= 0) break;
    const opNota = await eerste(env,
      `SELECT COALESCE(SUM(-bedrag_cents), 0) AS n FROM boekhouding_boekingen
        WHERE soort = 'terugbetaling' AND bron = 'credit_note' AND bron_id = ?1`, c.id);
    const gedaan = Math.round(Number(opNota?.n || 0));
    const ruimte = Math.abs(Math.round(Number(c.gross_cents) || 0)) - gedaan;
    if (ruimte <= 0) continue;
    const deel = Math.min(ruimte, rest);
    nieuw += await zetKlaar(env, {
      sleutel: `terug:${c.number}:${gedaan + deel}`, soort: 'terugbetaling', document: c.number, bron: 'credit_note',
      bronId: c.id, orderId, bedragCents: -deel, datum: dag,
    });
    rest -= deel;
  }
  return nieuw;
}

/**
 * Een storno: de bank van de klant haalde geld terug (Mollie: amountChargedBack,
 * een lopend totaal per betaling). Gaat als negatieve betaling tegen de factuur
 * in, die daarmee in e-Boekhouden weer openstaat — de klant heeft immers niet
 * betaald. Alleen wat er bij komt, en alleen bij een factuur die mee mag.
 */
export async function meldStorno(env, { molliePaymentId, totaalCents, vandaag = null }) {
  if (!koppelingAan(env)) return 0;
  const totaal = Math.round(Number(totaalCents) || 0);
  if (!molliePaymentId || !(totaal > 0)) return 0;
  const inst = instellingen(env);
  const vanaf = await vanafDatum(env, inst, vandaag);
  const dag = vandaag || vandaagUtc();

  let doc = null;
  const p = await eerste(env, "SELECT order_id FROM payments WHERE provider = 'mollie' AND external_id = ?1", molliePaymentId);
  if (p?.order_id) {
    const f = await eerste(env, "SELECT id, number, testmodus, issued_at, created_at FROM invoices WHERE order_id = ?1 AND status = 'issued'", p.order_id);
    if (f) doc = { ...f, bron: 'invoice', orderId: p.order_id };
  } else {
    const sp = await eerste(env, 'SELECT id FROM subscription_payments WHERE external_id = ?1', molliePaymentId);
    const s = sp ? await eerste(env, "SELECT id, number, testmodus, issued_at, created_at FROM subscription_invoices WHERE subscription_payment_id = ?1 AND status = 'issued'", sp.id) : null;
    if (s) doc = { ...s, bron: 'subscription_invoice', orderId: null };
  }
  if (!doc) return 0;
  if (Number(doc.testmodus) === 1 && !inst.proefreeks) return 0;
  if (String(doc.issued_at || doc.created_at || '').slice(0, 10) < vanaf) return 0;

  const al = await eerste(env,
    "SELECT COALESCE(SUM(-bedrag_cents), 0) AS n FROM boekhouding_boekingen WHERE soort = 'storno' AND kenmerk = ?1", molliePaymentId);
  const erbij = totaal - Math.round(Number(al?.n || 0));
  if (!(erbij > 0)) return 0;
  return await zetKlaar(env, {
    sleutel: `storno:${molliePaymentId}:${totaal}`, soort: 'storno', document: doc.number, bron: doc.bron, bronId: doc.id,
    orderId: doc.orderId, bedragCents: -erbij, datum: dag, kenmerk: molliePaymentId,
  });
}

/* ─────────────────────────────────────────────────────────────────────────────
 * BOEKEN
 * ───────────────────────────────────────────────────────────────────────────── */

const isDocument = (rij) => rij.soort === 'factuur' || rij.soort === 'creditnota';

/** De sleutel van het document waar een geldrij op wacht; null voor een document zelf. */
export function documentSleutel(rij) {
  if (isDocument(rij)) return null;
  return `${rij.bron === 'credit_note' ? 'creditnota' : 'factuur'}:${rij.document}`;
}

/* De vaste omschrijving van een geldrij. VAST, want hij is ook de zoekvraag
   waarmee vóór het boeken gekeken wordt of hij er al staat. */
export function omschrijvingVoor(rij) {
  const totaal = String(rij.sleutel || '').split(':')[2];
  const tm = totaal ? ` (t/m ${bedrag(Number(totaal))})` : '';
  if (rij.soort === 'betaling') return `Mollie-betaling ${rij.kenmerk || ''} op ${rij.document}`.replace(/\s+/g, ' ');
  if (rij.soort === 'storno') return `Storno ${rij.kenmerk || ''} op ${rij.document}${tm}`.replace(/\s+/g, ' ');
  return `Mollie-terugbetaling op ${rij.document}${tm}`;
}

async function laadDocument(env, rij) {
  let r = null;
  if (rij.bron === 'invoice') {
    r = await eerste(env,
      `SELECT i.number, i.snapshot_json, NULL AS factuurnummer, o.email, o.customer_id, o.brand, o.name,
              o.address_line1, o.postal_code, o.city, o.country, o.vat_number
         FROM invoices i JOIN orders o ON o.id = i.order_id WHERE i.id = ?1`, rij.bron_id);
  } else if (rij.bron === 'credit_note') {
    r = await eerste(env,
      `SELECT c.number, c.snapshot_json, i.number AS factuurnummer, o.email, o.customer_id, o.brand, o.name,
              o.address_line1, o.postal_code, o.city, o.country, o.vat_number
         FROM credit_notes c JOIN invoices i ON i.id = c.invoice_id JOIN orders o ON o.id = c.order_id
        WHERE c.id = ?1`, rij.bron_id);
  } else if (rij.bron === 'subscription_invoice') {
    r = await eerste(env,
      `SELECT s.number, s.snapshot_json, NULL AS factuurnummer, k.email, s.customer_id, k.brand, k.name,
              k.address_line1, k.postal_code, k.city, k.country, k.vat_number
         FROM subscription_invoices s LEFT JOIN customers k ON k.id = s.customer_id WHERE s.id = ?1`, rij.bron_id);
  }
  if (!r) throw new EboekhoudenFout(`Document ${rij.document} staat niet (meer) in de database.`);
  const snap = leesSnap(r.snapshot_json);
  const kvkRij = r.customer_id
    ? await eerste(env, 'SELECT reg_number, email FROM customers WHERE id = ?1', r.customer_id).catch(() => null)
    : null;
  const c = snap.customer || {};
  const regels = Array.isArray(c.address) ? c.address : [];
  return {
    nummer: r.number,
    snap,
    factuurnummer: r.factuurnummer || null,
    klant: {
      klantId: r.customer_id || null,
      email: r.email || kvkRij?.email || '',
      naam: c.name || r.name || '',
      bedrijf: c.company || r.brand || '',
      adres: r.address_line1 || regels[0] || '',
      postcode: r.postal_code || '',
      plaats: r.city || (r.postal_code ? '' : regels[1] || ''),
      land: c.country || r.country || '',
      btw: c.vat || r.vat_number || '',
      kvk: kvkRij?.reg_number || '',
    },
  };
}

/* De relatie in e-Boekhouden: eerst op e-mailadres (dan vind je ook een relatie
   die Lucas zelf al had aangemaakt), dan op de vaste code VIS<klantnummer>, en
   anders een nieuwe. Op btw- of KVK-nummer zoeken kan de API niet: GET
   /v1/relation filtert alleen op code, type, email, name, contact en city. */
async function relatieVoor(c, klant) {
  const email = String(klant.email || '').trim().toLowerCase();
  if (email) {
    const r = await c.zoekRelaties({ email });
    if (r[0]?.id) return Number(r[0].id);
  }
  const code = relatieCode(klant.klantId);
  if (code) {
    const r = await c.zoekRelaties({ code });
    if (r[0]?.id) return Number(r[0].id);
  }
  try {
    return (await c.maakRelatie(relatieVelden(klant, code))).id;
  } catch (e) {
    /* Twee runs tegelijk maakten dezelfde code aan: de ander won. */
    if (e?.code === 'REL_049' && code) {
      const r = await c.zoekRelaties({ code });
      if (r[0]?.id) return Number(r[0].id);
    }
    throw e;
  }
}

async function overgenomen(c, bestaand, relatieId) {
  const id = Number(bestaand?.id);
  let rel = relatieId;
  if (!rel && Number.isInteger(id)) {
    const m = await c.mutatie(id).catch(() => null);
    rel = Number(m?.relationId) || null;
  }
  return { mutatieId: Number.isInteger(id) ? id : null, relatieId: rel, notitie: 'Stond al in e-Boekhouden; niet opnieuw geboekt.' };
}

async function boekDocument(env, c, rij) {
  const inst = c.instellingen;
  const doc = await laadDocument(env, rij);
  const creditnota = rij.soort === 'creditnota';

  /* Een creditnota hoort bij dezelfde relatie als haar factuur. */
  let relatieId = Number(rij.eb_relatie_id) || null;
  if (!relatieId && doc.factuurnummer) {
    const f = await eerste(env, 'SELECT eb_relatie_id FROM boekhouding_boekingen WHERE sleutel = ?1', `factuur:${doc.factuurnummer}`);
    relatieId = Number(f?.eb_relatie_id) || null;
  }

  /* Staat hij er al? Op factuurnummer — dat vangt ook een factuur die met de hand
     is ingevoerd, of een eerdere poging die afbrak na de POST. */
  const bestaand = await c.zoekMutaties({ type: MUTATIESOORT.verkoopfactuur, invoiceNumber: doc.nummer });
  if (bestaand.length) return await overgenomen(c, bestaand[0], relatieId);

  if (!relatieId) relatieId = await relatieVoor(c, doc.klant);
  const btwCode = btwCodeVoor(doc.snap.treatment, inst);
  const debiteurenId = await c.grootboek(inst.grootboek.debiteuren);
  const omzetId = await c.grootboek(omzetCodeVoor(doc.snap.treatment, inst));
  const eersteRegel = (doc.snap.lines && doc.snap.lines[0] && doc.snap.lines[0].description) || '';
  const omschrijving = creditnota
    ? `Creditnota ${doc.nummer}${doc.factuurnummer ? ` op ${doc.factuurnummer}` : ''}`
    : `Factuur ${doc.nummer}${eersteRegel ? ` · ${eersteRegel}` : ''}`;
  const body = mutatieVoorDocument({
    snap: doc.snap, nummer: doc.nummer, datum: rij.datum, relatieId, debiteurenId, omzetId, btwCode, creditnota, omschrijving,
  });

  let mutatieId;
  try {
    mutatieId = await c.maakMutatie(body);
  } catch (e) {
    /* MUT_019: het factuurnummer bestaat al. Dan is hij er sinds de zoekvraag
       hierboven bij gekomen — overnemen, niet opnieuw. */
    if (e?.code === 'MUT_019') {
      const nu = await c.zoekMutaties({ type: MUTATIESOORT.verkoopfactuur, invoiceNumber: doc.nummer });
      if (nu.length) return await overgenomen(c, nu[0], relatieId);
    }
    throw e;
  }

  /* Met tegoed verrekend (src/lib/tegoedVerrekening.js): dat deel kwam niet via
     Mollie binnen, dus de betaling hieronder dekt het niet. In e-Boekhouden staat
     het open tot Lucas het aflettert tegen de creditnota waar het tegoed uit kwam. */
  const tegoed = Math.round(Number(doc.snap.tegoedCents) || 0);
  const notitie = !creditnota && tegoed > 0
    ? `${bedrag(tegoed)} is met tegoed betaald. Dat deel staat in e-Boekhouden open tot je het aflettert tegen de creditnota van het tegoed.`
    : null;
  return { mutatieId, relatieId, notitie };
}

async function boekGeld(env, c, rij) {
  const inst = c.instellingen;
  const doc = await eerste(env, 'SELECT eb_relatie_id FROM boekhouding_boekingen WHERE sleutel = ?1', documentSleutel(rij));
  const relatieId = Number(doc?.eb_relatie_id) || null;
  if (!relatieId) {
    throw new EboekhoudenFout(`De relatie van ${rij.document} is niet bekend. Boek eerst ${rij.document} zelf opnieuw.`);
  }
  const omschrijving = omschrijvingVoor(rij);
  const bestaand = await c.zoekMutaties({ type: MUTATIESOORT.betalingOntvangen, description: omschrijving });
  if (bestaand.length) return await overgenomen(c, bestaand[0], relatieId);

  const body = mutatieVoorGeld({
    datum: rij.datum,
    mollieId: await c.grootboek(inst.grootboek.mollie),
    debiteurenId: await c.grootboek(inst.grootboek.debiteuren),
    document: rij.document,
    bedragCents: rij.bedrag_cents,
    relatieId,
    omschrijving,
  });
  return { mutatieId: await c.maakMutatie(body), relatieId, notitie: null };
}

/* Hoeveel documenten (en daarna hoeveel geldboekingen) één run 's nachts of via
   de knop "Alles opnieuw" boekt. Een Worker mag per aanroep maar een beperkt
   aantal verzoeken naar buiten doen (50 op het gratis plan); een document kost
   er zo'n vijf, een betaling twee. Een grote achterstand — EBOEKHOUDEN_VANAF ver
   terug — is daardoor na een paar nachten weg in plaats van in één nacht, en
   valt nooit halverwege om. */
const PER_RUN = 8;

const NOG_BEZIG = `(status = 'bezig' AND poging_at < datetime('now', '-${BEZIG_MINUTEN} minutes'))`;

/**
 * Boek wat er klaarstaat. `ookMislukt` is de nachtelijke herkansing en de knop
 * "Opnieuw"; gewone runs laten een mislukte rij liggen, zodat een storing bij
 * e-Boekhouden niet bij elke betaling opnieuw wordt geprobeerd.
 *
 * Gooit nooit: wat misgaat, staat daarna in de rij.
 */
export async function verwerk(env, { max = 10, ookMislukt = false, id = null, fetchFn = null } = {}) {
  const uit = { geboekt: 0, mislukt: 0, wacht: 0, fouten: [] };
  if (!koppelingAan(env)) return { ...uit, uit: true };
  const statussen = ookMislukt ? "status IN ('wacht', 'mislukt')" : "status = 'wacht'";
  const metId = id ? ' AND id = ?2' : '';
  const binds = id ? [max, id] : [max];

  /* ── TWEE RONDES: EERST DE DOCUMENTEN, DAN HET GELD ─────────────────────────
     Een betaling kan pas als haar factuur erin staat (anders MUT_115). In één
     lijst met een LIMIT zouden betalingen die op een mislukte factuur wachten
     de plekken opvullen, en kwam de betaling van een NIEUWE factuur er nooit
     tussen. Dus eerst de documenten; daarna alleen geld waarvan het document
     al geboekt is — ook als dat in de eerste ronde van deze run gebeurde. */
  const DOC_GEBOEKT = `EXISTS (SELECT 1 FROM boekhouding_boekingen d
      WHERE d.sleutel = (CASE WHEN b.bron = 'credit_note' THEN 'creditnota:' ELSE 'factuur:' END) || b.document
        AND d.status = 'geboekt')`;
  const rondes = [
    `SELECT b.* FROM boekhouding_boekingen b
      WHERE b.soort IN ('factuur', 'creditnota') AND (${statussen} OR ${NOG_BEZIG})${metId}
      ORDER BY b.id LIMIT ?1`,
    `SELECT b.* FROM boekhouding_boekingen b
      WHERE b.soort NOT IN ('factuur', 'creditnota') AND (${statussen} OR ${NOG_BEZIG})${metId} AND ${DOC_GEBOEKT}
      ORDER BY b.id LIMIT ?1`,
  ];

  let c = null;
  try {
    for (const vraag of rondes) {
      const rijen = await alle(env, vraag, ...binds);
      if (!rijen.length) continue;
      if (!c) c = maakClient(env, { fetchFn });
      let stop = false;
      for (const rij of rijen) {
        /* De rij claimen. Twee runs tegelijk (Mollie levert een melding soms twee
           keer, vlak na elkaar) kunnen hem allebei hebben gelezen; maar één van de
           twee krijgt hem in handen. */
        const claim = await env.DB.prepare(
          `UPDATE boekhouding_boekingen SET status = 'bezig', poging_at = datetime('now')
            WHERE id = ?1 AND (${statussen} OR ${NOG_BEZIG})`
        ).bind(rij.id).run();
        if (!(Number(claim?.meta?.changes) > 0)) continue;

        try {
          const r = isDocument(rij) ? await boekDocument(env, c, rij) : await boekGeld(env, c, rij);
          await env.DB.prepare(
            `UPDATE boekhouding_boekingen
                SET status = 'geboekt', eb_mutatie_id = ?2, eb_relatie_id = ?3, notitie = ?4, laatste_fout = NULL,
                    pogingen = pogingen + 1, geboekt_at = datetime('now')
              WHERE id = ?1`
          ).bind(rij.id, r.mutatieId ?? null, r.relatieId ?? null, r.notitie ?? null).run();
          uit.geboekt++;
        } catch (e) {
          const bericht = String(e?.message || e).slice(0, 500);
          await env.DB.prepare(
            `UPDATE boekhouding_boekingen SET status = 'mislukt', laatste_fout = ?2, pogingen = pogingen + 1 WHERE id = ?1`
          ).bind(rij.id, bericht).run().catch(() => {});
          uit.mislukt++;
          uit.fouten.push({ document: rij.document, soort: rij.soort, fout: bericht });
          console.error('[boekhouding]', rij.sleutel, '—', bericht);
          /* Geen verbinding of geen sessie: de volgende rij strandt op hetzelfde.
             Die blijven staan en komen in de volgende run. */
          if (e instanceof EboekhoudenFout && e.stopAlles) { stop = true; break; }
        }
      }
      if (stop) break;
    }
    /* Wat er nog op zijn document wacht, voor wie het wil weten. */
    const w = await eerste(env,
      `SELECT COUNT(*) AS n FROM boekhouding_boekingen b
        WHERE b.soort NOT IN ('factuur', 'creditnota') AND b.status = 'wacht' AND NOT ${DOC_GEBOEKT}`);
    uit.wacht = Number(w?.n || 0);
  } finally {
    if (c) await c.sluit();
  }
  return uit;
}

/* ─────────────────────────────────────────────────────────────────────────────
 * DE DRIE MOMENTEN: NA EEN BETALING, VANUIT /admin, EN 'S NACHTS
 * ───────────────────────────────────────────────────────────────────────────── */

/**
 * Na een melding van Mollie of een handeling in /admin: bijwerken, ACHTERAF.
 *
 * Wordt nooit ge-await door de aanroeper. Met `waitUntil` (de Worker) loopt het
 * na het antwoord verder; zonder (een toets) loopt de belofte gewoon af. Een fout
 * hierin komt in de rij en in het logboek, nooit in het antwoord aan Mollie.
 *
 * `payment` is de betaling zoals de webhook hem van Mollie kreeg; daaruit komen
 * de bestelling of de termijn, en een eventuele storno.
 */
export function boekhoudingAchteraf(context, { payment = null, orderId = null, subscriptionPaymentId = null } = {}) {
  const env = context?.env;
  if (!koppelingAan(env) || !env?.DB) return null;
  const werk = (async () => {
    let oId = orderId;
    let spId = subscriptionPaymentId;
    if (payment?.id) {
      const p = await eerste(env, "SELECT order_id FROM payments WHERE provider = 'mollie' AND external_id = ?1", payment.id);
      if (p?.order_id) oId = p.order_id;
      else {
        const sp = await eerste(env, 'SELECT id FROM subscription_payments WHERE external_id = ?1', payment.id);
        if (sp?.id) spId = sp.id;
      }
      const storno = mollieAmountToCents(payment.amountChargedBack) ?? 0;
      if (storno > 0) await meldStorno(env, { molliePaymentId: payment.id, totaalCents: storno });
    }
    if (!oId && !spId) return null;
    await verzamel(env, { orderId: oId, subscriptionPaymentId: spId });
    return await verwerk(env, { max: 10 });
  })().catch((e) => {
    console.error('[boekhouding] bijwerken mislukt —', e?.message || e);
    return null;
  });
  if (typeof context?.waitUntil === 'function') context.waitUntil(werk);
  return werk;
}

/**
 * 's Nachts (cron/index.js): alles verzamelen, wat klaarstaat boeken, en elke
 * mislukte boeking één keer opnieuw proberen. Geeft één regel voor het
 * nachtrapport, of null als er niets te melden is.
 */
export async function nachtrun(env, { vandaag = null, fetchFn = null, max = PER_RUN } = {}) {
  if (!koppelingAan(env)) return null;
  try {
    await verzamel(env, { vandaag });
  } catch (e) {
    if (/no such table/i.test(String(e?.message || e))) {
      throw new Error('boekhouding: de tabel boekhouding_boekingen ontbreekt — draai migratie 0056.');
    }
    throw e;
  }
  const uit = await verwerk(env, { max, ookMislukt: true, fetchFn });
  const open = await alle(env,
    "SELECT document, soort, laatste_fout FROM boekhouding_boekingen WHERE status = 'mislukt' ORDER BY id LIMIT 6");
  const telling = await eerste(env, "SELECT COUNT(*) AS n FROM boekhouding_boekingen WHERE status = 'mislukt'");
  const nMislukt = Number(telling?.n || 0);
  if (!uit.geboekt && !nMislukt) return null;
  const delen = [];
  if (uit.geboekt) delen.push(`${uit.geboekt} boeking${uit.geboekt === 1 ? '' : 'en'} in e-Boekhouden gezet`);
  if (nMislukt) {
    const voorbeelden = open.slice(0, 3).map((r) => `${r.document} (${r.soort}): ${String(r.laatste_fout || '').slice(0, 120)}`).join('; ');
    delen.push(`${nMislukt} boeking${nMislukt === 1 ? '' : 'en'} MISLUKT, ook na de herkansing van vannacht — ${voorbeelden}. Kijk in /admin/facturen en druk op "Opnieuw" als het is opgelost`);
  }
  return `Boekhouding: ${delen.join('. ')}.`;
}

/* ─────────────────────────────────────────────────────────────────────────────
 * VOOR /admin
 * ───────────────────────────────────────────────────────────────────────────── */

/**
 * De stand per documentnummer, voor de kolom in /admin/facturen:
 *   'geboekt'  — het document en al zijn geld staan erin
 *   'mislukt'  — er is iets misgegaan (met het id van de eerste mislukte rij)
 *   'wacht'    — staat klaar of is bezig
 * Een nummer zonder rijen komt niet in de kaart.
 */
export async function standPerDocument(env, nummers) {
  const kaart = new Map();
  const lijst = [...new Set((nummers || []).filter(Boolean))];
  if (!lijst.length || !env?.DB) return kaart;
  let rijen = [];
  try {
    for (let i = 0; i < lijst.length; i += 80) {
      const deel = lijst.slice(i, i + 80);
      const vraag = deel.map((_, j) => `?${j + 1}`).join(', ');
      rijen = rijen.concat(await alle(env,
        `SELECT id, document, soort, status, laatste_fout, notitie FROM boekhouding_boekingen WHERE document IN (${vraag}) ORDER BY id`, ...deel));
    }
  } catch { return kaart; }
  for (const r of rijen) {
    const s = kaart.get(r.document) || { stand: 'geboekt', foutId: null, fout: null, notitie: null };
    if (r.status === 'mislukt') {
      if (s.stand !== 'mislukt') { s.foutId = r.id; s.fout = r.laatste_fout; }
      s.stand = 'mislukt';
    } else if (r.status !== 'geboekt' && s.stand === 'geboekt') {
      s.stand = 'wacht';
    }
    if (r.notitie && !s.notitie && r.notitie.indexOf('Stond al') !== 0) s.notitie = r.notitie;
    kaart.set(r.document, s);
  }
  return kaart;
}

/** De mislukte boekingen, voor het blok bovenaan /admin/facturen. */
export async function mislukteBoekingen(env, limiet = 50) {
  try {
    return await alle(env,
      `SELECT id, sleutel, soort, document, bedrag_cents, datum, pogingen, laatste_fout, poging_at
         FROM boekhouding_boekingen WHERE status = 'mislukt' ORDER BY id LIMIT ?1`, limiet);
  } catch { return []; }
}

/** De stand van de koppeling, voor /admin/diagnose. Leest alleen de database. */
export async function koppelingStand(env) {
  const inst = instellingen(env);
  const stand = { aan: koppelingAan(env), inst, tabel: true, telling: {}, laatsteFout: null, laatsteGeboekt: null, vanaf: inst.vanaf };
  try {
    for (const r of await alle(env, 'SELECT status, COUNT(*) AS n FROM boekhouding_boekingen GROUP BY status')) {
      stand.telling[r.status] = Number(r.n) || 0;
    }
    stand.laatsteFout = await eerste(env,
      `SELECT document, soort, laatste_fout, poging_at FROM boekhouding_boekingen
        WHERE laatste_fout IS NOT NULL ORDER BY poging_at DESC, id DESC LIMIT 1`);
    stand.laatsteGeboekt = await eerste(env,
      "SELECT document, soort, geboekt_at FROM boekhouding_boekingen WHERE status = 'geboekt' ORDER BY geboekt_at DESC, id DESC LIMIT 1");
  } catch {
    stand.tabel = false;
  }
  if (!stand.vanaf) {
    const r = await eerste(env, "SELECT value FROM app_settings WHERE key = 'boekhouding_vanaf'").catch(() => null);
    stand.vanaf = r?.value || null;
  }
  return stand;
}

/**
 * De knop "Opnieuw": één rij, of alle mislukte, terug op 'wacht' en meteen
 * proberen. Hier MAG gewacht worden — Lucas drukt zelf op de knop en wil de
 * uitkomst zien — maar met een plafond, zodat de pagina niet minutenlang hangt.
 */
export async function opnieuw(env, { id = null, fetchFn = null } = {}) {
  if (!koppelingAan(env)) return { geboekt: 0, mislukt: 0, wacht: 0, fouten: [], uit: true };
  if (id) {
    await env.DB.prepare("UPDATE boekhouding_boekingen SET status = 'wacht' WHERE id = ?1 AND status = 'mislukt'").bind(id).run();
    const rij = await eerste(env, 'SELECT * FROM boekhouding_boekingen WHERE id = ?1', id);
    if (!rij) return { geboekt: 0, mislukt: 0, wacht: 0, fouten: [] };
    /* Eerst de rij zelf, dan wat erop wachtte (de betaling bij een factuur). */
    const eersteRun = await verwerk(env, { max: 1, id, fetchFn });
    const daarna = isDocument(rij) && eersteRun.geboekt ? await verwerk(env, { max: 10, fetchFn }) : { geboekt: 0, mislukt: 0, wacht: 0, fouten: [] };
    return {
      geboekt: eersteRun.geboekt + daarna.geboekt,
      mislukt: eersteRun.mislukt + daarna.mislukt,
      wacht: eersteRun.wacht + daarna.wacht,
      fouten: [...eersteRun.fouten, ...daarna.fouten],
    };
  }
  await env.DB.prepare("UPDATE boekhouding_boekingen SET status = 'wacht' WHERE status = 'mislukt'").run();
  return await verwerk(env, { max: PER_RUN, fetchFn });
}

/**
 * De koppeling testen zonder iets te boeken: inloggen en de grootboekrekeningen
 * opzoeken. Voor de knop in /admin/diagnose.
 */
export async function testKoppeling(env, { fetchFn = null } = {}) {
  const inst = instellingen(env);
  const uit = { aan: koppelingAan(env), sessie: false, fout: null, rekeningen: [] };
  if (!uit.aan) return uit;
  const c = maakClient(env, { fetchFn });
  try {
    const codes = [
      ['Debiteuren', inst.grootboek.debiteuren, 'DEB'],
      ['Omzet', inst.grootboek.omzet, 'VW'],
      ['Omzet EU (verlegd)', inst.grootboek.omzetEu, 'VW'],
      ['Omzet buiten de EU', inst.grootboek.omzetBuitenEu, 'VW'],
      ['Tussenrekening Mollie', inst.grootboek.mollie, 'FIN'],
    ];
    for (const [naam, code, verwacht] of codes) {
      const l = await c.grootboekInfo(code);
      uit.sessie = true;
      uit.rekeningen.push({ naam, code, gevonden: !!l, omschrijving: l?.description || '', categorie: l?.category || '', verwacht });
    }
  } catch (e) {
    uit.fout = String(e?.message || e);
  } finally {
    await c.sluit();
  }
  return uit;
}
