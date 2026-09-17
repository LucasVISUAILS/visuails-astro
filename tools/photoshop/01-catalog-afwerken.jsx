/*
=============================================================================
 01 · CATALOG AFWERKEN
 (achtergrond op de gevraagde kleur + consistente schaduw, over alle
  open documenten tegelijk)
=============================================================================
 Dit is de hoofdmotor. Per document:
   product uitsnijden -> kader gelijktrekken -> achtergrondkleur -> schaduw

 DE VOLGORDE IS NIET VRIJBLIJVEND. Het kader moet gelijkgetrokken worden
 NADAT het product is uitgesneden (anders is er niets om op te meten) en
 VOORDAT de schaduw erop gaat (een laagstijl schaalt niet mee als je de
 laag daarna nog verkleint). Daarom zit alles in een script.

 HET SCRIPT LEEST JE BESTANDSNAAM en kiest daarop de behandeling, want
 een script kan het verschil tussen een mens en een opgevouwen broek niet
 zien. Jouw naamgeving bevat die informatie al.

   bevat "model"             -> Select Subject, WIT, GEEN schaduw
   bevat "detail" of "close" -> alleen de achtergrond schoonmaken
   al het andere             -> achtergrond via de hoeken, WIT + SCHADUW

 Draaien: File > Scripts > Browse...
 Opnieuw draaien: eerst per document Bestand > Herstellen (File > Revert).
=============================================================================
*/

var CFG = {

  // --- DE ACHTERGRONDKLEUR VAN DEZE ORDER.
  //     Klant kiest die zelf; bij Amazon staat hij vast op FFFFFF.
  //     Schrijf hem zonder hekje.
  backgroundHex : "FFFFFF",

  // --- Routering op bestandsnaam
  modelKeywords  : ["model", "on-model", "onmodel"],
  detailKeywords : ["detail", "close", "macro", "crop"],

  // --- Kader gelijktrekken
  //     Dit is wat een catalogus er professioneel uit laat zien. Zonder
  //     staat je product op beeld 1 net iets groter dan op beeld 2.
  normaliseFrame   : true,
  targetFillPct    : 78,        // hoeveel procent van het canvas het product vult
  anchor           : "center",  // "center" of "bottom"
  bottomMarginPct  : 8,         // alleen bij anchor "bottom"

  // --- De schaduw. Alleen voor front, back en losse productshots.
  //     Waarden gelden voor 2000px breed en schalen automatisch mee.
  shadow: {
    opacity : 19, angle : 90, distance : 12, spread : 0, size : 40,
    r: 60, g: 60, b: 60          // #3C3C3C, nooit puur zwart
  },

  // --- Schaduw op de on-model shot? Standaard uit: een grote schaduw
  //     achter een hele figuur leest als waas, niet als schaduw.
  shadowOnModel : false,
  modelShadow: { opacity: 12, angle: 90, distance: 4, spread: 0, size: 14,
                 r: 60, g: 60, b: 60 },

  wandTolerance  : 22,     // voor front/back. 15-35 werkt
  biteInPx       : 1,      // uitsnede een pixel naar binnen = halo weg
  featherPx      : 0.5,
  whiteThreshold : 232,    // waarboven een hoek "achtergrond" heet

  refWidth   : 2000,
  mergeFirst : false,

  productLayerName : "PRODUCT",
  bgLayerName      : "ACHTERGROND"
};

#target photoshop

function main() {
  if (app.documents.length === 0) { alert("Er staat geen document open."); return; }
  var ru = app.preferences.rulerUnits;
  app.preferences.rulerUnits = Units.PIXELS;

  var log = [], failed = [], total = app.documents.length;
  for (var i = 0; i < total; i++) {
    var doc = app.documents[i];
    app.activeDocument = doc;
    try {
      if (alreadyProcessed(doc)) { log.push([doc.name, "overgeslagen, was al gedaan"]); continue; }
      log.push([doc.name, processDocument(doc)]);
    } catch (e) { failed.push(doc.name + "  ->  " + e.message); }
  }
  app.preferences.rulerUnits = ru;
  report(log, failed, total);
}

