// VISUAILS — het controlelogboek: is dit gezicht ooit van een echt mens geweest?
//
// ═══════════════════════════════════════════════════════════════════════════
// WAAROM DIT BESTAND BESTAAT
// ═══════════════════════════════════════════════════════════════════════════
//
// Lucas, 19 augustus 2026: *"Hoe kan ik controleren of de modellen die ik voor
// visuails gebruik niet een echt persoon nabootsen zodat ik dit ook aan de klant
// toe kan lichten."* En daarna: of hij het als verkoopargument mag gebruiken.
//
// Mag hij. Maar dan gelden de regels van tests/promises.test.mjs, en die zijn er
// niet voor niets: op 9 augustus bleken vijf beloftes op de site niet te worden
// nagekomen door de code eronder. Een zin op /ai-act die zegt dat elk model
// gecontroleerd is, is precies zo'n belofte. Dus staat hij hier in data, wordt hij
// per model bijgehouden, en mag de pagina hem alleen doen als dit bestand hem
// dekt — zie rosterVolledigGecontroleerd() onderaan.
//
// ── DIT BESTAND IS MET OPZET LEEG ─────────────────────────────────────────
//
// Elke regel hieronder staat op `datum: null`. Dat is geen half werk maar het
// enige eerlijke beginpunt: ik heb die zoekopdrachten niet gedraaid en kan de
// uitslag dus niet weten. Een logboek dat vooraf is ingevuld met "geen treffer"
// is geen logboek maar een verzinsel — en dit verzinsel zou in een verkoopgesprek
// terechtkomen en in een geschil worden aangehaald.
//
// Vul ze in nadat je ze echt gedraaid hebt. Tot die tijd zegt de site niets, en
// dat is precies de bedoeling.
//
// ── WAT EEN CONTROLE INHOUDT ──────────────────────────────────────────────
//
// Twee soorten zoekopdracht, en ze beantwoorden verschillende vragen:
//
//   bestandszoeken   Google Lens, TinEye. Vindt waar dít plaatje eerder stond.
//                    Vangt af dat een generator een bestaande foto vrijwel
//                    letterlijk teruggaf. Beantwoordt NIET of iemand erop lijkt.
//   gezichtszoeken   Yandex, PimEyes, FaceCheck.ID. Maakt een faceprint en zoekt
//                    dezelfde persóón over verschillende foto's heen. Dit is de
//                    controle waar het hier om gaat.
//
// Doe ze allebei, per model, op de bronfoto in volle resolutie — niet op de
// thumbnail. De bronbestanden staan in images/Models/VISUAILS Models/.
//
// ── WAT "GEEN TREFFER" WEL EN NIET BETEKENT ───────────────────────────────
//
// Wel: geen van deze machines legt dit gezicht naast een vindbaar mens.
// Niet: er bestaat niemand die erop lijkt. Deze zoekmachines indexeren een deel
// van het open web; iemand zonder foto's online wordt niet gevonden. Dat verschil
// staat ook in de klanttekst, want het weglaten ervan maakt de rest ongeloofwaardig.
//
// ── MERKMODELLEN VALLEN HIER BUITEN ───────────────────────────────────────
//
// Dit logboek gaat over de vaste roster in models.js. Een merkmodel wordt per
// klant gemaakt en bestaat op het moment van deze controle nog niet, dus die
// hoort bij de levering gecontroleerd te worden en op de order te worden
// vastgelegd — niet hier.

import { ROSTER, modelId } from './models.js';

/**
 * De zoekmachines waar een controle uit bestaat. Als lijst en niet als losse
 * tekst per regel, want de klanttekst noemt het aantal en dat aantal moet uit
 * dezelfde bron komen als de controle zelf.
 *
 * Twee bestandszoekers en drie gezichtszoekers. Wie er een weghaalt of toevoegt,
 * verandert daarmee wat de site belooft — vandaar dat promises.test.mjs erop let.
 */
export const ENGINES = [
  { id: 'lens',      naam: 'Google Lens',   soort: 'bestand' },
  { id: 'tineye',    naam: 'TinEye',        soort: 'bestand' },
  { id: 'yandex',    naam: 'Yandex',        soort: 'gezicht' },
  { id: 'pimeyes',   naam: 'PimEyes',       soort: 'gezicht' },
  { id: 'facecheck', naam: 'FaceCheck.ID',  soort: 'gezicht' },
];

/** De gezichtszoekers apart: dat is de controle die de vraag beantwoordt. */
export const GEZICHTSZOEKERS = ENGINES.filter((e) => e.soort === 'gezicht');

/**
 * Eén regel per model uit ROSTER.
 *
 *   datum     'YYYY-MM-DD' van de dag dat de controle gedraaid is, of null.
 *   engines   de id's uit ENGINES die je echt gebruikt hebt.
 *   uitkomst  'geen-treffer' | 'treffer' | null
 *   door      wie het gedaan heeft. Een logboek zonder naam is een gerucht.
 *   notitie   vrij veld. Bij een treffer: wat je vond en wat je ermee gedaan hebt.
 *
 * Een `treffer` hoort niet stilletjes in dit bestand te blijven staan: dat model
 * gaat uit de roster. De regel blijft daarna bestaan als vastlegging dat je het
 * gezien en opgelost hebt.
 */
export const CHECKS = {
  aaron:  { datum: null, engines: [], uitkomst: null, door: '', notitie: '' },
  ava:    { datum: null, engines: [], uitkomst: null, door: '', notitie: '' },
  elias:  { datum: null, engines: [], uitkomst: null, door: '', notitie: '' },
  ryan:   { datum: null, engines: [], uitkomst: null, door: '', notitie: '' },
  dana:   { datum: null, engines: [], uitkomst: null, door: '', notitie: '' },
  lisa:   { datum: null, engines: [], uitkomst: null, door: '', notitie: '' },
  maegan: { datum: null, engines: [], uitkomst: null, door: '', notitie: '' },
  rae:    { datum: null, engines: [], uitkomst: null, door: '', notitie: '' },
  fabi:   { datum: null, engines: [], uitkomst: null, door: '', notitie: '' },
  seme:   { datum: null, engines: [], uitkomst: null, door: '', notitie: '' },
};

/** De regel van één model, of null als die er niet is. */
export const checkFor = (naam) => CHECKS[modelId(naam)] || null;

/**
 * Is elk model in de roster gecontroleerd met ALLE gezichtszoekers, zonder treffer?
 *
 * Dit is de schakelaar waar de klanttekst op /ai-act aan hangt. Zolang dit false
 * is, zegt die pagina niets over de controle — geen half bericht, geen "de meeste
 * modellen". Een belofte over negen van de tien is een onware belofte over tien.
 */
export function rosterVolledigGecontroleerd() {
  const nodig = GEZICHTSZOEKERS.map((e) => e.id);
  return ROSTER.every(({ name }) => {
    const c = checkFor(name);
    return !!c
      && !!c.datum
      && c.uitkomst === 'geen-treffer'
      && nodig.every((id) => c.engines.includes(id));
  });
}

/**
 * De oudste controledatum in de roster, of null.
 *
 * De oudste en niet de nieuwste, want dat is de datum die de belofte waarmaakt:
 * "elk model is gecontroleerd sinds" is zo oud als de zwakste schakel. De nieuwste
 * tonen zou de zaak mooier voorstellen dan hij is.
 */
export function oudsteControle() {
  const data = ROSTER.map(({ name }) => checkFor(name)?.datum).filter(Boolean);
  return data.length === ROSTER.length ? data.sort()[0] : null;
}
