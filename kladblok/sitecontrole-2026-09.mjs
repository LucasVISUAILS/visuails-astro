/*
 * Een brede veeg over de HELE gebouwde site, op zoek naar fouten en
 * inconsistenties die geen enkele bestaande test dekt: consolefouten,
 * mislukte verzoeken, horizontaal overloop, dubbele id's, titels en
 * beschrijvingen, lege knoppen, gebroken beelden en te kleine letters.
 *
 * Alleen kijken. Dit schrijft niets in src/.
 */
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync, readdirSync } from 'node:fs';
import { extname, join, relative } from 'node:path';

const TYPES = { '.html':'text/html','.css':'text/css','.js':'text/javascript','.mjs':'text/javascript',
  '.webp':'image/webp','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.avif':'image/avif',
  '.svg':'image/svg+xml','.woff2':'font/woff2','.json':'application/json','.txt':'text/plain',
  '.ico':'image/x-icon','.xml':'application/xml','.mp4':'video/mp4','.webm':'video/webm' };

const srv = createServer((req,res)=>{
  const url = decodeURIComponent(req.url.split('?')[0]);
  let p = join('dist', url);
  if (existsSync(p) && statSync(p).isDirectory()) p = join(p, 'index.html');
  else if (!existsSync(p) && existsSync(p + '/index.html')) p = p + '/index.html';
  else if (!existsSync(p) && existsSync(p + '.html')) p = p + '.html';
  if (url === '/api/upload') { res.writeHead(200,{'content-type':'application/json'}); return res.end(JSON.stringify({ok:true,file:{key:'nep',name:'p.png',bytes:1}})); }
  if (!existsSync(p)) { res.writeHead(404); return res.end('nee'); }
  res.writeHead(200, { 'content-type': TYPES[extname(p)] || 'application/octet-stream' });
  res.end(readFileSync(p));
});
await new Promise((r)=>srv.listen(4400,r));

const paginas = [];
(function loop(dir) {
  for (const naam of readdirSync(dir, { withFileTypes: true })) {
    const vol = join(dir, naam.name);
    if (naam.isDirectory()) { if (naam.name === '_astro') continue; loop(vol); }
    else if (naam.name === 'index.html') paginas.push('/' + relative('dist', dir).replace(/\\/g,'/') + (dir === 'dist' ? '' : '/'));
    else if (naam.name.endsWith('.html')) paginas.push('/' + relative('dist', vol).replace(/\\/g,'/'));
  }
})('dist');
paginas.sort();
console.log(`${paginas.length} pagina's\n`);

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const bevindingen = [];
const koppen = new Map();     // titel → paden
const omschrijving = new Map();
const zeg = (pad, soort, wat) => bevindingen.push({ pad, soort, wat });

