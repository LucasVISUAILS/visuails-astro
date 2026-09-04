// VISUAILS — the FAQ copy, in one place.
//
// WHY THIS FILE EXISTS
// The questions and answers used to be typed inline inside the COPY tables of
// src/components/FaqPage.astro and src/components/PricingPage.astro. That was
// fine while the only consumer was the markup. It stopped being fine the
// moment the site started emitting FAQPage JSON-LD: structured data that
// restates the visible copy from a second source is structured data that will
// eventually disagree with the page — and a Question/acceptedAnswer pair that
// no longer matches what a visitor reads is exactly the kind of mismatch
// search engines treat as a spam signal.
//
// So the copy moved here, once, and both consumers read it:
//   · the components render it (accordion markup, photos, "read more" links)
//   · src/data/schema.js turns the SAME objects into Question nodes
//
// Nothing about the answers is duplicated anywhere. If an answer changes, it
// changes here and both the page and its JSON-LD change with it.
//
// Every euro figure and every timing promise is still interpolated from
// src/data/pricing.js — this file holds prose, never a number.
//
// ── MIGRATED TO THE LADDER AND THE PLANS (August 2026) ───────────────────────
// Section 0 of src/data/pricing.js is the governing document. What these
// answers used to describe — a Drop Pilot of exactly eight products, a Full
// Drop of 25–30, a studio retainer, and flat per-product rates underneath them
// — no longer exists. What replaced it, and therefore what these answers now
// have to be able to explain:
//
//   · A LADDER. One unit, a product; one rate, which only ever falls as the
//     count rises. Every count has a price, so the old hole between the two
//     packages cannot reopen.
//   · A FIRST ORDER DISCOUNT, once per brand, at any size. This IS the Drop
//     Pilot now — same incentive, no fixed count to explain.
//   · THREE MONTHLY PLANS, each priced below the ladder total for the same
//     output (pricing.js asserts that at build time), with unused products
//     rolling over PLAN_ROLLOVER_MONTHS.
//   · SERVICE LEVEL FOLLOWS SIZE. From WINDOW_THRESHOLD products up, an order
//     gets the reserved window and the capacity calendar; below it, the
//     standard queue. It is no longer a second question the buyer answers.
//   · VAT IS ALWAYS LABELLED. BRIEF-14's hardest rule: no price is printed
//     without saying which side of the 21% it is on, and the label comes from
//     vatLabel() so it translates and moves in one place.
//
// TWO RULES A FUTURE EDITOR COULD UNDO BY ACCIDENT, so they are written down:
//
//   1 · WE DO NOT SELL A "DROP". In fashion the word means a collection going
//       live — the client’s own launch — and the site used it for a work order
//       at the same time, which is half the reason the model changed at all.
//       EN says "an order" or "a batch"; NL says "een bestelling". The word
//       survives in exactly one place below, in the answer that explains the
//       collision, and it is talking about the CLIENT's drop there.
//   2 · NO EURO AMOUNT IS TYPED HERE. Not one, in either language. Everything
//       comes through euro(), quote(), ladderRate(), PLAN_AMOUNT and friends,
//       so a price change in pricing.js rewrites these answers instead of
//       leaving them quoting a price list that no longer exists.
//
// SHAPE
//   { q, a }                 — a question and a plain-text answer.
//   { q, html }              — an answer that contains a link or emphasis. The
//                              markup renders it with set:html; the schema
//                              builder strips the tags (see htmlToText there).
//   { q, a, photos: [...] }  — one answer on /faq is answered with two images.
//   { q, a, linkText, linkHref } — a follow-on link under the answer. linkHref
//                              is a language-neutral base path; the component
//                              localizes it.

import {
  AMOUNT, TIERS, TEST_SAMPLE, euro, reviewClaim, turnaround, aftercare, perProduct,
  CATALOG_IMAGES, LIFESTYLE_IMAGES,
  LADDER, ladderRate, ladderFloor, ladderTotal,
  plans, planSaving, PLAN_AMOUNT, PLAN_PRODUCTS, PLAN_CLIPS,
  PLAN_ROLLOVER_MONTHS,
  WINDOW_THRESHOLD, vatLabel, vatNote, clause,
  /* De twee aantallen voor Editions — zie de noot bij EDITIONS_FAQ. */
  STOCK_OFF_BRAND, STOCK_ON_BRAND,
  /* De toeslag voor een compleet setje en de extra hoek — zie de nieuwe vragen
     bij catalog en lifestyle, 4 september 2026. */
  OUTFIT_SURCHARGE, MAX_OUTFIT_PRODUCTS, extraPhotoRate,
} from './pricing.js';
/* De doorschuiftermijnen staan in plans.js; hier alleen gelezen, niet overgetypt. */
import { TERMS } from './plans.js';
/* De bewaartermijnen komen uit retention.js — dezelfde getallen als /privacy §6,
   /terms §7 en de nachtelijke opruimtaak. Hier niet overgetypt. */
import { UPLOAD_DAYS, DELIVERY_DAYS } from '../lib/retention.js';
import { localizedPath } from '../i18n/ui.js';

const norm = (lang) => (lang === 'nl' ? 'nl' : 'en');

// ── The two ends of the ladder, read off LADDER rather than named ────────────
// The RUNG BOUNDS are read as well as the rates. An answer that says "from 35
// products" while pricing.js has re-cut the top rung to 40 is a wrong answer
// that no build step can catch, because 35 would still be a perfectly valid
// number. Reading the bound means re-cutting the ladder rewrites the sentence.
const COMPLETE_RUNGS = LADDER.complete;
const TOP_RUNG_AT = COMPLETE_RUNGS[COMPLETE_RUNGS.length - 1][0];
// The last count still on the entry rung, and the first count off it. Used to
// show the rate falling with the smallest possible step — one more product.
const ENTRY_RUNG_LAST = COMPLETE_RUNGS[0][1];
const SECOND_RUNG_AT = COMPLETE_RUNGS[1][0];


// The worked example under the first-order discount. The SAME count
// PricingPage.astro uses for its own worked example, deliberately: this answer
// renders directly underneath that block on /pricing, and two different worked
// examples on one page read as two different offers.
const FIRST_EG_PRODUCTS = 14;

/** A net price with its VAT label. Nothing in this file prints one without. */
function ex(amount, lang) {
  return `${euro(amount, lang)} ${vatLabel('excl', lang)}`;
}

// exIncl() used to return "net — gross". It now returns net alone and is kept
// only so its several call sites read the same; see the note above vatNote()
// in pricing.js for why no page prints a gross figure any more.
const exIncl = ex;

/**
 * The pricing-page FAQ — eight questions, rendered under "Pricing questions"
 * on /pricing and /nl/pricing and emitted as that page's FAQPage node.
 *
 * It was six under the packages. The three questions the ladder and the plans
 * create — how the rate falls, whether a plan beats ordering ad hoc, what
 * happens to plan products nobody used — are the ones a reader now arrives
 * with, and answering them anywhere but here would mean answering them twice.
 */
