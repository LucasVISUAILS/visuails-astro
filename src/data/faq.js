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
//       live — the client's own launch — and the site used it for a work order
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
  PLAN_MIN_MONTHS, PLAN_ROLLOVER_MONTHS,
  WINDOW_THRESHOLD, vatLabel, vatNote,
} from './pricing.js';
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
        a: `Vanaf ${WINDOW_THRESHOLD} producten nadat de capaciteitscheck je leverdatum heeft bevestigd en voordat de productie start — je reserveert die leverdatum, dus daar betaal je voor. Kleinere bestellingen worden bij levering gefactureerd. De proefvisual is het enige dat vooraf betaald wordt, en dat is er één per bedrijf.`,
      },
      {
        q: 'Is mijn eerste bestelling goedkoper?',
        a: `Nee, en dat is met opzet. Er was een kennismakingskorting van 20% en die is eraf gehaald: een tarief noemen en er dan een vijfde vanaf halen zegt dat het tarief nooit de prijs was. De prijs per product ís de korting — het tarief per product daalt naarmate je er meer bestelt, en het geldt voor elk product in de bestelling. ${FIRST_EG_PRODUCTS} complete producten is ${ex(ladderTotal('complete', FIRST_EG_PRODUCTS), 'nl')}, voor iedereen, altijd. Wil je het werk eerst zien, dan is daar de proefvisual voor.`,
      },
      {
        q: 'Hoe daalt het tarief?',
        a: `Elk product in de bestelling gaat tegen hetzelfde tarief, en dat tarief wordt bepaald door hoeveel producten erin zitten. Eén compleet product is ${ex(ladderRate('complete', 1), 'nl')}; vanaf ${TOP_RUNG_AT} producten is datzelfde product ${ex(ladderFloor('complete'), 'nl')}. Omdat het tarief voor de hele bestelling geldt, verlaagt één product erbij de prijs van álle producten erin — niet alleen die voorbij de grens. Bij ${ENTRY_RUNG_LAST} producten betaal je ${ex(ladderRate('complete', ENTRY_RUNG_LAST), 'nl')} per product, bij ${SECOND_RUNG_AT} nog ${ex(ladderRate('complete', SECOND_RUNG_AT), 'nl')}.`,
      },
      {
        q: 'Is een plan goedkoper dan bestellen wanneer ik het nodig heb?',
        a: `Alleen als dezelfde output elke maand terugkomt. Het ${planName.studio}-plan is ${ex(PLAN_AMOUNT.studio, 'nl')} per maand voor ${PLAN_PRODUCTS.studio} producten en ${PLAN_CLIPS.studio} clips; op de prijs per product kost diezelfde output ${ex(studioSaving.onLadder, 'nl')}. Bestel je seizoensgebonden in plaats van maandelijks, dan is de prijs per product de goedkopere deur — een plan dat je niet volmaakt is geen besparing.`,
      },
      {
        q: 'Wat gebeurt er met planproducten die ik niet gebruik?',
        a: `Die schuiven ${PLAN_ROLLOVER_MONTHS} maand door: wat je deze maand niet besteld hebt, kun je volgende maand alsnog bestellen. Verder stapelen ze niet op, want een plan is gereserveerde capaciteit in de agenda en niet-opgevraagde capaciteit is een maand die al voorbij is. Een plan loopt minimaal ${PLAN_MIN_MONTHS} maanden.`,
      },
      {
        q: 'Waarom staat er geen leverdatum bij een kleine bestelling?',
        a: `Omdat het serviceniveau de omvang volgt. Vanaf ${WINDOW_THRESHOLD} producten gaat een bestelling in de agenda en krijgt hij ${turnaround('attended', 'nl').toLowerCase()}. Daaronder loopt hij in de normale doorlooptijd: ${turnaround('unattended', 'nl').toLowerCase()}, gezegd als gebruikelijk en nooit als datum. Een datum noemen die we zouden moeten breken is erger dan geen datum noemen, en een bestelling die al in de agenda staat wijkt nooit voor een bestelling die er niet in staat.`,
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
      a: `From ${WINDOW_THRESHOLD} products, after the capacity check has confirmed your delivery date and before production starts — the delivery date is what you are reserving, so it is what you are paying for. Smaller orders are invoiced on delivery. The test sample is the one thing charged upfront, and it is one per business.`,
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
      a: `They roll over ${PLAN_ROLLOVER_MONTHS} month — what you did not order this month can be ordered next month. They do not stack up beyond that, because a plan is capacity reserved in the calendar and capacity nobody claimed is a month that has already gone by. A plan runs for a minimum of ${PLAN_MIN_MONTHS} months.`,
    },
    {
      q: 'Why is there no delivery date on a small order?',
      a: `Because the service level follows the size. From ${WINDOW_THRESHOLD} products an order goes into the calendar and gets ${turnaround('attended', 'en').toLowerCase()}. Below that it runs in the normal turnaround: ${turnaround('unattended', 'en').toLowerCase()}, stated as typical and never as a date. Quoting a date we would have to break is worse than not quoting one, and an order already in the calendar is never pushed for one that is not.`,
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
            a: 'VISUAILS maakt van een map met productfoto’s catalogsets, lifestyle-carousels en video voor een hele productlijn. Onze productie doet dat op schaal; een mens controleert elke visual voordat die bij jou aankomt.',
          },
          {
            // DE ENIGE PLEK waar het woord "drop" nog staat, en het gaat daar
            // over de lancering van de KLANT — precies de botsing die het
            // prijsmodel heeft veranderd. Zie de kop van dit bestand.
            q: 'Wat is een bestelling?',
            a: `Een bestelling is zoveel producten als je in één keer aanlevert — één keer aanleveren, één tarief, één factuur — met wat je per product kiest: een catalogset, een lifestyle-carousel, of allebei. Er is geen pakket waar je lijn in moet passen en geen minimum; het tarief per product daalt naarmate het aantal stijgt. En over het woord "bestelling": in mode is dat jouw collectie die live gaat. Daarom noemen we onze eigen werkopdracht zo niet meer. De bestelling is van jou. Wat je bij ons koopt is een bestelling.`,
          },
          {
            q: 'Wat moet ik opsturen?',
            a: 'Per product een duidelijke foto van de voorkant en één van de achterkant, plus een korte notitie over de look die je wilt. Allebei die kanten krijg je terug als geleverd beeld, dus vragen we ze allebei in plaats van te gokken naar wat er achterop zit. Een close-up en een draagfoto mogen erbij en maken het nauwkeuriger, maar hoeven niet. Vijf minuten, of het nu één product is of dertig — de moeite groeit niet mee met de omvang van de bestelling.',
          },
          {
            q: 'Kan ik het proberen voordat ik een hele collectie bestel?',
            a: `Op twee manieren. Een proefvisual van ${sample.price} ${vatLabel('excl', 'nl')} op je eigen product, ${sample.unit}: dat product volledig geleverd — ${CATALOG_IMAGES} catalogbeelden of een carousel van ${LIFESTYLE_IMAGES} foto’s. Die loopt door dezelfde productie als een betaalde bestelling, dus wat je ziet is wat je zou krijgen. Of begin gewoon klein: het tarief is per product, dus een eerste bestelling mag een handvol stuks zijn.`,
          },
        ],
      },
      {
        title: 'Bestellen en omvang',
        items: [
          {
            q: 'Wat is het verschil tussen catalog en lifestyle?',
            a: `${cat.name}. ${cat.line} Strak, consistent, gemaakt voor shoplistings en marktplaatsen. ${life.name}. ${life.line} Een gestylede scène in plaats van een product op een achtergrond. Neem je allebei, dan heet dat op de prijs per product de complete scope — voor elk product beide.`,
            photos: [
              {
                src: '/img/catalog-after.webp',
                alt: 'Een catalogbeeld: één kledingstuk, vierkant, op een egale achtergrond.',
                cap: cat.name,
              },
              {
                src: '/img/lifestyle-glow-06.webp',
                alt: 'Een lifestylevisual: een kledingstuk gedragen door een model op een gestylede locatie.',
                cap: life.name,
              },
            ],
          },
          {
            q: 'Kan ik dezelfde stijl en hetzelfde model over bestellingen heen aanhouden?',
            a: 'Ja, en dat is grotendeels het punt. Dezelfde belichting, hoek, grade en hetzelfde model kunnen over een hele bestelling worden vastgehouden, en over de bestellingen daarna, zodat een catalogus samenhangend blijft terwijl de lijn groeit.',
          },
          {
            q: 'Kan ik een model dat alleen van mij is?',
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
            a: `Het serviceniveau volgt de omvang. Vanaf ${WINDOW_THRESHOLD} producten gaat een bestelling in de agenda en krijgt hij ${turnaround('attended', 'nl').toLowerCase()}. Daaronder loopt hij in de normale doorlooptijd: ${turnaround('unattended', 'nl').toLowerCase()}, zonder vaste leverdatum.`,
          },
          {
            q: 'Wat als de week die ik nodig heb niet kan?',
            a: 'Dan zeggen we dat, voordat je betaalt, in plaats van je een datum te geven en te hopen. Een vastgezette leverdatum wordt tegen de agenda gehouden voordat het wordt aangeboden — nooit erna. Een bestelling die al in de agenda staat, wijkt nooit voor een latere.',
          },
          {
            q: 'Wordt elk beeld echt door een mens gecontroleerd?',
            a: `${reviewClaim('attended', 'nl')} — een mens selecteert en inspecteert elk beeld op nauwkeurigheid, consistentie en artefacten voordat het wordt geleverd. Er gaat niets ongecontroleerd weg, via welke ingang dan ook.`,
          },
          {
            q: 'Wat als de visuals niet kloppen?',
            a: `Bij elke bestelling vragen we of je tevreden bent met wat je hebt gekregen. Ben je dat niet, laat dan weten wat er niet klopt, dan nemen we het samen door — wat we afspreken hangt af van het probleem. Bij een bestelling met een vastgezette leverdatum: ${aftercare('attended', 'nl').toLowerCase()}, per beeld in het portaal, zodat één beeld dat terugmoet de rest niet ophoudt.`,
          },
          {
            q: 'Hoe krijg ik de bestanden precies?',
            a: `${TIERS.attended.delivery.nl}, vanaf ${WINDOW_THRESHOLD} producten. ${TIERS.unattended.delivery.nl}, daaronder. Hoe dan ook zijn ze hoge resolutie en e-commerce-klaar, op maat voor shoplistings, marktplaatsen en advertenties.`,
          },
        ],
      },
      {
        title: 'Prijzen en betaling',
        items: [
          {
            q: 'Wat kost het?',
            html: `Geprijsd per product, en het tarief daalt naarmate het aantal stijgt. Eén compleet product — een catalogset én een lifestyle-carousel — is <strong>${euro(ladderRate('complete', 1), 'nl')}</strong> ${vatLabel('excl', 'nl')}; vanaf ${TOP_RUNG_AT} producten is datzelfde product <strong>${euro(ladderFloor('complete'), 'nl')}</strong> ${vatLabel('excl', 'nl')}. Wil je maar één van beide, dan heeft die zijn eigen prijs per aantal: catalog vanaf ${ex(ladderFloor('catalog'), 'nl')} per product en lifestyle vanaf ${ex(ladderFloor('lifestyle'), 'nl')} per product. Video is ${euro(AMOUNT.video, 'nl')} ${vatLabel('excl', 'nl')} per clip. De volledige uitsplitsing staat op de <a href="${localizedPath('nl', '/pricing')}">prijzenpagina</a>.`,
          },
          {
            q: 'Zijn er volumekortingen?',
            a: `De prijs per product ís het antwoord op volume — er komt niets bovenop en er valt niets te onderhandelen. Het tarief geldt voor elk product in de bestelling, dus één product erbij verlaagt de prijs van allemaal: bij ${ENTRY_RUNG_LAST} producten is dat ${ex(ladderRate('complete', ENTRY_RUNG_LAST), 'nl')} per product, bij ${SECOND_RUNG_AT} nog ${ex(ladderRate('complete', SECOND_RUNG_AT), 'nl')}.`,
          },
          {
            q: 'Is er een abonnement?',
            a: `Alleen als dezelfde output elke maand terugkomt. Er zijn ${planList.length} plannen — ${planNames} — van ${ex(PLAN_AMOUNT.starter, 'nl')} per maand voor ${PLAN_PRODUCTS.starter} producten tot ${ex(PLAN_AMOUNT.brand, 'nl')} per maand voor ${PLAN_PRODUCTS.brand} producten met je merkmodel inbegrepen. Elk plan kost minder dan diezelfde output op de prijs per product, loopt minimaal ${PLAN_MIN_MONTHS} maanden, en ongebruikte producten schuiven ${PLAN_ROLLOVER_MONTHS} maand door. Bestel je zonder plan, dan loopt er niets door.`,
          },
          {
            q: 'Kan ik mijn btw-nummer toevoegen?',
            a: `Ja, en dat is de moeite waard. ${vatLabel('rate', 'nl')} wordt bij het afrekenen aan iedereen berekend — de prijzen op de site zijn netto, gemarkeerd met ${vatLabel('excl', 'nl')} — en voor een EU-bedrijf met een geldig btw-nummer wordt de verlegging achteraf op de factuur rechtgezet. We zijn gevestigd in Nederland (btw NL005407575B96).`,
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
          a: `An order is however many products you send in one go — one delivery, one rate, one invoice — with what you choose applied to each: a catalog set, a lifestyle carousel, or both. There is no package to fit your line into and no minimum, and the rate per product falls as the count rises. About the word "order": in fashion it means your collection going live, so we stopped using it for our own work order. The order is yours. What you buy from us is an order.`,
        },
        {
          q: 'What do I need to send you?',
          a: 'Per product, a clear photo of the front and one of the back, plus a short note on the look you want. Both of those sides come back to you as delivered images, so we ask for both rather than guess at whatever is on the back. A close-up and a worn shot are welcome and make it more accurate, but they are not required. Five minutes, whether it is one product or thirty — the effort does not scale with the size of the order.',
        },
        {
          q: 'Can I try it before ordering a whole collection?',
          a: `Two ways. A ${sample.price} ${vatLabel('excl', 'en')} test sample on one of your own products, ${sample.unit}: that product delivered in full — ${CATALOG_IMAGES} catalog images or a ${LIFESTYLE_IMAGES}-photo carousel. It runs through the same production as a paid order, so what you see is what you would get. Or simply start small: the rate is per product, so a first order can be a handful of pieces.`,
        },
      ],
    },
    {
      title: 'Ordering and scope',
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
          a: `${cat.name}. ${cat.line} Clean, consistent, built for shop listings and marketplaces. ${life.name}. ${life.line} A styled scene rather than a product on a background. Take both and the price per product calls that the complete scope — both of them, for every product in the order.`,
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
              alt: 'A catalog visual: one garment, square, on a plain even ground.',
              cap: cat.name,
            },
            {
              src: '/img/lifestyle-glow-06.webp',
              alt: 'A lifestyle visual: a garment worn by a model in a styled location.',
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
          a: `The service level follows the size. From ${WINDOW_THRESHOLD} products an order goes into the calendar and gets ${turnaround('attended', 'en').toLowerCase()}. Below that it runs in the normal turnaround: ${turnaround('unattended', 'en').toLowerCase()}, with no fixed delivery date.`,
        },
        {
          q: 'What if the week I need cannot be held?',
          a: 'Then we tell you that, before you pay, instead of giving you a date and hoping. A reserved delivery date is confirmed against the calendar before it is offered — never after. An order already in the calendar is never pushed to make room for a later one.',
        },
        {
          q: 'Is every image really checked by a person?',
          a: `${reviewClaim('attended', 'en')} — a person selects and inspects each one for accuracy, consistency and artefacts before it is delivered. Nothing leaves unchecked, on either route in.`,
        },
        {
          q: 'What if the visuals are not right?',
          // The question changed with the answer. "How many revisions do I
          // get" only has an answer if something is being counted, and
          // putting the number back in the reader's mouth is the same
          // insecurity one step removed. The remedies — revision, refund,
          // credit — are named once, in /terms §10, deliberately not here.
          a: `We ask on every order whether you are happy with what you got. If you are not, tell us what is wrong and we go through it with you — what we agree depends on the problem. On an order with a reserved delivery date: ${aftercare('attended', 'en').toLowerCase()}, per image in the portal, so one image going back does not hold up the rest.`,
        },
        {
          q: 'How do I actually receive the files?',
          // The tier strings are noun phrases. Bare-appending a qualifier
          // garden-paths ("…or request-revision from 10 products"); the comma
          // plus a size clause keeps it unambiguous. The strings themselves
          // are never lowercased — one of them contains "WhatsApp", which
          // .toLowerCase() would mangle.
          a: `${TIERS.attended.delivery.en}, from ${WINDOW_THRESHOLD} products. ${TIERS.unattended.delivery.en}, below that. Either way they are high-resolution and e-commerce-ready, sized for shop listings, marketplaces and ads.`,
        },
      ],
    },
    {
      title: 'Pricing and payment',
      items: [
        {
          q: 'What does it cost?',
          html: `It is priced per product, and the rate falls as the count rises. One complete product — a catalog set and a lifestyle carousel — is <strong>${euro(ladderRate('complete', 1), 'en')}</strong> ${vatLabel('excl', 'en')}; from ${TOP_RUNG_AT} products the same product is <strong>${euro(ladderFloor('complete'), 'en')}</strong> ${vatLabel('excl', 'en')}. If you want only one of the two it has its own price by count: catalog from ${ex(ladderFloor('catalog'), 'en')} per product and lifestyle from ${ex(ladderFloor('lifestyle'), 'en')} per product. Video is ${euro(AMOUNT.video, 'en')} ${vatLabel('excl', 'en')} a clip. Full breakdown on the <a href="${localizedPath('en', '/pricing')}">pricing page</a>.`,
        },
        {
          q: 'Are there volume discounts?',
          a: `The price per product is the volume answer — nothing is stacked on top of it and there is nothing to negotiate. The rate applies to every product in the order, so crossing onto one more product lowers the price of all of them: at ${ENTRY_RUNG_LAST} products it is ${ex(ladderRate('complete', ENTRY_RUNG_LAST), 'en')} each, at ${SECOND_RUNG_AT} it is ${ex(ladderRate('complete', SECOND_RUNG_AT), 'en')} each.`,
        },
        {
          q: 'Is there a subscription?',
          a: `Only if the same output comes round every month. There are ${planList.length} plans — ${planNames} — from ${ex(PLAN_AMOUNT.starter, 'en')} a month for ${PLAN_PRODUCTS.starter} products up to ${ex(PLAN_AMOUNT.brand, 'en')} a month for ${PLAN_PRODUCTS.brand} with your Brand Model included. Every plan costs less than the same output on the price per product, runs for a minimum of ${PLAN_MIN_MONTHS} months, and rolls an unused product over ${PLAN_ROLLOVER_MONTHS} month. Order without one and nothing recurs.`,
        },
        {
          q: 'Can I add my VAT number?',
          a: `Yes, and it is worth doing. ${vatLabel('rate', 'en')} is charged at checkout to everyone — the prices on the site are net, marked ${vatLabel('excl', 'en')} — and for an EU business with a valid VAT number the reverse charge is corrected afterwards on the invoice. We are based in the Netherlands (VAT NL005407575B96).`,
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
