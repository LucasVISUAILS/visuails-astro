/* De vier pagina's met een STILLE laptop in een eigen paneel: hoeveel leegte
   staat eromheen en waar staat hij op? */
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join } from 'node:path';
const ROOT='/home/claude/repo/dist/';
const MIME={'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.avif':'image/avif','.json':'application/json','.woff2':'font/woff2'};
const server=createServer(async(req,res)=>{let f=join(ROOT,decodeURIComponent(req.url.split('?')[0]));
 try{if((await stat(f)).isDirectory())f=join(f,'index.html');}catch{try{await stat(f+'.html');f+='.html';}catch{res.writeHead(404);return res.end();}}
 try{const b=await readFile(f);res.writeHead(200,{'content-type':MIME[extname(f)]||'application/octet-stream'});res.end(b);}catch{res.writeHead(404);res.end();}});
await new Promise(r=>server.listen(0,r));
const base=`http://127.0.0.1:${server.address().port}`;
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
const pg=await b.newPage({viewport:{width:1440,height:950}});
for (const pad of ['/nl/plans/','/nl/pricing/','/nl/test-sample/','/nl/thank-you/','/nl/upload-guidelines/']) {
  await pg.goto(base+pad,{waitUntil:'networkidle'}).catch(()=>{});
  await pg.addStyleTag({content:'#cc-bar,[data-cc-bar]{display:none !important}'});
  await pg.waitForTimeout(400);
  const m = await pg.evaluate(()=>{
    const lc=document.querySelector('.lc'); if(!lc) return null;
    const sec=lc.closest('section');
    const r=lc.getBoundingClientRect(), rs=sec?sec.getBoundingClientRect():r;
    const cs=getComputedStyle(sec||lc);
    return {
      stil: lc.classList.contains('is-stil'),
      lc:[Math.round(r.width),Math.round(r.height)],
      sectie:[Math.round(rs.width),Math.round(rs.height)],
      leegBoven: Math.round(r.top-rs.top), leegOnder: Math.round(rs.bottom-r.bottom),
      grondSectie: cs.backgroundColor, ronding: cs.borderRadius,
      grondLc: getComputedStyle(lc).backgroundColor,
    };
  });
  console.log(pad.padEnd(26), JSON.stringify(m));
  if (m) {
    const sec = pg.locator('section:has(.lc)').first();
    await sec.scrollIntoViewIfNeeded().catch(()=>{});
    await pg.waitForTimeout(300);
    const naam = 'kladblok/stil' + pad.replace(/\//g,'-') + '.png';
    await sec.screenshot({path:naam, timeout:8000}).catch((e)=>console.log('  schot mislukt:', e.message.split('\n')[0]));
  }
}
await b.close(); server.close();
