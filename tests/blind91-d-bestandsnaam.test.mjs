/*
 * RONDE 91 · D02 — EEN BESTANDSNAAM VAN ALLEEN EMOJI OF CHINESE TEKENS HOUDT ZIJN EXTENSIE
 * 9 november 2026
 *
 * safeName("😀.jpg") gaf "jpg": de stam werd een streepje, en het weghalen van een voorloopstreep of -punt
 * nam de punt van de extensie mee. Gevonden door een echte upload in het bestelformulier
 * (91/werk/d/d02-uploads.mjs): opgeslagen als "jpg", en /admin bood een download "jpg" zonder extensie.
 *
 *   node tests/blind91-d-bestandsnaam.test.mjs
 */
import { safeName, typeFor } from '../src/lib/uploads.js';
import { onRequestPost } from '../functions/api/upload.js';

let pass = 0;
let fail = 0;
function ok(name, got, want) {
  const good = got === want;
  if (good) pass++; else fail++;
  console.log(`${good ? ' ok  ' : ' FAIL'} ${name}${good ? '' : ` — verwacht ${JSON.stringify(want)}, kreeg ${JSON.stringify(got)}`}`);
}
console.log('\nVISUAILS — ronde 91 D02: bestandsnamen zonder Latijnse letters\n');

for (const [in_, uit] of [
  ['😀.jpg', 'foto.jpg'],
  ['照片.jpg', 'foto.jpg'],
  ['фото.HEIC', 'foto.HEIC'],
  ['---.png', 'foto.png'],
  ['.jpg', 'foto.jpg'],
  /* wat al goed ging, blijft zoals het was */
  ['IMG_0001.JPG', 'IMG_0001.JPG'],
  ['😀 hoodie voorkant 🧥.jpg', 'hoodie-voorkant-.jpg'],
  ['Café Zoë — jurk.jpeg', 'Cafe-Zoe-jurk.jpeg'],
  ['../../etc/passwd', 'passwd'],
  ['zonder-extensie', 'zonder-extensie'],
  ['...', 'file'],
  ['', 'file'],
]) ok(`safeName(${JSON.stringify(in_)})`, safeName(in_), uit);
ok('een lange naam houdt zijn extensie', safeName(`${'a'.repeat(200)}.png`).endsWith('.png'), true);
ok('en is niet langer dan 60', safeName(`${'a'.repeat(200)}.png`).length <= 60, true);
ok('de veilige naam van "😀.jpg" heeft weer een type', typeFor(safeName('😀.jpg')), 'image/jpeg');

/* Door de echte handler: wat er als naam wordt opgeslagen. */
const opgeslagen = new Map();
const env = {
  UPLOADS: {
    async list() { return { objects: [] }; },
    async put(key, _v, o) { opgeslagen.set(key, o.customMetadata); },
  },
};
const JPG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0x10, 0x4a, 0x46, 0x49, 0x46, 0, 1, 1, 0, 0, 1]);
for (const naam of ['😀.jpg', '照片.heic']) {
  const fd = new FormData();
  fd.append('file', new File([JPG], naam));
  const res = await onRequestPost({ request: new Request('https://visuails.com/api/upload', { method: 'POST', body: fd }), env });
  const body = await res.json();
  ok(`/api/upload "${naam}": aangenomen`, res.status, 200);
  ok(`/api/upload "${naam}": naam in het antwoord`, body.file && body.file.name, naam.endsWith('.heic') ? 'foto.heic' : 'foto.jpg');
  ok(`/api/upload "${naam}": sleutel eindigt op de extensie`, /\/\d{3}-[0-9a-f]{8}-foto\.(jpg|heic)$/.test(body.file && body.file.key), true);
}
console.log(`\n${pass} goed, ${fail} fout`);
process.exit(fail ? 1 : 0);
