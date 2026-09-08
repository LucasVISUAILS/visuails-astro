/* DE BESTANDSNAAM ALS OPDRACHT — 7 september 2026
   ═══════════════════════════════════════════════════════════════════════════
   Een klant sleept vier foto's in het formulier en de site leest uit de naam
   welk product het is en welke kant. Dat is de enige plek waar een tekst die
   NIET van ons is de indeling van een bestelling bepaalt, en hij had een gat.

   `hoodie-on-model.jpg` gaf shot `worn` (goed) en product `hoodie-on` (fout),
   omdat guessShot() de naam op elk niet-letterteken splitste en dan losse
   tokens vergeleek: een aanwijzing van twee woorden kon nooit matchen, en de
   overgebleven helft plakte aan de productnaam. Gevolg: een fantoomproduct dat
   om zijn eigen verplichte voor- en achterkant vraagt, met bestandsnamen die de
   handleiding zelf aanleert.

   Deze test bewaakt de twee kanten samen, want dat is waar het misging: het
   shot werd goed geraden en het product niet, en niets legde die twee naast
   elkaar. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { guessShot, productStem } from '../src/data/shots.js';

/* [bestandsnaam, verwacht shot, verwachte productnaam] */
const GEVALLEN = [
  // De gewone gevallen, in beide talen
  ['hoodie-front.jpg', 'front', 'hoodie'],
  ['hoodie_back.png', 'back', 'hoodie'],
  ['tshirt-achterkant.png', 'back', 'tshirt'],
  ['jas-gedragen.jpg', 'worn', 'jas'],
  ['TSHIRT-01-front.jpg', 'front', 'TSHIRT-01'],
  ['sku123 detail 2.heic', 'detail', 'sku123-2'],

  // WAAR HET OM GAAT: aanwijzingen van twee woorden.
  ['hoodie-on-model.jpg', 'worn', 'hoodie'],
  ['hoodie-op-model.webp', 'worn', 'hoodie'],
  ['hoodie on model.jpg', 'worn', 'hoodie'],
  ['hoodie-close-up.jpg', 'detail', 'hoodie'],
  ['hoodie_close up.jpg', 'detail', 'hoodie'],
  ['hoodie-closeup.jpg', 'detail', 'hoodie'],
  ['closeup-tas.jpg', 'detail', 'tas'],

  // En wat er NIET geraden mag worden. Een naam die niets zegt, zegt niets:
  // een gok is hier erger dan geen gok, want hij verplaatst een foto met
  // vertrouwen naar de verkeerde plek.
  ['IMG_0234.jpg', null, 'IMG-0234'],
  ['storefront.jpg', null, 'storefront'],
  ['brochure.pdf', null, 'brochure'],
  ['DSC_9912.jpeg', null, 'DSC-9912'],
];

test('bestandsnaam → shot én product, samen', () => {
  for (const [naam, shot, product] of GEVALLEN) {
    assert.equal(guessShot(naam), shot, `shot van ${naam}`);
    assert.equal(productStem(naam), product, `product van ${naam}`);
  }
});

test('twee bestanden van hetzelfde product komen op dezelfde kaart', () => {
  /* Dit is waar productStem() voor bestaat: losse bestanden zonder map worden
     gegroepeerd op wat er van hun naam overblijft. Gaan front en on-model niet
     naar dezelfde stam, dan staan ze als twee producten in het formulier. */
  const groepen = [
    ['hoodie-front.jpg', 'hoodie-back.jpg', 'hoodie-detail.jpg', 'hoodie-on-model.jpg'],
    ['TSHIRT-01-voorkant.jpg', 'TSHIRT-01-achterkant.jpg', 'TSHIRT-01-close-up.jpg'],
    ['broek_front.png', 'broek_op-model.png'],
  ];
  for (const bestanden of groepen) {
    const stammen = new Set(bestanden.map(productStem));
    assert.equal(stammen.size, 1, `${bestanden.join(', ')} → ${[...stammen].join(' / ')}`);
  }
});

test('elke aanwijzing in de tabel is ook echt bereikbaar', () => {
  /* De aanleiding: 'close-up' en 'on-model' stonden in de tabel en konden
     nooit matchen. Een regel die niets kan doen is erger dan een ontbrekende
     regel, want hij ziet eruit alsof het geregeld is. Dit loopt de tabel na
     door elke aanwijzing als bestandsnaam aan te bieden. */
  const AANWIJZINGEN = {
    front: ['front', 'voor', 'voorkant', 'f'],
    back: ['back', 'achter', 'achterkant', 'rug', 'b'],
    detail: ['detail', 'close up', 'close-up', 'closeup', 'close', 'macro', 'label', 'stof', 'fabric', 'd'],
    worn: ['worn', 'on model', 'on-model', 'op model', 'op-model', 'onmodel', 'gedragen', 'model', 'fit', 'pasvorm', 'w'],
  };
  for (const [id, lijst] of Object.entries(AANWIJZINGEN)) {
    for (const aanwijzing of lijst) {
      assert.equal(guessShot(`proefproduct-${aanwijzing}.jpg`), id, `"${aanwijzing}" hoort ${id} te geven`);
      assert.equal(productStem(`proefproduct-${aanwijzing}.jpg`), 'proefproduct', `"${aanwijzing}" hoort helemaal uit de productnaam te verdwijnen`);
    }
  }
});
