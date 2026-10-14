/*
 * HET ABONNEMENT ZONDER WEEK, OP DE GEBOUWDE PAGINA'S — ronde 10 (B), B2, 8 oktober 2026
 *
 *   npx astro build && node tests/abonnement-zonder-week-dist.test.mjs
 *
 * Leest dist/: wat een bezoeker op /plans, /start/plan, /faq en /terms (EN en NL)
 * te lezen krijgt. Geen vaste week, geen tussentermijn, wel de creditkaart met
 * de kernzin, één regel "op maat", en (sinds het spaarplafond, 12 oktober 2026)
 * "zolang het loopt vervalt er niets, sparen tot 3 maanden".
 */
import { readFileSync, existsSync } from 'node:fs';
import { CREDITS_GELDIG_MAANDEN, SERVICE_CREDITS, spaarPlafond, PLAN_CREDITS } from '../src/data/pricing.js';

let goed = 0; let totaal = 0;
function ok(naam, kreeg, verwacht = true) {
  totaal += 1;
  const isGoed = JSON.stringify(kreeg) === JSON.stringify(verwacht);
  if (isGoed) goed += 1;
  console.log(` ${isGoed ? 'ok  ' : 'FAIL'} ${String(naam).padEnd(66)}${isGoed ? '' : ` verwacht ${JSON.stringify(verwacht)} kreeg ${JSON.stringify(kreeg)}`}`);
}
const dist = (p) => { const f = new URL(`../dist/${p}`, import.meta.url); return existsSync(f) ? readFileSync(f, 'utf8') : null; };
/* De zichtbare tekst: zonder scripts, stijlen en tags. */
const tekst = (h) => String(h || '').replace(/<script[\s\S]*?<\/script>/g, ' ').replace(/<style[\s\S]*?<\/style>/g, ' ')
  .replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ');

const PAGINAS = {
  en: { plans: 'plans/index.html', start: 'start/plan/index.html', faq: 'faq/index.html', terms: 'terms/index.html' },
  nl: { plans: 'nl/plans/index.html', start: 'nl/start/plan/index.html', faq: 'nl/faq/index.html', terms: 'nl/terms/index.html' },
};

