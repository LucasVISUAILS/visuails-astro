// Consistentieronde: per pagina de vorm van de opening, het ritme tussen de
// blokken en het slot. node kladblok/_consistentie.mjs [breedte]
import { chromium } from 'playwright';
import { globSync } from 'node:fs';
const W = Number(process.argv[2] || 1440);
const paden = globSync('dist/nl/**/index.html').map((f) => '/' + f.replace(/^dist\//, '').replace(/index\.html$/, ''))
  .filter((p) => !/\/(account|admin|o|portal|start\/|thank-you|terms|privacy|cookie-policy|data-processing-agreement|ai-act)/.test(p) || /\/start\/$/.test(p));
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const p = await b.newPage({ viewport: { width: W, height: 900 } });
const rijen = [];
for (const pad of paden.sort()) {
  await p.goto('http://127.0.0.1:4399' + pad, { waitUntil: 'domcontentloaded' });
  await p.addStyleTag({ content: '*{transition:none!important;animation:none!important} .reveal,.pending{opacity:1!important;transform:none!important}' });
  const r = await p.evaluate(() => {
    const main = document.querySelector('main') || document.body;
    const secties = [...main.querySelectorAll('section')].filter((s) => !s.parentElement.closest('section') && s.getBoundingClientRect().height > 40);
    const eerste = secties[0];
    const h1 = document.querySelector('h1');
    const cs = h1 ? getComputedStyle(h1) : null;
    const open = eerste ? {
      etiket: !!eerste.querySelector('.etiket, .eyebrow'),
      h1klas: h1 ? h1.className.replace(/astro-\S+/g, '').trim() : '-',
      h1px: cs ? Math.round(parseFloat(cs.fontSize)) : 0,
      lead: !!eerste.querySelector('.lopend, .lede, .lead'),
      knoppen: eerste.querySelectorAll('a.knop, button.knop').length,
      beeld: !!eerste.querySelector('img, figure, [data-placeholder], .lc'),
      h: Math.round(eerste.getBoundingClientRect().height),
      h1top: h1 ? Math.round(h1.getBoundingClientRect().top + scrollY) : 0,
    } : null;
    const gaten = [];
    for (let i = 1; i < secties.length; i++) {
      gaten.push(Math.round(secties[i].getBoundingClientRect().top - secties[i - 1].getBoundingClientRect().bottom));
    }
    const pads = secties.map((s) => Math.round(parseFloat(getComputedStyle(s).paddingTop)));
    const laatste = secties[secties.length - 1];
    return { open, n: secties.length, gaten: [...new Set(gaten)].join('/'), pads: [...new Set(pads)].join('/'),
      slot: laatste ? laatste.className.includes('paneel-slot') : false,
      slotKnoppen: laatste ? laatste.querySelectorAll('a.knop:not([hidden])').length : 0,
      hoog: document.documentElement.scrollHeight };
  });
  rijen.push({ pad, ...r });
}
await b.close();
for (const x of rijen) {
  const o = x.open || {};
  console.log(`${x.pad.padEnd(34)} ${String(x.hoog).padStart(6)}px ${String(x.n).padStart(2)} blokken | open: ${o.etiket ? 'etiket' : '------'} h1 ${o.h1px}px "${o.h1klas}" ${o.lead ? 'lead' : '----'} ${o.knoppen} knop ${o.beeld ? 'beeld' : '-----'} top ${o.h1top} | gaten ${x.gaten} | pad ${x.pads} | slot ${x.slot ? x.slotKnoppen + ' knop' : 'GEEN'}`);
}
