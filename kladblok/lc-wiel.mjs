import { chromium } from 'playwright';
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
const mt={'.html':'text/html','.css':'text/css','.js':'text/javascript','.webp':'image/webp','.png':'image/png','.avif':'image/avif','.svg':'image/svg+xml','.woff2':'font/woff2'};
const srv=http.createServer((q,r)=>{let f=path.join('dist',decodeURIComponent(q.url.split('?')[0]));
 if(fs.existsSync(f)&&fs.statSync(f).isDirectory())f=path.join(f,'index.html');
 if(!fs.existsSync(f)){r.writeHead(404);return r.end();}
 r.writeHead(200,{'content-type':mt[path.extname(f)]||'application/octet-stream'});
 fs.createReadStream(f).pipe(r);}).listen(4391);
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
const p=await b.newPage({viewport:{width:1600,height:1000}});
await p.goto('http://localhost:4391/concept/laptop-naast/',{waitUntil:'networkidle'});
await p.waitForTimeout(600);
const doos=await (await p.$('.lc-doek')).boundingBox();
await p.mouse.move(doos.x+doos.width*0.3, doos.y+doos.height*0.5);   // muis op de laptop = pauze
await p.waitForTimeout(500);
const stand=()=>p.evaluate(()=>{
  const aan=[...document.querySelectorAll('[data-lc-slide]')].findIndex(e=>e.classList.contains('is-aan'));
  const r=document.querySelector('[data-lc-slide].is-aan [data-lc-rol]');
  const h=r&&r.firstElementChild?r.firstElementChild.offsetHeight:0;
  const zij=!!(r&&r.hasAttribute('data-lc-zij'));
  let foto=0;
  if(r&&zij){ foto=Math.abs(parseInt(r.style.translate)||0)/100; }
  else if(r&&h){ foto=Math.round(r.scrollTop/h); }
  const f=document.querySelector('[data-lc-fon].is-aan img');
  const tel=f?f.getAttribute('src').split('/').pop():'leeg';
  return `dia ${aan} · foto ${foto}${zij?' (zij)':''} · telefoon ${tel}`;
});
console.log('start          ', await stand());
for (let k=1;k<=9;k++){
  await p.mouse.wheel(0,120); await p.waitForTimeout(450);
  console.log('wiel '+String(k).padStart(2)+'        ', await stand());
}
await (await p.$('.lc-doek')).screenshot({path:'kladblok/lc-paar.png'});
await b.close(); srv.close();
