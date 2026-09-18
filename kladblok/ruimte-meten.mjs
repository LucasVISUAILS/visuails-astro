/**
 * Hoe krap staat het bestelformulier erbij?
 * Lucas, 17 september 2026: *"De ruimte in het bestelformulier is ook heel
 * slecht en mag veel meer ruimte gebruiken dan nu, het voelt heel krap allemaal
 * nu en ruimte tussen lijnen en tekst mogen ook van elkaar af."*
 */
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join } from 'node:path';
const ROOT='/home/claude/repo/dist/';
const MIME={'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.avif':'image/avif','.json':'application/json','.woff2':'font/woff2'};
const server=createServer(async(req,res)=>{let f=join(ROOT,decodeURIComponent(req.url.split('?')[0]));try{if((await stat(f)).isDirectory())f=join(f,'index.html');}catch{try{await stat(f+'.html');f+='.html';}catch{res.writeHead(404);return res.end();}}try{const b=await readFile(f);res.writeHead(200,{'content-type':MIME[extname(f)]||'application/octet-stream'});res.end(b);}catch{res.writeHead(404);res.end();}});
await new Promise(r=>server.listen(0,r));
const base=`http://127.0.0.1:${server.address().port}`;
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
const pg=await b.newPage({viewport:{width:1440,height:1000}});
await pg.goto(`${base}/nl/start/catalog`,{waitUntil:'domcontentloaded'});
await pg.waitForTimeout(1800);
await pg.addStyleTag({content:'#cc-bar,[data-cc-bar]{display:none !important}'});
await pg.evaluate(()=>{const s=document.querySelector('select[name="products"]');if(s){s.value='2';s.dispatchEvent(new Event('change',{bubbles:true}));}});
await pg.waitForTimeout(500);

const meet = (naam) => pg.evaluate((n) => {
  const m = (sel, props) => {
    const e = document.querySelector(sel);
    if (!e) return `${sel}: ontbreekt`;
    const c = getComputedStyle(e);
    const r = e.getBoundingClientRect();
    const uit = props.map((p) => `${p}=${c[p]}`).join(' ');
    return `${sel.padEnd(26)} ${uit}  [${Math.round(r.width)}×${Math.round(r.height)}]`;
  };
  return [
    m('.pl-form', ['maxWidth']),
    m('[data-pl-step="1"]', ['paddingTop', 'paddingBottom']),
    m('.pl-h', ['fontSize', 'lineHeight', 'marginBottom']),
    m('.pl-lead', ['fontSize', 'lineHeight', 'marginBottom', 'maxWidth']),
    m('.field', ['marginBottom']),
    m('.dc-sum', ['paddingTop', 'paddingBottom', 'minHeight']),
    m('.dc-label', ['fontSize', 'lineHeight']),
    m('.pu-card', ['padding', 'lineHeight']),
    m('.pu-slots', ['gap', 'marginTop']),
    m('.pu-slot-how', ['fontSize', 'lineHeight']),
    m('.pu-slot-woord', ['gap']),
    m('.pu-head', ['gap']),
    m('.hint', ['fontSize', 'lineHeight']),
  ].join('\n');
}, naam);

console.log(await meet());
await b.close(); server.close();
