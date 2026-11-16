// VISUAILS — OP MAAT: wat een stijl op maat ongeveer kost. 15 november 2026, lijst 109 en 110.
//
// Lucas (14 november, 21:40): "Er is altijd een minimale vaste prijs en dat is het standaard tarief van de categorie
// (in het geval van catalog: 89 euro per set van 4). Alles wat daar aan word aangepast is een losse edit … De klant
// krijgt dus na het invullen van de custom intake een schatting … (de uiteindelijke kosten worden berekend nadat
// VISUAILS de style heeft uitgedacht)."
//
// HET SYSTEEM (lijst 109). Elke edit kost tijd: één keer om hem uit te denken (eenmalig) en per product om hem te
// maken en na te kijken. Voorstel = minuten × AI-factor (makkelijk 1, gemiddeld 1,5, lastig 2,5) × € 60 per uur,
// afgerond op € 5. Lucas heeft elk bedrag nagelopen en waar nodig zelf gezet; DE BEDRAGEN HIERONDER ZIJN DE ZIJNE
// (lijst 109: afvinklijst/ronde111, lijst 110: afvinklijst/ronde112). Een bedrag veranderen = hier, en dan in
// docs/HOE-VISUAILS-WERKT.md; tests/op-maat-prijs.test.mjs houdt die twee gelijk.
//
// WAT ER ALTIJD BIJ HOORT (lijst 109 en 110, notities):
//   · één revisie per bestelling voor alle beelden, inbegrepen;
//   · bij het uitdenken van de stijl: een gratis voorbeeld in neutrale kleuren, zonder zijn product, en twee gratis
//     rondes om bij te sturen; na de derde versie kijken we wat er nog kan en kunnen er kosten bij komen;
//   · een merkmodel is één keer AMOUNT.brandModel en daarna gratis in al zijn stijlen;
//   · de staffel geldt alleen voor de basis van catalog en lifestyle; hooks en video zijn per bestelling.
//
// DIT IS EEN SCHATTING. De klant ziet een bedrag met een regel per keuze, en eronder dat de definitieve prijs volgt
// nadat wij de stijl hebben uitgedacht (lijst 109, toon = a). Na ons akkoord op het idee betaalt hij de helft vooraf
// (lijst 110, aanbetaling = a).

import { AMOUNT, ladderRate } from './pricing.js';
import { CAMERA_GROEPEN, standTelling } from './opMaat.js';

/** Elke edit: eenmalig (per stijl, of per productsoort bij `perSoort`) en per product. Bedragen excl. btw. */
export const EDITS = {
  catalog: {
    'c-pose': { eenmalig: 70, perProduct: 10, perSoort: true },   // elke stand buiten de standaard, eenmalig; daarna per product in die stand (lijst 113)
    'c-licht': { eenmalig: 45, perProduct: 10 },
    'c-camera': { eenmalig: 20, perProduct: 0 },
    'c-kleur': { eenmalig: 10, perProduct: 0 },
    'c-materiaal': { eenmalig: 45, perProduct: 10 },
    'c-wereld': { eenmalig: 450, perProduct: 40 },
    'c-maat': { eenmalig: 0, perProduct: 25 },
    'c-grading': { eenmalig: 30, perProduct: 5 },
    'c-modelpose': { eenmalig: 115, perProduct: 25 },
    'c-extra': { eenmalig: 0, perProduct: 25 },                    // per extra foto per product
  },
  lifestyle: {
    'l-moment': { eenmalig: 135, perProduct: 0 },
    'l-plek': { eenmalig: 90, perProduct: 10 },
    'l-mensen': { eenmalig: 0, perProduct: 40 },                   // de tweede persoon; hoogstens twee
    'l-pose': { eenmalig: 75, perProduct: 20 },
    'l-licht': { eenmalig: 45, perProduct: 0 },
  },
  hooks: {
    'h-stijl-eigen': { eenmalig: 150 },                            // de hookstijl maken, met zijn eigen idee
    'h-stijl-ons': { eenmalig: 300 },                              // de hookstijl maken, wij bedenken het idee
    'h-tekst': { perHook: 25 },
    'h-product': { perHook: 40 },                                  // een tweede product in dezelfde hook
    'h-persoon': { perHook: 40 },                                  // per persoon, hoogstens twee
    'h-effect': { perHook: 40 },                                   // per effect
    'h-eind': { perHook: 15 },                                     // eindbeeld met logo
  },
  video: {
    'v-idee-eigen': { eenmalig: 45 },
    'v-idee-ons': { eenmalig: 150 },
    'v-shot': { perShot: 50 },                                     // elk shot na het eerste
    'v-kleur': { eenmalig: 10 },
    'v-materiaal': { eenmalig: 45, perShot: 10 },
    'v-wereld': { eenmalig: 90, perShot: 10 },
    'v-persoon': { perShot: 40 },                                  // per persoon per shot, hoogstens twee
    'v-tekst': { eenmalig: 25 },
    'v-eind': { eenmalig: 15 },
  },
};

