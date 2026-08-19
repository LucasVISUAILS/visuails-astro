/*
 * `npm run placeholders` — wat er nog aan beeld ontbreekt.
 *
 * Leest de GEBOUWDE site en niet de bron: een placeholder die in een component
 * staat maar op geen enkele pagina rendert, is geen ontbrekend beeld. Dezelfde
 * redenering als bij de sitemap — wat in dist/ staat, is wat er is.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/*
 * ── fileURLToPath EN GEEN .pathname — 19 AUGUSTUS 2026 ─────────────────────
 *
 * Hier stond `new URL('../dist/', import.meta.url).pathname`. Dat werkte op de
 * Linux-machine waar ik het schreef en meldde op Lucas' Windows-pc, direct na
 * een build die zojuist 90 pagina's had weggeschreven:
 *
 *   dist/ ontbreekt — draai eerst `npx astro build`.
 *
 * `.pathname` is de PAD-component van een file-URL. Die is percent-gecodeerd en
 * houdt op Windows de schuine streep vóór de schijfletter. Zijn map heet
 * "Claude (VISUAILS)" — met een spatie — dus werd er gezocht naar
 * `/E:/Claude%20(VISUAILS)/…`, een pad dat nergens bestaat. Het script zei
 * daarop dat de build ontbrak, wat de enige verklaring is die niet klopte.
 *
 * DIT IS DE TWEEDE KEER. scripts/sitemap-and-404.mjs liep op 10 augustus op
 * precies dit om, en de noot die daar sindsdien staat legt het al helemaal uit.
 * Ik heb die fout negen dagen later opnieuw gemaakt in een nieuw script. De les
 * die daar staat gold dus niet voor dat bestand maar voor de map: een file-URL
 * wordt in deze repo omgezet met fileURLToPath(), nooit met .pathname.
 *
 * Waarom geen enkele test dit ving: alle padlogica hier draait alleen als je
 * hem draait, en op mijn kant staat de repo in /home/claude/visuails-astro —
 * geen spatie, geen schijfletter. Precies het ene pad waarop de fout onzichtbaar
 * is. Vandaar de expliciete controle hieronder in plaats van een stille aanname.
 */
const DIST = fileURLToPath(new URL('../dist/', import.meta.url));
if (!fs.existsSync(DIST)) {
  console.error(`dist/ ontbreekt — draai eerst \`npx astro build\`.`);
  console.error(`  gezocht in: ${DIST}`);
  process.exit(1);
}

/* De waarden komen uit een HTML-attribuut, dus staan de aanhalingstekens er als
   entiteit in. Zonder deze regel leest de lijst als `&quot;met de hand&quot;` —
   en dit is een lijst die iemand met een camera in zijn hand moet kunnen lezen. */
const ontsnap = (t) => String(t)
  .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&')
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#(\d+);/g, (_, n) => String.fromCharCode(n));

const gevonden = [];
const loop = (dir) => {
  for (const naam of fs.readdirSync(dir)) {
    const p = path.join(dir, naam);
    if (fs.statSync(p).isDirectory()) { loop(p); continue; }
    if (!naam.endsWith('.html')) continue;
    const html = fs.readFileSync(p, 'utf8');
    /* `data-message` staat achter `data-subject` in de markup en is optioneel —
       vandaar de losse, niet-hebzuchtige groep in plaats van hem in dezelfde
       expressie verplicht te maken. Zonder deze regel viel elke placeholder MET
       een opdracht buiten de telling, en dat is precies de verkeerde kant op:
       de best gedocumenteerde plekken zouden dan onzichtbaar zijn. */
    for (const m of html.matchAll(/data-placeholder="(photo|video)"[^>]*?data-subject="([^"]*)"(?:[^>]*?data-message="([^"]*)")?/g)) {
      /* `path.relative` en niet `p.slice(DIST.length)`: dat laatste gokt op de
         lengte van een pad dat per platform anders is opgebouwd. De schuine
         strepen erna, zodat deze lijst op Windows en Linux gelijk leest. */
      const pagina = path.relative(DIST, p).split(path.sep).join('/');
      gevonden.push({ pagina, soort: m[1], onderwerp: ontsnap(m[2]), opdracht: ontsnap(m[3] || '') });
    }
  }
};
loop(DIST);

if (!gevonden.length) {
  console.log('Geen open plekken — al het beeld staat er.');
  process.exit(0);
}

/* Per ONDERWERP en niet per pagina: hetzelfde beeld op de Engelse en de
   Nederlandse pagina is één foto die gemaakt moet worden, geen twee. */
const perOnderwerp = new Map();
for (const g of gevonden) {
  const sleutel = `${g.soort} · ${g.onderwerp}`;
  if (!perOnderwerp.has(sleutel)) perOnderwerp.set(sleutel, { paginas: [], opdracht: '' });
  const rij = perOnderwerp.get(sleutel);
  rij.paginas.push(g.pagina);
  if (!rij.opdracht && g.opdracht) rij.opdracht = g.opdracht;
}

const zonder = [...perOnderwerp].filter(([, v]) => !v.opdracht).length;

console.log(`\n${perOnderwerp.size} beeld(en) te maken, op ${gevonden.length} plek(ken):\n`);
for (const [sleutel, v] of [...perOnderwerp].sort()) {
  console.log(`  ${sleutel}`);
  /* De OPDRACHT erbij, want dat is waar deze lijst voor is: hij wordt gelezen
     op het moment dat de foto's gemaakt worden, en dan is "wolvest, on-model"
     te weinig om te weten of het beeld geslaagd is. */
  if (v.opdracht) console.log(`    → ${v.opdracht}`);
  console.log(`    ${v.paginas.join(', ')}`);
}
if (zonder) {
  console.log(`\n${zonder} plek(ken) zonder opdracht. Zet er een \`message\` op:`);
  console.log('  zonder die zin weet je wél wat er gefotografeerd moet worden,');
  console.log('  maar niet waaraan je ziet of de foto zijn werk doet.');
}
console.log('');
