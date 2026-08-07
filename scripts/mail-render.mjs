/* Draw the four customer emails — the real ones — as a picture.
 *
 * IT IMPORTS THE ACTUAL BUILDERS. customerEmail(), subscriberEmail(),
 * magicLinkEmail() and deliveryEmail() are the same functions the Cloudflare
 * Functions call at send time; nothing here rebuilds a block. That is the whole
 * design of this script: a preview that composes its own version of the mail is
 * a second copy of the layout, it agrees on the day it is written, and it is
 * trusted precisely because it looks right. This one cannot disagree, because
 * there is nothing for it to disagree with.
 *
 * The mark is swapped to a data: URL before rendering — the templates point at
 * https://visuails.com/img/mail/mark-groen.png, which does not exist until the
 * next deploy, and a broken image in the preview reads as a design decision.
 *
 * Run: node scripts/mail-render.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import sharp from 'sharp';

import { customerEmail, subscriberEmail } from '../functions/api/order.js';
import { magicLinkEmail } from '../src/lib/account.js';
import { deliveryEmail, redeliveryEmail } from '../src/lib/admin.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DATA_MARK = 'data:image/png;base64,' +
  fs.readFileSync(path.join(ROOT, 'public/img/mail/mark-groen.png')).toString('base64');

const localise = html => html.replace(/https:\/\/visuails\.com\/img\/mail\/mark-groen\.png/g, DATA_MARK);

const PORTAL = 'https://visuails.com/o/3f9a2c7d5e1b48a6';

const MAILS = [
  {
    label: 'Orderbevestiging · met betaling',
    html: customerEmail('nl', 'VIS-2608-4471', 'catalog', 'Sanne', {
      tier: 'attended',
      window: { start: '2026-08-12', end: '2026-08-14' },
      portal: PORTAL,
      pay: 'https://pay.mollie.com/checkout/select-method/abc123',
      quote: { products: 12, netCents: 102000, vatCents: 21420, grossCents: 123420 },
      upgrade: 'Vanaf 30 producten valt de prijs per product lager uit — het loont om in één keer te bestellen.',
    }),
  },
  {
    label: 'Inloglink',
    html: magicLinkEmail('nl', 'https://visuails.com/account/verify/7Kd2p9QbXm4Rt6Zv').html,
  },
  {
    label: 'Bestelling staat klaar',
    html: deliveryEmail({
      order: { ref: 'VIS-2608-4471', name: 'Sanne', email: 'sanne@voltbrand.nl', lang: 'nl' },
      link: PORTAL,
      n: 24,
    }),
  },
  {
    // De tweede mailsoort, augustus 2026. Staat hier naast de eerste omdat dat
    // de enige manier is om te zien of ze naast elkaar te onderscheiden zijn —
    // twee mails die op elkaar lijken in dezelfde inbox lezen als één mail die
    // per ongeluk twee keer verstuurd is.
    label: 'Revisie staat klaar',
    html: redeliveryEmail({
      order: { ref: 'VIS-2608-4471', name: 'Sanne', email: 'sanne@voltbrand.nl', lang: 'nl' },
      link: PORTAL,
      n: 3,
      revisions: 2,
      note: 'De achtergrond op beeld 4 en 7 is nu egaal wit, en de mouw op beeld 11 is rechtgetrokken.',
    }),
  },
  {
    label: 'Checklist (lead magnet)',
    html: subscriberEmail('nl'),
  },
];

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const shots = [];

for (const m of MAILS) {
  const page = await browser.newPage({ viewport: { width: 640, height: 900 }, deviceScaleFactor: 2 });
  await page.setContent(`<!doctype html><meta charset="utf-8">
    <style>html,body{margin:0;padding:0;background:#16181F}
      .lab{padding:20px 22px 14px;color:#fff;font:700 17px/1.3 Arial,Helvetica,sans-serif}</style>
    <div class="lab">${m.label}</div>${localise(m.html)}`);
  await page.waitForLoadState('networkidle');
  shots.push(await page.screenshot({ fullPage: true }));
  await page.close();
}
await browser.close();

const metas = await Promise.all(shots.map(b => sharp(b).metadata()));
const H = Math.max(...metas.map(m => m.height));
const W = Math.max(...metas.map(m => m.width));
const GAP = 20;

await sharp({
  create: {
    width: W * shots.length + GAP * (shots.length + 1),
    height: H + GAP * 2,
    channels: 4,
    background: '#16181F',
  },
})
  .composite(await Promise.all(shots.map(async (buf, i) => ({
    input: await sharp(buf).extend({ bottom: H - metas[i].height, background: '#EFEFF1' }).toBuffer(),
    left: GAP + i * (W + GAP),
    top: GAP,
  }))))
  .png()
  .toFile(path.join(ROOT, 'mails-definitief.png'));

console.log(`▶ mails-definitief.png — ${MAILS.length} mails, drawn from the real builders`);