/** Video: per seconde, minimaal 8 seconden (lijst 110). */
export const VIDEO_PER_SECONDE = 20;
export const VIDEO_MIN_SECONDEN = 8;
/** Camera per shot, per groep (lijst 110, camera = goed). */
export const CAMERA_PRIJS = { inbegrepen: 0, gemiddeld: 15, lastig: 40 };
/** Na ons akkoord op het idee: de helft vooraf (lijst 110, aanbetaling = a). */
export const AANBETALING_DEEL = 0.5;
/** Gratis rondes bij het uitdenken van de stijl, na het eerste voorbeeld (lijst 110, notitie). */
export const GRATIS_STIJLRONDES = 2;

const NAAM = {
  nl: {
    basis: 'Basis', 'c-pose': 'Een eigen stand van het product', 'c-licht': 'Eigen licht', 'c-camera': 'Een eigen camerahoek of kader',
    'c-kleur': 'Een eigen effen achtergrondkleur', 'c-materiaal': 'Een materiaal of textuur als achtergrond', 'c-wereld': 'Een volledige omgeving',
    'c-maat': 'Vaste verhoudingen per foto', 'c-grading': 'Eigen color grading', 'c-modelpose': 'Een vaste pose van het model', 'c-extra': 'Extra foto’s per product',
    merkmodel: 'Een nieuw merkmodel', 'l-moment': 'Je eigen moment uitwerken', 'l-plek': 'Een eigen plek', 'l-mensen': 'Een tweede persoon in beeld',
    'l-pose': 'Een vaste pose-idee', 'l-licht': 'Bijzonder licht', 'l-formaat': 'Een extra formaat',
    'h-stijl-eigen': 'De hookstijl maken, met jouw idee', 'h-stijl-ons': 'De hookstijl maken, wij bedenken het idee', 'h-tekst': 'Tekst op beeld',
    'h-product': 'Een tweede product', 'h-persoon': 'Personen in beeld', 'h-effect': 'Effecten', 'h-eind': 'Eindbeeld met logo',
    seconden: 'Seconden video', 'v-idee-eigen': 'Jouw idee uitschrijven tot een shotlijst', 'v-idee-ons': 'Wij bedenken het idee', 'v-shot': 'Extra shots',
    camera: 'Camerabewegingen', 'v-kleur': 'Een eigen achtergrondkleur', 'v-materiaal': 'Een materiaal of textuur', 'v-wereld': 'Een eigen plek of wereld',
    'v-persoon': 'Personen in beeld', 'v-tekst': 'Tekst in beeld', 'v-eind': 'Eindbeeld met logo',
  },
  en: {
    basis: 'Base', 'c-pose': 'A custom product pose', 'c-licht': 'Custom lighting', 'c-camera': 'A custom camera angle or frame',
    'c-kleur': 'A custom solid background colour', 'c-materiaal': 'A material or texture background', 'c-wereld': 'A complete environment',
    'c-maat': 'Fixed proportions in every photo', 'c-grading': 'Custom colour grading', 'c-modelpose': 'A fixed model pose', 'c-extra': 'Extra photos per product',
    merkmodel: 'A new brand model', 'l-moment': 'Working out your own moment', 'l-plek': 'A custom location', 'l-mensen': 'A second person in the shot',
    'l-pose': 'A fixed pose idea', 'l-licht': 'Special lighting', 'l-formaat': 'An extra format',
    'h-stijl-eigen': 'Creating the hook style, from your idea', 'h-stijl-ons': 'Creating the hook style, we come up with the idea', 'h-tekst': 'Text on screen',
    'h-product': 'A second product', 'h-persoon': 'People in the shot', 'h-effect': 'Effects', 'h-eind': 'End frame with logo',
    seconden: 'Seconds of video', 'v-idee-eigen': 'Turning your idea into a shot list', 'v-idee-ons': 'We come up with the idea', 'v-shot': 'Extra shots',
    camera: 'Camera moves', 'v-kleur': 'A custom background colour', 'v-materiaal': 'A material or texture', 'v-wereld': 'A custom location or world',
    'v-persoon': 'People in the shot', 'v-tekst': 'Text on screen', 'v-eind': 'End frame with logo',
  },
};
export const regelNaam = (id, lang = 'nl') => (NAAM[lang === 'en' ? 'en' : 'nl'][id] || id);

