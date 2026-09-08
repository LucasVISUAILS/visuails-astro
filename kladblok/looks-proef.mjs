import { chromium } from 'playwright';
import http from 'node:http'; import { readFile, stat } from 'node:fs/promises'; import path from 'node:path';
import { browserPad } from '../scripts/lib/browserpad.mjs';
const ROOT='/home/claude/repo/dist'; const PORT=8099;
const T={'.html':'text/html','.js':'text/javascript','.css':'text/css','.webp':'image/webp','.svg':'image/svg+xml','.png':'image/png','.woff2':'font/woff2','.avif':'image/avif'};
const srv=http.createServer(async(req,res)=>{const u=new URL(req.url,'http://x');let p=path.join(ROOT,decodeURIComponent(u.pathname));try{if((await stat(p)).isDirectory())p=path.join(p,'index.html')}catch{}try{const b=await readFile(p);res.writeHead(200,{'content-type':T[path.extname(p)]||'application/octet-stream'});res.end(b)}catch{res.writeHead(404);res.end()}}).listen(PORT);
const b=await chromium.launch({executablePath:browserPad()});
const paden = process.argv.slice(2).length ? process.argv.slice(2) : ['/nl/lifestyle/','/nl/catalog/','/nl/video/'];
for (const [w,h,tag] of [[1440,3600,'desk'],[390,3600,'mob']]) {
  const ctx=await b.newContext({viewport:{width:w,height:h},deviceScaleFactor:1,isMobile:w<500,hasTouch:w<500});
  for (const p of paden) {
    const page=await ctx.newPage();
    /* lui laden uitzetten in het document zelf: anders staat de halve waaier
       leeg op een schermafdruk van een sectie die buiten beeld begint. */
    await page.route('**', async (route) => {
      if (route.request().resourceType() !== 'document') return route.continue();
      const res = await route.fetch();
      let body = await res.text();
      body = body.replace(/loading="lazy"/g, 'loading="eager"');
      return route.fulfill({ response: res, body });
    });
    await page.goto(`http://127.0.0.1:${PORT}${p}`,{waitUntil:'load',timeout:15000});
    await page.evaluate(()=>{
      document.querySelectorAll('.reveal').forEach(el=>el.classList.remove('pending'));
      window.scrollTo(0, document.body.scrollHeight);
    });
    await page.waitForTimeout(1200);
    await page.evaluate(()=>window.scrollTo(0,0));
    await page.waitForTimeout(400);
    const naam = p.replace(/\W+/g,'-').replace(/^-|-$/g,'');
    const doos = await page.evaluate(()=>{ const el=document.querySelector('#looks'); if(!el) return null; const r=el.getBoundingClientRect(); return {x:0,y:Math.round(r.top+window.scrollY),width:Math.round(document.documentElement.clientWidth),height:Math.round(r.height)}; });
    if (doos) await page.screenshot({path:`kladblok/looks/${naam}-${tag}.png`, fullPage:true, clip:doos});
    await page.close();
  }
  await ctx.close();
}
await b.close(); srv.close();
console.log('klaar');
