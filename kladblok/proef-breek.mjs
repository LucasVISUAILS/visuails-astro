/* DE PROEF VAN MEERDERE KANTEN PROBEREN TE BREKEN — 10 september 2026
   ═══════════════════════════════════════════════════════════════════════════
   Lucas: *"Check alle mogelijkheden en probeer ook het systeem te breken door
   het van meerdere kanten te bekijken."*

   Dit post RECHTSTREEKS naar /api/order, want dat is waar een aanvaller ook
   post: het formulier is een suggestie, het eindpunt is de waarheid. Elke proef
   hieronder is een poging om iets te krijgen wat de pagina niet aanbiedt. */
const B = process.env.BASIS || 'http://127.0.0.1:8791';

const basis = {
  service: 'test-sample',
  sample_type: 'catalog',
  background: 'white',
  products: '1',
  first_name: 'Proef', last_name: 'Tester',
  brand: 'Proefmerk', email: 'breek5@voorbeeld.test',
  address_line1: 'Teststraat 1', postal_code: '1234 AB', city: 'Teststad',
  country: 'NL', vat: '', no_vat: '1',
  business_declaration: '1', withdrawal_consent: '1',
};

/* DE SNELHEIDSREM UITZETTEN TUSSEN DE PROEVEN. Hij werkt — dat is precies wat
   deze reeks als eerste tegenkwam, tien posts achter elkaar leverden negen keer
   429 op — maar hij staat een systematische controle in de weg. Dus wordt hij
   tussen elke poging leeggemaakt; wat hier getoetst wordt, is wat er ACHTER die
   rem gebeurt. */
/* De snelheidsrem telt PER IP, en hij werkt: tien posts achter elkaar leverden
   negen keer 429 op. Dat is precies wat hij moet doen, maar het houdt een
   systematische controle tegen. Elke poging krijgt daarom zijn eigen adres —
   wat hier getoetst wordt, is wat er ACHTER de rem gebeurt. */
let n = 0;
const eigenIp = () => `203.0.113.${(n += 1) % 250 + 1}`;

async function post(naam, velden) {
  const body = new URLSearchParams({ ...basis, ...velden });
  const res = await fetch(`${B}/api/order`, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded', accept: 'application/json', 'cf-connecting-ip': eigenIp() },
    body,
    redirect: 'manual',
  });
  let tekst = '';
  try { tekst = (await res.text()).slice(0, 200); } catch {}
  console.log(`\n── ${naam}`);
  console.log(`   ${res.status} ${res.headers.get('location') || ''}`);
  console.log(`   ${tekst.replace(/\s+/g, ' ').slice(0, 180)}`);
  return res;
}

await post('1 · een gewone proef', {});
await post('2 · dertig producten voor één euro', { products: '30' });
await post('3 · met voorrang erbij', { products: '1', voorrang: '1' });
await post('4 · met complete looks erbij', { products: '1', outfit_count: '5' });
await post('5 · met acht extra hoeken', { products: '1', angle_side: '1', angle_inside: '1', angle_hardware: '1', angle_flat_lay: '1' });
await post('6 · met een venster dat hij niet mag kiezen', { window_start: '2026-09-15', window_end: '2026-09-19' });
await post('7 · lifestyle zonder look', { sample_type: 'lifestyle', style: '' });
await post('8 · een verzonnen soort', { sample_type: 'allebei' });
await post('9 · zonder soort', { sample_type: '' });
await post('10 · een eigen stijl van iemand anders', { style: 'cs-1' });
