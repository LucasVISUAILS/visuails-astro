import { chromium } from 'playwright';
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
const mt={'.html':'text/html','.css':'text/css','.js':'text/javascript','.webp':'image/webp','.png':'image/png','.avif':'image/avif','.svg':'image/svg+xml','.woff2':'font/woff2'};
const srv=http.createServer((q,r)=>{let f=path.join('dist',decodeURIComponent(q.url.split('?')[0]));
 if(fs.existsSync(f)&&fs.statSync(f).isDirectory())f=path.join(f,'index.html');
 if(!fs.existsSync(f)){r.writeHead(404);return r.end();}
 r.writeHead(200,{'content-type':mt[path.extname(f)]||'application/octet-stream'});
 fs.createReadStream(f).pipe(r);}).listen(4394);
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
const p=await b.newPage({viewport:{width:1600,height:1000}});
await p.goto('http://localhost:4394/concept/laptop-naast/',{waitUntil:'networkidle'});
await p.mouse.move(20, 20);                 // muis NIET op de laptop
const stand=()=>p.evaluate(()=>{
  const aan=[...document.querySelectorAll('[data-lc-slide]')].findIndex(e=>e.classList.contains('is-aan'));
  const r=document.querySelector('[data-lc-slide].is-aan [data-lc-rol]');
  const h=r&&r.firstElementChild?r.firstElementChild.offsetHeight:0;
  return {dia:aan, foto:(r&&h)?Math.round(r.scrollTop/h):0, zij:!!(r&&r.hasAttribute('data-lc-zij'))};
});
const t0=Date.now(); const reeks=[];
for(let k=0;k<26;k++){ reeks.push({t:((Date.now()-t0)/1000).toFixed(1), ...await stand()}); await p.waitForTimeout(500); }
let vorig=null;
for(const r of reeks){ const nu=r.dia+'/'+r.foto; if(nu!==vorig){ console.log(`t=${r.t}s  dia ${r.dia}  foto ${r.foto}${r.zij?' (zij)':''}`); vorig=nu; } }
// en nu met de muis erop: moet stil blijven staan
const doos=await (await p.$('.lc-doek')).boundingBox();
await p.mouse.move(doos.x+doos.width*0.3, doos.y+doos.height*0.5);
const a=await stand(); await p.waitForTimeout(6000); const c=await stand();
console.log('muis erop: voor', JSON.stringify(a), 'na 6s', JSON.stringify(c), a.dia===c.dia&&a.foto===c.foto?'→ STAAT STIL':'→ LOOPT DOOR');
await b.close(); srv.close();
