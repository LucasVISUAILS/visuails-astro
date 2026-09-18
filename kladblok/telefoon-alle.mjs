/* Elke pagina, drie telefoonbreedtes, en alleen wat ECHT wordt afgesneden:
   niet in een schuifstrook, niet in de dichte la, niet zwevend. */
import { chromium, devices } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync, readdirSync } from 'node:fs';
import { extname, join, relative } from 'node:path';
const T={'.html':'text/html','.css':'text/css','.js':'text/javascript','.webp':'image/webp','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml','.woff2':'font/woff2','.avif':'image/avif','.json':'application/json','.mp4':'video/mp4','.ico':'image/x-icon'};
const srv=createServer((q,r)=>{const u=decodeURIComponent(q.url.split('?')[0]);let p=join('dist',u);
 if(existsSync(p)&&statSync(p).isDirectory())p=join(p,'index.html');
 else if(!existsSync(p)&&existsSync(p+'/index.html'))p=p+'/index.html';
 if(!existsSync(p)){r.writeHead(404);return r.end();}
 r.writeHead(200,{'content-type':T[extname(p)]||'application/octet-stream'});r.end(readFileSync(p));});
await new Promise((r)=>srv.listen(4412,r));
const paginas=[];
(function loop(d){for(const e of readdirSync(d,{withFileTypes:true})){const v=join(d,e.name);
 if(e.isDirectory()){if(e.name==='_astro')continue;loop(v);}
 else if(e.name==='index.html')paginas.push('/'+relative('dist',d).replace(/\\/g,'/')+(d==='dist'?'':'/'));}})('dist');
const doel=paginas.filter((p)=>!p.startsWith('/concept')).sort();
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
let raak=0;
for (const breed of [320, 360, 412]) {
  const ctx=await b.newContext({...devices['Pixel 5'], viewport:{width:breed,height:850}});
  const pg=await ctx.newPage();
  for (const pad of doel) {
    try { await pg.goto(`http://localhost:4412${pad}`,{waitUntil:'networkidle',timeout:25000}); } catch { continue; }
    await pg.waitForTimeout(200);
    const vast = await pg.evaluate((vw)=>{
      const uit=[];
      document.querySelectorAll('body *').forEach((el)=>{
        const cs=getComputedStyle(el);
        if(cs.display==='none'||cs.visibility==='hidden'||cs.position==='fixed') return;
        if(el.closest('[inert], [aria-hidden="true"]')) return;
        const eigen=[...el.childNodes].some((n)=>n.nodeType===3&&n.textContent.trim().length>1);
        if(!eigen) return;
        const box=el.getBoundingClientRect();
        if(box.right <= vw+1) return;
        let p=el.parentElement, schuift=false;
        while(p && p!==document.body){ const c=getComputedStyle(p);
          if(/(auto|scroll)/.test(c.overflowX) && p.scrollWidth > p.clientWidth+1){schuift=true;break;} p=p.parentElement; }
        if(!schuift) uit.push(`${el.tagName.toLowerCase()}.${(el.className||'').toString().trim().split(/\s+/)[0]||'-'} tot ${Math.round(box.right)}px "${el.textContent.trim().slice(0,30)}"`);
      });
      return [...new Set(uit)];
    }, breed);
    if (vast.length) { raak++; console.log(`\n${pad} @${breed}px`); vast.slice(0,4).forEach((v)=>console.log('   '+v)); }
  }
  await ctx.close();
}
await b.close(); srv.close();
console.log(`\n${doel.length} pagina's × 320/360/412 px — ${raak} meldingen`);
