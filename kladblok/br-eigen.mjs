import { chromium } from 'playwright';
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
const mt={'.html':'text/html','.css':'text/css','.js':'text/javascript','.webp':'image/webp','.png':'image/png','.avif':'image/avif','.svg':'image/svg+xml','.woff2':'font/woff2'};
const srv=http.createServer((q,r)=>{let f=path.join('dist',decodeURIComponent(q.url.split('?')[0]));
 if(fs.existsSync(f)&&fs.statSync(f).isDirectory())f=path.join(f,'index.html');
 if(!fs.existsSync(f)){r.writeHead(404);return r.end();}
 r.writeHead(200,{'content-type':mt[path.extname(f)]||'application/octet-stream'});
 fs.createReadStream(f).pipe(r);}).listen(4375);
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
const p=await b.newPage({viewport:{width:1440,height:1400},deviceScaleFactor:2});
const fout=[]; p.on('pageerror',e=>fout.push(String(e)));
await p.goto('http://localhost:4375/concept/bestelrij/',{waitUntil:'networkidle'});
await p.waitForTimeout(700);
const vak = ()=>p.evaluate(()=>[...document.querySelectorAll('[data-br-paneel="0"] .br-vak:not(.br-plus):not(.br-ref)')]
  .map(e=>e.querySelector('.br-vak-woord b').textContent+'['+e.querySelector('.br-vak-eis').textContent+']').join(' · '));
const tel = ()=>p.evaluate(()=>document.querySelector('[data-br-hoektel]').textContent);
const stand = ()=>p.evaluate(()=>document.querySelector('[data-br-paneel="0"] [data-br-stand]').textContent);
console.log('leeg veld, toch toevoegen:');
await p.click('[data-br-eigenvoeg="ground"]'); await p.waitForTimeout(300);
console.log('  →', await tel(), '| eigen tegels:', await p.evaluate(()=>document.querySelectorAll('.br-eigenhoek').length));
await p.fill('[data-br-eigennaam="ground"]','Flat-lay voor de banner');
await p.click('[data-br-eigenvoeg="ground"]'); await p.waitForTimeout(500);
console.log('staat hij in de juiste rij?', await p.evaluate(()=>{
  const l=document.querySelector('[data-br-groeplijst="ground"]');
  return [...l.children].map(li=>{const b=li.querySelector('button'); return b?(b.dataset.brHoeknaam||'invulvak'):'?';}).join(' | ');
}));
console.log('na toevoegen:', await tel());
console.log('vakken      :', await vak());
console.log('stand       :', await stand());
// maat van de gekloonde tegel — de valkuil van deze week
console.log('tegelmaat   :', await p.evaluate(()=>{const e=document.querySelector('.br-eigenhoek').getBoundingClientRect();
  const s=document.querySelector('.br-eigenhoek svg').getBoundingClientRect();
  return Math.round(e.width)+'x'+Math.round(e.height)+' · schets '+Math.round(s.width)+'x'+Math.round(s.height);}));
await p.locator('.br-hoeken').screenshot({path:'kladblok/br-eigen.png'});
// vol maken tot 4 en dan proberen er nog een bij te doen
for (const id of ['three-quarter','flat-lay','inside']) { await p.click(`[data-br-hoek="${id}"]`); await p.waitForTimeout(200); }
console.log('vol         :', await tel(), '| beide toevoegknoppen uit:', await p.evaluate(()=>[...document.querySelectorAll('[data-br-eigenvoeg]')].every(k=>k.disabled)));
// eigen hoek weghalen
await p.click('.br-eigenhoek'); await p.waitForTimeout(400);
console.log('na weghalen :', await tel(), '| vakken:', await vak());
console.log(fout.length?('FOUTEN '+fout.join(' | ')):'geen jsfouten');
await b.close(); srv.close();
