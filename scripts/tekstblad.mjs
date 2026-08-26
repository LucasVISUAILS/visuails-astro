/*
 * VISUAILS — ALLE TEKST VAN DE SITE IN ÉÉN TABEL
 *   npm run build && npm run tekstblad
 *
 * ══════════════════════════════════════════════════════════════════════════════
 * WAAROM DIT NAAST scripts/tekstronde.mjs STAAT EN HEM NIET VERVANGT
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * Lucas, 25 augustus 2026: *"Alle zinnen en teksten van de website kopiëren en in
 * een bestand stoppen zodat ik zin voor zin kan controleren. Zorg dat ik dit
 * bestand in Cowork kan zetten en je gelijk begrijpt waar die tekst staat zodat
 * je deze niet door elkaar gaat haalt."*
 *
 * `tekstronde.mjs` schrijft 34 markdownbestanden om te LEZEN. Dit script schrijft
 * één tabel om te FILTEREN, en dat is een andere vorm voor een andere ronde: hij
 * gaat over de hele site tegelijk in plaats van pagina voor pagina.
 *
 * De uitleeslogica is dezelfde en met opzet letterlijk overgenomen in plaats van
 * gedeeld: die code is een keer of tien bijgeschaafd op fouten die Lucas vond (de
 * landenlijst die per taal anders sorteert, de halve tweeling, het fragment van
 * een halve zin) en die reparaties horen niet stilletjes te verschuiven doordat
 * dit bestand iets anders nodig had. Verandert er iets aan de uitlezing, dan
 * hoort het in allebei.
 *
 * ── DRIE DINGEN DIE DIT SCRIPT WÉL ANDERS DOET ──────────────────────────────
 *
 * 1 · HET ADRES IS EEN SLEUTEL EN GEEN REGELNUMMER. `tekstronde.mjs` zette er
 *     `HomeV2.astro:466` bij. Dat klopt op de dag dat het gegenereerd wordt en
 *     schuift daarna bij elke bewerking op — precies wat er in de vorige ronde
 *     gebeurde, waardoor verwijzingen naar regels wezen die er niet meer waren.
 *     Hier staat `HomeV2.astro › en.priceLede`, en die verhuist niet.
 *
 * 2 · DRIE BRONNEN ERBIJ DIE NIET IN dist/ STAAN. VISUAILS Studio (portal.js en
 *     account.js), de uitgaande e-mails en de WhatsApp-berichten worden nooit als
 *     pagina gebouwd, dus een uitlezing van dist/ mist ze volledig. Voor een
 *     klant zijn het wél zinnen die hij van VISUAILS leest.
 *
 * 3 · SAMENGESTELDE ZINNEN WORDEN GEMARKEERD, MET DE INTERPOLATIE ERBIJ. In de
 *     vorige ronde bleven 31 zinnen liggen omdat ze `${sample.deliverable}` of
 *     `${euro(AMOUNT.video)}` bevatten en Lucas het getal had uitgeschreven.
 *     Dat kostte een hele extra ronde. Nu staat er in de kolom `let op` bij wat
 *     de code invult, zodat het getal niet uitgetypt hoeft te worden.
 */
