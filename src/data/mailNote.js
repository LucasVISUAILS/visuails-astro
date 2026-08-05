// VISUAILS — the one sentence that follows every "we've emailed you", August 2026.
//
// Lucas: *"bij de orderbevestiging op de site wil ik graag 'check je spam' voor
// de zekerheid toevoegen om misverstanden te voorkomen voor als dit weer
// gebeurt. Dit wil ik bij elke keer een klant een scherm krijgt met een
// mailbevestiging, dus ook wanneer hij inlogt."*
//
// WHY IT IS A MODULE AND NOT FOUR PARAGRAPHS.
//
// This sentence has to appear on screens rendered by three different systems:
// the Astro pages (/thank-you), the account worker (src/lib/account.js, the
// "check your email" screen after requesting a sign-in link) and the order
// portal (src/lib/portal.js, the screen a visitor lands on without a link).
// Written by hand in each, it would be four sentences that agree today. The
// footer wordmark, the delivery promise and the review claim have all drifted
// that way in this codebase already — every one of them now reads from one
// source, and this is that source for this sentence.
//
// WHAT IT SAYS, AND WHY THE SECOND HALF MATTERS MORE THAN THE FIRST.
//
// "Check your spam" tells a customer where to look once. "Mark it as safe"
// tells their mail provider where to put the next one, which is the difference
// between solving this evening's confusion and solving it for the rest of the
// relationship — the delivery mail, the approval request and every future
// sign-in link ride on the same reputation. A customer who moves one message
// out of junk has taught Gmail more than any DNS record can.
//
// It does NOT apologise and does not say "sometimes our emails end up in
// spam". A sender who volunteers that is a sender the reader starts to doubt.
// The framing is a check the customer runs, not a defect we are confessing to.

const NOTE = {
  en: 'Nothing after a few minutes? Look in your spam or junk folder — and mark it as safe, so the next one lands in your inbox.',
  nl: 'Na een paar minuten nog niets? Kijk in je spam- of ongewenste-mailmap — en markeer hem als veilig, dan komt de volgende gewoon binnen.',
};

/** @param {'en'|'nl'} lang */
export function mailNote(lang) {
  return NOTE[lang] || NOTE.en;
}
