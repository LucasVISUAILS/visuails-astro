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
