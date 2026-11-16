// VISUAILS — /admin/op-maat: de aanvragen op maat, de voorbeeldrondes en de offerte. 15 november 2026, lijst 112.
//
// Leesroutes: /admin/op-maat (de lijst) en /admin/op-maat/<id> (één aanvraag: wat de klant invulde, de schatting, zijn
// referenties, zijn reacties per ronde, de voorbeelden en de offerte). /admin/op-maat/beeld/<soort>/<id> geeft een
// referentie of voorbeeld uit R2. POST /admin/op-maat/<id> met do=voorbeeld (een beeld erbij), klaar (de ronde naar de
// klant), offerte (de offerte zetten en mailen; src/lib/opMaatOfferte.js), link (de betaallink opnieuw), stand. De helpers (html, page, adminNav, esc, seeOther,
// logAdmin) komen uit admin.js, zodat dit bestand geen kring met admin.js maakt.

import { STAND_TEKST, DIENST_NAAM } from '../data/opMaat.js';
import { schatting, regelNaam, GRATIS_STIJLRONDES } from '../data/opMaatPrijs.js';
import { merkVan, referentiesVan, besluitenVan } from './opMaat.js';
import {
  voorbeeldenVan, huidigeRonde, rondeVoorNieuwBeeld, voorbeeldSleutel, voegVoorbeeldToe, zetVoorbeeldKlaar, leesRegels,
  VOORBEELD_TYPES, VOORBEELD_BYTES, GRATIS_RONDES_TOTAAL,
} from './opMaatRondes.js';
import { offerteVoorScherm, stuurOfferte, betaallinkOpnieuw, bedragen } from './opMaatOfferte.js';
import { countryOptions, vatStatement } from '../data/vat.js';
import { zetStand, STUDIO_MAG } from './opMaat.js';

const leesJson = (s, d) => { try { return JSON.parse(s) ?? d; } catch { return d; } };
const STAND_NL = STAND_TEKST.nl;

export async function renderOpMaatLijst({ env }, h) {
  const { results } = await env.DB.prepare(`SELECT a.id, a.dienst, a.stand, a.bijgewerkt_op, a.verstuurd_op, c.brand, c.email
    FROM maat_aanvragen a JOIN customers c ON c.id = a.customer_id WHERE a.stand != 'concept' ORDER BY (a.stand IN ('verstuurd', 'akkoord')) DESC, a.bijgewerkt_op DESC LIMIT 200`).all().catch(() => ({ results: [] }));
  const rijen = (results || []).map((a) => `<tr><td><a href="/admin/op-maat/${a.id}">#${a.id}</a></td><td>${h.esc(a.brand || a.email)}</td><td>${h.esc(DIENST_NAAM.nl[a.dienst] || a.dienst)}</td><td>${['verstuurd', 'akkoord'].includes(a.stand) ? '<strong>Wij zijn aan zet</strong> · ' : ''}${h.esc(STAND_NL[a.stand] || a.stand)}</td><td>${h.esc(a.bijgewerkt_op || '')}</td></tr>`).join('');
  const body = `${h.adminNav('opmaat')}
<h1>Op maat</h1>
${h.klantTabs ? h.klantTabs('opmaat') : ''}
<p class="lede">De verstuurde aanvragen op maat. Bij "Wij zijn aan zet" wacht de klant op een voorbeeld of een offerte.</p>
${rijen ? `<table class="tabel"><thead><tr><th>Aanvraag</th><th>Klant</th><th>Dienst</th><th>Stand</th><th>Bijgewerkt</th></tr></thead><tbody>${rijen}</tbody></table>` : '<p class="meta">Nog geen verstuurde aanvragen.</p>'}`;
  return h.html(h.page({ title: 'Op maat', body }));
}

