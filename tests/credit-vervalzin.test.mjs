/* De vervalzin in Studio en /admin (creditWeergave.js).
 *
 * 11 oktober 2026: bij drie of meer vervaldatums vervalt "de rest" niet op één
 * dag; de zin mocht dan niet de laatste datum noemen alsof alles dan vervalt.
 *
 * 12 oktober 2026 (spaarplafond, ab-v1 = c, ab-v2 = a): die zin ("De rest
 * vervalt later, in stappen") is weg. Bij een lopend abonnement noemt de
 * weergave het plafond en wat er bij de volgende termijn boven het plafond zou
 * vervallen; zonder volgende termijn één datum ("geldig tot en met …"). Een
 * datum die echt geldt, wordt altijd zelf genoemd — nooit "de rest". */
import { saldoWeergave } from '../src/lib/creditWeergave.js';
let goed = 0, fout = 0;
const ok = (naam, w, v) => { const g = JSON.stringify(w) === JSON.stringify(v); g ? goed++ : fout++; console.log(`  ${g ? 'ok  ' : 'FOUT'} ${naam}${g ? '' : ` — kreeg ${JSON.stringify(w)}, wilde ${JSON.stringify(v)}`}`); };
const nu = new Date('2027-01-10T10:00:00Z');

/* De Pro-klant uit ABONNEMENT-KWARTAAL.md §2, op 10 januari. */
const lopend = {
  saldo: 356, aboSaldo: 356, plafond: 360,
  nieuw: { op: '2027-02-08', aantal: 120 },
  boven: { op: '2027-02-08', nieuw: 120, aantal: 116 },
  vervalt: [{ op: '2027-04-08', aantal: 356 }], echteDatums: [],
};
const l = saldoWeergave(lopend, 'nl', nu);
ok('lopend: "Je hebt 356 credits (je kunt er 360 sparen)."', l.zin, 'Je hebt 356 credits (je kunt er 360 sparen).');
ok('lopend: de plafondzin', l.nieuw, 'Op 8 februari komen er 120 bij: gebruik er vóór die dag 116, anders vallen ze weg.');
ok('lopend: geen vervaldatum en geen "rest"', [l.eerst, l.rest], ['', '']);
ok('lopend: boven = 116', l.boven, 116);
const niets = saldoWeergave({ ...lopend, saldo: 236, aboSaldo: 236, boven: { op: '2027-02-08', nieuw: 120, aantal: 0 } }, 'nl', nu);
ok('lopend, niets erboven: alleen het saldo en "je kunt er 360 sparen"', [niets.zin, niets.nieuw, niets.eerst], ['Je hebt 236 credits (je kunt er 360 sparen).', 'Op 8 februari komen er 120 bij.', '']);

const gestopt = { saldo: 356, aboSaldo: 356, plafond: null, nieuw: null, boven: null, echteDatums: [{ op: '2027-04-08', aantal: 356 }] };
const g = saldoWeergave(gestopt, 'nl', nu);
ok('pauze of stop: één datum, tot en met de dag ervoor', g.eerst, 'Je credits blijven geldig tot en met 7 april.');
ok('  geen plafond meer naast het saldo', g.spaar, '');

const twee = { saldo: 140, nieuw: null, echteDatums: [{ op: '2027-02-11', aantal: 92 }, { op: '2027-04-20', aantal: 48 }] };
ok('twee datums (een teruggave na de stop): elk zelf genoemd', saldoWeergave(twee, 'nl', nu).eerst, '92 credits blijven geldig tot en met 10 februari, 48 tot en met 19 april.');

/* Oude partijen van vóór het plafond bij een lopend abonnement: wat vóór de
   termijn vervalt, gaat als eerste op, en elke datum wordt genoemd. */
const oud = { ...lopend, saldo: 356, echteDatums: [{ op: '2027-01-20', aantal: 8 }, { op: '2027-02-01', aantal: 24 }] };
const o = saldoWeergave(oud, 'nl', nu);
ok('oud: de eerste datum (geldig t/m de dag ervoor, doorloop 27 B21)', o.eerst, '8 hiervan blijven geldig tot en met 19 januari — die gaan als eerste op.');
ok('oud: de volgende met zijn eigen datum', o.rest, 'Daarna blijven er nog 24 geldig tot en met 31 januari.');

for (const x of [l, niets, g, o, saldoWeergave(twee, 'nl', nu)]) {
  if (/De rest vervalt|in stappen/.test(`${x.eerst} ${x.rest}`)) ok('nergens "De rest vervalt" of "in stappen"', `${x.eerst} ${x.rest}`, '');
}
ok('nergens "De rest vervalt" of "in stappen"', true, true);

const le = saldoWeergave(lopend, 'en', nu);
ok('EN lopend', [le.zin, le.nieuw], ['You have 356 credits (you can save up to 360).', 'On 8 February, 120 more come in: use 116 before that day, or they lapse.']);
ok('EN gestopt', saldoWeergave(gestopt, 'en', nu).eerst, 'Your credits stay valid up to and including 7 April.');
ok('EN twee datums', saldoWeergave(twee, 'en', nu).eerst, '92 credits stay valid up to and including 10 February, 48 up to and including 19 April.');
ok('EN geen "The rest expires"', /The rest expires|in steps/.test(`${le.eerst} ${le.rest} ${saldoWeergave(oud, 'en', nu).rest}`), false);

/* Een oudere aanroep zonder echteDatums (alleen `vervalt`) blijft werken. */
ok('zonder echteDatums: valt terug op vervalt', saldoWeergave({ saldo: 90, vervalt: [{ op: '2027-02-20', aantal: 90 }] }, 'nl', nu).eerst, 'Je credits blijven geldig tot en met 19 februari.');

console.log(`\n${goed}/${goed + fout} geslaagd`);
if (fout) process.exit(1);
