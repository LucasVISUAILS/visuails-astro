/*
=============================================================================
 05 · ECHTE SCHADUW BEHOUDEN
 (de originele schaduw van de foto bewaren terwijl je de achtergrond op
  de kleur van de klant zet — voor on-model shots, waar een nagemaakte
  schaduw er altijd nep uitziet)
=============================================================================
 HET PROBLEEM DAT DIT OPLOST
 Je schaduw IS achtergrond: het zijn achtergrondpixels die donkerder
 zijn. Snij je de achtergrond weg, dan gaat de schaduw mee. Houd je hem,
 dan houd je het oude grijs. Een masker kan dit niet oplossen.

 HOE HET WERKT
 Het script bouwt drie lagen:

   PRODUCT      het uitgesneden product, met zachte randen en haar intact
   SCHADUW      dezelfde foto, ontkleurd en met Niveaus uit elkaar
                getrokken tot de schone achtergrond zuiver WIT is en
                alleen de schaduw grijs blijft. Op Vermenigvuldigen.
   ACHTERGROND  een vlakke laag in de hex van de klant

 Wit vermenigvuldigd met wat dan ook verandert niets. De schone
 achtergrond verdwijnt dus volledig en alleen de schaduw blijft staan —
 en die valt nu op de kleur van de klant in plaats van op het oude grijs.

 HET WITPUNT WORDT GEMETEN, NIET GERADEN
 Het script leest de vier hoeken van je foto, neemt de donkerste, en legt
 het witpunt daar net onder. Zo klapt ook een achtergrond met een verloop
 helemaal dicht, zonder dat je de schaduw meesleurt.

 WANNEER WEL EN NIET
 Wel: on-model shots, waar de echte schaduw mooier is dan een gemaakte.
 Niet: front en back. Daar is de laagstijl uit script 01 consistenter
 over een hele catalogus, en consistentie is wat een raster professioneel
 maakt.
=============================================================================
*/

var CFG = {

  // --- De achtergrondkleur van deze order, zonder hekje
  backgroundHex : "FFFFFF",

  // --- Alleen documenten waarvan de naam dit bevat.
  //     Leeg maken ([]) om alles te doen wat open staat.
  onlyFilenamesContaining : ["model"],

  // --- Hoeveel onder de donkerste hoek het witpunt komt te liggen.
  //     Hoger = achtergrond klapt zekerder dicht, maar je verliest de
  //     lichtste aanzet van de schaduw. 3 tot 8 is het bruikbare bereik.
  whitePointHeadroom : 5,

  // --- Zwartpunt. Omhoog zetten maakt de schaduw dieper.
  blackPoint : 0,
  gamma      : 1.0,

  // --- Kracht van de schaduw. 100 = precies zoals gefotografeerd.
  shadowOpacity : 100,

  // --- Randbehandeling van het product
  biteInPx        : 1,   // uitsnede een pixel naar binnen = halo weg
  featherPx       : 0.5,
  shadowUnderlapPx: 2,   // schaduwlaag loopt zover dóór onder het product,
                         // zodat er nooit een naad tussen de twee ontstaat

  // --- Waarschuwen als de achtergrond te donker is voor deze techniek
  minBackgroundLuma : 200,

  productLayerName : "PRODUCT",
  shadowLayerName  : "SCHADUW",
  bgLayerName      : "ACHTERGROND"
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
      if (!nameMatches(doc.name)) { skipped.push(doc.name + "   (naam past niet)"); continue; }
      if (alreadyProcessed(doc)) { skipped.push(doc.name + "   (was al gedaan)"); continue; }
      done.push(doc.name + "\n      " + build(doc));
    } catch (e) {
      failed.push(doc.name + "  ->  " + e.message);
    }
  }

  app.preferences.rulerUnits = ru;

  var m = "Klaar. " + done.length + " verwerkt.\n";
  m += "Achtergrond: #" + CFG.backgroundHex.toUpperCase() + "\n";
  if (done.length)    m += "\nGEDAAN\n  " + done.join("\n  ") + "\n";
  if (skipped.length) m += "\nOVERGESLAGEN\n  " + skipped.join("\n  ") + "\n";
  if (failed.length)  m += "\nNIET GELUKT\n  " + failed.join("\n  ") +
      "\n\nBijna altijd is dat Select Subject die het onderwerp niet vindt.\n" +
      "Maak zelf een selectie van het onderwerp en draai opnieuw.";
  alert(m);
}

/* ------------------------------------------------------------------ */

