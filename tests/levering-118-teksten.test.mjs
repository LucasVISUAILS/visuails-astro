/* VISUAILS — levering 118 (17 november 2026), bouwer BE: teksten en de juridische pagina's.
 *
 *   node tests/levering-118-teksten.test.mjs     (geen build nodig: rekent met de data en leest de bron)
 *
 * Wat hier bewaakt wordt, per proefronde:
 *   P2-12  eenProductRegel() noemt zelf het lage bedrag (geen "het bedrag hierboven" meer);
 *   P8-06  één zin over voorrang (voorrangBelofte), met Nederlandse tijd en "anders de werkdag daarna", op /pricing,
 *          in de FAQ, in VOORRANG_COPY en in voorrangZin();
 *   P8-08  voorrangTip(): de korte regel bij de levertijd, met bedragen uit VOORRANG; op de lookpagina's;
 *   P6-03  het portfolio is opt-in in voorwaarden §8 en de FAQ (keuze a), privacy §2 noemt dezelfde vraag;
 *   P6-07  de FAQ zegt niet meer "van jou, exclusief" maar wat de licentie geeft;
 *   P6-04  de FAQ noemt de proefcontrole zoals de proefpagina: e-mail, telefoon, KVK, en na betaling de rekening;
 *   P12-03 de FAQ zegt dat Studio per account onthoudt, en raadt een account per klantmerk aan (keuze a);
 *   P6-06  de vaste AI-regel op de lookpagina's en /models;
 *   P6-18  de tevredenheidsregel (AFTERCARE) bij "Kies deze look";
 *   P6-08  /ai-act zegt dat de levering na REVISIE_DAGEN zonder reactie als aanvaard geldt;
 *   P6-12  privacy §8 noemt Google (VS) en ByteDance (Singapore) in plaats van "het genereren gebeurt in Spanje";
 *   P4-07  /contact heeft het onderwerp Hooks, en /hooks linkt ernaar met ?onderwerp=hooks (keuze a);
 *   P2-10  /pricing noemt de dienst Catalog, zoals het menu en de mails;
 *   datums de drie juridische pagina's staan op 17 november 2026.
 */
import { readFileSync } from 'node:fs';
import {
  eenProductRegel, ladderRate, ladderFloor, euro, voorrangZin, voorrangBelofte, voorrangTip, VOORRANG, VOORRANG_COPY,
  AFTERCARE, REVISIE_DAGEN,
} from '../src/data/pricing.js';
import { faqPageGroups } from '../src/data/faq.js';
import { AI_REGEL } from '../src/data/styles.js';
import { LAATST_BIJGEWERKT } from '../src/data/juridischeDatums.js';

let pass = 0, fail = 0;
const ok = (naam, v, extra = '') => { if (v) { pass++; console.log(` ok   ${naam}`); } else { fail++; console.log(` FAIL ${naam} ${extra}`); } };
const lees = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const faq = (l) => JSON.stringify(faqPageGroups(l));

console.log('\nP2-12 · de uitlegregel noemt beide bedragen');
for (const l of ['nl', 'en']) {
  const een = eenProductRegel(l, ['catalog']);
  ok(`${l}: catalog noemt ${euro(ladderRate('catalog', 1), l)} en ${euro(ladderFloor('catalog'), l)}`, een.includes(euro(ladderRate('catalog', 1), l)) && een.includes(euro(ladderFloor('catalog'), l)), een);
  ok(`${l}: geen "het bedrag hierboven" / "the price above" meer`, !/hierboven|above/.test(eenProductRegel(l)), eenProductRegel(l));
  const twee = eenProductRegel(l);
  ok(`${l}: twee diensten noemen alle vier de bedragen`, ['catalog', 'lifestyle'].every((k) => twee.includes(euro(ladderRate(k, 1), l)) && twee.includes(euro(ladderFloor(k), l))), twee);
  /* tests/vanaf-bedragen.test.mjs telt elk "vanaf €…" als een vanaf-bedrag: de regel mag er zelf geen maken */
  ok(`${l}: de regel bevat geen "vanaf €" / "from €"`, !/(vanaf|from)\s+€/i.test(twee), twee);
}