export function pricingFaqs(lang = 'en') {
  const l = norm(lang);
  const planList = plans(l);
  const planName = Object.fromEntries(planList.map((p) => [p.id, p.name]));
  const studioSaving = planSaving('studio');

  if (l === 'nl') {
    return [
      {
        q: 'Wanneer betaal ik?',
        a: `Na het versturen van je bestelling: je kunt meteen betalen, of later via de link in je bevestigingsmail. We beginnen zodra de betaling binnen is. Vanaf ${WINDOW_THRESHOLD} producten betaal je daarmee ook je leverdatum vast: die blijft zeven dagen voor je staan terwijl je betaalt. Probeer VISUAILS · €1 is één per bedrijf en wordt ook vooraf betaald.`,
      },
      {
        q: 'Is mijn eerste bestelling goedkoper?',
        a: `Nee, en dat is met opzet. Er was een kennismakingskorting van 20% en die is eraf gehaald: een tarief noemen en er dan een vijfde vanaf halen zegt dat het tarief nooit de prijs was. De prijs per product ís de korting — het tarief per product daalt naarmate je er meer bestelt, en het geldt voor elk product in de bestelling. ${FIRST_EG_PRODUCTS} complete producten is ${ex(ladderTotal('complete', FIRST_EG_PRODUCTS), 'nl')}, voor iedereen, altijd. Wil je het werk eerst zien, probeer VISUAILS dan eerst voor ${TEST_SAMPLE.nl.price}.`,
      },
      {
        q: 'Hoe daalt het tarief?',
        a: `Elk product in de bestelling gaat tegen hetzelfde tarief, en dat tarief wordt bepaald door hoeveel producten erin zitten. Eén compleet product is ${ex(ladderRate('complete', 1), 'nl')}; vanaf ${TOP_RUNG_AT} producten is datzelfde product ${ex(ladderFloor('complete'), 'nl')}. Omdat het tarief voor de hele bestelling geldt, verlaagt één product erbij de prijs van álle producten erin — niet alleen die voorbij de grens. Bij ${ENTRY_RUNG_LAST} producten betaal je ${ex(ladderRate('complete', ENTRY_RUNG_LAST), 'nl')} per product, bij ${SECOND_RUNG_AT} nog ${ex(ladderRate('complete', SECOND_RUNG_AT), 'nl')}.`,
      },
      {
        q: 'Is een plan goedkoper dan bestellen wanneer ik het nodig heb?',
        a: `Alleen als dezelfde output elke maand terugkomt. Het ${planName.studio}-plan is ${ex(PLAN_AMOUNT.studio, 'nl')} per maand voor ${PLAN_PRODUCTS.studio} producten en ${PLAN_CLIPS.studio} clips; op de prijs per product kost diezelfde output ${ex(studioSaving.onLadder, 'nl')}. Bestel je per seizoen in plaats van elke maand, dan ben je goedkoper uit met de prijs per product. Een plan waarvan je de producten niet opmaakt, bespaart je niets.`,
      },
      {
        q: 'Wat gebeurt er met planproducten die ik niet gebruik?',
        a: `Die schuiven ${PLAN_ROLLOVER_MONTHS} maand door op de maandtermijn en ${TERMS.yearly.rollover} maanden op de jaartermijn: wat je deze maand niet besteld hebt, kun je daarna alsnog bestellen. Verder stapelen ze niet op, want een plan is gereserveerde capaciteit in de agenda en niet-opgevraagde capaciteit is een maand die al voorbij is. Een maandabonnement kun je elke maand opzeggen; de jaartermijn ligt twaalf maanden vast.`,
      },
      {
        q: 'Waarom staat er geen leverdatum bij een kleine bestelling?',
        a: `Omdat het serviceniveau de omvang volgt. Vanaf ${WINDOW_THRESHOLD} producten gaat een bestelling in de agenda en krijgt hij ${clause(turnaround('attended', 'nl')).toLowerCase()}. Daaronder loopt hij in de normale doorlooptijd: ${clause(turnaround('unattended', 'nl')).toLowerCase()}, gezegd als gebruikelijk en nooit als datum. Een datum noemen die we zouden moeten breken is erger dan geen datum noemen, en een bestelling die al in de agenda staat wijkt nooit voor een bestelling die er niet in staat.`,
      },
      {
        q: 'Kost een video meer binnen een bestelling?',
        a: `Nee. ${ex(AMOUNT.video, 'nl')} per clip, hoe dan ook — los of toegevoegd aan elke bestelling. Video kost hetzelfde omdat het hetzelfde werk is.`,
      },
      {
        q: 'Hoe wordt btw getoond?',
        a: `Elk bedrag op de site is netto, met ${vatLabel('excl', 'nl')} erbij. Er staat bewust geen bedrag inclusief btw naast: het btw-tarief verschilt per land, dus één inclusief bedrag zou alleen voor Nederlandse lezers kloppen. ${vatNote('nl')} We zijn gevestigd in Nederland, btw-nummer NL005407575B96.`,
      },
    ];
  }

  return [
    {
      q: 'When do I pay?',
      a: `After you send your order: you can pay straight away, or later through the link in your confirmation email. Production starts once the payment is in. From ${WINDOW_THRESHOLD} products that payment also locks your delivery date, which is held for seven days while you pay. Try VISUAILS · €1 is one per business and is paid upfront as well.`,
    },
    {
      q: 'Is my first order cheaper?',
      a: `No, and that is deliberate. There was a 20% first-order discount and it has been removed: quoting a rate and then taking a fifth off it says the rate was never the price. The price per product is the discount — the rate per product falls as the count rises, and it applies to every product in the order. ${FIRST_EG_PRODUCTS} complete products is ${ex(ladderTotal('complete', FIRST_EG_PRODUCTS), 'en')}, for everyone, always. If you want to see the work first, that is what the test sample is for.`,
    },
    {
      q: 'How does the rate fall?',
      a: `Every product in the order is charged at the same rate, and that rate is set by how many products are in it. One complete product is ${ex(ladderRate('complete', 1), 'en')}; from ${TOP_RUNG_AT} products the same product is ${ex(ladderFloor('complete'), 'en')}. Because the rate applies to the whole order, crossing onto one more product lowers the price of every product in it, not only the ones past the line: ${ENTRY_RUNG_LAST} products is ${ex(ladderRate('complete', ENTRY_RUNG_LAST), 'en')} each, and ${SECOND_RUNG_AT} is ${ex(ladderRate('complete', SECOND_RUNG_AT), 'en')} each.`,
    },
    {
      q: 'Is a plan cheaper than ordering when I need it?',
      a: `Only if the same output comes round every month. The ${planName.studio} plan is ${ex(PLAN_AMOUNT.studio, 'en')} a month for ${PLAN_PRODUCTS.studio} products and ${PLAN_CLIPS.studio} clips; the same output on the price per product is ${ex(studioSaving.onLadder, 'en')}. If your ordering is seasonal rather than monthly, the price per product is the cheaper door — a plan you do not fill is not a saving.`,
    },
    {
      q: 'What happens to plan products I do not use?',
      a: `They roll over ${PLAN_ROLLOVER_MONTHS} month on the monthly term and ${TERMS.yearly.rollover} months on the 12-month term — what you did not order this month can be ordered later. They do not stack up beyond that, because a plan is capacity reserved in the calendar and capacity nobody claimed is a month that has already gone by. A monthly plan can be cancelled any month; the 12-month term is fixed.`,
    },
    {
      q: 'Why is there no delivery date on a small order?',
      a: `Because the service level follows the size. From ${WINDOW_THRESHOLD} products an order goes into the calendar and gets ${clause(turnaround('attended', 'en')).toLowerCase()}. Below that it runs in the normal turnaround: ${clause(turnaround('unattended', 'en')).toLowerCase()}, stated as typical and never as a date. Quoting a date we would have to break is worse than not quoting one, and an order already in the calendar is never pushed for one that is not.`,
    },
    {
      q: 'Does a video cost more inside an order?',
      a: `No. ${ex(AMOUNT.video, 'en')} a clip either way — on its own, or added to any order. Video is priced the same because it is the same work.`,
    },
    {
      q: 'How is VAT shown?',
      a: `Every figure on the site is net, with ${vatLabel('excl', 'en')} beside it. There is deliberately no incl.-VAT figure next to it: the rate differs per country, so a single gross number would only be true for a Dutch reader. ${vatNote('en')} We are based in the Netherlands, VAT number NL005407575B96.`,
    },
  ];
}

/**
 * The /faq accordion — twenty-one questions in five groups.
 *
 * The group ORDER is part of the data: FaqPage.astro pairs it index-for-index
 * with GROUP_ANCHORS so that /faq#pricing lands in the same place in both
 * languages, and throws at build time if the two lengths disagree. HomeV2.astro
 * also picks five questions by group and item INDEX, so moving a question
 * between groups moves it on the homepage too.
 */
