/* ── "WAT NU" — ÉÉN ZIN, HOOGSTENS TWEE KNOPPEN — 8 oktober 2026 (punt 3.01) ──
 *
 * Een klant opent zijn bestelling met één vraag: moet ik iets doen, en tot
 * wanneer? Tot vandaag stond het antwoord op drie plekken in drie vormen: de
 * bestelkaart in Studio had een Nu-zin (orderView() in account.js), het
 * Studio-overzicht alleen de tijdlijn, en de privélink (/o/<token>) begon met
 * kenmerk, dienst en een statuspil, zonder één zin over wat de klant nu kan doen
 * of tot wanneer zijn revisieronde loopt.
 *
 * Nu kiest DEZE functie de zin, de datums en de knoppen. De bestelkaart, het
 * overzicht en de privélink roepen hem alle drie aan, zodat ze nooit iets
 * anders zeggen over dezelfde bestelling. Wat per plek verschilt, is alleen
 * waar een knop naartoe wijst (een Studio-route of de privélink); dat vertaalt
 * de aanroeper zelf, want deze functie kent geen tokens en geen sessies.
 *
 * DE VOLGORDE, de eerste die geldt (tests/nu-zin.test.mjs legt hem vast):
 *   geannuleerd → btw-controle → betalen → revisieronde ligt bij ons →
 *   revisietermijn loopt binnen 2 dagen af → geleverd, nog te bekijken →
 *   foto ontbreekt → afgerond: downloadtermijn voorbij → proef →
 *   beelden worden binnen 14 dagen verwijderd → afgerond zonder
 *   tevredenheidscijfer → afgerond → in de maak.
 * Betalen staat boven alles wat rustig klinkt: een kalme zin terwijl er actie
 * nodig is, is de fout die deze volgorde moet voorkomen.
 *
 * DE ZINNEN VAN DE TIJDLIJN STAAN HIER OOK. account.js heeft ze in COPY.flowNow
 * voor de regel "Nu:" in de tijdlijn; de privélink laadt account.js niet (zie
 * de kop van close.js waarom). Dus staan ze hier een tweede keer, en
 * tests/nu-zin.test.mjs vergelijkt ze letter voor letter met COPY.flowNow,
 * flowStep en de datumregels. Wijkt er één af, dan valt die test om.
 *
 * Geen DOM, geen database: de Worker, een Astro-pagina en een test laden dit.
 */
import { SAMPLE_SERVICE, revisionRoundState } from '../data/pricing.js';
/* leverDatumsVan(): de revisiedatum telt ook vanaf het weer openen (w2 = b, 11 okt 2026). */
import { leverDatumsVan } from './leverdatums.js';
import { vakNaam } from './ontbreekt.js';

/* Hoe dicht bij de grens een termijn "bijna voorbij" heet. */
export const REVISIE_BIJNA_DAGEN = 2;
export const VERWIJDER_BIJNA_DAGEN = 14;
/* Zo lang na het afronden staat "Hoe vond je het?" vooraan — dezelfde veertien
   dagen als `nogVragen` in orderView() (account.js). */
export const VRAAG_DAGEN = 14;

const MONTHS = {
  nl: ['jan', 'feb', 'mrt', 'apr', 'mei', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec'],
  en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
};

/** "2026-10-13" → "13 okt" / "13 Oct" — dezelfde vorm als shortDate() in account.js. */
export function korteDatum(value, lang = 'nl') {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(value || ''));
  if (!m) return String(value || '');
  const months = MONTHS[lang] || MONTHS.en;
  return `${Number(m[3])} ${months[Number(m[2]) - 1] || m[2]}`;
}

