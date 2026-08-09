/**
 * VISUAILS — pull every photo a customer uploaded for one order, out of R2.
 *
 *   npm run fetch:order VIS-4Q7-2AB
 *   npm run fetch:order VIS-4Q7-2AB -- --out ./intake --local
 *
 * WHY THIS EXISTS
 *
 * Lucas placed a real test order of 30 products in August 2026 and the studio
 * notification arrived saying "Client uploads (60) — 10 of 60 attached to this
 * email. The rest are in R2 under the keys below." Which is correct, and useless
 * on a phone: fifty object keys and no way to open any of them.
 *
 * The cap is deliberate and stays. functions/api/order.js attaches at most 10
 * files and 8 MB, because a mail provider that rejects an oversized message
 * would cost the notification itself — and that email is how the studio learns
 * an order exists. The comment there is blunt about the priority: "The email is
 * never the only copy; R2 is." So the email is a heads-up, and this is how you
 * get the actual files.
 *
 * WHY A SCRIPT AND NOT A BUTTON. A download route in the admin panel is the
 * right long-term answer and it is what the per-order workbench in the portal
 * plan is for. This exists because it needs no deploy, works today, and the
 * files are needed today.
 *
 * HOW IT WORKS. The keys are not scraped from the email — the `files` table
 * already holds one row per uploaded object with its r2_key, so this asks D1
 * for the order and then pulls each key with wrangler. Both are wrangler
 * commands you are already authenticated for; there are no API tokens to
 * manage and nothing is stored in this repo.
 *
 * ONE OBJECT PER CALL, because that is all `wrangler r2 object get` offers —
 * there is no recursive download and no list subcommand. Sixty sequential calls
 * is slow and completely fine for something run a few times a day; the
 * alternative is an S3 client and a credentials file, which is a bigger surface
 * than the problem deserves.
 */
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { wranglerOrThrow, assertSafeArg, warmLogin } from './lib/wrangler.mjs';

const args = process.argv.slice(2);
const ref = args.find((a) => !a.startsWith('--'));
const outFlag = args.indexOf('--out');
const outDir = outFlag >= 0 ? args[outFlag + 1] : null;
// --local reads the local D1, which is what `wrangler pages dev` writes to.
// Default is remote, because the orders you actually want are the real ones.
const remote = !args.includes('--local');

if (!ref) {
  console.error('Usage: npm run fetch:order <ORDER-REF> [-- --out ./dir] [--local]');
  process.exit(2);
}

// THE REF IS CHECKED BEFORE IT IS USED, for two reasons that arrived together.
// It is interpolated into a SQL string below, and on Windows the whole command
// now passes through a shell (see scripts/lib/wrangler.mjs). Either one on its
// own would be worth a guard; both at once, on a value typed at a prompt, make
// it not optional. A real ref is letters, digits and hyphens — makeRef() in
// functions/api/order.js emits nothing else.
if (!/^[A-Za-z0-9-]{3,40}$/.test(ref)) {
  console.error(`"${ref}" ziet er niet uit als een order-referentie (letters, cijfers en streepjes).`);
  process.exit(2);
}
assertSafeArg(ref, 'order-referentie');

const DB = 'visuails';
const BUCKET = 'visuails-uploads';

/* wrangler moved to scripts/lib/wrangler.mjs on 2026-08-06.
 *
 * The call here was `execFile('npx', ...)`, which on Windows cannot start
 * anything: `npx` exists there only as `npx.cmd`, and Node has refused to spawn
 * a `.cmd` without `shell: true` since the CVE-2024-27980 patch. So this script
 * failed with a bare `spawn npx ENOENT` on the only machine that runs it —
 * before it ever reached Cloudflare, which means the 7403 that was blamed for
 * it was never what stopped this command. See that module's header. */
const wrangler = (argv) => wranglerOrThrow(argv);

/**
 * The order's uploads, straight from D1.
 *
 * kind='upload' matters: 'delivery' rows are what WE send back, and pulling
 * those into a folder named after the customer's intake would be quietly
 * wrong. product_key and shot come along so the files land with names a human
 * can sort — p1-front.jpg beats 001-6ff23537-9288.jpg on every axis.
 */
async function listUploads() {
  const sql = `
    SELECT f.r2_key AS k, f.filename AS n, f.product_key AS p, f.shot AS s, f.bytes AS b
    FROM files f JOIN orders o ON o.id = f.order_id
    WHERE o.ref = '${ref.replace(/'/g, "''")}' AND f.kind = 'upload'
    ORDER BY f.id`;
  const out = await wrangler([
    'd1', 'execute', DB, remote ? '--remote' : '--local', '--json', '--command', sql,
  ]);
  // wrangler prints a banner before the JSON on some versions, so the parse
  // starts at the first bracket rather than at byte zero.
  const start = out.indexOf('[');
  if (start < 0) throw new Error(`could not read a result set from wrangler:\n${out.slice(0, 400)}`);
  const parsed = JSON.parse(out.slice(start));
  return parsed[0]?.results ?? [];
}

/** p3-back.jpg, or the original name when we have nothing better. */
function niceName(row, i) {
  const ext = path.extname(row.n || row.k || '') || '.jpg';
  if (row.p && row.s) return `${row.p}-${row.s}${ext}`;
  if (row.n) return row.n;
  return `${String(i + 1).padStart(3, '0')}${ext}`;
}

// Token vernieuwen voordat er iets gevraagd wordt: dit script viel eerder om op
// een 7403 die als een rechtenprobleem leest en er geen is — zie warmLogin() in
// lib/wrangler.mjs.
await warmLogin();

const rows = await listUploads();
if (!rows.length) {
  console.error(`No uploads found for ${ref}. Is the ref right, and is it a ${remote ? 'production' : 'local'} order?`);
  process.exit(1);
}

const dir = path.resolve(outDir || `./intake-${ref}`);
await mkdir(dir, { recursive: true });

console.log(`${rows.length} upload(s) for ${ref} → ${dir}\n`);

let ok = 0;
const failed = [];
for (const [i, row] of rows.entries()) {
  const name = niceName(row, i);
  const dest = path.join(dir, name);
  process.stdout.write(`  ${String(i + 1).padStart(3, ' ')}/${rows.length}  ${name} … `);
  try {
    await wrangler([
      'r2', 'object', 'get', `${BUCKET}/${row.k}`,
      '--file', dest, ...(remote ? ['--remote'] : ['--local']),
    ]);
    ok++;
    process.stdout.write('ok\n');
  } catch (err) {
    failed.push([name, row.k, (err.stderr || err.message || '').split('\n')[0]]);
    process.stdout.write('FAILED\n');
  }
}

console.log(`\n${ok}/${rows.length} downloaded into ${dir}`);
if (failed.length) {
  console.log(`\n${failed.length} did not come down:`);
  for (const [name, key, why] of failed) console.log(`  ${name}  (${key})\n    ${why}`);
  process.exit(1);
}