import { readFileSync, readdirSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from 'parse5';
import { createHash } from 'node:crypto';
import { WINDOW_THRESHOLD } from '../src/data/pricing.js';

/* ══ 1 · DE PAGINA'S, IN DE VOLGORDE WAARIN JE ZE TEGENKOMT ═══════════════════
   Letterlijk dezelfde lijst als in tekstronde.mjs. Wie de voordeur nakijkt,
   begint bij de voordeur. */
const PAGINAS = [
  ['', 'home'], ['catalog/', 'catalog'], ['lifestyle/', 'lifestyle'], ['video/', 'video'],
  ['custom-models/', 'merkmodel'], ['pricing/', 'prijzen'], ['plans/', 'abonnementen'],
  ['how-it-works/', 'hoe-het-werkt'], ['compare/', 'vergelijken'], ['studio/', 'studio'],
  ['models/', 'modellen'], ['gallery/', 'galerij'], ['about/', 'over-ons'], ['faq/', 'faq'],
  ['guides/', 'gidsen'], ['upload-guidelines/', 'uploadrichtlijnen'], ['test-sample/', 'proefvisual'],
  ['start/', 'start'], ['start/catalog/', 'start-catalog'], ['start/lifestyle/', 'start-lifestyle'],
  ['start/complete/', 'start-allebei'], ['start/video/', 'start-video'],
  ['start/brand-model/', 'start-merkmodel'], ['start/custom-look/', 'start-eigen-look'],
  ['start/plan/', 'start-abonnement'], ['contact/', 'contact'], ['thank-you/', 'bedankt'],
  ['portal/', 'portaal'], ['terms/', 'voorwaarden'], ['privacy/', 'privacy'],
  ['cookie-policy/', 'cookies'], ['ai-act/', 'ai-act'],
  ['data-processing-agreement/', 'verwerkersovereenkomst'],
];

const OVERSLAAN = new Set(['script', 'style', 'noscript', 'template', 'svg', 'head']);
const KOPPEN = new Set(['h1', 'h2', 'h3']);
const BLOKKEN = new Set([
  'p', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'td', 'th', 'dt', 'dd',
  'blockquote', 'figcaption', 'summary', 'label', 'button', 'legend', 'caption', 'option',
]);
/* `em` en `strong` horen hier NIET bij: die zijn inline, en met hen erbij breekt
   elke kop met een cursief slot in tweeën. Zie de noot in tekstronde.mjs. */

const SOORT = {
  h1: 'kop', h2: 'kop', h3: 'kop', h4: 'kop', h5: 'kop', h6: 'kop',
  button: 'knop', label: 'label', legend: 'label', option: 'keuze',
  li: 'lijst', td: 'tabel', th: 'tabel', dt: 'tabel', dd: 'tabel',
  summary: 'uitklapper', blockquote: 'citaat', figcaption: 'bijschrift', caption: 'bijschrift',
};

function bevatBlok(node) {
  for (const k of node.childNodes || []) {
    if (OVERSLAAN.has(k.nodeName)) continue;
    if (BLOKKEN.has(k.nodeName)) return true;
    if (bevatBlok(k)) return true;
  }
  return false;
}

function heleTekst(node) {
  const uit = [];
  (function loop(n) {
    if (n.nodeName === '#text') { uit.push(n.value); return; }
    if (n.nodeName === '#comment' || OVERSLAAN.has(n.nodeName)) return;
    for (const k of n.childNodes || []) loop(k);
  }(node));
  /* ── AAN ELKAAR EN NIET MET EEN SPATIE ERTUSSEN ──────────────────────────
     `<h1>We deliver the <em>campaign</em>.</h1>` bestaat uit drie tekstknopen, en
     met een spatie ertussen wordt dat "We deliver the campaign ." — een spatie
     vóór de punt die op de site niet staat. De nakijker ziet dan een fout die er
     niet is, of erger: hij haalt hem "weg" in een zin waar hij nooit stond.
     De spaties die er wél horen, staan al ín de tekstknopen zelf; hier hoeft er
     niets bij. Alleen blokken zijn hier al uitgesplitst, dus wat overblijft is
     inline en plakt in de browser net zo aan elkaar. */
  return uit.join('').replace(/\s+/g, ' ').trim();
}

function leesTekst(node, staat = { uit: [], kop: '' }) {
  if (node.nodeName === '#text') {
    const v = node.value.replace(/\s+/g, ' ').trim();
    if (v) staat.uit.push({ tekst: v, kop: staat.kop, soort: 'tekst' });
    return staat;
  }
  if (node.nodeName === '#comment' || OVERSLAAN.has(node.nodeName)) return staat;

  const isKop = KOPPEN.has(node.nodeName);
  const voor = staat.kop;

  if (BLOKKEN.has(node.nodeName) && !bevatBlok(node)) {
    const v = heleTekst(node);
    /* De waarde van een <option> reist mee: een landenlijst sorteert per taal op
       zijn eigen naam, dus de PLEK in de lijst is daar geen identiteit. */
    const attr = (node.attrs || []).find((a) => a.name === 'value');
    if (v) staat.uit.push({
      tekst: v, kop: isKop ? '' : staat.kop,
      waarde: attr ? attr.value : null, soort: SOORT[node.nodeName] || 'alinea',
    });
    if (isKop) staat.kop = v.slice(0, 90);
    return staat;
  }

  if (isKop) staat.kop = heleTekst(node).slice(0, 90);
  for (const k of node.childNodes || []) leesTekst(k, staat);
  if (!isKop) staat.kop = voor;
  return staat;
}

/* ══ 2 · DE BRON ERBIJ, ALS SLEUTEL ══════════════════════════════════════════ */
const BRONNEN = [];
(function loop(d) {
  for (const e of readdirSync(d, { withFileTypes: true })) {
    const p = join(d, e.name);
    if (e.isDirectory()) { loop(p); continue; }
    if (/\.(astro|js|ts)$/.test(e.name)) {
      const inhoud = readFileSync(p, 'utf8');
      /* ── EEN TWEEDE, COMMENTAARLOZE KOPIE ───────────────────────────────────
         Gezocht wordt in `inhoud` (daar staat de zin), maar de SLEUTEL wordt
         opgezocht in `kaal`. Dat moet, want de noten in dit project beginnen
         geregeld met `Lucas:` of `WAAROM:` aan het begin van een regel, en dan
         leest de sleutelzoeker dat als een key: `test-sample.astro › Lucas[6]`.
         Blanco maken en niet weghalen, zodat elke positie in de twee kopieën
         precies gelijk blijft. Vijfde keer dat dit patroon in dit project nodig
         is; zie de kop van tests/schrijfwijze.test.mjs. */
      const kaal = inhoud
        .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
        .replace(/(^|[^:])\/\/[^\n]*/g, (m, p1) => p1 + ' '.repeat(m.length - p1.length))
        .replace(/\{\/\*[\s\S]*?\*\/\}/g, (m) => m.replace(/[^\n]/g, ' '))
        /* En HTML-commentaar. Een .astro-bestand is voor de helft opmaak, en de
           noten in de opmaak staan tussen <!-- -->; daar begint een regel net zo
           goed met `Lucas:` als in een blokcommentaar. */
        .replace(/<!--[\s\S]*?-->/g, (m) => m.replace(/[^\n]/g, ' '));
      BRONNEN.push({ pad: p, inhoud, kaal });
    }
  }
}('src'));

/*
 * Van een positie in een bestand terug naar de SLEUTEL waar de tekst onder hangt.
 *
 * Er wordt achteruit gelopen tot de eerste regel die begint met `naam:` — dat is
 * in dit project altijd een key in een copy-object. Onderweg wordt bijgehouden of
 * de tekst in een array of in een geneste structuur zit, want `subFacts[2]` is
 * een ander adres dan `subFacts`.
 *
 * En de TAAL erbij: elk copy-object in dit project is `{ en: {...}, nl: {...} }`,
 * dus de eerste `en:` of `nl:` die je tegenkomt als je verder terugloopt, zegt in
 * welke helft je zit. Zonder dat verwijst `priceLede` naar twee verschillende
 * zinnen en is het adres precies zo dubbelzinnig als een regelnummer.
 */
function sleutelBij(inhoud, offset) {
  const voor = inhoud.slice(0, offset);
  const regels = voor.split('\n');
  const ZELF = new Set(['q', 'id', 'title', 'name', 'label', 'kop']);
  let sleutel = null, index = null, erbij = '';
  for (let i = regels.length - 1; i >= 0 && i > regels.length - 200; i--) {
    /* Commentaar telt niet mee — zie de commentaarloze kopie bij BRONNEN. */
    if (/^\s*(\/\/|\*|\/\*)/.test(regels[i])) continue;
    const m = /^(\s*)([A-Za-z_$][\w$]*)\s*:/.exec(regels[i]);
    if (!m) continue;
    /* ── EEN TAALSLEUTEL IS NIET ALTIJD EEN TAALGRENS — 26 augustus 2026 ────
       Hier stond `if (m[2] === 'en' || m[2] === 'nl') break;`, en dat klopt voor
       een copy-object dat begint met `en: {` … `nl: {` — daar is de taal een
       BRANCHE en de sleutel staat erbinnen.

       Het klopt NIET voor het omgekeerde patroon, dat in dit project net zo vaak
       voorkomt: `turnaroundShort: { en: '…', nl: '…' }`. Daar is de taal een
       BLAD, en wie terugloopt vanaf de tekst komt eerst `nl: '48-uursblok…'`
       tegen — brak af, vond geen sleutel, en schreef "in de opmaak" op. Zesenvijftig
       regels droegen daardoor een adres dat naar de opmaak wees terwijl ze
       gewoon onder een sleutel in een data-bestand staan; `48-uursblok, vast voor
       je betaalt` was er één van, en dat is precies de regel waar Lucas over viel.

       De taal is dus alleen een grens als hij een OBJECT opent. Doet hij dat
       niet, dan is het een blad en loopt de zoektocht door naar de echte sleutel
       erboven. */
    if ((m[2] === 'en' || m[2] === 'nl') && /:\s*\{\s*$/.test(regels[i])) break;
    if (m[2] === 'en' || m[2] === 'nl') continue;
    sleutel = m[2];

    /* ── DE PLEK BINNEN DE SLEUTEL ──────────────────────────────────────────
       `svcH: ['Wat wij maken.', 'Wat jij ontvangt.']` is één sleutel met twee
       zinnen, en zonder index wijzen ze allebei naar `svcH` — precies de
       dubbelzinnigheid die deze tabel moet uitsluiten. Geteld wordt hoeveel
       VOLLEDIGE tekststukken er tussen de dubbele punt en de treffer staan: nul
       betekent dat de treffer het eerste stuk is en er geen index nodig is. */
    const startOffset = regels.slice(0, i).join('\n').length + (i ? 1 : 0);
    const tussen = inhoud.slice(startOffset + regels[i].indexOf(':') + 1, offset);
    const ervoor = [...tussen.matchAll(/'(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*"|`(?:[^`\\]|\\.)*`/g)].length;
    if (ervoor > 0) index = ervoor;

    /* ── EEN SLEUTEL VAN ÉÉN LETTER IS GEEN ADRES ──────────────────────────
       src/data/faq.js bestaat uit honderd objecten `{ q: 'vraag', a: 'antwoord' }`,
       en `faq.js › a` staat dus honderd keer in deze tabel zonder te zeggen wélk
       antwoord. De vraag ernaast maakt het adres bruikbaar. Bij `q` zelf niet:
       die zou zichzelf tussen haakjes herhalen. */
    if (sleutel.length <= 2 && !ZELF.has(sleutel)) {
      for (let j = i; j >= 0 && j > i - 8; j--) {
        const b = /^\s*(?:q|id|title|name|label|kop)\s*:\s*(?:'((?:[^'\\]|\\.)*)'|`((?:[^`\\]|\\.)*)`)/.exec(regels[j]);
        if (b) { erbij = ` (${(b[1] ?? b[2]).slice(0, 52)})`; break; }
      }
    }
    break;
  }
  let taal = null;
  for (let i = regels.length - 1; i >= 0; i--) {
    if (/^\s{0,4}(en|nl)\s*:\s*\{/.test(regels[i])) { taal = /^\s{0,4}(en|nl)/.exec(regels[i])[1]; break; }
  }
  if (!sleutel) return null;
  return `${taal ? taal + '.' : ''}${sleutel}${index !== null ? `[${index}]` : ''}${erbij}`;
}

/* De naam van de functie waar een stuk tekst in staat. Voor tekst die niet in een
   copy-object hangt maar los in de code — de e-mails, vooral — is dat het enige
   adres dat er is, en het is een goed adres: functienamen verhuizen zelden en
   zeggen wat het bericht doet. */
function functieBij(inhoud, offset) {
  const voor = inhoud.slice(0, offset);
  const m = [...voor.matchAll(/(?:export\s+)?(?:async\s+)?function\s+([A-Za-z_$][\w$]*)\s*\(|const\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?\(/g)];
  const laatste = m[m.length - 1];
  return laatste ? (laatste[1] || laatste[2]) : null;
}

const bronCache = new Map();

/* Het langste stuk vanaf het begin (of het eind) dat wél letterlijk in de bron
   staat. Nodig omdat deze tabel de GERENDERDE zin bevat: bij een samengestelde
   regel staat de ingevulde waarde erin en de `${…}` in de bron, dus het geheel
   matcht nooit. De kop of de staart wél. */
function langstePrefix(zin, achterstevoren = false) {
  const t = achterstevoren ? [...zin].reverse().join('') : zin;
  let lo = 15, hi = Math.min(t.length, 160), beste = null;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    const stuk = achterstevoren ? [...t.slice(0, mid)].reverse().join('') : t.slice(0, mid);
    let raak = null;
    for (const { pad, inhoud, kaal } of BRONNEN) {
      const at = inhoud.indexOf(stuk);
      if (at !== -1) { raak = { pad, inhoud, kaal, at }; break; }
    }
    if (raak) { beste = raak; lo = mid + 1; } else { hi = mid - 1; }
  }
  return beste;
}

function zoekBron(zin) {
  if (!zin) return null;
  /* Onder de twaalf tekens wordt er niet gezocht, en dat is geen luiheid: "Video"
     of "Soon" staat in twintig bestanden en elke treffer is dan een gok. Een
     verkeerd adres kost meer dan geen adres — dat stuurt je naar het verkeerde
     bestand, waar je vervolgens de verkeerde regel aanpast. */
  if (zin.length < 12) return 'te kort om te adresseren';
  if (bronCache.has(zin)) return bronCache.get(zin);

  const adres = (raak) => {
    const s = sleutelBij(raak.kaal || raak.inhoud, raak.at);
    const bestand = raak.pad.split('/').pop();
    /* Geen sleutel gevonden? Dan staat de zin niet in een copy-object maar
       rechtstreeks in de opmaak. Dat is een echt antwoord en geen vraagteken:
       je zoekt hem daar met een zoekopdracht op de zin zelf. */
    return `${bestand} › ${s || 'in de opmaak'}`;
  };

  let uit = null;
  for (const { pad, inhoud, kaal } of BRONNEN) {
    const at = inhoud.indexOf(zin);
    if (at === -1) continue;
    uit = adres({ pad, inhoud, kaal, at });
    break;
  }
  /* Een treffer op een DEEL van de zin krijgt een tilde. Dat is geen sierteken:
     bij een samengestelde regel wijst hij naar het goede bestand en de goede
     sleutel, maar de zin staat daar niet letterlijk zo. Wie hem gaat zoeken moet
     dat weten voordat hij een zoekopdracht op de hele zin doet en niets vindt. */
  if (!uit) { const k = langstePrefix(zin, false); if (k) uit = adres(k) + ' ~'; }
  if (!uit) { const k = langstePrefix(zin, true);  if (k) uit = adres(k) + ' ~'; }
  /* Geen enkel stuk van vijftien tekens teruggevonden? Dan bestaat deze zin
     alleen op het scherm: hij wordt uit losse stukken samengesteld
     (`See ${naam}`) en staat nergens als tekst in de bron. Dat is een antwoord
     en geen gat. */
  bronCache.set(zin, uit || 'samengesteld — staat niet letterlijk in de bron');
  return uit || 'samengesteld — staat niet letterlijk in de bron';
}

/*
 * ── WELKE INTERPOLATIE ZIT ERIN ──────────────────────────────────────────────
 * Dit is de kolom die de vorige ronde 31 zinnen had bespaard. Als de bronregel
 * een `${…}` bevat, hoort de nakijker dat te weten vóórdat hij het getal
 * uitschrijft — anders staat er straks een vast bedrag op de pagina dat niet
 * meebeweegt met pricing.js.
 */
function interpolatiesBij(zin) {
  if (!zin || zin.length < 12) return [];
  const stukken = [zin, ...zin.split(/[.!?]/).map((s) => s.trim()).filter((s) => s.length > 18)];
  for (const { inhoud } of BRONNEN) {
    for (const stuk of stukken) {
      const at = inhoud.indexOf(stuk);
      if (at === -1) continue;
      /* De hele template-literal eromheen ophalen en kijken wat erin zit. */
      const start = inhoud.lastIndexOf('`', at);
      const eind = inhoud.indexOf('`', at + stuk.length);
      if (start === -1 || eind === -1 || eind - start > 400) continue;
      const lit = inhoud.slice(start, eind);
      /* Het taalargument gaat eruit: `euro(AMOUNT.video, 'nl')` en
         `euro(AMOUNT.video, 'en')` zijn dezelfde interpolatie en horen niet als
         twee dingen in de kolom te staan. Wat de nakijker moet weten is WELKE
         waarde de code invult, niet in welke taal hij dat doet. */
      const found = [...lit.matchAll(/\$\{([^}]*(?:\{[^}]*\}[^}]*)*)\}/g)]
        .map((m) => m[1].trim()
          .replace(/,\s*'(en|nl)'/g, '')
          .replace(/\(\s*'(en|nl)'\s*\)/g, '()')
          /* En een taal die als eigenschap achteraan hangt: `TIERS.x.delivery.en`
             en `…​.nl` zijn dezelfde bron, twee keer opgeschreven. */
          .replace(/\.(en|nl)\b$/, ''));
      /* Hoogstens vier. Een cel die er acht opsomt is geen waarschuwing meer maar
         behang, en de nakijker hoeft alleen te weten DAT de code hier invult. */
      if (found.length) return [...new Set(found)].slice(0, 4);
    }
  }
  return [];
}

/* ══ 3 · WAT OP MEER DAN ZES PAGINA'S STAAT, IS GEEN PAGINATEKST ═════════════ */
const alleTekst = new Map();
const paginaTekst = (f) => (existsSync(f) ? leesTekst(parse(readFileSync(f, 'utf8'))).uit : null);
for (const [route] of PAGINAS) {
  for (const pre of ['', 'nl/']) {
    const t = paginaTekst(`dist/${pre}${route}index.html`);
    if (t) alleTekst.set(`/${pre}${route}`, new Set(t.map((x) => x.tekst)));
  }
}
const opHoeveelPaginas = (zin) => {
  let n = 0;
  for (const [, set] of alleTekst) if (set.has(zin)) n++;
  return n;
};
const DREMPEL = 6;

/* ══ 4 · DE RIJEN ════════════════════════════════════════════════════════════ */
const rijen = [];
const gezienId = new Map();

function id(groep, en, nl) {
  const basis = (en || nl || '').replace(/\s+/g, ' ').trim();
  return `${groep}-${createHash('sha1').update(`${groep}|${basis}`).digest('hex').slice(0, 5)}`;
}

/* Wat er niet in hoort. Een bestandsnaam is geen zin — `README.txt` naast
   `LEESMIJ.txt` staat in delivery.js omdat het zipbestand in beide talen een
   leesmij krijgt, en er valt niets aan na te kijken. Een los woord zonder spatie
   is een label of een knopnaam die elders al voorkomt. */
const GEEN_ZIN = (t) => !t || /\.(txt|pdf|zip|png|jpe?g|webp|svg|ico|css|js)$/i.test(t.trim());

function voegToe(rij) {
  const enT = rij.en || '', nlT = rij.nl || '';
  if (GEEN_ZIN(enT) && GEEN_ZIN(nlT)) return;
  /* Dezelfde zin op dezelfde plek maar één keer. Gesleuteld op wat er STAAT en
     niet op de combinatie van twee talen: een halve tweeling (en zonder nl) hoort
     een bestaande rij aan te vullen en niet ernaast te gaan staan. */
  const sl = `${rij.groep}||${rij.en || ''}||${rij.nl || ''}`;
  const bestaand = gezienId.get(sl);
  if (bestaand) {
    if (!bestaand.en && rij.en) bestaand.en = rij.en;
    if (!bestaand.nl && rij.nl) bestaand.nl = rij.nl;
    return;
  }
  gezienId.set(sl, rij);
  rijen.push(rij);
}

/* ── 4a · de pagina's ─────────────────────────────────────────────────────── */
const chromeGezien = new Set();
for (const [route, slug] of PAGINAS) {
  const en = paginaTekst(`dist/${route}index.html`);
  const nl = paginaTekst(`dist/nl/${route}index.html`);
  if (!en) { console.log(`overgeslagen — /${route} staat niet in dist/`); continue; }

  const paren = [];
  if (nl && en.length === nl.length) {
    const nlOpWaarde = new Map();
    for (const n of nl) if (n.waarde) nlOpWaarde.set(n.waarde, n);
    const gebruikt = new Set();
    for (let i = 0; i < en.length; i++) {
      const e = en[i];
      let tegen = null;
      if (e.waarde && nlOpWaarde.has(e.waarde)) tegen = nlOpWaarde.get(e.waarde);
      else if (!e.waarde && !nl[i]?.waarde) tegen = nl[i];
      else tegen = nl[i]?.waarde === e.waarde ? nl[i] : null;
      if (tegen) gebruikt.add(tegen);
      paren.push({ en: e, nl: tegen });
    }
    for (const n of nl) if (!gebruikt.has(n)) paren.push({ en: null, nl: n });
  } else {
    for (const e of en) paren.push({ en: e, nl: null });
    if (nl) for (const n of nl) paren.push({ en: null, nl: n });
  }

  for (const paar of paren) {
    const enT = paar.en?.tekst || '';
    const nlT = paar.nl?.tekst || '';
    const kern = enT || nlT;
    if (!kern) continue;

    const isChrome = opHoeveelPaginas(kern) > DREMPEL;
    if (isChrome) {
      if (chromeGezien.has(kern)) continue;
      chromeGezien.add(kern);
    }

    const bron = zoekBron(enT) || zoekBron(nlT);
    const interp = [...new Set([...interpolatiesBij(enT), ...interpolatiesBij(nlT)])].slice(0, 4);
    const elders = [];
    for (const [r, set] of alleTekst) {
      if (r === `/${route}` || r === `/nl/${route}`) continue;
      if (set.has(kern)) elders.push(r);
    }

    voegToe({
      id: id(isChrome ? 'site' : slug, enT, nlT),
      groep: isChrome ? 'Menu en voettekst' : 'Pagina',
      waar: isChrome ? 'op elke pagina' : `/${route}`,
      slug: isChrome ? 'site' : slug,
      blok: paar.en?.kop || paar.nl?.kop || '',
      soort: paar.en?.soort || paar.nl?.soort || 'alinea',
      bron: bron || '',
      en: enT || null,
      nl: nlT || null,
      interp,
      elders: isChrome ? [] : elders,
    });
  }
}

/* ── 4b · VISUAILS Studio, de e-mails en WhatsApp ─────────────────────────────
 *
 * Deze drie worden nooit als pagina gebouwd, dus dist/ kent ze niet. Ze worden
 * uit de bron gelezen: elk van deze modules houdt zijn tekst in één
 * `const COPY = { en: {…}, nl: {…} }`, en dat is precies de vorm waar een sleutel
 * uit te halen valt.
 *
 * WAT ER BEWUST NIET IN GAAT: functies. `tally: (a, b) => \`${a} of ${b} approved\``
 * is een regel die pas bestaat als hij wordt aangeroepen, en zijn tekst valt
 * zonder de getallen niet te beoordelen. Die staan als "samengesteld" in de
 * kolom `let op` en met hun sjabloon erbij, zodat je ziet dát ze er zijn.
 */
function leesCopy(pad, naam = 'COPY') {
  const src = readFileSync(pad, 'utf8');
  const start = src.indexOf(`const ${naam} = {`);
  if (start === -1) return [];
  let i = src.indexOf('{', start), diepte = 0, eind = -1;
  for (let j = i; j < src.length; j++) {
    if (src[j] === '{') diepte++;
    else if (src[j] === '}') { diepte--; if (!diepte) { eind = j + 1; break; } }
  }
  if (eind === -1) return [];
  const blok = src.slice(i, eind);
  const regels = blok.split('\n');

  const uit = [];
  let taal = null, d = 0;
  for (const r of regels) {
    const kaal = r.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/, '$1');
    const mTaal = /^\s{0,4}(en|nl)\s*:\s*\{/.exec(kaal);
    if (mTaal) { taal = mTaal[1]; d = 0; continue; }
    if (!taal) continue;
    const m = /^\s*([A-Za-z_$][\w$]*)\s*:\s*(.*)$/.exec(kaal);
    if (!m) continue;
    const sleutel = m[1], rest = m[2];
    /* ── EEN TEMPLATE MET EEN TERNARY ERIN IS ÉÉN TEKST ─────────────────────
       `\`${n === 1 ? '1 image' : `${n} images`}\`` bevat aanhalingstekens BINNEN de
       backticks, en een regex die op alle drie de soorten tegelijk zoekt knipt
       hem daar doormidden: er kwam `${n === 1 ? '1 image' :` uit de tabel rollen,
       een halve expressie waar niets aan na te kijken valt. Een backtick-tekst
       wordt daarom als geheel gepakt, met de `${…}` erin geteld zodat een
       accolade binnen de expressie hem niet vroegtijdig afsluit. */
    const strings = [];
    for (let i = 0; i < rest.length; i++) {
      const q = rest[i];
      if (q !== "'" && q !== '"' && q !== '`') continue;
      let j = i + 1, diep = 0, buf = '';
      for (; j < rest.length; j++) {
        if (rest[j] === '\\') { buf += rest[j + 1] ?? ''; j++; continue; }
        if (q === '`' && rest[j] === '$' && rest[j + 1] === '{') { diep++; buf += '${'; j++; continue; }
        if (diep && rest[j] === '}') { diep--; buf += '}'; continue; }
        if (rest[j] === q && !diep) break;
        buf += rest[j];
      }
      const t = buf.replace(/\\n/g, ' ').trim();
      if (t.length > 1) strings.push(t);
      i = j;
    }
    if (!strings.length) continue;
    const isFn = /^\(?[\w\s,()]*\)?\s*=>/.test(rest);
    strings.forEach((s, k) => uit.push({
      taal, sleutel: strings.length > 1 ? `${sleutel}[${k}]` : sleutel, tekst: s, fn: isFn,
    }));
  }
  return uit;
}

function copyGroep(pad, groep, waar) {
  const rij = leesCopy(pad);
  const perSleutel = new Map();
  for (const r of rij) {
    if (!perSleutel.has(r.sleutel)) perSleutel.set(r.sleutel, {});
    perSleutel.get(r.sleutel)[r.taal] = r;
  }
  const bestand = pad.split('/').pop();
  for (const [sleutel, paar] of perSleutel) {
    const enT = paar.en?.tekst || '';
    const nlT = paar.nl?.tekst || '';
    if (!enT && !nlT) continue;
    const bron = `${bestand} › ${sleutel}`;
    const interp = [...new Set([...(enT.match(/\$\{[^}]*\}/g) || []),
                                ...(nlT.match(/\$\{[^}]*\}/g) || [])])]
      .map((s) => s.slice(2, -1).trim().replace(/,\s*'(en|nl)'/g, ''))
      .slice(0, 4);
    voegToe({
      id: id(groep.slug, enT, nlT), groep: groep.naam, waar, slug: groep.slug,
      blok: '', soort: (paar.en || paar.nl).fn ? 'samengesteld' : 'tekst',
      bron, en: enT || null, nl: nlT || null, interp, elders: [],
    });
  }
}

