/*
 * ═══════════════════════════════════════════════════════════════════════════════
 * WANNEER IS DIT JURIDISCHE DOCUMENT VOOR HET LAATST BIJGEWERKT
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Vijf documenten, twee talen, en tot 3 september 2026 stond de datum tien keer met de
 * hand uitgetypt: "Last updated: August 2026" en "Laatst bijgewerkt: augustus 2026",
 * verspreid over vier paginabestanden en één component.
 *
 * De fout die dat oplevert is niet theoretisch — hij stond er al. /terms kreeg op
 * 2 september een nieuwe paragraaf 8 (de niet-exclusieve licentie op de gedeelde
 * maandset) en /ai-act een gecorrigeerde IPTC-waarde in paragraaf 6. Allebei
 * bleven "augustus 2026" zeggen. Bij een marketingpagina is een verkeerde datum
 * slordig; bij voorwaarden is het de regel waaraan een klant afleest wélke versie hij
 * heeft geaccepteerd.
 *
 * ── WAAROM DIT NIET UIT GIT KOMT ───────────────────────────────────────────
 *
 * scripts/gewijzigd-op.mjs haalt de `dateModified` van élke pagina uit de
 * geschiedenis, automatisch, en de verleiding is om dat hier ook te doen. Niet doen.
 * Die datum zegt "aan dit bestand is iets veranderd" en dat is precies niet wat een
 * juridisch document beweert. "Laatst bijgewerkt" is een uitspraak OVER DE TEKST, en
 * of een wijziging de tekst raakt of alleen een klassenaam, weet git niet.
 *
 * Dus blijft dit een besluit van een mens, met één bron in plaats van tien, en met
 * een bewaker eromheen: tests/juridische-datums.test.mjs vergelijkt elke datum
 * hieronder met de maand waarin git het document voor het laatst zag veranderen. Is
 * git nieuwer, dan valt de toets om met de naam van het document erbij. Zo blijft het
 * een keuze en kan hij toch niet stil verouderen.
 *
 * ── BIJWERKEN ──────────────────────────────────────────────────────────────
 *
 * Verander je de tekst van een document, zet dan de maand hieronder op de maand
 * waarin je het commit. Alleen de maand: dat is ook wat er op de pagina staat, en een
 * dagnauwkeurige waarde die als maand wordt afgedrukt is nauwkeurigheid die niemand
 * ziet en die je wel elke keer moet bijhouden.
 */

/** Per document de maand van de laatste inhoudelijke wijziging, als 'JJJJ-MM'. */
export const LAATST_BIJGEWERKT = {
  terms: '2026-09',
  privacy: '2026-09',
  'cookie-policy': '2026-09',
  'data-processing-agreement': '2026-09',
  'ai-act': '2026-09',
};

const MAANDEN = {
  en: ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'],
  // Nederlandse maandnamen zijn klein, ook aan het begin van een naam — zie
  // SCHRIJFWIJZER.md. "augustus 2026", niet "Augustus 2026".
  nl: ['januari', 'februari', 'maart', 'april', 'mei', 'juni',
    'juli', 'augustus', 'september', 'oktober', 'november', 'december'],
};

const VOORVOEGSEL = { en: 'Last updated', nl: 'Laatst bijgewerkt' };

/**
 * De regel zoals hij op de pagina komt te staan: "Last updated: September 2026".
 *
 * @param doc   sleutel uit LAATST_BIJGEWERKT
 * @param lang  'en' | 'nl'
 * @param achtervoegsel  optionele toevoeging achter een punt-scheiding, zoals
 *                       "Article 28 GDPR" bij de verwerkersovereenkomst.
 */
export function bijgewerktOp(doc, lang = 'en', achtervoegsel = '') {
  const l = lang === 'nl' ? 'nl' : 'en';
  const waarde = LAATST_BIJGEWERKT[doc];
  if (!waarde) throw new Error(`juridischeDatums: onbekend document "${doc}"`);
  const [jaar, maand] = waarde.split('-');
  const naam = MAANDEN[l][Number(maand) - 1];
  const kern = `${VOORVOEGSEL[l]}: ${naam} ${jaar}`;
  return achtervoegsel ? `${kern} · ${achtervoegsel}` : kern;
}

export default bijgewerktOp;
