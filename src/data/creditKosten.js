/*
 * ═══════════════════════════════════════════════════════════════════════════════
 * WAT EEN BESTELLING IN CREDITS KOST — 8 oktober 2026 (ronde B, §28.2, 6.06)
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Een abonnee bestelt via het gewone formulier en betaalt met credits. Deze
 * functies zijn de enige plek waar staat wat een bestelling in credits kost en
 * of ze met credits KAN. De server (functions/api/order.js) en stap 5 in de
 * browser (src/scripts/pipeline.js) lezen allebei dit bestand, zodat het
 * scherm nooit een ander getal noemt dan wat er wordt afgeboekt. De server
 * rekent zelf opnieuw, met zijn eigen getallen uit quoteOrder(); wat het
 * formulier stuurt telt niet.
 *
 * Geen database en geen DOM: alleen rekenen, en dus ook in de browser te laden.
 *
 * ── WAT MET CREDITS KAN (6.06) ───────────────────────────────────────────────
 * Alles wat op de creditkaart staat: catalogset, carrousel, extra foto, 4K, en
 * sinds 17 oktober 2026 de complete look (4 credits per look, afvinklijst 38,
 * v38-credits a: een abonnee die een look wil, hoefde tot dan ook zijn producten
 * met geld te betalen). Voorrang (V46 = a) en de toeslag van een eigen look
 * bestaan alleen in euro's; kiest de klant er één, dan gaat de HELE bestelling via
 * Mollie tegen het gewone tarief. Nooit mengen (§28.2.4): een deelbedrag zou een
 * tweede factuur vragen, en de termijnfactuur is al de factuur.
 *
 * Video staat op aanvraag (§2.4) en heeft hier dus geen prijs; een offerte kan
 * later in /admin met credits betaald worden.
 */
import { SERVICE_CREDITS, EXTRA_CREDITS, LOOK_CREDITS } from './pricing.js';

/** De diensten die in het bestelformulier met credits betaald kunnen worden. */
export const CREDIT_DIENSTEN = Object.freeze(['catalog', 'lifestyle']);

/** Waarom een bestelling niet met credits kan, in vaste woorden voor code en tests. */
export const NIET_MET_CREDITS = Object.freeze({
  dienst: 'dienst',       // geen catalog of lifestyle (video, merkmodel, proef, eigen look aanvragen)
  aantal: 'aantal',       // geen bekend aantal producten ("meer dan 30")
  voorrang: 'voorrang',   // V46 = a
  toeslag: 'toeslag',     // een eigen look met toeslag
});

const heel = (n) => Math.max(0, Math.floor(Number(n) || 0));

/**
 * Wat deze bestelling in credits kost, en of ze met credits kan.
 *
 * De invoer is wat quoteOrder() al geklemd heeft (server) of wat het formulier
 * nu toont (browser): `products` producten van `service`, `extras` extra foto's
 * (hoeken × producten), `hoogRes` producten in 4K, `looks` complete looks
 * (alleen lifestyle), `voorrang` en de `toeslagCents` van een eigen look per product.
 *
 * Geeft altijd een object:
 *   { kan, credits, nietMet: [...], regels: [{ soort, aantal, per, credits }] }
 * `credits` is null als er geen prijs in credits bestaat (dienst of aantal);
 * anders het getal, ook als `kan` false is door een optie — dan weet stap 5 wat
 * het ZONDER die optie zou kosten.
 */
