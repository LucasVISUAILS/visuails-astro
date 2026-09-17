/*
=============================================================================
 04 · PREFLIGHT CONTROLE
 (laatste check vóór levering: klopt de achtergrondkleur, het formaat,
  de kleurmodus en zit er geen halo — verandert zelf niets)
=============================================================================
 Dit script bewerkt NIETS. Het kijkt alleen en rapporteert.
 Draai het als laatste stap, vóór je exporteert of oplevert.

 Wat het controleert, per open document:
   1. de achtergrondkleur op een ring meetpunten langs de rand
   2. de afmetingen en of het beeld vierkant is
   3. de kleurmodus en de bitdiepte
   4. of er per ongeluk nog een laag zichtbaar is die er niet hoort
   5. of het product te dicht op de rand staat
=============================================================================
*/

var CFG = {
  expectedHex     : "FFFFFF",  // zonder hekje
  tolerance       : 2,         // afwijking per kanaal die nog acceptabel is
  samplesPerSide  : 7,         // hoeveel meetpunten per zijde
  insetPct        : 0.6,       // hoe ver vanaf de rand gemeten wordt
  expectSquare    : true,
  expectedLongEdge: 2048,      // 0 = niet controleren
  productLayerName: "PRODUCT",
  minMarginPct    : 3          // product moet minstens zoveel vrij houden
};

#target photoshop

function main() {
  if (app.documents.length === 0) { alert("Er staat geen document open."); return; }
  var ru = app.preferences.rulerUnits;
  app.preferences.rulerUnits = Units.PIXELS;

  var out = "PREFLIGHT\nverwacht #" + CFG.expectedHex.toUpperCase() + "\n";
  out += "=======================================\n";

  for (var i = 0; i < app.documents.length; i++) {
    var doc = app.documents[i];
    app.activeDocument = doc;
    out += "\n" + doc.name + "\n";
    try { out += check(doc); }
    catch (e) { out += "   FOUT bij controleren: " + e.message + "\n"; }
  }
  app.preferences.rulerUnits = ru;
  alert(out);
}

function check(doc) {
  var r = "", ok = true;
  var w = doc.width.as("px"), h = doc.height.as("px");

  /* --- achtergrondkleur langs de rand --- */
  var target = hexToRGB(CFG.expectedHex), bad = 0, worst = null;
  var pts = edgePoints(doc);
  for (var i = 0; i < pts.length; i++) {
    var c = getRGB(doc, pts[i][0], pts[i][1]);
    var d = Math.max(Math.abs(c.r - target.r), Math.abs(c.g - target.g), Math.abs(c.b - target.b));
    if (d > CFG.tolerance) {
      bad++;
      if (!worst || d > worst.d) worst = { d: d, c: c, x: pts[i][0], y: pts[i][1] };
    }
  }
  if (bad === 0) r += "   achtergrond   OK, " + pts.length + " punten gemeten\n";
  else {
    ok = false;
    r += "   achtergrond   AFWIJKING op " + bad + " van de " + pts.length + " punten\n";
    r += "                 ergste: rgb(" + Math.round(worst.c.r) + "," +
         Math.round(worst.c.g) + "," + Math.round(worst.c.b) + ") op " +
         Math.round(worst.x) + "," + Math.round(worst.y) + "\n";
    r += "                 dit is meestal een halo of een verloop dat is blijven staan\n";
  }

  /* --- formaat --- */
  r += "   formaat       " + w + " x " + h + "\n";
  if (CFG.expectSquare && w !== h) { ok = false; r += "                 NIET VIERKANT\n"; }
  if (CFG.expectedLongEdge > 0 && Math.max(w, h) !== CFG.expectedLongEdge) {
    ok = false;
    r += "                 langste zijde is " + Math.max(w, h) +
         ", verwacht " + CFG.expectedLongEdge + "\n";
  }

  /* --- kleurmodus --- */
  var mode = "" + doc.mode;
  r += "   modus         " + mode.replace("DocumentMode.", "") + ", " + doc.bitsPerChannel + "\n";
  if (mode.indexOf("RGB") === -1) { ok = false; r += "                 GEEN RGB\n"; }

  /* --- marge rond het product --- */
  var L = findLayer(doc, CFG.productLayerName);
  if (L) {
    var b = L.bounds;
    var m = Math.min(b[0].as("px"), b[1].as("px"), w - b[2].as("px"), h - b[3].as("px"));
    var mp = (m / Math.min(w, h)) * 100;
    r += "   marge         " + Math.round(mp * 10) / 10 + "% vrij rond het product\n";
    if (mp < CFG.minMarginPct) {
      ok = false;
      r += "                 TE KRAP, minimaal " + CFG.minMarginPct + "%\n";
    }
  } else {
    r += "   marge         geen laag '" + CFG.productLayerName + "' gevonden, niet gemeten\n";
  }

  /* --- zichtbare lagen --- */
  r += "   lagen         " + doc.layers.length + " stuks: " + layerNames(doc) + "\n";

  r += ok ? "   >> KLAAR VOOR LEVERING\n" : "   >> NOG NIET LEVEREN\n";
  return r;
}

/* Meetpunten in een ring langs alle vier de randen */
function edgePoints(doc) {
  var w = doc.width.as("px"), h = doc.height.as("px");
  var ix = Math.max(2, Math.round(w * (CFG.insetPct / 100)));
  var iy = Math.max(2, Math.round(h * (CFG.insetPct / 100)));
  var n = CFG.samplesPerSide, pts = [];
  for (var i = 0; i < n; i++) {
    var fx = (i + 0.5) / n * w, fy = (i + 0.5) / n * h;
    pts.push([fx, iy]);        // boven
    pts.push([fx, h - iy]);    // onder
    pts.push([ix, fy]);        // links
    pts.push([w - ix, fy]);    // rechts
  }
  return pts;
}

function getRGB(doc, x, y) {
  var s = doc.colorSamplers.add([new UnitValue(x, "px"), new UnitValue(y, "px")]);
  var c = s.color.rgb, o = { r: c.red, g: c.green, b: c.blue };
  s.remove();
  return o;
}

function hexToRGB(hex) {
  hex = hex.replace("#", "");
  return {
    r: parseInt(hex.substring(0, 2), 16),
    g: parseInt(hex.substring(2, 4), 16),
    b: parseInt(hex.substring(4, 6), 16)
  };
}

function findLayer(doc, name) {
  for (var i = 0; i < doc.layers.length; i++)
    if (doc.layers[i].name === name) return doc.layers[i];
  return null;
}

function layerNames(doc) {
  var a = [];
  for (var i = 0; i < doc.layers.length; i++)
    a.push(doc.layers[i].name + (doc.layers[i].visible ? "" : " (uit)"));
  return a.join(", ");
}

main();