export function faqPageGroups(lang = 'en') {
  const l = norm(lang);
  const cat = perProduct('catalog', l);
  const life = perProduct('lifestyle', l);
  const sample = TEST_SAMPLE[l];
  const planList = plans(l);
  const planName = Object.fromEntries(planList.map((p) => [p.id, p.name]));
  const planNames = planList.map((p) => p.name).join(', ');

  if (l === 'nl') {
    return [
      {
        title: 'Aan de slag',
        items: [
          {
            q: 'Wat is VISUAILS?',
            a: 'VISUAILS maakt van een map met productfoto’s catalogsets, lifestyle-carousels en video voor een hele productlijn. Onze productie doet dat op schaal; een specialist controleert elke visual voordat die bij jou aankomt.',
          },
          {
            // DE ENIGE PLEK waar het woord "drop" nog staat, en het gaat daar
            // over de lancering van de KLANT — precies de botsing die het
            // prijsmodel heeft veranderd. Zie de kop van dit bestand.
            q: 'Wat is een bestelling?',
            a: `Een bestelling is alles wat je in één keer aanlevert: één keer uploaden, één tarief, één factuur. Per product kies je een catalogset van ${CATALOG_IMAGES} foto’s, een lifestyle-carousel van ${LIFESTYLE_IMAGES} foto’s, of allebei. Er is geen minimum en geen pakket waar je collectie in moet passen — hoe meer producten, hoe lager het tarief per product.`,
          },
          {
            q: 'Wat moet ik opsturen?',
            a: 'Per product een duidelijke foto van de voorkant en één van de achterkant, plus een korte notitie over de look die je wilt. Allebei die kanten krijg je terug als geleverde foto, dus vragen we ze allebei in plaats van te gokken naar wat er achterop zit. Een close-up en een draagfoto mogen erbij en maken het nauwkeuriger, maar hoeven niet. Vijf minuten, of het nu één product is of dertig — de moeite groeit niet mee met de omvang van de bestelling.',
          },
          {
            q: 'Kan ik het proberen voordat ik een hele collectie bestel?',
            a: `Op twee manieren. Probeer VISUAILS voor ${sample.price} ${vatLabel('excl', 'nl')} op je eigen product, ${sample.unit}: je krijgt ${sample.deliverable} terug. Die loopt door dezelfde productie als een betaalde bestelling, dus wat je ziet is wat je zou krijgen. Of begin gewoon klein: het tarief is per product, dus een eerste bestelling mag een handvol stuks zijn.`,
          },
          {
            /* ── HET MEEST GESTELDE BEZWAAR, EN HET STOND NERGENS — 30 AUGUSTUS 2026
             *
             * Een buitenstaander die alleen naar de gepubliceerde pagina's keek,
             * viel hierover: het zelf-doen-argument staat volledig uitgeschreven op
             * /compare en nergens anders, en /compare bezoekt iemand pas als hij al
             * twijfelt. Voor een jong merk is een AI-tool de echte concurrent, niet
             * een shootdag.
             *
             * Hij hoort HIER omdat deze pagina als FAQPage in JSON-LD staat
             * (schema.js) — dit is het formaat dat een AI-zoekmachine citeert — en
             * omdat het antwoord dan één bron heeft die de homepage kan lezen (zie
             * OB_BRON in HomeV2.astro).
             *
             * DE VOLGORDE IS EEN KEUZE. Eerst wanneer een tool wél genoeg is, en pas
             * daarna wat wij eraan toevoegen. Andersom leest het als bangmakerij, en
             * dat is precies wat het niet moet doen: iemand die hier komt met een
             * tool in gedachten moet opgelucht weglopen, niet ongerust.
             *
             * ELKE CONCRETE CLAIM HIERIN IS NA TE KIJKEN. Het bewaren van model,
             * achtergrond en beeldverhouding is customer_style_locks (schema.sql);
             * zuiver wit is `requiresWhite` in channels.js en wordt in de bestelflow
             * afgedwongen; de AI Act-regel bij het bestand staat op /ai-act. De
             * slotzin is letterlijk `toolClose` van /compare, zodat de twee pagina's
             * op hetzelfde eindigen in plaats van elk hun eigen slot te verzinnen. */
            q: 'Waarom zou ik dit niet zelf doen met een AI-tool?',
            a: 'Voor een deel moet je dat ook doen. Een snelle mock om een idee te testen, een schets van een layout, alles wat niet bij een klant terechtkomt — daar is een tool genoeg voor, en goedkoper. Hij kost je stilletjes geld zodra de beelden naast elkaar moeten staan: de kleur verschuift bij elke run een beetje, en over een hele catalogus is dat wat een shop onsamenhangend maakt. Wat je hier koopt is alles wat er ná het genereren van een beeld gebeurt. Een specialist controleert elk beeld voordat het weggaat. Het model, de achtergrond en de beeldverhouding die je hebt goedgekeurd worden bewaard en bij je volgende bestelling opnieuw gebruikt. Waar een marktplaats zuiver wit eist, krijg je zuiver wit. De AI Act-regel komt bij het bestand mee. Is een tool genoeg voor wat je nodig hebt, gebruik dan de tool — en zo niet, dan is de enige test die iets waard is je eigen product.',
            linkText: 'De eerlijke vergelijking',
            linkHref: '/compare',
          },
        ],
      },
      {
        title: 'Bestellen en omvang',
        items: [
          {
            q: 'Wat is het verschil tussen catalog en lifestyle?',
            a: `${cat.name}. ${cat.line} Strak, consistent, gemaakt voor shoplistings en marktplaatsen. ${life.name}. ${life.line} Een gestylede scène in plaats van een product op een achtergrond. Neem je allebei op hetzelfde product, dan heet dat een compleet product: ${CATALOG_IMAGES + LIFESTYLE_IMAGES} foto’s tegen één tarief, voor elk product in de bestelling.`,
            photos: [
              {
                src: '/img/catalog-after.webp',
                alt: 'Een catalogfoto: één kledingstuk, vierkant, op een egale achtergrond.',
                cap: cat.name,
              },
              {
                src: '/img/lifestyle-glow-06.webp',
                alt: 'Een lifestylefoto: een kledingstuk gedragen door een model op een gestylede locatie.',
                cap: life.name,
              },
            ],
          },
          {
            q: 'Kan ik dezelfde stijl en hetzelfde model over bestellingen heen aanhouden?',
            a: 'Ja, en dat is grotendeels het punt. Dezelfde belichting, hoek, grade en hetzelfde model kunnen over een hele bestelling worden vastgehouden, en over de bestellingen daarna, zodat een catalogus samenhangend blijft terwijl de lijn groeit.',
          },
          {
            q: 'Kan ik een model dat alleen van mij is krijgen?',
            a: `Ja. Jouw merkmodel is een gezicht dat voor jouw merk is gebouwd en door niemand anders wordt gebruikt, consistent over elk product en elke bestelling. Elke bestelling bevat al een model uit de standaardbibliotheek, dus dit is een upgrade en geen vereiste — en in het ${planName.brand}-plan zit het inbegrepen.`,
            linkText: 'Bekijk Jouw merkmodel',
            linkHref: '/custom-models',
          },
          {
            q: 'Kan ik via WhatsApp bestellen?',
            a: 'Altijd. Stuur de foto’s en een korte notitie en wij nemen het over. Dezelfde productie, dezelfde controles, dezelfde capaciteitsregels — WhatsApp is een ingang, geen sluiproute.',
          },
        ],
      },
      {
        title: 'Levering en de agenda',
        items: [
          {
            q: 'Hoe snel is het?',
            a: `Het serviceniveau volgt de omvang. Vanaf ${WINDOW_THRESHOLD} producten gaat een bestelling in de agenda en krijgt hij ${clause(turnaround('attended', 'nl')).toLowerCase()}. Daaronder loopt hij in de normale doorlooptijd: ${clause(turnaround('unattended', 'nl')).toLowerCase()}, zonder vaste leverdatum.`,
          },
          {
            q: 'Wat als de week die ik nodig heb niet kan?',
            a: 'Dan zeggen we dat, voordat je betaalt, in plaats van je een datum te geven en te hopen. Een vastgezette leverdatum wordt eerst tegen de agenda gehouden en pas daarna aangeboden — nooit andersom. Een bestelling die al in de agenda staat, wijkt nooit voor een latere.',
          },
          {
            q: 'Wordt elk beeld echt door een specialist gecontroleerd?',
            a: `${clause(reviewClaim('attended', 'nl'))} — een specialist bekijkt elk beeld en controleert het op juistheid, consistentie en artefacten voordat het wordt geleverd. Er gaat niets ongecontroleerd weg, via welke ingang dan ook.`,
          },
          {
            q: 'Wat als de visuals niet kloppen?',
            /* Zie de noot bij de Engelse tegenhanger: dezelfde kapotte
               interpolatie en dezelfde onterechte kwalificatie. */
            a: `Bij elke bestelling vragen we of je tevreden bent met wat je hebt gekregen. Ben je dat niet, laat dan weten wat er niet klopt, dan nemen we het samen door — wat we afspreken hangt af van het probleem. ${aftercare('attended', 'nl')} Je markeert het per beeld in het portaal, zodat één beeld dat terug moet de rest niet ophoudt.`,
          },
          {
            q: 'Hoe krijg ik de bestanden precies?',
            a: `${clause(TIERS.attended.delivery.nl)}, vanaf ${WINDOW_THRESHOLD} producten. ${clause(TIERS.unattended.delivery.nl)}, daaronder. Hoe dan ook zijn ze hoge resolutie en e-commerce-klaar, op maat voor shoplistings, marktplaatsen en advertenties.`,
          },
        ],
      },
      {
        title: 'Prijzen en betaling',
        items: [
          {
            q: 'Wat kost het?',
            html: `Geprijsd per product, en het tarief daalt naarmate het aantal stijgt. Eén compleet product — een catalogset én een lifestyle-carousel — is <strong>${euro(ladderRate('complete', 1), 'nl')}</strong> ${vatLabel('excl', 'nl')}; vanaf ${TOP_RUNG_AT} producten is datzelfde product <strong>${euro(ladderFloor('complete'), 'nl')}</strong> ${vatLabel('excl', 'nl')}. Wil je maar één van beide, dan heeft die zijn eigen prijs per aantal: catalog vanaf ${euro(ladderRate('catalog', 1), 'nl')} aflopend tot ${ex(ladderFloor('catalog'), 'nl')} per product, en lifestyle vanaf ${euro(ladderRate('lifestyle', 1), 'nl')} aflopend tot ${ex(ladderFloor('lifestyle'), 'nl')} per product. Video is ${euro(AMOUNT.video, 'nl')} ${vatLabel('excl', 'nl')} per clip. De volledige uitsplitsing staat op de <a href="${localizedPath('nl', '/pricing')}">prijzenpagina</a>.`,
          },
          {
            q: 'Zijn er volumekortingen?',
            a: `De prijs per product ís het antwoord op volume — er komt niets bovenop en er valt niets te onderhandelen. Het tarief geldt voor elk product in de bestelling, dus één product erbij verlaagt de prijs van allemaal: bij ${ENTRY_RUNG_LAST} producten is dat ${ex(ladderRate('complete', ENTRY_RUNG_LAST), 'nl')} per product, bij ${SECOND_RUNG_AT} nog ${ex(ladderRate('complete', SECOND_RUNG_AT), 'nl')}.`,
          },
          {
            q: 'Is er een abonnement?',
            a: `Alleen als dezelfde output elke maand terugkomt. Er zijn ${planList.length} plannen — ${planNames} — van ${ex(PLAN_AMOUNT.starter, 'nl')} per maand voor ${PLAN_PRODUCTS.starter} producten tot ${ex(PLAN_AMOUNT.brand, 'nl')} per maand voor ${PLAN_PRODUCTS.brand} producten met je merkmodel inbegrepen. Elk plan kost minder dan diezelfde output op de prijs per product. Op de maandtermijn is hij maandelijks opzegbaar en schuiven ongebruikte producten ${PLAN_ROLLOVER_MONTHS} maand door; de jaartermijn ligt twaalf maanden vast en schuift ${TERMS.yearly.rollover} maanden door. Bestel je zonder plan, dan loopt er niets door.`,
          },
          {
            q: 'Kan ik mijn btw-nummer toevoegen?',
            a: `Ja, en dat is de moeite waard. De prijzen op de site zijn netto, gemarkeerd met ${vatLabel('excl', 'nl')}. Vul je btw-nummer in bij het bestellen: we controleren het bij VIES, en klopt het terwijl je in de EU buiten Nederland zit, dan betaal je 0% en is de btw verlegd — je geeft hem zelf aan in je eigen land. Een Nederlands bedrijf betaalt altijd ${vatLabel('rate', 'nl')}, ook met een geldig nummer, en buiten de EU valt de levering buiten de Europese btw. We zijn gevestigd in Nederland (btw NL005407575B96).`,
          },
        ],
      },
      {
        title: 'Rechten en gebruik',
        items: [
          {
            q: 'Mag ik de visuals commercieel gebruiken?',
            a: 'Ja. Ze zijn gemaakt voor commercieel gebruik — je shop, marktplaatsen, betaalde advertenties en socialmediafeeds. Geen licentie per gebruik en geen extra kosten om ze ergens anders in te zetten.',
          },
          {
            q: 'Wie is eigenaar van de resultaten?',
            a: 'De afgewerkte visuals zijn van jou om voor je bedrijf te gebruiken. Heb je een specifieke licentievraag, stel hem gerust en we bevestigen de details voor jouw geval op schrift.',
            linkText: 'Lees de voorwaarden',
            linkHref: '/terms',
          },
          {
            q: 'Gebruiken jullie mijn productfoto’s voor iets anders?',
            a: 'Nee. De foto’s die je stuurt worden alleen gebruikt om jouw bestelling te produceren, en verder niets.',
          },
          {
            q: 'Hoe lang bewaren jullie mijn foto’s?',
            a: `De foto’s die je aanlevert blijven ${UPLOAD_DAYS} dagen na het afronden van je bestelling staan en worden dan verwijderd; de geleverde beelden staan ${DELIVERY_DAYS} dagen in VISUAILS Studio om te downloaden en worden daarna daar verwijderd. Bewaar dus zelf een kopie: wij kunnen er een in ons archief hebben, maar dat is geen garantie — heb je oudere beelden toch nodig, neem contact op en we kijken of ze er nog staan. Wil je je aangeleverde foto’s eerder weg, mail ons en het gebeurt. Dezelfde termijnen staan in ons privacybeleid.`,
          },
          {
            q: 'Moet ik alle geleverde beelden gebruiken?',
            a: 'Nee. Je krijgt de complete set per product, en wat je ervan publiceert bepaal jij. Gebruik je vandaag alleen de voorkant en de on-model shot, dan blijven de andere gewoon staan voor wanneer je ze nodig hebt — een seizoenscampagne, een nieuwe marktplaats, een andere bannermaat. Er zit geen gebruikstermijn op en het kost niets extra om er later alsnog een in te zetten.',
          },
          {
            q: 'Zijn de visuals AI-gegenereerd?',
            a: 'Ja, en dat zeggen we gewoon. Elke visual wordt gegenereerd uit foto’s van jouw echte product en met de hand afgewerkt voordat die wordt geleverd — een gemaakt beeld, geen foto van een shoot die heeft plaatsgevonden. We beschrijven precies hoe die van jou gemaakt zijn. We vertellen je niet wat dat voor jouw bedrijf betekent.',
            linkText: 'Lees onze AI Act-pagina',
            linkHref: '/ai-act',
          },
        ],
      },
    ];
  }

  return [
    {
      title: 'Getting started',
      items: [
        {
          q: 'What is VISUAILS?',
          a: 'VISUAILS turns a folder of product photos into catalog sets, lifestyle carousels and video for a whole product line. Our production does that at scale; a person checks every visual before it reaches you.',
        },
        {
          // THE ONE PLACE the word "drop" still appears, and there it means the
          // CLIENT's launch — the exact collision that changed the pricing
          // model. See this file's header. Do not reintroduce it as a name for
          // what we sell; that is what "an order" and "a batch" are for.
          q: 'What is an order?',
          a: `An order is everything you send in one go: one upload, one rate, one invoice. Per product you pick a catalog set of ${CATALOG_IMAGES} photos, a lifestyle carousel of ${LIFESTYLE_IMAGES} photos, or both. There is no minimum and no package to fit your line into — the more products, the lower the rate per product.`,
        },
        {
          q: 'What do I need to send you?',
          a: 'Per product, a clear photo of the front and one of the back, plus a short note on the look you want. Both of those sides come back to you as delivered images, so we ask for both rather than guess at whatever is on the back. A close-up and a worn shot are welcome and make it more accurate, but they are not required. Five minutes, whether it is one product or thirty — the effort does not scale with the size of the order.',
        },
        {
          q: 'Can I try it before ordering a whole collection?',
          a: `Two ways. A ${sample.price} ${vatLabel('excl', 'en')} test sample on one of your own products, ${sample.unit}: you get back ${sample.deliverable}. It runs through the same production as a paid order, so what you see is what you would get. Or simply start small: the rate is per product, so a first order can be a handful of pieces.`,
        },
        {
          /* Zie de Nederlandse tegenhanger voor waarom deze vraag hier staat en
             waarom hij in deze volgorde is geschreven. De twee lijsten moeten
             even lang blijven en dezelfde volgorde houden — HomeV2.astro zoekt
             het antwoord op de Engelse vraagtekst op en gebruikt de index die
             dat oplevert voor beide talen. */
          q: 'Why not just do this myself with an AI tool?',
          a: 'For some of it you should. A quick mock to test an idea, a layout sketch, anything that is not going in front of a customer — a tool is enough for that, and it is cheaper. It starts to cost you once the images have to sit next to each other: the colour shifts a little on every run, and across a full catalog that is what makes a shop look inconsistent. What you buy here is everything that happens after the image is generated. A specialist checks every image before it ships. The model, the background and the aspect ratio you approved are stored and reused on your next order. Where a marketplace demands pure white, you get pure white. The AI Act line comes with the file. If a tool is enough for what you need, use the tool — and if it is not, the only test worth anything is your own product.',
          linkText: 'The honest comparison',
          linkHref: '/compare',
        },
      ],
    },
    {
      title: 'Ordering and what you get',
      items: [
        {
          q: 'What is the difference between catalog and lifestyle?',
          // The name is separated from its line by a full stop, not a colon
          // or a dash. Both of those collide with punctuation the line
          // already owns: catalog.line contains a colon ("Four photos:
          // front, back, …") and lifestyle.line contains an em-dash. A full
          // stop is the only separator that cannot clash with a string this
          // file does not control — and it means the line keeps its own
          // capital, so no .toLowerCase() is needed. That matters: lowercasing
          // a data string is how "WhatsApp" became "whatsapp" elsewhere.
          //
          // The names and lines come through perProduct(), pricing.js's own
          // accessor, so they are the same strings /catalog and /lifestyle
          // render. Only the name and the line are read — never the price,
          // which is an entry rung now and belongs on the ladder, not here.
          a: `${cat.name}. ${cat.line} Clean, consistent, built for shop listings and marketplaces. ${life.name}. ${life.line} A styled scene rather than a product on a background. Take both on the same product and that is a complete product: ${CATALOG_IMAGES + LIFESTYLE_IMAGES} photos at one rate, for every product in the order.`,
          // The only answer on this page whose subject is literally "these two
          // things look different", so it is the only one where a pair of
          // photographs does the explaining better than the paragraph above
          // can. The paragraph stays: it carries the spec (how many shots,
          // which angles) and the pictures carry the difference. Two jobs, not
          // one restated twice.
          //
          // They are two different garments, deliberately not presented as a
          // before/after of one. catalog-after.webp is the flat-lay half of
          // the site's one real before/after pair and there is no lifestyle
          // frame of that same tee; captioning a hoodie and a tee as one
          // product would be a small lie told by a layout. The captions name
          // the FORMAT, not the item, and they are read from pricing.js so
          // they cannot drift from the product names used in the sentence
          // directly above them — or need translating twice.
          //
          // The photos do NOT travel into the JSON-LD. An Answer's `text` is
          // the answer as a visitor reads it; a picture that explains a
          // difference has no text form, and inventing one for a crawler is
          // how structured data starts describing a page that does not exist.
          photos: [
            {
              src: '/img/catalog-after.webp',
              alt: 'A catalog image: one garment, square, on a plain even ground.',
              cap: cat.name,
            },
            {
              src: '/img/lifestyle-glow-06.webp',
              alt: 'A lifestyle image: a garment worn by a model in a styled location.',
              cap: life.name,
            },
          ],
        },
        {
          q: 'Can I keep the same style and model across orders?',
          a: 'Yes, and that is most of the point. The same lighting, angle, grade and model can be held across a whole order and across the orders that follow, so a catalog stays coherent as the line grows.',
        },
        {
          q: 'Can I have a model that is only mine?',
          a: `Yes. Your Brand Model is a face built for your brand and used by no one else, kept consistent across every product and every order. Every order already includes a model from the standard library, so this is an upgrade rather than a requirement — and it is included in the ${planName.brand} plan.`,
          linkText: 'See Your Brand Model',
          linkHref: '/custom-models',
        },
        {
          q: 'Can I order over WhatsApp?',
          a: 'Always. Send the photos and a short brief and we take it from there. Same production, same checks, same capacity rules — WhatsApp is a door, not a shortcut past anything.',
        },
      ],
    },
    {
      title: 'Delivery and the calendar',
      items: [
        {
          q: 'How fast is it?',
          // Service level FOLLOWS size now — it is not a second question the
          // buyer answers, and this answer must not put it back into their
          // hands by describing two things to choose between.
          a: `The service level follows the size. From ${WINDOW_THRESHOLD} products an order goes into the calendar and gets ${clause(turnaround('attended', 'en')).toLowerCase()}. Below that it runs in the normal turnaround: ${clause(turnaround('unattended', 'en')).toLowerCase()}, with no fixed delivery date.`,
        },
        {
          q: 'What if the week I need cannot be held?',
          a: 'Then we tell you that, before you pay, instead of giving you a date and hoping. A reserved delivery date is confirmed against the calendar before it is offered — never after. An order already in the calendar is never pushed to make room for a later one.',
        },
        {
          q: 'Is every image really checked by a person?',
          a: `${clause(reviewClaim('attended', 'en'))} — a person selects and inspects each one for accuracy, consistency and artefacts before it is delivered. Nothing leaves unchecked, on either route in.`,
        },
        {
          q: 'What if the visuals are not right?',
          // The question changed with the answer. "How many revisions do I
          // get" only has an answer if something is being counted, and
          // putting the number back in the reader's mouth is the same
          // insecurity one step removed. The remedies — revision, refund,
          // credit — are named once, in /terms §10, deliberately not here.
          /* ── DEZE ZIN WAS STUK, EN OP TWEE MANIEREN — 25 augustus 2026 ─────
             Er stond: *"…reserved delivery date: ${clause(aftercare(…)).toLowerCase()},
             per image in the portal…"*. `aftercare()` geeft een VOLLEDIGE ZIN
             terug met een label ervoor en een punt erachter — "Satisfaction
             check: 1 revision round included per order to adjust any details."
             — en die werd middenin een andere zin geplakt. Wat de bezoeker las:

               "…reserved delivery date: satisfaction check: 1 revision round
                included per order to adjust any details., per image in the
                portal, so one image going back does not hold up the rest."

             Dubbele dubbele punt, en een punt vlak voor een komma. Dit stond zo
             op /faq én in de FAQPage-JSON-LD die Google uitleest, in beide talen.

             De interpolatie was ooit geschreven voor een FRAGMENT; AFTERCARE is
             sindsdien een hele zin geworden en de aanroepplek is niet meegegaan.

             ── EN DE KWALIFICATIE KLOPTE OOK NIET ──────────────────────────
             "On an order with a reserved delivery date" suggereert dat de
             revisieronde alleen bij grote bestellingen hoort. AFTERCARE is één
             gedeeld object voor beide treden — aftercare('unattended') geeft
             exact dezelfde zin — dus de ronde geldt voor ELKE bestelling. De
             kwalificatie beloofde minder dan de studio doet.

             Nu staat de zin op zichzelf, zoals hij geschreven is. */
          a: `We ask on every order whether you are happy with what you got. If you are not, tell us what is wrong and we go through it with you — what we agree depends on the problem. ${aftercare('attended', 'en')} You mark it per image in the portal, so one image going back does not hold up the rest.`,
        },
        {
          q: 'How do I actually receive the files?',
          // The tier strings WERE noun phrases when this was written; een
          // tekstronde heeft er zinnen met een punt van gemaakt, en toen las dit
          // antwoord "…tracking every step with key dates., from 10 products".
          // Vandaar clause() — zie de noot bij die functie in pricing.js.
          //
          // De komma plus de omvangsclausule blijft: kaal aanplakken leidt de
          // lezer het verkeerde pad op ("…or request-revision from 10 products").
          // En nog steeds NIET kleinschrijven: in een van deze strings staat
          // "WhatsApp", en .toLowerCase() maakt daar "whatsapp" van.
          a: `${clause(TIERS.attended.delivery.en)}, from ${WINDOW_THRESHOLD} products. ${clause(TIERS.unattended.delivery.en)}, below that. Either way they are high-resolution and e-commerce-ready, sized for shop listings, marketplaces and ads.`,
        },
      ],
    },
    {
      title: 'Pricing and payment',
      items: [
        {
          q: 'What does it cost?',
          html: `It is priced per product, and the rate falls as the count rises. One complete product — a catalog set and a lifestyle carousel — is <strong>${euro(ladderRate('complete', 1), 'en')}</strong> ${vatLabel('excl', 'en')}; from ${TOP_RUNG_AT} products the same product is <strong>${euro(ladderFloor('complete'), 'en')}</strong> ${vatLabel('excl', 'en')}. If you want only one of the two it has its own price by count: catalog from ${euro(ladderRate('catalog', 1), 'en')} falling to ${ex(ladderFloor('catalog'), 'en')} per product, and lifestyle from ${euro(ladderRate('lifestyle', 1), 'en')} falling to ${ex(ladderFloor('lifestyle'), 'en')} per product. Video is ${euro(AMOUNT.video, 'en')} ${vatLabel('excl', 'en')} a clip. Full breakdown on the <a href="${localizedPath('en', '/pricing')}">pricing page</a>.`,
        },
        {
          q: 'Are there volume discounts?',
          a: `The price per product is the volume answer — nothing is stacked on top of it and there is nothing to negotiate. The rate applies to every product in the order, so crossing onto one more product lowers the price of all of them: at ${ENTRY_RUNG_LAST} products it is ${ex(ladderRate('complete', ENTRY_RUNG_LAST), 'en')} each, at ${SECOND_RUNG_AT} it is ${ex(ladderRate('complete', SECOND_RUNG_AT), 'en')} each.`,
        },
        {
          q: 'Is there a subscription?',
          a: `Only if the same output comes round every month. There are ${planList.length} plans — ${planNames} — from ${ex(PLAN_AMOUNT.starter, 'en')} a month for ${PLAN_PRODUCTS.starter} products up to ${ex(PLAN_AMOUNT.brand, 'en')} a month for ${PLAN_PRODUCTS.brand} with your Brand Model included. Every plan costs less than the same output on the price per product. On the monthly term it can be cancelled any month and unused products roll over ${PLAN_ROLLOVER_MONTHS} month; the 12-month term is fixed for twelve months and rolls over ${TERMS.yearly.rollover} months. Order without one and nothing recurs.`,
        },
        {
          q: 'Can I add my VAT number?',
          a: `Yes, and it is worth doing. The prices on the site are net, marked ${vatLabel('excl', 'en')}. Enter your VAT number when you order: we check it against VIES, and if it is valid while you are in the EU outside the Netherlands, you pay 0% and the VAT is reverse charged — you declare it yourself in your own country. A Dutch business always pays ${vatLabel('rate', 'en')}, even with a valid number, and outside the EU the supply falls outside EU VAT altogether. We are based in the Netherlands (VAT NL005407575B96).`,
        },
      ],
    },
    {
      title: 'Rights and usage',
      items: [
        {
          q: 'Can I use the visuals commercially?',
          a: 'Yes. They are made for commercial use — your shop, marketplaces, paid ads and social feeds. No per-use licence and no extra fee for using them somewhere else.',
        },
        {
          q: 'Who owns the results?',
          a: 'The finished visuals are yours to use for your business. If you have a specific licensing question, ask and we will confirm the details for your case in writing.',
          linkText: 'Read the terms',
          linkHref: '/terms',
        },
        {
          q: 'Do you use my product photos for anything else?',
          a: 'No. The photos you send are used to produce your order and nothing else.',
        },
        {
          q: 'How long do you keep my photos?',
          a: `The photos you send stay for ${UPLOAD_DAYS} days after your order closes and are then deleted; the delivered images stay in VISUAILS Studio for ${DELIVERY_DAYS} days to download and are then removed there. So keep your own copy: we may have one in our archive, but that is not a guarantee — still need older images, get in touch and we check whether they are still there. Want your source photos gone sooner, email us and it is done. The same terms are in our privacy policy.`,
        },
        {
          q: 'Do I have to use every image you deliver?',
          a: 'No. You get the complete set per product, and what you publish from it is your call. If today you only use the front and the on-model shot, the rest simply stay there for when you need them — a seasonal campaign, a new marketplace, a different banner size. There is no time limit on using them and nothing extra to pay for putting one to work later.',
        },
        {
          q: 'Are the visuals AI-generated?',
          a: 'Yes, and we say so plainly. Every visual is generated from photographs of your real product and finished by hand before it is delivered — a made image, not a photograph of a shoot that happened. We will describe exactly how yours were made. We will not tell you what that means for your business.',
          linkText: 'Read our AI Act page',
          linkHref: '/ai-act',
        },
      ],
    },
  ];
}

