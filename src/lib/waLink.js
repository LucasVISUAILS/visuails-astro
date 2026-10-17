/*
 * ═══════════════════════════════════════════════════════════════════════════════
 * DE KLANT BEREIKEN OP VIJF MOMENTEN — 8 oktober 2026 (punt 7.05, V26 = b)
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Eén functie, waLink(moment, bestelling), maakt een wa.me-link met het nummer
 * van de klant en een vaste tekst in de taal van de bestelling. Lucas drukt zelf
 * op verzenden; er gaat nooit iets vanzelf.
 *
 * VIJF MOMENTEN, EN NERGENS ANDERS:
 *   betaling   de betaling staat open (zijkolom "wacht op betaling", bestelpagina,
 *              studiomail "Betaling niet gelukt")
 *   fotos      er ontbreken foto's (het blok "foto's ontbreken" in /admin, de
 *              studiomail van een nieuwe bestelling)
 *   bounce     een mail kwam niet aan (bestelpagina)
 *   incasso    een abonnementsincasso mislukte (studiomail "Incasso niet gelukt")
 *   review     een afgeronde bestelling: vraag om een review (3.06)
 * En sinds ronde B (8 oktober 2026) twee die Lucas zelf vroeg:
 *   credits      de klant drukte op "Bespreek met ons wat je met je credits kunt
 *                doen" (2.07, studiomail)
 *   terugboeking een betaling is via de bank teruggeboekt (8.11, studiomail)
 * Nooit over statuswissels, de levering, bedragen, facturen, btw of een
 * inlogcode (§21): elk extra moment leert de klant dat hij via WhatsApp op de
 * hoogte gehouden wordt.
 *
 * BELLEN OF APPEN. Lucas' notitie bij 7.05: Nederlandse klanten belt hij (een
 * klant, geen cold call), andere Europese klanten appt hij. Daarom staat er
 * naast elke WhatsApp-knop een tel:-knop, en bij een Nederlandse klant staat
 * Bellen voorop — behalve bij `review`: daar staat WhatsApp altijd voorop, ook
 * bij een Nederlandse klant (V27 = b: review vragen alleen via WhatsApp). Is het landnummer niet zeker, dan geen wa.me maar alleen
 * bellen (waNummer() hieronder, uit de naloop van A2).
 *
 * Geen DOM en geen database: de Worker, de cron en de tests laden dit.
 */
import { REVIEW_PLATFORMS } from '../data/reviews.js';
import { VERVAL_DAG, BETALEN_NA_BTW_AKKOORD, FOTO_WACHT_DAGEN, inWoorden } from '../data/termijnen.js';
import { SHOTS as SHOTS_DATA } from '../data/shots.js';
import { aantalOntbrekend, vakNaam } from './ontbreekt.js';
import { aanhefTekst } from './aanhef.js';

/*
 * ── HET LANDNUMMER UIT HET LAND VAN DE KLANT — naloop A2, 8 oktober 2026 ─────
 * (Verhuisd uit src/lib/admin.js, dat hem opnieuw exporteert; de cron en de
 * studiomail hebben hem nu ook nodig en horen admin.js niet te laden.)
 * Hier werd elk nummer met een 0 vooraan een Nederlands nummer: een Belgische
 * klant met "0470 12 34 56" kreeg een wa.me-link naar 31470123456, een vreemde
 * of niemand. Nu beslist het land van de bestelling (of de klant): alleen waar
 * we zeker weten dat de 0 de nationale voorloper is, wordt die het landnummer.
 * Bij twijfel (land onbekend, of een land waar de 0 bij het nummer hoort, zoals
 * een Italiaans vast nummer) geen wa.me-link: dan alleen bellen of mailen.
 * Een nummer met + of 00 is al internationaal en gaat zoals het is.
 */
const LANDNUMMER = {
  NL: '31', BE: '32', DE: '49', FR: '33', AT: '43', CH: '41', GB: '44', IE: '353',
  SE: '46', FI: '358', LU: '352', DK: '45', NO: '47', ES: '34', PT: '351', IT: '39', PL: '48',
};
/* De landen waar een nationaal nummer met één 0 begint die er internationaal af gaat. */
const NUL_ERAF = new Set(['NL', 'BE', 'DE', 'FR', 'AT', 'CH', 'GB', 'IE', 'SE', 'FI']);

