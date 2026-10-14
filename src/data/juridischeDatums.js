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
  /* Oktober 2026 (8 oktober, ronde B): §9a over het abonnement is inhoudelijk
     gewijzigd — bestellen met credits via het gewone formulier, twee termijnen,
     credits 3 maanden geldig, geen vaste week. Een nieuwe abonnee aanvaardt de
     tekst van deze maand.
     11 oktober 2026 (w2 = b): §10 zegt dat een stil afgeronde levering als
     aanvaard geldt en dat wij een afgeronde bestelling in overleg weer kunnen
     openen (de tekst staat in REVISIEBELEID, src/data/pricing.js). En §5 kreeg
     de alinea "Als een gezicht op een bestaand persoon lijkt" (o22, portretrecht).
     12 oktober 2026 (afvinklijst 4, ab-v1 = c, ab-v2 = a): §9a kreeg het
     spaarplafond — zolang het abonnement loopt vervalt er niets, hoogstens 3
     maanden aan credits, na pauze of opzeggen geldig tot 3 maanden na de
     laatste termijn.
     14 oktober 2026 (afvinklijst 23): de lifestylecarrousel in de prijslijst is
     vier foto's in plaats van drie (zelfde prijs).
     Nog steeds oktober, dus de waarde blijft staan. */
  terms: '2026-10',
  /* 11 oktober 2026 (afvinklijst 2): privacy §5/§6 en verwerkersovereenkomst §8/§12
     inhoudelijk gewijzigd — ByteDance via Magnific, meldtermijn 14 dagen, eigen
     kopieën zolang het account bestaat, geleverde beelden zonder einddatum in het
     archief, back-ups "uiterlijk na N weken", mail en WhatsApp 2 jaar. Nog steeds
     oktober, dus de maand blijft staan. */
  privacy: '2026-10',
  'cookie-policy': '2026-10',
  'data-processing-agreement': '2026-10',
  /* Oktober 2026: paragraaf 4 (welke foto's verplicht zijn: voorkant, achterkant
     én één close-up; de draagfoto optioneel) en paragraaf 6 ("controle door een
     specialist", "AI-model" in de IPTC-uitleg) zijn inhoudelijk gewijzigd.
     11 oktober 2026 (kiptc = a): de markering noemt nu de waarde
     trainedAlgorithmicMedia, en video's doen mee. */
  'ai-act': '2026-10',
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

/* ── WETTELIJKE DATUMS UIT DE AI-VERORDENING — 8 oktober 2026 ──────────────────
 *
 * /ai-act noemde drie datums met de hand: 20 juli 2026, 2 augustus 2026 en
 * 2 december 2026. De doorlichting van oktober kon ze niet controleren, en een
 * datum die op een juridische pagina staat zonder dat iemand weet waar hij
 * vandaan komt, is precies de soort zin die stil verkeerd wordt als de wet
 * verandert. Dat gebeurde dit jaar al één keer: de Digital Omnibus on AI
 * (Verordening (EU) 2026/1744, Publicatieblad 24 juli 2026) voegde de
 * overgangstermijn van 2 december 2026 in.
 *
 * Daarom staan ze hier, elk met de officiële bron waar ze op 8 oktober 2026 zijn
 * nagelezen. Een pagina die een van deze datums noemt, leest hem via wetDatum();
 * tests/juridische-datums.test.mjs houdt AiActPage.astro vrij van uitgetypte
 * datums. Verandert een datum, dan verandert hij hier, met de bron erbij.
 *
 *   art50Geldt       — art. 113 Verordening (EU) 2024/1689: artikel 50 geldt
 *                      vanaf 2 augustus 2026. Bevestigd door de Commissie:
 *                      digital-strategy.ec.europa.eu/policies/guidelines-transparency-ai-generated-content
 *   markeringTot     — art. 111 lid 4 (nieuw, ingevoegd door Verordening (EU)
 *                      2026/1744): aanbieders van generatieve AI-systemen die vóór
 *                      2 augustus 2026 op de markt waren, voldoen uiterlijk
 *                      2 december 2026 aan art. 50 lid 2. Tekst op
 *                      ai-act-service-desk.ec.europa.eu/en/ai-act/article-111;
 *                      ook in persbericht IP/26/1653 van de Commissie.
 *   richtsnoeren     — de Commissierichtsnoeren over artikel 50, gepubliceerd
 *                      20 juli 2026: digital-strategy.ec.europa.eu/en/library/
 *                      guidelines-transparency-obligations-providers-and-deployers-ai-systems
 */
export const WET_DATUMS = {
  art50Geldt: '2026-08-02',
  markeringTot: '2026-12-02',
  richtsnoeren: '2026-07-20',
};

/**
 * Een wettelijke datum zoals hij in lopende tekst staat: "2 augustus 2026" of
 * "2 August 2026", met een harde spatie na de dag. Werpt bij een onbekende sleutel, om dezelfde reden als
 * bijgewerktOp(): liever een kapotte bouw dan een lege plek in een juridische zin.
 */
export function wetDatum(sleutel, lang = 'en') {
  const l = lang === 'nl' ? 'nl' : 'en';
  const waarde = WET_DATUMS[sleutel];
  if (!waarde) throw new Error(`juridischeDatums: onbekende wettelijke datum "${sleutel}"`);
  const [jaar, maand, dag] = waarde.split('-');
  /* Een harde spatie tussen dag en maand: "tot 2 / december 2026" brak op een
     telefoon precies daar af (gemeten op 375 px, 8 oktober 2026). */
  return `${Number(dag)}\u00a0${MAANDEN[l][Number(maand) - 1]} ${jaar}`;
}

export default bijgewerktOp;
