/*
 * ═══════════════════════════════════════════════════════════════════════════════
 * HET SALDO EN HET CREDITBOEK ALS WOORDEN — 8 oktober 2026 (punten 2.07 en 2.02)
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Eén weergave voor twee schermen: de abonnementspagina in Studio
 * (/account/plan, Astro) en de klantpagina in /admin (HTML-tekst). Lucas en de
 * klant kijken zo naar dezelfde lijst, met dezelfde zinnen (2.07: "In /admin
 * staat dezelfde weergave in plaats van 'abonnementsweek'"). /admin leest de
 * Nederlandse.
 *
 * De getallen komen uit creditSaldo() en creditboek() in creditboek.js; hier
 * worden het alleen woorden. De vertaling in producten ("genoeg voor 18
 * catalogsets of 14 carrousels") komt uit creditKaart.js (6.01), zodat /plans,
 * stap 5 en Studio hetzelfde zeggen. De geldigheid uit CREDITS_GELDIG_MAANDEN.
 *
 * TWEE WOORDEN DIE NOOIT WISSELEN (2.02): "credits" is een getal zonder euro;
 * "tegoed" (EN "account balance") is geld. Dit bestand gaat alleen over credits.
 *
 * Geen DOM, geen database.
 */
import { CREDITS_GELDIG_MAANDEN, SERVICE_CREDITS } from '../data/pricing.js';
import { creditVertaling } from '../data/creditKaart.js';

