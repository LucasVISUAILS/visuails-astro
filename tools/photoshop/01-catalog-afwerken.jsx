/*
<javascriptresource>
<name>VISUAILS werkmap afwerken</name>
<category>visuails</category>
</javascriptresource>
*/
/*
=============================================================================
 01 · CATALOG AFWERKEN — DE HELE WERKMAP IN ÉÉN KEER (4.07, 8 oktober 2026)
=============================================================================
 Start dit script één keer (sneltoets: zie LEESMIJ.txt in deze map) en kies
 de werkmap die je uit /admin downloadde: "VIS-XXXX-XXX - Merknaam".

 Per product leest het de INSTELLINGEN-regel uit _briefing.txt:
   kenmerk=VIS-… · product=p1 · dienst=catalog · achtergrond=#F7F5F1 ·
   verhouding=4:5 · lange_zijde=2048 · kanaal=webshop · photoshop=ja
 Geen hex meer typen: de achtergrond, de verhouding en de maat komen uit
 de bestelling zelf.

 Per vak (1 voorkant, 2 achterkant, …) neemt het het ene ruwe beeld dat je
 erin zette, en dan:
   product uitsnijden -> canvas op de verhouding -> kader gelijktrekken ->
   achtergrondkleur -> schaduw -> verkleinen naar de lange zijde -> sRGB jpg
 Het resultaat heet VIS-…-p1-voorkant.jpg en staat in hetzelfde vak; het
 ruwe beeld gaat naar _ruw/ in dat vak (Map uploaden slaat _ruw/ over).

 OPSCHALEN DOET HET NOOIT. Is een beeld kleiner dan besteld, dan blijft het
 staan en zegt de slotmelding "1800 px, besteld 2048 — eerst opschalen".

 LIFESTYLE SLAAT HET OVER (V35 = b): die beelden komen rechtstreeks uit
 Spaces (en Lightroom voor grading en grain). Alleen als de INSTELLINGEN-
 regel photoshop=ja zegt — een eigen look die specifieke bewerking vraagt —
 werkt het ook die af: alleen bijsnijden op de verhouding, maat en naam,
 zonder uitsnijden of achtergrond.

 De behandeling volgt de VAKMAP (niet meer je bestandsnaam):
   "detail"           -> alleen de achtergrond schoonmaken, dan bijsnijden
   "op-model"         -> Select Subject, achtergrond, geen schaduw
   al het andere      -> achtergrond via de hoeken, achtergrond + schaduw

 De rekenregels (INSTELLINGEN lezen, namen, maat en wel/niet opschalen)
 staan tussen LOGICA BEGIN en LOGICA EINDE in gewoon ExtendScript, en
 worden in de testreeks getoetst (tests/photoshop-werkmap.test.mjs).
=============================================================================
*/

var CFG = {

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

  jpgQuality : 11,         // 0-12 in Photoshop; 11 is visueel verliesvrij

  productLayerName : "PRODUCT",
  bgLayerName      : "ACHTERGROND"
};

#target photoshop

// ==== LOGICA BEGIN — gewoon ExtendScript (ES3), getoetst in tests/photoshop-werkmap.test.mjs ====

/* De INSTELLINGEN-regel uit de tekst van _briefing.txt, als object, of null.
   sleutel=waarde, gescheiden door " · ". Een waarde bevat nooit een spatie,
   dus ook een verkeerd gelezen middenpunt (Windows-codering) breekt niets. */
function leesInstellingen(tekst) {
  var regels = String(tekst || "").split(/\r\n|\r|\n/);
  for (var i = 0; i < regels.length; i++) {
    var r = regels[i];
    if (r.substr(0, 12) !== "INSTELLINGEN") continue;
    var uit = {}, gevonden = false, m;
    var re = /([a-z][a-z0-9_]*)=([^\s\u00b7|;]+)/g;
    while ((m = re.exec(r)) !== null) { uit[m[1]] = m[2]; gevonden = true; }
    return gevonden ? uit : null;
  }
  return null;
}