export const NU_TEKST = {
  nl: {
    /* Letterlijk gelijk aan COPY.nl.flowNow in account.js (test). */
    flow: {
      awaiting_payment: 'Je bestelling is binnen, maar nog niet betaald. Zodra de betaling binnen is, plannen we hem in.',
      btwLijst: 'Je bestelling is binnen. We kijken eerst je btw-gegevens na; daarna sturen we je de betaallink — meestal binnen een werkdag.',
      received: 'We hebben je bestelling en je bestanden binnen. We plannen hem in.',
      request: 'Dit is een aanvraag, nog geen bestelling. We antwoorden schriftelijk met een voorstel en een prijs — meestal binnen een werkdag.',
      requestPaid: 'Je offerte is betaald. We werken je aanvraag uit en laten je weten zodra er iets te bekijken is.',
      brandModel: 'We hebben je merkmodelbestelling binnen. We maken je kandidaten en laten je weten wanneer je kunt kiezen.',
      in_production: 'Onze studio maakt je beelden.',
      human_check: 'We lopen elk beeld na voordat het naar je toe gaat.',
      delivered: 'Je beelden staan klaar. Bekijk ze en laat het weten als er iets niet klopt.',
      closed: 'Deze bestelling is afgerond. Je beelden staan klaar om te downloaden.',
      closedExpired: 'Deze bestelling is afgerond en de downloadtermijn is voorbij. Heb je de beelden nog nodig? Stuur ons een bericht.',
      revising: 'Je revisieronde is binnen. We werken aan de beelden die je aanmerkte en laten weten wanneer ze terug zijn.',
      cancelled: 'Deze bestelling is geannuleerd. Er wordt niets voor gemaakt.',
      cancelledRefunding: 'Deze bestelling is geannuleerd. Je betaling komt terug op de rekening waarmee je betaalde — afhankelijk van je bank binnen een paar werkdagen. De creditnota volgt onder Facturen zodra de terugbetaling bevestigd is.',
      cancelledRefunded: 'Deze bestelling is geannuleerd en je betaling is teruggestort. De creditnota staat onder Facturen.',
      cancelledCredit: 'Deze bestelling is geannuleerd. Het bedrag blijft als tegoed staan voor je volgende bestelling.',
    },
    /* Letterlijk gelijk aan COPY.nl.flowWindow, flowStep en de datumregels. */
    flowWindow: (from, to) => (from === to ? `Ingepland op ${from}.` : `Ingepland van ${from} tot ${to}.`),
    stap: { awaiting_payment: 'Wacht op betaling', received: 'Ontvangen', in_production: 'In productie', human_check: 'Wordt nagekeken', delivered: 'Geleverd' },
    nuMist: (vak, product) => `Er ontbreekt nog een foto: ${product} · ${vak}. Voeg hem toe, dan beginnen we met alles compleet.`,
    datumRevisie: (d) => `Revisie aanvragen kan tot en met ${d}.`,
    datumBewaar: (d) => `Je beelden staan hier tot en met ${d}.`,
    datumProef: 'Bij de proef zit geen revisieronde. Iets niet goed? App of mail ons.',

    /* Nieuw met 3.01. */
    /* De kern staat ook in de levermail (deliveryEmail() in admin.js), met de
       revisiedatum in de rondezin; hier zonder, want de datum staat eronder. */
    teBekijkenKern: (n, clip) => (n === 1
      ? `Je ${clip ? 'clip staat' : 'beeld staat'} klaar. Klopt het, keur het dan goed. Klopt er iets niet, vink het aan en schrijf erbij wat er anders moet.`
      : `Je ${n} ${clip ? 'clips' : 'beelden'} staan klaar. Klopt alles, keur ze dan in één keer goed. Klopt er iets niet, vink die aan en schrijf erbij wat er anders moet.`),
    rondeZin: (d) => (d ? `Je hebt één revisieronde, tot en met ${d}; daarna ronden we je bestelling af.` : 'Je hebt één revisieronde; daarna ronden we je bestelling af.'),
    teBekijkenZonderRonde: (n, clip) => (n === 1
      ? `Je ${clip ? 'clip staat' : 'beeld staat'} klaar. Klopt het, keur het dan goed.`
      : `Je ${n} ${clip ? 'clips' : 'beelden'} staan klaar. Klopt alles, keur ze dan in één keer goed.`),
    revisieBijna: 'Je revisieronde loopt bijna af. Klopt alles, keur je beelden dan goed; klopt er iets niet, vink het aan en schrijf erbij wat er anders moet.',
    proef: 'Je proefset staat klaar om te downloaden.',
    verwijderdBijna: 'Je beelden gaan binnenkort van deze pagina. Download ze vóór die tijd.',
    zonderScore: 'Afgerond — dank je. Je beelden staan klaar om te downloaden.',

    /* 2.08: wat er voor de factuur nog ontbreekt. */
    gegevensMist: (wat, ref) => `Vul je ${({ adres: 'adres', bedrijf: 'bedrijfsnaam' })[wat] || 'gegevens'} aan — dat moet op je factuur${ref ? ` voor ${ref}` : ''}.`,
    knop: {
      betalen: (bedrag) => (bedrag ? `Nu betalen · ${bedrag}` : 'Nu betalen'),
      allesGoed: 'Alles goed — naar je downloads',
      aanmerken: 'Iets aanmerken ↓',
      eerstDownloaden: 'Eerst downloaden',
      downloaden: 'Downloaden (zip)',
      tevreden: 'Hoe vond je het? ↓',
      fotos: 'Foto’s toevoegen',
      gegevens: 'Gegevens aanvullen',
      bekijk: 'Bekijk je beelden',
    },
  },
  en: {
    flow: {
      awaiting_payment: 'Your order is in, but not paid yet. Once the payment comes through we schedule it in.',
      btwLijst: 'Your order is in. We first check your VAT details; then we send you the payment link — usually within one working day.',
      received: 'We have your order and your files. We are scheduling it in.',
      request: 'This is a request, not an order yet. We reply in writing with a proposal and a price — usually within a working day.',
      requestPaid: 'Your quote is paid. We are working out your request and will let you know as soon as there is something to look at.',
      brandModel: 'We have your brand model order. We are making your candidates and will let you know when you can choose.',
      in_production: 'Our studio is making your images.',
      human_check: 'We go through every image before it reaches you.',
      delivered: 'Your images are ready. Look them over and tell us if anything is off.',
      closed: 'This order is complete. Your images are ready to download.',
      closedExpired: 'This order is complete and the download period has ended. Still need the images? Send us a message.',
      revising: 'Your revision round is in. We are working on the images you marked and will let you know when they are back.',
      cancelled: 'This order was cancelled. Nothing is being made for it.',
      cancelledRefunding: 'This order was cancelled. Your payment is on its way back to the account you paid from — depending on your bank, within a few working days. The credit note follows under Invoices once the refund is confirmed.',
      cancelledRefunded: 'This order was cancelled and your payment has been refunded. The credit note is under Invoices.',
      cancelledCredit: 'This order was cancelled. The amount stays with us as account balance for your next order.',
    },
    flowWindow: (from, to) => (from === to ? `Planned for ${from}.` : `Planned for ${from} – ${to}.`),
    stap: { awaiting_payment: 'Awaiting payment', received: 'Received', in_production: 'In production', human_check: 'Being checked', delivered: 'Delivered' },
    nuMist: (vak, product) => `A photo is still missing: ${product} · ${vak}. Add it, so we start with everything complete.`,
    datumRevisie: (d) => `You can request a revision until ${d}.`,
    datumBewaar: (d) => `Your images stay here until ${d}.`,
    datumProef: 'A trial has no revision round. Something not right? Message or email us.',

    teBekijkenKern: (n, clip) => (n === 1
      ? `Your ${clip ? 'clip is' : 'image is'} ready. If it is right, approve it. If something is off, tick it and write what should change.`
      : `Your ${n} ${clip ? 'clips' : 'images'} are ready. If everything is right, approve them all in one go. If something is off, tick those and write what should change.`),
    rondeZin: (d) => (d ? `You have one revision round, until ${d}; after that we complete your order.` : 'You have one revision round; after that we complete your order.'),
    teBekijkenZonderRonde: (n, clip) => (n === 1
      ? `Your ${clip ? 'clip is' : 'image is'} ready. If it is right, approve it.`
      : `Your ${n} ${clip ? 'clips' : 'images'} are ready. If everything is right, approve them all in one go.`),
    revisieBijna: 'Your revision round is nearly over. If everything is right, approve your images; if something is off, tick it and write what should change.',
    proef: 'Your trial set is ready to download.',
    verwijderdBijna: 'Your images leave this page soon. Download them before then.',
    zonderScore: 'Complete — thank you. Your images are ready to download.',

    gegevensMist: (wat, ref) => `Add your ${({ adres: 'address', bedrijf: 'company name' })[wat] || 'details'} — it has to be on your invoice${ref ? ` for ${ref}` : ''}.`,
    knop: {
      betalen: (bedrag) => (bedrag ? `Pay now · ${bedrag}` : 'Pay now'),
      allesGoed: 'All good — to your downloads',
      aanmerken: 'Flag something ↓',
      eerstDownloaden: 'Download first',
      downloaden: 'Download (zip)',
      tevreden: 'How did we do? ↓',
      fotos: 'Add photos',
      gegevens: 'Complete your details',
      bekijk: 'View your images',
    },
  },
};

