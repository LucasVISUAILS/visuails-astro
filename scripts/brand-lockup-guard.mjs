// Brand lockup guard — an Astro integration that fails `astro build`.
//
// VISUAILS has two marks: the V glyph (`#markglyph`) and the VISUAILS logotype
// (`#wordmark`). Lucas's instruction is that they are never placed together —
// they are two alternative signatures for the same brand, not a lockup, and a
// V sitting next to the word it already spells reads as a duplicated logo.
//
// A house rule that lives only in a comment gets broken by the next component
// that needs "a logo here". So the rule is a build failure instead.
//
// The rule, stated so a machine can check it: for any wordmark <use> and any
// markglyph <use> on a page, their nearest common ancestor must be <body>.
// Which is to say the two marks may both exist on a page — the sticky header
// carries the logotype while the conversion bar carries the glyph, and that is
// the intended use — but they may never share a container, a row, or a
// component. Sharing an ancestor below <body> is exactly what "side by side"
// means in markup terms, and it is the only formulation that catches a lockup
// without also banning the legitimate arrangement.
//
// The inline sprite is excluded: it necessarily defines both symbols, and a
// <symbol> renders nothing on its own.

import { readdir, readFile } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'parse5';

const MARKS = { '#wordmark': 'wordmark', '#markglyph': 'V glyph' };

async function htmlFiles(dir, out = []) {
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) await htmlFiles(p, out);
    else if (e.name.endsWith('.html')) out.push(p);
  }
  return out;
}

/** Path of ancestor nodes from <html> down to (and excluding) `node`. */
function findUses(node, ancestors, hits) {
  if (node.tagName === 'symbol' || node.tagName === 'defs') return;
  if (node.tagName === 'use') {
    const href = node.attrs?.find((a) => a.name === 'href' || a.name === 'xlink:href')?.value;
    if (href && MARKS[href]) hits.push({ mark: MARKS[href], path: ancestors });
  }
  const kids = node.childNodes || [];
  if (!kids.length) return;
  const next = node.tagName ? [...ancestors, node] : ancestors;
  for (const k of kids) findUses(k, next, hits);
}

function describe(el) {
  const cls = el.attrs?.find((a) => a.name === 'class')?.value;
  return cls ? `<${el.tagName} class="${cls.split(/\s+/).slice(0, 2).join(' ')}">` : `<${el.tagName}>`;
}

export default function brandLockupGuard() {
  return {
    name: 'visuails:brand-lockup-guard',
    hooks: {
      'astro:build:done': async ({ dir, logger }) => {
        const root = fileURLToPath(dir);
        const files = await htmlFiles(root);
        const failures = [];

        for (const file of files) {
          const hits = [];
          findUses(parse(await readFile(file, 'utf8')), [], hits);

          const words = hits.filter((h) => h.mark === 'wordmark');
          const glyphs = hits.filter((h) => h.mark === 'V glyph');

          for (const w of words) {
            for (const g of glyphs) {
              // nearest common ancestor = last shared entry in the two paths
              let i = 0;
              while (i < w.path.length && i < g.path.length && w.path[i] === g.path[i]) i++;
              const nca = w.path[i - 1];
              if (!nca) continue;
              if (nca.tagName === 'body' || nca.tagName === 'html') continue;
              failures.push(
                `${relative(root, file)} — the wordmark and the V glyph share ${describe(nca)}. ` +
                  `The two marks are never placed together; give this surface one of them.`
              );
            }
          }
        }

        if (failures.length) {
          logger.error(`brand lockup rule violated in ${failures.length} place(s):`);
          for (const f of new Set(failures)) logger.error(`  ${f}`);
          throw new Error('brand-lockup-guard: the V glyph and the wordmark were placed together.');
        }
        logger.info(`brand lockup rule holds across ${files.length} pages.`);
      },
    },
  };
}
