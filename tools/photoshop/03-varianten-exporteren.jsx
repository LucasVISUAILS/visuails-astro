/*
=============================================================================
 03 · VARIANTEN EXPORTEREN
 (een afgewerkt document in alle leverformaten wegschrijven, in mappen
  per variant, met de naamgeving die je klant krijgt)
=============================================================================
 Draait over alle open documenten. Schrijft per document naar een map
 naast het origineel.

 GEEN WEBP HIER, EN DAT IS EXPRES. De C2PA-markering van de
 modelaanbieder overleeft PNG en JPG, maar een webp-omzetting wist hem.
 Wil je webp voor het web, doe dat dan bewust en pas op het eind.

 De ingebrande watermerkvariant en de badge-variant zitten er nog NIET in:
 die vragen een grafisch element dat over het beeld gelegd wordt, en dat
 hoort uit je merkbestanden te komen in plaats van uit code. Zie de
 README voor waar dat naartoe moet.
=============================================================================
*/

var CFG = {
  // Elke regel is een uitvoer. Zet op false wat je niet nodig hebt.
  outputs: [
    { dir: "master",  format: "png", size: 0,    quality: 0,  on: true  },
    { dir: "webshop", format: "jpg", size: 2048, quality: 11, on: true  },
    { dir: "webshop", format: "jpg", size: 1200, quality: 11, on: true  },
    { dir: "thumb",   format: "jpg", size: 600,  quality: 10, on: true  }
  ],

  // size 0 = originele afmeting. Anders: langste zijde in pixels.
  suffixBySize : true,   // zet _2048 achter de naam
  rootDir      : "_levering"
};

#target photoshop

function main() {
  if (app.documents.length === 0) { alert("Er staat geen document open."); return; }
  var ru = app.preferences.rulerUnits;
  app.preferences.rulerUnits = Units.PIXELS;

  var written = [], failed = [];
  for (var i = 0; i < app.documents.length; i++) {
    var doc = app.documents[i];
    app.activeDocument = doc;
    try { written = written.concat(exportDoc(doc)); }
    catch (e) { failed.push(doc.name + "  ->  " + e.message); }
  }
  app.preferences.rulerUnits = ru;

  var m = "Klaar. " + written.length + " bestanden weggeschreven.\n\n" + written.join("\n");
  if (failed.length) m += "\n\nNIET GELUKT\n  " + failed.join("\n  ") +
      "\n\nWaarschijnlijk is dat document nog nooit opgeslagen, dus\n" +
      "weet het script niet waar het moet schrijven.";
  alert(m);
}

function exportDoc(doc) {
  var out = [];
  var root = new Folder(doc.path + "/" + CFG.rootDir);
  if (!root.exists) root.create();
  var base = doc.name.replace(/\.[^\.]+$/, "");

  for (var i = 0; i < CFG.outputs.length; i++) {
    var o = CFG.outputs[i];
    if (!o.on) continue;

    var folder = new Folder(root + "/" + o.dir);
    if (!folder.exists) folder.create();

    // Altijd op een kopie werken, zodat het origineel niet verandert
    var copy = doc.duplicate(base + "_tmp", true);
    app.activeDocument = copy;

    if (o.size > 0) {
      var w = copy.width.as("px"), h = copy.height.as("px");
      if (w >= h) copy.resizeImage(UnitValue(o.size, "px"), null, null, ResampleMethod.BICUBICSHARPER);
      else        copy.resizeImage(null, UnitValue(o.size, "px"), null, ResampleMethod.BICUBICSHARPER);
    }

    var name = base + (CFG.suffixBySize && o.size > 0 ? "_" + o.size : "");
    var file, opts;
    if (o.format === "png") {
      file = new File(folder + "/" + name + ".png");
      opts = new PNGSaveOptions(); opts.compression = 6;
    } else {
      file = new File(folder + "/" + name + ".jpg");
      opts = new JPEGSaveOptions(); opts.quality = o.quality; opts.embedColorProfile = true;
    }
    copy.saveAs(file, opts, true, Extension.LOWERCASE);
    copy.close(SaveOptions.DONOTSAVECHANGES);
    app.activeDocument = doc;

    out.push(o.dir + "/" + name + "." + o.format);
  }
  return out;
}

main();