const taal = (lang) => (lang === 'en' ? 'en' : 'nl');
const vandaagIso = () => new Date().toISOString().slice(0, 10);
const dagenTot = (iso, vandaag) => Math.round((Date.parse(`${iso}T00:00:00Z`) - Date.parse(`${vandaag}T00:00:00Z`)) / 86400000);

function verlopen(f, vandaag) {
  if (!f.expires_at) return false;
  return String(f.expires_at).slice(0, 10) < vandaag;
}

/** De geleverde beelden die nog meetellen: niet vervangen, niet verlopen. */
export function levendeBeelden(files = [], vandaag = vandaagIso()) {
  return (files || []).filter((f) => f.kind !== 'upload' && !f.superseded_at && !verlopen(f, vandaag));
}

/** Een proef is afgerond zodra hij geleverd is (3.08, V29 = a). */
export function proefAfgerond(o) {
  return !!o && o.service === SAMPLE_SERVICE && o.status === 'delivered';
}

/** Afgerond: closed_at staat, of het is een geleverde proef. */
export function isAfgerond(o) {
  return !!o && ((o.status === 'delivered' && !!o.closed_at) || proefAfgerond(o));
}

function onbetaald(o, bedrag) {
  const ps = String(o.payment_status || 'unpaid');
  return o.status !== 'cancelled' && (o.status || 'received') === 'received' && ps === 'unpaid' && !!bedrag;
}