console.log('\nP8-06 · één zin over voorrang');
{
  ok('NL: Nederlandse tijd en anders de werkdag daarna', /\(Nederlandse tijd\)/.test(voorrangBelofte('nl')) && /anders de werkdag daarna/.test(voorrangBelofte('nl')));
  ok('EN: Dutch time and otherwise the working day after', /\(Dutch time\)/.test(voorrangBelofte('en')) && /otherwise the working day after/.test(voorrangBelofte('en')));
  ok('getallen uit VOORRANG', voorrangBelofte('nl').includes(`${VOORRANG.klaarUur}:00`) && voorrangBelofte('nl').includes(`${VOORRANG.bestelVoorUur}:00`));
  ok('voorrangZin() zonder datum = "Voorrang — " + de belofte', voorrangZin('nl') === `Voorrang — ${voorrangBelofte('nl')}` && voorrangZin('en') === `Priority — ${voorrangBelofte('en')}`);
  ok('voorrangZin() met datum blijft de echte dag noemen', /dinsdag 10 november/.test(voorrangZin('nl', '2026-11-08 21:11:00')));
  ok('VOORRANG_COPY.line draagt de belofte (NL en EN)', VOORRANG_COPY.nl.line.includes(voorrangBelofte('nl')) && VOORRANG_COPY.en.line.includes(voorrangBelofte('en')));
  for (const l of ['nl', 'en']) ok(`FAQ ${l}: de belofte staat erin`, faq(l).includes(voorrangBelofte(l)));
  const pr = lees('src/components/PricingHal.astro');
  ok('/pricing leest voorrangBelofte() in beide talen', /voorrangBelofte\('nl', true\)/.test(pr) && /voorrangBelofte\('en', true\)/.test(pr));
  ok('/pricing: geen eigen getypte belofte meer', !/Betaald op een werkdag vóór/.test(pr) && !/Paid on a working day before/.test(pr));
}

console.log('\nP8-08 · voorrang bij de levertijd');
for (const l of ['nl', 'en']) {
  const t = voorrangTip(l);
  ok(`${l}: bedragen en grens uit VOORRANG`, t.includes(`${Math.round(VOORRANG.deel * 100)}%`) && t.includes(euro(VOORRANG.bodem, l)) && t.includes(String(VOORRANG.maxProducten)), t);
}
{
  const lk = lees('src/components/LookDetailHal.astro');
  ok('lookpagina: voorrangTip, AFTERCARE en AI_REGEL in de slotregel', /voorrangTip\(lang\)/.test(lk) && /AFTERCARE\[lang\]/.test(lk) && /AI_REGEL\.look\[lang\]/.test(lk) && /\{slotRegel && <p class="h-lk-queue">\{slotRegel\}<\/p>\}/.test(lk));
  ok('lookpagina: geen voorrang bij een look op aanvraag', /style\.slug === 'custom' \? '' : voorrangTip\(lang\)/.test(lk));
}

console.log('\nP6-03 · het portfolio is opt-in');
{
  const en = lees('src/pages/terms.astro'), nl = lees('src/pages/nl/terms.astro');
  ok('voorwaarden EN: alleen als je ja zegt', /Our portfolio — only if you say yes/.test(en) && /we show nothing/.test(en));
  ok('voorwaarden NL: alleen als jij ja zegt', /Ons portfolio — alleen als jij ja zegt/.test(nl) && /dan laten wij niets zien/.test(nl));
  ok('voorwaarden: de oude opt-out is weg', !/unless you tell us in writing not to/.test(en) && !/tenzij je ons schriftelijk vraagt dat niet te doen/.test(nl));
  ok('voorwaarden: intrekken binnen TOESTEMMING_WEG_DAGEN', /termijnInWoorden\(TOESTEMMING_WEG_DAGEN, 'en'\)/.test(en) && /termijnInWoorden\(TOESTEMMING_WEG_DAGEN, 'nl'\)/.test(nl));
  ok('privacy §2 NL vraagt na de levering (opt-in, onveranderd)', /na de levering vragen we of we je tekst en je beelden/.test(lees('src/pages/nl/privacy.astro')));
  ok('FAQ NL: alleen als jij daar na de levering ja op zegt', /alleen zien als jij daar na de levering ja op zegt/.test(faq('nl')));
  ok('FAQ EN: only if you say yes after delivery', /only show your images if you say yes to that after delivery/.test(faq('en')));
  ok('FAQ: geen "tenzij je daar schriftelijk bezwaar" meer', !/schriftelijk bezwaar/.test(faq('nl')) && !/unless you object in writing/.test(faq('en')));
}

console.log('\nP6-07 · wat je krijgt is een licentie');
ok('FAQ NL: niet meer "van jou, exclusief"', !/zijn van jou, exclusief/.test(faq('nl')) && /Je mag de visuals overal gebruiken, voor altijd, en niemand anders krijgt ze/.test(faq('nl')));
ok('FAQ EN: not "yours, exclusively"', !/are yours, exclusively/.test(faq('en')) && /You may use the visuals anywhere, for ever, and nobody else gets them/.test(faq('en')));
ok('FAQ: zegt dat het een licentie is en geen eigendom', /exclusieve licentie en geen eigendom/.test(faq('nl')) && /exclusive licence, not ownership/.test(faq('en')));

