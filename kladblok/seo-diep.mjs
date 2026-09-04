import { globSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
const DIST='/tmp/vb/dist';
const paginas=globSync(join(DIST,'**/*.html')).sort();
const pad=(f)=>f.slice(DIST.length).replace(/\\/g,'/');
const tekst=(h)=>h.replace(/<script[\s\S]*?<\/script>/g,' ').replace(/<style[\s\S]*?<\/style>/g,' ').replace(/<[^>]+>/g,' ').replace(/&[a-z#0-9]+;/g,' ').replace(/\s+/g,' ').trim();

console.log('── PAGINA\'S ZONDER BreadcrumbList');
const zonder=[];
for(const f of paginas){const h=readFileSync(f,'utf8');
  if(!/BreadcrumbList/.test(h)) zonder.push(pad(f));}
console.log('   '+zonder.length+': '+zonder.slice(0,20).join(', '));

console.log('\n── ANKERTEKST: hoeveel links hebben nietszeggende tekst');
const slecht={};
for(const f of paginas){const h=readFileSync(f,'utf8');
  for(const m of h.matchAll(/<a\b[^>]*href="(\/[^"]*)"[^>]*>([\s\S]{0,200}?)<\/a>/g)){
    const t=tekst(m[2]).toLowerCase();
    if(/^(hier|here|lees meer|read more|meer|more|klik|click|link|deze|this)\.?$/.test(t)) (slecht[t]||=[]).push(pad(f)+' → '+m[1]);
  }}
console.log(Object.keys(slecht).length? Object.entries(slecht).map(([k,v])=>`   "${k}" ${v.length}× (${v[0]})`).join('\n') : '   geen');

console.log('\n── WOORDEN PER PAGINA, de tien kortste indexeerbare');
const lengtes=[];
for(const f of paginas){const h=readFileSync(f,'utf8'); if(/noindex/.test(h))continue;
  lengtes.push([pad(f), tekst(h).split(' ').length]);}
lengtes.sort((a,b)=>a[1]-b[1]);
for(const [p,n] of lengtes.slice(0,10)) console.log(`   ${String(n).padStart(5)}  ${p}`);
console.log(`   mediaan: ${lengtes[Math.floor(lengtes.length/2)][1]} woorden over ${lengtes.length} pagina's`);

console.log('\n── ALT-TEKSTEN: leeg, te kort of herhaald');
const alts={};let leeg=0,tot=0;
for(const f of paginas){const h=readFileSync(f,'utf8');
  for(const m of h.matchAll(/<img[^>]*\salt="([^"]*)"/g)){tot++;const a=m[1].trim();
    if(!a){leeg++;continue;} (alts[a]||=new Set()).add(pad(f));}}
console.log(`   ${tot} <img>, waarvan ${leeg} met alt="" (decoratief)`);
const vaak=Object.entries(alts).filter(([,v])=>v.size>6).sort((a,b)=>b[1].size-a[1].size).slice(0,6);
for(const [a,v] of vaak) console.log(`   ${v.size} pagina's: "${a.slice(0,60)}"`);

console.log('\n── llms.txt / ai.txt / security.txt');
for(const n of ['llms.txt','llms-full.txt','ai.txt','.well-known/security.txt','humans.txt']){
  console.log(`   ${existsSync(join(DIST,n))?'✓':'—'} ${n}`);
}

console.log('\n── WELKE ZOEKWOORDEN DRAAGT DE SITE (meest voorkomende bigrams in koppen)');
const koppen=[];
for(const f of paginas){const h=readFileSync(f,'utf8'); if(/noindex/.test(h))continue;
  for(const m of h.matchAll(/<h[12][^>]*>([\s\S]*?)<\/h[12]>/g)) koppen.push(tekst(m[1]).toLowerCase());}
const bi={};
for(const k of koppen){const w=k.replace(/[^a-zà-ſ ]/g,' ').split(/\s+/).filter((x)=>x.length>3);
  for(let i=0;i<w.length-1;i++){const b=w[i]+' '+w[i+1]; bi[b]=(bi[b]||0)+1;}}
for(const [b,n] of Object.entries(bi).sort((a,b)=>b[1]-a[1]).slice(0,14)) console.log(`   ${String(n).padStart(3)}×  ${b}`);