/** Every /faq question, flattened out of its groups — what the schema needs. */
export function faqPageItems(lang = 'en') {
  return faqPageGroups(lang).flatMap((g) => g.items);
}

/*
 * ── DE DRIE BEZWAREN OP DE HOMEPAGE — 2 september 2026 ─────────────────────
 *
 * De bezwaardenrij op de homepage toont vier vragen, waarvan er DRIE hun
 * antwoord uit dit bestand halen (de vierde, over foto's van lage kwaliteit,
 * heeft zijn antwoord in HomeV2 zelf staan omdat het nergens anders voorkomt).
 * Die drie stonden in HomeV2.astro als `OB_BRON` — een lijstje vraagteksten dat
 * per stuk in faqPageItems() wordt opgezocht.
 *
 * Waarom die lijst hierheen verhuist: de GEO-doorlichting van 2 september wees
 * uit dat de homepage drie echte vragen-met-antwoord toont zonder FAQPage-knoop
 * in de graph. schema.js kan die knoop wel bouwen — het leest alleen het PAD en
 * niet de props van een component, en het had dus geen manier om te weten wélke
 * drie vragen daar staan. Nu heeft het die: één lijst, twee lezers.
 *
 * De HREFS blijven in HomeV2 staan. Waar een bezwaar naartoe linkt is opmaak
 * van die pagina en geen eigenschap van de vraag.
 */
