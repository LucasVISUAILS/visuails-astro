import { chromium } from 'playwright';
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
const mt={'.html':'text/html','.css':'text/css','.js':'text/javascript','.webp':'image/webp','.png':'image/png','.avif':'image/avif','.svg':'image/svg+xml','.woff2':'font/woff2'};
const srv=http.createServer((q,r)=>{let f=path.join('dist',decodeURIComponent(q.url.split('?')[0]));
 if(fs.existsSync(f)&&fs.statSync(f).isDirectory())f=path.join(f,'index.html');
 if(!fs.existsSync(f)){r.writeHead(404);return r.end();}
 r.writeHead(200,{'content-type':mt[path.extname(f)]||'application/octet-stream'});
 fs.createReadStream(f).pipe(r);}).listen(4379);
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
const p=await b.newPage({viewport:{width:1440,height:1100},deviceScaleFactor:2});
const fout=[]; p.on('pageerror',e=>fout.push(String(e)));
await p.goto('http://localhost:4379/concept/bestelrij/',{waitUntil:'networkidle'});
await p.waitForTimeout(800);
const stand = ()=>p.evaluate(()=>{
  const k=document.querySelector('[data-br-vaknaam]').textContent;
  const f=document.querySelector('[data-br-fon]').getAttribute('src').split('/').pop();
  const l=document.querySelector('[data-br-laptop]').getAttribute('src').split('/').pop();
  const m=document.querySelector('[data-br-merk]').textContent;
  const aan=[...document.querySelectorAll('[data-br-tikken] i')].findIndex(e=>e.classList.contains('aan'));
  return `tip ${aan+1} · "${k}" · telefoon ${f} · laptop ${l} · label "${m}"`;
});
console.log('bij laden      ', await stand());
await p.waitForTimeout(10400); console.log('na 10 s        ', await stand());
await p.waitForTimeout(10400); console.log('na 20 s        ', await stand());
await p.click('[data-br-paneel="0"] [data-br-vak="back"]'); await p.waitForTimeout(400);
console.log('na klik op achterkant', await stand());
await p.locator('.br-scherm').screenshot({path:'kladblok/br-tips-open.png'});
await p.click('[data-br-schuif]'); await p.waitForTimeout(500);
console.log('dicht?', await p.evaluate(()=>document.querySelector('.br').classList.contains('is-dicht')),
            '| hoogte scherm', await p.evaluate(()=>Math.round(document.querySelector('.br-scherm').getBoundingClientRect().height)));
await p.locator('.br-scherm').screenshot({path:'kladblok/br-tips-dicht.png'});
console.log(fout.length?('FOUTEN '+fout.join(' | ')):'geen jsfouten');
await b.close(); srv.close();
