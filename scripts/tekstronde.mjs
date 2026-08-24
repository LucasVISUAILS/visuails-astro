/*
 * VISUAILS — de tekstronde: elke zin die een bezoeker leest, om na te kijken.
 *   npm run tekstronde
 *
 * ── WAAROM DIT BESTAAT ──────────────────────────────────────────────────────
 *
 * Lucas, 24 augustus 2026: een bezoeker gaf aan dat sommige zinnen vaag waren en
 * raar lazen, in het Engels én in het Nederlands. Dat is niet met een zoekopdracht
 * op te lossen: je moet ze alle 1.950 een keer gelezen hebben.
 *
 * Dit script schrijft die zinnen uit in bestanden die je regel voor regel kunt
 * nalopen, met onder elke zin een leeg blok voor de verbeterde versie. Wat je
 * terugstuurt is te herleiden naar de plek in de code waar die zin vandaan komt,
 * zonder dat er iets door elkaar kan lopen.
 *
 * ── DRIE BESLISSINGEN DIE DE VORM BEPALEN ───────────────────────────────────
 *
 * 1 · UIT DE GEBOUWDE PAGINA'S, NIET UIT DE BRON. Wat een bezoeker leest is wat
 *     er in dist staat. Een tekst die in de bron mooi staat maar door een
 *     conditie nooit wordt afgedrukt, hoort hier niet in; een tekst die door drie
 *     lagen heen samengesteld wordt, wél. De BRONVERWIJZING wordt er daarna bij
 *     gezocht, en dat is de goede volgorde: eerst wat er staat, dan waar het
 *     vandaan komt.
 *
 * 2 · EN EN NL NAAST ELKAAR, GEPAARD OP VOLGORDE. De twee talen renderen
 *     dezelfde componenten, dus tekstknoop N op /catalog is dezelfde zin als
 *     tekstknoop N op /nl/catalog. Gemeten: 28 van de 30 paginaparen lopen exact
 *     gelijk. Waar dat niet zo is, wordt er niet gegokt — dan komt er een
 *     waarschuwing bovenaan het bestand en worden de twee kolommen los
 *     opgeschreven. Een verkeerd gepaarde zin is erger dan een ongepaarde.
 *
 * 3 · DE SLEUTEL IS EEN ID, NIET DE ZIN ZELF. Elke regel krijgt een id, en
 *     `index.json` houdt bij wat de oorspronkelijke tekst was en waar hij staat.
 *     Bij het terugverwerken wordt dat bestand gelezen en niet de markdown: dan
 *     maakt het niet uit of er in het document per ongeluk iets aan de "NU"-regel
 *     is veranderd, en kan dezelfde zin op twee pagina's niet verwisseld worden.
 *
 * ── HOE JE HET GEBRUIKT ─────────────────────────────────────────────────────
 *
 *   npm run build && npm run tekstronde
 *
 * Er komt een map `tekstronde/` uit met één bestand per pagina. Open er één, vul
 * bij de zinnen die je wilt wijzigen het lege blok in, en stuur dat ene bestand
 * terug. Blokken die leeg blijven, blijven ongemoeid.
 */
