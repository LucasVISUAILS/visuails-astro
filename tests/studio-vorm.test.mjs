/*
 * ═══════════════════════════════════════════════════════════════════════════════
 * STUDIO, ZOALS DE KLANT HET ZIET — de zeven schermen door de echte Worker
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * 6 september 2026. Tot vandaag lazen account-brand-kit, account-invoices,
 * revisieronde en maandset de HTML van accountGet(): de bouwers in account.js
 * die het dashboard tekenden. Sinds Studio fase 2 tekent geen klant die HTML
 * meer — de schermen zijn Astro-pagina's op StudioLayout — en toetsen op die
 * bouwers was toetsen op een scherm dat niemand krijgt. Die bouwers zijn weg.
 *
 * Wat hier staat is het omgekeerde: de gebouwde Worker (dist/server) draait in
 * dit proces op een verse, gevulde D1 (tests/lib/studio-worker.mjs) en elke
 * pagina wordt opgehaald zoals een browser dat doet, met de sessiecookie. Dan
 * wordt bekeken wat een klant ziet:
 *
 *   1 · de VORM die elke pagina belooft — één <h1>, geen inline style (de CSP
 *       zegt style-src 'self' en blokkeert het), geen <script> (er is geen
 *       script-src), de koppen van de CSP zelf;
 *   2 · de INHOUD per scherm — de bestellingen op hun kaart, het filter, de
 *       slots als kaders, de look als beeldregel, de edities uit AMOUNT, de
 *       lege stand voor wie geen abonnement heeft;
 *   3 · de DEUREN — ?lang=, ?nav=, ?thema= zetten een cookie en sturen terug,
 *       zonder cookie is het de inlog, en een pad dat geen scherm is geeft 404.
 *
 * De nepdata (VOLT met werk, NOORD zonder) is dezelfde als in
 * kladblok/studio-proef.mjs, dus wat hier groen is, is wat op de afdrukken
 * staat. Vereist een verse build; `npm test` begint daarmee.
 */
import { startStudio, VOLT, NOORD } from './lib/studio-worker.mjs';
import { AMOUNT, euro } from '../src/data/pricing.js';
import { ORDERS } from './lib/studio-seed.mjs';

let goed = 0; let totaal = 0;
function ok(naam, kreeg, verwacht = true) {
  totaal += 1;
  const isGoed = JSON.stringify(kreeg) === JSON.stringify(verwacht);
  if (isGoed) goed += 1;
  console.log(` ${isGoed ? 'ok  ' : 'FAIL'} ${String(naam).padEnd(62)}${isGoed ? '' : ` verwacht ${JSON.stringify(verwacht)} kreeg ${JSON.stringify(kreeg)}`}`);
}
const tel = (html, re) => (html.match(re) || []).length;
/* Alleen het middenvak: de zijbalk noemt elke sectie en de bovenbalk elke
   toestand, en een toets op de hele pagina zou daarop afgaan. */
const main = (html) => (html.split('<main')[1] || html).split('</main>')[0];
/* De kop als tekst: in de hal staat het eerste deel in een span (twee tonen, 14 okt). */
const kop = (html) => ((html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/) || [])[1] || '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();

const studio = await startStudio();
const pagina = async (pad, opts) => { const r = await studio.fetch(pad, opts); return { status: r.status, html: await r.text(), headers: r.headers }; };