const groepVan = (beweging) => Object.keys(CAMERA_GROEPEN).find((g) => CAMERA_GROEPEN[g].includes(beweging)) || 'inbegrepen';

/** Een regel: wat het is, hoe het is opgebouwd en wat het kost (hele euro's). */
function regel(id, bedrag, uitleg = '') { return { id, bedrag: Math.round(bedrag), uitleg }; }

function editRegel(e, id, n, soorten = 1, keer = 1) {
  const d = e[id];
  const een = (d.eenmalig || 0) * (d.perSoort ? soorten : 1);
  const per = (d.perProduct || 0) * n * keer;
  return regel(id, een + per, [een ? `${d.perSoort && soorten > 1 ? `${soorten} × ` : ''}€${d.eenmalig} eenmalig` : '', per ? `${keer > 1 ? `${keer} × ` : ''}€${d.perProduct} × ${n}` : ''].filter(Boolean).join(' + '));
}

/**
 * De schatting voor een genormaliseerde intake (src/lib/opMaat.js, normaliseerInhoud).
 * Geeft { dienst, regels: [{ id, bedrag, uitleg }], totaal, aanbetaling, producten } terug; bedragen excl. btw.
 * `opties.merkmodelBetaald`: de klant heeft al een merkmodel, dus een "nieuw" kost niets extra (lijst 109).
 */
