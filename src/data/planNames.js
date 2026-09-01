/**
 * DE NAMEN VAN DE ABONNEMENTEN — en niets anders.
 *
 * Een eigen bestandje van vijftien regels, en dat is met opzet. Twee modules
 * hebben deze namen nodig en ze kunnen elkaar niet importeren:
 *
 *   · src/data/pricing.js zet ze op de prijspagina;
 *   · src/data/plans.js is het abonnementscontract en importeert al uit
 *     pricing.js, dus pricing.js kan niet uit plans.js lezen zonder een
 *     kringetje te maken.
 *
 * Zonder deze plek zou "Merk" op twee plaatsen staan en over een half jaar op de
 * ene plek "Brand" heten. Vandaar een derde bestand dat zelf niets importeert en
 * dus door allebei gelezen kan worden.
 *
 * `Brand` heet in het Nederlands `Merk` en Starter en Studio niet: die twee zijn
 * in het Nederlands even gewoon en een vertaling zou ze vreemder maken.
 */
export const PLAN_NAMES = {
  starter: { en: 'Starter', nl: 'Starter' },
  studio: { en: 'Studio', nl: 'Studio' },
  brand: { en: 'Brand', nl: 'Merk' },
  /* De maand op maat. Hij staat hier en niet in PLAN_IDS — zie CUSTOM_MONTH_ID
     in pricing.js — maar hij heeft wel een naam nodig: hij komt terug op een
     factuur, in een mail en in het beheerpaneel, en "maat" is daar geen woord. */
  maat: { en: 'Custom month', nl: 'Maand op maat' },
};

/** De naam van één plan in één taal. Een onbekend plan geeft zijn eigen id terug en niet 'undefined'. */
export function planName(planId, lang = 'en') {
  const n = PLAN_NAMES[planId];
  if (!n) return String(planId || '');
  return lang === 'nl' ? n.nl : n.en;
}