const T = {
  nl: {
    heb: (n) => (n === 1 ? 'Je hebt 1 credit' : `Je hebt ${n} credits`),
    geen: 'Je hebt geen credits',
    genoeg: (v) => `Genoeg voor ${v}.`,
    teWeinig: (k) => `Niet genoeg voor een catalogset (${k} credits). Bestel je toch, dan betaal je die bestelling gewoon via Mollie.`,
    /* ── ÉÉN SOORT DATUM — 14 oktober 2026 (doorloop 27, B21) ─────────────────
       Op dezelfde Studio-pagina stond "geldig tot en met 13 januari" (saldo) en
       "vervalt op 14 januari" (creditboek, bijgekocht): dezelfde grens, twee
       datums. Nu overal "geldig tot en met" de dag ervóór (dagErvoor), zoals de
       mails en de bijkoopbevestiging het al zeiden. */
    eersteOp: (n, d) => `${n} hiervan ${n === 1 ? 'blijft' : 'blijven'} geldig tot en met ${d} — die gaan als eerste op.`,
    daarna: (n, d) => `Daarna ${n === 1 ? 'blijft er nog 1' : `blijven er nog ${n}`} geldig tot en met ${d}.`,
    /* Het spaarplafond (12 oktober 2026). */
    spaar: (p) => `(je kunt er ${p} sparen)`,
    boven: (d, n, eraf) => `Op ${d} komen er ${n} bij: gebruik er vóór die dag ${eraf}, anders vallen ze weg.`,
    totEnMet: (d) => `Je credits blijven geldig tot en met ${d}.`,
    totEnMetDelen: (delen) => `${delen.map(([n, d], i) => (i === 0 ? `${n} credits blijven geldig tot en met ${d}` : `${n} tot en met ${d}`)).join(', ')}.`,
    /* Extra credits bijkopen (12 oktober 2026). */
    bijgekocht: (n, delen) => `Waarvan ${n} bijgekocht: die gaan als eerste op en tellen niet mee voor je spaarplafond; ${delen.length === 1 ? `ze blijven geldig tot en met ${delen[0][1]}` : delen.map(([k, d], i) => (i === 0 ? `${k} blijven geldig tot en met ${d}` : `${k} tot en met ${d}`)).join(', ')}.`,
    nieuw: (d, n) => `Op ${d} komen er ${n} bij.`,
    bevroren: (n) => `${n} ${n === 1 ? 'credit staat' : 'credits staan'} vast: een betaling van je abonnement is via de bank teruggeboekt. Ze komen weer vrij zodra dat is opgelost.`,
    geldig: (m) => `Zolang je abonnement loopt, vervallen je credits niet; je kunt tot ${m} maanden aan credits sparen. Pauzeer of stop je, dan blijven ze geldig tot ${m} maanden na je laatste termijn.`,
    termijn: (m) => (m ? `Credits voor ${m}` : 'Credits van je abonnement'),
    bestelling: 'Bestelling',
    annulering: 'Terug na annuleren',
    nietGemaakt: 'Terug: niet gemaakt',
    bijstelling: 'Correctie door VISUAILS',
    terugbetaald: 'Vervallen: termijn terugbetaald',
    verbruikt: 'Gebruikt vóór dit overzicht',
    vervallen: (m) => (m ? `Vervallen: credits van ${m}` : 'Vervallen'),
    bevrorenRegel: 'Vast: betaling teruggeboekt',
    vrijRegel: 'Weer vrij: terugboeking ongedaan',
    plafondRegel: 'Vervallen: boven je spaarplafond',
    bijgekochtRegel: 'Extra credits bijgekocht',
    onbekend: 'Credits',
    geldigTot: (d) => `geldig tot en met ${d}`,
    status: {
      received: 'Ontvangen', in_production: 'In productie', human_check: 'Wordt nagekeken',
      delivered: 'Geleverd', cancelled: 'Geannuleerd',
    },
    afgerond: 'Afgerond',
  },
  en: {
    heb: (n) => (n === 1 ? 'You have 1 credit' : `You have ${n} credits`),
    geen: 'You have no credits',
    genoeg: (v) => `Enough for ${v}.`,
    teWeinig: (k) => `Not enough for a catalog set (${k} credits). If you order anyway, you simply pay for that order through Mollie.`,
    eersteOp: (n, d) => `${n} of these ${n === 1 ? 'stays' : 'stay'} valid up to and including ${d} — they are used first.`,
    daarna: (n, d) => `After that, ${n} more ${n === 1 ? 'stays' : 'stay'} valid up to and including ${d}.`,
    spaar: (p) => `(you can save up to ${p})`,
    boven: (d, n, eraf) => `On ${d}, ${n} more come in: use ${eraf} before that day, or they lapse.`,
    totEnMet: (d) => `Your credits stay valid up to and including ${d}.`,
    totEnMetDelen: (delen) => `${delen.map(([n, d], i) => (i === 0 ? `${n} credits stay valid up to and including ${d}` : `${n} up to and including ${d}`)).join(', ')}.`,
    bijgekocht: (n, delen) => `Of these, ${n} were bought: they are used first and do not count towards your savings limit; ${delen.length === 1 ? `they stay valid up to and including ${delen[0][1]}` : delen.map(([k, d], i) => (i === 0 ? `${k} stay valid up to and including ${d}` : `${k} up to and including ${d}`)).join(', ')}.`,
    nieuw: (d, n) => `On ${d}, ${n} more come in.`,
    bevroren: (n) => `${n} ${n === 1 ? 'credit is' : 'credits are'} on hold: a payment for your plan was reversed by the bank. They are released as soon as that is resolved.`,
    geldig: (m) => `While your plan runs, your credits do not expire; you can save up to ${m} months of them. If you pause or stop, they stay valid until ${m} months after your last monthly credits came in.`,
    termijn: (m) => (m ? `Credits for ${m}` : 'Credits from your plan'),
    bestelling: 'Order',
    annulering: 'Back after cancelling',
    nietGemaakt: 'Back: could not be made',
    bijstelling: 'Adjustment by VISUAILS',
    terugbetaald: 'Expired: payment refunded',
    verbruikt: 'Used before this overview',
    vervallen: (m) => (m ? `Expired: credits from ${m}` : 'Expired'),
    bevrorenRegel: 'On hold: payment reversed',
    vrijRegel: 'Released: reversal undone',
    plafondRegel: 'Lapsed: above your savings limit',
    bijgekochtRegel: 'Extra credits bought',
    onbekend: 'Credits',
    geldigTot: (d) => `valid up to and including ${d}`,
    status: {
      received: 'Received', in_production: 'In production', human_check: 'Being checked',
      delivered: 'Delivered', cancelled: 'Cancelled',
    },
    afgerond: 'Completed',
  },
};

const taal = (lang) => (lang === 'en' ? 'en' : 'nl');
const heel = (n) => Math.max(0, Math.floor(Number(n) || 0));

const MAANDEN = {
  nl: ['januari', 'februari', 'maart', 'april', 'mei', 'juni', 'juli', 'augustus', 'september', 'oktober', 'november', 'december'],
  en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
};
const KORT = {
  nl: ['jan', 'feb', 'mrt', 'apr', 'mei', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec'],
  en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
};

/** "31 oktober" (met jaartal als het niet dit jaar is). */
export function datumLang(iso, lang = 'nl', nu = new Date()) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso || ''));
  if (!m) return '';
  const L = taal(lang);
  const dag = Number(m[3]);
  const maand = MAANDEN[L][Number(m[2]) - 1];
  const jaar = Number(m[1]) !== nu.getUTCFullYear() ? ` ${m[1]}` : '';
  return L === 'en' ? `${dag} ${maand}${jaar}` : `${dag} ${maand}${jaar}`;
}

