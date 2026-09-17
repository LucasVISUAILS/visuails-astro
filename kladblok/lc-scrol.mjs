import { chromium } from 'playwright';
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
const mt={'.html':'text/html','.css':'text/css','.js':'text/javascript','.webp':'image/webp','.png':'image/png','.avif':'image/avif','.svg':'image/svg+xml','.woff2':'font/woff2'};
const srv=http.createServer((q,r)=>{let f=path.join('dist',decodeURIComponent(q.url.split('?')[0]));
 if(fs.existsSync(f)&&fs.statSync(f).isDirectory())f=path.join(f,'index.html');
 if(!fs.existsSync(f)){r.writeHead(404);return r.end();}
 r.writeHead(200,{'content-type':mt[path.extname(f)]||'application/octet-stream'});
 fs.createReadStream(f).pipe(r);}).listen(4395);
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
const p=await b.newPage({viewport:{width:1600,height:1000},deviceScaleFactor:2});
await p.goto('http://localhost:4395/concept/laptop-naast/',{waitUntil:'networkidle'});
await p.waitForTimeout(800);
const el=await p.$('.lc-doek');
const doos=await el.boundingBox();
await el.screenshot({path:'kladblok/lc-ed0.png'});
// muis op het laptopscherm en scrollen
await p.mouse.move(doos.x+doos.width*0.32, doos.y+doos.height*0.5);
await p.waitForTimeout(400);
const paginaVoor = await p.evaluate(()=>window.scrollY);
await p.mouse.wheel(0, 500); await p.waitForTimeout(900);
const st1 = await p.evaluate(()=>{const r=document.querySelector('.lc-slide.is-aan [data-lc-rol]');return {top:Math.round(r.scrollTop), pagina:window.scrollY};});
await p.mouse.wheel(0, 500); await p.waitForTimeout(900);
const st2 = await p.evaluate(()=>{const r=document.querySelector('.lc-slide.is-aan [data-lc-rol]');return {top:Math.round(r.scrollTop), pagina:window.scrollY};});
await el.screenshot({path:'kladblok/lc-ed1.png'});
console.log('paginaVoor', paginaVoor, 'na wiel 1:', JSON.stringify(st1), 'na wiel 2:', JSON.stringify(st2));
console.log(await p.evaluate(()=>{const r=document.querySelector('.lc-slide.is-aan [data-lc-rol]');
 return 'vakhoogte '+r.firstElementChild.offsetHeight+' bakhoogte '+r.clientHeight+' max '+(r.scrollHeight-r.clientHeight);}));
await b.close(); srv.close();
