/*
 * ═══════════════════════════════════════════════════════════════════════════════
 * NAKIJKEN OF EEN GELEVERD BESTAND ZIJN HERKOMSTTAG DRAAGT
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * ── WAAROM DIT BESTAAT, EN WAAROM HET ALLEEN LEEST ──────────────────────────
 *
 * /ai-act §6 zegt in twee talen: *"Elk bestand dat wij leveren draagt een
 * machine-leesbare herkomsttag."* Die tag wordt geschreven door
 * scripts/deliver.mjs, via exiftool.
 *
 * Op 9 augustus 2026 bleek bij het nalopen van die belofte dat er een tweede weg
 * naar de klant is die niet langs dat script gaat: het adminportaal. Sleep je een
 * map bestanden in het bord op /admin/orders/<id>/files, dan gaan ze rechtstreeks
 * naar R2 en naar de klant, ongetagd. De belofte gold dus alleen als je consequent
 * via `npm run deliver` levert, en niets vertelde je wanneer je dat niet deed.
 *
 * ── WAAROM WE HET NIET IN DE WORKER SCHRIJVEN ──────────────────────────────
 *
 * Overwogen en verworpen. Een IPTC-tag in een jpeg zetten betekent een APP1-segment
 * met een XMP-pakket op de juiste plek tussen de bestaande segmenten schuiven; in
 * een png een iTXt-chunk met een correcte CRC; in een webp een 'XMP '-chunk plus
 * het bijwerken van de RIFF-lengte en de vlaggen in de VP8X-chunk. Drie
 * containerformaten, drie eigen valkuilen, in de code die de levering van een
 * klant verwerkt.
 *
 * exiftool doet dat goed en die kan niet in workerd — het is een binair programma.
 * Een eigen writer bouwen zou betekenen dat een fout in mijn bytes een geleverd
 * bestand kapotmaakt, en een kapot bestand is oneindig veel erger dan een bestand
 * zonder tag. Dus: WEL nakijken, NIET schrijven, en zeggen wat er aan de hand is.
 *
 * Dat is ook eerlijker tegenover de tekst op /ai-act. Die belofte wordt waargemaakt
 * door het leverscript; deze controle maakt zichtbaar wanneer je een andere weg
 * neemt, in plaats van te doen alsof beide wegen hetzelfde doen.
 *
 * ── HOE HET LEZEN WERKT, EN WAAROM DAT MAG ─────────────────────────────────
 *
 * De tag staat als XMP in het bestand, en XMP is tekst. De waarde is een url, en
 * die url komt letterlijk als ascii in de bytes voor. Zoeken naar de vaste kop van
 * die url is daarmee genoeg om te weten of er iets staat — geen parser nodig voor
 * drie containerformaten, en dat is precies de reden dat dit wél in een Worker kan.
 *
 * Wat deze controle NIET doet: nakijken of de waarde de juiste van de twee is
 * (composite of fully), of het XMP-pakket verder geldig is, of de tag door het
 * juiste programma is gezet. Dat is werk voor exiftool, en scripts/deliver.mjs doet
 * dat al mét een terugleescontrole. Hier is de vraag alleen: staat er iets, of
 * staat er niets.
 */

import { MARKER } from './iptc.js';

/**
 * Boven deze grootte kijken we niet in het bestand.
 *
 * De controle moet de bytes in het geheugen hebben, en de adminupload streamt nu
 * rechtstreeks naar R2 zonder ze ooit vast te houden. Voor een productfoto van een
 * paar megabyte is dat verschil onbelangrijk; voor een video van honderd megabyte is
 * het de reden dat de upload omvalt.
 *
 * 32 MB is ruim boven elke png die uit deliver.mjs komt (de zwaarste in dit project
 * is 634 kB) en ruim onder wat een Worker aan kan. Wat erboven zit, wordt gestreamd
 * en als ONGECONTROLEERD gemeld — niet als ongetagd. Zeggen dat een bestand geen tag
 * heeft terwijl je niet gekeken hebt, is erger dan zeggen dat je niet gekeken hebt.
 */
export const MAX_SCAN_BYTES = 32 * 1024 * 1024;

/** Alleen deze formaten kunnen een tag dragen; de rest is niet 'ongetagd'. */
const SCANNABLE = /\.(jpe?g|png|webp)$/i;

/** Kan dit bestand überhaupt een tag hebben, en is het klein genoeg om te kijken? */
export function isScannable(filename, bytes) {
  return SCANNABLE.test(String(filename || '')) && Number(bytes) <= MAX_SCAN_BYTES;
}

/**
 * Staat de herkomsttag in deze bytes?
 *
 * Zoekt de ascii van de IPTC-url in de buffer. Geen TextDecoder over het geheel:
 * dat maakt van tien megabyte binair een string van tien megabyte, en de helft van
 * die bytes is geen geldige utf-8 — decoderen levert dan vervangingstekens op
 * precies waar de tekst zou kunnen staan. Byte-voor-byte vergelijken heeft dat
 * probleem niet en kost één doorloop.
 */
export function hasProvenanceTag(buffer) {
  const hay = new Uint8Array(buffer);
  const needle = new TextEncoder().encode(MARKER);
  if (needle.length === 0 || hay.length < needle.length) return false;

  const first = needle[0];
  const last = hay.length - needle.length;
  outer:
  for (let i = 0; i <= last; i++) {
    if (hay[i] !== first) continue;
    for (let j = 1; j < needle.length; j++) {
      if (hay[i + j] !== needle[j]) continue outer;
    }
    return true;
  }
  return false;
}