export const HOME_OBJECTION_QUESTIONS = [
  'What if the visuals are not right?',
  'Are the visuals AI-generated?',
  'Why not just do this myself with an AI tool?',
];

/** Die drie vragen mét hun antwoord, in de gevraagde taal. */
export function homeObjectionFaqs(lang = 'en') {
  const l = norm(lang);
  const en = faqPageItems('en');
  const hier = faqPageItems(l);
  return HOME_OBJECTION_QUESTIONS.map((q) => {
    const i = en.findIndex((it) => it.q === q);
    /* Niet gooien maar overslaan: dit draait in de bouw van ELKE pagina, en
       een graph zonder één vraag is beter dan een site die niet bouwt. HomeV2
       gooit er wél op — daar is het een zichtbaar gat in de pagina. */
    return i < 0 ? null : hier[i];
  }).filter(Boolean);
}

// ─────────────────────────────────────────────────────────────────────────────
// DE DIENSTVRAGEN — /catalog, /lifestyle en /video, EN en NL.
//
// ── WAAROM ZE HIERHEEN ZIJN VERHUISD, 23 AUGUSTUS 2026 ──────────────────────
//
// Ze stonden in het COPY-object van elk van de drie componenten. Daar deden ze
// het prima als tekst en niets als gegeven: schema.js bouwt zijn graph uit het
// PAD en niet uit een prop — met opzet, zodat geen enkel paginabestand kan
// vergeten iets door te geven — en kan de frontmatter van een .astro-component
// niet lezen. Netto stonden er twintig vragen op de site die Google niet als
// FAQ zag, terwijl /faq en /pricing hun FAQPage-knoop wél hadden.
//
// De regel die hier al gold, staat boven faqNode() in schema.js: een Question
// en de <summary> die een bezoeker leest zijn dezelfde string, zodat ze niet
// uit elkaar kunnen lopen. Dat kan alleen als ze uit één module komen — deze.
//
// ── DE BEDRAGEN WORDEN HIER OPNIEUW UITGEREKEND EN NIET OVERGETYPT ──────────
//
// De componenten hadden `entry`, `floor`, `floorFrom`, `clip` en `t0` als
// lokale constanten. Ze staan hieronder als dezelfde afleiding uit dezelfde
// bron — ladderRate(), ladderFloor(), LADDER, AMOUNT.video, TIERS — en niet als
// een getal dat toevallig hetzelfde is.
// ─────────────────────────────────────────────────────────────────────────────

export function serviceFaqs(service, lang = 'en') {
  const l = norm(lang);
  const t0 = TIERS.unattended;

  if (service === 'catalog' || service === 'lifestyle') {
    const entry = ladderRate(service, 1);
    const floor = ladderFloor(service);
    const rungs = LADDER[service];
    const floorFrom = rungs[rungs.length - 1][0];
    return l === 'nl'
      ? CATALOG_LIFESTYLE_FAQ[service].nl({ entry, floor, floorFrom, t0 })
      : CATALOG_LIFESTYLE_FAQ[service].en({ entry, floor, floorFrom, t0 });
  }

  if (service === 'video') {
    const clip = euro(AMOUNT.video, l);
    const studioPlan = plans(l).find((pl) => pl.id === 'studio');
    return l === 'nl' ? VIDEO_FAQ.nl({ clip, studioPlan, t0 }) : VIDEO_FAQ.en({ clip, studioPlan, t0 });
  }

  /* Hooks, sinds 2 september 2026. Er is geen ladder en geen bestelstroom, dus
     geen `entry`/`floor` en geen venster — wat er wél is, is een ondergrens en
     een variantprijs. Zie de kop van HooksPage.astro voor waarom die twee de
     enige getallen op die pagina zijn. */
  if (service === 'hooks') {
    const vanaf = euro(AMOUNT.hooks, l);
    const variant = euro(AMOUNT.hooksVariant, l);
    return l === 'nl' ? HOOKS_FAQ.nl({ vanaf, variant, t0 }) : HOOKS_FAQ.en({ vanaf, variant, t0 });
  }

  /* Editions, sinds 2 september 2026. Twee bedragen en twee sets, en de vragen
     gaan bijna allemaal over het verschil tussen die twee — dat is waar een
     bezoeker op deze pagina echt mee zit. Zie de kop van EditionsPage.astro. */
  if (service === 'editions') {
    const maand = euro(AMOUNT.editions, l);
    const opzet = euro(AMOUNT.editionsSetup, l);
    return l === 'nl' ? EDITIONS_FAQ.nl({ maand, opzet, t0 }) : EDITIONS_FAQ.en({ maand, opzet, t0 });
  }

  /* Een onbekende dienst geeft een lege lijst en geen fout. buildGraph() roept
     dit aan voor elk pad dat het herkent; een lege lijst betekent daar "geen
     FAQPage-knoop", en dat is precies het juiste antwoord voor een pagina zonder
     vragen. Gooien zou het bouwen laten omvallen op een pagina die niets mis
     heeft. */
  return [];
}