for (const breed of [1280, 390]) {
  const pg = await b.newPage({ viewport: { width: breed, height: 900 } });
  for (const pad of paginas) {
    const fouten = [];
    const mis = [];
    const onConsole = (m) => { if (m.type() === 'error') fouten.push(m.text().slice(0,140)); };
    const onErr = (e) => fouten.push('pageerror: ' + e.message.slice(0,140));
    const onResp = (r) => { if (r.status() >= 400) mis.push(`${r.status()} ${r.url().replace('http://localhost:4400','')}`); };
    pg.on('console', onConsole); pg.on('pageerror', onErr); pg.on('response', onResp);
    try {
      await pg.goto('http://localhost:4400' + pad, { waitUntil: 'networkidle', timeout: 25000 });
    } catch (e) { zeg(pad, 'laden', e.message.split('\n')[0].slice(0,90)); pg.off('console',onConsole); pg.off('pageerror',onErr); pg.off('response',onResp); continue; }
    await pg.addStyleTag({ content: '#cc-bar,[data-cc-bar]{display:none !important}' }).catch(()=>{});
    await pg.waitForTimeout(350);

    const meting = await pg.evaluate((vw) => {
      const zichtbaar = (el) => {
        const cs = getComputedStyle(el);
        if (cs.display === 'none' || cs.visibility === 'hidden' || Number(cs.opacity) === 0) return false;
        const r = el.getBoundingClientRect();
        return r.width > 1 && r.height > 1;
      };
      const uit = { over: document.documentElement.scrollWidth - vw, breed: [], klein: [], leeg: [], stuk: [], zonderAlt: [] };
      document.querySelectorAll('body *').forEach((el) => {
        if (!zichtbaar(el)) return;
        const r = el.getBoundingClientRect();
        if (r.right > vw + 2 && el.children.length === 0 && (el.textContent||'').trim()) {
          uit.breed.push(`${el.tagName.toLowerCase()}.${(el.className||'').toString().split(' ')[0]} → ${Math.round(r.right)}px "${(el.textContent||'').trim().slice(0,28)}"`);
        }
        const eigen = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim().length > 1);
        if (eigen) {
          const px = parseFloat(getComputedStyle(el).fontSize) || 16;
          if (px < 11.5) uit.klein.push(`${px.toFixed(1)}px ${el.tagName.toLowerCase()}.${(el.className||'').toString().split(' ')[0]} "${el.textContent.trim().slice(0,24)}"`);
        }
      });
      document.querySelectorAll('a, button').forEach((el) => {
        if (!zichtbaar(el)) return;
        const naam = (el.getAttribute('aria-label') || el.textContent || el.title || '').trim()
          || [...el.querySelectorAll('img')].map((i)=>i.alt).join('').trim();
        if (!naam) uit.leeg.push(`${el.tagName.toLowerCase()} ${(el.className||'').toString().slice(0,40)}`);
      });
      document.querySelectorAll('img').forEach((im) => {
        if (!im.complete || (im.naturalWidth === 0 && im.getAttribute('loading') !== 'lazy')) uit.stuk.push(im.currentSrc || im.src);
        if (im.alt === null || im.alt === undefined) uit.zonderAlt.push(im.src);
      });
      const ids = {};
      document.querySelectorAll('[id]').forEach((el) => { ids[el.id] = (ids[el.id] || 0) + 1; });
      return {
        ...uit,
        dubbeleIds: Object.entries(ids).filter(([, n]) => n > 1).map(([k, n]) => `${k}×${n}`),
        titel: (document.title || '').trim(),
        omschrijving: (document.querySelector('meta[name="description"]')?.content || '').trim(),
        taal: document.documentElement.lang || '',
        h1: [...document.querySelectorAll('h1')].map((h)=>h.textContent.trim().slice(0,40)),
      };
    }, breed);

    if (fouten.length) zeg(pad, `console@${breed}`, fouten.slice(0,2).join(' | '));
    if (mis.length) zeg(pad, `verzoek@${breed}`, [...new Set(mis)].slice(0,3).join(' | '));
    if (meting.over > 2) zeg(pad, `overloop@${breed}`, `${meting.over}px breder dan het scherm${meting.breed.length ? ' — ' + meting.breed.slice(0,2).join(' ; ') : ''}`);
    if (meting.klein.length) zeg(pad, `klein@${breed}`, [...new Set(meting.klein)].slice(0,3).join(' ; '));
    if (meting.leeg.length) zeg(pad, `naamloos@${breed}`, [...new Set(meting.leeg)].slice(0,3).join(' ; '));
    if (meting.stuk.length) zeg(pad, `beeld@${breed}`, [...new Set(meting.stuk)].slice(0,2).join(' ; '));
    if (meting.dubbeleIds.length) zeg(pad, `dubbel-id@${breed}`, meting.dubbeleIds.slice(0,4).join(', '));
    if (breed === 1280) {
      if (!meting.titel) zeg(pad, 'titel', 'ontbreekt');
      else koppen.set(meting.titel, [...(koppen.get(meting.titel) || []), pad]);
      if (!meting.omschrijving) zeg(pad, 'omschrijving', 'ontbreekt');
      else {
        omschrijving.set(meting.omschrijving, [...(omschrijving.get(meting.omschrijving) || []), pad]);
        if (meting.omschrijving.length > 165) zeg(pad, 'omschrijving', `${meting.omschrijving.length} tekens (>165 wordt afgekapt)`);
      }
      if (!meting.taal) zeg(pad, 'taal', 'geen lang-attribuut');
      if (meting.h1.length !== 1) zeg(pad, 'h1', `${meting.h1.length} stuks: ${meting.h1.join(' / ').slice(0,70)}`);
    }
    pg.off('console',onConsole); pg.off('pageerror',onErr); pg.off('response',onResp);
  }
  await pg.close();
}
await b.close(); srv.close();

for (const [t, p] of koppen) if (p.length > 1) bevindingen.push({ pad: p.join(', ').slice(0,80), soort: 'dubbele titel', wat: t.slice(0,70) });
for (const [d, p] of omschrijving) if (p.length > 1) bevindingen.push({ pad: p.join(', ').slice(0,80), soort: 'dubbele omschrijving', wat: d.slice(0,60) });

const perSoort = {};
bevindingen.forEach((f) => { (perSoort[f.soort] ||= []).push(f); });
console.log(`${bevindingen.length} bevindingen\n`);
for (const soort of Object.keys(perSoort).sort()) {
  console.log(`── ${soort} (${perSoort[soort].length}) ─────────────────────`);
  perSoort[soort].slice(0, 12).forEach((f) => console.log(`  ${f.pad.padEnd(34)} ${f.wat}`));
  if (perSoort[soort].length > 12) console.log(`  … en nog ${perSoort[soort].length - 12}`);
}