/* ------------------------------------------------------------------ */

function routeFor(name) {
  var n = name.toLowerCase(), i;
  for (i = 0; i < CFG.detailKeywords.length; i++)
    if (n.indexOf(CFG.detailKeywords[i]) !== -1) return "detail";
  for (i = 0; i < CFG.modelKeywords.length; i++)
    if (n.indexOf(CFG.modelKeywords[i]) !== -1) return "model";
  return "product";
}

function processDocument(doc) {
  if (CFG.mergeFirst && doc.layers.length > 1) doc.flatten();

  var layer = doc.activeLayer;
  if (layer.isBackgroundLayer) layer.isBackgroundLayer = false;
  layer.name = CFG.productLayerName;
  doc.activeLayer = layer;

  var k = doc.width.as("px") / CFG.refWidth;
  var route = routeFor(doc.name);

  /* --- DETAIL: product loopt van de rand af. Alleen de achtergrond
         schoonmaken. Een slagschaduw zou hier een harde lijn langs je
         uitsnede trekken, dus die slaan we over. --------------------- */
  if (route === "detail") {
    if (selectBackgroundFromCorners(doc)) {
      fillSelection(doc, hexColor(CFG.backgroundHex));
      doc.selection.deselect();
      return "detail  ->  alleen achtergrond opgeschoond";
    }
    return "detail  ->  geen achtergrond herkend, niets gedaan";
  }

  /* --- MODEL: Select Subject is hier het juiste gereedschap, want het
         is een mens en de achtergrond heeft vaak een verloop met een
         vloerschaduw waar een toverstaf op stukloopt. ---------------- */
  if (route === "model") {
    selectSubject();
    biteIn(doc, k);
    addLayerMaskFromSelection();
    doc.selection.deselect();
    if (CFG.normaliseFrame) normaliseFrame(doc);
    addBackgroundLayer(doc);
    if (CFG.shadowOnModel) {
      doc.activeLayer = getLayerByName(doc, CFG.productLayerName);
      applyShadow(CFG.modelShadow, k);
      return "model  ->  achtergrond + kleine schaduw";
    }
    return "model  ->  achtergrond, geen schaduw";
  }

  /* --- PRODUCT: front, back, losse shots ------------------------- */
  var ok = selectBackgroundFromCorners(doc);
  if (ok && !selectionLooksSane(doc)) ok = false;
  if (ok) doc.selection.invert();   // achtergrond -> product
  else    selectSubject();

  biteIn(doc, k);
  addLayerMaskFromSelection();
  doc.selection.deselect();
  if (CFG.normaliseFrame) normaliseFrame(doc);
  addBackgroundLayer(doc);

  doc.activeLayer = getLayerByName(doc, CFG.productLayerName);
  applyShadow(CFG.shadow, k);
  return "product  ->  achtergrond + schaduw";
}

/* Schaalt het product zo dat het overal even groot in beeld staat en
   zet het gecentreerd. Moet NA het maskeren en VOOR de schaduw. */
function normaliseFrame(doc) {
  var L = getLayerByName(doc, CFG.productLayerName);
  doc.activeLayer = L;

  var cw = doc.width.as("px"), ch = doc.height.as("px");
  var b  = L.bounds;
  var pw = b[2].as("px") - b[0].as("px");
  var ph = b[3].as("px") - b[1].as("px");
  if (pw < 2 || ph < 2) return;

  // Nooit laten overlopen: kies de kleinste van de twee schaalfactoren
  var target = CFG.targetFillPct / 100;
  var scale  = Math.min((cw * target) / pw, (ch * target) / ph) * 100;
  if (Math.abs(scale - 100) > 0.5) {
    L.resize(scale, scale, AnchorPosition.MIDDLECENTER);
  }

  b = L.bounds;
  var x1 = b[0].as("px"), y1 = b[1].as("px");
  var x2 = b[2].as("px"), y2 = b[3].as("px");
  var dx = (cw / 2) - ((x1 + x2) / 2);
  var dy;
  if (CFG.anchor === "bottom") {
    var margin = ch * (CFG.bottomMarginPct / 100);
    dy = (ch - margin) - y2;
  } else {
    dy = (ch / 2) - ((y1 + y2) / 2);
  }
  L.translate(dx, dy);
}