copyGroep('src/lib/portal.js',  { naam: 'VISUAILS Studio', slug: 'studio' }, 'Portaal · bestelling en beelden');
copyGroep('src/lib/account.js', { naam: 'VISUAILS Studio', slug: 'studio' }, 'Account · inloggen, facturen, merkkit');
copyGroep('src/lib/mailTemplate.js', { naam: 'E-mail', slug: 'mail' }, 'De opmaak om elke mail heen');
copyGroep('src/lib/delivery.js', { naam: 'E-mail', slug: 'mail' }, 'Levering en revisie');
copyGroep('src/lib/mail.js', { naam: 'E-mail', slug: 'mail' }, 'Bevestiging en betaallink');

/* ── 4b-bis · DE E-MAILS, DIE GEEN COPY-OBJECT HEBBEN ────────────────────────
 *
 * Alleen invoiceMail.js houdt zijn tekst in een `COPY`. De rest van wat een klant
 * per mail leest staat los in de code, als `nl ? 'Nederlands' : 'English'`. Dat is
 * niet netjes maar het is wél eenduidig: de twee talen staan naast elkaar op
 * dezelfde regel, dus een verkeerde paring kan hier niet ontstaan.
 *
 * Het adres wordt de FUNCTIE waar de zin in staat. Voor een e-mail is dat het
 * beste adres dat er is — `mailGeleverd()` zegt meer over wélk bericht je aan het
 * nakijken bent dan welk regelnummer dan ook.
 *
 * ── admin.js STAAT ER MET OPZET NIET BIJ ────────────────────────────────────
 * Dat bestand heeft de meeste tweetalige regels van allemaal (27), en het is het
 * beheerscherm van Lucas zelf. Een klant leest daar nooit iets. Het in deze tabel
 * zetten zou zevenentwintig regels toevoegen die niemand hoeft na te kijken, en
 * daarmee de regels verdunnen die dat wél moeten. */
