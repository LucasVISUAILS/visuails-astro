/* Is het dashboard er PIXEL VOOR PIXEL hetzelfde uit gaan zien na de
   koppenreparatie? De html vóór staat in /tmp/dash met de oude account.css, de
   html ná in /tmp/dash2 met de nieuwe. Zelfde browser, zelfde breedtes, zelfde
   nepfoto's; alleen die twee paren verschillen. */
import { readFileSync, readdirSync, existsSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, basename } from 'node:path';
import { chromium } from 'playwright';
import { PNG } from 'pngjs';

const ROOT='/tmp/vb';
const CSP = "default-src 'none'; img-src 'self'; style-src 'self'; font-src 'self'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'";
const FOTOS = readdirSync(join(ROOT,'public/img')).filter(f=>/\.webp$/.test(f)).map(f=>join(ROOT,'public/img',f));
const EXE='/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const b=await chromium.launch(existsSync(EXE)?{executablePath:EXE}:{});

async function schiet(htmlMap, cssPad, uitMap) {
  mkdirSync(uitMap,{recursive:true});
  const CSS=readFileSync(cssPad,'utf8');
  for (const [w,naam] of [[1280,'breed'],[420,'telefoon']]) {
    const ctx=await b.newContext({viewport:{width:w,height:2000},reducedMotion:'reduce',deviceScaleFactor:1});
    await ctx.route('**/*',(route)=>{
      const u=new URL(route.request().url());
      if(u.pathname.endsWith('.css')) return route.fulfill({contentType:'text/css',body:CSS});
      if(/^\/account\/files\/(\d+)\//.test(u.pathname)||/^\/admin\/files\/(\d+)$/.test(u.pathname)||u.pathname.startsWith('/img/')){
        const n=Math.abs([...u.pathname].reduce((a,c)=>a+c.charCodeAt(0),0));
        return route.fulfill({contentType:'image/webp',body:readFileSync(FOTOS[n%FOTOS.length])});
      }
      if(u.pathname==='/__page') return route.fulfill({contentType:'text/html',headers:{'content-security-policy':CSP},body:globalThis.__h});
      return route.fulfill({status:204,body:''});
    });
    for (const f of readdirSync(htmlMap).filter(x=>x.endsWith('.html')).sort()) {
      globalThis.__h = readFileSync(join(htmlMap,f),'utf8');
      const p=await ctx.newPage();
      await p.goto('https://visuails.com/__page',{waitUntil:'networkidle'});
      await p.waitForTimeout(150);
      await p.screenshot({path:join(uitMap,`${basename(f,'.html')}-${naam}.png`),fullPage:true});
      await p.close();
    }
    await ctx.close();
  }
}

const WAT = process.argv[2] || 'account';
if (WAT === 'admin') {
  await schiet('/tmp/adm',  '/mnt/user-data/uploads/Claude (VISUAILS)/visuails-astro/public/admin.css', '/tmp/schot-voor');
  await schiet('/tmp/adm4', join(ROOT,'public/admin.css'), '/tmp/schot-na');
} else {
  await schiet('/tmp/dash', '/mnt/user-data/uploads/Claude (VISUAILS)/visuails-astro/public/account.css', '/tmp/schot-voor');
  await schiet('/tmp/dash2', join(ROOT,'public/account.css'), '/tmp/schot-na');
}
await b.close();

let anders=0, gelijk=0;
for (const f of readdirSync('/tmp/schot-voor')) {
  const a=PNG.sync.read(readFileSync(join('/tmp/schot-voor',f)));
  const c=PNG.sync.read(readFileSync(join('/tmp/schot-na',f)));
  if (a.width!==c.width||a.height!==c.height) { console.log(`  MAAT  ${f}  ${a.width}×${a.height} → ${c.width}×${c.height}`); anders++; continue; }
  let n=0;
  for (let i=0;i<a.data.length;i+=4) if (Math.abs(a.data[i]-c.data[i])>2||Math.abs(a.data[i+1]-c.data[i+1])>2||Math.abs(a.data[i+2]-c.data[i+2])>2) n++;
  const pct=(n/(a.width*a.height)*100);
  if (n===0) { gelijk++; }
  else { console.log(`  ${pct.toFixed(3)}% anders  ${f}  (${n} pixels)`); anders++; }
}
console.log(`\n${gelijk} identiek, ${anders} met verschil`);