function biteIn(doc, k) {
  var c = Math.max(1, Math.round(CFG.biteInPx * k));
  try { doc.selection.contract(new UnitValue(c, "px")); } catch (e) {}
  var f = CFG.featherPx * k;
  if (f >= 0.2) { try { doc.selection.feather(new UnitValue(f, "px")); } catch (e) {} }
}

function applyShadow(s, k) {
  addDropShadow(s.opacity, s.angle, s.distance * k, s.spread, s.size * k, s.r, s.g, s.b);
}

/* ------------------------------------------------------------------ */

function hexColor(hex) {
  hex = hex.replace("#", "");
  var c = new SolidColor();
  c.rgb.hexValue = hex;
  return c;
}

function getRGB(doc, x, y) {
  var s = doc.colorSamplers.add([new UnitValue(x, "px"), new UnitValue(y, "px")]);
  var c = s.color.rgb, o = { r: c.red, g: c.green, b: c.blue };
  s.remove();
  return o;
}

function cornerPoints(doc) {
  var w = doc.width.as("px"), h = doc.height.as("px");
  var i = Math.max(2, Math.round(Math.min(w, h) * 0.004));
  return [[i, i], [w - i, i], [i, h - i], [w - i, h - i]];
}

/* Vanuit elke achtergrondhoek selecteren en optellen. Vier startpunten
   vangen ook losse stukken, zoals de ruimte tussen twee broekspijpen. */
function selectBackgroundFromCorners(doc) {
  var pts = cornerPoints(doc), t = CFG.whiteThreshold, store = null, any = false;
  for (var i = 0; i < pts.length; i++) {
    var x = pts[i][0], y = pts[i][1], c = getRGB(doc, x, y);
    if (!(c.r > t && c.g > t && c.b > t)) continue;
    doc.magicWandSelect(x, y, CFG.wandTolerance, true, false);
    if (!any) { store = doc.channels.add(); doc.selection.store(store); any = true; }
    else { doc.selection.load(store, SelectionType.EXTEND); doc.selection.store(store); }
  }
  if (!any) return false;
  doc.selection.load(store, SelectionType.REPLACE);
  store.remove();
  return true;
}

function selectionLooksSane(doc) {
  var total = doc.width.as("px") * doc.height.as("px"), b;
  try { b = doc.selection.bounds; } catch (e) { return false; }
  var bw = b[2].as("px") - b[0].as("px"), bh = b[3].as("px") - b[1].as("px");
  return ((bw * bh) / total > 0.10);
}

function selectSubject() {
  var d = new ActionDescriptor();
  d.putBoolean(stringIDToTypeID("sampleAllLayers"), false);
  executeAction(stringIDToTypeID("autoCutout"), d, DialogModes.NO);
}

function fillSelection(doc, color) { doc.selection.fill(color); }

function addLayerMaskFromSelection() {
  var d = new ActionDescriptor();
  d.putClass(stringIDToTypeID("new"), stringIDToTypeID("channel"));
  var r = new ActionReference();
  r.putEnumerated(stringIDToTypeID("channel"), stringIDToTypeID("channel"), stringIDToTypeID("mask"));
  d.putReference(stringIDToTypeID("at"), r);
  d.putEnumerated(stringIDToTypeID("using"), stringIDToTypeID("userMaskEnabled"), stringIDToTypeID("revealSelection"));
  executeAction(stringIDToTypeID("make"), d, DialogModes.NO);
}

/* Bewust een gewone gevulde laag en geen fill layer: dit is de enige
   manier waarop je zeker weet dat elke pixel exact de gevraagde hex is. */
function addBackgroundLayer(doc) {
  var col = hexColor(CFG.backgroundHex);
  var bg = doc.artLayers.add();
  bg.name = CFG.bgLayerName + " #" + CFG.backgroundHex.toUpperCase();
  doc.activeLayer = bg;
  doc.selection.selectAll();
  doc.selection.fill(col);
  doc.selection.deselect();
  bg.move(doc.layers[doc.layers.length - 1], ElementPlacement.PLACEAFTER);
}

