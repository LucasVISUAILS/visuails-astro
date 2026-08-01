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
  AMOUNT, TIERS, PER_PRODUCT, TEST_SAMPLE, euro, reviewClaim, turnaround, aftercare,
  FULL_DROP_MIN, FULL_DROP_MAX, PILOT_PRODUCTS,
  FULL_DROP_PER_PRODUCT_MIN, FULL_DROP_PER_PRODUCT_MAX,
} from './pricing.js';
import { localizedPath } from '../i18n/ui.js';

const norm = (lang) => (lang === 'nl' ? 'nl' : 'en');

const scope = `${FULL_DROP_MIN}–${FULL_DROP_MAX}`;

// euroRange() rounds; €61.67 must survive intact.
function dropPerProduct(lang) {
  return `${euro(FULL_DROP_PER_PRODUCT_MIN, lang)}–${euro(FULL_DROP_PER_PRODUCT_MAX, lang).slice(1)}`;
}

/**
 * The pricing-page FAQ — six questions, rendered under "Pricing questions" on
 * /pricing and /nl/pricing and emitted as that page's FAQPage node.
 */
export function pricingFaqs(lang = 'en') {
  const l = norm(lang);
  const unattended = TIERS.unattended;

  if (l === 'nl') {
    return [
      {
        q: 'Wanneer betaal ik?',
        a: 'Bij een drop nadat de capaciteitscheck je venster heeft bevestigd en voordat de productie start — je reserveert dat venster, dus daar betaal je voor. Losse producten worden bij levering gefactureerd. De proefvisual is het enige dat vooraf betaald wordt, en dat is er één per bedrijf.',
      },
      {
        q: 'Hoe werkt btw en verlegging?',
        a: 'We zijn gevestigd in Nederland (btw NL005407575B96). EU-bedrijven met een geldig btw-nummer kunnen dat bij het afrekenen invullen voor btw-verlegging en snellere facturatie. Het is optioneel.',
      },
      {
        q: `En als mijn drop groter is dan ${FULL_DROP_MAX} producten?`,
        a: `De Full Drop-band is ${FULL_DROP_MIN}–${FULL_DROP_MAX} omdat dat in één gereserveerd venster past. Een grotere collectie draaien we als opeenvolgende drops, geoffreerd voordat er iets geboekt wordt. We persen het niet in één venster en hopen er het beste van.`,
      },
      {
        q: 'Waarom staat er geen leverdatum bij losse producten?',
        a: `Omdat een drop nooit wijkt voor een losse bestelling, en een losse bestelling wel kan wijken. Een datum noemen die we zouden moeten breken is erger dan geen datum noemen. "${unattended.turnaround.nl}" is wat de wachtrij meestal doet — gezegd als gebruikelijk, nooit als datum.`,
      },
      {
        q: 'Kost een video meer binnen een drop?',
        a: `Nee. ${euro(AMOUNT.video, 'nl')} per clip, hoe dan ook — los of toegevoegd aan een drop. Video kost hetzelfde omdat het hetzelfde werk is.`,
      },
      {
        q: 'Is er een abonnement?',
        a: `Alleen als je dat wilt. De studio-retainer is ${euro(AMOUNT.retainer, 'nl')} per maand voor merken die elke maand een drop draaien. De rest koop je wanneer je het nodig hebt, zonder iets doorlopends.`,
      },
    ];
  }

  return [
    {
      q: 'When do I pay?',
      a: 'For a drop, after the capacity gate has confirmed your window and before production starts — the window is what you are reserving, so it is what you are paying for. Individual products are invoiced on delivery. The test sample is the one thing charged upfront, and it is one per business.',
    },
    {
      q: 'How does VAT and reverse-charge work?',
      a: 'We are based in the Netherlands (VAT NL005407575B96). EU businesses with a valid VAT number can supply it at checkout for reverse-charge and faster invoicing. It is optional.',
    },
    {
      q: `What if my drop is more than ${FULL_DROP_MAX} products?`,
      a: `The Full Drop band is ${FULL_DROP_MIN}–${FULL_DROP_MAX} because that is what fits one reserved window. A larger collection is run as consecutive drops, quoted before anything is booked. We will not squeeze it into one window and hope.`,
    },
    {
      q: 'Why is there no delivery date on individual products?',
      a: `Because a drop can never be pushed for a single order, and an individual order can. Quoting a date we would have to break is worse than not quoting one. "${unattended.turnaround.en}" is what the queue typically does — stated as typical, never as a date.`,
    },
    {
      q: 'Does a video cost more inside a drop?',
      a: `No. ${euro(AMOUNT.video, 'en')} a clip either way — on its own, or added to any drop. Video is priced the same because it is the same work.`,
    },
    {
      q: 'Is there a subscription?',
      a: `Only if you want one. The studio retainer is ${euro(AMOUNT.retainer, 'en')} a month for brands running a drop every month. Everything else is bought when you need it, with nothing recurring.`,
    },
  ];
}

