/* Alleen de pagina's die eerder een melding gaven, nu mét de vraag: valt er
   te schuiven? Een strook die je opzij kunt vegen is geen fout; een tekst die
   wordt afgesneden zonder schuifmogelijkheid wel. */
import { chromium, devices } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { extname, join } from 'node:path';
const T={'.html':'text/html','.css':'text/css','.js':'text/javascript','.webp':'image/webp','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml','.woff2':'font/woff2','.avif':'image/avif','.json':'application/json','.mp4':'video/mp4'};
const srv=createServer((q,r)=>{const u=decodeURIComponent(q.url.split('?')[0]);let p=join('dist',u);
 if(existsSync(p)&&statSync(p).isDirectory())p=join(p,'index.html');
 else if(!existsSync(p)&&existsSync(p+'/index.html'))p=p+'/index.html';
 if(!existsSync(p)){r.writeHead(404);return r.end();}
 r.writeHead(200,{'content-type':T[extname(p)]||'application/octet-stream'});r.end(readFileSync(p));});
await new Promise((r)=>srv.listen(4408,r));
const PADEN = process.argv.slice(2);
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
for (const breed of [320, 360, 412]) {
  const ctx=await b.newContext({...devices['Pixel 5'], viewport:{width:breed,height:850}});
  const pg=await ctx.newPage();
  for (const pad of PADEN) {
    await pg.goto('http://localhost:4408'+pad,{waitUntil:'networkidle'}).catch(()=>{});
    await pg.waitForTimeout(250);
    const r = await pg.evaluate((vw)=>{
      const uit=[];
      document.querySelectorAll('body *').forEach((el)=>{
        const cs=getComputedStyle(el);
        if(cs.display==='none'||cs.visibility==='hidden'||cs.position==='fixed') return;
        if(el.closest('[inert], [aria-hidden="true"]')) return;
        const eigen=[...el.childNodes].some((n)=>n.nodeType===3&&n.textContent.trim().length>1);
        if(!eigen) return;
        const box=el.getBoundingClientRect();
        if(box.right <= vw+1) return;
        /* Kun je erheen schuiven? Loop omhoog tot iets dat horizontaal schuift. */
        let p=el.parentElement, schuift=null;
        while(p && p!==document.body){
          const c=getComputedStyle(p);
          if(/(auto|scroll)/.test(c.overflowX) && p.scrollWidth > p.clientWidth + 1){ schuift=`${p.tagName.toLowerCase()}.${(p.className||'').toString().trim().split(/\s+/)[0]||'-'}`; break; }
          p=p.parentElement;
        }
        uit.push({wie:`${el.tagName.toLowerCase()}.${(el.className||'').toString().trim().split(/\s+/)[0]||'-'}`,
          rechts:Math.round(box.right), schuift, tekst:el.textContent.trim().slice(0,30)});
      });
      return uit;
    }, breed);
    const vast = r.filter((x)=>!x.schuift);
    if (vast.length) {
      console.log(`\n${pad}  @${breed}px — ${vast.length} afgesneden zonder schuifmogelijkheid`);
      [...new Map(vast.map((v)=>[v.wie+v.tekst,v])).values()].slice(0,5)
        .forEach((v)=>console.log(`   ${v.wie.padEnd(20)} tot ${v.rechts}px  "${v.tekst}"`));
    }
  }
  await ctx.close();
}
await b.close(); srv.close();