function addDropShadow(opacity, angle, distance, spread, size, r, g, b) {
  var d = new ActionDescriptor(), ref = new ActionReference();
  ref.putProperty(stringIDToTypeID("property"), stringIDToTypeID("layerEffects"));
  ref.putEnumerated(stringIDToTypeID("layer"), stringIDToTypeID("ordinal"), stringIDToTypeID("targetEnum"));
  d.putReference(stringIDToTypeID("null"), ref);

  var fx = new ActionDescriptor();
  fx.putUnitDouble(stringIDToTypeID("scale"), stringIDToTypeID("percentUnit"), 100);

  var ds = new ActionDescriptor();
  ds.putBoolean(stringIDToTypeID("enabled"), true);
  ds.putBoolean(stringIDToTypeID("present"), true);
  ds.putBoolean(stringIDToTypeID("showInDialog"), false);
  ds.putEnumerated(stringIDToTypeID("mode"), stringIDToTypeID("blendMode"), stringIDToTypeID("multiply"));
  var col = new ActionDescriptor();
  col.putDouble(stringIDToTypeID("red"), r);
  col.putDouble(stringIDToTypeID("grain"), g);   // "grain" is groen
  col.putDouble(stringIDToTypeID("blue"), b);
  ds.putObject(stringIDToTypeID("color"), stringIDToTypeID("RGBColor"), col);
  ds.putUnitDouble(stringIDToTypeID("opacity"), stringIDToTypeID("percentUnit"), opacity);
  ds.putBoolean(stringIDToTypeID("useGlobalAngle"), false);
  ds.putUnitDouble(stringIDToTypeID("localLightingAngle"), stringIDToTypeID("angleUnit"), angle);
  ds.putUnitDouble(stringIDToTypeID("distance"), stringIDToTypeID("pixelsUnit"), distance);
  ds.putUnitDouble(stringIDToTypeID("chokeMatte"), stringIDToTypeID("percentUnit"), spread);
  ds.putUnitDouble(stringIDToTypeID("blur"), stringIDToTypeID("pixelsUnit"), size);
  ds.putUnitDouble(stringIDToTypeID("noise"), stringIDToTypeID("percentUnit"), 0);
  ds.putBoolean(stringIDToTypeID("antiAlias"), false);
  var curve = new ActionDescriptor();
  curve.putString(stringIDToTypeID("name"), "Linear");
  ds.putObject(stringIDToTypeID("transferSpec"), stringIDToTypeID("shapeCurveType"), curve);
  ds.putBoolean(stringIDToTypeID("layerConceals"), true);

  fx.putObject(stringIDToTypeID("dropShadow"), stringIDToTypeID("dropShadow"), ds);
  d.putObject(stringIDToTypeID("to"), stringIDToTypeID("layerEffects"), fx);
  executeAction(stringIDToTypeID("set"), d, DialogModes.NO);
}

/* ------------------------------------------------------------------ */

function alreadyProcessed(doc) {
  for (var i = 0; i < doc.layers.length; i++)
    if (doc.layers[i].name.indexOf(CFG.bgLayerName) === 0) return true;
  return false;
}

function getLayerByName(doc, name) {
  for (var i = 0; i < doc.layers.length; i++)
    if (doc.layers[i].name === name) return doc.layers[i];
  return doc.activeLayer;
}

function report(log, failed, total) {
  var m = "Klaar. " + log.length + " van de " + total + " verwerkt.\n";
  m += "Achtergrond: #" + CFG.backgroundHex.toUpperCase() + "\n\n";
  for (var i = 0; i < log.length; i++) m += log[i][0] + "\n    " + log[i][1] + "\n";
  if (failed.length) m += "\nNIET GELUKT\n  " + failed.join("\n  ") +
      "\n\nMaak in dat document zelf een selectie en draai opnieuw.";
  m += "\n\nDe behandeling volgt je bestandsnaam. Klopt de routering niet,\n" +
       "hernoem het bestand of pas modelKeywords / detailKeywords aan.";
  alert(m);
}

main();