/* "4:5" -> 0.8 (breedte gedeeld door hoogte); 0 als het geen verhouding is. */
function verhoudingGetal(v) {
  var m = /^(\d{1,2}):(\d{1,2})$/.exec(String(v || ""));
  if (!m) return 0;
  var a = Number(m[1]), b = Number(m[2]);
  return (a > 0 && b > 0) ? a / b : 0;
}

/* "2 achterkant" -> 2; "5 driekwart [extra1]" -> 5; geen cijfer -> 0. */
function vakVolgnummer(mapnaam) {
  var m = /^(\d{1,2})\s/.exec(String(mapnaam || ""));
  return m ? Number(m[1]) : 0;
}

/* Het woord voor de bestandsnaam: "1 voorkant" -> "voorkant",
   "5 driekwart [extra1]" -> "driekwart", "1 beeld-1" -> "beeld-1". */
function vakWoord(mapnaam) {
  var s = String(mapnaam || "").replace(/\s*\[[^\]]*\]\s*$/, "").replace(/^\d{1,2}\s+/, "");
  s = s.toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+/, "").replace(/-+$/, "");
  return s || "beeld";
}

/* Welke behandeling dit vak krijgt: "detail", "model", "product" of "scene"
   (lifestyle: alleen bijsnijden, maat en naam). */
function behandeling(mapnaam, dienst) {
  if (dienst === "lifestyle") return "scene";
  var w = vakWoord(mapnaam);
  if (/detail|close|macro/.test(w)) return "detail";
  if (/model|gedragen|worn/.test(w)) return "model";
  return "product";
}

/* De verhouding voor dit vak: een afwijking per beeld (verhouding_2) wint. */
function verhoudingVoorVak(inst, mapnaam) {
  var n = vakVolgnummer(mapnaam);
  if (n && inst["verhouding_" + n]) return inst["verhouding_" + n];
  return inst.verhouding || "";
}

/* De eindnaam: VIS-2608-4471-p1-voorkant.jpg. */
function eindNaam(kenmerk, product, mapnaam) {
  return String(kenmerk) + "-" + String(product) + "-" + vakWoord(mapnaam) + ".jpg";
}

/* Is dit een beeld dat Photoshop kan openen (en geen verborgen bestand)? */
function isBeeldNaam(naam) {
  var n = String(naam || "");
  return n.charAt(0) !== "." && /\.(jpe?g|png|tiff?|psd|webp)$/i.test(n);
}

/* Is dit beeld al afgewerkt (de naam begint met het kenmerk)? */
function isAlAf(naam, kenmerk) {
  return String(naam || "").toUpperCase().indexOf(String(kenmerk || "").toUpperCase() + "-") === 0;
}

/* Gaat dit product door Photoshop? photoshop=ja/nee wint; zonder die sleutel
   alleen als het geen lifestyle is (V35 = b). */
function moetDoorPhotoshop(inst) {
  if (!inst) return false;
  if (inst.photoshop === "ja") return true;
  if (inst.photoshop === "nee") return false;
  return inst.dienst !== "lifestyle";
}

/* Het maatbesluit, zonder ooit op te schalen.
   wijze "uitbreiden": het canvas wordt groter tot de verhouding (er gaat niets
   van het product af — de achtergrond wordt toch opnieuw gevuld);
   wijze "bijsnijden": het canvas wordt kleiner, gecentreerd (detail, scene).
   Is de lange zijde daarna kleiner dan besteld: ok=false met de melding. */
function maatBesluit(breedte, hoogte, verhouding, langeZijde, wijze) {
  var w = Number(breedte), h = Number(hoogte);
  var r = verhoudingGetal(verhouding);
  if (r) {
    if (wijze === "bijsnijden") {
      if (w / h > r) w = Math.round(h * r); else h = Math.round(w / r);
    } else {
      if (w / h > r) h = Math.round(w / r); else w = Math.round(h * r);
    }
  }
  var lang = Math.max(w, h);
  var doel = Number(langeZijde) || 0;
  if (doel && lang < doel) {
    return { ok: false, canvasB: w, canvasH: h, schaal: 1, eindB: w, eindH: h,
             melding: lang + " px, besteld " + doel + " \u2014 eerst opschalen" };
  }
  var schaal = doel ? doel / lang : 1;
  return { ok: true, canvasB: w, canvasH: h, schaal: schaal,
           eindB: Math.round(w * schaal), eindH: Math.round(h * schaal), melding: "" };
}

