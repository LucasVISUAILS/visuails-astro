/* WAT HOUDT EEN GEANNULEERDE KLANT? — 7 september 2026
   ═══════════════════════════════════════════════════════════════════════════
   Gemeten met kladblok/keten-doorloop.mjs: een bestelling geannuleerd, volledig
   terugbetaald, creditnota verstuurd — en daarna gaf het portaal 200, de zip 200
   en het beeld 200. €323 terug en twaalf afgewerkte beelden mee.

   De regel staat in src/lib/delivery.js en luidt: een geannuleerde bestelling
   verliest haar bestanden, TENZIJ de studio het geld heeft gehouden.

   Deze test bewaakt hem in BEIDE richtingen. Alleen de dichte kant testen is de
   halve test: dan kan iemand hem later verscherpen tot "geannuleerd = altijd
   weg" en verliest een klant die netjes betaald heeft en niets terugkreeg zijn
   beelden, zonder dat er iets rood wordt. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { leveringIngetrokken } from '../src/lib/delivery.js';

test('het geld terug of verrekend → de bestanden gaan weg', () => {
  const weg = [
    ['volledige restitutie', { status: 'cancelled', cancel_payment: 'refund' }],
    ['tegoed in plaats van geld', { status: 'cancelled', cancel_payment: 'credit' }],
    ['nooit betaald', { status: 'cancelled', cancel_payment: null }],
    ['nooit betaald, lege string', { status: 'cancelled', cancel_payment: '' }],
    ['uit een abonnement — de slots gaan terug', { status: 'cancelled', cancel_payment: 'plan' }],
  ];
  for (const [waarom, order] of weg) {
    assert.equal(leveringIngetrokken(order), true, waarom);
  }
});

test('betaald en niets terug → hij houdt wat er ligt', () => {
  /* Dit is de enige uitkomst waarbij "geannuleerd" betekent "we stoppen ermee"
     en niet "het is ongedaan gemaakt". De klant heeft betaald, krijgt niets
     terug, en houdt dus de beelden die al klaar waren. */
  assert.equal(leveringIngetrokken({ status: 'cancelled', cancel_payment: 'none' }), false);
});

test('een bestelling die niet geannuleerd is, blijft gewoon van de klant', () => {
  for (const status of ['received', 'in_production', 'human_check', 'delivered']) {
    assert.equal(leveringIngetrokken({ status }), false, status);
    /* cancel_payment kan blijven staan van een eerdere, teruggedraaide poging.
       De status beslist; dat veld alleen mag nooit een levering intrekken. */
    assert.equal(leveringIngetrokken({ status, cancel_payment: 'refund' }), false, `${status} met een oude cancel_payment`);
  }
});

test('een rij zonder velden trekt niets in', () => {
  /* Een query die de twee kolommen vergeet, mag geen bestanden weggooien. Faalt
     hij open, dan is dat zichtbaar (de klant ziet zijn beelden); faalt hij
     dicht, dan is het een stille 410 op werk waar wél voor betaald is. */
  for (const leeg of [undefined, null, {}, { status: undefined }]) {
    assert.equal(leveringIngetrokken(leeg), false, JSON.stringify(leeg));
  }
});

test('alle vijf de uitkomsten van het annuleerformulier zijn gedekt', () => {
  /* handleOrderCancel() kent drie keuzes voor betaald werk (CANCEL_PAYMENT),
     plus onbetaald en uit-een-abonnement. Als daar ooit een zesde bij komt,
     hoort iemand hier langs te komen om te zeggen wat die betekent. */
  const bekend = ['refund', 'credit', 'none', '', 'plan'];
  const uitkomsten = bekend.map((p) => [p || '(onbetaald)', leveringIngetrokken({ status: 'cancelled', cancel_payment: p })]);
  assert.deepEqual(uitkomsten, [
    ['refund', true],
    ['credit', true],
    ['none', false],
    ['(onbetaald)', true],
    ['plan', true],
  ]);
});