try {
  /* ── 1 · DE VORM ─────────────────────────────────────────────────────────── */
  console.log('\nde vorm van elke pagina');
  /* '/account/plan?tab=bestellen' staat hier niet meer: die tab is weg sinds
     ronde 10 (8 oktober 2026) en stuurt door — zie "het abonnement" hieronder. */
  /* Sinds 2.07 (8 oktober 2026) is /account/plan één pagina zonder tabbladen;
     de oude ?tab=-links sturen door (zie "het abonnement" hieronder). */
  const SCHERMEN = ['/account', '/account/orders', '/account/brand-kit', '/account/details', '/account/invoices', '/account/plan'];
  const html = {};
  for (const pad of SCHERMEN) {
    const p = await pagina(pad);
    html[pad] = p.html;
    ok(`${pad} geeft 200`, p.status, 200);
    ok(`${pad} heeft precies één <h1>`, tel(p.html, /<h1[\s>]/g), 1);
    ok(`${pad} heeft geen inline style-attribuut`, tel(p.html, /\sstyle="/g), 0);
    ok(`${pad} heeft geen script`, tel(p.html, /<script/g), 0);
    ok(`${pad} draagt de CSP zonder script-src`, /default-src 'none'/.test(p.headers.get('content-security-policy') || '') && !/script-src/.test(p.headers.get('content-security-policy') || ''));
    ok(`${pad} wordt niet gecachet en niet geïndexeerd`, [p.headers.get('cache-control'), p.headers.get('x-robots-tag')], ['no-store', 'noindex, nofollow']);
  }
  ok('de zijbalk noemt de zes secties', ['/account"', '/account/orders"', '/account/brand-kit"', '/account/details"', '/account/invoices"', '/account/plan"'].every((h) => html['/account'].includes(`href="${h}`)));
  ok('en de stijl van Studio komt uit de bundel van de site', /<link rel="stylesheet" href="\/_astro\/StudioLayout\.[^"]+\.css">/.test(html['/account']));

  /* ── 2 · DE INHOUD ───────────────────────────────────────────────────────── */
  console.log('\nhet overzicht');
  {
    const h = main(html['/account']);
    /* Ronde 8: de voornaam, niet het merk — "Welkom, VOLT" sprak het bedrijf aan. */
    ok('begint met de voornaam', kop(html['/account']) === 'Welkom terug, Mara');
    /* En de tellers beginnen bij wat de klant moet doen: te betalen, te beoordelen. */
    ok('telt wat er loopt', /1<\/span>/.test(h) && /status=awaiting_payment/.test(h) && /status=bij_ons/.test(h) && /status=delivered/.test(h));  // ronde 9, F10: de tegel 'Bij ons in de maak' telt betaald-en-nog-niet-geleverd en linkt naar dat filter
    ok('zet de lopende bestelling voorop, met haar tijdlijn', /VIS-2609-4471/.test(h) && /st-flow|is-now/.test(h));
    ok('en de laatst geleverde beelden als strook, via /account/files', tel(h, /\/account\/files\/\d+\/f/g) >= 4);
  }

  console.log('\nde bestellingen');
  {
    const h = main(html['/account/orders']);
    ok('elke bestelling staat op de lijst', ['VIS-2609-4471', 'VIS-2609-5102', 'VIS-2608-9920', 'VIS-2608-3312', 'VIS-2607-1180'].every((r) => h.includes(r)));
    /* Een onbetaalde bestelling heet overal "wacht op betaling" (ronde 8). */
    ok('er is een filterchip per status die deze klant heeft', /status=in_production/.test(h) && /status=delivered/.test(h) && /status=awaiting_payment/.test(h));
    ok('en geen chip voor een status die hij nooit had', !/status=cancelled/.test(h));
    ok('de onbetaalde bestelling biedt betalen aan', new RegExp(`/account/orders/${ORDERS.lifestyle}/pay`).test(h));
    ok('de geleverde bestelling groepeert per product', tel(h, /st-product\b|class="st-prod/g) >= 3);
    ok('met een zip voor de hele bestelling', new RegExp(`/account/orders/${ORDERS.delivered}/zip`).test(h));
    ok('en een weg naar een specialist', /wa\.me\//.test(h));
    ok('de mededeling van de studio bereikt de klant', /mouw hangt daar scheef/.test(h));

    const een = main((await pagina('/account/orders?status=delivered')).html);
    ok('gefilterd staan alleen de geleverde er', een.includes('VIS-2608-9920') && een.includes('VIS-2607-1180') && !een.includes('VIS-2609-4471'));
    ok('en de kop telt de gefilterde set', /\(2\)/.test(een));
    const onzin = main((await pagina('/account/orders?status=not_a_status')).html);
    ok('een onbekende status valt terug op geen filter', onzin.includes('VIS-2609-4471'));
    const leeg = main((await pagina('/account/orders?status=cancelled')).html);
    ok('een echte maar lege status legt zichzelf uit en biedt de weg terug', /Geen bestellingen|No orders/.test(leeg) && /href="\/account\/orders"/.test(leeg));
    const open = main((await pagina(`/account/orders?order=${ORDERS.sample}`)).html);
    ok('?order= zet die kaart open', new RegExp(`id="order-${ORDERS.sample}"[^>]*open|open[^>]*id="order-${ORDERS.sample}"`).test(open));
  }

  console.log('\nje vaste look');
  {
    const h = main(html['/account/brand-kit']);
    /* 2.08: het videoblok is weg (video is op aanvraag). */
    ok('twee diensten, elk als kaart (geen video meer)', tel(h, /id="bk-(catalog|lifestyle|video)"/g), 2);
    ok('de gezichten worden aangeboden', tel(h, /name="face" value="r[a-z]+"/g) >= 5);
    /* Astro schrijft een lege waarde als kaal `value` — per HTML-spec dezelfde lege string. */
    ok('"geen voorkeur" is een echte keuze', tel(h, /name="face" value(=""|[ >])/g) >= 2);
    ok('catalog kent een ondergrond, lifestyle een look', /name="background_hex"/.test(h) && /name="look"/.test(h));
    ok('de kleuren staan als svg en niet als style', tel(h, /<rect width="1" height="1" fill="#/g) >= 3);
    ok('en opslaan gaat naar /account/lock', tel(h, /action="\/account\/lock"/g), 2);
  }

  console.log('\nje gegevens');
  {
    const h = main(html['/account/details']);
    ok('het formulier post naar zichzelf', /action="\/account\/details"/.test(h));
    ok('de opgeslagen gegevens staan erin', /value="VOLT"/.test(h) && /value="https:\/\/voltbrand\.nl"/.test(h) && /NL001234567B01/.test(h));
    ok('het e-mailadres is tekst en geen veld', /studio@voltbrand\.nl/.test(h) && !/name="email"/.test(h));
    ok('en heeft zijn eigen wijzigformulier', /action="\/account\/email"/.test(h));
    ok('geen achtergrondkeuze meer op deze pagina', !/name="background"/.test(h));
  }

  console.log('\nfacturen');
  {
    const h = main(html['/account/invoices']);
    ok('de bewaartermijn wordt uitgelegd', /zeven jaar/.test(h));
    ok('elke betaalde bestelling heeft haar factuur', ['VIS-2026-701', 'VIS-2026-702', 'VIS-2026-703', 'VIS-2026-704'].every((n) => h.includes(n)));
    ok('met een downloadlink per factuur', tel(h, /\/account\/invoices\/\d+\/pdf/g), 4);
    ok('het brutobedrag staat erop, niet het netto', /39\.204|39\.204,00|392,04/.test(h) && !/324,00/.test(h));
    ok('de verlegde factuur zegt dat', /verlegd/i.test(h));
    ok('en de onbetaalde bestelling heeft er geen', !/VIS-2609-5102/.test(h));
  }

  console.log('\nhet abonnement');
  {
    const h = main(html['/account/plan']);
    /* ── ÉÉN PAGINA ZONDER TABBLADEN — 8 oktober 2026 (punt 2.07) ──────────
       Van boven naar beneden: saldo (uit het creditboek), twee bestelknoppen
       met de vaste look, de creditkaart, de maandset, het creditboek en "Je
       plan" met pauzeren en opzeggen. Zie ook tests/abonnementspagina.test.mjs. */
    ok('geen tabbladen meer', !/st-tabs|tab=(facturering|bestellen|planning|look|edities)/.test(h));
    ok('het saldo uit het creditboek', /class="[^"]*st-abo-saldo/.test(h) && /Je hebt (geen credits|\d+ credits?)/.test(h));
    ok('  en niet als inline stijl', !/style="[^"]*width:/.test(h));
    ok('twee bestelknoppen naar het gewone formulier', /href="(\/nl)?\/start\/catalog\//.test(h) && /href="(\/nl)?\/start\/lifestyle\//.test(h));
    ok('de creditkaart staat erop (6.01)', /<section class="ck[\s"]/.test(h));
    ok('  en de complete bundel staat er niet meer bij', !/Complete bundel|Complete bundle/.test(h));
    ok('het creditboek', /id="creditboek"/.test(h));
    ok('je plan met termijn en bedrag', /id="je-plan"/.test(h) && /maandelijks|monthly/.test(h) && /€/.test(h));
    ok('pauzeren en opzeggen, met een verplichte reden', /action="\/account\/plan\/pause"/.test(h) && /action="\/account\/plan\/cancel"/.test(h) && /name="reden" value="credits" required/.test(h));
    ok('opzeggen biedt eerst pauzeren aan', /st-stop-aanbod/.test(h) && /formaction="\/account\/plan\/pause"/.test(h));
    ok('er is geen vaste week meer: geen strook, geen zin, geen formulier', tel(h, /class="st-dag[ "]/g) === 0 && !/loopt van|runs from/.test(h) && !/\/account\/plan\/week/.test(h));
    ok('de knop "Bestellen" wijst naar het gewone bestelformulier', /href="(\/nl)?\/start"[^>]*>(Bestellen|Order)</.test(html['/account/plan']));
    ok('en Editions als één regel', /st-editions-regel/.test(h));
    ok('de maandset-kaart staat erop', /st-maandset|De maandset|monthly set/i.test(h));

    /* De oude tabbladen sturen door naar de ene pagina; Facturering naar "Je plan". */
    for (const [tab, waar] of [['bestellen', '/account/plan'], ['look', '/account/plan'], ['edities', '/account/plan'], ['facturering', '/account/plan#je-plan']]) {
      const oud = await pagina(`/account/plan?tab=${tab}`);
      ok(`een oude link ?tab=${tab} stuurt door naar ${waar}`, [oud.status, oud.headers.get('location')], [303, waar]);
    }
    ok('de lijst staat niet op de pagina', !/Zwarte cargo/.test(h));
  }

  console.log('\nzonder abonnement');
  {
    const p = await pagina('/account/plan', { token: NOORD.token });
    const h = main(p.html);
    ok('NOORD ziet de lege stand, in het Engels', p.status === 200 && /st-geenabo/.test(h) && /plan/i.test(h) && !/Zwarte cargo/.test(h));
    ok('met twee knoppen naar bestaande pagina\'s', /href="\/plans"/.test(h) && /href="\/start"/.test(h));
    /* Twee blokken sinds ronde 10 (8 oktober 2026): de credits en de look. De
       voorbeeldweek als derde blok is weg met de vaste week. */
    ok('en de twee uitlegblokken als beeld', tel(h, /st-uitleg-blok/g), 2);
    ok('zonder voorbeeldweek', tel(h, /class="st-dag[ "]/g), 0);
  }

  /* ── 3 · DE DEUREN ───────────────────────────────────────────────────────── */
  console.log('\nde deuren');
  {
    const r = await studio.fetch('/account?lang=en');
    ok('?lang= zet een cookie en stuurt terug zonder de parameter', [r.status, r.headers.get('location')], [303, '/account']);
    ok('en de cookie geldt voor het dashboard', /vis_lang=en/.test(r.headers.get('set-cookie') || '') && /Path=\/account/.test(r.headers.get('set-cookie') || ''));
    const en = (await pagina('/account', { cookie: 'vis_lang=en' })).html;
    ok('de keuze wint van de taal van de laatste bestelling', kop(en) === 'Welcome back, Mara');
    const nav = await studio.fetch('/account/orders?nav=dicht');
    ok('?nav=dicht doet hetzelfde voor de zijbalk', [nav.status, nav.headers.get('location'), /vis_nav=dicht/.test(nav.headers.get('set-cookie') || '')], [303, '/account/orders', true]);
    /* 14 oktober 2026 (v26-donker a): Studio is alleen licht. Een oude link
       met ?thema= stuurt nog terug, maar zonder cookie, en een oude vis_thema
       maakt niets meer donker. */
    const thema = await studio.fetch('/account/plan?tab=look&thema=donker');
    ok('?thema=donker stuurt terug, houdt de tab vast en zet geen cookie', [thema.status, thema.headers.get('location'), thema.headers.get('set-cookie')], [303, '/account/plan?tab=look', null]);
    const donker = (await pagina('/account', { cookie: 'vis_thema=donker' })).html;
    ok('een oude vis_thema maakt de pagina niet donker', /data-thema="licht"/.test(donker) && !/class="[^"]*on-ink/.test(donker) && /class="[^"]*st-hal/.test(donker));
    ok('zonder cookie licht, in de hal', /data-thema="licht"/.test(html['/account']) && /class="[^"]*st-hal/.test(html['/account']));
    ok('en er staat geen maantje meer', !/\?thema=/.test(html['/account']));

    const anon = await studio.fetch('/account/plan', { token: null });
    ok('zonder sessie is het de inlog', [anon.status, anon.headers.get('location')], [303, '/account/login']);
    const login = await pagina('/account/login', { token: null });
    ok('en de inlog is een pagina met één e-mailveld', login.status === 200 && tel(login.html, /name="email"/g) === 1);
    const weg = await studio.fetch('/account/bestaat-niet');
    ok('een pad dat geen scherm is geeft 404', weg.status, 404);
    const terug = await pagina('/account/plan/return?ref=onzin');
    ok('/account/plan/return is een pagina op de schil', terug.status === 200 && tel(terug.html, /<h1[\s>]/g) === 1 && /href="\/account\/plan"/.test(main(terug.html)));
    ok('die zegt dat hij dit niet kan terugvinden', /niet terugvinden|cannot find/.test(terug.html));
  }
} finally {
  await studio.dispose();
}

console.log(`\n${goed}/${totaal} geslaagd`);
process.exit(goed === totaal ? 0 : 1);