/** Alleen cijfers, met landcode: wat wa.me wil. Leeg = geen wa.me-link (zie hierboven). */
export function waNummer(phone, land = '') {
  let d = String(phone || '').replace(/\(0\)/g, '').replace(/[^\d+]/g, '');
  if (!d) return '';
  const lc = String(land || '').trim().toUpperCase();
  const code = LANDNUMMER[lc] || '';
  if (d.startsWith('+')) d = d.slice(1);
  else if (d.startsWith('00')) d = d.slice(2);
  else if (d.startsWith('0')) {
    if (!code || !NUL_ERAF.has(lc)) return '';
    d = `${code}${d.slice(1)}`;
  } else if (!code || !d.startsWith(code)) return '';
  return /^\d{8,15}$/.test(d) ? d : '';
}

/** Het nummer voor een tel:-link: cijfers en een eventuele plus, zoals het is opgegeven. */
export function belNummer(phone) {
  return String(phone || '').replace(/[^\d+]/g, '');
}

/**
 * Is dit een Nederlandse klant (dan staat Bellen voorop)? Het land beslist; een
 * +31 of 0031 ook; een 0 vooraan alleen als het land onbekend is.
 */
export function isNederlands(phone, land = '') {
  const lc = String(land || '').trim().toUpperCase();
  const kaal = String(phone || '').replace(/\s+/g, '');
  return lc === 'NL' || /^(\+31|0031)/.test(kaal) || (!lc && /^0[1-9]/.test(kaal));
}

/** De vijf momenten, met het label dat Lucas in /admin en in de mails leest. */
export const WA_MOMENTEN = Object.freeze({
  betaling: 'Betaling staat open',
  fotos: 'Foto’s ontbreken',
  bounce: 'Mail kwam niet aan',
  incasso: 'Incasso mislukt',
  review: 'Review vragen',
  credits: 'Credits bespreken',
  terugboeking: 'Betaling teruggeboekt',
});

/* Waar WhatsApp altijd voorop staat, ook bij een Nederlands nummer (V27 = b). */
const APP_EERST = new Set(['review']);

const voornaamVan = (o) => {
  const v = String(o?.first_name || '').trim() || String(o?.name || '').trim().split(/\s+/)[0] || '';
  return v;
};

/** "s…@voorbeeld.nl": genoeg om een typefout in het domein te zien, niet het hele adres. */
export function halfAdres(email) {
  const [lokaal, domein] = String(email || '').trim().split('@');
  if (!lokaal || !domein) return '';
  return `${lokaal.slice(0, 1)}…@${domein}`;
}

/*
 * De vervaldatum van een onbetaalde bestelling: DEZELFDE som als de
 * herinneringsmail (stuurBetaallink() in src/lib/betaallink.js) en de cron
 * (cancelStaleApprovals): BETALEN_NA_BTW_AKKOORD dagen na een btw-goedkeuring,
 * anders VERVAL_DAG dagen na het bestellen, als datum in Nederlandse tijd. Zo
 * noemen mail en appje dezelfde dag.
 */
const DAG_MS = 86400000;
const alsMs = (iso) => {
  const s = String(iso || '');
  const t = Date.parse(s.replace(' ', 'T') + (/Z|[+-]\d\d:?\d\d$/.test(s) ? '' : 'Z'));
  return Number.isFinite(t) ? t : NaN;
};
/** { basis, dagen } van de betaalklok, of null als er geen klok loopt. */
export function betaalKlok(o) {
  if (!o) return null;
  if (o.review_state === 'approved' && o.reviewed_at) return { basis: o.reviewed_at, dagen: BETALEN_NA_BTW_AKKOORD };
  if (o.review_state === 'pending') return null;
  return o.created_at ? { basis: o.created_at, dagen: VERVAL_DAG } : null;
}
export function vervalDatum(o) {
  const klok = betaalKlok(o);
  const t = klok ? alsMs(klok.basis) : NaN;
  if (!Number.isFinite(t)) return '';
  return new Intl.DateTimeFormat(String(o.lang || 'nl') === 'en' ? 'en-GB' : 'nl-NL', { day: 'numeric', month: 'long', timeZone: 'Europe/Amsterdam' })
    .format(new Date(t + klok.dagen * DAG_MS));
}
/** "dag 5 van 14": de hoeveelste dag van de betaalklok het is (dag 1 = de dag zelf). */
export function betaalDag(o, nu = new Date()) {
  const klok = betaalKlok(o);
  const t = klok ? alsMs(klok.basis) : NaN;
  if (!Number.isFinite(t)) return null;
  const dag = Math.max(1, Math.floor((nu.getTime() - t) / DAG_MS) + 1);
  return { dag: Math.min(dag, klok.dagen), van: klok.dagen };
}