/** "12 okt" voor een regel in het boek (met jaartal als het niet dit jaar is). */
function datumKort(iso, L, nu) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso || ''));
  if (!m) return '';
  const jaar = Number(m[1]) !== nu.getUTCFullYear() ? ` ${m[1]}` : '';
  return `${Number(m[3])} ${KORT[L][Number(m[2]) - 1]}${jaar}`;
}

/** "oktober" uit 'YYYY-MM'. */
function maandNaam(maand, L) {
  const m = /^\d{4}-(\d{2})/.exec(String(maand || ''));
  return m ? MAANDEN[L][Number(m[1]) - 1] : '';
}

/** Dagen tussen vandaag en een datum (UTC). */
function dagenTot(iso, nu) {
  const t = Date.parse(`${String(iso).slice(0, 10)}T00:00:00Z`);
  const v = Date.parse(`${nu.toISOString().slice(0, 10)}T00:00:00Z`);
  return Number.isFinite(t) ? Math.round((t - v) / 864e5) : Infinity;
}

/** Binnen zoveel dagen heet een vervaldatum "binnenkort" (een eigen kleur op het scherm). */
export const BIJNA_DAGEN = 14;

/** De dag vóór een datum: "vervalt op 8 april" is "geldig tot en met 7 april". */
export function dagErvoor(iso) {
  const t = Date.parse(`${String(iso).slice(0, 10)}T00:00:00Z`);
  return Number.isFinite(t) ? new Date(t - 864e5).toISOString().slice(0, 10) : '';
}

/**
 * Het saldo in zinnen, van boven naar beneden zoals de pagina het zet.
 *
 * HET SPAARPLAFOND (12 oktober 2026). Bij een lopend abonnement noemt de
 * weergave geen vervaldatum van de abonnementscredits meer (die schuift bij
 * elke termijn op), maar het plafond en wat er bij de volgende termijn boven
 * het plafond zou vervallen:
 *   "Je hebt 356 credits (je kunt er 360 sparen). Op 8 februari komen er 120
 *    bij: gebruik er vóór die dag 116, anders vallen ze weg."
 * Zonder volgende termijn (pauze, stop, het jaar is op) één datum:
 *   "Je credits blijven geldig tot en met 7 april."
 * De zin van 11 oktober ("De rest vervalt later, in stappen") is weg: de
 * datums die echt gelden (creditSaldo().echteDatums) worden elk genoemd.
 *
 * @param {object} s  creditSaldo()
 * @returns {{ getal, kop, spaar, zin, vertaling, eerst, rest, nieuw, boven, bijgekocht, bevroren, geldig, weinig, leeg, bijna, vervaltEerst }}
 *   bijgekocht  "Waarvan 25 bijgekocht: die gaan als eerste op …" (12 oktober 2026), anders ''
 *   spaar    "(je kunt er 360 sparen)" bij een lopend abonnement, anders ''
 *   zin      kop en spaar samen, als één zin met punt (strook, /admin)
 *   eerst    de datum(s) die echt gelden, of '' bij een lopend abonnement zonder
 *   rest     bij een lopend abonnement met oude partijen: de datums daarna
 *   nieuw    "Op … komen er 120 bij." of, boven het plafond, de zin met "gebruik er vóór die dag …"
 *   boven    wat er bij de volgende termijn zou vervallen (een getal, 0 als niets)
 */
