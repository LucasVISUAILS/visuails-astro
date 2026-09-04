import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, extname } from 'node:path';
import { chromium } from 'playwright';
const DIST='/tmp/vb/dist';
const MIME={'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.webp':'image/webp','.avif':'image/avif','.png':'image/png','.jpg':'image/jpeg','.woff2':'font/woff2','.ico':'image/x-icon'};
const server=createServer((req,res)=>{let f=join(DIST,decodeURIComponent(req.url.split('?')[0]));if(!extname(f))f=join(f,'index.html');readFile(f).then(b=>{res.writeHead(200,{'content-type':MIME[extname(f)]||'application/octet-stream'});res.end(b);},()=>{res.writeHead(404);res.end();});});
await new Promise(r=>server.listen(8078,r));
const EXE='/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const b=await chromium.launch(existsSync(EXE)?{executablePath:EXE}:{});
for (const pad of ['/','/gallery','/nl/gallery','/pricing','/start/catalog']) {
  const p=await b.newPage({viewport:{width:1440,height:900}});
  let js=0, css=0, beeld=0;
  p.on('response', async (r) => {
    const t = r.headers()['content-type'] || '';
    let n = 0; try { n = (await r.body()).length; } catch {}
    if (t.includes('javascript')) js += n; else if (t.includes('css')) css += n; else if (t.startsWith('image')) beeld += n;
  });
  await p.goto('http://localhost:8078'+pad,{waitUntil:'networkidle'});
  await p.waitForTimeout(600);
  console.log(`${pad.padEnd(18)} js ${(js/1024).toFixed(0).padStart(4)} kB   css ${(css/1024).toFixed(0).padStart(3)} kB   beeld ${(beeld/1024).toFixed(0).padStart(5)} kB`);
  await p.close();
}
await b.close(); server.close();