function waarden(o, pre = '') {
  /* De intake als platte lijst "pad: waarde", zodat de studio alles ziet zonder per dienst een eigen scherm. */
  const uit = [];
  for (const [k, v] of Object.entries(o || {})) {
    const p = pre ? `${pre}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) uit.push(...waarden(v, p));
    else if (Array.isArray(v)) v.forEach((x, i) => (x && typeof x === 'object' ? uit.push(...waarden(x, `${p}.${i + 1}`)) : uit.push([`${p}.${i + 1}`, x])));
    else uit.push([p, v]);
  }
  return uit;
}

export async function renderOpMaatAanvraag({ env }, url, id, h) {
  const r = await env.DB.prepare('SELECT a.*, c.brand, c.email, c.country, c.vat_number FROM maat_aanvragen a JOIN customers c ON c.id = a.customer_id WHERE a.id = ?').bind(id).first();
  if (!r) return h.html(h.page({ title: 'Niet gevonden', body: `${h.adminNav('opmaat')}<h1>Deze aanvraag bestaat niet</h1><p><a href="/admin/op-maat">Terug</a></p>` }), 404);
  const inhoud = leesJson(r.inhoud_json, {});
  const merk = await merkVan(env, r.customer_id);
  const sch = schatting(r.dienst, inhoud);
  const refs = await referentiesVan(env, id);
  const besl = await besluitenVan(env, id);
  const vb = await voorbeeldenVan(env, id);
  const ronde = await huidigeRonde(env, id);
  const off = await offerteVoorScherm(env, id).catch(() => null);
  const klaar = url.searchParams.get('klaar') || '';
  const fout = url.searchParams.get('fout') || '';
  const e = h.esc;
  const rij = ([k, v]) => `<tr><th>${e(k)}</th><td>${e(String(v))}</td></tr>`;
  const regels = sch.regels.map((g) => `${regelNaam(g.id)};${g.bedrag}`).join('\n');
  const rondes = [...new Set(vb.map((v) => v.ronde))].map((n) => `<h3>Ronde ${n}${n > GRATIS_RONDES_TOTAAL ? ' <span class="meta">(na de gratis rondes)</span>' : ''}</h3><div class="maat-beelden">${vb.filter((v) => v.ronde === n).map((v) => `<figure><img src="/admin/op-maat/beeld/voorbeeld/${v.id}" alt="" loading="lazy" width="200"><figcaption>${e(v.bestandsnaam || '')}</figcaption></figure>`).join('')}</div>`).join('');
  const reacties = besl.map((b) => `<li><strong>${e(b.onderwerp)}</strong> · ${e(b.besluit)} · ${e(b.op)}${b.notitie ? `<br>${e(b.notitie).replace(/\n/g, '<br>')}` : ''}</li>`).join('');
  const kanBeeld = ['verstuurd', 'voorstel'].includes(r.stand);
  const opbouw = await rondeVoorNieuwBeeld(env, id, r.stand);
  /* Naar de klant kan alleen een ronde die beelden heeft en waar hij nog niet op reageerde. */
  const kanKlaar = r.stand === 'verstuurd' && ronde > 0 && ronde === opbouw;
  /* De offerte (15 november 2026): wat er gestuurd is, wat de klant deed, en het formulier om hem (opnieuw) te sturen. */
  const g = (x) => `€${Number(x).toLocaleString('nl-NL', { minimumFractionDigits: Number.isInteger(Number(x)) ? 0 : 2, maximumFractionDigits: 2 })}`;
  const btwTekst = (o) => (o.aanbetalingBtw > 0 ? `${Math.round(o.btwTarief * 100)}% btw (${g(o.aanbetalingBtw)} over de helft)` : (vatStatement(o.btwBehandeling, 'nl') || 'geen btw'));
  const stand = !off ? '' : off.betaald ? `<p class="okline">Akkoord op ${e(off.akkoordOp)} · bestelling <a href="/admin/orders/${off.orderId}/files">${e(off.ref)}</a> is <strong>betaald</strong>. Het restant (${g(off.rest)} excl. btw) vraag je op die bestelling met "Restant vragen"; het bedrag staat er al in.</p>`
    : off.akkoordOp ? `<p class="${off.linkOp ? 'okline' : 'warnline'}">Akkoord op ${e(off.akkoordOp)} · bestelling <a href="/admin/orders/${off.orderId}/files">${e(off.ref)}</a> · ${off.linkOp ? `betaallink gemaild naar ${e(off.email)} op ${e(off.linkOp)}` : '<strong>de betaallink ging niet weg</strong> (geen Mollie-sleutel, of de mail weigerde)'}.</p>
      <form method="post" action="/admin/op-maat/${id}"><input type="hidden" name="do" value="link"><button class="btn btn-2nd btn-sm" data-rol="doorgaan" type="submit">Betaallink opnieuw mailen</button></form>`
    : off.aanpassing ? `<p class="warnline"><strong>De klant vraagt een aanpassing</strong> (${e(off.aanpassingOp)}): ${e(off.aanpassing)}</p>`
    : off.verstuurdOp ? `<p class="meta">Gemaild naar ${e(off.email)} op ${e(off.verstuurdOp)} · wacht op akkoord of een aanpassing.</p>` : '';
  const samen = off ? `<table class="tabel">${off.regels.map((x) => `<tr><td>${e(x.naam)}</td><td>${g(x.bedrag)}</td></tr>`).join('')}<tr><th>Totaal excl. btw</th><th>${g(off.totaal)}</th></tr><tr><td>Nu, de helft</td><td>${g(off.aanbetaling)} + ${e(btwTekst(off))} = <strong>${g(off.aanbetalingBruto)}</strong></td></tr><tr><td>Bij levering</td><td>${g(off.rest)} excl. btw</td></tr></table>` : '';
  const landen = countryOptions('nl');
  const landKeuze = (gekozen) => `<select name="land"><option value="">Nederland (geen land bekend)</option>${['home', 'eu', 'other'].map((k) => `<optgroup label="${{ home: 'Thuis', eu: 'EU', other: 'Buiten de EU' }[k]}">${landen[k].map((c) => `<option value="${c.id}"${c.id === gekozen ? ' selected' : ''}>${e(c.name)}</option>`).join('')}</optgroup>`).join('')}</select>`;
  const kanOfferte = r.stand === 'akkoord' || (r.stand === 'offerte' && !(off && off.akkoordOp));
  const voorbeeldBedrag = off && off.regels.length ? bedragen(off.regels, 0) : bedragen(sch.regels.map((x) => ({ bedrag: x.bedrag })), 0);
  const formulier = kanOfferte ? `<form method="post" action="/admin/op-maat/${id}" class="melding-form">
  <input type="hidden" name="do" value="offerte">
  <label>Regels, één per regel: naam;bedrag, in hele euro's exclusief btw. Begint met ${off ? 'de vorige offerte' : 'de schatting'}. <textarea name="regels" rows="10" required>${e(off ? off.regels.map((x) => `${x.naam};${x.bedrag}`).join('\n') : regels)}</textarea></label>
  <label>Mailadres voor de offerte en de betaallink <input type="email" name="email" required maxlength="200" value="${e((off && off.email) || r.email || '')}"></label>
  <label>Land (beslist de btw) ${landKeuze((off && off.land) || r.country || '')}</label>
  <label>Btw-nummer (alleen nodig bij een ander EU-land; wordt bij VIES gecontroleerd) <input type="text" name="btw" maxlength="20" value="${e((off && off.btwNummer) || r.vat_number || '')}"></label>
  <p class="meta">De klant betaalt nu de helft, de rest bij levering. Met de regels hierboven: nu ${g(voorbeeldBedrag.aanbetaling)} excl. btw, later ${g(voorbeeldBedrag.rest)}. De btw volgt land en btw-nummer zoals bij elke bestelling: Nederland 21%, een ander EU-land met een geldig nummer verlegd, buiten de EU geen btw.</p>
  <button class="btn btn-primary btn-sm" data-rol="doorgaan" type="submit">${off ? 'Nieuwe offerte mailen' : 'Offerte mailen'}</button>
</form>` : '';
  const offerteBlok = `${stand}${samen}${formulier}${!off && !kanOfferte ? '<p class="meta">De offerte komt na het akkoord van de klant op het voorbeeld.</p>' : ''}`;
  const body = `${h.adminNav('opmaat')}
<p><a href="/admin/op-maat">← Op maat</a></p>
<h1>#${id} · ${e(DIENST_NAAM.nl[r.dienst])} · ${e(r.brand || r.email)}</h1>
<p class="lede">${e(STAND_NL[r.stand] || r.stand)}${ronde ? ` · ronde ${ronde} van ${GRATIS_RONDES_TOTAAL} gratis` : ''}</p>
${klaar ? `<p class="okline">${e({ beeld: 'Het beeld staat bij de ronde.', klaar: 'De ronde staat klaar voor de klant.', offerte: 'De offerte is gemaild. De klant kan in Studio akkoord geven of een aanpassing vragen.', offerteNietGemaild: 'De offerte staat in Studio, maar de mail ging niet weg. Kijk bij de mail-instellingen, of stuur de klant zelf een bericht.', link: 'De betaallink is opnieuw gemaild.', stand: 'De stand is aangepast.' }[klaar] || 'Gedaan.')}</p>` : ''}
${fout ? `<p class="warnline">${e(fout)}</p>` : ''}
<h2>Schatting</h2>
<table class="tabel">${sch.regels.map((g) => `<tr><td>${e(regelNaam(g.id))}</td><td>${e(g.uitleg || '')}</td><td>€${g.bedrag}</td></tr>`).join('')}<tr><th>Totaal</th><td></td><th>€${sch.totaal}</th></tr></table>
<h2>Wat de klant invulde</h2>
<table class="tabel">${waarden({ merk }).map(rij).join('')}${waarden(inhoud).map(rij).join('')}</table>
${refs.length ? `<h2>Referenties</h2><div class="maat-beelden">${refs.map((x) => `<figure><img src="/admin/op-maat/beeld/referentie/${x.id}" alt="" loading="lazy" width="200"><figcaption>${e((x.wat || []).join(', '))}${x.notitie ? ` · ${e(x.notitie)}` : ''}</figcaption></figure>`).join('')}</div>` : ''}
<h2>Voorbeelden</h2>
<p class="meta">Altijd in neutrale kleuren en zonder het product van de klant: het gaat om de omgeving en het gevoel. Ronde 1 en ${GRATIS_STIJLRONDES} rondes daarna zijn gratis.</p>
${rondes || '<p class="meta">Nog geen voorbeelden.</p>'}
${kanBeeld ? `<form method="post" action="/admin/op-maat/${id}" enctype="multipart/form-data" class="melding-form">
  <input type="hidden" name="do" value="voorbeeld">
  <label>Een beeld voor ronde ${opbouw} <input type="file" name="bestand" accept="${VOORBEELD_TYPES.join(',')}" required></label>
  <button class="btn btn-2nd btn-sm" data-rol="uploaden" type="submit">Beeld toevoegen</button>
</form>` : ''}
${kanKlaar ? `<form method="post" action="/admin/op-maat/${id}"><input type="hidden" name="do" value="klaar"><button class="btn btn-primary btn-sm" data-rol="doorgaan" type="submit">Ronde ${ronde} naar de klant</button></form>` : ''}
<h2>Reacties van de klant</h2>
${reacties ? `<ul class="meta">${reacties}</ul>` : '<p class="meta">Nog geen reacties.</p>'}
<h2>Offerte</h2>
${offerteBlok}
<h2>Stand</h2>
${(STUDIO_MAG[r.stand] || []).length ? `<form method="post" action="/admin/op-maat/${id}"><input type="hidden" name="do" value="stand">
  <label>Zet op <select name="naar">${STUDIO_MAG[r.stand].map((s) => `<option value="${s}">${e(STAND_NL[s])}</option>`).join('')}</select></label>
  <button class="btn btn-2nd btn-sm" data-rol="wijzigen" type="submit">Aanpassen</button>
</form>` : '<p class="meta">Deze stand verandert alleen nog via de klant of de bestelling.</p>'}`;
  return h.html(h.page({ title: `Op maat #${id}`, body }));
}

export async function serveOpMaatBeeld({ env }, soort, id) {
  const r = soort === 'voorbeeld'
    ? await env.DB.prepare('SELECT r2_key FROM maat_voorbeelden WHERE id = ?').bind(id).first()
    : await env.DB.prepare('SELECT r2_key FROM maat_referenties WHERE id = ?').bind(id).first();
  if (!r || !env.UPLOADS) return new Response('Niet gevonden', { status: 404 });
  const o = await env.UPLOADS.get(r.r2_key);
  if (!o) return new Response('Niet gevonden', { status: 404 });
  return new Response(o.body, { headers: { 'content-type': o.httpMetadata?.contentType || 'application/octet-stream', 'cache-control': 'private, no-store', 'x-content-type-options': 'nosniff' } });
}

export async function handleOpMaatPost({ request, env }, admin, id, h) {
  const a = await env.DB.prepare('SELECT id, customer_id, stand FROM maat_aanvragen WHERE id = ?').bind(id).first();
  if (!a) return h.seeOther('/admin/op-maat');
  const form = await request.formData().catch(() => null);
  const doen = String(form?.get('do') || '');
  const terug = (q) => h.seeOther(`/admin/op-maat/${id}?${q}`);
  const fout = (t) => terug(`fout=${encodeURIComponent(t)}`);
  if (doen === 'voorbeeld') {
    const f = form.get('bestand');
    if (!f || typeof f === 'string') return fout('Kies een beeld.');
    if (!VOORBEELD_TYPES.includes(f.type)) return fout('Alleen jpg, png of webp.');
    if (f.size > VOORBEELD_BYTES) return fout('Het beeld is groter dan 15 MB.');
    const ronde = await rondeVoorNieuwBeeld(env, id, a.stand);
    const key = voorbeeldSleutel(a.customer_id, id, ronde, f.name);
    await env.UPLOADS.put(key, f.stream(), { httpMetadata: { contentType: f.type }, customMetadata: { soort: 'maat-voorbeeld', aanvraag: String(id) } });
    const r = await voegVoorbeeldToe(env, id, { r2Key: key, bestandsnaam: f.name });
    if (!r.ok) { try { await env.UPLOADS.delete(key); } catch { /* niets */ } return fout(`Niet toegevoegd (${r.reden}).`); }
    await h.logAdmin(env, admin, 'opmaat.voorbeeld', { customerId: a.customer_id, detail: `#${id} ronde ${r.ronde}` });
    return terug('klaar=beeld');
  }
  if (doen === 'klaar') {
    const r = await zetVoorbeeldKlaar(env, id);
    if (!r.ok) return fout(r.reden === 'geen-beelden' ? 'Zet eerst beelden bij een nieuwe ronde.' : `Kan niet (${r.reden}).`);
    await h.logAdmin(env, admin, 'opmaat.ronde', { customerId: a.customer_id, detail: `#${id}` });
    return terug('klaar=klaar');
  }
  if (doen === 'offerte') {
    const r = await stuurOfferte(env, id, { regels: leesRegels(form.get('regels')), email: form.get('email'), land: form.get('land'), btwNummer: form.get('btw') }, { origin: new URL(request.url).origin });
    if (!r.ok) return fout({ regels: 'Geen geldige regels: naam;bedrag, één per regel, en samen meer dan nul.', email: 'Dat mailadres klopt niet.', al: 'De klant gaf al akkoord; deze offerte ligt vast.', stand: 'Een offerte kan na het akkoord op het voorbeeld.' }[r.reden] || `Kan niet (${r.reden}).`);
    await h.logAdmin(env, admin, 'opmaat.offerte', { customerId: a.customer_id, detail: `#${id} €${r.totaal} netto, aanbetaling €${r.aanbetaling}, ${r.btw} naar ${r.email}${r.gemaild ? '' : ' (mail niet verstuurd)'}` });
    return terug(r.gemaild ? 'klaar=offerte' : 'klaar=offerteNietGemaild');
  }
  if (doen === 'link') {
    const r = await betaallinkOpnieuw(env, id, { origin: new URL(request.url).origin });
    if (!r.ok) return fout(r.reden === 'link' ? 'De betaallink ging weer niet weg. Staat de Mollie-sleutel erin?' : 'Er is geen open bestelling om een betaallink voor te sturen.');
    await h.logAdmin(env, admin, 'opmaat.betaallink', { customerId: a.customer_id, detail: `#${id}` });
    return terug('klaar=link');
  }
  if (doen === 'stand') {
    const r = await zetStand(env, id, String(form.get('naar') || ''));
    if (!r.ok) return fout(`Die stand kan vanaf hier niet (${STAND_NL[a.stand]}).`);
    await h.logAdmin(env, admin, 'opmaat.stand', { customerId: a.customer_id, detail: `#${id} ${form.get('naar')}` });
    return terug('klaar=stand');
  }
  return fout('Onbekende actie.');
}