export function isAanvraag(o) {
  try {
    const d = typeof o.details_json === 'object' && o.details_json ? o.details_json : JSON.parse(o.details_json || '{}') || {};
    return (o.status || 'received') === 'received' && !!String(d.request || '').trim();
  } catch { return false; }
}

/**
 * De twee datums na de levering, als zinnen — dezelfde regels als `datums` in
 * orderView() (account.js), uit dezelfde som (leverDatums).
 */
export function nuDatums(o, { files = [], lang = 'nl', vandaag = vandaagIso() } = {}) {
  const t = NU_TEKST[taal(lang)];
  if (!o || o.status !== 'delivered') return [];
  const geleverd = (files || []).filter((f) => f.kind !== 'upload');
  if (!geleverd.length) return [];
  const d = leverDatumsVan(o);
  const uit = [];
  const stand = revisionRoundState(o);
  if (o.service === SAMPLE_SERVICE) uit.push(t.datumProef);
  else if (d && stand === 'beschikbaar' && d.revisieTot >= vandaag) uit.push(t.datumRevisie(korteDatum(d.revisieTot, taal(lang))));
  if (d && levendeBeelden(geleverd, vandaag).length && d.bewaarTot >= vandaag) uit.push(t.datumBewaar(korteDatum(d.bewaarTot, taal(lang))));
  return uit;
}

/**
 * Het statuspad van Studio: (Wacht op betaling ·) Ontvangen · In productie ·
 * Wordt nagekeken · Geleverd. Dezelfde stappen en woorden als progressView().
 */