if (!dist('plans/index.html')) {
  ok('dist/ is gebouwd (draai eerst npx astro build)', false, true);
} else {
  for (const [taal, p] of Object.entries(PAGINAS)) {
    console.log(`\n${taal}`);
    const html = Object.fromEntries(Object.entries(p).map(([k, pad]) => [k, dist(pad)]));
    for (const [k, h] of Object.entries(html)) ok(`${p[k]} bestaat`, Boolean(h), true);
    const week = /vaste week|fixed week|week die van jou|week that is yours|jouw week|your week|je week\b/i;
    for (const [k, h] of Object.entries(html)) ok(`${p[k]}: geen vaste week`, week.test(tekst(h)), false);
    ok(`${p.plans}: de creditkaart met de kernzin`, /class="ck"/.test(html.plans) && (taal === 'nl'
      ? tekst(html.plans).includes(`kost een catalogset altijd ${SERVICE_CREDITS.catalog} credits`)
      : tekst(html.plans).includes(`a catalog set always costs ${SERVICE_CREDITS.catalog} credits`)), true);
    ok(`${p.plans}: de vertaling per plan`, taal === 'nl' ? /30 catalogsets of 24 carrousels/.test(tekst(html.plans)) : /30 catalog sets or 24 carousels/.test(tekst(html.plans)), true);
    ok(`${p.plans}: op maat als één regel, met de link naar /start/plan`, /id="op-maat"/.test(html.plans) && /start\/plan\/?\?plan=maat#maat-credits/.test(html.plans) && !/data-pm-credits/.test(html.plans), true);
    ok(`${p.plans}: geen tussentermijn`, /12-month term|jaartermijn|termijnen van twaalf maanden|on 12 months\b/i.test(tekst(html.plans)), false);
    /* Sinds /plans in de hal staat (12 oktober 2026, avond; afvinklijst 8,
       k-plans en k-teksten "doen") is "Zo werkt het" vier korte regels in
       plaats van één alinea. Dezelfde twee feiten, nu als kop en zin van één
       regel (PlansHal.astro, kladblok/TEKSTEN-GROEP-1.md). */
    ok(`${p.plans}: het spaarplafond: zolang het loopt vervalt er niets, sparen tot ${CREDITS_GELDIG_MAANDEN} maanden`, taal === 'nl'
      ? [`Sparen tot ${CREDITS_GELDIG_MAANDEN} maanden`, 'Zolang je abonnement loopt, vervalt er niets'].every((z) => tekst(html.plans).includes(z))
      : [`Save up to ${CREDITS_GELDIG_MAANDEN} months`, 'While your plan runs, nothing expires'].every((z) => tekst(html.plans).includes(z)), true);
    ok(`${p.plans}: het plafond per plan op de kaarten (Pro ${spaarPlafond(PLAN_CREDITS.studio)})`, taal === 'nl'
      ? tekst(html.plans).includes(`Sparen tot ${spaarPlafond(PLAN_CREDITS.studio)} credits`)
      : tekst(html.plans).includes(`Save up to ${spaarPlafond(PLAN_CREDITS.studio)} credits`), true);
    ok(`${p.plans}: nergens meer "${CREDITS_GELDIG_MAANDEN} maanden geldig" vanaf binnenkomst`, taal === 'nl'
      ? tekst(html.plans).includes(`Credits blijven ${CREDITS_GELDIG_MAANDEN} maanden geldig`)
      : tekst(html.plans).includes(`Credits stay valid for ${CREDITS_GELDIG_MAANDEN} months`), false);
    ok(`${p.start}: alleen maandelijks en jaar vooruit`, [/name="term" value="monthly"/.test(html.start), /name="term" value="prepaid"/.test(html.start), /name="term" value="yearly"/.test(html.start)], [true, true, false]);
    ok(`${p.start}: geen keuze voor de dag van een vaste week`, /name="window_day"/.test(html.start), false);
    ok(`${p.start}: de creditkaart`, /class="ck"/.test(html.start), true);
    ok(`${p.start}: het veld voor op maat heeft het anker`, /id="maat-credits"/.test(html.start), true);
    ok(`${p.faq}: zolang het loopt vervalt er niets, sparen tot ${CREDITS_GELDIG_MAANDEN} maanden`, taal === 'nl'
      ? tekst(html.faq).includes(`Zolang je abonnement loopt, vervallen ze niet: je spaart tot ${CREDITS_GELDIG_MAANDEN} maanden aan credits`)
      : tekst(html.faq).includes(`While your plan runs, they do not expire: you save up to ${CREDITS_GELDIG_MAANDEN} months of credits`), true);
    ok(`${p.terms}: sparen tot ${CREDITS_GELDIG_MAANDEN} maanden, en na stoppen ${CREDITS_GELDIG_MAANDEN} maanden na de laatste termijn`, taal === 'nl'
      ? tekst(html.terms).includes(`tot ${CREDITS_GELDIG_MAANDEN} maanden aan credits sparen`) && tekst(html.terms).includes(`geldig tot ${CREDITS_GELDIG_MAANDEN} maanden na je laatste termijn`)
      : tekst(html.terms).includes(`save up to ${CREDITS_GELDIG_MAANDEN} months of credits`) && tekst(html.terms).includes(`stay valid until ${CREDITS_GELDIG_MAANDEN} months after your last term`), true);
    ok(`${p.terms}: geen wachtrij en geen vastzetten op een lijst`, /op je lijst|on your list|vastzet|confirm it\b/i.test(tekst(html.terms).slice(tekst(html.terms).indexOf('9a.'))), false);
  }
}

console.log(`\n${goed}/${totaal} geslaagd`);
process.exit(goed === totaal ? 0 : 1);