console.log('\nP6-04 en P12-03 · de bureauvraag');
{
  const nl = faq('nl'), en = faq('en');
  ok('NL: proef op e-mail, telefoon, KVK en na betaling de rekening', /e-mailadres, telefoonnummer en KVK-nummer, en na de betaling ook op de rekening/.test(nl));
  ok('EN: idem', /email address, phone number and company registration number, and after payment also the account/.test(en));
  ok('NL: niet meer "niet via het e-mailadres"', !/niet via het e-mailadres/.test(nl));
  ok('NL: Studio onthoudt per account, niet per merk', /hoort bij je account en niet bij een merk/.test(nl) && /per klantmerk een eigen account/.test(nl));
  ok('EN: idem', /belongs to your account, not to a brand/.test(en) && /one account per client brand/.test(en));
}

console.log('\nP6-06 en P6-18 · AI en tevredenheid op de look- en modellenpagina');
{
  ok('AI-regel NL', AI_REGEL.look.nl === 'Gemaakt met AI uit jouw productfoto’s. De gezichten bestaan niet.');
  ok('AI-regel EN', /^Made with AI/.test(AI_REGEL.look.en));
  const md = lees('src/components/ModelsHal.astro');
  ok('/models: de AI-regel vooraan de openingszin, NL en EN', /lead: `\$\{AI_REGEL\.modellen\.en\} /.test(md) && /lead: `\$\{AI_REGEL\.modellen\.nl\} /.test(md));
  ok('AFTERCARE noemt REVISIE_DAGEN', AFTERCARE.nl.includes(`${REVISIE_DAGEN} dagen`));
}

console.log('\nP6-08 · /ai-act: goedkeuren of na REVISIE_DAGEN aanvaard');
{
  const a = lees('src/components/AiActHal.astro');
  ok('import REVISIE_DAGEN', /import \{ REVISIE_DAGEN \} from '\.\.\/data\/pricing\.js'/.test(a));
  ok('NL: geldt de levering als aanvaard (dossier en vierde blok)', (a.match(/dagen zonder reactie geldt de levering als aanvaard|geldt de levering als aanvaard/g) || []).length >= 2);
  ok('EN: counts as accepted (record and fourth block)', (a.match(/counts as accepted/g) || []).length >= 2);
}

console.log('\nP6-12 · privacy §8 noemt wie het beeld verwerkt');
{
  const en = lees('src/pages/privacy.astro'), nl = lees('src/pages/nl/privacy.astro');
  ok('NL: niet meer "Het genereren gebeurt bij een partij in Spanje"', !/Het genereren gebeurt bij een partij in Spanje/.test(nl));
  ok('EN: no more "Generation happens with a party in Spain"', !/Generation happens with a party in Spain/.test(en));
  ok('NL: Google (VS) en ByteDance (Singapore)', /Google in de Verenigde Staten en ByteDance in Singapore/.test(nl));
  ok('EN: Google (US) and ByteDance (Singapore)', /Google in the United States and ByteDance in Singapore/.test(en));
}

console.log('\nP4-07 · hooks via het contactformulier');
{
  const c = lees('src/components/ContactHal.astro'), h = lees('src/components/HooksHal.astro');
  ok('contact: onderwerp hooks in NL en EN', (c.match(/\['hooks', 'Hooks'\]/g) || []).length === 2);
  ok('contact: ?onderwerp= kiest het onderwerp', /get\('onderwerp'\)/.test(c) && /kies\.value = onderwerp/.test(c));
  ok('hooks: alle knoppen naar ?onderwerp=hooks, geen kale /contact meer', /\?onderwerp=hooks/.test(h) && !/href=\{lp\('\/contact'\)\}/.test(h));
}

console.log('\nP2-10 · /pricing noemt de dienst Catalog');
{
  const pr = lees('src/components/PricingHal.astro');
  ok('geen "Catalogset" of "Catalog set" als label', !/\['Catalogset'|\['Catalog set'|Catalogset · per product|Catalog set · per product/.test(pr));
}

console.log('\nde juridische datums');
/* levering 119 (18 november 2026): de drie pagina's veranderden weer (P6-23, P7-07); niet ouder dan 17 november is genoeg. */
for (const d of ['terms', 'privacy', 'ai-act']) ok(`${d}: op of na 2026-11-17`, LAATST_BIJGEWERKT[d] >= '2026-11-17', LAATST_BIJGEWERKT[d]);

console.log(`\n${pass}/${pass + fail} geslaagd`);
if (fail) process.exit(1);