export function statusPad(o, { lang = 'nl', bedrag } = {}) {
  const t = NU_TEKST[taal(lang)];
  if (!o || o.status === 'cancelled') return [];
  const FLOW = ['received', 'in_production', 'human_check', 'delivered'];
  const heeftBedrag = bedrag === undefined ? Number(o.total_cents) > 0 : !!bedrag;
  const open = (o.status || 'received') === 'received' && String(o.payment_status || 'unpaid') !== 'paid' && heeftBedrag;
  const flow = open ? ['awaiting_payment', ...FLOW] : FLOW;
  const nu = open ? 0 : Math.max(0, FLOW.indexOf(o.status || 'received'));
  return flow.map((key, i) => ({ key, label: t.stap[key], state: i < nu ? 'is-done' : i === nu ? 'is-now' : 'is-todo' }));
}

/**
 * De Nu-zin van één bestelling.
 *
 * @param {object} o  de bestelling (status, payment_status, review_state, closed_at,
 *   service, details_json, window_start/end, delivery_mailed_at, delivered_at,
 *   revision_round_at, revisions_revoked_at, cancel_payment, total_cents)
 * @param {object} [ctx]
 * @param {Array}  [ctx.files]        de bestanden van de bestelling (uploads mogen erbij)
 * @param {*}      [ctx.bedrag]       is er iets te betalen? standaard total_cents > 0
 * @param {{product: string, vak: string}|null} [ctx.eersteMist]  het eerste lege fotovak
 * @param {object|null|undefined} [ctx.fb]  het tevredenheidsantwoord; undefined = onbekend
 * @param {'refunding'|'refunded'|'credit'|''} [ctx.geannuleerd]  wat er met het geld gebeurt
 * @param {string} [ctx.vandaag]     YYYY-MM-DD (UTC), voor de tests
 * @returns {{ soort: string, zin: string, knoppen: string[], datums: string[], revisieTot: string|null, bewaarTot: string|null }}
 */
