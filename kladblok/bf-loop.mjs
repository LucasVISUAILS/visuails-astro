import { chromium } from 'playwright';
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
const mt={'.html':'text/html','.css':'text/css','.js':'text/javascript','.webp':'image/webp','.png':'image/png','.avif':'image/avif','.svg':'image/svg+xml','.woff2':'font/woff2'};
const srv=http.createServer((q,r)=>{let f=path.join('dist',decodeURIComponent(q.url.split('?')[0]));
 if(fs.existsSync(f)&&fs.statSync(f).isDirectory())f=path.join(f,'index.html');
 if(!fs.existsSync(f)){r.writeHead(404);return r.end();}
 r.writeHead(200,{'content-type':mt[path.extname(f)]||'application/octet-stream'});
 fs.createReadStream(f).pipe(r);}).listen(4386);
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
const p=await b.newPage({viewport:{width:1440,height:1000},deviceScaleFactor:1});
const fout=[]; p.on('pageerror',e=>fout.push(String(e)));
await p.goto('http://localhost:4386/nl/start/catalog/',{waitUntil:'networkidle'});
await p.waitForTimeout(900);

const meet = async (label) => p.evaluate((l)=>{
  const zichtbaar = [...document.querySelectorAll('[data-pl-step]')].find(e=>getComputedStyle(e).display!=='none');
  const nr = zichtbaar?zichtbaar.getAttribute('data-pl-step'):'?';
  const h = document.documentElement.scrollHeight;
  const velden = zichtbaar? zichtbaar.querySelectorAll('input:not([type=hidden]), select, textarea, button').length : 0;
  const verplicht = zichtbaar? zichtbaar.querySelectorAll('[required]').length : 0;
  const kop = zichtbaar? (zichtbaar.querySelector('h2,h3,.pl-step-h')||{}).textContent : '';
  return `${l} · stap ${nr} · paginahoogte ${h}px · bedienbare dingen ${velden} · verplicht ${verplicht} · kop "${(kop||'').trim().slice(0,60)}"`;
}, label);

console.log(await p.evaluate(()=>{
  const st=[...document.querySelectorAll('[data-pl-step]')].map(e=>e.getAttribute('data-pl-step')+':'+(getComputedStyle(e).display==='none'?'uit':'AAN'));
  const nx=[...document.querySelectorAll('[data-pl-next]')].map(e=>e.textContent.trim().slice(0,24)+' ['+(e.offsetParent?'zichtbaar':'verborgen')+']');
  return 'stappen '+st.join(' ')+' | next-knoppen: '+nx.join(' / ');
}));
console.log(await meet('start'));
await p.screenshot({path:'kladblok/bf-1.png', fullPage:true});

// zet het aantal producten op 6 en ga naar stap 2
console.log(await p.evaluate(()=>{const e=document.querySelector('#pl-qty-n'); return e?('aantalveld: <'+e.tagName.toLowerCase()+' type='+(e.type||'')+' name='+e.name+' value="'+e.value+'" placeholder="'+(e.placeholder||'')+'">'):'geen #pl-qty-n';}));
await p.fill('#pl-qty-n','6').catch(async()=>{await p.selectOption('#pl-qty-n','6').catch(()=>{});});
await p.waitForTimeout(500);
await p.waitForTimeout(400);
const volgende = async () => {
  const k = p.locator('[data-pl-step]:visible [data-pl-next]').first();
  await k.scrollIntoViewIfNeeded(); await k.click({force:true}); await p.waitForTimeout(900);
  const klacht = await p.evaluate(()=>{
    const z=[...document.querySelectorAll('[data-pl-step]')].find(e=>getComputedStyle(e).display!=='none');
    const inv=z?z.querySelector(':invalid'):null;
    const fout=document.querySelector('[data-pl-fout], .pl-fout, [aria-invalid="true"], .pu-fout');
    return (inv?('ongeldig veld: '+(inv.name||inv.id||inv.tagName)):'')+(fout?(' | melding: '+fout.textContent.trim().slice(0,90)):'');
  });
  if (klacht.trim()) console.log('  ↳', klacht);
};
await volgende();
console.log(await meet('na volgende'));
await p.screenshot({path:'kladblok/bf-2.png', fullPage:true});

console.log(await p.evaluate(()=>{
 const k1=document.querySelector('[data-pl-cards] > li');
 if(!k1) return 'geen kaarten';
 const knoppen=[...k1.querySelectorAll('button')].map(b=>(b.textContent||'').trim().replace(/\s+/g,' ').slice(0,34)).filter(Boolean);
 const vakken=[...k1.querySelectorAll('[data-pu-slot]')].map(e=>e.getAttribute('data-pu-slot'));
 const lades=[...k1.querySelectorAll('details, .pu-model, [data-pu-lade]')].length;
 return 'VAKKEN: '+vakken.join(', ')+'\nKNOPPEN OP KAART 1: '+knoppen.join(' | ')+'\nlades: '+lades;
}));
console.log(await p.evaluate(()=>{
 const kaarten=[...document.querySelectorAll('[data-pl-cards] > li')];
 const eerste=kaarten[0];
 const vakken=eerste?eerste.querySelectorAll('[data-pu-slot]').length:0;
 const plus=eerste?!!eerste.querySelector('[data-pu-add], .pu-add'):false;
 return `kaarten ${kaarten.length} · vakken op kaart 1: ${vakken} · plusknop aanwezig: ${plus} · hoogte kaart 1: ${eerste?Math.round(eerste.getBoundingClientRect().height):0}px`;
}));
console.log(fout.length?('FOUTEN '+fout.join(' | ')):'geen jsfouten');
await b.close(); srv.close();