/**
 * The /faq accordion — twenty-one questions in five groups.
 *
 * The group ORDER is part of the data: FaqPage.astro pairs it index-for-index
 * with GROUP_ANCHORS so that /faq#pricing lands in the same place in both
 * languages, and throws at build time if the two lengths disagree.
 */
export function faqPageGroups(lang = 'en') {
  const l = norm(lang);
  const perProductById = Object.fromEntries(PER_PRODUCT[l].map((p) => [p.id, p]));
  const sample = TEST_SAMPLE[l];
  const perProduct = dropPerProduct(l);

  if (l === 'nl') {
    return [
      {
        title: 'Aan de slag',
        items: [
          {
            q: 'Wat is VISUAILS?',
            a: 'VISUAILS maakt van een map met productfoto’s catalogsets, lifestyle-carousels en video voor een hele productlijn. De pipeline doet de productie op schaal; een mens controleert elke visual voordat die bij jou aankomt.',
          },
          {
            q: 'Wat is een drop?',
            a: `Een drop is ${scope} producten als één opdracht — één briefing, één venster, één factuur — met een catalogset en een lifestyle-carousel voor elk product. Zo maak je een seizoen aan productbeeld in één keer, in plaats van product voor product.`,
          },
          {
            q: 'Wat moet ik opsturen?',
            a: 'Eén duidelijke foto per product en een korte notitie over de look die je wilt. Meer niet. Vijf minuten, of het nu één product is of dertig — de moeite groeit niet mee met de omvang van de drop.',
          },
          {
            q: 'Kan ik het proberen voordat ik een hele drop bestel?',
            a: `Op twee manieren. Een proefvisual van ${sample.price} op je eigen product, ${sample.unit} — die loopt door dezelfde pipeline als een betaalde bestelling, dus wat je ziet is wat je zou krijgen. Of een Drop Pilot: precies ${PILOT_PRODUCTS} producten voor ${euro(AMOUNT.dropPilot, 'nl')}, eenmalig per merk, om te zien wat we met jouw lijn doen voordat je ons de hele collectie geeft.`,
          },
        ],
      },
      {
        title: 'Bestellen en omvang',
        items: [
          {
            q: 'Wat is het verschil tussen catalog en lifestyle?',
            a: `${perProductById.catalog.name}. ${perProductById.catalog.line} Strak, consistent, gemaakt voor shoplistings en marktplaatsen. ${perProductById.lifestyle.name}. ${perProductById.lifestyle.line} Een gestylede scène in plaats van een product op een achtergrond. Een drop bevat allebei, voor elk product.`,
            photos: [
              {
                src: '/img/catalog-after.webp',
                alt: 'Een catalogusvisual: één kledingstuk, vierkant, op een egale achtergrond.',
                cap: perProductById.catalog.name,
              },
              {
                src: '/img/lifestyle-glow-06.webp',
                alt: 'Een lifestylevisual: een kledingstuk gedragen door een model op een gestylede locatie.',
                cap: perProductById.lifestyle.name,
              },
            ],
          },
          {
            q: 'Kan ik dezelfde stijl en hetzelfde model over bestellingen heen aanhouden?',
            a: 'Ja, en dat is grotendeels het punt. Dezelfde belichting, hoek, grade en hetzelfde model kunnen over een hele drop worden vastgehouden, en over de drops daarna, zodat een catalogus samenhangend blijft terwijl de lijn groeit.',
          },
          {
            q: 'Kan ik een model dat alleen van mij is?',
            a: 'Ja. Jouw merkmodel is een gezicht dat voor jouw merk is gebouwd en door niemand anders wordt gebruikt, consistent over elk product en elke drop. Elke drop bevat al een model uit de standaardbibliotheek, dus dit is een upgrade en geen vereiste.',
            linkText: 'Bekijk Jouw merkmodel',
            linkHref: '/custom-models',
          },
          {
            q: 'Kan ik via WhatsApp bestellen?',
            a: 'Altijd. Stuur de foto’s en een korte briefing en wij nemen het over. Dezelfde pipeline, dezelfde controles, dezelfde capaciteitsregels — WhatsApp is een ingang, geen sluiproute.',
          },
        ],
      },
      {
        title: 'Levering en de agenda',
        items: [
          {
            q: 'Hoe snel is het?',
            a: `Een drop krijgt ${turnaround('attended', 'nl').toLowerCase()}. Losse producten gaan door de standaard wachtrij: ${turnaround('unattended', 'nl').toLowerCase()}, zonder vaste leverdatum.`,
          },
          {
            q: 'Wat als de week die ik nodig heb niet kan?',
            a: 'Dan zeggen we dat, voordat je betaalt, in plaats van je een datum te geven en te hopen. Een gereserveerd venster wordt tegen de agenda gehouden voordat het wordt aangeboden — nooit erna. Een drop die al in de agenda staat, wijkt nooit voor een latere.',
          },
          {
            q: 'Wordt elk beeld echt door een mens gecontroleerd?',
            a: `${reviewClaim('attended', 'nl')} — een mens selecteert en inspecteert elk beeld op nauwkeurigheid, consistentie en artefacten voordat het wordt geleverd. Er gaat niets ongecontroleerd weg, via welke ingang dan ook.`,
          },
          {
            q: 'Wat als de visuals niet kloppen?',
            a: `Bij elke bestelling vragen we of je tevreden bent met wat je hebt gekregen. Ben je dat niet, laat dan weten wat er niet klopt, dan nemen we het samen door — wat we afspreken hangt af van het probleem. Bij een drop: ${aftercare('attended', 'nl').toLowerCase()}, per beeld in het portaal, zodat één beeld dat terugmoet de rest niet ophoudt.`,
          },
          {
            q: 'Hoe krijg ik de bestanden precies?',
            a: `${TIERS.attended.delivery.nl}, als je een drop draait. ${TIERS.unattended.delivery.nl}, als je losse producten bestelt. Hoe dan ook zijn ze hoge resolutie en e-commerce-klaar, op maat voor shoplistings, marktplaatsen en advertenties.`,
          },
        ],
      },
      {
        title: 'Prijzen en betaling',
        items: [
          {
            q: 'Wat kost het?',
            html: `Een Full Drop is <strong>${euro(AMOUNT.fullDrop, 'nl')}</strong> voor ${scope} producten — ${perProduct} per product, met catalog en lifestyle voor elk. Los: ${perProductById.catalog.name.toLowerCase()} ${perProductById.catalog.price} per product, ${perProductById.lifestyle.name.toLowerCase()} ${perProductById.lifestyle.price} per product, video ${perProductById.video.price} per clip. De volledige uitsplitsing staat op de <a href="${localizedPath('nl', '/pricing')}">prijzenpagina</a>.`,
          },
          {
            q: 'Zijn er volumekortingen?',
            a: `Er zijn geen gestapelde kortingsstaffels — de ladder is het antwoord op volume. Losse producten bestellen kost ${euro(AMOUNT.catalog + AMOUNT.lifestyle, 'nl')} per product op dropschaal; een Full Drop is ${perProduct} per product voor hetzelfde werk. De besparing zit in het samen draaien, en staat op de prijzenpagina in plaats van achter een onderhandeling.`,
          },
          {
            q: 'Is er een abonnement?',
            a: `Niet een dat je nodig hebt. Een drop is eenmalig: één opdracht, één factuur, geen doorlopende verplichting. Er is een studio retainer van ${euro(AMOUNT.retainer, 'nl')} per maand voor merken die elke maand een drop uitbrengen, maar dat is een optie, geen standaard.`,
          },
          {
            q: 'Kan ik mijn btw-nummer toevoegen?',
            a: 'Ja. Je kunt het toevoegen bij het afrekenen — optioneel, en handig voor B2B-facturatie binnen de EU.',
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
          a: 'VISUAILS turns a folder of product photos into catalog sets, lifestyle carousels and video for a whole product line. The pipeline does the production at scale; a person checks every visual before it reaches you.',
        },
        {
          q: 'What is a drop?',
          a: `A drop is ${scope} products run as one job — one brief, one window, one invoice — with a catalog set and a lifestyle carousel for each. It is how a season's worth of product imagery gets made in one pass instead of product by product.`,
        },
        {
          q: 'What do I need to send you?',
          a: 'One clear photo per product and a short note on the look you want. That is it. Five minutes, whether it is one product or thirty — the effort does not scale with the size of the drop.',
        },
        {
          q: 'Can I try it before committing to a drop?',
          a: `Two ways. A ${sample.price} test sample on one of your own products, ${sample.unit} — it runs through the same pipeline as a paid order, so what you see is what you would get. Or a Drop Pilot: exactly ${PILOT_PRODUCTS} products at ${euro(AMOUNT.dropPilot, 'en')}, once per brand, to see what we do with your line before you hand us all of it.`,
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
          a: `${perProductById.catalog.name}. ${perProductById.catalog.line} Clean, consistent, built for shop listings and marketplaces. ${perProductById.lifestyle.name}. ${perProductById.lifestyle.line} A styled scene rather than a product on a background. A drop includes both for every product.`,
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
              cap: perProductById.catalog.name,
            },
            {
              src: '/img/lifestyle-glow-06.webp',
              alt: 'A lifestyle visual: a garment worn by a model in a styled location.',
              cap: perProductById.lifestyle.name,
            },
          ],
        },
        {
          q: 'Can I keep the same style and model across orders?',
          a: 'Yes, and that is most of the point. The same lighting, angle, grade and model can be held across a whole drop and across the drops that follow, so a catalog stays coherent as the line grows.',
        },
        {
          q: 'Can I have a model that is only mine?',
          a: 'Yes. Your Brand Model is a face built for your brand and used by no one else, kept consistent across every product and every drop. Every drop already includes a model from the standard library, so this is an upgrade rather than a requirement.',
          linkText: 'See Your Brand Model',
          linkHref: '/custom-models',
        },
        {
          q: 'Can I order over WhatsApp?',
          a: 'Always. Send the photos and a short brief and we take it from there. Same pipeline, same checks, same capacity rules — WhatsApp is a door, not a shortcut past anything.',
        },
      ],
    },
    {
      title: 'Delivery and the calendar',
      items: [
        {
          q: 'How fast is it?',
          a: `A drop gets ${turnaround('attended', 'en').toLowerCase()}. Individual products go through the standard queue: ${turnaround('unattended', 'en').toLowerCase()}, with no fixed delivery date.`,
        },
        {
          q: 'What if the week I need cannot be held?',
          a: 'Then we tell you that, before you pay, instead of giving you a date and hoping. A reserved window is confirmed against the calendar before it is offered — never after. A drop already in the calendar is never pushed to make room for a later one.',
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
          a: `We ask on every order whether you are happy with what you got. If you are not, tell us what is wrong and we go through it with you — what we agree depends on the problem. On a drop: ${aftercare('attended', 'en').toLowerCase()}, per image in the portal, so one image going back does not hold up the rest.`,
        },
        {
          q: 'How do I actually receive the files?',
          // The tier strings are noun phrases. Bare-appending "for a drop"
          // garden-paths ("…or request-revision for a drop"); the comma plus
          // a conditional clause keeps the qualifier unambiguous. The
          // strings themselves are never lowercased — one of them contains
          // "WhatsApp", which .toLowerCase() would mangle.
          a: `${TIERS.attended.delivery.en}, if you run a drop. ${TIERS.unattended.delivery.en}, if you order individual products. Either way they are high-resolution and e-commerce-ready, sized for shop listings, marketplaces and ads.`,
        },
      ],
    },
    {
      title: 'Pricing and payment',
      items: [
        {
          q: 'What does it cost?',
          html: `A Full Drop is <strong>${euro(AMOUNT.fullDrop, 'en')}</strong> for ${scope} products — ${perProduct} per product, catalog and lifestyle included for each. Individually: ${perProductById.catalog.name.toLowerCase()} ${perProductById.catalog.price} per product, ${perProductById.lifestyle.name.toLowerCase()} ${perProductById.lifestyle.price} per product, video ${perProductById.video.price} per clip. Full breakdown on the <a href="${localizedPath('en', '/pricing')}">pricing page</a>.`,
        },
        {
          q: 'Are there volume discounts?',
          a: `There are no stacked discount bands — the ladder is the volume answer. Ordering products individually is ${euro(AMOUNT.catalog + AMOUNT.lifestyle, 'en')} per product at drop scope; a Full Drop is ${perProduct} per product for the same work. The saving is in running them together, and it is on the pricing page rather than behind a negotiation.`,
        },
        {
          q: 'Is there a subscription?',
          a: `Not one you need. A drop is a one-off: one job, one invoice, no standing commitment. There is a studio retainer at ${euro(AMOUNT.retainer, 'en')} a month for brands shipping a drop every month, but it is an option, not the default.`,
        },
        {
          q: 'Can I add my VAT number?',
          a: 'Yes. You can add it at checkout — optional, and useful for B2B invoicing inside the EU.',
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