export function nuZin(o, ctx = {}, lang = 'nl') {
  const L = taal(lang);
  const t = NU_TEKST[L];
  const vandaag = ctx.vandaag || vandaagIso();
  const files = ctx.files || [];
  const bedrag = ctx.bedrag === undefined ? Number(o.total_cents) > 0 : !!ctx.bedrag;
  const status = o.status || 'received';
  const d = status === 'delivered' ? leverDatumsVan(o) : null;
  const uit = (soort, zin, knoppen = []) => ({
    soort, zin, knoppen,
    datums: nuDatums(o, { files, lang: L, vandaag }),
    revisieTot: d ? d.revisieTot : null,
    bewaarTot: d ? d.bewaarTot : null,
  });

  if (status === 'cancelled') {
    const g = ctx.geannuleerd || '';
    const zin = g === 'credit' ? t.flow.cancelledCredit : g === 'refunded' ? t.flow.cancelledRefunded : g === 'refunding' ? t.flow.cancelledRefunding : t.flow.cancelled;
    return uit('geannuleerd', zin);
  }

  /* 2.08 (8 oktober 2026): mist er iets wat op de factuur moet (een adres na
     een aanvraag, F44), dan zegt de Nu-zin dat — vóór betalen, want de betaling
     maakt de factuur. `ctx.gegevensMist` is 'adres' | 'bedrijf' | 'gegevens';
     de aanroeper (account.js) weet wat er in Je gegevens staat. */
  if (ctx.gegevensMist && isAanvraag(o)) {
    return uit('gegevensMist', t.gegevensMist(ctx.gegevensMist, o.ref || ''), ['gegevens']);
  }

  if (onbetaald(o, bedrag)) {
    if (String(o.review_state || '') === 'pending') return uit('btw', t.flow.btwLijst);
    return uit('betalen', t.flow.awaiting_payment, ['betalen']);
  }

  const stand = revisionRoundState(o);
  const levend = levendeBeelden(files, vandaag);
  const clip = o.service === 'video';

  if (status === 'delivered' && !isAfgerond(o)) {
    if (levend.some((f) => f.review_state === 'revision_requested')) return uit('revisieBijOns', t.flow.revising);
    const open = levend.filter((f) => f.review_state === 'pending');
    if (open.length) {
      const ronde = stand === 'beschikbaar';
      const knoppen = ronde ? ['allesGoed', 'aanmerken'] : ['allesGoed'];
      if (ronde && d) {
        const rest = dagenTot(d.revisieTot, vandaag);
        if (rest >= 0 && rest <= REVISIE_BIJNA_DAGEN) return uit('revisieBijna', t.revisieBijna, knoppen);
      }
      return uit('teBekijken', ronde ? `${t.teBekijkenKern(levend.length, clip)} ${t.rondeZin('')}` : t.teBekijkenZonderRonde(levend.length, clip), knoppen);
    }
    return uit('geleverd', t.flow.delivered, levend.length ? ['downloaden'] : []);
  }

  if (!isAfgerond(o) && ctx.eersteMist) {
    return uit('fotoMist', t.nuMist(ctx.eersteMist.vak, ctx.eersteMist.product), ['fotos']);
  }

  if (isAfgerond(o)) {
    const geleverd = files.filter((f) => f.kind !== 'upload' && !f.superseded_at);
    if (geleverd.length && !levend.length) return uit('afgerondVerlopen', t.flow.closedExpired);
    /* De tevredenheidsvraag staat de eerste VRAAG_DAGEN na het afronden vooraan,
       net als in orderView() (needsAttention): daarna is hij geen "wat nu" meer. */
    const sinds = Date.parse(`${String(o.closed_at || o.delivered_at || '').slice(0, 10)}T00:00:00Z`);
    const nogVragen = Number.isFinite(sinds) && (Date.parse(`${vandaag}T00:00:00Z`) - sinds) < VRAAG_DAGEN * 86400000;
    const tevreden = ctx.fb === null && nogVragen ? ['tevreden'] : [];
    if (proefAfgerond(o)) return uit('proef', t.proef, ['downloaden', ...tevreden]);
    if (d && levend.length) {
      const rest = dagenTot(d.bewaarTot, vandaag);
      if (rest >= 0 && rest <= VERWIJDER_BIJNA_DAGEN) return uit('verwijderdBijna', t.verwijderdBijna, ['downloaden']);
    }
    if (tevreden.length) return uit('afgerondZonderScore', t.zonderScore, ['downloaden', 'tevreden']);
    return uit('afgerond', t.flow.closed, levend.length ? ['downloaden'] : []);
  }

  /* In de maak, of een aanvraag die nog op een offerte wacht. */
  const betaald = String(o.payment_status || '') === 'paid';
  let zin;
  if (isAanvraag(o)) zin = betaald ? t.flow.requestPaid : t.flow.request;
  else if (status === 'received' && o.service === 'brand-model') zin = t.flow.brandModel;
  else zin = t.flow[status] || t.flow.received;
  const wanneer = status !== 'delivered' && o.window_start
    ? ` ${t.flowWindow(korteDatum(o.window_start, L), korteDatum(o.window_end || o.window_start, L))}`
    : '';
  return uit('inDeMaak', `${zin}${wanneer}`);
}

/**
 * Het eerste lege fotovak uit de lijst van ontbreekt.js, in de vorm die nuZin()
 * vraagt: { product: 'Product 2 · Hoodie', vak: 'achterkant' } — dezelfde
 * woorden als fotosView() in account.js ("Product N", prodLabel). Bij `null`
 * (onbekend) of een lege lijst: null, en dan zegt de zin niets over foto's.
 */
export function eersteMistVan(lijst, lang = 'nl') {
  if (!Array.isArray(lijst) || !lijst.length || !lijst[0].mist || !lijst[0].mist.length) return null;
  const p = lijst[0];
  return { product: p.naam ? `Product ${p.index} \u00b7 ${p.naam}` : `Product ${p.index}`, vak: vakNaam(p.mist[0], taal(lang), p.namen) };
}

/**
 * De Nu-zin van de levermail: dezelfde kern als op de privélink en in Studio,
 * met de revisiedatum in de rondezin. Platte tekst; `datum` mag een
 * plaatshouder zijn die de mail daarna door opgemaakte HTML vervangt.
 */
export function leverMailZin(n, { clip = false, datum = '', lang = 'nl' } = {}) {
  const t = NU_TEKST[taal(lang)];
  return `${t.teBekijkenKern(n, clip)} ${t.rondeZin(datum)}`;
}

