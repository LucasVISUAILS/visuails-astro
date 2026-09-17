/*
=============================================================================
 02 · KADER NORMALISEREN
 (product overal even groot en op dezelfde plek in beeld, voor bestanden
  die al uitgesneden zijn of een transparante achtergrond hebben)
=============================================================================
 Gebruik dit als 01 zijn werk al heeft gedaan, of bij losse PNG's met
 transparantie. Dit is wat een rij productfoto's er professioneel uit
 laat zien: niet de schaduw, maar dat het product op beeld 1 exact even
 groot staat als op beeld 2.

 LET OP: laagstijlen schalen NIET mee als je een laag verkleint. Zit er
 al een schaduw op, zet die dan even uit, draai dit script en zet hem
 daarna opnieuw. Of gebruik gewoon 01, die doet de volgorde vanzelf goed.
=============================================================================
*/

var CFG = {
  targetFillPct   : 78,        // hoeveel procent van het canvas het product vult
  anchor          : "center",  // "center" of "bottom"
  bottomMarginPct : 8,         // alleen bij anchor "bottom"
  layerName       : "PRODUCT", // leeg laten om de actieve laag te nemen
  skipIfNoAlpha   : true       // laag die het hele canvas vult overslaan
};

#target photoshop

function main() {
  if (app.documents.length === 0) { alert("Er staat geen document open."); return; }
  var ru = app.preferences.rulerUnits;
  app.preferences.rulerUnits = Units.PIXELS;

  var done = [], skipped = [], failed = [];
  for (var i = 0; i < app.documents.length; i++) {
    var doc = app.documents[i];
    app.activeDocument = doc;
    try {
      var r = normalise(doc);
      if (r) done.push(doc.name + "   " + r); else skipped.push(doc.name);
    } catch (e) { failed.push(doc.name + "  ->  " + e.message); }
  }
  app.preferences.rulerUnits = ru;

  var m = "Klaar.\n";
  if (done.length)    m += "\nGELIJKGETROKKEN\n  " + done.join("\n  ") + "\n";
  if (skipped.length) m += "\nOVERGESLAGEN (vult het hele canvas, niets om op te meten)\n  " + skipped.join("\n  ") + "\n";
  if (failed.length)  m += "\nNIET GELUKT\n  " + failed.join("\n  ");
  alert(m);
}

function normalise(doc) {
  var L = CFG.layerName ? findLayer(doc, CFG.layerName) : doc.activeLayer;
  if (!L) L = doc.activeLayer;
  doc.activeLayer = L;

  var cw = doc.width.as("px"), ch = doc.height.as("px");
  var b  = L.bounds;
  var pw = b[2].as("px") - b[0].as("px");
  var ph = b[3].as("px") - b[1].as("px");

  if (pw < 2 || ph < 2) return null;
  if (CFG.skipIfNoAlpha && pw >= cw - 2 && ph >= ch - 2) return null;

  // De kleinste van de twee factoren, zodat het product nooit overloopt
  var target = CFG.targetFillPct / 100;
  var scale  = Math.min((cw * target) / pw, (ch * target) / ph) * 100;
  if (Math.abs(scale - 100) > 0.5) L.resize(scale, scale, AnchorPosition.MIDDLECENTER);

  b = L.bounds;
  var x1 = b[0].as("px"), y1 = b[1].as("px"), x2 = b[2].as("px"), y2 = b[3].as("px");
  var dx = (cw / 2) - ((x1 + x2) / 2), dy;
  if (CFG.anchor === "bottom") dy = (ch - ch * (CFG.bottomMarginPct / 100)) - y2;
  else                         dy = (ch / 2) - ((y1 + y2) / 2);
  L.translate(dx, dy);

  return "schaal " + Math.round(scale) + "%";
}

function findLayer(doc, name) {
  for (var i = 0; i < doc.layers.length; i++)
    if (doc.layers[i].name === name) return doc.layers[i];
  return null;
}

main();
