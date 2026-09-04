/* axe op één pagina, om een reparatie te toetsen voordat hij in de bron gaat. */
import { createServer } from 'node:http';
import { readFile, readFileSync, existsSync } from 'node:fs';
import { join, extname } from 'node:path';
import { chromium } from 'playwright';
const DIST='/tmp/vb/dist';
const AXE=readFileSync('/tmp/vb/node_modules/axe-core/axe.min.js','utf8');
const PAD=process.argv[2]||'/';
const W=Number(process.argv[3]||1440);
const MIME={'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.webp':'image/webp','.avif':'image/avif','.png':'image/png','.woff2':'font/woff2','.ico':'image/x-icon','.json':'application/json'};
const s=createServer((q,r)=>{let p=decodeURIComponent(q.url.split('?')[0]);let f=join(DIST,p);if(!extname(f))f=join(f,'index.html');readFile(f,(e,b)=>{if(e){r.writeHead(404);return r.end('x');}r.writeHead(200,{'content-type':MIME[extname(f)]||'application/octet-stream'});r.end(b);});});
await new Promise(r=>s.listen(8096,r));
const EXE='/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const b=await chromium.launch(existsSync(EXE)?{executablePath:EXE}:{});
const ctx=await b.newContext({viewport:{width:W,height:900},reducedMotion:'reduce'});
await ctx.addInitScript(AXE);
const p=await ctx.newPage();
await p.goto(`http://127.0.0.1:8096${PAD}`,{waitUntil:'load'});
await p.waitForTimeout(500);
const r=await p.evaluate(async()=>{
  const res=await window.axe.run(document,{resultTypes:['violations'],runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21a','wcag21aa','best-practice']}});
  return res.violations.map(v=>({id:v.id,impact:v.impact,n:v.nodes.length,eerste:v.nodes.slice(0,3).map(n=>n.target.join(' ')),waarom:v.nodes.slice(0,2).map(n=>(n.any.concat(n.all)).map(c=>c.message).join(' ~ '))}));
});
console.log(`${PAD} @${W}px — ${r.length} bevinding(en)`);
for(const v of r) {console.log(` ${v.impact.padEnd(8)} ${v.id.padEnd(28)} ${v.n}×  ${v.eerste.join(' | ').slice(0,110)}`); for(const w of v.waarom) console.log('          → '+w);}
await b.close(); s.close();