const MAILBRONNEN = [
  ['src/lib/mailTemplate.js', 'De opmaak om elke mail heen'],
  ['src/lib/delivery.js', 'Levering en revisie'],
  ['src/lib/invoiceMail.js', 'Facturen en creditnota\'s'],
  ['src/lib/feedback.js', 'De vraag om een reactie'],
  ['src/lib/account.js', 'Inlogcode en inloglink'],
  ['functions/api/order.js', 'Bevestiging en betaallink'],
];

for (const [pad, waar] of MAILBRONNEN) {
  if (!existsSync(pad)) continue;
  const inhoud = readFileSync(pad, 'utf8');
  const bestand = pad.split('/').pop();
  /* `nl ? A : B` en `lang === 'nl' ? A : B`. De Nederlandse tak staat vóór de
     dubbele punt, want zo is de vlag geschreven — nl is de vraag. */
  const pat = /(?:\bnl\b|lang\s*===\s*'nl'|\.lang\s*===\s*'nl')\s*\?\s*(?:'((?:[^'\\]|\\.)*)'|`((?:[^`\\]|\\.)*)`)\s*:\s*(?:'((?:[^'\\]|\\.)*)'|`((?:[^`\\]|\\.)*)`)/g;
  for (const m of inhoud.matchAll(pat)) {
    const nlT = (m[1] ?? m[2] ?? '').replace(/\\'/g, "'").trim();
    const enT = (m[3] ?? m[4] ?? '').replace(/\\'/g, "'").trim();
    if (nlT.length < 4 && enT.length < 4) continue;
    const fn = functieBij(inhoud, m.index);
    voegToe({
      id: id('mail', enT, nlT), groep: 'E-mail', waar, slug: 'mail',
      blok: '', soort: 'tekst',
      bron: `${bestand} › ${fn ? fn + '()' : 'in de opmaak'}`,
      en: enT || null, nl: nlT || null,
      interp: [...new Set([...(enT.match(/\$\{[^}]*\}/g) || []),
                           ...(nlT.match(/\$\{[^}]*\}/g) || [])])]
        .map((x) => x.slice(2, -1).trim().replace(/,\s*'(en|nl)'/g, '')).slice(0, 4),
      elders: [],
    });
  }
}
copyGroep('src/lib/invoiceMail.js', { naam: 'E-mail', slug: 'mail' }, 'Facturen en creditnota\'s');

/* ── 4c · de WhatsApp-berichten ──────────────────────────────────────────────
 *
 * Deze staan verspreid over de site als `waHref('…')` en niet in één object. Ze
 * worden opgehaald waar ze staan, met het bestand erbij — dat is hier het adres.
 *
 * ── HOE DE TWEE TALEN AAN ELKAAR KOMEN ──────────────────────────────────────
 * Drie vormen, en elk paart anders:
 *   · `waHref(nl ? 'NL' : 'EN')` — de twee talen staan op één regel, dus dat is
 *     één rij en er valt niets te verwisselen;
 *   · een `wa:`-sleutel in een copy-object — die draagt zijn taal in het adres
 *     (`en.creditWa` / `nl.creditWa`) en paart op de sleutelnaam;
 *   · een losse `waHref("…")` in de opmaak — die heeft geen sleutel. Die worden
 *     PER BESTAND op volgorde gepaard: elk component schrijft eerst zijn Engelse
 *     blok en dan zijn Nederlandse, in dezelfde volgorde. Lopen de aantallen niet
 *     gelijk, dan wordt er NIET gepaard maar gemeld — een verkeerd gepaarde zin is
 *     erger dan een ongepaarde. Dezelfde regel als bij de pagina's.
 *
 * En ze volgen de apostrofregel niet: ze worden url-gecodeerd en verschijnen in
 * het invoerveld van WhatsApp, op het toetsenbord van de klant. Daar is de rechte
 * apostrof de gewone. Zie tests/schrijfwijze.test.mjs. */
{
  const isNL = (t) => /\b(hoi|ik|je|jouw|mijn|graag|wil|heb|vraag|over|een)\b/i.test(t)
    && !/\b(hi|the|your|would|like|about|question|order|talk)\b/i.test(t);
  const gezien = new Set();
  const scheef = [];

  const zet = (enT, nlT, pad) => {
    const sleutel = `${enT}||${nlT}`;
    if (gezien.has(sleutel)) return;
    gezien.add(sleutel);
    voegToe({
      id: id('wa', enT, nlT), groep: 'WhatsApp',
      waar: 'Het voorgevulde bericht in WhatsApp', slug: 'wa',
      blok: '', soort: 'bericht', bron: `${pad.split('/').pop()} › waHref()`,
      en: enT || null, nl: nlT || null,
      interp: [...new Set([...(enT.match(/\$\{[^}]*\}/g) || []),
                           ...(nlT.match(/\$\{[^}]*\}/g) || [])])]
        .map((x) => x.slice(2, -1).trim().replace(/,\s*'(en|nl)'/g, '')).slice(0, 4),
      elders: [],
    });
  };

  for (const { pad, inhoud } of BRONNEN) {
    const los = { en: [], nl: [] };

    /* 1 · de ternary — twee talen op één regel */
    for (const m of inhoud.matchAll(/waHref\(\s*[\w.]*\bnl\b[\w.]*\s*\?\s*'((?:[^'\\]|\\.)*)'\s*:\s*'((?:[^'\\]|\\.)*)'/g)) {
      zet(m[2].replace(/\\'/g, "'").trim(), m[1].replace(/\\'/g, "'").trim(), pad);
    }

    /* 2 · een sleutel in een copy-object, met de taal uit het adres */
    const perSleutel = new Map();
    for (const m of inhoud.matchAll(/^\s*(wa|waText|creditWa|waMsg)\s*:\s*(?:'((?:[^'\\]|\\.)*)'|`((?:[^`\\]|\\.)*)`)/gm)) {
      const t = (m[2] ?? m[3] ?? '').replace(/\\'/g, "'").trim();
      /* Een los woord ("WhatsApp") is het LABEL van de knop en niet het bericht
         dat erin komt te staan. Dat label staat al bij de pagina waar de knop op
         staat; hier zou het een tweede keer om een oordeel vragen. */
      if (!t || t.length < 8 || !/\s/.test(t) || /^https?:|^wa\.me/.test(t)) continue;
      const adres = sleutelBij(inhoud, m.index) || '';
      const taal = adres.startsWith('nl.') ? 'nl' : adres.startsWith('en.') ? 'en' : (isNL(t) ? 'nl' : 'en');
      const naam = adres.replace(/^(en|nl)\./, '') || m[1];
      if (!perSleutel.has(naam)) perSleutel.set(naam, {});
      perSleutel.get(naam)[taal] = t;
    }
    for (const [, paar] of perSleutel) zet(paar.en || '', paar.nl || '', pad);

    /* 3 · los in de opmaak, gepaard op volgorde binnen dit bestand */
    for (const m of inhoud.matchAll(/waHref\(\s*(?:'((?:[^'\\]|\\.)*)'|"((?:[^"\\]|\\.)*)"|`((?:[^`\\]|\\.)*)`)\s*\)/g)) {
      const t = (m[1] ?? m[2] ?? m[3] ?? '').replace(/\\'/g, "'").trim();
      if (!t || t.length < 8 || !/\s/.test(t)) continue;
      los[isNL(t) ? 'nl' : 'en'].push(t);
    }
    if (los.en.length === los.nl.length) {
      los.en.forEach((e, i) => zet(e, los.nl[i], pad));
    } else {
      if (los.en.length || los.nl.length) scheef.push(`${pad.split('/').pop()} (${los.en.length} EN / ${los.nl.length} NL)`);
      los.en.forEach((e) => zet(e, '', pad));
      los.nl.forEach((n) => zet('', n, pad));
    }
  }
  if (scheef.length) console.log(`\nWhatsApp — niet gepaard omdat de aantallen niet gelijk zijn: ${scheef.join(', ')}`);
}

