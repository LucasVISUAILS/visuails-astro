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
await pg.goto(base+'/nl/',{waitUntil:'networkidle'});
await pg.addStyleTag({content:'#cc-bar,[data-cc-bar]{display:none !important}'});
await pg.waitForTimeout(900);
console.log(await pg.evaluate(()=>{
  const h=document.querySelector('.hero.hero-split');
  const cs=getComputedStyle(h,'::before');
  const r=h.getBoundingClientRect();
  return { hero:[Math.round(r.width),Math.round(r.height)], laag:cs.backgroundImage.slice(0,60), hoogte:cs.height, z:cs.zIndex };
}));
await pg.locator('.hero.hero-split').screenshot({path:'kladblok/hero-grond.png'});
await b.close(); server.close();