function build(doc) {

  /* --- 1. Meet de achtergrond VOORDAT er iets verandert ------------ */
  var luma = darkestCornerLuma(doc);
  var warn = "";
  if (luma < CFG.minBackgroundLuma) {
    warn = "\n      LET OP: achtergrond is tamelijk donker (luma " +
           Math.round(luma) + "). Deze techniek werkt het best op een\n" +
           "      lichte achtergrond; controleer of de schaduw niet is weggevallen.";
  }
  var whiteIn = Math.round(luma - CFG.whitePointHeadroom);
  if (whiteIn < 2)   whiteIn = 2;
  if (whiteIn > 254) whiteIn = 254;

  /* --- 2. Twee kopieen van dezelfde foto --------------------------- */
  var src = doc.activeLayer;
  if (src.isBackgroundLayer) src.isBackgroundLayer = false;
  src.name = CFG.shadowLayerName;          // de onderste wordt de schaduw

  var prod = src.duplicate();              // de kopie komt erboven
  prod.name = CFG.productLayerName;
  doc.activeLayer = prod;

  /* --- 3. Onderwerp selecteren en bewaren -------------------------- */
  selectSubject();
  var store = doc.channels.add();
  store.name = "onderwerp";
  doc.selection.store(store);

  /* --- 4. PRODUCT: masker dat het onderwerp toont ------------------ */
  doc.activeLayer = prod;
  doc.selection.load(store, SelectionType.REPLACE);
  contractAndFeather(doc, CFG.biteInPx);
  addLayerMask(false);                     // false = toon de selectie
  doc.selection.deselect();

  /* --- 5. SCHADUW: masker dat het onderwerp juist WEGhaalt ---------
     Het gat is bewust iets kleiner dan het product, zodat de productlaag
     de naad overdekt en er geen lijntje tussen de twee ontstaat. ----- */
  doc.activeLayer = src;
  doc.selection.load(store, SelectionType.REPLACE);
  contractAndFeather(doc, CFG.biteInPx + CFG.shadowUnderlapPx);
  addLayerMask(true);                      // true = verberg de selectie
  doc.selection.deselect();

  /* --- 6. SCHADUW uitrekenen --------------------------------------- */
  doc.activeLayer = src;
  selectLayerPixels();                     // richt op de laag, niet op het masker
  src.desaturate();
  src.adjustLevels(CFG.blackPoint, whiteIn, CFG.gamma, 0, 255);
  src.blendMode = BlendMode.MULTIPLY;
  src.opacity = CFG.shadowOpacity;

  store.remove();

  /* --- 7. De kleur van de klant helemaal onderop ------------------- */
  addBackgroundLayer(doc);

  return "witpunt op " + whiteIn + " (donkerste hoek was " +
         Math.round(luma) + ")" + warn;
}

/* ------------------------------------------------------------------ */

function contractAndFeather(doc, px) {
  var k = doc.width.as("px") / 2000;
  var c = Math.max(1, Math.round(px * k));
  try { doc.selection.contract(new UnitValue(c, "px")); } catch (e) {}
  var f = CFG.featherPx * k;
  if (f >= 0.2) { try { doc.selection.feather(new UnitValue(f, "px")); } catch (e) {} }
}

function darkestCornerLuma(doc) {
  var w = doc.width.as("px"), h = doc.height.as("px");
  var i = Math.max(2, Math.round(Math.min(w, h) * 0.004));
  var pts = [[i, i], [w - i, i], [i, h - i], [w - i, h - i]];
  var lo = 255;
  for (var n = 0; n < pts.length; n++) {
    var c = getRGB(doc, pts[n][0], pts[n][1]);
    var l = 0.299 * c.r + 0.587 * c.g + 0.114 * c.b;
    if (l < lo) lo = l;
  }
  return lo;
}

function getRGB(doc, x, y) {
  var s = doc.colorSamplers.add([new UnitValue(x, "px"), new UnitValue(y, "px")]);
  var c = s.color.rgb, o = { r: c.red, g: c.green, b: c.blue };
  s.remove();
  return o;
}

function selectSubject() {
  var d = new ActionDescriptor();
  d.putBoolean(stringIDToTypeID("sampleAllLayers"), false);
  executeAction(stringIDToTypeID("autoCutout"), d, DialogModes.NO);
}

/* hide = false -> masker toont de selectie
   hide = true  -> masker verbergt de selectie */
function addLayerMask(hide) {
  var d = new ActionDescriptor();
  d.putClass(stringIDToTypeID("new"), stringIDToTypeID("channel"));
  var r = new ActionReference();
  r.putEnumerated(stringIDToTypeID("channel"), stringIDToTypeID("channel"), stringIDToTypeID("mask"));
  d.putReference(stringIDToTypeID("at"), r);
  d.putEnumerated(stringIDToTypeID("using"), stringIDToTypeID("userMaskEnabled"),
                  stringIDToTypeID(hide ? "hideSelection" : "revealSelection"));
  executeAction(stringIDToTypeID("make"), d, DialogModes.NO);
}

/* Na het maken van een masker staat het masker actief. Dit richt de
   bewerkingen weer op de pixels van de laag zelf. */
function selectLayerPixels() {
  var d = new ActionDescriptor();
  var r = new ActionReference();
  r.putEnumerated(stringIDToTypeID("channel"), stringIDToTypeID("channel"), stringIDToTypeID("RGB"));
  d.putReference(stringIDToTypeID("null"), r);
  executeAction(stringIDToTypeID("select"), d, DialogModes.NO);
}

function addBackgroundLayer(doc) {
  var hex = CFG.backgroundHex.replace("#", "");
  var col = new SolidColor();
  col.rgb.hexValue = hex;

  var bg = doc.artLayers.add();
  bg.name = CFG.bgLayerName + " #" + hex.toUpperCase();
  doc.activeLayer = bg;
  doc.selection.selectAll();
  doc.selection.fill(col);
  doc.selection.deselect();
  bg.move(doc.layers[doc.layers.length - 1], ElementPlacement.PLACEAFTER);
}

function nameMatches(name) {
  if (!CFG.onlyFilenamesContaining || CFG.onlyFilenamesContaining.length === 0) return true;
  var n = name.toLowerCase();
  for (var i = 0; i < CFG.onlyFilenamesContaining.length; i++)
    if (n.indexOf(CFG.onlyFilenamesContaining[i].toLowerCase()) !== -1) return true;
  return false;
}

function alreadyProcessed(doc) {
  for (var i = 0; i < doc.layers.length; i++)
    if (doc.layers[i].name.indexOf(CFG.bgLayerName) === 0) return true;
  return false;
}

main();
