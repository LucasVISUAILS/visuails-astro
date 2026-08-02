/* Replays Lucas's actual JSON through read(), plus the failure shapes it is
 * supposed to name. The bug this catches: a verdict of "Inconclusive" when
 * every probe is green. */
import fs from 'node:fs/promises';
const src = await fs.readFile(new URL('../functions/admin/debug-mollie.js', import.meta.url), 'utf8');
const read = new Function('return ' + src.match(/function read\(out\) \{[\s\S]*?\n\}/)[0])();

const REAL = {
  key: { problems: null },
  secrets: { MOLLIE_API_KEY: { set: true, length: 35, allPrintable: true, prefix: 'test_' } },
  probes: {
    A_transport: { status: 400, isJson: true, body: { title: 'Bad Request', detail: 'Invalid Authorization header' }, headers: 'server=cloudflare cf-ray=a24c…' },
    B_auth: { status: 200, isJson: true, body: { count: 3 } },
    C_minimalPayment: { status: 201, isJson: true, body: { id: 'tr_L2iT2EYtYc9tiUpy26pUJ', status: 'open', mode: 'test' } },
    D_realPayment: { status: 201, isJson: true, body: { id: 'tr_rNy2vpmtT9Uu3VF736pUJ', status: 'open', mode: 'test' } },
  },
};

const SYN = String.fromCharCode(0x16);
const cases = [
  ['Lucas 09:30 — all green', REAL],
  ['the original broken key', { ...REAL, key: { problems: ['1 non-printable character(s): U+0016', 'too short to be a Mollie key'] }, secrets: { MOLLIE_API_KEY: { set: true, length: 1, controlChars: ['U+0016'] } }, probes: {} }],
  ['A refused, empty body', { ...REAL, probes: { ...REAL.probes, A_transport: { status: 400, isJson: false, bodyBytes: 0, headers: 'server=cloudflare cf-ray=x' } } }],
  ['A ok, B refused', { ...REAL, probes: { ...REAL.probes, B_auth: { status: 400, isJson: false, bodyBytes: 0 } } }],
  ['A ok, B 401', { ...REAL, probes: { ...REAL.probes, B_auth: { status: 401, isJson: true, body: { title: 'Unauthorized Request' } } } }],
  ['C refused', { ...REAL, probes: { ...REAL.probes, C_minimalPayment: { status: 400, isJson: false, bodyBytes: 0 } } }],
  ['C ok, D refused', { ...REAL, probes: { ...REAL.probes, D_realPayment: { status: 400, isJson: false, bodyBytes: 0 } } }],
  ['D rejected with a field', { ...REAL, probes: { ...REAL.probes, D_realPayment: { status: 422, isJson: true, body: { title: 'Unprocessable Entity', field: 'webhookUrl', detail: 'The webhook URL is invalid' } } } }],
  ['cannot reach Mollie', { ...REAL, probes: { ...REAL.probes, A_transport: { threw: true, error: 'fetch failed' } } }],
];

let bad = 0;
for (const [name, out] of cases) {
  const verdict = read(out);
  const inconclusive = /Inconclusive/.test(verdict);
  if (inconclusive) bad++;
  console.log(`${inconclusive ? 'FAIL' : ' ok '}  ${name}`);
  console.log(`      ${verdict.slice(0, 150)}${verdict.length > 150 ? '…' : ''}`);
}
console.log(`\n${cases.length - bad}/${cases.length} produce an actual verdict`);
process.exit(bad ? 1 : 0);
