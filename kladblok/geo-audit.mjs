/* GEO — hoe goed is deze site te CITEREN door een taalmodel?
 *
 * Zoekmachines rangschikken pagina's; taalmodellen halen er ANTWOORDEN uit en
 * noemen een bron. Wat daarvoor telt is iets anders dan wat voor SEO telt:
 * losse, natelbare feiten; vragen die letterlijk gesteld worden; entiteiten die
 * herkenbaar zijn; en tekst die zonder JavaScript in de bron staat. Dit script
 * meet precies die dingen. */
import { globSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
const DIST='/tmp/vb/dist';
const paginas=globSync(join(DIST,'**/*.html')).sort().filter((f)=>!/noindex/.test(readFileSync(f,'utf8')));
const pad=(f)=>f.slice(DIST.length).replace(/\\/g,'/');
const tekst=(h)=>h.replace(/<script[\s\S]*?<\/script>/g,' ').replace(/<style[\s\S]*?<\/style>/g,' ')
  .replace(/<[^>]+>/g,' ').replace(/&nbsp;/g,' ').replace(/&[a-z#0-9]+;/g,' ').replace(/\s+/g,' ').trim();

console.log(`${paginas.length} indexeerbare pagina's\n${'='.repeat(62)}`);

/* 1 · STAAT DE TEKST IN DE BRON, OF KOMT HIJ VAN JAVASCRIPT?
   Elk model dat citeert leest de HTML. Wat een script pas later invult, bestaat
   voor de meeste crawlers niet. */
let jsAfhankelijk=0;
for(const f of paginas){const h=readFileSync(f,'utf8');
  if(tekst(h).split(' ').length < 120) jsAfhankelijk++;}
console.log(`\n1 · TEKST IN DE BRON`);
console.log(`   pagina's met minder dan 120 woorden in de kale html: ${jsAfhankelijk}`);

/* 2 · VRAGEN DIE LETTERLIJK GESTELD WORDEN.
   Een model dat "wat kost X" beantwoordt, pakt het liefst een pagina waar die
   vraag letterlijk staat met het antwoord eronder. */
let vragen=0, faqPag=0, faqLd=0;
const vraagWoorden={};
for(const f of paginas){const h=readFileSync(f,'utf8');
  const v=[...h.matchAll(/<summary[^>]*>([\s\S]*?)<\/summary>/g)].map((m)=>tekst(m[1])).filter((x)=>x.includes('?'));
  if(v.length){faqPag++;vragen+=v.length;}
  if(/"FAQPage"/.test(h))faqLd++;
  for(const q of v){const w=q.toLowerCase().split(' ')[0]; vraagWoorden[w]=(vraagWoorden[w]||0)+1;}}
console.log(`\n2 · VRAGEN`);
console.log(`   ${vragen} vragen op ${faqPag} pagina's, waarvan ${faqLd} met een FAQPage-knoop`);
console.log('   openingswoorden: ' + Object.entries(vraagWoorden).sort((a,b)=>b[1]-a[1]).slice(0,8).map(([k,v])=>`${k} ${v}×`).join(', '));

/* 3 · NATELBARE FEITEN.
   Bedragen, aantallen, doorlooptijden, percentages. Een model citeert liever een
   zin met een getal erin dan een zin zonder. */
let metGetal=0, zinnen=0;
const perPag=[];
for(const f of paginas){const t=tekst(readFileSync(f,'utf8'));
  const z=t.split(/(?<=[.!?])\s+/).filter((x)=>x.length>25);
  const g=z.filter((x)=>/(€\s?\d|\b\d{1,4}\b\s*(producten|products|beelden|images|visuals|dagen|days|uur|hours|maanden|months|%))/i.test(x));
  zinnen+=z.length; metGetal+=g.length; perPag.push([pad(f), z.length?Math.round(g.length/z.length*100):0]);}
console.log(`\n3 · FEITELIJKE DICHTHEID`);
console.log(`   ${metGetal} van ${zinnen} zinnen dragen een getal (${Math.round(metGetal/zinnen*100)}%)`);
perPag.sort((a,b)=>a[1]-b[1]);
console.log('   laagste vijf: ' + perPag.slice(0,5).map(([p,n])=>`${p} ${n}%`).join(', '));
console.log('   hoogste vijf: ' + perPag.slice(-5).reverse().map(([p,n])=>`${p} ${n}%`).join(', '));

/* 4 · ENTITEITEN. Weet een model WIE dit is en WAT er verkocht wordt? */
const home=readFileSync(join(DIST,'index.html'),'utf8');
const g=JSON.parse(home.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
const org=g['@graph'].find((n)=>n['@type']==='Organization')||{};
console.log(`\n4 · ENTITEITEN`);
console.log('   Organization-velden: '+Object.keys(org).join(', '));
const mist=['foundingDate','knowsAbout','slogan','numberOfEmployees','vatID','legalName','naics','duns','contactPoint','makesOffer']
  .filter((k)=>!(k in org));
console.log('   ontbreekt: '+mist.join(', '));
const soorten={};
for(const f of paginas){const h=readFileSync(f,'utf8');
  for(const m of h.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)){
    try{const gr=JSON.parse(m[1]); for(const n of (gr['@graph']||[gr])) soorten[n['@type']]=(soorten[n['@type']]||0)+1;}catch{}}}
console.log('   knooptypes: '+Object.entries(soorten).map(([k,v])=>`${k} ${v}×`).join(', '));

/* 5 · WAT EEN MODEL NIET KAN VINDEN */
console.log(`\n5 · WAT ONTBREEKT VOOR EEN CITERENDE LEZER`);
for(const [naam,pad2] of [['llms.txt','llms.txt'],['llms-full.txt','llms-full.txt']]){
  console.log(`   ${existsSync(join(DIST,pad2))?'✓':'—'} /${naam}`);
}
const rb=existsSync(join(DIST,'robots.txt'))?readFileSync(join(DIST,'robots.txt'),'utf8'):'';
for(const bot of ['GPTBot','ClaudeBot','anthropic-ai','PerplexityBot','Google-Extended','CCBot','Bytespider','Applebot-Extended']){
  const genoemd=new RegExp(bot,'i').test(rb);
  console.log(`   ${genoemd?'genoemd':'niet genoemd'}  ${bot}`);
}

/* 6 · DE PRIJSVRAAG. Kan een model "wat kost VISUAILS" beantwoorden uit één pagina? */
console.log(`\n6 · DE PRIJSVRAAG OP ÉÉN PAGINA`);
for(const p of ['/pricing/index.html','/nl/pricing/index.html']){
  const t=tekst(readFileSync(join(DIST,p),'utf8'));
  const bedragen=[...t.matchAll(/€\s?\d[\d.,]*/g)].map((m)=>m[0]);
  console.log(`   ${p}: ${bedragen.length} bedragen, ${new Set(bedragen).size} verschillend`);
  console.log(`      ${[...new Set(bedragen)].slice(0,14).join(' · ')}`);
}