const CATALOG_LIFESTYLE_FAQ = {
  catalog: {
    en:
    ({ entry, floor, floorFrom, t0 }) => [
      {
        q: 'What does a catalog set cost?',
        a: `${euro(entry, 'en')} ${vatLabel('excl', 'en')} for one product, and the rate falls a step at a time to ${euro(floor, 'en')} from ${floorFrom} products up. Whatever the count, a set is four photos — front, back, a close-up of the logo or fabric, and one on-model shot.`,
      },
      {
        q: 'Is the on-model shot really included?',
        a: 'Yes — one on-model photo is part of every product set, at no extra cost. Pick a model when you order, or let us choose one that fits your brand.',
      },
      {
        q: 'Do I have to use all four?',
        a: 'No. The set is what you get; what you publish from it is your call. Use two now and keep the others for a seasonal campaign, a new marketplace or a different banner size — there is no time limit and nothing extra to pay for putting one to work later.',
      },
      {
        q: 'How long does it take?',
        // Both halves of the timing promise, in the order a buyer needs them:
        // the typical span first, then the fact that it is not a date.
        a: `Under ${WINDOW_THRESHOLD} products: ${clause(turnaround('unattended', 'en')).toLowerCase()}. ${t0.queue.en} — an order of ${WINDOW_THRESHOLD} products or more already has a date held for it, so a busy week can move a smaller order. From ${WINDOW_THRESHOLD} products your own order is the one with the date: ${clause(turnaround('attended', 'en')).toLowerCase()}.`,
      },
      {
        q: 'Can I choose the background colour?',
        a: 'Standard is pure white (#FFFFFF). You can also enter any hex code — a light, neutral colour works best — applied behind every product you send. If you pick Amazon, bol or Zalando in the order, the background locks to white because those platforms require it; if you want your own colour as well, order the product twice and it is simply charged at the per-product rate.',
      },
      {
        q: 'Can I use these on Amazon, bol and Zalando?',
        a: 'You tell us where the product will be sold as part of the order, and we deliver to that spec. All three require a pure white main image, so picking one locks the background to #FFFFFF and the set comes as jpg rather than webp. Two rules stay theirs and are worth knowing: bol allows no model on the main image, and Zalando asks for model views photographed with a real person — so use our on-model shot there as an additional image. We match the specifications; the platform still decides on the listing.',
      },
      {
        q: 'Can I get more than four photos of a product?',
        a: `Yes. In the order form you add extra angles per product — a side, the inside, a second detail — at the extra-photo rate for your count (${euro(extraPhotoRate(1), 'en')} at one product, falling with the ladder). Write down which angle you want; it comes in the same set.`,
      },
      {
        q: 'Is this AI, and do I have to say so?',
        a: 'Yes, and we say so plainly: every image is generated from photographs of your real product and finished by hand. The AI provenance sits inside the file, so the disclosure is already there. What a marketplace or a social platform asks of you on top of that — an AI toggle on a post, a label on an ad — is theirs to set, and we list it on our AI Act page.',
        linkText: 'Read our AI Act page',
        linkHref: '/ai-act',
      },
      {
        q: 'Which files do I get?',
        a: 'Every image as jpg, png and webp, in the aspect ratio you chose when ordering (1:1, 4:5 or 3:4 for a catalog set). A marketplace order comes as jpg, because that is what Amazon, bol and Zalando take. You download per image or the whole approved set as a zip, from your account.',
      },
      {
        q: 'What if I need changes?',
        // This answer used to read "Three revision rounds are included."
        // That was a package's guarantee and not this one — and there is no
        // count on either tier now. What we would agree instead is in
        // /terms §10 and stays there; see src/data/pricing.js for why.
        a: `${clause(t0.aftercare.en)}. Anything that does not match your own photos — colour, print, fit — is what that round is for. A different background or look is a new order.`,
      },
    ],
    nl:
    ({ entry, floor, floorFrom, t0 }) => [
      {
        q: 'Wat kost een catalogset?',
        a: `${euro(entry, 'nl')} ${vatLabel('excl', 'nl')} voor één product, en dat tarief zakt stap voor stap naar ${euro(floor, 'nl')} vanaf ${floorFrom} producten. Bij elk aantal is een set vier foto’s — voorkant, achterkant, een close-up van het logo of de stof, en één foto op een model.`,
      },
      {
        q: 'Zit de on-model shot echt inbegrepen?',
        a: 'Ja — één on-model foto hoort bij elke productset, zonder extra kosten. Kies een model bij je bestelling, of laat ons er een kiezen die bij je merk past.',
      },
      {
        q: 'Moet ik alle vier de foto’s gebruiken?',
        a: 'Nee. De set is wat je krijgt; wat je ervan publiceert bepaal jij. Gebruik er nu twee en houd de rest voor een seizoenscampagne, een nieuwe marktplaats of een ander bannerformaat — er zit geen termijn op en het kost niets extra om er later alsnog een in te zetten.',
      },
      {
        q: 'Hoe lang duurt het?',
        a: `Onder ${WINDOW_THRESHOLD} producten: ${clause(turnaround('unattended', 'nl')).toLowerCase()}. ${t0.queue.nl} — een drukke week kan zo’n bestelling dus verschuiven. Vanaf ${WINDOW_THRESHOLD} producten houden we een leverdatum voor je vrij, en die wijkt niet meer voor een latere bestelling: ${clause(turnaround('attended', 'nl')).toLowerCase()}.`,
      },
      {
        q: 'Kan ik de achtergrondkleur kiezen?',
        a: 'Standaard is puur wit (#FFFFFF). Je kunt ook elke hexcode invoeren — een lichte, neutrale kleur werkt het best — toegepast achter elk product dat je opstuurt. Kies je bij je bestelling Amazon, bol of Zalando, dan staat de achtergrond vast op wit omdat die platforms dat eisen; wil je daarnaast je eigen kleur, bestel het product dan twee keer en je betaalt gewoon het tarief per product.',
      },
      {
        q: 'Kan ik deze op Amazon, bol en Zalando gebruiken?',
        a: 'Je geeft bij je bestelling aan waar het product verkocht wordt, en we leveren op die specificatie. Alle drie eisen ze een zuiver witte hoofdafbeelding, dus die keuze zet de achtergrond vast op #FFFFFF en je krijgt de set als jpg in plaats van webp. Twee regels blijven van het platform zelf, en die zijn goed om te weten: bol staat geen model op de hoofdafbeelding toe, en Zalando vraagt modelbeelden die met een echte persoon zijn gefotografeerd — gebruik onze on-model shot daar dus als extra afbeelding. Wij matchen de specificaties; het platform beslist over de listing.',
      },
      {
        q: 'Kan ik meer dan vier foto’s van een product krijgen?',
        a: `Ja. In het bestelformulier zet je per product extra hoeken erbij — een zijkant, de binnenkant, een tweede detail — tegen het extra-fototarief voor jouw aantal (${euro(extraPhotoRate(1), 'nl')} bij één product, dalend met de trap). Schrijf erbij welke hoek je wilt; hij komt in dezelfde set.`,
      },
      {
        q: 'Is dit AI, en moet ik dat vermelden?',
        a: 'Ja, en dat zeggen we gewoon: elk beeld wordt gegenereerd uit foto’s van je echte product en met de hand afgewerkt. De AI-herkomst zit in het bestand, dus de vermelding is er al. Wat een marktplaats of socialplatform daarbovenop van jou vraagt — een AI-schakelaar op een post, een label op een advertentie — is aan hen, en staat op onze AI Act-pagina.',
        linkText: 'Lees onze AI Act-pagina',
        linkHref: '/ai-act',
      },
      {
        q: 'Welke bestanden krijg ik?',
        a: 'Elk beeld als jpg, png en webp, in de beeldverhouding die je bij het bestellen koos (1:1, 4:5 of 3:4 voor een catalogset). Een marktplaatsbestelling komt als jpg, want dat nemen Amazon, bol en Zalando aan. Je downloadt per beeld of de hele goedgekeurde set als zip, vanuit je account.',
      },
      {
        q: 'Wat als ik wijzigingen nodig heb?',
        a: `${clause(t0.aftercare.nl)}. Alles wat niet overeenkomt met je eigen foto’s — kleur, print, pasvorm — is waar die ronde voor is. Een andere achtergrond of look is een nieuwe bestelling.`,
      },
    ],
  },
  lifestyle: {
    en:
    ({ entry, floor, floorFrom, t0 }) => [
      {
        q: 'What does a lifestyle carousel cost?',
        a: `${euro(entry, 'en')} ${vatLabel('excl', 'en')} for one product, and the rate falls a step at a time to ${euro(floor, 'en')} from ${floorFrom} products up. Whatever the count, a carousel is three photos of one product in one styled look.`,
      },
      {
        q: 'What are the three photos?',
        a: 'A scene shot — your product styled in a real-world setting. An on-model shot, so people can picture it in their own life. And a tight detail close-up that proves the quality. All three carry the same colour grade, which is what makes them read as one post rather than three photos.',
      },
      {
        q: 'Can I have more than one look per product?',
        a: 'One styled look per order. A second scene for the same product is simply a second order at the per-product rate — which also means the two sets stay distinct rather than being blended into a mood that is neither.',
      },
      {
        q: 'Can I get a mood that is not one of the four?',
        a: 'Yes. Most brands pick one of the four because they are ready to run today. For anything else, tell us what you have in mind and we send you a price before we start.',
      },
      {
        q: 'Can the same model appear across my whole collection?',
        a: 'Yes. Pick a face from the standard roster and reuse it, or have a Brand Model made only for you — the same person then carries your catalog sets, your carousels and your clips, which is what makes a range look like one brand rather than a series of shoots.',
      },
      {
        q: 'How long does it take?',
        a: `Under ${WINDOW_THRESHOLD} products: ${clause(turnaround('unattended', 'en')).toLowerCase()}. ${t0.queue.en} — an order of ${WINDOW_THRESHOLD} products or more already has a date held for it, so a busy week can move a smaller order. From ${WINDOW_THRESHOLD} products your own order is the one with the date: ${clause(turnaround('attended', 'en')).toLowerCase()}.`,
      },
      {
        q: 'Can several products go into one shot?',
        a: `Yes — a complete outfit. Trousers, top and shoes styled together on one model counts as one product plus a flat ${euro(OUTFIT_SURCHARGE, 'en')} for that product, for up to ${MAX_OUTFIT_PRODUCTS} products styled that way per order. Send the front and back of every piece, and tick it in the order form.`,
      },
      {
        q: 'Can I steer within a look?',
        a: 'A look is locked on its light and grade — that is what makes ten orders look like one brand. Setting, props and season you put in the note with your order, and we take them along as far as they fit the look. Anything beyond that is a look of your own.',
      },
      {
        q: 'Is this AI, and do I have to say so?',
        a: 'Yes, and we say so plainly: every image is generated from photographs of your real product and finished by hand. The AI provenance sits inside the file, so the disclosure is already there. What a marketplace or a social platform asks of you on top of that — an AI toggle on a post, a label on an ad — is theirs to set, and we list it on our AI Act page.',
        linkText: 'Read our AI Act page',
        linkHref: '/ai-act',
      },
      {
        q: 'Which files do I get?',
        a: 'Every image as jpg, png and webp, in the aspect ratio you chose when ordering (1:1, 4:5, 3:4, 16:9 for banners or 9:16 for Reels and Stories). A marketplace order comes as jpg, because that is what Amazon, bol and Zalando take. You download per image or the whole approved set as a zip, from your account.',
      },
      {
        q: 'What if I need changes?',
        a: `${clause(t0.aftercare.en)}. Anything that does not match your own photos — colour, print, fit — is what that round is for. A different look is a new order.`,
      },
    ],
    nl:
    ({ entry, floor, floorFrom, t0 }) => [
      {
        q: 'Wat kost een lifestyle-carousel?',
        a: `${euro(entry, 'nl')} ${vatLabel('excl', 'nl')} voor één product, en dat tarief zakt stap voor stap naar ${euro(floor, 'nl')} vanaf ${floorFrom} producten. Bij elk aantal is een carousel drie foto’s van één product in één gestylede look.`,
      },
      {
        q: 'Welke drie foto’s zijn het?',
        a: 'Een sfeershot — je product gestyled in een realistische setting. Een on-model shot, zodat mensen het in hun eigen leven zien. En een strakke detail-close-up die de kwaliteit bewijst. Alle drie dragen dezelfde kleurbewerking, en dat is wat ze als één post laat lezen in plaats van als drie losse foto’s.',
      },
      {
        q: 'Kan ik meer dan één look per product krijgen?',
        a: 'Eén gestylede look per bestelling. Een tweede scène voor hetzelfde product is gewoon een tweede bestelling tegen het tarief per product — en zo blijven de twee sets ook echt verschillend, in plaats van dat ze naar elkaar toe kruipen.',
      },
      {
        q: 'Kan ik een sfeer krijgen die niet bij de vier hoort?',
        a: 'Ja. De vier vaste looks zijn wat de meeste merken kiezen omdat ze al afgesteld zijn; alles daarbuiten spreken we eerst met je af en zetten we op een offerte, dus laat weten wat je in gedachten hebt, dan krijg je een prijs van ons in plaats van een gok.',
      },
      {
        q: 'Kan hetzelfde model in mijn hele collectie terugkomen?',
        a: 'Ja. Kies een gezicht uit de standaardbibliotheek en gebruik dat steeds opnieuw, of laat een merkmodel maken dat alleen van jou is — dezelfde persoon draagt dan je catalogsets, je carousels en je clips, en dan hoort je hele assortiment bij elkaar in plaats van dat het een reeks losse fotoshoots is.',
      },
      {
        q: 'Hoe lang duurt het?',
        a: `Onder ${WINDOW_THRESHOLD} producten: ${clause(turnaround('unattended', 'nl')).toLowerCase()}. ${t0.queue.nl} — een drukke week kan zo’n bestelling dus verschuiven. Vanaf ${WINDOW_THRESHOLD} producten houden we een leverdatum voor je vrij, en die wijkt niet meer voor een latere bestelling: ${clause(turnaround('attended', 'nl')).toLowerCase()}.`,
      },
      {
        q: 'Kunnen meerdere producten in één shot?',
        a: `Ja — een compleet setje. Broek, top en schoenen samen gestyled op één model telt als één product plus een vaste ${euro(OUTFIT_SURCHARGE, 'nl')} voor dat product, voor maximaal ${MAX_OUTFIT_PRODUCTS} zo gestylede producten per bestelling. Stuur van elk stuk voor- en achterkant, en vink het aan in het bestelformulier.`,
      },
      {
        q: 'Kan ik sturen binnen een look?',
        a: 'Een look ligt vast op licht en grade — dat is wat tien bestellingen op één merk laat lijken. Setting, props en seizoen geef je mee in de notitie bij je bestelling, en die nemen we mee zover het binnen de look past. Alles daarbuiten is een eigen look.',
      },
      {
        q: 'Is dit AI, en moet ik dat vermelden?',
        a: 'Ja, en dat zeggen we gewoon: elk beeld wordt gegenereerd uit foto’s van je echte product en met de hand afgewerkt. De AI-herkomst zit in het bestand, dus de vermelding is er al. Wat een marktplaats of socialplatform daarbovenop van jou vraagt — een AI-schakelaar op een post, een label op een advertentie — is aan hen, en staat op onze AI Act-pagina.',
        linkText: 'Lees onze AI Act-pagina',
        linkHref: '/ai-act',
      },
      {
        q: 'Welke bestanden krijg ik?',
        a: 'Elk beeld als jpg, png en webp, in de beeldverhouding die je bij het bestellen koos (1:1, 4:5, 3:4, 16:9 voor banners of 9:16 voor Reels en Stories). Een marktplaatsbestelling komt als jpg, want dat nemen Amazon, bol en Zalando aan. Je downloadt per beeld of de hele goedgekeurde set als zip, vanuit je account.',
      },
      {
        q: 'Wat als ik wijzigingen nodig heb?',
        a: `${clause(t0.aftercare.nl)}. Alles wat niet overeenkomt met je eigen foto’s — kleur, print, pasvorm — is waar die ronde voor is. Een andere look is een nieuwe bestelling.`,
      },
    ],
  },
};