/* ══ 4d · EEN BELOFTE DIE MAAR VOOR EEN DEEL VAN DE KLANTEN GELDT ════════════
 *
 * Lucas, 26 augustus 2026, wijzend op één regel in het werkblad: *"deze zin is
 * bijvoorbeeld verouderd."* Het ging om `48-uursblok, vast voor je betaalt` —
 * de hero van de homepage, pal onder de knop van de proefvisual van één euro.
 *
 * Die belofte hoort bij de trede `attended` en die begint pas bij
 * WINDOW_THRESHOLD producten. Een proefvisual is één product. De homepage noemt
 * de drempel nergens: het enige "10" op de pagina staat in een rij van de
 * prijsladder en in een verzonnen leverdatum in de mock-up.
 *
 * ── WAAROM DIT EEN REGEL IS EN GEEN LOSSE AANTEKENING ──────────────────────
 *
 * Omdat hij bij de VOLGENDE ronde net zo goed moet werken. Wat hier wordt
 * gemeten is: staat er een belofte in die alleen vanaf de drempel geldt, op een
 * pagina die de drempel nergens noemt, in een zin die de voorwaarde ook niet
 * zelf stelt? Vandaag levert dat precies één regel op — de regel waar hij over
 * viel — en dat is het bewijs dat de vraag scherp genoeg staat. Zou hij er
 * dertig opleveren, dan zou hij niets zeggen.
 *
 * De belofte van de andere trede ("2–4 werkdagen") telt NIET mee: die geldt voor
 * iedereen onder de drempel en dat is de meerderheid, dus hij heeft geen
 * voorwaarde nodig. */
{
  const ALLEEN_ATTENDED = /48[-\s]?(uur|uurs|hour)|gereserveerd tijdvak|reserved [\w\s]{0,14}window|vast voor je betaalt|fixed before you pay/i;
  /* De drempel ECHT genoemd, en niet een "10" uit een prijstabel. */
  const DREMPEL = /(vanaf|from|onder|under|bij)\s*\d+\s*(producten|products)/i;
  /* Een zin die zijn eigen voorwaarde stelt, is in orde. */
  const ZELF = /\bmet een\b|\bwith a\b|heeft je bestelling|an order with|vanaf \d+|from \d+/i;

  const drempelPer = new Map();
  for (const r of rijen) {
    const t = `${r.en || ''} ${r.nl || ''}`;
    if (DREMPEL.test(t)) drempelPer.set(r.waar, true);
  }
  let n = 0;
  for (const r of rijen) {
    const t = `${r.en || ''} ${r.nl || ''}`;
    if (!ALLEEN_ATTENDED.test(t) || ZELF.test(t) || drempelPer.get(r.waar)) continue;
    r.waarschuwing = `deze belofte geldt pas vanaf ${WINDOW_THRESHOLD} producten, en ${r.waar} noemt dat nergens`;
    n++;
  }
  if (n) console.log(`\n${n} regel(s) beloven de gereserveerde levertijd op een pagina die de drempel niet noemt`);
}

