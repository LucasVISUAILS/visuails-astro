/*
 * ═══════════════════════════════════════════════════════════════════════════════
 * DE KLEINE JURIDISCHE PUNTEN VAN 8 OKTOBER 2026 — o12, o13, o22, o24, o26
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Uit de juridische doorlichting (afvinklijst/rapport-juridisch.md), door Lucas op
 * "doen" gezet. Elk punt is klein, en juist daarom makkelijk om bij de volgende
 * opschoning weer kwijt te raken. Per punt de kern, in beide talen:
 *
 *   o12  het cookiebeleid noemt de browseropslag, de anonieme stappenteller en
 *        Turnstile, en zegt niet meer "we delen met niemand iets";
 *   o13  onder de verzendknop van het contactformulier staat een privacylink;
 *   o22  voorwaarden §5: geen herkenbaar bestaand persoon als merkmodel zonder
 *        schriftelijke toestemming, en VISUAILS mag weigeren;
 *   o24  privacy §2 noemt wat er werkelijk wordt bewaard, §10a heeft één grond,
 *        de bestelbevestiging herhaalt de verklaring, schema.js zonder
 *        legalName/taxID;
 *   o26  elke link die een nieuw tabblad opent, zegt dat tegen een schermlezer.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildStaat } from './lib/build.mjs';
import { customerEmail } from '../functions/api/order.js';
import { nieuwTabblad, metNieuwTabblad, nieuwTabbladHtml } from '../src/data/nieuwTabblad.js';

let pass = 0;
let fail = 0;
function ok(name, got, want = true, shown) {
  const good = got === want;
  if (good) pass++; else fail++;
  console.log(`${good ? ' ok  ' : ' FAIL'} ${String(name).padEnd(64)}${good ? '' : `verwacht ${JSON.stringify(want)} kreeg ${JSON.stringify(shown ?? got)}`}`);
}
const ROOT = fileURLToPath(new URL('..', import.meta.url));
const read = (p) => readFileSync(join(ROOT, p), 'utf8');
const zonderUitleg = (bron) => bron
  .replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/<!--[\s\S]*?-->/g, '');

console.log('\nVISUAILS — de juridische punten van 8 oktober 2026\n');

console.log('o12 · het cookiebeleid');
{
  const en = zonderUitleg(read('src/pages/cookie-policy.astro'));
  const nl = zonderUitleg(read('src/pages/nl/cookie-policy.astro'));
  ok('EN noemt vis_acct (sessionStorage)', /<code>vis_acct<\/code>/.test(en), true);
  ok('NL idem', /<code>vis_acct<\/code>/.test(nl), true);
  ok('EN noemt de stappenteller', /step counter in the order form/.test(en), true);
  ok('NL idem', /stappenteller in het bestelformulier/.test(nl), true);
  ok('EN: Cloudflare verwerkt de tellingen voor ons', /Cloudflare processes those counts for us/.test(en), true);
  ok('NL idem', /Cloudflare verwerkt die tellingen voor ons/.test(nl), true);
  ok('EN: "We share nothing with anyone" is weg', /We share nothing with anyone/.test(en), false);
  ok('NL: "We delen met niemand iets" is weg', /We delen met niemand iets/.test(nl), false);
  ok('EN noemt Turnstile als beveiliging', /Cloudflare Turnstile[\s\S]{0,120}security measure/.test(en), true);
  ok('NL idem', /Cloudflare Turnstile[\s\S]{0,120}beveiliging/.test(nl), true);
  /* 1.06 (8 oktober 2026): de proefkaart is weg, en daarmee de enige notitie
     die langer bleef dan een tabblad. Het beleid noemt hem dus niet meer. */
  ok('EN noemt vis_proef_dicht niet meer (de proefkaart is weg)', /vis_proef_dicht/.test(en), false);
  ok('NL idem', /vis_proef_dicht/.test(nl), false);
  ok('en cookies.js heeft geen termijn meer voor de proefkaart', /export const PROEFKAART_DICHT_DAGEN/.test(read('src/data/cookies.js')), false);
  const pen = zonderUitleg(read('src/pages/privacy.astro'));
  const pnl = zonderUitleg(read('src/pages/nl/privacy.astro'));
  ok('privacy EN noemt Turnstile, als gerechtvaardigd belang', /Legitimate interests[\s\S]{0,400}Turnstile/.test(pen), true);
  ok('privacy NL idem', /Gerechtvaardigde belangen[\s\S]{0,400}Turnstile/.test(pnl), true);
}

