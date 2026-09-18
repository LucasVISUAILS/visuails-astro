/* Alle zichtbare tekst onder 11,5 pixels op de echte pagina's (niet de
   conceptpagina's), plus de breedte van de talenknop na de vergroting. */
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { extname, join } from 'node:path';
const T={'.html':'text/html','.css':'text/css','.js':'text/javascript','.webp':'image/webp','.png':'image/png','.svg':'image/svg+xml','.woff2':'font/woff2','.avif':'image/avif','.json':'application/json'};
const srv=createServer((q,r)=>{let p=join('dist',decodeURIComponent(q.url.split('?')[0]));
 if(existsSync(p)&&statSync(p).isDirectory())p=join(p,'index.html');
 if(!existsSync(p)&&existsSync(p+'/index.html'))p=p+'/index.html';
 if(!existsSync(p)){r.writeHead(404);return r.end();}
 r.writeHead(200,{'content-type':T[extname(p)]||'application/octet-stream'});r.end(readFileSync(p));});
await new Promise((r)=>srv.listen(4401,r));
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
const pg=await b.newPage({viewport:{width:1280,height:900}});
const paden=['/','/nl/','/catalog/','/nl/catalog/','/pricing/','/nl/pricing/','/test-sample/','/nl/test-sample/','/start/catalog/','/nl/start/catalog/','/about/','/faq/','/portal/','/nl/portal/'];
const gezien=new Map();
for (const pad of paden) {
  await pg.goto('http://localhost:4401'+pad,{waitUntil:'networkidle'});
  await pg.addStyleTag({content:'#cc-bar,[data-cc-bar]{display:none !important}'});
  /* Het menu opendoen: de "Binnenkort"-woorden zitten in een uitklapper. */
  await pg.locator('[data-nav-trigger], .nav-trigger').first().click({timeout:1500}).catch(()=>{});
  await pg.waitForTimeout(350);
  const klein = await pg.evaluate(()=>{
    const uit=[];
    document.querySelectorAll('body *').forEach((el)=>{
      const cs=getComputedStyle(el);
      if(cs.display==='none'||cs.visibility==='hidden'||Number(cs.opacity)===0) return;
      if(el.closest('[aria-hidden="true"]')) return;
      const r=el.getBoundingClientRect(); if(r.width<2||r.height<2) return;
      const eigen=[...el.childNodes].some((n)=>n.nodeType===3&&n.textContent.trim().length>1);
      if(!eigen) return;
      const px=parseFloat(cs.fontSize)||16;
      if(px<11.5) uit.push(`${px.toFixed(1)}px .${(el.className||'').toString().split(' ')[0]} "${el.textContent.trim().slice(0,30)}"`);
    });
    return [...new Set(uit)];
  });
  klein.forEach((k)=>gezien.set(k,(gezien.get(k)||0)+1));
}
const ls = await pg.evaluate(()=>{const a=document.querySelector('.lang-switch .ls');const r=a.getBoundingClientRect();
  return {maat:getComputedStyle(a).fontSize, breed:Math.round(r.width), hoog:Math.round(r.height)};});
console.log('talenknop:', JSON.stringify(ls));
console.log(`\n${gezien.size} soorten tekst onder 11,5px:`);
[...gezien.entries()].forEach(([k,n])=>console.log(`  (${n}×) ${k}`));
await b.close(); srv.close();