export function schatting(dienst, inhoud = {}, opties = {}) {
  const i = inhoud || {};
  const regels = [];
  let n = 1;
  /* Een keuze die hij aanzette maar nog niet beschreef, telt al mee (lijst 112: `gekozen`). */
  const gek = (id) => Array.isArray(i.gekozen) && i.gekozen.includes(id);
  if (dienst === 'catalog') {
    const e = EDITS.catalog;
    const soorten = Array.isArray(i.soorten) ? i.soorten : [];
    n = Math.max(1, soorten.reduce((s, x) => s + (x.aantal || 1), 0));
    regels.push(regel('basis', n * ladderRate('catalog', n), `${n} × €${ladderRate('catalog', n)} per set van 4`));
    /* De stand (lijst 113, stand3d b): de standaard en "Wij kiezen" kosten niets. Elke andere stand eenmalig, en per
       product dat erin staat bij elke bestelling. Dezelfde stand voor een hele groep telt één keer. */
    const pose = standTelling(soorten, i.standen, i.standLook);
    if (pose.standen) regels.push(editRegel(e, 'c-pose', pose.producten, pose.standen));
    if (i.licht && i.licht.eigen) regels.push(editRegel(e, 'c-licht', n));
    if (i.camera && i.camera !== 'ooghoogte') regels.push(editRegel(e, 'c-camera', n));
    const omg = i.omgeving && i.omgeving.soort;
    if (omg === 'effen-kleur') regels.push(editRegel(e, 'c-kleur', n));
    if (omg === 'materiaal') regels.push(editRegel(e, 'c-materiaal', n));
    if (omg === 'echte-plek') regels.push(editRegel(e, 'c-wereld', n));
    if (i.vasteMaten) regels.push(editRegel(e, 'c-maat', n));
    if (i.grading && i.grading.eigen) regels.push(editRegel(e, 'c-grading', n));
    if ((i.model && i.model.pose) || gek('c-modelpose')) regels.push(editRegel(e, 'c-modelpose', n));
    if (i.extraFotos) regels.push(editRegel(e, 'c-extra', n, 1, i.extraFotos));
    if (i.model && i.model.merkmodel === 'nieuw' && !opties.merkmodelBetaald) regels.push(regel('merkmodel', AMOUNT.brandModel, `€${AMOUNT.brandModel}, één keer; daarna gratis in al je stijlen`));
  } else if (dienst === 'lifestyle') {
    const e = EDITS.lifestyle;
    n = Math.max(1, i.aantal || 1);
    const tarief = ladderRate('lifestyle', n);
    regels.push(regel('basis', n * tarief, `${n} × €${tarief} per carrousel van 4`));
    regels.push(editRegel(e, 'l-moment', n));
    if ((i.plek && (i.plek.soort || i.plek.tekst)) || gek('l-plek')) regels.push(editRegel(e, 'l-plek', n));
    if (i.mensen && i.mensen.aantal >= 2) regels.push(editRegel(e, 'l-mensen', n));
    if ((i.pose && i.pose.idee) || gek('l-pose')) regels.push(editRegel(e, 'l-pose', n));
    if (i.licht && i.licht !== 'gewoon') regels.push(editRegel(e, 'l-licht', n));
    /* Het formaat hoort niet bij de stijl: de klant kiest het per bestelling, gratis (lijst 112). Een tweede formaat
       voor dezelfde foto telt daar als een extra foto (lijst 109); dat rekent het bestelformulier, niet de schatting. */
    if (i.mensen && i.mensen.merkmodel === 'nieuw' && !opties.merkmodelBetaald) regels.push(regel('merkmodel', AMOUNT.brandModel, `€${AMOUNT.brandModel}, één keer; daarna gratis in al je stijlen`));
  } else if (dienst === 'hooks') {
    const e = EDITS.hooks;
    if (!opties.bestaandeStijl) regels.push(regel(i.idee === 'ons' ? 'h-stijl-ons' : 'h-stijl-eigen', e[i.idee === 'ons' ? 'h-stijl-ons' : 'h-stijl-eigen'].eenmalig, 'één keer, daarna bestel je per hook in deze stijl'));
    regels.push(regel('basis', AMOUNT.hooks, `één hook van hoogstens 8 seconden`));
    if ((i.tekstOpBeeld && Object.keys(i.tekstOpBeeld).length) || gek('h-tekst')) regels.push(regel('h-tekst', e['h-tekst'].perHook, ''));
    if (i.tweedeProduct) regels.push(regel('h-product', e['h-product'].perHook, ''));
    if (i.personen) regels.push(regel('h-persoon', i.personen * e['h-persoon'].perHook, `${i.personen} × €${e['h-persoon'].perHook}`));
    if (i.effecten) regels.push(regel('h-effect', i.effecten * e['h-effect'].perHook, `${i.effecten} × €${e['h-effect'].perHook}`));
    if (i.eindbeeld) regels.push(regel('h-eind', e['h-eind'].perHook, ''));
  } else if (dienst === 'video') {
    const e = EDITS.video;
    const sec = Math.max(VIDEO_MIN_SECONDEN, i.seconden || VIDEO_MIN_SECONDEN);
    const shots = Array.isArray(i.shots) && i.shots.length ? i.shots : [{}];
    regels.push(regel('seconden', sec * VIDEO_PER_SECONDE, `${sec} × €${VIDEO_PER_SECONDE}, minimaal ${VIDEO_MIN_SECONDEN} seconden`));
    if (!opties.bestaandIdee) regels.push(regel(i.idee === 'ons' ? 'v-idee-ons' : 'v-idee-eigen', e[i.idee === 'ons' ? 'v-idee-ons' : 'v-idee-eigen'].eenmalig, ''));
    if (shots.length > 1) regels.push(regel('v-shot', (shots.length - 1) * e['v-shot'].perShot, `${shots.length - 1} × €${e['v-shot'].perShot}`));
    const cam = shots.reduce((s, x) => s + CAMERA_PRIJS[groepVan(x.beweging)], 0);
    if (cam) regels.push(regel('camera', cam, shots.filter((x) => CAMERA_PRIJS[groepVan(x.beweging)]).map((x) => `${x.beweging} €${CAMERA_PRIJS[groepVan(x.beweging)]}`).join(' + ')));
    const omg = i.omgeving && i.omgeving.soort;
    const ns = shots.length;
    if (omg === 'eigen-kleur') regels.push(regel('v-kleur', e['v-kleur'].eenmalig, ''));
    if (omg === 'materiaal') regels.push(regel('v-materiaal', e['v-materiaal'].eenmalig + ns * e['v-materiaal'].perShot, `€${e['v-materiaal'].eenmalig} + ${ns} × €${e['v-materiaal'].perShot}`));
    if (omg === 'wereld') regels.push(regel('v-wereld', e['v-wereld'].eenmalig + ns * e['v-wereld'].perShot, `€${e['v-wereld'].eenmalig} + ${ns} × €${e['v-wereld'].perShot}`));
    if (i.personen) regels.push(regel('v-persoon', i.personen * ns * e['v-persoon'].perShot, `${i.personen} × ${ns} shots × €${e['v-persoon'].perShot}`));
    if (i.tekstInBeeld || gek('v-tekst')) regels.push(regel('v-tekst', e['v-tekst'].eenmalig, ''));
    if (i.eindbeeld) regels.push(regel('v-eind', e['v-eind'].eenmalig, ''));
  } else {
    throw new Error(`onbekende dienst: ${dienst}`);
  }
  const totaal = regels.reduce((s, r) => s + r.bedrag, 0);
  return { dienst, producten: n, regels, totaal, aanbetaling: Math.round(totaal * AANBETALING_DEEL) };
}
