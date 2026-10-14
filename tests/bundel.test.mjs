/*
 * ═══════════════════════════════════════════════════════════════════════════
 * COMPLEET BESTAAT NIET MEER, ALS TEST
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Dit bestand bewaakte tot 14 oktober 2026 de bundelkorting: catalog en
 * lifestyle samen als één "compleet" product, goedkoper dan de twee los.
 *
 * Lucas, afvinklijst 23: *"Klanten kunnen niet compleet bestellen, het is het
 * één of het ander."* De verkoop was al dicht sinds 8 oktober (/api/order
 * weigert 'drop'); nu is ook de rest weg: de trede, de korting, het gewicht in
 * de agenda, de soort in een abonnement en de teksten.
 *
 * Wat hier staat, is de omgekeerde belofte: dat het weg BLIJFT. Een nieuwe
 * regel die 'complete' weer als dienst invoert, valt hier binnen een seconde om
 * in plaats van weken later op een prijspagina.
 *
 * WAT ER WEL BLIJFT, MET OPZET: de lezers van oude rijen. Een bestelling met
 * service 'drop' of een abonnement met { complete: n } in slots_json bestaat
 * nog in de database en moet leesbaar blijven (zie creditsPerSoort() en
 * bundelVoor() in src/lib/slots.js, en agendaKind() in pricing.js).
 */

import * as pricing from '../src/data/pricing.js';
import { PLAN_SERVICE } from '../src/data/plans.js';
import { UITBREIDBARE_DIENSTEN } from '../src/data/angles.js';
import { creditsPerSoort, bundelVoor, dienstenVoorAbo } from '../src/lib/slots.js';

const {
  LADDER, KIND_PUNTEN, SLOT_KINDS, SERVICE_CREDITS, AMOUNT, KIND_BEELDEN,
  isLadderService, agendaKind, puntenVoor,
} = pricing;

let goed = 0;
let totaal = 0;
function check(naam, waarde, verwacht) {
  totaal += 1;
  const ok = JSON.stringify(waarde) === JSON.stringify(verwacht);
  if (ok) goed += 1;
  console.log(`${ok ? ' ok  ' : 'FAIL '} ${naam.padEnd(58)}${ok ? '' : `verwacht ${JSON.stringify(verwacht)} kreeg ${JSON.stringify(waarde)}`}`);
}

console.log('\nde ladder kent twee diensten, en geen bundel');
{
  check('de ladder is catalog en lifestyle', Object.keys(LADDER), ['catalog', 'lifestyle']);
  check('compleet staat niet op de ladder', isLadderService('complete'), false);
  check('en de oude draadnaam drop ook niet', isLadderService('drop'), false);
  for (const naam of ['completeSaving', 'assertBundleSaving', 'BUNDLE_CLAIM', 'COMPLETE_IMAGES']) {
    check(`pricing.js exporteert geen ${naam} meer`, naam in pricing, false);
  }
}

console.log('\nnergens een soort die compleet heet');
{
  check('niet in het gewicht van de agenda', 'complete' in KIND_PUNTEN, false);
  check('niet in de soorten van een abonnement', 'complete' in SLOT_KINDS, false);
  check('niet in de credits', 'complete' in SERVICE_CREDITS, false);
  check('niet in de vaste bedragen', 'complete' in AMOUNT, false);
  check('niet in het aantal beelden per dienst', 'complete' in (KIND_BEELDEN || {}), false);
  check('niet bij de diensten met extra hoeken', UITBREIDBARE_DIENSTEN.includes('complete'), false);
  check('een abonnement levert catalog, geen compleet', PLAN_SERVICE, 'catalog');
  check('en geen plan geeft compleet',
    Object.values(pricing.PLAN_SLOTS).filter((b) => 'complete' in b).length, 0);
}

console.log('\noude rijen blijven leesbaar');
{
  /* Een oude bundelbestelling weegt in de agenda wat hij toen woog: een
     catalogset van vier plus een carrousel van drie. */
  check('een oude drop-rij heeft een eigen gewicht', agendaKind('drop'), 'oude-bundel');
  check('  van zeven punten per product', puntenVoor('drop', 2), 14);
  /* Een oude maand op maat met { complete: n } houdt evenveel agenda vast als
     voorheen, en kost in credits wat de twee delen kosten. */
  check('{ complete: 3 } leest als drie catalogproducten',
    bundelVoor({ slots_json: '{"complete":3}' }), { catalog: 3 });
  check('  en kost per stuk catalog plus lifestyle aan credits',
    creditsPerSoort('complete'), SERVICE_CREDITS.catalog + SERVICE_CREDITS.lifestyle);
  check('  en laat beide diensten kiezen',
    dienstenVoorAbo({ slots_json: '{"complete":3}' }).filter((k) => k === 'catalog' || k === 'lifestyle'),
    ['catalog', 'lifestyle']);
}

console.log(`\n${goed}/${totaal} geslaagd`);
if (goed !== totaal) process.exit(1);
