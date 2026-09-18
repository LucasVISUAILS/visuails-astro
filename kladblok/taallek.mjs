/* Engelse zinnen op Nederlandse pagina's en andersom — de stille resten van een
   vertaling die halverwege is blijven staan. Heuristisch: losse woorden die in
   de andere taal niet bestaan, geteld per pagina. */
import { readFileSync, readdirSync } from 'node:fs';
import { join, relative } from 'node:path';

const html = [];
(function loop(d){ for (const e of readdirSync(d,{withFileTypes:true})) {
  const v = join(d, e.name);
  if (e.isDirectory()) { if (e.name === '_astro') continue; loop(v); }
  else if (e.name.endsWith('.html')) html.push(v);
} })('dist');

/* Woorden die in de ene taal heel gewoon zijn en in de andere niet voorkomen.
   Bewust saai gekozen: functiewoorden, geen vaktermen die we expres lenen. */
const ENGELS = /\b(the|your|you|with|which|what|from|into|about|every|their|there|here's|we'll|you'll|does|doesn't|without|before|after|through|between|because|something|anything|nothing)\b/gi;
const NEDERLANDS = /\b(het|jouw|jij|niet|maar|omdat|waarom|zodat|tussen|voordat|nadat|zonder|iets|niets|alles|elke|hun|daar|hier|wordt|worden|krijg|krijgt)\b/gi;

/* Woorden die we bewust in beide talen gebruiken. */
const LEEN = /\b(carousel|lifestyle|catalog|look|looks|hook|hooks|shoot|studio|brand|model|set|sets|flash|glow|dunes|campagne|online|e-commerce|feed|banner|crop|prompt|upload|uploads)\b/gi;

const tekstVan = (bron) => bron
  .replace(/<script[\s\S]*?<\/script>/g, ' ')
  .replace(/<style[\s\S]*?<\/style>/g, ' ')
  .replace(/<!--[\s\S]*?-->/g, ' ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&[a-z]+;|&#\d+;/gi, ' ')
  .replace(/\s+/g, ' ');

const uit = [];
for (const f of html) {
  const pad = '/' + relative('dist', f).replace(/\\/g,'/').replace(/index\.html$/,'');
  if (pad.startsWith('/concept')) continue;
  const nl = /^\/nl\//.test(pad) || pad === '/nl/';
  const t = tekstVan(readFileSync(f,'utf8')).replace(LEEN,' ');
  const en = (t.match(ENGELS) || []).length;
  const ned = (t.match(NEDERLANDS) || []).length;
  const totaal = en + ned;
  if (totaal < 20) continue;
  const aandeelVreemd = nl ? en / totaal : ned / totaal;
  if (aandeelVreemd > 0.08) uit.push({ pad, nl, en, ned, pct: Math.round(aandeelVreemd*100) });
}
uit.sort((a,b)=>b.pct-a.pct);
console.log(`${uit.length} pagina's met een verdacht aandeel van de andere taal\n`);
uit.forEach((r)=>console.log(`  ${r.pad.padEnd(34)} ${r.nl?'NL':'EN'}-pagina · ${r.pct}% van de andere taal (en ${r.en} / nl ${r.ned})`));
