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
await pg.goto(base+(process.argv[2]||'/nl/plans/'),{waitUntil:'networkidle'});
await pg.waitForTimeout(500);
console.log(await pg.evaluate(()=>{
  const lc=document.querySelector('.lc'); if(!lc) return 'geen';
  const r=(e)=>{ if(!e) return null; const x=e.getBoundingClientRect(); return {w:Math.round(x.width),h:Math.round(x.height),t:Math.round(x.top),b:Math.round(x.bottom)}; };
  const keten=[]; let e=lc.parentElement, d=0;
  while(e && d<4){ keten.push(`${e.tagName.toLowerCase()}.${(e.className||'').toString().trim().split(/\s+/)[0]||'-'} ${JSON.stringify(r(e))} pad:${getComputedStyle(e).padding}`); e=e.parentElement; d++; }
  const kinderen=[...lc.children].map((k)=>`${k.tagName.toLowerCase()}.${(k.className||'').toString().trim().split(/\s+/)[0]||'-'} ${JSON.stringify(r(k))}`);
  const cs=getComputedStyle(lc);
  return { lc:r(lc), doek:r(lc.querySelector('.lc-doek')), kinderen,
    lcDisplay:cs.display, gtr:cs.gridTemplateRows, gap:cs.gap, minh:cs.minHeight, h:cs.height, ar:cs.aspectRatio, keten };
}));
await b.close(); server.close();
