/* Harde feiten die overal hetzelfde moeten zijn: KVK, btw-nummer, adres,
   e-mail, telefoon, en de doorlooptijden. */
import { readFileSync, globSync } from 'node:fs';
import { parse } from 'parse5';
const SKIP = new Set(['script','style','noscript','template','svg','head']);
const tekst = (n, out = []) => {
  if (n.nodeName === '#text') { out.push(n.value); return out; }
  if (SKIP.has(n.nodeName)) return out;
  out.push('\n');
  for (const c of n.childNodes || []) tekst(c, out);
  out.push('\n');
  return out;
};
const patronen = {
  'KVK-nummer':      /\b(?:KVK|KvK|CoC|Chamber of Commerce)[^0-9]{0,20}(\d[\d .]{6,12}\d)/g,
  'btw-nummer':      /\bNL\d{9}B\d{2}\b/g,
  'e-mailadres':     /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi,
  'telefoonnummer':  /\+31[\d ()-]{6,15}/g,
  'IBAN':            /\bNL\d{2}[A-Z]{4}\d{10}\b/g,
  /* Ook de vorm met een koppelteken: "the 72-hour clock", "een 48-uurs
     venster". Zonder dat las de controle 48 uur op veertien Nederlandse
     pagina's en 48 hours op één Engelse, en leek er een verschil tussen de
     talen te zitten dat er niet was. */
  'doorlooptijd':    /\b(\d+)[\s-]?(werkdagen|working days|business days|uur|uurs|hours|hour|dagen|days)\b/gi,
};
const gevonden = {};
for (const k of Object.keys(patronen)) gevonden[k] = new Map();
for (const f of globSync('dist/**/*.html').sort()) {
  const pagina = '/' + f.replace(/^dist\//, '').replace(/index\.html$/, '').replace(/\.html$/, '');
  const doc = parse(readFileSync(f, 'utf8'));
  const body = doc.childNodes.find(c => c.nodeName === 'html')?.childNodes.find(c => c.nodeName === 'body');
  /* SPATIES PLATSLAAN, MAAR NIET DE BLOKGRENZEN. tekst() zet een \n om elk
     blok; werden die samen met de spaties tot één spatie geplet, dan liep het
     telefoonnummer onderaan /privacy door in het kopnummer van de paragraaf
     erna en meldde deze controle "+31 6 25436130 2" als een tweede, afwijkend
     nummer. Er stond nooit iets fout op de pagina — de meting plakte twee
     blokken aan elkaar. */
  const t = tekst(body || doc).join('').replace(/[^\S\n]+/g, ' ').replace(/\n+/g, '\n');
  for (const [naam, re] of Object.entries(patronen)) {
    re.lastIndex = 0; let m;
    while ((m = re.exec(t))) {
      const w = (m[1] ? `${m[1]} ${m[2] || ''}`.trim() : m[0]).replace(/\s+/g, ' ');
      const kaart = gevonden[naam];
      if (!kaart.has(w)) kaart.set(w, new Set());
      kaart.get(w).add(pagina);
    }
  }
}
for (const [naam, kaart] of Object.entries(gevonden)) {
  const rijen = [...kaart].sort((a, b) => b[1].size - a[1].size);
  console.log(`── ${naam.toUpperCase()} (${rijen.length} verschillende) ──`);
  for (const [w, paginas] of rijen.slice(0, 18)) {
    const lijst = [...paginas];
    console.log(`   ${String(w).padEnd(34)} ${String(lijst.length).padStart(3)} pagina's  ${lijst.length <= 4 ? lijst.join(' ') : lijst.slice(0,3).join(' ') + ' …'}`);
  }
  if (rijen.length > 18) console.log(`   … en nog ${rijen.length - 18}`);
  console.log('');
}
