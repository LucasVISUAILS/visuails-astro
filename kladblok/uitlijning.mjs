/* Lijnt de annotatielaag van de huid uit met de tekst? Meet de x van de
   maatverdeling op een hoofdnaad en van het zoekerkader, en zet ze naast de
   linkerrand van de inhoud. */
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, extname } from 'node:path';
import { chromium } from 'playwright';
const DIST='/tmp/vb/dist';
const MIME={'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.webp':'image/webp','.avif':'image/avif','.png':'image/png','.jpg':'image/jpeg','.woff2':'font/woff2','.ico':'image/x-icon','.json':'application/json'};
const server=createServer((req,res)=>{let f=join(DIST,decodeURIComponent(req.url.split('?')[0]));if(!extname(f))f=join(f,'index.html');readFile(f).then(b=>{res.writeHead(200,{'content-type':MIME[extname(f)]||'application/octet-stream'});res.end(b);},()=>{res.writeHead(404);res.end();});});
await new Promise(r=>server.listen(8091,r));
const EXE='/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const b=await chromium.launch(existsSync(EXE)?{executablePath:EXE}:{});
console.log('scherm  inhoud-links  maatverdeling  zoekerkader');
for (const w of [1280, 1600, 1920, 2560]) {
  const p=await b.newPage({viewport:{width:w,height:1000}});
  await p.goto('http://localhost:8091/',{waitUntil:'networkidle'});
  await p.waitForTimeout(600);
  const m=await p.evaluate(()=>{
    const c=[...document.querySelectorAll('.container')].filter(e=>!e.classList.contains('bleed')&&e.getBoundingClientRect().width>0)
      .sort((a,z)=>z.getBoundingClientRect().width-a.getBoundingClientRect().width)[0];
    const cs=c?getComputedStyle(c):null;
    const inhoud=c?Math.round(c.getBoundingClientRect().left+parseFloat(cs.paddingInlineStart)):null;
    const naad=document.querySelector('.sch-naad.hoofd');
    const naadX=naad?Math.round(parseFloat(getComputedStyle(naad,'::before').left)+naad.getBoundingClientRect().left):null;
    const kader=document.querySelector('.sel-laag.hero');
    const kaderX=kader?Math.round(kader.getBoundingClientRect().left):null;
    return {inhoud,naadX,kaderX};
  });
  console.log(String(w).padStart(5), String(m.inhoud).padStart(13), String(m.naadX ?? '—').padStart(14), String(m.kaderX ?? '—').padStart(12));
  await p.close();
}
await b.close(); server.close();