/* De tellers voor de slotmelding. */
function nieuweTellers() {
  return { afgewerkt: 0, alAf: 0, overgeslagen: [], teKlein: [], lifestyle: [], fouten: [] };
}

/* De slotmelding: "24 beelden afgewerkt · 1 overgeslagen: p4 detail (geen beeld)". */
function slotmelding(t) {
  var m = t.afgewerkt + (t.afgewerkt === 1 ? " beeld" : " beelden") + " afgewerkt";
  if (t.overgeslagen.length) m += " \u00b7 " + t.overgeslagen.length + " overgeslagen: " + t.overgeslagen.join(", ");
  if (t.teKlein.length) m += "\n\nTe klein, niet afgewerkt (" + t.teKlein.length + "):\n  " + t.teKlein.join("\n  ");
  if (t.lifestyle.length) m += "\n\nNiet door Photoshop (photoshop=nee, lifestyle): " + t.lifestyle.join(", ");
  if (t.alAf) m += "\n\nAl af (stond er al als VIS-\u2026): " + t.alAf;
  if (t.fouten.length) m += "\n\nNIET GELUKT (" + t.fouten.length + "):\n  " + t.fouten.join("\n  ") +
      "\n\nMaak in dat beeld zelf een selectie en draai opnieuw.";
  return m;
}

// ==== LOGICA EINDE ====

/* ------------------------------------------------------------------ */

function main() {
  var start = vorigeMap();
  var vraag = "Kies de werkmap (VIS-XXXX-XXX - Merknaam)";
  var map = start ? start.selectDlg(vraag) : Folder.selectDialog(vraag);
  if (!map) return;
  bewaarMap(map.parent || map);

  var producten = productMappen(map);
  if (!producten.length) {
    alert("In deze map staan geen productmappen (p1 - \u2026).\nKies de map \"VIS-\u2026 - Merknaam\" uit de werkmap.");
    return;
  }

  var ru = app.preferences.rulerUnits;
  var dlg = app.displayDialogs;
  app.preferences.rulerUnits = Units.PIXELS;
  app.displayDialogs = DialogModes.NO;
  var t = nieuweTellers();
  try {
    for (var i = 0; i < producten.length; i++) werkProductAf(producten[i], t);
  } finally {
    app.preferences.rulerUnits = ru;
    app.displayDialogs = dlg;
  }
  alert(slotmelding(t));
}

/* De productmappen, ook als je één map te hoog koos (de map waarin Windows
   de zip uitpakte, met de werkmap erin). */
function productMappen(map) {
  var p = map.getFiles(function (f) { return f instanceof Folder && /^p\d{1,3}\b/i.test(decodeURI(f.name)); });
  if (p.length) return sorteer(p);
  var sub = map.getFiles(function (f) { return f instanceof Folder; });
  for (var i = 0; i < sub.length; i++) {
    p = sub[i].getFiles(function (f) { return f instanceof Folder && /^p\d{1,3}\b/i.test(decodeURI(f.name)); });
    if (p.length) return sorteer(p);
  }
  return [];
}

function sorteer(lijst) {
  return lijst.sort(function (a, b) {
    var na = Number((/^p?(\d+)/i.exec(decodeURI(a.name)) || [0, 0])[1]);
    var nb = Number((/^p?(\d+)/i.exec(decodeURI(b.name)) || [0, 0])[1]);
    return na !== nb ? na - nb : (decodeURI(a.name) < decodeURI(b.name) ? -1 : 1);
  });
}

function leesTekst(file) {
  file.encoding = "UTF-8";
  if (!file.open("r")) return "";
  var s = file.read();
  file.close();
  return s;
}

