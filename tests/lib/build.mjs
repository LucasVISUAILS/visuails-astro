/*
 * ═══════════════════════════════════════════════════════════════════════════════
 * IS DE BUILD IN dist/ NOG VAN DEZE BRON?
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * ── WAAROM DIT ER IS — 13 augustus 2026, 02:11 ──────────────────────────────
 *
 * `npm test` gaf bij Lucas twee rode regels:
 *
 *   FAIL en nergens meer € 55 als bedrag        verwacht false kreeg true
 *   FAIL ook niet in de meta description        verwacht false kreeg true
 *
 * In de bron stond dat bedrag al sinds 12 augustus niet meer. Zijn `dist/` was
 * ouder dan die wijziging, en tests/planning.test.mjs las die oude pagina alsof
 * het de huidige site was.
 *
 * DIT IS DE VERVELENDSTE VORM DIE EEN TEST KAN HEBBEN. Hij zei niet "je hebt niet
 * gebouwd". Hij zei "er staat een prijs op je site die niemand kan bestellen" —
 * een echte, ernstige bewering, over een bestand dat niemand meer publiceert. En
 * dan ga je zoeken in de bron, waar niets te vinden is, want daar is het weg.
 *
 * Drie testbestanden lezen uit `dist/`, en alle drie hadden dezelfde blinde vlek:
 * ze keken of de build BESTAAT en niet of hij nog KLOPT. "Ontbrekend" was te smal
 * opgevat — een build die er wel is maar niet meer bij de bron hoort, is even
 * weinig bewijs, en hij is gevaarlijker omdat hij een uitspraak doet.
 *
 * ── WAT DIT NIET DOET ──────────────────────────────────────────────────────
 *
 * Niets bouwen. Een test die zelf `astro build` start maakt van tien seconden
 * testen anderhalve minuut, en dan zet iemand hem uit — dezelfde afweging waarom
 * een ontbrekende build hier wordt overgeslagen in plaats van afgekeurd.
 */
import { readdirSync, statSync } from 'node:fs';

/**
 * Het jongste bestand onder een map, recursief.
 *
 * @returns {{ms: number, naam: string}} 0 en '' als de map niet te lezen is
 */
export function jongsteBestand(mapUrl) {
  let ms = 0;
  let naam = '';
  const loop = (map) => {
    for (const item of readdirSync(map, { withFileTypes: true })) {
      const pad = new URL(`${item.name}${item.isDirectory() ? '/' : ''}`, map);
      if (item.isDirectory()) { loop(pad); continue; }
      const t = statSync(pad).mtimeMs;
      if (t > ms) { ms = t; naam = item.name; }
    }
  };
  try { loop(mapUrl); } catch { /* geen map: dan valt de vergelijking weg */ }
  return { ms, naam };
}

/**
 * Hoort dit gebouwde bestand nog bij de bron?
 *
 * @param {URL} bestandUrl   het bestand uit dist/ dat de test wil lezen
 * @param {URL} [bronUrl]    de map waar de bron staat (standaard src/)
 * @returns {{er: boolean, oud: boolean, uitleg: string}}
 *   er   — het bestand bestaat
 *   oud  — het bestaat, maar er is bron die jonger is
 *   uitleg — één regel om af te drukken bij overslaan
 */
export function buildStaat(bestandUrl, bronUrl = new URL('../../src/', import.meta.url)) {
  let gebouwdOp = 0;
  try { gebouwdOp = statSync(bestandUrl).mtimeMs; } catch {
    return { er: false, oud: false, uitleg: `${pad(bestandUrl)} ontbreekt — draai \`npx astro build\`` };
  }

  const bron = jongsteBestand(bronUrl);
  if (!bron.ms || bron.ms <= gebouwdOp) return { er: true, oud: false, uitleg: '' };

  const dagen = Math.round((bron.ms - gebouwdOp) / 86400000 * 10) / 10;
  return {
    er: true,
    oud: true,
    uitleg: `${pad(bestandUrl)} is ${dagen} dag(en) ouder dan ${bron.naam} — draai \`npx astro build\` en dan \`npm test\` opnieuw`,
  };
}

/** Alleen de laatste twee stukjes van een pad, want de rest zegt niets. */
function pad(url) {
  const stukken = url.pathname.split('/').filter(Boolean);
  return stukken.slice(-2).join('/');
}