export function saldoWeergave(s, lang = 'nl', nu = new Date()) {
  const L = taal(lang);
  const t = T[L];
  const n = heel(s?.saldo);
  /* `echteDatums` sinds 12 oktober 2026; een oudere aanroep (alleen `vervalt`)
     krijgt die als echte datums. */
  const datums = Array.isArray(s?.echteDatums) ? s.echteDatums : (Array.isArray(s?.vervalt) ? s.vervalt : []);
  const loopt = !!(s?.nieuw?.op && s?.nieuw?.aantal);
  const plafond = loopt && heel(s?.plafond) ? heel(s.plafond) : 0;
  const boven = loopt && s?.boven ? heel(s.boven.aantal) : 0;
  const uit = {
    getal: n,
    kop: n ? t.heb(n) : t.geen,
    spaar: plafond ? t.spaar(plafond) : '',
    zin: '',
    vertaling: '',
    eerst: '',
    rest: '',
    nieuw: loopt
      ? (boven ? t.boven(datumLang(s.nieuw.op, L, nu), heel(s.nieuw.aantal), boven) : t.nieuw(datumLang(s.nieuw.op, L, nu), heel(s.nieuw.aantal)))
      : '',
    boven,
    bijgekocht: '',
    bevroren: heel(s?.bevroren) ? t.bevroren(heel(s.bevroren)) : '',
    /* Alleen zolang het abonnement loopt (doorloop 15 oktober 2026): bij een pauze of
       na opzeggen zegt het blok erboven al hoe lang je credits geldig blijven, en
       "zolang je abonnement loopt … je kunt sparen" klopt dan niet meer. */
    geldig: loopt ? t.geldig(CREDITS_GELDIG_MAANDEN) : '',
    weinig: n > 0 && n < SERVICE_CREDITS.catalog,
    leeg: n === 0,
    bijna: false,
    vervaltEerst: datums[0] || null,
  };
  uit.zin = `${uit.kop}${uit.spaar ? ` ${uit.spaar}` : ''}.`;
  if (n >= SERVICE_CREDITS.catalog) uit.vertaling = t.genoeg(creditVertaling(n, L));
  else if (n > 0) uit.vertaling = t.teWeinig(SERVICE_CREDITS.catalog);
  if (n && datums.length) {
    if (loopt) {
      /* Een lopend abonnement met partijen die vóór de volgende termijn
         vervallen (van vóór het plafond): die gaan als eerste op. */
      uit.eerst = t.eersteOp(heel(datums[0].aantal), datumLang(dagErvoor(datums[0].op), L, nu));
      uit.rest = datums.slice(1).map((v) => t.daarna(heel(v.aantal), datumLang(dagErvoor(v.op), L, nu))).join(' ');
    } else if (datums.length === 1) {
      uit.eerst = t.totEnMet(datumLang(dagErvoor(datums[0].op), L, nu));
    } else {
      uit.eerst = t.totEnMetDelen(datums.map((v) => [heel(v.aantal), datumLang(dagErvoor(v.op), L, nu)]));
    }
  }
  /* Bijgekochte credits (12 oktober 2026): eigen datum, eerst op, buiten het
     plafond — in één zin onder het saldo. */
  const bij = s?.bijgekocht && heel(s.bijgekocht.saldo) ? s.bijgekocht : null;
  if (bij && Array.isArray(bij.vervalt) && bij.vervalt.length) {
    uit.bijgekocht = t.bijgekocht(heel(bij.saldo), bij.vervalt.map((v) => [heel(v.aantal), datumLang(dagErvoor(v.op), L, nu)]));
  }
  uit.bijna = !!((datums[0] && n && dagenTot(datums[0].op, nu) <= BIJNA_DAGEN)
    || (boven && dagenTot(s.nieuw.op, nu) <= BIJNA_DAGEN));
  return uit;
}

/**
 * De zin bij credits die terugkomen (annuleren, "niet gemaakt"), voor de
 * tijdlijn van de bestelling en de annuleringsmail. `r` is de uitkomst van
 * creditsTerugVoorBestelling(): { aantal, vervaltOp, loopt, boven }.
 *   lopend abonnement: "48 credits staan weer op je saldo." en, als de volgende
 *                      termijn daardoor boven het plafond komt, de zin
 *                      "Op … komen er 120 bij: gebruik er vóór die dag …"
 *   anders:            "48 credits staan weer op je saldo, geldig tot en met …"
 */
export function terugZin(r, lang = 'nl', nu = new Date()) {
  const L = taal(lang);
  const n = heel(r?.aantal);
  if (!n) return '';
  const b = r?.loopt && r?.boven && heel(r.boven.aantal) ? r.boven : null;
  const extra = b ? ` ${T[L].boven(datumLang(b.op, L, nu), heel(b.nieuw), heel(b.aantal))}` : '';
  if (L === 'en') {
    return r?.loopt || !r?.vervaltOp
      ? `${n} credits are back on your balance.${extra}`
      : `${n} credits are back on your balance, valid up to and including ${datumLang(dagErvoor(r.vervaltOp), L, nu)}.`;
  }
  return r?.loopt || !r?.vervaltOp
    ? `${n} credits staan weer op je saldo.${extra}`
    : `${n} credits staan weer op je saldo, geldig tot en met ${datumLang(dagErvoor(r.vervaltOp), L, nu)}.`;
}