import { readFileSync, readdirSync, writeFileSync, mkdirSync, existsSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from 'parse5';
import { createHash } from 'node:crypto';

/* De volgorde waarin een bezoeker de site tegenkomt, niet alfabetisch. Wie dit
   nakijkt begint bij de voordeur en werkt naar de kassa. */
const PAGINAS = [
  ['', 'home'],
  ['catalog/', 'catalog'],
  ['lifestyle/', 'lifestyle'],
  ['video/', 'video'],
  ['custom-models/', 'merkmodel'],
  ['pricing/', 'prijzen'],
  ['plans/', 'abonnementen'],
  ['how-it-works/', 'hoe-het-werkt'],
  ['compare/', 'vergelijken'],
  ['studio/', 'studio'],
  ['models/', 'modellen'],
  ['gallery/', 'galerij'],
  ['about/', 'over-ons'],
  ['faq/', 'faq'],
  ['guides/', 'gidsen'],
  ['upload-guidelines/', 'uploadrichtlijnen'],
  ['test-sample/', 'proefvisual'],
  ['start/', 'start'],
  ['start/catalog/', 'start-catalog'],
  ['start/lifestyle/', 'start-lifestyle'],
  ['start/complete/', 'start-allebei'],
  ['start/video/', 'start-video'],
  ['start/brand-model/', 'start-merkmodel'],
  ['start/custom-look/', 'start-eigen-look'],
  ['start/plan/', 'start-abonnement'],
  ['contact/', 'contact'],
  ['thank-you/', 'bedankt'],
  ['portal/', 'portaal'],
  ['terms/', 'voorwaarden'],
  ['privacy/', 'privacy'],
  ['cookie-policy/', 'cookies'],
  ['ai-act/', 'ai-act'],
  ['data-processing-agreement/', 'verwerkersovereenkomst'],
];

/* Wat er nooit tekst is die een bezoeker leest. `svg` staat erbij omdat de titels
   daarin bij de tekening horen en niet bij de zin; die zijn een eigen ronde. */
const OVERSLAAN = new Set(['script', 'style', 'noscript', 'template', 'svg', 'head']);
const KOPPEN = new Set(['h1', 'h2', 'h3']);

/*
 * ── PER TEKSTBLOK EN NIET PER TEKSTKNOOP — 24 augustus 2026 ─────────────────
 *
 * De eerste versie duwde elke losse tekstknoop naar buiten. Dat leverde
 * fragmenten op: "Product-page photos, 4 per product —" en "the same on every
 * product." kwamen als twee regels binnen, omdat er in de bron een <span> tussen
 * staat. Een halve zin is niet na te kijken en al helemaal niet te herschrijven.
 *
 * Nu wordt er verzameld op het niveau van het BLOK waar de zin in staat: een
 * alinea, een lijstitem, een cel, een kop, een knop. Alles wat daarbinnen inline
 * staat — een <span>, een <em>, een link — hoort bij de zin en wordt meegenomen.
 * Staat er een blok IN een blok, dan krijgt dat zijn eigen regel.
 *
 * De paring tussen de talen blijft kloppen, want beide talen renderen dezelfde
 * structuur en er wordt aan beide kanten hetzelfde gegroepeerd.
 */
const BLOKKEN = new Set([
  'p', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'td', 'th', 'dt', 'dd',
  'blockquote', 'figcaption', 'summary', 'label', 'button', 'legend', 'caption',
  'option',
  /* `em` en `strong` stonden hier en dat was fout: die zijn INLINE. Met hen erbij
     brak elke kop met een cursief slot in tweeën — "Product-page photos, 4 per
     product —" en "the same on every product." kwamen als twee regels binnen,
     terwijl het één zin is die de bezoeker in één adem leest. */
]);

/** Bevat deze knoop nog een blok dieper? Dan mag hij niet als geheel opgeslokt. */
function bevatBlok(node) {
  for (const k of node.childNodes || []) {
    if (OVERSLAAN.has(k.nodeName)) continue;
    if (BLOKKEN.has(k.nodeName)) return true;
    if (bevatBlok(k)) return true;
  }
  return false;
}

/** Alle tekst binnen deze knoop, als één regel. */
function heleTekst(node) {
  const uit = [];
  (function loop(n) {
    if (n.nodeName === '#text') { uit.push(n.value); return; }
    if (n.nodeName === '#comment' || OVERSLAAN.has(n.nodeName)) return;
    for (const k of n.childNodes || []) loop(k);
  }(node));
  return uit.join(' ').replace(/\s+/g, ' ').trim();
}

/** Elk tekstblok in leesvolgorde, met de laatste kop erboven als houvast. */
function leesTekst(node, staat = { uit: [], kop: '' }) {
  if (node.nodeName === '#text') {
    /* Losse tekst die niet in een blok zit — bijvoorbeeld rechtstreeks in een
       <div>. Komt weinig voor en hoort er wel bij. */
    const v = node.value.replace(/\s+/g, ' ').trim();
    if (v) staat.uit.push({ tekst: v, kop: staat.kop });
    return staat;
  }
  if (node.nodeName === '#comment') return staat;
  if (OVERSLAAN.has(node.nodeName)) return staat;

  const isKop = KOPPEN.has(node.nodeName);
  const voor = staat.kop;

  if (BLOKKEN.has(node.nodeName) && !bevatBlok(node)) {
    const v = heleTekst(node);
    /* De WAARDE van een <option> reist mee. Zie de noot bij pareer(): een
       keuzelijst met landen staat in elke taal in zijn eigen alfabetische
       volgorde, en dan is de plek in de lijst geen identiteit meer. */
    const attr = (node.attrs || []).find((a) => a.name === 'value');
    if (v) staat.uit.push({ tekst: v, kop: isKop ? '' : staat.kop, waarde: attr ? attr.value : null });
    if (isKop) staat.kop = v.slice(0, 80);
    return staat;
  }

  if (isKop) staat.kop = heleTekst(node).slice(0, 80);
  for (const k of node.childNodes || []) leesTekst(k, staat);
  if (!isKop) staat.kop = voor;
  return staat;
}

/* ── DE BRON ERBIJ ZOEKEN ─────────────────────────────────────────────────────
 *
 * Exacte tekstvergelijking, en met opzet niet slimmer dan dat. Een zin die door
 * een template is samengesteld (`${bedrag} per product`) staat zo niet in de
 * bron, en dan hoort er "niet teruggevonden" te staan in plaats van een gok. Een
 * verkeerde bronverwijzing kost meer dan een ontbrekende: die stuurt je naar een
 * bestand waar je vervolgens de verkeerde regel aanpast. */
const BRONNEN = [];
(function loop(d) {
  for (const e of readdirSync(d, { withFileTypes: true })) {
    const p = join(d, e.name);
    if (e.isDirectory()) { loop(p); continue; }
    if (/\.(astro|js|ts)$/.test(e.name)) {
      BRONNEN.push({ pad: p, inhoud: readFileSync(p, 'utf8') });
    }
  }
}('src'));

const bronCache = new Map();

function zoekLetterlijk(naald) {
  const treffers = [];
  if (naald.length < 12) return treffers;
  for (const { pad, inhoud } of BRONNEN) {
    const at = inhoud.indexOf(naald);
    if (at === -1) continue;
    treffers.push(`${pad}:${inhoud.slice(0, at).split('\n').length}`);
    if (treffers.length >= 4) break;
  }
  return treffers;
}

/*
 * ── DRIE POGINGEN, VAN PRECIES NAAR RUIM ────────────────────────────────────
 *
 * Sinds er per BLOK wordt verzameld, is een regel hier vaak een hele alinea — en
 * die staat zelden als één string in de bron: er zit een bedrag in, of hij is uit
 * twee zinnen samengesteld. Zoeken op het geheel gaf dan "niet teruggevonden",
 * terwijl het bestand prima te vinden was.
 *
 * Dus: eerst het geheel, dan de eerste zin, dan de eerste veertig tekens. Wat er
 * gevonden wordt is een AANWIJZING naar het bestand en niet het bewijs dat die
 * ene regel daar staat — vandaar het teken erachter, zodat de lezer weet hoe hard
 * de verwijzing is. Een ruime treffer die naar het goede bestand wijst, is meer
 * waard dan een lege regel.
 */
function zoekBron(zin) {
  if (bronCache.has(zin)) return bronCache.get(zin);
  let treffers = zoekLetterlijk(zin);
  if (!treffers.length) {
    const eersteZin = (zin.match(/^[^.!?]{15,}[.!?]/) || [])[0];
    if (eersteZin) treffers = zoekLetterlijk(eersteZin.trim()).map((t) => `${t} ~`);
  }
  if (!treffers.length && zin.length > 40) {
    treffers = zoekLetterlijk(zin.slice(0, 40)).map((t) => `${t} ~`);
  }
  bronCache.set(zin, treffers);
  return treffers;
}

/* ── OP WELKE ANDERE PAGINA'S STAAT DEZE ZIN NOG MEER ────────────────────────
 *
 * Een tabelrij die op zeven pagina's staat, verander je één keer en op zeven
 * plekken tegelijk. Dat hoort de nakijker te weten vóórdat hij besluit dat een
 * zin op déze pagina anders moet. */
const alleTekst = new Map(); // route -> Set(tekst)

function paginaTekst(bestand) {
  if (!existsSync(bestand)) return null;
  return leesTekst(parse(readFileSync(bestand, 'utf8'))).uit;
}

for (const [route] of PAGINAS) {
  for (const pre of ['', 'nl/']) {
    const f = `dist/${pre}${route}index.html`;
    const t = paginaTekst(f);
    if (t) alleTekst.set(`/${pre}${route}`, new Set(t.map((x) => x.tekst)));
  }
}

function opHoeveelPaginas(zin) {
  let n = 0;
  for (const [, set] of alleTekst) if (set.has(zin)) n++;
  return n;
}

/*
 * ── DE NAVIGATIE HOORT NIET IN HET CATALOGUSBESTAND — 24 augustus 2026 ───────
 *
 * De eerste versie zette élke tekstknoop van een pagina in het bestand van die
 * pagina. Dat leverde per bestand dertig regels menu, voettekst en cookiemelding
 * op vóórdat er ook maar één zin over de catalogus kwam — en dertig keer
 * dezelfde dertig regels over de hele map.
 *
 * Alles wat op meer dan DREMPEL pagina's staat, is per definitie niet van een
 * pagina maar van de site. Dat gaat naar één eigen bestand, en de paginabestanden
 * houden over wat er werkelijk op díé pagina staat. Wie de navigatie wil nakijken,
 * doet dat één keer.
 *
 * Zes en niet twee: een zin die op de drie catalogusstijlen staat, hoort nog
 * steeds bij die pagina's. Pas boven de zes gaat het over chrome.
 */
const DREMPEL = 6;

function ookOp(zin, eigenRoutes) {
  const uit = [];
  for (const [route, set] of alleTekst) {
    if (eigenRoutes.includes(route)) continue;
    if (set.has(zin)) uit.push(route);
  }
  return uit;
}

/* ── SCHRIJVEN ──────────────────────────────────────────────────────────────── */

/*
 * ── HET ID MOET HETZELFDE BLIJVEN ALS HET SCRIPT OPNIEUW DRAAIT ─────────────
 * 24 augustus 2026, en dit is de duurste les van deze tool.
 *
 * De eerste versie nummerde door: site-001, site-002, … Toen er twee fouten in
 * de tool waren gerepareerd (de landen die verkeerd gepaard stonden, en een zin
 * die er dubbel in zat) schoof bij het opnieuw genereren de héle nummering op —
 * terwijl Lucas op dat moment TEKST-00 al had ingevuld. Zijn antwoorden wezen
 * ineens naar andere zinnen.
 *
 * Een volgnummer is dus geen identiteit maar een plek in een lijst, en die
 * verandert zodra de lijst verandert. Het id komt nu uit de TEKST zelf: dezelfde
 * zin krijgt altijd hetzelfde id, ongeacht wat eromheen gebeurt. Verdwijnt een
 * zin, dan verdwijnt zijn id; komt er een bij, dan krijgt die een eigen id en
 * schuift er niets op.
 *
 * De paginanaam blijft ervoor staan, want een id moet nog steeds te plaatsen
 * zijn zonder index.json erbij te pakken.
 */
function maakId(slug, en, nl) {
  const basis = (en || nl || '').replace(/\s+/g, ' ').trim();
  const hash = createHash('sha1').update(`${slug}|${basis}`).digest('hex').slice(0, 5);
  return `${slug}-${hash}`;
}

const UIT = 'tekstronde';
if (existsSync(UIT)) rmSync(UIT, { recursive: true });
mkdirSync(UIT, { recursive: true });

const index = {};
let nummer = 0;
const overzicht = [];
const chrome = [];
const chromeGezien = new Map();

for (const [route, slug] of PAGINAS) {
  nummer++;
  const enPad = `dist/${route}index.html`;
  const nlPad = `dist/nl/${route}index.html`;
  const en = paginaTekst(enPad);
  const nl = paginaTekst(nlPad);
  if (!en) { console.log(`overgeslagen — /${route} bestaat niet in dist/`); continue; }

  const gelijk = nl && en.length === nl.length;
  const nr = String(nummer).padStart(2, '0');
  const bestandsnaam = `TEKST-${nr}-${slug}.md`;

  const regels = [];
  regels.push(`# ${slug} · /${route}`);
  regels.push('');
  regels.push(`Engels: \`/${route}\` · Nederlands: \`/nl/${route}\``);
  regels.push('');
  if (!nl) {
    regels.push('> **Let op:** van deze pagina bestaat geen Nederlandse versie. Alleen de Engelse tekst staat hieronder.');
    regels.push('');
  } else if (!gelijk) {
    regels.push(`> **Let op:** de twee talen leveren niet evenveel tekstblokken op (${en.length} om ${nl.length}), dus ze zijn hier NIET aan elkaar gekoppeld. De Engelse en Nederlandse tekst staan los onder elkaar. Dat verschil is op zichzelf iets om na te kijken.`);
    regels.push('');
  }
  regels.push('## Hoe je dit invult');
  regels.push('');
  regels.push('Onder elke regel staat een leeg blok. Klopt de zin, laat het blok leeg —');
  regels.push('dan verandert er niets. Wil je hem anders, zet je nieuwe versie tussen de');
  regels.push('streepjes. Laat de kop met het nummer erboven staan zoals hij is; daar wordt');
  regels.push('de zin aan herkend.');
  regels.push('');
  regels.push('---');
  regels.push('');

  const lang = [];
  const kort = [];
  const paren = [];

  if (gelijk) {
    /*
     * ── OP VOLGORDE, BEHALVE WAAR DE VOLGORDE PER TAAL VERSCHILT ─────────────
     * 24 augustus 2026, gevonden door Lucas.
     *
     * De paring op index klopte overal behalve in de landenkiezer, en daar ging
     * hij spectaculair mis: "EN Cyprus / NL Duitsland", "EN Finland / NL
     * Griekenland". De oorzaak staat in countryOptions() in src/data/vat.js —
     * de EU-landen worden per taal op hun EIGEN naam gesorteerd. Austria staat
     * bij A, België bij B, en vanaf dat punt loopt de hele lijst uit de pas.
     *
     * DE SITE ZELF IS DAAR NIET STUK: beide talen tonen dezelfde 34 landen met
     * dezelfde ISO-codes, elk netjes alfabetisch in de eigen taal. Alleen deze
     * TOOL nam aan dat plek N in de ene taal hetzelfde is als plek N in de
     * andere, en dat geldt niet voor een lijst die zichzelf sorteert.
     *
     * Vandaar: waar een <option> een `value` heeft, wordt daarop gepaard. Dat is
     * een echte identiteit — de landcode is in beide talen dezelfde — en geen
     * aanname over de volgorde.
     */
    const nlOpWaarde = new Map();
    for (const n of nl) if (n.waarde) nlOpWaarde.set(n.waarde, n);
    const gebruikt = new Set();
    for (let i = 0; i < en.length; i++) {
      const e = en[i];
      let tegen = null;
      if (e.waarde && nlOpWaarde.has(e.waarde)) {
        tegen = nlOpWaarde.get(e.waarde);
      } else if (!e.waarde && !nl[i]?.waarde) {
        tegen = nl[i];
      } else {
        /* De ene kant is een option en de andere niet: dan is de paring hier al
           uit de pas en wordt er niet gegokt. */
        tegen = nl[i]?.waarde === e.waarde ? nl[i] : null;
      }
      if (tegen) gebruikt.add(tegen);
      paren.push({ en: e, nl: tegen });
    }
    /* Nederlandse regels die geen Engelse tegenhanger kregen, gaan er los in —
       liever ongepaard dan verkeerd gepaard. */
    for (const n of nl) if (!gebruikt.has(n)) paren.push({ en: null, nl: n });
  } else {
    for (const e of en) paren.push({ en: e, nl: null });
    if (nl) for (const n of nl) paren.push({ en: null, nl: n });
  }

  const gezien = new Set();
  for (const paar of paren) {
    const sleutel = `${paar.en?.tekst || ''}||${paar.nl?.tekst || ''}`;
    if (gezien.has(sleutel)) continue;
    gezien.add(sleutel);
    /* Chrome gaat naar zijn eigen bestand — één keer, in plaats van dertig keer
       bovenaan een pagina waar hij niets mee te maken heeft. */
    if (opHoeveelPaginas(paar.en?.tekst || paar.nl?.tekst || '') > DREMPEL) {
      /*
       * ── DEZELFDE ZIN TWEE KEER, MET EEN HALVE TWEELING ──────────────────────
       * 24 augustus 2026, ook door Lucas gevonden: `site-001` en `site-037`
       * droegen allebei "Front, back, detail and on-model, for every product" —
       * de eerste mét zijn Nederlandse tweeling, de tweede met `NL: null`.
       *
       * De oorzaak: op een pagina waar de twee talen niet gelijk liepen, komen
       * de regels los binnen als {en, null} en {null, nl}. De ontdubbeling
       * sleutelde op de combinatie van de twee, en "Front…||Voorkant…" is nu
       * eenmaal een andere sleutel dan "Front…||". Twee regels, één zin, en de
       * nakijker moet raden welke telt.
       *
       * Nu wordt er gesleuteld op de tekst die er IS, en een halve regel vult een
       * bestaande aan in plaats van ernaast te gaan staan.
       */
      const tekstSleutel = paar.en?.tekst || paar.nl?.tekst || '';
      const bestaand = chromeGezien.get(tekstSleutel);
      if (bestaand) {
        if (!bestaand.en && paar.en) bestaand.en = paar.en;
        if (!bestaand.nl && paar.nl) bestaand.nl = paar.nl;
      } else {
        const vers = { en: paar.en, nl: paar.nl };
        chromeGezien.set(tekstSleutel, vers);
        chrome.push(vers);
      }
      continue;
    }
    const langGenoeg = (paar.en?.tekst || paar.nl?.tekst || '').length >= 25;
    (langGenoeg ? lang : kort).push(paar);
  }

  const blok = (paar, i, soort) => {
    const id = maakId(slug, paar.en?.tekst, paar.nl?.tekst);
    const enT = paar.en?.tekst || '';
    const nlT = paar.nl?.tekst || '';
    const bron = [...new Set([...zoekBron(enT), ...zoekBron(nlT)])];
    const elders = ookOp(enT || nlT, [`/${route}`, `/nl/${route}`]);

    index[id] = {
      pagina: `/${route}`,
      bestand: bestandsnaam,
      kop: paar.en?.kop || paar.nl?.kop || '',
      en: enT || null,
      nl: nlT || null,
      bron,
      ook_op: elders,
    };

    const uit = [];
    uit.push(`### ${id}`);
    const meta = [];
    if (paar.en?.kop || paar.nl?.kop) meta.push(`onder *${paar.en?.kop || paar.nl?.kop}*`);
    if (bron.length) meta.push(bron.map((b) => `\`${b}\``).join(' · '));
    else meta.push('_bron niet teruggevonden — waarschijnlijk samengestelde tekst_');
    if (elders.length > 4) meta.push(`**staat ook op ${elders.length} andere pagina's**`);
    else if (elders.length) meta.push(`**staat ook op:** ${elders.join(' ')}`);
    uit.push(meta.join(' — '));
    uit.push('');
    if (enT) { uit.push(`**EN** ${enT}`); uit.push(''); }
    if (nlT) { uit.push(`**NL** ${nlT}`); uit.push(''); }
    if (enT) { uit.push('```nieuw-en'); uit.push(''); uit.push('```'); }
    if (nlT) { uit.push('```nieuw-nl'); uit.push(''); uit.push('```'); }
    uit.push('');
    return uit.join('\n');
  };

  regels.push(`## De tekst, in leesvolgorde (${lang.length})`);
  regels.push('');
  lang.forEach((p, i) => regels.push(blok(p, i, 'lang')));

  if (kort.length) {
    regels.push('---');
    regels.push('');
    regels.push(`## Korte labels (${kort.length})`);
    regels.push('');
    regels.push('Knoppen, tabelkoppen, navigatie. Zelden vaag, maar ze bepalen wel of iets');
    regels.push('raar leest. Sla ze gerust over.');
    regels.push('');
    kort.forEach((p, i) => regels.push(blok(p, lang.length + i, 'kort')));
  }

  writeFileSync(join(UIT, bestandsnaam), regels.join('\n'), 'utf8');
  overzicht.push({ bestandsnaam, route, lang: lang.length, kort: kort.length, gelijk: !!gelijk });
  console.log(`${bestandsnaam.padEnd(34)} ${String(lang.length).padStart(4)} zinnen  ${String(kort.length).padStart(4)} labels${gelijk ? '' : '   ← talen lopen niet gelijk'}`);
}

/* ── HET CHROMEBESTAND ────────────────────────────────────────────────────────
 * Alles wat op meer dan DREMPEL pagina's staat: menu, voettekst, cookiemelding,
 * de balk bovenaan. Eén keer nakijken in plaats van dertig keer overslaan. */
{
  const regels = [];
  regels.push('# navigatie en voettekst · de hele site');
  regels.push('');
  regels.push(`Alles wat op meer dan ${DREMPEL} pagina's staat en dus niet van één pagina is:`);
  regels.push('het menu, de voettekst, de cookiemelding, de balk bovenaan. Verander je hier');
  regels.push('iets, dan verandert het overal.');
  regels.push('');
  regels.push('Dit bestand bestaat zodat de paginabestanden erover gaan wat er op díé pagina');
  regels.push('staat. Zonder deze splitsing begon elk bestand met dertig regels menu.');
  regels.push('');
  regels.push('---');
  regels.push('');

  const lang = chrome.filter((p) => (p.en?.tekst || p.nl?.tekst || '').length >= 25);
  const kort = chrome.filter((p) => (p.en?.tekst || p.nl?.tekst || '').length < 25);

  const schrijf = (paar, i) => {
    const id = maakId('site', paar.en?.tekst, paar.nl?.tekst);
    const enT = paar.en?.tekst || '';
    const nlT = paar.nl?.tekst || '';
    const bron = [...new Set([...zoekBron(enT), ...zoekBron(nlT)])];
    index[id] = {
      pagina: '(hele site)', bestand: 'TEKST-00-navigatie-en-voettekst.md',
      kop: paar.en?.kop || paar.nl?.kop || '', en: enT || null, nl: nlT || null,
      bron, ook_op: ['(alle pagina\'s)'],
    };
    const uit = [`### ${id}`];
    uit.push(bron.length ? bron.map((b) => `\`${b}\``).join(' · ') : '_bron niet teruggevonden_');
    uit.push('');
    if (enT) { uit.push(`**EN** ${enT}`); uit.push(''); }
    if (nlT) { uit.push(`**NL** ${nlT}`); uit.push(''); }
    if (enT) { uit.push('```nieuw-en'); uit.push(''); uit.push('```'); }
    if (nlT) { uit.push('```nieuw-nl'); uit.push(''); uit.push('```'); }
    uit.push('');
    return uit.join('\n');
  };

  regels.push(`## De tekst (${lang.length})`);
  regels.push('');
  lang.forEach((p, i) => regels.push(schrijf(p, i)));
  if (kort.length) {
    regels.push('---');
    regels.push('');
    regels.push(`## Korte labels (${kort.length})`);
    regels.push('');
    kort.forEach((p, i) => regels.push(schrijf(p, lang.length + i)));
  }
  writeFileSync(join(UIT, 'TEKST-00-navigatie-en-voettekst.md'), regels.join('\n'), 'utf8');
  console.log(`TEKST-00-navigatie-en-voettekst.md ${String(lang.length).padStart(4)} zinnen  ${String(kort.length).padStart(4)} labels`);
}

writeFileSync(join(UIT, 'index.json'), JSON.stringify(index, null, 1), 'utf8');

/* Een leeswijzer bovenop de map, zodat het bestand dat je als eerste opent
   uitlegt wat de rest is. */
const lees = [
  '# Tekstronde',
  '',
  `Gemaakt met \`npm run tekstronde\` op basis van de gebouwde site. ${Object.keys(index).length} regels, verdeeld over ${overzicht.length} bestanden.`,
  '',
  '## Zo werkt het',
  '',
  'Open één bestand, loop het van boven naar beneden door, en vul alleen de blokken',
  'in bij de zinnen die je wilt wijzigen. Een leeg blok betekent: laat staan. Stuur',
  'dat ene bestand terug in Cowork; de rest hoeft niet mee.',
  '',
  'De kop boven elke regel (bijvoorbeeld `catalog-014`) is waar de zin aan wordt',
  'herkend. `index.json` in deze map houdt bij wat de oorspronkelijke tekst was en',
  'in welk bronbestand hij staat — dat bestand hoef je niet te openen, maar het is',
  'de reden dat er niets door elkaar kan lopen.',
  '',
  '## Wat er per regel staat',
  '',
  '- **EN** en **NL** — dezelfde zin in beide talen, naast elkaar. Loopt er één',
  '  van de twee raar, dan zie je dat hier het snelst.',
  '- Het bronbestand met regelnummer, zodat een wijziging op de goede plek landt.',
  '  Staat er een `~` achter, dan is er op een deel van de zin gezocht — het bestand',
  '  klopt, het regelnummer is een richting. Zonder `~` is het een exacte treffer.',
  '- **staat ook op:** — de zin staat op meer pagina\'s. Verander je hem, dan',
  '  verandert hij daar mee. Dat is meestal precies goed, maar niet altijd.',
  '',
  '## De bestanden',
  '',
  '| Bestand | Pagina | Zinnen | Labels |',
  '|---|---|---|---|',
  ...overzicht.map((o) => `| \`${o.bestandsnaam}\` | \`/${o.route}\` | ${o.lang} | ${o.kort} |`),
  '',
];
const scheef = overzicht.filter((o) => !o.gelijk);
if (scheef.length) {
  lees.push('## Twee pagina\'s waar de talen niet gelijk lopen');
  lees.push('');
  lees.push('Bij deze twee leveren Engels en Nederlands niet evenveel tekstblokken op, dus');
  lees.push('daar staan de talen los onder elkaar in plaats van gepaard. Dat verschil is op');
  lees.push('zichzelf iets om na te kijken — er staat aan één kant iets wat aan de andere');
  lees.push('kant ontbreekt.');
  lees.push('');
  for (const o of scheef) lees.push(`- \`${o.bestandsnaam}\` — \`/${o.route}\``);
  lees.push('');
}
writeFileSync(join(UIT, 'LEESMIJ.md'), lees.join('\n'), 'utf8');

console.log(`\n${Object.keys(index).length} regels weggeschreven in ${UIT}/`);