export function creditKosten({ service, products, extras = 0, hoogRes = 0, looks = 0, voorrang = false, toeslagCents = 0 } = {}) {
  const nietMet = [];
  const dienst = String(service || '');
  const per = CREDIT_DIENSTEN.includes(dienst) ? SERVICE_CREDITS[dienst] : undefined;
  if (!per) nietMet.push(NIET_MET_CREDITS.dienst);
  const n = Math.floor(Number(products));
  const aantalOk = Number.isFinite(n) && n >= 1;
  if (!aantalOk) nietMet.push(NIET_MET_CREDITS.aantal);
  if (voorrang) nietMet.push(NIET_MET_CREDITS.voorrang);
  if (heel(toeslagCents) > 0) nietMet.push(NIET_MET_CREDITS.toeslag);

  if (!per || !aantalOk) return { kan: false, credits: null, nietMet, regels: [] };

  const regels = [{ soort: dienst, aantal: n, per, credits: n * per }];
  const x = heel(extras);
  if (x) regels.push({ soort: 'photo', aantal: x, per: EXTRA_CREDITS.photo, credits: x * EXTRA_CREDITS.photo });
  /* 4K alleen bij lifestyle, net als quoteOrder(): bij catalog is het geen keuze
     in het formulier. Geklemd op het aantal producten. */
  const h = dienst === 'lifestyle' ? Math.min(heel(hoogRes), n) : 0;
  if (h) regels.push({ soort: 'hires', aantal: h, per: EXTRA_CREDITS.hires, credits: h * EXTRA_CREDITS.hires });
  /* Looks alleen bij lifestyle, net als quoteOrder(), en nooit meer dan er looks
     van twee stukken in het aantal passen. */
  const l = dienst === 'lifestyle' ? Math.min(heel(looks), Math.floor(n / 2)) : 0;
  if (l) regels.push({ soort: 'look', aantal: l, per: LOOK_CREDITS, credits: l * LOOK_CREDITS });
  const credits = regels.reduce((s, r) => s + r.credits, 0);
  return { kan: nietMet.length === 0, credits, nietMet, regels };
}

/**
 * Wat er met dit saldo WEL past: hoeveel producten van deze dienst, met dezelfde
 * extra's per product, en hoeveel er dus af moeten. Voor de zin "Haal 5
 * producten eraf" in stap 5 (6.06).
 *
 * `extrasPerProduct` is het aantal extra hoeken (die gelden per product);
 * `hoogRes` blijft een aantal producten en gaat mee omlaag als het aantal
 * zakt. Geeft { past, eraf } of null als er geen creditprijs is.
 */
export function watPast({ service, products, extrasPerProduct = 0, hoogRes = 0, looks = 0, saldo = 0 } = {}) {
  const dienst = String(service || '');
  const per = CREDIT_DIENSTEN.includes(dienst) ? SERVICE_CREDITS[dienst] : undefined;
  const n = Math.floor(Number(products));
  if (!per || !Number.isFinite(n) || n < 1) return null;
  const s = heel(saldo);
  const hoek = heel(extrasPerProduct);
  const h = dienst === 'lifestyle' ? Math.min(heel(hoogRes), n) : 0;
  /* De looks blijven staan zolang ze passen: wie producten weghaalt, haalt eerst
     de losse weg. Een look van twee stukken past niet meer onder de twee. */
  const l = dienst === 'lifestyle' ? heel(looks) : 0;
  let past = 0;
  for (let m = n; m >= 1; m -= 1) {
    const kost = m * per + m * hoek * EXTRA_CREDITS.photo + Math.min(h, m) * EXTRA_CREDITS.hires
      + Math.min(l, Math.floor(m / 2)) * LOOK_CREDITS;
    if (kost <= s) { past = m; break; }
  }
  return { past, eraf: n - past };
}

/**
 * Welke credits een afboeking van `kosten` opmaakt, oudste eerst.
 *
 * `vervalt` is een lijst groepen { op: 'YYYY-MM-DD', aantal }, oplopend op datum
 * (zoals creditSaldo() hem geeft en /account/me hem doorgeeft). Geeft de groepen
 * die (deels) opgaan, met hoeveel er uit elke groep gaat — stap 5 noemt de
 * eerste: "20 credits die op 30 november vervallen, gaan hiermee op".
 */
export function oudsteEerst(vervalt = [], kosten = 0) {
  let rest = heel(kosten);
  const uit = [];
  for (const g of Array.isArray(vervalt) ? vervalt : []) {
    if (!rest) break;
    const n = Math.min(heel(g && g.aantal), rest);
    if (!n) continue;
    uit.push({ op: String(g.op || ''), aantal: n, vanGroep: heel(g.aantal) });
    rest -= n;
  }
  return uit;
}
