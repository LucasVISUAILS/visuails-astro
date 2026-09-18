/* Elke interne verwijzing in dist/ nalopen: bestaat het doel, en klopt het anker? */
import { readFileSync, existsSync, statSync, readdirSync } from 'node:fs';
import { join, relative } from 'node:path';

const html = [];
(function loop(d){ for (const e of readdirSync(d,{withFileTypes:true})) {
  const v = join(d, e.name);
  if (e.isDirectory()) { if (e.name === '_astro') continue; loop(v); }
  else if (e.name.endsWith('.html')) html.push(v);
} })('dist');

const bestaat = (pad) => {
  const p = join('dist', pad);
  if (existsSync(p) && statSync(p).isFile()) return true;
  if (existsSync(p) && statSync(p).isDirectory() && existsSync(join(p,'index.html'))) return true;
  if (existsSync(p + '.html')) return true;
  if (existsSync(join(p, 'index.html'))) return true;
  return false;
};

const kapot = [];
const ankers = [];
for (const f of html) {
  const bron = readFileSync(f, 'utf8');
  const pagina = '/' + relative('dist', f).replace(/\\/g,'/').replace(/index\.html$/,'');
  const eigenIds = new Set([...bron.matchAll(/\sid="([^"]+)"/g)].map((m)=>m[1]));
  for (const m of bron.matchAll(/(?:href|src)="(\/[^"#?]*)(#[^"]*)?"/g)) {
    const doel = m[1];
    if (doel.startsWith('//')) continue;
    if (!bestaat(doel)) kapot.push(`${pagina} → ${doel}`);
  }
  for (const m of bron.matchAll(/href="(#[^"]+)"/g)) {
    const id = m[1].slice(1);
    if (id && !eigenIds.has(id)) ankers.push(`${pagina} → ${m[1]}`);
  }
}
const uniek = (a) => [...new Set(a)];
console.log('kapotte interne verwijzingen:', uniek(kapot).length);
uniek(kapot).slice(0,25).forEach((x)=>console.log('  ' + x));
console.log('\nankers zonder doel op de pagina:', uniek(ankers).length);
uniek(ankers).slice(0,25).forEach((x)=>console.log('  ' + x));