function werkProductAf(productMap, t) {
  var pnaam = decodeURI(productMap.name);
  var brief = new File(productMap.fsName + "/_briefing.txt");
  if (!brief.exists) { t.overgeslagen.push(pnaam + " (geen _briefing.txt)"); return; }
  var inst = leesInstellingen(leesTekst(brief));
  if (!inst || !inst.kenmerk || !inst.product) { t.overgeslagen.push(pnaam + " (geen INSTELLINGEN-regel \u2014 oude werkmap?)"); return; }
  if (!moetDoorPhotoshop(inst)) { t.lifestyle.push(inst.product); return; }

  var vakken = sorteer(productMap.getFiles(function (f) {
    return f instanceof Folder && decodeURI(f.name).charAt(0) !== "_";
  }));
  for (var v = 0; v < vakken.length; v++) {
    var vak = vakken[v];
    var vnaam = decodeURI(vak.name);
    var label = inst.product + " " + vakWoord(vnaam);
    var beelden = vak.getFiles(function (f) { return f instanceof File && isBeeldNaam(decodeURI(f.name)); });
    var ruw = [], af = 0;
    for (var b = 0; b < beelden.length; b++) {
      if (isAlAf(decodeURI(beelden[b].name), inst.kenmerk)) af++; else ruw.push(beelden[b]);
    }
    if (!ruw.length) {
      if (af) t.alAf++; else t.overgeslagen.push(label + " (geen beeld)");
      continue;
    }
    if (ruw.length > 1) { t.overgeslagen.push(label + " (" + ruw.length + " ruwe beelden \u2014 laat er \u00e9\u00e9n staan)"); continue; }
    var route = behandeling(vnaam, inst.dienst);
    if ((route === "product" || route === "model" || route === "detail") && !/^#?[0-9a-f]{6}$/i.test(inst.achtergrond || "")) {
      t.overgeslagen.push(label + " (geen achtergrond in INSTELLINGEN)");
      continue;
    }
    try {
      var uit = werkBeeldAf(ruw[0], vak, vnaam, inst, route);
      if (uit) { t.teKlein.push(label + ": " + uit); continue; }
      naarRuw(ruw[0], vak);
      t.afgewerkt++;
    } catch (e) {
      t.fouten.push(label + "  ->  " + e.message);
    }
  }
}

/* Eén beeld afwerken. Geeft "" terug als het gelukt is, of de melding als het
   te klein is (dan is er niets opgeslagen en blijft het ruwe beeld staan). */
function werkBeeldAf(file, vak, vnaam, inst, route) {
  var doc = app.open(file);
  try {
    var wijze = (route === "product" || route === "model") ? "uitbreiden" : "bijsnijden";
    var besluit = maatBesluit(doc.width.as("px"), doc.height.as("px"),
      verhoudingVoorVak(inst, vnaam), inst.lange_zijde, wijze);
    if (!besluit.ok) return besluit.melding;

    if (route === "scene") zetCanvas(doc, besluit);
    else processDocument(doc, route, inst.achtergrond, besluit);

    doc.flatten();
    if (doc.mode !== DocumentMode.RGB) doc.changeMode(ChangeMode.RGB);
    try { doc.convertProfile("sRGB IEC61966-2.1", Intent.RELATIVECOLORIMETRIC, true, false); } catch (e) {}
    if (doc.bitsPerChannel !== BitsPerChannelType.EIGHT) doc.bitsPerChannel = BitsPerChannelType.EIGHT;
    if (besluit.schaal < 1) {
      doc.resizeImage(new UnitValue(besluit.eindB, "px"), new UnitValue(besluit.eindH, "px"), null, ResampleMethod.BICUBICSHARPER);
    }
    var opt = new JPEGSaveOptions();
    opt.quality = CFG.jpgQuality;
    opt.embedColorProfile = true;
    opt.formatOptions = FormatOptions.STANDARDBASELINE;
    opt.matte = MatteType.NONE;
    doc.saveAs(new File(vak.fsName + "/" + eindNaam(inst.kenmerk, inst.product, vnaam)), opt, true, Extension.LOWERCASE);
    return "";
  } finally {
    doc.close(SaveOptions.DONOTSAVECHANGES);
  }
}

/* Het canvas op de maat uit het besluit, gecentreerd. Groter = uitbreiden met
   lege (transparante) ruimte, kleiner = bijsnijden. */
function zetCanvas(doc, besluit) {
  var w = doc.width.as("px"), h = doc.height.as("px");
  if (Math.abs(w - besluit.canvasB) < 1 && Math.abs(h - besluit.canvasH) < 1) return;
  doc.resizeCanvas(new UnitValue(besluit.canvasB, "px"), new UnitValue(besluit.canvasH, "px"), AnchorPosition.MIDDLECENTER);
}