/* ── DE VRAGEN BIJ /hooks — 2 SEPTEMBER 2026 ────────────────────────────────
 *
 * Vijf vragen, en drie ervan bestaan omdat ze op deze pagina onvermijdelijk
 * gesteld worden en het antwoord ongemakkelijk is: je kunt het nog niet
 * bestellen, we beloven geen bereik, en er zit geen staffel op. Een dienst-FAQ
 * die alleen de makkelijke vragen beantwoordt, is een verkooptekst met een
 * vraagteken erachter.
 *
 * GEEN ENKEL GETAL VOOR DE DOORLOOPTIJD. `turnaround('unattended')` schrijft
 * hem, net als op elke andere dienstpagina — het concept in
 * HOOKS-COPY-CONCEPT.md zei vier keer "24 tot 48 uur" en dat is precies de
 * belofte die tests/promises.test.mjs sitebreed tegenhoudt.
 */
const HOOKS_FAQ = {
  en:
  ({ vanaf, variant, t0 }) => [
      {
        q: 'What is a hook, exactly?',
        a: 'A short vertical video of your product, built on a format we have used before. The format works on a join: the video runs to the bottom edge of its frame and the image below it in the feed picks it up, so the two read as one picture rather than two posts.',
      },
      {
        q: 'What does it cost?',
        a: `From ${vanaf} ${vatLabel('excl', 'en')} per product. What moves it up is how many angles the format needs and how much of the product has to be rebuilt for it. An extra variant on the same product — same format, different execution — starts at ${variant}.`,
      },
      {
        q: 'Why does the rate not fall when I order more?',
        a: 'Catalog and lifestyle images are priced per product and that rate falls as the count rises, because one setup gets spread across more products. A hook is the setup, and there is nothing to spread it over. So the figure is a floor rather than a rate: what moves it is the work in front of it, not the number of products behind it.',
      },
      {
        q: 'Can I order one today?',
        a: `Not through the site, no. Hooks are planned by hand, so it starts with a conversation: you tell us what you sell and what photos you have, and we say in writing which format fits and what it would cost before anything runs. The work itself runs at the standard turnaround — ${clause(turnaround('unattended', 'en')).toLowerCase()} — and no delivery date is named before the calendar clears it.`,
      },
      {
        q: 'Do you guarantee it will perform?',
        a: 'No, and nobody honestly can. We guarantee the format, the execution and the check by a specialist before it goes out. Whether a post reaches anyone depends on the platform and on timing, and neither of those is ours to promise — a format can give a post a better chance, it cannot give it an audience.',
      },
      {
        q: 'What do I have to send?',
        a: 'The same set as a catalog order: front and back at a minimum, plus a detail shot and a worn shot if you have them. One photo is not enough, because the format moves around the product and so has to see it from more than one side. Phone photos are fine.',
      },
      {
        q: 'What if I need changes?',
        a: `${clause(t0.aftercare.en)}. One revision round on the video is included, in VISUAILS Studio, the same way you review any other order.`,
      },
  ],
  nl:
  ({ vanaf, variant, t0 }) => [
      {
        q: 'Wat is een hook precies?',
        a: 'Een korte verticale video van je product, gebouwd op een format dat we eerder gebruikt hebben. Het format werkt op een naad: de video loopt tot de onderrand van zijn kader en het beeld dat er in de feed onder staat pakt hem op, zodat die twee als één beeld lezen in plaats van als twee posts.',
      },
      {
        q: 'Wat kost het?',
        a: `Vanaf ${vanaf} ${vatLabel('excl', 'nl')} per product. Wat het hoger maakt: hoeveel kanten het format nodig heeft en hoeveel er van het product opnieuw gebouwd moet worden. Een extra variant op hetzelfde product — hetzelfde format, een andere invulling — begint bij ${variant}.`,
      },
      {
        q: 'Waarom daalt het tarief niet als ik er meer bestel?',
        a: 'Catalog- en lifestylebeelden hebben een prijs per product, en die zakt naarmate het aantal stijgt, omdat één opzet dan over meer producten wordt uitgesmeerd. Bij een hook ís de opzet het werk, en er is niets om hem over uit te smeren. Het bedrag is daarom een ondergrens en geen tarief: wat het beweegt is het werk ervoor, niet het aantal erachter.',
      },
      {
        q: 'Kan ik er vandaag een bestellen?',
        a: `Via de site niet. Hooks plannen we met de hand in, dus het begint met een gesprek: jij vertelt wat je verkoopt en welke foto’s je hebt, wij zetten op schrift welk format erbij past en wat het zou kosten voordat we beginnen. Het werk zelf loopt mee in de normale doorlooptijd — ${clause(turnaround('unattended', 'nl')).toLowerCase()} — en we noemen geen leverdatum voordat we in de agenda hebben gekeken.`,
      },
      {
        q: 'Garanderen jullie dat hij het goed doet?',
        a: 'Nee, en dat kan eerlijk gezegd niemand. Wij garanderen het format, de uitvoering en de controle door een specialist voordat hij weggaat. Of een post iemand bereikt, hangt af van het platform en van timing, en die twee zijn niet aan ons om te beloven — een format kan een post een betere kans geven, geen publiek.',
      },
      {
        q: 'Wat moet ik aanleveren?',
        a: 'Dezelfde set als bij een catalogbestelling: minimaal voorkant en achterkant, plus een detailfoto en een draagfoto als je die hebt. Eén foto is niet genoeg, omdat het format om het product heen beweegt en het dus van meer dan één kant moet zien. Telefoonfoto’s zijn prima.',
      },
      {
        q: 'Wat als ik wijzigingen nodig heb?',
        a: `${clause(t0.aftercare.nl)}. Eén revisieronde op de video zit erbij, in VISUAILS Studio, net zoals je elke andere bestelling nakijkt.`,
      },
  ],
};

/* ── DE VRAGEN BIJ /editions — 2 SEPTEMBER 2026 ─────────────────────────────
 *
 * De eerste vraag is niet "wat is het" maar "waar betaal ik voor", en dat is
 * geen toeval: dit is het enige product op de site waarvan de helft gratis bij
 * iets anders zit. Elke vraag hieronder bestaat omdat iemand hem stelt vlak
 * voordat hij een factuur krijgt — en dan is het te laat om hem te beantwoorden.
 */