/* ══ 5 · WEGSCHRIJVEN ═══════════════════════════════════════════════════════ */
mkdirSync('tekstronde', { recursive: true });

/* Botsende id's melden in plaats van stil overschrijven: twee rijen met hetzelfde
   id maken het terugverwerken dubbelzinnig, en dat is precies wat deze tabel moet
   uitsluiten. */
const perId = new Map();
for (const r of rijen) {
  if (perId.has(r.id)) perId.get(r.id).push(r); else perId.set(r.id, [r]);
}
let botsingen = 0;
for (const [sleutel, groep] of perId) {
  if (groep.length === 1) continue;
  botsingen += groep.length - 1;
  groep.forEach((r, i) => { if (i) r.id = `${sleutel}-${i + 1}`; });
}

writeFileSync('tekstronde/blad.json', JSON.stringify(rijen, null, 1));

const perGroep = new Map();
for (const r of rijen) perGroep.set(r.groep, (perGroep.get(r.groep) || 0) + 1);
console.log(`\n${rijen.length} regels`);
for (const [g, n] of perGroep) console.log(`  ${String(n).padStart(5)}  ${g}`);
console.log(`\n${rijen.filter((r) => r.interp.length).length} regels met een interpolatie`);
console.log(`${rijen.filter((r) => !r.bron).length} regels zonder bronadres`);
console.log(`${rijen.filter((r) => !r.en || !r.nl).length} regels met maar één taal`);
if (botsingen) console.log(`${botsingen} id-botsing(en) opgelost met een achtervoegsel`);
console.log('\ngeschreven: tekstronde/blad.json');
