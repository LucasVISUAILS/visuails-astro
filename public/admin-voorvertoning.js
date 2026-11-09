/*
 * VISUAILS admin — een beoordeelbeeld maken bij het uploaden van een levering.
 * 2 oktober 2026 (ronde 9, F18). Lucas: "Bij /admin bij uploaden een kleiner
 * beoordeelbeeld."
 *
 * HET PROBLEEM. scripts/deliver.mjs maakt bij elke levering een beoordeelbeeld
 * (files.preview_key) naast het volle bestand. Een levering via het werkbord in
 * /admin deed dat niet, en dan laden Studio en het portaal voor een tegel van
 * 128 px het volle origineel: 3–4K, met echte PNG's tientallen MB per scherm.
 *
 * WAT DIT DOET. Vlak voor een uploadformulier naar /admin/orders/<id>/deliver
 * verstuurd wordt, maakt de browser van elk beeld een webp van maximaal 1600 px
 * langs de lange kant, en stuurt die mee in het veld `previews`, met dezelfde
 * naam als het origineel. De server koppelt ze op die naam (zie
 * handleDeliveryUpload in src/lib/admin.js). Het origineel gaat onaangeroerd mee.
 *
 * WAAROM IN DE BROWSER. Een Worker kan geen beelden verkleinen zonder een extra
 * betaalde dienst, en de computer van de studio heeft het beeld toch al in
 * handen. Lukt het hier niet (oude browser, kapot bestand), dan gaat de upload
 * gewoon door zonder beoordeelbeeld — precies zoals het was. Dit is een
 * verbetering bovenop, geen voorwaarde.
 *
 * GEEN fetch: de admin-CSP staat geen verbindingen toe (connect-src 'none' via
 * default-src). Het formulier wordt dus gewoon verstuurd, met een extra
 * bestandsveld dat hier gevuld wordt.
 */

/*
 * TE GROOT OM TE TAGGEN — eerst zeggen, dan pas versturen.
 * 9 november 2026 (ronde 91, E18).
 *
 * Boven 32 MB (MAX_SCAN_BYTES in src/lib/provenance.js) zet de server geen AI-tag
 * in een jpg, png of mp4, en weigert hij de upload (handleDeliveryUpload, 413). Een
 * 4K-png uit Magnific komt daar zo boven, en dan wacht je minuten op een upload die
 * wordt geweigerd. Dit zegt het meteen bij het kiezen, en houdt het versturen tegen
 * zolang zo'n bestand erin staat. Staat vóór het beoordeelbeeld hieronder, zodat
 * daar geen tijd in gaat. Zonder dit script zegt de server het.
 */
(function () {
  'use strict';
  var GRENS = 32 * 1024 * 1024; // = MAX_SCAN_BYTES
  var TAGBAAR = /\.(jpe?g|png|mp4)$/i;
  var OVERSLAAN = /(^|\/)(_aangeleverd|_ruw)\//;
  var LEVERING = /\/admin\/orders\/\d+\/deliver$/;

  function teGroot(form) {
    var uit = [];
    Array.prototype.forEach.call(form.querySelectorAll('input[type="file"][name="files"]'), function (i) {
      Array.prototype.forEach.call(i.files || [], function (f) {
        if (OVERSLAAN.test(f.webkitRelativePath || '')) return;
        if (TAGBAAR.test(f.name) && f.size > GRENS) uit.push(f);
      });
    });
    return uit;
  }

  function mb(n) { return (n / (1024 * 1024)).toFixed(1).replace('.', ',') + ' MB'; }

  /* Eén melding per formulier, met textContent (een bestandsnaam is geen HTML). */
  function toon(form, lijst) {
    var p = form.querySelector('[data-te-groot]');
    if (!lijst.length) { if (p) p.remove(); return; }
    if (!p) {
      p = document.createElement('p');
      p.className = 'warnline';
      p.setAttribute('role', 'alert');
      p.setAttribute('data-te-groot', '');
      var knop = form.querySelector('button[type="submit"], button:not([type])');
      if (knop && knop.parentNode) knop.parentNode.insertBefore(p, knop); else form.appendChild(p);
    }
    p.textContent = (lijst.length === 1 ? 'Te groot om de AI-tag te zetten' : lijst.length + ' bestanden te groot om de AI-tag te zetten')
      + ' (de grens is 32 MB): '
      + lijst.map(function (f) { return f.name + ' (' + mb(f.size) + ')'; }).join(', ')
      + '. Exporteer als jpg of verklein, of lever met scripts/deliver.mjs. Zo wordt er niets verstuurd.';
  }

  document.addEventListener('change', function (e) {
    var i = e.target;
    if (!i || i.type !== 'file' || i.name !== 'files' || !i.form) return;
    if (!LEVERING.test(i.form.getAttribute('action') || '')) return;
    toon(i.form, teGroot(i.form));
  }, true);

  document.addEventListener('submit', function (e) {
    var form = e.target;
    if (!form || form.tagName !== 'FORM') return;
    if (!LEVERING.test(form.getAttribute('action') || '')) return;
    var lijst = teGroot(form);
    toon(form, lijst);
    if (!lijst.length) return;
    e.preventDefault();
    e.stopImmediatePropagation();
  }, true);
})();

