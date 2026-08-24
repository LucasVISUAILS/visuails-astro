// VISUAILS — de velden die een factuur nodig heeft, in woorden.
//
// ── WAAROM DIT BESTAAT ──────────────────────────────────────────────────────
//
// Sinds 23 augustus 2026 is het merkmodel een bestelling met een bedrag, en dat
// betekent: een factuur, en dus een adres, een land en het bewijs dat de klant
// zakelijk is. Precies dezelfde zestien velden die stap 3 van de bestelstroom
// al uitvraagt.
//
// Die stroom draagt haar labels in `FORM` in OrderFlow.astro, een tabel van
// ruim vierhonderd regels die bij het bouwen wordt nagelopen op ontbrekende
// paden. Er staan drie dingen door elkaar in: de teksten van de vijf stappen,
// de foutmeldingen, en dit — de labels bij een factuuradres, die niets met de
// stappen te maken hebben en die elk formulier met een bedrag nodig heeft.
//
// Dit bestand is dat derde deel, apart, zodat een tweede formulier het kan
// gebruiken zonder de tabel van het eerste te hoeven openen.
//
// ── EN OrderFlow IS NIET OMGEBOUWD, MET OPZET ───────────────────────────────
//
// Dat zou de eerlijkste variant zijn: één bron, twee lezers. Het is hier niet
// gedaan omdat het vijftien stringliteralen vervangt in het formulier waar élke
// bestelling doorheen gaat, op de dag dat er ook een nieuw betaalpad bij komt.
// Twee veranderingen in één pad is hoe je later niet meer weet welke van de twee
// het was.
//
// Wat er dus staat: dezelfde WOORDEN op twee plekken, en nul REGELS op twee
// plekken. Dat verschil is het hele punt. Loopt de tekst hier ooit uiteen met
// die in OrderFlow, dan leest een klant twee keer een net iets ander label —
// vervelend, en verder niets. De voorwaarde wanneer een btw-nummer verplicht is,
// wanneer het registratienummer dat wordt en wanneer de verleggingsverklaring
// verschijnt, staat NIET in dit bestand en is nergens overgetypt: die komt uit
// src/data/business.js en src/data/vat.js, bij beide formulieren.
//
// Wie dit ooit samenvoegt: begin hier, laat OrderFlow deze tabel inlezen, en
// haal de literalen daar weg. Niet andersom.

export const BILLING = {
  en: {
    heading: 'You, and where the invoice goes',
    firstName: 'First name',
    firstErr: 'Add your first name — the invoice is made out to a person.',
    lastName: 'Last name',
    lastErr: 'Add your surname, so the invoice is made out properly.',
    brand: 'Brand',
    brandErr: 'Add the brand name this model is being made for.',
    website: 'Website',
    email: 'Email',
    emailErr: 'Add a full email address, like you@yourbrand.com — otherwise we cannot reply.',
    emailHint: 'Where the confirmation, the invoice and the directions go.',
    phone: 'Phone',
    street: 'Street and number',
    streetPh: 'Voorbeeldstraat 12',
    streetErr: 'An invoice needs an address on it.',
    street2: 'Addition',
    street2Ph: 'Unit, floor, c/o',
    postal: 'Postcode',
    postalPh: '1234 AB',
    postalErr: 'The postcode is missing.',
    city: 'City',
    cityErr: 'The town or city is missing.',
    country: 'Country',
    countryPick: 'Choose a country',
    countryEu: 'European Union',
    countryOther: 'Elsewhere',
    countryErr: 'We need the country for the invoice and the VAT.',
    region: 'State or province',
    regionHint: 'Only where an address needs one — most of Europe does not.',
    vat: 'VAT number',
    vatErr: 'Fill in your VAT number, or tick the box below if you do not have one.',
    vatHint: 'A business in another EU country: we check it against VIES, and if it is valid no Dutch VAT is charged.',
    noVat: 'I do not have a VAT number',
    vatConfirm: 'I confirm that my company is established outside the Netherlands and that this VAT number belongs to it.',
    vatConfirmHint: 'Required before we can invoice at 0%. The tax authority holds us liable for a reverse charge that turns out to be wrong, so this is the one thing we cannot decide for you.',
    reg: 'Registration number',
    regHint: 'A Dutch business: your KvK number. Elsewhere: whatever your country registers companies with.',
    regErr: 'Add a registration number, so we can see this is a business.',
    optional: 'optional',
  },
  nl: {
    heading: 'Jij, en waar de factuur heen gaat',
    firstName: 'Voornaam',
    firstErr: 'Vul je voornaam in — de factuur staat op naam van een persoon.',
    lastName: 'Achternaam',
    lastErr: 'Vul je achternaam in, dan staat de factuur netjes op naam.',
    brand: 'Merk',
    brandErr: 'Vul de merknaam in waarvoor dit model gemaakt wordt.',
    website: 'Website',
    email: 'E-mail',
    emailErr: 'Vul een volledig e-mailadres in, zoals jij@jouwmerk.nl — anders kunnen we niet antwoorden.',
    emailHint: 'Hier komen de bevestiging, de factuur en de richtingen binnen.',
    phone: 'Telefoon',
    street: 'Straat en huisnummer',
    streetPh: 'Voorbeeldstraat 12',
    streetErr: 'Op een factuur hoort een adres te staan.',
    street2: 'Toevoeging',
    street2Ph: 'Unit, verdieping, t.a.v.',
    postal: 'Postcode',
    postalPh: '1234 AB',
    postalErr: 'De postcode ontbreekt.',
    city: 'Plaats',
    cityErr: 'De plaatsnaam ontbreekt.',
    country: 'Land',
    countryPick: 'Kies een land',
    countryEu: 'Europese Unie',
    countryOther: 'Elders',
    countryErr: 'We hebben het land nodig voor de factuur en de btw.',
    region: 'Provincie of staat',
    regionHint: 'Alleen waar een adres er een heeft — in het grootste deel van Europa niet.',
    vat: 'Btw-nummer',
    vatErr: 'Vul je btw-nummer in, of vink hieronder aan dat je er geen hebt.',
    vatHint: 'Een bedrijf in een ander EU-land: we controleren het bij VIES, en klopt het, dan rekenen we geen Nederlandse btw.',
    noVat: 'Ik heb geen btw-nummer',
    vatConfirm: 'Ik bevestig dat mijn onderneming buiten Nederland is gevestigd en dat dit btw-nummer van haar is.',
    vatConfirmHint: 'Nodig voordat we op 0% mogen factureren. Bij een verlegging die achteraf niet klopt komt de naheffing bij ons, dus dit is het ene dat we niet voor je kunnen invullen.',
    reg: 'Registratienummer',
    regHint: 'Een Nederlands bedrijf: je KVK-nummer. Daarbuiten: waar jouw land bedrijven mee registreert.',
    regErr: 'Vul een registratienummer in, dan kunnen we zien dat dit zakelijk is.',
    optional: 'optioneel',
  },
};

/** De tabel in de taal van de lezer. */
export function billingCopy(lang = 'en') {
  return BILLING[lang === 'nl' ? 'nl' : 'en'];
}