/** Het label van een knop uit nuZin(). `bedrag` is de opgemaakte prijs (alleen bij betalen). */
export function nuKnopLabel(doel, lang = 'nl', { bedrag = '' } = {}) {
  const k = NU_TEKST[taal(lang)].knop;
  if (doel === 'betalen') return k.betalen(bedrag);
  return k[doel] || '';
}

/** De soorten waarbij de KLANT iets moet doen — voor "En nog 1 bestelling: …". */
export const ACTIE_SOORTEN = new Set(['betalen', 'gegevensMist', 'teBekijken', 'revisieBijna', 'fotoMist', 'verwijderdBijna', 'afgerondZonderScore']);

/** De rangorde van de soorten, voor het kiezen van de bestelling bovenaan het overzicht. */
export const RANG = ['gegevensMist', 'betalen', 'revisieBijna', 'teBekijken', 'fotoMist', 'verwijderdBijna', 'afgerondZonderScore', 'btw', 'revisieBijOns', 'geleverd', 'proef', 'inDeMaak', 'afgerond', 'afgerondVerlopen', 'geannuleerd'];

/* ── DE STAND IN VIER WOORDEN — 14 oktober 2026 (k-klant-stand) ─────────────
 *
 * Voor de welkomstbalk op de voorpagina: "VIS-2041 · Geleverd, wacht op je
 * goedkeuring". Daar is geen ruimte voor de hele Nu-zin, en hij hoeft het ook
 * niet te zeggen: de knop ernaast gaat naar de bestelling, waar de zin staat.
 * Eén korte stand per soort uit RANG (plus `aanvraag`, zie standKort());
 * tests/klant-stand.test.mjs kijkt dat er geen soort zonder zit. Geen datums
 * en geen bedragen: die horen bij de zin.
 */
export const STAND_KORT = {
  nl: {
    gegevensMist: 'Er mist iets in je gegevens',
    betalen: 'Wacht op je betaling',
    revisieBijna: 'Je revisieronde loopt bijna af',
    teBekijken: 'Geleverd, wacht op je goedkeuring',
    fotoMist: 'Er mist nog een foto',
    verwijderdBijna: 'Afgerond, download je beelden',
    afgerondZonderScore: 'Afgerond',
    btw: 'We kijken je btw-gegevens na',
    revisieBijOns: 'Je revisieronde ligt bij ons',
    geleverd: 'Geleverd',
    proef: 'Je proef is klaar',
    inDeMaak: 'In productie',
    aanvraag: 'Je aanvraag ligt bij ons',
    afgerond: 'Afgerond',
    afgerondVerlopen: 'Afgerond',
    geannuleerd: 'Geannuleerd',
  },
  en: {
    gegevensMist: 'Something is missing from your details',
    betalen: 'Waiting for your payment',
    revisieBijna: 'Your revision round ends soon',
    teBekijken: 'Delivered, waiting for your approval',
    fotoMist: 'A photo is still missing',
    verwijderdBijna: 'Completed, download your images',
    afgerondZonderScore: 'Completed',
    btw: 'We are checking your VAT details',
    revisieBijOns: 'Your revision round is with us',
    geleverd: 'Delivered',
    proef: 'Your sample is ready',
    inDeMaak: 'In production',
    aanvraag: 'Your request is with us',
    afgerond: 'Completed',
    afgerondVerlopen: 'Completed',
    geannuleerd: 'Cancelled',
  },
};

/**
 * De korte stand van een soort uit nuZin(), of '' voor een onbekende soort.
 * "In de maak" zegt bij een bestelling precies welke stap het is — dezelfde
 * woorden als het statuspad (Ontvangen · In productie · Wordt nagekeken) —
 * en bij een aanvraag dat die bij ons ligt: daar wordt nog niets gemaakt.
 */
export function standKort(soort, lang = 'nl', o = null) {
  const L = taal(lang);
  if (soort === 'inDeMaak' && o) {
    if (isAanvraag(o)) return STAND_KORT[L].aanvraag;
    const stap = NU_TEKST[L].stap[o.status || 'received'];
    if (stap) return stap;
  }
  return STAND_KORT[L][soort] || '';
}
