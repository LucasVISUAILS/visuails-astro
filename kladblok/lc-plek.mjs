import { chromium } from 'playwright';
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
const mt={'.html':'text/html','.css':'text/css','.js':'text/javascript','.webp':'image/webp','.png':'image/png','.avif':'image/avif','.svg':'image/svg+xml','.woff2':'font/woff2','.mp4':'video/mp4'};
const srv=http.createServer((q,r)=>{let f=path.join('dist',decodeURIComponent(q.url.split('?')[0]));
 if(fs.existsSync(f)&&fs.statSync(f).isDirectory())f=path.join(f,'index.html');
 if(!fs.existsSync(f)){r.writeHead(404);return r.end();}
 r.writeHead(200,{'content-type':mt[path.extname(f)]||'application/octet-stream'});
 fs.createReadStream(f).pipe(r);}).listen(4388);
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
const paden = process.argv.slice(2);
for (const pad of paden) {
  const p=await b.newPage({viewport:{width:1440,height:1000},deviceScaleFactor:2});
  const fouten=[]; p.on('pageerror',e=>fouten.push(String(e))); p.on('response',r=>{if(r.status()>=400)fouten.push(r.status()+' '+r.url());}); p.on('console',m=>{if(m.type()==='error')fouten.push(m.text());});
  await p.goto('http://localhost:4388'+pad,{waitUntil:'networkidle'});
  await p.waitForTimeout(700);
  const el=await p.$('.lc');
  const naam = pad.replace(/\//g,'_')||'_root';
  if (el) { await el.scrollIntoViewIfNeeded(); await p.waitForTimeout(500);
    await el.screenshot({path:`kladblok/plek${naam}.png`});
    console.log(pad, 'OK', JSON.stringify(await p.evaluate(()=>{const d=document.querySelector('.lc-doek').getBoundingClientRect();
      return {breed:Math.round(d.width), hoog:Math.round(d.height), bediening:!!document.querySelector('.lc-voet')};})), fouten.length?('FOUTEN '+fouten.join(' | ')):'');
  } else console.log(pad, 'GEEN .lc', fouten.join(' | '));
  await p.close();
}
await b.close(); srv.close();