const MAAND = {
  nl: ['januari', 'februari', 'maart', 'april', 'mei', 'juni', 'juli', 'augustus', 'september', 'oktober', 'november', 'december'],
  en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
};
const maandNaam = (maand, lang) => {
  const m = String(maand || '').match(/^\d{4}-(\d{2})/);
  return m ? MAAND[lang][Number(m[1]) - 1] || '' : '';
};

/** De regel in order_events na de reviewknop (3.06): de knop wordt grijs, en de
 *  ochtendlijst laat de bestelling weg. Eén tekst voor /admin en de cron. */
export const REVIEW_GEVRAAGD = 'Review gevraagd via WhatsApp';

/** De reviewlink voor een bericht: de eerste reviewplek (V25 = a: Google eerst). */
export function reviewLink() {
  const p = REVIEW_PLATFORMS[0];
  return p?.inviteUrl || p?.url || '';
}

/**
 * De vaste tekst bij foto's die ontbreken (2.05, V31-2 = c): wat er ontbreekt,
 * waar de klant het kwijt kan, en dat we na FOTO_WACHT_DAGEN zonder antwoord
 * maken wat er is. In zijn taal. (Verhuisd uit admin.js, ontbreektKlantTekst().)
 */
function fotosTekst(order, lijst, groet) {
  if (!lijst || !lijst.length) return '';
  const en = order?.lang === 'en';
  /* Een bijbestelde hoek ("driekwart") staat niet in shots.js: zijn naam komt
     uit p.namen (ontbreekt.js, k-hoeken 12 oktober 2026). */
  const shotNaam = (id, namen) => {
    if (namen && namen[id]) return vakNaam(id, en ? 'en' : 'nl', namen);
    const s = SHOTS_DATA.find((x) => x.id === id);
    return s ? s.name[en ? 'en' : 'nl'].toLowerCase() : id;
  };
  const delen = lijst.map((p) => `${p.naam || `product ${p.index}`} (${p.mist.map((id) => shotNaam(id, p.namen)).join(', ')})`);
  const n = aantalOntbrekend(lijst);
  const dagen = FOTO_WACHT_DAGEN;
  if (en) {
    const wacht = dagen === 1 ? 'after a day' : `after ${inWoorden(dagen, 'en')} days`;
    return `${groet} about ${order.ref}: we are still missing ${n === 1 ? 'a photo' : 'photos'} of ${delen.join('; ')}. `
      + `Could you send ${n === 1 ? 'it' : 'them'}? You can add ${n === 1 ? 'it' : 'them'} to your order in VISUAILS Studio (sign in with your email address), or reply to this message. `
      + `If we have not heard from you ${wacht}, we make your images with what we have. VISUAILS`;
  }
  const wacht = dagen === 1 ? 'na een dag' : `na ${inWoorden(dagen, 'nl')} dagen`;
  return `${groet} over ${order.ref}: we missen nog ${n === 1 ? 'een foto' : 'foto’s'} van ${delen.join('; ')}. `
    + `Kun je ${n === 1 ? 'hem' : 'ze'} sturen? Dat kan bij je bestelling in VISUAILS Studio (log in met je e-mailadres), of als antwoord op dit bericht. `
    + `Hebben we ${wacht} niets gehoord, dan maken we je beelden met wat er is. VISUAILS`;
}

/**
 * De vaste tekst per moment, in de taal van de bestelling (`o.lang`).
 *
 * @param {'betaling'|'fotos'|'bounce'|'incasso'|'review'|'credits'|'terugboeking'} moment
 * @param {object} o  de bestelling (of bij incasso/credits: { name, lang, email })
 * @param {{ lijst?: object[], maand?: string, saldo?: number, vervalt?: string }} [extra]
 *   lijst: wat er ontbreekt (ontbrekendeFotos()); maand: 'YYYY-MM' van de incasso;
 *   saldo/vervalt: de credits en de eerste vervaldatum (als woorden) bij `credits`
 */