console.log('\no13 · de privacylink onder het contactformulier');
{
  const src = read('src/components/ContactHal.astro');
  ok('de regel staat direct onder de verzendknop',
    /ct-verstuur[\s\S]{0,200}<\/p>\s*<p class="ct-privacy">\{c\.vPrivacy\[0\]\}<a href=\{lp\('\/privacy'\)\}>/.test(src), true);
  ok('NL: met het woord privacybeleid', /vPrivacy: \['[^']+', 'privacybeleid', '\.'\]/.test(src), true);
  ok('EN: met Privacy Policy', /vPrivacy: \['[^']+', 'Privacy Policy', '\.'\]/.test(src), true);
}

console.log('\no22 · voorwaarden §5: geen herkenbaar bestaand persoon zonder toestemming');
{
  const en = read('src/pages/terms.astro');
  const nl = read('src/pages/nl/terms.astro');
  const sectie = (src, van, tot) => src.slice(src.indexOf(van), src.indexOf(tot));
  const s5en = sectie(en, '<h2>5. Your responsibilities</h2>', '<h2>6. Delivery</h2>');
  const s5nl = sectie(nl, '<h2>5. Jouw verantwoordelijkheden</h2>', '<h2>6. Levering</h2>');
  ok('EN: in §5', /recognisable, existing person/.test(s5en), true);
  ok('EN: schriftelijke toestemming van die persoon', /that person has given written permission/.test(s5en), true);
  ok('EN: en VISUAILS mag weigeren', /We may decline or stop an order that asks for a recognisable, existing person/.test(s5en), true);
  ok('NL: in §5', /herkenbaar, bestaand persoon/.test(s5nl), true);
  ok('NL: schriftelijke toestemming', /die persoon schriftelijk toestemming heeft gegeven/.test(s5nl), true);
  ok('NL: en weigeren mag', /mogen wij weigeren of stopzetten/.test(s5nl), true);
}

console.log('\no24 · privacy §2, voorwaarden §10a, de bestelbevestiging, schema.js');
{
  const pen = zonderUitleg(read('src/pages/privacy.astro'));
  const pnl = zonderUitleg(read('src/pages/nl/privacy.astro'));
  for (const [naam, re] of [
    ['adres en land', [/postal and billing address, country/, /post- en factuuradres, land/]],
    ['website en KVK', [/website, and \(where relevant\) your KVK/, /website en \(waar relevant\) je KVK/]],
    ['de controle op de proef', [/A check on the trial order/, /Een controle op de proefbestelling/]],
    ['met de gehashte bankrekening', [/salted, one-way hashed\) version of the bank account/, /gezouten, eenrichtings-gehashte\) vorm van de bankrekening/]],
    ['feedback en aanbeveling', [/Your feedback, if you give it/, /Je feedback, als je die geeft/]],
    ['de gezouten ip-hash', [/salted, one-way scrambled version of your IP address/, /gezouten, eenrichtings-versleutelde vorm van je ip-adres/]],
    ['gerechtvaardigd belang voor de proefcontrole', [/check that keeps the trial to one per business/, /controle die de proef op één per bedrijf houdt/]],
  ]) {
    ok(`privacy EN: ${naam}`, re[0].test(pen), true);
    ok(`privacy NL: ${naam}`, re[1].test(pnl), true);
  }

  const ten = zonderUitleg(read('src/pages/terms.astro'));
  const tnl = zonderUitleg(read('src/pages/nl/terms.astro'));
  ok('§10a EN: "Made to your specification" is weg', /Made to your specification/.test(ten), false);
  ok('§10a NL: "Maatwerk" als grond is weg', /<strong>Maatwerk\.<\/strong>/.test(tnl), false);
  ok('§10a EN: één wettelijke uitzondering', /One statutory exception applies/.test(ten), true);
  ok('§10a NL: idem', /is daarop één wettelijke uitzondering van toepassing/.test(tnl), true);
  ok('§10a EN: de bevestigingsmail herhaalt de verklaring', /the order confirmation we email you repeats it/.test(ten), true);
  ok('§10a NL: idem', /de bestelbevestiging die we je mailen herhaalt hem/.test(tnl), true);

  /* En de mail doet het ook echt — met de tekst van de VASTGELEGDE versie. */
  const nlMail = customerEmail('nl', 'VIS-TEST-0001', 'catalog', 'Voorbeeld', {
    details: { business_declaration: 'business-v2-2026-09', withdrawal_consent: 'withdrawal-v2-2026-09' },
  });
  ok('mail NL: het kopje staat erin', nlMail.includes('Wat je bij het bestellen bevestigde'), true);
  ok('mail NL: met de herroepingszin', /verlies zodra ze geleverd is/.test(nlMail), true);
  const enMail = customerEmail('en', 'VIS-TEST-0001', 'catalog', '', {
    details: { business_declaration: 'business-v1-2026-08', withdrawal_consent: 'withdrawal-v1-2026-08' },
  });
  ok('mail EN, oude versies: zakelijke zin én losse herroepingszin',
    enMail.includes('What you confirmed when you ordered') && /business or profession/.test(enMail) && /lose my right of withdrawal/.test(enMail), true);
  const zonder = customerEmail('en', 'VIS-TEST-0001', 'catalog', '', { details: { business_declaration: 'MISSING' } });
  ok('mail zonder vastgelegde verklaring: geen blok', zonder.includes('What you confirmed'), false);

  const schema = zonderUitleg(read('src/data/schema.js'));
  ok('schema.js: geen legalName meer', /legalName\s*:/.test(schema), false);
  ok('schema.js: geen taxID meer', /taxID\s*:/.test(schema), false);
  ok('schema.js: KVK als identifier', /identifier: \{ '@type': 'PropertyValue', propertyID: 'KVK', value: '99742993' \}/.test(schema), true);
}