(function () {
  'use strict';
  var MAX = 1600;
  var KWALITEIT = 0.82;
  var BEELD = /\.(jpe?g|png|webp|avif)$/i;

  if (typeof DataTransfer === 'undefined' || typeof createImageBitmap === 'undefined') return;

  function verklein(file) {
    return createImageBitmap(file).then(function (bmp) {
      var schaal = Math.min(1, MAX / Math.max(bmp.width, bmp.height));
      var w = Math.max(1, Math.round(bmp.width * schaal));
      var h = Math.max(1, Math.round(bmp.height * schaal));
      var c = document.createElement('canvas');
      c.width = w; c.height = h;
      var ctx = c.getContext('2d');
      ctx.drawImage(bmp, 0, 0, w, h);
      if (bmp.close) bmp.close();
      return new Promise(function (klaar) {
        c.toBlob(function (blob) { klaar(blob); }, 'image/webp', KWALITEIT);
      });
    }).then(function (blob) {
      if (!blob || !blob.size) return null;
      /* Dezelfde naam als het origineel (inclusief een mappad bij een
         mapupload): daarop koppelt de server. */
      var naam = file.webkitRelativePath || file.name;
      return new File([blob], naam, { type: 'image/webp' });
    }).catch(function () { return null; });
  }

  document.addEventListener('submit', function (e) {
    var form = e.target;
    if (!form || form.tagName !== 'FORM') return;
    if (!/\/admin\/orders\/\d+\/deliver$/.test(form.getAttribute('action') || '')) return;
    if (form.dataset.voorvertoningKlaar === '1') return; // tweede keer: echt versturen

    var invoer = form.querySelectorAll('input[type="file"][name="files"]');
    /* 8 oktober 2026 (4.02): de werkmap bevat nu per product de foto's van de klant
       in _aangeleverd/, en het Photoshop-script zet het ruwe beeld in _ruw/. Bij
       "de hele map" zou de browser die allemaal meesturen, terwijl de server ze
       toch overslaat — honderden MB voor niets. Hier gaan ze er vóór het versturen
       uit. Zonder dit script slaat de server ze nog steeds over. */
    var WERKMAP_ALLEEN = /(^|\/)(_aangeleverd|_ruw)\//;
    invoer.forEach(function (i) {
      var alle = Array.prototype.slice.call(i.files || []);
      var houden = alle.filter(function (f) { return !WERKMAP_ALLEEN.test(f.webkitRelativePath || ''); });
      if (houden.length === alle.length) return;
      var dt = new DataTransfer();
      houden.forEach(function (f) { dt.items.add(f); });
      try { i.files = dt.files; } catch (_) { /* dan gaat alles mee; de server slaat ze over */ }
    });
    var bestanden = [];
    invoer.forEach(function (i) { Array.prototype.push.apply(bestanden, Array.prototype.slice.call(i.files || [])); });
    bestanden = bestanden.filter(function (f) { return BEELD.test(f.name); });
    if (!bestanden.length) return;

    e.preventDefault();
    var knop = form.querySelector('button[type="submit"], button:not([type])');
    var oud = knop ? knop.textContent : '';
    if (knop) { knop.disabled = true; knop.textContent = 'Beoordeelbeelden maken… (' + bestanden.length + ')'; }

    /* Eén voor één en niet allemaal tegelijk: 72 beelden van 4K tegelijk
       openen vraagt gigabytes geheugen. */
    var uit = new DataTransfer();
    var keten = Promise.resolve();
    bestanden.forEach(function (f, n) {
      keten = keten.then(function () {
        if (knop) knop.textContent = 'Beoordeelbeelden maken… ' + (n + 1) + '/' + bestanden.length;
        return verklein(f).then(function (p) { if (p) uit.items.add(p); });
      });
    });
    keten.then(function () {
      var veld = form.querySelector('input[name="previews"]');
      if (!veld) {
        veld = document.createElement('input');
        veld.type = 'file'; veld.name = 'previews'; veld.multiple = true; veld.hidden = true;
        form.appendChild(veld);
      }
      try { veld.files = uit.files; } catch (_) { /* dan zonder */ }
      form.dataset.voorvertoningKlaar = '1';
      if (knop) { knop.disabled = false; knop.textContent = oud; }
      if (form.requestSubmit) form.requestSubmit(knop || undefined); else form.submit();
    });
  }, true);
})();

/*
 * HET SLEEPVAK VAN ÉÉN PRODUCT — eerst zien, dan bevestigen.
 * 9 november 2026 (ronde 91, lijst 85 w9 = goed).
 *
 * Elk product op het bord heeft één vak (form[data-sleepvak]) waar je de beelden in sleept of kiest. Zodra er
 * bestanden in staan, toont dit welk bestand in welk vakje komt, met een keuzelijst per bestand (name="vak", in
 * dezelfde volgorde als de bestanden), en wordt de knop "Bevestigen en uploaden". De regels zijn die van de server
 * (sleepvakIndeling in src/lib/admin.js): wat je kiest, dan de naam (de woorden komen van de server mee in
 * data-sleepvak), dan op volgorde in de lege vakjes; twee bestanden nooit in hetzelfde vakje.
 *
 * Zonder dit script werkt het vak ook: de server deelt dan zelf in met dezelfde regels. Geen fetch, geen inline
 * HTML met bestandsnamen (textContent), zodat een rare bestandsnaam niets kan doen.
 */