export function waTekst(moment, o = {}, extra = {}) {
  const en = String(o?.lang || 'nl') === 'en';
  const naam = voornaamVan(o);
  /* De aanhef (17 oktober 2026, afvinklijst 33): Lucas stuurt dit nu, dus het
     dagdeel in het land van de klant ("Goedemiddag Sanne,"), anders "Hallo".
     `extra.nu` is voor de tests; zie src/lib/aanhef.js. */
  const hoi = aanhefTekst(naam, en ? 'en' : 'nl', { nu: extra.nu || new Date(), land: o?.land || o?.country || o?.c_country || '' });
  const ref = String(o?.ref || '');
  switch (moment) {
    case 'betaling': {
      const datum = vervalDatum(o);
      return en
        ? `${hoi} your order ${ref} is still open: the payment did not go through. You can pay with the link in your email or in VISUAILS Studio (sign in with your email address).${datum ? ` If it stays unpaid, the order lapses after ${datum}.` : ''} If something is not working, let us know. VISUAILS`
        : `${hoi} je bestelling ${ref} staat nog open: de betaling is niet afgerond. Betalen kan met de link in je mail of in VISUAILS Studio (log in met je e-mailadres).${datum ? ` Betaal je niet, dan vervalt de bestelling na ${datum}.` : ''} Lukt het niet, laat het dan weten. VISUAILS`;
    }
    case 'fotos':
      return fotosTekst(o, extra.lijst, hoi);
    case 'bounce': {
      const adres = halfAdres(o?.email);
      return en
        ? `${hoi} our email about your order ${ref} did not reach ${adres || 'your address'}. Is your email address still right? Send us the correct one and we will send the email again. VISUAILS`
        : `${hoi} onze mail over je bestelling ${ref} kwam niet aan op ${adres || 'je adres'}. Klopt je e-mailadres nog? Stuur ons het goede adres, dan sturen we de mail opnieuw. VISUAILS`;
    }
    case 'incasso': {
      const m = maandNaam(extra.maand, en ? 'en' : 'nl');
      return en
        ? `${hoi} the payment for your VISUAILS subscription${m ? ` for ${m}` : ''} did not go through. Could you check whether something is up with your bank account? If something is not working, let us know. VISUAILS`
        : `${hoi} de betaling voor je VISUAILS-abonnement${m ? ` van ${m}` : ''} is niet gelukt. Wil je kijken of er iets is met je rekening? Lukt het niet, laat het dan weten. VISUAILS`;
    }
    case 'review': {
      const link = reviewLink();
      return en
        ? `${hoi} your order ${ref} is complete. Would you put a few sentences on Google about how it went? An honest review helps us most: ${link} VISUAILS`
        : `${hoi} je bestelling ${ref} is afgerond. Wil je in een paar zinnen op Google zetten hoe het ging? Een eerlijke review helpt ons het meest: ${link} VISUAILS`;
    }
    case 'credits': {
      /* 2.07: de klant vroeg zelf om mee te denken. Geen "we appen je": dit is
         het bericht dat Lucas verstuurt, als antwoord op die vraag. */
      const n = Math.max(0, Math.floor(Number(extra.saldo) || 0));
      const wanneer = String(extra.vervalt || '');
      return en
        ? `${hoi} you asked us to think along about your credits${n ? ` (${n} right now${wanneer ? `, the first ones expire on ${wanneer}` : ''})` : ''}. When suits you for a short call or a few messages? We will look at your website and channels and suggest what gets the most out of them. VISUAILS`
        : `${hoi} je vroeg ons mee te denken over je credits${n ? ` (nu ${n}${wanneer ? `, de eerste vervallen op ${wanneer}` : ''})` : ''}. Wanneer schikt het om even te bellen of te appen? We kijken naar je website en kanalen en stellen voor waar ze het meest opleveren. VISUAILS`;
    }
    case 'terugboeking':
      /* 8.11: een terugboeking kan een bankfout zijn; eerst vragen, niets beweren. */
      return en
        ? `${hoi} a payment${ref ? ` for ${ref}` : ''} was reversed through your bank. Is that right, or did something go wrong? Let us know and we will sort it out together. VISUAILS`
        : `${hoi} een betaling${ref ? ` voor ${ref}` : ''} is via je bank teruggeboekt. Klopt dat, of is er iets misgegaan? Laat het ons weten, dan zoeken we het samen uit. VISUAILS`;
    default:
      throw new Error(`waLink: onbekend moment "${moment}" — alleen ${Object.keys(WA_MOMENTEN).join(', ')}`);
  }
}

