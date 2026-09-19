/* Schermafdrukken van de telefoonweergave, om te KIJKEN in plaats van te meten. */
import { chromium, devices } from 'playwright';
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join } from 'node:path';
const ROOT='/home/claude/repo/dist/';
const MIME={'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.avif':'image/avif','.json':'application/json','.woff2':'font/woff2','.mp4':'video/mp4'};
const server=createServer(async(req,res)=>{let f=join(ROOT,decodeURIComponent(req.url.split('?')[0]));
 try{if((await stat(f)).isDirectory())f=join(f,'index.html');}catch{try{await stat(f+'.html');f+='.html';}catch{res.writeHead(404);return res.end();}}
 try{const b=await readFile(f);res.writeHead(200,{'content-type':MIME[extname(f)]||'application/octet-stream'});res.end(b);}catch{res.writeHead(404);res.end();}});
await new Promise(r=>server.listen(0,r));
const base=`http://127.0.0.1:${server.address().port}`;
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
const ctx=await b.newContext({...devices['Pixel 5'], viewport:{width:390,height:844}});
const pg=await ctx.newPage();
for (const [pad, naam, y] of [['/nl/','home',0],['/nl/','home2',900],['/nl/catalog/','catalog',0],['/nl/pricing/','pricing',600],['/nl/data-processing-agreement/','dpa',0]]) {
  await pg.goto(base+pad,{waitUntil:'networkidle'});
  await pg.addStyleTag({content:'#cc-bar,[data-cc-bar]{display:none !important}'});
  await pg.waitForTimeout(500);
  if (y) await pg.evaluate((n)=>scrollTo(0,n), y);
  await pg.waitForTimeout(400);
  await pg.screenshot({path:`kladblok/tel-${naam}.png`});
}
await b.close(); server.close();
