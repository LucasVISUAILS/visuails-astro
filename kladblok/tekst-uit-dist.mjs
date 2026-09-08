/* Leest de gebouwde pagina's als platte tekst, zodat een lezer (of een agent)
   ze kan doorlopen zoals een bezoeker dat doet. */
import { readFile, writeFile } from 'node:fs/promises';
const PADEN = process.argv.slice(2);
function tekst(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<template[\s\S]*?<\/template>/gi, ' ')
    .replace(/<\/(h1|h2|h3|h4|p|li|section|div|tr|button|a|label|legend|summary|figcaption)>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&#39;|&apos;/g, "'")
    .replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&euro;/g, '€')
    .replace(/[ \t]+/g, ' ')
    .split('\n').map((r) => r.trim()).filter(Boolean).join('\n')
    .replace(/\n{3,}/g, '\n\n');
}
for (const p of PADEN) {
  const html = await readFile(`dist${p.endsWith('/') ? p + 'index.html' : p}`, 'utf8');
  const naam = p.replace(/\W+/g, '-').replace(/^-|-$/g, '') || 'home';
  await writeFile(`kladblok/tekst/${naam}.txt`, tekst(html));
  console.log(naam, tekst(html).length, 'tekens');
}
