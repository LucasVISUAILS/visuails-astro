import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { chromium } from 'playwright';
const ROOT='/tmp/vb';
const CSP="default-src 'none'; img-src 'self'; style-src 'self'; font-src 'self'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'";
const FOTOS=readdirSync(join(ROOT,'public/img')).filter(f=>/\.webp$/.test(f)).map(f=>join(ROOT,'public/img',f));
const EXE='/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const b=await chromium.launch(existsSync(EXE)?{executablePath:EXE}:{});
async function meet(html,css,sel){
  const CSS=readFileSync(css,'utf8');
  const ctx=await b.newContext({viewport:{width:1280,height:2000}});
  await ctx.route('**/*',(r)=>{const u=new URL(r.request().url());
    if(u.pathname.endsWith('.css'))return r.fulfill({contentType:'text/css',body:CSS});
    if(/^\/account\/files\/\d+\//.test(u.pathname)||u.pathname.startsWith('/img/')){const n=Math.abs([...u.pathname].reduce((a,c)=>a+c.charCodeAt(0),0));return r.fulfill({contentType:'image/webp',body:readFileSync(FOTOS[n%FOTOS.length])});}
    if(u.pathname==='/__page')return r.fulfill({contentType:'text/html',headers:{'content-security-policy':CSP},body:readFileSync(html,'utf8')});
    return r.fulfill({status:204,body:''});});
  const p=await ctx.newPage();
  await p.goto('https://visuails.com/__page',{waitUntil:'networkidle'});
  const uit=await p.evaluate((s)=>[...document.querySelectorAll(s)].slice(0,4).map(e=>{const c=getComputedStyle(e);
    return {tag:e.tagName,txt:e.textContent.trim().slice(0,26),fs:c.fontSize,mt:c.marginTop,mb:c.marginBottom,pb:c.paddingBottom,ls:c.letterSpacing,bs:c.boxShadow.slice(0,24),lh:c.lineHeight,h:Math.round(e.getBoundingClientRect().height)};}),sel);
  await ctx.close(); return uit;
}
const voor='/mnt/user-data/uploads/Claude (VISUAILS)/visuails-astro/public/account.css';
const na=join(ROOT,'public/account.css');
for (const [naam,h1,h2sel,h2,sel2] of [
  ['details','/tmp/dash/_account_details-en.html','h3','/tmp/dash2/_account_details-en.html','h2'],
  ['plan','/tmp/dash/_account_plan-en.html','h3','/tmp/dash2/_account_plan-en.html','h2'],
]) {
  console.log(`\n── ${naam} VOOR`); console.table(await meet(h1,voor,h2sel));
  console.log(`── ${naam} NA`);   console.table(await meet(h2,na,sel2));
}
await b.close();
