/* De snelheidsrem telt per IP en werkt; elke poging krijgt daarom zijn eigen
   adres, zodat deze reeks meet wat er ACHTER de rem gebeurt. */
let tel = 0;
const eigenIp = () => `198.51.100.${(tel += 1) % 250 + 1}`;

/* DEZELFDE AANVAL OP DE BETAALDE FORMULIEREN — 10 september 2026
   Lucas: *"Stel je vind fouten bij het breken vanuit meerdere kanten
   controleer dan ook gelijk andere bestelforms op dezelfde problemen."*
   De vraag is hier een andere dan bij de proef: daar staat de PRIJS vast en kan
   de omvang van het werk zwellen; hier moet elke uitbreiding van het werk ook
   in de prijs landen. */
const B = process.env.BASIS || 'http://127.0.0.1:8793';
const basis = {
  service: 'catalog', products: '2', style: '', background: 'white',
  first_name: 'Proef', last_name: 'Tester', brand: 'Proefmerk',
  email: 'breek6@voorbeeld.test',
  address_line1: 'Teststraat 1', postal_code: '1234 AB', city: 'Teststad',
  country: 'NL', no_vat: '1', business_declaration: '1', withdrawal_consent: '1',
};
async function post(naam, velden) {
  const res = await fetch(`${B}/api/order`, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded', accept: 'application/json', 'cf-connecting-ip': eigenIp() },
    body: new URLSearchParams({ ...basis, ...velden }), redirect: 'manual',
  });
  console.log(`── ${naam}\n   ${res.status} ${res.headers.get('location') || (await res.text()).slice(0,120)}`);
}
await post('A · twee producten, gewoon', {});
await post('B · negenhonderd producten', { products: '999' });
await post('C · nul producten', { products: '0' });
await post('D · een negatief aantal', { products: '-5' });
await post('E · acht hoeken erbij', { angle_side: '1', angle_inside: '1', angle_hardware: '1', angle_flat_lay: '1', angle_three_quarter: '1', 'angle_back-on-model': '1', 'angle_detail-on-model': '1', 'angle_in-hand': '1' });
await post('F · meer complete looks dan producten', { outfit_count: '99' });
await post('G · voorrang', { voorrang: '1' });
await post('H · een verzonnen dienst', { service: 'gratis' });
await post('I · hoge resolutie zonder te betalen', { hoogres: '1', hoog_res: '1' });