(function () {
  'use strict';

  function indeling(namen, plan, gekozen) {
    var vakken = plan.vakken.map(function (v) { return v.id; });
    var bezet = plan.vakken.filter(function (v) { return v.vol; }).map(function (v) { return v.id; });
    var woorden = (plan.woorden || []).map(function (w) {
      try { return [w[0], new RegExp(w[1], w[2])]; } catch (_) { return null; }
    }).filter(Boolean);
    var genomen = {};
    var uit = namen.map(function (n, i) {
      var k = gekozen && gekozen[i];
      if (k && vakken.indexOf(k) > -1) { genomen[k] = 1; return k; }
      return undefined;
    });
    namen.forEach(function (naam, i) {
      if (uit[i] !== undefined) return;
      var basis = String(naam || '').split(/[\\/]/).pop().replace(/\.[a-z0-9]+$/i, '').replace(/[_\-.]+/g, ' ');
      var gok = null;
      for (var j = 0; j < woorden.length; j++) { if (woorden[j][1].test(basis)) { gok = woorden[j][0]; break; } }
      if (gok && !genomen[gok]) { genomen[gok] = 1; uit[i] = gok; }
    });
    return uit.map(function (v) {
      if (v !== undefined) return v;
      var volgende = vakken.filter(function (k) { return bezet.indexOf(k) < 0 && !genomen[k]; })[0] || null;
      if (volgende) genomen[volgende] = 1;
      return volgende;
    });
  }

  function opzetten(form) {
    var plan;
    try { plan = JSON.parse(form.getAttribute('data-sleepvak') || '{}'); } catch (_) { return; }
    if (!plan || !plan.vakken || !plan.vakken.length) return;
    var invoer = form.querySelector('input[type="file"][name="files"]');
    var vak = form.querySelector('.sleepvak-vak');
    var lijst = form.querySelector('.sleepvak-plan');
    var knop = form.querySelector('button[type="submit"]');
    if (!invoer || !vak || !lijst || !knop) return;
    var knopTekst = knop.textContent;

    function toon() {
      var bestanden = Array.prototype.slice.call(invoer.files || []);
      while (lijst.firstChild) lijst.removeChild(lijst.firstChild);
      if (!bestanden.length) { lijst.hidden = true; knop.textContent = knopTekst; return; }
      var namen = bestanden.map(function (f) { return f.name; });
      var keuze = indeling(namen, plan, []);
      var kop = document.createElement('p');
      kop.className = 'sleepvak-kop';
      kop.textContent = 'Zo komen ze in de vakjes. Pas aan wat niet klopt en bevestig.';
      lijst.appendChild(kop);
      var ol = document.createElement('ol');
      ol.className = 'sleepvak-lijst';
      bestanden.forEach(function (f, i) {
        var li = document.createElement('li');
        var naam = document.createElement('span');
        naam.className = 'sleepvak-naam';
        naam.textContent = f.name;
        var kies = document.createElement('select');
        kies.name = 'vak';
        kies.setAttribute('aria-label', 'Vakje voor ' + f.name);
        if (!keuze[i]) {
          var leeg = document.createElement('option');
          leeg.value = ''; leeg.textContent = 'geen vrij vakje: in de indeeltabel'; leeg.selected = true;
          kies.appendChild(leeg);
        }
        plan.vakken.forEach(function (v) {
          var o = document.createElement('option');
          o.value = v.id;
          o.textContent = v.label + (v.vol ? ' (staat er al: wordt vervangen)' : '');
          if (keuze[i] === v.id) o.selected = true;
          kies.appendChild(o);
        });
        li.appendChild(naam);
        li.appendChild(document.createTextNode(' → '));
        li.appendChild(kies);
        ol.appendChild(li);
      });
      lijst.appendChild(ol);
      lijst.hidden = false;
      knop.textContent = 'Bevestigen en uploaden (' + bestanden.length + ')';
    }

    invoer.addEventListener('change', toon);
    vak.addEventListener('dragover', function (e) { e.preventDefault(); vak.classList.add('is-over'); });
    vak.addEventListener('dragleave', function () { vak.classList.remove('is-over'); });
    vak.addEventListener('drop', function (e) {
      e.preventDefault();
      vak.classList.remove('is-over');
      if (!e.dataTransfer || !e.dataTransfer.files || !e.dataTransfer.files.length) return;
      try { invoer.files = e.dataTransfer.files; } catch (_) { return; }
      toon();
    });
  }

  function start() { Array.prototype.forEach.call(document.querySelectorAll('form[data-sleepvak]'), opzetten); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
