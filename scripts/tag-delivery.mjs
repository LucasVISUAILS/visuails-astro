/**
 * VISUAILS — write the AI-provenance tag into a folder of finished images.
 *
 *   node scripts/tag-delivery.mjs <folder>            # tag, then verify
 *   node scripts/tag-delivery.mjs <folder> --check    # verify only, write nothing
 *   node scripts/tag-delivery.mjs <folder> --fully    # for wholly generated frames
 *
 * WHY THIS EXISTS
 *
 * Two marketplaces now want the disclosure INSIDE the file, not beside it.
 *
 *   Google Merchant Center requires the IPTC `DigitalSourceType` property on
 *   AI-generated product imagery and says in as many words: do not remove
 *   embedded metadata tags such as DigitalSourceType from images created with
 *   generative AI tools. It applies to image_link, additional_image_link and
 *   lifestyle_image_link — which is every file we ship.
 *
 *   Amazon, from late July 2026, requires third-party sellers to flag
 *   photorealistic AI-generated PEOPLE in listing images and A+ content with
 *   IPTC-compatible metadata before upload, following New York's law. The
 *   on-model shot in every catalog set is exactly that person.
 *
 * So this is not paperwork. A customer who cannot show the tag cannot list the
 * image on two of the largest channels they sell through, and the reason they
 * could not show it would have been us.
 *
 * THE VALUE WE WRITE, AND WHY IT IS THE COMPOSITE ONE
 *
 * IPTC's vocabulary separates:
 *   trainedAlgorithmicMedia          — created algorithmically by a model
 *                                      trained on captured content
 *   compositeWithTrainedAlgorithmicMedia
 *                                    — augmentation, correction or enhancement
 *                                      using a generative model
 *
 * A VISUAILS visual starts from the customer's real photographs of a real
 * product and builds the light, the background and the model around them. That
 * is the composite case, and it is the same reading that puts "partially
 * modified by AI" on the EU icon on /ai-act. One workflow, one story, in the
 * file and on the page. `--fully` exists for a frame with no photographed
 * region at all; it should be rare, and if it stops being rare, /ai-act's
 * description of how we work is what needs revisiting, not this flag.
 *
 * WHAT THIS DOES NOT DO
 *
 * It does not write Amazon's own keyword for synthetic performers. Amazon
 * documents that in Seller Central and the exact string is theirs to define; a
 * value invented here would be worse than an absent one, because it would look
 * like compliance. FLAGGED for Lucas: confirm the keyword in Seller Central and
 * add it to KEYWORDS below, where there is a place waiting for it.
 *
 * It does not sign a C2PA manifest. We do not hold a certificate, /ai-act says
 * we do not, and an IPTC property is a different and much cheaper promise: it
 * states the source type, it does not attest to a chain of custody.
 *
 * WHY exiftool-vendored RATHER THAN A HAND-ROLLED WRITER
 *
 * XMP lands in three different containers across the formats we deliver — an
 * APP1 segment in jpeg, an iTXt chunk in png, an 'XMP ' RIFF chunk in webp.
 * Writing all three by hand is three parsers to get wrong on somebody's
 * delivery. exiftool-vendored ships the binary for Windows, macOS and Linux, so
 * this runs on the studio machine without a system install.
 *
 * WEBP IS INCLUDED ON PURPOSE. Converting to webp is what strips provenance in
 * the first place — a converted file comes out as a bare 'VP8 ' chunk with no
 * metadata container at all, which is why /ai-act tells customers that our webp
 * does not carry the model provider's marking. Tagging AFTER conversion puts a
 * disclosure back into the file that the conversion removed. Verified: a tagged
 * webp gains VP8X + 'XMP ' chunks and still decodes.
 */
import { exiftool } from 'exiftool-vendored';
import { readdir, stat } from 'node:fs/promises';
import path from 'node:path';
/*
 * De twee waarden en de schrijffunctie staan sinds 9 augustus 2026 in
 * scripts/lib/aitag.mjs, omdat scripts/deliver.mjs ze ook nodig heeft. Twee
 * scripts met elk hun eigen kopie van deze url is de dag waarop het ene een
 * andere claim in een bestand zet dan het andere — en niemand leest een tag na.
 * De uitleg over het gereedschap en het moment blijft hierboven staan: die gaat
 * over dit script en niet over de waarde.
 */
import { COMPOSITE, FULLY, writeSourceType } from './lib/aitag.mjs';

