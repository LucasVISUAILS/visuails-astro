/* De opening van /lifestyle en /video met hun nieuwe grond: staat de tekst nog
   leesbaar, en valt het donkere vlak achter de laptop in plaats van de kop? */
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
for (const [pad,naam,sel] of [['/nl/lifestyle/','lifestyle','.ls-grond'],['/nl/video/','video','.vid-grond'],['/nl/catalog/','catalog','section.paneel']]) {
  const pg=await b.newPage({viewport:{width:1440,height:950}});
  await pg.goto(base+pad,{waitUntil:'networkidle'});
  await pg.addStyleTag({content:'#cc-bar,[data-cc-bar]{display:none !important}'});
  await pg.waitForTimeout(700);
  console.log(naam, await pg.evaluate((s)=>{
    const sec=document.querySelector(s); if(!sec) return 'geen sectie';
    const cs=getComputedStyle(sec,'::before');
    return { laag: cs.backgroundImage.slice(0,52), z: cs.zIndex };
  }, sel));
  await pg.locator(sel).first().screenshot({path:`kladblok/grond-${naam}.png`}).catch((e)=>console.log(' schot:',e.message.split('\n')[0]));
  await pg.close();
}
await b.close(); server.close();