console.log('\no26 · een link die een nieuw tabblad opent, zegt dat');
{
  ok('de zin, NL', nieuwTabblad('nl'), 'opent in een nieuw tabblad');
  ok('de zin, EN', nieuwTabblad('en'), 'opens in a new tab');
  ok('als aria-label', metNieuwTabblad('Instagram', 'nl'), 'Instagram (opent in een nieuw tabblad)');
  ok('als verborgen HTML', nieuwTabbladHtml('en'), '<span class="sr-only"> (opens in a new tab)</span>');

  /* Elke <a target="_blank"> in de Astro-bron: de zin in de link, of een
     aria-label die hem draagt. AiActPage.astro werkt een andere bouwer in
     dezelfde ronde om; /admin is Lucas' eigen werkscherm. */
  const UITZONDERING = new Set([]);
  const missers = [];
  let geteld = 0;
  const loop = function* (map) {
    for (const naam of readdirSync(map)) {
      const pad = join(map, naam);
      if (statSync(pad).isDirectory()) { yield* loop(pad); continue; }
      if (naam.endsWith('.astro')) yield pad;
    }
  };
  for (const pad of loop(join(ROOT, 'src'))) {
    const rel = relative(ROOT, pad).split('\\').join('/');
    if (UITZONDERING.has(rel)) continue;
    const src = zonderUitleg(readFileSync(pad, 'utf8'));
    for (const m of src.matchAll(/<a\b[^>]*?target="_blank"[^>]*>/gs)) {
      geteld++;
      const tag = m[0];
      const einde = src.indexOf('</a>', m.index + tag.length);
      const inhoud = src.slice(m.index + tag.length, einde);
      const goed = /<NieuwTabblad\b/.test(inhoud)
        || /aria-label=\{metNieuwTabblad\(/.test(tag)
        || /aria-label=\{t\('wa_launcher_aria'\)\}/.test(tag);
      if (!goed) missers.push(`${rel}:${src.slice(0, m.index).split('\n').length}`);
    }
  }
  ok('er zijn links met een nieuw tabblad gevonden', geteld > 20, true, geteld);
  ok('elke zegt het tegen een schermlezer', missers.join(', '), '', missers.join(', ') || '(geen)');
  /* De wa-launcher droeg het al in zijn label; dat label moet het blijven zeggen. */
  const ui = read('src/i18n/ui.js');
  ok('het label van de WhatsApp-knop zegt het al (EN)', /wa_launcher_aria: '[^']*opens in a new tab'/.test(ui), true);
  ok('en (NL)', /wa_launcher_aria: '[^']*opent in een nieuw tabblad'/.test(ui), true);

  /* De HTML die als tekst wordt opgebouwd: privélink en feedbackknoppen. */
  const portal = read('src/lib/portal.js');
  const blanks = [...portal.matchAll(/<a [^>]*target="_blank"[^>]*>[^<]*\$\{[^}]*\}([^<]*)<\/a>/g)];
  ok('privélink: elke WhatsApp-link draagt de zin', blanks.length > 0 && blanks.every((m) => /nieuwTabbladHtml\(lang\)/.test(m[0])), true, blanks.length);
  /* 3.05 (8 okt): de knoptekst is nu "Schrijf een review op Trustpilot" enz., de zin blijft erachter. */
  ok('feedbackknoppen ook', /\(p\.name\)\)\}\$\{nieuwTabbladHtml\(lang\)\}<\/button>/.test(read('src/lib/feedback.js')), true);

  /* De klasse bestaat waar hij gebruikt wordt. */
  ok('global.css kent .sr-only (site en Studio)', /^\.sr-only \{/m.test(read('src/styles/global.css')), true);
  ok('portal.css ook (privélink)', /\.sr-only\s*\{/.test(read('public/portal.css')), true);

  /* En op de gebouwde pagina komt hij er ook echt uit. */
  const contact = new URL('../dist/contact/index.html', import.meta.url);
  const staat = buildStaat(contact);
  if (!staat.er || staat.oud) {
    console.log(`      (gebouwde pagina overgeslagen — ${staat.uitleg})`);
  } else {
    const en = readFileSync(contact, 'utf8');
    const nl = readFileSync(new URL('../dist/nl/contact/index.html', import.meta.url), 'utf8');
    ok('/contact: de WhatsApp-knop zegt het', /target="_blank"[^>]*>[^<]*<span class="sr-only"[^>]*> \(opens in a new tab\)<\/span><\/a>/.test(en), true);
    ok('/nl/contact: idem', /target="_blank"[^>]*>[^<]*<span class="sr-only"[^>]*> \(opent in een nieuw tabblad\)<\/span><\/a>/.test(nl), true);
    ok('/contact: de privacylink staat onder het formulier', /class="ct-privacy"[^>]*>[^<]*<a href="\/privacy\/"/.test(en), true);
    ok('/nl/contact: idem', /class="ct-privacy"[^>]*>[^<]*<a href="\/nl\/privacy\/"/.test(nl), true);
    ok('de voettekst-iconen hebben het in hun label',
      /aria-label="Instagram \(opens in a new tab\)"/.test(en) && /aria-label="Instagram \(opent in een nieuw tabblad\)"/.test(nl), true);
  }
}

console.log(`\n${pass}/${pass + fail} geslaagd`);
if (fail) process.exit(1);
