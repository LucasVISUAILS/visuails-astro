/* VISUAILS — de intake op maat in Studio (/account/op-maat). 15 november 2026, lijst 112.
 *
 * Het enige script in Studio (zie src/lib/studioKoppen.js). Het leest de velden met data-pad, slaat ze op via
 * /account/op-maat/api en zet de schatting die de server terugstuurt in het paneel. Het rekent zelf niets uit: de
 * bedragen staan alleen in src/data/opMaatPrijs.js. Geen eval, geen innerHTML met tekst van de klant: alles wat
 * de klant typt gaat als textContent of value terug op het scherm. */
(function () {
  'use strict';
  var om = document.getElementById('om');
  if (!om) return;
  var form = document.getElementById('om-form');
  var API = '/account/op-maat/api';
  var nl = om.dataset.taal !== 'en';
  var T = function (a, b) { return nl ? a : b; };
  var id = Number(om.dataset.id) || 0;
  var versie = Number(om.dataset.versie) || 0;
  var dienst = om.dataset.dienst;
  var bewerk = om.dataset.bewerk === '1';
  var stand = document.getElementById('om-stand');
  var eur = function (n) { return '€' + Math.round(n).toLocaleString(nl ? 'nl-NL' : 'en-GB'); };

  function post(body) {
    return fetch(API, { method: 'POST', credentials: 'same-origin', headers: { 'content-type': 'application/json', accept: 'application/json' }, body: JSON.stringify(body) })
      .then(function (r) { return r.json().then(function (j) { j.status = r.status; return j; }); });
  }
  function zet(o, pad, w) {
    var d = pad.split('.'); var x = o;
    for (var i = 0; i < d.length - 1; i++) { if (typeof x[d[i]] !== 'object' || x[d[i]] === null) x[d[i]] = {}; x = x[d[i]]; }
    x[d[d.length - 1]] = w;
  }
  /* Een veld in een uitgeklapt deel telt alleen als zijn keuze aan staat. */
  function telt(el) {
    var ed = el.closest('.om-edit');
    if (!ed) return true;
    var t = ed.querySelector(':scope > .om-edit-kop input[data-toggle]');
    if (!t || t === el) return true;
    return t.checked || !el.closest('.om-uitklap');
  }
  function waarde(el) {
    if (el.type === 'checkbox') return el.checked;
    if (el.type === 'number' || el.type === 'range') return el.value === '' ? null : Number(el.value);
    return el.value;
  }
  function lees() {
    var inh = {};
    form.querySelectorAll('[data-pad]').forEach(function (el) {
      if (!telt(el) || (el.disabled && !el.closest('fieldset[disabled]'))) return;
      var p = el.dataset.pad;
      if (el.type === 'radio') { if (el.checked) zet(inh, p, el.value); return; }
      if (el.hasAttribute('data-veel')) {
        var lijst = p.split('.').reduce(function (o, k) { return o && o[k]; }, inh);
        if (!Array.isArray(lijst)) { lijst = []; zet(inh, p, lijst); }
        if (el.checked) lijst.push(el.value);
        return;
      }
      zet(inh, p, waarde(el));
    });
    form.querySelectorAll('[data-rij]').forEach(function (rijen) {
      var uit = [];
      rijen.querySelectorAll('[data-rij-item]').forEach(function (r) {
        var o = {};
        r.querySelectorAll('[data-veld]').forEach(function (el) { zet(o, el.dataset.veld, waarde(el)); });
        uit.push(o);
      });
      zet(inh, rijen.dataset.rij, uit);
    });
    inh.gekozen = [].map.call(form.querySelectorAll('input[type=checkbox][data-toggle]:checked'), function (c) { return c.dataset.toggle; });
    return inh;
  }
  function leesMerk() {
    var m = {};
    form.querySelectorAll('[data-merk]').forEach(function (el) {
      m[el.dataset.merk] = el.dataset.lijst ? el.value.split(el.dataset.lijst).map(function (x) { return x.trim(); }).filter(Boolean) : el.value;
    });
    return m;
  }

  /* ── het paneel ─────────────────────────────────────────────────────────────────────────────────────────── */
  var NAAM_MIST = {
    'merk.naam': T('De naam van je merk', 'Your brand name'), 'praktisch.contact': T('Hoe we je bereiken', 'How we reach you'),
    soorten: T('Minstens één product', 'At least one product'), 'moment.zin': T('Je moment, in één zin', 'Your moment, in one sentence'),
    idee: T('Wie het idee bedenkt', 'Who comes up with the idea'), eigenIdee: T('Je idee', 'Your idea'), 'vragen.doelgroep': T('Voor wie het is', 'Who it is for'),
    kanalen: T('Waar de hook komt', 'Where the hook will go'), hoofdproduct: T('Je product', 'Your product'), materiaal: T('Het materiaal', 'The material'), shots: T('Minstens één shot', 'At least one shot'),
  };
  function toon(r) {
    if (!r || !r.schatting) return;
    var box = document.getElementById('om-regels');
    box.textContent = '';
    r.schatting.regels.forEach(function (g) {
      var p = document.createElement('p'); var a = document.createElement('span'); var b = document.createElement('span');
      a.textContent = g.naam; b.textContent = eur(g.bedrag); p.appendChild(a); p.appendChild(b); box.appendChild(p);
    });
    document.getElementById('om-totaal').textContent = eur(r.schatting.totaal);
    document.getElementById('om-aanbet').textContent = T('Na de offerte de helft vooraf: ongeveer ', 'After the quote, half up front: about ') + eur(r.schatting.aanbetaling) + '.';
    var mist = document.getElementById('om-mist');
    mist.textContent = '';
    (r.ontbreekt || []).forEach(function (k) {
      var li = document.createElement('li');
      var naam = NAAM_MIST[k];
      if (!naam && k.indexOf('toelichting.') === 0) {
        var regel = (r.schatting && r.schatting.regels || []).filter(function (g) { return g.id === k.slice(12); })[0];
        naam = T('Wat je bedoelt bij: ', 'What you mean by: ') + (regel ? regel.naam : k.slice(12)).toLowerCase();
      }
      li.textContent = naam || k;
      mist.appendChild(li);
    });
    if ((r.ontbreekt || []).length) { var kopje = document.createElement('li'); kopje.textContent = T('Nog nodig om te versturen:', 'Still needed to send:'); mist.insertBefore(kopje, mist.firstChild); }
    mist.hidden = !bewerk || !(r.ontbreekt || []).length;   /* na het versturen doet de lijst er niet meer toe */
    toonRefs(r.referenties || []);
  }
  function toonRefs(lijst) {
    var box = document.getElementById('om-refs');
    if (!box) return;
    box.textContent = '';
    lijst.forEach(function (x) {
      var f = document.createElement('figure'); f.className = 'om-ref';
      var c = document.createElement('figcaption'); c.textContent = (x.bestandsnaam || '') + (x.wat && x.wat.length ? ' · ' + x.wat.join(', ') : '');
      f.appendChild(c); box.appendChild(f);
    });
  }

  /* ── opslaan ────────────────────────────────────────────────────────────────────────────────────────────── */
  var timer = 0, bezig = false, nog = false, merkTimer = 0;
  function melding(t) { if (stand) stand.textContent = t; }
  function bewaar() {
    if (!id || !bewerk) return;
    if (bezig) { nog = true; return; }
    bezig = true; melding(T('Opslaan…', 'Saving…'));
    post({ doe: 'opslaan', id: id, versie: versie, inhoud: lees() }).then(function (r) {
      if (r.ok) { versie = r.aanvraag.versie; toon(r); melding(T('Opgeslagen', 'Saved')); }
      else if (r.reden === 'versie' && r.aanvraag) { versie = r.aanvraag.versie; melding(T('In een ander tabblad gewijzigd · opnieuw geladen', 'Changed in another tab · reloaded')); location.reload(); }
      else melding(T('Niet opgeslagen', 'Not saved'));
    }, function () { melding(T('Geen verbinding · niet opgeslagen', 'No connection · not saved')); })
      .then(function () { bezig = false; if (nog) { nog = false; bewaar(); } });
  }
  function straks() { clearTimeout(timer); timer = setTimeout(bewaar, 500); }
  function bewaarMerk() { clearTimeout(merkTimer); merkTimer = setTimeout(function () { post({ doe: 'merk', merk: leesMerk() }).then(function () { straks(); }); }, 600); }

  form.addEventListener('input', function (e) {
    var el = e.target;
    if (el.matches('[data-pad="seconden"]')) { var o = form.querySelector('[data-uit="seconden"]'); if (o) o.textContent = el.value; }
    if (el.matches('[data-merk]')) bewaarMerk(); else straks();
  });
  form.addEventListener('change', function (e) { if (e.target.matches('[data-merk]')) bewaarMerk(); else straks(); });

  /* ── de schaal bij catalog: een stap zet de keuzes die erbij horen ───────────────────────────────────────── */
  form.querySelectorAll('.om-stap').forEach(function (knop) {
    knop.addEventListener('click', function () {
      form.querySelectorAll('.om-stap').forEach(function (k) { k.classList.toggle('is-aan', k === knop); k.setAttribute('aria-pressed', String(k === knop)); });
      var aan = knop.dataset.zet ? knop.dataset.zet.split(',') : [];
      form.querySelectorAll('input[type=checkbox][data-toggle]').forEach(function (c) { c.checked = aan.indexOf(c.dataset.toggle) >= 0; });
      if (aan.indexOf('c-camera') >= 0) { var laag = form.querySelector('input[name=camera][value=laag]'); if (laag && !form.querySelector('input[name=camera]:checked')) laag.checked = true; }
      var omg = form.querySelector('input[name=omgeving][value="' + (aan.indexOf('c-wereld') >= 0 ? 'echte-plek' : 'naadloze-studio') + '"]');
      if (omg) omg.checked = true;
      bewaar();
    });
  });

  /* ── rijen: een product of een shot erbij of eraf ────────────────────────────────────────────────────────── */
  form.addEventListener('click', function (e) {
    var erbij = e.target.closest('[data-rij-erbij]');
    if (erbij) {
      var rijen = form.querySelector('[data-rij="' + erbij.dataset.rijErbij + '"]');
      var items = rijen.querySelectorAll('[data-rij-item]');
      if (items.length >= 12) return;
      var kopie = items[items.length - 1].cloneNode(true);
      kopie.querySelectorAll('input[type=text]').forEach(function (i) { i.value = ''; });
      kopie.querySelectorAll('input[type=number]').forEach(function (i) { i.value = /^voorkant\./.test(i.dataset.veld || '') ? '' : '1'; });
      kopie.querySelectorAll('input[type=checkbox][data-veld]').forEach(function (i) { i.checked = false; });
      rijen.appendChild(kopie);
      var eerste = kopie.querySelector('input, select'); if (eerste) eerste.focus();
      straks();
    }
    var weg = e.target.closest('[data-rij-weg]');
    if (weg) {
      var r = weg.closest('[data-rij-item]');
      if (r.parentNode.querySelectorAll('[data-rij-item]').length > 1) { r.remove(); straks(); }
    }
  });

  /* ── een referentie uploaden ───────────────────────────────────────────────────────────────────────────── */
  var bestand = document.getElementById('om-bestand');
  if (bestand) bestand.addEventListener('change', function () {
    if (!bestand.files || !bestand.files[0] || !id) return;
    var fd = new FormData();
    fd.append('id', String(id)); fd.append('bestand', bestand.files[0]);
    form.querySelectorAll('input[name="ref-wat"]:checked').forEach(function (c) { fd.append('wat', c.value); });
    melding(T('Uploaden…', 'Uploading…'));
    fetch(API, { method: 'POST', credentials: 'same-origin', body: fd }).then(function (r) { return r.json(); }).then(function (r) {
      melding(r.ok ? T('Toegevoegd', 'Added') : T('Niet toegevoegd', 'Not added'));
      bestand.value = '';
      return laad();
    }, function () { melding(T('Geen verbinding', 'No connection')); });
  });

  /* ── versturen ─────────────────────────────────────────────────────────────────────────────────────────── */
  var verstuur = document.getElementById('om-verstuur');
  if (verstuur) verstuur.addEventListener('click', function () {
    clearTimeout(timer); clearTimeout(merkTimer);
    post({ doe: 'merk', merk: leesMerk() }).then(function () {
      return post({ doe: 'opslaan', id: id, versie: versie, inhoud: lees() });
    }).then(function (r) {
      if (r.ok) versie = r.aanvraag.versie;
      return post({ doe: 'verstuur', id: id });
    }).then(function (r) {
      if (r.ok) { location.reload(); return; }
      if (r.ontbreekt) toon({ schatting: null, ontbreekt: r.ontbreekt });
      laad().then(function () { var m = document.getElementById('om-mist'); if (m && !m.hidden) m.scrollIntoView({ block: 'center', behavior: 'smooth' }); });
    });
  });

  /* ── de voorbeeldronde: per beeld goed of aanpassen, en wat goed is, wat anders moet, wat moet blijven ───── */
  function reageer(goed) {
    var beelden = {};
    document.querySelectorAll('input[data-beeld]:checked').forEach(function (r) { beelden[r.dataset.beeld] = r.value; });
    var veld = function (x) { var el = document.getElementById(x); return el ? el.value : ''; };
    var uitS = document.getElementById('om-ronde-stand');
    if (!goed && !veld('om-anders').trim()) { uitS.textContent = T('Schrijf bij "Wat moet anders?" wat we moeten veranderen.', 'Under "What should change?", tell us what to change.'); document.getElementById('om-anders').focus(); return; }
    uitS.textContent = T('Versturen…', 'Sending…');
    post({ doe: 'reactie', id: id, beelden: beelden, wel: veld('om-wel'), anders: veld('om-anders'), blijven: veld('om-blijven'), goed: goed }).then(function (r) {
      if (r.ok) location.reload();
      else uitS.textContent = T('Niet verstuurd. Probeer het nog eens.', 'Not sent. Please try again.');
    }, function () { uitS.textContent = T('Geen verbinding.', 'No connection.'); });
  }
  var knopReactie = document.getElementById('om-reactie');
  if (knopReactie) knopReactie.addEventListener('click', function () { reageer(false); });
  var knopGoed = document.getElementById('om-goed');
  if (knopGoed) knopGoed.addEventListener('click', function () { reageer(true); });
  /* De offerte: akkoord (met het zakelijk-vinkje) maakt de bestelling en stuurt de betaallink; of een aanpassing. */
  var knopOfferte = document.getElementById('om-offerte-akkoord');
  var oStand = document.getElementById('om-offerte-stand');
  if (knopOfferte) knopOfferte.addEventListener('click', function () {
    var vink = document.getElementById('om-zakelijk');
    if (!vink.checked) { oStand.textContent = vink.getAttribute('data-melding'); vink.focus(); return; }
    knopOfferte.disabled = true;
    oStand.textContent = T('Versturen…', 'Sending…');
    post({ doe: 'offerte-akkoord', id: id, zakelijk: true }).then(function (r) {
      if (r.ok || r.reden === 'al') { location.reload(); return; }
      knopOfferte.disabled = false;
      oStand.textContent = T('Niet gelukt. Probeer het nog eens.', 'That did not work. Please try again.');
    }, function () { knopOfferte.disabled = false; oStand.textContent = T('Geen verbinding.', 'No connection.'); });
  });
  var knopAanpassen = document.getElementById('om-offerte-aanpassen');
  if (knopAanpassen) knopAanpassen.addEventListener('click', function () {
    var veld = document.getElementById('om-aanpassing');
    if (veld.value.trim().length < 3) { oStand.textContent = veld.getAttribute('data-melding'); veld.focus(); return; }
    knopAanpassen.disabled = true;
    oStand.textContent = T('Versturen…', 'Sending…');
    post({ doe: 'offerte-aanpassen', id: id, tekst: veld.value }).then(function (r) {
      if (r.ok) { location.reload(); return; }
      knopAanpassen.disabled = false;
      oStand.textContent = T('Niet gelukt. Probeer het nog eens.', 'That did not work. Please try again.');
    }, function () { knopAanpassen.disabled = false; oStand.textContent = T('Geen verbinding.', 'No connection.'); });
  });

  /* op een smal scherm: tik op het totaal en de regels klappen open */
  var schat = document.querySelector('.om-schat');
  var tot = schat && schat.querySelector('.om-tot');
  if (tot) { tot.setAttribute('role', 'button'); tot.tabIndex = 0; var klap = function () { schat.classList.toggle('is-open'); }; tot.addEventListener('click', klap); tot.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); klap(); } }); }

  /* ── beginnen: een nieuwe aanvraag, of verder in zijn open concept ───────────────────────────────────────── */
  function laad() {
    return fetch(API + '?id=' + id, { credentials: 'same-origin', headers: { accept: 'application/json' } }).then(function (r) { return r.json(); }).then(function (r) {
      if (r.ok) { versie = r.aanvraag.versie; toon(r); }
    });
  }
  /* De merknaam staat al ingevuld (uit zijn gegevens); bewaar hem meteen, anders mist hij bij het versturen. */
  var naamVeld = form.querySelector('[data-merk="naam"]');
  if (bewerk && naamVeld && naamVeld.value && naamVeld.defaultValue === naamVeld.value) post({ doe: 'merk', merk: leesMerk() });
  if (id) laad();
  else if (dienst && bewerk) {
    post({ doe: 'begin', dienst: dienst, taal: nl ? 'nl' : 'en' }).then(function (r) {
      if (!r.ok) { melding(T('Kon niet beginnen', 'Could not start')); return; }
      /* Een open concept van deze dienst: laad de pagina met wat hij al had. Nieuw: verder zonder herladen. */
      if (r.aanvraag.versie > 1 || (r.aanvraag.inhoud && Object.keys(r.aanvraag.inhoud).length)) { location.replace('/account/op-maat?id=' + r.aanvraag.id); return; }
      id = r.aanvraag.id; versie = r.aanvraag.versie;
      history.replaceState(null, '', '/account/op-maat?id=' + id);
      bewaar();
    });
  }
  /* ── de stand in 3D (lijst 113): een eigen module, alleen bij catalog ───────────────────────────────────── */
  if (document.getElementById('om-standen')) import('/js/op-maat-3d.js').catch(function () {
    var g = document.querySelector('#om-standen [data-geen-3d]'); if (g) g.hidden = false;
  });
})();
