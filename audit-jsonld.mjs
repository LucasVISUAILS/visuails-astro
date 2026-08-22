/* JSON-LD: is elk blok geldig JSON, en klopt wat erin staat met de pagina? */
import { readFileSync, globSync } from 'node:fs';
const soorten = new Map();
let stuk = 0, blokken = 0;
const fouten = [];
for (const f of globSync('dist/**/*.html').sort()) {
  const pagina = '/' + f.replace(/^dist\//, '').replace(/index\.html$/, '').replace(/\.html$/, '');
  const html = readFileSync(f, 'utf8');
  for (const m of html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)) {
    blokken++;
    let data;
    try { data = JSON.parse(m[1]); }
    catch (e) { stuk++; fouten.push(`${pagina}: ongeldige JSON — ${e.message.slice(0, 80)}`); continue; }
    const lijst = Array.isArray(data) ? data : (data['@graph'] || [data]);
    for (const n of lijst) {
      const t = n['@type'] || '?';
      soorten.set(t, (soorten.get(t) || 0) + 1);
      for (const [k, v] of Object.entries(n)) {
        if (typeof v === 'string' && /undefined|\[object Object\]|NaN/.test(v)) fouten.push(`${pagina}: ${t}.${k} = ${v.slice(0, 60)}`);
        if (typeof v === 'string' && /^https?:\/\/visuails\.com/.test(v) && / /.test(v)) fouten.push(`${pagina}: ${t}.${k} bevat een spatie`);
      }
    }
  }
}
console.log(`${blokken} JSON-LD-blokken, ${stuk} stuk`);
console.log([...soorten].sort((a,b)=>b[1]-a[1]).map(([t,n]) => `   ${String(t).padEnd(22)} ${n}`).join('\n'));
console.log(fouten.length ? '\nFOUTEN:\n' + fouten.slice(0, 20).map(x=>'   '+x).join('\n') : '\ngeen fouten');