const EDITIONS_FAQ = {
  en:
  ({ maand, opzet, t0 }) => [
      {
        q: 'What is the difference between the two sets?',
        a: `Who else gets them. The shared set of ${STOCK_OFF_BRAND} visuals a month is brand-neutral and goes to every brand on a plan — the same images, to all of them. Editions is ${STOCK_ON_BRAND} visuals a month built on your style, your locations and your colour palette, and that set goes to you and nobody else. Neither has a product in it.`,
      },
      {
        q: 'Do I have to pay for the shared set?',
        a: 'No. It comes with every plan at no extra cost, from the smallest one up, and appears each month under "This month" in your plan in VISUAILS Studio — every image, and the whole set as a zip. Only Editions is paid for.',
      },
      {
        q: 'What does Editions cost?',
        a: `${maand} a month ${vatLabel('excl', 'en')} on top of your plan, after a one-time setup of ${opzet}. The setup is the work done once per brand: the style, the locations and the colour palette every month after it runs on. It is two figures because it is two different things — folding the setup into the monthly price would spread it over months you have not committed to yet.`,
      },
      {
        q: 'Is my product in these images?',
        a: 'No, and that is the point of the category. These are mood, texture and light — the fabric close up, a wall in late light, a hand. A shopper is not judging a product in them; they are deciding whether they recognise the brand. Images with your product in them are a regular order.',
      },
      {
        q: 'Can another brand post the same image as me?',
        a: 'On the shared set, yes — that is what shared means, and we would rather say it here than in the small print. Our clients are clothing brands and therefore each other’s competitors, so it matters. On Editions, no: that set is made for one brand and delivered to one brand.',
      },
      {
        q: 'What happens to the images if I cancel?',
        a: 'You keep everything you downloaded, under the same licence you had. Nothing has to come down. You simply stop receiving new sets.',
      },
      {
        q: 'Will it be the same picture twelve times?',
        a: 'No — that is what the setup is for. It fixes the style, the locations and the palette so the sets stay recognisably one brand, and every month runs that setup again from different angles. A set that looked identical every month would fail its own job, which is to fill a calendar.',
      },
      {
        q: 'Are there models in them?',
        a: 'No faces in either set. Choosing models per set would turn a monthly run into a review round each time, and that is what would make it expensive. If that changes we will say so here first. Faces belong to your orders, where you pick from the shared roster or use a Brand Model.',
      },
      {
        q: 'Can I order it today?',
        a: `Editions, not yet — nothing is charged for it. The shared set needs no order: it comes with your plan. Editions starts with a conversation: you tell us about your brand, we say what the setup would look like, and nothing runs before that is agreed in writing. ${clause(t0.aftercare.en)}.`,
      },
  ],
  nl:
  ({ maand, opzet, t0 }) => [
      {
        q: 'Wat is het verschil tussen de twee sets?',
        a: `Wie ze verder krijgt. De gedeelde set van ${STOCK_OFF_BRAND} beelden per maand is merkneutraal en gaat naar elk merk met een abonnement — dezelfde beelden, naar allemaal. Editions is ${STOCK_ON_BRAND} beelden per maand die op jouw stijl, jouw locaties en jouw kleurenpalet gebouwd zijn, en die set gaat naar jou en naar niemand anders. In geen van beide zit een product.`,
      },
      {
        q: 'Moet ik voor de gedeelde set betalen?',
        a: 'Nee. Die komt zonder meerprijs met elk abonnement mee, vanaf het kleinste, en staat elke maand onder "Deze maand" bij je abonnement in VISUAILS Studio — elk beeld los, en de hele set als zip. Alleen Editions kost geld.',
      },
      {
        q: 'Wat kost Editions?',
        a: `${maand} per maand ${vatLabel('excl', 'nl')} bovenop je abonnement, na een eenmalige opzet van ${opzet}. Die opzet is het werk dat één keer per merk gedaan wordt: de stijl, de locaties en het kleurenpalet waar elke maand daarna op draait. Het zijn twee bedragen omdat het twee verschillende dingen zijn — de opzet in het maandbedrag vouwen zou hem uitsmeren over maanden waar je nog niet aan vastzit.`,
      },
      {
        q: 'Zit mijn product in deze beelden?',
        a: 'Nee, en dat is juist waar deze categorie over gaat. Dit is sfeer, textuur en licht — de stof van dichtbij, een muur in laat licht, een hand. Een koper beoordeelt er geen product op; hij beslist of hij het merk herkent. Beelden mét je product erin zijn een gewone bestelling.',
      },
      {
        q: 'Kan een ander merk hetzelfde beeld plaatsen als ik?',
        a: 'Bij de gedeelde set wel — dat is wat gedeeld betekent, en we zeggen het liever hier dan in de kleine lettertjes. Onze klanten zijn kledingmerken en dus elkaars concurrenten, dus het doet ertoe. Bij Editions niet: die set wordt voor één merk gemaakt en aan één merk geleverd.',
      },
      {
        q: 'Wat gebeurt er met de beelden als ik opzeg?',
        a: 'Je houdt alles wat je hebt opgehaald, onder dezelfde licentie die je had. Er hoeft niets offline. Je krijgt alleen geen nieuwe sets meer.',
      },
      {
        q: 'Wordt het niet twaalf keer hetzelfde beeld?',
        a: 'Nee — daar is de opzet voor. Die legt de stijl, de locaties en het palet vast zodat de sets herkenbaar één merk blijven, en elke maand draait diezelfde opzet opnieuw vanuit andere invalshoeken. Een set die er elke maand hetzelfde uitziet, faalt in zijn eigen opdracht: een kalender vullen.',
      },
      {
        q: 'Staan er modellen in?',
        a: 'Geen gezichten, in geen van beide sets. Modellen per set kiezen maakt van een maandelijkse ronde elke keer een controleronde, en dát is wat het duur zou maken. Verandert dat, dan staat het hier als eerste. Gezichten horen bij je bestellingen, waar je kiest uit de gedeelde bibliotheek of een merkmodel gebruikt.',
      },
      {
        q: 'Kan ik het vandaag bestellen?',
        a: `Editions nog niet — daar wordt ook nog niets voor afgeschreven. De gedeelde set hoef je niet te bestellen: die komt met je abonnement mee. Editions begint met een gesprek: jij vertelt over je merk, wij zeggen hoe de opzet eruit zou zien, en er gebeurt niets voordat dat op schrift staat. ${clause(t0.aftercare.nl)}.`,
      },
  ],
};

const VIDEO_FAQ = {
  en:
  ({ clip, studioPlan, t0 }) => [
      {
        q: 'What does a clip cost?',
        a: `${clip} ${vatLabel('excl', 'en')} per clip for Motion and Lifestyle Video, whether you order one or twenty. Campaign is bigger and multi-shot, so it is quoted per project.${studioPlan ? ` ${PLAN_CLIPS.studio} clips a month are included in the ${studioPlan.name} plan.` : ''}`,
      },
      {
        q: 'Why does the clip rate not fall with volume?',
        a: 'Catalog and lifestyle images are priced per product, and that rate falls a step at a time as the count rises. A clip is not part of that price per product — the work per clip is the same whether it arrives alone or with fifty products, so the rate stays put. It is the same figure on its own as it is inside a larger order.',
      },
      {
        q: 'How long is a clip, and what do I get?',
        a: 'Eight seconds of subtle motion, exported at sizes that fit a product page, a feed and an ad — the same style held across your whole range, so clips ordered months apart still look like they belong together.',
      },
      {
        q: 'How long does it take?',
        a: `A clip request runs at the standard turnaround: ${clause(turnaround('unattended', 'en')).toLowerCase()}, with no fixed delivery date — and that holds however many clips you ask for. A held delivery date belongs to the price per quantity for catalog and lifestyle products, and a clip does not count towards it, so ordering more clips does not buy a date. What does fall under such a held date is clips added to an order of ${WINDOW_THRESHOLD} products or more: there the order carries the date and the clips ride along with it.`,
      },
      {
        q: 'Can a model appear in the clip?',
        a: 'Yes. Where a person appears, that person can come from the standard roster or be a Brand Model made only for you — the same face your catalog and lifestyle sets already run on, so a shopper sees one person across stills and motion alike.',
      },
      {
        q: 'What if I need changes?',
        a: `${clause(t0.aftercare.en)}. Tell us what is wrong and we go through it with you.`,
      },
  ],
  nl:
  ({ clip, studioPlan, t0 }) => [
      {
        q: 'Wat kost een clip?',
        a: `${clip} ${vatLabel('excl', 'nl')} per clip voor Motion en Lifestyle Video, of je er nu één bestelt of twintig. Campaign is groter en bestaat uit meerdere shots, dus die gaat op offerte per project.${studioPlan ? ` ${PLAN_CLIPS.studio} clips per maand zitten in het ${studioPlan.name}-plan.` : ''}`,
      },
      {
        q: 'Waarom daalt het cliptarief niet bij grotere aantallen?',
        a: 'Catalog- en lifestylefoto’s hebben een tarief per product, en dat zakt stap voor stap naarmate het aantal stijgt. Bij een clip werkt dat niet zo — het werk per clip is hetzelfde, of hij nu alleen komt of met vijftig producten. Daarom blijft het tarief staan. Los is het hetzelfde bedrag als binnen een grotere bestelling.',
      },
      {
        q: 'Hoe lang is een clip, en wat krijg ik?',
        a: 'Je krijgt acht seconden subtiele beweging, in de formaten voor een productpagina, een feed en een advertentie. De stijl blijft hetzelfde door je hele assortiment, dus clips die maanden na elkaar besteld zijn horen nog bij elkaar.',
      },
      {
        q: 'Hoe lang duurt het?',
        a: `Een clipaanvraag loopt mee in de normale doorlooptijd: ${clause(turnaround('unattended', 'nl')).toLowerCase()}, zonder vaste leverdatum — en dat geldt bij één clip net zo goed als bij twaalf. Een vrijgehouden leverdatum hoort bij de prijs per aantal voor catalog- en lifestyleproducten, en een clip telt daar niet in mee; méér clips bestellen koopt dus geen datum. Wat er wél onder zo’n vrijgehouden datum valt, zijn clips die meegaan met een bestelling van ${WINDOW_THRESHOLD} producten of meer: daar draagt de bestelling de datum en liften de clips mee.`,
      },
      {
        q: 'Kan er een model in de clip?',
        a: 'Ja. Waar een persoon in beeld komt, kan die uit de standaardbibliotheek komen of een merkmodel zijn dat alleen voor jou gemaakt is — hetzelfde gezicht waar je catalog- en lifestylesets al op draaien, zodat een klant één persoon ziet in stills én in beweging.',
      },
      {
        q: 'Wat als ik wijzigingen nodig heb?',
        a: `${clause(t0.aftercare.nl)}. Laat weten wat er niet klopt, dan nemen we het samen door.`,
      },
  ],
};