/* Het ruwe beeld naar _ruw/ in hetzelfde vak. Bestaat de naam daar al (een
   eerdere ronde), dan krijgt hij een volgnummer: er wordt nooit iets overschreven. */
function naarRuw(file, vak) {
  var ruwMap = new Folder(vak.fsName + "/_ruw");
  if (!ruwMap.exists) ruwMap.create();
  var naam = decodeURI(file.name);
  var doel = new File(ruwMap.fsName + "/" + naam);
  var n = 2;
  while (doel.exists) {
    doel = new File(ruwMap.fsName + "/" + naam.replace(/(\.[^.]+)?$/, " (" + n + ")$1"));
    n++;
  }
  if (file.copy(doel)) file.remove();
}

/* De map van de vorige keer, zodat het venster daar opent. */
function instellingenBestand() { return new File(Folder.userData + "/VISUAILS-afwerken.txt"); }
function vorigeMap() {
  var f = instellingenBestand();
  if (!f.exists) return null;
  var pad = leesTekst(f).replace(/\s+$/, "");
  var m = new Folder(pad);
  return (pad && m.exists) ? m : null;
}
function bewaarMap(map) {
  try {
    var f = instellingenBestand();
    f.encoding = "UTF-8";
    if (f.open("w")) { f.write(map.fsName); f.close(); }
  } catch (e) {}
}

/* ------------------------------------------------------------------ */

function processDocument(doc, route, hex, besluit) {
  if (CFG.mergeFirst && doc.layers.length > 1) doc.flatten();

  var layer = doc.activeLayer;
  if (layer.isBackgroundLayer) layer.isBackgroundLayer = false;
  layer.name = CFG.productLayerName;
  doc.activeLayer = layer;

  var k = doc.width.as("px") / CFG.refWidth;

  /* --- DETAIL: product loopt van de rand af. Alleen de achtergrond
         schoonmaken en dan bijsnijden op de verhouding. Een slagschaduw zou
         hier een harde lijn langs je uitsnede trekken, dus die slaan we over. */
  if (route === "detail") {
    if (selectBackgroundFromCorners(doc)) {
      fillSelection(doc, hexColor(hex));
      doc.selection.deselect();
    }
    zetCanvas(doc, besluit);
    return;
  }

  /* --- MODEL: Select Subject is hier het juiste gereedschap, want het
         is een mens en de achtergrond heeft vaak een verloop met een
         vloerschaduw waar een toverstaf op stukloopt. ---------------- */
  if (route === "model") {
    selectSubject();
    biteIn(doc, k);
    addLayerMaskFromSelection();
    doc.selection.deselect();
    zetCanvas(doc, besluit);
    if (CFG.normaliseFrame) normaliseFrame(doc);
    addBackgroundLayer(doc, hex);
    if (CFG.shadowOnModel) {
      doc.activeLayer = getLayerByName(doc, CFG.productLayerName);
      applyShadow(CFG.modelShadow, k);
    }
    return;
  }

  /* --- PRODUCT: front, back, extra hoeken ------------------------ */
  var ok = selectBackgroundFromCorners(doc);
  if (ok && !selectionLooksSane(doc)) ok = false;
  if (ok) doc.selection.invert();   // achtergrond -> product
  else    selectSubject();

  biteIn(doc, k);
  addLayerMaskFromSelection();
  doc.selection.deselect();
  zetCanvas(doc, besluit);
  if (CFG.normaliseFrame) normaliseFrame(doc);
  addBackgroundLayer(doc, hex);

  doc.activeLayer = getLayerByName(doc, CFG.productLayerName);
  applyShadow(CFG.shadow, k);
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
function addBackgroundLayer(doc, hex) {
  var col = hexColor(hex);
  var bg = doc.artLayers.add();
  bg.name = CFG.bgLayerName + " #" + String(hex).replace("#", "").toUpperCase();
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

function getLayerByName(doc, name) {
  for (var i = 0; i < doc.layers.length; i++)
    if (doc.layers[i].name === name) return doc.layers[i];
  return doc.activeLayer;
}

main();
