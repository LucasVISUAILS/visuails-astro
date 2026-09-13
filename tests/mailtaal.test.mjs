/* VISUAILS — spreekt elke klantmail de taal van de klant?
 *   npm run test:mailtaal
 * ══════════════════════════════════════════════════════════════════════════════
 * WAAROM DEZE TOETS BESTAAT — 12 SEPTEMBER 2026
 * ══════════════════════════════════════════════════════════════════════════════
 * Lucas: *"Ik wil dat je alles gaat controleren inclusief of e-mail goed werkt
 * en duidelijk is over alles."*
 *
 * De acht klantmails zijn met scripts/mail-render.mjs naast elkaar gelegd en
 * gelezen. Zeven klopten. In de achtste — de checklistmail — stond:
 *
 *     h1(nl ? 'Zo maak je de productfoto's…' : 'How to shoot…'),
 *     p('Hi,'),
 *
 * Elke zin in die mail was tweetalig behalve de aanhef. Een volledig
 * Nederlandse mail die opende met "Hi,".
 *
 * En uitgerekend daar kost het het meest: die mail gaat naar iemand die zich
 * zojuist heeft ingeschreven en VISUAILS verder niet kent. Het is het eerste
 * wat zo iemand van ons leest.
 *
 * ── WAT HIER GEMETEN WORDT ──────────────────────────────────────────────────
 * Elke zin die een klantmail opbouwt, moet een taalkeuze dragen. Niet "staat er
 * Engels in" — dat is niet te zien aan "Hi," — maar: is deze zin voor beide
 * talen geschreven? Een kale string in een klantmail is per definitie voor één
 * taal geschreven en dus fout in de andere, welke taal er ook staat.
 *
 * INTERNE MAILS VALLEN ERBUITEN, met naam. De meldingen aan hello@visuails.com
 * ("Nieuwe checklist-aanmelding", "Een bericht via het contactformulier") gaan
 * naar Lucas zelf en horen gewoon Nederlands te zijn.
 */
import { readFileSync } from 'node:fs';

let pass = 0, fail = 0;
const ok = (naam, voorwaarde, uitleg = '') => {
  if (voorwaarde) { pass++; console.log(` ok   ${naam}`); }
  else { fail++; console.log(` FAIL ${naam}${uitleg ? '\n' + uitleg : ''}`); }
};
const lees = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');

console.log('\nVISUAILS — elke klantmail spreekt de taal van de klant\n');

/* De bouwers van de mails die naar een KLANT gaan, met het bestand erbij.
   scripts/mail-render.mjs tekent precies deze acht; blijft die lijst gelijk,
   dan blijft deze toets meten wat er werkelijk verstuurd wordt. */
const BOUWERS = [
  ['functions/api/order.js', 'customerEmail'],
  ['functions/api/order.js', 'subscriberEmail'],
  ['src/lib/account.js', 'magicLinkEmail'],
  ['src/lib/admin.js', 'deliveryEmail'],
  ['src/lib/admin.js', 'redeliveryEmail'],
  ['src/lib/invoiceMail.js', 'invoiceEmail'],
  ['src/lib/cancelMail.js', 'cancelEmail'],
  ['src/lib/cancelMail.js', 'creditNoteEmail'],
];

/** Het lichaam van één functie, van zijn naam tot de bijbehorende sluitaccolade. */
function lichaam(bron, naam) {
  const m = new RegExp(`export (?:async )?function ${naam}\\s*\\(`).exec(bron);
  if (!m) return null;
  let i = bron.indexOf('{', m.index);
  let diepte = 0;
  for (let j = i; j < bron.length; j++) {
    if (bron[j] === '{') diepte++;
    else if (bron[j] === '}') { diepte--; if (!diepte) return bron.slice(i, j + 1); }
  }
  return null;
}

/* Zinnen die geen taalkeuze nodig hebben en die dat ook niet gaan krijgen. Elk
   met een reden; een uitzondering zonder reden wordt een uitzondering die groeit. */
const MAG_KAAL = [
  /^https?:\/\//,          // een adres
  /^[A-Z-]{2,}$/,          // een code of een constante
  /^[\d\s.,€$-]+$/,        // een bedrag of een datum
  /^VIS-/,                 // een referentienummer
  /^[a-z-]+@[a-z.]+$/i,    // een mailadres
];

for (const [bestand, naam] of BOUWERS) {
  const bron = lees(bestand);
  const ruw = lichaam(bron, naam);
  if (!ruw) { ok(`${naam} is gevonden in ${bestand}`, false, '       de bouwer heet anders of is verplaatst'); continue; }
  /* ── COMMENTAAR ERUIT, EN DAT IS HIER GEEN NETHEID ──────────────────────
     Zonder deze regel meldde de toets zijn eigen uitleg als fout: de noot bij
     de gerepareerde aanhef CITEERT `p('Hi,')` om te laten zien wat er stond, en
     dat leest het patroon hieronder als een kale string. Een toets die afgaat
     op wat er in het commentaar staat, is groen of rood om de verkeerde reden. */
  const body = ruw.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

  /* Elke tekstopbouwer met een KALE string erin. `nl ? '…' : '…'` valt hier
     buiten, want daar staat de string niet direct achter de haak. */
  /* ── DE ONDERGRENS IS TWEE TEKENS, EN DAT IS GEEN OVERDRIJVING ──────────
     Hier stond `{6,90}` plus "moet een spatie bevatten". Die regel liet de fout
     waarvoor deze toets is geschreven er gewoon doorheen: `p('Hi,')` is drie
     tekens zonder spatie. De genoemde controle onderaan ving hem wel, de
     algemene niet — en dan bewaakt de algemene regel alleen de fouten die je
     al kende.

     Twee tekens dus, en de zeef zit in MAG_KAAL hierboven: een adres, een code,
     een bedrag, een referentienummer en een mailadres hebben geen taal. Wat
     overblijft is tekst die iemand leest, en die hoort tweetalig te zijn —
     hoe kort ook. Een aanhef is de kortste zin in een mail en de eerste die
     gelezen wordt. */
  const kaal = [...body.matchAll(/\b(p|h1|h2|h3|btn|linkLine|lead|small)\(\s*'([^']{2,90})'/g)]
    .map((m) => m[2])
    .filter((t) => /[A-Za-zÀ-ÿ]/.test(t))
    .filter((t) => !MAG_KAAL.some((r) => r.test(t)));

  ok(`${naam}: elke zin draagt een taalkeuze`, kaal.length === 0,
    kaal.map((t) => `       · ${t}`).join('\n')
    + (kaal.length ? "\n       → schrijf hem als nl ? '…' : '…'" : ''));
}

/* ── EN DE AANHEF UIT DE MELDING VAN 12 SEPTEMBER, BIJ NAAM ═══════════════
   De regel hierboven vangt hem al. Deze staat er los bij omdat een toets die
   één keer een echte fout heeft gevangen, die fout bij naam hoort te noemen —
   anders is over een jaar niet meer te zien waar de regel vandaan komt. */
{
  const bron = lees('functions/api/order.js');
  ok('de checklistmail groet in het Nederlands met "Hoi,"',
    /p\(nl \? 'Hoi,' : 'Hi,'\)/.test(bron),
    '       hier stond `p(\'Hi,\')` in een verder volledig Nederlandse mail');
}

console.log(`\n${pass}/${pass + fail} geslaagd`);
if (fail) process.exitCode = 1;
