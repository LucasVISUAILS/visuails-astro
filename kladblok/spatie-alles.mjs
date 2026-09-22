/**
 * ══════════════════════════════════════════════════════════════════════════
 * DE SPATIESCAN — ruimte gemeten in de browser, op elke pagina
 * ══════════════════════════════════════════════════════════════════════════
 *
 * Lucas, ronde 23 (C4): *"Tekst te dicht op knoppen, tekst of foto's. Meten,
 * niet gokken."* En C5: *"Teksten op gelijke hoogte — nu rommelig door
 * ongelijke baselines."*
 *
 * Daarom leest dit script GEEN CSS. Elke regel hieronder komt uit
 * getBoundingClientRect() op het echte, opgebouwde scherm: marges klappen
 * samen, `gap` telt mee, een `margin-top` die door een buurman wordt
 * opgeslokt bestaat niet. Wat je meet is wat je ziet.
 *
 * VIER METINGEN, elk met een reden en geen van alle een smaakoordeel:
 *
 *  A · KOPNABIJHEID. Een kop hoort dichter bij de tekst ERONDER te staan dan
 *      bij wat erboven staat — hij is het opschrift van wat volgt. Staat het
 *      andersom, dan leest de kop als de staart van het vorige blok. Dat is
 *      geen kwestie van hoeveel ruimte, maar van welke kant.
 *
 *      TWEE UITZONDERINGEN, allebei gevonden bij de eerste proefdraai:
 *      · EEN WENKBRAUW HOORT BIJ DE KOP. Staat er een etiket boven ("WAT WE
 *        MAKEN", klein en in kapitalen), dan is een klein gat daarboven juist
 *        goed — die twee zijn één ding. Een vorige buur die als label leest
 *        (onder 14px, kapitalen of ruime letterafstand, of een etiketklasse)
 *        telt daarom niet mee.
 *      · DRIE PIXELS IS GEEN FOUT. De eerste versie meldde "8 boven / 11
 *        onder". Gemeld wordt nu pas wanneer de ruimte eronder minstens 6px
 *        én een derde groter is: dan is het een verschil dat je ziet.
 *
 *  B · REGELAFSTAND. Tekst over meer dan één regel met te weinig
 *      regelafstand. DE ONDERGRENS HANGT VAN DE MAAT AF, en dat is geen
 *      soepelheid maar typografie: 1,35 is de grens voor lopende tekst, maar
 *      een tagline van 27px op 1,20 is precies goed — hoe groter de letter,
 *      hoe minder lucht een regel nodig heeft. De eerste proefdraai meldde
 *      tien taglines en nul echte fouten. Nu: onder 20px geldt 1,35, daarboven
 *      1,05 (dan raken de staarten de stokken van de regel eronder echt).
 *
 *      EN KAPITALEN HEBBEN GEEN STAARTEN. De perskop op /how-it-works staat
 *      op 0,94 en kwam als fout binnen; nagekeken in beeld staat hij precies
 *      goed, want in DIE ZIET ALLEEN DAGEN komt geen enkele letter onder de
 *      basislijn. Bij `text-transform: uppercase` zakt de vloer daarom naar
 *      0,90 — dat is de stand waarop de kapitalen zelf elkaar gaan raken.
 *
 *  C · TEKST TEGEN EEN KNOP OF EEN BEELD. Twee buren waarvan er één tekst is
 *      en de ander een knop, een beeld of een invoerveld, met minder dan 10px
 *      ertussen. Dat is de klacht letterlijk.
 *
 *      MAAR NIET EEN LABEL BOVEN ZIJN EIGEN VELD, en ook niet een hint
 *      eronder. Die horen juist dicht op elkaar — dat is wat ze tot één veld
 *      maakt. De eerste proefdraai meldde het hele contactformulier; dat was
 *      de meting die fout stond, niet het formulier.
 *
 *  D · OVERLAP. Twee buren die elkaar verticaal overlappen terwijl ze allebei
 *      tekst dragen. Dat is nooit goed en bijna altijd een negatieve marge of
 *      een vaste hoogte die te klein is.
 *
 * WAT ER NIET IN ZIT: alles wat absoluut gepositioneerd is, alles onder een
 * `aria-hidden`, alles wat niet zichtbaar is (`checkVisibility`), en alles in
 * een tekening (`.lc-*` — de nepwebshop in de laptop is met opzet klein).
 *
 * EN GEEN INLINE-ELEMENTEN. Twee <a>'s in één alinea staan op dezelfde regel
 * of op twee regels die elkaar in het vak overlappen; dat is gewoon tekst die
 * loopt. De eerste proefdraai meldde vier van die "overlappen" op
 * /how-it-works en alle vier waren het een link in een zin. Alleen kinderen
 * die zelf een blok zijn (block, flex, grid, list-item, table) worden met
 * elkaar vergeleken — voor die geldt dat ze ónder elkaar horen te staan.
 *
 *   node kladblok/spatie-alles.mjs [pad ...]
 */
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';