/**
 * Het creditboek als regels voor een tabel, nieuwste eerst.
 *
 * @param {object[]} regels  creditboek()
 * @param {object} opts
 *   lang, nu
 *   orderHref(regel) → de link naar de bestelling (Studio en /admin verschillen)
 *   afgerond(orderId) → true als de bestelling is afgerond (optioneel)
 *   eerst            hoeveel regels er open staan; de rest gaat onder "Eerdere regels"
 *   loopt            de dag van de volgende termijn (creditSaldo().nieuw.op): dan
 *                    staat er bij de credits van het abonnement geen "vervalt
 *                    op …", want die datum schuift bij elke termijn op
 *                    (spaarplafond, 12 oktober 2026)
 * @returns {{ regels: object[], eerder: object[], leeg: boolean }}
 *   elke regel: { dag, datum, wat, ref, href, status: { key, tekst } | null,
 *                 toelichting, aantal, teken: '+'|'−', plus, saldoNa, geldig, reden }
 */
export function boekWeergave(regels, { lang = 'nl', nu = new Date(), orderHref = null, eerst = 12, loopt = false } = {}) {
  const L = taal(lang);
  const t = T[L];
  const vandaag = nu.toISOString().slice(0, 10);
  const lijst = (Array.isArray(regels) ? regels : []).slice().reverse().map((r) => {
    const plus = Number(r.aantal) > 0;
    const m = maandNaam(r.maand, L);
    let wat;
    switch (r.reden) {
      case 'termijn': wat = t.termijn(m); break;
      case 'bestelling': wat = t.bestelling; break;
      case 'annulering': wat = t.annulering; break;
      case 'niet-gemaakt': wat = t.nietGemaakt; break;
      case 'bijstelling': wat = t.bijstelling; break;
      case 'terugbetaald': wat = t.terugbetaald; break;
      case 'verbruikt': wat = t.verbruikt; break;
      case 'vervallen': wat = t.vervallen(m); break;
      case 'bevroren': wat = t.bevrorenRegel; break;
      case 'vrijgegeven': wat = t.vrijRegel; break;
      case 'plafond': wat = t.plafondRegel; break;
      case 'bijgekocht': wat = t.bijgekochtRegel; break;
      default: wat = t.onbekend;
    }
    const status = r.orderId && r.orderStatus
      ? { key: r.orderStatus, tekst: t.status[r.orderStatus] || r.orderStatus }
      : null;
    /* Bij een + regel die nog iets bevat: tot wanneer (6.03 — "bij elke regel"). */
    /* `loopt` is de dag van de volgende termijn (of true): wat daarna pas
       vervalt, schuift op die dag mee en krijgt geen datum. */
    const schuiftOp = !!loopt && r.soort !== 'bijgekocht' && (typeof loopt !== 'string' || String(r.vervaltOp) > loopt);
    const geldig = plus && !schuiftOp && r.vervaltOp && heel(r.rest) > 0 && String(r.vervaltOp) > vandaag
      ? t.geldigTot(datumLang(dagErvoor(r.vervaltOp), L, nu)) : '';
    return {
      reden: r.reden,
      datum: r.dag,
      dag: datumKort(r.dag, L, nu),
      wat,
      ref: r.orderRef || '',
      href: r.orderId && typeof orderHref === 'function' ? orderHref(r) : '',
      status,
      /* Een correctie draagt altijd een reden (6.08); bij andere regels alleen voor /admin interessant. */
      toelichting: r.reden === 'bijstelling' ? (r.toelichting || '') : '',
      aantal: `${plus ? '+' : '−'}${Math.abs(Number(r.aantal) || 0)}`,
      plus,
      saldoNa: Number(r.saldoNa) || 0,
      geldig,
    };
  });
  const k = Math.max(1, heel(eerst));
  return { regels: lijst.slice(0, k), eerder: lijst.slice(k), leeg: lijst.length === 0 };
}

/** De koppen van de tabel (Studio en /admin gelijk). */
export function boekKoppen(lang = 'nl') {
  return taal(lang) === 'en'
    ? { datum: 'Date', wat: 'What', credits: 'Credits', saldo: 'Balance', eerder: 'Earlier entries', leeg: 'No entries yet. Credits come in with each paid month.' }
    : { datum: 'Datum', wat: 'Wat', credits: 'Credits', saldo: 'Saldo', eerder: 'Eerdere regels', leeg: 'Nog geen regels. Credits komen erbij met elke betaalde maand.' };
}
