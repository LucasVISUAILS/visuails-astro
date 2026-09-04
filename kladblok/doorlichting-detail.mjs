import { chromium } from 'playwright';
import http from 'node:http'; import { readFile, stat } from 'node:fs/promises'; import path from 'node:path';
import { browserPad } from '../scripts/lib/browserpad.mjs';
const ROOT='/home/claude/repo/dist'; const PORT=8097;
const T={'.html':'text/html','.js':'text/javascript','.css':'text/css','.webp':'image/webp','.svg':'image/svg+xml','.png':'image/png','.woff2':'font/woff2'};
const srv=http.createServer(async(req,res)=>{const u=new URL(req.url,'http://x');let p=path.join(ROOT,decodeURIComponent(u.pathname));try{if((await stat(p)).isDirectory())p=path.join(p,'index.html')}catch{}try{const b=await readFile(p);res.writeHead(200,{'content-type':T[path.extname(p)]||'application/octet-stream'});res.end(b)}catch{res.writeHead(404);res.end()}}).listen(PORT);
const b=await chromium.launch({executablePath:browserPad()});
const ctx=await b.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
for (const p of process.argv.slice(2)) {
  const page=await ctx.newPage(); await page.goto(`http://127.0.0.1:${PORT}${p}`,{waitUntil:'networkidle'});
  const r=await page.evaluate(()=>{
    const vis=(el)=>{const r=el.getBoundingClientRect();return r.width>0&&r.height>0};
    const klein=[...document.querySelectorAll('a,button')].filter(vis).filter(el=>{const r=el.getBoundingClientRect();return r.height<28||r.width<28}).map(el=>`${el.tagName.toLowerCase()}.${(el.className||'').toString().split(' ')[0]} "${(el.textContent||el.getAttribute('aria-label')||'').trim().slice(0,30)}" ${Math.round(el.getBoundingClientRect().width)}x${Math.round(el.getBoundingClientRect().height)}`);
    const noalt=[...document.querySelectorAll('img')].filter(vis).filter(i=>!i.getAttribute('alt')).map(i=>i.getAttribute('src'));
    const kt=[...document.querySelectorAll('p,li,span,a,small')].filter(vis).filter(el=>parseFloat(getComputedStyle(el).fontSize)<13).map(el=>`${el.tagName.toLowerCase()}.${(el.className||'').toString().split(' ')[0]} ${getComputedStyle(el).fontSize} "${(el.textContent||'').trim().slice(0,25)}"`);
    return {klein:[...new Set(klein)].slice(0,40), noalt, kt:[...new Set(kt)].slice(0,30)};
  });
  console.log('==',p); console.log('KLEIN:',r.klein.join('\n  ')); console.log('NOALT:',r.noalt.join(' ')); console.log('KLEINE TEKST:',r.kt.join('\n  '));
  await page.close();
}
await b.close(); srv.close();