/**
 * Extra IPTC keywords to write alongside the source type.
 *
 * Empty on purpose — see "WHAT THIS DOES NOT DO" above. Amazon's synthetic
 * performer keyword goes here once it has been read off Seller Central rather
 * than guessed at.
 */
const KEYWORDS = [];

// The formats we actually deliver. Anything else in the folder is left alone
// rather than skipped-with-a-warning: a PDF linesheet or a .txt of notes
// sitting beside the images is normal, and warning about it trains the reader
// to ignore the output.
const EXT = new Set(['.jpg', '.jpeg', '.png', '.webp']);

const args = process.argv.slice(2);
const dir = args.find((a) => !a.startsWith('--'));
const checkOnly = args.includes('--check');
const value = args.includes('--fully') ? FULLY : COMPOSITE;

if (!dir) {
  console.error('Usage: node scripts/tag-delivery.mjs <folder> [--check] [--fully]');
  process.exit(2);
}

/** Every deliverable image under `root`, recursively, in a stable order. */
async function walk(root) {
  const out = [];
  for (const name of (await readdir(root)).sort()) {
    const full = path.join(root, name);
    const s = await stat(full);
    if (s.isDirectory()) out.push(...(await walk(full)));
    else if (EXT.has(path.extname(name).toLowerCase())) out.push(full);
  }
  return out;
}

async function readTag(file) {
  const tags = await exiftool.read(file);
  return tags.DigitalSourceType || null;
}

/**
 * Everything in the file that says where it came from — not just our tag.
 *
 * --check exists to answer one question honestly: does this delivery ALREADY
 * carry provenance, and from whom? A model provider's own manifest and our
 * IPTC property are different objects with different survival odds — the
 * C2PA manifest is cryptographically signed and dies on almost any re-encode,
 * the IPTC property is a plain XMP field and rides along wherever XMP does.
 * Reporting only ours would answer the wrong question and quietly encourage
 * double work on files that are already fine.
 *
 * C2PA is detected by key shape rather than by one tag name: exiftool surfaces
 * a JUMBF box under several names across versions and formats, and pinning one
 * of them would report "no manifest" on a file that has one.
 */
async function readProvenance(file) {
  const tags = await exiftool.read(file);
  const keys = Object.keys(tags);
  return {
    dst: tags.DigitalSourceType || null,
    c2pa: keys.some((k) => /jumbf|c2pa/i.test(k)),
    software: tags.Software || tags.CreatorTool || null,
  };
}

const files = await walk(path.resolve(dir));
if (!files.length) {
  console.error(`No .jpg/.png/.webp found under ${dir}`);
  await exiftool.end();
  process.exit(1);
}

let tagged = 0;
let already = 0;
const failed = [];

for (const file of files) {
  const rel = path.relative(process.cwd(), file);
  try {
    const before = await readTag(file);

    if (checkOnly) {
      const p = await readProvenance(file);
      const marks = [
        p.dst ? `IPTC ${p.dst.split('/').pop()}` : null,
        p.c2pa ? 'C2PA manifest' : null,
        p.software ? `software: ${p.software}` : null,
      ].filter(Boolean);
      console.log(`  ${p.dst ? '✓' : '·'} ${rel}${marks.length ? ` — ${marks.join(', ')}` : ' — nothing'}`);
      if (p.dst) { already++; } else { failed.push([rel, 'no DigitalSourceType']); }
      continue;
    }

    if (before === value) { already++; continue; }

    // Schrijven én nakijken zit nu in writeSourceType() — zie de noot daar over
    // waarom het terugleesje niet overdreven is. De KEYWORDS-lijst is hier leeg
    // gebleven en wordt daarom niet meer meegestuurd; stond er ooit iets in, dan
    // hoort dat in aitag.mjs bij de tag zelf.
    await writeSourceType(file, value);
    tagged++;
  } catch (err) {
    failed.push([rel, err.message.split('\n')[0]]);
  }
}

await exiftool.end();

const verb = checkOnly ? 'already tagged' : 'tagged';
console.log(`\n${files.length} image(s) under ${dir}`);
console.log(`  ${verb}: ${checkOnly ? already : tagged + already}`);
if (!checkOnly && already) console.log(`    (of which ${already} were already correct)`);
console.log(`  value: ${value.split('/').pop()}`);

if (failed.length) {
  console.log(`\n  ${failed.length} NOT tagged — these cannot be listed on Google Shopping:`);
  for (const [rel, why] of failed) console.log(`    ${rel} — ${why}`);
  process.exit(1);
}
console.log('\nAll files carry the tag. Safe to deliver.');