const PADEN = process.argv.length > 2 ? process.argv.slice(2)
  : JSON.parse(readFileSync('kladblok/_paden.json', 'utf8')).map((p) => (p === '/' ? '/nl/' : '/nl' + p));
const BREEDTES = [[1440, 950], [390, 844]];

const METEN = () => {
  const uit = { kop: [], regel: [], dicht: [], overlap: [] };
  const naam = (el) => el.tagName.toLowerCase() + (el.className && typeof el.className === 'string'
    ? '.' + el.className.split(' ').filter(Boolean).slice(0, 2).join('.') : '');
  const tekstVan = (el) => [...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent.trim()).join(' ').trim();
  const telt = (el) => {
    if (!el.checkVisibility?.()) return false;
    const s = getComputedStyle(el);
    if (s.position === 'absolute' || s.position === 'fixed') return false;
    if (el.closest('[aria-hidden="true"]')) return false;
    if (el.closest('[class*="lc-"], .proefkaart, .cc, svg')) return false;
    const r = el.getBoundingClientRect();
    return r.width > 4 && r.height > 4;
  };
  /* Alleen blokken staan onder elkaar; inline is tekst die loopt. */
  const isBlok = (el) => /^(block|flex|grid|list-item|table|flow-root)$/.test(getComputedStyle(el).display);
  const isTekst = (el) => tekstVan(el).length > 2;
  const isObject = (el) => /^(img|picture|button|input|select|textarea|video)$/.test(el.tagName.toLowerCase())
    || el.classList.contains('btn') || el.classList.contains('knop') || el.classList.contains('vis');

  for (const ouder of document.querySelectorAll('body *')) {
    const kinderen = [...ouder.children].filter((e) => telt(e) && isBlok(e));
    if (kinderen.length < 2) continue;
    for (let i = 0; i < kinderen.length - 1; i++) {
      const a = kinderen[i], b = kinderen[i + 1];
      const ra = a.getBoundingClientRect(), rb = b.getBoundingClientRect();
      /* Naast elkaar in plaats van onder elkaar: dan meet dit niets. */
      if (rb.top < ra.bottom - 2 && !(rb.top >= ra.bottom - 2)) {
        if (rb.left >= ra.right - 2 || ra.left >= rb.right - 2) continue;
        if (isTekst(a) && isTekst(b)) {
          uit.overlap.push(`${naam(a)} ⇄ ${naam(b)}  ${Math.round(ra.bottom - rb.top)}px overlap`);
        }
        continue;
      }
      const gat = Math.round(rb.top - ra.bottom);
      if (gat < 0) continue;
      /* C · tekst tegen een knop of een beeld — behalve binnen één veld */
      const eenVeld = a.tagName === 'LABEL' || b.tagName === 'LABEL'
        || a.classList.contains('hint') || b.classList.contains('hint')
        || !!ouder.closest('.field, .pl-veld');
      if (gat < 10 && !eenVeld && ((isTekst(a) && isObject(b)) || (isObject(a) && isTekst(b)))) {
        uit.dicht.push(`${gat}px  ${naam(a)} → ${naam(b)}  "${(tekstVan(a) || tekstVan(b)).slice(0, 26)}"`);
      }
    }
  }

  /* A · kopnabijheid */
  const isLabel = (el) => {
    if (/etiket|eyebrow|kicker|label|naam|tag/i.test(String(el.className))) return true;
    const s = getComputedStyle(el);
    return parseFloat(s.fontSize) < 14
      && (s.textTransform === 'uppercase' || parseFloat(s.letterSpacing) > 0.5);
  };
  for (const k of document.querySelectorAll('h1, h2, h3, h4, .display')) {
    if (!telt(k) || !isTekst(k)) continue;
    const vorige = [...(k.parentElement?.children || [])].filter(telt);
    const i = vorige.indexOf(k);
    if (i <= 0 || i >= vorige.length - 1) continue;
    if (isLabel(vorige[i - 1])) continue;              // een wenkbrauw hoort bij de kop
    const rk = k.getBoundingClientRect();
    const rb = vorige[i - 1].getBoundingClientRect();
    const rn = vorige[i + 1].getBoundingClientRect();
    if (rb.bottom > rk.top || rk.bottom > rn.top) continue;   // niet onder elkaar
    const boven = Math.round(rk.top - rb.bottom), onder = Math.round(rn.top - rk.bottom);
    if (onder - boven >= 6 && boven < onder * 0.75) {
      uit.kop.push(`${boven}px boven / ${onder}px onder  ${naam(k)}  "${tekstVan(k).slice(0, 28)}"`);
    }
  }

  /* B · regelafstand */
  for (const el of document.querySelectorAll('p, li, dd, dt, figcaption, blockquote, .hint, .lead')) {
    if (!telt(el) || !isTekst(el)) continue;
    const s = getComputedStyle(el);
    const px = parseFloat(s.fontSize), lh = parseFloat(s.lineHeight);
    if (!(px >= 13) || !Number.isFinite(lh)) continue;
    const regels = el.getClientRects().length || 1;
    const hoogte = el.getBoundingClientRect().height;
    if (hoogte < px * 2) continue;                     // één regel: regelafstand doet niets
    const factor = lh / px;
    const vloer = s.textTransform === 'uppercase' ? 0.90 : px < 20 ? 1.35 : 1.05;
    if (factor < vloer) {
      uit.regel.push(`${factor.toFixed(2)} (vloer ${vloer})  ${Math.round(px)}px  ${naam(el)}  "${tekstVan(el).slice(0, 26)}"`);
    }
  }
  return uit;
};

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const totaal = { kop: 0, regel: 0, dicht: 0, overlap: 0 };
const uniek = { kop: new Map(), regel: new Map(), dicht: new Map(), overlap: new Map() };
for (const [w, h] of BREEDTES) {
  const ctx = await b.newContext({ viewport: { width: w, height: h } });
  const p = await ctx.newPage();
  for (const pad of PADEN) {
    const r = await p.goto('http://127.0.0.1:4399' + pad, { waitUntil: 'load' }).catch(() => null);
    if (!r || r.status() !== 200) continue;
    await p.evaluate(() => document.fonts.ready);
    await p.evaluate(() => { document.querySelectorAll('.cc, [class*="cookie"]').forEach((e) => e.remove()); });
    await p.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 600) { window.scrollTo(0, y); await new Promise((x) => setTimeout(x, 35)); } window.scrollTo(0, 0); });
    await p.waitForTimeout(300);
    const uit = await p.evaluate(METEN);
    for (const soort of Object.keys(totaal)) {
      for (const regel of uit[soort]) {
        totaal[soort]++;
        const k = regel.replace(/^\d+px |^[\d.]+ /, '');
        if (!uniek[soort].has(k)) uniek[soort].set(k, { regel, waar: new Set() });
        uniek[soort].get(k).waar.add(`${pad} ${w}`);
      }
    }
  }
  await ctx.close();
}
await b.close();

const kop = { kop: 'A · KOP STAAT DICHTER BIJ WAT ERBOVEN STAAT', regel: 'B · REGELAFSTAND ONDER DE VLOER', dicht: 'C · TEKST TEGEN EEN KNOP OF BEELD (<10px)', overlap: 'D · OVERLAPPENDE TEKST' };
for (const soort of ['overlap', 'dicht', 'kop', 'regel']) {
  const lijst = [...uniek[soort].values()];
  console.log(`\n${kop[soort]} — ${lijst.length} soorten, ${totaal[soort]} keer`);
  for (const v of lijst.slice(0, 25)) console.log(`   ${v.regel.padEnd(62)} (${[...v.waar].slice(0, 2).join(', ')}${v.waar.size > 2 ? ` +${v.waar.size - 2}` : ''})`);
  if (lijst.length > 25) console.log(`   … en nog ${lijst.length - 25} soorten`);
}
console.log(`\n${PADEN.length} pagina's × ${BREEDTES.length} breedtes`);