/**
 * De link en alles wat erbij hoort.
 *
 * @param {string} moment  een van WA_MOMENTEN
 * @param {object} o       de bestelling; `tel`/`phone`/`c_phone` en `land`/`country`
 *                         bepalen het nummer
 * @returns {{ moment: string, label: string, tekst: string, wa: string, tel: string, belEerst: boolean }}
 *   wa:  de wa.me-link met de tekst, of '' als er geen zeker nummer is
 *   tel: 'tel:+316…', of '' zonder nummer
 */
export function waLink(moment, o = {}, extra = {}) {
  const tekst = waTekst(moment, o, extra);
  const telefoon = String(o?.tel || o?.phone || o?.c_phone || '').trim();
  const land = String(o?.land || o?.country || '').trim().toUpperCase();
  const nummer = waNummer(telefoon, land);
  /* Bellen gebeurt vanuit Nederland: een Duits "0151 …" zou als Nederlands
     nummer gekozen worden. Is het landnummer zeker, dan internationaal (+49…);
     anders het nummer zoals de klant het typte. */
  const bel = nummer ? `+${nummer}` : belNummer(telefoon);
  return {
    moment,
    label: WA_MOMENTEN[moment],
    tekst,
    wa: nummer && tekst ? `https://wa.me/${nummer}?text=${encodeURIComponent(tekst).replace(/'/g, '%27')}` : '',
    tel: bel ? `tel:${bel}` : '',
    belEerst: APP_EERST.has(moment) ? false : isNederlands(telefoon, land),
  };
}

const escHtml = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

/**
 * De knoppen voor /admin: Bel en App (Bel voorop bij een Nederlandse klant),
 * en Mail met dezelfde tekst als er een adres en onderwerp is. Dezelfde vorm
 * als het blok "foto's ontbreken" (2.05).
 */
export function contactKnoppen(link, { wie = 'de klant', email = '', onderwerp = '', mail = true } = {}) {
  const w = escHtml(wie);
  const bel = link.tel ? `<a class="btn ${link.belEerst ? 'btn-primary' : 'btn-ghost'} btn-sm" href="${escHtml(link.tel)}">Bel ${w}</a>` : '';
  const app = link.wa ? `<a class="btn ${link.belEerst ? 'btn-ghost' : 'btn-primary'} btn-sm" href="${escHtml(link.wa)}" target="_blank" rel="noopener">App ${w}</a>` : '';
  const mailKnop = mail && email
    ? `<a class="btn btn-ghost btn-sm" href="mailto:${escHtml(email)}?subject=${encodeURIComponent(onderwerp)}&body=${encodeURIComponent(link.tekst)}">Mail ${w}</a>`
    : '';
  const uitleg = link.wa ? '' : link.tel
    ? ' <span class="meta">Landnummer niet zeker, dus geen WhatsApp-link.</span>'
    : ' <span class="meta">Geen telefoonnummer bekend, dus geen WhatsApp.</span>';
  return `${link.belEerst ? bel + app : app + bel}${mailKnop}${uitleg}`;
}

/**
 * Hetzelfde voor een studiomail (alleen Nederlands, voor Lucas): de eerste
 * keuze als knop, de tweede als tekstlink. `knop` en `regel` zijn button() en
 * linkLine() uit mailTemplate.js, meegegeven zodat dit bestand geen mailschil
 * hoeft te laden.
 */
export function contactMail(link, { wie = 'de klant', knop, regel }) {
  const bel = link.tel ? { href: link.tel, label: `Bel ${wie}` } : null;
  const app = link.wa ? { href: link.wa, label: `App ${wie} (tekst staat klaar)` } : null;
  const [eerst, dan] = link.belEerst ? [bel, app] : [app, bel];
  const delen = [];
  if (eerst) delen.push(knop(eerst.href, eerst.label));
  /* De ruimte onder de knop zit sinds 17 oktober 2026 in de knop zelf
     (button() in mailTemplate.js); hier stonden 10 en 16 px extra. */
  if (dan) delen.push(regel(dan.href, dan.label));
  return delen.join('');
}

/** Voor het nachtrapport (platte tekst): één regel per kanaal, de eerste keuze eerst. */
export function contactRegels(link, { wie = 'de klant' } = {}) {
  const bel = link.tel ? `bel ${wie}: ${link.tel}` : '';
  const app = link.wa ? `app ${wie}: ${link.wa}` : '';
  return (link.belEerst ? [bel, app] : [app, bel]).filter(Boolean);
}
